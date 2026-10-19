// The Medical Packages page: images that exist, honest wording about money, and a sorted, counted list.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startTestServer, type TestServer } from './helpers/server';

let srv: TestServer;
before(async () => { srv = await startTestServer(); });
after(async () => { await srv.stop(); });

const page = fs.readFileSync('src/components/MedicalPackagesModule.tsx', 'utf8');

test('every package image points at a file that exists (no build-hash names)', async () => {
  const list = (await srv.client().call('GET', '/api/packages')).data.data as { image_url?: string }[];
  assert.ok(list.length > 0);
  for (const p of list) {
    if (!p.image_url) continue;
    assert.doesNotMatch(p.image_url, /-[A-Za-z0-9_-]{8}\.(jpg|png)$/, p.image_url);
    assert.ok(fs.existsSync(`public${p.image_url}`), `${p.image_url} should exist in public/`);
  }
});

test('requesting a package takes no payment and is not called "secured" or "paid"', async () => {
  const c = srv.client();
  const pkg = ((await c.call('GET', '/api/packages')).data.data as any[])[0];
  const r = await c.call('POST', `/api/packages/${pkg.id}/reserve-deposit`, { patientName: 'Test Patient', patientEmail: 'p@example.com', patientPhone: '+60123456789' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.match(r.data.data.depositPaymentRef, /^REQ-/);
  assert.match(r.data.message, /No payment has been taken/);
  assert.doesNotMatch(r.data.message, /secured|reserved successfully/i);
});

test('the page does not ask for card details or promise a secured deposit, and offers sort and a count', () => {
  assert.doesNotMatch(page, /Card Number|Security CVC|Pre-Authorized|Deposit Secured|Official Package Reservation Voucher|MMC Compliant|Deposit-Protected/);
  assert.match(page, /No payment is taken/);
  assert.match(page, /Sort by/);
  assert.match(page, /onError=\{\(\) => setFailed\(true\)\}/, 'a missing image falls back to a plain block');
  assert.doesNotMatch(page, /pkg\.verified_facilitator !== 0/, 'a package is not "verified" by default');
});
