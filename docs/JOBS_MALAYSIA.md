# Jobs, shifts and locum cover in Malaysia

Code: `server/jobsMy.ts` (rules, locum profiles), the `/api/jobs` routes in `server.ts`, and `src/components/JobMarket.tsx` with `JobMarketMy.tsx`. Tested on a scratch database (36 API checks) plus unit checks of the eligibility rules. Foreign-practitioner rules are from web research (Oct 2026) and **unconfirmed**.

## What a listing now carries
- **State** (13 states and 3 federal territories) and **sector** (public, private, other). Older listings get a state inferred from their city.
- **Pay in MYR** as a structured range and period (month, day, hour or shift), checked for sense (maximum not below minimum, plausible caps per period). The old free-text pay line is generated from it.
- **Role** (doctors only, nurses only, or both) and **type**, now including **Locum** with dated shifts (date and start/end time; a locum listing needs at least one future shift).
- **Employer** linked to the facility register (the same register as medical tourism). The listing shows whether the facility's **licence has been checked and is unexpired**.
- **Foreign applicants**: whether the employer considers practitioners registered abroad, whether it helps with registration and the work permit, and free-text notes.

## Who may post
- A **private-sector** post must be linked to a facility with a checked, unexpired licence, and the poster must be staff of that facility or an admin. A facility whose licence has not been checked, or has expired, cannot advertise.
- **Public-sector** and **other** posts may be unlinked. They are shown as "licence not checked" (government hospitals are not in the register and are described as exempt from the private facilities licensing law, so they are never shown as checked).
- This is stricter than before, when any practitioner could post for any named hospital. Admins add facilities and assign staff under Medical tourism > Facilities.

## Who may apply (checked on the server, and shown on the button with the reason)
1. The practitioner is verified.
2. The role matches (doctors only / nurses only).
3. Their **annual practising certificate (APC) is valid on the last shift date** (or today, for non-dated roles). The date is the licence expiry on their profile.
4. If registered **outside Malaysia**, the listing must say it considers foreign-registered practitioners.

## Locum profiles
- A verified practitioner lists the states they can work in, specialties, a minimum rate, availability dates and a note, and can hide the profile.
- **Facility staff and admins** browse locums (filter by state, role, specialty, maximum rate, and a date on which they are free). Only verified practitioners with a **currently valid APC** are listed, and a date filter also requires the APC to be valid on that date. The listing shows the APC validity and whether the practitioner is registered in Malaysia.
- An employer can send an **invitation** (optionally tied to a listing). The practitioner is notified; **their contact details are not shared**, and they decide whether to reply (for example through the secure mailbox). Invitations are limited to 20 per day per employer and audit-logged.

## Foreign-registered practitioners: what the research says (unconfirmed)
- Doctors must register with the MMC and hold a current APC; specialists must be on the specialist register.
- A **temporary practising certificate is described as not for employment or locum work** (short training, research or teaching stints; the stated length differs between sources).
- Foreign applicants are reported to apply through a prospective employer, with primary source verification of degrees; graduates of non-recognised universities are reported to sit a provisional registration exam.
- No official source was found on the work-permit process for doctors or nurses; the employer normally handles it.
The app therefore **does not treat a foreign registration as a right to practise**: it only lets an employer say it considers such applicants and will sponsor the process, and it tells applicants to get that in writing.

## Not built
- Salary benchmarks by grade or state (no reliable data source), applicant tracking beyond "applied", interview scheduling, and closing or editing a listing from the UI.
- Public-sector grading (UD/Gred codes, contract medical officer rules) and government posting systems.
- Nurse-specific rules (Nursing Board APC process and foreign-nurse hiring) beyond the shared checks.
- Verification that a facility staff account really speaks for the employer, beyond the admin assignment.
- A route for practitioners registered abroad to start MMC registration inside the app.
