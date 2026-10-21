import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Calendar, Users, ShieldCheck, CheckCircle2, XCircle, Plus,
  Search, FileText, Send, Phone, Mail, MapPin, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, Stethoscope, Check,
  MessageSquare, Lock, DollarSign, Tag, PackagePlus, Sparkles, Clock,
  Trash2, Edit3, Copy, HeartPulse, AlertCircle, BadgeCheck, Receipt,
  Printer, Download, CreditCard, LifeBuoy
} from 'lucide-react';
import DashboardHeader, {
  BannerRow, BannerIdentity, BannerBadge, BannerKpis, DashboardTab, bannerPrimaryBtn
} from './DashboardHeader';
import WorkspaceHeader from './WorkspaceHeader';
import FacilityShiftsTab from './facility/FacilityShiftsTab';
import FacilityLocumsTab from './facility/FacilityLocumsTab';
import FacilityCasesTab from './facility/FacilityCasesTab';
import { FacilityPackagesTab } from './facility/FacilityPackagesTab';
import { FacilityProfileTab } from './facility/FacilityProfileTab';
import { FacilityModals } from './facility/FacilityModals';

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

type Tab = FacilityTab;

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

interface FacilityProfile {
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

interface FacilityStats {
  activeVacancies: number;
  pendingApplicants: number;
  acceptedLocums: number;
  patientCases: number;
}

interface Application {
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

interface FacilityJob {
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

interface LocumProfile {
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

interface PatientCase {
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

interface ReferralLedgerCase {
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

interface ReferralLedgerData {
  cases: ReferralLedgerCase[];
  summary: {
    totalInvoicedMyr: number;
    totalSettledMyr: number;
    totalPendingMyr: number;
    commissionRatePct: number;
  };
}

interface PackageOrder {
  id: string;
  package_id: string;
  package_title: string;
  package_code: string;
  package_category: string;
  facility_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_country: string;
  preferred_date: string | null;
  total_price_myr: number;
  deposit_pct: number;
  deposit_amount_myr: number;
  remaining_payable_myr: number;
  promo_code: string | null;
  discount_amount_myr: number;
  payment_method: string;
  payment_status: string;
  deposit_payment_ref: string;
  hospital_confirmation_status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
}

interface FacilityMessage {
  id: string;
  jobId: string;
  applicantUserId: string;
  senderUserId: string;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
  mine: boolean;
}

export default function FacilityWorkspace({ activeGroup, initialTab, currentUser, embedded = false }: FacilityWorkspaceProps = {}) {
  const currentGroup: FacilityTabGroup = activeGroup || (
    initialTab ? (
      (['cases', 'packages'].includes(initialTab)) ? 'care' :
      (initialTab === 'profile') ? 'profile' : 'staffing'
    ) : 'staffing'
  );

  const [tab, setTab] = useState<FacilityTab>(initialTab || FACILITY_GROUPS[currentGroup].defaultTab);

  useEffect(() => {
    if (activeGroup) {
      const allowed = FACILITY_GROUPS[activeGroup].tabs.map(t => t.id);
      if (!allowed.includes(tab)) {
        setTab(initialTab && allowed.includes(initialTab) ? initialTab : FACILITY_GROUPS[activeGroup].defaultTab);
      }
    } else if (initialTab) {
      setTab(initialTab);
    }
  }, [activeGroup, initialTab]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facility, setFacility] = useState<FacilityProfile | null>(null);
  const [stats, setStats] = useState<FacilityStats>({
    activeVacancies: 0, pendingApplicants: 0, acceptedLocums: 0, patientCases: 0,
  });

  // Shifts / Jobs state
  const [jobs, setJobs] = useState<FacilityJob[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Closed'>('all');
  const [jobSearch, setJobSearch] = useState('');

  // Decision Modal state (Accept / Decline)
  const [decisionModal, setDecisionModal] = useState<{
    jobId: string;
    applicant: Application;
    action: 'accepted' | 'declined';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // New Job Modal state
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobRole, setNewJobRole] = useState<'doctor' | 'nurse' | 'any'>('doctor');
  const [newJobType, setNewJobType] = useState('Locum');
  const [newJobSpecialty, setNewJobSpecialty] = useState('');
  const [newJobSalaryMin, setNewJobSalaryMin] = useState('80');
  const [newJobSalaryMax, setNewJobSalaryMax] = useState('120');
  const [newJobSalaryPeriod, setNewJobSalaryPeriod] = useState('hour');
  const [newJobLocation, setNewJobLocation] = useState('Emergency Department / Main Wing');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSubmitting, setNewJobSubmitting] = useState(false);

  // Locums / Practitioner Directory state
  const [locums, setLocums] = useState<LocumProfile[]>([]);
  const [locumSearch, setLocumSearch] = useState('');
  const [locumRoleFilter, setLocumRoleFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [inviteModal, setInviteModal] = useState<LocumProfile | null>(null);
  const [inviteMessage, setInviteMessage] = useState('Greetings. Our medical facility would like to invite you for upcoming clinical locum coverage.');
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Coordination Chat Modal state
  const [chatModal, setChatModal] = useState<{
    jobId: string;
    jobTitle: string;
    applicantUserId: string;
    applicantName: string;
    applicantRole: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<FacilityMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  // Patient Referral Cases & Commission Ledger state
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [casesSubTab, setCasesSubTab] = useState<'referrals' | 'ledger'>('referrals');
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('all');
  const [referralLedger, setReferralLedger] = useState<ReferralLedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ReferralLedgerCase | null>(null);
  const [quoteModal, setQuoteModal] = useState<PatientCase | null>(null);
  const [quoteProcedure, setQuoteProcedure] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDays, setQuoteDays] = useState('2');
  const [quoteInclusions, setQuoteInclusions] = useState('');
  const [quoteExclusions, setQuoteExclusions] = useState('Excludes extra ICU days, complications, international flights.');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // Medical Packages, Promotions & Orders state
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [promotions, setPromotions] = useState<MedicalPromotion[]>([]);
  const [packageOrders, setPackageOrders] = useState<PackageOrder[]>([]);
  const [packageSubTab, setPackageSubTab] = useState<'packages' | 'promotions' | 'orders'>('packages');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('All');
  const [packageStatusFilter, setPackageStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [packageSearch, setPackageSearch] = useState('');

  // Package Modal State (Publish / Edit)
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [pkgCode, setPkgCode] = useState('');
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgCategory, setPkgCategory] = useState('Health Screening');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgDuration, setPkgDuration] = useState('1 Day Outpatient');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgOriginalPrice, setPkgOriginalPrice] = useState('');
  const [pkgAudience, setPkgAudience] = useState<'all' | 'local' | 'international'>('all');
  const [pkgFasting, setPkgFasting] = useState(false);
  const [pkgInclusions, setPkgInclusions] = useState<string[]>([]);
  const [pkgInclusionInput, setPkgInclusionInput] = useState('');
  const [pkgExclusions, setPkgExclusions] = useState('');
  const [pkgPreparation, setPkgPreparation] = useState('');
  const [pkgImageUrl, setPkgImageUrl] = useState('/assets/clean_light_doctor_suite_full.jpg');
  const [pkgStatus, setPkgStatus] = useState<'published' | 'draft'>('published');
  const [pkgSubmitting, setPkgSubmitting] = useState(false);

