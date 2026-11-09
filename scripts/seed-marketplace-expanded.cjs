const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'careverified.db');

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

const iso = () => new Date().toISOString();

// ---------------------------------------------------------------------
// 1. Seed Clinics (5) and Additional Hospitals (4) in tourism_facilities
// ---------------------------------------------------------------------
const facilities = [
  // 5 Clinics
  {
    id: "fac-clinic-1",
    name: "Poliklinik & Surgeri Bangsar Utama",
    kind: "clinic",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    address: "42 Jalan Telawi 5, Bangsar Baru, 59100 Kuala Lumpur",
    description: "Comprehensive community family medicine, minor surgery, chronic disease management, and preventive wellness clinic.",
    phone: "+60-3-2284-9102",
    email: "enquiry@poliklinikbangsar.my",
    website: "https://poliklinikbangsar.my",
    accepts_international: 1,
    mhtc_member: 0,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Digital ECG", "Point-of-Care HbA1c & Lipid Analyser", "Minor Surgery Suite", "Digital Spirometry", "Autoclave Sterilisation Unit"]),
    amenities: JSON.stringify(["Air-conditioned Waiting Lounge", "On-site Pharmacy Dispensary", "Treatment & Dressing Bay", "Disabled Wheelchair Ramp", "Free Wi-Fi"]),
    cover_image: "/assets/clean_light_doctor_suite_full.jpg",
    languages: JSON.stringify(["English", "Malay", "Cantonese"]),
    specialties: JSON.stringify(["Family Medicine", "Minor Surgery", "Diabetes & Hypertension Management", "Travel Medicine & Vaccinations", "Occupational Health"]),
    services: JSON.stringify({ emergency24h: false, minorSurgery: true, laboratory: true, pharmacy: true, vaccinations: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-C-2024-012", validUntil: "2028-12-31", reference: "KKM/MSQH/CLINIC-012", checkedAt: "2025-02-01T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/C/0812/2012",
    licence_expiry: "2029-12-31",
    licence_checked_at: "2025-02-01T08:00:00.000Z",
    licence_reference: "KKM/586/PBU-0812",
    active: 1
  },
  {
    id: "fac-clinic-2",
    name: "Klinik Pakar Kanak-Kanak Sunway",
    kind: "clinic",
    city: "Petaling Jaya",
    state: "Selangor",
    address: "15 Jalan PJS 11/28, Bandar Sunway, 47500 Petaling Jaya, Selangor",
    description: "Specialist paediatric and child development clinic dedicated to infant wellness, allergy assessments, and developmental tracking.",
    phone: "+60-3-5638-3344",
    email: "care@sunwaypaediatrics.my",
    website: "https://sunwaypaediatrics.my",
    accepts_international: 1,
    mhtc_member: 0,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Paediatric Nebuliser Station", "Skin Prick Allergy Test Kit", "Pulse Oximeter & Vital Signs Monitor", "Digital Growth Milestone Station", "Cold-chain Vaccine Fridge"]),
    amenities: JSON.stringify(["Child-Friendly Play Area", "Private Breastfeeding Nursing Room", "Stroller Parking", "Separate Sick Child Isolation Bay"]),
    cover_image: "/assets/clinics_hospital_hero_bg.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Hokkien"]),
    specialties: JSON.stringify(["General Paediatrics", "Neonatal Growth Tracking", "Childhood Immunisations", "Paediatric Asthma & Allergy", "Nutritional Counselling"]),
    services: JSON.stringify({ emergency24h: false, pediatrics: true, allergyTesting: true, vaccinations: true, lactationSupport: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-C-2023-045", validUntil: "2028-06-30", reference: "KKM/MSQH/CLINIC-045", checkedAt: "2025-01-15T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/C/0944/2015",
    licence_expiry: "2028-12-31",
    licence_checked_at: "2025-01-15T08:00:00.000Z",
    licence_reference: "KKM/586/SPK-0944",
    active: 1
  },
  {
    id: "fac-clinic-3",
    name: "Klinik Wanita & Kesuburan Damansara",
    kind: "clinic",
    city: "Petaling Jaya",
    state: "Selangor",
    address: "28 Jalan SS 21/39, Damansara Utama, 47400 Petaling Jaya, Selangor",
    description: "Boutique women's health, obstetrics, gynaecological screening, and reproductive fertility evaluation centre.",
    phone: "+60-3-7729-1122",
    email: "contact@damansarawomen.my",
    website: "https://damansarawomen.my",
    accepts_international: 1,
    mhtc_member: 0,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Voluson High-Definition 3D/4D Pelvic Ultrasound", "Digital Colposcopy System", "ThinPrep Pap Smear & HPV Molecular Testing", "Follicular Tracking Unit"]),
    amenities: JSON.stringify(["Private Consultation Suites", "Executive Ultrasound Screening Lounge", "Couples Fertility Counselling Room", "Refreshment Bar"]),
    cover_image: "/assets/landing_hero_treatment_nursing_pharmacy_1.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Cantonese"]),
    specialties: JSON.stringify(["Obstetrics & Gynaecology", "Well-Woman Health Screening", "Fertility Workup & IUI Consultation", "Cervical Cancer Prevention", "Menopause Management"]),
    services: JSON.stringify({ emergency24h: false, ultrasound4d: true, womensHealth: true, fertilityScreening: true, papSmear: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-C-2024-078", validUntil: "2029-03-31", reference: "KKM/MSQH/CLINIC-078", checkedAt: "2025-03-10T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/C/1122/2018",
    licence_expiry: "2029-06-30",
    licence_checked_at: "2025-03-10T08:00:00.000Z",
    licence_reference: "KKM/586/DWF-1122",
    active: 1
  },
  {
    id: "fac-clinic-4",
    name: "Klinik Ortopedik & Fisioterapi Georgetown",
    kind: "clinic",
    city: "George Town",
    state: "Penang",
    address: "88 Jalan Burma, 10050 George Town, Penang",
    description: "Specialised musculoskeletal injury, joint preservation, sports medicine rehabilitation, and physiotherapy clinic.",
    phone: "+60-4-226-5588",
    email: "info@georgetownortho.my",
    website: "https://georgetownortho.my",
    accepts_international: 1,
    mhtc_member: 0,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Musculoskeletal High-Frequency Diagnostic Ultrasound", "Platelet-Rich Plasma (PRP) Centrifuge System", "Shockwave Therapy Unit", "Digital Low-Dose Joint X-Ray"]),
    amenities: JSON.stringify(["Physiotherapy Rehabilitation Gym", "Hydrocollator & Cryotherapy Bay", "Gait Analysis Walkway", "Private Procedure Rooms"]),
    cover_image: "/assets/landing_hero_treatment_nursing_pharmacy_2.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Hokkien"]),
    specialties: JSON.stringify(["Orthopaedic Consultation", "Joint Ultrasound & Guided Injections", "Sports Injury Recovery", "Knee Osteoarthritis Non-Surgical Care", "Clinical Physiotherapy"]),
    services: JSON.stringify({ emergency24h: false, orthopaedics: true, physiotherapy: true, prpTherapy: true, xray: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-C-2023-092", validUntil: "2028-11-30", reference: "KKM/MSQH/CLINIC-092", checkedAt: "2025-01-20T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/C/1588/2019",
    licence_expiry: "2029-08-31",
    licence_checked_at: "2025-01-20T08:00:00.000Z",
    licence_reference: "KKM/586/GTO-1588",
    active: 1
  },
  {
    id: "fac-clinic-5",
    name: "Klinik Dermatologi & Estetika Medini",
    kind: "clinic",
    city: "Johor Bahru",
    state: "Johor",
    address: "B-02-01 Medini 7, Lebuh Medini Utara, 79200 Iskandar Puteri, Johor",
    description: "Comprehensive clinical dermatology, skin cancer screening, chronic dermatoses therapy, and medical laser centre.",
    phone: "+60-7-509-8822",
    email: "care@mediniderm.my",
    website: "https://mediniderm.my",
    accepts_international: 1,
    mhtc_member: 0,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Fotofinder Digital Dermoscopy & Mole Mapping", "Liquid Nitrogen Cryosurgical Unit", "Narrowband UVB Phototherapy Unit", "Fractional Laser System"]),
    amenities: JSON.stringify(["Sterile Procedure Suite", "UVB Phototherapy Cabin", "VIP Recovery Lounge", "Dedicated Derm-Pharmacy"]),
    cover_image: "/assets/practitioners_hero_bg.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin"]),
    specialties: JSON.stringify(["Clinical Dermatology", "Eczema & Psoriasis Management", "Mole Mapping & Skin Cancer Check", "Hair & Scalp Disorders", "Medical Laser Treatment"]),
    services: JSON.stringify({ emergency24h: false, dermatology: true, moleMapping: true, phototherapy: true, laser: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-C-2024-105", validUntil: "2029-05-31", reference: "KKM/MSQH/CLINIC-105", checkedAt: "2025-02-15T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/C/2042/2021",
    licence_expiry: "2029-11-30",
    licence_checked_at: "2025-02-15T08:00:00.000Z",
    licence_reference: "KKM/586/KDM-2042",
    active: 1
  },

  // 4 Additional Hospitals (in addition to Pantai Medical Centre Bangsar)
  {
    id: "fac-hosp-2",
    name: "Gleneagles Hospital Kuala Lumpur",
    kind: "hospital",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    address: "286 & 288 Jalan Ampang, 50450 Kuala Lumpur",
    description: "Premier multidisciplinary quaternary hospital with JCI & MSQH accreditation. Flagship international medical hub with 370 beds.",
    phone: "+60-3-4141-3000",
    email: "international@gleneagleskl.com.my",
    website: "https://gleneagles.com.my/kuala-lumpur",
    accepts_international: 1,
    mhtc_member: 1,
    verified_facilitator: 1,
    equipment: JSON.stringify(["PET-CT Molecular Imaging Scanner", "Da Vinci Xi Robotic Surgery System", "Elekta Synergy Linear Accelerator (Radiotherapy)", "3T MRI Magnetom Vida", "Biplane Cardiac Cath Lab"]),
    amenities: JSON.stringify(["24/7 International Patient Centre", "MHTC Gold Lounge with Airport Fast-Track", "Presidential & Single Inpatient Suites", "Halal-Certified In-Room Dining", "Dedicated Prayer Rooms (Surau)"]),
    cover_image: "/assets/clinics_hospital_hero_bg.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Arabic", "Japanese", "Indonesian"]),
    specialties: JSON.stringify(["Oncology", "Cardiology", "Neurology & Neurosurgery", "Robotic Urological Surgery", "Orthopaedics & Joint Replacement"]),
    services: JSON.stringify({ emergency24h: true, icu: true, roboticSurgery: true, oncology: true, petct: true, mhtcLounge: true }),
    accreditations: JSON.stringify([
      { body: "JCI", number: "JCI-H-2023-419", validUntil: "2028-10-31", reference: "JCI/GLN-0419", checkedAt: "2025-01-05T08:00:00.000Z", checkedBy: "usr-demo-admin" },
      { body: "MSQH", number: "MSQH-H-2024-031", validUntil: "2029-08-31", reference: "KKM/MSQH/GLN-031", checkedAt: "2025-01-05T08:00:00.000Z", checkedBy: "usr-demo-admin" }
    ]),
    licence_no: "KKM-BPP/B/0018/1996",
    licence_expiry: "2029-12-31",
    licence_checked_at: "2025-01-05T08:00:00.000Z",
    licence_reference: "KKM/586/GHKL-0018",
    active: 1
  },
  {
    id: "fac-hosp-3",
    name: "Subang Jaya Medical Centre (SJMC)",
    kind: "hospital",
    city: "Subang Jaya",
    state: "Selangor",
    address: "1 Jalan SS 12/1A, 47500 Subang Jaya, Selangor",
    description: "Award-winning tertiary & quaternary medical centre renowned for complex oncology, bone marrow transplants, and cardiac interventions.",
    phone: "+60-3-5639-1212",
    email: "healthcare@sjmc.com.my",
    website: "https://subangjayamedicalcentre.com",
    accepts_international: 1,
    mhtc_member: 1,
    verified_facilitator: 1,
    equipment: JSON.stringify(["TrueBeam Radiotherapy & Radiosurgery", "Bone Marrow Transplant Clean Room Unit", "Hybrid Cardiac Operating Suite", "Digital Spectral CT Scanner", "Automated Molecular Pathology Lab"]),
    amenities: JSON.stringify(["Comprehensive Cancer Daycare Centre", "International Patient Care Coordination Desk", "Executive Health Screening Centre", "Multilingual Concierge Service"]),
    cover_image: "/assets/landing_hero_treatment_nursing_pharmacy.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Cantonese", "Tamil"]),
    specialties: JSON.stringify(["Haematology & Bone Marrow Transplant", "Interventional Cardiology", "Surgical Oncology", "Orthopaedic Spine Surgery", "Paediatric Intensive Care"]),
    services: JSON.stringify({ emergency24h: true, icu: true, boneMarrowTransplant: true, radiotherapy: true, cardiacCath: true }),
    accreditations: JSON.stringify([
      { body: "JCI", number: "JCI-H-2024-118", validUntil: "2029-04-30", reference: "JCI/SJMC-0118", checkedAt: "2025-02-10T08:00:00.000Z", checkedBy: "usr-demo-admin" },
      { body: "MSQH", number: "MSQH-H-2023-088", validUntil: "2028-12-31", reference: "KKM/MSQH/SJMC-088", checkedAt: "2025-02-10T08:00:00.000Z", checkedBy: "usr-demo-admin" }
    ]),
    licence_no: "KKM-BPP/B/0025/1985",
    licence_expiry: "2029-12-31",
    licence_checked_at: "2025-02-10T08:00:00.000Z",
    licence_reference: "KKM/586/SJMC-0025",
    active: 1
  },
  {
    id: "fac-hosp-4",
    name: "Island Hospital Penang",
    kind: "hospital",
    city: "George Town",
    state: "Penang",
    address: "308 Macalister Road, 10450 George Town, Penang",
    description: "Leading medical tourism hospital in northern Malaysia with 600 beds, advanced endoscopy suite, and regional spine & joint excellence.",
    phone: "+60-4-238-3388",
    email: "info@islandhospital.com",
    website: "https://islandhospital.com",
    accepts_international: 1,
    mhtc_member: 1,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Olympus EVIS X1 AI-Assisted GI Endoscopy Suite", "Siemens Somatom Force Dual Source CT", "Artis zee Biplane Angiography", "3D Intraoperative Spine Navigation System"]),
    amenities: JSON.stringify(["Penang Airport Meet-and-Greet Desk", "International Travelers VIP Lounge", "Halal & Dietary Kitchen Service", "Direct Ferry / Airport Transfer Service"]),
    cover_image: "/assets/landing_hero_treatment_nursing_pharmacy_2.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Hokkien", "Indonesian"]),
    specialties: JSON.stringify(["Gastroenterology & Hepatology", "Orthopaedic Spine Surgery", "Cardiology", "Urology", "Advanced Health Screening"]),
    services: JSON.stringify({ emergency24h: true, endoscopyAi: true, spineSurgery: true, airportPickup: true, mhtcLounge: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-H-2024-055", validUntil: "2029-06-30", reference: "KKM/MSQH/IHP-055", checkedAt: "2025-01-25T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/B/0073/1996",
    licence_expiry: "2029-12-31",
    licence_checked_at: "2025-01-25T08:00:00.000Z",
    licence_reference: "KKM/586/IHP-0073",
    active: 1
  },
  {
    id: "fac-hosp-5",
    name: "KPJ Johor Specialist Hospital",
    kind: "hospital",
    city: "Johor Bahru",
    state: "Johor",
    address: "39B Jalan Abdul Samad, 80100 Johor Bahru, Johor",
    description: "Southern gateway tertiary care facility with 280 beds, state-of-the-art heart & vascular catheterisation laboratory, and NICU.",
    phone: "+60-7-225-3000",
    email: "jsh@kpjhealth.com.my",
    website: "https://kpjhealth.com.my/johor",
    accepts_international: 1,
    mhtc_member: 1,
    verified_facilitator: 1,
    equipment: JSON.stringify(["Philips Azurion 7 Cardiac Cath Lab", "1.5T MRI Scanner", "128-Slice Multi-Detector CT", "Neonatal Intensive Care Ventilators"]),
    amenities: JSON.stringify(["24-Hour Emergency Medical Centre", "Singapore Cross-Border Medical Concierge Desk", "Single Luxury Maternity Inpatient Suites", "Dedicated Inpatient Pharmacy"]),
    cover_image: "/assets/medical_hero_bg.jpg",
    languages: JSON.stringify(["English", "Malay", "Mandarin", "Tamil"]),
    specialties: JSON.stringify(["Interventional Cardiology", "Maternity & High-Risk Obstetrics", "Neonatal & Paediatric Medicine", "Bariatric & Metabolic Surgery", "General Surgery"]),
    services: JSON.stringify({ emergency24h: true, icu: true, nicu: true, cardiacCath: true, maternitySuite: true }),
    accreditations: JSON.stringify([{ body: "MSQH", number: "MSQH-H-2023-014", validUntil: "2028-09-30", reference: "KKM/MSQH/KPJ-014", checkedAt: "2025-01-18T08:00:00.000Z", checkedBy: "usr-demo-admin" }]),
    licence_no: "KKM-BPP/B/0056/1990",
    licence_expiry: "2029-12-31",
    licence_checked_at: "2025-01-18T08:00:00.000Z",
    licence_reference: "KKM/586/KPJJ-0056",
    active: 1
  }
];

