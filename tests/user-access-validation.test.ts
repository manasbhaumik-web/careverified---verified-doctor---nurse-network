import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canAccessView, defaultViewForRole } from '../src/app/moduleRegistry';
import { applyProblem } from '../server/jobsMy';
import { VerificationStatus } from '../src/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Layer 1: Login endpoint validates all 6 roles (including nurse) and does not lock out on role-tab mismatch', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
  assert.match(
    serverSrc,
    /\["patient",\s*"practitioner",\s*"nurse",\s*"admin",\s*"pharmacy",\s*"facility"\]\.includes\(req\.body\.role\)/,
    '/api/auth/login must validate all 6 roles including nurse'
  );

  const authSrc = fs.readFileSync(path.join(ROOT, 'server/auth.ts'), 'utf8');
  assert.match(authSrc, /export function entityAccessProblem/, 'auth.ts must export entityAccessProblem');
  assert.match(authSrc, /details:\s*\{\s*reason:\s*"role_mismatch"/, 'attemptLogin must audit role_mismatch separately from bad_password');
  assert.match(authSrc, /!entityAccessProblem\(row\)/, 'loadSession must enforce entityAccessProblem on active sessions');
});

test('Layer 2: Centralized view access guard (canAccessView & defaultViewForRole) enforces role and adminSubRole boundaries', () => {
  const baseOpts = {
    adminSubRole: 'super_admin' as const,
    isPackageEnabled: () => true,
    packages: [],
  };

  // Patient can access patient views, my_profile, and help, but NOT practitioner, nurse, facility, pharmacy, or admin views
  assert.equal(canAccessView('patient_care', 'patient', baseOpts), true);
  assert.equal(canAccessView('patient_records', 'patient', baseOpts), true);
  assert.equal(canAccessView('my_profile', 'patient', baseOpts), true);
  assert.equal(canAccessView('help', 'patient', baseOpts), true);
  assert.equal(canAccessView('onboard', 'patient', baseOpts), false);
  assert.equal(canAccessView('nurse_care', 'patient', baseOpts), false);
  assert.equal(canAccessView('admin_registry', 'patient', baseOpts), false);
  assert.equal(canAccessView('pharmacy_dispensing', 'patient', baseOpts), false);

  // Nurse can access nurse views, but NOT doctor practice_compliance or admin views
  assert.equal(canAccessView('nurse_care', 'nurse', baseOpts), true);
  assert.equal(canAccessView('nurse_shifts', 'nurse', baseOpts), true);
  assert.equal(canAccessView('nurse_credentials', 'nurse', baseOpts), true);
  assert.equal(canAccessView('practice_compliance', 'nurse', baseOpts), false);
  assert.equal(canAccessView('admin_ops', 'nurse', baseOpts), false);

  // Practitioner can access onboard, recruitment, practice_compliance, performance_profile, articles
  assert.equal(canAccessView('onboard', 'practitioner', baseOpts), true);
  assert.equal(canAccessView('practice_compliance', 'practitioner', baseOpts), true);
  assert.equal(canAccessView('recruitment', 'practitioner', baseOpts), true);
  assert.equal(canAccessView('admin_registry', 'practitioner', baseOpts), false);
  assert.equal(canAccessView('pharmacy_dispensing', 'practitioner', baseOpts), false);

  // Admin sub-role restrictions: registrar only gets registry; finance only gets ops; facilities gets facilities
  assert.equal(canAccessView('admin_registry', 'admin', { ...baseOpts, adminSubRole: 'registrar' }), true);
  assert.equal(canAccessView('admin_ops', 'admin', { ...baseOpts, adminSubRole: 'registrar' }), false);
  assert.equal(canAccessView('admin_ops', 'admin', { ...baseOpts, adminSubRole: 'finance' }), true);
  assert.equal(canAccessView('admin_registry', 'admin', { ...baseOpts, adminSubRole: 'finance' }), false);
  assert.equal(canAccessView('admin_facilities', 'admin', { ...baseOpts, adminSubRole: 'facilities' }), true);
  assert.equal(canAccessView('facility_staffing', 'admin', { ...baseOpts, adminSubRole: 'facilities' }), true);
  assert.equal(canAccessView('facility_staffing', 'admin', { ...baseOpts, adminSubRole: 'registrar' }), false);

  // Default views per role & admin sub-role
  assert.equal(defaultViewForRole('patient'), 'patient_care');
  assert.equal(defaultViewForRole('practitioner'), 'onboard');
  assert.equal(defaultViewForRole('nurse'), 'nurse_care');
  assert.equal(defaultViewForRole('pharmacy'), 'pharmacy_dispensing');
  assert.equal(defaultViewForRole('facility'), 'facility_staffing');
  assert.equal(defaultViewForRole('admin', 'finance'), 'admin_ops');
  assert.equal(defaultViewForRole('admin', 'facilities'), 'admin_facilities');
  assert.equal(defaultViewForRole('admin', 'growth'), 'admin_growth');
  assert.equal(defaultViewForRole('admin', 'registrar'), 'admin_registry');
});

