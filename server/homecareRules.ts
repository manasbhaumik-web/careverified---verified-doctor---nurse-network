/**
 * Rules for home-care visit requests. Pure functions (no database), so they are easy to test.
 *
 * Flow: requested -> accepted (family has 24 hours to pay) -> confirmed (paid) -> completed.
 * Other endings: declined (caregiver), cancelled (family), expired (no answer in 48 hours, or not paid in 24 hours).
 */

export type VisitStatus = "requested" | "accepted" | "confirmed" | "completed" | "declined" | "cancelled" | "expired";

export const TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  requested: ["accepted", "declined", "cancelled", "expired"],
  accepted: ["confirmed", "cancelled", "expired"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
  expired: [],
};
export const canTransition = (from: VisitStatus, to: VisitStatus) => TRANSITIONS[from]?.includes(to) ?? false;

/** A visit that blocks the caregiver's time: accepted (waiting for payment) and confirmed visits. */
export const HOLDS_TIME: VisitStatus[] = ["accepted", "confirmed"];

export const MIN_HOURS = 1;
export const MAX_HOURS = 12;
export const REQUEST_ANSWER_HOURS = 48;
export const PAYMENT_WINDOW_HOURS = 24;

/** Malaysia time (UTC+8): visits are booked in the caregiver's local time. */
const MY_OFFSET = "+08:00";

export interface VisitInput { date: string; startTime: string; hours: number }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Start and end of a visit as timestamps (ms), or null if the date or time is not valid. */
export function visitWindow(v: VisitInput): { start: number; end: number } | null {
  if (!DATE_RE.test(v.date) || !TIME_RE.test(v.startTime)) return null;
  const start = Date.parse(`${v.date}T${v.startTime}:00${MY_OFFSET}`);
  if (Number.isNaN(start)) return null;
  return { start, end: start + v.hours * 3_600_000 };
}

export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

/** The price for a visit in sen (RM cents): hourly rate times hours. The server always works this out, never the client. */
export const priceSen = (rateSen: number, hours: number) => Math.round(rateSen) * hours;

/** Cleans and checks a new request. Returns an error message, or the clean values. */
export function checkRequest(body: any, now: number = Date.now()): string | { date: string; startTime: string; hours: number; note: string } {
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime.trim() : "";
  const hours = Number(body?.hours);
  if (!Number.isInteger(hours) || hours < MIN_HOURS || hours > MAX_HOURS) return `Choose between ${MIN_HOURS} and ${MAX_HOURS} whole hours.`;
  const w = visitWindow({ date, startTime, hours });
  if (!w) return "Enter the visit date and start time.";
  if (w.start <= now + 3_600_000) return "The visit must start at least one hour from now.";
  if (w.start > now + 120 * 86_400_000) return "Visits can be booked up to 120 days ahead.";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : "";
  return { date, startTime, hours, note };
}

/** True when a new visit would clash with any of the caregiver's visits that hold time. */
export function clashes(existing: (VisitInput & { status: VisitStatus; id?: string })[], candidate: VisitInput, ignoreId?: string): boolean {
  const c = visitWindow(candidate);
  if (!c) return false;
  return existing.some(e => {
    if (e.id && e.id === ignoreId) return false;
    if (!HOLDS_TIME.includes(e.status)) return false;
    const w = visitWindow(e);
    return !!w && overlaps(c, w);
  });
}

/** Has the visit started? A caregiver can only complete a visit that has started. */
export const hasStarted = (v: VisitInput, now: number = Date.now()) => {
  const w = visitWindow(v);
  return !!w && w.start <= now;
};

/** Should a request be expired now? Unanswered for 48 hours, or accepted but unpaid for 24 hours. */
export function isExpired(r: { status: VisitStatus; createdAt: string; acceptedAt?: string | null }, now: number = Date.now()): boolean {
  if (r.status === "requested") return Date.parse(r.createdAt) + REQUEST_ANSWER_HOURS * 3_600_000 < now;
  if (r.status === "accepted" && r.acceptedAt) return Date.parse(r.acceptedAt) + PAYMENT_WINDOW_HOURS * 3_600_000 < now;
  return false;
}
