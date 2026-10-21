import { Calendar, Users, FileText, Tag, Building2 } from 'lucide-react';

export type FacilityTab = 'shifts' | 'locums' | 'cases' | 'packages' | 'profile';
export type FacilityTabGroup = 'staffing' | 'care' | 'profile';

export const FACILITY_GROUPS: Record<FacilityTabGroup, {
  name: string;
  defaultTab: FacilityTab;
  tabs: { id: FacilityTab; label: string; icon: any; count?: number }[];
}> = {
  staffing: {
    name: 'Clinical Staffing & Shifts',
    defaultTab: 'shifts',
    tabs: [
      { id: 'shifts', label: 'Job Postings & Vacancies', icon: Calendar },
      { id: 'locums', label: 'Practitioner Network', icon: Users },
    ],
  },
  care: {
    name: 'Patient Referrals & Packages',
    defaultTab: 'cases',
    tabs: [
      { id: 'cases', label: 'Patient Referrals & Quotes', icon: FileText },
      { id: 'packages', label: 'Packages & Promotions', icon: Tag },
    ],
  },
  profile: {
    name: 'Facility & Infrastructure',
    defaultTab: 'profile',
    tabs: [
      { id: 'profile', label: 'Facility Profile & Infrastructure', icon: Building2 },
    ],
  },
};

export interface FacilityWorkspaceProps {
  activeGroup?: FacilityTabGroup;
  initialTab?: FacilityTab;
  currentUser?: any;
  embedded?: boolean;
}

export interface MedicalPackage {
  id: string;
  facility_id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  priceMyr: number;
  originalPriceMyr: number | null;
  target_audience: 'all' | 'local' | 'international';
  fastingRequired: boolean;
  inclusions: string[];
  exclusions?: string;
  preparation_instructions?: string;
  image_url?: string;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  created_at: string;
}

export interface MedicalPromotion {
  id: string;
  facility_id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discountValueMyr?: number | null;
  package_id?: string | null;
  package_title?: string;
  badge_text?: string;
  valid_from: string;
  valid_until: string;
  terms?: string;
  status: 'active' | 'paused' | 'expired';
  created_at: string;
}

export interface FacilityProfile {
  id: string;
  name: string;
  kind: string;
  city: string;
  state: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  licenceNo: string;
  licenceExpiry: string;
  licenceCheckedAt: string;
  licenceReference: string;
  isLicenceValid: boolean;
  accreditations: Array<{ body: string; number: string; validUntil: string; reference?: string }>;
  specialties: string[];
  services: Record<string, boolean>;
  mhtcMember: boolean;
  active: boolean;
  billingPreference?: 'escrow' | 'invoice';
  corporateCreditApproved?: boolean;
  corporateCreditLimitMyr?: number;
  billingContactEmail?: string;
  sstRegistrationNo?: string;
}

export interface FacilityStats {
  activeVacancies: number;
  pendingApplicants: number;
  acceptedLocums: number;
  patientCases: number;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  applicantName: string;
  applicantRole: string;
  applicantLicense: string | null;
  applicantApcExpiry: string | null;
  applicantRate: number | null;
  specialization: string;
  experienceYears: number;
  rating: number;
  avatar: string;
  status: 'pending' | 'accepted' | 'declined';
  appliedAt: string;
  decisionAt: string | null;
  decisionBy: string | null;
  decisionNotes: string | null;
  billingMode?: 'escrow' | 'invoice';
  paymentStatus?: 'unbilled' | 'escrow_held' | 'released' | 'invoiced' | 'invoice_settled';
  shiftWageMyr?: number | null;
  platformFeeMyr?: number | null;
  totalBillingMyr?: number | null;
  escrowHeldAt?: string | null;
  escrowReleasedAt?: string | null;
  invoiceNumber?: string | null;
  invoiceDueDate?: string | null;
  paymentRef?: string | null;
  scheduledHours?: number;
  actualHours?: number | null;
  timesheetStatus?: string;
}

export interface FacilityJob {
  id: string;
  title: string;
  hospitalName: string;
  type: string;
  sector?: string;
  roleRequired?: 'doctor' | 'nurse' | 'any';
  specialtyRequired: string;
  salaryRange: string;
  location: string;
  city: string;
  status: 'Active' | 'Closed';
  postedAt: string;
  applicantsCount: number;
  applications: Application[];
  pendingCount: number;
  acceptedCount: number;
  requirements: string[];
  description: string;
}

export interface LocumProfile {
  profileId: string;
  name: string;
  role: 'doctor' | 'nurse';
  specialization: string;
  languages: string[];
  city: string;
  states: string[];
  specialties: string[];
  minRate: number | null;
  ratePeriod: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  note: string | null;
  registry: string | null;
  registeredInMalaysia: boolean;
  apcValidUntil: string | null;
  apcStatus: 'valid' | 'expiring' | 'expired' | 'none';
  verified: boolean;
}

export interface PatientCase {
  id: string;
  trackingCode?: string;
  status: string;
  summary: string;
  patient: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  patientType?: 'local_malaysian' | 'expat_resident' | 'international_traveler';
  assistanceType?: string;
  urgency?: 'routine' | 'priority' | 'urgent';
  country: string;
  insuranceCarrier?: string | null;
  guaranteeLetter?: boolean;
  revisionNotes?: string | null;
  specialty?: string;
  preferredFrom?: string;
  preferredTo?: string;
  needs?: Record<string, any>;
  quotesCount?: number;
  latestQuote?: {
    id: string;
    version: number;
    total: number;
    status: string;
    validUntil: string;
  } | null;
  referralCommissionMyr?: number | null;
  commissionRatePct?: number | null;
  commissionStatus?: string | null;
  commissionInvoiceNo?: string | null;
  commissionInvoicedAt?: string | null;
  commissionSettledAt?: string | null;
  dischargeSummary?: string | null;
  updatedAt: string;
  createdAt?: string;
}

export interface ReferralLedgerCase {
  id: string;
  patient: string;
  country: string;
  specialty: string;
  status: string;
  updatedAt: string;
  finalQuotationMyr: number;
  referralCommissionMyr: number;
  commissionRatePct: number;
  commissionStatus: 'pending' | 'invoiced' | 'settled';
  commissionInvoiceNo: string | null;
  commissionInvoicedAt: string | null;
  commissionSettledAt: string | null;
}

export interface ReferralLedgerData {
  cases: ReferralLedgerCase[];
  summary: {
    totalInvoicedMyr: number;
    totalSettledMyr: number;
    totalPendingMyr: number;
    commissionRatePct: number;
  };
}

export interface PackageOrder {
  id: string;
  package_id: string;
  package_title: string;
  package_code: string;
  package_category: string;
  facility_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_country?: string;
  preferred_date?: string;
  promo_code?: string;
  notes?: string;
  package_price_myr: number;
  deposit_collected_myr: number;
  balance_due_myr: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}
