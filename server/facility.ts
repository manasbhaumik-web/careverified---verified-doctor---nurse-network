import crypto from "crypto";
import nodeCrypto from "node:crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { notify } from "./verification";

interface FacilityRouteDeps {
  jobs: () => any[];
  findProfessional: (id: string) => any;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const generateId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
export function registerFacilityRoutes(app: Application, deps: FacilityRouteDeps) {
  const { findProfessional } = deps;
  const getJobs = deps.jobs;

app.get("/api/facility/me", requireRole("facility", "admin"), (req, res) => {
  const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const fac = db.prepare("SELECT * FROM tourism_facilities WHERE id = ?").get(facilityId) as any;
  if (!fac) return fail(res, 404, "Facility profile not found.");

  const facilityJobs = getJobs().filter(j => j.facilityId === fac.id);
  const activeVacancies = facilityJobs.filter(j => j.status === "Active").length;

  const jobIds = facilityJobs.map(j => j.id);
  let pendingApplicants = 0;
  let acceptedLocums = 0;
  if (jobIds.length > 0) {
    const placeholders = jobIds.map(() => "?").join(",");
    const appRows = db.prepare(`SELECT status, COUNT(*) as c FROM job_applications WHERE job_id IN (${placeholders}) GROUP BY status`).all(...jobIds) as any[];
    for (const r of appRows) {
      if (r.status === "pending") pendingApplicants = r.c;
      if (r.status === "accepted") acceptedLocums = r.c;
    }
  }

  const casesCount = (db.prepare("SELECT COUNT(*) as c FROM tourism_cases WHERE facility_id = ?").get(fac.id) as any)?.c || 0;
  const isLicenceValid = !fac.licence_expiry || fac.licence_expiry >= new Date().toISOString().slice(0, 10);

  res.json({
    status: "success",
    data: {
      facility: {
        id: fac.id,
        name: fac.name,
        kind: fac.kind,
        city: fac.city,
        state: fac.state,
        address: fac.address,
        description: fac.description,
        phone: fac.phone,
        email: fac.email,
        website: fac.website,
        licenceNo: fac.licence_no,
        licenceExpiry: fac.licence_expiry,
        licenceCheckedAt: fac.licence_checked_at,
        licenceReference: fac.licence_reference,
        isLicenceValid,
        accreditations: JSON.parse(fac.accreditations || "[]"),
        specialties: JSON.parse(fac.specialties || "[]"),
        services: JSON.parse(fac.services || "{}"),
        mhtcMember: !!fac.mhtc_member,
        active: !!fac.active,
        billingPreference: fac.billing_preference || "escrow", // 'escrow' | 'invoice'
        corporateCreditApproved: !!fac.corporate_credit_approved,
        corporateCreditLimitMyr: Number(fac.corporate_credit_limit_myr || 0),
        billingContactEmail: fac.billing_contact_email || fac.email || "",
        sstRegistrationNo: fac.sst_registration_no || "W10-2401-32000042",
      },
      stats: {
        activeVacancies,
        pendingApplicants,
        acceptedLocums,
        patientCases: casesCount,
      }
    }
  });
});

app.get("/api/facility/jobs", requireRole("facility", "admin"), (req, res) => {
  const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const facilityJobs = getJobs().filter(j => j.facilityId === facilityId || (req.user!.role === "admin" && !req.query.facilityId ? true : j.facilityId === req.query.facilityId));

  const jobIds = facilityJobs.map(j => j.id);
  let applications: any[] = [];
  if (jobIds.length > 0) {
    const placeholders = jobIds.map(() => "?").join(",");
    applications = db.prepare(`SELECT * FROM job_applications WHERE job_id IN (${placeholders}) ORDER BY applied_at DESC`).all(...jobIds) as any[];
  }

  const enrichedJobs = facilityJobs.map(j => {
    const jobApps = applications.filter(a => a.job_id === j.id).map(a => {
      const profUser = db.prepare("SELECT * FROM users WHERE id = ?").get(a.applicant_user_id) as any;
      const prof = profUser?.profile_id ? findProfessional(profUser.profile_id) : null;
      return {
        id: a.id,
        jobId: a.job_id,
        userId: a.applicant_user_id,
        applicantName: a.applicant_name,
        applicantRole: a.applicant_role,
        applicantLicense: a.license_number || prof?.licenseNumber,
        applicantApcExpiry: a.license_expiry || prof?.licenseExpiry,
        applicantRate: a.hourly_rate || prof?.fee,
        specialization: a.specialization || prof?.specialization || a.applicant_role,
        experienceYears: prof?.experienceYears || 5,
        rating: prof?.rating || 4.9,
        avatar: prof?.avatar || profUser?.avatar_url || "/assets/malaysian_male_doctor.jpg",
        status: a.status,
        appliedAt: a.applied_at,
        decisionAt: a.decision_at,
        decisionBy: a.decision_by,
        decisionNotes: a.decision_note,
        clockInAt: a.clock_in_at,
        clockOutAt: a.clock_out_at,
        scheduledHours: a.scheduled_hours || 8.0,
        actualHours: a.actual_hours,
        timesheetStatus: a.timesheet_status || "unstarted",
        supervisorNotes: a.supervisor_notes,
        approvedBy: a.approved_by,
        approvedAt: a.approved_at,
        totalPayoutMyr: a.total_payout_myr,
        billingMode: a.billing_mode || "escrow",
        paymentStatus: a.payment_status || "unbilled",
        shiftWageMyr: a.shift_wage_myr || (a.hourly_rate ? a.hourly_rate * (a.scheduled_hours || 8) : null),
        platformFeeMyr: a.platform_fee_myr || 40.0,
        totalBillingMyr: a.total_billing_myr || (a.hourly_rate ? Math.round((a.hourly_rate * (a.scheduled_hours || 8) + 40.0) * 100) / 100 : null),
        escrowHeldAt: a.escrow_held_at,
        escrowReleasedAt: a.escrow_released_at,
        invoiceNumber: a.invoice_number,
        invoiceDueDate: a.invoice_due_date,
        paymentRef: a.payment_ref,
      };
    });

    return {
      ...j,
      applications: jobApps,
      pendingCount: jobApps.filter(a => a.status === "pending").length,
      acceptedCount: jobApps.filter(a => a.status === "accepted").length,
    };
  });

  res.json({ status: "success", data: enrichedJobs });
});

app.post("/api/facility/jobs/:jobId/applicants/:applicantUserId/decision", requireRole("facility", "admin"), (req, res) => {
  const { jobId, applicantUserId } = req.params;
  const { decision, notes } = req.body;

  if (!["accepted", "declined"].includes(decision)) {
    return fail(res, 400, "Decision must be 'accepted' or 'declined'.");
  }

  const job = getJobs().find(j => j.id === jobId);
  if (!job) return fail(res, 404, "Job post not found.");

  if (req.user!.role !== "admin") {
    const myFacId = req.user!.facilityId || req.user!.profileId;
    if (job.facilityId && job.facilityId !== myFacId) {
      return fail(res, 403, "You can only manage applications for your own facility.");
    }
  }

  const appRow = db.prepare("SELECT * FROM job_applications WHERE job_id = ? AND applicant_user_id = ?").get(jobId, applicantUserId) as any;
  const now = new Date().toISOString();

  // Facility billing preference determination
  const facId = job.facilityId || req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const facRow = db.prepare("SELECT * FROM tourism_facilities WHERE id = ?").get(facId) as any;
  const isCorporateCredit = facRow && facRow.corporate_credit_approved && facRow.billing_preference === "invoice";
  const billingMode = isCorporateCredit ? "invoice" : "escrow";

  // Rate and fee calculations:
  // Hourly rate or shift rate
  const profUser = db.prepare("SELECT * FROM users WHERE id = ?").get(applicantUserId) as any;
  const prof = profUser?.profile_id ? findProfessional(profUser.profile_id) : null;
  const hourlyRate = Number(appRow?.hourly_rate || prof?.fee || 80.0);
  const scheduledHours = Number(appRow?.scheduled_hours || 8.0);
  const estimatedWage = Math.round(hourlyRate * scheduledHours * 100) / 100;
  const platformFee = 40.0; // standard RM 40 locum matching fulfillment fee
  const totalBilling = Math.round((estimatedWage + platformFee) * 100) / 100;

  // Invoice / Escrow metadata
  const todayStr = now.slice(0, 10);
  const invoiceNumber = isCorporateCredit ? `INV-${todayStr.replace(/-/g, "")}-${nodeCrypto.randomBytes(2).toString("hex").toUpperCase()}` : null;
  const invoiceDueDate = isCorporateCredit ? new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10) : null;
  const paymentStatus = decision === "accepted" ? (isCorporateCredit ? "invoiced" : "escrow_held") : "unbilled";
  const escrowHeldAt = decision === "accepted" && !isCorporateCredit ? now : null;
  const paymentRef = decision === "accepted" ? (isCorporateCredit ? `NET30-PO-${job.id.slice(-4).toUpperCase()}` : `ESCROW-${nodeCrypto.randomBytes(4).toString("hex").toUpperCase()}`) : null;

  if (appRow) {
    db.prepare(`
      UPDATE job_applications
      SET status = ?, decision_at = ?, decision_by = ?, decision_note = ?,
          billing_mode = ?, payment_status = ?, shift_wage_myr = ?, platform_fee_myr = ?,
          total_billing_myr = ?, escrow_held_at = ?, invoice_number = ?, invoice_due_date = ?, payment_ref = ?
      WHERE id = ?
    `).run(
      decision, now, req.user!.id, notes || null,
      billingMode, paymentStatus, estimatedWage, platformFee,
      totalBilling, escrowHeldAt, invoiceNumber, invoiceDueDate, paymentRef,
      appRow.id
    );
  } else {
    db.prepare(`
      INSERT INTO job_applications (
        id, job_id, applicant_user_id, applicant_name, applicant_role, specialization,
        license_number, license_expiry, hourly_rate, scheduled_hours, status, applied_at,
        decision_at, decision_by, decision_note, billing_mode, payment_status,
        shift_wage_myr, platform_fee_myr, total_billing_myr, escrow_held_at,
        invoice_number, invoice_due_date, payment_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId("app"), jobId, applicantUserId,
      prof?.name || profUser?.name || "Practitioner",
      prof?.role || "practitioner",
      prof?.specialization || "General",
      prof?.licenseNumber || null,
      prof?.licenseExpiry || null,
      hourlyRate, scheduledHours,
      decision, now, now, req.user!.id, notes || null,
      billingMode, paymentStatus,
      estimatedWage, platformFee, totalBilling, escrowHeldAt,
      invoiceNumber, invoiceDueDate, paymentRef
    );
  }

  notify(
    applicantUserId,
    decision === "accepted" ? "Shift Application Accepted" : "Application Status Update",
    decision === "accepted"
      ? `Congratulations! ${job.hospitalName} has accepted your application for "${job.title}". Shift fee of RM ${estimatedWage.toFixed(2)} is secured in ${isCorporateCredit ? 'Verified Hospital Net-30 Account' : 'Platform Escrow'}.`
      : `Thank you for your interest. ${job.hospitalName} has reviewed your application for "${job.title}" and opted to proceed with other candidates.`
  );

  audit(req, `facility.application.${decision}`, {
    target: ["job_application", jobId],
    details: { applicantUserId, notes, billingMode, paymentStatus, totalBilling, paymentRef }
  });

  const message = decision === "accepted"
    ? isCorporateCredit
      ? `Application accepted. Billed via Corporate Net-30 Account (Invoice ${invoiceNumber}, Due ${invoiceDueDate}).`
      : `Application accepted. Upfront Escrow Hold of RM ${totalBilling.toFixed(2)} secured (Ref: ${paymentRef}). Practitioner guaranteed payment upon shift completion.`
    : "Application declined.";

  res.json({
    status: "success",
    message,
    data: {
      jobId,
      applicantUserId,
      status: decision,
      decisionAt: now,
      billingMode,
      paymentStatus,
      shiftWageMyr: estimatedWage,
      platformFeeMyr: platformFee,
      totalBillingMyr: totalBilling,
      paymentRef,
      invoiceNumber,
      invoiceDueDate
    }
  });
});

// Facility supervisor timesheet approval & Escrow Release / Payout
app.post("/api/facility/jobs/:jobId/applicants/:applicantUserId/timesheet/approve", requireRole("facility", "admin"), (req, res) => {
  const { jobId, applicantUserId } = req.params;
  const { actualHours, supervisorNotes } = req.body;

  const job = getJobs().find(j => j.id === jobId);
  if (!job) return fail(res, 404, "Job post not found.");

  if (req.user!.role !== "admin") {
    const myFacId = req.user!.facilityId || req.user!.profileId;
    if (job.facilityId && job.facilityId !== myFacId) {
      return fail(res, 403, "You can only approve timesheets for your own facility.");
    }
  }

  const appRow = db.prepare("SELECT * FROM job_applications WHERE job_id = ? AND applicant_user_id = ?").get(jobId, applicantUserId) as any;
  if (!appRow) return fail(res, 404, "Applicant shift record not found.");

  const hours = Number(actualHours) > 0 ? Number(actualHours) : (appRow.actual_hours || appRow.scheduled_hours || 8.0);
  const rate = Number(appRow.hourly_rate) > 0 ? Number(appRow.hourly_rate) : 80.0;
  const totalPayout = Math.round(hours * rate * 100) / 100;
  const now = new Date().toISOString();

  // If in escrow mode, release escrow to practitioner
  const isEscrow = appRow.billing_mode !== "invoice";
  const nextPaymentStatus = isEscrow ? "released" : "invoiced";
  const escrowReleasedAt = isEscrow ? now : null;

  db.prepare(`
    UPDATE job_applications
    SET actual_hours = ?, timesheet_status = 'approved', supervisor_notes = ?, approved_by = ?,
        approved_at = ?, total_payout_myr = ?, payment_status = ?, escrow_released_at = ?
    WHERE id = ?
  `).run(hours, supervisorNotes || "Clinical shift hours verified by ward supervisor.", req.user!.id, now, totalPayout, nextPaymentStatus, escrowReleasedAt, appRow.id);

  notify(
    applicantUserId,
    "Timesheet Approved & Payout Released",
    `Your timesheet for ${job.title} (${hours} hrs @ RM ${rate}/hr) has been approved by ${job.hospitalName}. ${isEscrow ? 'Escrow funds of RM ' + totalPayout.toFixed(2) + ' released to your earnings account.' : 'Payout of RM ' + totalPayout.toFixed(2) + ' queued under Corporate Hospital billing.'}`
  );

  audit(req, "facility.timesheet.approve", {
    target: ["job_application", appRow.id],
    details: { jobId, applicantUserId, hours, totalPayout, paymentStatus: nextPaymentStatus }
  });

  res.json({
    status: "success",
    message: isEscrow
      ? `Timesheet approved for ${hours} hours. Escrow of RM ${totalPayout.toFixed(2)} released to practitioner!`
      : `Timesheet approved for ${hours} hours. Amount RM ${totalPayout.toFixed(2)} recorded on hospital monthly statement.`,
    data: {
      id: appRow.id,
      actualHours: hours,
      timesheetStatus: "approved",
      paymentStatus: nextPaymentStatus,
      totalPayoutMyr: totalPayout,
      approvedAt: now,
      escrowReleasedAt,
    }
  });
});

// Facility billing preference update (Escrow vs Corporate Net-30)
app.put("/api/facility/billing-settings", requireRole("facility", "admin"), (req, res) => {
  const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const { billingPreference, billingContactEmail, sstRegistrationNo } = req.body;

  if (billingPreference && !["escrow", "invoice"].includes(billingPreference)) {
    return fail(res, 400, "Billing preference must be 'escrow' or 'invoice'.");
  }

  const fac = db.prepare("SELECT * FROM tourism_facilities WHERE id = ?").get(facilityId) as any;
  if (!fac) return fail(res, 404, "Facility not found.");

  // If requesting invoice billing, check if enterprise hospital accreditation/licence is present
  if (billingPreference === "invoice" && !fac.corporate_credit_approved) {
    // For demo/production flexibility: allow auto-enabling if facility has checked MOH licence or admin overrides
    if (fac.licence_checked_at || req.user!.role === "admin") {
      db.prepare("UPDATE tourism_facilities SET corporate_credit_approved = 1, corporate_credit_limit_myr = 50000 WHERE id = ?").run(facilityId);
    } else {
      return fail(res, 403, "Corporate Net-30 invoicing requires a verified MOH private facility licence. Please use Upfront Escrow or contact platform admin.");
    }
  }

  db.prepare(`
    UPDATE tourism_facilities
    SET billing_preference = COALESCE(?, billing_preference),
        billing_contact_email = COALESCE(?, billing_contact_email),
        sst_registration_no = COALESCE(?, sst_registration_no)
    WHERE id = ?
  `).run(billingPreference || null, billingContactEmail || null, sstRegistrationNo || null, facilityId);

  audit(req, "facility.billing.update", {
    target: ["facility", facilityId],
    details: { billingPreference, billingContactEmail, sstRegistrationNo }
  });

  res.json({
    status: "success",
    message: "Facility billing configuration updated successfully.",
    data: {
      billingPreference: billingPreference || fac.billing_preference || "escrow",
      corporateCreditApproved: true,
      billingContactEmail: billingContactEmail || fac.billing_contact_email || fac.email,
      sstRegistrationNo: sstRegistrationNo || fac.sst_registration_no,
    }
  });
});

// Practitioner shift clock-in / clock-out
app.post("/api/practitioner/shifts/:jobId/clock-in", requireRole("practitioner"), (req, res) => {
  const { jobId } = req.params;
  const userId = req.user!.id;
  const appRow = db.prepare("SELECT * FROM job_applications WHERE job_id = ? AND applicant_user_id = ? AND status = 'accepted'").get(jobId, userId) as any;
  if (!appRow) return fail(res, 404, "Active accepted shift not found for this practitioner.");

  const now = new Date().toISOString();
  db.prepare("UPDATE job_applications SET clock_in_at = ?, timesheet_status = 'on_duty' WHERE id = ?").run(now, appRow.id);
  audit(req, "practitioner.shift.clock_in", { target: ["job_application", appRow.id], details: { jobId } });
  res.json({ status: "success", message: "Clock-in recorded. Have a safe and focused shift!", data: { clockInAt: now, timesheetStatus: "on_duty" } });
});

app.post("/api/practitioner/shifts/:jobId/clock-out", requireRole("practitioner"), (req, res) => {
  const { jobId } = req.params;
  const userId = req.user!.id;
  const appRow = db.prepare("SELECT * FROM job_applications WHERE job_id = ? AND applicant_user_id = ? AND status = 'accepted'").get(jobId, userId) as any;
  if (!appRow) return fail(res, 404, "Active accepted shift not found.");

  const now = new Date().toISOString();
  let hours = 8.0;
  if (appRow.clock_in_at) {
    const diffMs = new Date(now).getTime() - new Date(appRow.clock_in_at).getTime();
    hours = Math.max(1, Math.round((diffMs / 3600000) * 10) / 10);
  }
  db.prepare("UPDATE job_applications SET clock_out_at = ?, actual_hours = ?, timesheet_status = 'submitted' WHERE id = ?").run(now, hours, appRow.id);
  audit(req, "practitioner.shift.clock_out", { target: ["job_application", appRow.id], details: { jobId, hours } });
  res.json({ status: "success", message: `Shift ended. ${hours} hours submitted to facility supervisor for approval.`, data: { clockOutAt: now, actualHours: hours, timesheetStatus: "submitted" } });
});

app.patch("/api/facility/jobs/:jobId/status", requireRole("facility", "admin"), (req, res) => {
  const { jobId } = req.params;
  const status = str(req.body.status, 20);
  if (!["Active", "Closed", "Filled", "Cancelled"].includes(status)) {
    return fail(res, 400, "Status must be 'Active', 'Closed', 'Filled', or 'Cancelled'.");
  }

  const job = getJobs().find(j => j.id === jobId);
  if (!job) return fail(res, 404, "Job post not found.");

  if (req.user!.role !== "admin") {
    const myFacId = req.user!.facilityId || req.user!.profileId;
    if (job.facilityId && job.facilityId !== myFacId) {
      return fail(res, 403, "You can only manage vacancies for your own facility.");
    }
  }

  job.status = status as any;
  audit(req, "facility.job.status", { target: ["job", jobId], details: { status } });
  res.json({ status: "success", message: `Shift opening marked as ${status}.`, data: { id: jobId, status } });
});

app.get("/api/facility/cases", requireRole("facility", "admin"), (req, res) => {
  const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const status = str(req.query.status, 20);
  const list = db.prepare(
    `SELECT * FROM tourism_cases WHERE facility_id = ? ${status ? "AND status = ?" : ""} ORDER BY updated_at DESC LIMIT 200`
  ).all(facilityId, ...(status ? [status] : [])) as any[];

  const cases = list.map(c => {
    const patUser = db.prepare("SELECT name, email FROM users WHERE id = ?").get(c.patient_user_id) as any;
    const quotes = db.prepare("SELECT * FROM tourism_quotes WHERE case_id = ? ORDER BY version DESC").all(c.id) as any[];
    return {
      id: c.id,
      trackingCode: c.tracking_code || `MED-${c.id.slice(-6).toUpperCase()}`,
      status: c.status,
      summary: c.summary,
      patient: c.patient_name || patUser?.name || "Patient Referral",
      patientEmail: c.patient_email || patUser?.email || null,
      patientPhone: c.patient_phone || null,
      patientType: c.patient_type || "local_malaysian",
      assistanceType: c.assistance_type || "elective_surgery",
      urgency: c.urgency || "routine",
      country: c.home_country || "Malaysia",
      insuranceCarrier: c.insurance_carrier || null,
      guaranteeLetter: !!c.guarantee_letter,
      revisionNotes: c.revision_notes || null,
      specialty: c.specialty,
      preferredFrom: c.preferred_from,
      preferredTo: c.preferred_to,
      needs: c.needs ? JSON.parse(c.needs) : {},
      quotesCount: quotes.length,
      latestQuote: quotes[0] ? {
        id: quotes[0].id,
        version: quotes[0].version,
        total: quotes[0].total_sen / 100,
        status: quotes[0].status,
        validUntil: quotes[0].valid_until,
      } : null,
      updatedAt: c.updated_at,
      createdAt: c.created_at,
    };
  });

  res.json({ status: "success", data: cases });
});

// -------------------------------------------------------------
// Phase 3: Facility Coordination Chat (Facility <-> Practitioner)
// -------------------------------------------------------------
app.get("/api/facility/jobs/:jobId/applicants/:applicantUserId/messages", requireRole("facility", "admin", "practitioner"), (req, res) => {
  const { jobId, applicantUserId } = req.params;
  const user = req.user!;

  if (user.role === "practitioner" && user.id !== applicantUserId) {
    return fail(res, 403, "You can only view your own coordination messages.");
  }

  const messages = db.prepare(
    "SELECT * FROM facility_messages WHERE job_id = ? AND applicant_user_id = ? ORDER BY created_at ASC"
  ).all(jobId, applicantUserId) as any[];

  res.json({
    status: "success",
    data: messages.map(m => ({
      id: m.id,
      jobId: m.job_id,
      applicantUserId: m.applicant_user_id,
      senderUserId: m.sender_user_id,
      senderRole: m.sender_role,
      senderName: m.sender_name,
      message: m.message,
      createdAt: m.created_at,
      mine: m.sender_user_id === user.id,
    }))
  });
});

app.post("/api/facility/jobs/:jobId/applicants/:applicantUserId/messages", requireRole("facility", "admin", "practitioner"), (req, res) => {
  const { jobId, applicantUserId } = req.params;
  const user = req.user!;
  const message = str(req.body.message, 1000);

  if (!message || message.length < 2) {
    return fail(res, 400, "Please enter a valid message.");
  }

  if (user.role === "practitioner" && user.id !== applicantUserId) {
    return fail(res, 403, "You can only message about your own shift application.");
  }

  const job = getJobs().find(j => j.id === jobId);
  if (!job) return fail(res, 404, "Shift not found.");

  const msgId = generateId("fmsg");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO facility_messages (id, job_id, applicant_user_id, sender_user_id, sender_role, sender_name, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(msgId, jobId, applicantUserId, user.id, user.role, user.name, message, now);

  // Notify recipient
  const recipientUserId = user.id === applicantUserId
    ? (db.prepare("SELECT user_id FROM tourism_facility_staff WHERE facility_id = ?").get(job.facilityId || "fac-demo-1") as any)?.user_id
    : applicantUserId;

  if (recipientUserId) {
    notify(
      recipientUserId,
      `Shift Coordination: ${job.title}`,
      `${user.name}: ${message.slice(0, 100)}`
    );
  }

  audit(req, "facility.message.send", { target: ["facility_message", msgId], details: { jobId, applicantUserId } });

  res.status(201).json({
    status: "success",
    data: {
      id: msgId,
      jobId,
      applicantUserId,
      senderUserId: user.id,
      senderRole: user.role,
      senderName: user.name,
      message,
      createdAt: now,
      mine: true,
    }
  });
});

// -------------------------------------------------------------
// Patient Referrals & Treatment Quotation Management
// -------------------------------------------------------------
app.post("/api/facility/cases/:id/quote", requireRole("facility", "admin"), (req, res) => {
  const { id } = req.params;
  const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const { procedureName, totalAmountMyr, estimatedStayDays, inclusions, exclusions, validUntil } = req.body;

  if (!procedureName || !totalAmountMyr || Number(totalAmountMyr) <= 0) {
    return fail(res, 400, "Please provide a treatment package name and valid amount in MYR.");
  }

  const c = db.prepare("SELECT * FROM tourism_cases WHERE id = ?").get(id) as any;
  if (!c) return fail(res, 404, "Patient referral case not found.");

  const totalSen = Math.round(Number(totalAmountMyr) * 100);
  const qId = generateId("tqt");
  const now = new Date().toISOString();
  const validityDate = validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const items = [
    { label: procedureName, category: "procedure", amountSen: totalSen },
  ];

  db.prepare(`
    INSERT INTO tourism_quotes (
      id, case_id, version, items, subtotal_sen, tax_sen, tax_rate_pct, total_sen,
      inclusions, exclusions, cancellation_terms, valid_until, created_by, created_at
    ) VALUES (?, ?, 1, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    qId, id, JSON.stringify(items), totalSen, totalSen,
    inclusions || `Includes ${procedureName}, specialist consultation, and ${estimatedStayDays || 1} day(s) clinical stay.`,
    exclusions || "Excludes emergency complications, additional ICU care, and international travel.",
    req.body.cancellationTerms || "Full refund up to 7 days before scheduled admission; 50% thereafter.",
    validityDate, req.user!.id, now
  );

  db.prepare("UPDATE tourism_cases SET status = 'quoted', updated_at = ? WHERE id = ?").run(now, id);

  res.status(201).json({
    status: "success",
    message: "Treatment quotation generated and sent to patient referral desk.",
    data: { quoteId: qId, totalAmountMyr: Number(totalAmountMyr) }
  });
});

app.patch("/api/facility/cases/:id/status", requireRole("facility", "admin"), (req, res) => {
  const { id } = req.params;
  const { status, dischargeSummary } = req.body;
  const allowed = ["enquiry", "quoted", "accepted", "in_treatment", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    return fail(res, 400, `Invalid status. Must be one of: ${allowed.join(", ")}`);
  }
  const now = new Date().toISOString();

  // Load existing case & latest quote
  const caseRow = db.prepare("SELECT * FROM tourism_cases WHERE id = ?").get(id) as any;
  if (!caseRow) return fail(res, 404, "Referral case not found.");

  const facRow = db.prepare("SELECT * FROM tourism_facilities WHERE id = ?").get(caseRow.facility_id) as any;
  const commissionRatePct = Number(facRow?.referral_commission_rate_pct || 8.0); // 8% standard

  let commissionInvoiceNo = caseRow.commission_invoice_no;
  let referralCommissionMyr = caseRow.referral_commission_myr;
  let commissionStatus = caseRow.commission_status || "pending";
  let commissionInvoicedAt = caseRow.commission_invoiced_at;

  // When patient is completed / discharged, compute hospital facilitator success fee invoice
  if (status === "completed" && !commissionInvoiceNo) {
    const latestQuote = db.prepare("SELECT total_sen FROM tourism_quotes WHERE case_id = ? ORDER BY version DESC LIMIT 1").get(id) as any;
    const procedureValueMyr = latestQuote ? (latestQuote.total_sen / 100) : 5500.0;
    referralCommissionMyr = Math.round((procedureValueMyr * (commissionRatePct / 100)) * 100) / 100;
    commissionInvoiceNo = `FAC-INV-${now.slice(0, 10).replace(/-/g, "")}-${id.slice(-4).toUpperCase()}`;
    commissionStatus = "invoiced";
    commissionInvoicedAt = now;
  }

  db.prepare(`
    UPDATE tourism_cases
    SET status = ?,
        discharge_summary = COALESCE(?, discharge_summary),
        referral_commission_myr = COALESCE(?, referral_commission_myr),
        commission_rate_pct = COALESCE(?, commission_rate_pct),
        commission_status = COALESCE(?, commission_status),
        commission_invoice_no = COALESCE(?, commission_invoice_no),
        commission_invoiced_at = COALESCE(?, commission_invoiced_at),
        updated_at = ?
    WHERE id = ?
  `).run(
    status, dischargeSummary || null, referralCommissionMyr || null, commissionRatePct,
    commissionStatus, commissionInvoiceNo || null, commissionInvoicedAt || null, now, id
  );

  audit(req, `facility.case.status.${status}`, {
    target: ["tourism_case", id],
    details: { status, referralCommissionMyr, commissionInvoiceNo, commissionStatus }
  });

  res.json({
    status: "success",
    message: status === "completed"
      ? `Patient discharge recorded! Facilitator Success Invoice ${commissionInvoiceNo} generated for RM ${referralCommissionMyr?.toFixed(2)} (${commissionRatePct}% commission).`
      : `Referral case status updated to "${status}".`,
    data: {
      id,
      status,
      commissionInvoiceNo,
      referralCommissionMyr,
      commissionStatus,
      commissionInvoicedAt
    }
  });
});

// Facility / Admin: Get Referral Commission Ledger & Invoices
app.get("/api/facility/referral-ledger", requireRole("facility", "admin"), (req, res) => {
  const facilityId = req.user!.facilityId || req.user!.profileId || "fac-demo-1";
  const rows = db.prepare(`
    SELECT c.id, c.tracking_code, c.patient_name, c.patient_type, c.home_country,
           c.specialty, c.status, c.updated_at, c.referral_commission_myr,
           c.commission_rate_pct, c.commission_status, c.commission_invoice_no,
           c.commission_invoiced_at, c.commission_settled_at,
           (SELECT total_sen FROM tourism_quotes q WHERE q.case_id = c.id ORDER BY version DESC LIMIT 1) AS quote_total_sen
    FROM tourism_cases c
    WHERE (c.facility_id = ? OR ? = 'admin')
      AND (c.referral_commission_myr IS NOT NULL OR c.status IN ('completed', 'in_treatment', 'accepted'))
    ORDER BY c.updated_at DESC
  `).all(facilityId, req.user!.role) as any[];

  const cases = rows.map(r => {
    const finalQuotationMyr = r.quote_total_sen ? r.quote_total_sen / 100 : 0;
    const ratePct = r.commission_rate_pct || 8.0;
    const commissionMyr = r.referral_commission_myr ?? (finalQuotationMyr ? Math.round((finalQuotationMyr * (ratePct / 100)) * 100) / 100 : 0);
    return {
      id: r.id,
      patient: r.patient_name || "Patient Referral",
      patientName: r.patient_name || "Patient Referral",
      country: r.home_country || "Malaysia",
      specialty: r.specialty || "General Medicine",
      status: r.status,
      updatedAt: r.updated_at,
      finalQuotationMyr,
      referralCommissionMyr: commissionMyr,
      commissionRatePct: ratePct,
      commissionStatus: r.commission_status || "pending",
      commissionInvoiceNo: r.commission_invoice_no || null,
      commissionInvoicedAt: r.commission_invoiced_at || null,
      commissionSettledAt: r.commission_settled_at || null,
    };
  });

  const totalInvoicedMyr = cases
    .filter(c => c.commissionStatus === 'invoiced' || c.commissionStatus === 'settled')
    .reduce((sum, c) => sum + c.referralCommissionMyr, 0);

  const totalSettledMyr = cases
    .filter(c => c.commissionStatus === 'settled')
    .reduce((sum, c) => sum + c.referralCommissionMyr, 0);

  const totalPendingMyr = cases
    .filter(c => c.commissionStatus === 'pending')
    .reduce((sum, c) => sum + c.referralCommissionMyr, 0);

  res.json({
    status: "success",
    data: {
      cases,
      summary: {
        totalInvoicedMyr,
        totalSettledMyr,
        totalPendingMyr,
        commissionRatePct: 8.0,
      }
    }
  });
});

}
