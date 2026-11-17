import { CustomSelect } from '../shared/ui/CustomSelect';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import PrescriptionList, { fmtDate } from '../domains/prescriptions/PrescriptionList';
import CertificatesPanel from './CertificatesPanel';
import TrendChart from './TrendChart';
import { useTr } from '../locale';
import { Activity, AlertTriangle, ClipboardList, FileText, FlaskConical, Pill, Share2, Trash2, CheckCircle2, AlertCircle, Plus, ShieldCheck } from 'lucide-react';

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const fmt = fmtDate;
const field = 'border border-[color:var(--t-200)] bg-white px-3.5 h-11 text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-colors';

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
  const tx = useTr();
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

  if (!data) return <p className="text-xs text-slate-600 p-6">{tx('Loading your health record…')}</p>;

  const removeItem = async (i: any) => {
    if (i.type === 'allergy' && !window.confirm(tx('Remove the {name} allergy from your record? Doctors and pharmacists use this to keep you safe.', { name: i.name }))) return;
    const d = await act(() => jpost(`/api/records/items/${i.id}`, undefined, 'DELETE'));
    if (d.status === 'success' && i.type !== 'allergy') setUndo({ label: i.name, payload: { type: i.type, name: i.name, detail: i.detail ?? null, severity: i.severity ?? null } });
  };
  const removeReading = (v: any) => {
    if (!window.confirm(tx('Delete this reading? This cannot be undone.'))) return;
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

  const nAllergies = data.items.filter((i: any) => i.type === 'allergy').length;
  const nConditions = data.items.filter((i: any) => i.type === 'condition').length;
  const nMedicines = data.items.filter((i: any) => i.type === 'medication').length;
  const startAdd = (type: string) => { setItem({ type, name: '', detail: '' }); nameRef.current?.focus(); nameRef.current?.scrollIntoView({ block: 'center' }); };
  // Card heading: a coloured icon tile, a sentence-case title and one round count badge
  const cardHead = (Icon: React.ComponentType<{ className?: string }>, tile: string, title: string, count: number, badge: string) => (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-9 w-9 shrink-0 flex items-center justify-center ${tile}`}><Icon className="h-4 w-4" /></span>
        <h3 className="font-display font-bold text-base text-[color:var(--ink)] truncate">{tx(title)}</h3>
      </div>
      <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full border text-xs font-bold tabular-nums ${badge}`}>{count}</span>
    </div>
  );
  const emptyState = (text: string, type: string) => (
    <div className="py-5 px-4 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate-700 font-medium">{tx(text)}</p>
      <button type="button" onClick={() => startAdd(type)} className="min-h-[44px] px-3 inline-flex items-center gap-1.5 bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] text-xs font-bold cursor-pointer">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />{tx('Add Entry')}
      </button>
    </div>
  );
  // One row per entry on a soft tint, with the remove button shown on hover or keyboard focus (always visible on touch screens)
  const itemRows = (type: string, tint: string, nameColor: string) => (
    <ul className="space-y-2">
      {data.items.filter((i: any) => i.type === type).map((i: any) => (
        <li key={i.id} className={`group pl-4 pr-1 py-1 flex items-center justify-between gap-2 text-xs ${tint}`}>
          <div className="min-w-0 py-1.5">
            <strong className={`${nameColor} font-bold block truncate`}>{tx(i.name)}</strong>
            {i.detail && <p className="text-xs text-slate-600 truncate">{i.detail}</p>}
          </div>
          <button
            type="button"
            aria-label={tx('Remove {name}', { name: i.name })}
            onClick={() => removeItem(i)}
            className="h-11 w-11 flex items-center justify-center text-slate-600 hover:text-rose-700 hover:bg-white/70 transition-all cursor-pointer shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );

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
              <Icon className="h-3.5 w-3.5" /> {tx(text)}
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
            <span>{tx(msg.text)}</span>
          </div>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="text-xs underline cursor-pointer hover:opacity-80 shrink-0 min-h-[44px] px-2"
          >
            {tx('Dismiss')}
          </button>
        </div>
      )}

      {undo && (
        <div role="status" className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white text-xs font-semibold pl-4 pr-1 min-h-[48px] flex items-center gap-3 shadow-lg max-w-[calc(100vw-2rem)]">
          <span className="truncate">{tx('Removed {label}.', { label: undo.label })}</span>
          <button
            type="button"
            onClick={async () => { const u = undo; setUndo(null); await act(() => jpost('/api/records/items', u.payload), 'Put back.'); }}
            className="min-h-[44px] px-4 font-extrabold underline cursor-pointer shrink-0"
          >
            {tx('Undo')}
          </button>
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-5">
          {/* ADD TO THE RECORD: the main action, kept above the lists it adds to */}
          <form
            onSubmit={async e => {
              e.preventDefault();
              const d = await act(() => jpost('/api/records/items', item), 'Added.');
              if (d.status === 'success') setItem({ ...item, name: '', detail: '' });
            }}
            className="bg-white border border-[color:var(--t-100)] shadow-sm p-4 sm:p-5 flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-extrabold text-base text-[color:var(--ink)]">{tx('Add to your record')}</h2>
              <div role="group" aria-label={tx('Entry Type')} className="flex w-full sm:w-auto bg-[color:var(--t-50)] p-1 gap-1">
                {([['allergy', 'Allergy'], ['condition', 'Condition'], ['medication', 'Medicine']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={item.type === value}
                    onClick={() => setItem({ ...item, type: value })}
                    className={`flex-1 sm:flex-none min-h-[44px] px-4 text-xs font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 ${item.type === value ? 'bg-[color:var(--t-600)] text-white' : 'text-[color:var(--t-700)] hover:bg-white'}`}
                  >
                    {tx(label)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap lg:flex-nowrap items-end gap-3">
              <label className="flex-1 min-w-[200px] w-full sm:w-auto text-xs font-bold text-slate-700">
                {tx(item.type === 'allergy' ? 'Allergy name' : item.type === 'condition' ? 'Condition name' : 'Medicine name')}
                <input
                  ref={nameRef}
                  value={item.name}
                  onChange={e => setItem({ ...item, name: e.target.value })}
                  required
                  maxLength={120}
                  placeholder={tx(item.type === 'allergy' ? 'Allergy name (e.g. Penicillin)' : item.type === 'condition' ? 'Condition (e.g. Hypertension)' : 'Medicine name (e.g. Metformin)')}
                  className="mt-1.5 block w-full border border-[color:var(--t-200)] bg-white px-3 h-11 text-xs font-semibold text-[color:var(--ink)] placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus:border-[color:var(--t-600)] transition-colors"
                />
              </label>

              <label className="flex-[2] min-w-[200px] w-full sm:w-auto text-xs font-bold text-slate-700">
                {tx('Details (optional)')}
                <input
                  value={item.detail}
                  onChange={e => setItem({ ...item, detail: e.target.value })}
                  maxLength={300}
                  placeholder={tx('Details (optional, e.g. severe rash, 5mg daily)')}
                  className="mt-1.5 block w-full border border-[color:var(--t-200)] bg-white px-3 h-11 text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus:border-[color:var(--t-600)] transition-colors"
                />
              </label>

              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 h-11 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{tx('Add Entry')}</span>
              </button>
            </div>
          </form>

          {/* Allergies and conditions stack in a narrow column; medicines get the wider one */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              {/* ALLERGIES */}
              <section className="bg-white border border-[color:var(--t-100)] shadow-sm p-5">
                {cardHead(AlertTriangle, 'bg-rose-50 text-rose-700', 'Documented Allergies', nAllergies,
                  nAllergies > 0 ? 'bg-rose-50 text-rose-800 border-rose-200' : saidNoAllergies ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300')}
                {nAllergies === 0 ? (
                  saidNoAllergies ? (
                    <div className="py-3 px-4 bg-emerald-50 space-y-1">
                      <p className="text-sm text-emerald-900 font-bold">{tx('You told us you have no known allergies.')}</p>
                      <p className="text-xs text-slate-700">{tx('Said on {date}.', { date: new Date(data.allergyStatement.recorded_at).toLocaleDateString() })}</p>
                      <button type="button" onClick={clearNoKnownAllergies} className="min-h-[44px] text-xs font-bold underline text-emerald-900 cursor-pointer">{tx('Change this')}</button>
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-slate-50 space-y-2">
                      <p className="text-sm text-slate-800 font-bold">{tx('No allergies recorded yet.')}</p>
                      <p className="text-xs text-slate-700 leading-snug">{tx('Doctors and pharmacists cannot tell "none" from "not filled in". Add an allergy, or tell us you have none.')}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={addAnAllergy} className="min-h-[44px] px-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer">{tx('Add an allergy')}</button>
                        <button type="button" onClick={noKnownAllergies} className="min-h-[44px] px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 text-xs font-bold cursor-pointer">{tx('I have no known allergies')}</button>
                      </div>
                    </div>
                  )
                ) : itemRows('allergy', 'bg-rose-50/60', 'text-rose-900')}
              </section>

              {/* CHRONIC CONDITIONS */}
              <section className="bg-white border border-[color:var(--t-100)] shadow-sm p-5">
                {cardHead(Activity, 'bg-[color:var(--t-50)] text-[color:var(--t-700)]', 'Chronic Conditions', nConditions, 'bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]')}
                {nConditions === 0
                  ? emptyState('No chronic conditions', 'condition')
                  : itemRows('condition', 'bg-[color:var(--t-50)]', 'text-[color:var(--ink)]')}
              </section>
            </div>

            {/* MEDICATIONS */}
            <section className="lg:col-span-3 bg-white border border-[color:var(--t-100)] shadow-sm p-5">
              {cardHead(Pill, 'bg-cyan-50 text-cyan-700', 'Active Medications', nMedicines + prescribed.length, 'bg-cyan-50 text-cyan-800 border-cyan-200')}

              {prescribed.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-[color:var(--t-700)] mb-2">{tx('Prescribed by your doctors')}</p>
                  <ul className="space-y-2">
                    {prescribed.map((m, k) => (
                      <li key={k} className="px-4 py-3 bg-[color:var(--t-50)] text-xs">
                        <strong className="text-[color:var(--ink)] font-bold block">{m.name}{m.strength ? ` ${m.strength}` : ''}</strong>
                        <p className="mt-0.5 text-xs text-slate-600">{m.detail}{m.doctor ? ` · ${m.doctor}` : ''}{m.until ? tx(' · until {date}', { date: fmt(m.until) }) : ''}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {nMedicines > 0 && prescribed.length > 0 && (
                <p className="text-xs font-bold text-slate-700 mb-2">{tx('You added')}</p>
              )}
              {nMedicines === 0
                ? (prescribed.length > 0 ? null : emptyState('No active medications', 'medication'))
                : itemRows('medication', 'bg-slate-50', 'text-[color:var(--ink)]')}
            </section>
          </div>

          <p className="flex items-start gap-3 bg-[color:var(--t-50)] px-4 py-3 text-xs text-slate-700 leading-snug">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" aria-hidden="true" />
            <span>{tx('Only you can see this unless you share it with a doctor. Each time a doctor opens it, that is logged. Keep it accurate: doctors and pharmacists use it to check that medicines are safe for you.')}</span>
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
            <label className="text-xs font-bold text-slate-700 w-full sm:w-56 sm:flex-none">{tx('Reading')}<CustomSelect className={`form-select ${field} block w-full mt-1.5`} value={vital.kind} onChange={e => setVital({ ...vital, kind: e.target.value, value1: '', value2: '' })}>{Object.entries(VITAL_LABEL).map(([k, l]) => <option key={k} value={k}>{tx(l)}</option>)}</CustomSelect><span className="block font-normal text-slate-700 mt-1">{tx('What you measured')}</span></label>
            <label className="text-xs font-bold text-slate-700 flex-1 min-w-[200px]">{tx(vital.kind === 'bp' ? 'Top number (systolic)' : 'Value')}
              <span className="flex items-center gap-2 mt-1.5">
                <input type="number" step="any" inputMode="decimal" className={`${field} block w-full min-w-0 flex-1`} value={vital.value1} onChange={e => setVital({ ...vital, value1: e.target.value })} min={vitalSpec?.min} max={vitalSpec?.max} required />
                <span className="text-xs font-semibold text-slate-700">{vitalSpec?.unit}</span>
              </span>
              {vitalSpec && <span className="block font-normal text-slate-700 mt-1">{tx('Between {a} and {b}', { a: vitalSpec.min, b: vitalSpec.max })}</span>}
            </label>
            {vital.kind === 'bp' && <label className="text-xs font-bold text-slate-700 flex-1 min-w-[200px]">{tx('Bottom number (diastolic)')}
              <span className="flex items-center gap-2 mt-1.5">
                <input type="number" inputMode="decimal" className={`${field} block w-full min-w-0 flex-1`} value={vital.value2} onChange={e => setVital({ ...vital, value2: e.target.value })} min={vitalSpec?.min2} max={vitalSpec?.max2} required />
                <span className="text-xs font-semibold text-slate-700">{vitalSpec?.unit}</span>
              </span>
              {vitalSpec && <span className="block font-normal text-slate-700 mt-1">{tx('Between {a} and {b}', { a: vitalSpec.min2, b: vitalSpec.max2 })}</span>}
            </label>}
            <label className="text-xs font-bold text-slate-700 flex-[1.3] min-w-[240px]">{tx('When it was taken')}
              <input type="datetime-local" className={`${field} block w-full mt-1.5`} value={vital.takenAt} max={localNow()} onChange={e => setVital({ ...vital, takenAt: e.target.value })} required />
              <span className="block font-normal text-slate-700 mt-1">{tx('Now, unless you change it')}</span>
            </label>
            <div className="w-full sm:w-auto">
              <span className="hidden sm:block text-xs font-bold invisible" aria-hidden="true">{tx('Save')}</span>
              <button className="w-full sm:w-auto sm:mt-1.5 h-11 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer border border-[color:var(--t-700)] shadow-xs transition-colors">{tx('Save Reading')}</button>
            </div>
          </form>
          {vitalFlag && <p role="alert" className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold p-3 flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" />{vitalFlag}</p>}
          {/* Trend and the list of readings sit side by side on wide screens, stacked on narrow ones */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <section aria-labelledby="trend-heading" className="min-w-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 id="trend-heading" className="font-display font-black text-sm text-[color:var(--ink)]">{tx('Trend')}</h3>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">{tx('Show')}
                <CustomSelect className={`form-select ${field} text-xs`} value={trendKind} onChange={e => setTrendKind(e.target.value)}>
                  {Object.entries(VITAL_LABEL).map(([k, l]) => <option key={k} value={k}>{tx(l)}</option>)}
                </CustomSelect>
              </label>
            </div>
            <TrendChart readings={data.vitals.filter((v: any) => v.kind === trendKind)} label={tx(VITAL_LABEL[trendKind])} unit={trendSpec?.unit ?? ''} twoValues={!!trendSpec?.two} />
          </section>
          <section className="min-w-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5">
            <h3 className="font-display font-black text-sm text-[color:var(--ink)] mb-3">{tx('Recorded Physiological Readings')}</h3>
            {data.vitals.length === 0 ? (
              <div className="py-6 px-4 bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] text-center">
                <p className="text-xs text-slate-600 font-medium">{tx('No readings recorded yet.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-xs font-mono font-extrabold uppercase text-slate-600 border-b border-[color:var(--t-200)] pb-2">
                      <th className="py-2">{tx('Date & Time')}</th>
                      <th>{tx('Metric')}</th>
                      <th>{tx('Value')}</th>
                      <th className="text-right">{tx('Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--t-100)]">
                    {data.vitals.map((v: any) => (
                      <tr key={v.id} className="hover:bg-[color:var(--t-50)]/30 transition-colors">
                        <td className="py-2.5 font-mono text-slate-600">{new Date(v.ts).toLocaleString()}</td>
                        <td className="font-bold text-[color:var(--ink)]">{tx(VITAL_LABEL[v.kind])}</td>
                        <td className={`py-2 font-mono font-bold ${v.flag?.level === 'urgent' ? 'text-rose-700' : 'text-slate-800'}`}>
                          {v.value1}{v.value2 ? `/${v.value2}` : ''} {v.unit}
                          {v.flag && (
                            <span className={`mt-1 flex items-start gap-1.5 font-sans font-semibold text-xs leading-snug max-w-md ${v.flag.level === 'urgent' ? 'text-rose-800' : 'text-amber-900'}`}>
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                              <span><span className="sr-only">{tx(v.flag.level === 'urgent' ? 'Urgent: ' : 'Watch: ')}</span>{v.flag.text}</span>
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            aria-label={tx('Delete reading')}
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
        <div className="space-y-3.5">
          {data.labOrders.length === 0 ? (
            <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2.5 shadow-2xs">
              <div className="w-11 h-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center mx-auto">
                <FlaskConical className="h-5 w-5" />
              </div>
              <h3 className="font-display font-black text-sm text-[color:var(--ink)]">{tx('No Diagnostic Lab Orders Requested')}</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">
                {tx('When a consulting physician orders blood pathology, urinalysis, or radiology imaging, the requisition and upload portal will appear here.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.labOrders.map((o: any) => {
                const isResulted = o.status === 'resulted';
                return (
                  <article
                    key={o.id}
                    className={`bg-white border-t-2 ${
                      isResulted ? 'border-t-emerald-600' : 'border-t-amber-500'
                    } border-x border-b border-[color:var(--t-200)] p-5 shadow-xs flex flex-col justify-between gap-4`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[color:var(--t-100)]">
                        <div className="min-w-0">
                          <span className="text-2xs font-mono font-bold uppercase tracking-wider text-slate-500 block">
                            {tx('Pathology Requisition')}
                          </span>
                          <h3 className="font-display font-black text-sm text-[color:var(--ink)] mt-0.5">
                            {o.tests}
                          </h3>
                        </div>
                        <span
                          className={`shrink-0 text-2xs font-mono font-bold uppercase px-2 py-0.5 border ${
                            isResulted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isResulted ? tx('Result Uploaded') : tx('Awaiting Lab Report')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-medium">
                          <strong className="text-[color:var(--ink)]">{tx('Ordering Physician:')}</strong> {o.doctor}
                        </p>
                        <p className="font-mono text-2xs text-slate-500">
                          {tx('Ordered on {date}', { date: fmt(o.orderedAt) })}
                        </p>
                      </div>

                      {o.notes && (
                        <div className="p-2.5 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] text-xs text-slate-700">
                          <span className="text-2xs font-mono font-bold uppercase text-slate-500 block mb-0.5">
                            {tx('Clinical Instructions')}
                          </span>
                          {o.notes}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between gap-3">
                      {isResulted ? (
                        <>
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{tx('Uploaded {date}', { date: fmt(o.resultedAt) })}</span>
                          </span>
                          <a
                            className="h-9 px-3.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                            href={`/api/documents/${o.resultDocumentId}/download`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{tx('Download Report')}</span>
                          </a>
                        </>
                      ) : (
                        <label className="w-full h-10 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] border border-dashed border-[color:var(--t-400)] text-[color:var(--t-800)] text-xs font-extrabold px-4 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors">
                          <Plus className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                          <span>{tx('Upload Lab Result (PDF, JPG or PNG)')}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={async e => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const form = new FormData();
                              form.append('file', f);
                              form.append('kind', 'lab_result');
                              form.append('labOrderId', o.id);
                              await act(() => fetch('/api/documents', { method: 'POST', body: form }).then(r => r.json()), 'Result uploaded.');
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          {data.encounters.length === 0 ? (
            <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2.5 shadow-2xs">
              <div className="w-11 h-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center mx-auto">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-display font-black text-sm text-[color:var(--ink)]">{tx('No Signed Physician SOAP Notes Yet')}</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">
                {tx('Your doctors\' signed consultation summaries (Subjective, Objective, Assessment & Plan) will appear here after your visit.')}
              </p>
            </div>
          ) : (
            data.encounters.map((e: any) => (
              <article
                key={e.id}
                className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-5 shadow-xs space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[color:var(--t-100)]">
                  <div>
                    <span className="text-2xs font-mono font-bold uppercase tracking-wider text-[color:var(--t-700)] block">
                      {tx('Signed Clinical Consultation Summary (SOAP)')}
                    </span>
                    <h3 className="font-display font-black text-sm text-[color:var(--ink)] mt-0.5">
                      {e.professionalName}
                    </h3>
                  </div>
                  <span className="text-2xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {tx('Signed {date}', { date: fmt(e.signed_at) })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {([
                    ['subjective', 'Subjective (Symptoms & History)'],
                    ['objective', 'Objective (Examination & Vitals)'],
                    ['assessment', 'Clinical Assessment / Diagnosis'],
                    ['plan', 'Treatment & Follow-Up Plan'],
                  ] as const).map(([k, title]) =>
                    e[k] ? (
                      <div key={k} className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3 space-y-1">
                        <span className="text-2xs font-mono font-extrabold uppercase tracking-wider text-slate-600 block">
                          {tx(title)}
                        </span>
                        <p className="text-xs text-[color:var(--ink)] font-medium leading-relaxed">{e[k]}</p>
                      </div>
                    ) : null
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'sharing' && (
        <div className="space-y-4">
          <div className="bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] p-4 flex items-start gap-3">
            <Share2 className="h-4 w-4 text-[color:var(--t-600)] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-bold text-[color:var(--ink)]">{tx('PDPA Patient-Controlled Record Consent (30-Day Statutory Window)')}</p>
              <p className="leading-relaxed">
                {tx('Doctors can read your allergies, conditions, medicines, readings and lab results only while you share them. You can stop sharing at any time. Every time a doctor opens your record it is logged.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <section className="lg:col-span-7 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[color:var(--t-100)]">
                <h3 className="font-display font-black text-sm text-[color:var(--ink)]">{tx('Currently sharing with')}</h3>
                <span className="text-2xs font-mono font-bold px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                  {data.grants.length} {tx('Active')}
                </span>
              </div>
              {data.grants.length === 0 ? (
                <div className="py-6 px-4 bg-[color:var(--t-50)]/30 border border-dashed border-[color:var(--t-200)] text-center">
                  <p className="text-xs text-slate-600 font-medium">{tx('Nobody currently has active access to your clinical record.')}</p>
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--t-100)]">
                  {data.grants.map((g: any) => (
                    <div key={g.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-[color:var(--ink)]">{g.professionalName}</p>
                        <p className="text-2xs font-mono text-slate-500">
                          {tx('Valid until {date}', { date: fmt(g.expires_at) })}
                          {g.source ? ` · ${tx('Granted via')} ${tx(g.source)}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => act(() => jpost(`/api/records/grants/${g.id}`, undefined, 'DELETE'), 'Sharing stopped.')}
                        className="h-9 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer transition-colors"
                      >
                        {tx('Stop sharing')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="lg:col-span-5 bg-white border-t-2 border-t-emerald-600 border-x border-b border-[color:var(--t-200)] p-5 shadow-xs space-y-3">
              <h3 className="font-display font-black text-sm text-[color:var(--ink)] pb-2.5 border-b border-[color:var(--t-100)]">
                {tx('Grant 30-Day Record Access')}
              </h3>
              {data.sharableWith.length > 0 ? (
                <form
                  className="space-y-3"
                  onSubmit={e => {
                    e.preventDefault();
                    if (shareWith) act(() => jpost('/api/records/grants', { professionalId: shareWith, days: 30 }), 'Shared for 30 days.');
                  }}
                >
                  <label className="text-xs font-bold text-slate-700 block">
                    {tx('Share with a doctor you have seen')}
                    <CustomSelect
                      className={`form-select ${field} block w-full mt-1.5`}
                      value={shareWith}
                      onChange={e => setShareWith(e.target.value)}
                    >
                      <option value="">{tx('Choose…')}</option>
                      {data.sharableWith.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>
                  <button
                    type="submit"
                    disabled={!shareWith}
                    className="w-full h-11 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-50 text-white text-xs font-extrabold px-5 cursor-pointer transition-colors"
                  >
                    {tx('Share for 30 days')}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {tx('Once you have booked or consulted a verified practitioner, you can grant them 30-day access to your health record from here.')}
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