const insFac = db.prepare(`
  INSERT INTO tourism_facilities (
    id, name, kind, city, state, address, description, phone, email, website,
    accepts_international, mhtc_member, verified_facilitator, equipment, amenities,
    cover_image, languages, specialties, services, accreditations, licence_no,
    licence_expiry, licence_checked_at, licence_reference, active, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, kind=excluded.kind, city=excluded.city, state=excluded.state, address=excluded.address,
    description=excluded.description, phone=excluded.phone, email=excluded.email, website=excluded.website,
    equipment=excluded.equipment, amenities=excluded.amenities, cover_image=excluded.cover_image,
    specialties=excluded.specialties, services=excluded.services, accreditations=excluded.accreditations
`);

for (const f of facilities) {
  insFac.run(
    f.id, f.name, f.kind, f.city, f.state, f.address, f.description, f.phone, f.email, f.website,
    f.accepts_international, f.mhtc_member, f.verified_facilitator, f.equipment, f.amenities,
    f.cover_image, f.languages, f.specialties, f.services, f.accreditations, f.licence_no,
    f.licence_expiry, f.licence_checked_at, f.licence_reference, f.active, iso()
  );
}

console.log(`Seeded ${facilities.length} clinics and hospitals in tourism_facilities.`);

// ---------------------------------------------------------------------
// 2. Seed Medical Packages for Clinics and Hospitals
// ---------------------------------------------------------------------
const additionalPackages = [
  // Clinic Packages
  {
    id: "pkg-diab-10",
    facility_id: "fac-clinic-1",
    code: "PKG-DIAB-10",
    title: "Comprehensive Diabetic & Metabolic Wellness Assessment Plan",
    category: "Family Medicine",
    description: "Doctor-led metabolic screening targeting HbA1c control, kidney microalbuminuria, diabetic retinopathy screening, and lifestyle nutrition roadmap.",
    duration: "Outpatient (2 hours)",
    price_sen: 28000,
    original_price_sen: 35000,
    target_audience: "all",
    fasting_required: 1,
    inclusions: JSON.stringify([
      "Point-of-Care Fasting Blood Glucose & HbA1c",
      "Full Renal Profile & Urine Microalbumin/Creatinine Ratio",
      "Fasting Lipid & Cardiovascular Risk Stratification",
      "Diabetic Foot Neuropathy Examination & Monofilament Test",
      "Consultant Family Physician Review & Tailored Care Roadmap"
    ]),
    exclusions: "Advanced cardiac imaging charged separately if clinically indicated.",
    preparation_instructions: "Overnight fasting (8-10 hours) required. Water permitted.",
    image_url: "/assets/packages/pkg-exec-screening.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-paed-11",
    facility_id: "fac-clinic-2",
    code: "PKG-PAED-11",
    title: "Comprehensive Childhood Growth Milestone & Immunisation Plan",
    category: "Paediatrics",
    description: "Dedicated paediatrician developmental tracking, mandatory & optional vaccine coverage, hearing & vision milestone check.",
    duration: "Outpatient (1.5 hours)",
    price_sen: 35000,
    original_price_sen: 42000,
    target_audience: "local",
    fasting_required: 0,
    inclusions: JSON.stringify([
      "Paediatrician Comprehensive Growth & Developmental Examination",
      "Childhood Core Vaccine Doses + Influenza / Pneumococcal Option",
      "Vision & Otoacoustic Hearing Health Screening",
      "Nutritional & Allergy Sensitivity Assessment",
      "Child Health Record Booklet Endorsement"
    ]),
    exclusions: "Specialist genetic workups or inpatient admissions.",
    preparation_instructions: "Bring child health immunization booklet (Buku Kanak-Kanak).",
    image_url: "/assets/packages/pkg-maternity.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-woman-12",
    facility_id: "fac-clinic-3",
    code: "PKG-WOMAN-12",
    title: "Well-Woman Gynecological Screening & 3D Pelvic Ultrasound Check",
    category: "Women's Health",
    description: "Boutique preventive check-up including high-resolution 3D pelvic ultrasound, ThinPrep pap smear, HPV molecular screening, and breast examination.",
    duration: "Outpatient (2 hours)",
    price_sen: 42000,
    original_price_sen: 55000,
    target_audience: "all",
    fasting_required: 0,
    inclusions: JSON.stringify([
      "Consultant Gynaecologist Consultation & Pelvic Examination",
      "High-Resolution 3D Transabdominal & Pelvic Ultrasound",
      "ThinPrep Liquid-Based Cervical Pap Smear",
      "High-Risk HPV DNA Molecular Typing",
      "Clinical Breast Examination & Report"
    ]),
    exclusions: "Invasive colposcopy biopsy if abnormal findings arise.",
    preparation_instructions: "Avoid scheduling during active menstrual flow.",
    image_url: "/assets/promotions/promo-pink-october.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-joint-13",
    facility_id: "fac-clinic-4",
    code: "PKG-JOINT-13",
    title: "Knee Osteoarthritis Non-Surgical Care & Ultrasound-Guided PRP Plan",
    category: "Orthopaedics",
    description: "Autologous Platelet-Rich Plasma (PRP) joint preservation therapy combined with musculoskeletal ultrasound guidance and rehabilitation physiotherapy.",
    duration: "Outpatient (1.5 hours)",
    price_sen: 85000,
    original_price_sen: 110000,
    target_audience: "all",
    fasting_required: 0,
    inclusions: JSON.stringify([
      "Orthopaedic Musculoskeletal Joint Evaluation",
      "High-Frequency Diagnostic Ultrasound of Knee Joint",
      "Autologous Platelet-Rich Plasma (PRP) Harvest & Sterile Preparation",
      "Ultrasound-Guided Knee Intra-Articular PRP Injection",
      "Targeted Joint Mobilisation & Physical Therapy Session"
    ]),
    exclusions: "Bilateral knees require second kit at discounted fee.",
    preparation_instructions: "Avoid anti-inflammatory NSAIDs (ibuprofen/aspirin) for 5 days prior.",
    image_url: "/assets/packages/pkg-orthopaedic.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-derm-14",
    facility_id: "fac-clinic-5",
    code: "PKG-DERM-14",
    title: "Full-Body Digital Mole Mapping & Medical Dermatology Screening",
    category: "Dermatology",
    description: "High-resolution digital epiluminescence dermoscopy for early melanoma detection, atypical naevi documentation, and chronic eczema consultation.",
    duration: "Outpatient (1.5 hours)",
    price_sen: 48000,
    original_price_sen: 60000,
    target_audience: "all",
    fasting_required: 0,
    inclusions: JSON.stringify([
      "Consultant Dermatologist Full-Body Skin Examination",
      "FotoFinder Digital Dermoscopic Automated Mole Mapping",
      "Microscopic Analysis of Suspected Dysplastic Lesions",
      "Skin Barrier & Eczema/Psoriasis Medical Assessment",
      "Digital Skin Mole Passport & Follow-Up Comparison Record"
    ]),
    exclusions: "Surgical biopsy or cryotherapy performed separately.",
    preparation_instructions: "Please remove nail polish and avoid heavy makeup.",
    image_url: "/assets/packages/pkg-fertility.jpg",
    status: "published",
    featured: 1
  },

  // Hospital Packages
  {
    id: "pkg-petct-06",
    facility_id: "fac-hosp-2",
    code: "PKG-PETCT-06",
    title: "Full-Body PET-CT Molecular Cancer Screening & Oncologist Review",
    category: "Oncology",
    description: "State-of-the-art 18F-FDG PET-CT molecular nuclear scan providing sub-centimetre tumour detection, staging, and consultant oncologist consultation.",
    duration: "1 Day Outpatient (4-5 hours)",
    price_sen: 380000,
    original_price_sen: 450000,
    target_audience: "all",
    fasting_required: 1,
    inclusions: JSON.stringify([
      "Whole-Body 18F-FDG Positron Emission Tomography (PET-CT)",
      "High-Resolution Diagnostic Multislice CT Contrast Imaging",
      "Pre-Procedure Blood Glucose & Renal Function Screening",
      "Nuclear Medicine Specialist Diagnostic Report",
      "Senior Consultant Oncologist Treatment Review & Staging"
    ]),
    exclusions: "Therapeutic radiopharmaceutical infusions.",
    preparation_instructions: "Strict 6-hour fasting. Avoid strenuous physical exercise for 24 hours prior.",
    image_url: "/assets/packages/pkg-cardiac.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-bmt-07",
    facility_id: "fac-hosp-3",
    code: "PKG-BMT-07",
    title: "Comprehensive Haematology & Bone Marrow Diagnostic Workup",
    category: "Haematology",
    description: "Specialist haematology evaluation for unexplained cytopenias, leukaemia staging, and bone marrow biopsy with flow cytometry.",
    duration: "Day Care Outpatient",
    price_sen: 240000,
    original_price_sen: 280000,
    target_audience: "all",
    fasting_required: 0,
    inclusions: JSON.stringify([
      "Consultant Haematologist Comprehensive Clinical Workup",
      "Bone Marrow Aspiration & Trephine Biopsy under Local Anaesthesia",
      "Flow Cytometry Immunophenotyping & Cytogenetics Panel",
      "Full Peripheral Blood Film Analysis & Molecular Profiling",
      "Dedicated Daycare Recovery Bed & Nursing Attendance"
    ]),
    exclusions: "Inpatient chemotherapy or stem cell mobilization.",
    preparation_instructions: "Bring all previous blood test records and bone scans.",
    image_url: "/assets/packages/pkg-exec-screening.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-endo-08",
    facility_id: "fac-hosp-4",
    code: "PKG-ENDO-08",
    title: "Dual Video Gastroscopy & High-Definition Colonoscopy Screening",
    category: "Gastroenterology",
    description: "AI-assisted Olympus high-definition dual upper and lower GI tract endoscopy under gentle intravenous monitored conscious sedation.",
    duration: "Day Care Outpatient (3-4 hours)",
    price_sen: 215000,
    original_price_sen: 260000,
    target_audience: "all",
    fasting_required: 1,
    inclusions: JSON.stringify([
      "Consultant Gastroenterologist Upper GI Gastroscopy",
      "High-Definition Lower GI Colonoscopy with AI Polyp Detection",
      "Monitored Anaesthetic Care (MAC) Conscious Sedation",
      "Private Day Care Recovery Ward (4 Hours)",
      "Histopathology Biopsy of Up to 2 Polyps Included"
    ]),
    exclusions: "Complex endoscopic mucosal resection (EMR) for giant polyps.",
    preparation_instructions: "Oral bowel preparation protocol starting 24 hours prior. Low-fibre diet 3 days before.",
    image_url: "/assets/packages/pkg-orthopaedic.jpg",
    status: "published",
    featured: 1
  },
  {
    id: "pkg-bariatric-09",
    facility_id: "fac-hosp-5",
    code: "PKG-BARIATRIC-09",
    title: "Advanced Metabolic Bariatric Assessment & Laparoscopic Pathway",
    category: "Bariatric Surgery",
    description: "All-inclusive minimally invasive laparoscopic sleeve gastrectomy package with multidisciplinary bariatric surgeon, endocrinologist, and clinical dietitian care.",
    duration: "3 Days 2 Nights Inpatient",
    price_sen: 1980000,
    original_price_sen: 2350000,
    target_audience: "all",
    fasting_required: 1,
    inclusions: JSON.stringify([
      "Consultant Bariatric Surgeon & Anaesthetist Attendance",
      "Laparoscopic Sleeve Gastrectomy Surgical Procedure",
      "Operating Theatre, Laparoscopic Consumables & Stapler Cartridges",
      "Private Single Inpatient Room (2 Nights)",
      "Pre & Post-Operative Clinical Dietitian Consultations",
      "Post-Op Abdominal Support Binder & Discharge Medications"
    ]),
    exclusions: "ICU management beyond standard post-surgical ward stay.",
    preparation_instructions: "2-week pre-operative liver reduction liquid diet under dietitian supervision.",
    image_url: "/assets/packages/pkg-maternity.jpg",
    status: "published",
    featured: 1
  }
];

