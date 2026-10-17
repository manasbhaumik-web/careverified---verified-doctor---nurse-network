import { useSyncExternalStore } from 'react';

// A very small client-side router: the app has a few real URLs (/ and /login) and everything else lives in state.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());
if (typeof window !== 'undefined') window.addEventListener('popstate', notify);

export function navigate(to: string, opts: { replace?: boolean; scrollTop?: boolean } = {}) {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname + window.location.search;
  if (to !== current) {
    if (opts.replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    notify();
  }
  if (opts.scrollTop !== false) window.scrollTo({ top: 0 });
}

/** Current path and query string, e.g. "/login?role=practitioner". Re-renders on navigate() and the back button. */
export function useLocation() {
  const full = useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => window.location.pathname + window.location.search,
    () => '/',
  );
  const q = full.indexOf('?');
  const path = (q < 0 ? full : full.slice(0, q)).replace(/\/+$/, '') || '/';
  return { path, params: new URLSearchParams(q < 0 ? '' : full.slice(q)) };
}

export type PortalRole = 'patient' | 'practitioner' | 'admin' | 'pharmacy' | 'facility';

/** URL of the sign-in page for a role. */
export const loginUrl = (role: PortalRole = 'patient', register = false) =>
  `/login?role=${role}${register ? '&register=1' : ''}`;
