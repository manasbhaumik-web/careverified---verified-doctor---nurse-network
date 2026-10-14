# Malaysia Localisation + International Medical Tourism Task List

**Principle:** Malaysia becomes a *locale layer* on top of the existing platform. Nothing is removed, so international practitioners, patients and medical-tourism visitors keep working. Every Malaysian item below is "add and select by region", never "replace".

Regulatory notes are from web research (Oct 2026) and need confirmation with Malaysian counsel before launch. Items marked (?) are unverified.

## 0. Foundation: region and locale config
- [x] Add a `region` / `locale` setting (`src/locale`, default `MY`, `INTL` supported). Language and time zone are wired; ID fields, registry and legal copy will read it in later sections.
- [~] Central `formatMoney`/`formatDate` in `src/locale/format.ts`; money display migrated. Remaining: the other `toLocale*` date calls, and display conversion to USD/SGD/IDR/AUD (needs a rate source; prices are stored in MYR).
- [~] i18n scaffold done (`useT`, en + ms sample keys, switcher in header and landing page, RTL `dir` for Arabic). Remaining: translate strings screen by screen; zh/id/ar dictionaries are empty and fall back to English.
- [~] Time zone: `formatClinicTime` exists but is not used on screens yet. Show times in the user's zone and the clinic's zone (MYT, UTC+8) for cross-border consults.

## 1. Credential verification (core differentiator)
- [x] Registry catalogue in `server/registries.ts` (MMC, LJM, MDC, Pharmacy Board, Act 586 facilities, other-country) with lookup route, contact and expiry label; `GET /api/registries`. MMC and LJM are selectable; the rest are catalogued for later roles. Lookup routes are from web research and untested: confirm before launch.
- [x] MMC API: provider slot in `server/registryProviders.ts` is deliberately NOT connected (no requests, no scraping); `GET /api/admin/registry-integrations` reports status. Needs a written MMC agreement and their API spec before any client is written.
- [x] MMC: admin searches the MMC register (merits.mmc.gov.my, unconfirmed) and records a reference; guidance and link are shown in the approval panel. No public API found, so the check stays manual.
- [x] Registration type (full / provisional / specialist) and specialist register number stored and validated.
- [x] APC labelling: screens say "Annual Practising Certificate (APC) expiry" for Malaysian regulators; the existing `licenseExpiry` field still drives expiry warnings and auto-suspension.
- [x] Nurses: LJM has no public search found. Approval panel tells the admin to ask the Nursing Board (nursing@moh.gov.my, 03-8883 3553) to confirm registration and APC year, and record who confirmed.
- [~] Other Malaysian bodies are catalogued (MDC, Pharmacy Board, Act 586 facilities) but dental/pharmacist roles and facility licences are not app roles yet.
- [ ] Specialist check: admin should also confirm the National Specialist Register for specialist registrations (note shown; no dedicated field yet).
- [x] International path: foreign regulators are free text and shown as "Verified abroad".
- [x] Badge: "Register checked in Malaysia" / "Verified abroad" on the profile page, search cards and landing registry lookup.

## 2. Telemedicine compliance (limits what we can offer)
Current understanding: Telemedicine Act 1997 never in force (abolition proposed); Medical Act 1971, MMC telemedicine guideline and PDPA 2010 apply; MoH guidance restricts first-time and NCD patients to follow-ups; MMC banned MCs from teleconsults (Sept 2025). Digital Health Act pending (?). Rules live in `server/telemedicine.ts`; every item below still needs Malaysian legal review.
- [x] Instant consults and booked video appointments (doctors and nurses) ask "first visit?", "long-term condition?" and "in Malaysia?" (shared `TelemedicineQuestions`). Default `TELE_FIRST_VISIT=block_chronic` blocks a first visit for a long-term condition and points to in-person booking (`block_all` / `allow` available).
- [x] "First visit" counts completed consults and paid, completed bookings on this platform. Visits elsewhere are covered by a patient attestation ("a doctor has seen me in person for this"), stored in the audit log; it is not verified.
- [x] MC after a virtual consult or video booking is refused for Malaysian-registered doctors (`certificate.blocked` audit).
- [x] Patients in Malaysia can only be matched or booked with practitioners whose register was checked in Malaysia (request, offers, accept, booking).
- [x] Cross-border: patient country recorded, acknowledgement required.
- [x] Prescribing guardrails: controlled medicines are never e-prescribed (existing list); online care for a patient outside Malaysia cannot issue an e-prescription unless `TELE_CROSS_BORDER_RX=allow`; `TELE_EXTRA_RESTRICTED` lists drugs that need an in-person visit. The controlled list is a short built-in list, not the official Poisons Act schedules: legal/pharmacist sign-off still required.
- [x] Emergency numbers by country (`server/emergency.ts`, compiled from general knowledge: verify before launch); SOS dialog has a country selector and warns when a country is unknown (falls back to 112).
- [ ] Prescribing UI does not yet show the policy block before submit (the API returns it in `/api/prescriptions/check` as `policyBlock`).

