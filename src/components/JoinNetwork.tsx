import React from 'react';
import { ArrowRight, Building2, Pill, Stethoscope } from 'lucide-react';
import { navigate } from '../nav';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/** Landing page doors for the supply side: doctors and nurses, clinics and hospitals, pharmacies. Malay and Chinese are a draft for native review. */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T: Record<Lang, { eyebrow: string; title: string; cards: { to: string; t: string; d: string; cta: string }[] }> = {
  en: {
    eyebrow: 'Join the network',
    title: 'Are you a doctor, nurse, clinic or pharmacy?',
    cards: [
      { to: '/for-doctors', t: 'Doctors and nurses', d: 'Get listed as a verified practitioner, take bookings and consultations, and find locum shifts.', cta: 'See how joining works' },
      { to: '/for-clinics', t: 'Clinics and hospitals', d: 'Reach international patients, send itemised quotes, and post jobs or find locum cover.', cta: 'See what you get' },
      { to: '/for-pharmacies', t: 'Pharmacies', d: 'Receive signed prescriptions you can check, offer home delivery and keep your records.', cta: 'See what you get' },
    ],
  },
  ms: {
    eyebrow: 'Sertai rangkaian',
    title: 'Adakah anda doktor, jururawat, klinik atau farmasi?',
    cards: [
      { to: '/for-doctors', t: 'Doktor dan jururawat', d: 'Disenaraikan sebagai pengamal yang disahkan, terima tempahan dan konsultasi, dan cari syif locum.', cta: 'Lihat cara menyertai' },
      { to: '/for-clinics', t: 'Klinik dan hospital', d: 'Capai pesakit antarabangsa, hantar sebut harga terperinci, dan siarkan jawatan atau cari ganti locum.', cta: 'Lihat apa yang anda dapat' },
      { to: '/for-pharmacies', t: 'Farmasi', d: 'Terima preskripsi bertandatangan yang boleh disemak, tawarkan penghantaran ke rumah dan simpan rekod anda.', cta: 'Lihat apa yang anda dapat' },
    ],
  },
  zh: {
    eyebrow: '加入网络',
    title: '您是医生、护士、诊所还是药房？',
    cards: [
      { to: '/for-doctors', t: '医生和护士', d: '以认证医疗人员身份列名，接受预约和问诊，并寻找代班班次。', cta: '了解加入流程' },
      { to: '/for-clinics', t: '诊所和医院', d: '接触国际患者，发送逐项报价，并发布职位或寻找代班人手。', cta: '了解您能得到什么' },
      { to: '/for-pharmacies', t: '药房', d: '接收可核查的已签名处方，提供送药上门并保存您的记录。', cta: '了解您能得到什么' },
    ],
  },
};
const ICONS = [Stethoscope, Building2, Pill];

export default function JoinNetwork() {
  const { lang } = useLocale();
  const tx = T[pick(lang)];
  return (
    <section id="join-network" aria-labelledby="join-h" className="bg-white border-b border-[color:var(--t-200)] py-12 sm:py-14 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-2">{tx.eyebrow}</p>
        <h2 id="join-h" className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)] leading-tight">{tx.title}</h2>
        <ul className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {tx.cards.map((c, i) => {
            const Icon = ICONS[i];
            return (
              <li key={c.to} className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 flex flex-col">
                <span aria-hidden="true" className="w-9 h-9 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>
                <h3 className="font-display font-extrabold text-lg text-[color:var(--ink)]">{c.t}</h3>
                <p className="text-sm text-slate-700 leading-relaxed mt-1.5 font-medium">{c.d}</p>
                <a href={c.to} onClick={e => { e.preventDefault(); navigate(c.to); }} className="mt-auto pt-4 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-extrabold text-[color:var(--t-700)] hover:underline">
                  {c.cta}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
