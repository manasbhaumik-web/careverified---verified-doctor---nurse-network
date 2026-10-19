// Saved practitioners are kept on the patient's account, so they follow the patient to any device.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let patient: Client, doctor: Client, ids: string[];
before(async () => {
  srv = await startTestServer();
  patient = srv.client(); doctor = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
  ids = ((await srv.client().call('GET', '/api/professionals')).data.data as { id: string }[]).map(p => p.id);
  assert.ok(ids.length >= 3);
});
after(async () => { await srv.stop(); });

test('a patient starts with nothing saved, and saving and removing is idempotent', async () => {
  assert.deepEqual((await patient.call('GET', '/api/me/saved')).data.data, []);
  assert.deepEqual((await patient.call('PUT', `/api/me/saved/${ids[0]}`)).data.data, [ids[0]]);
  assert.deepEqual((await patient.call('PUT', `/api/me/saved/${ids[0]}`)).data.data, [ids[0]], 'saving twice keeps one copy');
  assert.deepEqual((await patient.call('PUT', `/api/me/saved/${ids[1]}`)).data.data, [ids[0], ids[1]]);
  assert.deepEqual((await patient.call('DELETE', `/api/me/saved/${ids[0]}`)).data.data, [ids[1]]);
  assert.deepEqual((await patient.call('DELETE', `/api/me/saved/${ids[0]}`)).data.data, [ids[1]], 'removing twice is harmless');
});

test('a made-up practitioner cannot be saved', async () => {
  const r = await patient.call('PUT', '/api/me/saved/not-a-real-id');
  assert.equal(r.status, 404);
  assert.ok(!(await patient.call('GET', '/api/me/saved')).data.data.includes('not-a-real-id'));
});

test('bookmarks from the old browser-only store are imported once, keeping only real practitioners', async () => {
  const r = await patient.call('POST', '/api/me/saved/import', { ids: [ids[2], 'ghost-1', ids[1], 42, null] });
  assert.equal(r.status, 200);
  assert.deepEqual([...r.data.data].sort(), [ids[1], ids[2]].sort(), 'ghosts and non-strings are ignored; existing saves are kept');
  const again = await patient.call('POST', '/api/me/saved/import', { ids: [ids[2]] });
  assert.equal(again.data.data.length, 2, 'importing the same ids again adds nothing');
});

test('only a signed-in patient can use it, and each patient sees only their own list', async () => {
  assert.equal((await srv.client().call('GET', '/api/me/saved')).status, 401, 'signed out');
  assert.equal((await doctor.call('GET', '/api/me/saved')).status, 403, 'a practitioner has no saved list');
  assert.equal((await doctor.call('PUT', `/api/me/saved/${ids[0]}`)).status, 403);
  // a second patient starts empty even though the demo patient has saves
  const other = srv.client();
  const reg = await other.call('POST', '/api/register-patient', {
    name: 'Test Patient', email: 'saved.test@example.my', password: 'Passw0rd!x', idType: 'nric', icNumber: '900101-14-1234', phone: '012-3456789',
    emergencyContactName: 'Test Contact', emergencyContactPhone: '012-9876543', consent: true,
    address: { line1: '1 Jalan Test', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur', postcode: '50000', country: 'MY' },
  });
  assert.ok(reg.status === 200 || reg.status === 201, `registering a second patient: ${reg.status} ${JSON.stringify(reg.data)}`);
  assert.deepEqual((await other.call('GET', '/api/me/saved')).data.data, [], 'the second patient does not see the first patient saves');
});
