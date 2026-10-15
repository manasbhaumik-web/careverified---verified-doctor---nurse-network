import type { Lang, PageContent } from '../components/AudiencePage';

/**
 * Words for /for-clinics. Each statement is traced to its source in docs/PARTNER_PAGES.md. Malay and Chinese are a
 * developer draft for native review.
 */
export const FOR_CLINICS: Record<Lang, PageContent> = {
  en: {
    title: 'Join MedCred as a clinic or hospital',
    description: 'List your facility for international patients, send itemised quotes, and post jobs or find locum cover from practitioners whose licences we have checked.',
    hero: {
      eyebrow: 'For clinics and hospitals',
      h1: 'Reach international patients and verified staff',
      sub: 'List your facility for international patients, send itemised quotes, and post jobs or find locum cover from practitioners whose licences we have checked.',
      apply: 'Ask to join', signin: 'Staff sign in',
      who: 'Private clinics and hospitals with a Ministry of Health private healthcare facility licence can join. The board adds your facility and your staff accounts.',
    },
    sections: [
      {
        kind: 'steps', id: 'steps', title: 'How joining works',
        items: [
          { t: 'Ask to join', d: 'Fill in the short form below. You do not need to send documents yet.' },
          { t: 'We contact you', d: 'A board member gets in touch. We do not promise a reply time yet.' },
          { t: 'We check your facility', d: 'Your private healthcare facility licence number and expiry, and any JCI or MSQH accreditation with its certificate number and expiry, each with how we checked it.' },
          { t: 'Go live', d: 'Your facility appears in the public facility list. The board assigns your staff, who sign in as practitioners.' },
        ],
      },
      {
        kind: 'cards', id: 'does', title: 'What you can do',
        items: [
          { icon: 'plane', t: 'International enquiries', d: 'Patients abroad describe the treatment, their dates and their needs. Your staff answer in one place.' },
          { icon: 'doc', t: 'Itemised quotes', d: 'Send quotes that list each item, what is not included, and the cancellation and refund terms. The system will not send a quote without them.' },
          { icon: 'msg', t: 'Itinerary and messages', d: 'Add dated itinerary items, from arrival to follow-up, and message the patient on the case.' },
          { icon: 'steth', t: 'Discharge summaries', d: 'A verified doctor of your facility writes the discharge summary and follow-up plan. The patient can share it with their home doctor through a link that expires.' },
          { icon: 'brief', t: 'Jobs and locum shifts', d: 'Post roles and dated locum shifts with pay in ringgit. Private-sector posts need a facility whose licence we have checked and that has not expired.' },
          { icon: 'search', t: 'Find locums', d: 'Browse practitioners who list themselves as available, by state, role, specialty, rate and date. Only verified practitioners with a valid practising certificate appear. You send an invitation and their contact details stay private until they reply.' },
          { icon: 'lang', t: 'Foreign applicants', d: 'Say whether you consider practitioners registered abroad and whether you help with registration and the work permit.' },
          { icon: 'build', t: 'Your listing', d: 'Languages, specialties, interpreter, airport pickup, halal food, prayer room and accommodation partners, shown to patients.' },
        ],
      },
      {
        kind: 'bullets', id: 'check', title: 'What we check',
        items: [
          'Your private healthcare facility licence under Act 586: its number, its expiry and how we checked it.',
          'JCI and MSQH accreditation is shown only after we check it and record when it expires. An expired accreditation is never shown.',
          'A facility whose licence expires is hidden from the list and cannot advertise jobs.',
          'Government hospitals are not in the facility register. They can post public-sector roles, shown as "licence not checked".',
        ],
      },
      {
        kind: 'bullets', id: 'records', title: 'Patients\' records and your staff', tint: true,
        items: [
          'Passport copies and records are visible to your staff only if the patient agrees when sending the enquiry, and only for that case.',
          'Your staff see only your facility\'s cases, and every time a case or file is opened it is logged.',
          'Staff accounts are created and assigned by the board.',
        ],
      },
      { kind: 'note', id: 'notyet', title: 'Not built yet', text: 'You cannot edit your own listing yet: the board edits it for you. You cannot edit or close a job post from the screen. Deposits and payments are not handled in the app: payment is arranged directly with your facility. There is no HL7 or FHIR record transfer, no role for travel facilitators, and applicant tracking goes no further than "applied".' },
      { kind: 'bullets', id: 'fees', title: 'Fees', items: ['The platform does not charge facilities today.', 'Payment for a quote is arranged directly with your facility, not through MedCred.', 'If you want to discuss terms, say so in the form.'] },
    ],
    apply: { title: 'Ask to join', intro: 'Tell us about your clinic or hospital. A board member will contact you. The board adds facilities and staff accounts, so this form is the way in.' },
  },
  ms: {
    title: 'Sertai MedCred sebagai klinik atau hospital',
    description: 'Senaraikan kemudahan anda untuk pesakit antarabangsa, hantar sebut harga terperinci, dan siarkan jawatan atau cari ganti locum daripada pengamal yang lesennya telah kami semak.',
    hero: {
      eyebrow: 'Untuk klinik dan hospital',
      h1: 'Capai pesakit antarabangsa dan kakitangan yang disahkan',
      sub: 'Senaraikan kemudahan anda untuk pesakit antarabangsa, hantar sebut harga terperinci, dan siarkan jawatan atau cari ganti locum daripada pengamal yang lesennya telah kami semak.',
      apply: 'Mohon menyertai', signin: 'Log masuk kakitangan',
      who: 'Klinik dan hospital swasta yang mempunyai lesen kemudahan jagaan kesihatan swasta Kementerian Kesihatan boleh menyertai. Lembaga menambah kemudahan dan akaun kakitangan anda.',
    },
    sections: [
      {
        kind: 'steps', id: 'steps', title: 'Cara menyertai',
        items: [
          { t: 'Mohon menyertai', d: 'Isi borang ringkas di bawah. Anda tidak perlu menghantar dokumen lagi.' },
          { t: 'Kami menghubungi anda', d: 'Seorang ahli lembaga akan menghubungi anda. Kami belum menjanjikan tempoh balasan.' },
          { t: 'Kami menyemak kemudahan anda', d: 'Nombor lesen kemudahan jagaan kesihatan swasta dan tarikh tamatnya, serta sebarang akreditasi JCI atau MSQH dengan nombor sijil dan tarikh tamatnya, masing-masing dengan cara kami menyemaknya.' },
          { t: 'Mula beroperasi', d: 'Kemudahan anda muncul dalam senarai kemudahan awam. Lembaga menugaskan kakitangan anda, yang log masuk sebagai pengamal.' },
        ],
      },
      {
        kind: 'cards', id: 'does', title: 'Apa yang boleh anda lakukan',
        items: [
          { icon: 'plane', t: 'Pertanyaan antarabangsa', d: 'Pesakit di luar negara menerangkan rawatan, tarikh dan keperluan mereka. Kakitangan anda menjawab di satu tempat.' },
          { icon: 'doc', t: 'Sebut harga terperinci', d: 'Hantar sebut harga yang menyenaraikan setiap item, apa yang tidak termasuk, serta terma pembatalan dan bayaran balik. Sistem tidak akan menghantar sebut harga tanpa semua itu.' },
          { icon: 'msg', t: 'Jadual perjalanan dan mesej', d: 'Tambah item jadual bertarikh, dari ketibaan hingga susulan, dan hantar mesej kepada pesakit pada kes tersebut.' },
          { icon: 'steth', t: 'Ringkasan discaj', d: 'Seorang doktor yang disahkan di kemudahan anda menulis ringkasan discaj dan pelan susulan. Pesakit boleh berkongsinya dengan doktor di negara asal melalui pautan yang tamat tempoh.' },
          { icon: 'brief', t: 'Jawatan dan syif locum', d: 'Siarkan jawatan dan syif locum bertarikh dengan gaji dalam ringgit. Siaran sektor swasta memerlukan kemudahan yang lesennya telah kami semak dan belum tamat.' },
          { icon: 'search', t: 'Cari locum', d: 'Layari pengamal yang menyenaraikan diri sebagai tersedia, mengikut negeri, peranan, kepakaran, kadar dan tarikh. Hanya pengamal disahkan yang mempunyai sijil amalan sah dipaparkan. Anda menghantar jemputan dan butiran hubungan mereka kekal peribadi sehingga mereka membalas.' },
          { icon: 'lang', t: 'Pemohon asing', d: 'Nyatakan sama ada anda mempertimbangkan pengamal yang berdaftar di luar negara dan sama ada anda membantu pendaftaran dan permit kerja.' },
          { icon: 'build', t: 'Penyenaraian anda', d: 'Bahasa, kepakaran, jurubahasa, jemputan lapangan terbang, makanan halal, bilik solat dan rakan penginapan, dipaparkan kepada pesakit.' },
        ],
      },
      {
        kind: 'bullets', id: 'check', title: 'Apa yang kami semak',
        items: [
          'Lesen kemudahan jagaan kesihatan swasta anda di bawah Akta 586: nombornya, tarikh tamatnya dan cara kami menyemaknya.',
          'Akreditasi JCI dan MSQH dipaparkan hanya selepas kami menyemaknya dan merekod tarikh tamatnya. Akreditasi yang telah tamat tidak pernah dipaparkan.',
          'Kemudahan yang lesennya tamat disembunyikan daripada senarai dan tidak boleh menyiarkan jawatan.',
          'Hospital kerajaan tiada dalam daftar kemudahan. Mereka boleh menyiarkan jawatan sektor awam, dipaparkan sebagai "lesen tidak disemak".',
        ],
      },
      {
        kind: 'bullets', id: 'records', title: 'Rekod pesakit dan kakitangan anda', tint: true,
        items: [
          'Salinan pasport dan rekod hanya boleh dilihat oleh kakitangan anda jika pesakit bersetuju semasa menghantar pertanyaan, dan hanya untuk kes itu.',
          'Kakitangan anda hanya melihat kes kemudahan anda, dan setiap kali kes atau fail dibuka ia direkodkan.',
          'Akaun kakitangan dicipta dan ditugaskan oleh lembaga.',
        ],
      },
      { kind: 'note', id: 'notyet', title: 'Belum dibina', text: 'Anda belum boleh menyunting penyenaraian sendiri: lembaga yang menyuntingnya untuk anda. Anda tidak boleh menyunting atau menutup siaran jawatan daripada skrin. Deposit dan pembayaran tidak dikendalikan dalam aplikasi: pembayaran diuruskan terus dengan kemudahan anda. Tiada pemindahan rekod HL7 atau FHIR, tiada peranan untuk fasilitator pelancongan, dan penjejakan pemohon tidak melebihi "telah memohon".' },
      { kind: 'bullets', id: 'fees', title: 'Yuran', items: ['Platform tidak mengenakan bayaran kepada kemudahan pada masa ini.', 'Pembayaran sebut harga diuruskan terus dengan kemudahan anda, bukan melalui MedCred.', 'Jika anda mahu membincangkan terma, nyatakan dalam borang.'] },
    ],
    apply: { title: 'Mohon menyertai', intro: 'Ceritakan tentang klinik atau hospital anda. Seorang ahli lembaga akan menghubungi anda. Lembaga menambah kemudahan dan akaun kakitangan, jadi borang ini ialah pintu masuknya.' },
  },
  zh: {
    title: '以诊所或医院身份加入 MedCred',
    description: '把您的机构列入国际患者名录，发送逐项报价，并发布职位或从执照已核查的医疗人员中寻找代班人手。',
    hero: {
      eyebrow: '面向诊所和医院',
      h1: '接触国际患者和经认证的员工',
      sub: '把您的机构列入国际患者名录，发送逐项报价，并发布职位或从执照已核查的医疗人员中寻找代班人手。',
      apply: '申请加入', signin: '员工登录',
      who: '持有卫生部私立医疗机构执照的私立诊所和医院可以加入。机构和员工账户由委员会添加。',
    },
    sections: [
      {
        kind: 'steps', id: 'steps', title: '加入流程',
        items: [
          { t: '申请加入', d: '填写下方简短表格。现在无需提交文件。' },
          { t: '我们联系您', d: '委员会成员会与您联系。我们暂时不承诺回复时限。' },
          { t: '我们核查您的机构', d: '您的私立医疗机构执照号码和到期日，以及任何 JCI 或 MSQH 认证的证书号码和到期日，并记录每项的核查方式。' },
          { t: '上线', d: '您的机构会出现在公开的机构名录中。委员会指派您的员工，他们以医疗人员身份登录。' },
        ],
      },
      {
        kind: 'cards', id: 'does', title: '您可以做什么',
        items: [
          { icon: 'plane', t: '国际咨询', d: '国外的患者说明治疗内容、日期和需求。您的员工在同一处回复。' },
          { icon: 'doc', t: '逐项报价', d: '发送列明每个项目、不包含内容以及取消和退款条款的报价。缺少这些内容，系统不会发送报价。' },
          { icon: 'msg', t: '行程与消息', d: '添加带日期的行程项目，从抵达到复诊，并在该案例中与患者沟通。' },
          { icon: 'steth', t: '出院小结', d: '由您机构经认证的医生撰写出院小结和复诊计划。患者可通过会过期的链接把它分享给自己国家的医生。' },
          { icon: 'brief', t: '职位与代班班次', d: '发布职位和带日期的代班班次，薪酬以令吉计。私营机构的发布，需要执照已核查且未过期的机构。' },
          { icon: 'search', t: '寻找代班人员', d: '按州属、角色、专科、费率和日期浏览自行标明可接单的医疗人员。只有执业证书有效且经认证的人员才会出现。您发送邀请，在对方回复之前其联系方式保持私密。' },
          { icon: 'lang', t: '境外申请人', d: '说明您是否考虑在国外注册的医疗人员，以及是否协助注册和工作许可。' },
          { icon: 'build', t: '您的机构资料', d: '语言、专科、翻译、机场接送、清真餐食、祈祷室和合作住宿，向患者展示。' },
        ],
      },
      {
        kind: 'bullets', id: 'check', title: '我们核查什么',
        items: [
          '您依据第 586 号法令取得的私立医疗机构执照：号码、到期日以及我们的核查方式。',
          'JCI 和 MSQH 认证只有在我们核查并记录到期日之后才会显示。已过期的认证绝不会显示。',
          '执照过期的机构会从名录中隐藏，也不能发布职位。',
          '政府医院不在机构名册中。它们可以发布公共部门职位，并显示为“执照未核查”。',
        ],
      },
      {
        kind: 'bullets', id: 'records', title: '患者记录与您的员工', tint: true,
        items: [
          '只有当患者在发送咨询时同意，您的员工才能看到护照复印件和病历，并且仅限该案例。',
          '您的员工只能看到本机构的案例，每次打开案例或文件都会留有记录。',
          '员工账户由委员会创建和指派。',
        ],
      },
      { kind: 'note', id: 'notyet', title: '尚未建成', text: '您目前还不能自行编辑机构资料：由委员会代为编辑。您不能在界面上编辑或关闭职位发布。订金和付款不在应用内处理：费用直接与您的机构安排。没有 HL7 或 FHIR 病历传输，没有旅行中介的角色，申请人跟踪也只到“已申请”。' },
      { kind: 'bullets', id: 'fees', title: '费用', items: ['平台目前不向机构收费。', '报价的付款直接与您的机构安排，不经过 MedCred。', '如果您想讨论条款，请在表格中说明。'] },
    ],
    apply: { title: '申请加入', intro: '请介绍一下您的诊所或医院。委员会成员会与您联系。机构和员工账户由委员会添加，所以这张表格是唯一入口。' },
  },
};
