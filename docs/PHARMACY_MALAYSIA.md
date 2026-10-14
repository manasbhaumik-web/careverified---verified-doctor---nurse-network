# Pharmacy and delivery in Malaysia

Rules below come from web research (Oct 2026) and the developers' reading, not from the statutes. A **pharmacist and a lawyer must confirm** them before launch.

## Licensing and registers
- Pharmacists are registered with the **Pharmacy Board of Malaysia** under the Registration of Pharmacists Act 1951 (Act 371). Premises and the sale of poisons are controlled by the **Poisons Act 1952 (Act 366)**; the Ministry's pharmacy division (pharmacy.moh.gov.my) licenses premises.
- No public online search for pharmacists or premises licences was found. The admin checks with the regulator (see the PHARMACY_BOARD entry in `server/registries.ts`) and records how.
- The app now stores, for each pharmacy: licence number, **licence expiry**, pharmacist name and registration number, **pharmacist retention certificate expiry**, licence type, and **how it was checked**. All are required to verify or renew.
- **Expiry is enforced**: when either date passes the pharmacy's workspace is blocked, it is hidden from the patient directory, and patients cannot send it prescriptions or request delivery. A reminder goes to the pharmacy 30 days before. Pharmacies verified before dates existed have no dates on file and are not blocked until an admin adds them (Admin > Pharmacies > Renew / update).

## Poisons Act classification (not populated)
Commentary says Poisons Act medicines fall into Groups A to D: A for wholesale, B on a practitioner's prescription, and C/D with entries in a prescription or poisons book, but **sources conflict on C and D**, and the Act was amended in 2025.
- `Drug.poisonGroup` exists in `server/formulary.ts` but is **deliberately empty**: each product's group must come from the official Poisons List through a pharmacist.
- Controlled medicines (the existing `RESTRICTED` list) are never e-prescribed.
- Each dispense records the **dispensing pharmacist** (defaults to the registered pharmacist) and an optional **poisons / prescription book entry number**. Set `POISONS_BOOK_REQUIRED=true` to make the entry number mandatory at every dispense until the rules are confirmed.

## Medicine names and NPRA registration
- Medicines are matched by generic name and the aliases in the formulary. The aliases list is small and has not been extended with Malaysian brand names.
- A prescriber may add the product's **NPRA registration number**. The app checks the format only: `MAL` + 8 digits (year, month, serial) + a category letter (reported: A scheduled poison, X non-scheduled, N health supplement, T traditional, H veterinary) + optional letters. It is **not verified against NPRA**: no public lookup was found (the NPRA's Quest3+ portal is for submissions).

## Home delivery
- Pharmacies tick "Home delivery", choose partners (own rider, **Grab**, **Lalamove**, other courier) and say whether they can do **cold chain**.
- The patient requests delivery for a prescription sent to that pharmacy, with a Malaysian address and a phone the rider can call. Delivery is **Malaysia only**.
- Status flow: requested, arranged (partner booking reference required for Grab/Lalamove), out for delivery (only after the prescription is marked ready), delivered (records who received it and **counts as dispensing**), failed (reason) or cancelled. The patient is notified at each step; a tracking link (https only) can be added.
- **There is no live integration with Grab or Lalamove** (no credentials or API specification were available). The pharmacy books with the partner and records the reference. The delivery fee is only recorded: it is paid to the pharmacy or rider, not through the app.
- **Cold chain**: medicines flagged cold-chain (insulin and anything with "vaccine" in the name, plus `COLD_CHAIN_DRUGS`) can only be delivered by a pharmacy that has said it can. The patient and pharmacist both see a refrigeration note (commonly 2 to 8 °C, do not freeze). The built-in list is tiny: a pharmacist must extend it and confirm storage rules per product, including a maximum transit time.
- The patient's address and phone go to the pharmacy and its partner only for the delivery (see the privacy notice: add Grab/Lalamove as processors in the transfer register if used).

## Insurance panels and guarantee letters
- Patients save insurance policies (insurer, member/policy number, individual or corporate with employer, end date) and attach one to a prescription sent to a pharmacy. The pharmacy sees only the insurer, member number and employer.
- Pharmacies list the **insurers they accept** (panel) in their listing, shown to patients.
- The pharmacy records the **guarantee letter (GL)** decision: approved with a GL number, or declined with a reason (so the patient knows to pay). The patient is notified.
- Not built: sending GL requests to insurers electronically, claim submission, co-payment amounts, or payment of the balance in the app.

## Open items
- [ ] Pharmacist/lawyer: confirm Poisons Act groups and record-keeping, populate `poisonGroup`, decide whether `POISONS_BOOK_REQUIRED` should be on.
- [ ] Extend the formulary with Malaysian brand names and cold-chain medicines.
- [ ] Decide whether to integrate Grab/Lalamove APIs (needs partner accounts) or keep manual booking.
- [ ] Insurer integrations for GLs and claims.
