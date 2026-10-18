import { DoctorProfile, NurseProfile, UserRole, VerificationStatus, Article } from './types';

/**
 * Malaysian demo data. Everything here is invented for testing: names are not real people and every registration
 * number starts with DEMO- so it can never be mistaken for a real MMC or Nursing Board number. No ratings or reviews
 * are fabricated (they start at zero).
 */

const doctor = (p: Partial<DoctorProfile> & Pick<DoctorProfile, 'id' | 'name' | 'avatar' | 'specialization' | 'licenseNumber' | 'city' | 'bio' | 'languages' | 'fee' | 'practiceAddress' | 'seoSlug'>): DoctorProfile => ({
  role: UserRole.DOCTOR,
  medicalCouncil: 'Malaysian Medical Council (MMC)',
  registryId: 'MMC',
  registrationType: 'full',
  licenseExpiry: '2029-12-31',
  experienceYears: 8,
  education: ['MBBS (demo)'],
  consultationModes: ['In-person' as any, 'Video Telehealth' as any],
  rating: 0,
  reviewCount: 0,
  verificationStatus: VerificationStatus.VERIFIED,
  availability: { days: ['Monday', 'Wednesday', 'Friday'], slots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'] },
  isDemo: true,
  ...p,
});

export const MY_DEMO_DOCTORS: DoctorProfile[] = [
  doctor({
    id: 'doc-my-1', name: 'Dr. Kavitha Subramaniam (demo)', avatar: '/assets/doctor_female_indian.jpg', specialization: 'General Physician',
    licenseNumber: 'DEMO-MMC-0101', city: 'George Town', fee: 60, experienceYears: 11, education: ['MBBS (demo)', 'Diploma in Family Medicine (demo)'],
    bio: 'Demo profile. Family doctor for adults and children, with a focus on diabetes and blood pressure follow-up.',
    languages: ['English', 'Malay', 'Tamil'], practiceAddress: 'Demo Clinic, Jalan Demo, George Town, Pulau Pinang', seoSlug: 'demo-dr-kavitha-general-physician-george-town',
  }),
  doctor({
    id: 'doc-my-2', name: 'Dr. Jonathan Anak Rentap (demo)', avatar: '/assets/malaysian_male_doctor.jpg', specialization: 'Orthopaedic Surgeon',
    licenseNumber: 'DEMO-MMC-0102', city: 'Kuching', fee: 180, experienceYears: 15, registrationType: 'specialist', education: ['MBBS (demo)', 'Master of Surgery, Orthopaedics (demo)'],
    bio: 'Demo profile. Joint and sports injuries, with outreach clinics for interior Sarawak.',
    languages: ['English', 'Malay', 'Iban'], practiceAddress: 'Demo Specialist Centre, Jalan Demo, Kuching, Sarawak', seoSlug: 'demo-dr-jonathan-orthopaedic-kuching',
    availability: { days: ['Tuesday', 'Thursday'], slots: ['10:00 AM', '01:00 PM', '03:00 PM'] },
  }),
  doctor({
    id: 'doc-my-3', name: 'Dr. Nurul Hidayah Binti Abdullah (demo)', avatar: '/assets/malaysian_female_doctor.jpg', specialization: 'General Physician',
    licenseNumber: 'DEMO-MMC-0103', city: 'Kota Kinabalu', fee: 70, experienceYears: 9,
    bio: 'Demo profile. Family medicine and women\'s health, with video consultations for patients outside the city.',
    languages: ['English', 'Malay', 'Kadazan-Dusun'], practiceAddress: 'Demo Klinik, Jalan Demo, Kota Kinabalu, Sabah', seoSlug: 'demo-dr-nurul-hidayah-general-kota-kinabalu',
  }),
  doctor({
    id: 'doc-my-4', name: 'Dr. Lim Wei Jie (demo)', avatar: '/assets/doctor_male_chinese.jpg', specialization: 'Endocrinologist',
    licenseNumber: 'DEMO-MMC-0104', city: 'Johor Bahru', fee: 160, experienceYears: 13, registrationType: 'specialist', education: ['MBBS (demo)', 'Master of Medicine, Internal Medicine (demo)'],
    bio: 'Demo profile. Diabetes, thyroid and hormone disorders. Sees international patients from Singapore for follow-up.',
    languages: ['English', 'Malay', 'Mandarin', 'Cantonese'], practiceAddress: 'Demo Medical Centre, Jalan Demo, Johor Bahru, Johor', seoSlug: 'demo-dr-lim-wei-jie-endocrinologist-johor-bahru',
  }),
];

const nurse = (p: Partial<NurseProfile> & Pick<NurseProfile, 'id' | 'name' | 'avatar' | 'specialization' | 'licenseNumber' | 'city' | 'bio' | 'languages' | 'fee' | 'practiceAddress' | 'seoSlug' | 'shiftTypes'>): NurseProfile => ({
  role: UserRole.NURSE,
  nursingCouncil: 'Malaysian Nursing Board (LJM)',
  registryId: 'LJM',
  registrationType: 'full',
  licenseExpiry: '2029-12-31',
  experienceYears: 6,
  education: ['Diploma in Nursing (demo)'],
  consultationModes: ['Home Visit' as any],
  rating: 0,
  reviewCount: 0,
  verificationStatus: VerificationStatus.VERIFIED,
  availability: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], slots: ['09:00 AM - 05:00 PM'] },
  isDemo: true,
  ...p,
});

