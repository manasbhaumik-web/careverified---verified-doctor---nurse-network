import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTr } from '../../locale';
import PaymentDialog from '../../components/PaymentDialog';

interface Recipient { id: string; name: string; relationship: string | null; birthYear: number | null; address: string | null; city: string | null; state: string | null; needs: string | null }
interface Caregiver { id: string; name: string; specialty: string; city: string | null; languages: string[]; bio: string; ratePerHour: number; validUntil: string | null; badge: string; experienceYears: number | null }
interface Visit {
  id: string; status: 'requested' | 'accepted' | 'confirmed' | 'completed' | 'declined' | 'cancelled' | 'expired';
  date: string; startTime: string; hours: number; ratePerHour: number; total: number;
  caregiver: { id: string; name: string }; recipient: { id: string; name: string } | null;
  familyNote: string | null; declineReason: string | null; visitNote: string | null; acceptedAt: string | null;
}

const api = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
const myr = (n: number) => `RM ${n.toFixed(2)}`;
const emptyRec = { name: '', relationship: '', birthYear: '', address: '', city: '', state: '', needs: '' };

const STATUS: Record<Visit['status'], { label: string; cls: string }> = {
  requested: { label: 'Waiting for the caregiver', cls: 'bg-amber-50 border-amber-300 text-amber-950' },
  accepted: { label: 'Accepted: pay to confirm', cls: 'bg-[color:var(--t-100)] border-[color:var(--t-600)] text-[color:var(--ink)]' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
  declined: { label: 'Declined', cls: 'bg-rose-50 border-rose-300 text-rose-900' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 border-slate-300 text-slate-800' },
  expired: { label: 'Expired', cls: 'bg-slate-100 border-slate-300 text-slate-800' },
};

/** Home care for a family: the people you care for, verified caregivers you can ask, and your visits (ask, pay, read the visit note). */
export default function FamilyHomeCare() {
  const tx = useTr();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rec, setRec] = useState(emptyRec);
  const [editing, setEditing] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [askFor, setAskFor] = useState<Caregiver | null>(null);
  const [form, setForm] = useState({ recipientId: '', date: '', startTime: '09:00', hours: 4, note: '' });
  const [paying, setPaying] = useState<Visit | null>(null);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([api('/api/me/care-recipients'), api(`/api/homecare/caregivers${city ? `?city=${encodeURIComponent(city)}` : ''}`), api('/api/homecare/requests')]);
    if (a.status === 'success') setRecipients(a.data);
    if (b.status === 'success') setCaregivers(b.data);
    if (c.status === 'success') setVisits(c.data);
  }, [city]);
  useEffect(() => { load().catch(() => setMsg({ ok: false, text: tx('Could not load.') })); }, [load]);

  const done = (r: any, okText: string) => { setMsg({ ok: r.status === 'success', text: r.status === 'success' ? okText : r.message || tx('Could not save.') }); if (r.status === 'success') load(); return r.status === 'success'; };

  const saveRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...rec, birthYear: rec.birthYear ? Number(rec.birthYear) : null };
    const r = editing ? await api(`/api/me/care-recipients/${editing}`, 'PUT', body) : await api('/api/me/care-recipients', 'POST', body);
    if (done(r, tx('Saved.'))) { setRec(emptyRec); setEditing(null); }
  };
  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askFor) return;
    if (done(await api('/api/homecare/requests', 'POST', { ...form, caregiverId: askFor.id }), tx('Request sent. The caregiver has 48 hours to answer.'))) setAskFor(null);
  };

  const field = (k: keyof typeof emptyRec, label: string, type = 'text') => (
    <div><label htmlFor={`hc-${k}`} className="form-label">{tx(label)}</label><input id={`hc-${k}`} type={type} className="form-input" value={rec[k]} onChange={e => setRec({ ...rec, [k]: e.target.value })} /></div>
  );

  return (
    <section aria-labelledby="hc-h" className="space-y-4">
      <div>
        <h2 id="hc-h" className="text-lg font-extrabold">{tx('Home care for your family')}</h2>
        <p className="text-sm text-slate-700">{tx('Ask a verified caregiver to visit someone you care for. You pay only after the caregiver accepts.')}</p>
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      <div className="app-card space-y-3">
        <h3 className="text-sm font-extrabold">{tx('People you care for')}</h3>
        <ul className="divide-y divide-[color:var(--t-100)] text-sm">
          {recipients.map(r => (
            <li key={r.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <span><b>{r.name}</b>{r.relationship ? ` · ${r.relationship}` : ''}<br /><span className="text-xs text-slate-600">{[r.address, r.city].filter(Boolean).join(', ') || tx('No address yet')}</span></span>
              <span className="flex gap-2">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setEditing(r.id); setRec({ name: r.name, relationship: r.relationship ?? '', birthYear: r.birthYear ? String(r.birthYear) : '', address: r.address ?? '', city: r.city ?? '', state: r.state ?? '', needs: r.needs ?? '' }); }}>{tx('Edit')}</button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={async () => done(await api(`/api/me/care-recipients/${r.id}`, 'DELETE'), tx('Removed.'))}>{tx('Remove')}</button>
              </span>
            </li>
          ))}
          {recipients.length === 0 && <li className="py-2 text-xs text-slate-600">{tx('Add the first person you care for to ask for a visit.')}</li>}
        </ul>
        <form onSubmit={saveRecipient} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {field('name', 'Name')}{field('relationship', 'Relationship (e.g. Mother)')}{field('birthYear', 'Birth year', 'number')}
          <div className="sm:col-span-2">{field('address', 'Address for the visit')}</div>{field('city', 'City')}
          <div className="sm:col-span-3"><label htmlFor="hc-needs" className="form-label">{tx('Care needs')}</label><textarea id="hc-needs" rows={2} className="form-input" value={rec.needs} onChange={e => setRec({ ...rec, needs: e.target.value })} /></div>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" className="btn btn-sm btn-primary">{editing ? tx('Save changes') : tx('Add person')}</button>
            {editing && <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setEditing(null); setRec(emptyRec); }}>{tx('Cancel')}</button>}
          </div>
        </form>
      </div>

      <div className="app-card space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-extrabold">{tx('Verified caregivers')}</h3>
          <div><label htmlFor="hc-city" className="form-label">{tx('City')}</label><input id="hc-city" className="form-input" value={city} onChange={e => setCity(e.target.value)} /></div>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {caregivers.map(c => (
            <li key={c.id} className="border border-[color:var(--t-200)] bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-extrabold">{c.name}</p><p className="text-xs text-slate-600">{[c.specialty, c.city].filter(Boolean).join(' · ')}</p></div>
                <span className="text-sm font-extrabold whitespace-nowrap">{myr(c.ratePerHour)}<span className="text-xs font-normal text-slate-600"> / {tx('hour')}</span></span>
              </div>
              <p className="text-xs text-slate-700 line-clamp-3">{c.bio}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={`/verify?badge=${encodeURIComponent(c.badge)}`} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{tx('Verified')}{c.validUntil ? ` · ${tx('valid until')} ${c.validUntil}` : ''}</a>
                <button type="button" className="btn btn-sm btn-primary" disabled={recipients.length === 0} onClick={() => { setAskFor(c); setForm({ ...form, recipientId: recipients[0]?.id ?? '' }); }}>{tx('Request a visit')}</button>
              </div>
            </li>
          ))}
          {caregivers.length === 0 && <li className="text-xs text-slate-600">{tx('No caregivers match yet.')}</li>}
        </ul>
        {askFor && (
          <form onSubmit={sendRequest} className="border border-[color:var(--t-600)] bg-[color:var(--t-50)] p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" aria-label={tx('Request a visit')}>
            <p className="sm:col-span-4 text-sm font-extrabold">{tx('Request a visit from')} {askFor.name}</p>
            <div><label htmlFor="rq-who" className="form-label">{tx('Care for')}</label><select id="rq-who" className="form-input" value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })} required>{recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label htmlFor="rq-d" className="form-label">{tx('Date')}</label><input id="rq-d" type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div><label htmlFor="rq-t" className="form-label">{tx('Start time')}</label><input id="rq-t" type="time" className="form-input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required /></div>
            <div><label htmlFor="rq-h" className="form-label">{tx('Hours')}</label><input id="rq-h" type="number" min={1} max={12} className="form-input" value={form.hours} onChange={e => setForm({ ...form, hours: Number(e.target.value) })} required /></div>
            <div className="sm:col-span-4"><label htmlFor="rq-n" className="form-label">{tx('Note for the caregiver')}</label><textarea id="rq-n" rows={2} className="form-input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
            <p className="sm:col-span-3 text-xs text-slate-700">{tx('Estimated price')}: <b>{myr(askFor.ratePerHour * (form.hours || 0))}</b> · {tx('Service tax, if any, is added when you pay.')}</p>
            <div className="flex gap-2"><button type="submit" className="btn btn-sm btn-primary">{tx('Send request')}</button><button type="button" className="btn btn-sm btn-secondary" onClick={() => setAskFor(null)}>{tx('Cancel')}</button></div>
          </form>
        )}
      </div>

      <div className="app-card space-y-3">
        <h3 className="text-sm font-extrabold">{tx('Your visits')}</h3>
        <ul className="space-y-3">
          {visits.map(v => (
            <li key={v.id} className="border border-[color:var(--t-200)] bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="font-extrabold text-sm">{v.caregiver.name} · {v.recipient?.name}</p><p className="text-xs text-slate-600">{v.date} {tx('at')} {v.startTime} · {v.hours} {tx('hours')} · {myr(v.total)}</p></div>
                <span className={`text-xs font-extrabold px-2.5 py-1 border ${STATUS[v.status].cls}`}>{tx(STATUS[v.status].label)}</span>
              </div>
              {v.declineReason && <p className="text-xs text-rose-900">{tx('Reason')}: {v.declineReason}</p>}
              {v.visitNote && <p className="text-sm bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-3"><b>{tx('Visit note')}:</b> {v.visitNote}</p>}
              <div className="flex flex-wrap gap-2">
                {v.status === 'accepted' && <button type="button" className="btn btn-sm btn-primary" onClick={() => setPaying(v)}>{tx('Pay now')}</button>}
                {['requested', 'accepted', 'confirmed'].includes(v.status) && <button type="button" className="btn btn-sm btn-secondary" onClick={async () => { const r = await api(`/api/homecare/requests/${v.id}/cancel`, 'POST'); done(r, r.message || tx('Cancelled.')); }}>{tx('Cancel visit')}</button>}
              </div>
            </li>
          ))}
          {visits.length === 0 && <li className="text-xs text-slate-600">{tx('No visits yet.')}</li>}
        </ul>
      </div>

      {paying && (
        <PaymentDialog kind="care" refId={paying.id} description={`${paying.caregiver.name}, ${paying.date} ${paying.startTime}`}
          onPaid={() => { setPaying(null); setMsg({ ok: true, text: tx('Paid. Your visit is confirmed.') }); load(); }} onCancel={() => setPaying(null)} />
      )}
    </section>
  );
}
