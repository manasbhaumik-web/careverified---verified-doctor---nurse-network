import express from "express";
import { registerPharmacyMy } from "./server/pharmacyMy";
import { parseNric, isPassportNumber, normalisePassport, toE164, addressProblem, RELATIONSHIPS, PREFERRED_LANGUAGES } from "./src/identity";
import { registerDataOps } from "./server/dataops";
import { registerPrivacyRoutes, recordConsent, CONSENT_VERSION } from "./server/privacy";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { db, loadCollection, saveCollections } from "./server/db";
import { audit } from "./server/audit";
import {
  AuthUser, Role, attemptLogin, changePassword, createSession, createUser, destroySession, emailTaken,
  ensureAdmin, hashPassword, loadSession, passwordProblem, requireAuth, requireRole, verifyPassword,
} from "./server/auth";
import { documentsRouter, setRequestOwnerLookup, setClinicalHooks } from "./server/documents";
import { registerClinicalRoutes, createGrant, seedHealthItems, sign, rxPayload } from "./server/clinical";
import { registerPharmacyWorkspace } from "./server/pharmacy";
import { registerLiteratureRoutes, approvedLiteratureArticles } from "./server/literature";
import { registerQualityRoutes, accountForChatId, isBlocked } from "./server/quality";
import { integrationStatus } from "./server/registryProviders";
import { assessConsult, isVirtualMode, normaliseCountry, practitionerMayTreat } from "./server/telemedicine";
import { findRegistry, inferRegistryId, scopeFor, REGISTRIES, REGISTRATION_TYPES } from "./server/registries";
import { registerVerificationRoutes, notifyAdmins, notify } from "./server/verification";
import { registerPaymentRoutes, registerPaymentWebhook, setPaymentHandlers, refundPayment } from "./server/payments";
import { refundPolicy } from "./server/paymentPolicy";
import { registerCareRoutes, redFlags, emergencyNumbers } from "./server/care";

// Load environment variables
dotenv.config();

// Seed data imports
import { 
  INITIAL_DOCTORS, 
  INITIAL_NURSES, 
  INITIAL_VERIFICATION_REQUESTS, 
  INITIAL_REVIEWS, 
  INITIAL_JOBS, 
  INITIAL_ARTICLES 
} from "./src/data";
import { UserRole, VerificationStatus, ConsultationMode } from "./src/types";

const app = express();
const isProd = process.env.NODE_ENV === "production";
if (isProd) app.set("trust proxy", 1);

app.use(helmet({
  // CSP only in production: the Vite dev server injects inline scripts.
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  } : false,
}));
registerPaymentWebhook(app); // needs the raw body, so it goes before the JSON parser
app.use(express.json({ limit: "100kb" }));

// Reject cross-site state-changing requests (defence in depth on top of SameSite=Lax cookies).
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ status: "error", message: "Cross-origin request blocked." });
      }
    } catch {
      return res.status(403).json({ status: "error", message: "Bad origin." });
    }
  }
  next();
});

