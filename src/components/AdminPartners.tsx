import React, { useCallback, useEffect, useState } from 'react';

const jreq = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');
const STATUSES = ['new', 'contacted', 'onboarded', 'declined'] as const;
type Status = typeof STATUSES[number];

interface Row { id: string; kind: 'clinic' | 'pharmacy'; org_name: string; contact_name: string; email: string; phone: string; city: string; state: string; licence_no: string | null; message: string | null; status: Status; note: string | null; consent_at: string; created_at: string }

/** Admin: clinics and pharmacies that asked to join from the public pages. The board creates their accounts. */
export default function AdminPartners({ say }: { say: (t: string) => void }) {
  const [view, setView] = useState<Status | 'all'>('new');
  const [data, setData] = useState<{ counts: Record<Status, number>; rows: Row[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => jreq(`/api/admin/partner-enquiries${view === 'all' ? '' : `?status=${view}`}`).then(d => d.status === 'success' && setData(d.data)), [view]);
  useEffect(() => { load(); }, [load]);

  const move = async (r: Row, status: Status) => {
    const d = await jreq(`/api/admin/partner-enquiries/${r.id}/status`, 'POST', { status, note: note.trim() || undefined });
    if (d.status === 'success') { say(`${r.org_name}: ${status}`); setNote(''); load(); } else say(d.message || 'Could not update.');
  };
  const remove = async (r: Row) => {
    if (!window.confirm(`Delete the enquiry from ${r.org_name}? Its contact details will be removed for good.`)) return;
    const d = await jreq(`/api/admin/partner-enquiries/${r.id}`, 'DELETE');
    if (d.status === 'success') { setOpen(null); load(); } else say(d.message || 'Could not delete.');
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600 max-w-2xl">Clinics, hospitals and pharmacies that asked to join. You create their accounts (Pharmacies and Medical tourism &gt; Facilities). These are a business contact&apos;s personal details: delete declined enquiries rather than keeping them.</p>
      <div className="flex flex-wrap gap-2 text-xs font-bold" role="tablist" aria-label="Enquiry status">
        {(['new', 'contacted', 'onboarded', 'declined', 'all'] as const).map(v => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`px-3 py-1.5 cursor-pointer ${view === v ? 'bg-[color:var(--t-600)] text-white' : 'bg-slate-100'}`}>
            {v}{v !== 'all' && data ? ` (${data.counts[v]})` : ''}
          </button>
        ))}
      </div>
      <ul className="bg-white border border-slate-200 divide-y divide-slate-100 text-xs">
        {data && data.rows.length === 0 && <li className="p-4 text-xs text-slate-500">No enquiries here.</li>}
        {(data?.rows ?? []).map(r => (
          <li key={r.id}>
            <button type="button" onClick={() => { setOpen(open === r.id ? null : r.id); setNote(r.note ?? ''); }} aria-expanded={open === r.id} className="w-full text-left p-3 cursor-pointer hover:bg-slate-50">
              <p className="font-bold">{r.org_name} <span className="text-2xs font-extrabold uppercase bg-slate-100 px-1.5 py-0.5 ml-1">{r.kind}</span> <span className="text-2xs font-extrabold uppercase bg-[color:var(--t-50)] text-[color:var(--t-800)] px-1.5 py-0.5 ml-1">{r.status}</span></p>
              <p className="text-xs text-slate-600">{r.city}, {r.state} · {when(r.created_at)} · {r.id}</p>
            </button>
            {open === r.id && (
              <div className="px-3 pb-4 space-y-3 text-xs">
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <div><dt className="font-extrabold text-slate-500 uppercase text-xs">Contact</dt><dd>{r.contact_name}</dd></div>
                  <div><dt className="font-extrabold text-slate-500 uppercase text-xs">Email</dt><dd><a className="underline text-[color:var(--t-700)]" href={`mailto:${r.email}`}>{r.email}</a></dd></div>
                  <div><dt className="font-extrabold text-slate-500 uppercase text-xs">Phone</dt><dd><a className="underline text-[color:var(--t-700)]" href={`tel:${r.phone}`}>{r.phone}</a></dd></div>
                  <div><dt className="font-extrabold text-slate-500 uppercase text-xs">Licence number given</dt><dd>{r.licence_no ?? 'none'}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-extrabold text-slate-500 uppercase text-xs">Message</dt><dd className="whitespace-pre-wrap">{r.message ?? 'none'}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-extrabold text-slate-500 uppercase text-xs">Agreed to be contacted</dt><dd>{when(r.consent_at)}</dd></div>
                </dl>
                <label className="block"><span className="font-extrabold text-slate-500 uppercase text-xs block mb-1">Note for the team</span>
                  <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2} className="w-full border border-slate-200 px-3 py-2 text-xs" />
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter(s => s !== r.status).map(s => <button key={s} type="button" onClick={() => move(r, s)} className="px-3 min-h-[36px] border border-slate-300 font-bold cursor-pointer hover:bg-slate-50">Mark {s}</button>)}
                  <button type="button" onClick={() => remove(r)} className="px-3 min-h-[36px] border border-rose-300 text-rose-800 font-bold cursor-pointer hover:bg-rose-50 ml-auto">Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
