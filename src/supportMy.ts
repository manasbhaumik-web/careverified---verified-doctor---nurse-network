// Support hours (Malaysia time) and staff reply macros in English, Bahasa Malaysia and Chinese.
// Shared by the server (hours endpoint) and the screens. No React, no Node APIs, so it is easy to test.

export type MacroLang = 'en' | 'ms' | 'zh';
export const MACRO_LANGS: { code: MacroLang; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'ms', label: 'Bahasa Malaysia' }, { code: 'zh', label: '中文' },
];

// ---------- hours ----------
/** Malaysia has no daylight saving: UTC+8 all year. */
export const MYT_OFFSET_HOURS = 8;

export interface SupportHours {
  /** 0 = Sunday ... 6 = Saturday, in Malaysia time. */
  days: number[];
  /** 24-hour "HH:MM" in Malaysia time. */
  open: string;
  close: string;
}

/** Placeholder until the business decides its real hours. Override with SUPPORT_HOURS="1-5 09:00-18:00". */
export const DEFAULT_SUPPORT_HOURS: SupportHours = { days: [1, 2, 3, 4, 5], open: '09:00', close: '18:00' };

/** Parse "1-5 09:00-18:00" (days 0-6, Sunday = 0; a list like "1,2,3,4,5" also works). Falls back to the default. */
export function parseSupportHours(spec: string | undefined | null): SupportHours {
  const m = /^\s*([0-6](?:\s*[-,]\s*[0-6])*)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/.exec(spec ?? '');
  if (!m) return DEFAULT_SUPPORT_HOURS;
  const toMin = (t: string) => { const [h, mi] = t.split(':').map(Number); return h * 60 + mi; };
  const open = toMin(m[2]), close = toMin(m[3]);
  if (open > 24 * 60 || close > 24 * 60 || open >= close || /:[6-9]\d$/.test(m[2]) || /:[6-9]\d$/.test(m[3])) return DEFAULT_SUPPORT_HOURS;
  let days: number[];
  if (m[1].includes('-') && !m[1].includes(',')) {
    const [a, b] = m[1].split('-').map(s => Number(s.trim()));
    days = [];
    for (let d = a; ; d = (d + 1) % 7) { days.push(d); if (d === b) break; }
  } else days = [...new Set(m[1].split(',').map(s => Number(s.trim())))];
  const pad = (n: number) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  return { days, open: pad(open), close: pad(close) };
}

/** Wall-clock fields in Malaysia time for an instant. */
function myt(at: Date) {
  const d = new Date(at.getTime() + MYT_OFFSET_HOURS * 3600_000);
  return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), date: d };
}
const minutesOf = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export interface SupportStatus {
  open: boolean;
  /** When support next opens (or closes, if open now), as an ISO instant. */
  nextChange: string;
}

export function supportStatus(hours: SupportHours = DEFAULT_SUPPORT_HOURS, at: Date = new Date()): SupportStatus {
  const { day, minutes } = myt(at);
  const o = minutesOf(hours.open), c = minutesOf(hours.close);
  const startOfMytDay = at.getTime() - ((minutes * 60_000) + (at.getUTCSeconds() * 1000) + at.getUTCMilliseconds());
  const isOpen = hours.days.includes(day) && minutes >= o && minutes < c;
  if (isOpen) return { open: true, nextChange: new Date(startOfMytDay + c * 60_000).toISOString() };
  for (let add = 0; add <= 7; add++) {
    const d = (day + add) % 7;
    if (!hours.days.includes(d)) continue;
    if (add === 0 && minutes >= o) continue;
    return { open: false, nextChange: new Date(startOfMytDay + add * 86400_000 + o * 60_000).toISOString() };
  }
  return { open: false, nextChange: at.toISOString() };
}

const DAY_NAMES: Record<MacroLang, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
};

/** "Mon-Fri 09:00-18:00 Malaysia time" in the chosen language. */
export function describeHours(hours: SupportHours = DEFAULT_SUPPORT_HOURS, lang: MacroLang = 'en'): string {
  const names = DAY_NAMES[lang];
  const sorted = [...hours.days].sort((a, b) => a - b);
  const consecutive = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const days = consecutive ? `${names[sorted[0]]}-${names[sorted[sorted.length - 1]]}` : sorted.map(d => names[d]).join(', ');
  const tz = lang === 'ms' ? 'waktu Malaysia' : lang === 'zh' ? '马来西亚时间' : 'Malaysia time';
  return `${days} ${hours.open}-${hours.close} ${tz}`;
}

