import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, deriveState, TRANSITIONS, type CredentialState } from '../server/credentialState';
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
  assert.equal(deriveState({ status: v }, today), 'expired', 'verified with no expiry date is not current');
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
