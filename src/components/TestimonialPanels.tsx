import React, { useCallback, useEffect, useState } from 'react';
import { MY_STATES } from '../identity';
import { formatDate } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const input = 'border border-slate-300 p-2 text-xs bg-white';

/** Patients who have paid for care can share their experience. Hidden for everyone else. */
export function TestimonialForm() {
  const [state, setState] = useState<{ canWrite: boolean; mine: any } | null>(null);
  const [v, setV] = useState({ text: '', rating: '5', location: '', consent: false });
  const [msg, setMsg] = useState('');
  const load = useCallback(() => { jget('/api/testimonials/mine').then(d => setState(d.status === 'success' ? { canWrite: d.canWrite, mine: d.data } : null)).catch(() => setState(null)); }, []);
  useEffect(() => { load(); }, [load]);
  if (!state || (!state.canWrite && !state.mine)) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jsend('POST', '/api/testimonials', { text: v.text, rating: Number(v.rating), location: v.location || undefined, consent: v.consent });
    setMsg(d.message);
    if (d.status === 'success') { setV({ text: '', rating: '5', location: '', consent: false }); load(); }
  };
  return (
    <section className="bg-white border border-slate-200 p-5 space-y-3 text-xs" aria-label="Share your experience">
      <h3 className="text-sm font-extrabold">Share your experience</h3>
      {msg && <p className="font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2" role="status">{msg}</p>}
      {state.mine ? (
        <div className="space-y-1">
          <p>Your testimonial is <b>{state.mine.status}</b>{state.mine.status === 'approved' ? ' and shown on our home page' : state.mine.status === 'pending' ? ': our team will review it' : ''}.</p>
          <p className="text-slate-600">“{state.mine.text}”</p>
          <button className="font-bold text-rose-700 underline cursor-pointer" onClick={async () => { if (confirm('Remove your testimonial?')) { const d = await jsend('DELETE', '/api/testimonials/mine'); setMsg(d.message); load(); } }}>Remove it</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <textarea className={`${input} w-full`} rows={3} required minLength={30} maxLength={600} placeholder="What was your experience? (at least 30 characters)" value={v.text} onChange={e => setV({ ...v, text: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <select className={input} aria-label="Rating" value={v.rating} onChange={e => setV({ ...v, rating: e.target.value })}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}</select>
            <select className={input} aria-label="Where you live" value={v.location} onChange={e => setV({ ...v, location: e.target.value })}><option value="">Location (optional)</option>{MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" required checked={v.consent} onChange={e => setV({ ...v, consent: e.target.checked })} /><span>MedCred may publish my words on its home page with my first name and last initial. I can remove it at any time.</span></label>
          <button className="bg-[color:var(--t-600)] text-white font-bold px-4 py-2 cursor-pointer">Send for approval</button>
        </form>
      )}
    </section>
  );
}

/** Admins approve or reject testimonials before they appear on the landing page. */
export function TestimonialAdmin() {
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => { jget('/api/admin/testimonials').then(d => d.status === 'success' && setList(d.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (id: string, action: 'approve' | 'reject') => { const d = await jsend('POST', `/api/admin/testimonials/${id}/${action}`); setMsg(d.status === 'success' ? 'Saved.' : d.message); load(); };
  return (
    <section className="bg-white border border-slate-200 p-5 space-y-3 text-xs mt-6" aria-label="Testimonials">
      <h3 className="text-sm font-extrabold">Patient testimonials</h3>
      {msg && <p className="font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2" role="status">{msg}</p>}
      {list.length === 0 && <p className="text-slate-500">None yet. The home page shows this section only when at least one is approved.</p>}
      <ul className="space-y-2">{list.map(t => (
        <li key={t.id} className="border border-slate-200 p-3 space-y-1">
          <p><b>{t.name}</b>{t.location ? ` · ${t.location}` : ''}{t.rating ? ` · ${t.rating}★` : ''} · <b>{t.status}</b>{t.demo ? ' · DEMO' : ''} · {formatDate(t.createdAt)}</p>
          <p className="text-slate-700">“{t.text}”</p>
          {t.status !== 'approved' && <button className="font-bold text-emerald-700 cursor-pointer" onClick={() => act(t.id, 'approve')}>Approve</button>}{' '}
          {t.status !== 'rejected' && <button className="font-bold text-rose-700 cursor-pointer" onClick={() => act(t.id, 'reject')}>Reject</button>}
        </li>))}</ul>
    </section>
  );
}
