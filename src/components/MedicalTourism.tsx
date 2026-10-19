import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plane, Search, FolderOpen, Info, BadgeCheck, Languages, Utensils, Car, HeartHandshake, Building2, Download, Trash2, Copy, Printer, AlertCircle } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { formatMoney, formatDate } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

export type MedicalTourismTab = 'find' | 'cases' | 'info';

/** The words for where a request is. The Assistance & Quotes page uses the same ones. */
export const CASE_STATUS_LABEL: Record<string, string> = { enquiry: 'Request sent', quoted: 'Quote received', accepted: 'Quote accepted', in_treatment: 'In treatment', completed: 'Completed', closed: 'Closed' };
const NEXT_STEP: Record<string, string> = {
  enquiry: 'Waiting for the hospital to send a quote. It will appear here and you will get a notification.',
  quoted: 'A quote is ready. Read it under Quotes, then accept or decline it.',
  accepted: 'You accepted the quote. The hospital will contact you about dates and payment.',
  in_treatment: 'Your treatment is under way. Use Messages for any questions.',
  completed: 'Treatment is finished. Your discharge summary is under Discharge.',
  closed: 'This request is closed.',
};
const CATEGORY_LABEL: Record<string, string> = {
  procedure: 'Procedure', doctor_fees: 'Doctor fees', hospital_stay: 'Hospital stay', tests: 'Tests', medication: 'Medication', follow_up: 'Follow-up', interpreter: 'Interpreter', transport: 'Transport', accommodation: 'Accommodation', other: 'Other',
};
const SERVICE_LABEL: Record<string, string> = { interpreter: 'Interpreter', airportPickup: 'Airport pickup', halalFood: 'Halal food', prayerRoom: 'Prayer room' };
const COUNTRIES: [string, string][] = [['MY', 'Malaysia'], ['ID', 'Indonesia'], ['SG', 'Singapore'], ['CN', 'China'], ['IN', 'India'], ['AU', 'Australia'], ['GB', 'United Kingdom'], ['US', 'United States'], ['SA', 'Saudi Arabia'], ['AE', 'United Arab Emirates'], ['JP', 'Japan'], ['XX', 'Other']];

const field = 'w-full border border-slate-300 bg-white px-3 min-h-[44px] text-sm text-slate-900 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]';
const label = 'block text-sm font-bold text-slate-800';
const primaryBtn = 'min-h-[44px] px-4 inline-flex items-center justify-center gap-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 disabled:text-slate-700 text-white text-sm font-bold cursor-pointer';
const plainBtn = 'min-h-[44px] px-4 inline-flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-bold cursor-pointer';
const card = 'bg-white border border-[color:var(--t-200)] p-5';

interface MedicalTourismProps {
  onOpenProfessional?: (id: string) => void;
  embedded?: boolean;
  activeTab?: MedicalTourismTab;
  onTabChange?: (tab: MedicalTourismTab) => void;
}

/** Find a licensed hospital, ask it for a quote, follow the request. For patients in Malaysia and from abroad. */
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
          eyebrow="Hospitals and medical travel"
          title="Global patient care"
          description="Find licensed hospitals in Malaysia, ask one for an itemised quote, and follow your request. For patients in Malaysia and from abroad."
          tabs={[{ id: 'find', label: 'Find a hospital', icon: Search }, { id: 'cases', label: 'My requests', icon: FolderOpen }, { id: 'info', label: 'Travel information', icon: Info }]}
          activeTab={tab}
          onTabChange={t => setTab(t as MedicalTourismTab)}
        />
      )}
      <div className={embedded ? "space-y-5 pt-2" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
        {tab === 'find' && <Facilities onSent={id => { setTab('cases'); setOpenCase(id); }} />}
        {tab === 'cases' && <MyCases openId={openCase} onOpen={setOpenCase} onOpenProfessional={onOpenProfessional} onFind={() => setTab('find')} />}
        {tab === 'info' && <TravelInfo />}
      </div>
    </div>
  );
}

