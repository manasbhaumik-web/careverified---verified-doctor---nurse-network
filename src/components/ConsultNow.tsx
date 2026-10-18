import React, { useCallback, useEffect, useState } from 'react';
import TelemedicineQuestions, { defaultTeleAnswers, teleToPayload, type TeleAnswers } from './TelemedicineQuestions';
import { AlertTriangle, MessageSquare, Video, CreditCard, UserCheck, Lock, Clock, Users, ShieldCheck } from 'lucide-react';
import PaymentDialog from './PaymentDialog';
import ConsultRoom from './ConsultRoom';
import DashboardHeader, { BannerKpis } from './DashboardHeader';
import { formatMoney, formatDateTime } from '../locale';

const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const STATUS_TEXT: Record<string, string> = {
  completed: 'Completed', cancelled: 'Cancelled', unmatched: 'No doctor available (refunded)', queued: 'Waiting', active: 'In progress', awaiting_payment: 'Awaiting payment',
};

interface ConsultNowProps {
  myUserId: string;
  embedded?: boolean;
  onNavigateToPrescriptions?: () => void;
}

/** Patient: request an instant consultation, pay, wait for a doctor, and talk. */
export default function ConsultNow({ myUserId, embedded = false, onNavigateToPrescriptions }: ConsultNowProps) {
  const [status, setStatus] = useState<{ onlineDoctors: number; consultFee: number } | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  const [mode, setMode] = useState<'chat' | 'video'>('chat');
  const [symptoms, setSymptoms] = useState('');
  const [shareRecord, setShareRecord] = useState(false);
  const [tele, setTele] = useState<TeleAnswers>(defaultTeleAnswers);
  const [needInPerson, setNeedInPerson] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [emergency, setEmergency] = useState<{ number: string; label: string }[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [elapsedWaitSeconds, setElapsedWaitSeconds] = useState<number>(0);

  const open = mine.find(c => ['awaiting_payment', 'queued', 'active'].includes(c.status));

  useEffect(() => {
    if (open?.status !== 'queued' || !open.queuedAt) {
      setElapsedWaitSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const start = new Date(open.queuedAt).getTime();
      const now = Date.now();
      setElapsedWaitSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [open?.status, open?.queuedAt]);

  const load = useCallback(async () => {
    const [s, m, e] = await Promise.all([
      fetch('/api/on-call/status').then(r => r.json()),
      fetch('/api/consults/mine').then(r => r.json()),
      fetch(`/api/emergency/info?country=${tele.inMalaysia ? 'MY' : tele.country.trim().toUpperCase() || 'MY'}`).then(r => r.json()),
    ]);
    if (s.status === 'success') setStatus(s.data);
    if (m.status === 'success') setMine(m.data);
    if (e.status === 'success') setEmergency(e.data.numbers);
  }, [tele.inMalaysia, tele.country]);

  useEffect(() => { load().catch(() => {}); }, [load]);

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
      setNeedInPerson(false);
      const d = await jpost('/api/consults', { mode, symptoms, shareRecord, ...teleToPayload(tele) });
      if (d.status === 'success') {
        setRedFlags(d.data.redFlags ?? []);
        setSymptoms('');
        await load();
        setPaying(d.data.id);
      } else {
        setNeedInPerson(d.data?.route === 'in-person');
        setError(d.message || 'Could not start the consultation.');
      }
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
    return <ConsultRoom consultId={open.id} myUserId={myUserId} isDoctor={false} onEnded={load} onNavigateToPrescriptions={onNavigateToPrescriptions} />;
  }

  const past = mine.filter(c => !['awaiting_payment', 'queued', 'active'].includes(c.status));
  const emergencyNumbers = emergency.map(n => n.number).join(' or ') || '999';
  const steps = [
    { icon: MessageSquare, title: 'Describe the problem', text: 'Choose chat or video and tell us your symptoms.' },
    { icon: CreditCard, title: 'Pay the consultation fee', text: 'Pay securely before the doctor is notified.' },
    { icon: UserCheck, title: 'A verified doctor joins', text: 'If nobody joins within 10 minutes you are refunded automatically.' },
  ];

  return (
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-0"}>
      {/* Header with live availability */}
      {!embedded && (
        <DashboardHeader
          icon={Video}
          eyebrow="Instant care"
          title="Consult a doctor now"
          description="Talk to a verified doctor online within minutes."
          actions={
            <BannerKpis items={[
              { value: status ? status.onlineDoctors : '—', label: 'Doctors online' },
              { value: status ? formatMoney(status.consultFee, { decimals: 0 }) : '—', label: 'Per consult' },
              { value: '10 min', label: 'Refund if unmatched' },
            ]} />
          }
        />
      )}

      <div className={embedded ? "space-y-5 pt-2" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
        <p className="bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold p-3 flex items-center gap-2" role="note">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Online consultations are not for emergencies. In an emergency call {emergencyNumbers} first.
      </p>

      {redFlags.length > 0 && <EmergencyBox reasons={redFlags} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="space-y-5 min-w-0">
          {open?.status === 'queued' && (
            <div className="bg-white border-2 border-[color:var(--t-600)] p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                <p className="font-extrabold text-base flex items-center gap-2.5 text-[color:var(--ink)]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--t-600)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[color:var(--t-600)]"></span>
                  </span>
                  Matching with an On-Call Practitioner…
                </p>
                <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1">
                  Active Virtual Waiting Room
                </span>
              </div>

              {/* LIVE QUEUE TELEMETRY STRIP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-4 text-center">
                <div className="border-b sm:border-b-0 sm:border-r border-[color:var(--t-200)] pb-2 sm:pb-0 sm:pr-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 text-[color:var(--t-600)]" /> Queue Position
                  </span>
                  <div role="status" aria-live="polite" className="text-xl font-black font-mono text-[color:var(--ink)]">
                    #{open.queuePosition || 1}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {open.queuePosition > 1 ? `${open.queuePosition - 1} ahead of you` : 'Next in line'}
                  </span>
                </div>

                <div className="border-b sm:border-b-0 sm:border-r border-[color:var(--t-200)] pb-2 sm:pb-0 sm:pr-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-[color:var(--t-600)]" /> Estimated Wait
                  </span>
                  <div role="status" aria-live="polite" className="text-xl font-black font-mono text-[color:var(--t-700)]">
                    ~{open.estWaitMinutes || 2} min{open.estWaitMinutes === 1 ? '' : 's'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Elapsed: {Math.floor(elapsedWaitSeconds / 60)}:{(elapsedWaitSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Statutory SLA
                  </span>
                  <div className="text-xl font-black font-mono text-emerald-700">
                    100%
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Auto-refund if &gt; 10m</span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <div className="p-1 bg-emerald-600 text-white shrink-0 mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-extrabold text-[color:var(--ink)]">Consultation payment verified & held in escrow.</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Please keep this browser window open. When the on-call physician claims this room, your session will automatically connect. An audible chime alert will sound.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-slate-500">
                  Encounter ID: <code className="font-bold text-slate-700">{open.id}</code>
                </span>
                <button onClick={() => cancel(open.id)} className="w-full sm:w-auto h-10 text-xs font-bold border border-slate-300 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 px-5 cursor-pointer transition-colors shadow-2xs">
                  Cancel and refund immediately
                </button>
              </div>
            </div>
          )}

          {open?.status === 'awaiting_payment' && (
            <div className="bg-white border border-amber-300 p-6 space-y-4 shadow-sm">
              <p className="font-extrabold text-base text-[color:var(--ink)]">Your consultation request is awaiting payment.</p>
              <p className="text-xs text-[color:var(--ink-2)]">Lock in your consultation slot with an on-call physician.</p>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setPaying(open.id)} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white h-12 text-xs font-extrabold px-6 cursor-pointer transition-colors shadow-xs">
                  Pay {formatMoney(open.fee)}
                </button>
                <button onClick={() => cancel(open.id)} className="h-12 text-xs font-bold border border-slate-300 hover:bg-slate-50 px-5 cursor-pointer transition-colors">
                  Cancel request
                </button>
              </div>
            </div>
          )}

          {!open && (
            <form onSubmit={submit} className="bg-white border border-[color:var(--t-200)] p-6 space-y-6 shadow-xs">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--ink)] block mb-3">
                  1. How would you like to consult?
                </span>
                <div role="radiogroup" aria-label="Consultation type" className="grid sm:grid-cols-2 gap-3.5">
                  {([['chat', 'Live Text Chat', 'Fast, asynchronous clinical messaging', MessageSquare], ['video', 'Video Consultation', 'Face-to-face encrypted video call', Video]] as const).map(([id, label, hint, Icon]) => (
                    <button type="button" key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
                      className={`flex items-start gap-3.5 p-4 border text-left cursor-pointer transition-all ${mode === id ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] shadow-[inset_0_0_0_1px_var(--t-600)]' : 'border-[color:var(--t-200)] text-[color:var(--ink-2)] hover:bg-slate-50'}`}>
                      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${mode === id ? 'text-[color:var(--t-600)]' : 'text-slate-400'}`} />
                      <span>
                        <span className={`block text-sm font-bold ${mode === id ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-2)]'}`}>{label}</span>
                        <span className="block text-xs mt-0.5 opacity-80">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="cn-symptoms" className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--ink)]">
                    2. Describe your clinical complaint
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">{symptoms.length} / 1000</span>
                </div>
                <textarea id="cn-symptoms" value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={5} minLength={10} maxLength={1000} required
                  className="w-full border border-[color:var(--t-200)] p-3.5 text-sm text-[color:var(--ink)] bg-[color:var(--t-bg)] focus:bg-white focus:outline-none focus:border-[color:var(--t-600)] transition-colors placeholder-slate-400"
                  placeholder="Detail your symptoms, onset time, pain severity (1-10), and current home medications…" />
              </div>
              <TelemedicineQuestions value={tele} onChange={setTele} />
              <label className="flex items-start gap-3 text-xs text-[color:var(--ink)] cursor-pointer bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-3.5">
                <input type="checkbox" className="mt-0.5 accent-[color:var(--t-600)]" checked={shareRecord} onChange={e => setShareRecord(e.target.checked)} />
                <span className="leading-relaxed">Share my medical record (allergies, chronic conditions, regular prescriptions) with the responding doctor. Facilitates accurate diagnosis and safe prescribing.</span>
              </label>
              {error && (
                <div className={`text-sm font-bold p-3 border ${needInPerson ? 'text-amber-900 bg-amber-50 border-amber-300' : 'text-rose-700 bg-rose-50 border-rose-200'}`} role="alert">
                  {error}
                  {needInPerson && <span className="block text-xs font-semibold mt-1">Use Find a doctor to book an in-person or follow-up appointment.</span>}
                </div>
              )}
              <button disabled={busy || status?.onlineDoctors === 0} className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white h-12 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                {busy ? 'Preparing consultation…' : status?.onlineDoctors === 0 ? 'No physicians online right now' : 'Continue to Payment & Queue'}
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-5 min-w-0" aria-label="About online consultations">
          <section className="bg-white border border-slate-200 p-5">
            <h3 className="text-sm font-extrabold mb-3">How it works</h3>
            <ol className="space-y-3">
              {steps.map((st, i) => (
                <li key={st.title} className="flex gap-3">
                  <span className="h-8 w-8 shrink-0 flex items-center justify-center bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)]"><st.icon className="h-4 w-4" /></span>
                  <span className="text-xs"><b className="block text-sm">{i + 1}. {st.title}</b><span className="text-slate-600">{st.text}</span></span>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-white border border-slate-200 p-5">
            <h3 className="text-sm font-extrabold mb-1 flex items-center gap-2"><Lock className="h-4 w-4 text-[color:var(--t-600)]" /> Your privacy</h3>
            <p className="text-xs text-slate-600 leading-relaxed">Only the doctor who takes your consultation can see what you share, and only if you tick the box. You can stop sharing from your Health Record at any time.</p>
          </section>

          <section className="bg-white border border-slate-200 p-5">
            <h3 className="text-sm font-extrabold mb-2">Past consultations</h3>
            {past.length === 0 ? <p className="text-xs text-slate-500">None yet.</p> : (
              <ul className="divide-y divide-slate-100 text-xs">
                {past.map(c => (
                  <li key={c.id} className="py-2 flex justify-between gap-3">
                    <span>{formatDateTime(c.createdAt)} · {c.mode}{c.professional ? ` · ${c.professional.name}` : ''}</span>
                    <span className="font-bold text-right">{STATUS_TEXT[c.status] ?? c.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {paying && (
        <PaymentDialog kind="consult" refId={paying} description="Instant online consultation"
          onCancel={() => setPaying(null)} onPaid={() => { setPaying(null); load(); }} />
      )}
      </div>
    </div>
  );
}
