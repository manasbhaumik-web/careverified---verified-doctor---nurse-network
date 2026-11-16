# Doctor growth: referral loop, follow-up and reminders, consult note drafting

Status: draft for review. Date: 2026-11-17.

## 1. Why

Doctors and specialists on MediCred have scheduling, earnings, reviews and a public profile, but nothing that brings them better patients, keeps patients coming back, or gives their time back. Malaysian doctors may not advertise or canvass, so growth has to come from legitimate channels: referrals from other doctors, continuity of care, and efficiency.

Evidence is thin (section 8). It comes from a code audit and a few news sources, not doctor interviews. Validate with 8 to 10 doctors (GP clinic owners, private specialists, locums) before building the large parts.

## 2. Goals and non-goals

Goals
- Make GP-to-specialist referrals a tracked loop, with the result going back to the referrer (feature A).
- Help doctors keep patients through follow-up plans and reminders (feature B).
- Cut the time spent writing consult notes, with the doctor always in control (feature C).

Non-goals
- No advertising, paid promotion, ranking by payment, or testimonial marketing.
- No fees, commissions or rewards for referrals, in either direction.
- No new patient-review features (the existing reviews feature needs a legal check, see section 9).
- No insurer or TPA claims tooling (separate, large work).
- No automatic signing of anything. The doctor signs every note and every referral.

## 3. Current state (verified in the code)

- `referrals` is write-only: a practitioner creates one (specialty, optional named recipient, reason of 10+ characters, urgency) and the patient is notified. There is no status, no inbox for the recipient, no clinical summary, no reply.
- `encounters` holds a SOAP note (subjective, objective, assessment, plan) per visit, with a `signed_at` and a sign route. It is the natural source for a referral summary and for note drafting.
- I found no follow-up or recall mechanism, and no appointment reminders, in the server code (only text in seed data). Check this before building feature B.
- Practitioners already have analytics, reviews and replies, profile settings, earnings and locum shifts. Patients can share their record with a practitioner by consent.
- Every route uses `requireRole`, so the access-matrix test covers new routes automatically.

## 4. Feature A: the referral loop

### Problem
Private hospital groups describe a weak referral system, and patients often skip the GP for a hospital. A referral today is a note to the patient. The specialist never receives it, the GP never hears back, and nobody tracks whether the patient was seen.

### Stories
- GP: "I refer a patient with a summary, see whether the specialist accepted, and get the outcome back."
- Specialist: "I receive referrals addressed to me, accept or decline them, and send a short outcome letter."
- Patient: "I agree to what is shared, see where my referral stands, and book with the specialist."

### Flow
`sent` -> `accepted` or `declined` -> `booked` -> `seen` -> `outcome_sent`. Side states: `expired` (no reply in 14 days), `withdrawn` (by the GP or the patient).

1. The referrer picks a named verified specialist (or a specialty, in which case the patient chooses the specialist from the directory). Open "pools" that push a referral to many specialists are not in scope.
2. The referrer may attach a summary taken from the patient's latest signed encounter. The summary is shared only after the patient consents in the app. The patient can withdraw consent, which hides the summary from the recipient.
3. The recipient sees a "Received" inbox with urgency and age. Accept or decline (a decline needs a reason). Decline and expiry notify the referrer and the patient so the patient can choose someone else.
4. When the patient books with the recipient, the booking links to the referral and the status moves to `booked`.
5. After the visit, the specialist sends an outcome note (short text, up to 2,000 characters). It goes to the referrer and, if the patient agrees, to the patient's record.

### Data and API
- Columns on `referrals`: `status`, `summary_encounter_id`, `consented_at`, `consent_withdrawn_at`, `responded_at`, `decline_reason`, `booking_ref`, `outcome_note`, `outcome_at`, `expires_at`.
- Routes: `GET /api/practitioner/referrals?box=sent|received`, `POST /api/referrals/:id/accept|decline|withdraw|outcome` (practitioner), `POST /api/referrals/:id/consent` and `.../consent/withdraw` (patient), `GET /api/me/referrals` (patient).
- An expiry job (same pattern as the other expiries) moves unanswered referrals to `expired`.
- Notifications and audit entries for every state change.

