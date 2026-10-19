// The Prescriptions page: Active shows only active prescriptions, the Archive shows past ones (never certificates), and each card says what to do next.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dash = fs.readFileSync('src/components/PatientDashboard.tsx', 'utf8');
const list = fs.readFileSync('src/components/PrescriptionList.tsx', 'utf8');

test('the Past prescriptions tab opens past prescriptions, not certificates', () => {
  assert.match(dash, /rxSubTab === 'history' \? 'rxhist' : 'rx'/);
  assert.doesNotMatch(dash, /rxSubTab === 'history' \? 'docs'/);
});

test('active and past are split by status, and a failed fill sorts first', () => {
  assert.match(list, /scope === 'active' \? isActive\(p\) : !isActive\(p\)/);
  assert.match(list, /cannot_fill[^\n]*rank: 0/);
});

test('sharing is chosen above the send button, and the page uses "pharmacy" and day-first dates', () => {
  assert.ok(list.indexOf('Share my allergies') < list.indexOf("Send to pharmacy'"), 'the sharing checkbox comes before the Send button');
  assert.doesNotMatch(dash, /Locate Dispensary|Pharmacy Fulfillment/);
  assert.match(list, /'en-GB'/);
});
