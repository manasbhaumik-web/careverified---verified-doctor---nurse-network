/** Helpers and button styles shared by the pharmacy workspace screens. */

export const jfetch = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ status: 'error', message: 'Could not reach the server.' }));

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
export const fmtTime = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Card-level actions; page-level actions use the shared bannerPrimaryBtn / bannerSecondaryBtn from DashboardHeader.
export const btn = 'h-10 px-4 text-xs font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5';
export const btnPlain = `${btn} bg-white border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-slate-400 active:bg-slate-200`;
export const btnPrimary = `${btn} bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white hover:bg-[color:var(--dark)] active:bg-slate-900 shadow-none`;
export const btnDanger = `${btn} bg-white border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 active:bg-rose-100`;

export const fieldLabel = 'text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5';

