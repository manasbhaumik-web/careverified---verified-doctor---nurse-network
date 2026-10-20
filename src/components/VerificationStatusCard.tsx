import React, { useEffect, useState } from 'react';
import { expiryLabel } from '../registries';
import { AlertCircle, CheckCircle2, Clock, ShieldOff, Upload, Send } from 'lucide-react';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');
const daysUntil = (iso?: string | null) => (iso ? Math.ceil((Date.parse(iso) - Date.now()) / 86400_000) : null);

/** Practitioner's own verification status, reviewer messages, and the actions that follow from them. */
export default function VerificationStatusCard({ onChanged }: { onChanged?: () => void }) {
  const [info, setInfo] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const [expiry, setExpiry] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () =>
    fetch('/api/my-verification').then(r => r.json()).then(d => d.status === 'success' && setInfo(d.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!info) return null;
  const status: string = info.verificationStatus || '';
  const infoRequested = info.requestStatus === 'Info Requested';
  const verified = status.startsWith('Verified');
  const suspended = status === 'Suspended';
  const rejected = status === 'Rejected';
  const expiryDays = daysUntil(info.licenseExpiry);
  const dueSoon = verified && ((expiryDays !== null && expiryDays <= 30) || (daysUntil(info.verifiedUntil) ?? 999) <= 30);
  const canRenew = (suspended || dueSoon) && info.requestStatus !== 'Pending' && !infoRequested;

  const upload = async (requestId: string) => {
    if (!file) return true;
    const form = new FormData();
    form.append('file', file);
    form.append('kind', 'license');
    form.append('verificationRequestId', requestId);
    const d = await fetch('/api/documents', { method: 'POST', body: form }).then(r => r.json());
    if (d.status !== 'success') { setMsg({ ok: false, text: d.message || 'Upload failed.' }); return false; }
    return true;
  };

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setMsg(null);
    try {
      const err = await fn();
      if (!err) { setMsg({ ok: true, text: 'Submitted. The medical board will review it.' }); setNote(''); setFile(null); await load(); onChanged?.(); }
      else setMsg({ ok: false, text: err });
    } catch { setMsg({ ok: false, text: 'Server connection error.' }); }
    finally { setBusy(false); }
  };

  const post = (url: string, body: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

  const resubmit = () => run(async () => {
    if (!(await upload(info.requestId))) return 'Upload failed.';
    const d = await post('/api/my-verification/resubmit', { note, licenseExpiry: expiry || undefined });
    return d.status === 'success' ? null : d.message;
  });
  const renew = () => run(async () => {
    const d = await post('/api/my-verification/renew', { note, licenseExpiry: expiry });
    if (d.status !== 'success') return d.message;
    return (await upload(d.data.verificationRequestId)) ? null : 'Renewal opened, but the document upload failed. Upload it again.';
  });

  const toneBorder = verified
    ? 'border-l-4 border-l-emerald-600 border-t border-r border-b border-[color:var(--t-200)] bg-white'
    : suspended || rejected
    ? 'border-l-4 border-l-rose-600 border-t border-r border-b border-[color:var(--t-200)] bg-white'
    : 'border-l-4 border-l-amber-500 border-t border-r border-b border-[color:var(--t-200)] bg-white';

  const statusBadgeTone = verified
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : suspended || rejected
    ? 'bg-rose-50 text-rose-800 border-rose-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';

  const Icon = verified ? CheckCircle2 : suspended || rejected ? ShieldOff : infoRequested ? AlertCircle : Clock;

  // Deduplicate identical consecutive audit events
  const rawEvents: any[] = info.events || [];
  const events: any[] = [];
  for (const ev of rawEvents) {
    const key = `${ev.action}|${ev.note || ''}`;
    if (!events.some(x => `${x.action}|${x.note || ''}` === key)) {
      events.push(ev);
    }
    if (events.length >= 3) break;
  }

  return (
    <section className={`rounded-none p-5 shadow-2xs space-y-4 ${toneBorder}`} aria-label="Verification status">
      {/* Header Row: Status Identity + APC Expiry Pill Badges */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[color:var(--t-100)]">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`p-2.5 border shrink-0 ${statusBadgeTone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-[color:var(--ink)] uppercase tracking-wide leading-tight">
                {verified ? 'Verified: Your Profile is Public'
                  : suspended ? 'Suspended: Your Profile is Hidden'
                  : rejected ? 'Application Rejected'
                  : infoRequested ? 'The Board Needs More Information'
                  : 'Pending: Under Review by the Medical Board'}
              </h3>
              <span className={`text-2xs font-mono font-black uppercase tracking-wider px-2 py-0.5 border ${statusBadgeTone}`}>
                {status || 'Pending'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {expiryLabel(info.council)}: <strong className="font-mono text-[color:var(--ink)]">{fmt(info.licenseExpiry)}</strong>
              {verified ? ` · Re-verification due ${fmt(info.verifiedUntil)}` : ''}
              {dueSoon ? ' · Renewal needed soon' : ''}
            </p>
            {suspended && info.suspensionReason && (
              <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 mt-1.5">
                Reason: {info.suspensionReason}
              </p>
            )}
          </div>
        </div>

        {/* Compact Event Summary Pills (10px / text-2xs) */}
        {events.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 shrink-0">
            {events.map((e: any, i: number) => (
              <li
                key={i}
                title={e.note || undefined}
                className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2.5 py-1 text-2xs font-mono font-bold uppercase tracking-wider text-slate-700"
              >
                <span className="text-[color:var(--ink)]">{e.action.replace(/_/g, ' ')}</span> &bull; {fmt(e.ts)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Board Audit Trail Details (Deduplicated) */}
      {events.some((e: any) => e.note) && (
        <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3.5 space-y-1.5">
          <span className="text-2xs font-black uppercase tracking-wider text-slate-400 block">Board Governance &amp; Audit Notes</span>
          <ul className="text-xs space-y-1">
            {events.filter((e: any) => e.note).map((e: any, i: number) => (
              <li key={i} className="text-slate-700 flex flex-wrap items-baseline gap-1.5">
                <span className="text-2xs font-mono font-black uppercase tracking-wider px-1.5 py-0.5 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)]">
                  {e.action.replace(/_/g, ' ')}
                </span>
                <span className="font-medium">{e.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unified Single-Row 44px (h-11) Renewal / Board Response Action Bar */}
      {(infoRequested || canRenew) && (
        <div className="pt-2 border-t border-[color:var(--t-100)] space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            {/* 1. New Licence Expiry Date (3 cols) */}
            <div className="lg:col-span-3">
              <label className="block text-2xs font-black uppercase tracking-wider text-slate-500 mb-1">
                {canRenew ? 'New licence expiry' : 'Updated licence expiry (if changed)'}
              </label>
              <input
                type="date"
                aria-label={canRenew ? 'New licence expiry' : 'Updated licence expiry (if changed)'}
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full h-11 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3 text-xs font-bold text-[color:var(--ink)] rounded-none focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
              />
            </div>

            {/* 2. Attach Renewed Document (4 cols) */}
            <div className="lg:col-span-4">
              <span className="block text-2xs font-black uppercase tracking-wider text-slate-500 mb-1">
                Supporting APC / Certificate Document
              </span>
              <label className="w-full h-11 text-xs font-bold text-[color:var(--t-700)] cursor-pointer flex items-center justify-center gap-2 border border-dashed border-[color:var(--t-300)] bg-[color:var(--t-50)]/40 hover:bg-[color:var(--t-50)] px-3 rounded-none transition-colors truncate">
                <Upload className="h-4 w-4 shrink-0 text-[color:var(--t-600)]" />
                <span className="truncate">{file ? file.name : 'Attach renewed / additional document (PDF, JPG, PNG)'}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {/* 3. Note for the Board (5 cols) */}
            <div className="lg:col-span-5">
              <label className="block text-2xs font-black uppercase tracking-wider text-slate-500 mb-1">
                Board Submission Note (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={1000}
                  placeholder={infoRequested ? 'Reply to the board (optional)' : 'Note for the board (optional)'}
                  className="flex-1 h-11 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3 text-xs font-medium text-[color:var(--ink)] rounded-none focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  disabled={busy || (canRenew && (!expiry || !file))}
                  onClick={canRenew ? renew : resubmit}
                  className="h-11 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase tracking-wider rounded-none cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{busy ? 'Submitting…' : canRenew ? 'Submit renewal for review' : 'Send reply to the board'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {msg && (
        <p role="status" className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}
