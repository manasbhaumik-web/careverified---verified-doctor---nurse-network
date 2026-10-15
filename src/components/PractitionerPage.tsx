import React, { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Building2, ClipboardList, FileSignature, Hourglass, MessageSquare, Pill, Stethoscope, Video, Plane } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import { loginUrl, navigate } from '../nav';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * Recruiting page for doctors and nurses (/for-doctors). Every statement is backed by what the product does today
 * (docs/PRACTITIONER_PAGE.md lists the source of each one). Where something is not done, such as automated payouts, the page
 * says so. The commission comes from the server so it can never drift from what is charged. Malay and Chinese wording is a
 * developer draft for native review.
 */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');
type Item = { t: string; d: string };
interface PayoutTerms { schedule: string; holdDays: number; minimumPayout: number }

const T: Record<Lang, {
  title: string; description: string;
  hero: { eyebrow: string; h1: string; sub: string; join: string; signin: string; who: string };
  steps: { title: string; items: Item[] };
  does: { title: string; items: Item[] };
  paid: { title: string; lead: (pct: number | null) => string; process: (t: PayoutTerms) => string; earnings: string; refunds: string; warnTitle: string; warn: string };
  rules: { title: string; intro: string; items: string[] };
  who: { title: string; yes: string[]; notTitle: string; not: string[] };
  listing: { title: string; items: string[] };
  keep: { title: string; items: string[] };
  cta: { title: string; text: string };
}> = {
  en: {
    title: 'Join as a verified doctor or nurse | MedCred',
    description: 'Get listed as a verified doctor or nurse in Malaysia. How joining works, what you can do on the platform, how you are paid, and the rules you work under.',
    hero: {
      eyebrow: 'For doctors and nurses',
      h1: 'Get found as a verified doctor or nurse',
      sub: 'Patients, clinics and hospitals find you through a public licence lookup. We check your licence by hand, so being listed means something.',
      join: 'Create a practitioner account', signin: 'Sign in',
      who: 'Doctors registered with the Malaysian Medical Council and nurses registered with the Malaysian Nursing Board can join today.',
    },
    steps: {
      title: 'How joining works',
      items: [
        { t: 'Create an account', d: 'Your name, email and a password. You accept the Terms and Privacy Notice, and agree that your credentials may be checked with your council.' },
        { t: 'Send your licence details', d: 'Your licence number, council and expiry date, plus your licence and certificates as PDF, JPG or PNG.' },
        { t: 'We check by hand', d: 'A board reviewer checks your licence against the council register and records how and when. You are notified of the result. We do not promise a review time yet.' },
        { t: 'Go live', d: 'Once verified you appear in the public registry and can take bookings and online consultations.' },
      ],
    },
    does: {
      title: 'What you can do',
      items: [
        { t: 'Bookings you control', d: 'Patients book video, in-person or home visits. You set your own consultation fee.' },
        { t: 'Instant consultations', d: 'Doctors can go online to take consult-now requests. If no doctor joins within 10 minutes the patient is refunded automatically.' },
        { t: 'Safe e-prescriptions', d: 'Doctors sign each prescription. It carries a code and QR that a pharmacy can check, and it is screened for allergies and interactions first. Controlled medicines cannot be e-prescribed.' },
        { t: 'Notes and certificates', d: 'Write and sign visit notes. Doctors can issue medical certificates, for in-person visits only.' },
        { t: 'Locum shifts', d: 'Browse shift and locum postings. Only verified practitioners can apply.' },
        { t: 'International patients', d: 'Practitioners the board assigns to a facility can answer enquiries, send itemised quotes and write discharge summaries.' },
        { t: 'CPD and peer review', d: 'Log your CPD, upload specialty certificates and take part in peer review.' },
        { t: 'Messages and support', d: 'Private messages with patients, and a support desk with response targets and set hours in Malaysia time.' },
      ],
    },
    paid: {
      title: 'How you are paid',
      lead: pct => (pct === null ? 'We take a commission on your consultation fee.' : `We take ${pct}% of your consultation fee.`) + ' It is calculated on your fee before service tax, and service tax is not part of your income.',
      process: t => `Payouts are made by bank transfer, ${t.schedule}. Earnings become payable ${t.holdDays} days after a visit is completed. Anything under RM ${t.minimumPayout} rolls over to the next payout.`,
      earnings: 'Your earnings page lists every paid consultation, the commission, and what is left for you, and you can download a statement for each payout.',
      refunds: 'A refunded consultation is taken out of your earnings. If it was already paid out, it is deducted from your next payout.',
      warnTitle: 'How a payout happens',
      warn: 'You add your bank account in Earnings after you join. The board checks that it is in your own name, prepares each payout and sends the transfer. Nothing is sent automatically, and no income tax is deducted, so speak to an accountant about your own tax.',
    },
    rules: {
      title: 'The rules you work under',
      intro: 'These come from Malaysian guidance and the platform enforces them. They protect you as well as patients.',
      items: [
        'Patients in Malaysia can be treated online only by practitioners registered in Malaysia.',
        'By default, a first visit for a long-term condition must be in person for a patient in Malaysia.',
        'No medical certificate after a video consultation alone, as the Malaysian Medical Council requires.',
        'No e-prescriptions for patients who are abroad, and controlled medicines are never e-prescribed.',
        'The platform is not for emergencies. Patients are told to call 999.',
        'A patient chooses who can see their health record, and each time it is opened it is logged.',
      ],
    },
    who: {
      title: 'Who can join',
      yes: [
        'Doctors registered with the Malaysian Medical Council (MMC), with a current Annual Practising Certificate.',
        'Nurses registered with the Malaysian Nursing Board (LJM).',
        'Doctors and nurses registered in another country can apply. They are checked case by case and can treat patients outside Malaysia only.',
      ],
      notTitle: 'Not yet',
      not: ['Dentists, pharmacists and other professions cannot register yet.', 'An expired licence cannot be accepted.'],
    },
    listing: {
      title: 'What the public sees',
      items: [
        'Once verified, your name, specialty, city, council and licence number appear in the public registry, and anyone can look you up.',
        'Patients who paid for a visit can leave a review. You can report a review that breaks the rules.',
      ],
    },
    keep: {
      title: 'Keeping your listing',
      items: [
        'We track the expiry of your Annual Practising Certificate. If it lapses you are suspended automatically, checked every hour, until you renew.',
        'You are re-verified every 12 months.',
        'Renew by uploading the new certificate from your account.',
      ],
    },
    cta: { title: 'Ready to apply?', text: 'Creating an account does not list you. You are listed only after the board verifies you.' },
  },
  ms: {
    title: 'Sertai sebagai doktor atau jururawat yang disahkan | MedCred',
    description: 'Disenaraikan sebagai doktor atau jururawat yang disahkan di Malaysia. Cara menyertai, apa yang boleh anda lakukan, cara anda dibayar dan peraturan yang anda ikuti.',
    hero: {
      eyebrow: 'Untuk doktor dan jururawat',
      h1: 'Ditemui sebagai doktor atau jururawat yang disahkan',
      sub: 'Pesakit, klinik dan hospital menemui anda melalui semakan lesen awam. Kami menyemak lesen anda secara manual, jadi penyenaraian ini bermakna.',
      join: 'Cipta akaun pengamal', signin: 'Log masuk',
      who: 'Doktor yang berdaftar dengan Majlis Perubatan Malaysia dan jururawat yang berdaftar dengan Lembaga Jururawat Malaysia boleh menyertai hari ini.',
    },
    steps: {
      title: 'Cara menyertai',
      items: [
        { t: 'Cipta akaun', d: 'Nama, e-mel dan kata laluan anda. Anda menerima Terma dan Notis Privasi, dan bersetuju kelayakan anda boleh disemak dengan majlis anda.' },
        { t: 'Hantar butiran lesen', d: 'Nombor lesen, majlis dan tarikh tamat, serta lesen dan sijil anda dalam PDF, JPG atau PNG.' },
        { t: 'Kami menyemak secara manual', d: 'Penyemak lembaga menyemak lesen anda dengan daftar majlis dan merekodkan cara serta masanya. Anda dimaklumkan keputusannya. Kami belum menjanjikan tempoh semakan.' },
        { t: 'Mula beroperasi', d: 'Setelah disahkan, anda muncul dalam daftar awam dan boleh menerima tempahan dan konsultasi dalam talian.' },
      ],
    },
    does: {
      title: 'Apa yang boleh anda lakukan',
      items: [
        { t: 'Tempahan di bawah kawalan anda', d: 'Pesakit menempah lawatan video, bersemuka atau di rumah. Anda menetapkan yuran konsultasi sendiri.' },
        { t: 'Konsultasi segera', d: 'Doktor boleh pergi dalam talian untuk menerima permintaan konsultasi segera. Jika tiada doktor menyertai dalam 10 minit, pesakit dibayar balik secara automatik.' },
        { t: 'E-preskripsi yang selamat', d: 'Doktor menandatangani setiap preskripsi. Ia mempunyai kod dan QR yang boleh disemak oleh farmasi, dan disaring untuk alergi dan interaksi dahulu. Ubat terkawal tidak boleh dipreskripsi secara elektronik.' },
        { t: 'Nota dan sijil', d: 'Tulis dan tandatangani nota lawatan. Doktor boleh mengeluarkan sijil cuti sakit, hanya untuk lawatan bersemuka.' },
        { t: 'Syif locum', d: 'Layari siaran syif dan locum. Hanya pengamal yang disahkan boleh memohon.' },
        { t: 'Pesakit antarabangsa', d: 'Pengamal yang ditugaskan lembaga ke sesebuah kemudahan boleh menjawab pertanyaan, menghantar sebut harga terperinci dan menulis ringkasan discaj.' },
        { t: 'CPD dan semakan rakan sejawat', d: 'Catat CPD anda, muat naik sijil kepakaran dan sertai semakan rakan sejawat.' },
        { t: 'Mesej dan sokongan', d: 'Mesej peribadi dengan pesakit, dan meja sokongan dengan sasaran respons serta waktu tetap dalam waktu Malaysia.' },
      ],
    },
    paid: {
      title: 'Cara anda dibayar',
      lead: pct => (pct === null ? 'Kami mengenakan komisen ke atas yuran konsultasi anda.' : `Kami mengambil ${pct}% daripada yuran konsultasi anda.`) + ' Ia dikira atas yuran anda sebelum cukai perkhidmatan, dan cukai perkhidmatan bukan sebahagian daripada pendapatan anda.',
      process: t => `Bayaran dibuat melalui pindahan bank, ${t.schedule}. Pendapatan boleh dibayar ${t.holdDays} hari selepas lawatan selesai. Jumlah di bawah RM ${t.minimumPayout} dibawa ke bayaran seterusnya.`,
      earnings: 'Halaman pendapatan anda menyenaraikan setiap konsultasi yang dibayar, komisen, dan baki untuk anda, dan anda boleh memuat turun penyata bagi setiap bayaran.',
      refunds: 'Konsultasi yang dibayar balik dikeluarkan daripada pendapatan anda. Jika ia sudah dibayar kepada anda, ia ditolak daripada bayaran seterusnya.',
      warnTitle: 'Bagaimana bayaran dibuat',
      warn: 'Anda menambah akaun bank anda dalam Pendapatan selepas menyertai. Lembaga menyemak ia atas nama anda sendiri, menyediakan setiap bayaran dan menghantar pindahan. Tiada yang dihantar secara automatik, dan tiada cukai pendapatan ditolak, jadi berbincanglah dengan akauntan tentang cukai anda sendiri.',
    },
    rules: {
      title: 'Peraturan yang anda ikuti',
      intro: 'Ini datang daripada garis panduan Malaysia dan dikuatkuasakan oleh platform. Ia melindungi anda dan juga pesakit.',
      items: [
        'Pesakit di Malaysia hanya boleh dirawat dalam talian oleh pengamal yang berdaftar di Malaysia.',
        'Secara lalai, lawatan pertama bagi penyakit jangka panjang mesti bersemuka untuk pesakit di Malaysia.',
        'Tiada sijil cuti sakit selepas konsultasi video sahaja, seperti yang dikehendaki Majlis Perubatan Malaysia.',
        'Tiada e-preskripsi untuk pesakit yang berada di luar negara, dan ubat terkawal tidak pernah dipreskripsi secara elektronik.',
        'Platform ini bukan untuk kecemasan. Pesakit diminta menghubungi 999.',
        'Pesakit memilih siapa boleh melihat rekod kesihatannya, dan setiap kali ia dibuka ia direkodkan.',
      ],
    },
    who: {
      title: 'Siapa boleh menyertai',
      yes: [
        'Doktor yang berdaftar dengan Majlis Perubatan Malaysia (MMC), dengan Sijil Amalan Tahunan (APC) yang sah.',
        'Jururawat yang berdaftar dengan Lembaga Jururawat Malaysia (LJM).',
        'Doktor dan jururawat yang berdaftar di negara lain boleh memohon. Mereka disemak kes demi kes dan hanya boleh merawat pesakit di luar Malaysia.',
      ],
      notTitle: 'Belum lagi',
      not: ['Pergigian, farmasi dan profesion lain belum boleh mendaftar.', 'Lesen yang telah tamat tempoh tidak boleh diterima.'],
    },
    listing: {
      title: 'Apa yang orang ramai lihat',
      items: [
        'Setelah disahkan, nama, kepakaran, bandar, majlis dan nombor lesen anda muncul dalam daftar awam, dan sesiapa boleh menyemak anda.',
        'Pesakit yang membayar untuk lawatan boleh memberi ulasan. Anda boleh melaporkan ulasan yang melanggar peraturan.',
      ],
    },
    keep: {
      title: 'Mengekalkan penyenaraian anda',
      items: [
        'Kami menjejak tarikh tamat Sijil Amalan Tahunan anda. Jika ia luput, anda digantung secara automatik, disemak setiap jam, sehingga anda memperbaruinya.',
        'Anda disahkan semula setiap 12 bulan.',
        'Perbaharui dengan memuat naik sijil baharu daripada akaun anda.',
      ],
    },
    cta: { title: 'Bersedia memohon?', text: 'Mencipta akaun tidak menyenaraikan anda. Anda hanya disenaraikan selepas lembaga mengesahkan anda.' },
  },
  zh: {
    title: '以认证医生或护士身份加入 | MedCred',
    description: '在马来西亚以认证医生或护士身份登记。了解加入流程、平台功能、收入方式和需要遵守的规则。',
    hero: {
      eyebrow: '面向医生和护士',
      h1: '以认证医生或护士的身份被找到',
      sub: '患者、诊所和医院通过公开的执照查询找到您。我们人工核查您的执照，所以列名才有意义。',
      join: '创建医疗人员账户', signin: '登录',
      who: '在马来西亚医药理事会注册的医生和在马来西亚护士局注册的护士，现在即可加入。',
    },
    steps: {
      title: '加入流程',
      items: [
        { t: '创建账户', d: '您的姓名、电子邮件和密码。您接受服务条款和隐私声明，并同意可向您的理事会核实您的资质。' },
        { t: '提交执照资料', d: '执照号码、理事会和到期日，以及 PDF、JPG 或 PNG 格式的执照和证书。' },
        { t: '我们人工核查', d: '委员会审核员会对照理事会名册核查您的执照，并记录核查方式和时间。结果会通知您。我们暂时不承诺审核时限。' },
        { t: '上线', d: '通过认证后，您会出现在公开名册中，并可接受预约和线上问诊。' },
      ],
    },
    does: {
      title: '您可以做什么',
      items: [
        { t: '由您掌控的预约', d: '患者可预约视频、门诊或上门问诊。问诊费由您自己设定。' },
        { t: '即时问诊', d: '医生可上线接收即时问诊请求。如果 10 分钟内没有医生加入，患者会自动退款。' },
        { t: '安全的电子处方', d: '医生签署每张处方，附有药房可核查的代码和二维码，并会先进行过敏和药物相互作用筛查。管制药物不能开电子处方。' },
        { t: '病历记录与证明', d: '撰写并签署问诊记录。医生可开具病假证明，仅限当面就诊。' },
        { t: '代班班次', d: '浏览班次和代班职位。只有通过认证的医疗人员才能申请。' },
        { t: '国际患者', d: '由委员会指派到某家机构的医疗人员，可回复咨询、发送逐项报价并撰写出院小结。' },
        { t: '继续教育与同行评审', d: '记录您的继续教育学分，上传专科证书，并参与同行评审。' },
        { t: '消息与支持', d: '与患者的私密消息，以及设有响应目标和马来西亚时间固定服务时段的支持台。' },
      ],
    },
    paid: {
      title: '您如何获得收入',
      lead: pct => (pct === null ? '我们对您的问诊费收取佣金。' : `我们收取您问诊费的 ${pct}%。`) + ' 佣金按您的诊费（服务税之前）计算，服务税不属于您的收入。',
      process: t => `款项通过银行转账支付，${t.schedule}。问诊完成 ${t.holdDays} 天后，收入才可支付。低于 RM ${t.minimumPayout} 的金额会顺延到下一次付款。`,
      earnings: '您的收入页面会列出每笔已付款问诊、佣金，以及您实得的金额，并可下载每次付款的对账单。',
      refunds: '已退款的问诊会从您的收入中扣除。如果这笔款项已经付给您，会从您下一次的付款中扣减。',
      warnTitle: '付款如何进行',
      warn: '加入后，您在“收入”页面添加银行账户。委员会会核实账户是您本人名下，准备每笔付款并发送转账。没有任何款项会自动发出，也不会扣除所得税，所以请就您自己的税务咨询会计师。',
    },
    rules: {
      title: '您需要遵守的规则',
      intro: '这些规则来自马来西亚的指引，并由平台强制执行。它们既保护患者，也保护您。',
      items: [
        '身在马来西亚的患者，只能由在马来西亚注册的医疗人员进行线上诊治。',
        '默认情况下，身在马来西亚的患者的长期病症初诊必须当面进行。',
        '依照马来西亚医药理事会的要求，仅凭视频问诊不能开具病假证明。',
        '身在国外的患者不能开电子处方，管制药物也绝不能开电子处方。',
        '平台不适用于紧急情况。患者会被告知拨打 999。',
        '患者自行选择谁能查看其健康记录，每次打开都会留有记录。',
      ],
    },
    who: {
      title: '谁可以加入',
      yes: [
        '在马来西亚医药理事会（MMC）注册、持有有效年度执业证书的医生。',
        '在马来西亚护士局（LJM）注册的护士。',
        '在其他国家注册的医生和护士可以申请。我们会逐案核查，他们只能诊治马来西亚境外的患者。',
      ],
      notTitle: '暂不支持',
      not: ['牙医、药剂师和其他专业人员暂时无法注册。', '已过期的执照无法接受。'],
    },
    listing: {
      title: '公众能看到什么',
      items: [
        '通过认证后，您的姓名、专科、城市、理事会和执照号码会出现在公开名册中，任何人都可以查询。',
        '付费就诊的患者可以留下评价。如果评价违反规则，您可以举报。',
      ],
    },
    keep: {
      title: '保持您的列名',
      items: [
        '我们会跟踪您年度执业证书的到期日。如果过期，您会被自动暂停（每小时检查一次），直到您续期。',
        '您每 12 个月需要重新认证。',
        '请在您的账户中上传新证书来续期。',
      ],
    },
    cta: { title: '准备好申请了吗？', text: '创建账户本身不会让您被列名。只有在委员会认证您之后，您才会被列名。' },
  },
};

