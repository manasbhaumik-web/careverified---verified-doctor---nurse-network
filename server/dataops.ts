import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Application } from "express";
import { db, dataDir } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { notify } from "./verification";

/**
 * Data operations behind the privacy notice:
 *  - transfer register: every processor, its country and the PDPA basis for any transfer outside Malaysia
 *  - erasure and retention: de-identify a patient on request, purge retained records after the retention period
 *  - breach register with notification deadlines
 *  - Terms of Service text
 *
 * Legal basis summaries come from law-firm commentary found on the web (Oct 2026), not from the Act itself:
 * confirm with Malaysian counsel. See docs/DATA_RESIDENCY.md and docs/BREACH_RESPONSE.md.
 */

// ---------- transfer register ----------
// PDPA s.129 as amended in 2024 (commentary): destination with substantially similar law (1A) or adequate protection (1B)
// backed by a Transfer Impact Assessment valid for 3 years, or an s.129(3) exception such as explicit consent or contract necessity.
export const TRANSFER_BASES = ["malaysia", "similar_law_tia", "adequate_protection_tia", "consent", "contract_necessity", "other_129_3"] as const;
export type TransferBasis = (typeof TRANSFER_BASES)[number];
const TIA_BASES: TransferBasis[] = ["similar_law_tia", "adequate_protection_tia"];
const TIA_VALID_YEARS = 3;

db.exec(`
CREATE TABLE IF NOT EXISTS data_processors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  country TEXT NOT NULL,
  basis TEXT,
  tia_date TEXT,
  basis_note TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  added_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS breach_incidents (
  id TEXT PRIMARY KEY,
  detected_at TEXT NOT NULL,
  reported_by TEXT,
  summary TEXT NOT NULL,
  data_types TEXT,
  affected_count INTEGER,
  severity TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'open',
  commissioner_due_at TEXT NOT NULL,
  commissioner_notified_at TEXT,
  subjects_required INTEGER,
  subjects_due_at TEXT NOT NULL,
  subjects_notified_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE TABLE IF NOT EXISTS erasure_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  executed_at TEXT NOT NULL,
  executed_by TEXT NOT NULL,
  summary TEXT NOT NULL
);
`);

const iso = () => new Date().toISOString();
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: any, code: number, message: string) => res.status(code).json({ status: "error", message });
const count = (sql: string, ...p: any[]) => (db.prepare(sql).get(...p) as any).n as number;

export interface Processor { id: string; name: string; purpose: string; country: string; basis: string | null; tiaDate: string | null; basisNote: string | null }
export const listProcessors = (): Processor[] =>
  db.prepare("SELECT id,name,purpose,country,basis,tia_date AS tiaDate,basis_note AS basisNote FROM data_processors WHERE active = 1 ORDER BY name").all() as any;

/** Problems with the transfer register. Empty = every processor outside Malaysia has a current basis. */
export function transferProblems(): string[] {
  const out: string[] = [];
  const procs = listProcessors();
  if (procs.length === 0) out.push("No processors are listed.");
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - TIA_VALID_YEARS);
  for (const p of procs) {
    if (p.country.toUpperCase() === "MY") continue;
    if (!p.basis || p.basis === "malaysia") { out.push(`${p.name} (${p.country}): no transfer basis recorded.`); continue; }
    if (TIA_BASES.includes(p.basis as TransferBasis)) {
      if (!p.tiaDate) out.push(`${p.name} (${p.country}): Transfer Impact Assessment date missing.`);
      else if (new Date(p.tiaDate) < cutoff) out.push(`${p.name} (${p.country}): Transfer Impact Assessment is older than ${TIA_VALID_YEARS} years.`);
    }
  }
  return out;
}

// ---------- retention ----------
/** Retention is only enforced once the period has been set deliberately (the default is a placeholder). */
export const retentionYearsSet = () => Number(process.env.RETENTION_YEARS) > 0;
const retentionYears = () => (retentionYearsSet() ? Number(process.env.RETENTION_YEARS) : 6);

