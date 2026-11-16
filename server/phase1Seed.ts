import { db } from "./db";
import { VerificationStatus } from "../src/types";
import { createUser } from "./auth";

/**
 * Phase 1 demo data: facilities in every approval state, 26 invented practitioners and caregivers covering every verification state,
 * and jobs, locum roles and open shifts. Everything is invented and marked DEMO so it can never be mistaken for a real person or licence.
 * Dates are relative to today, so "expiring" and "expired" stay true whenever the app starts. Safe to run on every start: it adds only what is missing.
 */

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const iso = () => new Date().toISOString();

const FACILITIES = [
  { id: "fac-p1-ipoh", name: "Lotus Specialist Clinic (demo)", kind: "clinic", city: "Ipoh", state: "Perak", approval: "approved" },
  { id: "fac-p1-jb", name: "Johor Bahru Family Hospital (demo)", kind: "hospital", city: "Johor Bahru", state: "Johor", approval: "approved" },
  { id: "fac-p1-kk", name: "Sabah Coastal Medical Centre (demo)", kind: "hospital", city: "Kota Kinabalu", state: "Sabah", approval: "approved" },
  { id: "fac-p1-penang", name: "Georgetown Heritage Clinic (demo)", kind: "clinic", city: "George Town", state: "Penang", approval: "approved" },
  { id: "fac-p1-pending", name: "Melaka Riverside Clinic (demo)", kind: "clinic", city: "Melaka", state: "Melaka", approval: "pending" },
] as const;

type State = "verified" | "expiring" | "expired" | "suspended" | "pending" | "rejected" | "info_requested";

// [name, role, specialization, state, facility index]
const PEOPLE: [string, "doctor" | "nurse" | "caregiver", string, State, number][] = [
  ["Dr Aisyah Karim", "doctor", "General Practice", "verified", 0],
  ["Dr Wei Han Chong", "doctor", "Paediatrics", "verified", 1],
  ["Dr Suresh Menon", "doctor", "Orthopaedics", "verified", 1],
  ["Dr Nurul Huda", "doctor", "Obstetrics & Gynaecology", "verified", 3],
  ["Dr Jason Lim", "doctor", "Emergency Medicine", "verified", 2],
  ["Dr Farah Zainal", "doctor", "Dermatology", "expiring", 0],
  ["Dr Daniel Ong", "doctor", "Cardiology", "expiring", 1],
  ["Dr Hafiz Rahman", "doctor", "Psychiatry", "expired", 3],
  ["Dr Priya Nair", "doctor", "Ophthalmology", "expired", 2],
  ["Dr Kevin Tan", "doctor", "ENT", "suspended", 1],
  ["Dr Mei Ling Yap", "doctor", "Family Medicine", "pending", 0],
  ["Dr Adam Ismail", "doctor", "Anaesthesiology", "rejected", 2],
  ["Dr Sarah Lee", "doctor", "Radiology", "info_requested", 3],
  ["Nur Alia Hassan", "nurse", "ICU & Critical Care", "verified", 1],
  ["Rohani Abdullah", "nurse", "Paediatric Nursing", "verified", 0],
  ["Joseph Lau", "nurse", "Emergency Nursing", "verified", 2],
  ["Siti Mariam", "nurse", "Theatre Nursing", "expiring", 1],
  ["Tan Siew Lan", "nurse", "Community Nursing", "expired", 3],
  ["Kamala Devi", "nurse", "Midwifery", "suspended", 0],
  ["Zulaikha Omar", "nurse", "Oncology Nursing", "pending", 1],
  ["Ravi Chandran", "nurse", "Renal Nursing", "info_requested", 2],
  ["Aminah Yusof", "caregiver", "Elder care", "verified", 0],
  ["Lim Poh Choo", "caregiver", "Post-surgery home care", "verified", 3],
  ["Fatimah Ali", "caregiver", "Dementia care", "pending", 0],
  ["Mohd Zaki", "caregiver", "Disability care", "rejected", 1],
  ["Grace Wong", "caregiver", "Paediatric home care", "expiring", 2],
];

const EXPIRY: Record<State, number> = { verified: 240, expiring: 14, expired: -20, suspended: 120, pending: 365, rejected: 365, info_requested: 365 };

interface Ctx { doctors: any[]; nurses: any[]; jobs: any[]; verificationRequests: any[] }

