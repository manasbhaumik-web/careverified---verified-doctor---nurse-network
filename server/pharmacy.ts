import crypto from "crypto";
import type { Application, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { audit } from "./audit";
import { createUser, emailTaken, hashPassword, requireRole, verifyPassword } from "./auth";
import { newTotpSecret, otpauthUrl, verifyTotp } from "./totp";
import { notify } from "./verification";
import { cleanServices, pharmacyEvent, pharmacyView, rxEffectiveStatus, rxPayload, same, sign } from "./clinical";
import { VerificationStatus } from "../src/types";

/**
 * Pharmacy workspace: each registered pharmacy signs in with its own email + password (role "pharmacy",
 * users.profile_id = the pharmacy id) and manages its inbox of prescriptions sent by patients, moves them through
 * a fill-status workflow (the patient is notified), keeps private notes, edits its listing, and sees an activity
 * log plus response and throughput reports. Everything is scoped to the signed-in pharmacy.
 */

const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FILL = ["received", "preparing", "ready", "cannot_fill"] as const;
type Fill = (typeof FILL)[number];
const RANK: Record<Fill, number> = { received: 1, preparing: 2, ready: 3, cannot_fill: 4 };
const DAY = 86_400_000;

/** Which inbox tab a prescription belongs to. */
function bucket(r: any): "new" | "in_progress" | "ready" | "cannot_fill" | "dispensed" | "closed" {
  const st = rxEffectiveStatus(r);
  if (st === "dispensed") return "dispensed";
  if (st !== "active") return "closed"; // expired or cancelled
  if (r.fill_status === "cannot_fill") return "cannot_fill";
  if (r.fill_status === "ready") return "ready";
  if (r.fill_status === "preparing" || r.fill_status === "received") return "in_progress";
  return "new";
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const minutesBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60_000;
const tempPassword = () => crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "k") + "7a";

interface Ctx { findProfessional: (id: string) => any | undefined }

export function registerPharmacyWorkspace(app: Application, ctx: Ctx) {
  const userName = (id: string) => (row("SELECT name FROM users WHERE id = ?", id)?.name as string) ?? "Patient";

  // Logins created before staff accounts existed: the earliest login of each pharmacy becomes its owner.
  for (const g of rows("SELECT DISTINCT profile_id AS pid FROM users WHERE role = 'pharmacy' AND profile_id IS NOT NULL")) {
    if (!row("SELECT 1 AS x FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", g.pid)) {
      db.prepare("UPDATE users SET pharmacy_owner = 1 WHERE id = (SELECT id FROM users WHERE role = 'pharmacy' AND profile_id = ? ORDER BY created_at LIMIT 1)").run(g.pid);
    }
  }

  /** Two-factor sign-in is mandatory in production (or when REQUIRE_PHARMACY_2FA=1); set REQUIRE_PHARMACY_2FA=0 to relax it. */
  const twoFactorRequired = () => process.env.REQUIRE_PHARMACY_2FA === "1" || (process.env.NODE_ENV === "production" && process.env.REQUIRE_PHARMACY_2FA !== "0");

  /** Signed-in pharmacy staff only, and only while the pharmacy is active and verified by the board. */
  const setup: RequestHandler[] = [
    requireRole("pharmacy"),
    (req, res, next) => {
      const ph = req.user!.profileId ? row("SELECT * FROM pharmacies WHERE id = ?", req.user!.profileId) : null;
      if (!ph || !ph.active || !ph.verified_at) return fail(res, 403, "This pharmacy account is not active. Contact the MedCred board.");
      res.locals.ph = ph;
      next();
    },
  ];
  /** Everything except account setup also needs the second factor when it is required. */
  const workspace: RequestHandler[] = [
    ...setup,
    (req, res, next) => {
      if (twoFactorRequired() && !row("SELECT totp_enabled AS e FROM users WHERE id = ?", req.user!.id)?.e) {
        return res.status(403).json({ status: "error", code: "2fa_required", message: "Set up two-factor sign-in to use the workspace." });
      }
      next();
    },
  ];
  const pharmacyOf = (res: Response) => res.locals.ph as any;

  const prescriberOf = (r: any) => {
    const prof = ctx.findProfessional(r.professional_id);
    return prof ? { name: prof.name as string, licenseNumber: prof.licenseNumber as string, stillVerified: prof.verificationStatus === VerificationStatus.VERIFIED } : null;
  };

  /** Allergies, current medicines and the doctor's safety warnings, only if the patient chose to share them with this pharmacy. */
  function safetyOf(r: any, pharmacyId: string) {
    if (r.pharmacy_id !== pharmacyId || !r.share_safety) return { shared: false as const };
    const items = (type: string) => rows("SELECT name, detail, severity FROM health_items WHERE user_id = ? AND type = ? AND active = 1 ORDER BY name", r.patient_user_id, type);
    let doctorWarnings: { severity: string; type: string; message: string }[] = [];
    try {
      const w = JSON.parse(r.warnings ?? "{}").warnings;
      if (Array.isArray(w)) doctorWarnings = w.filter((x: any) => ["allergy", "interaction", "duplicate"].includes(x.type)).map((x: any) => ({ severity: x.severity, type: x.type, message: x.message }));
    } catch { /* no stored warnings */ }
    return { shared: true as const, allergies: items("allergy"), medicines: items("medication"), doctorWarnings };
  }

  /** What a pharmacy needs to prepare a prescription: no diagnosis, IC number or contact details. */
  function view(r: any, pharmacyId: string) {
    return {
      id: r.id, code: r.code, patientName: userName(r.patient_user_id), items: JSON.parse(r.items), notes: r.notes ?? null,
      issuedAt: r.issued_at, validUntil: r.valid_until, status: rxEffectiveStatus(r), bucket: bucket(r),
      fillStatus: r.fill_status ?? null, fillReason: r.fill_reason ?? null, fillUpdatedAt: r.fill_updated_at ?? null,
      sentAt: r.sent_at ?? null, firstResponseAt: r.first_response_at ?? null, dispensedAt: r.dispensed_at ?? null,
      assignedToMe: r.pharmacy_id === pharmacyId,
      assignedElsewhere: !!r.pharmacy_id && r.pharmacy_id !== pharmacyId,
      note: (row("SELECT note FROM pharmacy_notes WHERE pharmacy_id = ? AND prescription_id = ?", pharmacyId, r.id)?.note as string) ?? "",
      prescriber: prescriberOf(r),
      safety: safetyOf(r, pharmacyId),
      cancelledReason: r.cancelled_reason ?? null,
    };
  }

  const countBuckets = (pharmacyId: string) => {
    const counts = { new: 0, in_progress: 0, ready: 0, cannot_fill: 0, dispensed: 0, closed: 0, waitingOver24h: 0 };
    for (const r of rows("SELECT status, valid_until, fill_status, sent_at FROM prescriptions WHERE pharmacy_id = ?", pharmacyId)) {
      const b = bucket(r);
      counts[b]++;
      if (b === "new" && r.sent_at && Date.now() - Date.parse(r.sent_at) > DAY) counts.waitingOver24h++;
    }
    return counts;
  };

  // ---------- profile ----------
  app.get("/api/pharmacy/me", ...setup, (req, res) => {
    const ph = pharmacyOf(res);
    const acct = row("SELECT name, email, must_change_password AS mustChange, pharmacy_owner AS owner, totp_enabled AS tf FROM users WHERE id = ?", req.user!.id);
    res.json({ status: "success", data: {
      pharmacy: { ...pharmacyView(ph), active: !!ph.active },
      account: {
        name: acct?.name ?? req.user!.name, email: acct?.email ?? req.user!.email, mustChangePassword: !!acct?.mustChange,
        isOwner: !!acct?.owner, twoFactor: { enabled: !!acct?.tf, required: twoFactorRequired() },
      },
      counts: countBuckets(ph.id),
    } });
  });

  app.patch("/api/pharmacy/me", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const b = req.body ?? {};
    const address = "address" in b ? str(b.address, 250) : ph.address;
    if (!address) return fail(res, 400, "The address cannot be empty.");
    db.prepare("UPDATE pharmacies SET address = ?, city = ?, phone = ?, hours = ?, services = ? WHERE id = ?").run(
      address,
      "city" in b ? str(b.city, 60) || null : ph.city,
      "phone" in b ? str(b.phone, 30) || null : ph.phone,
      "hours" in b ? str(b.hours, 120) || null : ph.hours,
      "services" in b ? JSON.stringify(cleanServices(b.services)) : ph.services,
      ph.id,
    );
    pharmacyEvent(ph.id, null, "profile_update", req.user!.id);
    audit(req, "pharmacy.profile.update", { target: ["pharmacy", ph.id] });
    res.json({ status: "success", data: { ...pharmacyView(row("SELECT * FROM pharmacies WHERE id = ?", ph.id)), active: true } });
  });

  // ---------- inbox ----------
  app.get("/api/pharmacy/prescriptions", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const want = str(req.query.status, 20) || "all";
    const q = str(req.query.q, 60).toLowerCase();
    let list = rows("SELECT * FROM prescriptions WHERE pharmacy_id = ? ORDER BY COALESCE(sent_at, issued_at) DESC LIMIT 300", ph.id)
      .map(r => view(r, ph.id));
    if (want !== "all") list = list.filter(r => r.bucket === want);
    if (q) list = list.filter(r => r.code.toLowerCase().includes(q) || r.patientName.toLowerCase().includes(q) || r.items.some((i: any) => String(i.name).toLowerCase().includes(q)));
    res.json({ status: "success", data: { items: list, counts: countBuckets(ph.id) } });
  });

  const lookupLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
  /** Walk-in: find any valid prescription by its code (for a patient who shows the code at the counter). */
  app.post("/api/pharmacy/lookup-code", lookupLimiter, ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str(req.body.code, 20).toUpperCase());
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail(res, 404, "No valid prescription with that code.");
    pharmacyEvent(ph.id, r.id, "lookup", req.user!.id, { via: "workspace" });
    audit(req, "pharmacy.lookup", { target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success", data: view(r, ph.id) });
  });

  const STATUS_TEXT: Record<Fill, (name: string, reason: string) => [string, string]> = {
    received: name => ["Prescription received", `${name} received your prescription and will start preparing it.`],
    preparing: name => ["Prescription being prepared", `${name} is preparing your prescription.`],
    ready: name => ["Prescription ready", `Your prescription is ready for pickup at ${name}.`],
    cannot_fill: (name, reason) => ["Pharmacy could not fill your prescription", `${name} could not fill it: ${reason}. You can send it to another pharmacy.`],
  };

  app.post("/api/pharmacy/prescriptions/:id/status", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND pharmacy_id = ?", req.params.id, ph.id);
    if (!r) return fail(res, 404, "Prescription not found in your inbox.");
    const next = str(req.body.status, 20) as Fill;
    if (!FILL.includes(next)) return fail(res, 400, "Choose a valid status.");
    if (rxEffectiveStatus(r) !== "active") return fail(res, 409, `This prescription is ${rxEffectiveStatus(r)}.`);
    if (r.fill_status === next) return fail(res, 409, "It already has that status.");
    if (next === "received" && r.fill_status) return fail(res, 409, "It is already past the received step.");
    const reason = str(req.body.reason, 200);
    if (next === "cannot_fill" && reason.length < 3) return fail(res, 400, "Give the patient a short reason.");
    const now = iso();
    db.prepare("UPDATE prescriptions SET fill_status = ?, fill_reason = ?, fill_updated_at = ?, first_response_at = COALESCE(first_response_at, ?) WHERE id = ?")
      .run(next, next === "cannot_fill" ? reason : null, now, now, r.id);
    pharmacyEvent(ph.id, r.id, next, req.user!.id, next === "cannot_fill" ? { reason } : undefined);
    const [title, body] = STATUS_TEXT[next](ph.name, reason);
    notify(r.patient_user_id, title, body);
    audit(req, "pharmacy.status", { target: ["prescription", r.id], details: { pharmacyId: ph.id, status: next } });
    res.json({ status: "success", data: view(row("SELECT * FROM prescriptions WHERE id = ?", r.id), ph.id) });
  });

  app.post("/api/pharmacy/prescriptions/:id/dispense", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row("SELECT * FROM prescriptions WHERE id = ?", req.params.id);
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail(res, 404, "No valid prescription found.");
    if (r.pharmacy_id && r.pharmacy_id !== ph.id) return fail(res, 409, "This prescription was sent to a different pharmacy.");
    const st = rxEffectiveStatus(r);
    if (st !== "active") return fail(res, 409, `This prescription is ${st}.`);
    const now = iso();
    const changed = db.prepare("UPDATE prescriptions SET status = 'dispensed', dispensed_at = ?, dispensed_by = ?, pharmacy_id = ?, fill_updated_at = ?, first_response_at = COALESCE(first_response_at, ?) WHERE id = ? AND status = 'active'")
      .run(now, ph.id, ph.id, now, now, r.id).changes;
    if (!changed) return fail(res, 409, "Already dispensed.");
    pharmacyEvent(ph.id, r.id, "dispensed", req.user!.id, { via: "workspace" });
    notify(r.patient_user_id, "Prescription dispensed", `${ph.name} dispensed your prescription.`);
    audit(req, "pharmacy.dispense", { target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success", data: view(row("SELECT * FROM prescriptions WHERE id = ?", r.id), ph.id) });
  });

  app.put("/api/pharmacy/prescriptions/:id/note", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row("SELECT id FROM prescriptions WHERE id = ? AND pharmacy_id = ?", req.params.id, ph.id);
    if (!r) return fail(res, 404, "Prescription not found in your inbox.");
    const note = str(req.body.note, 500);
    if (note) {
      db.prepare("INSERT INTO pharmacy_notes (pharmacy_id, prescription_id, note, updated_at) VALUES (?,?,?,?) ON CONFLICT(pharmacy_id, prescription_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at")
        .run(ph.id, r.id, note, iso());
      pharmacyEvent(ph.id, r.id, "note", req.user!.id);
    } else {
      db.prepare("DELETE FROM pharmacy_notes WHERE pharmacy_id = ? AND prescription_id = ?").run(ph.id, r.id);
    }
    res.json({ status: "success", data: { note } });
  });

  // ---------- activity log ----------
  app.get("/api/pharmacy/activity", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const limit = Math.min(100, Math.max(1, Math.trunc(Number(req.query.limit)) || 50));
    const before = Math.trunc(Number(req.query.before)) || 0;
    const list = rows(
      `SELECT e.id, e.ts, e.type, e.detail, e.prescription_id AS prescriptionId, p.code, a.name AS actorName
       FROM pharmacy_events e LEFT JOIN prescriptions p ON p.id = e.prescription_id LEFT JOIN users a ON a.id = e.actor_user_id
       WHERE e.pharmacy_id = ? ${before ? "AND e.id < ?" : ""} ORDER BY e.id DESC LIMIT ?`,
      ...(before ? [ph.id, before, limit] : [ph.id, limit]),
    ).map(e => ({
      ...e, detail: e.detail ? JSON.parse(e.detail) : null,
      // patients and doctors trigger these; only the pharmacy's own staff are named
      actorName: ["sent", "redirected", "cancelled"].includes(e.type) ? null : e.actorName ?? null,
    }));
    res.json({ status: "success", data: { items: list, next: list.length === limit ? list[list.length - 1].id : null } });
  });

  // ---------- reports ----------
  function report(pharmacyId: string, days: number) {
    const since = new Date(Date.now() - days * DAY).toISOString();
    const sent = rows("SELECT * FROM prescriptions WHERE pharmacy_id = ? AND sent_at >= ?", pharmacyId, since);
    const events = rows("SELECT type, ts FROM pharmacy_events WHERE pharmacy_id = ? AND ts >= ?", pharmacyId, since);
    const received = events.filter(e => e.type === "sent").length;
    const dispensed = events.filter(e => e.type === "dispensed").length;
    const cannotFill = events.filter(e => e.type === "cannot_fill").length;
    const expiredUnfilled = sent.filter(r => rxEffectiveStatus(r) === "expired").length;
    const finished = dispensed + cannotFill + expiredUnfilled;
    const responseMins = sent.filter(r => r.first_response_at).map(r => minutesBetween(r.sent_at, r.first_response_at)).filter(n => n >= 0);
    const dispenseMins = sent.filter(r => r.dispensed_at).map(r => minutesBetween(r.sent_at, r.dispensed_at)).filter(n => n >= 0);

    const perDay: { date: string; received: number; dispensed: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
      idx.set(date, perDay.push({ date, received: 0, dispensed: 0 }) - 1);
    }
    for (const e of events) {
      const i = idx.get(e.ts.slice(0, 10));
      if (i === undefined) continue;
      if (e.type === "sent") perDay[i].received++;
      else if (e.type === "dispensed") perDay[i].dispensed++;
    }

    const meds = new Map<string, number>();
    for (const r of sent) for (const it of JSON.parse(r.items)) meds.set(String(it.name), (meds.get(String(it.name)) ?? 0) + 1);
    const topMedicines = [...meds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    return {
      days, since, received, dispensed, cannotFill, expiredUnfilled,
      fillRate: finished ? Math.round((dispensed / finished) * 100) : null,
      responseMinutes: { average: avg(responseMins), median: median(responseMins), samples: responseMins.length },
      dispenseMinutes: { average: avg(dispenseMins), median: median(dispenseMins), samples: dispenseMins.length },
      current: countBuckets(pharmacyId),
      perDay, topMedicines,
    };
  }

  app.get("/api/pharmacy/reports", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const data = report(ph.id, days);
    if (req.query.format === "csv") {
      const lines = [
        `MedCred pharmacy report,${ph.name.replace(/,/g, " ")}`,
        `Period (days),${data.days}`,
        `Received,${data.received}`, `Dispensed,${data.dispensed}`, `Could not fill,${data.cannotFill}`, `Expired unfilled,${data.expiredUnfilled}`,
        `Fill rate %,${data.fillRate ?? ""}`,
        `Median first response (min),${data.responseMinutes.median ?? ""}`, `Average first response (min),${data.responseMinutes.average ?? ""}`,
        `Median time to dispense (min),${data.dispenseMinutes.median ?? ""}`,
        "", "date,received,dispensed", ...data.perDay.map(d => `${d.date},${d.received},${d.dispensed}`),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="pharmacy-report-${data.days}d.csv"`);
      return res.send(lines.join("\n"));
    }
    res.json({ status: "success", data });
  });

  // ---------- admin: issue and reset pharmacy logins, and see how each pharmacy is doing ----------
  app.get("/api/admin/pharmacies/summary", requireRole("admin"), (_req, res) => {
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    const out: Record<string, unknown> = {};
    for (const p of rows("SELECT id, licence_no, pharmacist_name, pharmacist_reg, verified_at FROM pharmacies")) {
      const acct = row("SELECT name, email, must_change_password AS mustChange, totp_enabled AS tf FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", p.id);
      const staffCount = row("SELECT COUNT(*) AS n FROM users WHERE role = 'pharmacy' AND profile_id = ? AND status = 'active'", p.id).n as number;
      const counts = countBuckets(p.id);
      const resp = rows("SELECT sent_at, first_response_at FROM prescriptions WHERE pharmacy_id = ? AND sent_at >= ? AND first_response_at IS NOT NULL", p.id, since)
        .map(r => minutesBetween(r.sent_at, r.first_response_at)).filter(n => n >= 0);
      out[p.id] = {
        verification: p.verified_at ? { licenceNumber: p.licence_no, pharmacistName: p.pharmacist_name, pharmacistRegNo: p.pharmacist_reg, verifiedAt: p.verified_at } : null,
        account: acct ? { name: acct.name, email: acct.email, mustChangePassword: !!acct.mustChange, twoFactor: !!acct.tf } : null,
        staffCount,
        inbox: counts.new, inProgress: counts.in_progress, dispensed: counts.dispensed,
        lastActivity: row("SELECT MAX(ts) AS ts FROM pharmacy_events WHERE pharmacy_id = ?", p.id)?.ts ?? null,
        avgResponseMinutes: avg(resp),
      };
    }
    res.json({ status: "success", data: out });
  });

  app.post("/api/admin/pharmacies/:id/account", requireRole("admin"), (req: Request, res) => {
    const ph = row("SELECT id, name, verified_at FROM pharmacies WHERE id = ?", req.params.id);
    if (!ph) return fail(res, 404, "Pharmacy not found.");
    if (!ph.verified_at) return fail(res, 409, "Verify the pharmacy's licence and pharmacist before creating a login.");
    if (row("SELECT 1 AS x FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", ph.id)) return fail(res, 409, "This pharmacy already has an owner login. Reset its password instead.");
    const name = str(req.body.name, 100) || ph.name;
    const email = str(req.body.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(res, 400, "A valid email address is required.");
    if (emailTaken(email)) return fail(res, 409, "An account with this email already exists.");
    const password = tempPassword();
    const user = createUser({ email, password, role: "pharmacy", name });
    db.prepare("UPDATE users SET profile_id = ?, must_change_password = 1, pharmacy_owner = 1 WHERE id = ?").run(ph.id, user.id);
    audit(req, "pharmacy.account.create", { target: ["pharmacy", ph.id], details: { email } });
    res.status(201).json({ status: "success", data: { email, password }, message: "Share the email and temporary password with the pharmacy. The password is shown only once." });
  });

  app.post("/api/admin/pharmacies/:id/account/reset", requireRole("admin"), (req, res) => {
    const u = row("SELECT id, email FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", req.params.id);
    if (!u) return fail(res, 404, "This pharmacy has no owner login yet.");
    const password = tempPassword();
    // same hashing as every other account; also clears any lockout and signs out existing sessions
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, failed_logins = 0, locked_until = NULL, totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(hashPassword(password), u.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    audit(req, "pharmacy.account.reset", { target: ["pharmacy", String(req.params.id)] });
    res.json({ status: "success", data: { email: u.email, password }, message: "Share the temporary password with the pharmacy. It is shown only once. Two-factor sign-in was reset too." });
  });

  // ---------- admin: check the pharmacy against the official registers before it can have logins ----------
  app.post("/api/admin/pharmacies/:id/verification", requireRole("admin"), (req, res) => {
    const ph = row("SELECT id FROM pharmacies WHERE id = ?", req.params.id);
    if (!ph) return fail(res, 404, "Pharmacy not found.");
    const licenceNumber = str(req.body.licenceNumber, 60), pharmacistName = str(req.body.pharmacistName, 100), pharmacistReg = str(req.body.pharmacistRegNo, 60);
    if (!licenceNumber || !pharmacistName || !pharmacistReg) return fail(res, 400, "Enter the pharmacy licence number and the pharmacist's name and registration number.");
    if (req.body.confirmed !== true) return fail(res, 400, "Confirm that you checked these details against the official register.");
    db.prepare("UPDATE pharmacies SET licence_no = ?, pharmacist_name = ?, pharmacist_reg = ?, verified_at = ?, verified_by = ? WHERE id = ?")
      .run(licenceNumber, pharmacistName, pharmacistReg, iso(), req.user!.id, ph.id);
    audit(req, "pharmacy.verify", { target: ["pharmacy", ph.id], details: { licenceNumber, pharmacistReg } });
    res.json({ status: "success" });
  });

  // ---------- staff logins: the owner account adds the pharmacy's own staff, so every action is attributable ----------
  const ownerOnly: RequestHandler = (req, res, next) => {
    if (!row("SELECT 1 AS x FROM users WHERE id = ? AND pharmacy_owner = 1", req.user!.id)) return fail(res, 403, "Only the pharmacy owner account can manage staff logins.");
    next();
  };
  const staffView = (u: any) => ({
    id: u.id, name: u.name, email: u.email, active: u.status === "active", isOwner: !!u.pharmacy_owner,
    twoFactor: !!u.totp_enabled, mustChangePassword: !!u.must_change_password, createdAt: u.created_at,
  });
  const staffOf = (pharmacyId: string, userId: unknown) => row("SELECT * FROM users WHERE id = ? AND role = 'pharmacy' AND profile_id = ?", String(userId), pharmacyId);

  app.get("/api/pharmacy/staff", ...workspace, ownerOnly, (_req, res) => {
    const ph = pharmacyOf(res);
    res.json({ status: "success", data: rows("SELECT * FROM users WHERE role = 'pharmacy' AND profile_id = ? ORDER BY pharmacy_owner DESC, created_at", ph.id).map(staffView) });
  });

  app.post("/api/pharmacy/staff", ...workspace, ownerOnly, (req, res) => {
    const ph = pharmacyOf(res);
    if (row("SELECT COUNT(*) AS n FROM users WHERE role = 'pharmacy' AND profile_id = ?", ph.id).n >= 20) return fail(res, 400, "That is the most staff logins a pharmacy can have.");
    const name = str(req.body.name, 100);
    const email = str(req.body.email, 254).toLowerCase();
    if (!name || !EMAIL_RE.test(email)) return fail(res, 400, "A name and a valid email address are required.");
    if (emailTaken(email)) return fail(res, 409, "An account with this email already exists.");
    const password = tempPassword();
    const user = createUser({ email, password, role: "pharmacy", name });
    db.prepare("UPDATE users SET profile_id = ?, must_change_password = 1 WHERE id = ?").run(ph.id, user.id);
    pharmacyEvent(ph.id, null, "staff_added", req.user!.id, { name });
    audit(req, "pharmacy.staff.add", { target: ["pharmacy", ph.id], details: { email } });
    res.status(201).json({ status: "success", data: { email, password }, message: "Share the email and temporary password with your colleague. The password is shown only once." });
  });

  app.post("/api/pharmacy/staff/:uid/status", ...workspace, ownerOnly, (req, res) => {
    const ph = pharmacyOf(res);
    const u = staffOf(ph.id, req.params.uid);
    if (!u) return fail(res, 404, "Staff login not found.");
    if (u.pharmacy_owner) return fail(res, 400, "The owner account cannot be disabled.");
    const active = req.body.active === true;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(active ? "active" : "disabled", u.id);
    if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    pharmacyEvent(ph.id, null, "staff_status", req.user!.id, { name: u.name, active });
    audit(req, "pharmacy.staff.status", { target: ["user", u.id], details: { active } });
    res.json({ status: "success" });
  });

  app.post("/api/pharmacy/staff/:uid/reset", ...workspace, ownerOnly, (req, res) => {
    const ph = pharmacyOf(res);
    const u = staffOf(ph.id, req.params.uid);
    if (!u || u.pharmacy_owner) return fail(res, 404, "Staff login not found.");
    const password = tempPassword();
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, failed_logins = 0, locked_until = NULL, totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(hashPassword(password), u.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    audit(req, "pharmacy.staff.reset", { target: ["user", u.id] });
    res.json({ status: "success", data: { email: u.email, password }, message: "Share the temporary password with your colleague. It is shown only once." });
  });

  // ---------- two-factor sign-in (authenticator app) ----------
  app.post("/api/pharmacy/2fa/setup", ...setup, (req, res) => {
    if (row("SELECT totp_enabled AS e FROM users WHERE id = ?", req.user!.id)?.e) return fail(res, 409, "Two-factor sign-in is already on.");
    const secret = newTotpSecret();
    db.prepare("UPDATE users SET totp_secret = ? WHERE id = ?").run(secret, req.user!.id);
    res.json({ status: "success", data: { secret, otpauthUrl: otpauthUrl(req.user!.email, secret) } });
  });

  app.post("/api/pharmacy/2fa/enable", ...setup, (req, res) => {
    const u = row("SELECT totp_secret AS secret FROM users WHERE id = ?", req.user!.id);
    if (!u?.secret) return fail(res, 400, "Start the setup first.");
    if (!verifyTotp(u.secret, str(req.body.code, 12))) return fail(res, 400, "That code is not correct. Check the time on your phone and try again.");
    db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?").run(req.user!.id);
    pharmacyEvent(pharmacyOf(res).id, null, "two_factor", req.user!.id, { on: true });
    audit(req, "pharmacy.2fa.enable");
    res.json({ status: "success" });
  });

  app.post("/api/pharmacy/2fa/disable", ...setup, (req, res) => {
    if (twoFactorRequired()) return fail(res, 409, "Two-factor sign-in is required for pharmacy accounts and cannot be turned off.");
    const u = row("SELECT password_hash AS hash, totp_secret AS secret, totp_enabled AS e FROM users WHERE id = ?", req.user!.id);
    if (!u?.e) return fail(res, 409, "Two-factor sign-in is already off.");
    if (typeof req.body.password !== "string" || !verifyPassword(req.body.password, u.hash) || !verifyTotp(u.secret, str(req.body.code, 12))) return fail(res, 400, "Your password or code is not correct.");
    db.prepare("UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(req.user!.id);
    pharmacyEvent(pharmacyOf(res).id, null, "two_factor", req.user!.id, { on: false });
    audit(req, "pharmacy.2fa.disable");
    res.json({ status: "success" });
  });
}
