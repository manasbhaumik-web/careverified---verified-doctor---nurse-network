import React, { useEffect, useState } from 'react';
import { BadgeCheck, Globe, Heart, LifeBuoy, Receipt, Smartphone, Stethoscope } from 'lucide-react';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * "Easy to reach" for patients in Malaysia, plus an honest accessibility statement. Every line states something the product
 * does today; see docs/ACCESSIBILITY.md for how each one was checked. Malay and Chinese wording is a draft that a native
 * speaker must review before launch (docs/CONTENT_MALAYSIA.md).
 */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T: Record<Lang, {
  eyebrow: string; title: string; intro: string;
  cards: { title: string; text: string }[];
  support: { online: string; away: (when: string) => string; hours: string; emergency: string };
  a11y: { title: string; checked: string; doneTitle: string; done: string[]; notTitle: string; not: string[]; report: string };
}> = {
  en: {
    eyebrow: 'For patients in Malaysia',
    title: 'Care that is easy to reach',
    intro: 'What you can rely on today, and what we have not done yet.',
    cards: [
      { title: 'In your language', text: 'Use MedCred in English, Bahasa Malaysia or Chinese, and change it any time from the top bar. Some screens inside the app are still English only.' },
      { title: 'On your phone', text: 'It works in your phone browser, so there is nothing to install. Buttons are sized for thumbs and text stays readable.' },
      { title: 'See the fee first', text: 'You see the fee before you pay. If you ask for an instant consultation and no doctor joins within 10 minutes, you are refunded automatically.' },
      { title: 'MyKad or passport', text: 'Sign up with your MyKad number. Visitors can use a passport number instead.' },
      { title: 'Know the limits of online care', text: 'A first visit for a long-term condition should be in person, and a medical certificate cannot be issued after a video consultation alone.' },
    ],
    support: {
      online: 'Support is online now.',
      away: when => `Support is away. We reply from ${when} Malaysia time.`,
      hours: 'Support hours',
      emergency: 'In an emergency call 999 (112 from a mobile phone). Do not wait for a reply.',
    },
    a11y: {
      title: 'Accessibility statement',
      checked: 'Last checked 15 October 2026',
      doneTitle: 'What we have done',
      done: [
        'A "Skip to content" link, labelled form fields and text alternatives for images.',
        'An automated check against WCAG 2.1 level A and AA found no failures on this page (Sky Blue, Bright Cyan and Crimson Red themes) or on the main member screens (Sky Blue theme).',
        'On touch screens, buttons and fields are at least 44 pixels tall. Text is never smaller than 11 pixels on phones.',
        'Layouts were checked at phone width (375 pixels) with no sideways scrolling.',
      ],
      notTitle: 'What we have not done',
      not: [
        'We have not tested with a screen reader (NVDA, VoiceOver or TalkBack), so we cannot say it works well with one.',
        'Automated tools find only some problems. Keyboard use and zoom were not tested by people.',
        'There is no text-size or high-contrast control yet.',
        'Video consultations have no captions or sign-language option.',
        'The Dark Navy Blue theme still fails contrast checks. Choose another theme for now.',
        'The tool could not judge text over photos, such as the top banner. Doctor, pharmacy and admin screens, and pop-up windows, have not been checked.',
        'Indonesian and Arabic are not available yet.',
      ],
      report: 'Found a barrier? Sign in and tell us from Help & support. The report goes to our support team.',
    },
  },
  ms: {
    eyebrow: 'Untuk pesakit di Malaysia',
    title: 'Penjagaan yang mudah dicapai',
    intro: 'Apa yang boleh anda harapkan hari ini, dan apa yang belum kami lakukan.',
    cards: [
      { title: 'Dalam bahasa anda', text: 'Gunakan MedCred dalam Bahasa Malaysia, Inggeris atau Cina, dan tukar bila-bila masa dari bar atas. Sesetengah skrin dalam aplikasi masih dalam bahasa Inggeris sahaja.' },
      { title: 'Pada telefon anda', text: 'Ia berfungsi dalam pelayar telefon anda, jadi tiada apa perlu dipasang. Butang bersaiz sesuai untuk ibu jari dan teks kekal mudah dibaca.' },
      { title: 'Lihat yuran dahulu', text: 'Anda melihat yuran sebelum membayar. Jika anda meminta konsultasi segera dan tiada doktor menyertai dalam 10 minit, anda dibayar balik secara automatik.' },
      { title: 'MyKad atau pasport', text: 'Daftar dengan nombor MyKad anda. Pelawat boleh menggunakan nombor pasport.' },
      { title: 'Ketahui had penjagaan dalam talian', text: 'Lawatan pertama bagi penyakit jangka panjang hendaklah secara bersemuka, dan sijil cuti sakit tidak boleh dikeluarkan selepas konsultasi video sahaja.' },
    ],
    support: {
      online: 'Sokongan sedang dalam talian.',
      away: when => `Sokongan tiada buat masa ini. Kami membalas dari ${when} waktu Malaysia.`,
      hours: 'Waktu sokongan',
      emergency: 'Dalam kecemasan, hubungi 999 (112 dari telefon bimbit). Jangan tunggu balasan.',
    },
    a11y: {
      title: 'Kenyataan kebolehcapaian',
      checked: 'Disemak kali terakhir pada 15 Oktober 2026',
      doneTitle: 'Apa yang telah kami lakukan',
      done: [
        'Pautan "Langkau ke kandungan", medan borang berlabel dan teks alternatif untuk imej.',
        'Semakan automatik terhadap WCAG 2.1 tahap A dan AA tidak menemui kegagalan pada halaman ini (tema Sky Blue, Bright Cyan dan Crimson Red) atau pada skrin ahli utama (tema Sky Blue).',
        'Pada skrin sentuh, butang dan medan sekurang-kurangnya 44 piksel tinggi. Teks tidak pernah lebih kecil daripada 11 piksel pada telefon.',
        'Susun atur disemak pada lebar telefon (375 piksel) tanpa tatal ke tepi.',
      ],
      notTitle: 'Apa yang belum kami lakukan',
      not: [
        'Kami belum menguji dengan pembaca skrin (NVDA, VoiceOver atau TalkBack), jadi kami tidak boleh mengatakan ia berfungsi dengan baik.',
        'Alat automatik hanya menemui sebahagian masalah. Penggunaan papan kekunci dan zum belum diuji oleh manusia.',
        'Belum ada kawalan saiz teks atau kontras tinggi.',
        'Konsultasi video tiada sari kata atau pilihan bahasa isyarat.',
        'Tema Dark Navy Blue masih gagal semakan kontras. Pilih tema lain buat masa ini.',
        'Alat itu tidak dapat menilai teks di atas gambar, seperti sepanduk atas. Skrin doktor, farmasi dan pentadbir, serta tetingkap timbul, belum disemak.',
        'Bahasa Indonesia dan Arab belum tersedia.',
      ],
      report: 'Jumpa halangan? Log masuk dan beritahu kami melalui Bantuan & sokongan. Laporan dihantar kepada pasukan sokongan kami.',
    },
  },
  zh: {
    eyebrow: '面向马来西亚的患者',
    title: '便捷可及的医疗服务',
    intro: '您今天可以依靠的功能，以及我们尚未完成的部分。',
    cards: [
      { title: '使用您的语言', text: '可用英文、马来文或中文使用 MedCred，并随时从顶部栏切换。应用内部分页面目前仍只有英文。' },
      { title: '手机上即可使用', text: '在手机浏览器中即可使用，无需安装。按钮大小适合拇指点击，文字保持清晰易读。' },
      { title: '先看费用', text: '付款前您会先看到费用。如果您申请即时问诊而 10 分钟内没有医生加入，将自动退款。' },
      { title: 'MyKad 或护照', text: '可用 MyKad 号码注册。访客可改用护照号码。' },
      { title: '了解线上医疗的限制', text: '长期病症的初诊应当面进行，且仅凭视频问诊不能开具病假证明。' },
    ],
    support: {
      online: '客服目前在线。',
      away: when => `客服暂时不在线。我们将从马来西亚时间 ${when} 起回复。`,
      hours: '客服时间',
      emergency: '紧急情况请拨打 999（手机可拨 112），无需等待回复。',
    },
    a11y: {
      title: '无障碍声明',
      checked: '最后检查日期：2026 年 10 月 15 日',
      doneTitle: '我们已经做到的',
      done: [
        '提供“跳到主要内容”链接、带标签的表单字段和图片替代文字。',
        '本页面（Sky Blue、Bright Cyan 和 Crimson Red 主题）以及主要会员页面（Sky Blue 主题）通过了 WCAG 2.1 A 级和 AA 级的自动检查，未发现失败项。',
        '在触屏设备上，按钮和输入框高度至少 44 像素。手机上文字不小于 11 像素。',
        '已在手机宽度（375 像素）下检查版面，没有横向滚动。',
      ],
      notTitle: '我们尚未做到的',
      not: [
        '我们没有用屏幕阅读器（NVDA、VoiceOver 或 TalkBack）测试，因此不能保证使用体验良好。',
        '自动工具只能发现部分问题。键盘操作和缩放尚未由人工测试。',
        '目前没有文字大小或高对比度选项。',
        '视频问诊没有字幕或手语选项。',
        'Dark Navy Blue 主题仍未通过对比度检查，目前请选用其他主题。',
        '该工具无法判断图片上的文字（例如顶部横幅）。医生、药房和管理员页面以及弹出窗口尚未检查。',
        '暂不提供印尼语和阿拉伯语。',
      ],
      report: '发现障碍？请登录并在“帮助与支持”中告诉我们。反馈会转给我们的客服团队。',
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
    <section id="access-section" aria-labelledby="access-heading" className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-12 sm:py-16 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="eyebrow mb-3">
          <Heart className="h-3 w-3 text-[color:var(--t-600)]" />
          {tx.eyebrow}
        </div>
        <h2 id="access-heading" className="section-title">{tx.title}</h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl">{tx.intro}</p>

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tx.cards.map((c, i) => {
            const Icon = ICONS[i];
            return (
              <li key={c.title} className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5">
                <span aria-hidden="true" className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>
                <h3 className="font-display font-extrabold text-base text-[color:var(--ink)] leading-snug">{c.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1.5 font-medium">{c.text}</p>
              </li>
            );
          })}
          <li className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5">
            <span aria-hidden="true" className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><LifeBuoy className="h-4.5 w-4.5" /></span>
            <h3 className="font-display font-extrabold text-base text-[color:var(--ink)] leading-snug">{tx.support.hours}</h3>
            {hours ? (
              <>
                <p role="status" className="text-sm font-bold mt-1.5 text-[color:var(--ink)]">{hours.open ? tx.support.online : tx.support.away(when)}</p>
                <p className="text-sm text-slate-600 mt-1 font-medium">{hours.text[L] ?? hours.text.en}</p>
              </>
            ) : null}
            <p className="text-sm text-rose-800 font-bold mt-2">{tx.support.emergency}</p>
          </li>
        </ul>

        <details className="mt-8 bg-white border border-[color:var(--t-200)] group">
          <summary className="cursor-pointer select-none px-5 py-4 flex items-center justify-between gap-3 font-display font-extrabold text-base text-[color:var(--ink)]">
            <span>{tx.a11y.title}</span>
            <span className="text-xs font-semibold text-slate-600">{tx.a11y.checked}</span>
          </summary>
          <div className="px-5 pb-5 grid md:grid-cols-2 gap-6 text-sm text-slate-700 font-medium">
            <div>
              <h3 className="font-extrabold text-[color:var(--ink)] mb-2">{tx.a11y.doneTitle}</h3>
              <ul className="list-disc pl-5 space-y-1.5">{tx.a11y.done.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-extrabold text-[color:var(--ink)] mb-2">{tx.a11y.notTitle}</h3>
              <ul className="list-disc pl-5 space-y-1.5">{tx.a11y.not.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <p className="md:col-span-2 font-bold text-[color:var(--ink)]">{tx.a11y.report}</p>
          </div>
        </details>
      </div>
    </section>
  );
}
