import { DoctorProfile, NurseProfile, UserRole, VerificationStatus, JobPost, Article, Review, VerificationRequest } from './types';

export const INITIAL_DOCTORS: DoctorProfile[] = [
  {
    id: "doc-1",
    name: "Dr. Siti Aminah Binti Ahmad",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250",
    role: UserRole.DOCTOR,
    specialization: "Cardiologist",
    licenseNumber: "MMC-87429",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 14,
    education: ["MD - Cardiology (UM)", "MBBS (Universiti Malaya)"],
    bio: "Senior Consultant Cardiologist specializing in preventive cardiology, heart failure management, and non-invasive cardiac imaging. Committed to evidence-based clinical practice.",
    languages: ["English", "Malay", "Mandarin"],
    consultationModes: ["In-person" as any, "Video Telehealth" as any],
    fee: 150,
    rating: 4.9,
    reviewCount: 38,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "Pantai Hospital Kuala Lumpur, 8 Jalan Bukit Pantai",
    city: "Kuala Lumpur",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      slots: ["10:00 AM", "11:30 AM", "03:00 PM", "04:30 PM"]
    },
    seoSlug: "dr-siti-aminah-cardiologist-kuala-lumpur"
  },
  {
    id: "doc-2",
    name: "Dr. Tan Seng Hock",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250",
    role: UserRole.DOCTOR,
    specialization: "Pediatrician",
    licenseNumber: "MMC-32109",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 18,
    education: ["Master of Paediatrics (UKM)", "MBBS (Universiti Kebangsaan Malaysia)"],
    bio: "Compassionate paediatrician with over 18 years of experience. Expert in neonatal intensive care, developmental monitoring, and childhood immunization.",
    languages: ["English", "Malay", "Mandarin", "Hokkien"],
    consultationModes: ["In-person" as any, "Home Visit" as any, "Video Telehealth" as any],
    fee: 120,
    rating: 4.8,
    reviewCount: 52,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "KPJ Damansara Specialist Hospital, 119 Jalan SS 21/56, Damansara Utama",
    city: "Petaling Jaya",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday"],
      slots: ["09:00 AM", "10:30 AM", "11:00 AM", "05:00 PM"]
    },
    seoSlug: "dr-tan-seng-hock-paediatrician-petaling-jaya"
  },
  {
    id: "doc-3",
    name: "Dr. Ahmad Ridzuan Bin Mohd Rosli",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250",
    role: UserRole.DOCTOR,
    specialization: "Neurologist",
    licenseNumber: "MMC-55412",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 11,
    education: ["Master of Neurology (UM)", "MBBS (USM)"],
    bio: "Specialist in stroke intervention, chronic migraine management, neurodegenerative disorders, and epilepsy treatment therapies.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["In-person" as any, "Video Telehealth" as any],
    fee: 200,
    rating: 4.7,
    reviewCount: 24,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "Gleneagles Penang, 2 Jalan Sultan Ahmad Shah, George Town",
    city: "Penang",
    availability: {
      days: ["Monday", "Tuesday", "Thursday"],
      slots: ["11:00 AM", "01:30 PM", "04:00 PM", "06:30 PM"]
    },
    seoSlug: "dr-ahmad-ridzuan-neurologist-penang"
  },
  {
    id: "doc-4",
    name: "Dr. Leong Mei Ling",
    avatar: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=250",
    role: UserRole.DOCTOR,
    specialization: "Dermatologist",
    licenseNumber: "MMC-99213",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 9,
    education: ["Advanced Master in Dermatology (UKM)", "MBBS (UM)"],
    bio: "Acne, eczema, laser treatments, and anti-aging expert. Dedicated to restoring skin health and promoting sustainable, scientifically-backed skincare routines.",
    languages: ["English", "Malay", "Cantonese"],
    consultationModes: ["Video Telehealth" as any, "In-person" as any],
    fee: 140,
    rating: 4.9,
    reviewCount: 45,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "Sunway Medical Centre Johor, Iskandar Puteri",
    city: "Johor Bahru",
    availability: {
      days: ["Wednesday", "Friday", "Saturday"],
      slots: ["10:00 AM", "12:00 PM", "02:30 PM", "05:30 PM"]
    },
    seoSlug: "dr-leong-mei-ling-dermatologist-johor-bahru"
  }
];

