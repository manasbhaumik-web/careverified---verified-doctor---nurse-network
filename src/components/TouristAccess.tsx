import React, { useEffect, useState } from 'react';
import { BadgeCheck, Building2, Car, FileText, Languages, Plane, Search, Utensils, HeartHandshake, ShieldCheck, ArrowRight, Globe } from 'lucide-react';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * International Patient & Medical Tourism Access.
 * Presents verified hospital discovery, multi-currency indicative MYR quotes,
 * 3-stage cross-border pathway, and pre-travel guidance across EN, MS, ZH, ID, and AR.
 */
type Lang = 'en' | 'ms' | 'zh' | 'id' | 'ar';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' || l === 'id' || l === 'ar' ? l : 'en');

type FxCurrency = 'MYR' | 'USD' | 'SGD' | 'IDR' | 'AUD' | 'SAR';
const FX_RATES: Record<FxCurrency, { rate: number; symbol: string; label: string }> = {
  MYR: { rate: 1, symbol: 'RM ', label: 'MYR (Official Billing)' },
  USD: { rate: 0.228, symbol: 'US$', label: 'USD (US Dollar)' },
  SGD: { rate: 0.305, symbol: 'S$', label: 'SGD (Singapore)' },
  IDR: { rate: 3580, symbol: 'Rp ', label: 'IDR (Rupiah)' },
  AUD: { rate: 0.348, symbol: 'A$', label: 'AUD (Australia)' },
  SAR: { rate: 0.855, symbol: 'SAR ', label: 'SAR (Saudi Riyal)' },
};

function formatFx(myrAmount: number, currency: FxCurrency): string {
  const { rate, symbol } = FX_RATES[currency];
  const converted = Math.round(myrAmount * rate);
  return `${symbol}${converted.toLocaleString('en-US')}`;
}

const SAMPLE_PACKAGES = [
  { id: 'exec-screen', myr: 1280, hub: 'Kuala Lumpur · Penang · JB', code: 'PKG-EXEC-01' },
  { id: 'cardio-workup', myr: 3200, hub: 'Kuala Lumpur · Penang', code: 'PKG-CARD-02' },
  { id: 'ortho-knee', myr: 28500, hub: 'Kuala Lumpur · Penang · Melaka', code: 'PKG-ORTH-03' },
  { id: 'ivf-cycle', myr: 18500, hub: 'Kuala Lumpur · Penang · JB', code: 'PKG-FERT-04' },
];

