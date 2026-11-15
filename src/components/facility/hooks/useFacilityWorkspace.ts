import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTr } from '../../../locale';
import { facilityApi } from '../api';
import {
  Application,
  FacilityJob,
  FacilityProfile,
  LocumProfile,
  MedicalPackage,
  MedicalPromotion,
  PackageOrder,
  PatientCase,
  ReferralLedgerCase,
  ReferralLedgerData,
} from '../types';

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

export function useFacilityWorkspace(activeGroup?: string) {
  const tx = useTr();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facility, setFacility] = useState<FacilityProfile | null>(null);
  const [jobs, setJobs] = useState<FacilityJob[]>([]);
  const [applicationsMap, setApplicationsMap] = useState<Record<string, Application[]>>({});
  const [locums, setLocums] = useState<LocumProfile[]>([]);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [packages, setPackages] = useState<MedicalPackage[]>([]);
  const [promotions, setPromotions] = useState<MedicalPromotion[]>([]);
  const [packageOrders, setPackageOrders] = useState<PackageOrder[]>([]);
  const [referralLedger, setReferralLedger] = useState<ReferralLedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Filters & navigation
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Closed'>('all');
  const [jobSearch, setJobSearch] = useState('');
  const [locumSearch, setLocumSearch] = useState('');
  const [locumRoleFilter, setLocumRoleFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [casesSubTab, setCasesSubTab] = useState<'referrals' | 'ledger'>('referrals');
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('all');
  const [packageSubTab, setPackageSubTab] = useState<'packages' | 'promotions' | 'orders'>('packages');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('All');
  const [packageStatusFilter, setPackageStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [packageSearch, setPackageSearch] = useState('');

  // Modals & forms
  const [decisionModal, setDecisionModal] = useState<{
    jobId: string;
    applicant: Application;
    action: 'accepted' | 'declined';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

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
  const [newJobAcceptsForeign, setNewJobAcceptsForeign] = useState(false);
  const [newJobVisaSupport, setNewJobVisaSupport] = useState(false);
  const [newJobSubmitting, setNewJobSubmitting] = useState(false);

  const [inviteModal, setInviteModal] = useState<LocumProfile | null>(null);
  const [inviteMessage, setInviteMessage] = useState('Greetings. Our medical facility would like to invite you for upcoming clinical locum coverage.');
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

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

  const [selectedInvoice, setSelectedInvoice] = useState<ReferralLedgerCase | null>(null);
  const [quoteModal, setQuoteModal] = useState<PatientCase | null>(null);
  const [quoteProcedure, setQuoteProcedure] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDays, setQuoteDays] = useState('2');
  const [quoteInclusions, setQuoteInclusions] = useState('');
  const [quoteExclusions, setQuoteExclusions] = useState('Excludes extra ICU days, complications, international flights.');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

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

  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [amenitiesList, setAmenitiesList] = useState<string[]>([]);
  const [newEquipmentInput, setNewEquipmentInput] = useState('');
  const [newAmenityInput, setNewAmenityInput] = useState('');
  const [infraSaving, setInfraSaving] = useState(false);

  const [billingPref, setBillingPref] = useState<'escrow' | 'invoice'>('escrow');
  const [billingEmail, setBillingEmail] = useState('');
  const [sstNo, setSstNo] = useState('');
  const [billingSaving, setBillingSaving] = useState(false);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFacilityData = useCallback(async () => {
    setLoading(true);
    try {
      const meData = await facilityApi.getMe();
      const fac = meData.status === 'success' ? meData.data?.facility : null;
      const facId = fac?.id as string | undefined;

      const [jobsData, infraData, locumData, caseData, pkgData, promoData, ordersData] = await Promise.all([
        facilityApi.getJobs(),
        facilityApi.getInfrastructure(),
        facilityApi.getLocums(),
        facilityApi.getCases(),
        facilityApi.getPackages(facId),
        facilityApi.getPromotions(facId),
        facilityApi.getPackageOrders(),
      ]);

      if (fac) {
        const infra = infraData.status === 'success' ? infraData.data : null;
        const mergedFac = infra
          ? {
              ...fac,
              equipment: infra.equipment || [],
              amenities: infra.amenities || [],
              accreditations: infra.accreditations || fac.accreditations || [],
              specialties: infra.specialties || fac.specialties || [],
            }
          : fac;
        setFacility(mergedFac);
        setEquipmentList(mergedFac.equipment || []);
        setAmenitiesList(mergedFac.amenities || []);
        setBillingPref(fac.billingPreference || 'escrow');
        setBillingEmail(fac.billingContactEmail || fac.email || '');
        setSstNo(fac.sstRegistrationNo || '');
      }
      if (jobsData.status === 'success') {
        const jobList: FacilityJob[] = jobsData.data || [];
        setJobs(jobList);
        const appMap: Record<string, Application[]> = {};
        for (const j of jobList) {
          appMap[j.id] = j.applications || [];
        }
        setApplicationsMap(appMap);
        if (jobList.length > 0 && !expandedJobId) {
          setExpandedJobId(jobList[0].id);
        }
      }
      if (locumData.status === 'success') setLocums(locumData.data || []);
      if (caseData.status === 'success') setCases(caseData.data || []);
      if (pkgData.status === 'success') setPackages(pkgData.data || []);
      if (promoData.status === 'success') setPromotions(promoData.data || []);
      if (ordersData.status === 'success') setPackageOrders(ordersData.data || []);
    } catch {
      console.error('Error loading facility workspace data');
    } finally {
      setLoading(false);
    }
  }, [expandedJobId]);

  const loadReferralLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const data = await facilityApi.getReferralLedger();
      if (data.status === 'success') setReferralLedger(data.data);
    } catch {
      console.error('Error loading referral ledger');
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacilityData();
    loadReferralLedger();
  }, [loadFacilityData, loadReferralLedger]);

  const handleDecisionSubmit = async () => {
    if (!decisionModal) return;
    setActionSubmitting(true);
    try {
      const data = await facilityApi.submitApplicantDecision(
        decisionModal.jobId,
        decisionModal.applicant.userId,
        decisionModal.action,
        decisionNotes.trim() || undefined
      );
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
        setNotificationMsg({ type: 'error', text: data.message || tx('Could not process decision.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error. Please try again.') });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: 'Active' | 'Closed') => {
    try {
      const data = await facilityApi.updateJobStatus(jobId, newStatus);
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Job vacancy marked as ${newStatus}.` });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Failed to update job status.') });
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobSpecialty.trim()) {
      setNotificationMsg({ type: 'error', text: tx('Please fill in all mandatory job fields.') });
      return;
    }
    setNewJobSubmitting(true);
    try {
      const data = await facilityApi.createJob({
        hospitalName: facility?.name || tx('Medical Centre'),
        title: newJobTitle.trim(),
        type: newJobType,
        sector: 'private',
        roleRequired: newJobRole,
        specialtyRequired: newJobSpecialty.trim(),
        salaryMin: Number(newJobSalaryMin) || null,
        salaryMax: Number(newJobSalaryMax) || null,
        salaryPeriod: newJobSalaryPeriod,
        location: newJobLocation.trim(),
        city: facility?.city || tx('Kuala Lumpur'),
        state: facility?.state || tx('Kuala Lumpur'),
        description: newJobDesc.trim() || `Licensed clinical facility seeking credentialed ${newJobRole} for medical coverage.`,
        facilityId: facility?.id,
        acceptsForeign: newJobAcceptsForeign,
        visaSupport: newJobVisaSupport,
      });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Job vacancy "${newJobTitle}" published successfully!` });
        setShowNewJobModal(false);
        setNewJobTitle('');
        setNewJobSpecialty('');
        setNewJobDesc('');
        setNewJobAcceptsForeign(false);
        setNewJobVisaSupport(false);
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Could not publish job opening.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error. Please try again.') });
    } finally {
      setNewJobSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModal || !inviteMessage.trim()) return;
    setInviteSubmitting(true);
    setInviteSuccess('');
    try {
      const data = await facilityApi.inviteLocum(inviteModal.profileId, {
        jobId: inviteJobId || undefined,
        message: inviteMessage.trim(),
      });
      if (data.status === 'success') {
        setInviteSuccess(data.message);
        setTimeout(() => {
          setInviteModal(null);
          setInviteSuccess('');
        }, 1800);
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Failed to send invitation.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    } finally {
      setInviteSubmitting(false);
    }
  };

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
      const data = await facilityApi.getApplicantMessages(jobId, app.userId);
      if (data.status === 'success') setChatMessages(data.data);
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
      const data = await facilityApi.sendApplicantMessage(chatModal.jobId, chatModal.applicantUserId, chatInput.trim());
      if (data.status === 'success') {
        setChatMessages((prev) => [...prev, data.data]);
        setChatInput('');
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Failed to send message.') });
    } finally {
      setChatSending(false);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModal || !quoteProcedure.trim() || !quoteAmount) return;
    setQuoteSubmitting(true);
    try {
      const data = await facilityApi.submitCaseQuote(quoteModal.id, {
        procedureName: quoteProcedure.trim(),
        estimatedMyr: Number(quoteAmount),
        estimatedDays: Number(quoteDays) || 2,
        inclusions: quoteInclusions.split('\n').map((s) => s.trim()).filter(Boolean),
        exclusions: quoteExclusions.trim() || undefined,
      });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Treatment quotation RM ${Number(quoteAmount).toLocaleString()} issued for ${quoteModal.patient}!` });
        setQuoteModal(null);
        setQuoteProcedure('');
        setQuoteAmount('');
        setQuoteInclusions('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Could not issue quotation.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, status: string) => {
    try {
      const data = await facilityApi.updateCaseStatus(caseId, status);
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message || `Case status updated to ${status}.` });
        loadFacilityData();
        loadReferralLedger();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    }
  };

  const handleConfirmPackageOrder = async (orderId: string, status = 'confirmed') => {
    try {
      const data = await facilityApi.confirmPackageOrder(orderId, status);
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message || `Package reservation updated to ${status}.` });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Could not update package reservation.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error updating package order.') });
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

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgTitle.trim() || !pkgPrice) return;
    setPkgSubmitting(true);
    try {
      const data = await facilityApi.savePackage(editingPackageId, {
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
      });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setPackageModalOpen(false);
        setEditingPackageId(null);
        resetPackageForm();
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Error saving package.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    } finally {
      setPkgSubmitting(false);
    }
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
      const data = await facilityApi.savePackage(pkg.id, { status: nextStatus });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Package marked as ${nextStatus}.` });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm(tx('Are you sure you want to delete this medical package?'))) return;
    try {
      const data = await facilityApi.deletePackage(id);
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
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

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || !promoTitle.trim() || !promoValue) return;
    setPromoSubmitting(true);
    try {
      const data = await facilityApi.savePromo(editingPromoId, {
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
      });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        setPromoModalOpen(false);
        setEditingPromoId(null);
        resetPromoForm();
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Error saving promotion.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    } finally {
      setPromoSubmitting(false);
    }
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
      const data = await facilityApi.savePromo(pr.id, { status: nextStatus });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Promotion marked as ${nextStatus}.` });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm(tx('Are you sure you want to delete this promotion?'))) return;
    try {
      const data = await facilityApi.deletePromo(id);
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    }
  };

  const handleSaveInfrastructure = async () => {
    setInfraSaving(true);
    try {
      const data = await facilityApi.saveInfrastructure({ equipment: equipmentList, amenities: amenitiesList });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Could not save infrastructure.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error.') });
    } finally {
      setInfraSaving(false);
    }
  };

  const handleSaveBillingSettings = async () => {
    setBillingSaving(true);
    try {
      const data = await facilityApi.saveBillingSettings({
        billingPreference: billingPref,
        billingContactEmail: billingEmail.trim() || undefined,
        sstRegistrationNo: sstNo.trim() || undefined,
      });
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message });
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || tx('Could not update billing settings.') });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error. Please try again.') });
    } finally {
      setBillingSaving(false);
    }
  };

  const handleApproveTimesheet = async (jobId: string, app: Application) => {
    try {
      const data = await facilityApi.approveTimesheet(jobId, app.userId, app.actualHours);
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: data.message || tx('Timesheet approved.') });
        loadFacilityData();
      }
    } catch {
      setNotificationMsg({ type: 'error', text: tx('Network error approving timesheet.') });
    }
  };

  const stats = {
    activeVacancies: jobs.filter((j) => j.status === 'Active').length,
    totalApplicants: jobs.reduce((acc, j) => acc + (j.applicationCount || 0), 0),
    pendingApplicants: jobs.reduce((acc, j) => acc + (j.pendingCount || 0), 0),
    acceptedLocums: jobs.reduce((acc, j) => acc + (j.acceptedCount || 0), 0),
    patientCases: cases.length,
    activePackages: packages.filter((p) => p.status === 'published').length,
    pendingOrders: packageOrders.filter((o) => o.hospital_confirmation_status === 'pending').length,
  };

  const filteredJobs = jobs.filter((j) => {
    if (jobFilter !== 'all' && j.roleRequired !== jobFilter && j.roleRequired !== 'any') return false;
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (
      jobSearch.trim() &&
      !j.title.toLowerCase().includes(jobSearch.toLowerCase()) &&
      !j.specialtyRequired.toLowerCase().includes(jobSearch.toLowerCase())
    ) return false;
    return true;
  });

  const filteredLocums = locums.filter((loc) => {
    if (locumRoleFilter !== 'all' && loc.role !== locumRoleFilter) return false;
    if (
      locumSearch.trim() &&
      !loc.name.toLowerCase().includes(locumSearch.toLowerCase()) &&
      !loc.specialization.toLowerCase().includes(locumSearch.toLowerCase())
    ) return false;
    return true;
  });

  const filteredCases = cases.filter((c) => caseStatusFilter === 'all' || c.status === caseStatusFilter);

  return {
    tx,
    loading,
    error,
    setError,
    facility,
    jobs,
    applicationsMap,
    locums,
    cases,
    packages,
    promotions,
    packageOrders,
    referralLedger,
    ledgerLoading,
    expandedJobId,
    setExpandedJobId,
    jobFilter,
    setJobFilter,
    statusFilter,
    setStatusFilter,
    jobSearch,
    setJobSearch,
    locumSearch,
    setLocumSearch,
    locumRoleFilter,
    setLocumRoleFilter,
    casesSubTab,
    setCasesSubTab,
    caseStatusFilter,
    setCaseStatusFilter,
    packageSubTab,
    setPackageSubTab,
    orderStatusFilter,
    setOrderStatusFilter,
    packageCategoryFilter,
    setPackageCategoryFilter,
    packageStatusFilter,
    setPackageStatusFilter,
    packageSearch,
    setPackageSearch,
    decisionModal,
    setDecisionModal,
    decisionNotes,
    setDecisionNotes,
    actionSubmitting,
    showNewJobModal,
    setShowNewJobModal,
    newJobTitle,
    setNewJobTitle,
    newJobRole,
    setNewJobRole,
    newJobType,
    setNewJobType,
    newJobSpecialty,
    setNewJobSpecialty,
    newJobSalaryMin,
    setNewJobSalaryMin,
    newJobSalaryMax,
    setNewJobSalaryMax,
    newJobSalaryPeriod,
    setNewJobSalaryPeriod,
    newJobLocation,
    setNewJobLocation,
    newJobDesc,
    setNewJobDesc,
    newJobAcceptsForeign,
    setNewJobAcceptsForeign,
    newJobVisaSupport,
    setNewJobVisaSupport,
    newJobSubmitting,
    inviteModal,
    setInviteModal,
    inviteMessage,
    setInviteMessage,
    inviteJobId,
    setInviteJobId,
    inviteSubmitting,
    inviteSuccess,
    setInviteSuccess,
    chatModal,
    setChatModal,
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    chatSending,
    selectedInvoice,
    setSelectedInvoice,
    quoteModal,
    setQuoteModal,
    quoteProcedure,
    setQuoteProcedure,
    quoteAmount,
    setQuoteAmount,
    quoteDays,
    setQuoteDays,
    quoteInclusions,
    setQuoteInclusions,
    quoteExclusions,
    setQuoteExclusions,
    quoteSubmitting,
    packageModalOpen,
    setPackageModalOpen,
    editingPackageId,
    setEditingPackageId,
    pkgCode,
    setPkgCode,
    pkgTitle,
    setPkgTitle,
    pkgCategory,
    setPkgCategory,
    pkgDescription,
    setPkgDescription,
    pkgDuration,
    setPkgDuration,
    pkgPrice,
    setPkgPrice,
    pkgOriginalPrice,
    setPkgOriginalPrice,
    pkgAudience,
    setPkgAudience,
    pkgFasting,
    setPkgFasting,
    pkgInclusions,
    setPkgInclusions,
    pkgInclusionInput,
    setPkgInclusionInput,
    pkgExclusions,
    setPkgExclusions,
    pkgPreparation,
    setPkgPreparation,
    pkgImageUrl,
    setPkgImageUrl,
    pkgStatus,
    setPkgStatus,
    pkgSubmitting,
    promoModalOpen,
    setPromoModalOpen,
    editingPromoId,
    setEditingPromoId,
    promoCode,
    setPromoCode,
    promoTitle,
    setPromoTitle,
    promoDesc,
    setPromoDesc,
    promoType,
    setPromoType,
    promoValue,
    setPromoValue,
    promoPkgId,
    setPromoPkgId,
    promoBadge,
    setPromoBadge,
    promoValidFrom,
    setPromoValidFrom,
    promoValidUntil,
    setPromoValidUntil,
    promoTerms,
    setPromoTerms,
    promoSubmitting,
    equipmentList,
    setEquipmentList,
    amenitiesList,
    setAmenitiesList,
    newEquipmentInput,
    setNewEquipmentInput,
    newAmenityInput,
    setNewAmenityInput,
    infraSaving,
    billingPref,
    setBillingPref,
    billingEmail,
    setBillingEmail,
    sstNo,
    setSstNo,
    billingSaving,
    notificationMsg,
    setNotificationMsg,
    stats,
    filteredJobs,
    filteredLocums,
    filteredCases,
    loadFacilityData,
    handleDecisionSubmit,
    handleUpdateJobStatus,
    handleCreateJob,
    handleInviteSubmit,
    handleOpenChat,
    handleSendChatMessage,
    handleQuoteSubmit,
    handleUpdateCaseStatus,
    handleConfirmPackageOrder,
    resetPackageForm,
    handleSavePackage,
    handleEditPackage,
    handleTogglePackageStatus,
    handleDeletePackage,
    resetPromoForm,
    handleSavePromo,
    handleEditPromo,
    handleTogglePromoStatus,
    handleDeletePromo,
    handleSaveInfrastructure,
    handleSaveBillingSettings,
    handleApproveTimesheet,
  };
}
