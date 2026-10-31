import { useLocale } from './store';
import type { LangCode } from './config';
import { MEMBER_PHRASES } from './phrases.member';

/** One row per phrase: English text (also the lookup key), Bahasa Malaysia, Simplified Chinese. */
export type PhraseRow = readonly [en: string, ms: string, zh: string];

const MS = new Map<string, string>();
const ZH = new Map<string, string>();
for (const [en, ms, zh] of MEMBER_PHRASES) { MS.set(en, ms); ZH.set(en, zh); }

type Vars = Record<string, string | number>;

/** Translate an English phrase. A phrase with no translation yet is shown in English. `{name}` placeholders are filled from `vars`. */
export function tr(lang: LangCode, text: string, vars?: Vars): string {
  const found = lang === 'ms' ? MS.get(text) : lang === 'zh' ? ZH.get(text) : undefined;
  const out = found ?? text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Hook form: `const t = useTr(); t('My Care')`. Re-renders when the language changes. */
export function useTr() {
  const { lang } = useLocale();
  return (text: string, vars?: Vars) => tr(lang, text, vars);
}
