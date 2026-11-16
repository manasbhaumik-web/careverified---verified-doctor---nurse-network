# Revenue model: teleconsultation and caregiver booking first

Status: draft for review. Date: 2026-11-17.

## 1. Scope and principles

The core of the platform is teleconsultation and caregiver booking. Packages (medical tourism), pharmacy and the other functions support those two. This spec sets how the platform earns, what must be true before money is taken, and how revenue is measured.

Principles
1. Take a transparent share of completed services; never charge for ranking, visibility or safety checks.
2. Keep verification free for the people who supply the network (doctors, caregivers); charge on completed bookings and, later, to organisations that benefit.
3. The patient or family sees one honest price: the fee, service tax, and any surcharge, before paying.
4. No money is taken until the gates in section 7 are met (live payments, payouts, legal sign-off).
5. Every rate is a setting with an audit trail, not a constant in code.

No prices or rates in this spec are decided. Figures marked "example" are for arithmetic only.

## 2. Current state (verified in the code)

- One global commission, `PLATFORM_COMMISSION_PCT` (default 15, allowed 0 to 50), applied to the professional fee before service tax for every payment kind (`booking`, `consult`, `care`). Service tax is added on top and passed through, not income (`server/payments.ts`).
- Earnings become payable after the service is completed and `PAYOUT_HOLD_DAYS` (default 7) have passed. Payouts are run by the board in batches with a bank file and an approval step; they are not automated (`server/payouts.ts`).
- Refunds: an instant consultation that no practitioner joins in 10 minutes is refunded automatically; appointment refunds follow a policy by patient region; home-care cancellations are refunded with the usual notice.
- Packages: a 10% reservation deposit (minimum RM50) and an 8% facilitator success invoice raised at discharge (`server/packages.ts`, `server/facility.ts`). I did not verify whether the deposit moves real money.
- Pharmacies pay nothing today.
- The card provider (Stripe) has never been exercised against a live account (a note in `server/payments.ts`). Development runs in a sandbox with no real money.
- An admin payments view already reports gross, platform fee and service tax collected.

Consequences: the platform receives the full payment and pays professionals later, and there is only one commission for everything.

## 3. Revenue lines

### R1. Teleconsultation commission (core)
- A percentage of the doctor's fee, charged on completed consultations. Rate to be decided per kind (see R6 settings).
- Rule: the doctor sets their fee within limits the platform publishes; the patient sees fee plus tax before paying.
- Leakage controls: payment protection and automatic refunds, a signed visit record, prescriptions and follow-up reminders only inside the platform.
- Legal gate: the commission on a doctor's fee needs a lawyer's view (section 8, item 1).

### R2. Caregiver booking commission (core)
- A percentage of the hourly rate times hours, charged when the visit is completed.
- Add recurring bookings (a weekly or monthly pattern the family approves once, each visit confirmed and paid separately). Repeat visits are what make this line steady.
- Leakage controls: the same as R1, plus a visit note the family reads, a backup-caregiver offer when a visit is cancelled, and liability cover once available.
- Legal gates: caregiver status, home-care licensing, and insurance (section 8, items 2 to 4).

### R3. Instant consultation surcharge
- An optional, clearly labelled extra for on-demand consults, shown before payment. It is part of the fee subtotal, so the doctor and the platform share it by the same commission.
- Must not be charged when no doctor joins (the existing automatic refund covers the whole amount, surcharge included).

### R4. Memberships and bundles (later)
- A family plan or a follow-up bundle (for example a consult plus one follow-up within a window), paid up front, redeemed per consult.
- Needs refund rules for unused balance and a legal view on prepaid medical services. Not before R1 and R2 are live and stable.

### R5. Supporting functions
- Packages: replace the discharge-based success fee with a fee on confirmed bookings, because a hospital that handles everything may never report discharge. Taken from the deposit or invoiced to the hospital. Legal gate as for R1.
- Pharmacy: a transaction or delivery fee only once paying in the app exists (pharmacy spec, feature B2). No fee for routing or steering prescriptions.
- Corporate and insurer plans: an employer or insurer pays for staff consults. Later, and only after evidence of demand.

### R6. Rate settings (new)
- Move from one global rate to a rate table per kind: `consult`, `care`, `package_booking`, `pharmacy_order`. Each has a percentage, an effective date, who changed it and why.
- Changes apply to new payments only; existing payments keep the rate they were created with (`platform_fee_sen` already stores it per payment).
- The admin can set a lower introductory rate with an end date (for example to attract supply), shown in the settings table.
- Environment variable stays as the fallback so existing deployments behave the same.

## 4. What the user sees

