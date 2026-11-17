import React, { useCallback, useEffect, useState } from 'react';
import { useTr } from '../../locale';

interface FeeLine { kind: 'booking' | 'consult' | 'care'; model: string; flatMyr: number; percent: number; enabled: boolean; payer: string; updatedAt: string; updatedBy: string | null; reason: string | null }
interface Data { schedule: FeeLine[]; platformFeeTaxPct: number; professionalsKeepFull: boolean; history: { kind: string; model: string; flatMyr: number; percent: number; enabled: boolean; changedAt: string; reason: string | null }[] }

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const KIND_LABEL: Record<string, string> = { consult: 'Instant consultations', booking: 'Booked appointments', care: 'Home care visits' };

/**
 * Platform fees per kind of payment. The platform's own fee is charged to the patient and shown as its own line; the professional is paid
 * in full. The old model (a share of the professional's fee) can no longer be chosen. Each change needs a reason and is kept in the history.
 */
export default function AdminFeeSchedule() {
  const tx = useTr();
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<Record<string, { model: string; amount: string; enabled: boolean; reason: string }>>({});

  const load = useCallback(async () => {
    const r = await send('/api/admin/fee-schedule', 'GET');
    if (r.status !== 'success') return;
    setD(r.data);
    const next: typeof draft = {};
    for (const l of r.data.schedule as FeeLine[]) next[l.kind] = { model: l.model, amount: String(l.model === 'flat_service_fee' ? l.flatMyr : l.percent), enabled: l.enabled, reason: '' };
    setDraft(next);
  }, []);
  useEffect(() => { load().catch(() => setMsg({ ok: false, text: tx('Could not load.') })); }, [load]);
  if (!d) return <p role="status" className="text-xs text-slate-600 p-4">{tx('Loading…')}</p>;

  const save = async (l: FeeLine) => {
    const x = draft[l.kind];
    const body: Record<string, unknown> = { model: x.model, enabled: x.enabled, reason: x.reason };
    if (x.model === 'flat_service_fee') body.flatMyr = Number(x.amount); else if (x.model === 'percent_service_fee') body.percent = Number(x.amount);
    const r = await send(`/api/admin/fee-schedule/${l.kind}`, 'PUT', body);
    if (r.status === 'success') { setMsg({ ok: true, text: tx('Fee saved.') }); load(); } else setMsg({ ok: false, text: r.message || tx('Could not save.') });
  };
  const set = (kind: string, patch: Partial<{ model: string; amount: string; enabled: boolean; reason: string }>) => setDraft({ ...draft, [kind]: { ...draft[kind], ...patch } });

  return (
    <section aria-labelledby="fs-h" className="bg-white border border-[color:var(--t-200)] p-5 space-y-4 rounded-none">
      <div className="space-y-1">
        <h3 id="fs-h" className="text-lg font-bold">{tx('Platform fees')}</h3>
        <p className="text-xs text-slate-700">{tx("The platform's own fee is charged to the patient and shown as a separate line. The professional is paid their full fee. Which model is lawful is for counsel to confirm.")}</p>
        <p className="text-xs font-bold">{d.professionalsKeepFull ? tx('Professionals receive 100% of their fee on every kind of payment.') : tx('Some kinds still take a share of the professional fee (the old model). Switch them to a service fee.')} · {tx('Service tax on the platform fee')}: {d.platformFeeTaxPct}%</p>
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}
      <div className="grid lg:grid-cols-3 gap-4">
        {d.schedule.map(l => {
          const x = draft[l.kind]; if (!x) return null;
          const legacy = l.model === 'legacy_percent_of_professional_fee';
          return (
            <form key={l.kind} className="border border-[color:var(--t-200)] p-4 space-y-3" onSubmit={e => { e.preventDefault(); save(l); }}>
              <h4 className="text-sm font-bold">{tx(KIND_LABEL[l.kind])}</h4>
              {legacy && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 font-semibold p-2">{tx('Old model: {pct}% is taken from the professional fee. Choose a service fee to change it.', { pct: l.percent })}</p>}
              <div><label htmlFor={`fs-m-${l.kind}`} className="form-label">{tx('Fee model')}</label>
                <select id={`fs-m-${l.kind}`} className="form-input" value={x.model} onChange={e => set(l.kind, { model: e.target.value })}>
                  {legacy && <option value="legacy_percent_of_professional_fee">{tx('Share of the professional fee (old)')}</option>}
                  <option value="flat_service_fee">{tx('Fixed service fee charged to the patient (RM)')}</option>
                  <option value="percent_service_fee">{tx('Percentage service fee charged to the patient')}</option>
                </select></div>
              {x.model !== 'legacy_percent_of_professional_fee' && (
                <div><label htmlFor={`fs-a-${l.kind}`} className="form-label">{x.model === 'flat_service_fee' ? tx('Amount (RM)') : tx('Percent')}</label>
                  <input id={`fs-a-${l.kind}`} type="number" min={0} max={x.model === 'flat_service_fee' ? 500 : 50} step="0.01" className="form-input" value={x.amount} onChange={e => set(l.kind, { amount: e.target.value })} required /></div>
              )}
              <label className="inline-flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={x.enabled} onChange={e => set(l.kind, { enabled: e.target.checked })} />{tx('Charge this fee')}</label>
              <div><label htmlFor={`fs-r-${l.kind}`} className="form-label">{tx('Reason for the change')}</label>
                <input id={`fs-r-${l.kind}`} className="form-input" value={x.reason} onChange={e => set(l.kind, { reason: e.target.value })} required minLength={5} maxLength={300} /></div>
              <button type="submit" className="btn btn-sm btn-primary">{tx('Save fee')}</button>
              <p className="text-xs text-slate-600">{l.updatedBy ? `${tx('Last changed')} ${new Date(l.updatedAt).toLocaleDateString()}` : ''}{l.reason ? ` · ${l.reason}` : ''}</p>
            </form>
          );
        })}
      </div>
      {d.history.length > 0 && (
        <details>
          <summary className="text-xs font-bold cursor-pointer">{tx('Change history')} ({d.history.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {d.history.map((h, i) => <li key={i}>{new Date(h.changedAt).toLocaleString()} · {tx(KIND_LABEL[h.kind] ?? h.kind)} · {h.model === 'flat_service_fee' ? `RM ${h.flatMyr.toFixed(2)}` : `${h.percent}%`} · {h.enabled ? tx('on') : tx('off')} · {h.reason}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}