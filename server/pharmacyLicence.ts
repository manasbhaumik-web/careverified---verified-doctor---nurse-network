// Pure helpers shared by the pharmacy modules (no imports, so there are no circular dependencies).

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Why a pharmacy may not trade right now, or null. Dates are the pharmacy premises licence and the pharmacist's annual
 * retention certificate. Pharmacies verified before expiry dates existed (null) are not blocked.
 */
export function pharmacyLicenceProblem(ph: { licence_expiry?: string | null; pharmacist_apc_expiry?: string | null }): string | null {
  const t = today();
  if (ph.licence_expiry && ph.licence_expiry < t) return `The pharmacy licence expired on ${ph.licence_expiry}.`;
  if (ph.pharmacist_apc_expiry && ph.pharmacist_apc_expiry < t) return `The pharmacist's annual retention certificate expired on ${ph.pharmacist_apc_expiry}.`;
  return null;
}
export const pharmacyLicenceOk = (ph: any) => pharmacyLicenceProblem(ph) === null;

export const DELIVERY_METHODS = ["pharmacy_courier", "grab", "lalamove", "other_courier"] as const;
export const DELIVERY_LABEL: Record<string, string> = {
  pharmacy_courier: "Pharmacy's own rider", grab: "Grab delivery", lalamove: "Lalamove", other_courier: "Other courier",
};
export const cleanDeliveryMethods = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && (DELIVERY_METHODS as readonly string[]).includes(x)))] : [];

/** Free-text list (insurer names): trimmed, de-duplicated, capped. */
export const cleanList = (v: unknown, max = 12): string[] =>
  Array.isArray(v) ? [...new Set(v.map(x => (typeof x === "string" ? x.trim().slice(0, 60) : "")).filter(Boolean))].slice(0, max) : [];

/** NPRA product registration number: MAL + 8 digits (year, month, serial) + category letter + optional admin letters. Format only: it is not checked against NPRA. */
export const NPRA_RE = /^MAL\d{8}[A-Z]{1,4}$/;
export const normaliseNpra = (s: string) => s.replace(/\s/g, "").toUpperCase();