const insPkg = db.prepare(`
  INSERT INTO medical_packages (
    id, facility_id, code, title, category, description, duration, price_sen,
    original_price_sen, target_audience, fasting_required, inclusions, exclusions,
    preparation_instructions, image_url, status, featured, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, category=excluded.category, description=excluded.description,
    duration=excluded.duration, price_sen=excluded.price_sen, original_price_sen=excluded.original_price_sen,
    inclusions=excluded.inclusions, preparation_instructions=excluded.preparation_instructions,
    image_url=excluded.image_url, featured=excluded.featured
`);

for (const p of additionalPackages) {
  insPkg.run(
    p.id, p.facility_id, p.code, p.title, p.category, p.description, p.duration, p.price_sen,
    p.original_price_sen, p.target_audience, p.fasting_required, p.inclusions, p.exclusions,
    p.preparation_instructions, p.image_url, p.status, p.featured, iso(), iso()
  );
}

console.log(`Seeded ${additionalPackages.length} additional medical packages.`);

// ---------------------------------------------------------------------
// 3. Seed Pharmacies (4) in pharmacies table
// ---------------------------------------------------------------------
const pharmacies = [
  {
    id: "phm-my-1",
    name: "CARiNG Pharmacy Pavilion Premier",
    city: "Kuala Lumpur",
    address: "Lot 1.29, Level 1, Pavilion Kuala Lumpur, 168 Jalan Bukit Bintang, 55100 Kuala Lumpur",
    phone: "+60-3-2141-8899",
    pin_hash: "demo_hash",
    hours: "10:00 AM - 10:00 PM (Daily)",
    services: JSON.stringify([
      "Cold-chain insulin delivery",
      "Diabetes HbA1c point-of-care rapid testing",
      "Prescription medication therapy management (MTM)",
      "Medication blister pack dispensing",
      "In-store digital health consultation"
    ]),
    licence_no: "KKM-FPP/A/0014/2010",
    pharmacist_name: "Cheah Wei Lun",
    pharmacist_reg: "PR-88219",
    verified_at: "2025-01-10T08:00:00.000Z",
    verified_by: "usr-demo-admin",
    licence_expiry: "2029-12-31",
    pharmacist_apc_expiry: "2029-12-31",
    licence_type: "type_a",
    registry_reference: "NPRA/PHM/88219",
    delivery_methods: JSON.stringify(["pharmacy_courier", "grab", "lalamove"]),
    cold_chain: 1,
    panel_insurers: JSON.stringify(["Great Eastern", "AIA", "Prudential", "Allianz"]),
    active: 1
  },
  {
    id: "phm-my-2",
    name: "Alpro Pharmacy Healthcare Hub Petaling Jaya",
    city: "Petaling Jaya",
    address: "22 Jalan SS 21/35, Damansara Utama, 47400 Petaling Jaya, Selangor",
    phone: "+60-3-7728-6611",
    pin_hash: "demo_hash",
    hours: "08:30 AM - 10:00 PM (Daily)",
    services: JSON.stringify([
      "Home stroke rehabilitation medication compliance",
      "Wound dressing supply delivery",
      "Pharmacist bedside review",
      "Poisons Type A/B certified dispensary",
      "Oxygen concentrator rental & supply"
    ]),
    licence_no: "KKM-FPP/A/0038/2014",
    pharmacist_name: "Nurul Huda Binti Othman",
    pharmacist_reg: "PR-45120",
    verified_at: "2025-01-12T08:00:00.000Z",
    verified_by: "usr-demo-admin",
    licence_expiry: "2029-12-31",
    pharmacist_apc_expiry: "2029-12-31",
    licence_type: "type_a",
    registry_reference: "NPRA/PHM/45120",
    delivery_methods: JSON.stringify(["pharmacy_courier", "grab", "other_courier"]),
    cold_chain: 1,
    panel_insurers: JSON.stringify(["AIA", "Great Eastern", "Tokio Marine", "Etiqa"]),
    active: 1
  },
  {
    id: "phm-my-3",
    name: "Big Pharmacy Medical City Penang",
    city: "George Town",
    address: "152 Jalan Macalister, 10400 George Town, Penang",
    phone: "+60-4-228-9922",
    pin_hash: "demo_hash",
    hours: "08:00 AM - 11:00 PM (Daily)",
    services: JSON.stringify([
      "Specialist oncology & biologics cold-chain courier",
      "Drive-through prescription pickup",
      "International patient medical visa prescription validation",
      "Vaccine administration clinic"
    ]),
    licence_no: "KKM-FPP/A/0092/2016",
    pharmacist_name: "Lee Siew Kheng",
    pharmacist_reg: "PR-63911",
    verified_at: "2025-01-15T08:00:00.000Z",
    verified_by: "usr-demo-admin",
    licence_expiry: "2029-12-31",
    pharmacist_apc_expiry: "2029-12-31",
    licence_type: "type_a",
    registry_reference: "NPRA/PHM/63911",
    delivery_methods: JSON.stringify(["pharmacy_courier", "lalamove", "other_courier"]),
    cold_chain: 1,
    panel_insurers: JSON.stringify(["Prudential", "Allianz", "Manulife", "Zurich"]),
    active: 1
  },
  {
    id: "phm-my-4",
    name: "Watsons Health & Specialized Care Iskandar",
    city: "Johor Bahru",
    address: "Lot G-18, Mall of Medini, Lebuh Medini Utara, 79200 Iskandar Puteri, Johor",
    phone: "+60-7-513-4411",
    pin_hash: "demo_hash",
    hours: "09:00 AM - 10:00 PM (Daily)",
    services: JSON.stringify([
      "Same-day express medication home delivery",
      "Smoking cessation consultation",
      "Senior citizen health screening & pill organizer service",
      "Asthma inhaler technique certification"
    ]),
    licence_no: "KKM-FPP/A/0115/2019",
    pharmacist_name: "Ahmad Faiz Bin Zainuddin",
    pharmacist_reg: "PR-91042",
    verified_at: "2025-01-20T08:00:00.000Z",
    verified_by: "usr-demo-admin",
    licence_expiry: "2029-12-31",
    pharmacist_apc_expiry: "2029-12-31",
    licence_type: "type_a",
    registry_reference: "NPRA/PHM/91042",
    delivery_methods: JSON.stringify(["pharmacy_courier", "grab"]),
    cold_chain: 1,
    panel_insurers: JSON.stringify(["Great Eastern", "AIA", "Etiqa"]),
    active: 1
  }
];

