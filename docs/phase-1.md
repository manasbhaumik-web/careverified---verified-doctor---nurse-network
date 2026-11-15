# Phase 1: trust layer and supply marketplace

Branch `phase1-trust-layer`. Most of Phase 1 already existed in this codebase, so the work closed gaps and did not rewrite what worked.
Legal and regulatory wording in the screens is placeholder text for legal review; nothing here makes a regulatory claim.

## What was built

| Area | What changed | Code |
| --- | --- | --- |
| Verification lifecycle | States: pending, info requested, verified, expiring, expired, suspended, rejected. One transition table; `deriveState` computes the state from the stored status and the expiry date. Added the stored status `Expired`. | [credentialState.ts](../server/credentialState.ts) |
| Expiry job | A sweep runs at start (after 5 seconds) and daily. It marks verified profiles expiring 30 days before expiry, expires lapsed ones (hidden from the directory), and restores renewed ones. Every change is audited and the practitioner is notified. An admin can run it with `POST /api/admin/verification/run-expiry-sweep`. | [verification.ts](../server/verification.ts) |
| Registry check | Adapter interface with a deterministic mock (`REGISTRY_ADAPTER=mock`) and manual review as the fallback: `GET /api/admin/registry-check/:registry/:number`. The MMC provider is still a stub. | [registryProviders.ts](../server/registryProviders.ts) |
| Caregiver tier | Identity (ID number plus mock e-KYC), a certificate upload and two references, reviewed in the same admin queue. The full ID number is checked and never stored; only the last four characters are kept. | [caregiverTier.ts](../server/caregiverTier.ts) |
| Public lookup | No login. `GET /api/public/credentials?q=` (name or registration number, 3+ characters, rate limited), `/:badge`, and a QR code at `/:badge/qr.svg`. Output goes through an allow-list: name, role, specialty, registration number, registering body, status, validity dates, facility, scope and badge. Pending, rejected and unknown look the same ("not found"). UI on `/verify`, and `/verify?badge=` opens one person. | [publicLookup.ts](../server/publicLookup.ts), [PublicCredentialLookup.tsx](../src/domains/verification/PublicCredentialLookup.tsx) |
| Facilities | Self-registration (`/register-facility`), pending until the board approves, then public. Profile with departments, services, accreditation claims and photos. Staff accounts with roles. | [facilityProfiles.ts](../server/facilityProfiles.ts), [FacilityPublicProfile.tsx](../src/components/facility/FacilityPublicProfile.tsx), [AdminFacilityApprovals.tsx](../src/workspaces/admin/AdminFacilityApprovals.tsx) |
| Jobs, locum, open shifts | Caregiver eligibility, `GET /api/practitioner/shifts` (confirmed upcoming shifts), and a facility can post only for itself (it could previously post for any facility). Existing: only verified people can apply, facilities accept or decline, timesheets and escrow. | [jobsMy.ts](../server/jobsMy.ts), [server.ts](../server.ts) |
| Access rules | A test calls every API route, anonymous and as each role. | [rbac-matrix.test.ts](../tests/rbac-matrix.test.ts) |
| Security | AES-256-GCM encryption at rest for uploads, patient files and facility photos. Removed the hard-coded webhook secret and the seeded webhooks pointing at real hospital domains. | [fileCrypto.ts](../server/fileCrypto.ts) |
| Language | English and Bahasa Malaysia for every new screen, with a test that fails when a phrase has no Malay translation. | [ms.json](../public/locales/ms.json) |
| Demo data | 5 facilities (one pending), 26 practitioners and caregivers in every state, 6 jobs including locum roles and open shifts. All marked DEMO. | [phase1Seed.ts](../server/phase1Seed.ts) |

## Decisions

- **Caregivers are a profile type, not a new account role.** They sign in as practitioner accounts and the profile has `role: "caregiver"`. This avoids rebuilding the `users` table (its role check constraint). Caregiver profiles are stored with the nurse profiles. Chosen with you in this session.
- **`Expired` is a new stored status.** Adding a value is safe for existing rows, and every existing "is verified" check excludes it automatically.
- **A verified profile with no expiry date stays verified.** This is legacy and seed data; approval already requires a future expiry. The admin overview flags it.
- **Facility roles are `admin` and `staff`.** The account that registered the facility is always an admin. Staff can work with jobs, shifts and applicants but cannot change the profile, staff or billing. A facility keeps at least one admin.
- **A pending facility can sign in** (to finish its profile) but is hidden from every public list until approved.
- **Accreditations entered by a facility are claims.** They are shown publicly only after the board records a checked accreditation through the existing admin route.
- **Photos reuse the document upload** (private storage, access controlled) and are served publicly only while the facility is approved and the photo is attached to it.
- **Badge links are signed** with `BADGE_SECRET` (or a random secret kept in the database), so a badge cannot be guessed from a profile id.
- **File encryption key:** in production it comes from `FILE_ENCRYPTION_KEY` and uploads are refused without it. In development a key is created once in `DATA_DIR/.file-key`. Files stored before this change are read as they are.

## Tests added

State machine and expiry job ([credential-state.test.ts](../tests/credential-state.test.ts)); public lookup privacy ([public-lookup.test.ts](../tests/public-lookup.test.ts)); caregiver tier ([caregiver-tier.test.ts](../tests/caregiver-tier.test.ts)); facilities and staff roles ([facility-profiles.test.ts](../tests/facility-profiles.test.ts)); jobs, shifts and access ([jobs-shifts-access.test.ts](../tests/jobs-shifts-access.test.ts)); access matrix ([rbac-matrix.test.ts](../tests/rbac-matrix.test.ts)); file encryption ([file-encryption.test.ts](../tests/file-encryption.test.ts)); demo data ([phase1-seed.test.ts](../tests/phase1-seed.test.ts)); Malay strings ([phase1-i18n.test.ts](../tests/phase1-i18n.test.ts)).

Two repository bugs found on the way and fixed, because they stopped every test that starts a server: the demo promotion seed inserted 16 values into 15 columns (`server/packages.ts`), and `scripts/seed-demo.ts` tried to create a pharmacy login that the server's own demo data already creates.

## Known gaps and TODOs

- **No real integrations.** Registry checks and e-KYC are mocks (`TODO: real integration`). The MMC provider is a stub, there is no public nurse register, and e-KYC would need a paid provider.
- **Facility staff accounts get a temporary password shown once.** The account is flagged "must change password", but only the pharmacy workspace enforces that flag today; the facility workspace does not yet prompt for a change. There is no invitation email yet.
- **Facility staff roles are enforced on the new routes and on billing settings only.** The older facility routes (jobs, applicants, cases, packages) allow any facility account for that facility.
- **Facility self-service does not yet cover facility licence checking:** the board records the licence through the existing admin route; a facility with an unchecked licence cannot advertise private-sector jobs.
- **Sensitive personal data at rest.** Uploaded files and bank numbers are encrypted. Other profile fields in the database are not; use disk or database encryption in production. ID numbers are not stored (last four characters only).
- **Practitioners and caregivers cannot yet see their own badge or QR code in the verification screen.** `GET /api/my-verification` returns the badge token; the screen does not show it.
- **Data store.** The Vercel deployment still uses a temporary database folder; use a persistent database before live use (see [PAYOUTS.md](PAYOUTS.md) and the README go-live notes).
- **Full-suite run time.** Each test file starts its own server; `npm test` runs three at a time to avoid start-up timeouts. On Windows, folders with `&` in the name break `npm run`; see the README.
- **Legal copy.** New screens use plain placeholder wording that needs legal review before launch.
