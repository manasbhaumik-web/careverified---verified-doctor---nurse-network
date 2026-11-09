/** Helpers and button styles shared by the pharmacy workspace screens. */

export const jfetch = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ status: 'error', message: 'Could not reach the server.' }));

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
export const fmtTime = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Card-level actions; page-level actions use the shared bannerPrimaryBtn / bannerSecondaryBtn from DashboardHeader.
export const btn = 'btn btn-md';
export const btnPlain = 'btn btn-md btn-secondary';
export const btnPrimary = 'btn btn-md btn-primary';
export const btnDanger = 'btn btn-md btn-danger';

export const fieldLabel = 'form-label';