const insPhm = db.prepare(`
  INSERT INTO pharmacies (
    id, name, address, phone, pin_hash, active, created_at, city, hours, services,
    licence_no, pharmacist_name, pharmacist_reg, verified_at, verified_by, licence_expiry,
    pharmacist_apc_expiry, licence_type, registry_reference, delivery_methods, cold_chain, panel_insurers
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, address=excluded.address, phone=excluded.phone, city=excluded.city,
    hours=excluded.hours, services=excluded.services, delivery_methods=excluded.delivery_methods,
    cold_chain=excluded.cold_chain, panel_insurers=excluded.panel_insurers, verified_at=excluded.verified_at
`);

for (const p of pharmacies) {
  insPhm.run(
    p.id, p.name, p.address, p.phone, p.pin_hash, p.active, iso(), p.city, p.hours, p.services,
    p.licence_no, p.pharmacist_name, p.pharmacist_reg, p.verified_at, p.verified_by, p.licence_expiry,
    p.pharmacist_apc_expiry, p.licence_type, p.registry_reference, p.delivery_methods, p.cold_chain, p.panel_insurers
  );
}

console.log(`Seeded ${pharmacies.length} pharmacies.`);

// ---------------------------------------------------------------------
// 4. Seed Pharmacy Promotional Offers in medical_promotions
// ---------------------------------------------------------------------
const pharmacyOffers = [
  {
    id: "promo-caring-15",
    facility_id: "phm-my-1",
    code: "CARINGMED15",
    title: "15% Off Chronic Medication Refills",
    description: "Enjoy 15% discount on 3-month refills for hypertension, cholesterol, and diabetes maintenance medications with complimentary cold-chain delivery.",
    discount_type: "percentage",
    discount_value: 15,
    package_id: null,
    badge_text: "15% Chronic Refill Rebate",
    valid_from: "2026-01-01",
    valid_until: "2026-12-31",
    terms: "Valid with a doctor verified e-prescription on MedCred.",
    image_url: "/assets/promotions/promo-merdeka.jpg",
    status: "active"
  },
  {
    id: "promo-alpro-30",
    facility_id: "phm-my-2",
    code: "ALPROCARE30",
    title: "RM 30 Rebate on Medical Equipment & Monitors",
    description: "Instant RM 30 instant discount on blood pressure monitors, blood glucose meters, and clinical wound dressings.",
    discount_type: "fixed",
    discount_value: 3000,
    package_id: null,
    badge_text: "RM 30 Equipment Rebate",
    valid_from: "2026-02-01",
    valid_until: "2026-12-31",
    terms: "Applicable on all medical devices over RM 150.",
    image_url: "/assets/promotions/promo-mhtc-global.jpg",
    status: "active"
  },
  {
    id: "promo-penang-10",
    facility_id: "phm-my-3",
    code: "PENANGHEALTH10",
    title: "10% Privilege Discount for Medical Travelers",
    description: "Special 10% welcome discount on specialty pharmacy medications, prescription sunglasses, and post-procedure health supplements.",
    discount_type: "percentage",
    discount_value: 10,
    package_id: null,
    badge_text: "10% Travel Privilege",
    valid_from: "2026-01-01",
    valid_until: "2026-12-31",
    terms: "Show medical appointment confirmation or valid passport.",
    image_url: "/assets/promotions/promo-pink-october.jpg",
    status: "active"
  },
  {
    id: "promo-watsons-20",
    facility_id: "phm-my-4",
    code: "WATSONSCARE20",
    title: "20% Off Preventive Wellness & Supplements",
    description: "20% discount on all pharmacist-recommended cardiac, joint, and vision health vitamins.",
    discount_type: "percentage",
    discount_value: 20,
    package_id: null,
    badge_text: "20% Wellness Rebate",
    valid_from: "2026-03-01",
    valid_until: "2026-12-31",
    terms: "Available for MedCred community members across all Johor outlets.",
    image_url: "/assets/promotions/promo-merdeka.jpg",
    status: "active"
  }
];

