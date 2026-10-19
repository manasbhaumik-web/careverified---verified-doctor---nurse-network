import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Send } from 'lucide-react';
import { MY_STATES, toE164 } from '../identity';
import { openLegal } from '../legal';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * "Ask to join" form for clinics, hospitals and pharmacies. The board creates their accounts, so this is the route in.
 * It posts to /api/partner-enquiries. Malay and Chinese wording is a developer draft for native review.
 */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T: Record<Lang, {
  org: Record<'clinic' | 'pharmacy', string>; contact: string; email: string; phone: string; phoneHint: string; city: string; state: string; stateChoose: string;
  licence: string; licenceHint: string; message: string; consent: string; privacy: string; send: string; sending: string; thanks: string; ref: (id: string) => string; next: string;
  errPhone: string; errServer: string;
}> = {
  en: {
    org: { clinic: 'Name of your clinic or hospital', pharmacy: 'Name of your pharmacy' },
    contact: 'Your name', email: 'Email', phone: 'Phone', phoneHint: 'For example 012-345 6789', city: 'City or town', state: 'State or territory', stateChoose: 'Choose…',
    licence: 'Licence number (optional)', licenceHint: 'We check it ourselves later. You do not need to send documents now.', message: 'Anything you want us to know (optional)',
    consent: 'I agree that MedCred may contact me about this enquiry and keep these details to handle it.', privacy: 'Privacy Notice', send: 'Send enquiry', sending: 'Sending…',
    thanks: 'Thank you. We have your enquiry.', ref: id => `Your reference is ${id}.`, next: 'A board member will contact you. We do not promise a reply time yet.',
    errPhone: 'Enter a valid phone number.', errServer: 'Could not reach the server. Please try again.',
  },
  ms: {
    org: { clinic: 'Nama klinik atau hospital anda', pharmacy: 'Nama farmasi anda' },
    contact: 'Nama anda', email: 'E-mel', phone: 'Telefon', phoneHint: 'Contohnya 012-345 6789', city: 'Bandar atau pekan', state: 'Negeri atau wilayah', stateChoose: 'Pilih…',
    licence: 'Nombor lesen (pilihan)', licenceHint: 'Kami menyemaknya sendiri kemudian. Anda tidak perlu menghantar dokumen sekarang.', message: 'Apa-apa yang anda mahu kami ketahui (pilihan)',
    consent: 'Saya bersetuju MedCred boleh menghubungi saya tentang pertanyaan ini dan menyimpan butiran ini untuk mengendalikannya.', privacy: 'Notis Privasi', send: 'Hantar pertanyaan', sending: 'Menghantar…',
    thanks: 'Terima kasih. Kami telah menerima pertanyaan anda.', ref: id => `Rujukan anda ialah ${id}.`, next: 'Seorang ahli lembaga akan menghubungi anda. Kami belum menjanjikan tempoh balasan.',
    errPhone: 'Masukkan nombor telefon yang sah.', errServer: 'Tidak dapat menghubungi pelayan. Sila cuba lagi.',
  },
  zh: {
    org: { clinic: '您的诊所或医院名称', pharmacy: '您的药房名称' },
    contact: '您的姓名', email: '电子邮件', phone: '电话', phoneHint: '例如 012-345 6789', city: '城市或城镇', state: '州属或联邦直辖区', stateChoose: '请选择…',
    licence: '执照号码（选填）', licenceHint: '我们之后会自行核查，现在无需提交文件。', message: '您想让我们知道的其他事项（选填）',
    consent: '我同意 MedCred 就此咨询联系我，并保存这些资料以处理该咨询。', privacy: '隐私声明', send: '发送咨询', sending: '发送中…',
    thanks: '谢谢，我们已收到您的咨询。', ref: id => `您的参考编号是 ${id}。`, next: '委员会成员会与您联系。我们暂时不承诺回复时限。',
    errPhone: '请输入有效的电话号码。', errServer: '无法连接服务器，请重试。',
  },
};

const label = 'text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5';
const inputCls = 'w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]';

