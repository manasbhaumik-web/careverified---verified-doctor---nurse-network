/**
 * Creates demo accounts and sample clinical data through the running app's own API.
 *
 *   1. Start the app:   npm run dev
 *   2. In another shell: npm run seed:demo
 *
 * Safe to run repeatedly: existing accounts are reused, sample data is only created once.
 * Refuses to run against production. Test mode payments only (no real money).
 */
import dotenv from "dotenv";
dotenv.config();

const BASE = (process.env.SEED_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const DEMO_PASSWORD = "DemoPass123";
const ACCOUNTS = {
  patient: { email: "demo.patient@careverified.test", name: "Demo Patient" },
  doctor: { email: "demo.doctor@careverified.test", name: "Dr Demo Physician" },
};
const PHARMACY_EMAIL = "demo.pharmacy@careverified.test";

const host = new URL(BASE).hostname;
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  console.error(`Refusing to seed demo data: ${BASE} is not a local development server.`);
  process.exit(1);
}

class Client {
  cookie = "";
  async call(method: string, path: string, body?: unknown, form?: FormData): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = { cookie: this.cookie };
    if (body && !form) headers["content-type"] = "application/json";
    const r = await fetch(BASE + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
    const sc = r.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0];
    let data: any = null;
    try { data = await r.json(); } catch { /* not JSON */ }
    return { status: r.status, data };
  }
}
const must = (label: string, r: { status: number; data: any }, ok: number[] = [200, 201]) => {
  if (!ok.includes(r.status)) {
    console.error(`\nFailed: ${label} (HTTP ${r.status}) ${JSON.stringify(r.data)}`);
    process.exit(1);
  }
  return r.data;
};