const T: Record<Lang, {
  eyebrow: string; title: string; intro: string;
  pathwayTitle: string;
  pathway: { step: string; title: string; text: string }[];
  fxTitle: string; fxSubtitle: string; fxDisclaimer: string;
  packages: { title: string; duration: string; includes: string }[];
  cards: { title: string; text: string }[];
  scopeNote: string;
  browse: {
    title: string; note: string; hubsLabel: string; allHubs: string;
    q: string; specialty: string; language: string; anyAcc: string; anyService: string;
    empty: string; mhtc: string; licence: string; acc: (body: string, until: string) => string;
    cta: string; services: Record<string, string>; loading: string;
  };
  info: { title: string; advisory: string };
  langNote: string;
}> = {
  en: {
    eyebrow: 'Welcoming You to Malaysia · International Patients & Medical Travellers',
    title: 'Gentle, transparent guidance for your healing journey in Malaysia.',
    intro: 'Traveling for medical care can feel daunting. We are here to guide you with care and complete honesty—helping you explore JCI and MSQH accredited Malaysian hospitals in Kuala Lumpur, Penang, Johor Bahru, and Melaka with clear itemised quotes before you ever board a plane.',
    pathwayTitle: 'Your 3-Stage Cross-Border Care Journey',
    pathway: [
      { step: '01 · Pre-Travel', title: 'Kind Pre-Travel Guidance & Transparent MYR Quote', text: 'Share your diagnostic reports peacefully, consult with an NSR-verified specialist by video from home, and receive a clear, itemised hospital quotation in Malaysian Ringgit (MYR).' },
      { step: '02 · In-Malaysia', title: 'Warm Hospital Welcome & Accompanied Care', text: 'Arrive with peace of mind. Receive airport assistance, multi-lingual interpreters (ID, ZH, AR, EN), and compassionate care directly settled with your chosen accredited hospital.' },
      { step: '03 · Post-Return', title: 'Continuous Support & Safe Transition Home', text: 'We remain by your side even after you return. Share bilingual discharge summaries securely with your home doctor and consult via recovery video check-ins.' },
    ],
    fxTitle: 'Indicative Malaysian Hospital Package Benchmarks',
    fxSubtitle: 'All hospitals bill officially in Malaysian Ringgit (MYR). Select your home currency for an indicative comparison:',
    fxDisclaimer: 'Indicative reference rates only. Final itemised quotes and inpatient settlement are conducted directly with your chosen hospital in MYR (via Visa, Mastercard, Amex, or international telegraphic transfer).',
    packages: [
      { title: 'Executive Full-Body & Tumour Marker Screening', duration: '1 Day Outpatient', includes: '60+ blood panels, ECG, ultrasound, chest X-ray & specialist review' },
      { title: 'Comprehensive Cardiac CT Angiogram & Echo Suite', duration: '1–2 Days Outpatient', includes: 'Coronary CT angiogram, 2D echocardiogram, stress test & cardiologist consult' },
      { title: 'Robotic / Total Knee Replacement Package', duration: '4–5 Days Inpatient', includes: 'Surgeon & anaesthetist fees, implant, private room & initial physiotherapy' },
      { title: 'IVF & Fertility Assessment + Cycle Package', duration: '2–3 Weeks Outpatient', includes: 'Hormonal profile, stimulation monitoring, oocyte retrieval & embryo transfer' },
    ],
    cards: [
      { title: 'Gentle Passport-First Registration', text: 'No Malaysian MyKad required. Register smoothly using your international passport number, nationality, and date of birth so our team can assist you without unnecessary friction.' },
      { title: 'Honest, Itemised Quotes in MYR', text: 'We believe financial clarity relieves stress. Receive structured quotations detailing clinical care, hospital fees, inclusions, and cancellation terms with zero hidden costs.' },
      { title: 'Carefully Hand-Verified Accreditations', text: 'We display JCI, MSQH, and MHTC badges only after our medical board has manually verified the hospital’s licence and recorded its expiry date.' },
      { title: 'Your Medical Privacy is Sacred', text: 'Receiving hospitals view your passport copy and diagnostic files only when you explicitly grant consent on an enquiry—and you can revoke access anytime.' },
      { title: 'Caring Continuity for Your Family Doctor', text: 'Healing is collaborative. Share your bilingual discharge summary with your physician back home via an encrypted, time-limited link you control.' },
      { title: 'Thoughtful Cross-Border Clinical Support', text: 'Malaysian doctors provide pre-travel case reviews and in-person care; e-prescriptions are dispensed within Malaysia only, and visa/entry rules should be confirmed with the Malaysian embassy.' },
    ],
    scopeNote: 'Direct Hospital Settlement: Treatment deposits, inpatient bills, and visa/travel logistics are coordinated directly with your chosen hospital rather than billed inside the app.',
    browse: {
      title: 'Browse Verified Malaysian Hospitals & Specialist Centres',
      note: 'Every listed facility has been manually verified by our board for KKM Act 586 licensing and active JCI / MSQH accreditation.',
      hubsLabel: 'Quick Filter by Medical Hub:', allHubs: 'All Malaysia Hubs',
      q: 'Hospital name or city (e.g. Kuala Lumpur, Penang)', specialty: 'Specialty, e.g. Cardiology, Oncology', language: 'Interpreter language, e.g. Arabic, Mandarin', anyAcc: 'Any accreditation (JCI / MSQH)', anyService: 'Any concierge service',
      empty: 'No facilities match your current filters.', mhtc: 'MHTC Member Facility', licence: 'Act 586 Licence Checked',
      acc: (b, u) => `${b} Accredited (until ${u})`, cta: 'Register with Passport to Send Enquiry', loading: 'Loading verified facilities…',
      services: { interpreter: 'Medical Interpreter', airportPickup: 'Airport Transfer', halalFood: 'Halal Dining', prayerRoom: 'Prayer Room' },
    },
    info: { title: 'Pre-Travel & Malaysian Entry Reference Guide', advisory: 'General pre-travel guidance for international patients. Always confirm current visa, entry, and clinical requirements with the nearest Malaysian Embassy, Immigration Department, and your receiving hospital.' },
    langNote: 'Platform interface available in English, Bahasa Malaysia, Chinese, Bahasa Indonesia, and Arabic. Each hospital listing indicates available on-site medical interpreters.',
  },
  ms: {
    eyebrow: 'Menyambut Kehadiran Anda · Pesakit Antarabangsa & Pelancong Perubatan',
    title: 'Panduan ikhlas dan telus untuk perjalanan pemulihan anda di Malaysia.',
    intro: 'Perjalanan untuk mendapatkan rawatan perubatan memerlukan keyakinan dan ketenangan fikiran. Kami sedia membimbing anda dengan penuh keprihatinan—membantu anda meneroka hospital bertauliah JCI dan MSQH di Kuala Lumpur, Pulau Pinang, Johor Bahru, dan Melaka bersama sebut harga telus sebelum anda berlepas.',
    pathwayTitle: 'Perjalanan Rawatan Rentas Sempadan 3 Fasa Yang Prihatin',
    pathway: [
      { step: '01 · Pra-Perjalanan', title: 'Bimbingan Pra-Perjalanan & Sebut Harga Telus MYR', text: 'Kongsikan laporan perubatan anda dengan tenang, bincang bersama pakar bertauliah NSR melalui panggilan video, dan terima anggaran rasmi hospital dalam Ringgit Malaysia (MYR).' },
      { step: '02 · Di Malaysia', title: 'Sambutan Mesra & Penjagaan Hospital Bertauliah', text: 'Tiba dengan hati yang tenang. Nikmati bantuan ketibaan, jurubahasa dwibahasa di lokasi, serta penjagaan klinikal yang diselesaikan terus bersama hospital bertauliah.' },
      { step: '03 · Pasca-Pulang', title: 'Kesinambungan Penjagaan Bersama Doktor Anda', text: 'Pemulihan anda sentiasa di hati kami. Kongsikan ringkasan discaj dwibahasa bersama doktor di negara asal anda melalui pautan sulit bertempoh yang selamat.' },
    ],
    fxTitle: 'Anggaran Pakej Rujukan Hospital Malaysia',
    fxSubtitle: 'Semua hospital mengebil secara rasmi dalam Ringgit Malaysia (MYR). Pilih mata wang anda untuk perbandingan anggaran:',
    fxDisclaimer: 'Kadar pertukaran anggaran sahaja. Sebut harga rasmi dan penyelesaian bil pesakit dalam dibuat terus dengan hospital pilihan anda dalam MYR.',
    packages: [
      { title: 'Saringan Kesihatan Eksekutif & Penanda Tumor', duration: '1 Hari Pesakit Luar', includes: '60+ ujian darah, ECG, ultrabunyi, X-ray dada & semakan pakar' },
      { title: 'Pakej CT Angiogram Jantung & Ekokardiogram', duration: '1–2 Hari Pesakit Luar', includes: 'CT angiogram koronari, ekokardiogram 2D, ujian stres & konsultasi pakar jantung' },
      { title: 'Pakej Penggantian Lutut Penuh / Robotik', duration: '4–5 Hari Pesakit Dalam', includes: 'Yuran pakar bedah & bius, implan, bilik peribadi & fisioterapi awal' },
      { title: 'Penilaian Kesuburan & Pakej Kitaran IVF', duration: '2–3 Minggu Pesakit Luar', includes: 'Profil hormon, pemantauan rangsangan, pengambilan oosit & pemindahan embrio' },
    ],
    cards: [
      { title: 'Pendaftaran Mesra Menggunakan Pasport', text: 'Tidak perlu MyKad. Daftar dengan mudah menggunakan pasport antarabangsa agar pasukan kami dapat membantu anda tanpa halangan birokrasi.' },
      { title: 'Sebut Harga Berstruktur & Telus dalam MYR', text: 'Ketelusan kos membantu mengurangkan kebimbangan. Terima sebut harga rasmi hospital yang memperincikan kos prosedur dan kemudahan tanpa sebarang caj tersembunyi.' },
      { title: 'Akreditasi JCI & MSQH Disemak Teliti', text: 'Lencana JCI, MSQH, dan MHTC hanya dipaparkan selepas dewan klinikal kami mengesahkan lesen dan kelayakan hospital secara manual.' },
      { title: 'Privasi Rekod Perubatan Anda Dilindungi Sepenuhnya', text: 'Hospital pilihan anda hanya boleh melihat dokumen perubatan apabila anda memberi kebenaran, dan anda bebas menarik balik akses pada bila-bila masa.' },
      { title: 'Pautan Selamat untuk Doktor Keluarga Anda', text: 'Kesinambungan rawatan amat penting. Kongsikan ringkasan discaj bersama doktor di tanah air melalui pautan sulit bagi memastikan pemulihan yang lancar.' },
      { title: 'Penjagaan Klinikal Rentas Sempadan Beretika', text: 'Pakar perubatan Malaysia menyediakan semakan kes yang teliti dan rawatan bersemuka. Kami sedia membantu anda memahami garis panduan perjalanan sebelum berlepas.' },
    ],
    scopeNote: 'Penyelesaian Terus Bersama Hospital: Deposit rawatan, bil pesakit dalam, dan urusan perjalanan diselesaikan terus dengan hospital pilihan anda.',
    browse: {
      title: 'Layari Hospital & Pusat Pakar Malaysia yang Disahkan',
      note: 'Setiap kemudahan disenaraikan selepas disemak lesen Akta 586 KKM serta sijil akreditasi JCI / MSQH oleh pasukan kami.',
      hubsLabel: 'Tapis Mengikut Hab Perubatan:', allHubs: 'Semua Hab Malaysia',
      q: 'Nama hospital atau bandar (cth. Kuala Lumpur, Pulau Pinang)', specialty: 'Kepakaran, cth. Kardiologi', language: 'Bahasa jurubahasa, cth. Arab', anyAcc: 'Semua akreditasi (JCI / MSQH)', anyService: 'Semua perkhidmatan',
      empty: 'Tiada kemudahan yang sepadan dengan tapisan semasa.', mhtc: 'Ahli MHTC', licence: 'Lesen Akta 586 Disemak',
      acc: (b, u) => `Diakreditasi ${b} (hingga ${u})`, cta: 'Daftar dengan Pasport untuk Pertanyaan', loading: 'Memuatkan kemudahan disahkan…',
      services: { interpreter: 'Jurubahasa Perubatan', airportPickup: 'Jemputan Lapangan Terbang', halalFood: 'Makanan Halal', prayerRoom: 'Surau / Bilik Solat' },
    },
    info: { title: 'Panduan Rujukan Pra-Perjalanan & Kemasukan Malaysia', advisory: 'Maklumat rujukan umum untuk pesakit antarabangsa. Sila sahkan keperluan visa dan kemasukan terkini dengan Kedutaan Malaysia, Jabatan Imigresen, dan hospital penerima anda.' },
    langNote: 'Aplikasi tersedia dalam Bahasa Malaysia, Inggeris, Cina, Indonesia, dan Arab. Setiap penyenaraian hospital memaparkan ketersediaan jurubahasa perubatan di lokasi.',
  },
  zh: {
    eyebrow: '诚挚守护 · 国际患者与跨境医疗关怀',
    title: '为您在马来西亚的康复之旅，提供温暖、严谨与透明的全程指引',
    intro: '跨国求医是一段需要莫大勇气与信任的旅程。我们怀揣敬畏与关怀之心，协助您在行前清晰了解吉隆坡、槟城、新山与马六甲经 JCI 与 MSQH 严格认证的马来西亚医院，获取公开透明的马币明细报价，让您的求医之路更加安心从容。',
    pathwayTitle: '安心赴马就医 3 阶段温情全流程',
    pathway: [
      { step: '01 · 行前关怀', title: '行前细致评估与马币透明报价', text: '安心上传您的诊断报告，与马来西亚 NSR 认证专科医生在线视频探讨诊疗方案，提前获取医院出具的规范化马币 (MYR) 明细报价。' },
      { step: '02 · 在马照护', title: '专业陪同入院与全方位贴心照拂', text: '抵马即享机场接送协助与院内多语种医学翻译服务，感受严谨细致的医疗关怀，费用直接与医院透明结算。' },
      { step: '03 · 归国康复', title: '跨国病历无缝衔接与远程随访', text: '您的康复依然牵动着我们。通过安全加密的限时链接，将中英双语出院小结交予国内主治医生，并可预约视频复诊关怀。' },
    ],
    fxTitle: '马来西亚认证医院常见专科套餐参考价',
    fxSubtitle: '所有医疗机构均以马来西亚林吉特 (MYR) 官方结算。切换您的常用货币查看参考折算金额：',
    fxDisclaimer: '以上汇率折算仅供参考。最终逐项报价与住院结算均以马币 (MYR) 直接与您选定的医院通过 Visa、Mastercard 或国际电汇完成。',
    packages: [
      { title: '高管全身精密体检与肿瘤标志物筛查', duration: '1 天门诊', includes: '60+ 项血液指标、心电图、腹部超声、胸片及专科医生报告解读' },
      { title: '心脏冠脉 CT 造影与心脏超声精密评估', duration: '1–2 天门诊', includes: '冠脉 CT 血管造影、2D 心脏彩超、运动负荷试验及心内科专家会诊' },
      { title: '机器人辅助 / 全膝关节置换手术套餐', duration: '4–5 天住院', includes: '主刀与麻醉医师费、人工关节耗材、单人病房及术后早期康复理疗' },
      { title: 'IVF 试管婴儿生育评估与周期套餐', duration: '2–3 周门诊', includes: '全套激素评估、促排卵监测、取卵手术、胚胎培养及移植' },
    ],
    cards: [
      { title: '护照一键便捷注册', text: '无需马来西亚身份证。仅凭国际护照号码、国籍与出生日期即可开通国际患者账户，开启顺畅咨询。' },
      { title: '马币 (MYR) 逐项透明报价', text: '财务透明能最大程度缓解患者顾虑。清晰规范列明手术及诊疗费、包含项目与退改政策，绝无隐藏费用。' },
      { title: '严谨的人工核验资质', text: '所有 JCI、MSQH 及 MHTC 权威认证徽章均由临床委员会人工核实证书原件并记录有效期，绝不弄虚作假。' },
      { title: '敬畏并严密守护您的病历隐私', text: '仅在您提交咨询并明确授权时，目标医院方可查阅您的护照副本与病历资料；您可随时一键撤销授权。' },
      { title: '与国内主治医生无缝衔接', text: '医疗照护需要连续性。完成治疗出院后，您可通过可随时撤销的限时加密链接，将双语出院小结安全分享给国内医生。' },
      { title: '恪守医疗伦理与合规指引', text: '马来西亚电子处方仅限境内持牌药房调配。出行前我们协助您了解使领馆签证与医疗入境指引，让旅途安心无忧。' },
    ],
    scopeNote: '医院直接结算说明：住院押金、医疗账单及签证差旅安排均由您与所选医疗机构直接对接结算，平台不代收住院医疗押金。',
    browse: {
      title: '浏览欢迎国际患者的马来西亚认证医院',
      note: '名录中的每家医疗机构均已通过卫生部第 586 号法令执照及 JCI / MSQH 认证有效期核验。',
      hubsLabel: '按医疗中心城市快速筛选：', allHubs: '全部马来西亚城市',
      q: '医院名称或城市（如吉隆坡、槟城）', specialty: '临床专科，如心脏科、肿瘤科', language: '翻译语种，如中文、阿拉伯语', anyAcc: '全部权威认证 (JCI / MSQH)', anyService: '全部国际陪同服务',
      empty: '暂无符合当前筛选条件的医疗机构。', mhtc: 'MHTC 官方成员机构', licence: '第 586 法令执照已核验',
      acc: (b, u) => `${b} 认证（有效期至 ${u}）`, cta: '使用护照注册并发送咨询', loading: '正在加载认证医疗机构…',
      services: { interpreter: '医学口译员', airportPickup: '机场专车接送', halalFood: '清真营养餐', prayerRoom: '祈祷室' },
    },
    info: { title: '国际患者赴马就医与入境参考指南', advisory: '以下为国际患者赴马就医通用参考信息。具体签证、入境政策与住院流程请以马来西亚使领馆、移民局及接诊医院最新通知为准。' },
    langNote: '平台界面支持中文、英文、马来文、印尼文与阿拉伯文。每家医院资料均标明院内是否配备专职医学翻译。',
  },
  id: {
    eyebrow: 'Menyambut Hangat Kedatangan Anda · Pasien Internasional & Wisata Medis',
    title: 'Panduan tulus, transparan, dan penuh kepedulian untuk pengobatan Anda di Malaysia.',
    intro: 'Menjalani pengobatan di luar negeri membutuhkan ketenangan hati dan rasa percaya. Kami hadir untuk mendampingi Anda dengan penuh kepedulian—membantu Anda menemukan rumah sakit terakreditasi JCI dan MSQH di Kuala Lumpur, Penang, Johor Bahru, dan Melaka dengan rincian biaya yang transparan sebelum keberangkatan.',
    pathwayTitle: '3 Tahap Perjalanan Pengobatan yang Tenang & Terarah',
    pathway: [
      { step: '01 · Pra-Keberangkatan', title: 'Konsultasi Awal yang Tenang & Rincian Biaya MYR', text: 'Unggah hasil pemeriksaan medis Anda dari tanah air, diskusikan melalui video bersama dokter spesialis terverifikasi NSR, dan terima rincian biaya resmi dari rumah sakit dalam MYR.' },
      { step: '02 · Di Malaysia', title: 'Penyambutan Hangat & Pelayanan Rumah Sakit Terpercaya', text: 'Tiba dengan tenang. Dapatkan bantuan penjemputan, penerjemah medis berpengalaman, dan nikmati pelayanan klinis yang profesional dengan pembayaran langsung ke RS.' },
      { step: '03 · Pemulihan di Rumah', title: 'Dukungan Berkelanjutan & Koordinasi Dokter di Tanah Air', text: 'Kesembuhan Anda adalah prioritas kami. Bagikan ringkasan pulang medis kepada dokter Anda di Indonesia melalui tautan aman berbatas waktu untuk pemantauan pemulihan.' },
    ],
    fxTitle: 'Estimasi Biaya Paket Rumah Sakit Malaysia (MYR & Rupiah)',
    fxSubtitle: 'Tagihan resmi rumah sakit dalam Ringgit Malaysia (MYR). Pilih IDR (Rupiah) atau mata uang lain untuk melihat estimasi konversi:',
    fxDisclaimer: 'Kurs konversi bersifat indikatif. Rincian biaya resmi dan pembayaran dilakukan langsung dengan rumah sakit pilihan Anda dalam MYR.',
    packages: [
      { title: 'Medical Check-Up Eksekutif & Penanda Tumor', duration: '1 Hari Rawat Jalan', includes: '60+ panel darah, EKG, USG abdomen, rontgen dada & konsultasi dokter spesialis' },
      { title: 'Paket CT Angiogram Jantung & Ekokardiogram', duration: '1–2 Hari Rawat Jalan', includes: 'CT angiogram koroner, ekokardiogram 2D, treadmill test & konsultasi spesialis jantung' },
      { title: 'Operasi Penggantian Sendi Lutut (Total Knee Replacement)', duration: '4–5 Hari Rawat Inap', includes: 'Jasa dokter bedah & anestesi, implan, kamar privat & fisioterapi awal' },
      { title: 'Program Bayi Tabung (IVF) & Evaluasi Fertilitas', duration: '2–3 Minggu Rawat Jalan', includes: 'Profil hormon lengkap, pemantauan folikel, pengambilan sel telur & transfer embrio' },
    ],
    cards: [
      { title: 'Pendaftaran Mudah dengan Paspor', text: 'Tidak perlu MyKad Malaysia. Daftar langsung dengan nomor paspor agar tim medis kami dapat segera membantu Anda tanpa hambatan administratif.' },
      { title: 'Rincian Biaya Transparan dalam MYR', text: 'Kepastian biaya memberikan ketenangan batin. Dapatkan penawaran resmi dari rumah sakit yang merinci setiap tindakan tanpa biaya tersembunyi.' },
      { title: 'Akreditasi JCI & MSQH Diverifikasi Manual', text: 'Lencana JCI, MSQH, dan MHTC hanya kami sematkan setelah dewan klinis memverifikasi izin resmi dan masa berlaku sertifikat RS secara cermat.' },
      { title: 'Privasi Rekam Medis Anda Terjaga Sepenuhnya', text: 'Dokumen medis Anda hanya dapat dilihat oleh rumah sakit yang Anda pilih atas izin Anda, dan izin dapat ditarik kembali sewaktu-waktu.' },
      { title: 'Koordinasi Aman untuk Dokter Keluarga di Rumah', text: 'Perawatan yang baik butuh kesinambungan. Bagikan ringkasan medis kepada dokter Anda di Indonesia melalui tautan aman berbatas waktu.' },
      { title: 'Dukungan Klinis Lintas Batas yang Bertanggung Jawab', text: 'Dokter spesialis di Malaysia memberikan tinjauan kasus mendalam dan perawatan langsung. Kami siap membantu Anda memahami ketentuan sebelum berangkat.' },
    ],
    scopeNote: 'Pembayaran Langsung ke Rumah Sakit: Deposit tindakan, tagihan rawat inap, dan pengaturan penjemputan dikoordinasikan langsung dengan rumah sakit pilihan Anda.',
    browse: {
      title: 'Daftar Rumah Sakit & Pusat Spesialis Terverifikasi di Malaysia',
      note: 'Setiap fasilitas telah diverifikasi izin KKM Act 586 dan akreditasi aktif JCI / MSQH oleh dewan kami.',
      hubsLabel: 'Filter Cepat Kota Tujuan:', allHubs: 'Semua Kota Malaysia',
      q: 'Nama RS atau kota (mis. Penang, Kuala Lumpur, Melaka)', specialty: 'Spesialisasi, mis. Kardiologi, Onkologi', language: 'Bahasa pendamping, mis. Indonesia, Mandarin', anyAcc: 'Semua akreditasi (JCI / MSQH)', anyService: 'Semua layanan pasien internasional',
      empty: 'Tidak ada rumah sakit yang sesuai dengan filter Anda.', mhtc: 'Anggota Resmi MHTC', licence: 'Izin Act 586 Terverifikasi',
      acc: (b, u) => `Terakreditasi ${b} (s/d ${u})`, cta: 'Daftar dengan Paspor untuk Konsultasi RS', loading: 'Memuat daftar rumah sakit terverifikasi…',
      services: { interpreter: 'Penerjemah Medis', airportPickup: 'Jemputan Bandara', halalFood: 'Makanan Halal', prayerRoom: 'Mushola / Ruang Sholat' },
    },
    info: { title: 'Panduan Pra-Keberangkatan & Imigrasi Pasien Internasional', advisory: 'Informasi panduan umum bagi pasien internasional. Harap konfirmasi syarat visa dan perjalanan terbaru dengan Kedutaan Besar Malaysia dan rumah sakit tujuan Anda.' },
    langNote: 'Antarmuka tersedia dalam Bahasa Indonesia, Melayu, Inggris, Mandarin, dan Arab. Setiap profil RS mencantumkan ketersediaan penerjemah medis.',
  },
  ar: {
    eyebrow: 'نرحب بكم بكل مودة · المرضى الدوليون والسياحة العلاجية في ماليزيا',
    title: 'دليلكم الصادق والموثوق لرحلة علاج واستشفاء آمنة في ماليزيا.',
    intro: 'السفر للعلاج خطوة تتطلب الطمأنينة الكاملة والثقة. نحن هنا لمرافقتكم بكل عناية واهتمام—نساعدكم في اختيار أفضل المستشفيات المعتمدة من JCI وMSQH في كوالالمبور وبينانغ وجوهور باهرو وملقا، مع توفير عروض أسعار تفصيلية شفافة قبل موعد سفركم.',
    pathwayTitle: 'مسار الرعاية الطبية الدولية المطمئن عبر 3 مراحل',
    pathway: [
      { step: '01 · قبل السفر', title: 'استشارة تمهيدية دافئة وعرض سعر واضح بالرينغيت', text: 'ارفع تقاريرك الطبية بكل طمأنينة، واستشر استشارياً معتمداً عبر مكالمة مرئية، واحصل على عرض سعر رسمي ومفصل من المستشفى بالرينغيت الماليزي (MYR).' },
      { step: '02 · في ماليزيا', title: 'استقبال دافئ وعناية طبية في أرقى المستشفيات', text: 'وصول مريح مع خدمات استقبال المطار والمترجمين المعتمدين وتوفير الأطعمة الحلال، مع تسوية الرسوم مباشرة وبشفافية مع المستشفى.' },
      { step: '03 · بعد العودة', title: 'استمرارية الرعاية ومتابعة التعافي مع طبيبك', text: 'صحتكم وسلامتكم في صميم اهتمامنا دائماً. شارك ملخص الخروج الطبي مع طبيبك في بلدك عبر رابط مشفر وآمن، وتابع تعافيك عبر الاستشارات المرئية.' },
    ],
    fxTitle: 'الأسعار الاسترشادية للباقات الطبية في مستشفيات ماليزيا',
    fxSubtitle: 'تُصدر جميع المستشفيات فواتيرها الرسمية بالرينغيت الماليزي (MYR). اختر عملتك المحلية (مثل الريال السعودي SAR أو الدولار USD) للمقارنة الاسترشادية:',
    fxDisclaimer: 'أسعار الصرف استرشادية فقط. يتم إصدار عروض الأسعار النهائية وتسوية الفواتير مباشرة مع المستشفى المختار بالرينغيت الماليزي.',
    packages: [
      { title: 'الفحص الطبي الشامل والتنفيذي ودلالات الأورام', duration: 'يوم واحد (عيادات خارجية)', includes: 'أكثر من 60 فحص دم، تخطيط قلب، أشعة صوتية، أشعة صدر واستشارة أخصائي' },
      { title: 'فحص الشرايين التاجية بالاشعة المقطعية وإيكو القلب', duration: '1–2 يوم (عيادات خارجية)', includes: 'أشعة مقطعية للشرايين التاجية، إيكو القلب، اختبار الجهد واستشارة استشاري القلب' },
      { title: 'باقة عملية استبدال مفصل الركبة الكامل / الروبوتي', duration: '4–5 أيام تنويم', includes: 'أتعاب الجراح والتخدير، المفصل الصناعي، غرفة خاصة وجلسات العلاج الطبيعي الأولية' },
      { title: 'باقة الحقن المجهري وأطفال الأنابيب (IVF)', duration: '2–3 أسابيع (عيادات خارجية)', includes: 'تحاليل الهرمونات، متابعة التبويض، سحب البويضات وإرجاع الأجنة' },
    ],
    cards: [
      { title: 'تسجيل سلس ومرحب بجواز السفر', text: 'لا حاجة للهوية الماليزية. سجل بسهولة باستخدام جواز سفرك الدولي لتبدأ خطتك العلاجية دون أي تعقيد وبمساعدة فريقنا.' },
      { title: 'عروض أسعار رسمية وواضحة بالرينغيت', text: 'الوضوح المالي يمنح راحة البال. احصل على عروض أسعار تفصيلية توضح تكاليف الإجراءات والخدمات دون أي رسوم خفية.' },
      { title: 'اعتمادات دولية تم التحقق منها يدوياً', text: 'نحن لا نعرض شارات JCI أو MSQH أو MHTC إلا بعد التحقق اليدوي والدقيق من قبل لجنتنا الطبية لضمان سلامتك التامة.' },
      { title: 'خصوصية تقاريرك الطبية أمانة في أعناقنا', text: 'المستشفى الذي تختاره فقط هو من يطلع على تقاريرك الطبية وبموافقتك الصريحة، ولديك كامل الحق في سحب الإذن في أي وقت.' },
      { title: 'تواصل مستمر وآمن مع طبيب عائلتك', text: 'الشفاء يتطلب تضافر الجهود. شارك تقرير خروجك الطبي مع طبيبك في وطنك عبر روابط مشفرة ومؤقتة لضمان تمام التعافي.' },
      { title: 'رعاية طبية عابرة للحدود بأعلى معايير الأمانة', text: 'يقدم الأطباء الماليزيون مراجعات دقيقة للحالات ورعاية ميدانية متخصصة، مع توجيهكم بخصوص الإجراءات المعتمدة قبل السفر.' },
    ],
    scopeNote: 'التسوية المباشرة مع المستشفى: يتم دفع التأمين الطبي وفواتير التنويم وترتيبات السفر مباشرة مع المستشفى الذي تختاره.',
    browse: {
      title: 'تصفح المستشفيات والمراكز التخصصية الماليزية المعتمدة',
      note: 'تم التحقق يدوياً من ترخيص وزارة الصحة الماليزية (القانون 586) وشهادات الاعتماد الدولي JCI / MSQH لكل مستشفى.',
      hubsLabel: 'تصفية سريعة حسب المدينة الطبية:', allHubs: 'جميع المدن الماليزية',
      q: 'اسم المستشفى أو المدينة (مثل Kuala Lumpur, Penang)', specialty: 'التخصص، مثل أمراض القلب، الأورام', language: 'لغة المترجم، مثل Arabic, Mandarin', anyAcc: 'جميع الاعتمادات (JCI / MSQH)', anyService: 'جميع خدمات المرضى الدوليين',
      empty: 'لا توجد مستشفيات تطابق معايير البحث الحالية.', mhtc: 'عضو مجلس السياحة العلاجية MHTC', licence: 'مرخص بموجب القانون 586',
      acc: (b, u) => `معتمد من ${b} (حتى ${u})`, cta: 'سجل بجواز السفر لإرسال استفسار', loading: 'جاري تحميل المستشفيات المعتمدة…',
      services: { interpreter: 'مترجم طبي', airportPickup: 'استقبال من المطار', halalFood: 'طعام حلال', prayerRoom: 'مصلى / غرفة صلاة' },
    },
    info: { title: 'دليل إرشادات ما قبل السفر والدخول إلى ماليزيا', advisory: 'إرشادات عامة للمرضى الدوليين. يرجى دائماً تأكيد متطلبات التأشيرة والدخول الحالية مع السفارة الماليزية وإدارة الهجرة والمستشفى المستقبل.' },
    langNote: 'تتوفر المنصة باللغات العربية والإنجليزية والماليزية والصينية والإندونيسية، ويوضح كل مستشفى اللغات المتاحة للمترجمين الطبيين.',
  },
};

