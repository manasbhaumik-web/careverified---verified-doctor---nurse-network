import React, { useCallback, useEffect, useState } from 'react';
import { useTr } from '../../locale';

interface Visit {
  id: string; status: 'requested' | 'accepted' | 'confirmed' | 'completed' | 'declined' | 'cancelled' | 'expired';
  date: string; startTime: string; hours: number; ratePerHour: number; total: number;
  recipient: { name: string; relationship: string | null; needs: string | null; address?: string | null; city?: string | null } | null;
  familyName?: string; familyNote: string | null; visitNote: string | null;
}

const api = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
const myr = (n: number) => `RM ${n.toFixed(2)}`;

/** A caregiver's home-care requests: answer new ones, see paid visits with the address, finish a visit with a note, and set the hourly rate. */
export default function CaregiverRequests() {
  const tx = useTr();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [profileId, setProfileId] = useState<string | null>(null);
  const [rate, setRate] = useState('');

  const load = useCallback(async () => {
    const [a, me] = await Promise.all([api('/api/homecare/requests'), api('/api/my-verification')]);
    if (a.status === 'success') setVisits(a.data);
    if (me.status === 'success' && me.data?.profileId) {
      setProfileId(me.data.profileId);
      const p = await api(`/api/professionals/${me.data.profileId}`);
      if (p.status === 'success') setRate(String(p.data?.fee ?? ''));
    }
  }, []);
  useEffect(() => { load().catch(() => setMsg({ ok: false, text: tx('Could not load.') })); }, [load]);

  const done = (r: any, okText: string) => { setMsg({ ok: r.status === 'success', text: r.status === 'success' ? okText : r.message || tx('Could not save.') }); if (r.status === 'success') load(); };
  const group = (s: Visit['status'][]) => visits.filter(v => s.includes(v.status));

  const header = (v: Visit) => (
    <div>
      <p className="font-extrabold text-sm">{v.date} {tx('at')} {v.startTime} · {v.hours} {tx('hours')} · {myr(v.total)}</p>
      <p className="text-xs text-slate-700">{v.recipient?.name}{v.recipient?.relationship ? ` (${v.recipient.relationship})` : ''}{v.familyName ? ` · ${tx('asked by')} ${v.familyName}` : ''}</p>
      {v.recipient?.needs && <p className="text-xs text-slate-700">{tx('Care needs')}: {v.recipient.needs}</p>}
      {v.familyNote && <p className="text-xs text-slate-700">{tx('Note')}: {v.familyNote}</p>}
    </div>
  );

  return (
    <section aria-labelledby="cr-h" className="space-y-4">
      <h2 id="cr-h" className="text-lg font-extrabold">{tx('Home care requests')}</h2>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      <form className="app-card flex flex-wrap items-end gap-3" onSubmit={async e => {
        e.preventDefault();
        if (profileId) done(await api(`/api/professionals/${profileId}/edit`, 'POST', { fee: Number(rate) }), tx('Hourly rate saved.'));
      }}>
        <div><label htmlFor="cr-rate" className="form-label">{tx('Your hourly rate (RM)')}</label><input id="cr-rate" type="number" min={0} step="0.5" className="form-input" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <button type="submit" className="btn btn-sm btn-primary">{tx('Save rate')}</button>
        <p className="text-xs text-slate-700">{tx('Families can only ask you for a visit once you have set a rate.')}</p>
      </form>

      <div className="app-card space-y-3">
        <h3 className="text-sm font-extrabold">{tx('New requests')}</h3>
        <ul className="space-y-3">
          {group(['requested']).map(v => (
            <li key={v.id} className="border border-[color:var(--t-200)] bg-white p-4 space-y-2">
              {header(v)}
              <div className="flex flex-wrap items-end gap-2">
                <button type="button" className="btn btn-sm btn-primary" onClick={async () => done(await api(`/api/homecare/requests/${v.id}/accept`, 'POST'), tx('Accepted. The family can now pay.'))}>{tx('Accept')}</button>
                <div><label htmlFor={`dr-${v.id}`} className="sr-only">{tx('Reason for declining')}</label><input id={`dr-${v.id}`} className="form-input" placeholder={tx('Reason for declining')} value={reason[v.id] ?? ''} onChange={e => setReason({ ...reason, [v.id]: e.target.value })} /></div>
                <button type="button" className="btn btn-sm btn-secondary" onClick={async () => done(await api(`/api/homecare/requests/${v.id}/decline`, 'POST', { reason: reason[v.id] ?? '' }), tx('Declined.'))}>{tx('Decline')}</button>
              </div>
            </li>
          ))}
          {group(['requested']).length === 0 && <li className="text-xs text-slate-600">{tx('No new requests.')}</li>}
        </ul>
      </div>

      <div className="app-card space-y-3">
        <h3 className="text-sm font-extrabold">{tx('Confirmed visits')}</h3>
        <ul className="space-y-3">
          {group(['accepted']).map(v => <li key={v.id} className="border border-[color:var(--t-200)] bg-white p-4"><div>{header(v)}<p className="text-xs font-bold text-amber-950 mt-1">{tx('Waiting for the family to pay')}</p></div></li>)}
          {group(['confirmed']).map(v => (
            <li key={v.id} className="border border-emerald-300 bg-white p-4 space-y-2">
              {header(v)}
              <p className="text-sm"><b>{tx('Address')}:</b> {[v.recipient?.address, v.recipient?.city].filter(Boolean).join(', ') || '—'}</p>
              <div><label htmlFor={`vn-${v.id}`} className="form-label">{tx('Visit note for the family (after the visit)')}</label><textarea id={`vn-${v.id}`} rows={2} className="form-input" value={note[v.id] ?? ''} onChange={e => setNote({ ...note, [v.id]: e.target.value })} /></div>
              <button type="button" className="btn btn-sm btn-primary" onClick={async () => done(await api(`/api/homecare/requests/${v.id}/complete`, 'POST', { note: note[v.id] ?? '' }), tx('Visit completed. The family can read your note.'))}>{tx('Mark visit complete')}</button>
            </li>
          ))}
          {group(['accepted', 'confirmed']).length === 0 && <li className="text-xs text-slate-600">{tx('No upcoming visits.')}</li>}
        </ul>
      </div>

      <div className="app-card space-y-2">
        <h3 className="text-sm font-extrabold">{tx('History')}</h3>
        <ul className="divide-y divide-[color:var(--t-100)] text-xs">
          {group(['completed', 'declined', 'cancelled', 'expired']).map(v => <li key={v.id} className="py-2 flex flex-wrap justify-between gap-2"><span>{v.date} {v.startTime} · {v.recipient?.name}</span><span className="font-bold">{tx(v.status === 'completed' ? 'Completed' : v.status === 'declined' ? 'Declined' : v.status === 'cancelled' ? 'Cancelled' : 'Expired')}</span></li>)}
        </ul>
      </div>
    </section>
  );
}
