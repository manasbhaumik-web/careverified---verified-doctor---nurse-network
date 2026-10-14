import crypto from "crypto";
import { listProcessors, transferProblems, retentionYearsSet } from "./dataops";
import type { Application } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { notifyAdmins, notify } from "./verification";

/**
 * Privacy layer for the Personal Data Protection Act 2010 (PDPA), Malaysia.
 *
 * Provides: a bilingual (English + Bahasa Malaysia) privacy notice, versioned consent records,
 * data-subject requests (access, correction, deletion, withdrawal) with a due date, and a readiness check.
 *
 * The notice text is a DRAFT template written by the developers. It must be reviewed by Malaysian counsel
 * before launch; items marked (?) in docs/MALAYSIA_LOCALISATION_TASKS.md are unconfirmed.
 */

export const CONSENT_VERSION = "2026-11";

/** Days allowed to answer an access request. PDPA s.? sets 21 days (unconfirmed: check with counsel). */
export const REQUEST_DUE_DAYS = 21;

export type ConsentKind = "terms_privacy" | "health_data" | "credential_check" | "quality_review";
const CONSENT_KINDS: ConsentKind[] = ["terms_privacy", "health_data", "credential_check", "quality_review"];
/** Withdrawing these ends the service, so it becomes an account-closure request for staff to action. */
const CORE_KINDS: ConsentKind[] = ["terms_privacy", "health_data", "credential_check"];

export const REQUEST_KINDS = ["access", "correction", "deletion", "withdrawal"] as const;
type RequestKind = (typeof REQUEST_KINDS)[number];

db.exec(`
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  version TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  withdrawn_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);
CREATE TABLE IF NOT EXISTS data_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_data_requests_user ON data_requests(user_id);
`);

const iso = () => new Date().toISOString();
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: any, code: number, message: string) => res.status(code).json({ status: "error", message });

export function recordConsent(userId: string, kind: ConsentKind, version = CONSENT_VERSION) {
  db.prepare("INSERT INTO consents (id,user_id,kind,version,granted_at) VALUES (?,?,?,?,?)").run(newId("cns"), userId, kind, version, iso());
}

// ---------- deployment facts shown in the notice ----------
const config = () => ({
  controller: process.env.PRIVACY_CONTROLLER_NAME || "MedCred Healthcare Network Sdn Bhd",
  contactEmail: process.env.PRIVACY_CONTACT_EMAIL || "",
  hostingCountry: process.env.DATA_HOSTING_COUNTRY || "",
  retentionYears: retentionYearsSet() ? Number(process.env.RETENTION_YEARS) : null,
  processors: [
    ...listProcessors().map(p => `${p.name} (${p.country})`),
    ...(process.env.DATA_PROCESSORS || "").split(",").map(s => s.trim()).filter(Boolean),
  ],
  dpoName: process.env.DPO_NAME || "",
});

type Section = { heading: string; body: string };

