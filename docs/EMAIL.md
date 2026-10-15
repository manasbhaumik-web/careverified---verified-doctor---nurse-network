# Email and password recovery

Code: [mail.ts](../server/mail.ts) (sending, outbox, admin routes), [mailTemplates.ts](../server/mailTemplates.ts) (every message in English, Malay and Chinese),
[accountRecovery.ts](../server/accountRecovery.ts) (forgotten password), [AccountRecovery.tsx](../src/components/AccountRecovery.tsx) and
[AdminEmail.tsx](../src/components/AdminEmail.tsx) (screens). Library: nodemailer. Tests: `mail-templates`, `mail`, `session-security`.

Before this the platform could not send email: every notification was in-app only, so a doctor who was not signed in never learned they were verified,
and there was no way to recover a password. Malay and Chinese wording is a developer draft: have a native reader check it.

## What is sent
Service messages only. No marketing, no newsletters.

| Event | Template | To |
|---|---|---|
| Practitioner creates an account | `practitioner_welcome` | the practitioner |
| Board approves, rejects, or asks for more | `verification_approved`, `verification_rejected`, `verification_info_needed` | the practitioner |
| Profile suspended (by the board or when the licence lapses), reinstated, renewal due | `profile_suspended`, `profile_reinstated`, `licence_expiry_soon` | the practitioner |
| Clinic or pharmacy sends an enquiry | `partner_enquiry_received` and `partner_enquiry_admin` | the sender, and every admin |
| Payout sent or failed; bank verified or rejected | `payout_paid`, `payout_failed`, `bank_verified`, `bank_rejected` | the practitioner |
| Staff reply to a support ticket | `support_reply` | the requester (no message text in the email) |
| Forgotten password | `password_reset`, `password_changed` | the account owner |
| Go-live check | `test_email` | the admin who clicks "Send myself a test email" |

Never in an email: a password, a full bank account number, clinical details, or the text of a support reply.
The language is the one the person uses in the app (saved when they register and whenever they change language while signed in).

## Setup
1. Choose a provider that offers SMTP (any: your own mail host, SES, Mailgun, SendGrid, Brevo...). Create SMTP credentials.
2. Set `MAIL_TRANSPORT=smtp` (or just `SMTP_HOST`), `SMTP_PORT` (587, or 465 for TLS from the start), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and **`APP_URL`** (the public https address).
3. Set up **SPF, DKIM and DMARC** for the sending domain, or mail from a new domain will land in spam. `MAIL_FROM` must be an address on that domain.
4. Open Admin > Operations & Payments > **Email**, check there are no warnings, and click **Send myself a test email**.

Modes: `smtp` sends; `log` sends nothing and prints the link in the server console (development, the default outside production);
`off` sends nothing and tells the board (the default in production until `SMTP_HOST` is set).

## The outbox
Every attempt is a row in `email_outbox` (who, which template, language, status, attempts, error). Statuses: `sent`, `failed` (after three tries), `skipped`
(email off, no `APP_URL`, or a reserved address such as `.test`, which is how demo accounts avoid real mail), `logged` (development).
**Message bodies are not stored** when sending for real, because a reset link in the outbox would be a way into an account. Rows are deleted after 90 days.
A failed email is not retried later: the board sees it and can follow up. Sending never delays or fails the request that caused it.

## Forgotten password
`/forgot-password` asks for an email and always gives the same answer, whether or not an account exists. If one does, a link goes out:
- The token is random, stored only as a hash, works **once** and expires in **30 minutes**. A newer request replaces an older link. At most 3 a hour per account, 10 a hour per connection.
- The link is built from `APP_URL`, never from the request, so a forged `Host` header cannot send someone to another site.
- Choosing a new password signs the person out **everywhere**, clears a lockout, and emails "your password was changed".
- **Admin accounts cannot be reset by email.** A stolen mailbox must not be a way to the board's account.
- Accounts with an authenticator app still need the code at the next sign-in, so a reset does not bypass two-factor.
- Closed accounts and reserved addresses get nothing.

## Two security problems found and fixed on the way
1. **Forgeable sessions.** If `SESSION_SECRET` was not set, session tokens were signed with a key written in the source code. Anyone could make a valid session for any user, including the first
   admin, whose id is fixed. Now there is no built-in key: without `SESSION_SECRET` a random key is made for the process. **Set `SESSION_SECRET` in production** (and rotate it if you ever deployed without one).
2. **Sessions that could not be revoked.** Deleting a person's session rows did not end signed-token fallbacks, so a stolen cookie kept working after a password change for up to seven days.
   Tokens now carry their issue time, and changing a password rejects every token issued before it.
Both are covered by [session-security.test.ts](../tests/session-security.test.ts); the first test fails if the old key is brought back.

## Not done
- **Email addresses are not verified at sign-up.** Anyone can register with an address they do not own. Add a confirmation link before relying on email for anything sensitive.
- **Patients get no email** beyond password recovery: no booking confirmations, reminders or receipts.
- Failed emails are not queued for a later retry, and bounces and complaints from the provider are not read back.
- No per-user opt-out (everything sent is a service message). If marketing is ever added it needs consent and an unsubscribe link.
- Native review of Malay and Chinese; a deliverability check with the real provider (spam score, rendering in Gmail and Outlook).
