import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";

export type Role = "patient" | "practitioner" | "admin";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  profileId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE = "cv_session";
const SESSION_DAYS = 7;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const isProd = () => process.env.NODE_ENV === "production";

// ---------- passwords ----------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must include letters and numbers.";
  return null;
}

// Verified against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString("hex"));

// ---------- sessions ----------
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function createSession(req: Request, res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  db.prepare("INSERT INTO sessions (token_hash,user_id,created_at,expires_at,ip,user_agent) VALUES (?,?,?,?,?,?)").run(
    sha(token), userId, now.toISOString(), expires.toISOString(), req.ip ?? null, String(req.headers["user-agent"] ?? "").slice(0, 200)
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: SESSION_DAYS * 86400_000,
  });
}

export function destroySession(req: Request, res: Response) {
  const token = readCookie(req, COOKIE);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
  res.clearCookie(COOKIE, { path: "/" });
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Attaches req.user when a valid session cookie is present. */
export function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token = readCookie(req, COOKIE);
  if (token) {
    const row = db.prepare(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url AS avatarUrl, u.profile_id AS profileId, u.status, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    ).get(sha(token)) as any;
    if (row && row.status === "active" && new Date(row.expiresAt) > new Date()) {
      req.user = { id: row.id, email: row.email, name: row.name, role: row.role, avatarUrl: row.avatarUrl, profileId: row.profileId };
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ status: "error", message: "Please sign in to continue." });
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ status: "error", message: "Please sign in to continue." });
    if (!roles.includes(req.user.role)) {
      audit(req, "access.denied", { details: { path: req.path, method: req.method } });
      return res.status(403).json({ status: "error", message: "You do not have permission to do this." });
    }
    next();
  };
}

// ---------- login with lockout ----------
export function attemptLogin(req: Request, email: string, password: string, role?: Role): AuthUser | { error: string } {
  const generic = { error: "Invalid email or password." };
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!row) {
    verifyPassword(password, DUMMY_HASH);
    audit(req, "auth.login.failed", { details: { reason: "unknown_email" } });
    return generic;
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    audit(req, "auth.login.locked", { actor: { id: row.id, role: row.role } });
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }
  const ok = verifyPassword(password, row.password_hash);
  if (!ok || row.status !== "active" || (role && role !== row.role)) {
    if (!ok) {
      const failed = row.failed_logins + 1;
      const lock = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      db.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?").run(lock ? 0 : failed, lock, row.id);
    }
    audit(req, "auth.login.failed", { actor: { id: row.id, role: row.role }, details: { reason: ok ? "role_or_status" : "bad_password" } });
    return generic;
  }
  db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(row.id);
  return { id: row.id, email: row.email, name: row.name, role: row.role, avatarUrl: row.avatar_url, profileId: row.profile_id };
}

// ---------- user creation ----------
export function createUser(u: {
  email: string; password: string; role: Role; name: string; avatarUrl?: string; consentVersion?: string;
}): AuthUser {
  const id = "usr-" + crypto.randomBytes(8).toString("hex");
  const now = new Date().toISOString();
  const email = u.email.trim().toLowerCase();
  db.prepare(
    "INSERT INTO users (id,email,password_hash,role,name,avatar_url,consent_version,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(id, email, hashPassword(u.password), u.role, u.name, u.avatarUrl ?? null,
    u.consentVersion ?? null, u.consentVersion ? now : null, now);
  return { id, email, name: u.name, role: u.role, avatarUrl: u.avatarUrl ?? null, profileId: null };
}

export function emailTaken(email: string): boolean {
  return !!db.prepare("SELECT 1 AS x FROM users WHERE email = ?").get(email.trim().toLowerCase());
}

/** Seeds the first admin account. Password comes from ADMIN_PASSWORD or is generated and printed once. */
export function ensureAdmin() {
  const exists = db.prepare("SELECT 1 AS x FROM users WHERE role = 'admin'").get();
  if (exists) return;
  const email = (process.env.ADMIN_EMAIL || "admin@careverified.local").toLowerCase();
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url") + "9a";
  createUser({ email, password, role: "admin", name: "Board Administrator" });
  console.log("=".repeat(60));
  console.log(`Created first admin account: ${email}`);
  if (generated) console.log(`Generated password (shown once, change it after signing in): ${password}`);
  console.log("=".repeat(60));
}

export function changePassword(userId: string, newPassword: string) {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), userId);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