const insPromo = db.prepare(`
  INSERT INTO medical_promotions (
    id, facility_id, code, title, description, discount_type, discount_value,
    package_id, badge_text, valid_from, valid_until, terms, status, image_url, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, description=excluded.description, discount_value=excluded.discount_value,
    badge_text=excluded.badge_text, image_url=excluded.image_url, valid_until=excluded.valid_until
`);

for (const pr of pharmacyOffers) {
  insPromo.run(
    pr.id, pr.facility_id, pr.code, pr.title, pr.description, pr.discount_type, pr.discount_value,
    pr.package_id, pr.badge_text, pr.valid_from, pr.valid_until, pr.terms, pr.status, pr.image_url, iso(), iso()
  );
}

console.log(`Seeded ${pharmacyOffers.length} pharmacy promotions.`);

// ---------------------------------------------------------------------
// 5. Seed Specialized Nurses (minimum 5) in records (collection 'nurses')
// ---------------------------------------------------------------------
const newNurses = [
  {
    id: "nur-6",
    name: "Sister Farah Hanim Binti Zulkifli",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse",
    specialization: "Wound Care & Stoma Specialist",
    licenseNumber: "DEMO-LJM-RN-58921",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 13,
    education: ["B.Sc Nursing (UM)", "Certified Wound & Ostomy Care Nurse (CWOCN)"],
    bio: "Certified Wound, Ostomy and Continence Nurse with over 13 years of expertise. Specialises in chronic diabetic foot ulcer dressing, vacuum-assisted wound closure (NPWT), surgical debridement, and colostomy/ileostomy stoma management.",
    languages: ["English", "Malay"],
    consultationModes: ["Home Visit", "In-person"],
    fee: 55,
    rating: 4.9,
    reviewCount: 42,
    verificationStatus: "VERIFIED",
    practiceAddress: "Bangsar Specialist Medical Suites, Bangsar Baru",
    city: "Kuala Lumpur",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      slots: ["08:30 AM - 12:30 PM", "02:00 PM - 06:00 PM"]
    },
    seoSlug: "farah-hanim-wound-care-stoma-nurse-kuala-lumpur",
    shiftTypes: ["Home Visit Procedure", "Wound Dressing Package", "Stoma Care Consultation"]
  },
  {
    id: "nur-7",
    name: "Staff Nurse Brenda Tan Xin Yi",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse",
    specialization: "Palliative & Hospice Home Care Specialist",
    licenseNumber: "DEMO-LJM-RN-67182",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 10,
    education: ["Bachelor of Nursing (IMU)", "Postgraduate Certificate in Palliative Care (UK)"],
    bio: "Compassionate palliative nurse dedicated to symptom management, subcutaneous pain medication infusions, end-of-life dignity, and respite support for patients and families facing advanced chronic illnesses.",
    languages: ["English", "Malay", "Mandarin", "Cantonese"],
    consultationModes: ["Home Visit"],
    fee: 50,
    rating: 5.0,
    reviewCount: 29,
    verificationStatus: "VERIFIED",
    practiceAddress: "Subang Jaya Hospice & Care Network",
    city: "Subang Jaya",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"],
      slots: ["09:00 AM - 05:00 PM", "Overnight Respite Nursing"]
    },
    seoSlug: "brenda-tan-palliative-hospice-nurse-subang-jaya",
    shiftTypes: ["Home Visit", "12-Hour Respite Care", "Pain Monitoring Protocol"]
  },
  {
    id: "nur-8",
    name: "Sister Kavitha A/P Balakrishnan",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse",
    specialization: "Post-Surgical & Orthopaedic Rehabilitation Nurse",
    licenseNumber: "DEMO-LJM-RN-43901",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 11,
    education: ["Diploma in Nursing (UKM)", "Post-Basic Orthopaedic Nursing Certification"],
    bio: "Specialised orthopaedic rehabilitation nurse assisting patients after total knee/hip replacement, spinal fusion, and major abdominal surgery. Expert in mobility training, DVT prevention, surgical drain removal, and surgical site infection monitoring.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit", "In-person"],
    fee: 45,
    rating: 4.8,
    reviewCount: 36,
    verificationStatus: "VERIFIED",
    practiceAddress: "Petaling Jaya Surgical Aftercare Clinic",
    city: "Petaling Jaya",
    availability: {
      days: ["Monday", "Wednesday", "Thursday", "Saturday"],
      slots: ["08:00 AM - 02:00 PM", "03:00 PM - 07:00 PM"]
    },
    seoSlug: "kavitha-balakrishnan-orthopaedic-rehab-nurse-petaling-jaya",
    shiftTypes: ["Post-Op Home Rehabilitation", "Surgical Suture Removal", "Mobility Assistance"]
  },
  {
    id: "nur-9",
    name: "Staff Nurse Norazlan Bin Ismail",
    avatar: "/assets/nurse_male_malaysian.jpg",
    role: "nurse",
    specialization: "Cardiorespiratory & Tracheostomy Home Care",
    licenseNumber: "DEMO-LJM-RN-39482",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 9,
    education: ["B.Sc Nursing (UiTM)", "Advanced Respiratory Critical Care Certificate"],
    bio: "Experienced male nurse proficient in home mechanical ventilation, tracheostomy tube suction and dressing changes, oxygen therapy, and chest physiotherapy for post-stroke and neuromuscular patients.",
    languages: ["English", "Malay"],
    consultationModes: ["Home Visit"],
    fee: 60,
    rating: 4.9,
    reviewCount: 25,
    verificationStatus: "VERIFIED",
    practiceAddress: "Ampang Respiratory Care Network, Jalan Ampang",
    city: "Ampang",
    availability: {
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"],
      slots: ["12-Hour Day Shift", "12-Hour Night Shift", "Emergency Tube Change"]
    },
    seoSlug: "norazlan-ismail-respiratory-tracheostomy-nurse-ampang",
    shiftTypes: ["12-Hour Day Shift", "12-Hour Night Shift", "Tracheostomy Suction Protocol"]
  },
  {
    id: "nur-10",
    name: "Sister Rachel Lim Pei Fern",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse",
    specialization: "Maternal & Postnatal Confinement Lactation Nurse",
    licenseNumber: "DEMO-LJM-RN-77219",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 14,
    education: ["International Board Certified Lactation Consultant (IBCLC)", "B.Sc Midwifery & Nursing (UM)"],
    bio: "Certified Lactation Consultant and Postnatal Nurse providing bedside infant feeding guidance, breast engorgement relief, post-caesarean wound monitoring, newborn jaundice transcutaneous screening, and soothing infant sleep coaching.",
    languages: ["English", "Malay", "Mandarin", "Hokkien"],
    consultationModes: ["Home Visit", "Video Telehealth"],
    fee: 55,
    rating: 5.0,
    reviewCount: 58,
    verificationStatus: "VERIFIED",
    practiceAddress: "Damansara Maternal & Infant Care Hub",
    city: "Petaling Jaya",
    availability: {
      days: ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"],
      slots: ["09:30 AM - 01:30 PM", "02:30 PM - 06:30 PM"]
    },
    seoSlug: "rachel-lim-lactation-postnatal-nurse-petaling-jaya",
    shiftTypes: ["Home Lactation Consultation", "Postnatal Confinement Assessment", "Newborn Care Workshop"]
  }
];