app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { status: "error", message: "Too many attempts. Please wait and try again." } }));
app.use("/api/auth/register-practitioner", rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/register-patient", rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.use(loadSession);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Server State In-Memory Database
let doctors = [...INITIAL_DOCTORS];
let nurses = [...INITIAL_NURSES];
let verificationRequests = [...INITIAL_VERIFICATION_REQUESTS];
let reviews = [...INITIAL_REVIEWS];
let jobs = [...INITIAL_JOBS];
let articles = [...INITIAL_ARTICLES];
let bookings: any[] = [
  {
    id: "bkg-101112",
    professionalId: "doc-1",
    professionalName: "Dr. Ananya Sen",
    professionalRole: UserRole.DOCTOR,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "patient@example.com",
    date: "2026-07-12",
    timeSlot: "10:00 AM",
    mode: ConsultationMode.VIDEO,
    fee: 150,
    paymentStatus: "Paid",
    status: "Upcoming",
    symptoms: "Mild chest tightness after walking, occasional high heart rate.",
    createdAt: "2026-07-08T10:00:00.000Z"
  },
  {
    id: "bkg-202223",
    professionalId: "doc-2",
    professionalName: "Dr. Rajesh K. Sharma",
    professionalRole: UserRole.DOCTOR,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "patient@example.com",
    date: "2026-07-05",
    timeSlot: "11:00 AM",
    mode: ConsultationMode.IN_PERSON,
    fee: 120,
    paymentStatus: "Paid",
    status: "Completed",
    symptoms: "Allergic cough, nasal congestion, low-grade fever for 3 days.",
    createdAt: "2026-07-04T15:30:00.000Z",
    prescription: {
      diagnosis: "Acute Bronchitis & Seasonal Allergy Flare-up",
      medicines: "1. Tab Cetirizine 10mg - 1 tablet before sleeping for 5 days\n2. Tab Paracetamol 650mg - 1 tablet SOS if fever > 100°F (Max 3/day)\n3. Levosalbutamol Inhaler - 2 puffs every 6 hours if wheezing",
      instructions: "Keep hydrated. Avoid cold fluids and exposure to dust. Steam inhalation twice a day. Return for review if shortness of breath increases.",
      issuedAt: "2026-07-05T11:45:00.000Z",
      digitalSignature: "Digitally Signed & Certified by Dr. Rajesh K. Sharma (MMC-32109)"
    }
  }
];
let chats: any[] = [];
let patients: any[] = [];

// --- Packages Modular Architecture State ---
let appPackages: any[] = [
  {
    id: "patient_dashboard",
    name: "Member Portal Hub",
    description: "Allows members to manage active bookings, view digital prescriptions, log vital health stats, and save doctor profiles.",
    icon: "Heart",
    isEnabled: true,
    category: "Patient Services",
    version: "2.1.0",
    author: "MediCert Core Dev",
    isRemovable: false
  },
  {
    id: "registry",
    name: "Doctors & Nurses Directory",
    description: "Search engine for patients to locate certified medical practitioners with advanced filters and clinical triage matcher.",
    icon: "Search",
    isEnabled: true,
    category: "Patient Services",
    version: "1.8.5",
    author: "MediCert Core Dev",
    isRemovable: false
  },
  {
    id: "recruitment",
    name: "Shift Vacancies & Recruitment",
    description: "B2B job recruitment board matching clinical healthcare institutions with credential-approved practitioners for active shift fill-ins.",
    icon: "Calendar",
    isEnabled: true,
    category: "Clinical Operations",
    version: "1.4.0",
    author: "MediCert B2B Group",
    isRemovable: true
  },
  {
    id: "articles",
    name: "Peer-Reviewed Medical Library",
    description: "Publish patient-facing health guidance papers written by licensed clinical practitioners, backed by PubMed citation metrics.",
    icon: "BookOpen",
    isEnabled: true,
    category: "SEO & Growth",
    version: "1.2.0",
    author: "EEAT Compliance Team",
    isRemovable: true
  },
  {
    id: "onboard",
    name: "Practitioner Credential Portal",
    description: "Multi-stage onboarding gateway for doctors and nurses to submit government license keys and registry files for audit verification.",
    icon: "PlusCircle",
    isEnabled: true,
    category: "Credentialing",
    version: "2.0.1",
    author: "Medical Board Audit Team",
    isRemovable: false
  },
  {
    id: "messages",
    name: "HIPAA Secure Mailroom",
    description: "Encrypted instant messaging system connecting vetted medical staff with patient accounts for safe telehealth pre-consultation.",
    icon: "MessageSquare",
    isEnabled: true,
    category: "Communication",
    version: "1.1.2",
    author: "SecOps Security Team",
    isRemovable: true
  },
  {
    id: "seo",
    name: "Google Rich Snippets SEO",
    description: "Dynamic Schema.org structural JSON-LD metadata generator and Google sitemap dynamic indexing automation tracker.",
    icon: "Globe",
    isEnabled: true,
    category: "SEO & Growth",
    version: "1.0.4",
    author: "MediCert Growth Labs",
    isRemovable: true
  }
];

// Restore persisted state (falls back to seed data on first run) and make sure an admin exists.
doctors = loadCollection("doctors", doctors);
nurses = loadCollection("nurses", nurses);
verificationRequests = loadCollection("verificationRequests", verificationRequests);
reviews = loadCollection("reviews", reviews);
jobs = loadCollection("jobs", jobs);
bookings = loadCollection("bookings", bookings);
chats = loadCollection("chats", chats);
patients = loadCollection("patients", patients);
appPackages = loadCollection("appPackages", appPackages);
ensureAdmin();

const DEMO_PASSWORD = "DemoPass123";

function ensureDemoData() {
  const now = new Date().toISOString();

  // 1. Demo Doctor profile & user
  let docProfile = doctors.find(d => d.licenseNumber === "DEMO-MMC-0001" || d.id === "doc-demo-1");
  if (!docProfile) {
    docProfile = {
      id: "doc-demo-1",
      name: "Dr Demo Physician",
      avatar: "/assets/malaysian_male_doctor.jpg",
      role: UserRole.DOCTOR,
      specialization: "General Physician",
      licenseNumber: "DEMO-MMC-0001",
      licenseExpiry: "2029-12-31",
      medicalCouncil: "Malaysian Medical Council (MMC)",
      experienceYears: 8,
      education: ["MBBS (Universiti Malaya)"],
      bio: "Board-verified general physician providing outpatient and tele-triage consultations.",
      languages: ["English", "Malay"],
      consultationModes: [ConsultationMode.IN_PERSON, ConsultationMode.VIDEO],
      fee: 60,
      rating: 4.9,
      reviewCount: 12,
      verificationStatus: VerificationStatus.VERIFIED,
      practiceAddress: "1 Jalan Demo, Kuala Lumpur",
      city: "Kuala Lumpur",
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM", "10:00 AM", "02:00 PM", "04:00 PM"]
      },
      seoSlug: "dr-demo-physician-general-physician-kuala-lumpur"
    };
    doctors.push(docProfile);
  }

  let docUser = db.prepare("SELECT * FROM users WHERE email = ?").get("demo.doctor@careverified.test") as any;
  if (!docUser) {
    docUser = createUser({
      id: "usr-demo-doctor",
      email: "demo.doctor@careverified.test",
      password: DEMO_PASSWORD,
      role: "practitioner",
      name: "Dr Demo Physician",
      avatarUrl: "/assets/malaysian_male_doctor.jpg",
      profileId: docProfile.id,
      consentVersion: "2026-11",
    });
  } else if (!docUser.profile_id) {
    db.prepare("UPDATE users SET profile_id = ? WHERE id = ?").run(docProfile.id, docUser.id);
  }

  // Weekday on-call roster 08:00-20:00 for Demo Doctor
  const insRoster = db.prepare("INSERT OR IGNORE INTO roster (profile_id, day, hour) VALUES (?, ?, ?)");
  for (let day = 0; day < 5; day++) {
    for (let hour = 8; hour < 20; hour++) {
      insRoster.run(docProfile.id, day, hour);
    }
  }

  // 2. Demo Patient (Member) profile & user
  let patUser = db.prepare("SELECT * FROM users WHERE email = ?").get("demo.patient@careverified.test") as any;
  if (!patUser) {
    patUser = createUser({
      id: "usr-demo-patient",
      email: "demo.patient@careverified.test",
      password: DEMO_PASSWORD,
      role: "patient",
      name: "Demo Patient",
      avatarUrl: "/assets/malaysian_male_patient.jpg",
      consentVersion: "2026-11",
    });
  }

  let patProfile = patients.find(p => p.userId === patUser.id || p.email === "demo.patient@careverified.test");
  if (!patProfile) {
    patProfile = {
      id: "pat-99912",
      userId: patUser.id,
      name: "Demo Patient",
      email: "demo.patient@careverified.test",
      icNumber: "900101-14-0000",
      age: 34,
      phone: "+60-12-000-0000",
      gender: "Female",
      chronicConditions: ["Hypertension"],
      allergies: ["Penicillin"],
      emergencyContactName: "Ahmad Ramli",
      emergencyContactPhone: "+60-12-345-6789",
      registeredAt: now,
    };
    patients.push(patProfile);
  }

  // Attach initial seed bookings to Demo Patient so they appear in Member Portal
  for (const b of bookings) {
    if (b.patientId === "pat-99912" && !b.patientUserId) {
      b.patientUserId = patUser.id;
      b.patientName = "Demo Patient";
      b.patientEmail = "demo.patient@careverified.test";
    }
  }

  const existingItems = db.prepare("SELECT COUNT(*) AS c FROM health_items WHERE user_id = ?").get(patUser.id) as { c: number };
  if (!existingItems?.c) {
    seedHealthItems(patUser.id, ["Hypertension"], ["Penicillin"]);
    db.prepare(
      "INSERT INTO health_items (id, user_id, type, name, detail, severity, active, created_at, updated_at) VALUES (?, ?, 'medication', 'Warfarin', '3 mg at night', NULL, 1, ?, ?)"
    ).run("hi-demo-med-1", patUser.id, now, now);
    db.prepare(
      "INSERT INTO vitals (id, user_id, ts, kind, value1, value2, unit, note) VALUES (?, ?, ?, 'bp', 134, 86, 'mmHg', 'Morning reading')"
    ).run("vit-demo-bp-1", patUser.id, now);
  }
  createGrant(patUser.id, docProfile.id, "booking", "bkg-202223", 365);

  // 3. Demo Pharmacies & Pharmacy Workspace User
  let demoPharm = db.prepare("SELECT * FROM pharmacies WHERE name = 'Demo Pharmacy'").get() as any;
  if (!demoPharm) {
    const id = "phm-demo-1";
    db.prepare(
      `INSERT INTO pharmacies (id, name, address, city, phone, hours, services, pin_hash, active, licence_no, pharmacist_name, pharmacist_reg, verified_at, verified_by, created_at)
       VALUES (?, 'Demo Pharmacy', '2 Jalan Demo, Kuala Lumpur', 'Kuala Lumpur', '03-5550 0100', 'Mon–Sat 9am–10pm', ?, ?, 1, 'DEMO-PH-0001', 'Demo Pharmacist', 'DEMO-RPh-0001', ?, 'usr-demo-admin', ?)`
    ).run(id, JSON.stringify(["Home delivery", "Vaccinations"]), hashPassword("123456"), now, now);
    demoPharm = db.prepare("SELECT * FROM pharmacies WHERE id = ?").get(id);
  } else if (!demoPharm.verified_at) {
    db.prepare(
      "UPDATE pharmacies SET active = 1, licence_no = 'DEMO-PH-0001', pharmacist_name = 'Demo Pharmacist', pharmacist_reg = 'DEMO-RPh-0001', verified_at = ? WHERE id = ?"
    ).run(now, demoPharm.id);
  }

  const secondPharm = db.prepare("SELECT 1 AS x FROM pharmacies WHERE name = 'Demo 24h Pharmacy'").get();
  if (!secondPharm) {
    db.prepare(
      `INSERT INTO pharmacies (id, name, address, city, phone, hours, services, pin_hash, active, licence_no, pharmacist_name, pharmacist_reg, verified_at, verified_by, created_at)
       VALUES ('phm-demo-2', 'Demo 24h Pharmacy', '15 Jalan Contoh, George Town', 'Penang', '04-5550 0200', 'Open 24 hours', ?, ?, 1, 'DEMO-PH-0002', 'Lim Wei', 'DEMO-RPh-0002', ?, 'usr-demo-admin', ?)`
    ).run(JSON.stringify(["24 hours", "Drive-through", "Online ordering"]), hashPassword("654321"), now, now);
  }

  let pharmUser = db.prepare("SELECT * FROM users WHERE email = ?").get("demo.pharmacy@careverified.test") as any;
  if (!pharmUser) {
    pharmUser = createUser({
      id: "usr-demo-pharmacy",
      email: "demo.pharmacy@careverified.test",
      password: DEMO_PASSWORD,
      role: "pharmacy",
      name: "Demo Pharmacy Team",
      profileId: demoPharm.id,
    });
    db.prepare("UPDATE users SET pharmacy_owner = 1, must_change_password = 0 WHERE id = ?").run(pharmUser.id);
  } else if (pharmUser.profile_id !== demoPharm.id || pharmUser.must_change_password) {
    db.prepare("UPDATE users SET profile_id = ?, pharmacy_owner = 1, must_change_password = 0 WHERE id = ?").run(demoPharm.id, pharmUser.id);
  }

  // Seed sample prescriptions in Demo Pharmacy inbox if empty
  const rxCount = (db.prepare("SELECT COUNT(*) AS c FROM prescriptions WHERE pharmacy_id = ?").get(demoPharm.id) as { c: number })?.c ?? 0;
  if (rxCount === 0) {
    const validUntil = new Date(Date.now() + 30 * 86400_000).toISOString();
    const samples = [
      {
        id: "rx-demo-1",
        code: "DEMORX2001",
        diagnosis: "Seasonal allergic rhinitis",
        items: [{ name: "cetirizine", strength: "10 mg", form: "tablet", dose: "1 tablet", frequency: "once daily", durationDays: 7, quantity: 7, instructions: "At night" }],
        fillStatus: null,
        fillReason: null,
      },
      {
        id: "rx-demo-2",
        code: "DEMORX2002",
        diagnosis: "Viral upper respiratory infection",
        items: [{ name: "paracetamol", strength: "500 mg", form: "tablet", dose: "1 tablet", frequency: "every 6 hours if needed", durationDays: 3, quantity: 12, instructions: "After food" }],
        fillStatus: "preparing",
        fillReason: null,
      },
      {
        id: "rx-demo-3",
        code: "DEMORX2003",
        diagnosis: "Allergic rhinitis, follow-up",
        items: [{ name: "cetirizine", strength: "10 mg", form: "tablet", dose: "1 tablet", frequency: "once daily", durationDays: 14, quantity: 14, instructions: "In the morning" }],
        fillStatus: "cannot_fill",
        fillReason: "Out of stock until Tuesday",
      },
    ];
    for (const s of samples) {
      const rowObj = {
        id: s.id,
        code: s.code,
        patient_user_id: patUser.id,
        professional_id: docProfile.id,
        issued_at: now,
        valid_until: validUntil,
        diagnosis: s.diagnosis,
        items: JSON.stringify(s.items),
      };
      const signature = sign(rxPayload(rowObj));
      db.prepare(
        `INSERT OR IGNORE INTO prescriptions (id, code, patient_user_id, professional_id, kind, ref_id, items, diagnosis, issued_at, valid_until, status, pharmacy_id, sent_at, fill_status, fill_reason, fill_updated_at, first_response_at, share_safety, signature, record_checked)
         VALUES (?, ?, ?, ?, 'booking', 'bkg-202223', ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, 1, ?, 1)`
      ).run(
        s.id, s.code, patUser.id, docProfile.id, rowObj.items, s.diagnosis, now, validUntil,
        demoPharm.id, now, s.fillStatus, s.fillReason, s.fillStatus ? now : null, s.fillStatus ? now : null, signature
      );
    }
  }
}

