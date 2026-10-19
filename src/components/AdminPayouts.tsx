import React, { useCallback, useEffect, useState } from 'react';
import { formatMoney } from '../locale';

const jreq = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');
const btn = 'min-h-[36px] px-3 text-xs font-bold border border-slate-300 cursor-pointer hover:bg-slate-50';
const btnPrimary = 'min-h-[36px] px-3 text-xs font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] cursor-pointer disabled:opacity-60';
const sen = (n: number) => formatMoney(n, { fromMinor: true });

interface Overview {
  terms: { schedule: string; holdDays: number; minimumPayout: number };
  fourEyes: boolean; bankAvailable: boolean;
  preview: { professionalId: string; name: string; readySen: number; adjustmentsSen: number; netSen: number; waitingSen: number; items: number; willBePaid: boolean; reason: string | null; sandbox: boolean }[];
  accounts: { professionalId: string; practitionerName: string; bankName: string; accountName: string; last4: string; status: string; updatedAt: string; note: string | null; nameMatches: boolean }[];
  batches: { id: string; status: string; note: string | null; totalSen: number; count: number; createdAt: string; approvedAt: string | null; exportedAt: string | null }[];
}
interface Batch {
  id: string; status: string; note: string | null; total: number; createdAt: string; approvedBy: string | null; exportedAt: string | null; refunded: number; fourEyes: boolean;
  payouts: { id: string; name: string; status: string; amount: number; earnings: number; adjustments: number; bank: string; accountName: string; reference: string | null; paidOn: string | null; failureReason: string | null; items: number }[];
}

