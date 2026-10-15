// Clinics, hospitals and pharmacies can ask to join without an account; only the board can read or change what they send.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { enquiryProblem } from '../server/partners';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

const good = {
  kind: 'pharmacy', orgName: 'Farmasi Sihat', contactName: 'Aisyah Rahman', email: 'aisyah@farmasisihat.example', phone: '012-345 6789',
  city: 'Shah Alam', state: 'Selangor', licenceNo: 'PH-12345', message: 'We would like to join.', consent: true,
};

test('validation: what makes an enquiry acceptable', () => {
  assert.equal(enquiryProblem(good), null);
  assert.equal(enquiryProblem({ ...good, kind: 'clinic' }), null);
  assert.match(enquiryProblem({ ...good, kind: 'hospital' })!, /clinic or pharmacy/);
  assert.match(enquiryProblem({ ...good, orgName: 'A' })!, /name of your/);
  assert.match(enquiryProblem({ ...good, contactName: '' })!, /your name/i);
  assert.match(enquiryProblem({ ...good, email: 'not-an-email' })!, /email/);
  assert.match(enquiryProblem({ ...good, phone: '123' })!, /phone/);
  assert.match(enquiryProblem({ ...good, city: '' })!, /city/);
  assert.match(enquiryProblem({ ...good, state: 'Atlantis' })!, /state/);
  assert.match(enquiryProblem({ ...good, consent: false })!, /agree/);
  assert.match(enquiryProblem({ ...good, consent: 'yes' })!, /agree/, 'consent must be exactly true');
  assert.ok(enquiryProblem(null));
});

let srv: TestServer;
let anon: Client, admin: Client;
let firstId = '';

before(async () => {
  srv = await startTestServer({ PARTNER_ENQUIRY_LIMIT: '100' }, { seed: false });
  anon = srv.client(); admin = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
});
after(async () => { await srv?.stop(); });

test('anyone can send an enquiry, and gets a reference', async () => {
  const r = await anon.call('POST', '/api/partner-enquiries', good);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.match(r.data.data.id, /^ENQ-[0-9A-F]{6}$/);
  firstId = r.data.data.id;
});

test('a bad enquiry is refused with the reason', async () => {
  const r = await anon.call('POST', '/api/partner-enquiries', { ...good, email: 'other@x.example', consent: false });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /agree/);
});

test('the same email cannot send the same kind of enquiry twice in a day', async () => {
  const r = await anon.call('POST', '/api/partner-enquiries', good);
  assert.equal(r.status, 409);
  const other = await anon.call('POST', '/api/partner-enquiries', { ...good, kind: 'clinic', orgName: 'Klinik Sihat' });
  assert.equal(other.status, 201, 'a different kind from the same person is fine');
});

test('a bot that fills the hidden field is told it worked, and nothing is stored', async () => {
  const before = (await admin.call('GET', '/api/admin/partner-enquiries')).data.data.rows.length;
  const r = await anon.call('POST', '/api/partner-enquiries', { ...good, email: 'bot@spam.example', companyWebsite: 'http://spam.example' });
  assert.equal(r.status, 201);
  assert.equal(r.data.data.id, 'ENQ-000000');
  assert.equal((await admin.call('GET', '/api/admin/partner-enquiries')).data.data.rows.length, before);
});

test('only the board can read enquiries', async () => {
  assert.ok([401, 403].includes((await anon.call('GET', '/api/admin/partner-enquiries')).status));
  assert.ok([401, 403].includes((await anon.call('POST', `/api/admin/partner-enquiries/${firstId}/status`, { status: 'contacted' })).status));
  assert.ok([401, 403].includes((await anon.call('DELETE', `/api/admin/partner-enquiries/${firstId}`)).status));
  const list = (await admin.call('GET', '/api/admin/partner-enquiries')).data.data;
  assert.equal(list.counts.new, 2);
  const row = list.rows.find((x: any) => x.id === firstId);
  assert.equal(row.phone, '+60123456789', 'stored in E.164');
  assert.equal(row.email, 'aisyah@farmasisihat.example');
  assert.equal(row.status, 'new');
  assert.ok(row.consent_at, 'the consent time is recorded');
});

test('the board can move an enquiry along, and delete it', async () => {
  assert.equal((await admin.call('POST', `/api/admin/partner-enquiries/${firstId}/status`, { status: 'bogus' })).status, 400);
  assert.equal((await admin.call('POST', '/api/admin/partner-enquiries/ENQ-NOPE/status', { status: 'contacted' })).status, 404);
  assert.equal((await admin.call('POST', `/api/admin/partner-enquiries/${firstId}/status`, { status: 'contacted', note: 'Called on Monday' })).status, 200);
  const one = (await admin.call('GET', '/api/admin/partner-enquiries?status=contacted')).data.data;
  assert.equal(one.rows.length, 1);
  assert.equal(one.rows[0].note, 'Called on Monday');
  assert.equal((await admin.call('DELETE', `/api/admin/partner-enquiries/${firstId}`)).status, 200);
  assert.equal((await admin.call('DELETE', `/api/admin/partner-enquiries/${firstId}`)).status, 404);
  const log = (await admin.call('GET', '/api/admin/audit-log?action=partner.enquiry')).data.data as any[];
  assert.ok(log.some(l => l.action === 'partner.enquiry.create'));
  assert.ok(log.some(l => l.action === 'partner.enquiry.delete'));
  assert.ok(!log.some(l => /aisyah|farmasi/i.test(String(l.details))), 'the audit log holds no contact details');
});

test('the form is rate limited per connection', async () => {
  const limited = await startTestServer({ PARTNER_ENQUIRY_LIMIT: '3' }, { seed: false });
  try {
    const c = limited.client();
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await c.call('POST', '/api/partner-enquiries', { ...good, email: `p${i}@x.example` })).status);
    assert.deepEqual(codes, [201, 201, 201, 429, 429]);
  } finally { await limited.stop(); }
});
