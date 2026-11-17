import type { Application } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, verifyPassword, emailTaken } from "./auth";
import { notify } from "./verification";
import { str, fail } from "./util";
import { toE164, addressProblem, RELATIONSHIPS, PREFERRED_LANGUAGES } from "../src/identity";

/**
 * The signed-in person's own profile: personal information and sign-in details.
 *
 * - Everyone can see their account and change their sign-in email (with the current password). The password itself is changed with
 *   POST /api/auth/change-password, which already exists.
 * - Patients can also change their phone, address, language, emergency contact and next of kin. Their ID number, ID type, nationality
 *   and date of birth are shown but not editable here, because they identify the person (changing them needs a check).
 * - Practitioners cannot change their name here: it is tied to the verified licence. Their professional details stay in the workspace
 *   (Licensing and APC, Profile and Settings); this page only shows the status.
 * - Admin, pharmacy and facility accounts can change the display name on their login.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Ctx {
  patientOf: (userId: string) => any | undefined;
  professionalOf: (profileId: string) => any | undefined;
  persist: () => void;
}

const maskId = (v: unknown) => {
  const s = typeof v === "string" ? v.replace(/\s|-/g, "") : "";
  return s.length > 4 ? `••••${s.slice(-4)}` : s ? "••••" : "";
};

export function registerProfile(app: Application, ctx: Ctx) {
  const nameEditable = (role: string) => role !== "practitioner";

  const view = (userId: string, role: string, profileId?: string | null) => {
    const u = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?").get(userId) as any;
    const p = role === "patient" ? ctx.patientOf(userId) : undefined;
    const pro = role === "practitioner" && profileId ? ctx.professionalOf(profileId) : undefined;
    return {
      account: { id: u.id, role: u.role, name: u.name, email: u.email, createdAt: u.created_at, nameEditable: nameEditable(role) },
      patient: p ? {
        idType: p.idType ?? null, idNumberMasked: maskId(p.icNumber), nationality: p.nationality ?? null, dateOfBirth: p.dateOfBirth ?? null,
        gender: p.gender ?? null, phone: p.phone ?? "", address: p.address ?? null, preferredLanguage: p.preferredLanguage ?? "en",
        emergencyContactName: p.emergencyContactName ?? "", emergencyContactRelationship: p.emergencyContactRelationship ?? "",
        emergencyContactPhone: p.emergencyContactPhone ?? "", nextOfKin: p.nextOfKin ?? null,
      } : null,
      professional: pro ? {
        licenseNumber: pro.licenseNumber ?? null, specialty: pro.specialty ?? null, verificationStatus: pro.verificationStatus ?? null,
        credentialState: pro.credentialState ?? null,
      } : null,
    };
  };

  app.get("/api/me/profile", requireAuth, (req, res) => {
    res.json({ status: "success", data: view(req.user!.id, req.user!.role, req.user!.profileId) });
  });

  app.put("/api/me/profile", requireAuth, (req, res) => {
    const user = req.user!;
    const b = req.body ?? {};
    const changed: string[] = [];

    // Check everything first, then write, so a bad field changes nothing.
    let newName: string | null = null;
    if (b.name !== undefined) {
      if (!nameEditable(user.role)) return fail(res, 403, "A practitioner's name is tied to the verified licence and cannot be changed here.");
      newName = str(b.name, 100);
      if (newName.length < 2) return fail(res, 400, "Enter your full name.");
    }

    const patch: Record<string, unknown> = {};
    if (user.role === "patient") {
      const p = ctx.patientOf(user.id);
      if (!p) return fail(res, 404, "Your member profile was not found.");
      if (b.phone !== undefined) {
        const phone = toE164(str(b.phone, 30));
        if (!phone) return fail(res, 400, "Enter a valid phone number.");
        patch.phone = phone;
      }
      if (b.address !== undefined) {
        const a = b.address ?? {};
        const address = { line1: str(a.line1, 120), line2: str(a.line2, 120), city: str(a.city, 60), state: str(a.state, 60), postcode: str(a.postcode, 12), country: str(a.country, 2).toUpperCase() };
        const problem = addressProblem(address);
        if (problem) return fail(res, 400, problem);
        patch.address = address;
      }
      if (b.preferredLanguage !== undefined) {
        if (!PREFERRED_LANGUAGES.some(l => l.code === b.preferredLanguage)) return fail(res, 400, "Choose a language from the list.");
        patch.preferredLanguage = b.preferredLanguage;
      }
      if (b.gender !== undefined) {
        if (!["Male", "Female", "Other"].includes(b.gender)) return fail(res, 400, "Choose a gender from the list.");
        patch.gender = b.gender;
      }
      if (b.emergencyContactName !== undefined || b.emergencyContactPhone !== undefined || b.emergencyContactRelationship !== undefined) {
        const name = str(b.emergencyContactName ?? p.emergencyContactName, 100);
        const phone = toE164(str(b.emergencyContactPhone ?? p.emergencyContactPhone, 30));
        if (!name || !phone) return fail(res, 400, "Enter your emergency contact's name and a valid phone number.");
        patch.emergencyContactName = name;
        patch.emergencyContactPhone = phone;
        const rel = b.emergencyContactRelationship ?? p.emergencyContactRelationship;
        patch.emergencyContactRelationship = RELATIONSHIPS.includes(rel) ? rel : "Other";
      }
      if (b.nextOfKin !== undefined) {
        if (b.nextOfKin === null) patch.nextOfKin = null;
        else {
          const phone = toE164(str(b.nextOfKin.phone, 30));
          const name = str(b.nextOfKin.name, 100);
          if (!name || !phone) return fail(res, 400, "Enter your next of kin's name and a valid phone number.");
          patch.nextOfKin = { name, relationship: RELATIONSHIPS.includes(b.nextOfKin.relationship) ? b.nextOfKin.relationship : "Other", phone };
        }
      }
    } else {
      for (const k of ["phone", "address", "preferredLanguage", "gender", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "nextOfKin"]) {
        if (b[k] !== undefined) return fail(res, 403, "Only member accounts have these details.");
      }
    }

    if (newName !== null) {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(newName, user.id);
      changed.push("name");
      if (user.role === "patient") patch.name = newName;
    }
    if (Object.keys(patch).length) {
      Object.assign(ctx.patientOf(user.id), patch);
      changed.push(...Object.keys(patch).filter(k => k !== "name"));
      ctx.persist();
    }
    if (changed.length) audit(req, "profile.update", { target: ["user", user.id], details: { fields: changed } });
    res.json({ status: "success", message: changed.length ? "Profile updated." : "Nothing to change.", data: view(user.id, user.role, user.profileId) });
  });

  app.post("/api/me/email", requireAuth, (req, res) => {
    const user = req.user!;
    const newEmail = str(req.body?.newEmail, 254).toLowerCase();
    const row = db.prepare("SELECT password_hash, email FROM users WHERE id = ?").get(user.id) as any;
    if (typeof req.body?.currentPassword !== "string" || !verifyPassword(req.body.currentPassword, row.password_hash)) return fail(res, 400, "Current password is incorrect.");
    if (!EMAIL_RE.test(newEmail)) return fail(res, 400, "Enter a valid email address.");
    if (newEmail === String(row.email).toLowerCase()) return fail(res, 400, "That is already your email address.");
    if (emailTaken(newEmail)) return fail(res, 409, "An account with this email already exists.");
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(newEmail, user.id);
    const p = user.role === "patient" ? ctx.patientOf(user.id) : undefined;
    if (p) { p.email = newEmail; ctx.persist(); }
    audit(req, "profile.email.change", { target: ["user", user.id] });
    notify(user.id, "Your sign-in email was changed", "If this was not you, reset your password straight away and tell the board.");
    res.json({ status: "success", message: "Email updated. Use the new address the next time you sign in.", data: view(user.id, user.role, user.profileId) });
  });
}
