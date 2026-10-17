import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, Download, FolderOpen } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import PractitionerHeroBanner from './PractitionerHeroBanner';
import { formatMoney, formatDate } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const STATUS_LABEL: Record<string, string> = { enquiry: 'Enquiry', quoted: 'Quoted', accepted: 'Accepted', in_treatment: 'In treatment', completed: 'Completed', closed: 'Closed' };
const CATEGORIES: [string, string][] = [['procedure', 'Procedure'], ['doctor_fees', 'Doctor fees'], ['hospital_stay', 'Hospital stay'], ['tests', 'Tests'], ['medication', 'Medication'], ['follow_up', 'Follow-up'], ['interpreter', 'Interpreter'], ['transport', 'Transport'], ['accommodation', 'Accommodation'], ['other', 'Other']];
const ITIN: [string, string][] = [['arrival', 'Arrival'], ['consultation', 'Consultation'], ['tests', 'Tests'], ['procedure', 'Procedure'], ['recovery', 'Recovery'], ['follow_up', 'Follow-up'], ['discharge', 'Discharge'], ['departure', 'Departure'], ['other', 'Other']];
const input = 'border border-slate-300 p-1.5 text-xs bg-white';
const btn = 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold px-3 py-2 cursor-pointer';

interface TourismDeskProps {
  isAdmin: boolean;
  currentUser?: any;
  professionals?: any[];
  reviews?: any[];
  bookings?: any[];
}

/** Facility staff (practitioners assigned to a facility) work cases; admins also manage facilities. */
export default function TourismDesk({
  isAdmin,
  currentUser,
  professionals = [],
  reviews = [],
  bookings = [],
}: TourismDeskProps) {
  const [tab, setTab] = useState<'cases' | 'facilities'>('cases');
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { jget('/api/tourism/desk/me').then(d => d.status === 'success' && setMe(d.data)).catch(() => {}); }, []);

  const isPractitioner = currentUser?.role === 'practitioner' || (!isAdmin && currentUser);

  return (
    <div className="w-full space-y-0">
      {isPractitioner ? (
        <PractitionerHeroBanner
          currentUser={currentUser}
          professionals={professionals}
          reviews={reviews}
          bookings={bookings}
          groupName="Global Patient Services"
          tabs={[
            { id: 'cases', label: 'Cases', icon: FolderOpen },
            ...(isAdmin ? [{ id: 'facilities', label: 'Facilities', icon: Building2 }] : []),
          ]}
          activeTab={tab}
          onTabChange={t => { setTab(t as any); setOpen(null); }}
          tabsLabel="Global Patient Services Desk"
        />
      ) : (
        <DashboardHeader
          icon={Briefcase} eyebrow="Cross-Border Care & Referrals" title="Global Patient Services Desk"
          description="Manage international enquiries, review cross-border medical files, issue itemised hospital quotes, and author discharge summaries."
          tabs={[{ id: 'cases', label: 'Cases', icon: FolderOpen }, ...(isAdmin ? [{ id: 'facilities', label: 'Facilities', icon: Building2 }] : [])]}
          activeTab={tab} onTabChange={t => { setTab(t as any); setOpen(null); }}
        />
      )}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {tab === 'cases' && (me && me.facilities.length === 0
          ? <p className="text-sm bg-white border border-dashed border-slate-300 p-6 text-center text-slate-600">You are not assigned to a facility yet. An admin adds you from Global Patient Services &gt; Facilities.</p>
          : open ? <StaffCase id={open} onBack={() => setOpen(null)} /> : <CaseQueue onOpen={setOpen} />)}
        {tab === 'facilities' && isAdmin && <FacilityAdmin />}
      </div>
    </div>
  );
}

