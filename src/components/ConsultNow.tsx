import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, MessageSquare, Video, Clock } from 'lucide-react';
import PaymentDialog from './PaymentDialog';
import ConsultRoom from './ConsultRoom';

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const STATUS_TEXT: Record<string, string> = {
  completed: 'Completed', cancelled: 'Cancelled', unmatched: 'No doctor available (refunded)', queued: 'Waiting', active: 'In progress', awaiting_payment: 'Awaiting payment',
};

/** Patient: request an instant consultation, pay, wait for a doctor, and talk. */
export default function ConsultNow({ myUserId }: { myUserId: string }) {
  const [status, setStatus] = useState<{ onlineDoctors: number; consultFee: number } | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  const [mode, setMode] = useState<'chat' | 'video'>('chat');
  const [symptoms, setSymptoms] = useState('');
  const [shareRecord, setShareRecord] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [emergency, setEmergency] = useState<{ number: string; label: string }[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, m, e] = await Promise.all([
      fetch('/api/on-call/status').then(r => r.json()),
      fetch('/api/consults/mine').then(r => r.json()),
      fetch('/api/emergency/info').then(r => r.json()),
    ]);
    if (s.status === 'success') setStatus(s.data);
    if (m.status === 'success') setMine(m.data);
    if (e.status === 'success') setEmergency(e.data.numbers);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const open = mine.find(c => ['awaiting_payment', 'queued', 'active'].includes(c.status));

  // While waiting for a doctor, poll until one joins (or the request times out).
  useEffect(() => {
    if (open?.status !== 'queued') return;
    const t = setInterval(() => { load().catch(() => {}); }, 3000);
    return () => clearInterval(t);
  }, [open?.status, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const d = await jpost('/api/consults', { mode, symptoms, shareRecord });
      if (d.status === 'success') {
        setRedFlags(d.data.redFlags ?? []);
        setSymptoms('');
        await load();
        setPaying(d.data.id);
      } else setError(d.message || 'Could not start the consultation.');
    } catch { setError('Server connection error.'); }
    finally { setBusy(false); }
  };

  const cancel = async (id: string) => {
    await jpost(`/api/consults/${id}/end`);
    await load();
  };

  const EmergencyBox = ({ reasons }: { reasons: string[] }) => (
    <div className="bg-rose-50 border-2 border-rose-300 p-4 text-rose-900 space-y-1" role="alert">
      <p className="font-black flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> This may be an emergency</p>
      {reasons.length > 0 && <p className="text-xs">What you described suggests: {reasons.join(', ')}.</p>}
      <p className="text-sm font-bold">Call {emergency.map(n => `${n.number} (${n.label})`).join(' or ') || '999'} now. Do not wait for an online consultation.</p>
    </div>
  );

  if (open?.status === 'active') {
    return <ConsultRoom consultId={open.id} myUserId={myUserId} isDoctor={false} onEnded={load} />;
  }

  return (
    <div className="max-w-3xl space-y-5">
      <header className="bg-white border border-[#FECDD3] p-5">
        <h2 className="text-lg font-black text-slate-900">Consult a doctor now</h2>
        <p className="text-sm text-slate-600 mt-1">Talk to a verified doctor online within minutes.</p>
        <p className="text-xs mt-2 font-bold flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${status?.onlineDoctors ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {status ? `${status.onlineDoctors} doctor${status.onlineDoctors === 1 ? '' : 's'} online now · RM ${status.consultFee.toFixed(2)} per consultation` : 'Checking availability…'}
        </p>
      </header>

      <p className="bg-white border border-rose-200 text-rose-900 text-xs font-semibold p-3">
        Online consultations are not for emergencies. In an emergency call {emergency.map(n => n.number).join(' or ') || '999'} first.
      </p>

      {redFlags.length > 0 && <EmergencyBox reasons={redFlags} />}

      {open?.status === 'queued' && (
        <div className="bg-white border border-amber-200 p-5 space-y-3">
          <p className="font-extrabold flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> Waiting for a doctor to join…</p>
          <p className="text-xs text-slate-600">Paid. Stay on this page. If nobody joins within 10 minutes you are refunded automatically.</p>
          <button onClick={() => cancel(open.id)} className="text-xs font-bold border border-slate-200 px-4 py-2 cursor-pointer">Cancel and refund</button>
        </div>
      )}

      {open?.status === 'awaiting_payment' && (
        <div className="bg-white border border-amber-200 p-5 space-y-3">
          <p className="font-extrabold">Your consultation request is waiting for payment.</p>
          <div className="flex gap-3">
            <button onClick={() => setPaying(open.id)} className="bg-[#DC2626] text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Pay RM {open.fee.toFixed(2)}</button>
            <button onClick={() => cancel(open.id)} className="text-xs font-bold border border-slate-200 px-4 py-2 cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {!open && (
        <form onSubmit={submit} className="bg-white border border-[#FECDD3] p-5 space-y-4">
          <div role="radiogroup" aria-label="Consultation type" className="grid grid-cols-2 gap-3">
            {([['chat', 'Chat', MessageSquare], ['video', 'Video', Video]] as const).map(([id, label, Icon]) => (
              <button type="button" key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                className={`flex items-center justify-center gap-2 py-3 border text-sm font-extrabold cursor-pointer ${mode === id ? 'border-[#DC2626] bg-[#FFF0F2] text-[#B91C1C]' : 'border-slate-200 text-slate-600'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="cn-symptoms" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1">What is the problem?</label>
            <textarea id="cn-symptoms" value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={4} minLength={10} maxLength={1000} required
              className="w-full border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[#DC2626]"
              placeholder="Describe your symptoms and how long you have had them" />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={shareRecord} onChange={e => setShareRecord(e.target.checked)} />
            <span>Share my health record (allergies, conditions, medicines, readings) with the doctor who takes my consultation. Helps them prescribe safely. I can stop sharing at any time.</span>
          </label>
          {error && <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3">{error}</p>}
          <button disabled={busy || status?.onlineDoctors === 0} className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 text-white text-sm font-extrabold py-3 cursor-pointer">
            {busy ? 'Starting…' : status?.onlineDoctors === 0 ? 'No doctors online right now' : 'Continue to payment'}
          </button>
        </form>
      )}

      {mine.some(c => !['awaiting_payment', 'queued', 'active'].includes(c.status)) && (
        <section className="bg-white border border-slate-200 p-5">
          <h3 className="text-sm font-extrabold mb-3">Past consultations</h3>
          <ul className="divide-y divide-slate-100 text-xs">
            {mine.filter(c => !['awaiting_payment', 'queued', 'active'].includes(c.status)).map(c => (
              <li key={c.id} className="py-2 flex justify-between gap-3">
                <span>{new Date(c.createdAt).toLocaleString()} · {c.mode}{c.professional ? ` · ${c.professional.name}` : ''}</span>
                <span className="font-bold">{STATUS_TEXT[c.status] ?? c.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paying && (
        <PaymentDialog kind="consult" refId={paying} description="Instant online consultation"
          onCancel={() => setPaying(null)} onPaid={() => { setPaying(null); load(); }} />
      )}
    </div>
  );
}
