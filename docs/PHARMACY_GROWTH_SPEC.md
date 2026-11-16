# Pharmacy growth: repeat prescriptions, click-and-collect, stock flags

Status: draft for review. Author: product. Date: 2026-11-17.

## 1. Why

Pharmacies on MediCred today receive prescriptions, dispense, and deliver, but nothing brings them repeat customers or new revenue. The platform charges them nothing. This spec adds three features that give a pharmacy more business and give patients a reason to keep using the same pharmacy.

Evidence is thin (see section 8). The ranking comes from a code audit and a few web sources, not pharmacist interviews. Validate with 8 to 10 pharmacists before building the large parts.

## 2. Goals and non-goals

Goals
- Make chronic-medicine patients return to the same pharmacy (feature A).
- Let a patient reserve and later pay for a quoted order from a pharmacy (feature B).
- Cut wasted prescriptions sent to pharmacies that cannot fill them (feature C).

Non-goals
- No automatic refills. A repeat always comes from a prescriber's decision.
- No vaccination or other new clinical services (not currently allowed for Malaysian pharmacists).
- No insurer or medical-card connections, no live Grab or Lalamove booking (separate work).
- No full inventory sync with a pharmacy's point-of-sale system.

## 3. Current state (verified in the code)

- `prescriptions` has `items` (JSON), `valid_until`, `status`, `pharmacy_id`, `dispensed_at`. It has no repeat fields, and a prescription is dispensed once.
- Patients choose a pharmacy when they send a prescription (`/api/prescriptions/:id/send`). There is no saved "usual pharmacy".
- Payments support kinds `booking`, `consult` and `care`, through `setPaymentHandlers` (resolve, paid, refunded). There is no pharmacy payment kind.
- Payouts and bank details exist for practitioners only. Pharmacies are paid directly today; delivery fees are recorded but not paid through the platform.
- `/api/pharmacy/reports` already counts received, dispensed, could-not-fill, fill rate, response and dispense times, and top medicines.
- Not built, as the `/for-pharmacies` page says: co-payment, paying a balance in the app, insurer connections, live courier booking.

## 4. Feature A: repeat prescriptions and a usual pharmacy

### Problem
Chronic patients (blood pressure, diabetes, cholesterol) need the same medicines every month. Each time they must see the doctor or hunt for a pharmacy. The pharmacy loses the patient between fills.

### Users and stories
- Patient: "I choose my usual pharmacy once, and I am reminded when my next fill is due."
- Prescriber: "When I issue a long-term prescription, I can allow a set number of repeats at a set interval."
- Pharmacist: "I can see which of my patients are due, and I dispense each repeat with the same checks as the first."

### Behaviour
1. Prescriber sets, per prescription, `repeats_allowed` (0 to 5, default 0) and `repeat_interval_days` (14 to 90). Items on the poisons or controlled lists cannot carry repeats (see legal flags).
2. Dispensing a repeat records it, decrements `repeats_left`, sets `next_eligible_at = dispensed_at + interval`, and returns the prescription to an eligible state. A repeat cannot be dispensed before `next_eligible_at`. The original `valid_until` still caps the series.
3. Patient may set one usual pharmacy. "Send" defaults to it.
4. Reminders: notify the patient 3 days before `next_eligible_at`, and notify again at `next_eligible_at`. When the series ends, offer "Ask my doctor to renew".
5. Renewal request: the patient asks the prescriber; the prescriber approves (a new prescription is issued) or declines. Nothing is issued automatically.
6. Pharmacy inbox gains a "Due repeats" filter.

### Data and API
- Columns on `prescriptions`: `repeats_allowed`, `repeats_left`, `repeat_interval_days`, `next_eligible_at`.
- New table `rx_dispenses` (prescription id, pharmacy id, dispensed by, dispensed at, repeat number) so the first dispense and each repeat are all on record.
- Patient field `preferred_pharmacy_id`; `PUT /api/me/preferred-pharmacy`.
- `POST /api/prescriptions/:id/renewal-request` (patient), `POST .../renewal-request/:rid/decide` (prescriber).
- Existing dispense route changes to allow a repeat when eligible. Existing tests for single dispense must keep passing.

### Acceptance criteria
- A prescription with 2 repeats can be dispensed 3 times in total, each no earlier than the interval, and never after `valid_until`.
- A repeat attempted early is refused with the date it becomes eligible.
- A patient cannot set a pharmacy that is expired or inactive; if the usual pharmacy later expires, "send" falls back to the directory.
- Items on a restricted list cannot be given repeats.
- Every repeat is audited with the pharmacist who dispensed it.
- Access matrix and Malay text tests pass.

Effort: M. Depends on: nothing.

## 5. Feature B: click-and-collect with payment

### Problem
Today a patient sends a prescription and then deals with the pharmacy off-platform (price, pickup, payment). The pharmacy cannot confirm demand before preparing, and the patient cannot see a price first.

### Phasing
- B1 (reserve and quote, no money moves): the pharmacy quotes the order, the patient accepts, the pharmacy prepares it, the patient collects and pays at the counter.
- B2 (pay in the app): the patient pays online after the quote; the pharmacy is paid through the platform.

Build B1 first. B2 needs pharmacy bank details, settlement and refund rules, which is a larger change.