export const INITIAL_NURSES: NurseProfile[] = [
  {
    id: "nur-1",
    name: "Sister Nurul Ain Binti Yusof",
    avatar: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=250",
    role: UserRole.NURSE,
    specialization: "ICU & Critical Care",
    licenseNumber: "LJM-RN-41223",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 12,
    education: ["B.Sc Nursing (Universiti Malaya)", "Post-Basic Critical Care Diploma"],
    bio: "Highly experienced Critical Care Registered Nurse with extensive ICU background. Proficient in ventilator management, hemodynamic monitoring, and acute patient care.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit" as any, "In-person" as any],
    fee: 45, // hourly
    rating: 4.9,
    reviewCount: 67,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "Pantai Hospital Cheras, Jalan Cheras Makmur, Cheras",
    city: "Kuala Lumpur",
    availability: {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      slots: ["08:00 AM - 04:00 PM", "08:00 PM - 08:00 AM (Night)"]
    },
    seoSlug: "nurul-ain-critical-care-nurse-kuala-lumpur",
    shiftTypes: ["Day Shift", "Night Shift", "24-Hour Care"]
  },
  {
    id: "nur-2",
    name: "Karthik Loganathan",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250&idx=nurse2",
    role: UserRole.NURSE,
    specialization: "Geriatric & Eldercare",
    licenseNumber: "LJM-RN-11892",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 8,
    education: ["Diploma in Nursing (KPJ Healthcare University College)"],
    bio: "Dedicated eldercare nurse passionate about providing high-quality companion care, mobility assistance, medication management, and nutritional support for senior citizens.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit" as any],
    fee: 35, // hourly
    rating: 4.8,
    reviewCount: 31,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "KPJ Ampang Puteri Specialist Hospital, Jalan Memanda 9",
    city: "Ampang",
    availability: {
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
      slots: ["09:00 AM - 05:00 PM", "12-Hour Daily Care"]
    },
    seoSlug: "karthik-loganathan-geriatric-eldercare-nurse-ampang",
    shiftTypes: ["Day Shift", "24-Hour Care"]
  },
  {
    id: "nur-3",
    name: "Michelle Wong Siew Lan",
    avatar: "https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=250",
    role: UserRole.NURSE,
    specialization: "Pediatric & Neonatal Care",
    licenseNumber: "LJM-RN-88314",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 6,
    education: ["B.Sc Nursing (IMU - International Medical University)"],
    bio: "Certified paediatric nurse specializing in newborn home care, feeding support, post-op paediatric monitoring, and vaccination schedules.",
    languages: ["English", "Malay", "Mandarin"],
    consultationModes: ["Home Visit" as any, "In-person" as any],
    fee: 40,
    rating: 4.9,
    reviewCount: 19,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: "Gleneagles Kuala Lumpur, 286 Jalan Ampang",
    city: "Kuala Lumpur",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      slots: ["08:00 AM - 02:00 PM", "04:00 PM - 10:00 PM"]
    },
    seoSlug: "michelle-wong-paediatric-nurse-kuala-lumpur",
    shiftTypes: ["Day Shift"]
  }
];

