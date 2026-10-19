import React, { useState } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Copy, FileDown, HeartHandshake, Info, Printer, Stethoscope } from 'lucide-react';
import { Qr, fmtDate } from './PrescriptionList';

/** A date with no time (2026-10-14), shown day-first and never shifted by the viewer's time zone. */
export const fmtDay = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const todayKey = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400_000) + 1;

/** "14 to 16 Oct 2026 (3 days)", or "14 Oct 2026 (1 day)". */
export const leaveText = (from: string, to: string) => {
  const n = daysBetween(from, to);
  return `${from === to ? fmtDay(from) : `${fmtDay(from)} to ${fmtDay(to)}`} (${n} ${n === 1 ? 'day' : 'days'})`;
};

type Phase = 'current' | 'upcoming' | 'past';
export const phaseOf = (from: string, to: string, today = todayKey()): Phase => (today < from.slice(0, 10) ? 'upcoming' : today > to.slice(0, 10) ? 'past' : 'current');
const PHASE: Record<Phase, { label: string; cls: string }> = {
  current: { label: 'Current', cls: 'bg-emerald-50 border-emerald-300 text-emerald-900' },
  upcoming: { label: 'Starts later', cls: 'bg-sky-50 border-sky-300 text-sky-900' },
  past: { label: 'Ended', cls: 'bg-slate-100 border-slate-300 text-slate-800' },
};
const URGENCY: Record<string, { label: string; cls: string }> = {
  urgent: { label: 'Urgent', cls: 'bg-rose-50 border-rose-300 text-rose-900' },
  soon: { label: 'See within a few weeks', cls: 'bg-amber-50 border-amber-300 text-amber-900' },
  routine: { label: 'Routine', cls: 'bg-slate-100 border-slate-300 text-slate-800' },
};

const btn = 'min-h-[44px] px-3 inline-flex items-center gap-2 text-sm font-bold text-[color:var(--t-700)] border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] cursor-pointer';
const card = 'bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5';

