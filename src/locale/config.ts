// Region/locale layer. Malaysia is the default region; INTL keeps the platform usable for
// international patients and medical-tourism visitors without changing any stored data.

export type RegionCode = 'MY' | 'INTL';
export type LangCode = 'en' | 'ms' | 'zh' | 'id' | 'ar';

export interface RegionConfig {
  code: RegionCode;
  label: string;
  /** Currency prices are stored and charged in. Display conversion is not implemented yet. */
  currency: string;
  /** Clinic/platform time zone, used to show "clinic time" next to the viewer's own. */
  timeZone: string;
  defaultLang: LangCode;
  dialCode: string;
}

export const REGIONS: Record<RegionCode, RegionConfig> = {
  MY: { code: 'MY', label: 'Malaysia', currency: 'MYR', timeZone: 'Asia/Kuala_Lumpur', defaultLang: 'en', dialCode: '+60' },
  INTL: { code: 'INTL', label: 'International', currency: 'MYR', timeZone: 'Asia/Kuala_Lumpur', defaultLang: 'en', dialCode: '' },
};

export const LANGUAGES: { code: LangCode; label: string; tag: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English', tag: 'en-MY' },
  { code: 'ms', label: 'Bahasa Malaysia', tag: 'ms-MY' },
  { code: 'zh', label: '中文', tag: 'zh-MY' },
  { code: 'id', label: 'Bahasa Indonesia', tag: 'id-ID' },
  { code: 'ar', label: 'العربية', tag: 'ar', rtl: true },
];

export const DEFAULT_REGION: RegionCode = 'MY';
