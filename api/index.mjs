// server.ts
import express2 from "express";
import path3 from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit3 from "express-rate-limit";

// server/db.ts
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import os from "os";
import path from "path";
var dataDir = process.env.DATA_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), "medcred-data") : path.join(process.cwd(), "data"));
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch {
}
function openDb() {
  try {
    const instance = new DatabaseSync(path.join(dataDir, "careverified.db"));
    instance.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    return instance;
  } catch {
    const instance = new DatabaseSync(":memory:");
    instance.exec("PRAGMA foreign_keys = ON;");
    return instance;
  }
}
var db = openDb();
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient','practitioner','admin','pharmacy')),
  name TEXT NOT NULL,
  avatar_url TEXT,
  profile_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  consent_version TEXT,
  consent_at TEXT,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  deletion_requested_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip TEXT,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  stored_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  verification_request_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);
`);
{
  const def = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()?.sql ?? "";
  if (def && !def.includes("'pharmacy'")) {
    const next = def.replace(/^CREATE TABLE\s+(IF NOT EXISTS\s+)?["`]?users["`]?/i, "CREATE TABLE users_new").replace("'admin')", "'admin','pharmacy')");
    if (!next.startsWith("CREATE TABLE users_new") || !next.includes("'pharmacy'")) throw new Error("Could not migrate the users table for the pharmacy role.");
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
    }
    fs.copyFileSync(path.join(dataDir, "careverified.db"), path.join(dataDir, `careverified.before-pharmacy-role-${Date.now()}.db`));
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec("BEGIN");
      db.exec(next);
      db.exec("INSERT INTO users_new SELECT * FROM users");
      db.exec("DROP TABLE users");
      db.exec("ALTER TABLE users_new RENAME TO users");
      db.exec("COMMIT");
    } catch (e) {
      try {
        db.exec("ROLLBACK");
      } catch {
      }
      throw e;
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }
}
for (const col of ["must_change_password INTEGER NOT NULL DEFAULT 0", "totp_secret TEXT", "totp_enabled INTEGER NOT NULL DEFAULT 0", "pharmacy_owner INTEGER NOT NULL DEFAULT 0"]) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
  } catch {
  }
}
function loadCollection(name, seed) {
  const rows5 = db.prepare("SELECT data FROM records WHERE collection = ? AND id <> '__init__'").all(name);
  if (rows5.length === 0 && !hasCollection(name)) return [...seed];
  return rows5.map((r) => JSON.parse(r.data));
}
function hasCollection(name) {
  const row5 = db.prepare("SELECT 1 AS x FROM records WHERE collection = ? AND id = '__init__'").get(name);
  return !!row5;
}
function saveCollections(collections) {
  const del = db.prepare("DELETE FROM records WHERE collection = ?");
  const ins = db.prepare("INSERT INTO records (collection, id, data) VALUES (?, ?, ?)");
  db.exec("BEGIN");
  try {
    for (const [name, items] of Object.entries(collections)) {
      del.run(name);
      ins.run(name, "__init__", "{}");
      for (const item of items) ins.run(name, item.id, JSON.stringify(item));
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

// server/audit.ts
function audit(req, action, opts = {}) {
  const actor = opts.actor ?? req?.user ?? null;
  db.prepare(
    "INSERT INTO audit_log (ts, actor_id, actor_role, action, target_type, target_id, ip, details) VALUES (?,?,?,?,?,?,?,?)"
  ).run(
    (/* @__PURE__ */ new Date()).toISOString(),
    actor?.id ?? null,
    actor?.role ?? null,
    action,
    opts.target?.[0] ?? null,
    opts.target?.[1] ?? null,
    req?.ip ?? null,
    opts.details ? JSON.stringify(opts.details) : null
  );
}

// server/auth.ts
import crypto2 from "crypto";

// server/totp.ts
import crypto from "crypto";
var B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function toBase32(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[value << 5 - bits & 31];
  return out;
}
function fromBase32(s) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of s.toUpperCase().replace(/=+$/, "")) {
    const i = B32.indexOf(ch);
    if (i < 0) continue;
    value = value << 5 | i;
    bits += 5;
    if (bits >= 8) {
      out.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function hotp(key, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6;
  return String(n).padStart(6, "0");
}
var newTotpSecret = () => toBase32(crypto.randomBytes(20));
function verifyTotp(secret, code, now = Date.now()) {
  const clean = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const key = fromBase32(secret);
  const step = Math.floor(now / 3e4);
  let ok = false;
  for (const d of [-1, 0, 1]) {
    if (crypto.timingSafeEqual(Buffer.from(hotp(key, step + d)), Buffer.from(clean))) ok = true;
  }
  return ok;
}
var otpauthUrl = (account, secret, issuer = "MedCred") => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// server/auth.ts
var COOKIE = "cv_session";
var SESSION_DAYS = 7;
var MAX_FAILED = 5;
var LOCK_MINUTES = 15;
var isProd = () => process.env.NODE_ENV === "production";
function hashPassword(password) {
  const salt = crypto2.randomBytes(16);
  const hash = crypto2.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto2.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto2.timingSafeEqual(expected, actual);
}
function passwordProblem(password) {
  if (typeof password !== "string" || password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must include letters and numbers.";
  return null;
}
var DUMMY_HASH = hashPassword(crypto2.randomBytes(8).toString("hex"));
var sha = (s) => crypto2.createHash("sha256").update(s).digest("hex");
var sessionSecret = () => process.env.SESSION_SECRET || process.env.RECORD_SIGNING_SECRET || "medcred-vercel-session-secret-2026";
var signSessionPart = (payload) => crypto2.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
var revokedTokens = /* @__PURE__ */ new Set();
function createSession(req, res, userId) {
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 864e5);
  const nonce = crypto2.randomBytes(12).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ u: userId, e: expires.getTime(), n: nonce })).toString("base64url");
  const token = `${payload}.${signSessionPart(payload)}`;
  db.prepare("INSERT INTO sessions (token_hash,user_id,created_at,expires_at,ip,user_agent) VALUES (?,?,?,?,?,?)").run(
    sha(token),
    userId,
    now.toISOString(),
    expires.toISOString(),
    req.ip ?? null,
    String(req.headers["user-agent"] ?? "").slice(0, 200)
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: SESSION_DAYS * 864e5
  });
}
function destroySession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) {
    revokedTokens.add(sha(token));
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
  }
  res.clearCookie(COOKIE, { path: "/" });
}
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}
function verifySignedToken(token) {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signSessionPart(payload);
  if (sig.length !== expected.length || !crypto2.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed?.u === "string" && typeof parsed?.e === "number" && parsed.e > Date.now()) {
      return parsed.u;
    }
  } catch {
  }
  return null;
}
function loadSession(req, _res, next) {
  const token = readCookie(req, COOKIE);
  if (token && !revokedTokens.has(sha(token))) {
    const row5 = db.prepare(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url AS avatarUrl, u.profile_id AS profileId, u.status, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    ).get(sha(token));
    if (row5 && row5.status === "active" && new Date(row5.expiresAt) > /* @__PURE__ */ new Date()) {
      req.user = { id: row5.id, email: row5.email, name: row5.name, role: row5.role, avatarUrl: row5.avatarUrl, profileId: row5.profileId };
    } else {
      const userId = verifySignedToken(token);
      if (userId) {
        const uRow = db.prepare(
          `SELECT id, email, name, role, avatar_url AS avatarUrl, profile_id AS profileId, status FROM users WHERE id = ?`
        ).get(userId);
        if (uRow && uRow.status === "active") {
          req.user = { id: uRow.id, email: uRow.email, name: uRow.name, role: uRow.role, avatarUrl: uRow.avatarUrl, profileId: uRow.profileId };
        }
      }
    }
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ status: "error", message: "Please sign in to continue." });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ status: "error", message: "Please sign in to continue." });
    if (!roles.includes(req.user.role)) {
      audit(req, "access.denied", { details: { path: req.path, method: req.method } });
      return res.status(403).json({ status: "error", message: "You do not have permission to do this." });
    }
    next();
  };
}
function attemptLogin(req, email, password, role, code) {
  const generic = { error: "Invalid email or password." };
  const row5 = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row5) {
    verifyPassword(password, DUMMY_HASH);
    audit(req, "auth.login.failed", { details: { reason: "unknown_email" } });
    return generic;
  }
  if (row5.locked_until && new Date(row5.locked_until) > /* @__PURE__ */ new Date()) {
    audit(req, "auth.login.locked", { actor: { id: row5.id, role: row5.role } });
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }
  const ok = verifyPassword(password, row5.password_hash);
  const pharmacyOff = row5.role === "pharmacy" && !db.prepare("SELECT 1 AS x FROM pharmacies WHERE id = ? AND active = 1 AND verified_at IS NOT NULL").get(row5.profile_id);
  if (!ok || row5.status !== "active" || pharmacyOff || role && role !== row5.role) {
    if (!ok) {
      const failed = row5.failed_logins + 1;
      const lock = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 6e4).toISOString() : null;
      db.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?").run(lock ? 0 : failed, lock, row5.id);
    }
    audit(req, "auth.login.failed", { actor: { id: row5.id, role: row5.role }, details: { reason: ok ? "role_or_status" : "bad_password" } });
    return generic;
  }
  if (row5.totp_enabled) {
    if (!code) return { error: "Enter the 6-digit code from your authenticator app.", needsCode: true };
    if (!verifyTotp(row5.totp_secret, code)) {
      const failed = row5.failed_logins + 1;
      const lock = failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 6e4).toISOString() : null;
      db.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?").run(lock ? 0 : failed, lock, row5.id);
      audit(req, "auth.login.failed", { actor: { id: row5.id, role: row5.role }, details: { reason: "bad_totp" } });
      return { error: "That code is not correct.", needsCode: true };
    }
  }
  db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(row5.id);
  return { id: row5.id, email: row5.email, name: row5.name, role: row5.role, avatarUrl: row5.avatar_url, profileId: row5.profile_id };
}
function createUser(u) {
  const id = u.id || "usr-" + crypto2.randomBytes(8).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const email = u.email.trim().toLowerCase();
  db.prepare(
    "INSERT INTO users (id,email,password_hash,role,name,avatar_url,profile_id,consent_version,consent_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    email,
    hashPassword(u.password),
    u.role,
    u.name,
    u.avatarUrl ?? null,
    u.profileId ?? null,
    u.consentVersion ?? null,
    u.consentVersion ? now : null,
    now
  );
  return { id, email, name: u.name, role: u.role, avatarUrl: u.avatarUrl ?? null, profileId: u.profileId ?? null };
}
function emailTaken(email) {
  return !!db.prepare("SELECT 1 AS x FROM users WHERE email = ?").get(email.trim().toLowerCase());
}
function ensureAdmin() {
  const exists = db.prepare("SELECT 1 AS x FROM users WHERE role = 'admin'").get();
  if (exists) return;
  const email = (process.env.ADMIN_EMAIL || "admin@careverified.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "DemoPass123";
  createUser({ id: "usr-demo-admin", email, password, role: "admin", name: "Board Administrator" });
  console.log("=".repeat(60));
  console.log(`Created first admin account: ${email}`);
  console.log("=".repeat(60));
}
function changePassword(userId, newPassword) {
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hashPassword(newPassword), userId);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

// server/documents.ts
import crypto3 from "crypto";
import fs2 from "fs";
import path2 from "path";
import multer from "multer";
import { Router } from "express";
var root = path2.join(dataDir, "uploads");
try {
  fs2.mkdirSync(root, { recursive: true });
} catch {
}
var MAX_BYTES = 5 * 1024 * 1024;
var KINDS = ["license", "degree", "identity", "lab_result", "cpd", "certificate", "other"];
var upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });
function detectType(buf) {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: "image/png", ext: "png" };
  return null;
}
var requestOwner = () => null;
var setRequestOwnerLookup = (fn) => {
  requestOwner = fn;
};
var clinical = null;
var setClinicalHooks = (h) => {
  clinical = h;
};
var documentsRouter = Router();
documentsRouter.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File is larger than 5 MB." : "Upload failed.";
      return res.status(400).json({ status: "error", message: msg });
    }
    const file = req.file;
    const kind = String(req.body.kind || "other");
    if (!file) return res.status(400).json({ status: "error", message: "No file provided." });
    if (!KINDS.includes(kind)) return res.status(400).json({ status: "error", message: "Unknown document type." });
    const type = detectType(file.buffer);
    if (!type) return res.status(400).json({ status: "error", message: "Only PDF, JPG or PNG files are accepted." });
    const requestId = req.body.verificationRequestId ? String(req.body.verificationRequestId) : null;
    if (requestId && requestOwner(requestId) !== req.user.id) {
      return res.status(403).json({ status: "error", message: "That verification request is not yours." });
    }
    const labOrderId = req.body.labOrderId ? String(req.body.labOrderId) : null;
    if (kind === "lab_result" && (!labOrderId || clinical?.labOrderOwner(labOrderId) !== req.user.id)) {
      return res.status(403).json({ status: "error", message: "That lab order is not yours." });
    }
    const id = "doc-" + crypto3.randomBytes(8).toString("hex");
    const storedName = `${crypto3.randomBytes(16).toString("hex")}.${type.ext}`;
    fs2.writeFileSync(path2.join(root, storedName), file.buffer, { mode: 384 });
    db.prepare(
      "INSERT INTO documents (id,owner_id,kind,original_name,mime,size,stored_name,sha256,verification_request_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).run(
      id,
      req.user.id,
      kind,
      path2.basename(file.originalname).slice(0, 120),
      type.mime,
      file.size,
      storedName,
      crypto3.createHash("sha256").update(file.buffer).digest("hex"),
      requestId,
      (/* @__PURE__ */ new Date()).toISOString()
    );
    if (kind === "lab_result" && labOrderId) clinical?.onLabResult(labOrderId, id);
    audit(req, "document.upload", { target: ["document", id], details: { kind, size: file.size } });
    res.status(201).json({ status: "success", data: { id, kind, originalName: file.originalname, mime: type.mime, size: file.size } });
  });
});
var rowToDto = (r) => ({
  id: r.id,
  ownerId: r.owner_id,
  kind: r.kind,
  originalName: r.original_name,
  mime: r.mime,
  size: r.size,
  verificationRequestId: r.verification_request_id,
  createdAt: r.created_at
});
documentsRouter.get("/", requireAuth, (req, res) => {
  const user = req.user;
  let rows5;
  if (user.role === "admin" && (req.query.ownerId || req.query.verificationRequestId)) {
    rows5 = req.query.verificationRequestId ? db.prepare("SELECT * FROM documents WHERE verification_request_id = ? ORDER BY created_at DESC").all(String(req.query.verificationRequestId)) : db.prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY created_at DESC").all(String(req.query.ownerId));
  } else {
    rows5 = db.prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY created_at DESC").all(user.id);
  }
  res.json({ status: "success", data: rows5.map(rowToDto) });
});
documentsRouter.get("/:id/download", requireAuth, (req, res) => {
  const row5 = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  const user = req.user;
  const allowed = !!row5 && (row5.owner_id === user.id || user.role === "admin" || !!clinical?.canViewLabDocument(user, row5));
  if (!row5 || !allowed) {
    return res.status(404).json({ status: "error", message: "Document not found." });
  }
  if (row5.owner_id !== user.id) audit(req, "document.view", { target: ["document", row5.id], details: { ownerId: row5.owner_id } });
  res.setHeader("Content-Type", row5.mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `attachment; filename="${row5.original_name.replace(/[^\w.\- ]/g, "_")}"`);
  res.sendFile(path2.join(root, row5.stored_name));
});

// server/clinical.ts
import crypto5 from "crypto";
import rateLimit from "express-rate-limit";

// server/verification.ts
import crypto4 from "crypto";
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
var INFO_REQUESTED = "Info Requested";
var REVERIFY_MONTHS = 12;
var WARN_DAYS = 30;
var COMPLAINT_CATEGORIES = ["Professional conduct", "Misdiagnosis or care quality", "Fake or invalid credentials", "Privacy breach", "Billing", "Other"];
var str = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail = (res, code, message) => res.status(code).json({ status: "error", message });
var isoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
var newId = (p) => `${p}-${crypto4.randomBytes(6).toString("hex")}`;
function notify(userId, title, body) {
  if (!userId) return;
  db.prepare("INSERT INTO notifications (id,user_id,ts,title,body) VALUES (?,?,?,?,?)").run(newId("ntf"), userId, (/* @__PURE__ */ new Date()).toISOString(), title, body);
}
var accountOfProfile = (profileId) => db.prepare("SELECT id FROM users WHERE profile_id = ?").get(profileId)?.id ?? null;
function notifyAdmins(title, body) {
  for (const a of db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").all()) notify(a.id, title, body);
}
function logEvent(requestId, professionalId, actorId, action, note, visible = false) {
  db.prepare("INSERT INTO verification_events (request_id,professional_id,ts,actor_id,action,note,visible_to_practitioner) VALUES (?,?,?,?,?,?,?)").run(requestId, professionalId, (/* @__PURE__ */ new Date()).toISOString(), actorId, action, note ?? null, visible ? 1 : 0);
}
var addMonths = (d, m) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};
function registerVerificationRoutes(app2, ctx) {
  const findProf = (id) => ctx.allProfessionals().find((p) => p.id === id);
  const findReq = (id) => ctx.requests().find((r) => r.id === id);
  const latestRequestFor = (profileId) => [...ctx.requests()].reverse().find((r) => r.userId === profileId);
  app2.get("/api/my-verification", requireRole("practitioner"), (req, res) => {
    const profileId = req.user.profileId;
    if (!profileId) return res.json({ status: "success", data: null });
    const prof = findProf(profileId);
    const request = latestRequestFor(profileId);
    const events = db.prepare(
      "SELECT ts, action, note FROM verification_events WHERE professional_id = ? AND visible_to_practitioner = 1 ORDER BY id DESC LIMIT 50"
    ).all(profileId);
    const documents = request ? db.prepare("SELECT id, kind, original_name AS originalName, size, created_at AS createdAt FROM documents WHERE owner_id = ? ORDER BY created_at DESC").all(req.user.id) : [];
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
        suspensionReason: prof?.verificationStatus === "Suspended" /* SUSPENDED */ ? prof?.suspensionReason ?? null : null,
        events,
        documents
      }
    });
  });
  app2.post("/api/my-verification/resubmit", requireRole("practitioner"), (req, res) => {
    const profileId = req.user.profileId;
    const prof = profileId ? findProf(profileId) : null;
    const request = profileId ? latestRequestFor(profileId) : null;
    if (!prof || !request) return fail(res, 404, "No verification request found.");
    if (request.status !== INFO_REQUESTED) return fail(res, 409, "There is no open request for more information.");
    const note = str(req.body.note, 1e3);
    const expiry = req.body.licenseExpiry ? isoDate(req.body.licenseExpiry) : null;
    if (req.body.licenseExpiry && !expiry) return fail(res, 400, "Licence expiry must be a valid date.");
    if (expiry) prof.licenseExpiry = expiry;
    request.status = "Pending" /* PENDING */;
    prof.verificationStatus = "Pending" /* PENDING */;
    logEvent(request.id, prof.id, req.user.id, "resubmitted", note, true);
    notifyAdmins("Verification resubmitted", `${prof.name} responded to the information request.`);
    audit(req, "verification.resubmit", { target: ["verification", request.id] });
    res.json({ status: "success", message: "Thank you. Your application is back in the review queue." });
  });
  app2.post("/api/my-verification/renew", requireRole("practitioner"), (req, res) => {
    const profileId = req.user.profileId;
    const prof = profileId ? findProf(profileId) : null;
    if (!prof) return fail(res, 404, "No professional profile found.");
    if (prof.verificationStatus !== "Verified \u2705" /* VERIFIED */ && prof.verificationStatus !== "Suspended" /* SUSPENDED */) {
      return fail(res, 409, "Renewal applies to verified or suspended profiles only.");
    }
    const open = ctx.requests().find((r) => r.userId === prof.id && (r.status === "Pending" /* PENDING */ || r.status === INFO_REQUESTED));
    if (open) return fail(res, 409, "You already have a review in progress.");
    const expiry = isoDate(req.body.licenseExpiry);
    if (!expiry || expiry <= (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) return fail(res, 400, "Enter the new licence expiry date (must be in the future).");
    prof.licenseExpiry = expiry;
    const request = {
      id: newId("ver"),
      userId: prof.id,
      accountId: req.user.id,
      userName: prof.name,
      userType: prof.role,
      licenseNumber: prof.licenseNumber,
      medicalCouncil: prof.medicalCouncil ?? prof.nursingCouncil,
      degreeName: prof.education?.[0] ?? "",
      fileUrl: "",
      submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "Pending" /* PENDING */,
      kind: "renewal"
    };
    ctx.requests().push(request);
    logEvent(request.id, prof.id, req.user.id, "renewal_submitted", str(req.body.note, 1e3), true);
    notifyAdmins("Renewal submitted", `${prof.name} submitted renewed documents.`);
    audit(req, "verification.renew", { target: ["verification", request.id] });
    res.status(201).json({ status: "success", data: { verificationRequestId: request.id } });
  });
  app2.get("/api/verification-requests", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: ctx.requests() });
  });
  app2.get("/api/verification-requests/:id/history", requireRole("admin"), (req, res) => {
    const request = findReq(req.params.id);
    if (!request) return fail(res, 404, "Verification request not found.");
    const events = db.prepare(
      `SELECT e.ts, e.action, e.note, u.name AS actorName FROM verification_events e
       LEFT JOIN users u ON u.id = e.actor_id WHERE e.professional_id = ? ORDER BY e.id DESC`
    ).all(request.userId);
    res.json({ status: "success", data: events });
  });
  app2.post("/api/verification-requests/:id/decision", requireRole("admin"), (req, res) => {
    const request = findReq(req.params.id);
    if (!request) return fail(res, 404, "Verification request not found.");
    const prof = findProf(request.userId);
    if (!prof) return fail(res, 404, "Practitioner profile not found.");
    const decision = req.body.decision;
    const note = str(req.body.note, 1e3);
    const actor = req.user;
    const target = accountOfProfile(prof.id);
    if (request.status !== "Pending" /* PENDING */) {
      return fail(res, 409, `This request is already ${request.status}.`);
    }
    if (decision === "request_info") {
      if (!note) return fail(res, 400, "Tell the practitioner what is missing.");
      request.status = INFO_REQUESTED;
      prof.verificationStatus = "Pending" /* PENDING */;
      logEvent(request.id, prof.id, actor.id, "info_requested", note, true);
      notify(target, "More information needed", note);
    } else if (decision === "reject") {
      if (!note) return fail(res, 400, "A reason is required to reject an application.");
      request.status = "Rejected" /* REJECTED */;
      request.rejectionReason = note;
      prof.verificationStatus = "Rejected" /* REJECTED */;
      logEvent(request.id, prof.id, actor.id, "rejected", note, true);
      notify(target, "Application rejected", note);
    } else if (decision === "approve") {
      const docCount = db.prepare("SELECT COUNT(*) AS n FROM documents WHERE verification_request_id = ?").get(request.id).n;
      if (docCount === 0) return fail(res, 400, "Cannot approve: no documents were uploaded for this application.");
      const expiry = prof.licenseExpiry;
      if (!expiry || expiry <= (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
        return fail(res, 400, "Cannot approve: the licence expiry date is missing or already past.");
      }
      const registryReference = str(req.body.registryReference, 200);
      if (!registryReference) {
        return fail(res, 400, "Record how the licence was checked with the council register (reference or URL) before approving.");
      }
      const now = /* @__PURE__ */ new Date();
      request.status = "Verified \u2705" /* VERIFIED */;
      request.reviewedBy = actor.id;
      request.registryCheck = { reference: registryReference, checkedAt: now.toISOString(), checkedBy: actor.id };
      prof.verificationStatus = "Verified \u2705" /* VERIFIED */;
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
    request.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    audit(req, "verification.decision", { target: ["verification", request.id], details: { decision, profileId: prof.id } });
    res.json({ status: "success", message: `Decision recorded: ${decision}.`, data: { request, professional: prof } });
  });
  app2.post("/api/professionals/:id/suspend", requireRole("admin"), (req, res) => {
    const prof = findProf(req.params.id);
    if (!prof) return fail(res, 404, "Practitioner not found.");
    const reason = str(req.body.reason, 1e3);
    if (!reason) return fail(res, 400, "A reason is required.");
    if (prof.verificationStatus === "Suspended" /* SUSPENDED */) return fail(res, 409, "Already suspended.");
    prof.verificationStatus = "Suspended" /* SUSPENDED */;
    prof.suspensionReason = reason;
    logEvent(null, prof.id, req.user.id, "suspended", reason, true);
    notify(accountOfProfile(prof.id), "Your profile has been suspended", reason);
    audit(req, "professional.suspend", { target: ["professional", prof.id], details: { reason } });
    res.json({ status: "success", data: prof });
  });
  app2.post("/api/professionals/:id/reinstate", requireRole("admin"), (req, res) => {
    const prof = findProf(req.params.id);
    if (!prof) return fail(res, 404, "Practitioner not found.");
    if (prof.verificationStatus !== "Suspended" /* SUSPENDED */) return fail(res, 409, "Practitioner is not suspended.");
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (!prof.licenseExpiry || prof.licenseExpiry <= today) {
      return fail(res, 400, "Licence has expired. Ask the practitioner for a renewed licence and run a new verification.");
    }
    if (prof.verifiedUntil && prof.verifiedUntil <= today) {
      return fail(res, 400, "Re-verification is overdue. Ask the practitioner to resubmit documents.");
    }
    prof.verificationStatus = "Verified \u2705" /* VERIFIED */;
    delete prof.suspensionReason;
    logEvent(null, prof.id, req.user.id, "reinstated", str(req.body.note, 1e3), true);
    notify(accountOfProfile(prof.id), "Your profile has been reinstated", "You are visible in the directory again.");
    audit(req, "professional.reinstate", { target: ["professional", prof.id] });
    res.json({ status: "success", data: prof });
  });
  app2.get("/api/admin/practitioners", requireRole("admin"), (_req, res) => {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const soon = new Date(Date.now() + WARN_DAYS * 864e5).toISOString().slice(0, 10);
    const data = ctx.allProfessionals().map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      specialization: p.specialization,
      licenseNumber: p.licenseNumber,
      verificationStatus: p.verificationStatus,
      licenseExpiry: p.licenseExpiry ?? null,
      verifiedAt: p.verifiedAt ?? null,
      verifiedUntil: p.verifiedUntil ?? null,
      suspensionReason: p.suspensionReason ?? null,
      flag: p.verificationStatus !== "Verified \u2705" /* VERIFIED */ ? null : !p.licenseExpiry ? "no_expiry_on_file" : p.licenseExpiry <= today ? "licence_expired" : p.licenseExpiry <= soon ? "licence_expiring" : p.verifiedUntil && p.verifiedUntil <= soon ? "reverification_due" : null
    }));
    res.json({ status: "success", data });
  });
  app2.get("/api/verify-license/:licenseNumber", (req, res) => {
    const lic = str(req.params.licenseNumber, 50).toLowerCase();
    const p = ctx.allProfessionals().find((x) => x.licenseNumber.toLowerCase() === lic);
    if (!p || p.verificationStatus !== "Verified \u2705" /* VERIFIED */) {
      return res.json({ status: "success", data: { verified: false } });
    }
    res.json({
      status: "success",
      data: {
        verified: true,
        name: p.name,
        role: p.role,
        specialization: p.specialization,
        council: p.medicalCouncil ?? p.nursingCouncil,
        verifiedUntil: p.verifiedUntil ?? null
      }
    });
  });
  app2.get("/api/complaint-categories", (_req, res) => res.json({ status: "success", data: COMPLAINT_CATEGORIES }));
  app2.post("/api/complaints", requireRole("patient"), (req, res) => {
    const professionalId = str(req.body.professionalId, 60);
    const category = str(req.body.category, 80);
    const description = str(req.body.description, 2e3);
    const bookingId = req.body.bookingId ? str(req.body.bookingId, 60) : null;
    if (!findProf(professionalId)) return fail(res, 404, "Practitioner not found.");
    if (!COMPLAINT_CATEGORIES.includes(category)) return fail(res, 400, "Choose a complaint category.");
    if (description.length < 20) return fail(res, 400, "Please describe what happened (at least 20 characters).");
    const mine = ctx.bookings().filter((b) => b.patientUserId === req.user.id && b.professionalId === professionalId);
    if (mine.length === 0) return fail(res, 403, "You can only report practitioners you have booked.");
    if (bookingId && !mine.some((b) => b.id === bookingId)) return fail(res, 400, "That booking is not yours.");
    const open = db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE complainant_user_id = ? AND professional_id = ? AND status IN ('open','investigating')").get(req.user.id, professionalId).n;
    if (open > 0) return fail(res, 409, "You already have an open complaint about this practitioner.");
    const id = newId("cmp");
    db.prepare("INSERT INTO complaints (id,professional_id,complainant_user_id,booking_id,category,description,created_at) VALUES (?,?,?,?,?,?,?)").run(id, professionalId, req.user.id, bookingId, category, description, (/* @__PURE__ */ new Date()).toISOString());
    notifyAdmins("New complaint", `A patient reported ${findProf(professionalId).name} (${category}).`);
    audit(req, "complaint.create", { target: ["complaint", id], details: { professionalId, category } });
    res.status(201).json({ status: "success", message: "Your complaint was submitted. The medical board will review it.", data: { id } });
  });
  app2.get("/api/complaints", requireAuth, (req, res) => {
    const u = req.user;
    if (u.role === "admin") {
      const rows5 = db.prepare(
        `SELECT c.*, u.name AS complainantName FROM complaints c LEFT JOIN users u ON u.id = c.complainant_user_id ORDER BY c.created_at DESC`
      ).all().map((r) => ({ ...r, professionalName: findProf(r.professional_id)?.name }));
      return res.json({ status: "success", data: rows5 });
    }
    if (u.role === "patient") {
      const rows5 = db.prepare("SELECT id, professional_id, category, status, created_at, resolution FROM complaints WHERE complainant_user_id = ? ORDER BY created_at DESC").all(u.id);
      return res.json({ status: "success", data: rows5 });
    }
    return fail(res, 403, "You do not have permission to do this.");
  });
  app2.post("/api/complaints/:id/resolve", requireRole("admin"), (req, res) => {
    const row5 = db.prepare("SELECT * FROM complaints WHERE id = ?").get(req.params.id);
    if (!row5) return fail(res, 404, "Complaint not found.");
    const outcome = req.body.outcome;
    const resolution = str(req.body.resolution, 1e3);
    if (!["investigating", "upheld", "dismissed"].includes(outcome)) return fail(res, 400, "Outcome must be investigating, upheld or dismissed.");
    if (outcome !== "investigating" && !resolution) return fail(res, 400, "Write a short resolution note.");
    const done = outcome !== "investigating";
    db.prepare("UPDATE complaints SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ? WHERE id = ?").run(outcome, resolution || null, done ? req.user.id : null, done ? (/* @__PURE__ */ new Date()).toISOString() : null, row5.id);
    const prof = findProf(row5.professional_id);
    if (outcome === "upheld" && prof) {
      logEvent(null, prof.id, req.user.id, "complaint_upheld", resolution, true);
      notify(accountOfProfile(prof.id), "A complaint against you was upheld", resolution);
      if (req.body.suspend === true && prof.verificationStatus === "Verified \u2705" /* VERIFIED */) {
        prof.verificationStatus = "Suspended" /* SUSPENDED */;
        prof.suspensionReason = `Complaint upheld: ${resolution}`;
        logEvent(null, prof.id, req.user.id, "suspended", prof.suspensionReason, true);
      }
    }
    notify(row5.complainant_user_id, "Update on your complaint", outcome === "investigating" ? "The medical board is investigating." : `Outcome: ${outcome}. ${resolution}`);
    audit(req, "complaint.resolve", { target: ["complaint", row5.id], details: { outcome, suspended: req.body.suspend === true } });
    res.json({ status: "success" });
  });
  app2.get("/api/notifications", requireAuth, (req, res) => {
    const rows5 = db.prepare("SELECT id, ts, title, body, is_read AS isRead FROM notifications WHERE user_id = ? ORDER BY ts DESC LIMIT 50").all(req.user.id);
    res.json({ status: "success", data: rows5 });
  });
  app2.post("/api/notifications/read-all", requireAuth, (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.user.id);
    res.json({ status: "success" });
  });
  const runChecks = () => {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const soon = new Date(Date.now() + WARN_DAYS * 864e5).toISOString().slice(0, 10);
    for (const p of ctx.allProfessionals()) {
      if (p.verificationStatus !== "Verified \u2705" /* VERIFIED */) continue;
      const account = accountOfProfile(p.id);
      const expired = p.licenseExpiry && p.licenseExpiry <= today;
      const overdue = p.verifiedUntil && p.verifiedUntil <= today;
      if (expired || overdue) {
        const reason = expired ? `Licence expired on ${p.licenseExpiry}.` : `Re-verification was due on ${p.verifiedUntil}.`;
        p.verificationStatus = "Suspended" /* SUSPENDED */;
        p.suspensionReason = reason;
        logEvent(null, p.id, null, "auto_suspended", reason, true);
        notify(account, "Your profile was suspended", `${reason} Upload your renewed documents to be reinstated.`);
        notifyAdmins("Practitioner auto-suspended", `${p.name}: ${reason}`);
        audit(null, "professional.auto_suspend", { actor: null, target: ["professional", p.id], details: { reason } });
        continue;
      }
      const warnKey = expired === false && p.licenseExpiry && p.licenseExpiry <= soon ? `licence:${p.licenseExpiry}` : p.verifiedUntil && p.verifiedUntil <= soon ? `reverify:${p.verifiedUntil}` : null;
      if (warnKey && p.lastWarning !== warnKey) {
        p.lastWarning = warnKey;
        const what = warnKey.startsWith("licence") ? `Your licence expires on ${p.licenseExpiry}.` : `Re-verification is due by ${p.verifiedUntil}.`;
        notify(account, "Action needed soon", `${what} Please upload renewed documents.`);
        notifyAdmins("Practitioner needs renewal", `${p.name}: ${what}`);
      }
    }
  };
  const scheduled = () => {
    runChecks();
    ctx.persist();
  };
  scheduled();
  setInterval(scheduled, 60 * 60 * 1e3).unref();
}

