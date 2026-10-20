import React, { useCallback, useEffect, useState } from 'react';

const jreq = (url: string, method = 'GET', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

interface Status {
  mode: 'smtp' | 'log' | 'off'; smtpHost: string | null; from: string; appUrl: string | null; problems: string[]; counts: Record<string, number>;
  recent: { id: string; createdAt: string; to: string; template: string; lang: string; subject: string; status: string; attempts: number; error: string | null }[];
}
const TONE: Record<string, string> = { sent: 'bg-emerald-100 text-emerald-900', logged: 'bg-sky-100 text-sky-900', failed: 'bg-rose-100 text-rose-900', skipped: 'bg-amber-100 text-amber-900', queued: 'bg-slate-100 text-slate-800' };

/** The board's view of email: is it on, what was sent, what failed and why, and a test button for go-live. */
export default function AdminEmail() {
  const [s, setS] = useState<Status | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => jreq('/api/admin/email/status').then(d => d.status === 'success' && setS(d.data)), []);
  useEffect(() => { load(); }, [load]);

  const test = async () => {
    setBusy(true); setMsg(null);
    const d = await jreq('/api/admin/email/test', 'POST', {});
    setBusy(false);
    if (d.status === 'success') setMsg({ ok: d.data.status === 'sent' || d.data.status === 'logged', text: d.data.status === 'sent' ? 'Sent. Check your inbox (and spam).' : d.data.status === 'logged' ? 'Logged only: development mode does not send mail.' : `${d.data.status}: ${d.data.error ?? ''}` });
    else setMsg({ ok: false, text: d.message || 'Could not send.' });
    load();
  };

  if (!s) return <p role="status" className="text-xs text-slate-600">Loading email…</p>;
  return (
    <section aria-labelledby="email-h" className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="email-h" className="text-sm font-extrabold">Email</h3>
          <p className="text-xs text-slate-700 mt-1">Mode <b>{s.mode}</b>{s.smtpHost ? <> · server {s.smtpHost}</> : null} · from {s.from} · links use {s.appUrl ?? 'nothing (APP_URL is not set)'}. Last 7 days: {Object.entries(s.counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing yet'}.</p>
        </div>
        <button type="button" onClick={test} disabled={busy} className="min-h-[36px] px-3 text-xs font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] cursor-pointer disabled:opacity-60">Send myself a test email</button>
      </div>
      {s.problems.length > 0 && <ul className="text-xs bg-rose-50 border border-rose-200 text-rose-900 font-bold p-3 space-y-1 list-disc pl-6">{s.problems.map(p => <li key={p}>{p}</li>)}</ul>}
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-bold p-2 border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>{msg.text}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-xs uppercase text-slate-600"><th className="py-2 pr-3">When</th><th className="pr-3">To</th><th className="pr-3">Email</th><th className="pr-3">Status</th><th>Detail</th></tr></thead>
          <tbody>
            {s.recent.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-600">No email yet.</td></tr>}
            {s.recent.map(r => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{when(r.createdAt)}</td>
                <td className="pr-3 break-all">{r.to}</td>
                <td className="pr-3">{r.template}<span className="block text-slate-600">{r.lang}</span></td>
                <td className="pr-3"><span className={`px-1.5 py-0.5 text-2xs font-extrabold uppercase ${TONE[r.status] ?? ''}`}>{r.status}</span>{r.attempts > 1 ? <span className="ml-1 text-slate-600">{r.attempts} tries</span> : null}</td>
                <td className="text-slate-700">{r.error ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">Message bodies are not kept. Rows are removed after 90 days (EMAIL_OUTBOX_DAYS).</p>
    </section>
  );
}
