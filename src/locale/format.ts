import { LANGUAGES, REGIONS } from './config';
import { getLocale } from './store';

const tag = () => LANGUAGES.find(l => l.code === getLocale().lang)?.tag ?? 'en-MY';
const region = () => REGIONS[getLocale().region];

/** Money in the platform currency (MYR → "RM 80.00"). Pass minor units with `fromMinor`. */
export function formatMoney(amount: number | string | null | undefined, opts: { currency?: string; fromMinor?: boolean; decimals?: number } = {}): string {
  let n = Number(amount ?? 0);
  if (!Number.isFinite(n)) n = 0;
  if (opts.fromMinor) n /= 100;
  const currency = opts.currency ?? region().currency;
  const decimals = opts.decimals ?? 2;
  const parts = new Intl.NumberFormat(tag(), {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n);
  // Malaysian convention is "RM 80.00" (with a space); Intl omits it in some locales.
  return currency === 'MYR' ? parts.replace(/^RM\s?/, 'RM ') : parts;
}

type DateInput = string | number | Date | null | undefined;
const toDate = (v: DateInput) => (v instanceof Date ? v : new Date(v as string | number));

export const formatDate = (v: DateInput, opts: Intl.DateTimeFormatOptions = {}) =>
  v ? toDate(v).toLocaleDateString(tag(), opts) : '';
export const formatTime = (v: DateInput, opts: Intl.DateTimeFormatOptions = {}) =>
  v ? toDate(v).toLocaleTimeString(tag(), opts) : '';
export const formatDateTime = (v: DateInput, opts: Intl.DateTimeFormatOptions = {}) =>
  v ? toDate(v).toLocaleString(tag(), opts) : '';

/** The same instant in the clinic/platform time zone, e.g. "3:30 pm MYT". */
export const formatClinicTime = (v: DateInput) =>
  v ? toDate(v).toLocaleTimeString(tag(), { hour: 'numeric', minute: '2-digit', timeZone: region().timeZone, timeZoneName: 'short' }) : '';

export const formatNumber = (n: number, opts: Intl.NumberFormatOptions = {}) => n.toLocaleString(tag(), opts);
