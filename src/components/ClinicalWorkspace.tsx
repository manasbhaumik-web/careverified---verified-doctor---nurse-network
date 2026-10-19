import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Ban, FilePlus2, Lock, Pill, Plus, Stethoscope, Trash2 } from 'lucide-react';
import PrescriptionCancelModal from './clinical/PrescriptionCancelModal';

type Kind = 'booking' | 'consult';
interface Props { kind: Kind; refId: string }

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const SEV: Record<string, string> = {
  contraindicated: 'bg-rose-100 border-rose-400 text-rose-900',
  major: 'bg-amber-100 border-amber-400 text-amber-900',
  moderate: 'bg-slate-100 border-slate-300 text-slate-800',
};
const blankItem = () => ({ name: '', strength: '', form: 'tablet', dose: '', frequency: '', durationDays: 5, quantity: 10, instructions: '', npraReg: '' });
const field = 'w-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-[color:var(--t-600)]';
const label = 'text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1';

/** The doctor's clinical tools for one booking or consultation: record, notes, prescriptions, certificates, referrals, labs. */
export default function ClinicalWorkspace({ kind, refId }: Props) {
  const [ctx, setCtx] = useState<any | null>(null);
  const [tab, setTab] = useState<'record' | 'notes' | 'rx' | 'mc' | 'refer'>('notes');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const load = useCallback(async () => {
    const d = await fetch(`/api/clinical/context/${kind}/${refId}`).then(r => r.json());
    if (d.status === 'success') { setCtx(d.data); if (d.data.encounter?.subjective !== undefined) setNote(n => ({ ...n, ...pick(d.data.encounter) })); }
    else setError(d.message || 'Could not load the clinical workspace.');
  }, [kind, refId]);
  useEffect(() => { load(); }, [load]);

  // ---- SOAP ----
  const pick = (e: any) => ({ subjective: e.subjective ?? '', objective: e.objective ?? '', assessment: e.assessment ?? '', plan: e.plan ?? '' });
  const [note, setNote] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const signed = !!ctx?.encounter?.signedAt;
  const saveNote = async (andSign = false) => {
    setError(''); setOk('');
    const d = await jpost(`/api/encounters/${kind}/${refId}`, note, 'PUT');
    if (d.status !== 'success') return setError(d.message);
    if (andSign) {
      if (!window.confirm('Sign this note? It cannot be edited afterwards and the patient will see it.')) return;
      const s = await jpost(`/api/encounters/${kind}/${refId}/sign`);
      if (s.status !== 'success') return setError(s.message);
    }
    setOk(andSign ? 'Note signed.' : 'Draft saved.');
    load();
  };

  // ---- prescribing ----
  const [items, setItems] = useState([blankItem()]);
  const [diagnosis, setDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [warnings, setWarnings] = useState<any[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  // Malaysian online-care rules (patient abroad, restricted after a video visit). Blocks issuing, unlike an interaction override.
  const [policyBlock, setPolicyBlock] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);

  const rxBody = () => ({
    kind, refId, diagnosis, items: items.map(i => ({ ...i, durationDays: Number(i.durationDays), quantity: Number(i.quantity) })),
    notes: rxNotes, validDays: Number(validDays), attestedAllergyCheck: attested,
    overrides: Object.entries(overrides).map(([key, reason]) => ({ key, reason })),
  });
  const runCheck = async () => {
    setError(''); setOk(''); setBusy(true);
    const d = await jpost('/api/prescriptions/check', rxBody());
    setBusy(false);
    if (d.status !== 'success') return setError(d.message);
    setWarnings(d.data.warnings); setUnknown(d.data.unknown); setPolicyBlock(d.data.policyBlock ?? null);
  };
  const issue = async () => {
    setError(''); setOk(''); setBusy(true);
    const d = await jpost('/api/prescriptions', rxBody());
    setBusy(false);
    if (d.status === 'success') {
      setOk(`Prescription issued. Verification code: ${d.data.code}`);
      setItems([blankItem()]); setDiagnosis(''); setRxNotes(''); setWarnings(null); setPolicyBlock(null); setOverrides({}); setAttested(false);
      return load();
    }
    if (d.data?.warnings) setWarnings(d.data.warnings);
    if (d.data?.policyBlock) { setPolicyBlock(d.data.policyBlock); if (!d.data?.warnings) setWarnings([]); }
    setError(d.message || 'Could not issue the prescription.');
  };

  const [cancelModalRx, setCancelModalRx] = useState<{ id: string; code: string; medications: string } | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const handleConfirmCancelRx = async (reason: string) => {
    if (!cancelModalRx) return;
    setCancelBusy(true);
    const d = await jpost(`/api/prescriptions/${cancelModalRx.id}/cancel`, { reason });
    setCancelBusy(false);
    if (d.status !== 'success') {
      setError(d.message || 'Could not cancel prescription.');
    } else {
      setCancelModalRx(null);
      setOk('Prescription cancelled.');
      load();
    }
  };
  const setItem = (i: number, patch: object) => { setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it)); setWarnings(null); setPolicyBlock(null); };

  // ---- certificate / referral / lab ----
  const today = new Date().toISOString().slice(0, 10);
  const [mc, setMc] = useState({ fromDate: today, toDate: today, remarks: '' });
  const [ref, setRef] = useState({ toSpecialty: '', reason: '', urgency: 'routine' });
  const [lab, setLab] = useState({ tests: '', notes: '' });
  const submit = async (url: string, body: object, done: () => void) => {
    setError(''); setOk('');
    const d = await jpost(url, { kind, refId, ...body });
    if (d.status !== 'success') return setError(d.message);
    setOk('Saved.'); done(); load();
  };

  if (!ctx) return <p className="text-sm text-slate-600 p-4">{error || 'Loading clinical workspace…'}</p>;

  const tabs = [
    ['notes', 'Notes', Stethoscope], ['rx', 'Prescribe', Pill], ['mc', 'Certificate', FilePlus2], ['refer', 'Refer & labs', Plus], ['record', 'Patient record', Lock],
  ] as const;
  const needOverride = (warnings ?? []).filter(w => w.severity === 'major');
  const blocked = (warnings ?? []).some(w => w.severity === 'contraindicated');
  const canIssue = !blocked && !policyBlock && needOverride.every(w => (overrides[w.key] ?? '').trim().length >= 5) && (ctx.recordShared || attested);

  return (
    <div className="space-y-3 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold">{ctx.patient.name}</p>
        <p className={`text-xs font-bold px-2 py-1 border ${ctx.recordShared ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {ctx.recordShared ? 'Patient shared their health record with you' : 'Patient has not shared their health record'}
        </p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2 border-b border-[color:var(--t-200)] pb-2">
        {tabs.map(([id, text, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(''); setOk(''); }}
            className={`px-3.5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${tab === id ? 'bg-[color:var(--t-600)] text-white shadow-xs' : 'bg-white border border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-50)]'}`}>
            <Icon className="h-4 w-4" /> {text}
          </button>
        ))}
      </div>
      {error && <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 p-3">{error}</p>}
      {ok && <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3">{ok}</p>}

      {tab === 'record' && (
        ctx.record ? (
          <div className="space-y-4 text-xs bg-white border border-[color:var(--t-200)] p-5 shadow-xs">
            <section><h4 className={label}>Allergies & Sensitivities</h4>{ctx.record.allergies.length ? ctx.record.allergies.map((a: any, i: number) => <p key={i} className="font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2 my-1">{a.name}{a.severity ? ` (${a.severity})` : ''}{a.detail ? ` — ${a.detail}` : ''}</p>) : <p className="text-slate-500">None recorded.</p>}</section>
            <section><h4 className={label}>Chronic Medical Conditions</h4>{ctx.record.conditions.length ? ctx.record.conditions.map((c: any, i: number) => <p key={i} className="font-semibold text-slate-800 py-0.5">{c.name}{c.detail ? ` — ${c.detail}` : ''}</p>) : <p className="text-slate-500">None recorded.</p>}</section>
            <section><h4 className={label}>Current Active Medications</h4>{ctx.record.medications.length ? ctx.record.medications.map((m: any, i: number) => <p key={i} className="font-semibold text-slate-800 py-0.5">{m.name}{m.detail ? ` — ${m.detail}` : ''}</p>) : <p className="text-slate-500">None recorded.</p>}</section>
            <section><h4 className={label}>Vitals & Physiological Readings</h4>{ctx.record.vitals.length ? ctx.record.vitals.slice(0, 8).map((v: any, i: number) => <p key={i} className="tabular-nums font-mono py-0.5">{new Date(v.ts).toLocaleDateString()} · {v.kind.replace('_', ' ')}: <b className="text-[color:var(--t-700)]">{v.value1}{v.value2 ? `/${v.value2}` : ''} {v.unit}</b></p>) : <p className="text-slate-500">None.</p>}</section>
            <section><h4 className={label}>Active Prescriptions</h4>{ctx.record.activePrescriptions.length ? ctx.record.activePrescriptions.map((p: any, i: number) => <p key={i} className="py-0.5 font-medium">{p.items.join(', ')}</p>) : <p className="text-slate-500">None.</p>}</section>
            <section><h4 className={label}>Verified Diagnostic Lab Results</h4>{ctx.record.labResults.length ? ctx.record.labResults.map((l: any) => <p key={l.id} className="py-1 flex items-center justify-between">{l.tests} <a className="underline font-bold text-[color:var(--t-700)]" href={`/api/documents/${l.result_document_id}/download`}>Download verified report</a></p>) : <p className="text-slate-500">None.</p>}</section>
          </div>
        ) : <div className="p-6 bg-white border border-[color:var(--t-200)] text-xs text-slate-600">The patient has not enabled health record access for this consultation session. Ask the patient to confirm key drug allergies verbally.</div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4 bg-white border border-[color:var(--t-200)] p-5 shadow-xs">
          {([['subjective', 'Subjective (Patient narrative, reported history, onset)'], ['objective', 'Objective (Vital signs, physical exam, camera inspection)'], ['assessment', 'Assessment (Working clinical diagnosis, ICD-10 provisional)'], ['plan', 'Plan (Treatment protocol, lifestyle, next follow-up)']] as const).map(([k, l]) => (
            <div key={k}>
              <label className={label} htmlFor={`soap-${k}`}>{l}</label>
              <textarea id={`soap-${k}`} rows={k === 'assessment' || k === 'plan' ? 2 : 3}
                className="w-full border border-[color:var(--t-200)] bg-[color:var(--t-bg)] focus:bg-white p-3 text-xs text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] transition-colors leading-relaxed"
                disabled={signed} maxLength={4000}
                value={note[k]} onChange={e => setNote(n => ({ ...n, [k]: e.target.value }))} />
            </div>
          ))}
          {signed ? (
            <p className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3">
              Digitally signed on {new Date(ctx.encounter.signedAt).toLocaleString()}. Encounter note is locked and archived.
            </p>
          ) : (
            <div className="flex gap-3 pt-2">
              <button onClick={() => saveNote(false)} className="h-10 border border-slate-300 hover:bg-slate-50 text-xs font-bold px-5 cursor-pointer transition-colors">Save Working Draft</button>
              <button onClick={() => saveNote(true)} className="h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-6 cursor-pointer transition-colors shadow-xs">Sign & Lock Note</button>
            </div>
          )}
        </div>
      )}

      {tab === 'rx' && (
        <div className="space-y-3">
          <div><label className={label} htmlFor="rx-dx">Diagnosis</label><input id="rx-dx" className={field} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} maxLength={300} /></div>
          {items.map((it, i) => (
            <fieldset key={i} className="border border-slate-200 p-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="col-span-2"><label className={label}>Medicine</label><input className={field} value={it.name} onChange={e => setItem(i, { name: e.target.value })} placeholder="Generic name" /></div>
                <div><label className={label}>Strength</label><input className={field} value={it.strength} onChange={e => setItem(i, { strength: e.target.value })} placeholder="500 mg" /></div>
                <div><label className={label}>Form</label><input className={field} value={it.form} onChange={e => setItem(i, { form: e.target.value })} /></div>
                <div><label className={label}>Dose</label><input className={field} value={it.dose} onChange={e => setItem(i, { dose: e.target.value })} placeholder="1 tablet" /></div>
                <div><label className={label}>Frequency</label><input className={field} value={it.frequency} onChange={e => setItem(i, { frequency: e.target.value })} placeholder="twice daily" /></div>
                <div><label className={label}>Days</label><input type="number" min={1} max={90} className={field} value={it.durationDays} onChange={e => setItem(i, { durationDays: e.target.value })} /></div>
                <div><label className={label}>Quantity</label><input type="number" min={1} max={999} className={field} value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value })} /></div>
                <div className="col-span-2 sm:col-span-4"><label className={label}>Instructions</label><input className={field} value={it.instructions} onChange={e => setItem(i, { instructions: e.target.value })} placeholder="After meals" maxLength={200} /></div>
                <div className="col-span-2 sm:col-span-4"><label className={label}>NPRA registration no. (optional)</label><input className={`${field} font-mono`} value={it.npraReg ?? ''} onChange={e => setItem(i, { npraReg: e.target.value.toUpperCase() })} placeholder="MAL12345678A" maxLength={20} /></div>
              </div>
              {items.length > 1 && <button onClick={() => { setItems(items.filter((_, x) => x !== i)); setWarnings(null); }} className="text-xs font-bold text-rose-700 flex items-center gap-1 cursor-pointer"><Trash2 className="h-3 w-3" /> Remove</button>}
            </fieldset>
          ))}
          <button onClick={() => { setItems([...items, blankItem()]); setWarnings(null); }} disabled={items.length >= 12} className="text-xs font-bold border border-slate-300 px-3 py-1.5 cursor-pointer">+ Add medicine</button>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={label}>Valid for (days)</label><input type="number" min={1} max={90} className={field} value={validDays} onChange={e => setValidDays(Number(e.target.value))} /></div>
            <div><label className={label}>Note to pharmacist</label><input className={field} value={rxNotes} onChange={e => setRxNotes(e.target.value)} maxLength={500} /></div>
          </div>

          {!ctx.recordShared && (
            <label className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 p-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={attested} onChange={e => setAttested(e.target.checked)} />
              <span>The patient has not shared their record. I confirm I have asked about allergies and current medicines. Automatic checks use only what I enter, so they will not catch the patient's recorded allergies.</span>
            </label>
          )}

          <button onClick={runCheck} disabled={busy} className="border border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer">Check safety</button>

          {warnings && (
            <div className="space-y-2" aria-live="polite">
              {policyBlock && (
                <div role="alert" className="border border-rose-300 bg-rose-50 text-rose-900 p-2.5 text-xs space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> NOT ALLOWED FOR THIS CONSULTATION</p>
                  <p>{policyBlock}</p>
                  <p className="font-bold">Cannot be issued.</p>
                </div>
              )}
              {warnings.length === 0 && unknown.length === 0 && !policyBlock && <p className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5">No issues found by the built-in checks.</p>}
              {warnings.map(w => (
                <div key={w.key} className={`border p-2.5 text-xs space-y-1.5 ${SEV[w.severity]}`}>
                  <p className="font-extrabold flex items-center gap-1.5">{w.severity === 'contraindicated' ? <Ban className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} {w.severity.toUpperCase()} · {w.drugs.join(' + ')}</p>
                  <p>{w.message}</p>
                  {w.severity === 'major' && (
                    <input className={field} placeholder="Reason for proceeding (required)" value={overrides[w.key] ?? ''} onChange={e => setOverrides(o => ({ ...o, [w.key]: e.target.value }))} />
                  )}
                  {w.severity === 'contraindicated' && <p className="font-bold">Cannot be issued.</p>}
                </div>
              ))}
              <p className="text-xs text-slate-500">Built-in checks cover a limited formulary and common interactions. They support, not replace, your clinical judgement.</p>
            </div>
          )}

          <button onClick={issue} disabled={busy || !diagnosis || (warnings === null) || !canIssue} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">
            {warnings === null ? 'Run the safety check first' : 'Sign and issue prescription'}
          </button>

          {ctx.prescriptions.length > 0 && (
            <section className="pt-3 border-t border-slate-200 space-y-2">
              <h4 className={label}>Issued for this visit</h4>
              {ctx.prescriptions.map((p: any) => (
                <div key={p.id} className="border border-slate-200 p-2.5 text-xs flex flex-wrap justify-between gap-2">
                  <span><b>{p.items.map((i: any) => i.name).join(', ')}</b> · code <span className="font-mono font-bold">{p.code}</span> · {p.status}</span>
                  {p.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setCancelModalRx({
                        id: p.id,
                        code: p.code,
                        medications: p.items.map((i: any) => i.name).join(', ')
                      })}
                      className="font-bold text-rose-700 cursor-pointer hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {tab === 'mc' && (
        <div className="space-y-3.5 max-w-lg">
          {kind === 'consult' ? (
            <div role="alert" className="border-2 border-amber-300 bg-amber-50 text-amber-900 p-3.5 text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 font-black text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>MMC Regulatory Restriction · Virtual Teleconsultation</span>
              </div>
              <p className="leading-relaxed font-medium">
                Under MMC Ethical Guidelines, medical certificates cannot be issued for virtual teleconsultations alone. If the patient requires medical leave, refer them for an in-person physical assessment.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Medical certificates do not state the diagnosis. In-clinic digital certificates are limited to 14 days.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>From</label>
              <input
                type="date"
                className={`${field} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
                value={mc.fromDate}
                disabled={kind === 'consult'}
                onChange={e => setMc({ ...mc, fromDate: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>To</label>
              <input
                type="date"
                className={`${field} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
                value={mc.toDate}
                disabled={kind === 'consult'}
                onChange={e => setMc({ ...mc, toDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={label}>Remarks (optional)</label>
            <input
              className={`${field} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
              value={mc.remarks}
              disabled={kind === 'consult'}
              onChange={e => setMc({ ...mc, remarks: e.target.value })}
              maxLength={200}
            />
          </div>

          <button
            type="button"
            onClick={() => submit('/api/certificates', mc, () => setMc({ ...mc, remarks: '' }))}
            disabled={busy || kind === 'consult'}
            className="bg-[color:var(--t-600)] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer transition-colors shadow-xs"
            title={kind === 'consult' ? 'Under MMC Ethical Guidelines, medical certificates cannot be issued for virtual teleconsultations alone.' : 'Sign and issue certificate'}
          >
            {kind === 'consult' ? 'Certificate Disabled for Teleconsult (MMC Rule)' : 'Sign and issue certificate'}
          </button>

          {ctx.certificates.length > 0 && (
            <ul className="text-xs space-y-1 pt-2 border-t border-slate-200">
              {ctx.certificates.map((c: any) => (
                <li key={c.id}>
                  {c.fromDate} to {c.toDate} · code <span className="font-mono font-bold">{c.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'refer' && (
        <div className="space-y-5">
          <div className="space-y-2 max-w-md">
            <h4 className={label}>Referral</h4>
            <input className={field} placeholder="Specialty (e.g. Cardiologist)" value={ref.toSpecialty} onChange={e => setRef({ ...ref, toSpecialty: e.target.value })} maxLength={100} />
            <textarea className={field} rows={3} placeholder="Reason for referral" value={ref.reason} onChange={e => setRef({ ...ref, reason: e.target.value })} maxLength={1000} />
            <select className={field} value={ref.urgency} onChange={e => setRef({ ...ref, urgency: e.target.value })}><option value="routine">Routine</option><option value="soon">Soon</option><option value="urgent">Urgent</option></select>
            <button onClick={() => submit('/api/referrals', ref, () => setRef({ toSpecialty: '', reason: '', urgency: 'routine' }))} className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Issue referral</button>
            {ctx.referrals.length > 0 && <ul className="text-xs space-y-1 pt-2 border-t border-slate-200">{ctx.referrals.map((r: any) => <li key={r.id}>{r.toSpecialty} · {r.urgency}</li>)}</ul>}
          </div>
          <div className="space-y-2 max-w-md">
            <h4 className={label}>Lab tests</h4>
            <input className={field} placeholder="Tests (e.g. FBC, HbA1c)" value={lab.tests} onChange={e => setLab({ ...lab, tests: e.target.value })} maxLength={500} />
            <input className={field} placeholder="Notes for the patient or lab" value={lab.notes} onChange={e => setLab({ ...lab, notes: e.target.value })} maxLength={300} />
            <button onClick={() => submit('/api/lab-orders', lab, () => setLab({ tests: '', notes: '' }))} className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Request tests</button>
            {ctx.labOrders.length > 0 && <ul className="text-xs space-y-1 pt-2 border-t border-slate-200">{ctx.labOrders.map((o: any) => (
              <li key={o.id}>{o.tests} · {o.status}{o.resultDocumentId && ctx.recordShared ? <> · <a className="underline font-bold" href={`/api/documents/${o.resultDocumentId}/download`}>download result</a></> : ''}</li>
            ))}</ul>}
          </div>
        </div>
      )}

      <PrescriptionCancelModal
        isOpen={Boolean(cancelModalRx)}
        rxCode={cancelModalRx?.code}
        rxMedications={cancelModalRx?.medications}
        onClose={() => setCancelModalRx(null)}
        onConfirm={handleConfirmCancelRx}
        busy={cancelBusy}
      />
    </div>
  );
}
