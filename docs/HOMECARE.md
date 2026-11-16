# Family home care

A family (a patient account) asks a verified caregiver to visit someone it cares for. The caregiver accepts or declines, the family pays, and after the
visit the caregiver leaves a note the family can read.

Code: [homecare.ts](../server/homecare.ts) (routes and storage), [homecareRules.ts](../server/homecareRules.ts) (price, times, state machine),
[FamilyHomeCare.tsx](../src/domains/homecare/FamilyHomeCare.tsx) (patient screen: **Find Care > Family Home Care**),
[CaregiverRequests.tsx](../src/domains/homecare/CaregiverRequests.tsx) (caregiver screen: **Patient Care > Home Care Requests**, shown only to caregivers).
Tests: [homecare.test.ts](../tests/homecare.test.ts), [homecare-rules.test.ts](../tests/homecare-rules.test.ts).

## Flow

1. **People you care for.** The family adds each person (name, relationship, address for the visit, care needs). Up to 10; the address is required to ask for a visit.
2. **Request.** Pick a verified caregiver, the person, a date, a start time and whole hours (1 to 12). The visit must start at least an hour from now and within 120 days.
3. **Accept or decline.** The caregiver has 48 hours. A decline needs a reason, which the family sees. Accepting gives the family 24 hours to pay.
4. **Pay.** Through the existing payment flow (sandbox in development, Stripe when configured, FPX and wallets for Malaysia). Paid means **confirmed**, and only then does the caregiver see the address.
5. **Complete.** After the visit starts, the caregiver marks it complete with a note (at least 10 characters). The family reads the note.
6. **Cancel.** The family can cancel at any stage. A confirmed visit is refunded in full with the usual notice (see [PAYMENTS_MALAYSIA.md](PAYMENTS_MALAYSIA.md)); later cancellations are not refunded.

States: `requested`, `accepted`, `confirmed`, `completed`, `declined`, `cancelled`, `expired`. Unanswered requests and unpaid accepted visits expire (checked every 5 minutes and whenever a list is read).

## Rules the server enforces

- Only a caregiver who is verified, has a current certificate on the visit date, and has set an hourly rate can be asked. Pending, rejected, expired, suspended or rate-less caregivers are not listed and are refused if asked directly.
- The price is the caregiver's hourly rate times the hours, worked out on the server. The platform commission and service tax apply as for consultations.
- A caregiver cannot be double-booked: accepted and confirmed visits block their time (visits are in Malaysia time).
- A family sees only its own people and visits; a caregiver sees only requests addressed to them. The address is hidden from the caregiver until the visit is paid.
- Every state change is written to the audit log and sends a notification.
- The caregiver is paid through the normal payouts process: the earning waits for completion plus the hold period (`PAYOUT_HOLD_DAYS`, default 7).

## Caregiver sign-in

Caregivers are practitioner accounts whose profile role is `caregiver` (see [phase-1.md](phase-1.md)). They set their hourly rate on the Home Care Requests screen
(it uses the profile `fee`). In demo mode, `demo.caregiver@careverified.test` / `DemoPass123` is a verified caregiver, and the demo patient has two sample people.

## Known gaps

- One visit at a time: no repeating schedules.
- No ratings or reviews of caregivers, no in-app chat, no live tracking or check-in.
- Nurses (LJM) are not included; only caregivers.
- A caregiver cannot change a confirmed visit; they can only complete it, and the family cancels.
- Insurance, background checks beyond the Phase 1 caregiver tier, and emergency handling are not covered.
- The refund notice and the platform commission are the existing global settings, not set per caregiver.
