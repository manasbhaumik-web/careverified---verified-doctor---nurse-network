// Medical packages are patient products. Publishing and unpublishing is the board's decision; drafts stay private.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let admin: Client, patient: Client, guest: Client;
before(async () => {
  srv = await startTestServer();
  admin = srv.client(); patient = srv.client(); guest = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
});
after(async () => { await srv.stop(); });

const list = async (c: Client, query = '') => (await c.call('GET', `/api/packages${query}`)).data.data as { id: string; status: string; title: string }[];

test('everyone sees published packages, and asking for drafts or "all" does not reveal unpublished ones', async () => {
  const published = await list(guest);
  assert.ok(published.length > 0, 'the demo data has published packages');
  assert.ok(published.every(p => p.status === 'published'));
  for (const q of ['?status=draft', '?status=all']) {
    for (const c of [guest, patient]) {
      assert.ok((await list(c, q)).every(p => p.status === 'published'), `${q} must not reveal drafts to a patient or a visitor`);
    }
  }
});

test('the board can unpublish a package, see it as a draft, and publish it again', async () => {
  const target = (await list(guest))[0];
  const off = await admin.call('POST', `/api/packages/${target.id}/toggle`);
  assert.equal(off.status, 200, JSON.stringify(off.data));

  assert.ok(!(await list(guest)).some(p => p.id === target.id), 'patients no longer see it');
  const all = await list(admin, '?status=all');
  assert.equal(all.find(p => p.id === target.id)?.status, 'draft', 'the board still sees it, as a draft');
  assert.ok((await list(admin, '?status=draft')).some(p => p.id === target.id));

  assert.equal((await admin.call('POST', `/api/packages/${target.id}/toggle`)).status, 200);
  assert.ok((await list(guest)).some(p => p.id === target.id), 'published again');
});

test('only the board or a facility can change a package', async () => {
  const target = (await list(guest))[0];
  assert.equal((await patient.call('POST', `/api/packages/${target.id}/toggle`)).status, 403);
  assert.equal((await guest.call('POST', `/api/packages/${target.id}/toggle`)).status, 401);
});

test('hospital packages are never menu items, and the admin screen does not call them software modules', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /!\(p as any\)\.facility_id/, 'the navbar leaves out packages that belong to a hospital');
  const admin = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
  assert.doesNotMatch(admin, /Cloud Marketplace|Custom Module Compiler|Modular System Runtime|Active navigation endpoints in sidebar/, 'the made-up "module runtime" wording is gone');
});
