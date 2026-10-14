import crypto from "crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { notifyAdmins, notify } from "./verification";
import { MY_STATES } from "../src/identity";

/**
 * Patient testimonials for the landing page. Only a patient who has actually paid for care on the platform can write
 * one; it is shown only after the patient ticks consent to publish and an admin approves it; the name is shortened to
 * a first name and last initial; and the patient can withdraw it. Nothing is invented: with none approved, the section
 * is not shown. Demo entries (created by the seed script) are labelled as demos.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, text TEXT NOT NULL, rating INTEGER, display_name TEXT NOT NULL, location TEXT,
  status TEXT NOT NULL DEFAULT 'pending', is_demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_testi_status ON testimonials(status);
`);

const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;

/** "Sharifah Aminah Binti Ali" -> "Sharifah A." */
export const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Patient";
  const first = parts[0];
  const initial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() + "." : "";
  return [first, initial].filter(Boolean).join(" ");
};

export function registerTestimonials(app: Application) {
  const view = (t: any) => ({ id: t.id, text: t.text, rating: t.rating, name: t.display_name, location: t.location, demo: !!t.is_demo, status: t.status, createdAt: t.created_at });

  // Public: approved only
  app.get("/api/testimonials", (_req, res) => {
    res.json({ status: "success", data: rows("SELECT * FROM testimonials WHERE status = 'approved' ORDER BY created_at DESC LIMIT 6").map(view) });
  });

  const hasPaidCare = (userId: string) => !!row("SELECT 1 AS x FROM payments WHERE user_id = ? AND status = 'paid'", userId);

  app.get("/api/testimonials/mine", requireRole("patient"), (req, res) => {
    const t = row("SELECT * FROM testimonials WHERE user_id = ? ORDER BY created_at DESC", req.user!.id);
    res.json({ status: "success", data: t ? view(t) : null, canWrite: hasPaidCare(req.user!.id) });
  });

  app.post("/api/testimonials", requireRole("patient"), (req, res) => {
    if (!hasPaidCare(req.user!.id)) return fail(res, 403, "You can share your experience after your first paid consultation or appointment.");
    if (req.body.consent !== true) return fail(res, 400, "Please agree that we may publish your words with your first name and last initial.");
    const text = str(req.body.text, 600);
    if (text.length < 30) return fail(res, 400, "Please write at least a couple of sentences (30 characters).");
    const rating = req.body.rating === undefined ? null : Math.trunc(Number(req.body.rating));
    if (rating !== null && !(rating >= 1 && rating <= 5)) return fail(res, 400, "Choose a rating from 1 to 5.");
    const location = str(req.body.location, 40);
    if (location && !MY_STATES.includes(location) && location.length > 30) return fail(res, 400, "Location is too long.");
    if (row("SELECT 1 AS x FROM testimonials WHERE user_id = ? AND status IN ('pending','approved')", req.user!.id)) return fail(res, 409, "You already shared your experience. Withdraw it first to write a new one.");
    const id = `tst-${crypto.randomBytes(6).toString("hex")}`;
    db.prepare("INSERT INTO testimonials (id,user_id,text,rating,display_name,location,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, req.user!.id, text, rating, shortName(req.user!.name), location || null, iso());
    notifyAdmins("Testimonial to review", `${shortName(req.user!.name)} shared their experience.`);
    audit(req, "testimonial.submit", { target: ["testimonial", id] });
    res.status(201).json({ status: "success", message: "Thank you. It will appear on our home page after our team approves it." });
  });

  // The patient can remove their testimonial at any time
  app.delete("/api/testimonials/mine", requireRole("patient"), (req, res) => {
    const r = db.prepare("DELETE FROM testimonials WHERE user_id = ?").run(req.user!.id);
    audit(req, "testimonial.withdraw", {});
    res.json({ status: "success", message: r.changes ? "Your testimonial was removed." : "You have no testimonial." });
  });

  // Admin moderation
  app.get("/api/admin/testimonials", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: rows("SELECT * FROM testimonials ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 100").map(view) });
  });
  for (const [action, status] of [["approve", "approved"], ["reject", "rejected"]] as const) {
    app.post(`/api/admin/testimonials/:id/${action}`, requireRole("admin"), (req, res) => {
      const t = row("SELECT * FROM testimonials WHERE id = ?", req.params.id);
      if (!t) return fail(res, 404, "Testimonial not found.");
      db.prepare("UPDATE testimonials SET status = ?, reviewed_at = ?, reviewed_by = ?, is_demo = CASE WHEN ? THEN 1 ELSE is_demo END WHERE id = ?").run(status, iso(), req.user!.id, req.body?.demo === true ? 1 : 0, t.id);
      if (action === "reject") notify(t.user_id, "Your testimonial was not published", "Our team could not publish it. You can write a new one.");
      audit(req, `testimonial.${action}`, { target: ["testimonial", t.id] });
      res.json({ status: "success" });
    });
  }
}