async function main() {
  try { await fetch(BASE + "/api/on-call/status"); } catch {
    console.error(`Cannot reach ${BASE}. Start the app first with: npm run dev`);
    process.exit(1);
  }
  const adminEmail = process.env.ADMIN_EMAIL || "admin@careverified.local";
  if (!process.env.ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD is not set in .env. Set it, restart the app on a fresh database, and try again.");
    process.exit(1);
  }

  const admin = new Client();
  must("admin sign-in", await admin.call("POST", "/api/auth/login", { email: adminEmail, password: process.env.ADMIN_PASSWORD, role: "admin" }));

  // ---- doctor
  const doc = new Client();
  let r = await doc.call("POST", "/api/auth/register-practitioner", { name: ACCOUNTS.doctor.name, email: ACCOUNTS.doctor.email, password: DEMO_PASSWORD, consent: true });
  if (r.status === 409) must("doctor sign-in", await doc.call("POST", "/api/auth/login", { email: ACCOUNTS.doctor.email, password: DEMO_PASSWORD, role: "practitioner" }));
  else must("doctor sign-up", r);
  const me = must("doctor profile", await doc.call("GET", "/api/auth/me")).data.user;
  let profileId: string | null = me.profileId;

  if (!profileId) {
    const reg = must("doctor registration", await doc.call("POST", "/api/register", {
      role: "doctor", name: ACCOUNTS.doctor.name, specialization: "General Physician", licenseNumber: "DEMO-MMC-0001",
      medicalCouncil: "Malaysian Medical Council (MMC)", city: "Kuala Lumpur", practiceAddress: "1 Jalan Demo, Kuala Lumpur",
      education: ["MBBS (Demo University)"], experienceYears: 8, fee: 60, bio: "Demo general physician.",
      licenseExpiry: new Date(Date.now() + 3 * 365 * 86400_000).toISOString().slice(0, 10),
    })).data;
    profileId = reg.id;
    const form = new FormData();
    form.append("kind", "license");
    form.append("verificationRequestId", reg.verificationRequestId);
    form.append("file", new Blob(["%PDF-1.4 demo licence"]), "demo-licence.pdf");
    must("licence upload", await doc.call("POST", "/api/documents", undefined, form));
    must("approve doctor", await admin.call("POST", `/api/verification-requests/${reg.verificationRequestId}/decision`, { decision: "approve", registryReference: "Demo seed: not a real register check" }));
  }

  // weekday roster 08:00-20:00 so the coverage grid has some data
  const cells = [];
  for (let day = 0; day < 5; day++) for (let hour = 8; hour < 20; hour++) cells.push({ day, hour });
  await doc.call("PUT", "/api/roster", { cells });

  // ---- patient
  const pat = new Client();
  r = await pat.call("POST", "/api/register-patient", {
    name: ACCOUNTS.patient.name, email: ACCOUNTS.patient.email, password: DEMO_PASSWORD, icNumber: "900101-14-0000", age: 34, gender: "Female",
    phone: "+60-12-000-0000", allergies: ["Penicillin"], chronicConditions: ["Hypertension"], consent: true,
  });
  const patientIsNew = r.status !== 409;
  if (!patientIsNew) must("patient sign-in", await pat.call("POST", "/api/auth/login", { email: ACCOUNTS.patient.email, password: DEMO_PASSWORD, role: "patient" }));
  else must("patient sign-up", r);

  // sample clinical data, only once
  const record = must("patient record", await pat.call("GET", "/api/records/me")).data;
  if (record.items.filter((i: any) => i.type === "medication").length === 0) {
    must("medication", await pat.call("POST", "/api/records/items", { type: "medication", name: "Warfarin", detail: "3 mg at night" }));
    must("reading", await pat.call("POST", "/api/records/vitals", { kind: "bp", value1: 134, value2: 86 }));
  }
  const bookings = must("bookings", await pat.call("GET", "/api/bookings")).data;
  if (bookings.length === 0 && profileId) {
    const date = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    const bk = must("booking", await pat.call("POST", "/api/bookings", { professionalId: profileId, date, timeSlot: "10:00 AM", shareRecord: true, symptoms: "Demo visit: persistent cough" })).data;
    const pay = must("checkout", await pat.call("POST", "/api/payments/checkout", { kind: "booking", refId: bk.id })).data;
    must("sandbox payment", await pat.call("POST", `/api/payments/${pay.paymentId}/sandbox-confirm`));
    must("visit note", await doc.call("PUT", `/api/encounters/booking/${bk.id}`, { subjective: "Cough for 3 days.", objective: "Afebrile, chest clear.", assessment: "Viral upper respiratory infection.", plan: "Rest, fluids, review if worse." }));
    must("sign note", await doc.call("POST", `/api/encounters/booking/${bk.id}/sign`));
    must("prescription", await doc.call("POST", "/api/prescriptions", {
      kind: "booking", refId: bk.id, diagnosis: "Viral upper respiratory infection",
      items: [{ name: "paracetamol", strength: "500 mg", form: "tablet", dose: "1 tablet", frequency: "every 6 hours if needed", durationDays: 3, quantity: 12, instructions: "After food" }],
    }));
  }

  // ---- pharmacy (its PIN is shown only once)
  let pharmacyLine = "Demo Pharmacy already exists (its PIN was shown the first time).";
  const pharmacies = must("pharmacies", await admin.call("GET", "/api/admin/pharmacies")).data as any[];
  if (!pharmacies.some(p => p.name === "Demo Pharmacy")) {
    const ph = must("pharmacy", await admin.call("POST", "/api/admin/pharmacies", { name: "Demo Pharmacy", address: "2 Jalan Demo, Kuala Lumpur", city: "Kuala Lumpur", phone: "03-5550 0100", hours: "Mon–Sat 9am–10pm", services: ["Home delivery", "Vaccinations"] })).data;
    pharmacyLine = `Pharmacy console (${BASE}/pharmacy):  ID ${ph.id}   PIN ${ph.pin}`;
  } else {
    // Fill in the directory details on a pharmacy created before they existed.
    const demo = pharmacies.find(p => p.name === "Demo Pharmacy");
    if (demo && !demo.city) must("pharmacy details", await admin.call("PATCH", `/api/admin/pharmacies/${demo.id}`, { city: "Kuala Lumpur", phone: "03-5550 0100", hours: "Mon–Sat 9am–10pm", services: ["Home delivery", "Vaccinations"] }));
  }
  // A second pharmacy so the patient's Pharmacies page has something to filter.
  if (!pharmacies.some(p => p.name === "Demo 24h Pharmacy")) {
    const ph2 = must("pharmacy 2", await admin.call("POST", "/api/admin/pharmacies", { name: "Demo 24h Pharmacy", address: "15 Jalan Contoh, George Town", city: "Penang", phone: "04-5550 0200", hours: "Open 24 hours", services: ["24 hours", "Drive-through", "Online ordering"] })).data;
    pharmacyLine += `\n                                          Second pharmacy:  ID ${ph2.id}   PIN ${ph2.pin}`;
  }

  // ---- pharmacy workspace login (email + password) and a few prescriptions in its inbox
  const demoPharmacy = (must("pharmacies", await admin.call("GET", "/api/admin/pharmacies")).data as any[]).find(p => p.name === "Demo Pharmacy");
  const phc = new Client();
  let workspaceLine = "Pharmacy workspace login is not set up (Demo Pharmacy was not found).";
  if (demoPharmacy) {
    const summary = must("pharmacy summary", await admin.call("GET", "/api/admin/pharmacies/summary")).data[demoPharmacy.id];
    if (!summary?.verification) {
      must("pharmacy verification", await admin.call("POST", `/api/admin/pharmacies/${demoPharmacy.id}/verification`, { licenceNumber: "DEMO-PH-0001", pharmacistName: "Demo Pharmacist", pharmacistRegNo: "DEMO-RPh-0001", confirmed: true }));
    }
    const signIn = (password: string) => phc.call("POST", "/api/auth/login", { email: PHARMACY_EMAIL, password, role: "pharmacy" });
    const adopt = async (temp: string) => {
      must("pharmacy sign-in (temporary password)", await signIn(temp));
      must("pharmacy password", await phc.call("POST", "/api/auth/change-password", { currentPassword: temp, newPassword: DEMO_PASSWORD }));
    };
    if (!summary?.account) {
      const created = must("pharmacy login", await admin.call("POST", `/api/admin/pharmacies/${demoPharmacy.id}/account`, { email: PHARMACY_EMAIL, name: "Demo Pharmacy Team" })).data;
      await adopt(created.password);
    } else if ((await signIn(DEMO_PASSWORD)).status !== 200) {
      const reset = must("pharmacy password reset", await admin.call("POST", `/api/admin/pharmacies/${demoPharmacy.id}/account/reset`)).data;
      await adopt(reset.password);
    }
    workspaceLine = `Pharmacy workspace (Pharmacy tab):  ${PHARMACY_EMAIL}  /  ${DEMO_PASSWORD}   ->  ${demoPharmacy.name}`;

    // Sample inbox: one new, one being prepared, one that could not be filled. Created once.
    const inbox = must("pharmacy inbox", await phc.call("GET", "/api/pharmacy/prescriptions")).data.items as any[];
    const visit = (must("bookings", await pat.call("GET", "/api/bookings")).data as any[])[0];
    if (inbox.length < 3 && visit) {
      const issue = async (drug: any, diagnosis: string) => {
        const rx = must("prescription", await doc.call("POST", "/api/prescriptions", { kind: "booking", refId: visit.id, diagnosis, items: [drug] })).data;
        must("send to pharmacy", await pat.call("POST", `/api/prescriptions/${rx.id}/send`, { pharmacyId: demoPharmacy.id, shareSafety: true }));
        return rx;
      };
      await issue({ name: "cetirizine", strength: "10 mg", form: "tablet", dose: "1 tablet", frequency: "once daily", durationDays: 7, quantity: 7, instructions: "At night" }, "Seasonal allergic rhinitis");
      const second = await issue({ name: "paracetamol", strength: "500 mg", form: "tablet", dose: "1 tablet", frequency: "every 6 hours if needed", durationDays: 3, quantity: 12, instructions: "After food" }, "Viral upper respiratory infection");
      must("status preparing", await phc.call("POST", `/api/pharmacy/prescriptions/${second.id}/status`, { status: "preparing" }));
      const third = await issue({ name: "cetirizine", strength: "10 mg", form: "tablet", dose: "1 tablet", frequency: "once daily", durationDays: 14, quantity: 14, instructions: "In the morning" }, "Allergic rhinitis, follow-up");
      must("status cannot fill", await phc.call("POST", `/api/pharmacy/prescriptions/${third.id}/status`, { status: "cannot_fill", reason: "Out of stock until Tuesday" }));
    }
  }

  console.log(`
Demo data is ready at ${BASE}

  Role          Sign in on tab     Email                              Password
  ------------  -----------------  ---------------------------------  ------------
  Patient       Patient            ${ACCOUNTS.patient.email.padEnd(33)}  ${DEMO_PASSWORD}
  Doctor        Practitioner       ${ACCOUNTS.doctor.email.padEnd(33)}  ${DEMO_PASSWORD}
  Admin         Board Admin        ${adminEmail.padEnd(33)}  (ADMIN_PASSWORD in .env)
  Pharmacy      Pharmacy           ${PHARMACY_EMAIL.padEnd(33)}  ${DEMO_PASSWORD}

${pharmacyLine}
${workspaceLine}

What is set up
  - The doctor is verified, with a weekday 08:00-20:00 on-call roster.
  - The patient has a Penicillin allergy, Hypertension, a Warfarin entry and a blood pressure reading.
  - One paid and completed visit with a signed note and a prescription (see Health Record).
  - Demo Pharmacy has its own workspace login with a sample inbox (new, being prepared, could not fill).
  - All payments are test mode: no real money moves.

To try "Consult a doctor now": sign in as the doctor, open On Call and click "Go online"
(the doctor stays online while that page is open), then request a consult as the patient.
`);
}

main().catch(e => { console.error(e); process.exit(1); });
