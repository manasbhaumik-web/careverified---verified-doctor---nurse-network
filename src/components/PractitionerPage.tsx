import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowRight, BadgeCheck, Building2, ClipboardList, FileSignature, Hourglass, MessageSquare, Pill, Stethoscope, Video, Plane,
  ShieldCheck, CheckCircle2, Shield, UserCheck, Search, Scale, Lock, FileText, Sparkles, Check, Zap, Clock, Award,
  Heart, Activity, Syringe, Bandage, HeartPulse, ChevronLeft, ChevronRight, Pause, Play, Users
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import { loginUrl, navigate } from '../nav';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/**
 * Unified Healthcare Practitioner Recruiting Portal (/for-practitioners, /for-doctors, /for-nurses).
 * Features an interactive sliding hero section for Doctors & Nurses, backed by an AI-generated
 * clinical background image depicting both Malaysian doctors and nurses.
 * All clinical statements conform to Malaysian Medical Council (MMC) and Lembaga Jururawat Malaysia (LJM) norms.
 */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');
type Item = { t: string; d: string };
interface PayoutTerms { schedule: string; holdDays: number; minimumPayout: number }

const T: Record<Lang, {
  title: string; description: string;
  heroSlides: {
    tag: string;
    badge: string;
    titleLead: string;
    titleAccent: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust1: string;
    trust2: string;
    trust3: string;
    previewRole: string;
    previewName: string;
    previewCouncil: string;
    previewSeal: string;
    previewChips: { label: string; tag: string; icon: string }[];
  }[];
  metrics: { value: string; label: string; sub: string }[];
  steps: { title: string; subtitle: string; items: Item[] };
  capabilities: { title: string; subtitle: string; allTab: string; docTab: string; nurseTab: string };
  paid: {
    title: string;
    subtitle: string;
    lead: (pct: number | null) => string;
    process: (t: PayoutTerms) => string;
    earnings: string;
    refunds: string;
  };
  checklists: {
    title: string;
    subtitle: string;
    docTitle: string;
    docItems: string[];
    nurseTitle: string;
    nurseItems: string[];
  };
  rules: { title: string; intro: string; items: string[] };
  facility: { title: string; sub: string; cta: string };
  cta: { title: string; text: string; button: string };
}> = {
  en: {
    title: 'Join as a Verified Doctor or Nurse | MedCred Malaysia',
    description: 'Malaysia’s unified healthcare practitioner network. MMC-registered doctors and LJM-registered nurses: verified listing, telemedicine, in-home nursing care, locum shifts, and direct bank payouts.',
    heroSlides: [
      {
        tag: 'Malaysian Medical Council (MMC) Registry',
        badge: 'For Doctors & Specialists',
        titleLead: 'Empower Your Practice With Verified ',
        titleAccent: 'Telemedicine & Outpatient Care',
        sub: 'Receive online video appointments, accept consult-now requests, and issue secure QR e-prescriptions screened against allergies and drug interactions. We verify your MMC Annual Practising Certificate by hand.',
        ctaPrimary: 'Register as a Doctor',
        ctaSecondary: 'Doctor Sign In',
        trust1: '100% MMC Hand-Verified',
        trust2: 'RM 0 Upfront Fee',
        trust3: '14-Day Bank Payout',
        previewRole: 'Specialist Physician • Internal Medicine',
        previewName: 'Dr. Amirul Hariz',
        previewCouncil: 'MMC Reg #49281 • APC Current (2026)',
        previewSeal: 'MEDCRED-MMC-2026-9281A',
        previewChips: [
          { label: 'Video & Instant Consults', tag: 'Online Ready', icon: 'video' },
          { label: 'Digital e-Prescriptions', tag: 'QR Signed', icon: 'pill' },
          { label: 'Clinical Visit Notes', tag: 'Council Standard', icon: 'notes' },
        ],
      },
      {
        tag: 'Malaysian Nursing Board (LJM) Registry',
        badge: 'For Registered Nurses & Midwives',
        titleLead: 'Get Booked for Verified ',
        titleAccent: 'Home Nursing & Locum Shifts',
        sub: 'Connect with patients requiring sterile wound dressing, post-operative care, injections, Foley catheter maintenance, and vital telemetry. Plus, accept private hospital and clinic locum shifts across Malaysia.',
        ctaPrimary: 'Register as a Nurse',
        ctaSecondary: 'Nurse Sign In',
        trust1: '100% LJM Hand-Verified',
        trust2: 'RM 0 Upfront Fee',
        trust3: '14-Day Bank Payout',
        previewRole: 'Staff Nurse • Wound & In-Home Nursing',
        previewName: 'Sister Nurul Aisyah, RN',
        previewCouncil: 'LJM Reg #RN-83921 • APC Current (2026)',
        previewSeal: 'MEDCRED-LJM-2026-8392N',
        previewChips: [
          { label: 'Sterile Wound Care', tag: 'Home Visit', icon: 'bandage' },
          { label: 'Doctor-Ordered Injections', tag: 'Clinical Care', icon: 'syringe' },
          { label: 'Hospital Locum Coverage', tag: 'Ward Shifts', icon: 'shift' },
        ],
      },
      {
        tag: 'Unified Healthcare Practitioner Network',
        badge: 'Collaborative Practice Network',
        titleLead: 'Where Verified Doctors & Nurses ',
        titleAccent: 'Collaborate for Patient Recovery',
        sub: 'A multidisciplinary Malaysian healthcare ecosystem. Physicians oversee diagnostic consultations and medication plans, while verified nurses execute in-home procedures and continuous clinical monitoring.',
        ctaPrimary: 'Join Practitioner Network',
        ctaSecondary: 'Practitioner Sign In',
        trust1: 'MMC & LJM Aligned',
        trust2: 'RM 0 Upfront Fee',
        trust3: '14-Day Direct Payout',
        previewRole: 'Multidisciplinary Clinical Network',
        previewName: 'MedCred Care Circle',
        previewCouncil: 'MMC & LJM Unified Governance',
        previewSeal: 'MEDCRED-TEAM-2026-KL01',
        previewChips: [
          { label: 'Coordinated Care Plans', tag: 'Dual Scopes', icon: 'team' },
          { label: 'Integrated Patient Records', tag: 'Sync Telemetry', icon: 'notes' },
          { label: 'Shared Hospital Locums', tag: 'Shift Network', icon: 'shift' },
        ],
      },
    ],
    metrics: [
      { value: '100%', label: 'Hand-Verified Credentials', sub: 'Every licence and APC cross-checked with official national council registries.' },
      { value: 'RM 0', label: 'Zero Upfront Platform Fee', sub: 'Join and list for free. Only a transparent commission on completed paid visits.' },
      { value: '14-Day', label: 'Direct Bank Settlement', sub: 'Automated bank transfers formatted for your accountant and LHDN tax submission.' },
      { value: '100%', label: 'Malaysian Law Compliance', sub: 'Strict adherence to Poisons Act 1952, Medical Act 1971, and Nurses Act 1950.' },
    ],
    steps: {
      title: 'How Joining Works',
      subtitle: 'A transparent 4-step accreditation journey designed to protect your medical licence and patient safety.',
      items: [
        { t: 'Create Your Account', d: 'Enter your legal name, professional email, and password. Accept our Clinical Terms and Privacy Notice.' },
        { t: 'Submit Council Credentials', d: 'Provide your MMC or LJM registration number, current Annual Practising Certificate (APC), and qualification certificates.' },
        { t: 'Human Board Review', d: 'A certified board reviewer verifies your licence directly against the national council register (typically within 3–5 working days).' },
        { t: 'Go Live & Accept Bookings', d: 'Once verified, you appear on the public registry to receive telehealth bookings, in-home care requests, and locum shifts.' },
      ],
    },
    capabilities: {
      title: 'Unified Clinical Practice Scopes',
      subtitle: 'Comprehensive capabilities tailored to the distinct legal scopes of Malaysian physicians and registered nurses.',
      allTab: 'All Practice Scopes',
      docTab: 'Doctor Scopes (MMC)',
      nurseTab: 'Nurse Scopes (LJM)',
    },
    paid: {
      title: 'Transparent Practitioner Economics',
      subtitle: 'Simulate your earnings, understand platform commission, and manage your payouts with total accounting clarity.',
      lead: pct => (pct === null ? 'We take a commission on your consultation or visit fee.' : `We take ${pct}% of your consultation or procedure fee.`) + ' It is calculated on your fee before service tax, and service tax is not part of your income.',
      process: t => `Payouts are made by bank transfer, ${t.schedule}. Earnings become payable ${t.holdDays} days after a visit is completed. Anything under RM ${t.minimumPayout} rolls over to the next payout.`,
      earnings: 'Your earnings dashboard lists every paid visit, commission, and net payout, with downloadable statements for each disbursement.',
      refunds: 'A refunded visit is deducted from your earnings. If already disbursed, it rolls into your next scheduled payout.',
    },
    checklists: {
      title: 'Council Credentialing Checklists',
      subtitle: 'What doctors and nurses need to upload during registration for swift board approval.',
      docTitle: 'Malaysian Medical Council (MMC) Doctors',
      docItems: [
        'Full Registration Certificate with the Malaysian Medical Council (MMC)',
        'Active Annual Practising Certificate (APC) for the current calendar year',
        'National Specialist Register (NSR) Certificate (for Medical Specialists)',
        'Active Medical Professional Indemnity Insurance policy certificate',
        'Malaysian NRIC or Passport and verified personal bank account details',
      ],
      nurseTitle: 'Malaysian Nursing Board (LJM) Nurses',
      nurseItems: [
        'Perakuan Pendaftaran Jururawat with Lembaga Jururawat Malaysia (LJM)',
        'Active Annual Practising Certificate (APC Jururawat / Jururawat Masyarakat)',
        'Recognized Basic Diploma or Bachelor of Science in Nursing qualification',
        'Post-Basic certificates (e.g., Wound Care, ICU, Renal, Midwifery, Palliative)',
        'Malaysian NRIC or Passport and verified personal bank account details',
      ],
    },
    rules: {
      title: 'The Rules You Work Under',
      intro: 'These standards originate from Malaysian healthcare statutes and clinical guidelines. They protect both you and your patients.',
      items: [
        'Patients located in Malaysia can only be consulted online by practitioners registered in Malaysia.',
        'By default, an initial consultation for long-term chronic conditions must be conducted in person.',
        'No Medical Certificate (MC) may be issued following a video consultation alone, per MMC Ethical Code.',
        'No e-prescriptions for patients residing abroad, and controlled dangerous drugs (Poisons Act) are never e-prescribed.',
        'MedCred is not an emergency service. Patients experiencing acute distress are directed to call 999.',
        'Patients maintain control over health record access, and every practitioner record access is immutably logged.',
      ],
    },
    facility: {
      title: 'Are you a Clinic Owner or Hospital Locum Scheduler?',
      sub: 'Source pre-verified MMC doctors and LJM nurses for locum coverage, outpatient clinics, and specialized nursing wards.',
      cta: 'Explore Clinic Solutions',
    },
    cta: {
      title: 'Ready to Join Malaysia’s Premier Verified Medical Network?',
      text: 'Creating an account initiates verification. Your public profile goes live once our board confirms your council licence.',
      button: 'Apply as a Practitioner Now',
    },
  },
  ms: {
    title: 'Sertai sebagai Doktor atau Jururawat Disahkan | MedCred Malaysia',
    description: 'Rangkaian pengamal penjagaan kesihatan bersepadu Malaysia. Doktor berdaftar MMC dan jururawat berdaftar LJM: penyenaraian disahkan, teleperubatan, penjagaan rumah, syif locum dan bayaran bank terus.',
    heroSlides: [
      {
        tag: 'Daftar Majlis Perubatan Malaysia (MMC)',
        badge: 'Untuk Doktor & Pakar Perubatan',
        titleLead: 'Kembangkan Amalan Anda Dengan ',
        titleAccent: 'Teleperubatan & Penjagaan Pesakit Luar',
        sub: 'Terima janji temu video dalam talian, terima permintaan konsultasi segera, dan keluarkan e-preskripsi QR selamat yang disaring untuk alergi dan interaksi ubat. Kami menyemak Sijil Amalan Tahunan (APC) MMC anda secara manual.',
        ctaPrimary: 'Daftar sebagai Doktor',
        ctaSecondary: 'Log Masuk Doktor',
        trust1: '100% Disahkan Manual MMC',
        trust2: 'RM 0 Yuran Pendaftaran',
        trust3: 'Bayaran Bank 14 Hari',
        previewRole: 'Pakar Perubatan • Perubatan Dalaman',
        previewName: 'Dr. Amirul Hariz',
        previewCouncil: 'No. Daftar MMC #49281 • APC Sah (2026)',
        previewSeal: 'MEDCRED-MMC-2026-9281A',
        previewChips: [
          { label: 'Konsultasi Video & Segera', tag: 'Sedia Dalam Talian', icon: 'video' },
          { label: 'E-Preskripsi Digital', tag: 'Ditandatangani QR', icon: 'pill' },
          { label: 'Nota Lawatan Klinikal', tag: 'Standard Majlis', icon: 'notes' },
        ],
      },
      {
        tag: 'Daftar Lembaga Jururawat Malaysia (LJM)',
        badge: 'Untuk Jururawat & Bidan Berdaftar',
        titleLead: 'Ditemui untuk Perkhidmatan ',
        titleAccent: 'Kejururawatan Rumah & Syif Locum',
        sub: 'Berhubung dengan pesakit yang memerlukan balutan luka steril, penjagaan pasca pembedahan, suntikan, kateter Foley, dan pemantauan tanda vital. Serta terima syif locum hospital swasta di seluruh Malaysia.',
        ctaPrimary: 'Daftar sebagai Jururawat',
        ctaSecondary: 'Log Masuk Jururawat',
        trust1: '100% Disahkan Manual LJM',
        trust2: 'RM 0 Yuran Pendaftaran',
        trust3: 'Bayaran Bank 14 Hari',
        previewRole: 'Jururawat Terlatih • Rawatan Luka & Rumah',
        previewName: 'Sister Nurul Aisyah, RN',
        previewCouncil: 'No. Daftar LJM #RN-83921 • APC Sah (2026)',
        previewSeal: 'MEDCRED-LJM-2026-8392N',
        previewChips: [
          { label: 'Rawatan Luka Steril', tag: 'Lawatan Rumah', icon: 'bandage' },
          { label: 'Suntikan Preskripsi Doktor', tag: 'Penjagaan Klinikal', icon: 'syringe' },
          { label: 'Liputan Locum Hospital', tag: 'Syif Wad', icon: 'shift' },
        ],
      },
      {
        tag: 'Rangkaian Pengamal Perubatan Bersepadu',
        badge: 'Rangkaian Amalan Kolaboratif',
        titleLead: 'Di Mana Doktor & Jururawat Disahkan ',
        titleAccent: 'Bekerjasama Demi Pemulihan Pesakit',
        sub: 'Ekosistem penjagaan kesihatan pelbagai disiplin. Doktor menyelia diagnosis dan pelan perubatan, manakala jururawat berdaftar melaksanakan prosedur di rumah dan pemantauan klinikal berterusan.',
        ctaPrimary: 'Sertai Rangkaian Pengamal',
        ctaSecondary: 'Log Masuk Pengamal',
        trust1: 'Selaras MMC & LJM',
        trust2: 'RM 0 Yuran Pendaftaran',
        trust3: 'Bayaran Bank 14 Hari',
        previewRole: 'Rangkaian Klinikal Pelbagai Disiplin',
        previewName: 'Lingkaran Penjagaan MedCred',
        previewCouncil: 'Tadbir Urus Bersama MMC & LJM',
        previewSeal: 'MEDCRED-TEAM-2026-KL01',
        previewChips: [
          { label: 'Pelan Penjagaan Terselaras', tag: 'Skop Bersama', icon: 'team' },
          { label: 'Rekod Pesakit Bersepadu', tag: 'Segerak Telemetri', icon: 'notes' },
          { label: 'Syif Locum Dikongsi', tag: 'Rangkaian Syif', icon: 'shift' },
        ],
      },
    ],
    metrics: [
      { value: '100%', label: 'Kelayakan Disemak Manual', sub: 'Setiap lesen dan APC disemak silang dengan daftar rasmi majlis kebangsaan.' },
      { value: 'RM 0', label: 'Sifar Yuran Platform Awal', sub: 'Sertai dan disenaraikan secara percuma. Komisen telus hanya atas lawatan berbayar.' },
      { value: '14-Hari', label: 'Penyelesaian Pindahan Bank', sub: 'Pindahan bank berjadual diformat kemas untuk akauntan dan penyerahan LHDN.' },
      { value: '100%', label: 'Pematuhan Undang-Undang', sub: 'Mematuhi Akta Racun 1952, Akta Perubatan 1971, dan Akta Jururawat 1950.' },
    ],
    steps: {
      title: 'Cara Menyertai',
      subtitle: 'Langkah akreditasi 4 peringkat yang telus bagi melindungi lesen perubatan anda dan keselamatan pesakit.',
      items: [
        { t: 'Cipta Akaun Anda', d: 'Masukkan nama sah, e-mel profesional, dan kata laluan anda. Terima Terma Klinikal dan Notis Privasi kami.' },
        { t: 'Hantar Maklumat Lesen Majlis', d: 'Sediakan nombor pendaftaran MMC atau LJM, Sijil Amalan Tahunan (APC) semasa, dan sijil kelayakan.' },
        { t: 'Semakan Manual Lembaga', d: 'Penyemak lembaga bertauliah mengesahkan lesen anda terus dengan daftar majlis (biasanya dalam 3–5 hari bekerja).' },
        { t: 'Mula Beroperasi & Terima Tempahan', d: 'Setelah disahkan, anda muncul dalam daftar awam untuk menerima teleperubatan, rawatan rumah dan syif locum.' },
      ],
    },
    capabilities: {
      title: 'Skop Amalan Klinikal Bersepadu',
      subtitle: 'Keupayaan menyeluruh yang disesuaikan mengikut skop undang-undang doktor perubatan dan jururawat berdaftar Malaysia.',
      allTab: 'Semua Skop Amalan',
      docTab: 'Skop Doktor (MMC)',
      nurseTab: 'Skop Jururawat (LJM)',
    },
    paid: {
      title: 'Ekonomi Pengamal Yang Telus',
      subtitle: 'Simulasikan pendapatan anda, fahami komisen platform, dan uruskan pembayaran anda dengan kejelasan perakaunan sepenuhnya.',
      lead: pct => (pct === null ? 'Kami mengambil komisen ke atas yuran konsultasi atau lawatan anda.' : `Kami mengambil ${pct}% daripada yuran konsultasi atau prosedur anda.`) + ' Ia dikira atas yuran anda sebelum cukai perkhidmatan, dan cukai perkhidmatan bukan sebahagian daripada pendapatan anda.',
      process: t => `Bayaran dibuat melalui pindahan bank, ${t.schedule}. Pendapatan boleh dibayar ${t.holdDays} hari selepas lawatan selesai. Jumlah di bawah RM ${t.minimumPayout} dibawa ke bayaran seterusnya.`,
      earnings: 'Papan pemuka pendapatan anda menyenaraikan setiap lawatan berbayar, komisen, dan bayaran bersih, berserta penyata boleh dimuat turun.',
      refunds: 'Lawatan yang dibayar balik ditolak daripada pendapatan anda. Jika telah dibayar, ia ditolak daripada bayaran berjadual seterusnya.',
    },
    checklists: {
      title: 'Senarai Semak Kelayakan Majlis',
      subtitle: 'Dokumen yang perlu dimuat naik oleh doktor dan jururawat semasa pendaftaran untuk kelulusan pantas.',
      docTitle: 'Doktor Majlis Perubatan Malaysia (MMC)',
      docItems: [
        'Sijil Pendaftaran Penuh dengan Majlis Perubatan Malaysia (MMC)',
        'Sijil Amalan Tahunan (APC) yang sah untuk tahun kalendar semasa',
        'Sijil Daftar Pakar Kebangsaan (NSR) (untuk Pakar Perubatan)',
        'Polisi Insurans Indemniti Profesional Perubatan yang aktif',
        'MyKad / Pasport Malaysia dan butiran akaun bank peribadi yang disahkan',
      ],
      nurseTitle: 'Jururawat Lembaga Jururawat Malaysia (LJM)',
      nurseItems: [
        'Perakuan Pendaftaran Jururawat dengan Lembaga Jururawat Malaysia (LJM)',
        'Sijil Amalan Tahunan (APC Jururawat / Jururawat Masyarakat) yang sah',
        'Kelayakan Diploma atau Ijazah Sarjana Muda Kejururawatan yang diiktiraf',
        'Sijil Pos-Basik (contohnya: Penjagaan Luka, ICU, Renal, Perbidanan, Paliatif)',
        'MyKad / Pasport Malaysia dan butiran akaun bank peribadi yang disahkan',
      ],
    },
    rules: {
      title: 'Peraturan Yang Anda Ikuti',
      intro: 'Piawaian ini berpunca daripada statut penjagaan kesihatan dan garis panduan klinikal Malaysia. Ia melindungi anda serta pesakit.',
      items: [
        'Pesakit di Malaysia hanya boleh dirawat dalam talian oleh pengamal yang berdaftar di Malaysia.',
        'Secara lalai, lawatan pertama bagi penyakit kronik jangka panjang mesti dijalankan secara bersemuka.',
        'Tiada Sijil Cuti Sakit (MC) boleh dikeluarkan selepas konsultasi video sahaja, mengikut Kod Etika MMC.',
        'Tiada e-preskripsi untuk pesakit di luar negara, dan ubat berbahaya terkawal (Akta Racun) tidak boleh dipreskripsi secara elektronik.',
        'MedCred bukan perkhidmatan kecemasan. Pesakit yang mengalami kecemasan akut diarahkan menghubungi 999.',
        'Pesakit mengawal akses kepada rekod kesihatan mereka, dan setiap akses rekod direkodkan secara kekal.',
      ],
    },
    facility: {
      title: 'Adakah Anda Pengurus Klinik atau Penjadual Locum Hospital?',
      sub: 'Dapatkan doktor MMC dan jururawat LJM yang telah disahkan untuk liputan syif locum, klinik pesakit luar dan wad khusus.',
      cta: 'Terokai Penyelesaian Klinik',
    },
    cta: {
      title: 'Bersedia Menyertai Rangkaian Perubatan Disahkan Terkemuka Malaysia?',
      text: 'Mencipta akaun memulakan proses pengesahan. Profil awam anda disiarkan setelah lembaga mengesahkan lesen majlis anda.',
      button: 'Mohon sebagai Pengamal Sekarang',
    },
  },
  zh: {
    title: '以认证医生或护士身份加入 | MedCred 马来西亚',
    description: '马来西亚统一医疗人员网络。MMC 注册医生与 LJM 注册护士：权威认证列名、远程医疗问诊、上门护理服务、医院 Locum 代班以及直接银行结算。',
    heroSlides: [
      {
        tag: '马来西亚医药理事会 (MMC) 认证名录',
        badge: '面向全科医生与专科医生',
        titleLead: '以权威认证赋能您的临床实践：',
        titleAccent: '远程问诊与门诊照护',
        sub: '接收在线视频预约，接受即时问诊请求，并开具经过过敏与药物相互作用自动筛查的防伪二维码电子处方。我们人工核对您的 MMC 年度执业证书 (APC)。',
        ctaPrimary: '注册医生账户',
        ctaSecondary: '医生登录',
        trust1: '100% MMC 人工核验',
        trust2: 'RM 0 平台入驻费',
        trust3: '14 天直接银行结算',
        previewRole: '内科专科医生 • 资深医师',
        previewName: 'Dr. Amirul Hariz',
        previewCouncil: 'MMC 注册编号 #49281 • APC 有效 (2026)',
        previewSeal: 'MEDCRED-MMC-2026-9281A',
        previewChips: [
          { label: '视频与即时问诊', tag: '随时接诊', icon: 'video' },
          { label: '数字防伪处方', tag: 'QR 签名', icon: 'pill' },
          { label: '临床就诊记录', tag: '公会合规', icon: 'notes' },
        ],
      },
      {
        tag: '马来西亚护理委员会 (LJM) 认证名录',
        badge: '面向注册护士与助产士',
        titleLead: '预约您的专业护理服务：',
        titleAccent: '上门家庭护理与医院 Locum 排班',
        sub: '对接需要无菌伤口换药、术后康复、医嘱注射、导尿管维护以及生命体征监测的患者。同时承接马来西亚私立医院与诊所的优质 Locum 班次。',
        ctaPrimary: '注册护士账户',
        ctaSecondary: '护士登录',
        trust1: '100% LJM 人工核验',
        trust2: 'RM 0 平台入驻费',
        trust3: '14 天直接银行结算',
        previewRole: '注册护士 • 专科伤口与家庭护理',
        previewName: 'Sister Nurul Aisyah, RN',
        previewCouncil: 'LJM 注册编号 #RN-83921 • APC 有效 (2026)',
        previewSeal: 'MEDCRED-LJM-2026-8392N',
        previewChips: [
          { label: '无菌伤口护理', tag: '上门访视', icon: 'bandage' },
          { label: '遵医嘱注射给药', tag: '临床操作', icon: 'syringe' },
          { label: '私立医院 Locum', tag: '病房代班', icon: 'shift' },
        ],
      },
      {
        tag: '统一医疗与护理协同网络',
        badge: '多学科协作执业网络',
        titleLead: '认证医生与护士深度协同：',
        titleAccent: '构建无缝患者康复闭环',
        sub: '多学科协同的马来西亚医疗生态圈。医生主导远程诊断与处方治疗方案，认证护士负责上门专业操作与生命体征数据实时交接反馈。',
        ctaPrimary: '加入医疗人员网络',
        ctaSecondary: '医疗人员登录',
        trust1: 'MMC 与 LJM 双重保障',
        trust2: 'RM 0 平台入驻费',
        trust3: '14 天直接银行结算',
        previewRole: '多学科综合临床团队',
        previewName: 'MedCred 照护圈',
        previewCouncil: 'MMC 与 LJM 统一治理框架',
        previewSeal: 'MEDCRED-TEAM-2026-KL01',
        previewChips: [
          { label: '协同治疗方案', tag: '双轨执业', icon: 'team' },
          { label: '整合电子健康档案', tag: '数据同步', icon: 'notes' },
          { label: '共享医疗机构排班', tag: 'Locum 联动', icon: 'shift' },
        ],
      },
    ],
    metrics: [
      { value: '100%', label: '人工审核执业资质', sub: '每张执照与年度执业证书 (APC) 均与国家法定名册直接核实。' },
      { value: 'RM 0', label: '零前期入驻费用', sub: '免费入驻列名，仅在完成付费问诊或护理服务后收取透明佣金。' },
      { value: '14 天', label: '直接银行自动打款', sub: '定期直接转账至马来西亚银行账户，并提供税务对账凭证。' },
      { value: '100%', label: '严格遵守大马法规', sub: '严格遵循《1952年毒药法令》、《1971年医疗法令》及《1950年护士法令》。' },
    ],
    steps: {
      title: '加入流程',
      subtitle: '清晰透明的 4 步认证流程，切实保障您的行医资格与患者就医安全。',
      items: [
        { t: '创建专业账户', d: '输入您的法定姓名、专业邮箱及密码，接受平台临床服务条款与隐私政策。' },
        { t: '提交理事会证书资料', d: '填写您的 MMC 或 LJM 注册号码、当年度有效执业证书 (APC) 并上传证书凭证。' },
        { t: '审核委员会人工核查', d: '由认证审核员对照国家理事会名册核验您的执业资质（通常在 3–5 个工作日内完成）。' },
        { t: '正式上线开展业务', d: '认证通过后，您将出现在官方名册中，开始接收远程问诊、上门护理和代班请求。' },
      ],
    },
    capabilities: {
      title: '统一临床执业范围与平台工具',
      subtitle: '严格依据马来西亚卫生法令与执业准则，为医生和护士定制的专属临床工具集。',
      allTab: '全部执业范围',
      docTab: '医生专属范围 (MMC)',
      nurseTab: '护士专属范围 (LJM)',
    },
    paid: {
      title: '透明的医疗人员收益机制',
      subtitle: '即时模拟您的收入，清晰了解服务佣金，享受具备完备税务凭证的银行结算。',
      lead: pct => (pct === null ? '我们对您的问诊或护理服务费收取佣金。' : `我们收取您服务费的 ${pct}%。`) + ' 佣金按服务税前的实际费用计算，服务税不计入您的收入。',
      process: t => `款项通过银行转账支付，${t.schedule}。服务完成 ${t.holdDays} 天后款项即可结算。低于 RM ${t.minimumPayout} 的金额顺延至下期。`,
      earnings: '收入控制台清晰列出每笔付费服务、平台佣金与净结算额，并支持下载每次对账单。',
      refunds: '退款订单将从您的收入中扣除。若已结算，将在下个结算周期自动轧差扣减。',
    },
    checklists: {
      title: '执业认证材料清单',
      subtitle: '医生与护士在注册时需提交的核心凭证，助力快速审核通过。',
      docTitle: '马来西亚医药理事会 (MMC) 医生',
      docItems: [
        '马来西亚医药理事会 (MMC) 正式注册证书 (Full Registration)',
        '当年度有效年度执业证书 (Annual Practising Certificate - APC)',
        '国家专科名册证书 (NSR Certificate，专科医生适用)',
        '有效的医疗专业责任保险凭证 (Medical Indemnity Insurance)',
        '马来西亚身份证 (MyKad) 或护照以及本人实名银行账户',
      ],
      nurseTitle: '马来西亚护理委员会 (LJM) 护士',
      nurseItems: [
        '马来西亚护理委员会 (LJM) 注册证书 (Perakuan Pendaftaran Jururawat)',
        '当年度有效年度执业证书 (Annual Practising Certificate - APC)',
        '卫生部及国家学术鉴定局 (MQA) 认可的护理文凭或学士学位证书',
        '专科进修证书 (Post-Basic: 如伤口护理、ICU、透析、助产、姑息治疗)',
        '马来西亚身份证 (MyKad) 或护照以及本人实名银行账户',
      ],
    },
    rules: {
      title: '您需要遵守的法规准则',
      intro: '这些规则源自马来西亚法定医疗法规与卫生部指南，切实保护医护人员合法权益与患者安全。',
      items: [
        '身在马来西亚境内的患者，仅限由在马来西亚正式注册的医疗执业人员提供线上问诊。',
        '默认情况下，长期慢性疾病患者的初次就医评估必须由医生当面进行。',
        '依据马来西亚医药理事会 (MMC) 伦理准则，严禁仅凭视频远程问诊开具病假单 (MC)。',
        '严禁向境外患者开具电子处方；受管制毒药及麻醉药物严禁使用电子处方。',
        '平台严禁用于急性急救场景。突发急危重症患者须立即拨打 999 呼叫国家急救救护车。',
        '患者对健康记录拥有自主授权控制，每一次医护人员调阅记录均被不可篡改地记录在案。',
      ],
    },
    facility: {
      title: '您是诊所管理者或医院 Locum 排班负责人吗？',
      sub: '快速对接经过严格背景与执照审核的 MMC 医生与 LJM 护士，满足病房代班、门诊急缺与专业护理人手需求。',
      cta: '了解医疗机构解决方案',
    },
    cta: {
      title: '准备好加入马来西亚权威认证医护网络了吗？',
      text: '注册账户即刻启动执照核验流程。在审核委员会完成官方核对后，您的专业名录将正式向全马公众开放。',
      button: '立即申请加入医护网络',
    },
  },
};

