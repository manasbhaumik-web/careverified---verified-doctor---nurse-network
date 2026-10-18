import crypto from "crypto";
import type { Application, Request, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { notify } from "./verification";
import { notifyPharmacy, pharmacyEvent, rxEffectiveStatus } from "./clinical";
import { isColdChain } from "./formulary";
import { addressProblem } from "../src/identity";
import { DELIVERY_LABEL, cleanDeliveryMethods, pharmacyLicenceOk, pharmacyLicenceProblem } from "./pharmacyLicence";

/**
 * Malaysian pharmacy rules: licence/retention-certificate expiry, home delivery with partners and cold chain, insurance
 * panels and guarantee letters (GL), and the dispensing record (pharmacist, poisons-book entry).
 *
 * Statute references come from web research (Oct 2026) and need a pharmacist/lawyer to confirm; see docs/PHARMACY_MALAYSIA.md.
 */

const iso = () => new Date().toISOString();
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const today = () => new Date().toISOString().slice(0, 10);
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// ---------- schema ----------
for (const col of [
  "licence_expiry TEXT", "pharmacist_apc_expiry TEXT", "licence_type TEXT", "registry_reference TEXT",
  "delivery_methods TEXT", "cold_chain INTEGER NOT NULL DEFAULT 0", "panel_insurers TEXT",
]) { try { db.exec(`ALTER TABLE pharmacies ADD COLUMN ${col}`); } catch { /* column already exists */ } }
for (const col of [
  "insurance_policy_id TEXT", "gl_status TEXT", "gl_number TEXT", "gl_note TEXT",
  "dispensing_pharmacist TEXT", "poisons_entry_no TEXT",
]) { try { db.exec(`ALTER TABLE prescriptions ADD COLUMN ${col}`); } catch { /* column already exists */ } }
db.exec(`
CREATE TABLE IF NOT EXISTS insurance_policies (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, insurer TEXT NOT NULL, member_no TEXT NOT NULL, policy_type TEXT NOT NULL,
  employer TEXT, valid_until TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ins_user ON insurance_policies(user_id);
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY, prescription_id TEXT NOT NULL, pharmacy_id TEXT NOT NULL, patient_user_id TEXT NOT NULL,
  method TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested', address TEXT NOT NULL, contact_phone TEXT,
  partner_ref TEXT, tracking_url TEXT, fee_sen INTEGER, cold_chain INTEGER NOT NULL DEFAULT 0, temperature_note TEXT,
  requested_at TEXT NOT NULL, updated_at TEXT NOT NULL, delivered_at TEXT, recipient_name TEXT, failure_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_del_rx ON deliveries(prescription_id);
CREATE INDEX IF NOT EXISTS idx_del_ph ON deliveries(pharmacy_id, status);
CREATE TABLE IF NOT EXISTS delivery_temperature_logs (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  temperature_celsius REAL NOT NULL,
  checkpoint TEXT NOT NULL,
  excursion_flag INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  recorded_at TEXT NOT NULL,
  recorded_by_user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_temp_delivery ON delivery_temperature_logs(delivery_id);
`);

const DELIVERY_STATUS = ["requested", "arranged", "out_for_delivery", "delivered", "failed", "cancelled"] as const;
const OPEN_DELIVERY = ["requested", "arranged", "out_for_delivery"];

const COLD_NOTE = "Keep refrigerated (commonly 2 to 8 °C) and do not freeze. The pharmacist confirms the storage instructions for each product; hand it over promptly and tell the patient to refrigerate it on arrival.";

const deliveryView = (d: any) => ({
  id: d.id, prescriptionId: d.prescription_id, pharmacyId: d.pharmacy_id, method: d.method, methodLabel: DELIVERY_LABEL[d.method] ?? d.method,
  status: d.status, address: JSON.parse(d.address), contactPhone: d.contact_phone, partnerRef: d.partner_ref, trackingUrl: d.tracking_url,
  fee: d.fee_sen == null ? null : d.fee_sen / 100, coldChain: !!d.cold_chain, temperatureNote: d.temperature_note,
  requestedAt: d.requested_at, updatedAt: d.updated_at, deliveredAt: d.delivered_at, recipientName: d.recipient_name, failureReason: d.failure_reason,
});

export function registerPharmacyMy(app: Application) {
  // ----- patient: insurance policies (for panel pharmacies and guarantee letters) -----
  const policyView = (p: any) => ({ id: p.id, insurer: p.insurer, memberNo: p.member_no, policyType: p.policy_type, employer: p.employer, validUntil: p.valid_until });

  app.get("/api/me/insurance", requireRole("patient"), (req, res) => {
    res.json({ status: "success", data: rows("SELECT * FROM insurance_policies WHERE user_id = ? AND active = 1 ORDER BY created_at DESC", req.user!.id).map(policyView) });
  });

  app.post("/api/me/insurance", requireRole("patient"), (req, res) => {
    const insurer = str(req.body.insurer, 80), memberNo = str(req.body.memberNo, 40);
    const policyType = req.body.policyType === "corporate" ? "corporate" : "individual";
    const employer = str(req.body.employer, 100);
    if (!insurer || !memberNo) return fail(res, 400, "Enter the insurer and your member or policy number.");
    if (policyType === "corporate" && !employer) return fail(res, 400, "Enter your employer for a corporate policy.");
    const validUntil = req.body.validUntil ? str(req.body.validUntil, 10) : null;
    if (validUntil && (!isDate(validUntil) || validUntil < today())) return fail(res, 400, "The policy end date must be a valid future date.");
    const id = newId("ins");
    db.prepare("INSERT INTO insurance_policies (id,user_id,insurer,member_no,policy_type,employer,valid_until,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, insurer, memberNo, policyType, employer || null, validUntil, iso());
    audit(req, "insurance.add", { target: ["insurance", id] });
    res.status(201).json({ status: "success", data: { id } });
  });

  app.delete("/api/me/insurance/:id", requireRole("patient"), (req, res) => {
    const r = db.prepare("UPDATE insurance_policies SET active = 0 WHERE id = ? AND user_id = ?").run(req.params.id, req.user!.id);
    if (!r.changes) return fail(res, 404, "Policy not found.");
    audit(req, "insurance.remove", { target: ["insurance", req.params.id] });
    res.json({ status: "success" });
  });

  // Attach (or clear) a policy on a prescription already sent to a pharmacy. Only the insurer, member number and
  // employer are visible to that pharmacy.
  app.post("/api/prescriptions/:id/insurance", requireRole("patient"), (req, res) => {
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND patient_user_id = ?", req.params.id, req.user!.id);
    if (!r) return fail(res, 404, "Prescription not found.");
    const policyId = req.body.policyId ? str(req.body.policyId, 60) : null;
    if (policyId && !row("SELECT 1 AS x FROM insurance_policies WHERE id = ? AND user_id = ? AND active = 1", policyId, req.user!.id)) return fail(res, 404, "Policy not found.");
    db.prepare("UPDATE prescriptions SET insurance_policy_id = ?, gl_status = CASE WHEN ? IS NULL THEN NULL ELSE 'requested' END, gl_number = NULL, gl_note = NULL WHERE id = ?").run(policyId, policyId, r.id);
    if (r.pharmacy_id && policyId) notifyPharmacy(r.pharmacy_id, "Insurance details attached", `The patient attached insurance to prescription ${r.code}. Open it to issue or decline a guarantee letter.`);
    audit(req, "prescription.insurance", { target: ["prescription", r.id], details: { attached: !!policyId } });
    res.json({ status: "success" });
  });

  // ----- pharmacy: guarantee letter decision -----
  const pharmacyOf = (req: Request) => (req.user?.role === "pharmacy" && req.user.profileId ? row("SELECT * FROM pharmacies WHERE id = ? AND active = 1 AND verified_at IS NOT NULL", req.user.profileId) : null);
  const guard = (req: Request, res: Response) => {
    const ph = pharmacyOf(req);
    if (!ph) { fail(res, 403, "This pharmacy account is not active."); return null; }
    const lic = pharmacyLicenceProblem(ph);
    if (lic) { fail(res, 403, `${lic} Contact the MedCred board to renew it.`); return null; }
    return ph;
  };

  app.post("/api/pharmacy/prescriptions/:id/guarantee-letter", requireRole("pharmacy"), (req, res) => {
    const ph = guard(req, res); if (!ph) return;
    const r = row("SELECT * FROM prescriptions WHERE id = ? AND pharmacy_id = ?", req.params.id, ph.id);
    if (!r) return fail(res, 404, "Prescription not found in your inbox.");
    if (!r.insurance_policy_id) return fail(res, 409, "The patient has not attached insurance to this prescription.");
    const status = req.body.status === "declined" ? "declined" : "approved";
    const glNumber = str(req.body.glNumber, 60), note = str(req.body.note, 300);
    if (status === "approved" && !glNumber) return fail(res, 400, "Enter the guarantee letter number.");
    if (status === "declined" && note.length < 3) return fail(res, 400, "Give the patient a short reason, so they know what to pay.");
    db.prepare("UPDATE prescriptions SET gl_status = ?, gl_number = ?, gl_note = ? WHERE id = ?").run(status, status === "approved" ? glNumber : null, note || null, r.id);
    pharmacyEvent(ph.id, r.id, `gl_${status}`, req.user!.id, { glNumber: glNumber || undefined });
    notify(r.patient_user_id, status === "approved" ? "Guarantee letter approved" : "Guarantee letter declined",
      status === "approved" ? `${ph.name} confirmed your insurer's guarantee letter (${glNumber}).` : `${ph.name} could not use your insurance: ${note}. You may need to pay directly.`);
    audit(req, "pharmacy.gl", { target: ["prescription", r.id], details: { status } });
    res.json({ status: "success" });
  });

  // ----- patient: home delivery -----
  const rxForPatient = (req: Request) => row("SELECT * FROM prescriptions WHERE id = ? AND patient_user_id = ?", req.params.id, req.user!.id);

  app.get("/api/prescriptions/:id/delivery", requireRole("patient"), (req, res) => {
    const r = rxForPatient(req);
    if (!r) return fail(res, 404, "Prescription not found.");
    const d = row("SELECT * FROM deliveries WHERE prescription_id = ? ORDER BY requested_at DESC", r.id);
    res.json({ status: "success", data: d ? deliveryView(d) : null });
  });

  app.post("/api/prescriptions/:id/delivery", requireRole("patient"), (req, res) => {
    const r = rxForPatient(req);
    if (!r) return fail(res, 404, "Prescription not found.");
    if (!r.pharmacy_id) return fail(res, 409, "Send the prescription to a pharmacy first.");
    if (rxEffectiveStatus(r) !== "active") return fail(res, 409, "This prescription can no longer be delivered.");
    const ph = row("SELECT * FROM pharmacies WHERE id = ? AND active = 1", r.pharmacy_id);
    if (!ph || !pharmacyLicenceOk(ph)) return fail(res, 409, "This pharmacy cannot take new orders right now. Send the prescription to another pharmacy.");
    let services: string[] = []; try { services = JSON.parse(ph.services ?? "[]"); } catch { /* none */ }
    const methods = cleanDeliveryMethods(JSON.parse(ph.delivery_methods ?? "[]"));
    if (!services.includes("Home delivery") || methods.length === 0) return fail(res, 409, "This pharmacy does not offer home delivery.");
    const method = str(req.body.method, 30);
    if (!methods.includes(method)) return fail(res, 400, `Choose one of: ${methods.map(m => DELIVERY_LABEL[m]).join(", ")}.`);
    if (OPEN_DELIVERY.includes(row("SELECT status FROM deliveries WHERE prescription_id = ? ORDER BY requested_at DESC", r.id)?.status ?? "")) return fail(res, 409, "A delivery is already in progress for this prescription.");

    // Address comes from the request, or the patient's profile if none is given. Delivery is within Malaysia only.
    const a = req.body.address ?? {};
    const address = { line1: str(a.line1, 120), line2: str(a.line2, 120), city: str(a.city, 60), state: str(a.state, 60), postcode: str(a.postcode, 12), country: "MY" };
    const problem = addressProblem(address);
    if (problem) return fail(res, 400, problem);
    const phone = str(req.body.contactPhone, 20);
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return fail(res, 400, "Enter a contact phone number the rider can call.");

    // Cold-chain items need a pharmacy that has said it can do cold-chain delivery.
    const items: { name: string }[] = JSON.parse(r.items);
    const cold = items.some(i => isColdChain(i.name));
    if (cold && !ph.cold_chain) return fail(res, 409, "This prescription includes a medicine that must stay refrigerated, and this pharmacy has not said it can deliver cold-chain items. Choose pickup or another pharmacy.");

    const id = newId("dlv");
    db.prepare("INSERT INTO deliveries (id,prescription_id,pharmacy_id,patient_user_id,method,address,contact_phone,cold_chain,temperature_note,requested_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, r.id, ph.id, req.user!.id, method, JSON.stringify(address), phone, cold ? 1 : 0, cold ? COLD_NOTE : null, iso(), iso());
    pharmacyEvent(ph.id, r.id, "delivery_requested", req.user!.id, { method });
    notifyPharmacy(ph.id, "Delivery requested", `A patient asked for delivery of prescription ${r.code} (${DELIVERY_LABEL[method]}).`);
    audit(req, "delivery.request", { target: ["delivery", id], details: { pharmacyId: ph.id, method, coldChain: cold } });
    res.status(201).json({ status: "success", data: deliveryView(row("SELECT * FROM deliveries WHERE id = ?", id)) });
  });

  app.post("/api/deliveries/:id/cancel", requireRole("patient"), (req, res) => {
    const d = row("SELECT * FROM deliveries WHERE id = ? AND patient_user_id = ?", req.params.id, req.user!.id);
    if (!d) return fail(res, 404, "Delivery not found.");
    if (!["requested", "arranged"].includes(d.status)) return fail(res, 409, "This delivery is already on its way or finished.");
    db.prepare("UPDATE deliveries SET status = 'cancelled', updated_at = ? WHERE id = ?").run(iso(), d.id);
    notifyPharmacy(d.pharmacy_id, "Delivery cancelled", "The patient cancelled a delivery request.");
    audit(req, "delivery.cancel", { target: ["delivery", d.id] });
    res.json({ status: "success" });
  });

  // ----- pharmacy: delivery queue and status -----
  app.get("/api/pharmacy/deliveries", requireRole("pharmacy"), (req, res) => {
    const ph = guard(req, res); if (!ph) return;
    const list = rows("SELECT d.*, p.code AS rx_code FROM deliveries d JOIN prescriptions p ON p.id = d.prescription_id WHERE d.pharmacy_id = ? ORDER BY d.requested_at DESC LIMIT 200", ph.id)
      .map(d => ({ ...deliveryView(d), rxCode: d.rx_code, patientName: row("SELECT name FROM users WHERE id = ?", d.patient_user_id)?.name ?? "Patient" }));
    res.json({ status: "success", data: list });
  });

  app.post("/api/pharmacy/deliveries/:id/status", requireRole("pharmacy"), (req, res) => {
    const ph = guard(req, res); if (!ph) return;
    const d = row("SELECT * FROM deliveries WHERE id = ? AND pharmacy_id = ?", req.params.id, ph.id);
    if (!d) return fail(res, 404, "Delivery not found.");
    const next = str(req.body.status, 20);
    if (!(DELIVERY_STATUS as readonly string[]).includes(next) || next === "requested") return fail(res, 400, "Choose a valid status.");
    if (!OPEN_DELIVERY.includes(d.status)) return fail(res, 409, `This delivery is already ${d.status}.`);
    const rx = row("SELECT * FROM prescriptions WHERE id = ?", d.prescription_id);
    if (next === "out_for_delivery" && !(rx.fill_status === "ready" || rx.status === "dispensed")) return fail(res, 409, "Mark the prescription ready before sending it out.");

    const partnerRef = str(req.body.partnerRef, 80) || d.partner_ref;
    const trackingUrl = req.body.trackingUrl ? str(req.body.trackingUrl, 300) : d.tracking_url;
    if (trackingUrl && !/^https:\/\/[^\s]+$/.test(trackingUrl)) return fail(res, 400, "The tracking link must start with https://.");
    if (next === "arranged" && d.method !== "pharmacy_courier" && !partnerRef) return fail(res, 400, "Enter the booking reference from the delivery partner.");
    const reason = str(req.body.reason, 200);
    if (next === "failed" && reason.length < 3) return fail(res, 400, "Say why the delivery failed.");
    const recipient = str(req.body.recipientName, 100);
    if (next === "delivered" && !recipient) return fail(res, 400, "Record who received the medicine.");
    const feeSen = req.body.fee === undefined || req.body.fee === "" ? d.fee_sen : Math.round(Number(req.body.fee) * 100);
    if (feeSen != null && !(feeSen >= 0 && feeSen < 1_000_00)) return fail(res, 400, "The delivery fee looks wrong.");

    db.prepare("UPDATE deliveries SET status=?, partner_ref=?, tracking_url=?, fee_sen=?, updated_at=?, delivered_at=?, recipient_name=?, failure_reason=? WHERE id=?")
      .run(next, partnerRef || null, trackingUrl || null, feeSen ?? null, iso(), next === "delivered" ? iso() : d.delivered_at, recipient || d.recipient_name, next === "failed" ? reason : null, d.id);

    // Temperature telemetry logging under NPRA Good Distribution Practice (GDP)
    if (req.body.temperatureCelsius !== undefined && req.body.temperatureCelsius !== null) {
      const tempVal = typeof req.body.temperatureCelsius === "number" ? req.body.temperatureCelsius : parseFloat(String(req.body.temperatureCelsius));
      if (!isNaN(tempVal)) {
        const isExcursion = d.cold_chain && (tempVal < 2.0 || tempVal > 8.0) ? 1 : 0;
        const tempId = newId("temp");
        db.prepare("INSERT INTO delivery_temperature_logs (id, delivery_id, temperature_celsius, checkpoint, excursion_flag, note, recorded_at, recorded_by_user_id) VALUES (?,?,?,?,?,?,?,?)")
          .run(tempId, d.id, tempVal, next, isExcursion, isExcursion ? `Temperature excursion recorded at ${next}: ${tempVal}°C (compliant range: 2.0-8.0°C)` : null, iso(), req.user?.id || null);
      }
    }

    // Handing the medicine to the patient is the dispensing event under the Poisons Act 1952.
    if (next === "delivered" && rx.status === "active") {
      const currentYear = new Date().getFullYear();
      let poisonsNo = rx.poisons_entry_no;
      if (!poisonsNo) {
        const maxSeqRow = row("SELECT COALESCE(MAX(sequence_no), 0) AS max_seq FROM pharmacy_poisons_register WHERE pharmacy_id = ? AND year = ?", ph.id, currentYear);
        const nextSeq = (maxSeqRow?.max_seq ?? 0) + 1;
        poisonsNo = `PB-${currentYear}-${String(nextSeq).padStart(5, "0")}`;
        try {
          db.prepare("INSERT INTO pharmacy_poisons_register (pharmacy_id, prescription_id, entry_serial_no, year, sequence_no, pharmacist_name, dispensed_at, created_at) VALUES (?,?,?,?,?,?,?,?)")
            .run(ph.id, rx.id, poisonsNo, currentYear, nextSeq, ph.pharmacist_name || "Dispensing Pharmacist", iso(), iso());
        } catch { /* duplicate entry ignore */ }
      }
      db.prepare("UPDATE prescriptions SET status='dispensed', dispensed_at=?, dispensed_by=?, fill_updated_at=?, first_response_at=COALESCE(first_response_at, ?), dispensing_pharmacist=?, poisons_entry_no=COALESCE(poisons_entry_no, ?) WHERE id=? AND status='active'")
        .run(iso(), ph.id, iso(), iso(), ph.pharmacist_name ?? null, poisonsNo, rx.id);
      pharmacyEvent(ph.id, rx.id, "dispensed", req.user!.id, { via: "delivery", poisonsEntryNo: poisonsNo });
    }
    pharmacyEvent(ph.id, d.prescription_id, `delivery_${next}`, req.user!.id);
    const text: Record<string, [string, string]> = {
      arranged: ["Delivery arranged", `${ph.name} arranged your delivery${partnerRef ? ` (ref ${partnerRef})` : ""}.`],
      out_for_delivery: ["Your medicine is on its way", `${ph.name} sent your medicine out.${d.cold_chain ? " Refrigerate it as soon as it arrives." : ""}`],
      delivered: ["Delivered", `${ph.name} delivered your medicine.`],
      failed: ["Delivery failed", `${ph.name} could not deliver: ${reason}. They will contact you, or you can collect it.`],
      cancelled: ["Delivery cancelled", `${ph.name} cancelled the delivery.`],
    };
    notify(d.patient_user_id, ...text[next]);
    audit(req, "delivery.status", { target: ["delivery", d.id], details: { status: next } });
    res.json({ status: "success", data: deliveryView(row("SELECT * FROM deliveries WHERE id = ?", d.id)) });
  });

  // ----- daily licence expiry reminders -----
  const remind = () => {
    try {
      const soon = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
      for (const ph of rows("SELECT * FROM pharmacies WHERE active = 1 AND verified_at IS NOT NULL")) {
        const dates = [["pharmacy licence", ph.licence_expiry], ["pharmacist retention certificate", ph.pharmacist_apc_expiry]] as const;
        for (const [what, d] of dates) {
          if (!d) continue;
          const key = `${ph.id}:${what}:${d}`;
          if (d <= soon && d >= today() && !remindedKeys.has(key)) {
            remindedKeys.add(key);
            notifyPharmacy(ph.id, "Renewal due soon", `Your ${what} expires on ${d}. Send the renewed document to the MedCred board to stay listed.`);
          }
        }
      }
    } catch { /* retry tomorrow */ }
  };
  const remindedKeys = new Set<string>();
  remind();
  setInterval(remind, 24 * 3600_000).unref();
}
