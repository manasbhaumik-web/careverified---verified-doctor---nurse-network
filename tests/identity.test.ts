import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNric, maskNric, formatNricInput, isPassportNumber, normalisePassport, toE164, formatPhone, addressProblem } from '../src/identity';

const TODAY = new Date(2026, 9, 15); // 15 Oct 2026

test('MyKad: accepts a valid number and reads birth date, age and gender', () => {
  const n = parseNric('900101-14-5399', TODAY)!;
  assert.equal(n.normalised, '900101-14-5399');
  assert.equal(n.birthDate, '1990-01-01');
  assert.equal(n.age, 36);
  assert.equal(n.gender, 'Male'); // last digit odd
  assert.equal(parseNric('900101-14-5398', TODAY)!.gender, 'Female');
});

test('MyKad: accepts spaces, dashes or bare digits', () => {
  assert.equal(parseNric('900101145399', TODAY)?.normalised, '900101-14-5399');
  assert.equal(parseNric('900101 14 5399', TODAY)?.normalised, '900101-14-5399');
});

test('MyKad: a two-digit year in the future means the 1900s', () => {
  assert.equal(parseNric('300101-01-0001', TODAY)!.birthDate, '1930-01-01');
  assert.equal(parseNric('050101-01-0001', TODAY)!.birthDate, '2005-01-01');
});

test('MyKad: rejects impossible dates, bad place code and wrong length', () => {
  assert.equal(parseNric('900230-14-5399', TODAY), null); // 30 Feb
  assert.equal(parseNric('901301-14-5399', TODAY), null); // month 13
  assert.equal(parseNric('900101-00-5399', TODAY), null); // place code 00
  assert.equal(parseNric('900101-14-539', TODAY), null);
  assert.equal(parseNric('90010114539X', TODAY), null);
  assert.equal(parseNric('', TODAY), null);
});

test('MyKad: birthday not yet reached this year lowers the age', () => {
  assert.equal(parseNric('901231-14-5399', TODAY)!.age, 35);
});

test('MyKad: typing is formatted and the number is masked for display', () => {
  assert.equal(formatNricInput('9001011453'), '900101-14-53');
  assert.equal(formatNricInput('900101145399999'), '900101-14-5399');
  assert.equal(maskNric('900101-14-5399'), '900101-••-••••');
  assert.equal(maskNric(null), '••••••-••-••••');
});

test('passport: 5 to 15 letters and digits, spaces and case ignored', () => {
  assert.equal(isPassportNumber('A12345678'), true);
  assert.equal(isPassportNumber('a123 4567'), true);
  assert.equal(normalisePassport('a123 4567'), 'A1234567');
  assert.equal(isPassportNumber('A123'), false);
  assert.equal(isPassportNumber('A1234567890123456'), false);
  assert.equal(isPassportNumber('A123-4567'), false);
  assert.equal(isPassportNumber(''), false);
});

test('phone: Malaysian numbers become E.164 from common typings', () => {
  assert.equal(toE164('012-345 6789'), '+60123456789');
  assert.equal(toE164('0123456789'), '+60123456789');
  assert.equal(toE164('+60 12-345 6789'), '+60123456789');
  assert.equal(toE164('60123456789'), '+60123456789');
  assert.equal(toE164('0060123456789'), '+60123456789');
  assert.equal(toE164('03-2123 4567'), '+60321234567'); // landline
});

test('phone: rejects numbers that cannot be valid', () => {
  assert.equal(toE164(''), null);
  assert.equal(toE164('123'), null);
  assert.equal(toE164('abcdefghij'), null);
  assert.equal(toE164('0123'), null);
});

test('phone: other countries use the chosen dial code', () => {
  assert.equal(toE164('9123 4567', '+65'), '+6591234567');
  assert.equal(toE164('+44 7700 900123'), '+447700900123');
});

test('phone: readable format for Malaysian mobile numbers', () => {
  assert.equal(formatPhone('+60123456789'), '+60 12-345 6789');
  assert.equal(formatPhone('+447700900123'), '+447700900123');
  assert.equal(formatPhone(null), '');
});

test('address: a Malaysian address needs a state and a 5-digit postcode', () => {
  const ok = { line1: '1 Jalan Ampang', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur', postcode: '50450', country: 'MY' };
  assert.equal(addressProblem(ok), null);
  assert.match(addressProblem({ ...ok, state: '' })!, /state/i);
  assert.match(addressProblem({ ...ok, state: 'Atlantis' })!, /state/i);
  assert.match(addressProblem({ ...ok, postcode: '5045' })!, /postcode/i);
  assert.ok(addressProblem(undefined));
});

test('address: an overseas address needs a postal code but no state', () => {
  const sg = { line1: '1 Orchard Road', city: 'Singapore', postcode: '238824', country: 'SG' };
  assert.equal(addressProblem(sg), null);
  assert.ok(addressProblem({ ...sg, postcode: '' }));
});