test('Layer 3: Verification and APC licence expiry gating blocks unverified, expired, or wrong-role shift applications', () => {
  const nurseJob = { status: 'Active', roleRequired: 'nurse', shifts: [{ date: '2028-05-01', start: '08:00', end: '16:00' }] };
  const doctorJob = { status: 'Active', roleRequired: 'doctor', shifts: [{ date: '2028-05-01', start: '08:00', end: '16:00' }] };

  // Unverified nurse is blocked
  assert.match(
    applyProblem(nurseJob, { role: 'nurse', verificationStatus: VerificationStatus.PENDING, licenseExpiry: '2029-12-31', registryId: 'LJM' }) || '',
    /Only verified practitioners can apply/
  );

  // Expired licence is blocked
  assert.match(
    applyProblem(nurseJob, { role: 'nurse', verificationStatus: VerificationStatus.VERIFIED, licenseExpiry: '2025-01-01', registryId: 'LJM' }) || '',
    /expires on 2025-01-01/
  );

  // Doctor applying to a nurse-only shift is blocked, and vice versa
  assert.match(
    applyProblem(nurseJob, { role: 'doctor', verificationStatus: VerificationStatus.VERIFIED, licenseExpiry: '2029-12-31', registryId: 'MMC' }) || '',
    /This position is for nurses/
  );
  assert.match(
    applyProblem(doctorJob, { role: 'nurse', verificationStatus: VerificationStatus.VERIFIED, licenseExpiry: '2029-12-31', registryId: 'LJM' }) || '',
    /This position is for doctors/
  );

  // Verified nurse with valid Malaysian LJM APC can apply to nurse shift
  assert.equal(
    applyProblem(nurseJob, { role: 'nurse', verificationStatus: VerificationStatus.VERIFIED, licenseExpiry: '2029-12-31', registryId: 'LJM' }),
    null
  );
});

test('Layer 4: Backend API enforces Nurse access on bookings/shifts/chats while keeping e-Rx & MCs restricted to verified Doctors', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
  const clinicalSrc = fs.readFileSync(path.join(ROOT, 'server/clinical.ts'), 'utf8');

  // Nurse role is included on bookings, shift applications, profile edit, review replies, and care messaging
  assert.match(serverSrc, /app\.post\("\/api\/jobs\/:id\/apply",\s*requireRole\("practitioner",\s*"nurse"\)/);
  assert.match(serverSrc, /app\.post\("\/api\/professionals\/:id\/edit",\s*requireRole\("practitioner",\s*"nurse",\s*"admin"\)/);
  assert.match(serverSrc, /app\.post\("\/api\/reviews\/:id\/reply",\s*requireRole\("practitioner",\s*"nurse"\)/);
  assert.match(serverSrc, /app\.get\("\/api\/chats",\s*requireRole\("patient",\s*"practitioner",\s*"nurse"\)/);
  assert.match(serverSrc, /app\.post\("\/api\/chats",\s*requireRole\("patient",\s*"practitioner",\s*"nurse"\)/);

  // e-Prescriptions and Medical Certificates remain strictly restricted to verified doctors with unexpired licences
  assert.match(clinicalSrc, /if\s*\(p\.licenseExpiry\s*&&\s*p\.licenseExpiry\s*<\s*new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)\)\s*return null;/);
  assert.match(clinicalSrc, /if\s*\(!pro\s*\|\|\s*pro\.role\s*!==\s*"doctor"\)\s*return fail\(res,\s*403,\s*"Only verified doctors can issue prescriptions\."\)/);
  assert.match(clinicalSrc, /if\s*\(!pro\s*\|\|\s*pro\.role\s*!==\s*"doctor"\)\s*return fail\(res,\s*403,\s*"Only verified doctors can issue medical certificates\."\)/);
});
