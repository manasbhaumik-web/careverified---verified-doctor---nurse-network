import { VerificationStatus } from "../src/types";

/**
 * Credential lifecycle for practitioners and caregivers.
 *
 * Stored values stay as they are (`VerificationStatus` on the profile, "Info Requested" on the request) so existing data is untouched.
 * This module derives the full lifecycle state from them plus the licence expiry date, and owns the legal transitions.
 */
export type CredentialState = "pending" | "info_requested" | "verified" | "expiring" | "expired" | "suspended" | "rejected";

export const EXPIRING_DAYS = 30;
export const INFO_REQUESTED_STATUS = "Info Requested";

export const TRANSITIONS: Record<CredentialState, CredentialState[]> = {
  pending: ["verified", "rejected", "info_requested"],
  info_requested: ["pending", "rejected"],
  verified: ["expiring", "expired", "suspended"],
  expiring: ["verified", "expired", "suspended"],
  expired: ["pending", "suspended"],
  suspended: ["verified", "pending"],
  rejected: ["pending"],
};

export const canTransition = (from: CredentialState, to: CredentialState) => TRANSITIONS[from]?.includes(to) ?? false;

const dayMs = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export interface StateInput {
  /** Profile verification status as stored (`VerificationStatus`). */
  status: string | undefined;
  /** Latest request status as stored, if any ("Info Requested" is only ever on the request). */
  requestStatus?: string | undefined;
  /** Licence or registration expiry, YYYY-MM-DD. */
  licenseExpiry?: string | null;
}

/** The lifecycle state for display and for the expiry job. `today` is injectable for tests. */
export function deriveState(input: StateInput, today: Date = new Date()): CredentialState {
  const { status, requestStatus, licenseExpiry } = input;
  if (requestStatus === INFO_REQUESTED_STATUS) return "info_requested";
  if (status === VerificationStatus.SUSPENDED) return "suspended";
  if (status === VerificationStatus.REJECTED) return "rejected";
  if (status === VerificationStatus.VERIFIED) {
    if (!licenseExpiry) return "expired"; // a verified profile with no expiry date cannot be trusted as current
    if (licenseExpiry <= isoDay(today)) return "expired";
    if (licenseExpiry <= isoDay(new Date(today.getTime() + EXPIRING_DAYS * dayMs))) return "expiring";
    return "verified";
  }
  return "pending";
}

/** What the public may be told. Suspended, expired and expiring are shown; pending, rejected and unknown are not distinguishable from "not found". */
export const PUBLIC_STATES: CredentialState[] = ["verified", "expiring", "expired", "suspended"];
export const isPublicState = (s: CredentialState) => PUBLIC_STATES.includes(s);
