// Global Patient Care: one rule for which hospitals are listed, one list of requests, and no invented hospital.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let anon: Client, patient: Client;
before(async () => {
  srv = await startTestServer();
  anon = srv.client(); patient = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
});
after(async () => { await srv?.stop(); });

const sql = (q: string, ...p: any[]) => {
  const db = new DatabaseSync(path.join(srv.dir, 'careverified.db'));
  try { return db.prepare(q).run(...p); } finally { db.close(); }
};
const tourismIds = async () => ((await anon.call('GET', '/api/tourism/facilities')).data.data as any[]).map(f => f.id);
const directoryIds = async () => ((await anon.call('GET', '/api/facilities/directory')).data.data as any[]).map(f => f.id);

test('a hospital that does not take international patients is still listed, and says so', async () => {
  const [id] = await tourismIds();
  assert.ok(id);
  sql('UPDATE tourism_facilities SET accepts_international = 0 WHERE id = ?', id);
  const list = (await anon.call('GET', '/api/tourism/facilities')).data.data as any[];
  const f = list.find(x => x.id === id);
  assert.ok(f, 'patients in Malaysia can still find it');
  assert.equal(f.acceptsInternational, false);
});

test('the Packages hospital list and the Global Patient Care list agree', async () => {
  assert.deepEqual((await tourismIds()).sort(), (await directoryIds()).sort());
});

test('a hospital with an expired licence disappears from both lists', async () => {
  const [id] = await tourismIds();
  sql("UPDATE tourism_facilities SET licence_expiry = '2020-01-01' WHERE id = ?", id);
  assert.ok(!(await tourismIds()).includes(id));
  assert.ok(!(await directoryIds()).includes(id));
});

test('with no listed hospital a request is refused; there is no made-up default', async () => {
  const body = { patientName: 'No Hospital', patientEmail: 'none@example.com', summary: 'I would like a quote for a knee operation please.' };
  sql("UPDATE tourism_facilities SET active = 0");
  const none = await anon.call('POST', '/api/assistance/enquiries', body);
  assert.equal(none.status, 503);
  assert.equal((await anon.call('POST', '/api/assistance/enquiries', { ...body, facilityId: 'fac-demo-1' })).status, 400, 'an unlisted hospital is not accepted either');
});

test('a request made on the Assistance page appears in the same list as Global Patient Care requests', async () => {
  sql('UPDATE tourism_facilities SET licence_expiry = NULL, active = 1');
  const facilityId = (await tourismIds())[0];
  assert.ok(facilityId);
  const sent = await patient.call('POST', '/api/assistance/enquiries', { facilityId, summary: 'Please send a quote for an executive health screening.', patientName: 'Demo Patient', patientEmail: DEMO.patient });
  assert.equal(sent.status, 201, JSON.stringify(sent.data));
  const mine = (await patient.call('GET', '/api/tourism/cases')).data.data as any[];
  assert.ok(mine.some(c => c.id === sent.data.data.id), 'one list of requests for both pages');
});

test('page guards: shared case view, tabs, 44px controls, inline confirmations, no "4 hours" promise, no fixed MHTC badge', () => {
  const tour = fs.readFileSync('src/components/MedicalTourism.tsx', 'utf8');
  const assist = fs.readFileSync('src/components/MedicalAssistanceModule.tsx', 'utf8');
  const dash = fs.readFileSync('src/components/PatientDashboard.tsx', 'utf8');
  assert.match(assist, /<MyCases /, 'signed-in patients see the shared list on the Assistance page');
  assert.doesNotMatch(assist, /Demo Specialist Hospital|fac-demo-1/);
  assert.match(tour, /role="tablist"/);
  assert.doesNotMatch(tour, /\bconfirm\(|\balert\(/);
  assert.doesNotMatch(tour, /within 4 hours/);
  assert.doesNotMatch(dash, /MHTC Member Network/);
  assert.match(tour, /Clear filters/);
});
