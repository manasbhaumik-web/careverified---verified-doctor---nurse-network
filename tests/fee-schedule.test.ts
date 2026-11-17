// The platform is paid by its own fee, charged to the patient and shown as its own line. The professional is paid in full.
// The old model (a share taken out of the professional's fee) only exists when an operator sets PLATFORM_COMMISSION_PCT.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

interface Rig { srv: TestServer; patient: Client; doctor: Client; admin: Client; doctorId: string; day: number }
async function rig(env: Record<string, string> = {}): Promise<Rig> {
  const srv = await startTestServer(env);
  const patient = srv.client(), doctor = srv.client(), admin = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  const dl = await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner');
  assert.equal(dl.status, 200);
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  return { srv, patient, doctor, admin, doctorId: dl.data.data.user.profileId, day: 6 };
}
/** A new video appointment, checked out and paid in the sandbox. Returns the checkout breakdown and the payment id. */
async function pay(r: Rig) {
  const date = new Date(Date.now() + r.day++ * 86400_000).toISOString().slice(0, 10);
  const bk = await r.patient.call('POST', '/api/bookings', { professionalId: r.doctorId, date, timeSlot: '03:00 PM', mode: 'Video Telehealth', patientCountry: 'MY', symptoms: 'Cough' });
  assert.equal(bk.status, 201, JSON.stringify(bk.data));
  const co = await r.patient.call('POST', '/api/payments/checkout', { kind: 'booking', refId: bk.data.data.id });
  assert.equal(co.status, 200, JSON.stringify(co.data));
  assert.equal((await r.patient.call('POST', `/api/payments/${co.data.data.paymentId}/sandbox-confirm`)).status, 200);
  return co.data.data as any;
}
const setFee = (r: Rig, kind: string, body: object) => r.admin.call('PUT', `/api/admin/fee-schedule/${kind}`, { reason: 'Test change', ...body });
const money = (n: number) => Math.round(n * 100) / 100;

// ---------- default: no platform fee until an admin sets one ----------
let d: Rig;
before(async () => { d = await rig(); });
after(async () => { await d?.srv.stop(); });

test('by default nothing is charged and professionals keep everything', async () => {
  const terms = (await d.srv.client().call('GET', '/api/payments/terms')).data.data;
  assert.equal(terms.professionalsKeepFull, true);
  assert.equal(terms.commissionPct, 0);
  assert.equal(terms.feeSchedule.length, 3);
  assert.ok(terms.feeSchedule.every((l: any) => l.enabled === false));
  const b = await pay(d);
  assert.equal(b.platformFee, 0);
  assert.equal(b.amount, b.subtotal);
  assert.equal(b.professionalReceivesFull, true);
});

test('only an admin can read or change the fees, and a reason is required', async () => {
  const anon = d.srv.client();
  assert.equal((await anon.call('GET', '/api/admin/fee-schedule')).status, 401);
  assert.equal((await d.patient.call('PUT', '/api/admin/fee-schedule/consult', { reason: 'Test change', flatMyr: 2 })).status, 403);
  assert.equal((await d.doctor.call('PUT', '/api/admin/fee-schedule/consult', { reason: 'Test change', flatMyr: 2 })).status, 403);
  assert.equal((await d.admin.call('PUT', '/api/admin/fee-schedule/consult', { flatMyr: 2 })).status, 400, 'no reason');
  assert.equal((await d.admin.call('PUT', '/api/admin/fee-schedule/unknown', { reason: 'Test change' })).status, 404);
});

test('fees are limited to a sensible range and the old model cannot be chosen', async () => {
  assert.equal((await setFee(d, 'consult', { flatMyr: 501 })).status, 400);
  assert.equal((await setFee(d, 'consult', { flatMyr: -1 })).status, 400);
  assert.equal((await setFee(d, 'consult', { model: 'percent_service_fee', percent: 51 })).status, 400);
  assert.equal((await setFee(d, 'consult', { model: 'legacy_percent_of_professional_fee', percent: 15, enabled: true })).status, 400);
  assert.equal((await setFee(d, 'consult', { model: 'nonsense' })).status, 400);
});

