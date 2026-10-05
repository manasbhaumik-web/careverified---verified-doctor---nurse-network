import React, { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, BookOpen, Check, Search, ShieldCheck, X } from 'lucide-react';
import { Article } from '../types';
import DashboardHeader from './DashboardHeader';

interface MedicalLibraryProps {
  articles: Article[];
  onFindDoctor: () => void;
}

const ALL = 'All articles';

const initialsOf = (name: string) =>
  name.replace('Dr. ', '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

function AuthorBadge({ article, large = false }: { article: Article; large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {article.authorAvatar ? (
        <img
          src={article.authorAvatar}
          alt=""
          className={`${large ? 'h-10 w-10' : 'h-9 w-9'} rounded-full object-cover border border-[#FECDD3] shrink-0`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center text-xs font-bold shrink-0">
          {initialsOf(article.authorName)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#1E293B] truncate">{article.authorName}</p>
        <p className="text-xs text-[#334155] truncate">
          {article.authorTitle}
          {article.authorCredentialsVerified !== false && <span className="text-[#047857] font-semibold"> · Verified</span>}
        </p>
      </div>
    </div>
  );
}

export default function MedicalLibrary({ articles, onFindDoctor }: MedicalLibraryProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach(a => counts.set(a.category, (counts.get(a.category) || 0) + 1));
    return Array.from(counts.entries());
  }, [articles]);

  const filtered = articles.filter(a => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.authorName.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q);
    return matchesQuery && (category === ALL || a.category === category);
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="w-full space-y-6" id="medical-library-section">
      <DashboardHeader
        eyebrow="Verified Medical Library"
        title="Clinical Articles by Verified Practitioners"
        description="Every article is written or reviewed by a credential-checked doctor or nurse, with citations you can follow."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold">
              <Check className="h-3.5 w-3.5 text-[#059669]" /> Practitioner-reviewed
            </span>
            <span className="inline-flex items-center min-h-[36px] px-3.5 bg-white border border-[#FECDD3] text-[#334155] text-xs font-semibold">
              Cited sources
            </span>
          </>
        }
      />

      {/* Search + categories */}
      <section aria-label="Find articles" className="bg-white border border-[#FECDD3] shadow-xs px-5 py-4 space-y-3.5">
        <label htmlFor="library-search" className="sr-only">Search articles</label>
        <div className="flex items-center gap-2.5 border border-[#FECDD3] bg-[#FFF8F9] px-3.5 min-h-[48px] focus-within:border-[#DC2626]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            id="library-search"
            type="text"
            placeholder="Search by condition, topic or author"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-[#1E293B] outline-none placeholder-slate-500"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          {[ALL, ...categories.map(([c]) => c)].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`min-h-[40px] px-4 text-[13px] font-semibold border transition-colors cursor-pointer ${
                category === c
                  ? 'bg-[#DC2626] border-[#DC2626] text-white'
                  : 'bg-white border-[#FECDD3] text-[#1E293B] hover:bg-[#FFE4E6]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_640px] min-w-0 space-y-6">
          {!featured ? (
            <div className="bg-white border border-[#FECDD3] p-12 text-center space-y-3">
              <BookOpen className="h-12 w-12 text-[#FECDD3] mx-auto" />
              <h3 className="text-sm font-bold text-[#1E293B]">No articles match your search</h3>
              <p className="text-[13px] text-slate-600">Try a different keyword or category.</p>
            </div>
          ) : (
            <>
              {/* Featured article */}
              <article className="bg-white border border-[#FECDD3] shadow-xs hover:shadow-md hover:border-[#FDA4AF] transition-all flex flex-wrap">
                <div className="flex-[1_1_240px] min-h-[200px] bg-[#FFF0F2] border-b md:border-b-0 md:border-r border-[#FECDD3] flex items-center justify-center">
                  <div className="h-[72px] w-[72px] bg-[#DC2626] text-white flex items-center justify-center">
                    <BookOpen className="h-8 w-8" />
                  </div>
                </div>
                <div className="flex-[2_1_380px] p-6 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white bg-[#DC2626] px-2.5 py-1">Featured</span>
                    <span className="text-[11px] font-bold text-[#B91C1C] bg-[#FFF0F2] border border-[#FECDD3] px-2.5 py-0.5">{featured.category}</span>
                    <span className="text-xs text-slate-600">{featured.date}</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] leading-snug">{featured.title}</h2>
                  <p className="text-sm text-[#334155] leading-relaxed">{featured.excerpt}</p>
                  <div className="mt-auto pt-4 border-t border-[#FFE4E6] flex flex-wrap items-center justify-between gap-3">
                    <AuthorBadge article={featured} large />
                    <button
                      type="button"
                      onClick={() => setOpenArticle(featured)}
                      className="min-h-[44px] px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      Read article <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#1E293B]">Latest articles</h2>
                <span className="text-[13px] text-slate-600">Showing {filtered.length} article{filtered.length === 1 ? '' : 's'}</span>
              </div>

              <section aria-label="Articles" className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {rest.map(art => (
                  <article key={art.id} className="bg-white border border-[#FECDD3] shadow-xs hover:shadow-md hover:border-[#FDA4AF] transition-all p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#B91C1C] bg-[#FFF0F2] border border-[#FECDD3] px-2.5 py-0.5">{art.category}</span>
                      <span className="text-xs text-slate-600">{art.date}</span>
                    </div>
                    <h3 className="text-[17px] font-bold text-[#1E293B] leading-snug">{art.title}</h3>
                    <p className="text-[13px] text-[#334155] leading-relaxed line-clamp-3">{art.excerpt}</p>
                    <div className="mt-auto pt-3.5 border-t border-[#FFE4E6] flex flex-wrap items-center justify-between gap-2">
                      <AuthorBadge article={art} />
                      {art.citations?.length > 0 && <span className="text-xs text-slate-600">{art.citations.length} citation{art.citations.length === 1 ? '' : 's'}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenArticle(art)}
                      className="min-h-[44px] bg-white border border-[#FECDD3] hover:bg-[#FFE4E6] text-[#1E293B] text-[13px] font-semibold cursor-pointer"
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
          <section className="bg-white border border-[#FECDD3] shadow-xs p-5">
            <h2 className="text-base font-bold text-[#1E293B] mb-3">Browse by category</h2>
            <ul>
              {categories.map(([c, n]) => (
                <li key={c} className="border-b border-[#FFE4E6] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setCategory(c)}
                    className="w-full min-h-[44px] flex items-center justify-between text-sm font-medium text-[#1E293B] hover:text-[#DC2626] cursor-pointer"
                  >
                    <span>{c}</span>
                    <span className="text-xs font-semibold text-slate-600 bg-[#FFF0F2] border border-[#FECDD3] px-2 py-0.5 tabular-nums">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-[#ECFDF5] border border-[#A7F3D0] p-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[#059669]" />
              <h2 className="text-base font-bold text-[#065F46]">How articles are verified</h2>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-[#065F46]">
              Authors are checked against MMC and LJM registries. Each article lists its sources so you can confirm the evidence yourself.
            </p>
          </section>

          <section className="bg-white border border-[#FECDD3] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#1E293B]">Need to speak to a clinician?</h2>
            <p className="text-[13px] leading-relaxed text-[#334155]">Articles are for education. For personal medical advice, book a consultation.</p>
            <button
              type="button"
              onClick={onFindDoctor}
              className="w-full min-h-[44px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[13px] font-bold transition-colors cursor-pointer"
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
            className="bg-white border border-[#FECDD3] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#FFF0F2] border-b border-[#FECDD3] p-5 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-[#B91C1C] bg-white border border-[#FECDD3] px-2.5 py-0.5">{openArticle.category}</span>
                  <span className="text-xs text-slate-600">{openArticle.date}</span>
                </div>
                <h2 className="text-xl font-bold text-[#1E293B] leading-snug">{openArticle.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenArticle(null)}
                aria-label="Close article"
                className="h-11 w-11 shrink-0 flex items-center justify-center text-slate-600 hover:text-[#DC2626] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-[#1E293B]">
              <div className="flex items-center gap-3 bg-[#FFF8F9] border border-[#FECDD3] p-3.5">
                <AuthorBadge article={openArticle} large />
                <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#059669]" /> Verified & accredited
                </span>
              </div>

              <div className="text-sm leading-relaxed text-[#334155] whitespace-pre-line">{openArticle.content}</div>

              {openArticle.citations?.length > 0 && (
                <section className="bg-[#FFF8F9] border border-[#FECDD3] p-4 space-y-2">
                  <h3 className="text-sm font-bold text-[#1E293B]">Peer-reviewed citations</h3>
                  <ol className="list-decimal list-inside space-y-1 text-[13px] text-[#334155] leading-relaxed">
                    {openArticle.citations.map((cit, idx) => <li key={idx}>{cit}</li>)}
                  </ol>
                </section>
              )}

              {openArticle.faq?.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-bold text-[#1E293B]">Patient FAQs</h3>
                  {openArticle.faq.map((f, idx) => (
                    <details key={idx} className="group border border-[#FECDD3] bg-white">
                      <summary className="min-h-[44px] px-4 py-3 text-[13px] font-semibold text-[#1E293B] flex justify-between items-center cursor-pointer list-none">
                        {f.question}
                        <span className="text-[#DC2626] font-bold ml-3 group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <p className="px-4 pb-4 text-[13px] leading-relaxed text-[#334155] border-t border-[#FFE4E6] pt-3">{f.answer}</p>
                    </details>
                  ))}
                </section>
              )}
            </div>

            <div className="border-t border-[#FECDD3] p-4 flex flex-wrap gap-2.5 justify-end shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setOpenArticle(null)}
                className="min-h-[44px] px-5 border border-[#FECDD3] bg-white hover:bg-[#FFE4E6] text-[#1E293B] text-[13px] font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { setOpenArticle(null); onFindDoctor(); }}
                className="min-h-[44px] px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[13px] font-bold cursor-pointer"
              >
                Find a doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
