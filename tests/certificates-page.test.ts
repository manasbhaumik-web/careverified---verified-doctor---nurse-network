// The Certificates & Referrals page: each tab shows its own list, the MMC rules are explained to the patient, and the public check page is honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { leaveText, phaseOf } from '../src/components/CertificatesPanel';

const read = (f: string) => fs.readFileSync(f, 'utf8');
const dash = read('src/components/PatientDashboard.tsx');
const records = read('src/components/PatientRecords.tsx');
const panel = read('src/components/CertificatesPanel.tsx');
const verify = read('src/components/VerifyDocument.tsx');
const discharge = read('src/components/DischargeSummaryDialog.tsx');

test('the MC and Referral Letters tabs each show only their own list', () => {
  assert.match(dash, /activeSubTab=\{certsSubTab\}/);
  assert.match(records, /scope=\{tab === 'docs' \? 'both' : tab\}/);
});

test('the page explains the in-person rule, the 14-day limit and the 3-day limit, and offers to book in person', () => {
  assert.match(panel, /video consultation alone/);
  assert.match(panel, /Up to 14 days/);
  assert.match(panel, /more than 3 days/);
  assert.match(panel, /Book an in-person visit/);
});

test('each certificate can be copied, printed and saved as PDF, and the dead PDF link is gone', () => {
  for (const label of ['Copy employer link', 'Print', 'Save as PDF']) assert.ok(panel.includes(label), label);
  assert.doesNotMatch(discharge, /\/api\/certificates\/\$\{mc\.code\}\/pdf/);
});

test('the header no longer claims every certificate is "Council Validated", and the check page reports the doctor\'s current status', () => {
  assert.doesNotMatch(dash, /Council Validated/);
  assert.match(verify, /not currently verified/);
  assert.match(verify, /fmtDay|fmtDate/);
});

test('leave text is day-first, counts days, and the phase follows the dates', () => {
  assert.equal(leaveText('2026-10-14', '2026-10-14'), '14 Oct 2026 (1 day)');
  assert.equal(leaveText('2026-10-14', '2026-10-16'), '14 Oct 2026 to 16 Oct 2026 (3 days)');
  assert.equal(phaseOf('2026-10-14', '2026-10-16', '2026-10-13'), 'upcoming');
  assert.equal(phaseOf('2026-10-14', '2026-10-16', '2026-10-15'), 'current');
  assert.equal(phaseOf('2026-10-14', '2026-10-16', '2026-10-17'), 'past');
});