/** Print one card only (the .print-rx rules in index.css hide the rest of the page). */
function printCard(id: string, fileTitle?: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const oldTitle = document.title;
  el.classList.add('print-rx');
  if (fileTitle) document.title = fileTitle; // the name a "Save as PDF" file gets
  const done = () => { el.classList.remove('print-rx'); document.title = oldTitle; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

function WhyNoMc({ onFindDoctors }: { onFindDoctors?: () => void }) {
  return (
    <section aria-labelledby="mc-rules" className="bg-sky-50 border border-sky-200 p-4 space-y-2">
      <h3 id="mc-rules" className="text-sm font-extrabold text-sky-950 flex items-center gap-2"><Info className="h-4 w-4" aria-hidden="true" /> When you can get a medical certificate (MC)</h3>
      <ul className="list-disc ml-5 space-y-1 text-sm text-sky-950">
        <li><b>Only after a doctor sees you in person.</b> The Malaysian Medical Council does not allow an MC after a video consultation alone. This applies to doctors registered in Malaysia.</li>
        <li><b>Up to 14 days online.</b> Longer leave needs another in-person assessment.</li>
        <li><b>Not back-dated by more than 3 days.</b> An MC cannot start more than 3 days before the day it is issued.</li>
        <li>Your diagnosis is never written on the certificate.</li>
      </ul>
      {onFindDoctors && <button type="button" onClick={onFindDoctors} className={btn}><CalendarCheck className="h-4 w-4" aria-hidden="true" /> Book an in-person visit</button>}
    </section>
  );
}

function CertCard({ c }: { c: any; key?: React.Key }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/cert/${c.code}`;
  const ph = PHASE[phaseOf(c.fromDate, c.toDate)];
  const cardId = `mc-card-${c.id}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { window.prompt('Copy this link for your employer:', url); }
  };
  return (
    <article id={cardId} className={`${card} flex flex-wrap gap-5 justify-between`}>
      <div className="space-y-3 min-w-[16rem] flex-1">
        <div>
          <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-extrabold ${ph.cls}`}>
            {phaseOf(c.fromDate, c.toDate) === 'current' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}{ph.label}
          </span>
          <p className="text-lg font-extrabold text-[color:var(--ink)] mt-2">Unfit for work: {leaveText(c.fromDate, c.toDate)}</p>
        </div>

        <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-800">
          <dt className="text-slate-700">Doctor</dt>
          <dd><b>{c.doctor?.name}</b></dd>
          <dt className="text-slate-700">Registration no.</dt>
          <dd><span className="font-mono font-bold">{c.doctor?.licenseNumber ?? 'not on record'}</span>{c.doctor && c.doctor.stillVerified === false && <span className="text-rose-800 font-bold"> · not currently verified</span>}</dd>
          <dt className="text-slate-700">Examined</dt>
          <dd>{c.examinedOn ? <>{fmtDay(c.examinedOn)}{c.visitMode ? ` · ${c.visitMode}` : ''}</> : <span className="text-slate-700">Not recorded on this certificate (issued {fmtDate(c.issuedAt)})</span>}</dd>
          {c.practice && <><dt className="text-slate-700">Practice</dt><dd>{c.practice}</dd></>}
          <dt className="text-slate-700">Issued</dt>
          <dd>{fmtDate(c.issuedAt)} · code <span className="font-mono font-bold">{c.code}</span></dd>
          {c.remarks && <><dt className="text-slate-700">Remarks</dt><dd>{c.remarks}</dd></>}
        </dl>

        <p className="text-sm text-slate-700 [overflow-wrap:anywhere]">Your employer can check it at <span className="font-mono">{url}</span>. The diagnosis is not shown to them.</p>

        <div className="flex flex-wrap gap-2 no-print">
          <button type="button" onClick={copy} className={btn}><Copy className="h-4 w-4" aria-hidden="true" /> {copied ? 'Link copied' : 'Copy employer link'}</button>
          <button type="button" onClick={() => printCard(cardId)} className={btn}><Printer className="h-4 w-4" aria-hidden="true" /> Print</button>
          <button type="button" onClick={() => printCard(cardId, `Medical-certificate-${c.code}`)} className={btn} title="Opens the print window. Choose “Save as PDF” as the printer."><FileDown className="h-4 w-4" aria-hidden="true" /> Save as PDF</button>
        </div>
        <span role="status" className="sr-only">{copied ? 'Employer link copied' : ''}</span>
      </div>
      <div className="text-center shrink-0">
        <Qr text={url} size={96} />
        <p className="text-xs text-slate-700 mt-1">Scan to verify</p>
      </div>
    </article>
  );
}

function ReferralCard({ r, onBookSpecialist }: { r: any; onBookSpecialist?: (professionalId: string | null, specialty: string) => void; key?: React.Key }) {
  const u = URGENCY[r.urgency] ?? URGENCY.routine;
  const cardId = `ref-card-${r.id}`;
  return (
    <article id={cardId} className={`${card} ${r.urgency === 'urgent' ? '!border-t-rose-600' : ''} space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-extrabold ${u.cls}`}>{r.urgency === 'urgent' && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}{u.label}</span>
      </div>
      <p className="text-lg font-extrabold text-[color:var(--ink)] flex items-center gap-2"><Stethoscope className="h-5 w-5 text-[color:var(--t-600)]" aria-hidden="true" /> Referral to {r.toProfessional?.name ? `${r.toProfessional.name} (${r.toSpecialty})` : r.toSpecialty}</p>
      <p className="text-sm text-slate-800"><b>Reason:</b> {r.reason}</p>
      <p className="text-sm text-slate-700">From {r.from}{r.fromLicence ? ` (registration no. ${r.fromLicence})` : ''} · issued {fmtDate(r.issuedAt)}</p>
      <div className="flex flex-wrap gap-2 no-print">
        {onBookSpecialist && (
          <button type="button" onClick={() => onBookSpecialist(r.toProfessional?.id ?? null, r.toSpecialty)} className="min-h-[44px] px-4 inline-flex items-center gap-2 text-sm font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer">
            <CalendarCheck className="h-4 w-4" aria-hidden="true" /> {r.toProfessional?.id ? `Book ${r.toProfessional.name}` : `Find a ${r.toSpecialty}`}
          </button>
        )}
        <button type="button" onClick={() => printCard(cardId)} className={btn}><Printer className="h-4 w-4" aria-hidden="true" /> Print this referral</button>
      </div>
    </article>
  );
}

interface Props {
  certificates: any[];
  referrals: any[];
  scope: 'mc' | 'referrals' | 'both';
  onFindDoctors?: () => void;
  onBookSpecialist?: (professionalId: string | null, specialty: string) => void;
}

/** The patient's medical certificates and referral letters. */
export default function CertificatesPanel({ certificates, referrals, scope, onFindDoctors, onBookSpecialist }: Props) {
  // Current first, then ones that start later, then ended ones; newest first inside each group
  const order: Record<Phase, number> = { current: 0, upcoming: 1, past: 2 };
  const certs = [...certificates].sort((a, b) => order[phaseOf(a.fromDate, a.toDate)] - order[phaseOf(b.fromDate, b.toDate)]);
  const showMc = scope !== 'referrals', showRef = scope !== 'mc';
  return (
    <div className="space-y-5">
      {showMc && (
        <section aria-label="Medical certificates" className="space-y-3">
          <WhyNoMc onFindDoctors={onFindDoctors} />
          {scope === 'both' && <h3 className="text-sm font-extrabold">Medical certificates</h3>}
          {certs.length === 0
            ? <p className="py-6 px-5 bg-white border border-dashed border-[color:var(--t-200)] text-sm text-slate-800 text-center">You have no medical certificates. If you need one, see a doctor in person. The certificate appears here once the doctor issues it.</p>
            : certs.map(c => <CertCard key={c.id} c={c} />)}
        </section>
      )}
      {showRef && (
        <section aria-label="Referral letters" className="space-y-3">
          {scope === 'both' && <h3 className="text-sm font-extrabold flex items-center gap-2"><HeartHandshake className="h-4 w-4" aria-hidden="true" /> Referrals</h3>}
          {referrals.length === 0
            ? <p className="py-6 px-5 bg-white border border-dashed border-[color:var(--t-200)] text-sm text-slate-800 text-center">You have no referral letters. When a doctor refers you to a specialist, it appears here.</p>
            : referrals.map(r => <ReferralCard key={r.id} r={r} onBookSpecialist={onBookSpecialist} />)}
        </section>
      )}
    </div>
  );
}
