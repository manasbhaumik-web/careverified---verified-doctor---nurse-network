import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "careverified.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

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

// ---- Migration: allow the 'pharmacy' role. SQLite cannot alter a CHECK constraint, so the table is rebuilt once
// (after a file backup). Existing rows, sessions and logins are unchanged. ----
{
  const def = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as { sql?: string } | undefined)?.sql ?? "";
  if (def && !def.includes("'pharmacy'")) {
    const next = def
      .replace(/^CREATE TABLE\s+(IF NOT EXISTS\s+)?["`]?users["`]?/i, "CREATE TABLE users_new")
      .replace("'admin')", "'admin','pharmacy')");
    if (!next.startsWith("CREATE TABLE users_new") || !next.includes("'pharmacy'")) throw new Error("Could not migrate the users table for the pharmacy role.");
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch { /* not in WAL mode */ }
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
      try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
      throw e;
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }
}
// Pharmacy accounts are issued by the board with a temporary password that must be changed.
for (const col of ["must_change_password INTEGER NOT NULL DEFAULT 0", "totp_secret TEXT", "totp_enabled INTEGER NOT NULL DEFAULT 0", "pharmacy_owner INTEGER NOT NULL DEFAULT 0"]) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch { /* column already exists */ }
}

// ---- Generic document collections (professionals, bookings, chats, ...) ----
// Entities are still held as in-memory arrays for speed of iteration and are
// snapshotted to the `records` table after every mutating request.
// Dedicated relational tables for them come in later phases.

export function loadCollection<T extends { id: string }>(name: string, seed: T[]): T[] {
  const rows = db.prepare("SELECT data FROM records WHERE collection = ? AND id <> '__init__'").all(name) as { data: string }[];
  if (rows.length === 0 && !hasCollection(name)) return [...seed];
  return rows.map(r => JSON.parse(r.data) as T);
}

function hasCollection(name: string): boolean {
  const row = db.prepare("SELECT 1 AS x FROM records WHERE collection = ? AND id = '__init__'").get(name);
  return !!row;
}

export function saveCollections(collections: Record<string, { id: string }[]>) {
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
