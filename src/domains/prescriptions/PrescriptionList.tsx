import { CustomSelect } from '../../shared/ui/CustomSelect';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, CheckCircle2, Clock, Printer, QrCode, Search, Send, Store, X, XCircle } from 'lucide-react';
import PrescriptionExtras from './PrescriptionExtras';
import { useTr, tr, getLocale } from '../../locale';
/** Translate outside a component (these helpers run during render, so they follow the current language). */
const T = (k: string, v?: Record<string, string | number>) => tr(getLocale().lang, k, v);


/** 13 Oct 2026: the order people in Malaysia read, and never mistaken for a month first. */
export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function Qr({ text, size = 120 }: { text: string; size?: number }) {
  const tx = useTr();
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: 160 }).then(setSrc).catch(() => {}); }, [text]);
  return src ? <img src={src} alt={tx('QR code to verify this document')} width={size} height={size} /> : null;
}

const field = 'form-select border border-[color:var(--t-200)] bg-white px-3 h-11 min-h-[44px] text-xs font-medium text-[color:var(--ink)] focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus:border-[color:var(--t-600)]';

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
  if (p.status === 'dispensed') return { tone: 'done', label: T('Collected'), detail: `${T('Dispensed {date}', { date: fmtDate(p.dispensedAt) })}${p.pharmacyName ? T(' by {name}', { name: p.pharmacyName }) : ''}`, rank: 9 };
  if (p.status === 'cancelled') return { tone: 'closed', label: T('Cancelled by your doctor'), rank: 9 };
  if (p.status === 'expired') return { tone: 'closed', label: T('Expired'), detail: T('It was valid until {date}', { date: fmtDate(p.validUntil) }), rank: 9 };
  if (!p.pharmacyId) return { tone: 'action', label: T('Not sent to a pharmacy yet'), detail: T('Choose a pharmacy below to have it prepared.'), rank: 2 };
  if (p.fillStatus === 'cannot_fill') return { tone: 'alert', label: T('{name} cannot fill this', { name: p.pharmacyName ?? T('The pharmacy') }), detail: p.fillReason || undefined, rank: 0 };
  if (p.fillStatus === 'ready') return { tone: 'ready', label: T('Ready for pickup'), detail: p.pharmacyName ? T('at {name}', { name: p.pharmacyName }) : undefined, rank: 1 };
  if (p.fillStatus) return { tone: 'progress', label: T(FILL_LABEL[p.fillStatus] ?? p.fillStatus), detail: p.pharmacyName ? T('at {name}', { name: p.pharmacyName }) : undefined, rank: 3 };
  return { tone: 'progress', label: T('Waiting for the pharmacy to respond'), detail: p.pharmacyName ? T('Sent to {name}', { name: p.pharmacyName }) : undefined, rank: 3 };
}

const medKey = (i: any) => `${i.name}|${i.strength ?? ''}`.toLowerCase();

