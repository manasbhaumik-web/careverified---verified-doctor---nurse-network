// "No allergies recorded" and "I have no known allergies" are different statements, and must never be confused.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let patient: Client, doctor: Client;
before(async () => {
  srv = await startTestServer();
  patient = srv.client(); doctor = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
});
after(async () => { await srv.stop(); });

const me = async () => (await patient.call('GET', '/api/records/me')).data.data;
const clearAllergies = async () => {
  for (const i of (await me()).items.filter((x: any) => x.type === 'allergy')) await patient.call('DELETE', `/api/records/items/${i.id}`);
};

test('with no allergies and no statement, the record says nothing: it does not claim "none"', async () => {
  await clearAllergies();
  const d = await me();
  assert.equal(d.items.filter((i: any) => i.type === 'allergy').length, 0);
  assert.equal(d.allergyStatement, null);
});

test('the patient can state they have no known allergies, and can take it back', async () => {
  await clearAllergies();
  assert.equal((await patient.call('POST', '/api/records/allergy-status', {})).status, 201);
  const d = await me();
  assert.equal(d.allergyStatement.kind, 'none_known');
  assert.match(d.allergyStatement.recorded_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal((await patient.call('DELETE', '/api/records/allergy-status')).status, 200);
  assert.equal((await me()).allergyStatement, null);
});

test('the statement cannot be made while an allergy is recorded, and adding an allergy withdraws it', async () => {
  await clearAllergies();
  assert.equal((await patient.call('POST', '/api/records/allergy-status', {})).status, 201);
  assert.equal((await patient.call('POST', '/api/records/items', { type: 'allergy', name: 'Penicillin' })).status, 201);
  assert.equal((await me()).allergyStatement, null, 'a new allergy makes "no known allergies" untrue, so it is removed');
  const again = await patient.call('POST', '/api/records/allergy-status', {});
  assert.equal(again.status, 409, 'cannot say "none" while one is recorded');
});

test('only patients can make the statement', async () => {
  assert.equal((await doctor.call('POST', '/api/records/allergy-status', {})).status, 403);
  assert.equal((await srv.client().call('POST', '/api/records/allergy-status', {})).status, 401);
});

test('the health record pages do not claim encryption or verification they do not have', () => {
  for (const file of ['src/components/PatientRecords.tsx', 'src/components/PatientDashboard.tsx']) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /Encrypted Vault|NKDA · No Known Allergies|EHR Verified<|Continuous physiological telemetry|encrypted under Malaysian PDPA/i, `${file} has an unsupported claim`);
  }
});
