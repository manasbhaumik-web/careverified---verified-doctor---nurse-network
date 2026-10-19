// The Assistance & Quotes page: no unbacked claims, an emergency warning, a confirmation before accepting a quote, and guests prove who they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/components/MedicalAssistanceModule.tsx', 'utf8');
const dash = fs.readFileSync('src/components/PatientDashboard.tsx', 'utf8');

test('no unverified hotline, no fixed accreditation badges, no promised reply time', () => {
  assert.doesNotMatch(page, /2727-8900|JCI & MSQH|Panel LOG Direct Billing|4-12 hours|Act 586 Licensed|monitored by the Ministry/);
  assert.doesNotMatch(page, /Official Quotation|OFFICIAL/);
  assert.doesNotMatch(dash, /MHTC Coordinated/);
});

test('an urgent request shows the emergency warning with 999 before anything is sent', () => {
  assert.match(page, /urgency === 'urgent'[^]*?999/);
  assert.match(page, /not an emergency service/);
});

test('accepting a quote asks first, says nothing is charged, and errors are shown inline instead of alert()', () => {
  assert.match(page, /Accept this quote\?/);
  assert.match(page, /does not charge you/);
  assert.doesNotMatch(page, /\balert\(/);
});

test('guests send their email with every follow-up request, and the form is prefilled for signed-in patients', () => {
  assert.match(page, /guestBody\(\)/);
  assert.match(page, /withEmail\(/);
  assert.match(page, /\/api\/auth\/me/);
  assert.match(dash, /currentUser \? \[\] : \[\{ id: 'track'/, 'signed-in patients do not see "Track a request"');
});

test('the form is three steps and the currency picker is not on the form', () => {
  assert.match(page, /data-step="1"/);
  assert.match(page, /data-step="3"/);
  const form = page.slice(page.indexOf("activeTab === 'enquiry'"), page.indexOf("activeTab === 'cases'"));
  assert.doesNotMatch(form, /currency-select/);
});