function notice(lang: "en" | "ms"): Section[] {
  const c = config();
  const hosting = c.hostingCountry || (lang === "ms" ? "[negara pangkalan data belum dinyatakan]" : "[hosting country not yet declared]");
  const contact = c.contactEmail || (lang === "ms" ? "[e-mel hubungan belum dinyatakan]" : "[contact email not yet set]");
  const procs = c.processors.length ? c.processors.join(", ") : lang === "ms" ? "[belum dinyatakan]" : "[not yet declared]";
  const years = c.retentionYears ?? (lang === "ms" ? "[tempoh belum disahkan]" : "[period not yet confirmed]");
  if (lang === "ms") {
    return [
      { heading: "Pengguna data", body: `${c.controller} ("kami") ialah pengguna data bagi data peribadi anda di bawah Akta Perlindungan Data Peribadi 2010 (PDPA). Notis ini disediakan dalam Bahasa Malaysia dan Bahasa Inggeris.` },
      { heading: "Data yang kami kumpul", body: "Maklumat pengenalan (nama, nombor kad pengenalan atau pasport, umur, jantina), maklumat perhubungan, maklumat kesihatan (keadaan kronik, alahan, ubat, nota konsultasi, preskripsi, keputusan makmal), butiran kredensial profesional bagi pengamal, maklumat pembayaran yang diproses oleh penyedia pembayaran, dan data penggunaan serta log keselamatan. Maklumat kesihatan ialah data peribadi sensitif dan hanya diproses dengan persetujuan nyata anda." },
      { heading: "Tujuan", body: "Menyediakan konsultasi dan temujanji, membolehkan pengamal merawat anda, menghantar preskripsi ke farmasi pilihan anda, mengesahkan kredensial pengamal dengan majlis atau lembaga berkaitan, memproses pembayaran, keselamatan dan pencegahan penipuan, kualiti dan keselamatan penjagaan (dengan nama disembunyikan), serta mematuhi undang-undang." },
      { heading: "Pendedahan kepada pihak ketiga", body: `Pengamal yang anda rujuk, farmasi yang anda pilih, penyedia pembayaran, majlis atau lembaga profesional untuk pengesahan, dan pemproses data kami: ${procs}. Kami tidak menjual data anda.` },
      { heading: "Pilihan anda", body: "Data pengenalan, perhubungan dan kesihatan yang diminta adalah wajib untuk menyediakan perkhidmatan. Jika tidak diberikan, kami tidak dapat menyediakan akaun atau konsultasi. Persetujuan pilihan (contohnya semakan kualiti) boleh ditarik balik pada bila-bila masa." },
      { heading: "Hak akses dan pembetulan", body: `Anda boleh memohon akses kepada, pembetulan, pemadaman data peribadi anda atau menarik balik persetujuan melalui Pusat Privasi. Kami akan menjawab dalam ${REQUEST_DUE_DAYS} hari. Hubungi: ${contact}.` },
      { heading: "Keselamatan", body: "Kata laluan disimpan dengan hashing, sesi menggunakan kuki httpOnly, dokumen peribadi disimpan secara tertutup, dan tindakan sensitif direkodkan dalam log audit." },
      { heading: "Penyimpanan", body: `Rekod perubatan disimpan sekurang-kurangnya ${years} tahun selepas rawatan terakhir, atau lebih lama jika dikehendaki undang-undang. Permintaan pemadaman tidak membatalkan keperluan penyimpanan rekod perubatan yang diwajibkan; data lain dipadam atau dinyahkenal pasti.` },
      { heading: "Pemindahan ke luar Malaysia", body: `Data disimpan di: ${hosting}. Jika anda berada di luar Malaysia atau berkonsultasi merentas sempadan, data anda diproses di Malaysia dan mungkin dipindahkan mengikut keperluan PDPA.` },
    ];
  }
  return [
    { heading: "Who we are", body: `${c.controller} ("we") is the data user for your personal data under the Personal Data Protection Act 2010 (PDPA). This notice is provided in English and Bahasa Malaysia.` },
    { heading: "Data we collect", body: "Identity details (name, IC or passport number, age, gender), contact details, health information (long-term conditions, allergies, medicines, consultation notes, prescriptions, lab results), professional credential details for practitioners, payment details handled by our payment provider, and usage and security logs. Health information is sensitive personal data and is processed only with your explicit consent." },
    { heading: "Why we use it", body: "To provide consultations and appointments, let practitioners treat you, send prescriptions to the pharmacy you choose, verify practitioners' credentials with the relevant council or board, process payments, keep the service secure and prevent fraud, review care quality and safety (with your name hidden), and comply with the law." },
    { heading: "Who we share it with", body: `The practitioners you consult, pharmacies you choose, our payment provider, professional councils or boards for verification, and our data processors: ${procs}. We do not sell your data.` },
    { heading: "Your choices", body: "The identity, contact and health details we ask for are required to provide the service; without them we cannot create your account or arrange a consultation. Optional consents (for example care-quality review) can be withdrawn at any time." },
    { heading: "Access and correction", body: `You can ask to access, correct or delete your personal data, or withdraw consent, from the Privacy Centre. We aim to respond within ${REQUEST_DUE_DAYS} days. Contact: ${contact}.` },
    { heading: "Security", body: "Passwords are hashed, sessions use httpOnly cookies, personal documents are stored privately, and sensitive actions are written to an audit log." },
    { heading: "Retention", body: `Medical records are kept for at least ${years} years after the last treatment, or longer where the law requires. A deletion request does not override a legal duty to keep medical records; other data is deleted or de-identified.` },
    { heading: "Transfers outside Malaysia", body: `Data is stored in: ${hosting}. If you are outside Malaysia or have a cross-border consultation, your data is processed in Malaysia and may be transferred as the PDPA allows.` },
  ];
}

