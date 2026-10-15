import React, { useEffect, useState } from 'react';
import { BadgeCheck, Building2, Car, FileText, Languages, Plane, Search, Utensils, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * Public page for international patients: what the platform does for them, a facility list anyone can browse without an
 * account, and the travel notes. Everything here comes from what the product does today (docs/MEDICAL_TOURISM.md) or from the
 * public API; nothing is invented. Malay and Chinese wording is a developer draft for native review. Arabic and Indonesian
 * are not available yet, which the page says.
 */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T: Record<Lang, {
  eyebrow: string; title: string; intro: string;
  cards: { title: string; text: string }[];
  notYet: string;
  browse: { title: string; note: string; q: string; specialty: string; language: string; anyAcc: string; anyService: string; empty: string; mhtc: string; licence: string; acc: (body: string, until: string) => string; cta: string; services: Record<string, string>; loading: string };
  info: { title: string; draft: string };
  emergency: string;
  langNote: string;
}> = {
  en: {
    eyebrow: 'For international patients',
    title: 'Medical care in Malaysia, before you travel',
    intro: 'Browse facilities without an account. Create one with your passport when you are ready to send an enquiry.',
    cards: [
      { title: 'Register with your passport', text: 'You do not need a MyKad. Your passport number, nationality and date of birth are enough to sign up.' },
      { title: 'Itemised quotes in ringgit', text: 'A quote lists each item, what is not included, and the cancellation terms. Prices are in Malaysian ringgit.' },
      { title: 'Checked, not copied', text: 'We show JCI or MSQH accreditation only after our team has checked it and recorded when it expires. We do not copy claims from websites.' },
      { title: 'You control your records', text: 'A facility sees your passport copy and records only if you agree when you send your enquiry. You can remove files at any time.' },
      { title: 'A link for your home doctor', text: 'After treatment you can share your discharge summary with your own doctor through a time-limited link you can cancel.' },
      { title: 'Know before you go', text: 'Entry rules depend on your nationality, so check with the Malaysian embassy. A Malaysian doctor cannot send e-prescriptions to you abroad or give emergency care.' },
    ],
    notYet: 'Not available yet: paying a deposit in the app, travel and visa arrangements, and record transfer between hospital systems. Payment is arranged directly with the facility.',
    browse: {
      title: 'Facilities that welcome international patients', note: 'Our team adds each facility. A green tag appears only where we have checked its licence or accreditation.',
      q: 'Name or city', specialty: 'Specialty, e.g. cardiology', language: 'Language, e.g. Arabic', anyAcc: 'Any accreditation', anyService: 'Any service',
      empty: 'No facilities match yet.', mhtc: 'MHTC member (as recorded)', licence: 'Licence checked',
      acc: (b, u) => `${b} accredited until ${u}`, cta: 'Create an account to send an enquiry', loading: 'Loading facilities…',
      services: { interpreter: 'Interpreter', airportPickup: 'Airport pickup', halalFood: 'Halal food', prayerRoom: 'Prayer room' },
    },
    info: { title: 'Travel information', draft: 'Draft information from our research. Confirm with the embassy, Immigration and the facility.' },
    emergency: 'In an emergency in Malaysia, call 999 (112 from a mobile phone).',
    langNote: 'The app is available in English, Bahasa Malaysia and Chinese. Indonesian and Arabic are not available yet. Each facility shows whether it offers an interpreter.',
  },
  ms: {
    eyebrow: 'Untuk pesakit antarabangsa',
    title: 'Penjagaan perubatan di Malaysia, sebelum anda bertolak',
    intro: 'Layari kemudahan tanpa akaun. Cipta akaun dengan pasport anda apabila bersedia menghantar pertanyaan.',
    cards: [
      { title: 'Daftar dengan pasport anda', text: 'Anda tidak memerlukan MyKad. Nombor pasport, kewarganegaraan dan tarikh lahir anda sudah mencukupi.' },
      { title: 'Sebut harga terperinci dalam ringgit', text: 'Sebut harga menyenaraikan setiap item, apa yang tidak termasuk, dan terma pembatalan. Harga dalam ringgit Malaysia.' },
      { title: 'Disemak, bukan disalin', text: 'Kami menunjukkan akreditasi JCI atau MSQH hanya selepas pasukan kami menyemaknya dan merekodkan tarikh tamat. Kami tidak menyalin tuntutan daripada laman web.' },
      { title: 'Anda mengawal rekod anda', text: 'Kemudahan hanya melihat salinan pasport dan rekod anda jika anda bersetuju semasa menghantar pertanyaan. Anda boleh membuang fail pada bila-bila masa.' },
      { title: 'Pautan untuk doktor di negara anda', text: 'Selepas rawatan, anda boleh berkongsi ringkasan discaj dengan doktor anda sendiri melalui pautan bertempoh yang boleh dibatalkan.' },
      { title: 'Ketahui sebelum berlepas', text: 'Peraturan kemasukan bergantung pada kewarganegaraan anda, jadi semak dengan kedutaan Malaysia. Doktor Malaysia tidak boleh menghantar e-preskripsi kepada anda di luar negara atau memberi rawatan kecemasan.' },
    ],
    notYet: 'Belum tersedia: bayaran deposit dalam aplikasi, urusan perjalanan dan visa, dan pemindahan rekod antara sistem hospital. Pembayaran diuruskan terus dengan kemudahan.',
    browse: {
      title: 'Kemudahan yang mengalu-alukan pesakit antarabangsa', note: 'Pasukan kami menambah setiap kemudahan. Tag hijau muncul hanya jika kami telah menyemak lesen atau akreditasinya.',
      q: 'Nama atau bandar', specialty: 'Kepakaran, cth. kardiologi', language: 'Bahasa, cth. Arab', anyAcc: 'Sebarang akreditasi', anyService: 'Sebarang perkhidmatan',
      empty: 'Belum ada kemudahan yang sepadan.', mhtc: 'Ahli MHTC (seperti direkodkan)', licence: 'Lesen disemak',
      acc: (b, u) => `Diakreditasi ${b} hingga ${u}`, cta: 'Cipta akaun untuk menghantar pertanyaan', loading: 'Memuatkan kemudahan…',
      services: { interpreter: 'Jurubahasa', airportPickup: 'Jemputan lapangan terbang', halalFood: 'Makanan halal', prayerRoom: 'Bilik solat' },
    },
    info: { title: 'Maklumat perjalanan', draft: 'Maklumat draf daripada kajian kami. Sahkan dengan kedutaan, Imigresen dan kemudahan.' },
    emergency: 'Dalam kecemasan di Malaysia, hubungi 999 (112 dari telefon bimbit).',
    langNote: 'Aplikasi tersedia dalam Bahasa Malaysia, Inggeris dan Cina. Bahasa Indonesia dan Arab belum tersedia. Setiap kemudahan menunjukkan sama ada ia menyediakan jurubahasa.',
  },
  zh: {
    eyebrow: '面向国际患者',
    title: '出发前，了解马来西亚的医疗服务',
    intro: '无需账户即可浏览医疗机构。准备好发送咨询时，再用护照创建账户。',
    cards: [
      { title: '用护照注册', text: '无需 MyKad。提供护照号码、国籍和出生日期即可注册。' },
      { title: '以令吉列明的报价', text: '报价会列出每个项目、不包含的内容以及取消条款。价格以马来西亚令吉计。' },
      { title: '经核查，而非照搬', text: '只有在我们的团队核查并记录到期日之后，才会显示 JCI 或 MSQH 认证。我们不会照抄网站上的说法。' },
      { title: '记录由您掌控', text: '只有当您发送咨询时表示同意，机构才能看到您的护照复印件和病历。您可以随时删除文件。' },
      { title: '给您本国医生的链接', text: '治疗结束后，您可以通过限时且可取消的链接，把出院小结分享给您自己的医生。' },
      { title: '出发前须知', text: '入境规定取决于您的国籍，请向马来西亚使领馆查询。马来西亚医生不能向身在国外的您发送电子处方，也不能提供紧急救治。' },
    ],
    notYet: '尚未提供：在应用内支付订金、行程和签证安排，以及医院系统之间的病历传输。费用直接与医疗机构安排。',
    browse: {
      title: '欢迎国际患者的医疗机构', note: '机构由我们的团队添加。只有在我们核查了其执照或认证后，才会显示绿色标签。',
      q: '名称或城市', specialty: '专科，例如心脏科', language: '语言，例如阿拉伯语', anyAcc: '任何认证', anyService: '任何服务',
      empty: '暂无符合条件的机构。', mhtc: 'MHTC 会员（按记录）', licence: '执照已核查',
      acc: (b, u) => `${b} 认证，有效期至 ${u}`, cta: '创建账户以发送咨询', loading: '正在加载机构…',
      services: { interpreter: '翻译', airportPickup: '机场接送', halalFood: '清真餐食', prayerRoom: '祈祷室' },
    },
    info: { title: '出行信息', draft: '这是我们研究整理的草稿信息，请向使领馆、移民局和医疗机构确认。' },
    emergency: '在马来西亚遇到紧急情况，请拨打 999（手机可拨 112）。',
    langNote: '应用提供英文、马来文和中文。暂不提供印尼语和阿拉伯语。每家机构都会标明是否提供翻译服务。',
  },
};

const SERVICE_ICON: Record<string, React.ComponentType<{ className?: string }>> = { interpreter: Languages, airportPickup: Car, halalFood: Utensils, prayerRoom: HeartHandshake };
const CARD_ICONS = [FileText, Building2, BadgeCheck, ShieldCheck, Plane, Plane];
const field = 'border border-slate-300 bg-white px-3 h-11 text-sm w-full';

export default function TouristAccess({ onSignUp }: { onSignUp: () => void }) {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];
  const [f, setF] = useState({ q: '', specialty: '', language: '', accreditation: '', service: '' });
  const [list, setList] = useState<any[] | null>(null);
  const [info, setInfo] = useState<{ draft: boolean; sections: { heading: string; body: string }[] } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
      fetch(`/api/tourism/facilities?${qs}`).then(r => r.json()).then(d => setList(d.status === 'success' ? d.data : [])).catch(() => setList([]));
    }, 250);
    return () => clearTimeout(t);
  }, [f]);
  useEffect(() => { fetch('/api/tourism/info').then(r => r.json()).then(d => d.status === 'success' && setInfo(d.data)).catch(() => {}); }, []);

  return (
    <section id="tourist-section" aria-labelledby="tourist-heading" className="bg-white border-b border-[color:var(--t-200)] py-12 sm:py-16 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-2">{tx.eyebrow}</p>
        <h2 id="tourist-heading" className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[color:var(--ink)] leading-tight">{tx.title}</h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl">{tx.intro}</p>

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tx.cards.map((c, i) => {
            const Icon = CARD_ICONS[i];
            return (
              <li key={c.title} className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5">
                <span aria-hidden="true" className="w-9 h-9 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>
                <h3 className="font-display font-extrabold text-base text-[color:var(--ink)] leading-snug">{c.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1.5 font-medium">{c.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-slate-700 font-semibold">{tx.notYet}</p>
        <p className="mt-2 text-sm text-slate-700 font-semibold">{tx.langNote}</p>
        <p className="mt-2 text-sm text-rose-800 font-bold">{tx.emergency}</p>

        {/* Facility browser: no account needed */}
        <div className="mt-10">
          <h3 className="font-display font-black text-xl sm:text-2xl text-[color:var(--ink)] tracking-tight">{tx.browse.title}</h3>
          <p className="text-sm text-slate-600 mt-1 font-medium">{tx.browse.note}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <input className={field} placeholder={tx.browse.q} aria-label={tx.browse.q} value={f.q} onChange={e => setF({ ...f, q: e.target.value })} />
            <input className={field} placeholder={tx.browse.specialty} aria-label={tx.browse.specialty} value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value })} />
            <input className={field} placeholder={tx.browse.language} aria-label={tx.browse.language} value={f.language} onChange={e => setF({ ...f, language: e.target.value })} />
            <select className={field} aria-label={tx.browse.anyAcc} value={f.accreditation} onChange={e => setF({ ...f, accreditation: e.target.value })}>
              <option value="">{tx.browse.anyAcc}</option><option value="JCI">JCI</option><option value="MSQH">MSQH</option>
            </select>
            <select className={field} aria-label={tx.browse.anyService} value={f.service} onChange={e => setF({ ...f, service: e.target.value })}>
              <option value="">{tx.browse.anyService}</option>
              {Object.entries(tx.browse.services).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="mt-4" aria-live="polite">
            {list === null && <p className="text-sm text-slate-600">{tx.browse.loading}</p>}
            {list !== null && list.length === 0 && <p className="text-sm text-slate-700 bg-[color:var(--t-50)] border border-dashed border-[color:var(--t-200)] p-6 text-center font-medium">{tx.browse.empty}</p>}
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(list ?? []).map(fac => (
                <li key={fac.id} className="border border-[color:var(--t-200)] bg-white p-5 flex flex-col gap-3">
                  <div>
                    <h4 className="font-display font-extrabold text-lg text-[color:var(--ink)] leading-snug">{fac.name}</h4>
                    <p className="text-sm text-slate-600 font-medium">{[fac.city, fac.state].filter(Boolean).join(', ')}</p>
                  </div>
                  {fac.description && <p className="text-sm text-slate-700 leading-relaxed">{fac.description}</p>}
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                    {fac.licenceChecked && <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5">{tx.browse.licence}</span>}
                    {fac.mhtcMember && <span className="bg-[color:var(--t-50)] text-[color:var(--t-800)] border border-[color:var(--t-200)] px-2 py-0.5">{tx.browse.mhtc}</span>}
                    {fac.accreditations.map((a: any) => <span key={a.body} className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5">{tx.browse.acc(a.body, a.validUntil)}</span>)}
                  </div>
                  {fac.specialties.length > 0 && <p className="text-sm text-slate-700"><span className="font-bold">{fac.specialties.join(', ')}</span></p>}
                  {fac.languages.length > 0 && <p className="text-sm text-slate-600"><Languages className="inline h-4 w-4 mr-1 -mt-0.5" aria-hidden="true" />{fac.languages.join(', ')}</p>}
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                    {Object.entries(tx.browse.services).filter(([k]) => fac.services?.[k]).map(([k, v]) => {
                      const Icon = SERVICE_ICON[k];
                      return <li key={k} className="inline-flex items-center gap-1.5"><Icon className="h-4 w-4 text-[color:var(--t-700)]" aria-hidden="true" />{v}</li>;
                    })}
                  </ul>
                  <button type="button" onClick={onSignUp} className="mt-auto self-start min-h-[44px] px-5 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer flex items-center gap-2">
                    <Search className="h-4 w-4" aria-hidden="true" />{tx.browse.cta}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {info && (
          <details className="mt-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)]">
            <summary className="cursor-pointer select-none px-5 py-4 font-display font-extrabold text-base text-[color:var(--ink)]">{tx.info.title}</summary>
            <div className="px-5 pb-5 space-y-4 text-sm text-slate-700 font-medium">
              {info.draft && <p className="font-bold text-amber-900 bg-amber-50 border border-amber-200 p-3">{tx.info.draft}</p>}
              {info.sections.map(s => (
                <div key={s.heading}>
                  <h4 className="font-extrabold text-[color:var(--ink)]">{s.heading}</h4>
                  <p className="mt-1 leading-relaxed">{s.body}</p>
                </div>
              ))}
              {L !== 'en' && <p className="text-xs text-slate-600">English only for now.</p>}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