- Patient or family: one price breakdown before paying: fee, service tax, any surcharge, total. No commission is shown to them (the fee is the doctor's or caregiver's).
- Doctor or caregiver: each statement line shows the fee, the commission and the net (the payout statements already exist), with the rate in force on that date.
- Pharmacy and facility: a clear fee schedule on the join page before signing up.

## 5. Reporting

An admin revenue view (extends the existing payments report):
- Gross merchandise value, platform fee, service tax collected, refunds, net revenue, by kind and by month.
- Take rate (platform fee divided by gross fee subtotal) by kind.
- Payout liability: earned but not yet paid, and amounts inside the hold period.
- Refund rate and the share refunded by the automatic 10-minute rule.
- Leakage signals: repeat patient-and-professional pairs that book once and never again within 60 days.
- Export to CSV for the accountant.

## 6. Unit economics worksheet (example only)

For one completed service: fee F, rate r, service tax rate t.
- Patient pays: F x (1 + t).
- Platform fee: F x r.
- Professional earns: F x (1 - r).
- Payment provider cost: set by the provider's published rates (unverified, confirm by quote).

Example: F = RM100, r = 15%, t = 6% (assumption, configurable) gives patient RM106, platform RM15 before provider costs, professional RM85. Contribution per service is the platform fee minus provider cost minus support cost per service. Break-even volume needs real provider and support costs; none have been gathered.

## 7. Gates before charging real money

1. Payments live: Stripe tested against a live account, webhooks verified, refunds proven end to end.
2. Payouts: bank details, verification, batch approval, and either automation or a documented manual run; minimum payout and hold days decided.
3. Legal sign-offs (section 8) on commissions, holding funds, and caregiver status.
4. Accountant sign-off on service tax, income recognition, withholding tax for non-resident practitioners, and e-invoicing (the payouts notes already list these as undecided).
5. Public terms: fee schedule, refund policy by region, cancellation and no-show rules.

Until all five are met, keep the platform in sandbox for patients, or charge no commission.

## 8. Legal and compliance flags (not legal advice)

1. Whether a percentage of a doctor's fee falls within the medical council's May 2026 fee-splitting ruling, and whether it reaches platforms and facilitators (the ruling as reported addresses hospitals, insurers and TPAs).
2. Whether holding patients' money before paying professionals needs a payment or e-money licence; if so, use a licensed provider that pays out directly.
3. Whether caregivers are independent contractors or treated as employees, given the platform sets price and rules.
4. Whether routing home care needs an Act 586 licence and the commencement status of Act 802; liability insurance for visits.
5. Prepaid memberships and bundles for medical services, and refund of unused balance.
6. Service tax on the platform's own fees, and on foreign patients' medical services.
7. Advertising rules for how the fee and any discount are presented.
8. Data protection for payment, identity and health data, including overseas patients.

## 9. Acceptance criteria

- A rate table per kind exists; a new payment records the rate in force at that time; changing a rate does not alter old payments.
- Setting or changing a rate is admin only, audited with a reason, and rejected outside 0 to 50.
- The surcharge in R3 is shown before payment, included in the automatic refund, and shared by the same commission.
- A recurring caregiver series creates separate visit requests, each accepted and paid on its own; cancelling one does not cancel the series.
- The revenue view reconciles to the payments table: gross minus tax minus refunds equals net fee plus professional earnings, to the sen.
- Access matrix test covers every new route; Malay text test covers new screens.

## 10. Rollout

1. Settings and reporting (rate table, revenue view). No change in what patients pay.
2. Make money real: live payments and payouts, behind a feature flag with a small pilot.
3. R1 and R2 live with the legal sign-offs; R3 surcharge as an optional pilot with a few doctors.
4. Recurring caregiver visits, then packages fee-on-confirmation.
5. Pharmacy fee, memberships and corporate plans only after the above are stable.

## 11. Success measures

- Net revenue, take rate and refund rate by kind, monthly.
- Repeat rate: share of patients and families who book the same professional again within 60 days.
- Share of caregiver bookings that are recurring.
- Time from completion to professional paid (should be near the hold period plus a few days).
- Leakage signal rate (section 5).

## 12. Open questions

- What rates do doctors and caregivers accept? Test with a small group before fixing them; an introductory rate may be needed to attract supply.
- Does a fee-on-confirmation for packages work with hospitals that expect payment only after discharge?
- Who bears the payment provider's cost: the platform, or added to the patient's price?
- Is a surcharge for instant consults acceptable to patients, or should instant be priced by the doctor?
- Which accountant and which lawyer will give the sign-offs in sections 7 and 8, and by when?