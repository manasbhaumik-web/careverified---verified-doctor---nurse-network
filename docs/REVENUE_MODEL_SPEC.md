# Revenue model v2: built around Malaysian law

Status: draft for review, replaces the first version. Date: 2026-11-17. Not legal advice: every legal point below needs a Malaysian healthcare lawyer and tax adviser to confirm against the official texts.

## 1. What changed and why

The first version took a percentage of the professional's fee on every consultation and visit, held patients' money, and charged hospitals a percentage success fee at discharge. Research against Malaysian rules shows each of those three choices carries legal risk. This version changes them.

| First version | Problem found | This version |
|---|---|---|
| 15% of the doctor's fee kept by the platform | The medical council's May 2026 ruling [bans extracting or keeping a share of a doctor's fees as a condition or inducement for referring or assigning patients](https://codeblue.galencentre.org/2026/05/mmc-bans-doctor-fee-splitting-by-hospitals-insurers-tpas/). A platform that assigns patients and keeps a percentage is close to that line. | The doctor receives 100% of their fee. The platform charges its own fixed service fee, separately itemised, to the patient. Optional flat subscription for doctors. |
| Platform collects all money and pays out after a hold | Holding customer funds may need approval from Bank Negara. The [e-money policy](https://www.bnm.gov.my/-/pd-emoney) expects non-bank issuers to keep customer funds in trust accounts. I found no marketplace exemption. | Use a licensed payment provider that settles the professional's fee to them and the platform's fee to the platform. The platform does not hold funds. |
| Caregiver commission deducted from the caregiver's earnings, no statutory deductions | The [Gig Workers Act 2025](https://www.mondaq.com/employee-rights-labour-relations/1759258/malaysias-landmark-gig-workers-act-coming-into-effect) is reported in force since 31 March 2026. Platform providers must register gig workers with Perkeso, deduct a contribution and remit it. | Family-paid service fee. The earnings statement shows any statutory contribution. Whether caregivers are covered is a legal question to settle before launch. |
| Hospital pays 8% of the package at discharge | Needs the hospital to report discharge, and a percentage of a bill that includes doctors' fees is closer to the fee-splitting line. | Fixed fee per confirmed booking, the same for every hospital and package of the same category. |
| One tax setting on the whole payment | Consultation fees by doctors are [exempt from service tax if separately itemised](https://www.wolterskluwer.com/en-my/expert-insights/sst-on-private-healthcare-services); private healthcare for non-citizens is taxed at 6% from 1 July 2025; the platform's own fee is a separate taxable question. | Every payment shows separate lines: professional fee, platform fee, tax on each as the accountant decides. |

## 2. Principles

1. The platform earns from what it provides (booking, software, payment handling, support), never from a share of what a doctor earns for treating a patient.
2. A fee never changes with which doctor, hospital or pharmacy the patient is sent to.
3. The patient or family sees every line before paying: professional fee, platform fee, tax.
4. The platform does not hold patients' money.
5. Verification stays free for the people who supply the network.
6. Every fee is a setting with an audit trail, and a legal switch can turn any line off without code changes.

## 3. Revenue lines

### R1. Teleconsultation
- **Professional fee:** set by the doctor within published limits and paid to the doctor in full.
- **Platform service fee:** a fixed amount per completed consultation, charged to the patient as its own line. Not a percentage of the doctor's fee, and the same whichever doctor is chosen. The amount is a business decision, not set here.
- **Optional software subscription for doctors:** a flat monthly fee for tools (follow-up and recall, note templates, analytics). Not tied to the number of patients sent.
- **Instant-consult surcharge:** drop from this version. It would sit inside the professional fee and be shared. If wanted, make it part of the platform's own fee.
- **Legal gates:** the online healthcare services requirements in section 6 (platform provider duties), and a lawyer's view on whether a platform fee charged to the patient is outside the fee-splitting ruling.

### R2. Caregiver booking
- **Family-paid service fee:** a fixed amount or a stated percentage of the visit price, shown to the family as its own line. The caregiver is paid the stated hourly rate times hours.
- **Statutory deduction:** if the Gig Workers Act applies to caregivers, the platform deducts and remits the contribution (one guide says 1.25% per job; confirm) and shows it on the caregiver's statement.
- **Recurring visits:** allowed; each visit is confirmed and paid on its own.
- **Legal gates:** whether caregivers are gig workers or employees, whether routing home care needs a facility licence, and insurance.

### R3. Packages (medical tourism)
- **Fixed fee per confirmed booking**, charged to the hospital, the same amount for every package of the same category. Charged when the hospital confirms, not at discharge.
- **Facility subscription (optional):** tiers sell tools (profile, enquiry dashboard, languages, analytics), never placement or ranking.
- **Tax lines:** the package itself follows the hospital's tax treatment (private healthcare for non-citizens is taxable at 6%); the platform's fee is a separate line.
- **Legal gates:** advertising rules for overseas marketing, and a lawyer's view on fees tied to bookings for facilities.

### R4. Pharmacy
- **No fee for routing prescriptions or choosing a pharmacy.**
- **Flat monthly subscription** for tools (stock flags, reports, repeat reminders), and a **flat delivery service fee** if the platform arranges delivery.
- Legal gates: pharmacy and poisons rules on payment and delivery for prescription medicines (not researched).

### R5. Later
- **Employer or insurer plans** and **verification API:** a flat annual fee for access, no per-patient steering.
- **Memberships and bundles:** only after counsel reviews prepaid medical services.

## 4. Settings (replaces the single commission)

A fee schedule per kind (`consult`, `care`, `package_booking`, `pharmacy`, `subscription`):
- `model`: `flat_service_fee`, `percent_service_fee` or `subscription`. The old `percent_of_professional_fee` is kept only as a disabled legacy value so old payments still read correctly.
- `amount` or `percent`, `payer` (patient, family or facility), `effective_from`, `changed_by`, `reason`.
- A kill switch per line: when off, the platform charges nothing for that kind and the professional is paid in full.
- Old payments keep the model they were created under.

Money flow in code: the professional's fee is a separate payment line to the professional; the platform fee is a separate line to the platform. Today both are one payment with a platform fee column and professional payouts in batches, so this is a change to the payment flow, not only to settings.

## 5. Tax

Separate lines on every payment and invoice:
1. Professional fee: exempt from service tax for doctors' consultation fees if itemised; healthcare for non-citizens is taxable at 6% from 1 July 2025 (see the source above for exemptions).
2. Platform fee: a service by the platform. The service tax rate and whether it is taxable are for the accountant. A recent guide puts the general rate at 8% and the earlier 2025 reports said 6%; sources conflict, so do not hard-code a rate.
3. Registration: the platform may need to register for service tax once it passes the taxable threshold; confirm with the accountant.

The existing tax setting stays configurable per line.

## 6. Gates before charging real money

1. **Online healthcare services guideline (MOH, 2025).** It sets minimum standards for platforms offering online healthcare: [terms must state when professionals are not employed by the platform; a board or senior management member must be a registered doctor; a physical office in Malaysia; screening of professionals and patients; a grievance process; emergency care, complex treatments and mail delivery of controlled drugs are out of scope](https://dnh.com.my/new-guideline-on-online-healthcare-services). The primary circular (Bil. 16, May 2025) has not been read for fee or advertising rules.
2. **Real credential checks.** Registry checks are still mocks. "Verified with a valid practising certificate" cannot be claimed until they are real.
3. **Payments live** with a licensed provider that settles to the professional and the platform separately, tested against a live account.
4. **Gig workers:** Perkeso registration and integration if caregivers are covered.
5. **Counsel and accountant sign-offs** on section 8 and section 5.
6. **Public terms:** fee schedule, refund policy, and the disclosure that professionals are not employed by the platform.

## 7. Acceptance criteria

- A consultation payment produces two lines: the professional fee settled to the professional in full, and the platform fee settled to the platform. The professional's statement never shows a deduction for the platform.
- The platform fee does not change with the doctor chosen.
- Turning off a fee line charges nothing and pays the professional in full; old payments are unchanged.
- The patient sees professional fee, platform fee and tax before paying; the invoice repeats them.
- A caregiver statement shows any statutory contribution as its own line when that setting is on.
- The package fee is charged on hospital confirmation, once, and is the same for the same category.
- The platform holds no customer balance: refunds are issued through the provider.
- The access matrix and Malay text tests cover all new routes and screens.

## 8. Legal questions for counsel (not answered here)

1. Does a fixed platform fee charged to the patient, for a platform that assigns patients to doctors, fall outside the medical council's fee-splitting ruling? Does the ruling reach platforms and facilitators at all? (As reported it addresses hospitals, insurers and TPAs.)
2. Does settling funds through a licensed provider keep the platform outside Bank Negara's e-money rules?
3. Are caregivers, locums or doctors "gig workers" under the Gig Workers Act, and what must the platform deduct, register and remit?
4. Is a flat fee to a hospital per confirmed booking acceptable under the rules for facilities and for marketing to overseas patients?
5. Do pharmacy rules limit a delivery or subscription fee for prescription medicines?
6. What is the correct service tax treatment and rate for each of the platform's fees?
7. Do the online healthcare services guideline's platform duties require registration or notification, and how are they enforced?
8. Prepaid memberships and bundles for medical services.

## 9. Open questions

- What fixed fee amounts are acceptable to patients, hospitals and pharmacies? Test with a small group.
- Will the payment provider offer split settlement in Malaysia on the terms needed? (Unverified.)
- Who pays the provider's cost: the platform or the patient?
- Which doctor on the board or management will satisfy the guideline's requirement?