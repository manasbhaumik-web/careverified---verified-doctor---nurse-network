# Content and UX for Malaysia

Covers section 9 of the task list: landing page, language, medical library, demo data. Tested on a scratch database (46 API checks, including migration of an older database) and in the browser.

## Landing page
- **Language.** The language switcher (English, Bahasa Malaysia, Chinese, Indonesian, Arabic) now translates the navigation and all five hero slides into **Bahasa Malaysia and Chinese** (`src/locale/landing.ts`, `src/locale/i18n.ts`). Indonesian and Arabic still fall back to English. The rest of the page is English. **A native speaker must review the Malay and Chinese text before launch**; it was drafted by the developers.
- **Testimonials are never invented.** The hard-coded testimonials (named people, "Statutory Verified" tags) were removed. The section now shows only testimonials that:
  - come from a patient who has **paid for care** on the platform,
  - the patient agreed to publish (first name and last initial only, optional state),
  - an **admin approved** (Admin panel > Patient testimonials),
  and the patient can withdraw at any time (Help > Share your experience). With none approved, the section is hidden. The seed script creates one testimonial marked "Demo testimonial, not a real patient".
- **Trust messaging corrected to what the system does.** Removed or reworded claims the product could not support:
  - "< 3 min average on-call response" (invented statistic) → the real 10-minute refund rule.
  - "ISO 27001" badge, "256-bit cryptographic ledger" → removed; "Encrypted session (HTTPS)", "audit trail: every decision is logged".
  - "Telemedicine Act 1997 compliant" → the Act is not in force; now "built around MMC telemedicine guidance". The footer line cites the Medical Act 1971, the MMC telemedicine guideline and the PDPA.
  - "Direct statutory synchronisation / matched against MMC & LJM registries" → registers are checked by hand: MMC register for doctors, confirmation with the Nursing Board for nurses (no public nurse register), with how and when recorded; APC suspension is "checked hourly".
  - "MOH telehealth guideline compliant" → "built around MoH and MMC telemedicine guidance".
- Verification messaging elsewhere already says whether a licence was checked in Malaysia or abroad (section 1).

## Medical library
- Articles can carry a **Malay version** (title, summary, body) with a language toggle in the reader that follows the interface language, plus a **"Malaysia in numbers"** box where every figure has a source link and date.
- Three new topics: **dengue**, **diabetes** and **high blood pressure** (English and Malay). They are labelled **"Draft: not yet reviewed by a registered doctor"**, credited to the "MedCred editorial team" (not to any doctor), and the Malay text is flagged as an unreviewed translation. **A registered doctor must review the clinical content and a native-speaking clinician the translation before the draft labels are removed.**
- Figures used (all sourced in the article):
  - NHMS 2023, Institute for Public Health: diabetes in 15.6% of adults (9.7% known, 5.9% raised glucose not known), high blood pressure in 29.2% (17.3% known, 11.9% not known).
  - Dengue: 123,133 cases and 100 deaths in 2023 (66,102 and 56 in 2022); 121,082 cases and 116 deaths by epidemiological week 51 of 2024. The full-year 2024 total and 2025 figures are not included: no reliable source was found.
- The reader now renders headings, bullets and bold text instead of raw markdown for all articles.

## Demo data
- Every seeded practitioner is marked **"Demo profile · not a real practitioner"**, and their registration numbers now start with `DEMO-`. The original demo numbers (for example `MMC-87429`) looked like real MMC and Nursing Board numbers, so they were renamed everywhere, including the landing page sample; an older database is migrated automatically on start.
- **Six new Malaysian demo practitioners** (four doctors, two nurses) across Penang, Sarawak, Sabah, Johor, Perak and Negeri Sembilan, with languages such as Tamil, Iban, Kadazan-Dusun and Cantonese, specialist and full registration types, and numbers like `DEMO-MMC-0101`. **No ratings or reviews are invented** (zero).
- The seed script also adds a paid demo visit so the demo patient can submit the demo testimonial.

## Still to do
- Native review of all Malay and Chinese text; Indonesian and Arabic translations; translating the rest of the landing page, the app screens and the FAQ.
- Clinician review of the three drafts, then more topics (for example kidney disease, tuberculosis, mental health).
- Malay versions of the FAQ and the existing articles.
- Real testimonials: none exist yet.
