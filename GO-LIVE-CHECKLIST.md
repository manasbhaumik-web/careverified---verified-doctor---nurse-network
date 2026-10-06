# CareVerified go-live checklist

Status of the platform today: all five build phases are done and tested against a local SQLite database with test-mode payments.
**It is not ready for real patients until every item in section A is closed.** Sections B and C can follow in order.

How to use this: each line has a rough effort (S = under a day, M = a few days, L = a week or more) and the owner who has to act.
Tick a box only when the "Verify" step has been done and someone other than the implementer has seen it work.

---

## A. Blockers (do not launch without these)

### A1. Legal, regulatory and clinical sign-off  (Owner: you + lawyer + clinical lead)

- [ ] **Telemedicine legality.** A Malaysian healthcare lawyer confirms the service model is lawful: Medical Act 1971, MMC telemedicine guidance, Private Healthcare Facilities and Services Act (do you need a facility licence?), Poisons Act. (M, external)
- [ ] **Data protection.** PDPA 2010 compliance review for health data (sensitive personal data): lawful basis, consent text, retention periods, cross-border transfer if hosting abroad, breach-notification process, data-protection officer if required. (M, external)
- [ ] **Privacy Policy and Terms of Service written and published.** The footer links on the landing page currently point nowhere (`href="#"`). The sign-up checkboxes say users accept them. (M)
- [ ] **Consent wording approved.** Patient consent covers: storing health data, sharing with chosen practitioners, quality audits by verified peers with names hidden. Version is `2026-11` in `server.ts`; bump it whenever the text changes. (S)
- [ ] **E-prescription and certificate validity.** Lawyer confirms electronically signed prescriptions and medical certificates are acceptable to pharmacies and employers, and whether a certified e-signature scheme is required. (M, external)
- [ ] **Clinical governance owner named.** A registered doctor is accountable for clinical content: triage red flags, formulary, interaction rules, certificate limits (14 days), prescription rules. (S)
- [ ] **Pharmacist reviews the built-in formulary** (`server/formulary.ts`), or it is replaced with a licensed drug database (MOH formulary, MIMS). The current list is a small curated set. (M, external)
- [ ] **Controlled-drug list confirmed** against current Malaysian schedules. The `RESTRICTED` list in `server/formulary.ts` is a starting point only. (S)
- [ ] **Medical indemnity / professional liability insurance** for the platform and a clear position on practitioner indemnity. (M, external)
- [ ] **Practitioner agreement** (independent contractor terms, fees, conduct, record-keeping, confidentiality). (M)
- [ ] **Emergency protocol approved.** SOS flow and red-flag wording reviewed by a clinician; emergency numbers confirmed (default 999 / 112, set `EMERGENCY_NUMBERS` for other countries). (S)

### A2. Remove false and unverified claims from the product  (Owner: you; Effort: S)

_Done in code: HIPAA, SOC-2, AES-256, registry-sync/"real-time API" claims, the invented statistics, fabricated testimonials and regulator badges were removed or reworded to match what the system really does (manual board review). Still open: naming consistency, the "24/7" wording, Package Manager text, and a final read-through by your lawyer._

The interface still carries claims the platform cannot back up. Regulators and users treat these as misleading.

- [x] Remove or substantiate **"HIPAA compliant / HIPAA secured"** (landing page lines ~117, 163, 173, 1145; `App.tsx` ~727, 812, 841; Admin package text). HIPAA is a US law; use accurate wording such as "designed with PDPA in mind" only if your lawyer agrees.
- [x] Remove **"SOC-2 Type II Certified"** (landing page ~473, 1145) unless an audit report exists.
- [x] Remove **"AES-256 encryption"** claims unless you actually enable encryption at rest (see B1) and can describe it accurately. Today data is encrypted only in transit by TLS, once you deploy behind HTTPS.
- [x] Replace the **animated statistics** on the landing page ("2,400+ verified professionals", "150+ partner hospitals", "58,000+ consultations", "99.9% uptime") with real numbers from the database, or delete them (`LandingPage.tsx` `useCounter(...)`).
- [ ] Remove **"Malaysian Medical Council (MMC)" / "LJM" regulatory-standards badges** unless there is a formal relationship with those bodies.
- [ ] Review the **"24/7"** wording against reality: coverage is only as good as the on-call roster (Admin → Operations → 24/7 roster coverage shows uncovered hours).
- [ ] Rename the product consistently. Code and UI mix **CareVerified**, **MedCred** and **MediCert** (`@medicert.com`, "MediCert Core Dev", page title). Pick one and search for the others.
- [ ] Review the Admin "Package Manager" text and any "marketplace extension" wording that implies features that do not exist.

