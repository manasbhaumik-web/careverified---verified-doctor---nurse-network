import crypto from "crypto";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import type { Application, Request, Response } from "express";
import { db, dataDir } from "./db";
import { audit } from "./audit";
import { requireRole, createUser, createSession, passwordProblem, emailTaken, type AuthUser } from "./auth";
import { notifyAdmins, notify } from "./verification";
import { recordConsent, CONSENT_VERSION } from "./privacy";
import { decryptFile } from "./fileCrypto";

/**
 * Facility self-service: registration, admin approval, profile (departments, services, accreditation claims, photos) and staff with roles.
 *
 * Roles inside a facility:
 *  - "admin": manages profile, staff and billing (the account that registered the facility is always an admin);
 *  - "staff": works with jobs, shifts and applicants but cannot change the profile, staff or billing.
 * A pending facility can sign in to complete its profile, but it is hidden from every public list until a platform admin approves it.
 */

export type StaffRole = "admin" | "staff";
export const STAFF_ROLES: StaffRole[] = ["admin", "staff"];
const KINDS = ["hospital", "clinic"];
const MAX_PHOTOS = 8;
const MAX_DEPARTMENTS = 30;

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const parse = <T,>(v: unknown, fallback: T): T => { try { return v ? (JSON.parse(String(v)) as T) : fallback; } catch { return fallback; } };
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const newId = (p: string) => `${p}-${crypto.randomBytes(5).toString("hex")}`;
const today = () => new Date().toISOString().slice(0, 10);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

const uploadsRoot = path.join(dataDir, "uploads");

export function migrateFacilitySchema() {
  for (const col of [
    "approval_status TEXT NOT NULL DEFAULT 'approved'", "approval_note TEXT", "departments TEXT", "service_list TEXT",
    "photos TEXT", "accreditation_claims TEXT", "registered_at TEXT",
  ]) { try { db.exec(`ALTER TABLE tourism_facilities ADD COLUMN ${col}`); } catch { /* exists */ } }
  try { db.exec("ALTER TABLE tourism_facility_staff ADD COLUMN staff_role TEXT NOT NULL DEFAULT 'staff'"); } catch { /* exists */ }
}

/** The facility an account works for, or null. Platform admins pass the facility explicitly. */
export function facilityIdFor(u: AuthUser | undefined, explicit?: string): string | null {
  if (!u) return null;
  if (u.role === "admin") return explicit || null;
  if (u.role === "facility") return u.facilityId || u.profileId || null;
  return null;
}

/** "admin" or "staff" inside the facility, or null if the account has no access. The registrant (no staff row) is an admin. */
export function staffRoleIn(u: AuthUser | undefined, facilityId: string | null): StaffRole | null {
  if (!u || !facilityId) return null;
  if (u.role === "admin") return "admin";
  if (u.role !== "facility" || facilityIdFor(u) !== facilityId) return null;
  const s = row("SELECT staff_role FROM tourism_facility_staff WHERE facility_id = ? AND user_id = ?", facilityId, u.id);
  return (s?.staff_role as StaffRole | undefined) ?? "admin";
}

export const canManageFacility = (u: AuthUser | undefined, facilityId: string | null) => staffRoleIn(u, facilityId) === "admin";

const cleanList = (v: unknown, n: number, len = 80) => (Array.isArray(v) ? [...new Set(v.map(x => str(x, len)).filter(Boolean))].slice(0, n) : []);

const photoUrl = (facilityId: string, docId: string) => `/api/public/facilities/${facilityId}/photos/${docId}`;

export function profileView(f: any) {
  return {
    id: f.id, name: f.name, kind: f.kind, city: f.city, state: f.state, address: f.address, description: f.description,
    phone: f.phone, email: f.email, website: f.website,
    approvalStatus: f.approval_status, approvalNote: f.approval_note ?? null,
    departments: parse<{ name: string; description?: string }[]>(f.departments, []),
    services: parse<string[]>(f.service_list, []),
    accreditationClaims: parse<any[]>(f.accreditation_claims, []),
    photos: parse<string[]>(f.photos, []).map(id => ({ id, url: photoUrl(f.id, id) })),
    licenceNo: f.licence_no ?? null, licenceChecked: !!f.licence_checked_at,
  };
}

