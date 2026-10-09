import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Radio } from 'lucide-react';
import ConsultRoom from './ConsultRoom';

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Server days are 0..6 starting Monday

/** Doctor's console for 24/7 cover: go online, take instant consultations, manage the on-call roster, see earnings. */
export default function PractitionerOnCall({ myUserId }: { myUserId: string }) {
  const [me, setMe] = useState<{ online: boolean; canGoOnline: boolean } | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [roster, setRoster] = useState<Set<string>>(new Set());
  const [rosterDirty, setRosterDirty] = useState(false);
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
    return <p className="bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold p-5 max-w-2xl">
      On-call consultations are available to verified doctors. Once the medical board verifies your profile you can go online here.
    </p>;
  }

  const dayCount = (d: number) => Array.from({ length: 24 }, (_, h) => roster.has(`${d}-${h}`)).filter(Boolean).length;
  const coveredHours = Array.from({ length: 24 }, (_, h) => DAYS.some((_, d) => roster.has(`${d}-${h}`))).filter(Boolean).length;
  const fmtRM = (v?: number) => `RM ${(v ?? 0).toFixed(2)}`;

  return (
    <div className="space-y-5 w-full">
      {/* Status bar with at-a-glance numbers */}
      <section className={`border p-5 grid gap-5 lg:grid-cols-[1fr_auto] items-center ${me?.online ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[color:var(--t-200)]'}`}>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="min-w-[260px] max-w-md">
            <h2 className="text-lg font-black flex items-center gap-2"><Radio className={`h-5 w-5 ${me?.online ? 'text-emerald-600' : 'text-slate-400'}`} /> {me?.online ? 'You are on call' : 'You are offline'}</h2>
            <p className="text-xs text-slate-600 mt-1">While online, patients waiting for an instant consultation appear below. Keep this page open.</p>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              ['Waiting now', me?.online ? String(offers.length) : '—'],
              ['Roster hours / week', String(roster.size)],
              ['Hours of day covered', `${coveredHours} / 24`],
              ['Net earnings', earnings ? fmtRM(earnings.totals.net) : '—'],
            ].map(([l, v]) => (
              <div key={l}><dt className="text-[10px] uppercase font-bold text-slate-500">{l}</dt><dd className="text-lg font-black tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </div>
        <button onClick={() => setOnline(!me?.online)} className={`px-8 py-3 text-sm font-extrabold cursor-pointer ${me?.online ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[color:var(--t-600)] text-white'}`}>
          {me?.online ? 'Go offline' : 'Go online'}
        </button>
      </section>
      {msg && <p className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-3">{msg}</p>}

      {me?.online && (
        <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
          <h3 className="text-sm font-extrabold">Waiting patients ({offers.length})</h3>
          {offers.length === 0 ? <p className="text-xs text-slate-500">Nobody is waiting right now.</p> : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {offers.map(o => (
                <div key={o.id} className="border border-slate-200 p-4 space-y-2">
                  {o.redFlags.length > 0 && (
                    <p className="text-xs font-black text-rose-700 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Red flags: {o.redFlags.join(', ')}</p>
                  )}
                  <p className="text-sm">{o.symptoms}</p>
                  <p className="text-[11px] text-slate-500">{o.patientFirstName} · {o.mode} · waiting since {new Date(o.queuedAt).toLocaleTimeString()} · RM {o.fee.toFixed(2)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => accept(o.id)} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-5 py-2 cursor-pointer">Accept</button>
                    <button onClick={() => decline(o.id)} className="border border-slate-200 text-xs font-bold px-4 py-2 cursor-pointer">Not for me</button>
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
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => applyPreset('weekdays')} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer hover:bg-slate-50">Weekdays 08–20</button>
              <button onClick={() => applyPreset('all')} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer hover:bg-slate-50">24/7</button>
              <button onClick={() => applyPreset('clear')} className="border border-slate-200 text-xs font-bold px-3 py-2 cursor-pointer hover:bg-slate-50">Clear</button>
              <button onClick={saveRoster} disabled={!rosterDirty} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-5 py-2 cursor-pointer">Save roster</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[640px] grid gap-[3px] items-center" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr)) auto' }}>
              <span />
              {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-[10px] font-semibold text-slate-500 text-center">{h}</span>)}
              <span className="text-[10px] font-semibold text-slate-500 pl-2">Hrs</span>
              {DAYS.map((d, day) => (
                <React.Fragment key={d}>
                  <span className="pr-2 text-right text-[11px] font-bold text-slate-600">{d}</span>
                  {Array.from({ length: 24 }, (_, h) => {
                    const on = roster.has(`${day}-${h}`);
                    return (
                      <button key={h} onClick={() => toggleCell(day, h)} aria-pressed={on} aria-label={`${d} ${h}:00`}
                        className={`h-8 w-full cursor-pointer ${on ? 'bg-[color:var(--t-600)]' : 'bg-slate-100 hover:bg-slate-200'}`} />
                    );
                  })}
                  <span className="pl-2 text-[11px] font-bold text-slate-600 tabular-nums">{dayCount(day)}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
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
                <div key={l as string} className="bg-slate-50 border border-slate-100 p-2.5"><p className="text-[10px] uppercase font-bold text-slate-500">{l}</p><p className="text-sm font-black tabular-nums">{fmtRM(v as number)}</p></div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">Payouts are not automated yet; the board settles earnings manually.</p>
            {earnings.rows.length > 0 ? (
              <ul className="divide-y divide-slate-100 text-xs">
                {earnings.rows.slice(0, 10).map((r: any) => (
                  <li key={r.id} className="py-2 flex justify-between gap-3">
                    <span>{r.description}{r.testMode ? ' (test)' : ''}</span>
                    <span className={`font-bold tabular-nums ${r.status === 'refunded' ? 'text-slate-400 line-through' : ''}`}>RM {r.net.toFixed(2)}</span>
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
