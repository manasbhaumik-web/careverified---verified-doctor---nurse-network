# Clinic and pharmacy pages (`/for-clinics`, `/for-pharmacies`)

Code: [AudiencePage.tsx](../src/components/AudiencePage.tsx) (layout), [forClinics.ts](../src/content/forClinics.ts) and
[forPharmacies.ts](../src/content/forPharmacies.ts) (words, English/Malay/Chinese), [PartnerEnquiryForm.tsx](../src/components/PartnerEnquiryForm.tsx)
(the "ask to join" form), [JoinNetwork.tsx](../src/components/JoinNetwork.tsx) (the three doors on the landing page), and on the server
[partners.ts](../server/partners.ts). Malay and Chinese are a developer draft: have a native reader check them.
See also [PRACTITIONER_PAGE.md](PRACTITIONER_PAGE.md) for doctors and nurses (that page predates `AudiencePage` and has its own layout).

## Why there is an enquiry form
Clinic, hospital and pharmacy accounts are created by the board. Before this, a visitor had no way to ask. The form posts to
`POST /api/partner-enquiries` (public, 5 per hour per connection, one per email per kind per day, a hidden field that ignores bots, consent required).
The board reads and handles enquiries under **Admin > Quality & Support > Partner enquiries**, and can mark them contacted, onboarded or declined, add a note, or delete them.
Tested in [partner-enquiries.test.ts](../tests/partner-enquiries.test.ts).

## Where each claim comes from
**Pharmacies**
| Claim | Source |
|---|---|
| Accounts are created by the board | `POST /api/admin/pharmacies` ([clinical.ts](../server/clinical.ts)) |
| Licence, pharmacist and retention certificate recorded with expiry and how checked; expiry blocks the workspace, hides the pharmacy, stops prescriptions and delivery; 30-day reminder | [PHARMACY_MALAYSIA.md](PHARMACY_MALAYSIA.md), `pharmacyLicence.ts` |
| Inbox, status updates the patient sees, activity log, reports, listing | `PharmacyWorkspace.tsx`, `pharmacy.ts` |
| Public prescription check with no sign-in | `/rx/<code>` ([VerifyDocument.tsx](../src/components/VerifyDocument.tsx)) |
| Dispensing pharmacist and poisons book entry number, can be compulsory | `POISONS_BOOK_REQUIRED` |
| Delivery with own rider, Grab, Lalamove, other; manual booking reference; cold chain; Malaysia only | [PHARMACY_MALAYSIA.md](PHARMACY_MALAYSIA.md), `pharmacyMy.ts` |
| Insurance panel and guarantee letter decisions | `pharmacyMy.ts` |
| Owner account adds staff as separate logins | `pharmacy.ts` staff section, `TeamTab.tsx` |
| Two-factor sign-in required in production | `REQUIRE_PHARMACY_2FA` (see `.env.example`) |
| Not built: insurer connections, co-payment, paying a balance, live Grab/Lalamove, Poisons Act groups | [PHARMACY_MALAYSIA.md](PHARMACY_MALAYSIA.md) |
| No charge to pharmacies today | No pharmacy fee exists in the code. This is a statement of fact, not a policy. |

**Clinics and hospitals**
| Claim | Source |
|---|---|
| Facilities and staff are added by the board; staff sign in as practitioners | `server/tourism.ts` admin facility and staff routes |
| Licence (Act 586) and JCI/MSQH recorded with expiry and how checked; expired accreditation never shown; unlicensed or expired facilities hidden and cannot advertise jobs | `tourism.ts`, [JOBS_MALAYSIA.md](JOBS_MALAYSIA.md) |
| Enquiry, itemised quote (refused without exclusions and cancellation terms), itinerary, messages, discharge summary by a verified doctor, expiring share link | [MEDICAL_TOURISM.md](MEDICAL_TOURISM.md) |
| Jobs and dated locum shifts, pay in ringgit; locum search; invitations keep contact details private; foreign-applicant settings | [JOBS_MALAYSIA.md](JOBS_MALAYSIA.md), `jobsMy.ts` |
| Records visible to staff only with the patient's agreement, per case; opening is logged | `tourism.ts`, audit log |
| Government hospitals can post public-sector roles, shown as "licence not checked" | [JOBS_MALAYSIA.md](JOBS_MALAYSIA.md) |
| Not built: self-service listing edits, editing or closing a post from the screen, deposits, HL7/FHIR, facilitators, applicant tracking beyond "applied" | [MEDICAL_TOURISM.md](MEDICAL_TOURISM.md), [JOBS_MALAYSIA.md](JOBS_MALAYSIA.md) |
| Payment for a quote is arranged directly with the facility | [MEDICAL_TOURISM.md](MEDICAL_TOURISM.md) |
| No charge to facilities today | No facility fee exists in the code. |

## Decide before recruiting
1. **Commercial terms.** "No charge today" is true but is not a policy. Decide what pharmacies and facilities will pay, if anything.
2. **A reply time.** The form promises none. Set one, assign someone to answer enquiries, and measure it.
3. **Listing and job edits.** A facility cannot edit its listing or close a post. That is a poor first month for an employer.
4. **Privacy notice.** Add partner contacts (name, email, phone, why we keep them, how long) to the privacy notice and retention schedule. Delete declined enquiries.
5. **Native review** of Malay and Chinese.
6. **Measure it.** Track visits, form starts, enquiries sent, and enquiries that become accounts. None of this is instrumented yet.