### Flow
`sent` -> `quoted` (pharmacy enters a price per item, delivery fee if any, within 24 hours) -> `accepted` (patient has 24 hours) -> `paid` (B2 only) -> `ready` -> `collected` or `delivered`. Side states: `declined`, `cancelled`, `expired`, `refunded`.

### Rules
- The quote is set by the pharmacy; the server stores item prices and the total. A patient cannot change them.
- A quote is only valid while the prescription is valid and, for repeats, only for the eligible repeat.
- If the pharmacy cannot fill, the order is declined with a reason and the patient is told; in B2 any payment is refunded in full.
- Delivery uses the existing delivery flow; cold-chain rules unchanged.
- Fees: no platform fee in B1. For B2, a pharmacy commission is a business decision (default 0 at launch); service tax follows the existing global setting.

### Data and API (B1)
- Table `rx_orders` (id, prescription id, repeat number, patient id, pharmacy id, status, quote JSON, total in sen, fulfilment `pickup|delivery`, timestamps, decline reason).
- Routes: `POST /api/rx-orders` (patient), `POST /api/pharmacy/rx-orders/:id/quote|ready|collected|decline`, `POST /api/rx-orders/:id/accept|cancel`.
- B2 adds payment kind `rx` using the same `setPaymentHandlers` pattern as home care, a pharmacy earnings branch in payouts, and pharmacy bank details with the same encryption as practitioners.

### Acceptance criteria (B1)
- Quote, accept, ready, collect works end to end, and expiry moves unanswered quotes and unaccepted quotes to `expired`.
- One patient cannot see another's orders; a pharmacy sees only its own.
- A pharmacy that is expired or hidden cannot receive new orders.
- Every state change is audited and notified.

Effort: B1 M, B2 L. Depends on: feature A only for repeat orders.

## 6. Feature C: stock flags and smarter routing

### Problem
Prescriptions go to pharmacies that cannot fill them. The reports already count "could not fill", which costs the patient time and the pharmacy its reputation.

### Behaviour
1. Each pharmacy keeps a short list of tracked medicines, pre-filled from its own `topMedicines` report, and sets each to `in stock`, `low` or `out` with one tap.
2. A flag older than 48 hours counts as `unknown`; it is never shown as available.
3. When the patient picks a pharmacy, each card shows how many of the prescription's medicines are flagged in stock, with the time of the last update (for example "2 of 3 in stock, updated today"). Pharmacies with the most in-stock medicines and fastest response sort first.
4. Patients never see quantities, only status. The wording makes clear it is not a guarantee.

### Data and API
- Table `pharmacy_stock` (pharmacy id, medicine key, status, updated at, updated by). Medicine key is the normalised name already used in `topMedicines`.
- `GET/PUT /api/pharmacy/stock`; `GET /api/pharmacies/directory` gains an optional `rxId` query that returns the availability summary.

### Acceptance criteria
- A pharmacy cannot edit another pharmacy's stock.
- A flag older than 48 hours is returned as `unknown`.
- The summary never reports a medicine as available unless the flag is fresh.
- Directory results stay the same for callers who do not pass `rxId`.

Effort: S to M. Depends on: nothing.

## 7. Suggested order
1. C (smallest, gives pharmacists a daily reason to open the app, and lowers failed sends).
2. A (builds retention).
3. B1, then B2 only after pharmacists confirm they want to be paid through the platform.

## 8. Evidence and its limits
- Independents win on trust, chains on price (a 2025 Klik report). Supports a verified pharmacy profile and a reason to return.
- The Malaysian Pharmacists Society wants dispensing fees separated from product margins (Code Blue, May 2025). Supports paid services later; not built here.
- Chronic-disease care and adherence support are seen as the realistic expansion for pharmacists (Code Blue, June 2026). Supports feature A.
- DOC2US claims 1,500 or more partner pharmacies for e-prescriptions (company-reported). A competitor already owns part of this flow.
- No pharmacist interviews, no usage data, no chain offer data, no current margin data.

## 9. Legal and compliance flags (not legal advice)
- Which medicines can carry repeats, and whether a repeat needs a fresh prescriber decision each time (Poisons Act groups; the medicine list does not carry the groups yet).
- Whether quoting and taking payment online for prescription medicines needs extra pharmacy or e-pharmacy approval; Alpro's co-founder has said there is no clear e-pharmacy framework.
- Price display rules for medicines, which the Malaysian Pharmacists Society has asked to delay.
- Personal data in orders and reminders under the PDPA, and who may see the patient's address and phone.
- Medicine availability claims and the risk of a stale flag being read as a promise.

## 10. Success measures
- Share of chronic patients who return to the same pharmacy within 35 days (A).
- Repeat dispenses per prescription with repeats allowed (A).
- Quote-to-accept rate and median time to quote (B).
- "Could not fill" rate and fill rate per pharmacy (C; both already in reports).
- Pharmacist weekly active use, and the share of pharmacies keeping stock fresh (C).

## 11. Open questions
- Will pharmacists keep stock flags up to date, or will they go stale? Test with 5 pharmacies for 4 weeks.
- Do prescribers want to set repeats, and which clinics would pilot?
- Should the platform charge a commission on paid orders, and how much?
- Which fulfilment mix do patients choose: pickup or delivery?
- How should an order be handled when the pharmacy can fill only part of a prescription?