ensureDemoData();

// Backfill regulator fields on profiles created before registry support
for (const p of [...doctors, ...nurses] as any[]) {
  p.registryId ??= inferRegistryId(p.medicalCouncil ?? p.nursingCouncil);
  p.registrationType ??= "full";
  if (p.verificationStatus === VerificationStatus.VERIFIED) p.verificationScope ??= scopeFor(p.registryId);
}

const persistState = () =>
  saveCollections({ doctors, nurses, verificationRequests, reviews, jobs, bookings, chats, patients, appPackages });
persistState();

app.use("/api", (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    res.on("finish", () => { if (res.statusCode < 400) persistState(); });
  }
  next();
});

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// -------------------------------------------------------------
// Auth & account
// -------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: express.Response, code: number, message: string) =>
  res.status(code).json({ status: "error", message });

const publicUser = (u: AuthUser) => ({
  id: u.id, role: u.role, name: u.name, email: u.email, avatarUrl: u.avatarUrl ?? undefined, profileId: u.profileId,
});

// Chat/booking identity: practitioners are addressed by their profile id, patients by their user id.
const chatIdOf = (u: AuthUser) => (u.role === "practitioner" && u.profileId ? u.profileId : u.id);

const allProfessionals = () => [...doctors, ...nurses];
const findProfessional = (id: string) => allProfessionals().find(p => p.id === id);
const isOwnerOrAdmin = (u: AuthUser | undefined, profileId: string) =>
  !!u && (u.role === "admin" || (u.role === "practitioner" && u.profileId === profileId));

app.post("/api/auth/login", (req, res) => {
  const email = str(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = ["patient", "practitioner", "admin", "pharmacy"].includes(req.body.role) ? (req.body.role as Role) : undefined;
  if (!email || !password) return fail(res, 400, "Please fill in all fields.");

  const result = attemptLogin(req, email, password, role, str(req.body.code, 12));
  if ("error" in result) return res.status(401).json({ status: "error", message: result.error, needsCode: result.needsCode === true });

  createSession(req, res, result.id);
  audit(req, "auth.login", { actor: result });
  const patient = result.role === "patient" ? patients.find(p => p.userId === result.id) : undefined;
  res.json({ status: "success", data: { user: publicUser(result), patient } });
});

app.post("/api/auth/demo", (req, res) => {
  const role: Role = ["patient", "practitioner", "admin", "pharmacy"].includes(req.body?.role) ? req.body.role : "patient";
  ensureDemoData();
  const demoEmails: Record<Role, string> = {
    patient: "demo.patient@careverified.test",
    practitioner: "demo.doctor@careverified.test",
    pharmacy: "demo.pharmacy@careverified.test",
    admin: (process.env.ADMIN_EMAIL || "admin@careverified.local").toLowerCase(),
  };
  let row = db.prepare("SELECT * FROM users WHERE email = ?").get(demoEmails[role]) as any;
  if (!row && role === "admin") {
    row = db.prepare("SELECT * FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1").get() as any;
  }
  if (!row) return fail(res, 404, "Demo account not available.");
  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    profileId: row.profile_id,
  };
  createSession(req, res, user.id);
  audit(req, "auth.login.demo", { actor: user });
  const patient = user.role === "patient" ? patients.find(p => p.userId === user.id) : undefined;
  res.json({ status: "success", data: { user: publicUser(user), patient } });
});

app.post("/api/auth/logout", (req, res) => {
  if (req.user) audit(req, "auth.logout");
  destroySession(req, res);
  res.json({ status: "success" });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.user) return fail(res, 401, "Not signed in.");
  const patient = req.user.role === "patient" ? patients.find(p => p.userId === req.user!.id) : undefined;
  res.json({ status: "success", data: { user: publicUser(req.user), patient } });
});

app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user!.id) as any;
  if (typeof currentPassword !== "string" || !verifyPassword(currentPassword, row.password_hash)) {
    return fail(res, 400, "Current password is incorrect.");
  }
  const problem = passwordProblem(newPassword);
  if (problem) return fail(res, 400, problem);
  changePassword(req.user!.id, newPassword);
  createSession(req, res, req.user!.id);
  audit(req, "auth.password.change");
  res.json({ status: "success", message: "Password updated. Other sessions were signed out." });
});

// Practitioner account (profile + licence are submitted afterwards via /api/register and await admin verification)
app.post("/api/auth/register-practitioner", (req, res) => {
  const name = str(req.body.name, 100);
  const email = str(req.body.email, 254).toLowerCase();
  if (!name || !EMAIL_RE.test(email)) return fail(res, 400, "A valid name and email are required.");
  const problem = passwordProblem(req.body.password);
  if (problem) return fail(res, 400, problem);
  if (req.body.consent !== true) return fail(res, 400, "You must accept the Terms and Privacy Policy.");
  if (emailTaken(email)) return fail(res, 409, "An account with this email already exists.");

  const user = createUser({ email, password: req.body.password, role: "practitioner", name, consentVersion: CONSENT_VERSION });
  recordConsent(user.id, "terms_privacy");
  recordConsent(user.id, "credential_check");
  createSession(req, res, user.id);
  audit(req, "auth.register", { actor: user, target: ["user", user.id] });
  res.status(201).json({ status: "success", data: { user: publicUser(user) } });
});

