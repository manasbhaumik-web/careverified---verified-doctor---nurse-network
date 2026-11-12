import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Star } from 'lucide-react';
import { useTr } from '../locale';
import { MACROS, MACRO_LANGS, fillMacro, type MacroLang, type SupportHours } from '../supportMy';
import AdminPartners from './AdminPartners';
import { TestimonialAdmin } from './TestimonialPanels';
import AdminActionModal, { type AdminActionModalConfig } from './AdminActionModal';

const jreq = (url: string, method = 'POST', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const lab = 'text-xs font-extrabold uppercase tracking-wider text-slate-500';
const btn = 'text-xs font-bold cursor-pointer';
const field = 'form-input text-xs';

export type QualitySubTab = 'support' | 'partners' | 'reviews' | 'incidents' | 'peer' | 'credentials';

export const QUALITY_SUBS: { id: QualitySubTab; label: string }[] = [
  { id: 'support', label: 'Support & Enquiries' },
  { id: 'reviews', label: 'Reviews & Peer' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'credentials', label: 'CPD & Certs' },
];

export interface AdminQualityProps {
  activeSub?: QualitySubTab;
  onSubChange?: (sub: QualitySubTab) => void;
  hideHeaderTabs?: boolean;
}

/** Admin quality and safety: support & partner queue, review/peer moderation, incidents, credentials. */
export default function AdminQuality({
  activeSub,
  onSubChange,
  hideHeaderTabs = false,
}: AdminQualityProps = {}) {
  const tx = useTr();
  const [internalSub, setInternalSub] = useState<QualitySubTab>('support');
  const rawSub = activeSub ?? internalSub;
  const sub: QualitySubTab = rawSub === 'partners' ? 'support' : rawSub === 'peer' ? 'reviews' : rawSub;
  const setSub = (newSub: QualitySubTab) => {
    if (onSubChange) onSubChange(newSub);
    else setInternalSub(newSub);
  };
  const [msg, setMsg] = useState('');
  const [supportStream, setSupportStream] = useState<'tickets' | 'partners'>(rawSub === 'partners' ? 'partners' : 'tickets');

  return (
    <div className="space-y-4 text-slate-800">
      {!hideHeaderTabs && (
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
          {QUALITY_SUBS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={sub === t.id}
              onClick={() => { setSub(t.id); setMsg(''); }}
              className={`px-3 py-2.5 text-xs font-bold cursor-pointer rounded-none ${
                sub === t.id ? 'border-b-2 border-[color:var(--t-600)] text-[color:var(--t-700)]' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {msg && <p role="status" className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-none p-2.5">{msg}</p>}
      {sub === 'support' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setSupportStream('tickets')}
              className={`px-3 py-1.5 text-xs font-bold rounded-none cursor-pointer border ${
                supportStream === 'tickets'
                  ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tx('Support Desk Tickets')}
            </button>
            <button
              type="button"
              onClick={() => setSupportStream('partners')}
              className={`px-3 py-1.5 text-xs font-bold rounded-none cursor-pointer border ${
                supportStream === 'partners'
                  ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tx('Partner Enquiries')}
            </button>
          </div>
          {supportStream === 'tickets' ? <Support say={setMsg} /> : <AdminPartners say={setMsg} />}
        </div>
      )}
      {sub === 'reviews' && <Reviews say={setMsg} initialMode={rawSub === 'peer' ? 'peer' : undefined} />}
      {sub === 'incidents' && <Incidents say={setMsg} />}
      {sub === 'credentials' && <Credentials say={setMsg} />}
    </div>
  );
}

function Support({ say }: { say: (t: string) => void }) {
  const tx = useTr();
  const [data, setData] = useState<any | null>(null);
  const [view, setView] = useState<'active' | 'resolved'>('active');
  const [open, setOpen] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [macroLang, setMacroLang] = useState<MacroLang>('en');
  const [hoursCfg, setHoursCfg] = useState<SupportHours | undefined>(undefined);
  useEffect(() => { fetch('/api/support/hours').then(r => r.json()).then(d => d.status === 'success' && setHoursCfg(d.data.hours)).catch(() => {}); }, []);
  const load = useCallback(() => fetch(`/api/admin/support/tickets?status=${view}`).then(r => r.json()).then(d => d.status === 'success' && setData(d.data)), [view]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  const openT = async (id: string) => { const d = await fetch(`/api/support/tickets/${id}`).then(r => r.json()); if (d.status === 'success') setOpen(d.data); };
  const send = async () => { const d = await jreq(`/api/support/tickets/${open.id}/reply`, 'POST', { body: reply }); if (d.status === 'success') { setReply(''); openT(open.id); load(); } else say(d.message); };
  return (
    <div className="space-y-4">
      {data && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Open tickets', data.stats.open], ['Overdue', data.stats.overdue], ['Median first reply', data.stats.medianFirstResponseMinutes == null ? '—' : `${data.stats.medianFirstResponseMinutes} min`], ['Replied within target', data.stats.targetMetPct == null ? '—' : `${data.stats.targetMetPct}%`]].map(([l, v]) => (
          <div key={l as string} className={`bg-white border p-3 ${l === 'Overdue' && (v as number) > 0 ? 'border-rose-300' : 'border-slate-200'}`}><p className={lab}>{l}</p><p className="text-xl font-black tabular-nums">{v}</p></div>
        ))}</div>}
      <div className="flex gap-2 text-xs font-bold">{(['active', 'resolved'] as const).map(v => <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 cursor-pointer ${view === v ? 'bg-[color:var(--t-600)] text-white' : 'bg-slate-100'}`}>{v}</button>)}</div>
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <ul className="bg-white border border-slate-200 divide-y divide-slate-100 text-xs max-h-[480px] overflow-y-auto">
          {(data?.tickets ?? []).length === 0 && <li className="p-4 text-xs text-slate-500">{tx('No tickets.')}</li>}
          {(data?.tickets ?? []).map((t: any) => (
            <li key={t.id}><button onClick={() => openT(t.id)} className="w-full text-left p-3 cursor-pointer hover:bg-slate-50">
              <p className="font-bold truncate">{t.subject} {t.overdue && <span className="text-2xs bg-rose-100 text-rose-800 px-1.5 py-0.5 ml-1">{tx('OVERDUE')}</span>}</p>
              <p className="text-xs text-slate-500">{t.requester} · {t.category} · {t.priority} · {t.firstResponseAt ? 'replied' : `reply due ${when(t.firstResponseDue)}`}</p></button></li>
          ))}
        </ul>
        <div className="bg-white border border-slate-200 p-4 space-y-3">
          {!open ? <p className="text-xs text-slate-500">{tx('Select a ticket.')}</p> : (
            <>
              <div className="flex justify-between gap-2"><div><h3 className="text-sm font-extrabold">{open.subject}</h3><p className="text-xs text-slate-500">{open.requester} · {open.category}{open.target ? ` · about: ${open.target}` : ''}</p></div>
                <select aria-label={tx('Priority')} className="form-select text-xs h-9 w-auto" value={open.priority} onChange={async e => { await jreq(`/api/admin/support/tickets/${open.id}/priority`, 'POST', { priority: e.target.value }); openT(open.id); load(); }}>
                  {['urgent', 'high', 'normal', 'low'].map(p => <option key={p}>{p}</option>)}</select></div>
              <ul className="space-y-2 max-h-64 overflow-y-auto">{open.messages.map((m: any) => <li key={m.id} className={`text-xs p-2.5 border ${m.fromStaff ? 'bg-[color:var(--t-50)] border-[color:var(--t-200)]' : 'bg-slate-50 border-slate-200'}`}><p className="text-xs font-extrabold uppercase text-slate-500">{m.fromStaff ? tx('Staff') : tx('User')} · {when(m.ts)}</p>{m.body}</li>)}</ul>
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <label className="font-bold text-slate-600" htmlFor="macro-lang">{tx('Reply template')}</label>
                <select id="macro-lang" aria-label={tx('Template language')} className="form-select text-xs h-9 w-auto" value={macroLang} onChange={e => setMacroLang(e.target.value as MacroLang)}>
                  {MACRO_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
                <select aria-label={tx('Reply template')} className="form-select text-xs h-9 min-w-0 flex-1" value="" onChange={e => { const m = MACROS.find(x => x.id === e.target.value); if (m) setReply(fillMacro(m, macroLang, { name: open.requester, hours: hoursCfg })); }}>
                  <option value="">{tx('Insert a template…')}</option>
                  {MACROS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
              </div>
              <div className="flex gap-2"><textarea rows={3} className={field} value={reply} onChange={e => setReply(e.target.value)} placeholder={tx('Reply')} aria-label={tx('Reply')} maxLength={3000} /><button onClick={send} disabled={!reply.trim()} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-4 cursor-pointer">{tx('Send')}</button></div>
              {open.status !== 'resolved' && <button onClick={async () => { await jreq(`/api/support/tickets/${open.id}/resolve`); openT(open.id); load(); }} className={`${btn} text-emerald-700`}>{tx('Mark resolved')}</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Reviews({ say, initialMode }: { say: (t: string) => void; initialMode?: 'practitioner_reviews' | 'testimonials' | 'peer' }) {
  const tx = useTr();
  const [mode, setMode] = useState<'practitioner_reviews' | 'testimonials' | 'peer'>(initialMode || 'practitioner_reviews');
  const [filter, setFilter] = useState<'reported' | 'all'>('reported');
  const [list, setList] = useState<any[]>([]);
  const [modal, setModal] = useState<AdminActionModalConfig | null>(null);
  const load = useCallback(() => fetch(`/api/admin/reviews${filter === 'reported' ? '?filter=reported' : ''}`).then(r => r.json()).then(d => d.status === 'success' && setList(d.data)), [filter]);
  useEffect(() => { load(); }, [load]);
  const decide = (id: string, action: 'hide' | 'keep' | 'restore') => {
    setModal({
      title: tx('Moderate Review'),
      description: tx('Record the audit reason for this moderation action.'),
      tone: action === 'hide' ? 'danger' : 'brand',
      inputLabel: `${tx('Reason for decision')} (${action}) *`,
      inputPlaceholder: tx('e.g. Verified spam / policy violation / substantiated patient feedback'),
      confirmLabel: action === 'hide' ? tx('Remove Review') : action === 'restore' ? tx('Restore Review') : tx('Keep Review'),
      onConfirm: async (reason) => {
        const d = await jreq(`/api/admin/reviews/${id}/moderate`, 'POST', { action, reason });
        say(d.status === 'success' ? 'Decision recorded.' : d.message);
        load();
      },
    });
  };
  return (
    <div className="space-y-4">
      {/* Moderation Stream Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setMode('practitioner_reviews')}
          className={`px-3 py-1.5 text-xs font-bold rounded-none cursor-pointer border ${
            mode === 'practitioner_reviews'
              ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tx('Practitioner Reviews Moderation')}
        </button>
        <button
          type="button"
          onClick={() => setMode('testimonials')}
          className={`px-3 py-1.5 text-xs font-bold rounded-none cursor-pointer border ${
            mode === 'testimonials'
              ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tx('Patient Testimonials (Landing Page)')}
        </button>
        <button
          type="button"
          onClick={() => setMode('peer')}
          className={`px-3 py-1.5 text-xs font-bold rounded-none cursor-pointer border ${
            mode === 'peer'
              ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {tx('Peer Review & Audits')}
        </button>
      </div>

      {mode === 'testimonials' ? (
        <TestimonialAdmin className="border-0 p-0 shadow-none" />
      ) : mode === 'peer' ? (
        <Peer say={say} />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 text-xs font-bold">
            {(['reported', 'all'] as const).map(v => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 cursor-pointer rounded-none border ${
                  filter === v
                    ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {v === 'reported' ? tx('Reported by practitioners') : tx('All reviews')}
              </button>
            ))}
          </div>
          {list.length === 0 && <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-none p-4">{tx('Nothing to moderate.')}</p>}
          <AdminActionModal config={modal} onClose={() => setModal(null)} />
          {list.map(r => (
            <article key={r.id} className="bg-white border border-slate-200 rounded-none p-4 text-xs space-y-1">
              <p className="font-bold flex flex-wrap items-center gap-1.5">
                <span>{r.professionalName}</span>
                <span className="inline-flex items-center gap-0.5 text-amber-600 font-mono tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>{r.rating}/5</span>
                </span>
                <span className="text-xs text-slate-500 font-normal">by {r.patientName} · {r.date} · {r.status ?? 'published'}</span>
              </p>
              {r.comment && <p>{r.comment}</p>}
              {r.reportedAt && <p className="text-xs bg-amber-50 border border-amber-200 rounded-none p-2">Reported: {r.reportReason}</p>}
              {r.moderatedAt && <p className="text-xs text-slate-500">Decided: {r.moderationReason}</p>}
              <div className="flex gap-4 pt-1">
                {r.status !== 'hidden' && <button className={`${btn} text-rose-700`} onClick={() => decide(r.id, 'hide')}>{tx('Remove')}</button>}
                {r.reportedAt && !r.moderatedAt && <button className={btn} onClick={() => decide(r.id, 'keep')}>{tx('Keep')}</button>}
                {r.status === 'hidden' && <button className={`${btn} text-emerald-700`} onClick={() => decide(r.id, 'restore')}>{tx('Restore')}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Incidents({ say }: { say: (t: string) => void }) {
  const tx = useTr();
  const [list, setList] = useState<any[]>([]);
  const [modal, setModal] = useState<AdminActionModalConfig | null>(null);
  const load = useCallback(() => fetch('/api/admin/incidents').then(r => r.json()).then(d => d.status === 'success' && setList(d.data)), []);
  useEffect(() => { load(); }, [load]);
  const update = (id: string, status: 'investigating' | 'resolved' | 'closed') => {
    setModal({
      title: status === 'investigating' ? tx('Start Incident Investigation') : status === 'resolved' ? tx('Resolve Incident') : tx('Close Incident'),
      tone: status === 'closed' ? 'warning' : 'brand',
      inputLabel: status === 'investigating' ? tx('Investigation Note (Optional)') : tx('Outcome / Actions Taken *'),
      inputRequired: status !== 'investigating',
      inputPlaceholder: tx('Document findings, escalation steps, or resolution summary'),
      confirmLabel: tx('Update Incident'),
      onConfirm: async (note) => {
        const d = await jreq(`/api/admin/incidents/${id}/update`, 'POST', { status, note });
        say(d.status === 'success' ? 'Updated.' : d.message);
        load();
      },
    });
  };
  const tone: Record<string, string> = { critical: 'bg-rose-200 text-rose-900', high: 'bg-rose-100 text-rose-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-700' };
  return (
    <div className="space-y-3">
      <AdminActionModal config={modal} onClose={() => setModal(null)} />
      {list.length === 0 && <p className="text-xs text-slate-500 bg-white border border-slate-200 p-4">{tx('No incidents reported.')}</p>}
      {list.map(i => (
        <article key={i.id} className="bg-white border border-slate-200 p-4 text-xs space-y-1.5">
          <p className="font-bold"><span className={`text-2xs px-1.5 py-0.5 mr-2 uppercase ${tone[i.severity]}`}>{i.severity}</span>{i.kind.replace(/_/g, ' ')} <span className="text-xs text-slate-500 font-normal">· {i.status} · by {i.reporter} · {when(i.createdAt)}</span></p>
          <p>{i.description}</p>
          {i.relatedType && <p className="text-xs text-slate-500">Related {i.relatedType}: {i.relatedId}</p>}
          <details className="text-xs"><summary className="cursor-pointer font-bold">Timeline ({i.events.length})</summary><ul className="mt-1 space-y-1">{i.events.map((e: any, k: number) => <li key={k}>{when(e.ts)} · <b>{e.action}</b>{e.actor ? ` · ${e.actor}` : ''}{e.note ? ` · ${e.note}` : ''}</li>)}</ul></details>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {(i.status === 'new' || i.status === 'investigating') ? (
              <div className="flex items-center gap-3">
                {i.status === 'new' && <button className={`${btn} text-[color:var(--t-700)] hover:underline`} onClick={() => update(i.id, 'investigating')}>{tx('Start investigation')}</button>}
                <button className={`${btn} text-emerald-700 hover:underline`} onClick={() => update(i.id, 'resolved')}>{tx('Resolve')}</button>
                <button className={`${btn} text-slate-600 hover:underline`} onClick={() => update(i.id, 'closed')}>{tx('Close')}</button>
              </div>
            ) : <div />}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('medcred-admin-nav', {
                  detail: {
                    group: 'registry',
                    tab: 'trust',
                    sub: 'complaints',
                    practitionerId: i.relatedId,
                    incidentId: i.id,
                    incidentReason: i.description
                  }
                }));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
              title={tx('Escalate incident directly to Trust Watchlist & Complaints')}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              <span>{tx('Escalate to Trust Watchlist')}</span>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Peer({ say }: { say: (t: string) => void }) {
  const tx = useTr();
  const [list, setList] = useState<any[]>([]);
  const [sample, setSample] = useState({ subjectType: 'prescription', days: 30, count: 5 });
  const load = useCallback(() => fetch('/api/admin/peer-reviews').then(r => r.json()).then(d => d.status === 'success' && setList(d.data)), []);
  useEffect(() => { load(); }, [load]);
  const run = async () => {
    const d = await jreq('/api/admin/audits/sample', 'POST', sample);
    say(d.status === 'success' ? `Assigned ${d.data.assigned} case(s) to peer reviewers (${d.data.available} were available, ${d.data.skipped} could not be assigned).` : d.message); load();
  };
  return (
    <div className="space-y-4">
      <section className="bg-white border border-[color:var(--t-200)] p-4 space-y-2">
        <h3 className="text-sm font-extrabold">{tx('Random case audit')}</h3>
        <p className="text-xs text-slate-600">{tx('Picks signed work at random from recent days and assigns each case to the verified doctor with the fewest open reviews (never the author). Reviewers see cases without patient or author names.')}</p>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <label>{tx('Type')}<select className={`${field} mt-1`} value={sample.subjectType} onChange={e => setSample({ ...sample, subjectType: e.target.value })}><option value="prescription">{tx('Prescriptions')}</option><option value="encounter">{tx('Consultation notes')}</option></select></label>
          <label>{tx('Last days')}<input type="number" min={1} max={90} className={`${field} mt-1 w-24`} value={sample.days} onChange={e => setSample({ ...sample, days: Number(e.target.value) })} /></label>
          <label>{tx('How many')}<input type="number" min={1} max={50} className={`${field} mt-1 w-24`} value={sample.count} onChange={e => setSample({ ...sample, count: Number(e.target.value) })} /></label>
          <button onClick={run} className="bg-[color:var(--t-600)] text-white font-extrabold px-4 py-2.5 cursor-pointer">{tx('Draw sample')}</button>
        </div>
      </section>
      <section className="bg-white border border-slate-200 p-4">
        <h3 className="text-sm font-extrabold mb-2">{tx('All peer reviews')}</h3>
        {list.length === 0 ? <p className="text-xs text-slate-500">{tx('None.')}</p> : (
          <table className="w-full text-xs"><thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-1">{tx('Case')}</th><th>{tx('Author')}</th><th>{tx('Reviewer')}</th><th>{tx('Status')}</th><th>{tx('Outcome')}</th></tr></thead>
            <tbody>{list.map(r => (
              <tr key={r.id} className="border-t border-slate-100 align-top"><td className="py-1.5">{r.subjectType} · {r.source}</td><td>{r.author}</td><td>{r.reviewer}</td><td className="font-bold">{r.status}</td>
                <td>{r.outcome ? `${r.outcome.replace(/_/g, ' ')} (${r.score}/5)` : '—'}{r.comments ? <span className="block text-slate-600">{r.comments}</span> : null}</td></tr>
            ))}</tbody></table>
        )}
      </section>
    </div>
  );
}

function Credentials({ say }: { say: (t: string) => void }) {
  const tx = useTr();
  const [data, setData] = useState<any | null>(null);
  const [modal, setModal] = useState<AdminActionModalConfig | null>(null);
  const load = useCallback(() => fetch('/api/admin/credentials').then(r => r.json()).then(d => d.status === 'success' && setData(d.data)), []);
  useEffect(() => { load(); }, [load]);
  const decide = async (kind: 'cpd' | 'specialty-certs', id: string, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') {
      setModal({
        title: tx('Reject Credential Submission'),
        description: tx('Provide a clear reason so the practitioner can upload corrected evidence.'),
        tone: 'danger',
        inputLabel: tx('Rejection Reason *'),
        inputPlaceholder: tx('e.g. Certificate expired or illegible scan'),
        confirmLabel: tx('Reject Submission'),
        onConfirm: async (note) => {
          const d = await jreq(`/api/admin/${kind}/${id}/review`, 'POST', { decision, note });
          say(d.status === 'success' ? 'Recorded.' : d.message);
          load();
        },
      });
      return;
    }
    const d = await jreq(`/api/admin/${kind}/${id}/review`, 'POST', { decision, note: '' });
    say(d.status === 'success' ? 'Recorded.' : d.message);
    load();
  };
  if (!data) return <p className="text-xs text-slate-500">{tx('Loading…')}</p>;
  const evidence = (id?: string | null) => id ? <a className="underline font-bold" href={`/api/documents/${id}/download`}>{tx('evidence')}</a> : <span className="text-slate-600">{tx('no evidence')}</span>;
  return (
    <div className="space-y-4">
      <AdminActionModal config={modal} onClose={() => setModal(null)} />
      <section className="bg-white border border-slate-200 p-4 space-y-2">
        <h3 className="text-sm font-extrabold">CPD entries to verify ({data.pendingCpd.length})</h3>
        {data.pendingCpd.map((e: any) => (
          <div key={e.id} className="flex flex-wrap justify-between gap-2 text-xs border-t border-slate-100 pt-2"><span><b>{e.professionalName}</b> · {e.title} · {e.points} pts · {e.activity_date} · {evidence(e.document_id)}</span>
            <span className="flex gap-3"><button className={`${btn} text-emerald-700`} onClick={() => decide('cpd', e.id, 'approved')}>{tx('Approve')}</button><button className={`${btn} text-rose-700`} onClick={() => decide('cpd', e.id, 'rejected')}>{tx('Reject')}</button></span></div>
        ))}
      </section>
      <section className="bg-white border border-slate-200 p-4 space-y-2">
        <h3 className="text-sm font-extrabold">Specialty certificates to verify ({data.pendingCerts.length})</h3>
        {data.pendingCerts.map((c: any) => (
          <div key={c.id} className="flex flex-wrap justify-between gap-2 text-xs border-t border-slate-100 pt-2"><span><b>{c.professionalName}</b> · {c.name} · {c.issuer} · {c.expiry_date ? `expires ${c.expiry_date}` : 'no expiry'} · {evidence(c.document_id)}</span>
            <span className="flex gap-3"><button className={`${btn} text-emerald-700`} onClick={() => decide('specialty-certs', c.id, 'approved')}>{tx('Approve')}</button><button className={`${btn} text-rose-700`} onClick={() => decide('specialty-certs', c.id, 'rejected')}>{tx('Reject')}</button></span></div>
        ))}
      </section>
      <section className="bg-white border border-slate-200 p-4">
        <h3 className="text-sm font-extrabold mb-2">CPD progress this year (target {data.target})</h3>
        <table className="w-full text-xs"><tbody>{data.compliance.map((c: any) => (
          <tr key={c.id} className="border-t border-slate-100"><td className="py-1.5">{c.name}</td><td className="tabular-nums font-bold">{c.points} pts</td><td className={c.points >= data.target ? 'text-emerald-700 font-bold' : 'text-amber-700'}>{c.points >= data.target ? 'on target' : `${(data.target - c.points).toFixed(1)} to go`}</td></tr>
        ))}</tbody></table>
      </section>
    </div>
  );
}
