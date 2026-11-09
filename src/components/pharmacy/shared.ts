/** Helpers and button styles shared by the pharmacy workspace screens. */

export const jfetch = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ status: 'error', message: 'Could not reach the server.' }));

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
export const fmtTime = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Card-level actions; page-level actions use the shared bannerPrimaryBtn / bannerSecondaryBtn from DashboardHeader.
export const btn = 'inline-flex items-center justify-center gap-1.5 font-semibold text-xs h-9 px-3.5 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const btnPlain = `${btn} bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 shadow-2xs`;
export const btnPrimary = `${btn} bg-[color:var(--t-600)] border border-[color:var(--t-700)] text-white hover:bg-[color:var(--t-700)] active:bg-[color:var(--t-800)] shadow-2xs`;
export const btnDanger = `${btn} bg-rose-50 border border-rose-300 text-rose-850 hover:bg-rose-100 hover:border-rose-400 active:bg-rose-200`;

export const fieldLabel = 'text-xs font-bold uppercase tracking-wide text-slate-700 block mb-1.5';
