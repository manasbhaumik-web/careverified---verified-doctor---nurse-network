import React, { useCallback, useEffect, useState } from 'react';
import PrivacyAdmin from './PrivacyAdmin';
import { X, ShieldCheck, Download, FileText } from 'lucide-react';
import { formatDate } from '../locale';
import { LEGAL_EVENT, type LegalTab } from '../legal';

const jget = (url: string) => fetch(url).then(r => r.json());
const jpost = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());

const KIND_LABEL: Record<string, string> = {
  terms_privacy: 'Terms and privacy notice', health_data: 'Processing of my health data',
  credential_check: 'Checking my credentials with the council', quality_review: 'Care-quality review (name hidden)', medical_tourism: 'Sharing medical tourism enquiries with facilities',
};
const REQUEST_LABEL: Record<string, string> = {
  access: 'Get a copy of my data', correction: 'Correct my data', deletion: 'Delete my data', withdrawal: 'Withdraw consent',
};

type User = { id: string; role: string } | null;
let lastPromptedFor = '';

/** PDPA privacy centre: notice (English / Bahasa Malaysia), the user's consents and requests, and the admin queue. */
export default function PrivacyCentre() {
  const [currentUser, setCurrentUser] = useState<User>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LegalTab>('notice');
  const [lang, setLang] = useState<'en' | 'ms'>('en');
  const [notice, setNotice] = useState<any>(null);
  const [terms, setTerms] = useState<any>(null);
  const [consents, setConsents] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [adminReqs, setAdminReqs] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [kind, setKind] = useState('access');
  const [details, setDetails] = useState('');
  const [msg, setMsg] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // Who is signed in; if the notice changed since they accepted it, ask them to review it once.
  const refreshUser = useCallback(async () => {
    const me = await jget('/api/auth/me').catch(() => null);
    const u = me?.status === 'success' ? me.data.user : null;
    setCurrentUser(u);
    if (u && u.id !== lastPromptedFor) {
      lastPromptedFor = u.id;
      const c = await jget('/api/me/consents').catch(() => null);
      if (c?.status === 'success' && c.data.outdated) { setTab('mine'); setOpen(true); }
    }
  }, []);
  useEffect(() => { refreshUser(); }, [refreshUser]);

  useEffect(() => {
    const on = (e: Event) => { refreshUser(); setTab((e as CustomEvent<LegalTab>).detail || 'notice'); setOpen(true); };
    window.addEventListener(LEGAL_EVENT, on);
    return () => window.removeEventListener(LEGAL_EVENT, on);
  }, []);

  useEffect(() => {
    if (!open) return;
    jget(`/api/legal/privacy?lang=${lang}`).then(d => d.status === 'success' && setNotice(d.data)).catch(() => {});
    jget(`/api/legal/terms?lang=${lang}`).then(d => d.status === 'success' && setTerms(d.data)).catch(() => {});
  }, [open, lang]);

  const loadMine = useCallback(async () => {
    if (!currentUser) return;
    const [c, r] = await Promise.all([jget('/api/me/consents'), jget('/api/me/data-requests')]);
    if (c.status === 'success') setConsents(c.data);
    if (r.status === 'success') setRequests(r.data);
    if (isAdmin) {
      const [a, s] = await Promise.all([jget('/api/admin/data-requests'), jget('/api/admin/privacy-status')]);
      if (a.status === 'success') setAdminReqs(a.data);
      if (s.status === 'success') setStatus(s.data);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => { if (open && (tab === 'mine' || tab === 'admin')) loadMine().catch(() => {}); }, [open, tab, loadMine]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jpost('/api/me/data-requests', { kind, details });
    setMsg(d.status === 'success' ? 'Request received. We will respond within 21 days.' : d.message);
    if (d.status === 'success') { setDetails(''); loadMine(); }
  };
  const withdraw = async (k: string) => {
    if (!confirm('Withdraw this consent?')) return;
    const d = await jpost(`/api/me/consents/${k}/withdraw`);
    setMsg(d.message || 'Done.');
    loadMine();
  };
  const accept = async () => {
    const d = await jpost('/api/me/consents/accept', { consent: true });
    setMsg(d.status === 'success' ? 'Thank you. Your acceptance is recorded.' : d.message);
    loadMine();
  };
  const erase = async (id: string) => {
    const p = await jget(`/api/admin/data-requests/${id}/erasure-plan`);
    if (p.status !== 'success') { setMsg(p.message); return; }
    if (!p.data.eligible) { setMsg(p.data.reason); return; }
    const del = Object.entries(p.data.delete).map(([k, v]) => `  ${k}: ${v}`).join('\n');
    const keep = Object.entries(p.data.retain).filter(([k]) => !['note', 'retentionConfirmed'].includes(k)).map(([k, v]) => `  ${k}: ${v}`).join('\n');
    if (!confirm(`Erase this patient?\n\nDeleted:\n${del}\n\nDe-identified: ${p.data.deIdentify.join('; ')}\n\nRetained:\n${keep}\n\nThis cannot be undone.`)) return;
    const d = await fetch(`/api/admin/data-requests/${id}/erase`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) }).then(r => r.json());
    setMsg(d.message || 'Done.');
    loadMine();
  };
  const resolve = async (id: string, st: 'completed' | 'rejected') => {
    const note = st === 'rejected' ? prompt('Reason for refusing this request:') || '' : prompt('Note to the user (optional):') || '';
    const d = await jpost(`/api/admin/data-requests/${id}/resolve`, { status: st, note });
    if (d.status !== 'success') setMsg(d.message);
    loadMine();
  };

  const tabs: [LegalTab, string][] = [['notice', 'Privacy notice'], ['terms', 'Terms'], ...(currentUser ? [['mine', 'My privacy'] as [LegalTab, string]] : []), ...(isAdmin ? [['admin', 'Admin'] as [LegalTab, string]] : [])];

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Privacy centre">
      <div className="bg-white w-full max-w-2xl max-h-[88vh] flex flex-col border border-slate-300 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="font-black text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" /> Privacy centre</h2>
          <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 border-b border-slate-100">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 text-xs font-bold cursor-pointer border-b-2 ${tab === id ? 'border-[color:var(--t-600)] text-[color:var(--t-700)]' : 'border-transparent text-slate-500'}`}>{label}</button>
          ))}
        </div>

        <div className="overflow-y-auto p-5 space-y-4 text-sm">
          {msg && <p className="text-xs font-bold bg-sky-50 border border-sky-200 text-sky-900 p-2" role="status">{msg}</p>}

          {(tab === 'notice' || tab === 'terms') && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Version {(tab === 'terms' ? terms : notice)?.version ?? '…'}</p>
                <div className="flex gap-1 text-xs font-bold">
                  {(['en', 'ms'] as const).map(l => <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 border cursor-pointer ${lang === l ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-600)]' : 'bg-white border-slate-300'}`}>{l === 'en' ? 'English' : 'Bahasa Malaysia'}</button>)}
                </div>
              </div>
              {(tab === 'terms' ? terms : notice)?.draft && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2 font-semibold">Draft for legal review. This text must be checked by Malaysian counsel before launch.</p>}
              <h3 className="font-extrabold">{(tab === 'terms' ? terms : notice)?.title}</h3>
              {(tab === 'terms' ? terms : notice)?.sections.map((s: any) => (
                <section key={s.heading}><h4 className="text-sm font-black uppercase tracking-wide text-slate-700">{s.heading}</h4><p className="text-xs text-slate-700 leading-relaxed mt-1">{s.body}</p></section>
              ))}
            </>
          )}

          {tab === 'mine' && currentUser && (
            <>
              <section>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-2">My consents</h3>
                {consents?.outdated && (
                  <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2 mb-2 font-semibold space-y-1.5">
                    <p>The privacy notice changed since you last accepted it. Please read it (Privacy notice tab), then accept.</p>
                    <button onClick={accept} className="bg-[color:var(--t-600)] text-white px-3 py-1.5 font-bold cursor-pointer">I have read and accept version {consents.currentVersion}</button>
                  </div>
                )}
                <ul className="space-y-1.5">
                  {(consents?.items ?? []).map((c: any, i: number) => (
                    <li key={i} className="flex items-center justify-between gap-2 border border-slate-200 p-2 text-xs">
                      <span><b>{KIND_LABEL[c.kind] ?? c.kind}</b> · v{c.version} · {formatDate(c.grantedAt)}{c.withdrawnAt ? ` · withdrawn ${formatDate(c.withdrawnAt)}` : ''}</span>
                      {!c.withdrawnAt && <button onClick={() => withdraw(c.kind)} className="text-rose-700 font-bold hover:underline cursor-pointer">Withdraw</button>}
                    </li>
                  ))}
                  {consents && consents.items.length === 0 && <li className="text-xs text-slate-500">No consent records yet. Accepted notice: {consents.accepted ? `v${consents.accepted.version}` : 'none'}.</li>}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-2">Ask us about my data</h3>
                <a href="/api/me/export" className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--t-700)] hover:underline mb-3"><Download className="h-3.5 w-3.5" /> Download my data now (JSON)</a>
                <form onSubmit={submit} className="space-y-2">
                  <select value={kind} onChange={e => setKind(e.target.value)} className="w-full border border-slate-300 p-2 text-xs font-bold">
                    {Object.entries(REQUEST_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder={kind === 'correction' ? 'What is wrong and what should it say?' : 'Details (optional for access requests)'}
                    className="w-full border border-slate-300 p-2 text-xs" />
                  <button className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold px-4 py-2 cursor-pointer">Send request</button>
                </form>
                <ul className="mt-3 space-y-1.5">
                  {requests.map(r => (
                    <li key={r.id} className="border border-slate-200 p-2 text-xs"><b>{REQUEST_LABEL[r.kind] ?? r.kind}</b> · {r.status} · due {formatDate(r.dueAt)}{r.resolutionNote ? ` · ${r.resolutionNote}` : ''}</li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {tab === 'admin' && isAdmin && (
            <>
              {status && (
                <section>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-2">Readiness (notice v{status.consentVersion})</h3>
                  <ul className="space-y-1">{status.checklist.map((c: any) => <li key={c.item} className="text-xs flex gap-2"><span className={c.done ? 'text-emerald-700' : 'text-rose-700'}>{c.done ? '✓' : '✗'}</span>{c.item}{c.note ? ` (${c.note})` : ''}</li>)}</ul>
                  <p className="text-xs mt-2">Open requests: <b>{status.openRequests}</b> · overdue: <b className={status.overdueRequests ? 'text-rose-700' : ''}>{status.overdueRequests}</b> · retention: {status.retentionYears} years</p>
                </section>
              )}
              <PrivacyAdmin onMessage={setMsg} />
              <section>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-2">Data requests</h3>
                <ul className="space-y-1.5">
                  {adminReqs.map(r => (
                    <li key={r.id} className="border border-slate-200 p-2 text-xs space-y-1">
                      <p><b>{REQUEST_LABEL[r.kind] ?? r.kind}</b> · {r.userName} ({r.userEmail}) · {r.status} · due {formatDate(r.dueAt)}</p>
                      {r.details && <p className="text-slate-600 flex gap-1"><FileText className="h-3 w-3 mt-0.5 shrink-0" />{r.details}</p>}
                      {r.status === 'open' && (
                        <div className="flex gap-2">
                          <button onClick={() => resolve(r.id, 'completed')} className="font-bold text-emerald-700 hover:underline cursor-pointer">Mark done</button>
                          <button onClick={() => resolve(r.id, 'rejected')} className="font-bold text-rose-700 hover:underline cursor-pointer">Refuse</button>
                          {(r.kind === 'deletion' || r.kind === 'withdrawal') && <button onClick={() => erase(r.id)} className="font-bold text-slate-800 hover:underline cursor-pointer">Erase account…</button>}
                        </div>
                      )}
                    </li>
                  ))}
                  {adminReqs.length === 0 && <li className="text-xs text-slate-500">No requests.</li>}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
