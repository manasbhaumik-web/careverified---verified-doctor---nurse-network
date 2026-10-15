# Medical tourism

Code: `server/tourism.ts`, `src/components/MedicalTourism.tsx` (patients and visitors), `src/components/TourismDesk.tsx` (facility staff and admin), `src/components/SharedSummary.tsx` (public share page at `/share/<token>`). Tested end to end on a scratch database (67 API checks).

Visitors use the same patient account as everyone else (a passport registration is already supported). Rules below that are marked (?) are unconfirmed.

## How it works
1. **Facilities.** An admin adds a facility and records, each with *how it was checked*: its MOH private healthcare facility licence (number and expiry) and any JCI or MSQH accreditation (certificate number and expiry). A facility is listed only while active, accepting international patients and with an unexpired licence. Accreditation badges are shown only when verified and unexpired: an unchecked or expired claim is never displayed. Nothing is fetched from JCI, MSQH or the MOH.
2. **Search.** Patients filter by specialty, language, accreditation and services (interpreter, airport pickup, halal food, prayer room); accommodation partners are listed. Languages combine the facility's list with its verified practitioners' profile languages.
3. **Enquiry.** The patient describes the treatment, dates and needs and must agree that name, email and country are sent to the facility (recorded as a `medical_tourism` consent). Uploaded passport and records are visible to the facility only if the patient ticks that box, and the patient can change it at any time.
4. **Quote.** Facility staff send an itemised quote. The system refuses a quote that does not itemise the procedure, state **what is not included**, give **cancellation and refund terms**, and a future validity date. Service tax (section 5) is added to the healthcare lines for visitors when enabled. A new version supersedes the old one; the patient must tick that they read the inclusions, exclusions and cancellation terms to accept.
5. **Itinerary and messages.** Staff add dated itinerary items (arrival, tests, procedure, follow-up…); the patient is notified. Patient and facility exchange messages on the case.
6. **Treatment and discharge.** Staff mark treatment started. Only a verified doctor of the facility can write the discharge summary and follow-up plan (an admin cannot author clinical text). A case cannot be completed without it.
7. **Home doctor.** The patient creates a link (7 to 30 days, revocable, shown once) to the discharge summary. The page needs no sign-in and shows only the summary: no email, phone or files. Views are counted and audited.
8. **Problems.** "Report a problem" opens a support ticket (category *Medical tourism*, 4-hour first response) in the existing help desk.

## Staff
Facility staff are practitioner accounts an admin assigns to a facility (Admin > Medical tourism > Facilities). They see only cases of their facilities. Opening a case or file is audit-logged.

## Remote consultations before and after travel
Pre-arrival and follow-up video consultations use the normal booking flow (button on the case). Section 2 rules apply: a patient abroad must accept the cross-border notice, the doctor cannot give emergency care, and **no e-prescription or controlled medicine is issued to a patient outside Malaysia** (unless `TELE_CROSS_BORDER_RX=allow` after legal sign-off).

## Visa and MHTC information
The "Travel information" tab is a **draft** from web research: visitors from visa-exempt countries are reported to be able to enter on a social visit pass for consultation and treatment, some nationalities need a visa or a medical e-visa, and longer stays may need a hospital letter and an Immigration extension (the officer decides). MHTC is described as a Ministry of Health agency with member hospitals and facilitators. I found no official source confirming current MHTC registration rules, visa fast-tracks or MHTC-support-letter requirements: **do not present this as visa advice**; link to Immigration and MHTC after confirming their current pages.

## Not built
- **Package payment/deposit in the app.** The quote says payment is arranged directly with the facility. Adding a deposit would extend the payment handlers (section 5) and needs a refund policy agreed with facilities.
- **Facility self-service.** Facilities cannot edit their own listing; the admin does. Staff cannot yet add accommodation or interpreter details after creation except via the admin API.
- **Medical records transfer between systems** (HL7/FHIR) and **document translation**.
- **Travel facilitators/agents** (the intermediaries MHTC reportedly works with) have no role in the app.
- **Public browsing** is built: the landing page has an "International patients" section (English, Malay, Chinese) with the facility list, filters and travel notes, no account needed ([TouristAccess.tsx](../src/components/TouristAccess.tsx)). Enquiries still need a patient account. Arabic and Indonesian are not available.
- **Reviews of facilities** and a structured price comparison across facilities.
- **Legal review** of the quote terms, the cross-border consent and the share-link consent for medical tourism, plus the treatment of foreign patients' data (privacy notice, transfer register).
