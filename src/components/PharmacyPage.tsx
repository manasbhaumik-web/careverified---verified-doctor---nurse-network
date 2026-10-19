import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, CheckCircle2, ChevronRight, Inbox,
  Lock, Pill, QrCode, Scale, ScrollText, ShieldAlert, ShieldCheck,
  Snowflake, Store, Truck, Users
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
    title: 'For Community Pharmacies | MedCred Malaysia',
    description:
      'Connect your licensed Malaysian community pharmacy to MedCred. Verify cryptographic QR e-prescriptions, review clinical allergy checks, log Poisons Act 1952 records, and coordinate cold-chain delivery.',
    headerBadge: 'Community Pharmacy Network',
    hero: {
      tag: 'LFM & Poisons Act 1952 Verified Pharmacy Network',
      titleLead: 'Dispense Doctor-Signed Digital E-Prescriptions With ',
      titleAccent: 'Statutory Confidence & Zero Commission',
      sub: 'Malaysia’s verified digital dispensing network for community and retail pharmacies. Authenticate cryptographic QR prescriptions, review patient allergy & interaction flags, record Poisons Book entries, and coordinate local or cold-chain fulfilment.',
      ctaApply: 'Register Your Pharmacy',
      ctaSignin: 'Pharmacist Sign In',
      trust1: 'LFM & Type A Verified',
      trust2: 'QR & Walk-In Lookup',
      trust3: 'RM 0 Platform Fee',
    },
    metrics: [
      {
        value: 'Act 366',
        label: 'Poisons Act & LFM Verified',
        sub: 'Every listed pharmacy’s Premises Licence, Type A Licence, and Pharmacist Retention Certificate are verified.',
      },
      {
        value: 'QR + Code',
        label: 'Cryptographic E-Rx Check',
        sub: 'Instant prescription validation for both routed inbox orders and walk-in patients—with zero-login public verification.',
      },
      {
        value: 'RM 0',
        label: 'Zero Platform Commission',
        sub: 'MedCred charges RM 0 commission on dispensed medications or delivery fees. 100% of pharmacy revenue stays with you.',
      },
      {
        value: '2FA + PDPA',
        label: 'Protected Dispensing Vault',
        sub: 'Mandatory authenticator 2FA, individual staff logins, and strict PDPA 2010 patient address privacy.',
      },
    ],
    filter: {
      all: 'All Pharmacy Capabilities',
      dispensing: 'Clinical Dispensing & Safety',
      fulfilment: 'Delivery, Panels & Operations',
    },
    capabilitiesEyebrow: 'Digital Dispensary Infrastructure',
    capabilitiesTitle: 'Platform Capabilities for Community Pharmacies',
    capabilitiesSub:
      'Purpose-built clinical verification, statutory record-keeping, and patient fulfilment tools for registered Malaysian pharmacists.',
    capabilitiesFooterLabel: 'LFM & Act 366 Ready',
    calculator: {
      eyebrow: 'Transparent Pharmacy Economics',
      title: 'Digital E-Prescription Volume & Fulfilment Simulator',
      subtitle:
        'Estimate monthly prescription revenue retained at 0% platform commission and front-counter verification time saved when processing verified MedCred e-prescriptions.',
      pharmacyType: 'Pharmacy Format',
      types: [
        { id: 'independent', name: 'Independent Community Pharmacy', avgBasket: 65, unit: 'Rx' },
        { id: 'chain', name: 'Multi-Branch Retail Pharmacy', avgBasket: 85, unit: 'Rx' },
        { id: 'specialist', name: 'Chronic Care & Cold-Chain Dispensary', avgBasket: 145, unit: 'Rx' },
      ],
      sliderLabel: 'Daily Digital & Walk-In E-Prescriptions Processed',
      dailyRxUnit: 'Rx / day',
      estMonthlyValue: 'Estimated Monthly Gross E-Rx Value (100% Retained)',
      estMonthlySub: 'dispensed e-prescriptions per month · RM 0 MedCred fee',
      timeSavedLabel: 'Estimated Pharmacist Verification Time Saved',
      hoursPerMonth: 'hrs / month',
      timeSavedSub:
        'Saved in manual prescriber APC checks, handwriting clarification calls, and Poisons Book cross-referencing',
      badgeActive: '0% Commission Tier',
      footerLeft: 'Direct Patient & Panel Settlement',
      footerRight: '100% Revenue Retained',
      disclaimer:
        'Illustrative estimates based on average Malaysian outpatient prescription basket values. Medication and delivery payments are settled directly between the patient or panel and your pharmacy.',
    },
    steps: {
      eyebrow: 'Streamlined Pharmacy Accreditation',
      title: 'Pharmacy Onboarding Journey',
      subtitle:
        'A rigorous 4-step credentialing workflow under the Registration of Pharmacists Act 1951 (Act 371) and Poisons Act 1952 (Act 366).',
      mandateBadge: 'LFM & Act 366 Mandated',
      items: [
        {
          t: 'Submit Pharmacy & Superintendent Details',
          d: 'Complete the partner form below with your pharmacy name, SSM registration, and superintendent pharmacist contact—no document uploads required at initial inquiry.',
        },
        {
          t: 'Premises & Pharmacist Licence Audit',
          d: 'Our board verifies and records your Premises Licence, Type A Poisons Licence, Pharmacist Registration Number (LFM), and Annual Retention Certificate (ARC) expiry dates.',
        },
        {
          t: 'Configure Workspace, 2FA & Staff Logins',
          d: 'Enable authenticator 2FA, add individual pharmacist and dispensary assistant logins for full audit traceability, and configure cold-chain, courier, and insurance panel options.',
        },
        {
          t: 'Go Live in the Patient Directory',
          d: 'Appear in the verified pharmacy directory. Receive real-time e-prescriptions with sound/desktop alerts, authenticate walk-in QR codes, and update preparation status live.',
        },
      ],
    },
    regulatory: {
      eyebrow: 'Legal, Statutory & Operational Governance',
      title: 'Malaysian Pharmacy Statutory Compliance & Platform Scope',
      subtitle:
        'MedCred is engineered around Malaysian pharmacy legislation and clear operational boundaries so your superintendent pharmacist stays in full regulatory control.',
      items: [
        {
          title: 'Poisons Act 1952 (Act 366) & Dispensing Records',
          desc: 'Every dispense logs the dispensing pharmacist and optional or compulsory Poisons / Prescription Book entry number. While doctors prescribe from a structured clinical catalogue, final Poisons Act (Group B / Group C) classification and clinical appropriateness remain the statutory duty of the registered pharmacist. Group A dangerous drugs are never e-prescribed.',
        },
        {
          title: 'Registration of Pharmacists Act 1951 (Act 371) & Automatic Expiry Guardrails',
          desc: 'We track both your Premises Licence and your Pharmacist Annual Retention Certificate (ARC) expiry dates, sending automated reminders 30 days prior. If either expires, the workspace is automatically locked and hidden from the patient directory until renewed.',
        },
        {
          title: 'Personal Data Protection Act 2010 (PDPA) & Mandatory 2FA Security',
          desc: 'Production pharmacy accounts require TOTP authenticator two-factor sign-in. Patient allergy/interaction profiles are visible only when consented, and residential addresses/phone numbers are disclosed strictly for active Malaysia-only deliveries.',
        },
        {
          title: 'Direct Commercial Settlement & Transparent Integration Scope',
          desc: 'MedCred charges pharmacies RM 0. Medication charges, co-payments, and delivery fees are collected directly by your pharmacy. Insurance Guarantee Letter (GL) approvals/declines and courier booking references (own rider, GrabExpress, Lalamove) are logged manually in your workspace rather than via live third-party APIs.',
        },
      ],
    },
    apply: {
      eyebrow: 'Begin Your Pharmacy Accreditation',
      title: 'Accredit Your Pharmacy With MedCred',
      intro:
        'Join Malaysia’s verified digital dispensing network. Submit your pharmacy details below and our board will contact you to complete your LFM and Premises Licence verification.',
      whoTitle: 'Who Can Join & How Accounts Are Created',
      whoDesc:
        'Open to licensed Malaysian community pharmacies, retail pharmacy chains, and ambulatory dispensaries holding a valid Premises Licence and registered LFM pharmacist with an active Annual Retention Certificate. Pharmacy accounts are provisioned directly by the MedCred board after licence verification.',
    },
  },
  ms: {
    title: 'Untuk Farmasi Komuniti | MedCred Malaysia',
    description:
      'Hubungkan farmasi komuniti berlesen anda dengan MedCred. Sahkan e-preskripsi QR kriptografi, semak amaran alahan klinikal, rekod Buku Racun Akta 1952, dan uruskan penghantaran rantaian sejuk.',
    headerBadge: 'Rangkaian Farmasi Komuniti',
    hero: {
      tag: 'Rangkaian Farmasi Disahkan LFM & Akta Racun 1952',
      titleLead: 'Dispens E-Preskripsi Digital Bertandatangan Doktor Dengan ',
      titleAccent: 'Keyakinan Statutori & Sifar Komisen',
      sub: 'Rangkaian pendispensan digital disahkan di Malaysia untuk farmasi komuniti dan runcit. Sahkan preskripsi QR kriptografi, semak amaran alahan & interaksi ubat pesakit, rekod entri Buku Racun, serta selaraskan penghantaran tempatan atau rantaian sejuk.',
      ctaApply: 'Daftarkan Farmasi Anda',
      ctaSignin: 'Log Masuk Ahli Farmasi',
      trust1: 'Disahkan LFM & Lesen A',
      trust2: 'Semakan QR & Walk-In',
      trust3: 'RM 0 Yuran Platform',
    },
    metrics: [
      {
        value: 'Akta 366',
        label: 'Disahkan Akta Racun & LFM',
        sub: 'Lesen Premis, Lesen Racun Jenis A, dan Sijil Pengekalan Tahunan (ARC) ahli farmasi disemak dan direkodkan.',
      },
      {
        value: 'QR + Kod',
        label: 'Pengesahan E-Rx Kriptografi',
        sub: 'Semakan preskripsi segera untuk pesanan peti masuk atau pesakit walk-in—termasuk semakan awam tanpa log masuk.',
      },
      {
        value: 'RM 0',
        label: 'Sifar Komisen Platform',
        sub: 'MedCred tidak mengenakan sebarang komisen ke atas ubat atau yuran penghantaran. 100% hasil kekal milik farmasi anda.',
      },
      {
        value: '2FA + PDPA',
        label: 'Ruang Kerja Pendispensan Terkawal',
        sub: 'Log masuk dua faktor (2FA) wajib, akaun kakitangan berasingan, dan perlindungan alamat pesakit di bawah PDPA 2010.',
      },
    ],
    filter: {
      all: 'Semua Keupayaan Farmasi',
      dispensing: 'Pendispensan Klinikal & Keselamatan',
      fulfilment: 'Penghantaran, Panel & Operasi',
    },
    capabilitiesEyebrow: 'Infrastruktur Dispensari Digital',
    capabilitiesTitle: 'Keupayaan Platform untuk Farmasi Komuniti',
    capabilitiesSub:
      'Alat pengesahan klinikal, perekodan statutori, dan pemenuhan preskripsi pesakit yang dibina khas untuk ahli farmasi berdaftar di Malaysia.',
    capabilitiesFooterLabel: 'Sedia LFM & Akta 366',
    calculator: {
      eyebrow: 'Ekonomi Operasi Farmasi Telus',
      title: 'Simulator Volum E-Preskripsi & Kecekapan Dispensari',
      subtitle:
        'Anggarkan nilai preskripsi bulanan yang dikekalkan pada 0% komisen platform serta masa pengesahan kaunter yang dijimatkan melalui e-preskripsi MedCred.',
      pharmacyType: 'Kategori Farmasi',
      types: [
        { id: 'independent', name: 'Farmasi Komuniti Bebas', avgBasket: 65, unit: 'Rx' },
        { id: 'chain', name: 'Farmasi Runcit Pelbagai Cawangan', avgBasket: 85, unit: 'Rx' },
        { id: 'specialist', name: 'Dispensari Penjagaan Kronik & Rantaian Sejuk', avgBasket: 145, unit: 'Rx' },
      ],
      sliderLabel: 'Purata E-Preskripsi Digital & Walk-In Sehari',
      dailyRxUnit: 'Rx / hari',
      estMonthlyValue: 'Anggaran Nilai Kasar E-Rx Bulanan (100% Milik Farmasi)',
      estMonthlySub: 'e-preskripsi didispens sebulan · RM 0 yuran MedCred',
      timeSavedLabel: 'Anggaran Masa Pengesahan Ahli Farmasi Dijimatkan',
      hoursPerMonth: 'jam / bulan',
      timeSavedSub:
        'Dijimatkan daripada semakan manual APC doktor, panggilan pengesahan tulisan tangan, dan rujukan Buku Racun',
      badgeActive: '0% Komisen Platform',
      footerLeft: 'Bayaran Terus Pesakit & Panel',
      footerRight: '100% Hasil Dikekalkan',
      disclaimer:
        'Anggaran ilustrasi berdasarkan purata nilai bakul preskripsi pesakit luar di Malaysia. Bayaran ubat dan penghantaran dijelaskan terus antara pesakit atau panel dengan farmasi anda.',
    },
    steps: {
      eyebrow: 'Pengakreditasian Farmasi Teratur',
      title: 'Langkah Penyertaan Farmasi',
      subtitle:
        'Aliran kerja pengesahan 4 langkah mengikut Akta Pendaftaran Ahli Farmasi 1951 (Akta 371) dan Akta Racun 1952 (Akta 366).',
      mandateBadge: 'Mandat LFM & Akta 366',
      items: [
        {
          t: 'Hantar Maklumat Farmasi',
          d: 'Isi borang permohonan di bawah dengan nama farmasi, pendaftaran SSM, dan maklumat ahli farmasi penguasa—tiada muat naik dokumen diperlukan pada peringkat awal.',
        },
        {
          t: 'Audit Lesen Premis & Ahli Farmasi',
          d: 'Lembaga kami menyemak dan merekodkan Lesen Premis, Lesen Racun Jenis A, Nombor Pendaftaran LFM, dan tarikh tamat Sijil Pengekalan Tahunan (ARC).',
        },
        {
          t: 'Konfigurasi Ruang Kerja, 2FA & Kakitangan',
          d: 'Aktifkan 2FA pengesah, tambah log masuk kakitangan berasingan untuk jejak audit penuh, serta tetapkan rantaian sejuk, kurier, dan panel insurans.',
        },
        {
          t: 'Mula Beroperasi dalam Direktori Pesakit',
          d: 'Muncul dalam direktori farmasi disahkan. Terima e-preskripsi masa nyata dengan amaran bunyi/desktop, sahkan kod QR walk-in, dan kemas kini status penyediaan.',
        },
      ],
    },
    regulatory: {
      eyebrow: 'Tadbir Urus Undang-Undang & Skop Operasi',
      title: 'Pematuhan Statutori Farmasi Malaysia & Skop Platform',
      subtitle:
        'MedCred dibina berlandaskan perundangan farmasi Malaysia dan sempadan operasi yang jelas supaya ahli farmasi anda kekal mempunyai kawalan penuh.',
      items: [
        {
          title: 'Akta Racun 1952 (Akta 366) & Rekod Pendispensan',
          desc: 'Setiap pendispensan merekodkan nama ahli farmasi dan nombor entri Buku Racun / Preskripsi (pilihan atau wajib). Walaupun doktor memilih daripada katalog klinikal berstruktur, pengesahan kumpulan Akta Racun (Kumpulan B / C) dan kesesuaian klinikal kekal menjadi tanggungjawab statutori ahli farmasi. Ubat berbahaya Kumpulan A tidak dibenarkan dalam e-preskripsi.',
        },
        {
          title: 'Akta Pendaftaran Ahli Farmasi 1951 (Akta 371) & Sekatan Tamat Tempoh',
          desc: 'Kami memantau tarikh tamat Lesen Premis dan Sijil Pengekalan Tahunan (ARC) ahli farmasi dengan peringatan automatik 30 hari lebih awal. Jika mana-mana tamat tempoh, ruang kerja disekat dan disembunyikan daripada direktori pesakit secara automatik.',
        },
        {
          title: 'Akta Perlindungan Data Peribadi 2010 (PDPA) & Keselamatan 2FA',
          desc: 'Akaun farmasi memerlukan log masuk dua faktor (2FA) dalam persekitaran produksi. Maklumat alahan pesakit hanya dipaparkan dengan kebenaran pesakit, dan alamat serta nombor telefon hanya dikongsi untuk penghantaran di dalam Malaysia sahaja.',
        },
        {
          title: 'Penyelesaian Bayaran Terus & Ketelusan Skop Integrasi',
          desc: 'MedCred tidak mengenakan bayaran kepada farmasi. Bayaran ubat, bayaran bersama (co-pay), dan caj penghantaran dikutip terus oleh farmasi anda. Keputusan Surat Jaminan (GL) insurans dan rujukan tempahan kurier (penunggang sendiri, GrabExpress, Lalamove) direkod secara manual dalam ruang kerja tanpa sambungan API pihak ketiga secara langsung.',
        },
      ],
    },
    apply: {
      eyebrow: 'Mulakan Pengakreditasian Farmasi Anda',
      title: 'Sertai Rangkaian Farmasi Disahkan MedCred',
      intro:
        'Sertai rangkaian pendispensan digital yang disahkan di Malaysia. Hantar butiran farmasi anda di bawah dan ahli lembaga kami akan menghubungi anda untuk pengesahan lesen.',
      whoTitle: 'Siapa Boleh Menyertai & Cara Akaun Dicipta',
      whoDesc:
        'Terbuka kepada farmasi komuniti berlesen di Malaysia, rangkaian farmasi runcit, dan dispensari pesakit luar yang mempunyai Lesen Premis sah serta ahli farmasi berdaftar LFM dengan Sijil Pengekalan Tahunan (ARC) aktif. Akaun farmasi dicipta oleh lembaga MedCred selepas pengesahan lesen.',
    },
  },
  zh: {
    title: '面向社区药房 | MedCred 马来西亚',
    description:
      '将您的马来西亚持牌社区药房接入 MedCred。核验防伪二维码电子处方、查阅患者药物过敏安全排查、登记《1952年毒药法令》配药记录并管理冷链送药上门。',
    headerBadge: '认证社区药房网络',
    hero: {
      tag: '马来西亚药剂师委员会 (LFM) 与《1952年毒药法令》认证网络',
      titleLead: '安全核验并调配医生签名电子处方：',
      titleAccent: '全面符合法定规范 · 零平台佣金',
      sub: '专为马来西亚社区与零售药房打造的数字化处方调配网络。一键核验加密二维码电子处方、查看患者过敏与药物相互作用警示、登记毒药处方簿编号，并灵活安排同城骑手或恒温冷链配送。',
      ctaApply: '申请认证药房入驻',
      ctaSignin: '药剂师登录',
      trust1: 'LFM 与 A 类执照核验',
      trust2: '二维码与到店核查',
      trust3: 'RM 0 平台佣金',
    },
    metrics: [
      {
        value: 'Act 366',
        label: '毒药法令与 LFM 权威核验',
        sub: '严格核验并记录每家药房的营业场所执照、A 类毒药执照及药剂师年度续证证书 (ARC) 有效期。',
      },
      {
        value: 'QR + 代码',
        label: '加密防伪处方即时核验',
        sub: '支持患者线上推送处方与到店取药代码双重核验，并提供无需登录的公开防伪查询通道。',
      },
      {
        value: 'RM 0',
        label: '零平台抽成与入驻费',
        sub: 'MedCred 目前不对药房收取入驻费或药品、配送抽成，100% 处方调配与配送收入归药房所有。',
      },
      {
        value: '2FA + PDPA',
        label: '高安全级配药工作台',
        sub: '强制启用身份验证器双重登录 (2FA)、独立店员操作追溯日志及符合 PDPA 2010 的配送隐私保护。',
      },
    ],
    filter: {
      all: '全部药房核心功能',
      dispensing: '临床审方与合规配药',
      fulfilment: '冷链配送、保险与店务',
    },
    capabilitiesEyebrow: '数字化药房核心基础设施',
    capabilitiesTitle: '面向社区药房的全流程工作台功能',
    capabilitiesSub:
      '专为马来西亚注册药剂师打造的电子审方、法定毒药登记、保险担保函记录与同城履约工具集。',
    capabilitiesFooterLabel: '符合 LFM 与第 366 法令',
    calculator: {
      eyebrow: '透明的药房运营经济模型',
      title: '电子处方接单量与审方效率模拟器',
      subtitle:
        '即刻测算在 0% 平台佣金政策下药房100%留存的月度处方营收，以及数字化审方为柜台药剂师节省的核查工时。',
      pharmacyType: '药房业态类型',
      types: [
        { id: 'independent', name: '独立社区药房', avgBasket: 65, unit: '张处方' },
        { id: 'chain', name: '连锁零售药房门店', avgBasket: 85, unit: '张处方' },
        { id: 'specialist', name: '慢病管理与冷链特药药房', avgBasket: 145, unit: '张处方' },
      ],
      sliderLabel: '每日处理的线上推送及到店电子处方数量',
      dailyRxUnit: '张 / 天',
      estMonthlyValue: '预估月度电子处方总金额（药房 100% 留存）',
      estMonthlySub: '张月度调配处方 · RM 0 MedCred 平台抽成',
      timeSavedLabel: '预估每月节省的药剂师人工核查工时',
      hoursPerMonth: '小时 / 月',
      timeSavedSub: '大幅减少电话核实医生 APC 资质、辨认手写处方字迹及手工比对登记簿的时间',
      badgeActive: '0% 佣金费率',
      footerLeft: '患者与保险直付药房',
      footerRight: '100% 营收留存',
      disclaimer:
        '以上测算基于马来西亚门诊处方平均客单价仅供说明。药品费用、共付额与配送费均由患者或保险机构直接向药房结算。',
    },
    steps: {
      eyebrow: '规范高效的资质认证流程',
      title: '药房认证入驻 4 步流程',
      subtitle:
        '严格遵循《1951年药剂师注册法令》（第 371 号法令）与《1952年毒药法令》（第 366 号法令）的审核标准。',
      mandateBadge: 'LFM 与第 366 法令规范',
      items: [
        {
          t: '提交药房基本资料申请',
          d: '填写下方简短申请表，提供药房名称、SSM 注册号及主管药剂师联系方式（初步申请无需上传文件）。',
        },
        {
          t: '营业场所与药剂师执照核验',
          d: '委员会核查并记录您的营业场所执照、A 类毒药执照、药剂师注册号 (LFM) 及年度续证证书 (ARC) 到期日与核验方式。',
        },
        {
          t: '开通安全工作台、2FA 与店员账号',
          d: '绑定双重验证器 (2FA)，由负责人为店内药剂师与助理创建独立子账号以实现操作溯源，并配置冷链、配送与合作保险名单。',
        },
        {
          t: '正式上线患者药房名录',
          d: '展示于患者端认证药房名录。实时接收带声音/桌面提醒的电子处方，核验到店二维码，并向患者同步配药与配送进度。',
        },
      ],
    },
    regulatory: {
      eyebrow: '法定合规准则与平台职责边界',
      title: '马来西亚药房法定合规与平台服务范围说明',
      subtitle:
        'MedCred 严格遵循马来西亚药事法规并明确界定平台功能边界，确保您的注册药剂师始终掌握完整的临床与合规主导权。',
      items: [
        {
          title: '《1952年毒药法令》（第 366 号法令）与配药登记簿',
          desc: '每次配药均记录配药药剂师姓名及毒药/处方登记簿编号（可设为必填）。药品目录暂未内置毒药法令分组，因此最终的 B 组/C 组毒药分类核实与临床审方仍由执业药剂师依法确认；平台严禁开具 A 组危险管制药物。',
        },
        {
          title: '《1951年药剂师注册法令》与执照到期自动熔断机制',
          desc: '系统持续追踪您的营业场所执照与药剂师年度续证证书 (ARC) 有效期，并提前 30 天发送提醒。一旦任一证书过期，药房工作台将自动锁定并从患者名录中隐藏，直至完成续期。',
        },
        {
          title: '《2010年个人数据保护法令》(PDPA) 与双重认证安全',
          desc: '正式环境下药房账户必须启用身份验证器双重登录 (2FA)。患者过敏与用药史仅在患者授权时展示；患者收货地址与电话仅在马来西亚境内配送订单中向药房及配送方提供。',
        },
        {
          title: '直接财务结算与第三方系统对接说明',
          desc: '平台目前不向药房收费，药费与配送费由患者直接支付给药房。保险担保函 (GL) 审批结果记录（批准编号或拒付原因）及骑手/Grab/Lalamove 运单号均在工作台内手动登记，暂不包含与保险理赔系统、共付额收银或快递平台的实时 API 对接。',
        },
      ],
    },
    apply: {
      eyebrow: '开启药房认证入驻',
      title: '申请将您的药房加入 MedCred 认证网络',
      intro:
        '加入马来西亚值得信赖的数字处方调配网络。请在下方填写您的药房资料，委员会成员将与您联系以完成执照核验与账户创建。',
      whoTitle: '准入条件与账户开通方式',
      whoDesc:
        '面向持有有效营业场所执照、A 类毒药执照及具备有效年度续证证书 (ARC) 的马来西亚注册社区药房与连锁药房开放。药房账户不设公开自助注册，均在申请核验通过后由 MedCred 委员会为您创建。',
    },
  },
};