const CLINICAL_TABLES: { table: string; col: string; ts: string }[] = [
  { table: "encounters", col: "patient_user_id", ts: "updated_at" },
  { table: "prescriptions", col: "patient_user_id", ts: "issued_at" },
  { table: "certificates", col: "patient_user_id", ts: "issued_at" },
  { table: "referrals", col: "patient_user_id", ts: "issued_at" },
  { table: "lab_orders", col: "patient_user_id", ts: "ordered_at" },
  { table: "consults", col: "patient_user_id", ts: "created_at" },
];

function lastClinicalActivity(userId: string): string | null {
  let latest: string | null = null;
  for (const t of CLINICAL_TABLES) {
    const r = db.prepare(`SELECT MAX(${t.ts}) AS m FROM ${t.table} WHERE ${t.col} = ?`).get(userId) as any;
    if (r?.m && (!latest || r.m > latest)) latest = r.m;
  }
  return latest;
}

const addYears = (isoStr: string, y: number) => { const d = new Date(isoStr); d.setFullYear(d.getFullYear() + y); return d.toISOString(); };

export interface DataOpsCtx {
  /** De-identify the user's data held outside SQL (patient profile, bookings) and delete their chat messages. */
  anonymiseJson: (userId: string) => { patientProfiles: number; bookings: number; chatMessages: number };
}

function erasurePlan(userId: string) {
  const u = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(userId) as any;
  if (!u) return { eligible: false, reason: "User not found." };
  if (u.status === "deleted") return { eligible: false, reason: "Already erased." };
  if (u.role !== "patient") return { eligible: false, reason: `Automatic erasure covers patients only. ${u.role} accounts need manual review (licence and regulatory records).` };
  const last = lastClinicalActivity(userId);
  const retainUntil = last ? addYears(last, retentionYears()) : null;
  return {
    eligible: true,
    delete: {
      sessions: count("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?", userId),
      notifications: count("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?", userId),
      selfRecordedHealthItems: count("SELECT COUNT(*) AS n FROM health_items WHERE user_id = ?", userId),
      vitals: count("SELECT COUNT(*) AS n FROM vitals WHERE user_id = ?", userId),
      recordAccessGrants: count("SELECT COUNT(*) AS n FROM record_grants WHERE patient_user_id = ?", userId),
      uploadedDocuments: count("SELECT COUNT(*) AS n FROM documents WHERE owner_id = ? AND kind != 'lab_result'", userId),
      sosEvents: count("SELECT COUNT(*) AS n FROM emergency_events WHERE user_id = ?", userId),
    },
    deIdentify: ["account name, email and password", "patient profile (IC number, phone, emergency contact, conditions, allergies)", "name, phone and email on bookings", "chat messages"],
    retain: {
      note: "Clinical records stay (de-identified account) until the retention period ends.",
      encounters: count("SELECT COUNT(*) AS n FROM encounters WHERE patient_user_id = ?", userId),
      prescriptions: count("SELECT COUNT(*) AS n FROM prescriptions WHERE patient_user_id = ?", userId),
      certificates: count("SELECT COUNT(*) AS n FROM certificates WHERE patient_user_id = ?", userId),
      referrals: count("SELECT COUNT(*) AS n FROM referrals WHERE patient_user_id = ?", userId),
      labOrdersAndResults: count("SELECT COUNT(*) AS n FROM lab_orders WHERE patient_user_id = ?", userId),
      consultations: count("SELECT COUNT(*) AS n FROM consults WHERE patient_user_id = ?", userId),
      payments: count("SELECT COUNT(*) AS n FROM payments WHERE user_id = ?", userId),
      auditLogAndConsentProof: "kept",
      retainUntil,
      retentionConfirmed: retentionYearsSet(),
    },
    manualReview: {
      supportTickets: count("SELECT COUNT(*) AS n FROM tickets WHERE user_id = ?", userId),
      note: "Support tickets, complaints and reviews are not changed automatically.",
    },
  };
}