### Rules
- A recipient sees the clinical summary only while patient consent stands.
- Only the referrer, the named recipient and the patient can see a referral. Other practitioners and other patients cannot.
- Referrer and recipient must be verified and not expired.
- No fee, discount or reward is attached to any referral.

### Acceptance criteria
- Full path works: send, patient consents, accept, book, outcome, and the GP sees the outcome.
- Without consent the recipient receives the referral but not the summary; withdrawing consent removes the summary.
- Another practitioner or patient gets 403 or 404 on someone else's referral.
- An unanswered referral expires after 14 days and both sides are notified.
- Existing referral creation still works for old rows (they show as `sent`).
- Access matrix, Malay text and type-scale tests pass.

Effort: M. Depends on: nothing.

## 5. Feature B: follow-up plans and reminders

### Problem
Patients with ongoing conditions drift away between visits, often to a hospital. Doctors have no way to see who is overdue, and patients get no reminder.

### Stories
- Doctor: "When I sign a note I can set a follow-up date or a repeating review, and I can see who is overdue."
- Patient: "I get a reminder before the date and can book in one tap."

### Behaviour
1. Follow-up plan: when signing an encounter (or from a patient's page) the doctor sets a due date or a repeating interval (4 weeks to 12 months) and a short reason.
2. Reminders to the patient 7 days and 1 day before the due date, and at the due date if still open. Each links to booking with that doctor. Reminder text carries no clinical detail (for example "It is time for your follow-up with Dr X").
3. Appointment reminders: 24 hours and 2 hours before a booking, with the option to cancel or reschedule.
4. Attendance: the doctor marks a past booking as attended or no-show. Analytics shows no-show rate.
5. "Due for review" list for the doctor: open plans, overdue first, with one-tap "send a reminder now" (limited to once per 7 days per plan).
6. Patient can turn reminders off per doctor. Opted-out patients still appear in the doctor's list, marked as opted out.
7. When a follow-up is booked the plan links to the booking; when the booking completes, the plan closes or schedules the next one.

### Data and API
- Table `follow_up_plans` (id, patient, professional, source encounter id, due date, interval days, reason, status `open|booked|done|dismissed`, booking ref, opted out flag, last reminder at).
- Column on bookings for attendance (`attended`, `no_show`).
- Routes: `POST /api/follow-ups` and `PATCH /api/follow-ups/:id` (practitioner), `GET /api/practitioner/follow-ups?due=overdue|soon`, `GET /api/me/follow-ups` and `POST /api/me/follow-ups/:id/reminders` (patient opt out).
- A daily reminder job, using the existing notification pipeline and SMTP when configured.

### Acceptance criteria
- A plan set on signing appears in the doctor's list and sends reminders at 7 days, 1 day and the due date, each once.
- Reminder text contains no diagnosis or medicine names.
- A patient who opts out gets no reminders but stays on the doctor's list as opted out.
- Marking no-show updates the no-show rate in analytics.
- A doctor only sees their own plans; a patient only sees their own.
- Reminders respect Malaysia time (+08:00), and the job is safe to run twice.

Effort: S to M (reminders and plans), M for the attendance analytics. Depends on: nothing; pairs with the pharmacy repeat-prescription feature (its next fill date can be shown beside the follow-up).

## 6. Feature C: consult note drafting

### Problem
Documentation is the most time-consuming admin task for most clinicians in a global survey (vendor-sponsored, no Malaysian breakdown). Doctors here write SOAP notes by hand for every visit.

### Phasing
- C1: templates and carry-forward. Fully in our control and safe to build now.
- C2: optional AI-drafted notes. Do not build until the data-protection and vendor questions in section 9 are settled.

### C1 behaviour
1. Each doctor keeps their own note templates per specialty or visit type, with simple fill-in fields and reusable text snippets.
2. "Start from last visit" pre-fills the new SOAP note from the patient's last signed note by this doctor, clearly marked as copied so it is reviewed, not accepted blindly.
3. Templates are private to the doctor; the platform offers a few starter templates (general consult, hypertension review, diabetes review, child fever).

### C2 behaviour (gated)
1. The doctor types or pastes short bullet points, or a transcript, and asks for a draft SOAP note.
2. The draft is clearly labelled "AI draft" and cannot be signed until the doctor has edited or explicitly confirmed each section.
3. The platform never sends a patient's name, ID number, phone or address to the AI service; only the clinical text the doctor supplied, after removing those fields.
4. Off by default per doctor and per clinic. Every use is audited (who, when, which encounter), without storing the prompt text beyond the draft.

### Data and API
- Table `note_templates` (id, professional id, name, specialty, body JSON, created, updated).
- Encounter gets `copied_from_encounter_id` and, for C2, `ai_drafted` with the sections still unreviewed.
- Routes: `GET/POST/PUT/DELETE /api/practitioner/note-templates`; `POST /api/encounters/:kind/:refId/draft` (C2 only).

### Acceptance criteria
- C1: a doctor can create a template, apply it to a new encounter, and start from the last visit; copied text is marked until edited.
- C1: one doctor cannot read or edit another doctor's templates.
- C2: signing is refused while any AI-drafted section is unreviewed; the AI feature is off unless enabled.
- C2: no personal identifiers appear in what is sent to the service (verified by a test on the outgoing payload).
- Existing encounter and sign tests keep passing.

Effort: C1 S to M; C2 M to L plus legal and vendor work. Depends on: nothing for C1.

## 7. Suggested order
1. B (reminders and plans first; smallest, and helps every doctor on day one).
2. A (referral loop; biggest effect, needs both sides to take part).
3. C1 (templates), then C2 only after legal sign-off.

## 8. Evidence and its limits
- Over 70% of private GP clinics reportedly earn under RM60,000 a month (MMA survey, via The Vibes); another body disputes the survey method (Code Blue, May 2026).
- MMA says TPAs strain clinics financially (FMT, March 2025). Not addressed here.
- Private hospital bodies say the referral system is weak and patients skip GPs (NST, July 2026; Code Blue, November 2026). Supports feature A.
- Documentation is the most time-consuming admin task for 88% of surveyed clinicians (vendor-sponsored global survey). Supports feature C; not specific to Malaysia.
- MMC guidance discourages self-advertising and canvassing; a secondary summary of the Medicines Advertisement Board rules says patients may not review specific doctors or treatments. Needs checking against the official texts.
- No Malaysian data was found on no-show rates, online booking use, or time spent on documentation.
- No doctor interviews, usage data or willingness-to-pay data.

## 9. Legal and compliance flags (not legal advice)
- Whether the MMC fee-splitting ban (May 2026) or canvassing rules cover anything near referrals. This spec attaches no money to referrals; keep it that way until confirmed.
- Patient consent and PDPA duties for sharing a clinical summary between doctors, including withdrawal and retention.
- Whether the existing Patient Reviews feature conflicts with MMC or Medicines Advertisement Board rules. Check against the official texts now, separate from this spec.
- Reminder content and channel (SMS, email) under the PDPA; keep clinical detail out.
- For C2: sending clinical text to an outside AI service, cross-border transfer, a data-processing agreement, and whether an AI draft changes the doctor's professional responsibility.

## 10. Success measures
- Share of referrals that reach `seen` and `outcome_sent`; median time to respond (A).
- Share of follow-up plans that end in a booking within 14 days of the due date; no-show rate before and after reminders (B).
- Minutes per signed note and share of notes started from a template (C1).
- Doctor weekly active use and number of referrals sent per GP (all).

## 11. Open questions
- Will specialists respond to referrals inside the platform, or do they prefer their current hospital channels? Pilot with 3 GPs and 3 specialists who already work together.
- Is a 14-day expiry right, and should urgent referrals expire faster?
- Which channel should reminders use (in-app, email, SMS), and who pays for SMS?
- Do doctors want attendance marking, or would it feel like extra work?
- Should referral outcomes become part of the patient's record automatically, or only on the patient's choice?