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

  return (
    <div className="space-y-6 max-w-5xl">
      <section className={`border p-5 flex flex-wrap items-center justify-between gap-4 ${me?.online ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#FECDD3]'}`}>
        <div>
          <h2 className="text-lg font-black flex items-center gap-2"><Radio className={`h-5 w-5 ${me?.online ? 'text-emerald-600' : 'text-slate-400'}`} /> {me?.online ? 'You are on call' : 'You are offline'}</h2>
          <p className="text-xs text-slate-600 mt-1">While online, patients waiting for an instant consultation appear below. Keep this page open.</p>
        </div>
        <button onClick={() => setOnline(!me?.online)} className={`px-6 py-3 text-sm font-extrabold cursor-pointer ${me?.online ? 'bg-white border border-slate-300 text-slate-800' : 'bg-[#DC2626] text-white'}`}>
          {me?.online ? 'Go offline' : 'Go online'}
        </button>
      </section>
      {msg && <p className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-3">{msg}</p>}

      {me?.online && (
        <section className="bg-white border border-[#FECDD3] p-5 space-y-3">
          <h3 className="text-sm font-extrabold">Waiting patients ({offers.length})</h3>
          {offers.length === 0 ? <p className="text-xs text-slate-500">Nobody is waiting right now.</p> : offers.map(o => (
            <div key={o.id} className="border border-slate-200 p-4 space-y-2">
              {o.redFlags.length > 0 && (
                <p className="text-xs font-black text-rose-700 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Red flags: {o.redFlags.join(', ')}</p>
              )}
              <p className="text-sm">{o.symptoms}</p>
              <p className="text-[11px] text-slate-500">{o.patientFirstName} · {o.mode} · waiting since {new Date(o.queuedAt).toLocaleTimeString()} · RM {o.fee.toFixed(2)}</p>
              <div className="flex gap-2">
                <button onClick={() => accept(o.id)} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-extrabold px-5 py-2 cursor-pointer">Accept</button>
                <button onClick={() => decline(o.id)} className="border border-slate-200 text-xs font-bold px-4 py-2 cursor-pointer">Not for me</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="bg-white border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold">On-call roster</h3>
          <button onClick={saveRoster} disabled={!rosterDirty} className="bg-[#DC2626] disabled:bg-slate-300 text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Save roster</button>
        </div>
        <p className="text-xs text-slate-600">Tick the hours you commit to be available. The board uses this to make sure every hour of the day is covered.</p>
        <div className="overflow-x-auto">
          <table className="text-[10px] border-separate border-spacing-0.5">
            <thead><tr><th />{Array.from({ length: 24 }, (_, h) => <th key={h} className="font-semibold text-slate-500 w-6">{h}</th>)}</tr></thead>
            <tbody>
              {DAYS.map((d, day) => (
                <tr key={d}>
                  <th className="pr-2 text-right font-bold text-slate-600">{d}</th>
                  {Array.from({ length: 24 }, (_, h) => {
                    const on = roster.has(`${day}-${h}`);
                    return (
                      <td key={h}>
                        <button onClick={() => toggleCell(day, h)} aria-pressed={on} aria-label={`${d} ${h}:00`}
                          className={`w-6 h-6 cursor-pointer ${on ? 'bg-[#DC2626]' : 'bg-slate-100 hover:bg-slate-200'}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {earnings && (
        <section className="bg-white border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-extrabold">Earnings</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Gross', earnings.totals.gross], [`Platform fee (${earnings.commissionPct}%)`, earnings.totals.fee], ['Net to you', earnings.totals.net]].map(([l, v]) => (
              <div key={l as string} className="bg-slate-50 border border-slate-100 p-3"><p className="text-[10px] uppercase font-bold text-slate-500">{l}</p><p className="text-lg font-black tabular-nums">RM {(v as number).toFixed(2)}</p></div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Payouts are not automated yet; the board settles earnings manually.</p>
          {earnings.rows.length > 0 && (
            <ul className="divide-y divide-slate-100 text-xs">
              {earnings.rows.slice(0, 10).map((r: any) => (
                <li key={r.id} className="py-2 flex justify-between gap-3">
                  <span>{r.description}{r.testMode ? ' (test)' : ''}</span>
                  <span className={`font-bold tabular-nums ${r.status === 'refunded' ? 'text-slate-400 line-through' : ''}`}>RM {r.net.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