export const INITIAL_VERIFICATION_REQUESTS: VerificationRequest[] = [
  {
    id: "ver-1",
    userId: "pending-doc-1",
    userName: "Dr. Khairul Azman Bin Ibrahim",
    userType: UserRole.DOCTOR,
    licenseNumber: "MMC-77341",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    degreeName: "Master of Medicine in Internal Medicine (UM)",
    fileUrl: "med_certificate_khairul_azman.pdf",
    submittedAt: "2026-07-08T14:30:00Z",
    status: VerificationStatus.PENDING
  },
  {
    id: "ver-2",
    userId: "pending-nur-1",
    userName: "Tan Choon Wei",
    userType: UserRole.NURSE,
    licenseNumber: "LJM-RN-99451",
    medicalCouncil: "Malaysian Nursing Board (LJM)",
    degreeName: "B.Sc Nursing (Universiti Malaya)",
    fileUrl: "bsc_degree_tan_choon_wei.pdf",
    submittedAt: "2026-07-09T02:15:00Z",
    status: VerificationStatus.PENDING
  },
  {
    id: "ver-3",
    userId: "rejected-doc-1",
    userName: "Raymond Wong (Claimed Dr.)",
    userType: UserRole.DOCTOR,
    licenseNumber: "FAKE-10293",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    degreeName: "Degree of Herbology (Unrecognized)",
    fileUrl: "unverified_degree.jpg",
    submittedAt: "2026-07-05T10:00:00Z",
    status: VerificationStatus.REJECTED,
    rejectionReason: "License verification failed on Malaysian Medical Council database: registration code does not match registered medical practitioner records."
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    professionalId: "doc-1",
    patientId: "pat-1",
    patientName: "Chua Chee Keong",
    rating: 5,
    punctuality: 5,
    communication: 5,
    satisfaction: 5,
    comment: "Excellent diagnostician. Dr. Siti Aminah spent 30 minutes explaining the ECG results and lipid profile details without rushing. Very satisfied with the heart care plan.",
    date: "2026-06-28",
    replyText: "Thank you Chua. Glad we could resolve your cardiac queries. Stay active!",
    isVerifiedPatient: true
  },
  {
    id: "rev-2",
    professionalId: "doc-1",
    patientId: "pat-2",
    patientName: "Fatimah Binti Awang",
    rating: 4.8,
    punctuality: 4,
    communication: 5,
    satisfaction: 5,
    comment: "Very professional and empathetic. Highly recommend her for non-invasive heart screenings at Pantai Hospital.",
    date: "2026-07-01",
    isVerifiedPatient: true
  },
  {
    id: "rev-3",
    professionalId: "nur-1",
    patientId: "pat-3",
    patientName: "Ravi Chandran",
    rating: 5,
    punctuality: 5,
    communication: 5,
    satisfaction: 5,
    comment: "Sister Nurul Ain was phenomenal during my father's post-CABG recovery at home in KL. Her handling of the ventilator setup and tracheostomy care was professional and secure.",
    date: "2026-07-04",
    replyText: "It was an absolute privilege assisting your father, Ravi. Wishing him a robust recovery.",
    isVerifiedPatient: true
  }
];

