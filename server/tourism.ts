import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import rateLimit from "express-rate-limit";
import type { Application, Request, Response } from "express";
import { db, dataDir } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { notify, notifyAdmins } from "./verification";
import { recordConsent } from "./privacy";
import { computeTax } from "./paymentPolicy";
import { VerificationStatus } from "../src/types";

/**
 * Medical tourism: facilities that accept international patients, and a case workflow from enquiry to follow-up:
 * enquiry, quote with itemised package price, acceptance, itinerary, documents and records transfer (with consent),
 * treatment, discharge summary, and a time-limited share link for the patient's home doctor.
 *
 * Facility accreditation (JCI, MSQH) and the facility licence are recorded by an admin together with how they were
 * checked: nothing is fetched from those bodies. See docs/MEDICAL_TOURISM.md for assumptions and open items.
 */

const iso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const json = (v: unknown) => JSON.stringify(v);
const parse = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// ---------- schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS tourism_facilities (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'hospital', city TEXT, state TEXT, address TEXT,
  description TEXT, phone TEXT, email TEXT, website TEXT,
  accepts_international INTEGER NOT NULL DEFAULT 1, mhtc_member INTEGER NOT NULL DEFAULT 0,
  languages TEXT, specialties TEXT, services TEXT, accreditations TEXT,
  licence_no TEXT, licence_expiry TEXT, licence_checked_at TEXT, licence_reference TEXT,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tourism_facility_staff (facility_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY (facility_id, user_id));
