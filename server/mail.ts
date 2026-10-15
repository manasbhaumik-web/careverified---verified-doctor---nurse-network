import crypto from "crypto";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { pickMailLang, renderEmail, type MailLang, type TemplateName } from "./mailTemplates";

/**
 * Transactional email (service messages only; never marketing).
 *
 * MAIL_TRANSPORT:  smtp  send through SMTP_HOST (set SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM)
 *                  log   do not send; keep the rendered message in the outbox (development and tests; the default outside production)
 *                  off   do not send and say so (the default in production until SMTP_HOST is set)
 * APP_URL is the public address used in links. It is never taken from the request, so a forged Host header cannot poison a link.
 *
 * Every attempt is written to the email_outbox table with its status, so the board can see what was sent, what failed and why.
 * Bodies are kept only in `log` mode (a reset link in the outbox would be a way into an account). Rows are purged after
 * EMAIL_OUTBOX_DAYS (default 90).
 */

const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });

db.exec(`
CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, to_email TEXT NOT NULL, user_id TEXT, template TEXT NOT NULL, lang TEXT NOT NULL,
  subject TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, error TEXT, sent_at TEXT, body_text TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON email_outbox(created_at);
`);
try { db.exec("ALTER TABLE users ADD COLUMN lang TEXT"); } catch { /* column already exists */ }

// ---------- configuration ----------
export type MailMode = "smtp" | "log" | "off";
export function mailMode(env: NodeJS.ProcessEnv = process.env): MailMode {
  const m = env.MAIL_TRANSPORT;
  if (m === "smtp" || m === "log" || m === "off") return m;
  if (env.NODE_ENV !== "production") return "log";
  return env.SMTP_HOST ? "smtp" : "off";
}
/** Public address for links, or null when it cannot be known safely. */
export function appBase(env: NodeJS.ProcessEnv = process.env): string | null {
  const u = (env.APP_URL ?? "").trim();
  if (/^https?:\/\/[^\s/]+/.test(u)) return u.replace(/\/+$/, "");
  return env.NODE_ENV === "production" ? null : `http://localhost:${env.PORT || 3000}`;
}
const mailFrom = () => str(process.env.MAIL_FROM, 200) || "MedCred <no-reply@localhost>";
const retryDelays = () => (process.env.MAIL_RETRY_MS ?? "2000,10000").split(",").map(s => Number(s)).filter(n => Number.isFinite(n) && n >= 0);
/** Addresses that can never receive mail (demo and test accounts), so no provider is asked to deliver to them. */
const RESERVED = /@[^@]+\.(test|invalid|localhost|example)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let transport: Transporter | null = null;
function smtp(): Transporter {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure,
    requireTLS: !secure && process.env.SMTP_REQUIRE_TLS !== "false",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  return transport;
}
/** Forget the cached SMTP connection settings (tests change them between servers; a restart does the same). */
export const resetMailTransport = () => { transport = null; };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface SendResult { id: string; status: "sent" | "logged" | "failed" | "skipped"; error?: string }

/**
 * Send a templated email to a user (by id) or an address. Never throws and never blocks the caller's request when not awaited.
 * The recipient's saved language is used unless `lang` is given.
 */
export async function sendTemplate(opts: { userId?: string | null; to?: string; template: TemplateName; vars?: Record<string, any>; lang?: MailLang }): Promise<SendResult | null> {
  try {
    let to = str(opts.to, 254).toLowerCase(), lang: MailLang = opts.lang ?? "en", userId = opts.userId ?? null;
    if (userId) {
      const u = db.prepare("SELECT email, lang, status FROM users WHERE id = ?").get(userId) as any;
      if (!u || u.status !== "active") return null; // closed accounts get nothing
      to = u.email; if (!opts.lang) lang = pickMailLang(u.lang);
    }
    if (!EMAIL_RE.test(to)) return null;

    const mode = mailMode();
    const r = renderEmail(opts.template, lang, opts.vars ?? {}, appBase());
    const id = "eml-" + crypto.randomBytes(6).toString("hex");
    const insert = (status: string, error: string | null) => db.prepare(
      "INSERT INTO email_outbox (id,created_at,to_email,user_id,template,lang,subject,status,error,body_text) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id, iso(), to, userId, opts.template, lang, r.subject, status, error, mode === "log" ? r.text : null);
    const finish = (status: SendResult["status"], error?: string) => { db.prepare("UPDATE email_outbox SET status = ?, error = ?, sent_at = ? WHERE id = ?").run(status, error ?? null, status === "sent" ? iso() : null, id); return { id, status, error } as SendResult; };

    // A reset email without a link is useless, and a link built from the request would be unsafe.
    if (opts.template === "password_reset" && !r.link) { insert("skipped", "APP_URL is not set, so no link can be made"); return finish("skipped", "APP_URL is not set, so no link can be made"); }
    if (RESERVED.test(to)) { insert("skipped", "Reserved or demo address"); return finish("skipped", "Reserved or demo address"); }
    if (mode === "off") { insert("skipped", "Email is not configured"); return finish("skipped", "Email is not configured"); }
    if (mode === "log") {
      insert("logged", null);
      // Development convenience: no mail is sent, so show where a link would have taken the person.
      if (process.env.NODE_ENV !== "production") console.log(`[mail:log] ${opts.template} -> ${to}${r.link ? "  " + r.link : ""}`);
      return { id, status: "logged" };
    }

    insert("queued", null);
    const delays = retryDelays();
    let lastError = "";
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      db.prepare("UPDATE email_outbox SET attempts = ? WHERE id = ?").run(attempt + 1, id);
      try {
        await smtp().sendMail({
          from: mailFrom(), to, replyTo: str(process.env.MAIL_REPLY_TO, 200) || undefined, subject: r.subject, text: r.text, html: r.html,
          headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
        });
        return finish("sent");
      } catch (e: any) {
        lastError = String(e?.message ?? e).slice(0, 300);
        if (attempt < delays.length) await sleep(delays[attempt]);
      }
    }
    return finish("failed", lastError);
  } catch (e) {
    console.error("[mail] could not send", opts.template, e);
    return null;
  }
}

