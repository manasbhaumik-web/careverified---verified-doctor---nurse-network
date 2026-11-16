import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

/**
 * Access matrix for every API route.
 *
 * The routes are found by reading the server source, then each one is called for real:
 *  1. Anonymous: a route must answer 401/403 unless it is on the reviewed public list (tests/fixtures/public-routes.json).
 *     A new route that is open by accident fails here until someone reviews it and adds it to that list on purpose.
 *  2. Roles: for a route guarded with requireRole(...), every signed-in role that is NOT in the list must get 403.
 *
 * To refresh the public list after adding a public route on purpose: UPDATE_RBAC_SNAPSHOT=1 node tsx --test tests/rbac-matrix.test.ts, then review the diff.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'public-routes.json');

interface Route { method: string; path: string; roles: string[] | null; file: string }

const sourceFiles = () => ['server.ts', ...fs.readdirSync(path.join(ROOT, 'server')).filter(f => f.endsWith('.ts')).map(f => `server/${f}`)];
const PREFIX: Record<string, string> = { 'server/documents.ts': '/api/documents' };

function findRoutes(): Route[] {
  const re = /(?:app|documentsRouter)\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]\s*,([^\n]*)/g;
  const out: Route[] = [];
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const full = (PREFIX[file] && !m[2].startsWith('/api') ? PREFIX[file] : '') + (m[2] === '/' && PREFIX[file] ? '' : m[2]);
      if (!full.startsWith('/api/')) continue;
      const rm = /requireRole\(([^)]*)\)/.exec(m[3]);
      out.push({ method: m[1].toUpperCase(), path: full, roles: rm ? [...rm[1].matchAll(/["']([a-z]+)["']/g)].map(x => x[1]) : null, file });
    }
  }
  return out;
}

const concrete = (p: string) => p.replace(/\$\{[^}]*\}/g, 'approve').replace(/:[A-Za-z]+/g, 'x');
const key = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

let srv: TestServer;
let anon: Client;
const clients: Record<string, Client> = {};

before(async () => {
  srv = await startTestServer({ API_RATE_LIMIT: '1000000' }); // the probe makes a few thousand calls
  anon = srv.client();
  const login = async (name: string, email: string, password: string, role: string) => {
    const c = srv.client();
    assert.equal((await c.login(email, password, role)).status, 200, `${name} sign-in`);
    clients[name] = c;
  };
  await login('admin', ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  await login('patient', 'demo.patient@careverified.test', DEMO_PASSWORD, 'patient');
  await login('practitioner', 'demo.doctor@careverified.test', DEMO_PASSWORD, 'practitioner');
  await login('pharmacy', 'demo.pharmacy@careverified.test', DEMO_PASSWORD, 'pharmacy');
  // a facility account made through the real registration flow
  const f = srv.client();
  assert.equal((await f.call('POST', '/api/auth/register-facility', { facilityName: 'Matrix Clinic', kind: 'clinic', contactName: 'M', email: 'matrix@example.com', password: 'Passw0rd!ok', consent: true, licenceNo: 'LIC-M' })).status, 201);
  clients.facility = f;
});
after(async () => { await srv?.stop(); });

const call = (c: Client, r: Route) => c.call(r.method, concrete(r.path), r.method === 'GET' ? undefined : {});

test('every route is closed to anonymous callers unless it is on the reviewed public list', async () => {
  const routes = findRoutes();
  assert.ok(routes.length > 200, `found ${routes.length} routes`);
  const open: string[] = [];
  for (const r of routes) {
    if (r.path === '/api/payments/stripe-webhook') { open.push(key(r)); continue; } // signature-checked, public by nature
    const res = await call(anon, r);
    if (res.status !== 401 && res.status !== 403) open.push(key(r));
  }
  const unique = [...new Set(open)].sort();

  if (process.env.UPDATE_RBAC_SNAPSHOT === '1') {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, JSON.stringify(unique, null, 2) + '\n');
    return;
  }
  const reviewed = new Set<string>(JSON.parse(fs.readFileSync(FIXTURE, 'utf8')));
  const unreviewed = unique.filter(k => !reviewed.has(k));
  assert.deepEqual(unreviewed, [], 'These routes answer anonymous callers. If that is intended, review them and refresh the public list; otherwise protect them.');
});

test('a signed-in role that a route does not allow is refused with 403', async () => {
  // The same path can be registered twice (the first registration that answers wins), so allow the union of the roles of every registration,
  // and skip a path if any registration of it has no role guard.
  const byKey = new Map<string, Route | null>();
  for (const r of findRoutes()) {
    const prev = byKey.get(key(r));
    if (prev === null || !r.roles || !r.roles.length) { byKey.set(key(r), null); continue; }
    byKey.set(key(r), prev ? { ...prev, roles: [...new Set([...prev.roles!, ...r.roles])] } : r);
  }
  const routes = [...byKey.values()].filter((r): r is Route => !!r);
  assert.ok(routes.length > 150, `found ${routes.length} role-guarded routes`);
  const wrong: string[] = [];
  for (const r of routes) {
    for (const [name, c] of Object.entries(clients)) {
      if (r.roles!.includes(name)) continue;
      const res = await call(c, r);
      if (res.status !== 403) wrong.push(`${name} ${key(r)} -> ${res.status}`);
    }
  }
  assert.deepEqual(wrong, []);
});
