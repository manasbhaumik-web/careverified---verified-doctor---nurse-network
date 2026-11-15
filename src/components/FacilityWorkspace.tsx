import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Calendar, Users, ShieldCheck, CheckCircle2, XCircle, Plus,
  Search, FileText, Send, Phone, Mail, MapPin, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, Stethoscope, Check,
  MessageSquare, Lock, DollarSign, Tag, PackagePlus, Sparkles, Clock,
  Trash2, Edit3, Copy, HeartPulse, AlertCircle, BadgeCheck, Receipt,
  Printer, Download, CreditCard, LifeBuoy
} from 'lucide-react';
import { useTr } from '../locale';
import DashboardHeader, {
  BannerRow, BannerIdentity, BannerBadge, BannerKpis, DashboardTab, bannerPrimaryBtn
} from '../shared/ui/DashboardHeader';
import WorkspaceHeader from '../shared/ui/WorkspaceHeader';
import FacilityShiftsTab from './facility/FacilityShiftsTab';
import FacilityLocumsTab from './facility/FacilityLocumsTab';
import FacilityCasesTab from './facility/FacilityCasesTab';
import { FacilityPackagesTab } from './facility/FacilityPackagesTab';
import { FacilityProfileTab } from './facility/FacilityProfileTab';
import { FacilityModals } from './facility/FacilityModals';
import { useFacilityWorkspace } from './facility/hooks/useFacilityWorkspace';
import {
  FACILITY_GROUPS,
  type FacilityTab,
  type FacilityTabGroup,
} from './facility/types';

