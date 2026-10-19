// What a visitor can do without an account on the medical-tourism side, tested through the running server:
// browse and filter facilities, read the travel notes, but not send an enquiry or see anyone's case.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let anon: Client, admin: Client;
let demoId = '';

before(async () => {
  srv = await startTestServer();
  anon = srv.client(); admin = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
});
after(async () => { await srv?.stop(); });

test('visitors can list facilities without signing in', async () => {
  const r = await anon.call('GET', '/api/tourism/facilities');
  assert.equal(r.status, 200);
  const demo = (r.data.data as any[]).find(f => f.name === 'Demo Specialist Hospital (demo data)');
  assert.ok(demo, 'the demo seed adds one facility');
  demoId = demo.id;
  assert.deepEqual(demo.accreditations, [], 'no accreditation is shown unless an admin recorded and checked it');
  assert.equal(demo.licenceChecked, false);
});

test('filters work for specialty, language and service', async () => {
  const names = async (qs: string) => ((await anon.call('GET', `/api/tourism/facilities?${qs}`)).data.data as any[]).map(f => f.name);
  // Every active, licensed hospital is listed (including ones that do not take international patients), so check this one by name
  const demo = 'Demo Specialist Hospital (demo data)';
  assert.ok((await names('specialty=cardio')).includes(demo));
  assert.ok((await names('language=arabic')).includes(demo));
  assert.ok((await names('service=prayerRoom')).includes(demo));
  assert.ok(!(await names('service=airportPickup')).includes(demo));
  assert.ok(!(await names('accreditation=JCI')).includes(demo));
  assert.equal((await names('q=nowhere')).length, 0);
});

test('one facility can be opened by id, and an unknown id is 404', async () => {
  assert.equal((await anon.call('GET', `/api/tourism/facilities/${demoId}`)).status, 200);
  assert.equal((await anon.call('GET', '/api/tourism/facilities/fac-nope')).status, 404);
});

test('travel information is public and marked as a draft', async () => {
  const r = await anon.call('GET', '/api/tourism/info');
  assert.equal(r.status, 200);
  assert.equal(r.data.data.draft, true);
  assert.ok(r.data.data.sections.length >= 5);
});

test('a facility an admin switches off disappears from the public list', async () => {
  assert.equal((await admin.call('POST', `/api/admin/tourism/facilities/${demoId}/active`, { active: false })).status, 200);
  const list = (await anon.call('GET', '/api/tourism/facilities')).data.data as any[];
  assert.ok(!list.some(f => f.id === demoId));
  assert.equal((await anon.call('GET', `/api/tourism/facilities/${demoId}`)).status, 404);
});

test('sending an enquiry or reading cases needs an account', async () => {
  const enquiry = await anon.call('POST', '/api/tourism/cases', { facilityId: demoId, summary: 'Knee replacement' });
  assert.ok([401, 403].includes(enquiry.status), `status ${enquiry.status}`);
  assert.ok([401, 403].includes((await anon.call('GET', '/api/tourism/cases')).status));
  assert.ok([401, 403].includes((await anon.call('GET', '/api/tourism/cases/tc-123')).status));
  assert.ok([401, 403].includes((await anon.call('GET', '/api/tourism/desk/cases')).status));
});

test('the admin facility list is not public', async () => {
  assert.ok([401, 403].includes((await anon.call('GET', '/api/admin/tourism/facilities')).status));
});
