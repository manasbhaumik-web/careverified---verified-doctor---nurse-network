# Practitioner payouts

Code: [payouts.ts](../server/payouts.ts) (rules and API), [PractitionerEarnings.tsx](../src/components/PractitionerEarnings.tsx) (practitioner screen, nav item **Earnings**),
[AdminPayouts.tsx](../src/components/AdminPayouts.tsx) (the board's desk, under **Operations & Payments**). Tests: [payouts.test.ts](../tests/payouts.test.ts) (18, through a running server).

It is a **manual, auditable process**, not automation. The platform works out what each practitioner is owed, the board sends the money from the
company's bank, and the platform records that it happened. It needs no payment-provider approval and no bank API. Automating the transfer
(Stripe Connect or a bank file upload service) can be added later without changing the ledger.

## The money
A patient pays the platform. For each paid consultation: `amount - service tax - platform commission = what the practitioner earns`.
Service tax is passed on and never income. The commission is fixed when the payment is made (`PLATFORM_COMMISSION_PCT`).

## When an earning becomes payable
Both must be true:
1. The visit is **completed** (a booking marked Completed, or an on-demand consult that ended).
2. `PAYOUT_HOLD_DAYS` (default **7**) have passed since the visit date. This is the window for refunds and disputes.

Until then it shows as "waiting" on the practitioner's Earnings page, with the reason. Payments for test (sandbox) mode are labelled.

## The run
1. **Bank details.** The practitioner adds a Malaysian bank account in their own name. It needs their password, is encrypted (AES-256-GCM), is shown masked,
   and **resets to "unverified"** when changed. The board is alerted.
2. **Verify.** The board checks the account holder name matches the practitioner's name, and ticks that it did. Nobody is paid until verified.
3. **Prepare a batch.** The board sees who is ready, what is skipped and why (no bank details, not verified, below `PAYOUT_MIN_MYR`, default **RM 50**: it rolls over).
   Preparing copies the amounts and the bank details into the payouts, locks the payments so none can be paid twice, and cannot be changed afterwards.
4. **Approve.** With `PAYOUT_FOUR_EYES=true` a different admin must approve. Approval re-checks that nothing in the batch was refunded in the meantime.
5. **Bank file.** Download a CSV (payout ID, beneficiary, bank, account number, amount, reference `MEDCRED <payout id>`, email). It holds full account numbers, so it is admin
   only and logged. Banks differ in their upload formats: adapt the columns once.
6. **Pay in the bank**, then **mark each payout paid** with the bank's reference and the date. The practitioner is notified and can download a statement
   (every visit, fee, commission and net). When no payout in a batch is pending the batch completes.
7. **If a transfer fails**, mark it failed with the reason. Its earnings are released into the next batch, the account goes back to "unverified" (wrong details are the usual cause),
   and the practitioner is told.

## Refunds after a payout
If a payment is refunded after it was paid out, the practitioner's **next** payout gets a negative adjustment for that amount, once. If the balance after adjustments is
below the minimum, it carries forward. Nothing is clawed back by hand. A refund between preparing and approving blocks the batch (cancel it and prepare again).

## Controls
- Every step is in the audit log. Account numbers never are.
- Only admins can run any of it. Practitioners see only their own money and statements.
- Bank file cells that start with `= + - @` are escaped so a spreadsheet cannot run them as formulas.
- Automatic erasure covers patients only. To close a practitioner's account the board removes their bank details (`DELETE /api/admin/payout-accounts/:id`). Payout records stay for accounting (amounts, dates, bank reference, last four digits) without the holder name or full number.

## Settings
`PAYOUT_ENCRYPTION_KEY` (**required in production**; losing it makes saved account numbers unreadable), `PAYOUT_HOLD_DAYS`, `PAYOUT_MIN_MYR`, `PAYOUT_SCHEDULE` (wording only), `PAYOUT_FOUR_EYES`.
In development a key is created in `data/.payout-key`, outside the database.

## Decide and confirm before relying on it
1. **Schedule, hold and minimum** are defaults (monthly, 7 days, RM 50). They are shown on the doctors' page. Confirm or change them.
2. **Tax (accountant).** Payouts are not reduced by any income tax. Withholding tax on payments to non-resident practitioners, and whether the platform must issue
   self-billed invoices or e-invoices, are not handled. Ask an accountant before paying anyone who is not a Malaysian tax resident.
3. **Retention.** Payout records (amounts, dates, references) are kept. How long is a legal question (counsel/accountant).
4. **Privacy notice.** Bank details are personal financial data. Add them (purpose, encryption, retention) to the privacy notice.
5. **Who may pay.** Only the board can mark a payout paid, and it trusts the board's word that the bank transfer happened. Reconcile with the bank statement every run.
6. **Key management.** Store `PAYOUT_ENCRYPTION_KEY` in your secrets manager and back it up separately from the database.

## Not built
- Automated transfers (Stripe Connect, a bank API, DuitNow bulk), non-Malaysian bank accounts (IBAN/SWIFT), a bank-statement import to reconcile automatically,
  per-practitioner payout schedules, partial payouts, and a payout approval chain longer than two people.
- Facility quotes (medical tourism) and locum pay are paid directly to the facility or practitioner, not through this process.
