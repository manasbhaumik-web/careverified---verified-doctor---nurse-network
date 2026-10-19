import { useEffect, useState } from 'react';

/**
 * How many doctors are online right now, from the server. One shared poll feeds every place that shows it
 * (the navbar chip, the consult room header and the consult form), so they can never disagree.
 */
export interface OnCallStatus { onlineDoctors: number; consultFee: number }

const POLL_MS = 20_000;
let cache: OnCallStatus | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(s: OnCallStatus | null) => void>();

export async function refreshOnCallStatus(): Promise<void> {
  try {
    const r = await fetch('/api/on-call/status').then(x => x.json());
    if (r.status === 'success') {
      cache = { onlineDoctors: Number(r.data.onlineDoctors) || 0, consultFee: Number(r.data.consultFee) || 0 };
      subscribers.forEach(f => f(cache));
    }
  } catch { /* keep the last known value; the next poll tries again */ }
}

/** `null` until the first answer arrives, so callers do not claim "no doctors" before they know. */
export function useOnCallStatus(): OnCallStatus | null {
  const [status, setStatus] = useState<OnCallStatus | null>(cache);
  useEffect(() => {
    subscribers.add(setStatus);
    if (subscribers.size === 1) timer = setInterval(() => { void refreshOnCallStatus(); }, POLL_MS);
    void refreshOnCallStatus();
    return () => {
      subscribers.delete(setStatus);
      if (subscribers.size === 0 && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return status;
}

/** "3 doctors online now" / "No doctor online right now" */
export function onCallLabel(s: OnCallStatus | null): string {
  if (!s) return 'Checking doctors online…';
  if (s.onlineDoctors === 0) return 'No doctor online right now';
  return `${s.onlineDoctors} doctor${s.onlineDoctors === 1 ? '' : 's'} online now`;
}