function executeErasure(userId: string, actorId: string, ctx: DataOpsCtx) {
  const plan = erasurePlan(userId);
  if (!plan.eligible) throw new Error(plan.reason);
  // Delete uploaded files first (rows go in the transaction below); lab results are clinical and stay.
  const docs = db.prepare("SELECT stored_name FROM documents WHERE owner_id = ? AND kind != 'lab_result'").all(userId) as any[];
  for (const d of docs) { try { fs.unlinkSync(path.join(dataDir, "uploads", d.stored_name)); } catch { /* already gone */ } }
  const json = ctx.anonymiseJson(userId);
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM health_items WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM vitals WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM record_grants WHERE patient_user_id = ?").run(userId);
    db.prepare("DELETE FROM documents WHERE owner_id = ? AND kind != 'lab_result'").run(userId);
    db.prepare("DELETE FROM emergency_events WHERE user_id = ?").run(userId);
    db.prepare("UPDATE users SET name = 'Deleted user', email = ?, password_hash = 'deleted', avatar_url = NULL, status = 'deleted' WHERE id = ?")
      .run(`deleted-${userId}@deleted.invalid`, userId);
    db.prepare("INSERT INTO erasure_log (id,user_id,executed_at,executed_by,summary) VALUES (?,?,?,?,?)")
      .run(newId("ers"), userId, iso(), actorId, JSON.stringify({ deleted: (plan as any).delete, json }));
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return { plan, json };
}

/** Erased patients whose clinical records are past the retention period. */
function purgeCandidates() {
  if (!retentionYearsSet()) return [];
  const erased = db.prepare("SELECT id FROM users WHERE status = 'deleted' AND role = 'patient'").all() as any[];
  const cutoff = addYears(iso(), -retentionYears());
  return erased
    .map(r => ({ userId: r.id as string, last: lastClinicalActivity(r.id) }))
    .filter(r => r.last !== null && r.last < cutoff);
}

