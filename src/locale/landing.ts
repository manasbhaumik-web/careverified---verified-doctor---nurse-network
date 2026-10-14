import type { LangCode } from './config';

/**
 * Landing-page hero text in Bahasa Malaysia and Chinese. Drafted by the developers: a native speaker must review
 * these before launch (see docs/CONTENT_MALAYSIA.md). Slides without an entry fall back to English.
 */
export interface HeroText { pill: string; headline: string; body: string; cta: string; chips: string[] }

export const HERO_TR: Partial<Record<LangCode, Record<string, HeroText>>> = {
  ms: {
    network: {
      pill: 'Rangkaian Bantuan Perubatan Dalam Talian',
      headline: 'Rangkaian doktor dan bantuan perubatan dalam talian generasi baharu.',
      body: 'MedCred menyediakan bantuan perubatan dalam talian masa nyata, konsultasi doktor 24/7, pengamal yang disahkan oleh lembaga, dan preskripsi digital.',
      cta: 'Daftar Akaun',
      chips: ['Konsultasi dalam talian', 'Doktor disahkan lembaga', 'E-preskripsi bertandatangan'],
    },
    members: {
      pill: 'Untuk Ahli & Keluarga',
      headline: 'Penjagaan yang dipercayai, hanya seorang doktor yang disahkan jauhnya.',
      body: 'Sembang atau panggilan video dengan doktor yang disahkan lembaga, simpan preskripsi dan rekod kesihatan anda di satu tempat, dan pilih siapa yang boleh melihatnya.',
      cta: 'Sertai sebagai Ahli',
      chips: ['Sembang atau video', 'Bayaran balik jika tiada doktor menyertai', 'Anda kawal akses'],
    },
    practitioners: {
      pill: 'Untuk Doktor & Jururawat',
      headline: 'Disahkan sekali, berpraktis dengan yakin.',
      body: 'Hantar lesen anda, dinilai oleh lembaga perubatan kami, kemudian jalankan konsultasi, keluarkan e-preskripsi bertandatangan dan mohon syif locum.',
      cta: 'Sertai sebagai Pengamal',
      chips: ['Semakan lesen secara manual', 'Papan syif locum', 'Konsultasi berbayar'],
    },
    boards: {
      pill: 'Untuk Lembaga & Hospital',
      headline: 'Setiap lesen disemak dan direkodkan.',
      body: 'Semak dokumen, jejaki tarikh tamat dan pembaharuan, urus aduan dan insiden, serta simpan log audit penuh merentas rangkaian.',
      cta: 'Log Masuk Admin Lembaga',
      chips: ['Barisan semakan', 'Penjejakan tamat tempoh', 'Log audit'],
    },
    pharmacies: {
      pill: 'Untuk Farmasi',
      headline: 'Dispens dengan kod yang boleh dipercayai.',
      body: 'Terima preskripsi yang dihantar pesakit kepada anda, kemas kini statusnya, dan simpan rekod, aktiviti dan laporan anda sendiri. Setiap preskripsi ditandatangani doktor.',
      cta: 'Log Masuk Farmasi',
      chips: ['Peti masuk anda sendiri', 'Kemas kini status', 'Laporan aktiviti'],
    },
  },
  zh: {
    network: {
      pill: '在线医疗协助网络',
      headline: '新一代在线医疗协助与医生网络。',
      body: 'MedCred 提供实时在线医疗协助、24/7 医生远程问诊、经委员会核实的医疗人员以及电子处方。',
      cta: '创建账户',
      chips: ['在线问诊', '经委员会核实的医生', '已签名电子处方'],
    },
    members: {
      pill: '面向会员与家庭',
      headline: '值得信赖的医疗，只需一位已核实的医生。',
      body: '通过文字或视频联系经委员会核实的医生，把处方和健康记录集中保存，并自行决定谁可以查看。',
      cta: '以会员身份加入',
      chips: ['文字或视频', '无医生接诊可退款', '由您控制访问'],
    },
    practitioners: {
      pill: '面向医生与护士',
      headline: '一次核实，安心执业。',
      body: '提交您的执业证书，由我们的医学委员会审核，然后即可开展问诊、签发电子处方并申请代班。',
      cta: '以医疗人员身份加入',
      chips: ['人工核查证书', '代班班次公告板', '付费问诊'],
    },
    boards: {
      pill: '面向委员会与医院',
      headline: '每一份证书均已核查并存档。',
      body: '审核文件、跟踪到期与续期、处理投诉和事件，并在整个网络中保留完整的审计日志。',
      cta: '委员会管理员登录',
      chips: ['审核队列', '到期跟踪', '审计日志'],
    },
    pharmacies: {
      pill: '面向药房',
      headline: '凭可信代码配药。',
      body: '接收患者发送给您的处方，更新处方状态，并保存您自己的记录、活动和报告。每一张处方都由医生签名。',
      cta: '药房登录',
      chips: ['专属收件箱', '状态更新', '活动报告'],
    },
  },
};
