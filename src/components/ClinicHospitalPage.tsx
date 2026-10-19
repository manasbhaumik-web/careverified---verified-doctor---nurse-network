import React, { useState } from 'react';
import {
  ArrowRight, Award, Building2, CheckCircle2, ChevronRight, ClipboardList,
  FileSignature, HeartPulse, Lock, Pill, Plane, Scale, Search, ShieldCheck,
  Stethoscope, Users, Zap
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import PartnerEnquiryForm from './PartnerEnquiryForm';
import { loginUrl, navigate } from '../nav';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T = {
  en: {
    title: 'For Clinics & Hospitals | MedCred Malaysia',
    description: 'Empower your healthcare facility with verified locum doctor and nurse staffing, international medical tourism inquiries, and KKM Act 586 statutory compliance.',
    hero: {
      tag: 'KKM Act 586 Verified Facility Network',
      titleLead: 'Empower Your Healthcare Facility With ',
      titleAccent: 'Verified Staff & International Inquiries',
      sub: 'Malaysia’s unified healthcare infrastructure for private hospitals, specialist outpatient centres, and GP clinics. Post verified locum shifts, recruit MMC/LJM accredited practitioners, and receive structured medical tourism cases.',
      ctaApply: 'Register Your Facility',
      ctaSignin: 'Facility Staff Sign In',
      trust1: '100% Act 586 Verified',
      trust2: '4,800+ Active Clinicians',
      trust3: 'RM 0 Listing Fee',
    },
    metrics: [
      { value: 'Act 586', label: 'KKM Licensed Facilities', sub: 'Every private hospital and ambulatory clinic is verified against Ministry of Health registers.' },
      { value: '4,800+', label: 'Active MMC & LJM Clinicians', sub: 'Pre-vetted doctors and registered nurses ready for on-demand hospital shifts and outpatient sessions.' },
      { value: 'RM 0', label: 'Zero Upfront Platform Fees', sub: 'Free facility accreditation listing. Seamless pay-as-you-go locum shift settlements.' },
      { value: '100%', label: 'Immutable Audit Logging', sub: 'Full compliance with PDPA 2010 and Ministry of Health clinical confidentiality statutes.' },
    ],
    filter: {
      all: 'All Facility Solutions',
      hospitals: 'Private Hospitals & Medical Centres',
      clinics: 'Specialist & GP Outpatient Clinics',
    },
    capabilitiesTitle: 'Platform Capabilities for Healthcare Facilities',
    capabilitiesSub: 'Comprehensive clinical operations, locum staffing, and cross-border referral tools built for Malaysian healthcare providers.',
    calculator: {
      title: 'Facility Locum & Capacity Simulator',
      subtitle: 'Estimate staffing flexibility and cost savings when sourcing verified MMC doctors and LJM nurses for your facility.',
      facilityType: 'Facility Classification',
      types: [
        { id: 'gp', name: 'GP Ambulatory Clinic', baseRate: 75, unit: 'hour' },
        { id: 'specialist', name: 'Specialist Outpatient Centre', baseRate: 180, unit: 'hour' },
        { id: 'hospital', name: 'Private Hospital / Inpatient Ward', baseRate: 95, unit: 'hour' },
      ],
      sliderLabel: 'Weekly Locum Coverage Hours Needed',
      weeklyHours: 'hours/week',
      estMonthlyCost: 'Estimated Monthly Locum Spend',
      adminSavings: 'Estimated HR & Credentialing Hours Saved',
      hoursPerMonth: 'hrs/month',
      disclaimer: 'Actual practitioner hourly rates are determined by facility shift requirements and council seniority (MMC / LJM). Rates are exclusive of applicable service taxes.',
    },
    steps: {
      title: 'Facility Onboarding Journey',
      subtitle: 'A rigorous 4-step credentialing workflow ensuring patient safety and statutory compliance under Act 586.',
      items: [
        { t: 'Submit Facility License', d: 'Provide your KKM Private Healthcare Facilities and Services Act (Act 586) licence number, SSM registration, and facility address.' },
        { t: 'Board Accreditation Audit', d: 'Our medical directorate manually validates your facility licence and MSQH or JCI accreditation with current expiry dates.' },
        { t: 'Staff Account Provisioning', d: 'Your Chief Medical Officer, Nurse Unit Managers, and billing staff receive cryptographically signed verification tokens.' },
        { t: 'Go Live & Post Shifts', d: 'Appear on the national registry, dispatch instant locum shifts, and receive structured international patient referrals.' },
      ],
    },
    regulatory: {
      title: 'Malaysian Healthcare Statutory Compliance',
      subtitle: 'MedCred operates strictly within the Malaysian legal framework to safeguard healthcare facilities, clinicians, and patients.',
      items: [
        {
          title: 'Private Healthcare Facilities and Services Act 1998 (Act 586)',
          desc: 'Only facilities possessing a valid KKM Operating Licence under Act 586 are listed. Expired facility licences are automatically de-listed from job postings and public directories.',
        },
        {
          title: 'Medical Act 1971 & Nurses Act 1950 Scope Adherence',
          desc: 'All clinicians claimed for locum shifts undergo dual-tier verification: MMC Full Registration + active APC for physicians, and LJM Registration + active APC for nurses.',
        },
        {
          title: 'Personal Data Protection Act 2010 (PDPA) & EHR Confidentiality',
          desc: 'Patient health records, passport copies, and clinical histories are shared exclusively with explicit patient consent and protected by immutable access logging.',
        },
        {
          title: 'Poisons Act 1952 & Controlled Medication Protocols',
          desc: 'Clinic e-prescriptions issued via MedCred strictly comply with Group B and Group C poison dispensing protocols. Dangerous drugs (Group A) are never e-prescribed.',
        },
      ],
    },
    apply: {
      title: 'Accredit Your Facility With MedCred',
      intro: 'Join Malaysia’s premier network of verified healthcare facilities. Fill in your facility details below, and our clinical board will reach out to verify your Act 586 credentials.',
    },
  },
  ms: {
    title: 'Untuk Klinik & Hospital | MedCred Malaysia',
    description: 'Perkasakan kemudahan penjagaan kesihatan anda dengan kakitangan locum doktor dan jururawat disahkan, pertanyaan pelancongan perubatan antarabangsa, dan pematuhan Akta 586 KKM.',
    hero: {
      tag: 'Rangkaian Kemudahan Disahkan Akta 586 KKM',
      titleLead: 'Perkasakan Kemudahan Kesihatan Anda Dengan ',
      titleAccent: 'Kakitangan Disahkan & Rujukan Antarabangsa',
      sub: 'Infrastruktur penjagaan kesihatan bersepadu Malaysia untuk hospital swasta, pusat pesakit luar pakar, dan klinik GP. Siarkan syif locum disahkan, ambil pengamal bertauliah MMC/LJM, dan terima kes pelancongan perubatan berstruktur.',
      ctaApply: 'Daftar Kemudahan Anda',
      ctaSignin: 'Log Masuk Kakitangan',
      trust1: '100% Disahkan Akta 586',
      trust2: '4,800+ Pengamal Aktif',
      trust3: 'RM 0 Yuran Penyenaraian',
    },
    metrics: [
      { value: 'Akta 586', label: 'Kemudahan Berlesen KKM', sub: 'Setiap hospital swasta dan klinik ambulatori disahkan terus dengan daftar Kementerian Kesihatan Malaysia.' },
      { value: '4,800+', label: 'Pengamal Aktif MMC & LJM', sub: 'Doktor dan jururawat terlatih sedia untuk syif hospital kecemasan dan sesi klinik pesakit luar.' },
      { value: 'RM 0', label: 'Sifar Yuran Platform Awal', sub: 'Penyenaraian akreditasi kemudahan percuma. Penyelesaian bayaran syif locum telus mengikut penggunaan.' },
      { value: '100%', label: 'Log Audit Rekod Terkawal', sub: 'Pematuhan penuh Akta Perlindungan Data Peribadi 2010 (PDPA) dan kerahsiaan rekod perubatan.' },
    ],
    filter: {
      all: 'Semua Solusi Kemudahan',
      hospitals: 'Hospital Swasta & Pusat Perubatan',
      clinics: 'Klinik Pakar & GP Ambulatori',
    },
    capabilitiesTitle: 'Keupayaan Platform untuk Kemudahan Kesihatan',
    capabilitiesSub: 'Operasi klinikal menyeluruh, penempatan locum, dan alat rujukan rentas sempadan untuk penyedia kesihatan Malaysia.',
    calculator: {
      title: 'Simulator Locum & Kapasiti Kemudahan',
      subtitle: 'Anggarkan fleksibiliti kakitangan dan penjimatan kos apabila mendapatkan doktor MMC dan jururawat LJM bertauliah.',
      facilityType: 'Klasifikasi Kemudahan',
      types: [
        { id: 'gp', name: 'Klinik GP Pesakit Luar', baseRate: 75, unit: 'jam' },
        { id: 'specialist', name: 'Pusat Rawatan Pakar', baseRate: 180, unit: 'jam' },
        { id: 'hospital', name: 'Wad Hospital Swasta / ICU', baseRate: 95, unit: 'jam' },
      ],
      sliderLabel: 'Keperluan Jam Locum Mingguan',
      weeklyHours: 'jam/minggu',
      estMonthlyCost: 'Anggaran Perbelanjaan Locum Bulanan',
      adminSavings: 'Anggaran Jam Pengesahan & HR Dijimatkan',
      hoursPerMonth: 'jam/bulan',
      disclaimer: 'Kadar sejam sebenar ditentukan oleh keperluan syif kemudahan dan kekananan majlis (MMC / LJM).',
    },
    steps: {
      title: 'Langkah Pengakreditasian Kemudahan',
      subtitle: 'Aliran kerja pengesahan 4 langkah yang ketat untuk menjamin keselamatan pesakit dan pematuhan Akta 586.',
      items: [
        { t: 'Hantar Lesen Kemudahan', d: 'Sediakan nombor lesen Akta Kemudahan dan Perkhidmatan Jagaan Kesihatan Swasta 1998 (Akta 586), pendaftaran SSM dan alamat.' },
        { t: 'Audit Pengakreditasian Lembaga', d: 'Direktorat perubatan kami mengesahkan lesen kemudahan serta akreditasi MSQH atau JCI secara manual.' },
        { t: 'Pemberian Akaun Kakitangan', d: 'Ketua Pegawai Perubatan, Pengurus Unit Jururawat dan kakitangan bil menerima token pengesahan kriptografi.' },
        { t: 'Mula Operasi & Buka Syif', d: 'Muncul dalam daftar kemudahan kebangsaan, buka syif locum serta terima rujukan pesakit antarabangsa.' },
      ],
    },
    regulatory: {
      title: 'Pematuhan Statutori Penjagaan Kesihatan Malaysia',
      subtitle: 'MedCred beroperasi dengan tegas mengikut undang-undang Malaysia untuk melindungi kemudahan, klinisi dan pesakit.',
      items: [
        {
          title: 'Akta Kemudahan dan Perkhidmatan Jagaan Kesihatan Swasta 1998 (Akta 586)',
          desc: 'Hanya kemudahan yang memiliki Lesen Beroperasi KKM yang sah disenaraikan. Kemudahan yang tamat tempoh lesen disembunyikan secara automatik.',
        },
        {
          title: 'Pematuhan Skop Akta Perubatan 1971 & Akta Jururawat 1950',
          desc: 'Semua kakitangan locum disemak dua peringkat: Pendaftaran Penuh MMC + APC aktif untuk doktor, dan Pendaftaran LJM + APC aktif untuk jururawat.',
        },
        {
          title: 'Akta Perlindungan Data Peribadi 2010 (PDPA) & Kerahsiaan EHR',
          desc: 'Rekod kesihatan dan dokumen pesakit hanya dikongsi dengan persetujuan eksplisit pesakit dan dipantau melalui log audit yang kekal.',
        },
        {
          title: 'Akta Racun 1952 & Protokol Ubat Terkawal',
          desc: 'E-preskripsi klinik mematuhi protokol racun Kumpulan B dan Kumpulan C. Ubat berbahaya (Kumpulan A) dilarang sama sekali melalui e-preskripsi.',
        },
      ],
    },
    apply: {
      title: 'Akreditasi Kemudahan Anda di MedCred',
      intro: 'Sertai rangkaian kemudahan kesihatan disahkan terkemuka di Malaysia. Isi butiran kemudahan anda di bawah untuk tindakan lembaga klinikal kami.',
    },
  },
  zh: {
    title: '面向诊所与医院 | MedCred 马来西亚',
    description: '赋能您的医疗机构：经认证的医生与护士 Locum 代班排班、国际医疗旅游转诊对接以及卫生部第 586 条法令全流程合规。',
    hero: {
      tag: '卫生部第 586 号法令认证机构网络',
      titleLead: '以权威资质赋能您的医疗机构：',
      titleAccent: '认证医护人手与国际转诊生态',
      sub: '马来西亚私立医院、专科门诊中心与 GP 诊所的统一数字化基础设施。发布合规代班需求、调配 MMC/LJM 认证执业人员，并对接国际医疗旅游规范化咨询。',
      ctaApply: '申请认证机构入驻',
      ctaSignin: '机构员工登录',
      trust1: '100% 第 586 法令核验',
      trust2: '4,800+ 认证医护人员',
      trust3: 'RM 0 平台入驻费',
    },
    metrics: [
      { value: 'Act 586', label: '卫生部法定私立执照', sub: '每家私立综合医院与门诊诊所均直接对照马来西亚卫生部官方名册严格核验。' },
      { value: '4,800+', label: '活跃 MMC 与 LJM 医护', sub: '持有有效年度执业证书 (APC) 的全科/专科医生与注册护士，随时候命承接病房与门诊班次。' },
      { value: 'RM 0', label: '零前期平台入驻费用', sub: '机构名录免费展示，仅在成功排班及开展付费服务后享受透明结算。' },
      { value: '100%', label: '不可篡改审计追踪日志', sub: '严格遵循《2010年个人数据保护法令》(PDPA) 及国家医疗健康隐私法令。' },
    ],
    filter: {
      all: '全部机构解决方案',
      hospitals: '私立综合医院与专科中心',
      clinics: '专科门诊与全科诊所',
    },
    capabilitiesTitle: '面向医疗机构的核心平台功能',
    capabilitiesSub: '专为马来西亚私立医疗机构定制的临床运营、医护排班与跨境医疗服务工具集。',
    calculator: {
      title: '机构代班人手与运营效益模拟器',
      subtitle: '即刻测算调配 MMC 认证医生与 LJM 注册护士时的人力灵活性与综合运营节省。',
      facilityType: '机构类型',
      types: [
        { id: 'gp', name: 'GP 全科门诊诊所', baseRate: 75, unit: '小时' },
        { id: 'specialist', name: '专科日间门诊中心', baseRate: 180, unit: '小时' },
        { id: 'hospital', name: '私立综合医院 / 住院部', baseRate: 95, unit: '小时' },
      ],
      sliderLabel: '每周所需 Locum 代班工时',
      weeklyHours: '小时/周',
      estMonthlyCost: '预估月度代班人力支出',
      adminSavings: '预估每月节省的 HR 资质核查工时',
      hoursPerMonth: '小时/月',
      disclaimer: '实际医护时薪由机构具体班次要求及人员资历决定（MMC / LJM 认证）。',
    },
    steps: {
      title: '机构认证入驻流程',
      subtitle: '严格的 4 步资质认证流程，切实保障医疗质量与法定第 586 条法令合规。',
      items: [
        { t: '提交机构执业许可', d: '填写卫生部《1998年私立医疗保健设施与服务法令》（第 586 号法令）执照号码、SSM 企业注册号及实体地址。' },
        { t: '审核委员会人工核验', d: '由医学委员会人工对照卫生部及 MSQH / JCI 权威目录核对机构资质与证书有效期。' },
        { t: '指派机构人员专业账户', d: '为您的医务总监、病房护士长与账务人员开通经加密签名的专属认证员工账户。' },
        { t: '正式上线开展业务', d: '展示于国家认证机构名录，一键发布代班班次并开始接收国际医疗旅游咨询。' },
      ],
    },
    regulatory: {
      title: '马来西亚法定医疗合规标准',
      subtitle: 'MedCred 严格运行于马来西亚法定框架内，全面保障医疗机构、执业医护人员与患者合法权益。',
      items: [
        {
          title: '《1998年私立医疗保健设施与服务法令》（第 586 条法令）',
          desc: '仅限持有有效执业执照的合法私立机构入驻。执照到期的机构将被自动从招聘市场与名录中下架屏蔽。',
        },
        {
          title: '《1971年医疗法令》与《1950年护士法令》资质核验',
          desc: '所有承接代班的人员必须通过双重核验：医生须具备 MMC 正式注册与有效 APC；护士须具备 LJM 注册与有效 APC。',
        },
        {
          title: '《2010年个人数据保护法令》(PDPA) 与电子病历安全',
          desc: '患者护照与就诊病历仅在患者授权同意后才对指定医疗人员开放，每次查阅均生成不可篡改的安全审计日志。',
        },
        {
          title: '《1952年毒药法令》与处方配药规范',
          desc: '诊所数字处方严格依据 B 组与 C 组毒药管理规范开具；严禁对 A 组管制麻醉危险药物开具线上处方。',
        },
      ],
    },
    apply: {
      title: '立即申请机构认证入驻',
      intro: '加入马来西亚权威认证医疗机构生态。在下方提交您的机构基本资料，审核委员会将尽快与您对接核验。',
    },
  },
};

const CAPABILITIES = [
  {
    id: 'locum-dispatch',
    category: 'hospitals',
    title: {
      en: 'Urgent Locum & Ward Shift Dispatch',
      ms: 'Penempatan Syif Locum & Wad Segera',
      zh: '急诊与住院病房 Locum 班次调度',
    },
    desc: {
      en: 'Publish dated clinical shifts with pre-agreed hourly ringgit rates. Fill emergency department, ICU, and general ward rosters with pre-vetted MMC doctors and LJM nurses.',
      ms: 'Siarkan syif klinikal bertarikh dengan kadar sejam dipersetujui. Penuhi giliran jabatan kecemasan, ICU, dan wad am dengan doktor MMC dan jururawat LJM yang disahkan.',
      zh: '按小时发布透明费率的代班班次需求。快速调配经预审的 MMC 医生与 LJM 护士填补急诊科、ICU 及普通病房排班空缺。',
    },
    badge: 'MMC & LJM Verified',
    icon: Users,
  },
  {
    id: 'tourism-intake',
    category: 'all',
    title: {
      en: 'MHTC Cross-Border Patient Referral Intake',
      ms: 'Penerimaan Pertanyaan Pesakit MHTC',
      zh: 'MHTC 国际医疗旅游跨境转诊对接',
    },
    desc: {
      en: 'Receive structured clinical inquiries from overseas patients via MedCred’s cross-border portal, including travel dates, diagnostic summaries, and special concierge needs.',
      ms: 'Terima pertanyaan klinikal berstruktur daripada pesakit luar negara melalui portal MedCred, termasuk tarikh perjalanan, ringkasan diagnosis dan keperluan khas.',
      zh: '通过专属跨境门户接收海外患者的规范化行前咨询，包含抵马日程、历史病历摘要及特需陪护服务需求。',
    },
    badge: 'Cross-Border Concierge',
    icon: Plane,
  },
  {
    id: 'itemised-quotes',
    category: 'all',
    title: {
      en: 'Tamper-Evident Itemised Quotes',
      ms: 'Sebut Harga Terperinci Bebas Manipulasi',
      zh: '防篡改逐项透明医疗报价系统',
    },
    desc: {
      en: 'Generate binding quotes listing procedural fees, inclusions, exclusions, and cancellation terms. Eliminates billing disputes for both local and international patients.',
      ms: 'Hantar sebut harga mengikat yang menyenaraikan caj prosedur, apa yang termasuk, apa yang tidak termasuk dan terma pembatalan tanpa pertikaian.',
      zh: '生成具备法律约束力的逐项治疗报价，清晰列明手术费用、包含项目、除外责任及退款政策，杜绝账单争议。',
    },
    badge: 'Direct Facility Billing',
    icon: FileSignature,
  },
  {
    id: 'discharge-summaries',
    category: 'hospitals',
    title: {
      en: 'Certified Digital Discharge Summaries',
      ms: 'Ringkasan Discaj Digital Diperakui',
      zh: '权威双语数字出院小结',
    },
    desc: {
      en: 'Verified hospital doctors author structured bilingual discharge summaries with encrypted, time-expiring links that patients can share with their home physicians.',
      ms: 'Doktor hospital bertauliah menulis ringkasan discaj dwibahasa dengan pautan selamat bertempoh untuk dikongsi dengan doktor negara asal pesakit.',
      zh: '由机构认证医生出具规范化中英文双语出院小结，支持生成具时效性的高强度加密分享链接以便海外家庭医生查阅。',
    },
    badge: 'Expiring Secure Link',
    icon: Stethoscope,
  },
  {
    id: 'eprescription-network',
    category: 'clinics',
    title: {
      en: 'Integrated e-Pharmacy Dispensing Network',
      ms: 'Rangkaian Pendispensan E-Farmasi',
      zh: '整合式数字处方智慧配药网络',
    },
    desc: {
      en: 'Route clinic e-prescriptions with embedded cryptographic QR codes directly to MedCred licensed partner pharmacies for home delivery or patient pickup.',
      ms: 'Hantar e-preskripsi klinik dengan kod QR kriptografi terus ke farmasi rakan kongsi MedCred untuk penghantaran ke rumah atau kutipan pesakit.',
      zh: '诊所医生开具的带防伪二维码处方可一键直连合作执业药房，支持患者就近取药或恒温冷链配送到家。',
    },
    badge: 'Poisons Act Compliant',
    icon: Pill,
  },
  {
    id: 'staff-roles',
    category: 'all',
    title: {
      en: 'Role-Based Staff Access & Audit Logs',
      ms: 'Akses Kakitangan Berasaskan Peranan',
      zh: '多级机构员工角色与审计追踪',
    },
    desc: {
      en: 'Assign dedicated access for Medical Directors, Nurse Supervisors, and Billing Officers. Every patient case opening and export is permanently logged.',
      ms: 'Tetapkan akses khas untuk Pengarah Perubatan, Penyelia Jururawat, dan Pegawai Bil. Setiap pembukaan rekod pesakit dilog secara kekal.',
      zh: '为医务总监、护士长及账务人员分配严格的角色权限。每一笔患者病历的调阅与导出均被不可篡改地记录在案。',
    },
    badge: 'PDPA 2010 Audit Trail',
    icon: Lock,
  },
  {
    id: 'quality-accreditation',
    category: 'hospitals',
    title: {
      en: 'MSQH & JCI Quality Accreditation Badging',
      ms: 'Lencana Kualiti MSQH & JCI Disahkan',
      zh: 'MSQH 与 JCI 权威医疗认证徽章',
    },
    desc: {
      en: 'Display verified national (MSQH) and international (JCI) accreditation certificates with real-time expiry tracking to instill maximum patient trust.',
      ms: 'Paparkan sijil akreditasi kebangsaan (MSQH) dan antarabangsa (JCI) yang disahkan dengan pemantauan tarikh tamat untuk keyakinan pesakit.',
      zh: '展示经过人工核验的马来西亚健康质量协会 (MSQH) 及国际联合委员会 (JCI) 认证证书，并实时跟踪证书有效期。',
    },
    badge: 'Verified Expiry Dates',
    icon: Award,
  },
  {
    id: 'homecare-continuity',
    category: 'clinics',
    title: {
      en: 'Post-Discharge Home Care Continuity',
      ms: 'Kesinambungan Penjagaan Rumah Pasca-Discaj',
      zh: '院后延伸上门居家专业护理',
    },
    desc: {
      en: 'Seamlessly coordinate discharge care by dispatching verified LJM nurses for in-home wound debridement, Foley catheter maintenance, and IV infusions.',
      ms: 'Selaraskan penjagaan selepas keluar hospital dengan menugaskan jururawat LJM untuk balutan luka di rumah, kateter Foley, dan infusi IV.',
      zh: '将门诊与住院照护延伸至患者家中，调度认证 LJM 护士提供上门无菌伤口换药、导尿管维护及生命体征连续监测。',
    },
    badge: 'LJM Home Nursing',
    icon: HeartPulse,
  },
];

export default function ClinicHospitalPage() {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];

  const [activeTab, setActiveTab] = useState<'all' | 'hospitals' | 'clinics'>('all');
  const [selectedFacility, setSelectedFacility] = useState<'gp' | 'specialist' | 'hospital'>('gp');
  const [hoursNeeded, setHoursNeeded] = useState<number>(20);

  const currentType = tx.calculator.types.find(t => t.id === selectedFacility) || tx.calculator.types[0];
  const monthlyCost = Math.round(hoursNeeded * currentType.baseRate * 4.33);
  const monthlyAdminSaved = Math.round(hoursNeeded * 0.4 * 4.33);

  const filteredCapabilities = CAPABILITIES.filter(c => {
    if (activeTab === 'all') return true;
    return c.category === 'all' || c.category === activeTab;
  });

  const btnPrimary =
    'min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm transition-all duration-200';
  const btnSecondary =
    'min-h-[48px] px-6 text-sm font-extrabold text-slate-800 bg-white/95 hover:bg-slate-100 border border-[color:var(--t-200)] cursor-pointer inline-flex items-center justify-center shadow-xs transition-all duration-200';
  const h2 =
    'font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)] leading-tight';

  const scrollToApply = () => {
    const el = document.getElementById('apply');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

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
              <span className="ml-2 text-xs font-mono font-extrabold uppercase px-1.5 py-0.5 bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-300)]">
                Clinic & Hospital Network
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(loginUrl('facility', false))}
              className="hidden sm:inline-flex items-center gap-2 min-h-[44px] px-4 sm:px-5 text-xs sm:text-sm font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{tx.hero.ctaSignin}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow w-full">
        {/* ─── SECTION 1: HERO SECTION WITH AI CLINICS & HOSPITALS IMAGE AT 60% OPACITY ─── */}
        <section
          className="relative border-b border-[color:var(--t-200)] overflow-hidden h-[660px] sm:h-[640px] lg:h-[620px] flex items-center bg-transparent"
          aria-label="Clinics and Hospitals Hero"
        >
          {/* AI-Generated High-Resolution Clinics & Hospitals Hero Image at 70% Opacity */}
          <div
            className="absolute inset-0 pointer-events-none bg-cover bg-no-repeat opacity-[0.7]"
            style={{
              backgroundImage: "url('/assets/clinics_hospital_hero_bg.jpg')",
              backgroundPosition: 'right 20% center',
              opacity: 0.7,
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Focused Facility Messaging */}
              <div className="lg:col-span-8 flex flex-col justify-center max-w-2xl">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {tx.hero.tag}
                  </div>
                </div>

                <div className="min-h-[84px] sm:min-h-[96px] flex flex-col justify-center mt-3">
                  <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-[1.12] text-slate-900">
                    <span>{tx.hero.titleLead}</span>
                    <span className="text-[color:var(--t-600)]">{tx.hero.titleAccent}</span>
                  </h1>
                </div>

                <div className="min-h-[64px] flex items-center mt-2.5">
                  <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                    {tx.hero.sub}
                  </p>
                </div>

                <div className="pt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={scrollToApply} className={btnPrimary}>
                    {tx.hero.ctaApply}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(loginUrl('facility', false))}
                    className={btnSecondary}
                  >
                    {tx.hero.ctaSignin}
                  </button>
                </div>

                {/* Proof Metric Chips */}
                <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">Act 586</div>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">{tx.hero.trust1}</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">4,800+</div>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">{tx.hero.trust2}</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">RM 0</div>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">{tx.hero.trust3}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: STATUTORY COMPLIANCE & PLATFORM METRICS STRIP ─── */}
        <section aria-label="Facility Network Metrics" className="py-8 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tx.metrics.map(m => (
                <div
                  key={m.label}
                  className="p-5 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)] flex flex-col justify-between"
                >
                  <div>
                    <div className="font-display font-black text-2xl text-[color:var(--t-700)]">{m.value}</div>
                    <div className="font-bold text-sm text-[color:var(--ink)] mt-1">{m.label}</div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: PLATFORM CAPABILITIES BENTO GRID WITH FILTER ─── */}
        <section className="py-14 sm:py-18 bg-[color:var(--t-50)]/30 border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                  Core Clinical Infrastructure
                </p>
                <h2 className={h2}>{tx.capabilitiesTitle}</h2>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">{tx.capabilitiesSub}</p>
              </div>

              {/* Dynamic Filter Tabs */}
              <div className="inline-flex p-1 bg-white border border-[color:var(--t-200)] shadow-xs self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                    activeTab === 'all'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tx.filter.all}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hospitals')}
                  className={`px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                    activeTab === 'hospitals'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tx.filter.hospitals}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('clinics')}
                  className={`px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                    activeTab === 'clinics'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tx.filter.clinics}
                </button>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredCapabilities.map(c => {
                const IconComponent = c.icon;
                return (
                  <div
                    key={c.id}
                    className="bg-white border border-[color:var(--t-200)] p-5 flex flex-col justify-between hover:border-[color:var(--t-600)] transition-all duration-200 shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-10 h-10 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center text-[color:var(--t-700)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-700">
                          {c.badge}
                        </span>
                      </div>
                      <h3 className="font-display font-extrabold text-base text-slate-900 leading-snug">
                        {c.title[L]}
                      </h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{c.desc[L]}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[color:var(--t-700)]">
                      <span>MOH Act 586 Ready</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: INTERACTIVE LOCUM STAFFING & CAPACITY SIMULATOR ─── */}
        <section className="py-14 sm:py-18 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-8">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                Transparent Operational Economics
              </p>
              <h2 className={h2}>{tx.calculator.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{tx.calculator.subtitle}</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Controls Column */}
              <div className="lg:col-span-7 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] p-6 sm:p-8 space-y-6">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-3">
                    {tx.calculator.facilityType}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {tx.calculator.types.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedFacility(t.id as any)}
                        className={`p-3 text-left border cursor-pointer transition-all ${
                          selectedFacility === t.id
                            ? 'bg-white border-[color:var(--t-600)] shadow-xs ring-1 ring-[color:var(--t-600)]'
                            : 'bg-white/70 border-[color:var(--t-200)] hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs leading-snug">{t.name}</div>
                        <div className="text-xs font-mono text-[color:var(--t-700)] mt-1">
                          ~RM {t.baseRate}/{t.unit}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      {tx.calculator.sliderLabel}
                    </label>
                    <span className="text-base font-mono font-black text-[color:var(--t-700)]">
                      {hoursNeeded} {tx.calculator.weeklyHours}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="5"
                    value={hoursNeeded}
                    onChange={e => setHoursNeeded(Number(e.target.value))}
                    className="w-full accent-[color:var(--t-600)] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-500 mt-1">
                    <span>5 hrs</span>
                    <span>40 hrs (Full-time Shift)</span>
                    <span>80 hrs (Multi-ward Coverage)</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic leading-relaxed pt-2 border-t border-slate-200">
                  {tx.calculator.disclaimer}
                </p>
              </div>

              {/* Real-Time Projected Output Card */}
              <div className="lg:col-span-5 bg-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[color:var(--t-500)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {currentType.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Active Roster
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      {tx.calculator.estMonthlyCost}
                    </div>
                    <div className="font-display font-black text-3xl sm:text-4xl text-white mt-1">
                      RM {monthlyCost.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      ~{(hoursNeeded * 4.33).toFixed(0)} clinical coverage hours per month
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      {tx.calculator.adminSavings}
                    </div>
                    <div className="font-display font-black text-2xl text-emerald-400 mt-1">
                      ~{monthlyAdminSaved} {tx.calculator.hoursPerMonth}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Saved in manual council verification, credentialing calls, and contract billing
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Automatic APC Validation
                    </span>
                    <span className="text-[color:var(--t-500)] font-bold">14-Day Terms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: 4-STEP ONBOARDING JOURNEY ─── */}
        <section className="py-14 sm:py-18 bg-[color:var(--t-50)]/30 border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                Streamlined Facility Verification
              </p>
              <h2 className={h2}>{tx.steps.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{tx.steps.subtitle}</p>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tx.steps.items.map((it, n) => (
                <li
                  key={it.t}
                  className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <span className="font-display font-black text-3xl text-[color:var(--t-700)]" aria-hidden="true">
                      0{n + 1}
                    </span>
                    <h3 className="font-display font-extrabold text-base text-slate-900 mt-2">{it.t}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{it.d}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs font-bold text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Act 586 Mandated
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── SECTION 6: MALAYSIAN STATUTORY COMPLIANCE & LEGAL GUARDRAILS ─── */}
        <section className="py-14 sm:py-18 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-8">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                Legal & Regulatory Framework
              </p>
              <h2 className={h2}>{tx.regulatory.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{tx.regulatory.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {tx.regulatory.items.map(r => (
                <div
                  key={r.title}
                  className="p-6 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white border border-[color:var(--t-200)] flex items-center justify-center shrink-0 text-[color:var(--t-700)] shadow-2xs">
                      <Scale className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-base text-slate-900">{r.title}</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">{r.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SECTION 7: FACILITY ACCREDITATION & INQUIRY FORM ─── */}
        <section id="apply" aria-labelledby="apply-h" className="py-14 sm:py-20 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-10 items-start">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                  Begin Your Facility Registration
                </p>
                <h2 id="apply-h" className={h2}>
                  {tx.apply.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                  {tx.apply.intro}
                </p>

                <div className="mt-6 p-5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" />
                    Who Can Join?
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Private hospitals, ambulatory surgical centres, medical screening centres, hemodialysis clinics, and registered GP clinics licensed under Act 586. Government facilities can post public sector locum shifts without commercial listing.
                  </p>
                </div>
              </div>

              <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-6 sm:p-8 shadow-sm">
                <PartnerEnquiryForm kind="clinic" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
