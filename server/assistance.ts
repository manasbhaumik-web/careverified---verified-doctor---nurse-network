import crypto from "crypto";
import type { Application, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { notify, notifyAdmins } from "./verification";
import { computeTax } from "./paymentPolicy";
import { VerificationStatus } from "../src/types";

/**
 * Medical Assistance, Patient Enquiries & Quotations Module:
 * Handles local Malaysian citizens, resident expatriates, and international medical travelers / expats.
 * Manages clinical triage, itemized treatment quotations with multi-currency & tax rules,
 * assistance logistics (interpreters, airport pickup, medical evacuation, insurance guarantee letters),
 * itinerary scheduling, and official pro-forma quotation issuance.
 */

const iso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const json = (v: unknown) => JSON.stringify(v);

/** Tracking codes are 8 characters from an alphabet without look-alikes (about 10^12 possibilities), never a short number. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (n = 8) => Array.from({ length: n }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
const parse = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

// ---------- Schema Migrations for Medical Assistance & Enquiries ----------
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN patient_type TEXT DEFAULT 'local_malaysian'`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN assistance_type TEXT DEFAULT 'elective_surgery'`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN urgency TEXT DEFAULT 'routine'`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN patient_name TEXT`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN patient_email TEXT`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN patient_phone TEXT`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN insurance_carrier TEXT`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN guarantee_letter INTEGER DEFAULT 0`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN tracking_code TEXT`);
} catch { /* already exists */ }
try {
  db.exec(`ALTER TABLE tourism_cases ADD COLUMN revision_notes TEXT`);
} catch { /* already exists */ }

db.exec(`
CREATE INDEX IF NOT EXISTS idx_tcase_tracking ON tourism_cases(tracking_code);
CREATE INDEX IF NOT EXISTS idx_tcase_ptype ON tourism_cases(patient_type, status);
`);