function CaseQueue({ onOpen }: { onOpen: (id: string) => void }) {
  const [list, setList] = useState<any[] | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => { jget(`/api/tourism/desk/cases${status ? `?status=${status}` : ''}`).then(d => setList(d.status === 'success' ? d.data : [])).catch(() => setList([])); }, [status]);
  return (
    <div className="space-y-3">
      <select className={input} value={status} onChange={e => setStatus(e.target.value)} aria-label="Status filter"><option value="">All open and closed</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {list && list.length === 0 && <p className="text-sm text-slate-500">No cases.</p>}
      <ul className="space-y-2">{list?.map(c => (
        <li key={c.id}><button onClick={() => onOpen(c.id)} className="w-full text-left bg-white border border-slate-200 hover:border-[color:var(--t-600)] p-3 cursor-pointer text-xs">
          <b>{c.patient}</b> ({c.country ?? '—'}) · {c.facility} · <span className="text-[color:var(--t-700)] font-bold">{STATUS_LABEL[c.status] ?? c.status}</span>
          <br />{c.summary}<br /><span className="text-slate-400">Updated {formatDate(c.updatedAt)}{c.preferredFrom ? ` · wants to arrive ${c.preferredFrom}` : ''}</span></button></li>))}</ul>
    </div>
  );
}

function StaffCase({ id, onBack }: { id: string; onBack: () => void }) {
  const [c, setC] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [text, setText] = useState('');
  const load = useCallback(() => { jget(`/api/tourism/cases/${id}`).then(d => d.status === 'success' && setC(d.data)).catch(() => {}); }, [id]);
  useEffect(() => { load(); }, [load]);
  const say = (d: any, ok = 'Saved.') => { setMsg(d.status === 'success' ? ok : d.message); if (d.status === 'success') load(); return d; };
  if (!c) return <p className="text-sm text-slate-500">Loading…</p>;
  const n = c.needs ?? {};
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold underline cursor-pointer">← All cases</button>
      {msg && <p className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2" role="status">{msg}</p>}
      <section className="bg-white border border-slate-200 p-5 text-xs space-y-1">
        <h2 className="font-extrabold text-base">{c.patient.name} · {c.homeCountry ?? '—'} · <span className="text-[color:var(--t-700)]">{STATUS_LABEL[c.status] ?? c.status}</span></h2>
        <p>{c.patient.email}</p><p className="text-sm">{c.summary}</p>
        <p>Dates: {c.preferredFrom ?? '—'} to {c.preferredTo ?? '—'} · Needs: {['interpreter', 'airportPickup', 'halalFood', 'prayerRoom', 'accommodation'].filter(k => n[k]).join(', ') || 'none'}{n.interpreterLanguage ? ` (${n.interpreterLanguage})` : ''}</p>
        <p>Documents: {c.files.length ? c.files.map((f: any) => <a key={f.id} className="underline font-bold mr-3 inline-flex items-center gap-1" href={`/api/tourism/cases/${id}/files/${f.id}`}><Download className="h-3 w-3" />{f.kind} · {f.name}</a>) : c.filesHidden ? 'the patient has not agreed to share their files' : 'none uploaded'}</p>
      </section>

      {['enquiry', 'quoted', 'accepted'].includes(c.status) && <QuoteBuilder caseId={id} onDone={say} />}
      {c.quotes.length > 0 && <section className="bg-white border border-slate-200 p-4 text-xs space-y-1"><h3 className="font-black uppercase tracking-wide">Quotes sent</h3>{c.quotes.map((q: any) => <p key={q.id}>v{q.version} · {q.status} · {formatMoney(q.total)} · valid to {q.validUntil}</p>)}</section>}

      <Itinerary c={c} onDone={say} />

      <section className="bg-white border border-slate-200 p-4 text-xs space-y-2">
        <h3 className="font-black uppercase tracking-wide">Treatment</h3>
        <div className="flex flex-wrap gap-2">
          {c.status === 'accepted' && <button className={btn} onClick={async () => say(await jsend('POST', `/api/tourism/desk/cases/${id}/status`, { status: 'in_treatment' }), 'Treatment started.')}>Start treatment</button>}
          {c.status === 'in_treatment' && c.discharge && <button className={btn} onClick={async () => say(await jsend('POST', `/api/tourism/desk/cases/${id}/status`, { status: 'completed' }), 'Completed.')}>Mark completed</button>}
        </div>
        {['in_treatment', 'completed'].includes(c.status) && <Discharge c={c} onDone={say} />}
      </section>

      <section className="bg-white border border-slate-200 p-4 text-xs space-y-2">
        <h3 className="font-black uppercase tracking-wide">Messages</h3>
        <ul className="space-y-1.5">{c.messages.map((m: any) => <li key={m.id} className={`p-2 border ${m.mine ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)]' : 'bg-slate-50 border-slate-200'}`}><b>{m.mine ? 'You' : m.senderName}</b> · {formatDate(m.ts)}<br />{m.text}</li>)}</ul>
        {c.status !== 'closed' && <form onSubmit={async e => { e.preventDefault(); const d = say(await jsend('POST', `/api/tourism/cases/${id}/messages`, { text }), 'Sent.'); if (d) setText(''); }} className="flex gap-2"><input className={`${input} flex-1`} value={text} onChange={e => setText(e.target.value)} placeholder="Reply to the patient" maxLength={2000} /><button className={btn}>Send</button></form>}
      </section>
    </div>
  );
}

