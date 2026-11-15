import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { applyProblem } from '../server/jobsMy';
import { VerificationStatus } from '../src/types';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const caregiver = (over: Record<string, unknown> = {}) => ({
  role: 'caregiver', verificationStatus: VerificationStatus.VERIFIED, licenseExpiry: inDays(300), registryId: 'CAREGIVER_TIER', verificationScope: 'platform-tier', ...over,
});
const job = (over: Record<string, unknown> = {}) => ({ status: 'Active', roleRequired: 'caregiver', acceptsForeign: false, shifts: [{ date: inDays(10), start: '08:00', end: '16:00' }], ...over });

test('applyProblem: only verified people with a current certificate or licence can apply, and the role must match', () => {
  assert.equal(applyProblem(job(), caregiver()), null);
  assert.match(applyProblem(job(), caregiver({ verificationStatus: VerificationStatus.PENDING }))!, /verified/i);
  assert.match(applyProblem(job(), caregiver({ verificationStatus: VerificationStatus.EXPIRED }))!, /verified/i);
  assert.match(applyProblem(job(), caregiver({ verificationStatus: VerificationStatus.SUSPENDED }))!, /verified/i);
  assert.match(applyProblem(job(), caregiver({ licenseExpiry: inDays(3) }))!, /expires/i, 'expires before the shift');
  assert.match(applyProblem(job({ roleRequired: 'nurse' }), caregiver())!, /nurses/i);
  assert.match(applyProblem(job({ roleRequired: 'doctor' }), caregiver())!, /doctors/i);
  assert.match(applyProblem(job({ roleRequired: 'caregiver' }), caregiver({ role: 'nurse' }))!, /caregivers/i);
  assert.equal(applyProblem(job({ roleRequired: 'any' }), caregiver()), null);
  assert.match(applyProblem(job({ status: 'Closed' }), caregiver())!, /closed/i);
  assert.match(applyProblem(job(), null)!, /verified/i);
});

let srv: TestServer;
let admin: Client, doctor: Client;
before(async () => {
  srv = await startTestServer();
  admin = srv.client(); doctor = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
});
after(async () => { await srv?.stop(); });

const newFacility = async (name: string, email: string) => {
  const c = srv.client();
  const r = await c.call('POST', '/api/auth/register-facility', { facilityName: name, kind: 'clinic', city: 'Ipoh', state: 'Perak', contactName: 'Owner', email, password: 'Passw0rd!ok', consent: true, licenceNo: `LIC-${name.length}` });
  assert.equal(r.status, 201);
  const id = r.data.data.facilityId as string;
  assert.equal((await admin.call('POST', `/api/admin/tourism/facilities/${id}/licence`, { licenceNo: `LIC-${name.length}`, licenceExpiry: inDays(400), reference: 'test register check', confirmed: true })).status, 200);
  assert.equal((await admin.call('POST', `/api/admin/facilities/${id}/approval`, { decision: 'approve' })).status, 200);
  return { c, id };
};

test('facilities post and manage only their own jobs; verified practitioners apply; the confirmed shift appears for them', async () => {
  const a = await newFacility('Alpha Clinic', 'alpha@example.com');
  const b = await newFacility('Beta Clinic Group', 'beta@example.com');

  const body = (facilityId: string) => ({
    hospitalName: 'Alpha Clinic', title: 'Weekend locum doctor', type: 'Locum', sector: 'private', state: 'Perak', city: 'Ipoh', roleRequired: 'doctor',
    specialtyRequired: 'General Practice', facilityId, salaryMin: 90, salaryMax: 110, salaryPeriod: 'hour',
    shifts: [{ date: inDays(10), start: '08:00', end: '16:00' }], description: 'Cover the weekend clinic.', requirements: ['Valid APC'],
  });

  const posted = await a.c.call('POST', '/api/jobs', body(a.id));
  assert.equal(posted.status, 201, JSON.stringify(posted.data));
  const jobId = posted.data.data.id as string;

  assert.equal((await b.c.call('POST', '/api/jobs', body(a.id))).status, 403, 'a facility cannot post for another facility');
  assert.equal((await srv.client().call('POST', '/api/jobs', body(a.id))).status, 401, 'public cannot post');
  assert.equal((await doctor.call('POST', '/api/jobs', body(a.id))).status, 403, 'a practitioner not on the facility staff cannot post for it');

  // an unverified account cannot apply
  const nobody = srv.client();
  assert.equal((await nobody.call('POST', '/api/auth/register-practitioner', { name: 'New Doc', email: 'newdoc@example.com', password: 'Passw0rd!ok', consent: true })).status, 201);
  assert.equal((await nobody.call('POST', `/api/jobs/${jobId}/apply`)).status, 403, 'no verified profile');
  assert.equal((await srv.client().call('POST', `/api/jobs/${jobId}/apply`)).status, 401, 'public cannot apply');

  const apply = await doctor.call('POST', `/api/jobs/${jobId}/apply`);
  assert.equal(apply.status, 200, JSON.stringify(apply.data));
  assert.equal((await doctor.call('POST', `/api/jobs/${jobId}/apply`)).status, 400, 'only once');

  const me = (await doctor.call('GET', '/api/auth/me')).data.data.user;
  assert.equal((await doctor.call('GET', '/api/practitioner/shifts')).data.data.length, 0, 'not confirmed yet');

  assert.equal((await b.c.call('POST', `/api/facility/jobs/${jobId}/applicants/${me.id}/decision`, { decision: 'accepted' })).status, 403, 'another facility cannot decide');
  assert.equal((await doctor.call('POST', `/api/facility/jobs/${jobId}/applicants/${me.id}/decision`, { decision: 'accepted' })).status, 403, 'a practitioner cannot decide');

  const decision = await a.c.call('POST', `/api/facility/jobs/${jobId}/applicants/${me.id}/decision`, { decision: 'accepted', notes: 'See you then' });
  assert.equal(decision.status, 200, JSON.stringify(decision.data));

  const shifts = (await doctor.call('GET', '/api/practitioner/shifts')).data.data as any[];
  assert.equal(shifts.length, 1);
  assert.equal(shifts[0].jobId, jobId);
  assert.equal(shifts[0].date, inDays(10));
  assert.equal((await nobody.call('GET', '/api/practitioner/shifts')).data.data.length, 0, 'other people see none of it');
  assert.equal((await srv.client().call('GET', '/api/practitioner/shifts')).status, 401);
});