// Patient registration
app.post("/api/register-patient", (req, res) => {
  const {
    password, age, gender, chronicConditions, allergies, emergencyContactName, emergencyContactPhone,
  } = req.body;
  const name = str(req.body.name, 100);
  const email = str(req.body.email, 254).toLowerCase();
  if (!name || !EMAIL_RE.test(email)) {
    return fail(res, 400, "Missing essential patient registration fields.");
  }

  // Identity: MyKad for citizens / permanent residents, passport for visitors
  const idType = req.body.idType === "passport" ? "passport" : "nric";
  let icNumber: string, nationality: string, dateOfBirth: string, computedAge: number;
  if (idType === "nric") {
    const n = parseNric(str(req.body.icNumber, 30));
    if (!n) return fail(res, 400, "Enter a valid 12-digit MyKad number (YYMMDD-PB-####).");
    icNumber = n.normalised; nationality = "MY"; dateOfBirth = n.birthDate; computedAge = n.age;
  } else {
    const pn = str(req.body.icNumber, 30);
    if (!isPassportNumber(pn)) return fail(res, 400, "Enter a valid passport number.");
    icNumber = normalisePassport(pn);
    nationality = str(req.body.nationality, 2).toUpperCase();
    if (!/^[A-Z]{2}$/.test(nationality) || nationality === "MY") return fail(res, 400, "Choose your nationality.");
    const dob = str(req.body.dateOfBirth, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob)) || new Date(dob) > new Date()) return fail(res, 400, "Enter a valid date of birth.");
    dateOfBirth = dob;
    const d = new Date(dob), t = new Date();
    computedAge = t.getFullYear() - d.getFullYear() - (t < new Date(t.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  }
  if (patients.some(p => p.icNumber && p.icNumber.toLowerCase() === icNumber.toLowerCase())) {
    return fail(res, 409, "An account already exists for this ID. Sign in instead, or contact support.");
  }

  // Contact details are stored in E.164 so they can be used for calls and SMS
  const phone = toE164(str(req.body.phone, 30));
  if (!phone) return fail(res, 400, "Enter a valid phone number.");
  const emergencyPhoneE164 = toE164(str(emergencyContactPhone, 30));
  if (!str(emergencyContactName, 100) || !emergencyPhoneE164) return fail(res, 400, "Enter your emergency contact's name and a valid phone number.");
  const a = req.body.address ?? {};
  const address = {
    line1: str(a.line1, 120), line2: str(a.line2, 120), city: str(a.city, 60), state: str(a.state, 60),
    postcode: str(a.postcode, 12), country: str(a.country, 2).toUpperCase(),
  };
  const addrProblem = addressProblem(address);
  if (addrProblem) return fail(res, 400, addrProblem);
  let nextOfKin: { name: string; relationship: string; phone: string } | null = null;
  if (req.body.nextOfKin) {
    const nokPhone = toE164(str(req.body.nextOfKin.phone, 30));
    const nokName = str(req.body.nextOfKin.name, 100);
    if (!nokName || !nokPhone) return fail(res, 400, "Enter your next of kin's name and a valid phone number.");
    nextOfKin = { name: nokName, relationship: RELATIONSHIPS.includes(req.body.nextOfKin.relationship) ? req.body.nextOfKin.relationship : "Other", phone: nokPhone };
  }
  const problem = passwordProblem(password);
  if (problem) return fail(res, 400, problem);
  if (req.body.consent !== true) return fail(res, 400, "You must consent to the processing of your health data to register.");
  if (emailTaken(email)) return fail(res, 409, "A patient with this email already exists.");

  const user = createUser({ email, password, role: "patient", name, consentVersion: CONSENT_VERSION });
  recordConsent(user.id, "terms_privacy");
  recordConsent(user.id, "health_data");
  recordConsent(user.id, "quality_review");
  const newPatient = {
    id: generateId("pat"),
    userId: user.id,
    name,
    email,
    icNumber,
    idType,
    nationality,
    dateOfBirth,
    age: computedAge,
    phone,
    address,
    preferredLanguage: PREFERRED_LANGUAGES.some(l => l.code === req.body.preferredLanguage) ? req.body.preferredLanguage : "en",
    gender: ["Male", "Female", "Other"].includes(gender) ? gender : "Male",
    chronicConditions: Array.isArray(chronicConditions) ? chronicConditions.map((c: unknown) => str(c, 100)) : [],
    allergies: Array.isArray(allergies) ? allergies.map((a: unknown) => str(a, 200)) : [],
    emergencyContactName: str(emergencyContactName, 100),
    emergencyContactRelationship: RELATIONSHIPS.includes(req.body.emergencyContactRelationship) ? req.body.emergencyContactRelationship : "Other",
    emergencyContactPhone: emergencyPhoneE164,
    nextOfKin,
    registeredAt: new Date().toISOString()
  };
  patients.push(newPatient);
  seedHealthItems(user.id, newPatient.chronicConditions, newPatient.allergies);

  createSession(req, res, user.id);
  audit(req, "auth.register", { actor: user, target: ["user", user.id] });
  res.status(201).json({
    status: "success",
    message: "Member registered successfully.",
    data: newPatient
  });
});

// Data subject rights: consents, access / correction / deletion requests, export
registerPrivacyRoutes(app);
registerPharmacyMy(app);
registerDataOps(app, {
  // De-identify what lives outside SQL: patient profile, bookings and chat messages.
  anonymiseJson: userId => {
    let patientProfiles = 0, bookingCount = 0, chatMessages = 0;
    for (const p of patients as any[]) {
      if (p.userId !== userId) continue;
      Object.assign(p, { name: "Deleted patient", email: "", icNumber: "", dateOfBirth: "", nationality: "", phone: "", address: null, nextOfKin: null, emergencyContactName: "", emergencyContactRelationship: "", emergencyContactPhone: "", chronicConditions: [], allergies: [] });
      patientProfiles++;
    }
    for (const b of bookings as any[]) {
      if (b.patientUserId !== userId) continue;
      Object.assign(b, { patientName: "Deleted patient", patientPhone: "", patientEmail: "" });
      bookingCount++;
    }
    const before = chats.length;
    chats = chats.filter(m => m.senderId !== userId && m.receiverId !== userId);
    chatMessages = before - chats.length;
    persistState();
    return { patientProfiles, bookings: bookingCount, chatMessages };
  },
});
app.get("/api/me/export", requireAuth, (req, res) => {
  const u = req.user!;
  const me = chatIdOf(u);
  const data = {
    exportedAt: new Date().toISOString(),
    account: db.prepare(
      "SELECT id,email,name,role,consent_version AS consentVersion,consent_at AS consentAt,created_at AS createdAt FROM users WHERE id = ?"
    ).get(u.id),
    patientProfile: patients.find(p => p.userId === u.id) ?? null,
    professionalProfile: u.profileId ? findProfessional(u.profileId) ?? null : null,
    bookings: bookings.filter(b => b.patientUserId === u.id || (u.profileId && b.professionalId === u.profileId)),
    messages: chats.filter(m => m.senderId === me || m.receiverId === me),
    documents: db.prepare("SELECT id,kind,original_name AS originalName,created_at AS createdAt FROM documents WHERE owner_id = ?").all(u.id),
  };
  audit(req, "account.export");
  res.setHeader("Content-Disposition", 'attachment; filename="careverified-my-data.json"');
  res.json(data);
});

app.post("/api/me/deletion-request", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET deletion_requested_at = ? WHERE id = ?").run(new Date().toISOString(), req.user!.id);
  const open = db.prepare("SELECT 1 AS x FROM data_requests WHERE user_id = ? AND kind = 'deletion' AND status = 'open'").get(req.user!.id);
  if (!open) app.locals.createDataRequest?.(req.user!.id, "deletion", "Deletion requested from the account menu");
  audit(req, "account.deletion.requested");
  res.json({ status: "success", message: "Deletion request recorded. Our team will respond within 21 days. Medical records may have to be kept for the legal retention period." });
});

// Admin: audit trail
app.get("/api/admin/audit-log", requireRole("admin"), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const action = typeof req.query.action === "string" ? req.query.action : null;
  const rows = action
    ? db.prepare("SELECT * FROM audit_log WHERE action LIKE ? ORDER BY id DESC LIMIT ?").all(action + "%", limit)
    : db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?").all(limit);
  res.json({ status: "success", data: rows });
});

app.use("/api/documents", documentsRouter);

// -------------------------------------------------------------
// Professionals
// -------------------------------------------------------------

// Public directory shows verified practitioners only; owners see their own profile, admins see all.
const visibleTo = (u: AuthUser | undefined) => (p: any) =>
  p.verificationStatus === VerificationStatus.VERIFIED || isOwnerOrAdmin(u, p.id);

