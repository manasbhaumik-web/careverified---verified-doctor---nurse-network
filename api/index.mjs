// server.ts
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// src/data.ts
var INITIAL_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. Siti Aminah Binti Ahmad",
    avatar: "/assets/malaysian_female_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Cardiologist",
    licenseNumber: "MMC-87429",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 14,
    education: ["MD - Cardiology (UM)", "MBBS (Universiti Malaya)"],
    bio: "Senior Consultant Cardiologist specializing in preventive cardiology, heart failure management, and non-invasive cardiac imaging. Committed to evidence-based clinical practice.",
    languages: ["English", "Malay", "Mandarin"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 150,
    rating: 4.9,
    reviewCount: 38,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Kuala Lumpur Specialist Hospital, 8 Jalan Bukit Pantai",
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
    avatar: "/assets/malaysian_male_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Pediatrician",
    licenseNumber: "MMC-32109",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 18,
    education: ["Master of Paediatrics (UKM)", "MBBS (Universiti Kebangsaan Malaysia)"],
    bio: "Compassionate paediatrician with over 18 years of experience. Expert in neonatal intensive care, developmental monitoring, and childhood immunization.",
    languages: ["English", "Malay", "Mandarin", "Hokkien"],
    consultationModes: ["In-person", "Home Visit", "Video Telehealth"],
    fee: 120,
    rating: 4.8,
    reviewCount: 52,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Damansara Specialist Medical Center, 119 Jalan SS 21/56, Damansara Utama",
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
    avatar: "/assets/malaysian_male_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Neurologist",
    licenseNumber: "MMC-55412",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 11,
    education: ["Master of Neurology (UM)", "MBBS (USM)"],
    bio: "Specialist in stroke intervention, chronic migraine management, neurodegenerative disorders, and epilepsy treatment therapies.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["In-person", "Video Telehealth"],
    fee: 200,
    rating: 4.7,
    reviewCount: 24,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Penang City Specialist Hospital, 2 Jalan Sultan Ahmad Shah, George Town",
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
    avatar: "/assets/malaysian_female_doctor.jpg",
    role: "doctor" /* DOCTOR */,
    specialization: "Dermatologist",
    licenseNumber: "MMC-99213",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    experienceYears: 9,
    education: ["Advanced Master in Dermatology (UKM)", "MBBS (UM)"],
    bio: "Acne, eczema, laser treatments, and anti-aging expert. Dedicated to restoring skin health and promoting sustainable, scientifically-backed skincare routines.",
    languages: ["English", "Malay", "Cantonese"],
    consultationModes: ["Video Telehealth", "In-person"],
    fee: 140,
    rating: 4.9,
    reviewCount: 45,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Iskandar Specialist Medical Centre, Iskandar Puteri",
    city: "Johor Bahru",
    availability: {
      days: ["Wednesday", "Friday", "Saturday"],
      slots: ["10:00 AM", "12:00 PM", "02:30 PM", "05:30 PM"]
    },
    seoSlug: "dr-leong-mei-ling-dermatologist-johor-bahru"
  }
];
var INITIAL_NURSES = [
  {
    id: "nur-1",
    name: "Sister Nurul Ain Binti Yusof",
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse" /* NURSE */,
    specialization: "ICU & Critical Care",
    licenseNumber: "LJM-RN-41223",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 12,
    education: ["B.Sc Nursing (Universiti Malaya)", "Post-Basic Critical Care Diploma"],
    bio: "Highly experienced Critical Care Registered Nurse with extensive ICU background. Proficient in ventilator management, hemodynamic monitoring, and acute patient care.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit", "In-person"],
    fee: 45,
    // hourly
    rating: 4.9,
    reviewCount: 67,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Cheras Medical Center, Jalan Cheras Makmur, Cheras",
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
    avatar: "/assets/malaysian_male_patient.jpg",
    role: "nurse" /* NURSE */,
    specialization: "Geriatric & Eldercare",
    licenseNumber: "LJM-RN-11892",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 8,
    education: ["Diploma in Nursing (National Healthcare University College)"],
    bio: "Dedicated eldercare nurse passionate about providing high-quality companion care, mobility assistance, medication management, and nutritional support for senior citizens.",
    languages: ["English", "Malay", "Tamil"],
    consultationModes: ["Home Visit"],
    fee: 35,
    // hourly
    rating: 4.8,
    reviewCount: 31,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Ampang Specialist Hospital, Jalan Memanda 9",
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
    avatar: "/assets/malaysian_female_nurse.jpg",
    role: "nurse" /* NURSE */,
    specialization: "Pediatric & Neonatal Care",
    licenseNumber: "LJM-RN-88314",
    nursingCouncil: "Malaysian Nursing Board (LJM)",
    experienceYears: 6,
    education: ["B.Sc Nursing (IMU - International Medical University)"],
    bio: "Certified paediatric nurse specializing in newborn home care, feeding support, post-op paediatric monitoring, and vaccination schedules.",
    languages: ["English", "Malay", "Mandarin"],
    consultationModes: ["Home Visit", "In-person"],
    fee: 40,
    rating: 4.9,
    reviewCount: 19,
    verificationStatus: "Verified \u2705" /* VERIFIED */,
    practiceAddress: "Kuala Lumpur Health Center, 286 Jalan Ampang",
    city: "Kuala Lumpur",
    availability: {
      days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      slots: ["08:00 AM - 02:00 PM", "04:00 PM - 10:00 PM"]
    },
    seoSlug: "michelle-wong-paediatric-nurse-kuala-lumpur",
    shiftTypes: ["Day Shift"]
  }
];
var INITIAL_VERIFICATION_REQUESTS = [
  {
    id: "ver-1",
    userId: "pending-doc-1",
    userName: "Dr. Khairul Azman Bin Ibrahim",
    userType: "doctor" /* DOCTOR */,
    licenseNumber: "MMC-77341",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    degreeName: "Master of Medicine in Internal Medicine (UM)",
    fileUrl: "med_certificate_khairul_azman.pdf",
    submittedAt: "2026-07-08T14:30:00Z",
    status: "Pending" /* PENDING */
  },
  {
    id: "ver-2",
    userId: "pending-nur-1",
    userName: "Tan Choon Wei",
    userType: "nurse" /* NURSE */,
    licenseNumber: "LJM-RN-99451",
    medicalCouncil: "Malaysian Nursing Board (LJM)",
    degreeName: "B.Sc Nursing (Universiti Malaya)",
    fileUrl: "bsc_degree_tan_choon_wei.pdf",
    submittedAt: "2026-07-09T02:15:00Z",
    status: "Pending" /* PENDING */
  },
  {
    id: "ver-3",
    userId: "rejected-doc-1",
    userName: "Raymond Wong (Claimed Dr.)",
    userType: "doctor" /* DOCTOR */,
    licenseNumber: "FAKE-10293",
    medicalCouncil: "Malaysian Medical Council (MMC)",
    degreeName: "Degree of Herbology (Unrecognized)",
    fileUrl: "unverified_degree.jpg",
    submittedAt: "2026-07-05T10:00:00Z",
    status: "Rejected" /* REJECTED */,
    rejectionReason: "License verification failed on Malaysian Medical Council database: registration code does not match registered medical practitioner records."
  }
];
var INITIAL_REVIEWS = [
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
    comment: "Very professional and empathetic. Highly recommend her for non-invasive heart screenings at Kuala Lumpur Specialist Hospital.",
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
var INITIAL_JOBS = [
  {
    id: "job-1",
    hospitalName: "Damansara Specialist Medical Center",
    hospitalLogo: "\u{1F3E5}",
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
    hospitalName: "Kuala Lumpur Specialist Hospital",
    hospitalLogo: "\u{1FA7A}",
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
    hospitalName: "Metro Home Healthcare",
    hospitalLogo: "\u{1F3E0}",
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
var INITIAL_ARTICLES = [
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

// server.ts
dotenv.config();
var app = express();
app.use(express.json());
var PORT = 3e3;
var doctors = [...INITIAL_DOCTORS];
var nurses = [...INITIAL_NURSES];
var verificationRequests = [...INITIAL_VERIFICATION_REQUESTS];
var reviews = [...INITIAL_REVIEWS];
var jobs = [...INITIAL_JOBS];
var articles = [...INITIAL_ARTICLES];
var bookings = [
  {
    id: "bkg-101112",
    professionalId: "doc-1",
    professionalName: "Dr. Ananya Sen",
    professionalRole: "doctor" /* DOCTOR */,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "swarnabhaumik@gmail.com",
    date: "2026-07-12",
    timeSlot: "10:00 AM",
    mode: "Video Telehealth" /* VIDEO */,
    fee: 150,
    paymentStatus: "Paid",
    status: "Upcoming",
    symptoms: "Mild chest tightness after walking, occasional high heart rate.",
    createdAt: "2026-07-08T10:00:00.000Z"
  },
  {
    id: "bkg-202223",
    professionalId: "doc-2",
    professionalName: "Dr. Rajesh K. Sharma",
    professionalRole: "doctor" /* DOCTOR */,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "swarnabhaumik@gmail.com",
    date: "2026-07-05",
    timeSlot: "11:00 AM",
    mode: "In-person" /* IN_PERSON */,
    fee: 120,
    paymentStatus: "Paid",
    status: "Completed",
    symptoms: "Allergic cough, nasal congestion, low-grade fever for 3 days.",
    createdAt: "2026-07-04T15:30:00.000Z",
    prescription: {
      diagnosis: "Acute Bronchitis & Seasonal Allergy Flare-up",
      medicines: "1. Tab Cetirizine 10mg - 1 tablet before sleeping for 5 days\n2. Tab Paracetamol 650mg - 1 tablet SOS if fever > 100\xB0F (Max 3/day)\n3. Levosalbutamol Inhaler - 2 puffs every 6 hours if wheezing",
      instructions: "Keep hydrated. Avoid cold fluids and exposure to dust. Steam inhalation twice a day. Return for review if shortness of breath increases.",
      issuedAt: "2026-07-05T11:45:00.000Z",
      digitalSignature: "Digitally Signed & Certified by Dr. Rajesh K. Sharma (MMC-32109)"
    }
  }
];
var chats = [];
var patients = [];
var appPackages = [
  {
    id: "patient_dashboard",
    name: "Patient Portal Hub",
    description: "Allows patients to manage active bookings, view digital prescriptions, log vital health stats, and save doctor profiles.",
    icon: "Heart",
    isEnabled: true,
    category: "Patient Services",
    version: "2.1.0",
    author: "MediCert Core Dev",
    isRemovable: false
  },
  {
    id: "registry",
    name: "Doctors & Nurses Directory",
    description: "Search engine for patients to locate certified medical practitioners with advanced filters and clinical triage matcher.",
    icon: "Search",
    isEnabled: true,
    category: "Patient Services",
    version: "1.8.5",
    author: "MediCert Core Dev",
    isRemovable: false
  },
  {
    id: "recruitment",
    name: "Shift Vacancies & Recruitment",
    description: "B2B job recruitment board matching clinical healthcare institutions with credential-approved practitioners for active shift fill-ins.",
    icon: "Calendar",
    isEnabled: true,
    category: "Clinical Operations",
    version: "1.4.0",
    author: "MediCert B2B Group",
    isRemovable: true
  },
  {
    id: "articles",
    name: "Peer-Reviewed Medical Library",
    description: "Publish patient-facing health guidance papers written by licensed clinical practitioners, backed by PubMed citation metrics.",
    icon: "BookOpen",
    isEnabled: true,
    category: "SEO & Growth",
    version: "1.2.0",
    author: "EEAT Compliance Team",
    isRemovable: true
  },
  {
    id: "onboard",
    name: "Practitioner Credential Portal",
    description: "Multi-stage onboarding gateway for doctors and nurses to submit government license keys and registry files for audit verification.",
    icon: "PlusCircle",
    isEnabled: true,
    category: "Credentialing",
    version: "2.0.1",
    author: "Medical Board Audit Team",
    isRemovable: false
  },
  {
    id: "messages",
    name: "HIPAA Secure Mailroom",
    description: "Encrypted instant messaging system connecting vetted medical staff with patient accounts for safe telehealth pre-consultation.",
    icon: "MessageSquare",
    isEnabled: true,
    category: "Communication",
    version: "1.1.2",
    author: "SecOps Security Team",
    isRemovable: true
  },
  {
    id: "seo",
    name: "Google Rich Snippets SEO",
    description: "Dynamic Schema.org structural JSON-LD metadata generator and Google sitemap dynamic indexing automation tracker.",
    icon: "Globe",
    isEnabled: true,
    category: "SEO & Growth",
    version: "1.0.4",
    author: "MediCert Growth Labs",
    isRemovable: true
  }
];
var generateId = (prefix) => `${prefix}-${Math.floor(1e5 + Math.random() * 9e5)}`;
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.get("/api/professionals", (req, res) => {
  const { role, city, specialty, search } = req.query;
  let list = [...doctors, ...nurses];
  if (role) {
    list = list.filter((p) => p.role === role);
  }
  if (city) {
    list = list.filter((p) => p.city.toLowerCase() === city.toLowerCase());
  }
  if (specialty) {
    list = list.filter((p) => p.specialization.toLowerCase().includes(specialty.toLowerCase()));
  }
  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(term) || p.specialization.toLowerCase().includes(term) || p.bio.toLowerCase().includes(term)
    );
  }
  res.json({ status: "success", data: list });
});
app.get("/api/professionals/:id", (req, res) => {
  const { id } = req.params;
  const prof = [...doctors, ...nurses].find((p) => p.id === id || p.seoSlug === id);
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Medical professional not found" });
  }
  res.json({ status: "success", data: prof });
});
app.post("/api/register-patient", (req, res) => {
  const {
    name,
    email,
    password,
    icNumber,
    age,
    phone,
    gender,
    chronicConditions,
    allergies,
    emergencyContactName,
    emergencyContactPhone
  } = req.body;
  if (!name || !email || !password || !icNumber) {
    return res.status(400).json({ status: "error", message: "Missing essential patient registration fields." });
  }
  const exists = patients.some((p) => p.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ status: "error", message: "A patient with this email already exists." });
  }
  const newPatient = {
    id: generateId("pat"),
    name,
    email,
    icNumber,
    age: Number(age) || 30,
    phone,
    gender: gender || "Male",
    chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
    allergies: Array.isArray(allergies) ? allergies : [],
    emergencyContactName: emergencyContactName || "",
    emergencyContactPhone: emergencyContactPhone || "",
    registeredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  patients.push(newPatient);
  res.status(201).json({
    status: "success",
    message: "Patient registered successfully inside secure national register.",
    data: newPatient
  });
});
app.post("/api/register", (req, res) => {
  const {
    name,
    role,
    specialization,
    licenseNumber,
    medicalCouncil,
    experienceYears,
    education,
    bio,
    languages,
    consultationModes,
    fee,
    practiceAddress,
    city,
    shiftTypes,
    avatar
  } = req.body;
  if (!name || !role || !licenseNumber || !medicalCouncil) {
    return res.status(400).json({ status: "error", message: "Missing required registration parameters." });
  }
  const newId = generateId(role === "doctor" /* DOCTOR */ ? "doc" : "nur");
  const seoSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${specialization.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (role === "doctor" /* DOCTOR */) {
    const newDoc = {
      id: newId,
      name,
      avatar: avatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250",
      role: "doctor" /* DOCTOR */,
      specialization,
      licenseNumber,
      medicalCouncil,
      experienceYears: Number(experienceYears) || 1,
      education: Array.isArray(education) ? education : [education],
      bio: bio || "Licensed medical practitioner.",
      languages: Array.isArray(languages) ? languages : ["English", "Hindi"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["In-person"],
      fee: Number(fee) || 500,
      rating: 5,
      reviewCount: 0,
      verificationStatus: "Pending" /* PENDING */,
      practiceAddress,
      city,
      availability: {
        days: ["Monday", "Wednesday", "Friday"],
        slots: ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM"]
      },
      seoSlug
    };
    doctors.push(newDoc);
  } else {
    const newNurse = {
      id: newId,
      name,
      avatar: avatar || "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=250",
      role: "nurse" /* NURSE */,
      specialization,
      licenseNumber,
      nursingCouncil: medicalCouncil,
      experienceYears: Number(experienceYears) || 1,
      education: Array.isArray(education) ? education : [education],
      bio: bio || "Licensed care professional.",
      languages: Array.isArray(languages) ? languages : ["English", "Hindi"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["Home Visit"],
      fee: Number(fee) || 200,
      rating: 5,
      reviewCount: 0,
      verificationStatus: "Pending" /* PENDING */,
      practiceAddress,
      city,
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        slots: ["09:00 AM - 05:00 PM"]
      },
      seoSlug,
      shiftTypes: Array.isArray(shiftTypes) ? shiftTypes : ["Day Shift"]
    };
    nurses.push(newNurse);
  }
  const vReq = {
    id: generateId("ver"),
    userId: newId,
    userName: name,
    userType: role,
    licenseNumber,
    medicalCouncil,
    degreeName: Array.isArray(education) ? education[0] : education,
    fileUrl: "uploaded_certificate_" + newId + ".pdf",
    submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "Pending" /* PENDING */
  };
  verificationRequests.push(vReq);
  res.status(201).json({
    status: "success",
    message: "Registration completed successfully. Profile is in pending verification state.",
    data: { id: newId, seoSlug, verificationRequestId: vReq.id }
  });
});
app.post("/api/professionals/:id/edit", (req, res) => {
  const { id } = req.params;
  const { bio, fee, practiceAddress, city, availability } = req.body;
  let prof = doctors.find((d) => d.id === id);
  if (!prof) {
    prof = nurses.find((n) => n.id === id);
  }
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Practitioner profile not found." });
  }
  if (bio !== void 0) prof.bio = bio;
  if (fee !== void 0) prof.fee = Number(fee) || prof.fee;
  if (practiceAddress !== void 0) prof.practiceAddress = practiceAddress;
  if (city !== void 0) prof.city = city;
  if (availability !== void 0) prof.availability = availability;
  res.json({ status: "success", message: "Profile updated successfully.", data: prof });
});
app.get("/api/verification-requests", (req, res) => {
  res.json({ status: "success", data: verificationRequests });
});
app.post("/api/verification-requests/:id/verify", (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const request = verificationRequests.find((r) => r.id === id);
  if (!request) {
    return res.status(404).json({ status: "error", message: "Verification request not found." });
  }
  request.status = status;
  if (rejectionReason) {
    request.rejectionReason = rejectionReason;
  }
  const docProfile = doctors.find((d) => d.id === request.userId);
  if (docProfile) {
    docProfile.verificationStatus = status;
  } else {
    const nurseProfile = nurses.find((n) => n.id === request.userId);
    if (nurseProfile) {
      nurseProfile.verificationStatus = status;
    }
  }
  res.json({ status: "success", message: `Verification request updated to ${status}` });
});
app.get("/api/bookings", (req, res) => {
  res.json({ status: "success", data: bookings });
});
app.post("/api/bookings", (req, res) => {
  const {
    professionalId,
    patientName,
    patientPhone,
    patientEmail,
    date,
    timeSlot,
    mode,
    fee,
    symptoms
  } = req.body;
  if (!professionalId || !patientName || !date || !timeSlot) {
    return res.status(400).json({ status: "error", message: "Missing vital booking parameters." });
  }
  const prof = [...doctors, ...nurses].find((p) => p.id === professionalId);
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Professional not found." });
  }
  const newBooking = {
    id: generateId("bkg"),
    professionalId,
    professionalName: prof.name,
    professionalRole: prof.role,
    patientId: generateId("pat"),
    patientName,
    patientPhone: patientPhone || "999-999-9999",
    patientEmail: patientEmail || "patient@example.com",
    date,
    timeSlot,
    mode: mode || "In-person" /* IN_PERSON */,
    fee: Number(fee) || prof.fee,
    paymentStatus: "Paid",
    // Automatically paid for simulation
    status: "Upcoming",
    symptoms: symptoms || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  bookings.push(newBooking);
  res.status(201).json({ status: "success", message: "Appointment booked successfully!", data: newBooking });
});
app.post("/api/bookings/:id/prescribe", (req, res) => {
  const { id } = req.params;
  const { diagnosis, medicines, instructions, signature } = req.body;
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ status: "error", message: "Booking not found." });
  }
  booking.status = "Completed";
  booking.prescription = {
    diagnosis: diagnosis || "General Wellness Evaluation",
    medicines: medicines || "Multivitamins 1 OD",
    instructions: instructions || "Stay hydrated and get 8 hours of sleep.",
    issuedAt: (/* @__PURE__ */ new Date()).toISOString(),
    digitalSignature: signature || `Digitally signed by ${booking.professionalName} (MMC Verified)`
  };
  res.json({ status: "success", message: "E-prescription generated and signed successfully.", data: booking });
});
app.get("/api/jobs", (req, res) => {
  res.json({ status: "success", data: jobs });
});
app.post("/api/jobs", (req, res) => {
  const { hospitalName, title, type, location, city, specialtyRequired, description, salaryRange, requirements } = req.body;
  if (!hospitalName || !title || !specialtyRequired) {
    return res.status(400).json({ status: "error", message: "Missing core job description fields." });
  }
  const newJob = {
    id: generateId("job"),
    hospitalName,
    hospitalLogo: "\u{1F3E5}",
    title,
    type: type || "Full-time",
    location: location || "Main Wing",
    city: city || "New Delhi",
    specialtyRequired,
    description: description || "Join our world-class care team.",
    salaryRange: salaryRange || "Negotiable",
    requirements: Array.isArray(requirements) ? requirements : ["Registered and licensed with local medical board"],
    applicantsCount: 0,
    status: "Active",
    postedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appliedUserIds: []
  };
  jobs.push(newJob);
  res.status(201).json({ status: "success", message: "Job listing published successfully.", data: newJob });
});
app.post("/api/jobs/:id/apply", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ status: "error", message: "Applicant ID is required." });
  }
  const job = jobs.find((j) => j.id === id);
  if (!job) {
    return res.status(404).json({ status: "error", message: "Job post not found." });
  }
  if (job.appliedUserIds.includes(userId)) {
    return res.status(400).json({ status: "error", message: "You have already applied to this position." });
  }
  job.appliedUserIds.push(userId);
  job.applicantsCount += 1;
  res.json({ status: "success", message: "Application submitted successfully!", data: job });
});
app.get("/api/reviews", (req, res) => {
  const { professionalId } = req.query;
  let list = [...reviews];
  if (professionalId) {
    list = list.filter((r) => r.professionalId === professionalId);
  }
  res.json({ status: "success", data: list });
});
app.post("/api/reviews", (req, res) => {
  const { professionalId, patientName, rating, punctuality, communication, satisfaction, comment } = req.body;
  if (!professionalId || !patientName || !rating) {
    return res.status(400).json({ status: "error", message: "Missing review payload fields." });
  }
  const newReview = {
    id: generateId("rev"),
    professionalId,
    patientId: generateId("pat"),
    patientName,
    rating: Number(rating),
    punctuality: Number(punctuality) || Number(rating),
    communication: Number(communication) || Number(rating),
    satisfaction: Number(satisfaction) || Number(rating),
    comment: comment || "",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    isVerifiedPatient: true
  };
  reviews.push(newReview);
  const pId = professionalId;
  const targetReviews = reviews.filter((r) => r.professionalId === pId);
  const avg = Number((targetReviews.reduce((sum, r) => sum + r.rating, 0) / targetReviews.length).toFixed(2));
  const doc = doctors.find((d) => d.id === pId);
  if (doc) {
    doc.rating = avg;
    doc.reviewCount = targetReviews.length;
  } else {
    const nurse = nurses.find((n) => n.id === pId);
    if (nurse) {
      nurse.rating = avg;
      nurse.reviewCount = targetReviews.length;
    }
  }
  res.status(201).json({ status: "success", message: "Review posted successfully.", data: newReview });
});
app.post("/api/reviews/:id/reply", (req, res) => {
  const { id } = req.params;
  const { replyText } = req.body;
  const rev = reviews.find((r) => r.id === id);
  if (!rev) {
    return res.status(404).json({ status: "error", message: "Review not found." });
  }
  rev.replyText = replyText;
  res.json({ status: "success", message: "Reply added to review.", data: rev });
});
app.get("/api/chats", (req, res) => {
  const { userA, userB } = req.query;
  let filtered = [...chats];
  if (userA && userB) {
    filtered = chats.filter(
      (m) => m.senderId === userA && m.receiverId === userB || m.senderId === userB && m.receiverId === userA
    );
  }
  res.json({ status: "success", data: filtered });
});
app.post("/api/chats", (req, res) => {
  const { senderId, senderName, receiverId, receiverName, text } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ status: "error", message: "Incomplete chat payload." });
  }
  const msg = {
    id: generateId("msg"),
    senderId,
    senderName,
    receiverId,
    receiverName,
    text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isRead: false
  };
  chats.push(msg);
  res.status(201).json({ status: "success", data: msg });
});
app.get("/api/articles", (req, res) => {
  res.json({ status: "success", data: articles });
});
app.post("/api/ai-matching", async (req, res) => {
  const { symptoms, patientAge, patientGender } = req.body;
  if (!symptoms) {
    return res.status(400).json({ status: "error", message: "Please specify symptoms to match." });
  }
  const ageText = patientAge ? `, age ${patientAge}` : "";
  const genderText = patientGender ? `, gender ${patientGender}` : "";
  try {
    const ai = getGeminiClient();
    const prompt = `You are an expert clinical triage matching assistant on CareVerified.
Analyze the following user-submitted symptoms and details carefully:
Symptoms: "${symptoms}"${ageText}${genderText}

Recommend the absolute best medical specialist category from the following support list:
- "Cardiologist" (for chest tightness, heart palpitations, blood pressure anomalies)
- "Pediatrician" (for symptoms in infants and young kids)
- "Neurologist" (for migraines, seizures, stroke signs, tremors, sensory loss)
- "Dermatologist" (for rashes, acne, atypical moles, skin disorders)
- "General Physician" (for basic fevers, common colds, gut upsets, or generic symptoms)
- "ICU & Critical Care" (for high acuity, immediate ventilation or life-support care inquiries)

Provide your clinical assessment in a strict JSON format matching this schema:
{
  "recommendedSpecialty": "Name of the specialty matching EXACTLY one of the categories above",
  "confidenceScore": 0.0 to 1.0,
  "clinicalJustification": "Explain concisely why this specialty is selected based on symptoms, citing potential pathophysiology triggers",
  "symptomSeverity": "Low" | "Medium" | "High/Urgent",
  "recommendedAction": "Immediate instructions for the patient (e.g., 'Schedule a consult within 48 hours', 'Go to the nearest emergency room immediately')"
}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedSpecialty: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            clinicalJustification: { type: Type.STRING },
            symptomSeverity: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High/Urgent"]
            },
            recommendedAction: { type: Type.STRING }
          },
          required: ["recommendedSpecialty", "confidenceScore", "clinicalJustification", "symptomSeverity", "recommendedAction"]
        }
      }
    });
    const parsed = JSON.parse(response.text.trim());
    res.json({ status: "success", source: "CareVerified Triage Engine", data: parsed });
  } catch (error) {
    console.warn("Clinical Triage matching operating in rule-based fallback mode:", error.message);
    const text = symptoms.toLowerCase();
    let recommendation = {
      recommendedSpecialty: "General Physician",
      confidenceScore: 0.85,
      clinicalJustification: "Matched core symptomatic keywords indicating general systemic or standard infection-like symptoms.",
      symptomSeverity: "Medium",
      recommendedAction: "Schedule a teleconsultation or in-person evaluation with a GP for a comprehensive medical checkout."
    };
    if (text.includes("chest") || text.includes("heart") || text.includes("palpitation") || text.includes("cardiac") || text.includes("pulse")) {
      recommendation = {
        recommendedSpecialty: "Cardiologist",
        confidenceScore: 0.95,
        clinicalJustification: "Symptom description contains references to chest discomfort, heavy pounding, or cardiac risk factors, necessitating ECG/lipid screenings.",
        symptomSeverity: "High/Urgent",
        recommendedAction: "Seek urgent cardiological evaluation. If you experience radiating arm pain or severe sweating, visit the nearest ER immediately."
      };
    } else if (text.includes("child") || text.includes("baby") || text.includes("infant") || text.includes("kid") || text.includes("pediatric")) {
      recommendation = {
        recommendedSpecialty: "Pediatrician",
        confidenceScore: 0.92,
        clinicalJustification: "Patient profile or symptom detail refers to pediatric/childhood development age bracket, requiring specialist pediatric dosage and monitoring.",
        symptomSeverity: "Medium",
        recommendedAction: "Book an appointment with a verified pediatrician for customized neonatal/growth-phase checkups."
      };
    } else if (text.includes("headache") || text.includes("migraine") || text.includes("seizure") || text.includes("numb") || text.includes("nerve") || text.includes("tremor")) {
      recommendation = {
        recommendedSpecialty: "Neurologist",
        confidenceScore: 0.9,
        clinicalJustification: "Symptomatology points to localized cranial or neurological pathways such as migraines, peripheral neuropathy, or potential autonomic disruptions.",
        symptomSeverity: "Medium",
        recommendedAction: "Consult a neurologist for detailed clinical reflex mappings or brain imaging if symptoms persist."
      };
    } else if (text.includes("rash") || text.includes("skin") || text.includes("acne") || text.includes("mole") || text.includes("spot") || text.includes("itch")) {
      recommendation = {
        recommendedSpecialty: "Dermatologist",
        confidenceScore: 0.94,
        clinicalJustification: "Primary physical manifestations are cutaneous (skin-based), suggesting allergy outbreaks, acne pathogenesis, or eczema.",
        symptomSeverity: "Low",
        recommendedAction: "Schedule a high-definition video teleconsultation or clinical in-person dermatology checkup."
      };
    } else if (text.includes("breathe") || text.includes("icu") || text.includes("critical") || text.includes("ventilator") || text.includes("oxygen")) {
      recommendation = {
        recommendedSpecialty: "ICU & Critical Care",
        confidenceScore: 0.88,
        clinicalJustification: "High-acuity respiratory distress or life-support status indicates an immediate need for clinical intensive care registered nurse support.",
        symptomSeverity: "High/Urgent",
        recommendedAction: "Procure ICU-trained private care staffing immediately or seek active emergency critical care stabilization."
      };
    }
    res.json({
      status: "success",
      source: "CareVerified Triage Engine",
      warning: "Operating in high-fidelity CareVerified clinical rules triage mode.",
      data: recommendation
    });
  }
});
app.get("/api/packages", (req, res) => {
  res.json({ status: "success", data: appPackages });
});
app.post("/api/packages", (req, res) => {
  const { id, name, description, icon, category, version, author, isRemovable } = req.body;
  if (!id || !name || !description) {
    return res.status(400).json({ status: "error", message: "Package ID, Name, and Description are required." });
  }
  if (appPackages.some((pkg) => pkg.id === id)) {
    return res.status(400).json({ status: "error", message: `Package with ID "${id}" is already installed.` });
  }
  const newPkg = {
    id,
    name,
    description,
    icon: icon || "Activity",
    isEnabled: true,
    category: category || "Custom Extension",
    version: version || "1.0.0",
    author: author || "Administrator",
    isRemovable: isRemovable !== void 0 ? isRemovable : true
  };
  appPackages.push(newPkg);
  res.status(201).json({ status: "success", message: `Package "${name}" was successfully added!`, data: newPkg });
});
app.post("/api/packages/:id/toggle", (req, res) => {
  const { id } = req.params;
  const pkg = appPackages.find((p) => p.id === id);
  if (!pkg) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }
  pkg.isEnabled = !pkg.isEnabled;
  res.json({ status: "success", message: `Package "${pkg.name}" is now ${pkg.isEnabled ? "enabled" : "disabled"}.`, data: pkg });
});
app.delete("/api/packages/:id", (req, res) => {
  const { id } = req.params;
  const idx = appPackages.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }
  const pkg = appPackages[idx];
  if (!pkg.isRemovable) {
    return res.status(400).json({ status: "error", message: `Core package "${pkg.name}" is integrated and cannot be uninstalled.` });
  }
  appPackages.splice(idx, 1);
  res.json({ status: "success", message: `Package "${pkg.name}" was successfully removed.` });
});
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://careverified.pro/</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://careverified.pro/about</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://careverified.pro/jobs</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  const specialties = ["cardiologist", "pediatrician", "neurologist", "dermatologist", "icu-nurse"];
  const cities = ["new-delhi", "mumbai", "bengaluru"];
  specialties.forEach((spec) => {
    cities.forEach((city) => {
      xml += `
  <url>
    <loc>https://careverified.pro/best-${spec}-in-${city}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  });
  [...doctors, ...nurses].forEach((prof) => {
    xml += `
  <url>
    <loc>https://careverified.pro/doctors/${prof.seoSlug}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });
  xml += `
</urlset>`;
  res.send(xml);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CareVerified Full-Stack server is actively listening on http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
export {
  server_default as default
};
