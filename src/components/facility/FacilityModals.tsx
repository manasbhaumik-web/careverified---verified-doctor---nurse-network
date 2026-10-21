import React from 'react';
import {
  FileText,
  Lock,
  Send,
  MessageSquare,
  RefreshCw,
  DollarSign,
  Check,
  Printer,
} from 'lucide-react';
import {
  FacilityJob,
  Application,
  LocumProfile,
  PatientCase,
  MedicalPackage,
  FacilityProfile,
  ReferralLedgerCase,
} from './types';

export interface FacilityModalsProps {
  facility: FacilityProfile | null;
  jobs: FacilityJob[];

  // 1. Decision Modal
  decisionModal: { app: Application; action: 'shortlist' | 'accept' | 'decline' } | null;
  setDecisionModal: React.Dispatch<React.SetStateAction<{ app: Application; action: 'shortlist' | 'accept' | 'decline' } | null>>;
  decisionNotes: string;
  setDecisionNotes: React.Dispatch<React.SetStateAction<string>>;
  actionSubmitting: boolean;
  handleDecisionSubmit: () => void;

  // 2. New Job Modal
  showNewJobModal: boolean;
  setShowNewJobModal: React.Dispatch<React.SetStateAction<boolean>>;
  newJobTitle: string;
  setNewJobTitle: React.Dispatch<React.SetStateAction<string>>;
  newJobRole: 'Doctor' | 'Nurse';
  setNewJobRole: React.Dispatch<React.SetStateAction<'Doctor' | 'Nurse'>>;
  newJobType: string;
  setNewJobType: React.Dispatch<React.SetStateAction<string>>;
  newJobSpecialty: string;
  setNewJobSpecialty: React.Dispatch<React.SetStateAction<string>>;
  newJobSalaryMin: string;
  setNewJobSalaryMin: React.Dispatch<React.SetStateAction<string>>;
  newJobSalaryMax: string;
  setNewJobSalaryMax: React.Dispatch<React.SetStateAction<string>>;
  newJobSalaryPeriod: string;
  setNewJobSalaryPeriod: React.Dispatch<React.SetStateAction<string>>;
  newJobLocation: string;
  setNewJobLocation: React.Dispatch<React.SetStateAction<string>>;
  newJobDesc: string;
  setNewJobDesc: React.Dispatch<React.SetStateAction<string>>;
  newJobSubmitting: boolean;
  handleCreateJob: (e: React.FormEvent) => void;

  // 3. Invite Locum Modal
  inviteModal: LocumProfile | null;
  setInviteModal: React.Dispatch<React.SetStateAction<LocumProfile | null>>;
  inviteMessage: string;
  setInviteMessage: React.Dispatch<React.SetStateAction<string>>;
  inviteJobId: string;
  setInviteJobId: React.Dispatch<React.SetStateAction<string>>;
  inviteSubmitting: boolean;
  inviteSuccess: boolean;
  handleInviteSubmit: (e: React.FormEvent) => void;

  // 4. Chat Modal
  chatModal: Application | null;
  setChatModal: React.Dispatch<React.SetStateAction<Application | null>>;
  chatMessages: Array<{ id: string; sender: string; text: string; time: string }>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  chatLoading: boolean;
  chatSending: boolean;
  handleSendChatMessage: (e: React.FormEvent) => void;

  // 5. Patient Quote Modal
  quoteModal: PatientCase | null;
  setQuoteModal: React.Dispatch<React.SetStateAction<PatientCase | null>>;
  quoteProcedure: string;
  setQuoteProcedure: React.Dispatch<React.SetStateAction<string>>;
  quoteAmount: string;
  setQuoteAmount: React.Dispatch<React.SetStateAction<string>>;
  quoteDays: string;
  setQuoteDays: React.Dispatch<React.SetStateAction<string>>;
  quoteInclusions: string;
  setQuoteInclusions: React.Dispatch<React.SetStateAction<string>>;
  quoteExclusions: string;
  setQuoteExclusions: React.Dispatch<React.SetStateAction<string>>;
  quoteSubmitting: boolean;
  handleQuoteSubmit: (e: React.FormEvent) => void;