const CAPABILITIES = [
  {
    id: 'rx-inbox',
    category: 'dispensing',
    title: {
      en: 'Live E-Prescription Inbox & Status Workflow',
      ms: 'Peti Masuk E-Preskripsi & Aliran Status Masa Nyata',
      zh: '实时电子处方收件箱与配药状态流',
    },
    desc: {
      en: 'Prescriptions routed by patients arrive instantly with optional sound and desktop alerts. Update status from Received to Preparing, Ready for Pickup, Dispensed, or Cannot Fill.',
      ms: 'Preskripsi yang dihantar pesakit tiba serta-merta dengan amaran bunyi dan desktop. Kemas kini status daripada Diterima kepada Disediakan, Sedia Diambil, Didispens, atau Tidak Dapat Dipenuhi.',
      zh: '患者选定发送的处方实时进入收件箱并触发声音或桌面提醒。一键更新“已接收、配药中、待取药、已发药或无法调配”状态并同步患者。',
    },
    badge: 'Real-Time Queue',
    icon: Inbox,
  },
  {
    id: 'qr-verification',
    category: 'dispensing',
    title: {
      en: 'Cryptographic QR & Walk-In Code Lookup',
      ms: 'Pengesahan Kod QR & Carian Kod Walk-In',
      zh: '防伪二维码扫描与到店处方码核查',
    },
    desc: {
      en: 'Every MedCred prescription carries a unique alphanumeric code and QR. Verify walk-in patients instantly in your workspace or via the zero-login public check page, including live prescriber APC status.',
      ms: 'Setiap preskripsi mempunyai kod unik dan QR. Sahkan preskripsi pesakit walk-in di ruang kerja anda atau halaman semakan awam tanpa log masuk, termasuk status pengesahan doktor.',
      zh: '每张电子处方均具备唯一防伪码与二维码。支持到店患者输入代码秒级验真并核查开方医生的实时执业认证状态，亦提供免登录公开核查页。',
    },
    badge: 'Anti-Forgery QR',
    icon: QrCode,
  },
  {
    id: 'clinical-safety',
    category: 'dispensing',
    title: {
      en: 'Shared Allergy, Medication & Interaction Screening',
      ms: 'Semakan Alahan, Ubat Semasa & Amaran Interaksi',
      zh: '患者过敏史、在用药物与相互作用核查',
    },
    desc: {
      en: 'When consented by the patient, view their recorded allergies, active medications, and clinical interaction warnings acknowledged by the prescribing doctor before you dispense.',
      ms: 'Apabila dikongsi oleh pesakit, lihat rekod alahan, ubat semasa, dan amaran interaksi klinikal yang telah disemak oleh doktor sebelum anda mendispens.',
      zh: '在患者授权共享下，配药前可直观查阅患者过敏史、严重程度、当前用药清单以及开方医生已确认的临床相互作用警示。',
    },
    badge: 'Clinical Safety',
    icon: ShieldAlert,
  },
  {
    id: 'poisons-book',
    category: 'dispensing',
    title: {
      en: 'Statutory Dispensing & Poisons Book Logging',
      ms: 'Rekod Pendispensan & Buku Racun Akta 366',
      zh: '法定配药药剂师与毒药登记簿编号记录',
    },
    desc: {
      en: 'Record the dispensing pharmacist’s name and Poisons / Prescription Book entry number on every fulfilment. Owners can enforce compulsory Poisons Book entry numbers across all staff.',
      ms: 'Rekod nama ahli farmasi yang mendispens serta nombor entri Buku Racun atau Preskripsi. Pemilik boleh mewajibkan nombor entri Buku Racun untuk semua kakitangan.',
      zh: '每次发药均完整记录配药药剂师姓名及毒药/处方登记簿条目编号。药房负责人可将毒药簿登记编号设为全店强制必填项。',
    },
    badge: 'Poisons Act 1952',
    icon: ScrollText,
  },
  {
    id: 'home-delivery',
    category: 'fulfilment',
    title: {
      en: 'Flexible Local Courier & Rider Fulfilment',
      ms: 'Penghantaran Ke Rumah & Rujukan Kurier',
      zh: '同城送药上门与多渠道骑手运单管理',
    },
    desc: {
      en: 'Offer Malaysia-wide or local delivery using your own pharmacy rider, GrabExpress, Lalamove, or courier partner. Book with your preferred service and log the tracking reference for the patient.',
      ms: 'Tawarkan penghantaran dengan penunggang sendiri, GrabExpress, Lalamove, atau kurier pilihan anda. Rekod nombor rujukan penghantaran supaya pesakit dapat memantau status.',
      zh: '支持使用药房自有骑手、Grab、Lalamove 或其他快递提供马来西亚境内送药上门。自主预订运力后在系统内登记运单参考号即可同步患者。',
    },
    badge: 'Local Fulfilment',
    icon: Truck,
  },
  {
    id: 'cold-chain',
    category: 'fulfilment',
    title: {
      en: 'Cold-Chain Biologicals & Insulin Routing',
      ms: 'Pengendalian Ubat Rantaian Sejuk & Insulin',
      zh: '胰岛素与生物制剂恒温冷链专属派单',
    },
    desc: {
      en: 'Declare whether your pharmacy supports validated cold-chain packaging for temperature-sensitive items like insulin and vaccines. Cold-chain deliveries are routed exclusively to capable pharmacies.',
      ms: 'Nyatakan sama ada farmasi anda menyokong penghantaran ubat rantaian sejuk seperti insulin dan vaksin. Hanya farmasi yang layak akan ditawarkan penghantaran tersebut.',
      zh: '开启冷链配送资质标识后，含胰岛素、疫苗等温控药品的配送需求将仅定向派发给具备冷链履约能力的认证药房。',
    },
    badge: '2°C–8°C Cold Chain',
    icon: Snowflake,
  },
  {
    id: 'insurance-panels',
    category: 'fulfilment',
    title: {
      en: 'Panel Insurers & Guarantee Letter (GL) Tracking',
      ms: 'Panel Insurans & Rekod Surat Jaminan (GL)',
      zh: '合作保险机构名单与担保函 (GL) 审批记录',
    },
    desc: {
      en: 'Publish theTPA and insurance panels your pharmacy accepts. Record Guarantee Letter approvals (with GL reference number) or declines (with reason) so the patient is notified immediately.',
      ms: 'Senaraikan panel insurans yang anda terima. Rekod keputusan Surat Jaminan (diluluskan dengan nombor rujukan atau ditolak dengan sebab) dan maklumkan kepada pesakit.',
      zh: '展示药房支持的保险公司与 TPA 名单。在工作台内登记每份担保函 (GL) 的批准单号或拒付原因，系统将自动通知患者。',
    },
    badge: 'Panel & GL Workflow',
    icon: ShieldCheck,
  },
  {
    id: 'team-analytics',
    category: 'fulfilment',
    title: {
      en: 'Multi-Staff Accounts, SLA Reports & Audit Trail',
      ms: 'Akaun Pasukan, Laporan SLA & Log Aktiviti',
      zh: '多店员独立账号、SLA 报表与操作审计日志',
    },
    desc: {
      en: 'Provision separate logins for each pharmacist and assistant so every action is traceable. Track 30-day fill rates, median response times, dispense turnaround, and top prescribed medicines.',
      ms: 'Tambah kakitangan dengan log masuk berasingan supaya setiap tindakan dapat dikesan. Pantau kadar pemenuhan, masa tindak balas median, dan ubat paling kerap didispens.',
      zh: '负责人可为每位药剂师与店员分配独立登录账号，确保每步操作责任到人；内置接单响应时长、发药率与高频药品统计报表。',
    },
    badge: 'SLA & Team Audit',
    icon: BarChart3,
  },
];