/** The board's payout desk: verify bank accounts, prepare a batch, approve it, download the bank file, record each transfer. */
export default function AdminPayouts() {
  const [o, setO] = useState<Overview | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => jreq('/api/admin/payouts/overview').then(d => d.status === 'success' && setO(d.data)), []);
  const loadBatch = useCallback((id: string) => jreq(`/api/admin/payout-batches/${id}`).then(d => d.status === 'success' && setBatch(d.data)), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) loadBatch(open); else setBatch(null); }, [open, loadBatch]);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });
  const act = async (fn: () => Promise<any>, okText?: string) => {
    setBusy(true); const d = await fn(); setBusy(false);
    if (d.status === 'success') { if (okText) say(true, okText); } else say(false, d.message || 'That did not work.');
    await load(); if (open) await loadBatch(open);
    return d;
  };

  const prepare = async () => {
    const d = await act(() => jreq('/api/admin/payout-batches', 'POST', { note }));
    if (d.status === 'success') { setNote(''); say(true, `Batch ${d.data.id} prepared: ${d.data.payouts} payout(s), ${formatMoney(d.data.total)}.${d.data.skipped.length ? ` Skipped: ${d.data.skipped.map((s: any) => `${s.professional} (${s.reason})`).join('; ')}.` : ''}`); setOpen(d.data.id); }
  };
  const verify = (pid: string, verified: boolean) => {
    if (verified) {
      if (!window.confirm('Confirm you have checked that the account holder name matches the practitioner\'s name.')) return;
      return act(() => jreq(`/api/admin/payout-accounts/${pid}/verify`, 'POST', { verified: true, nameChecked: true }), 'Account verified.');
    }
    const note = window.prompt('Why can this account not be verified? The practitioner will see this.');
    if (!note) return;
    return act(() => jreq(`/api/admin/payout-accounts/${pid}/verify`, 'POST', { verified: false, note }), 'Account rejected.');
  };
  const markPaid = async (id: string) => {
    const reference = window.prompt('The bank\'s reference for this transfer:');
    if (!reference) return;
    await act(() => jreq(`/api/admin/payouts/${id}/paid`, 'POST', { reference }), 'Marked paid. The practitioner has been told.');
  };
  const markFailed = async (id: string) => {
    const reason = window.prompt('Why did the transfer fail? The practitioner will see this.');
    if (!reason) return;
    await act(() => jreq(`/api/admin/payouts/${id}/failed`, 'POST', { reason }), 'Marked failed. The earnings are released for the next batch.');
  };

  if (!o) return <p role="status" className="text-xs text-slate-600">Loading payouts…</p>;
  const payable = o.preview.filter(p => p.willBePaid);

  return (
    <section aria-labelledby="payouts-h" className="bg-white border border-[color:var(--t-200)] p-5 space-y-6">
      <div>
        <h3 id="payouts-h" className="text-sm font-extrabold">Practitioner payouts</h3>
        <p className="text-xs text-slate-700 mt-1 max-w-3xl">Paid by bank transfer, {o.terms.schedule}. Earnings are payable {o.terms.holdDays} days after a visit is completed; balances under {formatMoney(o.terms.minimumPayout)} roll over. Nothing is sent automatically: you prepare a batch, approve it{o.fourEyes ? ' (a different admin must approve)' : ''}, download the bank file, send the transfers in your bank, then record each bank reference here.</p>
        {!o.bankAvailable && <p className="mt-2 text-xs bg-rose-50 border border-rose-200 text-rose-900 font-bold p-2">PAYOUT_ENCRYPTION_KEY is not set, so bank details cannot be stored or paid. Set it before using payouts in production.</p>}
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-2 text-xs font-bold p-2 border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>{msg.text}</p>}
      </div>

      {/* Bank accounts */}
      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Bank accounts</h4>
        {o.accounts.length === 0 ? <p className="text-xs text-slate-600">No practitioner has added bank details yet.</p> : (
          <ul className="divide-y divide-slate-100 text-xs border border-slate-200">
            {o.accounts.map(a => (
              <li key={a.professionalId} className="p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{a.practitionerName} <span className={`ml-1 px-1.5 py-0.5 text-xs font-extrabold uppercase ${a.status === 'verified' ? 'bg-emerald-100 text-emerald-900' : a.status === 'rejected' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>{a.status}</span></p>
                  <p className="text-slate-700">{a.bankName} ••••{a.last4} · holder: <b>{a.accountName}</b> {a.nameMatches ? <span className="text-emerald-800">(same as the practitioner&apos;s name)</span> : <span className="text-amber-900 font-bold">(differs from the practitioner&apos;s name: check)</span>}</p>
                  {a.note && <p className="text-slate-600">Note: {a.note}</p>}
                </div>
                {a.status !== 'verified' && (
                  <div className="flex gap-2 shrink-0">
                    <button type="button" className={btnPrimary} disabled={busy} onClick={() => verify(a.professionalId, true)}>Verify</button>
                    <button type="button" className={btn} disabled={busy} onClick={() => verify(a.professionalId, false)}>Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ready */}
      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Ready for the next batch</h4>
        {o.preview.length === 0 ? <p className="text-xs text-slate-600">Nothing is waiting to be paid.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-xs uppercase text-slate-600"><th className="py-2 pr-3">Practitioner</th><th className="pr-3 text-right">Ready</th><th className="pr-3 text-right">Adjustments</th><th className="pr-3 text-right">To pay</th><th className="pr-3 text-right">Still waiting</th><th>Status</th></tr></thead>
              <tbody>
                {o.preview.map(p => (
                  <tr key={p.professionalId} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-bold">{p.name}{p.sandbox ? <span className="ml-1 text-xs text-amber-900 bg-amber-100 px-1">test payments</span> : null}</td>
                    <td className="pr-3 text-right tabular-nums">{sen(p.readySen)}</td>
                    <td className="pr-3 text-right tabular-nums">{p.adjustmentsSen ? sen(p.adjustmentsSen) : '–'}</td>
                    <td className="pr-3 text-right tabular-nums font-bold">{sen(p.netSen)}</td>
                    <td className="pr-3 text-right tabular-nums text-slate-600">{sen(p.waitingSen)}</td>
                    <td>{p.willBePaid ? <span className="font-bold text-emerald-800">Will be paid</span> : <span className="text-slate-700">{p.reason}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="batch-note">Batch note</label>
          <input id="batch-note" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="Note, e.g. October run" className="border border-slate-300 px-3 h-9 text-xs min-w-[220px]" />
          <button type="button" className={btnPrimary} disabled={busy || payable.length === 0 || !o.bankAvailable} onClick={prepare}>Prepare batch ({payable.length} payout{payable.length === 1 ? '' : 's'}, {sen(payable.reduce((s, p) => s + p.netSen, 0))})</button>
        </div>
      </div>

      {/* Batches */}
      <div>
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Batches</h4>
        {o.batches.length === 0 ? <p className="text-xs text-slate-600">No batches yet.</p> : (
          <ul className="divide-y divide-slate-100 border border-slate-200 text-xs">
            {o.batches.map(b => (
              <li key={b.id}>
                <button type="button" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)} className="w-full text-left p-3 cursor-pointer hover:bg-slate-50 flex flex-wrap justify-between gap-2">
                  <span><b className="font-mono">{b.id}</b> <span className="ml-1 px-1.5 py-0.5 text-xs font-extrabold uppercase bg-[color:var(--t-50)] text-[color:var(--t-800)]">{b.status}</span> {b.note ? <span className="text-slate-600">· {b.note}</span> : null}</span>
                  <span className="tabular-nums">{b.count} payout{b.count === 1 ? '' : 's'} · <b>{sen(b.totalSen)}</b> · {when(b.createdAt)}</span>
                </button>
                {open === b.id && batch && batch.id === b.id && (
                  <div className="px-3 pb-4 space-y-3">
                    {batch.refunded > 0 && <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-900 font-bold p-2">{batch.refunded} payment(s) in this batch were refunded since it was prepared. Cancel it and prepare a new one.</p>}
                    <div className="flex flex-wrap gap-2">
                      {batch.status === 'draft' && <button type="button" className={btnPrimary} disabled={busy} onClick={() => act(() => jreq(`/api/admin/payout-batches/${b.id}/approve`, 'POST'), 'Batch approved.')}>Approve</button>}
                      {['approved', 'exported'].includes(batch.status) && <a className={`${btnPrimary} inline-flex items-center`} href={`/api/admin/payout-batches/${b.id}/export.csv`} onClick={() => setTimeout(() => { load(); loadBatch(b.id); }, 1200)}>Download bank file (contains account numbers)</a>}
                      {['draft', 'approved', 'exported'].includes(batch.status) && <button type="button" className={btn} disabled={busy} onClick={() => window.confirm('Cancel this batch? Its earnings go back to the next run.') && act(() => jreq(`/api/admin/payout-batches/${b.id}/cancel`, 'POST'), 'Batch cancelled.')}>Cancel batch</button>}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="text-left text-xs uppercase text-slate-600"><th className="py-1.5 pr-3">Practitioner</th><th className="pr-3">To</th><th className="pr-3 text-right">Amount</th><th className="pr-3">Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                        <tbody>
                          {batch.payouts.map(p => (
                            <tr key={p.id} className="border-t border-slate-100 align-top">
                              <td className="py-2 pr-3"><b>{p.name}</b><br /><span className="font-mono text-slate-600">{p.id}</span></td>
                              <td className="pr-3">{p.accountName}<br />{p.bank}</td>
                              <td className="pr-3 text-right tabular-nums"><b>{formatMoney(p.amount)}</b>{p.adjustments ? <><br /><span className="text-slate-600">incl. {formatMoney(p.adjustments)} adjustment</span></> : null}</td>
                              <td className="pr-3">{p.status}{p.reference ? <><br /><span className="font-mono">{p.reference}</span></> : null}{p.failureReason ? <><br /><span className="text-rose-800">{p.failureReason}</span></> : null}</td>
                              <td className="text-right">
                                {p.status === 'pending' && ['approved', 'exported'].includes(batch.status) && (
                                  <span className="inline-flex gap-1.5"><button type="button" className={btnPrimary} disabled={busy} onClick={() => markPaid(p.id)}>Mark paid</button><button type="button" className={btn} disabled={busy} onClick={() => markFailed(p.id)}>Failed</button></span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
