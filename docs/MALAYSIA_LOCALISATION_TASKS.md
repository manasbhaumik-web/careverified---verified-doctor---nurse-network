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
- [x] Prescribing screen shows the policy block after "Check safety" (patient outside Malaysia, drugs restricted after online care) as a red "not allowed" notice and keeps "Sign and issue" disabled; it also appears if the server refuses at issue time ([ClinicalWorkspace.tsx](../src/components/ClinicalWorkspace.tsx)).

## 3. Privacy and data (PDPA 2010 plus international)
Code in `server/privacy.ts`, `server/dataops.ts`, `src/components/PrivacyCentre.tsx` and `PrivacyAdmin.tsx`. Notice, Terms and runbook texts are developer drafts: counsel must review them.
- [x] Bilingual privacy notice (English + Bahasa Malaysia), versioned, opened from the footer and the registration forms.
- [x] Terms of Service draft (English + Bahasa Malaysia) with its own tab; footer and sign-up links open it.
- [x] Consent records with version and timestamp; withdrawal; re-consent prompt when the notice version changes.
- [x] Data requests (access, correction, deletion, withdrawal) with a 21-day due date (confirm the legal period) and an admin queue.
- [x] Transfer register: processors, country, PDPA s.129 basis, TIA date (3-year validity); notice lists them; readiness check flags gaps. See docs/DATA_RESIDENCY.md.
- [ ] **Hosting choice is the owner's decision.** The docs recommend hosting in Malaysia. Until `DATA_HOSTING_COUNTRY` and the register are filled in, the notice shows placeholders and the readiness check fails. Counsel must confirm the basis for any transfer abroad.
- [x] Erasure: an admin can erase a patient from a deletion/withdrawal request after a preview. It deletes sessions, notifications, self-recorded health data, grants, uploads and SOS events, de-identifies the account, profile, bookings and chats, and keeps clinical records, payments and the audit log. Practitioner accounts need manual review. Tested on a scratch database.
- [x] Retention purge: removes retained clinical records of erased patients after the retention period. **It refuses to run until `RETENTION_YEARS` is set deliberately.** The default of 6 is only a placeholder: I could not find the statutory period (MMC "Medical Records and Medical Reports" guideline and the Private Healthcare Facilities rules should be read for it). `RETENTION_AUTO_PURGE=true` enables a daily purge. Payments are never purged automatically (accounting rules unconfirmed).
- [x] Breach register with a 72-hour Commissioner target and 7-day individuals target (internal targets; the Act says "as soon as practicable"), overdue reminders to admins, and a close step that requires the notifications to be recorded. Runbook: docs/BREACH_RESPONSE.md.
- [x] DPO: readiness check asks for `DPO_NAME` and notification to the Commissioner (manual).
- [ ] Open: support tickets, complaints and reviews are not erased automatically; no automated breach detection; the retention period and all legal texts still need counsel.

## 4. Patients: identity and forms
Shared rules in `src/identity.ts` (form and server use the same code); fields in `src/components/IdentityFields.tsx`; enforced in `/api/register-patient`. Formats come from general knowledge of Malaysian conventions: confirm edge cases (place-of-birth codes, number lengths) before launch.
- [x] MyKad (NRIC) for citizens and permanent residents: 12 digits, valid birth date, place code; auto-dashes while typing; age, birth date and a gender hint derived from the number; duplicate IDs refused. Passport path for visitors with nationality and date of birth.
- [x] Masking: the number can be hidden while typing, and is shown masked (first six digits only) on the dashboard. Passports mask the middle.
- [x] Address: Malaysian state (13 states + 3 federal territories) and 5-digit postcode, or an international address with country.
- [x] Phone: country-code picker defaulting to +60, stored as E.164; Malaysian lengths checked; same for the emergency contact.
- [x] Emergency contact with relationship, optional separate next of kin, and preferred language for care (includes Tamil).
- [~] Existing profiles (demo data) keep their old formats; no screen to edit these details after sign-up yet; phone numbers are not yet formatted for display (`formatPhone` exists).
- [ ] Minors and guardians (ID for under-12s, parent/guardian consent) are not handled.
- [ ] Verified identity: the MyKad/passport number is checked for format only, not against any register or document.

