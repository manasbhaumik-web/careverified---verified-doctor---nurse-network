import type { Lang, PageContent } from '../components/AudiencePage';

/**
 * Words for /for-pharmacies. Each statement is traced to its source in docs/PARTNER_PAGES.md. Malay and Chinese are a
 * developer draft for native review.
 */
export const FOR_PHARMACIES: Record<Lang, PageContent> = {
  en: {
    title: 'Join MedCred as a pharmacy',
    description: 'Receive signed prescriptions you can check, update their status, offer home delivery and keep your own records. How joining works and what is not built yet.',
    hero: {
      eyebrow: 'For pharmacies',
      h1: 'Receive prescriptions you can trust',
      sub: 'Patients send you signed prescriptions that you can check, you update their status, and you keep your own records. You appear in the patient directory once the board has verified your licence.',
      apply: 'Ask to join', signin: 'Pharmacy sign in',
      who: 'Pharmacy accounts are created by the board after you apply.',
    },
    sections: [
      {
        kind: 'steps', id: 'steps', title: 'How joining works',
        items: [
          { t: 'Ask to join', d: 'Fill in the short form below. You do not need to send documents yet.' },
          { t: 'We contact you', d: 'A board member gets in touch. We do not promise a reply time yet.' },
          { t: 'We record your licence', d: 'Your premises licence number and expiry, your pharmacist\'s name and registration number, the pharmacist\'s retention certificate expiry, your licence type, and how each was checked.' },
          { t: 'Go live', d: 'The board creates your account. You appear in the patient directory and can receive prescriptions.' },
        ],
      },
      {
        kind: 'cards', id: 'does', title: 'What you get',
        items: [
          { icon: 'inbox', t: 'Prescription inbox', d: 'Prescriptions that patients choose to send you arrive in your inbox. Update the status and the patient sees it.' },
          { icon: 'qr', t: 'Check any prescription', d: 'Every prescription has a code and a QR. Look a code up to see whether it is valid. The public check page needs no sign-in.' },
          { icon: 'scroll', t: 'Dispensing record', d: 'Each dispense records the dispensing pharmacist and, if you use it, a poisons or prescription book entry number. The entry number can be made compulsory.' },
          { icon: 'truck', t: 'Home delivery', d: 'Offer delivery with your own rider, Grab, Lalamove or another courier. You book with the partner and record the reference. There is no live integration with Grab or Lalamove.' },
          { icon: 'snow', t: 'Cold chain', d: 'Say whether you can deliver cold-chain medicines such as insulin and vaccines. Only pharmacies that say they can are offered those deliveries.' },
          { icon: 'shield', t: 'Insurance panels', d: 'List the insurers you accept. Record each guarantee letter decision, approved with a number or declined with a reason, and the patient is told.' },
          { icon: 'chart', t: 'Reports and activity log', d: 'See what has come through your pharmacy, and a log of what your team did.' },
          { icon: 'store', t: 'Your team and listing', d: 'The owner account adds staff as separate logins, so every action can be traced to a person. Keep your listing up to date.' },
        ],
      },
      {
        kind: 'split', id: 'keep',
        left: {
          title: 'What we check and keep checking',
          items: [
            'Your premises licence and your pharmacist\'s registration and retention certificate are recorded with their expiry dates and how we checked them.',
            'When the premises licence or the retention certificate expires, your workspace is blocked, you are hidden from the directory, and patients cannot send you prescriptions or ask for delivery. You get a reminder 30 days before.',
          ],
        },
        right: [
          {
            title: 'Security and privacy',
            items: [
              'Pharmacy accounts must use two-factor sign-in with an authenticator app in production.',
              'A patient\'s address and phone number reach you and your delivery partner only for the delivery.',
              'Delivery is within Malaysia only.',
            ],
          },
        ],
      },
      { kind: 'note', id: 'notyet', title: 'Not built yet', text: 'Connections to insurers for guarantee letters and claims, co-payment amounts, paying a balance in the app, and live Grab or Lalamove booking are not built. The medicine list does not carry Poisons Act groups yet, so a pharmacist must confirm those.' },
      { kind: 'bullets', id: 'fees', title: 'Fees', items: ['The platform does not charge pharmacies today.', 'Delivery fees are recorded in the app and paid to the pharmacy directly, not through MedCred.', 'If you want to discuss terms, say so in the form.'] },
    ],
    apply: { title: 'Ask to join', intro: 'Tell us about your pharmacy. A board member will contact you. Pharmacy accounts are created by the board, so this form is the way in.' },
  },
  ms: {
    title: 'Sertai MedCred sebagai farmasi',
    description: 'Terima preskripsi bertandatangan yang boleh disemak, kemas kini statusnya, tawarkan penghantaran ke rumah dan simpan rekod anda sendiri. Cara menyertai dan apa yang belum dibina.',
    hero: {
      eyebrow: 'Untuk farmasi',
      h1: 'Terima preskripsi yang boleh dipercayai',
      sub: 'Pesakit menghantar preskripsi bertandatangan yang boleh anda semak, anda mengemas kini statusnya, dan anda menyimpan rekod sendiri. Anda muncul dalam direktori pesakit setelah lembaga mengesahkan lesen anda.',
      apply: 'Mohon menyertai', signin: 'Log masuk farmasi',
      who: 'Akaun farmasi dicipta oleh lembaga selepas anda memohon.',
    },
    sections: [
      {
        kind: 'steps', id: 'steps', title: 'Cara menyertai',
        items: [
          { t: 'Mohon menyertai', d: 'Isi borang ringkas di bawah. Anda tidak perlu menghantar dokumen lagi.' },
          { t: 'Kami menghubungi anda', d: 'Seorang ahli lembaga akan menghubungi anda. Kami belum menjanjikan tempoh balasan.' },
          { t: 'Kami merekod lesen anda', d: 'Nombor lesen premis dan tarikh tamatnya, nama dan nombor pendaftaran ahli farmasi anda, tarikh tamat sijil pengekalan ahli farmasi, jenis lesen, dan cara setiap satu disemak.' },
          { t: 'Mula beroperasi', d: 'Lembaga mencipta akaun anda. Anda muncul dalam direktori pesakit dan boleh menerima preskripsi.' },
        ],
      },
      {
        kind: 'cards', id: 'does', title: 'Apa yang anda dapat',
        items: [
          { icon: 'inbox', t: 'Peti masuk preskripsi', d: 'Preskripsi yang dipilih pesakit untuk dihantar kepada anda masuk ke peti masuk anda. Kemas kini status dan pesakit melihatnya.' },
          { icon: 'qr', t: 'Semak sebarang preskripsi', d: 'Setiap preskripsi mempunyai kod dan QR. Cari kod untuk melihat sama ada ia sah. Halaman semakan awam tidak memerlukan log masuk.' },
          { icon: 'scroll', t: 'Rekod pendispensan', d: 'Setiap pendispensan merekod ahli farmasi yang mendispens dan, jika anda gunakan, nombor entri buku racun atau preskripsi. Nombor entri boleh diwajibkan.' },
          { icon: 'truck', t: 'Penghantaran ke rumah', d: 'Tawarkan penghantaran dengan penunggang sendiri, Grab, Lalamove atau kurier lain. Anda menempah dengan rakan kongsi dan merekod rujukan. Tiada integrasi langsung dengan Grab atau Lalamove.' },
          { icon: 'snow', t: 'Rantaian sejuk', d: 'Nyatakan sama ada anda boleh menghantar ubat rantaian sejuk seperti insulin dan vaksin. Hanya farmasi yang menyatakan boleh akan ditawarkan penghantaran tersebut.' },
          { icon: 'shield', t: 'Panel insurans', d: 'Senaraikan penanggung insurans yang anda terima. Rekod setiap keputusan surat jaminan, diluluskan dengan nombor atau ditolak dengan sebab, dan pesakit dimaklumkan.' },
          { icon: 'chart', t: 'Laporan dan log aktiviti', d: 'Lihat apa yang telah masuk ke farmasi anda, dan log tindakan pasukan anda.' },
          { icon: 'store', t: 'Pasukan dan penyenaraian anda', d: 'Akaun pemilik menambah kakitangan sebagai log masuk berasingan, jadi setiap tindakan boleh dikesan kepada seseorang. Kemas kini penyenaraian anda.' },
        ],
      },
      {
        kind: 'split', id: 'keep',
        left: {
          title: 'Apa yang kami semak dan terus semak',
          items: [
            'Lesen premis anda serta pendaftaran dan sijil pengekalan ahli farmasi anda direkod bersama tarikh tamat dan cara kami menyemaknya.',
            'Apabila lesen premis atau sijil pengekalan tamat, ruang kerja anda disekat, anda disembunyikan daripada direktori, dan pesakit tidak boleh menghantar preskripsi atau meminta penghantaran. Anda menerima peringatan 30 hari sebelumnya.',
          ],
        },
        right: [
          {
            title: 'Keselamatan dan privasi',
            items: [
              'Akaun farmasi mesti menggunakan log masuk dua faktor dengan aplikasi pengesah dalam persekitaran sebenar.',
              'Alamat dan nombor telefon pesakit sampai kepada anda dan rakan penghantaran anda hanya untuk penghantaran.',
              'Penghantaran hanya di dalam Malaysia.',
            ],
          },
        ],
      },
      { kind: 'note', id: 'notyet', title: 'Belum dibina', text: 'Sambungan kepada penanggung insurans untuk surat jaminan dan tuntutan, jumlah bayaran bersama, pembayaran baki dalam aplikasi, dan tempahan langsung Grab atau Lalamove belum dibina. Senarai ubat belum mempunyai kumpulan Akta Racun, jadi ahli farmasi mesti mengesahkannya.' },
      { kind: 'bullets', id: 'fees', title: 'Yuran', items: ['Platform tidak mengenakan bayaran kepada farmasi pada masa ini.', 'Yuran penghantaran direkod dalam aplikasi dan dibayar terus kepada farmasi, bukan melalui MedCred.', 'Jika anda mahu membincangkan terma, nyatakan dalam borang.'] },
    ],
    apply: { title: 'Mohon menyertai', intro: 'Ceritakan tentang farmasi anda. Seorang ahli lembaga akan menghubungi anda. Akaun farmasi dicipta oleh lembaga, jadi borang ini ialah pintu masuknya.' },
  },
  zh: {
    title: '以药房身份加入 MedCred',
    description: '接收可核查的已签名处方，更新处方状态，提供送药上门并保存自己的记录。了解加入流程和尚未建成的功能。',
    hero: {
      eyebrow: '面向药房',
      h1: '接收值得信赖的处方',
      sub: '患者向您发送可核查的已签名处方，您更新处方状态并保存自己的记录。委员会核实您的执照后，您会出现在患者名录中。',
      apply: '申请加入', signin: '药房登录',
      who: '药房账户在您申请后由委员会创建。',
    },
    sections: [
      {
        kind: 'steps', id: 'steps', title: '加入流程',
        items: [
          { t: '申请加入', d: '填写下方简短表格。现在无需提交文件。' },
          { t: '我们联系您', d: '委员会成员会与您联系。我们暂时不承诺回复时限。' },
          { t: '我们记录您的执照', d: '您的营业场所执照号码和到期日、药剂师姓名和注册号码、药剂师续证证书到期日、执照类型，以及每项的核查方式。' },
          { t: '上线', d: '委员会为您创建账户。您会出现在患者名录中，并可接收处方。' },
        ],
      },
      {
        kind: 'cards', id: 'does', title: '您能得到什么',
        items: [
          { icon: 'inbox', t: '处方收件箱', d: '患者选择发给您的处方会进入您的收件箱。更新状态，患者即可看到。' },
          { icon: 'qr', t: '核查任何处方', d: '每张处方都有代码和二维码。查询代码即可知道是否有效。公开核查页面无需登录。' },
          { icon: 'scroll', t: '配药记录', d: '每次配药都会记录配药药剂师，以及（如果您使用）毒药或处方登记簿的条目编号。条目编号可设为必填。' },
          { icon: 'truck', t: '送药上门', d: '可通过自己的骑手、Grab、Lalamove 或其他快递提供送药。您向合作方预订并记录参考编号。与 Grab 或 Lalamove 没有实时对接。' },
          { icon: 'snow', t: '冷链', d: '说明您是否能配送胰岛素和疫苗等冷链药品。只有表示可以的药房才会被安排这类配送。' },
          { icon: 'shield', t: '保险合作名单', d: '列出您接受的保险公司。记录每份担保函的决定（批准并附编号，或拒绝并说明原因），患者会收到通知。' },
          { icon: 'chart', t: '报告和活动记录', d: '查看经过您药房的处方，以及团队操作的记录。' },
          { icon: 'store', t: '团队和药房资料', d: '负责人账户可为员工添加独立登录，每项操作都能追溯到具体的人。请保持药房资料为最新。' },
        ],
      },
      {
        kind: 'split', id: 'keep',
        left: {
          title: '我们核查什么，并持续核查',
          items: [
            '您的营业场所执照、药剂师注册和续证证书，会连同到期日和我们的核查方式一起记录。',
            '营业场所执照或续证证书到期后，您的工作区会被封锁，您会从名录中隐藏，患者也无法向您发送处方或申请配送。到期前 30 天您会收到提醒。',
          ],
        },
        right: [
          {
            title: '安全与隐私',
            items: [
              '正式环境中，药房账户必须使用验证器应用的双重验证登录。',
              '患者的地址和电话只在配送时提供给您和您的配送合作方。',
              '仅限马来西亚境内配送。',
            ],
          },
        ],
      },
      { kind: 'note', id: 'notyet', title: '尚未建成', text: '与保险公司对接担保函和理赔、共付额、在应用内支付余款，以及 Grab 或 Lalamove 的实时预订尚未建成。药品清单尚未包含毒药法令分类，需由药剂师确认。' },
      { kind: 'bullets', id: 'fees', title: '费用', items: ['平台目前不向药房收费。', '配送费会记录在应用中，并直接支付给药房，不经过 MedCred。', '如果您想讨论条款，请在表格中说明。'] },
    ],
    apply: { title: '申请加入', intro: '请介绍一下您的药房。委员会成员会与您联系。药房账户由委员会创建，所以这张表格是唯一入口。' },
  },
};
