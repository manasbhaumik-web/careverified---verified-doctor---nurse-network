import React, { useCallback, useEffect, useState } from 'react';
import { Plane, Search, FolderOpen, Info, BadgeCheck, Languages, Utensils, Car, HeartHandshake, Building2, Download, Trash2 } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { formatMoney, formatDate } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

type Tab = 'find' | 'cases' | 'info';
const STATUS_LABEL: Record<string, string> = { enquiry: 'Enquiry sent', quoted: 'Quote received', accepted: 'Quote accepted', in_treatment: 'In treatment', completed: 'Completed', closed: 'Closed' };
const CATEGORY_LABEL: Record<string, string> = {
  procedure: 'Procedure', doctor_fees: 'Doctor fees', hospital_stay: 'Hospital stay', tests: 'Tests', medication: 'Medication', follow_up: 'Follow-up', interpreter: 'Interpreter', transport: 'Transport', accommodation: 'Accommodation', other: 'Other',
};
const SERVICE_LABEL: Record<string, string> = { interpreter: 'Interpreter', airportPickup: 'Airport pickup', halalFood: 'Halal food', prayerRoom: 'Prayer room' };
const input = 'border border-slate-300 p-2 text-xs bg-white';

export type MedicalTourismTab = 'find' | 'cases' | 'info';

interface MedicalTourismProps {
  onOpenProfessional?: (id: string) => void;
  embedded?: boolean;
  activeTab?: MedicalTourismTab;
  onTabChange?: (tab: MedicalTourismTab) => void;
}