/** Sending: choose the pharmacy, decide about sharing, then send. The sharing choice sits above the button, so it is made before sending. */
function SendBox({ p, pharmacies, onSend, lead }: { p: any; pharmacies: any[]; onSend: (id: string, pharmacyId: string, share: boolean) => Promise<unknown>; lead: string }) {
  const tx = useTr();
  const options = pharmacies.filter(ph => ph.id !== p.pharmacyId);
  const [pharmacyId, setPharmacyId] = useState('');
  const [share, setShare] = useState(p.pharmacyId ? !!p.sharedSafety : true);
  const [busy, setBusy] = useState(false);
  const chosen = options.find(o => o.id === pharmacyId);
  if (options.length === 0) return <p className="text-xs text-slate-700">{tx('No other partner pharmacy is available right now.')}</p>;
  return (
    <div className="space-y-2.5">
      <label className="block text-2xs font-extrabold uppercase tracking-wider text-[color:var(--t-800)]">{tx(lead)}
        <CustomSelect className={`${field} block w-full mt-1.5`} value={pharmacyId} onChange={e => setPharmacyId(e.target.value)}>
          <option value="">{tx('Choose a pharmacy…')}</option>
          {options.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
        </CustomSelect>
      </label>
      <label className="flex items-start gap-2.5 min-h-[44px] text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--t-600)]" />
        <span className="py-0.5 leading-snug">{tx('Share my allergies and current medicines with the pharmacy so the pharmacist can check safety')} <b>{tx('(recommended)')}</b>.</span>
      </label>
      <button
        type="button"
        disabled={!chosen || busy}
        onClick={async () => { setBusy(true); try { await onSend(p.id, pharmacyId, share); setPharmacyId(''); } finally { setBusy(false); } }}
        className="w-full min-h-[44px] px-4 inline-flex items-center justify-center gap-2 text-xs font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer transition-colors disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {chosen ? tx('Send to {name}', { name: chosen.name }) : tx('Send to pharmacy')}
      </button>
    </div>
  );
}

function PrintOne({ cardId }: { cardId: string }) {
  const tx = useTr();
  return (
    <button
      type="button"
      className="w-full min-h-[44px] px-3 inline-flex items-center justify-center gap-2 text-xs font-bold text-[color:var(--t-700)] border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] cursor-pointer transition-colors no-print"
      onClick={() => {
        const el = document.getElementById(cardId);
        if (!el) return;
        el.classList.add('print-rx');
        const done = () => { el.classList.remove('print-rx'); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        window.print();
      }}
    ><Printer className="h-4 w-4" aria-hidden="true" /> {tx('Print this prescription')}</button>
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
  const tx = useTr();
  const [changing, setChanging] = useState<string | null>(null);
  const [openQrId, setOpenQrId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'action' | 'ready'>('all');
  const [query, setQuery] = useState('');
  const isActive = (p: any) => p.status === 'active';
  const list = prescriptions.filter(p => (scope === 'active' ? isActive(p) : !isActive(p)));
  // Newest first from the server; a stable sort keeps that inside each group
  const ordered = scope === 'active' ? [...list].sort((a, b) => statusOf(a).rank - statusOf(b).rank) : list;

  // The same medicine on more than one active prescription: worth a second look before taking both
  const activeRx = prescriptions.filter(isActive);
  const actionCount = activeRx.filter(p => !p.pharmacyId || p.fillStatus === 'cannot_fill').length;
  const readyCount = activeRx.filter(p => p.fillStatus === 'ready').length;

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

  const visible = ordered.filter((p: any) => {
    if (scope === 'active') {
      if (filterMode === 'action' && !(!p.pharmacyId || p.fillStatus === 'cannot_fill')) return false;
      if (filterMode === 'ready' && p.fillStatus !== 'ready') return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      p.code,
      p.diagnosis,
      p.doctor?.name,
      p.pharmacyName,
      ...(p.items ?? []).map((i: any) => `${i.name} ${i.strength ?? ''}`),
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });

  if (list.length === 0) {
    return (
      <div className="py-8 px-6 bg-white border border-dashed border-[color:var(--t-200)] text-center space-y-2">
        {scope === 'active' ? (
          <>
            <p className="text-sm font-bold text-slate-800">{tx('You have no active prescriptions.')}</p>
            <p className="text-xs text-slate-700">{tx('E-prescriptions from your doctor appear here with a QR code a pharmacist can scan.')}</p>
            {prescriptions.length > 0 && onShowArchive && <button type="button" onClick={onShowArchive} className="min-h-[44px] px-3 text-xs font-bold underline cursor-pointer">{tx('See past prescriptions')}</button>}
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-slate-800">{tx('No past prescriptions yet.')}</p>
            <p className="text-xs text-slate-700">{tx('Prescriptions that are collected, expired or cancelled move here.')}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scope === 'active' && (
        <section
          aria-label={tx('Prescriptions summary')}
          className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[color:var(--t-200)]"
        >
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`text-left p-3.5 border-r border-b lg:border-b-0 border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0 ${filterMode === 'all' ? 'bg-[color:var(--t-50)]/60' : ''}`}
          >
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Active Rx')}</span>
            <span className="text-lg font-bold text-[color:var(--ink)] tabular-nums block mt-0.5">{activeRx.length}</span>
            <span className="text-xs text-[color:var(--ink-2)] truncate block">{tx('Tap to show all')}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'action' ? 'all' : 'action')}
            className={`text-left p-3.5 lg:border-r border-b lg:border-b-0 border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0 ${filterMode === 'action' ? 'bg-rose-50/70' : ''}`}
          >
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Action Needed')}</span>
            <span className={`text-lg font-bold tabular-nums block mt-0.5 ${actionCount > 0 ? 'text-rose-700' : 'text-[color:var(--ink)]'}`}>{actionCount}</span>
            <span className="text-xs text-[color:var(--ink-2)] truncate block">{actionCount > 0 ? tx('Choose a pharmacy') : tx('All sent')}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'ready' ? 'all' : 'ready')}
            className={`text-left p-3.5 border-r border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0 ${filterMode === 'ready' ? 'bg-emerald-50/70' : ''}`}
          >
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Ready for Pickup')}</span>
            <span className={`text-lg font-bold tabular-nums block mt-0.5 ${readyCount > 0 ? 'text-emerald-700' : 'text-[color:var(--ink)]'}`}>{readyCount}</span>
            <span className="text-xs text-[color:var(--ink-2)] truncate block">{readyCount > 0 ? tx('Show QR at counter') : tx('None ready yet')}</span>
          </button>

          <div className="p-3.5 min-w-0">
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Active Medicines')} ({meds.length})</span>
            <span className="text-xs font-semibold text-[color:var(--ink)] line-clamp-2 mt-1 block">
              {meds.length > 0 ? meds.map((m: any) => m.name).join(' · ') : tx('None')}
            </span>
          </div>
        </section>
      )}

      {/* Compact Search & Filter Bar */}
      <div className="bg-white border border-[color:var(--t-200)] px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tx('Search medicine, RX code, doctor, or pharmacy...')}
            aria-label={tx('Search prescriptions')}
            className="w-full h-9 pl-9 pr-8 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:border-[color:var(--t-600)] focus:bg-white focus:outline-none text-xs font-medium text-[color:var(--ink)]"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={tx('Clear search')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {scope === 'active' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              ['all', tx('All')],
              ['action', tx('Needs Action')],
              ['ready', tx('Ready')],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterMode(id)}
                className={`px-2.5 py-1.5 text-2xs font-bold border cursor-pointer transition-colors ${
                  filterMode === id
                    ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                    : 'bg-white text-[color:var(--ink-2)] border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-6 px-4 bg-white border border-[color:var(--t-200)] text-center space-y-2">
          <p className="text-xs font-bold text-[color:var(--ink)]">{tx('No prescriptions match your filter.')}</p>
          <button type="button" onClick={() => { setFilterMode('all'); setQuery(''); }} className="text-xs font-bold text-[color:var(--t-700)] underline cursor-pointer">
            {tx('Reset filters')}
          </button>
        </div>
      ) : visible.map((p: any) => {
        const st = statusOf(p);
        const Icon = ICON[st.tone];
        const dupes = scope === 'active' ? duplicatesOf(p) : [];
        const cardId = `rx-card-${p.id}`;
        const needsSend = isActive(p) && (!p.pharmacyId || p.fillStatus === 'cannot_fill');
        const qrExpanded = openQrId === p.id || p.fillStatus === 'ready';
        const metaParts = [
          p.diagnosis,
          p.doctor?.name ? `${p.doctor.name}${p.doctor.licenseNumber ? ` (${p.doctor.licenseNumber})` : ''}` : null,
          `${tx('Issued')} ${fmtDate(p.issuedAt)}`,
          p.validUntil ? `${tx('Valid until')} ${fmtDate(p.validUntil)}` : null,
        ].filter(Boolean);

        return (
          <article key={p.id} id={cardId} className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
            {/* Left: Medicine Details & Safety */}
            <div className="p-3.5 sm:p-4 space-y-2.5 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className={`border px-3 py-1.5 flex-1 min-w-[220px] ${TONE[st.tone]}`} role={st.tone === 'alert' ? 'alert' : undefined}>
                  <p className="text-xs font-extrabold flex items-center gap-2"><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> {st.label}</p>
                  {st.detail && <p className="text-xs mt-0.5 [overflow-wrap:anywhere]">{st.detail}</p>}
                </div>
                <span className="font-mono font-extrabold text-xs px-2.5 py-1.5 bg-slate-100 border border-slate-300 text-[color:var(--ink)] shrink-0">
                  {p.code}
                </span>
              </div>

              <ul className="space-y-1.5">
                {p.items.map((i: any, k: number) => (
                  <li key={k} className="text-sm text-[color:var(--ink)]">
                    <b className="font-extrabold">{i.name} {i.strength}</b> <span className="text-xs text-slate-600 font-semibold">{i.form}</span>
                    <p className="text-xs text-slate-700 mt-0.5">{tx('{dose}, {freq} for {days} days · qty {qty}', { dose: i.dose, freq: i.frequency, days: i.durationDays, qty: i.quantity })}{i.instructions ? ` · ${i.instructions}` : ''}</p>
                  </li>
                ))}
              </ul>

              {dupes.map((d: { label: string; others: string[] }) => (
                <p key={d.label} className="text-xs text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span><b>{d.label}</b> {tx('is also on another active prescription ({codes}). Ask your doctor or pharmacist before taking both.', { codes: d.others.join(', ') })}</span>
                </p>
              ))}

              {metaParts.length > 0 && (
                <p className="text-2xs text-slate-600 border-t border-[color:var(--t-100)] pt-2">
                  {metaParts.join(' · ')}
                </p>
              )}

              <div className="no-print"><PrescriptionExtras rx={p} pharmacies={pharmacies} onChange={onChange} /></div>
            </div>

            {/* Right: Fulfilment & Collapsible Verification Rail */}
            <div className="bg-[color:var(--t-50)]/70 border-t lg:border-t-0 lg:border-l border-[color:var(--t-100)] p-3.5 sm:p-4 flex flex-col justify-between gap-3">
              {isActive(p) && pharmacies.length > 0 && (
                <div className="space-y-2 no-print">
                  {needsSend
                    ? <SendBox p={p} pharmacies={pharmacies} onSend={onSend} lead={p.pharmacyId ? 'Send it to another pharmacy' : 'Send it to a pharmacy'} />
                    : changing === p.id
                      ? <SendBox p={p} pharmacies={pharmacies} onSend={async (...a) => { await onSend(...a); setChanging(null); }} lead="Send it to a different pharmacy" />
                      : <button type="button" onClick={() => setChanging(p.id)} className="w-full min-h-[40px] px-3 inline-flex items-center justify-center gap-2 text-xs font-bold text-[color:var(--t-700)] border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] cursor-pointer transition-colors"><Store className="h-4 w-4" aria-hidden="true" /> {tx('Send to a different pharmacy')}</button>}

                  {needsSend && p.fillStatus === 'cannot_fill' && onOpenPharmacies && (
                    <button type="button" onClick={onOpenPharmacies} className="text-xs font-bold underline text-[color:var(--t-700)] cursor-pointer block">{tx('Find a pharmacy that has it')}</button>
                  )}
                </div>
              )}

              <div className="bg-white border border-[color:var(--t-200)] p-2.5 mt-auto">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-[color:var(--ink)] flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
                    {tx('Pharmacist QR')}
                  </span>
                  {p.fillStatus !== 'ready' && (
                    <button
                      type="button"
                      onClick={() => setOpenQrId(openQrId === p.id ? null : p.id)}
                      className="text-2xs font-bold text-[color:var(--t-700)] hover:underline cursor-pointer no-print"
                    >
                      {qrExpanded ? tx('Hide QR') : tx('Show QR')}
                    </button>
                  )}
                </div>

                {qrExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-[color:var(--t-100)] flex items-center gap-3">
                    <div className="shrink-0">
                      <Qr text={`${window.location.origin}/rx/${p.code}`} size={72} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-2xs text-slate-600">{tx('Scan to verify')}</p>
                      {isActive(p) && (
                        <div className="no-print">
                          <PrintOne cardId={cardId} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
