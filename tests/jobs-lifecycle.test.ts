import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let admin: Client, doctor: Client, anon: Client;

before(async () => {
  srv = await startTestServer();
  anon = srv.client();
  admin = srv.client();
  doctor = srv.client();

  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
});

after(async () => {
  await srv?.stop();
});

test('Job lifecycle: posting, credential eligibility, escrow booking, timesheet, and release', async () => {
  // 1. Fetch open jobs
  const initialJobsRes = await anon.call('GET', '/api/jobs');
  assert.equal(initialJobsRes.status, 200);
  assert.ok(Array.isArray(initialJobsRes.data.data));

  // 2. Admin / Facility posts a new Locum shift
  const postRes = await admin.call('POST', '/api/jobs', {
    hospitalName: 'Gleneagles Hospital Kuala Lumpur',
    title: 'Emergency Medicine Locum Medical Officer',
    type: 'Locum',
    sector: 'private',
    state: 'W.P. Kuala Lumpur',
    city: 'Kuala Lumpur',
    roleRequired: 'doctor',
    specialtyRequired: 'Emergency Medicine',
    facilityId: 'fac-demo-1',
    salaryMin: 90,
    salaryMax: 120,
    salaryPeriod: 'hour',
    shifts: [
      { date: '2026-11-15', start: '08:00', end: '16:00' }
    ],
    description: 'Provide acute clinical triage and emergency care coverage for weekend day shift.',
    requirements: ['MMC Registered Medical Practitioner', 'Valid 2026 APC', 'ACLS Certified']
  });
  assert.equal(postRes.status, 201);
  const jobId = postRes.data.data.id;
  assert.ok(jobId);

  // 3. Practitioner views job and checks eligibility
  const doctorJobsRes = await doctor.call('GET', '/api/jobs');
  assert.equal(doctorJobsRes.status, 200);
  const myJob = doctorJobsRes.data.data.find((j: any) => j.id === jobId);
  assert.ok(myJob);
  // Demo doctor is verified with valid APC, so applyBlockedReason should be null
  assert.equal(myJob.applyBlockedReason, null);

  // 4. Practitioner applies for the shift
  const applyRes = await doctor.call('POST', `/api/jobs/${jobId}/apply`);
  assert.equal(applyRes.status, 200);
  assert.equal(applyRes.data.status, 'success');

  // 5. Prevent duplicate application
  const dupRes = await doctor.call('POST', `/api/jobs/${jobId}/apply`);
  assert.equal(dupRes.status, 400);

  // 6. Facility reviews job applicants
  const facJobsRes = await admin.call('GET', '/api/facility/jobs');
  assert.equal(facJobsRes.status, 200);
  const facJob = facJobsRes.data.data.find((j: any) => j.id === jobId);
  assert.ok(facJob);
  assert.equal(facJob.applications.length, 1);
  const applicant = facJob.applications[0];
  assert.equal(applicant.status, 'pending');
  assert.ok(applicant.applicantName);

  // 7. Facility accepts applicant (Upfront Escrow mode)
  const acceptRes = await admin.call('POST', `/api/facility/jobs/${jobId}/applicants/${applicant.userId}/decision`, {
    decision: 'accepted',
    notes: 'Candidate verified. Approved for Ward 4 Emergency Coverage.'
  });
  assert.equal(acceptRes.status, 200);
  assert.equal(acceptRes.data.data.status, 'accepted');
  assert.equal(acceptRes.data.data.paymentStatus, 'escrow_held');
  assert.ok(acceptRes.data.data.paymentRef.startsWith('ESCROW-'));
  assert.equal(acceptRes.data.data.platformFeeMyr, 40.0);

  // 8. Practitioner clocks in
  const clockInRes = await doctor.call('POST', `/api/practitioner/shifts/${jobId}/clock-in`);
  assert.equal(clockInRes.status, 200);

  // 9. Practitioner clocks out
  const clockOutRes = await doctor.call('POST', `/api/practitioner/shifts/${jobId}/clock-out`, {
    actualHours: 8.5
  });
  assert.equal(clockOutRes.status, 200);

  // 10. Supervisor approves timesheet and releases escrow
  const approveRes = await admin.call('POST', `/api/facility/jobs/${jobId}/applicants/${applicant.userId}/timesheet/approve`, {
    actualHours: 8.5,
    supervisorNotes: 'Clinical duty completed satisfactorily. Patient handoff documented in log.'
  });
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.data.data.timesheetStatus, 'approved');
  assert.equal(approveRes.data.data.paymentStatus, 'released');
  assert.ok(approveRes.data.data.totalPayoutMyr > 0);
  assert.ok(approveRes.data.data.escrowReleasedAt);
});

test('Locum availability directory and direct invitation', async () => {
  // Practitioner sets locum availability profile
  const setProfileRes = await doctor.call('PUT', '/api/locum/me', {
    visible: true,
    states: ['W.P. Kuala Lumpur', 'Selangor'],
    specialties: ['Emergency Medicine', 'General Practice'],
    minRate: 100,
    ratePeriod: 'hour',
    availableFrom: '2026-11-01',
    availableTo: '2026-12-31',
    note: 'Available for weekend and evening coverage.'
  });
  assert.equal(setProfileRes.status, 200);

  // Facility searches locums in KL
  const searchRes = await admin.call('GET', '/api/locums?state=W.P.+Kuala+Lumpur&role=doctor');
  assert.equal(searchRes.status, 200);
  assert.ok(Array.isArray(searchRes.data.data));
  const found = searchRes.data.data.find((l: any) => l.name === 'Dr Demo Physician');
  assert.ok(found);
  assert.equal(found.registeredInMalaysia, true);
  assert.equal(found.verified, true);

  // Facility invites locum
  const inviteRes = await admin.call('POST', `/api/locums/${found.profileId}/invite`, {
    message: 'Hello Dr. Aaron, we have an urgent ICU/ED shift opening next Saturday.'
  });
  assert.equal(inviteRes.status, 200);
  assert.equal(inviteRes.data.status, 'success');
});