export function registerFacilityProfiles(app: Application) {
  migrateFacilitySchema();

  const requireFacilityAccess = (req: Request, res: Response, needAdmin: boolean): string | null => {
    const id = facilityIdFor(req.user, String(req.query.facilityId ?? req.body?.facilityId ?? "") || undefined);
    if (!id || !row("SELECT 1 AS x FROM tourism_facilities WHERE id = ?", id)) { fail(res, 404, "Facility not found."); return null; }
    const role = staffRoleIn(req.user, id);
    if (!role || (needAdmin && role !== "admin")) {
      audit(req, "access.denied", { target: ["facility", id] });
      fail(res, 403, needAdmin ? "Only a facility admin can do this." : "You do not have access to this facility.");
      return null;
    }
    return id;
  };

  // ---------- registration ----------
  app.use("/api/auth/register-facility", rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }));
  app.post("/api/auth/register-facility", (req, res) => {
    const b = req.body ?? {};
    const name = str(b.facilityName, 120), contactName = str(b.contactName, 100), email = str(b.email, 254).toLowerCase();
    const kind = KINDS.includes(b.kind) ? b.kind : "hospital";
    if (!name || !contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(res, 400, "Facility name, contact name and a valid email are required.");
    const problem = passwordProblem(b.password);
    if (problem) return fail(res, 400, problem);
    if (b.consent !== true) return fail(res, 400, "You must accept the Terms and Privacy Policy.");
    if (emailTaken(email)) return fail(res, 409, "An account with this email already exists.");
    const licenceNo = str(b.licenceNo, 60);
    if (!licenceNo) return fail(res, 400, "Enter your facility licence number. The board checks it before approving you.");

    const id = newId("fac");
    db.prepare(`INSERT INTO tourism_facilities (id,name,kind,city,state,address,phone,email,licence_no,active,approval_status,registered_at,created_at,verified_facilitator)
      VALUES (?,?,?,?,?,?,?,?,?,0,'pending',?,?,0)`)
      .run(id, name, kind, str(b.city, 60) || null, str(b.state, 60) || null, str(b.address, 250) || null, str(b.phone, 30) || null, email, licenceNo, new Date().toISOString(), new Date().toISOString());
    const user = createUser({ email, password: b.password, role: "facility", name: contactName, profileId: id, facilityId: id, consentVersion: CONSENT_VERSION, lang: b.lang });
    recordConsent(user.id, "terms_privacy");
    createSession(req, res, user.id);
    audit(req, "facility.register", { actor: user, target: ["facility", id] });
    notifyAdmins("New facility registration", `${name} (${kind}) registered and is waiting for approval.`);
    res.status(201).json({ status: "success", message: "Registration received. Complete your profile while the board reviews it.", data: { facilityId: id, approvalStatus: "pending" } });
  });

  // ---------- admin approval ----------
  app.get("/api/admin/facilities/pending", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: rows("SELECT * FROM tourism_facilities WHERE approval_status = 'pending' ORDER BY registered_at").map(profileView) });
  });

  app.post("/api/admin/facilities/:id/approval", requireRole("admin"), (req, res) => {
    const f = row("SELECT * FROM tourism_facilities WHERE id = ?", req.params.id);
    if (!f) return fail(res, 404, "Facility not found.");
    if (f.approval_status !== "pending") return fail(res, 409, `This facility is already ${f.approval_status}.`);
    const decision = req.body.decision, note = str(req.body.note, 500);
    if (decision !== "approve" && decision !== "reject") return fail(res, 400, "Decision must be approve or reject.");
    if (decision === "reject" && !note) return fail(res, 400, "Give a reason for rejecting.");
    if (decision === "approve" && !f.licence_no) return fail(res, 400, "Cannot approve a facility with no licence number.");
    db.prepare("UPDATE tourism_facilities SET approval_status = ?, approval_note = ?, active = ? WHERE id = ?")
      .run(decision === "approve" ? "approved" : "rejected", note || null, decision === "approve" ? 1 : 0, f.id);
    for (const u of rows("SELECT id FROM users WHERE facility_id = ?", f.id)) {
      notify(u.id, decision === "approve" ? "Your facility is approved" : "Your facility registration was not approved", decision === "approve" ? "Your profile is now public." : note);
    }
    audit(req, `facility.${decision}`, { target: ["facility", f.id], details: { note } });
    res.json({ status: "success" });
  });

  // ---------- own profile ----------
  app.get("/api/facility/profile", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, false);
    if (!id) return;
    res.json({ status: "success", data: { ...profileView(row("SELECT * FROM tourism_facilities WHERE id = ?", id)), staffRole: staffRoleIn(req.user, id) } });
  });

  app.put("/api/facility/profile", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const b = req.body ?? {};
    const departments = (Array.isArray(b.departments) ? b.departments : []).slice(0, MAX_DEPARTMENTS)
      .map((d: any) => ({ name: str(d?.name, 80), description: str(d?.description, 300) || undefined })).filter((d: any) => d.name);
    const website = str(b.website, 200);
    if (website && !/^https:\/\/\S+$/.test(website)) return fail(res, 400, "The website must start with https://");
    db.prepare("UPDATE tourism_facilities SET description=?, phone=?, email=?, website=?, address=?, city=?, state=?, departments=?, service_list=? WHERE id=?")
      .run(str(b.description, 1500) || null, str(b.phone, 30) || null, str(b.email, 120) || null, website || null, str(b.address, 250) || null,
        str(b.city, 60) || null, str(b.state, 60) || null, JSON.stringify(departments), JSON.stringify(cleanList(b.services, 40)), id);
    audit(req, "facility.profile.update", { target: ["facility", id] });
    res.json({ status: "success", data: profileView(row("SELECT * FROM tourism_facilities WHERE id = ?", id)) });
  });

  // Accreditations are claims until the board checks them (the board's own route records a checked accreditation).
  app.post("/api/facility/accreditations", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const body = str(req.body.body, 10), number = str(req.body.number, 60), validUntil = str(req.body.validUntil, 10);
    if (!body || !number || !isDate(validUntil) || validUntil <= today()) return fail(res, 400, "Enter the accrediting body, certificate number and a future expiry date.");
    const f = row("SELECT accreditation_claims FROM tourism_facilities WHERE id = ?", id);
    const claims = parse<any[]>(f.accreditation_claims, []).filter(c => c.body !== body);
    claims.push({ body, number, validUntil, status: "claimed", claimedAt: new Date().toISOString() });
    db.prepare("UPDATE tourism_facilities SET accreditation_claims = ? WHERE id = ?").run(JSON.stringify(claims), id);
    notifyAdmins("Facility accreditation to check", `${body} ${number} was claimed for facility ${id}.`);
    audit(req, "facility.accreditation.claim", { target: ["facility", id], details: { body } });
    res.json({ status: "success", data: claims });
  });

  // ---------- photos (uploaded through /api/documents, then attached; served publicly only while the facility is approved) ----------
  app.post("/api/facility/photos", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const docId = str(req.body.documentId, 80);
    const doc = row("SELECT * FROM documents WHERE id = ?", docId);
    const owner = doc && row("SELECT facility_id, role FROM users WHERE id = ?", doc.owner_id);
    const allowed = doc && (req.user!.role === "admin" || (owner?.role === "facility" && (owner.facility_id === id)));
    if (!doc || !allowed) return fail(res, 404, "Upload the photo first, then attach it.");
    if (!["image/jpeg", "image/png"].includes(doc.mime)) return fail(res, 400, "Photos must be JPG or PNG.");
    const f = row("SELECT photos FROM tourism_facilities WHERE id = ?", id);
    const photos = parse<string[]>(f.photos, []);
    if (photos.includes(docId)) return fail(res, 409, "That photo is already attached.");
    if (photos.length >= MAX_PHOTOS) return fail(res, 400, `A facility can show up to ${MAX_PHOTOS} photos.`);
    photos.push(docId);
    db.prepare("UPDATE tourism_facilities SET photos = ? WHERE id = ?").run(JSON.stringify(photos), id);
    audit(req, "facility.photo.add", { target: ["facility", id], details: { documentId: docId } });
    res.status(201).json({ status: "success", data: photos.map(p => ({ id: p, url: photoUrl(id, p) })) });
  });

  app.delete("/api/facility/photos/:docId", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const f = row("SELECT photos FROM tourism_facilities WHERE id = ?", id);
    db.prepare("UPDATE tourism_facilities SET photos = ? WHERE id = ?").run(JSON.stringify(parse<string[]>(f.photos, []).filter(p => p !== req.params.docId)), id);
    res.json({ status: "success" });
  });

  app.get("/api/public/facilities/:id/photos/:docId", (req, res) => {
    const f = row("SELECT id, photos, active, approval_status FROM tourism_facilities WHERE id = ?", req.params.id);
    if (!f || !f.active || f.approval_status !== "approved" || !parse<string[]>(f.photos, []).includes(req.params.docId)) return res.status(404).end();
    const doc = row("SELECT stored_name, mime FROM documents WHERE id = ?", req.params.docId);
    if (!doc) return res.status(404).end();
    res.setHeader("Content-Type", doc.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const file = path.join(uploadsRoot, doc.stored_name);
    if (!fs.existsSync(file)) return res.status(404).end();
    try { res.send(decryptFile(fs.readFileSync(file))); } catch { res.status(404).end(); }
  });

  // ---------- staff with roles ----------
  app.get("/api/facility/staff", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, false);
    if (!id) return;
    const owners = rows("SELECT id, name, email FROM users WHERE facility_id = ? AND role = 'facility'", id);
    const data = owners.map(u => ({ userId: u.id, name: u.name, email: u.email, staffRole: staffRoleIn({ id: u.id, role: "facility", facilityId: id } as AuthUser, id) }));
    res.json({ status: "success", data });
  });

  app.post("/api/facility/staff", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const name = str(req.body.name, 100), email = str(req.body.email, 254).toLowerCase();
    const staffRole = req.body.staffRole as StaffRole;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(res, 400, "A name and a valid email are required.");
    if (!STAFF_ROLES.includes(staffRole)) return fail(res, 400, "Role must be admin or staff.");
    if (emailTaken(email)) return fail(res, 409, "An account with this email already exists.");
    // The temporary password is shown once. It is long and random, and the person is asked to change it.
    const temp = `Tmp-${crypto.randomBytes(9).toString("base64url")}9a`;
    const user = createUser({ email, password: temp, role: "facility", name, profileId: id, facilityId: id, consentVersion: CONSENT_VERSION });
    try { db.prepare("UPDATE users SET must_change_password = 1 WHERE id = ?").run(user.id); } catch { /* column optional */ }
    db.prepare("INSERT OR REPLACE INTO tourism_facility_staff (facility_id, user_id, staff_role) VALUES (?,?,?)").run(id, user.id, staffRole);
    audit(req, "facility.staff.add", { target: ["facility", id], details: { userId: user.id, staffRole } });
    res.status(201).json({ status: "success", data: { userId: user.id, email, staffRole, temporaryPassword: temp } });
  });

  app.patch("/api/facility/staff/:userId", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const staffRole = req.body.staffRole as StaffRole;
    if (!STAFF_ROLES.includes(staffRole)) return fail(res, 400, "Role must be admin or staff.");
    const u = row("SELECT id FROM users WHERE id = ? AND facility_id = ? AND role = 'facility'", req.params.userId, id);
    if (!u) return fail(res, 404, "Staff member not found.");
    if (staffRole === "staff" && !otherAdminExists(id, u.id)) return fail(res, 409, "A facility needs at least one admin.");
    db.prepare("INSERT OR REPLACE INTO tourism_facility_staff (facility_id, user_id, staff_role) VALUES (?,?,?)").run(id, u.id, staffRole);
    audit(req, "facility.staff.role", { target: ["facility", id], details: { userId: u.id, staffRole } });
    res.json({ status: "success" });
  });

  app.delete("/api/facility/staff/:userId", requireRole("facility", "admin"), (req, res) => {
    const id = requireFacilityAccess(req, res, true);
    if (!id) return;
    const u = row("SELECT id FROM users WHERE id = ? AND facility_id = ? AND role = 'facility'", req.params.userId, id);
    if (!u) return fail(res, 404, "Staff member not found.");
    if (!otherAdminExists(id, u.id)) return fail(res, 409, "A facility needs at least one admin.");
    db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(u.id);
    db.prepare("DELETE FROM tourism_facility_staff WHERE facility_id = ? AND user_id = ?").run(id, u.id);
    audit(req, "facility.staff.remove", { target: ["facility", id], details: { userId: u.id } });
    res.json({ status: "success" });
  });
}

/** True if someone other than `exceptUserId` is still an admin of the facility. */
function otherAdminExists(facilityId: string, exceptUserId: string): boolean {
  return rows("SELECT id FROM users WHERE facility_id = ? AND role = 'facility' AND status = 'active' AND id != ?", facilityId, exceptUserId)
    .some(u => staffRoleIn({ id: u.id, role: "facility", facilityId } as AuthUser, facilityId) === "admin");
}
