import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cleanReferences, missingForApproval, mockEkyc, MIN_REFERENCES } from '../server/caregiverTier';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

const refs = [
  { name: 'Mdm Lim', relationship: 'Former employer', contact: '012-3456789' },
  { name: 'Mr Raj', relationship: 'Family of client', contact: '013-9876543' },
];

test('references are cleaned: incomplete entries dropped, capped at five', () => {
  assert.deepEqual(cleanReferences('nope'), []);
  assert.equal(cleanReferences([{ name: 'A', relationship: 'B' }]).length, 0, 'missing contact');
  assert.equal(cleanReferences(Array.from({ length: 9 }, () => refs[0])).length, 5);
});

test('mock e-KYC is deterministic and never touches the network', async () => {
  assert.equal((await mockEkyc.verify({ fullName: 'Siti A', idNumber: '900101-14-5551' })).status, 'passed');
  assert.equal((await mockEkyc.verify({ fullName: 'Siti A', idNumber: '900101-14-5550' })).status, 'failed');
  assert.equal((await mockEkyc.verify({ fullName: '', idNumber: '900101145551' })).status, 'failed');
  assert.equal((await mockEkyc.verify({ fullName: 'Siti A', idNumber: '123' })).status, 'failed');
});

test('approval needs identity, references and a certificate', () => {
  const ok = { idNumberLast4: '5551', references: refs, ekyc: { status: 'passed' as const, provider: 'x', checkedAt: 'now' } };
  assert.deepEqual(missingForApproval(ok, 1), []);
  assert.equal(missingForApproval(ok, 0).length, 1);
  assert.equal(missingForApproval({ ...ok, references: refs.slice(0, MIN_REFERENCES - 1) }, 1).length, 1);
  assert.equal(missingForApproval({ ...ok, ekyc: { ...ok.ekyc, status: 'failed' as const } }, 1).length, 1);
  assert.equal(missingForApproval(undefined, 0).length, 3);
});

let srv: TestServer;
let admin: Client;
before(async () => { srv = await startTestServer({}, { seed: false }); admin = srv.client(); await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'); });
after(async () => { await srv?.stop(); });

const upload = async (c: Client, requestId: string) => {
  const form = new FormData();
  form.set('kind', 'certificate');
  form.set('verificationRequestId', requestId);
  form.set('file', new Blob(['%PDF-1.4\n%test certificate\n'], { type: 'application/pdf' }), 'certificate.pdf');
  const r = await fetch(`${srv.base}/api/documents`, { method: 'POST', headers: { cookie: c.cookie }, body: form });
  return r.status;
};

const registerAccount = async (email: string) => {
  const c = srv.client();
  const r = await c.call('POST', '/api/auth/register-practitioner', { name: 'Siti Aminah', email, password: 'Passw0rd!ok', consent: true });
  assert.equal(r.status, 201);
  return c;
};

const body = (over: Record<string, unknown> = {}) => ({
  role: 'caregiver', name: 'Siti Aminah', city: 'Kuala Lumpur', specialization: 'Elder care', idNumber: '900101-14-5551',
  certificateExpiry: '2030-12-31', references: refs, ...over,
});

test('caregiver tier end to end: register, incomplete approval refused, then verified and publicly visible', async () => {
  const c = await registerAccount('caregiver1@example.com');

  assert.equal((await c.call('POST', '/api/register', body({ references: refs.slice(0, 1) }))).status, 400, 'two references needed');
  assert.equal((await c.call('POST', '/api/register', body({ certificateExpiry: '2020-01-01' }))).status, 400, 'certificate must be current');
  assert.equal((await c.call('POST', '/api/register', body({ idNumber: '' }))).status, 400);

  const reg = await c.call('POST', '/api/register', body());
  assert.equal(reg.status, 201);
  assert.equal(reg.data.data.ekyc, 'passed');
  const requestId = reg.data.data.verificationRequestId;

  const queue = (await admin.call('GET', '/api/verification-requests')).data.data as any[];
  const item = queue.find(r => r.id === requestId);
  assert.equal(item.userType, 'caregiver');
  assert.equal(item.caregiverChecks.idNumberLast4, '5551');
  assert.equal(JSON.stringify(item).includes('900101-14-5551'), false, 'the full ID number is never stored');

  // no certificate yet
  const early = await admin.call('POST', `/api/verification-requests/${requestId}/decision`, { decision: 'approve' });
  assert.equal(early.status, 400);
  assert.match(early.data.message, /documents|certificate/i);

  assert.equal(await upload(c, requestId), 201);
  const approved = await admin.call('POST', `/api/verification-requests/${requestId}/decision`, { decision: 'approve' });
  assert.equal(approved.status, 200, JSON.stringify(approved.data));

  const anon = srv.client();
  const all = (await anon.call('GET', '/api/public/credentials?q=Siti Aminah')).data.data as any[];
  const found = all.filter(x => x.role === 'caregiver');
  assert.equal(found.length, 1);
  assert.equal(found[0].status, 'verified');
  assert.equal(found[0].role, 'caregiver');
  assert.equal(found[0].registeringBody, 'CareVerified caregiver tier');
  assert.match(found[0].registrationNumber, /^CG-/);
});

test('caregiver whose identity check fails cannot be approved', async () => {
  const c = await registerAccount('caregiver2@example.com');
  const reg = await c.call('POST', '/api/register', body({ name: 'Lee Mei Ling', idNumber: '900101-14-5550' }));
  assert.equal(reg.status, 201);
  assert.equal(reg.data.data.ekyc, 'failed');
  const requestId = reg.data.data.verificationRequestId;
  assert.equal(await upload(c, requestId), 201);
  const r = await admin.call('POST', `/api/verification-requests/${requestId}/decision`, { decision: 'approve' });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /Identity check/);
});
