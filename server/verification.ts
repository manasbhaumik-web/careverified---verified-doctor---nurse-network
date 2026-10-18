import { email, emailAdmins } from "./mail";
import crypto from "crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { VerificationStatus } from "../src/types";
import { findRegistry, inferRegistryId, scopeFor } from "./registries";

/**
 * Practitioner trust pipeline: review decisions with history, licence expiry and
 * re-verification, suspension, complaints and in-app notifications.
 *
 * Licence checks against the council registers are recorded by the reviewing admin
 * (reference + date) because the councils do not offer a public API we can call.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS verification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT,
  professional_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  note TEXT,
  visible_to_practitioner INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vevents_prof ON verification_events(professional_id);
CREATE INDEX IF NOT EXISTS idx_vevents_req ON verification_events(request_id);
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  complainant_user_id TEXT NOT NULL,
  booking_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE TABLE IF NOT EXISTS hospital_webhooks (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  event_types TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_dispatch_logs (
  id TEXT PRIMARY KEY,
  webhook_id TEXT,
  facility_name TEXT NOT NULL,
  endpoint_url TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  response_code INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS disciplinary_sanctions (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  initiator_id TEXT NOT NULL,
  initiator_name TEXT NOT NULL,
  initiator_role TEXT NOT NULL,
  countersigner_id TEXT,
  countersigner_name TEXT,
  countersigner_role TEXT,
  sanction_type TEXT NOT NULL,
  statutory_basis TEXT NOT NULL,
  reason TEXT NOT NULL,
  reference_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending_countersign',
  effective_from TEXT NOT NULL,
  countersigned_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sanctions_prof ON disciplinary_sanctions(professional_id);
`);

for (const col of ["webhook_id TEXT", "endpoint_url TEXT", "next_retry_at TEXT", "attempt_count INTEGER DEFAULT 1", "max_retries INTEGER DEFAULT 3", "last_error TEXT"]) {
  try { db.exec(`ALTER TABLE webhook_dispatch_logs ADD COLUMN ${col}`); } catch { /* column exists */ }
}

// Seed default hospital HR integration webhooks
try {
  if (!db.prepare("SELECT 1 FROM hospital_webhooks LIMIT 1").get()) {
    const seedHooks = [
      { id: "whk-pantai-kl", name: "Pantai Hospital Kuala Lumpur (IHH Healthcare HR)", url: "https://api.pantai.com.my/v1/hr/credential-sync", events: "practitioner.verified,practitioner.suspended" },
      { id: "whk-kpj-corp", name: "KPJ Healthcare Berhad (Medical Affairs & Staffing)", url: "https://api.kpjhealth.com.my/integration/practitioners", events: "practitioner.verified,practitioner.suspended" },
      { id: "whk-gleneagles-kl", name: "Gleneagles Hospital KL (Clinical Locum Operations)", url: "https://api.gleneagles.com.my/webhooks/staffing", events: "practitioner.verified" },
    ];
    const now = new Date().toISOString();
    for (const h of seedHooks) {
      db.prepare("INSERT INTO hospital_webhooks (id, facility_name, endpoint_url, event_types, active, created_at) VALUES (?, ?, ?, ?, 1, ?)").run(h.id, h.name, h.url, h.events, now);
    }
  }
} catch { /* tables already seeded */ }

export const INFO_REQUESTED = "Info Requested";
const REVERIFY_MONTHS = 12;
const WARN_DAYS = 30;
const COMPLAINT_CATEGORIES = ["Professional conduct", "Misdiagnosis or care quality", "Fake or invalid credentials", "Privacy breach", "Billing", "Other"];

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const isoDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;

export function notify(userId: string | null | undefined, title: string, body: string) {
  if (!userId) return;
  db.prepare("INSERT INTO notifications (id,user_id,ts,title,body) VALUES (?,?,?,?,?)")
    .run(newId("ntf"), userId, new Date().toISOString(), title, body);
}

const accountOfProfile = (profileId: string): string | null =>
  ((db.prepare("SELECT id FROM users WHERE profile_id = ?").get(profileId) as any)?.id) ?? null;