**Verify:** search the repo for `HIPAA`, `SOC-2`, `AES-256`, `MedCred`, `MediCert`; open every public page and read it as a regulator would.

### A3. Production hosting, database and storage  (Owner: engineering; Effort: L)

Today: one Node process, SQLite file in `./data`, uploads on local disk, background timers inside the web process. `vercel.json` targets Vercel serverless, which **cannot** run this app (no persistent disk, no shared memory, no long-lived timers).

- [ ] **Choose a host that runs a long-lived Node server** (VM, container platform, Fly.io, Render, Railway, AWS ECS, etc.) in a **Malaysian or Singapore region** if your lawyer requires data residency. Delete or replace `vercel.json` and the `build:vercel` script. (M)
- [ ] **Move SQLite to a managed database** (PostgreSQL recommended; Supabase works too). The schema is plain SQL in `server/*.ts`. Entity data (professionals, bookings, chats, reviews, jobs, patients, packages) is currently held in memory and snapshotted to a `records` table after each write. This must become real tables before running more than one server instance. (L)
- [ ] **Move uploads to object storage** (S3-compatible, private bucket, server-side encryption). Code: `server/documents.ts` writes to `data/uploads/`. Downloads must keep going through the authorised route. (M)
- [ ] **Run exactly one app instance until the in-memory state is gone**, or two instances will diverge and overwrite each other. (S)
- [ ] **Scheduled jobs** (licence expiry checks, consult queue timeouts, booking hold release) run via `setInterval` in the web process. Fine for one instance; for several, move to a worker or cron. (M)
- [ ] **Encryption at rest** on the database volume/service and on object storage; encrypted backups. (S)
- [ ] **Backups and restore test.** Automated daily backups, point-in-time recovery if available, retention policy, and one documented, timed restore drill. Include the `RECORD_SIGNING_SECRET` (see A4) in the backup plan. (M)
- [ ] **HTTPS everywhere**, HTTP redirects to HTTPS, HSTS (already sent by `helmet`), certificate auto-renewal. Session cookies become `Secure` automatically when `NODE_ENV=production`. (S)
- [ ] **Set `NODE_ENV=production`** and confirm the production Content-Security-Policy in `server.ts` does not break the app (it allows self, Google Fonts and `https:` images). Test every page with the browser console open. (S)
- [ ] **Reverse proxy / trust proxy.** `server.ts` sets `trust proxy` to 1 in production; confirm that matches your load balancer so rate limits and audit logs record real client IPs. (S)
- [ ] **Move off `node:sqlite`**: it is marked experimental in Node. Do this as part of the database move. (included above)

**Verify:** restart the server, redeploy, and kill the process mid-request: no data is lost; two browsers see the same data; restore a backup into a fresh environment and sign in.

### A4. Secrets and first admin  (Owner: engineering; Effort: S)

