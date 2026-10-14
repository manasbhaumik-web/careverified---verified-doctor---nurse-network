import type { LangCode } from './config';
import { useLocale } from './store';

// Scaffold: add keys as screens are migrated. Missing keys fall back to English, then to the key.
type Dict = Record<string, string>;

const en: Dict = {
  'common.perConsult': 'Per consult',
  'common.language': 'Language',
  'common.region': 'Region',
  'pay.complete': 'Complete payment',
};

const ms: Dict = {
  'common.perConsult': 'Setiap konsultasi',
  'common.language': 'Bahasa',
  'common.region': 'Wilayah',
  'pay.complete': 'Selesaikan pembayaran',
};

const DICTS: Partial<Record<LangCode, Dict>> = { en, ms };

export function translate(lang: LangCode, key: string): string {
  return DICTS[lang]?.[key] ?? en[key] ?? key;
}

export function useT() {
  const { lang } = useLocale();
  return (key: string) => translate(lang, key);
}