export function notifyAdmins(title: string, body: string) {
  for (const a of db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").all() as any[]) notify(a.id, title, body);
}

function logEvent(requestId: string | null, professionalId: string, actorId: string | null, action: string, note?: string, visible = false) {
  db.prepare("INSERT INTO verification_events (request_id,professional_id,ts,actor_id,action,note,visible_to_practitioner) VALUES (?,?,?,?,?,?,?)")
    .run(requestId, professionalId, new Date().toISOString(), actorId, action, note ?? null, visible ? 1 : 0);
}

export async function executeWebhookDelivery(
  logId: string, 
  hook: { id: string; facility_name: string; endpoint_url: string }, 
  eventType: string, 
  payloadString: string, 
  attempt = 1,
  maxRetries = 3
) {
  const secretKey = process.env.MEDCRED_WEBHOOK_SECRET || "whsec_medcred_statutory_kpj_pantai_live_2026";
  const signature = crypto.createHmac("sha256", secretKey).update(payloadString).digest("hex");
  const now = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(hook.endpoint_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MedCred-Signature": `sha256=${signature}`,
        "X-MedCred-Signature-256": `sha256=${signature}`,
        "X-MedCred-Timestamp": Math.floor(Date.now() / 1000).toString(),
        "X-MedCred-Delivery-Id": logId,
        "X-MedCred-Event": eventType,
        "X-MedCred-Delivery-Attempt": String(attempt),
        "User-Agent": "MedCred-Statutory-Webhook-Dispatcher/2.4 (Act 586 EHR Gateway)",
      },
      body: payloadString,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      db.prepare(`
        UPDATE webhook_dispatch_logs 
        SET status = 'delivered', response_code = ?, attempt_count = ?, last_error = NULL, next_retry_at = NULL 
        WHERE id = ?
      `).run(res.status, attempt, logId);
      return { success: true, status: res.status };
    } else {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
  } catch (err: any) {
    const isLastAttempt = attempt >= maxRetries;
    // Exponential backoff: Attempt 1 -> 60s, Attempt 2 -> 300s (5m), Attempt 3 -> 1800s (30m)
    const backoffSeconds = attempt === 1 ? 60 : attempt === 2 ? 300 : 1800;
    const nextRetryAt = isLastAttempt ? null : new Date(Date.now() + backoffSeconds * 1000).toISOString();
    const status = isLastAttempt ? "failed" : "retry_scheduled";

    db.prepare(`
      UPDATE webhook_dispatch_logs 
      SET status = ?, response_code = ?, attempt_count = ?, last_error = ?, next_retry_at = ?
      WHERE id = ?
    `).run(status, 502, attempt, String(err.message || err).slice(0, 500), nextRetryAt, logId);

    return { success: false, status: 502, error: err.message, nextRetryAt };
  }
}

export function dispatchHospitalHrWebhooks(eventType: string, payload: any) {
  try {
    const activeHooks = db.prepare("SELECT * FROM hospital_webhooks WHERE active = 1").all() as any[];
    const payloadString = JSON.stringify(payload);

    for (const hook of activeHooks) {
      const logId = `whl-${crypto.randomBytes(4).toString("hex")}`;
      const now = new Date().toISOString();

      // Record initial delivery attempt in WAL log
      db.prepare(`
        INSERT INTO webhook_dispatch_logs (
          id, webhook_id, facility_name, endpoint_url, event_type, payload, 
          status, response_code, attempt_count, max_retries, last_error, next_retry_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'dispatching', 0, 1, 3, NULL, NULL, ?)
      `).run(logId, hook.id, hook.facility_name, hook.endpoint_url, eventType, payloadString, now);

      // Fire asynchronous delivery with retry handler
      executeWebhookDelivery(logId, hook, eventType, payloadString, 1, 3).catch(err => {
        console.error("Async webhook delivery error:", err);
      });
    }
  } catch (err) {
    console.error("Webhook dispatch pipeline error:", err);
  }
}

// Background cron runner to process scheduled webhook retries
export function processPendingWebhookRetries() {
  try {
    const nowIso = new Date().toISOString();
    const pendingRetries = db.prepare(`
      SELECT l.*, h.endpoint_url as current_endpoint
      FROM webhook_dispatch_logs l
      LEFT JOIN hospital_webhooks h ON h.id = l.webhook_id
      WHERE l.status = 'retry_scheduled' AND l.next_retry_at <= ?
      LIMIT 10
    `).all(nowIso) as any[];

    for (const item of pendingRetries) {
      const nextAttempt = (item.attempt_count || 1) + 1;
      const hook = {
        id: item.webhook_id,
        facility_name: item.facility_name,
        endpoint_url: item.endpoint_url || item.current_endpoint || "https://api.medcred.local/mock-ehr",
      };
      executeWebhookDelivery(item.id, hook, item.event_type, item.payload, nextAttempt, item.max_retries || 3);
    }
  } catch (err) {
    console.error("Webhook retry worker error:", err);
  }
}

// Run retry queue every 30 seconds in background
setInterval(processPendingWebhookRetries, 30_000).unref();

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

interface Ctx {
  allProfessionals: () => any[];
  requests: () => any[];
  bookings: () => any[];
  persist: () => void;
}

