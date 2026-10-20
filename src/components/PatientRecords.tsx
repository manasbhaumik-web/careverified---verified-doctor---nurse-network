import React, { useCallback, useEffect, useState, useRef } from 'react';
import PrescriptionList, { fmtDate } from './PrescriptionList';
import CertificatesPanel from './CertificatesPanel';
import TrendChart from './TrendChart';
import { Activity, AlertTriangle, ClipboardList, FileText, FlaskConical, Pill, Share2, Trash2, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const fmt = fmtDate;
const field = 'border border-[color:var(--t-200)] bg-white px-3.5 h-11 text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-600 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

/** A <input type="datetime-local"> value for "now", in the person's own time zone. */
const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const VITAL_LABEL: Record<string, string> = { bp: 'Blood pressure', glucose: 'Blood sugar', heart_rate: 'Heart rate', spo2: 'Oxygen (SpO₂)', temperature: 'Temperature', weight: 'Weight' };

export type RecordSubTab = 'overview' | 'vitals' | 'rx' | 'rxhist' | 'docs' | 'mc' | 'referrals' | 'labs' | 'notes' | 'sharing';

export interface PatientRecordsProps {
  initialTab?: RecordSubTab;
  activeSubTab?: RecordSubTab;
  onSubTabChange?: (tab: RecordSubTab) => void;
  hideHeaderTabs?: boolean;
  /** Opens the pharmacy directory (used when a pharmacy cannot fill a prescription). */
  onOpenPharmacies?: () => void;
  /** Opens the doctor directory, to book an in-person visit or a specialist. */
  onFindDoctors?: () => void;
  /** Books the specialist a referral names, or searches for the specialty. */
  onBookSpecialist?: (professionalId: string | null, specialty: string) => void;
}

/** The patient's own health record: allergies, conditions, medicines, readings, prescriptions, certificates, referrals, labs, sharing. */
export default function PatientRecords({
  initialTab,
  activeSubTab,
  onSubTabChange,
  hideHeaderTabs = false,
  onOpenPharmacies,
  onFindDoctors,
  onBookSpecialist,
}: PatientRecordsProps = {}) {
  const [data, setData] = useState<any | null>(null);
  const [tab, setTab] = useState<RecordSubTab>(activeSubTab || initialTab || 'overview');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);

  useEffect(() => {
    if (activeSubTab) {
      setTab(activeSubTab);
    } else if (initialTab) {
      setTab(initialTab);
    }
  }, [activeSubTab, initialTab]);

  const load = useCallback(async () => {
    const d = await fetch('/api/records/me').then(r => r.json());
    if (d.status === 'success') setData(d.data);
  }, []);
  useEffect(() => { load().catch(() => {}); fetch('/api/pharmacies').then(r => r.json()).then(d => d.status === 'success' && setPharmacies(d.data)).catch(() => {}); }, [load]);

  const act = async (fn: () => Promise<any>, success?: string) => {
    setMsg(null);
    const d = await fn();
    if (d.status === 'success') { if (success) setMsg({ ok: true, text: d.message || success }); await load(); return d; }
    setMsg({ ok: false, text: d.message || 'Something went wrong.' });
    return d;
  };

  // overview
  const [item, setItem] = useState({ type: 'allergy', name: '', detail: '' });
  const nameRef = useRef<HTMLInputElement>(null);
  // Removing a condition or medicine can be undone for a few seconds; allergies and readings ask first
  const [undo, setUndo] = useState<{ label: string; payload: { type: string; name: string; detail: string | null; severity: string | null } } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);
  // vitals
  const [vital, setVital] = useState({ kind: 'bp', value1: '', value2: '', takenAt: localNow() });
  const [trendKind, setTrendKind] = useState('bp');
  const [vitalFlag, setVitalFlag] = useState<string | null>(null);
  // sharing
  const [shareWith, setShareWith] = useState('');

  if (!data) return <p className="text-xs text-slate-600 p-6">Loading your health record…</p>;

  const removeItem = async (i: any) => {
    if (i.type === 'allergy' && !window.confirm(`Remove the ${i.name} allergy from your record? Doctors and pharmacists use this to keep you safe.`)) return;
    const d = await act(() => jpost(`/api/records/items/${i.id}`, undefined, 'DELETE'));
    if (d.status === 'success' && i.type !== 'allergy') setUndo({ label: i.name, payload: { type: i.type, name: i.name, detail: i.detail ?? null, severity: i.severity ?? null } });
  };
  const removeReading = (v: any) => {
    if (!window.confirm('Delete this reading? This cannot be undone.')) return;
    act(() => jpost(`/api/records/vitals/${v.id}`, undefined, 'DELETE'));
  };
  const saidNoAllergies = data.allergyStatement?.kind === 'none_known';
  const vitalSpec = (data.vitalSpecs ?? {})[vital.kind] as { unit: string; min: number; max: number; min2?: number; max2?: number } | undefined;
  const trendSpec = (data.vitalSpecs ?? {})[trendKind] as { unit: string; two?: boolean } | undefined;
  // Medicines a doctor prescribed that are still valid, shown next to the ones the patient added themselves
  const prescribed: { name: string; strength?: string; detail: string; doctor?: string; until?: string }[] = (data.prescriptions ?? [])
    .filter((rx: any) => rx.status === 'active')
    .flatMap((rx: any) => (rx.items ?? []).map((it: any) => ({ name: it.name, strength: it.strength, detail: [it.dose, it.frequency].filter(Boolean).join(', '), doctor: rx.doctor?.name, until: rx.validUntil })))
    // the same medicine on several prescriptions (a renewal) is listed once; prescriptions are newest first, so the newest one is kept
    .filter((m: { name: string; strength?: string; detail: string }, k: number, all: { name: string; strength?: string; detail: string }[]) =>
      all.findIndex(o => `${o.name}|${o.strength}|${o.detail}`.toLowerCase() === `${m.name}|${m.strength}|${m.detail}`.toLowerCase()) === k);
  const noKnownAllergies = () => act(() => jpost('/api/records/allergy-status', {}), 'Saved: you have no known allergies.');
  const clearNoKnownAllergies = () => act(() => jpost('/api/records/allergy-status', undefined, 'DELETE'));
  const addAnAllergy = () => { setItem({ type: 'allergy', name: '', detail: '' }); nameRef.current?.focus(); nameRef.current?.scrollIntoView({ block: 'center' }); };

  const tabs = [
    ['overview', 'Overview', ClipboardList], ['vitals', 'Readings', Activity], ['rx', 'Prescriptions', Pill], ['rxhist', 'Past prescriptions', Pill], ['docs', 'Certificates & referrals', FileText],
    ['labs', 'Lab tests', FlaskConical], ['notes', 'Doctor notes', FileText], ['sharing', 'Sharing', Share2],
  ] as const;

  return (
    <div className="space-y-4">
      {!hideHeaderTabs && (
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
          {tabs.map(([id, text, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setMsg(null); onSubTabChange?.(id); }}
              className={`px-3 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${tab === id ? 'border-b-2 border-[color:var(--t-600)] text-[color:var(--t-700)]' : 'text-slate-600'}`}>
              <Icon className="h-3.5 w-3.5" /> {text}
            </button>
          ))}
        </div>
      )}
      {msg && (
        <div
          role="status"
          className={`text-xs font-bold p-3 flex items-center justify-between gap-3 border shadow-xs animate-fade-in ${
            msg.ok
              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
              : 'text-rose-800 bg-rose-50 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
            <span>{msg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="text-xs underline cursor-pointer hover:opacity-80 shrink-0 min-h-[44px] px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {undo && (
        <div role="status" className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white text-xs font-semibold pl-4 pr-1 min-h-[48px] flex items-center gap-3 shadow-lg max-w-[calc(100vw-2rem)]">
          <span className="truncate">Removed {undo.label}.</span>
          <button
            type="button"
            onClick={async () => { const u = undo; setUndo(null); await act(() => jpost('/api/records/items', u.payload), 'Put back.'); }}
            className="min-h-[44px] px-4 font-extrabold underline cursor-pointer shrink-0"
          >
            Undo
          </button>
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-3.5">
          {/* 3-COLUMN CLINICAL PROFILE BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. ALLERGIES */}
            <div className="bg-white border-t-2 border-t-rose-600 border-x border-b border-[color:var(--t-200)] shadow-xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[color:var(--t-100)]">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <h3 className="font-display font-extrabold text-sm text-[color:var(--ink)] uppercase tracking-wider">
                      Documented Allergies
                    </h3>
                  </div>
                  <span className={`text-2xs font-mono font-bold px-1.5 py-0.2 border ${
                    data.items.filter((i: any) => i.type === 'allergy').length > 0
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : saidNoAllergies
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {data.items.filter((i: any) => i.type === 'allergy').length}
                  </span>
                </div>

                {data.items.filter((i: any) => i.type === 'allergy').length === 0 ? (
                  saidNoAllergies ? (
                    <div className="py-3 px-3 bg-emerald-50 border border-emerald-200 my-1 space-y-1">
                      <p className="text-sm text-emerald-900 font-bold">You told us you have no known allergies.</p>
                      <p className="text-xs text-slate-700">Said on {new Date(data.allergyStatement.recorded_at).toLocaleDateString()}.</p>
                      <button type="button" onClick={clearNoKnownAllergies} className="min-h-[44px] text-xs font-bold underline text-emerald-900 cursor-pointer">Change this</button>
                    </div>
                  ) : (
                    <div className="py-3 px-3 bg-slate-50 border border-dashed border-slate-300 my-1 space-y-2">
                      <p className="text-sm text-slate-800 font-bold">No allergies recorded yet.</p>
                      <p className="text-xs text-slate-700 leading-snug">Doctors and pharmacists cannot tell "none" from "not filled in". Add an allergy, or tell us you have none.</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={addAnAllergy} className="min-h-[44px] px-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer">Add an allergy</button>
                        <button type="button" onClick={noKnownAllergies} className="min-h-[44px] px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 text-xs font-bold cursor-pointer">I have no known allergies</button>
                      </div>
                    </div>
                  )
                ) : (
                  <ul className="divide-y divide-[color:var(--t-100)] max-h-48 overflow-y-auto">
                    {data.items.filter((i: any) => i.type === 'allergy').map((i: any) => (
                      <li key={i.id} className="py-1.5 flex items-center justify-between gap-2 text-xs group">
                        <div className="min-w-0">
                          <strong className="text-rose-900 font-bold block truncate">{i.name}</strong>
                          {i.detail && <p className="text-xs text-slate-600 truncate">{i.detail}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${i.name}`}
                          onClick={() => removeItem(i)}
                          className="h-11 w-11 flex items-center justify-center text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 2. CHRONIC CONDITIONS */}
            <div className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[color:var(--t-100)]">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    <h3 className="font-display font-extrabold text-sm text-[color:var(--ink)] uppercase tracking-wider">
                      Chronic Conditions
                    </h3>
                  </div>
                  <span className="text-2xs font-mono font-bold px-1.5 py-0.2 border bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]">
                    {data.items.filter((i: any) => i.type === 'condition').length}
                  </span>
                </div>

                {data.items.filter((i: any) => i.type === 'condition').length === 0 ? (
                  <div className="py-3 px-2 text-center bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] my-1">
                    <p className="text-xs text-slate-600 font-medium">No chronic conditions</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[color:var(--t-100)] max-h-48 overflow-y-auto">
                    {data.items.filter((i: any) => i.type === 'condition').map((i: any) => (
                      <li key={i.id} className="py-1.5 flex items-center justify-between gap-2 text-xs group">
                        <div className="min-w-0">
                          <strong className="text-[color:var(--ink)] font-bold block truncate">{i.name}</strong>
                          {i.detail && <p className="text-xs text-slate-600 truncate">{i.detail}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${i.name}`}
                          onClick={() => removeItem(i)}
                          className="h-11 w-11 flex items-center justify-center text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 3. MEDICATIONS */}
            <div className="bg-white border-t-2 border-t-cyan-600 border-x border-b border-[color:var(--t-200)] shadow-xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[color:var(--t-100)]">
                  <div className="flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-cyan-600" />
                    <h3 className="font-display font-extrabold text-sm text-[color:var(--ink)] uppercase tracking-wider">
                      Active Medications
                    </h3>
                  </div>
                  <span className="text-2xs font-mono font-bold px-1.5 py-0.2 border bg-cyan-50 text-cyan-800 border-cyan-200">
                    {data.items.filter((i: any) => i.type === 'medication').length + prescribed.length}
                  </span>
                </div>

                {prescribed.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--t-700)] mb-1">Prescribed by your doctors</p>
                    <ul className="divide-y divide-[color:var(--t-100)] max-h-48 overflow-y-auto">
                      {prescribed.map((m, k) => (
                        <li key={k} className="py-1.5 text-xs">
                          <strong className="text-[color:var(--ink)] font-bold block truncate">{m.name}{m.strength ? ` ${m.strength}` : ''}</strong>
                          <p className="text-xs text-slate-600">{m.detail}{m.doctor ? ` · ${m.doctor}` : ''}{m.until ? ` · until ${fmt(m.until)}` : ''}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.items.filter((i: any) => i.type === 'medication').length > 0 && prescribed.length > 0 && (
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1">You added</p>
                )}
                {data.items.filter((i: any) => i.type === 'medication').length === 0 ? (prescribed.length > 0 ? null : (
                  <div className="py-3 px-2 text-center bg-cyan-50/30 border border-dashed border-cyan-200 my-1">
                    <p className="text-xs text-slate-600 font-medium">No active medications</p>
                  </div>
                )) : (
                  <ul className="divide-y divide-[color:var(--t-100)] max-h-48 overflow-y-auto">
                    {data.items.filter((i: any) => i.type === 'medication').map((i: any) => (
                      <li key={i.id} className="py-1.5 flex items-center justify-between gap-2 text-xs group">
                        <div className="min-w-0">
                          <strong className="text-[color:var(--ink)] font-bold block truncate">{i.name}</strong>
                          {i.detail && <p className="text-xs text-slate-600 truncate">{i.detail}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${i.name}`}
                          onClick={() => removeItem(i)}
                          className="h-11 w-11 flex items-center justify-center text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* COMPACT INLINE QUICK-ADD FORM */}
          <form 
            onSubmit={async e => {
              e.preventDefault();
              const d = await act(() => jpost('/api/records/items', item), 'Added.');
              if (d.status === 'success') setItem({ ...item, name: '', detail: '' });
            }}
            className="bg-white border border-[color:var(--t-200)] p-3 shadow-2xs flex flex-wrap sm:flex-nowrap items-center gap-2.5"
          >
            <div className="w-full sm:w-36 shrink-0">
              <label className="sr-only">Entry Type</label>
              <select 
                value={item.type} 
                onChange={e => setItem({ ...item, type: e.target.value })}
                className="w-full border border-[color:var(--t-200)] bg-white px-2.5 h-11 text-xs font-bold text-[color:var(--ink)] focus:outline-none focus:border-[color:var(--t-600)] transition-colors cursor-pointer"
              >
                <option value="allergy">Allergy</option>
                <option value="condition">Condition</option>
                <option value="medication">Medicine</option>
              </select>
            </div>

            <div className="flex-1 min-w-[140px] w-full sm:w-auto">
              <label className="sr-only">Name</label>
              <input 
                ref={nameRef}
                value={item.name} 
                onChange={e => setItem({ ...item, name: e.target.value })} 
                required 
                maxLength={120} 
                placeholder={item.type === 'allergy' ? 'Allergy name (e.g. Penicillin)' : item.type === 'condition' ? 'Condition (e.g. Hypertension)' : 'Medicine name (e.g. Metformin)'}
                className="w-full border border-[color:var(--t-200)] bg-white px-3 h-11 text-xs font-semibold text-[color:var(--ink)] placeholder:text-slate-600 focus:outline-none focus:border-[color:var(--t-600)] transition-colors"
              />
            </div>

            <div className="flex-1 min-w-[140px] w-full sm:w-auto">
              <label className="sr-only">Details</label>
              <input 
                value={item.detail} 
                onChange={e => setItem({ ...item, detail: e.target.value })} 
                maxLength={300} 
                placeholder="Details (optional, e.g. severe rash, 5mg daily)"
                className="w-full border border-[color:var(--t-200)] bg-white px-3 h-11 text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-600 focus:outline-none focus:border-[color:var(--t-600)] transition-colors"
              />
            </div>

            <button 
              type="submit"
              className="w-full sm:w-auto shrink-0 h-11 px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black border border-[color:var(--t-700)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Entry</span>
            </button>
          </form>

          <p className="text-xs text-slate-600 font-medium">
            Only you can see this unless you share it with a doctor. Each time a doctor opens it, that is logged. Keep it accurate: doctors and pharmacists use it to check that medicines are safe for you.
          </p>
        </div>
      )}

      {tab === 'vitals' && (
        <div className="space-y-4">
          <form className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 flex flex-wrap gap-x-4 gap-y-3 items-start" onSubmit={async e => {
            e.preventDefault();
            setVitalFlag(null);
            const d = await act(() => jpost('/api/records/vitals', { kind: vital.kind, value1: Number(vital.value1), value2: vital.kind === 'bp' ? Number(vital.value2) : undefined, takenAt: vital.takenAt ? new Date(vital.takenAt).toISOString() : undefined }), 'Reading saved.');
            if (d.status === 'success') { setVital({ ...vital, value1: '', value2: '', takenAt: localNow() }); setTrendKind(vital.kind); setVitalFlag(d.data.flag ? d.data.flag.text : null); }
          }}>
            <label className="text-xs font-bold text-slate-700 w-full sm:w-56 sm:flex-none">Reading<select className={`${field} block w-full mt-1.5`} value={vital.kind} onChange={e => setVital({ ...vital, kind: e.target.value, value1: '', value2: '' })}>{Object.entries(VITAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><span className="block font-normal text-slate-700 mt-1">What you measured</span></label>
            <label className="text-xs font-bold text-slate-700 flex-1 min-w-[200px]">{vital.kind === 'bp' ? 'Top number (systolic)' : 'Value'}
              <span className="flex items-center gap-2 mt-1.5">
                <input type="number" step="any" inputMode="decimal" className={`${field} block w-full min-w-0 flex-1`} value={vital.value1} onChange={e => setVital({ ...vital, value1: e.target.value })} min={vitalSpec?.min} max={vitalSpec?.max} required />
                <span className="text-xs font-semibold text-slate-700">{vitalSpec?.unit}</span>
              </span>
              {vitalSpec && <span className="block font-normal text-slate-700 mt-1">Between {vitalSpec.min} and {vitalSpec.max}</span>}
            </label>
            {vital.kind === 'bp' && <label className="text-xs font-bold text-slate-700 flex-1 min-w-[200px]">Bottom number (diastolic)
              <span className="flex items-center gap-2 mt-1.5">
                <input type="number" inputMode="decimal" className={`${field} block w-full min-w-0 flex-1`} value={vital.value2} onChange={e => setVital({ ...vital, value2: e.target.value })} min={vitalSpec?.min2} max={vitalSpec?.max2} required />
                <span className="text-xs font-semibold text-slate-700">{vitalSpec?.unit}</span>
              </span>
              {vitalSpec && <span className="block font-normal text-slate-700 mt-1">Between {vitalSpec.min2} and {vitalSpec.max2}</span>}
            </label>}
            <label className="text-xs font-bold text-slate-700 flex-[1.3] min-w-[240px]">When it was taken
              <input type="datetime-local" className={`${field} block w-full mt-1.5`} value={vital.takenAt} max={localNow()} onChange={e => setVital({ ...vital, takenAt: e.target.value })} required />
              <span className="block font-normal text-slate-700 mt-1">Now, unless you change it</span>
            </label>
            <div>
              <span className="block text-xs font-bold invisible" aria-hidden="true">Save</span>
              <button className="mt-1.5 h-11 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer border border-[color:var(--t-700)] shadow-xs transition-all">Save Reading</button>
            </div>
          </form>
          {vitalFlag && <p role="alert" className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold p-3 flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" />{vitalFlag}</p>}
          {/* Trend and the list of readings sit side by side on wide screens, stacked on narrow ones */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <section aria-labelledby="trend-heading" className="min-w-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 id="trend-heading" className="font-display font-black text-sm text-[color:var(--ink)]">Trend</h3>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">Show
                <select className={`${field} text-xs`} value={trendKind} onChange={e => setTrendKind(e.target.value)}>
                  {Object.entries(VITAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            </div>
            <TrendChart readings={data.vitals.filter((v: any) => v.kind === trendKind)} label={VITAL_LABEL[trendKind]} unit={trendSpec?.unit ?? ''} twoValues={!!trendSpec?.two} />
          </section>
          <section className="min-w-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5">
            <h3 className="font-display font-black text-sm text-[color:var(--ink)] mb-3">Recorded Physiological Readings</h3>
            {data.vitals.length === 0 ? (
              <div className="py-6 px-4 bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] text-center">
                <p className="text-xs text-slate-600 font-medium">No readings recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-xs font-mono font-extrabold uppercase text-slate-600 border-b border-[color:var(--t-200)] pb-2">
                      <th className="py-2">Date &amp; Time</th>
                      <th>Metric</th>
                      <th>Value</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--t-100)]">
                    {data.vitals.map((v: any) => (
                      <tr key={v.id} className="hover:bg-[color:var(--t-50)]/30 transition-colors">
                        <td className="py-2.5 font-mono text-slate-600">{new Date(v.ts).toLocaleString()}</td>
                        <td className="font-bold text-[color:var(--ink)]">{VITAL_LABEL[v.kind]}</td>
                        <td className={`py-2 font-mono font-bold ${v.flag?.level === 'urgent' ? 'text-rose-700' : 'text-slate-800'}`}>
                          {v.value1}{v.value2 ? `/${v.value2}` : ''} {v.unit}
                          {v.flag && (
                            <span className={`mt-1 flex items-start gap-1.5 font-sans font-semibold text-xs leading-snug max-w-md ${v.flag.level === 'urgent' ? 'text-rose-800' : 'text-amber-900'}`}>
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                              <span><span className="sr-only">{v.flag.level === 'urgent' ? 'Urgent: ' : 'Watch: '}</span>{v.flag.text}</span>
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            aria-label="Delete reading"
                            onClick={() => removeReading(v)}
                            className="h-11 w-11 inline-flex items-center justify-center text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>
        </div>
      )}

      {(tab === 'rx' || tab === 'rxhist') && (
        <PrescriptionList
          prescriptions={data.prescriptions}
          pharmacies={pharmacies}
          scope={tab === 'rx' ? 'active' : 'archive'}
          onChange={load}
          onSend={(id, pharmacyId, share) => act(() => jpost(`/api/prescriptions/${id}/send`, { pharmacyId, shareSafety: share }), 'Sent.')}
          onOpenPharmacies={onOpenPharmacies}
          onShowArchive={() => { setTab('rxhist'); onSubTabChange?.('rxhist'); }}
        />
      )}

      {(tab === 'docs' || tab === 'mc' || tab === 'referrals') && (
        <CertificatesPanel
          certificates={data.certificates}
          referrals={data.referrals}
          scope={tab === 'docs' ? 'both' : tab}
          onFindDoctors={onFindDoctors}
          onBookSpecialist={onBookSpecialist}
        />
      )}

      {tab === 'labs' && (
        <div className="space-y-3">
          {data.labOrders.length === 0 && <p className="text-xs text-slate-600 bg-white border border-slate-200 p-4">No lab tests have been requested.</p>}
          {data.labOrders.map((o: any) => (
            <article key={o.id} className="bg-white border border-slate-200 p-4 text-xs space-y-1.5">
              <p><b>{o.tests}</b> <span className="text-xs text-slate-600">requested by {o.doctor} · {fmt(o.orderedAt)}</span></p>
              {o.notes && <p className="text-xs">{o.notes}</p>}
              {o.status === 'resulted'
                ? <p className="text-xs font-bold text-emerald-800">Result uploaded {fmt(o.resultedAt)} · <a className="underline" href={`/api/documents/${o.resultDocumentId}/download`}>download</a></p>
                : <label className="text-xs font-bold border border-dashed border-slate-300 px-3 py-2 inline-block cursor-pointer">
                    Upload result (PDF, JPG or PNG)
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const form = new FormData(); form.append('file', f); form.append('kind', 'lab_result'); form.append('labOrderId', o.id);
                      await act(() => fetch('/api/documents', { method: 'POST', body: form }).then(r => r.json()), 'Result uploaded.');
                    }} />
                  </label>}
            </article>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          {data.encounters.length === 0 && <p className="text-xs text-slate-600 bg-white border border-slate-200 p-4">Your doctors' consultation summaries will appear here.</p>}
          {data.encounters.map((e: any) => (
            <article key={e.id} className="bg-white border border-slate-200 p-4 text-xs space-y-1">
              <p className="font-extrabold">{e.professionalName} · {fmt(e.signed_at)}</p>
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map(k => e[k] ? <p key={k}><span className="text-xs font-extrabold uppercase text-slate-600 mr-2">{k}</span>{e[k]}</p> : null)}
            </article>
          ))}
        </div>
      )}

      {tab === 'sharing' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-700 bg-white border border-slate-200 p-4">Doctors can read your allergies, conditions, medicines, readings and lab results only while you share them. You can stop sharing at any time. Every time a doctor opens your record it is logged.</p>
          <section className="bg-white border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-extrabold">Currently sharing with</h3>
            {data.grants.length === 0 ? <p className="text-xs text-slate-600">Nobody.</p> : data.grants.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between gap-3 text-xs border-t border-slate-100 pt-2">
                <span><b>{g.professionalName}</b> <span className="text-xs text-slate-600">until {fmt(g.expires_at)}</span></span>
                <button onClick={() => act(() => jpost(`/api/records/grants/${g.id}`, undefined, 'DELETE'), 'Sharing stopped.')} className="text-xs font-bold text-rose-700 cursor-pointer">Stop sharing</button>
              </div>
            ))}
          </section>
          {data.sharableWith.length > 0 && (
            <form className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap gap-2 items-end" onSubmit={e => { e.preventDefault(); if (shareWith) act(() => jpost('/api/records/grants', { professionalId: shareWith, days: 30 }), 'Shared for 30 days.'); }}>
              <label className="text-xs font-bold flex-1 min-w-[12rem]">Share with a doctor you have seen
                <select className={`${field} block w-full mt-1`} value={shareWith} onChange={e => setShareWith(e.target.value)}><option value="">Choose…</option>{data.sharableWith.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <button className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Share for 30 days</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
