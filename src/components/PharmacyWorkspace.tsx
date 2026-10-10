import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, Download, Inbox, KeyRound, Pill, Search, ShieldAlert, StickyNote, Store, UserRound, Users } from 'lucide-react';
import DashboardHeader, { BannerKpis, FilterSelect, DashboardTab, bannerPrimaryBtn, bannerSecondaryBtn } from './DashboardHeader';
import { btnDanger, btnPlain, btnPrimary, fmtDate, fmtTime, jfetch } from './pharmacy/shared';
import { useLiveAlerts } from './pharmacy/useLiveAlerts';
import SecurityCard from './pharmacy/SecurityCard';
import TeamTab from './pharmacy/TeamTab';

type Tab = 'inbox' | 'activity' | 'reports' | 'team' | 'profile';
type Bucket = 'new' | 'in_progress' | 'ready' | 'cannot_fill' | 'dispensed' | 'closed';
type Fill = 'received' | 'preparing' | 'ready' | 'cannot_fill';

interface Counts { new: number; in_progress: number; ready: number; cannot_fill: number; dispensed: number; closed: number; waitingOver24h: number }
interface Me {
  pharmacy: { id: string; name: string; address: string; city: string | null; phone: string | null; hours: string | null; services: string[] };
  account: { name: string; email: string; mustChangePassword: boolean; isOwner: boolean; twoFactor: { enabled: boolean; required: boolean } };
  counts: Counts;
}
interface RxItem { name: string; strength?: string; form?: string; dose: string; frequency: string; durationDays: number; quantity: number; instructions?: string }
interface Rx {
  id: string; code: string; patientName: string; items: RxItem[]; notes: string | null; issuedAt: string; validUntil: string;
  status: string; bucket: Bucket; fillStatus: Fill | null; fillReason: string | null; fillUpdatedAt: string | null;
  sentAt: string | null; firstResponseAt: string | null; dispensedAt: string | null; assignedToMe: boolean; assignedElsewhere: boolean; note: string;
  prescriber: { name: string; licenseNumber: string; stillVerified: boolean } | null;
  cancelledReason: string | null;
  safety: { shared: false } | { shared: true; allergies: { name: string; detail: string | null; severity: string | null }[]; medicines: { name: string; detail: string | null }[]; doctorWarnings: { severity: string; type: string; message: string }[] };
}
interface EventRow { id: number; ts: string; type: string; code: string | null; actorName: string | null; detail: { reason?: string; name?: string; active?: boolean; on?: boolean } | null }
interface Report {
  days: number; received: number; dispensed: number; cannotFill: number; expiredUnfilled: number; fillRate: number | null;
  responseMinutes: { average: number | null; median: number | null; samples: number };
  dispenseMinutes: { average: number | null; median: number | null; samples: number };
  current: Counts; perDay: { date: string; received: number; dispensed: number }[]; topMedicines: { name: string; count: number }[];
}

const SERVICES = ['24 hours', 'Home delivery', 'Drive-through', 'Vaccinations', 'Online ordering'];
const ALL = 'all';
const BUCKET_LABEL: Record<Bucket, string> = { new: 'New', in_progress: 'In progress', ready: 'Ready', cannot_fill: "Can't fill", dispensed: 'Dispensed', closed: 'Expired / cancelled' };
const BUCKET_STYLE: Record<Bucket, string> = {
  new: 'text-[color:var(--t-700)] bg-[color:var(--t-50)] border-[color:var(--t-200)]',
  in_progress: 'text-amber-800 bg-amber-50 border-amber-200',
  ready: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  cannot_fill: 'text-rose-700 bg-rose-50 border-rose-200',
  dispensed: 'text-slate-700 bg-slate-100 border-slate-200',
  closed: 'text-slate-600 bg-slate-50 border-slate-200',
};