app.get("/api/professionals", (req, res) => {
  const { role, city, specialty, search } = req.query;
  let list: any[] = allProfessionals().filter(visibleTo(req.user));

  if (role) {
    list = list.filter(p => p.role === role);
  }
  if (city) {
    list = list.filter(p => p.city.toLowerCase() === (city as string).toLowerCase());
  }
  if (specialty) {
    list = list.filter(p => p.specialization.toLowerCase().includes((specialty as string).toLowerCase()));
  }
  if (search) {
    const term = (search as string).toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.specialization.toLowerCase().includes(term) ||
      p.bio.toLowerCase().includes(term)
    );
  }

  res.json({ status: "success", data: list });
});

app.get("/api/professionals/:id", (req, res) => {
  const { id } = req.params;
  const prof = allProfessionals().find(p => (p.id === id || p.seoSlug === id) && visibleTo(req.user)(p));
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Medical professional not found" });
  }
  res.json({ status: "success", data: prof });
});

app.get("/api/admin/registry-integrations", requireRole("admin"), (_req, res) => res.json({ status: "success", data: integrationStatus() }));

app.get("/api/registries", (_req, res) => res.json({ status: "success", data: { registries: REGISTRIES, registrationTypes: REGISTRATION_TYPES } }));

// Submit practitioner profile + licence details for verification (one profile per account)
app.post("/api/register", requireRole("practitioner"), (req, res) => {
  const user = req.user!;
  if (user.profileId) return fail(res, 409, "A professional profile already exists for this account.");

  const role = req.body.role === UserRole.NURSE ? UserRole.NURSE : UserRole.DOCTOR;
  const name = str(req.body.name, 100);
  const specialization = str(req.body.specialization, 100);
  const licenseNumber = str(req.body.licenseNumber, 50);
  const registryId = findRegistry(req.body.registryId)?.id ?? inferRegistryId(str(req.body.medicalCouncil, 100));
  const registry = findRegistry(registryId)!;
  if (!registry.roles.includes(req.body.role === UserRole.NURSE ? "nurse" : "doctor")) {
    return fail(res, 400, "That regulator does not register this type of practitioner.");
  }
  const registrationType = REGISTRATION_TYPES.includes(req.body.registrationType) ? req.body.registrationType : "full";
  if (registrationType === "specialist" && !registry.supportsSpecialist) return fail(res, 400, "This regulator has no specialist register.");
  const specialistRegNo = str(req.body.specialistRegNo, 50);
  if (registrationType === "specialist" && !specialistRegNo) return fail(res, 400, "Enter your specialist register number.");
  // Malaysian regulators use the canonical name; other countries are free text (e.g. "General Medical Council (UK)")
  const medicalCouncil = registry.id === "OTHER" ? str(req.body.medicalCouncil, 100) : registry.name;
  const city = str(req.body.city, 80);
  const practiceAddress = str(req.body.practiceAddress, 250);
  const { experienceYears, education, bio, languages, consultationModes, fee, shiftTypes, avatar } = req.body;

  if (!name || !specialization || !licenseNumber || !medicalCouncil || !city) {
    return fail(res, 400, "Name, specialization, licence number, medical council and city are required.");
  }
  const licenseExpiry = typeof req.body.licenseExpiry === "string" ? req.body.licenseExpiry : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry) || licenseExpiry <= new Date().toISOString().slice(0, 10)) {
    return fail(res, 400, "Enter your licence expiry date (it must be in the future).");
  }
  if (allProfessionals().some(p => p.licenseNumber.toLowerCase() === licenseNumber.toLowerCase())) {
    return fail(res, 409, "This licence number is already registered.");
  }

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const newId = generateId(role === UserRole.DOCTOR ? "doc" : "nur");
  const seoSlug = `${slug(name)}-${slug(specialization)}-${slug(city)}`;
  const educationList = (Array.isArray(education) ? education : [education]).map((e: unknown) => str(e, 200)).filter(Boolean);
  const safeAvatar = typeof avatar === "string" && avatar.startsWith("/assets/") ? avatar : undefined;

  if (role === UserRole.DOCTOR) {
    doctors.push({
      id: newId,
      name,
      avatar: safeAvatar || "/assets/malaysian_female_doctor.jpg",
      role: UserRole.DOCTOR as const,
      specialization,
      licenseNumber,
      licenseExpiry,
      medicalCouncil,
      registryId,
      registrationType,
      specialistRegNo: specialistRegNo || undefined,
      experienceYears: Number(experienceYears) || 1,
      education: educationList,
      bio: str(bio, 1000) || "Licensed medical practitioner.",
      languages: Array.isArray(languages) ? languages.map((l: unknown) => str(l, 40)) : ["English"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["In-person" as any],
      fee: Math.max(0, Number(fee) || 0),
      rating: 0,
      reviewCount: 0,
      verificationStatus: VerificationStatus.PENDING,
      practiceAddress,
      city,
      availability: {
        days: ["Monday", "Wednesday", "Friday"],
        slots: ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM"]
      },
      seoSlug
    });
  } else {
    nurses.push({
      id: newId,
      name,
      avatar: safeAvatar || "/assets/malaysian_female_nurse.jpg",
      role: UserRole.NURSE as const,
      specialization,
      licenseNumber,
      licenseExpiry,
      nursingCouncil: medicalCouncil,
      registryId,
      registrationType,
      specialistRegNo: specialistRegNo || undefined,
      experienceYears: Number(experienceYears) || 1,
      education: educationList,
      bio: str(bio, 1000) || "Licensed care professional.",
      languages: Array.isArray(languages) ? languages.map((l: unknown) => str(l, 40)) : ["English"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["Home Visit" as any],
      fee: Math.max(0, Number(fee) || 0),
      rating: 0,
      reviewCount: 0,
      verificationStatus: VerificationStatus.PENDING,
      practiceAddress,
      city,
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM - 05:00 PM"]
      },
      seoSlug,
      shiftTypes: Array.isArray(shiftTypes) ? shiftTypes : ["Day Shift"]
    });
  }

  db.prepare("UPDATE users SET profile_id = ? WHERE id = ?").run(newId, user.id);

  const vReq = {
    id: generateId("ver"),
    userId: newId,
    accountId: user.id,
    userName: name,
    userType: role as any,
    licenseNumber,
    medicalCouncil,
    degreeName: educationList[0] || "",
    fileUrl: "",
    submittedAt: new Date().toISOString(),
    status: VerificationStatus.PENDING
  };
  verificationRequests.push(vReq);
  audit(req, "practitioner.submit", { target: ["verification", vReq.id], details: { profileId: newId } });
  notifyAdmins("New verification request", `${name} (${role}) submitted credentials for review.`);

  res.status(201).json({
    status: "success",
    message: "Registration submitted. Your profile is pending verification by the medical board.",
    data: { id: newId, seoSlug, verificationRequestId: vReq.id }
  });
});

app.post("/api/professionals/:id/edit", requireRole("practitioner", "admin"), (req, res) => {
  const { id } = req.params;
  const { bio, fee, practiceAddress, city, availability } = req.body;

  const prof: any = findProfessional(id);
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Practitioner profile not found." });
  }
  if (!isOwnerOrAdmin(req.user, id)) {
    audit(req, "access.denied", { target: ["professional", id] });
    return fail(res, 403, "You can only edit your own profile.");
  }

  if (bio !== undefined) prof.bio = str(bio, 1000);
  if (fee !== undefined && Number(fee) >= 0) prof.fee = Number(fee);
  if (practiceAddress !== undefined) prof.practiceAddress = str(practiceAddress, 250);
  if (city !== undefined) prof.city = str(city, 80);
  if (availability !== undefined && Array.isArray(availability?.days) && Array.isArray(availability?.slots)) {
    prof.availability = { days: availability.days.map((d: unknown) => str(d, 20)), slots: availability.slots.map((s: unknown) => str(s, 30)) };
  }
  audit(req, "professional.edit", { target: ["professional", id] });

  res.json({ status: "success", message: "Profile updated successfully.", data: prof });
});

// -------------------------------------------------------------
// Admin verification pipeline
// -------------------------------------------------------------
setRequestOwnerLookup(id => (verificationRequests.find(r => r.id === id) as any)?.accountId ?? null);
registerVerificationRoutes(app, {
  allProfessionals,
  requests: () => verificationRequests,
  bookings: () => bookings,
  persist: persistState,
});

