import type { LangCode } from './config';
import { useLocale } from './store';

// Scaffold: add keys as screens are migrated. Missing keys fall back to English, then to the key.
type Dict = Record<string, string>;

const en: Dict = {
  'common.perConsult': 'Per consult',
  'common.language': 'Language',
  'common.region': 'Region',
  'pay.complete': 'Complete payment',
  'nav.skip': 'Skip to content',
  'nav.verify': 'Verify a Licence',
  'nav.portal': 'Access Portal',
  'nav.tagline': 'Medical Assistance Platform',
  'trust.heading': 'How we check practitioners',
};

const ms: Dict = {
  'common.perConsult': 'Setiap konsultasi',
  'common.language': 'Bahasa',
  'common.region': 'Wilayah',
  'pay.complete': 'Selesaikan pembayaran',
  'nav.skip': 'Langkau ke kandungan',
  'nav.verify': 'Semak Lesen',
  'nav.portal': 'Akses Portal',
  'nav.tagline': 'Platform Bantuan Perubatan',
  'trust.heading': 'Cara kami menyemak pengamal',
};

const zh: Dict = {
  'common.perConsult': '每次问诊',
  'common.language': '语言',
  'common.region': '地区',
  'pay.complete': '完成付款',
  'nav.skip': '跳到主要内容',
  'nav.verify': '核实执业证书',
  'nav.portal': '进入门户',
  'nav.tagline': '医疗协助平台',
  'trust.heading': '我们如何核查医疗人员',
};

const DICTS: Partial<Record<LangCode, Dict>> = { en, ms, zh };

export function translate(lang: LangCode, key: string): string {
  return DICTS[lang]?.[key] ?? en[key] ?? key;
}

export function useT() {
  const { lang } = useLocale();
  return (key: string) => translate(lang, key);
}
