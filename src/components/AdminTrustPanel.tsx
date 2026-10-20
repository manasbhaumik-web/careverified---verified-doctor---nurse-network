import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, MessageSquareWarning, ShieldOff, ShieldCheck, History, Download } from 'lucide-react';

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
  const [registry, setRegistry] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/verification-requests/${request.id}/history`).then(r => r.json())
      .then(d => setHistory(d.status === 'success' ? d.data : [])).catch(() => {});
  }, [request.id]);

  useEffect(() => {
    fetch('/api/registries').then(r => r.json()).then(d => {
      const list: any[] = d.status === 'success' ? d.data.registries : [];
      setRegistry(list.find(x => x.name === (request.medicalCouncil || request.nursingCouncil)) ?? list.find(x => x.id === 'OTHER') ?? null);
    }).catch(() => {});
  }, [request.medicalCouncil, request.nursingCouncil]);

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

  const field = 'w-full border border-slate-300 rounded-none px-3.5 py-2.5 text-xs focus:outline-none focus:border-[color:var(--t-600)] font-semibold text-slate-800 bg-white';
  return (
    <div className="mt-6 border-t border-slate-200 pt-4 space-y-4">
      {history.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wide"><History className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Decision history ({history.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((h, i) => (
              <li key={i} className="bg-slate-50 border border-slate-200 rounded-none p-2.5">
                <span className="font-black text-slate-800 uppercase tracking-wide">{h.action.replace(/_/g, ' ')}</span> · <span className="font-mono text-slate-500">{fmt(h.ts)}</span>{h.actorName ? ` · ${h.actorName}` : ''}
                {h.note && <span className="block text-slate-650 mt-1 font-semibold">{h.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div>
        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 tracking-wider">Council register check (required to approve)</label>
        {registry && (
          <p className="text-xs text-slate-600 font-semibold mb-1.5 bg-slate-50 border border-slate-200 p-2">
            <b>{registry.name}</b>: {registry.lookup.note}
            {registry.lookup.url && <> <a href={registry.lookup.url} target="_blank" rel="noopener noreferrer" className="underline text-[color:var(--t-600)]">Open register</a></>}
            {registry.lookup.contact && <> · Contact: {registry.lookup.contact}</>}
          </p>
        )}
        <input className={field} value={registryReference} onChange={e => setRegistryReference(e.target.value)}
          placeholder="e.g. MMC online register, checked today, ref / URL" maxLength={200} />
      </div>
      <div>
        <label className="text-xs font-black uppercase text-slate-600 block mb-1.5 tracking-wider">Note to practitioner (required to reject or request more information)</label>
        <textarea className={field} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000} />
      </div>
      {error && <p className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-none p-2.5">{error}</p>}
      <div className="flex flex-wrap gap-2 justify-end pt-1">
        <button disabled={busy} onClick={() => decide('reject')}
          className="h-10 px-4 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all">
          <X className="h-4 w-4" /> Reject
        </button>
        <button disabled={busy} onClick={() => decide('request_info')}
          className="h-10 px-4 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer disabled:opacity-60 transition-all">
          Request more info
        </button>
        <button disabled={busy} onClick={() => decide('approve')}
          className="h-10 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] active:bg-[color:var(--t-800)] border border-[color:var(--t-700)] text-white text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all shadow-none">
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

import SanctionsDrawer from './SanctionsDrawer';

export type TrustSubTab = 'watchlist' | 'complaints' | 'sanctions';

export interface AdminTrustPanelProps {
  onChanged: () => void;
  activeSub?: TrustSubTab;
  currentSubRole?: string;
  currentUser?: any;
}

// ───────── Trust tab: practitioners (suspend/reinstate) and complaints ─────────
export default function AdminTrustPanel({ onChanged, activeSub, currentSubRole = 'registrar', currentUser }: AdminTrustPanelProps) {
  const [practitioners, setPractitioners] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'attention' | 'all'>('attention');
  const [selectedPractitionerForSanction, setSelectedPractitionerForSanction] = useState<any | null>(null);
  const [countersigningId, setCountersigningId] = useState<string | null>(null);

  const load = async () => {
    const [p, c, s] = await Promise.all([
      fetch('/api/admin/practitioners').then(r => r.json()),
      fetch('/api/complaints').then(r => r.json()),
      fetch('/api/admin/sanctions').then(r => r.json()).catch(() => ({ status: 'error', data: [] })),
    ]);
    if (p.status === 'success') setPractitioners(p.data);
    if (c.status === 'success') setComplaints(c.data);
    if (s.status === 'success') setSanctions(s.data);
  };
  useEffect(() => { load().catch(() => setError('Could not load data.')); }, []);

  const act = async (fn: () => Promise<any>) => {
    setError('');
    const d = await fn();
    if (d.status !== 'success') setError(d.message || 'Action failed.');
    await load();
    onChanged();
  };

  const handleOpenSanctionDrawer = (p: any) => {
    setSelectedPractitionerForSanction(p);
  };

  const handleCountersignSanction = async (sanctionId: string) => {
    setCountersigningId(sanctionId);
    try {
      await act(() => post(`/api/admin/sanctions/${sanctionId}/countersign`, { adminSubRole: currentSubRole }));
    } finally {
      setCountersigningId(null);
    }
  };

  const handleDismissSanction = async (sanctionId: string) => {
    if (window.confirm('Dismiss this proposed disciplinary sanction?')) {
      await act(() => post(`/api/admin/sanctions/${sanctionId}/dismiss`, {}));
    }
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

  const exportTrustCsv = () => {
    const headers = ['Practitioner Name', 'Specialization', 'License Number', 'License Expiry', 'Verified Until', 'Verification Status', 'Watchlist Flag'];
    const rows = shown.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.specialization || '').replace(/"/g, '""')}"`,
      `"${(p.licenseNumber || '').replace(/"/g, '""')}"`,
      `"${fmt(p.licenseExpiry)}"`,
      `"${fmt(p.verifiedUntil)}"`,
      `"${(p.verificationStatus || '').replace(/"/g, '""')}"`,
      `"${(p.flag ? (FLAG_LABEL[p.flag]?.text || p.flag) : (p.verificationStatus === 'Suspended' ? 'Suspended' : 'Normal')).replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careverified_trust_watchlist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-none p-3">{error}</p>}

      {(!activeSub || activeSub === 'watchlist') && (
        <section className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Licence & re-verification watchlist</h3>
            <span className="text-xs font-bold text-slate-500">({shown.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportTrustCsv}
              className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 cursor-pointer shadow-none transition-colors"
              title="Export compliance watchlist to CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-none text-xs font-bold border border-slate-200">
              {(['attention', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-none cursor-pointer border ${filter === f ? 'bg-white text-[color:var(--t-700)] border-[color:var(--t-200)] shadow-xs' : 'text-slate-500 border-transparent'}`}>
                  {f === 'attention' ? 'Needs attention' : 'Everyone'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {shown.length === 0 ? <p className="text-xs text-slate-500">Nobody needs attention.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2 pr-3">Practitioner</th><th className="pr-3">Licence</th><th className="pr-3">Expiry</th><th className="pr-3">Verified until</th><th className="pr-3">Status</th><th /></tr></thead>
              <tbody>
                {shown.map(p => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-bold">{p.name}<span className="block font-normal text-slate-500">{p.specialization}</span></td>
                    <td className="pr-3 font-mono">{p.licenseNumber}</td>
                    <td className="pr-3">{fmt(p.licenseExpiry)}</td>
                    <td className="pr-3">{fmt(p.verifiedUntil)}</td>
                    <td className="pr-3">
                      <span className="font-bold">{p.verificationStatus}</span>
                      {p.flag && <span className={`ml-1.5 px-1.5 py-0.5 rounded-none text-2xs font-bold ${FLAG_LABEL[p.flag].cls}`}>{FLAG_LABEL[p.flag].text}</span>}
                      {p.suspensionReason && <span className="block text-slate-500">{p.suspensionReason}</span>}
                    </td>
                    <td className="text-right">
                      {p.verificationStatus === 'Suspended'
                        ? <button onClick={() => act(() => post(`/api/professionals/${p.id}/reinstate`, {}))} className="inline-flex items-center gap-1 text-emerald-700 font-bold cursor-pointer"><ShieldCheck className="h-3.5 w-3.5" />Reinstate</button>
                        : p.verificationStatus.startsWith('Verified')
                          ? <button onClick={() => handleOpenSanctionDrawer(p)} className="inline-flex items-center gap-1 text-rose-700 font-bold hover:text-rose-800 cursor-pointer"><ShieldOff className="h-3.5 w-3.5" />Sanction Order</button>
                          : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Dual-Signoff Pending Sanctions Queue */}
      {(!activeSub || activeSub === 'sanctions' || activeSub === 'watchlist') && sanctions.some(s => s.status === 'pending_countersign') && (
        <section className="bg-amber-50/60 border-2 border-amber-400 rounded-none p-5 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-200 text-amber-900 border border-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight flex items-center gap-2">
                  Dual-Signoff Disciplinary Sanctions Pending Countersignature
                  <span className="px-2 py-0.5 text-2xs font-black uppercase bg-amber-600 text-white">
                    {sanctions.filter(s => s.status === 'pending_countersign').length} Pending
                  </span>
                </h3>
                <p className="text-xs text-amber-800 font-semibold">
                  Medical Act 1971 (Section 29) · Requires two distinct administrative officers or super_admin to execute formal suspension.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {sanctions.filter(s => s.status === 'pending_countersign').map((s) => {
              const prof = practitioners.find(p => p.id === s.professional_id);
              const isInitiator = currentUser?.id === s.initiator_id;
              const canCountersign = currentSubRole === 'super_admin' || (!isInitiator && ['registrar', 'super_admin'].includes(currentSubRole));

              return (
                <div key={s.id} className="p-3.5 bg-white border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-slate-900">{prof?.name || s.professional_id}</span>
                      <span className="text-2xs font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 border border-slate-200">
                        {s.reference_no}
                      </span>
                      <span className="text-2xs font-bold text-amber-800 uppercase px-1.5 py-0.5 bg-amber-100 border border-amber-200">
                        {s.sanction_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-semibold">
                      <strong>Statutory Basis:</strong> {s.statutory_basis}
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      "{s.reason}"
                    </p>
                    <div className="text-xs text-slate-500 font-mono pt-0.5">
                      Initiated by <strong>{s.initiator_name}</strong> ({s.initiator_role}) on {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDismissSanction(s.id)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={!canCountersign || countersigningId === s.id}
                      onClick={() => handleCountersignSanction(s.id)}
                      title={!canCountersign ? "Four-Eyes Principle: Cannot countersign your own order without super_admin authority" : "Confirm and enforce statutory suspension"}
                      className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none shadow-xs ${
                        canCountersign
                          ? 'bg-rose-700 hover:bg-rose-800 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {countersigningId === s.id ? (
                        <span>Enforcing...</span>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Countersign &amp; Enforce</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(!activeSub || activeSub === 'complaints') && (
        <section className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2"><MessageSquareWarning className="h-4 w-4 text-[color:var(--t-600)]" /> Patient complaints ({openComplaints.length} open)</h3>
          {complaints.length === 0 ? <p className="text-xs text-slate-500">No complaints have been filed.</p> : (
            <ul className="space-y-3">
              {complaints.map(c => (
                <li key={c.id} className="border border-slate-200 rounded-none p-3 text-xs space-y-1.5 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{c.professionalName || c.professional_id} · {c.category}</span>
                    <span className="px-2 py-0.5 rounded-none bg-slate-100 border border-slate-200 font-bold uppercase text-2xs">{c.status}</span>
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
      )}

      {/* Structured Institutional Sanctions Drawer */}
      <SanctionsDrawer
        isOpen={Boolean(selectedPractitionerForSanction)}
        onClose={() => setSelectedPractitionerForSanction(null)}
        practitioner={selectedPractitionerForSanction}
        currentSubRole={currentSubRole}
        currentUser={currentUser}
        onSanctionSuccess={() => {
          load();
          onChanged();
        }}
      />
    </div>
  );
}