// ---- Payments and the 24/7 care engine ----
const care = registerCareRoutes(app, {
  findProfessional,
  allProfessionals,
  hasCompletedBooking: userId => bookings.some(b => b.patientUserId === userId && b.paymentStatus === "Paid" && b.status === "Completed"),
});
const clinical = registerClinicalRoutes(app, {
  findProfessional,
  getBooking: id => bookings.find(b => b.id === id),
  allBookings: () => bookings,
  completeBooking: id => {
    const b = bookings.find(x => x.id === id);
    if (b && b.status === "Upcoming" && b.paymentStatus === "Paid") { b.status = "Completed"; persistState(); }
  },
});

// Rating = average of published reviews only (moderated-out reviews do not count)
const recalcRating = (professionalId: string) => {
  const live = reviews.filter(r => r.professionalId === professionalId && (r as any).status !== "hidden");
  const prof: any = findProfessional(professionalId);
  if (!prof) return;
  prof.rating = live.length ? Number((live.reduce((sum, r) => sum + r.rating, 0) / live.length).toFixed(2)) : 0;
  prof.reviewCount = live.length;
};
registerLiteratureRoutes(app, {
  allBookings: () => bookings,
  isVerifiedPractitioner: id => findProfessional(id)?.verificationStatus === VerificationStatus.VERIFIED,
  libraryArticleIds: () => new Map<string, string>([...articles.map(a => [a.id, a.title] as [string, string]), ...approvedLiteratureArticles().map(a => [a.id, a.title] as [string, string])]),
});
registerQualityRoutes(app, { reviews: () => reviews, findProfessional, allProfessionals, bookings: () => bookings, recalcRating, chats: () => chats });
registerPharmacyWorkspace(app, { findProfessional });
setClinicalHooks(clinical);
registerPaymentRoutes(app);
const UNPAID_HOLD_MS = 15 * 60_000;
const paymentRegion = (userId: string): "MY" | "INTL" => {
  const pt = (patients as any[]).find(p => p.userId === userId);
  return pt && (pt.idType === "passport" || (pt.nationality && pt.nationality !== "MY")) ? "INTL" : "MY";
};
setPaymentHandlers({
  resolve: (kind, refId) => {
    if (kind === "consult") return care.resolveConsultPayable(refId);
    if (kind !== "booking") return null;
    const b = bookings.find(x => x.id === refId);
    if (!b || b.status !== "Upcoming" || b.paymentStatus !== "Pending") return null;
    if (b.holdExpiresAt && Date.parse(b.holdExpiresAt) < Date.now()) return null;
    return { kind: "booking" as const, id: b.id, userId: b.patientUserId, professionalId: b.professionalId, amount: b.fee,
      description: `Appointment with ${b.professionalName} on ${b.date}, ${b.timeSlot}` };
  },
  onPaid: (p) => {
    if (p.kind === "consult") return care.onConsultPaid(p.ref_id);
    const b = bookings.find(x => x.id === p.ref_id);
    if (!b) return;
    b.paymentStatus = "Paid";
    b.paymentId = p.id;
    delete b.holdExpiresAt;
    const pro: any = findProfessional(b.professionalId);
    const account = db.prepare("SELECT id FROM users WHERE profile_id = ?").get(b.professionalId) as any;
    if (pro && account) notify(account.id, "New booking", `${b.patientName} booked ${b.date} at ${b.timeSlot}.`);
    persistState();
  },
  // Passport holders are foreign visitors (service tax, no FPX); MyKad holders are treated as Malaysian citizens/residents.
  patientRegion: paymentRegion,
  onRefunded: (p) => {
    if (p.kind === "consult") { care.onConsultRefunded(p.ref_id); return; }
    const b = bookings.find(x => x.id === p.ref_id);
    if (b) { b.paymentStatus = "Refunded"; b.status = "Cancelled"; persistState(); }
  },
});

// -------------------------------------------------------------
// Bookings & e-prescriptions
// -------------------------------------------------------------
// Release slots whose unpaid hold has lapsed
setInterval(() => {
  let changed = false;
  for (const b of bookings) {
    if (b.status === "Upcoming" && b.paymentStatus === "Pending" && b.holdExpiresAt && Date.parse(b.holdExpiresAt) < Date.now()) {
      b.status = "Cancelled";
      changed = true;
    }
  }
  if (changed) persistState();
}, 60_000).unref();

// A booking occupies its slot unless cancelled or its unpaid hold has lapsed.
const holdsSlot = (b: any) =>
  b.status !== "Cancelled" && !(b.paymentStatus === "Pending" && b.holdExpiresAt && Date.parse(b.holdExpiresAt) < Date.now());

app.get("/api/bookings", requireAuth, (req, res) => {
  const u = req.user!;
  let list: any[] = [];
  if (u.role === "admin") list = bookings;
  // Practitioners only see bookings that have been paid for.
  else if (u.role === "practitioner") list = u.profileId ? bookings.filter(b => b.professionalId === u.profileId && b.paymentStatus !== "Pending") : [];
  else list = bookings.filter(b => b.patientUserId === u.id);
  res.json({ status: "success", data: list });
});

