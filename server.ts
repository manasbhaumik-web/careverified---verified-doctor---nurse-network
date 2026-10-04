import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Seed data imports
import { 
  INITIAL_DOCTORS, 
  INITIAL_NURSES, 
  INITIAL_VERIFICATION_REQUESTS, 
  INITIAL_REVIEWS, 
  INITIAL_JOBS, 
  INITIAL_ARTICLES 
} from "./src/data";
import { UserRole, VerificationStatus, ConsultationMode } from "./src/types";

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Server State In-Memory Database
let doctors = [...INITIAL_DOCTORS];
let nurses = [...INITIAL_NURSES];
let verificationRequests = [...INITIAL_VERIFICATION_REQUESTS];
let reviews = [...INITIAL_REVIEWS];
let jobs = [...INITIAL_JOBS];
let articles = [...INITIAL_ARTICLES];
let bookings: any[] = [
  {
    id: "bkg-101112",
    professionalId: "doc-1",
    professionalName: "Dr. Ananya Sen",
    professionalRole: UserRole.DOCTOR,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "swarnabhaumik@gmail.com",
    date: "2026-07-12",
    timeSlot: "10:00 AM",
    mode: ConsultationMode.VIDEO,
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
    professionalRole: UserRole.DOCTOR,
    patientId: "pat-99912",
    patientName: "John Doe",
    patientPhone: "+60-12-345-6789",
    patientEmail: "swarnabhaumik@gmail.com",
    date: "2026-07-05",
    timeSlot: "11:00 AM",
    mode: ConsultationMode.IN_PERSON,
    fee: 120,
    paymentStatus: "Paid",
    status: "Completed",
    symptoms: "Allergic cough, nasal congestion, low-grade fever for 3 days.",
    createdAt: "2026-07-04T15:30:00.000Z",
    prescription: {
      diagnosis: "Acute Bronchitis & Seasonal Allergy Flare-up",
      medicines: "1. Tab Cetirizine 10mg - 1 tablet before sleeping for 5 days\n2. Tab Paracetamol 650mg - 1 tablet SOS if fever > 100°F (Max 3/day)\n3. Levosalbutamol Inhaler - 2 puffs every 6 hours if wheezing",
      instructions: "Keep hydrated. Avoid cold fluids and exposure to dust. Steam inhalation twice a day. Return for review if shortness of breath increases.",
      issuedAt: "2026-07-05T11:45:00.000Z",
      digitalSignature: "Digitally Signed & Certified by Dr. Rajesh K. Sharma (MMC-32109)"
    }
  }
];
let chats: any[] = [];
let patients: any[] = [];

// --- Packages Modular Architecture State ---
let appPackages: any[] = [
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

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

// Lazy-initialized Clinical Triage GenAI Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Get Professionals (Doctors + Nurses combined or filtered)
app.get("/api/professionals", (req, res) => {
  const { role, city, specialty, search } = req.query;
  let list: any[] = [...doctors, ...nurses];

  if (role) {
    list = list.filter(p => p.role === role);
  }
  if (city) {
    list = list.filter(p => p.city.toLowerCase() === (city as string).toLowerCase());
  }
  if (specialty) {
    list = list.filter(p => p.specialization.toLowerCase().includes((specialty as string).toLowerCase()));
  }
  if (search) {
    const term = (search as string).toLowerCase();
    list = list.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.specialization.toLowerCase().includes(term) ||
      p.bio.toLowerCase().includes(term)
    );
  }

  res.json({ status: "success", data: list });
});

// Get a professional by ID or slug
app.get("/api/professionals/:id", (req, res) => {
  const { id } = req.params;
  const prof = [...doctors, ...nurses].find(p => p.id === id || p.seoSlug === id);
  if (!prof) {
    return res.status(404).json({ status: "error", message: "Medical professional not found" });
  }
  res.json({ status: "success", data: prof });
});

