import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Power, Radio, CheckCircle2 } from 'lucide-react';
import ConsultRoom from './ConsultRoom';
import { formatMoney } from '../locale';
import WorkspaceHeader from './WorkspaceHeader';
import { BannerBadge } from './DashboardHeader';

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Server days are 0..6 starting Monday

/** Doctor's console for 24/7 cover: go online, take instant consultations, manage the on-call roster, see earnings. */
export default function PractitionerOnCall({ myUserId, embedded = false }: { myUserId: string; embedded?: boolean }) {
  const [me, setMe] = useState<{ online: boolean; canGoOnline: boolean } | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [roster, setRoster] = useState<Set<string>>(new Set());
  const [rosterDirty, setRosterDirty] = useState(false);
  const [mobileDay, setMobileDay] = useState(0);
  const [earnings, setEarnings] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const onlineRef = useRef(false);

  const refresh = useCallback(async () => {
    const [p, o, m] = await Promise.all([
      fetch('/api/presence/me').then(r => r.json()),
      fetch('/api/consults/offers').then(r => r.json()),
      fetch('/api/consults/mine').then(r => r.json()),
    ]);
    if (p.status === 'success') { setMe(p.data); onlineRef.current = p.data.online; }
    if (o.status === 'success') setOffers(o.data);
    if (m.status === 'success') setMine(m.data);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    fetch('/api/roster').then(r => r.json()).then(d => d.status === 'success' && setRoster(new Set(d.data.map((c: any) => `${c.day}-${c.hour}`)))).catch(() => {});
    fetch('/api/me/earnings').then(r => r.json()).then(d => d.status === 'success' && setEarnings(d.data)).catch(() => {});
  }, [refresh]);

  // Poll for offers, and keep the "online" heartbeat alive while on call.
  useEffect(() => {
    const poll = setInterval(() => { refresh().catch(() => {}); }, 4000);
    const beat = setInterval(() => { if (onlineRef.current) jpost('/api/presence', { online: true }); }, 30_000);
    return () => { clearInterval(poll); clearInterval(beat); };
  }, [refresh]);

  const setOnline = async (online: boolean) => {
    setMsg('');
    const d = await jpost('/api/presence', { online });
    if (d.status !== 'success') setMsg(d.message || 'Could not change status.');
    await refresh();
  };

  const accept = async (id: string) => {
    setMsg('');
    const d = await jpost(`/api/consults/${id}/accept`);
    if (d.status !== 'success') setMsg(d.message || 'Could not accept.');
    await refresh();
  };
  const decline = async (id: string) => { await jpost(`/api/consults/${id}/decline`); await refresh(); };

  const toggleCell = (day: number, hour: number) => {
    setRoster(prev => { const n = new Set(prev); const k = `${day}-${hour}`; n.has(k) ? n.delete(k) : n.add(k); return n; });
    setRosterDirty(true);
  };
  const applyPreset = (kind: 'weekdays' | 'all' | 'clear') => {
    const n = new Set<string>();
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
      if (kind === 'all' || (kind === 'weekdays' && d < 5 && h >= 8 && h < 20)) n.add(`${d}-${h}`);
    }
    setRoster(n);
    setRosterDirty(true);
  };
  const saveRoster = async () => {
    const cells = [...roster].map(k => { const [day, hour] = k.split('-').map(Number); return { day, hour }; });
    const d = await fetch('/api/roster', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cells }) }).then(r => r.json());
    setMsg(d.status === 'success' ? 'Roster saved.' : d.message || 'Could not save the roster.');
    if (d.status === 'success') setRosterDirty(false);
  };

  const active = mine.find(c => c.status === 'active');
  if (active) return <ConsultRoom consultId={active.id} myUserId={myUserId} isDoctor onEnded={refresh} />;

  if (me && !me.canGoOnline) {
    return (
      <div className={embedded ? "space-y-6 w-full" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full"}>
        <WorkspaceHeader
          icon={Radio}
          eyebrow="On-Call Telehealth · Real-Time Radar"
          title="On-Call Duty Radar & Live Queue"
          description="Manage your active on-call shift status, accept live patient triage calls, and conduct urgent video consultations."
          badges={<BannerBadge tone="neutral">Verification Required</BannerBadge>}
        />
        <p className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold p-5 max-w-2xl">
          On-call consultations are available to verified doctors. Once the medical board verifies your profile you can go online here.
        </p>
      </div>
    );
  }

  const dayCount = (d: number) => Array.from({ length: 24 }, (_, h) => roster.has(`${d}-${h}`)).filter(Boolean).length;
  const coveredHours = Array.from({ length: 24 }, (_, h) => DAYS.some((_, d) => roster.has(`${d}-${h}`))).filter(Boolean).length;
  const fmtRM = (v?: number) => formatMoney(v ?? 0);

  return (
    <div className={embedded ? "space-y-6 w-full" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full"}>
      {/* Unified Institutional Inner Workspace Header with Telemetry Sub-bar */}
      <WorkspaceHeader
        icon={Radio}
        eyebrow="On-Call Telehealth · Real-Time Radar"
        title="On-Call Duty Radar & Live Queue"
        description="Manage your active on-call shift status, accept live patient triage calls, and conduct urgent video consultations."
        badges={
          <div className="flex items-center gap-1.5 flex-wrap">
            <BannerBadge tone={me?.online ? 'success' : 'neutral'}>
              <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${me?.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {me?.online ? 'On Call & Accepting Patients' : 'Currently Offline'}
            </BannerBadge>
            <BannerBadge tone="success">
              <CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" />
              MMC Compliant Shift
            </BannerBadge>
          </div>
        }
        aside={
          <button
            type="button"
            onClick={() => setOnline(!me?.online)}
            className={`h-9 px-4 text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap ${
              me?.online
                ? 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50'
                : 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)]'
            }`}
          >
            {me?.online ? (
              <>
                <Power className="h-3.5 w-3.5 text-rose-600" />
                <span>Go Offline</span>
              </>
            ) : (
              <>
                <Radio className="h-3.5 w-3.5 text-white animate-pulse" />
                <span>Go Online Now</span>
              </>
            )}
          </button>
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          {/* Left: Status Indicator & Headline */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              {me?.online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${me?.online ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-black text-[color:var(--ink)] tracking-tight whitespace-nowrap">
                  {me?.online ? 'On Call & Accepting Patients' : 'You are Currently Offline'}
                </span>
                <span className="hidden sm:inline text-xs text-slate-400">·</span>
                <span className="text-xs text-[color:var(--ink-2)] truncate">
                  {me?.online
                    ? 'Incoming consults dispatch automatically. Keep this tab open.'
                    : 'While online, you are dispatched incoming telehealth consults. Keep this tab open for audio chimes.'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Inline Telemetry Strip */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto sm:shrink-0">
            <dl className="grid grid-cols-2 w-full sm:w-auto sm:flex items-center divide-x divide-[color:var(--t-200)] border border-[color:var(--t-200)] bg-[color:var(--t-50)]/70 shadow-2xs">
              <div className="px-3 py-1.5 text-center min-w-[68px]">
                <dt className="text-xs uppercase font-bold text-slate-500 tracking-wider">Waiting</dt>
                <dd className="font-mono text-xs font-black text-[color:var(--ink)] leading-tight">
                  {me?.online ? String(offers.length) : '—'}
                </dd>
              </div>
              <div className="px-3 py-1.5 text-center min-w-[82px]">
                <dt className="text-xs uppercase font-bold text-slate-500 tracking-wider">Committed</dt>
                <dd className="font-mono text-xs font-black text-[color:var(--ink)] leading-tight">
                  {roster.size}h / wk
                </dd>
              </div>
              <div className="px-3 py-1.5 text-center min-w-[92px]">
                <dt className="text-xs uppercase font-bold text-slate-500 tracking-wider">Daily Window</dt>
                <dd className="font-mono text-xs font-black text-[color:var(--ink)] leading-tight">
                  {coveredHours} / 24 hrs
                </dd>
              </div>
              <div className="px-3 py-1.5 text-center min-w-[92px]">
                <dt className="text-xs uppercase font-bold text-slate-500 tracking-wider">Accrued Net</dt>
                <dd className="font-mono text-xs font-black text-[color:var(--t-700)] leading-tight">
                  {earnings ? fmtRM(earnings.totals.net) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </WorkspaceHeader>
      {msg && <p className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-3">{msg}</p>}

      {me?.online && (
        <section className="bg-white border border-[color:var(--t-200)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[color:var(--ink)] flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Consultation Queue ({offers.length} waiting)
            </h3>
            <span className="text-xs font-mono text-slate-500 font-semibold">Auto-refreshes every 4s</span>
          </div>
          {offers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[color:var(--t-200)] bg-[color:var(--t-bg)]">
              <p className="text-sm font-bold text-slate-700">No patients waiting in queue right now.</p>
              <p className="text-xs text-slate-500 mt-1">Keep this tab open; newly queued consults will alert immediately.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.map(o => (
                <div key={o.id} className="border-2 border-[color:var(--t-600)] bg-white p-5 space-y-3 shadow-xs">
                  {o.redFlags.length > 0 && (
                    <p className="text-xs font-extrabold text-rose-800 bg-rose-50 border border-rose-200 p-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" /> Red Flags: {o.redFlags.join(', ')}</p>
                  )}
                  <p className="text-xs font-semibold text-[color:var(--ink)] leading-snug line-clamp-3">"{o.symptoms}"</p>
                  <div className="text-xs font-mono text-slate-600 border-t border-[color:var(--t-100)] pt-2 space-y-0.5">
                    <p><b className="text-[color:var(--ink)]">{o.patientFirstName}</b> · {o.mode.toUpperCase()}</p>
                    <p>Queued: {new Date(o.queuedAt).toLocaleTimeString()} · Payout: <b className="text-[color:var(--t-700)]">{formatMoney(o.fee)}</b></p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={() => accept(o.id)} className="h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer transition-colors shadow-2xs">Accept Consult</button>
                    <button onClick={() => decline(o.id)} className="h-10 border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        <section className="bg-white border border-slate-200 p-5 space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold">On-call roster</h3>
              <p className="text-xs text-slate-600 mt-1">Tick the hours you commit to be available. The board uses this to make sure every hour of the day is covered.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button onClick={() => applyPreset('weekdays')} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer hover:bg-slate-50">Weekdays 08–20</button>
              <button onClick={() => applyPreset('all')} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer hover:bg-slate-50">24/7</button>
              <button onClick={() => applyPreset('clear')} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer hover:bg-slate-50">Clear</button>
              <button onClick={saveRoster} disabled={!rosterDirty} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-5 py-2 cursor-pointer">Save roster</button>
            </div>
          </div>

          {/* Phones: one day at a time with large hour buttons */}
          <div className="sm:hidden space-y-3">
            <div role="tablist" aria-label="Day of the week" className="grid grid-cols-7 gap-1">
              {DAYS.map((d, day) => (
                <button key={d} role="tab" aria-selected={mobileDay === day} onClick={() => setMobileDay(day)}
                  className={`h-12 flex flex-col items-center justify-center text-xs font-bold border cursor-pointer ${mobileDay === day ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-600)]' : 'bg-white text-slate-700 border-slate-200'}`}>
                  <span>{d.slice(0, 3)}</span><span className="tabular-nums opacity-80">{dayCount(day)}h</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 24 }, (_, h) => {
                const on = roster.has(`${mobileDay}-${h}`);
                return (
                  <button key={h} onClick={() => toggleCell(mobileDay, h)} aria-pressed={on} aria-label={`${DAYS[mobileDay]} ${h}:00`}
                    className={`h-12 text-xs font-bold tabular-nums cursor-pointer border ${on ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-600)]' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                    {String(h).padStart(2, '0')}:00
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <div className="min-w-[640px] grid gap-[3px] items-center" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr)) auto' }}>
              <span />
              {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-xs font-semibold text-slate-500 text-center">{h}</span>)}
              <span className="text-xs font-semibold text-slate-500 pl-2">Hrs</span>
              {DAYS.map((d, day) => (
                <React.Fragment key={d}>
                  <span className="pr-2 text-right text-xs font-bold text-slate-600">{d}</span>
                  {Array.from({ length: 24 }, (_, h) => {
                    const on = roster.has(`${day}-${h}`);
                    return (
                      <button key={h} onClick={() => toggleCell(day, h)} aria-pressed={on} aria-label={`${d} ${h}:00`}
                        className={`h-8 w-full cursor-pointer ${on ? 'bg-[color:var(--t-600)]' : 'bg-slate-100 hover:bg-slate-200'}`} />
                    );
                  })}
                  <span className="pl-2 text-xs font-bold text-slate-600 tabular-nums">{dayCount(day)}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 bg-[color:var(--t-600)]" /> On call</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 bg-slate-100 border border-slate-200" /> Not scheduled</span>
            {rosterDirty && <span className="font-bold text-amber-700">Unsaved changes</span>}
          </div>
        </section>

        {earnings && (
          <section className="bg-white border border-slate-200 p-5 space-y-4 min-w-0">
            <h3 className="text-sm font-extrabold">Earnings</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Gross', earnings.totals.gross], [`Fee (${earnings.commissionPct}%)`, earnings.totals.fee], ['Net', earnings.totals.net]].map(([l, v]) => (
                <div key={l as string} className="bg-slate-50 border border-slate-100 p-2.5"><p className="text-xs uppercase font-bold text-slate-500">{l}</p><p className="text-xs font-black tabular-nums">{fmtRM(v as number)}</p></div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Payouts are not automated yet; the board settles earnings manually.</p>
            {earnings.rows.length > 0 ? (
              <ul className="divide-y divide-slate-100 text-xs">
                {earnings.rows.slice(0, 10).map((r: any) => (
                  <li key={r.id} className="py-2 flex justify-between gap-3">
                    <span>{r.description}{r.testMode ? ' (test)' : ''}</span>
                    <span className={`font-bold tabular-nums ${r.status === 'refunded' ? 'text-slate-400 line-through' : ''}`}>{formatMoney(r.net)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-500">No earnings yet.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