export const MY_DEMO_NURSES: NurseProfile[] = [
  nurse({
    id: 'nur-my-1', name: 'Siti Hajar Binti Osman (demo)', avatar: '/assets/malaysian_female_nurse.jpg', specialization: 'Community & Wound Care',
    licenseNumber: 'DEMO-LJM-0201', city: 'Ipoh', fee: 45, experienceYears: 10,
    bio: 'Demo profile. Home wound care, diabetic foot checks and post-hospital follow-up in Perak.',
    languages: ['Malay', 'English'], practiceAddress: 'Home visits around Ipoh, Perak', seoSlug: 'demo-siti-hajar-community-nurse-ipoh', shiftTypes: ['Day Shift'],
  }),
  nurse({
    id: 'nur-my-2', name: 'Raj Kumar Pillai (demo)', avatar: '/assets/nurse_male_malaysian.jpg', specialization: 'Elderly & Palliative Care',
    licenseNumber: 'DEMO-LJM-0202', city: 'Seremban', fee: 55, experienceYears: 12,
    bio: 'Demo profile. Home nursing for older adults and palliative care support for families.',
    languages: ['English', 'Malay', 'Tamil'], practiceAddress: 'Home visits around Seremban, Negeri Sembilan', seoSlug: 'demo-raj-kumar-elderly-nurse-seremban', shiftTypes: ['Day Shift', 'Night Shift'],
  }),
];

// ───────── Health topics with a Malaysian focus (draft: not yet reviewed by a registered doctor) ─────────
const EDITORIAL = {
  authorId: 'editorial',
  authorName: 'MedCred editorial team',
  authorTitle: 'Draft: awaiting review by a registered doctor',
  authorAvatar: '/assets/medcred-loader.svg',
  authorCredentialsVerified: false,
  date: '2026-10-15',
  draft: true,
  translationStatus: 'draft' as const,
};
const DISCLAIMER_EN = '*Educational only. This is not a substitute for a doctor\'s assessment. In an emergency call 999.*';
const DISCLAIMER_MS = '*Untuk tujuan pendidikan sahaja. Bukan pengganti penilaian doktor. Dalam kecemasan, hubungi 999.*';

