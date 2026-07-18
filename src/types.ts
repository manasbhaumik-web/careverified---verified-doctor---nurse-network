export enum UserRole {
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PATIENT = 'patient',
  HOSPITAL = 'hospital',
  ADMIN = 'admin'
}

export enum VerificationStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified ✅',
  REJECTED = 'Rejected',
  SUSPENDED = 'Suspended'
}

export enum ConsultationMode {
  IN_PERSON = 'In-person',
  VIDEO = 'Video Telehealth',
  HOME_VISIT = 'Home Visit'
}

export interface DoctorProfile {
  id: string;
  name: string;
  avatar: string;
  role: UserRole.DOCTOR;
  specialization: string;
  licenseNumber: string;
  medicalCouncil: string;
  experienceYears: number;
  education: string[];
  bio: string;
  languages: string[];
  consultationModes: ConsultationMode[];
  fee: number;
  rating: number;
  reviewCount: number;
  verificationStatus: VerificationStatus;
  practiceAddress: string;
  city: string;
  availability: {
    days: string[];
    slots: string[];
  };
  seoSlug: string;
}

export interface NurseProfile {
  id: string;
  name: string;
  avatar: string;
  role: UserRole.NURSE;
  specialization: string; // e.g. "ICU Care", "Geriatric Care", "Pediatrics"
  licenseNumber: string;
  nursingCouncil: string;
  experienceYears: number;
  education: string[];
  bio: string;
  languages: string[];
  consultationModes: ConsultationMode[];
  fee: number; // e.g. hourly rate
  rating: number;
  reviewCount: number;
  verificationStatus: VerificationStatus;
  practiceAddress: string;
  city: string;
  availability: {
    days: string[];
    slots: string[];
  };
  seoSlug: string;
  shiftTypes: string[]; // e.g. "Day Shift", "Night Shift", "24-Hour Care"
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userType: UserRole.DOCTOR | UserRole.NURSE;
  licenseNumber: string;
  medicalCouncil: string;
  degreeName: string;
  fileUrl: string;
  submittedAt: string;
  status: VerificationStatus;
  rejectionReason?: string;
}

export interface Review {
  id: string;
  professionalId: string;
  patientId: string;
  patientName: string;
  rating: number; // 1-5
  punctuality: number; // 1-5
  communication: number; // 1-5
  satisfaction: number; // 1-5
  comment: string;
  date: string;
  replyText?: string;
  isVerifiedPatient: boolean;
}

export interface Booking {
  id: string;
  professionalId: string;
  professionalName: string;
  professionalRole: UserRole.DOCTOR | UserRole.NURSE;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  date: string;
  timeSlot: string;
  mode: ConsultationMode;
  fee: number;
  paymentStatus: 'Pending' | 'Paid' | 'Refunded';
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  symptoms?: string;
  prescription?: {
    diagnosis: string;
    medicines: string;
    instructions: string;
    issuedAt: string;
    digitalSignature: string;
  };
}

export interface JobPost {
  id: string;
  hospitalName: string;
  hospitalLogo: string;
  title: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Shift-based';
  location: string;
  city: string;
  specialtyRequired: string;
  description: string;
  salaryRange: string;
  requirements: string[];
  applicantsCount: number;
  status: 'Active' | 'Closed';
  postedAt: string;
  appliedUserIds: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  authorId: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string;
  authorCredentialsVerified: boolean;
  date: string;
  citations: string[];
  faq: { question: string; answer: string; }[];
}

// SEO Schemas Structure
export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  schemaJson: string; // JSON-LD string
}

export interface AppPackage {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  isEnabled: boolean;
  category: string;
  version: string;
  author: string;
  isRemovable: boolean;
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  icNumber: string;
  age: number;
  phone: string;
  gender: string;
  chronicConditions: string[];
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  registeredAt: string;
}

export interface OnCallDispatch {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientPhone: string;
  patientGender: string;
  isEmergency: boolean;
  isElderly: boolean;
  dispatchAddress: string;
  symptoms: string[];
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  fee: number;
  paymentId: string;
  paymentStatus: 'Pending' | 'Paid';
  dispatchStatus: 'Pending Dispatch' | 'En-Route' | 'Arrived' | 'Completed';
  etaMinutes: number;
  createdAt: string;
}

export interface PaymentReceipt {
  paymentId: string;
  amount: number;
  currency: string;
  status: 'Success' | 'Failed';
  transactionHash: string;
  cardType: string;
  last4: string;
  customerName: string;
  purpose: string;
  timestamp: string;
}


