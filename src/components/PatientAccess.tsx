import React, { useEffect, useState } from 'react';
import { BadgeCheck, Globe, Heart, LifeBuoy, Receipt, ShieldCheck, Smartphone, Stethoscope } from 'lucide-react';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * Malaysian Resident Patient Access & Accessibility Standards.
 * Every statement reflects live platform capabilities across EN, MS, and ZH.
 */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T: Record<Lang, {
  eyebrow: string; title: string; intro: string;
  localTrust: { badge: string; title: string; desc: string }[];
  cards: { title: string; text: string }[];
  support: { online: string; away: (when: string) => string; hours: string; emergency: string };
  a11y: { title: string; checked: string; doneTitle: string; done: string[]; notTitle: string; not: string[]; report: string };
}> = {
  en: {
    eyebrow: 'Gentle Care for Patients in Malaysia (MyKad)',
    title: 'Warm, Accessible & Transparent Healthcare Across Malaysia',
    intro: 'We are here to support you and your family. Register in minutes with your MyKad, pay easily with local FPX or DuitNow QR, and receive doctor-signed prescriptions with zero hidden fees.',
    localTrust: [
      { badge: 'FPX · DuitNow QR', title: 'Malaysian Payment Rails', desc: 'Pay comfortably in MYR via FPX Online Banking, DuitNow QR, GrabPay, Touch ’n Go eWallet, or Visa/Mastercard.' },
      { badge: 'LHDN Tax-Ready', title: 'Itemised Official MYR Receipts', desc: 'Download official clinical & pharmacy receipts formatted for LHDN individual income tax relief and employer claims.' },
      { badge: 'TPA & Corporate', title: 'Insurer & Panel Reimbursement Ready', desc: 'Receive ICD-10 coded care summaries and itemised bills compatible with PMCare, MiCare, AIA, Prudential, Allianz & Great Eastern.' },
    ],
    cards: [
      { title: 'Thoughtful Multilingual Care', text: 'Feel at home consulting in English, Bahasa Malaysia, or Chinese. Switch your language anytime with a single click.' },
      { title: 'Instant Browser Access (No App Required)', text: 'Access medical care directly in your mobile browser without installing apps, featuring thumb-friendly buttons and high-contrast typography.' },
      { title: 'Transparent Fees & 10-Minute Refund Promise', text: 'Consultation fees (from RM 25 GP / RM 80 Specialist) are shown clearly before payment. If an on-call doctor cannot join within 10 minutes, you are refunded automatically with our apologies.' },
      { title: 'Dignified Identity Verification', text: 'Malaysian citizens and permanent residents register using their 12-digit MyKad; expatriates and visitors can register seamlessly with a passport.' },
      { title: 'Patient Safety & Clinical Boundaries', text: 'Strictly built around MMC telemedicine ethics: acute emergencies trigger immediate 999 routing, and medical certificates (MC) require in-person physical assessment.' },
    ],
    support: {
      online: 'Our patient care desk is online and ready to assist you.',
      away: when => `Our care desk is currently resting. We will warmly reply starting from ${when} Malaysia time.`,
      hours: 'Malaysia Patient Care Desk & Hours',
      emergency: 'If you or a loved one face a medical emergency, please call 999 (or 112 from a mobile) immediately.',
    },
    a11y: {
      title: 'Accessibility & Inclusive Design Commitment',
      checked: 'WCAG 2.1 Level AA Verified · October 2026',
      doneTitle: 'Inclusive Features Implemented For You',
      done: [
        'Keyboard-accessible "Skip to content" navigation, semantic landmarks, labelled form controls, and descriptive alt attributes.',
        'Automated WCAG 2.1 Level A and AA compliance verified across light clinical themes (Sky Blue, Bright Cyan, and Crimson Red).',
        'Touch-friendly 44px minimum target heights and 11px minimum mobile typography for comfortable one-handed phone operation.',
        'Responsive layouts engineered down to 375px viewport width with zero horizontal overflow and reduced-motion support.',
      ],
      notTitle: 'Ongoing Accessibility Roadmap & Known Scope',
      not: [
        'Live video consultations currently rely on text chat fallback rather than automated real-time closed captioning or sign-language relay.',
        'For maximum contrast compliance (WCAG AA 4.5:1), we recommend the default Sky Blue, Bright Cyan, or Crimson Red light themes.',
        'Public pages support English, Bahasa Malaysia, and Chinese; certain specialist clinical sub-screens remain in English.',
      ],
      report: 'Need assistance or encountered an accessibility barrier? Sign in and reach our team via Help & Support.',
    },
  },
  ms: {
    eyebrow: 'Penjagaan Mesra Pesakit di Malaysia (MyKad)',
    title: 'Penjagaan Kesihatan Ikhlas, Telus & Mudah Dicapai di Seluruh Malaysia',
    intro: 'Kami sedia mendampingi anda dan keluarga. Daftar dalam beberapa minit dengan MyKad, bayar dengan mudah melalui FPX atau DuitNow QR, dan dapatkan preskripsi bertandatangan doktor tanpa sebarang caj tersembunyi.',
    localTrust: [
      { badge: 'FPX · DuitNow QR', title: 'Kaedah Pembayaran Tempatan', desc: 'Bayar dengan tenang dalam MYR melalui Perbankan Dalam Talian FPX, DuitNow QR, GrabPay, Touch ’n Go eWallet, atau kad Visa/Mastercard.' },
      { badge: 'Resit Rasmi LHDN', title: 'Resit Rasmi Terperinci MYR', desc: 'Muat turun resit klinikal & farmasi terperinci untuk tuntutan pelepasan cukai perubatan LHDN serta tuntutan majikan.' },
      { badge: 'Panel & Insurans', title: 'Sedia untuk Tuntutan TPA & Korporat', desc: 'Ringkasan klinikal berkod ICD-10 dan invois terperinci sesuai untuk tuntutan PMCare, MiCare, AIA, Prudential, Allianz & Great Eastern.' },
    ],
    cards: [
      { title: 'Antara Muka Tiga Bahasa Yang Prihatin', text: 'Gunakan MedCred dalam Bahasa Malaysia, Inggeris atau Cina dengan tenang, dan tukar bahasa pada bila-bila masa dari bar atas.' },
      { title: 'Akses Terus Tanpa Perlu Muat Turun Aplikasi', text: 'Dapatkan rawatan terus dari pelayar web telefon anda dengan butang sentuhan 44px yang mesra pengguna dan mudah dibaca.' },
      { title: 'Yuran Telus & Jaminan Pulangan 10 Minit', text: 'Yuran (dari RM 25 GP / RM 80 Pakar) dipaparkan jelas sebelum bayaran. Jika tiada doktor menyertai dalam 10 minit, bayaran dipulangkan secara automatik bersama permohonan maaf kami.' },
      { title: 'Pengesahan Identiti Penuh Hormat', text: 'Warganegara Malaysia mendaftar menggunakan nombor MyKad 12 digit; ekspatriat dan pelawat boleh menggunakan nombor pasport.' },
      { title: 'Sempadan Klinikal Untuk Keselamatan Anda', text: 'Dibina berlandaskan etika teleperubatan MMC: gejala kecemasan memaparkan talian 999 serta-merta, dan sijil cuti sakit (MC) memerlukan pemeriksaan fizikal bersemuka.' },
    ],
    support: {
      online: 'Meja prihatin pesakit sedia membantu anda sekarang.',
      away: when => `Meja bantuan sedang berehat. Kami akan membalas dengan ikhlas bermula ${when} waktu Malaysia.`,
      hours: 'Waktu Operasi Sokongan Malaysia',
      emergency: 'Dalam kecemasan perubatan, hubungi 999 (atau 112 dari telefon bimbit) dengan segera.',
    },
    a11y: {
      title: 'Komitmen Kebolehcapaian & Reka Bentuk Inklusif',
      checked: 'Disemak mengikut WCAG 2.1 Tahap AA · Oktober 2026',
      doneTitle: 'Ciri-ciri Inklusif Yang Disediakan',
      done: [
        'Pautan navigasi "Langkau ke kandungan", medan borang berlabel penuh, dan teks alternatif untuk imej.',
        'Pematuhan WCAG 2.1 Tahap A dan AA disahkan pada tema klinikal cerah (Sky Blue, Bright Cyan, dan Crimson Red).',
        'Kawalan sentuhan sekurang-kurangnya 44 piksel tinggi dan saiz teks minimum 11 piksel pada skrin telefon.',
        'Susun atur responsif diuji pada lebar skrin 375 piksel tanpa tatal melintang serta menyokong tetapan kurang pergerakan (reduced motion).',
      ],
      notTitle: 'Skop Semasa & Penambahbaikan Berterusan',
      not: [
        'Konsultasi video langsung menggunakan sembang teks terbina dalam sebagai alternatif kepada sari kata masa nyata automatik.',
        'Untuk kontras bacaan optimum (WCAG AA 4.5:1), kami mengesyorkan tema cerah Sky Blue, Bright Cyan, atau Crimson Red.',
        'Halaman awam tersedia dalam Bahasa Malaysia, Inggeris, dan Cina; beberapa skrin klinikal dalaman masih dalam Bahasa Inggeris.',
      ],
      report: 'Perlukan bantuan atau menghadapi halangan kebolehcapaian? Log masuk dan hubungi pasukan kami melalui Bantuan & Sokongan.',
    },
  },
  zh: {
    eyebrow: '温情守护 · 马来西亚本地患者（MyKad）',
    title: '温暖贴心、公开透明的数字化医疗服务',
    intro: '我们时刻守护您与家人的安康。使用 MyKad 数分钟即可完成注册，支持 FPX 网银与 DuitNow QR 便捷支付，并可获取符合 LHDN 个人所得税减免标准的马币 (MYR) 正式收据。',
    localTrust: [
      { badge: 'FPX · DuitNow QR', title: '本地便捷支付渠道', desc: '支持 FPX 网上银行、DuitNow QR、GrabPay、Touch ’n Go 电子钱包及 Visa/Mastercard 马币结算。' },
      { badge: 'LHDN 报税收据', title: '规范化马币正式医疗收据', desc: '一键下载列明诊金与药费明细的正式收据，适用于马来西亚内陆税收局 (LHDN) 医疗税务减免及雇主报销。' },
      { badge: '保险与企业理赔', title: '全面支持主流 TPA 与商业医保报销', desc: '提供带 ICD-10 诊断编码的诊疗小结与明细账单，方便提交 PMCare、MiCare、AIA、Prudential、Allianz 及 Great Eastern 理赔。' },
    ],
    cards: [
      { title: '无障碍多语言贴心交流', text: '支持中文、英文与马来文无缝切换，让您用最习惯、最舒适的母语与平台和医生沟通。' },
      { title: '手机浏览器即开即用（无需下载）', text: '无需在手机上额外下载应用，在手机或电脑浏览器中直接打开即可问诊，按钮适手，排版柔和清晰。' },
      { title: '收费公开与 10 分钟未接诊退款承诺', text: '付款前清晰展示问诊费用（全科 RM 25 起 / 专科 RM 80 起）。若发起即时问诊后 10 分钟内无在线医生接诊，系统将全额自动退款并致以歉意。' },
      { title: '尊重隐私的实名身份核验', text: '马来西亚公民及居民使用 12 位 MyKad 号码注册；外籍人士与旅客可使用护照号码注册。' },
      { title: '为您的健康把关的安全诊疗边界', text: '严格遵循马来西亚医学委员会 (MMC) 远程医疗指南：危急症状即时提示拨打 999，病假单 (MC) 仅限线下当面就诊或上门出诊后开具。' },
    ],
    support: {
      online: '患者关怀中心当前在线，随时为您服务。',
      away: when => `客服中心当前正在休息。我们将于马来西亚时间 ${when} 起第一时间温暖回复您。`,
      hours: '马来西亚客服支持时间',
      emergency: '如遇紧急医疗情况，请立即拨打 999（手机可拨 112）。',
    },
    a11y: {
      title: '无障碍与包容性关怀承诺',
      checked: '符合 WCAG 2.1 AA 级标准 · 2026年10月',
      doneTitle: '已为您配备的无障碍功能',
      done: [
        '提供键盘可访问的“跳到主要内容”链接、语义化表单标签与图片替代说明文字。',
        '明亮临床主题（Sky Blue、Bright Cyan 与 Crimson Red）均已通过 WCAG 2.1 A 级与 AA 级对比度及可访问性核查。',
        '触屏设备上的所有按钮与输入框高度均不低于 44 像素，手机端字号不小于 11 像素。',
        '全面适配 375 像素手机屏幕宽度，无横向滚动，并支持系统级“减少动态效果”偏好设置。',
      ],
      notTitle: '当前服务范围与持续优化项',
      not: [
        '视频问诊期间可通过内置实时文字聊天辅助沟通，暂未内置自动语音转字幕或手语翻译。',
        '为获得最佳阅读对比度（WCAG AA 4.5:1），建议使用默认的 Sky Blue、Bright Cyan 或 Crimson Red 明亮主题。',
        '公共页面支持中文、马来文与英文；部分专业临床内页目前仍以英文呈现。',
      ],
      report: '在使用中遇到无障碍问题？请登录并通过“帮助与支持”联系我们的客服团队。',
    },
  },
};

