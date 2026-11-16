import React, { useCallback, useEffect, useState } from 'react';
import { useTr } from '../../locale';

interface Pending { id: string; name: string; kind: string; city: string | null; state: string | null; phone: string | null; email: string | null; licenceNo: string | null; accreditationClaims: { body: string; number: string; validUntil: string }[] }

const post = (url: string, body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

/** Facilities that registered themselves and are waiting for the board. Approving makes them public; rejecting needs a reason. */
export default function AdminFacilityApprovals() {
  const tx = useTr();
  const [list, setList] = useState<Pending[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => fetch('/api/admin/facilities/pending').then(r => r.json()).then(r => setList(r.status === 'success' ? r.data : [])).catch(() => setList([])), []);
  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setMsg(null);
    const r = await post(`/api/admin/facilities/${id}/approval`, { decision, note: notes[id] ?? '' });
    if (r.status === 'success') load(); else setMsg(r.message || tx('Could not save.'));
  };

  if (!list || list.length === 0) return null;
  return (
    <section aria-labelledby="fa-h" className="app-card space-y-3 mb-4">
      <h2 id="fa-h" className="text-sm font-extrabold">{tx('Facilities waiting for approval')} ({list.length})</h2>
      {msg && <p role="alert" className="text-xs font-bold p-3 border text-rose-900 bg-rose-50 border-rose-200">{msg}</p>}
      <ul className="divide-y divide-[color:var(--t-100)]">
        {list.map(f => (
          <li key={f.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
            <div className="text-xs space-y-0.5 min-w-0">
              <p className="font-extrabold text-sm">{f.name} <span className="font-normal text-slate-600">({f.kind})</span></p>
              <p>{[f.city, f.state].filter(Boolean).join(', ') || '—'} · {f.email ?? '—'} · {f.phone ?? '—'}</p>
              <p>{tx('Licence number')}: <span className="font-mono">{f.licenceNo ?? '—'}</span> <span className="text-slate-600">({tx('check it with the regulator, then record it under the facility')})</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`fa-n-${f.id}`}>{tx('Reason (needed to reject)')}</label>
              <input id={`fa-n-${f.id}`} className="form-input" placeholder={tx('Reason (needed to reject)')} value={notes[f.id] ?? ''} onChange={e => setNotes({ ...notes, [f.id]: e.target.value })} />
              <button type="button" className="btn btn-sm btn-primary" onClick={() => decide(f.id, 'approve')}>{tx('Approve')}</button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => decide(f.id, 'reject')}>{tx('Reject')}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
