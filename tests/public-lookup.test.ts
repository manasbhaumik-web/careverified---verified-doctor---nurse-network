import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { presentCredential, badgeTokenFor } from '../server/publicLookup';
import { VerificationStatus } from '../src/types';
import { startTestServer, type Client, type TestServer } from './helpers/server';

const today = new Date('2026-11-16T00:00:00Z');
const ALLOWED = ['badge', 'facility', 'name', 'registeringBody', 'registrationNumber', 'role', 'scope', 'specialty', 'status', 'validFrom', 'validUntil'];

const full = (over: Record<string, unknown> = {}) => ({
  id: 'doc-1', name: 'Dr Test', role: 'doctor', specialization: 'Cardiology', licenseNumber: 'MMC-12345', medicalCouncil: 'Malaysian Medical Council (MMC)',
  verificationStatus: VerificationStatus.VERIFIED, licenseExpiry: '2027-06-30', verifiedAt: '2026-01-05T08:00:00Z', hospitalName: 'Test Hospital',
  // private data that must never come out
  email: 'dr@example.com', phone: '+60123456789', bio: 'private bio', suspensionReason: 'confidential reason', fee: 120, address: '1 Private Road', documents: ['licence.pdf'], notes: 'internal note',
  ...over,
});

test('presentCredential exposes exactly the public fields and no private data', () => {
  const c = presentCredential(full(), today)!;
  assert.deepEqual(Object.keys(c).sort(), ALLOWED);
  const json = JSON.stringify(c);
  for (const secret of ['dr@example.com', '+60123456789', 'private bio', 'confidential reason', '1 Private Road', 'licence.pdf', 'internal note', 'doc-1']) {
    assert.equal(json.includes(secret), false, `leaked ${secret}`);
  }
});

test('presentCredential: shows verified, expiring, expired and suspended; hides pending, rejected and unknown', () => {
  assert.equal(presentCredential(full(), today)!.status, 'verified');
  assert.equal(presentCredential(full({ licenseExpiry: '2026-12-01' }), today)!.status, 'expiring');
  assert.equal(presentCredential(full({ licenseExpiry: '2026-11-01' }), today)!.status, 'expired');
  assert.equal(presentCredential(full({ verificationStatus: VerificationStatus.EXPIRED }), today)!.status, 'expired');
  assert.equal(presentCredential(full({ verificationStatus: VerificationStatus.SUSPENDED }), today)!.status, 'suspended');
  assert.equal(presentCredential(full({ verificationStatus: VerificationStatus.PENDING }), today), null);
  assert.equal(presentCredential(full({ verificationStatus: VerificationStatus.REJECTED }), today), null);
  assert.equal(presentCredential(full({ verificationStatus: undefined }), today), null);
});

test('badge tokens are stable per profile, differ between profiles and do not contain the id', () => {
  const a = badgeTokenFor('doc-1'), b = badgeTokenFor('doc-2');
  assert.equal(a, badgeTokenFor('doc-1'));
  assert.notEqual(a, b);
  assert.equal(a.includes('doc-1'), false);
  assert.match(a, /^cv[A-Za-z0-9_-]{18}$/);
});

let srv: TestServer;
let anon: Client;
// No demo seeding: the lookup is public and only needs the built-in directory.
before(async () => { srv = await startTestServer({}, { seed: false }); anon = srv.client(); });
after(async () => { await srv?.stop(); });

test('public lookup over HTTP needs no login, requires a real query and returns only public fields', async () => {
  assert.equal((await anon.call('GET', '/api/public/credentials?q=ab')).status, 400, 'too short to search');
  assert.equal((await anon.call('GET', '/api/public/credentials')).status, 400);

  const list = (await anon.call('GET', '/api/professionals')).data.data as any[];
  const p = list.find(x => x.verificationStatus === VerificationStatus.VERIFIED && x.licenseNumber);
  assert.ok(p, 'a seeded verified practitioner exists');

  const byNumber = await anon.call('GET', `/api/public/credentials?q=${encodeURIComponent(p.licenseNumber)}`);
  assert.equal(byNumber.status, 200);
  assert.ok(byNumber.data.data.length >= 1);
  for (const c of byNumber.data.data) assert.deepEqual(Object.keys(c).sort(), ALLOWED);

  const byName = await anon.call('GET', `/api/public/credentials?q=${encodeURIComponent(p.name.slice(0, 6))}`);
  assert.ok(byName.data.data.some((c: any) => c.registrationNumber === p.licenseNumber));

  const badge = byNumber.data.data.find((c: any) => c.registrationNumber === p.licenseNumber).badge;
  const viaBadge = await anon.call('GET', `/api/public/credentials/${badge}`);
  assert.equal(viaBadge.data.data.found, true);
  assert.deepEqual(Object.keys(viaBadge.data.data.credential).sort(), ALLOWED);

  const missing = await anon.call('GET', '/api/public/credentials/cvDOESNOTEXIST000000');
  assert.deepEqual(missing.data.data, { found: false });

  const qr = await fetch(`${srv.base}/api/public/credentials/${badge}/qr.svg`);
  assert.equal(qr.status, 200);
  assert.match(qr.headers.get('content-type') ?? '', /svg/);
  assert.equal((await fetch(`${srv.base}/api/public/credentials/cvDOESNOTEXIST000000/qr.svg`)).status, 404);
});

test('legacy licence lookup stays minimal and reports the lifecycle state', async () => {
  const list = (await anon.call('GET', '/api/professionals')).data.data as any[];
  const p = list.find(x => x.verificationStatus === VerificationStatus.VERIFIED && x.licenseNumber);
  const r = (await anon.call('GET', `/api/verify-license/${encodeURIComponent(p.licenseNumber)}`)).data.data;
  assert.equal(r.verified, true);
  assert.ok(['verified', 'expiring'].includes(r.state));
  for (const k of ['email', 'phone', 'bio', 'fee', 'id']) assert.equal(k in r, false, `${k} must not be returned`);
  assert.deepEqual((await anon.call('GET', '/api/verify-license/NO-SUCH-NUMBER')).data.data, { verified: false });
});
