import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');
const box = 'min-h-screen bg-[color:var(--t-bg)] flex items-start justify-center p-4 pt-12';
const card = 'bg-white border border-[color:var(--t-200)] shadow-sm w-full max-w-lg p-6 space-y-4';

/** Public pages: /rx/<code> and /cert/<code> (anyone), and /pharmacy (partner pharmacies with their PIN). */
export default function VerifyDocument({ path }: { path: string }) {
  const [, kind, code] = path.split('/');
  if (kind === 'pharmacy') return <PharmacyConsole />;
  return kind === 'rx' ? <VerifyRx code={code} /> : <VerifyCert code={code} />;
}

function useFetch(url: string) {
  const [data, setData] = useState<any | undefined>(undefined);
  React.useEffect(() => { fetch(url).then(r => r.json()).then(d => setData(d.data ?? null)).catch(() => setData(null)); }, [url]);
  return data;
}

function Result({ ok, title, children }: { ok: boolean; title: string; children?: React.ReactNode }) {
  return (
    <div className={box}><div className={card} role="status">
      <p className={`flex items-center gap-2 text-lg font-black ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>{ok ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}{title}</p>
      {children}
      <p className="text-[11px] text-slate-500">Checked live against CareVerified records.</p>
    </div></div>
  );
}

function VerifyRx({ code }: { code: string }) {
  const d = useFetch(`/api/verify/rx/${encodeURIComponent(code)}`);
  if (d === undefined) return <div className={box}><p className="text-sm">Checking…</p></div>;
  if (!d?.found) return <Result ok={false} title="No prescription found with this code" />;
  return (
    <Result ok={d.valid} title={d.valid ? 'Valid prescription' : `Not valid: ${d.status}`}>
      <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-slate-500">Prescriber</dt><dd className="font-bold">{d.prescriber?.name}</dd>
        <dt className="text-slate-500">Licence</dt><dd>{d.prescriber?.licenseNumber} {d.prescriber?.stillVerified ? '(currently verified)' : '(NOT currently verified)'}</dd>
        <dt className="text-slate-500">Issued</dt><dd>{fmt(d.issuedAt)}</dd>
        <dt className="text-slate-500">Valid until</dt><dd>{fmt(d.validUntil)}</dd>
        <dt className="text-slate-500">Medicines</dt><dd>{d.itemCount}</dd>
      </dl>
      <p className="text-xs text-slate-600">Pharmacies: sign in at <a className="underline font-bold" href="/pharmacy">/pharmacy</a> to see the medicines and record dispensing.</p>
    </Result>
  );
}

function VerifyCert({ code }: { code: string }) {
  const d = useFetch(`/api/verify/cert/${encodeURIComponent(code)}`);
  if (d === undefined) return <div className={box}><p className="text-sm">Checking…</p></div>;
  if (!d?.found) return <Result ok={false} title="No certificate found with this code" />;
  return (
    <Result ok={d.valid} title={d.valid ? 'Genuine medical certificate' : 'This certificate has been altered'}>
      <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-slate-500">Patient</dt><dd className="font-bold">{d.patient}</dd>
        <dt className="text-slate-500">Unfit for work</dt><dd>{d.fromDate} to {d.toDate}</dd>
        <dt className="text-slate-500">Issued by</dt><dd>{d.issuedBy?.name} ({d.issuedBy?.licenseNumber})</dd>
        <dt className="text-slate-500">Issued on</dt><dd>{fmt(d.issuedAt)}</dd>
      </dl>
    </Result>
  );
}

function PharmacyConsole() {
  const [auth, setAuth] = useState({ pharmacyId: '', pin: '' });
  const [code, setCode] = useState('');
  const [rx, setRx] = useState<any | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = 'border border-slate-200 px-3 py-2 text-sm w-full focus:outline-none focus:border-[color:var(--t-600)]';
  const post = (url: string, body: object) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setRx(null);
    const d = await post('/api/pharmacy/lookup', { ...auth, code: code.trim() });
    if (d.status === 'success') setRx(d.data); else setMsg({ ok: false, text: d.message });
  };
  const dispense = async () => {
    const d = await post('/api/pharmacy/dispense', { ...auth, code: code.trim() });
    if (d.status === 'success') { setMsg({ ok: true, text: 'Recorded as dispensed.' }); setRx({ ...rx, status: 'dispensed' }); } else setMsg({ ok: false, text: d.message });
  };

  return (
    <div className={box}><div className={card}>
      <h1 className="text-lg font-black">Pharmacy console</h1>
      <form onSubmit={lookup} className="space-y-3">
        <label className="text-xs font-bold block">Pharmacy ID<input className={input} value={auth.pharmacyId} onChange={e => setAuth({ ...auth, pharmacyId: e.target.value })} required autoComplete="off" /></label>
        <label className="text-xs font-bold block">PIN<input className={input} type="password" value={auth.pin} onChange={e => setAuth({ ...auth, pin: e.target.value })} required autoComplete="off" /></label>
        <label className="text-xs font-bold block">Prescription code<input className={`${input} font-mono uppercase`} value={code} onChange={e => setCode(e.target.value)} required maxLength={20} /></label>
        <button className="bg-[color:var(--t-600)] text-white text-sm font-extrabold px-5 py-2.5 cursor-pointer">Look up</button>
      </form>
      {msg && <p role="status" className={`text-sm font-bold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
      {rx && (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <p className="text-sm"><b>{rx.patientName}</b> · status <b>{rx.status}</b> · valid until {fmt(rx.validUntil)}</p>
          <p className="text-xs text-slate-600">{rx.prescriber?.name} ({rx.prescriber?.licenseNumber}) {rx.prescriber?.stillVerified ? '' : '· NOT currently verified'}</p>
          <ul className="text-sm list-disc ml-5">{rx.items.map((i: any, k: number) => <li key={k}><b>{i.name}</b> {i.strength} {i.form} · {i.dose}, {i.frequency} for {i.durationDays} days · qty {i.quantity}{i.instructions ? ` · ${i.instructions}` : ''}</li>)}</ul>
          {rx.notes && <p className="text-xs">Note: {rx.notes}</p>}
          {rx.status === 'active' && <button onClick={dispense} className="bg-emerald-700 text-white text-sm font-extrabold px-5 py-2.5 cursor-pointer">Mark as dispensed</button>}
        </div>
      )}
    </div></div>
  );
}