export { FACILITY_GROUPS, type FacilityTab, type FacilityTabGroup };

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
  const tx = useTr();
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
  const {
    loading, error, facility, stats, jobs, locums, cases, packages, promotions, packageOrders, referralLedger,
    expandedJobId, setExpandedJobId, jobFilter, setJobFilter, statusFilter, setStatusFilter, jobSearch, setJobSearch,
    locumSearch, setLocumSearch, locumRoleFilter, setLocumRoleFilter,
    casesSubTab, setCasesSubTab, caseStatusFilter, setCaseStatusFilter,
    decisionModal, setDecisionModal, decisionNotes, setDecisionNotes, actionSubmitting,
    showNewJobModal, setShowNewJobModal, newJobTitle, setNewJobTitle, newJobRole, setNewJobRole,
    newJobType, setNewJobType, newJobSpecialty, setNewJobSpecialty, newJobSalaryMin, setNewJobSalaryMin,
    newJobSalaryMax, setNewJobSalaryMax, newJobSalaryPeriod, setNewJobSalaryPeriod,
    newJobLocation, setNewJobLocation, newJobDesc, setNewJobDesc,
    newJobAcceptsForeign, setNewJobAcceptsForeign, newJobVisaSupport, setNewJobVisaSupport, newJobSubmitting,
    inviteModal, setInviteModal, inviteMessage, setInviteMessage, inviteJobId, setInviteJobId,
    inviteSubmitting, inviteSuccess, setInviteSuccess,
    chatModal, setChatModal, chatMessages, chatInput, setChatInput, chatLoading, chatSending,
    selectedInvoice, setSelectedInvoice, quoteModal, setQuoteModal, quoteProcedure, setQuoteProcedure,
    quoteAmount, setQuoteAmount, quoteDays, setQuoteDays, quoteInclusions, setQuoteInclusions,
    quoteExclusions, setQuoteExclusions, quoteSubmitting,
    packageModalOpen, setPackageModalOpen, editingPackageId, setEditingPackageId, pkgCode, setPkgCode,
    pkgTitle, setPkgTitle, pkgCategory, setPkgCategory, pkgDescription, setPkgDescription,
    pkgDuration, setPkgDuration, pkgPrice, setPkgPrice, pkgOriginalPrice, setPkgOriginalPrice,
    pkgAudience, setPkgAudience, pkgFasting, setPkgFasting, pkgInclusions, setPkgInclusions,
    pkgInclusionInput, setPkgInclusionInput, pkgPreparation, setPkgPreparation,
    pkgStatus, setPkgStatus, pkgSubmitting,
    promoModalOpen, setPromoModalOpen, editingPromoId, setEditingPromoId, promoCode, setPromoCode,
    promoTitle, setPromoTitle, promoDesc, setPromoDesc, promoType, setPromoType, promoValue, setPromoValue,
    promoPkgId, setPromoPkgId, promoBadge, setPromoBadge, promoValidFrom, setPromoValidFrom,
    promoValidUntil, setPromoValidUntil, promoSubmitting,
    equipmentList, setEquipmentList, amenitiesList, setAmenitiesList,
    newEquipmentInput, setNewEquipmentInput, newAmenityInput, setNewAmenityInput, infraSaving,
    billingPref, setBillingPref, billingEmail, setBillingEmail, sstNo, setSstNo, billingSaving,
    notificationMsg, setNotificationMsg, filteredJobs, filteredLocums, filteredCases,
    loadFacilityData, handleDecisionSubmit, handleUpdateJobStatus, handleCreateJob, handleInviteSubmit,
    handleOpenChat, handleSendChatMessage, handleQuoteSubmit, handleUpdateCaseStatus,
    handleConfirmPackageOrder, resetPackageForm, handleSavePackage, handleEditPackage,
    handleTogglePackageStatus, handleDeletePackage, resetPromoForm, handleSavePromo,
    handleEditPromo, handleTogglePromoStatus, handleDeletePromo,
    handleSaveInfrastructure, handleSaveBillingSettings, handleApproveTimesheet,
  } = useFacilityWorkspace(activeGroup);

  const displayedTabs: DashboardTab<Tab>[] = FACILITY_GROUPS[currentGroup].tabs.map(t => ({ ...t, label: tx(t.label) })).map(t => {
    if (t.id === 'shifts') return { ...t, count: stats.activeVacancies };
    if (t.id === 'locums') return { ...t, count: locums.length };
    if (t.id === 'cases') return { ...t, count: stats.patientCases };
    if (t.id === 'packages') return { ...t, count: packages.length };
    return t;
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
        className="shrink-0 min-h-[40px] px-3.5 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors font-medium text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]"
        title={tx('Facility Help & Support Desk')}
      >
        <LifeBuoy className="h-4 w-4 text-slate-500" />
        <span className="whitespace-nowrap font-medium sm:font-semibold">{tx('Help & Support')}</span>
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-0" id="facility-workspace-root">
      {/* Main Facility Banner */}
      {!embedded && (
        <DashboardHeader
          fullWidth={true}
          tabs={[
            { key: 'staffing' as FacilityTabGroup, viewId: 'facility_staffing', icon: Calendar, count: stats.pendingApplicants || undefined },
            { key: 'care' as FacilityTabGroup, viewId: 'facility_care', icon: PackagePlus, count: stats.patientCases || undefined },
            { key: 'profile' as FacilityTabGroup, viewId: 'facility_profile', icon: Building2 },
          ].map(g => ({
            id: g.key,
            label: tx(FACILITY_GROUPS[g.key].name),
            summary: tx(FACILITY_GROUPS[g.key].summary),
            cta: {
              label:
                g.key === 'staffing'
                  ? tx('Manage Shift Vacancies')
                  : g.key === 'care'
                  ? tx('Review Patient Referrals')
                  : tx('Edit Facility Profile'),
              onClick: () => {
                window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: g.viewId }));
                setTab(FACILITY_GROUPS[g.key].defaultTab);
              },
            },
            icon: g.icon,
            count: g.count,
            activeSubTab: tab,
            onSubTabChange: (subId: string) => {
              window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: g.viewId }));
              setTab(subId as Tab);
            },
            subItems: FACILITY_GROUPS[g.key].tabs.map(t => ({
              ...t,
              label: tx(t.label),
              description: tx(t.description),
              count: t.id === 'shifts' ? (stats.pendingApplicants || undefined) : t.id === 'cases' ? (stats.patientCases || undefined) : undefined,
            })),
          }))}
          activeTab={currentGroup}
          onTabChange={(grp) => {
            const viewMap: Record<FacilityTabGroup, string> = {
              staffing: 'facility_staffing',
              care: 'facility_care',
              profile: 'facility_profile',
            };
            window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: viewMap[grp] }));
            setTab(FACILITY_GROUPS[grp].defaultTab);
          }}
          tabsLabel={tx('{name} sections', { name: tx(FACILITY_GROUPS[currentGroup].name) })}
          tabsRight={facilityHelpTab}
        >
          <BannerRow
            identity={
              <BannerIdentity
                as="h1"
                avatarUrl={currentUser?.avatarUrl || '/assets/facility_director_male.jpg'}
                role="facility"
                name={facility?.name || tx('Healthcare Facility & Clinic')}
                badges={
                  <div className="flex flex-wrap items-center gap-1.5">
                    {facility?.isLicenceValid && (
                      <BannerBadge tone="success">
                        <ShieldCheck className="h-3 w-3 inline mr-1" />
                        {tx('Act 586 Licensed')}
                      </BannerBadge>
                    )}
                    {facility?.mhtcMember && (
                      <BannerBadge tone="brand">
                        {tx('MHTC Member')}
                      </BannerBadge>
                    )}
                  </div>
                }
                description={
                  <span>
                    {facility?.city && facility?.state && facility.city.toLowerCase() !== facility.state.toLowerCase()
                      ? `${facility.city}, ${facility.state}`
                      : facility?.city || facility?.state || tx('Kuala Lumpur')}{' '}
                    &bull; {facility?.licenceNo || tx('Act 586 Verified')}
                  </span>
                }
              />
            }
            aside={
              <div className="flex flex-wrap items-center gap-2.5">
                <BannerKpis
                  items={[
                    { label: tx('Active Jobs'), value: stats.activeVacancies },
                    { label: tx('Applicants'), value: stats.pendingApplicants },
                    { label: tx('Referrals'), value: stats.patientCases },
                  ]}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadFacilityData}
                    disabled={loading}
                    className="p-2 text-slate-600 hover:text-[color:var(--ink)] border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] cursor-pointer disabled:opacity-50 h-9 w-9 flex items-center justify-center rounded-none"
                    title={tx('Refresh Data')}
                    aria-label={tx('Refresh Data')}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewJobModal(true)}
                    className={bannerPrimaryBtn}
                  >
                    <Plus className="h-4 w-4" />
                    {tx('Post Job Vacancy')}
                  </button>
                </div>
              </div>
            }
          />
        </DashboardHeader>
      )}

      {/* Main Inner Workspace Content Container */}
      <div className={embedded ? "space-y-6" : "page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
        {/* Toast / Status Notification */}
        {notificationMsg && (
          <div
            role="status"
            className={`p-4 border text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 border-t-2 border-t-emerald-600'
                : 'bg-rose-50 text-rose-800 border-rose-300 border-t-2 border-t-rose-600'
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
              className="text-xs font-bold px-3 py-1 bg-white border border-[color:var(--t-200)] shadow-2xs hover:bg-[color:var(--t-50)] transition-colors cursor-pointer shrink-0 ml-4 rounded-none"
            >
              {tx('Dismiss')}
            </button>
          </div>
        )}

        {/* Loading & Error States */}
        {loading && !facility && (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2 bg-white border border-[color:var(--t-200)] shadow-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-[color:var(--t-600)]" />
            {tx('Loading clinical network workspace…')}
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 text-rose-800 text-xs font-bold border border-rose-300 border-t-2 border-t-rose-600 shadow-xs">
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
                setDecisionModal({ jobId, applicant: app, action });
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
        newJobAcceptsForeign={newJobAcceptsForeign}
        setNewJobAcceptsForeign={setNewJobAcceptsForeign}
        newJobVisaSupport={newJobVisaSupport}
        setNewJobVisaSupport={setNewJobVisaSupport}
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
        chatModal={chatModal}
        setChatModal={setChatModal}
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
