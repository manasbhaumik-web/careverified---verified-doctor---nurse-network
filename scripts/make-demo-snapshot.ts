/**
 * Builds demo-data/careverified.db: a clean database with the demo seed applied, for the Vercel demo (see docs/VERCEL_DEMO.md).
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/make-demo-snapshot.ts
 *
 * It starts a throwaway server on an empty data folder, runs scripts/seed-demo.ts against it, stops it, removes anything that belongs to a
 * session or a person's activity, folds the write-ahead log into the one file, and copies that file into the repository. The board
 * (admin) password is random and written to demo-data/ADMIN_PASSWORD.txt, which git ignores. The demo accounts keep the public demo password.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const OUT_DIR = path.join(ROOT, 'demo-data');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise<number>((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
  s.on('error', reject);
});
function killTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medicred-snapshot-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const adminPassword = crypto.randomBytes(18).toString('base64url');
  const env = {
    ...process.env, DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL: 'admin@careverified.local', ADMIN_PASSWORD: adminPassword,
    STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', NODE_ENV: 'development',
  };
  let log = '';
  const child = spawn(process.execPath, [TSX, 'server.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', d => { log += d; });
  child.stderr?.on('data', d => { log += d; });
  try {
    let up = false;
    for (let i = 0; i < 120 && !up; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited early.\n${log}`);
      try { up = (await fetch(base + '/api/on-call/status')).status < 500; } catch { await sleep(500); }
    }
    if (!up) throw new Error(`Server did not start.\n${log}`);
    const seed = spawnSync(process.execPath, [TSX, 'scripts/seed-demo.ts'], { cwd: ROOT, env: { ...env, SEED_BASE_URL: base }, encoding: 'utf8', timeout: 180_000 });
    if (seed.status !== 0) throw new Error(`Seeding failed.\n${seed.stdout}\n${seed.stderr}`);
  } finally {
    killTree(child);
    await sleep(1500);
  }

  // Clean up and fold everything into one file.
  const dbPath = path.join(dir, 'careverified.db');
  const db = new DatabaseSync(dbPath);
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map(t => t.name);
  const wipe = ['sessions', 'password_resets', 'password_reset_tokens', 'login_attempts', 'notifications'];
  for (const t of wipe) if (tables.includes(t)) db.exec(`DELETE FROM ${t}`);
  db.exec("UPDATE users SET failed_logins = 0, locked_until = NULL");
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('VACUUM');
  const counts = Object.fromEntries(['users', 'medical_packages', 'tourism_facilities', 'pharmacies', 'care_recipients'].filter(t => tables.includes(t)).map(t => [t, (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as any).n]));
  db.close();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.copyFileSync(dbPath, path.join(OUT_DIR, 'careverified.db'));
  fs.writeFileSync(path.join(OUT_DIR, 'ADMIN_PASSWORD.txt'), `Board admin sign-in for the demo snapshot (admin@careverified.local).\n${adminPassword}\nKeep this file private. It is ignored by git.\n`);
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  const size = fs.statSync(path.join(OUT_DIR, 'careverified.db')).size;
  console.log(`Wrote demo-data/careverified.db (${(size / 1024).toFixed(0)} KB). Rows: ${JSON.stringify(counts)}`);
  console.log('Board admin password saved to demo-data/ADMIN_PASSWORD.txt (not committed).');
}

main().catch(e => { console.error(e); process.exit(1); });