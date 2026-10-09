import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, ShieldOff, Upload } from 'lucide-react';

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

  const tone = verified ? 'border-emerald-200 bg-emerald-50' : suspended || rejected ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50';
  const Icon = verified ? CheckCircle2 : suspended || rejected ? ShieldOff : infoRequested ? AlertCircle : Clock;
  const field = 'w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--t-600)]';

  return (
    <section className={`border rounded-xl p-5 space-y-3 ${tone}`} aria-label="Verification status">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="min-w-0 text-sm">
          <p className="font-extrabold">
            {verified ? 'Verified: your profile is public'
              : suspended ? 'Suspended: your profile is hidden'
              : rejected ? 'Application rejected'
              : infoRequested ? 'The board needs more information'
              : 'Pending: under review by the medical board'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Licence expires {fmt(info.licenseExpiry)}{verified ? ` · re-verification due ${fmt(info.verifiedUntil)}` : ''}
            {dueSoon ? ' · renewal needed soon' : ''}
          </p>
          {suspended && info.suspensionReason && <p className="text-xs font-semibold text-rose-800 mt-1">Reason: {info.suspensionReason}</p>}
        </div>
      </div>

      {info.events?.length > 0 && (
        <ul className="text-xs space-y-1.5">
          {info.events.slice(0, 4).map((e: any, i: number) => (
            <li key={i} className="bg-white/70 border border-white rounded-lg p-2">
              <span className="font-bold">{e.action.replace(/_/g, ' ')}</span> · {fmt(e.ts)}
              {e.note && <span className="block text-slate-700">{e.note}</span>}
            </li>
          ))}
        </ul>
      )}

      {(infoRequested || canRenew) && (
        <div className="space-y-2 pt-1">
          <textarea className={field} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000}
            placeholder={infoRequested ? 'Reply to the board (optional)' : 'Note for the board (optional)'} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-700">
              {canRenew ? 'New licence expiry' : 'Updated licence expiry (if changed)'}
              <input type="date" className={`${field} mt-1`} value={expiry} onChange={e => setExpiry(e.target.value)} />
            </label>
            <label className="text-xs font-bold text-slate-700 cursor-pointer inline-flex items-center gap-2 border border-dashed border-slate-300 bg-white rounded-xl px-3 py-2">
              <Upload className="h-4 w-4" /> {file ? file.name : 'Attach renewed / additional document (PDF, JPG, PNG)'}
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button disabled={busy || (canRenew && (!expiry || !file))} onClick={canRenew ? renew : resubmit}
            className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl cursor-pointer">
            {busy ? 'Submitting…' : canRenew ? 'Submit renewal for review' : 'Send reply to the board'}
          </button>
        </div>
      )}
      {msg && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-800' : 'text-rose-700'}`}>{msg.text}</p>}
    </section>
  );
}
