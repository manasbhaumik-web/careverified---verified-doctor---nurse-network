import { useSyncExternalStore } from 'react';
import { DEFAULT_REGION, LANGUAGES, REGIONS, type LangCode, type RegionCode } from './config';

export interface LocaleState { region: RegionCode; lang: LangCode }

const STORAGE_KEY = 'medcred-locale';

function read(): LocaleState {
  const fallback: LocaleState = { region: DEFAULT_REGION, lang: REGIONS[DEFAULT_REGION].defaultLang };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (raw && raw.region in REGIONS && LANGUAGES.some(l => l.code === raw.lang)) return raw;
  } catch { /* storage unavailable or corrupt */ }
  return fallback;
}

let state = read();
const listeners = new Set<() => void>();

export const getLocale = () => state;

export function setLocale(next: Partial<LocaleState>) {
  state = { ...state, ...next };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  const meta = LANGUAGES.find(l => l.code === state.lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = meta?.rtl ? 'rtl' : 'ltr';
  }
  listeners.forEach(l => l());
}

export function useLocale(): LocaleState {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getLocale,
  );
}

// Apply <html lang/dir> for the stored locale at startup.
setLocale({});
