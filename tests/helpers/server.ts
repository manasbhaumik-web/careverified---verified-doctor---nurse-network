// Starts the real app on a free port with a throwaway database, seeds the demo accounts through its API,
// and gives tests a small cookie-keeping HTTP client. Nothing here touches the developer's own data folder.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

export const ADMIN_EMAIL = 'admin@careverified.local';
export const ADMIN_PASSWORD = 'Passw0rd!x';
export const DEMO_PASSWORD = 'DemoPass123';
export const DEMO = { patient: 'demo.patient@careverified.test', doctor: 'demo.doctor@careverified.test' };

export class Client {
  cookie = '';
  constructor(private base: string) {}
  async call(method: string, url: string, body?: unknown): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = { cookie: this.cookie };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const r = await fetch(this.base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    let data: any = null;
    try { data = await r.json(); } catch { /* not JSON */ }
    return { status: r.status, data };
  }
  login(email: string, password: string, role: string) { return this.call('POST', '/api/auth/login', { email, password, role }); }
}

export interface TestServer { base: string; dir: string; client: () => Client; stop: () => Promise<void> }

const freePort = () => new Promise<number>((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
  s.on('error', reject);
});

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function killTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGKILL');
}

export async function startTestServer(extraEnv: Record<string, string> = {}, opts: { seed?: boolean } = {}): Promise<TestServer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medcred-test-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    DATA_DIR: dir, PORT: String(port), ADMIN_EMAIL, ADMIN_PASSWORD,
    // never reach a real payment provider, and use the default telemedicine rules
    STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', TELE_FIRST_VISIT: '', TELE_CROSS_BORDER_RX: '', TELE_EXTRA_RESTRICTED: '',
    NODE_ENV: 'development', ...extraEnv,
  };
  let log = '';
  const child = spawn(process.execPath, [TSX, 'server.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', d => { log += d; });
  child.stderr?.on('data', d => { log += d; });

  const stop = async () => {
    killTree(child);
    await sleep(300);
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* a locked temp file is not a test failure */ }
  };

  try {
    let up = false;
    for (let i = 0; i < 120 && !up; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited early (${child.exitCode}).\n${log}`);
      try { up = (await fetch(base + '/api/on-call/status')).status < 500; } catch { await sleep(500); }
    }
    if (!up) throw new Error(`Server did not start in time.\n${log}`);

    if (opts.seed !== false) {
      const seed = spawnSync(process.execPath, [TSX, 'scripts/seed-demo.ts'], {
        cwd: ROOT, env: { ...env, SEED_BASE_URL: base }, encoding: 'utf8', timeout: 120_000,
      });
      if (seed.status !== 0) throw new Error(`Seeding failed.\n${seed.stdout}\n${seed.stderr}`);
    }
  } catch (e) {
    await stop();
    throw e;
  }
  return { base, dir, client: () => new Client(base), stop };
}
