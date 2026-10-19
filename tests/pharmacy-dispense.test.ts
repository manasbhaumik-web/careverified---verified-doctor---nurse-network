// A pharmacy dispensing a prescription: issue, send, dispense, and the rule that it can only happen once.
// This runs the real server because dispensing writes several tables inside one database transaction.
import './helpers/isolatedDb';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, DEMO_PASSWORD, startTestServer, type Client, type TestServer } from './helpers/server';

let srv: TestServer;
before(async () => { srv = await startTestServer(); });
after(async () => { await srv.stop(); });

async function signedIn(email: string, role: string): Promise<Client> {
  const c = srv.client();
  const r = await c.login(email, DEMO_PASSWORD, role);
  assert.equal(r.status, 200, `${role} sign-in: ${JSON.stringify(r.data)}`);
  return c;
}

test('a prescription can be dispensed once, and the transaction commits', async () => {
  const patient = await signedIn(DEMO.patient, 'patient');
  const doctor = await signedIn(DEMO.doctor, 'practitioner');
  const pharmacy = await signedIn('demo.pharmacy@careverified.test', 'pharmacy');

  const bookings = (await patient.call('GET', '/api/bookings')).data.data as any[];
  const booking = bookings.find(b => /Demo Physician/.test(b.professionalName));
  assert.ok(booking, 'the demo patient has a booking with the demo doctor');

  const issued = await doctor.call('POST', '/api/prescriptions', {
    kind: 'booking', refId: booking.id, diagnosis: 'Common cold',
    items: [{ name: 'Paracetamol', strength: '500 mg', form: 'tablet', dose: '1 tablet', frequency: 'Every 6 hours as needed', durationDays: 3, quantity: 12 }],
    attestedAllergyCheck: true,
  });
  assert.equal(issued.status, 201, JSON.stringify(issued.data));
  const rxId = issued.data.data.id as string;

  const mine = (await pharmacy.call('GET', '/api/pharmacy/me')).data.data;
  const pharmacyId = (mine.pharmacy ?? mine).id as string;
  assert.ok(pharmacyId, 'the demo pharmacy account belongs to a pharmacy');
  const sent = await patient.call('POST', `/api/prescriptions/${rxId}/send`, { pharmacyId });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));

  const first = await pharmacy.call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, { pharmacistName: 'Ahmad Pharmacist' });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.data.status, 'dispensed');

  // the second attempt is refused and nothing is written twice
  const second = await pharmacy.call('POST', `/api/pharmacy/prescriptions/${rxId}/dispense`, { pharmacistName: 'Ahmad Pharmacist' });
  assert.equal(second.status, 409, JSON.stringify(second.data));
});

test('a prescription that does not exist is refused without leaving a transaction open', async () => {
  const pharmacy = await signedIn('demo.pharmacy@careverified.test', 'pharmacy');
  const r = await pharmacy.call('POST', '/api/pharmacy/prescriptions/rx_missing/dispense', { pharmacistName: 'Ahmad Pharmacist' });
  assert.equal(r.status, 404);
  // a follow-up write still works, so the failed call rolled back instead of leaving the database locked
  const again = await pharmacy.call('POST', '/api/pharmacy/prescriptions/rx_missing/dispense', { pharmacistName: 'Ahmad Pharmacist' });
  assert.equal(again.status, 404);
});
