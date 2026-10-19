import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
let anon: Client, admin: Client, patient: Client, doctor: Client;

before(async () => {
  srv = await startTestServer();
  anon = srv.client();
  admin = srv.client();
  assert.equal((await admin.login(ADMIN_EMAIL, ADMIN_PASSWORD, 'admin')).status, 200);
  patient = srv.client();
  assert.equal((await patient.login(DEMO.patient, DEMO_PASSWORD, 'patient')).status, 200);
  doctor = srv.client();
  assert.equal((await doctor.login(DEMO.doctor, DEMO_PASSWORD, 'practitioner')).status, 200);
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
  assert.match(r.data.data.trackingCode, /^MED-MY-[A-HJ-NP-Z2-9]{8}$/, 'an 8-character code, not a 4-digit number');
});

test('enquiry with short summary is rejected', async () => {
  const r = await anon.call('POST', '/api/assistance/enquiries', {
    patientName: 'Short Test',
    patientEmail: 'short@test.my',
    summary: 'Short',
  });
  assert.equal(r.status, 400);
});

// Cases hold a patient's name, contact details and clinical summary. Nobody sees one without being entitled to it.
const allCases = async () => (await admin.call('GET', '/api/assistance/cases')).data.data as any[];
const withQuote = async () => (await allCases()).find(c => c.latestQuote && c.latestQuote.status === 'sent' && c.patientEmail)!;

test('there is no public list of cases: a visitor with no code and email gets nothing', async () => {
  const r = await anon.call('GET', '/api/assistance/cases');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.data, []);
});