export default function PharmacyPage() {
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = T[L];

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

  const [activeTab, setActiveTab] = useState<'all' | 'dispensing' | 'fulfilment'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'independent' | 'chain' | 'specialist'>('independent');
  const [dailyRx, setDailyRx] = useState<number>(25);

  const currentType = tx.calculator.types.find(t => t.id === selectedFormat) || tx.calculator.types[0];
  const monthlyRxCount = dailyRx * 30;
  const monthlyGrossValue = monthlyRxCount * currentType.avgBasket;
  // ~4 minutes saved per digital e-Rx vs manual phone/handwriting/APC verification
  const monthlyHoursSaved = Math.round((monthlyRxCount * 4) / 60);

  const filteredCapabilities = CAPABILITIES.filter(c => {
    if (activeTab === 'all') return true;
    return c.category === activeTab;
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

  const signIn = () => navigate(loginUrl('pharmacy', false));

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
              <span className="hidden sm:inline-block ml-2 text-xs font-mono font-extrabold uppercase px-1.5 py-0.5 bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-300)]">
                {tx.headerBadge}
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={signIn}
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
        {/* ─── SECTION 1: HERO SECTION WITH AI PHARMACY IMAGE AT 70% OPACITY ─── */}
        <section
          className="relative border-b border-[color:var(--t-200)] overflow-hidden h-[660px] sm:h-[640px] lg:h-[620px] flex items-center bg-transparent"
          aria-label="Community Pharmacies Hero"
        >
          <div
            className="absolute inset-0 pointer-events-none bg-cover bg-no-repeat opacity-[0.7]"
            style={{
              backgroundImage: "url('/assets/pharmacies_hero_bg.jpg')",
              backgroundPosition: 'right 20% center',
              opacity: 0.7,
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
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
                  <button type="button" onClick={signIn} className={btnSecondary}>
                    {tx.hero.ctaSignin}
                  </button>
                </div>

                {/* Proof Metric Chips */}
                <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">Act 366</div>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">{tx.hero.trust1}</div>
                  </div>
                  <div className="bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] p-2 sm:p-2.5 text-center shadow-xs">
                    <div className="font-display font-black text-sm sm:text-base text-[color:var(--t-700)]">QR E-Rx</div>
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

        {/* ─── SECTION 2: 4-STAT AUTHORITY BAR ─── */}
        <section aria-label="Pharmacy Network Metrics" className="py-8 bg-white border-b border-[color:var(--t-200)]">
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
                  {tx.capabilitiesEyebrow}
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
                  onClick={() => setActiveTab('dispensing')}
                  className={`px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                    activeTab === 'dispensing'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tx.filter.dispensing}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fulfilment')}
                  className={`px-3 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                    activeTab === 'fulfilment'
                      ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tx.filter.fulfilment}
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
                      <span>{tx.capabilitiesFooterLabel}</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── SECTION 4: INTERACTIVE PRESCRIPTION VOLUME & DISPENSING SIMULATOR ─── */}
        <section className="py-14 sm:py-18 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-8">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                {tx.calculator.eyebrow}
              </p>
              <h2 className={h2}>{tx.calculator.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{tx.calculator.subtitle}</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Controls Column */}
              <div className="lg:col-span-7 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] p-6 sm:p-8 space-y-6">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-3">
                    {tx.calculator.pharmacyType}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {tx.calculator.types.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedFormat(t.id as any)}
                        className={`p-3 text-left border cursor-pointer transition-all ${
                          selectedFormat === t.id
                            ? 'bg-white border-[color:var(--t-600)] shadow-xs ring-1 ring-[color:var(--t-600)]'
                            : 'bg-white/70 border-[color:var(--t-200)] hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs leading-snug">{t.name}</div>
                        <div className="text-xs font-mono text-[color:var(--t-700)] mt-1">
                          ~RM {t.avgBasket} / {t.unit}
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
                      {dailyRx} {tx.calculator.dailyRxUnit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={dailyRx}
                    onChange={e => setDailyRx(Number(e.target.value))}
                    className="w-full accent-[color:var(--t-600)] cursor-pointer"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-500 mt-1">
                    <span>5 Rx/day</span>
                    <span>35 Rx/day (Busy Community Branch)</span>
                    <span>100 Rx/day (High-Volume Hub)</span>
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
                    <Store className="h-4 w-4 text-[color:var(--t-500)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {currentType.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {tx.calculator.badgeActive}
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      {tx.calculator.estMonthlyValue}
                    </div>
                    <div className="font-display font-black text-3xl sm:text-4xl text-white mt-1">
                      RM {monthlyGrossValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      ~{monthlyRxCount.toLocaleString()} {tx.calculator.estMonthlySub}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      {tx.calculator.timeSavedLabel}
                    </div>
                    <div className="font-display font-black text-2xl text-emerald-400 mt-1">
                      ~{monthlyHoursSaved} {tx.calculator.hoursPerMonth}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {tx.calculator.timeSavedSub}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      {tx.calculator.footerLeft}
                    </span>
                    <span className="text-[color:var(--t-500)] font-bold">{tx.calculator.footerRight}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: 4-STEP PHARMACY ONBOARDING JOURNEY ─── */}
        <section className="py-14 sm:py-18 bg-[color:var(--t-50)]/30 border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                {tx.steps.eyebrow}
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
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {tx.steps.mandateBadge}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── SECTION 6: MALAYSIAN STATUTORY COMPLIANCE & PLATFORM GOVERNANCE ─── */}
        <section className="py-14 sm:py-18 bg-white border-b border-[color:var(--t-200)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-8">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                {tx.regulatory.eyebrow}
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

        {/* ─── SECTION 7: PHARMACY ACCREDITATION & INQUIRY FORM ─── */}
        <section id="apply" aria-labelledby="apply-h" className="py-14 sm:py-20 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-10 items-start">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-[color:var(--t-700)] mb-1">
                  {tx.apply.eyebrow}
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
                    {tx.apply.whoTitle}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {tx.apply.whoDesc}
                  </p>
                </div>
              </div>

              <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-6 sm:p-8 shadow-sm">
                <PartnerEnquiryForm kind="pharmacy" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