  // Promotion Modal State (Create / Edit)
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoType, setPromoType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoValue, setPromoValue] = useState('');
  const [promoPkgId, setPromoPkgId] = useState('');
  const [promoBadge, setPromoBadge] = useState('');
  const [promoValidFrom, setPromoValidFrom] = useState('');
  const [promoValidUntil, setPromoValidUntil] = useState('');
  const [promoTerms, setPromoTerms] = useState('');
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  // Facility Infrastructure State
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [amenitiesList, setAmenitiesList] = useState<string[]>([]);
  const [newEquipmentInput, setNewEquipmentInput] = useState('');
  const [newAmenityInput, setNewAmenityInput] = useState('');
  const [infraSaving, setInfraSaving] = useState(false);

  // Facility Billing Preference & Escrow State
  const [billingPref, setBillingPref] = useState<'escrow' | 'invoice'>('escrow');
  const [billingEmail, setBillingEmail] = useState('');
  const [sstNo, setSstNo] = useState('');
  const [billingSaving, setBillingSaving] = useState(false);

  // Notification feedback
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFacilityData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facility/me');
      const data = await res.json();
      if (data.status === 'success') {
        setFacility(data.data.facility);
        setStats(data.data.stats);
        if (data.data.facility?.billingPreference) {
          setBillingPref(data.data.facility.billingPreference);
        }
        if (data.data.facility?.billingContactEmail) {
          setBillingEmail(data.data.facility.billingContactEmail);
        }
        if (data.data.facility?.sstRegistrationNo) {
          setSstNo(data.data.facility.sstRegistrationNo);
        }
      } else {
        setError(data.message || 'Unable to load facility profile');
      }