export const INITIAL_JOBS: JobPost[] = [
  {
    id: "job-1",
    hospitalName: "KPJ Damansara Specialist Hospital",
    hospitalLogo: "🏥",
    title: "Critical Care Nurse (ICU) - Night Shift Focus",
    type: "Shift-based",
    location: "Damansara Utama",
    city: "Petaling Jaya",
    specialtyRequired: "ICU & Critical Care",
    description: "Looking for Malaysian Nursing Board registered ICU nurses (B.Sc or Diploma) with a minimum of 3 years of clinical ICU experience. Must be proficient in crash cart operation, patient monitoring, and emergency response.",
    salaryRange: "RM 4,500 - RM 6,000 / month",
    requirements: [
      "Registered with Malaysian Nursing Board (LJM) with active license",
      "Proficient in ECG interpretation & mechanical ventilators",
      "BLS & ACLS Certification is mandatory",
      "Strong medical teamwork ethics"
    ],
    applicantsCount: 4,
    status: "Active",
    postedAt: "2026-07-06T09:00:00Z",
    appliedUserIds: []
  },
  {
    id: "job-2",
    hospitalName: "Pantai Hospital Kuala Lumpur",
    hospitalLogo: "🩺",
    title: "Junior Consultant - Paediatric Cardiology",
    type: "Full-time",
    location: "Bangsar",
    city: "Kuala Lumpur",
    specialtyRequired: "Cardiologist",
    description: "Seeking a board-certified pediatrician with subspecialty training or fellowship in Paediatric Cardiology. Will oversee inpatient consults, echocardiography screenings, and congenital heart disease outpatient followups.",
    salaryRange: "RM 15,000 - RM 22,000 / month",
    requirements: [
      "MBBS + Master of Paediatrics + Fellowship in Paediatric Cardiology",
      "Active Malaysian Medical Council (MMC) Registration Number",
      "Minimum 2 years post-fellowship experience",
      "Expertise in non-invasive paediatric cardio-imaging"
    ],
    applicantsCount: 2,
    status: "Active",
    postedAt: "2026-07-07T11:30:00Z",
    appliedUserIds: []
  },
  {
    id: "job-3",
    hospitalName: "Sunway Home Healthcare",
    hospitalLogo: "🏠",
    title: "Home Geriatric Care Nurse",
    type: "Contract",
    location: "Bandar Sunway",
    city: "Subang Jaya",
    specialtyRequired: "Geriatric & Eldercare",
    description: "Provide comprehensive nursing assistance to elderly patients recovering at home. Scope includes vital signs recording, feeding tube maintenance, medication administration, and simple physical therapy coordination.",
    salaryRange: "RM 3,500 - RM 4,500 / month",
    requirements: [
      "B.Sc Nursing or Diploma in Nursing with active Malaysian Nursing Board (LJM) registry",
      "Compassionate caregiving background for neurologically-impaired seniors",
      "Exceptional patient-family communication",
      "Strict compliance with daily home care charting"
    ],
    applicantsCount: 7,
    status: "Active",
    postedAt: "2026-07-08T15:00:00Z",
    appliedUserIds: []
  }
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "Understanding Chest Pain: When is it a Cardiac Emergency?",
    excerpt: "Not all chest pain signals a heart attack, but knowing when to act immediately can save lives. Our expert cardiologist breaks down the red flag symptoms.",
    content: `Chest pain is one of the most common reasons patients visit the emergency department. While it can stem from benign causes like acid reflux, muscle strain, or anxiety, it is essential to rule out acute coronary syndromes (ACS), such as myocardial infarction (heart attack).

### Cardiac vs. Non-Cardiac Symptoms
- **Cardiac Pain**: Classically described as a pressure, squeezing, fullness, or pain in the center of the chest. It often radiates to the neck, jaw, shoulders, or arms (especially the left arm). It can be accompanied by dyspnea (shortness of breath), diaphoresis (profuse sweating), nausea, or lightheadedness.
- **Non-Cardiac Pain**: Often sharp, localized, or aggravated by breathing, coughing, or specific posture shifts. However, clinical presentation varies significantly, especially in elderly patients, diabetics, and women, who may present with atypical symptoms like pure epigastric discomfort or isolated dyspnea.

### Critical Action Protocols
If you or someone near you experiences squeezing substernal discomfort lasting more than 5 minutes, accompanied by sweating or radiating pain:
1. **Call Emergency Services (999 in Malaysia) immediately**. Do not attempt to drive yourself to the clinic.
2. **Rest**: Place the patient in a comfortable sitting position to decrease myocardial oxygen demand.
3. **Masticate Aspirin**: If instructed by emergency personnel and not contraindicated (no allergy, active bleeding), chewing a 325mg non-coated aspirin can limit platelet aggregation and clot growth.

*Disclaimer: This guide is authored by registered medical professionals for educational purposes only. It is not a substitute for clinical emergency diagnostics.*`,
    category: "Cardiology",
    authorId: "doc-1",
    authorName: "Dr. Siti Aminah Binti Ahmad",
    authorTitle: "Senior Consultant Cardiologist",
    authorAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250",
    authorCredentialsVerified: true,
    date: "2026-07-05",
    citations: [
      "Malaysian Clinical Practice Guidelines (CPG) on the Management of Acute Myocardial Infarction (2020).",
      "Circulation: AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain."
    ],
    faq: [
      {
        question: "Does chest pain always radiate to the left arm?",
        answer: "No. While radiation to the left arm is classic, pain can radiate to the right arm, jaw, neck, back, or remain strictly in the epigastric (upper stomach) region, particularly in women and diabetic patients."
      },
      {
        question: "Can gas cause severe chest pain?",
        answer: "Gas, gastroesophageal reflux disease (GERD) and esophageal spasms can cause severe pain mimicking angina. However, emergency clinical evaluation is crucial to safely distinguish them from cardiac causes."
      }
    ]
  },
  {
    id: "art-2",
    title: "Essential Care Protocols for Ventilated Patients at Home",
    excerpt: "Transitioning an ICU patient to home-based mechanical ventilation requires highly detailed protocol management to prevent pneumonia and mechanical failures.",
    content: `Caring for a patient on long-term mechanical ventilation at home is a complex endeavor that requires close coordination between critical care nurses, family members, and the home health agency. Strict adherence to evidence-based protocols is vital to prevent severe complications, most notably Ventilator-Associated Pneumonia (VAP).

### 1. Airway Security and Suctioning
Tracheostomy tubes must remain clear of secretions to prevent occlusion. Suctioning should be performed on an as-needed basis rather than on a rigid schedule to minimize mucosal trauma:
- **Aseptic Technique**: Always wash hands thoroughly and wear sterile gloves. Use sterile suction catheters.
- **Pre-Oxygenation**: Deliver 100% oxygen before suctioning to avoid hypoxia.
- **Suction Duration**: Limit suction application to 10-15 seconds per pass.

### 2. Preventing Ventilator-Associated Pneumonia (VAP)
- **Head Elevation**: Ensure the patient's head of the bed is maintained at an angle of 30 to 45 degrees, unless medically contraindicated. This simple positioning significantly reduces aspiration risks.
- **Mouth Hygiene**: Clean the patient's oral cavity every 4 to 6 hours using chlorhexidine antiseptic solution. secretion build-up in the oropharynx is a primary reservoir for respiratory pathogens.

### 3. Alarm Management and Emergency Contingency
Always have a manual resuscitation bag (Ambu bag) and a backup battery/power source in the patient's immediate vicinity. Home care providers must be trained to recognize and act upon high-pressure alarms (often indicating blockage, coughing, or tube displacement) and low-pressure alarms (signaling circuit leaks or disconnects).

*This protocol guide has been reviewed and certified by professional registered critical care instructors.*`,
    category: "Critical Care",
    authorId: "nur-1",
    authorName: "Sister Nurul Ain Binti Yusof",
    authorTitle: "ICU & Critical Care Registered Nurse",
    authorAvatar: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=250",
    authorCredentialsVerified: true,
    date: "2026-07-08",
    citations: [
      "Malaysian Ministry of Health (MOH) Home-based Nursing Care Guidelines.",
      "AACN Procedure Manual for High Acuity, Progressive, and Critical Care (8th Edition)."
    ],
    faq: [
      {
        question: "What is the first step when a ventilator alarm triggers and the cause is unclear?",
        answer: "If you cannot immediately resolve an alarm and the patient is in distress, immediately disconnect the patient from the ventilator and manually ventilate them using the Ambu bag connected to 100% oxygen, then call for emergency support."
      },
      {
        question: "How often should oral care be performed?",
        answer: "Standard practice recommends performing oral hygiene with chlorhexidine every 4 to 6 hours to minimize salivary bacterial counts."
      }
    ]
  }
];