export default function PartnerEnquiryForm({ kind }: { kind: 'clinic' | 'pharmacy' }) {
  const { lang } = useLocale();
  const tx = T[pick(lang)];
  const [f, setF] = useState({ orgName: '', contactName: '', email: '', phone: '', city: '', state: '', licenceNo: '', message: '', consent: false, companyWebsite: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF(prev => ({ ...prev, ...p }));
  const id = (n: string) => `enq-${kind}-${n}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!toE164(f.phone, '+60')) { setError(tx.errPhone); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/partner-enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, kind, lang }) });
      const d = await r.json();
      if (d.status === 'success') setDoneId(d.data.id); else setError(d.message || tx.errServer);
    } catch { setError(tx.errServer); }
    finally { setBusy(false); }
  };

  if (doneId) {
    return (
      <div role="status" className="bg-emerald-50 border border-emerald-300 p-6">
        <p className="flex items-center gap-2 font-display font-extrabold text-lg text-emerald-950"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />{tx.thanks}</p>
        <p className="mt-2 text-sm text-emerald-950 font-semibold">{tx.ref(doneId)}</p>
        <p className="mt-1 text-sm text-emerald-950 font-medium">{tx.next}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate={false}>
      {error && <div role="alert" className="bg-rose-50 border border-rose-300 text-rose-900 p-3 flex gap-2 text-sm font-bold"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" /><span>{error}</span></div>}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor={id('org')} className={label}>{tx.org[kind]} *</label>
          <input id={id('org')} className={inputCls} value={f.orgName} onChange={e => set({ orgName: e.target.value })} required minLength={2} maxLength={120} autoComplete="organization" />
        </div>
        <div>
          <label htmlFor={id('name')} className={label}>{tx.contact} *</label>
          <input id={id('name')} className={inputCls} value={f.contactName} onChange={e => set({ contactName: e.target.value })} required minLength={2} maxLength={100} autoComplete="name" />
        </div>
        <div>
          <label htmlFor={id('email')} className={label}>{tx.email} *</label>
          <input id={id('email')} type="email" inputMode="email" autoCapitalize="none" spellCheck={false} className={inputCls} value={f.email} onChange={e => set({ email: e.target.value })} required maxLength={120} autoComplete="email" />
        </div>
        <div>
          <label htmlFor={id('phone')} className={label}>{tx.phone} *</label>
          <input id={id('phone')} type="tel" inputMode="tel" className={inputCls} value={f.phone} onChange={e => set({ phone: e.target.value })} required maxLength={30} autoComplete="tel" aria-describedby={id('phone-hint')} />
          <p id={id('phone-hint')} className="text-xs text-slate-600 mt-1">{tx.phoneHint}</p>
        </div>
        <div>
          <label htmlFor={id('city')} className={label}>{tx.city} *</label>
          <input id={id('city')} className={inputCls} value={f.city} onChange={e => set({ city: e.target.value })} required minLength={2} maxLength={60} autoComplete="address-level2" />
        </div>
        <div>
          <label htmlFor={id('state')} className={label}>{tx.state} *</label>
          <select id={id('state')} className={inputCls} value={f.state} onChange={e => set({ state: e.target.value })} required>
            <option value="">{tx.stateChoose}</option>
            {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={id('licence')} className={label}>{tx.licence}</label>
          <input id={id('licence')} className={inputCls} value={f.licenceNo} onChange={e => set({ licenceNo: e.target.value })} maxLength={50} aria-describedby={id('licence-hint')} />
          <p id={id('licence-hint')} className="text-xs text-slate-600 mt-1">{tx.licenceHint}</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={id('msg')} className={label}>{tx.message}</label>
          <textarea id={id('msg')} className={`${inputCls} h-28 py-3`} value={f.message} onChange={e => set({ message: e.target.value })} maxLength={1500} />
        </div>
      </div>

      {/* Hidden from people and screen readers: a bot that fills it is ignored on the server */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.companyWebsite} onChange={e => set({ companyWebsite: e.target.value })} /></label>
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-800 cursor-pointer">
        <input type="checkbox" checked={f.consent} onChange={e => set({ consent: e.target.checked })} required className="mt-1 h-4 w-4 accent-[color:var(--t-600)]" />
        <span>{tx.consent} <button type="button" onClick={() => openLegal('notice')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">{tx.privacy}</button></span>
      </label>

      <button type="submit" disabled={busy || !f.consent} className="min-h-[48px] px-7 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer disabled:opacity-60 inline-flex items-center gap-2">
        {busy ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />{tx.sending}</> : <><Send className="h-4 w-4" aria-hidden="true" />{tx.send}</>}
      </button>
    </form>
  );
}