app.post("/api/bookings", requireRole("patient"), (req, res) => {
  const { professionalId, patientPhone, mode, symptoms } = req.body;
  const date = str(req.body.date, 10);
  const timeSlot = str(req.body.timeSlot, 30);

  if (!professionalId || !date || !timeSlot) {
    return fail(res, 400, "Missing vital booking parameters.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return fail(res, 400, "Invalid date.");
  }
  const prof: any = findProfessional(professionalId);
  if (!prof || prof.verificationStatus !== VerificationStatus.VERIFIED) {
    return res.status(404).json({ status: "error", message: "Professional not found." });
  }
  // Telemedicine rules apply to booked video appointments with doctors and nurses alike.
  const bookingMode = mode || ConsultationMode.IN_PERSON;
  let teleFields: { patientCountry: string; firstVisit: boolean; chronicCondition: boolean; crossBorderAck: boolean } | null = null;
  if (isVirtualMode(bookingMode)) {
    const country = normaliseCountry(req.body.patientCountry);
    const hasPrior = !!db.prepare("SELECT 1 AS x FROM consults WHERE patient_user_id = ? AND status = 'completed'").get(req.user!.id) ||
      bookings.some(b => b.patientUserId === req.user!.id && b.paymentStatus === "Paid" && b.status === "Completed");
    const chronic = req.body.chronicCondition === true;
    const assessment = assessConsult({ country, declaredFirstVisit: req.body.firstVisit === true, hasPriorConsult: hasPrior, attestedSeenBefore: req.body.seenInPersonBefore === true, chronic });
    if (!assessment.allowed) {
      audit(req, "booking.blocked", { details: { reason: "first_visit_policy", country, chronic } });
      return res.status(422).json({ status: "error", message: assessment.message, data: { route: "in-person" } });
    }
    if (assessment.crossBorder && req.body.acknowledgeCrossBorder !== true) {
      return fail(res, 400, "Please confirm you understand this is a cross-border consultation before booking.");
    }
    if (!practitionerMayTreat(country, prof)) {
      return fail(res, 403, "Patients in Malaysia can only have online appointments with practitioners registered in Malaysia. Choose an in-person visit or another practitioner.");
    }
    teleFields = { patientCountry: country, firstVisit: assessment.firstVisit, chronicCondition: chronic, crossBorderAck: assessment.crossBorder };
  }
  // Emergency on-call dispatches are not tied to a scheduled slot.
  if (timeSlot !== "Immediate Emergency Call" &&
      bookings.some(b => b.professionalId === professionalId && b.date === date && b.timeSlot === timeSlot && holdsSlot(b))) {
    return fail(res, 409, "That time slot has just been taken. Please choose another.");
  }

  const user = req.user!;
  const patient = patients.find(p => p.userId === user.id);
  const newBooking = {
    id: generateId("bkg"),
    professionalId,
    professionalName: prof.name,
    professionalRole: prof.role,
    patientId: patient?.id ?? user.id,
    patientUserId: user.id,
    patientName: user.name,
    patientPhone: str(patientPhone, 30) || patient?.phone || "",
    patientEmail: user.email,
    date,
    timeSlot,
    mode: bookingMode,
    ...(teleFields ?? {}),
    fee: prof.fee, // always priced server-side
    paymentStatus: "Pending" as const, // becomes "Paid" when the payment provider confirms
    holdExpiresAt: new Date(Date.now() + UNPAID_HOLD_MS).toISOString(), // slot is held while the patient pays
    status: "Upcoming" as const,
    symptoms: str(symptoms, 1000),
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  // Opt-in consent: the patient chose to share their health record with this practitioner for the visit.
  if (req.body.shareRecord === true) createGrant(user.id, professionalId, "booking", newBooking.id, 45);
  audit(req, "booking.create", { target: ["booking", newBooking.id], details: { professionalId } });
  res.status(201).json({ status: "success", message: "Appointment booked successfully!", data: newBooking });
});

// Patient cancels: refunded in full when the appointment is at least a day away
app.post("/api/bookings/:id/cancel", requireRole("patient"), async (req, res) => {
  const b = bookings.find(x => x.id === req.params.id && x.patientUserId === req.user!.id);
  if (!b) return res.status(404).json({ status: "error", message: "Booking not found." });
  if (b.status !== "Upcoming") return fail(res, 409, "Only upcoming appointments can be cancelled.");
  const policy = refundPolicy(paymentRegion(req.user!.id));
  const earliest = new Date(Date.now() + policy.fullRefundMinDays * 86400_000).toISOString().slice(0, 10);
  const refundable = b.paymentStatus === "Paid" && b.date >= earliest;
  b.status = "Cancelled";
  let refunded = false;
  if (refundable && b.paymentId) refunded = (await refundPayment(b.paymentId, "Cancelled by patient", null)).ok;
  audit(req, "booking.cancel", { target: ["booking", b.id], details: { refunded } });
  persistState();
  res.json({ status: "success", data: b, refunded,
    message: refunded ? "Cancelled and refunded in full." : b.paymentStatus === "Paid" ? `Cancelled. ${policy.summary.split(". ")[0]}.` : "Cancelled." });
});

// -------------------------------------------------------------
// Recruitment & shift board
// -------------------------------------------------------------
app.get("/api/jobs", (req, res) => {
  // Applicant identities stay private: callers only ever see their own application.
  const me = req.user?.id;
  res.json({ status: "success", data: jobs.map(j => ({ ...j, appliedUserIds: me && j.appliedUserIds.includes(me) ? [me] : [] })) });
});

app.post("/api/jobs", requireRole("practitioner", "admin"), (req, res) => {
  const { type, requirements } = req.body;
  const hospitalName = str(req.body.hospitalName, 120);
  const title = str(req.body.title, 120);
  const specialtyRequired = str(req.body.specialtyRequired, 100);

  if (!hospitalName || !title || !specialtyRequired) {
    return res.status(400).json({ status: "error", message: "Missing core job description fields." });
  }

  const newJob = {
    id: generateId("job"),
    postedByUserId: req.user!.id,
    hospitalName,
    hospitalLogo: "🏥",
    title,
    type: type || "Full-time",
    location: str(req.body.location, 120) || "Main Wing",
    city: str(req.body.city, 80) || "Kuala Lumpur",
    specialtyRequired,
    description: str(req.body.description, 2000) || "Join our care team.",
    salaryRange: str(req.body.salaryRange, 60) || "Negotiable",
    requirements: Array.isArray(requirements) ? requirements.map((r: unknown) => str(r, 200)) : ["Registered and licensed with local medical board"],
    applicantsCount: 0,
    status: "Active" as const,
    postedAt: new Date().toISOString(),
    appliedUserIds: [] as string[]
  };

  jobs.push(newJob);
  audit(req, "job.create", { target: ["job", newJob.id] });
  res.status(201).json({ status: "success", message: "Job listing published successfully.", data: newJob });
});

app.post("/api/jobs/:id/apply", requireRole("practitioner"), (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const job = jobs.find(j => j.id === id);
  if (!job) {
    return res.status(404).json({ status: "error", message: "Job post not found." });
  }
  const prof: any = req.user!.profileId ? findProfessional(req.user!.profileId) : null;
  if (!prof || prof.verificationStatus !== VerificationStatus.VERIFIED) {
    return fail(res, 403, "Only verified practitioners can apply to positions.");
  }
  if (job.appliedUserIds.includes(userId)) {
    return res.status(400).json({ status: "error", message: "You have already applied to this position." });
  }

  job.appliedUserIds.push(userId);
  job.applicantsCount += 1;

  res.json({ status: "success", message: "Application submitted successfully!", data: { ...job, appliedUserIds: [userId] } });
});

// -------------------------------------------------------------
// Reviews
// -------------------------------------------------------------
app.get("/api/reviews", (req, res) => {
  const { professionalId } = req.query;
  let list = reviews.filter(r => (r as any).status !== "hidden");
  if (professionalId) {
    list = list.filter(r => r.professionalId === professionalId);
  }
  // Reporter details stay between the practitioner and the board
  res.json({ status: "success", data: list.map(({ reportedAt, reportReason, moderatedBy, moderationReason, ...pub }: any) => pub) });
});

app.post("/api/reviews", requireRole("patient"), (req, res) => {
  const { professionalId } = req.body;
  const rating = Number(req.body.rating);
  const clamp = (v: unknown) => { const n = Number(v); return n >= 1 && n <= 5 ? n : rating; };

  if (!professionalId || !(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ status: "error", message: "Missing or invalid review fields." });
  }
  const user = req.user!;
  // Only a completed visit (signed notes) can be reviewed, once per visit.
  const reviewedVisits = new Set(reviews.filter(r => (r as any).patientUserId === user.id).map(r => `${(r as any).visitKind}:${(r as any).visitId}`));
  const visits: { kind: "booking" | "consult"; id: string }[] = [
    ...bookings.filter(b => b.patientUserId === user.id && b.professionalId === professionalId && b.status === "Completed" && b.paymentStatus === "Paid").map(b => ({ kind: "booking" as const, id: b.id })),
    ...(db.prepare("SELECT id FROM consults WHERE patient_user_id = ? AND professional_id = ? AND status = 'completed'").all(user.id, professionalId) as any[]).map(c => ({ kind: "consult" as const, id: c.id as string })),
  ].filter(v => !reviewedVisits.has(`${v.kind}:${v.id}`));
  if (visits.length === 0) {
    return fail(res, 403, "You can review a practitioner after a completed visit with them.");
  }
  const visit = visits[0];
  const comment = str(req.body.comment, 1000);

  const newReview = {
    id: generateId("rev"),
    professionalId,
    patientId: user.id,
    patientUserId: user.id,
    visitKind: visit.kind,
    visitId: visit.id,
    patientName: user.name,
    rating,
    punctuality: clamp(req.body.punctuality),
    communication: clamp(req.body.communication),
    satisfaction: clamp(req.body.satisfaction),
    comment,
    date: new Date().toISOString().split('T')[0],
    isVerifiedPatient: true,
    status: "published"
  };

  reviews.push(newReview as any);
  recalcRating(professionalId);

  res.status(201).json({ status: "success", message: "Review posted successfully.", data: newReview });
});

app.post("/api/reviews/:id/reply", requireRole("practitioner"), (req, res) => {
  const { id } = req.params;
  const rev = reviews.find(r => r.id === id);
  if (!rev || rev.professionalId !== req.user!.profileId) {
    return res.status(404).json({ status: "error", message: "Review not found." });
  }
  rev.replyText = str(req.body.replyText, 1000);
  res.json({ status: "success", message: "Reply added to review.", data: rev });
});

// -------------------------------------------------------------
// Secure messaging (participants only)
// -------------------------------------------------------------
app.get("/api/chats", requireRole("patient", "practitioner"), (req, res) => {
  const me = chatIdOf(req.user!);
  let list = chats.filter(m => m.senderId === me || m.receiverId === me);
  const withId = typeof req.query.with === "string" ? req.query.with : null;
  if (withId) list = list.filter(m => m.senderId === withId || m.receiverId === withId);
  res.json({ status: "success", data: list });
});

app.post("/api/chats", requireRole("patient", "practitioner"), (req, res) => {
  const receiverId = str(req.body.receiverId, 60);
  const text = str(req.body.text, 2000);
  if (!receiverId || !text) {
    return res.status(400).json({ status: "error", message: "Incomplete chat payload." });
  }
  const sender = req.user!;
  const recipientAccount = accountForChatId(receiverId);
  if (!recipientAccount) return fail(res, 404, "Recipient not found.");
  if (isBlocked(recipientAccount, sender.id)) return fail(res, 403, "This message could not be delivered.");
  // Messaging is for people in a care relationship (or replying to someone who wrote first), not cold contact.
  const myChatId = chatIdOf(sender);
  const related = sender.role === "patient"
    ? bookings.some(b => b.patientUserId === sender.id && b.professionalId === receiverId && b.paymentStatus === "Paid") ||
      !!db.prepare("SELECT 1 AS x FROM consults WHERE patient_user_id = ? AND professional_id = ?").get(sender.id, receiverId)
    : bookings.some(b => b.professionalId === sender.profileId && b.patientUserId === receiverId && b.paymentStatus === "Paid") ||
      !!db.prepare("SELECT 1 AS x FROM consults WHERE professional_id = ? AND patient_user_id = ?").get(sender.profileId ?? "", receiverId);
  if (!related && !chats.some(m => m.senderId === receiverId && m.receiverId === myChatId)) {
    return fail(res, 403, "You can message practitioners you have booked or consulted.");
  }
  const msg = {
    id: generateId("msg"),
    senderId: chatIdOf(sender),
    senderName: sender.name, // identity comes from the session, never the request
    receiverId,
    receiverName: str(req.body.receiverName, 100),
    text,
    timestamp: new Date().toISOString(),
    isRead: false
  };

  chats.push(msg);
  res.status(201).json({ status: "success", data: msg });
});

// 8. Health Blog Articles
app.get("/api/articles", (req, res) => {
  res.json({ status: "success", data: [...articles, ...approvedLiteratureArticles()] });
});

// 9. Symptom-to-Specialist Matching
app.post("/api/symptom-matching", (req, res) => {
  const { symptoms } = req.body;

  if (!symptoms || typeof symptoms !== "string" || symptoms.length > 2000) {
    return res.status(400).json({ status: "error", message: "Please specify symptoms to match." });
  }

  const text = symptoms.toLowerCase();
  let recommendation = {
    recommendedSpecialty: "General Physician",
    confidenceScore: 0.85,
    clinicalJustification: "Matched core symptomatic keywords indicating general systemic or standard infection-like symptoms.",
    symptomSeverity: "Medium",
    recommendedAction: "Schedule a teleconsultation or in-person evaluation with a GP for a comprehensive medical checkout."
  };

  if (text.includes("chest") || text.includes("heart") || text.includes("palpitation") || text.includes("cardiac") || text.includes("pulse")) {
    recommendation = {
      recommendedSpecialty: "Cardiologist",
      confidenceScore: 0.95,
      clinicalJustification: "Symptom description contains references to chest discomfort, heavy pounding, or cardiac risk factors, necessitating ECG/lipid screenings.",
      symptomSeverity: "High/Urgent",
      recommendedAction: "Seek urgent cardiological evaluation. If you experience radiating arm pain or severe sweating, visit the nearest ER immediately."
    };
  } else if (text.includes("child") || text.includes("baby") || text.includes("infant") || text.includes("kid") || text.includes("pediatric")) {
    recommendation = {
      recommendedSpecialty: "Pediatrician",
      confidenceScore: 0.92,
      clinicalJustification: "Patient profile or symptom detail refers to pediatric/childhood development age bracket, requiring specialist pediatric dosage and monitoring.",
      symptomSeverity: "Medium",
      recommendedAction: "Book an appointment with a verified pediatrician for customized neonatal/growth-phase checkups."
    };
  } else if (text.includes("headache") || text.includes("migraine") || text.includes("seizure") || text.includes("numb") || text.includes("nerve") || text.includes("tremor")) {
    recommendation = {
      recommendedSpecialty: "Neurologist",
      confidenceScore: 0.90,
      clinicalJustification: "Symptomatology points to localized cranial or neurological pathways such as migraines, peripheral neuropathy, or potential autonomic disruptions.",
      symptomSeverity: "Medium",
      recommendedAction: "Consult a neurologist for detailed clinical reflex mappings or brain imaging if symptoms persist."
    };
  } else if (text.includes("rash") || text.includes("skin") || text.includes("acne") || text.includes("mole") || text.includes("spot") || text.includes("itch")) {
    recommendation = {
      recommendedSpecialty: "Dermatologist",
      confidenceScore: 0.94,
      clinicalJustification: "Primary physical manifestations are cutaneous (skin-based), suggesting allergy outbreaks, acne pathogenesis, or eczema.",
      symptomSeverity: "Low",
      recommendedAction: "Schedule a high-definition video teleconsultation or clinical in-person dermatology checkup."
    };
  } else if (text.includes("breathe") || text.includes("icu") || text.includes("critical") || text.includes("ventilator") || text.includes("oxygen")) {
    recommendation = {
      recommendedSpecialty: "ICU & Critical Care",
      confidenceScore: 0.88,
      clinicalJustification: "High-acuity respiratory distress or life-support status indicates an immediate need for clinical intensive care registered nurse support.",
      symptomSeverity: "High/Urgent",
      recommendedAction: "Procure ICU-trained private care staffing immediately or seek active emergency critical care stabilization."
    };
  }

  const flags = redFlags(symptoms);
  res.json({
    status: "success",
    source: "MedCred Triage Engine",
    data: recommendation,
    emergency: flags.length ? { reasons: flags, numbers: emergencyNumbers() } : null,
  });
});

// --- Packages Modular Architecture API ---

// Get currently installed modules/packages
app.get("/api/packages", (req, res) => {
  res.json({ status: "success", data: appPackages });
});

// Install or add a new package
app.post("/api/packages", requireRole("admin"), (req, res) => {
  const { id, name, description, icon, category, version, author, isRemovable } = req.body;

  if (!id || !name || !description) {
    return res.status(400).json({ status: "error", message: "Package ID, Name, and Description are required." });
  }

  // Prevent duplicates
  if (appPackages.some(pkg => pkg.id === id)) {
    return res.status(400).json({ status: "error", message: `Package with ID "${id}" is already installed.` });
  }

  const newPkg = {
    id,
    name,
    description,
    icon: icon || "Activity",
    isEnabled: true,
    category: category || "Custom Extension",
    version: version || "1.0.0",
    author: author || "Administrator",
    isRemovable: isRemovable !== undefined ? isRemovable : true
  };

  appPackages.push(newPkg);
  res.status(201).json({ status: "success", message: `Package "${name}" was successfully added!`, data: newPkg });
});

// Toggle enabled status of a package
app.post("/api/packages/:id/toggle", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const pkg = appPackages.find(p => p.id === id);
  if (!pkg) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }

  pkg.isEnabled = !pkg.isEnabled;
  res.json({ status: "success", message: `Package "${pkg.name}" is now ${pkg.isEnabled ? "enabled" : "disabled"}.`, data: pkg });
});

