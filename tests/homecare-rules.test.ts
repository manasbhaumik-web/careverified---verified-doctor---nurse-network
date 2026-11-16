import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, checkRequest, clashes, hasStarted, isExpired, overlaps, priceSen, TRANSITIONS, visitWindow, type VisitStatus } from '../server/homecareRules';

const now = Date.parse('2026-11-16T00:00:00Z'); // 08:00 in Malaysia
const day = (n: number) => new Date(now + n * 86_400_000 + 8 * 3_600_000).toISOString().slice(0, 10);

test('price is the hourly rate times whole hours, in sen', () => {
  assert.equal(priceSen(2500, 4), 10_000);
  assert.equal(priceSen(2499.6, 2), 5_000);
});

test('a visit window uses Malaysia time and has the right length', () => {
  const w = visitWindow({ date: '2026-11-20', startTime: '09:30', hours: 3 })!;
  assert.equal(new Date(w.start).toISOString(), '2026-11-20T01:30:00.000Z');
  assert.equal(w.end - w.start, 3 * 3_600_000);
  assert.equal(visitWindow({ date: '2026-11-20', startTime: '25:00', hours: 3 }), null);
  assert.equal(visitWindow({ date: 'tomorrow', startTime: '09:00', hours: 3 }), null);
});

test('checkRequest accepts a good request and refuses bad ones', () => {
  const ok = checkRequest({ date: day(3), startTime: '09:00', hours: 4, note: '  bring ID  ' }, now);
  assert.deepEqual(ok, { date: day(3), startTime: '09:00', hours: 4, note: 'bring ID' });
  assert.equal(typeof checkRequest({ date: day(3), startTime: '09:00', hours: 0 }, now), 'string', 'too few hours');
  assert.equal(typeof checkRequest({ date: day(3), startTime: '09:00', hours: 13 }, now), 'string', 'too many hours');
  assert.equal(typeof checkRequest({ date: day(3), startTime: '09:00', hours: 2.5 }, now), 'string', 'whole hours only');
  assert.equal(typeof checkRequest({ date: day(3), startTime: '', hours: 2 }, now), 'string', 'needs a start time');
  assert.equal(typeof checkRequest({ date: day(-1), startTime: '09:00', hours: 2 }, now), 'string', 'in the past');
  assert.equal(typeof checkRequest({ date: day(200), startTime: '09:00', hours: 2 }, now), 'string', 'too far ahead');
  assert.equal(typeof checkRequest({ date: day(0), startTime: '08:30', hours: 2 }, now), 'string', 'less than an hour from now');
});

test('overlap: touching visits do not clash, overlapping ones do', () => {
  const a = visitWindow({ date: '2026-11-20', startTime: '09:00', hours: 3 })!;
  assert.equal(overlaps(a, visitWindow({ date: '2026-11-20', startTime: '12:00', hours: 2 })!), false, 'back to back is fine');
  assert.equal(overlaps(a, visitWindow({ date: '2026-11-20', startTime: '11:00', hours: 2 })!), true);
  assert.equal(overlaps(a, visitWindow({ date: '2026-11-21', startTime: '09:00', hours: 3 })!), false, 'another day');
});

test('only accepted and confirmed visits block the caregiver; a visit does not clash with itself', () => {
  const visit = (status: VisitStatus, id: string) => ({ id, status, date: '2026-11-20', startTime: '09:00', hours: 3 });
  const cand = { date: '2026-11-20', startTime: '10:00', hours: 2 };
  assert.equal(clashes([visit('accepted', 'a')], cand), true);
  assert.equal(clashes([visit('confirmed', 'a')], cand), true);
  for (const s of ['requested', 'declined', 'cancelled', 'expired', 'completed'] as VisitStatus[]) assert.equal(clashes([visit(s, 'a')], cand), false, s);
  assert.equal(clashes([visit('confirmed', 'a')], cand, 'a'), false, 'ignores itself');
});

test('state machine: the legal path works and endings are final', () => {
  const path: VisitStatus[] = ['requested', 'accepted', 'confirmed', 'completed'];
  for (let i = 0; i < path.length - 1; i++) assert.equal(canTransition(path[i], path[i + 1]), true, `${path[i]} -> ${path[i + 1]}`);
  assert.equal(canTransition('requested', 'declined'), true);
  assert.equal(canTransition('requested', 'confirmed'), false, 'cannot skip acceptance');
  assert.equal(canTransition('accepted', 'completed'), false, 'cannot complete without paying');
  assert.equal(canTransition('confirmed', 'declined'), false, 'a paid visit is cancelled, not declined');
  for (const end of ['completed', 'declined', 'cancelled', 'expired'] as VisitStatus[]) assert.deepEqual(TRANSITIONS[end], [], `${end} is final`);
});

test('a visit can be completed only after it has started', () => {
  const v = { date: '2026-11-16', startTime: '09:00', hours: 2 }; // 01:00 UTC
  assert.equal(hasStarted(v, Date.parse('2026-11-16T00:30:00Z')), false);
  assert.equal(hasStarted(v, Date.parse('2026-11-16T01:00:00Z')), true);
});

test('expiry: 48 hours unanswered, 24 hours unpaid after acceptance', () => {
  const t0 = '2026-11-14T00:00:00Z';
  assert.equal(isExpired({ status: 'requested', createdAt: t0 }, Date.parse('2026-11-15T23:00:00Z')), false);
  assert.equal(isExpired({ status: 'requested', createdAt: t0 }, Date.parse('2026-11-16T01:00:00Z')), true);
  assert.equal(isExpired({ status: 'accepted', createdAt: t0, acceptedAt: '2026-11-15T12:00:00Z' }, Date.parse('2026-11-16T11:00:00Z')), false);
  assert.equal(isExpired({ status: 'accepted', createdAt: t0, acceptedAt: '2026-11-15T12:00:00Z' }, Date.parse('2026-11-16T13:00:00Z')), true);
  assert.equal(isExpired({ status: 'confirmed', createdAt: t0 }, Date.parse('2027-01-01T00:00:00Z')), false, 'paid visits never expire');
});
