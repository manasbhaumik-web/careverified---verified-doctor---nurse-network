import React, { useEffect } from 'react';
import {
  ArrowRight, BadgeCheck, Building2, Briefcase, ClipboardList, FileSignature, Hourglass, Inbox, Languages, Lock, MessageSquare,
  Pill, QrCode, ScrollText, ShieldCheck, Snowflake, Store, Stethoscope, Truck, Plane, UserSearch, BarChart3,
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import PartnerEnquiryForm from './PartnerEnquiryForm';
import { loginUrl, navigate, type PortalRole } from '../nav';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/** A data-driven page for one audience. The content files hold the words; this holds the layout. */
export type Lang = 'en' | 'ms' | 'zh';
export const pickLang = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

export type Item = { t: string; d: string; icon?: string };
export type Section =
  | { kind: 'steps'; id: string; title: string; items: Item[] }
  | { kind: 'cards'; id: string; title: string; intro?: string; items: Item[]; tint?: boolean }
  | { kind: 'bullets'; id: string; title: string; intro?: string; items: string[]; tint?: boolean }
  | { kind: 'split'; id: string; left: { title: string; items: string[]; subTitle?: string; subItems?: string[] }; right: { title: string; items: string[] }[] }
  | { kind: 'note'; id: string; title: string; text: string };

export interface PageContent {
  title: string; description: string;
  hero: { eyebrow: string; h1: string; sub: string; apply: string; signin: string; who: string };
  sections: Section[];
  apply: { title: string; intro: string };
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox, qr: QrCode, scroll: ScrollText, truck: Truck, snow: Snowflake, shield: ShieldCheck, badge: BadgeCheck, chart: BarChart3, store: Store, lock: Lock,
  plane: Plane, brief: Briefcase, search: UserSearch, steth: Stethoscope, pill: Pill, doc: FileSignature, hour: Hourglass, msg: MessageSquare, lang: Languages, build: Building2, list: ClipboardList,
};

export default function AudiencePage({ kind, signInRole, content }: { kind: 'clinic' | 'pharmacy'; signInRole: PortalRole; content: Record<Lang, PageContent> }) {
  const { lang } = useLocale();
  const L = pickLang(lang);
  const tx = content[L];

  useEffect(() => {
    const prevTitle = document.title;
    document.title = tx.title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    const prevDesc = meta.content;
    meta.content = tx.description;
    return () => { document.title = prevTitle; if (created) meta!.remove(); else meta!.content = prevDesc; };
  }, [tx.title, tx.description]);

  const toApply = () => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const signIn = () => navigate(loginUrl(signInRole, false));
  const btnPrimary = 'min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer inline-flex items-center justify-center gap-2';
  const btnSecondary = 'min-h-[48px] px-6 text-sm font-extrabold text-[color:var(--t-700)] bg-white hover:bg-[color:var(--t-100)] border border-[color:var(--t-200)] cursor-pointer inline-flex items-center justify-center';
  const h2 = 'font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)] leading-tight';
  const wrap = 'max-w-6xl mx-auto px-4 sm:px-6';
  const bg = (i: number, tint?: boolean) => (tint ?? i % 2 === 1 ? 'bg-[color:var(--t-50)]' : 'bg-white');

  const iconBox = (name: string | undefined, fallback: string) => {
    const Icon = ICONS[name ?? fallback] ?? ICONS[fallback];
    return <span aria-hidden="true" className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>;
  };

  return (
    <div className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">Skip to content</a>

      <header className="sticky top-0 z-40 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
        <div className={`${wrap} py-2.5 flex items-center justify-between gap-3`}>
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-2.5 min-w-0" aria-label="MedCred home">
            <span className="w-9 h-9 shrink-0 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
            </span>
            <span className="font-display font-black text-xl tracking-tight text-[color:var(--ink)]">MedCred<span className="text-[color:var(--t-600)]">.</span></span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={signIn} className="hidden sm:inline-flex min-h-[44px] px-4 text-sm font-bold text-[color:var(--t-700)] hover:underline cursor-pointer items-center">{tx.hero.signin}</button>
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow w-full">
        <section className="bg-white border-b border-[color:var(--t-200)] py-12 sm:py-16">
          <div className={wrap}>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-2">{tx.hero.eyebrow}</p>
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.1] max-w-3xl">{tx.hero.h1}</h1>
            <p className="text-base sm:text-lg text-slate-700 font-medium mt-4 max-w-2xl leading-relaxed">{tx.hero.sub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={toApply} className={btnPrimary}>{tx.hero.apply}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={signIn} className={btnSecondary}>{tx.hero.signin}</button>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700 max-w-2xl">{tx.hero.who}</p>
          </div>
        </section>

        {tx.sections.map((s, i) => {
          if (s.kind === 'note') {
            return (
              <section key={s.id} aria-labelledby={`${s.id}-h`} className="py-10 border-b border-[color:var(--t-200)] bg-white">
                <div className={wrap}>
                  <div role="note" className="bg-amber-50 border border-amber-300 p-5 max-w-3xl">
                    <h2 id={`${s.id}-h`} className="font-display font-extrabold text-lg text-amber-950">{s.title}</h2>
                    <p className="text-sm text-amber-950 mt-1.5 leading-relaxed font-medium">{s.text}</p>
                  </div>
                </div>
              </section>
            );
          }
          if (s.kind === 'steps') {
            return (
              <section key={s.id} aria-labelledby={`${s.id}-h`} className={`py-12 sm:py-16 border-b border-[color:var(--t-200)] ${bg(i)}`}>
                <div className={wrap}>
                  <h2 id={`${s.id}-h`} className={h2}>{s.title}</h2>
                  <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {s.items.map((it, n) => (
                      <li key={it.t} className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5">
                        <span className="font-display font-black text-3xl text-[color:var(--t-700)]" aria-hidden="true">{n + 1}</span>
                        <h3 className="font-display font-extrabold text-base mt-1">{it.t}</h3>
                        <p className="text-sm text-slate-700 mt-1.5 leading-relaxed font-medium">{it.d}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            );
          }
          if (s.kind === 'cards') {
            return (
              <section key={s.id} aria-labelledby={`${s.id}-h`} className={`py-12 sm:py-16 border-b border-[color:var(--t-200)] ${bg(i, s.tint)}`}>
                <div className={wrap}>
                  <h2 id={`${s.id}-h`} className={h2}>{s.title}</h2>
                  {s.intro && <p className="mt-2 text-sm sm:text-base text-slate-700 font-medium max-w-2xl">{s.intro}</p>}
                  <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {s.items.map(it => (
                      <li key={it.t} className="bg-white border border-[color:var(--t-200)] p-5">
                        {iconBox(it.icon, 'list')}
                        <h3 className="font-display font-extrabold text-base leading-snug">{it.t}</h3>
                        <p className="text-sm text-slate-700 mt-1.5 leading-relaxed font-medium">{it.d}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          }
          if (s.kind === 'bullets') {
            return (
              <section key={s.id} aria-labelledby={`${s.id}-h`} className={`py-12 sm:py-16 border-b border-[color:var(--t-200)] ${bg(i, s.tint)}`}>
                <div className={wrap}>
                  <h2 id={`${s.id}-h`} className={h2}>{s.title}</h2>
                  {s.intro && <p className="mt-2 text-sm sm:text-base text-slate-700 font-medium max-w-2xl">{s.intro}</p>}
                  <ul className="mt-6 grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-800 font-medium list-disc pl-5">
                    {s.items.map(x => <li key={x} className="leading-relaxed">{x}</li>)}
                  </ul>
                </div>
              </section>
            );
          }
          // split
          return (
            <section key={s.id} aria-labelledby={`${s.id}-h`} className={`py-12 sm:py-16 border-b border-[color:var(--t-200)] ${bg(i)}`}>
              <div className={`${wrap} grid md:grid-cols-2 gap-8`}>
                <div>
                  <h2 id={`${s.id}-h`} className={h2}>{s.left.title}</h2>
                  <ul className="mt-5 space-y-3 text-sm text-slate-800 font-medium list-disc pl-5">{s.left.items.map(x => <li key={x} className="leading-relaxed">{x}</li>)}</ul>
                  {s.left.subTitle && (
                    <>
                      <h3 className="font-display font-extrabold text-base mt-6">{s.left.subTitle}</h3>
                      <ul className="mt-2 space-y-2 text-sm text-slate-700 font-medium list-disc pl-5">{(s.left.subItems ?? []).map(x => <li key={x}>{x}</li>)}</ul>
                    </>
                  )}
                </div>
                <div className="grid gap-8 content-start">
                  {s.right.map(r => (
                    <div key={r.title}>
                      <h2 className={h2}>{r.title}</h2>
                      <ul className="mt-5 space-y-3 text-sm text-slate-800 font-medium list-disc pl-5">{r.items.map(x => <li key={x} className="leading-relaxed">{x}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section id="apply" aria-labelledby="apply-h" className="py-12 sm:py-16 bg-white scroll-mt-20">
          <div className={`${wrap} grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-10`}>
            <div>
              <h2 id="apply-h" className={h2}>{tx.apply.title}</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-700 font-medium leading-relaxed">{tx.apply.intro}</p>
            </div>
            <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 sm:p-7">
              <PartnerEnquiryForm kind={kind} />
            </div>
          </div>
        </section>
      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