// 10 Unified Clinical Modules
const UNIFIED_CAPABILITIES: {
  id: string;
  role: 'doctor' | 'nurse' | 'all';
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  t: { en: string; ms: string; zh: string };
  d: { en: string; ms: string; zh: string };
  badge?: string;
}[] = [
  {
    id: 'video-consult',
    role: 'doctor',
    icon: Video,
    tag: 'Doctor Exclusive',
    t: { en: 'Telehealth & Video Consultations', ms: 'Konsultasi Video & Teleperubatan', zh: '高清视频远程门诊' },
    d: {
      en: 'Patients book secure video or in-person clinic visits. You maintain 100% control over your schedule and consultation fee.',
      ms: 'Pesakit menempah lawatan video atau bersemuka di klinik. Anda mengawal sepenuhnya jadual dan yuran konsultasi anda.',
      zh: '患者预约安全视频或线下就诊。您可以全权自主设定您的可预约出诊时间表及问诊费用。'
    },
    badge: 'MMC Telemedicine Aligned',
  },
  {
    id: 'instant-queue',
    role: 'doctor',
    icon: Hourglass,
    tag: 'Doctor Exclusive',
    t: { en: 'Instant Consult-Now Queue', ms: 'Giliran Konsultasi Segera', zh: '即时快速问诊队列' },
    d: {
      en: 'Toggle online when available to receive on-demand urgent inquiries. Automated 10-minute refund protects patient trust if unfulfilled.',
      ms: 'Buka mod dalam talian apabila lapang untuk menerima pertanyaan segera. Bayaran balik automatik 10 minit sekiranya tidak terjawab.',
      zh: '空闲时一键上线接收即时急迫问诊需求。设有 10 分钟超时自动全额退款保障机制。'
    },
    badge: '10-Min Auto Refund',
  },
  {
    id: 'e-rx',
    role: 'doctor',
    icon: Pill,
    tag: 'Doctor Exclusive',
    t: { en: 'Tamper-Evident QR e-Prescriptions', ms: 'E-Preskripsi Kod QR Selamat', zh: '防伪二维码电子处方' },
    d: {
      en: 'Issue doctor-signed digital prescriptions with embedded cryptographic QR codes, screened for patient allergies and drug interactions.',
      ms: 'Keluarkan preskripsi digital ditandatangani doktor dengan kod QR kriptografi, disaring untuk alergi pesakit dan interaksi ubat.',
      zh: '开具医生数字签名的防伪二维码处方，系统自动执行患者药物过敏史与相互作用安全筛查。'
    },
    badge: 'Poisons Act 1952 Aligned',
  },
  {
    id: 'clinical-notes',
    role: 'doctor',
    icon: FileSignature,
    tag: 'Doctor Exclusive',
    t: { en: 'Clinical Visit Notes & In-Person MCs', ms: 'Nota Klinikal & Sijil Cuti Sakit', zh: '就诊病历与病假证明' },
    d: {
      en: 'Digitally author and sign clinical records. Issue medical certificates (MCs) for in-person evaluations in compliance with MMC ethical guidelines.',
      ms: 'Tulis dan tandatangani rekod klinikal secara digital. Keluarkan sijil cuti sakit (MC) hanya untuk penilaian bersemuka mengikut kod etika MMC.',
      zh: '数字化撰写并签署规范临床病历。严格遵循 MMC 准则，仅限在线下当面评估后开具法定病假单。'
    },
    badge: 'MMC Ethical Code',
  },
  {
    id: 'wound-care',
    role: 'nurse',
    icon: Bandage,
    tag: 'Nurse Exclusive',
    t: { en: 'Sterile Wound Dressing & Suture Removal', ms: 'Balutan Luka Steril & Buka Jahitan', zh: '无菌伤口换药与手术拆线' },
    d: {
      en: 'In-home post-operative incision care, diabetic foot ulcer management, surgical suture and staple removal adhering to KKM aseptic standards.',
      ms: 'Penjagaan insisi pembedahan di rumah, rawatan ulser kaki diabetes, pembuangan benang dan staple jahitan mengikut piawaian aseptik KKM.',
      zh: '上门提供术后手术切口护理、糖尿病足部溃疡照护、手术缝线/缝钉无菌拆除，严格执行院感标准。'
    },
    badge: 'KKM Aseptic Protocol',
  },
  {
    id: 'injections',
    role: 'nurse',
    icon: Syringe,
    tag: 'Nurse Exclusive',
    t: { en: 'Prescribed Injections & Catheter Care', ms: 'Suntikan Preskripsi & Kateter', zh: '遵医嘱注射与导尿管护理' },
    d: {
      en: 'Execute doctor-ordered subcutaneous and intramuscular injections, IV line maintenance, Foley catheter insertion, and stoma care.',
      ms: 'Laksanakan suntikan subkutaneus dan intramuskular yang dipreskripsi doktor, penyelenggaraan kanula IV, kateter Foley, dan stoma.',
      zh: '执行执业医师医嘱皮下与肌内注射给药、留置针静脉维护、Foley 导尿管插管更换以及造口专业护理。'
    },
    badge: 'Doctor-Ordered Care',
  },
  {
    id: 'elderly-care',
    role: 'nurse',
    icon: HeartPulse,
    tag: 'Nurse Exclusive',
    t: { en: 'Elderly, Bedridden & Palliative Nursing', ms: 'Penjagaan Warga Emas & Paliatif', zh: '老年卧床与临终姑息护理' },
    d: {
      en: 'Vital telemetry logging (BP, SpO2, blood glucose), pressure injury staging and turning regimens, tracheostomy suctioning, and caregiver coaching.',
      ms: 'Pencatatan tanda vital (tekanan darah, SpO2, glukosa), pencegahan luka baring, sedutan trakeostomi dan bimbingan penjaga keluarga.',
      zh: '定期监测生命体征（血压、血氧、血糖）、压疮分期预防与翻身护理、气管切开吸痰及家属专业照护培训。'
    },
    badge: 'Chronic Care & Vitals',
  },
  {
    id: 'maternal-care',
    role: 'nurse',
    icon: Sparkles,
    tag: 'Nurse Exclusive',
    t: { en: 'Maternal Postnatal & Newborn Visits', ms: 'Lawatan Ibu Bersalin & Bayi', zh: '产后母婴护理与新生儿访视' },
    d: {
      en: 'Postpartum mother recovery assessments, neonatal transcutaneous jaundice checks, umbilical cord hygiene, and lactation latch coaching.',
      ms: 'Pemeriksaan pemulihan ibu lepas bersalin, pemantauan jaundis neonatal, kebersihan tali pusat dan bimbingan penyusuan susu ibu.',
      zh: '产妇产后康复评估、新生儿黄疸经皮监测、新生儿脐带消毒护理以及专业助产士母乳喂养指导。'
    },
    badge: 'Certified Midwife Scope',
  },
  {
    id: 'locum-shifts',
    role: 'all',
    icon: ClipboardList,
    tag: 'Doctors & Nurses',
    t: { en: 'Hospital & Clinic Locum Shifts', ms: 'Syif Locum Hospital & Klinik', zh: '私立医院与诊所 Locum 排班' },
    d: {
      en: 'Browse and claim verified shift opportunities across private hospitals, emergency units, hemodialysis centres, and GP clinics in Malaysia.',
      ms: 'Layari dan ambil peluang syif locum yang disahkan di hospital swasta, unit kecemasan, pusat hemodialisis dan klinik GP di Malaysia.',
      zh: '浏览并承接全马私立综合医院、急诊中心、血液透析中心以及 GP 门诊的真实合规代班需求。'
    },
    badge: 'Klang Valley, Penang, Johor',
  },
  {
    id: 'global-care',
    role: 'all',
    icon: Plane,
    tag: 'Doctors & Nurses',
    t: { en: 'International Patient Coordination', ms: 'Penyelarasan Pesakit Antarabangsa', zh: '国际医疗旅游转诊协同' },
    d: {
      en: 'Facility-assigned practitioners answer pre-arrival clinical inquiries, provide itemized medical quotes, and generate discharge summaries.',
      ms: 'Pengamal yang ditugaskan kemudahan menjawab pertanyaan pra-ketibaan, menyediakan sebut harga rawatan, dan ringkasan discaj.',
      zh: '机构指定医护人员回复境外患者行前咨询、提供详细治疗报价并出具权威双语出院小结。'
    },
    badge: 'MHTC Cross-Border',
  },
];