## 5. Payments
Code in `server/payments.ts` and `server/paymentPolicy.ts`; details and decisions in docs/PAYMENTS_MALAYSIA.md. Tax, refund and method assumptions are unconfirmed.
- [x] MYR pricing everywhere (section 0); checkout dialog shows fee, tax, total, accepted methods and the refund policy before paying.
- [~] Gateway: decision is to keep Stripe for launch (cards incl. international, FPX, GrabPay: supported per Stripe docs). **Not yet run against a live Stripe account.**
- [ ] Touch 'n Go eWallet, Boost and DuitNow QR are not available: not confirmed on Stripe, they need a Malaysian aggregator (to evaluate; not implemented).
- [x] International cards stay available; FPX is offered to Malaysian patients only.
- [x] Indicative conversion: shown only when the operator supplies rates (`FX_RATES_JSON`); charged in MYR.
- [~] SST: implemented but **off by default** (`SST_ENABLED`). 6% on the professional fee for foreign visitors, passed through (not commission or earnings), shown on the receipt with the SST registration number, refunded with the payment. Who must charge it, the PR/MyKad question, the threshold and the tax-invoice format need an accountant.
- [x] Refund and cancellation policy per region (`refundPolicy`), configurable, shown at checkout and applied when cancelling. Defaults are identical for both regions: a business decision.
- [ ] Practitioner payouts are not automated; no payment-method breakdown on receipts.

## 6. Pharmacy and delivery
Code in `server/pharmacyMy.ts`, `server/pharmacyLicence.ts`, `src/components/PrescriptionExtras.tsx` and the pharmacy workspace; rules and gaps in docs/PHARMACY_MALAYSIA.md. Statute references are unconfirmed.
- [x] Licensing: pharmacy licence and pharmacist retention-certificate expiry, licence type and how it was checked are required to verify or renew; expiry blocks the workspace, hides the pharmacy from patients and stops new prescriptions or deliveries; reminders 30 days before.
- [~] Poisons Act: dispensing pharmacist and optional poisons/prescription book entry number recorded at every dispense (`POISONS_BOOK_REQUIRED` makes it mandatory). `Drug.poisonGroup` exists but is **empty**: the groups must come from the official Poisons List via a pharmacist; sources conflict on Groups C and D.
- [~] Medicine names: optional NPRA registration number per prescribed item (format check only: no public NPRA lookup found). Malaysian brand names not yet added to the formulary.
- [x] Delivery: partners (own rider, Grab, Lalamove, other), Malaysia-only addresses, status flow with notifications, tracking link, recipient record; delivered counts as dispensed. **No live Grab/Lalamove API**: the pharmacy books manually and records the reference.
- [x] Cold chain: insulin, vaccines and `COLD_CHAIN_DRUGS` need a pharmacy that has declared cold-chain delivery; refrigeration note to patient and pharmacist. The built-in list is tiny and storage rules need a pharmacist.
- [x] Insurance: patient policies (individual / corporate), attach to a prescription, pharmacy insurance panel shown in the finder, guarantee-letter approve/decline with GL number.
- [ ] Not built: insurer integrations, claims, co-payment, delivery payment through the app, delivery partner API.

## 7. Medical tourism module (new, stays international)
Code in `server/tourism.ts` and the MedicalTourism / TourismDesk / SharedSummary components; design and gaps in docs/MEDICAL_TOURISM.md. Tested end to end (67 API checks on a scratch database); visa/MHTC text is a draft from web research.
- [x] Facility listings filtered by language, specialty, accreditation (JCI/MSQH) and services; shown only while active, accepting international patients and licence unexpired. Accreditation and licence are recorded by an admin with how they were checked and expiry: unverified or expired claims are never shown. Nothing is fetched from JCI, MSQH or MOH.
- [x] Pre-arrival flow: enquiry (with consent), itemised quote, accept/decline, itinerary, messages. Remote consults reuse the booking flow under the section 2 cross-border rules.
- [x] Documents: passport and medical-record uploads, visible to the facility only if the patient agrees, withdrawable at any time, every staff view audited.
- [x] Services: interpreter, airport pickup, halal food, prayer room flags and accommodation partners, plus the patient's needs on the enquiry.
- [x] Post-treatment: discharge summary by a verified doctor, follow-up plan, and a revocable time-limited share link for the home doctor (no sign-in; summary only).
- [x] Transparent pricing: a quote must itemise the procedure and state exclusions and cancellation terms; SST shown separately when enabled. Complaint channel: "Report a problem" opens a support ticket.
- [~] Visa / MHTC information is a draft and unconfirmed: no official source found for current MHTC registration or visa fast-track rules.
- [ ] Not built: package payment/deposit in the app, facility self-service editing, record transfer standards (HL7/FHIR), translation, travel facilitators, facility reviews.