// ───────── hospitals ─────────
function Facilities({ onSent }: { onSent: (caseId: string) => void }) {
  const [all, setAll] = useState<any[] | null>(null);
  const [f, setF] = useState({ q: '', specialty: '', language: '', accreditation: '', service: '', abroad: '' });
  const [enquire, setEnquire] = useState<any | null>(null);
  useEffect(() => { jget('/api/tourism/facilities').then(d => setAll(d.status === 'success' ? d.data : [])).catch(() => setAll([])); }, []);

  const options = useMemo(() => {
    const uniq = (pick: (x: any) => string[]): string[] => [...new Set<string>((all ?? []).flatMap(pick))].sort((a, b) => a.localeCompare(b));
    return { specialties: uniq(x => x.specialties), languages: uniq(x => x.languages) };
  }, [all]);

  const shown = useMemo(() => (all ?? []).filter(x =>
    (!f.q || `${x.name} ${x.city} ${x.state}`.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.specialty || x.specialties.includes(f.specialty)) &&
    (!f.language || x.languages.includes(f.language)) &&
    (!f.accreditation || x.accreditations.some((a: any) => a.body === f.accreditation)) &&
    (!f.service || x.services[f.service]) &&
    (!f.abroad || x.acceptsInternational)), [all, f]);
  const filtering = Object.values(f).some(Boolean);

  if (!all) return <p className="text-sm text-slate-700">Loading hospitals…</p>;
  return (
    <div className="space-y-4">
      {all.length > 0 && (
        <div className="bg-white border border-[color:var(--t-200)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className={label}>Name or city<input className={`${field} mt-1`} value={f.q} onChange={e => setF({ ...f, q: e.target.value })} placeholder="e.g. Kuala Lumpur" /></label>
            <label className={label}>Specialty
              <select className={`${field} mt-1`} value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value })}><option value="">Any specialty</option>{options.specialties.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
            <label className={label}>Language spoken
              <select className={`${field} mt-1`} value={f.language} onChange={e => setF({ ...f, language: e.target.value })}><option value="">Any language</option>{options.languages.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
            <label className={label}>Accreditation
              <select className={`${field} mt-1`} value={f.accreditation} onChange={e => setF({ ...f, accreditation: e.target.value })}><option value="">Any</option><option value="JCI">JCI</option><option value="MSQH">MSQH</option></select>
            </label>
            <label className={label}>Service
              <select className={`${field} mt-1`} value={f.service} onChange={e => setF({ ...f, service: e.target.value })}><option value="">Any service</option>{Object.entries(SERVICE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <label className={label}>Patients from abroad
              <select className={`${field} mt-1`} value={f.abroad} onChange={e => setF({ ...f, abroad: e.target.value })}><option value="">All hospitals</option><option value="1">Welcomes international patients</option></select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm font-bold text-slate-800">{shown.length} {shown.length === 1 ? 'hospital' : 'hospitals'}</p>
            {filtering && <button type="button" className="min-h-[44px] px-3 text-sm font-bold underline cursor-pointer" onClick={() => setF({ q: '', specialty: '', language: '', accreditation: '', service: '', abroad: '' })}>Clear filters</button>}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 p-8 text-center space-y-2">
          <p className="text-base font-bold text-slate-900">No hospitals are listed right now.</p>
          <p className="text-sm text-slate-700">We list a hospital only while it is switched on and its licence is current, so this list can change. Please check again later, or contact support if you expected to see one.</p>
        </div>
      )}
      {all.length > 0 && shown.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 p-8 text-center space-y-2">
          <p className="text-base font-bold text-slate-900">No hospital matches these filters.</p>
          <button type="button" className={plainBtn} onClick={() => setF({ q: '', specialty: '', language: '', accreditation: '', service: '', abroad: '' })}>Clear filters</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map(fa => (
          <article key={fa.id} className={`${card} space-y-3 flex flex-col`}>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2 text-slate-900"><Building2 className="h-5 w-5 text-[color:var(--t-600)]" aria-hidden="true" />{fa.name}</h3>
              <p className="text-sm text-slate-700">{[fa.city, fa.state].filter(Boolean).join(', ')}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fa.licenceChecked && <span className="text-xs font-bold px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-900 inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />Licence checked</span>}
              {fa.accreditations.map((a: any) => <span key={a.body} className="text-xs font-bold px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-900">{a.body} checked, valid to {formatDate(a.validUntil)}</span>)}
              {fa.mhtcMember && <span className="text-xs font-bold px-2 py-0.5 border border-sky-300 bg-sky-50 text-sky-900">MHTC member</span>}
              {fa.acceptsInternational && <span className="text-xs font-bold px-2 py-0.5 border border-slate-300 bg-slate-50 text-slate-800">Welcomes international patients</span>}
              {fa.accreditations.length === 0 && <span className="text-xs text-slate-700 py-0.5">No accreditation checked by us yet</span>}
            </div>
            {fa.description && <p className="text-sm text-slate-800 leading-relaxed">{fa.description}</p>}
            <dl className="text-sm text-slate-800 space-y-1">
              <div className="flex gap-2"><dt className="font-bold shrink-0">Specialties</dt><dd>{fa.specialties.join(', ') || 'Not listed'}</dd></div>
              <div className="flex gap-2"><dt className="font-bold shrink-0 inline-flex items-center gap-1"><Languages className="h-3.5 w-3.5" aria-hidden="true" />Languages</dt><dd>{fa.languages.join(', ') || 'Not listed'}</dd></div>
              {fa.practitioners.length > 0 && <div className="flex gap-2"><dt className="font-bold shrink-0">Doctors</dt><dd>{fa.practitioners.map((p: any) => `${p.name} (${p.specialization})`).join(' · ')}</dd></div>}
            </dl>
            <div className="text-sm text-slate-800 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(SERVICE_LABEL).filter(([k]) => fa.services[k]).map(([k, l]) => <span key={k} className="inline-flex items-center gap-1">{k === 'halalFood' ? <Utensils className="h-4 w-4" aria-hidden="true" /> : k === 'airportPickup' ? <Car className="h-4 w-4" aria-hidden="true" /> : <HeartHandshake className="h-4 w-4" aria-hidden="true" />}{l}</span>)}
              {fa.services.accommodationPartners?.length > 0 && <span>Stay: {fa.services.accommodationPartners.join(', ')}</span>}
            </div>
            <div className="pt-1 mt-auto"><button onClick={() => setEnquire(fa)} className={primaryBtn}>Request a quote</button></div>
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
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await jsend('POST', '/api/tourism/cases', { facilityId: facility.id, ...v, practitionerId: v.practitionerId || undefined, preferredFrom: v.preferredFrom || undefined, preferredTo: v.preferredTo || undefined, needs: { ...needs, interpreterLanguage: v.interpreterLanguage } });
      if (d.status === 'success') onSent(d.data.id); else setErr(d.message || 'The request could not be sent.');
    } catch { setErr('Network error. Please try again.'); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="enq-title">
      <form onSubmit={submit} className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 space-y-4 border border-slate-300 shadow-2xl">
        <div>
          <h3 id="enq-title" className="text-lg font-extrabold text-slate-900">Request a quote from {facility.name}</h3>
          <p className="text-sm text-slate-700">Free, and it does not commit you. The hospital replies with an itemised quote.</p>
        </div>
        <label className={label}>What treatment are you looking for? *
          <textarea className={`${field} mt-1 py-2`} rows={4} required minLength={20} maxLength={2000} autoFocus placeholder="Your diagnosis, any previous treatment, and what you want to ask the hospital." value={v.summary} onChange={e => setV({ ...v, summary: e.target.value })} />
          <span className="block text-xs font-normal text-slate-700 mt-1">At least 20 characters. Do not write passport, card or bank numbers here.</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={label}>Country you live in
            <select className={`${field} mt-1`} value={v.homeCountry} onChange={e => setV({ ...v, homeCountry: e.target.value })}>
              <option value="">Choose a country</option>
              {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <label className={label}>Earliest date you could start
            <input type="date" className={`${field} mt-1`} value={v.preferredFrom} min={new Date().toISOString().slice(0, 10)} onChange={e => setV({ ...v, preferredFrom: e.target.value })} />
          </label>
        </div>

        <details className="border border-slate-200 p-3">
          <summary className="min-h-[44px] flex items-center text-sm font-bold text-slate-900 cursor-pointer">More options (specialty, dates, doctor, help you need)</summary>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={label}>Specialty
                <select className={`${field} mt-1`} value={v.specialty} onChange={e => setV({ ...v, specialty: e.target.value })}>
                  <option value="">Not sure yet</option>
                  {facility.specialties.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className={label}>Leave by
                <input type="date" className={`${field} mt-1`} value={v.preferredTo} min={v.preferredFrom || new Date().toISOString().slice(0, 10)} onChange={e => setV({ ...v, preferredTo: e.target.value })} />
              </label>
            </div>
            {facility.practitioners.length > 0 && (
              <label className={label}>Preferred doctor
                <select className={`${field} mt-1`} value={v.practitionerId} onChange={e => setV({ ...v, practitionerId: e.target.value })}>
                  <option value="">No preference</option>
                  {facility.practitioners.map((p: any) => <option key={p.id} value={p.id}>{p.name} · {p.specialization}</option>)}
                </select>
              </label>
            )}
            <fieldset className="space-y-1">
              <legend className={label}>Help you would like arranged</legend>
              {[['interpreter', 'Interpreter'], ['airportPickup', 'Airport pickup'], ['halalFood', 'Halal food'], ['prayerRoom', 'Prayer room'], ['accommodation', 'Help finding accommodation']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-3 min-h-[44px] text-sm text-slate-900 cursor-pointer"><input type="checkbox" className="h-5 w-5 accent-[color:var(--t-600)]" checked={!!needs[k]} onChange={e => setNeeds({ ...needs, [k]: e.target.checked })} />{l}</label>
              ))}
              {needs.interpreter && <input className={field} aria-label="Interpreter language" placeholder="Language" value={v.interpreterLanguage} onChange={e => setV({ ...v, interpreterLanguage: e.target.value })} />}
            </fieldset>
          </div>
        </details>

        <label className="flex items-start gap-3 text-sm text-slate-900 cursor-pointer"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={v.shareDocuments} onChange={e => setV({ ...v, shareDocuments: e.target.checked })} /><span>The hospital may open the passport copy and medical records I upload for this request. I can change this later.</span></label>
        <label className="flex items-start gap-3 text-sm text-slate-900 cursor-pointer"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" required checked={v.consent} onChange={e => setV({ ...v, consent: e.target.checked })} /><span>I agree that MedCred sends this request, with my name, email and country, to {facility.name}. It is not a booking and does not create a doctor-patient relationship. *</span></label>
        {err && <p role="alert" className="text-sm font-bold text-rose-900 bg-rose-50 border border-rose-200 p-3">{err}</p>}
        <div className="flex flex-wrap gap-3 justify-end">
          <button type="button" onClick={onClose} className={plainBtn}>Cancel</button>
          <button disabled={busy} className={primaryBtn}>{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </div>
  );
}

// ───────── my requests (also used by the Assistance & Quotes page for signed-in patients) ─────────
export function MyCases({ openId, onOpen, onOpenProfessional, onFind }: { openId: string | null; onOpen: (id: string | null) => void; onOpenProfessional?: (id: string) => void; onFind?: () => void }) {
  return openId
    ? <CaseDetail id={openId} onBack={() => onOpen(null)} onOpenProfessional={onOpenProfessional} />
    : <CaseList onOpen={onOpen} onFind={onFind} />;
}

function CaseList({ onOpen, onFind }: { onOpen: (id: string) => void; onFind?: () => void }) {
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { jget('/api/tourism/cases').then(d => setList(d.status === 'success' ? d.data : [])).catch(() => setList([])); }, []);
  if (!list) return <p className="text-sm text-slate-700">Loading…</p>;
  if (list.length === 0) return (
    <div className="bg-white border border-dashed border-slate-300 p-8 text-center space-y-3">
      <p className="text-base font-bold text-slate-900">You have no requests yet.</p>
      <p className="text-sm text-slate-700">Pick a hospital and ask it for a quote. Your request and its quote appear here.</p>
      {onFind && <button type="button" onClick={onFind} className={primaryBtn}>Find a hospital</button>}
    </div>
  );
  return (
    <ul className="space-y-2">
      {list.map(c => (
        <li key={c.id}>
          <button onClick={() => onOpen(c.id)} className={`w-full text-left bg-white border hover:border-[color:var(--t-600)] p-4 cursor-pointer min-h-[44px] ${c.status === 'quoted' ? 'border-amber-400' : 'border-slate-200'}`}>
            <p className="text-base font-bold text-slate-900">{c.facility} <span className="text-[color:var(--t-700)] text-sm font-bold">· {CASE_STATUS_LABEL[c.status] ?? c.status}</span></p>
            {c.status === 'quoted' && <p className="text-sm font-bold text-amber-900">A quote is waiting for your answer</p>}
            <p className="text-sm text-slate-800">{c.summary}</p>
            <p className="text-xs text-slate-700 mt-1">Updated {formatDate(c.updatedAt)}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

type CaseTab = 'quotes' | 'itinerary' | 'documents' | 'messages' | 'discharge' | 'help';

function CaseDetail({ id, onBack, onOpenProfessional }: { id: string; onBack: () => void; onOpenProfessional?: (id: string) => void }) {
  const [c, setC] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [text, setText] = useState('');
  const [kind, setKind] = useState('passport');
  const [problem, setProblem] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<CaseTab | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: 'cancel' } | { kind: 'file'; id: string; name: string }>(null);
  const load = useCallback(() => { jget(`/api/tourism/cases/${id}`).then(d => d.status === 'success' && setC(d.data)).catch(() => {}); }, [id]);
  useEffect(() => { load(); }, [load]);
  const say = (d: any, ok = 'Done.') => { setMsg({ ok: d.status === 'success', text: (d.status === 'success' ? d.message || ok : d.message) || 'Something went wrong.' }); if (d.status === 'success') load(); };

  if (!c) return <p className="text-sm text-slate-700">Loading…</p>;
  const open = ['enquiry', 'quoted', 'accepted', 'in_treatment'].includes(c.status);
  const active: CaseTab = tab ?? (c.status === 'completed' && c.discharge ? 'discharge' : 'quotes');
  const upload = async (file: File) => {
    const fd = new FormData(); fd.append('kind', kind); fd.append('file', file);
    say(await fetch(`/api/tourism/cases/${id}/files`, { method: 'POST', body: fd }).then(r => r.json()), 'Uploaded.');
  };
  const sh = (p: Record<string, unknown>) => jsend('POST', `/api/tourism/cases/${id}/share`, p);
  const tabs: { id: CaseTab; text: string; count?: number }[] = [
    { id: 'quotes', text: 'Quotes', count: c.quotes.length },
    ...(c.itinerary.length > 0 ? [{ id: 'itinerary' as CaseTab, text: 'Itinerary', count: c.itinerary.length }] : []),
    { id: 'documents', text: 'Documents', count: c.files.length },
    { id: 'messages', text: 'Messages', count: c.messages.length },
    ...(c.discharge ? [{ id: 'discharge' as CaseTab, text: 'Discharge' }] : []),
    { id: 'help', text: 'Help' },
  ];
  const copy = async () => { try { await navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { window.prompt('Copy this link:', shareLink); } };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="min-h-[44px] px-1 text-sm font-bold underline cursor-pointer">← All requests</button>

      {/* Where it stands and what to do next */}
      <section className={`border p-5 space-y-1.5 ${c.status === 'quoted' ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
        <h2 className="text-xl font-extrabold text-slate-900">{c.facility?.name}</h2>
        <p className="text-base font-bold text-[color:var(--t-700)]">{CASE_STATUS_LABEL[c.status] ?? c.status}</p>
        <p className="text-sm text-slate-900">{NEXT_STEP[c.status]}</p>
        <p className="text-sm text-slate-800"><b>Your request:</b> {c.summary}</p>
        <p className="text-sm text-slate-700">{[c.facility?.phone, c.facility?.email].filter(Boolean).join(' · ')}{c.practitioner ? ` · Doctor: ${c.practitioner.name}` : ''}</p>
        {c.practitioner && onOpenProfessional && <button className="min-h-[44px] text-sm font-bold underline cursor-pointer" onClick={() => onOpenProfessional(c.practitioner.id)}>Book a video consultation with {c.practitioner.name}</button>}
      </section>

      {msg && <p role="status" className={`text-sm font-bold border p-3 ${msg.ok ? 'text-sky-950 bg-sky-50 border-sky-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      <div role="tablist" aria-label="Request sections" className="flex flex-wrap gap-1.5">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => { setTab(t.id); setConfirm(null); }}
            className={`min-h-[44px] px-4 text-sm font-bold cursor-pointer border ${active === t.id ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}>
            {t.text}{t.count !== undefined && t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {active === 'quotes' && (
        <section className={`${card} space-y-3`}>
          {c.quotes.length === 0 && <p className="text-sm text-slate-800">No quote yet. The hospital will send an itemised price.</p>}
          {c.quotes.map((q: any) => (
            <div key={q.id} className={`border p-4 text-sm space-y-3 ${q.status === 'sent' ? 'border-[color:var(--t-600)]' : 'border-slate-200 bg-slate-50'}`}>
              <p className="font-bold text-slate-900">Quote {q.version} · {q.status === 'sent' ? 'waiting for your answer' : q.status} · valid until {formatDate(q.validUntil)}</p>
              <table className="w-full"><tbody>
                {q.items.map((i: any, k: number) => <tr key={k} className="border-b border-slate-100"><td className="py-1.5">{i.label} <span className="text-slate-700">({CATEGORY_LABEL[i.category] ?? i.category})</span></td><td className="text-right tabular-nums">{formatMoney(i.amountSen / 100)}</td></tr>)}
                {q.tax > 0 && <tr><td className="py-1.5">Service tax (SST) {q.taxRatePct}% on healthcare services</td><td className="text-right tabular-nums">{formatMoney(q.tax)}</td></tr>}
                <tr className="font-extrabold text-base"><td className="pt-2">Total</td><td className="text-right tabular-nums pt-2">{formatMoney(q.total)}</td></tr>
              </tbody></table>
              {q.inclusions && <p><b>Included:</b> {q.inclusions}</p>}
              <p className="bg-amber-50 border border-amber-200 p-2.5"><b>Not included:</b> {q.exclusions}</p>
              <p><b>Cancellation and refunds:</b> {q.cancellationTerms}</p>
              {q.paymentTerms && <p><b>Payment:</b> {q.paymentTerms}</p>}
              {q.status === 'sent' && c.status === 'quoted' && <QuoteDecision caseId={id} quoteId={q.id} total={formatMoney(q.total)} onDone={d => say(d, 'Recorded.')} />}
            </div>
          ))}
          <p className="text-sm text-slate-700">Payment is arranged directly with the hospital. MedCred does not take your package payment.</p>
        </section>
      )}

      {active === 'itinerary' && (
        <section className={card}>
          <ol className="space-y-2 text-sm text-slate-900">{c.itinerary.map((i: any) => <li key={i.id}><b>{formatDate(i.date)}</b> · {i.title}{i.note ? ` — ${i.note}` : ''}</li>)}</ol>
        </section>
      )}

      {active === 'documents' && (
        <section className={`${card} space-y-3 text-sm`}>
          {c.files.length === 0 && <p className="text-slate-800">No documents yet.</p>}
          <ul className="space-y-1">{c.files.map((f: any) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-slate-900">{f.kind.replace('_', ' ')} · {f.name}</span>
              <a href={`/api/tourism/cases/${id}/files/${f.id}`} className="min-h-[44px] inline-flex items-center gap-1 font-bold underline"><Download className="h-4 w-4" aria-hidden="true" />Download</a>
              <button onClick={() => setConfirm({ kind: 'file', id: f.id, name: f.name })} className="min-h-[44px] inline-flex items-center gap-1 text-rose-800 font-bold cursor-pointer"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
            </li>))}</ul>
          {confirm?.kind === 'file' && (
            <div role="alertdialog" aria-label="Delete this file" className="bg-rose-50 border border-rose-300 p-3 space-y-2">
              <p className="font-bold text-rose-950">Delete "{confirm.name}"? This cannot be undone.</p>
              <div className="flex gap-2">
                <button className="min-h-[44px] px-4 bg-rose-800 text-white font-bold cursor-pointer" onClick={async () => { const fid = confirm.id; setConfirm(null); say(await jsend('DELETE', `/api/tourism/cases/${id}/files/${fid}`), 'Deleted.'); }}>Yes, delete</button>
                <button className={plainBtn} onClick={() => setConfirm(null)}>Keep it</button>
              </div>
            </div>
          )}
          {open && (
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${field} sm:w-64`} value={kind} onChange={e => setKind(e.target.value)} aria-label="Document type"><option value="passport">Passport copy</option><option value="medical_records">Medical records</option><option value="visa_letter">Visa / support letter</option><option value="other">Other</option></select>
              <input type="file" accept="application/pdf,image/jpeg,image/png" aria-label="Choose a file" className="text-sm min-h-[44px]" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={c.shareDocuments} onChange={async e => say(await jsend('POST', `/api/tourism/cases/${id}/sharing`, { shareDocuments: e.target.checked }), 'Updated.')} /><span className="text-slate-900">The hospital may open these files. Untick to stop sharing at any time.</span></label>
        </section>
      )}

      {active === 'messages' && (
        <section className={`${card} space-y-3 text-sm`}>
          {c.messages.length === 0 && <p className="text-slate-800">No messages yet.</p>}
          <ul className="space-y-2">{c.messages.map((m: any) => <li key={m.id} className={`p-3 border ${m.mine ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)]' : 'bg-slate-50 border-slate-200'}`}><b>{m.mine ? 'You' : m.senderName}</b> <span className="text-slate-700">· {formatDate(m.ts)}</span><br />{m.text}</li>)}</ul>
          {c.status !== 'closed' && (
            <form onSubmit={async e => { e.preventDefault(); const d = await jsend('POST', `/api/tourism/cases/${id}/messages`, { text }); if (d.status === 'success') setText(''); say(d, 'Sent.'); }} className="flex gap-2">
              <input className={`${field} flex-1`} aria-label="Message to the hospital" value={text} onChange={e => setText(e.target.value)} placeholder="Write to the hospital" maxLength={2000} />
              <button className={primaryBtn} disabled={!text.trim()}>Send</button>
            </form>
          )}
        </section>
      )}

      {active === 'discharge' && c.discharge && (
        <section className="bg-white border border-emerald-300 p-5 space-y-3 text-sm">
          <h3 className="text-base font-extrabold text-slate-900">Discharge summary</h3>
          <p className="whitespace-pre-wrap text-slate-900">{c.discharge.summary}</p>
          {c.discharge.followUpPlan && <p><b>Follow-up plan:</b> {c.discharge.followUpPlan}</p>}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <p className="font-bold text-slate-900">Share with your doctor at home</p>
            <form onSubmit={async e => { e.preventDefault(); const f = e.currentTarget; const d = await sh({ consent: true, days: Number((f.elements.namedItem('days') as HTMLSelectElement).value), recipientLabel: (f.elements.namedItem('who') as HTMLInputElement).value }); if (d.status === 'success') setShareLink(window.location.origin + d.data.path); say(d, 'Link created.'); }} className="flex flex-wrap gap-2 items-center">
              <input name="who" className={`${field} sm:w-64`} aria-label="Doctor's name" placeholder="Doctor's name (optional)" maxLength={80} />
              <select name="days" aria-label="Link lasts" className={`${field} sm:w-32`} defaultValue="14"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
              <label className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" required className="h-5 w-5 accent-[color:var(--t-600)]" /> I agree to share this summary with whoever receives the link</label>
              <button className={primaryBtn}>Create link</button>
            </form>
            {shareLink && (
              <div className="bg-amber-50 border border-amber-200 p-3 space-y-2">
                <p className="[overflow-wrap:anywhere]">Copy this link now. It is shown only once: <b>{shareLink}</b></p>
                <div className="flex gap-2"><button type="button" onClick={copy} className={plainBtn}><Copy className="h-4 w-4" aria-hidden="true" />{copied ? 'Copied' : 'Copy link'}</button><button type="button" onClick={() => window.print()} className={plainBtn}><Printer className="h-4 w-4" aria-hidden="true" />Print</button></div>
              </div>
            )}
            <ul className="space-y-1">{(c.shares ?? []).map((s: any) => <li key={s.id}>{s.label || 'Link'} · expires {formatDate(s.expiresAt)} · {s.views} view(s){s.revokedAt ? ' · revoked' : <> · <button className="min-h-[44px] text-rose-800 font-bold cursor-pointer" onClick={async () => say(await jsend('POST', `/api/tourism/cases/${id}/share/${s.id}/revoke`), 'Revoked.')}>Revoke</button></>}</li>)}</ul>
          </div>
        </section>
      )}

      {active === 'help' && (
        <section className={`${card} space-y-4 text-sm`}>
          <p className="text-slate-800">A video consultation with a Malaysian doctor from your home country is possible before or after treatment. The doctor cannot give emergency care or issue e-prescriptions to you abroad.</p>
          <details open={false}>
            <summary className="min-h-[44px] flex items-center font-bold text-slate-900 cursor-pointer">Report a problem with this hospital or package</summary>
            <form onSubmit={async e => { e.preventDefault(); const d = await jsend('POST', `/api/tourism/cases/${id}/problem`, { details: problem }); if (d.status === 'success') setProblem(''); say(d, 'Reported. We will reply by email.'); }} className="space-y-2 mt-2">
              <textarea className={`${field} py-2`} rows={3} required minLength={10} maxLength={3000} aria-label="What went wrong" placeholder="What went wrong?" value={problem} onChange={e => setProblem(e.target.value)} />
              <button className="min-h-[44px] px-4 bg-rose-800 text-white font-bold cursor-pointer">Report to MedCred</button>
            </form>
          </details>
          {['enquiry', 'quoted', 'accepted'].includes(c.status) && (
            confirm?.kind === 'cancel' ? (
              <div role="alertdialog" aria-label="Cancel this request" className="bg-rose-50 border border-rose-300 p-3 space-y-2">
                <p className="font-bold text-rose-950">Cancel this request? Check the cancellation terms on the quote first.</p>
                <div className="flex gap-2">
                  <button className="min-h-[44px] px-4 bg-rose-800 text-white font-bold cursor-pointer" onClick={async () => { setConfirm(null); say(await jsend('POST', `/api/tourism/cases/${id}/cancel`, {}), 'Cancelled.'); }}>Yes, cancel it</button>
                  <button className={plainBtn} onClick={() => setConfirm(null)}>Keep it</button>
                </div>
              </div>
            ) : <button className="min-h-[44px] text-rose-800 font-bold underline cursor-pointer" onClick={() => setConfirm({ kind: 'cancel' })}>Cancel this request</button>
          )}
        </section>
      )}
    </div>
  );
}

function QuoteDecision({ caseId, quoteId, total, onDone }: { caseId: string; quoteId: string; total: string; onDone: (d: any) => void }) {
  const [ack, setAck] = useState(false);
  const decide = async (decision: 'accept' | 'decline') => onDone(await jsend('POST', `/api/tourism/cases/${caseId}/quotes/${quoteId}/decision`, { decision, acknowledge: ack }));
  return (
    <div className="space-y-2 pt-1">
      <label className="flex items-start gap-3 min-h-[44px] cursor-pointer"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" checked={ack} onChange={e => setAck(e.target.checked)} /><span className="text-slate-900">I have read what is included, what is not included, and the cancellation terms.</span></label>
      <p className="text-sm text-slate-800">Accepting {total} tells the hospital you want to go ahead. It does not charge you.</p>
      <div className="flex flex-wrap gap-2"><button disabled={!ack} onClick={() => decide('accept')} className={primaryBtn}>Accept quote</button><button onClick={() => decide('decline')} className={plainBtn}>Decline</button></div>
    </div>
  );
}

function TravelInfo() {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => { jget('/api/tourism/info').then(d => d.status === 'success' && setInfo(d.data)).catch(() => {}); }, []);
  return (
    <div className={`${card} space-y-4`}>
      {info?.draft && <p className="text-sm bg-amber-50 border border-amber-200 text-amber-950 p-3 font-semibold flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />Draft information for legal review. Entry rules change: always confirm with the Malaysian embassy or Immigration.</p>}
      {info?.sections.map((s: any) => <section key={s.heading}><h3 className="text-base font-extrabold text-slate-900">{s.heading}</h3><p className="text-sm text-slate-800 leading-relaxed mt-1">{s.body}</p></section>)}
    </div>
  );
}
