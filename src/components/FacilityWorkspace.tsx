import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Calendar, Users, ShieldCheck, CheckCircle2, XCircle, Plus,
  Search, FileText, Send, Phone, Mail, MapPin, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, Stethoscope, Check,
  MessageSquare, Lock, DollarSign
} from 'lucide-react';
import DashboardHeader, {
  BannerRow, BannerIdentity, BannerBadge, BannerKpis, DashboardTab, bannerPrimaryBtn
} from './DashboardHeader';

type Tab = 'shifts' | 'locums' | 'cases' | 'profile';

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
  status: string;
  summary: string;
  patient: string;
  patientEmail?: string | null;
  country: string;
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
  updatedAt: string;
  createdAt?: string;
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

export default function FacilityWorkspace() {
  const [tab, setTab] = useState<Tab>('shifts');
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

  // Patient Referral Cases state
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('all');
  const [quoteModal, setQuoteModal] = useState<PatientCase | null>(null);
  const [quoteProcedure, setQuoteProcedure] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDays, setQuoteDays] = useState('2');
  const [quoteInclusions, setQuoteInclusions] = useState('');
  const [quoteExclusions, setQuoteExclusions] = useState('Excludes extra ICU days, complications, international flights.');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

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

      // Fetch facility referral cases
      const casesRes = await fetch('/api/facility/cases');
      const casesData = await casesRes.json();
      if (casesData.status === 'success') {
        setCases(casesData.data);
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

  const tabs: DashboardTab<Tab>[] = [
    { id: 'shifts', label: 'Job Postings & Vacancies', icon: Calendar, count: stats.activeVacancies },
    { id: 'locums', label: 'Practitioner Network', icon: Users, count: locums.length },
    { id: 'cases', label: 'Patient Referrals & Quotes', icon: FileText, count: stats.patientCases },
    { id: 'profile', label: 'Facility Profile & Specialties', icon: Building2 },
  ];

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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={`p-4 border text-xs font-bold flex items-center justify-between ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <span>{notificationMsg.text}</span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-slate-500 hover:text-slate-800 text-sm ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Facility Banner */}
      <DashboardHeader
        fullWidth={true}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel="Facility workspace sections"
      >
        <BannerRow
          identity={
            <BannerIdentity
              as="h1"
              icon={Building2}
              name={facility?.name || 'Healthcare Facility & Clinic'}
              badges={
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
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

      {/* Loading & Error States */}
      {loading && !facility && (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-[color:var(--t-600)]" />
          Loading clinical network workspace…
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
          {error}
        </div>
      )}

      {/* Main Tab Panels */}
      <div>
        {/* ========================================================================= */}
        {/* TAB 1: CLINICAL JOB POSTINGS & APPLICANTS */}
        {/* ========================================================================= */}
        {tab === 'shifts' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[260px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search job postings by title, specialty, ward or location…"
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
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
                <p className="font-bold text-slate-700 text-sm">No job openings found matching your filter criteria.</p>
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
                            <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border ${
                              job.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {job.status}
                            </span>
                            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                              {job.type}
                            </span>
                            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">
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
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white cursor-pointer flex items-center gap-1.5"
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
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Applications for this Vacancy ({applications.length})
                            </h4>
                            <span className="text-[11px] text-slate-500">
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
                                        <span className="text-sm font-black text-slate-900">{app.applicantName}</span>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                                          {app.applicantRole}
                                        </span>
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase border border-emerald-200">
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

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {app.status === 'pending' ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'accepted' })}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
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
                                        <div className="flex items-center gap-2">
                                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase border border-emerald-300 flex items-center gap-1">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Accepted & Confirmed
                                          </span>
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
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold">
                                          Declined
                                        </span>
                                      )}
                                    </div>
                                  </div>

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
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[280px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search practitioners by doctor name, specialty, state, or city…"
                  value={locumSearch}
                  onChange={e => setLocumSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
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
                            <span className="text-sm font-black text-slate-900">{loc.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                              {loc.role}
                            </span>
                          </div>
                          <span className="text-xs text-[color:var(--t-700)] font-black block mt-0.5">
                            {loc.specialization}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300 shrink-0">
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
            <div className="bg-white border border-[color:var(--t-200)] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Patient Referrals & Treatment Quotation Desk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inbound medical referrals, cross-clinic second opinions, MHTC medical tourism, and official treatment quotation generation.
                  </p>
                </div>
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
                  <p className="font-bold text-slate-700">No active patient referral cases found.</p>
                  <p className="text-[11px] text-slate-500">Inbound clinical referral inquiries and cross-border consultations will appear here automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200">
                  {filteredCases.map(c => (
                    <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{c.patient}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                            Origin: {c.country}
                          </span>
                          {c.specialty && (
                            <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-[10px] font-black uppercase border border-[color:var(--t-200)]">
                              {c.specialty}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                            c.status === 'quoted'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : c.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : c.status === 'in_treatment'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 border border-slate-200">
                          {c.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>Case ID: <code className="font-mono text-slate-600 font-bold">{c.id}</code></span>
                          {c.patientEmail && <span>Contact: <strong className="text-slate-600">{c.patientEmail}</strong></span>}
                          {c.preferredFrom && <span>Requested: <strong className="text-slate-600">{c.preferredFrom}</strong></span>}
                          <span>Updated: {new Date(c.updatedAt).toLocaleDateString('en-MY')}</span>
                        </div>

                        {c.latestQuote && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-900">Current Treatment Quotation (v{c.latestQuote.version}):</span>
                            <span className="font-mono font-black text-emerald-800 text-sm">
                              RM {c.latestQuote.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quotation & Status Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setQuoteModal(c);
                            setQuoteProcedure(c.specialty ? `${c.specialty} Treatment Package` : 'Clinical Procedure Package');
                            setQuoteAmount(c.latestQuote ? String(c.latestQuote.total) : '5500');
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          {c.latestQuote ? 'Update Quote' : 'Issue Treatment Quote'}
                        </button>

                        <div className="flex items-center gap-1">
                          {c.status === 'quoted' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaseStatus(c.id, 'accepted')}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 cursor-pointer"
                            >
                              Mark Accepted
                            </button>
                          )}
                          {c.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaseStatus(c.id, 'in_treatment')}
                              className="px-2 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 cursor-pointer"
                            >
                              Admit / In Treatment
                            </button>
                          )}
                          {c.status === 'in_treatment' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCaseStatus(c.id, 'completed')}
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                            >
                              Complete & Discharge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FACILITY PROFILE & CLINICAL SPECIALTIES */}
        {/* ========================================================================= */}
        {tab === 'profile' && (
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
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Facility Name</span>
                    <strong className="text-slate-900">{facility?.name || 'Healthcare Facility'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Operating Category</span>
                    <strong className="text-slate-900 uppercase">{facility?.kind || 'Medical Centre'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Statutory Licence No.</span>
                    <strong className="font-mono text-slate-900">{facility?.licenceNo || 'KKM/JKA/586-90412'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Licence Expiry</span>
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
                      <span className="text-slate-500 text-[11px]">Malaysian Society for Quality in Health</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase border border-emerald-300">
                      Valid
                    </span>
                  </div>
                  {facility?.mhtcMember && (
                    <div className="p-3 bg-blue-50/50 border border-blue-200 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-blue-900 block">MHTC Elite Healthcare Member</strong>
                        <span className="text-blue-700 text-[11px]">Malaysia Healthcare Travel Council</span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase border border-blue-300">
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
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200"
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
        )}
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
                Applicant: <strong className="text-slate-900 text-sm">{decisionModal.applicant.applicantName}</strong> ({decisionModal.applicant.applicantRole})
              </p>
              <p>
                Credential Verification: <strong className="text-slate-800">{decisionModal.applicant.applicantLicense}</strong> (APC Valid)
              </p>
              {decisionModal.action === 'accepted' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900">
                  Accepting this application will lock in this position and notify the practitioner immediately.
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900">
                  Declining this application will notify the applicant that the vacancy is proceeding with other candidates.
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
                  <div className="font-bold text-slate-600">No messages exchanged yet</div>
                  <p>Send reporting details, ward unit instructions, or timing confirmations below.</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.mine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold flex items-center gap-1.5">
                      <span>{msg.senderName}</span>
                      <span className="text-[9px] text-slate-400">
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
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-black text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  {quoteSubmitting ? 'Dispatching…' : 'Dispatch Treatment Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