test('a guest needs BOTH the tracking code and the email; either alone, or the wrong email, finds nothing', async () => {
  const target = (await allCases())[0];
  assert.equal((await anon.call('GET', `/api/assistance/cases/${target.trackingCode}`)).status, 404);
  assert.equal((await anon.call('GET', `/api/assistance/cases/${target.trackingCode}?email=someone.else@example.com`)).status, 404);
  assert.equal((await anon.call('GET', `/api/assistance/cases/${target.id}`)).status, 404, 'the internal id is no way in either');

  const ok = await anon.call('GET', `/api/assistance/cases/${target.trackingCode}?email=${encodeURIComponent(target.patientEmail)}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.data.data.trackingCode, target.trackingCode);

  const list = await anon.call('GET', `/api/assistance/cases?trackingCode=${target.trackingCode}&email=${encodeURIComponent(target.patientEmail)}`);
  assert.equal(list.data.data.length, 1);
  assert.equal((await anon.call('GET', `/api/assistance/cases?trackingCode=${target.trackingCode}&email=wrong@example.com`)).data.data.length, 0);
});

test('a signed-in patient cannot read another person case, and a doctor who is not hospital staff cannot either', async () => {
  const target = (await allCases()).find(c => c.patientEmail && c.patientEmail.toLowerCase() !== DEMO.patient)!;
  assert.equal((await patient.call('GET', `/api/assistance/cases/${target.id}`)).status, 404);
  assert.equal((await doctor.call('GET', `/api/assistance/cases/${target.id}`)).status, 404);
  const mine = (await patient.call('GET', '/api/assistance/cases')).data.data as any[];
  assert.ok(mine.every(c => c.patientEmail?.toLowerCase() === DEMO.patient), 'a patient lists only their own cases');
});

test('the pro-forma quotation is only given to the people entitled to the case', async () => {
  const target = await withQuote();
  assert.equal((await anon.call('GET', `/api/assistance/cases/${target.id}/proforma`)).status, 404);
  const ok = await anon.call('GET', `/api/assistance/cases/${target.trackingCode}/proforma?email=${encodeURIComponent(target.patientEmail)}`);
  assert.equal(ok.status, 200);
  assert.ok(ok.data.data.referenceNumber);
  assert.ok(ok.data.data.totalMYR > 0);
  assert.ok(Array.isArray(ok.data.data.items));
});

test('a stranger cannot accept, decline or ask for changes to a quote, even knowing the code', async () => {
  const target = await withQuote();
  for (const action of ['accept', 'decline', 'request_revision']) {
    const r = await anon.call('POST', `/api/assistance/cases/${target.trackingCode}/quote-decision`, { quoteId: target.latestQuote.id, action, notes: 'x' });
    assert.equal(r.status, 404, action);
  }
  const still = (await allCases()).find(c => c.id === target.id)!;
  assert.equal(still.latestQuote.status, 'sent', 'the quote was not touched');
});

test('hospital staff cannot accept a quote on the patient behalf', async () => {
  const target = await withQuote();
  const r = await admin.call('POST', `/api/assistance/cases/${target.id}/quote-decision`, { quoteId: target.latestQuote.id, action: 'accept' });
  assert.equal(r.status, 404);
});

test('the patient (code + email) can ask for a revision; a decided quote cannot be decided again', async () => {
  const target = await withQuote();
  const rev = await anon.call('POST', `/api/assistance/cases/${target.trackingCode}/quote-decision`, {
    email: target.patientEmail, quoteId: target.latestQuote.id, action: 'request_revision',
    notes: 'Please adjust accommodation to standard single room and update target admission date.',
  });
  assert.equal(rev.status, 200, JSON.stringify(rev.data));
  assert.equal(rev.data.data.revisionNotes, 'Please adjust accommodation to standard single room and update target admission date.');

  const decline = await anon.call('POST', `/api/assistance/cases/${target.trackingCode}/quote-decision`, { email: target.patientEmail, quoteId: target.latestQuote.id, action: 'decline', notes: 'Too expensive' });
  assert.equal(decline.status, 200);
  const again = await anon.call('POST', `/api/assistance/cases/${target.trackingCode}/quote-decision`, { email: target.patientEmail, quoteId: target.latestQuote.id, action: 'accept' });
  assert.equal(again.status, 409, 'a declined quote cannot be accepted afterwards');
});

test('messages need the same entitlement; the patient can post, a stranger cannot', async () => {
  const target = (await allCases())[0];
  assert.equal((await anon.call('POST', `/api/assistance/cases/${target.id}/messages`, { text: 'Hello from a stranger' })).status, 404);
  const msg = await anon.call('POST', `/api/assistance/cases/${target.trackingCode}/messages`, {
    email: target.patientEmail, text: 'Hello, our family will be arriving at KLIA on 15th November. Please confirm flight pickup.',
  });
  assert.equal(msg.status, 201);
});

test('only the hospital of the case (or an admin) can issue a quotation, not any doctor', async () => {
  const target = (await allCases())[0];
  const body = { items: [{ label: 'Consultant assessment', category: 'doctor_fees', amount: 350 }], validUntil: '2030-12-31' };
  assert.equal((await doctor.call('POST', `/api/assistance/facility/cases/${target.id}/quotes`, body)).status, 404, 'a practitioner who is not hospital staff');
  assert.equal((await anon.call('POST', `/api/assistance/facility/cases/${target.id}/quotes`, body)).status, 401);

  const newQuote = await admin.call('POST', `/api/assistance/facility/cases/${target.id}/quotes`, {
    items: [
      { label: 'Consultant Specialist Clinical Assessment', category: 'doctor_fees', amount: 350 },
      { label: 'Minimally Invasive Outpatient Procedure', category: 'procedure', amount: 4800 },
      { label: 'Pre-Admission Diagnostic Profiling', category: 'tests', amount: 650 },
    ],
    inclusions: 'Full specialist procedure, pre-admission labs, post-op consultation.',
    exclusions: 'Emergency complications, medications beyond 7-day take home.',
    validUntil: '2030-12-31',
  });
  assert.equal(newQuote.status, 201);
  assert.ok(newQuote.data.data.latestQuote);
});

test('an expired quote cannot be accepted', async () => {
  const target = (await allCases()).find(c => c.patientEmail)!;
  const q = await admin.call('POST', `/api/assistance/facility/cases/${target.id}/quotes`, { items: [{ label: 'Old estimate', category: 'procedure', amount: 100 }], validUntil: '2020-01-01' });
  assert.equal(q.status, 201);
  const r = await anon.call('POST', `/api/assistance/cases/${target.trackingCode}/quote-decision`, { email: target.patientEmail, quoteId: q.data.data.latestQuote.id, action: 'accept' });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /expired/);
});