// server/formulary.ts
var FORMULARY = [
  // Analgesics / antipyretics
  { name: "paracetamol", aliases: ["acetaminophen", "panadol"], classes: ["analgesic", "paracetamol"] },
  { name: "ibuprofen", aliases: ["brufen", "nurofen"], classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "diclofenac", aliases: ["voltaren"], classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "naproxen", classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "mefenamic acid", aliases: ["ponstan"], classes: ["nsaid"], allergyGroups: ["nsaid"] },
  { name: "celecoxib", aliases: ["celebrex"], classes: ["nsaid"], allergyGroups: ["nsaid", "sulfonamide"] },
  { name: "aspirin", aliases: ["acetylsalicylic acid"], classes: ["nsaid", "antiplatelet"], allergyGroups: ["nsaid", "aspirin"] },
  // Antibiotics
  { name: "amoxicillin", aliases: ["amoxil"], classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "amoxicillin-clavulanate", aliases: ["augmentin", "co-amoxiclav"], classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "ampicillin", classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "cloxacillin", classes: ["penicillin", "antibiotic"], allergyGroups: ["penicillin", "beta-lactam"] },
  { name: "cefalexin", aliases: ["cephalexin"], classes: ["cephalosporin", "antibiotic"], allergyGroups: ["cephalosporin", "beta-lactam"] },
  { name: "cefuroxime", classes: ["cephalosporin", "antibiotic"], allergyGroups: ["cephalosporin", "beta-lactam"] },
  { name: "ceftriaxone", classes: ["cephalosporin", "antibiotic"], allergyGroups: ["cephalosporin", "beta-lactam"] },
  { name: "azithromycin", classes: ["macrolide", "antibiotic"], allergyGroups: ["macrolide"] },
  { name: "clarithromycin", classes: ["macrolide", "antibiotic", "cyp3a4-inhibitor"], allergyGroups: ["macrolide"] },
  { name: "erythromycin", classes: ["macrolide", "antibiotic", "cyp3a4-inhibitor"], allergyGroups: ["macrolide"] },
  { name: "ciprofloxacin", classes: ["fluoroquinolone", "antibiotic"], allergyGroups: ["fluoroquinolone"] },
  { name: "levofloxacin", classes: ["fluoroquinolone", "antibiotic"], allergyGroups: ["fluoroquinolone"] },
  { name: "doxycycline", classes: ["tetracycline", "antibiotic"], allergyGroups: ["tetracycline"] },
  { name: "metronidazole", aliases: ["flagyl"], classes: ["nitroimidazole", "antibiotic"] },
  { name: "co-trimoxazole", aliases: ["trimethoprim-sulfamethoxazole", "septrin", "bactrim"], classes: ["sulfonamide", "antibiotic"], allergyGroups: ["sulfonamide"] },
  // Cardiovascular
  { name: "warfarin", classes: ["anticoagulant", "vitamin-k-antagonist"] },
  { name: "rivaroxaban", aliases: ["xarelto"], classes: ["anticoagulant", "doac"] },
  { name: "apixaban", aliases: ["eliquis"], classes: ["anticoagulant", "doac"] },
  { name: "clopidogrel", aliases: ["plavix"], classes: ["antiplatelet"] },
  { name: "enalapril", classes: ["ace-inhibitor", "antihypertensive"], allergyGroups: ["ace-inhibitor"] },
  { name: "perindopril", classes: ["ace-inhibitor", "antihypertensive"], allergyGroups: ["ace-inhibitor"] },
  { name: "lisinopril", classes: ["ace-inhibitor", "antihypertensive"], allergyGroups: ["ace-inhibitor"] },
  { name: "losartan", classes: ["arb", "antihypertensive"] },
  { name: "valsartan", classes: ["arb", "antihypertensive"] },
  { name: "amlodipine", classes: ["calcium-channel-blocker", "antihypertensive"] },
  { name: "nifedipine", classes: ["calcium-channel-blocker", "antihypertensive"] },
  { name: "bisoprolol", classes: ["beta-blocker", "antihypertensive"] },
  { name: "atenolol", classes: ["beta-blocker", "antihypertensive"] },
  { name: "propranolol", classes: ["beta-blocker", "antihypertensive"] },
  { name: "furosemide", aliases: ["frusemide", "lasix"], classes: ["loop-diuretic", "diuretic"], allergyGroups: ["sulfonamide"] },
  { name: "hydrochlorothiazide", classes: ["thiazide", "diuretic"], allergyGroups: ["sulfonamide"] },
  { name: "spironolactone", classes: ["potassium-sparing-diuretic", "diuretic"] },
  { name: "digoxin", classes: ["cardiac-glycoside"] },
  { name: "simvastatin", classes: ["statin", "cyp3a4-substrate-statin"] },
  { name: "atorvastatin", classes: ["statin", "cyp3a4-substrate-statin"] },
  { name: "rosuvastatin", classes: ["statin"] },
  { name: "glyceryl trinitrate", aliases: ["gtn", "nitroglycerin"], classes: ["nitrate"] },
  { name: "isosorbide mononitrate", aliases: ["isosorbide dinitrate"], classes: ["nitrate"] },
  { name: "sildenafil", aliases: ["viagra"], classes: ["pde5-inhibitor"] },
  { name: "tadalafil", aliases: ["cialis"], classes: ["pde5-inhibitor"] },
  // Diabetes
  { name: "metformin", classes: ["biguanide", "antidiabetic"] },
  { name: "gliclazide", classes: ["sulfonylurea", "antidiabetic"] },
  { name: "glibenclamide", aliases: ["glyburide"], classes: ["sulfonylurea", "antidiabetic"] },
  { name: "insulin", classes: ["insulin", "antidiabetic"] },
  // Neuro / psych
  { name: "sertraline", classes: ["ssri", "serotonergic", "antidepressant"] },
  { name: "fluoxetine", classes: ["ssri", "serotonergic", "antidepressant"] },
  { name: "escitalopram", classes: ["ssri", "serotonergic", "antidepressant"] },
  { name: "amitriptyline", classes: ["tca", "antidepressant"] },
  { name: "tramadol", classes: ["opioid", "serotonergic"] },
  { name: "carbamazepine", classes: ["anticonvulsant", "cyp-inducer"] },
  { name: "phenytoin", classes: ["anticonvulsant", "cyp-inducer"] },
  { name: "sodium valproate", aliases: ["valproate", "epilim"], classes: ["anticonvulsant"] },
  // Others commonly prescribed
  { name: "omeprazole", classes: ["ppi"] },
  { name: "pantoprazole", classes: ["ppi"] },
  { name: "domperidone", classes: ["antiemetic"] },
  { name: "ondansetron", classes: ["antiemetic"] },
  { name: "loratadine", classes: ["antihistamine"] },
  { name: "cetirizine", classes: ["antihistamine"] },
  { name: "chlorphenamine", aliases: ["chlorpheniramine"], classes: ["antihistamine"] },
  { name: "salbutamol", aliases: ["albuterol", "ventolin"], classes: ["saba", "bronchodilator"] },
  { name: "prednisolone", classes: ["corticosteroid"] },
  { name: "dexamethasone", classes: ["corticosteroid"] },
  { name: "methotrexate", classes: ["antimetabolite", "dmard"] },
  { name: "allopurinol", classes: ["xanthine-oxidase-inhibitor"] },
  { name: "levothyroxine", classes: ["thyroid-hormone"] },
  { name: "potassium chloride", aliases: ["slow-k", "kcl"], classes: ["potassium-supplement"] },
  { name: "oral rehydration salts", aliases: ["ors"], classes: ["supplement"] },
  { name: "vitamin c", classes: ["supplement"] }
];
var RESTRICTED = [
  "morphine",
  "fentanyl",
  "oxycodone",
  "pethidine",
  "methadone",
  "codeine",
  "buprenorphine",
  "diazepam",
  "alprazolam",
  "lorazepam",
  "clonazepam",
  "midazolam",
  "zolpidem",
  "ketamine",
  "methylphenidate",
  "amphetamine",
  "dexamfetamine",
  "phenobarbital"
];
var norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
function findDrug(input) {
  const n = norm(input);
  if (!n) return void 0;
  return FORMULARY.find((d) => n === d.name || d.aliases?.some((a) => n === a) || n.startsWith(d.name + " ") || d.aliases?.some((a) => n.startsWith(a + " ")));
}
var isRestricted = (input) => {
  const n = norm(input);
  return RESTRICTED.some((r) => n === r || n.startsWith(r + " ") || n.includes(` ${r}`));
};
var RULES = [
  { a: "nitrate", b: "pde5-inhibitor", severity: "contraindicated", message: "Nitrates with PDE5 inhibitors can cause severe, life-threatening hypotension." },
  { a: "simvastatin", b: "cyp3a4-inhibitor", severity: "contraindicated", message: "Clarithromycin/erythromycin markedly raise simvastatin levels (risk of rhabdomyolysis)." },
  { a: "anticoagulant", b: "nsaid", severity: "major", message: "NSAIDs with anticoagulants greatly increase the risk of serious bleeding." },
  { a: "warfarin", b: "macrolide", severity: "major", message: "Macrolide antibiotics can raise INR and bleeding risk with warfarin." },
  { a: "warfarin", b: "fluoroquinolone", severity: "major", message: "Fluoroquinolones can raise INR and bleeding risk with warfarin." },
  { a: "warfarin", b: "metronidazole", severity: "major", message: "Metronidazole markedly raises INR with warfarin." },
  { a: "warfarin", b: "co-trimoxazole", severity: "major", message: "Co-trimoxazole markedly raises INR with warfarin." },
  { a: "anticoagulant", b: "antiplatelet", severity: "major", message: "Anticoagulant plus antiplatelet increases bleeding risk." },
  { a: "ace-inhibitor", b: "potassium-sparing-diuretic", severity: "major", message: "Risk of dangerous hyperkalaemia." },
  { a: "ace-inhibitor", b: "potassium-supplement", severity: "major", message: "Risk of dangerous hyperkalaemia." },
  { a: "arb", b: "potassium-sparing-diuretic", severity: "major", message: "Risk of dangerous hyperkalaemia." },
  { a: "ace-inhibitor", b: "arb", severity: "major", message: "Dual renin-angiotensin blockade increases risk of hypotension, hyperkalaemia and renal failure." },
  { a: "ace-inhibitor", b: "nsaid", severity: "moderate", message: "NSAIDs can reduce the effect of ACE inhibitors and impair kidney function." },
  { a: "arb", b: "nsaid", severity: "moderate", message: "NSAIDs can reduce the effect of ARBs and impair kidney function." },
  { a: "methotrexate", b: "nsaid", severity: "major", message: "NSAIDs can raise methotrexate levels and cause toxicity." },
  { a: "methotrexate", b: "co-trimoxazole", severity: "contraindicated", message: "Co-trimoxazole with methotrexate can cause severe bone-marrow suppression." },
  { a: "serotonergic", b: "serotonergic", severity: "major", message: "Combining serotonergic drugs increases the risk of serotonin syndrome." },
  { a: "ssri", b: "nsaid", severity: "moderate", message: "SSRIs with NSAIDs increase gastrointestinal bleeding risk." },
  { a: "ssri", b: "anticoagulant", severity: "moderate", message: "SSRIs may increase bleeding risk with anticoagulants." },
  { a: "digoxin", b: "macrolide", severity: "major", message: "Macrolides can raise digoxin levels to toxic range." },
  { a: "digoxin", b: "loop-diuretic", severity: "moderate", message: "Diuretic-induced low potassium increases digoxin toxicity risk." },
  { a: "beta-blocker", b: "calcium-channel-blocker", severity: "moderate", message: "Check heart rate and blood pressure when combining beta-blockers with calcium-channel blockers (severe bradycardia is a risk with verapamil/diltiazem)." },
  { a: "sulfonylurea", b: "co-trimoxazole", severity: "major", message: "Co-trimoxazole can cause severe hypoglycaemia with sulfonylureas." },
  { a: "sulfonylurea", b: "fluoroquinolone", severity: "moderate", message: "Fluoroquinolones can cause hypo- or hyperglycaemia in patients on sulfonylureas." },
  { a: "statin", b: "macrolide", severity: "moderate", message: "Macrolides can raise statin levels; monitor for muscle symptoms." },
  { a: "carbamazepine", b: "macrolide", severity: "major", message: "Macrolides can raise carbamazepine levels to toxic range." },
  { a: "tca", b: "ssri", severity: "moderate", message: "SSRIs can raise tricyclic levels and add serotonergic effects." },
  { a: "corticosteroid", b: "nsaid", severity: "moderate", message: "Corticosteroids with NSAIDs increase gastrointestinal ulcer and bleeding risk." },
  { a: "allopurinol", b: "penicillin", severity: "moderate", message: "Allopurinol increases the rate of rash with ampicillin/amoxicillin." }
];
var traits = (d) => /* @__PURE__ */ new Set([d.name, ...d.classes]);
var ALLERGY_ALIASES = {
  penicillin: ["penicillin", "beta-lactam"],
  penicillins: ["penicillin", "beta-lactam"],
  amoxicillin: ["penicillin", "beta-lactam"],
  cephalosporin: ["cephalosporin", "beta-lactam"],
  "beta lactam": ["beta-lactam"],
  "beta-lactam": ["beta-lactam"],
  sulfa: ["sulfonamide"],
  sulfonamide: ["sulfonamide"],
  sulphonamide: ["sulfonamide"],
  "sulfa drugs": ["sulfonamide"],
  nsaid: ["nsaid"],
  nsaids: ["nsaid"],
  aspirin: ["aspirin", "nsaid"],
  ibuprofen: ["nsaid"],
  macrolide: ["macrolide"],
  erythromycin: ["macrolide"],
  quinolone: ["fluoroquinolone"],
  fluoroquinolone: ["fluoroquinolone"],
  tetracycline: ["tetracycline"],
  "ace inhibitor": ["ace-inhibitor"]
};
function checkPrescription(itemNames, patient) {
  const warnings = [];
  const items = itemNames.map((raw) => ({ raw, drug: findDrug(raw) }));
  for (const it of items) {
    if (isRestricted(it.raw)) {
      warnings.push({
        key: `restricted:${norm(it.raw)}`,
        severity: "contraindicated",
        type: "restricted",
        drugs: [it.raw],
        message: `${it.raw} is a controlled medicine and cannot be e-prescribed here. Issue a physical prescription.`
      });
    } else if (!it.drug) {
      warnings.push({
        key: `unknown:${norm(it.raw)}`,
        severity: "moderate",
        type: "unknown_drug",
        drugs: [it.raw],
        message: `${it.raw} is not in the built-in formulary, so allergy and interaction checks were not performed for it. Check manually.`
      });
    }
  }
  for (const allergy of patient.allergies) {
    const a = norm(allergy);
    const groups = new Set(ALLERGY_ALIASES[a] ?? []);
    for (const k of Object.keys(ALLERGY_ALIASES)) if (a.includes(k)) ALLERGY_ALIASES[k].forEach((g) => groups.add(g));
    for (const it of items) {
      if (!it.drug) {
        if (a && norm(it.raw).includes(a)) warnings.push({ key: `allergy:${a}:${norm(it.raw)}`, severity: "major", type: "allergy", drugs: [it.raw], message: `Patient reports an allergy to "${allergy}".` });
        continue;
      }
      const hit = it.drug.name === a || it.drug.aliases?.includes(a) || it.drug.allergyGroups?.some((g) => groups.has(g));
      if (hit) warnings.push({
        key: `allergy:${a}:${it.drug.name}`,
        severity: "major",
        type: "allergy",
        drugs: [it.drug.name],
        message: `Patient reports an allergy to "${allergy}", which matches ${it.drug.name}.`
      });
    }
  }
  const current = patient.currentMedications.map((raw) => ({ raw, drug: findDrug(raw) }));
  const pool = [
    ...items.filter((i) => i.drug).map((i) => ({ d: i.drug, from: "prescription" })),
    ...current.filter((i) => i.drug).map((i) => ({ d: i.drug, from: "current" }))
  ];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (pool[i].from === "current" && pool[j].from === "current") continue;
      const A = pool[i].d, B = pool[j].d;
      if (A.name === B.name) {
        const key = `duplicate:${A.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          warnings.push({ key, severity: "major", type: "duplicate", drugs: [A.name], message: `${A.name} appears more than once (including the patient's current medicines).` });
        }
        continue;
      }
      const ta = traits(A), tb = traits(B);
      for (const r of RULES) {
        const hit = ta.has(r.a) && tb.has(r.b) || ta.has(r.b) && tb.has(r.a);
        if (!hit) continue;
        const key = `interaction:${[A.name, B.name].sort().join("+")}:${r.a}:${r.b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        warnings.push({ key, severity: r.severity, type: "interaction", drugs: [A.name, B.name], message: r.message });
      }
      const shared = A.classes.find((c) => B.classes.includes(c) && ["nsaid", "ppi", "statin", "ssri", "ace-inhibitor", "arb", "opioid"].includes(c));
      if (shared && pool[i].from === "prescription" && pool[j].from === "prescription") {
        const key = `dupclass:${shared}:${[A.name, B.name].sort().join("+")}`;
        if (!seen.has(key)) {
          seen.add(key);
          warnings.push({ key, severity: "moderate", type: "duplicate", drugs: [A.name, B.name], message: `Two ${shared.replace("-", " ")} drugs together (therapeutic duplication).` });
        }
      }
    }
  }
  const order = { contraindicated: 0, major: 1, moderate: 2 };
  return warnings.sort((x, y) => order[x.severity] - order[y.severity]);
}

// server/clinical.ts
db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS health_items (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, detail TEXT,
  severity TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_health_user ON health_items(user_id, type);
CREATE TABLE IF NOT EXISTS vitals (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ts TEXT NOT NULL, kind TEXT NOT NULL,
  value1 REAL NOT NULL, value2 REAL, unit TEXT NOT NULL, note TEXT
);
CREATE INDEX IF NOT EXISTS idx_vitals_user ON vitals(user_id, ts);
CREATE TABLE IF NOT EXISTS record_grants (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL, source TEXT NOT NULL,
  ref_id TEXT, granted_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_grants ON record_grants(patient_user_id, professional_id);
CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, ref_id TEXT NOT NULL, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL,
  subjective TEXT, objective TEXT, assessment TEXT, plan TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, signed_at TEXT,
  UNIQUE (kind, ref_id)
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL,
  kind TEXT NOT NULL, ref_id TEXT NOT NULL, items TEXT NOT NULL, diagnosis TEXT NOT NULL, notes TEXT,
  issued_at TEXT NOT NULL, valid_until TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  pharmacy_id TEXT, dispensed_at TEXT, dispensed_by TEXT, cancelled_reason TEXT, signature TEXT NOT NULL,
  warnings TEXT, record_checked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions(patient_user_id);
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL,
  from_date TEXT NOT NULL, to_date TEXT NOT NULL, remarks TEXT, issued_at TEXT NOT NULL, signature TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, from_professional_id TEXT NOT NULL, to_specialty TEXT NOT NULL,
  to_professional_id TEXT, reason TEXT NOT NULL, urgency TEXT NOT NULL, issued_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lab_orders (
  id TEXT PRIMARY KEY, patient_user_id TEXT NOT NULL, professional_id TEXT NOT NULL, tests TEXT NOT NULL, notes TEXT,
  status TEXT NOT NULL DEFAULT 'ordered', ordered_at TEXT NOT NULL, result_document_id TEXT, resulted_at TEXT
);
CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, phone TEXT, pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
`);
for (const col of ["city TEXT", "hours TEXT", "services TEXT"]) {
  try {
    db.exec(`ALTER TABLE pharmacies ADD COLUMN ${col}`);
  } catch {
  }
}
for (const col of ["licence_no TEXT", "pharmacist_name TEXT", "pharmacist_reg TEXT", "verified_at TEXT", "verified_by TEXT"]) {
  try {
    db.exec(`ALTER TABLE pharmacies ADD COLUMN ${col}`);
  } catch {
  }
}
for (const col of ["sent_at TEXT", "fill_status TEXT", "fill_reason TEXT", "fill_updated_at TEXT", "first_response_at TEXT", "share_safety INTEGER NOT NULL DEFAULT 0"]) {
  try {
    db.exec(`ALTER TABLE prescriptions ADD COLUMN ${col}`);
  } catch {
  }
}
db.exec("UPDATE prescriptions SET sent_at = issued_at WHERE pharmacy_id IS NOT NULL AND sent_at IS NULL");
db.exec(`
CREATE TABLE IF NOT EXISTS pharmacy_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, pharmacy_id TEXT NOT NULL, prescription_id TEXT, ts TEXT NOT NULL,
  actor_user_id TEXT, type TEXT NOT NULL, detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_pharmacy_events ON pharmacy_events(pharmacy_id, ts);
CREATE TABLE IF NOT EXISTS pharmacy_notes (
  pharmacy_id TEXT NOT NULL, prescription_id TEXT NOT NULL, note TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY (pharmacy_id, prescription_id)
);
`);
var PHARMACY_SERVICES = ["24 hours", "Home delivery", "Drive-through", "Vaccinations", "Online ordering"];
var cleanServices = (v) => Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string" && PHARMACY_SERVICES.includes(x)))] : [];
var pharmacyView = (p) => ({
  id: p.id,
  name: p.name,
  address: p.address,
  city: p.city ?? null,
  phone: p.phone ?? null,
  hours: p.hours ?? null,
  services: (() => {
    try {
      return cleanServices(JSON.parse(p.services ?? "[]"));
    } catch {
      return [];
    }
  })()
});
var iso = () => (/* @__PURE__ */ new Date()).toISOString();
var newId2 = (p) => `${p}-${crypto5.randomBytes(7).toString("hex")}`;
var str2 = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail2 = (res, code, message) => res.status(code).json({ status: "error", message });
var dateOnly = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
var rows = (sql, ...p) => db.prepare(sql).all(...p);
var row = (sql, ...p) => db.prepare(sql).get(...p);
var rxEffectiveStatus = (r) => r.status === "active" && Date.parse(r.valid_until) < Date.now() ? "expired" : r.status;
function pharmacyEvent(pharmacyId, prescriptionId, type, actorUserId, detail) {
  db.prepare("INSERT INTO pharmacy_events (pharmacy_id, prescription_id, ts, actor_user_id, type, detail) VALUES (?,?,?,?,?,?)").run(pharmacyId, prescriptionId, iso(), actorUserId, type, detail === void 0 ? null : JSON.stringify(detail));
}
function notifyPharmacy(pharmacyId, title, body) {
  const users = rows("SELECT id, email FROM users WHERE role = 'pharmacy' AND profile_id = ? AND status = 'active'", pharmacyId);
  for (const u of users) notify(u.id, title, body);
  const hook = process.env.PHARMACY_ALERT_WEBHOOK_URL;
  if (hook && users.length) {
    fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5e3),
      body: JSON.stringify({ type: "pharmacy.alert", pharmacyId, title, body, recipients: users.map((u) => u.email) })
    }).catch(() => {
    });
  }
}
function signingKey() {
  if (process.env.RECORD_SIGNING_SECRET) return process.env.RECORD_SIGNING_SECRET;
  let r = row("SELECT value FROM settings WHERE key = 'signing_secret'");
  if (!r) {
    const v = crypto5.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO settings (key, value) VALUES ('signing_secret', ?)").run(v);
    r = { value: v };
  }
  return r.value;
}
var sign = (payload) => crypto5.createHmac("sha256", signingKey()).update(JSON.stringify(payload)).digest("hex");
var same = (a, b) => a.length === b.length && crypto5.timingSafeEqual(Buffer.from(a), Buffer.from(b));
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var newCode = () => Array.from(crypto5.randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
var rxPayload = (r) => ({ id: r.id, code: r.code, patient: r.patient_user_id, professional: r.professional_id, issuedAt: r.issued_at, validUntil: r.valid_until, diagnosis: r.diagnosis, items: JSON.parse(r.items) });
var certPayload = (c) => ({ id: c.id, code: c.code, patient: c.patient_user_id, professional: c.professional_id, from: c.from_date, to: c.to_date, issuedAt: c.issued_at });
function createGrant(patientUserId, professionalId, source, refId, days = 30) {
  const existing = row("SELECT id FROM record_grants WHERE patient_user_id = ? AND professional_id = ? AND revoked_at IS NULL AND expires_at > ?", patientUserId, professionalId, iso());
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  if (existing) {
    db.prepare("UPDATE record_grants SET expires_at = MAX(expires_at, ?) WHERE id = ?").run(expires, existing.id);
    return existing.id;
  }
  const id = newId2("grt");
  db.prepare("INSERT INTO record_grants (id, patient_user_id, professional_id, source, ref_id, granted_at, expires_at) VALUES (?,?,?,?,?,?,?)").run(id, patientUserId, professionalId, source, refId, iso(), expires);
  return id;
}
var hasGrant = (patientUserId, professionalId) => !!row("SELECT 1 AS x FROM record_grants WHERE patient_user_id = ? AND professional_id = ? AND revoked_at IS NULL AND expires_at > ?", patientUserId, professionalId, iso());
function seedHealthItems(userId, conditions, allergies) {
  const ins = db.prepare("INSERT INTO health_items (id,user_id,type,name,created_at,updated_at) VALUES (?,?,?,?,?,?)");
  for (const c of conditions) if (c.trim()) ins.run(newId2("hi"), userId, "condition", c.trim().slice(0, 120), iso(), iso());
  for (const a of allergies) if (a.trim()) ins.run(newId2("hi"), userId, "allergy", a.trim().slice(0, 120), iso(), iso());
}
var VITAL_KINDS = {
  bp: { unit: "mmHg", two: true, min: 40, max: 300, min2: 20, max2: 200 },
  glucose: { unit: "mmol/L", min: 0.5, max: 50 },
  heart_rate: { unit: "bpm", min: 20, max: 250 },
  spo2: { unit: "%", min: 50, max: 100 },
  temperature: { unit: "\xB0C", min: 30, max: 45 },
  weight: { unit: "kg", min: 1, max: 400 }
};
function vitalFlag(kind, v1, v2) {
  if (kind === "bp" && (v1 >= 180 || (v2 ?? 0) >= 120)) return { level: "urgent", text: "Very high blood pressure. If you have chest pain, breathlessness, weakness or a severe headache call 999 now; otherwise seek urgent medical advice." };
  if (kind === "bp" && v1 < 90) return { level: "watch", text: "Low blood pressure. Sit or lie down, and seek advice if you feel faint or unwell." };
  if (kind === "spo2" && v1 < 92) return { level: "urgent", text: "Low oxygen level. Seek urgent medical help." };
  if (kind === "glucose" && v1 < 3.9) return { level: "urgent", text: "Low blood sugar. Take fast-acting sugar and seek help if you do not recover quickly." };
  if (kind === "glucose" && v1 >= 16.7) return { level: "watch", text: "Very high blood sugar. Contact your doctor today." };
  if (kind === "heart_rate" && (v1 > 130 || v1 < 40)) return { level: "urgent", text: "Unusual heart rate. If you feel unwell, seek urgent help." };
  if (kind === "temperature" && v1 >= 39.5) return { level: "watch", text: "High fever. Seek medical advice." };
  return null;
}
function registerClinicalRoutes(app2, ctx) {
  const verifiedPro = (profileId) => {
    const p = profileId ? ctx.findProfessional(profileId) : null;
    return p && p.verificationStatus === "Verified \u2705" /* VERIFIED */ ? p : null;
  };
  const userName = (id) => row("SELECT name FROM users WHERE id = ?", id)?.name ?? "Patient";
  const maskName = (full) => {
    const [first, ...rest] = full.split(" ");
    return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  };
  const relation = (req, kind, refId) => {
    const pid = req.user?.profileId;
    if (!pid || !verifiedPro(pid)) return null;
    if (kind === "booking") {
      const b = ctx.getBooking(refId);
      if (b && b.professionalId === pid && b.paymentStatus === "Paid" && b.status !== "Cancelled") return { patientUserId: b.patientUserId, kind, refId };
    } else if (kind === "consult") {
      const c = row("SELECT patient_user_id FROM consults WHERE id = ? AND professional_id = ? AND status IN ('active','completed')", refId, pid);
      if (c) return { patientUserId: c.patient_user_id, kind, refId };
    }
    return null;
  };
  const patientHasRelationTo = (patientUserId, professionalId) => ctx.allBookings().some((b) => b.patientUserId === patientUserId && b.professionalId === professionalId && b.paymentStatus === "Paid") || !!row("SELECT 1 AS x FROM consults WHERE patient_user_id = ? AND professional_id = ?", patientUserId, professionalId);
  const patientSnapshot = (patientUserId) => ({
    allergies: rows("SELECT name, detail, severity FROM health_items WHERE user_id = ? AND type = 'allergy' AND active = 1", patientUserId),
    conditions: rows("SELECT name, detail FROM health_items WHERE user_id = ? AND type = 'condition' AND active = 1", patientUserId),
    medications: rows("SELECT name, detail FROM health_items WHERE user_id = ? AND type = 'medication' AND active = 1", patientUserId)
  });
  app2.get("/api/records/me", requireRole("patient"), (req, res) => {
    const u = req.user.id;
    const vitals = rows("SELECT id, ts, kind, value1, value2, unit, note FROM vitals WHERE user_id = ? ORDER BY ts DESC LIMIT 100", u).map((v) => ({ ...v, flag: vitalFlag(v.kind, v.value1, v.value2) }));
    const grants = rows("SELECT id, professional_id, source, granted_at, expires_at FROM record_grants WHERE patient_user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY granted_at DESC", u, iso()).map((g) => ({ ...g, professionalName: ctx.findProfessional(g.professional_id)?.name }));
    const myPros = /* @__PURE__ */ new Map();
    for (const b of ctx.allBookings()) if (b.patientUserId === u && b.paymentStatus === "Paid") myPros.set(b.professionalId, b.professionalName);
    for (const c of rows("SELECT DISTINCT professional_id FROM consults WHERE patient_user_id = ? AND professional_id IS NOT NULL", u)) {
      const p = ctx.findProfessional(c.professional_id);
      if (p) myPros.set(p.id, p.name);
    }
    const prescriptions = rows("SELECT * FROM prescriptions WHERE patient_user_id = ? ORDER BY issued_at DESC", u).map((r) => rxView(r));
    res.json({
      status: "success",
      data: {
        ...patientSnapshot(u),
        items: rows("SELECT id, type, name, detail, severity, active FROM health_items WHERE user_id = ? ORDER BY type, name", u),
        vitals,
        grants,
        sharableWith: [...myPros].map(([id, name]) => ({ id, name })),
        prescriptions,
        certificates: rows("SELECT * FROM certificates WHERE patient_user_id = ? ORDER BY issued_at DESC", u).map(certView),
        referrals: rows("SELECT * FROM referrals WHERE patient_user_id = ? ORDER BY issued_at DESC", u).map(refView),
        labOrders: rows("SELECT * FROM lab_orders WHERE patient_user_id = ? ORDER BY ordered_at DESC", u).map(labView),
        encounters: rows("SELECT id, kind, professional_id, subjective, objective, assessment, plan, signed_at FROM encounters WHERE patient_user_id = ? AND signed_at IS NOT NULL ORDER BY signed_at DESC", u).map((e) => ({ ...e, professionalName: ctx.findProfessional(e.professional_id)?.name }))
      }
    });
  });
  app2.post("/api/records/items", requireRole("patient"), (req, res) => {
    const type = req.body.type;
    const name = str2(req.body.name, 120);
    if (!["allergy", "condition", "medication"].includes(type) || !name) return fail2(res, 400, "Choose a type and enter a name.");
    const count = row("SELECT COUNT(*) AS n FROM health_items WHERE user_id = ?", req.user.id).n;
    if (count >= 200) return fail2(res, 400, "Too many entries.");
    const id = newId2("hi");
    db.prepare("INSERT INTO health_items (id,user_id,type,name,detail,severity,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(id, req.user.id, type, name, str2(req.body.detail, 300) || null, ["mild", "moderate", "severe"].includes(req.body.severity) ? req.body.severity : null, iso(), iso());
    res.status(201).json({ status: "success", data: { id } });
  });
  app2.delete("/api/records/items/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("DELETE FROM health_items WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    if (!r.changes) return fail2(res, 404, "Entry not found.");
    res.json({ status: "success" });
  });
  app2.post("/api/records/vitals", requireRole("patient"), (req, res) => {
    const spec = VITAL_KINDS[req.body.kind];
    if (!spec) return fail2(res, 400, "Unknown reading type.");
    const v1 = Number(req.body.value1), v2 = spec.two ? Number(req.body.value2) : null;
    if (!(v1 >= spec.min && v1 <= spec.max)) return fail2(res, 400, "That value looks wrong. Please check it.");
    if (spec.two && !(v2 >= spec.min2 && v2 <= spec.max2)) return fail2(res, 400, "The second value looks wrong. Please check it.");
    const id = newId2("vt");
    db.prepare("INSERT INTO vitals (id,user_id,ts,kind,value1,value2,unit,note) VALUES (?,?,?,?,?,?,?,?)").run(id, req.user.id, iso(), req.body.kind, v1, v2, spec.unit, str2(req.body.note, 200) || null);
    res.status(201).json({ status: "success", data: { id, flag: vitalFlag(req.body.kind, v1, v2) } });
  });
  app2.delete("/api/records/vitals/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("DELETE FROM vitals WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    if (!r.changes) return fail2(res, 404, "Reading not found.");
    res.json({ status: "success" });
  });
  app2.post("/api/records/grants", requireRole("patient"), (req, res) => {
    const professionalId = str2(req.body.professionalId, 60);
    if (!verifiedPro(professionalId)) return fail2(res, 404, "Practitioner not found.");
    if (!patientHasRelationTo(req.user.id, professionalId)) return fail2(res, 403, "You can only share your record with practitioners you have booked or consulted.");
    const days = Math.min(90, Math.max(1, Number(req.body.days) || 30));
    createGrant(req.user.id, professionalId, "manual", null, days);
    audit(req, "record.grant", { target: ["professional", professionalId] });
    res.status(201).json({ status: "success" });
  });
  app2.delete("/api/records/grants/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("UPDATE record_grants SET revoked_at = ? WHERE id = ? AND patient_user_id = ? AND revoked_at IS NULL").run(iso(), req.params.id, req.user.id);
    if (!r.changes) return fail2(res, 404, "Not found.");
    audit(req, "record.revoke", { target: ["grant", req.params.id] });
    res.json({ status: "success" });
  });
  app2.get("/api/clinical/context/:kind/:refId", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, req.params.kind, req.params.refId);
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const pid = req.user.profileId;
    const shared = hasGrant(rel.patientUserId, pid);
    let record = null;
    if (shared) {
      audit(req, "record.view", { target: ["patient", rel.patientUserId] });
      record = {
        ...patientSnapshot(rel.patientUserId),
        vitals: rows("SELECT ts, kind, value1, value2, unit FROM vitals WHERE user_id = ? ORDER BY ts DESC LIMIT 20", rel.patientUserId),
        activePrescriptions: rows("SELECT id, items, issued_at, professional_id FROM prescriptions WHERE patient_user_id = ? AND status = 'active' AND valid_until > ?", rel.patientUserId, iso()).map((r) => ({ issuedAt: r.issued_at, items: JSON.parse(r.items).map((i) => i.name) })),
        labResults: rows("SELECT o.id, o.tests, o.resulted_at, o.result_document_id FROM lab_orders o WHERE o.patient_user_id = ? AND o.result_document_id IS NOT NULL ORDER BY o.resulted_at DESC LIMIT 10", rel.patientUserId)
      };
    }
    const encounter = row("SELECT * FROM encounters WHERE kind = ? AND ref_id = ?", rel.kind, rel.refId);
    res.json({
      status: "success",
      data: {
        patient: { id: rel.patientUserId, name: userName(rel.patientUserId) },
        recordShared: shared,
        record,
        encounter: encounter ? { subjective: encounter.subjective, objective: encounter.objective, assessment: encounter.assessment, plan: encounter.plan, signedAt: encounter.signed_at } : null,
        prescriptions: rows("SELECT * FROM prescriptions WHERE kind = ? AND ref_id = ? AND professional_id = ? ORDER BY issued_at DESC", rel.kind, rel.refId, pid).map((r) => rxView(r)),
        certificates: rows("SELECT * FROM certificates WHERE patient_user_id = ? AND professional_id = ? ORDER BY issued_at DESC", rel.patientUserId, pid).map(certView),
        referrals: rows("SELECT * FROM referrals WHERE patient_user_id = ? AND from_professional_id = ? ORDER BY issued_at DESC", rel.patientUserId, pid).map(refView),
        labOrders: rows("SELECT * FROM lab_orders WHERE patient_user_id = ? AND professional_id = ? ORDER BY ordered_at DESC", rel.patientUserId, pid).map(labView)
      }
    });
  });
  app2.put("/api/encounters/:kind/:refId", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, req.params.kind, req.params.refId);
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const f = (k) => str2(req.body[k], 4e3);
    const existing = row("SELECT * FROM encounters WHERE kind = ? AND ref_id = ?", rel.kind, rel.refId);
    if (existing?.signed_at) return fail2(res, 409, "This note is signed and can no longer be edited.");
    if (existing) {
      db.prepare("UPDATE encounters SET subjective=?, objective=?, assessment=?, plan=?, updated_at=? WHERE id=?").run(f("subjective"), f("objective"), f("assessment"), f("plan"), iso(), existing.id);
    } else {
      db.prepare("INSERT INTO encounters (id,kind,ref_id,patient_user_id,professional_id,subjective,objective,assessment,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(newId2("enc"), rel.kind, rel.refId, rel.patientUserId, req.user.profileId, f("subjective"), f("objective"), f("assessment"), f("plan"), iso(), iso());
    }
    res.json({ status: "success" });
  });
  app2.post("/api/encounters/:kind/:refId/sign", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, req.params.kind, req.params.refId);
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const e = row("SELECT * FROM encounters WHERE kind = ? AND ref_id = ?", rel.kind, rel.refId);
    if (!e) return fail2(res, 400, "Write the note first.");
    if (e.signed_at) return fail2(res, 409, "Already signed.");
    if (!e.assessment || !e.plan) return fail2(res, 400, "Assessment and plan are required to sign.");
    db.prepare("UPDATE encounters SET signed_at = ? WHERE id = ?").run(iso(), e.id);
    if (rel.kind === "booking") ctx.completeBooking(rel.refId);
    audit(req, "encounter.sign", { target: ["encounter", e.id] });
    notify(rel.patientUserId, "Consultation summary available", "Your doctor added a summary to your health record.");
    res.json({ status: "success" });
  });
  const parseItems = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return "Add at least one medicine.";
    if (raw.length > 12) return "A prescription can have at most 12 medicines.";
    const out = [];
    for (const it of raw) {
      const item = {
        name: str2(it?.name, 100),
        strength: str2(it?.strength, 40),
        form: str2(it?.form, 30),
        dose: str2(it?.dose, 60),
        frequency: str2(it?.frequency, 60),
        durationDays: Math.trunc(Number(it?.durationDays)),
        quantity: Math.trunc(Number(it?.quantity)),
        instructions: str2(it?.instructions, 200)
      };
      if (!item.name || !item.dose || !item.frequency) return "Every medicine needs a name, dose and frequency.";
      if (!(item.durationDays >= 1 && item.durationDays <= 90)) return `Duration for ${item.name} must be 1 to 90 days.`;
      if (!(item.quantity >= 1 && item.quantity <= 999)) return `Quantity for ${item.name} must be 1 to 999.`;
      out.push(item);
    }
    return out;
  };
  const safety = (patientUserId, professionalId, items) => {
    const shared = hasGrant(patientUserId, professionalId);
    const snap = shared ? patientSnapshot(patientUserId) : { allergies: [], medications: [], conditions: [] };
    const warnings = checkPrescription(items.map((i) => i.name), {
      allergies: snap.allergies.map((a) => a.name),
      currentMedications: snap.medications.map((m) => m.name)
    });
    return { shared, warnings };
  };
  app2.post("/api/prescriptions/check", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const items = parseItems(req.body.items);
    if (typeof items === "string") return fail2(res, 400, items);
    const { shared, warnings } = safety(rel.patientUserId, req.user.profileId, items);
    res.json({ status: "success", data: { recordShared: shared, warnings, unknown: items.filter((i) => !findDrug(i.name) && !isRestricted(i.name)).map((i) => i.name) } });
  });
  app2.post("/api/prescriptions", requireRole("practitioner"), (req, res) => {
    const pro = verifiedPro(req.user.profileId);
    if (!pro || pro.role !== "doctor") return fail2(res, 403, "Only verified doctors can issue prescriptions.");
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const diagnosis = str2(req.body.diagnosis, 300);
    if (!diagnosis) return fail2(res, 400, "A diagnosis is required.");
    const items = parseItems(req.body.items);
    if (typeof items === "string") return fail2(res, 400, items);
    const { shared, warnings } = safety(rel.patientUserId, pro.id, items);
    if (warnings.some((w) => w.type === "restricted")) return res.status(422).json({ status: "error", message: "A controlled medicine cannot be e-prescribed.", data: { warnings } });
    const blocked = warnings.filter((w) => w.severity === "contraindicated");
    if (blocked.length) return res.status(422).json({ status: "error", message: "This combination is contraindicated and cannot be issued.", data: { warnings } });
    const overrides = {};
    for (const o of Array.isArray(req.body.overrides) ? req.body.overrides : []) if (o?.key && str2(o.reason, 300).length >= 5) overrides[String(o.key)] = str2(o.reason, 300);
    const unacknowledged = warnings.filter((w) => w.severity === "major" && !overrides[w.key]);
    if (unacknowledged.length) return res.status(422).json({ status: "error", message: "Give a reason for each major warning to continue.", data: { warnings, needOverride: unacknowledged.map((w) => w.key) } });
    if (!shared && req.body.attestedAllergyCheck !== true) {
      return res.status(422).json({ status: "error", message: "The patient has not shared their record. Confirm you have asked about allergies and current medicines.", data: { needAttestation: true, warnings } });
    }
    const days = Math.min(90, Math.max(1, Math.trunc(Number(req.body.validDays)) || 30));
    const id = newId2("rx");
    const code = newCode();
    const issuedAt = iso();
    const validUntil = new Date(Date.now() + days * 864e5).toISOString();
    const record = {
      id,
      code,
      patient_user_id: rel.patientUserId,
      professional_id: pro.id,
      issued_at: issuedAt,
      valid_until: validUntil,
      diagnosis,
      items: JSON.stringify(items)
    };
    const signature = sign(rxPayload(record));
    db.prepare(
      `INSERT INTO prescriptions (id,code,patient_user_id,professional_id,kind,ref_id,items,diagnosis,notes,issued_at,valid_until,signature,warnings,record_checked)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id,
      code,
      rel.patientUserId,
      pro.id,
      rel.kind,
      rel.refId,
      record.items,
      diagnosis,
      str2(req.body.notes, 500) || null,
      issuedAt,
      validUntil,
      signature,
      JSON.stringify({ warnings, overrides }),
      shared ? 1 : 0
    );
    notify(rel.patientUserId, "New prescription", `${pro.name} issued a prescription. Open Health Record to view it or send it to a pharmacy.`);
    audit(req, "prescription.issue", { target: ["prescription", id], details: { items: items.length, overridden: Object.keys(overrides).length } });
    res.status(201).json({ status: "success", data: { id, code } });
  });
  app2.post("/api/prescriptions/:id/cancel", requireRole("practitioner"), (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND professional_id = ?", req.params.id, req.user.profileId);
    if (!r) return fail2(res, 404, "Prescription not found.");
    if (r.status !== "active") return fail2(res, 409, "Only active prescriptions can be cancelled.");
    const reason = str2(req.body.reason, 300);
    if (!reason) return fail2(res, 400, "A reason is required.");
    db.prepare("UPDATE prescriptions SET status='cancelled', cancelled_reason=? WHERE id=?").run(reason, r.id);
    notify(r.patient_user_id, "A prescription was cancelled", reason);
    if (r.pharmacy_id) {
      pharmacyEvent(r.pharmacy_id, r.id, "cancelled", req.user.id, { reason });
      notifyPharmacy(r.pharmacy_id, "Prescription cancelled by the doctor", `Prescription ${r.code} was cancelled. Do not dispense it.`);
    }
    audit(req, "prescription.cancel", { target: ["prescription", r.id] });
    res.json({ status: "success" });
  });
  const effectiveStatus = rxEffectiveStatus;
  function rxView(r) {
    const prof = ctx.findProfessional(r.professional_id);
    return {
      id: r.id,
      code: r.code,
      diagnosis: r.diagnosis,
      items: JSON.parse(r.items),
      notes: r.notes,
      issuedAt: r.issued_at,
      validUntil: r.valid_until,
      status: effectiveStatus(r),
      pharmacyId: r.pharmacy_id,
      dispensedAt: r.dispensed_at,
      pharmacyName: r.pharmacy_id ? row("SELECT name FROM pharmacies WHERE id = ?", r.pharmacy_id)?.name ?? null : null,
      sentAt: r.sent_at ?? null,
      fillStatus: r.fill_status ?? null,
      fillReason: r.fill_reason ?? null,
      fillUpdatedAt: r.fill_updated_at ?? null,
      sharedSafety: !!r.share_safety,
      doctor: prof ? { name: prof.name, licenseNumber: prof.licenseNumber } : null
    };
  }
  app2.get("/api/pharmacies", requireAuth, (_req, res) => {
    res.json({ status: "success", data: rows("SELECT id, name, address, city, phone, hours, services FROM pharmacies WHERE active = 1 ORDER BY name").map(pharmacyView) });
  });
  app2.post("/api/prescriptions/:id/send", requireRole("patient"), (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND patient_user_id = ?", req.params.id, req.user.id);
    if (!r) return fail2(res, 404, "Prescription not found.");
    if (effectiveStatus(r) !== "active") return fail2(res, 409, "This prescription can no longer be sent.");
    const ph = row("SELECT id, name FROM pharmacies WHERE id = ? AND active = 1", str2(req.body.pharmacyId, 60));
    if (!ph) return fail2(res, 404, "Pharmacy not found.");
    const share = req.body.shareSafety === true ? 1 : 0;
    if (r.pharmacy_id === ph.id) {
      db.prepare("UPDATE prescriptions SET share_safety = ? WHERE id = ?").run(share, r.id);
      return res.json({ status: "success", message: `Already sent to ${ph.name}. Show the pharmacy the code ${r.code}.` });
    }
    const now = iso();
    db.prepare("UPDATE prescriptions SET pharmacy_id = ?, sent_at = ?, fill_status = NULL, fill_reason = NULL, fill_updated_at = NULL, first_response_at = NULL, share_safety = ? WHERE id = ?").run(ph.id, now, share, r.id);
    if (r.pharmacy_id) pharmacyEvent(r.pharmacy_id, r.id, "redirected", req.user.id, { code: r.code });
    pharmacyEvent(ph.id, r.id, "sent", req.user.id, { code: r.code });
    notifyPharmacy(ph.id, "New prescription received", `A patient sent prescription ${r.code}. Open your inbox to respond.`);
    audit(req, "prescription.send", { target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success", message: `Prescription sent to ${ph.name}. They can see it in their inbox, or show them the code ${r.code}.` });
  });
  const verifyLimiter = rateLimit({ windowMs: 6e4, limit: 30, standardHeaders: true, legacyHeaders: false });
  app2.get("/api/verify/rx/:code", verifyLimiter, (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str2(req.params.code, 20).toUpperCase());
    if (!r) return res.json({ status: "success", data: { found: false } });
    const intact = same(sign(rxPayload(r)), r.signature);
    const prof = ctx.findProfessional(r.professional_id);
    const st = effectiveStatus(r);
    res.json({ status: "success", data: {
      found: true,
      valid: intact && st === "active",
      status: intact ? st : "invalid",
      issuedAt: r.issued_at,
      validUntil: r.valid_until,
      itemCount: JSON.parse(r.items).length,
      prescriber: prof ? { name: prof.name, licenseNumber: prof.licenseNumber, stillVerified: prof.verificationStatus === "Verified \u2705" /* VERIFIED */ } : null
    } });
  });
  const pharmacyLimiter = rateLimit({ windowMs: 15 * 6e4, limit: 60, standardHeaders: true, legacyHeaders: false });
  const pharmacyAuth = (body) => {
    const ph = row("SELECT * FROM pharmacies WHERE id = ? AND active = 1", str2(body.pharmacyId, 60));
    const ok = verifyPassword(str2(body.pin, 40), ph?.pin_hash ?? DUMMY_PIN_HASH);
    return ph && ok ? ph : null;
  };
  const DUMMY_PIN_HASH = hashPassword("000000-dummy");
  app2.post("/api/pharmacy/lookup", pharmacyLimiter, (req, res) => {
    const ph = pharmacyAuth(req.body);
    if (!ph) return fail2(res, 401, "Invalid pharmacy ID or PIN.");
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str2(req.body.code, 20).toUpperCase());
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail2(res, 404, "No valid prescription with that code.");
    audit(null, "pharmacy.lookup", { actor: null, target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    pharmacyEvent(ph.id, r.id, "lookup", null, { via: "counter" });
    const prof = ctx.findProfessional(r.professional_id);
    res.json({ status: "success", data: {
      id: r.id,
      status: effectiveStatus(r),
      issuedAt: r.issued_at,
      validUntil: r.valid_until,
      patientName: userName(r.patient_user_id),
      items: JSON.parse(r.items),
      notes: r.notes,
      dispensedAt: r.dispensed_at,
      prescriber: prof ? { name: prof.name, licenseNumber: prof.licenseNumber, stillVerified: prof.verificationStatus === "Verified \u2705" /* VERIFIED */ } : null
    } });
  });
  app2.post("/api/pharmacy/dispense", pharmacyLimiter, (req, res) => {
    const ph = pharmacyAuth(req.body);
    if (!ph) return fail2(res, 401, "Invalid pharmacy ID or PIN.");
    const r = row("SELECT * FROM prescriptions WHERE code = ?", str2(req.body.code, 20).toUpperCase());
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail2(res, 404, "No valid prescription with that code.");
    if (effectiveStatus(r) !== "active") return fail2(res, 409, `This prescription is ${effectiveStatus(r)}.`);
    const changed = db.prepare("UPDATE prescriptions SET status='dispensed', dispensed_at=?, dispensed_by=? WHERE id=? AND status='active'").run(iso(), ph.id, r.id).changes;
    if (!changed) return fail2(res, 409, "Already dispensed.");
    db.prepare("UPDATE prescriptions SET pharmacy_id = COALESCE(pharmacy_id, ?), first_response_at = CASE WHEN pharmacy_id IS NULL OR pharmacy_id = ? THEN COALESCE(first_response_at, ?) ELSE first_response_at END WHERE id = ?").run(ph.id, ph.id, iso(), r.id);
    pharmacyEvent(ph.id, r.id, "dispensed", null, { via: "counter" });
    notify(r.patient_user_id, "Prescription dispensed", `${ph.name} dispensed your prescription.`);
    audit(null, "pharmacy.dispense", { actor: null, target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success" });
  });
  app2.get("/api/admin/pharmacies", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: rows("SELECT id, name, address, city, phone, hours, services, active, created_at FROM pharmacies ORDER BY created_at DESC").map((p) => ({ ...pharmacyView(p), active: p.active, created_at: p.created_at })) });
  });
  app2.post("/api/admin/pharmacies", requireRole("admin"), (req, res) => {
    const name = str2(req.body.name, 120), address = str2(req.body.address, 250);
    if (!name || !address) return fail2(res, 400, "Name and address are required.");
    const id = newId2("ph");
    const pin = String(crypto5.randomInt(1e5, 999999));
    db.prepare("INSERT INTO pharmacies (id,name,address,city,phone,hours,services,pin_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(id, name, address, str2(req.body.city, 60) || null, str2(req.body.phone, 30) || null, str2(req.body.hours, 120) || null, JSON.stringify(cleanServices(req.body.services)), hashPassword(pin), iso());
    audit(req, "pharmacy.create", { target: ["pharmacy", id] });
    res.status(201).json({ status: "success", data: { id, pin }, message: "Give the pharmacy its ID and PIN. The PIN is shown only once." });
  });
  app2.patch("/api/admin/pharmacies/:id", requireRole("admin"), (req, res) => {
    const p = row("SELECT * FROM pharmacies WHERE id = ?", req.params.id);
    if (!p) return fail2(res, 404, "Pharmacy not found.");
    const b = req.body ?? {};
    const name = "name" in b ? str2(b.name, 120) : p.name;
    const address = "address" in b ? str2(b.address, 250) : p.address;
    if (!name || !address) return fail2(res, 400, "Name and address cannot be empty.");
    db.prepare("UPDATE pharmacies SET name = ?, address = ?, city = ?, phone = ?, hours = ?, services = ? WHERE id = ?").run(
      name,
      address,
      "city" in b ? str2(b.city, 60) || null : p.city,
      "phone" in b ? str2(b.phone, 30) || null : p.phone,
      "hours" in b ? str2(b.hours, 120) || null : p.hours,
      "services" in b ? JSON.stringify(cleanServices(b.services)) : p.services,
      p.id
    );
    audit(req, "pharmacy.update", { target: ["pharmacy", p.id] });
    res.json({ status: "success", data: pharmacyView(row("SELECT * FROM pharmacies WHERE id = ?", p.id)) });
  });
  app2.post("/api/admin/pharmacies/:id/active", requireRole("admin"), (req, res) => {
    const r = db.prepare("UPDATE pharmacies SET active = ? WHERE id = ?").run(req.body.active === false ? 0 : 1, req.params.id);
    if (!r.changes) return fail2(res, 404, "Pharmacy not found.");
    audit(req, "pharmacy.active", { target: ["pharmacy", req.params.id], details: { active: req.body.active !== false } });
    res.json({ status: "success" });
  });
  function certView(c) {
    const prof = ctx.findProfessional(c.professional_id);
    return { id: c.id, code: c.code, fromDate: c.from_date, toDate: c.to_date, remarks: c.remarks, issuedAt: c.issued_at, doctor: prof ? { name: prof.name, licenseNumber: prof.licenseNumber } : null };
  }
  app2.post("/api/certificates", requireRole("practitioner"), (req, res) => {
    const pro = verifiedPro(req.user.profileId);
    if (!pro || pro.role !== "doctor") return fail2(res, 403, "Only verified doctors can issue medical certificates.");
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const from = dateOnly(req.body.fromDate), to = dateOnly(req.body.toDate);
    if (!from || !to || to < from) return fail2(res, 400, "Enter valid start and end dates.");
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const earliest = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    if (from < earliest) return fail2(res, 400, "A certificate cannot start more than 3 days in the past.");
    const span = (Date.parse(to) - Date.parse(from)) / 864e5 + 1;
    if (span > 14) return fail2(res, 400, "Online certificates are limited to 14 days. Longer leave needs an in-person assessment.");
    void today;
    const id = newId2("mc"), code = newCode(), issuedAt = iso();
    const c = { id, code, patient_user_id: rel.patientUserId, professional_id: pro.id, from_date: from, to_date: to, issued_at: issuedAt };
    db.prepare("INSERT INTO certificates (id,code,patient_user_id,professional_id,from_date,to_date,remarks,issued_at,signature) VALUES (?,?,?,?,?,?,?,?,?)").run(id, code, rel.patientUserId, pro.id, from, to, str2(req.body.remarks, 200) || null, issuedAt, sign(certPayload(c)));
    notify(rel.patientUserId, "Medical certificate issued", `Valid ${from} to ${to}. Find it in your Health Record.`);
    audit(req, "certificate.issue", { target: ["certificate", id] });
    res.status(201).json({ status: "success", data: { id, code } });
  });
  app2.get("/api/verify/cert/:code", verifyLimiter, (req, res) => {
    const c = row("SELECT * FROM certificates WHERE code = ?", str2(req.params.code, 20).toUpperCase());
    if (!c) return res.json({ status: "success", data: { found: false } });
    const prof = ctx.findProfessional(c.professional_id);
    res.json({ status: "success", data: {
      found: true,
      valid: same(sign(certPayload(c)), c.signature),
      patient: maskName(userName(c.patient_user_id)),
      fromDate: c.from_date,
      toDate: c.to_date,
      issuedAt: c.issued_at,
      issuedBy: prof ? { name: prof.name, licenseNumber: prof.licenseNumber } : null
    } });
  });
  function refView(r) {
    const from = ctx.findProfessional(r.from_professional_id), to = r.to_professional_id ? ctx.findProfessional(r.to_professional_id) : null;
    return { id: r.id, toSpecialty: r.to_specialty, toProfessional: to ? { id: to.id, name: to.name } : null, reason: r.reason, urgency: r.urgency, issuedAt: r.issued_at, from: from?.name };
  }
  app2.post("/api/referrals", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const toSpecialty = str2(req.body.toSpecialty, 100), reason = str2(req.body.reason, 1e3);
    const toId = req.body.toProfessionalId ? str2(req.body.toProfessionalId, 60) : null;
    if (!toSpecialty || reason.length < 10) return fail2(res, 400, "Specialty and a reason (at least 10 characters) are required.");
    if (toId && !verifiedPro(toId)) return fail2(res, 404, "The practitioner you chose is not available.");
    const urgency = ["routine", "soon", "urgent"].includes(req.body.urgency) ? req.body.urgency : "routine";
    const id = newId2("ref");
    db.prepare("INSERT INTO referrals (id,patient_user_id,from_professional_id,to_specialty,to_professional_id,reason,urgency,issued_at) VALUES (?,?,?,?,?,?,?,?)").run(id, rel.patientUserId, req.user.profileId, toSpecialty, toId, reason, urgency, iso());
    notify(rel.patientUserId, "You have a new referral", `Referral to ${toSpecialty} (${urgency}).`);
    audit(req, "referral.create", { target: ["referral", id] });
    res.status(201).json({ status: "success", data: { id } });
  });
  function labView(o) {
    return { id: o.id, tests: o.tests, notes: o.notes, status: o.status, orderedAt: o.ordered_at, resultDocumentId: o.result_document_id, resultedAt: o.resulted_at, doctor: ctx.findProfessional(o.professional_id)?.name };
  }
  app2.post("/api/lab-orders", requireRole("practitioner"), (req, res) => {
    const rel = relation(req, String(req.body.kind), String(req.body.refId));
    if (!rel) return fail2(res, 404, "No treatment relationship found.");
    const tests = str2(req.body.tests, 500);
    if (!tests) return fail2(res, 400, "List the tests to order.");
    const id = newId2("lab");
    db.prepare("INSERT INTO lab_orders (id,patient_user_id,professional_id,tests,notes,ordered_at) VALUES (?,?,?,?,?,?)").run(id, rel.patientUserId, req.user.profileId, tests, str2(req.body.notes, 300) || null, iso());
    notify(rel.patientUserId, "Lab tests requested", `${tests}. Upload your result in the Health Record when you have it.`);
    audit(req, "lab.order", { target: ["lab_order", id] });
    res.status(201).json({ status: "success", data: { id } });
  });
  return {
    labOrderOwner: (id) => row("SELECT patient_user_id FROM lab_orders WHERE id = ?", id)?.patient_user_id ?? null,
    onLabResult: (orderId, documentId) => {
      db.prepare("UPDATE lab_orders SET status='resulted', result_document_id=?, resulted_at=? WHERE id=?").run(documentId, iso(), orderId);
      const o = row("SELECT professional_id, patient_user_id FROM lab_orders WHERE id = ?", orderId);
      const acct = row("SELECT id FROM users WHERE profile_id = ?", o?.professional_id);
      if (acct) notify(acct.id, "Lab result uploaded", "A patient uploaded a lab result you ordered. Open the clinical workspace to view it.");
    },
    /** A practitioner may open a patient's lab result when the patient has shared their record with them. */
    canViewLabDocument: (user, doc) => user.role === "practitioner" && !!user.profileId && doc.kind === "lab_result" && hasGrant(doc.owner_id, user.profileId)
  };
}

// server/pharmacy.ts
import crypto6 from "crypto";
import rateLimit2 from "express-rate-limit";
var iso2 = () => (/* @__PURE__ */ new Date()).toISOString();
var str3 = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail3 = (res, code, message) => res.status(code).json({ status: "error", message });
var rows2 = (sql, ...p) => db.prepare(sql).all(...p);
var row2 = (sql, ...p) => db.prepare(sql).get(...p);
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var FILL = ["received", "preparing", "ready", "cannot_fill"];
var DAY = 864e5;
function bucket(r) {
  const st = rxEffectiveStatus(r);
  if (st === "dispensed") return "dispensed";
  if (st !== "active") return "closed";
  if (r.fill_status === "cannot_fill") return "cannot_fill";
  if (r.fill_status === "ready") return "ready";
  if (r.fill_status === "preparing" || r.fill_status === "received") return "in_progress";
  return "new";
}
var avg = (xs) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
var median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
var minutesBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 6e4;
var tempPassword = () => crypto6.randomBytes(9).toString("base64url").replace(/[-_]/g, "k") + "7a";
function registerPharmacyWorkspace(app2, ctx) {
  const userName = (id) => row2("SELECT name FROM users WHERE id = ?", id)?.name ?? "Patient";
  for (const g of rows2("SELECT DISTINCT profile_id AS pid FROM users WHERE role = 'pharmacy' AND profile_id IS NOT NULL")) {
    if (!row2("SELECT 1 AS x FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", g.pid)) {
      db.prepare("UPDATE users SET pharmacy_owner = 1 WHERE id = (SELECT id FROM users WHERE role = 'pharmacy' AND profile_id = ? ORDER BY created_at LIMIT 1)").run(g.pid);
    }
  }
  const twoFactorRequired = () => process.env.REQUIRE_PHARMACY_2FA === "1" || process.env.NODE_ENV === "production" && process.env.REQUIRE_PHARMACY_2FA !== "0" && !process.env.VERCEL;
  const setup = [
    requireRole("pharmacy"),
    (req, res, next) => {
      const ph = req.user.profileId ? row2("SELECT * FROM pharmacies WHERE id = ?", req.user.profileId) : null;
      if (!ph || !ph.active || !ph.verified_at) return fail3(res, 403, "This pharmacy account is not active. Contact the MedCred board.");
      res.locals.ph = ph;
      next();
    }
  ];
  const workspace = [
    ...setup,
    (req, res, next) => {
      if (twoFactorRequired() && !row2("SELECT totp_enabled AS e FROM users WHERE id = ?", req.user.id)?.e) {
        return res.status(403).json({ status: "error", code: "2fa_required", message: "Set up two-factor sign-in to use the workspace." });
      }
      next();
    }
  ];
  const pharmacyOf = (res) => res.locals.ph;
  const prescriberOf = (r) => {
    const prof = ctx.findProfessional(r.professional_id);
    return prof ? { name: prof.name, licenseNumber: prof.licenseNumber, stillVerified: prof.verificationStatus === "Verified \u2705" /* VERIFIED */ } : null;
  };
  function safetyOf(r, pharmacyId) {
    if (r.pharmacy_id !== pharmacyId || !r.share_safety) return { shared: false };
    const items = (type) => rows2("SELECT name, detail, severity FROM health_items WHERE user_id = ? AND type = ? AND active = 1 ORDER BY name", r.patient_user_id, type);
    let doctorWarnings = [];
    try {
      const w = JSON.parse(r.warnings ?? "{}").warnings;
      if (Array.isArray(w)) doctorWarnings = w.filter((x) => ["allergy", "interaction", "duplicate"].includes(x.type)).map((x) => ({ severity: x.severity, type: x.type, message: x.message }));
    } catch {
    }
    return { shared: true, allergies: items("allergy"), medicines: items("medication"), doctorWarnings };
  }
  function view2(r, pharmacyId) {
    return {
      id: r.id,
      code: r.code,
      patientName: userName(r.patient_user_id),
      items: JSON.parse(r.items),
      notes: r.notes ?? null,
      issuedAt: r.issued_at,
      validUntil: r.valid_until,
      status: rxEffectiveStatus(r),
      bucket: bucket(r),
      fillStatus: r.fill_status ?? null,
      fillReason: r.fill_reason ?? null,
      fillUpdatedAt: r.fill_updated_at ?? null,
      sentAt: r.sent_at ?? null,
      firstResponseAt: r.first_response_at ?? null,
      dispensedAt: r.dispensed_at ?? null,
      assignedToMe: r.pharmacy_id === pharmacyId,
      assignedElsewhere: !!r.pharmacy_id && r.pharmacy_id !== pharmacyId,
      note: row2("SELECT note FROM pharmacy_notes WHERE pharmacy_id = ? AND prescription_id = ?", pharmacyId, r.id)?.note ?? "",
      prescriber: prescriberOf(r),
      safety: safetyOf(r, pharmacyId),
      cancelledReason: r.cancelled_reason ?? null
    };
  }
  const countBuckets = (pharmacyId) => {
    const counts = { new: 0, in_progress: 0, ready: 0, cannot_fill: 0, dispensed: 0, closed: 0, waitingOver24h: 0 };
    for (const r of rows2("SELECT status, valid_until, fill_status, sent_at FROM prescriptions WHERE pharmacy_id = ?", pharmacyId)) {
      const b = bucket(r);
      counts[b]++;
      if (b === "new" && r.sent_at && Date.now() - Date.parse(r.sent_at) > DAY) counts.waitingOver24h++;
    }
    return counts;
  };
  app2.get("/api/pharmacy/me", ...setup, (req, res) => {
    const ph = pharmacyOf(res);
    const acct = row2("SELECT name, email, must_change_password AS mustChange, pharmacy_owner AS owner, totp_enabled AS tf FROM users WHERE id = ?", req.user.id);
    res.json({ status: "success", data: {
      pharmacy: { ...pharmacyView(ph), active: !!ph.active },
      account: {
        name: acct?.name ?? req.user.name,
        email: acct?.email ?? req.user.email,
        mustChangePassword: !!acct?.mustChange,
        isOwner: !!acct?.owner,
        twoFactor: { enabled: !!acct?.tf, required: twoFactorRequired() }
      },
      counts: countBuckets(ph.id)
    } });
  });
  app2.patch("/api/pharmacy/me", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const b = req.body ?? {};
    const address = "address" in b ? str3(b.address, 250) : ph.address;
    if (!address) return fail3(res, 400, "The address cannot be empty.");
    db.prepare("UPDATE pharmacies SET address = ?, city = ?, phone = ?, hours = ?, services = ? WHERE id = ?").run(
      address,
      "city" in b ? str3(b.city, 60) || null : ph.city,
      "phone" in b ? str3(b.phone, 30) || null : ph.phone,
      "hours" in b ? str3(b.hours, 120) || null : ph.hours,
      "services" in b ? JSON.stringify(cleanServices(b.services)) : ph.services,
      ph.id
    );
    pharmacyEvent(ph.id, null, "profile_update", req.user.id);
    audit(req, "pharmacy.profile.update", { target: ["pharmacy", ph.id] });
    res.json({ status: "success", data: { ...pharmacyView(row2("SELECT * FROM pharmacies WHERE id = ?", ph.id)), active: true } });
  });
  app2.get("/api/pharmacy/prescriptions", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const want = str3(req.query.status, 20) || "all";
    const q = str3(req.query.q, 60).toLowerCase();
    let list = rows2("SELECT * FROM prescriptions WHERE pharmacy_id = ? ORDER BY COALESCE(sent_at, issued_at) DESC LIMIT 300", ph.id).map((r) => view2(r, ph.id));
    if (want !== "all") list = list.filter((r) => r.bucket === want);
    if (q) list = list.filter((r) => r.code.toLowerCase().includes(q) || r.patientName.toLowerCase().includes(q) || r.items.some((i) => String(i.name).toLowerCase().includes(q)));
    res.json({ status: "success", data: { items: list, counts: countBuckets(ph.id) } });
  });
  const lookupLimiter = rateLimit2({ windowMs: 15 * 6e4, limit: 120, standardHeaders: true, legacyHeaders: false });
  app2.post("/api/pharmacy/lookup-code", lookupLimiter, ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row2("SELECT * FROM prescriptions WHERE code = ?", str3(req.body.code, 20).toUpperCase());
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail3(res, 404, "No valid prescription with that code.");
    pharmacyEvent(ph.id, r.id, "lookup", req.user.id, { via: "workspace" });
    audit(req, "pharmacy.lookup", { target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success", data: view2(r, ph.id) });
  });
  const STATUS_TEXT = {
    received: (name) => ["Prescription received", `${name} received your prescription and will start preparing it.`],
    preparing: (name) => ["Prescription being prepared", `${name} is preparing your prescription.`],
    ready: (name) => ["Prescription ready", `Your prescription is ready for pickup at ${name}.`],
    cannot_fill: (name, reason) => ["Pharmacy could not fill your prescription", `${name} could not fill it: ${reason}. You can send it to another pharmacy.`]
  };
  app2.post("/api/pharmacy/prescriptions/:id/status", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row2("SELECT * FROM prescriptions WHERE id = ? AND pharmacy_id = ?", req.params.id, ph.id);
    if (!r) return fail3(res, 404, "Prescription not found in your inbox.");
    const next = str3(req.body.status, 20);
    if (!FILL.includes(next)) return fail3(res, 400, "Choose a valid status.");
    if (rxEffectiveStatus(r) !== "active") return fail3(res, 409, `This prescription is ${rxEffectiveStatus(r)}.`);
    if (r.fill_status === next) return fail3(res, 409, "It already has that status.");
    if (next === "received" && r.fill_status) return fail3(res, 409, "It is already past the received step.");
    const reason = str3(req.body.reason, 200);
    if (next === "cannot_fill" && reason.length < 3) return fail3(res, 400, "Give the patient a short reason.");
    const now = iso2();
    db.prepare("UPDATE prescriptions SET fill_status = ?, fill_reason = ?, fill_updated_at = ?, first_response_at = COALESCE(first_response_at, ?) WHERE id = ?").run(next, next === "cannot_fill" ? reason : null, now, now, r.id);
    pharmacyEvent(ph.id, r.id, next, req.user.id, next === "cannot_fill" ? { reason } : void 0);
    const [title, body] = STATUS_TEXT[next](ph.name, reason);
    notify(r.patient_user_id, title, body);
    audit(req, "pharmacy.status", { target: ["prescription", r.id], details: { pharmacyId: ph.id, status: next } });
    res.json({ status: "success", data: view2(row2("SELECT * FROM prescriptions WHERE id = ?", r.id), ph.id) });
  });
  app2.post("/api/pharmacy/prescriptions/:id/dispense", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row2("SELECT * FROM prescriptions WHERE id = ?", req.params.id);
    if (!r || !same(sign(rxPayload(r)), r.signature)) return fail3(res, 404, "No valid prescription found.");
    if (r.pharmacy_id && r.pharmacy_id !== ph.id) return fail3(res, 409, "This prescription was sent to a different pharmacy.");
    const st = rxEffectiveStatus(r);
    if (st !== "active") return fail3(res, 409, `This prescription is ${st}.`);
    const now = iso2();
    const changed = db.prepare("UPDATE prescriptions SET status = 'dispensed', dispensed_at = ?, dispensed_by = ?, pharmacy_id = ?, fill_updated_at = ?, first_response_at = COALESCE(first_response_at, ?) WHERE id = ? AND status = 'active'").run(now, ph.id, ph.id, now, now, r.id).changes;
    if (!changed) return fail3(res, 409, "Already dispensed.");
    pharmacyEvent(ph.id, r.id, "dispensed", req.user.id, { via: "workspace" });
    notify(r.patient_user_id, "Prescription dispensed", `${ph.name} dispensed your prescription.`);
    audit(req, "pharmacy.dispense", { target: ["prescription", r.id], details: { pharmacyId: ph.id } });
    res.json({ status: "success", data: view2(row2("SELECT * FROM prescriptions WHERE id = ?", r.id), ph.id) });
  });
  app2.put("/api/pharmacy/prescriptions/:id/note", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const r = row2("SELECT id FROM prescriptions WHERE id = ? AND pharmacy_id = ?", req.params.id, ph.id);
    if (!r) return fail3(res, 404, "Prescription not found in your inbox.");
    const note = str3(req.body.note, 500);
    if (note) {
      db.prepare("INSERT INTO pharmacy_notes (pharmacy_id, prescription_id, note, updated_at) VALUES (?,?,?,?) ON CONFLICT(pharmacy_id, prescription_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at").run(ph.id, r.id, note, iso2());
      pharmacyEvent(ph.id, r.id, "note", req.user.id);
    } else {
      db.prepare("DELETE FROM pharmacy_notes WHERE pharmacy_id = ? AND prescription_id = ?").run(ph.id, r.id);
    }
    res.json({ status: "success", data: { note } });
  });
  app2.get("/api/pharmacy/activity", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const limit = Math.min(100, Math.max(1, Math.trunc(Number(req.query.limit)) || 50));
    const before = Math.trunc(Number(req.query.before)) || 0;
    const list = rows2(
      `SELECT e.id, e.ts, e.type, e.detail, e.prescription_id AS prescriptionId, p.code, a.name AS actorName
       FROM pharmacy_events e LEFT JOIN prescriptions p ON p.id = e.prescription_id LEFT JOIN users a ON a.id = e.actor_user_id
       WHERE e.pharmacy_id = ? ${before ? "AND e.id < ?" : ""} ORDER BY e.id DESC LIMIT ?`,
      ...before ? [ph.id, before, limit] : [ph.id, limit]
    ).map((e) => ({
      ...e,
      detail: e.detail ? JSON.parse(e.detail) : null,
      // patients and doctors trigger these; only the pharmacy's own staff are named
      actorName: ["sent", "redirected", "cancelled"].includes(e.type) ? null : e.actorName ?? null
    }));
    res.json({ status: "success", data: { items: list, next: list.length === limit ? list[list.length - 1].id : null } });
  });
  function report(pharmacyId, days) {
    const since = new Date(Date.now() - days * DAY).toISOString();
    const sent = rows2("SELECT * FROM prescriptions WHERE pharmacy_id = ? AND sent_at >= ?", pharmacyId, since);
    const events = rows2("SELECT type, ts FROM pharmacy_events WHERE pharmacy_id = ? AND ts >= ?", pharmacyId, since);
    const received = events.filter((e) => e.type === "sent").length;
    const dispensed = events.filter((e) => e.type === "dispensed").length;
    const cannotFill = events.filter((e) => e.type === "cannot_fill").length;
    const expiredUnfilled = sent.filter((r) => rxEffectiveStatus(r) === "expired").length;
    const finished = dispensed + cannotFill + expiredUnfilled;
    const responseMins = sent.filter((r) => r.first_response_at).map((r) => minutesBetween(r.sent_at, r.first_response_at)).filter((n) => n >= 0);
    const dispenseMins = sent.filter((r) => r.dispensed_at).map((r) => minutesBetween(r.sent_at, r.dispensed_at)).filter((n) => n >= 0);
    const perDay = [];
    const idx = /* @__PURE__ */ new Map();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
      idx.set(date, perDay.push({ date, received: 0, dispensed: 0 }) - 1);
    }
    for (const e of events) {
      const i = idx.get(e.ts.slice(0, 10));
      if (i === void 0) continue;
      if (e.type === "sent") perDay[i].received++;
      else if (e.type === "dispensed") perDay[i].dispensed++;
    }
    const meds = /* @__PURE__ */ new Map();
    for (const r of sent) for (const it of JSON.parse(r.items)) meds.set(String(it.name), (meds.get(String(it.name)) ?? 0) + 1);
    const topMedicines = [...meds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
    return {
      days,
      since,
      received,
      dispensed,
      cannotFill,
      expiredUnfilled,
      fillRate: finished ? Math.round(dispensed / finished * 100) : null,
      responseMinutes: { average: avg(responseMins), median: median(responseMins), samples: responseMins.length },
      dispenseMinutes: { average: avg(dispenseMins), median: median(dispenseMins), samples: dispenseMins.length },
      current: countBuckets(pharmacyId),
      perDay,
      topMedicines
    };
  }
  app2.get("/api/pharmacy/reports", ...workspace, (req, res) => {
    const ph = pharmacyOf(res);
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const data = report(ph.id, days);
    if (req.query.format === "csv") {
      const lines = [
        `MedCred pharmacy report,${ph.name.replace(/,/g, " ")}`,
        `Period (days),${data.days}`,
        `Received,${data.received}`,
        `Dispensed,${data.dispensed}`,
        `Could not fill,${data.cannotFill}`,
        `Expired unfilled,${data.expiredUnfilled}`,
        `Fill rate %,${data.fillRate ?? ""}`,
        `Median first response (min),${data.responseMinutes.median ?? ""}`,
        `Average first response (min),${data.responseMinutes.average ?? ""}`,
        `Median time to dispense (min),${data.dispenseMinutes.median ?? ""}`,
        "",
        "date,received,dispensed",
        ...data.perDay.map((d) => `${d.date},${d.received},${d.dispensed}`)
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="pharmacy-report-${data.days}d.csv"`);
      return res.send(lines.join("\n"));
    }
    res.json({ status: "success", data });
  });
  app2.get("/api/admin/pharmacies/summary", requireRole("admin"), (_req, res) => {
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    const out = {};
    for (const p of rows2("SELECT id, licence_no, pharmacist_name, pharmacist_reg, verified_at FROM pharmacies")) {
      const acct = row2("SELECT name, email, must_change_password AS mustChange, totp_enabled AS tf FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", p.id);
      const staffCount = row2("SELECT COUNT(*) AS n FROM users WHERE role = 'pharmacy' AND profile_id = ? AND status = 'active'", p.id).n;
      const counts = countBuckets(p.id);
      const resp = rows2("SELECT sent_at, first_response_at FROM prescriptions WHERE pharmacy_id = ? AND sent_at >= ? AND first_response_at IS NOT NULL", p.id, since).map((r) => minutesBetween(r.sent_at, r.first_response_at)).filter((n) => n >= 0);
      out[p.id] = {
        verification: p.verified_at ? { licenceNumber: p.licence_no, pharmacistName: p.pharmacist_name, pharmacistRegNo: p.pharmacist_reg, verifiedAt: p.verified_at } : null,
        account: acct ? { name: acct.name, email: acct.email, mustChangePassword: !!acct.mustChange, twoFactor: !!acct.tf } : null,
        staffCount,
        inbox: counts.new,
        inProgress: counts.in_progress,
        dispensed: counts.dispensed,
        lastActivity: row2("SELECT MAX(ts) AS ts FROM pharmacy_events WHERE pharmacy_id = ?", p.id)?.ts ?? null,
        avgResponseMinutes: avg(resp)
      };
    }
    res.json({ status: "success", data: out });
  });
  app2.post("/api/admin/pharmacies/:id/account", requireRole("admin"), (req, res) => {
    const ph = row2("SELECT id, name, verified_at FROM pharmacies WHERE id = ?", req.params.id);
    if (!ph) return fail3(res, 404, "Pharmacy not found.");
    if (!ph.verified_at) return fail3(res, 409, "Verify the pharmacy's licence and pharmacist before creating a login.");
    if (row2("SELECT 1 AS x FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", ph.id)) return fail3(res, 409, "This pharmacy already has an owner login. Reset its password instead.");
    const name = str3(req.body.name, 100) || ph.name;
    const email = str3(req.body.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return fail3(res, 400, "A valid email address is required.");
    if (emailTaken(email)) return fail3(res, 409, "An account with this email already exists.");
    const password = tempPassword();
    const user = createUser({ email, password, role: "pharmacy", name });
    db.prepare("UPDATE users SET profile_id = ?, must_change_password = 1, pharmacy_owner = 1 WHERE id = ?").run(ph.id, user.id);
    audit(req, "pharmacy.account.create", { target: ["pharmacy", ph.id], details: { email } });
    res.status(201).json({ status: "success", data: { email, password }, message: "Share the email and temporary password with the pharmacy. The password is shown only once." });
  });
  app2.post("/api/admin/pharmacies/:id/account/reset", requireRole("admin"), (req, res) => {
    const u = row2("SELECT id, email FROM users WHERE role = 'pharmacy' AND profile_id = ? AND pharmacy_owner = 1", req.params.id);
    if (!u) return fail3(res, 404, "This pharmacy has no owner login yet.");
    const password = tempPassword();
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, failed_logins = 0, locked_until = NULL, totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(hashPassword(password), u.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    audit(req, "pharmacy.account.reset", { target: ["pharmacy", String(req.params.id)] });
    res.json({ status: "success", data: { email: u.email, password }, message: "Share the temporary password with the pharmacy. It is shown only once. Two-factor sign-in was reset too." });
  });
  app2.post("/api/admin/pharmacies/:id/verification", requireRole("admin"), (req, res) => {
    const ph = row2("SELECT id FROM pharmacies WHERE id = ?", req.params.id);
    if (!ph) return fail3(res, 404, "Pharmacy not found.");
    const licenceNumber = str3(req.body.licenceNumber, 60), pharmacistName = str3(req.body.pharmacistName, 100), pharmacistReg = str3(req.body.pharmacistRegNo, 60);
    if (!licenceNumber || !pharmacistName || !pharmacistReg) return fail3(res, 400, "Enter the pharmacy licence number and the pharmacist's name and registration number.");
    if (req.body.confirmed !== true) return fail3(res, 400, "Confirm that you checked these details against the official register.");
    db.prepare("UPDATE pharmacies SET licence_no = ?, pharmacist_name = ?, pharmacist_reg = ?, verified_at = ?, verified_by = ? WHERE id = ?").run(licenceNumber, pharmacistName, pharmacistReg, iso2(), req.user.id, ph.id);
    audit(req, "pharmacy.verify", { target: ["pharmacy", ph.id], details: { licenceNumber, pharmacistReg } });
    res.json({ status: "success" });
  });
  const ownerOnly = (req, res, next) => {
    if (!row2("SELECT 1 AS x FROM users WHERE id = ? AND pharmacy_owner = 1", req.user.id)) return fail3(res, 403, "Only the pharmacy owner account can manage staff logins.");
    next();
  };
  const staffView = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    active: u.status === "active",
    isOwner: !!u.pharmacy_owner,
    twoFactor: !!u.totp_enabled,
    mustChangePassword: !!u.must_change_password,
    createdAt: u.created_at
  });
  const staffOf = (pharmacyId, userId) => row2("SELECT * FROM users WHERE id = ? AND role = 'pharmacy' AND profile_id = ?", String(userId), pharmacyId);
  app2.get("/api/pharmacy/staff", ...workspace, ownerOnly, (_req, res) => {
    const ph = pharmacyOf(res);
    res.json({ status: "success", data: rows2("SELECT * FROM users WHERE role = 'pharmacy' AND profile_id = ? ORDER BY pharmacy_owner DESC, created_at", ph.id).map(staffView) });
  });
  app2.post("/api/pharmacy/staff", ...workspace, ownerOnly, (req, res) => {
    const ph = pharmacyOf(res);
    if (row2("SELECT COUNT(*) AS n FROM users WHERE role = 'pharmacy' AND profile_id = ?", ph.id).n >= 20) return fail3(res, 400, "That is the most staff logins a pharmacy can have.");
    const name = str3(req.body.name, 100);
    const email = str3(req.body.email, 254).toLowerCase();
    if (!name || !EMAIL_RE.test(email)) return fail3(res, 400, "A name and a valid email address are required.");
    if (emailTaken(email)) return fail3(res, 409, "An account with this email already exists.");
    const password = tempPassword();
    const user = createUser({ email, password, role: "pharmacy", name });
    db.prepare("UPDATE users SET profile_id = ?, must_change_password = 1 WHERE id = ?").run(ph.id, user.id);
    pharmacyEvent(ph.id, null, "staff_added", req.user.id, { name });
    audit(req, "pharmacy.staff.add", { target: ["pharmacy", ph.id], details: { email } });
    res.status(201).json({ status: "success", data: { email, password }, message: "Share the email and temporary password with your colleague. The password is shown only once." });
  });
  app2.post("/api/pharmacy/staff/:uid/status", ...workspace, ownerOnly, (req, res) => {
    const ph = pharmacyOf(res);
    const u = staffOf(ph.id, req.params.uid);
    if (!u) return fail3(res, 404, "Staff login not found.");
    if (u.pharmacy_owner) return fail3(res, 400, "The owner account cannot be disabled.");
    const active = req.body.active === true;
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(active ? "active" : "disabled", u.id);
    if (!active) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    pharmacyEvent(ph.id, null, "staff_status", req.user.id, { name: u.name, active });
    audit(req, "pharmacy.staff.status", { target: ["user", u.id], details: { active } });
    res.json({ status: "success" });
  });
  app2.post("/api/pharmacy/staff/:uid/reset", ...workspace, ownerOnly, (req, res) => {
    const ph = pharmacyOf(res);
    const u = staffOf(ph.id, req.params.uid);
    if (!u || u.pharmacy_owner) return fail3(res, 404, "Staff login not found.");
    const password = tempPassword();
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, failed_logins = 0, locked_until = NULL, totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(hashPassword(password), u.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
    audit(req, "pharmacy.staff.reset", { target: ["user", u.id] });
    res.json({ status: "success", data: { email: u.email, password }, message: "Share the temporary password with your colleague. It is shown only once." });
  });
  app2.post("/api/pharmacy/2fa/setup", ...setup, (req, res) => {
    if (row2("SELECT totp_enabled AS e FROM users WHERE id = ?", req.user.id)?.e) return fail3(res, 409, "Two-factor sign-in is already on.");
    const secret = newTotpSecret();
    db.prepare("UPDATE users SET totp_secret = ? WHERE id = ?").run(secret, req.user.id);
    res.json({ status: "success", data: { secret, otpauthUrl: otpauthUrl(req.user.email, secret) } });
  });
  app2.post("/api/pharmacy/2fa/enable", ...setup, (req, res) => {
    const u = row2("SELECT totp_secret AS secret FROM users WHERE id = ?", req.user.id);
    if (!u?.secret) return fail3(res, 400, "Start the setup first.");
    if (!verifyTotp(u.secret, str3(req.body.code, 12))) return fail3(res, 400, "That code is not correct. Check the time on your phone and try again.");
    db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?").run(req.user.id);
    pharmacyEvent(pharmacyOf(res).id, null, "two_factor", req.user.id, { on: true });
    audit(req, "pharmacy.2fa.enable");
    res.json({ status: "success" });
  });
  app2.post("/api/pharmacy/2fa/disable", ...setup, (req, res) => {
    if (twoFactorRequired()) return fail3(res, 409, "Two-factor sign-in is required for pharmacy accounts and cannot be turned off.");
    const u = row2("SELECT password_hash AS hash, totp_secret AS secret, totp_enabled AS e FROM users WHERE id = ?", req.user.id);
    if (!u?.e) return fail3(res, 409, "Two-factor sign-in is already off.");
    if (typeof req.body.password !== "string" || !verifyPassword(req.body.password, u.hash) || !verifyTotp(u.secret, str3(req.body.code, 12))) return fail3(res, 400, "Your password or code is not correct.");
    db.prepare("UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(req.user.id);
    pharmacyEvent(pharmacyOf(res).id, null, "two_factor", req.user.id, { on: false });
    audit(req, "pharmacy.2fa.disable");
    res.json({ status: "success" });
  });
}

// server/literature.ts
import crypto7 from "crypto";
db.exec(`
CREATE TABLE IF NOT EXISTS literature (
  id TEXT PRIMARY KEY, pmid TEXT NOT NULL UNIQUE, title TEXT NOT NULL, authors TEXT NOT NULL, journal TEXT NOT NULL,
  pub_date TEXT NOT NULL, year INTEGER, doi TEXT, abstract TEXT NOT NULL, pub_types TEXT NOT NULL, condition_term TEXT NOT NULL,
  category TEXT, status TEXT NOT NULL DEFAULT 'candidate', admin_note TEXT, reviewed_by TEXT, reviewed_at TEXT,
  retraction_checked_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_literature_status ON literature(status);
`);
try {
  db.exec("ALTER TABLE literature ADD COLUMN takeaway TEXT");
} catch {
}
try {
  db.exec("ALTER TABLE literature ADD COLUMN takeaway_ms TEXT");
} catch {
}
db.exec(`
CREATE TABLE IF NOT EXISTS fact_sheets (
  id TEXT PRIMARY KEY, topic TEXT NOT NULL UNIQUE, title TEXT NOT NULL, summary TEXT NOT NULL, url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate', reviewed_by TEXT, reviewed_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lit_topics (condition_term TEXT PRIMARY KEY, years INTEGER NOT NULL DEFAULT 3, added_at TEXT NOT NULL, last_run_at TEXT, last_added INTEGER);
CREATE TABLE IF NOT EXISTS article_recommendations (
  id TEXT PRIMARY KEY, article_id TEXT NOT NULL, article_title TEXT NOT NULL, professional_id TEXT NOT NULL, professional_name TEXT NOT NULL,
  patient_user_id TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_artrec_patient ON article_recommendations(patient_user_id);
`);
var EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
var iso3 = () => (/* @__PURE__ */ new Date()).toISOString();
var str4 = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail4 = (res, code, message) => res.status(code).json({ status: "error", message });
var rows3 = (sql, ...p) => db.prepare(sql).all(...p);
var row3 = (sql, ...p) => db.prepare(sql).get(...p);
var ACCEPTED_TYPES = ["Systematic Review", "Meta-Analysis", "Randomized Controlled Trial", "Practice Guideline", "Guideline", "Review"];
var decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
var tag = (xml, name) => decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? "");
function parsePubmedXml(xml) {
  const out = [];
  for (const block of xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? []) {
    const pmid = tag(block.match(/<MedlineCitation[\s\S]*?<\/PMID>/)?.[0] ?? "", "PMID");
    const title = tag(block, "ArticleTitle");
    const abstractParts = [...block.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => {
      const label = m[1].match(/Label="([^"]+)"/)?.[1];
      const text = decode(m[2]);
      return label ? `${label[0]}${label.slice(1).toLowerCase()}: ${text}` : text;
    });
    const authorList = [...block.matchAll(/<Author\s[^>]*>([\s\S]*?)<\/Author>/g)].map((m) => {
      const last = tag(m[1], "LastName"), init = tag(m[1], "Initials");
      return last ? `${last}${init ? " " + init : ""}` : tag(m[1], "CollectiveName");
    }).filter(Boolean);
    const authors = authorList.length > 3 ? `${authorList.slice(0, 3).join(", ")}, et al.` : authorList.join(", ");
    const journal = tag(block, "Title") || tag(block, "ISOAbbreviation");
    const year = Number(tag(block.match(/<JournalIssue[\s\S]*?<\/JournalIssue>/)?.[0] ?? "", "Year") || tag(block, "MedlineDate").slice(0, 4)) || null;
    const month = tag(block.match(/<JournalIssue[\s\S]*?<\/JournalIssue>/)?.[0] ?? "", "Month");
    const doi = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1]?.trim() ?? null;
    const pubTypes = [...block.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)].map((m) => decode(m[1]));
    const retracted = pubTypes.includes("Retracted Publication") || /RefType="RetractionIn"/.test(block);
    if (!pmid || !title || abstractParts.length === 0) continue;
    out.push({ pmid, title, authors: authors || "Authors not listed", journal: journal || "Journal not listed", pubDate: [month, year].filter(Boolean).join(" "), year, doi, abstract: abstractParts.join("\n\n"), pubTypes, retracted });
  }
  return out;
}
var apiQuery = () => `tool=careverified&email=${encodeURIComponent(process.env.ADMIN_EMAIL || "admin@careverified.local")}${process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : ""}`;
async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15e3) });
  if (!r.ok) throw new Error(`PubMed responded ${r.status}`);
  return r.json();
}
async function fetchPapers(pmids) {
  if (!pmids.length) return [];
  const r = await fetch(`${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(",")}&${apiQuery()}`, { signal: AbortSignal.timeout(2e4) });
  if (!r.ok) throw new Error(`PubMed responded ${r.status}`);
  return parsePubmedXml(await r.text());
}
function parseMedlinePlus(xml) {
  const doc = xml.match(/<document[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/document>/);
  if (!doc) return null;
  const url = doc[1];
  if (!/^https:\/\/medlineplus\.gov\//.test(url)) return null;
  const content = (name) => doc[2].match(new RegExp(`<content name="${name}">([\\s\\S]*?)</content>`))?.[1] ?? "";
  const text = (raw) => decode(raw.replace(/&lt;\/?(p|li|ul|ol|br)\b[^&]*?&gt;/g, " ").replace(/&lt;[^&]*?&gt;/g, ""));
  const title = text(content("title"));
  let summary = text(content("FullSummary"));
  if (!title || summary.length < 40) return null;
  if (summary.length > 1100) summary = summary.slice(0, 1100).replace(/\s\S*$/, "") + "\u2026";
  return { title, summary, url };
}
function searchTerm(condition, years) {
  const types = ACCEPTED_TYPES.map((t) => `"${t}"[pt]`).join(" OR ");
  return `(${condition}[Title/Abstract]) AND (${types}) AND hasabstract AND english[la] AND humans[mh] AND ("last ${years} years"[dp]) NOT "Retracted Publication"[pt]`;
}
function evidenceOf(pubTypes) {
  if (pubTypes.includes("Meta-Analysis")) return { label: "Meta-analysis", level: "high" };
  if (pubTypes.includes("Systematic Review")) return { label: "Systematic review", level: "high" };
  if (pubTypes.includes("Practice Guideline") || pubTypes.includes("Guideline")) return { label: "Clinical guideline", level: "high" };
  if (pubTypes.includes("Randomized Controlled Trial")) return { label: "Randomized trial", level: "moderate" };
  return { label: "Narrative review", level: "info" };
}
var view = (r) => ({
  id: r.id,
  pmid: r.pmid,
  title: r.title,
  authors: r.authors,
  journal: r.journal,
  pubDate: r.pub_date,
  year: r.year,
  doi: r.doi,
  abstract: r.abstract,
  pubTypes: JSON.parse(r.pub_types),
  condition: r.condition_term,
  category: r.category,
  status: r.status,
  takeaway: r.takeaway ?? null,
  takeawayMs: r.takeaway_ms ?? null,
  evidence: evidenceOf(JSON.parse(r.pub_types)),
  adminNote: r.admin_note,
  reviewedAt: r.reviewed_at,
  retractionCheckedAt: r.retraction_checked_at,
  createdAt: r.created_at,
  url: `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
});
function approvedLiteratureArticles() {
  return rows3("SELECT * FROM literature WHERE status = 'approved' ORDER BY reviewed_at DESC").map((r) => {
    const v = view(r);
    const cite = `${v.authors} ${v.title} ${v.journal}. ${v.pubDate}.${v.doi ? ` doi:${v.doi}.` : ""} PMID ${v.pmid}.`;
    return {
      id: `lit-${v.pmid}`,
      title: v.title,
      excerpt: v.abstract.replace(/\s+/g, " ").slice(0, 240).replace(/\s\S*$/, "") + "\u2026",
      content: `${v.abstract}

This is the abstract of a published paper, not medical advice. Read the full paper at the source and talk to a clinician about your own situation.`,
      category: v.category || v.condition,
      authorId: "pubmed",
      authorName: v.authors,
      authorTitle: `${v.journal}${v.year ? ` \xB7 ${v.year}` : ""}`,
      authorAvatar: "",
      authorCredentialsVerified: false,
      takeaway: v.takeaway,
      takeawayMs: v.takeawayMs,
      evidence: v.evidence,
      date: v.pubDate || String(v.year ?? ""),
      citations: [cite],
      faq: [],
      source: { type: "pubmed", pmid: v.pmid, doi: v.doi, journal: v.journal, url: v.url, pubTypes: v.pubTypes, approvedAt: v.reviewedAt, retractionCheckedAt: v.retractionCheckedAt }
    };
  });
}
async function searchCandidates(condition, years, max) {
  const s = await fetchJson(`${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${max}&term=${encodeURIComponent(searchTerm(condition, years))}&${apiQuery()}`);
  const ids = s?.esearchresult?.idlist ?? [];
  const fresh = ids.filter((id) => !row3("SELECT 1 FROM literature WHERE pmid = ?", id));
  const papers = (await fetchPapers(fresh)).filter((p) => !p.retracted);
  const ins = db.prepare(`INSERT OR IGNORE INTO literature (id, pmid, title, authors, journal, pub_date, year, doi, abstract, pub_types, condition_term, status, retraction_checked_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)`);
  for (const p of papers) ins.run(`lit-${crypto7.randomBytes(5).toString("hex")}`, p.pmid, p.title, p.authors, p.journal, p.pubDate, p.year, p.doi, p.abstract, JSON.stringify(p.pubTypes), condition, iso3(), iso3());
  return { found: ids.length, added: papers.length, alreadyKnown: ids.length - fresh.length };
}
async function refreshTrackedTopics() {
  let added = 0;
  for (const t of rows3("SELECT * FROM lit_topics")) {
    try {
      const r = await searchCandidates(t.condition_term, t.years, 10);
      added += r.added;
      db.prepare("UPDATE lit_topics SET last_run_at = ?, last_added = ? WHERE condition_term = ?").run(iso3(), r.added, t.condition_term);
    } catch {
    }
  }
  if (added > 0) notifyAdmins("New medical papers to review", `${added} new candidate paper${added === 1 ? "" : "s"} from your tracked topics are waiting in Medical Literature.`);
  return { topics: rows3("SELECT COUNT(*) n FROM lit_topics")[0]?.n ?? 0, added };
}
function registerLiteratureRoutes(app2, ctx) {
  const admin = requireRole("admin");
  app2.get("/api/admin/literature", admin, (req, res) => {
    const status = str4(req.query.status, 20);
    const list = status ? rows3("SELECT * FROM literature WHERE status = ? ORDER BY created_at DESC", status) : rows3("SELECT * FROM literature ORDER BY created_at DESC");
    const counts = Object.fromEntries(rows3("SELECT status, COUNT(*) n FROM literature GROUP BY status").map((r) => [r.status, r.n]));
    res.json({ status: "success", data: { items: list.map(view), counts } });
  });
  app2.post("/api/admin/literature/search", admin, async (req, res) => {
    const condition = str4(req.body?.condition, 80);
    if (condition.length < 3 || /[\[\]"()]/.test(condition)) return fail4(res, 400, "Enter a condition name (3 to 80 characters, no brackets or quotes).");
    const years = Math.min(10, Math.max(1, Number(req.body?.years) || 5));
    const max = Math.min(25, Math.max(1, Number(req.body?.max) || 10));
    try {
      const r = await searchCandidates(condition, years, max);
      audit(req, "literature.search", { details: { condition, found: r.found, added: r.added } });
      res.json({ status: "success", data: r });
    } catch (e) {
      fail4(res, 502, `Could not reach PubMed: ${e?.message || "unknown error"}. Try again shortly.`);
    }
  });
  app2.post("/api/admin/literature/:id/approve", admin, async (req, res) => {
    const r = row3("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail4(res, 404, "Paper not found.");
    if (r.status === "approved") return fail4(res, 409, "Already approved.");
    const category = str4(req.body?.category, 60) || r.condition_term;
    const takeaway = str4(req.body?.takeaway, 400);
    const takeawayMs = str4(req.body?.takeawayMs, 400) || null;
    if (takeaway.length < 20) return fail4(res, 400, "Write a plain-language key takeaway (20 to 400 characters) so patients can understand the finding.");
    try {
      const [p] = await fetchPapers([r.pmid]);
      if (p?.retracted) {
        db.prepare("UPDATE literature SET status = 'withdrawn', admin_note = ?, retraction_checked_at = ? WHERE id = ?").run("Retracted at source", iso3(), r.id);
        return fail4(res, 409, "This paper has been retracted, so it cannot be approved.");
      }
    } catch {
      return fail4(res, 502, "Could not re-check this paper against PubMed. Try again.");
    }
    db.prepare("UPDATE literature SET status = 'approved', category = ?, takeaway = ?, takeaway_ms = ?, admin_note = ?, reviewed_by = ?, reviewed_at = ?, retraction_checked_at = ? WHERE id = ?").run(category, takeaway, takeawayMs, str4(req.body?.note, 500) || null, req.user.id, iso3(), iso3(), r.id);
    audit(req, "literature.approve", { details: { pmid: r.pmid, category } });
    res.json({ status: "success", data: view(row3("SELECT * FROM literature WHERE id = ?", r.id)) });
  });
  app2.post("/api/admin/literature/:id/takeaway", admin, (req, res) => {
    const r = row3("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail4(res, 404, "Paper not found.");
    const takeaway = str4(req.body?.takeaway, 400);
    if (takeaway.length < 20) return fail4(res, 400, "The key takeaway needs 20 to 400 characters.");
    db.prepare("UPDATE literature SET takeaway = ?, takeaway_ms = ? WHERE id = ?").run(takeaway, str4(req.body?.takeawayMs, 400) || null, r.id);
    audit(req, "literature.takeaway", { details: { pmid: r.pmid } });
    res.json({ status: "success", data: view(row3("SELECT * FROM literature WHERE id = ?", r.id)) });
  });
  app2.post("/api/admin/literature/:id/reject", admin, (req, res) => {
    const r = row3("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail4(res, 404, "Paper not found.");
    db.prepare("UPDATE literature SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(str4(req.body?.note, 500) || null, req.user.id, iso3(), r.id);
    audit(req, "literature.reject", { details: { pmid: r.pmid } });
    res.json({ status: "success", data: view(row3("SELECT * FROM literature WHERE id = ?", r.id)) });
  });
  app2.post("/api/admin/literature/:id/unpublish", admin, (req, res) => {
    const r = row3("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail4(res, 404, "Paper not found.");
    db.prepare("UPDATE literature SET status = 'withdrawn', admin_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(str4(req.body?.note, 500) || "Unpublished by admin", req.user.id, iso3(), r.id);
    audit(req, "literature.unpublish", { details: { pmid: r.pmid } });
    res.json({ status: "success" });
  });
  app2.post("/api/admin/literature/recheck", admin, async (req, res) => {
    try {
      const out = await recheckPublished();
      audit(req, "literature.recheck", { details: out });
      res.json({ status: "success", data: out });
    } catch (e) {
      fail4(res, 502, `Could not reach PubMed: ${e?.message || "unknown error"}.`);
    }
  });
  const factView = (r) => ({ id: r.id, topic: r.topic, title: r.title, summary: r.summary, url: r.url, status: r.status, reviewedAt: r.reviewed_at, createdAt: r.created_at });
  app2.get("/api/fact-sheets", (_req, res) => {
    res.json({ status: "success", data: rows3("SELECT * FROM fact_sheets WHERE status = 'approved' ORDER BY topic").map(factView) });
  });
  app2.get("/api/admin/literature/factsheets", admin, (_req, res) => {
    res.json({ status: "success", data: rows3("SELECT * FROM fact_sheets ORDER BY created_at DESC").map(factView) });
  });
  app2.post("/api/admin/literature/factsheets/fetch", admin, async (req, res) => {
    const topic = str4(req.body?.topic, 80).toLowerCase();
    if (topic.length < 3 || /[<>"]/.test(topic)) return fail4(res, 400, "Enter a condition name (3 to 80 characters).");
    if (row3("SELECT 1 FROM fact_sheets WHERE topic = ?", topic)) return fail4(res, 409, "There is already a fact sheet for this topic.");
    try {
      const r = await fetch(`https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&retmax=1&term=${encodeURIComponent(topic)}`, { signal: AbortSignal.timeout(15e3) });
      if (!r.ok) throw new Error(`MedlinePlus responded ${r.status}`);
      const parsed = parseMedlinePlus(await r.text());
      if (!parsed) return fail4(res, 404, "MedlinePlus has no health topic for that term.");
      const id = `fs-${crypto7.randomBytes(5).toString("hex")}`;
      db.prepare("INSERT INTO fact_sheets (id, topic, title, summary, url, status, created_at) VALUES (?,?,?,?,?, 'candidate', ?)").run(id, topic, parsed.title, parsed.summary, parsed.url, iso3());
      audit(req, "factsheet.fetch", { details: { topic } });
      res.status(201).json({ status: "success", data: factView(row3("SELECT * FROM fact_sheets WHERE id = ?", id)) });
    } catch (e) {
      fail4(res, 502, `Could not reach MedlinePlus: ${e?.message || "unknown error"}.`);
    }
  });
  for (const [action, status] of [["approve", "approved"], ["reject", "rejected"], ["unpublish", "withdrawn"]]) {
    app2.post(`/api/admin/literature/factsheets/:id/${action}`, admin, (req, res) => {
      const r = row3("SELECT * FROM fact_sheets WHERE id = ?", req.params.id);
      if (!r) return fail4(res, 404, "Fact sheet not found.");
      db.prepare("UPDATE fact_sheets SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(status, req.user.id, iso3(), r.id);
      audit(req, `factsheet.${action}`, { details: { topic: r.topic } });
      res.json({ status: "success", data: factView(row3("SELECT * FROM fact_sheets WHERE id = ?", r.id)) });
    });
  }
  app2.get("/api/admin/literature/topics", admin, (_req, res) => {
    res.json({ status: "success", data: rows3("SELECT condition_term AS condition, years, added_at AS addedAt, last_run_at AS lastRunAt, last_added AS lastAdded FROM lit_topics ORDER BY condition_term") });
  });
  app2.post("/api/admin/literature/topics", admin, (req, res) => {
    const condition = str4(req.body?.condition, 80).toLowerCase();
    if (condition.length < 3 || /[\[\]"()]/.test(condition)) return fail4(res, 400, "Enter a condition name (3 to 80 characters, no brackets or quotes).");
    if (rows3("SELECT COUNT(*) n FROM lit_topics")[0].n >= 30) return fail4(res, 400, "You can track up to 30 topics.");
    db.prepare("INSERT OR IGNORE INTO lit_topics (condition_term, years, added_at) VALUES (?, ?, ?)").run(condition, Math.min(10, Math.max(1, Number(req.body?.years) || 3)), iso3());
    audit(req, "literature.topic.add", { details: { condition } });
    res.status(201).json({ status: "success" });
  });
  app2.delete("/api/admin/literature/topics/:condition", admin, (req, res) => {
    db.prepare("DELETE FROM lit_topics WHERE condition_term = ?").run(String(req.params.condition).toLowerCase());
    audit(req, "literature.topic.remove", { details: { condition: req.params.condition } });
    res.json({ status: "success" });
  });
  app2.post("/api/admin/literature/topics/run", admin, async (req, res) => {
    try {
      const out = await refreshTrackedTopics();
      audit(req, "literature.topic.run", { details: out });
      res.json({ status: "success", data: out });
    } catch (e) {
      fail4(res, 502, `Could not reach PubMed: ${e?.message || "unknown error"}.`);
    }
  });
  const weekly = setInterval(() => {
    refreshTrackedTopics().catch(() => {
    });
  }, 7 * 24 * 60 * 60 * 1e3);
  weekly.unref();
  const verifiedProId = (req) => {
    const pid = req.user?.role === "practitioner" ? req.user.profileId : null;
    return pid && ctx.isVerifiedPractitioner(pid) ? pid : null;
  };
  const myPatients = (professionalId) => {
    const out = /* @__PURE__ */ new Map();
    for (const b of ctx.allBookings()) if (b.professionalId === professionalId && b.paymentStatus === "Paid" && b.patientUserId) out.set(b.patientUserId, b.patientName);
    for (const c of rows3("SELECT DISTINCT patient_user_id FROM consults WHERE professional_id = ?", professionalId)) {
      const name = row3("SELECT name FROM users WHERE id = ?", c.patient_user_id)?.name ?? "Patient";
      if (!out.has(c.patient_user_id)) out.set(c.patient_user_id, name);
    }
    return out;
  };
  app2.get("/api/practitioner/my-patients", requireRole("practitioner"), (req, res) => {
    const pid = verifiedProId(req);
    if (!pid) return res.json({ status: "success", data: [] });
    res.json({ status: "success", data: [...myPatients(pid)].map(([id, name]) => ({ id, name })) });
  });
  app2.post("/api/articles/:id/recommend", requireRole("practitioner"), (req, res) => {
    const pid = verifiedProId(req);
    if (!pid) return fail4(res, 403, "Only verified practitioners can recommend articles.");
    const title = ctx.libraryArticleIds().get(String(req.params.id));
    if (!title) return fail4(res, 404, "Article not found.");
    const patientUserId = str4(req.body?.patientUserId, 60);
    if (!myPatients(pid).has(patientUserId)) return fail4(res, 403, "You can recommend articles to patients you have treated.");
    const today = rows3("SELECT COUNT(*) n FROM article_recommendations WHERE professional_id = ? AND created_at > ?", pid, new Date(Date.now() - 864e5).toISOString())[0].n;
    if (today >= 30) return fail4(res, 429, "Daily limit reached. Try again tomorrow.");
    if (row3("SELECT 1 FROM article_recommendations WHERE article_id = ? AND professional_id = ? AND patient_user_id = ?", req.params.id, pid, patientUserId))
      return fail4(res, 409, "You already recommended this article to this patient.");
    const note = str4(req.body?.note, 300) || null;
    const id = `rec-${crypto7.randomBytes(5).toString("hex")}`;
    db.prepare("INSERT INTO article_recommendations (id, article_id, article_title, professional_id, professional_name, patient_user_id, note, created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, req.params.id, title, pid, req.user.name, patientUserId, note, iso3());
    notify(patientUserId, `${req.user.name} recommended an article`, title);
    audit(req, "article.recommend", { target: ["article", String(req.params.id)], details: { patientUserId } });
    res.status(201).json({ status: "success", data: { id } });
  });
  app2.get("/api/me/recommended-reading", requireRole("patient"), (req, res) => {
    const list = rows3("SELECT * FROM article_recommendations WHERE patient_user_id = ? ORDER BY created_at DESC LIMIT 20", req.user.id).map((r) => ({
      id: r.id,
      articleId: r.article_id,
      title: r.article_title,
      doctor: r.professional_name,
      note: r.note,
      createdAt: r.created_at,
      seen: !!r.seen_at
    }));
    res.json({ status: "success", data: list });
  });
  app2.post("/api/me/recommended-reading/:id/seen", requireRole("patient"), (req, res) => {
    db.prepare("UPDATE article_recommendations SET seen_at = COALESCE(seen_at, ?) WHERE id = ? AND patient_user_id = ?").run(iso3(), req.params.id, req.user.id);
    res.json({ status: "success" });
  });
  const timer = setInterval(() => {
    recheckPublished().then((out) => {
      if (out.checked) audit(null, "literature.recheck.scheduled", { details: out });
    }).catch(() => {
    });
  }, 24 * 60 * 60 * 1e3);
  timer.unref();
}
async function recheckPublished() {
  const approved = rows3("SELECT * FROM literature WHERE status = 'approved'");
  let withdrawn = 0;
  for (let i = 0; i < approved.length; i += 50) {
    const batch = approved.slice(i, i + 50);
    const papers = await fetchPapers(batch.map((b) => b.pmid));
    for (const b of batch) {
      const p = papers.find((x) => x.pmid === b.pmid);
      if (p?.retracted) {
        db.prepare("UPDATE literature SET status = 'withdrawn', admin_note = 'Retracted at source', retraction_checked_at = ? WHERE id = ?").run(iso3(), b.id);
        withdrawn++;
      } else if (p) db.prepare("UPDATE literature SET retraction_checked_at = ? WHERE id = ?").run(iso3(), b.id);
    }
  }
  return { checked: approved.length, withdrawn };
}

// server/quality.ts
import crypto8 from "crypto";
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
var iso4 = () => (/* @__PURE__ */ new Date()).toISOString();
var newId3 = (p) => `${p}-${crypto8.randomBytes(6).toString("hex")}`;
var str5 = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail5 = (res, code, message) => res.status(code).json({ status: "error", message });
var rows4 = (sql, ...p) => db.prepare(sql).all(...p);
var row4 = (sql, ...p) => db.prepare(sql).get(...p);
var dateOnly2 = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
var SLA_HOURS = { urgent: 1, high: 4, normal: 24, low: 72 };
var CATEGORIES = {
  "Safety concern": "urgent",
  "Report a user": "high",
  "Payment problem": "high",
  "Account or login": "normal",
  "Technical problem": "normal",
  "Feedback": "low",
  "Other": "low"
};
var INCIDENT_KINDS = ["adverse_drug_event", "near_miss", "patient_harm", "misconduct", "privacy", "system", "other"];
var SEVERITIES = ["low", "medium", "high", "critical"];
var CPD_CATEGORIES = ["course", "conference", "publication", "teaching", "self-study"];
var cpdTarget = () => Number(process.env.CPD_ANNUAL_TARGET ?? 20);
var accountForChatId = (chatId) => row4("SELECT id FROM users WHERE profile_id = ?", chatId)?.id ?? row4("SELECT id FROM users WHERE id = ?", chatId)?.id ?? null;
var isBlocked = (blockerUserId, otherUserId) => !!row4("SELECT 1 AS x FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?", blockerUserId, otherUserId);
function registerQualityRoutes(app2, ctx) {
  const verifiedDoctorId = (id) => {
    const p = id ? ctx.findProfessional(id) : null;
    return p && p.role === "doctor" && p.verificationStatus === "Verified \u2705" /* VERIFIED */ ? p : null;
  };
  const accountOfProfile2 = (profileId) => row4("SELECT id FROM users WHERE profile_id = ?", profileId)?.id ?? null;
  const userName = (id) => row4("SELECT name FROM users WHERE id = ?", id)?.name ?? "User";
  const eligibleVisits = (userId, professionalId) => {
    const reviewed = new Set(ctx.reviews().filter((r) => r.patientUserId === userId).map((r) => `${r.visitKind}:${r.visitId}`));
    const visits = [];
    for (const b of ctx.bookings()) if (b.patientUserId === userId && b.professionalId === professionalId && b.status === "Completed" && b.paymentStatus === "Paid") visits.push({ kind: "booking", id: b.id });
    for (const c of rows4("SELECT id FROM consults WHERE patient_user_id = ? AND professional_id = ? AND status = 'completed'", userId, professionalId)) visits.push({ kind: "consult", id: c.id });
    return visits.filter((v) => !reviewed.has(`${v.kind}:${v.id}`));
  };
  app2.get("/api/reviews/eligibility", requireRole("patient"), (req, res) => {
    const visits = eligibleVisits(req.user.id, str5(req.query.professionalId, 60));
    res.json({ status: "success", data: { eligible: visits.length > 0, visit: visits[0] ?? null } });
  });
  app2.post("/api/reviews/:id/report", requireRole("practitioner"), (req, res) => {
    const rev = ctx.reviews().find((r) => r.id === req.params.id);
    if (!rev || rev.professionalId !== req.user.profileId) return fail5(res, 404, "Review not found.");
    const reason = str5(req.body.reason, 500);
    if (reason.length < 10) return fail5(res, 400, "Explain why this review breaks the rules (at least 10 characters).");
    if (rev.reportedAt) return fail5(res, 409, "This review has already been reported.");
    rev.reportedAt = iso4();
    rev.reportReason = reason;
    notifyAdmins("Review reported", `${ctx.findProfessional(rev.professionalId)?.name} reported a review: ${reason}`);
    audit(req, "review.report", { target: ["review", rev.id] });
    res.json({ status: "success", message: "Thank you. The board will look at it. The review stays visible unless it is found to break the rules." });
  });
  app2.get("/api/admin/reviews", requireRole("admin"), (req, res) => {
    const filter = req.query.filter;
    let list = ctx.reviews().map((r) => ({ ...r, professionalName: ctx.findProfessional(r.professionalId)?.name }));
    if (filter === "reported") list = list.filter((r) => r.reportedAt && !r.moderatedAt);
    res.json({ status: "success", data: list.sort((a, b) => String(b.reportedAt ?? b.date).localeCompare(String(a.reportedAt ?? a.date))) });
  });
  app2.post("/api/admin/reviews/:id/moderate", requireRole("admin"), (req, res) => {
    const rev = ctx.reviews().find((r) => r.id === req.params.id);
    if (!rev) return fail5(res, 404, "Review not found.");
    const action = req.body.action, reason = str5(req.body.reason, 500);
    if (!["hide", "keep", "restore"].includes(action)) return fail5(res, 400, "Action must be hide, keep or restore.");
    if (!reason) return fail5(res, 400, "Record a reason for the decision.");
    if (action === "hide") rev.status = "hidden";
    else rev.status = "published";
    rev.moderatedAt = iso4();
    rev.moderationReason = reason;
    rev.moderatedBy = req.user.id;
    ctx.recalcRating(rev.professionalId);
    const pa = accountOfProfile2(rev.professionalId);
    if (action === "hide") notify(rev.patientUserId, "Your review was removed", `It broke our review rules: ${reason}`);
    if (pa && rev.reportedAt) notify(pa, "Your review report was decided", action === "hide" ? "The review was removed." : "The review was kept.");
    audit(req, "review.moderate", { target: ["review", rev.id], details: { action, reason } });
    res.json({ status: "success" });
  });
  app2.get("/api/support/categories", (_req, res) => {
    res.json({ status: "success", data: Object.entries(CATEGORIES).map(([name, priority]) => ({ name, priority, respondWithinHours: SLA_HOURS[priority] })) });
  });
  const ticketView = (t) => ({
    id: t.id,
    category: t.category,
    subject: t.subject,
    priority: t.priority,
    status: t.status,
    createdAt: t.created_at,
    firstResponseDue: t.first_response_due,
    firstResponseAt: t.first_response_at,
    resolvedAt: t.resolved_at,
    updatedAt: t.updated_at,
    target: t.target ?? null,
    overdue: !t.first_response_at && t.status !== "resolved" && Date.parse(t.first_response_due) < Date.now()
  });
  app2.post("/api/support/tickets", requireAuth, (req, res) => {
    const category = str5(req.body.category, 60), subject = str5(req.body.subject, 120), body = str5(req.body.body, 3e3);
    if (!CATEGORIES[category]) return fail5(res, 400, "Choose a category.");
    if (subject.length < 3 || body.length < 10) return fail5(res, 400, "Add a subject and describe the problem (at least 10 characters).");
    const open = row4("SELECT COUNT(*) AS n FROM tickets WHERE user_id = ? AND status <> 'resolved'", req.user.id).n;
    if (open >= 10) return fail5(res, 429, "You have many open tickets. Please wait for replies or close some.");
    const priority = CATEGORIES[category];
    const id = newId3("tkt");
    const due = new Date(Date.now() + SLA_HOURS[priority] * 36e5).toISOString();
    db.prepare("INSERT INTO tickets (id,user_id,category,subject,priority,target,created_at,first_response_due,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(id, req.user.id, category, subject, priority, str5(req.body.target, 100) || null, iso4(), due, iso4());
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_user_id, from_staff, body, ts) VALUES (?,?,0,?,?)").run(id, req.user.id, body, iso4());
    notifyAdmins(priority === "urgent" ? "URGENT support ticket" : "New support ticket", `${category}: ${subject}`);
    audit(req, "ticket.create", { target: ["ticket", id], details: { category } });
    res.status(201).json({ status: "success", data: { id, respondWithinHours: SLA_HOURS[priority] } });
  });
  app2.get("/api/support/tickets", requireAuth, (req, res) => {
    const list = rows4("SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50", req.user.id).map(ticketView);
    res.json({ status: "success", data: list });
  });
  const loadTicketFor = (req, res) => {
    const t = row4("SELECT * FROM tickets WHERE id = ?", req.params.id);
    if (!t || t.user_id !== req.user.id && req.user.role !== "admin") {
      fail5(res, 404, "Ticket not found.");
      return null;
    }
    return t;
  };
  app2.get("/api/support/tickets/:id", requireAuth, (req, res) => {
    const t = loadTicketFor(req, res);
    if (!t) return;
    const messages = rows4("SELECT id, from_staff AS fromStaff, body, ts FROM ticket_messages WHERE ticket_id = ? ORDER BY id", t.id);
    res.json({ status: "success", data: { ...ticketView(t), requester: req.user.role === "admin" ? userName(t.user_id) : void 0, messages } });
  });
  app2.post("/api/support/tickets/:id/reply", requireAuth, (req, res) => {
    const t = loadTicketFor(req, res);
    if (!t) return;
    const body = str5(req.body.body, 3e3);
    if (!body) return fail5(res, 400, "Write a message.");
    const staff = req.user.role === "admin";
    if (t.status === "resolved" && !staff && Date.now() - Date.parse(t.resolved_at) > 7 * 864e5) return fail5(res, 409, "This ticket was closed more than a week ago. Please open a new one.");
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_user_id, from_staff, body, ts) VALUES (?,?,?,?,?)").run(t.id, req.user.id, staff ? 1 : 0, body, iso4());
    if (staff) {
      db.prepare("UPDATE tickets SET status = 'pending', first_response_at = COALESCE(first_response_at, ?), resolved_at = NULL, updated_at = ? WHERE id = ?").run(iso4(), iso4(), t.id);
      notify(t.user_id, "Support replied to your ticket", t.subject);
    } else {
      db.prepare("UPDATE tickets SET status = 'open', resolved_at = NULL, updated_at = ? WHERE id = ?").run(iso4(), t.id);
      if (t.first_response_at) notifyAdmins("Customer replied", t.subject);
    }
    audit(req, "ticket.reply", { target: ["ticket", t.id] });
    res.status(201).json({ status: "success" });
  });
  app2.post("/api/support/tickets/:id/resolve", requireAuth, (req, res) => {
    const t = loadTicketFor(req, res);
    if (!t) return;
    db.prepare("UPDATE tickets SET status='resolved', resolved_at=?, updated_at=? WHERE id=?").run(iso4(), iso4(), t.id);
    if (req.user.role === "admin") notify(t.user_id, "Your ticket was marked resolved", `${t.subject}. Reply to reopen it within 7 days.`);
    audit(req, "ticket.resolve", { target: ["ticket", t.id] });
    res.json({ status: "success" });
  });
  app2.get("/api/admin/support/tickets", requireRole("admin"), (req, res) => {
    const status = req.query.status === "resolved" ? "resolved" : "active";
    const list = rows4(`SELECT t.*, u.name AS requester FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE ${status === "resolved" ? "t.status = 'resolved'" : "t.status <> 'resolved'"} ORDER BY t.first_response_at IS NOT NULL, t.first_response_due ASC LIMIT 200`);
    const all = rows4("SELECT created_at, first_response_at, first_response_due, status FROM tickets");
    const responded = all.filter((t) => t.first_response_at).map((t) => Date.parse(t.first_response_at) - Date.parse(t.created_at)).sort((a, b) => a - b);
    const metTarget = all.filter((t) => t.first_response_at && t.first_response_at <= t.first_response_due).length;
    res.json({ status: "success", data: {
      tickets: list.map((t) => ({ ...ticketView(t), requester: t.requester })),
      stats: {
        open: all.filter((t) => t.status !== "resolved").length,
        overdue: all.filter((t) => !t.first_response_at && t.status !== "resolved" && Date.parse(t.first_response_due) < Date.now()).length,
        medianFirstResponseMinutes: responded.length ? Math.round(responded[Math.floor(responded.length / 2)] / 6e4) : null,
        targetMetPct: responded.length ? Math.round(metTarget / responded.length * 100) : null
      }
    } });
  });
  app2.post("/api/admin/support/tickets/:id/priority", requireRole("admin"), (req, res) => {
    const t = row4("SELECT * FROM tickets WHERE id = ?", req.params.id);
    if (!t) return fail5(res, 404, "Ticket not found.");
    const priority = req.body.priority;
    if (!SLA_HOURS[priority]) return fail5(res, 400, "Invalid priority.");
    const due = new Date(Date.parse(t.created_at) + SLA_HOURS[priority] * 36e5).toISOString();
    db.prepare("UPDATE tickets SET priority = ?, first_response_due = ? WHERE id = ?").run(priority, due, t.id);
    res.json({ status: "success" });
  });
  app2.get("/api/chats/threads", requireRole("patient", "practitioner"), (req, res) => {
    const u = req.user;
    const out = /* @__PURE__ */ new Map();
    if (u.role === "patient") {
      const pros = /* @__PURE__ */ new Set();
      for (const b of ctx.bookings()) if (b.patientUserId === u.id && b.paymentStatus === "Paid") pros.add(b.professionalId);
      for (const c of rows4("SELECT DISTINCT professional_id FROM consults WHERE patient_user_id = ? AND professional_id IS NOT NULL", u.id)) pros.add(c.professional_id);
      for (const id of pros) {
        const p = ctx.findProfessional(id);
        const acct = accountOfProfile2(id);
        if (p) out.set(id, { id, name: p.name, role: p.specialization, blocked: !!acct && isBlocked(u.id, acct) });
      }
    } else if (u.profileId) {
      const patients2 = /* @__PURE__ */ new Set();
      for (const b of ctx.bookings()) if (b.professionalId === u.profileId && b.paymentStatus === "Paid" && b.patientUserId) patients2.add(b.patientUserId);
      for (const c of rows4("SELECT DISTINCT patient_user_id FROM consults WHERE professional_id = ?", u.profileId)) patients2.add(c.patient_user_id);
      for (const id of patients2) out.set(id, { id, name: userName(id), role: "Patient", blocked: isBlocked(u.id, id) });
    }
    const me = u.profileId ?? u.id;
    for (const m of ctx.chats()) {
      if (m.receiverId !== me || out.has(m.senderId)) continue;
      const acct = accountForChatId(m.senderId);
      if (!acct) continue;
      out.set(m.senderId, { id: m.senderId, name: m.senderName || userName(acct), role: ctx.findProfessional(m.senderId)?.specialization ?? "Patient", blocked: isBlocked(u.id, acct) });
    }
    res.json({ status: "success", data: [...out.values()] });
  });
  app2.post("/api/blocks", requireRole("patient", "practitioner"), (req, res) => {
    const target = accountForChatId(str5(req.body.chatId, 60));
    if (!target || target === req.user.id) return fail5(res, 404, "Person not found.");
    if (row4("SELECT role FROM users WHERE id = ?", target)?.role === "admin") return fail5(res, 400, "You cannot block the support team.");
    db.prepare("INSERT OR IGNORE INTO user_blocks (blocker_user_id, blocked_user_id, created_at) VALUES (?,?,?)").run(req.user.id, target, iso4());
    audit(req, "user.block", { target: ["user", target] });
    res.json({ status: "success" });
  });
  app2.delete("/api/blocks/:chatId", requireRole("patient", "practitioner"), (req, res) => {
    const target = accountForChatId(req.params.chatId);
    if (target) db.prepare("DELETE FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?").run(req.user.id, target);
    res.json({ status: "success" });
  });
  const incidentView = (i, withEvents = false) => ({
    id: i.id,
    kind: i.kind,
    severity: i.severity,
    description: i.description,
    relatedType: i.related_type,
    relatedId: i.related_id,
    status: i.status,
    resolution: i.resolution,
    createdAt: i.created_at,
    resolvedAt: i.resolved_at,
    ...withEvents ? { events: rows4("SELECT e.action, e.note, e.ts, u.name AS actor FROM incident_events e LEFT JOIN users u ON u.id = e.actor_user_id WHERE e.incident_id = ? ORDER BY e.id", i.id) } : {}
  });
  const addEvent = (id, actor, action, note) => db.prepare("INSERT INTO incident_events (incident_id, actor_user_id, action, note, ts) VALUES (?,?,?,?,?)").run(id, actor, action, note ?? null, iso4());
  app2.post("/api/incidents", requireRole("practitioner", "admin"), (req, res) => {
    const kind = req.body.kind, severity = req.body.severity, description = str5(req.body.description, 4e3);
    if (!INCIDENT_KINDS.includes(kind) || !SEVERITIES.includes(severity)) return fail5(res, 400, "Choose the type and severity.");
    if (description.length < 20) return fail5(res, 400, "Describe what happened (at least 20 characters).");
    const id = newId3("inc");
    db.prepare("INSERT INTO incidents (id,reporter_user_id,kind,severity,description,related_type,related_id,created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, req.user.id, kind, severity, description, str5(req.body.relatedType, 30) || null, str5(req.body.relatedId, 60) || null, iso4());
    addEvent(id, req.user.id, "reported");
    notifyAdmins(severity === "critical" || severity === "high" ? `${severity.toUpperCase()} incident reported` : "Incident reported", `${kind.replace(/_/g, " ")}: ${description.slice(0, 120)}`);
    audit(req, "incident.report", { target: ["incident", id], details: { kind, severity } });
    res.status(201).json({ status: "success", data: { id } });
  });
  app2.get("/api/incidents/mine", requireRole("practitioner", "admin"), (req, res) => {
    res.json({ status: "success", data: rows4("SELECT * FROM incidents WHERE reporter_user_id = ? ORDER BY created_at DESC LIMIT 50", req.user.id).map((i) => incidentView(i)) });
  });
  app2.get("/api/admin/incidents", requireRole("admin"), (_req, res) => {
    const list = rows4(`SELECT i.*, u.name AS reporter FROM incidents i LEFT JOIN users u ON u.id = i.reporter_user_id
      ORDER BY CASE i.status WHEN 'resolved' THEN 2 WHEN 'closed' THEN 3 ELSE 0 END, CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC LIMIT 200`);
    res.json({ status: "success", data: list.map((i) => ({ ...incidentView(i, true), reporter: i.reporter })) });
  });
  app2.post("/api/admin/incidents/:id/update", requireRole("admin"), (req, res) => {
    const i = row4("SELECT * FROM incidents WHERE id = ?", req.params.id);
    if (!i) return fail5(res, 404, "Incident not found.");
    const status = req.body.status, note = str5(req.body.note, 2e3);
    if (!["investigating", "resolved", "closed"].includes(status)) return fail5(res, 400, "Invalid status.");
    if ((status === "resolved" || status === "closed") && !note) return fail5(res, 400, "Record the outcome before resolving or closing.");
    const done = status !== "investigating";
    db.prepare("UPDATE incidents SET status = ?, resolution = COALESCE(?, resolution), resolved_at = ? WHERE id = ?").run(status, done ? note : null, done ? iso4() : null, i.id);
    addEvent(i.id, req.user.id, status, note);
    notify(i.reporter_user_id, `Incident ${status}`, note || "The board is investigating your report.");
    audit(req, "incident.update", { target: ["incident", i.id], details: { status } });
    res.json({ status: "success" });
  });
  const caseContent = (type, id) => {
    if (type === "encounter") {
      const e = row4("SELECT subjective, objective, assessment, plan FROM encounters WHERE id = ? AND signed_at IS NOT NULL", id);
      return e ? { kind: "Consultation note", ...e } : null;
    }
    if (type === "prescription") {
      const p = row4("SELECT diagnosis, items, notes, record_checked, warnings, issued_at FROM prescriptions WHERE id = ?", id);
      if (!p) return null;
      const w = p.warnings ? JSON.parse(p.warnings) : { warnings: [], overrides: {} };
      return { kind: "Prescription", diagnosis: p.diagnosis, items: JSON.parse(p.items), notes: p.notes, patientRecordWasShared: !!p.record_checked, safetyWarnings: w.warnings, overrideReasons: w.overrides };
    }
    return null;
  };
  const authorOf = (type, id) => type === "encounter" ? row4("SELECT professional_id AS a FROM encounters WHERE id = ?", id)?.a ?? null : type === "prescription" ? row4("SELECT professional_id AS a FROM prescriptions WHERE id = ?", id)?.a ?? null : null;
  function assign(type, id, reviewerId, source, by) {
    const author = authorOf(type, id);
    if (!author) return { ok: false, error: "Case not found." };
    if (reviewerId === author) return { ok: false, error: "A reviewer cannot review their own work." };
    if (!verifiedDoctorId(reviewerId)) return { ok: false, error: "The reviewer must be a verified doctor." };
    if (row4("SELECT 1 AS x FROM peer_reviews WHERE subject_type = ? AND subject_id = ?", type, id)) return { ok: false, error: "This case is already assigned." };
    const pid = newId3("prv");
    db.prepare("INSERT INTO peer_reviews (id,subject_type,subject_id,author_professional_id,reviewer_professional_id,source,assigned_by,assigned_at) VALUES (?,?,?,?,?,?,?,?)").run(pid, type, id, author, reviewerId, source, by, iso4());
    notify(accountOfProfile2(reviewerId), "A case needs your peer review", "Open Quality & CPD to review it. Patient details are hidden.");
    return { ok: true, id: pid };
  }
  const pickReviewer = (author) => {
    const candidates = ctx.allProfessionals().filter((p) => p.role === "doctor" && p.verificationStatus === "Verified \u2705" /* VERIFIED */ && p.id !== author).map((p) => ({ id: p.id, load: row4("SELECT COUNT(*) AS n FROM peer_reviews WHERE reviewer_professional_id = ? AND status = 'pending'", p.id).n })).sort((a, b) => a.load - b.load);
    return candidates[0]?.id ?? null;
  };
  app2.post("/api/admin/peer-reviews", requireRole("admin"), (req, res) => {
    const type = req.body.subjectType, id = str5(req.body.subjectId, 60);
    if (!["encounter", "prescription"].includes(type)) return fail5(res, 400, "Subject must be an encounter or prescription.");
    const author = authorOf(type, id);
    const reviewer = str5(req.body.reviewerProfessionalId, 60) || (author ? pickReviewer(author) : null);
    if (!reviewer) return fail5(res, 400, "No eligible reviewer is available.");
    const r = assign(type, id, reviewer, "manual", req.user.id);
    if (!r.ok) return fail5(res, 400, r.error);
    audit(req, "peerreview.assign", { target: ["peer_review", r.id] });
    res.status(201).json({ status: "success", data: { id: r.id } });
  });
  app2.post("/api/admin/audits/sample", requireRole("admin"), (req, res) => {
    const type = req.body.subjectType === "encounter" ? "encounter" : "prescription";
    const days = Math.min(90, Math.max(1, Math.trunc(Number(req.body.days)) || 30));
    const count = Math.min(50, Math.max(1, Math.trunc(Number(req.body.count)) || 5));
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const pool = type === "prescription" ? rows4("SELECT id FROM prescriptions WHERE issued_at > ? AND id NOT IN (SELECT subject_id FROM peer_reviews WHERE subject_type = 'prescription')", since) : rows4("SELECT id FROM encounters WHERE signed_at > ? AND id NOT IN (SELECT subject_id FROM peer_reviews WHERE subject_type = 'encounter')", since);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = crypto8.randomInt(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let assigned = 0, skipped = 0;
    for (const c of pool.slice(0, count)) {
      const author = authorOf(type, c.id);
      const reviewer = pickReviewer(author);
      if (reviewer && assign(type, c.id, reviewer, "audit", req.user.id).ok) assigned++;
      else skipped++;
    }
    audit(req, "audit.sample", { details: { type, days, count, assigned, skipped, pool: pool.length } });
    res.json({ status: "success", data: { assigned, skipped, available: pool.length } });
  });
  app2.get("/api/peer-reviews/mine", requireRole("practitioner"), (req, res) => {
    const list = rows4("SELECT id, subject_type, source, status, assigned_at, completed_at, outcome FROM peer_reviews WHERE reviewer_professional_id = ? ORDER BY status = 'done', assigned_at DESC LIMIT 50", req.user.profileId ?? "");
    res.json({ status: "success", data: list });
  });
  app2.get("/api/peer-reviews/about-me", requireRole("practitioner"), (req, res) => {
    const list = rows4("SELECT id, subject_type, outcome, score, comments, completed_at FROM peer_reviews WHERE author_professional_id = ? AND status = 'done' ORDER BY completed_at DESC LIMIT 50", req.user.profileId ?? "");
    res.json({ status: "success", data: list });
  });
  app2.get("/api/peer-reviews/:id", requireRole("practitioner"), (req, res) => {
    const pr = row4("SELECT * FROM peer_reviews WHERE id = ? AND reviewer_professional_id = ?", req.params.id, req.user.profileId ?? "");
    if (!pr) return fail5(res, 404, "Review not found.");
    audit(req, "peerreview.view", { target: ["peer_review", pr.id] });
    res.json({ status: "success", data: { id: pr.id, status: pr.status, subjectType: pr.subject_type, content: caseContent(pr.subject_type, pr.subject_id), outcome: pr.outcome, score: pr.score, comments: pr.comments } });
  });
  app2.post("/api/peer-reviews/:id/submit", requireRole("practitioner"), (req, res) => {
    const pr = row4("SELECT * FROM peer_reviews WHERE id = ? AND reviewer_professional_id = ?", req.params.id, req.user.profileId ?? "");
    if (!pr) return fail5(res, 404, "Review not found.");
    if (pr.status === "done") return fail5(res, 409, "Already submitted.");
    const outcome = req.body.outcome, score = Math.trunc(Number(req.body.score)), comments = str5(req.body.comments, 3e3);
    if (!["no_concerns", "minor_concerns", "significant_concerns"].includes(outcome)) return fail5(res, 400, "Choose an outcome.");
    if (!(score >= 1 && score <= 5)) return fail5(res, 400, "Score must be 1 to 5.");
    if (outcome !== "no_concerns" && comments.length < 20) return fail5(res, 400, "Explain your concerns (at least 20 characters).");
    db.prepare("UPDATE peer_reviews SET status='done', outcome=?, score=?, comments=?, completed_at=? WHERE id=?").run(outcome, score, comments || null, iso4(), pr.id);
    notify(accountOfProfile2(pr.author_professional_id), "Peer review of your work is complete", outcome === "no_concerns" ? "No concerns were raised." : "Open Quality & CPD to read the feedback.");
    if (outcome === "significant_concerns") {
      const id = newId3("inc");
      db.prepare("INSERT INTO incidents (id,reporter_user_id,kind,severity,description,related_type,related_id,created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, req.user.id, "other", "high", `Peer review raised significant concerns about a ${pr.subject_type}. Reviewer comments: ${comments}`, pr.subject_type, pr.subject_id, iso4());
      addEvent(id, req.user.id, "reported", "Opened automatically from a peer review");
      notifyAdmins("HIGH incident reported", "A peer review raised significant concerns.");
    }
    audit(req, "peerreview.submit", { target: ["peer_review", pr.id], details: { outcome, score } });
    res.json({ status: "success" });
  });
  app2.get("/api/admin/peer-reviews", requireRole("admin"), (_req, res) => {
    const list = rows4("SELECT * FROM peer_reviews ORDER BY status = 'done', assigned_at DESC LIMIT 200").map((r) => ({
      id: r.id,
      subjectType: r.subject_type,
      source: r.source,
      status: r.status,
      outcome: r.outcome,
      score: r.score,
      comments: r.comments,
      author: ctx.findProfessional(r.author_professional_id)?.name,
      reviewer: ctx.findProfessional(r.reviewer_professional_id)?.name,
      assignedAt: r.assigned_at,
      completedAt: r.completed_at
    }));
    res.json({ status: "success", data: list });
  });
  const ownDoc = (docId, userId) => {
    if (!docId) return null;
    const d = row4("SELECT id FROM documents WHERE id = ? AND owner_id = ?", String(docId), userId);
    return d ? d.id : void 0;
  };
  const yearStart = () => `${(/* @__PURE__ */ new Date()).getFullYear()}-01-01`;
  app2.get("/api/me/credentials", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid) return res.json({ status: "success", data: null });
    const cpd = rows4("SELECT * FROM cpd_entries WHERE profile_id = ? ORDER BY activity_date DESC", pid);
    const points = cpd.filter((c) => c.status === "approved" && c.activity_date >= yearStart()).reduce((s, c) => s + c.points, 0);
    res.json({ status: "success", data: {
      target: cpdTarget(),
      year: (/* @__PURE__ */ new Date()).getFullYear(),
      pointsApproved: points,
      pointsPending: cpd.filter((c) => c.status === "pending" && c.activity_date >= yearStart()).reduce((s, c) => s + c.points, 0),
      entries: cpd,
      certs: rows4("SELECT * FROM specialty_certs WHERE profile_id = ? ORDER BY created_at DESC", pid),
      reviews: (() => {
        const mine = ctx.reviews().filter((r) => r.professionalId === pid && r.status !== "hidden");
        return { count: mine.length, average: mine.length ? Number((mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(2)) : null };
      })()
    } });
  });
  app2.post("/api/me/cpd", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid) return fail5(res, 403, "No professional profile.");
    const title = str5(req.body.title, 150), category = req.body.category, points = Number(req.body.points), date = dateOnly2(req.body.activityDate);
    if (!title || !CPD_CATEGORIES.includes(category)) return fail5(res, 400, "Enter a title and choose a category.");
    if (!(points > 0 && points <= 50)) return fail5(res, 400, "Points must be between 0.5 and 50.");
    if (!date || date > (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) return fail5(res, 400, "Enter the activity date (not in the future).");
    const doc = ownDoc(req.body.documentId, req.user.id);
    if (doc === void 0) return fail5(res, 400, "That evidence file is not yours.");
    const id = newId3("cpd");
    db.prepare("INSERT INTO cpd_entries (id,profile_id,title,category,points,activity_date,provider,document_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(id, pid, title, category, points, date, str5(req.body.provider, 120) || null, doc, iso4());
    notifyAdmins("CPD entry to verify", `${ctx.findProfessional(pid)?.name}: ${title} (${points} pts)`);
    res.status(201).json({ status: "success", data: { id } });
  });
  app2.delete("/api/me/cpd/:id", requireRole("practitioner"), (req, res) => {
    const r = db.prepare("DELETE FROM cpd_entries WHERE id = ? AND profile_id = ? AND status = 'pending'").run(req.params.id, req.user.profileId ?? "");
    if (!r.changes) return fail5(res, 404, "Only your pending entries can be removed.");
    res.json({ status: "success" });
  });
  app2.post("/api/me/specialty-certs", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid) return fail5(res, 403, "No professional profile.");
    const name = str5(req.body.name, 150), issuer = str5(req.body.issuer, 150), issued = dateOnly2(req.body.issuedDate);
    const expiry = req.body.expiryDate ? dateOnly2(req.body.expiryDate) : null;
    if (!name || !issuer || !issued) return fail5(res, 400, "Name, issuer and issue date are required.");
    if (req.body.expiryDate && !expiry) return fail5(res, 400, "Invalid expiry date.");
    const doc = ownDoc(req.body.documentId, req.user.id);
    if (!doc) return fail5(res, 400, "Upload the certificate first and attach it.");
    const id = newId3("cert");
    db.prepare("INSERT INTO specialty_certs (id,profile_id,name,issuer,issued_date,expiry_date,document_id,created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, pid, name, issuer, issued, expiry, doc, iso4());
    notifyAdmins("Specialty certificate to verify", `${ctx.findProfessional(pid)?.name}: ${name}`);
    res.status(201).json({ status: "success", data: { id } });
  });
  app2.get("/api/professionals/:id/credentials", (req, res) => {
    const p = ctx.findProfessional(req.params.id);
    if (!p || p.verificationStatus !== "Verified \u2705" /* VERIFIED */) return res.json({ status: "success", data: [] });
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const list = rows4("SELECT name, issuer, issued_date, expiry_date FROM specialty_certs WHERE profile_id = ? AND status = 'approved' AND (expiry_date IS NULL OR expiry_date > ?)", p.id, today);
    res.json({ status: "success", data: list });
  });
  app2.get("/api/admin/credentials", requireRole("admin"), (_req, res) => {
    const withName = (r) => ({ ...r, professionalName: ctx.findProfessional(r.profile_id)?.name });
    const start = yearStart();
    const doctors2 = ctx.allProfessionals().filter((p) => p.verificationStatus === "Verified \u2705" /* VERIFIED */ && p.role === "doctor");
    res.json({ status: "success", data: {
      pendingCpd: rows4("SELECT * FROM cpd_entries WHERE status = 'pending' ORDER BY created_at").map(withName),
      pendingCerts: rows4("SELECT * FROM specialty_certs WHERE status = 'pending' ORDER BY created_at").map(withName),
      target: cpdTarget(),
      compliance: doctors2.map((d) => ({
        id: d.id,
        name: d.name,
        points: row4("SELECT COALESCE(SUM(points),0) AS s FROM cpd_entries WHERE profile_id = ? AND status = 'approved' AND activity_date >= ?", d.id, start).s
      }))
    } });
  });
  const decide = (table, kind) => (req, res) => {
    const r = row4(`SELECT * FROM ${table} WHERE id = ?`, req.params.id);
    if (!r) return fail5(res, 404, "Entry not found.");
    if (r.status !== "pending") return fail5(res, 409, "Already decided.");
    const decision = req.body.decision, note = str5(req.body.note, 500);
    if (!["approved", "rejected"].includes(decision)) return fail5(res, 400, "Decision must be approved or rejected.");
    if (decision === "rejected" && !note) return fail5(res, 400, "Give a reason for rejecting.");
    db.prepare(`UPDATE ${table} SET status = ?, review_note = ?, reviewed_by = ? WHERE id = ?`).run(decision, note || null, req.user.id, r.id);
    notify(accountOfProfile2(r.profile_id), `${kind} ${decision}`, `${r.title ?? r.name}${note ? `: ${note}` : ""}`);
    audit(req, `${kind.toLowerCase().replace(/ /g, "_")}.${decision}`, { target: [table, r.id] });
    res.json({ status: "success" });
  };
  app2.post("/api/admin/cpd/:id/review", requireRole("admin"), decide("cpd_entries", "CPD entry"));
  app2.post("/api/admin/specialty-certs/:id/review", requireRole("admin"), decide("specialty_certs", "Specialty certificate"));
}

// server/payments.ts
import crypto9 from "crypto";
import express from "express";
db.exec(`
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  professional_id TEXT,
  amount_sen INTEGER NOT NULL,
  platform_fee_sen INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  provider_ref TEXT,
  payment_intent TEXT,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  refunded_at TEXT,
  refund_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_pay_ref ON payments(kind, ref_id);
CREATE INDEX IF NOT EXISTS idx_pay_pro ON payments(professional_id, status);
`);
var handlers = null;
var setPaymentHandlers = (h) => {
  handlers = h;
};
var stripeKey = () => process.env.STRIPE_SECRET_KEY || "";
var provider = () => stripeKey() ? "stripe" : process.env.NODE_ENV !== "production" || process.env.ALLOW_SANDBOX_PAYMENTS === "true" || !!process.env.VERCEL ? "sandbox" : null;
var commissionPct = () => Math.min(50, Math.max(0, Number(process.env.PLATFORM_COMMISSION_PCT ?? 15)));
var appUrl = () => (process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL : "http://localhost:3000").replace(/\/$/, "");
var fail6 = (res, code, message) => res.status(code).json({ status: "error", message });
var getPayment = (id) => db.prepare("SELECT * FROM payments WHERE id = ?").get(id);
var paymentsEnabled = () => provider() !== null;
function markPaid(p, paymentIntent) {
  const changed = db.prepare("UPDATE payments SET status='paid', paid_at=?, payment_intent=COALESCE(?, payment_intent) WHERE id=? AND status='pending'").run((/* @__PURE__ */ new Date()).toISOString(), paymentIntent ?? null, p.id).changes;
  if (changed) {
    audit(null, "payment.paid", { actor: { id: p.user_id, role: "patient" }, target: ["payment", p.id], details: { kind: p.kind, amountSen: p.amount_sen } });
    handlers?.onPaid(getPayment(p.id));
  }
}
async function refundPayment(paymentId, reason, actorId) {
  const p = getPayment(paymentId);
  if (!p) return { ok: false, error: "Payment not found." };
  if (p.status !== "paid") return { ok: false, error: "Only paid payments can be refunded." };
  if (p.provider === "stripe") {
    if (!p.payment_intent) return { ok: false, error: "No Stripe payment intent recorded." };
    const r = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey()}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: p.payment_intent, "metadata[payment_id]": p.id })
    });
    if (!r.ok) return { ok: false, error: "The payment provider refused the refund." };
  }
  db.prepare("UPDATE payments SET status='refunded', refunded_at=?, refund_reason=? WHERE id=?").run((/* @__PURE__ */ new Date()).toISOString(), reason, p.id);
  audit(null, "payment.refund", { actor: actorId ? { id: actorId, role: "admin" } : null, target: ["payment", p.id], details: { reason } });
  handlers?.onRefunded(getPayment(p.id));
  return { ok: true };
}
function registerPaymentWebhook(app2) {
  app2.post("/api/payments/stripe-webhook", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const header = String(req.headers["stripe-signature"] || "");
    if (!secret || !Buffer.isBuffer(req.body)) return res.status(400).end();
    const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
    const t = Number(parts.t);
    const expected = crypto9.createHmac("sha256", secret).update(`${parts.t}.${req.body.toString("utf8")}`).digest("hex");
    const sigOk = parts.v1 && parts.v1.length === expected.length && crypto9.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
    if (!sigOk || !t || Math.abs(Date.now() / 1e3 - t) > 300) return res.status(400).end();
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const p = getPayment(s.client_reference_id);
      if (p && s.payment_status === "paid" && s.amount_total === p.amount_sen) markPaid(p, typeof s.payment_intent === "string" ? s.payment_intent : void 0);
    }
    res.json({ received: true });
  });
}
function registerPaymentRoutes(app2) {
  app2.get("/api/payments/config", (_req, res) => {
    res.json({ status: "success", data: { mode: provider(), currency: "MYR" } });
  });
  app2.post("/api/payments/checkout", requireRole("patient"), async (req, res) => {
    const prov = provider();
    if (!prov) return fail6(res, 503, "Online payments are not configured yet.");
    const kind = String(req.body.kind);
    const payable = handlers?.resolve(kind, String(req.body.refId));
    if (!payable || payable.userId !== req.user.id) return fail6(res, 404, "Nothing to pay for.");
    const existing = db.prepare("SELECT * FROM payments WHERE kind=? AND ref_id=? ORDER BY created_at DESC").all(kind, payable.id);
    if (existing.some((p) => p.status === "paid")) return fail6(res, 409, "This has already been paid.");
    const amountSen = Math.round(payable.amount * 100);
    if (!(amountSen > 0)) return fail6(res, 400, "Invalid amount.");
    let pay = existing.find((p) => p.status === "pending" && p.provider === prov && p.amount_sen === amountSen);
    if (!pay) {
      const id = "pay-" + crypto9.randomBytes(8).toString("hex");
      db.prepare(
        `INSERT INTO payments (id,user_id,kind,ref_id,professional_id,amount_sen,platform_fee_sen,provider,description,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).run(id, payable.userId, kind, payable.id, payable.professionalId, amountSen, Math.round(amountSen * commissionPct() / 100), prov, payable.description, (/* @__PURE__ */ new Date()).toISOString());
      pay = getPayment(id);
    }
    if (prov === "sandbox") {
      return res.json({ status: "success", data: { paymentId: pay.id, provider: "sandbox", amount: payable.amount } });
    }
    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "myr",
      "line_items[0][price_data][unit_amount]": String(amountSen),
      "line_items[0][price_data][product_data][name]": payable.description,
      client_reference_id: pay.id,
      "metadata[payment_id]": pay.id,
      success_url: `${appUrl()}/?payment=success&pid=${pay.id}`,
      cancel_url: `${appUrl()}/?payment=cancelled&pid=${pay.id}`
    });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey()}`, "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const session = await r.json().catch(() => ({}));
    if (!r.ok || !session.url) return fail6(res, 502, "Could not start the payment. Please try again.");
    db.prepare("UPDATE payments SET provider_ref = ? WHERE id = ?").run(session.id, pay.id);
    res.json({ status: "success", data: { paymentId: pay.id, provider: "stripe", checkoutUrl: session.url } });
  });
  app2.post("/api/payments/:id/sandbox-confirm", requireRole("patient"), (req, res) => {
    const p = getPayment(req.params.id);
    if (!p || p.user_id !== req.user.id) return fail6(res, 404, "Payment not found.");
    if (p.provider !== "sandbox" || provider() !== "sandbox") return fail6(res, 400, "This payment cannot be confirmed here.");
    markPaid(p);
    res.json({ status: "success", data: getPayment(p.id) });
  });
  app2.get("/api/payments/:id", requireAuth, (req, res) => {
    const p = getPayment(req.params.id);
    const u = req.user;
    if (!p || p.user_id !== u.id && u.role !== "admin" && !(u.role === "practitioner" && p.professional_id === u.profileId)) {
      return fail6(res, 404, "Payment not found.");
    }
    res.json({ status: "success", data: p });
  });
  app2.get("/api/payments/:id/invoice", requireAuth, (req, res) => {
    const p = getPayment(req.params.id);
    const u = req.user;
    if (!p || p.status === "pending" || p.user_id !== u.id && u.role !== "admin") return fail6(res, 404, "Invoice not found.");
    const patient = db.prepare("SELECT name, email FROM users WHERE id = ?").get(p.user_id);
    res.json({
      status: "success",
      data: {
        invoiceNumber: "INV-" + p.id.slice(4).toUpperCase(),
        paymentId: p.id,
        issuedAt: p.paid_at,
        billedTo: patient,
        description: p.description,
        currency: p.currency,
        total: p.amount_sen / 100,
        status: p.status,
        refundedAt: p.refunded_at,
        provider: p.provider,
        testMode: p.provider === "sandbox"
      }
    });
  });
  app2.get("/api/me/earnings", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid) return res.json({ status: "success", data: { rows: [], totals: { gross: 0, fee: 0, net: 0 } } });
    const rows5 = db.prepare(
      "SELECT id, kind, description, amount_sen, platform_fee_sen, status, paid_at, refunded_at, provider FROM payments WHERE professional_id = ? AND status IN ('paid','refunded') ORDER BY paid_at DESC LIMIT 200"
    ).all(pid);
    const paid = rows5.filter((r) => r.status === "paid");
    const gross = paid.reduce((s, r) => s + r.amount_sen, 0);
    const fee = paid.reduce((s, r) => s + r.platform_fee_sen, 0);
    res.json({
      status: "success",
      data: {
        rows: rows5.map((r) => ({ ...r, net: (r.amount_sen - r.platform_fee_sen) / 100, gross: r.amount_sen / 100, testMode: r.provider === "sandbox" })),
        totals: { gross: gross / 100, fee: fee / 100, net: (gross - fee) / 100 },
        commissionPct: commissionPct()
      }
    });
  });
  app2.get("/api/admin/payments", requireRole("admin"), (_req, res) => {
    const rows5 = db.prepare(
      `SELECT p.*, u.name AS patientName FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 200`
    ).all();
    const totals = db.prepare("SELECT COALESCE(SUM(amount_sen),0) AS gross, COALESCE(SUM(platform_fee_sen),0) AS fee FROM payments WHERE status='paid'").get();
    res.json({ status: "success", data: { rows: rows5, mode: provider(), totals: { gross: totals.gross / 100, platformFee: totals.fee / 100 } } });
  });
  app2.post("/api/payments/:id/refund", requireRole("admin"), async (req, res) => {
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!reason) return fail6(res, 400, "A reason is required.");
    const r = await refundPayment(req.params.id, reason, req.user.id);
    if (!r.ok) return fail6(res, 400, r.error || "Refund failed.");
    res.json({ status: "success" });
  });
}

// server/care.ts
import crypto10 from "crypto";
db.exec(`
CREATE TABLE IF NOT EXISTS presence (
  profile_id TEXT PRIMARY KEY,
  online INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS roster (
  profile_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  hour INTEGER NOT NULL,
  PRIMARY KEY (profile_id, day, hour)
);
CREATE TABLE IF NOT EXISTS consults (
  id TEXT PRIMARY KEY,
  patient_user_id TEXT NOT NULL,
  professional_id TEXT,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  red_flags TEXT,
  fee_sen INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  queued_at TEXT,
  escalated_at TEXT,
  accepted_at TEXT,
  ended_at TEXT,
  end_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_consults_status ON consults(status);
CREATE TABLE IF NOT EXISTS consult_declines (
  consult_id TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  PRIMARY KEY (consult_id, professional_id)
);
CREATE TABLE IF NOT EXISTS consult_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consult_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cmsg ON consult_messages(consult_id, id);
CREATE TABLE IF NOT EXISTS consult_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consult_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_csig ON consult_signals(consult_id, id);
CREATE TABLE IF NOT EXISTS emergency_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  lat REAL,
  lng REAL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT,
  handled_at TEXT
);
`);
try {
  db.exec("ALTER TABLE consults ADD COLUMN share_record INTEGER NOT NULL DEFAULT 0");
} catch {
}
var PRESENCE_TTL_MS = 9e4;
var ESCALATE_AFTER_MS = 3 * 6e4;
var UNMATCHED_AFTER_MS = 10 * 6e4;
var consultFeeSen = () => Math.round(Number(process.env.CONSULT_NOW_FEE ?? 80) * 100);
var RED_FLAG_RULES = [
  [/chest (pain|tight|pressure)|crushing|pain.*(left arm|jaw)/i, "possible heart attack symptoms"],
  [/can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath|gasping|choking/i, "breathing difficulty"],
  [/unconscious|unresponsive|passed out|collapsed|not waking/i, "loss of consciousness"],
  [/stroke|face (is )?droop|slurred speech|sudden (weakness|numbness)|one side/i, "possible stroke signs"],
  [/seizure|convuls|fitting/i, "seizure"],
  [/severe bleeding|bleeding (a lot|heavily|won'?t stop)|vomiting blood|coughing (up )?blood/i, "severe bleeding"],
  [/anaphyla|throat (is )?(closing|swelling)|swollen (tongue|lips)/i, "severe allergic reaction"],
  [/suicid|kill myself|end my life|self[- ]harm|overdose/i, "risk to life or self-harm"],
  [/poison|swallowed.*(pills|bleach|chemical)/i, "possible poisoning"],
  [/not breathing|no pulse/i, "no breathing or pulse"]
];
function redFlags(text) {
  return RED_FLAG_RULES.filter(([re]) => re.test(text)).map(([, label]) => label);
}
var emergencyNumbers = () => {
  try {
    const v = process.env.EMERGENCY_NUMBERS ? JSON.parse(process.env.EMERGENCY_NUMBERS) : null;
    if (Array.isArray(v) && v.every((x) => x?.label && x?.number)) return v;
  } catch {
  }
  return [
    { label: "National emergency (ambulance, police, fire)", number: "999" },
    { label: "Emergency from a mobile phone", number: "112" }
  ];
};
var str6 = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail7 = (res, code, message) => res.status(code).json({ status: "error", message });
var newId4 = (p) => `${p}-${crypto10.randomBytes(6).toString("hex")}`;
var iso5 = () => (/* @__PURE__ */ new Date()).toISOString();
function registerCareRoutes(app2, ctx) {
  const isOnline = (profileId) => {
    const r = db.prepare("SELECT online, last_seen FROM presence WHERE profile_id = ?").get(profileId);
    return !!r && r.online === 1 && Date.now() - Date.parse(r.last_seen) < PRESENCE_TTL_MS;
  };
  const verifiedDoctor = (profileId) => {
    const p = profileId ? ctx.findProfessional(profileId) : null;
    return p && p.role === "doctor" && p.verificationStatus === "Verified \u2705" /* VERIFIED */ ? p : null;
  };
  const onlineDoctorIds = () => db.prepare("SELECT profile_id FROM presence WHERE online = 1").all().map((r) => r.profile_id).filter((id) => isOnline(id) && verifiedDoctor(id));
  const accountOfProfile2 = (profileId) => db.prepare("SELECT id FROM users WHERE profile_id = ?").get(profileId)?.id ?? null;
  app2.post("/api/presence", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid || !verifiedDoctor(pid)) return fail7(res, 403, "Only verified doctors can go on call.");
    const online = req.body.online === true ? 1 : 0;
    db.prepare("INSERT INTO presence (profile_id, online, last_seen) VALUES (?,?,?) ON CONFLICT(profile_id) DO UPDATE SET online=excluded.online, last_seen=excluded.last_seen").run(pid, online, iso5());
    res.json({ status: "success", data: { online: !!online } });
  });
  app2.get("/api/presence/me", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    res.json({ status: "success", data: { online: !!pid && isOnline(pid), canGoOnline: !!verifiedDoctor(pid) } });
  });
  app2.get("/api/on-call/status", (_req, res) => {
    res.json({ status: "success", data: { onlineDoctors: onlineDoctorIds().length, consultFee: consultFeeSen() / 100, paymentsEnabled: paymentsEnabled() } });
  });
  app2.get("/api/roster", requireRole("practitioner"), (req, res) => {
    const rows5 = db.prepare("SELECT day, hour FROM roster WHERE profile_id = ?").all(req.user.profileId ?? "");
    res.json({ status: "success", data: rows5 });
  });
  app2.put("/api/roster", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid || !verifiedDoctor(pid)) return fail7(res, 403, "Only verified doctors can set an on-call roster.");
    const cells = Array.isArray(req.body.cells) ? req.body.cells : null;
    if (!cells || cells.length > 168) return fail7(res, 400, "Invalid roster.");
    const clean = cells.filter((c) => Number.isInteger(c?.day) && c.day >= 0 && c.day < 7 && Number.isInteger(c?.hour) && c.hour >= 0 && c.hour < 24);
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM roster WHERE profile_id = ?").run(pid);
      const ins = db.prepare("INSERT OR IGNORE INTO roster (profile_id, day, hour) VALUES (?,?,?)");
      for (const c of clean) ins.run(pid, c.day, c.hour);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    audit(req, "roster.update", { details: { hours: clean.length } });
    res.json({ status: "success" });
  });
  app2.get("/api/admin/coverage", requireRole("admin"), (_req, res) => {
    const rows5 = db.prepare("SELECT profile_id, day, hour FROM roster").all();
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of rows5) if (verifiedDoctor(r.profile_id)) grid[r.day][r.hour]++;
    const queued = db.prepare("SELECT COUNT(*) AS n FROM consults WHERE status='queued'").get().n;
    const active = db.prepare("SELECT COUNT(*) AS n FROM consults WHERE status='active'").get().n;
    res.json({ status: "success", data: { grid, onlineNow: onlineDoctorIds().length, queued, active } });
  });
  const consultView = (c, viewer) => {
    const patient = db.prepare("SELECT name FROM users WHERE id = ?").get(c.patient_user_id);
    const pro = c.professional_id ? ctx.findProfessional(c.professional_id) : null;
    return {
      id: c.id,
      status: c.status,
      mode: c.mode,
      symptoms: c.symptoms,
      redFlags: c.red_flags ? JSON.parse(c.red_flags) : [],
      fee: c.fee_sen / 100,
      createdAt: c.created_at,
      queuedAt: c.queued_at,
      acceptedAt: c.accepted_at,
      endedAt: c.ended_at,
      endReason: c.end_reason,
      patientName: viewer.role === "patient" ? void 0 : patient?.name,
      professional: pro ? { id: pro.id, name: pro.name, avatar: pro.avatar, specialization: pro.specialization } : null
    };
  };
  const loadConsult = (id) => db.prepare("SELECT * FROM consults WHERE id = ?").get(id);
  const isParticipant = (c, u) => c && (c.patient_user_id === u.id || !!u.profileId && c.professional_id === u.profileId);
  app2.post("/api/consults", requireRole("patient"), (req, res) => {
    const mode = req.body.mode === "video" ? "video" : req.body.mode === "chat" ? "chat" : null;
    const symptoms = str6(req.body.symptoms, 1e3);
    if (!mode) return fail7(res, 400, "Choose chat or video.");
    if (symptoms.length < 10) return fail7(res, 400, "Please describe your symptoms (at least 10 characters).");
    const open = db.prepare("SELECT id, status FROM consults WHERE patient_user_id = ? AND status IN ('awaiting_payment','queued','active')").get(req.user.id);
    if (open) return res.status(409).json({ status: "error", message: "You already have a consultation in progress.", data: { id: open.id } });
    if (onlineDoctorIds().length === 0) {
      return fail7(res, 409, "No doctors are online right now. You can book an appointment instead. If this is an emergency, call 999.");
    }
    const flags = redFlags(symptoms);
    const id = newId4("con");
    db.prepare("INSERT INTO consults (id, patient_user_id, status, mode, symptoms, red_flags, fee_sen, created_at, share_record) VALUES (?,?,?,?,?,?,?,?,?)").run(id, req.user.id, "awaiting_payment", mode, symptoms, flags.length ? JSON.stringify(flags) : null, consultFeeSen(), iso5(), req.body.shareRecord === true ? 1 : 0);
    audit(req, "consult.create", { target: ["consult", id], details: { mode, redFlags: flags } });
    res.status(201).json({ status: "success", data: { id, redFlags: flags, fee: consultFeeSen() / 100 } });
  });
  app2.get("/api/consults/mine", requireAuth, (req, res) => {
    const u = req.user;
    const rows5 = u.role === "patient" ? db.prepare("SELECT * FROM consults WHERE patient_user_id = ? ORDER BY created_at DESC LIMIT 50").all(u.id) : u.role === "practitioner" && u.profileId ? db.prepare("SELECT * FROM consults WHERE professional_id = ? ORDER BY created_at DESC LIMIT 50").all(u.profileId) : [];
    res.json({ status: "success", data: rows5.map((c) => consultView(c, u)) });
  });
  app2.get("/api/consults/offers", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!verifiedDoctor(pid) || !isOnline(pid)) return res.json({ status: "success", data: [] });
    const rows5 = db.prepare(
      `SELECT c.*, u.name AS pname FROM consults c JOIN users u ON u.id = c.patient_user_id
       WHERE c.status = 'queued' AND c.id NOT IN (SELECT consult_id FROM consult_declines WHERE professional_id = ?)
       ORDER BY c.queued_at ASC LIMIT 20`
    ).all(pid);
    res.json({ status: "success", data: rows5.map((c) => ({
      id: c.id,
      mode: c.mode,
      symptoms: c.symptoms,
      redFlags: c.red_flags ? JSON.parse(c.red_flags) : [],
      queuedAt: c.queued_at,
      fee: c.fee_sen / 100,
      patientFirstName: String(c.pname).split(" ")[0]
    })) });
  });
  app2.get("/api/consults/:id", requireAuth, (req, res) => {
    const c = loadConsult(req.params.id);
    if (!isParticipant(c, req.user)) return fail7(res, 404, "Consultation not found.");
    res.json({ status: "success", data: consultView(c, req.user) });
  });
  app2.post("/api/consults/:id/accept", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!verifiedDoctor(pid) || !isOnline(pid)) return fail7(res, 403, "You must be a verified doctor and online to accept.");
    const busy = db.prepare("SELECT 1 AS x FROM consults WHERE professional_id = ? AND status = 'active'").get(pid);
    if (busy) return fail7(res, 409, "Finish your current consultation first.");
    const won = db.prepare("UPDATE consults SET status='active', professional_id=?, accepted_at=? WHERE id=? AND status='queued' AND professional_id IS NULL").run(pid, iso5(), req.params.id).changes;
    if (!won) return fail7(res, 409, "Another doctor has already taken this consultation.");
    db.prepare("UPDATE payments SET professional_id = ? WHERE kind='consult' AND ref_id = ?").run(pid, req.params.id);
    const c = loadConsult(req.params.id);
    if (c.share_record === 1) createGrant(c.patient_user_id, pid, "consult", c.id, 30);
    notify(c.patient_user_id, "A doctor is ready", `${ctx.findProfessional(pid).name} has joined your consultation.`);
    audit(req, "consult.accept", { target: ["consult", c.id] });
    res.json({ status: "success", data: consultView(c, req.user) });
  });
  app2.post("/api/consults/:id/decline", requireRole("practitioner"), (req, res) => {
    const pid = req.user.profileId;
    if (!pid) return fail7(res, 403, "No profile.");
    db.prepare("INSERT OR IGNORE INTO consult_declines (consult_id, professional_id) VALUES (?,?)").run(req.params.id, pid);
    res.json({ status: "success" });
  });
  app2.post("/api/consults/:id/end", requireAuth, async (req, res) => {
    const c = loadConsult(req.params.id);
    const u = req.user;
    if (!isParticipant(c, u)) return fail7(res, 404, "Consultation not found.");
    if (c.status === "active") {
      db.prepare("UPDATE consults SET status='completed', ended_at=?, end_reason=? WHERE id=?").run(iso5(), u.role === "patient" ? "ended_by_patient" : "ended_by_doctor", c.id);
      if (u.role === "practitioner") notify(c.patient_user_id, "Consultation finished", "Your consultation has ended. You can leave a review from the doctor's profile.");
    } else if ((c.status === "queued" || c.status === "awaiting_payment") && u.role === "patient") {
      db.prepare("UPDATE consults SET status='cancelled', ended_at=?, end_reason='cancelled_by_patient' WHERE id=?").run(iso5(), c.id);
      if (c.status === "queued") await refundForConsult(c.id, "Cancelled before a doctor joined");
    } else {
      return fail7(res, 409, "This consultation is already closed.");
    }
    audit(req, "consult.end", { target: ["consult", c.id] });
    res.json({ status: "success" });
  });
  const activeFor = (req, res) => {
    const c = loadConsult(req.params.id);
    if (!isParticipant(c, req.user)) {
      fail7(res, 404, "Consultation not found.");
      return null;
    }
    return c;
  };
  app2.get("/api/consults/:id/messages", requireAuth, (req, res) => {
    const c = activeFor(req, res);
    if (!c) return;
    const after = Number(req.query.after) || 0;
    const rows5 = db.prepare("SELECT id, sender_user_id AS senderUserId, text, ts FROM consult_messages WHERE consult_id = ? AND id > ? ORDER BY id LIMIT 200").all(c.id, after);
    res.json({ status: "success", data: rows5, consultStatus: c.status });
  });
  app2.post("/api/consults/:id/messages", requireAuth, (req, res) => {
    const c = activeFor(req, res);
    if (!c) return;
    if (c.status !== "active") return fail7(res, 409, "This consultation is not active.");
    const text = str6(req.body.text, 2e3);
    if (!text) return fail7(res, 400, "Message is empty.");
    const r = db.prepare("INSERT INTO consult_messages (consult_id, sender_user_id, text, ts) VALUES (?,?,?,?)").run(c.id, req.user.id, text, iso5());
    res.status(201).json({ status: "success", data: { id: Number(r.lastInsertRowid) } });
  });
  app2.post("/api/consults/:id/signal", requireAuth, (req, res) => {
    const c = activeFor(req, res);
    if (!c) return;
    if (c.status !== "active" || c.mode !== "video") return fail7(res, 409, "Video is not active for this consultation.");
    const kind = String(req.body.kind);
    if (!["offer", "answer", "ice", "hangup"].includes(kind)) return fail7(res, 400, "Bad signal.");
    const payload = JSON.stringify(req.body.payload ?? null);
    if (payload.length > 16e3) return fail7(res, 400, "Signal too large.");
    db.prepare("INSERT INTO consult_signals (consult_id, from_user_id, kind, payload, ts) VALUES (?,?,?,?,?)").run(c.id, req.user.id, kind, payload, iso5());
    res.status(201).json({ status: "success" });
  });
  app2.get("/api/consults/:id/signals", requireAuth, (req, res) => {
    const c = activeFor(req, res);
    if (!c) return;
    const after = Number(req.query.after) || 0;
    const rows5 = db.prepare("SELECT id, kind, payload FROM consult_signals WHERE consult_id = ? AND id > ? AND from_user_id <> ? ORDER BY id LIMIT 100").all(c.id, after, req.user.id);
    const lastId = db.prepare("SELECT COALESCE(MAX(id),0) AS m FROM consult_signals WHERE consult_id = ?").get(c.id).m;
    res.json({ status: "success", data: rows5.map((r) => ({ id: r.id, kind: r.kind, payload: JSON.parse(r.payload) })), cursor: lastId, consultStatus: c.status });
  });
  app2.get("/api/ice-servers", requireAuth, (_req, res) => {
    let servers = [{ urls: "stun:stun.cloudflare.com:3478" }];
    try {
      if (process.env.ICE_SERVERS) servers = JSON.parse(process.env.ICE_SERVERS);
    } catch {
    }
    res.json({ status: "success", data: servers });
  });
  app2.get("/api/emergency/info", (_req, res) => {
    res.json({ status: "success", data: {
      numbers: emergencyNumbers(),
      disclaimer: "MedCred is not an emergency service and cannot send an ambulance. In an emergency call the number below first."
    } });
  });
  app2.post("/api/emergency", requireRole("patient"), (req, res) => {
    const lat = Number(req.body.lat), lng = Number(req.body.lng);
    const hasLoc = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && req.body.lat != null;
    const id = newId4("sos");
    db.prepare("INSERT INTO emergency_events (id, user_id, ts, lat, lng, note) VALUES (?,?,?,?,?,?)").run(id, req.user.id, iso5(), hasLoc ? lat : null, hasLoc ? lng : null, str6(req.body.note, 500) || null);
    notifyAdmins("SOS raised", `${req.user.name} pressed the emergency button.${hasLoc ? " Location shared." : ""}`);
    for (const pid of onlineDoctorIds()) notify(accountOfProfile2(pid), "Patient SOS", `${req.user.name} raised an emergency alert. Admins are following up.`);
    audit(req, "emergency.sos", { target: ["emergency", id] });
    res.status(201).json({
      status: "success",
      data: {
        id,
        numbers: emergencyNumbers(),
        mapUrl: hasLoc ? `https://www.openstreetmap.org/search?query=hospital#map=14/${lat}/${lng}` : null,
        message: "Call the emergency number now. We have alerted our on-call team, but we cannot send an ambulance."
      }
    });
  });
  app2.get("/api/admin/emergencies", requireRole("admin"), (_req, res) => {
    const rows5 = db.prepare(
      `SELECT e.*, u.name AS userName, u.email AS userEmail FROM emergency_events e LEFT JOIN users u ON u.id = e.user_id ORDER BY e.ts DESC LIMIT 100`
    ).all();
    res.json({ status: "success", data: rows5 });
  });
  app2.post("/api/admin/emergencies/:id/handle", requireRole("admin"), (req, res) => {
    const r = db.prepare("UPDATE emergency_events SET status='handled', handled_by=?, handled_at=? WHERE id=? AND status='open'").run(req.user.id, iso5(), req.params.id);
    if (!r.changes) return fail7(res, 404, "Event not found or already handled.");
    audit(req, "emergency.handled", { target: ["emergency", req.params.id] });
    res.json({ status: "success" });
  });
  async function refundForConsult(consultId, reason) {
    const p = db.prepare("SELECT id FROM payments WHERE kind='consult' AND ref_id=? AND status='paid'").get(consultId);
    if (p) await refundPayment(p.id, reason, null);
  }
  const queueTick = async () => {
    const now = Date.now();
    for (const c of db.prepare("SELECT * FROM consults WHERE status = 'queued'").all()) {
      const age = now - Date.parse(c.queued_at);
      if (age > UNMATCHED_AFTER_MS) {
        db.prepare("UPDATE consults SET status='unmatched', ended_at=?, end_reason='no_doctor_available' WHERE id=? AND status='queued'").run(iso5(), c.id);
        await refundForConsult(c.id, "No doctor became available");
        notify(c.patient_user_id, "No doctor was available", "You have been refunded in full. If this is an emergency call 999, or book an appointment.");
      } else if (age > ESCALATE_AFTER_MS && !c.escalated_at) {
        db.prepare("UPDATE consults SET escalated_at=? WHERE id=?").run(iso5(), c.id);
        notifyAdmins("Consultation waiting", `A patient has waited over 3 minutes for a doctor (${onlineDoctorIds().length} online).`);
      }
    }
    db.prepare("UPDATE consults SET status='cancelled', ended_at=?, end_reason='payment_timeout' WHERE status='awaiting_payment' AND created_at < ?").run(iso5(), new Date(now - 30 * 6e4).toISOString());
  };
  setInterval(() => {
    queueTick().catch((e) => console.error("queueTick", e));
  }, 2e4).unref();
  return {
    resolveConsultPayable: (refId) => {
      const c = loadConsult(refId);
      if (!c || c.status !== "awaiting_payment") return null;
      return { kind: "consult", id: c.id, userId: c.patient_user_id, professionalId: null, amount: c.fee_sen / 100, description: "Instant online consultation" };
    },
    onConsultPaid: (consultId) => {
      const changed = db.prepare("UPDATE consults SET status='queued', queued_at=? WHERE id=? AND status='awaiting_payment'").run(iso5(), consultId).changes;
      if (changed) for (const pid of onlineDoctorIds()) notify(accountOfProfile2(pid), "New consultation waiting", "A patient is waiting for an instant consultation.");
    },
    onConsultRefunded: (consultId) => {
      db.prepare("UPDATE consults SET status = CASE WHEN status='queued' THEN 'cancelled' ELSE status END WHERE id=?").run(consultId);
    }
  };
}

