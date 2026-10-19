import React, { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, ExternalLink, RefreshCw, Search, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

const jreq = (url: string, method = 'POST', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const field = 'border border-slate-200 bg-white px-3 py-2 text-sm w-full focus:outline-none focus:border-[color:var(--t-600)]';
const lab = 'text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1';
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export type LitSubTab = 'queue' | 'factsheets' | 'discovery';

export const LIT_SUBS: { id: LitSubTab; label: string }[] = [
  { id: 'queue', label: 'Research Papers Queue' },
  { id: 'factsheets', label: 'MedlinePlus Fact Sheets' },
  { id: 'discovery', label: 'PubMed Discovery & Topic Sync' },
];

export interface AdminLiteratureProps {
  activeSub?: LitSubTab;
  onSubChange?: (sub: LitSubTab) => void;
  hideHeaderTabs?: boolean;
}

type Status = 'candidate' | 'approved' | 'rejected' | 'withdrawn';
const TABS: [Status, string][] = [['candidate', 'To review'], ['approved', 'Published'], ['rejected', 'Rejected'], ['withdrawn', 'Withdrawn']];

/** Admin review queue for medical literature pulled from PubMed. Nothing is public until approved here. */
export default function AdminLiterature({
  activeSub,
  onSubChange,
  hideHeaderTabs = false,
}: AdminLiteratureProps = {}) {
  const [internalSub, setInternalSub] = useState<LitSubTab>('queue');
  const sub = activeSub ?? internalSub;
  const setSub = (newSub: LitSubTab) => {
    if (onSubChange) onSubChange(newSub);
    else setInternalSub(newSub);
  };

  const [tab, setTab] = useState<Status>('candidate');
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [condition, setCondition] = useState('');
  const [years, setYears] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<Record<string, string>>({});
  const [takeaway, setTakeaway] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ condition: string; years: number; lastRunAt: string | null; lastAdded: number | null }[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [sheets, setSheets] = useState<any[]>([]);
  const [sheetTopic, setSheetTopic] = useState('');
  const [takeawayMs, setTakeawayMs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const d = await fetch(`/api/admin/literature?status=${tab}`).then(r => r.json());
    if (d.status === 'success') { setItems(d.data.items); setCounts(d.data.counts); }
  }, [tab]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const loadTopics = useCallback(async () => {
    const d = await fetch('/api/admin/literature/topics').then(r => r.json());
    if (d.status === 'success') setTopics(d.data);
  }, []);
  useEffect(() => { loadTopics().catch(() => {}); }, [loadTopics]);

  const loadSheets = useCallback(async () => {
    const d = await fetch('/api/admin/literature/factsheets').then(r => r.json());
    if (d.status === 'success') setSheets(d.data);
  }, []);
  useEffect(() => { loadSheets().catch(() => {}); }, [loadSheets]);

  const fetchSheet = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const d = await jreq('/api/admin/literature/factsheets/fetch', 'POST', { topic: sheetTopic });
    if (d.status === 'success') { setSheetTopic(''); setMsg({ ok: true, text: 'Fetched from MedlinePlus. Review it below before publishing.' }); loadSheets(); } else setMsg({ ok: false, text: d.message });
    setBusy(false);
  };
  const sheetAct = async (id: string, action: 'approve' | 'reject' | 'unpublish') => {
    const d = await jreq(`/api/admin/literature/factsheets/${id}/${action}`);
    setMsg({ ok: d.status === 'success', text: d.status === 'success' ? 'Updated.' : d.message });
    loadSheets();
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jreq('/api/admin/literature/topics', 'POST', { condition: newTopic });
    if (d.status === 'success') { setNewTopic(''); loadTopics(); } else setMsg({ ok: false, text: d.message });
  };
  const removeTopic = async (c: string) => { await jreq(`/api/admin/literature/topics/${encodeURIComponent(c)}`, 'DELETE'); loadTopics(); };
  const runTopics = async () => {
    setBusy(true); setMsg(null);
    const d = await jreq('/api/admin/literature/topics/run');
    setMsg({ ok: d.status === 'success', text: d.status === 'success' ? `Checked ${d.data.topics} topic${d.data.topics === 1 ? '' : 's'}: ${d.data.added} new paper${d.data.added === 1 ? '' : 's'} added to the queue.` : d.message });
    setBusy(false); loadTopics(); load();
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const d = await jreq('/api/admin/literature/search', 'POST', { condition, years, max: 15 });
      if (d.status === 'success') {
        setMsg({ ok: true, text: `PubMed returned ${d.data.found} papers: ${d.data.added} added to the queue, ${d.data.alreadyKnown} already known.` });
        setTab('candidate');
        setSub('queue');
        await load();
      } else setMsg({ ok: false, text: d.message });
    } catch { setMsg({ ok: false, text: 'Server connection error.' }); }
    setBusy(false);
  };

  const act = async (id: string, action: 'approve' | 'reject' | 'unpublish', body?: unknown) => {
    setMsg(null);
    const d = await jreq(`/api/admin/literature/${id}/${action}`, 'POST', body);
    setMsg({ ok: d.status === 'success', text: d.status === 'success' ? (action === 'approve' ? 'Published to the Medical Library.' : 'Updated.') : d.message });
    load();
  };

  const recheck = async () => {
    setBusy(true); setMsg(null);
    const d = await jreq('/api/admin/literature/recheck');
    setMsg({ ok: d.status === 'success', text: d.status === 'success' ? `Checked ${d.data.checked} published papers; ${d.data.withdrawn} withdrawn for retraction.` : d.message });
    setBusy(false); load();
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Standalone subtab fallback bar when not embedded */}
      {!hideHeaderTabs && (
        <div className="flex border-b border-slate-200 bg-white">
          {LIT_SUBS.map(s => (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                sub === s.id
                  ? 'border-[color:var(--t-600)] text-[color:var(--t-700)] bg-[color:var(--t-50)]/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Global alert feedback banner */}
      {msg && (
        <p role="status" className={`text-xs font-bold p-3 border rounded-none flex items-center justify-between ${
          msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs uppercase font-mono font-bold text-slate-500 hover:text-slate-800 cursor-pointer ml-4">Dismiss</button>
        </p>
      )}

      {/* SUBTAB 1: RESEARCH PAPERS MODERATION QUEUE */}
      {sub === 'queue' && (
        <div className="space-y-5">
          <div className="bg-white border border-[color:var(--t-200)] p-4 rounded-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">PubMed Clinical Studies Queue</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Approve, reject, or edit clinical summaries and takeaways before public display.</p>
            </div>
            <div role="tablist" className="flex flex-wrap items-center gap-1.5">
              {TABS.map(([id, text]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-none cursor-pointer transition-all border ${
                    tab === id
                      ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-none'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{text}</span>
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-none text-xs font-mono tabular-nums ${
                    tab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {counts[id] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 text-sm text-slate-500 text-center flex flex-col items-center justify-center gap-3 rounded-none">
              <BookOpenCheck className="h-10 w-10 text-slate-300" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">
                  {tab === 'candidate' ? 'No research papers waiting for review.' : `No ${tab} papers found.`}
                </h4>
                <p className="text-xs text-slate-500">
                  {tab === 'candidate' ? 'Use the PubMed Discovery tab to query new medical conditions into the queue.' : 'Papers will appear here once processed by moderators.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2 items-start">
              {items.map(p => (
                <article key={p.id} className="bg-white border border-slate-200 p-5 space-y-3 min-w-0 rounded-none shadow-none hover:border-[color:var(--t-200)] transition-colors">
                  <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                    <span className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 text-[color:var(--t-700)]">{p.condition}</span>
                    {p.pubTypes.filter((t: string) => ['Systematic Review', 'Meta-Analysis', 'Randomized Controlled Trial', 'Practice Guideline', 'Guideline', 'Review'].includes(t)).map((t: string) => (
                      <span key={t} className="bg-slate-50 border border-slate-200 px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                  <h3 className="text-sm font-extrabold leading-snug [overflow-wrap:anywhere] text-slate-900">{p.title}</h3>
                  <p className="text-xs text-slate-600 [overflow-wrap:anywhere]">{p.authors} · <i>{p.journal}</i> · {p.pubDate} · PMID {p.pmid}{p.doi ? ` · doi:${p.doi}` : ''}</p>
                  <p className={`text-xs text-slate-700 leading-relaxed whitespace-pre-line ${openId === p.id ? '' : 'line-clamp-4'}`}>{p.abstract}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="font-bold text-[color:var(--t-700)] cursor-pointer hover:underline">{openId === p.id ? 'Show less' : 'Read full abstract'}</button>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--t-700)] inline-flex items-center gap-1 hover:underline">Open on PubMed <ExternalLink className="h-3 w-3" /></a>
                    <span className="text-slate-400">Retraction check {when(p.retractionCheckedAt)}</span>
                  </div>

                  {p.status === 'candidate' && (
                    <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-slate-100">
                      <div className="basis-full">
                        <label className={lab} htmlFor={`tk-${p.id}`}>Key takeaway for patients (required, plain language)</label>
                        <textarea id={`tk-${p.id}`} className={field} rows={2} maxLength={400} value={takeaway[p.id] ?? ''} onChange={e => setTakeaway({ ...takeaway, [p.id]: e.target.value })}
                          placeholder="e.g. Higher long-term blood sugar was linked to a greater chance of heart failure in people with type 2 diabetes." />
                        <p className="text-xs text-slate-500 mt-0.5">Say what the paper found, not what patients should do. Shown above the abstract. {(takeaway[p.id] ?? '').length}/400</p>
                        <label className={`${lab} mt-2`} htmlFor={`tkms-${p.id}`}>Bahasa Malaysia version (optional, written or checked by a Malay speaker)</label>
                        <textarea id={`tkms-${p.id}`} className={field} rows={2} maxLength={400} value={takeawayMs[p.id] ?? ''} onChange={e => setTakeawayMs({ ...takeawayMs, [p.id]: e.target.value })} />
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className={lab} htmlFor={`cat-${p.id}`}>Library category</label>
                        <input id={`cat-${p.id}`} className={field} value={category[p.id] ?? p.condition} onChange={e => setCategory({ ...category, [p.id]: e.target.value })} maxLength={60} />
                      </div>
                      <button onClick={() => act(p.id, 'approve', { category: category[p.id] ?? p.condition, takeaway: takeaway[p.id] ?? '', takeawayMs: takeawayMs[p.id] ?? '' })} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Approve &amp; publish</button>
                      <button onClick={() => act(p.id, 'reject', { note: window.prompt('Reason (optional)') ?? undefined })} className="border border-slate-200 text-xs font-bold px-4 py-2.5 cursor-pointer hover:bg-slate-50">Reject</button>
                    </div>
                  )}
                  {p.status === 'approved' && (
                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-3">
                        <span className={lab}>Key takeaway</span>
                        {editing === p.id ? (
                          <div className="space-y-2">
                            <textarea className={field} rows={2} maxLength={400} value={takeaway[p.id] ?? p.takeaway ?? ''} onChange={e => setTakeaway({ ...takeaway, [p.id]: e.target.value })} aria-label="Key takeaway" />
                            <textarea className={field} rows={2} maxLength={400} placeholder="Bahasa Malaysia version (optional)" value={takeawayMs[p.id] ?? p.takeawayMs ?? ''} onChange={e => setTakeawayMs({ ...takeawayMs, [p.id]: e.target.value })} aria-label="Bahasa Malaysia takeaway" />
                            <div className="flex gap-2">
                              <button onClick={async () => { const d = await jreq(`/api/admin/literature/${p.id}/takeaway`, 'POST', { takeaway: takeaway[p.id] ?? p.takeaway ?? '', takeawayMs: takeawayMs[p.id] ?? p.takeawayMs ?? '' }); setMsg({ ok: d.status === 'success', text: d.status === 'success' ? 'Takeaway updated.' : d.message }); if (d.status === 'success') { setEditing(null); load(); } }} className="bg-[color:var(--t-600)] text-white font-extrabold px-3 py-1.5 cursor-pointer">Save</button>
                              <button onClick={() => setEditing(null)} className="border border-slate-200 font-bold px-3 py-1.5 cursor-pointer">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700">{p.takeaway || 'None yet.'} <button onClick={() => setEditing(p.id)} className="font-bold text-[color:var(--t-700)] cursor-pointer ml-1">Edit</button></p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-emerald-700 font-bold">Published in “{p.category}” · {when(p.reviewedAt)}</span>
                        <button onClick={() => act(p.id, 'unpublish', { note: window.prompt('Reason (optional)') ?? undefined })} className="border border-slate-200 font-bold px-3 py-1.5 cursor-pointer hover:bg-slate-50">Unpublish</button>
                      </div>
                    </div>
                  )}
                  {(p.status === 'rejected' || p.status === 'withdrawn') && p.adminNote && <p className="text-xs text-rose-700 pt-2 border-t border-slate-100">Note: {p.adminNote}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MEDLINEPLUS FACT SHEETS */}
      {sub === 'factsheets' && (
        <div className="space-y-6">
          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-4 rounded-none">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">MedlinePlus Condition Fact Sheets Ingestion</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Plain-language clinical condition overviews from the U.S. National Library of Medicine. They appear on the condition's guide page in MedCred once verified and approved.</p>
            </div>
            <form onSubmit={fetchSheet} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input className={field} value={sheetTopic} onChange={e => setSheetTopic(e.target.value)} placeholder="Enter medical condition topic (e.g. Asthma, Hypertension, Diabetes)" minLength={3} maxLength={80} required aria-label="Fact sheet topic" />
              <button disabled={busy} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 cursor-pointer shrink-0">
                {busy ? 'Fetching…' : 'Fetch Fact Sheet'}
              </button>
            </form>
          </section>

          {sheets.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 rounded-none">
              <FileText className="h-10 w-10 text-slate-300" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">No condition fact sheets in registry</h4>
                <p className="text-xs text-slate-500">Fetch a condition above using MedlinePlus integration to review and publish to the patient guides.</p>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 xl:grid-cols-2">
              {sheets.map(s => (
                <li key={s.id} className="bg-white border border-slate-200 p-5 space-y-3 text-xs min-w-0 rounded-none shadow-none hover:border-[color:var(--t-200)] transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <b className="text-sm font-black text-slate-900">{s.title}</b>
                    <span className={`font-black uppercase text-xs px-2.5 py-0.5 border rounded-none ${
                      s.status === 'approved' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-600 border-slate-200 bg-slate-50'
                    }`}>
                      {s.status} · {s.topic}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed line-clamp-4 font-semibold">{s.summary}</p>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--t-700)] inline-flex items-center gap-1 hover:underline">
                    Open on MedlinePlus <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    {s.status !== 'approved' && <button onClick={() => sheetAct(s.id, 'approve')} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider px-3.5 py-2 cursor-pointer">Approve &amp; publish</button>}
                    {s.status === 'candidate' && <button onClick={() => sheetAct(s.id, 'reject')} className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider px-3.5 py-2 cursor-pointer">Reject</button>}
                    {s.status === 'approved' && <button onClick={() => sheetAct(s.id, 'unpublish')} className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider px-3.5 py-2 cursor-pointer">Unpublish</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* SUBTAB 3: PUBMED DISCOVERY & AUTOMATED TOPIC SYNC */}
      {sub === 'discovery' && (
        <div className="space-y-6">
          <section className="bg-white border border-[color:var(--t-200)] p-5 grid gap-5 xl:grid-cols-[1fr_auto] items-end rounded-none">
            <form onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] items-end">
              <div>
                <label className={lab} htmlFor="lit-condition">Medical Condition or Research Topic</label>
                <input id="lit-condition" className={field} value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. Type 2 Diabetes, Paediatric Asthma, Hypertension" required minLength={3} maxLength={80} />
              </div>
              <div>
                <label className={lab} htmlFor="lit-years">Publication Window</label>
                <select id="lit-years" className={field} value={years} onChange={e => setYears(Number(e.target.value))}>
                  {[1, 3, 5, 10].map(y => <option key={y} value={y}>{y} year{y === 1 ? '' : 's'}</option>)}
                </select>
              </div>
              <button disabled={busy} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 cursor-pointer inline-flex items-center gap-2">
                <Search className="h-4 w-4" /> {busy ? 'Searching…' : 'Query PubMed'}
              </button>
            </form>
            <button onClick={recheck} disabled={busy || !(counts.approved > 0)} className="border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider px-4 py-2.5 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className="h-4 w-4 text-[color:var(--t-600)]" /> Retraction Monitor
            </button>
            <p className="text-xs text-slate-500 font-semibold xl:col-span-2">
              National Library of Medicine query filtering: Systematic reviews, meta-analyses, randomized clinical trials, and practice guidelines with abstracts are fetched. Retracted publications are automatically flagged.
            </p>
          </section>

          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-4 rounded-none">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Automated Topic Ingestion Watchlist</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">PubMed is polled weekly for these clinical conditions; incoming literature is routed to the Research Papers Queue for moderation.</p>
              </div>
              <button onClick={runTopics} disabled={busy || topics.length === 0} className="border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider px-4 py-2 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
                <RefreshCw className="h-4 w-4 text-[color:var(--t-600)]" /> Sync Watchlist Now
              </button>
            </div>

            <ul className="flex flex-wrap gap-2">
              {topics.length === 0 && <li className="text-xs text-slate-500 font-semibold py-2">No active conditions in automated watchlist.</li>}
              {topics.map(t => (
                <li key={t.condition} className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold rounded-none">
                  <b className="text-slate-800">{t.condition}</b>
                  <span className="text-slate-500 text-xs font-mono">{t.lastRunAt ? `last synced ${when(t.lastRunAt)}, +${t.lastAdded ?? 0}` : 'pending initial sync'}</span>
                  <button onClick={() => removeTopic(t.condition)} aria-label={`Stop tracking ${t.condition}`} className="text-slate-400 hover:text-rose-700 cursor-pointer font-bold text-sm">×</button>
                </li>
              ))}
            </ul>

            <form onSubmit={addTopic} className="flex gap-2 max-w-md pt-1">
              <input className={field} value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Add condition to track (e.g. Asthma, Glaucoma)" minLength={3} maxLength={80} required aria-label="Condition to track" />
              <button className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider px-5 cursor-pointer shrink-0">Track Condition</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