/** Fire and forget, for the places that should not wait for a mail server. */
export const email = (opts: Parameters<typeof sendTemplate>[0]) => { void sendTemplate(opts); };

/** Email every active admin (for events the board must not miss). */
export function emailAdmins(template: TemplateName, vars: Record<string, any>) {
  for (const a of db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").all() as any[]) email({ userId: a.id, template, vars });
}

export function purgeOutbox() {
  const days = Number(process.env.EMAIL_OUTBOX_DAYS) > 0 ? Number(process.env.EMAIL_OUTBOX_DAYS) : 90;
  db.prepare("DELETE FROM email_outbox WHERE created_at < ?").run(new Date(Date.now() - days * 86_400_000).toISOString());
}
setInterval(() => { try { purgeOutbox(); } catch { /* next time */ } }, 6 * 60 * 60_000).unref();

// ---------- routes ----------
export function registerMail(app: Application) {
  // The language emails are sent in follows the one the person uses in the app.
  app.put("/api/me/language", requireAuth, (req, res) => {
    const lang = req.body?.lang;
    if (lang !== "en" && lang !== "ms" && lang !== "zh") return fail(res, 400, "Choose en, ms or zh.");
    db.prepare("UPDATE users SET lang = ? WHERE id = ?").run(lang, req.user!.id);
    res.json({ status: "success" });
  });

  app.get("/api/admin/email/status", requireRole("admin"), (_req, res) => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const counts = Object.fromEntries((db.prepare("SELECT status, COUNT(*) AS n FROM email_outbox WHERE created_at > ? GROUP BY status").all(since) as any[]).map(r => [r.status, r.n]));
    const recent = (db.prepare("SELECT id, created_at, to_email, template, lang, subject, status, attempts, error FROM email_outbox ORDER BY created_at DESC LIMIT 40").all() as any[])
      .map(r => ({ id: r.id, createdAt: r.created_at, to: r.to_email, template: r.template, lang: r.lang, subject: r.subject, status: r.status, attempts: r.attempts, error: r.error }));
    res.json({
      status: "success",
      data: {
        mode: mailMode(), smtpHost: process.env.SMTP_HOST ? process.env.SMTP_HOST : null, from: mailFrom(), appUrl: appBase(),
        problems: [
          ...(mailMode() === "off" ? ["Email is off: set SMTP_HOST (or MAIL_TRANSPORT=smtp) so people are told about verification results, payouts and password resets."] : []),
          ...(mailMode() === "log" && process.env.NODE_ENV === "production" ? ["MAIL_TRANSPORT=log in production: nothing is being sent."] : []),
          ...(!appBase() ? ["APP_URL is not set, so emails cannot contain links and password reset is disabled."] : []),
          ...(mailMode() === "smtp" && !process.env.MAIL_FROM ? ["MAIL_FROM is not set: use an address on a domain you have set up SPF and DKIM for."] : []),
        ],
        counts, recent,
      },
    });
  });

  app.post("/api/admin/email/test", requireRole("admin"), async (req, res) => {
    const r = await sendTemplate({ userId: req.user!.id, template: "test_email", lang: pickMailLang(req.body?.lang) });
    audit(req, "email.test", { details: { status: r?.status } });
    if (!r) return fail(res, 400, "Could not send: your account has no usable email address.");
    res.json({ status: "success", data: r });
  });
}
