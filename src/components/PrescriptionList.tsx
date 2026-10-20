import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, CheckCircle2, Clock, Pill, Printer, Send, Store, XCircle } from 'lucide-react';
import PrescriptionExtras from './PrescriptionExtras';

/** 13 Oct 2026: the order people in Malaysia read, and never mistaken for a month first. */
export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function Qr({ text, size = 120 }: { text: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: 160 }).then(setSrc).catch(() => {}); }, [text]);
  return src ? <img src={src} alt="QR code to verify this document" width={size} height={size} /> : null;
}

const field = 'border border-[color:var(--t-200)] bg-white px-3 min-h-[44px] text-xs font-medium text-[color:var(--ink)] focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]';

type Tone = 'alert' | 'action' | 'progress' | 'ready' | 'done' | 'closed';
interface Status { tone: Tone; label: string; detail?: string; rank: number }

const FILL_LABEL: Record<string, string> = { received: 'Received by the pharmacy', preparing: 'Being prepared', ready: 'Ready for pickup' };
const TONE: Record<Tone, string> = {
  alert: 'bg-rose-50 border-rose-300 text-rose-900',
  action: 'bg-amber-50 border-amber-300 text-amber-900',
  progress: 'bg-sky-50 border-sky-300 text-sky-900',
  ready: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  done: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  closed: 'bg-slate-100 border-slate-300 text-slate-800',
};
const ICON: Record<Tone, React.ComponentType<{ className?: string }>> = { alert: XCircle, action: AlertTriangle, progress: Clock, ready: CheckCircle2, done: CheckCircle2, closed: Clock };

/** What the patient needs to know, and whether they need to do something. Lower rank = needs them sooner. */
export function statusOf(p: any): Status {
  if (p.status === 'dispensed') return { tone: 'done', label: 'Collected', detail: `Dispensed ${fmtDate(p.dispensedAt)}${p.pharmacyName ? ` by ${p.pharmacyName}` : ''}`, rank: 9 };
  if (p.status === 'cancelled') return { tone: 'closed', label: 'Cancelled by your doctor', rank: 9 };
  if (p.status === 'expired') return { tone: 'closed', label: 'Expired', detail: `It was valid until ${fmtDate(p.validUntil)}`, rank: 9 };
  if (!p.pharmacyId) return { tone: 'action', label: 'Not sent to a pharmacy yet', detail: 'Choose a pharmacy below to have it prepared.', rank: 2 };
  if (p.fillStatus === 'cannot_fill') return { tone: 'alert', label: `${p.pharmacyName ?? 'The pharmacy'} cannot fill this`, detail: p.fillReason || undefined, rank: 0 };
  if (p.fillStatus === 'ready') return { tone: 'ready', label: 'Ready for pickup', detail: p.pharmacyName ? `at ${p.pharmacyName}` : undefined, rank: 1 };
  if (p.fillStatus) return { tone: 'progress', label: FILL_LABEL[p.fillStatus] ?? p.fillStatus, detail: p.pharmacyName ? `at ${p.pharmacyName}` : undefined, rank: 3 };
  return { tone: 'progress', label: 'Waiting for the pharmacy to respond', detail: p.pharmacyName ? `Sent to ${p.pharmacyName}` : undefined, rank: 3 };
}

const medKey = (i: any) => `${i.name}|${i.strength ?? ''}`.toLowerCase();

/** Sending: choose the pharmacy, decide about sharing, then send. The sharing choice sits above the button, so it is made before sending. */
function SendBox({ p, pharmacies, onSend, lead }: { p: any; pharmacies: any[]; onSend: (id: string, pharmacyId: string, share: boolean) => Promise<unknown>; lead: string }) {
  const options = pharmacies.filter(ph => ph.id !== p.pharmacyId);
  const [pharmacyId, setPharmacyId] = useState('');
  const [share, setShare] = useState(p.pharmacyId ? !!p.sharedSafety : true);
  const [busy, setBusy] = useState(false);
  const chosen = options.find(o => o.id === pharmacyId);
  if (options.length === 0) return <p className="text-xs text-slate-700">No other partner pharmacy is available right now.</p>;
  return (
    <div className="space-y-2 bg-slate-50 border border-slate-200 p-3">
      <label className="block text-xs font-bold text-slate-800">{lead}
        <select className={`${field} block w-full sm:w-80 mt-1.5`} value={pharmacyId} onChange={e => setPharmacyId(e.target.value)}>
          <option value="">Choose a pharmacy…</option>
          {options.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-3 min-h-[44px] text-xs text-slate-800 cursor-pointer">
        <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--t-600)]" />
        <span className="py-1">Share my allergies and current medicines with the pharmacy so the pharmacist can check safety <b>(recommended)</b>.</span>
      </label>
      <button
        type="button"
        disabled={!chosen || busy}
        onClick={async () => { setBusy(true); try { await onSend(p.id, pharmacyId, share); setPharmacyId(''); } finally { setBusy(false); } }}
        className="min-h-[44px] px-4 inline-flex items-center gap-2 text-xs font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {chosen ? `Send to ${chosen.name}` : 'Send to pharmacy'}
      </button>
    </div>
  );
}