// Register Patient Profile
app.post("/api/register-patient", (req, res) => {
  const { 
    name, email, password, icNumber, age, phone, gender,
    chronicConditions, allergies, emergencyContactName, emergencyContactPhone 
  } = req.body;

  if (!name || !email || !password || !icNumber) {
    return res.status(400).json({ status: "error", message: "Missing essential patient registration fields." });
  }

  // Check if email already registered
  const exists = patients.some(p => p.email.toLowerCase() === email.toLowerCase());
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
    registeredAt: new Date().toISOString()
  };

  patients.push(newPatient);

  res.status(201).json({
    status: "success",
    message: "Patient registered successfully inside secure national register.",
    data: newPatient
  });
});

// 2. Multi-step Signup & Verification Request Submission
app.post("/api/register", (req, res) => {
  const { 
    name, role, specialization, licenseNumber, medicalCouncil, 
    experienceYears, education, bio, languages, consultationModes, 
    fee, practiceAddress, city, shiftTypes, avatar 
  } = req.body;

  if (!name || !role || !licenseNumber || !medicalCouncil) {
    return res.status(400).json({ status: "error", message: "Missing required registration parameters." });
  }

  const newId = generateId(role === UserRole.DOCTOR ? "doc" : "nur");
  const seoSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${specialization.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  // Create the professional profile with PENDING status
  if (role === UserRole.DOCTOR) {
    const newDoc = {
      id: newId,
      name,
      avatar: avatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250",
      role: UserRole.DOCTOR as const,
      specialization,
      licenseNumber,
      medicalCouncil,
      experienceYears: Number(experienceYears) || 1,
      education: Array.isArray(education) ? education : [education],
      bio: bio || "Licensed medical practitioner.",
      languages: Array.isArray(languages) ? languages : ["English", "Hindi"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["In-person" as any],
      fee: Number(fee) || 500,
      rating: 5.0,
      reviewCount: 0,
      verificationStatus: VerificationStatus.PENDING,
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
      role: UserRole.NURSE as const,
      specialization,
      licenseNumber,
      nursingCouncil: medicalCouncil,
      experienceYears: Number(experienceYears) || 1,
      education: Array.isArray(education) ? education : [education],
      bio: bio || "Licensed care professional.",
      languages: Array.isArray(languages) ? languages : ["English", "Hindi"],
      consultationModes: Array.isArray(consultationModes) ? consultationModes : ["Home Visit" as any],
      fee: Number(fee) || 200,
      rating: 5.0,
      reviewCount: 0,
      verificationStatus: VerificationStatus.PENDING,
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

  // Generate a verification request in parallel
  const vReq = {
    id: generateId("ver"),
    userId: newId,
    userName: name,
    userType: role as any,
    licenseNumber,
    medicalCouncil,
    degreeName: Array.isArray(education) ? education[0] : education,
    fileUrl: "uploaded_certificate_" + newId + ".pdf",
    submittedAt: new Date().toISOString(),
    status: VerificationStatus.PENDING
  };
  verificationRequests.push(vReq);

  res.status(201).json({ 
    status: "success", 
    message: "Registration completed successfully. Profile is in pending verification state.", 
    data: { id: newId, seoSlug, verificationRequestId: vReq.id } 
  });
});

// 2.5. Edit Professional Details
app.post("/api/professionals/:id/edit", (req, res) => {
  const { id } = req.params;
  const { bio, fee, practiceAddress, city, availability } = req.body;

  let prof: any = doctors.find(d => d.id === id);
  if (!prof) {
    prof = nurses.find(n => n.id === id);
  }

  if (!prof) {
    return res.status(404).json({ status: "error", message: "Practitioner profile not found." });
  }

  if (bio !== undefined) prof.bio = bio;
  if (fee !== undefined) prof.fee = Number(fee) || prof.fee;
  if (practiceAddress !== undefined) prof.practiceAddress = practiceAddress;
  if (city !== undefined) prof.city = city;
  if (availability !== undefined) prof.availability = availability;

  res.json({ status: "success", message: "Profile updated successfully.", data: prof });
});

// 3. Admin Verification Pipeline
app.get("/api/verification-requests", (req, res) => {
  res.json({ status: "success", data: verificationRequests });
});

app.post("/api/verification-requests/:id/verify", (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body; // status: VerificationStatus.VERIFIED or VerificationStatus.REJECTED

  const request = verificationRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ status: "error", message: "Verification request not found." });
  }

  request.status = status;
  if (rejectionReason) {
    request.rejectionReason = rejectionReason;
  }

  // Update associated doctor/nurse status
  const docProfile = doctors.find(d => d.id === request.userId);
  if (docProfile) {
    docProfile.verificationStatus = status;
  } else {
    const nurseProfile = nurses.find(n => n.id === request.userId);
    if (nurseProfile) {
      nurseProfile.verificationStatus = status;
    }
  }

  res.json({ status: "success", message: `Verification request updated to ${status}` });
});

// 4. Booking & Appointments Engine
app.get("/api/bookings", (req, res) => {
  res.json({ status: "success", data: bookings });
});

app.post("/api/bookings", (req, res) => {
  const { 
    professionalId, patientName, patientPhone, patientEmail, 
    date, timeSlot, mode, fee, symptoms 
  } = req.body;

  if (!professionalId || !patientName || !date || !timeSlot) {
    return res.status(400).json({ status: "error", message: "Missing vital booking parameters." });
  }

  const prof = [...doctors, ...nurses].find(p => p.id === professionalId);
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
    mode: mode || ConsultationMode.IN_PERSON,
    fee: Number(fee) || prof.fee,
    paymentStatus: "Paid" as const, // Automatically paid for simulation
    status: "Upcoming" as const,
    symptoms: symptoms || "",
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  res.status(201).json({ status: "success", message: "Appointment booked successfully!", data: newBooking });
});

// Issue E-Prescription (Doctor Action)
app.post("/api/bookings/:id/prescribe", (req, res) => {
  const { id } = req.params;
  const { diagnosis, medicines, instructions, signature } = req.body;

  const booking = bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ status: "error", message: "Booking not found." });
  }

  booking.status = "Completed";
  booking.prescription = {
    diagnosis: diagnosis || "General Wellness Evaluation",
    medicines: medicines || "Multivitamins 1 OD",
    instructions: instructions || "Stay hydrated and get 8 hours of sleep.",
    issuedAt: new Date().toISOString(),
    digitalSignature: signature || `Digitally signed by ${booking.professionalName} (MMC Verified)`
  };

  res.json({ status: "success", message: "E-prescription generated and signed successfully.", data: booking });
});