export const MY_HEALTH_ARTICLES: Article[] = [
  {
    ...EDITORIAL,
    id: 'art-my-dengue',
    category: 'Infectious Disease',
    title: 'Dengue in Malaysia: Know the Warning Signs',
    titleMs: 'Denggi di Malaysia: Kenali Tanda Amaran',
    excerpt: 'Dengue is a year-round risk in Malaysia. Learn the symptoms, the warning signs that mean you need hospital care, and how to reduce mosquito breeding at home.',
    excerptMs: 'Denggi merupakan risiko sepanjang tahun di Malaysia. Kenali gejala, tanda amaran yang memerlukan rawatan hospital, dan cara mengurangkan pembiakan nyamuk di rumah.',
    content: `Dengue is a viral infection spread by Aedes mosquitoes. It occurs throughout Malaysia, with cases reported every year and large outbreaks in some years.

### Typical symptoms
- Sudden high fever lasting about 2 to 7 days
- Headache, pain behind the eyes, muscle and joint pain
- Nausea, vomiting, or a rash

### Warning signs: go to hospital the same day
These often appear around the time the fever falls (days 3 to 7):
- Severe or continuous stomach pain
- Persistent vomiting
- Bleeding from the gums or nose, blood in vomit or stool, or very heavy periods
- Drowsiness, restlessness, or confusion
- Cold, clammy skin, rapid breathing, or very little urine

### While you seek advice
- Rest and drink plenty of fluids.
- Use paracetamol for fever as advised by a doctor or pharmacist. Do not take aspirin, ibuprofen or similar painkillers (NSAIDs), which can increase the risk of bleeding.
- See a doctor early for a blood test. Repeated checks may be needed.

### Preventing mosquito breeding
- Once a week, empty and scrub containers that hold water: flower pots, trays, buckets, tyres and blocked gutters.
- Cover water storage, use repellent, and wear long sleeves in the early morning and late afternoon.
- Use screens or nets, and keep your surroundings clean.

${DISCLAIMER_EN}`,
    contentMs: `Denggi ialah jangkitan virus yang disebarkan oleh nyamuk Aedes. Ia berlaku di seluruh Malaysia, dengan kes dilaporkan setiap tahun dan wabak besar pada tahun-tahun tertentu.

### Gejala biasa
- Demam panas secara tiba-tiba selama kira-kira 2 hingga 7 hari
- Sakit kepala, sakit di belakang mata, sakit otot dan sendi
- Loya, muntah, atau ruam

### Tanda amaran: pergi ke hospital pada hari yang sama
Tanda ini sering muncul ketika demam mula turun (hari ke-3 hingga ke-7):
- Sakit perut yang teruk atau berterusan
- Muntah berterusan
- Pendarahan gusi atau hidung, muntah atau najis berdarah, atau haid yang sangat banyak
- Mengantuk, resah, atau keliru
- Kulit sejuk dan lembap, bernafas laju, atau buang air kecil sangat sedikit

### Sementara mendapatkan nasihat
- Berehat dan minum banyak cecair.
- Gunakan parasetamol untuk demam seperti yang dinasihatkan oleh doktor atau ahli farmasi. Jangan ambil aspirin, ibuprofen atau ubat tahan sakit sejenis (NSAID) kerana boleh meningkatkan risiko pendarahan.
- Berjumpa doktor lebih awal untuk ujian darah. Pemeriksaan berulang mungkin diperlukan.

### Mencegah pembiakan nyamuk
- Seminggu sekali, kosongkan dan gosok bekas yang mengandungi air: pasu bunga, dulang, baldi, tayar dan longkang tersumbat.
- Tutup bekas simpanan air, gunakan ubat penghalau nyamuk, dan pakai baju lengan panjang pada awal pagi dan lewat petang.
- Gunakan jaring atau kelambu, dan pastikan persekitaran bersih.

${DISCLAIMER_MS}`,
    citations: [
      'Malaysia dengue prevention and control, DREF operational update (IFRC / UN OCHA ReliefWeb).',
      'Ministry of Health Malaysia weekly dengue statements, as reported by Malay Mail, 27 December 2024.',
    ],
    faq: [
      { question: 'Can I take ibuprofen for dengue fever?', answer: 'No. Aspirin and ibuprofen-type painkillers can increase bleeding risk. Paracetamol is generally used for fever; ask a doctor or pharmacist about the dose.' },
      { question: 'When is dengue most dangerous?', answer: 'Often when the fever falls, around days 3 to 7. Watch for the warning signs above and go to hospital the same day if any appear.' },
    ],
    localBurden: {
      facts: [
        { text: 'Malaysia recorded 123,133 dengue cases and 100 deaths in 2023, compared with 66,102 cases and 56 deaths in 2022.', textMs: 'Malaysia merekodkan 123,133 kes denggi dan 100 kematian pada 2023, berbanding 66,102 kes dan 56 kematian pada 2022.', source: 'IFRC / UN OCHA, Malaysia dengue DREF operational update', url: 'https://reliefweb.int/report/malaysia/malaysia-dengue-prevention-and-control-dref-operational-update-mdrmy010', asOf: '2023' },
        { text: 'By epidemiological week 51 of 2024 there were 121,082 cases and 116 deaths, against 120,418 cases and 96 deaths at the same point of 2023.', textMs: 'Menjelang minggu epidemiologi ke-51 2024 terdapat 121,082 kes dan 116 kematian, berbanding 120,418 kes dan 96 kematian pada tempoh yang sama 2023.', source: 'Malay Mail, citing the Director-General of Health', url: 'https://www.malaymail.com/amp/news/malaysia/2024/12/27/dengue-cases-rise-to-1407-in-me51-two-fatalities-reported-says-health-d-g/161302', asOf: 'Dec 2024' },
      ],
    },
  },
  {
    ...EDITORIAL,
    id: 'art-my-diabetes',
    category: 'Endocrinology',
    title: 'Diabetes in Malaysia: Get Tested Early',
    titleMs: 'Diabetes di Malaysia: Buat Ujian Lebih Awal',
    excerpt: 'About one in six Malaysian adults has diabetes, and many do not know it. Find out who should be tested, what the numbers mean, and what helps.',
    excerptMs: 'Kira-kira seorang daripada enam orang dewasa Malaysia menghidap diabetes, dan ramai yang tidak tahu. Ketahui siapa yang perlu diuji, maksud angka ujian, dan apa yang membantu.',
    content: `Diabetes is common among adults in Malaysia, and many people do not realise they have it. Over the years, high blood sugar damages the heart, kidneys, eyes and nerves.

### Symptoms
- Being very thirsty, passing urine often, feeling tired, blurred vision, wounds that heal slowly
- Many people have no symptoms at all, which is why testing matters.

### Who should be tested
Ask your doctor about testing, especially if you are overweight, have a parent or sibling with diabetes, have high blood pressure or cholesterol, or had diabetes in pregnancy. Some guidelines advise regular testing from around age 30; your doctor will advise you.

### How diabetes is diagnosed
By a blood test. In general, a fasting plasma glucose of 7.0 mmol/L or more, or an HbA1c of 6.5% or more, points to diabetes, and a doctor confirms the result.

### What helps
- Eat well: fewer sugary drinks, smaller portions of rice and noodles, more vegetables.
- Move: aim for at least 150 minutes of moderate activity a week.
- Keep to a healthy weight and do not smoke.
- Take medicines as prescribed and check your feet daily.
- Have regular eye and kidney checks.

### When it is an emergency
Confusion, vomiting, fruity-smelling breath or fast breathing with very high sugar needs emergency care. If you use diabetes medicines and feel shaky, sweaty or confused, your sugar may be low: take sugar straight away and get help.

${DISCLAIMER_EN}`,
    contentMs: `Diabetes sangat biasa dalam kalangan orang dewasa di Malaysia, dan ramai yang tidak menyedari mereka menghidapnya. Bertahun-tahun, gula darah yang tinggi merosakkan jantung, buah pinggang, mata dan saraf.

### Gejala
- Terlalu dahaga, kerap kencing, rasa letih, penglihatan kabur, luka lambat sembuh
- Ramai orang tidak mempunyai sebarang gejala, itulah sebabnya ujian penting.

### Siapa yang perlu diuji
Tanya doktor anda tentang ujian, terutamanya jika anda berlebihan berat badan, mempunyai ibu bapa atau adik-beradik yang menghidap diabetes, mempunyai tekanan darah atau kolesterol tinggi, atau pernah mengalami diabetes semasa mengandung. Sesetengah garis panduan menasihatkan ujian berkala bermula sekitar umur 30 tahun; doktor anda akan menasihati anda.

### Bagaimana diabetes didiagnosis
Melalui ujian darah. Secara amnya, glukosa plasma berpuasa 7.0 mmol/L atau lebih, atau HbA1c 6.5% atau lebih, menunjukkan diabetes, dan doktor akan mengesahkan keputusan itu.

### Apa yang membantu
- Makan sihat: kurangkan minuman bergula, kecilkan hidangan nasi dan mi, tambah sayur-sayuran.
- Bergerak: sasarkan sekurang-kurangnya 150 minit aktiviti sederhana seminggu.
- Kekalkan berat badan yang sihat dan jangan merokok.
- Ambil ubat seperti yang ditetapkan dan periksa kaki anda setiap hari.
- Buat pemeriksaan mata dan buah pinggang secara berkala.

### Bila ia satu kecemasan
Kekeliruan, muntah, nafas berbau buah atau bernafas laju dengan gula yang sangat tinggi memerlukan rawatan kecemasan. Jika anda mengambil ubat diabetes dan berasa menggeletar, berpeluh atau keliru, gula anda mungkin rendah: ambil gula dengan segera dan dapatkan bantuan.

${DISCLAIMER_MS}`,
    citations: [
      'Institute for Public Health, Ministry of Health Malaysia. National Health and Morbidity Survey (NHMS) 2023: fact sheet.',
      'CodeBlue, "Over Two Million Adults In Malaysia Live With Three NCDs: NHMS 2023", May 2024.',
    ],
    faq: [
      { question: 'Do I need to fast for a diabetes test?', answer: 'Some tests need fasting and some do not (for example HbA1c). Ask the clinic when you book.' },
      { question: 'Can diabetes be present without symptoms?', answer: 'Yes. Many people find out only from a blood test, which is why screening matters.' },
    ],
    localBurden: {
      facts: [
        { text: 'The NHMS 2023 found diabetes in 15.6% of Malaysian adults: 9.7% were already known to have it and 5.9% had raised blood glucose without knowing.', textMs: 'NHMS 2023 mendapati diabetes pada 15.6% orang dewasa Malaysia: 9.7% sudah diketahui menghidapnya dan 5.9% mempunyai glukosa darah tinggi tanpa mengetahuinya.', source: 'Institute for Public Health, NHMS 2023 fact sheet', url: 'https://iku.moh.gov.my/images/nhms2023/fact-sheet-nhms-2023.pdf', asOf: '2023 survey' },
      ],
    },
  },
  {
    ...EDITORIAL,
    id: 'art-my-hypertension',
    category: 'Cardiology',
    title: 'High Blood Pressure in Malaysia: The Silent Risk',
    titleMs: 'Tekanan Darah Tinggi di Malaysia: Risiko Senyap',
    excerpt: 'Almost three in ten Malaysian adults have high blood pressure, and many do not know. Learn how to check it and what you can do.',
    excerptMs: 'Hampir tiga daripada sepuluh orang dewasa Malaysia mempunyai tekanan darah tinggi, dan ramai yang tidak menyedarinya. Ketahui cara menyemaknya dan apa yang boleh dilakukan.',
    content: `High blood pressure usually causes no symptoms, but it raises the risk of stroke, heart attack and kidney disease.

### Check your blood pressure
Have it checked at least once a year at a clinic or pharmacy. In a clinic, a reading of 140/90 mmHg or higher on repeated checks is generally considered high; your doctor makes the diagnosis.

### What helps
- Cut down on salt. Soy sauce, instant noodles, preserved foods and processed foods contain a lot of it.
- Eat more vegetables and fruit.
- Stay active, keep to a healthy weight, limit alcohol and do not smoke.
- If you are given medicine, take it every day and do not stop without your doctor's advice.

### When it is an emergency
Call 999 if high blood pressure comes with chest pain, a severe headache, weakness on one side of the body, a drooping face or difficulty speaking.

${DISCLAIMER_EN}`,
    contentMs: `Tekanan darah tinggi biasanya tidak menunjukkan gejala, tetapi ia meningkatkan risiko strok, serangan jantung dan penyakit buah pinggang.

### Semak tekanan darah anda
Periksa sekurang-kurangnya sekali setahun di klinik atau farmasi. Di klinik, bacaan 140/90 mmHg atau lebih pada beberapa kali pemeriksaan secara amnya dianggap tinggi; doktor anda yang membuat diagnosis.

### Apa yang membantu
- Kurangkan garam. Kicap, mi segera, makanan awet dan makanan diproses mengandungi banyak garam.
- Makan lebih banyak sayur dan buah.
- Kekal aktif, kekalkan berat badan yang sihat, hadkan alkohol dan jangan merokok.
- Jika diberi ubat, ambil setiap hari dan jangan berhenti tanpa nasihat doktor anda.

### Bila ia satu kecemasan
Hubungi 999 jika tekanan darah tinggi disertai sakit dada, sakit kepala yang teruk, lemah pada satu sebelah badan, muka senget atau sukar bercakap.

${DISCLAIMER_MS}`,
    citations: [
      'Institute for Public Health, Ministry of Health Malaysia. National Health and Morbidity Survey (NHMS) 2023: fact sheet.',
      'CodeBlue, "Over Two Million Adults In Malaysia Live With Three NCDs: NHMS 2023", May 2024.',
    ],
    faq: [
      { question: 'Can I feel high blood pressure?', answer: 'Usually not. That is why regular checks matter, even when you feel well.' },
      { question: 'Is a reading taken at home the same as in the clinic?', answer: 'Home readings are often a little lower. Show your doctor your home readings and ask which targets apply to you.' },
    ],
    localBurden: {
      facts: [
        { text: 'The NHMS 2023 found high blood pressure in 29.2% of Malaysian adults: 17.3% were already known to have it and 11.9% had raised blood pressure without knowing.', textMs: 'NHMS 2023 mendapati tekanan darah tinggi pada 29.2% orang dewasa Malaysia: 17.3% sudah diketahui menghidapnya dan 11.9% mempunyai tekanan darah tinggi tanpa mengetahuinya.', source: 'Institute for Public Health, NHMS 2023 fact sheet', url: 'https://iku.moh.gov.my/images/nhms2023/fact-sheet-nhms-2023.pdf', asOf: '2023 survey' },
      ],
    },
  },
];