function purgeRetained(userId: string) {
  const consultIds = (db.prepare("SELECT id FROM consults WHERE patient_user_id = ?").all(userId) as any[]).map(r => r.id);
  db.exec("BEGIN");
  try {
    for (const id of consultIds) {
      db.prepare("DELETE FROM consult_messages WHERE consult_id = ?").run(id);
      db.prepare("DELETE FROM consult_signals WHERE consult_id = ?").run(id);
      db.prepare("DELETE FROM consult_declines WHERE consult_id = ?").run(id);
    }
    for (const t of CLINICAL_TABLES) db.prepare(`DELETE FROM ${t.table} WHERE ${t.col} = ?`).run(userId);
    // lab result documents belong to the clinical record
    const labs = db.prepare("SELECT stored_name FROM documents WHERE owner_id = ? AND kind = 'lab_result'").all(userId) as any[];
    for (const d of labs) { try { fs.unlinkSync(path.join(dataDir, "uploads", d.stored_name)); } catch { /* already gone */ } }
    db.prepare("DELETE FROM documents WHERE owner_id = ?").run(userId);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

// ---------- breach deadlines (internal targets) ----------
// The Act's duty is to notify the Commissioner "as soon as practicable"; 72 hours is the commonly cited benchmark, and
// affected individuals within 7 days where significant harm is likely (commentary differs). Treated as internal targets.
const COMMISSIONER_HOURS = 72;
const SUBJECTS_DAYS = 7;

// ---------- Terms of Service (draft) ----------
export const TERMS_VERSION = "2026-11";
function terms(lang: "en" | "ms") {
  const company = process.env.PRIVACY_CONTROLLER_NAME || "MedCred Healthcare Network Sdn Bhd";
  const en = [
    ["About the service", `${company} ("we") runs an online network that lets patients find practitioners whose professional registration has been checked, consult them online or in person, and manage health records. We are a platform: practitioners are independent professionals responsible for the care they give.`],
    ["Not for emergencies", "The service is not an emergency service. In an emergency call 999 (112 from a mobile phone) or your local emergency number."],
    ["Online consultations", "Online consultations suit follow-up care and minor problems. A first visit for a long-term condition may need an in-person appointment. Medical certificates are not issued after an online consultation alone, and some medicines cannot be prescribed online. Practitioners decide what is clinically appropriate."],
    ["Practitioner verification", "We check each practitioner's registration against the relevant regulator's register and record how it was checked. A verified badge means that check was done on the date shown, not that we guarantee the quality of care. Report concerns through the app."],
    ["Your account", "Give accurate information, keep your password private, and tell us if you suspect misuse. You must be 18 or older, or use the service through a parent or guardian."],
    ["Payments and refunds", "Fees are shown before you pay. An instant consultation is refunded automatically if no practitioner joins within 10 minutes. Appointment cancellations follow the policy shown at booking."],
    ["Acceptable use", "Do not misuse the service, share another person's account, upload unlawful or harmful content, or try to bypass security or verification."],
    ["Your data", "How we use personal data is explained in the Privacy Notice, which forms part of these terms."],
    ["Limits of liability", "To the extent the law allows, we are not liable for clinical decisions made by practitioners or for losses we could not reasonably foresee. Nothing here limits liability that cannot be limited by law. (Counsel to review.)"],
    ["Changes and law", "We may update these terms and will ask you to accept material changes. These terms are governed by the laws of Malaysia."],
  ];
  const ms = [
    ["Mengenai perkhidmatan", `${company} ("kami") mengendalikan rangkaian dalam talian yang membolehkan pesakit mencari pengamal yang pendaftaran profesionalnya telah disemak, berkonsultasi secara dalam talian atau bersemuka, dan mengurus rekod kesihatan. Kami ialah platform: pengamal ialah profesional bebas yang bertanggungjawab atas penjagaan yang mereka berikan.`],
    ["Bukan untuk kecemasan", "Perkhidmatan ini bukan perkhidmatan kecemasan. Dalam kecemasan, hubungi 999 (112 dari telefon bimbit) atau nombor kecemasan tempatan anda."],
    ["Konsultasi dalam talian", "Konsultasi dalam talian sesuai untuk penjagaan susulan dan masalah kecil. Lawatan pertama bagi keadaan jangka panjang mungkin memerlukan temujanji bersemuka. Sijil cuti sakit tidak dikeluarkan selepas konsultasi dalam talian sahaja, dan sesetengah ubat tidak boleh dipreskripsi dalam talian. Pengamal menentukan perkara yang sesuai dari segi klinikal."],
    ["Pengesahan pengamal", "Kami menyemak pendaftaran setiap pengamal dengan daftar pengawal selia berkaitan dan merekodkan cara semakan dibuat. Lencana disahkan bermaksud semakan itu dibuat pada tarikh yang ditunjukkan, bukan jaminan mutu penjagaan. Laporkan sebarang kebimbangan melalui aplikasi."],
    ["Akaun anda", "Berikan maklumat yang tepat, rahsiakan kata laluan, dan beritahu kami jika anda mengesyaki penyalahgunaan. Anda mesti berumur 18 tahun ke atas, atau menggunakan perkhidmatan melalui ibu bapa atau penjaga."],
    ["Bayaran dan bayaran balik", "Yuran dipaparkan sebelum anda membayar. Konsultasi segera dibayar balik secara automatik jika tiada pengamal menyertai dalam masa 10 minit. Pembatalan temujanji mengikut dasar yang dipaparkan semasa tempahan."],
    ["Penggunaan yang boleh diterima", "Jangan salah guna perkhidmatan, berkongsi akaun orang lain, memuat naik kandungan yang menyalahi undang-undang atau berbahaya, atau cuba memintas keselamatan atau pengesahan."],
    ["Data anda", "Cara kami menggunakan data peribadi dijelaskan dalam Notis Privasi, yang menjadi sebahagian daripada terma ini."],
    ["Had liabiliti", "Setakat yang dibenarkan undang-undang, kami tidak bertanggungjawab atas keputusan klinikal pengamal atau kerugian yang tidak dapat diramal dengan munasabah. Tiada apa-apa di sini mengehadkan liabiliti yang tidak boleh dihadkan oleh undang-undang. (Untuk disemak peguam.)"],
    ["Perubahan dan undang-undang", "Kami boleh mengemas kini terma ini dan akan meminta anda menerima perubahan penting. Terma ini ditadbir oleh undang-undang Malaysia."],
  ];
  return (lang === "ms" ? ms : en).map(([heading, body]) => ({ heading, body }));
}

export function registerDataOps(app: Application, ctx: DataOpsCtx) {
  // ----- Terms of Service -----
  app.get("/api/legal/terms", (req, res) => {
    const lang = req.query.lang === "ms" ? "ms" : "en";
    res.json({ status: "success", data: { version: TERMS_VERSION, lang, draft: true, title: lang === "ms" ? "Terma Perkhidmatan" : "Terms of Service", sections: terms(lang) } });
  });

  // ----- Transfer register -----
  app.get("/api/admin/processors", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: { processors: listProcessors(), bases: TRANSFER_BASES, problems: transferProblems() } });
  });

  const readProcessor = (b: any) => {
    const name = str(b.name, 100), purpose = str(b.purpose, 200), country = str(b.country, 2).toUpperCase();
    if (!name || !purpose || !/^[A-Z]{2}$/.test(country)) return "Name, purpose and a 2-letter country code are required.";
    const basis = b.basis ? str(b.basis, 40) : null;
    if (basis && !(TRANSFER_BASES as readonly string[]).includes(basis)) return "Unknown transfer basis.";
    const tiaDate = b.tiaDate ? str(b.tiaDate, 10) : null;
    if (tiaDate && !/^\d{4}-\d{2}-\d{2}$/.test(tiaDate)) return "TIA date must be YYYY-MM-DD.";
    return { name, purpose, country, basis, tiaDate, basisNote: str(b.basisNote, 500) || null };
  };

  app.post("/api/admin/processors", requireRole("admin"), (req, res) => {
    const p = readProcessor(req.body);
    if (typeof p === "string") return fail(res, 400, p);
    const id = newId("prc");
    db.prepare("INSERT INTO data_processors (id,name,purpose,country,basis,tia_date,basis_note,added_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, p.name, p.purpose, p.country, p.basis, p.tiaDate, p.basisNote, iso());
    audit(req, "processor.add", { target: ["processor", id], details: { country: p.country } });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.put("/api/admin/processors/:id", requireRole("admin"), (req, res) => {
    const p = readProcessor(req.body);
    if (typeof p === "string") return fail(res, 400, p);
    const r = db.prepare("UPDATE data_processors SET name=?,purpose=?,country=?,basis=?,tia_date=?,basis_note=? WHERE id=? AND active=1")
      .run(p.name, p.purpose, p.country, p.basis, p.tiaDate, p.basisNote, req.params.id);
    if (!r.changes) return fail(res, 404, "Processor not found.");
    audit(req, "processor.update", { target: ["processor", req.params.id] });
    res.json({ status: "success" });
  });

  app.delete("/api/admin/processors/:id", requireRole("admin"), (req, res) => {
    const r = db.prepare("UPDATE data_processors SET active = 0 WHERE id = ?").run(req.params.id);
    if (!r.changes) return fail(res, 404, "Processor not found.");
    audit(req, "processor.remove", { target: ["processor", req.params.id] });
    res.json({ status: "success" });
  });

  // ----- Erasure of a data-subject deletion request -----
  app.get("/api/admin/data-requests/:id/erasure-plan", requireRole("admin"), (req, res) => {
    const r = db.prepare("SELECT * FROM data_requests WHERE id = ?").get(req.params.id) as any;
    if (!r) return fail(res, 404, "Request not found.");
    if (!["deletion", "withdrawal"].includes(r.kind)) return fail(res, 400, "Only deletion or withdrawal requests can be erased.");
    res.json({ status: "success", data: erasurePlan(r.user_id) });
  });

  app.post("/api/admin/data-requests/:id/erase", requireRole("admin"), (req, res) => {
    const r = db.prepare("SELECT * FROM data_requests WHERE id = ?").get(req.params.id) as any;
    if (!r) return fail(res, 404, "Request not found.");
    if (r.status !== "open") return fail(res, 409, "This request is already closed.");
    if (!["deletion", "withdrawal"].includes(r.kind)) return fail(res, 400, "Only deletion or withdrawal requests can be erased.");
    if (req.body.confirm !== true) return fail(res, 400, "Confirm the erasure explicitly (confirm: true). It cannot be undone.");
    try {
      const out = executeErasure(r.user_id, req.user!.id, ctx);
      const note = `Account de-identified. Clinical records are retained until ${(out.plan as any).retain.retainUntil ?? "no records held"} (period ${retentionYears()} years).`;
      db.prepare("UPDATE data_requests SET status='completed', resolved_at=?, resolved_by=?, resolution_note=? WHERE id=?").run(iso(), req.user!.id, note, r.id);
      audit(req, "erasure.execute", { target: ["user", r.user_id], details: { request: r.id } });
      res.json({ status: "success", message: note });
    } catch (e: any) {
      fail(res, 409, e.message || "Erasure failed.");
    }
  });

  // ----- Retention -----
  app.get("/api/admin/retention", requireRole("admin"), (_req, res) => {
    res.json({
      status: "success",
      data: {
        years: retentionYears(), confirmed: retentionYearsSet(),
        note: retentionYearsSet() ? "Retention is enforced." : "RETENTION_YEARS is not set: the default of 6 is a placeholder and nothing will be purged until you set the period (confirm it with counsel).",
        eligibleForPurge: purgeCandidates().length,
        pendingErasureRequests: count("SELECT COUNT(*) AS n FROM data_requests WHERE status = 'open' AND kind IN ('deletion','withdrawal')"),
      },
    });
  });

  app.post("/api/admin/retention/purge", requireRole("admin"), (req, res) => {
    if (!retentionYearsSet()) return fail(res, 409, "Set RETENTION_YEARS deliberately before purging anything.");
    if (req.body.confirm !== true) return fail(res, 400, "Confirm the purge explicitly (confirm: true). It cannot be undone.");
    const list = purgeCandidates();
    for (const c of list) purgeRetained(c.userId);
    audit(req, "retention.purge", { details: { users: list.length, years: retentionYears() } });
    res.json({ status: "success", message: `Purged retained clinical records for ${list.length} erased patient(s).` });
  });

  // ----- Breach register -----
  const breachView = (b: any) => ({
    id: b.id, detectedAt: b.detected_at, summary: b.summary, dataTypes: b.data_types, affectedCount: b.affected_count, severity: b.severity,
    status: b.status, commissionerDueAt: b.commissioner_due_at, commissionerNotifiedAt: b.commissioner_notified_at,
    subjectsRequired: b.subjects_required === null ? null : b.subjects_required === 1, subjectsDueAt: b.subjects_due_at,
    subjectsNotifiedAt: b.subjects_notified_at, notes: b.notes, closedAt: b.closed_at,
    commissionerOverdue: !b.commissioner_notified_at && b.status !== "closed" && b.commissioner_due_at < iso(),
    subjectsOverdue: b.subjects_required === 1 && !b.subjects_notified_at && b.status !== "closed" && b.subjects_due_at < iso(),
  });

  app.get("/api/admin/breaches", requireRole("admin"), (_req, res) => {
    res.json({
      status: "success",
      data: {
        incidents: (db.prepare("SELECT * FROM breach_incidents ORDER BY detected_at DESC LIMIT 200").all() as any[]).map(breachView),
        targets: { commissionerHours: COMMISSIONER_HOURS, subjectsDays: SUBJECTS_DAYS, note: "Internal targets. The Act requires notifying the Commissioner as soon as practicable; confirm timings with counsel. Keep this register for at least 2 years (commentary)." },
      },
    });
  });

  app.post("/api/admin/breaches", requireRole("admin"), (req, res) => {
    const summary = str(req.body.summary, 1000);
    if (summary.length < 10) return fail(res, 400, "Describe what happened (at least 10 characters).");
    const detected = req.body.detectedAt && !Number.isNaN(Date.parse(req.body.detectedAt)) ? new Date(req.body.detectedAt) : new Date();
    const severity = ["low", "medium", "high", "unknown"].includes(req.body.severity) ? req.body.severity : "unknown";
    const id = newId("brc");
    db.prepare(
      `INSERT INTO breach_incidents (id,detected_at,reported_by,summary,data_types,affected_count,severity,commissioner_due_at,subjects_due_at,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(id, detected.toISOString(), req.user!.id, summary, str(req.body.dataTypes, 300) || null,
      Number.isFinite(Number(req.body.affectedCount)) ? Math.max(0, Math.trunc(Number(req.body.affectedCount))) : null, severity,
      new Date(detected.getTime() + COMMISSIONER_HOURS * 3600_000).toISOString(), new Date(detected.getTime() + SUBJECTS_DAYS * 86400_000).toISOString(), iso());
    audit(req, "breach.log", { target: ["breach", id], details: { severity } });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.post("/api/admin/breaches/:id/update", requireRole("admin"), (req, res) => {
    const b = db.prepare("SELECT * FROM breach_incidents WHERE id = ?").get(req.params.id) as any;
    if (!b) return fail(res, 404, "Incident not found.");
    const b2 = req.body;
    const sets: string[] = [], vals: any[] = [];
    const set = (col: string, v: any) => { sets.push(`${col} = ?`); vals.push(v); };
    if (typeof b2.severity === "string" && ["low", "medium", "high", "unknown"].includes(b2.severity)) set("severity", b2.severity);
    if (b2.commissionerNotified === true && !b.commissioner_notified_at) set("commissioner_notified_at", iso());
    if (typeof b2.subjectsRequired === "boolean") set("subjects_required", b2.subjectsRequired ? 1 : 0);
    if (b2.subjectsNotified === true && !b.subjects_notified_at) set("subjects_notified_at", iso());
    if (typeof b2.notes === "string") set("notes", str(b2.notes, 2000));
    if (b2.status === "contained" || b2.status === "open") set("status", b2.status);
    if (b2.status === "closed") {
      const subjectsOk = b.subjects_required !== 1 || b.subjects_notified_at || b2.subjectsNotified === true;
      const commOk = b.commissioner_notified_at || b2.commissionerNotified === true || b2.noNotificationReason;
      if (!subjectsOk) return fail(res, 400, "Affected individuals must be notified before closing, since notification was marked required.");
      if (!commOk) return fail(res, 400, "Record the Commissioner notification, or give a reason notification was not needed.");
      set("status", "closed"); set("closed_at", iso());
      if (b2.noNotificationReason) set("notes", `${b.notes ?? ""}\nNo Commissioner notification: ${str(b2.noNotificationReason, 500)}`.trim());
    }
    if (!sets.length) return fail(res, 400, "Nothing to update.");
    db.prepare(`UPDATE breach_incidents SET ${sets.join(", ")} WHERE id = ?`).run(...vals, b.id);
    audit(req, "breach.update", { target: ["breach", b.id] });
    res.json({ status: "success" });
  });

  // Daily reminder to admins about overdue breach notifications and the optional automatic purge.
  const daily = () => {
    try {
      const overdue = (db.prepare("SELECT id FROM breach_incidents WHERE status != 'closed' AND commissioner_notified_at IS NULL AND commissioner_due_at < ?").all(iso()) as any[]);
      if (overdue.length) {
        for (const a of db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as any[]) notify(a.id, "Breach notification overdue", `${overdue.length} incident(s) passed the Commissioner notification target.`);
      }
      if (process.env.RETENTION_AUTO_PURGE === "true" && retentionYearsSet()) {
        for (const c of purgeCandidates()) purgeRetained(c.userId);
      }
    } catch { /* next run will retry */ }
  };
  setInterval(daily, 24 * 3600_000).unref();
}

/** Exposed for tests only. */
export const _internals = { erasurePlan, executeErasure, purgeCandidates, purgeRetained, transferProblems };