// ---------- macros ----------
export interface Macro {
  id: string;
  label: string;
  text: Record<MacroLang, string>;
}

/**
 * Draft replies. Staff edit before sending. {name} is the requester's first name and {hours} the support hours.
 * The Malay and Chinese wording needs review by a native speaker before launch. The privacy macro says 21 days, matching
 * REQUEST_DUE_DAYS in server/privacy.ts (unconfirmed with counsel): change both together.
 */
export const MACROS: Macro[] = [
  {
    id: 'received', label: 'We got your message',
    text: {
      en: 'Hello {name}, thank you for contacting us. We have your message and will reply during support hours ({hours}). If this is an emergency, call 999 (or 112 from a mobile phone) and do not wait for us.',
      ms: 'Helo {name}, terima kasih kerana menghubungi kami. Mesej anda telah kami terima dan kami akan membalas pada waktu sokongan ({hours}). Jika ini kecemasan, hubungi 999 (atau 112 dari telefon bimbit) dan jangan tunggu balasan kami.',
      zh: '{name}，您好。感谢您联系我们，我们已收到您的留言，并会在客服时间（{hours}）内回复。如属紧急情况，请拨打 999（手机可拨 112），无需等待我们的回复。',
    },
  },
  {
    id: 'more-info', label: 'Need more details',
    text: {
      en: 'Hello {name}, to look into this we need a little more detail: what you were doing, what you expected to happen, and what happened instead. A screenshot helps if you can send one. Please do not include your full MyKad or passport number.',
      ms: 'Helo {name}, untuk menyemak perkara ini kami memerlukan sedikit maklumat lanjut: apa yang anda lakukan, apa yang dijangka berlaku dan apa yang sebenarnya berlaku. Tangkapan skrin amat membantu jika ada. Sila jangan sertakan nombor MyKad atau pasport penuh anda.',
      zh: '{name}，您好。为了跟进此事，我们需要更多细节：您当时在做什么、预期会发生什么，以及实际发生了什么。如有截图会很有帮助。请不要提供完整的身份证（MyKad）或护照号码。',
    },
  },
  {
    id: 'mc-teleconsult', label: 'Medical certificate after a video consultation',
    text: {
      en: 'Hello {name}, the Malaysian Medical Council does not allow a medical certificate to be issued after a teleconsultation alone, so the doctor cannot issue one from this consultation. To get a medical certificate, please attend a doctor in person.',
      ms: 'Helo {name}, Majlis Perubatan Malaysia tidak membenarkan sijil cuti sakit dikeluarkan selepas teleperundingan sahaja, jadi doktor tidak dapat mengeluarkannya daripada konsultasi ini. Untuk mendapatkan sijil cuti sakit, sila hadir berjumpa doktor secara bersemuka.',
      zh: '{name}，您好。马来西亚医药理事会不允许仅凭远程问诊开具病假证明，因此医生无法在此次问诊后开具。如需病假证明，请亲自前往就诊。',
    },
  },
  {
    id: 'first-visit', label: 'First visit must be in person',
    text: {
      en: 'Hello {name}, in Malaysia a first consultation for a long-term condition should be in person. Please book an appointment with a doctor, then use online consultations for follow-ups. If you feel unwell right now, call 999.',
      ms: 'Helo {name}, di Malaysia, konsultasi pertama bagi penyakit jangka panjang hendaklah dilakukan secara bersemuka. Sila buat temu janji dengan doktor, kemudian gunakan konsultasi dalam talian untuk susulan. Jika anda berasa tidak sihat sekarang, hubungi 999.',
      zh: '{name}，您好。在马来西亚，长期病症的初诊应当面进行。请先预约医生就诊，之后的复诊可使用线上问诊。如果您现在感觉不适，请拨打 999。',
    },
  },
  {
    id: 'verification-pending', label: 'Licence check in progress',
    text: {
      en: 'Hello {name}, we check each practitioner against the regulator\'s own register by hand, so this can take a little time. We will tell you as soon as the check is done. Nothing more is needed from you unless we ask.',
      ms: 'Helo {name}, kami menyemak setiap pengamal dengan daftar pengawal selia secara manual, jadi proses ini mungkin mengambil sedikit masa. Kami akan memaklumkan anda sebaik sahaja semakan selesai. Tiada tindakan lanjut diperlukan melainkan kami meminta.',
      zh: '{name}，您好。我们会对每位医疗人员逐一人工核对监管机构的注册名册，因此需要一些时间。核查完成后我们会立即通知您。除非我们另行要求，您无需再做任何事。',
    },
  },
  {
    id: 'privacy-request', label: 'Privacy request received (PDPA)',
    text: {
      en: 'Hello {name}, we have received your request about your personal data. We will confirm your identity first, then respond within 21 days. You can also use the Privacy Centre in your account to see and download your data.',
      ms: 'Helo {name}, kami telah menerima permohonan anda mengenai data peribadi anda. Kami akan mengesahkan identiti anda terlebih dahulu, kemudian membalas dalam tempoh 21 hari. Anda juga boleh menggunakan Pusat Privasi dalam akaun anda untuk melihat dan memuat turun data anda.',
      zh: '{name}，您好。我们已收到您关于个人数据的请求。我们会先核实您的身份，然后在 21 天内回复。您也可以在账户的隐私中心查看并下载您的数据。',
    },
  },
  {
    id: 'refund', label: 'Refund under review',
    text: {
      en: 'Hello {name}, we are looking into your refund request and will confirm the outcome here. Where a refund is due, it goes back to the original payment method, and your bank may take several working days to show it.',
      ms: 'Helo {name}, kami sedang menyemak permohonan bayaran balik anda dan akan mengesahkan keputusannya di sini. Jika bayaran balik perlu dibuat, ia akan dikembalikan ke kaedah pembayaran asal, dan pihak bank anda mungkin mengambil beberapa hari bekerja untuk memaparkannya.',
      zh: '{name}，您好。我们正在审核您的退款申请，结果会在此告知。如果应当退款，款项将退回原付款方式，银行可能需要几个工作日才会显示。',
    },
  },
  {
    id: 'out-of-hours', label: 'Outside support hours',
    text: {
      en: 'Hello {name}, our support team is away right now. We are available {hours} and will reply when we are back. If this is urgent or a safety concern, call 999 (or 112 from a mobile phone).',
      ms: 'Helo {name}, pasukan sokongan kami tiada buat masa ini. Kami tersedia pada {hours} dan akan membalas apabila kami kembali. Jika perkara ini mendesak atau melibatkan keselamatan, hubungi 999 (atau 112 dari telefon bimbit).',
      zh: '{name}，您好。我们的客服团队目前不在线，服务时间为{hours}，上线后会尽快回复。如果情况紧急或涉及安全，请拨打 999（手机可拨 112）。',
    },
  },
  {
    id: 'resolved', label: 'Closing the ticket',
    text: {
      en: 'Hello {name}, we believe this is sorted, so we are marking the ticket resolved. Reply here within 7 days if it is not, and we will reopen it.',
      ms: 'Helo {name}, kami percaya perkara ini telah selesai, jadi kami menandakan tiket ini sebagai selesai. Balas di sini dalam tempoh 7 hari jika ia belum selesai dan kami akan membukanya semula.',
      zh: '{name}，您好。我们认为此问题已解决，因此将工单标记为已解决。如果问题仍然存在，请在 7 天内在此回复，我们会重新打开。',
    },
  },
];

export const firstName = (full?: string | null) => (full ?? '').trim().split(/\s+/)[0] || '';

/** Fill {name} and {hours}. With no name the greeting drops the comma part gracefully. */
export function fillMacro(macro: Macro, lang: MacroLang, vars: { name?: string | null; hours?: SupportHours }): string {
  const name = firstName(vars.name);
  let text = macro.text[lang].replace(/\{hours\}/g, describeHours(vars.hours ?? DEFAULT_SUPPORT_HOURS, lang));
  text = name ? text.replace(/\{name\}/g, name) : text.replace(/ ?\{name\}，?/, '');
  return text;
}