      const jobsRes = await fetch('/api/facility/jobs');
      const jobsData = await jobsRes.json();
      if (jobsData.status === 'success') {
        setJobs(jobsData.data);
        if (jobsData.data.length > 0 && !expandedJobId) {
          setExpandedJobId(jobsData.data[0].id);
        }
      }

      // Fetch verified locum practitioners
      const locRes = await fetch('/api/locums');
      const locData = await locRes.json();
      if (locData.status === 'success') {
        setLocums(locData.data);
      }

      // Fetch facility referral cases & commission ledger
      const casesRes = await fetch('/api/facility/cases');
      const casesData = await casesRes.json();
      if (casesData.status === 'success') {
        setCases(casesData.data);
      }

      const ledgerRes = await fetch('/api/facility/referral-ledger');
      const ledgerData = await ledgerRes.json();
      if (ledgerData.status === 'success') {
        setReferralLedger(ledgerData.data);
      }

      // Fetch facility package orders
      const ordersRes = await fetch('/api/facility/package-orders');
      const ordersData = await ordersRes.json();
      if (ordersData.status === 'success') {
        setPackageOrders(ordersData.data);
      }

      // Fetch facility packages
      const pkgRes = await fetch('/api/packages?status=all');
      const pkgData = await pkgRes.json();
      if (pkgData.status === 'success') {
        setPackages(pkgData.data);
      }

      // Fetch facility promotions
      const promoRes = await fetch('/api/promotions');
      const promoData = await promoRes.json();
      if (promoData.status === 'success') {
        setPromotions(promoData.data);
      }

