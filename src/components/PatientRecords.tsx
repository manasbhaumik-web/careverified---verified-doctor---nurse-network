import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Activity, AlertTriangle, ClipboardList, FileText, FlaskConical, Pill, Share2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
const field = 'border border-[color:var(--t-200)] bg-white px-3.5 h-10 text-sm font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

const FILL_LABEL: Record<string, string> = { received: 'Received by the pharmacy', preparing: 'Being prepared', ready: 'Ready for pickup', cannot_fill: 'The pharmacy could not fill it' };
const VITAL_LABEL: Record<string, string> = { bp: 'Blood pressure', glucose: 'Blood sugar', heart_rate: 'Heart rate', spo2: 'Oxygen (SpO₂)', temperature: 'Temperature', weight: 'Weight' };

function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: 160 }).then(setSrc).catch(() => {}); }, [text]);
  return src ? <img src={src} alt="QR code to verify this document" width={120} height={120} /> : null;
}

export type RecordSubTab = 'overview' | 'vitals' | 'rx' | 'docs' | 'labs' | 'notes' | 'sharing';

/** The patient's own health record: allergies, conditions, medicines, readings, prescriptions, certificates, referrals, labs, sharing. */
export default function PatientRecords({ initialTab }: { initialTab?: RecordSubTab } = {}) {
  const [data, setData] = useState<any | null>(null);
  const [tab, setTab] = useState<RecordSubTab>(initialTab || 'overview');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

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
  // vitals
  const [vital, setVital] = useState({ kind: 'bp', value1: '', value2: '' });
  const [vitalFlag, setVitalFlag] = useState<string | null>(null);
  // sharing
  const [shareWith, setShareWith] = useState('');

  if (!data) return <p className="text-sm text-slate-600 p-6">Loading your health record…</p>;

  const tabs = [
    ['overview', 'Overview', ClipboardList], ['vitals', 'Readings', Activity], ['rx', 'Prescriptions', Pill], ['docs', 'Certificates & referrals', FileText],
    ['labs', 'Lab tests', FlaskConical], ['notes', 'Doctor notes', FileText], ['sharing', 'Sharing', Share2],
  ] as const;

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map(([id, text, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setMsg(null); }}
            className={`px-3 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${tab === id ? 'border-b-2 border-[color:var(--t-600)] text-[color:var(--t-700)]' : 'text-slate-500'}`}>
            <Icon className="h-3.5 w-3.5" /> {text}
          </button>
        ))}
      </div>
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
            className="text-[11px] underline cursor-pointer hover:opacity-80 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-5">
          {(['allergy', 'condition', 'medication'] as const).map(t => (
            <section key={t} className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5">
              <h3 className="font-display font-black text-sm text-[color:var(--ink)] mb-3 flex items-center gap-2">
                <span>{t === 'allergy' ? 'Documented Allergies' : t === 'condition' ? 'Chronic Medical Conditions' : 'Active Medications'}</span>
              </h3>
              {data.items.filter((i: any) => i.type === t).length === 0 ? (
                <div className="py-6 px-4 bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] text-center">
                  <p className="text-xs text-slate-500 font-medium">No {t === 'allergy' ? 'allergies' : t === 'condition' ? 'conditions' : 'medications'} recorded yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--t-100)]">
                  {data.items.filter((i: any) => i.type === t).map((i: any) => (
                    <li key={i.id} className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <span className="min-w-0">
                        <strong className={t === 'allergy' ? 'text-rose-700 font-bold' : 'text-[color:var(--ink)] font-bold'}>{i.name}</strong>
                        {i.severity ? <span className="text-[11px] font-mono ml-1 text-slate-500">({i.severity})</span> : ''}
                        {i.detail ? <span className="text-slate-500"> — {i.detail}</span> : null}
                      </span>
                      <button
                        aria-label={`Remove ${i.name}`}
                        onClick={() => act(() => jpost(`/api/records/items/${i.id}`, undefined, 'DELETE'))}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <form className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 flex flex-wrap gap-3 items-end" onSubmit={async e => {
            e.preventDefault();
            const d = await act(() => jpost('/api/records/items', item), 'Added.');
            if (d.status === 'success') setItem({ ...item, name: '', detail: '' });
          }}>
            <label className="text-xs font-bold text-slate-700">Type<select className={`${field} block mt-1.5`} value={item.type} onChange={e => setItem({ ...item, type: e.target.value })}><option value="allergy">Allergy</option><option value="condition">Condition</option><option value="medication">Medicine</option></select></label>
            <label className="text-xs font-bold text-slate-700 flex-1 min-w-[12rem]">Name<input className={`${field} block w-full mt-1.5`} value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} required maxLength={120} placeholder="e.g. Penicillin" /></label>
            <label className="text-xs font-bold text-slate-700 flex-1 min-w-[12rem]">Details (optional)<input className={`${field} block w-full mt-1.5`} value={item.detail} onChange={e => setItem({ ...item, detail: e.target.value })} maxLength={300} placeholder="e.g. skin rash, mild wheezing" /></label>
            <button className="h-10 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer border border-[color:var(--t-700)] shadow-xs transition-all">Add Entry</button>
          </form>
          <p className="text-[11px] text-slate-500">Accurate allergies and medicines help doctors prescribe safely. Only practitioners you choose can see this.</p>
        </div>
      )}

      {tab === 'vitals' && (
        <div className="space-y-4">
          <form className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 flex flex-wrap gap-3 items-end" onSubmit={async e => {
            e.preventDefault();
            setVitalFlag(null);
            const d = await act(() => jpost('/api/records/vitals', { kind: vital.kind, value1: Number(vital.value1), value2: vital.kind === 'bp' ? Number(vital.value2) : undefined }), 'Reading saved.');
            if (d.status === 'success') { setVital({ ...vital, value1: '', value2: '' }); setVitalFlag(d.data.flag ? d.data.flag.text : null); }
          }}>
            <label className="text-xs font-bold text-slate-700">Reading<select className={`${field} block mt-1.5`} value={vital.kind} onChange={e => setVital({ kind: e.target.value, value1: '', value2: '' })}>{Object.entries(VITAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-700">{vital.kind === 'bp' ? 'Systolic' : 'Value'}<input type="number" step="any" className={`${field} block w-32 mt-1.5`} value={vital.value1} onChange={e => setVital({ ...vital, value1: e.target.value })} required /></label>
            {vital.kind === 'bp' && <label className="text-xs font-bold text-slate-700">Diastolic<input type="number" className={`${field} block w-32 mt-1.5`} value={vital.value2} onChange={e => setVital({ ...vital, value2: e.target.value })} required /></label>}
            <button className="h-10 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer border border-[color:var(--t-700)] shadow-xs transition-all">Save Reading</button>
          </form>
          {vitalFlag && <p role="alert" className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm font-bold p-3 flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" />{vitalFlag}</p>}
          <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5">
            <h3 className="font-display font-black text-sm text-[color:var(--ink)] mb-3">Recorded Physiological Readings</h3>
            {data.vitals.length === 0 ? (
              <div className="py-6 px-4 bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] text-center">
                <p className="text-xs text-slate-500 font-medium">No readings recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] font-mono font-extrabold uppercase text-slate-500 border-b border-[color:var(--t-200)] pb-2">
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
                        <td className={`font-mono font-bold ${v.flag?.level === 'urgent' ? 'text-rose-700' : 'text-slate-800'}`}>
                          {v.value1}{v.value2 ? `/${v.value2}` : ''} {v.unit}
                        </td>
                        <td className="text-right">
                          <button
                            aria-label="Delete reading"
                            onClick={() => act(() => jpost(`/api/records/vitals/${v.id}`, undefined, 'DELETE'))}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
      )}

      {tab === 'rx' && (
        <div className="space-y-3">
          {data.prescriptions.length === 0 && (
            <div className="py-8 px-6 bg-white border border-dashed border-[color:var(--t-200)] text-center">
              <p className="text-sm font-semibold text-slate-600">No prescriptions issued yet.</p>
              <p className="text-xs text-slate-400 mt-1">E-prescriptions issued during doctor consultations appear here with tamper-proof QR codes.</p>
            </div>
          )}
          {data.prescriptions.map((p: any) => (
            <article key={p.id} className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 flex flex-wrap gap-4 justify-between">
              <div className="space-y-1.5 min-w-[14rem] flex-1">
                <p className="text-sm font-extrabold">{p.diagnosis}</p>
                <p className="text-xs text-slate-500">{p.doctor?.name} (licence {p.doctor?.licenseNumber}) · issued {fmt(p.issuedAt)} · valid until {fmt(p.validUntil)}</p>
                <ul className="text-sm list-disc ml-5">{p.items.map((i: any, k: number) => <li key={k}><b>{i.name}</b> {i.strength} {i.form} · {i.dose}, {i.frequency} for {i.durationDays} days · qty {i.quantity}{i.instructions ? ` · ${i.instructions}` : ''}</li>)}</ul>
                <p className="text-xs"><span className={`font-bold px-2 py-0.5 border ${p.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{p.status}</span> · code <span className="font-mono font-bold">{p.code}</span></p>
                {p.pharmacyName && (
                  <p className="text-xs text-slate-700 [overflow-wrap:anywhere]">
                    Sent to <b>{p.pharmacyName}</b>{p.sharedSafety ? ' (allergies and medicines shared)' : ''}
                    {p.status === 'dispensed' ? <> · <span className="font-bold text-emerald-700">dispensed {fmt(p.dispensedAt)}</span></>
                      : p.fillStatus ? <> · <span className={`font-bold ${p.fillStatus === 'cannot_fill' ? 'text-rose-700' : 'text-emerald-700'}`}>{FILL_LABEL[p.fillStatus] ?? p.fillStatus}</span>{p.fillStatus === 'cannot_fill' && p.fillReason ? `: ${p.fillReason}` : ''}</>
                      : p.status === 'active' ? <> · waiting for the pharmacy to respond</> : null}
                  </p>
                )}
                {p.status === 'active' && pharmacies.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <select aria-label="Choose a pharmacy" className={`${field} text-xs py-1.5`} defaultValue={p.pharmacyId ?? ''} id={`ph-${p.id}`}>
                      <option value="">Send to a pharmacy…</option>
                      {pharmacies.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </select>
                    <button className="text-xs font-bold border border-slate-300 px-3 cursor-pointer" onClick={() => {
                      const id = (document.getElementById(`ph-${p.id}`) as HTMLSelectElement).value;
                      if (id) act(() => jpost(`/api/prescriptions/${p.id}/send`, { pharmacyId: id, shareSafety: (document.getElementById(`share-${p.id}`) as HTMLInputElement | null)?.checked === true }), 'Sent.');
                    }}>Send</button>
                  </div>
                )}
                {p.status === 'active' && pharmacies.length > 0 && (
                  <label className="text-xs text-slate-700 flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" id={`share-${p.id}`} defaultChecked={!!p.sharedSafety} className="mt-0.5 h-4 w-4 accent-[color:var(--t-600)]" />
                    <span>Share my allergies and current medicines with the pharmacy so the pharmacist can check safety <b>(recommended)</b>.</span>
                  </label>
                )}
                {p.status === 'active' && <button className="text-xs font-bold underline cursor-pointer" onClick={() => window.print()}>Print</button>}
              </div>
              <div className="text-center"><Qr text={`${window.location.origin}/rx/${p.code}`} /><p className="text-[10px] text-slate-500 mt-1">Scan to verify</p></div>
            </article>
          ))}
        </div>
      )}

      {tab === 'docs' && (
        <div className="space-y-5">
          <section className="space-y-2"><h3 className="text-sm font-extrabold">Medical certificates</h3>
            {data.certificates.length === 0 && <p className="text-xs text-slate-500">None.</p>}
            {data.certificates.map((c: any) => (
              <article key={c.id} className="bg-white border border-slate-200 p-4 flex flex-wrap gap-4 justify-between items-center">
                <div className="text-sm"><b>{c.fromDate} to {c.toDate}</b><p className="text-xs text-slate-500">{c.doctor?.name} · issued {fmt(c.issuedAt)} · code <span className="font-mono font-bold">{c.code}</span></p>{c.remarks && <p className="text-xs">{c.remarks}</p>}<p className="text-[11px] text-slate-500 mt-1">Your employer can check it at {window.location.origin}/cert/{c.code}</p></div>
                <Qr text={`${window.location.origin}/cert/${c.code}`} />
              </article>
            ))}
          </section>
          <section className="space-y-2"><h3 className="text-sm font-extrabold">Referrals</h3>
            {data.referrals.length === 0 && <p className="text-xs text-slate-500">None.</p>}
            {data.referrals.map((r: any) => (
              <article key={r.id} className="bg-white border border-slate-200 p-4 text-sm"><b>{r.toSpecialty}</b> · {r.urgency}<p className="text-xs text-slate-500">From {r.from} · {fmt(r.issuedAt)}</p><p className="text-xs mt-1">{r.reason}</p></article>
            ))}
          </section>
        </div>
      )}

      {tab === 'labs' && (
        <div className="space-y-3">
          {data.labOrders.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-200 p-4">No lab tests have been requested.</p>}
          {data.labOrders.map((o: any) => (
            <article key={o.id} className="bg-white border border-slate-200 p-4 text-sm space-y-1.5">
              <p><b>{o.tests}</b> <span className="text-xs text-slate-500">requested by {o.doctor} · {fmt(o.orderedAt)}</span></p>
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
          {data.encounters.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-200 p-4">Your doctors' consultation summaries will appear here.</p>}
          {data.encounters.map((e: any) => (
            <article key={e.id} className="bg-white border border-slate-200 p-4 text-sm space-y-1">
              <p className="font-extrabold">{e.professionalName} · {fmt(e.signed_at)}</p>
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map(k => e[k] ? <p key={k}><span className="text-[10px] font-extrabold uppercase text-slate-500 mr-2">{k}</span>{e[k]}</p> : null)}
            </article>
          ))}
        </div>
      )}

      {tab === 'sharing' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700 bg-white border border-slate-200 p-4">Doctors can read your allergies, conditions, medicines, readings and lab results only while you share them. You can stop sharing at any time. Every time a doctor opens your record it is logged.</p>
          <section className="bg-white border border-slate-200 p-4 space-y-2">
            <h3 className="text-sm font-extrabold">Currently sharing with</h3>
            {data.grants.length === 0 ? <p className="text-xs text-slate-500">Nobody.</p> : data.grants.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between gap-3 text-sm border-t border-slate-100 pt-2">
                <span><b>{g.professionalName}</b> <span className="text-xs text-slate-500">until {fmt(g.expires_at)}</span></span>
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