// Uninstall / Remove a package
app.delete("/api/packages/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const idx = appPackages.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }

  const pkg = appPackages[idx];
  if (!pkg.isRemovable) {
    return res.status(400).json({ status: "error", message: `Core package "${pkg.name}" is integrated and cannot be uninstalled.` });
  }

  appPackages.splice(idx, 1);
  res.json({ status: "success", message: `Package "${pkg.name}" was successfully removed.` });
});

// 10. Serve XML sitemap dynamically for SEO
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://careverified.pro/</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://careverified.pro/about</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://careverified.pro/jobs</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

  // Append programmatic SEO landing pages
  const specialties = ["cardiologist", "pediatrician", "neurologist", "dermatologist", "icu-nurse"];
  const cities = ["new-delhi", "mumbai", "bengaluru"];
  
  specialties.forEach(spec => {
    cities.forEach(city => {
      xml += `
  <url>
    <loc>https://careverified.pro/best-${spec}-in-${city}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  });

  // Append individual doctor profile pages
  [...doctors, ...nurses].filter(p => p.verificationStatus === VerificationStatus.VERIFIED).forEach(prof => {
    xml += `
  <url>
    <loc>https://careverified.pro/doctors/${prof.seoSlug}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += `\n</urlset>`;
  res.send(xml);
});

// -------------------------------------------------------------
// Vite Dev Server / Static Files Serving Middleware
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MedCred Full-Stack server is actively listening on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel the app is exported as a serverless function (api/index.mjs); static files are served by Vercel.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