// src/data.ts
var INITIAL_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. Siti Aminah Binti Ahmad",
    avatar: "/assets/malaysian_female_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Cardiologist",
    licenseNumber: "MMC-87429",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 14,
    education: ["MD - Cardiology (UM)", "MBBS (Universiti Malaya)"],
    bio: "Senior Consultant Cardiologist specializing in preventive cardiology, heart failure management, and non-invasive cardiac imaging. Committed to evidence-based clinical practice.",
    languages: ["English", "Malay", "Mandarin"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 150,
    rating: 4.9,
    reviewCount: 38,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Kuala Lumpur Specialist Hospital, 8 Jalan Bukit Pantai",
    city: "Kuala Lumpur",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      slots: ["10:00 AM", "11:30 AM", "03:00 PM", "04:30 PM"]
    },
    seoSlug: "dr-siti-aminah-cardiologist-kuala-lumpur"
  },
  {
    id: "doc-2",
    name: "Dr. Tan Seng Hock",
    avatar: "/assets/malaysian_male_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Pediatrician",
    licenseNumber: "MMC-32109",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 18,
    education: ["Master of Paediatrics (UKM)", "MBBS (Universiti Kebangsaan Malaysia)"],
    bio: "Compassionate paediatrician with over 18 years of experience. Expert in neonatal intensive care, developmental monitoring, and childhood immunization.",
    languages: ["English", "Malay", "Mandarin", "Hokkien"],
    consultationModes: ["In-person", "Home Visit", "Video Telehealth"],
    fee: 120,
    rating: 4.8,
    reviewCount: 52,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Damansara Specialist Medical Center, 119 Jalan SS 21/56, Damansara Utama",
    city: "Petaling Jaya",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday"],
      slots: ["09:00 AM", "10:30 AM", "11:00 AM", "05:00 PM"]
    },
    seoSlug: "dr-tan-seng-hock-paediatrician-petaling-jaya"
  },
  {
    id: "doc-3",
    name: "Dr. Ahmad Ridzuan Bin Mohd Rosli",
    avatar: "/assets/malaysian_male_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Neurologist",
    licenseNumber: "MMC-55412",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 11,
    education: ["Master of Neurology (UM)", "MBBS (USM)"],
    bio: "Specialist in stroke intervention, chronic migraine management, neurodegenerative disorders, and epilepsy treatment therapies.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 200,
    rating: 4.7,
    reviewCount: 24,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Penang City Specialist Hospital, 2 Jalan Sultan Ahmad Shah, George Town",
    city: "Penang",
    availability: {
      days: ["Monday", "Tuesday", "Thursday"],
      slots: ["11:00 AM", "01:30 PM", "04:00 PM", "06:30 PM"]
    },
    seoSlug: "dr-ahmad-ridzuan-neurologist-penang"
  },
  {
    id: "doc-4",
    name: "Dr. Leong Mei Ling",
    avatar: "/assets/malaysian_female_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Dermatologist",
    licenseNumber: "MMC-99213",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 9,
    education: ["Advanced Master in Dermatology (UKM)", "MBBS (UM)"],
    bio: "Acne, eczema, laser treatments, and anti-aging expert. Dedicated to restoring skin health and promoting sustainable, scientifically-backed skincare routines.",
    languages: ["English", "Malay", "Cantonese"],
    consultationModes: ["Video Telehealth", "In-person"],
    fee: 140,
    rating: 4.9,
    reviewCount: 45,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Iskandar Specialist Medical Centre, Iskandar Puteri",
    city: "Johor Bahru",
    availability: {
      days: ["Wednesday", "Friday", "Saturday"],
      slots: ["10:00 AM", "12:00 PM", "02:30 PM", "05:30 PM"]
    },
    seoSlug: "dr-leong-mei-ling-dermatologist-johor-bahru"
  }
];
var INITIAL_NURSES = [
  {
    id: "nur-1",
    name: "Sister Nurul Ain Binti Yusof",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse" /* NURSE */,
    specialization: "ICU & Critical Care",
    licenseNumber: "LJM-RN-41223",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 12,
    education: ["B.Sc Nursing (Universiti Malaya)", "Post-Basic Critical Care Diploma"],
    bio: "Highly experienced Critical Care Registered Nurse with extensive ICU background. Proficient in ventilator management, hemodynamic monitoring, and acute patient care.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit", "In-person"],
    fee: 45,
    // hourly
    rating: 4.9,
    reviewCount: 67,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Cheras Medical Center, Jalan Cheras Makmur, Cheras",
    city: "Kuala Lumpur",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      slots: ["08:00 AM - 04:00 PM", "08:00 PM - 08:00 AM (Night)"]
    },
    seoSlug: "nurul-ain-critical-care-nurse-kuala-lumpur",
    shiftTypes: ["Day Shift", "Night Shift", "24-Hour Care"]
  },
  {
    id: "nur-2",
    name: "Karthik Loganathan",
    avatar: "/assets/malaysian_male_patient.jpg",
    role: "nurse" /* NURSE */,
    specialization: "Geriatric & Eldercare",
    licenseNumber: "LJM-RN-11892",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 8,
    education: ["Diploma in Nursing (National Healthcare University College)"],
    bio: "Dedicated eldercare nurse passionate about providing high-quality companion care, mobility assistance, medication management, and nutritional support for senior citizens.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit"],
    fee: 35,
    // hourly
    rating: 4.8,
    reviewCount: 31,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Ampang Specialist Hospital, Jalan Memanda 9",
    city: "Ampang",
    availability: {
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
      slots: ["09:00 AM - 05:00 PM", "12-Hour Daily Care"]
    },
    seoSlug: "karthik-loganathan-geriatric-eldercare-nurse-ampang",
    shiftTypes: ["Day Shift", "24-Hour Care"]
  },
  {
    id: "nur-3",
    name: "Michelle Wong Siew Lan",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse" /* NURSE */,
    specialization: "Pediatric & Neonatal Care",
    licenseNumber: "LJM-RN-88314",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 6,
    education: ["B.Sc Nursing (IMU - International Medical University)"],
    bio: "Certified paediatric nurse specializing in newborn home care, feeding support, post-op paediatric monitoring, and vaccination schedules.",
    languages: ["English", "Malay", "Mandarin"],
    consultationModes: ["Home Visit", "In-person"],
    fee: 40,
    rating: 4.9,
    reviewCount: 19,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Kuala Lumpur Health Center, 286 Jalan Ampang",
    city: "Kuala Lumpur",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      slots: ["08:00 AM - 02:00 PM", "04:00 PM - 10:00 PM"]
    },
    seoSlug: "michelle-wong-paediatric-nurse-kuala-lumpur",
    shiftTypes: ["Day Shift"]
  }
];
var INITIAL_VERIFICATION_REQUESTS = [
  {
    id: "ver-1",
    userId: "pending-doc-1",
    userName: "Dr. Khairul Azman Bin Ibrahim",
    userType: "doctor" /* DOCTOR */,
    licenseNumber: "MMC-77341",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    degreeName: "Master of Medicine in Internal Medicine (UM)",
    fileUrl: "med_certificate_khairul_azman.pdf",
    submittedAt: "2026-07-08T14:30:00Z",
    status: "Pending" /* PENDING */
  },
  {
    id: "ver-2",
    userId: "pending-nur-1",
    userName: "Tan Choon Wei",
    userType: "nurse" /* NURSE */,
    licenseNumber: "LJM-RN-99451",
    medicalCouncil: "Malaysian Nursing Board (LJM)",
    degreeName: "B.Sc Nursing (Universiti Malaya)",
    fileUrl: "bsc_degree_tan_choon_wei.pdf",
    submittedAt: "2026-07-09T02:15:00Z",
    status: "Pending" /* PENDING */
  },
  {
    id: "ver-3",
    userId: "rejected-doc-1",
    userName: "Raymond Wong (Claimed Dr.)",
    userType: "doctor" /* DOCTOR */,
    licenseNumber: "FAKE-10293",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    degreeName: "Degree of Herbology (Unrecognized)",
    fileUrl: "unverified_degree.jpg",
    submittedAt: "2026-07-05T10:00:00Z",
    status: "Rejected" /* REJECTED */,
    rejectionReason: "License verification failed on Malaysian Medical Council database: registration code does not match registered medical practitioner records."
  }
];
var INITIAL_REVIEWS = [
  {
    id: "rev-1",
    professionalId: "doc-1",
    patientId: "pat-1",
    patientName: "Chua Chee Keong",
    rating: 5,
    punctuality: 5,
    communication: 5,
    satisfaction: 5,
    comment: "Excellent diagnostician. Dr. Siti Aminah spent 30 minutes explaining the ECG results and lipid profile details without rushing. Very satisfied with the heart care plan.",
    date: "2026-06-28",
    replyText: "Thank you Chua. Glad we could resolve your cardiac queries. Stay active!",
    isVerifiedPatient: true
  },
  {
    id: "rev-2",
    professionalId: "doc-1",
    patientId: "pat-2",
    patientName: "Fatimah Binti Awang",
    rating: 4.8,
    punctuality: 4,
    communication: 5,
    satisfaction: 5,
    comment: "Very professional and empathetic. Highly recommend her for non-invasive heart screenings at Kuala Lumpur Specialist Hospital.",
    date: "2026-07-01",
    isVerifiedPatient: true
  },
  {
    id: "rev-3",
    professionalId: "nur-1",
    patientId: "pat-3",
    patientName: "Ravi Chandran",
    rating: 5,
    punctuality: 5,
    communication: 5,
    satisfaction: 5,
    comment: "Sister Nurul Ain was phenomenal during my father's post-CABG recovery at home in KL. Her handling of the ventilator setup and tracheostomy care was professional and secure.",
    date: "2026-07-04",
    replyText: "It was an absolute privilege assisting your father, Ravi. Wishing him a robust recovery.",
    isVerifiedPatient: true
  }
];
var INITIAL_JOBS = [
  {
    id: "job-1",
    hospitalName: "Damansara Specialist Medical Center",
    hospitalLogo: "\u{1F3E5}",
    title: "Critical Care Nurse (ICU) - Night Shift Focus",
    type: "Shift-based",
    location: "Damansara Utama",
    city: "Petaling Jaya",
    specialtyRequired: "ICU & Critical Care",
    description: "Looking for Malaysian Nursing Board registered ICU nurses (B.Sc or Diploma) with a minimum of 3 years of clinical ICU experience. Must be proficient in crash cart operation, patient monitoring, and emergency response.",
    salaryRange: "RM 4,500 - RM 6,000 / month",
    requirements: [
      "Registered with Malaysian Nursing Board (LJM) with active license",
      "Proficient in ECG interpretation & mechanical ventilators",
      "BLS & ACLS Certification is mandatory",
      "Strong medical teamwork ethics"
    ],
    applicantsCount: 4,
    status: "Active",
    postedAt: "2026-07-06T09:00:00Z",
    appliedUserIds: []
  },
  {
    id: "job-2",
    hospitalName: "Kuala Lumpur Specialist Hospital",
    hospitalLogo: "\u{1FA7A}",
    title: "Junior Consultant - Paediatric Cardiology",
    type: "Full-time",
    location: "Bangsar",
    city: "Kuala Lumpur",
    specialtyRequired: "Cardiologist",
    description: "Seeking a board-certified pediatrician with subspecialty training or fellowship in Paediatric Cardiology. Will oversee inpatient consults, echocardiography screenings, and congenital heart disease outpatient followups.",
    salaryRange: "RM 15,000 - RM 22,000 / month",
    requirements: [
      "MBBS + Master of Paediatrics + Fellowship in Paediatric Cardiology",
      "Active Malaysian Medical Council (MMC) Registration Number",
      "Minimum 2 years post-fellowship experience",
      "Expertise in non-invasive paediatric cardio-imaging"
    ],
    applicantsCount: 2,
    status: "Active",
    postedAt: "2026-07-07T11:30:00Z",
    appliedUserIds: []
  },
  {
    id: "job-3",
    hospitalName: "Metro Home Healthcare",
    hospitalLogo: "\u{1F3E0}",
    title: "Home Geriatric Care Nurse",
    type: "Contract",
    location: "Bandar Sunway",
    city: "Subang Jaya",
    specialtyRequired: "Geriatric & Eldercare",
    description: "Provide comprehensive nursing assistance to elderly patients recovering at home. Scope includes vital signs recording, feeding tube maintenance, medication administration, and simple physical therapy coordination.",
    salaryRange: "RM 3,500 - RM 4,500 / month",
    requirements: [
      "B.Sc Nursing or Diploma in Nursing with active Malaysian Nursing Board (LJM) registry",
      "Compassionate caregiving background for neurologically-impaired seniors",
      "Exceptional patient-family communication",
      "Strict compliance with daily home care charting"
    ],
    applicantsCount: 7,
    status: "Active",
    postedAt: "2026-07-08T15:00:00Z",
    appliedUserIds: []
  }
];
var INITIAL_ARTICLES = [
  {
    id: "art-1",
    title: "Understanding Chest Pain: When is it a Cardiac Emergency?",
    excerpt: "Not all chest pain signals a heart attack, but knowing when to act immediately can save lives. Our expert cardiologist breaks down the red flag symptoms.",
    content: `Chest pain is one of the most common reasons patients visit the emergency department. While it can stem from benign causes like acid reflux, muscle strain, or anxiety, it is essential to rule out acute coronary syndromes (ACS), such as myocardial infarction (heart attack).

### Cardiac vs. Non-Cardiac Symptoms
- **Cardiac Pain**: Classically described as a pressure, squeezing, fullness, or pain in the center of the chest. It often radiates to the neck, jaw, shoulders, or arms (especially the left arm). It can be accompanied by dyspnea (shortness of breath), diaphoresis (profuse sweating), nausea, or lightheadedness.
- **Non-Cardiac Pain**: Often sharp, localized, or aggravated by breathing, coughing, or specific posture shifts. However, clinical presentation varies significantly, especially in elderly patients, diabetics, and women, who may present with atypical symptoms like pure epigastric discomfort or isolated dyspnea.

### Critical Action Protocols
If you or someone near you experiences squeezing substernal discomfort lasting more than 5 minutes, accompanied by sweating or radiating pain:
1. **Call Emergency Services (999 in Malaysia) immediately**. Do not attempt to drive yourself to the clinic.
2. **Rest**: Place the patient in a comfortable sitting position to decrease myocardial oxygen demand.
3. **Masticate Aspirin**: If instructed by emergency personnel and not contraindicated (no allergy, active bleeding), chewing a 325mg non-coated aspirin can limit platelet aggregation and clot growth.

*Disclaimer: This guide is authored by registered medical professionals for educational purposes only. It is not a substitute for clinical emergency diagnostics.*`,
    category: "Cardiology",
    authorId: "doc-1",
    authorName: "Dr. Siti Aminah Binti Ahmad",
    authorTitle: "Senior Consultant Cardiologist",
    authorAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250",
    authorCredentialsVerified: true,
    date: "2026-07-05",
    citations: [
      "Malaysian Clinical Practice Guidelines (CPG) on the Management of Acute Myocardial Infarction (2020).",
      "Circulation: AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain."
    ],
    faq: [
      {
        question: "Does chest pain always radiate to the left arm?",
        answer: "No. While radiation to the left arm is classic, pain can radiate to the right arm, jaw, neck, back, or remain strictly in the epigastric (upper stomach) region, particularly in women and diabetic patients."
      },
      {
        question: "Can gas cause severe chest pain?",
        answer: "Gas, gastroesophageal reflux disease (GERD) and esophageal spasms can cause severe pain mimicking angina. However, emergency clinical evaluation is crucial to safely distinguish them from cardiac causes."
      }
    ]
  },
  {
    id: "art-2",
    title: "Essential Care Protocols for Ventilated Patients at Home",
    excerpt: "Transitioning an ICU patient to home-based mechanical ventilation requires highly detailed protocol management to prevent pneumonia and mechanical failures.",
    content: `Caring for a patient on long-term mechanical ventilation at home is a complex endeavor that requires close coordination between critical care nurses, family members, and the home health agency. Strict adherence to evidence-based protocols is vital to prevent severe complications, most notably Ventilator-Associated Pneumonia (VAP).

### 1. Airway Security and Suctioning
Tracheostomy tubes must remain clear of secretions to prevent occlusion. Suctioning should be performed on an as-needed basis rather than on a rigid schedule to minimize mucosal trauma:
- **Aseptic Technique**: Always wash hands thoroughly and wear sterile gloves. Use sterile suction catheters.
- **Pre-Oxygenation**: Deliver 100% oxygen before suctioning to avoid hypoxia.
- **Suction Duration**: Limit suction application to 10-15 seconds per pass.

### 2. Preventing Ventilator-Associated Pneumonia (VAP)
- **Head Elevation**: Ensure the patient's head of the bed is maintained at an angle of 30 to 45 degrees, unless medically contraindicated. This simple positioning significantly reduces aspiration risks.
- **Mouth Hygiene**: Clean the patient's oral cavity every 4 to 6 hours using chlorhexidine antiseptic solution. secretion build-up in the oropharynx is a primary reservoir for respiratory pathogens.

### 3. Alarm Management and Emergency Contingency
Always have a manual resuscitation bag (Ambu bag) and a backup battery/power source in the patient's immediate vicinity. Home care providers must be trained to recognize and act upon high-pressure alarms (often indicating blockage, coughing, or tube displacement) and low-pressure alarms (signaling circuit leaks or disconnects).

*This protocol guide has been reviewed and certified by professional registered critical care instructors.*`,
    category: "Critical Care",
    authorId: "nur-1",
    authorName: "Sister Nurul Ain Binti Yusof",
    authorTitle: "ICU & Critical Care Registered Nurse",
    authorAvatar: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=250",
    authorCredentialsVerified: true,
    date: "2026-07-08",
    citations: [
      "Malaysian Ministry of Health (MOH) Home-based Nursing Care Guidelines.",
      "AACN Procedure Manual for High Acuity, Progressive, and Critical Care (8th Edition)."
    ],
    faq: [
      {
        question: "What is the first step when a ventilator alarm triggers and the cause is unclear?",
        answer: "If you cannot immediately resolve an alarm and the patient is in distress, immediately disconnect the patient from the ventilator and manually ventilate them using the Ambu bag connected to 100% oxygen, then call for emergency support."
      },
      {
        question: "How often should oral care be performed?",
        answer: "Standard practice recommends performing oral hygiene with chlorhexidine every 4 to 6 hours to minimize salivary bacterial counts."
      }
    ]
  }
];

