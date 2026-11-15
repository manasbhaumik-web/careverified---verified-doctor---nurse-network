import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, deriveState, sweepExpiry, TRANSITIONS, type CredentialState } from '../server/credentialState';
import { mockProviderFor } from '../server/registryProviders';
import { VerificationStatus } from '../src/types';

const today = new Date('2026-11-16T00:00:00Z');

test('deriveState: stored status and expiry give the lifecycle state', () => {
  const v = VerificationStatus.VERIFIED;
  assert.equal(deriveState({ status: VerificationStatus.PENDING }, today), 'pending');
  assert.equal(deriveState({ status: VerificationStatus.REJECTED }, today), 'rejected');
  assert.equal(deriveState({ status: VerificationStatus.SUSPENDED, licenseExpiry: '2030-01-01' }, today), 'suspended');
  assert.equal(deriveState({ status: v, licenseExpiry: '2027-06-01' }, today), 'verified');
  assert.equal(deriveState({ status: v, licenseExpiry: '2026-12-10' }, today), 'expiring');
  assert.equal(deriveState({ status: v, licenseExpiry: '2026-12-16' }, today), 'expiring');
  assert.equal(deriveState({ status: v, licenseExpiry: '2026-12-17' }, today), 'verified');
  assert.equal(deriveState({ status: v, licenseExpiry: '2026-11-16' }, today), 'expired');
  assert.equal(deriveState({ status: v, licenseExpiry: '2025-01-01' }, today), 'expired');
  assert.equal(deriveState({ status: v }, today), 'verified', 'legacy verified profile with no expiry date stays verified (flagged for the admin)');
  assert.equal(deriveState({ status: VerificationStatus.PENDING, requestStatus: 'Info Requested' }, today), 'info_requested');
});

test('transitions: the legal paths work and the rest are refused', () => {
  const legal: [CredentialState, CredentialState][] = [
    ['pending', 'verified'], ['pending', 'rejected'], ['pending', 'info_requested'], ['info_requested', 'pending'],
    ['verified', 'expiring'], ['expiring', 'verified'], ['expiring', 'expired'], ['verified', 'suspended'],
    ['expired', 'pending'], ['suspended', 'verified'], ['rejected', 'pending'],
  ];
  for (const [a, b] of legal) assert.equal(canTransition(a, b), true, `${a} -> ${b}`);

  const illegal: [CredentialState, CredentialState][] = [
    ['pending', 'expired'], ['pending', 'suspended'], ['rejected', 'verified'], ['expired', 'verified'],
    ['verified', 'pending'], ['verified', 'rejected'], ['info_requested', 'verified'],
  ];
  for (const [a, b] of illegal) assert.equal(canTransition(a, b), false, `${a} -> ${b}`);

  for (const s of Object.keys(TRANSITIONS) as CredentialState[]) assert.equal(canTransition(s, s), false, `${s} -> itself`);
});

const prof = (id: string, expiry: string | undefined, status: string = VerificationStatus.VERIFIED, credentialState?: string) =>
  ({ id, name: id, verificationStatus: status, licenseExpiry: expiry, credentialState });

test('expiry sweep: flags expiring, expires lapsed, restores renewed, skips no-expiry and non-verified', () => {
  const list = [
    prof('far', '2028-01-01'),
    prof('soon', '2026-12-01'),
    prof('lapsed', '2026-11-01'),
    prof('renewed', '2028-01-01', VerificationStatus.VERIFIED, 'expiring'),
    prof('noexpiry', undefined),
    prof('pending', '2026-01-01', VerificationStatus.PENDING),
    prof('suspended', '2026-01-01', VerificationStatus.SUSPENDED),
  ];
  const changes = sweepExpiry(list, today);
  const byId = Object.fromEntries(changes.map(c => [c.id, c]));

  assert.deepEqual(Object.keys(byId).sort(), ['lapsed', 'renewed', 'soon']);
  assert.deepEqual([byId.soon.from, byId.soon.to], ['verified', 'expiring']);
  assert.deepEqual([byId.lapsed.from, byId.lapsed.to], ['verified', 'expired']);
  assert.deepEqual([byId.renewed.from, byId.renewed.to], ['expiring', 'verified']);

  const get = (id: string) => list.find(p => p.id === id)!;
  assert.equal(get('soon').verificationStatus, VerificationStatus.VERIFIED, 'expiring stays verified and visible');
  assert.equal(get('lapsed').verificationStatus, VerificationStatus.EXPIRED, 'expired is no longer verified');
  assert.ok(get('lapsed').expiredAt);
  assert.equal(get('noexpiry').verificationStatus, VerificationStatus.VERIFIED, 'no expiry date: flagged, not auto-expired');
  assert.equal(get('pending').verificationStatus, VerificationStatus.PENDING);
  assert.equal(get('suspended').verificationStatus, VerificationStatus.SUSPENDED);

  assert.deepEqual(sweepExpiry(list, today), [], 'running again changes nothing');
});

test('expiry sweep: every change it makes is a legal transition', () => {
  const list = [prof('a', '2026-12-01'), prof('b', '2026-11-01'), prof('c', '2028-01-01', VerificationStatus.VERIFIED, 'expiring')];
  for (const c of sweepExpiry(list, today)) assert.equal(canTransition(c.from, c.to), true, `${c.from} -> ${c.to}`);
});

test('mock registry adapter is deterministic and makes no network calls', async () => {
  const a = mockProviderFor('MMC');
  assert.equal(a.mode, 'mock');
  assert.equal(a.unavailableReason(), null);
  assert.equal((await a.lookup('12345')).found, true);
  assert.equal((await a.lookup('12340')).found, false);
  assert.equal((await a.lookup('SP123')).registrationType, 'specialist');
  assert.equal((await a.lookup('12345')).apcExpiry, (await a.lookup('12345')).apcExpiry);
});
