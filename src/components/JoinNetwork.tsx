import { ArrowRight, Building2, Pill, Stethoscope, Users } from 'lucide-react';
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
      { to: '/for-doctors', t: 'Doctors (MMC)', d: 'Get listed as a verified doctor, take telemedicine bookings, and issue safe digital e-prescriptions.', cta: 'For Doctors' },
      { to: '/for-nurses', t: 'Nurses (LJM)', d: 'Get booked for in-home nursing care, post-surgical wound dressing, and hospital locum shifts.', cta: 'For Nurses' },
      { to: '/for-clinics', t: 'Clinics and hospitals', d: 'Reach international patients, send itemised quotes, and post jobs or find locum cover.', cta: 'For Clinics' },
      { to: '/for-pharmacies', t: 'Pharmacies', d: 'Receive signed prescriptions you can check, offer home delivery and keep your records.', cta: 'For Pharmacies' },
    ],
  },
  ms: {
    eyebrow: 'Sertai rangkaian',
    title: 'Adakah anda doktor, jururawat, klinik atau farmasi?',
    cards: [
      { to: '/for-doctors', t: 'Doktor (MMC)', d: 'Disenaraikan sebagai doktor yang disahkan, terima tempahan teleperubatan dan keluarkan e-preskripsi.', cta: 'Untuk Doktor' },
      { to: '/for-nurses', t: 'Jururawat (LJM)', d: 'Terima tempahan penjagaan kejururawatan rumah, balutan luka pembedahan, dan syif locum.', cta: 'Untuk Jururawat' },
      { to: '/for-clinics', t: 'Klinik dan hospital', d: 'Capai pesakit antarabangsa, hantar sebut harga terperinci, dan siarkan jawatan atau cari ganti locum.', cta: 'Untuk Klinik' },
      { to: '/for-pharmacies', t: 'Farmasi', d: 'Terima preskripsi bertandatangan yang boleh disemak, tawarkan penghantaran ke rumah dan simpan rekod anda.', cta: 'Untuk Farmasi' },
    ],
  },
  zh: {
    eyebrow: '加入网络',
    title: '您是医生、护士、诊所还是药房？',
    cards: [
      { to: '/for-doctors', t: '医生 (MMC)', d: '以认证医生身份列名，接受远程医疗预约并开具安全电子处方。', cta: '医生入口' },
      { to: '/for-nurses', t: '护士 (LJM)', d: '接受上门伤口护理、术后康复护理与医院诊所护士 Locum 排班。', cta: '护士入口' },
      { to: '/for-clinics', t: '诊所和医院', d: '接触国际患者，发送逐项报价，并发布职位或寻找代班人手。', cta: '诊所入口' },
      { to: '/for-pharmacies', t: '药房', d: '接收可核查的已签名处方，提供送药上门并保存您的记录。', cta: '药房入口' },
    ],
  },
};
const ICONS = [Stethoscope, Users, Building2, Pill];

export default function JoinNetwork() {
  const { lang } = useLocale();
  const tx = T[pick(lang)];
  return (
    <section id="join-network" aria-labelledby="join-h" className="bg-white border-b border-[color:var(--t-200)] py-12 sm:py-14 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="eyebrow mb-3">
          <Users className="h-3 w-3 text-[color:var(--t-600)]" />
          {tx.eyebrow}
        </div>
        <h2 id="join-h" className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)] leading-tight">{tx.title}</h2>
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