## 8. Practitioners and jobs
Code in `server/jobsMy.ts`, the job routes in `server.ts` and `JobMarket.tsx` / `JobMarketMy.tsx`; rules and gaps in docs/JOBS_MALAYSIA.md. Tested (36 API checks plus unit checks). Foreign-practitioner rules are unconfirmed.
- [x] Malaysian states, MYR salary as a structured range and period (validated), public/private sector, role, and locum / shift listings with dated shifts; filters for state, sector, role and foreign-friendly.
- [x] Employer licence status: private-sector posts must link to a facility with a checked, unexpired licence and be posted by its staff or an admin; listings show licence checked/not checked. Government hospitals are never shown as checked.
- [x] Apply rules enforced on the server and shown on the button: role, APC valid on the last shift date, and foreign registration only where the employer accepts it.
- [x] Locum profiles: states, specialties, minimum rate, availability, hide/show; employers (facility staff and admins) browse only verified practitioners with a valid APC, and invite them without sharing contact details.
- [~] Foreign-doctor eligibility notes are a draft from web research (temporary practising certificate is not for employment; employer-sponsored MMC registration; work permit unconfirmed). Not immigration advice.
- [ ] Not built: salary benchmarks, public-sector grading, nurse-specific rules, editing or closing listings from the UI, applicant tracking beyond "applied".

## 9. Content and UX
Details in docs/CONTENT_MALAYSIA.md. Tested (46 API checks, migration of an older database, browser checks). Malay and Chinese text is a developer draft: native review needed.
- [x] Landing page: language switcher now translates the navigation and all hero slides into Bahasa Malaysia and Chinese (other languages fall back to English).
- [x] Testimonials: the invented ones were removed. Only testimonials from paying patients, published with consent (first name + initial) and approved by an admin are shown; the section is hidden when there are none. The seed adds one clearly labelled "Demo testimonial".
- [x] "MMC-verified" trust messaging rewritten to what the system does (manual register checks with date and expiry, Malaysia vs abroad); removed an invented response-time statistic, an ISO 27001 badge, a "cryptographic ledger" claim and "Telemedicine Act compliant".
- [~] Medical library: Malay versions with a language toggle, a "Malaysia in numbers" box with sourced figures, and three topics (dengue, diabetes, high blood pressure). They are labelled drafts: **a registered doctor must review the content and a native speaker the translation.**
- [x] Demo data: every seeded practitioner is labelled "Demo", original numbers renamed with a DEMO- prefix (older databases migrate on start), six new Malaysian demo practitioners added, no invented ratings.
- [ ] Not done: translating the rest of the landing page and the app screens; Indonesian and Arabic; Malay versions of the FAQ and existing articles; more topics; real testimonials (none exist yet).

- [x] Landing page claims cleaned up: removed the "99.98% Statutory SLA" footers, the invented triage phone number (1-800-88-CARE), the whole corporate/enterprise section (no employer product exists: "< 3 Min Access", "100% Verifiable", "Compliant", EMR dashboard), the "sha256-verified tamper-proof" log label (the audit log has no hash chain), "MySejahtera Compatible", "encrypted" messaging, "24/7" (also in the Malay and Chinese hero text) and "partners" that are only references (MMC, MoH, a pharmacy network). Remaining claims match what the code does.

- [x] "Care that is easy to reach" section for patients in Malaysia on the landing page, in English, Malay and Chinese ([PatientAccess.tsx](../src/components/PatientAccess.tsx)): language, phone use, fee before payment and the 10-minute refund, MyKad or passport, limits of online care, live support hours in Malaysia time and the 999 line, plus an honest accessibility statement. Backed by a real axe-core check and fixes (brand colours darkened, footer labels, member hub text, tab attributes): see [ACCESSIBILITY.md](ACCESSIBILITY.md).
- [ ] Accessibility not done: screen-reader and keyboard testing by people, the Dark Navy Blue theme (43 contrast failures), doctor/pharmacy/admin screens and dialogs, a text-size control, captions for video, a way to report a barrier before signing in. The tourist section was scanned in English, Malay and Chinese with no failures; people have not tested it.

- [x] "For international patients" section on the landing page, public with no account, in English, Malay and Chinese ([TouristAccess.tsx](../src/components/TouristAccess.tsx)): passport sign-up, itemised quotes in ringgit, accreditation shown only when checked, records under the patient's control, a link for the home doctor, entry and emergency notes, what is not available yet (deposits, travel and visa help, record transfer, Arabic and Indonesian), a filterable facility list and the travel notes. It is shown first when the region is set to International. The demo seed now adds one clearly labelled demo facility.
- [ ] Tourist gaps: Arabic and Indonesian text, real facilities (none are listed until an admin adds them), facility self-service editing, deposits, facilitators and reviews. Chinese and Malay wording needs native review.