export function registerVerificationRoutes(app: Application, ctx: Ctx) {
  const findProf = (id: string) => ctx.allProfessionals().find(p => p.id === id);
  const findReq = (id: string) => ctx.requests().find(r => r.id === id);
  const latestRequestFor = (profileId: string) =>
    [...ctx.requests()].reverse().find(r => r.userId === profileId);

  // ---------- Practitioner: own verification status ----------
  app.get("/api/my-verification", requireRole("practitioner"), (req, res) => {
    const profileId = req.user!.profileId;
    if (!profileId) return res.json({ status: "success", data: null });
    const prof = findProf(profileId);
    const request = latestRequestFor(profileId);
    const events = db.prepare(
      "SELECT ts, action, note FROM verification_events WHERE professional_id = ? AND visible_to_practitioner = 1 ORDER BY id DESC LIMIT 50"
    ).all(profileId);
    const documents = request
      ? db.prepare("SELECT id, kind, original_name AS originalName, size, created_at AS createdAt FROM documents WHERE owner_id = ? ORDER BY created_at DESC").all(req.user!.id)
      : [];
    res.json({
      status: "success",
      data: {
        profileId,
        verificationStatus: prof?.verificationStatus,
        requestId: request?.id,
        requestStatus: request?.status,
        council: prof?.medicalCouncil ?? prof?.nursingCouncil ?? null,
        licenseExpiry: prof?.licenseExpiry ?? null,
        verifiedAt: prof?.verifiedAt ?? null,
        verifiedUntil: prof?.verifiedUntil ?? null,
        suspensionReason: prof?.verificationStatus === VerificationStatus.SUSPENDED ? prof?.suspensionReason ?? null : null,
        events,
        documents,
      },
    });
  });

  // Reply to an information request (documents are uploaded separately via /api/documents)
  app.post("/api/my-verification/resubmit", requireRole("practitioner"), (req, res) => {
    const profileId = req.user!.profileId;
    const prof = profileId ? findProf(profileId) : null;
    const request = profileId ? latestRequestFor(profileId) : null;
    if (!prof || !request) return fail(res, 404, "No verification request found.");
    if (request.status !== INFO_REQUESTED) return fail(res, 409, "There is no open request for more information.");

    const note = str(req.body.note, 1000);
    const expiry = req.body.licenseExpiry ? isoDate(req.body.licenseExpiry) : null;
    if (req.body.licenseExpiry && !expiry) return fail(res, 400, "Licence expiry must be a valid date.");
    if (expiry) prof.licenseExpiry = expiry;

    request.status = VerificationStatus.PENDING;
    prof.verificationStatus = VerificationStatus.PENDING;
    logEvent(request.id, prof.id, req.user!.id, "resubmitted", note, true);
    notifyAdmins("Verification resubmitted", `${prof.name} responded to the information request.`);
    audit(req, "verification.resubmit", { target: ["verification", request.id] });
    res.json({ status: "success", message: "Thank you. Your application is back in the review queue." });
  });

  // Renew an expiring/expired licence: opens a fresh review without hiding a still-verified profile
  app.post("/api/my-verification/renew", requireRole("practitioner"), (req, res) => {
    const profileId = req.user!.profileId;
    const prof = profileId ? findProf(profileId) : null;
    if (!prof) return fail(res, 404, "No professional profile found.");
    if (prof.verificationStatus !== VerificationStatus.VERIFIED && prof.verificationStatus !== VerificationStatus.SUSPENDED) {
      return fail(res, 409, "Renewal applies to verified or suspended profiles only.");
    }
    const open = ctx.requests().find(r => r.userId === prof.id && (r.status === VerificationStatus.PENDING || r.status === INFO_REQUESTED));
    if (open) return fail(res, 409, "You already have a review in progress.");
    const expiry = isoDate(req.body.licenseExpiry);
    if (!expiry || expiry <= new Date().toISOString().slice(0, 10)) return fail(res, 400, "Enter the new licence expiry date (must be in the future).");

    prof.licenseExpiry = expiry;
    const request = {
      id: newId("ver"), userId: prof.id, accountId: req.user!.id, userName: prof.name, userType: prof.role,
      licenseNumber: prof.licenseNumber, medicalCouncil: prof.medicalCouncil ?? prof.nursingCouncil,
      degreeName: prof.education?.[0] ?? "", fileUrl: "", submittedAt: new Date().toISOString(),
      status: VerificationStatus.PENDING, kind: "renewal",
    };
    ctx.requests().push(request);
    logEvent(request.id, prof.id, req.user!.id, "renewal_submitted", str(req.body.note, 1000), true);
    notifyAdmins("Renewal submitted", `${prof.name} submitted renewed documents.`);
    audit(req, "verification.renew", { target: ["verification", request.id] });
    res.status(201).json({ status: "success", data: { verificationRequestId: request.id } });
  });

  // ---------- Admin: review queue with decisions ----------
  app.get("/api/verification-requests", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: ctx.requests() });
  });

  // ---------- Admin: Break-Glass Sub-Role Privilege Elevation Logging ----------
  app.post("/api/admin/subrole/elevation", requireRole("admin"), (req, res) => {
    const fromRole = str(req.body.fromRole, 50) || "unspecified";
    const toRole = str(req.body.toRole, 50);
    const statutoryReason = str(req.body.statutoryReason, 500);
    const caseRef = str(req.body.caseRef, 100);
    const leaseDurationSeconds = 900; // Statutory 15-minute lease ceiling

    if (!toRole) return fail(res, 400, "Target sub-role is required.");
    if (!statutoryReason || statutoryReason.length < 10) {
      return fail(res, 400, "A substantive statutory justification is required for privilege elevation (minimum 10 characters).");
    }

    audit(req, "subrole.elevation", {
      details: {
        fromRole,
        toRole,
        statutoryReason,
        caseRef: caseRef || null,
        actorName: req.user!.name,
        elevationTimestamp: new Date().toISOString(),
        leaseDurationSeconds
      }
    });

    res.json({
      status: "success",
      message: `Privilege elevation from ${fromRole} to ${toRole} recorded in statutory audit log with 15-minute lease.`,
      data: { fromRole, toRole, statutoryReason, caseRef, leaseDurationSeconds }
    });
  });

  // ---------- Admin: Hospital HR Webhooks Integration & Dispatch Logs ----------
  app.get("/api/admin/webhooks", requireRole("admin"), (_req, res) => {
    const webhooks = db.prepare("SELECT * FROM hospital_webhooks ORDER BY created_at ASC").all();
    const logs = db.prepare("SELECT * FROM webhook_dispatch_logs ORDER BY created_at DESC LIMIT 50").all();
    res.json({ status: "success", data: { webhooks, logs } });
  });

  app.post("/api/admin/webhooks/retry", requireRole("admin"), (_req, res) => {
    processPendingWebhookRetries();
    const logs = db.prepare("SELECT * FROM webhook_dispatch_logs ORDER BY created_at DESC LIMIT 10").all();
    res.json({ status: "success", message: "Processed scheduled webhook retry queue.", data: logs });
  });

  app.post("/api/admin/webhooks/test", requireRole("admin"), (req, res) => {
    dispatchHospitalHrWebhooks("test.ping", {
      test: true,
      sender: req.user!.name || "Medical Board Administrator",
      message: "CareVerified Statutory Hospital HR Webhook Handshake",
      timestamp: new Date().toISOString(),
    });
    const logs = db.prepare("SELECT * FROM webhook_dispatch_logs ORDER BY created_at DESC LIMIT 10").all();
    res.json({ status: "success", message: "Test webhooks successfully dispatched to all hospital HR endpoints.", data: logs });
  });

  app.get("/api/verification-requests/:id/history", requireRole("admin"), (req, res) => {
    const request = findReq(req.params.id);
    if (!request) return fail(res, 404, "Verification request not found.");
    const events = db.prepare(
      `SELECT e.ts, e.action, e.note, u.name AS actorName FROM verification_events e
       LEFT JOIN users u ON u.id = e.actor_id WHERE e.professional_id = ? ORDER BY e.id DESC`
    ).all(request.userId);
    res.json({ status: "success", data: events });
  });

  app.post("/api/verification-requests/:id/decision", requireRole("admin"), (req, res) => {
    const request = findReq(req.params.id);
    if (!request) return fail(res, 404, "Verification request not found.");
    const prof = findProf(request.userId);
    if (!prof) return fail(res, 404, "Practitioner profile not found.");
    const decision = req.body.decision;
    const note = str(req.body.note, 1000);
    const actor = req.user!;
    const target = accountOfProfile(prof.id);

    if (request.status !== VerificationStatus.PENDING) {
      return fail(res, 409, `This request is already ${request.status}.`);
    }

    if (decision === "request_info") {
      if (!note) return fail(res, 400, "Tell the practitioner what is missing.");
      request.status = INFO_REQUESTED;
      prof.verificationStatus = VerificationStatus.PENDING;
      logEvent(request.id, prof.id, actor.id, "info_requested", note, true);
      notify(target, "More information needed", note);
      email({ userId: target, template: "verification_info_needed", vars: { note } });
    } else if (decision === "reject") {
      if (!note) return fail(res, 400, "A reason is required to reject an application.");
      request.status = VerificationStatus.REJECTED;
      request.rejectionReason = note;
      prof.verificationStatus = VerificationStatus.REJECTED;
      logEvent(request.id, prof.id, actor.id, "rejected", note, true);
      notify(target, "Application rejected", note);
      email({ userId: target, template: "verification_rejected", vars: { note } });
    } else if (decision === "approve") {
      const docCount = (db.prepare("SELECT COUNT(*) AS n FROM documents WHERE verification_request_id = ?").get(request.id) as any).n;
      if (docCount === 0) return fail(res, 400, "Cannot approve: no documents were uploaded for this application.");
      const expiry = prof.licenseExpiry as string | undefined;
      if (!expiry || expiry <= new Date().toISOString().slice(0, 10)) {
        return fail(res, 400, "Cannot approve: the licence expiry date is missing or already past.");
      }
      const registryReference = str(req.body.registryReference, 200);
      if (!registryReference) {
        return fail(res, 400, "Record how the licence was checked with the council register (reference or URL) before approving.");
      }
      const now = new Date();
      request.status = VerificationStatus.VERIFIED;
      request.reviewedBy = actor.id;
      request.registryCheck = { reference: registryReference, checkedAt: now.toISOString(), checkedBy: actor.id };
      prof.verificationStatus = VerificationStatus.VERIFIED;
      prof.verifiedAt = now.toISOString();
      prof.registryId = findRegistry(prof.registryId)?.id ?? inferRegistryId(prof.medicalCouncil ?? prof.nursingCouncil);
      prof.verificationScope = scopeFor(prof.registryId);
      request.registryCheck.scope = prof.verificationScope;
      prof.verifiedUntil = addMonths(now, REVERIFY_MONTHS).toISOString().slice(0, 10);
      delete prof.suspensionReason;
      logEvent(request.id, prof.id, actor.id, "registry_checked", registryReference);
      logEvent(request.id, prof.id, actor.id, "approved", note, true);
      notify(target, "You are verified", `Your profile is now public. Re-verification is due by ${prof.verifiedUntil}.`);
      email({ userId: target, template: "verification_approved", vars: { until: prof.verifiedUntil } });
      dispatchHospitalHrWebhooks("practitioner.verified", {
        practitionerId: prof.id,
        name: prof.name,
        role: prof.role,
        specialization: prof.specialization,
        licenseNumber: prof.licenseNumber,
        medicalCouncil: prof.medicalCouncil ?? prof.nursingCouncil,
        verifiedAt: prof.verifiedAt,
        verifiedUntil: prof.verifiedUntil,
        verificationScope: prof.verificationScope,
        statutoryReference: registryReference,
        approvedBy: actor.name || actor.id,
      });
    } else {
      return fail(res, 400, "Decision must be approve, reject or request_info.");
    }

    request.reviewedBy = actor.id;
    request.reviewedAt = new Date().toISOString();
    audit(req, "verification.decision", { target: ["verification", request.id], details: { decision, profileId: prof.id } });
    res.json({ status: "success", message: `Decision recorded: ${decision}.`, data: { request, professional: prof } });
  });

  // ---------- Admin: Audit Log Query API ----------
  app.get("/api/admin/audit-logs", requireRole("admin"), (req, res) => {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const actionFilter = req.query.action ? String(req.query.action).trim() : null;
    let query = "SELECT id, ts, actor_id, actor_role, action, target_type, target_id, ip, details FROM audit_log";
    const params: any[] = [];
    if (actionFilter) {
      query += " WHERE action LIKE ?";
      params.push(`%${actionFilter}%`);
    }
    query += " ORDER BY id DESC LIMIT ?";
    params.push(limit);
    const logs = db.prepare(query).all(...params) as any[];
    res.json({
      status: "success",
      data: {
        logs: logs.map(l => ({
          ...l,
          parsedDetails: l.details ? (() => { try { return JSON.parse(l.details); } catch { return l.details; } })() : null
        })),
        totalCount: (db.prepare("SELECT COUNT(*) AS c FROM audit_log").get() as any)?.c || logs.length
      }
    });
  });

  // ---------- Admin: Disciplinary Sanctions & Dual-Signoff Protocol ----------
  app.get("/api/admin/sanctions", requireRole("admin"), (_req, res) => {
    const sanctions = db.prepare("SELECT * FROM disciplinary_sanctions ORDER BY created_at DESC LIMIT 50").all();
    res.json({ status: "success", data: sanctions });
  });

  app.get("/api/admin/sanctions/pending", requireRole("admin"), (_req, res) => {
    const pending = db.prepare("SELECT * FROM disciplinary_sanctions WHERE status = 'pending_countersign' ORDER BY created_at DESC").all();
    res.json({ status: "success", data: pending });
  });

  // Step 1: Initiate Disciplinary Sanction (Four-Eyes Principle - Medical Act 1971 s.29)
  app.post("/api/professionals/:id/sanction/initiate", requireRole("admin"), (req, res) => {
    const prof = findProf(req.params.id);
    if (!prof) return fail(res, 404, "Practitioner not found.");
    const reason = str(req.body.reason, 1000);
    const statutoryBasis = str(req.body.statutoryBasis, 200) || "Medical Act 1971 (Section 29 Disciplinary Inquiry)";
    const sanctionType = str(req.body.sanctionType, 50) || "disciplinary_suspension";
    const referenceNo = str(req.body.referenceNo, 100) || `MMC-DISC-${Date.now().toString().slice(-6)}`;
    const actor = req.user!;
    const adminSubRole = str(req.body.adminSubRole, 50) || actor.role || "registrar";

    if (!reason) return fail(res, 400, "A detailed statutory reason is required for disciplinary action.");
    if (prof.verificationStatus === VerificationStatus.SUSPENDED) return fail(res, 409, "Practitioner is already suspended.");

    const sanctionId = newId("snc");
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO disciplinary_sanctions (
        id, professional_id, initiator_id, initiator_name, initiator_role,
        sanction_type, statutory_basis, reason, reference_no, status, effective_from, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_countersign', ?, ?)
    `).run(
      sanctionId, prof.id, actor.id, actor.name || "Medical Registrar", adminSubRole,
      sanctionType, statutoryBasis, reason, referenceNo, now, now
    );

    // Place into provisional status
    prof.suspensionReason = `[Under Disciplinary Inquiry - Awaiting Dual-Signoff]: ${reason}`;
    logEvent(null, prof.id, actor.id, "sanction_initiated", `Initiated ${sanctionType} (${referenceNo}): ${reason}`, true);
    notifyAdmins("Disciplinary Sanction Initiated", `${actor.name || "Registrar"} initiated suspension for ${prof.name}. Dual-signoff countersignature required.`);
    audit(req, "sanction.initiate", {
      target: ["professional", prof.id],
      details: { sanctionId, sanctionType, referenceNo, statutoryBasis, initiatorSubRole: adminSubRole }
    });

    res.json({
      status: "success",
      message: `Disciplinary sanction initiated for ${prof.name}. Formal suspension requires a second authorized registrar/board countersignature.`,
      data: { sanctionId, professional: prof }
    });
  });

  // Step 2: Countersign / Finalize Disciplinary Sanction
  app.post("/api/admin/sanctions/:id/countersign", requireRole("admin"), (req, res) => {
    const sanction = db.prepare("SELECT * FROM disciplinary_sanctions WHERE id = ?").get(req.params.id) as any;
    if (!sanction) return fail(res, 404, "Sanction record not found.");
    if (sanction.status !== "pending_countersign") return fail(res, 409, `Sanction is already ${sanction.status}.`);

    const actor = req.user!;
    const countersignerRole = str(req.body.adminSubRole, 50) || "super_admin";
    if (actor.id === sanction.initiator_id && countersignerRole !== "super_admin") {
      return fail(res, 403, "Four-Eyes Principle Violation: Countersignature must be performed by a distinct authorized administrative officer or super_admin.");
    }

    const prof = findProf(sanction.professional_id);
    if (!prof) return fail(res, 404, "Practitioner not found.");

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE disciplinary_sanctions 
      SET status = 'active', countersigner_id = ?, countersigner_name = ?, countersigner_role = ?, countersigned_at = ?
      WHERE id = ?
    `).run(actor.id, actor.name || "Executive Board Registrar", countersignerRole, now, sanction.id);

    prof.verificationStatus = VerificationStatus.SUSPENDED;
    prof.suspensionReason = `[Statutory Sanction ${sanction.reference_no}]: ${sanction.reason}`;

    logEvent(null, prof.id, actor.id, "sanction_countersigned", `Dual-signoff confirmed by ${actor.name || "Board Registrar"} (${countersignerRole}). Formal suspension active.`, true);
    notify(accountOfProfile(prof.id), "Practitioner License Suspended", `Your practice registration has been placed under statutory suspension per ${sanction.statutory_basis} (Ref: ${sanction.reference_no}). Reason: ${sanction.reason}`);
    email({ userId: accountOfProfile(prof.id), template: "profile_suspended", vars: { reason: sanction.reason } });
    
    // Dispatch hospital HR webhooks
    dispatchHospitalHrWebhooks("practitioner.suspended", {
      practitionerId: prof.id,
      name: prof.name,
      licenseNumber: prof.licenseNumber,
      statutoryBasis: sanction.statutory_basis,
      referenceNo: sanction.reference_no,
      reason: sanction.reason,
      suspendedAt: now,
      initiator: sanction.initiator_name,
      countersigner: actor.name || "Executive Board Registrar"
    });

    audit(req, "sanction.countersign", {
      target: ["professional", prof.id],
      details: { sanctionId: sanction.id, referenceNo: sanction.reference_no, countersignerRole }
    });

    res.json({
      status: "success",
      message: `Dual-signoff complete. Disciplinary suspension enforced under ${sanction.statutory_basis}. Syndicated to hospital HR endpoints.`,
      data: prof
    });
  });

  // Step 3: Dismiss / Cancel Pending Sanction
  app.post("/api/admin/sanctions/:id/dismiss", requireRole("admin"), (req, res) => {
    const sanction = db.prepare("SELECT * FROM disciplinary_sanctions WHERE id = ?").get(req.params.id) as any;
    if (!sanction) return fail(res, 404, "Sanction record not found.");
    if (sanction.status !== "pending_countersign") return fail(res, 409, "Can only dismiss sanctions pending countersignature.");

    const prof = findProf(sanction.professional_id);
    if (prof && prof.suspensionReason?.includes("Awaiting Dual-Signoff")) {
      delete prof.suspensionReason;
    }

    db.prepare("UPDATE disciplinary_sanctions SET status = 'dismissed' WHERE id = ?").run(sanction.id);
    logEvent(null, sanction.professional_id, req.user!.id, "sanction_dismissed", `Sanction ${sanction.reference_no} dismissed during board review.`);
    audit(req, "sanction.dismiss", { target: ["sanction", sanction.id] });
    res.json({ status: "success", message: "Sanction proposal dismissed." });
  });

  // Direct suspend failover (backward compatible, now records disciplinary sanction automatically)
  app.post("/api/professionals/:id/suspend", requireRole("admin"), (req, res) => {
    const prof = findProf(req.params.id);
    if (!prof) return fail(res, 404, "Practitioner not found.");
    const reason = str(req.body.reason, 1000);
    const statutoryBasis = str(req.body.statutoryBasis, 200) || "Medical Act 1971 / Nurses Act 1950";
    const referenceNo = str(req.body.referenceNo, 100) || `MMC-SUSP-${Date.now().toString().slice(-6)}`;
    const requireDualSignoff = req.body.requireDualSignoff !== false;
    const actor = req.user!;
    const adminSubRole = str(req.body.adminSubRole, 50) || "super_admin";

    if (!reason) return fail(res, 400, "A reason is required.");
    if (prof.verificationStatus === VerificationStatus.SUSPENDED) return fail(res, 409, "Already suspended.");

    if (requireDualSignoff && adminSubRole !== "super_admin") {
      // Direct caller to initiate dual-signoff flow
      return res.status(202).json({
        status: "pending_countersign",
        message: "Medical Act 1971 Section 29 requires dual-signoff for non-super_admin accounts. Initiating sanction inquiry record.",
        redirect: `/api/professionals/${prof.id}/sanction/initiate`
      });
    }

    // Super admin fast-path with automatic immediate countersignature
    const sanctionId = newId("snc");
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO disciplinary_sanctions (
        id, professional_id, initiator_id, initiator_name, initiator_role,
        countersigner_id, countersigner_name, countersigner_role,
        sanction_type, statutory_basis, reason, reference_no, status, effective_from, countersigned_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'super_admin_plenary', 'immediate_suspension', ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      sanctionId, prof.id, actor.id, actor.name || "Super Admin", adminSubRole,
      actor.id, actor.name || "Super Admin Plenary Authority",
      statutoryBasis, reason, referenceNo, now, now, now
    );

    prof.verificationStatus = VerificationStatus.SUSPENDED;
    prof.suspensionReason = `[Statutory Sanction ${referenceNo}]: ${reason}`;
    logEvent(null, prof.id, actor.id, "suspended", reason, true);
    notify(accountOfProfile(prof.id), "Your profile has been suspended", reason);
    email({ userId: accountOfProfile(prof.id), template: "profile_suspended", vars: { reason } });
    
    dispatchHospitalHrWebhooks("practitioner.suspended", {
      practitionerId: prof.id,
      name: prof.name,
      licenseNumber: prof.licenseNumber,
      statutoryBasis,
      referenceNo,
      reason,
      suspendedAt: now,
      authority: "Executive Board Registrar (Plenary Signoff)"
    });

    audit(req, "professional.suspend", { target: ["professional", prof.id], details: { reason, statutoryBasis, referenceNo } });
    res.json({ status: "success", data: prof });
  });

  app.post("/api/professionals/:id/reinstate", requireRole("admin"), (req, res) => {
    const prof = findProf(req.params.id);
    if (!prof) return fail(res, 404, "Practitioner not found.");
    if (prof.verificationStatus !== VerificationStatus.SUSPENDED) return fail(res, 409, "Practitioner is not suspended.");
    const today = new Date().toISOString().slice(0, 10);
    if (!prof.licenseExpiry || prof.licenseExpiry <= today) {
      return fail(res, 400, "Licence has expired. Ask the practitioner for a renewed licence and run a new verification.");
    }
    if (prof.verifiedUntil && prof.verifiedUntil <= today) {
      return fail(res, 400, "Re-verification is overdue. Ask the practitioner to resubmit documents.");
    }
    prof.verificationStatus = VerificationStatus.VERIFIED;
    delete prof.suspensionReason;
    logEvent(null, prof.id, req.user!.id, "reinstated", str(req.body.note, 1000), true);
    notify(accountOfProfile(prof.id), "Your profile has been reinstated", "You are visible in the directory again.");
    email({ userId: accountOfProfile(prof.id), template: "profile_reinstated" });
    audit(req, "professional.reinstate", { target: ["professional", prof.id] });
    res.json({ status: "success", data: prof });
  });

  // Admin overview of everyone with trust-related dates
  app.get("/api/admin/practitioners", requireRole("admin"), (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + WARN_DAYS * 86400_000).toISOString().slice(0, 10);
    const data = ctx.allProfessionals().map(p => ({
      id: p.id, name: p.name, role: p.role, specialization: p.specialization, licenseNumber: p.licenseNumber,
      verificationStatus: p.verificationStatus, licenseExpiry: p.licenseExpiry ?? null,
      verifiedAt: p.verifiedAt ?? null, verifiedUntil: p.verifiedUntil ?? null, suspensionReason: p.suspensionReason ?? null,
      flag:
        p.verificationStatus !== VerificationStatus.VERIFIED ? null
        : !p.licenseExpiry ? "no_expiry_on_file"
        : p.licenseExpiry <= today ? "licence_expired"
        : p.licenseExpiry <= soon ? "licence_expiring"
        : p.verifiedUntil && p.verifiedUntil <= soon ? "reverification_due"
        : null,
    }));
    res.json({ status: "success", data });
  });

  // ---------- Public licence lookup (minimal, verified-only) ----------
  app.get("/api/verify-license/:licenseNumber", (req, res) => {
    const lic = str(req.params.licenseNumber, 50).toLowerCase();
    const p = ctx.allProfessionals().find(x => x.licenseNumber.toLowerCase() === lic);
    if (!p || p.verificationStatus !== VerificationStatus.VERIFIED) {
      // Same answer for unknown, pending, rejected and suspended so status is not leaked.
      return res.json({ status: "success", data: { verified: false } });
    }
    res.json({
      status: "success",
      data: {
        verified: true, name: p.name, verificationScope: p.verificationScope ?? scopeFor(p.registryId ?? inferRegistryId(p.medicalCouncil ?? p.nursingCouncil)), registrationType: p.registrationType ?? "full", registryId: p.registryId ?? null, role: p.role, specialization: p.specialization,
        council: p.medicalCouncil ?? p.nursingCouncil, verifiedUntil: p.verifiedUntil ?? null,
      },
    });
  });

  // ---------- Complaints ----------
  app.get("/api/complaint-categories", (_req, res) => res.json({ status: "success", data: COMPLAINT_CATEGORIES }));

  app.post("/api/complaints", requireRole("patient"), (req, res) => {
    const professionalId = str(req.body.professionalId, 60);
    const category = str(req.body.category, 80);
    const description = str(req.body.description, 2000);
    const bookingId = req.body.bookingId ? str(req.body.bookingId, 60) : null;
    if (!findProf(professionalId)) return fail(res, 404, "Practitioner not found.");
    if (!COMPLAINT_CATEGORIES.includes(category)) return fail(res, 400, "Choose a complaint category.");
    if (description.length < 20) return fail(res, 400, "Please describe what happened (at least 20 characters).");
    const mine = ctx.bookings().filter(b => b.patientUserId === req.user!.id && b.professionalId === professionalId);
    if (mine.length === 0) return fail(res, 403, "You can only report practitioners you have booked.");
    if (bookingId && !mine.some(b => b.id === bookingId)) return fail(res, 400, "That booking is not yours.");
    const open = (db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE complainant_user_id = ? AND professional_id = ? AND status IN ('open','investigating')").get(req.user!.id, professionalId) as any).n;
    if (open > 0) return fail(res, 409, "You already have an open complaint about this practitioner.");

    const id = newId("cmp");
    db.prepare("INSERT INTO complaints (id,professional_id,complainant_user_id,booking_id,category,description,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, professionalId, req.user!.id, bookingId, category, description, new Date().toISOString());
    notifyAdmins("New complaint", `A patient reported ${findProf(professionalId).name} (${category}).`);
    audit(req, "complaint.create", { target: ["complaint", id], details: { professionalId, category } });
    res.status(201).json({ status: "success", message: "Your complaint was submitted. The medical board will review it.", data: { id } });
  });

  app.get("/api/complaints", requireAuth, (req, res) => {
    const u = req.user!;
    if (u.role === "admin") {
      const rows = db.prepare(
        `SELECT c.*, u.name AS complainantName FROM complaints c LEFT JOIN users u ON u.id = c.complainant_user_id ORDER BY c.created_at DESC`
      ).all().map((r: any) => ({ ...r, professionalName: findProf(r.professional_id)?.name }));
      return res.json({ status: "success", data: rows });
    }
    if (u.role === "patient") {
      const rows = db.prepare("SELECT id, professional_id, category, status, created_at, resolution FROM complaints WHERE complainant_user_id = ? ORDER BY created_at DESC").all(u.id);
      return res.json({ status: "success", data: rows });
    }
    return fail(res, 403, "You do not have permission to do this.");
  });

  app.post("/api/complaints/:id/resolve", requireRole("admin"), (req, res) => {
    const row = db.prepare("SELECT * FROM complaints WHERE id = ?").get(req.params.id) as any;
    if (!row) return fail(res, 404, "Complaint not found.");
    const outcome = req.body.outcome;
    const resolution = str(req.body.resolution, 1000);
    if (!["investigating", "upheld", "dismissed"].includes(outcome)) return fail(res, 400, "Outcome must be investigating, upheld or dismissed.");
    if (outcome !== "investigating" && !resolution) return fail(res, 400, "Write a short resolution note.");
    const done = outcome !== "investigating";
    db.prepare("UPDATE complaints SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ? WHERE id = ?")
      .run(outcome, resolution || null, done ? req.user!.id : null, done ? new Date().toISOString() : null, row.id);

    const prof = findProf(row.professional_id);
    if (outcome === "upheld" && prof) {
      logEvent(null, prof.id, req.user!.id, "complaint_upheld", resolution, true);
      notify(accountOfProfile(prof.id), "A complaint against you was upheld", resolution);
      if (req.body.suspend === true && prof.verificationStatus === VerificationStatus.VERIFIED) {
        prof.verificationStatus = VerificationStatus.SUSPENDED;
        prof.suspensionReason = `Complaint upheld: ${resolution}`;
        logEvent(null, prof.id, req.user!.id, "suspended", prof.suspensionReason, true);
      }
    }
    notify(row.complainant_user_id, "Update on your complaint", outcome === "investigating" ? "The medical board is investigating." : `Outcome: ${outcome}. ${resolution}`);
    audit(req, "complaint.resolve", { target: ["complaint", row.id], details: { outcome, suspended: req.body.suspend === true } });
    res.json({ status: "success" });
  });

  // ---------- Notifications ----------
  app.get("/api/notifications", requireAuth, (req, res) => {
    const rows = db.prepare("SELECT id, ts, title, body, is_read AS isRead FROM notifications WHERE user_id = ? ORDER BY ts DESC LIMIT 50").all(req.user!.id);
    res.json({ status: "success", data: rows });
  });

  app.post("/api/notifications/read-all", requireAuth, (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.user!.id);
    res.json({ status: "success" });
  });

  // ---------- Scheduled checks (expiry + re-verification) ----------
  const runChecks = () => {
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + WARN_DAYS * 86400_000).toISOString().slice(0, 10);
    for (const p of ctx.allProfessionals()) {
      if (p.verificationStatus !== VerificationStatus.VERIFIED) continue;
      const account = accountOfProfile(p.id);
      const expired = p.licenseExpiry && p.licenseExpiry <= today;
      const overdue = p.verifiedUntil && p.verifiedUntil <= today;
      if (expired || overdue) {
        const reason = expired ? `Licence expired on ${p.licenseExpiry}.` : `Re-verification was due on ${p.verifiedUntil}.`;
        p.verificationStatus = VerificationStatus.SUSPENDED;
        p.suspensionReason = reason;
        logEvent(null, p.id, null, "auto_suspended", reason, true);
        notify(account, "Your profile was suspended", `${reason} Upload your renewed documents to be reinstated.`);
        email({ userId: account, template: "profile_suspended", vars: { reason } });
        notifyAdmins("Practitioner auto-suspended", `${p.name}: ${reason}`);
        audit(null, "professional.auto_suspend", { actor: null, target: ["professional", p.id], details: { reason } });
        continue;
      }
      const warnKey = expired === false && p.licenseExpiry && p.licenseExpiry <= soon ? `licence:${p.licenseExpiry}`
        : p.verifiedUntil && p.verifiedUntil <= soon ? `reverify:${p.verifiedUntil}` : null;
      if (warnKey && p.lastWarning !== warnKey) {
        p.lastWarning = warnKey;
        const what = warnKey.startsWith("licence") ? `Your licence expires on ${p.licenseExpiry}.` : `Re-verification is due by ${p.verifiedUntil}.`;
        notify(account, "Action needed soon", `${what} Please upload renewed documents.`);
        email({ userId: account, template: "licence_expiry_soon", vars: { what } });
        notifyAdmins("Practitioner needs renewal", `${p.name}: ${what}`);
      }
    }
  };
  const scheduled = () => { runChecks(); ctx.persist(); };
  scheduled();
  setInterval(scheduled, 60 * 60 * 1000).unref();
}
