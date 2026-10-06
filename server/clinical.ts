import crypto from "crypto";
import type { Application, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { audit } from "./audit";
import { hashPassword, verifyPassword, requireAuth, requireRole } from "./auth";
import { notify, notifyAdmins } from "./verification";
import { checkPrescription, isRestricted, findDrug, Warning } from "./formulary";
import { VerificationStatus } from "../src/types";

/**
 * Clinical records: patient-owned health record with consent-based sharing, consultation notes (SOAP),
 * e-prescriptions with safety checks and verification codes, medical certificates, referrals, lab orders,
 * and a partner-pharmacy directory.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS health_items (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, detail TEXT,
  severity TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_health_user ON health_items(user_id, type);
CREATE TABLE IF NOT EXISTS vitals (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ts TEXT NOT NULL, kind TEXT NOT NULL,
  value1 REAL NOT NULL, value2 REAL, unit TEXT NOT NULL, note TEXT
);
CREATE INDEX IF NOT EXISTS idx_vitals_user ON vitals(user_id, ts);
CREATE TABLE IF NOT EXISTS record_grants (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL, source TEXT NOT NULL,
  ref_id TEXT, granted_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_grants ON record_grants(patient_user_id, professional_id);
CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, ref_id TEXT NOT NULL, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL,
  subjective TEXT, objective TEXT, assessment TEXT, plan TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, signed_at TEXT,
  UNIQUE (kind, ref_id)
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL,
  kind TEXT NOT NULL, ref_id TEXT NOT NULL, items TEXT NOT NULL, diagnosis TEXT NOT NULL, notes TEXT,
  issued_at TEXT NOT NULL, valid_until TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  pharmacy_id TEXT, dispensed_at TEXT, dispensed_by TEXT, cancelled_reason TEXT, signature TEXT NOT NULL,
  warnings TEXT, record_checked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions(patient_user_id);
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL,
  from_date TEXT NOT NULL, to_date TEXT NOT NULL, remarks TEXT, issued_at TEXT NOT NULL, signature TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, from_professional_id TEXT NOT NULL, to_specialty TEXT NOT NULL,
  to_professional_id TEXT, reason TEXT NOT NULL, urgency TEXT NOT NULL, issued_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lab_orders (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL, tests TEXT NOT NULL, notes TEXT,
  status TEXT NOT NULL DEFAULT 'ordered', ordered_at TEXT NOT NULL, result_document_id TEXT, resulted_at TEXT
);
CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, phone TEXT, pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
`);

const iso = () => new Date().toISOString();
const newId = (p: string) => `${p}-${crypto.randomBytes(7).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const dateOnly = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;

// ---------- tamper-evident signatures ----------
function signingKey(): string {
  if (process.env.RECORD_SIGNING_SECRET) return process.env.RECORD_SIGNING_SECRET;
  let r = row("SELECT value FROM settings WHERE key = 'signing_secret'");
  if (!r) {
    const v = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO settings (key, value) VALUES ('signing_secret', ?)").run(v);
    r = { value: v };
  }
  return r.value;
}
const sign = (payload: unknown) => crypto.createHmac("sha256", signingKey()).update(JSON.stringify(payload)).digest("hex");
const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
// 10 chars from an unambiguous alphabet (no 0/O/1/I): about 50 bits, enough to be unguessable
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.randomBytes(10), b => ALPHABET[b % ALPHABET.length]).join("");

const rxPayload = (r: any) => ({ id: r.id, code: r.code, patient: r.patient_user_id, professional: r.professional_id, issuedAt: r.issued_at, validUntil: r.valid_until, diagnosis: r.diagnosis, items: JSON.parse(r.items) });
const certPayload = (c: any) => ({ id: c.id, code: c.code, patient: c.patient_user_id, professional: c.professional_id, from: c.from_date, to: c.to_date, issuedAt: c.issued_at });

// ---------- consent ----------
export function createGrant(patientUserId: string, professionalId: string, source: "booking" | "consult" | "manual", refId: string | null, days = 30) {
  const existing = row("SELECT id FROM record_grants WHERE patient_user_id = ? AND professional_id = ? AND revoked_at IS NULL AND expires_at > ?", patientUserId, professionalId, iso());
  const expires = new Date(Date.now() + days * 86400_000).toISOString();
  if (existing) { db.prepare("UPDATE record_grants SET expires_at = MAX(expires_at, ?) WHERE id = ?").run(expires, existing.id); return existing.id; }
  const id = newId("grt");
  db.prepare("INSERT INTO record_grants (id, patient_user_id, professional_id, source, ref_id, granted_at, expires_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, patientUserId, professionalId, source, refId, iso(), expires);
  return id;
}
const hasGrant = (patientUserId: string, professionalId: string) =>
  !!row("SELECT 1 AS x FROM record_grants WHERE patient_user_id = ? AND professional_id = ? AND revoked_at IS NULL AND expires_at > ?", patientUserId, professionalId, iso());

export function seedHealthItems(userId: string, conditions: string[], allergies: string[]) {
  const ins = db.prepare("INSERT INTO health_items (id,user_id,type,name,created_at,updated_at) VALUES (?,?,?,?,?,?)");
  for (const c of conditions) if (c.trim()) ins.run(newId("hi"), userId, "condition", c.trim().slice(0, 120), iso(), iso());
  for (const a of allergies) if (a.trim()) ins.run(newId("hi"), userId, "allergy", a.trim().slice(0, 120), iso(), iso());
}

// ---------- vitals ----------
const VITAL_KINDS: Record<string, { unit: string; two?: boolean; min: number; max: number; min2?: number; max2?: number }> = {
  bp: { unit: "mmHg", two: true, min: 40, max: 300, min2: 20, max2: 200 },
  glucose: { unit: "mmol/L", min: 0.5, max: 50 },
  heart_rate: { unit: "bpm", min: 20, max: 250 },
  spo2: { unit: "%", min: 50, max: 100 },
  temperature: { unit: "°C", min: 30, max: 45 },
  weight: { unit: "kg", min: 1, max: 400 },
};
/** Plain-language flag for clearly dangerous readings (widely used emergency thresholds). */
function vitalFlag(kind: string, v1: number, v2?: number | null): { level: "urgent" | "watch"; text: string } | null {
  if (kind === "bp" && (v1 >= 180 || (v2 ?? 0) >= 120)) return { level: "urgent", text: "Very high blood pressure. If you have chest pain, breathlessness, weakness or a severe headache call 999 now; otherwise seek urgent medical advice." };
  if (kind === "bp" && v1 < 90) return { level: "watch", text: "Low blood pressure. Sit or lie down, and seek advice if you feel faint or unwell." };
  if (kind === "spo2" && v1 < 92) return { level: "urgent", text: "Low oxygen level. Seek urgent medical help." };
  if (kind === "glucose" && v1 < 3.9) return { level: "urgent", text: "Low blood sugar. Take fast-acting sugar and seek help if you do not recover quickly." };
  if (kind === "glucose" && v1 >= 16.7) return { level: "watch", text: "Very high blood sugar. Contact your doctor today." };
  if (kind === "heart_rate" && (v1 > 130 || v1 < 40)) return { level: "urgent", text: "Unusual heart rate. If you feel unwell, seek urgent help." };
  if (kind === "temperature" && v1 >= 39.5) return { level: "watch", text: "High fever. Seek medical advice." };
  return null;
}

interface Ctx {
  findProfessional: (id: string) => any | undefined;
  getBooking: (id: string) => any | undefined;
  allBookings: () => any[];
  completeBooking: (id: string) => void;
}

export function registerClinicalRoutes(app: Application, ctx: Ctx) {
  const verifiedPro = (profileId: string | null | undefined) => {
    const p = profileId ? ctx.findProfessional(profileId) : null;
    return p && p.verificationStatus === VerificationStatus.VERIFIED ? p : null;
  };
  const userName = (id: string) => (row("SELECT name FROM users WHERE id = ?", id)?.name as string) ?? "Patient";
  const maskName = (full: string) => { const [first, ...rest] = full.split(" "); return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first; };

  /** The practitioner's treatment relationship to a booking or consult (paid booking, or own consult). */
  const relation = (req: Request, kind: string, refId: string): { patientUserId: string; kind: "booking" | "consult"; refId: string } | null => {
    const pid = req.user?.profileId;
    if (!pid || !verifiedPro(pid)) return null;
    if (kind === "booking") {
      const b = ctx.getBooking(refId);
      if (b && b.professionalId === pid && b.paymentStatus === "Paid" && b.status !== "Cancelled") return { patientUserId: b.patientUserId, kind, refId };
    } else if (kind === "consult") {
      const c = row("SELECT patient_user_id FROM consults WHERE id = ? AND professional_id = ? AND status IN ('active','completed')", refId, pid);
      if (c) return { patientUserId: c.patient_user_id, kind, refId };
    }
    return null;
  };
  const patientHasRelationTo = (patientUserId: string, professionalId: string) =>
    ctx.allBookings().some(b => b.patientUserId === patientUserId && b.professionalId === professionalId && b.paymentStatus === "Paid") ||
    !!row("SELECT 1 AS x FROM consults WHERE patient_user_id = ? AND professional_id = ?", patientUserId, professionalId);

  const patientSnapshot = (patientUserId: string) => ({
    allergies: rows("SELECT name, detail, severity FROM health_items WHERE user_id = ? AND type = 'allergy' AND active = 1", patientUserId),
    conditions: rows("SELECT name, detail FROM health_items WHERE user_id = ? AND type = 'condition' AND active = 1", patientUserId),
    medications: rows("SELECT name, detail FROM health_items WHERE user_id = ? AND type = 'medication' AND active = 1", patientUserId),
  });

  // =========================================================
  // Patient: own record
  // =========================================================
  app.get("/api/records/me", requireRole("patient"), (req, res) => {
    const u = req.user!.id;
    const vitals = rows("SELECT id, ts, kind, value1, value2, unit, note FROM vitals WHERE user_id = ? ORDER BY ts DESC LIMIT 100", u)
      .map(v => ({ ...v, flag: vitalFlag(v.kind, v.value1, v.value2) }));
    const grants = rows("SELECT id, professional_id, source, granted_at, expires_at FROM record_grants WHERE patient_user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY granted_at DESC", u, iso())
      .map(g => ({ ...g, professionalName: ctx.findProfessional(g.professional_id)?.name }));
    const myPros = new Map<string, string>();
    for (const b of ctx.allBookings()) if (b.patientUserId === u && b.paymentStatus === "Paid") myPros.set(b.professionalId, b.professionalName);
    for (const c of rows("SELECT DISTINCT professional_id FROM consults WHERE patient_user_id = ? AND professional_id IS NOT NULL", u)) {
      const p = ctx.findProfessional(c.professional_id); if (p) myPros.set(p.id, p.name);
    }
    const prescriptions = rows("SELECT * FROM prescriptions WHERE patient_user_id = ? ORDER BY issued_at DESC", u).map(r => rxView(r));
    res.json({
      status: "success",
      data: {
        ...patientSnapshot(u),
        items: rows("SELECT id, type, name, detail, severity, active FROM health_items WHERE user_id = ? ORDER BY type, name", u),
        vitals, grants,
        sharableWith: [...myPros].map(([id, name]) => ({ id, name })),
        prescriptions,
        certificates: rows("SELECT * FROM certificates WHERE patient_user_id = ? ORDER BY issued_at DESC", u).map(certView),
        referrals: rows("SELECT * FROM referrals WHERE patient_user_id = ? ORDER BY issued_at DESC", u).map(refView),
        labOrders: rows("SELECT * FROM lab_orders WHERE patient_user_id = ? ORDER BY ordered_at DESC", u).map(labView),
        encounters: rows("SELECT id, kind, professional_id, subjective, objective, assessment, plan, signed_at FROM encounters WHERE patient_user_id = ? AND signed_at IS NOT NULL ORDER BY signed_at DESC", u)
          .map(e => ({ ...e, professionalName: ctx.findProfessional(e.professional_id)?.name })),
      },
    });
  });

  app.post("/api/records/items", requireRole("patient"), (req, res) => {
    const type = req.body.type;
    const name = str(req.body.name, 120);
    if (!["allergy", "condition", "medication"].includes(type) || !name) return fail(res, 400, "Choose a type and enter a name.");
    const count = row("SELECT COUNT(*) AS n FROM health_items WHERE user_id = ?", req.user!.id).n;
    if (count >= 200) return fail(res, 400, "Too many entries.");
    const id = newId("hi");
    db.prepare("INSERT INTO health_items (id,user_id,type,name,detail,severity,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, type, name, str(req.body.detail, 300) || null, ["mild", "moderate", "severe"].includes(req.body.severity) ? req.body.severity : null, iso(), iso());
    res.status(201).json({ status: "success", data: { id } });
  });

  app.delete("/api/records/items/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("DELETE FROM health_items WHERE id = ? AND user_id = ?").run(req.params.id, req.user!.id);
    if (!r.changes) return fail(res, 404, "Entry not found.");
    res.json({ status: "success" });
  });

  app.post("/api/records/vitals", requireRole("patient"), (req, res) => {
    const spec = VITAL_KINDS[req.body.kind];
    if (!spec) return fail(res, 400, "Unknown reading type.");
    const v1 = Number(req.body.value1), v2 = spec.two ? Number(req.body.value2) : null;
    if (!(v1 >= spec.min && v1 <= spec.max)) return fail(res, 400, "That value looks wrong. Please check it.");
    if (spec.two && !(v2! >= spec.min2! && v2! <= spec.max2!)) return fail(res, 400, "The second value looks wrong. Please check it.");
    const id = newId("vt");
    db.prepare("INSERT INTO vitals (id,user_id,ts,kind,value1,value2,unit,note) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, iso(), req.body.kind, v1, v2, spec.unit, str(req.body.note, 200) || null);
    res.status(201).json({ status: "success", data: { id, flag: vitalFlag(req.body.kind, v1, v2) } });
  });

  app.delete("/api/records/vitals/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("DELETE FROM vitals WHERE id = ? AND user_id = ?").run(req.params.id, req.user!.id);
    if (!r.changes) return fail(res, 404, "Reading not found.");
    res.json({ status: "success" });
  });

  // Sharing: patient chooses which practitioners they have seen can read the record
  app.post("/api/records/grants", requireRole("patient"), (req, res) => {
    const professionalId = str(req.body.professionalId, 60);
    if (!verifiedPro(professionalId)) return fail(res, 404, "Practitioner not found.");
    if (!patientHasRelationTo(req.user!.id, professionalId)) return fail(res, 403, "You can only share your record with practitioners you have booked or consulted.");
    const days = Math.min(90, Math.max(1, Number(req.body.days) || 30));
    createGrant(req.user!.id, professionalId, "manual", null, days);
    audit(req, "record.grant", { target: ["professional", professionalId] });
    res.status(201).json({ status: "success" });
  });

  app.delete("/api/records/grants/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("UPDATE record_grants SET revoked_at = ? WHERE id = ? AND patient_user_id = ? AND revoked_at IS NULL").run(iso(), req.params.id, req.user!.id);
    if (!r.changes) return fail(res, 404, "Not found.");
    audit(req, "record.revoke", { target: ["grant", req.params.id] });
    res.json({ status: "success" });
  });

  // =========================================================
  // Practitioner: clinical workspace for one booking/consult
  // =========================================================
  app.get("/api/clinical/context/:kind/:refId", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, req.params.kind, req.params.refId);
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const pid = req.user!.profileId!;
    const shared = hasGrant(rel.patientUserId, pid);
    let record: any = null;
    if (shared) {
      audit(req, "record.view", { target: ["patient", rel.patientUserId] });
      record = {
        ...patientSnapshot(rel.patientUserId),
        vitals: rows("SELECT ts, kind, value1, value2, unit FROM vitals WHERE user_id = ? ORDER BY ts DESC LIMIT 20", rel.patientUserId),
        activePrescriptions: rows("SELECT id, items, issued_at, professional_id FROM prescriptions WHERE patient_user_id = ? AND status = 'active' AND valid_until > ?", rel.patientUserId, iso())
          .map(r => ({ issuedAt: r.issued_at, items: JSON.parse(r.items).map((i: any) => i.name) })),
        labResults: rows("SELECT o.id, o.tests, o.resulted_at, o.result_document_id FROM lab_orders o WHERE o.patient_user_id = ? AND o.result_document_id IS NOT NULL ORDER BY o.resulted_at DESC LIMIT 10", rel.patientUserId),
      };
    }
    const encounter = row("SELECT * FROM encounters WHERE kind = ? AND ref_id = ?", rel.kind, rel.refId);
    res.json({
      status: "success",
      data: {
        patient: { id: rel.patientUserId, name: userName(rel.patientUserId) },
        recordShared: shared,
        record,
        encounter: encounter ? { subjective: encounter.subjective, objective: encounter.objective, assessment: encounter.assessment, plan: encounter.plan, signedAt: encounter.signed_at } : null,
        prescriptions: rows("SELECT * FROM prescriptions WHERE kind = ? AND ref_id = ? AND professional_id = ? ORDER BY issued_at DESC", rel.kind, rel.refId, pid).map(r => rxView(r)),
        certificates: rows("SELECT * FROM certificates WHERE patient_user_id = ? AND professional_id = ? ORDER BY issued_at DESC", rel.patientUserId, pid).map(certView),
        referrals: rows("SELECT * FROM referrals WHERE patient_user_id = ? AND from_professional_id = ? ORDER BY issued_at DESC", rel.patientUserId, pid).map(refView),
        labOrders: rows("SELECT * FROM lab_orders WHERE patient_user_id = ? AND professional_id = ? ORDER BY ordered_at DESC", rel.patientUserId, pid).map(labView),
      },
    });
  });

  // ---------- SOAP notes ----------
  app.put("/api/encounters/:kind/:refId", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, req.params.kind, req.params.refId);
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const f = (k: string) => str(req.body[k], 4000);
    const existing = row("SELECT * FROM encounters WHERE kind = ? AND ref_id = ?", rel.kind, rel.refId);
    if (existing?.signed_at) return fail(res, 409, "This note is signed and can no longer be edited.");
    if (existing) {
      db.prepare("UPDATE encounters SET subjective=?, objective=?, assessment=?, plan=?, updated_at=? WHERE id=?").run(f("subjective"), f("objective"), f("assessment"), f("plan"), iso(), existing.id);
    } else {
      db.prepare("INSERT INTO encounters (id,kind,ref_id,patient_user_id,professional_id,subjective,objective,assessment,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .run(newId("enc"), rel.kind, rel.refId, rel.patientUserId, req.user!.profileId, f("subjective"), f("objective"), f("assessment"), f("plan"), iso(), iso());
    }
    res.json({ status: "success" });
  });

  app.post("/api/encounters/:kind/:refId/sign", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, req.params.kind, req.params.refId);
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const e = row("SELECT * FROM encounters WHERE kind = ? AND ref_id = ?", rel.kind, rel.refId);
    if (!e) return fail(res, 400, "Write the note first.");
    if (e.signed_at) return fail(res, 409, "Already signed.");
    if (!e.assessment || !e.plan) return fail(res, 400, "Assessment and plan are required to sign.");
    db.prepare("UPDATE encounters SET signed_at = ? WHERE id = ?").run(iso(), e.id);
    // A signed note completes the visit, which also unlocks the patient's review.
    if (rel.kind === "booking") ctx.completeBooking(rel.refId);
    audit(req, "encounter.sign", { target: ["encounter", e.id] });
    notify(rel.patientUserId, "Consultation summary available", "Your doctor added a summary to your health record.");
    res.json({ status: "success" });
  });

  // ---------- prescriptions ----------
  interface RxItem { name: string; strength: string; form: string; dose: string; frequency: string; durationDays: number; quantity: number; instructions: string }
  const parseItems = (raw: unknown): RxItem[] | string => {
    if (!Array.isArray(raw) || raw.length === 0) return "Add at least one medicine.";
    if (raw.length > 12) return "A prescription can have at most 12 medicines.";
    const out: RxItem[] = [];
    for (const it of raw) {
      const item = {
        name: str(it?.name, 100), strength: str(it?.strength, 40), form: str(it?.form, 30), dose: str(it?.dose, 60),
        frequency: str(it?.frequency, 60), durationDays: Math.trunc(Number(it?.durationDays)), quantity: Math.trunc(Number(it?.quantity)), instructions: str(it?.instructions, 200),
      };
      if (!item.name || !item.dose || !item.frequency) return "Every medicine needs a name, dose and frequency.";
      if (!(item.durationDays >= 1 && item.durationDays <= 90)) return `Duration for ${item.name} must be 1 to 90 days.`;
      if (!(item.quantity >= 1 && item.quantity <= 999)) return `Quantity for ${item.name} must be 1 to 999.`;
      out.push(item);
    }
    return out;
  };

  const safety = (patientUserId: string, professionalId: string, items: RxItem[]) => {
    const shared = hasGrant(patientUserId, professionalId);
    const snap = shared ? patientSnapshot(patientUserId) : { allergies: [], medications: [], conditions: [] };
    const warnings = checkPrescription(items.map(i => i.name), {
      allergies: snap.allergies.map((a: any) => a.name), currentMedications: snap.medications.map((m: any) => m.name),
    });
    return { shared, warnings };
  };

  app.post("/api/prescriptions/check", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const items = parseItems(req.body.items);
    if (typeof items === "string") return fail(res, 400, items);
    const { shared, warnings } = safety(rel.patientUserId, req.user!.profileId!, items);
    res.json({ status: "success", data: { recordShared: shared, warnings, unknown: items.filter(i => !findDrug(i.name) && !isRestricted(i.name)).map(i => i.name) } });
  });

  app.post("/api/prescriptions", requireRole("practitioner"), (req, res) => {
    const pro = verifiedPro(req.user!.profileId);
    if (!pro || pro.role !== "doctor") return fail(res, 403, "Only verified doctors can issue prescriptions.");
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const diagnosis = str(req.body.diagnosis, 300);
    if (!diagnosis) return fail(res, 400, "A diagnosis is required.");
    const items = parseItems(req.body.items);
    if (typeof items === "string") return fail(res, 400, items);

    const { shared, warnings } = safety(rel.patientUserId, pro.id, items);
    // Controlled medicines can never be e-prescribed.
    if (warnings.some(w => w.type === "restricted")) return res.status(422).json({ status: "error", message: "A controlled medicine cannot be e-prescribed.", data: { warnings } });
    const blocked = warnings.filter(w => w.severity === "contraindicated");
    if (blocked.length) return res.status(422).json({ status: "error", message: "This combination is contraindicated and cannot be issued.", data: { warnings } });
    // Major warnings need an explicit reason per warning.
    const overrides: Record<string, string> = {};
    for (const o of Array.isArray(req.body.overrides) ? req.body.overrides : []) if (o?.key && str(o.reason, 300).length >= 5) overrides[String(o.key)] = str(o.reason, 300);
    const unacknowledged = warnings.filter(w => w.severity === "major" && !overrides[w.key]);
    if (unacknowledged.length) return res.status(422).json({ status: "error", message: "Give a reason for each major warning to continue.", data: { warnings, needOverride: unacknowledged.map(w => w.key) } });
    // Without the patient's shared record the doctor must attest they checked allergies and current medicines.
    if (!shared && req.body.attestedAllergyCheck !== true) {
      return res.status(422).json({ status: "error", message: "The patient has not shared their record. Confirm you have asked about allergies and current medicines.", data: { needAttestation: true, warnings } });
    }

    const days = Math.min(90, Math.max(1, Math.trunc(Number(req.body.validDays)) || 30));
    const id = newId("rx");
    const code = newCode();
    const issuedAt = iso();
    const validUntil = new Date(Date.now() + days * 86400_000).toISOString();
    const record = {
      id, code, patient_user_id: rel.patientUserId, professional_id: pro.id, issued_at: issuedAt, valid_until: validUntil, diagnosis, items: JSON.stringify(items),
    };
    const signature = sign(rxPayload(record));
    db.prepare(
      `INSERT INTO prescriptions (id,code,patient_user_id,professional_id,kind,ref_id,items,diagnosis,notes,issued_at,valid_until,signature,warnings,record_checked)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(id, code, rel.patientUserId, pro.id, rel.kind, rel.refId, record.items, diagnosis, str(req.body.notes, 500) || null, issuedAt, validUntil, signature,
      JSON.stringify({ warnings, overrides }), shared ? 1 : 0);
    notify(rel.patientUserId, "New prescription", `${pro.name} issued a prescription. Open Health Record to view it or send it to a pharmacy.`);
    audit(req, "prescription.issue", { target: ["prescription", id], details: { items: items.length, overridden: Object.keys(overrides).length } });
    res.status(201).json({ status: "success", data: { id, code } });
  });

  app.post("/api/prescriptions/:id/cancel", requireRole("practitioner"), (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND professional_id = ?", req.params.id, req.user!.profileId);
    if (!r) return fail(res, 404, "Prescription not found.");
    if (r.status !== "active") return fail(res, 409, "Only active prescriptions can be cancelled.");
    const reason = str(req.body.reason, 300);
    if (!reason) return fail(res, 400, "A reason is required.");
    db.prepare("UPDATE prescriptions SET status='cancelled', cancelled_reason=? WHERE id=?").run(reason, r.id);
    notify(r.patient_user_id, "A prescription was cancelled", reason);
    audit(req, "prescription.cancel", { target: ["prescription", r.id] });
    res.json({ status: "success" });
  });

  const effectiveStatus = (r: any) => (r.status === "active" && Date.parse(r.valid_until) < Date.now() ? "expired" : r.status);
  function rxView(r: any) {
    const prof = ctx.findProfessional(r.professional_id);
    return {
      id: r.id, code: r.code, diagnosis: r.diagnosis, items: JSON.parse(r.items), notes: r.notes, issuedAt: r.issued_at, validUntil: r.valid_until,
      status: effectiveStatus(r), pharmacyId: r.pharmacy_id, dispensedAt: r.dispensed_at,
      doctor: prof ? { name: prof.name, licenseNumber: prof.licenseNumber } : null,
    };
  }

  // Patient: send a prescription to a partner pharmacy
  app.get("/api/pharmacies", requireAuth, (_req, res) => {
    res.json({ status: "success", data: rows("SELECT id, name, address, phone FROM pharmacies WHERE active = 1 ORDER BY name") });
  });
  app.post("/api/prescriptions/:id/send", requireRole("patient"), (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND patient_user_id = ?", req.params.id, req.user!.id);
    if (!r) return fail(res, 404, "Prescription not found.");
    if (effectiveStatus(r) !== "active") return fail(res, 409, "This prescription can no longer be sent.");
    const ph = row("SELECT id, name FROM pharmacies WHERE id = ? AND active = 1", str(req.body.pharmacyId, 60));
    if (!ph) return fail(res, 404, "Pharmacy not found.");
    db.prepare("UPDATE prescriptions SET pharmacy_id = ? WHERE id = ?").run(ph.id, r.id);
    audit(req, "prescription.send", { target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success", message: `Prescription assigned to ${ph.name}. Show the pharmacy the code ${r.code}.` });
  });

  // Public check: is this prescription genuine and still valid? (no patient details)
  const verifyLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
  app.get("/api/verify/rx/:code", verifyLimiter, (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str(req.params.code, 20).toUpperCase());
    if (!r) return res.json({ status: "success", data: { found: false } });
    const intact = same(sign(rxPayload(r)), r.signature);
    const prof = ctx.findProfessional(r.professional_id);
    const st = effectiveStatus(r);
    res.json({ status: "success", data: {
      found: true, valid: intact && st === "active", status: intact ? st : "invalid", issuedAt: r.issued_at, validUntil: r.valid_until, itemCount: JSON.parse(r.items).length,
      prescriber: prof ? { name: prof.name, licenseNumber: prof.licenseNumber, stillVerified: prof.verificationStatus === VerificationStatus.VERIFIED } : null,
    } });
  });

  // Pharmacy: with code + their PIN, see what to dispense and mark it dispensed (once)
  const pharmacyLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });
  const pharmacyAuth = (body: any) => {
    const ph = row("SELECT * FROM pharmacies WHERE id = ? AND active = 1", str(body.pharmacyId, 60));
    // verify against a dummy hash when unknown so timing does not reveal which ids exist
    const ok = verifyPassword(str(body.pin, 40), ph?.pin_hash ?? DUMMY_PIN_HASH);
    return ph && ok ? ph : null;
  };
  const DUMMY_PIN_HASH = hashPassword("000000-dummy");

  app.post("/api/pharmacy/lookup", pharmacyLimiter, (req, res) => {
    const ph = pharmacyAuth(req.body);
    if (!ph) return fail(res, 401, "Invalid pharmacy ID or PIN.");
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str(req.body.code, 20).toUpperCase());
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail(res, 404, "No valid prescription with that code.");
    audit(null, "pharmacy.lookup", { actor: null, target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    const prof = ctx.findProfessional(r.professional_id);
    res.json({ status: "success", data: {
      id: r.id, status: effectiveStatus(r), issuedAt: r.issued_at, validUntil: r.valid_until, patientName: userName(r.patient_user_id),
      items: JSON.parse(r.items), notes: r.notes, dispensedAt: r.dispensed_at,
      prescriber: prof ? { name: prof.name, licenseNumber: prof.licenseNumber, stillVerified: prof.verificationStatus === VerificationStatus.VERIFIED } : null,
    } });
  });

  app.post("/api/pharmacy/dispense", pharmacyLimiter, (req, res) => {
    const ph = pharmacyAuth(req.body);
    if (!ph) return fail(res, 401, "Invalid pharmacy ID or PIN.");
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str(req.body.code, 20).toUpperCase());
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail(res, 404, "No valid prescription with that code.");
    if (effectiveStatus(r) !== "active") return fail(res, 409, `This prescription is ${effectiveStatus(r)}.`);
    const changed = db.prepare("UPDATE prescriptions SET status='dispensed', dispensed_at=?, dispensed_by=? WHERE id=? AND status='active'").run(iso(), ph.id, r.id).changes;
    if (!changed) return fail(res, 409, "Already dispensed.");
    notify(r.patient_user_id, "Prescription dispensed", `${ph.name} dispensed your prescription.`);
    audit(null, "pharmacy.dispense", { actor: null, target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success" });
  });

  // Admin: pharmacy directory
  app.get("/api/admin/pharmacies", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: rows("SELECT id, name, address, phone, active, created_at FROM pharmacies ORDER BY created_at DESC") });
  });
  app.post("/api/admin/pharmacies", requireRole("admin"), (req, res) => {
    const name = str(req.body.name, 120), address = str(req.body.address, 250);
    if (!name || !address) return fail(res, 400, "Name and address are required.");
    const id = newId("ph");
    const pin = String(crypto.randomInt(100000, 999999));
    db.prepare("INSERT INTO pharmacies (id,name,address,phone,pin_hash,created_at) VALUES (?,?,?,?,?,?)").run(id, name, address, str(req.body.phone, 30) || null, hashPassword(pin), iso());
    audit(req, "pharmacy.create", { target: ["pharmacy", id] });
    res.status(201).json({ status: "success", data: { id, pin }, message: "Give the pharmacy its ID and PIN. The PIN is shown only once." });
  });
  app.post("/api/admin/pharmacies/:id/active", requireRole("admin"), (req, res) => {
    const r = db.prepare("UPDATE pharmacies SET active = ? WHERE id = ?").run(req.body.active === false ? 0 : 1, req.params.id);
    if (!r.changes) return fail(res, 404, "Pharmacy not found.");
    audit(req, "pharmacy.active", { target: ["pharmacy", req.params.id], details: { active: req.body.active !== false } });
    res.json({ status: "success" });
  });

  // ---------- medical certificates ----------
  function certView(c: any) {
    const prof = ctx.findProfessional(c.professional_id);
    return { id: c.id, code: c.code, fromDate: c.from_date, toDate: c.to_date, remarks: c.remarks, issuedAt: c.issued_at, doctor: prof ? { name: prof.name, licenseNumber: prof.licenseNumber } : null };
  }
  app.post("/api/certificates", requireRole("practitioner"), (req, res) => {
    const pro = verifiedPro(req.user!.profileId);
    if (!pro || pro.role !== "doctor") return fail(res, 403, "Only verified doctors can issue medical certificates.");
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const from = dateOnly(req.body.fromDate), to = dateOnly(req.body.toDate);
    if (!from || !to || to < from) return fail(res, 400, "Enter valid start and end dates.");
    const today = new Date().toISOString().slice(0, 10);
    const earliest = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);
    if (from < earliest) return fail(res, 400, "A certificate cannot start more than 3 days in the past.");
    const span = (Date.parse(to) - Date.parse(from)) / 86400_000 + 1;
    if (span > 14) return fail(res, 400, "Online certificates are limited to 14 days. Longer leave needs an in-person assessment.");
    void today;
    const id = newId("mc"), code = newCode(), issuedAt = iso();
    const c = { id, code, patient_user_id: rel.patientUserId, professional_id: pro.id, from_date: from, to_date: to, issued_at: issuedAt };
    db.prepare("INSERT INTO certificates (id,code,patient_user_id,professional_id,from_date,to_date,remarks,issued_at,signature) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, code, rel.patientUserId, pro.id, from, to, str(req.body.remarks, 200) || null, issuedAt, sign(certPayload(c)));
    notify(rel.patientUserId, "Medical certificate issued", `Valid ${from} to ${to}. Find it in your Health Record.`);
    audit(req, "certificate.issue", { target: ["certificate", id] });
    res.status(201).json({ status: "success", data: { id, code } });
  });
  app.get("/api/verify/cert/:code", verifyLimiter, (req, res) => {
    const c = row("SELECT * FROM certificates WHERE code = ?", str(req.params.code, 20).toUpperCase());
    if (!c) return res.json({ status: "success", data: { found: false } });
    const prof = ctx.findProfessional(c.professional_id);
    res.json({ status: "success", data: {
      found: true, valid: same(sign(certPayload(c)), c.signature), patient: maskName(userName(c.patient_user_id)),
      fromDate: c.from_date, toDate: c.to_date, issuedAt: c.issued_at,
      issuedBy: prof ? { name: prof.name, licenseNumber: prof.licenseNumber } : null,
    } });
  });

  // ---------- referrals ----------
  function refView(r: any) {
    const from = ctx.findProfessional(r.from_professional_id), to = r.to_professional_id ? ctx.findProfessional(r.to_professional_id) : null;
    return { id: r.id, toSpecialty: r.to_specialty, toProfessional: to ? { id: to.id, name: to.name } : null, reason: r.reason, urgency: r.urgency, issuedAt: r.issued_at, from: from?.name };
  }
  app.post("/api/referrals", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const toSpecialty = str(req.body.toSpecialty, 100), reason = str(req.body.reason, 1000);
    const toId = req.body.toProfessionalId ? str(req.body.toProfessionalId, 60) : null;
    if (!toSpecialty || reason.length < 10) return fail(res, 400, "Specialty and a reason (at least 10 characters) are required.");
    if (toId && !verifiedPro(toId)) return fail(res, 404, "The practitioner you chose is not available.");
    const urgency = ["routine", "soon", "urgent"].includes(req.body.urgency) ? req.body.urgency : "routine";
    const id = newId("ref");
    db.prepare("INSERT INTO referrals (id,patient_user_id,from_professional_id,to_specialty,to_professional_id,reason,urgency,issued_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, rel.patientUserId, req.user!.profileId, toSpecialty, toId, reason, urgency, iso());
    notify(rel.patientUserId, "You have a new referral", `Referral to ${toSpecialty} (${urgency}).`);
    audit(req, "referral.create", { target: ["referral", id] });
    res.status(201).json({ status: "success", data: { id } });
  });

  // ---------- lab orders ----------
  function labView(o: any) {
    return { id: o.id, tests: o.tests, notes: o.notes, status: o.status, orderedAt: o.ordered_at, resultDocumentId: o.result_document_id, resultedAt: o.resulted_at, doctor: ctx.findProfessional(o.professional_id)?.name };
  }
  app.post("/api/lab-orders", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail(res, 404, "No treatment relationship found.");
    const tests = str(req.body.tests, 500);
    if (!tests) return fail(res, 400, "List the tests to order.");
    const id = newId("lab");
    db.prepare("INSERT INTO lab_orders (id,patient_user_id,professional_id,tests,notes,ordered_at) VALUES (?,?,?,?,?,?)")
      .run(id, rel.patientUserId, req.user!.profileId, tests, str(req.body.notes, 300) || null, iso());
    notify(rel.patientUserId, "Lab tests requested", `${tests}. Upload your result in the Health Record when you have it.`);
    audit(req, "lab.order", { target: ["lab_order", id] });
    res.status(201).json({ status: "success", data: { id } });
  });

  return {
    labOrderOwner: (id: string) => (row("SELECT patient_user_id FROM lab_orders WHERE id = ?", id)?.patient_user_id as string) ?? null,
    onLabResult: (orderId: string, documentId: string) => {
      db.prepare("UPDATE lab_orders SET status='resulted', result_document_id=?, resulted_at=? WHERE id=?").run(documentId, iso(), orderId);
      const o = row("SELECT professional_id, patient_user_id FROM lab_orders WHERE id = ?", orderId);
      const acct = row("SELECT id FROM users WHERE profile_id = ?", o?.professional_id);
      if (acct) notify(acct.id, "Lab result uploaded", "A patient uploaded a lab result you ordered. Open the clinical workspace to view it.");
    },
    /** A practitioner may open a patient's lab result when the patient has shared their record with them. */
    canViewLabDocument: (user: { role: string; profileId: string | null }, doc: { owner_id: string; kind: string }) =>
      user.role === "practitioner" && !!user.profileId && doc.kind === "lab_result" && hasGrant(doc.owner_id, user.profileId),
  };
}

export type { Warning };
export { notifyAdmins };
