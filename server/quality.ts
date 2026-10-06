import crypto from "crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { notify, notifyAdmins } from "./verification";
import { VerificationStatus } from "../src/types";

/**
 * Quality and safety: review moderation, support desk with response-time targets, blocking, incident reporting,
 * peer review and case audits, and practitioner CPD / specialty certificates.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category TEXT NOT NULL, subject TEXT NOT NULL, priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', target TEXT, created_at TEXT NOT NULL, first_response_due TEXT NOT NULL,
  first_response_at TEXT, resolved_at TEXT, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT NOT NULL, author_user_id TEXT NOT NULL, from_staff INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL, ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_user_id TEXT NOT NULL, blocked_user_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (blocker_user_id, blocked_user_id)
);
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY, reporter_user_id TEXT NOT NULL, kind TEXT NOT NULL, severity TEXT NOT NULL, description TEXT NOT NULL,
  related_type TEXT, related_id TEXT, status TEXT NOT NULL DEFAULT 'new', resolution TEXT, created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS incident_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id TEXT NOT NULL, actor_user_id TEXT, action TEXT NOT NULL, note TEXT, ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS peer_reviews (
  id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, author_professional_id TEXT NOT NULL,
  reviewer_professional_id TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', outcome TEXT, score INTEGER,
  comments TEXT, assigned_by TEXT, assigned_at TEXT NOT NULL, completed_at TEXT, UNIQUE (subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_peer_reviewer ON peer_reviews(reviewer_professional_id, status);
CREATE TABLE IF NOT EXISTS cpd_entries (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, points REAL NOT NULL,
  activity_date TEXT NOT NULL, provider TEXT, document_id TEXT, status TEXT NOT NULL DEFAULT 'pending', review_note TEXT,
  reviewed_by TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS specialty_certs (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, name TEXT NOT NULL, issuer TEXT NOT NULL, issued_date TEXT NOT NULL,
  expiry_date TEXT, document_id TEXT, status TEXT NOT NULL DEFAULT 'pending', review_note TEXT, reviewed_by TEXT, created_at TEXT NOT NULL
);
`);

const iso = () => new Date().toISOString();
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const dateOnly = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);

const SLA_HOURS: Record<string, number> = { urgent: 1, high: 4, normal: 24, low: 72 };
const CATEGORIES: Record<string, string> = {
  "Safety concern": "urgent", "Report a user": "high", "Payment problem": "high", "Account or login": "normal",
  "Technical problem": "normal", "Feedback": "low", "Other": "low",
};
const INCIDENT_KINDS = ["adverse_drug_event", "near_miss", "patient_harm", "misconduct", "privacy", "system", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const CPD_CATEGORIES = ["course", "conference", "publication", "teaching", "self-study"];
const cpdTarget = () => Number(process.env.CPD_ANNUAL_TARGET ?? 20);

/** A user's chat identity: practitioners by profile id, everyone else by user id. */
export const accountForChatId = (chatId: string): string | null =>
  (row("SELECT id FROM users WHERE profile_id = ?", chatId)?.id as string) ?? (row("SELECT id FROM users WHERE id = ?", chatId)?.id as string) ?? null;
export const isBlocked = (blockerUserId: string, otherUserId: string) =>
  !!row("SELECT 1 AS x FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?", blockerUserId, otherUserId);

interface Ctx {
  reviews: () => any[];
  findProfessional: (id: string) => any | undefined;
  allProfessionals: () => any[];
  bookings: () => any[];
  recalcRating: (professionalId: string) => void;
  chats: () => any[];
}

