import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Landmark, Wallet } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { formatDate, formatMoney, useTr } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jput = (url: string, body: unknown) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const BANKS = ['Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank', 'AmBank', 'Bank Islam', 'Bank Rakyat', 'BSN', 'Affin Bank', 'Alliance Bank', 'OCBC Bank', 'HSBC Bank Malaysia', 'UOB Malaysia', 'Standard Chartered Malaysia', 'MBSB Bank', 'Agrobank'];
const label = 'form-label';
const input = 'form-input';

interface Data {
  terms: { schedule: string; holdDays: number; minimumPayout: number; method: string; runBy: string };
  bankAvailable: boolean;
  bank: { bankName: string; accountName: string; last4: string; status: 'unverified' | 'verified' | 'rejected'; note: string | null } | null;
  summary: { waiting: number; available: number; inPayout: number; paid: number; belowMinimum: boolean } | null;
  upcoming: { paymentId: string; description: string; net: number; state: 'ready' | 'waiting'; note: string | null; serviceDate: string | null; testMode: boolean }[];
  adjustments: { paymentId: string; description: string; amount: number }[];
  payouts: { id: string; status: string; amount: number; earnings: number; adjustments: number; reference: string | null; paidOn: string | null; failureReason: string | null; createdAt: string; bank: string }[];
}

