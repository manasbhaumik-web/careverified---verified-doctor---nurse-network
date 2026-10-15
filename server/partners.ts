import crypto from "crypto";
import rateLimit from "express-rate-limit";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { notifyAdmins } from "./verification";
import { MY_STATES, toE164 } from "../src/identity";

/**
 * Partner enquiries: clinics, hospitals and pharmacies ask to join. Accounts for them are created by the board, so this is
 * the only route in. It is public, rate limited, and stores a business contact (name, email, phone) with the person's
 * consent to be contacted. The board reviews the list under Admin > Quality & Support > Partner enquiries.
 *
 * Privacy: these are personal details of a business contact. Add them to the privacy notice and the retention schedule,
 * and delete declined enquiries (admin DELETE) rather than keeping them indefinitely.
 */
export const PARTNER_KINDS = ["clinic", "pharmacy"] as const;
export const PARTNER_STATUSES = ["new", "contacted", "onboarded", "declined"] as const;

const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });

db.exec(`
CREATE TABLE IF NOT EXISTS partner_enquiries (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, org_name TEXT NOT NULL, contact_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  city TEXT NOT NULL, state TEXT NOT NULL, licence_no TEXT, message TEXT, consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_status ON partner_enquiries(status, created_at);
`);

/** Why an enquiry is not acceptable, or null. */
export function enquiryProblem(b: any): string | null {
  if (!(PARTNER_KINDS as readonly string[]).includes(b?.kind)) return "Choose clinic or pharmacy.";
  if (str(b.orgName, 120).length < 2) return "Enter the name of your clinic, hospital or pharmacy.";
  if (str(b.contactName, 100).length < 2) return "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(b.email, 120))) return "Enter a valid email address.";
  if (!toE164(str(b.phone, 30), "+60")) return "Enter a valid phone number.";
  if (str(b.city, 60).length < 2) return "Enter the city or town.";
  if (!MY_STATES.includes(str(b.state, 40))) return "Choose a Malaysian state or territory.";
  if (b.consent !== true) return "Please agree that we may contact you about this enquiry.";
  return null;
}

export function registerPartners(app: Application) {
  // A few per hour per address is plenty for a real organisation and slows down form spam (PARTNER_ENQUIRY_LIMIT changes it).
  const submitLimiter = rateLimit({ windowMs: 60 * 60_000, limit: Number(process.env.PARTNER_ENQUIRY_LIMIT) || 5, standardHeaders: true, legacyHeaders: false, message: { status: "error", message: "Too many enquiries from this connection. Please try again later." } });

  app.post("/api/partner-enquiries", submitLimiter, (req, res) => {
    // Hidden field a person never fills: a bot that does gets a normal-looking answer and nothing is stored.
    if (str(req.body?.companyWebsite, 200)) return res.status(201).json({ status: "success", data: { id: "ENQ-000000" } });
    const problem = enquiryProblem(req.body);
    if (problem) return fail(res, 400, problem);

    const email = str(req.body.email, 120).toLowerCase();
    const kind = str(req.body.kind, 10);
    const dup = db.prepare("SELECT 1 AS x FROM partner_enquiries WHERE email = ? AND kind = ? AND created_at > ?").get(email, kind, new Date(Date.now() - 86_400_000).toISOString());
    if (dup) return fail(res, 409, "We already have an enquiry from this email today. We will be in touch.");

    const id = "ENQ-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const now = iso();
    db.prepare(`INSERT INTO partner_enquiries (id,kind,org_name,contact_name,email,phone,city,state,licence_no,message,consent_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, kind, str(req.body.orgName, 120), str(req.body.contactName, 100), email, toE164(str(req.body.phone, 30), "+60"),
      str(req.body.city, 60), str(req.body.state, 40), str(req.body.licenceNo, 50) || null, str(req.body.message, 1500) || null, now, now, now,
    );
    notifyAdmins(`New ${kind} enquiry`, `${str(req.body.orgName, 120)}, ${str(req.body.city, 60)}. Reference ${id}.`);
    audit(req, "partner.enquiry.create", { target: ["partner_enquiry", id], details: { kind } });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.get("/api/admin/partner-enquiries", requireRole("admin"), (req, res) => {
    const status = str(req.query.status, 12);
    const rows = (PARTNER_STATUSES as readonly string[]).includes(status)
      ? db.prepare("SELECT * FROM partner_enquiries WHERE status = ? ORDER BY created_at DESC LIMIT 200").all(status)
      : db.prepare("SELECT * FROM partner_enquiries ORDER BY created_at DESC LIMIT 200").all();
    const counts = Object.fromEntries(PARTNER_STATUSES.map(s => [s, (db.prepare("SELECT COUNT(*) AS n FROM partner_enquiries WHERE status = ?").get(s) as any).n]));
    res.json({ status: "success", data: { counts, rows } });
  });

  app.post("/api/admin/partner-enquiries/:id/status", requireRole("admin"), (req, res) => {
    const status = str(req.body?.status, 12);
    if (!(PARTNER_STATUSES as readonly string[]).includes(status)) return fail(res, 400, "Choose new, contacted, onboarded or declined.");
    const r = db.prepare("UPDATE partner_enquiries SET status = ?, note = COALESCE(?, note), updated_at = ? WHERE id = ?").run(status, str(req.body?.note, 500) || null, iso(), req.params.id);
    if (!r.changes) return fail(res, 404, "Enquiry not found.");
    audit(req, "partner.enquiry.status", { target: ["partner_enquiry", req.params.id], details: { status } });
    res.json({ status: "success" });
  });

  // Declined or finished enquiries should not be kept for ever.
  app.delete("/api/admin/partner-enquiries/:id", requireRole("admin"), (req, res) => {
    const r = db.prepare("DELETE FROM partner_enquiries WHERE id = ?").run(req.params.id);
    if (!r.changes) return fail(res, 404, "Enquiry not found.");
    audit(req, "partner.enquiry.delete", { target: ["partner_enquiry", req.params.id] });
    res.json({ status: "success" });
  });
}
