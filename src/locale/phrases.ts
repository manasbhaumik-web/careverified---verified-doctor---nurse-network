import { useEffect, useSyncExternalStore } from 'react';
import { useLocale } from './store';
import type { LangCode } from './config';

/**
 * Translations live in public/locales/<lang>.json as { "English text": "translation" }.
 * The English text is the lookup key, so components just write tx('My Care').
 * A language's file is fetched the first time it is chosen. A missing file or missing phrase shows English.
 * To add a language: add it to LANGUAGES in config.ts and drop a <code>.json file into public/locales.
 */
type Catalog = Record<string, string>;

const catalogs: Partial<Record<LangCode, Catalog>> = {};
const loading = new Map<LangCode, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

/** Fetch a language's phrase file once. Safe to call repeatedly. English needs no file. */
export function loadCatalog(lang: LangCode): Promise<void> {
  if (lang === 'en' || catalogs[lang]) return Promise.resolve();
  let p = loading.get(lang);
  if (!p) {
    p = fetch(`/locales/${lang}.json`)
      .then(r => (r.ok ? (r.json() as Promise<Catalog>) : {}))
      .catch(() => ({} as Catalog))
      .then(data => { catalogs[lang] = data; version++; listeners.forEach(l => l()); });
    loading.set(lang, p);
  }
  return p;
}

type Vars = Record<string, string | number>;

/** Translate an English phrase. A phrase with no translation yet is shown in English. `{name}` placeholders are filled from `vars`. */
export function tr(lang: LangCode, text: string, vars?: Vars): string {
  const out = catalogs[lang]?.[text] ?? text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Hook form: `const tx = useTr(); tx('My Care')`. Re-renders when the language changes or its file finishes loading. */
export function useTr() {
  const { lang } = useLocale();
  useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => version);
  useEffect(() => { void loadCatalog(lang); }, [lang]);
  return (text: string, vars?: Vars) => tr(lang, text, vars);
}

/** BCP 47 tag for formatting dates and numbers in the chosen language. */
export const dateLocaleOf = (lang: LangCode) => (lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : lang === 'id' ? 'id-ID' : lang === 'ar' ? 'ar' : 'en-MY');
