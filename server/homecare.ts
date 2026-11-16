import type { Application, Request, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { notify } from "./verification";
import { presentCredential } from "./publicLookup";
import { refundPayment, type PaymentRow, type Payable } from "./payments";
import { refundPolicy } from "./paymentPolicy";
import { VerificationStatus } from "../src/types";
import { str, fail, row, rows, newId } from "./util";
import { type VisitStatus, canTransition, checkRequest, clashes, hasStarted, isExpired, priceSen } from "./homecareRules";

/**
 * Home-care visits for families.
 *
 * A family (a patient account) keeps a list of people it cares for, asks a verified caregiver for a visit, the caregiver accepts or declines,
 * the family pays, and the caregiver completes the visit with a note the family can read. See docs/HOMECARE.md and homecareRules.ts.
 * Caregivers are practitioner accounts whose profile role is "caregiver" (see server/caregiverTier.ts).
 */

db.exec(`
CREATE TABLE IF NOT EXISTS care_recipients (
  id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, name TEXT NOT NULL, relationship TEXT, birth_year INTEGER,
  address TEXT, city TEXT, state TEXT, needs TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_care_rec_owner ON care_recipients(owner_user_id, active);
CREATE TABLE IF NOT EXISTS care_visit_requests (
  id TEXT PRIMARY KEY, family_user_id TEXT NOT NULL, recipient_id TEXT NOT NULL, caregiver_profile_id TEXT NOT NULL,
  date TEXT NOT NULL, start_time TEXT NOT NULL, hours INTEGER NOT NULL, rate_sen INTEGER NOT NULL, subtotal_sen INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested', decline_reason TEXT, family_note TEXT, visit_note TEXT, payment_id TEXT,
  accepted_at TEXT, completed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_care_req_family ON care_visit_requests(family_user_id, status);
CREATE INDEX IF NOT EXISTS idx_care_req_cg ON care_visit_requests(caregiver_profile_id, date);
`);

interface Ctx {
  allProfessionals: () => any[];
  findProfessional: (id: string) => any | undefined;
  paymentRegion: (userId: string) => "MY" | "INTL";
}

const iso = () => new Date().toISOString();
const MAX_RECIPIENTS = 10;

// ---------- views ----------
const recipientView = (r: any) => ({
  id: r.id, name: r.name, relationship: r.relationship ?? null, birthYear: r.birth_year ?? null,
  address: r.address ?? null, city: r.city ?? null, state: r.state ?? null, needs: r.needs ?? null,
});

const accountOfProfile = (profileId: string): string | null => (row("SELECT id FROM users WHERE profile_id = ?", profileId)?.id as string | undefined) ?? null;

/** A request as the family sees it, or the caregiver sees it. The caregiver gets the address only once the visit is paid for. */
function requestView(r: any, ctx: Ctx, viewer: "family" | "caregiver" | "admin") {
  const cg = ctx.findProfessional(r.caregiver_profile_id);
  const rec = row("SELECT * FROM care_recipients WHERE id = ?", r.recipient_id);
  const revealAddress = viewer !== "caregiver" || r.status === "confirmed" || r.status === "completed";
  const fam = viewer === "caregiver" ? row("SELECT name FROM users WHERE id = ?", r.family_user_id) : null;
  return {
    id: r.id, status: r.status, date: r.date, startTime: r.start_time, hours: r.hours, ratePerHour: r.rate_sen / 100, total: r.subtotal_sen / 100,
    caregiver: { id: r.caregiver_profile_id, name: cg?.name ?? "Caregiver" },
    recipient: rec ? { id: rec.id, name: rec.name, relationship: rec.relationship ?? null, needs: rec.needs ?? null,
      ...(revealAddress ? { address: rec.address ?? null, city: rec.city ?? null, state: rec.state ?? null } : {}) } : null,
    familyName: fam?.name ?? undefined,
    familyNote: r.family_note ?? null, declineReason: r.decline_reason ?? null, visitNote: r.visit_note ?? null,
    paymentId: viewer === "family" ? r.payment_id ?? null : undefined,
    acceptedAt: r.accepted_at ?? null, completedAt: r.completed_at ?? null, createdAt: r.created_at,
  };
}

function setStatus(id: string, from: VisitStatus, to: VisitStatus, extra: Record<string, unknown> = {}): boolean {
  if (!canTransition(from, to)) return false;
  const cols = Object.keys(extra);
  const r = db.prepare(`UPDATE care_visit_requests SET status = ?${cols.map(c => `, ${c} = ?`).join("")} WHERE id = ? AND status = ?`)
    .run(to, ...cols.map(c => extra[c] as any), id, from);
  return r.changes > 0;
}

// ---------- payments hooks (called from server.ts) ----------
export function resolveCarePayable(refId: string): Payable | null {
  const r = row("SELECT * FROM care_visit_requests WHERE id = ?", refId);
  if (!r || r.status !== "accepted") return null;
  if (isExpired({ status: "accepted", createdAt: r.created_at, acceptedAt: r.accepted_at })) return null;
  return { kind: "care", id: r.id, userId: r.family_user_id, professionalId: r.caregiver_profile_id, amount: r.subtotal_sen / 100,
    description: `Home care visit on ${r.date} at ${r.start_time} (${r.hours} hour${r.hours === 1 ? "" : "s"})` };
}

export function onCarePaid(p: PaymentRow) {
  const r = row("SELECT * FROM care_visit_requests WHERE id = ?", p.ref_id);
  if (!r) return;
  if (setStatus(r.id, "accepted", "confirmed", { payment_id: p.id })) {
    const acct = accountOfProfile(r.caregiver_profile_id);
    if (acct) notify(acct, "Home care visit confirmed", `The visit on ${r.date} at ${r.start_time} is paid. You can now see the address.`);
  }
}

export function onCareRefunded(p: PaymentRow) {
  const r = row("SELECT * FROM care_visit_requests WHERE id = ?", p.ref_id);
  if (r && (r.status === "confirmed" || r.status === "accepted")) setStatus(r.id, r.status, "cancelled");
}

/** Used by payouts: the state of a home-care visit for an earning. */
export function careVisitForPayout(refId: string): { done: boolean; date: string | null } {
  const r = row("SELECT status, date FROM care_visit_requests WHERE id = ?", refId);
  return { done: r?.status === "completed", date: r?.date ?? null };
}

/** Expires requests nobody answered and accepted visits nobody paid for. Returns how many changed. */
export function expireStaleRequests(now: number = Date.now()): number {
  let n = 0;
  for (const r of rows("SELECT * FROM care_visit_requests WHERE status IN ('requested','accepted')")) {
    if (isExpired({ status: r.status, createdAt: r.created_at, acceptedAt: r.accepted_at }, now) && setStatus(r.id, r.status, "expired")) {
      n++;
      notify(r.family_user_id, "A home care request expired", r.status === "accepted" ? "The visit was not paid for in time." : "The caregiver did not answer in time. You can ask someone else.");
    }
  }
  return n;
}

export function registerHomecare(app: Application, ctx: Ctx) {
  setInterval(() => { try { expireStaleRequests(); } catch (e) { console.error("homecare expiry", e); } }, 5 * 60_000).unref();

  /** The caregiver profile of the signed-in practitioner account, or null. */
  const myCaregiver = (req: Request) => {
    const pid = req.user?.profileId;
    const p = pid ? ctx.findProfessional(pid) : null;
    return p && p.role === "caregiver" ? p : null;
  };
  const requireCaregiver = (req: Request, res: Response) => {
    const p = myCaregiver(req);
    if (!p) fail(res, 403, "This is for caregivers.");
    return p;
  };

  // ---------- care recipients (family) ----------
  const readRecipient = (b: any): string | { name: string; relationship: string | null; birthYear: number | null; address: string | null; city: string | null; state: string | null; needs: string | null } => {
    const name = str(b?.name, 100);
    if (!name) return "Enter the person's name.";
    const by = b?.birthYear === undefined || b?.birthYear === null || b?.birthYear === "" ? null : Number(b.birthYear);
    if (by !== null && (!Number.isInteger(by) || by < 1900 || by > new Date().getFullYear())) return "Enter a valid birth year.";
    return { name, relationship: str(b?.relationship, 60) || null, birthYear: by, address: str(b?.address, 250) || null, city: str(b?.city, 80) || null, state: str(b?.state, 60) || null, needs: str(b?.needs, 1000) || null };
  };

  app.get("/api/me/care-recipients", requireRole("patient"), (req, res) => {
    res.json({ status: "success", data: rows("SELECT * FROM care_recipients WHERE owner_user_id = ? AND active = 1 ORDER BY created_at", req.user!.id).map(recipientView) });
  });

  app.post("/api/me/care-recipients", requireRole("patient"), (req, res) => {
    const v = readRecipient(req.body);
    if (typeof v === "string") return fail(res, 400, v);
    if ((row("SELECT COUNT(*) AS n FROM care_recipients WHERE owner_user_id = ? AND active = 1", req.user!.id).n as number) >= MAX_RECIPIENTS) return fail(res, 409, `You can keep up to ${MAX_RECIPIENTS} people.`);
    const id = newId("rec");
    db.prepare("INSERT INTO care_recipients (id,owner_user_id,name,relationship,birth_year,address,city,state,needs,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, v.name, v.relationship, v.birthYear, v.address, v.city, v.state, v.needs, iso());
    audit(req, "homecare.recipient.add", { target: ["care_recipient", id] });
    res.status(201).json({ status: "success", data: recipientView(row("SELECT * FROM care_recipients WHERE id = ?", id)) });
  });

  app.put("/api/me/care-recipients/:id", requireRole("patient"), (req, res) => {
    if (!row("SELECT 1 AS x FROM care_recipients WHERE id = ? AND owner_user_id = ? AND active = 1", req.params.id, req.user!.id)) return fail(res, 404, "Person not found.");
    const v = readRecipient(req.body);
    if (typeof v === "string") return fail(res, 400, v);
    db.prepare("UPDATE care_recipients SET name=?, relationship=?, birth_year=?, address=?, city=?, state=?, needs=? WHERE id=?")
      .run(v.name, v.relationship, v.birthYear, v.address, v.city, v.state, v.needs, req.params.id);
    audit(req, "homecare.recipient.update", { target: ["care_recipient", req.params.id] });
    res.json({ status: "success", data: recipientView(row("SELECT * FROM care_recipients WHERE id = ?", req.params.id)) });
  });

  app.delete("/api/me/care-recipients/:id", requireRole("patient"), (req, res) => {
    if (row("SELECT 1 AS x FROM care_visit_requests WHERE recipient_id = ? AND status IN ('requested','accepted','confirmed')", req.params.id))
      return fail(res, 409, "This person has a visit that is still open. Cancel or finish it first.");
    const r = db.prepare("UPDATE care_recipients SET active = 0 WHERE id = ? AND owner_user_id = ?").run(req.params.id, req.user!.id);
    if (!r.changes) return fail(res, 404, "Person not found.");
    audit(req, "homecare.recipient.remove", { target: ["care_recipient", req.params.id] });
    res.json({ status: "success" });
  });

  // ---------- caregivers a family can ask ----------
  app.get("/api/homecare/caregivers", requireRole("patient"), (req, res) => {
    const city = str(req.query.city, 80).toLowerCase();
    const q = str(req.query.q, 80).toLowerCase();
    const out = ctx.allProfessionals()
      .filter(p => p.role === "caregiver" && p.verificationStatus === VerificationStatus.VERIFIED && Number(p.fee) > 0)
      .map(p => ({ p, c: presentCredential(p) }))
      .filter(x => x.c && (x.c.status === "verified" || x.c.status === "expiring"))
      .filter(x => !city || String(x.p.city ?? "").toLowerCase().includes(city))
      .filter(x => !q || `${x.p.name} ${x.p.specialization}`.toLowerCase().includes(q))
      .map(({ p, c }) => ({
        id: p.id, name: p.name, specialty: p.specialization, city: p.city ?? null, languages: p.languages ?? [], bio: p.bio ?? "",
        ratePerHour: Number(p.fee), validUntil: c!.validUntil, badge: c!.badge, experienceYears: p.experienceYears ?? null,
      }));
    res.json({ status: "success", data: out });
  });

  // ---------- requests ----------
  app.post("/api/homecare/requests", requireRole("patient"), (req, res) => {
    const v = checkRequest(req.body);
    if (typeof v === "string") return fail(res, 400, v);
    const rec = row("SELECT * FROM care_recipients WHERE id = ? AND owner_user_id = ? AND active = 1", str(req.body.recipientId, 60), req.user!.id);
    if (!rec) return fail(res, 404, "Choose who the care is for.");
    if (!rec.address) return fail(res, 400, "Add an address for this person first, so the caregiver knows where to go.");
    const cg = ctx.findProfessional(str(req.body.caregiverId, 60));
    const cred = cg && cg.role === "caregiver" && cg.verificationStatus === VerificationStatus.VERIFIED ? presentCredential(cg) : null;
    if (!cg || !cred || (cred.status !== "verified" && cred.status !== "expiring")) return fail(res, 404, "That caregiver is not available.");
    if (!(Number(cg.fee) > 0)) return fail(res, 409, "This caregiver has not set an hourly rate yet.");
    if (cg.licenseExpiry && cg.licenseExpiry < v.date) return fail(res, 409, `This caregiver's certificate expires on ${cg.licenseExpiry}, before the visit. Choose an earlier date or another caregiver.`);
    const existing = rows("SELECT id, status, date, start_time AS startTime, hours FROM care_visit_requests WHERE caregiver_profile_id = ? AND date = ?", cg.id, v.date) as any[];
    if (clashes(existing, v)) return fail(res, 409, "That caregiver already has a visit at that time. Choose another time.");
    if (row("SELECT 1 AS x FROM care_visit_requests WHERE family_user_id = ? AND caregiver_profile_id = ? AND date = ? AND start_time = ? AND status = 'requested'", req.user!.id, cg.id, v.date, v.startTime))
      return fail(res, 409, "You have already asked this caregiver for that time.");

    const rateSen = Math.round(Number(cg.fee) * 100);
    const id = newId("cvr");
    db.prepare(`INSERT INTO care_visit_requests (id,family_user_id,recipient_id,caregiver_profile_id,date,start_time,hours,rate_sen,subtotal_sen,family_note,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, req.user!.id, rec.id, cg.id, v.date, v.startTime, v.hours, rateSen, priceSen(rateSen, v.hours), v.note || null, iso());
    audit(req, "homecare.request", { target: ["care_visit", id], details: { caregiver: cg.id } });
    const acct = accountOfProfile(cg.id);
    if (acct) notify(acct, "New home care request", `A family asked for a ${v.hours}-hour visit on ${v.date} at ${v.startTime}.`);
    res.status(201).json({ status: "success", data: requestView(row("SELECT * FROM care_visit_requests WHERE id = ?", id), ctx, "family") });
  });

  app.get("/api/homecare/requests", requireRole("patient", "practitioner", "admin"), (req, res) => {
    expireStaleRequests();
    const u = req.user!;
    if (u.role === "patient") {
      return res.json({ status: "success", data: rows("SELECT * FROM care_visit_requests WHERE family_user_id = ? ORDER BY date DESC, start_time DESC", u.id).map(r => requestView(r, ctx, "family")) });
    }
    if (u.role === "admin") {
      return res.json({ status: "success", data: rows("SELECT * FROM care_visit_requests ORDER BY created_at DESC LIMIT 300").map(r => requestView(r, ctx, "admin")) });
    }
    const cg = myCaregiver(req);
    if (!cg) return fail(res, 403, "This is for caregivers.");
    res.json({ status: "success", data: rows("SELECT * FROM care_visit_requests WHERE caregiver_profile_id = ? ORDER BY date DESC, start_time DESC", cg.id).map(r => requestView(r, ctx, "caregiver")) });
  });

  const loadFor = (req: Request, res: Response, who: "family" | "caregiver") => {
    const r = row("SELECT * FROM care_visit_requests WHERE id = ?", req.params.id);
    const cg = who === "caregiver" ? requireCaregiver(req, res) : null;
    if (who === "caregiver" && !cg) return null;
    const mine = r && (who === "family" ? r.family_user_id === req.user!.id : r.caregiver_profile_id === cg!.id);
    if (!mine) { fail(res, 404, "Request not found."); return null; }
    return r;
  };

  app.post("/api/homecare/requests/:id/accept", requireRole("practitioner"), (req, res) => {
    const r = loadFor(req, res, "caregiver"); if (!r) return;
    if (r.status !== "requested") return fail(res, 409, `This request is already ${r.status}.`);
    if (isExpired({ status: "requested", createdAt: r.created_at })) { setStatus(r.id, "requested", "expired"); return fail(res, 409, "This request has expired."); }
    const others = rows("SELECT id, status, date, start_time AS startTime, hours FROM care_visit_requests WHERE caregiver_profile_id = ? AND date = ?", r.caregiver_profile_id, r.date) as any[];
    if (clashes(others, { date: r.date, startTime: r.start_time, hours: r.hours }, r.id)) return fail(res, 409, "You already have a visit at that time.");
    if (!setStatus(r.id, "requested", "accepted", { accepted_at: iso() })) return fail(res, 409, "This request changed. Refresh and try again.");
    audit(req, "homecare.accept", { target: ["care_visit", r.id] });
    notify(r.family_user_id, "Your home care request was accepted", `Pay within 24 hours to confirm the visit on ${r.date} at ${r.start_time}.`);
    res.json({ status: "success", data: requestView(row("SELECT * FROM care_visit_requests WHERE id = ?", r.id), ctx, "caregiver") });
  });

  app.post("/api/homecare/requests/:id/decline", requireRole("practitioner"), (req, res) => {
    const r = loadFor(req, res, "caregiver"); if (!r) return;
    const reason = str(req.body?.reason, 300);
    if (!reason) return fail(res, 400, "Give the family a short reason.");
    if (!setStatus(r.id, r.status, "declined", { decline_reason: reason })) return fail(res, 409, `This request is already ${r.status}.`);
    audit(req, "homecare.decline", { target: ["care_visit", r.id] });
    notify(r.family_user_id, "Your home care request was declined", reason);
    res.json({ status: "success" });
  });

  app.post("/api/homecare/requests/:id/complete", requireRole("practitioner"), (req, res) => {
    const r = loadFor(req, res, "caregiver"); if (!r) return;
    const note = str(req.body?.note, 2000);
    if (note.length < 10) return fail(res, 400, "Write a short note for the family about the visit (at least 10 characters).");
    if (r.status !== "confirmed") return fail(res, 409, r.status === "accepted" ? "The family has not paid yet." : `This visit is ${r.status}.`);
    if (!hasStarted({ date: r.date, startTime: r.start_time, hours: r.hours })) return fail(res, 409, "The visit has not started yet.");
    if (!setStatus(r.id, "confirmed", "completed", { visit_note: note, completed_at: iso() })) return fail(res, 409, "This visit changed. Refresh and try again.");
    audit(req, "homecare.complete", { target: ["care_visit", r.id] });
    notify(r.family_user_id, "Your home care visit is complete", "Your caregiver left a note about the visit.");
    res.json({ status: "success", data: requestView(row("SELECT * FROM care_visit_requests WHERE id = ?", r.id), ctx, "caregiver") });
  });

  app.post("/api/homecare/requests/:id/cancel", requireRole("patient"), async (req, res) => {
    const r = loadFor(req, res, "family"); if (!r) return;
    if (!canTransition(r.status, "cancelled")) return fail(res, 409, `This request is already ${r.status}.`);
    let refunded = false;
    if (r.status === "confirmed" && r.payment_id) {
      const policy = refundPolicy(ctx.paymentRegion(req.user!.id));
      const earliest = new Date(Date.now() + policy.fullRefundMinDays * 86_400_000).toISOString().slice(0, 10);
      if (r.date >= earliest) refunded = (await refundPayment(r.payment_id, "Cancelled by the family", null)).ok;
    }
    // refundPayment cancels the visit itself when it refunds; otherwise cancel it here (a visit cancelled too late is not refunded).
    const fresh = row("SELECT status FROM care_visit_requests WHERE id = ?", r.id);
    if (fresh && fresh.status !== "cancelled") setStatus(r.id, fresh.status, "cancelled");
    audit(req, "homecare.cancel", { target: ["care_visit", r.id], details: { refunded } });
    const acct = accountOfProfile(r.caregiver_profile_id);
    if (acct) notify(acct, "A home care visit was cancelled", `The visit on ${r.date} at ${r.start_time} was cancelled by the family.`);
    res.json({ status: "success", refunded, message: refunded ? "Cancelled and refunded in full." : r.status === "confirmed" ? "Cancelled. This visit is too close to be refunded." : "Cancelled." });
  });
}
