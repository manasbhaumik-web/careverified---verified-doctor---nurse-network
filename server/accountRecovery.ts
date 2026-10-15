import crypto from "crypto";
import rateLimit from "express-rate-limit";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { changePassword, passwordProblem } from "./auth";
import { appBase, email } from "./mail";
import { pickMailLang } from "./mailTemplates";

/**
 * Forgotten password, by email.
 *
 *  - The answer to "send me a link" is always the same, so the form cannot be used to find out who has an account.
 *  - The link holds a random token. Only its SHA-256 hash is stored, it works once and expires in RESET_MINUTES (30).
 *  - The link is built from APP_URL, never from the request, so a forged Host header cannot send a victim to another site.
 *  - Setting a new password signs the person out everywhere, clears a lockout, and sends a "your password was changed" notice.
 *  - Admin accounts cannot be reset by email: a stolen mailbox must not be a way to the board's account.
 *  - Accounts with an authenticator app still need the code at the next sign-in, so a reset does not bypass two-factor.
 */
export const RESET_MINUTES = 30;
const MAX_PER_HOUR_PER_ACCOUNT = 3;

const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

db.exec(`
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id, created_at);
`);

export function registerRecovery(app: Application) {
  const requestLimiter = rateLimit({ windowMs: 60 * 60_000, limit: Number(process.env.RESET_REQUEST_LIMIT) || 10, standardHeaders: true, legacyHeaders: false, message: { status: "error", message: "Too many requests. Try again later." } });
  const useLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { status: "error", message: "Too many attempts. Try again later." } });
  const GENERIC = { status: "success", message: "If an account uses that email, we have sent a link to reset the password. It works once and expires in 30 minutes." };

  app.post("/api/auth/forgot-password", requestLimiter, (req, res) => {
    const to = str(req.body?.email, 254).toLowerCase();
    if (!EMAIL_RE.test(to)) return fail(res, 400, "Enter a valid email address.");
    const u = db.prepare("SELECT id, role, status, lang FROM users WHERE email = ?").get(to) as any;
    if (u && u.status === "active" && u.role !== "admin") {
      const recent = (db.prepare("SELECT COUNT(*) AS n FROM password_resets WHERE user_id = ? AND created_at > ?").get(u.id, new Date(Date.now() - 3_600_000).toISOString()) as any).n as number;
      if (recent < MAX_PER_HOUR_PER_ACCOUNT) {
        const token = crypto.randomBytes(32).toString("base64url");
        // An older link stops working, but its row stays so the hourly limit can count it.
        db.prepare("UPDATE password_resets SET expires_at = ? WHERE user_id = ? AND used_at IS NULL AND expires_at > ?").run(iso(), u.id, iso());
        db.prepare("INSERT INTO password_resets (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)")
          .run(sha(token), u.id, iso(), new Date(Date.now() + RESET_MINUTES * 60_000).toISOString());
        const base = appBase();
        // Without a safe base address there is no link to send. email() records the attempt as skipped for the board to see.
        email({ userId: u.id, template: "password_reset", lang: u.lang ? pickMailLang(u.lang) : pickMailLang(req.body?.lang), vars: { minutes: RESET_MINUTES, url: base ? `${base}/reset-password?token=${token}` : "" } });
        audit(req, "auth.password.reset.request", { actor: { id: u.id, role: u.role } });
      }
    }
    res.json(GENERIC);
  });

  const lookup = (token: string) => {
    if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return null;
    const r = db.prepare("SELECT * FROM password_resets WHERE token_hash = ?").get(sha(token)) as any;
    if (!r || r.used_at || r.expires_at < iso()) return null;
    const u = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(r.user_id) as any;
    return u && u.status === "active" && u.role !== "admin" ? { reset: r, user: u } : null;
  };

  // Lets the page say "this link has expired" before asking for a password.
  app.get("/api/auth/reset-password/check", useLimiter, (req, res) => {
    res.json({ status: "success", data: { valid: !!lookup(str(req.query.token, 100)) } });
  });

  app.post("/api/auth/reset-password", useLimiter, (req, res) => {
    const found = lookup(str(req.body?.token, 100));
    if (!found) return fail(res, 400, "This link is not valid any more. Ask for a new one.");
    const problem = passwordProblem(req.body?.password);
    if (problem) return fail(res, 400, problem);
    changePassword(found.user.id, req.body.password); // also signs the person out everywhere
    db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(found.user.id);
    db.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").run(iso(), found.reset.token_hash);
    db.prepare("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL").run(found.user.id);
    email({ userId: found.user.id, template: "password_changed" });
    audit(req, "auth.password.reset", { actor: { id: found.user.id, role: found.user.role } });
    res.json({ status: "success" });
  });

  // Old rows are of no use.
  setInterval(() => { try { db.prepare("DELETE FROM password_resets WHERE expires_at < ?").run(new Date(Date.now() - 86_400_000).toISOString()); } catch { /* next time */ } }, 6 * 60 * 60_000).unref();
}
