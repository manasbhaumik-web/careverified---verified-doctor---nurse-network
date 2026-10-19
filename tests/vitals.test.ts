// Readings: the date they were taken, the units and ranges the form shows, and the safety flag on each one.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let patient: Client;
before(async () => {
  srv = await startTestServer();
  patient = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
});
after(async () => { await srv.stop(); });

const me = async () => (await patient.call('GET', '/api/records/me')).data.data;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

test('the record says which units and ranges each reading is accepted in', async () => {
  const specs = (await me()).vitalSpecs;
  assert.equal(specs.bp.unit, 'mmHg');
  assert.equal(specs.glucose.unit, 'mmol/L');
  assert.ok(specs.bp.min < specs.bp.max && specs.bp.min2 < specs.bp.max2, 'blood pressure has two ranges');
  assert.equal(specs.weight.unit, 'kg');
});

test('a reading can be dated earlier, and the list keeps them in time order', async () => {
  const older = await patient.call('POST', '/api/records/vitals', { kind: 'heart_rate', value1: 71, takenAt: hoursAgo(30) });
  assert.equal(older.status, 201, JSON.stringify(older.data));
  const newer = await patient.call('POST', '/api/records/vitals', { kind: 'heart_rate', value1: 83, takenAt: hoursAgo(2) });
  assert.equal(newer.status, 201);
  const beats = (await me()).vitals.filter((v: any) => v.kind === 'heart_rate');
  assert.deepEqual(beats.slice(0, 2).map((v: any) => v.value1), [83, 71], 'newest first by the time it was TAKEN, not when it was typed');
  assert.ok(Math.abs(Date.parse(beats[1].ts) - (Date.now() - 30 * 3600_000)) < 5000, 'the stored time is the one the patient gave');
});

test('without a date a reading is stamped now; a future or silly date is refused', async () => {
  const r = await patient.call('POST', '/api/records/vitals', { kind: 'weight', value1: 62.5 });
  assert.equal(r.status, 201);
  const w = (await me()).vitals.find((v: any) => v.kind === 'weight');
  assert.ok(Math.abs(Date.parse(w.ts) - Date.now()) < 10_000);

  assert.equal((await patient.call('POST', '/api/records/vitals', { kind: 'weight', value1: 62, takenAt: new Date(Date.now() + 86400_000).toISOString() })).status, 400, 'future');
  assert.equal((await patient.call('POST', '/api/records/vitals', { kind: 'weight', value1: 62, takenAt: 'last tuesday' })).status, 400, 'not a date');
  assert.equal((await patient.call('POST', '/api/records/vitals', { kind: 'weight', value1: 62, takenAt: '2001-01-01T00:00:00Z' })).status, 400, 'too old');
});

test('every dangerous reading carries its plain-language flag when the record is read back, not only when it is saved', async () => {
  const saved = await patient.call('POST', '/api/records/vitals', { kind: 'bp', value1: 190, value2: 125, takenAt: hoursAgo(1) });
  assert.equal(saved.data.data.flag.level, 'urgent');
  const row = (await me()).vitals.find((v: any) => v.kind === 'bp' && v.value1 === 190);
  assert.equal(row.flag.level, 'urgent', 'the flag is still there on the next visit');
  assert.match(row.flag.text, /999/);
  const calm = await patient.call('POST', '/api/records/vitals', { kind: 'bp', value1: 118, value2: 76, takenAt: hoursAgo(3) });
  assert.equal(calm.data.data.flag, null);
});

test('values outside the accepted range are still refused', async () => {
  assert.equal((await patient.call('POST', '/api/records/vitals', { kind: 'spo2', value1: 140 })).status, 400);
  assert.equal((await patient.call('POST', '/api/records/vitals', { kind: 'nonsense', value1: 1 })).status, 400);
});