export function seedPhase1Demo(ctx: Ctx) {
  const now = iso();

  // ---- facilities (direct rows: the same table the real registration and approval flow uses)
  for (const f of FACILITIES) {
    if (db.prepare("SELECT 1 FROM tourism_facilities WHERE id = ?").get(f.id)) continue;
    const approved = f.approval === "approved";
    db.prepare(`INSERT INTO tourism_facilities (id,name,kind,city,state,address,description,phone,email,accepts_international,mhtc_member,languages,specialties,services,accreditations,
        licence_no,licence_expiry,licence_checked_at,licence_reference,active,approval_status,departments,service_list,registered_at,created_at,verified_facilitator)
      VALUES (?,?,?,?,?,?,?,?,?,1,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      f.id, f.name, f.kind, f.city, f.state, `1 Jalan Demo, ${f.city}`, `Invented demo ${f.kind} in ${f.city}. Not a real facility.`, "03-5550 0000", `info@${f.id}.test`,
      JSON.stringify(["English", "Bahasa Malaysia"]), JSON.stringify(["General", "Family"]), JSON.stringify({}), "[]",
      `DEMO-FAC-${f.id.slice(-4).toUpperCase()}`, approved ? day(400) : null, approved ? now : null, approved ? "Demo data: not a real licence check" : null,
      approved ? 1 : 0, f.approval, JSON.stringify([{ name: "Outpatient" }, { name: "Emergency" }, { name: "Paediatrics" }]), JSON.stringify(["Health screening", "Vaccination", "Minor procedures"]),
      now, now, approved ? 1 : 0,
    );
  }

  // ---- practitioners and caregivers
  const all = [...ctx.doctors, ...ctx.nurses];
  PEOPLE.forEach(([name, role, specialization, state, fi], i) => {
    const id = `p1-${role === "doctor" ? "doc" : role === "nurse" ? "nur" : "cg"}-${String(i + 1).padStart(2, "0")}`;
    if (all.some(p => p.id === id)) return;
    const fac = FACILITIES[fi];
    const number = role === "caregiver" ? `CG-DEMO-${i + 1}` : `DEMO-${role === "doctor" ? "MMC" : "LJM"}-P1-${String(i + 1).padStart(3, "0")}`;
    const status =
      state === "verified" || state === "expiring" ? VerificationStatus.VERIFIED
      : state === "expired" ? VerificationStatus.EXPIRED
      : state === "suspended" ? VerificationStatus.SUSPENDED
      : state === "rejected" ? VerificationStatus.REJECTED
      : VerificationStatus.PENDING;
    const council = role === "doctor" ? "Malaysian Medical Council (MMC)" : role === "nurse" ? "Malaysian Nursing Board (LJM)" : "CareVerified caregiver tier";
    const profile: any = {
      id, name: `${name} (demo)`, avatar: role === "doctor" ? "/assets/malaysian_female_doctor.jpg" : "/assets/malaysian_female_nurse.jpg", role, specialization,
      licenseNumber: number, licenseExpiry: day(EXPIRY[state]),
      ...(role === "doctor" ? { medicalCouncil: council } : { nursingCouncil: council }),
      registryId: role === "doctor" ? "MMC" : role === "nurse" ? "LJM" : "CAREGIVER_TIER", registrationType: "full",
      experienceYears: 3 + (i % 12), education: [], bio: "Invented demo profile. Not a real practitioner.", languages: ["English", "Bahasa Malaysia"],
      consultationModes: role === "doctor" ? ["In-person"] : ["Home Visit"], fee: role === "doctor" ? 80 + i * 5 : 45, rating: 0, reviewCount: 0,
      verificationStatus: status, practiceAddress: `1 Jalan Demo, ${fac.city}`, city: fac.city, hospitalName: fac.name, isDemo: true,
      availability: { days: ["Monday", "Wednesday", "Friday"], slots: ["09:00 AM - 05:00 PM"] },
      seoSlug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo-${i + 1}`,
    };
    if (state === "verified" || state === "expiring" || state === "expired" || state === "suspended") {
      profile.verifiedAt = new Date(Date.now() - 90 * 86_400_000).toISOString();
      profile.verifiedUntil = day(EXPIRY[state] > 0 ? EXPIRY[state] : 1);
      profile.verificationScope = role === "caregiver" ? "platform-tier" : "verified-in-malaysia";
      profile.credentialState = state === "expiring" ? "expiring" : state === "expired" ? "expired" : "verified";
    }
    if (state === "suspended") profile.suspensionReason = "Demo suspension: under review.";
    (role === "doctor" ? ctx.doctors : ctx.nurses).push(profile);

    if (state === "pending" || state === "rejected" || state === "info_requested") {
      ctx.verificationRequests.push({
        id: `ver-p1-${i + 1}`, userId: id, accountId: null, userName: profile.name, userType: role, licenseNumber: number, medicalCouncil: council, degreeName: "", fileUrl: "",
        submittedAt: now, status: state === "rejected" ? VerificationStatus.REJECTED : state === "info_requested" ? "Info Requested" : VerificationStatus.PENDING,
        ...(state === "rejected" ? { rejectionReason: "Demo: licence could not be matched." } : {}), ...(role === "caregiver" ? { kind: "caregiver" } : {}),
      });
    }
  });

  // ---- jobs, locum roles and open shifts (a facility only advertises while its licence is checked and current)
  const shift = (offset: number, start = "08:00", end = "16:00") => ({ date: day(offset), start, end });
  const JOBS: any[] = [
    { id: "job-p1-1", fi: 0, title: "General practitioner (permanent)", type: "Full-time", roleRequired: "doctor", specialtyRequired: "General Practice", salaryMin: 9000, salaryMax: 12000, salaryPeriod: "month", shifts: [] },
    { id: "job-p1-2", fi: 1, title: "Staff nurse, paediatric ward", type: "Full-time", roleRequired: "nurse", specialtyRequired: "Paediatric Nursing", salaryMin: 3200, salaryMax: 4200, salaryPeriod: "month", shifts: [] },
    { id: "job-p1-3", fi: 1, title: "Weekend emergency locum", type: "Locum", roleRequired: "doctor", specialtyRequired: "Emergency Medicine", salaryMin: 110, salaryMax: 140, salaryPeriod: "hour", shifts: [shift(9), shift(10)] },
    { id: "job-p1-4", fi: 2, title: "Night shift nurse (open shifts)", type: "Shift-based", roleRequired: "nurse", specialtyRequired: "Emergency Nursing", salaryMin: 28, salaryMax: 36, salaryPeriod: "hour", shifts: [shift(5, "20:00", "06:00"), shift(6, "20:00", "06:00"), shift(8, "20:00", "06:00")] },
    { id: "job-p1-5", fi: 3, title: "Home care for an elderly patient", type: "Shift-based", roleRequired: "caregiver", specialtyRequired: "Elder care", salaryMin: 120, salaryMax: 160, salaryPeriod: "shift", shifts: [shift(3, "09:00", "17:00"), shift(4, "09:00", "17:00")] },
    { id: "job-p1-6", fi: 0, title: "Clinic nurse, part-time", type: "Part-time", roleRequired: "nurse", specialtyRequired: "Community Nursing", salaryMin: 25, salaryMax: 30, salaryPeriod: "hour", shifts: [] },
  ];
  for (const j of JOBS) {
    if (ctx.jobs.some(x => x.id === j.id)) continue;
    const fac = FACILITIES[j.fi];
    ctx.jobs.push({
      id: j.id, postedByUserId: null, hospitalName: fac.name, hospitalLogo: "hospital", title: j.title, type: j.type, sector: "private", state: fac.state, roleRequired: j.roleRequired, facilityId: fac.id,
      salaryMin: j.salaryMin, salaryMax: j.salaryMax, salaryPeriod: j.salaryPeriod, shifts: j.shifts, acceptsForeign: false, visaSupport: false, foreignNotes: "",
      location: "Main Wing", city: fac.city, specialtyRequired: j.specialtyRequired, description: "Invented demo vacancy.", salaryRange: `RM ${j.salaryMin} to ${j.salaryMax} per ${j.salaryPeriod}`,
      requirements: ["Valid registration or certificate"], applicantsCount: 0, status: "Active", postedAt: now, appliedUserIds: [],
    });
  }
}

