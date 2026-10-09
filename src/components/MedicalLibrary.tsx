import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Bookmark, BookOpen, Check, ExternalLink, Flag, Printer, Search, Send, ShieldCheck, X } from 'lucide-react';
import { Article, DoctorProfile, NurseProfile } from '../types';
import DashboardHeader, { BannerKpis } from './DashboardHeader';

interface MedicalLibraryProps {
  articles: Article[];
  professionals?: (DoctorProfile | NurseProfile)[];
  /** True for signed-in practitioners: shows "Recommend to a patient". */
  canRecommend?: boolean;
  /** Sends the reader to Help with a draft ticket about this article. */
  onReportProblem?: (article: Article) => void;
  /** Opens the directory, optionally filtered to a specialty. */
  onFindDoctor: (specialty?: string) => void;
}

const ALL = 'All articles';

type SourceFilter = 'all' | 'practitioner' | 'research';
type SortKey = 'newest' | 'oldest' | 'evidence';

/** Topic keywords mapped to the directory's specialty names. A match is only used if such a practitioner exists. */
const SPECIALTY_KEYWORDS: [RegExp, string][] = [
  [/heart|cardi|hypertens|blood pressure|atrial|coronary/i, 'Cardiolog'],
  [/skin|derma|eczema|psoria|acne/i, 'Dermatolog'],
  [/stroke|migraine|epilep|neuro|parkinson|dementia|alzheimer/i, 'Neurolog'],
  [/child|paediatr|pediatr|infant|neonat/i, 'Pediatric'],
  [/elder|geriatr|older adult|ageing|aging/i, 'Geriatric'],
  [/sepsis|critical|intensive|icu|ventilat/i, 'ICU'],
  [/./, 'General'],
];

const specialtyFor = (a: Article, pros: (DoctorProfile | NurseProfile)[] = []): string | null => {
  const text = `${a.category} ${a.title}`;
  for (const [re, term] of SPECIALTY_KEYWORDS) {
    if (!re.test(text)) continue;
    const hit = pros.find(p => p.specialization.toLowerCase().includes(term.toLowerCase()));
    if (hit) return hit.specialization;
  }
  return null;
};

const LEVEL_RANK = { high: 3, moderate: 2, info: 1 } as const;
const evidenceRank = (a: Article) => (a.evidence ? LEVEL_RANK[a.evidence.level] : 0);
const dateValue = (a: Article) => { const t = Date.parse(a.date); return Number.isNaN(t) ? 0 : t; };

const readingMinutes = (a: Article) => Math.max(1, Math.round(`${a.excerpt} ${a.content}`.split(/\s+/).length / 200));

/** Everyday words people search with, mapped to the terms articles use. */
const SYNONYMS: Record<string, string[]> = {
  sugar: ['diabetes', 'glycaemic', 'glucose'],
  'high blood pressure': ['hypertension'],
  bp: ['hypertension', 'blood pressure'],
  'heart attack': ['myocardial', 'cardiac', 'coronary'],
  flu: ['influenza'],
  cholesterol: ['lipid', 'statin'],
  kidney: ['renal', 'nephro'],
  stomach: ['gastric', 'gastro'],
  'skin rash': ['dermat', 'eczema'],
  stroke: ['cerebrovascular'],
  cancer: ['oncolog', 'tumour', 'tumor', 'carcinoma'],
  asthma: ['bronch', 'respiratory'],
  depression: ['depressive', 'mental health'],
  pregnancy: ['pregnan', 'obstetric', 'maternal'],
};
const expandQuery = (q: string): string[] => {
  const base = q.trim().toLowerCase();
  if (!base) return [];
  const out = new Set([base]);
  for (const [word, alts] of Object.entries(SYNONYMS)) {
    if (base.includes(word) || alts.some(a => base.includes(a))) { out.add(word); alts.forEach(a => out.add(a)); }
  }
  return [...out];
};

const readSaved = (): string[] => {
  try { return JSON.parse(localStorage.getItem('saved_articles') || '[]'); } catch { return []; }
};