      // Fetch facility infrastructure
      const infraRes = await fetch('/api/facility/infrastructure');
      const infraData = await infraRes.json();
      if (infraData.status === 'success') {
        setEquipmentList(infraData.data.equipment || []);
        setAmenitiesList(infraData.data.amenities || []);
      }
    } catch {
      setError('Server communication error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [expandedJobId]);

  useEffect(() => {
    loadFacilityData();
  }, [loadFacilityData]);

  // Handle Accept or Decline Application
  const handleDecisionSubmit = async () => {
    if (!decisionModal) return;
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/facility/jobs/${decisionModal.jobId}/applicants/${decisionModal.applicant.userId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionModal.action,
          notes: decisionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({
          type: 'success',
          text: decisionModal.action === 'accepted'
            ? `Application accepted! ${decisionModal.applicant.applicantName} confirmed for shift.`
            : `Application from ${decisionModal.applicant.applicantName} declined.`,
        });
        setDecisionModal(null);
        setDecisionNotes('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not process decision.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Handle Update Job Status (Active / Closed)
  const handleUpdateJobStatus = async (jobId: string, nextStatus: 'Active' | 'Closed') => {
    try {
      const res = await fetch(`/api/facility/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Job listing status updated to "${nextStatus}".` });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not update job status.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  // Handle Post New Job Vacancy
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobSpecialty.trim()) {
      setNotificationMsg({ type: 'error', text: 'Please fill in all mandatory job fields.' });
      return;
    }
    setNewJobSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: facility?.name || 'Medical Centre',
          title: newJobTitle.trim(),
          type: newJobType,
          sector: 'private',
          roleRequired: newJobRole,
          specialtyRequired: newJobSpecialty.trim(),
          salaryMin: Number(newJobSalaryMin) || null,
          salaryMax: Number(newJobSalaryMax) || null,
          salaryPeriod: newJobSalaryPeriod,
          location: newJobLocation.trim(),
          city: facility?.city || 'Kuala Lumpur',
          state: facility?.state || 'Kuala Lumpur',
          description: newJobDesc.trim() || `Licensed clinical facility seeking credentialed ${newJobRole} for medical coverage.`,
          facilityId: facility?.id,
          acceptsForeign: false,
          visaSupport: false,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Job vacancy "${newJobTitle}" published successfully!` });
        setShowNewJobModal(false);
        setNewJobTitle('');
        setNewJobSpecialty('');
        setNewJobDesc('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not publish job opening.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setNewJobSubmitting(false);
    }
  };

  // Handle Invite Locum Practitioner to Job
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModal) return;
    setInviteSubmitting(true);
    try {
      const res = await fetch(`/api/locums/${inviteModal.profileId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inviteMessage.trim(),
          jobId: inviteJobId || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInviteSuccess(`Invitation sent to ${inviteModal.name}.`);
        setTimeout(() => {
          setInviteSuccess('');
          setInviteModal(null);
        }, 1800);
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not send invitation.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle Coordination Chat with Applicant
  const handleOpenChat = async (jobId: string, jobTitle: string, app: Application) => {
    setChatModal({
      jobId,
      jobTitle,
      applicantUserId: app.userId,
      applicantName: app.applicantName,
      applicantRole: app.applicantRole,
    });
    setChatLoading(true);
    try {
      const res = await fetch(`/api/facility/jobs/${jobId}/applicants/${app.userId}/messages`);
      const data = await res.json();
      if (data.status === 'success') {
        setChatMessages(data.data);
      }
    } catch {
      console.error('Failed to load coordination messages');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatModal || !chatInput.trim()) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/facility/jobs/${chatModal.jobId}/applicants/${chatModal.applicantUserId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setChatMessages(prev => [...prev, data.data]);
        setChatInput('');
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Failed to send message.' });
    } finally {
      setChatSending(false);
    }
  };

  // Handle Treatment Quotation for Patient Referral Case
  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModal || !quoteProcedure.trim() || !quoteAmount) return;
    setQuoteSubmitting(true);
    try {
      const res = await fetch(`/api/facility/cases/${quoteModal.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureName: quoteProcedure.trim(),
          totalAmountMyr: Number(quoteAmount),
          estimatedStayDays: Number(quoteDays) || 1,
          inclusions: quoteInclusions.trim() || undefined,
          exclusions: quoteExclusions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setQuoteModal(null);
        setQuoteProcedure('');
        setQuoteAmount('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not issue quote.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, status: string) => {
    try {
      const res = await fetch(`/api/facility/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  // Handle Confirm Package Order / Deposit Reservation
  const handleConfirmPackageOrder = async (orderId: string, status = 'confirmed') => {
    try {
      const res = await fetch(`/api/facility/package-orders/${orderId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message || `Package reservation updated to ${status}.` });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not update package reservation.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error updating package order.' });
    }
  };

  // Handle Create or Update Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgTitle.trim() || !pkgPrice) return;
    setPkgSubmitting(true);
    try {
      const payload = {
        code: pkgCode.trim() || undefined,
        title: pkgTitle.trim(),
        category: pkgCategory,
        description: pkgDescription.trim(),
        duration: pkgDuration.trim(),
        priceMyr: Number(pkgPrice),
        originalPriceMyr: pkgOriginalPrice ? Number(pkgOriginalPrice) : null,
        targetAudience: pkgAudience,
        fastingRequired: pkgFasting,
        inclusions: pkgInclusions,
        exclusions: pkgExclusions.trim() || undefined,
        preparationInstructions: pkgPreparation.trim() || undefined,
        imageUrl: pkgImageUrl.trim() || undefined,
        status: pkgStatus,
      };

      const url = editingPackageId ? `/api/packages/${editingPackageId}` : '/api/packages';
      const method = editingPackageId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setPackageModalOpen(false);
        setEditingPackageId(null);
        resetPackageForm();
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Error saving package.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setPkgSubmitting(false);
    }
  };

  const resetPackageForm = () => {
    setPkgCode('');
    setPkgTitle('');
    setPkgCategory('Health Screening');
    setPkgDescription('');
    setPkgDuration('1 Day Outpatient');
    setPkgPrice('');
    setPkgOriginalPrice('');
    setPkgAudience('all');
    setPkgFasting(false);
    setPkgInclusions([]);
    setPkgInclusionInput('');
    setPkgExclusions('');
    setPkgPreparation('');
    setPkgImageUrl('/assets/clean_light_doctor_suite_full.jpg');
    setPkgStatus('published');
  };

  const handleEditPackage = (pkg: MedicalPackage) => {
    setEditingPackageId(pkg.id);
    setPkgCode(pkg.code);
    setPkgTitle(pkg.title);
    setPkgCategory(pkg.category);
    setPkgDescription(pkg.description);
    setPkgDuration(pkg.duration);
    setPkgPrice(String(pkg.priceMyr));
    setPkgOriginalPrice(pkg.originalPriceMyr ? String(pkg.originalPriceMyr) : '');
    setPkgAudience(pkg.target_audience);
    setPkgFasting(pkg.fastingRequired);
    setPkgInclusions(pkg.inclusions || []);
    setPkgExclusions(pkg.exclusions || '');
    setPkgPreparation(pkg.preparation_instructions || '');
    setPkgImageUrl(pkg.image_url || '/assets/clean_light_doctor_suite_full.jpg');
    setPkgStatus(pkg.status === 'published' ? 'published' : 'draft');
    setPackageModalOpen(true);
  };

  const handleTogglePackageStatus = async (pkg: MedicalPackage) => {
    const nextStatus = pkg.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Package marked as ${nextStatus}.` });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medical package?')) return;
    try {
      const res = await fetch(`/api/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  // Handle Create or Update Promotion
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || !promoTitle.trim() || !promoValue) return;
    setPromoSubmitting(true);
    try {
      const payload = {
        code: promoCode.trim().toUpperCase(),
        title: promoTitle.trim(),
        description: promoDesc.trim(),
        discountType: promoType,
        discountValue: Number(promoValue),
        packageId: promoPkgId || null,
        badgeText: promoBadge.trim() || undefined,
        validFrom: promoValidFrom || undefined,
        validUntil: promoValidUntil || undefined,
        terms: promoTerms.trim() || undefined,
      };

      const url = editingPromoId ? `/api/promotions/${editingPromoId}` : '/api/promotions';
      const method = editingPromoId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setPromoModalOpen(false);
        setEditingPromoId(null);
        resetPromoForm();
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Error saving promotion.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setPromoSubmitting(false);
    }
  };

  const resetPromoForm = () => {
    setPromoCode('');
    setPromoTitle('');
    setPromoDesc('');
    setPromoType('percentage');
    setPromoValue('');
    setPromoPkgId('');
    setPromoBadge('');
    setPromoValidFrom('');
    setPromoValidUntil('');
    setPromoTerms('');
  };

  const handleEditPromo = (pr: MedicalPromotion) => {
    setEditingPromoId(pr.id);
    setPromoCode(pr.code);
    setPromoTitle(pr.title);
    setPromoDesc(pr.description);
    setPromoType(pr.discount_type);
    setPromoValue(String(pr.discount_type === 'fixed' ? (pr.discountValueMyr || pr.discount_value / 100) : pr.discount_value));
    setPromoPkgId(pr.package_id || '');
    setPromoBadge(pr.badge_text || '');
    setPromoValidFrom(pr.valid_from);
    setPromoValidUntil(pr.valid_until);
    setPromoTerms(pr.terms || '');
    setPromoModalOpen(true);
  };

  const handleTogglePromoStatus = async (pr: MedicalPromotion) => {
    const nextStatus = pr.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/promotions/${pr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Promotion marked as ${nextStatus}.` });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    }
  };

  // Handle Save Facility Infrastructure
  const handleSaveInfrastructure = async () => {
    setInfraSaving(true);
    try {
      const res = await fetch('/api/facility/infrastructure', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment: equipmentList,
          amenities: amenitiesList,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not save infrastructure.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setInfraSaving(false);
    }
  };

  // Handle Save Facility Billing & Settlement Settings
  const handleSaveBillingSettings = async () => {
    setBillingSaving(true);
    try {
      const res = await fetch('/api/facility/billing-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingPreference: billingPref,
          billingContactEmail: billingEmail.trim() || undefined,
          sstRegistrationNo: sstNo.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not update billing settings.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBillingSaving(false);
    }
  };

  // Approve locum timesheet
  const handleApproveTimesheet = async (jobId: string, app: Application) => {
    try {
      const res = await fetch(`/api/facility/jobs/${jobId}/applications/${app.id}/approve-timesheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: app.actualHours }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message || 'Timesheet approved.' });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Failed to approve timesheet.' });
    }
  };

  const displayedTabs: DashboardTab<Tab>[] = FACILITY_GROUPS[currentGroup].tabs.map(t => {
    if (t.id === 'shifts') return { ...t, count: stats.activeVacancies };
    if (t.id === 'locums') return { ...t, count: locums.length };
    if (t.id === 'cases') return { ...t, count: stats.patientCases };
    if (t.id === 'packages') return { ...t, count: packages.length };
    return t;
  });

  const filteredJobs = jobs.filter(j => {
    if (jobFilter === 'doctor' && j.roleRequired !== 'doctor') return false;
    if (jobFilter === 'nurse' && j.roleRequired !== 'nurse') return false;
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.specialtyRequired.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredLocums = locums.filter(l => {
    if (locumRoleFilter !== 'all' && l.role !== locumRoleFilter) return false;
    if (locumSearch.trim()) {
      const q = locumSearch.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.specialization.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.states?.some(s => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredCases = cases.filter(c => {
    if (caseStatusFilter === 'all') return true;
    return c.status === caseStatusFilter;
  });

  const facilityHelpTab = (
    <div className="flex items-center h-full">
      <span className="w-px h-5 bg-[color:var(--t-200)] mr-2 self-center hidden sm:inline-block" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        id="tab-facility-help"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }));
        }}
        className="shrink-0 min-h-[48px] px-3.5 sm:px-4 text-xs flex items-center gap-2 cursor-pointer border-b border-transparent transition-colors font-medium text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]"
        title="Facility Help & Support Desk"
      >
        <LifeBuoy className="h-4 w-4 text-slate-500" />
        <span className="whitespace-nowrap font-medium sm:font-semibold">Help & Support</span>
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-0" id="facility-workspace-root">
      {/* Main Facility Banner */}
      {!embedded && (
        <DashboardHeader
          fullWidth={true}
          tabs={displayedTabs}
          activeTab={tab}
          onTabChange={setTab}
          tabsLabel={`${FACILITY_GROUPS[currentGroup].name} sections`}
          tabsRight={facilityHelpTab}
        >
          <BannerRow
            identity={
              <BannerIdentity
                as="h1"
                avatarUrl={currentUser?.avatarUrl || '/assets/facility_director_male.jpg'}
                role="facility"
                name={facility?.name || 'Healthcare Facility & Clinic'}
                badges={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <BannerBadge tone="brand">{FACILITY_GROUPS[currentGroup].name}</BannerBadge>
                    <span className="bg-slate-50 text-slate-700 border border-slate-300 text-2xs font-black uppercase px-2.5 py-0.5 rounded-none inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">
                      {facility?.kind || 'Medical Centre'}
                    </span>
                    {facility?.isLicenceValid && (
                      <BannerBadge tone="success">
                        <ShieldCheck className="h-3 w-3 inline mr-1" />
                        Act 586 Licensed
                      </BannerBadge>
                    )}
                    {facility?.mhtcMember && (
                      <BannerBadge tone="brand">
                        MHTC Medical Travel
                      </BannerBadge>
                    )}
                  </div>
                }
                description={
                  <span>
                    {facility?.city || 'Kuala Lumpur'}, {facility?.state || 'Malaysia'} • Licence: {facility?.licenceNo || 'Act 586 Verified'} • {facility?.phone || '+60 3-2296 0888'}
                  </span>
                }
              />
            }
            aside={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <BannerKpis
                  items={[
                    { label: 'Active Jobs', value: stats.activeVacancies },
                    { label: 'Applicants', value: stats.pendingApplicants },
                    { label: 'Confirmed', value: stats.acceptedLocums },
                    { label: 'Referrals', value: stats.patientCases },
                  ]}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadFacilityData}
                    disabled={loading}
                    className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50 h-11 w-11 flex items-center justify-center"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewJobModal(true)}
                    className={bannerPrimaryBtn}
                  >
                    <Plus className="h-4 w-4" />
                    Post Job Vacancy
                  </button>
                </div>
              </div>
            }
          />
        </DashboardHeader>
      )}

      {/* Main Inner Workspace Content Container */}
      <div className={embedded ? "space-y-6" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
        {/* Toast / Status Notification */}
        {notificationMsg && (
          <div
            role="status"
            className={`p-4 border text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 border-l-4 border-l-emerald-600'
                : 'bg-rose-50 text-rose-800 border-rose-300 border-l-4 border-l-rose-600'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {notificationMsg.type === 'success' ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
              )}
              <span className="leading-snug">{notificationMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificationMsg(null)}
              className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer shrink-0 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading & Error States */}
        {loading && !facility && (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2 bg-white border border-[color:var(--t-200)] shadow-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-[color:var(--t-600)]" />
            Loading clinical network workspace…
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 border-l-4 border-l-rose-600 shadow-xs">
            {error}
          </div>
        )}

        {/* Main Tab Panels Wrapper */}
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: CLINICAL JOB POSTINGS & APPLICANTS */}
          {/* ========================================================================= */}
          {tab === 'shifts' && (
            <FacilityShiftsTab
              embedded={embedded}
              displayedTabs={displayedTabs}
              tab={tab}
              setTab={setTab}
              jobSearch={jobSearch}
              setJobSearch={setJobSearch}
              jobFilter={jobFilter}
              setJobFilter={setJobFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filteredJobs={filteredJobs}
              expandedJobId={expandedJobId}
              setExpandedJobId={setExpandedJobId}
              onPostJob={() => setShowNewJobModal(true)}
              onUpdateJobStatus={handleUpdateJobStatus}
              onOpenDecision={(jobId, app, action) => {
                setDecisionNotes('');
                setDecisionModal({ app, action });
              }}
              onApproveTimesheet={handleApproveTimesheet}
              onOpenChat={handleOpenChat}
            />
          )}

          {tab === 'locums' && (
            <FacilityLocumsTab
              embedded={embedded}
              displayedTabs={displayedTabs}
              tab={tab}
              setTab={setTab}
              locumSearch={locumSearch}
              setLocumSearch={setLocumSearch}
              locumRoleFilter={locumRoleFilter}
              setLocumRoleFilter={setLocumRoleFilter}
              filteredLocums={filteredLocums}
              onInviteLocum={(locum) => {
                setInviteModal(locum);
                setInviteSuccess('');
                setInviteJobId(jobs[0]?.id || '');
              }}
            />
          )}

          {tab === 'cases' && (
            <FacilityCasesTab
              cases={cases}
              casesSubTab={casesSubTab}
              setCasesSubTab={setCasesSubTab}
              caseStatusFilter={caseStatusFilter}
              setCaseStatusFilter={setCaseStatusFilter}
              filteredCases={filteredCases}
              referralLedger={referralLedger}
              onOpenQuoteModal={(c) => {
                setQuoteModal(c);
                setQuoteProcedure(c.specialty ? `${c.specialty} Treatment Package` : 'Clinical Procedure Package');
                setQuoteAmount(c.latestQuote ? String(c.latestQuote.total) : '5500');
                setQuoteDays('3');
                setQuoteInclusions('Specialist surgical team, standard ward accommodation (3 nights), intraoperative consumables, standard recovery medication.');
                setQuoteExclusions('Emergency complications requiring ICU transfer, take-home pharmaceuticals beyond 7 days, specialized implant hardware if non-standard.');
              }}
              onUpdateCaseStatus={handleUpdateCaseStatus}
              onSelectInvoice={setSelectedInvoice}
            />
          )}

          {tab === 'packages' && (
            <FacilityPackagesTab
              packages={packages}
              promotions={promotions}
              orders={packageOrders}
              onOpenNewPackageModal={() => {
                resetPackageForm();
                setEditingPackageId(null);
                setPackageModalOpen(true);
              }}
              onOpenNewPromoModal={() => {
                resetPromoForm();
                setEditingPromoId(null);
                setPromoModalOpen(true);
              }}
              onEditPackage={handleEditPackage}
              onDeletePackage={handleDeletePackage}
              onTogglePackageStatus={handleTogglePackageStatus}
              onEditPromo={handleEditPromo}
              onDeletePromo={handleDeletePromo}
              onTogglePromoStatus={handleTogglePromoStatus}
              onConfirmPackageOrder={handleConfirmPackageOrder}
            />
          )}

          {tab === 'profile' && (
            <FacilityProfileTab
              facility={facility}
              equipmentList={equipmentList}
              setEquipmentList={setEquipmentList}
              newEquipmentInput={newEquipmentInput}
              setNewEquipmentInput={setNewEquipmentInput}
              amenitiesList={amenitiesList}
              setAmenitiesList={setAmenitiesList}
              newAmenityInput={newAmenityInput}
              setNewAmenityInput={setNewAmenityInput}
              billingPref={billingPref}
              setBillingPref={setBillingPref}
              billingEmail={billingEmail}
              setBillingEmail={setBillingEmail}
              sstNo={sstNo}
              setSstNo={setSstNo}
              handleSaveInfrastructure={handleSaveInfrastructure}
              infraSaving={infraSaving}
              handleSaveBillingSettings={handleSaveBillingSettings}
              billingSaving={billingSaving}
              setNotificationMsg={setNotificationMsg}
            />
          )}
        </div>
      </div>

      <FacilityModals
        facility={facility}
        jobs={jobs}
        decisionModal={decisionModal}
        setDecisionModal={setDecisionModal}
        decisionNotes={decisionNotes}
        setDecisionNotes={setDecisionNotes}
        actionSubmitting={actionSubmitting}
        handleDecisionSubmit={handleDecisionSubmit}
        showNewJobModal={showNewJobModal}
        setShowNewJobModal={setShowNewJobModal}
        newJobTitle={newJobTitle}
        setNewJobTitle={setNewJobTitle}
        newJobRole={newJobRole}
        setNewJobRole={setNewJobRole}
        newJobType={newJobType}
        setNewJobType={setNewJobType}
        newJobSpecialty={newJobSpecialty}
        setNewJobSpecialty={setNewJobSpecialty}
        newJobSalaryMin={newJobSalaryMin}
        setNewJobSalaryMin={setNewJobSalaryMin}
        newJobSalaryMax={newJobSalaryMax}
        setNewJobSalaryMax={setNewJobSalaryMax}
        newJobSalaryPeriod={newJobSalaryPeriod}
        setNewJobSalaryPeriod={setNewJobSalaryPeriod}
        newJobLocation={newJobLocation}
        setNewJobLocation={setNewJobLocation}
        newJobDesc={newJobDesc}
        setNewJobDesc={setNewJobDesc}
        newJobSubmitting={newJobSubmitting}
        handleCreateJob={handleCreateJob}
        inviteModal={inviteModal}
        setInviteModal={setInviteModal}
        inviteMessage={inviteMessage}
        setInviteMessage={setInviteMessage}
        inviteJobId={inviteJobId}
        setInviteJobId={setInviteJobId}
        inviteSubmitting={inviteSubmitting}
        inviteSuccess={inviteSuccess ? true : false}
        handleInviteSubmit={handleInviteSubmit}
        chatModal={chatModal ? chatModal.applicant : null}
        setChatModal={(val) => {
          if (!val) setChatModal(null);
        }}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatLoading={chatLoading}
        chatSending={chatSending}
        handleSendChatMessage={handleSendChatMessage}
        quoteModal={quoteModal}
        setQuoteModal={setQuoteModal}
        quoteProcedure={quoteProcedure}
        setQuoteProcedure={setQuoteProcedure}
        quoteAmount={quoteAmount}
        setQuoteAmount={setQuoteAmount}
        quoteDays={quoteDays}
        setQuoteDays={setQuoteDays}
        quoteInclusions={quoteInclusions}
        setQuoteInclusions={setQuoteInclusions}
        quoteExclusions={quoteExclusions}
        setQuoteExclusions={setQuoteExclusions}
        quoteSubmitting={quoteSubmitting}
        handleQuoteSubmit={handleQuoteSubmit}
        packages={packages}
        packageModalOpen={packageModalOpen}
        setPackageModalOpen={setPackageModalOpen}
        editingPackageId={editingPackageId}
        pkgCode={pkgCode}
        setPkgCode={setPkgCode}
        pkgTitle={pkgTitle}
        setPkgTitle={setPkgTitle}
        pkgCategory={pkgCategory}
        setPkgCategory={setPkgCategory}
        pkgDescription={pkgDescription}
        setPkgDescription={setPkgDescription}
        pkgDuration={pkgDuration}
        setPkgDuration={setPkgDuration}
        pkgPrice={pkgPrice}
        setPkgPrice={setPkgPrice}
        pkgOriginalPrice={pkgOriginalPrice}
        setPkgOriginalPrice={setPkgOriginalPrice}
        pkgAudience={pkgAudience}
        setPkgAudience={setPkgAudience}
        pkgFasting={pkgFasting}
        setPkgFasting={setPkgFasting}
        pkgInclusions={pkgInclusions}
        setPkgInclusions={setPkgInclusions}
        pkgInclusionInput={pkgInclusionInput}
        setPkgInclusionInput={setPkgInclusionInput}
        pkgPreparation={pkgPreparation}
        setPkgPreparation={setPkgPreparation}
        pkgStatus={pkgStatus}
        setPkgStatus={setPkgStatus}
        pkgSubmitting={pkgSubmitting}
        handleSavePackage={handleSavePackage}
        promoModalOpen={promoModalOpen}
        setPromoModalOpen={setPromoModalOpen}
        editingPromoId={editingPromoId}
        promoCode={promoCode}
        setPromoCode={setPromoCode}
        promoTitle={promoTitle}
        setPromoTitle={setPromoTitle}
        promoDesc={promoDesc}
        setPromoDesc={setPromoDesc}
        promoType={promoType}
        setPromoType={setPromoType}
        promoValue={promoValue}
        setPromoValue={setPromoValue}
        promoPkgId={promoPkgId}
        setPromoPkgId={setPromoPkgId}
        promoBadge={promoBadge}
        setPromoBadge={setPromoBadge}
        promoValidFrom={promoValidFrom}
        setPromoValidFrom={setPromoValidFrom}
        promoValidUntil={promoValidUntil}
        setPromoValidUntil={setPromoValidUntil}
        promoSubmitting={promoSubmitting}
        handleSavePromo={handleSavePromo}
        selectedInvoice={selectedInvoice}
        setSelectedInvoice={setSelectedInvoice}
      />
    </div>
  );
}
