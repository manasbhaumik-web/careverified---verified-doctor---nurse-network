import crypto from "crypto";
import QRCode from "qrcode";
import rateLimit from "express-rate-limit";
import type { Application } from "express";
import { db } from "./db";
import { deriveState, isPublicState, type CredentialState } from "./credentialState";

/**
 * Public credential lookup: no login. It answers one question, "is this person currently registered?", and nothing else.
 * Everything that leaves this module goes through `presentCredential`, which is an allow-list, so a new profile field can never leak by accident.
 */

db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

/** Secret for badge links, kept in the database so QR codes keep working across restarts. BADGE_SECRET overrides it. */
function badgeSecret(): string {
  if (process.env.BADGE_SECRET) return process.env.BADGE_SECRET;
  const found = db.prepare("SELECT value FROM settings WHERE key = 'badge_secret'").get() as { value: string } | undefined;
  if (found) return found.value;
  const fresh = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('badge_secret', ?)").run(fresh);
  return (db.prepare("SELECT value FROM settings WHERE key = 'badge_secret'").get() as { value: string }).value;
}

/** Stable, unguessable token for a profile. It is the only identifier the public ever sees. */
export const badgeTokenFor = (profileId: string): string =>
  "cv" + crypto.createHmac("sha256", badgeSecret()).update(`badge:${profileId}`).digest("base64url").slice(0, 18);

export interface PublicCredential {
  name: string;
  role: string;
  specialty: string | null;
  registrationNumber: string;
  registeringBody: string | null;
  status: Exclude<CredentialState, "pending" | "info_requested" | "rejected">;
  validFrom: string | null;
  validUntil: string | null;
  facility: string | null;
  scope: string | null;
  badge: string;
}

const day = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10) : null);

/** The public view of a profile, or null when the public must not learn anything about it (pending, rejected, unknown). */
export function presentCredential(p: any, now: Date = new Date()): PublicCredential | null {
  const state = deriveState({ status: p.verificationStatus, licenseExpiry: p.licenseExpiry }, now);
  if (!isPublicState(state)) return null;
  return {
    name: String(p.name ?? ""),
    role: String(p.role ?? ""),
    specialty: p.specialization ?? null,
    registrationNumber: String(p.licenseNumber ?? ""),
    registeringBody: p.medicalCouncil ?? p.nursingCouncil ?? null,
    status: state as PublicCredential["status"],
    validFrom: day(p.verifiedAt),
    validUntil: day(p.licenseExpiry ?? p.verifiedUntil),
    facility: p.hospitalName ?? null,
    scope: p.verificationScope ?? null,
    badge: badgeTokenFor(String(p.id)),
  };
}

interface Ctx { allProfessionals: () => any[] }

export function registerPublicLookup(app: Application, ctx: Ctx) {
  // Searching is open to everyone, so it is rate limited and needs a real query: the register cannot be dumped.
  const limiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });

  app.get("/api/public/credentials", limiter, (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase().slice(0, 80);
    const role = String(req.query.role ?? "").trim().toLowerCase();
    if (q.length < 3) return res.status(400).json({ status: "error", message: "Enter at least 3 characters of a name or registration number." });
    const out: PublicCredential[] = [];
    for (const p of ctx.allProfessionals()) {
      if (role && String(p.role).toLowerCase() !== role) continue;
      if (!String(p.name ?? "").toLowerCase().includes(q) && !String(p.licenseNumber ?? "").toLowerCase().includes(q)) continue;
      const c = presentCredential(p);
      if (c) out.push(c);
      if (out.length >= 20) break;
    }
    res.json({ status: "success", data: out });
  });

  const byBadge = (token: string) => ctx.allProfessionals().find(p => badgeTokenFor(String(p.id)) === token);

  app.get("/api/public/credentials/:badge", limiter, (req, res) => {
    const p = byBadge(String(req.params.badge).slice(0, 40));
    const c = p ? presentCredential(p) : null;
    // One answer for unknown, pending and rejected, so a status is never leaked.
    res.json({ status: "success", data: c ? { found: true, credential: c } : { found: false } });
  });

  app.get("/api/public/credentials/:badge/qr.svg", limiter, async (req, res) => {
    const token = String(req.params.badge).slice(0, 40);
    const p = byBadge(token);
    if (!p || !presentCredential(p)) return res.status(404).end();
    const origin = `${req.protocol}://${req.get("host")}`;
    const svg = await QRCode.toString(`${origin}/verify?badge=${encodeURIComponent(token)}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    res.type("image/svg+xml").set("Cache-Control", "public, max-age=3600").send(svg);
  });
}
