# Data residency decision (PDPA 2010)

**Status: undecided. This needs an owner and Malaysian legal advice before launch.**

## What is stored, and where it lives today
- `data/careverified.db` (SQLite): accounts, consents, audit log, clinical records, prescriptions, payments.
- `data/uploads/`: private credential and lab documents.
- JSON collections inside the same database: practitioner profiles, bookings, chats.
- The repo also has a Vercel build (`npm run build:vercel`). Serverless hosting with a local SQLite file does not persist data, and the hosting region is chosen outside this code. Decide the real production host first.

## Questions to settle
1. Where will the database and uploads physically live (country and provider)?
2. Is any health data copied abroad (backups, logs, analytics, email or SMS providers, video/TURN servers, the payment provider)?
3. For each foreign transfer, which PDPA 2010 route applies (consent, contract necessity, a recognised destination)? The PDPA's cross-border rules and any 2024 amendments must be checked by counsel (unconfirmed).
4. Do foreign patients (medical tourism) bring GDPR or other regimes with them? Counsel should answer per source market.

## Options
| Option | Pros | Cons |
|---|---|---|
| Host in Malaysia (local cloud region or data centre) | Simplest PDPA story; builds trust | Provider choice and cost; fewer managed services |
| Host in Singapore or another nearby region | Mature cloud regions | Is a transfer outside Malaysia; needs a transfer basis and disclosure |
| Hybrid: records in Malaysia, non-health services abroad | Limits what leaves | More moving parts; must keep the split accurate |

## Legal framework (law-firm commentary, Oct 2026: verify with counsel)
- The 2024 amendment replaced the old "whitelist" with conditions-based rules in PDPA s.129. A transfer outside Malaysia needs either (1A) a destination whose law is substantially similar to the PDPA, or (1B) one that ensures an adequate level of protection, in both cases backed by a **Transfer Impact Assessment (TIA)** valid for **3 years**, or (2) an s.129(3) exception such as explicit consent (after a notice naming the classes of recipients and the purpose, recorded) or contractual necessity with no feasible alternative.
- The Commissioner issued cross-border transfer guidelines in 2025; read them before choosing.

## Recommendation
Choose **hosting in Malaysia** for the database and uploads if a suitable provider exists: it avoids a transfer for the core health data. This is a business decision for the owner; the code cannot make it. Whatever you choose, record every processor and its basis in the register below.

## What the app now does
- **Transfer register** (Privacy centre > Admin > Data transfers and processors): each processor, its country, the transfer basis and TIA date. The notice lists them. The readiness check fails if the register is empty, if a processor outside Malaysia has no basis, or if a TIA is missing or older than 3 years.
- Cross-border consults record the patient's country and require an acknowledgement (see section 2 of the task list).
- `DATA_HOSTING_COUNTRY` still drives the hosting sentence in the notice.

## To close this item
- [ ] Owner chooses the production host and region (see recommendation) and sets `DATA_HOSTING_COUNTRY`.
- [ ] Enter every processor (hosting, payments, email/SMS, video relay) in the register with country and basis; complete a TIA for any that rely on 1A/1B.
- [ ] Counsel confirms the basis for each transfer and the notice wording.
