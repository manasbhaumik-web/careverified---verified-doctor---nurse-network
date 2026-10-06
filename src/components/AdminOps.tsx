import React, { useEffect, useState } from 'react';
import { Siren } from 'lucide-react';

const post = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Admin operations: 24/7 roster coverage, SOS alerts, payments and refunds. */
export default function AdminOps() {
  const [coverage, setCoverage] = useState<any | null>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [payments, setPayments] = useState<any | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [c, e, p] = await Promise.all([
      fetch('/api/admin/coverage').then(r => r.json()),
      fetch('/api/admin/emergencies').then(r => r.json()),
      fetch('/api/admin/payments').then(r => r.json()),
    ]);
    if (c.status === 'success') setCoverage(c.data);
    if (e.status === 'success') setEmergencies(e.data);
    if (p.status === 'success') setPayments(p.data);
  };
  useEffect(() => { load().catch(() => setMsg('Could not load data.')); const t = setInterval(() => load().catch(() => {}), 15000); return () => clearInterval(t); }, []);

  const handle = async (id: string) => { await post(`/api/admin/emergencies/${id}/handle`); load(); };
  const refund = async (id: string) => {
    const reason = window.prompt('Reason for the refund?');
    if (!reason) return;
    const d = await post(`/api/payments/${id}/refund`, { reason });
    setMsg(d.status === 'success' ? 'Refunded.' : d.message || 'Refund failed.');
    load();
  };

  const gaps = coverage ? coverage.grid.flat().filter((n: number) => n === 0).length : 0;
  const openSos = emergencies.filter(e => e.status === 'open');

  return (
    <div className="space-y-6 text-slate-800">
      {msg && <p className="text-xs font-bold bg-slate-50 border border-slate-200 p-3">{msg}</p>}

      <section className={`border p-5 space-y-3 ${openSos.length ? 'bg-rose-50 border-rose-300' : 'bg-white border-[#FECDD3]'}`}>
        <h3 className="text-sm font-extrabold flex items-center gap-2"><Siren className="h-4 w-4 text-rose-600" /> SOS alerts ({openSos.length} open)</h3>
        {emergencies.length === 0 ? <p className="text-xs text-slate-500">No SOS alerts.</p> : (
          <ul className="space-y-2 text-xs">
            {emergencies.slice(0, 20).map(e => (
              <li key={e.id} className="bg-white border border-slate-200 p-3 flex flex-wrap justify-between gap-2">
                <span>
                  <b>{e.userName}</b> ({e.userEmail}) · {new Date(e.ts).toLocaleString()}
                  {e.lat != null && <> · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=15/${e.lat}/${e.lng}`}>location</a></>}
                  {e.note && <> · “{e.note}”</>}
                </span>
                {e.status === 'open' ? <button onClick={() => handle(e.id)} className="font-bold text-rose-700 cursor-pointer">Mark handled</button> : <span className="text-slate-400">handled</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-[#FECDD3] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">24/7 roster coverage</h3>
          {coverage && <p className="text-xs font-bold">{coverage.onlineNow} doctor(s) online now · {coverage.queued} waiting · {coverage.active} in consultation · <span className={gaps ? 'text-rose-700' : 'text-emerald-700'}>{gaps} uncovered hour(s) per week</span></p>}
        </div>
        {coverage && (
          <div className="overflow-x-auto">
            <table className="text-[10px] border-separate border-spacing-0.5">
              <thead><tr><th />{Array.from({ length: 24 }, (_, h) => <th key={h} className="font-semibold text-slate-500 w-6">{h}</th>)}</tr></thead>
              <tbody>
                {coverage.grid.map((row: number[], d: number) => (
                  <tr key={d}>
                    <th className="pr-2 text-right font-bold text-slate-600">{DAYS[d]}</th>
                    {row.map((n, h) => (
                      <td key={h} title={`${DAYS[d]} ${h}:00 — ${n} doctor(s)`}
                        className={`w-6 h-6 text-center font-bold ${n === 0 ? 'bg-rose-100 text-rose-700' : n === 1 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{n}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-slate-500 mt-2">Red = nobody rostered, amber = a single doctor, green = two or more.</p>
          </div>
        )}
      </section>

      <section className="bg-white border border-[#FECDD3] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">Payments</h3>
          {payments && <p className="text-xs font-bold">Mode: {payments.mode ?? 'not configured'} · Gross RM {payments.totals.gross.toFixed(2)} · Platform fee RM {payments.totals.platformFee.toFixed(2)}</p>}
        </div>
        {payments?.mode === 'sandbox' && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 font-semibold p-2">Test mode: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to take real payments.</p>}
        {payments && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[10px] uppercase text-slate-500"><th className="py-2 pr-3">When</th><th className="pr-3">Patient</th><th className="pr-3">For</th><th className="pr-3">Amount</th><th className="pr-3">Status</th><th /></tr></thead>
              <tbody>
                {payments.rows.slice(0, 50).map((p: any) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="pr-3">{p.patientName}</td>
                    <td className="pr-3">{p.description}</td>
                    <td className="pr-3 tabular-nums">RM {(p.amount_sen / 100).toFixed(2)}</td>
                    <td className="pr-3 font-bold">{p.status}{p.provider === 'sandbox' ? ' (test)' : ''}</td>
                    <td>{p.status === 'paid' && <button onClick={() => refund(p.id)} className="font-bold text-rose-700 cursor-pointer">Refund</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