const fmtMin = (m: number | null) => (m === null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`);
const waiting = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
};

/** Pharmacy: inbox of prescriptions sent by patients, fill-status workflow, activity log, reports, team and own listing. */
export default function PharmacyWorkspace() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    const d = await jfetch('/api/pharmacy/me');
    if (d.status === 'success') { setMe(d.data); setError(''); } else setError(d.message || 'Could not load your workspace.');
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  const counts = me?.counts;
  // Pharmacy accounts must use two-factor sign-in where the server requires it; until then only set-up is available.
  const gated = !!me && me.account.twoFactor.required && !me.account.twoFactor.enabled;
  const alerts = useLiveAlerts({ newCount: gated ? undefined : counts?.new, refresh: loadMe });

  const tabs: DashboardTab<Tab>[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: counts ? counts.new : 0 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    ...(me?.account.isOwner ? [{ id: 'team' as const, label: 'Team', icon: Users }] : []),
    { id: 'profile', label: 'Pharmacy profile', icon: Store },
  ];

  if (error && !me) {
    return <div className="bg-white border border-rose-200 p-8 text-center text-sm font-semibold text-rose-700" role="alert">{error}</div>;
  }

  if (gated && me) {
    return (
      <div className="w-full space-y-5">
        <DashboardHeader icon={Store} eyebrow="Pharmacy workspace" title={me.pharmacy.name} description="One more step before you can open your inbox." />
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-4 flex items-center gap-3 text-sm font-semibold">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          Pharmacy accounts handle patients' health information, so two-factor sign-in is required. Set it up below to continue.
        </div>
        <SecurityCard twoFactor={me.account.twoFactor} email={me.account.email} onChanged={loadMe} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <DashboardHeader
        icon={Store}
        eyebrow="Pharmacy workspace"
        title={me?.pharmacy.name ?? 'Pharmacy workspace'}
        description={me ? `${me.pharmacy.address}${me.pharmacy.city && !me.pharmacy.address.toLowerCase().includes(me.pharmacy.city.toLowerCase()) ? `, ${me.pharmacy.city}` : ''}. Signed in as ${me.account.email}.` : 'Loading…'}
        actions={
          <BannerKpis items={[
            { value: counts ? counts.new : '—', label: 'New' },
            { value: counts ? counts.in_progress : '—', label: 'In progress' },
            { value: counts ? counts.ready : '—', label: 'Ready' },
            { value: counts ? counts.dispensed : '—', label: 'Dispensed' },
          ]} />
        }
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel="Pharmacy workspace sections"
      />

      {me?.account.mustChangePassword && (
        <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-4 flex flex-wrap items-center gap-3 text-sm">
          <KeyRound className="h-5 w-5 shrink-0" />
          <span className="flex-1 min-w-[220px] font-semibold">You are using a temporary password. Please set your own password now.</span>
          <button type="button" onClick={() => setTab('profile')} className={btnPlain}>Change password</button>
        </div>
      )}
      {counts && counts.waitingOver24h > 0 && (
        <div role="status" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 flex items-center gap-3 text-sm font-semibold">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {counts.waitingOver24h} prescription{counts.waitingOver24h === 1 ? ' has' : 's have'} been waiting over 24 hours without a response.
        </div>
      )}

      <div className="bg-white border border-[color:var(--t-200)] px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Live: new prescriptions appear automatically · updated {new Date(alerts.updatedAt).toLocaleTimeString()}</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
          <input type="checkbox" checked={alerts.sound} onChange={alerts.toggleSound} className="h-4 w-4 accent-[color:var(--t-600)]" /> Sound alert
        </label>
        {alerts.desktopSupported && (
          <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
            <input type="checkbox" checked={alerts.desktop} onChange={alerts.toggleDesktop} className="h-4 w-4 accent-[color:var(--t-600)]" /> Desktop alerts
          </label>
        )}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'inbox' && <InboxTab counts={counts} onChanged={loadMe} tick={alerts.tick} />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'team' && me?.account.isOwner && <TeamTab />}
        {tab === 'profile' && me && <ProfileTab me={me} onSaved={loadMe} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Inbox */

function InboxTab({ counts, onChanged, tick }: { counts?: Counts; onChanged: () => void; tick: number }) {
  const [list, setList] = useState<Rx[] | null>(null);
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Rx | null>(null);
  const [lookupMsg, setLookupMsg] = useState('');

  const load = useCallback(async () => {
    const d = await jfetch('/api/pharmacy/prescriptions');
    setList(d.status === 'success' ? d.data.items : []);
  }, []);
  useEffect(() => { load(); }, [load, tick]);

  const changed = () => { load(); onChanged(); };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupMsg(''); setFound(null);
    if (!code.trim()) return;
    const d = await jfetch('/api/pharmacy/lookup-code', 'POST', { code });
    if (d.status === 'success') setFound(d.data); else setLookupMsg(d.message || 'No valid prescription with that code.');
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list ?? []).filter(r => (filter === ALL || r.bucket === filter)
      && (q === '' || r.code.toLowerCase().includes(q) || r.patientName.toLowerCase().includes(q) || r.items.some(i => i.name.toLowerCase().includes(q))));
  }, [list, filter, query]);

  return (
    <div className="space-y-5">
      <section aria-label="Find a prescription" className="bg-white border border-[color:var(--t-200)] shadow-xs px-5 py-4 space-y-3">
        <form onSubmit={lookup} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[200px]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1">Look up a code (walk-in patient)</span>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. DCLHAS7GS3" maxLength={20} className="form-input w-full font-mono" />
          </label>
          <button type="submit" className={bannerPrimaryBtn}>Look up</button>
        </form>
        {lookupMsg && <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5">{lookupMsg}</p>}
        {found && <RxCard rx={found} onChanged={() => { setFound(null); setCode(''); changed(); }} />}
      </section>

      <section aria-label="Inbox filters" className="bg-white border border-[color:var(--t-200)] shadow-xs px-5 py-4 space-y-3">
        <div className="flex items-center gap-2.5 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 min-h-[44px] focus-within:border-[color:var(--t-600)]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <label htmlFor="inbox-search" className="sr-only">Search the inbox</label>
          <input id="inbox-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by code, patient or medicine"
            className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder-slate-500" />
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <FilterSelect label="Status" value={filter} onChange={setFilter}>
            <option value={ALL}>All ({list?.length ?? 0})</option>
            {(Object.keys(BUCKET_LABEL) as Bucket[]).map(b => <option key={b} value={b}>{BUCKET_LABEL[b]}{counts ? ` (${counts[b]})` : ''}</option>)}
          </FilterSelect>
          {(filter !== ALL || query) && (
            <button type="button" onClick={() => { setFilter(ALL); setQuery(''); }} className="min-h-[40px] px-3 text-[13px] font-bold text-[color:var(--t-700)] hover:underline cursor-pointer">Clear filters</button>
          )}
          <span className="ml-auto self-center text-[13px] text-slate-600 tabular-nums" aria-live="polite">{shown.length} result{shown.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      {list === null ? (
        <p className="text-sm text-slate-600">Loading your inbox…</p>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2">
          <Inbox className="h-10 w-10 text-[color:var(--t-200)] mx-auto" />
          <h2 className="text-sm font-extrabold">{list.length === 0 ? 'No prescriptions yet' : 'Nothing matches your filters'}</h2>
          <p className="text-[13px] text-slate-600">{list.length === 0 ? 'When a patient sends you a prescription it will appear here and you will be notified.' : 'Try a different status or search.'}</p>
        </div>
      ) : (
        <section aria-label="Prescriptions" className="grid gap-5 lg:grid-cols-2">
          {shown.map(r => <RxCard key={r.id} rx={r} onChanged={changed} />)}
        </section>
      )}
    </div>
  );
}

function RxCard({ rx, onChanged }: { rx: Rx; onChanged: () => void; key?: React.Key }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState(rx.note);
  const [confirming, setConfirming] = useState(false);
  const active = rx.status === 'active';

  const run = async (url: string, method: string, body?: unknown, done?: string) => {
    setBusy(true); setMsg(null);
    const d = await jfetch(url, method, body);
    setBusy(false);
    if (d.status === 'success') { setMsg({ ok: true, text: done ?? 'Saved.' }); setDeclining(false); setReason(''); setConfirming(false); onChanged(); }
    else setMsg({ ok: false, text: d.message || 'Could not save. Try again.' });
    return d;
  };
  const setStatus = (status: Fill) => run(`/api/pharmacy/prescriptions/${rx.id}/status`, 'POST', { status, reason }, 'Status updated. The patient was notified.');
  const dispense = () => run(`/api/pharmacy/prescriptions/${rx.id}/dispense`, 'POST', undefined, 'Recorded as dispensed.');
  const saveNote = async () => { const d = await run(`/api/pharmacy/prescriptions/${rx.id}/note`, 'PUT', { note }, 'Note saved.'); if (d.status === 'success') setNoting(false); };

  const overdue = rx.bucket === 'new' && rx.sentAt && Date.now() - Date.parse(rx.sentAt) > 86_400_000;

  return (
    <article className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-extrabold text-[color:var(--t-700)] tracking-wide">{rx.code}</p>
          <h3 className="text-[16px] font-bold text-[color:var(--ink)] flex items-center gap-1.5 [overflow-wrap:anywhere]"><UserRound className="h-4 w-4 shrink-0 text-[color:var(--t-600)]" />{rx.patientName}</h3>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 border ${BUCKET_STYLE[rx.bucket]}`}>{BUCKET_LABEL[rx.bucket]}{rx.bucket === 'in_progress' && rx.fillStatus ? ` · ${rx.fillStatus === 'received' ? 'Received' : 'Preparing'}` : ''}</span>
      </div>

      <ul className="space-y-1.5">
        {rx.items.map((i, k) => (
          <li key={k} className="text-[13px] text-slate-800 flex gap-2 [overflow-wrap:anywhere]">
            <Pill className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" />
            <span><strong>{i.name}</strong> {[i.strength, i.form].filter(Boolean).join(' ')} · {i.dose}, {i.frequency} for {i.durationDays} days · qty {i.quantity}{i.instructions ? ` · ${i.instructions}` : ''}</span>
          </li>
        ))}
      </ul>
      {rx.notes && <p className="text-xs text-slate-600 [overflow-wrap:anywhere]">Doctor's note: {rx.notes}</p>}

      <div className="text-[12px] text-slate-600 space-y-0.5">
        {rx.prescriber && <p className="[overflow-wrap:anywhere]">Prescribed by {rx.prescriber.name} ({rx.prescriber.licenseNumber}){!rx.prescriber.stillVerified && <strong className="text-rose-700"> · NOT currently verified</strong>}</p>}
        <p>Valid until {fmtDate(rx.validUntil)}{rx.sentAt && ` · sent ${fmtTime(rx.sentAt)}`}</p>
        {overdue && rx.sentAt && <p className="font-bold text-rose-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Waiting {waiting(rx.sentAt)} with no response</p>}
        {rx.fillStatus === 'cannot_fill' && rx.fillReason && <p className="font-semibold text-rose-700 [overflow-wrap:anywhere]">Could not fill: {rx.fillReason}</p>}
        {rx.dispensedAt && <p className="font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Dispensed {fmtTime(rx.dispensedAt)}</p>}
      </div>

      {rx.status === 'cancelled' && (
        <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 [overflow-wrap:anywhere]">
          Cancelled by the doctor{rx.cancelledReason ? `: ${rx.cancelledReason}` : ''}. Do not dispense.
        </p>
      )}

      {active && !rx.assignedElsewhere && (rx.safety.shared ? (
        <div className="border border-rose-200 bg-rose-50 p-3 space-y-1.5 text-xs text-slate-800">
          <p className="font-extrabold text-rose-800 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 shrink-0" /> Safety check, shared by the patient</p>
          <p className="[overflow-wrap:anywhere]"><b>Allergies:</b> {rx.safety.allergies.length ? rx.safety.allergies.map(a => `${a.name}${a.severity ? ` (${a.severity})` : ''}`).join(', ') : 'none recorded'}</p>
          <p className="[overflow-wrap:anywhere]"><b>Current medicines:</b> {rx.safety.medicines.length ? rx.safety.medicines.map(m => `${m.name}${m.detail ? ` ${m.detail}` : ''}`).join(', ') : 'none recorded'}</p>
          {rx.safety.doctorWarnings.length > 0 && (
            <ul className="list-disc ml-5 space-y-0.5">
              {rx.safety.doctorWarnings.map((w, i) => <li key={i} className="[overflow-wrap:anywhere]"><b>Doctor checked:</b> {w.message}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5">
          The patient has not shared their allergies or current medicines. Ask them at the counter before you dispense.
        </p>
      ))}

      {rx.assignedElsewhere && <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 p-2.5">This prescription was sent to a different pharmacy, so you cannot update or dispense it.</p>}

      {active && !rx.assignedElsewhere && (
        <div className="space-y-2 pt-2 border-t border-[color:var(--t-100)]">
          <div className="flex flex-wrap gap-2">
            {rx.assignedToMe && !rx.fillStatus && <button type="button" disabled={busy} onClick={() => setStatus('received')} className={btnPlain}>Mark received</button>}
            {rx.assignedToMe && rx.fillStatus !== 'preparing' && rx.fillStatus !== 'ready' && <button type="button" disabled={busy} onClick={() => setStatus('preparing')} className={btnPlain}>Preparing</button>}
            {rx.assignedToMe && rx.fillStatus !== 'ready' && <button type="button" disabled={busy} onClick={() => setStatus('ready')} className={btnPlain}>Ready for pickup</button>}
            {rx.assignedToMe && rx.fillStatus !== 'cannot_fill' && <button type="button" disabled={busy} onClick={() => setDeclining(v => !v)} className={btnDanger}>Can't fill</button>}
            <button type="button" disabled={busy} onClick={() => setConfirming(true)} className={btnPrimary}>Mark dispensed</button>
          </div>
          {confirming && (
            <div role="alertdialog" aria-label="Confirm dispensing" className="border border-[color:var(--t-600)] bg-[color:var(--t-50)] p-3 space-y-2">
              <p className="text-xs font-bold text-[color:var(--ink)] [overflow-wrap:anywhere]">Dispense {rx.code} to {rx.patientName}? This cannot be undone.</p>
              {!rx.safety.shared && <p className="text-[11px] font-semibold text-amber-800">Allergies and current medicines were not shared. Have you asked the patient?</p>}
              {rx.prescriber && !rx.prescriber.stillVerified && <p className="text-[11px] font-bold text-rose-700">The prescriber is not currently verified.</p>}
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={dispense} className={btnPrimary}>Yes, mark dispensed</button>
                <button type="button" onClick={() => setConfirming(false)} className={btnPlain}>Go back</button>
              </div>
            </div>
          )}
          {declining && (
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block" htmlFor={`reason-${rx.id}`}>Reason (the patient will see this)</label>
              <input id={`reason-${rx.id}`} value={reason} onChange={e => setReason(e.target.value)} maxLength={200} placeholder="e.g. Out of stock until Tuesday" className="form-input w-full" />
              <div className="flex gap-2">
                <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => setStatus('cannot_fill')} className={btnDanger}>Send to patient</button>
                <button type="button" onClick={() => setDeclining(false)} className={btnPlain}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {rx.assignedToMe && (
        <div className="space-y-2">
          {!noting ? (
            <button type="button" onClick={() => setNoting(true)} className="text-xs font-bold text-[color:var(--t-700)] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-left">
              <StickyNote className="h-3.5 w-3.5 shrink-0" /> {rx.note ? <span className="[overflow-wrap:anywhere]">Private note: {rx.note}</span> : 'Add a private note'}
            </button>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block" htmlFor={`note-${rx.id}`}>Private note (only your pharmacy sees this)</label>
              <textarea id={`note-${rx.id}`} value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500} className="form-input form-textarea w-full" />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={saveNote} className={btnPlain}>Save note</button>
                <button type="button" onClick={() => { setNoting(false); setNote(rx.note); }} className={btnPlain}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {msg && <p role="status" className={`text-xs font-bold p-2.5 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}
    </article>
  );
}

/* ------------------------------------------------------------------ Activity */

const who = (e: EventRow) => e.actorName ?? 'Your pharmacy';
const EVENT_TEXT: Record<string, (e: EventRow) => string> = {
  sent: e => `A patient sent you prescription ${e.code ?? ''}`,
  redirected: e => `A patient sent prescription ${e.code ?? ''} to a different pharmacy`,
  cancelled: e => `The doctor cancelled prescription ${e.code ?? ''}${e.detail?.reason ? `: ${e.detail.reason}` : ''}`,
  received: e => `${who(e)} marked ${e.code ?? 'a prescription'} as received`,
  preparing: e => `${who(e)} started preparing ${e.code ?? 'a prescription'}`,
  ready: e => `${who(e)} marked ${e.code ?? 'a prescription'} ready for pickup`,
  cannot_fill: e => `${who(e)} could not fill ${e.code ?? 'a prescription'}${e.detail?.reason ? `: ${e.detail.reason}` : ''}`,
  dispensed: e => `${who(e)} dispensed ${e.code ?? 'a prescription'}`,
  note: e => `${who(e)} added a note on ${e.code ?? 'a prescription'}`,
  lookup: e => `${who(e)} looked up ${e.code ?? 'a prescription'}`,
  profile_update: e => `${who(e)} updated the pharmacy details`,
  staff_added: e => `${who(e)} added a staff login${e.detail?.name ? ` for ${e.detail.name}` : ''}`,
  staff_status: e => `${who(e)} ${e.detail?.active ? 'enabled' : 'disabled'} the login of ${e.detail?.name ?? 'a colleague'}`,
  two_factor: e => `${who(e)} turned two-factor sign-in ${e.detail?.on ? 'on' : 'off'}`,
};

function ActivityTab() {
  const [items, setItems] = useState<EventRow[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    jfetch('/api/pharmacy/activity?limit=30').then(d => { setItems(d.status === 'success' ? d.data.items : []); setNext(d.status === 'success' ? d.data.next : null); });
  }, []);
  const more = async () => {
    if (next === null) return;
    setLoadingMore(true);
    const d = await jfetch(`/api/pharmacy/activity?limit=30&before=${next}`);
    if (d.status === 'success') { setItems(prev => [...(prev ?? []), ...d.data.items]); setNext(d.data.next); }
    setLoadingMore(false);
  };

  if (items === null) return <p className="text-sm text-slate-600">Loading activity…</p>;
  if (items.length === 0) {
    return (
      <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2">
        <Activity className="h-10 w-10 text-[color:var(--t-200)] mx-auto" />
        <h2 className="text-sm font-extrabold">No activity yet</h2>
        <p className="text-[13px] text-slate-600">Everything your pharmacy does here is recorded in this timeline.</p>
      </div>
    );
  }
  return (
    <section aria-label="Activity log" className="bg-white border border-[color:var(--t-200)] shadow-xs">
      <ol className="divide-y divide-[color:var(--t-100)]">
        {items.map(e => (
          <li key={e.id} className="px-5 py-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-sm text-slate-800 min-w-0 [overflow-wrap:anywhere]">{(EVENT_TEXT[e.type] ?? (() => e.type))(e)}</span>
            <time dateTime={e.ts} className="text-xs text-slate-500 tabular-nums">{fmtTime(e.ts)}</time>
          </li>
        ))}
      </ol>
      {next !== null && (
        <div className="p-4 border-t border-[color:var(--t-100)] text-center">
          <button type="button" onClick={more} disabled={loadingMore} className={btnPlain}>{loadingMore ? 'Loading…' : 'Load older activity'}</button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Reports */

function ReportsTab() {
  const [days, setDays] = useState('30');
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => {
    setR(null);
    jfetch(`/api/pharmacy/reports?days=${days}`).then(d => setR(d.status === 'success' ? d.data : null));
  }, [days]);

  const max = Math.max(1, ...(r?.perDay.map(d => Math.max(d.received, d.dispensed)) ?? [1]));
  const tile = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="bg-white border border-[color:var(--t-200)] shadow-xs p-4 min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="text-2xl font-extrabold text-[color:var(--t-700)] mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <section aria-label="Report period" className="bg-white border border-[color:var(--t-200)] shadow-xs px-5 py-4 flex flex-wrap items-end gap-4">
        <FilterSelect label="Period" value={days} onChange={setDays}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </FilterSelect>
        <a href={`/api/pharmacy/reports?days=${days}&format=csv`} className={`${bannerSecondaryBtn} ml-auto`}><Download className="h-4 w-4" /> Download CSV</a>
      </section>

      {!r ? <p className="text-sm text-slate-600">Loading report…</p> : (
        <>
          <section aria-label="Key figures" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {tile('Received', r.received, 'sent to you')}
            {tile('Dispensed', r.dispensed)}
            {tile("Couldn't fill", r.cannotFill)}
            {tile('Fill rate', r.fillRate === null ? '—' : `${r.fillRate}%`, 'of finished')}
            {tile('First response', fmtMin(r.responseMinutes.median), `median · avg ${fmtMin(r.responseMinutes.average)}`)}
            {tile('Time to dispense', fmtMin(r.dispenseMinutes.median), `median · avg ${fmtMin(r.dispenseMinutes.average)}`)}
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-label="Prescriptions per day" className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-extrabold">Prescriptions per day</h2>
                <p className="text-[11px] text-slate-600 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[color:var(--t-200)]" /> Received</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[color:var(--t-600)]" /> Dispensed</span>
                </p>
              </div>
              <div className="flex items-end gap-px h-40" role="img" aria-label={`Bar chart of prescriptions received and dispensed per day over the last ${r.days} days`}>
                {r.perDay.map(d => (
                  <div key={d.date} title={`${d.date}: ${d.received} received, ${d.dispensed} dispensed`} className="flex-1 min-w-0 h-full flex items-end gap-px">
                    <div className="flex-1 bg-[color:var(--t-200)]" style={{ height: `${(d.received / max) * 100}%`, minHeight: d.received ? 2 : 0 }} />
                    <div className="flex-1 bg-[color:var(--t-600)]" style={{ height: `${(d.dispensed / max) * 100}%`, minHeight: d.dispensed ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1.5"><span>{r.perDay[0]?.date}</span><span>{r.perDay[r.perDay.length - 1]?.date}</span></div>
            </section>

            <section aria-label="Most prescribed medicines" className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 min-w-0">
              <h2 className="text-sm font-extrabold mb-3">Most prescribed medicines</h2>
              {r.topMedicines.length === 0 ? <p className="text-[13px] text-slate-600">Nothing in this period yet.</p> : (
                <ol className="space-y-2">
                  {r.topMedicines.map(m => (
                    <li key={m.name} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="min-w-0 [overflow-wrap:anywhere] capitalize">{m.name}</span>
                      <span className="font-bold tabular-nums text-[color:var(--t-700)]">{m.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
          <p className="text-[12px] text-slate-500">Figures cover prescriptions patients sent to your pharmacy through MedCred. Response times run from the moment a patient sent the prescription to your first status update. Walk-in lookups are not counted as received.</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Profile */

function ProfileTab({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const p = me.pharmacy;
  const [address, setAddress] = useState(p.address);
  const [city, setCity] = useState(p.city ?? '');
  const [phone, setPhone] = useState(p.phone ?? '');
  const [hours, setHours] = useState(p.hours ?? '');
  const [services, setServices] = useState<string[]>(p.services);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const d = await jfetch('/api/pharmacy/me', 'PATCH', { address, city, phone, hours, services });
    setSaving(false);
    setMsg({ ok: d.status === 'success', text: d.status === 'success' ? 'Your listing was updated. Patients see the new details straight away.' : d.message || 'Could not save.' });
    if (d.status === 'success') onSaved();
  };
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    const d = await jfetch('/api/auth/change-password', 'POST', { currentPassword: cur, newPassword: nw });
    setPwMsg({ ok: d.status === 'success', text: d.message || (d.status === 'success' ? 'Password updated.' : 'Could not change the password.') });
    if (d.status === 'success') { setCur(''); setNw(''); onSaved(); }
  };

  const field = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1';
  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      <form onSubmit={save} className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 space-y-4 min-w-0">
        <div>
          <h2 className="text-sm font-extrabold">Your listing</h2>
          <p className="text-[12px] text-slate-600 mt-0.5">This is what patients see on the Pharmacies page. The pharmacy name can only be changed by the MedCred board.</p>
        </div>
        <p className="text-sm font-bold text-[color:var(--ink)] [overflow-wrap:anywhere]">{p.name}</p>
        <label className="block"><span className={field}>Address</span><input value={address} onChange={e => setAddress(e.target.value)} required maxLength={250} className="form-input w-full" /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className={field}>City</span><input value={city} onChange={e => setCity(e.target.value)} maxLength={60} className="form-input w-full" /></label>
          <label className="block"><span className={field}>Phone</span><input value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} className="form-input w-full" /></label>
        </div>
        <label className="block"><span className={field}>Opening hours</span><input value={hours} onChange={e => setHours(e.target.value)} maxLength={120} placeholder="e.g. Mon–Sat 9am–9pm" className="form-input w-full" /></label>
        <fieldset>
          <legend className={field}>Services</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SERVICES.map(s => (
              <label key={s} className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
                <input type="checkbox" checked={services.includes(s)} onChange={e => setServices(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))} className="h-4 w-4 accent-[color:var(--t-600)]" />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className={bannerPrimaryBtn}>{saving ? 'Saving…' : 'Save listing'}</button>
          {msg && <p role="status" className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
        </div>
      </form>

      <div className="space-y-5 min-w-0">
      <form onSubmit={changePw} className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 space-y-4 min-w-0">
        <div>
          <h2 className="text-sm font-extrabold flex items-center gap-2"><KeyRound className="h-4 w-4 text-[color:var(--t-600)]" /> Sign-in</h2>
          <p className="text-[12px] text-slate-600 mt-0.5 [overflow-wrap:anywhere]">Signed in as {me.account.email}. Changing your password signs you out of other devices.</p>
        </div>
        <label className="block"><span className={field}>Current password</span><input type="password" value={cur} onChange={e => setCur(e.target.value)} required autoComplete="current-password" className="form-input w-full" /></label>
        <label className="block"><span className={field}>New password</span><input type="password" value={nw} onChange={e => setNw(e.target.value)} required minLength={8} autoComplete="new-password" className="form-input w-full" />
          <span className="text-[11px] text-slate-500 mt-1 block">At least 8 characters, with letters and numbers.</span></label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={bannerPrimaryBtn}>Change password</button>
          {pwMsg && <p role="status" className={`text-xs font-bold ${pwMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{pwMsg.text}</p>}
        </div>
      </form>
      <SecurityCard twoFactor={me.account.twoFactor} email={me.account.email} onChanged={onSaved} />
      </div>
    </div>
  );
}
