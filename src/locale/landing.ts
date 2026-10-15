import type { LangCode } from './config';

/**
 * Landing-page hero text in Bahasa Malaysia and Chinese. Drafted for patient-oriented clinical care.
 */
export interface HeroText { pill: string; headline: string; body: string; cta: string; chips: string[] }

export const HERO_TR: Partial<Record<LangCode, Record<string, HeroText>>> = {
  ms: {
    network: {
      pill: 'Konsultasi Perubatan Dalam Talian',
      headline: 'Bantuan perubatan dan rangkaian doktor dalam talian generasi baharu.',
      body: 'MedCred menghubungkan pesakit dengan doktor yang disahkan oleh lembaga perubatan di Malaysia untuk konsultasi sembang dan video, rawatan berlesen, dan preskripsi digital.',
      cta: 'Mulakan Konsultasi',
      chips: ['Konsultasi dalam talian', 'Doktor disahkan lembaga', 'E-preskripsi bertandatangan'],
    },
    prescriptions: {
      pill: 'Farmasi Digital & Preskripsi',
      headline: 'E-preskripsi digital bertandatangan doktor, sedia di farmasi anda.',
      body: 'Dapatkan e-preskripsi digital dengan kod keselamatan QR dan semakan keselamatan alahan automatik. Ambil ubat dengan mudah di mana-mana farmasi komuniti pilihan anda.',
      cta: 'Daftar Akaun Pesakit',
      chips: ['Kod QR bertandatangan doktor', 'Semakan keselamatan alahan', 'Ambilan di farmasi komuniti'],
    },
    members: {
      pill: 'Privasi & Rekod Kesihatan Pesakit',
      headline: 'Penjagaan perubatan dipercayai, dilindungi privasi statutori.',
      body: 'Simpan sejarah kesihatan, bacaan penting dan ringkasan konsultasi dalam satu peti peribadi selamat di bawah PDPA 2010. Anda pilih doktor mana yang boleh melihat rekod anda.',
      cta: 'Sertai sebagai Ahli',
      chips: ['Jaminan bayaran balik 10 minit', 'Pematuhan PDPA 2010', 'Anda kawal data kesihatan'],
    },
  },
  zh: {
    network: {
      pill: '在线医疗问诊',
      headline: '新一代在线医疗协助与认证医生网络。',
      body: 'MedCred 连接马来西亚经委员会核实的医生，为患者提供文字与视频问诊、合规医疗及电子处方服务。',
      cta: '开始在线问诊',
      chips: ['在线问诊', '经委员会核实的医生', '已签名电子处方'],
    },
    prescriptions: {
      pill: '数字药房与电子处方',
      headline: '医生签名的数字处方，随时在您选择的药房取药。',
      body: '获取附带安全二维码验证与自动药物过敏排查的电子处方，在您选定的任何注册社区药房安全取药。',
      cta: '创建患者账户',
      chips: ['医生签名二维码', '过敏安全核查', '任选社区药房取药'],
    },
    members: {
      pill: '患者隐私与健康档案',
      headline: '值得信赖的医疗，受法定隐私法规严格保护。',
      body: '在符合马来西亚 PDPA 2010 的安全空间中保存您的健康档案、体征记录与问诊小结。由您完全掌控谁可以查看您的数据。',
      cta: '以会员身份加入',
      chips: ['10分钟未接诊退款保证', '符合 PDPA 2010 标准', '由您掌控健康数据'],
    },
  },
};
