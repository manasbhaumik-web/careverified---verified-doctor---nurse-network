import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let admin: Client, anon: Client;
before(async () => {
  srv = await startTestServer({}, { seed: false });
  admin = srv.client(); anon = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
});
after(async () => { await srv?.stop(); });

test('demo data: 20+ invented practitioners across every verification state', async () => {
  const list = (await admin.call('GET', '/api/admin/practitioners')).data.data as any[];
  const seeded = list.filter(p => String(p.id).startsWith('p1-'));
  assert.ok(seeded.length >= 20, `found ${seeded.length}`);
  assert.ok(seeded.every(p => /DEMO|CG-DEMO/.test(p.licenseNumber)), 'every seeded registration number is marked DEMO');

  const statuses = new Set(seeded.map(p => p.verificationStatus));
  for (const s of ['Pending', 'Rejected', 'Suspended', 'Expired']) assert.ok(statuses.has(s), `has ${s}`);
  assert.ok([...statuses].some(s => String(s).startsWith('Verified')), 'has Verified');
  assert.ok(seeded.some(p => p.flag === 'licence_expiring'), 'has verified profiles that are expiring');

  const queue = (await admin.call('GET', '/api/verification-requests')).data.data as any[];
  assert.ok(queue.some(r => String(r.id).startsWith('ver-p1-') && r.status === 'Info Requested'), 'has a request waiting for more information');
  assert.ok(seeded.some(p => p.id.startsWith('p1-cg-')), 'has caregivers');
  assert.ok(seeded.some(p => p.id.startsWith('p1-nur-')) && seeded.some(p => p.id.startsWith('p1-doc-')));
});

test('demo data: the public lookup shows verified, expiring, expired and suspended, and never pending or rejected', async () => {
  const found = new Set<string>();
  for (const q of ['mmc-p1', 'ljm-p1', 'cg-demo']) {
    for (const c of (await anon.call('GET', `/api/public/credentials?q=${q}`)).data.data as any[]) found.add(c.status);
  }
  for (const s of ['verified', 'expiring', 'expired', 'suspended']) assert.ok(found.has(s), `public lookup shows ${s}`);
  const everyone = (await anon.call('GET', '/api/public/credentials?q=demo')).data.data as any[];
  assert.ok(everyone.every(c => ['verified', 'expiring', 'expired', 'suspended'].includes(c.status)));
});

test('demo data: several facilities (one still pending) and jobs, locum roles and open shifts', async () => {
  const names = ((await anon.call('GET', '/api/tourism/facilities')).data.data as any[]).map(f => f.name);
  const approved = names.filter(n => n.includes('(demo)'));
  assert.ok(approved.length >= 4, `public demo facilities: ${approved.length}`);
  assert.equal(names.some(n => n.includes('Melaka Riverside')), false, 'the pending facility is not public');
  const pending = (await admin.call('GET', '/api/admin/facilities/pending')).data.data as any[];
  assert.ok(pending.some(f => f.name.includes('Melaka Riverside')));

  const jobs = ((await anon.call('GET', '/api/jobs')).data.data as any[]).filter(j => String(j.id).startsWith('job-p1-'));
  assert.ok(jobs.length >= 5);
  assert.ok(jobs.some(j => j.type === 'Full-time'), 'permanent');
  assert.ok(jobs.some(j => j.type === 'Locum' && j.shifts.length > 0), 'locum role');
  assert.ok(jobs.some(j => j.type === 'Shift-based' && j.shifts.length > 1), 'open shifts');
  assert.ok(jobs.some(j => j.roleRequired === 'caregiver'), 'caregiver work');
  assert.ok(jobs.every(j => j.employer?.licenceOk === true), 'every demo employer holds a checked, current licence');
});