export function registerQualityRoutes(app: Application, ctx: Ctx) {
  const verifiedDoctorId = (id: string | null | undefined) => {
    const p = id ? ctx.findProfessional(id) : null;
    return p && p.role === "doctor" && p.verificationStatus === VerificationStatus.VERIFIED ? p : null;
  };
  const accountOfProfile = (profileId: string) => (row("SELECT id FROM users WHERE profile_id = ?", profileId)?.id as string) ?? null;
  const userName = (id: string) => (row("SELECT name FROM users WHERE id = ?", id)?.name as string) ?? "User";

  // =========================================================
  // Reviews: eligibility, reporting, moderation
  // =========================================================
  /** A visit can be reviewed once it is completed (signed notes) and not yet reviewed. */
  const eligibleVisits = (userId: string, professionalId: string) => {
    const reviewed = new Set(ctx.reviews().filter(r => r.patientUserId === userId).map(r => `${r.visitKind}:${r.visitId}`));
    const visits: { kind: "booking" | "consult"; id: string }[] = [];
    for (const b of ctx.bookings()) if (b.patientUserId === userId && b.professionalId === professionalId && b.status === "Completed" && b.paymentStatus === "Paid") visits.push({ kind: "booking", id: b.id });
    for (const c of rows("SELECT id FROM consults WHERE patient_user_id = ? AND professional_id = ? AND status = 'completed'", userId, professionalId)) visits.push({ kind: "consult", id: c.id });
    return visits.filter(v => !reviewed.has(`${v.kind}:${v.id}`));
  };

  app.get("/api/reviews/eligibility", requireRole("patient"), (req, res) => {
    const visits = eligibleVisits(req.user!.id, str(req.query.professionalId, 60));
    res.json({ status: "success", data: { eligible: visits.length > 0, visit: visits[0] ?? null } });
  });

  app.post("/api/reviews/:id/report", requireRole("practitioner"), (req, res) => {
    const rev = ctx.reviews().find(r => r.id === req.params.id);
    if (!rev || rev.professionalId !== req.user!.profileId) return fail(res, 404, "Review not found.");
    const reason = str(req.body.reason, 500);
    if (reason.length < 10) return fail(res, 400, "Explain why this review breaks the rules (at least 10 characters).");
    if (rev.reportedAt) return fail(res, 409, "This review has already been reported.");
    rev.reportedAt = iso(); rev.reportReason = reason;
    notifyAdmins("Review reported", `${ctx.findProfessional(rev.professionalId)?.name} reported a review: ${reason}`);
    audit(req, "review.report", { target: ["review", rev.id] });
    res.json({ status: "success", message: "Thank you. The board will look at it. The review stays visible unless it is found to break the rules." });
  });

  app.get("/api/admin/reviews", requireRole("admin"), (req, res) => {
    const filter = req.query.filter;
    let list = ctx.reviews().map(r => ({ ...r, professionalName: ctx.findProfessional(r.professionalId)?.name }));
    if (filter === "reported") list = list.filter(r => r.reportedAt && !r.moderatedAt);
    res.json({ status: "success", data: list.sort((a, b) => String(b.reportedAt ?? b.date).localeCompare(String(a.reportedAt ?? a.date))) });
  });

  app.post("/api/admin/reviews/:id/moderate", requireRole("admin"), (req, res) => {
    const rev = ctx.reviews().find(r => r.id === req.params.id);
    if (!rev) return fail(res, 404, "Review not found.");
    const action = req.body.action, reason = str(req.body.reason, 500);
    if (!["hide", "keep", "restore"].includes(action)) return fail(res, 400, "Action must be hide, keep or restore.");
    if (!reason) return fail(res, 400, "Record a reason for the decision.");
    if (action === "hide") rev.status = "hidden"; else rev.status = "published";
    rev.moderatedAt = iso(); rev.moderationReason = reason; rev.moderatedBy = req.user!.id;
    ctx.recalcRating(rev.professionalId);
    const pa = accountOfProfile(rev.professionalId);
    if (action === "hide") notify(rev.patientUserId, "Your review was removed", `It broke our review rules: ${reason}`);
    if (pa && rev.reportedAt) notify(pa, "Your review report was decided", action === "hide" ? "The review was removed." : "The review was kept.");
    audit(req, "review.moderate", { target: ["review", rev.id], details: { action, reason } });
    res.json({ status: "success" });
  });

  // =========================================================
  // Support desk (with response-time targets)
  // =========================================================
  app.get("/api/support/categories", (_req, res) => {
    res.json({ status: "success", data: Object.entries(CATEGORIES).map(([name, priority]) => ({ name, priority, respondWithinHours: SLA_HOURS[priority] })) });
  });

  const ticketView = (t: any) => ({
    id: t.id, category: t.category, subject: t.subject, priority: t.priority, status: t.status, createdAt: t.created_at,
    firstResponseDue: t.first_response_due, firstResponseAt: t.first_response_at, resolvedAt: t.resolved_at, updatedAt: t.updated_at, target: t.target ?? null,
    overdue: !t.first_response_at && t.status !== "resolved" && Date.parse(t.first_response_due) < Date.now(),
  });

  app.post("/api/support/tickets", requireAuth, (req, res) => {
    const category = str(req.body.category, 60), subject = str(req.body.subject, 120), body = str(req.body.body, 3000);
    if (!CATEGORIES[category]) return fail(res, 400, "Choose a category.");
    if (subject.length < 3 || body.length < 10) return fail(res, 400, "Add a subject and describe the problem (at least 10 characters).");
    const open = row("SELECT COUNT(*) AS n FROM tickets WHERE user_id = ? AND status <> 'resolved'", req.user!.id).n;
    if (open >= 10) return fail(res, 429, "You have many open tickets. Please wait for replies or close some.");
    const priority = CATEGORIES[category];
    const id = newId("tkt");
    const due = new Date(Date.now() + SLA_HOURS[priority] * 3600_000).toISOString();
    db.prepare("INSERT INTO tickets (id,user_id,category,subject,priority,target,created_at,first_response_due,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, category, subject, priority, str(req.body.target, 100) || null, iso(), due, iso());
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_user_id, from_staff, body, ts) VALUES (?,?,0,?,?)").run(id, req.user!.id, body, iso());
    notifyAdmins(priority === "urgent" ? "URGENT support ticket" : "New support ticket", `${category}: ${subject}`);
    audit(req, "ticket.create", { target: ["ticket", id], details: { category } });
    res.status(201).json({ status: "success", data: { id, respondWithinHours: SLA_HOURS[priority] } });
  });

  app.get("/api/support/tickets", requireAuth, (req, res) => {
    const list = rows("SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50", req.user!.id).map(ticketView);
    res.json({ status: "success", data: list });
  });

  const loadTicketFor = (req: any, res: Response) => {
    const t = row("SELECT * FROM tickets WHERE id = ?", req.params.id);
    if (!t || (t.user_id !== req.user.id && req.user.role !== "admin")) { fail(res, 404, "Ticket not found."); return null; }
    return t;
  };

  app.get("/api/support/tickets/:id", requireAuth, (req, res) => {
    const t = loadTicketFor(req, res); if (!t) return;
    const messages = rows("SELECT id, from_staff AS fromStaff, body, ts FROM ticket_messages WHERE ticket_id = ? ORDER BY id", t.id);
    res.json({ status: "success", data: { ...ticketView(t), requester: req.user!.role === "admin" ? userName(t.user_id) : undefined, messages } });
  });

  app.post("/api/support/tickets/:id/reply", requireAuth, (req, res) => {
    const t = loadTicketFor(req, res); if (!t) return;
    const body = str(req.body.body, 3000);
    if (!body) return fail(res, 400, "Write a message.");
    const staff = req.user!.role === "admin";
    if (t.status === "resolved" && !staff && Date.now() - Date.parse(t.resolved_at) > 7 * 86400_000) return fail(res, 409, "This ticket was closed more than a week ago. Please open a new one.");
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_user_id, from_staff, body, ts) VALUES (?,?,?,?,?)").run(t.id, req.user!.id, staff ? 1 : 0, body, iso());
    if (staff) {
      db.prepare("UPDATE tickets SET status = 'pending', first_response_at = COALESCE(first_response_at, ?), resolved_at = NULL, updated_at = ? WHERE id = ?").run(iso(), iso(), t.id);
      notify(t.user_id, "Support replied to your ticket", t.subject);
    } else {
      db.prepare("UPDATE tickets SET status = 'open', resolved_at = NULL, updated_at = ? WHERE id = ?").run(iso(), t.id);
      if (t.first_response_at) notifyAdmins("Customer replied", t.subject);
    }
    audit(req, "ticket.reply", { target: ["ticket", t.id] });
    res.status(201).json({ status: "success" });
  });

  app.post("/api/support/tickets/:id/resolve", requireAuth, (req, res) => {
    const t = loadTicketFor(req, res); if (!t) return;
    db.prepare("UPDATE tickets SET status='resolved', resolved_at=?, updated_at=? WHERE id=?").run(iso(), iso(), t.id);
    if (req.user!.role === "admin") notify(t.user_id, "Your ticket was marked resolved", `${t.subject}. Reply to reopen it within 7 days.`);
    audit(req, "ticket.resolve", { target: ["ticket", t.id] });
    res.json({ status: "success" });
  });

  app.get("/api/admin/support/tickets", requireRole("admin"), (req, res) => {
    const status = req.query.status === "resolved" ? "resolved" : "active";
    const list = rows(`SELECT t.*, u.name AS requester FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE ${status === "resolved" ? "t.status = 'resolved'" : "t.status <> 'resolved'"} ORDER BY t.first_response_at IS NOT NULL, t.first_response_due ASC LIMIT 200`);
    const all = rows("SELECT created_at, first_response_at, first_response_due, status FROM tickets");
    const responded = all.filter(t => t.first_response_at).map(t => Date.parse(t.first_response_at) - Date.parse(t.created_at)).sort((a, b) => a - b);
    const metTarget = all.filter(t => t.first_response_at && t.first_response_at <= t.first_response_due).length;
    res.json({ status: "success", data: {
      tickets: list.map(t => ({ ...ticketView(t), requester: t.requester })),
      stats: {
        open: all.filter(t => t.status !== "resolved").length,
        overdue: all.filter(t => !t.first_response_at && t.status !== "resolved" && Date.parse(t.first_response_due) < Date.now()).length,
        medianFirstResponseMinutes: responded.length ? Math.round(responded[Math.floor(responded.length / 2)] / 60000) : null,
        targetMetPct: responded.length ? Math.round(metTarget / responded.length * 100) : null,
      },
    } });
  });

  app.post("/api/admin/support/tickets/:id/priority", requireRole("admin"), (req, res) => {
    const t = row("SELECT * FROM tickets WHERE id = ?", req.params.id);
    if (!t) return fail(res, 404, "Ticket not found.");
    const priority = req.body.priority;
    if (!SLA_HOURS[priority]) return fail(res, 400, "Invalid priority.");
    const due = new Date(Date.parse(t.created_at) + SLA_HOURS[priority] * 3600_000).toISOString();
    db.prepare("UPDATE tickets SET priority = ?, first_response_due = ? WHERE id = ?").run(priority, due, t.id);
    res.json({ status: "success" });
  });

  // =========================================================
  // Chat threads and blocking
  // =========================================================
  app.get("/api/chats/threads", requireRole("patient", "practitioner"), (req, res) => {
    const u = req.user!;
    const out = new Map<string, { id: string; name: string; role: string; blocked: boolean }>();
    if (u.role === "patient") {
      const pros = new Set<string>();
      for (const b of ctx.bookings()) if (b.patientUserId === u.id && b.paymentStatus === "Paid") pros.add(b.professionalId);
      for (const c of rows("SELECT DISTINCT professional_id FROM consults WHERE patient_user_id = ? AND professional_id IS NOT NULL", u.id)) pros.add(c.professional_id);
      for (const id of pros) { const p = ctx.findProfessional(id); const acct = accountOfProfile(id); if (p) out.set(id, { id, name: p.name, role: p.specialization, blocked: !!acct && isBlocked(u.id, acct) }); }
    } else if (u.profileId) {
      const patients = new Set<string>();
      for (const b of ctx.bookings()) if (b.professionalId === u.profileId && b.paymentStatus === "Paid" && b.patientUserId) patients.add(b.patientUserId);
      for (const c of rows("SELECT DISTINCT patient_user_id FROM consults WHERE professional_id = ?", u.profileId)) patients.add(c.patient_user_id);
      for (const id of patients) out.set(id, { id, name: userName(id), role: "Patient", blocked: isBlocked(u.id, id) });
    }
    // Anyone who has already messaged you also appears, so you can reply to or block them
    const me = u.profileId ?? u.id;
    for (const m of ctx.chats()) {
      if (m.receiverId !== me || out.has(m.senderId)) continue;
      const acct = accountForChatId(m.senderId);
      if (!acct) continue;
      out.set(m.senderId, { id: m.senderId, name: m.senderName || userName(acct), role: ctx.findProfessional(m.senderId)?.specialization ?? "Patient", blocked: isBlocked(u.id, acct) });
    }
    res.json({ status: "success", data: [...out.values()] });
  });

  app.post("/api/blocks", requireRole("patient", "practitioner"), (req, res) => {
    const target = accountForChatId(str(req.body.chatId, 60));
    if (!target || target === req.user!.id) return fail(res, 404, "Person not found.");
    if (row("SELECT role FROM users WHERE id = ?", target)?.role === "admin") return fail(res, 400, "You cannot block the support team.");
    db.prepare("INSERT OR IGNORE INTO user_blocks (blocker_user_id, blocked_user_id, created_at) VALUES (?,?,?)").run(req.user!.id, target, iso());
    audit(req, "user.block", { target: ["user", target] });
    res.json({ status: "success" });
  });
  app.delete("/api/blocks/:chatId", requireRole("patient", "practitioner"), (req, res) => {
    const target = accountForChatId(req.params.chatId);
    if (target) db.prepare("DELETE FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?").run(req.user!.id, target);
    res.json({ status: "success" });
  });

  // =========================================================
  // Incident reporting
  // =========================================================
  const incidentView = (i: any, withEvents = false) => ({
    id: i.id, kind: i.kind, severity: i.severity, description: i.description, relatedType: i.related_type, relatedId: i.related_id,
    status: i.status, resolution: i.resolution, createdAt: i.created_at, resolvedAt: i.resolved_at,
    ...(withEvents ? { events: rows("SELECT e.action, e.note, e.ts, u.name AS actor FROM incident_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.incident_id = ? ORDER BY e.id", i.id) } : {}),
  });
  const addEvent = (id: string, actor: string | null, action: string, note?: string) =>
    db.prepare("INSERT INTO incident_events (incident_id, actor_user_id, action, note, ts) VALUES (?,?,?,?,?)").run(id, actor, action, note ?? null, iso());

  app.post("/api/incidents", requireRole("practitioner", "admin"), (req, res) => {
    const kind = req.body.kind, severity = req.body.severity, description = str(req.body.description, 4000);
    if (!INCIDENT_KINDS.includes(kind) || !SEVERITIES.includes(severity)) return fail(res, 400, "Choose the type and severity.");
    if (description.length < 20) return fail(res, 400, "Describe what happened (at least 20 characters).");
    const id = newId("inc");
    db.prepare("INSERT INTO incidents (id,reporter_user_id,kind,severity,description,related_type,related_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, kind, severity, description, str(req.body.relatedType, 30) || null, str(req.body.relatedId, 60) || null, iso());
    addEvent(id, req.user!.id, "reported");
    notifyAdmins(severity === "critical" || severity === "high" ? `${severity.toUpperCase()} incident reported` : "Incident reported", `${kind.replace(/_/g, " ")}: ${description.slice(0, 120)}`);
    audit(req, "incident.report", { target: ["incident", id], details: { kind, severity } });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.get("/api/incidents/mine", requireRole("practitioner", "admin"), (req, res) => {
    res.json({ status: "success", data: rows("SELECT * FROM incidents WHERE reporter_user_id = ? ORDER BY created_at DESC LIMIT 50", req.user!.id).map(i => incidentView(i)) });
  });

  app.get("/api/admin/incidents", requireRole("admin"), (_req, res) => {
    const list = rows(`SELECT i.*, u.name AS reporter FROM incidents i LEFT JOIN users u ON u.id = i.reporter_user_id
      ORDER BY CASE i.status WHEN 'resolved' THEN 2 WHEN 'closed' THEN 3 ELSE 0 END, CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC LIMIT 200`);
    res.json({ status: "success", data: list.map(i => ({ ...incidentView(i, true), reporter: i.reporter })) });
  });

  app.post("/api/admin/incidents/:id/update", requireRole("admin"), (req, res) => {
    const i = row("SELECT * FROM incidents WHERE id = ?", req.params.id);
    if (!i) return fail(res, 404, "Incident not found.");
    const status = req.body.status, note = str(req.body.note, 2000);
    if (!["investigating", "resolved", "closed"].includes(status)) return fail(res, 400, "Invalid status.");
    if ((status === "resolved" || status === "closed") && !note) return fail(res, 400, "Record the outcome before resolving or closing.");
    const done = status !== "investigating";
    db.prepare("UPDATE incidents SET status = ?, resolution = COALESCE(?, resolution), resolved_at = ? WHERE id = ?").run(status, done ? note : null, done ? iso() : null, i.id);
    addEvent(i.id, req.user!.id, status, note);
    notify(i.reporter_user_id, `Incident ${status}`, note || "The board is investigating your report.");
    audit(req, "incident.update", { target: ["incident", i.id], details: { status } });
    res.json({ status: "success" });
  });

  // =========================================================
  // Peer review and case audits
  // =========================================================
  const caseContent = (type: string, id: string) => {
    if (type === "encounter") {
      const e = row("SELECT subjective, objective, assessment, plan FROM encounters WHERE id = ? AND signed_at IS NOT NULL", id);
      return e ? { kind: "Consultation note", ...e } : null;
    }
    if (type === "prescription") {
      const p = row("SELECT diagnosis, items, notes, record_checked, warnings, issued_at FROM prescriptions WHERE id = ?", id);
      if (!p) return null;
      const w = p.warnings ? JSON.parse(p.warnings) : { warnings: [], overrides: {} };
      return { kind: "Prescription", diagnosis: p.diagnosis, items: JSON.parse(p.items), notes: p.notes, patientRecordWasShared: !!p.record_checked, safetyWarnings: w.warnings, overrideReasons: w.overrides };
    }
    return null;
  };
  const authorOf = (type: string, id: string): string | null =>
    type === "encounter" ? row("SELECT professional_id AS a FROM encounters WHERE id = ?", id)?.a ?? null
    : type === "prescription" ? row("SELECT professional_id AS a FROM prescriptions WHERE id = ?", id)?.a ?? null : null;

  function assign(type: string, id: string, reviewerId: string, source: string, by: string | null): { ok: boolean; error?: string; id?: string } {
    const author = authorOf(type, id);
    if (!author) return { ok: false, error: "Case not found." };
    if (reviewerId === author) return { ok: false, error: "A reviewer cannot review their own work." };
    if (!verifiedDoctorId(reviewerId)) return { ok: false, error: "The reviewer must be a verified doctor." };
    if (row("SELECT 1 AS x FROM peer_reviews WHERE subject_type = ? AND subject_id = ?", type, id)) return { ok: false, error: "This case is already assigned." };
    const pid = newId("prv");
    db.prepare("INSERT INTO peer_reviews (id,subject_type,subject_id,author_professional_id,reviewer_professional_id,source,assigned_by,assigned_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(pid, type, id, author, reviewerId, source, by, iso());
    notify(accountOfProfile(reviewerId), "A case needs your peer review", "Open Quality & CPD to review it. Patient details are hidden.");
    return { ok: true, id: pid };
  }

  const pickReviewer = (author: string): string | null => {
    const candidates = ctx.allProfessionals().filter(p => p.role === "doctor" && p.verificationStatus === VerificationStatus.VERIFIED && p.id !== author)
      .map(p => ({ id: p.id, load: row("SELECT COUNT(*) AS n FROM peer_reviews WHERE reviewer_professional_id = ? AND status = 'pending'", p.id).n as number }))
      .sort((a, b) => a.load - b.load);
    return candidates[0]?.id ?? null;
  };

  app.post("/api/admin/peer-reviews", requireRole("admin"), (req, res) => {
    const type = req.body.subjectType, id = str(req.body.subjectId, 60);
    if (!["encounter", "prescription"].includes(type)) return fail(res, 400, "Subject must be an encounter or prescription.");
    const author = authorOf(type, id);
    const reviewer = str(req.body.reviewerProfessionalId, 60) || (author ? pickReviewer(author) : null);
    if (!reviewer) return fail(res, 400, "No eligible reviewer is available.");
    const r = assign(type, id, reviewer, "manual", req.user!.id);
    if (!r.ok) return fail(res, 400, r.error!);
    audit(req, "peerreview.assign", { target: ["peer_review", r.id!] });
    res.status(201).json({ status: "success", data: { id: r.id } });
  });

  // Random sample of signed work from the last N days, assigned to the least-loaded eligible peer
  app.post("/api/admin/audits/sample", requireRole("admin"), (req, res) => {
    const type = req.body.subjectType === "encounter" ? "encounter" : "prescription";
    const days = Math.min(90, Math.max(1, Math.trunc(Number(req.body.days)) || 30));
    const count = Math.min(50, Math.max(1, Math.trunc(Number(req.body.count)) || 5));
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const pool = type === "prescription"
      ? rows("SELECT id FROM prescriptions WHERE issued_at > ? AND id NOT IN (SELECT subject_id FROM peer_reviews WHERE subject_type = 'prescription')", since)
      : rows("SELECT id FROM encounters WHERE signed_at > ? AND id NOT IN (SELECT subject_id FROM peer_reviews WHERE subject_type = 'encounter')", since);
    // Fisher-Yates with crypto randomness
    for (let i = pool.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    let assigned = 0, skipped = 0;
    for (const c of pool.slice(0, count)) {
      const author = authorOf(type, c.id)!;
      const reviewer = pickReviewer(author);
      if (reviewer && assign(type, c.id, reviewer, "audit", req.user!.id).ok) assigned++; else skipped++;
    }
    audit(req, "audit.sample", { details: { type, days, count, assigned, skipped, pool: pool.length } });
    res.json({ status: "success", data: { assigned, skipped, available: pool.length } });
  });

  app.get("/api/peer-reviews/mine", requireRole("practitioner"), (req, res) => {
    const list = rows("SELECT id, subject_type, source, status, assigned_at, completed_at, outcome FROM peer_reviews WHERE reviewer_professional_id = ? ORDER BY status = 'done', assigned_at DESC LIMIT 50", req.user!.profileId ?? "");
    res.json({ status: "success", data: list });
  });

  // Feedback about my own work (reviewer stays anonymous)
  app.get("/api/peer-reviews/about-me", requireRole("practitioner"), (req, res) => {
    const list = rows("SELECT id, subject_type, outcome, score, comments, completed_at FROM peer_reviews WHERE author_professional_id = ? AND status = 'done' ORDER BY completed_at DESC LIMIT 50", req.user!.profileId ?? "");
    res.json({ status: "success", data: list });
  });

  app.get("/api/peer-reviews/:id", requireRole("practitioner"), (req, res) => {
    const pr = row("SELECT * FROM peer_reviews WHERE id = ? AND reviewer_professional_id = ?", req.params.id, req.user!.profileId ?? "");
    if (!pr) return fail(res, 404, "Review not found.");
    audit(req, "peerreview.view", { target: ["peer_review", pr.id] });
    // The author and the patient are deliberately not included.
    res.json({ status: "success", data: { id: pr.id, status: pr.status, subjectType: pr.subject_type, content: caseContent(pr.subject_type, pr.subject_id), outcome: pr.outcome, score: pr.score, comments: pr.comments } });
  });

  app.post("/api/peer-reviews/:id/submit", requireRole("practitioner"), (req, res) => {
    const pr = row("SELECT * FROM peer_reviews WHERE id = ? AND reviewer_professional_id = ?", req.params.id, req.user!.profileId ?? "");
    if (!pr) return fail(res, 404, "Review not found.");
    if (pr.status === "done") return fail(res, 409, "Already submitted.");
    const outcome = req.body.outcome, score = Math.trunc(Number(req.body.score)), comments = str(req.body.comments, 3000);
    if (!["no_concerns", "minor_concerns", "significant_concerns"].includes(outcome)) return fail(res, 400, "Choose an outcome.");
    if (!(score >= 1 && score <= 5)) return fail(res, 400, "Score must be 1 to 5.");
    if (outcome !== "no_concerns" && comments.length < 20) return fail(res, 400, "Explain your concerns (at least 20 characters).");
    db.prepare("UPDATE peer_reviews SET status='done', outcome=?, score=?, comments=?, completed_at=? WHERE id=?").run(outcome, score, comments || null, iso(), pr.id);
    notify(accountOfProfile(pr.author_professional_id), "Peer review of your work is complete", outcome === "no_concerns" ? "No concerns were raised." : "Open Quality & CPD to read the feedback.");
    if (outcome === "significant_concerns") {
      const id = newId("inc");
      db.prepare("INSERT INTO incidents (id,reporter_user_id,kind,severity,description,related_type,related_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
        .run(id, req.user!.id, "other", "high", `Peer review raised significant concerns about a ${pr.subject_type}. Reviewer comments: ${comments}`, pr.subject_type, pr.subject_id, iso());
      addEvent(id, req.user!.id, "reported", "Opened automatically from a peer review");
      notifyAdmins("HIGH incident reported", "A peer review raised significant concerns.");
    }
    audit(req, "peerreview.submit", { target: ["peer_review", pr.id], details: { outcome, score } });
    res.json({ status: "success" });
  });

  app.get("/api/admin/peer-reviews", requireRole("admin"), (_req, res) => {
    const list = rows("SELECT * FROM peer_reviews ORDER BY status = 'done', assigned_at DESC LIMIT 200").map(r => ({
      id: r.id, subjectType: r.subject_type, source: r.source, status: r.status, outcome: r.outcome, score: r.score, comments: r.comments,
      author: ctx.findProfessional(r.author_professional_id)?.name, reviewer: ctx.findProfessional(r.reviewer_professional_id)?.name,
      assignedAt: r.assigned_at, completedAt: r.completed_at,
    }));
    res.json({ status: "success", data: list });
  });

  // =========================================================
  // CPD and specialty certificates
  // =========================================================
  const ownDoc = (docId: unknown, userId: string) => {
    if (!docId) return null;
    const d = row("SELECT id FROM documents WHERE id = ? AND owner_id = ?", String(docId), userId);
    return d ? d.id : undefined;
  };
  const yearStart = () => `${new Date().getFullYear()}-01-01`;

  app.get("/api/me/credentials", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return res.json({ status: "success", data: null });
    const cpd = rows("SELECT * FROM cpd_entries WHERE profile_id = ? ORDER BY activity_date DESC", pid);
    const points = cpd.filter(c => c.status === "approved" && c.activity_date >= yearStart()).reduce((s, c) => s + c.points, 0);
    res.json({ status: "success", data: {
      target: cpdTarget(), year: new Date().getFullYear(), pointsApproved: points,
      pointsPending: cpd.filter(c => c.status === "pending" && c.activity_date >= yearStart()).reduce((s, c) => s + c.points, 0),
      entries: cpd, certs: rows("SELECT * FROM specialty_certs WHERE profile_id = ? ORDER BY created_at DESC", pid),
      reviews: (() => { const mine = ctx.reviews().filter(r => r.professionalId === pid && r.status !== "hidden"); return { count: mine.length, average: mine.length ? Number((mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(2)) : null }; })(),
    } });
  });

  app.post("/api/me/cpd", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return fail(res, 403, "No professional profile.");
    const title = str(req.body.title, 150), category = req.body.category, points = Number(req.body.points), date = dateOnly(req.body.activityDate);
    if (!title || !CPD_CATEGORIES.includes(category)) return fail(res, 400, "Enter a title and choose a category.");
    if (!(points > 0 && points <= 50)) return fail(res, 400, "Points must be between 0.5 and 50.");
    if (!date || date > new Date().toISOString().slice(0, 10)) return fail(res, 400, "Enter the activity date (not in the future).");
    const doc = ownDoc(req.body.documentId, req.user!.id);
    if (doc === undefined) return fail(res, 400, "That evidence file is not yours.");
    const id = newId("cpd");
    db.prepare("INSERT INTO cpd_entries (id,profile_id,title,category,points,activity_date,provider,document_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, pid, title, category, points, date, str(req.body.provider, 120) || null, doc, iso());
    notifyAdmins("CPD entry to verify", `${ctx.findProfessional(pid)?.name}: ${title} (${points} pts)`);
    res.status(201).json({ status: "success", data: { id } });
  });

  app.delete("/api/me/cpd/:id", requireRole("practitioner"), (req, res) => {
    const r = db.prepare("DELETE FROM cpd_entries WHERE id = ? AND profile_id = ? AND status = 'pending'").run(req.params.id, req.user!.profileId ?? "");
    if (!r.changes) return fail(res, 404, "Only your pending entries can be removed.");
    res.json({ status: "success" });
  });

  app.post("/api/me/specialty-certs", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return fail(res, 403, "No professional profile.");
    const name = str(req.body.name, 150), issuer = str(req.body.issuer, 150), issued = dateOnly(req.body.issuedDate);
    const expiry = req.body.expiryDate ? dateOnly(req.body.expiryDate) : null;
    if (!name || !issuer || !issued) return fail(res, 400, "Name, issuer and issue date are required.");
    if (req.body.expiryDate && !expiry) return fail(res, 400, "Invalid expiry date.");
    const doc = ownDoc(req.body.documentId, req.user!.id);
    if (!doc) return fail(res, 400, "Upload the certificate first and attach it.");
    const id = newId("cert");
    db.prepare("INSERT INTO specialty_certs (id,profile_id,name,issuer,issued_date,expiry_date,document_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, pid, name, issuer, issued, expiry, doc, iso());
    notifyAdmins("Specialty certificate to verify", `${ctx.findProfessional(pid)?.name}: ${name}`);
    res.status(201).json({ status: "success", data: { id } });
  });

  // Public: only admin-verified, unexpired certificates are shown on a profile
  app.get("/api/professionals/:id/credentials", (req, res) => {
    const p = ctx.findProfessional(req.params.id);
    if (!p || p.verificationStatus !== VerificationStatus.VERIFIED) return res.json({ status: "success", data: [] });
    const today = new Date().toISOString().slice(0, 10);
    const list = rows("SELECT name, issuer, issued_date, expiry_date FROM specialty_certs WHERE profile_id = ? AND status = 'approved' AND (expiry_date IS NULL OR expiry_date > ?)", p.id, today);
    res.json({ status: "success", data: list });
  });

  app.get("/api/admin/credentials", requireRole("admin"), (_req, res) => {
    const withName = (r: any) => ({ ...r, professionalName: ctx.findProfessional(r.profile_id)?.name });
    const start = yearStart();
    const doctors = ctx.allProfessionals().filter(p => p.verificationStatus === VerificationStatus.VERIFIED && p.role === "doctor");
    res.json({ status: "success", data: {
      pendingCpd: rows("SELECT * FROM cpd_entries WHERE status = 'pending' ORDER BY created_at").map(withName),
      pendingCerts: rows("SELECT * FROM specialty_certs WHERE status = 'pending' ORDER BY created_at").map(withName),
      target: cpdTarget(),
      compliance: doctors.map(d => ({
        id: d.id, name: d.name,
        points: (row("SELECT COALESCE(SUM(points),0) AS s FROM cpd_entries WHERE profile_id = ? AND status = 'approved' AND activity_date >= ?", d.id, start).s as number),
      })),
    } });
  });

  const decide = (table: "cpd_entries" | "specialty_certs", kind: string) => (req: any, res: Response) => {
    const r = row(`SELECT * FROM ${table} WHERE id = ?`, req.params.id);
    if (!r) return fail(res, 404, "Entry not found.");
    if (r.status !== "pending") return fail(res, 409, "Already decided.");
    const decision = req.body.decision, note = str(req.body.note, 500);
    if (!["approved", "rejected"].includes(decision)) return fail(res, 400, "Decision must be approved or rejected.");
    if (decision === "rejected" && !note) return fail(res, 400, "Give a reason for rejecting.");
    db.prepare(`UPDATE ${table} SET status = ?, review_note = ?, reviewed_by = ? WHERE id = ?`).run(decision, note || null, req.user!.id, r.id);
    notify(accountOfProfile(r.profile_id), `${kind} ${decision}`, `${r.title ?? r.name}${note ? `: ${note}` : ""}`);
    audit(req, `${kind.toLowerCase().replace(/ /g, "_")}.${decision}`, { target: [table, r.id] });
    res.json({ status: "success" });
  };
  app.post("/api/admin/cpd/:id/review", requireRole("admin"), decide("cpd_entries", "CPD entry"));
  app.post("/api/admin/specialty-certs/:id/review", requireRole("admin"), decide("specialty_certs", "Specialty certificate"));
}
