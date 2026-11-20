// The Vercel demo ships a ready-made database (demo-data/careverified.db). It must be clean, hold the demo content, and be copied into place
// only on Vercel and never over an existing database. See docs/VERCEL_DEMO.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'demo-data', 'careverified.db');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const count = (db: DatabaseSync, sql: string) => (db.prepare(sql).get() as { n: number }).n;

test('the snapshot holds the demo content and nothing personal', () => {
  assert.ok(fs.existsSync(SNAPSHOT), 'run scripts/make-demo-snapshot.ts to create demo-data/careverified.db');
  const db = new DatabaseSync(SNAPSHOT, { readOnly: true });
  try {
    assert.ok(count(db, "SELECT COUNT(*) AS n FROM medical_packages WHERE status = 'published'") >= 1, 'published packages');
    assert.ok(count(db, 'SELECT COUNT(*) AS n FROM tourism_facilities') >= 1, 'facilities');
    assert.ok(count(db, 'SELECT COUNT(*) AS n FROM pharmacies') >= 1, 'pharmacies');
    assert.equal(count(db, 'SELECT COUNT(*) AS n FROM sessions'), 0, 'no one is signed in inside the snapshot');
    // every account is synthetic: demo addresses or the local admin
    const emails = (db.prepare('SELECT email FROM users').all() as { email: string }[]).map(r => r.email);
    assert.ok(emails.length >= 1);
    assert.deepEqual(emails.filter(e => !/@(careverified\.test|careverified\.local)$/.test(e)), []);
    assert.equal((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode, 'delete', 'one file, no write-ahead log');
  } finally { db.close(); }
  assert.equal(fs.existsSync(SNAPSHOT + '-wal'), false);
  assert.equal(fs.existsSync(SNAPSHOT + '-shm'), false);
});

test('the admin password file stays out of git', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.match(ignore, /demo-data\/ADMIN_PASSWORD\.txt/);
});

/** Runs the app's database module the way Vercel would: VERCEL set, no DATA_DIR, an empty temporary folder. */
function runLikeVercel(tmp: string, extra: Record<string, string> = {}) {
  const env: Record<string, string | undefined> = { ...process.env, VERCEL: '1', TEMP: tmp, TMP: tmp, TMPDIR: tmp, ...extra };
  delete env.DATA_DIR;
  const r = spawnSync(process.execPath, [TSX, 'tests/helpers/print-db-counts.ts'], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop()!);
}

test('on Vercel the snapshot is copied into the empty data folder', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medicred-vercel-'));
  try {
    const out = runLikeVercel(tmp);
    assert.ok(out.facilities >= 1 && out.packages >= 1 && out.pharmacies >= 1, JSON.stringify(out));
    assert.ok(fs.existsSync(path.join(tmp, 'medicred-data', 'careverified.db')));
  } finally { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
});

test('an existing database is never overwritten', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medicred-vercel-'));
  try {
    runLikeVercel(tmp); // first start copies the snapshot
    const file = path.join(tmp, 'medicred-data', 'careverified.db');
    const db = new DatabaseSync(file);
    db.exec("DELETE FROM medical_packages"); // someone changes the data
    db.close();
    assert.equal(runLikeVercel(tmp).packages, 0, 'the second start keeps the changed data');
  } finally { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
});

test('off Vercel nothing is copied', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'medicred-novercel-'));
  try {
    const env: Record<string, string | undefined> = { ...process.env, DATA_DIR: tmp };
    delete env.VERCEL;
    const r = spawnSync(process.execPath, [TSX, 'tests/helpers/print-db-counts.ts'], { cwd: ROOT, env, encoding: 'utf8', timeout: 60_000 });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout.trim().split('\n').pop()!).packages, 0, 'a normal start begins empty, as before');
  } finally { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
});