import type { LangCode } from './config';

/**
 * Landing-page hero text in Bahasa Malaysia, Chinese, Bahasa Indonesia, and Arabic.
 * Drafted with a humble, compassionate, and patient-first caring tone.
 */
export interface HeroText { pill: string; headline: string; body: string; cta: string; chips: string[] }

export const HERO_TR: Partial<Record<LangCode, Record<string, HeroText>>> = {
  ms: {
    network: {
      pill: 'Penjagaan Doktor Prihatin & Bertauliah',
      headline: 'Penjagaan perubatan ikhlas & rangkaian doktor mesra, sentiasa di sisi anda.',
      body: 'Apabila anda atau keluarga kurang sihat, MedCred sedia menghubungkan anda dengan doktor prihatin yang disahkan lembaga di seluruh Malaysia untuk konsultasi tenang, nasihat berhemah, dan preskripsi digital.',
      cta: 'Bercakap Dengan Doktor',
      chips: ['Konsultasi mesra pesakit', 'Doktor bertauliah MMC', 'E-preskripsi selamat'],
    },
    prescriptions: {
      pill: 'Farmasi Prihatin & E-Preskripsi',
      headline: 'Preskripsi digital yang disemak teliti, sedia di farmasi kejiranan anda.',
      body: 'Kesejahteraan anda keutamaan kami. Terima preskripsi digital bertandatangan doktor dengan semakan keselamatan alahan automatik, sedia diambil atau dihantar dengan cermat ke pintu rumah.',
      cta: 'Daftar Akaun Pesakit',
      chips: ['Kod QR selamat', 'Semakan keselamatan ubat', 'Ambilan mudah di farmasi'],
    },
    members: {
      pill: 'Privasi & Rekod Kesihatan Peribadi',
      headline: 'Sejarah kesihatan anda, dipelihara dengan penuh rasa hormat dan selamat.',
      body: 'Simpan rekod kesihatan dan bacaan penting keluarga dalam peti peribadi yang dilindungi rapi di bawah PDPA 2010. Anda kekal memegang hak penuh menentukan siapa yang boleh melihat data anda.',
      cta: 'Sertai Keluarga MedCred',
      chips: ['Jaminan pulangan 10 minit', 'Privasi terpelihara PDPA', 'Kawalan data di tangan anda'],
    },
    tourism: {
      pill: 'Salam Mesra Buat Pesakit Antarabangsa',
      headline: 'Hospital bertauliah Malaysia sedia menyambut anda dengan rawatan penuh ihsan.',
      body: 'Kami berbesar hati membantu anda merancang rawatan pakar di Kuala Lumpur, Pulau Pinang, Johor Bahru dan Melaka. Daftar dengan pasport untuk semakan kes video pra-perjalanan dan sebut harga terperinci yang telus.',
      cta: 'Terokai Hospital Bertauliah',
      chips: ['Pendaftaran pasport mudah', 'Hospital berakreditasi JCI & MSQH', 'Sebut harga jujur & telus'],
    },
  },
  zh: {
    network: {
      pill: '温情守护 · 认证执业医生网络',
      headline: '温暖关怀、值得托付的家庭医生，时刻守护在您与家人身旁。',
      body: '当您或家人感到不适时，MedCred 随时为您连线马来西亚经委员会严格核实的全科及专科医生，提供耐心倾听的在线问诊、合规处方与持续康复关怀。',
      cta: '开启温馨问诊',
      chips: ['耐心倾听与细致问诊', '医学委员会严格认证', '医生签名规范处方'],
    },
    prescriptions: {
      pill: '安心药房 · 数字处方服务',
      headline: '经医生严谨核查的电子处方，随时在您身边的社区药房安心调配。',
      body: '您的用药安全是我们的首要关切。每份处方均附带防伪安全码与自动用药过敏排查，您可自主选择就近药房便捷取药或安心送药上门。',
      cta: '创建患者健康档案',
      chips: ['安全防伪处方码', '过敏相互作用安全核查', '就近社区药房自取或配送'],
    },
    members: {
      pill: '患者隐私 · 尊享健康保险箱',
      headline: '您的每一次诊疗与体征记录，都受到如同家人般的尊重与法定保密。',
      body: '在符合马来西亚 PDPA 2010 法规的安全空间中，妥善保管您与家人的体检、病历与就诊小结。数据所有权始终归您所有，由您决定授权哪位医生查阅。',
      cta: '加入健康守护会员',
      chips: ['10分钟未接诊暖心全额退款', '符合 PDPA 2010 隐私保护', '完全由您掌控健康档案'],
    },
    tourism: {
      pill: '跨国关怀 · 赴马就医国际患者',
      headline: '以真挚与诚意，为远道而来的您规划马来西亚权威医院诊疗。',
      body: '我们非常荣幸能协助您连线吉隆坡、槟城、新山与马六甲的 JCI 与 MSQH 认证医疗机构。凭护照即可在线预约行前视频会诊，获取公开透明的逐项马币报价与贴心抵马照料。',
      cta: '浏览权威认证医院',
      chips: ['护照便捷登记', 'JCI / MSQH 国际水准', '公开透明逐项报价'],
    },
  },
  id: {
    network: {
      pill: 'Layanan Dokter Penuh Perhatian',
      headline: 'Perawatan medis hangat & dokter terpercaya, selalu mendampingi Anda.',
      body: 'Saat Anda atau keluarga merasa kurang sehat, MedCred menghubungkan Anda dengan dokter spesialis dan umum berlisensi resmi di Malaysia untuk konsultasi yang sabar, mendengarkan dengan tulus, dan resep digital terpercaya.',
      cta: 'Mulai Konsultasi Hangat',
      chips: ['Konsultasi ramah & sabar', 'Dokter terverifikasi MMC', 'E-resep resmi dokter'],
    },
    prescriptions: {
      pill: 'Apotek Komunitas & E-Resep Aman',
      headline: 'E-resep yang diperiksa seksama, siap ditebus di apotek terdekat.',
      body: 'Kesehatan Anda adalah prioritas utama kami. Terima resep digital dengan pemeriksaan alergi obat otomatis, siap diambil langsung atau diantar dengan aman ke tempat Anda.',
      cta: 'Daftar Akun Pasien',
      chips: ['Kode QR resmi terverifikasi', 'Pemeriksaan keamanan obat', 'Pengambilan mudah di apotek'],
    },
    members: {
      pill: 'Privasi & Rekam Medis Terjaga',
      headline: 'Riwayat kesehatan Anda dijaga dengan penuh rasa hormat dan aman.',
      body: 'Simpan riwayat medis, hasil lab, dan catatan konsultasi dalam brankas digital yang terlindungi UU PDPA 2010. Anda memegang kendali penuh atas privasi data kesehatan Anda.',
      cta: 'Daftar Sebagai Anggota',
      chips: ['Jaminan refund 10 menit', 'Privasi terjamin UU PDPA', 'Kendali penuh di tangan Anda'],
    },
    tourism: {
      pill: 'Salam Hangat Pasien Indonesia',
      headline: 'Rumah sakit terbaik Malaysia menyambut Anda dengan pelayanan penuh kepedulian.',
      body: 'Merupakan kehormatan bagi kami membantu perjalanan medis Anda ke Penang, Kuala Lumpur, Melaka, atau Johor Bahru. Dapatkan konsultasi video pra-keberangkatan dan rincian biaya resmi yang transparan.',
      cta: 'Lihat Rumah Sakit Pilihan',
      chips: ['Cukup dengan paspor', 'Akreditasi JCI & MSQH', 'Rincian biaya jujur & jelas'],
    },
  },
  ar: {
    network: {
      pill: 'رعاية طبية إنسانية وأطباء معتمدون',
      headline: 'رعاية صحية مخلصة وأطباء يحيطونك بالاهتمام والسكينة في كل وقت.',
      body: 'عندما تشعر أنت أو عائلتك بالتعب، يسعد MedCred بتقديم العون وربطكم بأطباء واستشاريين معتمدين في ماليزيا للاستماع باهتمام وتقديم النصح الدافئ والوصفات الطبية الموثقة.',
      cta: 'تحدث مع طبيب الآن',
      chips: ['استشارات مريحة وإنسانية', 'أطباء معتمدون من MMC', 'وصفات إلكترونية موثقة'],
    },
    prescriptions: {
      pill: 'صيدلية حريصة ووصفات موثوقة',
      headline: 'وصفات طبية مفحوصة بعناية فائقة وجاهزة للصرف من أقرب صيدلية إليك.',
      body: 'عافيتكم وسلامتكم هي غايتنا الأولى. احصل على وصفات إلكترونية موقعة من الطبيب مع فحص آلي دقيق لتعارض الأدوية، جاهزة للاستلام أو التوصيل اللطيف لمقر إقامتك.',
      cta: 'إنشاء ملف صحي للمريض',
      chips: ['رمز QR موثق وآمن', 'فحص أمان الحساسية الدوائية', 'صرف ميسر من الصيدليات'],
    },
    members: {
      pill: 'خصوصية تامة وحفظ السجلات الصحية',
      headline: 'تاريخك الصحي محفوظ بأعلى درجات الاحترام والأمان بموجب القانون.',
      body: 'احتفظ بسجلاتك الصحية ونتائج فحوصات العائلة في خزانة مشفرة محمية بقانون PDPA 2010. أنت وحدك صاحب القرار فيمن يطلع على رحلتك الصحية.',
      cta: 'انضم إلى عائلة MedCred',
      chips: ['استرداد كامل خلال 10 دقائق', 'حماية خصوصية PDPA 2010', 'بياناتك ملكك بالكامل'],
    },
    tourism: {
      pill: 'أهلاً بكم في ماليزيا للعلاج',
      headline: 'مستشفيات ماليزيا المعتمدة تستقبلكم بكل حفاوة ورعاية طبية استثنائية.',
      body: 'يشرفنا مرافقتكم في رحلتكم العلاجية بكوالالمبور وبينانغ. سجل بجواز سفرك لترتيب استشارة مرئية تسبق سفرك والحصول على عرض سعر رسمي مفصل بشفافية كاملة.',
      cta: 'تصفح المستشفيات المعتمدة',
      chips: ['تسجيل ميسر بجواز السفر', 'اعتماد دولي JCI وMSQH', 'عروض أسعار شفافة وصادقة'],
    },
  },
};