- [x] Sign-in moved to its own page (`/login`, with `?role=` and `&register=1`), out of the landing page ([LoginPage.tsx](../src/components/LoginPage.tsx), [nav.ts](../src/nav.ts)). Landing buttons, footer links and the tourist and patient sections all open it; the back button works; a signed-in user who opens it is sent home; the page is not indexed.
- [x] **Security fix found on the way:** `POST /api/auth/demo` signed anyone in as a demo user, and as the real admin, with no password, in every environment; demo accounts with a published password were also created on every start. Demo mode now exists only in development (or with `ALLOW_DEMO=true`), never covers admin, and the demo credentials are sent to the page only in demo mode. A production start without `ADMIN_PASSWORD` now generates a random one instead of `DemoPass123`. Tested in [demo-login.test.ts](../tests/demo-login.test.ts); see the README for what to do about a database or deployment that ran the old version.
- [ ] Login page text is English only (the landing page it came from was too). Not done: Malay and Chinese text, a password-reset page, and a sign-in lockout message review.

- [x] Doctors and nurses page at `/for-doctors` (English, Malay, Chinese) to recruit supply: how joining works, what you can do, how you are paid, the rules you work under, who can join, what the public sees, and how a listing is kept. The commission is read from the server; **payouts are stated as not automated**. Linked from the landing nav and the practitioner hero slide. Every claim is traced to its source in [PRACTITIONER_PAGE.md](PRACTITIONER_PAGE.md).
- [ ] Before recruiting at scale: decide and build the payout process, set and measure a verification review time, confirm the commission, and add measurement of visits to sign-ups to verified accounts. Pages for clinics and pharmacies are not built.

## 10. Launch and ops
- [ ] Legal review: MMC advertising rules for doctors (promotion limits), PDPA registration, telemedicine position. Needs counsel; nothing to build. Hand over the list in [Legal review brief](#legal-review-brief) below.
- [ ] Partner conversations: clinics, MHTC, insurers. Business outreach; nothing to build.
- [x] Support hours in Malaysia time: `SUPPORT_HOURS` (default Mon-Fri 09:00-18:00, a placeholder until you set the real rota, format `1-5 09:00-18:00`, days 0-6 with Sunday = 0), `GET /api/support/hours`, and an online/away banner on the support page in the viewer's language ([supportMy.ts](../src/supportMy.ts), [SupportDesk.tsx](../src/components/SupportDesk.tsx)). The ticket reply targets (1, 4, 24, 72 hours) still count calendar hours, not working hours.
- [x] English, Bahasa Malaysia and Chinese reply templates for staff: nine drafts (received, need details, MC after video consult, first visit in person, licence check, privacy request, refund, out of hours, closing) in the admin Support desk. Staff pick a language and a template, edit, then send. Malay and Chinese text needs a native reader before launch.
- [x] Tests: `npm test` runs 68 tests (Node's built-in runner through tsx, no new dependency) in [tests](../tests): MyKad and passport validation, phone and address rules, locale switching and translation fallback, first-visit routing, MC block, prescribing limits, support hours and templates, plus the MC rule through the running server ([certificate-mc.test.ts](../tests/certificate-mc.test.ts)) and public medical-tourism browsing ([tourism-public.test.ts](../tests/tourism-public.test.ts)). Server tests start the real app on a free port with a throwaway database and the demo seed ([helpers/server.ts](../tests/helpers/server.ts)), take about 10 seconds, and delete the database afterwards. Run `node node_modules/tsx/dist/cli.mjs --test "tests/*.test.ts"` if `npm test` fails because the folder path contains an ampersand (Windows).
- [ ] Not done: server tests for the other rules (first-visit booking block, prescribing block, cross-border e-prescription), browser tests, and translation coverage beyond the small dictionary (the landing text in `src/locale/landing.ts` is not checked for missing languages). The MC test covers doctors registered in Malaysia; a doctor registered abroad is not covered.

### Legal review brief
Questions for Malaysian counsel, collected from sections 1 to 9:
1. MMC and doctor advertising: what may the doctor directory, ratings and testimonials say, and may a doctor be listed with a fee?
2. PDPA 2010: do we need to register as a data user, what is the right retention period (`RETENTION_YEARS`), is the 21-day access-request period right, and what are the breach-notification duties?
3. Telemedicine: first visits for long-term conditions, no MC after a teleconsultation, practitioners registered abroad treating patients in Malaysia, cross-border e-prescriptions.
4. Payments and tax: service tax (SST) on consultations, refund wording, indicative foreign exchange wording.
5. Pharmacy: delivery of Group B/C medicines, cold chain wording, insurance panel claims.
6. Medical tourism: facility listings and MHTC links, enquiry handling, disclaimers.
7. Terms of service, privacy notice and consent wording in Malay and Chinese.

## Suggested order
1. Section 0 (region config) and Section 1 (MMC verification), the differentiator and the base for the rest.
2. Sections 2 and 3, the compliance gates before any public launch.
3. Sections 4 and 5, to take Malaysian patients and payments.
4. Section 7 (medical tourism) and the rest.

## Open questions for you
- Primary launch audience first: Malaysian residents, or inbound medical tourists?
- Hosting region and payment gateway preference.
- Do you have a legal adviser to confirm the (?) items?