/**
 * Home-care demo data (demo mode only): a sign-in for one seeded verified caregiver, and two people for the demo patient to ask a visit for.
 * Run after the caregiver profiles exist. Adds only what is missing.
 */
export function seedHomecareDemo() {
  const CG_EMAIL = "demo.caregiver@careverified.test";
  if (!db.prepare("SELECT 1 FROM users WHERE email = ?").get(CG_EMAIL)) {
    createUser({ email: CG_EMAIL, password: "DemoPass123", role: "practitioner", name: "Aminah Yusof (demo)", profileId: "p1-cg-22" });
  }
  const patient = db.prepare("SELECT id FROM users WHERE email = ?").get("demo.patient@careverified.test") as { id: string } | undefined;
  if (patient && !db.prepare("SELECT 1 FROM care_recipients WHERE owner_user_id = ?").get(patient.id)) {
    const add = db.prepare("INSERT INTO care_recipients (id,owner_user_id,name,relationship,birth_year,address,city,state,needs,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    const now = iso();
    add.run("rec-demo-1", patient.id, "Puan Rohani (demo)", "Mother", 1948, "12 Jalan Damai, Taman Demo", "Kuala Lumpur", "W.P. Kuala Lumpur", "Needs help with meals, bathing and walking. Takes medicines twice a day.", now);
    add.run("rec-demo-2", patient.id, "Encik Ali (demo)", "Father", 1945, "3 Jalan Aman, Petaling Jaya", "Petaling Jaya", "Selangor", "Recovering from hip surgery. Needs company and light exercise support.", now);
  }
}

export const PHASE1_SEED_SUMMARY = { practitioners: PEOPLE.length, facilities: FACILITIES.length };