  // 6. Medical Package Modal
  packages: MedicalPackage[];
  packageModalOpen: boolean;
  setPackageModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingPackageId: string | null;
  pkgCode: string;
  setPkgCode: React.Dispatch<React.SetStateAction<string>>;
  pkgTitle: string;
  setPkgTitle: React.Dispatch<React.SetStateAction<string>>;
  pkgCategory: string;
  setPkgCategory: React.Dispatch<React.SetStateAction<string>>;
  pkgDescription: string;
  setPkgDescription: React.Dispatch<React.SetStateAction<string>>;
  pkgDuration: string;
  setPkgDuration: React.Dispatch<React.SetStateAction<string>>;
  pkgPrice: string;
  setPkgPrice: React.Dispatch<React.SetStateAction<string>>;
  pkgOriginalPrice: string;
  setPkgOriginalPrice: React.Dispatch<React.SetStateAction<string>>;
  pkgAudience: string;
  setPkgAudience: React.Dispatch<React.SetStateAction<string>>;
  pkgFasting: boolean;
  setPkgFasting: React.Dispatch<React.SetStateAction<boolean>>;
  pkgInclusions: string[];
  setPkgInclusions: React.Dispatch<React.SetStateAction<string[]>>;
  pkgInclusionInput: string;
  setPkgInclusionInput: React.Dispatch<React.SetStateAction<string>>;
  pkgPreparation: string;
  setPkgPreparation: React.Dispatch<React.SetStateAction<string>>;
  pkgStatus: 'published' | 'draft';
  setPkgStatus: React.Dispatch<React.SetStateAction<'published' | 'draft'>>;
  pkgSubmitting: boolean;
  handleSavePackage: (e: React.FormEvent) => void;

  // 7. Promotion Modal
  promoModalOpen: boolean;
  setPromoModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingPromoId: string | null;
  promoCode: string;
  setPromoCode: React.Dispatch<React.SetStateAction<string>>;
  promoTitle: string;
  setPromoTitle: React.Dispatch<React.SetStateAction<string>>;
  promoDesc: string;
  setPromoDesc: React.Dispatch<React.SetStateAction<string>>;
  promoType: 'percentage' | 'fixed_discount';
  setPromoType: React.Dispatch<React.SetStateAction<'percentage' | 'fixed_discount'>>;
  promoValue: string;
  setPromoValue: React.Dispatch<React.SetStateAction<string>>;
  promoPkgId: string;
  setPromoPkgId: React.Dispatch<React.SetStateAction<string>>;
  promoBadge: string;
  setPromoBadge: React.Dispatch<React.SetStateAction<string>>;
  promoValidFrom: string;
  setPromoValidFrom: React.Dispatch<React.SetStateAction<string>>;
  promoValidUntil: string;
  setPromoValidUntil: React.Dispatch<React.SetStateAction<string>>;
  promoSubmitting: boolean;
  handleSavePromo: (e: React.FormEvent) => void;

  // 8. Referral Commission Invoice Modal
  selectedInvoice: ReferralLedgerCase | null;
  setSelectedInvoice: React.Dispatch<React.SetStateAction<ReferralLedgerCase | null>>;
}

export const FacilityModals: React.FC<FacilityModalsProps> = ({
  facility,
  jobs,
  decisionModal,
  setDecisionModal,
  decisionNotes,
  setDecisionNotes,
  actionSubmitting,
  handleDecisionSubmit,
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
  newJobSubmitting,
  handleCreateJob,
  inviteModal,
  setInviteModal,
  inviteMessage,
  setInviteMessage,
  inviteJobId,
  setInviteJobId,
  inviteSubmitting,
  inviteSuccess,
  handleInviteSubmit,
  chatModal,
  setChatModal,
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  chatSending,
  handleSendChatMessage,
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
  handleQuoteSubmit,
  packages,
  packageModalOpen,
  setPackageModalOpen,
  editingPackageId,
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
  pkgPreparation,
  setPkgPreparation,
  pkgStatus,
  setPkgStatus,
  pkgSubmitting,
  handleSavePackage,
  promoModalOpen,
  setPromoModalOpen,
  editingPromoId,
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
  promoSubmitting,
  handleSavePromo,
  selectedInvoice,
  setSelectedInvoice,
}) => {
  return (
    <>
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
    </>
  );
};