function PrintOne({ cardId }: { cardId: string }) {
  return (
    <button
      type="button"
      className="min-h-[44px] px-3 inline-flex items-center gap-2 text-xs font-bold text-[color:var(--t-700)] border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] cursor-pointer no-print"
      onClick={() => {
        const el = document.getElementById(cardId);
        if (!el) return;
        el.classList.add('print-rx');
        const done = () => { el.classList.remove('print-rx'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        window.print();
      }}
    ><Printer className="h-4 w-4" aria-hidden="true" /> Print this prescription</button>
  );
}

interface Props {
  prescriptions: any[];
  pharmacies: any[];
  scope: 'active' | 'archive';
  onChange: () => void;
  onSend: (id: string, pharmacyId: string, share: boolean) => Promise<unknown>;
  onOpenPharmacies?: () => void;
  onShowArchive?: () => void;
}

/** The patient's prescriptions: the ones that need attention first, with a plain status on each card. */
export default function PrescriptionList({ prescriptions, pharmacies, scope, onChange, onSend, onOpenPharmacies, onShowArchive }: Props) {
  const [changing, setChanging] = useState<string | null>(null);
  const isActive = (p: any) => p.status === 'active';
  const list = prescriptions.filter(p => (scope === 'active' ? isActive(p) : !isActive(p)));
  // Newest first from the server; a stable sort keeps that inside each group
  const ordered = scope === 'active' ? [...list].sort((a, b) => statusOf(a).rank - statusOf(b).rank) : list;

  // The same medicine on more than one active prescription: worth a second look before taking both
  const activeRx = prescriptions.filter(isActive);
  const seenOn = new Map<string, { codes: string[]; label: string }>();
  for (const p of activeRx) for (const i of p.items ?? []) {
    const e = seenOn.get(medKey(i)) ?? { codes: [], label: `${i.name}${i.strength ? ` ${i.strength}` : ''}` };
    if (!e.codes.includes(p.code)) e.codes.push(p.code);
    seenOn.set(medKey(i), e);
  }
  const duplicatesOf = (p: any) => (p.items ?? [])
    .map((i: any) => seenOn.get(medKey(i)))
    .filter((e: any) => e && e.codes.length > 1 && e.codes.includes(p.code))
    .map((e: any) => ({ label: e.label, others: e.codes.filter((c: string) => c !== p.code) }));

  // One line per medicine across the active prescriptions
  const meds = activeRx.flatMap(p => (p.items ?? []).map((i: any) => ({ key: `${medKey(i)}|${i.dose}|${i.frequency}`.toLowerCase(), name: `${i.name}${i.strength ? ` ${i.strength}` : ''}`, how: [i.dose, i.frequency].filter(Boolean).join(', ') })))
    .filter((m: any, k: number, all: any[]) => all.findIndex(o => o.key === m.key) === k);

  if (list.length === 0) {
    return (
      <div className="py-8 px-6 bg-white border border-dashed border-[color:var(--t-200)] text-center space-y-2">
        {scope === 'active' ? (
          <>
            <p className="text-sm font-bold text-slate-800">You have no active prescriptions.</p>
            <p className="text-xs text-slate-700">E-prescriptions from your doctor appear here with a QR code a pharmacist can scan.</p>
            {prescriptions.length > 0 && onShowArchive && <button type="button" onClick={onShowArchive} className="min-h-[44px] px-3 text-xs font-bold underline cursor-pointer">See past prescriptions</button>}
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-slate-800">No past prescriptions yet.</p>
            <p className="text-xs text-slate-700">Prescriptions that are collected, expired or cancelled move here.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scope === 'active' && meds.length > 0 && (
        <section aria-labelledby="meds-now" className="bg-white border border-[color:var(--t-200)] p-4">
          <h3 id="meds-now" className="text-sm font-extrabold text-[color:var(--ink)] flex items-center gap-2"><Pill className="h-4 w-4 text-[color:var(--t-600)]" aria-hidden="true" /> Medicines on your active prescriptions</h3>
          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 text-xs text-slate-800">
            {meds.map((m: any) => <li key={m.key}><b>{m.name}</b>{m.how ? <span className="text-slate-700"> · {m.how}</span> : null}</li>)}
          </ul>
        </section>
      )}

      {ordered.map((p: any) => {
        const st = statusOf(p);
        const Icon = ICON[st.tone];
        const dupes = scope === 'active' ? duplicatesOf(p) : [];
        const cardId = `rx-card-${p.id}`;
        const needsSend = isActive(p) && (!p.pharmacyId || p.fillStatus === 'cannot_fill');
        return (
          <article key={p.id} id={cardId} className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 flex flex-wrap gap-5 justify-between">
            <div className="space-y-3 min-w-[16rem] flex-1">
              <div className={`border px-3 py-2 ${TONE[st.tone]}`} role={st.tone === 'alert' ? 'alert' : undefined}>
                <p className="text-xs font-extrabold flex items-center gap-2"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {st.label}</p>
                {st.detail && <p className="text-xs mt-0.5 [overflow-wrap:anywhere]">{st.detail}</p>}
              </div>

              <ul className="space-y-1">
                {p.items.map((i: any, k: number) => (
                  <li key={k} className="text-base text-[color:var(--ink)]">
                    <b className="font-extrabold">{i.name} {i.strength}</b> <span className="text-xs text-slate-700">{i.form}</span>
                    <p className="text-xs text-slate-800">{i.dose}, {i.frequency} for {i.durationDays} days · qty {i.quantity}{i.instructions ? ` · ${i.instructions}` : ''}</p>
                  </li>
                ))}
              </ul>

              {dupes.map((d: { label: string; others: string[] }) => (
                <p key={d.label} className="text-xs text-amber-900 bg-amber-50 border border-amber-300 px-3 py-2 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span><b>{d.label}</b> is also on another active prescription ({d.others.join(', ')}). Ask your doctor or pharmacist before taking both.</span>
                </p>
              ))}

              <p className="text-xs text-slate-700">
                {p.diagnosis} · {p.doctor?.name} (licence {p.doctor?.licenseNumber}) · issued {fmtDate(p.issuedAt)} · valid until {fmtDate(p.validUntil)} · code <span className="font-mono font-bold">{p.code}</span>
              </p>

              {isActive(p) && pharmacies.length > 0 && (needsSend
                ? <SendBox p={p} pharmacies={pharmacies} onSend={onSend} lead={p.pharmacyId ? 'Send it to another pharmacy' : 'Send it to a pharmacy'} />
                : changing === p.id
                  ? <SendBox p={p} pharmacies={pharmacies} onSend={async (...a) => { await onSend(...a); setChanging(null); }} lead="Send it to a different pharmacy" />
                  : <button type="button" onClick={() => setChanging(p.id)} className="min-h-[44px] px-3 inline-flex items-center gap-2 text-xs font-bold text-[color:var(--t-700)] border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] cursor-pointer no-print"><Store className="h-4 w-4" aria-hidden="true" /> Send to a different pharmacy</button>)}

              {needsSend && p.fillStatus === 'cannot_fill' && onOpenPharmacies && (
                <button type="button" onClick={onOpenPharmacies} className="min-h-[44px] text-xs font-bold underline text-[color:var(--t-700)] cursor-pointer no-print">Find a pharmacy that has it</button>
              )}

              {isActive(p) && <div className="no-print"><PrintOne cardId={cardId} /></div>}
              <div className="no-print"><PrescriptionExtras rx={p} pharmacies={pharmacies} onChange={onChange} /></div>
            </div>
            <div className="text-center shrink-0">
              <Qr text={`${window.location.origin}/rx/${p.code}`} size={96} />
              <p className="text-xs text-slate-700 mt-1">Scan to verify</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
