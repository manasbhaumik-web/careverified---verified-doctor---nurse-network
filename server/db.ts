import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import os from "os";
import path from "path";

export const dataDir =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? path.join(os.tmpdir(), "medcred-data") : path.join(process.cwd(), "data"));

try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch {
  // Ignore on read-only filesystems; openDb falls back to :memory:
}

function openDb(): DatabaseSync {
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

export const db = openDb();

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient','practitioner','admin','pharmacy','facility')),
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
CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  applicant_user_id TEXT NOT NULL,
  applicant_name TEXT,
  applicant_role TEXT NOT NULL,
  specialization TEXT,
  license_number TEXT,
  license_expiry TEXT,
  hourly_rate REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TEXT NOT NULL,
  decision_at TEXT,
  decision_by TEXT,
  decision_note TEXT,
  UNIQUE(job_id, applicant_user_id)
);
CREATE INDEX IF NOT EXISTS idx_job_app_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_app_user ON job_applications(applicant_user_id);
`);

try { db.exec("ALTER TABLE job_applications ADD COLUMN decision_by TEXT"); } catch { /* column already exists */ }
for (const col of [
  "clock_in_at TEXT",
  "clock_out_at TEXT",
  "scheduled_hours REAL",
  "actual_hours REAL",
  "timesheet_status TEXT NOT NULL DEFAULT 'unstarted'",
  "supervisor_notes TEXT",
  "approved_by TEXT",
  "approved_at TEXT",
  "total_payout_myr REAL",
]) {
  try { db.exec(`ALTER TABLE job_applications ADD COLUMN ${col}`); } catch { /* column already exists */ }
}

// ---- Phase 3: Facility Coordination Messages & Statutory Documents Vault ----
db.exec(`
CREATE TABLE IF NOT EXISTS facility_messages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  applicant_user_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fac_msg_thread ON facility_messages(job_id, applicant_user_id);

CREATE TABLE IF NOT EXISTS facility_documents (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reference_no TEXT,
  issuer TEXT,
  valid_from TEXT,
  valid_until TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'verified',
  verified_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fac_doc_facility ON facility_documents(facility_id);

-- Phase 4: Batch Financial Reconciliation & Locum Performance Scorecards
CREATE TABLE IF NOT EXISTS facility_payout_batches (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  batch_reference TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  total_amount_myr REAL NOT NULL,
  total_shifts INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  bank_name TEXT,
  disbursed_at TEXT,
  disbursed_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payout_fac ON facility_payout_batches(facility_id);

CREATE TABLE IF NOT EXISTS facility_locum_evaluations (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  applicant_user_id TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_role TEXT NOT NULL,
  punctuality_rating INTEGER NOT NULL DEFAULT 5,
  clinical_skill_rating INTEGER NOT NULL DEFAULT 5,
  documentation_rating INTEGER NOT NULL DEFAULT 5,
  teamwork_rating INTEGER NOT NULL DEFAULT 5,
  overall_score REAL NOT NULL DEFAULT 5.0,
  notes TEXT,
  is_preferred INTEGER NOT NULL DEFAULT 0,
  is_blacklisted INTEGER NOT NULL DEFAULT 0,
  incident_reported INTEGER NOT NULL DEFAULT 0,
  incident_summary TEXT,
  evaluated_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eval_user ON facility_locum_evaluations(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_eval_facility ON facility_locum_evaluations(facility_id);

-- Phase 5: Multi-Staff RBAC and Statutory Incident Governance (Act 586)
CREATE TABLE IF NOT EXISTS facility_team_members (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  invited_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_fac ON facility_team_members(facility_id);

CREATE TABLE IF NOT EXISTS facility_incidents (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  job_id TEXT,
  locum_name TEXT,
  locum_role TEXT,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  department TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  description TEXT NOT NULL,
  immediate_action TEXT,
  root_cause_analysis TEXT,
  kkm_notified INTEGER NOT NULL DEFAULT 0,
  kkm_reference_no TEXT,
  status TEXT NOT NULL DEFAULT 'investigating',
  reported_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incident_fac ON facility_incidents(facility_id);
`);

try { db.exec("ALTER TABLE job_applications ADD COLUMN payout_batch_id TEXT"); } catch { /* column already exists */ }

// ---- Migration: allow the 'pharmacy' and 'facility' roles. ----
{
  const def = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as { sql?: string } | undefined)?.sql ?? "";
  if (def && (!def.includes("'pharmacy'") || !def.includes("'facility'"))) {
    let next = def
      .replace(/^CREATE TABLE\s+(IF NOT EXISTS\s+)?["`]?users["`]?/i, "CREATE TABLE users_fac_new");
    if (!next.includes("'pharmacy'")) {
      next = next.replace("'admin')", "'admin','pharmacy')");
    }
    if (!next.includes("'facility'")) {
      next = next.replace("'pharmacy')", "'pharmacy','facility')").replace("'admin')", "'admin','facility')");
    }
    if (!next.startsWith("CREATE TABLE users_fac_new") || !next.includes("'facility'")) throw new Error("Could not migrate the users table for the facility role.");
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch { /* not in WAL mode */ }
    fs.copyFileSync(path.join(dataDir, "careverified.db"), path.join(dataDir, `careverified.before-facility-role-${Date.now()}.db`));
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec("BEGIN");
      db.exec(next);
      db.exec("INSERT INTO users_fac_new SELECT * FROM users");
      db.exec("DROP TABLE users");
      db.exec("ALTER TABLE users_fac_new RENAME TO users");
      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
      throw e;
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }
}
// Account specific fields
for (const col of ["must_change_password INTEGER NOT NULL DEFAULT 0", "totp_secret TEXT", "totp_enabled INTEGER NOT NULL DEFAULT 0", "pharmacy_owner INTEGER NOT NULL DEFAULT 0", "facility_id TEXT"]) {
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
