# Personal data breach response

Draft runbook. Have Malaysian counsel review it before launch. The timings below come from law-firm commentary on the PDPA (Amendment) Act 2024 (breach notification reported as taking effect 1 June 2025), not from the Act itself.

## What the law is reported to require
- Notify the Personal Data Protection Commissioner **as soon as practicable** after becoming aware of a breach. Many commentators use **72 hours** as the working benchmark; the app uses it as an internal target.
- Notify affected individuals if the breach is likely to cause **significant harm**. Commentary says within **7 days**; sources differ. The app uses 7 days as an internal target.
- Keep a **breach register** (commentary: at least 2 years).
- A Data Protection Officer must be appointed and notified to the Commissioner (reported from the same date).
- Failure to notify is reported as an offence (fine up to RM250,000 and/or imprisonment).

## Roles
- **Incident lead**: the named DPO (`DPO_NAME`), or an admin acting for them.
- **Technical lead**: whoever can investigate logs, rotate secrets and restore service.
- **Counsel**: contacted for any breach that may need notification.

## Steps
1. **Detect and log (clock starts).** Admin > Privacy centre > Admin > Breach register > *Log incident*. Use the time you became aware. This sets the Commissioner (72 h) and individuals (7 day) targets and reminds admins daily if overdue.
2. **Contain.** Revoke sessions and secrets (`SESSION_SECRET`, `RECORD_SIGNING_SECRET`, payment keys), disable affected accounts or features, preserve logs (`GET /api/admin/audit-log`). Mark the incident *contained*.
3. **Assess.** What data (identity, IC numbers, health data, credentials, payments)? How many people? Is significant harm likely (health data, identity theft, discrimination)? Record severity and, in the register, whether individuals must be told.
4. **Notify the Commissioner.** Through the Commissioner's channel as counsel advises; record the date with *Mark Commissioner notified*.
5. **Notify individuals** if significant harm is likely: plain language, what happened, what data, what we are doing, what they can do, who to contact. Record with *Mark individuals notified*.
6. **Notify others** if relevant: payment provider, processors, affected practitioners, regulators of practitioners if their credentials were exposed.
7. **Close.** The register refuses to close an incident until the Commissioner notification is recorded (or a reason notification was not needed is given) and, where required, individuals have been told. Write what was learned in the notes.
8. **Review.** Fix the cause, update this runbook, and add a test or monitoring.

## Practice
Run a tabletop exercise before launch: log a test incident, work the checklist, and confirm the overdue reminder reaches admins.
