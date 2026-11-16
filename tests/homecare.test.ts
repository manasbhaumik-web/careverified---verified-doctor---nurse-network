import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let admin: Client, family: Client, other: Client, cg: Client, cg2: Client, anon: Client;
let cgId = '', cg2Id = '';

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000 + 8 * 3_600_000).toISOString().slice(0, 10);
const db = () => new DatabaseSync(path.join(srv.dir, 'careverified.db'));

const upload = async (c: Client, requestId: string) => {
  const form = new FormData();
  form.set('kind', 'certificate'); form.set('verificationRequestId', requestId);
  form.set('file', new Blob(['%PDF-1.4\n%certificate\n'], { type: 'application/pdf' }), 'cert.pdf');
  return (await fetch(`${srv.base}/api/documents`, { method: 'POST', headers: { cookie: c.cookie }, body: form })).status;
};

/** A verified caregiver with an hourly rate, made through the real registration and approval flow. */
async function makeCaregiver(name: string, email: string, fee: number): Promise<{ client: Client; profileId: string }> {
  const c = srv.client();
  assert.equal((await c.call('POST', '/api/auth/register-practitioner', { name, email, password: 'Passw0rd!ok', consent: true })).status, 201);
  const reg = await c.call('POST', '/api/register', {
    role: 'caregiver', name, city: 'Kuala Lumpur', specialization: 'Elder care', idNumber: '900101-14-5551', certificateExpiry: inDays(400), fee,
    references: [{ name: 'A Ref', relationship: 'Employer', contact: '012-1111111' }, { name: 'B Ref', relationship: 'Family', contact: '012-2222222' }],
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.equal(await upload(c, reg.data.data.verificationRequestId), 201);
  assert.equal((await admin.call('POST', `/api/verification-requests/${reg.data.data.verificationRequestId}/decision`, { decision: 'approve' })).status, 200);
  return { client: c, profileId: reg.data.data.id };
}

before(async () => {
  srv = await startTestServer();
  anon = srv.client(); admin = srv.client(); family = srv.client(); other = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  assert.equal((await family.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  const reg = await other.call('POST', '/api/register-patient', {
    name: 'Other Family', email: 'other.family@example.my', password: 'Passw0rd!x', idType: 'nric', icNumber: '900101-14-1234', phone: '012-3456789',
    emergencyContactName: 'Contact', emergencyContactPhone: '012-9876543', consent: true,
    address: { line1: '1 Jalan Test', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur', postcode: '50000', country: 'MY' },
  });
  assert.ok(reg.status === 200 || reg.status === 201, JSON.stringify(reg.data));
  const a = await makeCaregiver('Aminah Care', 'aminah.care@example.com', 30); cg = a.client; cgId = a.profileId;
  const b = await makeCaregiver('Bee Care', 'bee.care@example.com', 0); cg2 = b.client; cg2Id = b.profileId; // no rate set
});
after(async () => { await srv?.stop(); });

let recipientId = '';
const visit = (over: Record<string, unknown> = {}) => ({ recipientId, caregiverId: cgId, date: inDays(5), startTime: '09:00', hours: 4, note: 'Please bring ID', ...over });

test('recipients: a family keeps its own list and others cannot see or change it', async () => {
  assert.equal((await family.call('POST', '/api/me/care-recipients', { name: '' })).status, 400);
  const add = await family.call('POST', '/api/me/care-recipients', { name: 'Puan Rohani', relationship: 'Mother', birthYear: 1948, address: '12 Jalan Damai', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur', needs: 'Needs help with meals and walking' });
  assert.equal(add.status, 201);
  recipientId = add.data.data.id;
  assert.equal((await family.call('POST', '/api/me/care-recipients', { name: 'X', birthYear: 1800 })).status, 400, 'bad birth year');
  assert.equal((await family.call('GET', '/api/me/care-recipients')).data.data.length, 1);
  assert.deepEqual((await other.call('GET', '/api/me/care-recipients')).data.data, [], 'another family sees nothing');
  assert.equal((await other.call('PUT', `/api/me/care-recipients/${recipientId}`, { name: 'Hijack' })).status, 404);
  assert.equal((await other.call('DELETE', `/api/me/care-recipients/${recipientId}`)).status, 404);
  assert.equal((await family.call('PUT', `/api/me/care-recipients/${recipientId}`, { name: 'Puan Rohani', relationship: 'Mother', address: '12 Jalan Damai', city: 'Kuala Lumpur' })).status, 200);
  assert.equal((await anon.call('GET', '/api/me/care-recipients')).status, 401);
  assert.equal((await cg.call('GET', '/api/me/care-recipients')).status, 403, 'a caregiver has no family list');
});

test('only verified caregivers with an hourly rate are offered', async () => {
  const list = (await family.call('GET', '/api/homecare/caregivers')).data.data as any[];
  const mine = list.find(c => c.id === cgId);
  assert.ok(mine, 'the verified caregiver is listed');
  assert.equal(mine.ratePerHour, 30);
  assert.ok(mine.badge && !('email' in mine) && !('licenseNumber' in mine), 'no private details');
  assert.equal(list.some(c => c.id === cg2Id), false, 'no rate set: not offered');
  const ids = new Set(list.map(c => c.id));
  for (const id of ['p1-cg-22', 'p1-cg-23', 'p1-cg-26']) assert.ok(ids.has(id), `${id}: verified (or expiring but still verified) demo caregiver is offered`);
  for (const id of ['p1-cg-24', 'p1-cg-25']) assert.equal(ids.has(id), false, `${id}: pending or rejected demo caregiver is not offered`);
  assert.equal((await anon.call('GET', '/api/homecare/caregivers')).status, 401);
});

test('request validation: who, when, and whether the caregiver can take it', async () => {
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ hours: 0 }))).status, 400);
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ date: inDays(-2) }))).status, 400, 'in the past');
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ recipientId: 'rec-nope' }))).status, 404, 'unknown person');
  assert.equal((await other.call('POST', '/api/homecare/requests', visit())).status, 404, "someone else's recipient");
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ caregiverId: 'doc-1' }))).status, 404, 'not a caregiver');
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ caregiverId: cg2Id }))).status, 409, 'no hourly rate');
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ date: inDays(500) }))).status, 400, 'too far ahead');
  assert.equal((await cg.call('POST', '/api/homecare/requests', visit())).status, 403, 'a caregiver cannot ask for care');
  assert.equal((await anon.call('POST', '/api/homecare/requests', visit())).status, 401);
});

