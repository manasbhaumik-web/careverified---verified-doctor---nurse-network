# Doctors and nurses page (`/for-doctors`)

Code: [PractitionerPage.tsx](../src/components/PractitionerPage.tsx). Supply (doctors, nurses, facilities) is the launch constraint, so this page
recruits them. Every statement has a source in the product. If you change the product, change the page, and the other way round.
Malay and Chinese wording is a developer draft: have a native reader check it.

## Where each claim comes from
| Claim on the page | Source |
|---|---|
| Commission is X% of the fee, before service tax | `GET /api/payments/terms` reads `PLATFORM_COMMISSION_PCT` (default 15, capped at 50). Tax is passed through, not earned ([payments.ts](../server/payments.ts)). Tested in [practitioner-terms.test.ts](../tests/practitioner-terms.test.ts). |
| **Payouts are not automated** | Comment and behaviour in `payments.ts`: earnings are tracked, no transfers are sent. The page says so in a highlighted note. |
| Earnings page lists payments, commission, net; refunds are removed | `GET /api/me/earnings` (totals use paid rows only). |
| Joining steps and what is asked | `PractitionerSignUp.tsx`, `POST /api/register` (licence number, council, future expiry), document upload in `VerificationStatusCard.tsx`. |
| Checked by hand, how and when recorded, notified | Admin verification flow ([registries.ts](../server/registries.ts), `verification.ts`). No review time is promised because none is measured. |
| Who can join | `registries.ts`: MMC for doctors, LJM for nurses; dental, pharmacy and facility registers are catalogued with no roles; "another country's regulator" accepts doctors and nurses. |
| Foreign-registered practitioners treat patients outside Malaysia only | `practitionerMayTreat` in [telemedicine.ts](../server/telemedicine.ts). |
| Consult-now, prescriptions, certificates are for doctors | `care.ts` (online doctors only), `clinical.ts` ("Only verified doctors can issue ..."). Visit notes are open to any verified practitioner. |
| Patient refunded if no doctor joins in 10 minutes | `UNMATCHED_AFTER_MS` in `care.ts`. |
| Prescriptions: signed, code and QR, allergy and interaction screening, no controlled medicines | `clinical.ts`, formulary `RESTRICTED`. |
| MC for in-person visits only, no e-prescriptions abroad, first visit rule | `telemedicine.ts`, `clinical.ts`. The first-visit rule is the default policy and can be changed with `TELE_FIRST_VISIT`. |
| Locum shifts, verified practitioners only | `jobsMy.ts`, `JobMarketMy.tsx`. |
| Facility staff answer enquiries, quote, write discharge summaries | `tourism.ts` (staff are assigned by an admin; only a verified doctor of the facility writes the discharge summary). |
| CPD, specialty certificates, peer review | `PractitionerQuality.tsx`, `quality.ts`. |
| Support desk with targets and set hours | `quality.ts`, `supportMy.ts`. |
| Public listing shows name, specialty, city, council, licence number | The public lookup on the landing page. |
| APC expiry suspends automatically, checked hourly; 12-month re-verification | `verification.ts` (`setInterval` every hour). |
| Record access needs the patient's choice and is logged | Record sharing and audit log. |
| You set your own fee | Fee is part of registration and profile updates. |

## Gaps this page makes visible (decide before recruiting)
1. **Payouts.** A doctor's first question is "when do I get paid?" Today the honest answer is "ask the board". Decide the payout schedule and method, then build transfers (or at least a documented manual process) before recruiting at scale.
2. **Review time.** Verification is by hand with no target. Set one (for example five working days), measure it, and then publish it.
3. **Commission.** The default is 15%. Check it is a rate you want to put in front of doctors.
4. **Dentists, pharmacists and other professions** cannot register. Say so now or build their registers.
5. **Native review** of the Malay and Chinese text.
6. **Sitemap.** `/sitemap.xml` still lists `/about`, `/jobs` and India-based pages that this app does not have, on a hard-coded domain. Clean it up before relying on search traffic.
7. **Measure it.** Track visits to the page, clicks on "Create a practitioner account", accounts created and accounts verified. None of this is instrumented yet.