const SERVICE_ICON: Record<string, React.ComponentType<{ className?: string }>> = { interpreter: Languages, airportPickup: Car, halalFood: Utensils, prayerRoom: HeartHandshake };
const CARD_ICONS = [FileText, Building2, BadgeCheck, ShieldCheck, Plane, Plane];
const field = 'border border-slate-300 bg-white px-3 h-11 text-sm w-full focus:outline-none focus:border-[color:var(--t-600)]';
const HUB_CITIES = ['', 'Kuala Lumpur', 'Penang', 'Johor Bahru', 'Melaka'];

export default function TouristAccess({ onSignUp }: { onSignUp: () => void }) {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];
  const [fx, setFx] = useState<FxCurrency>(() => (L === 'id' ? 'IDR' : L === 'ar' ? 'SAR' : 'USD'));
  const [f, setF] = useState({ q: '', specialty: '', language: '', accreditation: '', service: '' });
  const [list, setList] = useState<any[] | null>(null);
  const [info, setInfo] = useState<{ draft: boolean; sections: { heading: string; body: string }[] } | null>(null);

  useEffect(() => {
    if (L === 'id') setFx('IDR');
    else if (L === 'ar') setFx('SAR');
  }, [L]);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
      fetch(`/api/tourism/facilities?${qs}`).then(r => r.json()).then(d => setList(d.status === 'success' ? d.data : [])).catch(() => setList([]));
    }, 250);
    return () => clearTimeout(t);
  }, [f]);
  useEffect(() => { fetch('/api/tourism/info').then(r => r.json()).then(d => d.status === 'success' && setInfo(d.data)).catch(() => {}); }, []);

  return (
    <section id="tourist-section" aria-labelledby="tourist-heading" className="bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="section-index-badge">04B</span>
          <Plane className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
          {tx.eyebrow}
        </div>
        <h2 id="tourist-heading" className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
          {tx.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl leading-relaxed">{tx.intro}</p>

        {/* 3-Stage Cross-Border Care Pathway */}
        <div className="mt-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-5 sm:p-6">
          <h3 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-[color:var(--t-700)] mb-4">
            {tx.pathwayTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tx.pathway.map((p, idx) => (
              <div key={p.step} className="bg-white border border-[color:var(--t-200)] border-l-2 border-l-[color:var(--t-600)] p-4 relative">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-extrabold text-[color:var(--t-600)] uppercase">{p.step}</span>
                  {idx < 2 && <ArrowRight className="hidden md:block h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
                </div>
                <h4 className="font-display font-extrabold text-base text-[color:var(--ink)]">{p.title}</h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed font-medium">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Currency Indicative Package Benchmark Estimator */}
        <div className="mt-8 border border-[color:var(--t-200)] bg-white p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[color:var(--t-100)]">
            <div>
              <h3 className="font-display font-black text-lg sm:text-xl text-[color:var(--ink)]">{tx.fxTitle}</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">{tx.fxSubtitle}</p>
            </div>
            <div role="group" aria-label="Indicative currency selector" className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(FX_RATES) as FxCurrency[]).map(curr => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setFx(curr)}
                  aria-pressed={fx === curr}
                  className={`px-3 py-1.5 text-xs font-mono font-extrabold border transition-colors cursor-pointer ${
                    fx === curr
                      ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                      : 'bg-[color:var(--t-50)] text-[color:var(--ink)] border-[color:var(--t-200)] hover:bg-[color:var(--t-100)]'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {SAMPLE_PACKAGES.map((pkg, idx) => {
              const copy = tx.packages[idx];
              return (
                <div key={pkg.id} className="bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold text-slate-500 mb-1.5">
                      <span>{pkg.code}</span>
                      <span className="text-[color:var(--t-700)]">{copy.duration}</span>
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-[color:var(--ink)] leading-snug">{copy.title}</h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">{copy.includes}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[color:var(--t-200)]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono font-black text-base text-[color:var(--ink)]">
                        RM {pkg.myr.toLocaleString('en-US')}
                      </span>
                      {fx !== 'MYR' && (
                        <span className="font-mono font-bold text-xs text-[color:var(--t-700)] bg-white px-2 py-0.5 border border-[color:var(--t-200)]">
                          ~{formatFx(pkg.myr, fx)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <Globe className="h-3 w-3 text-[color:var(--t-600)] shrink-0" />
                      <span className="truncate">{pkg.hub}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-500 font-medium">{tx.fxDisclaimer}</p>
        </div>

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tx.cards.map((c, i) => {
            const Icon = CARD_ICONS[i];
            return (
              <li key={c.title} className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 shadow-2xs">
                <span aria-hidden="true" className="w-9 h-9 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center mb-3"><Icon className="h-4.5 w-4.5" /></span>
                <h3 className="font-display font-extrabold text-base text-[color:var(--ink)] leading-snug">{c.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1.5 font-medium">{c.text}</p>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 p-4 bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-700 font-medium">
          <div>
            <p className="font-bold text-[color:var(--ink)]">{tx.scopeNote}</p>
            <p className="text-xs text-slate-600 mt-1">{tx.langNote}</p>
          </div>
        </div>

        {/* Facility browser: no account needed */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h3 className="font-display font-black text-xl sm:text-2xl text-[color:var(--ink)] tracking-tight">{tx.browse.title}</h3>
              <p className="text-sm text-slate-600 mt-1 font-medium">{tx.browse.note}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">{tx.browse.hubsLabel}</span>
              {HUB_CITIES.map(city => {
                const active = f.q === city;
                return (
                  <button
                    key={city || 'all'}
                    type="button"
                    onClick={() => setF({ ...f, q: city })}
                    className={`px-2.5 py-1 text-xs font-extrabold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                        : 'bg-[color:var(--t-50)] text-[color:var(--ink)] border-[color:var(--t-200)] hover:bg-[color:var(--t-100)]'
                    }`}
                  >
                    {city || tx.browse.allHubs}
                  </button>
                );
              })}
            </div>
          </div>

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
                <li key={fac.id} className="border border-[color:var(--t-200)] bg-white p-5 flex flex-col gap-3 shadow-2xs">
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
                  <button type="button" onClick={onSignUp} className="mt-auto self-start min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none cursor-pointer inline-flex items-center gap-2 shadow-xs transition-all duration-200">
                    <Search className="h-4 w-4" aria-hidden="true" />{tx.browse.cta}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {info && (
          <details className="mt-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)]">
            <summary className="cursor-pointer select-none px-5 py-4 font-display font-extrabold text-sm sm:text-base text-[color:var(--ink)]">{tx.info.title}</summary>
            <div className="px-5 pb-5 pt-2 border-t border-[color:var(--t-200)] space-y-4 text-sm text-slate-700 font-medium">
              {info.draft && <p className="font-semibold text-slate-800 bg-white border border-[color:var(--t-200)] p-3.5 text-xs leading-relaxed">{tx.info.advisory}</p>}
              {info.sections.map(s => (
                <div key={s.heading}>
                  <h4 className="font-extrabold text-[color:var(--ink)]">{s.heading}</h4>
                  <p className="mt-1 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