export interface PractitionerPageProps {
  initialRole?: 'all' | 'doctor' | 'nurse';
}

export default function PractitionerPage({ initialRole = 'all' }: PractitionerPageProps) {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];

  // Determine initial slide: 0 = Doctor, 1 = Nurse, 2 = Collaborative
  const getInitialSlideIndex = () => {
    if (initialRole === 'doctor') return 0;
    if (initialRole === 'nurse') return 1;
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/for-doctors')) return 0;
      if (window.location.pathname.includes('/for-nurses')) return 1;
    }
    return 2; // Unified slide by default for general practitioner landing
  };

  const [currentSlide, setCurrentSlide] = useState<number>(getInitialSlideIndex);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [bentoFilter, setBentoFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [calcRole, setCalcRole] = useState<'doctor' | 'nurse'>(initialRole === 'nurse' ? 'nurse' : 'doctor');
  const [fee, setFee] = useState<number>(calcRole === 'nurse' ? 120 : 150);
  const [pct, setPct] = useState<number | null>(null);
  const [payout, setPayout] = useState<PayoutTerms | null>(null);

  const commissionRate = (pct ?? 15) / 100;
  const platformFee = Math.round(fee * commissionRate * 100) / 100;
  const netTakeHome = Math.round((fee - platformFee) * 100) / 100;

  // Autoplay hero slides every 7 seconds when not paused
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % tx.heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, tx.heroSlides.length]);

  useEffect(() => {
    fetch('/api/payments/terms')
      .then(r => r.json())
      .then(d => {
        if (d.status !== 'success') return;
        if (typeof d.data.commissionPct === 'number') setPct(d.data.commissionPct);
        if (d.data.payout) setPayout(d.data.payout);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = tx.title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content = tx.description;
    return () => {
      document.title = prevTitle;
      if (created) meta!.remove();
      else meta!.content = prevDesc;
    };
  }, [tx.title, tx.description]);

  const join = () => navigate(loginUrl('practitioner', true));
  const signIn = () => navigate(loginUrl('practitioner', false));

  const activeSlide = tx.heroSlides[currentSlide] ?? tx.heroSlides[0];

  const btnPrimary =
    'min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm transition-all duration-200';
  const btnSecondary =
    'min-h-[48px] px-6 text-sm font-extrabold text-slate-800 bg-white/95 hover:bg-slate-100 border border-[color:var(--t-200)] cursor-pointer inline-flex items-center justify-center shadow-xs transition-all duration-200';
  const h2 =
    'font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)] leading-tight';

  return (
    <div className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased selection:bg-[color:var(--t-600)] selection:text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold"
      >
        Skip to content
      </a>

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <a
            href="/"
            onClick={e => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-2.5 min-w-0"
            aria-label="MedCred home"
          >
            <span className="w-9 h-9 shrink-0 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
              </svg>
            </span>
            <span className="font-display font-black text-xl tracking-tight text-[color:var(--ink)]">
              MedCred<span className="text-[color:var(--t-600)]">.</span>
              <span className="ml-2 text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-300)]">
                Practitioner Network
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={signIn}
              className="hidden sm:inline-flex items-center gap-2 min-h-[44px] px-4 sm:px-5 text-xs sm:text-sm font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Practitioner Sign In</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow w-full">
        {/* ─── SECTION 1: SLIDING HERO SECTION WITH AI DUAL PRACTITIONER IMAGE ─── */}
        <section
          className="relative border-b border-[color:var(--t-200)] overflow-hidden h-[680px] sm:h-[660px] lg:h-[640px] flex items-center bg-transparent"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          aria-label="Practitioner Carousel"
        >
          {/* AI-Generated Dual Doctor & Nurse Clinical Background Image (Original orientation with 70% opacity) */}
          <div
            className="absolute inset-0 pointer-events-none bg-cover bg-no-repeat opacity-[0.7]"
            style={{
              backgroundImage: "url('/assets/practitioners_hero_bg.jpg')",
              backgroundPosition: 'right 15% center',
              opacity: 0.7,
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
            {/* Top Interactive Slide Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
              <div className="inline-flex p-1 bg-white/95 backdrop-blur-md border border-[color:var(--t-200)] shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSlide(0);
                    setCalcRole('doctor');
                    setFee(150);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentSlide === 0
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>01. For Doctors (MMC)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentSlide(1);
                    setCalcRole('nurse');
                    setFee(120);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentSlide === 1
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <HeartPulse className="h-3.5 w-3.5" />
                  <span>02. For Nurses (LJM)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentSlide(2)}
                  className={`px-3.5 py-1.5 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentSlide === 2
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>03. Unified Team</span>
                </button>
              </div>

              {/* Slide Navigation Controls */}
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-[color:var(--t-200)] p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrentSlide(prev => (prev === 0 ? tx.heroSlides.length - 1 : prev - 1))}
                  aria-label="Previous Slide"
                  className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="px-2 text-[11px] font-mono font-black text-slate-600">
                  0{currentSlide + 1} / 0{tx.heroSlides.length}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentSlide(prev => (prev + 1) % tx.heroSlides.length)}
                  aria-label="Next Slide"
                  className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  aria-label={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Slide Content Grid - Static layout heights across all slides */}
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Dynamic Hero Content with Static Vertical Geometry */}
              <div className="lg:col-span-7 flex flex-col justify-center max-w-2xl">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {activeSlide.tag}
                  </div>
                </div>

                <div className="min-h-[76px] sm:min-h-[88px] lg:min-h-[96px] flex flex-col justify-center mt-3">
                  <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl xl:text-[40px] tracking-tight leading-[1.12] text-slate-900 transition-all">
                    <span>{activeSlide.titleLead}</span>
                    <span
                      className={
                        currentSlide === 1
                          ? 'text-emerald-700'
                          : currentSlide === 0
                          ? 'text-[color:var(--t-600)]'
                          : 'text-slate-900'
                      }
                    >
                      {activeSlide.titleAccent}
                    </span>
                  </h1>
                </div>

                <div className="min-h-[68px] sm:min-h-[60px] flex items-center mt-2.5">
                  <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                    {activeSlide.sub}
                  </p>
                </div>

                <div className="pt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={join} className={btnPrimary}>
                    {activeSlide.ctaPrimary}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={signIn} className={btnSecondary}>
                    {activeSlide.ctaSecondary}
                  </button>
                </div>

                {/* Proof Metric Chips */}
                <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">100%</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">{activeSlide.trust1}</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">RM 0</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">{activeSlide.trust2}</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">14-Day</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">{activeSlide.trust3}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: UNIFIED TRUST & COMPLIANCE METRIC STRIP ─── */}
        <section aria-label="Key Platform Metrics" className="py-8 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tx.metrics.map(m => (
                <div
                  key={m.label}
                  className="p-5 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)] flex flex-col justify-between"
                >
                  <div>
                    <div className="font-display font-black text-2xl text-[color:var(--t-700)]">{m.value}</div>
                    <div className="font-bold text-xs text-slate-900 mt-1 uppercase tracking-wider">{m.label}</div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: UNIFIED 4-STEP ONBOARDING JOURNEY ─── */}
        <section aria-labelledby="steps-h" className="py-14 sm:py-20 border-b border-[color:var(--t-200)] bg-[color:var(--t-bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-10">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-[color:var(--t-600)] inline-block" />
                Accreditation Process
              </p>
              <h2 id="steps-h" className={h2}>
                {tx.steps.title}
              </h2>
              <p className="mt-2 text-sm text-slate-700 font-medium">{tx.steps.subtitle}</p>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {tx.steps.items.map((s, i) => (
                <li
                  key={s.t}
                  className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-mono font-extrabold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">
                        STEP 0{i + 1}
                      </span>
                      <span className="w-8 h-8 bg-[color:var(--t-50)] text-[color:var(--t-700)] flex items-center justify-center border border-[color:var(--t-200)]">
                        {i === 0 && <UserCheck className="h-4 w-4" />}
                        {i === 1 && <FileText className="h-4 w-4" />}
                        {i === 2 && <Search className="h-4 w-4" />}
                        {i === 3 && <BadgeCheck className="h-4 w-4" />}
                      </span>
                    </div>
                    <h3 className="font-display font-extrabold text-base text-slate-900 leading-snug">{s.t}</h3>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed font-medium">{s.d}</p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Verified Council Gate</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── SECTION 4: UNIFIED CLINICAL PRACTICE SCOPES (BENTO GRID) ─── */}
        <section aria-labelledby="scopes-h" className="py-14 sm:py-20 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div className="max-w-2xl">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[color:var(--t-600)] inline-block" />
                  Clinical Tools &amp; Procedures
                </p>
                <h2 id="scopes-h" className={h2}>
                  {tx.capabilities.title}
                </h2>
                <p className="mt-2 text-sm text-slate-700 font-medium">{tx.capabilities.subtitle}</p>
              </div>

              {/* Scope Filtering Tabs */}
              <div className="inline-flex p-1 bg-[color:var(--t-50)] border border-[color:var(--t-200)] shadow-2xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBentoFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    bentoFilter === 'all'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tx.capabilities.allTab}
                </button>
                <button
                  type="button"
                  onClick={() => setBentoFilter('doctor')}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    bentoFilter === 'doctor'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tx.capabilities.docTab}
                </button>
                <button
                  type="button"
                  onClick={() => setBentoFilter('nurse')}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    bentoFilter === 'nurse'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tx.capabilities.nurseTab}
                </button>
              </div>
            </div>

            {/* Scope Guidance Callout Note */}
            {bentoFilter === 'nurse' && (
              <div className="mb-6 p-4 bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>LJM Registered Nurse Workflows:</strong> Conduct verified in-person home nursing visits,
                  patient vital logs, clinical care notes, hospital locum shift coverage, and international patient
                  coordination. Under the Malaysian Poisons Act 1952, e-prescriptions and medical certificates remain
                  doctor-exclusive.
                </span>
              </div>
            )}

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {UNIFIED_CAPABILITIES.map(mod => {
                if (bentoFilter === 'doctor' && mod.role === 'nurse') return null;
                if (bentoFilter === 'nurse' && mod.role === 'doctor') return null;
                const Icon = mod.icon;
                const isNurseExclusive = mod.role === 'nurse';

                return (
                  <li
                    key={mod.id}
                    className={`bg-white border p-6 hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                      isNurseExclusive
                        ? 'border-emerald-100 hover:border-emerald-300'
                        : 'border-[color:var(--t-200)] hover:border-[color:var(--t-400)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`w-10 h-10 border flex items-center justify-center ${
                            isNurseExclusive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-700)]'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                            isNurseExclusive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {mod.tag}
                        </span>
                      </div>
                      <h3 className="font-display font-extrabold text-base text-slate-900 leading-snug">
                        {mod.t[L]}
                      </h3>
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed font-medium">{mod.d[L]}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{mod.badge ?? 'Verified Platform Feature'}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ─── SECTION 5: UNIFIED INTERACTIVE EARNINGS & PAYOUT CALCULATOR ─── */}
        <section aria-labelledby="paid-h" className="py-14 sm:py-20 border-b border-[color:var(--t-200)] bg-[color:var(--t-bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-8">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-[color:var(--t-600)] inline-block" />
                Financial Clarity &amp; Payouts
              </p>
              <h2 id="paid-h" className={h2}>
                {tx.paid.title}
              </h2>
              <p className="mt-2 text-sm text-slate-700 font-medium">{tx.paid.subtitle}</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Interactive Earnings Simulator */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[color:var(--t-200)]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--t-700)]">
                      Net Payout Rate
                    </span>
                    <span className="font-display font-black text-2xl text-[color:var(--t-700)]">
                      {pct !== null ? `${100 - pct}%` : '85%'} Net Take-Home
                    </span>
                  </div>

                  {/* Calculator Widget */}
                  <div className="mt-5 space-y-4">
                    {/* Role Presets Toggle */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Calculator Role:
                      </span>
                      <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setCalcRole('doctor');
                            setFee(150);
                          }}
                          className={`px-3 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                            calcRole === 'doctor'
                              ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Doctor Consultations
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCalcRole('nurse');
                            setFee(120);
                          }}
                          className={`px-3 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                            calcRole === 'nurse'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Nurse Home Visits &amp; Locums
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label htmlFor="fee-slider" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        {calcRole === 'nurse'
                          ? 'Simulate Home Visit or Locum Nursing Fee:'
                          : 'Simulate Your Consultation Fee:'}
                      </label>
                      <span className="font-display font-black text-xl text-slate-900">
                        RM {fee}.00
                      </span>
                    </div>

                    <input
                      id="fee-slider"
                      type="range"
                      min={calcRole === 'nurse' ? '50' : '40'}
                      max={calcRole === 'nurse' ? '400' : '350'}
                      step="10"
                      value={fee}
                      onChange={e => setFee(Number(e.target.value))}
                      className="w-full accent-[color:var(--t-600)] cursor-pointer"
                    />

                    {/* Presets */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
                      {calcRole === 'nurse'
                        ? [80, 120, 160, 220, 360].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setFee(val)}
                              className={`text-xs font-bold px-2.5 py-1 border transition-colors cursor-pointer ${
                                fee === val
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-emerald-50/60 text-slate-700 border-emerald-200 hover:bg-white'
                              }`}
                            >
                              RM {val} {val === 80 ? '(Vitals)' : val === 120 ? '(Home Visit)' : val === 160 ? '(Wound)' : val === 360 ? '(8h Locum)' : ''}
                            </button>
                          ))
                        : [60, 100, 150, 200, 280].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setFee(val)}
                              className={`text-xs font-bold px-2.5 py-1 border transition-colors cursor-pointer ${
                                fee === val
                                  ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)]'
                                  : 'bg-[color:var(--t-50)] text-slate-700 border-[color:var(--t-200)] hover:bg-white'
                              }`}
                            >
                              RM {val}
                            </button>
                          ))}
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                      <div className="p-2 bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Fee</div>
                        <div className="text-sm font-black text-slate-800 mt-0.5">RM {fee}.00</div>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">MedCred ({pct ?? 15}%)</div>
                        <div className="text-sm font-black text-slate-600 mt-0.5">RM {platformFee.toFixed(2)}</div>
                      </div>
                      <div
                        className={`p-2 border ${
                          calcRole === 'nurse'
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-[color:var(--t-50)] border-[color:var(--t-200)]'
                        }`}
                      >
                        <div
                          className={`text-[10px] font-black uppercase ${
                            calcRole === 'nurse' ? 'text-emerald-800' : 'text-[color:var(--t-700)]'
                          }`}
                        >
                          {calcRole === 'nurse' ? 'Nurse Takes' : 'Doctor Takes'}
                        </div>
                        <div
                          className={`text-sm font-black mt-0.5 ${
                            calcRole === 'nurse' ? 'text-emerald-800' : 'text-[color:var(--t-700)]'
                          }`}
                        >
                          RM {netTakeHome.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-slate-800 font-semibold leading-relaxed">{tx.paid.lead(pct)}</p>

                  <div className="mt-3 pt-3 border-t border-[color:var(--t-200)] flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Downloadable annual earnings summary formatted for your accountant and LHDN tax submission.</span>
                  </div>

                  {payout && (
                    <div className="mt-4 pt-4 border-t border-[color:var(--t-200)] grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-[color:var(--t-50)] p-3 border border-[color:var(--t-200)]">
                        <span className="text-slate-500 block font-medium">Payout Hold Period</span>
                        <span className="font-extrabold text-slate-900 text-sm">{payout.holdDays} Days</span>
                      </div>
                      <div className="bg-[color:var(--t-50)] p-3 border border-[color:var(--t-200)]">
                        <span className="text-slate-500 block font-medium">Minimum Threshold</span>
                        <span className="font-extrabold text-slate-900 text-sm">RM {payout.minimumPayout}</span>
                      </div>
                    </div>
                  )}
                  {payout && <p className="mt-3 text-xs text-slate-700 font-medium leading-relaxed">{tx.paid.process(payout)}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
                  <div className="p-4 bg-white border border-slate-200 shadow-2xs">
                    <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-[color:var(--t-600)]" /> Itemised Invoicing
                    </div>
                    {tx.paid.earnings}
                  </div>
                  <div className="p-4 bg-white border border-slate-200 shadow-2xs">
                    <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--t-600)]" /> Automatic Reconciliation
                    </div>
                    {tx.paid.refunds}
                  </div>
                </div>
              </div>

              {/* Right Column: Advisory & Regulatory Notes */}
              <div className="lg:col-span-5 space-y-4">
                <div className="border border-[color:var(--t-200)] p-6 bg-white shadow-sm space-y-4">
                  <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[color:var(--t-600)]" />
                    How Bank Settlements Work
                  </h3>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    You add your bank account in Earnings after your credentials are confirmed. The audit board checks
                    that the bank account is registered under your own legal name, prepares each payout, and transfers
                    the funds directly.
                  </p>
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 text-xs text-amber-950 font-medium">
                    <strong>Tax Advisory Notice:</strong> No income tax is automatically deducted at source. MedCred
                    provides comprehensive monthly statements and annual itemised earnings summaries formatted for your
                    licensed accountant and LHDN submission.
                  </div>
                </div>

                <div className="p-5 bg-white border border-slate-200 text-xs space-y-2.5 shadow-2xs">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Malaysian Banking Partner Compatibility
                  </div>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Direct automated settlement supported for Maybank, CIMB, Public Bank, RHB, Hong Leong, AmBank,
                    Bank Islam, and all PayNet DuitNow network financial institutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 6: CREDENTIALING & VERIFICATION CHECKLIST (SIDE-BY-SIDE) ─── */}
        <section aria-labelledby="checklists-h" className="py-14 sm:py-20 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-10">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-[color:var(--t-600)] inline-block" />
                Council Verification Standards
              </p>
              <h2 id="checklists-h" className={h2}>
                {tx.checklists.title}
              </h2>
              <p className="mt-2 text-sm text-slate-700 font-medium">{tx.checklists.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Doctor Checklist Card */}
              <div className="border border-[color:var(--t-200)] p-6 bg-white shadow-xs">
                <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-[color:var(--t-200)]">
                  <span className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-slate-900">{tx.checklists.docTitle}</h3>
                    <p className="text-xs text-slate-500 font-medium">Malaysian Medical Act 1971 Requirements</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {tx.checklists.docItems.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium leading-relaxed">
                      <Check className="h-4 w-4 text-[color:var(--t-600)] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Nurse Checklist Card */}
              <div className="border border-emerald-200 p-6 bg-emerald-50/30 shadow-xs">
                <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-emerald-200">
                  <span className="w-9 h-9 bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                    <HeartPulse className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-slate-900">{tx.checklists.nurseTitle}</h3>
                    <p className="text-xs text-slate-500 font-medium">Nurses Act 1950 &amp; LJM Requirements</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {tx.checklists.nurseItems.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium leading-relaxed">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 7: MALAYSIAN REGULATORY FRAMEWORK & RULES ─── */}
        <section aria-labelledby="rules-h" className="py-14 sm:py-20 border-b border-[color:var(--t-200)] bg-[color:var(--t-bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-8">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-[color:var(--t-600)] inline-block" />
                Malaysian Medical Governance
              </p>
              <h2 id="rules-h" className={h2}>
                {tx.rules.title}
              </h2>
              <p className="mt-2 text-sm text-slate-700 font-medium leading-relaxed">{tx.rules.intro}</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tx.rules.items.map((r, idx) => (
                <div key={idx} className="p-5 bg-white border border-[color:var(--t-200)] shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[color:var(--t-700)]">
                    <Scale className="h-4 w-4 shrink-0" />
                    <span>Statutory Safeguard 0{idx + 1}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 8: FACILITY & CLINIC STAFFING CALLOUT ─── */}
        <section className="py-8 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="flex items-start sm:items-center gap-4">
                <span className="w-12 h-12 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900">
                    {tx.facility.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-2xl">
                    {tx.facility.sub}
                  </p>
                </div>
              </div>

              <a
                href="/for-clinics"
                onClick={e => {
                  e.preventDefault();
                  navigate('/for-clinics');
                }}
                className="whitespace-nowrap px-5 py-2.5 text-xs font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] transition-colors inline-flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs"
              >
                <span>{tx.facility.cta}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ─── SECTION 9: FINAL CONVERSION CTA ─── */}
        <section aria-labelledby="cta-h" className="py-16 sm:py-24 bg-white text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-800">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span>Malaysian Medical Council &amp; Nursing Board Verified</span>
            </div>
            <h2 id="cta-h" className="font-display font-black text-2xl sm:text-4xl text-slate-900 tracking-tight">
              {tx.cta.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
              {tx.cta.text}
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={join} className={btnPrimary}>
                {tx.cta.button}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={signIn} className={btnSecondary}>
                Practitioner Sign In
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
