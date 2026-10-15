import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessConsult, firstVisitPolicy, isVirtualMode, normaliseCountry, practitionerMayTreat, prescribingBlock, MC_AFTER_TELECONSULT_MESSAGE,
} from '../server/telemedicine';

const KEYS = ['TELE_FIRST_VISIT', 'TELE_CROSS_BORDER_RX', 'TELE_EXTRA_RESTRICTED'];
const saved: Record<string, string | undefined> = {};
beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

const base = { country: 'MY', declaredFirstVisit: false, hasPriorConsult: false, chronic: false };

// ---------- first-visit routing ----------
test('first visit: default policy blocks a first online consult for a long-term condition in Malaysia', () => {
  const r = assessConsult({ ...base, chronic: true });
  assert.equal(r.allowed, false);
  assert.equal(r.firstVisit, true);
  assert.match(r.message!, /in person/);
  assert.match(r.message!, /999/);
});

test('first visit: a short-term first consult is allowed by default', () => {
  assert.equal(assessConsult({ ...base, chronic: false }).allowed, true);
});

test('first visit: a prior platform consult makes it a follow-up', () => {
  const r = assessConsult({ ...base, chronic: true, hasPriorConsult: true });
  assert.equal(r.allowed, true);
  assert.equal(r.firstVisit, false);
});

test('first visit: attesting an earlier in-person visit counts as a follow-up', () => {
  assert.equal(assessConsult({ ...base, chronic: true, attestedSeenBefore: true }).allowed, true);
});

test('first visit: the patient saying "first visit" overrides a prior record', () => {
  assert.equal(assessConsult({ ...base, chronic: true, hasPriorConsult: true, declaredFirstVisit: true }).allowed, false);
});

test('first visit: policy block_all blocks every first consult, allow blocks none', () => {
  process.env.TELE_FIRST_VISIT = 'block_all';
  assert.equal(firstVisitPolicy(), 'block_all');
  assert.equal(assessConsult({ ...base, chronic: false }).allowed, false);
  process.env.TELE_FIRST_VISIT = 'allow';
  assert.equal(assessConsult({ ...base, chronic: true }).allowed, true);
  process.env.TELE_FIRST_VISIT = 'nonsense';
  assert.equal(firstVisitPolicy(), 'block_chronic');
});

test('first visit: patients outside Malaysia are not blocked and are flagged cross-border', () => {
  const r = assessConsult({ ...base, country: 'SG', chronic: true });
  assert.equal(r.allowed, true);
  assert.equal(r.crossBorder, true);
});

test('country codes are normalised and default to Malaysia', () => {
  assert.equal(normaliseCountry('sg'), 'SG');
  assert.equal(normaliseCountry(' my '), 'MY');
  assert.equal(normaliseCountry('Singapore'), 'MY');
  assert.equal(normaliseCountry(undefined), 'MY');
});

// ---------- medical certificates ----------
test('MC block: the message tells the practitioner why and what to do', () => {
  assert.match(MC_AFTER_TELECONSULT_MESSAGE, /medical certificate/i);
  assert.match(MC_AFTER_TELECONSULT_MESSAGE, /in person/i);
});

test('MC block applies to video and tele consults, not in-person or home visits', () => {
  assert.equal(isVirtualMode('Video'), true);
  assert.equal(isVirtualMode('Teleconsultation'), true);
  assert.equal(isVirtualMode('In-person'), false);
  assert.equal(isVirtualMode('Home visit'), false);
  assert.equal(isVirtualMode(undefined), false);
});

// ---------- who may treat whom ----------
test('patients in Malaysia may only be treated online by practitioners registered in Malaysia', () => {
  const my = { verificationScope: 'verified-in-malaysia' };
  const abroad = { verificationScope: 'verified-abroad' };
  assert.equal(practitionerMayTreat('MY', my), true);
  assert.equal(practitionerMayTreat('MY', abroad), false);
  assert.equal(practitionerMayTreat(undefined, abroad), false);
  assert.equal(practitionerMayTreat('SG', abroad), true);
});

// ---------- prescribing ----------
test('prescribing: a patient abroad cannot get a Malaysian e-prescription from an online consult', () => {
  assert.match(prescribingBlock({ virtual: true, patientCountry: 'SG' }, ['Paracetamol'])!, /outside Malaysia/);
  assert.equal(prescribingBlock({ virtual: false, patientCountry: 'SG' }, ['Paracetamol']), null);
  process.env.TELE_CROSS_BORDER_RX = 'allow';
  assert.equal(prescribingBlock({ virtual: true, patientCountry: 'SG' }, ['Paracetamol']), null);
});

test('prescribing: extra restricted drugs are blocked after an online consult only', () => {
  process.env.TELE_EXTRA_RESTRICTED = 'tramadol, Codeine';
  assert.match(prescribingBlock({ virtual: true, patientCountry: 'MY' }, ['Codeine phosphate'])!, /cannot be prescribed/);
  assert.equal(prescribingBlock({ virtual: false, patientCountry: 'MY' }, ['Codeine phosphate']), null);
  assert.equal(prescribingBlock({ virtual: true, patientCountry: 'MY' }, ['Paracetamol']), null);
});
