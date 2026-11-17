import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let anon: Client, admin: Client, patient: Client, doctor: Client, other: Client;

const ADDRESS = { line1: '8 Jalan Baru', line2: 'Unit 3', city: 'Petaling Jaya', state: 'Selangor', postcode: '47301', country: 'MY' };

before(async () => {
  srv = await startTestServer();
  anon = srv.client(); admin = srv.client(); patient = srv.client(); doctor = srv.client(); other = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
  const reg = await other.call('POST', '/api/register-patient', {
    name: 'Other Member', email: 'other.member@example.my', password: 'Passw0rd!x', idType: 'nric', icNumber: '900101-14-1234', phone: '012-3456789',
    emergencyContactName: 'Contact', emergencyContactPhone: '012-9876543', consent: true,
    address: { line1: '1 Jalan Test', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur', postcode: '50000', country: 'MY' },
  });
  assert.ok(reg.status === 200 || reg.status === 201, JSON.stringify(reg.data));
});
after(async () => { await srv.stop(); });

test('nobody signed out can read or change a profile', async () => {
  assert.equal((await anon.call('GET', '/api/me/profile')).status, 401);
  assert.equal((await anon.call('PUT', '/api/me/profile', { name: 'X Y' })).status, 401);
  assert.equal((await anon.call('POST', '/api/me/email', { newEmail: 'a@b.my', currentPassword: 'x' })).status, 401);
});

test('a member sees their details with the ID number masked', async () => {
  const r = await patient.call('GET', '/api/me/profile');
  assert.equal(r.status, 200);
  assert.equal(r.data.data.account.email, DEMO.patient);
  assert.equal(r.data.data.account.nameEditable, true);
  assert.match(r.data.data.patient.idNumberMasked, /^••••\d{4}$/);
  assert.equal(JSON.stringify(r.data).includes('icNumber'), false);
});

test('a member can update phone, address, language and contacts; ID details cannot be changed', async () => {
  const before = (await patient.call('GET', '/api/me/profile')).data.data.patient;
  const r = await patient.call('PUT', '/api/me/profile', {
    phone: '012-8887777', address: ADDRESS, preferredLanguage: 'ms', gender: 'Female',
    emergencyContactName: 'Siti Aminah', emergencyContactRelationship: 'Sibling', emergencyContactPhone: '013-2223333',
    nextOfKin: { name: 'Ahmad', relationship: 'Spouse', phone: '014-5556666' },
    icNumber: '000000-00-0000', dateOfBirth: '1900-01-01', nationality: 'XX',
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const after = (await patient.call('GET', '/api/me/profile')).data.data.patient;
  assert.equal(after.phone, '+60128887777');
  assert.equal(after.address.city, 'Petaling Jaya');
  assert.equal(after.preferredLanguage, 'ms');
  assert.equal(after.emergencyContactName, 'Siti Aminah');
  assert.equal(after.nextOfKin.name, 'Ahmad');
  assert.equal(after.idNumberMasked, before.idNumberMasked);
  assert.equal(after.dateOfBirth, before.dateOfBirth);
  assert.equal(after.nationality, before.nationality);
  // The next of kin can be removed
  assert.equal((await patient.call('PUT', '/api/me/profile', { nextOfKin: null })).status, 200);
  assert.equal((await patient.call('GET', '/api/me/profile')).data.data.patient.nextOfKin, null);
});

test('a bad value is refused and nothing else changes', async () => {
  const before = (await patient.call('GET', '/api/me/profile')).data.data.patient;
  const r = await patient.call('PUT', '/api/me/profile', { phone: '012-1112222', address: { ...ADDRESS, postcode: 'ABC' } });
  assert.equal(r.status, 400);
  assert.equal((await patient.call('GET', '/api/me/profile')).data.data.patient.phone, before.phone);
  assert.equal((await patient.call('PUT', '/api/me/profile', { phone: 'not a phone' })).status, 400);
  assert.equal((await patient.call('PUT', '/api/me/profile', { preferredLanguage: 'klingon' })).status, 400);
  assert.equal((await patient.call('PUT', '/api/me/profile', { name: 'A' })).status, 400);
});

test("one member's change never touches another member's details", async () => {
  const otherNow = (await other.call('GET', '/api/me/profile')).data.data.patient;
  assert.equal(otherNow.phone, '+60123456789');
  assert.equal(otherNow.address.city, 'Kuala Lumpur');
});

test('a member can change their display name and the session shows it', async () => {
  assert.equal((await patient.call('PUT', '/api/me/profile', { name: 'Aisyah Binti Rahman' })).status, 200);
  assert.equal((await patient.call('GET', '/api/auth/me')).data.data.user.name, 'Aisyah Binti Rahman');
});

test("a practitioner's name is tied to the licence; their credential status is shown", async () => {
  assert.equal((await doctor.call('PUT', '/api/me/profile', { name: 'Someone Else' })).status, 403);
  const r = await doctor.call('GET', '/api/me/profile');
  assert.equal(r.status, 200);
  assert.equal(r.data.data.account.nameEditable, false);
  assert.ok(r.data.data.professional);
  assert.equal(r.data.data.patient, null);
});

test('accounts without a member profile cannot set member details', async () => {
  assert.equal((await admin.call('PUT', '/api/me/profile', { phone: '012-3334444' })).status, 403);
  assert.equal((await admin.call('PUT', '/api/me/profile', { name: 'Board Chair' })).status, 200);
  assert.equal((await admin.call('GET', '/api/me/profile')).data.data.account.name, 'Board Chair');
});

test('changing the sign-in email needs the current password and a free address', async () => {
  assert.equal((await other.call('POST', '/api/me/email', { newEmail: 'new.member@example.my', currentPassword: 'wrong' })).status, 400);
  assert.equal((await other.call('POST', '/api/me/email', { newEmail: 'not-an-email', currentPassword: 'Passw0rd!x' })).status, 400);
  assert.equal((await other.call('POST', '/api/me/email', { newEmail: DEMO.patient, currentPassword: 'Passw0rd!x' })).status, 409);
  const ok = await other.call('POST', '/api/me/email', { newEmail: 'New.Member@Example.my', currentPassword: 'Passw0rd!x' });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.data.account.email, 'new.member@example.my');
  const fresh = srv.client();
  assert.equal((await fresh.login('new.member@example.my', 'Passw0rd!x', 'patient')).status, 200);
  assert.notEqual((await srv.client().login('other.member@example.my', 'Passw0rd!x', 'patient')).status, 200);
});

test('the password is changed through the existing route, which ends other sessions', async () => {
  const second = srv.client();
  assert.equal((await second.login('new.member@example.my', 'Passw0rd!x', 'patient')).status, 200);
  const r = await other.call('POST', '/api/auth/change-password', { currentPassword: 'Passw0rd!x', newPassword: 'Another#Pass9' });
  assert.equal(r.status, 200);
  assert.equal((await second.call('GET', '/api/me/profile')).status, 401);
  assert.equal((await srv.client().login('new.member@example.my', 'Another#Pass9', 'patient')).status, 200);
});