// server.ts
dotenv.config();
var app = express2();
var isProd2 = process.env.NODE_ENV === "production";
if (isProd2) app.set("trust proxy", 1);
app.use(helmet({
  // CSP only in production: the Vite dev server injects inline scripts.
  contentSecurityPolicy: isProd2 ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  } : false
}));
registerPaymentWebhook(app);
app.use(express2.json({ limit: "100kb" }));
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ status: "error", message: "Cross-origin request blocked." });
      }
    } catch {
      return res.status(403).json({ status: "error", message: "Bad origin." });
    }
  }
  next();
});
app.use("/api/auth/login", rateLimit3({
  windowMs: 15 * 6e4,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many attempts. Please wait and try again." }
}));
app.use("/api/auth/register-practitioner", rateLimit3({ windowMs: 60 * 6e4, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/register-patient", rateLimit3({ windowMs: 60 * 6e4, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/", rateLimit3({ windowMs: 6e4, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(loadSession);
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var doctors = [...INITIAL_DOCTORS];
var nurses = [...INITIAL_NURSES];
var verificationRequests = [...INITIAL_VERIFICATION_REQUESTS];
var reviews = [...INITIAL_REVIEWS];
var jobs = [...INITIAL_JOBS];
var articles = [...INITIAL_ARTICLES];
var bookings = [
  {
    id: "bkg-101112",
    professionalId: "doc-1",
    professionalName: "Dr. Ananya Sen",
    professionalRole: "doctor" /* DOCTOR */,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "patient@example.com",
    date: "2026-07-12",
    timeSlot: "10:00 AM",
    mode: "Video Telehealth" /* VIDEO */,
    fee: 150,
    paymentStatus: "Paid",
    status: "Upcoming",
    symptoms: "Mild chest tightness after walking, occasional high heart rate.",
    createdAt: "2026-07-08T10:00:00.000Z"
  },
  {
    id: "bkg-202223",
    professionalId: "doc-2",
    professionalName: "Dr. Rajesh K. Sharma",
    professionalRole: "doctor" /* DOCTOR */,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "patient@example.com",
    date: "2026-07-05",
    timeSlot: "11:00 AM",
    mode: "In-person" /* IN_PERSON */,
    fee: 120,
    paymentStatus: "Paid",
    status: "Completed",
    symptoms: "Allergic cough, nasal congestion, low-grade fever for 3 days.",
    createdAt: "2026-07-04T15:30:00.000Z",
    prescription: {
      diagnosis: "Acute Bronchitis & Seasonal Allergy Flare-up",
      medicines: "1. Tab Cetirizine 10mg - 1 tablet before sleeping for 5 days\n2. Tab Paracetamol 650mg - 1 tablet SOS if fever > 100\xB0F (Max 3/day)\n3. Levosalbutamol Inhaler - 2 puffs every 6 hours if wheezing",
      instructions: "Keep hydrated. Avoid cold fluids and exposure to dust. Steam inhalation twice a day. Return for review if shortness of breath increases.",
      issuedAt: "2026-07-05T11:45:00.000Z",
      digitalSignature: "Digitally Signed & Certified by Dr. Rajesh K. Sharma (MMC-32109)"
    }
  }
];
var chats = [];
var patients = [];
var appPackages = [
  {
    id: "patient_dashboard",
    name: "Member Portal Hub",
    description: "Allows members to manage active bookings, view digital prescriptions, log vital health stats, and save doctor profiles.",
    icon: "Heart",
    isEnabled: true,
    category: "Patient Services",
    version: "2.1.0",
    author: "MediCert Core Dev",
    isRemovable: false
  },
  {
    id: "registry",
    name: "Doctors & Nurses Directory",
    description: "Search engine for patients to locate certified medical practitioners with advanced filters and clinical triage matcher.",
    icon: "Search",
    isEnabled: true,
    category: "Patient Services",
    version: "1.8.5",
    author: "MediCert Core Dev",
    isRemovable: false
  },
  {
    id: "recruitment",
    name: "Shift Vacancies & Recruitment",
    description: "B2B job recruitment board matching clinical healthcare institutions with credential-approved practitioners for active shift fill-ins.",
    icon: "Calendar",
    isEnabled: true,
    category: "Clinical Operations",
    version: "1.4.0",
    author: "MediCert B2B Group",
    isRemovable: true
  },
  {
    id: "articles",
    name: "Peer-Reviewed Medical Library",
    description: "Publish patient-facing health guidance papers written by licensed clinical practitioners, backed by PubMed citation metrics.",
    icon: "BookOpen",
    isEnabled: true,
    category: "SEO & Growth",
    version: "1.2.0",
    author: "EEAT Compliance Team",
    isRemovable: true
  },
  {
    id: "onboard",
    name: "Practitioner Credential Portal",
    description: "Multi-stage onboarding gateway for doctors and nurses to submit government license keys and registry files for audit verification.",
    icon: "PlusCircle",
    isEnabled: true,
    category: "Credentialing",
    version: "2.0.1",
    author: "Medical Board Audit Team",
    isRemovable: false
  },
  {
    id: "messages",
    name: "HIPAA Secure Mailroom",
    description: "Encrypted instant messaging system connecting vetted medical staff with patient accounts for safe telehealth pre-consultation.",
    icon: "MessageSquare",
    isEnabled: true,
    category: "Communication",
    version: "1.1.2",
    author: "SecOps Security Team",
    isRemovable: true
  },
  {
    id: "seo",
    name: "Google Rich Snippets SEO",
    description: "Dynamic Schema.org structural JSON-LD metadata generator and Google sitemap dynamic indexing automation tracker.",
    icon: "Globe",
    isEnabled: true,
    category: "SEO & Growth",
    version: "1.0.4",
    author: "MediCert Growth Labs",
    isRemovable: true
  }
];
doctors = loadCollection("doctors", doctors);
nurses = loadCollection("nurses", nurses);
verificationRequests = loadCollection("verificationRequests", verificationRequests);
reviews = loadCollection("reviews", reviews);
jobs = loadCollection("jobs", jobs);
bookings = loadCollection("bookings", bookings);
chats = loadCollection("chats", chats);
patients = loadCollection("patients", patients);
appPackages = loadCollection("appPackages", appPackages);
ensureAdmin();
var DEMO_PASSWORD = "DemoPass123";
function ensureDemoData() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let docProfile = doctors.find((d) => d.licenseNumber === "DEMO-MMC-0001" || d.id === "doc-demo-1");
  if (!docProfile) {
    docProfile = {
      id: "doc-demo-1",
      name: "Dr Demo Physician",
      avatar: "/assets/malaysian_male_doctor.jpg",
      role: "doctor" /* DOCTOR */,
      specialization: "General Physician",
      licenseNumber: "DEMO-MMC-0001",
      licenseExpiry: "2029-12-31",
      medicalCouncil: "Malaysian Medical Council (MMC)",
      experienceYears: 8,
      education: ["MBBS (Universiti Malaya)"],
      bio: "Board-verified general physician providing outpatient and tele-triage consultations.",
      languages: ["English", "Malay"],
      consultationModes: ["In-person" /* IN_PERSON */, "Video Telehealth" /* VIDEO */],
      fee: 60,
      rating: 4.9,
      reviewCount: 12,
      verificationStatus: "Verified \u2705" /* VERIFIED */,
      practiceAddress: "1 Jalan Demo, Kuala Lumpur",
      city: "Kuala Lumpur",
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM", "10:00 AM", "02:00 PM", "04:00 PM"]
      },
      seoSlug: "dr-demo-physician-general-physician-kuala-lumpur"
    };
    doctors.push(docProfile);
  }
  let docUser = db.prepare("SELECT * FROM users WHERE email = ?").get("demo.doctor@careverified.test");
  if (!docUser) {
    docUser = createUser({
      id: "usr-demo-doctor",
      email: "demo.doctor@careverified.test",
      password: DEMO_PASSWORD,
      role: "practitioner",
      name: "Dr Demo Physician",
      avatarUrl: "/assets/malaysian_male_doctor.jpg",
      profileId: docProfile.id,
      consentVersion: "2026-11"
    });
  } else if (!docUser.profile_id) {
    db.prepare("UPDATE users SET profile_id = ? WHERE id = ?").run(docProfile.id, docUser.id);
  }
  const insRoster = db.prepare("INSERT OR IGNORE INTO roster (profile_id, day, hour) VALUES (?, ?, ?)");
  for (let day = 0; day < 5; day++) {
    for (let hour = 8; hour < 20; hour++) {
      insRoster.run(docProfile.id, day, hour);
    }
  }
  let patUser = db.prepare("SELECT * FROM users WHERE email = ?").get("demo.patient@careverified.test");
  if (!patUser) {
    patUser = createUser({
      id: "usr-demo-patient",
      email: "demo.patient@careverified.test",
      password: DEMO_PASSWORD,
      role: "patient",
      name: "Demo Patient",
      avatarUrl: "/assets/malaysian_male_patient.jpg",
      consentVersion: "2026-11"
    });
  }
  let patProfile = patients.find((p) => p.userId === patUser.id || p.email === "demo.patient@careverified.test");
  if (!patProfile) {
    patProfile = {
      id: "pat-99912",
      userId: patUser.id,
      name: "Demo Patient",
      email: "demo.patient@careverified.test",
      icNumber: "900101-14-0000",
      age: 34,
      phone: "+60-12-000-0000",
      gender: "Female",
      chronicConditions: ["Hypertension"],
      allergies: ["Penicillin"],
      emergencyContactName: "Ahmad Ramli",
      emergencyContactPhone: "+60-12-345-6789",
      registeredAt: now
    };
    patients.push(patProfile);
  }
  for (const b of bookings) {
    if (b.patientId === "pat-99912" && !b.patientUserId) {
      b.patientUserId = patUser.id;
      b.patientName = "Demo Patient";
      b.patientEmail = "demo.patient@careverified.test";
    }
  }
  const existingItems = db.prepare("SELECT COUNT(*) AS c FROM health_items WHERE user_id = ?").get(patUser.id);
  if (!existingItems?.c) {
    seedHealthItems(patUser.id, ["Hypertension"], ["Penicillin"]);
    db.prepare(
      "INSERT INTO health_items (id, user_id, type, name, detail, severity, active, created_at, updated_at) VALUES (?, ?, 'medication', 'Warfarin', '3 mg at night', NULL, 1, ?, ?)"
    ).run("hi-demo-med-1", patUser.id, now, now);
    db.prepare(
      "INSERT INTO vitals (id, user_id, ts, kind, value1, value2, unit, note) VALUES (?, ?, ?, 'bp', 134, 86, 'mmHg', 'Morning reading')"
    ).run("vit-demo-bp-1", patUser.id, now);
  }
  createGrant(patUser.id, docProfile.id, "booking", "bkg-202223", 365);
  let demoPharm = db.prepare("SELECT * FROM pharmacies WHERE name = 'Demo Pharmacy'").get();
  if (!demoPharm) {
    const id = "phm-demo-1";
    db.prepare(
      `INSERT INTO pharmacies (id, name, address, city, phone, hours, services, pin_hash, active, licence_no, pharmacist_name, pharmacist_reg, verified_at, verified_by, created_at)
       VALUES (?, 'Demo Pharmacy', '2 Jalan Demo, Kuala Lumpur', 'Kuala Lumpur', '03-5550 0100', 'Mon\u2013Sat 9am\u201310pm', ?, ?, 1, 'DEMO-PH-0001', 'Demo Pharmacist', 'DEMO-RPh-0001', ?, 'usr-demo-admin', ?)`
    ).run(id, JSON.stringify(["Home delivery", "Vaccinations"]), hashPassword("123456"), now, now);
    demoPharm = db.prepare("SELECT * FROM pharmacies WHERE id = ?").get(id);
  } else if (!demoPharm.verified_at) {
    db.prepare(
      "UPDATE pharmacies SET active = 1, licence_no = 'DEMO-PH-0001', pharmacist_name = 'Demo Pharmacist', pharmacist_reg = 'DEMO-RPh-0001', verified_at = ? WHERE id = ?"
    ).run(now, demoPharm.id);
  }
  const secondPharm = db.prepare("SELECT 1 AS x FROM pharmacies WHERE name = 'Demo 24h Pharmacy'").get();
  if (!secondPharm) {
    db.prepare(
      `INSERT INTO pharmacies (id, name, address, city, phone, hours, services, pin_hash, active, licence_no, pharmacist_name, pharmacist_reg, verified_at, verified_by, created_at)
       VALUES ('phm-demo-2', 'Demo 24h Pharmacy', '15 Jalan Contoh, George Town', 'Penang', '04-5550 0200', 'Open 24 hours', ?, ?, 1, 'DEMO-PH-0002', 'Lim Wei', 'DEMO-RPh-0002', ?, 'usr-demo-admin', ?)`
    ).run(JSON.stringify(["24 hours", "Drive-through", "Online ordering"]), hashPassword("654321"), now, now);
  }
  let pharmUser = db.prepare("SELECT * FROM users WHERE email = ?").get("demo.pharmacy@careverified.test");
  if (!pharmUser) {
    pharmUser = createUser({
      id: "usr-demo-pharmacy",
      email: "demo.pharmacy@careverified.test",
      password: DEMO_PASSWORD,
      role: "pharmacy",
      name: "Demo Pharmacy Team",
      profileId: demoPharm.id
    });
    db.prepare("UPDATE users SET pharmacy_owner = 1, must_change_password = 0 WHERE id = ?").run(pharmUser.id);
  } else if (pharmUser.profile_id !== demoPharm.id || pharmUser.must_change_password) {
    db.prepare("UPDATE users SET profile_id = ?, pharmacy_owner = 1, must_change_password = 0 WHERE id = ?").run(demoPharm.id, pharmUser.id);
  }
  const rxCount = db.prepare("SELECT COUNT(*) AS c FROM prescriptions WHERE pharmacy_id = ?").get(demoPharm.id)?.c ?? 0;
  if (rxCount === 0) {
    const validUntil = new Date(Date.now() + 30 * 864e5).toISOString();
    const samples = [
      {
        id: "rx-demo-1",
        code: "DEMORX2001",
        diagnosis: "Seasonal allergic rhinitis",
        items: [{ name: "cetirizine", strength: "10 mg", form: "tablet", dose: "1 tablet", frequency: "once daily", durationDays: 7, quantity: 7, instructions: "At night" }],
        fillStatus: null,
        fillReason: null
      },
      {
        id: "rx-demo-2",
        code: "DEMORX2002",
        diagnosis: "Viral upper respiratory infection",
        items: [{ name: "paracetamol", strength: "500 mg", form: "tablet", dose: "1 tablet", frequency: "every 6 hours if needed", durationDays: 3, quantity: 12, instructions: "After food" }],
        fillStatus: "preparing",
        fillReason: null
      },
      {
        id: "rx-demo-3",
        code: "DEMORX2003",
        diagnosis: "Allergic rhinitis, follow-up",
        items: [{ name: "cetirizine", strength: "10 mg", form: "tablet", dose: "1 tablet", frequency: "once daily", durationDays: 14, quantity: 14, instructions: "In the morning" }],
        fillStatus: "cannot_fill",
        fillReason: "Out of stock until Tuesday"
      }
    ];
    for (const s of samples) {
      const rowObj = {
        id: s.id,
        code: s.code,
        patient_user_id: patUser.id,
        professional_id: docProfile.id,
        issued_at: now,
        valid_until: validUntil,
        diagnosis: s.diagnosis,
        items: JSON.stringify(s.items)
      };
      const signature = sign(rxPayload(rowObj));
      db.prepare(
        `INSERT OR IGNORE INTO prescriptions (id, code, patient_user_id, professional_id, kind, ref_id, items, diagnosis, issued_at, valid_until, status, pharmacy_id, sent_at, fill_status, fill_reason, fill_updated_at, first_response_at, share_safety, signature, record_checked)
         VALUES (?, ?, ?, ?, 'booking', 'bkg-202223', ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, 1, ?, 1)`
      ).run(
        s.id,
        s.code,
        patUser.id,
        docProfile.id,
        rowObj.items,
        s.diagnosis,
        now,
        validUntil,
        demoPharm.id,
        now,
        s.fillStatus,
        s.fillReason,
        s.fillStatus ? now : null,
        s.fillStatus ? now : null,
        signature
      );
    }
  }
}
ensureDemoData();
var persistState = () => saveCollections({ doctors, nurses, verificationRequests, reviews, jobs, bookings, chats, patients, appPackages });
persistState();
app.use("/api", (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400) persistState();
    });
  }
  next();
});
var generateId = (prefix) => `${prefix}-${Math.floor(1e5 + Math.random() * 9e5)}`;
var CONSENT_VERSION = "2026-11";
var EMAIL_RE2 = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var str7 = (v, max = 200) => typeof v === "string" ? v.trim().slice(0, max) : "";
var fail8 = (res, code, message) => res.status(code).json({ status: "error", message });
var publicUser = (u) => ({
  id: u.id,
  role: u.role,
  name: u.name,
  email: u.email,
  avatarUrl: u.avatarUrl ?? void 0,
  profileId: u.profileId
});
var chatIdOf = (u) => u.role === "practitioner" && u.profileId ? u.profileId : u.id;
var allProfessionals = () => [...doctors, ...nurses];
var findProfessional = (id) => allProfessionals().find((p) => p.id === id);
var isOwnerOrAdmin = (u, profileId) => !!u && (u.role === "admin" || u.role === "practitioner" && u.profileId === profileId);
app.post("/api/auth/login", (req, res) => {
  const email = str7(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = ["patient", "practitioner", "admin", "pharmacy"].includes(req.body.role) ? req.body.role : void 0;
  if (!email || !password) return fail8(res, 400, "Please fill in all fields.");
  const result = attemptLogin(req, email, password, role, str7(req.body.code, 12));
  if ("error" in result) return res.status(401).json({ status: "error", message: result.error, needsCode: result.needsCode === true });
  createSession(req, res, result.id);
  audit(req, "auth.login", { actor: result });
  const patient = result.role === "patient" ? patients.find((p) => p.userId === result.id) : void 0;
  res.json({ status: "success", data: { user: publicUser(result), patient } });
});
app.post("/api/auth/demo", (req, res) => {
  const role = ["patient", "practitioner", "admin", "pharmacy"].includes(req.body?.role) ? req.body.role : "patient";
  ensureDemoData();
  const demoEmails = {
    patient: "demo.patient@careverified.test",
    practitioner: "demo.doctor@careverified.test",
    pharmacy: "demo.pharmacy@careverified.test",
    admin: (process.env.ADMIN_EMAIL || "admin@careverified.local").toLowerCase()
  };
  let row5 = db.prepare("SELECT * FROM users WHERE email = ?").get(demoEmails[role]);
  if (!row5 && role === "admin") {
    row5 = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1").get();
  }
  if (!row5) return fail8(res, 404, "Demo account not available.");
  const user = {
    id: row5.id,
    email: row5.email,
    name: row5.name,
    role: row5.role,
    avatarUrl: row5.avatar_url,
    profileId: row5.profile_id
  };
  createSession(req, res, user.id);
  audit(req, "auth.login.demo", { actor: user });
  const patient = user.role === "patient" ? patients.find((p) => p.userId === user.id) : void 0;
  res.json({ status: "success", data: { user: publicUser(user), patient } });
});
app.post("/api/auth/logout", (req, res) => {
  if (req.user) audit(req, "auth.logout");
  destroySession(req, res);
  res.json({ status: "success" });
});
app.get("/api/auth/me", (req, res) => {
  if (!req.user) return fail8(res, 401, "Not signed in.");
  const patient = req.user.role === "patient" ? patients.find((p) => p.userId === req.user.id) : void 0;
  res.json({ status: "success", data: { user: publicUser(req.user), patient } });
});
app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const row5 = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
  if (typeof currentPassword !== "string" || !verifyPassword(currentPassword, row5.password_hash)) {
    return fail8(res, 400, "Current password is incorrect.");
  }
  const problem = passwordProblem(newPassword);
  if (problem) return fail8(res, 400, problem);
  changePassword(req.user.id, newPassword);
  createSession(req, res, req.user.id);
  audit(req, "auth.password.change");
  res.json({ status: "success", message: "Password updated. Other sessions were signed out." });
});
app.post("/api/auth/register-practitioner", (req, res) => {
  const name = str7(req.body.name, 100);
  const email = str7(req.body.email, 254).toLowerCase();
  if (!name || !EMAIL_RE2.test(email)) return fail8(res, 400, "A valid name and email are required.");
  const problem = passwordProblem(req.body.password);
  if (problem) return fail8(res, 400, problem);
  if (req.body.consent !== true) return fail8(res, 400, "You must accept the Terms and Privacy Policy.");
  if (emailTaken(email)) return fail8(res, 409, "An account with this email already exists.");
  const user = createUser({ email, password: req.body.password, role: "practitioner", name, consentVersion: CONSENT_VERSION });
  createSession(req, res, user.id);
  audit(req, "auth.register", { actor: user, target: ["user", user.id] });
  res.status(201).json({ status: "success", data: { user: publicUser(user) } });
});
app.post("/api/register-patient", (req, res) => {
  const {
    password,
    age,
    gender,
    chronicConditions,
    allergies,
    emergencyContactName,
    emergencyContactPhone
  } = req.body;
  const name = str7(req.body.name, 100);
  const email = str7(req.body.email, 254).toLowerCase();
  const icNumber = str7(req.body.icNumber, 30);
  const phone = str7(req.body.phone, 30);
  if (!name || !icNumber || !EMAIL_RE2.test(email)) {
    return fail8(res, 400, "Missing essential patient registration fields.");
  }
  const problem = passwordProblem(password);
  if (problem) return fail8(res, 400, problem);
  if (req.body.consent !== true) return fail8(res, 400, "You must consent to the processing of your health data to register.");
  if (emailTaken(email)) return fail8(res, 409, "A patient with this email already exists.");
  const user = createUser({ email, password, role: "patient", name, consentVersion: CONSENT_VERSION });
  const newPatient = {
    id: generateId("pat"),
    userId: user.id,
    name,
    email,
    icNumber,
    age: Number(age) || 30,
    phone,
    gender: gender || "Male",
    chronicConditions: Array.isArray(chronicConditions) ? chronicConditions.map((c) => str7(c, 100)) : [],
    allergies: Array.isArray(allergies) ? allergies.map((a) => str7(a, 200)) : [],
    emergencyContactName: str7(emergencyContactName, 100),
    emergencyContactPhone: str7(emergencyContactPhone, 30),
    registeredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  patients.push(newPatient);
  seedHealthItems(user.id, newPatient.chronicConditions, newPatient.allergies);
  createSession(req, res, user.id);
  audit(req, "auth.register", { actor: user, target: ["user", user.id] });
  res.status(201).json({
    status: "success",
    message: "Member registered successfully.",
    data: newPatient
  });
});
app.get("/api/me/export", requireAuth, (req, res) => {
  const u = req.user;
  const me = chatIdOf(u);
  const data = {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    account: db.prepare(
      "SELECT id,email,name,role,consent_version AS consentVersion,consent_at AS consentAt,created_at AS createdAt FROM users WHERE id = ?"
    ).get(u.id),
    patientProfile: patients.find((p) => p.userId === u.id) ?? null,
    professionalProfile: u.profileId ? findProfessional(u.profileId) ?? null : null,
    bookings: bookings.filter((b) => b.patientUserId === u.id || u.profileId && b.professionalId === u.profileId),
    messages: chats.filter((m) => m.senderId === me || m.receiverId === me),
    documents: db.prepare("SELECT id,kind,original_name AS originalName,created_at AS createdAt FROM documents WHERE owner_id = ?").all(u.id)
  };
  audit(req, "account.export");
  res.setHeader("Content-Disposition", 'attachment; filename="careverified-my-data.json"');
  res.json(data);
});
app.post("/api/me/deletion-request", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET deletion_requested_at = ? WHERE id = ?").run((/* @__PURE__ */ new Date()).toISOString(), req.user.id);
  audit(req, "account.deletion.requested");
  res.json({ status: "success", message: "Deletion request recorded. Our team will confirm within 30 days." });
});
app.get("/api/admin/audit-log", requireRole("admin"), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const action = typeof req.query.action === "string" ? req.query.action : null;
  const rows5 = action ? db.prepare("SELECT * FROM audit_log WHERE action LIKE ? ORDER BY id DESC LIMIT ?").all(action + "%", limit) : db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit);
  res.json({ status: "success", data: rows5 });
});
app.use("/api/documents", documentsRouter);
var visibleTo = (u) => (p) => p.verificationStatus === "Verified \u2705" /* VERIFIED */ || isOwnerOrAdmin(u, p.id);
app.get("/api/professionals", (req, res) => {
  const { role, city, specialty, search } = req.query;
  let list = allProfessionals().filter(visibleTo(req.user));
  if (role) {
    list = list.filter((p) => p.role === role);
  }
  if (city) {
    list = list.filter((p) => p.city.toLowerCase() === city.toLowerCase());
  }
  if (specialty) {
    list = list.filter((p) => p.specialization.toLowerCase().includes(specialty.toLowerCase()));
  }
  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(term) || p.specialization.toLowerCase().includes(term) || p.bio.toLowerCase().includes(term)
    );
  }
  res.json({ status: "success", data: list });
});
app.get("/api/professionals/:id", (req, res) => {
  const { id } = req.params;
  const prof = allProfessionals().find((p) => (p.id === id || p.seoSlug === id) && visibleTo(req.user)(p));
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Medical professional not found" });
  }
  res.json({ status: "success", data: prof });
});
app.post("/api/register", requireRole("practitioner"), (req, res) => {
  const user = req.user;
  if (user.profileId) return fail8(res, 409, "A professional profile already exists for this account.");
  const role = req.body.role === "nurse" /* NURSE */ ? "nurse" /* NURSE */ : "doctor" /* DOCTOR */;
  const name = str7(req.body.name, 100);
  const specialization = str7(req.body.specialization, 100);
  const licenseNumber = str7(req.body.licenseNumber, 50);
  const medicalCouncil = str7(req.body.medicalCouncil, 100);
  const city = str7(req.body.city, 80);
  const practiceAddress = str7(req.body.practiceAddress, 250);
  const { experienceYears, education, bio, languages, consultationModes, fee, shiftTypes, avatar } = req.body;
  if (!name || !specialization || !licenseNumber || !medicalCouncil || !city) {
    return fail8(res, 400, "Name, specialization, licence number, medical council and city are required.");
  }
  const licenseExpiry = typeof req.body.licenseExpiry === "string" ? req.body.licenseExpiry : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry) || licenseExpiry <= (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
    return fail8(res, 400, "Enter your licence expiry date (it must be in the future).");
  }
  if (allProfessionals().some((p) => p.licenseNumber.toLowerCase() === licenseNumber.toLowerCase())) {
    return fail8(res, 409, "This licence number is already registered.");
  }
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const newId5 = generateId(role === "doctor" /* DOCTOR */ ? "doc" : "nur");
  const seoSlug = `${slug(name)}-${slug(specialization)}-${slug(city)}`;
  const educationList = (Array.isArray(education) ? education : [education]).map((e) => str7(e, 200)).filter(Boolean);
  const safeAvatar = typeof avatar === "string" && avatar.startsWith("/assets/") ? avatar : void 0;
  if (role === "doctor" /* DOCTOR */) {
    doctors.push({
      id: newId5,
      name,
      avatar: safeAvatar || "/assets/malaysian_female_doctor.jpg",
      role: "doctor" /* DOCTOR */,
      specialization,
      licenseNumber,
      licenseExpiry,
      medicalCouncil,
      experienceYears: Number(experienceYears) || 1,
      education: educationList,
      bio: str7(bio, 1e3) || "Licensed medical practitioner.",
      languages: Array.isArray(languages) ? languages.map((l) => str7(l, 40)) : ["English"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["In-person"],
      fee: Math.max(0, Number(fee) || 0),
      rating: 0,
      reviewCount: 0,
      verificationStatus: "Pending" /* PENDING */,
      practiceAddress,
      city,
      availability: {
        days: ["Monday", "Wednesday", "Friday"],
        slots: ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM"]
      },
      seoSlug
    });
  } else {
    nurses.push({
      id: newId5,
      name,
      avatar: safeAvatar || "/assets/malaysian_female_nurse.jpg",
      role: "nurse" /* NURSE */,
      specialization,
      licenseNumber,
      licenseExpiry,
      nursingCouncil: medicalCouncil,
      experienceYears: Number(experienceYears) || 1,
      education: educationList,
      bio: str7(bio, 1e3) || "Licensed care professional.",
      languages: Array.isArray(languages) ? languages.map((l) => str7(l, 40)) : ["English"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["Home Visit"],
      fee: Math.max(0, Number(fee) || 0),
      rating: 0,
      reviewCount: 0,
      verificationStatus: "Pending" /* PENDING */,
      practiceAddress,
      city,
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM - 05:00 PM"]
      },
      seoSlug,
      shiftTypes: Array.isArray(shiftTypes) ? shiftTypes : ["Day Shift"]
    });
  }
  db.prepare("UPDATE users SET profile_id = ? WHERE id = ?").run(newId5, user.id);
  const vReq = {
    id: generateId("ver"),
    userId: newId5,
    accountId: user.id,
    userName: name,
    userType: role,
    licenseNumber,
    medicalCouncil,
    degreeName: educationList[0] || "",
    fileUrl: "",
    submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "Pending" /* PENDING */
  };
  verificationRequests.push(vReq);
  audit(req, "practitioner.submit", { target: ["verification", vReq.id], details: { profileId: newId5 } });
  notifyAdmins("New verification request", `${name} (${role}) submitted credentials for review.`);
  res.status(201).json({
    status: "success",
    message: "Registration submitted. Your profile is pending verification by the medical board.",
    data: { id: newId5, seoSlug, verificationRequestId: vReq.id }
  });
});
app.post("/api/professionals/:id/edit", requireRole("practitioner", "admin"), (req, res) => {
  const { id } = req.params;
  const { bio, fee, practiceAddress, city, availability } = req.body;
  const prof = findProfessional(id);
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Practitioner profile not found." });
  }
  if (!isOwnerOrAdmin(req.user, id)) {
    audit(req, "access.denied", { target: ["professional", id] });
    return fail8(res, 403, "You can only edit your own profile.");
  }
  if (bio !== void 0) prof.bio = str7(bio, 1e3);
  if (fee !== void 0 && Number(fee) >= 0) prof.fee = Number(fee);
  if (practiceAddress !== void 0) prof.practiceAddress = str7(practiceAddress, 250);
  if (city !== void 0) prof.city = str7(city, 80);
  if (availability !== void 0 && Array.isArray(availability?.days) && Array.isArray(availability?.slots)) {
    prof.availability = { days: availability.days.map((d) => str7(d, 20)), slots: availability.slots.map((s) => str7(s, 30)) };
  }
  audit(req, "professional.edit", { target: ["professional", id] });
  res.json({ status: "success", message: "Profile updated successfully.", data: prof });
});
setRequestOwnerLookup((id) => verificationRequests.find((r) => r.id === id)?.accountId ?? null);
registerVerificationRoutes(app, {
  allProfessionals,
  requests: () => verificationRequests,
  bookings: () => bookings,
  persist: persistState
});
var care = registerCareRoutes(app, { findProfessional, allProfessionals });
var clinical2 = registerClinicalRoutes(app, {
  findProfessional,
  getBooking: (id) => bookings.find((b) => b.id === id),
  allBookings: () => bookings,
  completeBooking: (id) => {
    const b = bookings.find((x) => x.id === id);
    if (b && b.status === "Upcoming" && b.paymentStatus === "Paid") {
      b.status = "Completed";
      persistState();
    }
  }
});
var recalcRating = (professionalId) => {
  const live = reviews.filter((r) => r.professionalId === professionalId && r.status !== "hidden");
  const prof = findProfessional(professionalId);
  if (!prof) return;
  prof.rating = live.length ? Number((live.reduce((sum, r) => sum + r.rating, 0) / live.length).toFixed(2)) : 0;
  prof.reviewCount = live.length;
};
registerLiteratureRoutes(app, {
  allBookings: () => bookings,
  isVerifiedPractitioner: (id) => findProfessional(id)?.verificationStatus === "Verified \u2705" /* VERIFIED */,
  libraryArticleIds: () => new Map([...articles.map((a) => [a.id, a.title]), ...approvedLiteratureArticles().map((a) => [a.id, a.title])])
});
registerQualityRoutes(app, { reviews: () => reviews, findProfessional, allProfessionals, bookings: () => bookings, recalcRating, chats: () => chats });
registerPharmacyWorkspace(app, { findProfessional });
setClinicalHooks(clinical2);
registerPaymentRoutes(app);
var UNPAID_HOLD_MS = 15 * 6e4;
setPaymentHandlers({
  resolve: (kind, refId) => {
    if (kind === "consult") return care.resolveConsultPayable(refId);
    if (kind !== "booking") return null;
    const b = bookings.find((x) => x.id === refId);
    if (!b || b.status !== "Upcoming" || b.paymentStatus !== "Pending") return null;
    if (b.holdExpiresAt && Date.parse(b.holdExpiresAt) < Date.now()) return null;
    return {
      kind: "booking",
      id: b.id,
      userId: b.patientUserId,
      professionalId: b.professionalId,
      amount: b.fee,
      description: `Appointment with ${b.professionalName} on ${b.date}, ${b.timeSlot}`
    };
  },
  onPaid: (p) => {
    if (p.kind === "consult") return care.onConsultPaid(p.ref_id);
    const b = bookings.find((x) => x.id === p.ref_id);
    if (!b) return;
    b.paymentStatus = "Paid";
    b.paymentId = p.id;
    delete b.holdExpiresAt;
    const pro = findProfessional(b.professionalId);
    const account = db.prepare("SELECT id FROM users WHERE profile_id = ?").get(b.professionalId);
    if (pro && account) notify(account.id, "New booking", `${b.patientName} booked ${b.date} at ${b.timeSlot}.`);
    persistState();
  },
  onRefunded: (p) => {
    if (p.kind === "consult") {
      care.onConsultRefunded(p.ref_id);
      return;
    }
    const b = bookings.find((x) => x.id === p.ref_id);
    if (b) {
      b.paymentStatus = "Refunded";
      b.status = "Cancelled";
      persistState();
    }
  }
});
setInterval(() => {
  let changed = false;
  for (const b of bookings) {
    if (b.status === "Upcoming" && b.paymentStatus === "Pending" && b.holdExpiresAt && Date.parse(b.holdExpiresAt) < Date.now()) {
      b.status = "Cancelled";
      changed = true;
    }
  }
  if (changed) persistState();
}, 6e4).unref();
var holdsSlot = (b) => b.status !== "Cancelled" && !(b.paymentStatus === "Pending" && b.holdExpiresAt && Date.parse(b.holdExpiresAt) < Date.now());
app.get("/api/bookings", requireAuth, (req, res) => {
  const u = req.user;
  let list = [];
  if (u.role === "admin") list = bookings;
  else if (u.role === "practitioner") list = u.profileId ? bookings.filter((b) => b.professionalId === u.profileId && b.paymentStatus !== "Pending") : [];
  else list = bookings.filter((b) => b.patientUserId === u.id);
  res.json({ status: "success", data: list });
});
app.post("/api/bookings", requireRole("patient"), (req, res) => {
  const { professionalId, patientPhone, mode, symptoms } = req.body;
  const date = str7(req.body.date, 10);
  const timeSlot = str7(req.body.timeSlot, 30);
  if (!professionalId || !date || !timeSlot) {
    return fail8(res, 400, "Missing vital booking parameters.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return fail8(res, 400, "Invalid date.");
  }
  const prof = findProfessional(professionalId);
  if (!prof || prof.verificationStatus !== "Verified \u2705" /* VERIFIED */) {
    return res.status(404).json({ status: "error", message: "Professional not found." });
  }
  if (timeSlot !== "Immediate Emergency Call" && bookings.some((b) => b.professionalId === professionalId && b.date === date && b.timeSlot === timeSlot && holdsSlot(b))) {
    return fail8(res, 409, "That time slot has just been taken. Please choose another.");
  }
  const user = req.user;
  const patient = patients.find((p) => p.userId === user.id);
  const newBooking = {
    id: generateId("bkg"),
    professionalId,
    professionalName: prof.name,
    professionalRole: prof.role,
    patientId: patient?.id ?? user.id,
    patientUserId: user.id,
    patientName: user.name,
    patientPhone: str7(patientPhone, 30) || patient?.phone || "",
    patientEmail: user.email,
    date,
    timeSlot,
    mode: mode || "In-person" /* IN_PERSON */,
    fee: prof.fee,
    // always priced server-side
    paymentStatus: "Pending",
    // becomes "Paid" when the payment provider confirms
    holdExpiresAt: new Date(Date.now() + UNPAID_HOLD_MS).toISOString(),
    // slot is held while the patient pays
    status: "Upcoming",
    symptoms: str7(symptoms, 1e3),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  bookings.push(newBooking);
  if (req.body.shareRecord === true) createGrant(user.id, professionalId, "booking", newBooking.id, 45);
  audit(req, "booking.create", { target: ["booking", newBooking.id], details: { professionalId } });
  res.status(201).json({ status: "success", message: "Appointment booked successfully!", data: newBooking });
});
app.post("/api/bookings/:id/cancel", requireRole("patient"), async (req, res) => {
  const b = bookings.find((x) => x.id === req.params.id && x.patientUserId === req.user.id);
  if (!b) return res.status(404).json({ status: "error", message: "Booking not found." });
  if (b.status !== "Upcoming") return fail8(res, 409, "Only upcoming appointments can be cancelled.");
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const refundable = b.paymentStatus === "Paid" && b.date >= tomorrow;
  b.status = "Cancelled";
  let refunded = false;
  if (refundable && b.paymentId) refunded = (await refundPayment(b.paymentId, "Cancelled by patient", null)).ok;
  audit(req, "booking.cancel", { target: ["booking", b.id], details: { refunded } });
  persistState();
  res.json({
    status: "success",
    data: b,
    refunded,
    message: refunded ? "Cancelled and refunded in full." : b.paymentStatus === "Paid" ? "Cancelled. Appointments less than a day away are not refundable." : "Cancelled."
  });
});
app.get("/api/jobs", (req, res) => {
  const me = req.user?.id;
  res.json({ status: "success", data: jobs.map((j) => ({ ...j, appliedUserIds: me && j.appliedUserIds.includes(me) ? [me] : [] })) });
});
app.post("/api/jobs", requireRole("practitioner", "admin"), (req, res) => {
  const { type, requirements } = req.body;
  const hospitalName = str7(req.body.hospitalName, 120);
  const title = str7(req.body.title, 120);
  const specialtyRequired = str7(req.body.specialtyRequired, 100);
  if (!hospitalName || !title || !specialtyRequired) {
    return res.status(400).json({ status: "error", message: "Missing core job description fields." });
  }
  const newJob = {
    id: generateId("job"),
    postedByUserId: req.user.id,
    hospitalName,
    hospitalLogo: "\u{1F3E5}",
    title,
    type: type || "Full-time",
    location: str7(req.body.location, 120) || "Main Wing",
    city: str7(req.body.city, 80) || "Kuala Lumpur",
    specialtyRequired,
    description: str7(req.body.description, 2e3) || "Join our care team.",
    salaryRange: str7(req.body.salaryRange, 60) || "Negotiable",
    requirements: Array.isArray(requirements) ? requirements.map((r) => str7(r, 200)) : ["Registered and licensed with local medical board"],
    applicantsCount: 0,
    status: "Active",
    postedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appliedUserIds: []
  };
  jobs.push(newJob);
  audit(req, "job.create", { target: ["job", newJob.id] });
  res.status(201).json({ status: "success", message: "Job listing published successfully.", data: newJob });
});
app.post("/api/jobs/:id/apply", requireRole("practitioner"), (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const job = jobs.find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ status: "error", message: "Job post not found." });
  }
  const prof = req.user.profileId ? findProfessional(req.user.profileId) : null;
  if (!prof || prof.verificationStatus !== "Verified \u2705" /* VERIFIED */) {
    return fail8(res, 403, "Only verified practitioners can apply to positions.");
  }
  if (job.appliedUserIds.includes(userId)) {
    return res.status(400).json({ status: "error", message: "You have already applied to this position." });
  }
  job.appliedUserIds.push(userId);
  job.applicantsCount += 1;
  res.json({ status: "success", message: "Application submitted successfully!", data: { ...job, appliedUserIds: [userId] } });
});
app.get("/api/reviews", (req, res) => {
  const { professionalId } = req.query;
  let list = reviews.filter((r) => r.status !== "hidden");
  if (professionalId) {
    list = list.filter((r) => r.professionalId === professionalId);
  }
  res.json({ status: "success", data: list.map(({ reportedAt, reportReason, moderatedBy, moderationReason, ...pub }) => pub) });
});
app.post("/api/reviews", requireRole("patient"), (req, res) => {
  const { professionalId } = req.body;
  const rating = Number(req.body.rating);
  const clamp = (v) => {
    const n = Number(v);
    return n >= 1 && n <= 5 ? n : rating;
  };
  if (!professionalId || !(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ status: "error", message: "Missing or invalid review fields." });
  }
  const user = req.user;
  const reviewedVisits = new Set(reviews.filter((r) => r.patientUserId === user.id).map((r) => `${r.visitKind}:${r.visitId}`));
  const visits = [
    ...bookings.filter((b) => b.patientUserId === user.id && b.professionalId === professionalId && b.status === "Completed" && b.paymentStatus === "Paid").map((b) => ({ kind: "booking", id: b.id })),
    ...db.prepare("SELECT id FROM consults WHERE patient_user_id = ? AND professional_id = ? AND status = 'completed'").all(user.id, professionalId).map((c) => ({ kind: "consult", id: c.id }))
  ].filter((v) => !reviewedVisits.has(`${v.kind}:${v.id}`));
  if (visits.length === 0) {
    return fail8(res, 403, "You can review a practitioner after a completed visit with them.");
  }
  const visit = visits[0];
  const comment = str7(req.body.comment, 1e3);
  const newReview = {
    id: generateId("rev"),
    professionalId,
    patientId: user.id,
    patientUserId: user.id,
    visitKind: visit.kind,
    visitId: visit.id,
    patientName: user.name,
    rating,
    punctuality: clamp(req.body.punctuality),
    communication: clamp(req.body.communication),
    satisfaction: clamp(req.body.satisfaction),
    comment,
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    isVerifiedPatient: true,
    status: "published"
  };
  reviews.push(newReview);
  recalcRating(professionalId);
  res.status(201).json({ status: "success", message: "Review posted successfully.", data: newReview });
});
app.post("/api/reviews/:id/reply", requireRole("practitioner"), (req, res) => {
  const { id } = req.params;
  const rev = reviews.find((r) => r.id === id);
  if (!rev || rev.professionalId !== req.user.profileId) {
    return res.status(404).json({ status: "error", message: "Review not found." });
  }
  rev.replyText = str7(req.body.replyText, 1e3);
  res.json({ status: "success", message: "Reply added to review.", data: rev });
});
app.get("/api/chats", requireRole("patient", "practitioner"), (req, res) => {
  const me = chatIdOf(req.user);
  let list = chats.filter((m) => m.senderId === me || m.receiverId === me);
  const withId = typeof req.query.with === "string" ? req.query.with : null;
  if (withId) list = list.filter((m) => m.senderId === withId || m.receiverId === withId);
  res.json({ status: "success", data: list });
});
app.post("/api/chats", requireRole("patient", "practitioner"), (req, res) => {
  const receiverId = str7(req.body.receiverId, 60);
  const text = str7(req.body.text, 2e3);
  if (!receiverId || !text) {
    return res.status(400).json({ status: "error", message: "Incomplete chat payload." });
  }
  const sender = req.user;
  const recipientAccount = accountForChatId(receiverId);
  if (!recipientAccount) return fail8(res, 404, "Recipient not found.");
  if (isBlocked(recipientAccount, sender.id)) return fail8(res, 403, "This message could not be delivered.");
  const myChatId = chatIdOf(sender);
  const related = sender.role === "patient" ? bookings.some((b) => b.patientUserId === sender.id && b.professionalId === receiverId && b.paymentStatus === "Paid") || !!db.prepare("SELECT 1 AS x FROM consults WHERE patient_user_id = ? AND professional_id = ?").get(sender.id, receiverId) : bookings.some((b) => b.professionalId === sender.profileId && b.patientUserId === receiverId && b.paymentStatus === "Paid") || !!db.prepare("SELECT 1 AS x FROM consults WHERE professional_id = ? AND patient_user_id = ?").get(sender.profileId ?? "", receiverId);
  if (!related && !chats.some((m) => m.senderId === receiverId && m.receiverId === myChatId)) {
    return fail8(res, 403, "You can message practitioners you have booked or consulted.");
  }
  const msg = {
    id: generateId("msg"),
    senderId: chatIdOf(sender),
    senderName: sender.name,
    // identity comes from the session, never the request
    receiverId,
    receiverName: str7(req.body.receiverName, 100),
    text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  chats.push(msg);
  res.status(201).json({ status: "success", data: msg });
});
app.get("/api/articles", (req, res) => {
  res.json({ status: "success", data: [...articles, ...approvedLiteratureArticles()] });
});
app.post("/api/symptom-matching", (req, res) => {
  const { symptoms } = req.body;
  if (!symptoms || typeof symptoms !== "string" || symptoms.length > 2e3) {
    return res.status(400).json({ status: "error", message: "Please specify symptoms to match." });
  }
  const text = symptoms.toLowerCase();
  let recommendation = {
    recommendedSpecialty: "General Physician",
    confidenceScore: 0.85,
    clinicalJustification: "Matched core symptomatic keywords indicating general systemic or standard infection-like symptoms.",
    symptomSeverity: "Medium",
    recommendedAction: "Schedule a teleconsultation or in-person evaluation with a GP for a comprehensive medical checkout."
  };
  if (text.includes("chest") || text.includes("heart") || text.includes("palpitation") || text.includes("cardiac") || text.includes("pulse")) {
    recommendation = {
      recommendedSpecialty: "Cardiologist",
      confidenceScore: 0.95,
      clinicalJustification: "Symptom description contains references to chest discomfort, heavy pounding, or cardiac risk factors, necessitating ECG/lipid screenings.",
      symptomSeverity: "High/Urgent",
      recommendedAction: "Seek urgent cardiological evaluation. If you experience radiating arm pain or severe sweating, visit the nearest ER immediately."
    };
  } else if (text.includes("child") || text.includes("baby") || text.includes("infant") || text.includes("kid") || text.includes("pediatric")) {
    recommendation = {
      recommendedSpecialty: "Pediatrician",
      confidenceScore: 0.92,
      clinicalJustification: "Patient profile or symptom detail refers to pediatric/childhood development age bracket, requiring specialist pediatric dosage and monitoring.",
      symptomSeverity: "Medium",
      recommendedAction: "Book an appointment with a verified pediatrician for customized neonatal/growth-phase checkups."
    };
  } else if (text.includes("headache") || text.includes("migraine") || text.includes("seizure") || text.includes("numb") || text.includes("nerve") || text.includes("tremor")) {
    recommendation = {
      recommendedSpecialty: "Neurologist",
      confidenceScore: 0.9,
      clinicalJustification: "Symptomatology points to localized cranial or neurological pathways such as migraines, peripheral neuropathy, or potential autonomic disruptions.",
      symptomSeverity: "Medium",
      recommendedAction: "Consult a neurologist for detailed clinical reflex mappings or brain imaging if symptoms persist."
    };
  } else if (text.includes("rash") || text.includes("skin") || text.includes("acne") || text.includes("mole") || text.includes("spot") || text.includes("itch")) {
    recommendation = {
      recommendedSpecialty: "Dermatologist",
      confidenceScore: 0.94,
      clinicalJustification: "Primary physical manifestations are cutaneous (skin-based), suggesting allergy outbreaks, acne pathogenesis, or eczema.",
      symptomSeverity: "Low",
      recommendedAction: "Schedule a high-definition video teleconsultation or clinical in-person dermatology checkup."
    };
  } else if (text.includes("breathe") || text.includes("icu") || text.includes("critical") || text.includes("ventilator") || text.includes("oxygen")) {
    recommendation = {
      recommendedSpecialty: "ICU & Critical Care",
      confidenceScore: 0.88,
      clinicalJustification: "High-acuity respiratory distress or life-support status indicates an immediate need for clinical intensive care registered nurse support.",
      symptomSeverity: "High/Urgent",
      recommendedAction: "Procure ICU-trained private care staffing immediately or seek active emergency critical care stabilization."
    };
  }
  const flags = redFlags(symptoms);
  res.json({
    status: "success",
    source: "MedCred Triage Engine",
    data: recommendation,
    emergency: flags.length ? { reasons: flags, numbers: emergencyNumbers() } : null
  });
});
app.get("/api/packages", (req, res) => {
  res.json({ status: "success", data: appPackages });
});
app.post("/api/packages", requireRole("admin"), (req, res) => {
  const { id, name, description, icon, category, version, author, isRemovable } = req.body;
  if (!id || !name || !description) {
    return res.status(400).json({ status: "error", message: "Package ID, Name, and Description are required." });
  }
  if (appPackages.some((pkg) => pkg.id === id)) {
    return res.status(400).json({ status: "error", message: `Package with ID "${id}" is already installed.` });
  }
  const newPkg = {
    id,
    name,
    description,
    icon: icon || "Activity",
    isEnabled: true,
    category: category || "Custom Extension",
    version: version || "1.0.0",
    author: author || "Administrator",
    isRemovable: isRemovable !== void 0 ? isRemovable : true
  };
  appPackages.push(newPkg);
  res.status(201).json({ status: "success", message: `Package "${name}" was successfully added!`, data: newPkg });
});
app.post("/api/packages/:id/toggle", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const pkg = appPackages.find((p) => p.id === id);
  if (!pkg) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }
  pkg.isEnabled = !pkg.isEnabled;
  res.json({ status: "success", message: `Package "${pkg.name}" is now ${pkg.isEnabled ? "enabled" : "disabled"}.`, data: pkg });
});
app.delete("/api/packages/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const idx = appPackages.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }
  const pkg = appPackages[idx];
  if (!pkg.isRemovable) {
    return res.status(400).json({ status: "error", message: `Core package "${pkg.name}" is integrated and cannot be uninstalled.` });
  }
  appPackages.splice(idx, 1);
  res.json({ status: "success", message: `Package "${pkg.name}" was successfully removed.` });
});
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://careverified.pro/</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://careverified.pro/about</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://careverified.pro/jobs</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  const specialties = ["cardiologist", "pediatrician", "neurologist", "dermatologist", "icu-nurse"];
  const cities = ["new-delhi", "mumbai", "bengaluru"];
  specialties.forEach((spec) => {
    cities.forEach((city) => {
      xml += `
  <url>
    <loc>https://careverified.pro/best-${spec}-in-${city}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  });
  [...doctors, ...nurses].filter((p) => p.verificationStatus === "Verified \u2705" /* VERIFIED */).forEach((prof) => {
    xml += `
  <url>
    <loc>https://careverified.pro/doctors/${prof.seoSlug}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });
  xml += `
</urlset>`;
  res.send(xml);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path3.join(process.cwd(), "dist");
    app.use(express2.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MedCred Full-Stack server is actively listening on http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
export {
  server_default as default
};