- [ ] **Generate and store production secrets in a secrets manager**, not in `.env` committed anywhere: `ADMIN_PASSWORD`, `RECORD_SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- [ ] **Set `RECORD_SIGNING_SECRET` explicitly.** If unset it is generated and stored in the database; a database loss would then make every prescription/certificate signature unverifiable. Keep it backed up separately.
- [ ] **Set a strong `ADMIN_EMAIL` / `ADMIN_PASSWORD`** before the first start, sign in, and change the password. Do not use `admin@careverified.local`.
- [ ] **Create named admin accounts** per person; stop sharing one. (There is no admin-creation screen yet: see C1.)
- [ ] Rotate any credential that has ever appeared in a log or chat.

### A5. Remove sample and test data  (Owner: engineering; Effort: S)

- [ ] Delete the seed professionals, verification requests, jobs, reviews and articles in `src/data.ts`, or load only real content. The 7 sample practitioners appear as **verified** in the public directory, can be assigned as peer reviewers, and show invented ratings and reviews.
- [ ] Seeded articles in the Medical Library: replace with doctor-authored, reviewed content, with author, date and review date shown.
- [ ] Seeded job posts: remove (they are shown as real shifts).
- [ ] Remove the fabricated stats, avatars and "demo" strings (search for `example.com`, `Ahmad Fauzi`, `Dr. Tan`, `/assets/malaysian_*`). Replace stock avatars with real profile photos or neutral placeholders.
- [ ] Confirm the production database starts empty except the admin account.

### A6. Real payments  (Owner: you + finance + engineering; Effort: M)

Today: test mode (no real money). Stripe code is written but **has never run against a live Stripe account**.

- [ ] Company/merchant account approved (Stripe Malaysia, or an FPX/e-wallet provider if you prefer; the payment code has one provider interface in `server/payments.ts`). Healthcare merchants often need extra review. (M, external)
- [ ] Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; register the webhook URL `/api/payments/stripe-webhook` for `checkout.session.completed`. Set `APP_URL` to the public HTTPS URL (used for the return links).
- [ ] **Test the full flow in Stripe test mode first**: booking payment, consult payment, expired card, abandoned checkout, webhook retry, refund from Admin → Operations, auto-refund when no doctor answers in 10 minutes. (M)
- [ ] Confirm `ALLOW_SANDBOX_PAYMENTS` is **not** set to `true` in production. With no Stripe key and `NODE_ENV=production`, checkout correctly refuses.
- [ ] Decide fees: `CONSULT_NOW_FEE`, each practitioner's fee, `PLATFORM_COMMISSION_PCT`. Tax treatment (SST on platform fee?) and receipts/invoices as required by law. (S, finance)
- [ ] **Practitioner payouts.** Earnings are tracked but not paid out automatically. Decide: manual bank transfers with a monthly statement, or Stripe Connect. Document the process and its owner. (M)
- [ ] Refund and cancellation policy written in plain language and shown at checkout (currently: full refund if cancelled at least one day before; automatic refund if no doctor joins). (S)
- [ ] Reconciliation: finance can export payments and match them to the Stripe dashboard. (S)

### A7. Account safety  (Owner: engineering; Effort: M)

- [ ] **Password reset** by email. Not built. Without it, locked-out users have no recovery. Needs an email provider (A8). (M)
- [ ] **Email verification** at sign-up so accounts are tied to a real inbox. (S)
- [ ] **Two-factor authentication** for admins and practitioners (TOTP at minimum). Not built. A stolen practitioner password can issue prescriptions. (M)
- [ ] **Admin account management**: invite, disable, change role, force password reset. Today the only admin is the seeded one. (M)
- [ ] **Session management screen**: see and revoke active sessions. (S)
- [ ] Confirm account lockout (5 failures, 15 minutes) and rate limits are acceptable, and add alerting for repeated lockouts. Note that anyone can lock a known email by failing logins. (S)

### A8. Notifications beyond the website  (Owner: engineering + you; Effort: M)

Today everything is in-app only. A doctor who is not looking at the page will miss a waiting patient; a patient will miss a prescription.

- [ ] Choose providers: transactional **email** (Postmark, SES, SendGrid), **SMS/WhatsApp** (Twilio or a local provider), optional **push** (needs mobile app or PWA).
- [ ] Wire the existing notification function (`notify()` in `server/verification.ts`) to send email/SMS for: booking confirmed, payment received, consult waiting (to on-call doctors), doctor joined, prescription issued, certificate issued, verification decision, licence expiring, complaint outcome, support reply, SOS alerts to admins.
- [ ] Per-user notification preferences and unsubscribe for non-essential messages.
- [ ] **Admin SOS and overdue-ticket paging**: an SOS or urgent ticket must reach a human outside the website (SMS/phone). (S)
- [ ] Never put clinical detail in SMS or email subject lines; link to the signed-in page instead.

### A9. Reliable video  (Owner: engineering; Effort: S–M)

- [ ] Rent a **TURN service** (Twilio, Cloudflare, Metered, or self-hosted coturn) and set `ICE_SERVERS` with TURN credentials. The default uses a public STUN server only, which fails for many mobile and corporate networks.
- [ ] Test video between real devices on mobile data, Wi-Fi, and behind a firewall. Decide on audio-only fallback and a minimum-bandwidth message.
- [ ] Decide whether consultations are recorded (default: **not recorded**). If you ever record, update consent and retention.
- [ ] **Scheduled (booked) video visits** have no room yet; they are arranged by message. Either build booking-linked rooms or say so clearly on the booking page.

### A10. Security testing  (Owner: engineering + external tester; Effort: M)

- [ ] **Independent penetration test** of the deployed system, focused on: authorisation between patients/doctors/admins, document download, prescription verification and pharmacy console (PIN guessing), payment webhook, uploads, rate limits.
- [ ] Dependency audit (`npm audit`) and automated updates; remove unused packages (the repo still carries `@tailwindcss/vite`, `motion` etc., review them).
- [ ] Check the **audit log** is complete and tamper-resistant: ship it to write-once storage or a log service. Decide retention (e.g. 7 years for clinical actions).
- [ ] Review error pages and API errors for information leaks; add a global error handler that logs but returns a generic message. (S)
- [ ] Review CORS/CSRF stance: same-origin only with `SameSite=Lax` and an Origin check on writes (already in place); confirm if you add a mobile app or other domains.
- [ ] Secure the pharmacy console `/pharmacy`: PIN length (now 6 digits), per-pharmacy lockout, and PIN rotation. (S)

### A11. Operational readiness  (Owner: you; Effort: M)

- [ ] **Monitoring and alerts**: uptime check, error tracking (Sentry or similar), server metrics, database health, disk space, payment webhook failures, background job failures. Alerts go to a person who answers 24/7.
- [ ] **On-call rota for the platform itself** (engineering) and **clinical escalation contact** (a named doctor).
- [ ] **Incident response plan**: severity levels, who decides to take the service down, how patients are told, data-breach notification steps under PDPA.
- [ ] **Support team staffed** to the response targets shown to users (1 hour for safety concerns). Do not publish targets you cannot meet; they are configured in `server/quality.ts`.
- [ ] **Admin training**: verification review (what counts as proof, how the council register is checked and recorded), complaints, refunds, SOS handling, moderation, peer-review audits.
- [ ] **Doctor-coverage plan**: minimum number of rostered doctors per hour; what happens when nobody is online (the app already blocks consults and offers booking; confirm the wording).
- [ ] Written runbooks: restore from backup, rotate secrets, suspend a practitioner urgently, handle a data-subject request (export and deletion are API-only today; there is no admin screen for them).

---

## B. Should be done before or shortly after launch

### B1. Product gaps

- [ ] **Admin screens** for: audit-log search, data-export / deletion requests (`/api/me/export`, `/api/me/deletion-request` exist; no UI to fulfil deletions), user search and support lookup. (M)
- [ ] **Deletion process**: legal retention rules for clinical records vs. the patient's deletion right; implement anonymisation rather than hard delete where records must be kept. (M)
- [ ] **Verification against councils.** Today an admin looks up the licence and records the reference by hand. Investigate MMC/LJM data access or a verification partner to automate or at least cross-check. (M, external)
- [ ] **Scheduled video visits** (see A9) and **home-visit dispatch**. The old simulated dispatch was removed; if you offer home visits you need a real dispatch workflow and safety policy. (L)
- [ ] **Patient identity checks** (IC number validation, age, guardian consent for minors, elderly care proxy access). Registration stores an IC number but does not verify it. (M)
- [ ] **Referral completion**: referrals are issued to patients but a receiving doctor cannot see or accept them in-app. (M)
- [ ] **Lab and pharmacy integrations**: pharmacies use a PIN console; labs are patient-uploaded files. Real partners may want APIs. (L)
- [ ] **Wearable / device sync** for vitals (currently typed in). (L, optional)
- [ ] **Multi-language** (BM, Mandarin, Tamil) and accessibility audit (WCAG 2.1 AA) of the main flows. (M)
- [ ] **Accessibility check** specifically of the consultation room, payment dialog, SOS dialog and forms: keyboard, screen reader, contrast. (S)
- [ ] **Mobile**: responsive layout check on real phones; consider a PWA first, native apps later. Push notifications need this. (M)
- [ ] **Hospital/clinic accounts** and billing for the Clinical Shifts (job) board. Today any verified practitioner can post a job. (M)
- [ ] **SEO**: sitemap lists only verified profiles; confirm canonical URLs and the real production domain (code still contains `careverified.pro`). Public profile pages are client-rendered. (M)

### B2. Engineering quality

- [ ] **Automated tests in CI.** The scripted API suites used during the build (`e2e*.mjs`) were scratch files, not committed. Turn them into a committed test suite (Vitest/Jest + supertest) with a throwaway database, run on every pull request. Several older scripts have known stale checks. (M)
- [ ] CI pipeline: type-check, tests, build, `npm audit`, deploy to a staging environment first. (M)
- [ ] **Staging environment** mirroring production with Stripe test mode and fake notification sinks. Rehearse every release there. (M)
- [ ] Split `server.ts` into route modules and remove the remaining in-memory arrays after the database move. (L)
- [ ] Input validation with a schema library (zod) on every endpoint; today validation is hand-written per route. (M)
- [ ] Delete dead code (old dispatch types/localStorage keys in practitioner tabs, unused components). (S)
- [ ] Add database migrations (a tool, not `CREATE TABLE IF NOT EXISTS` in code). (M)
- [ ] Performance and load test: consult queue, polling endpoints (chat 2 s, signals 1 s, offers 4 s), and admin dashboards at expected peak. Consider WebSockets/SSE if polling load is high. (M)
- [ ] Log retention and PII scrubbing in application logs. (S)

### B3. Content and trust

- [ ] About page, contact details, company registration, clinical leadership names, complaints route, and how practitioners are verified, written truthfully.
- [ ] Practitioner profile standards: real photo, what the verified badge means, date last verified (shown today only as "verified").
- [ ] Review guidelines page (what is allowed), referenced from the report-review flow.
- [ ] Health-library editorial policy and medical review dates.
- [ ] Clear "this is not an emergency service" notices (present on Consult Now and SOS; confirm on the landing page and booking).

---

## C. After launch (first 90 days)

- [ ] Weekly review of: overdue support tickets, incidents, peer-review outcomes, reviews reported, practitioners flagged for licence expiry, uncovered roster hours, failed payments, refund rate.
- [ ] Monthly random **case audit** (Admin → Quality & Support → Peer review & audits) with a target sample size; publish aggregate results internally.
- [ ] Quarterly access review of admin accounts and the audit log; re-verify practitioners on their 12-month cycle (the system flags and auto-suspends overdue ones).
- [ ] Review the CPD target against current council rules each year (`CPD_ANNUAL_TARGET`).
- [ ] Patient and practitioner satisfaction survey; act on the findings.
- [ ] Revisit the built-in formulary and interaction rules every quarter with a pharmacist.
- [ ] Plan: 2FA for patients, mobile apps, hospital partnerships, insurance and corporate plans, chronic-care programmes.

---

## D. Environment variables reference

| Variable | Needed in production | Purpose |
|---|---|---|
| `NODE_ENV=production` | Yes | Secure cookies, CSP, disables sandbox payments |
| `APP_URL` | Yes | Public HTTPS URL (payment return links) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First start | Seeds the first admin account |
| `RECORD_SIGNING_SECRET` | Yes | Signs prescriptions and certificates; back it up |
| `DATA_DIR` | Until database move | Location of SQLite file and uploads |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Yes (for real payments) | Live payments |
| `ALLOW_SANDBOX_PAYMENTS` | **Never** `true` | Test payments |
| `PLATFORM_COMMISSION_PCT`, `CONSULT_NOW_FEE` | Yes | Fees (defaults 15% and RM 80) |
| `ICE_SERVERS` | Yes | JSON list including TURN credentials for video |
| `EMERGENCY_NUMBERS` | If not Malaysia | JSON list of `{label, number}` |
| `CPD_ANNUAL_TARGET` | Optional | Yearly CPD points shown to doctors (default 20) |

## E. Final go / no-go meeting

All of these must be a clear yes:

1. Legal sign-off recorded (A1) and misleading claims removed (A2).
2. Production database, storage, backups, and a successful restore drill (A3).
3. Real payment tested end to end in test mode and approved for live (A6).
4. Password reset, email verification and 2FA for admins/practitioners in place (A7).
5. Notifications reach people outside the website, including SOS and urgent tickets (A8).
6. TURN configured and video tested on real networks (A9).
7. Penetration test findings fixed or formally accepted (A10).
8. Monitoring, on-call and incident plan live, admins and clinical lead trained (A11).
9. Sample data removed; real doctors verified; roster covers the hours you advertise (A5, A11).
10. A soft launch plan: invite-only first weeks, a small number of verified doctors, daily review of tickets, incidents and payments, and a clear way to pause sign-ups.
