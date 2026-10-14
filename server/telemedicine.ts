/**
 * Telemedicine rules for patients located in Malaysia.
 *
 * Basis (web research, Oct 2026; confirm with Malaysian counsel before launch):
 *  - MoH virtual-consultation guidance: first-time patients, especially with long-term (non-communicable)
 *    conditions, should be seen in person; telemedicine is for follow-ups.
 *  - MMC notification (Sept 2025): no medical certificates after a teleconsultation alone.
 *  - The Telemedicine Act 1997 is not in force; the Medical Act 1971, the MMC telemedicine guideline and the
 *    PDPA 2010 apply. A Digital Health Act is expected (status unconfirmed).
 */
import { scopeFor, inferRegistryId } from "./registries";

export type FirstVisitPolicy = "block_chronic" | "block_all" | "allow";

export const firstVisitPolicy = (): FirstVisitPolicy => {
  const v = process.env.TELE_FIRST_VISIT;
  return v === "block_all" || v === "allow" ? v : "block_chronic";
};

export const normaliseCountry = (v: unknown) =>
  typeof v === "string" && /^[A-Za-z]{2}$/.test(v.trim()) ? v.trim().toUpperCase() : "MY";

export interface ConsultAssessment {
  allowed: boolean;
  firstVisit: boolean;
  crossBorder: boolean;
  /** Shown to the patient when blocked. */
  message?: string;
}

/**
 * A visit counts as a follow-up only if the platform has a completed consult or paid, completed booking for the patient,
 * or the patient attests they were already seen in person for this problem (recorded and audited, not verified).
 */
export function assessConsult(input: { country: string; declaredFirstVisit: boolean; hasPriorConsult: boolean; attestedSeenBefore?: boolean; chronic: boolean }): ConsultAssessment {
  const priorKnown = input.hasPriorConsult || input.attestedSeenBefore === true;
  const firstVisit = input.declaredFirstVisit || !priorKnown;
  const crossBorder = input.country !== "MY";
  if (crossBorder) return { allowed: true, firstVisit, crossBorder };
  const policy = firstVisitPolicy();
  const blocked = firstVisit && (policy === "block_all" || (policy === "block_chronic" && input.chronic));
  return blocked
    ? {
        allowed: false, firstVisit, crossBorder,
        message: "In Malaysia, a first consultation for a long-term condition should be in person. Please book an appointment with a doctor, then use online consultations for follow-ups. If this is an emergency, call 999.",
      }
    : { allowed: true, firstVisit, crossBorder };
}

/** A doctor registered with a Malaysian regulator and checked against its register. */
export const isMalaysianRegistered = (p: any) =>
  (p?.verificationScope ?? scopeFor(p?.registryId ?? inferRegistryId(p?.medicalCouncil ?? p?.nursingCouncil))) === "verified-in-malaysia";

/** Patients in Malaysia may only be treated online by practitioners registered in Malaysia. */
export const practitionerMayTreat = (patientCountry: string | null | undefined, prof: any) =>
  (patientCountry ?? "MY") !== "MY" || isMalaysianRegistered(prof);

export const MC_AFTER_TELECONSULT_MESSAGE =
  "The Malaysian Medical Council does not allow medical certificates to be issued after a teleconsultation alone. Ask the patient to attend in person.";

/** Only booked video appointments are "virtual"; in-person and home visits are not subject to the rules above. */
export const isVirtualMode = (mode: unknown) => /video|tele/i.test(String(mode ?? ""));

/**
 * Prescribing guardrails for online care.
 *  - Controlled medicines are never e-prescribed (see formulary RESTRICTED).
 *  - Cross-border patients: a Malaysian e-prescription cannot be dispensed or verified abroad, so by default
 *    it is not issued (TELE_CROSS_BORDER_RX=allow to override once legal has signed off).
 *  - TELE_EXTRA_RESTRICTED: comma-separated drugs that may not be prescribed after an online consultation only.
 */
export const crossBorderRxAllowed = () => process.env.TELE_CROSS_BORDER_RX === "allow";

const extraRestricted = () =>
  (process.env.TELE_EXTRA_RESTRICTED ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

export function prescribingBlock(ctx: { virtual: boolean; patientCountry?: string | null }, drugNames: string[]): string | null {
  if (ctx.virtual && (ctx.patientCountry ?? "MY") !== "MY" && !crossBorderRxAllowed()) {
    return "This patient is outside Malaysia. A Malaysian e-prescription cannot be dispensed or verified there, so it cannot be issued from an online consultation. Give written advice and refer the patient to a local doctor.";
  }
  if (ctx.virtual) {
    const extra = extraRestricted();
    const hit = drugNames.find(n => extra.some(x => n.toLowerCase().includes(x)));
    if (hit) return `${hit} cannot be prescribed after an online consultation alone. Ask the patient to attend in person.`;
  }
  return null;
}
