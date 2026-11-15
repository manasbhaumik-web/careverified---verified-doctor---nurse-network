/**
 * Caregiver verification tier.
 *
 * Caregivers are not on a statutory register, so they are verified by our own checks instead of a council lookup:
 *   1. identity (ID number + e-KYC),
 *   2. at least one supporting certificate (uploaded document),
 *   3. at least two references.
 * A caregiver is a practitioner-account profile with role "caregiver" (no new account role). They go through the same admin review queue.
 */

export const CAREGIVER_ROLE = "caregiver";
export const MIN_REFERENCES = 2;
export const MIN_CERTIFICATES = 1;

export interface Reference { name: string; relationship: string; contact: string }
export type EkycStatus = "passed" | "failed";
export interface EkycResult { status: EkycStatus; provider: string; checkedAt: string; reason?: string }

export interface CaregiverChecks {
  idNumberLast4: string;
  ekyc?: EkycResult;
  references: Reference[];
}

/**
 * e-KYC adapter. TODO: real integration (document and face match from a licensed provider; needs a paid service, so none is called here).
 * The mock is deterministic and makes no network calls: an ID number ending in "0" fails, anything else of 6+ characters passes.
 */
export interface EkycAdapter { provider: string; verify(input: { fullName: string; idNumber: string }): Promise<EkycResult> }

export const mockEkyc: EkycAdapter = {
  provider: "mock-ekyc",
  async verify({ fullName, idNumber }) {
    const checkedAt = new Date().toISOString();
    const id = String(idNumber ?? "").replace(/\s|-/g, "");
    if (!fullName.trim() || id.length < 6) return { status: "failed", provider: "mock-ekyc", checkedAt, reason: "ID number or name missing" };
    if (id.endsWith("0")) return { status: "failed", provider: "mock-ekyc", checkedAt, reason: "Mock: ID did not match" };
    return { status: "passed", provider: "mock-ekyc", checkedAt };
  },
};

export const ekycAdapter = (): EkycAdapter => mockEkyc;

/** Cleans submitted references: trims, keeps only complete entries, caps the count. */
export function cleanReferences(input: unknown): Reference[] {
  if (!Array.isArray(input)) return [];
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  return input
    .map(r => ({ name: s((r as any)?.name, 100), relationship: s((r as any)?.relationship, 60), contact: s((r as any)?.contact, 100) }))
    .filter(r => r.name && r.relationship && r.contact)
    .slice(0, 5);
}

/** What is still missing before a caregiver can be approved. An empty list means every check is in. */
export function missingForApproval(checks: CaregiverChecks | undefined, certificateCount: number): string[] {
  const missing: string[] = [];
  if (checks?.ekyc?.status !== "passed") missing.push("Identity check (e-KYC) has not passed");
  if ((checks?.references.length ?? 0) < MIN_REFERENCES) missing.push(`At least ${MIN_REFERENCES} references are required`);
  if (certificateCount < MIN_CERTIFICATES) missing.push("Upload at least one supporting certificate");
  return missing;
}
