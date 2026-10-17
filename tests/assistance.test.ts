import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let anon: Client, admin: Client;

before(async () => {
  srv = await startTestServer();
  anon = srv.client();
  admin = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
});

after(async () => {
  await srv?.stop();
});

test('public / guest can submit an assistance enquiry and receive a tracking code', async () => {
  const r = await anon.call('POST', '/api/assistance/enquiries', {
    patientName: 'Siti Aminah',
    patientEmail: 'siti.aminah@test.my',
    patientPhone: '+60-12-987-6543',
    homeCountry: 'MY',
    patientType: 'local_malaysian',
    assistanceType: 'elective_surgery',
    urgency: 'routine',
    specialty: 'Cardiology & Interventional',
    summary: 'Patient requires elective diagnostic angiography and cardiology review for atypical angina.',
    guaranteeLetter: true,
    insuranceCarrier: 'AIA Health Shield',
    needs: {
      vipConcierge: true,
      halalFood: true,
    },
    shareDocuments: true,
  });

  assert.equal(r.status, 201);
  assert.equal(r.data.status, 'success');
  assert.ok(r.data.data.id);
  assert.ok(r.data.data.trackingCode.startsWith('MED-MY'));
});

test('enquiry with short summary is rejected', async () => {
  const r = await anon.call('POST', '/api/assistance/enquiries', {
    patientName: 'Short Test',
    patientEmail: 'short@test.my',
    summary: 'Short',
  });
  assert.equal(r.status, 400);
});

test('fetching assistance cases returns list including seeded and new cases', async () => {
  const r = await anon.call('GET', '/api/assistance/cases');
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'success');
  assert.ok(Array.isArray(r.data.data));
  assert.ok(r.data.data.length >= 1);

  const firstCase = r.data.data[0];
  assert.ok(firstCase.id);
  assert.ok(firstCase.trackingCode);
  assert.ok(firstCase.summary);
});

test('retrieving single assistance case by id or tracking code', async () => {
  const listRes = await anon.call('GET', '/api/assistance/cases');
  const target = listRes.data.data[0];

  const byId = await anon.call('GET', `/api/assistance/cases/${target.id}`);
  assert.equal(byId.status, 200);
  assert.equal(byId.data.data.id, target.id);

  const byCode = await anon.call('GET', `/api/assistance/cases/${target.trackingCode}`);
  assert.equal(byCode.status, 200);
  assert.equal(byCode.data.data.trackingCode, target.trackingCode);
});

test('pro-forma medical quotation endpoint formats official hospital breakdown', async () => {
  const listRes = await anon.call('GET', '/api/assistance/cases');
  const caseWithQuote = (listRes.data.data as any[]).find(c => c.quotes && c.quotes.length > 0);
  assert.ok(caseWithQuote, 'At least one case has an active quotation');

  const proforma = await anon.call('GET', `/api/assistance/cases/${caseWithQuote.id}/proforma`);
  assert.equal(proforma.status, 200);
  assert.equal(proforma.data.status, 'success');
  assert.ok(proforma.data.data.referenceNumber);
  assert.ok(proforma.data.data.facility.name);
  assert.ok(proforma.data.data.totalMYR > 0);
  assert.ok(Array.isArray(proforma.data.data.items));
});

test('patient can request revision on an active quotation', async () => {
  const listRes = await anon.call('GET', '/api/assistance/cases');
  const caseWithQuote = (listRes.data.data as any[]).find(c => c.latestQuote && c.latestQuote.status === 'sent');
  if (caseWithQuote) {
    const rev = await anon.call('POST', `/api/assistance/cases/${caseWithQuote.id}/quote-decision`, {
      quoteId: caseWithQuote.latestQuote.id,
      action: 'request_revision',
      notes: 'Please adjust accommodation to standard single room and update target admission date.',
    });
    assert.equal(rev.status, 200);
    assert.equal(rev.data.status, 'success');
    assert.equal(rev.data.data.revisionNotes, 'Please adjust accommodation to standard single room and update target admission date.');
  }
});

test('patient can post direct messages on an assistance case', async () => {
  const listRes = await anon.call('GET', '/api/assistance/cases');
  const target = listRes.data.data[0];

  const msg = await anon.call('POST', `/api/assistance/cases/${target.id}/messages`, {
    text: 'Hello, our family will be arriving at KLIA on 15th November. Please confirm flight pickup.'
  });
  assert.equal(msg.status, 201);
  assert.equal(msg.data.status, 'success');
});

test('facility staff / admin can issue a comprehensive treatment quotation', async () => {
  const listRes = await anon.call('GET', '/api/assistance/cases');
  const target = listRes.data.data[0];

  const newQuote = await admin.call('POST', `/api/assistance/facility/cases/${target.id}/quotes`, {
    items: [
      { label: 'Consultant Specialist Clinical Assessment', category: 'doctor_fees', amount: 350 },
      { label: 'Minimally Invasive Outpatient Procedure', category: 'procedure', amount: 4800 },
      { label: 'Pre-Admission Diagnostic Profiling', category: 'tests', amount: 650 },
    ],
    inclusions: 'Full specialist procedure, pre-admission labs, post-op consultation.',
    exclusions: 'Emergency complications, medications beyond 7-day take home.',
    validUntil: '2026-12-31',
  });

  assert.equal(newQuote.status, 201);
  assert.equal(newQuote.data.status, 'success');
  assert.ok(newQuote.data.data.latestQuote);
});
