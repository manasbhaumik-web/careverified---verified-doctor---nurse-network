import React, { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, ExternalLink, RefreshCw, Search } from 'lucide-react';

const jreq = (url: string, method = 'POST', body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const field = 'border border-slate-200 bg-white px-3 py-2 text-sm w-full focus:outline-none focus:border-[color:var(--t-600)]';
const lab = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1';
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

type Status = 'candidate' | 'approved' | 'rejected' | 'withdrawn';
const TABS: [Status, string][] = [['candidate', 'To review'], ['approved', 'Published'], ['rejected', 'Rejected'], ['withdrawn', 'Withdrawn']];

/** Admin review queue for medical literature pulled from PubMed. Nothing is public until approved here. */
export default function AdminLiterature() {
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
        setTab('candidate'); await load();
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
    <div className="space-y-5 text-slate-800">
      <section className="bg-white border border-[color:var(--t-200)] p-5 grid gap-4 xl:grid-cols-[1fr_auto] items-end">
        <form onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] items-end">
          <div>
            <label className={lab} htmlFor="lit-condition">Condition or topic</label>
            <input id="lit-condition" className={field} value={condition} onChange={e => setCondition(e.target.value)} placeholder="e.g. type 2 diabetes, asthma, hypertension" required minLength={3} maxLength={80} />
          </div>
          <div>
            <label className={lab} htmlFor="lit-years">Published within</label>
            <select id="lit-years" className={field} value={years} onChange={e => setYears(Number(e.target.value))}>
              {[1, 3, 5, 10].map(y => <option key={y} value={y}>{y} year{y === 1 ? '' : 's'}</option>)}
            </select>
          </div>
          <button disabled={busy} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-60 text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer inline-flex items-center gap-2">
            <Search className="h-4 w-4" /> {busy ? 'Searching…' : 'Search PubMed'}
          </button>
        </form>
        <button onClick={recheck} disabled={busy || !(counts.approved > 0)} className="border border-slate-200 text-xs font-bold px-4 py-2.5 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Re-check published papers for retractions
        </button>
        <p className="text-[11px] text-slate-500 xl:col-span-2">
          Only systematic reviews, meta-analyses, randomized trials, guidelines and reviews with an abstract are fetched, and retracted papers are skipped. Nothing is shown to the public until you approve it.
        </p>
      </section>

      <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold">Tracked topics</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">PubMed is searched for these every week and new papers join the review queue below. Nothing is published without your approval.</p>
          </div>
          <button onClick={runTopics} disabled={busy || topics.length === 0} className="border border-slate-200 text-xs font-bold px-4 py-2 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> Check topics now
          </button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {topics.length === 0 && <li className="text-xs text-slate-500">No topics tracked yet.</li>}
          {topics.map(t => (
            <li key={t.condition} className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <b>{t.condition}</b>
              <span className="text-slate-500">{t.lastRunAt ? `last run ${when(t.lastRunAt)}, +${t.lastAdded ?? 0}` : 'not run yet'}</span>
              <button onClick={() => removeTopic(t.condition)} aria-label={`Stop tracking ${t.condition}`} className="text-slate-400 hover:text-rose-700 cursor-pointer font-bold">×</button>
            </li>
          ))}
        </ul>
        <form onSubmit={addTopic} className="flex gap-2 max-w-md">
          <input className={field} value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Add a condition to track, e.g. asthma" minLength={3} maxLength={80} required aria-label="Condition to track" />
          <button className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-4 cursor-pointer shrink-0">Track</button>
        </form>
      </section>

      <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
        <div>
          <h3 className="text-sm font-extrabold">Condition fact sheets</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Plain-language overviews from MedlinePlus (U.S. National Library of Medicine). They appear on a condition's topic page in the library once you approve them. Use the same name as the library category, e.g. “diabetes”.</p>
        </div>
        <form onSubmit={fetchSheet} className="flex gap-2 max-w-md">
          <input className={field} value={sheetTopic} onChange={e => setSheetTopic(e.target.value)} placeholder="Condition, e.g. asthma" minLength={3} maxLength={80} required aria-label="Fact sheet topic" />
          <button disabled={busy} className="bg-[color:var(--t-600)] disabled:opacity-60 text-white text-xs font-extrabold px-4 cursor-pointer shrink-0">Fetch</button>
        </form>
        {sheets.length > 0 && (
          <ul className="grid gap-3 xl:grid-cols-2">
            {sheets.map(s => (
              <li key={s.id} className="border border-slate-200 p-4 space-y-2 text-xs min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-sm">{s.title}</b>
                  <span className={`font-bold uppercase text-[10px] px-2 py-0.5 border ${s.status === 'approved' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-slate-600 border-slate-200 bg-slate-50'}`}>{s.status} · {s.topic}</span>
                </div>
                <p className="text-slate-700 leading-relaxed line-clamp-4">{s.summary}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--t-700)] inline-flex items-center gap-1">Open on MedlinePlus <ExternalLink className="h-3 w-3" /></a>
                <div className="flex gap-2 pt-1">
                  {s.status !== 'approved' && <button onClick={() => sheetAct(s.id, 'approve')} className="bg-[color:var(--t-600)] text-white font-extrabold px-3 py-1.5 cursor-pointer">Approve &amp; publish</button>}
                  {s.status === 'candidate' && <button onClick={() => sheetAct(s.id, 'reject')} className="border border-slate-200 font-bold px-3 py-1.5 cursor-pointer">Reject</button>}
                  {s.status === 'approved' && <button onClick={() => sheetAct(s.id, 'unpublish')} className="border border-slate-200 font-bold px-3 py-1.5 cursor-pointer">Unpublish</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {msg && <p role="status" className={`text-xs font-bold p-2.5 border ${msg.ok ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([id, text]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-3 py-2.5 text-xs font-bold cursor-pointer ${tab === id ? 'border-b-2 border-[color:var(--t-600)] text-[color:var(--t-700)]' : 'text-slate-500'}`}>
            {text} <span className="tabular-nums text-slate-400">({counts[id] ?? 0})</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="bg-white border border-slate-200 p-8 text-sm text-slate-500 text-center flex flex-col items-center gap-2">
          <BookOpenCheck className="h-8 w-8 text-slate-300" />
          {tab === 'candidate' ? 'Nothing to review. Search PubMed for a condition to fill the queue.' : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 items-start">
          {items.map(p => (
            <article key={p.id} className="bg-white border border-slate-200 p-5 space-y-3 min-w-0">
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                <span className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 text-[color:var(--t-700)]">{p.condition}</span>
                {p.pubTypes.filter((t: string) => ['Systematic Review', 'Meta-Analysis', 'Randomized Controlled Trial', 'Practice Guideline', 'Guideline', 'Review'].includes(t)).map((t: string) => (
                  <span key={t} className="bg-slate-50 border border-slate-200 px-2 py-0.5">{t}</span>
                ))}
              </div>
              <h3 className="text-sm font-extrabold leading-snug">{p.title}</h3>
              <p className="text-xs text-slate-600">{p.authors} · <i>{p.journal}</i> · {p.pubDate} · PMID {p.pmid}{p.doi ? ` · doi:${p.doi}` : ''}</p>
              <p className={`text-xs text-slate-700 leading-relaxed whitespace-pre-line ${openId === p.id ? '' : 'line-clamp-4'}`}>{p.abstract}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="font-bold text-[color:var(--t-700)] cursor-pointer">{openId === p.id ? 'Show less' : 'Read full abstract'}</button>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--t-700)] inline-flex items-center gap-1">Open on PubMed <ExternalLink className="h-3 w-3" /></a>
                <span className="text-slate-400">Retraction check {when(p.retractionCheckedAt)}</span>
              </div>

              {p.status === 'candidate' && (
                <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-slate-100">
                  <div className="basis-full">
                    <label className={lab} htmlFor={`tk-${p.id}`}>Key takeaway for patients (required, plain language)</label>
                    <textarea id={`tk-${p.id}`} className={field} rows={2} maxLength={400} value={takeaway[p.id] ?? ''} onChange={e => setTakeaway({ ...takeaway, [p.id]: e.target.value })}
                      placeholder="e.g. Higher long-term blood sugar was linked to a greater chance of heart failure in people with type 2 diabetes." />
                    <p className="text-[11px] text-slate-500 mt-0.5">Say what the paper found, not what patients should do. Shown above the abstract. {(takeaway[p.id] ?? '').length}/400</p>
                    <label className={`${lab} mt-2`} htmlFor={`tkms-${p.id}`}>Bahasa Malaysia version (optional, written or checked by a Malay speaker)</label>
                    <textarea id={`tkms-${p.id}`} className={field} rows={2} maxLength={400} value={takeawayMs[p.id] ?? ''} onChange={e => setTakeawayMs({ ...takeawayMs, [p.id]: e.target.value })} />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className={lab} htmlFor={`cat-${p.id}`}>Library category</label>
                    <input id={`cat-${p.id}`} className={field} value={category[p.id] ?? p.condition} onChange={e => setCategory({ ...category, [p.id]: e.target.value })} maxLength={60} />
                  </div>
                  <button onClick={() => act(p.id, 'approve', { category: category[p.id] ?? p.condition, takeaway: takeaway[p.id] ?? '', takeawayMs: takeawayMs[p.id] ?? '' })} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-5 py-2.5 cursor-pointer">Approve &amp; publish</button>
                  <button onClick={() => act(p.id, 'reject', { note: window.prompt('Reason (optional)') ?? undefined })} className="border border-slate-200 text-xs font-bold px-4 py-2.5 cursor-pointer">Reject</button>
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
                  <button onClick={() => act(p.id, 'unpublish', { note: window.prompt('Reason (optional)') ?? undefined })} className="border border-slate-200 font-bold px-3 py-1.5 cursor-pointer">Unpublish</button>
                  </div>
                </div>
              )}
              {(p.status === 'rejected' || p.status === 'withdrawn') && p.adminNote && <p className="text-xs text-rose-700 pt-2 border-t border-slate-100">Note: {p.adminNote}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