// ---------- Seed Realistic Clinical Assistance Cases If Empty ----------
const existingCount = (db.prepare("SELECT COUNT(*) AS c FROM tourism_cases").get() as any)?.c || 0;
if (existingCount === 0) {
  // Ensure default facility exists
  const defaultFac = db.prepare("SELECT id FROM tourism_facilities LIMIT 1").get() as any;
  const facId = defaultFac ? defaultFac.id : "fac-demo-1";

  const seedCases = [
    {
      id: "tcs-asst-101",
      patientUserId: "usr-pat-demo-1",
      facilityId: facId,
      specialty: "Cardiology & Interventional",
      patientType: "local_malaysian",
      assistanceType: "elective_surgery",
      urgency: "routine",
      patientName: "Ahmad Farhan bin Zulkifli",
      patientEmail: "farhan.zulkifli@example.my",
      patientPhone: "+60-12-889-2144",
      homeCountry: "MY",
      insuranceCarrier: "Great Eastern MediShield",
      guaranteeLetter: 1,
      trackingCode: "MED-MY-7821",
      summary: "Evaluated for elective Coronary Angiogram and potential Drug-Eluting Stent (DES) insertion following positive treadmill stress test and stable angina symptoms. Requesting itemized hospital package and insurance panel pre-authorization estimate.",
      preferredFrom: "2026-11-05",
      preferredTo: "2026-11-08",
      needs: {
        interpreter: false,
        airportTransfer: false,
        ambulanceTransfer: false,
        vipConcierge: true,
        accommodation: false,
        halalFood: true,
        letterOfGuarantee: true,
      },
      shareDocuments: 1,
      status: "quoted",
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: "tcs-asst-102",
      patientUserId: "usr-pat-demo-2",
      facilityId: facId,
      specialty: "Orthopaedics & Joint Reconstruction",
      patientType: "expat_resident",
      assistanceType: "elective_surgery",
      urgency: "priority",
      patientName: "David Harrison",
      patientEmail: "david.harrison@kl-expat.org",
      patientPhone: "+60-17-302-9912",
      homeCountry: "GB",
      insuranceCarrier: "Bupa Global International",
      guaranteeLetter: 1,
      trackingCode: "MED-EX-4419",
      summary: "Resident expatriate in Kuala Lumpur diagnosed with severe tricompartmental osteoarthritis of the right knee. Seeking Mako robotic-assisted Total Knee Arthroplasty (TKA), 4-day inpatient private suite, and comprehensive post-op physiotherapy.",
      preferredFrom: "2026-11-12",
      preferredTo: "2026-11-20",
      needs: {
        interpreter: false,
        airportTransfer: false,
        ambulanceTransfer: false,
        vipConcierge: true,
        accommodation: true,
        halalFood: false,
        letterOfGuarantee: true,
      },
      shareDocuments: 1,
      status: "accepted",
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "tcs-asst-103",
      patientUserId: "usr-pat-demo-3",
      facilityId: facId,
      specialty: "Oncology & Surgical Oncology",
      patientType: "international_traveler",
      assistanceType: "second_opinion",
      urgency: "urgent",
      patientName: "Dewi Lestari",
      patientEmail: "dewi.lestari@jakarta-health.id",
      patientPhone: "+62-811-987-6543",
      homeCountry: "ID",
      insuranceCarrier: "Allianz Care International",
      guaranteeLetter: 0,
      trackingCode: "MED-INT-9932",
      summary: "International medical traveler from Jakarta seeking multidisciplinary tumor board second opinion and CyberKnife stereotactic radiosurgery assessment for localized recurrent lesion. Requires MHTC medical travel visa clearance letter, airport wheelchair concierge, and Indonesian interpreter.",
      preferredFrom: "2026-11-18",
      preferredTo: "2026-11-28",
      needs: {
        interpreter: true,
        interpreterLanguage: "Bahasa Indonesia",
        airportTransfer: true,
        ambulanceTransfer: false,
        vipConcierge: true,
        accommodation: true,
        halalFood: true,
        letterOfGuarantee: false,
      },
      shareDocuments: 1,
      status: "quoted",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
  ];

  for (const c of seedCases) {
    try {
      db.prepare(`
        INSERT INTO tourism_cases (
          id, patient_user_id, facility_id, specialty, summary, home_country, preferred_from, preferred_to,
          needs, share_documents, status, created_at, updated_at, patient_type, assistance_type, urgency,
          patient_name, patient_email, patient_phone, insurance_carrier, guarantee_letter, tracking_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        c.id, c.patientUserId, c.facilityId, c.specialty, c.summary, c.homeCountry, c.preferredFrom, c.preferredTo,
        json(c.needs), c.shareDocuments, c.status, c.createdAt, c.updatedAt, c.patientType, c.assistanceType, c.urgency,
        c.patientName, c.patientEmail, c.patientPhone, c.insuranceCarrier, c.guaranteeLetter, c.trackingCode
      );

      // Seed realistic quotes for these cases
      if (c.id === "tcs-asst-101") {
        const items = [
          { label: "Consultant Interventional Cardiologist Procedure Fee", category: "doctor_fees", amountSen: 450000 },
          { label: "Cardiac Catheterization Laboratory & Consumables (1 DES)", category: "procedure", amountSen: 1250000 },
          { label: "Coronary Angiogram & Fluoroscopy Suite", category: "tests", amountSen: 280000 },
          { label: "Cardiac High Dependency Unit (HDU) & Telemetry Stay (2 Nights)", category: "hospital_stay", amountSen: 190000 },
          { label: "Post-Procedure Antiplatelet & Anticoagulant Therapy", category: "medication", amountSen: 65000 },
          { label: "Insurance Pre-Authorization & Direct Billing Coordination", category: "other", amountSen: 0 },
        ];
        const subtotal = items.reduce((s, i) => s + i.amountSen, 0);
        db.prepare(`
          INSERT INTO tourism_quotes (
            id, case_id, version, items, subtotal_sen, tax_sen, tax_rate_pct, total_sen,
            inclusions, exclusions, cancellation_terms, payment_terms, valid_until, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "tqt-asst-101", c.id, 1, json(items), subtotal, 0, 0, subtotal,
          "Cath Lab consumable stent, 2 nights HDU room, cardiologist clinical charges, daily nursing care, routine lab profile.",
          "Emergency ICU care in the event of unexpected acute coronary syndrome, additional stents beyond primary lesion, personal companion meals.",
          "Cancellable with full refund up to 48 hours prior to catheterization procedure.",
          "Insurance Guarantee Letter (LOG) accepted; or credit card pre-authorization.",
          "2026-12-15", "usr-admin-1", iso()
        );
      } else if (c.id === "tcs-asst-102") {
        const items = [
          { label: "Orthopaedic Specialist & Robotic Knee Arthroplasty Fee", category: "doctor_fees", amountSen: 850000 },
          { label: "Mako Robotic Surgical System Consumables & Navigation", category: "procedure", amountSen: 920000 },
          { label: "Premium Titanium / Ceramic Knee Implant System", category: "procedure", amountSen: 1400000 },
          { label: "Executive Single Suite (4 Nights Inpatient)", category: "hospital_stay", amountSen: 320000 },
          { label: "Daily Inpatient Physiotherapy & Continuous Passive Motion (CPM)", category: "follow_up", amountSen: 95000 },
          { label: "Anaesthetist Consultation & Ultrasound-Guided Adductor Canal Block", category: "doctor_fees", amountSen: 280000 },
        ];
        const subtotal = items.reduce((s, i) => s + i.amountSen, 0);
        db.prepare(`
          INSERT INTO tourism_quotes (
            id, case_id, version, items, subtotal_sen, tax_sen, tax_rate_pct, total_sen,
            inclusions, exclusions, cancellation_terms, payment_terms, valid_until, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "tqt-asst-102", c.id, 1, json(items), subtotal, 0, 0, subtotal,
          "Robotic knee surgery, titanium prosthesis, 4-day executive room, anaesthesia, daily inpatient physio, take-home crutches & medication.",
          "Blood transfusion if required, extended ICU admission, custom orthotics, international travel arrangements.",
          "Free cancellation up to 72 hours before planned surgical admission.",
          "Direct settlement with Bupa Global via Hospital Letter of Guarantee.",
          "2026-12-20", "usr-admin-1", iso()
        );
      } else if (c.id === "tcs-asst-103") {
        const items = [
          { label: "Multidisciplinary Oncology Tumor Board Consultation", category: "doctor_fees", amountSen: 220000 },
          { label: "CyberKnife Stereotactic Radiosurgery (5 Fractions Planning & Delivery)", category: "procedure", amountSen: 2450000 },
          { label: "High-Resolution 3.0T MRI & Contrast Simulation Scan", category: "tests", amountSen: 350000 },
          { label: "KLIA Airport Medical Meet & Greet, Wheelchair & Van Transfer", category: "transport", amountSen: 45000 },
          { label: "MHTC Medical Travel Visa Endorsement & Indonesian Liaison Officer", category: "interpreter", amountSen: 0 },
        ];
        const subtotal = items.reduce((s, i) => s + i.amountSen, 0);
        // International non-citizen healthcare tax calculation where applicable
        const taxSen = Math.round(subtotal * 0.06);
        db.prepare(`
          INSERT INTO tourism_quotes (
            id, case_id, version, items, subtotal_sen, tax_sen, tax_rate_pct, total_sen,
            inclusions, exclusions, cancellation_terms, payment_terms, valid_until, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "tqt-asst-103", c.id, 1, json(items), subtotal, taxSen, 6.0, subtotal + taxSen,
          "Full stereotactic planning, CyberKnife delivery sessions, simulation scans, airport transfer, MHTC medical visa endorsement, Indonesian liaison support.",
          "Chemotherapy infusions, hotel accommodation for family companion, post-radiotherapy emergency admission.",
          "Cancellable with full refund less administration fee if medical visa is denied.",
          "50% advance deposit upon visa confirmation; remaining balance on first consultation day.",
          "2026-12-30", "usr-admin-1", iso()
        );
      }
    } catch { /* ignore seeding errors */ }
  }
}

// ---------- Helper Functions ----------
function formatCase(c: any) {
  const fac = row("SELECT id, name, city, state, address, phone, email, mhtc_member, licence_no FROM tourism_facilities WHERE id = ?", c.facility_id);
  const quotes = rows("SELECT * FROM tourism_quotes WHERE case_id = ? ORDER BY version DESC", c.id).map(q => ({
    id: q.id,
    version: q.version,
    items: parse(q.items, []),
    subtotal: q.subtotal_sen / 100,
    tax: q.tax_sen / 100,
    taxRatePct: q.tax_rate_pct,
    total: q.total_sen / 100,
    inclusions: q.inclusions,
    exclusions: q.exclusions,
    cancellationTerms: q.cancellation_terms,
    paymentTerms: q.payment_terms,
    validUntil: q.valid_until,
    status: q.status === "sent" && q.valid_until < today() ? "expired" : q.status,
    createdAt: q.created_at,
    decidedAt: q.decided_at,
    currency: "MYR",
  }));
  const itinerary = rows("SELECT id, date, kind, title, note FROM tourism_itinerary WHERE case_id = ? ORDER BY date, rowid", c.id);
  const messages = rows(`
    SELECT m.id, m.text, m.ts, m.sender_user_id AS senderId, u.name AS senderName, u.role AS senderRole
    FROM tourism_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    WHERE m.case_id = ?
    ORDER BY m.id ASC
  `, c.id);

  return {
    id: c.id,
    trackingCode: c.tracking_code || `MED-${c.id.slice(-6).toUpperCase()}`,
    status: c.status,
    summary: c.summary,
    specialty: c.specialty,
    patientType: c.patient_type || "local_malaysian",
    assistanceType: c.assistance_type || "elective_surgery",
    urgency: c.urgency || "routine",
    patientName: c.patient_name || row("SELECT name FROM users WHERE id = ?", c.patient_user_id)?.name || "Patient",
    patientEmail: c.patient_email || row("SELECT email FROM users WHERE id = ?", c.patient_user_id)?.email,
    patientPhone: c.patient_phone || row("SELECT phone FROM users WHERE id = ?", c.patient_user_id)?.phone,
    homeCountry: c.home_country || "MY",
    insuranceCarrier: c.insurance_carrier,
    guaranteeLetter: !!c.guarantee_letter,
    revisionNotes: c.revision_notes,
    preferredFrom: c.preferred_from,
    preferredTo: c.preferred_to,
    needs: parse(c.needs, {}),
    shareDocuments: !!c.share_documents,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    facility: fac ? {
      id: fac.id,
      name: fac.name,
      city: fac.city,
      state: fac.state,
      address: fac.address,
      phone: fac.phone,
      email: fac.email,
      licenceNo: fac.licence_no,
      mhtcMember: !!fac.mhtc_member,
    } : null,
    quotes,
    latestQuote: quotes[0] || null,
    itinerary,
    messages,
    discharge: c.discharged_at ? {
      summary: c.discharge_summary,
      followUpPlan: c.follow_up_plan,
      at: c.discharged_at,
    } : null,
  };
}

// ---------- Register Assistance Routes ----------
export function registerAssistanceRoutes(app: Application, ctx?: { findProfessional?: (id: string) => any; allProfessionals?: () => any[] }) {

  // ---------- Who may see or act on a case ----------
  // A case holds a patient's name, contact details and clinical summary. It is visible only to:
  //   staff    - an admin, or a member of the hospital the case was sent to
  //   patient  - the signed-in patient it belongs to
  //   guest    - someone who gives BOTH the tracking code and the contact email used on the request
  // Anything else gets "not found", so a stranger cannot tell whether a code exists.
  const lookupLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
  const enquiryLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
  /** Rate limits only people who are not signed in (guests guessing codes, or form spam). */
  const guestLimit = (limiter: (req: Request, res: Response, next: NextFunction) => unknown) =>
    (req: Request, res: Response, next: NextFunction) => (req.user ? next() : limiter(req, res, next));

  const isFacilityStaff = (u: NonNullable<Request["user"]>, facilityId: string) =>
    u.role === "admin" ||
    ((u.facilityId === facilityId || u.profileId === facilityId) && u.role === "facility") ||
    !!row("SELECT 1 AS x FROM tourism_facility_staff WHERE user_id = ? AND facility_id = ?", u.id, facilityId);

  const emailGiven = (req: Request) => str(req.query?.email ?? req.body?.email, 120).toLowerCase();
  const sameEmail = (a: unknown, b: string) => typeof a === "string" && !!b && a.trim().toLowerCase() === b;

  const accessTo = (req: Request, c: any): "staff" | "patient" | "guest" | null => {
    const u = req.user;
    if (u) {
      if (isFacilityStaff(u, c.facility_id)) return "staff";
      if (c.patient_user_id === u.id || sameEmail(c.patient_email, (u.email ?? "").toLowerCase())) return "patient";
    }
    return sameEmail(c.patient_email, emailGiven(req)) ? "guest" : null;
  };
  const findCase = (param: string) => row("SELECT * FROM tourism_cases WHERE id = ? OR tracking_code = ?", param, param.toUpperCase());

  /**
   * POST /api/assistance/enquiries
   * Public or authenticated: Submit a clinical inquiry for local/expat/international medical assistance.
   */
  app.post("/api/assistance/enquiries", guestLimit(enquiryLimiter), (req, res) => {
    const summary = str(req.body.summary, 3000);
    if (summary.length < 15) {
      return fail(res, 400, "Please describe the patient condition or requested medical treatment (at least 15 characters).");
    }

    const patientName = str(req.body.patientName, 120) || (req.user ? req.user.name : "");
    const patientEmail = str(req.body.patientEmail, 120) || (req.user ? req.user.email : "");
    const patientPhone = str(req.body.patientPhone, 40);

    if (!patientName || !patientEmail) {
      return fail(res, 400, "Please provide the patient or contact person's full name and email.");
    }

    // Determine target facility
    // Only a listed hospital (switched on, licence not expired) can receive a request; there is no invented default.
    const listedHospital = (id: string) => {
      const f = row("SELECT id, licence_expiry FROM tourism_facilities WHERE id = ? AND active = 1", id);
      return f && (!f.licence_expiry || f.licence_expiry >= today()) ? f.id as string : "";
    };
    let facilityId = str(req.body.facilityId, 60);
    if (facilityId) {
      facilityId = listedHospital(facilityId);
      if (!facilityId) return fail(res, 400, "Choose a hospital from the list.");
    } else {
      const first = rows("SELECT id FROM tourism_facilities WHERE active = 1 ORDER BY mhtc_member DESC, name ASC").map(r => listedHospital(r.id)).find(Boolean);
      if (!first) return fail(res, 503, "No hospital is available to receive requests right now. Please try again later.");
      facilityId = first;
    }

    const patientType = ["local_malaysian", "expat_resident", "international_traveler"].includes(req.body.patientType)
      ? req.body.patientType
      : "local_malaysian";

    const assistanceType = ["elective_surgery", "specialist_consult", "second_opinion", "urgent_evacuation", "maternity_care", "executive_screening"].includes(req.body.assistanceType)
      ? req.body.assistanceType
      : "elective_surgery";

    const urgency = ["routine", "priority", "urgent"].includes(req.body.urgency)
      ? req.body.urgency
      : "routine";

    const homeCountry = str(req.body.homeCountry, 2).toUpperCase() || (patientType === "local_malaysian" ? "MY" : "US");
    const specialty = str(req.body.specialty, 80) || "General Medicine";
    const insuranceCarrier = str(req.body.insuranceCarrier, 100);
    const guaranteeLetter = req.body.guaranteeLetter === true ? 1 : 0;
    const preferredFrom = req.body.preferredFrom ? str(req.body.preferredFrom, 10) : null;
    const preferredTo = req.body.preferredTo ? str(req.body.preferredTo, 10) : null;

    const needs: Record<string, any> = {
      interpreter: req.body.needs?.interpreter === true,
      interpreterLanguage: str(req.body.needs?.interpreterLanguage, 40),
      airportTransfer: req.body.needs?.airportTransfer === true,
      ambulanceTransfer: req.body.needs?.ambulanceTransfer === true,
      vipConcierge: req.body.needs?.vipConcierge === true,
      accommodation: req.body.needs?.accommodation === true,
      halalFood: req.body.needs?.halalFood === true,
      letterOfGuarantee: guaranteeLetter === 1,
    };

    // Generate case ID and human-friendly tracking code
    const caseId = newId("tcs");
    const prefix = patientType === "local_malaysian" ? "MED-MY" : patientType === "expat_resident" ? "MED-EX" : "MED-INT";
    let trackingCode = "";
    do { trackingCode = `${prefix}-${randomCode(8)}`; } while (row("SELECT 1 AS x FROM tourism_cases WHERE tracking_code = ?", trackingCode));

    const userId = req.user ? req.user.id : `guest-${crypto.randomBytes(4).toString("hex")}`;

    db.prepare(`
      INSERT INTO tourism_cases (
        id, patient_user_id, facility_id, specialty, summary, home_country, preferred_from, preferred_to,
        needs, share_documents, status, created_at, updated_at, patient_type, assistance_type, urgency,
        patient_name, patient_email, patient_phone, insurance_carrier, guarantee_letter, tracking_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      caseId, userId, facilityId, specialty, summary, homeCountry, preferredFrom, preferredTo,
      json(needs), req.body.shareDocuments === true ? 1 : 0, "enquiry", iso(), iso(),
      patientType, assistanceType, urgency, patientName, patientEmail, patientPhone,
      insuranceCarrier, guaranteeLetter, trackingCode
    );

    // Initial coordination welcome message
    db.prepare(`
      INSERT INTO tourism_messages (case_id, sender_user_id, text, ts)
      VALUES (?, ?, ?, ?)
    `).run(
      caseId,
      "system",
      `Medical Assistance Enquiry registered with reference ${trackingCode}. Our clinical triage coordinator and hospital team will review your requirements and provide an itemized medical quotation.`,
      iso()
    );

    // Notify facility staff and admins
    for (const s of rows("SELECT user_id FROM tourism_facility_staff WHERE facility_id = ?", facilityId)) {
      notify(s.user_id, "New Patient Assistance Enquiry", `${patientName} (${patientType.replace('_', ' ')}) submitted an inquiry [${trackingCode}].`);
    }
    notifyAdmins("Medical Assistance Enquiry", `${patientName} (${trackingCode}) → Facility ${facilityId}`);

    audit(req, "assistance.enquiry.create", {
      target: ["tourism_case", caseId],
      details: { trackingCode, patientType, urgency, specialty }
    });

    res.status(201).json({
      status: "success",
      message: "Medical assistance enquiry submitted successfully.",
      data: {
        id: caseId,
        trackingCode,
        patientName,
        status: "enquiry",
      }
    });
  });

  /**
   * GET /api/assistance/cases
   * Fetch active assistance cases.
   * If logged in, returns user's cases. If facility, returns facility cases.
   */
  app.get("/api/assistance/cases", guestLimit(lookupLimiter), (req, res) => {
    const user = req.user;
    let caseRows: any[] = [];

    if (user) {
      if (user.role === "facility" || user.role === "admin") {
        const facId = user.facilityId || user.profileId || "fac-demo-1";
        if (user.role === "admin") {
          caseRows = rows("SELECT * FROM tourism_cases ORDER BY updated_at DESC LIMIT 100");
        } else {
          caseRows = rows("SELECT * FROM tourism_cases WHERE facility_id = ? ORDER BY updated_at DESC LIMIT 100", facId);
        }
      } else {
        // Patient or practitioner
        caseRows = rows("SELECT * FROM tourism_cases WHERE patient_user_id = ? OR patient_email = ? ORDER BY updated_at DESC", user.id, user.email);
      }
    } else {
      // Not signed in: a guest sees their own case only, with the tracking code AND the email used on the request. There is no public list.
      const track = str(req.query.trackingCode, 30).toUpperCase();
      const email = str(req.query.email, 120);
      if (track && email) {
        caseRows = rows("SELECT * FROM tourism_cases WHERE (tracking_code = ? OR id = ?) AND LOWER(patient_email) = LOWER(?)", track, track, email);
      }
    }

    res.json({
      status: "success",
      data: caseRows.map(formatCase),
    });
  });

  /**
   * GET /api/assistance/cases/:id
   * Get single assistance case with full quotations, messages, and itinerary.
   */
  app.get("/api/assistance/cases/:id", guestLimit(lookupLimiter), (req, res) => {
    const c = findCase(req.params.id);
    if (!c || !accessTo(req, c)) return fail(res, 404, "Medical assistance case not found.");
    res.json({ status: "success", data: formatCase(c) });
  });

  /**
   * POST /api/assistance/cases/:id/quote-decision
   * Patient accepts, declines, or requests revision for a quotation.
   */
  app.post("/api/assistance/cases/:id/quote-decision", guestLimit(lookupLimiter), (req, res) => {
    const c = findCase(req.params.id);
    // Only the patient (or the guest who holds the code and the email) can decide on a quote; hospital staff cannot accept for them.
    const who = c ? accessTo(req, c) : null;
    if (!c || (who !== "patient" && who !== "guest")) return fail(res, 404, "Case not found.");

    const quoteId = str(req.body.quoteId, 60);
    const q = row("SELECT * FROM tourism_quotes WHERE id = ? AND case_id = ?", quoteId, c.id);
    if (!q) return fail(res, 404, "Quotation not found.");
    if (q.status !== "sent") return fail(res, 409, "This quotation has already been decided or replaced by a newer one. Reload to see the current quotation.");
    if (req.body.action === "accept" && q.valid_until && q.valid_until < today()) return fail(res, 409, "This quotation has expired. Ask the hospital to issue a new one.");

    const action = req.body.action; // 'accept' | 'decline' | 'request_revision'
    if (!["accept", "decline", "request_revision"].includes(action)) {
      return fail(res, 400, "Action must be 'accept', 'decline', or 'request_revision'.");
    }

    if (action === "accept") {
      db.prepare("UPDATE tourism_quotes SET status = 'accepted', decided_at = ? WHERE id = ?").run(iso(), q.id);
      db.prepare("UPDATE tourism_cases SET status = 'accepted', updated_at = ? WHERE id = ?").run(iso(), c.id);
      db.prepare("INSERT INTO tourism_messages (case_id, sender_user_id, text, ts) VALUES (?, ?, ?, ?)").run(
        c.id, req.user ? req.user.id : "patient",
        `Quotation v${q.version} for RM ${(q.total_sen / 100).toFixed(2)} was officially ACCEPTED by the patient. Facility notified to prepare admission and logistical support.`,
        iso()
      );
    } else if (action === "decline") {
      db.prepare("UPDATE tourism_quotes SET status = 'declined', decided_at = ? WHERE id = ?").run(iso(), q.id);
      db.prepare("UPDATE tourism_cases SET status = 'enquiry', updated_at = ? WHERE id = ?").run(iso(), c.id);
      db.prepare("INSERT INTO tourism_messages (case_id, sender_user_id, text, ts) VALUES (?, ?, ?, ?)").run(
        c.id, req.user ? req.user.id : "patient",
        `Quotation v${q.version} was declined. Reason/feedback: ${str(req.body.notes, 500) || "No specific reason provided."}`,
        iso()
      );
    } else if (action === "request_revision") {
      const notes = str(req.body.notes, 1000);
      if (!notes) return fail(res, 400, "Please provide revision notes or requested modifications.");
      db.prepare("UPDATE tourism_cases SET revision_notes = ?, updated_at = ? WHERE id = ?").run(notes, iso(), c.id);
      db.prepare("INSERT INTO tourism_messages (case_id, sender_user_id, text, ts) VALUES (?, ?, ?, ?)").run(
        c.id, req.user ? req.user.id : "patient",
        `Revision Requested on Quotation v${q.version}: "${notes}". Facility team requested to update itemized pricing or dates.`,
        iso()
      );
    }

    audit(req, "assistance.quote.decision", {
      target: ["tourism_case", c.id],
      details: { quoteId: q.id, action }
    });

    res.json({
      status: "success",
      message: `Quotation status updated to ${action}.`,
      data: formatCase(row("SELECT * FROM tourism_cases WHERE id = ?", c.id))
    });
  });

  /**
   * POST /api/assistance/cases/:id/messages
   * Send a message on the assistance case.
   */
  app.post("/api/assistance/cases/:id/messages", guestLimit(lookupLimiter), (req, res) => {
    const c = findCase(req.params.id);
    if (!c || !accessTo(req, c)) return fail(res, 404, "Case not found.");

    const text = str(req.body.text, 2500);
    if (!text) return fail(res, 400, "Message cannot be empty.");

    const senderId = req.user ? req.user.id : "patient-contact";
    db.prepare("INSERT INTO tourism_messages (case_id, sender_user_id, text, ts) VALUES (?, ?, ?, ?)").run(
      c.id, senderId, text, iso()
    );
    db.prepare("UPDATE tourism_cases SET updated_at = ? WHERE id = ?").run(iso(), c.id);

    res.status(201).json({ status: "success", message: "Message sent." });
  });

  /**
   * GET /api/assistance/cases/:id/proforma
   * Return formal Pro-Forma Medical Quotation document data suitable for printing / official hospital presentation.
   */
  app.get("/api/assistance/cases/:id/proforma", guestLimit(lookupLimiter), (req, res) => {
    const c = findCase(req.params.id);
    if (!c || !accessTo(req, c)) return fail(res, 404, "Case not found.");

    const fac = row("SELECT * FROM tourism_facilities WHERE id = ?", c.facility_id);
    const q = row("SELECT * FROM tourism_quotes WHERE case_id = ? ORDER BY version DESC LIMIT 1", c.id);

    if (!q) return fail(res, 404, "No active quotation available for this case.");

    res.json({
      status: "success",
      data: {
        documentTitle: "PRO-FORMA TREATMENT QUOTATION",
        referenceNumber: `QUO-${c.tracking_code || c.id.slice(-6).toUpperCase()}-v${q.version}`,
        issueDate: q.created_at.slice(0, 10),
        validUntil: q.valid_until,
        facility: {
          // Only what the hospital's own record holds: nothing is filled in with made-up details
          name: fac?.name || "Hospital",
          licenceNo: fac?.licence_no || null,
          city: fac?.city || null,
          state: fac?.state || null,
          address: fac?.address || null,
          phone: fac?.phone || null,
          email: fac?.email || null,
          mhtcMember: !!fac?.mhtc_member,
        },
        patient: {
          name: c.patient_name || "Patient",
          email: c.patient_email,
          phone: c.patient_phone,
          nationality: c.home_country || "MY",
          patientType: c.patient_type,
          insuranceCarrier: c.insurance_carrier || "Self-Pay",
        },
        clinicalDetails: {
          specialty: c.specialty,
          clinicalSummary: c.summary,
          proposedAdmission: c.preferred_from,
        },
        items: parse(q.items, []),
        subtotalMYR: q.subtotal_sen / 100,
        taxSen: q.tax_sen,
        taxMYR: q.tax_sen / 100,
        taxRatePct: q.tax_rate_pct,
        totalMYR: q.total_sen / 100,
        inclusions: q.inclusions,
        exclusions: q.exclusions,
        cancellationTerms: q.cancellation_terms,
        paymentTerms: q.payment_terms,
        regulatoryNotice: "Prepared by the hospital named above. The price is valid for the items listed until the date shown. Nothing is charged by accepting it.",
      }
    });
  });

  /**
   * POST /api/assistance/facility/cases/:id/quotes
   * Allows facility staff to issue a comprehensive multi-item quotation.
   */
  app.post("/api/assistance/facility/cases/:id/quotes", requireRole("facility", "admin", "practitioner"), (req, res) => {
    const c = row("SELECT * FROM tourism_cases WHERE id = ?", req.params.id);
    if (!c || !isFacilityStaff(req.user!, c.facility_id)) return fail(res, 404, "Case not found.");

    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (rawItems.length === 0) return fail(res, 400, "Please provide at least one quotation line item.");

    const items: { label: string; category: string; amountSen: number }[] = [];
    for (const it of rawItems) {
      const label = str(it.label, 150);
      const category = str(it.category, 40) || "procedure";
      const amount = Math.round(Number(it.amount) * 100);
      if (!label || isNaN(amount) || amount < 0) {
        return fail(res, 400, "Each item needs a valid description and non-negative amount.");
      }
      items.push({ label, category, amountSen: amount });
    }

    const inclusions = str(req.body.inclusions, 2000) || "All routine procedure consumables, standard nursing care, and specified room stay.";
    const exclusions = str(req.body.exclusions, 2000) || "Unplanned ICU stay, extra nights, external specialist call-in fees, take-home non-routine medications.";
    const cancellationTerms = str(req.body.cancellationTerms, 1000) || "Free cancellation up to 48 hours prior to scheduled admission.";
    const paymentTerms = str(req.body.paymentTerms, 500) || "Payable via Direct Bank Wire, Visa/Mastercard, or Approved Insurance Guarantee Letter.";
    const validUntil = str(req.body.validUntil, 10) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const subtotal = items.reduce((s, i) => s + i.amountSen, 0);

    // Apply tax rule: 0% for local Malaysian citizen, 6% SST for foreign/international non-resident
    const taxRatePct = c.patient_type === "international_traveler" ? 6.0 : 0.0;
    const taxSen = Math.round(subtotal * (taxRatePct / 100));
    const totalSen = subtotal + taxSen;

    const version = (row("SELECT MAX(version) AS v FROM tourism_quotes WHERE case_id = ?", c.id)?.v ?? 0) + 1;
    const quoteId = newId("tqt");

    // Supersede previous quotes
    db.prepare("UPDATE tourism_quotes SET status = 'superseded' WHERE case_id = ? AND status = 'sent'").run(c.id);

    db.prepare(`
      INSERT INTO tourism_quotes (
        id, case_id, version, items, subtotal_sen, tax_sen, tax_rate_pct, total_sen,
        inclusions, exclusions, cancellation_terms, payment_terms, valid_until, created_by, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
    `).run(
      quoteId, c.id, version, json(items), subtotal, taxSen, taxRatePct, totalSen,
      inclusions, exclusions, cancellationTerms, paymentTerms, validUntil, req.user!.id, iso()
    );

    db.prepare("UPDATE tourism_cases SET status = 'quoted', updated_at = ? WHERE id = ?").run(iso(), c.id);

    // Message log
    db.prepare("INSERT INTO tourism_messages (case_id, sender_user_id, text, ts) VALUES (?, ?, ?, ?)").run(
      c.id, req.user!.id,
      `Official Treatment Quotation v${version} issued for RM ${(totalSen / 100).toFixed(2)} (Tax: ${taxRatePct}%). Inclusions and terms are available in the quotation card.`,
      iso()
    );

    audit(req, "assistance.quote.issue", {
      target: ["tourism_case", c.id],
      details: { quoteId, version, totalMYR: totalSen / 100 }
    });

    res.status(201).json({
      status: "success",
      message: `Quotation v${version} issued successfully.`,
      data: formatCase(row("SELECT * FROM tourism_cases WHERE id = ?", c.id))
    });
  });
}