test('the full path: request, accept, pay, complete with a note, family reads it, caregiver is paid out', async () => {
  const made = await family.call('POST', '/api/homecare/requests', visit());
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const id = made.data.data.id as string;
  assert.equal(made.data.data.status, 'requested');
  assert.equal(made.data.data.total, 120, '30 per hour for 4 hours, priced on the server');
  assert.equal((await family.call('POST', '/api/homecare/requests', visit())).status, 409, 'the same ask twice');

  // the caregiver sees it, without the address yet
  const inbox = (await cg.call('GET', '/api/homecare/requests')).data.data as any[];
  const mine = inbox.find(r => r.id === id)!;
  assert.equal(mine.status, 'requested');
  assert.equal(mine.recipient.name, 'Puan Rohani');
  assert.equal('address' in mine.recipient, false, 'no address before the visit is paid');
  assert.equal((await cg2.call('GET', '/api/homecare/requests')).data.data.length, 0, 'another caregiver sees nothing');
  assert.equal((await other.call('GET', '/api/homecare/requests')).data.data.length, 0, 'another family sees nothing');

  // cannot pay before it is accepted
  assert.equal((await family.call('POST', '/api/payments/checkout', { kind: 'care', refId: id })).status, 404);
  assert.equal((await cg2.call('POST', `/api/homecare/requests/${id}/accept`)).status, 404, 'not their request');
  assert.equal((await family.call('POST', `/api/homecare/requests/${id}/accept`)).status, 403, 'the family cannot accept for the caregiver');
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/accept`)).status, 200);
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/accept`)).status, 409, 'already accepted');

  // a second request that overlaps an accepted visit is refused
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ startTime: '11:00', hours: 2 }))).status, 409, 'the caregiver is already booked');

  const pay = await family.call('POST', '/api/payments/checkout', { kind: 'care', refId: id });
  assert.equal(pay.status, 200, JSON.stringify(pay.data));
  assert.equal(pay.data.data.subtotal, 120);
  assert.equal((await other.call('POST', '/api/payments/checkout', { kind: 'care', refId: id })).status, 404, "someone else's visit cannot be paid");
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/complete`, { note: 'Visit went well, lunch eaten.' })).status, 409, 'not paid yet');
  assert.equal((await family.call('POST', `/api/payments/${pay.data.data.paymentId}/sandbox-confirm`, { method: 'fpx' })).status, 200);

  // paid: confirmed, and the caregiver now sees the address
  const confirmed = ((await cg.call('GET', '/api/homecare/requests')).data.data as any[]).find(r => r.id === id)!;
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.recipient.address, '12 Jalan Damai');
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/complete`, { note: 'Visit went well, lunch eaten.' })).status, 409, 'the visit has not started yet');

  // move the visit to yesterday (the test cannot wait), then complete it
  const d = db(); d.prepare('UPDATE care_visit_requests SET date = ? WHERE id = ?').run(inDays(-1), id); d.close();
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/complete`, { note: 'short' })).status, 400, 'a real note is needed');
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/complete`, { note: 'Visit went well, lunch eaten.' })).status, 200);
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/complete`, { note: 'Visit went well, lunch eaten.' })).status, 409, 'only once');

  const done = ((await family.call('GET', '/api/homecare/requests')).data.data as any[]).find(r => r.id === id)!;
  assert.equal(done.status, 'completed');
  assert.equal(done.visitNote, 'Visit went well, lunch eaten.', 'the family reads the note');
  assert.equal(((await other.call('GET', '/api/homecare/requests')).data.data as any[]).some(r => r.id === id), false);

  // the caregiver's earnings include the visit, waiting out the hold period
  const earnings = (await cg.call('GET', '/api/me/payouts')).data.data;
  const row = (earnings.upcoming as any[]).find(u => /Home care visit/.test(u.description));
  assert.ok(row, JSON.stringify(earnings.upcoming));
  assert.equal(row.state, 'waiting');
});

test('decline needs a reason; the family is told; a declined request is final', async () => {
  const made = await family.call('POST', '/api/homecare/requests', visit({ date: inDays(8) }));
  const id = made.data.data.id as string;
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/decline`, {})).status, 400, 'a reason is needed');
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/decline`, { reason: 'I am away that day' })).status, 200);
  const r = ((await family.call('GET', '/api/homecare/requests')).data.data as any[]).find(x => x.id === id)!;
  assert.equal(r.status, 'declined');
  assert.equal(r.declineReason, 'I am away that day');
  assert.equal((await cg.call('POST', `/api/homecare/requests/${id}/accept`)).status, 409, 'cannot accept after declining');
  const notes = (await family.call('GET', '/api/notifications')).data.data as any[];
  assert.ok(notes.some(n => /declined/i.test(n.title)));
});

test('cancel: before payment, and after payment with a refund when there is enough notice', async () => {
  const a = await family.call('POST', '/api/homecare/requests', visit({ date: inDays(10), startTime: '14:00', hours: 2 }));
  const idA = a.data.data.id as string;
  const early = await family.call('POST', `/api/homecare/requests/${idA}/cancel`);
  assert.equal(early.status, 200);
  assert.equal(early.data.refunded, false);
  assert.equal((await family.call('POST', `/api/homecare/requests/${idA}/cancel`)).status, 409, 'already cancelled');
  assert.equal((await other.call('POST', `/api/homecare/requests/${idA}/cancel`)).status, 404);

  const b = await family.call('POST', '/api/homecare/requests', visit({ date: inDays(12), startTime: '10:00', hours: 3 }));
  const idB = b.data.data.id as string;
  assert.equal((await cg.call('POST', `/api/homecare/requests/${idB}/accept`)).status, 200);
  const pay = (await family.call('POST', '/api/payments/checkout', { kind: 'care', refId: idB })).data.data;
  assert.equal((await family.call('POST', `/api/payments/${pay.paymentId}/sandbox-confirm`, { method: 'fpx' })).status, 200);
  const cancelled = await family.call('POST', `/api/homecare/requests/${idB}/cancel`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.refunded, true, 'a week of notice is refunded in full');
  const r = ((await family.call('GET', '/api/homecare/requests')).data.data as any[]).find(x => x.id === idB)!;
  assert.equal(r.status, 'cancelled');
  // the caregiver's time is free again
  assert.equal((await family.call('POST', '/api/homecare/requests', visit({ date: inDays(12), startTime: '10:00', hours: 3 }))).status, 201);
});

test('requests nobody answers, and accepted visits nobody pays for, expire', async () => {
  const a = await family.call('POST', '/api/homecare/requests', visit({ date: inDays(20), startTime: '09:00', hours: 1 }));
  const b = await family.call('POST', '/api/homecare/requests', visit({ date: inDays(21), startTime: '09:00', hours: 1 }));
  assert.equal((await cg.call('POST', `/api/homecare/requests/${b.data.data.id}/accept`)).status, 200);
  const old = new Date(Date.now() - 49 * 3_600_000).toISOString();
  const d = db();
  d.prepare('UPDATE care_visit_requests SET created_at = ? WHERE id = ?').run(old, a.data.data.id);
  d.prepare('UPDATE care_visit_requests SET accepted_at = ? WHERE id = ?').run(new Date(Date.now() - 25 * 3_600_000).toISOString(), b.data.data.id);
  d.close();
  const list = (await family.call('GET', '/api/homecare/requests')).data.data as any[]; // listing runs the expiry
  assert.equal(list.find(r => r.id === a.data.data.id)!.status, 'expired');
  assert.equal(list.find(r => r.id === b.data.data.id)!.status, 'expired');
  assert.equal((await family.call('POST', '/api/payments/checkout', { kind: 'care', refId: b.data.data.id })).status, 404, 'an expired visit cannot be paid');
});

test('a recipient with an open visit cannot be removed; the board can read every request', async () => {
  const add = await family.call('POST', '/api/me/care-recipients', { name: 'Encik Ali', address: '3 Jalan Aman', city: 'Petaling Jaya' });
  const rid = add.data.data.id as string;
  const made = await family.call('POST', '/api/homecare/requests', visit({ recipientId: rid, date: inDays(30), startTime: '09:00', hours: 2 }));
  assert.equal(made.status, 201);
  assert.equal((await family.call('DELETE', `/api/me/care-recipients/${rid}`)).status, 409);
  assert.equal((await family.call('POST', `/api/homecare/requests/${made.data.data.id}/cancel`)).status, 200);
  assert.equal((await family.call('DELETE', `/api/me/care-recipients/${rid}`)).status, 200);
  const all = (await admin.call('GET', '/api/homecare/requests')).data.data as any[];
  assert.ok(all.length >= 6);
  assert.equal((await srv.client().call('GET', '/api/homecare/requests')).status, 401);
});
