# Payments for Malaysia and international patients

Status: **Stripe test-mode integration exists but has not been run against a live Stripe account.** This note records what the app does, what is unconfirmed, and the decisions still needed. Nothing here is tax or legal advice.

## Gateway decision
**Keep Stripe for launch; add a Malaysian aggregator later if wallets matter.** Reasons: it is already integrated, supports international cards for tourists, and (per Stripe's own docs) supports **FPX** and **GrabPay** in Malaysia. Stripe requires a Malaysian business registration number to process FPX.

| Method | Offered now | How |
|---|---|---|
| Credit / debit card (local and international) | Yes | Stripe `card` |
| FPX online banking | Yes, Malaysian patients only | Stripe `fpx` |
| GrabPay | Yes | Stripe `grabpay` |
| Touch 'n Go eWallet | **No** | Not confirmed on Stripe: needs an aggregator |
| Boost | **No** | Not confirmed on Stripe: needs an aggregator |
| DuitNow QR | **No** | Not confirmed on Stripe: needs an aggregator |

To add the missing wallets, evaluate Malaysian aggregators (for example Billplz, HitPay, Revenue Monster, Razer Merchant Services, iPay88: not assessed here) for fees, settlement time, refund support, and whether they cover FPX, TNG, Boost, GrabPay and DuitNow QR. The checkout code (`server/payments.ts`) isolates the provider calls, so a second provider is added beside the Stripe branch. Do not write that integration without the provider's API documentation and a test account.

Set the offered methods with `PAYMENT_METHODS` (default `card,fpx,grabpay`). Confirm each method is enabled in your Stripe account before going live.

## Service tax (SST)
Reported position (law-firm and clinic commentary, Oct 2026, **unconfirmed**): from 1 July 2025 private healthcare services carry **6%** service tax, mainly affecting **non-citizens** (citizens exempt); online consultations billed to foreign patients are reported as taxable; medicines reported as exempt. The registration threshold for healthcare was reported as RM1.5 million, but sources conflict, and it is unclear whether the taxable person is the practitioner/clinic or the platform (the platform's commission may be a separate digital service).

What the app does:
- **Off by default.** Set `SST_ENABLED=true` (and `SST_RATE_PCT`, `SST_REG_NO`) only after an accountant confirms who must charge it.
- When on, SST is added to the professional fee for **foreign visitors** (passport holders or a non-Malaysian nationality). MyKad holders are treated as citizens/residents and exempt: **permanent residents hold a MyKad too, so confirm how they should be treated.**
- The platform commission is calculated on the fee only. Tax is passed through: practitioner earnings and the admin "gross" exclude it, and the admin view shows "SST collected".
- The receipt shows seller name, SST registration number, fee, SST and total. It is a receipt, not a certified tax invoice: confirm what RMCD requires.
- A refund returns the whole amount including tax.

## Indicative currency
Charging is always in MYR. To show "about USD 33.39", set `FX_RATES_JSON='{"USD":0.21,"SGD":0.28}'` (rate per 1 MYR) and `FX_RATES_AS_OF`. No rates are built in; with none set, nothing is shown. Update the rates regularly or connect a rate service.

## Refund and cancellation policy
`refundPolicy(region)` in `server/paymentPolicy.ts` drives both the cancel route and the text shown at checkout (and `GET /api/payments/policy`).
- Appointments cancelled at least `REFUND_FULL_DAYS` days ahead (default **1**; `REFUND_FULL_DAYS_MY` / `REFUND_FULL_DAYS_INTL` set each region) are refunded in full. Later cancellations are not refundable.
- An instant consultation nobody joins within 10 minutes is refunded automatically.
- Both regions currently have the same defaults: whether tourists need a different window is a business decision.
- Refund timing and method behaviour (FPX, GrabPay) depend on Stripe and the bank: confirm with Stripe before promising timelines. The text only says processing can take several business days.

## Open items
- [ ] Run a real Stripe account end to end (checkout, webhook, refund) for card, FPX and GrabPay.
- [ ] Decide on an aggregator for Touch 'n Go, Boost and DuitNow QR.
- [ ] Accountant: SST registration, who charges it, the PR question, receipt format, rate and threshold.
- [ ] Business: refund windows per region, who bears payment fees on refunds.
- [ ] Practitioner payouts are not automated (see `/api/me/earnings`).