function QuoteBuilder({ caseId, onDone }: { caseId: string; onDone: (d: any, ok?: string) => any }) {
  const blank = { label: '', category: 'procedure', amount: '' };
  const [items, setItems] = useState<any[]>([{ ...blank }]);
  const [f, setF] = useState({ inclusions: '', exclusions: '', cancellationTerms: '', paymentTerms: '', validUntil: '' });
  const set = (i: number, p: any) => setItems(items.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = onDone(await jsend('POST', `/api/tourism/desk/cases/${caseId}/quotes`, { ...f, items: items.map(i => ({ ...i, amount: Number(i.amount) })) }), 'Quote sent to the patient.');
    if (d) setItems([{ ...blank }]);
  };
  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 p-4 text-xs space-y-2">
      <h3 className="font-black uppercase tracking-wide">Send a quote (package price)</h3>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_9rem_7rem_auto] gap-2">
          <input className={input} required placeholder="Item (e.g. Knee replacement, 5 nights ward)" value={it.label} onChange={e => set(i, { label: e.target.value })} />
          <select className={input} value={it.category} onChange={e => set(i, { category: e.target.value })}>{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input className={input} required type="number" min={0} step="0.01" placeholder="RM" value={it.amount} onChange={e => set(i, { amount: e.target.value })} />
          <button type="button" className="text-rose-700 font-bold cursor-pointer" onClick={() => items.length > 1 && setItems(items.filter((_, k) => k !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="font-bold underline cursor-pointer" onClick={() => setItems([...items, { ...blank }])}>Add item</button>
      <p className="font-bold">Subtotal {formatMoney(total)} <span className="font-normal text-slate-500">(service tax is added automatically where it applies)</span></p>
      <textarea className={`${input} w-full`} rows={2} placeholder="Included (optional)" value={f.inclusions} onChange={e => setF({ ...f, inclusions: e.target.value })} />
      <textarea className={`${input} w-full`} rows={2} required placeholder="NOT included (required): complications, extra nights, flights, visa…" value={f.exclusions} onChange={e => setF({ ...f, exclusions: e.target.value })} />
      <textarea className={`${input} w-full`} rows={2} required placeholder="Cancellation and refund terms (required)" value={f.cancellationTerms} onChange={e => setF({ ...f, cancellationTerms: e.target.value })} />
      <input className={`${input} w-full`} placeholder="Payment terms (optional)" value={f.paymentTerms} onChange={e => setF({ ...f, paymentTerms: e.target.value })} />
      <label className="flex items-center gap-2">Valid until <input className={input} type="date" required value={f.validUntil} onChange={e => setF({ ...f, validUntil: e.target.value })} /></label>
      <button className={btn}>Send quote</button>
    </form>
  );
}

function Itinerary({ c, onDone }: { c: any; onDone: (d: any, ok?: string) => any }) {
  const [v, setV] = useState({ date: '', kind: 'arrival', title: '', note: '' });
  return (
    <section className="bg-white border border-slate-200 p-4 text-xs space-y-2">
      <h3 className="font-black uppercase tracking-wide">Itinerary</h3>
      <ul className="space-y-1">{c.itinerary.map((i: any) => <li key={i.id}><b>{i.date}</b> · {i.title}{i.note ? ` — ${i.note}` : ''} <button className="text-rose-700 font-bold cursor-pointer" onClick={async () => onDone(await jsend('DELETE', `/api/tourism/desk/cases/${c.id}/itinerary/${i.id}`), 'Removed.')}>remove</button></li>)}</ul>
      {c.status !== 'closed' && (
        <form onSubmit={async e => { e.preventDefault(); const d = onDone(await jsend('POST', `/api/tourism/desk/cases/${c.id}/itinerary`, v), 'Added. The patient was notified.'); if (d) setV({ ...v, title: '', note: '' }); }} className="flex flex-wrap gap-2">
          <input type="date" className={input} required value={v.date} onChange={e => setV({ ...v, date: e.target.value })} />
          <select className={input} value={v.kind} onChange={e => setV({ ...v, kind: e.target.value })}>{ITIN.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input className={`${input} flex-1 min-w-[10rem]`} required placeholder="Title (e.g. Airport pickup 14:00)" value={v.title} onChange={e => setV({ ...v, title: e.target.value })} />
          <input className={`${input} flex-1 min-w-[8rem]`} placeholder="Note" value={v.note} onChange={e => setV({ ...v, note: e.target.value })} />
          <button className={btn}>Add</button>
        </form>
      )}
    </section>
  );
}

function Discharge({ c, onDone }: { c: any; onDone: (d: any, ok?: string) => any }) {
  const [s, setS] = useState(c.discharge?.summary ?? '');
  const [p, setP] = useState(c.discharge?.followUpPlan ?? '');
  return (
    <form onSubmit={async e => { e.preventDefault(); onDone(await jsend('POST', `/api/tourism/desk/cases/${c.id}/discharge`, { summary: s, followUpPlan: p }), 'Discharge summary saved. The patient was notified.'); }} className="space-y-2">
      <p className="font-bold">Discharge summary (written by the treating doctor)</p>
      <textarea className={`${input} w-full`} rows={4} required minLength={20} maxLength={4000} value={s} onChange={e => setS(e.target.value)} placeholder="Procedure done, findings, medicines at discharge, wound care…" />
      <textarea className={`${input} w-full`} rows={2} maxLength={2000} value={p} onChange={e => setP(e.target.value)} placeholder="Follow-up plan for the patient and their home doctor" />
      <button className={btn}>{c.discharge ? 'Update summary' : 'Save summary'}</button>
    </form>
  );
}

// ───────── admin: facilities ─────────
function FacilityAdmin() {
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [nf, setNf] = useState({ name: '', kind: 'hospital', city: '', state: '', languages: '', specialties: '' });
  const load = useCallback(() => { jget('/api/admin/tourism/facilities').then(d => d.status === 'success' && setList(d.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const say = (d: any, ok = 'Saved.') => { setMsg(d.status === 'success' ? ok : d.message); if (d.status === 'success') load(); };
  const csv = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-xs">
      {msg && <p className="font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2" role="status">{msg}</p>}
      <form onSubmit={async e => { e.preventDefault(); say(await jsend('POST', '/api/admin/tourism/facilities', { ...nf, languages: csv(nf.languages), specialties: csv(nf.specialties), acceptsInternational: true, services: {} }), 'Facility added. Now record its licence and accreditation, and assign staff.'); setNf({ name: '', kind: 'hospital', city: '', state: '', languages: '', specialties: '' }); }} className="bg-white border border-slate-200 p-4 grid grid-cols-2 gap-2">
        <h3 className="col-span-2 font-black uppercase tracking-wide">Add a facility</h3>
        <input className={input} required placeholder="Name" value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} />
        <select className={input} value={nf.kind} onChange={e => setNf({ ...nf, kind: e.target.value })}><option value="hospital">Hospital</option><option value="specialist_centre">Specialist centre</option><option value="clinic">Clinic</option><option value="dental">Dental</option></select>
        <input className={input} placeholder="City" value={nf.city} onChange={e => setNf({ ...nf, city: e.target.value })} />
        <input className={input} placeholder="State" value={nf.state} onChange={e => setNf({ ...nf, state: e.target.value })} />
        <input className={input} placeholder="Languages (comma-separated)" value={nf.languages} onChange={e => setNf({ ...nf, languages: e.target.value })} />
        <input className={input} placeholder="Specialties (comma-separated)" value={nf.specialties} onChange={e => setNf({ ...nf, specialties: e.target.value })} />
        <button className={`${btn} col-span-2`}>Add facility</button>
      </form>
      {list.map(f => <FacilityRow key={f.id} f={f} say={say} />)}
    </div>
  );
}

function FacilityRow({ f, say }: { f: any; say: (d: any, ok?: string) => void; key?: React.Key }) {
  const [lic, setLic] = useState({ licenceNo: '', licenceExpiry: '', reference: '', confirmed: false });
  const [acc, setAcc] = useState({ body: 'JCI', number: '', validUntil: '', reference: '', confirmed: false });
  const [email, setEmail] = useState('');
  return (
    <details className="bg-white border border-slate-200 p-4" open={!!f.hiddenReason}>
      <summary className="cursor-pointer font-bold">{f.name} · {f.city ?? ''} {f.hiddenReason ? <span className="text-rose-700"> · hidden: {f.hiddenReason}</span> : <span className="text-emerald-700"> · listed</span>}</summary>
      <div className="space-y-3 mt-3">
        <p>Licence: {f.licenceChecked ? `checked, expires ${f.licenceExpiry}` : <b className="text-amber-700">not checked</b>} · Accreditation: {f.allAccreditations.length ? f.allAccreditations.map((a: any) => `${a.body} ${a.number} to ${a.validUntil}`).join('; ') : 'none verified'}</p>
        <p>Staff: {f.staff.map((s: any) => <span key={s.id} className="mr-2">{s.name} ({s.email}) <button className="text-rose-700 font-bold cursor-pointer" onClick={async () => say(await jsend('DELETE', `/api/admin/tourism/facilities/${f.id}/staff/${s.id}`), 'Removed.')}>×</button></span>)}{f.staff.length === 0 && 'none'}</p>
        <form onSubmit={async e => { e.preventDefault(); say(await jsend('POST', `/api/admin/tourism/facilities/${f.id}/staff`, { email }), 'Staff added.'); setEmail(''); }} className="flex gap-2"><input className={input} placeholder="Practitioner email to add as staff" value={email} onChange={e => setEmail(e.target.value)} required /><button className={btn}>Add staff</button></form>
        <form onSubmit={async e => { e.preventDefault(); say(await jsend('POST', `/api/admin/tourism/facilities/${f.id}/licence`, lic), 'Licence recorded.'); }} className="grid grid-cols-2 gap-2 border border-slate-100 p-2">
          <p className="col-span-2 font-bold">Record the MOH facility licence check</p>
          <input className={input} required placeholder="Licence number" value={lic.licenceNo} onChange={e => setLic({ ...lic, licenceNo: e.target.value })} />
          <input className={input} required type="date" value={lic.licenceExpiry} onChange={e => setLic({ ...lic, licenceExpiry: e.target.value })} />
          <input className={`${input} col-span-2`} required placeholder="How you checked it (who confirmed, reference)" value={lic.reference} onChange={e => setLic({ ...lic, reference: e.target.value })} />
          <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={lic.confirmed} onChange={e => setLic({ ...lic, confirmed: e.target.checked })} />I checked this with the regulator</label>
          <button className={btn}>Record licence</button>
        </form>
        <form onSubmit={async e => { e.preventDefault(); say(await jsend('POST', `/api/admin/tourism/facilities/${f.id}/accreditations`, acc), 'Accreditation recorded.'); }} className="grid grid-cols-2 gap-2 border border-slate-100 p-2">
          <p className="col-span-2 font-bold">Record a JCI or MSQH accreditation you verified</p>
          <select className={input} value={acc.body} onChange={e => setAcc({ ...acc, body: e.target.value })}><option value="JCI">JCI</option><option value="MSQH">MSQH</option><option value="other">Other</option></select>
          <input className={input} required placeholder="Certificate number" value={acc.number} onChange={e => setAcc({ ...acc, number: e.target.value })} />
          <input className={input} required type="date" value={acc.validUntil} onChange={e => setAcc({ ...acc, validUntil: e.target.value })} />
          <input className={input} required placeholder="How you checked it" value={acc.reference} onChange={e => setAcc({ ...acc, reference: e.target.value })} />
          <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={acc.confirmed} onChange={e => setAcc({ ...acc, confirmed: e.target.checked })} />I checked this with the accrediting body</label>
          <button className={btn}>Record accreditation</button>
        </form>
        <button className="font-bold underline cursor-pointer" onClick={async () => say(await jsend('POST', `/api/admin/tourism/facilities/${f.id}/active`, { active: !f.active }), 'Updated.')}>{f.active ? 'Hide this facility' : 'List this facility'}</button>
      </div>
    </details>
  );
}