/** Visitors and patients: find facilities that accept international patients, send an enquiry, follow the case. */
export default function MedicalTourism({
  onOpenProfessional,
  embedded = false,
  activeTab: controlledActiveTab,
  onTabChange: setControlledActiveTab,
}: MedicalTourismProps) {
  const [internalTab, setInternalTab] = useState<MedicalTourismTab>('find');
  const [openCase, setOpenCase] = useState<string | null>(null);
  const tab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const setTab = (t: MedicalTourismTab) => {
    if (setControlledActiveTab) setControlledActiveTab(t);
    setInternalTab(t);
    setOpenCase(null);
  };
  return (
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-0"}>
      {!embedded && (
        <DashboardHeader
          icon={Plane}
          eyebrow="Cross-Border & International Patients"
          title="Global Patient Services"
          description="Find verified hospital centres in Malaysia welcoming international patients, receive transparent itemised quotations, and manage travel itineraries, documents, and discharge summaries in one secure portal."
          tabs={[{ id: 'find', label: 'Find a facility', icon: Search }, { id: 'cases', label: 'My cases', icon: FolderOpen }, { id: 'info', label: 'Travel information', icon: Info }]}
          activeTab={tab}
          onTabChange={t => setTab(t as MedicalTourismTab)}
        />
      )}
      <div className={embedded ? "space-y-5 pt-2" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
        {tab === 'find' && <Facilities onSent={id => { setOpenCase(id); setTab('cases'); }} />}
        {tab === 'cases' && (openCase ? <CaseDetail id={openCase} onBack={() => setOpenCase(null)} onOpenProfessional={onOpenProfessional} /> : <CaseList onOpen={setOpenCase} />)}
        {tab === 'info' && <TravelInfo />}
      </div>
    </div>
  );
}

// ───────── facilities ─────────
function Facilities({ onSent }: { onSent: (caseId: string) => void }) {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ q: '', specialty: '', language: '', accreditation: '', service: '' });
  const [enquire, setEnquire] = useState<any | null>(null);
  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
    jget(`/api/tourism/facilities?${qs}`).then(d => d.status === 'success' && setList(d.data)).catch(() => {});
  }, [f]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input className={input} placeholder="Name or city" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} aria-label="Search" />
        <input className={input} placeholder="Specialty (e.g. cardiology)" value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value })} aria-label="Specialty" />
        <input className={input} placeholder="Language (e.g. Arabic)" value={f.language} onChange={e => setF({ ...f, language: e.target.value })} aria-label="Language" />
        <select className={input} value={f.accreditation} onChange={e => setF({ ...f, accreditation: e.target.value })} aria-label="Accreditation"><option value="">Any accreditation</option><option value="JCI">JCI</option><option value="MSQH">MSQH</option></select>
        <select className={input} value={f.service} onChange={e => setF({ ...f, service: e.target.value })} aria-label="Service"><option value="">Any service</option>{Object.entries(SERVICE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {list.length === 0 && <p className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 p-6 text-center">No facilities match yet. Facilities appear here after our team has checked their licence.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map(fa => (
          <article key={fa.id} className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-[color:var(--t-600)]" />{fa.name}</h3>
                <p className="text-xs text-slate-600">{[fa.city, fa.state].filter(Boolean).join(', ')}</p>
              </div>
              {fa.mhtcMember && <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-sky-300 bg-sky-50 text-sky-900">MHTC member</span>}
            </div>
            {fa.description && <p className="text-xs text-slate-700 leading-relaxed">{fa.description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {fa.accreditations.map((a: any) => <span key={a.body} className="text-[10px] font-black uppercase px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-900 inline-flex items-center gap-1"><BadgeCheck className="h-3 w-3" />{a.body} checked · to {a.validUntil}</span>)}
              {fa.accreditations.length === 0 && <span className="text-[10px] text-slate-500">No accreditation verified by us yet</span>}
              {fa.licenceChecked && <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-900">Licence checked</span>}
            </div>
            <p className="text-xs text-slate-600 flex gap-1.5"><Languages className="h-3.5 w-3.5 mt-0.5 shrink-0" />{fa.languages.join(', ') || 'Languages not listed'}</p>
            <p className="text-xs text-slate-600"><b>Specialties:</b> {fa.specialties.join(', ') || '—'}</p>
            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(SERVICE_LABEL).filter(([k]) => fa.services[k]).map(([k, l]) => <span key={k} className="inline-flex items-center gap-1">{k === 'halalFood' ? <Utensils className="h-3 w-3" /> : k === 'airportPickup' ? <Car className="h-3 w-3" /> : <HeartHandshake className="h-3 w-3" />}{l}</span>)}
              {fa.services.accommodationPartners?.length > 0 && <span>Stay: {fa.services.accommodationPartners.join(', ')}</span>}
            </div>
            {fa.practitioners.length > 0 && <p className="text-xs text-slate-600"><b>Doctors:</b> {fa.practitioners.map((p: any) => `${p.name} (${p.specialization})`).join(' · ')}</p>}
            <button onClick={() => setEnquire(fa)} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold px-4 py-2 cursor-pointer">Send an enquiry</button>
          </article>
        ))}
      </div>
      {enquire && <EnquiryForm facility={enquire} onClose={() => setEnquire(null)} onSent={onSent} />}
    </div>
  );
}

function EnquiryForm({ facility, onClose, onSent }: { facility: any; onClose: () => void; onSent: (id: string) => void }) {
  const [v, setV] = useState({ summary: '', specialty: '', homeCountry: '', preferredFrom: '', preferredTo: '', interpreterLanguage: '', consent: false, shareDocuments: false, practitionerId: '' });
  const [needs, setNeeds] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const d = await jsend('POST', '/api/tourism/cases', { facilityId: facility.id, ...v, practitionerId: v.practitionerId || undefined, preferredFrom: v.preferredFrom || undefined, preferredTo: v.preferredTo || undefined, needs: { ...needs, interpreterLanguage: v.interpreterLanguage } });
    if (d.status === 'success') onSent(d.data.id); else setErr(d.message);
  };
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Enquiry">
      <form onSubmit={submit} className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3 border border-slate-300 shadow-2xl">
        <h3 className="font-black">Enquiry to {facility.name}</h3>
        <textarea className={`${input} w-full`} rows={4} required minLength={20} maxLength={2000} placeholder="What treatment are you looking for? Include your diagnosis and any previous treatment." value={v.summary} onChange={e => setV({ ...v, summary: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Specialty (optional)" value={v.specialty} onChange={e => setV({ ...v, specialty: e.target.value })} />
          <input className={input} placeholder="Home country code (e.g. SA)" maxLength={2} value={v.homeCountry} onChange={e => setV({ ...v, homeCountry: e.target.value.toUpperCase() })} />
          <label className="text-xs">Arrive from <input type="date" className={`${input} w-full`} value={v.preferredFrom} onChange={e => setV({ ...v, preferredFrom: e.target.value })} /></label>
          <label className="text-xs">Leave by <input type="date" className={`${input} w-full`} value={v.preferredTo} onChange={e => setV({ ...v, preferredTo: e.target.value })} /></label>
        </div>
        {facility.practitioners.length > 0 && (
          <select className={`${input} w-full`} value={v.practitionerId} onChange={e => setV({ ...v, practitionerId: e.target.value })} aria-label="Preferred doctor">
            <option value="">No preferred doctor</option>
            {facility.practitioners.map((p: any) => <option key={p.id} value={p.id}>{p.name} · {p.specialization}</option>)}
          </select>
        )}
        <fieldset className="border border-slate-200 p-3 text-xs space-y-1.5">
          <legend className="px-1 font-bold">What help do you need?</legend>
          {[['interpreter', 'Interpreter'], ['airportPickup', 'Airport pickup'], ['halalFood', 'Halal food'], ['prayerRoom', 'Prayer room'], ['accommodation', 'Help finding accommodation']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={!!needs[k]} onChange={e => setNeeds({ ...needs, [k]: e.target.checked })} />{l}</label>
          ))}
          {needs.interpreter && <input className={`${input} w-full`} placeholder="Language" value={v.interpreterLanguage} onChange={e => setV({ ...v, interpreterLanguage: e.target.value })} />}
        </fieldset>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={v.shareDocuments} onChange={e => setV({ ...v, shareDocuments: e.target.checked })} /><span>The facility may open the passport copy and medical records I upload for this case. (You can change this later.)</span></label>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" required checked={v.consent} onChange={e => setV({ ...v, consent: e.target.checked })} /><span>I agree that MedCred sends this enquiry, with my name, email and country, to {facility.name}. This is not a booking and does not create a doctor-patient relationship.</span></label>
        {err && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2">{err}</p>}
        <div className="flex gap-3"><button className="bg-[color:var(--t-600)] text-white text-xs font-bold px-4 py-2 cursor-pointer">Send enquiry</button><button type="button" onClick={onClose} className="text-xs font-bold cursor-pointer">Cancel</button></div>
      </form>
    </div>
  );
}

// ───────── cases ─────────
function CaseList({ onOpen }: { onOpen: (id: string) => void }) {
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { jget('/api/tourism/cases').then(d => setList(d.status === 'success' ? d.data : [])).catch(() => setList([])); }, []);
  if (!list) return <p className="text-sm text-slate-500">Loading…</p>;
  if (list.length === 0) return <p className="text-sm text-slate-500 bg-white border border-dashed border-slate-300 p-6 text-center">No cases yet. Find a facility and send an enquiry.</p>;
  return (
    <ul className="space-y-2">
      {list.map(c => (
        <li key={c.id}><button onClick={() => onOpen(c.id)} className="w-full text-left bg-white border border-slate-200 hover:border-[color:var(--t-600)] p-4 cursor-pointer">
          <p className="font-bold text-sm">{c.facility} · <span className="text-[color:var(--t-700)]">{STATUS_LABEL[c.status] ?? c.status}</span></p>
          <p className="text-xs text-slate-600">{c.summary}</p><p className="text-[11px] text-slate-400 mt-1">Updated {formatDate(c.updatedAt)}</p>
        </button></li>
      ))}
    </ul>
  );
}

function CaseDetail({ id, onBack, onOpenProfessional }: { id: string; onBack: () => void; onOpenProfessional?: (id: string) => void }) {
  const [c, setC] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState('passport');
  const [problem, setProblem] = useState('');
  const [shareLink, setShareLink] = useState('');
  const load = useCallback(() => { jget(`/api/tourism/cases/${id}`).then(d => d.status === 'success' && setC(d.data)).catch(() => {}); }, [id]);
  useEffect(() => { load(); }, [load]);
  const say = (d: any, ok = 'Done.') => { setMsg(d.status === 'success' ? d.message || ok : d.message); if (d.status === 'success') load(); };

  if (!c) return <p className="text-sm text-slate-500">Loading…</p>;
  const open = ['enquiry', 'quoted', 'accepted', 'in_treatment'].includes(c.status);
  const upload = async (file: File) => {
    const fd = new FormData(); fd.append('kind', kind); fd.append('file', file);
    say(await fetch(`/api/tourism/cases/${id}/files`, { method: 'POST', body: fd }).then(r => r.json()), 'Uploaded.');
  };
  const sh = (p: Record<string, unknown>) => jsend('POST', `/api/tourism/cases/${id}/share`, p);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold underline cursor-pointer">← All cases</button>
      {msg && <p className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2" role="status">{msg}</p>}
      <section className="bg-white border border-slate-200 p-5 space-y-1">
        <h2 className="font-extrabold">{c.facility?.name} · <span className="text-[color:var(--t-700)]">{STATUS_LABEL[c.status] ?? c.status}</span></h2>
        <p className="text-sm text-slate-700">{c.summary}</p>
        <p className="text-xs text-slate-500">{c.facility?.phone} · {c.facility?.email}{c.practitioner ? ` · Doctor: ${c.practitioner.name}` : ''}</p>
        {c.practitioner && onOpenProfessional && <button className="text-xs font-bold underline cursor-pointer" onClick={() => onOpenProfessional(c.practitioner.id)}>Book a video consultation with {c.practitioner.name}</button>}
        <p className="text-[11px] text-slate-500">A video consultation with a Malaysian doctor from your home country is possible before or after treatment. The doctor cannot give emergency care or issue e-prescriptions to you abroad.</p>
      </section>

      {/* Quotes */}
      <section className="bg-white border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide">Quotes</h3>
        {c.quotes.length === 0 && <p className="text-xs text-slate-500">No quote yet. The facility will send an itemised price.</p>}
        {c.quotes.map((q: any) => (
          <div key={q.id} className={`border p-3 text-xs space-y-2 ${q.status === 'sent' ? 'border-[color:var(--t-600)]' : 'border-slate-200 opacity-80'}`}>
            <p className="font-bold">Version {q.version} · {q.status} · valid until {q.validUntil}</p>
            <table className="w-full"><tbody>
              {q.items.map((i: any, k: number) => <tr key={k} className="border-b border-slate-100"><td className="py-1">{i.label} <span className="text-slate-400">({CATEGORY_LABEL[i.category] ?? i.category})</span></td><td className="text-right tabular-nums">{formatMoney(i.amountSen / 100)}</td></tr>)}
              {q.tax > 0 && <tr><td className="py-1">Service tax (SST) {q.taxRatePct}% on healthcare services</td><td className="text-right tabular-nums">{formatMoney(q.tax)}</td></tr>}
              <tr className="font-black"><td className="pt-1">Total</td><td className="text-right tabular-nums pt-1">{formatMoney(q.total)}</td></tr>
            </tbody></table>
            {q.inclusions && <p><b>Included:</b> {q.inclusions}</p>}
            <p className="bg-amber-50 border border-amber-200 p-2"><b>Not included:</b> {q.exclusions}</p>
            <p><b>Cancellation and refunds:</b> {q.cancellationTerms}</p>
            {q.paymentTerms && <p><b>Payment:</b> {q.paymentTerms}</p>}
            {q.status === 'sent' && c.status === 'quoted' && <QuoteDecision caseId={id} quoteId={q.id} onDone={d => say(d, 'Recorded.')} />}
          </div>
        ))}
        <p className="text-[11px] text-slate-500">Payment is arranged directly with the facility; MedCred does not take your package payment.</p>
      </section>

      {/* Itinerary */}
      {c.itinerary.length > 0 && (
        <section className="bg-white border border-slate-200 p-5"><h3 className="text-sm font-black uppercase tracking-wide mb-2">Itinerary</h3>
          <ol className="space-y-1.5 text-xs">{c.itinerary.map((i: any) => <li key={i.id}><b>{i.date}</b> · {i.title}{i.note ? ` — ${i.note}` : ''}</li>)}</ol></section>
      )}

      {/* Documents */}
      <section className="bg-white border border-slate-200 p-5 space-y-2 text-xs">
        <h3 className="text-sm font-black uppercase tracking-wide">Documents and records</h3>
        <ul className="space-y-1">{c.files.map((f: any) => (
          <li key={f.id} className="flex items-center gap-3"><span>{f.kind.replace('_', ' ')} · {f.name}</span>
            <a href={`/api/tourism/cases/${id}/files/${f.id}`} className="font-bold underline inline-flex items-center gap-1"><Download className="h-3 w-3" />Download</a>
            <button onClick={async () => { if (confirm('Delete this file?')) say(await jsend('DELETE', `/api/tourism/cases/${id}/files/${f.id}`), 'Deleted.'); }} className="text-rose-700 font-bold cursor-pointer inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</button></li>))}</ul>
        {open && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={input} value={kind} onChange={e => setKind(e.target.value)} aria-label="Document type"><option value="passport">Passport copy</option><option value="medical_records">Medical records</option><option value="visa_letter">Visa / support letter</option><option value="other">Other</option></select>
            <input type="file" accept="application/pdf,image/jpeg,image/png" aria-label="Choose a file" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          </div>
        )}
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={c.shareDocuments} onChange={async e => say(await jsend('POST', `/api/tourism/cases/${id}/sharing`, { shareDocuments: e.target.checked }), 'Updated.')} /><span>The facility may open these files. Untick to stop sharing at any time.</span></label>
      </section>

      {/* Messages */}
      <section className="bg-white border border-slate-200 p-5 space-y-2 text-xs">
        <h3 className="text-sm font-black uppercase tracking-wide">Messages</h3>
        <ul className="space-y-1.5">{c.messages.map((m: any) => <li key={m.id} className={`p-2 border ${m.mine ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)]' : 'bg-slate-50 border-slate-200'}`}><b>{m.mine ? 'You' : m.senderName}</b> · {formatDate(m.ts)}<br />{m.text}</li>)}</ul>
        {c.status !== 'closed' && <form onSubmit={async e => { e.preventDefault(); const d = await jsend('POST', `/api/tourism/cases/${id}/messages`, { text }); if (d.status === 'success') setText(''); say(d, 'Sent.'); }} className="flex gap-2">
          <input className={`${input} flex-1`} value={text} onChange={e => setText(e.target.value)} placeholder="Write to the facility" maxLength={2000} /><button className="bg-[color:var(--t-600)] text-white font-bold px-3 cursor-pointer">Send</button></form>}
      </section>

      {/* Discharge + share */}
      {c.discharge && (
        <section className="bg-white border border-emerald-300 p-5 space-y-2 text-xs">
          <h3 className="text-sm font-black uppercase tracking-wide">Discharge summary</h3>
          <p className="whitespace-pre-wrap">{c.discharge.summary}</p>
          {c.discharge.followUpPlan && <p><b>Follow-up plan:</b> {c.discharge.followUpPlan}</p>}
          <div className="border-t border-slate-200 pt-2 space-y-2">
            <p className="font-bold">Share with your doctor at home</p>
            <form onSubmit={async e => { e.preventDefault(); const f = e.currentTarget; const d = await sh({ consent: true, days: Number((f.elements.namedItem('days') as HTMLSelectElement).value), recipientLabel: (f.elements.namedItem('who') as HTMLInputElement).value }); if (d.status === 'success') setShareLink(window.location.origin + d.data.path); say(d, 'Link created.'); }} className="flex flex-wrap gap-2 items-center">
              <input name="who" className={input} placeholder="Doctor's name (optional)" maxLength={80} />
              <select name="days" className={input} defaultValue="14"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
              <label className="flex items-center gap-1"><input type="checkbox" required /> I agree to share this summary with whoever receives the link</label>
              <button className="bg-[color:var(--t-600)] text-white font-bold px-3 py-2 cursor-pointer">Create link</button>
            </form>
            {shareLink && <p className="bg-amber-50 border border-amber-200 p-2 [overflow-wrap:anywhere]">Copy this link now, it is shown only once: <b>{shareLink}</b></p>}
            <ul>{(c.shares ?? []).map((s: any) => <li key={s.id}>{s.label || 'Link'} · expires {formatDate(s.expiresAt)} · {s.views} view(s){s.revokedAt ? ' · revoked' : <> · <button className="text-rose-700 font-bold cursor-pointer" onClick={async () => say(await jsend('POST', `/api/tourism/cases/${id}/share/${s.id}/revoke`), 'Revoked.')}>Revoke</button></>}</li>)}</ul>
          </div>
        </section>
      )}

      {/* Problem + cancel */}
      <section className="bg-white border border-slate-200 p-5 space-y-2 text-xs">
        <details><summary className="font-bold cursor-pointer">Report a problem with this facility or package</summary>
          <form onSubmit={async e => { e.preventDefault(); const d = await jsend('POST', `/api/tourism/cases/${id}/problem`, { details: problem }); if (d.status === 'success') setProblem(''); say(d, 'Reported. Our team will reply within 4 hours.'); }} className="space-y-2 mt-2">
            <textarea className={`${input} w-full`} rows={3} required minLength={10} maxLength={3000} placeholder="What went wrong?" value={problem} onChange={e => setProblem(e.target.value)} />
            <button className="bg-rose-700 text-white font-bold px-3 py-2 cursor-pointer">Report to MedCred</button></form></details>
        {['enquiry', 'quoted', 'accepted'].includes(c.status) && <button className="text-rose-700 font-bold underline cursor-pointer" onClick={async () => { if (confirm('Cancel this case? Check the quote cancellation terms first.')) say(await jsend('POST', `/api/tourism/cases/${id}/cancel`, {}), 'Cancelled.'); }}>Cancel this case</button>}
      </section>
    </div>
  );
}

function QuoteDecision({ caseId, quoteId, onDone }: { caseId: string; quoteId: string; onDone: (d: any) => void }) {
  const [ack, setAck] = useState(false);
  const decide = async (decision: 'accept' | 'decline') => onDone(await jsend('POST', `/api/tourism/cases/${caseId}/quotes/${quoteId}/decision`, { decision, acknowledge: ack }));
  return (
    <div className="space-y-2 pt-1">
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5" checked={ack} onChange={e => setAck(e.target.checked)} /><span>I have read what is included, what is not included, and the cancellation terms.</span></label>
      <div className="flex gap-2"><button disabled={!ack} onClick={() => decide('accept')} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white font-bold px-3 py-1.5 cursor-pointer">Accept quote</button><button onClick={() => decide('decline')} className="border border-slate-300 font-bold px-3 py-1.5 cursor-pointer">Decline</button></div>
    </div>
  );
}

function TravelInfo() {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => { jget('/api/tourism/info').then(d => d.status === 'success' && setInfo(d.data)).catch(() => {}); }, []);
  return (
    <div className="bg-white border border-slate-200 p-5 space-y-3">
      {info?.draft && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2 font-semibold">Draft information for legal review. Entry rules change: always confirm with the Malaysian embassy or Immigration.</p>}
      {info?.sections.map((s: any) => <section key={s.heading}><h3 className="text-xs font-black uppercase tracking-wide text-slate-700">{s.heading}</h3><p className="text-xs text-slate-700 leading-relaxed mt-1">{s.body}</p></section>)}
    </div>
  );
}
