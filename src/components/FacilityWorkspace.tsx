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
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Calendar}
              eyebrow="Clinical Human Capital · Act 586 Staffing"
              title="Clinical Job Postings, Locum Shifts & Applications"
              description="Recruit credentialed doctors, staff nurses, and allied healthcare practitioners with automated regulatory license checks."
              badges={<BannerBadge tone="success"><ShieldCheck className="h-3 w-3 inline mr-1 text-emerald-600" /> Act 586 Staffing Compliant</BannerBadge>}
              tabs={embedded && displayedTabs.length > 1 ? displayedTabs : undefined}
              activeTab={tab}
              onTabChange={setTab}
              aside={embedded ? (
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(true)}
                  className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Post Job Vacancy</span>
                </button>
              ) : undefined}
            />
            {/* Filter & Search Bar */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[260px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search job postings by title, specialty, ward or location…"
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Role:</span>
                <button
                  type="button"
                  onClick={() => setJobFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    jobFilter === 'all'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilter('doctor')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    jobFilter === 'doctor'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Doctors
                </button>
                <button
                  type="button"
                  onClick={() => setJobFilter('nurse')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    jobFilter === 'nurse'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Nurses
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Status:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Active')}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                    statusFilter === 'Active' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Closed')}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                    statusFilter === 'Closed' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>

            {/* Job Listings */}
            {filteredJobs.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-12 text-center text-xs text-slate-500 space-y-3">
                <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No job openings found matching your filter criteria.</p>
                <p>Create a new clinical vacancy to invite verified doctors and nurses across Malaysia.</p>
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(true)}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  + Post Job Vacancy
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const applications = job.applications || [];

                  return (
                    <div
                      key={job.id}
                      className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-400)] transition-all"
                    >
                      {/* Job Header */}
                      <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-2xs uppercase font-black tracking-wider px-2 py-0.5 border ${
                              job.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {job.status}
                            </span>
                            <span className="text-2xs uppercase font-black tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                              {job.type}
                            </span>
                            <span className="text-2xs uppercase font-black tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">
                              {job.roleRequired === 'doctor' ? 'Doctor' : job.roleRequired === 'nurse' ? 'Nurse' : 'Specialist'}
                            </span>
                            <span className="text-xs font-bold text-[color:var(--t-700)]">
                              {job.specialtyRequired}
                            </span>
                          </div>

                          <h3 className="text-base font-black text-slate-900 tracking-tight">
                            {job.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {job.location} ({job.city})
                            </span>
                            <span>•</span>
                            <span className="font-extrabold text-slate-800 font-mono">
                              {job.salaryRange}
                            </span>
                            <span>•</span>
                            <span>Posted {new Date(job.postedAt).toLocaleDateString('en-MY')}</span>
                          </div>

                          {job.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">
                              {job.description}
                            </p>
                          )}
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateJobStatus(job.id, job.status === 'Active' ? 'Closed' : 'Active')}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          >
                            {job.status === 'Active' ? 'Close Listing' : 'Reopen Listing'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Applicants ({applications.length})</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Applicants List Accordion */}
                      {isExpanded && (
                        <div className="p-5 bg-slate-50/70 space-y-3 border-t border-slate-100">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">
                              Applications for this Vacancy ({applications.length})
                            </h4>
                            <span className="text-xs text-slate-500">
                              {job.pendingCount} Pending Review • {job.acceptedCount} Confirmed
                            </span>
                          </div>

                          {applications.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 bg-white border border-dashed border-slate-200">
                              No practitioners have applied for this vacancy yet. You can invite qualified doctors and nurses directly from the Practitioner Network tab.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {applications.map((app) => (
                                <div
                                  key={app.id}
                                  className="bg-white border border-slate-200 p-4 space-y-3"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-900">{app.applicantName}</span>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-2xs font-extrabold uppercase">
                                          {app.applicantRole}
                                        </span>
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-2xs font-black uppercase border border-emerald-200">
                                          APC Active
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                        <span>Reg: <strong className="font-mono text-slate-800">{app.applicantLicense || 'MMC/LJM Verified'}</strong></span>
                                        <span>•</span>
                                        <span>Specialty: <strong className="text-slate-800">{app.specialization}</strong></span>
                                        <span>•</span>
                                        <span>Exp: <strong className="text-slate-800">{app.experienceYears} yrs</strong></span>
                                        <span>•</span>
                                        <span>Applied {new Date(app.appliedAt).toLocaleDateString('en-MY')}</span>
                                      </div>
                                    </div>

                                      {/* Action Buttons & Payment Status */}
                                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                                        {app.status === 'pending' ? (
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'accepted' })}
                                              className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border border-[color:var(--t-700)] shadow-xs"
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                              Accept
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'declined' })}
                                              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer"
                                            >
                                              <XCircle className="h-3.5 w-3.5" />
                                              Decline
                                            </button>
                                          </div>
                                        ) : app.status === 'accepted' ? (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-2xs font-black uppercase border border-emerald-300 flex items-center gap-1">
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                              Accepted & Confirmed
                                            </span>
                                            {app.paymentStatus === 'escrow_held' ? (
                                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-2xs font-bold border border-blue-300 flex items-center gap-1">
                                                <Lock className="h-3 w-3 text-blue-600" />
                                                Escrow Held: RM {app.totalBillingMyr ? app.totalBillingMyr.toFixed(2) : '---'}
                                              </span>
                                            ) : app.paymentStatus === 'released' ? (
                                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 text-2xs font-bold border border-emerald-300 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                Escrow Released (Paid)
                                              </span>
                                            ) : app.paymentStatus === 'invoiced' ? (
                                              <span className="px-2 py-0.5 bg-purple-50 text-purple-900 text-2xs font-bold border border-purple-300 flex items-center gap-1">
                                                <FileText className="h-3 w-3 text-purple-600" />
                                                Net-30 Invoiced ({app.invoiceNumber || 'Pending'})
                                              </span>
                                            ) : null}
                                            <button
                                              type="button"
                                              onClick={() => handleOpenChat(job.id, job.title, app)}
                                              className="px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1 cursor-pointer"
                                            >
                                              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                              Direct Message
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-2xs font-bold">
                                            Declined
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Financial & Settlement Breakdown for Accepted Shifts */}
                                    {app.status === 'accepted' && (
                                      <div className="bg-slate-50 border border-slate-200 p-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
                                        <div className="flex flex-wrap items-center gap-4 text-slate-700">
                                          <div>
                                            <span className="text-slate-500 font-medium">Billing Mode: </span>
                                            <strong className="text-slate-900 uppercase font-black">{app.billingMode === 'invoice' ? 'Corporate Net-30 Invoice' : 'Upfront Escrow Deposit'}</strong>
                                          </div>
                                          <div>
                                            <span className="text-slate-500 font-medium">Practitioner Wage: </span>
                                            <strong className="text-emerald-700 font-mono font-bold">RM {app.shiftWageMyr ? app.shiftWageMyr.toFixed(2) : ((app.applicantRate || 80) * (app.scheduledHours || 8)).toFixed(2)}</strong>
                                          </div>
                                          <div>
                                            <span className="text-slate-500 font-medium">Platform Fee: </span>
                                            <strong className="text-slate-800 font-mono font-bold">RM {app.platformFeeMyr ? app.platformFeeMyr.toFixed(2) : '40.00'}</strong>
                                          </div>
                                          {app.paymentRef && (
                                            <div>
                                              <span className="text-slate-500 font-medium">Payment Ref: </span>
                                              <span className="font-mono text-slate-700">{app.paymentRef}</span>
                                            </div>
                                          )}
                                        </div>
                                        {app.invoiceDueDate && (
                                          <div className="text-xs text-purple-700 font-semibold">
                                            Net-30 Due Date: {app.invoiceDueDate}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {app.decisionNotes && (
                                      <div className="text-xs text-slate-600 bg-slate-50 p-2 border border-slate-200 font-mono">
                                        Decision Note: {app.decisionNotes}
                                      </div>
                                    )}
                                  </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: VERIFIED PRACTITIONER DIRECTORY & DIRECT INVITATIONS */}
        {/* ========================================================================= */}
        {tab === 'locums' && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Users}
              eyebrow="Practitioner Directory · On-Demand Talent"
              title="Verified Doctor & Nurse Talent Network"
              description="Directly source and engage credentialed doctors and nurses with active APC registration for scheduled shifts and emergency relief."
              badges={<BannerBadge tone="brand">MMC / LJM Verified</BannerBadge>}
              tabs={embedded && displayedTabs.length > 1 ? displayedTabs : undefined}
              activeTab={tab}
              onTabChange={setTab}
            />
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[280px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search practitioners by doctor name, specialty, state, or city…"
                  value={locumSearch}
                  onChange={e => setLocumSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Role:</span>
                <button
                  type="button"
                  onClick={() => setLocumRoleFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    locumRoleFilter === 'all'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setLocumRoleFilter('doctor')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    locumRoleFilter === 'doctor'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700'
                  }`}
                >
                  Doctors
                </button>
                <button
                  type="button"
                  onClick={() => setLocumRoleFilter('nurse')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${
                    locumRoleFilter === 'nurse'
                      ? 'bg-[color:var(--t-600)] text-white'
                      : 'bg-white border border-[color:var(--t-200)] text-slate-700'
                  }`}
                >
                  Nurses
                </button>
              </div>
            </div>

            {filteredLocums.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-12 text-center text-xs text-slate-500">
                No verified medical practitioners found matching search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocums.map(loc => (
                  <div
                    key={loc.profileId}
                    className="bg-white border border-[color:var(--t-200)] p-4 flex flex-col justify-between space-y-4 hover:border-[color:var(--t-400)] transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">{loc.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-2xs font-extrabold uppercase">
                              {loc.role}
                            </span>
                          </div>
                          <span className="text-xs text-[color:var(--t-700)] font-black block mt-0.5">
                            {loc.specialization}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-black uppercase tracking-wider border border-emerald-300 shrink-0">
                          APC Active
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        <div>Registry: <strong className="font-mono text-slate-800">{loc.registry || 'MMC Registered'}</strong></div>
                        <div>APC Expiry: <strong className="text-slate-800">{loc.apcValidUntil || '2029-12-31'}</strong></div>
                        <div>Available: <strong className="text-slate-800">{loc.states?.join(', ') || loc.city || 'Kuala Lumpur'}</strong></div>
                        {loc.minRate && (
                          <div className="text-xs font-black text-[color:var(--t-700)]">
                            Expected Rate: RM {loc.minRate} / {loc.ratePeriod || 'hour'}
                          </div>
                        )}
                      </div>

                      {loc.note && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 border border-slate-100 italic">
                          "{loc.note}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setInviteModal(loc)}
                      className="w-full py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider border border-[color:var(--t-700)] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Invite to Shift
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PATIENT REFERRALS & TREATMENT QUOTES */}
        {/* ========================================================================= */}
        {tab === 'cases' && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Building2}
              eyebrow="Clinical Logistics & Patient Intake"
              title="Patient Referrals, Quotations & Facilitator Ledger"
              description="Manage cross-border medical referrals, issue formal treatment quotes, and track automated 8% institutional facilitator success fees."
              badges={<BannerBadge tone="brand">MHTC Coordinated</BannerBadge>}
              tabs={[
                { id: 'referrals', label: 'Inbound Referrals', count: cases.length },
                { id: 'ledger', label: 'Commission Ledger (8% Fee)', count: referralLedger?.cases.length || 0 },
              ]}
              activeTab={casesSubTab}
              onTabChange={(t) => setCasesSubTab(t as any)}
            />

              {/* ------------------------------------------------------------------- */}
              {/* SUB-TAB 1: INBOUND REFERRALS & TREATMENT QUOTES */}
              {/* ------------------------------------------------------------------- */}
              {casesSubTab === 'referrals' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-extrabold uppercase text-slate-400">Filter Status:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {['all', 'enquiry', 'quoted', 'accepted', 'in_treatment', 'completed'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setCaseStatusFilter(st)}
                          className={`px-2.5 py-1 text-xs font-bold uppercase cursor-pointer ${
                            caseStatusFilter === st
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredCases.length === 0 ? (
                    <div className="p-12 bg-slate-50 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-200">
                      <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No active patient referral cases found.</p>
                      <p className="text-xs text-slate-500">Inbound clinical referral inquiries and cross-border consultations will appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200">
                      {filteredCases.map(c => (
                        <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{c.patient}</span>
                              {c.trackingCode && (
                                <span className="font-mono text-2xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5">
                                  {c.trackingCode}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-2xs font-extrabold uppercase border ${
                                c.patientType === 'international_traveler'
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : c.patientType === 'expat_resident'
                                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}>
                                {c.patientType === 'international_traveler' ? '✈️ Int’l Traveler' : c.patientType === 'expat_resident' ? '🌏 Expat Resident' : '🇲🇾 Local Citizen'}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-2xs font-extrabold uppercase">
                                Origin: {c.country}
                              </span>
                              {c.urgency && c.urgency !== 'routine' && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-300 text-2xs font-black uppercase">
                                  {c.urgency === 'urgent' ? '🚨 Urgent' : '⚡ Priority'}
                                </span>
                              )}
                              {c.guaranteeLetter && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-2xs font-black uppercase">
                                  LOG / Direct Billing
                                </span>
                              )}
                              {c.specialty && (
                                <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-2xs font-black uppercase border border-[color:var(--t-200)]">
                                  {c.specialty}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 text-2xs font-black uppercase border ${
                                c.status === 'quoted'
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : c.status === 'accepted'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : c.status === 'in_treatment'
                                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                                  : c.status === 'completed'
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}>
                                {c.status.replace('_', ' ')}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
                              {c.summary}
                            </p>

                            {c.revisionNotes && (
                              <div className="p-2 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                                <span className="font-black text-amber-800 uppercase text-xs">⚠️ Patient Requested Revision:</span>
                                <span>"{c.revisionNotes}"</span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              <span>Case ID: <code className="font-mono text-slate-600 font-bold">{c.id}</code></span>
                              {c.patientEmail && <span>Contact: <strong className="text-slate-600">{c.patientEmail}</strong></span>}
                              {c.insuranceCarrier && <span>Insurance: <strong className="text-slate-600">{c.insuranceCarrier}</strong></span>}
                              {c.preferredFrom && <span>Requested: <strong className="text-slate-600">{c.preferredFrom}</strong></span>}
                              <span>Updated: {new Date(c.updatedAt).toLocaleDateString('en-MY')}</span>
                            </div>

                            {c.latestQuote && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                                <span className="font-bold text-emerald-900">Current Treatment Quotation (v{c.latestQuote.version}):</span>
                                <span className="font-mono font-black text-emerald-800 text-xs">
                                  RM {c.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}

                            {/* Completed Case: Facilitator Success-Fee Invoice Callout */}
                            {c.status === 'completed' && c.commissionInvoiceNo && (
                              <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                                  <span>Hospital Facilitator Invoice: <strong className="font-mono text-emerald-300">{c.commissionInvoiceNo}</strong></span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-300">
                                    Success Fee (8%): <strong>RM {c.referralCommissionMyr?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</strong>
                                  </span>
                                  <span className={`text-2xs font-black uppercase px-2 py-0.5 ${
                                    c.commissionStatus === 'settled' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
                                  }`}>
                                    {c.commissionStatus || 'Invoiced'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quotation & Status Actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {c.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuoteModal(c);
                                  setQuoteProcedure(c.specialty ? `${c.specialty} Treatment Package` : 'Clinical Procedure Package');
                                  setQuoteAmount(c.latestQuote ? String(c.latestQuote.total) : '5500');
                                }}
                                className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-xs"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                {c.latestQuote ? 'Update Quote' : 'Issue Treatment Quote'}
                              </button>
                            )}

                            <div className="flex items-center gap-1">
                              {c.status === 'quoted' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCaseStatus(c.id, 'accepted')}
                                  className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 cursor-pointer"
                                >
                                  Mark Accepted
                                </button>
                              )}
                              {c.status === 'accepted' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCaseStatus(c.id, 'in_treatment')}
                                  className="px-2 py-1 text-xs font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] border border-[color:var(--t-200)] cursor-pointer"
                                >
                                  Admit / In Treatment
                                </button>
                              )}
                              {c.status === 'in_treatment' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCaseStatus(c.id, 'completed')}
                                  className="px-2 py-1 text-xs font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Discharge & Invoice Fee
                                </button>
                              )}
                              {c.status === 'completed' && c.commissionInvoiceNo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const ledgerItem = referralLedger?.cases.find(lc => lc.id === c.id);
                                    if (ledgerItem) setSelectedInvoice(ledgerItem);
                                  }}
                                  className="px-2 py-1 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 cursor-pointer flex items-center gap-1"
                                >
                                  <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                                  View Invoice
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* SUB-TAB 2: AUTOMATED REFERRAL COMMISSION LEDGER */}
              {/* ------------------------------------------------------------------- */}
              {casesSubTab === 'ledger' && (
                <div className="space-y-5">
                  
                  {/* Healthcare Regulatory Compliance Banner */}
                  <div className="p-4 bg-slate-900 text-white space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                      <h4 className="font-black text-sm uppercase tracking-wider text-emerald-300">
                        Malaysian Medical Act 1971 & MMC Ethical Code Compliance Notice
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All success fees recorded below are <strong>strictly institutional facilitation fees</strong> payable by the healthcare facility to CareVerified for patient coordination, cross-border second opinions, and medical logistics. <strong>Doctor professional consultation fees are never discounted, split, or shared</strong>, fully compliant with Section 28 of the Malaysian Medical Act 1971.
                    </p>
                  </div>

                  {/* Financial KPI Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200">
                      <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Total Discharged Referrals</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {referralLedger?.cases.length || 0}
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">Admitted & successfully treated</span>
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-mono font-bold uppercase text-emerald-700 block">Institutional Success Fee Rate</span>
                      <div className="text-2xl font-black text-emerald-900 mt-1">
                        {referralLedger?.summary.commissionRatePct || 8.0}%
                      </div>
                      <span className="text-xs text-emerald-700 mt-0.5 block">Fixed Act 586 institutional rate</span>
                    </div>

                    <div className="p-4 bg-white border-2 border-slate-900">
                      <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Total Invoiced Fees (MYR)</span>
                      <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                        RM {referralLedger?.summary.totalInvoicedMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">Generated upon patient discharge</span>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200">
                      <span className="text-xs font-mono font-bold uppercase text-amber-800 block">Pending Settlement (MYR)</span>
                      <div className="text-2xl font-black text-amber-900 mt-1 tabular-nums">
                        RM {referralLedger?.summary.totalPendingMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}
                      </div>
                      <span className="text-xs text-amber-700 mt-0.5 block">Awaiting monthly facility remittance</span>
                    </div>
                  </div>

                  {/* Discharged Cases Ledger Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Discharged Patient Referral & Commission Register
                      </h3>
                      <button
                        type="button"
                        onClick={loadFacilityData}
                        className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh Ledger
                      </button>
                    </div>

                    {!referralLedger || referralLedger.cases.length === 0 ? (
                      <div className="p-12 bg-slate-50 text-center text-xs text-slate-500 border border-dashed border-slate-200 space-y-2">
                        <Receipt className="h-8 w-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">No discharged patient referral records in the ledger yet.</p>
                        <p className="text-xs text-slate-500">
                          When a patient completes treatment and the facility admissions desk clicks "Complete & Discharge", the 8% facilitator commission and official invoice number will be generated here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-extrabold text-xs uppercase tracking-wider">
                              <th className="p-3">Patient & Origin</th>
                              <th className="p-3">Clinical Specialty</th>
                              <th className="p-3">Discharge Date</th>
                              <th className="p-3 text-right">Hospital Quotation (MYR)</th>
                              <th className="p-3 text-right">8% Success Fee (MYR)</th>
                              <th className="p-3">Invoice Number</th>
                              <th className="p-3">Settlement</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {referralLedger.cases.map(lc => (
                              <tr key={lc.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3">
                                  <strong className="text-slate-900 block font-bold">{lc.patient}</strong>
                                  <span className="text-xs text-slate-500">{lc.country}</span>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-2xs font-black uppercase border border-[color:var(--t-200)]">
                                    {lc.specialty || 'General Care'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 font-mono text-xs">
                                  {new Date(lc.updatedAt).toLocaleDateString('en-MY')}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                  RM {lc.finalQuotationMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono font-black text-emerald-800 tabular-nums">
                                  RM {lc.referralCommissionMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3">
                                  <code className="font-mono text-xs font-black text-[color:var(--t-700)] bg-slate-100 px-1.5 py-0.5">
                                    {lc.commissionInvoiceNo || 'Pending'}
                                  </code>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 text-2xs font-black uppercase ${
                                    lc.commissionStatus === 'settled'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}>
                                    {lc.commissionStatus}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(lc)}
                                    className="px-2.5 py-1 text-xs font-bold border border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer flex items-center gap-1 ml-auto"
                                  >
                                    <FileText className="h-3 w-3 text-slate-500" />
                                    Invoice Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PUBLISH & MANAGE MEDICAL PACKAGES & PROMOTIONS */}
        {/* ========================================================================= */}
        {tab === 'packages' && (
          <div className="space-y-6">
            <WorkspaceHeader
              icon={PackagePlus}
              eyebrow="Direct Hospital Care · Public Directory"
              title="Medical Packages & Promotional Offers"
              description="Publish clinical health checkups, surgical packages, and seasonal promotional codes across the care network."
              badges={<BannerBadge tone="brand">MOH Approved</BannerBadge>}
              aside={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetPackageForm();
                      setEditingPackageId(null);
                      setPackageModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Publish Medical Package</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetPromoForm();
                      setEditingPromoId(null);
                      setPromoModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <Tag className="h-3.5 w-3.5 text-amber-600" />
                    <span>Create Promotion</span>
                  </button>
                </div>
              }
              tabs={[
                { id: 'packages', label: 'Medical Packages', count: packages.length },
                { id: 'promotions', label: 'Promotions & Campaign Codes', count: promotions.length },
                { id: 'orders', label: 'Package requests', count: packageOrders.length },
              ]}
              activeTab={packageSubTab}
              onTabChange={(t) => setPackageSubTab(t as any)}
            />

            {/* Sub-tab 1: Medical Packages */}
            {packageSubTab === 'packages' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-[color:var(--t-200)] p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={packageSearch}
                      onChange={e => setPackageSearch(e.target.value)}
                      placeholder="Search packages by title or code…"
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <select
                    value={packageCategoryFilter}
                    onChange={e => setPackageCategoryFilter(e.target.value)}
                    className="p-1.5 text-xs border border-slate-200 bg-white"
                  >
                    {['All', 'Health Screening', 'Cardiology', 'Orthopaedics', 'Maternity', 'Fertility', 'Oncology', 'Ophthalmology', 'Dental', 'Surgery', 'Aesthetics'].map(c => (
                      <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                    ))}
                  </select>

                  <select
                    value={packageStatusFilter}
                    onChange={e => setPackageStatusFilter(e.target.value as any)}
                    className="p-1.5 text-xs border border-slate-200 bg-white"
                  >
                    <option value="all">All Publishing Statuses</option>
                    <option value="published">Published (Live to Patients)</option>
                    <option value="draft">Draft / Unpublished</option>
                  </select>
                </div>

                {/* Package Cards Grid */}
                {packages.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-dashed border-slate-300 space-y-3">
                    <PackagePlus className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">No medical packages created yet. Click "Publish Medical Package" to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {packages
                      .filter(pkg => {
                        if (packageStatusFilter !== 'all' && pkg.status !== packageStatusFilter) return false;
                        if (packageCategoryFilter !== 'All' && pkg.category !== packageCategoryFilter) return false;
                        if (packageSearch.trim()) {
                          const q = packageSearch.toLowerCase();
                          return pkg.title.toLowerCase().includes(q) || pkg.code.toLowerCase().includes(q) || pkg.category.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map(pkg => (
                        <div
                          key={pkg.id}
                          className="bg-white border border-[color:var(--t-200)] shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Header & Status */}
                            <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                              <img
                                src={pkg.image_url || '/assets/clean_light_doctor_suite_full.jpg'}
                                alt={pkg.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-2xs font-mono font-bold uppercase px-2 py-0.5 bg-slate-900/90 text-white">
                                  {pkg.code}
                                </span>
                                <span className="text-2xs font-bold uppercase px-2 py-0.5 bg-[color:var(--t-600)] text-white">
                                  {pkg.category}
                                </span>
                              </div>
                              <div className="absolute top-2.5 right-2.5">
                                <span className={`text-2xs font-black uppercase px-2 py-0.5 ${
                                  pkg.status === 'published'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-amber-400 text-amber-950'
                                }`}>
                                  {pkg.status}
                                </span>
                              </div>
                            </div>

                            <div className="p-4 space-y-2.5">
                              <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                                {pkg.title}
                              </h3>
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {pkg.description}
                              </p>

                              <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                                <span className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {pkg.duration}
                                </span>
                                {pkg.fastingRequired && (
                                  <span className="text-2xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2">
                                    Fasting Required
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 space-y-1">
                                <div className="text-xs font-bold uppercase text-slate-400">
                                  Includes ({pkg.inclusions.length} items):
                                </div>
                                {pkg.inclusions.slice(0, 2).map((inc, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700 truncate">
                                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{inc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Footer & Action Bar */}
                          <div className="p-4 pt-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              {pkg.originalPriceMyr && (
                                <span className="text-xs text-slate-400 line-through block">
                                  RM {pkg.originalPriceMyr.toLocaleString()}
                                </span>
                              )}
                              <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                                RM {pkg.priceMyr.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleTogglePackageStatus(pkg)}
                                className="px-2 py-1 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"
                                title="Toggle Live / Draft"
                              >
                                {pkg.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditPackage(pkg)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"
                                title="Edit Package"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 border border-slate-200 bg-white hover:bg-rose-50 cursor-pointer"
                                title="Delete Package"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Promotions & Campaign Codes */}
            {packageSubTab === 'promotions' && (
              <div className="space-y-4">
                {promotions.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-dashed border-slate-300 space-y-3">
                    <Tag className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">No active promotions. Click "Create Promotion" to set up a discount code or seasonal offer.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {promotions.map(pr => (
                      <div
                        key={pr.id}
                        className="bg-white border-2 border-amber-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xs font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300">
                              {pr.badge_text || (pr.discount_type === 'percentage' ? `${pr.discount_value}% OFF` : `RM ${pr.discountValueMyr} OFF`)}
                            </span>
                            <span className={`text-2xs font-black uppercase px-1.5 py-0.2 ${
                              pr.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {pr.status}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {pr.title}
                          </h3>

                          <p className="text-xs text-slate-600">
                            {pr.description}
                          </p>

                          <div className="text-xs text-slate-500 pt-1">
                            Valid: <span className="font-mono text-slate-700">{pr.valid_from}</span> to <span className="font-mono text-slate-700">{pr.valid_until}</span>
                          </div>
                        </div>

                        {/* Promo Code Box & Actions */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between bg-slate-50 p-2 border border-dashed border-slate-300">
                            <span className="font-mono font-black text-xs text-[color:var(--t-700)]">
                              {pr.code}
                            </span>
                            <span className="text-xs text-slate-400 uppercase font-bold">
                              {pr.discount_type === 'percentage' ? `${pr.discount_value}% Discount` : `RM ${pr.discountValueMyr || pr.discount_value / 100} Rebate`}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleTogglePromoStatus(pr)}
                              className="px-2.5 py-1 text-xs font-bold border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            >
                              {pr.status === 'active' ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditPromo(pr)}
                              className="p-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(pr.id)}
                              className="p-1 text-rose-600 hover:text-rose-800 border border-slate-200 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Package Orders & Deposit Reservations */}
            {packageSubTab === 'orders' && (
              <div className="space-y-4">
                {/* Orders Financial Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200">
                    <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Package requests</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {packageOrders.length}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">Patients who asked for a package</span>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-mono font-bold uppercase text-emerald-700 block">Deposits to collect (10%)</span>
                    <div className="text-2xl font-black text-emerald-900 mt-1 tabular-nums">
                      RM {packageOrders.reduce((sum, o) => sum + (o.deposit_amount_myr || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-emerald-700 mt-0.5 block">Not paid online: you confirm and collect it</span>
                  </div>

                  <div className="p-4 bg-white border-2 border-slate-900">
                    <span className="text-xs font-mono font-bold uppercase text-slate-400 block">Balance after the deposit</span>
                    <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                      RM {packageOrders.reduce((sum, o) => sum + (o.remaining_payable_myr || 0), 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">Collected by the hospital</span>
                  </div>

                  <div className="p-4 bg-sky-50 border border-sky-200">
                    <span className="text-xs font-mono font-bold uppercase text-sky-800 block">Deposit policy</span>
                    <div className="text-base font-black text-sky-950 mt-1">
                      10% on confirmation
                    </div>
                    <span className="text-xs text-sky-700 mt-0.5 block">You tell the patient how to pay</span>
                  </div>
                </div>

                {/* Orders Filter & Table */}
                <div className="bg-white border border-[color:var(--t-200)] p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[color:var(--t-600)]" />
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Package requests from patients
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-bold uppercase mr-1">Status:</span>
                      {['all', 'pending', 'confirmed', 'completed'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOrderStatusFilter(st as any)}
                          className={`px-2.5 py-1 text-xs font-bold uppercase cursor-pointer ${
                            orderStatusFilter === st
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {packageOrders.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 space-y-2">
                      <CreditCard className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No package reservation orders received yet.</p>
                      <p className="text-xs text-slate-500">
                        When local or international patients reserve your published packages and pay the 10% advance deposit, their booking vouchers will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-extrabold text-xs uppercase tracking-wider">
                            <th className="p-3">Patient & Country</th>
                            <th className="p-3">Package Title & Code</th>
                            <th className="p-3">Preferred Date</th>
                            <th className="p-3 text-right">Total (MYR)</th>
                            <th className="p-3 text-right">10% Deposit (MYR)</th>
                            <th className="p-3 text-right">Balance Due (MYR)</th>
                            <th className="p-3">Deposit Ref</th>
                            <th className="p-3">Admission Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {packageOrders
                            .filter(o => orderStatusFilter === 'all' || o.hospital_confirmation_status === orderStatusFilter)
                            .map(ord => (
                              <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3">
                                  <strong className="text-slate-900 block font-bold">{ord.patient_name}</strong>
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <span>{ord.patient_country}</span> · <span>{ord.patient_phone}</span>
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-800 line-clamp-1">{ord.package_title}</div>
                                  <code className="text-xs font-mono text-slate-500">{ord.package_code}</code>
                                </td>
                                <td className="p-3 font-mono text-slate-600 text-xs">
                                  {ord.preferred_date || 'Flexible'}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                  RM {ord.total_price_myr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono font-black text-emerald-800 tabular-nums">
                                  RM {ord.deposit_amount_myr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-700 tabular-nums">
                                  RM {ord.remaining_payable_myr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3">
                                  <code className="font-mono text-xs font-black text-[color:var(--t-700)] bg-slate-100 px-1.5 py-0.5">
                                    {ord.deposit_payment_ref}
                                  </code>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 text-2xs font-black uppercase ${
                                    ord.hospital_confirmation_status === 'confirmed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : ord.hospital_confirmation_status === 'completed'
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}>
                                    {ord.hospital_confirmation_status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {ord.hospital_confirmation_status === 'pending' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmPackageOrder(ord.id, 'confirmed')}
                                      className="px-2.5 py-1 text-xs font-bold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer shadow-xs"
                                    >
                                      Confirm Slot
                                    </button>
                                  ) : ord.hospital_confirmation_status === 'confirmed' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmPackageOrder(ord.id, 'completed')}
                                      className="px-2.5 py-1 text-xs font-bold bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-200)] cursor-pointer"
                                    >
                                      Check In
                                    </button>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">Checked In</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FACILITY PROFILE & INFRASTRUCTURE MANAGEMENT */}
        {/* ========================================================================= */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <WorkspaceHeader
              icon={Building2}
              eyebrow="Statutory Licensing · Act 586 Compliance"
              title="Facility Operating Profile & Infrastructure Capacity"
              description="Maintain official hospital licensing, MSQH/JCI accreditations, intensive care bed counts, and specialized operating theatre capacity."
              badges={<BannerBadge tone="success"><ShieldCheck className="h-3 w-3 inline mr-1 text-emerald-600" /> Act 586 Licensed</BannerBadge>}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facility Identity & Licensing */}
              <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-base font-black text-slate-900">
                    KKM Act 586 Statutory Licence
                  </h2>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Facility Name</span>
                      <strong className="text-slate-900">{facility?.name || 'Healthcare Facility'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Operating Category</span>
                      <strong className="text-slate-900 uppercase">{facility?.kind || 'Medical Centre'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Statutory Licence No.</span>
                      <strong className="font-mono text-slate-900">{facility?.licenceNo || 'KKM/JKA/586-90412'}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-bold block">Licence Expiry</span>
                      <strong className="text-slate-900">{facility?.licenceExpiry || '2029-12-31'}</strong>
                    </div>
                  </div>

                  <p className="text-slate-500 leading-relaxed">
                    Registered under the Private Healthcare Facilities and Services Act 1998 (Act 586).
                    Authorised for inpatient specialist medicine, daycare surgery, outpatient consultations, and verified locum practitioner staffing.
                  </p>
                </div>

                {/* Accreditations */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Accreditation Credentials
                  </span>
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 block">MSQH 6th Edition Hospital Accreditation</strong>
                        <span className="text-slate-500 text-xs">Malaysian Society for Quality in Health</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-black uppercase border border-emerald-300">
                        Valid
                      </span>
                    </div>
                    {facility?.mhtcMember && (
                      <div className="p-3 bg-blue-50/50 border border-blue-200 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-blue-900 block">MHTC Elite Healthcare Member</strong>
                          <span className="text-blue-700 text-xs">Malaysia Healthcare Travel Council</span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-2xs font-black uppercase border border-blue-300">
                          Certified
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinical Specialties & Contact */}
              <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Stethoscope className="h-5 w-5 text-[color:var(--t-600)]" />
                  <h2 className="text-base font-black text-slate-900">
                    Clinical Specialties & Network Contact
                  </h2>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Offered Specialties
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(facility?.specialties || [
                      'Emergency Medicine', 'General Medicine', 'Cardiology',
                      'Orthopaedic Surgery', 'General Surgery', 'Paediatrics',
                      'Obstetrics & Gynaecology', 'Anaesthesiology', 'Intensive Care Unit (ICU)'
                    ]).map((sp, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 text-slate-800 text-2xs font-bold border border-slate-200"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Facility Address & Liaison
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{facility?.address || '1, Jalan Bukit Pantai, Bangsar, 59100 Kuala Lumpur'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{facility?.phone || '+60 3-2296 0888'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{facility?.email || 'hr.locum@pantai.com.my'}</span>
                    </div>
                    {facility?.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                        <a
                          href={facility.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[color:var(--t-700)] underline font-bold"
                        >
                          {facility.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Equipment & Infrastructure Management Card */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-[color:var(--t-600)]" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Diagnostic Equipment & Medical Infrastructure
                    </h3>
                    <p className="text-xs text-slate-500">
                      Showcase high-precision clinical equipment (CT, MRI, Cath Lab, Robotic Surgery) to referring clinicians & patients.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveInfrastructure}
                  disabled={infraSaving}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Check className="h-4 w-4 text-emerald-400" />
                  {infraSaving ? 'Saving…' : 'Save Infrastructure'}
                </button>
              </div>

              {/* Equipment list */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Active Clinical & Diagnostic Equipment:
                </label>
                <div className="flex flex-wrap gap-2">
                  {equipmentList.map((eq, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 text-2xs font-bold border border-slate-300 flex items-center gap-2"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{eq}</span>
                      <button
                        type="button"
                        onClick={() => setEquipmentList(equipmentList.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {equipmentList.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No equipment listed yet. Add items below.</span>
                  )}
                </div>

                {/* Add Equipment Input */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <input
                    type="text"
                    value={newEquipmentInput}
                    onChange={e => setNewEquipmentInput(e.target.value)}
                    placeholder="e.g. 3T High-Field MRI Scanner"
                    className="p-2 border border-slate-300 text-xs flex-1 bg-slate-50 focus:bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEquipmentInput.trim()) {
                        setEquipmentList([...equipmentList, newEquipmentInput.trim()]);
                        setNewEquipmentInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold cursor-pointer"
                  >
                    + Add Equipment
                  </button>
                </div>
              </div>

              {/* Patient Amenities list */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-xs font-black uppercase text-slate-700 block">
                  Patient Care Amenities & Specialized Services:
                </label>
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((am, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-amber-50 text-amber-900 text-2xs font-bold border border-amber-300 flex items-center gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{am}</span>
                      <button
                        type="button"
                        onClick={() => setAmenitiesList(amenitiesList.filter((_, idx) => idx !== i))}
                        className="text-amber-500 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {amenitiesList.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No amenities listed yet. Add items below.</span>
                  )}
                </div>

                {/* Add Amenity Input */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <input
                    type="text"
                    value={newAmenityInput}
                    onChange={e => setNewAmenityInput(e.target.value)}
                    placeholder="e.g. JAKIM Halal-Certified Dietary Kitchen"
                    className="p-2 border border-slate-300 text-xs flex-1 bg-slate-50 focus:bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAmenityInput.trim()) {
                        setAmenitiesList([...amenitiesList, newAmenityInput.trim()]);
                        setNewAmenityInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold cursor-pointer"
                  >
                    + Add Amenity
                  </button>
                </div>
              </div>
            </div>

            {/* Billing, Escrow & Invoicing Management Card */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[color:var(--t-600)]" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Settlement & Billing Protocol (Escrow vs. Corporate Invoicing)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure how clinical shifts and locum wages are settled between your facility, practitioners, and the platform.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBillingSettings}
                  disabled={billingSaving}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Check className="h-4 w-4" />
                  {billingSaving ? 'Saving…' : 'Save Billing Settings'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Mode Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Default Payment Settlement Mode:
                  </label>
                  
                  <div
                    onClick={() => setBillingPref('escrow')}
                    className={`p-4 border cursor-pointer transition-all ${
                      billingPref === 'escrow'
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <span>Upfront Escrow Deposit (Recommended for Clinics)</span>
                      </div>
                      <input
                        type="radio"
                        name="billingPref"
                        checked={billingPref === 'escrow'}
                        onChange={() => setBillingPref('escrow')}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Funds for accepted shifts (Wage + RM 40 platform fee) are pre-authorized upon application acceptance and held in escrow. Payout is released to the practitioner after verified timesheet completion. Zero bad debt.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      if (facility?.corporateCreditApproved) {
                        setBillingPref('invoice');
                      } else {
                        setNotificationMsg({
                          type: 'error',
                          text: 'Corporate Net-30 Invoicing requires a verified MOH private hospital licence and credit review.'
                        });
                      }
                    }}
                    className={`p-4 border cursor-pointer transition-all ${
                      billingPref === 'invoice'
                        ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span>Corporate Net-30 Invoicing (Tertiary Hospitals)</span>
                      </div>
                      <input
                        type="radio"
                        name="billingPref"
                        checked={billingPref === 'invoice'}
                        onChange={() => setBillingPref('invoice')}
                        disabled={!facility?.corporateCreditApproved}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      No upfront charges at booking. All completed shifts are consolidated onto a monthly corporate tax invoice payable via Corporate GIRO/PO within 30 days.
                    </p>
                    <div className="mt-2 text-xs flex items-center gap-2">
                      <span className="font-semibold text-purple-800">Status:</span>
                      {facility?.corporateCreditApproved ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">Approved (Limit: RM {facility.corporateCreditLimitMyr?.toLocaleString() || '50,000'})</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">Requires MOH Hospital Licence Review</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Details & Tax Info */}
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase text-slate-700 block">
                    Accounting & Tax Credentials:
                  </label>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Accounts Payable Billing Email</label>
                    <input
                      type="email"
                      value={billingEmail}
                      onChange={e => setBillingEmail(e.target.value)}
                      placeholder="finance.locum@hospital.com.my"
                      className="w-full p-2 border border-slate-300 text-xs focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">SST / Tax Registration Number</label>
                    <input
                      type="text"
                      value={sstNo}
                      onChange={e => setSstNo(e.target.value)}
                      placeholder="W10-2401-32000042"
                      className="w-full p-2 border border-slate-300 text-xs focus:outline-none focus:border-[color:var(--t-600)]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-black text-slate-800 uppercase tracking-wide">Regulatory & Compliance Policy:</div>
                    <p>• Medical practitioners (doctors/nurses) are <strong>never charged</strong> recruitment fees on this platform (Act 586 & MMC compliant).</p>
                    <p>• Platform fees (RM 40/shift) and clinical wages are exclusively invoiced or escrowed through the hiring healthcare facility.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ========================================================================= */}
      {/* DECISION MODAL (ACCEPT / DECLINE JOB APPLICATION) */}
      {/* ========================================================================= */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {decisionModal.action === 'accepted' ? 'Accept Job Application' : 'Decline Job Application'}
              </h3>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Applicant: <strong className="text-slate-900 text-xs">{decisionModal.applicant.applicantName}</strong> ({decisionModal.applicant.applicantRole})
              </p>
              <p>
                Credential Verification: <strong className="text-slate-800">{decisionModal.applicant.applicantLicense}</strong> (APC Valid)
              </p>
              {decisionModal.action === 'accepted' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <p className="font-bold">Accepting this application locks in this clinical position and notifies the practitioner immediately.</p>
                  </div>

                  {/* Payment Mode Notice */}
                  {facility?.corporateCreditApproved && facility?.billingPreference === 'invoice' ? (
                    <div className="p-3 bg-purple-50 border border-purple-200 text-purple-950 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-purple-900">
                        <FileText className="h-4 w-4 text-purple-700" />
                        <span>Corporate Net-30 Invoicing (Enterprise Hospital)</span>
                      </div>
                      <p className="text-xs text-purple-800">
                        Shift fee of <strong>RM {((decisionModal.applicant.applicantRate || 80) * 8).toFixed(2)}</strong> + platform fulfillment fee (RM 40.00) will be consolidated onto your hospital's monthly corporate invoice (Credit Limit: RM {facility.corporateCreditLimitMyr?.toLocaleString() || '50,000'}).
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-blue-900">
                          <Lock className="h-4 w-4 text-blue-700" />
                          <span>Upfront Escrow Deposit (Protected Shift)</span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-200/60 text-blue-900 font-mono font-bold text-2xs">
                          Pre-Authorization Hold
                        </span>
                      </div>
                      <p className="text-xs text-blue-800">
                        Total shift value + platform fee of <strong>RM {(((decisionModal.applicant.applicantRate || 80) * 8) + 40).toFixed(2)}</strong> is held safely in escrow. Funds are only released to the practitioner after verified timesheet completion.
                      </p>
                      <div className="bg-white/80 p-2 border border-blue-100 flex items-center justify-between text-xs">
                        <span>Practitioner Shift Wage (8 hrs @ RM {decisionModal.applicant.applicantRate || 80}/hr):</span>
                        <strong className="font-mono text-emerald-700">RM {((decisionModal.applicant.applicantRate || 80) * 8).toFixed(2)}</strong>
                      </div>
                      <div className="bg-white/80 p-2 border border-blue-100 flex items-center justify-between text-xs">
                        <span>Platform Match & Credentialing Fee:</span>
                        <strong className="font-mono text-slate-800">RM 40.00</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900">
                  Declining this application will notify the applicant that the vacancy is proceeding with other candidates. No charges or escrow holds will occur.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase text-slate-700 block">
                Internal Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Briefing with department unit manager upon arrival."
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting}
                onClick={handleDecisionSubmit}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider text-white border cursor-pointer ${
                  decisionModal.action === 'accepted'
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700 border-rose-700'
                }`}
              >
                {actionSubmitting ? 'Processing…' : decisionModal.action === 'accepted' ? 'Confirm Acceptance' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST NEW JOB MODAL */}
      {/* ========================================================================= */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Post Clinical Job Vacancy
                </h3>
                <p className="text-xs text-slate-500">
                  Publish openings for doctors, nurses, and medical specialists across the network.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewJobModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medical Officer (Emergency Department Locum)"
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Target Role *
                  </label>
                  <select
                    value={newJobRole}
                    onChange={e => setNewJobRole(e.target.value as any)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="doctor">Doctor / Medical Officer</option>
                    <option value="nurse">Nurse / Staff Nurse</option>
                    <option value="any">Specialist / Clinical Consultant</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Engagement Type *
                  </label>
                  <select
                    value={newJobType}
                    onChange={e => setNewJobType(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="Locum">Locum (Shift Cover)</option>
                    <option value="Sessional">Sessional / Part-Time</option>
                    <option value="Permanent">Permanent Position</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Specialty / Department *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emergency Medicine, ICU, Paediatrics"
                    value={newJobSpecialty}
                    onChange={e => setNewJobSpecialty(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Facility Ward / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency Department / Ward 4B"
                    value={newJobLocation}
                    onChange={e => setNewJobLocation(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Min Rate (MYR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newJobSalaryMin}
                    onChange={e => setNewJobSalaryMin(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Max Rate (MYR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newJobSalaryMax}
                    onChange={e => setNewJobSalaryMax(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Period
                  </label>
                  <select
                    value={newJobSalaryPeriod}
                    onChange={e => setNewJobSalaryPeriod(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="hour">Per Hour</option>
                    <option value="shift">Per Shift</option>
                    <option value="month">Per Month</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Description & Clinical Scope
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key clinical duties, patient triage scope, required certifications (e.g. ACLS, NSR, LJM registration)."
                  value={newJobDesc}
                  onChange={e => setNewJobDesc(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newJobSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer disabled:opacity-50"
                >
                  {newJobSubmitting ? 'Publishing…' : 'Publish Job Vacancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT INVITATION MODAL */}
      {/* ========================================================================= */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Invite Practitioner to Vacancy
              </h3>
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div>Inviting: <strong className="text-slate-900">{inviteModal.name}</strong> ({inviteModal.role})</div>
              <div>Specialty: <strong className="text-slate-800">{inviteModal.specialization}</strong></div>
              <div>Registration: <strong className="font-mono text-slate-800">{inviteModal.registry || 'MMC/LJM Verified'}</strong></div>
            </div>

            {inviteSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Select Shift / Vacancy (Optional)
                </label>
                <select
                  value={inviteJobId}
                  onChange={e => setInviteJobId(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                >
                  <option value="">General Facility Clinical Invitation</option>
                  {jobs.filter(j => j.status === 'Active').map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.specialtyRequired} - {j.salaryRange})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Personalised Invitation Message
                </label>
                <textarea
                  rows={3}
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {inviteSubmitting ? 'Sending…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT COORDINATION CHAT MODAL */}
      {/* ========================================================================= */}
      {chatModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-2xl w-full p-6 shadow-2xl rounded-none space-y-4 flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[color:var(--t-600)]" />
                  <h3 className="font-black text-slate-900 text-base">
                    Practitioner Direct Messaging
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Direct thread with <strong className="text-slate-800">{chatModal.applicantName}</strong> ({chatModal.applicantRole}) for <span className="font-semibold text-slate-700">{chatModal.jobTitle}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-50 border border-slate-200 min-h-[260px] max-h-[380px]">
              {chatLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[color:var(--t-600)]" />
                  Loading messages…
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                  <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <div className="text-sm font-bold text-slate-700">No messages exchanged yet</div>
                  <p>Send reporting details, ward unit instructions, or timing confirmations below.</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.mine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-xs text-slate-500 mb-1 font-semibold flex items-center gap-1.5">
                      <span>{msg.senderName}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`p-3 text-xs max-w-[85%] rounded-none shadow-xs leading-relaxed ${
                        msg.mine
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-800 border border-slate-300'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type your message to practitioner…"
                className="flex-1 border border-[color:var(--t-200)] px-3 py-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
              />
              <button
                type="submit"
                disabled={chatSending || !chatInput.trim()}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {chatSending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TREATMENT QUOTATION MODAL (PATIENT REFERRAL DESK) */}
      {/* ========================================================================= */}
      {quoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Generate Treatment Quotation
                </h3>
                <p className="text-xs text-slate-500">
                  Official clinical package estimate for referral patient: <strong className="text-slate-800">{quoteModal.patient}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Procedure / Treatment Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Total Knee Arthroplasty (TKA) Package"
                  value={quoteProcedure}
                  onChange={e => setQuoteProcedure(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Estimated Total (MYR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 18500"
                    value={quoteAmount}
                    onChange={e => setQuoteAmount(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Est. Stay (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quoteDays}
                    onChange={e => setQuoteDays(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Clinical Inclusions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Surgeon fee, anaesthetist, operating theatre, 2 nights single room, routine lab tests."
                  value={quoteInclusions}
                  onChange={e => setQuoteInclusions(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Exclusions & Conditions
                </label>
                <textarea
                  rows={2}
                  value={quoteExclusions}
                  onChange={e => setQuoteExclusions(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuoteModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quoteSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  {quoteSubmitting ? 'Dispatching…' : 'Dispatch Treatment Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PUBLISH / EDIT MEDICAL PACKAGE MODAL */}
      {/* ========================================================================= */}
      {packageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPackageId ? 'Edit Medical Package' : 'Publish New Medical Package'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure procedure details, clinical inclusions, fasting rules, and pricing in Malaysian Ringgit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPackageModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Package Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Executive Full-Body Health Screening"
                    value={pkgTitle}
                    onChange={e => setPkgTitle(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Package Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PKG-EXEC-01"
                    value={pkgCode}
                    onChange={e => setPkgCode(e.target.value.toUpperCase())}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none font-mono focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Category *
                  </label>
                  <select
                    value={pkgCategory}
                    onChange={e => setPkgCategory(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    {['Health Screening', 'Cardiology', 'Orthopaedics', 'Maternity', 'Fertility', 'Oncology', 'Ophthalmology', 'Dental', 'Surgery', 'Aesthetics'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Duration / Stay
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Day Outpatient (4 hrs)"
                    value={pkgDuration}
                    onChange={e => setPkgDuration(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Target Audience
                  </label>
                  <select
                    value={pkgAudience}
                    onChange={e => setPkgAudience(e.target.value as any)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="all">All Patients</option>
                    <option value="local">Malaysian Residents Only</option>
                    <option value="international">Medical Tourism (MHTC)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Package Price (MYR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 1280"
                    value={pkgPrice}
                    onChange={e => setPkgPrice(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)] font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Original Price (MYR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1600 (optional)"
                    value={pkgOriginalPrice}
                    onChange={e => setPkgOriginalPrice(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)] text-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Publishing Status
                  </label>
                  <select
                    value={pkgStatus}
                    onChange={e => setPkgStatus(e.target.value as any)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="published">Published (Live to public)</option>
                    <option value="draft">Draft (Private)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fastingCheck"
                  checked={pkgFasting}
                  onChange={e => setPkgFasting(e.target.checked)}
                  className="rounded-none cursor-pointer"
                />
                <label htmlFor="fastingCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Requires Clinical Fasting (8–10 hours fasting prior to appointment)
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Package Overview & Clinical Rationale
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline who this package is recommended for and primary clinical diagnostic objectives."
                  value={pkgDescription}
                  onChange={e => setPkgDescription(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              {/* Inclusions List Builder */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Included Tests, Procedures & Consultations ({pkgInclusions.length}):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200">
                  {pkgInclusions.map((inc, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-white text-slate-800 text-2xs font-medium border border-slate-300 flex items-center gap-1.5"
                    >
                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{inc}</span>
                      <button
                        type="button"
                        onClick={() => setPkgInclusions(pkgInclusions.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {pkgInclusions.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No inclusion items added yet.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pkgInclusionInput}
                    onChange={e => setPkgInclusionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (pkgInclusionInput.trim()) {
                          setPkgInclusions([...pkgInclusions, pkgInclusionInput.trim()]);
                          setPkgInclusionInput('');
                        }
                      }
                    }}
                    placeholder="e.g. Ultrasound Abdomen & Pelvis"
                    className="p-2 border border-slate-300 text-xs flex-1 bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (pkgInclusionInput.trim()) {
                        setPkgInclusions([...pkgInclusions, pkgInclusionInput.trim()]);
                        setPkgInclusionInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Exclusions & Pre-Procedure Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Strict 10-hour fasting. Medication adjustments. Additional pathology charged separately."
                  value={pkgPreparation}
                  onChange={e => setPkgPreparation(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPackageModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pkgSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer disabled:opacity-50"
                >
                  {pkgSubmitting ? 'Saving Package…' : editingPackageId ? 'Update Package' : 'Publish Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT PROMOTION CAMPAIGN MODAL */}
      {/* ========================================================================= */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingPromoId ? 'Edit Promotion Campaign' : 'Create Promotion Campaign'}
                </h3>
                <p className="text-xs text-slate-500">
                  Issue promo codes, percentage discounts, or fixed Malaysian Ringgit rebates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAREMERDEKA"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none font-mono font-bold focus:outline-none focus:border-[color:var(--t-600)] uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Badge Highlight
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20% OFF National Special"
                    value={promoBadge}
                    onChange={e => setPromoBadge(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Merdeka National Wellness Special 2026"
                  value={promoTitle}
                  onChange={e => setPromoTitle(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Discount Type *
                  </label>
                  <select
                    value={promoType}
                    onChange={e => setPromoType(e.target.value as any)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="percentage">Percentage (%) Discount</option>
                    <option value="fixed">Fixed Amount (RM) Rebate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder={promoType === 'percentage' ? 'e.g. 20 (for 20%)' : 'e.g. 250 (for RM 250)'}
                    value={promoValue}
                    onChange={e => setPromoValue(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)] font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Applicable Package
                </label>
                <select
                  value={promoPkgId}
                  onChange={e => setPromoPkgId(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                >
                  <option value="">All Facility Packages (Universal Promo)</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={promoValidFrom}
                    onChange={e => setPromoValidFrom(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    required
                    value={promoValidUntil}
                    onChange={e => setPromoValidUntil(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Campaign Description & Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms and conditions, eligible age groups, or resident requirements."
                  value={promoDesc}
                  onChange={e => setPromoDesc(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] p-2 text-xs rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoSubmitting}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {promoSubmitting ? 'Saving Promo…' : editingPromoId ? 'Update Promotion' : 'Publish Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSTITUTIONAL REFERRAL SUCCESS-FEE INVOICE MODAL */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 max-w-xl w-full p-6 space-y-5 shadow-2xl my-auto">
            {/* Invoice Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-slate-400">Institutional Facilitator Invoice</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Invoice {selectedInvoice.commissionInvoiceNo || 'DRAFT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 border border-slate-200">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Billed Hospital Facility</span>
                <strong className="text-slate-900">{facility?.name || 'Accredited Healthcare Facility'}</strong>
                <span className="text-xs text-slate-500 block">Licence: {facility?.licenceNo || 'Act 586 Verified'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Facilitator / Billing Entity</span>
                <strong className="text-slate-900">CareVerified Healthcare Network</strong>
                <span className="text-xs text-slate-500 block">Kuala Lumpur, Malaysia · Act 586 Compliant</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Admitted Referral Patient</span>
                <strong className="text-slate-900">{selectedInvoice.patient}</strong>
                <span className="text-xs text-slate-500 block">Origin: {selectedInvoice.country}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Invoiced / Discharge Date</span>
                <strong className="text-slate-900">
                  {selectedInvoice.commissionInvoicedAt ? new Date(selectedInvoice.commissionInvoicedAt).toLocaleDateString('en-MY') : new Date().toLocaleDateString('en-MY')}
                </strong>
                <span className={`text-2xs font-black uppercase px-1.5 py-0.2 inline-block mt-0.5 ${
                  selectedInvoice.commissionStatus === 'settled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  Status: {selectedInvoice.commissionStatus}
                </span>
              </div>
            </div>

            {/* Financial Line Items */}
            <div className="border border-slate-200 divide-y divide-slate-100 text-xs">
              <div className="p-3 bg-slate-100 font-bold text-slate-700 flex justify-between">
                <span>Description</span>
                <span>Amount (MYR)</span>
              </div>
              <div className="p-3 flex justify-between text-slate-800">
                <div>
                  <div className="font-bold">Total Patient Treatment Billing</div>
                  <div className="text-xs text-slate-500">{selectedInvoice.specialty || 'Clinical Treatment Package'}</div>
                </div>
                <div className="font-mono font-bold tabular-nums">
                  RM {selectedInvoice.finalQuotationMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 flex justify-between text-emerald-900 bg-emerald-50/50">
                <div>
                  <div className="font-black">Institutional Facilitator Success Fee (8.0%)</div>
                  <div className="text-xs text-emerald-700">Non-doctor splitting institutional coordination fee</div>
                </div>
                <div className="font-mono font-black tabular-nums">
                  RM {selectedInvoice.referralCommissionMyr.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3 flex justify-between text-slate-600">
                <span>Malaysian Service Tax (SST 8.0%)</span>
                <span className="font-mono tabular-nums">
                  RM {(selectedInvoice.referralCommissionMyr * 0.08).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-3 flex justify-between text-base font-black text-slate-900 bg-slate-50">
                <span>Total Payable Facilitator Invoice:</span>
                <span className="font-mono tabular-nums text-[color:var(--t-700)]">
                  RM {(selectedInvoice.referralCommissionMyr * 1.08).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Remittance & Compliance */}
            <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 block">Bank Remittance & Regulatory Assurance:</strong>
              <div>Bank: Maybank Berhad · Acc No: 5140-8891-2300 · Acc Name: CareVerified Network Sdn Bhd</div>
              <div className="text-xs text-slate-500 pt-1">
                Issued in full compliance with Malaysian Medical Council (MMC) Guidelines on Medical Tourism & Referrals.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
