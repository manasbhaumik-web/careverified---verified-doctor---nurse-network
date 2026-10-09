import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Activity, AlertTriangle, ClipboardList, FileText, FlaskConical, Pill, Share2, Trash2 } from 'lucide-react';

const jpost = (url: string, body?: unknown, method = 'POST') =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
const field = 'border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--t-600)]';

const VITAL_LABEL: Record<string, string> = { bp: 'Blood pressure', glucose: 'Blood sugar', heart_rate: 'Heart rate', spo2: 'Oxygen (SpO₂)', temperature: 'Temperature', weight: 'Weight' };

function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: 160 }).then(setSrc).catch(() => {}); }, [text]);
  return src ? <img src={src} alt="QR code to verify this document" width={120} height={120} /> : null;
}

/** The patient's own health record: allergies, conditions, medicines, readings, prescriptions, certificates, referrals, labs, sharing. */
export default function PatientRecords() {
  const [data, setData] = useState<any | null>(null);
  const [tab, setTab] = useState<'overview' | 'vitals' | 'rx' | 'docs' | 'labs' | 'notes' | 'sharing'>('overview');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);

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
      {msg && <p role="status" className={`text-xs font-bold p-2.5 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      {tab === 'overview' && (
        <div className="space-y-5">
          {(['allergy', 'condition', 'medication'] as const).map(t => (
            <section key={t} className="bg-white border border-slate-200 p-4">
              <h3 className="text-sm font-extrabold mb-2">{t === 'allergy' ? 'Allergies' : t === 'condition' ? 'Medical conditions' : 'Medicines I take now'}</h3>
              {data.items.filter((i: any) => i.type === t).length === 0 ? <p className="text-xs text-slate-500">Nothing recorded yet.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.items.filter((i: any) => i.type === t).map((i: any) => (
                    <li key={i.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <span><b className={t === 'allergy' ? 'text-rose-700' : ''}>{i.name}</b>{i.severity ? ` (${i.severity})` : ''}{i.detail ? <span className="text-slate-500"> — {i.detail}</span> : null}</span>
                      <button aria-label={`Remove ${i.name}`} onClick={() => act(() => jpost(`/api/records/items/${i.id}`, undefined, 'DELETE'))} className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <form className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap gap-2 items-end" onSubmit={async e => {
            e.preventDefault();
            const d = await act(() => jpost('/api/records/items', item), 'Added.');
            if (d.status === 'success') setItem({ ...item, name: '', detail: '' });
          }}>
            <label className="text-xs font-bold">Type<select className={`${field} block mt-1`} value={item.type} onChange={e => setItem({ ...item, type: e.target.value })}><option value="allergy">Allergy</option><option value="condition">Condition</option><option value="medication">Medicine</option></select></label>
            <label className="text-xs font-bold flex-1 min-w-[10rem]">Name<input className={`${field} block w-full mt-1`} value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} required maxLength={120} placeholder="e.g. Penicillin" /></label>
            <label className="text-xs font-bold flex-1 min-w-[10rem]">Details (optional)<input className={`${field} block w-full mt-1`} value={item.detail} onChange={e => setItem({ ...item, detail: e.target.value })} maxLength={300} placeholder="e.g. rash" /></label>
            <button className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Add</button>
          </form>
          <p className="text-[11px] text-slate-500">Accurate allergies and medicines help doctors prescribe safely. Only practitioners you choose can see this.</p>
        </div>
      )}

      {tab === 'vitals' && (
        <div className="space-y-4">
          <form className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap gap-2 items-end" onSubmit={async e => {
            e.preventDefault();
            setVitalFlag(null);
            const d = await act(() => jpost('/api/records/vitals', { kind: vital.kind, value1: Number(vital.value1), value2: vital.kind === 'bp' ? Number(vital.value2) : undefined }), 'Reading saved.');
            if (d.status === 'success') { setVital({ ...vital, value1: '', value2: '' }); setVitalFlag(d.data.flag ? d.data.flag.text : null); }
          }}>
            <label className="text-xs font-bold">Reading<select className={`${field} block mt-1`} value={vital.kind} onChange={e => setVital({ kind: e.target.value, value1: '', value2: '' })}>{Object.entries(VITAL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="text-xs font-bold">{vital.kind === 'bp' ? 'Systolic' : 'Value'}<input type="number" step="any" className={`${field} block w-28 mt-1`} value={vital.value1} onChange={e => setVital({ ...vital, value1: e.target.value })} required /></label>
            {vital.kind === 'bp' && <label className="text-xs font-bold">Diastolic<input type="number" className={`${field} block w-28 mt-1`} value={vital.value2} onChange={e => setVital({ ...vital, value2: e.target.value })} required /></label>}
            <button className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Save reading</button>
          </form>
          {vitalFlag && <p role="alert" className="bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm font-bold p-3 flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" />{vitalFlag}</p>}
          <section className="bg-white border border-slate-200 p-4">
            {data.vitals.length === 0 ? <p className="text-xs text-slate-500">No readings yet.</p> : (
              <table className="w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-slate-500"><th className="py-1">Date</th><th>Reading</th><th>Value</th><th /></tr></thead>
                <tbody>{data.vitals.map((v: any) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="py-1.5">{new Date(v.ts).toLocaleString()}</td><td>{VITAL_LABEL[v.kind]}</td>
                    <td className={`font-bold tabular-nums ${v.flag?.level === 'urgent' ? 'text-rose-700' : ''}`}>{v.value1}{v.value2 ? `/${v.value2}` : ''} {v.unit}</td>
                    <td className="text-right"><button aria-label="Delete reading" onClick={() => act(() => jpost(`/api/records/vitals/${v.id}`, undefined, 'DELETE'))} className="text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>))}</tbody></table>
            )}
          </section>
        </div>
      )}

      {tab === 'rx' && (
        <div className="space-y-3">
          {data.prescriptions.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-200 p-4">No prescriptions yet.</p>}
          {data.prescriptions.map((p: any) => (
            <article key={p.id} className="bg-white border border-slate-200 p-4 flex flex-wrap gap-4 justify-between">
              <div className="space-y-1.5 min-w-[14rem] flex-1">
                <p className="text-sm font-extrabold">{p.diagnosis}</p>
                <p className="text-xs text-slate-500">{p.doctor?.name} (licence {p.doctor?.licenseNumber}) · issued {fmt(p.issuedAt)} · valid until {fmt(p.validUntil)}</p>
                <ul className="text-sm list-disc ml-5">{p.items.map((i: any, k: number) => <li key={k}><b>{i.name}</b> {i.strength} {i.form} · {i.dose}, {i.frequency} for {i.durationDays} days · qty {i.quantity}{i.instructions ? ` · ${i.instructions}` : ''}</li>)}</ul>
                <p className="text-xs"><span className={`font-bold px-2 py-0.5 border ${p.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{p.status}</span> · code <span className="font-mono font-bold">{p.code}</span></p>
                {p.status === 'active' && pharmacies.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <select aria-label="Choose a pharmacy" className={`${field} text-xs py-1.5`} defaultValue={p.pharmacyId ?? ''} id={`ph-${p.id}`}>
                      <option value="">Send to a pharmacy…</option>
                      {pharmacies.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </select>
                    <button className="text-xs font-bold border border-slate-300 px-3 cursor-pointer" onClick={() => {
                      const id = (document.getElementById(`ph-${p.id}`) as HTMLSelectElement).value;
                      if (id) act(() => jpost(`/api/prescriptions/${p.id}/send`, { pharmacyId: id }), 'Sent.');
                    }}>Send</button>
                  </div>
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