const ICONS = [Globe, Smartphone, Receipt, BadgeCheck, Stethoscope];

export default function PatientAccess() {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];
  const [hours, setHours] = useState<{ open: boolean; nextChange: string; text: Record<string, string> } | null>(null);
  useEffect(() => {
    fetch('/api/support/hours').then(r => r.json()).then(d => d.status === 'success' && setHours(d.data)).catch(() => {});
  }, []);
  const when = hours && !hours.open
    ? new Date(hours.nextChange).toLocaleString(L === 'zh' ? 'zh-MY' : L === 'ms' ? 'ms-MY' : 'en-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <section id="access-section" aria-labelledby="access-heading" className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="section-index-badge">04A</span>
          <Heart className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
          {tx.eyebrow}
        </div>
        <h2 id="access-heading" className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">{tx.title}</h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl leading-relaxed">{tx.intro}</p>

        {/* Malaysian Local Payment Rails, LHDN Tax Receipts & TPA Reimbursement Strip */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--t-200)] border border-[color:var(--t-200)] shadow-2xs">
          {tx.localTrust.map(item => (
            <div key={item.title} className="bg-white p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="inline-block text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] mb-2">
                  {item.badge}
                </span>
                <h3 className="font-display font-extrabold text-sm sm:text-base text-[color:var(--ink)]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tx.cards.map((c, i) => {
            const Icon = ICONS[i];
            return (
              <li key={c.title} className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 shadow-2xs">
                <span aria-hidden="true" className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>
                <h3 className="font-display font-extrabold text-base text-[color:var(--ink)] leading-snug">{c.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1.5 font-medium">{c.text}</p>
              </li>
            );
          })}
          <li className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 shadow-2xs">
            <span aria-hidden="true" className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><LifeBuoy className="h-4.5 w-4.5" /></span>
            <h3 className="font-display font-extrabold text-base text-[color:var(--ink)] leading-snug">{tx.support.hours}</h3>
            {hours ? (
              <>
                <p role="status" className="text-sm font-bold mt-1.5 text-[color:var(--ink)] flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${hours.open ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {hours.open ? tx.support.online : tx.support.away(when)}
                </p>
                <p className="text-sm text-slate-600 mt-1 font-medium">{hours.text[L] ?? hours.text.en}</p>
              </>
            ) : null}
            <p className="text-xs text-rose-800 font-bold mt-2.5 pt-2 border-t border-slate-100">{tx.support.emergency}</p>
          </li>
        </ul>

        <details className="mt-8 bg-white border border-[color:var(--t-200)] group">
          <summary className="cursor-pointer select-none px-5 py-4 flex items-center justify-between gap-3 font-display font-extrabold text-sm sm:text-base text-[color:var(--ink)]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" />
              {tx.a11y.title}
            </span>
            <span className="text-xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">{tx.a11y.checked}</span>
          </summary>
          <div className="px-5 pb-5 pt-2 border-t border-[color:var(--t-100)] grid md:grid-cols-2 gap-6 text-sm text-slate-700 font-medium">
            <div>
              <h3 className="font-extrabold text-[color:var(--ink)] mb-2">{tx.a11y.doneTitle}</h3>
              <ul className="list-disc pl-5 space-y-1.5">{tx.a11y.done.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-extrabold text-[color:var(--ink)] mb-2">{tx.a11y.notTitle}</h3>
              <ul className="list-disc pl-5 space-y-1.5">{tx.a11y.not.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <p className="md:col-span-2 text-xs font-bold text-[color:var(--ink)] pt-2 border-t border-slate-100">{tx.a11y.report}</p>
          </div>
        </details>
      </div>
    </section>
  );
}
