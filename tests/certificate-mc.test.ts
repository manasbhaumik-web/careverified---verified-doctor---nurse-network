// The Malaysian Medical Council rule, tested through the running server:
// no medical certificate (MC) after a teleconsultation alone, but in-person visits are unaffected.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MC_AFTER_TELECONSULT_MESSAGE } from '../server/telemedicine';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let patient: Client, doctor: Client, admin: Client;
let inPersonId = '', videoId = '', doctorProfileId = '';
const today = new Date().toISOString().slice(0, 10);
const mcBody = (kind: string, refId: string, extra: object = {}) => ({ kind, refId, fromDate: today, toDate: today, remarks: 'Rest', ...extra });

before(async () => {
  srv = await startTestServer();
  patient = srv.client(); doctor = srv.client(); admin = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  const dl = await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner');
  assert.equal(dl.status, 200);
  doctorProfileId = dl.data.data.user.profileId;
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);

  // the seed leaves a paid in-person booking with the demo doctor (and unrelated ones with other doctors)
  const list = (await patient.call('GET', '/api/bookings')).data.data as any[];
  const inPerson = list.find(b => b.professionalId === doctorProfileId && b.paymentStatus === 'Paid' && b.mode === 'In-person');
  assert.ok(inPerson, 'seed should create a paid in-person booking');
  inPersonId = inPerson.id;

  // a paid video appointment with the same doctor, for a patient in Malaysia
  const date = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
  const bk = await patient.call('POST', '/api/bookings', {
    professionalId: doctorProfileId, date, timeSlot: '03:00 PM', mode: 'Video Telehealth', patientCountry: 'MY', symptoms: 'Sore throat',
  });
  assert.equal(bk.status, 201, JSON.stringify(bk.data));
  videoId = bk.data.data.id;
  const pay = (await patient.call('POST', '/api/payments/checkout', { kind: 'booking', refId: videoId })).data.data;
  assert.equal((await patient.call('POST', `/api/payments/${pay.paymentId}/sandbox-confirm`)).status, 200);
});

after(async () => { await srv?.stop(); });

const certificateCount = () => {
  const db = new DatabaseSync(path.join(srv.dir, 'careverified.db'));
  try { return (db.prepare('SELECT COUNT(*) AS n FROM certificates').get() as any).n as number; } finally { db.close(); }
};

test('MC: signing in is required', async () => {
  const anon = srv.client();
  assert.equal((await anon.call('POST', '/api/certificates', mcBody('booking', videoId))).status, 401);
});

test('MC: a patient cannot issue a certificate', async () => {
  assert.equal((await patient.call('POST', '/api/certificates', mcBody('booking', inPersonId))).status, 403);
});

test('MC: refused after a booked video consultation, with the MMC explanation', async () => {
  const before = certificateCount();
  const r = await doctor.call('POST', '/api/certificates', mcBody('booking', videoId));
  assert.equal(r.status, 403);
  assert.equal(r.data.message, MC_AFTER_TELECONSULT_MESSAGE);
  assert.equal(certificateCount(), before, 'no certificate may be stored');
});

test('MC: the refusal is written to the audit log', async () => {
  const log = (await admin.call('GET', '/api/admin/audit-log?action=certificate.blocked')).data.data as any[];
  const hit = log.find(l => l.target_id === videoId);
  assert.ok(hit, 'certificate.blocked entry for the video booking');
  assert.match(String(hit.details), /teleconsult/);
});

test('MC: refused after an on-demand consultation too', async () => {
  const db = new DatabaseSync(path.join(srv.dir, 'careverified.db'));
  const pat = (db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO.patient) as any).id;
  const pro = (db.prepare('SELECT profile_id AS p FROM users WHERE email = ?').get(DEMO.doctor) as any).p;
  db.prepare("INSERT INTO consults (id,patient_user_id,professional_id,status,mode,symptoms,fee_sen,created_at) VALUES ('c-mc',?,?,'completed','video','cough',5000,?)")
    .run(pat, pro, new Date().toISOString());
  db.close();
  const before = certificateCount();
  const r = await doctor.call('POST', '/api/certificates', mcBody('consult', 'c-mc'));
  assert.equal(r.status, 403);
  assert.equal(r.data.message, MC_AFTER_TELECONSULT_MESSAGE);
  assert.equal(certificateCount(), before);
});

test('MC: the rule also holds for a patient abroad seen by video', async () => {
  const date = new Date(Date.now() + 6 * 86400_000).toISOString().slice(0, 10);
  const bk = await patient.call('POST', '/api/bookings', {
    professionalId: doctorProfileId, date, timeSlot: '04:00 PM', mode: 'Video Telehealth', patientCountry: 'SG', acknowledgeCrossBorder: true, symptoms: 'Cough',
  });
  assert.equal(bk.status, 201, JSON.stringify(bk.data));
  const pay = (await patient.call('POST', '/api/payments/checkout', { kind: 'booking', refId: bk.data.data.id })).data.data;
  await patient.call('POST', `/api/payments/${pay.paymentId}/sandbox-confirm`);
  const r = await doctor.call('POST', '/api/certificates', mcBody('booking', bk.data.data.id));
  assert.equal(r.status, 403);
  assert.equal(r.data.message, MC_AFTER_TELECONSULT_MESSAGE);
});

test('MC: an in-person visit is not affected, and the certificate verifies publicly', async () => {
  const before = certificateCount();
  const r = await doctor.call('POST', '/api/certificates', mcBody('booking', inPersonId));
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(certificateCount(), before + 1);
  const v = await srv.client().call('GET', `/api/verify/cert/${r.data.data.code}`);
  assert.equal(v.data.data.found, true);
  assert.equal(v.data.data.valid, true);
});

test('MC: ordinary validation still applies in person (dates, 14-day limit)', async () => {
  assert.equal((await doctor.call('POST', '/api/certificates', mcBody('booking', inPersonId, { fromDate: '', toDate: '' }))).status, 400);
  const to = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  const r = await doctor.call('POST', '/api/certificates', mcBody('booking', inPersonId, { toDate: to }));
  assert.equal(r.status, 400);
  assert.match(r.data.message, /14 days/);
});

test('MC: a booking that does not belong to the doctor is not found', async () => {
  assert.equal((await doctor.call('POST', '/api/certificates', mcBody('booking', 'bk-does-not-exist'))).status, 404);
});