## 3. Privacy and data (PDPA 2010 plus international)
- [ ] PDPA notice and consent screens in English and BM; record consent timestamp and version.
- [ ] Data residency decision: where `data/` and uploads are hosted. PDPA cross-border transfer rules; also GDPR/other for tourists from those regions.
- [ ] Keep existing export and deletion endpoints; add a PDPA-style access and correction request path.
- [ ] Retention policy for medical records (Malaysian practice is typically at least 6 years (?)). Confirm.
- [ ] Update Terms, Privacy and disclaimers in [Footer.tsx](../src/components/Footer.tsx) and landing copy.

## 4. Patients: identity and forms
- [ ] [PatientRegistrationForm.tsx](../src/components/PatientRegistrationForm.tsx): MyKad (NRIC) for citizens/PRs, passport number and nationality for tourists; validate NRIC format and mask in the UI.
- [ ] Address fields: Malaysian state, postcode (5 digits); international address for visitors.
- [ ] Phone: E.164 with `+60` default and a country picker.
- [ ] Emergency contact and next of kin; preferred language.

## 5. Payments
- [ ] [PaymentDialog.tsx](../src/components/PaymentDialog.tsx): add MYR pricing, FPX online banking, TNG eWallet, GrabPay, Boost, DuitNow QR via a Malaysian-capable gateway (e.g. Stripe MY, Billplz, iPay88, Toyyibpay: choose one).
- [ ] Keep international card payments for tourists; show price in MYR with an indicative conversion.
- [ ] SST (service tax) handling and receipts/invoices (?) confirm applicability to healthcare services.
- [ ] Refund and cancellation policy per region.

## 6. Pharmacy and care delivery
- [ ] [PharmacyFinder.tsx](../src/components/PharmacyFinder.tsx) and workspace: Malaysian pharmacy licensing, Pharmacy Board / premises licence number, Poisons Act schedule handling.
- [ ] Local delivery partners (Grab, Lalamove, own courier) and cold-chain notes.
- [ ] Medicine names: local brand and generic names, NPRA registration reference (?).
- [ ] Insurance: panel/guarantee letter (GL) fields for insurers and corporate clients (a BookDoc-style differentiator).

## 7. Medical tourism module (new, stays international)
- [ ] Facility and practitioner listings filtered by "accepts international patients", languages spoken, and JCI/MSQH accreditation (MSQH is the Malaysian hospital accreditation body).
- [ ] Pre-arrival flow: enquiry, remote consult, quote with package price (procedure, stay, follow-up), and treatment itinerary.
- [ ] Documents for visitors: medical visa / Malaysia Healthcare Travel Council (MHTC) facilitation info (?) confirm, passport upload, medical records transfer with consent.
- [ ] Services: interpreter, airport pickup, halal food and prayer-room flags, accommodation partners.
- [ ] Post-treatment: follow-up teleconsult in the patient's home country with licensing disclaimer; record sharing with the home doctor.
- [ ] Transparent pricing and complaint channel (reuse [ReportPractitioner.tsx](../src/components/ReportPractitioner.tsx)).

## 8. Practitioners and jobs
- [ ] [JobMarket.tsx](../src/components/JobMarket.tsx): Malaysian states, MYR salary bands, locum and shift listings, public vs private sector, foreign-doctor eligibility notes.
- [ ] Locum profiles with APC validity and the facility's licensed status.

## 9. Content and UX
- [ ] Landing page ([LandingPage.tsx](../src/components/LandingPage.tsx)): Malaysian testimonials, "MMC-verified" trust messaging, BM and Chinese language switcher.
- [ ] Medical library: BM translations of key topics, local disease burden (dengue, diabetes, hypertension).
- [ ] Demo seed data ([scripts/seed-demo.ts](../scripts/seed-demo.ts)): add Malaysian demo practitioners (use clearly fake registration numbers) alongside the existing ones.

## 10. Launch and ops
- [ ] Legal review: MMC advertising rules for doctors (promotion limits), PDPA registration, telemedicine position.
- [ ] Partner conversations: clinics, MHTC, insurers.
- [ ] Support hours in MYT; BM/EN/ZH support macros ([SupportDesk.tsx](../src/components/SupportDesk.tsx)).
- [ ] Tests: locale switching, NRIC and passport validation, MC block, first-visit routing.

## Suggested order
1. Section 0 (region config) and Section 1 (MMC verification), the differentiator and the base for the rest.
2. Sections 2 and 3, the compliance gates before any public launch.
3. Sections 4 and 5, to take Malaysian patients and payments.
4. Section 7 (medical tourism) and the rest.

## Open questions for you
- Primary launch audience first: Malaysian residents, or inbound medical tourists?
- Hosting region and payment gateway preference.
- Do you have a legal adviser to confirm the (?) items?
