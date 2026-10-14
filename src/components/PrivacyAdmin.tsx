import React, { useCallback, useEffect, useState } from 'react';
import { formatDateTime, formatDate } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const BASIS_LABEL: Record<string, string> = {
  malaysia: 'In Malaysia (no transfer)', similar_law_tia: 'Destination has similar law + TIA', adequate_protection_tia: 'Adequate protection + TIA',
  consent: 'Explicit consent (s.129(3))', contract_necessity: 'Contract necessity (s.129(3))', other_129_3: 'Other s.129(3) exception',
};
const input = 'border border-slate-300 p-1.5 text-xs';
const h3 = 'text-xs font-black uppercase tracking-wide text-slate-700 mb-2';

/** Admin tools behind the privacy notice: transfer register, erasure, retention and the breach register. */
export default function PrivacyAdmin({ onMessage }: { onMessage: (m: string) => void }) {
  const [proc, setProc] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [breaches, setBreaches] = useState<any>(null);
  const [form, setForm] = useState({ name: '', purpose: '', country: '', basis: '', tiaDate: '' });
  const [breach, setBreach] = useState({ summary: '', dataTypes: '', affectedCount: '', severity: 'unknown' });

  const load = useCallback(async () => {
    const [p, r, b] = await Promise.all([jget('/api/admin/processors'), jget('/api/admin/retention'), jget('/api/admin/breaches')]);
    if (p.status === 'success') setProc(p.data);
    if (r.status === 'success') setRetention(r.data);
    if (b.status === 'success') setBreaches(b.data);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const say = (d: any, ok = 'Saved.') => { onMessage(d.status === 'success' ? d.message || ok : d.message); load(); };

  const addProcessor = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jsend('POST', '/api/admin/processors', { ...form, basis: form.basis || undefined, tiaDate: form.tiaDate || undefined });
    if (d.status === 'success') setForm({ name: '', purpose: '', country: '', basis: '', tiaDate: '' });
    say(d);
  };
  const purge = async () => {
    if (!confirm('Permanently delete retained clinical records of erased patients past the retention period? This cannot be undone.')) return;
    say(await jsend('POST', '/api/admin/retention/purge', { confirm: true }));
  };
  const logBreach = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jsend('POST', '/api/admin/breaches', { ...breach, affectedCount: breach.affectedCount === '' ? undefined : Number(breach.affectedCount) });
    if (d.status === 'success') setBreach({ summary: '', dataTypes: '', affectedCount: '', severity: 'unknown' });
    say(d, 'Incident logged. The notification clock has started.');
  };
  const updateBreach = async (id: string, body: any) => say(await jsend('POST', `/api/admin/breaches/${id}/update`, body));
  const closeBreach = async (b: any) => {
    const body: any = { status: 'closed' };
    if (!b.commissionerNotifiedAt) {
      const reason = prompt('The Commissioner was not notified. Why was notification not needed?');
      if (!reason) return;
      body.noNotificationReason = reason;
    }
    updateBreach(b.id, body);
  };

  return (
    <>
      <section>
        <h3 className={h3}>Data transfers and processors</h3>
        {proc?.problems?.length > 0 && <ul className="text-xs bg-rose-50 border border-rose-200 text-rose-900 p-2 mb-2 list-disc pl-5">{proc.problems.map((p: string) => <li key={p}>{p}</li>)}</ul>}
        <ul className="space-y-1 mb-2">
          {proc?.processors.map((p: any) => (
            <li key={p.id} className="border border-slate-200 p-2 text-xs flex justify-between gap-2">
              <span><b>{p.name}</b> · {p.purpose} · {p.country} · {BASIS_LABEL[p.basis] ?? 'no basis'}{p.tiaDate ? ` · TIA ${p.tiaDate}` : ''}</span>
              <button onClick={async () => { if (confirm(`Remove ${p.name}?`)) say(await jsend('DELETE', `/api/admin/processors/${p.id}`)); }} className="text-rose-700 font-bold cursor-pointer">Remove</button>
            </li>
          ))}
        </ul>
        <form onSubmit={addProcessor} className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Name (e.g. hosting provider)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className={input} placeholder="Purpose" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} required />
          <input className={input} placeholder="Country code (MY, SG…)" maxLength={2} value={form.country} onChange={e => setForm({ ...form, country: e.target.value.toUpperCase() })} required />
          <select className={input} value={form.basis} onChange={e => setForm({ ...form, basis: e.target.value })}>
            <option value="">Transfer basis…</option>
            {proc?.bases.map((b: string) => <option key={b} value={b}>{BASIS_LABEL[b] ?? b}</option>)}
          </select>
          <label className="text-xs col-span-2 flex items-center gap-2">TIA date (if applicable) <input type="date" className={input} value={form.tiaDate} onChange={e => setForm({ ...form, tiaDate: e.target.value })} /></label>
          <button className="col-span-2 bg-[color:var(--t-600)] text-white text-xs font-bold py-2 cursor-pointer">Add to register</button>
        </form>
      </section>

      <section>
        <h3 className={h3}>Retention and erasure</h3>
        {retention && (
          <div className="text-xs space-y-1.5">
            <p className={retention.confirmed ? '' : 'bg-amber-50 border border-amber-200 text-amber-900 p-2 font-semibold'}>{retention.note}</p>
            <p>Period: <b>{retention.years} years</b> · erased patients eligible for purge: <b>{retention.eligibleForPurge}</b> · erasure requests waiting: <b>{retention.pendingErasureRequests}</b></p>
            <button onClick={purge} disabled={!retention.confirmed || retention.eligibleForPurge === 0} className="border border-rose-300 text-rose-800 font-bold px-3 py-1.5 disabled:opacity-40 cursor-pointer">Purge records past retention</button>
            <p className="text-slate-500">Erase a patient from the Data requests list above (deletion or withdrawal requests): it shows exactly what will be removed and kept before you confirm.</p>
          </div>
        )}
      </section>

      <section>
        <h3 className={h3}>Breach register</h3>
        <p className="text-xs text-slate-600 mb-2">{breaches?.targets.note}</p>
        <form onSubmit={logBreach} className="grid grid-cols-2 gap-2 mb-3">
          <textarea className={`${input} col-span-2`} rows={2} placeholder="What happened, and when did we learn of it?" value={breach.summary} onChange={e => setBreach({ ...breach, summary: e.target.value })} required minLength={10} />
          <input className={input} placeholder="Data involved (e.g. IC numbers, health records)" value={breach.dataTypes} onChange={e => setBreach({ ...breach, dataTypes: e.target.value })} />
          <input className={input} placeholder="People affected (number)" type="number" min={0} value={breach.affectedCount} onChange={e => setBreach({ ...breach, affectedCount: e.target.value })} />
          <select className={input} value={breach.severity} onChange={e => setBreach({ ...breach, severity: e.target.value })}>
            {['unknown', 'low', 'medium', 'high'].map(s => <option key={s} value={s}>Severity: {s}</option>)}
          </select>
          <button className="bg-rose-700 text-white text-xs font-bold py-2 cursor-pointer">Log incident (starts the clock)</button>
        </form>
        <ul className="space-y-1.5">
          {breaches?.incidents.map((b: any) => (
            <li key={b.id} className={`border p-2 text-xs space-y-1 ${b.commissionerOverdue || b.subjectsOverdue ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}>
              <p><b>{b.status.toUpperCase()}</b> · {b.severity} · detected {formatDateTime(b.detectedAt)} · {b.summary}</p>
              <p>Commissioner: {b.commissionerNotifiedAt ? `notified ${formatDate(b.commissionerNotifiedAt)}` : <span className={b.commissionerOverdue ? 'text-rose-700 font-bold' : ''}>due {formatDateTime(b.commissionerDueAt)}{b.commissionerOverdue ? ' (OVERDUE)' : ''}</span>}
                {' · '}Individuals: {b.subjectsRequired === null ? 'not assessed' : b.subjectsRequired ? (b.subjectsNotifiedAt ? `notified ${formatDate(b.subjectsNotifiedAt)}` : `due ${formatDateTime(b.subjectsDueAt)}${b.subjectsOverdue ? ' (OVERDUE)' : ''}`) : 'not required'}</p>
              {b.status !== 'closed' && (
                <div className="flex flex-wrap gap-3 font-bold">
                  {!b.commissionerNotifiedAt && <button onClick={() => updateBreach(b.id, { commissionerNotified: true })} className="text-[color:var(--t-700)] cursor-pointer">Mark Commissioner notified</button>}
                  {b.subjectsRequired === null && <>
                    <button onClick={() => updateBreach(b.id, { subjectsRequired: true })} className="cursor-pointer">Significant harm likely: individuals must be told</button>
                    <button onClick={() => updateBreach(b.id, { subjectsRequired: false })} className="cursor-pointer">No significant harm</button>
                  </>}
                  {b.subjectsRequired === true && !b.subjectsNotifiedAt && <button onClick={() => updateBreach(b.id, { subjectsNotified: true })} className="text-[color:var(--t-700)] cursor-pointer">Mark individuals notified</button>}
                  {b.status === 'open' && <button onClick={() => updateBreach(b.id, { status: 'contained' })} className="cursor-pointer">Mark contained</button>}
                  <button onClick={() => closeBreach(b)} className="text-rose-700 cursor-pointer">Close</button>
                </div>
              )}
            </li>
          ))}
          {breaches?.incidents.length === 0 && <li className="text-xs text-slate-500">No incidents logged.</li>}
        </ul>
      </section>
    </>
  );
}