/** A practitioner's earnings, what is waiting to be paid, the bank account payouts go to, and past payouts with statements. */
export default function PractitionerEarnings({ embedded = false }: { embedded?: boolean }) {
  const tx = useTr();
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ bankName: '', accountName: '', accountNumber: '', password: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => jget('/api/me/payouts').then(r => { if (r.status === 'success') setD(r.data); else setError(r.message || tx('Could not load.')); }).catch(() => setError(tx('Could not load.'))), []);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    const r = await jput('/api/me/payout-account', form);
    setBusy(false);
    if (r.status === 'success') { setMsg({ ok: true, text: tx('Saved. The board will check that the account holder name matches yours before your next payout.') }); setForm({ bankName: '', accountName: '', accountNumber: '', password: '' }); setEditing(false); load(); }
    else setMsg({ ok: false, text: r.message || tx('Could not save.') });
  };

  if (error) return <p role="alert" className="text-xs text-rose-800 p-4">{error}</p>;
  if (!d) return <p role="status" className="text-xs text-slate-600 p-4">{tx('Loading…')}</p>;
  const t = d.terms, s = d.summary;
  const bankStatus = d.bank?.status;

  return (
    <div className={embedded ? "space-y-6" : "w-full space-y-0"}>
      {!embedded && (
        <DashboardHeader
          icon={Wallet}
          eyebrow={tx('Earnings')}
          title={tx('Earnings and payouts')}
          description={tx('You are paid by {method}, {schedule}. Earnings become payable {days} days after a visit is completed. Balances under {min} roll over to the next payout.', { method: t.method, schedule: t.schedule, days: t.holdDays, min: formatMoney(t.minimumPayout) })}
        />
      )}

      <div className={embedded ? "space-y-6" : "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
        {!s && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3 font-semibold">{tx('Finish your practitioner registration to see earnings.')}</p>}

        {s && (
          <section aria-label={tx('Balances')} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Waiting', s.waiting, tx('Visit not completed yet, or still inside the {n}-day hold', { n: t.holdDays })],
            ['Ready for the next payout', s.available, s.belowMinimum ? tx('Under the {min} minimum, so it rolls over', { min: formatMoney(t.minimumPayout) }) : tx('Included in the next run')],
            ['In a payout being prepared', s.inPayout, tx('Prepared by the board, not yet sent')],
            ['Paid to you', s.paid, tx('Sent to your bank so far')],
          ].map(([l, v, hint]) => (
            <div key={l as string} className="bg-white border border-[color:var(--t-200)] p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">{tx(l as string)}</p>
              <p className="text-2xl font-black tabular-nums mt-1">{formatMoney(v as number)}</p>
              <p className="text-xs text-slate-600 mt-1 leading-snug">{hint}</p>
            </div>
          ))}
        </section>
      )}

      {/* Bank account */}
      <section aria-labelledby="bank-h" className="app-card space-y-4">
        <h2 id="bank-h" className="text-sm font-extrabold flex items-center gap-2"><Landmark className="h-4 w-4" aria-hidden="true" />{tx('Bank account for payouts')}</h2>
        {!d.bankAvailable && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3 font-semibold">{tx('Bank details cannot be saved yet because the server has no encryption key. Ask the board.')}</p>}
        {d.bank && !editing && (
          <div className="space-y-2 text-xs">
            <p className="font-bold">{d.bank.bankName} ••••{d.bank.last4}</p>
            <p className="text-slate-700">Account holder: {d.bank.accountName}</p>
            {bankStatus === 'verified' && <p className="inline-flex items-center gap-1.5 text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{tx('Verified by the board')}</p>}
            {bankStatus === 'unverified' && <p className="inline-flex items-center gap-1.5 text-amber-950 bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-bold"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{tx('Waiting for the board to verify it. You will not be paid until it is.')}</p>}
            {bankStatus === 'rejected' && <p className="text-rose-900 bg-rose-50 border border-rose-300 px-2.5 py-1.5 text-xs font-bold">The board could not verify this account{d.bank.note ? `: ${d.bank.note}` : '.'} Please enter it again.</p>}
            {bankStatus === 'unverified' && d.bank.note && <p className="text-xs text-slate-700">{d.bank.note}</p>}
            <button type="button" onClick={() => setEditing(true)} className="btn btn-sm btn-secondary whitespace-nowrap shrink-0 mt-1">{tx('Change bank details')}</button>
          </div>
        )}
        {(!d.bank || editing) && d.bankAvailable && (
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
            <p className="sm:col-span-2 text-xs text-slate-700">{tx('A Malaysian bank account in your own name. Changing details pauses payouts until the board verifies them again, and you must enter your password.')}</p>
            <div>
              <label htmlFor="pb-bank" className={label}>{tx('Bank *')}</label>
              <input id="pb-bank" list="pb-banks" className={input} value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} required minLength={2} maxLength={60} autoComplete="off" />
              <datalist id="pb-banks">{BANKS.map(b => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label htmlFor="pb-name" className={label}>{tx('Account holder name *')}</label>
              <input id="pb-name" className={input} value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} required minLength={2} maxLength={120} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="pb-num" className={label}>{tx('Account number *')}</label>
              <input id="pb-num" className={input} inputMode="numeric" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} required maxLength={40} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="pb-pw" className={label}>{tx('Your password *')}</label>
              <input id="pb-pw" type="password" className={input} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn btn-sm btn-primary whitespace-nowrap shrink-0">{busy ? 'Saving…' : 'Save bank details'}</button>
              {editing && <button type="button" onClick={() => { setEditing(false); setMsg(null); }} className="btn btn-sm btn-secondary whitespace-nowrap shrink-0">{tx('Cancel')}</button>}
            </div>
          </form>
        )}
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}
      </section>

      {/* What is coming */}
      {s && (d.upcoming.length > 0 || d.adjustments.length > 0) && (
        <section aria-labelledby="up-h" className="app-card">
          <h2 id="up-h" className="text-sm font-extrabold mb-3">{tx('Not yet paid out')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-xs uppercase text-slate-600"><th className="py-2 pr-3">{tx('Visit')}</th><th className="pr-3">{tx('Status')}</th><th className="text-right">{tx('You receive')}</th></tr></thead>
              <tbody>
                {d.upcoming.map(u => (
                  <tr key={u.paymentId} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{u.description}{u.testMode ? ` (${tx('test payment')})` : ''}</td>
                    <td className="pr-3">{u.state === 'ready' ? <span className="font-bold text-emerald-800">{tx('Ready')}</span> : <span className="text-slate-700">{u.note ? tx(u.note) : tx('Waiting')}</span>}</td>
                    <td className="text-right tabular-nums font-bold">{formatMoney(u.net)}</td>
                  </tr>
                ))}
                {d.adjustments.map(a => (
                  <tr key={a.paymentId} className="border-t border-slate-100 bg-rose-50/40">
                    <td className="py-2 pr-3">{a.description}</td>
                    <td className="pr-3 text-rose-900 font-bold">{tx('Refund adjustment')}</td>
                    <td className="text-right tabular-nums font-bold text-rose-900">{formatMoney(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 mt-3">{tx('Amounts are your fee after the platform commission. Service tax is passed on and is not your income. No income tax is deducted from payouts. Speak to an accountant about your own tax.')}</p>
        </section>
      )}

      {/* History */}
      <section aria-labelledby="hist-h" className="app-card">
        <h2 id="hist-h" className="text-sm font-extrabold mb-3">{tx('Payouts')}</h2>
        {d.payouts.length === 0 ? <p className="text-xs text-slate-600">{tx('No payouts yet.')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-xs uppercase text-slate-600"><th className="py-2 pr-3">{tx('Payout')}</th><th className="pr-3">{tx('Status')}</th><th className="pr-3">{tx('Bank')}</th><th className="pr-3">{tx('Reference')}</th><th className="pr-3 text-right">{tx('Amount')}</th><th><span className="sr-only">{tx('Statement')}</span></th></tr></thead>
              <tbody>
                {d.payouts.map(p => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-mono">{p.id}<span className="block text-xs text-slate-600 font-sans">{formatDate(p.paidOn ?? p.createdAt)}</span></td>
                    <td className="pr-3 font-bold">{p.status === 'pending' ? tx('Being prepared') : p.status === 'paid' ? tx('Paid') : p.status === 'failed' ? tx('Could not be sent') : p.status}{p.failureReason ? <span className="block font-normal text-slate-700">{p.failureReason}</span> : null}</td>
                    <td className="pr-3">{p.bank}</td>
                    <td className="pr-3 font-mono">{p.reference ?? ''}</td>
                    <td className="pr-3 text-right tabular-nums font-bold">{formatMoney(p.amount)}</td>
                    <td>{p.status !== 'failed' && p.status !== 'cancelled' && <a href={`/api/me/payouts/${p.id}/statement.csv`} className="btn btn-sm btn-secondary whitespace-nowrap shrink-0"><Download className="h-3.5 w-3.5" aria-hidden="true" />{tx('Statement')}</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
