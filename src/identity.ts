// Identity, phone and address rules shared by the registration form and the server.
// Formats come from general knowledge of Malaysian conventions: confirm edge cases before launch.

// ---------- MyKad / NRIC ----------
export interface Nric { normalised: string; birthDate: string; age: number; gender: 'Male' | 'Female' }

/** Strip spaces and dashes, keep digits only. */
export const nricDigits = (s: string) => s.replace(/[\s-]/g, '');

/** Insert dashes as the user types: 900101-14-5399. */
export function formatNricInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  return [d.slice(0, 6), d.slice(6, 8), d.slice(8)].filter(Boolean).join('-');
}

/**
 * A MyKad number is YYMMDD-PB-###G: birth date, 2-digit place-of-birth code, then four digits whose last is odd for
 * males and even for females. Returns null if the number cannot be valid. The century is inferred (no century digit
 * exists): a two-digit year that would be in the future means 19YY.
 */
export function parseNric(input: string, today = new Date()): Nric | null {
  const d = nricDigits(input);
  if (!/^\d{12}$/.test(d)) return null;
  const yy = Number(d.slice(0, 2)), mm = Number(d.slice(2, 4)), dd = Number(d.slice(4, 6)), pb = Number(d.slice(6, 8));
  if (pb < 1) return null;
  let year = 2000 + yy;
  if (new Date(year, mm - 1, dd) > today) year -= 100;
  const date = new Date(year, mm - 1, dd);
  if (date.getFullYear() !== year || date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  let age = today.getFullYear() - year;
  if (today < new Date(today.getFullYear(), mm - 1, dd)) age--;
  const iso = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return { normalised: `${d.slice(0, 6)}-${d.slice(6, 8)}-${d.slice(8)}`, birthDate: iso, age, gender: Number(d[11]) % 2 === 1 ? 'Male' : 'Female' };
}

/** Show only the first six digits (birth date): 900101-••-••••. */
export const maskNric = (v?: string | null) => {
  if (!v) return '••••••-••-••••';
  const n = parseNric(v);
  return n ? `${n.normalised.slice(0, 6)}-••-••••` : v.length <= 4 ? v : `${v.slice(0, 2)}${'•'.repeat(Math.max(0, v.length - 4))}${v.slice(-2)}`;
};

// ---------- passport ----------
export const normalisePassport = (s: string) => s.replace(/\s/g, '').toUpperCase();
export const isPassportNumber = (s: string) => /^[A-Z0-9]{5,15}$/.test(normalisePassport(s));

// ---------- phone (E.164) ----------
export const DIAL_CODES: { code: string; dial: string; name: string }[] = [
  { code: 'MY', dial: '+60', name: 'Malaysia' }, { code: 'SG', dial: '+65', name: 'Singapore' }, { code: 'ID', dial: '+62', name: 'Indonesia' },
  { code: 'BN', dial: '+673', name: 'Brunei' }, { code: 'TH', dial: '+66', name: 'Thailand' }, { code: 'PH', dial: '+63', name: 'Philippines' },
  { code: 'VN', dial: '+84', name: 'Vietnam' }, { code: 'CN', dial: '+86', name: 'China' }, { code: 'IN', dial: '+91', name: 'India' },
  { code: 'JP', dial: '+81', name: 'Japan' }, { code: 'KR', dial: '+82', name: 'South Korea' }, { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' }, { code: 'US', dial: '+1', name: 'United States / Canada' }, { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates' }, { code: 'BD', dial: '+880', name: 'Bangladesh' }, { code: 'PK', dial: '+92', name: 'Pakistan' },
];

/**
 * Turn a typed number into E.164 (+60123456789). Accepts national format with a leading 0 (0123456789), already-prefixed
 * numbers, and punctuation. Returns null when it cannot be a valid number for that country.
 */
function validE164(full: string, _defaultDial: string): boolean {
  return toE164(full, _defaultDial) !== null;
}

export function toE164(input: string, defaultDial = '+60'): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  let full: string;
  if (digits.startsWith('+')) full = digits;
  else if (digits.startsWith('00')) full = '+' + digits.slice(2);
  else if (digits.startsWith(defaultDial.slice(1)) && validE164('+' + digits, defaultDial)) full = '+' + digits; // 60123456789 typed without the plus
  else full = defaultDial + digits.replace(/^0+/, '');
  if (!/^\+[1-9]\d{7,14}$/.test(full)) return null;
  // Malaysian numbers: area/mobile numbers have 8 to 10 digits after +60 (mobile 1x: 9 or 10).
  if (full.startsWith('+60')) {
    const national = full.slice(3);
    if (!/^[1-9]\d{7,9}$/.test(national)) return null;
    if (national.startsWith('1') && !/^1\d{8,9}$/.test(national)) return null;
  }
  return full;
}

/** Readable form: +60 12-345 6789 for Malaysia, otherwise the E.164 string. */
export function formatPhone(e164?: string | null): string {
  if (!e164) return '';
  if (e164.startsWith('+60')) {
    const n = e164.slice(3);
    return n.startsWith('1') ? `+60 ${n.slice(0, 2)}-${n.slice(2, n.length - 4)} ${n.slice(-4)}` : `+60 ${n.slice(0, 1)}-${n.slice(1, n.length - 4)} ${n.slice(-4)}`;
  }
  return e164;
}

// ---------- address ----------
export const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya',
];
export const isMyPostcode = (s: string) => /^\d{5}$/.test(s.trim());

export interface Address { line1: string; line2?: string; city: string; state?: string; postcode: string; country: string }

/** Returns an error message, or null if valid. Malaysian addresses need a state and a 5-digit postcode. */
export function addressProblem(a: Partial<Address> | undefined): string | null {
  if (!a || !a.line1?.trim() || !a.city?.trim() || !a.country?.trim()) return 'Enter your address, city and country.';
  if (a.country.toUpperCase() === 'MY') {
    if (!a.state || !MY_STATES.includes(a.state)) return 'Choose your state.';
    if (!isMyPostcode(a.postcode ?? '')) return 'A Malaysian postcode has 5 digits.';
  } else if (!a.postcode?.trim()) {
    return 'Enter your postal code.';
  }
  return null;
}

// ---------- nationality and language ----------
export const NATIONALITIES: { code: string; name: string }[] = [
  ...DIAL_CODES.filter(d => d.code !== 'US').map(d => ({ code: d.code, name: d.name })),
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'NL', name: 'Netherlands' }, { code: 'XX', name: 'Other' },
];

export const PREFERRED_LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'ms', label: 'Bahasa Malaysia' }, { code: 'zh', label: '中文 (Chinese)' }, { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'id', label: 'Bahasa Indonesia' }, { code: 'ar', label: 'العربية (Arabic)' }, { code: 'other', label: 'Other' },
];

export const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Friend', 'Guardian', 'Other'];