const insRecord = db.prepare(`
  INSERT INTO records (collection, id, data) VALUES (?, ?, ?)
  ON CONFLICT(collection, id) DO UPDATE SET data=excluded.data
`);

for (const n of newNurses) {
  insRecord.run("nurses", n.id, JSON.stringify(n));
}

console.log(`Seeded ${newNurses.length} specialized nurses in records.`);

// ---------------------------------------------------------------------
// 6. Seed Specialized Doctors in records (collection 'doctors')
// ---------------------------------------------------------------------
const newDoctors = [
  {
    id: "doc-5",
    name: "Dr. Harjit Singh A/L Gurmukh",
    avatar: "/assets/doctor_male_chinese.jpg",
    role: "doctor",
    specialization: "Orthopaedic & Spine Surgeon",
    licenseNumber: "DEMO-MMC-61102",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 20,
    education: ["FRCS (Edinburgh)", "Master of Orthopaedic Surgery (UM)", "Spine Fellowship (Oxford)"],
    bio: "Senior Consultant Orthopaedic & Spine Surgeon specialising in minimally invasive disc surgery, cervical and lumbar spine decompression, and computer-navigated robotic knee replacement.",
    languages: ["English", "Malay", "Punjabi", "Hindi"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 250,
    rating: 4.9,
    reviewCount: 74,
    verificationStatus: "VERIFIED",
    practiceAddress: "Subang Jaya Medical Centre, 1 Jalan SS 12/1A",
    city: "Subang Jaya",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      slots: ["09:00 AM", "11:00 AM", "02:30 PM", "04:30 PM"]
    },
    seoSlug: "dr-harjit-singh-spine-orthopaedic-subang-jaya"
  },
  {
    id: "doc-6",
    name: "Dr. Faridah Binti Abdul Rahman",
    avatar: "/assets/doctor_female_indian.jpg",
    role: "doctor",
    specialization: "Medical Oncologist",
    licenseNumber: "DEMO-MMC-73419",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 16,
    education: ["MRCP (UK)", "Master of Clinical Oncology (UM)", "Fellowship in Targeted Cancer Genomics (Melbourne)"],
    bio: "Distinguished Consultant Medical Oncologist specializing in breast, colorectal, and lung malignancies. Dedicated to precision targeted therapies, immunotherapy protocols, and holistic cancer support.",
    languages: ["English", "Malay"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 280,
    rating: 5.0,
    reviewCount: 61,
    verificationStatus: "VERIFIED",
    practiceAddress: "Gleneagles Hospital Kuala Lumpur, 286 Jalan Ampang",
    city: "Kuala Lumpur",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday"],
      slots: ["10:00 AM", "12:00 PM", "03:00 PM", "05:00 PM"]
    },
    seoSlug: "dr-faridah-abdul-rahman-oncologist-kuala-lumpur"
  },
  {
    id: "doc-7",
    name: "Dr. Wong Chun Wai",
    avatar: "/assets/malaysian_male_doctor.jpg",
    role: "doctor",
    specialization: "Gastroenterologist & Hepatologist",
    licenseNumber: "DEMO-MMC-82194",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 15,
    education: ["MD (UKM)", "MRCP (UK)", "Advanced Therapeutic Endoscopy Fellowship (Hong Kong)"],
    bio: "Consultant Gastroenterologist and Hepatologist with vast experience in therapeutic endoscopy, liver cirrhosis, fatty liver reversal, inflammatory bowel disease, and early colorectal cancer detection.",
    languages: ["English", "Malay", "Mandarin", "Cantonese", "Hokkien"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 220,
    rating: 4.8,
    reviewCount: 49,
    verificationStatus: "VERIFIED",
    practiceAddress: "Island Hospital Penang, 308 Macalister Road",
    city: "Penang",
    availability: {
      days: ["Monday", "Tuesday", "Thursday", "Friday"],
      slots: ["09:30 AM", "11:30 AM", "02:00 PM", "04:00 PM"]
    },
    seoSlug: "dr-wong-chun-wai-gastroenterologist-penang"
  },
  {
    id: "doc-8",
    name: "Dr. Priya Dharshini A/P Subramaniam",
    avatar: "/assets/malaysian_female_doctor.jpg",
    role: "doctor",
    specialization: "Obstetrician & Gynaecologist",
    licenseNumber: "DEMO-MMC-91045",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 14,
    education: ["MBBS (Manipal)", "M.Med O&G (UM)", "Fellowship in Reproductive Medicine & IVF (Singapore)"],
    bio: "Compassionate OB/GYN and fertility specialist focusing on high-risk antenatal care, gentle natural birth, recurrent pregnancy loss, polycystic ovarian syndrome (PCOS), and assisted reproductive care.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 180,
    rating: 4.9,
    reviewCount: 53,
    verificationStatus: "VERIFIED",
    practiceAddress: "Klinik Wanita & Kesuburan Damansara, Damansara Utama",
    city: "Petaling Jaya",
    availability: {
      days: ["Wednesday", "Thursday", "Saturday", "Sunday"],
      slots: ["10:00 AM", "11:30 AM", "01:30 PM", "03:30 PM"]
    },
    seoSlug: "dr-priya-dharshini-obgyn-fertility-petaling-jaya"
  }
];

for (const d of newDoctors) {
  insRecord.run("doctors", d.id, JSON.stringify(d));
}

console.log(`Seeded ${newDoctors.length} specialized doctors in records.`);
console.log("All marketplace datasets successfully seeded!");
