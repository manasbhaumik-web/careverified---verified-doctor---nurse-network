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

test('guest / patient can reserve a medical package with 10% advance deposit', async () => {
  // First get a published package
  const pkgsRes = await anon.call('GET', '/api/packages');
  if (pkgsRes.status !== 200) console.log('DEBUG pkgsRes:', pkgsRes);
  assert.equal(pkgsRes.status, 200);
  assert.ok(pkgsRes.data.data.length > 0);
  const pkg = pkgsRes.data.data[0];

  // Reserve package with 10% deposit
  const res = await anon.call('POST', `/api/packages/${pkg.id}/reserve-deposit`, {
    patientName: 'Budi Santoso',
    patientEmail: 'budi.santoso@test.id',
    patientPhone: '+62-812-3456-7890',
    patientCountry: 'Indonesia',
    preferredDate: '2026-11-20',
    paymentMethod: 'credit_card',
    notes: 'Requires wheelchair assistance upon arrival.',
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.status, 'success');
  assert.ok(res.data.data.orderId);
  assert.ok(res.data.data.depositPaymentRef.startsWith('DEP-'));
  assert.equal(res.data.data.patientName, 'Budi Santoso');
  assert.ok(res.data.data.depositAmountMyr > 0);
  assert.equal(
    res.data.data.totalPriceMyr,
    res.data.data.depositAmountMyr + res.data.data.remainingPayableMyr
  );

  // Facility / admin can view package orders
  const ordersRes = await admin.call('GET', '/api/facility/package-orders');
  assert.equal(ordersRes.status, 200);
  assert.ok(Array.isArray(ordersRes.data.data));
  const order = ordersRes.data.data.find((o: any) => o.id === res.data.data.orderId);
  assert.ok(order);
  assert.equal(order.patient_name, 'Budi Santoso');
  assert.equal(order.deposit_payment_ref, res.data.data.depositPaymentRef);
  assert.equal(order.hospital_confirmation_status, 'pending');

  // Facility / admin can confirm the package order
  const confirmRes = await admin.call('PATCH', `/api/facility/package-orders/${order.id}/confirm`, {
    status: 'confirmed',
  });
  assert.equal(confirmRes.status, 200);
  assert.equal(confirmRes.data.status, 'success');
});

test('discharging patient referral generates 8% institutional facilitator invoice in commission ledger', async () => {
  // Submit an assistance referral enquiry
  const enqRes = await anon.call('POST', '/api/assistance/enquiries', {
    patientName: 'David Lee',
    patientEmail: 'david.lee@test.com',
    patientPhone: '+65-9123-4567',
    homeCountry: 'SG',
    patientType: 'international_traveler',
    assistanceType: 'cardiac_procedure',
    urgency: 'priority',
    specialty: 'Cardiology',
    summary: 'Patient seeking coronary angioplasty second opinion and treatment in Malaysia.',
  });
  assert.equal(enqRes.status, 201);
  const caseId = enqRes.data.data.id;

  // Issue formal quotation of RM 20,000
  const quoteRes = await admin.call('POST', `/api/facility/cases/${caseId}/quote`, {
    procedureName: 'Percutaneous Coronary Intervention (PCI)',
    totalAmountMyr: 20000,
    estimatedStayDays: 3,
  });
  assert.equal(quoteRes.status, 201);

  // Admit patient (in_treatment)
  const admitRes = await admin.call('PATCH', `/api/facility/cases/${caseId}/status`, {
    status: 'in_treatment',
  });
  assert.equal(admitRes.status, 200);

  // Discharge patient (completed): automatically generates 8% facilitator invoice
  const dischargeRes = await admin.call('PATCH', `/api/facility/cases/${caseId}/status`, {
    status: 'completed',
  });
  assert.equal(dischargeRes.status, 200);

  // Verify referral commission ledger
  const ledgerRes = await admin.call('GET', '/api/facility/referral-ledger');
  assert.equal(ledgerRes.status, 200);
  assert.equal(ledgerRes.data.status, 'success');
  assert.ok(ledgerRes.data.data.summary.totalInvoicedMyr >= 1600); // 8% of 20,000 = 1,600 MYR
  assert.equal(ledgerRes.data.data.summary.commissionRatePct, 8.0);

  const completedCase = ledgerRes.data.data.cases.find((c: any) => c.id === caseId);
  assert.ok(completedCase);
  assert.equal(completedCase.patient, 'David Lee');
  assert.equal(completedCase.finalQuotationMyr, 20000);
  assert.equal(completedCase.referralCommissionMyr, 1600);
  assert.equal(completedCase.commissionRatePct, 8.0);
  assert.ok(completedCase.commissionInvoiceNo.startsWith('FAC-INV-'));
  assert.equal(completedCase.commissionStatus, 'invoiced');
});