export function registerPrivacyRoutes(app: Application) {
  // ---------- public notice ----------
  app.get("/api/legal/privacy", (req, res) => {
    const lang = req.query.lang === "ms" ? "ms" : "en";
    const c = config();
    res.json({
      status: "success",
      data: {
        version: CONSENT_VERSION, lang, draft: true, controller: c.controller, contactEmail: c.contactEmail || null,
        title: lang === "ms" ? "Notis Privasi (PDPA 2010)" : "Privacy Notice (PDPA 2010)",
        sections: notice(lang),
      },
    });
  });

  // ---------- consents ----------
  app.get("/api/me/consents", requireAuth, (req, res) => {
    const u = db.prepare("SELECT consent_version, consent_at FROM users WHERE id = ?").get(req.user!.id) as any;
    const items = db.prepare("SELECT kind, version, granted_at AS grantedAt, withdrawn_at AS withdrawnAt FROM consents WHERE user_id = ? ORDER BY granted_at DESC").all(req.user!.id);
    res.json({
      status: "success",
      data: {
        currentVersion: CONSENT_VERSION,
        accepted: u?.consent_version ? { version: u.consent_version, at: u.consent_at } : null,
        outdated: u?.consent_version !== CONSENT_VERSION && req.user!.role !== "admin",
        items,
      },
    });
  });

  // Accept the current notice version (shown when the notice has changed since registration)
  app.post("/api/me/consents/accept", requireAuth, (req, res) => {
    if (req.body.consent !== true) return fail(res, 400, "Consent must be given explicitly.");
    db.prepare("UPDATE users SET consent_version = ?, consent_at = ? WHERE id = ?").run(CONSENT_VERSION, iso(), req.user!.id);
    recordConsent(req.user!.id, "terms_privacy");
    audit(req, "consent.accept", { details: { version: CONSENT_VERSION } });
    res.json({ status: "success" });
  });

  app.post("/api/me/consents/:kind/withdraw", requireAuth, (req, res) => {
    const kind = req.params.kind as ConsentKind;
    if (!CONSENT_KINDS.includes(kind)) return fail(res, 404, "Unknown consent.");
    const r = db.prepare("UPDATE consents SET withdrawn_at = ? WHERE user_id = ? AND kind = ? AND withdrawn_at IS NULL").run(iso(), req.user!.id, kind);
    audit(req, "consent.withdraw", { details: { kind } });
    if (CORE_KINDS.includes(kind)) {
      // Withdrawing a core consent means we can no longer provide the service: staff close the account.
      createRequest(req.user!.id, "withdrawal", `Withdrew consent: ${kind}`);
      return res.json({ status: "success", message: "Consent withdrawn. We cannot continue the service without it, so our team will confirm closing your account." });
    }
    res.json({ status: "success", message: r.changes ? "Consent withdrawn." : "No active consent of that type." });
  });

  // ---------- data-subject requests ----------
  const dueAt = () => new Date(Date.now() + REQUEST_DUE_DAYS * 86400_000).toISOString();
  function createRequest(userId: string, kind: RequestKind, details: string) {
    const id = newId("dsr");
    db.prepare("INSERT INTO data_requests (id,user_id,kind,details,created_at,due_at) VALUES (?,?,?,?,?,?)").run(id, userId, kind, details || null, iso(), dueAt());
    notifyAdmins("Data request received", `A ${kind} request is due within ${REQUEST_DUE_DAYS} days.`);
    return id;
  }
  // Exposed so the existing deletion endpoint can log into the same queue.
  (app as any).locals.createDataRequest = createRequest;

  app.post("/api/me/data-requests", requireAuth, (req, res) => {
    const kind = req.body.kind as RequestKind;
    if (!REQUEST_KINDS.includes(kind)) return fail(res, 400, "Choose access, correction, deletion or withdrawal.");
    const details = str(req.body.details, 1000);
    if ((kind === "correction" || kind === "deletion") && details.length < 5) return fail(res, 400, "Tell us what to correct or delete.");
    const open = db.prepare("SELECT 1 AS x FROM data_requests WHERE user_id = ? AND kind = ? AND status = 'open'").get(req.user!.id, kind);
    if (open) return fail(res, 409, "You already have an open request of this type.");
    const id = createRequest(req.user!.id, kind, details);
    if (kind === "deletion") db.prepare("UPDATE users SET deletion_requested_at = ? WHERE id = ?").run(iso(), req.user!.id);
    audit(req, "datarequest.create", { target: ["data_request", id], details: { kind } });
    res.status(201).json({ status: "success", data: { id, dueAt: dueAt() } });
  });

  app.get("/api/me/data-requests", requireAuth, (req, res) => {
    res.json({
      status: "success",
      data: db.prepare("SELECT id,kind,details,status,created_at AS createdAt,due_at AS dueAt,resolved_at AS resolvedAt,resolution_note AS resolutionNote FROM data_requests WHERE user_id = ? ORDER BY created_at DESC").all(req.user!.id),
    });
  });

  app.get("/api/admin/data-requests", requireRole("admin"), (_req, res) => {
    const rows = db.prepare(
      `SELECT d.id,d.kind,d.details,d.status,d.created_at AS createdAt,d.due_at AS dueAt,d.resolved_at AS resolvedAt,d.resolution_note AS resolutionNote,u.name AS userName,u.email AS userEmail
       FROM data_requests d LEFT JOIN users u ON u.id = d.user_id ORDER BY (d.status = 'open') DESC, d.due_at ASC LIMIT 200`
    ).all();
    res.json({ status: "success", data: rows });
  });

  app.post("/api/admin/data-requests/:id/resolve", requireRole("admin"), (req, res) => {
    const r = db.prepare("SELECT * FROM data_requests WHERE id = ?").get(req.params.id) as any;
    if (!r) return fail(res, 404, "Request not found.");
    if (r.status !== "open") return fail(res, 409, "This request is already closed.");
    const status = req.body.status === "rejected" ? "rejected" : "completed";
    const note = str(req.body.note, 1000);
    if (status === "rejected" && !note) return fail(res, 400, "Give the reason for refusing the request.");
    db.prepare("UPDATE data_requests SET status = ?, resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?").run(status, iso(), req.user!.id, note || null, r.id);
    notify(r.user_id, "Your data request was answered", note || `Your ${r.kind} request is ${status}.`);
    audit(req, "datarequest.resolve", { target: ["data_request", r.id], details: { status } });
    res.json({ status: "success" });
  });

  // ---------- readiness check for admins ----------
  app.get("/api/admin/privacy-status", requireRole("admin"), (_req, res) => {
    const c = config();
    const overdue = (db.prepare("SELECT COUNT(*) AS n FROM data_requests WHERE status = 'open' AND due_at < ?").get(iso()) as any).n;
    const open = (db.prepare("SELECT COUNT(*) AS n FROM data_requests WHERE status = 'open'").get() as any).n;
    res.json({
      status: "success",
      data: {
        consentVersion: CONSENT_VERSION, openRequests: open, overdueRequests: overdue, retentionYears: c.retentionYears ?? "not set",
        checklist: [
          { item: "Privacy contact email set (PRIVACY_CONTACT_EMAIL)", done: !!c.contactEmail },
          { item: "Data hosting country declared (DATA_HOSTING_COUNTRY)", done: !!c.hostingCountry },
          { item: "Data processors listed (DATA_PROCESSORS)", done: c.processors.length > 0 },
          { item: "Transfer basis recorded for every processor outside Malaysia", done: transferProblems().length === 0, note: transferProblems().join(" ") || undefined },
          { item: "Retention period set deliberately (RETENTION_YEARS)", done: retentionYearsSet() },
          { item: "Data Protection Officer named (DPO_NAME) and notified to the Commissioner", done: !!c.dpoName, note: "Required from 1 June 2025 per commentary; the notification itself is manual." },
          { item: "Notice and Terms reviewed by Malaysian counsel", done: false, note: "Manual: both texts are developer drafts." },
        ],
      },
    });
  });
}