const DOES_ICONS = [Video, Hourglass, Pill, FileSignature, ClipboardList, Plane, BadgeCheck, MessageSquare];

export default function PractitionerPage() {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];
  const [pct, setPct] = useState<number | null>(null);
  const [payout, setPayout] = useState<PayoutTerms | null>(null);

  useEffect(() => {
    fetch('/api/payments/terms').then(r => r.json()).then(d => { if (d.status !== 'success') return; if (typeof d.data.commissionPct === 'number') setPct(d.data.commissionPct); if (d.data.payout) setPayout(d.data.payout); }).catch(() => {});
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = tx.title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    const prevDesc = meta.content;
    meta.content = tx.description;
    return () => { document.title = prevTitle; if (created) meta!.remove(); else meta!.content = prevDesc; };
  }, [tx.title, tx.description]);

  const join = () => navigate(loginUrl('practitioner', true));
  const signIn = () => navigate(loginUrl('practitioner', false));
  const btnPrimary = 'min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer inline-flex items-center justify-center gap-2';
  const btnSecondary = 'min-h-[48px] px-6 text-sm font-extrabold text-[color:var(--t-700)] bg-white hover:bg-[color:var(--t-100)] border border-[color:var(--t-200)] cursor-pointer inline-flex items-center justify-center';
  const h2 = 'font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)] leading-tight';

  return (
    <div className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">Skip to content</a>

      <header className="sticky top-0 z-40 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-2.5 min-w-0" aria-label="MedCred home">
            <span className="w-9 h-9 shrink-0 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
            </span>
            <span className="font-display font-black text-xl tracking-tight text-[color:var(--ink)]">MedCred<span className="text-[color:var(--t-600)]">.</span></span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={signIn} className="hidden sm:inline-flex min-h-[44px] px-4 text-sm font-bold text-[color:var(--t-700)] hover:underline cursor-pointer items-center">{tx.hero.signin}</button>
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow w-full">
        <section className="bg-white border-b border-[color:var(--t-200)] py-12 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-2">{tx.hero.eyebrow}</p>
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.1] max-w-3xl">{tx.hero.h1}</h1>
            <p className="text-base sm:text-lg text-slate-700 font-medium mt-4 max-w-2xl leading-relaxed">{tx.hero.sub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={join} className={btnPrimary}>{tx.hero.join}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={signIn} className={btnSecondary}>{tx.hero.signin}</button>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700 max-w-2xl">{tx.hero.who}</p>
          </div>
        </section>

        <section aria-labelledby="steps-h" className="py-12 sm:py-16 border-b border-[color:var(--t-200)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 id="steps-h" className={h2}>{tx.steps.title}</h2>
            <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tx.steps.items.map((s, i) => (
                <li key={s.t} className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5">
                  <span className="font-display font-black text-3xl text-[color:var(--t-700)]" aria-hidden="true">{i + 1}</span>
                  <h3 className="font-display font-extrabold text-base mt-1">{s.t}</h3>
                  <p className="text-sm text-slate-700 mt-1.5 leading-relaxed font-medium">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="does-h" className="py-12 sm:py-16 bg-[color:var(--t-50)] border-b border-[color:var(--t-200)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 id="does-h" className={h2}>{tx.does.title}</h2>
            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tx.does.items.map((it, i) => {
                const Icon = DOES_ICONS[i] ?? Stethoscope;
                return (
                  <li key={it.t} className="bg-white border border-[color:var(--t-200)] p-5">
                    <span aria-hidden="true" className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>
                    <h3 className="font-display font-extrabold text-base leading-snug">{it.t}</h3>
                    <p className="text-sm text-slate-700 mt-1.5 leading-relaxed font-medium">{it.d}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="paid-h" className="py-12 sm:py-16 border-b border-[color:var(--t-200)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8">
            <div>
              <h2 id="paid-h" className={h2}>{tx.paid.title}</h2>
              <p className="mt-4 text-base text-slate-800 font-semibold leading-relaxed">{tx.paid.lead(pct)}</p>
              {payout && <p className="mt-3 text-sm text-slate-800 font-semibold leading-relaxed">{tx.paid.process(payout)}</p>}
              <p className="mt-3 text-sm text-slate-700 font-medium leading-relaxed">{tx.paid.earnings}</p>
              <p className="mt-2 text-sm text-slate-700 font-medium leading-relaxed">{tx.paid.refunds}</p>
            </div>
            <div role="note" className="bg-amber-50 border border-amber-300 p-5 self-start">
              <h3 className="font-display font-extrabold text-base text-amber-950">{tx.paid.warnTitle}</h3>
              <p className="text-sm text-amber-950 mt-1.5 leading-relaxed font-medium">{tx.paid.warn}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="rules-h" className="py-12 sm:py-16 bg-[color:var(--t-50)] border-b border-[color:var(--t-200)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 id="rules-h" className={h2}>{tx.rules.title}</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-700 font-medium max-w-2xl">{tx.rules.intro}</p>
            <ul className="mt-6 grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-800 font-medium list-disc pl-5">
              {tx.rules.items.map(r => <li key={r} className="leading-relaxed">{r}</li>)}
            </ul>
          </div>
        </section>

        <section aria-labelledby="who-h" className="py-12 sm:py-16 border-b border-[color:var(--t-200)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8">
            <div>
              <h2 id="who-h" className={h2}>{tx.who.title}</h2>
              <ul className="mt-5 space-y-3 text-sm text-slate-800 font-medium list-disc pl-5">{tx.who.yes.map(x => <li key={x} className="leading-relaxed">{x}</li>)}</ul>
              <h3 className="font-display font-extrabold text-base mt-6">{tx.who.notTitle}</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700 font-medium list-disc pl-5">{tx.who.not.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <div className="grid gap-8 content-start">
              <div>
                <h2 className={h2}>{tx.listing.title}</h2>
                <ul className="mt-5 space-y-3 text-sm text-slate-800 font-medium list-disc pl-5">{tx.listing.items.map(x => <li key={x} className="leading-relaxed">{x}</li>)}</ul>
              </div>
              <div>
                <h2 className={h2}>{tx.keep.title}</h2>
                <ul className="mt-5 space-y-3 text-sm text-slate-800 font-medium list-disc pl-5">{tx.keep.items.map(x => <li key={x} className="leading-relaxed">{x}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="cta-h" className="py-12 sm:py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <Building2 className="h-8 w-8 mx-auto text-[color:var(--t-700)]" aria-hidden="true" />
            <h2 id="cta-h" className={`${h2} mt-3`}>{tx.cta.title}</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-700 font-medium max-w-xl mx-auto">{tx.cta.text}</p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button type="button" onClick={join} className={btnPrimary}>{tx.hero.join}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={signIn} className={btnSecondary}>{tx.hero.signin}</button>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
