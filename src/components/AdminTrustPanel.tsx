import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, MessageSquareWarning, ShieldOff, ShieldCheck, History } from 'lucide-react';

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

// ───────── Decision controls shown in the application review modal ─────────
export function ReviewActions({ request, onDone }: { request: any; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [registryReference, setRegistryReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/verification-requests/${request.id}/history`).then(r => r.json())
      .then(d => setHistory(d.status === 'success' ? d.data : [])).catch(() => {});
  }, [request.id]);

  const decide = async (decision: 'approve' | 'reject' | 'request_info') => {
    setBusy(true);
    setError('');
    try {
      const d = await post(`/api/verification-requests/${request.id}/decision`, { decision, note, registryReference });
      if (d.status === 'success') onDone();
      else setError(d.message || 'Could not record the decision.');
    } catch {
      setError('Server connection error.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--t-600)]';
  return (
    <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
      {history.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-bold text-slate-600 flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Decision history ({history.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((h, i) => (
              <li key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <span className="font-bold">{h.action.replace(/_/g, ' ')}</span> · {fmt(h.ts)}{h.actorName ? ` · ${h.actorName}` : ''}
                {h.note && <span className="block text-slate-600">{h.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div>
        <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Council register check (required to approve)</label>
        <input className={field} value={registryReference} onChange={e => setRegistryReference(e.target.value)}
          placeholder="e.g. MMC online register, checked today, ref / URL" maxLength={200} />
      </div>
      <div>
        <label className="text-[10px] font-extrabold uppercase text-slate-500 block mb-1">Note to practitioner (required to reject or request more information)</label>
        <textarea className={field} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000} />
      </div>
      {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <button disabled={busy} onClick={() => decide('reject')}
          className="px-4 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
          <X className="h-4 w-4" /> Reject
        </button>
        <button disabled={busy} onClick={() => decide('request_info')}
          className="px-4 py-2.5 bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 text-xs font-extrabold rounded-xl cursor-pointer disabled:opacity-60">
          Request more info
        </button>
        <button disabled={busy} onClick={() => decide('approve')}
          className="px-5 py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
          <Check className="h-4 w-4" /> Approve & Publish
        </button>
      </div>
    </div>
  );
}

const FLAG_LABEL: Record<string, { text: string; cls: string }> = {
  licence_expired: { text: 'Licence expired', cls: 'bg-rose-100 text-rose-800' },
  licence_expiring: { text: 'Licence expiring ≤30d', cls: 'bg-amber-100 text-amber-800' },
  reverification_due: { text: 'Re-verification due ≤30d', cls: 'bg-amber-100 text-amber-800' },
  no_expiry_on_file: { text: 'No expiry on file', cls: 'bg-slate-200 text-slate-700' },
};

// ───────── Trust tab: practitioners (suspend/reinstate) and complaints ─────────
export default function AdminTrustPanel({ onChanged }: { onChanged: () => void }) {
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'attention' | 'all'>('attention');

  const load = async () => {
    const [p, c] = await Promise.all([
      fetch('/api/admin/practitioners').then(r => r.json()),
      fetch('/api/complaints').then(r => r.json()),
    ]);
    if (p.status === 'success') setPractitioners(p.data);
    if (c.status === 'success') setComplaints(c.data);
  };
  useEffect(() => { load().catch(() => setError('Could not load data.')); }, []);

  const act = async (fn: () => Promise<any>) => {
    setError('');
    const d = await fn();
    if (d.status !== 'success') setError(d.message || 'Action failed.');
    await load();
    onChanged();
  };

  const suspend = (p: any) => {
    const reason = window.prompt(`Reason for suspending ${p.name}? (the practitioner will see this)`);
    if (reason) act(() => post(`/api/professionals/${p.id}/suspend`, { reason }));
  };
  const resolve = (c: any, outcome: 'investigating' | 'upheld' | 'dismissed') => {
    let resolution = '';
    let suspendToo = false;
    if (outcome !== 'investigating') {
      resolution = window.prompt(`Resolution note for the ${outcome} outcome:`) || '';
      if (!resolution) return;
      if (outcome === 'upheld') suspendToo = window.confirm('Also suspend this practitioner now?');
    }
    act(() => post(`/api/complaints/${c.id}/resolve`, { outcome, resolution, suspend: suspendToo }));
  };

  const shown = practitioners.filter(p => filter === 'all' || p.flag || p.verificationStatus === 'Suspended');
  const openComplaints = complaints.filter(c => c.status === 'open' || c.status === 'investigating');

  return (
    <div className="space-y-6 text-slate-800">
      {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</p>}

      <section className="bg-white border border-[color:var(--t-200)] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Licence & re-verification watchlist</h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
            {(['attention', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md cursor-pointer ${filter === f ? 'bg-white text-[color:var(--t-700)] shadow-xs' : 'text-slate-500'}`}>
                {f === 'attention' ? 'Needs attention' : 'Everyone'}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? <p className="text-xs text-slate-500">Nobody needs attention.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[10px] uppercase text-slate-500"><th className="py-2 pr-3">Practitioner</th><th className="pr-3">Licence</th><th className="pr-3">Expiry</th><th className="pr-3">Verified until</th><th className="pr-3">Status</th><th /></tr></thead>
              <tbody>
                {shown.map(p => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-bold">{p.name}<span className="block font-normal text-slate-500">{p.specialization}</span></td>
                    <td className="pr-3 font-mono">{p.licenseNumber}</td>
                    <td className="pr-3">{fmt(p.licenseExpiry)}</td>
                    <td className="pr-3">{fmt(p.verifiedUntil)}</td>
                    <td className="pr-3">
                      <span className="font-bold">{p.verificationStatus}</span>
                      {p.flag && <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${FLAG_LABEL[p.flag].cls}`}>{FLAG_LABEL[p.flag].text}</span>}
                      {p.suspensionReason && <span className="block text-slate-500">{p.suspensionReason}</span>}
                    </td>
                    <td className="text-right">
                      {p.verificationStatus === 'Suspended'
                        ? <button onClick={() => act(() => post(`/api/professionals/${p.id}/reinstate`, {}))} className="inline-flex items-center gap-1 text-emerald-700 font-bold cursor-pointer"><ShieldCheck className="h-3.5 w-3.5" />Reinstate</button>
                        : p.verificationStatus.startsWith('Verified')
                          ? <button onClick={() => suspend(p)} className="inline-flex items-center gap-1 text-rose-700 font-bold cursor-pointer"><ShieldOff className="h-3.5 w-3.5" />Suspend</button>
                          : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-[color:var(--t-200)] rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2"><MessageSquareWarning className="h-4 w-4 text-[color:var(--t-600)]" /> Patient complaints ({openComplaints.length} open)</h3>
        {complaints.length === 0 ? <p className="text-xs text-slate-500">No complaints have been filed.</p> : (
          <ul className="space-y-3">
            {complaints.map(c => (
              <li key={c.id} className="border border-slate-100 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{c.professionalName || c.professional_id} · {c.category}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[10px]">{c.status}</span>
                </div>
                <p className="text-slate-600">{c.description}</p>
                <p className="text-slate-400">From {c.complainantName || 'patient'} · {fmt(c.created_at)}{c.resolution ? ` · Resolution: ${c.resolution}` : ''}</p>
                {(c.status === 'open' || c.status === 'investigating') && (
                  <div className="flex gap-3 pt-1 font-bold">
                    {c.status === 'open' && <button onClick={() => resolve(c, 'investigating')} className="text-amber-700 cursor-pointer">Start investigation</button>}
                    <button onClick={() => resolve(c, 'upheld')} className="text-rose-700 cursor-pointer">Uphold</button>
                    <button onClick={() => resolve(c, 'dismissed')} className="text-slate-600 cursor-pointer">Dismiss</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
