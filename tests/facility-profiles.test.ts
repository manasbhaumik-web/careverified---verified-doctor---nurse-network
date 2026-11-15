import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let admin: Client;
before(async () => { srv = await startTestServer({}, { seed: false }); admin = srv.client(); await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'); });
after(async () => { await srv?.stop(); });

const reg = (over: Record<string, unknown> = {}) => ({
  facilityName: 'Lotus Specialist Clinic', kind: 'clinic', city: 'Ipoh', state: 'Perak', contactName: 'Aini Rahman',
  email: 'lotus@example.com', password: 'Passw0rd!ok', consent: true, licenceNo: 'PHFSA-TEST-001', ...over,
});

const publicNames = async (c: Client) => ((await c.call('GET', '/api/tourism/facilities')).data.data as any[]).map(f => f.name);

const png = () => {
  const form = new FormData();
  form.set('kind', 'other');
  form.set('file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], { type: 'image/png' }), 'front.png');
  return form;
};
const uploadDoc = async (c: Client, form: FormData) => {
  const r = await fetch(`${srv.base}/api/documents`, { method: 'POST', headers: { cookie: c.cookie }, body: form });
  return { status: r.status, id: (await r.json())?.data?.id as string };
};

test('registration validates input and starts pending: hidden from the public lists', async () => {
  const c = srv.client();
  assert.equal((await c.call('POST', '/api/auth/register-facility', reg({ licenceNo: '' }))).status, 400, 'licence number required');
  assert.equal((await c.call('POST', '/api/auth/register-facility', reg({ password: 'short' }))).status, 400);
  assert.equal((await c.call('POST', '/api/auth/register-facility', reg({ consent: false }))).status, 400);
  assert.equal((await c.call('POST', '/api/auth/register-facility', reg({ facilityName: '' }))).status, 400);

  const ok = await c.call('POST', '/api/auth/register-facility', reg());
  assert.equal(ok.status, 201);
  assert.equal(ok.data.data.approvalStatus, 'pending');
  assert.equal((await c.call('POST', '/api/auth/register-facility', reg())).status, 409, 'email already used');

  assert.equal((await publicNames(srv.client())).includes('Lotus Specialist Clinic'), false, 'pending facility is not public');
});

test('a pending facility can complete its profile, claim accreditation and attach photos; the board approves it', async () => {
  const owner = srv.client();
  assert.equal((await owner.login('lotus@example.com', 'Passw0rd!ok', 'facility')).status, 200, 'a pending facility can sign in');

  const profile = await owner.call('PUT', '/api/facility/profile', {
    description: 'Family and women health clinic.', phone: '05-5550100', website: 'https://lotus.example.com',
    departments: [{ name: 'Paediatrics' }, { name: 'Women health', description: 'Antenatal and screening' }, { name: '' }],
    services: ['Health screening', 'Vaccination', 'Health screening'],
  });
  assert.equal(profile.status, 200);
  assert.deepEqual(profile.data.data.departments.map((d: any) => d.name), ['Paediatrics', 'Women health']);
  assert.deepEqual(profile.data.data.services, ['Health screening', 'Vaccination']);
  assert.equal((await owner.call('PUT', '/api/facility/profile', { website: 'http://insecure.example.com' })).status, 400);

  const claim = await owner.call('POST', '/api/facility/accreditations', { body: 'MSQH', number: 'MSQH-123', validUntil: '2030-01-01' });
  assert.equal(claim.status, 200);
  assert.equal(claim.data.data[0].status, 'claimed', 'a claim is not a verified accreditation');
  assert.equal((await owner.call('POST', '/api/facility/accreditations', { body: 'MSQH', number: 'X', validUntil: '2020-01-01' })).status, 400);

  const doc = await uploadDoc(owner, png());
  assert.equal(doc.status, 201);
  const pdf = new FormData(); pdf.set('kind', 'other'); pdf.set('file', new Blob(['%PDF-1.4 x'], { type: 'application/pdf' }), 'x.pdf');
  const pdfDoc = await uploadDoc(owner, pdf);
  assert.equal((await owner.call('POST', '/api/facility/photos', { documentId: pdfDoc.id })).status, 400, 'photos must be images');
  const attached = await owner.call('POST', '/api/facility/photos', { documentId: doc.id });
  assert.equal(attached.status, 201);
  const url = attached.data.data[0].url as string;
  assert.equal((await fetch(srv.base + url)).status, 404, 'photo is not public while the facility is pending');

  // the board
  const pending = (await admin.call('GET', '/api/admin/facilities/pending')).data.data as any[];
  const mine = pending.find(f => f.name === 'Lotus Specialist Clinic');
  assert.ok(mine);
  assert.equal((await admin.call('POST', `/api/admin/facilities/${mine.id}/approval`, { decision: 'reject' })).status, 400, 'a reason is needed to reject');
  assert.equal((await admin.call('POST', `/api/admin/facilities/${mine.id}/approval`, { decision: 'approve' })).status, 200);
  assert.equal((await admin.call('POST', `/api/admin/facilities/${mine.id}/approval`, { decision: 'approve' })).status, 409, 'already decided');

  assert.equal((await publicNames(srv.client())).includes('Lotus Specialist Clinic'), true, 'approved facility is public');
  const pub = (await srv.client().call('GET', `/api/tourism/facilities/${mine.id}`)).data.data;
  assert.deepEqual(pub.departments.map((d: any) => d.name), ['Paediatrics', 'Women health']);
  assert.equal((await fetch(srv.base + url)).status, 200, 'photo is public once approved');
  assert.equal((await fetch(`${srv.base}/api/public/facilities/${mine.id}/photos/not-a-photo`)).status, 404);
});

test('staff roles: admin manages staff and profile, staff cannot, and a facility keeps at least one admin', async () => {
  const owner = srv.client();
  await owner.login('lotus@example.com', 'Passw0rd!ok', 'facility');

  assert.equal((await owner.call('POST', '/api/facility/staff', { name: 'X', email: 'bad', staffRole: 'staff' })).status, 400);
  assert.equal((await owner.call('POST', '/api/facility/staff', { name: 'Ben', email: 'ben@example.com', staffRole: 'boss' })).status, 400);
  const added = await owner.call('POST', '/api/facility/staff', { name: 'Ben Tan', email: 'ben@example.com', staffRole: 'staff' });
  assert.equal(added.status, 201);
  const temp = added.data.data.temporaryPassword as string;
  assert.ok(temp && temp.length >= 12);
  assert.equal((await owner.call('POST', '/api/facility/staff', { name: 'Ben Tan', email: 'ben@example.com', staffRole: 'staff' })).status, 409, 'email already used');

  const staff = srv.client();
  assert.equal((await staff.login('ben@example.com', temp, 'facility')).status, 200);
  assert.equal((await staff.call('GET', '/api/facility/profile')).status, 200, 'staff can read the profile');
  assert.equal((await staff.call('PUT', '/api/facility/profile', { description: 'hacked' })).status, 403);
  assert.equal((await staff.call('POST', '/api/facility/staff', { name: 'Eve', email: 'eve@example.com', staffRole: 'admin' })).status, 403);
  assert.equal((await staff.call('POST', '/api/facility/photos', { documentId: 'x' })).status, 403);

  const list = (await owner.call('GET', '/api/facility/staff')).data.data as any[];
  const ownerRow = list.find(s => s.email === 'lotus@example.com'), benRow = list.find(s => s.email === 'ben@example.com');
  assert.equal(ownerRow.staffRole, 'admin');
  assert.equal(benRow.staffRole, 'staff');

  assert.equal((await owner.call('PATCH', `/api/facility/staff/${ownerRow.userId}`, { staffRole: 'staff' })).status, 409, 'cannot demote the only admin');
  assert.equal((await owner.call('DELETE', `/api/facility/staff/${ownerRow.userId}`)).status, 409, 'cannot remove the only admin');
  assert.equal((await owner.call('PATCH', `/api/facility/staff/${benRow.userId}`, { staffRole: 'admin' })).status, 200);
  assert.equal((await staff.call('PUT', '/api/facility/profile', { description: 'Now an admin' })).status, 200);
  assert.equal((await owner.call('DELETE', `/api/facility/staff/${benRow.userId}`)).status, 200);
  assert.notEqual((await srv.client().login('ben@example.com', temp, 'facility')).status, 200, 'removed staff cannot sign in');
});

test('one facility cannot touch another, and other roles cannot use the facility routes', async () => {
  const other = srv.client();
  assert.equal((await other.call('POST', '/api/auth/register-facility', reg({ facilityName: 'Other Clinic', email: 'other@example.com', licenceNo: 'PHFSA-TEST-002' }))).status, 201);
  const otherStaff = (await other.call('GET', '/api/facility/staff')).data.data as any[];
  assert.deepEqual(otherStaff.map(s => s.email), ['other@example.com'], 'only its own staff');

  const anon = srv.client();
  for (const [m, u] of [['GET', '/api/facility/profile'], ['PUT', '/api/facility/profile'], ['GET', '/api/facility/staff'], ['POST', '/api/facility/staff'], ['POST', '/api/facility/photos'], ['GET', '/api/admin/facilities/pending']] as const) {
    assert.equal((await anon.call(m, u, m === 'GET' ? undefined : {})).status, 401, `${m} ${u} needs sign-in`);
  }
  assert.equal((await other.call('GET', '/api/admin/facilities/pending')).status, 403, 'a facility is not a platform admin');
  assert.equal((await other.call('POST', '/api/admin/facilities/anything/approval', { decision: 'approve' })).status, 403);
});