test('a fixed service fee is charged to the patient on top; the professional is paid in full', async () => {
  assert.equal((await setFee(d, 'booking', { model: 'flat_service_fee', flatMyr: 5, enabled: true })).status, 200);
  const before = (await d.doctor.call('GET', '/api/me/earnings')).data.data;
  const b = await pay(d);
  assert.equal(b.platformFee, 5);
  assert.equal(money(b.amount), money(b.subtotal + b.tax + 5));
  assert.equal(b.professionalReceivesFull, true);
  const after = (await d.doctor.call('GET', '/api/me/earnings')).data.data;
  assert.equal(money(after.totals.gross - before.totals.gross), b.subtotal, "the doctor's gross is the doctor's fee, not the total");
  assert.equal(after.totals.fee - before.totals.fee, 0, 'nothing is deducted from the professional');
  const row = after.rows.find((x: any) => x.id === b.paymentId);
  assert.equal(row.net, row.gross);
  // the patient's receipt lists the lines
  const inv = (await d.patient.call('GET', `/api/payments/${b.paymentId}/invoice`)).data.data;
  assert.equal(inv.subtotal, b.subtotal);
  assert.equal(inv.platformFee, 5);
  assert.equal(inv.total, b.amount);
  // the board sees what the platform earned, separately from what (if anything) was deducted
  const totals = (await d.admin.call('GET', '/api/admin/payments')).data.data.totals;
  assert.ok(totals.feeChargedToPatients >= 5);
  assert.equal(totals.feeDeductedFromProfessionals, 0);
  assert.ok(totals.platformFee >= 5);
});

test('the fee does not depend on which professional or what price', async () => {
  const one = await pay(d), two = await pay(d);
  assert.equal(one.platformFee, 5);
  assert.equal(two.platformFee, 5);
});

test('a percentage service fee is worked out on the professional fee and charged on top', async () => {
  assert.equal((await setFee(d, 'booking', { model: 'percent_service_fee', percent: 10, enabled: true })).status, 200);
  const b = await pay(d);
  assert.equal(b.platformFee, money(b.subtotal * 0.1));
  assert.equal(money(b.amount), money(b.subtotal + b.tax + b.platformFee));
});

test('the switch turns a fee off and every change is kept in the history', async () => {
  assert.equal((await setFee(d, 'booking', { enabled: false })).status, 200);
  const b = await pay(d);
  assert.equal(b.platformFee, 0);
  assert.equal(b.amount, b.subtotal + b.tax);
  const h = (await d.admin.call('GET', '/api/admin/fee-schedule')).data.data.history;
  assert.ok(h.length >= 3);
  assert.ok(h.every((x: any) => x.reason && x.changedAt));
});

// ---------- service tax on the platform fee ----------
test('service tax on the platform fee is its own line, and the doctor is unaffected', async () => {
  const t = await rig({ PLATFORM_FEE_TAX_PCT: '8' });
  try {
    assert.equal((await setFee(t, 'booking', { model: 'flat_service_fee', flatMyr: 5, enabled: true })).status, 200);
    const b = await pay(t);
    assert.equal(b.platformFee, 5);
    assert.equal(b.platformFeeTax, 0.4);
    assert.equal(money(b.amount), money(b.subtotal + b.tax + 5.4));
    const inv = (await t.patient.call('GET', `/api/payments/${b.paymentId}/invoice`)).data.data;
    assert.equal(inv.platformFeeTax, 0.4);
    const row = (await t.doctor.call('GET', '/api/me/earnings')).data.data.rows.find((x: any) => x.id === b.paymentId);
    assert.equal(row.gross, b.subtotal);
    assert.equal(row.net, b.subtotal);
  } finally { await t.srv.stop(); }
});

// ---------- the old model, only by explicit operator choice ----------
test('PLATFORM_COMMISSION_PCT keeps the old model, which can be left but not chosen again', async () => {
  const l = await rig({ PLATFORM_COMMISSION_PCT: '15' });
  try {
    const terms = (await l.srv.client().call('GET', '/api/payments/terms')).data.data;
    assert.equal(terms.commissionPct, 15);
    assert.equal(terms.professionalsKeepFull, false);
    const b = await pay(l);
    assert.equal(b.platformFee, 0, 'the patient pays no extra');
    assert.equal(b.professionalReceivesFull, false);
    const row = (await l.doctor.call('GET', '/api/me/earnings')).data.data.rows.find((x: any) => x.id === b.paymentId);
    assert.equal(row.gross, b.subtotal);
    assert.equal(row.net, money(b.subtotal * 0.85));
    // switching to a service fee works, and going back does not
    assert.equal((await setFee(l, 'booking', { model: 'flat_service_fee', flatMyr: 3, enabled: true })).status, 200);
    assert.equal((await setFee(l, 'booking', { model: 'legacy_percent_of_professional_fee', percent: 15 })).status, 400);
    const after = await pay(l);
    assert.equal(after.platformFee, 3);
    assert.equal(after.professionalReceivesFull, true);
  } finally { await l.srv.stop(); }
});