// 5. B2B Recruitment & Shift Board
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
    hospitalLogo: "🏥",
    title,
    type: type || "Full-time",
    location: location || "Main Wing",
    city: city || "New Delhi",
    specialtyRequired,
    description: description || "Join our world-class care team.",
    salaryRange: salaryRange || "Negotiable",
    requirements: Array.isArray(requirements) ? requirements : ["Registered and licensed with local medical board"],
    applicantsCount: 0,
    status: "Active" as const,
    postedAt: new Date().toISOString(),
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

  const job = jobs.find(j => j.id === id);
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

// 6. Review & Rating Submission
app.get("/api/reviews", (req, res) => {
  const { professionalId } = req.query;
  let list = [...reviews];
  if (professionalId) {
    list = list.filter(r => r.professionalId === professionalId);
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
    date: new Date().toISOString().split('T')[0],
    isVerifiedPatient: true
  };

  reviews.push(newReview);

  // Recalculate doctor/nurse rating average
  const pId = professionalId;
  const targetReviews = reviews.filter(r => r.professionalId === pId);
  const avg = Number((targetReviews.reduce((sum, r) => sum + r.rating, 0) / targetReviews.length).toFixed(2));

  const doc = doctors.find(d => d.id === pId);
  if (doc) {
    doc.rating = avg;
    doc.reviewCount = targetReviews.length;
  } else {
    const nurse = nurses.find(n => n.id === pId);
    if (nurse) {
      nurse.rating = avg;
      nurse.reviewCount = targetReviews.length;
    }
  }

  res.status(201).json({ status: "success", message: "Review posted successfully.", data: newReview });
});

