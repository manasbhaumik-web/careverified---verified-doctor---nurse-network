import crypto from "crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { VerificationStatus } from "../src/types";

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
`);

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
    } else if (decision === "reject") {
      if (!note) return fail(res, 400, "A reason is required to reject an application.");
      request.status = VerificationStatus.REJECTED;
      request.rejectionReason = note;
      prof.verificationStatus = VerificationStatus.REJECTED;
      logEvent(request.id, prof.id, actor.id, "rejected", note, true);
      notify(target, "Application rejected", note);
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
      prof.verifiedUntil = addMonths(now, REVERIFY_MONTHS).toISOString().slice(0, 10);
      delete prof.suspensionReason;
      logEvent(request.id, prof.id, actor.id, "registry_checked", registryReference);
      logEvent(request.id, prof.id, actor.id, "approved", note, true);
      notify(target, "You are verified", `Your profile is now public. Re-verification is due by ${prof.verifiedUntil}.`);
    } else {
      return fail(res, 400, "Decision must be approve, reject or request_info.");
    }

    request.reviewedBy = actor.id;
    request.reviewedAt = new Date().toISOString();
    audit(req, "verification.decision", { target: ["verification", request.id], details: { decision, profileId: prof.id } });
    res.json({ status: "success", message: `Decision recorded: ${decision}.`, data: { request, professional: prof } });
  });

  // ---------- Admin: suspend / reinstate ----------
  app.post("/api/professionals/:id/suspend", requireRole("admin"), (req, res) => {
    const prof = findProf(req.params.id);
    if (!prof) return fail(res, 404, "Practitioner not found.");
    const reason = str(req.body.reason, 1000);
    if (!reason) return fail(res, 400, "A reason is required.");
    if (prof.verificationStatus === VerificationStatus.SUSPENDED) return fail(res, 409, "Already suspended.");
    prof.verificationStatus = VerificationStatus.SUSPENDED;
    prof.suspensionReason = reason;
    logEvent(null, prof.id, req.user!.id, "suspended", reason, true);
    notify(accountOfProfile(prof.id), "Your profile has been suspended", reason);
    audit(req, "professional.suspend", { target: ["professional", prof.id], details: { reason } });
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
        verified: true, name: p.name, role: p.role, specialization: p.specialization,
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
        notifyAdmins("Practitioner needs renewal", `${p.name}: ${what}`);
      }
    }
  };
  const scheduled = () => { runChecks(); ctx.persist(); };
  scheduled();
  setInterval(scheduled, 60 * 60 * 1000).unref();
}
