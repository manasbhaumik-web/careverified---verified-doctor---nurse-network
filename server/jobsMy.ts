import crypto from "crypto";
import type { Application, Request, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { notify } from "./verification";
import { isMalaysianRegistered } from "./telemedicine";
import { MY_STATES } from "../src/identity";
import { VerificationStatus } from "../src/types";

/**
 * Malaysian recruitment rules: state, sector (public/private), structured MYR pay, shifts and locum cover, the
 * employer's licensed status (MOH private facility licence, as recorded for the medical tourism facilities), and
 * eligibility checks when a practitioner applies (role, annual practising certificate, foreign registration).
 *
 * Foreign-practitioner rules come from web research (Oct 2026) and are unconfirmed: see docs/JOBS_MALAYSIA.md.
 */

const today = () => new Date().toISOString().slice(0, 10);
const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const parse = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

export const SECTORS = ["public", "private", "other"] as const;
export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Shift-based", "Locum"] as const;
export const ROLES_REQUIRED = ["doctor", "nurse", "any"] as const;
export const PAY_PERIODS = ["month", "day", "hour", "shift"] as const;
const PAY_CAP: Record<string, number> = { month: 100_000, day: 20_000, hour: 2_000, shift: 20_000 };

/** Existing listings only have a city: map common ones to a state so they can be filtered. */
const CITY_STATE: Record<string, string> = {
  "kuala lumpur": "W.P. Kuala Lumpur", "petaling jaya": "Selangor", "shah alam": "Selangor", "subang jaya": "Selangor", "klang": "Selangor", "cheras": "W.P. Kuala Lumpur",
  "george town": "Pulau Pinang", "penang": "Pulau Pinang", "johor bahru": "Johor", "ipoh": "Perak", "melaka": "Melaka", "malacca": "Melaka",
  "kota kinabalu": "Sabah", "kuching": "Sarawak", "putrajaya": "W.P. Putrajaya", "seremban": "Negeri Sembilan", "kuantan": "Pahang", "alor setar": "Kedah",
};
export const inferState = (city?: string) => CITY_STATE[(city ?? "").trim().toLowerCase()];

export interface Shift { date: string; start: string; end: string }

/** Validate the Malaysia-specific part of a job post. Returns an error message or the cleaned fields. */
export function readJobFields(b: any): string | Record<string, any> {
  const sector = (SECTORS as readonly string[]).includes(b.sector) ? b.sector : null;
  if (!sector) return "Say whether this is a public, private or other-sector post.";
  const state = str(b.state, 40);
  if (!MY_STATES.includes(state)) return "Choose the state where the work is.";
  const roleRequired = (ROLES_REQUIRED as readonly string[]).includes(b.roleRequired) ? b.roleRequired : "any";
  const type = (JOB_TYPES as readonly string[]).includes(b.type) ? b.type : "Full-time";

  // Pay: structured MYR range, so it can be filtered and compared
  let salaryMin: number | null = null, salaryMax: number | null = null, salaryPeriod: string | null = null;
  if (b.salaryMin !== undefined && b.salaryMin !== "" && b.salaryMin !== null) {
    salaryMin = Number(b.salaryMin); salaryMax = b.salaryMax === undefined || b.salaryMax === "" || b.salaryMax === null ? salaryMin : Number(b.salaryMax);
    salaryPeriod = (PAY_PERIODS as readonly string[]).includes(b.salaryPeriod) ? b.salaryPeriod : null;
    if (!salaryPeriod) return "Say whether the pay is per month, day, hour or shift.";
    if (!(salaryMin > 0) || !(salaryMax! >= salaryMin)) return "Check the pay range: the maximum cannot be below the minimum.";
    if (salaryMax! > PAY_CAP[salaryPeriod]) return `That pay looks too high for a rate per ${salaryPeriod}.`;
  }

  const rawShifts = Array.isArray(b.shifts) ? b.shifts : [];
  if (rawShifts.length > 31) return "A listing can have at most 31 shifts.";
  const shifts: Shift[] = [];
  for (const s of rawShifts) {
    const date = str(s?.date, 10), start = str(s?.start, 5), end = str(s?.end, 5);
    if (!isDate(date) || date < today() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return "Each shift needs a future date and start and end times (HH:MM).";
    shifts.push({ date, start, end });
  }
  if (type === "Locum" && shifts.length === 0) return "A locum listing needs at least one dated shift.";

  const acceptsForeign = b.acceptsForeign === true;
  return {
    sector, state, roleRequired, type, salaryMin, salaryMax, salaryPeriod, shifts: shifts.sort((a, c) => a.date.localeCompare(c.date)),
    acceptsForeign, visaSupport: acceptsForeign && b.visaSupport === true, foreignNotes: acceptsForeign ? str(b.foreignNotes, 500) : "",
    facilityId: str(b.facilityId, 60) || null,
  };
}

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
export const salaryText = (min: number | null, max: number | null, period: string | null) =>
  min == null || !period ? null : `${min === max ? money(min) : `${money(min)} - ${money(max!)}`} / ${period}`;

/** Employer's licensed status, from the facility register (MOH private healthcare facility licence). */
export function employerInfo(job: any) {
  if (!job.facilityId) return { verified: false, licenceChecked: false, licenceExpiry: null as string | null, licenceOk: false, problem: job.sector === "public" ? "Government facility: not listed in our facility register." : "Employer not in our facility register: licence not checked." };
  const f = row("SELECT name, active, licence_expiry, licence_checked_at FROM tourism_facilities WHERE id = ?", job.facilityId);
  if (!f || !f.active) return { verified: false, licenceChecked: false, licenceExpiry: null, licenceOk: false, problem: "Employer is no longer listed." };
  const expired = !!f.licence_expiry && f.licence_expiry < today();
  return {
    verified: true, licenceChecked: !!f.licence_checked_at, licenceExpiry: f.licence_expiry ?? null, licenceOk: !!f.licence_checked_at && !expired,
    problem: expired ? `The facility licence expired on ${f.licence_expiry}.` : !f.licence_checked_at ? "Facility licence not yet checked." : null,
  };
}

/** Can this practitioner apply? Returns null if yes, or the reason. */
export function applyProblem(job: any, prof: any): string | null {
  if (job.status !== "Active") return "This position is closed.";
  if (!prof || prof.verificationStatus !== VerificationStatus.VERIFIED) return "Only verified practitioners can apply to positions.";
  if (job.roleRequired === "doctor" && prof.role !== "doctor") return "This position is for doctors.";
  if (job.roleRequired === "nurse" && prof.role !== "nurse") return "This position is for nurses.";
  const lastDay = (job.shifts as Shift[] | undefined)?.length ? job.shifts[job.shifts.length - 1].date : today();
  if (!prof.licenseExpiry) return "Add your annual practising certificate expiry date to your profile first.";
  if (prof.licenseExpiry < lastDay) return `Your annual practising certificate expires on ${prof.licenseExpiry}, before ${(job.shifts as Shift[] | undefined)?.length ? "the last shift" : "today"} (${lastDay}). Renew it first.`;
  if (!isMalaysianRegistered(prof) && !job.acceptsForeign) {
    return "This employer only considers practitioners registered in Malaysia. Practitioners registered abroad need Malaysian registration first, usually arranged through a sponsoring employer.";
  }
  return null;
}

// ---------- locum availability profiles ----------
db.exec(`
CREATE TABLE IF NOT EXISTS locum_profiles (
  profile_id TEXT PRIMARY KEY, visible INTEGER NOT NULL DEFAULT 1, states TEXT, specialties TEXT,
  min_rate_sen INTEGER, rate_period TEXT, available_from TEXT, available_to TEXT, note TEXT, updated_at TEXT NOT NULL
);
`);

export function registerJobsMy(app: Application, ctx: { findProfessional: (id: string) => any | undefined; allProfessionals: () => any[]; jobs: () => any[] }) {
  // Licensed employers a practitioner may post for: facilities they are staff of (admins: all active)
  app.get("/api/jobs/employers", requireRole("practitioner", "admin"), (req, res) => {
    const list = req.user!.role === "admin"
      ? rows("SELECT id, name, city, state, licence_expiry, licence_checked_at FROM tourism_facilities WHERE active = 1 ORDER BY name")
      : rows("SELECT f.id, f.name, f.city, f.state, f.licence_expiry, f.licence_checked_at FROM tourism_facilities f JOIN tourism_facility_staff s ON s.facility_id = f.id WHERE s.user_id = ? AND f.active = 1 ORDER BY f.name", req.user!.id);
    res.json({ status: "success", data: list.map(f => ({ id: f.id, name: f.name, city: f.city, state: f.state, licenceChecked: !!f.licence_checked_at, licenceExpiry: f.licence_expiry ?? null, licenceOk: !!f.licence_checked_at && (!f.licence_expiry || f.licence_expiry >= today()) })) });
  });

  app.get("/api/jobs/info", (_req, res) => {
    res.json({
      status: "success",
      data: {
        draft: true,
        sections: [
          { heading: "Practising in Malaysia", body: "Doctors must be registered with the Malaysian Medical Council before practising, and need a current annual practising certificate (APC). Specialists must also be on the specialist register to work as a specialist. Nurses are registered with the Malaysian Nursing Board and also need an annual practising certificate." },
          { heading: "Foreign-registered doctors", body: "Doctors registered only abroad generally cannot take up employment or locum work on a temporary practising certificate: that route is described as being for short training, research or teaching stints, not employment. Foreign applicants are reported to apply for registration through a prospective employer and to go through primary source verification of their degrees; graduates of universities not recognised under the Medical Act are reported to sit a provisional registration examination. Check every point with the MMC." },
          { heading: "Work permits", body: "A foreign practitioner also needs permission to work in Malaysia. We found no official source on the current work pass process for doctors or nurses; the employer normally handles it. Do not rely on a listing's 'visa support' badge until the employer confirms it in writing." },
          { heading: "How we show it", body: "A listing can say it considers practitioners registered abroad and that the employer helps with registration and work permits. The apply button is switched off for practitioners who do not meet the stated rules, with the reason. Employers that are in our facility register show whether their facility licence has been checked. Government hospitals are not licensed under the private healthcare facilities law and so are not shown as checked." },
        ],
      },
    });
  });

  // ---------- locum profiles ----------
  const profileOf = (req: Request) => (req.user?.profileId ? ctx.findProfessional(req.user.profileId) : null);
  const view = (l: any, p: any) => ({
    profileId: l.profile_id, name: p?.name, role: p?.role, specialization: p?.specialization, languages: p?.languages ?? [], city: p?.city,
    states: parse<string[]>(l.states, []), specialties: parse<string[]>(l.specialties, []), minRate: l.min_rate_sen == null ? null : l.min_rate_sen / 100, ratePeriod: l.rate_period,
    availableFrom: l.available_from, availableTo: l.available_to, note: l.note, visible: !!l.visible, updatedAt: l.updated_at,
    registry: p?.medicalCouncil ?? p?.nursingCouncil ?? null, registeredInMalaysia: p ? isMalaysianRegistered(p) : false,
    apcValidUntil: p?.licenseExpiry ?? null, apcStatus: !p?.licenseExpiry ? "none" : p.licenseExpiry < today() ? "expired" : p.licenseExpiry <= new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10) ? "expiring" : "valid",
    verified: p?.verificationStatus === VerificationStatus.VERIFIED,
  });

  app.get("/api/locum/me", requireRole("practitioner"), (req, res) => {
    const p = profileOf(req);
    if (!p) return fail(res, 404, "Create your professional profile first.");
    const l = row("SELECT * FROM locum_profiles WHERE profile_id = ?", p.id);
    res.json({ status: "success", data: l ? view(l, p) : null, apc: { validUntil: p.licenseExpiry ?? null, verified: p.verificationStatus === VerificationStatus.VERIFIED } });
  });

  app.put("/api/locum/me", requireRole("practitioner"), (req, res) => {
    const p = profileOf(req);
    if (!p || p.verificationStatus !== VerificationStatus.VERIFIED) return fail(res, 403, "Only verified practitioners can list for locum work.");
    const b = req.body ?? {};
    const states = Array.isArray(b.states) ? [...new Set<string>(b.states.filter((s: unknown): s is string => typeof s === "string" && MY_STATES.includes(s)))] : [];
    if (states.length === 0) return fail(res, 400, "Choose at least one state you can work in.");
    const specialties = Array.isArray(b.specialties) ? [...new Set<string>(b.specialties.map((s: unknown) => str(s, 60)).filter(Boolean))].slice(0, 10) : [];
    const rate = b.minRate === undefined || b.minRate === "" || b.minRate === null ? null : Math.round(Number(b.minRate) * 100);
    const period = (PAY_PERIODS as readonly string[]).includes(b.ratePeriod) ? b.ratePeriod : null;
    if (rate !== null && (!(rate > 0) || !period || rate / 100 > PAY_CAP[period])) return fail(res, 400, "Check your minimum rate and whether it is per hour, shift, day or month.");
    const from = b.availableFrom ? str(b.availableFrom, 10) : null, to = b.availableTo ? str(b.availableTo, 10) : null;
    if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && to < from)) return fail(res, 400, "Check your available dates.");
    db.prepare(
      `INSERT INTO locum_profiles (profile_id,visible,states,specialties,min_rate_sen,rate_period,available_from,available_to,note,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(profile_id) DO UPDATE SET visible=excluded.visible,states=excluded.states,specialties=excluded.specialties,min_rate_sen=excluded.min_rate_sen,rate_period=excluded.rate_period,
         available_from=excluded.available_from,available_to=excluded.available_to,note=excluded.note,updated_at=excluded.updated_at`
    ).run(p.id, b.visible === false ? 0 : 1, JSON.stringify(states), JSON.stringify(specialties), rate, rate === null ? null : period, from, to, str(b.note, 400) || null, iso());
    audit(req, "locum.update", { target: ["profile", p.id], details: { visible: b.visible !== false } });
    res.json({ status: "success" });
  });

  // Employers (facility staff, admins) browse available locums. Only verified practitioners with a current APC are listed.
  const isEmployer = (req: Request) => req.user!.role === "admin" || !!row("SELECT 1 AS x FROM tourism_facility_staff WHERE user_id = ?", req.user!.id);
  app.get("/api/locums", requireRole("practitioner", "admin"), (req, res) => {
    if (!isEmployer(req)) return fail(res, 403, "Only facility staff and admins can browse locums.");
    const state = str(req.query.state, 40), role = str(req.query.role, 10), specialty = str(req.query.specialty, 60).toLowerCase(), onDate = str(req.query.date, 10);
    const maxRate = req.query.maxRate ? Number(req.query.maxRate) : null;
    let list = rows("SELECT * FROM locum_profiles WHERE visible = 1").map(l => ({ l, p: ctx.findProfessional(l.profile_id) })).filter(({ p }) => p && p.verificationStatus === VerificationStatus.VERIFIED && p.licenseExpiry && p.licenseExpiry >= today());
    if (state) list = list.filter(({ l }) => parse<string[]>(l.states, []).includes(state));
    if (role === "doctor" || role === "nurse") list = list.filter(({ p }) => p.role === role);
    if (specialty) list = list.filter(({ l, p }) => `${p.specialization} ${parse<string[]>(l.specialties, []).join(" ")}`.toLowerCase().includes(specialty));
    if (isDate(onDate)) list = list.filter(({ l, p }) => (!l.available_from || l.available_from <= onDate) && (!l.available_to || l.available_to >= onDate) && p.licenseExpiry >= onDate);
    if (maxRate !== null && Number.isFinite(maxRate)) list = list.filter(({ l }) => l.min_rate_sen == null || l.min_rate_sen / 100 <= maxRate);
    res.json({ status: "success", data: list.map(({ l, p }) => view(l, p)) });
  });

  app.post("/api/locums/:profileId/invite", requireRole("practitioner", "admin"), (req, res) => {
    if (!isEmployer(req)) return fail(res, 403, "Only facility staff and admins can invite locums.");
    const l = row("SELECT * FROM locum_profiles WHERE profile_id = ? AND visible = 1", req.params.profileId);
    const p = l ? ctx.findProfessional(l.profile_id) : null;
    if (!l || !p || p.verificationStatus !== VerificationStatus.VERIFIED) return fail(res, 404, "Locum not found.");
    const message = str(req.body.message, 500);
    if (message.length < 10) return fail(res, 400, "Write a short message (at least 10 characters).");
    const jobId = str(req.body.jobId, 60);
    const job = jobId ? ctx.jobs().find(j => j.id === jobId) : null;
    if (jobId && !job) return fail(res, 404, "Job not found.");
    const recent = row("SELECT COUNT(*) AS n FROM audit_log WHERE actor_id = ? AND action = 'locum.invite' AND ts > ?", req.user!.id, new Date(Date.now() - 86400_000).toISOString()).n;
    if (recent >= 20) return fail(res, 429, "You have sent many invitations today. Try again tomorrow.");
    const account = row("SELECT id FROM users WHERE profile_id = ?", p.id);
    if (account) notify(account.id, "Locum invitation", `${req.user!.name}${job ? ` (${job.hospitalName}: ${job.title})` : ""}: ${message}`);
    audit(req, "locum.invite", { target: ["profile", p.id], details: { jobId: jobId || undefined } });
    res.json({ status: "success", message: "Invitation sent. The practitioner decides whether to reply; their contact details are not shared." });
  });
}