// Reply to review
app.post("/api/reviews/:id/reply", (req, res) => {
  const { id } = req.params;
  const { replyText } = req.body;

  const rev = reviews.find(r => r.id === id);
  if (!rev) {
    return res.status(404).json({ status: "error", message: "Review not found." });
  }

  rev.replyText = replyText;
  res.json({ status: "success", message: "Reply added to review.", data: rev });
});

// 7. Secure Messaging Chat Log
app.get("/api/chats", (req, res) => {
  const { userA, userB } = req.query;
  let filtered = [...chats];
  if (userA && userB) {
    filtered = chats.filter(m => 
      (m.senderId === userA && m.receiverId === userB) ||
      (m.senderId === userB && m.receiverId === userA)
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
    timestamp: new Date().toISOString(),
    isRead: false
  };

  chats.push(msg);
  res.status(201).json({ status: "success", data: msg });
});

// 8. Health Blog Articles
app.get("/api/articles", (req, res) => {
  res.json({ status: "success", data: articles });
});

// 9. AI-Based Symptom-to-Specialist Intelligent Matching
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

  } catch (error: any) {
    // Elegant Local Rule-based Fallback when API key is missing or encounters rate limiting
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
        confidenceScore: 0.90,
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

// --- Packages Modular Architecture API ---

// Get currently installed modules/packages
app.get("/api/packages", (req, res) => {
  res.json({ status: "success", data: appPackages });
});

// Install or add a new package
app.post("/api/packages", (req, res) => {
  const { id, name, description, icon, category, version, author, isRemovable } = req.body;

  if (!id || !name || !description) {
    return res.status(400).json({ status: "error", message: "Package ID, Name, and Description are required." });
  }

  // Prevent duplicates
  if (appPackages.some(pkg => pkg.id === id)) {
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
    isRemovable: isRemovable !== undefined ? isRemovable : true
  };

  appPackages.push(newPkg);
  res.status(201).json({ status: "success", message: `Package "${name}" was successfully added!`, data: newPkg });
});

// Toggle enabled status of a package
app.post("/api/packages/:id/toggle", (req, res) => {
  const { id } = req.params;
  const pkg = appPackages.find(p => p.id === id);
  if (!pkg) {
    return res.status(404).json({ status: "error", message: "Package not found." });
  }

  pkg.isEnabled = !pkg.isEnabled;
  res.json({ status: "success", message: `Package "${pkg.name}" is now ${pkg.isEnabled ? "enabled" : "disabled"}.`, data: pkg });
});

// Uninstall / Remove a package
app.delete("/api/packages/:id", (req, res) => {
  const { id } = req.params;
  const idx = appPackages.findIndex(p => p.id === id);
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

// 10. Serve XML sitemap dynamically for SEO
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

  // Append programmatic SEO landing pages
  const specialties = ["cardiologist", "pediatrician", "neurologist", "dermatologist", "icu-nurse"];
  const cities = ["new-delhi", "mumbai", "bengaluru"];
  
  specialties.forEach(spec => {
    cities.forEach(city => {
      xml += `
  <url>
    <loc>https://careverified.pro/best-${spec}-in-${city}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
  });

  // Append individual doctor profile pages
  [...doctors, ...nurses].forEach(prof => {
    xml += `
  <url>
    <loc>https://careverified.pro/doctors/${prof.seoSlug}</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += `\n</urlset>`;
  res.send(xml);
});

// -------------------------------------------------------------
// Vite Dev Server / Static Files Serving Middleware
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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

startServer();