function EvidenceBadge({ article }: { article: Article }) {
  if (!article.evidence) {
    return <span className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-0.5">Practitioner article</span>;
  }
  const tone = article.evidence.level === 'high'
    ? 'text-[color:var(--e-800)] bg-[color:var(--e-50)] border-[color:var(--e-200)]'
    : article.evidence.level === 'moderate'
      ? 'text-[color:var(--t-700)] bg-[color:var(--t-50)] border-[color:var(--t-200)]'
      : 'text-slate-700 bg-slate-50 border-slate-200';
  return <span className={`text-[11px] font-bold border px-2.5 py-0.5 ${tone}`} title="Strength of evidence, from the paper's publication type">{article.evidence.label}</span>;
}

function Takeaway({ text, ms, className = '' }: { text?: string | null; ms?: string | null; className?: string }) {
  const [lang, setLang] = useState<'en' | 'ms'>('en');
  if (!text) return null;
  const shown = lang === 'ms' && ms ? ms : text;
  return (
    <div className={`bg-[color:var(--t-50)] border-l-4 border-[color:var(--t-600)] px-3 py-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[color:var(--t-700)]">{lang === 'ms' ? 'Intipati utama' : 'Key takeaway'}</p>
        {ms && (
          <span role="group" aria-label="Language" className="inline-flex text-[10px] font-bold">
            {([['en', 'EN'], ['ms', 'BM']] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={lang === id} onClick={() => setLang(id)}
                className={`px-1.5 py-0.5 border border-[color:var(--t-200)] cursor-pointer ${lang === id ? 'bg-[color:var(--t-600)] text-white' : 'bg-white text-[color:var(--ink)]'}`}>{label}</button>
            ))}
          </span>
        )}
      </div>
      <p lang={lang === 'ms' ? 'ms' : 'en'} className="text-[13px] text-[color:var(--ink)] leading-snug mt-0.5">{shown}</p>
    </div>
  );
}

const initialsOf = (name: string) =>
  name.replace('Dr. ', '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

function AuthorBadge({ article, large = false }: { article: Article; large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {article.authorAvatar ? (
        <img
          src={article.authorAvatar}
          alt=""
          className={`${large ? 'h-10 w-10' : 'h-9 w-9'} rounded-full object-cover border border-[color:var(--t-200)] shrink-0`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-[color:var(--e-50)] text-[color:var(--e-800)] flex items-center justify-center text-xs font-bold shrink-0">
          {initialsOf(article.authorName)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[color:var(--ink)] truncate">{article.authorName}</p>
        <p className="text-xs text-[color:var(--ink-2)] truncate">
          {article.authorTitle}
          {article.authorCredentialsVerified !== false && <span className="text-[color:var(--e-700)] font-semibold"> · Verified</span>}
        </p>
      </div>
    </div>
  );
}

export default function MedicalLibrary({ articles, professionals = [], onFindDoctor, onReportProblem, canRecommend = false }: MedicalLibraryProps) {
  const isPractitioner = canRecommend;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [source, setSource] = useState<SourceFilter>('all');
  const [evidence, setEvidence] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [onlySaved, setOnlySaved] = useState(false);
  const [factSheets, setFactSheets] = useState<{ topic: string; title: string; summary: string; url: string }[]>([]);
  useEffect(() => {
    fetch('/api/fact-sheets').then(r => r.json()).then(d => d.status === 'success' && setFactSheets(d.data)).catch(() => {});
  }, []);

  // Practitioners can recommend the open article to a patient they have treated.
  const [recOpen, setRecOpen] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [recPatient, setRecPatient] = useState('');
  const [recNote, setRecNote] = useState('');
  const [recMsg, setRecMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!recOpen || patients.length) return;
    fetch('/api/practitioner/my-patients').then(r => r.json()).then(d => d.status === 'success' && setPatients(d.data)).catch(() => {});
  }, [recOpen, patients.length]);
  useEffect(() => { setRecOpen(false); setRecMsg(null); setRecNote(''); }, [openArticle?.id]);
  const sendRecommendation = async () => {
    if (!openArticle || !recPatient) return;
    const d = await fetch(`/api/articles/${encodeURIComponent(openArticle.id)}/recommend`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientUserId: recPatient, note: recNote }),
    }).then(r => r.json()).catch(() => null);
    setRecMsg({ ok: d?.status === 'success', text: d?.status === 'success' ? 'Sent. The patient will see it on their dashboard.' : d?.message || 'Could not send.' });
    if (d?.status === 'success') { setRecNote(''); setRecPatient(''); }
  };

  // Open an article handed over by another page (e.g. the patient dashboard's recommended reading).
  useEffect(() => {
    let id: string | null = null;
    try { id = sessionStorage.getItem('open_article'); if (id) sessionStorage.removeItem('open_article'); } catch { /* ignore */ }
    const hit = id ? articles.find(a => a.id === id) : null;
    if (hit) setOpenArticle(hit);
  }, [articles]);

  const toggleSaved = (id: string) => {
    const next = savedIds.includes(id) ? savedIds.filter(x => x !== id) : [...savedIds, id];
    setSavedIds(next);
    try { localStorage.setItem('saved_articles', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach(a => counts.set(a.category, (counts.get(a.category) || 0) + 1));
    return Array.from(counts.entries());
  }, [articles]);

  const evidenceLabels = useMemo(() => Array.from(new Set(articles.map(a => a.evidence?.label).filter(Boolean) as string[])), [articles]);
  const hasResearch = evidenceLabels.length > 0;

  const filtered = articles.filter(a => {
    const terms = expandQuery(query);
    const hay = `${a.title} ${a.excerpt} ${a.takeaway ?? ''} ${a.authorName} ${a.category}`.toLowerCase();
    const matchesQuery = terms.length === 0 || terms.some(t => hay.includes(t));
    const matchesSource = source === 'all' || (source === 'research' ? !!a.source : !a.source);
    const matchesEvidence = evidence === 'all' || a.evidence?.label === evidence;
    return matchesQuery && matchesSource && matchesEvidence && (!onlySaved || savedIds.includes(a.id)) && (category === ALL || a.category === category);
  }).sort((a, b) => {
    if (sort === 'evidence') return evidenceRank(b) - evidenceRank(a) || dateValue(b) - dateValue(a);
    return sort === 'oldest' ? dateValue(a) - dateValue(b) : dateValue(b) - dateValue(a);
  });

  const related = openArticle
    ? articles.filter(a => a.id !== openArticle.id && a.category === openArticle.category).slice(0, 3)
    : [];

  // Topic page: shown when a category is chosen.
  const hubSheet = category === ALL ? null : factSheets.find(f => { const c = category.toLowerCase(); return c.includes(f.topic) || f.topic.includes(c); }) ?? null;
  const hubSpecialty = category === ALL ? null : specialtyFor({ category, title: '' } as Article, professionals);
  const hubSpecialists = hubSpecialty ? professionals.filter(p => p.specialization === hubSpecialty).slice(0, 3) : [];
  const hubArticles = category === ALL ? [] : articles.filter(a => a.category === category);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="w-full space-y-6" id="medical-library-section">
      <DashboardHeader
        icon={BookOpen}
        eyebrow="Verified Medical Library"
        title="Clinical Articles & Published Research"
        description="Articles by credential-checked practitioners, plus peer-reviewed papers from PubMed that our medical board has approved. Every item lists its sources."
        actions={
          <BannerKpis items={[
            { value: articles.length, label: 'Articles' },
            { value: articles.filter(a => a.source).length, label: 'Research papers' },
            { value: categories.length, label: 'Topics' },
          ]} />
        }
      />

      {/* Search + categories */}
      <section aria-label="Find articles" className="bg-white border border-[color:var(--t-200)] shadow-xs px-5 py-4 space-y-3.5">
        <label htmlFor="library-search" className="sr-only">Search articles</label>
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] flex items-center gap-2.5 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] px-3.5 min-h-[48px] focus-within:border-[color:var(--t-600)]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            id="library-search"
            type="text"
            placeholder="Search by condition, topic or author (try “sugar” or “high blood pressure”)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder-slate-500"
          />
        </div>
        <button type="button" aria-pressed={onlySaved} onClick={() => setOnlySaved(v => !v)}
          className={`min-h-[48px] px-4 text-[13px] font-semibold border inline-flex items-center gap-2 cursor-pointer ${onlySaved ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white' : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'}`}>
          <Bookmark className="h-4 w-4" /> Saved ({savedIds.length})
        </button>
        </div>
        {hasResearch && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-1">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Source">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mr-1">Source</span>
              {([['all', 'All'], ['practitioner', 'Practitioner articles'], ['research', 'Research papers']] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={source === id} onClick={() => { setSource(id); if (id === 'practitioner') setEvidence('all'); }}
                  className={`min-h-[34px] px-3 text-xs font-semibold border cursor-pointer ${source === id ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white' : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'}`}>{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Type of evidence">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mr-1">Evidence</span>
              {['all', ...evidenceLabels].map(l => (
                <button key={l} type="button" aria-pressed={evidence === l} onClick={() => { setEvidence(l); if (l !== 'all') setSource('research'); }}
                  className={`min-h-[34px] px-3 text-xs font-semibold border cursor-pointer ${evidence === l ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white' : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'}`}>{l === 'all' ? 'Any' : l}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 ml-auto">
              Sort
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="border border-[color:var(--t-200)] bg-white px-2 min-h-[34px] text-xs font-semibold normal-case tracking-normal text-[color:var(--ink)]">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="evidence">Strongest evidence</option>
              </select>
            </label>
          </div>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          {[ALL, ...categories.map(([c]) => c)].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`min-h-[40px] px-4 text-[13px] font-semibold border transition-colors cursor-pointer ${
                category === c
                  ? 'bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white'
                  : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_640px] min-w-0 space-y-6">
          {category !== ALL && (
            <section aria-label={`${category} topic page`} className="bg-white border border-[color:var(--t-200)] border-t-[3px] border-t-[color:var(--t-600)] p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[color:var(--t-700)]">Topic</p>
                  <h2 className="text-xl font-bold text-[color:var(--ink)] leading-tight">{category}</h2>
                  <p className="text-xs text-slate-600 mt-1">{hubArticles.length} article{hubArticles.length === 1 ? '' : 's'} in this topic{hubArticles.some(a => a.source) ? `, ${hubArticles.filter(a => a.source).length} research paper${hubArticles.filter(a => a.source).length === 1 ? '' : 's'}` : ''}</p>
                </div>
                <button type="button" onClick={() => setCategory(ALL)} className="text-xs font-bold text-[color:var(--t-700)] cursor-pointer">← All topics</button>
              </div>
              {hubSheet && (
                <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-4 space-y-2">
                  <h3 className="text-sm font-bold">About this condition</h3>
                  <p className="text-[13px] leading-relaxed text-[color:var(--ink-2)]">{hubSheet.summary}</p>
                  <a href={hubSheet.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[color:var(--t-700)] inline-flex items-center gap-1 hover:underline">
                    Read more on MedlinePlus (U.S. National Library of Medicine) <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {hubSpecialty && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate-600">Specialists: {hubSpecialists.length ? hubSpecialists.map(p => p.name).join(', ') : hubSpecialty}</span>
                  <button type="button" onClick={() => onFindDoctor(hubSpecialty)} className="min-h-[36px] px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer">Find a {hubSpecialty}</button>
                </div>
              )}
            </section>
          )}
          {!featured ? (
            <div className="bg-white border border-[color:var(--t-200)] p-12 text-center space-y-3">
              <BookOpen className="h-12 w-12 text-[color:var(--t-200)] mx-auto" />
              <h3 className="text-sm font-bold text-[color:var(--ink)]">{onlySaved ? 'No saved articles match' : 'No articles match your search'}</h3>
              <p className="text-[13px] text-slate-600">{onlySaved ? 'Open an article and tap Save to keep it here.' : 'Try a different keyword or category.'}</p>
            </div>
          ) : (
            <>
              {/* Featured article */}
              <article className="bg-white border border-[color:var(--t-200)] shadow-xs hover:shadow-md hover:border-[color:var(--t-300)] transition-all flex flex-wrap">
                <div className="flex-[1_1_240px] min-h-[200px] bg-[color:var(--t-50)] border-b md:border-b-0 md:border-r border-[color:var(--t-200)] flex items-center justify-center">
                  <div className="h-[72px] w-[72px] bg-[color:var(--t-600)] text-white flex items-center justify-center">
                    <BookOpen className="h-8 w-8" />
                  </div>
                </div>
                <div className="flex-[2_1_380px] p-6 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[color:var(--t-600)] px-2.5 py-1">Featured</span>
                    <span className="text-[11px] font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-0.5">{featured.category}</span>
                    <EvidenceBadge article={featured} />
                    <span className="text-xs text-slate-600">{featured.date} · {readingMinutes(featured)} min read</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[color:var(--ink)] leading-snug">{featured.title}</h2>
                  <Takeaway text={featured.takeaway} ms={featured.takeawayMs} />
                  <p className="text-sm text-[color:var(--ink-2)] leading-relaxed line-clamp-4">{featured.excerpt}</p>
                  <div className="mt-auto pt-4 border-t border-[color:var(--t-100)] flex flex-wrap items-center justify-between gap-3">
                    <AuthorBadge article={featured} large />
                    <button
                      type="button"
                      onClick={() => setOpenArticle(featured)}
                      className="min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      Read article <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[color:var(--ink)]">Latest articles</h2>
                <span className="text-[13px] text-slate-600">Showing {filtered.length} article{filtered.length === 1 ? '' : 's'}</span>
              </div>

              <section aria-label="Articles" className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {rest.map(art => (
                  <article key={art.id} className="bg-white border border-[color:var(--t-200)] shadow-xs hover:shadow-md hover:border-[color:var(--t-300)] transition-all p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-0.5">{art.category}</span>
                      <span className="text-xs text-slate-600">{art.date}</span>
                    </div>
                    <div><EvidenceBadge article={art} /></div>
                    <h3 className="text-[17px] font-bold text-[color:var(--ink)] leading-snug">{art.title}</h3>
                    <Takeaway text={art.takeaway} ms={art.takeawayMs} />
                    <p className={`text-[13px] text-[color:var(--ink-2)] leading-relaxed ${art.takeaway ? 'line-clamp-2' : 'line-clamp-3'}`}>{art.excerpt}</p>
                    <div className="mt-auto pt-3.5 border-t border-[color:var(--t-100)] flex flex-wrap items-center justify-between gap-2">
                      <AuthorBadge article={art} />
                      <span className="text-xs text-slate-600">{readingMinutes(art)} min read{art.citations?.length > 0 ? ` · ${art.citations.length} citation${art.citations.length === 1 ? '' : 's'}` : ''}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenArticle(art)}
                      className="min-h-[44px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--ink)] text-[13px] font-semibold cursor-pointer"
                    >
                      Read article
                    </button>
                  </article>
                ))}
              </section>
            </>
          )}
        </div>

        {/* Side rail */}
        <aside aria-label="Library information" className="flex-[1_1_300px] max-w-full xl:max-w-[380px] min-w-0 space-y-6">
          <section className="bg-white border border-[color:var(--t-200)] shadow-xs p-5">
            <h2 className="text-base font-bold text-[color:var(--ink)] mb-3">Browse by category</h2>
            <ul>
              {categories.map(([c, n]) => (
                <li key={c} className="border-b border-[color:var(--t-100)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setCategory(c)}
                    className="w-full min-h-[44px] flex items-center justify-between text-sm font-medium text-[color:var(--ink)] hover:text-[color:var(--t-600)] cursor-pointer"
                  >
                    <span>{c}</span>
                    <span className="text-xs font-semibold text-slate-600 bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 tabular-nums">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-[color:var(--e-50)] border border-[color:var(--e-200)] p-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[color:var(--e-600)]" />
              <h2 className="text-base font-bold text-[color:var(--e-800)]">How articles are verified</h2>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[color:var(--e-800)]">
              Practitioner articles are written by authors checked against MMC and LJM registries. Research papers come from PubMed, are limited to reviews, trials and guidelines, are screened for retraction, and only appear after our medical board approves them. Each item links to its source so you can confirm the evidence yourself.
            </p>
          </section>

          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
            <h2 className="text-base font-bold text-[color:var(--ink)]">Need to speak to a clinician?</h2>
            <p className="text-[13px] leading-relaxed text-[color:var(--ink-2)]">Articles are for education. For personal medical advice, book a consultation.</p>
            <button
              type="button"
              onClick={() => onFindDoctor()}
              className="w-full min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold transition-colors cursor-pointer"
            >
              Find a doctor
            </button>
          </section>
        </aside>
      </div>

      {/* Article reader */}
      {openArticle && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setOpenArticle(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={openArticle.title}
            className="print-article bg-white border border-[color:var(--t-200)] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] p-5 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-[color:var(--t-700)] bg-white border border-[color:var(--t-200)] px-2.5 py-0.5">{openArticle.category}</span>
                  <EvidenceBadge article={openArticle} />
                  <span className="text-xs text-slate-600">{openArticle.date}</span>
                </div>
                <h2 className="text-xl font-bold text-[color:var(--ink)] leading-snug">{openArticle.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenArticle(null)}
                aria-label="Close article"
                className="h-11 w-11 shrink-0 flex items-center justify-center text-slate-600 hover:text-[color:var(--t-600)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-[color:var(--ink)]">
              <div className="flex items-center gap-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3.5">
                <AuthorBadge article={openArticle} large />
                <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--e-800)] bg-[color:var(--e-50)] border border-[color:var(--e-200)] px-2 py-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-[color:var(--e-600)]" /> {openArticle.source ? 'PubMed paper · board-approved' : 'Verified & accredited'}
                </span>
              </div>

              <Takeaway text={openArticle.takeaway} ms={openArticle.takeawayMs} />
              <div className="text-sm leading-relaxed text-[color:var(--ink-2)] whitespace-pre-line">{openArticle.content}</div>

              {openArticle.source?.approvedAt && (
                <p className="text-xs text-slate-600 flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[color:var(--e-600)]" /> Approved for this library by the medical board on {new Date(openArticle.source.approvedAt).toLocaleDateString()}.</p>
              )}
              {openArticle.source && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <a href={openArticle.source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--t-700)] inline-flex items-center gap-1 hover:underline">Read the full paper on PubMed <ExternalLink className="h-3 w-3" /></a>
                  {openArticle.source.doi && <a href={`https://doi.org/${openArticle.source.doi}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[color:var(--t-700)] inline-flex items-center gap-1 hover:underline">Publisher (DOI) <ExternalLink className="h-3 w-3" /></a>}
                  {openArticle.source.retractionCheckedAt && <span className="text-slate-500">Checked for retraction {new Date(openArticle.source.retractionCheckedAt).toLocaleDateString()}</span>}
                </div>
              )}

              {openArticle.citations?.length > 0 && (
                <section className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-4 space-y-2">
                  <h3 className="text-sm font-bold text-[color:var(--ink)]">{openArticle.source ? 'Source' : 'Peer-reviewed citations'}</h3>
                  <ol className="list-decimal list-inside space-y-1 text-[13px] text-[color:var(--ink-2)] leading-relaxed">
                    {openArticle.citations.map((cit, idx) => <li key={idx}>{cit}</li>)}
                  </ol>
                </section>
              )}

              {openArticle.faq?.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-bold text-[color:var(--ink)]">Patient FAQs</h3>
                  {openArticle.faq.map((f, idx) => (
                    <details key={idx} className="group border border-[color:var(--t-200)] bg-white">
                      <summary className="min-h-[44px] px-4 py-3 text-[13px] font-semibold text-[color:var(--ink)] flex justify-between items-center cursor-pointer list-none">
                        {f.question}
                        <span className="text-[color:var(--t-600)] font-bold ml-3 group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <p className="px-4 pb-4 text-[13px] leading-relaxed text-[color:var(--ink-2)] border-t border-[color:var(--t-100)] pt-3">{f.answer}</p>
                    </details>
                  ))}
                </section>
              )}
            </div>

            {isPractitioner && recOpen && (
              <div className="no-print border-t border-[color:var(--t-200)] px-6 py-4 shrink-0 bg-white space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Recommend to a patient</h3>
                {patients.length === 0 ? (
                  <p className="text-xs text-slate-500">You have no patients yet. You can recommend articles to people you have treated.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[220px_1fr_auto] items-start">
                    <select value={recPatient} onChange={e => setRecPatient(e.target.value)} aria-label="Patient" className="border border-slate-200 bg-white px-3 py-2 text-sm">
                      <option value="">Choose a patient…</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input value={recNote} onChange={e => setRecNote(e.target.value)} maxLength={300} placeholder="Optional note, e.g. “Read this before our follow-up”" aria-label="Note" className="border border-slate-200 px-3 py-2 text-sm" />
                    <button type="button" onClick={sendRecommendation} disabled={!recPatient} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-4 py-2.5 cursor-pointer">Send</button>
                  </div>
                )}
                {recMsg && <p role="status" className={`text-xs font-bold ${recMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{recMsg.text}</p>}
              </div>
            )}

            {related.length > 0 && (
              <div className="no-print border-t border-[color:var(--t-200)] px-6 py-4 shrink-0 bg-[color:var(--t-bg)]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Related articles</h3>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {related.map(r => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setOpenArticle(r)} className="w-full text-left bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] p-2.5 cursor-pointer">
                        <span className="block text-[11px] text-slate-500">{r.category}</span>
                        <span className="text-[13px] font-semibold leading-snug line-clamp-2">{r.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="no-print border-t border-[color:var(--t-200)] p-4 flex flex-wrap gap-2.5 items-center shrink-0 bg-white">
              <button type="button" onClick={() => toggleSaved(openArticle.id)} aria-pressed={savedIds.includes(openArticle.id)}
                className="min-h-[44px] px-4 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer">
                <Bookmark className={`h-4 w-4 ${savedIds.includes(openArticle.id) ? 'fill-current text-[color:var(--t-600)]' : ''}`} /> {savedIds.includes(openArticle.id) ? 'Saved' : 'Save'}
              </button>
              <button type="button" onClick={() => window.print()} className="min-h-[44px] px-4 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer">
                <Printer className="h-4 w-4" /> Print
              </button>
              {isPractitioner && (
                <button type="button" onClick={() => setRecOpen(v => !v)} aria-expanded={recOpen} className="min-h-[44px] px-4 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer">
                  <Send className="h-4 w-4" /> Recommend to a patient
                </button>
              )}
              {onReportProblem && (
                <button type="button" onClick={() => { const a = openArticle; setOpenArticle(null); onReportProblem(a); }} className="min-h-[44px] px-4 text-[13px] font-semibold text-slate-600 hover:text-rose-700 inline-flex items-center gap-2 cursor-pointer">
                  <Flag className="h-4 w-4" /> Report a problem
                </button>
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setOpenArticle(null)}
                className="min-h-[44px] px-5 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)] text-[color:var(--ink)] text-[13px] font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { const sp = specialtyFor(openArticle, professionals); setOpenArticle(null); onFindDoctor(sp ?? undefined); }}
                className="min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-[13px] font-bold cursor-pointer"
              >
                {(() => { const sp = specialtyFor(openArticle, professionals); return sp ? `Find a ${sp}` : 'Find a doctor'; })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
