/** Helpers and button styles shared by the pharmacy workspace screens. */

export const jfetch = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ status: 'error', message: 'Could not reach the server.' }));

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
export const fmtTime = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Card-level actions; page-level actions use the shared bannerPrimaryBtn / bannerSecondaryBtn from DashboardHeader.
export const btn = 'min-h-[36px] px-3 text-xs border cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPlain = `${btn} font-bold bg-white border-[color:var(--t-200)] text-[color:var(--t-600)] hover:bg-[color:var(--t-50)]`;
export const btnPrimary = `${btn} font-extrabold bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white hover:bg-[color:var(--t-700)]`;
export const btnDanger = `${btn} font-bold bg-white border-rose-200 text-rose-700 hover:bg-rose-50`;

export const fieldLabel = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1';