CREATE TABLE IF NOT EXISTS tourism_cases (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, facility_id TEXT NOT NULL, practitioner_id TEXT,
  specialty TEXT, summary TEXT NOT NULL, home_country TEXT, preferred_from TEXT, preferred_to TEXT,
  needs TEXT, share_documents INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'enquiry',
  discharge_summary TEXT, follow_up_plan TEXT, discharged_at TEXT, closed_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tcase_patient ON tourism_cases(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_tcase_fac ON tourism_cases(facility_id, status);
CREATE TABLE IF NOT EXISTS tourism_quotes (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, version INTEGER NOT NULL, items TEXT NOT NULL,
  subtotal_sen INTEGER NOT NULL, tax_sen INTEGER NOT NULL DEFAULT 0, tax_rate_pct REAL NOT NULL DEFAULT 0, total_sen INTEGER NOT NULL,
  inclusions TEXT, exclusions TEXT NOT NULL, cancellation_terms TEXT NOT NULL, payment_terms TEXT,
  valid_until TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'sent', created_by TEXT NOT NULL, created_at TEXT NOT NULL, decided_at TEXT
);
CREATE TABLE IF NOT EXISTS tourism_itinerary (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, date TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, note TEXT, created_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tourism_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL, sender_user_id TEXT NOT NULL, text TEXT NOT NULL, ts TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tourism_files (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, owner_user_id TEXT NOT NULL, kind TEXT NOT NULL, original_name TEXT NOT NULL,
  mime TEXT NOT NULL, size INTEGER NOT NULL, stored_name TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tourism_shares (
  token_hash TEXT PRIMARY KEY, case_id TEXT NOT NULL, recipient_label TEXT, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, views INTEGER NOT NULL DEFAULT 0
);
`);

// ---------- constants ----------
export const ACCREDITATION_BODIES = ["JCI", "MSQH", "other"] as const;
const FACILITY_KINDS = ["hospital", "specialist_centre", "clinic", "dental", "other"];
const QUOTE_CATEGORIES = ["procedure", "doctor_fees", "hospital_stay", "tests", "medication", "follow_up", "interpreter", "transport", "accommodation", "other"];
/** Lines that are healthcare services (the base for service tax, see section 5). */
const HEALTHCARE_CATEGORIES = ["procedure", "doctor_fees", "hospital_stay", "tests", "follow_up"];
const ITINERARY_KINDS = ["arrival", "consultation", "tests", "procedure", "recovery", "follow_up", "discharge", "departure", "other"];
const FILE_KINDS = ["passport", "medical_records", "visa_letter", "other"];
const OPEN_STATUSES = ["enquiry", "quoted", "accepted", "in_treatment"];
const SERVICE_FLAGS = ["interpreter", "airportPickup", "halalFood", "prayerRoom"] as const;

const root = path.join(dataDir, "uploads", "tourism");
try { fs.mkdirSync(root, { recursive: true }); } catch { /* read-only filesystem */ }
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
function detectType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  return null;
}

// ---------- facility views ----------
interface Accreditation { body: string; number: string; validUntil: string; reference: string; checkedAt: string; checkedBy: string }
const liveAccreditations = (f: any): Accreditation[] => parse<Accreditation[]>(f.accreditations, []).filter(a => a.validUntil >= today());
const licenceOk = (f: any) => !f.licence_expiry || f.licence_expiry >= today();

/** Verified, unexpired accreditation only: an expired or unchecked claim is never shown. */
function facilityView(f: any) {
  const staff = rows(
    "SELECT u.profile_id FROM tourism_facility_staff s JOIN users u ON u.id = s.user_id WHERE s.facility_id = ? AND u.profile_id IS NOT NULL", f.id,
  );
  return { f, staffProfileIds: staff.map(s => s.profile_id as string) };
}

export function registerTourism(app: Application, ctx: { findProfessional: (id: string) => any | undefined; allProfessionals: () => any[] }) {
  const publicFacility = (f: any) => {
    const { staffProfileIds } = facilityView(f);
    const practitioners = staffProfileIds
      .map(id => ctx.findProfessional(id))
      .filter(p => p && p.verificationStatus === VerificationStatus.VERIFIED)
      .map(p => ({ id: p.id, name: p.name, role: p.role, specialization: p.specialization, languages: p.languages ?? [], avatar: p.avatar }));
    const languages = [...new Set([...parse<string[]>(f.languages, []), ...practitioners.flatMap(p => p.languages as string[])])];
    return {
      id: f.id, name: f.name, kind: f.kind, city: f.city, state: f.state, address: f.address, description: f.description,
      phone: f.phone, email: f.email, website: f.website, mhtcMember: !!f.mhtc_member,
      specialties: parse<string[]>(f.specialties, []), languages,
      services: parse<Record<string, any>>(f.services, {}),
      accreditations: liveAccreditations(f).map(a => ({ body: a.body, number: a.number, validUntil: a.validUntil })),
      licenceChecked: !!f.licence_checked_at && licenceOk(f), licenceExpiry: f.licence_expiry ?? null,
      practitioners,
    };
  };
  const visibleFacilities = () => rows("SELECT * FROM tourism_facilities WHERE active = 1 AND accepts_international = 1").filter(licenceOk);

  // ---------- public: facility search ----------
  app.get("/api/tourism/facilities", (req, res) => {
    const q = str(req.query.q, 60).toLowerCase(), specialty = str(req.query.specialty, 60).toLowerCase();
    const language = str(req.query.language, 40).toLowerCase(), accreditation = str(req.query.accreditation, 10).toUpperCase();
    const service = str(req.query.service, 30);
    let list = visibleFacilities().map(publicFacility);
    if (q) list = list.filter(f => `${f.name} ${f.city} ${f.state}`.toLowerCase().includes(q));
    if (specialty) list = list.filter(f => f.specialties.some(s => s.toLowerCase().includes(specialty)));
    if (language) list = list.filter(f => f.languages.some(l => l.toLowerCase().includes(language)));
    if (accreditation) list = list.filter(f => f.accreditations.some(a => a.body.toUpperCase() === accreditation));
    if ((SERVICE_FLAGS as readonly string[]).includes(service)) list = list.filter(f => !!f.services[service]);
    res.json({ status: "success", data: list });
  });

  app.get("/api/tourism/facilities/:id", (req, res) => {
    const f = visibleFacilities().find(x => x.id === req.params.id);
    if (!f) return fail(res, 404, "Facility not found.");
    res.json({ status: "success", data: publicFacility(f) });
  });

  // Information for visitors. Unconfirmed points are marked so the page does not over-promise.
  app.get("/api/tourism/info", (_req, res) => {
    res.json({
      status: "success",
      data: {
        draft: true,
        sections: [
          { heading: "Entry and visas", body: "Entry rules depend on your nationality. Visitors from countries that do not need a visa are reported to be able to enter on a social visit pass for consultation and treatment; some nationalities need a visa or a medical e-visa. Longer stays may need a supporting letter from the hospital and an extension from Immigration. The final decision is the Immigration officer's. Check with the Malaysian embassy or consulate in your country and with Malaysian Immigration before you book travel." },
          { heading: "Malaysia Healthcare Travel Council (MHTC)", body: "MHTC is described as a Ministry of Health agency that promotes and coordinates healthcare travel and has member hospitals and facilitators. Whether your facility is an MHTC member is shown on its listing where we have recorded it. Confirm MHTC support letters and visa help directly with the facility and MHTC (unconfirmed: check mhtc.org.my)." },
          { heading: "Accreditation", body: "We show JCI or MSQH accreditation only when our team has checked it and recorded when it expires. We do not copy accreditation claims from facility websites." },
          { heading: "Prices", body: "Every quote lists each item and what is not included. Service tax (SST) of 6% may apply to healthcare for non-citizens (unconfirmed): the quote shows it when it applies. Prices are in Malaysian ringgit." },
          { heading: "Your records and privacy", body: "Passport copies and medical records you upload are visible to the facility only if you agree when you send your enquiry, and only for that case. You can remove files at any time. See the Privacy Notice." },
          { heading: "After treatment", body: "You receive a discharge summary. You can create a time-limited link to share it with your doctor at home. Follow-up video consultations with your Malaysian doctor are possible from your home country, but a Malaysian doctor cannot issue e-prescriptions or controlled medicines to you abroad, and cannot give emergency care." },
          { heading: "If something goes wrong", body: "Use 'Report a problem' on your case: it opens a support ticket reviewed by our team." },
        ],
      },
    });
  });

  // ---------- helpers ----------
  const isStaffOf = (u: Request["user"], facilityId: string) =>
    !!u && (u.role === "admin" || (u.role === "practitioner" && !!row("SELECT 1 AS x FROM tourism_facility_staff WHERE facility_id = ? AND user_id = ?", facilityId, u.id)));
  const staffFacilityIds = (u: NonNullable<Request["user"]>) =>
    u.role === "admin" ? rows("SELECT id FROM tourism_facilities").map(f => f.id as string) : rows("SELECT facility_id FROM tourism_facility_staff WHERE user_id = ?", u.id).map(r => r.facility_id as string);

  const quoteView = (q: any) => ({
    id: q.id, version: q.version, items: parse(q.items, []), subtotal: q.subtotal_sen / 100, tax: q.tax_sen / 100, taxRatePct: q.tax_rate_pct, total: q.total_sen / 100,
    inclusions: q.inclusions, exclusions: q.exclusions, cancellationTerms: q.cancellation_terms, paymentTerms: q.payment_terms,
    validUntil: q.valid_until, status: q.status === "sent" && q.valid_until < today() ? "expired" : q.status, createdAt: q.created_at, decidedAt: q.decided_at, currency: "MYR",
  });

  /** Case as seen by `viewer`. Staff see the patient's name, country and email only because the patient sent the enquiry. */
  function caseView(c: any, viewer: NonNullable<Request["user"]>) {
    const fac = row("SELECT * FROM tourism_facilities WHERE id = ?", c.facility_id);
    const patient = row("SELECT name, email FROM users WHERE id = ?", c.patient_user_id);
    const isPatient = viewer.id === c.patient_user_id;
    const canSeeFiles = isPatient || (c.share_documents === 1 && isStaffOf(viewer, c.facility_id));
    return {
      id: c.id, status: c.status, summary: c.summary, specialty: c.specialty, homeCountry: c.home_country, preferredFrom: c.preferred_from, preferredTo: c.preferred_to,
      needs: parse(c.needs, {}), shareDocuments: !!c.share_documents, createdAt: c.created_at, updatedAt: c.updated_at,
      facility: fac ? { id: fac.id, name: fac.name, city: fac.city, phone: fac.phone, email: fac.email } : null,
      practitioner: c.practitioner_id ? (() => { const p = ctx.findProfessional(c.practitioner_id); return p ? { id: p.id, name: p.name, specialization: p.specialization } : null; })() : null,
      patient: { name: patient?.name ?? "Patient", email: isPatient || isStaffOf(viewer, c.facility_id) ? patient?.email : undefined },
      quotes: rows("SELECT * FROM tourism_quotes WHERE case_id = ? ORDER BY version DESC", c.id).map(quoteView),
      itinerary: rows("SELECT id, date, kind, title, note FROM tourism_itinerary WHERE case_id = ? ORDER BY date, rowid", c.id),
      messages: rows("SELECT m.id, m.text, m.ts, m.sender_user_id AS senderId, u.name AS senderName FROM tourism_messages m LEFT JOIN users u ON u.id = m.sender_user_id WHERE m.case_id = ? ORDER BY m.id", c.id)
        .map(m => ({ ...m, mine: m.senderId === viewer.id })),
      files: canSeeFiles ? rows("SELECT id, kind, original_name AS name, size, created_at AS createdAt FROM tourism_files WHERE case_id = ? ORDER BY created_at DESC", c.id) : [],
      filesHidden: !canSeeFiles && rows("SELECT COUNT(*) AS n FROM tourism_files WHERE case_id = ?", c.id)[0].n > 0,
      discharge: c.discharged_at ? { summary: c.discharge_summary, followUpPlan: c.follow_up_plan, at: c.discharged_at } : null,
      shares: isPatient ? rows("SELECT recipient_label AS label, created_at AS createdAt, expires_at AS expiresAt, revoked_at AS revokedAt, views, token_hash AS id FROM tourism_shares WHERE case_id = ? ORDER BY created_at DESC", c.id)
        .map(s => ({ ...s, id: s.id.slice(0, 12) })) : undefined,
    };
  }
  const loadCase = (id: string) => row("SELECT * FROM tourism_cases WHERE id = ?", id);
  const touch = (id: string) => db.prepare("UPDATE tourism_cases SET updated_at = ? WHERE id = ?").run(iso(), id);
  const notifyFacility = (facilityId: string, title: string, body: string) => {
    for (const s of rows("SELECT user_id FROM tourism_facility_staff WHERE facility_id = ?", facilityId)) notify(s.user_id, title, body);
  };

  // ---------- patient: cases ----------
  app.post("/api/tourism/cases", requireRole("patient"), (req, res) => {
    const fac = visibleFacilities().find(f => f.id === str(req.body.facilityId, 60));
    if (!fac) return fail(res, 404, "Facility not found.");
    const summary = str(req.body.summary, 2000);
    if (summary.length < 20) return fail(res, 400, "Describe what treatment you are looking for (at least 20 characters).");
    if (req.body.consent !== true) return fail(res, 400, "Please agree that we may send this enquiry, with your name, email and country, to the facility.");
    const from = req.body.preferredFrom ? str(req.body.preferredFrom, 10) : null, to = req.body.preferredTo ? str(req.body.preferredTo, 10) : null;
    if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && to < from)) return fail(res, 400, "Check your preferred dates.");
    const needs: Record<string, any> = {};
    for (const k of SERVICE_FLAGS) needs[k] = req.body.needs?.[k] === true;
    needs.interpreterLanguage = str(req.body.needs?.interpreterLanguage, 40);
    needs.accommodation = req.body.needs?.accommodation === true;
    const open = row("SELECT COUNT(*) AS n FROM tourism_cases WHERE patient_user_id = ? AND status IN ('enquiry','quoted','accepted','in_treatment')", req.user!.id).n;
    if (open >= 5) return fail(res, 429, "You already have several open enquiries. Close some before starting another.");
    const id = newId("tcs");
    const practitionerId = str(req.body.practitionerId, 60) || null;
    if (practitionerId && !row("SELECT 1 AS x FROM tourism_facility_staff s JOIN users u ON u.id = s.user_id WHERE s.facility_id = ? AND u.profile_id = ?", fac.id, practitionerId)) return fail(res, 400, "Choose a practitioner from this facility.");
    db.prepare(
      `INSERT INTO tourism_cases (id,patient_user_id,facility_id,practitioner_id,specialty,summary,home_country,preferred_from,preferred_to,needs,share_documents,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(id, req.user!.id, fac.id, practitionerId, str(req.body.specialty, 80) || null, summary, str(req.body.homeCountry, 2).toUpperCase() || null, from, to, json(needs), req.body.shareDocuments === true ? 1 : 0, iso(), iso());
    recordConsent(req.user!.id, "medical_tourism");
    notifyFacility(fac.id, "New medical tourism enquiry", `${req.user!.name} sent an enquiry. Open the Tourism desk to send a quote.`);
    notifyAdmins("Medical tourism enquiry", `${req.user!.name} → ${fac.name}`);
    audit(req, "tourism.case.create", { target: ["tourism_case", id], details: { facilityId: fac.id } });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.get("/api/tourism/cases", requireRole("patient"), (req, res) => {
    const list = rows("SELECT * FROM tourism_cases WHERE patient_user_id = ? ORDER BY updated_at DESC", req.user!.id).map(c => ({
      id: c.id, status: c.status, summary: c.summary.slice(0, 120), facility: row("SELECT name FROM tourism_facilities WHERE id = ?", c.facility_id)?.name, updatedAt: c.updated_at,
    }));
    res.json({ status: "success", data: list });
  });

  app.get("/api/tourism/cases/:id", requireAuth, (req, res) => {
    const c = loadCase(req.params.id);
    const u = req.user!;
    if (!c || !(c.patient_user_id === u.id || isStaffOf(u, c.facility_id))) return fail(res, 404, "Case not found.");
    if (c.patient_user_id !== u.id) audit(req, "tourism.case.view", { target: ["tourism_case", c.id] });
    res.json({ status: "success", data: caseView(c, u) });
  });

  // ---------- shared by patient and staff ----------
  const participant = (req: Request, res: Response) => {
    const c = loadCase(req.params.id);
    const u = req.user!;
    if (!c || !(c.patient_user_id === u.id || isStaffOf(u, c.facility_id))) { fail(res, 404, "Case not found."); return null; }
    return { c, u, isPatient: c.patient_user_id === u.id };
  };

  app.post("/api/tourism/cases/:id/messages", requireAuth, (req, res) => {
    const p = participant(req, res); if (!p) return;
    const text = str(req.body.text, 2000);
    if (!text) return fail(res, 400, "Write a message.");
    if (!OPEN_STATUSES.includes(p.c.status) && p.c.status !== "completed") return fail(res, 409, "This case is closed.");
    db.prepare("INSERT INTO tourism_messages (case_id, sender_user_id, text, ts) VALUES (?,?,?,?)").run(p.c.id, p.u.id, text, iso());
    touch(p.c.id);
    if (p.isPatient) notifyFacility(p.c.facility_id, "New message on a tourism case", `${p.u.name} wrote on a case.`);
    else notify(p.c.patient_user_id, "New message from the facility", "Open Medical Tourism to read it.");
    res.status(201).json({ status: "success" });
  });

  // ---------- documents (passport, records): patient uploads; the facility sees them only if the patient agreed ----------
  app.post("/api/tourism/cases/:id/files", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    upload.single("file")(req, res, (err: any) => {
      if (err) return fail(res, 400, err.code === "LIMIT_FILE_SIZE" ? "File is larger than 8 MB." : "Upload failed.");
      const file = req.file; const kind = str(req.body.kind, 20) || "other";
      if (!file) return fail(res, 400, "No file provided.");
      if (!FILE_KINDS.includes(kind)) return fail(res, 400, "Unknown document type.");
      if (rows("SELECT id FROM tourism_files WHERE case_id = ?", c.id).length >= 20) return fail(res, 409, "This case already has 20 files.");
      const type = detectType(file.buffer);
      if (!type) return fail(res, 400, "Only PDF, JPG or PNG files are accepted.");
      const id = newId("tfl"), stored = `${crypto.randomBytes(16).toString("hex")}.${type.ext}`;
      fs.writeFileSync(path.join(root, stored), file.buffer, { mode: 0o600 });
      db.prepare("INSERT INTO tourism_files (id,case_id,owner_user_id,kind,original_name,mime,size,stored_name,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(id, c.id, req.user!.id, kind, path.basename(file.originalname).slice(0, 120), type.mime, file.size, stored, iso());
      touch(c.id);
      audit(req, "tourism.file.upload", { target: ["tourism_case", c.id], details: { kind, size: file.size } });
      res.status(201).json({ status: "success", data: { id } });
    });
  });

  app.get("/api/tourism/cases/:id/files/:fileId", requireAuth, (req, res) => {
    const c = loadCase(req.params.id); const u = req.user!;
    const f = row("SELECT * FROM tourism_files WHERE id = ? AND case_id = ?", req.params.fileId, req.params.id);
    const allowed = !!c && !!f && (c.patient_user_id === u.id || (c.share_documents === 1 && isStaffOf(u, c.facility_id)));
    if (!allowed) return fail(res, 404, "File not found.");
    if (c.patient_user_id !== u.id) audit(req, "tourism.file.view", { target: ["tourism_file", f.id], details: { caseId: c.id } });
    res.setHeader("Content-Type", f.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `attachment; filename="${f.original_name.replace(/[^\w.\- ]/g, "_")}"`);
    res.sendFile(path.join(root, f.stored_name));
  });

  app.delete("/api/tourism/cases/:id/files/:fileId", requireRole("patient"), (req, res) => {
    const f = row("SELECT f.* FROM tourism_files f JOIN tourism_cases c ON c.id = f.case_id WHERE f.id = ? AND f.case_id = ? AND c.patient_user_id = ?", req.params.fileId, req.params.id, req.user!.id);
    if (!f) return fail(res, 404, "File not found.");
    try { fs.unlinkSync(path.join(root, f.stored_name)); } catch { /* already gone */ }
    db.prepare("DELETE FROM tourism_files WHERE id = ?").run(f.id);
    audit(req, "tourism.file.delete", { target: ["tourism_case", req.params.id] });
    res.json({ status: "success" });
  });

  // Change whether the facility may open the uploaded files
  app.post("/api/tourism/cases/:id/sharing", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    db.prepare("UPDATE tourism_cases SET share_documents = ? WHERE id = ?").run(req.body.shareDocuments === true ? 1 : 0, c.id);
    audit(req, "tourism.sharing", { target: ["tourism_case", c.id], details: { shared: req.body.shareDocuments === true } });
    res.json({ status: "success" });
  });

  // ---------- patient: quote decision, cancel, problem ----------
  app.post("/api/tourism/cases/:id/quotes/:qid/decision", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    const q = row("SELECT * FROM tourism_quotes WHERE id = ? AND case_id = ?", req.params.qid, c.id);
    if (!q) return fail(res, 404, "Quote not found.");
    if (q.status !== "sent" || q.valid_until < today()) return fail(res, 409, "This quote is no longer open.");
    const decision = req.body.decision === "accept" ? "accepted" : req.body.decision === "decline" ? "declined" : null;
    if (!decision) return fail(res, 400, "Choose accept or decline.");
    if (decision === "accepted" && req.body.acknowledge !== true) return fail(res, 400, "Confirm you have read what is included, what is not, and the cancellation terms.");
    db.prepare("UPDATE tourism_quotes SET status = ?, decided_at = ? WHERE id = ?").run(decision, iso(), q.id);
    db.prepare("UPDATE tourism_cases SET status = ?, updated_at = ? WHERE id = ?").run(decision === "accepted" ? "accepted" : "enquiry", iso(), c.id);
    notifyFacility(c.facility_id, `Quote ${decision}`, `${req.user!.name} ${decision} quote v${q.version}.`);
    audit(req, "tourism.quote.decision", { target: ["tourism_case", c.id], details: { quote: q.id, decision } });
    res.json({ status: "success" });
  });

  app.post("/api/tourism/cases/:id/cancel", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    if (!["enquiry", "quoted", "accepted"].includes(c.status)) return fail(res, 409, "A case in treatment or finished cannot be cancelled here. Contact the facility.");
    db.prepare("UPDATE tourism_cases SET status = 'closed', closed_reason = ?, updated_at = ? WHERE id = ?").run(str(req.body.reason, 200) || "Cancelled by the patient", iso(), c.id);
    notifyFacility(c.facility_id, "Case cancelled", `${req.user!.name} cancelled a case. Check the quote's cancellation terms.`);
    audit(req, "tourism.case.cancel", { target: ["tourism_case", c.id] });
    res.json({ status: "success" });
  });

  // Report a problem: opens a support ticket in the existing help desk (category "Medical tourism")
  app.post("/api/tourism/cases/:id/problem", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    const body = str(req.body.details, 3000);
    if (body.length < 10) return fail(res, 400, "Describe the problem (at least 10 characters).");
    const fac = row("SELECT name FROM tourism_facilities WHERE id = ?", c.facility_id);
    const id = newId("tkt"), due = new Date(Date.now() + 4 * 3600_000).toISOString();
    db.prepare("INSERT INTO tickets (id,user_id,category,subject,priority,target,created_at,first_response_due,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, "Medical tourism", `Problem with ${fac?.name ?? "a facility"} (case ${c.id})`, "high", c.id, iso(), due, iso());
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_user_id, from_staff, body, ts) VALUES (?,?,0,?,?)").run(id, req.user!.id, body, iso());
    notifyAdmins("Medical tourism complaint", `${req.user!.name} reported a problem with ${fac?.name}.`);
    audit(req, "tourism.problem", { target: ["tourism_case", c.id], details: { ticket: id } });
    res.status(201).json({ status: "success", data: { ticketId: id } });
  });

  // ---------- patient: share the discharge summary with a doctor at home ----------
  app.post("/api/tourism/cases/:id/share", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    if (!c.discharged_at) return fail(res, 409, "There is no discharge summary to share yet.");
    if (req.body.consent !== true) return fail(res, 400, "Confirm you agree to share this summary with the person who receives the link.");
    const days = Math.min(30, Math.max(1, Math.trunc(Number(req.body.days)) || 14));
    const token = crypto.randomBytes(24).toString("base64url");
    db.prepare("INSERT INTO tourism_shares (token_hash,case_id,recipient_label,created_at,expires_at) VALUES (?,?,?,?,?)")
      .run(sha(token), c.id, str(req.body.recipientLabel, 80) || null, iso(), new Date(Date.now() + days * 86400_000).toISOString());
    audit(req, "tourism.share.create", { target: ["tourism_case", c.id], details: { days } });
    res.status(201).json({ status: "success", data: { token, path: `/share/${token}`, expiresInDays: days }, message: "Copy the link now. It is shown only once." });
  });

  app.post("/api/tourism/cases/:id/share/:shareId/revoke", requireRole("patient"), (req, res) => {
    const c = loadCase(req.params.id);
    if (!c || c.patient_user_id !== req.user!.id) return fail(res, 404, "Case not found.");
    const r = db.prepare("UPDATE tourism_shares SET revoked_at = ? WHERE case_id = ? AND token_hash LIKE ? AND revoked_at IS NULL").run(iso(), c.id, `${str(req.params.shareId, 20).replace(/[^a-f0-9]/g, "")}%`);
    if (!r.changes) return fail(res, 404, "Link not found.");
    audit(req, "tourism.share.revoke", { target: ["tourism_case", c.id] });
    res.json({ status: "success" });
  });

  // Public, read-only: the home doctor opens the link. Nothing beyond the discharge summary is exposed.
  const shareLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
  app.get("/api/tourism/shared/:token", shareLimiter, (req, res) => {
    const s = row("SELECT * FROM tourism_shares WHERE token_hash = ?", sha(str(req.params.token, 80)));
    if (!s || s.revoked_at || s.expires_at < iso()) return res.json({ status: "success", data: { found: false } });
    const c = loadCase(s.case_id);
    if (!c || !c.discharged_at) return res.json({ status: "success", data: { found: false } });
    db.prepare("UPDATE tourism_shares SET views = views + 1 WHERE token_hash = ?").run(s.token_hash);
    audit(null, "tourism.share.view", { actor: null, target: ["tourism_case", c.id] });
    const fac = row("SELECT name, city FROM tourism_facilities WHERE id = ?", c.facility_id);
    const p = c.practitioner_id ? ctx.findProfessional(c.practitioner_id) : null;
    res.json({
      status: "success",
      data: {
        found: true, patientName: row("SELECT name FROM users WHERE id = ?", c.patient_user_id)?.name, facility: fac ? `${fac.name}${fac.city ? `, ${fac.city}` : ""}` : null,
        treatedBy: p ? { name: p.name, specialization: p.specialization } : null, treatment: c.summary, dischargedAt: c.discharged_at,
        dischargeSummary: c.discharge_summary, followUpPlan: c.follow_up_plan, expiresAt: s.expires_at,
        disclaimer: "Shared by the patient with their consent. This is a summary, not a full record; contact the treating facility for details.",
      },
    });
  });

  // ---------- staff desk ----------
  app.get("/api/tourism/desk/me", requireRole("practitioner", "admin"), (req, res) => {
    const ids = staffFacilityIds(req.user!);
    res.json({ status: "success", data: { facilities: ids.map(id => row("SELECT id, name FROM tourism_facilities WHERE id = ?", id)).filter(Boolean), isAdmin: req.user!.role === "admin" } });
  });

  app.get("/api/tourism/desk/cases", requireRole("practitioner", "admin"), (req, res) => {
    const ids = staffFacilityIds(req.user!);
    if (!ids.length) return res.json({ status: "success", data: [] });
    const status = str(req.query.status, 20);
    const list = rows(`SELECT * FROM tourism_cases WHERE facility_id IN (${ids.map(() => "?").join(",")}) ${status ? "AND status = ?" : ""} ORDER BY updated_at DESC LIMIT 200`, ...ids, ...(status ? [status] : []))
      .map(c => ({ id: c.id, status: c.status, summary: c.summary.slice(0, 120), patient: row("SELECT name FROM users WHERE id = ?", c.patient_user_id)?.name, country: c.home_country, facility: row("SELECT name FROM tourism_facilities WHERE id = ?", c.facility_id)?.name, updatedAt: c.updated_at, preferredFrom: c.preferred_from }));
    res.json({ status: "success", data: list });
  });

  const staffCase = (req: Request, res: Response) => {
    const c = loadCase(req.params.id);
    if (!c || !isStaffOf(req.user!, c.facility_id)) { fail(res, 404, "Case not found."); return null; }
    return c;
  };

  app.post("/api/tourism/desk/cases/:id/quotes", requireRole("practitioner", "admin"), (req, res) => {
    const c = staffCase(req, res); if (!c) return;
    if (!OPEN_STATUSES.includes(c.status) || c.status === "in_treatment") return fail(res, 409, "A quote can be sent while the case is an enquiry, quoted or accepted.");
    const raw = Array.isArray(req.body.items) ? req.body.items : [];
    if (raw.length === 0 || raw.length > 30) return fail(res, 400, "Add between 1 and 30 price items.");
    const items: { label: string; category: string; amountSen: number }[] = [];
    for (const it of raw) {
      const label = str(it?.label, 120), category = str(it?.category, 30), amount = Math.round(Number(it?.amount) * 100);
      if (!label || !QUOTE_CATEGORIES.includes(category)) return fail(res, 400, "Every item needs a description and a category.");
      if (!(amount >= 0 && amount < 100_000_000_00)) return fail(res, 400, `The amount for "${label}" looks wrong.`);
      items.push({ label, category, amountSen: amount });
    }
    if (!items.some(i => i.category === "procedure")) return fail(res, 400, "Itemise the procedure or treatment itself.");
    const exclusions = str(req.body.exclusions, 1500), cancellation = str(req.body.cancellationTerms, 1500);
    if (exclusions.length < 5) return fail(res, 400, "State what is NOT included in the price (for example complications, extra nights, flights).");
    if (cancellation.length < 5) return fail(res, 400, "State the cancellation and refund terms.");
    const validUntil = str(req.body.validUntil, 10);
    if (!isDate(validUntil) || validUntil < today()) return fail(res, 400, "Give a future date until which the quote is valid.");
    const subtotal = items.reduce((s, i) => s + i.amountSen, 0);
    // Service tax applies to healthcare lines for non-citizens when enabled (section 5); the quote shows it separately.
    const healthcare = items.filter(i => HEALTHCARE_CATEGORIES.includes(i.category)).reduce((s, i) => s + i.amountSen, 0);
    const tax = computeTax(healthcare, "INTL");
    const version = (row("SELECT MAX(version) AS v FROM tourism_quotes WHERE case_id = ?", c.id)?.v ?? 0) + 1;
    db.prepare("UPDATE tourism_quotes SET status = 'superseded' WHERE case_id = ? AND status = 'sent'").run(c.id);
    const id = newId("tqt");
    db.prepare(
      `INSERT INTO tourism_quotes (id,case_id,version,items,subtotal_sen,tax_sen,tax_rate_pct,total_sen,inclusions,exclusions,cancellation_terms,payment_terms,valid_until,created_by,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(id, c.id, version, json(items), subtotal, tax.taxSen, tax.ratePct, subtotal + tax.taxSen, str(req.body.inclusions, 1500) || null, exclusions, cancellation, str(req.body.paymentTerms, 500) || null, validUntil, req.user!.id, iso());
    db.prepare("UPDATE tourism_cases SET status = 'quoted', updated_at = ? WHERE id = ? AND status IN ('enquiry','quoted')").run(iso(), c.id);
    notify(c.patient_user_id, "You have a quote", "Open Medical Tourism to see the itemised price and what is included.");
    audit(req, "tourism.quote.send", { target: ["tourism_case", c.id], details: { version, totalSen: subtotal + tax.taxSen } });
    res.status(201).json({ status: "success", data: { id, version } });
  });

  app.post("/api/tourism/desk/cases/:id/itinerary", requireRole("practitioner", "admin"), (req, res) => {
    const c = staffCase(req, res); if (!c) return;
    const date = str(req.body.date, 10), kind = str(req.body.kind, 20), title = str(req.body.title, 120);
    if (!isDate(date) || !ITINERARY_KINDS.includes(kind) || !title) return fail(res, 400, "Enter a date, a type and a title.");
    const id = newId("tit");
    db.prepare("INSERT INTO tourism_itinerary (id,case_id,date,kind,title,note,created_by) VALUES (?,?,?,?,?,?,?)").run(id, c.id, date, kind, title, str(req.body.note, 500) || null, req.user!.id);
    touch(c.id);
    notify(c.patient_user_id, "Your itinerary was updated", `${title} on ${date}.`);
    res.status(201).json({ status: "success", data: { id } });
  });

  app.delete("/api/tourism/desk/cases/:id/itinerary/:itemId", requireRole("practitioner", "admin"), (req, res) => {
    const c = staffCase(req, res); if (!c) return;
    db.prepare("DELETE FROM tourism_itinerary WHERE id = ? AND case_id = ?").run(req.params.itemId, c.id);
    touch(c.id);
    res.json({ status: "success" });
  });

  app.post("/api/tourism/desk/cases/:id/status", requireRole("practitioner", "admin"), (req, res) => {
    const c = staffCase(req, res); if (!c) return;
    const next = str(req.body.status, 20);
    const allowed: Record<string, string[]> = { accepted: ["in_treatment"], in_treatment: ["completed"] };
    if (!allowed[c.status]?.includes(next)) return fail(res, 409, `A case that is ${c.status} cannot move to ${next}.`);
    if (next === "completed" && !c.discharged_at) return fail(res, 409, "Write the discharge summary first.");
    db.prepare("UPDATE tourism_cases SET status = ?, updated_at = ? WHERE id = ?").run(next, iso(), c.id);
    notify(c.patient_user_id, next === "in_treatment" ? "Treatment started" : "Treatment completed", "Open Medical Tourism for details.");
    audit(req, "tourism.case.status", { target: ["tourism_case", c.id], details: { status: next } });
    res.json({ status: "success" });
  });

  // Discharge summary: written by a doctor of the facility (admin cannot author clinical text)
  app.post("/api/tourism/desk/cases/:id/discharge", requireRole("practitioner"), (req, res) => {
    const c = staffCase(req, res); if (!c) return;
    const pro = req.user!.profileId ? ctx.findProfessional(req.user!.profileId) : null;
    if (!pro || pro.role !== "doctor" || pro.verificationStatus !== VerificationStatus.VERIFIED) return fail(res, 403, "Only a verified doctor of the facility can write the discharge summary.");
    if (!["in_treatment", "completed"].includes(c.status)) return fail(res, 409, "Start treatment before writing a discharge summary.");
    const summary = str(req.body.summary, 4000), plan = str(req.body.followUpPlan, 2000);
    if (summary.length < 20) return fail(res, 400, "Write the discharge summary (at least 20 characters).");
    db.prepare("UPDATE tourism_cases SET discharge_summary = ?, follow_up_plan = ?, discharged_at = ?, practitioner_id = COALESCE(practitioner_id, ?), updated_at = ? WHERE id = ?")
      .run(summary, plan || null, iso(), pro.id, iso(), c.id);
    notify(c.patient_user_id, "Discharge summary ready", "You can read it and share it with your doctor at home.");
    audit(req, "tourism.discharge", { target: ["tourism_case", c.id] });
    res.json({ status: "success" });
  });

  // ---------- admin: facilities ----------
  const readFacility = (b: any) => {
    const name = str(b.name, 120);
    if (!name) return "A name is required.";
    const kind = FACILITY_KINDS.includes(b.kind) ? b.kind : "hospital";
    const services: Record<string, any> = {};
    for (const k of SERVICE_FLAGS) services[k] = b.services?.[k] === true;
    services.accommodationPartners = Array.isArray(b.services?.accommodationPartners) ? b.services.accommodationPartners.map((x: unknown) => str(x, 80)).filter(Boolean).slice(0, 10) : [];
    const list = (v: unknown, n = 20) => (Array.isArray(v) ? [...new Set(v.map(x => str(x, 60)).filter(Boolean))].slice(0, n) : []);
    return {
      name, kind, city: str(b.city, 60) || null, state: str(b.state, 60) || null, address: str(b.address, 250) || null, description: str(b.description, 1500) || null,
      phone: str(b.phone, 30) || null, email: str(b.email, 120) || null, website: /^https:\/\/\S+$/.test(str(b.website, 200)) ? str(b.website, 200) : null,
      accepts: b.acceptsInternational === false ? 0 : 1, mhtc: b.mhtcMember === true ? 1 : 0,
      languages: json(list(b.languages)), specialties: json(list(b.specialties)), services: json(services),
    };
  };

  app.get("/api/admin/tourism/facilities", requireRole("admin"), (_req, res) => {
    const list = rows("SELECT * FROM tourism_facilities ORDER BY created_at DESC").map(f => ({
      ...publicFacility(f), active: !!f.active, acceptsInternational: !!f.accepts_international, licenceNo: f.licence_no, licenceReference: f.licence_reference,
      allAccreditations: parse<Accreditation[]>(f.accreditations, []),
      staff: rows("SELECT u.id, u.name, u.email FROM tourism_facility_staff s JOIN users u ON u.id = s.user_id WHERE s.facility_id = ?", f.id),
      hiddenReason: !f.active ? "inactive" : !f.accepts_international ? "not accepting international patients" : !licenceOk(f) ? "licence expired" : null,
    }));
    res.json({ status: "success", data: list });
  });

  app.post("/api/admin/tourism/facilities", requireRole("admin"), (req, res) => {
    const f = readFacility(req.body);
    if (typeof f === "string") return fail(res, 400, f);
    const id = newId("fac");
    db.prepare(`INSERT INTO tourism_facilities (id,name,kind,city,state,address,description,phone,email,website,accepts_international,mhtc_member,languages,specialties,services,accreditations,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, f.name, f.kind, f.city, f.state, f.address, f.description, f.phone, f.email, f.website, f.accepts, f.mhtc, f.languages, f.specialties, f.services, "[]", iso());
    audit(req, "tourism.facility.create", { target: ["facility", id] });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.put("/api/admin/tourism/facilities/:id", requireRole("admin"), (req, res) => {
    if (!row("SELECT 1 AS x FROM tourism_facilities WHERE id = ?", req.params.id)) return fail(res, 404, "Facility not found.");
    const f = readFacility(req.body);
    if (typeof f === "string") return fail(res, 400, f);
    db.prepare(`UPDATE tourism_facilities SET name=?,kind=?,city=?,state=?,address=?,description=?,phone=?,email=?,website=?,accepts_international=?,mhtc_member=?,languages=?,specialties=?,services=? WHERE id=?`)
      .run(f.name, f.kind, f.city, f.state, f.address, f.description, f.phone, f.email, f.website, f.accepts, f.mhtc, f.languages, f.specialties, f.services, req.params.id);
    audit(req, "tourism.facility.update", { target: ["facility", req.params.id] });
    res.json({ status: "success" });
  });

  app.post("/api/admin/tourism/facilities/:id/active", requireRole("admin"), (req, res) => {
    const r = db.prepare("UPDATE tourism_facilities SET active = ? WHERE id = ?").run(req.body.active === false ? 0 : 1, req.params.id);
    if (!r.changes) return fail(res, 404, "Facility not found.");
    res.json({ status: "success" });
  });

  // Facility licence (MOH private healthcare facility licence): recorded with how it was checked
  app.post("/api/admin/tourism/facilities/:id/licence", requireRole("admin"), (req, res) => {
    const number = str(req.body.licenceNo, 60), expiry = str(req.body.licenceExpiry, 10), ref = str(req.body.reference, 200);
    if (!number || !isDate(expiry) || expiry <= today() || !ref || req.body.confirmed !== true) return fail(res, 400, "Enter the licence number, a future expiry date, how you checked it, and confirm the check.");
    const r = db.prepare("UPDATE tourism_facilities SET licence_no=?, licence_expiry=?, licence_checked_at=?, licence_reference=? WHERE id=?").run(number, expiry, iso(), ref, req.params.id);
    if (!r.changes) return fail(res, 404, "Facility not found.");
    audit(req, "tourism.facility.licence", { target: ["facility", req.params.id] });
    res.json({ status: "success" });
  });

  // Accreditation (JCI / MSQH): recorded only with a number, an expiry and how it was checked
  app.post("/api/admin/tourism/facilities/:id/accreditations", requireRole("admin"), (req, res) => {
    const f = row("SELECT * FROM tourism_facilities WHERE id = ?", req.params.id);
    if (!f) return fail(res, 404, "Facility not found.");
    const body = str(req.body.body, 10), number = str(req.body.number, 60), validUntil = str(req.body.validUntil, 10), reference = str(req.body.reference, 200);
    if (!(ACCREDITATION_BODIES as readonly string[]).includes(body) || !number || !isDate(validUntil) || validUntil <= today() || !reference) {
      return fail(res, 400, "Choose the accrediting body and enter the certificate number, a future expiry date and how you checked it.");
    }
    if (req.body.confirmed !== true) return fail(res, 400, "Confirm you checked this with the accrediting body.");
    const list = parse<Accreditation[]>(f.accreditations, []).filter(a => a.body !== body);
    list.push({ body, number, validUntil, reference, checkedAt: iso(), checkedBy: req.user!.id });
    db.prepare("UPDATE tourism_facilities SET accreditations = ? WHERE id = ?").run(json(list), f.id);
    audit(req, "tourism.facility.accreditation", { target: ["facility", f.id], details: { body } });
    res.json({ status: "success" });
  });

  app.delete("/api/admin/tourism/facilities/:id/accreditations/:body", requireRole("admin"), (req, res) => {
    const f = row("SELECT * FROM tourism_facilities WHERE id = ?", req.params.id);
    if (!f) return fail(res, 404, "Facility not found.");
    db.prepare("UPDATE tourism_facilities SET accreditations = ? WHERE id = ?").run(json(parse<Accreditation[]>(f.accreditations, []).filter(a => a.body !== req.params.body)), f.id);
    res.json({ status: "success" });
  });

  app.post("/api/admin/tourism/facilities/:id/staff", requireRole("admin"), (req, res) => {
    const u = row("SELECT id, role FROM users WHERE email = ? AND status = 'active'", str(req.body.email, 254).toLowerCase());
    if (!u || u.role !== "practitioner") return fail(res, 404, "No active practitioner account has that email.");
    if (!row("SELECT 1 AS x FROM tourism_facilities WHERE id = ?", req.params.id)) return fail(res, 404, "Facility not found.");
    db.prepare("INSERT OR IGNORE INTO tourism_facility_staff (facility_id, user_id) VALUES (?,?)").run(req.params.id, u.id);
    audit(req, "tourism.facility.staff", { target: ["facility", req.params.id] });
    res.json({ status: "success" });
  });

  app.delete("/api/admin/tourism/facilities/:id/staff/:userId", requireRole("admin"), (req, res) => {
    db.prepare("DELETE FROM tourism_facility_staff WHERE facility_id = ? AND user_id = ?").run(req.params.id, req.params.userId);
    res.json({ status: "success" });
  });
}
