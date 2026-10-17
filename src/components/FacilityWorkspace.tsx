import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2, Calendar, Users, Award, ShieldCheck, CheckCircle2, XCircle, Clock, Plus,
  Search, Filter, AlertCircle, FileText, Send, Phone, Mail, MapPin, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, UserCheck, Stethoscope, AlertTriangle, Check
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
  country: string;
  specialty?: string;
  preferredFrom?: string;
  updatedAt: string;
}

export default function FacilityWorkspace() {
  const [tab, setTab] = useState<Tab>('shifts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facility, setFacility] = useState<FacilityProfile | null>(null);
  const [stats, setStats] = useState<FacilityStats>({
    activeVacancies: 0, pendingApplicants: 0, acceptedLocums: 0, patientCases: 0,
  });

  // Shifts state
  const [jobs, setJobs] = useState<FacilityJob[]>([]);
  const [jobFilter, setJobFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
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

  // Locums state
  const [locums, setLocums] = useState<LocumProfile[]>([]);
  const [locumSearch, setLocumSearch] = useState('');
  const [locumRoleFilter, setLocumRoleFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [inviteModal, setInviteModal] = useState<LocumProfile | null>(null);
  const [inviteMessage, setInviteMessage] = useState('Greetings. Pantai Medical Centre Bangsar would like to invite you for upcoming clinical locum coverage.');
  const [inviteJobId, setInviteJobId] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Cases state
  const [cases, setCases] = useState<PatientCase[]>([]);

  // Feedback banner
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

      // Fetch locums
      const locRes = await fetch('/api/locums');
      const locData = await locRes.json();
      if (locData.status === 'success') {
        setLocums(locData.data);
      }

      // Fetch facility cases
      const casesRes = await fetch('/api/tourism/cases/mine');
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
            ? `Application successfully accepted! ${decisionModal.applicant.applicantName} has been officially scheduled.`
            : `Application from ${decisionModal.applicant.applicantName} has been declined.`,
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

  // Handle Post New Job
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
          description: newJobDesc.trim() || `Licensed clinical facility seeking credentialed ${newJobRole} for shift roster.`,
          facilityId: facility?.id,
          acceptsForeign: false,
          visaSupport: false,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationMsg({ type: 'success', text: `Job listing "${newJobTitle}" published successfully with Act 586 compliance!` });
        setShowNewJobModal(false);
        setNewJobTitle('');
        setNewJobSpecialty('');
        setNewJobDesc('');
        loadFacilityData();
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not publish shift opening.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setNewJobSubmitting(false);
    }
  };

  // Handle Invite Locum
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
        setInviteSuccess(`Invitation sent to ${inviteModal.name}. They will receive an immediate notification.`);
        setTimeout(() => {
          setInviteSuccess('');
          setInviteModal(null);
        }, 2200);
      } else {
        setNotificationMsg({ type: 'error', text: data.message || 'Could not send invitation.' });
      }
    } catch {
      setNotificationMsg({ type: 'error', text: 'Network error.' });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const tabs: DashboardTab<Tab>[] = [
    { id: 'shifts', label: 'Shift Vacancies & Applicants', icon: Calendar, count: stats.pendingApplicants },
    { id: 'locums', label: 'Verified Locum Roster', icon: Users, count: locums.length },
    { id: 'cases', label: 'Patient Referrals & Quotes', icon: FileText, count: stats.patientCases },
    { id: 'profile', label: 'Facility Licence & Standards', icon: ShieldCheck },
  ];

  const filteredJobs = jobs.filter(j => {
    if (jobFilter === 'pending') return j.pendingCount > 0;
    if (jobFilter === 'active') return j.status === 'Active';
    return true;
  });

  const filteredLocums = locums.filter(l => {
    if (locumRoleFilter !== 'all' && l.role !== locumRoleFilter) return false;
    if (locumSearch) {
      const q = locumSearch.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchSpec = l.specialization.toLowerCase().includes(q);
      const matchCity = l.city.toLowerCase().includes(q);
      const matchState = l.states.some(s => s.toLowerCase().includes(q));
      return matchName || matchSpec || matchCity || matchState;
    }
    return true;
  });

  return (
    <div className="w-full space-y-0 text-slate-800 font-sans">
      {/* Institutional Top Dashboard Header */}
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
              name={facility?.name || 'Clinic & Hospital Facility Workspace'}
              badges={
                <div className="flex flex-wrap items-center gap-1.5">
                  <BannerBadge tone="brand">KKM Act 586 Licensed</BannerBadge>
                  {facility?.accreditations?.some(a => a.body === 'MSQH') && (
                    <BannerBadge tone="success">MSQH Accredited</BannerBadge>
                  )}
                  {facility?.mhtcMember && (
                    <BannerBadge tone="brand">MHTC Member</BannerBadge>
                  )}
                </div>
              }
              description={
                facility
                  ? `${facility.address} · Licence: ${facility.licenceNo} (Valid until ${facility.licenceExpiry})`
                  : 'Loading clinical facility telemetry…'
              }
            />
          }
          aside={
            <BannerKpis
              items={[
                { value: stats.activeVacancies, label: 'Active Openings' },
                { value: stats.pendingApplicants, label: 'Pending Applicants' },
                { value: stats.acceptedLocums, label: 'Scheduled Shifts' },
                { value: stats.patientCases, label: 'Patient Quotes' },
              ]}
            />
          }
        />
      </DashboardHeader>

      {/* Main Workspace Body */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Notifications and Alerts */}
        {notificationMsg && (
          <div
            role="alert"
            className={`p-4 border flex items-center justify-between text-sm font-semibold rounded-none ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notificationMsg.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              )}
              <span>{notificationMsg.text}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SHIFT VACANCIES & APPLICANTS RECRUITMENT LOOP */}
        {/* ========================================================================= */}
        {tab === 'shifts' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Filter Openings:</span>
                <div className="inline-flex border border-[color:var(--t-200)] p-0.5 bg-slate-50">
                  <button
                    onClick={() => setJobFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      jobFilter === 'all'
                        ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Vacancies ({jobs.length})
                  </button>
                  <button
                    onClick={() => setJobFilter('pending')}
                    className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      jobFilter === 'pending'
                        ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Needs Decision ({jobs.filter(j => j.pendingCount > 0).length})
                  </button>
                  <button
                    onClick={() => setJobFilter('active')}
                    className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                      jobFilter === 'active'
                        ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Active Openings ({jobs.filter(j => j.status === 'Active').length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(true)}
                  className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold flex items-center gap-2 border border-[color:var(--t-700)] shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Post New Shift Opening
                </button>
                <button
                  type="button"
                  onClick={loadFacilityData}
                  className="p-2 border border-[color:var(--t-200)] bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="Refresh listings"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Statutory Compliance Callout */}
            <div className="bg-amber-50/70 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wider block text-amber-800">
                  KKM Act 586 Statutory Recruitment Standard
                </span>
                Private Healthcare Facilities and Services Act 1998 requires that private clinics and hospitals verify that all practicing doctors hold an active Malaysian Medical Council (MMC) registration with a valid Annual Practising Certificate (APC), and all nurses hold active Malaysian Nursing Board (LJM) certificates. CareVerified automates this credential audit before applicants reach your terminal.
              </div>
            </div>

            {/* Vacancies and Applicant List */}
            {filteredJobs.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-12 text-center space-y-3">
                <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-extrabold text-slate-900">No vacancies matching criteria</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "Post New Shift Opening" above to publish shifts for verified doctors or nurses.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map(job => {
                  const isExpanded = expandedJobId === job.id;
                  return (
                    <div
                      key={job.id}
                      className="bg-white border border-[color:var(--t-200)] transition-shadow hover:shadow-xs"
                    >
                      {/* Job Header Bar */}
                      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--t-100)] bg-slate-50/50">
                        <div className="space-y-1.5 min-w-[280px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-[color:var(--t-600)] text-white text-[10px] font-black uppercase tracking-wider">
                              {job.type}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider">
                              For: {job.roleRequired || 'Any'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              Posted: {new Date(job.postedAt).toLocaleDateString('en-MY')}
                            </span>
                          </div>
                          <h2 className="text-lg font-black text-[color:var(--ink)] tracking-tight">
                            {job.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                              {job.specialtyRequired}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {job.location}, {job.city}
                            </span>
                            <span className="font-extrabold text-[color:var(--t-700)]">
                              {job.salaryRange}
                            </span>
                          </div>
                        </div>

                        {/* Status & Toggle */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-slate-700 block">
                              Applicants ({job.applications.length})
                            </span>
                            {job.pendingCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-extrabold border border-amber-300">
                                <Clock className="h-3 w-3" />
                                {job.pendingCount} Pending Decision
                              </span>
                            ) : job.acceptedCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                {job.acceptedCount} Scheduled
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">No applicants yet</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="p-2 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold"
                          >
                            <span>{isExpanded ? 'Hide' : 'Review'}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Applicants Review Panel */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 bg-white border-t border-[color:var(--t-200)] space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                              Applicant Verification & Decision Terminal ({job.applications.length})
                            </h3>
                            <span className="text-xs text-slate-500">
                              Job ID: <code className="font-mono">{job.id}</code>
                            </span>
                          </div>

                          {job.applications.length === 0 ? (
                            <div className="p-6 bg-slate-50 text-center text-xs text-slate-500">
                              No practitioners have applied for this vacancy yet. You can invite qualified practitioners directly from the "Verified Locum Roster" tab.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {job.applications.map(app => (
                                <div
                                  key={app.id}
                                  className={`p-4 border transition-colors ${
                                    app.status === 'accepted'
                                      ? 'bg-emerald-50/40 border-emerald-300'
                                      : app.status === 'declined'
                                      ? 'bg-slate-50 border-slate-200 opacity-70'
                                      : 'bg-white border-[color:var(--t-200)] hover:border-[color:var(--t-400)]'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    {/* Applicant Details */}
                                    <div className="flex items-start gap-3.5 min-w-[260px]">
                                      <img
                                        src={app.avatar}
                                        alt={app.applicantName}
                                        className="w-12 h-12 object-cover border border-slate-200 shrink-0 bg-slate-100"
                                      />
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-black text-slate-900">
                                            {app.applicantName}
                                          </span>
                                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                                            {app.applicantRole}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                          <span>Registration: <strong className="font-mono text-slate-800">{app.applicantLicense || 'DEMO-MMC-0001'}</strong></span>
                                          <span>APC Expiry: <strong className="text-slate-800">{app.applicantApcExpiry || '2029-12-31'}</strong></span>
                                          {app.applicantRate && (
                                            <span className="text-[color:var(--t-700)] font-black">
                                              Rate: RM {app.applicantRate}/hr
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          Specialization: {app.specialization} · Experience: {app.experienceYears} yrs · Applied: {new Date(app.appliedAt).toLocaleDateString('en-MY')}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Decision Status / Actions */}
                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                                      {app.status === 'pending' ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'accepted' })}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 border border-emerald-700 cursor-pointer shadow-xs"
                                          >
                                            <Check className="h-4 w-4" />
                                            Accept Application
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDecisionModal({ jobId: job.id, applicant: app, action: 'declined' })}
                                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer"
                                          >
                                            <XCircle className="h-4 w-4" />
                                            Decline
                                          </button>
                                        </div>
                                      ) : app.status === 'accepted' ? (
                                        <div className="text-right">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Application Accepted
                                          </span>
                                          <span className="block text-[10px] text-slate-500 mt-0.5">
                                            Decided: {app.decisionAt ? new Date(app.decisionAt).toLocaleDateString('en-MY') : 'Scheduled'}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold">
                                          Declined
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {app.decisionNotes && (
                                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 border border-slate-200 font-mono">
                                      Notes: {app.decisionNotes}
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
        {/* TAB 2: VERIFIED LOCUM ROSTER DIRECTORY */}
        {/* ========================================================================= */}
        {tab === 'locums' && (
          <div className="space-y-6">
            <div className="bg-white border border-[color:var(--t-200)] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1 min-w-[280px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search locums by doctor name, specialty, state, or city..."
                  value={locumSearch}
                  onChange={e => setLocumSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[color:var(--t-200)] text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-slate-500">Role:</span>
                <button
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
                No verified locums found matching search criteria.
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
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                              {loc.role}
                            </span>
                          </div>
                          <span className="text-xs text-[color:var(--t-700)] font-extrabold block">
                            {loc.specialization}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                          APC Active
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        <div>Registration: <strong className="font-mono text-slate-800">{loc.registry || 'MMC Registered'}</strong></div>
                        <div>APC Expiry: <strong className="text-slate-800">{loc.apcValidUntil || '2029-12-31'}</strong></div>
                        <div>Available in: <strong className="text-slate-800">{loc.states?.join(', ') || loc.city || 'Kuala Lumpur'}</strong></div>
                        {loc.minRate && (
                          <div className="text-xs font-black text-[color:var(--t-700)]">
                            Min Rate: RM {loc.minRate} / {loc.ratePeriod || 'hour'}
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
        {/* TAB 3: PATIENT CASES & TREATMENT QUOTES */}
        {/* ========================================================================= */}
        {tab === 'cases' && (
          <div className="space-y-6">
            <div className="bg-white border border-[color:var(--t-200)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Patient Referrals & Treatment Quotation Desk
                  </h2>
                  <p className="text-xs text-slate-500">
                    Direct patient inquiries, treatment packages, and Ministry of Health compliance logs.
                  </p>
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold">
                  {cases.length} Total Registered Inquiries
                </span>
              </div>

              {cases.length === 0 ? (
                <div className="p-8 bg-slate-50 text-center text-xs text-slate-500">
                  No active patient referral cases currently recorded for this facility.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200">
                  {cases.map(c => (
                    <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">{c.patient || 'Patient Referral'}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                            Origin: {c.country || 'Malaysia'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{c.summary}</p>
                        <span className="text-[11px] text-slate-400">Case ID: {c.id} · Updated: {new Date(c.updatedAt).toLocaleDateString('en-MY')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 uppercase">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FACILITY OPERATING LICENCE & ACCREDITATION STANDARDS */}
        {/* ========================================================================= */}
        {tab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Act 586 Statutory Licence Details */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-black text-slate-900">
                  KKM Act 586 Statutory Operating Licence
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Facility Operating Name</span>
                  <span className="font-extrabold text-slate-800">{facility?.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">MOH / KKM Licence Number</span>
                  <span className="font-mono font-extrabold text-[color:var(--t-700)]">{facility?.licenceNo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Licence Reference File</span>
                  <span className="font-mono text-slate-700">{facility?.licenceReference}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Licence Expiration Date</span>
                  <span className="font-extrabold text-emerald-700">{facility?.licenceExpiry} (Active)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Audited By</span>
                  <span className="text-slate-700">Medical Practice Division, Ministry of Health Malaysia</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Statutory Governing Law</span>
                  <span className="text-slate-800 font-medium">Private Healthcare Facilities and Services Act 1998 (Act 586)</span>
                </div>
              </div>
            </div>

            {/* Quality Accreditations & Clinical Services */}
            <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Award className="h-5 w-5 text-[color:var(--t-600)]" />
                <h2 className="text-base font-black text-slate-900">
                  Accreditations & Operational Capabilities
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-500">Accreditations</span>
                  <div className="flex flex-wrap gap-2">
                    {facility?.accreditations?.map(acc => (
                      <span
                        key={acc.number}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-extrabold border border-emerald-300"
                      >
                        {acc.body} ({acc.number} · Valid till {acc.validUntil})
                      </span>
                    )) || <span className="text-xs text-slate-500">MSQH Accredited</span>}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase text-slate-500">Verified Clinical Services</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> 24-Hour Emergency Dept
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Intensive Care Unit (ICU)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Digital Radiology & Imaging
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Clinical Laboratory (SAMM)
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-xs font-black uppercase text-slate-500">Direct Contact</span>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>Phone: <strong className="text-slate-800">{facility?.phone}</strong></div>
                    <div>Email: <strong className="text-slate-800">{facility?.email}</strong></div>
                    <div>Address: <span className="text-slate-700">{facility?.address}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DECISION MODAL (ACCEPT / DECLINE) */}
      {/* ========================================================================= */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {decisionModal.action === 'accepted' ? 'Accept Shift Application' : 'Decline Shift Application'}
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
                  Accepting this application will lock in this shift on the facility roster and automatically dispatch a confirmation notification to the practitioner.
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900">
                  Declining this application will notify the applicant that the position is proceeding with other candidates.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase text-slate-700 block">
                Internal Operational Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Scheduled for Ward 4B on-call rotation. Briefing with Unit Manager at 07:30."
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
                  Publish New Shift / Locum Opening
                </h3>
                <span className="text-xs text-slate-500">
                  Accredited under Private Healthcare Facilities and Services Act 1998 (Act 586)
                </span>
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
                  Job Position Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Locum Emergency Physician - Weekend Coverage"
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Role Required *
                  </label>
                  <select
                    value={newJobRole}
                    onChange={e => setNewJobRole(e.target.value as any)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="doctor">Doctor (MMC Registered)</option>
                    <option value="nurse">Nurse (LJM Registered)</option>
                    <option value="any">Any Clinical Practitioner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Arrangement Type
                  </label>
                  <select
                    value={newJobType}
                    onChange={e => setNewJobType(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="Locum">Locum (Per Shift)</option>
                    <option value="Shift-based">Shift-based</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Full-time">Full-time</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Clinical Specialty / Discipline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Medicine, ICU, Paediatrics, General Practice"
                  value={newJobSpecialty}
                  onChange={e => setNewJobSpecialty(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Min Rate (RM)
                  </label>
                  <input
                    type="number"
                    value={newJobSalaryMin}
                    onChange={e => setNewJobSalaryMin(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Max Rate (RM)
                  </label>
                  <input
                    type="number"
                    value={newJobSalaryMax}
                    onChange={e => setNewJobSalaryMax(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Rate Period
                  </label>
                  <select
                    value={newJobSalaryPeriod}
                    onChange={e => setNewJobSalaryPeriod(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="hour">per hour</option>
                    <option value="shift">per shift</option>
                    <option value="day">per day</option>
                    <option value="month">per month</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Location / Ward Unit
                </label>
                <input
                  type="text"
                  value={newJobLocation}
                  onChange={e => setNewJobLocation(e.target.value)}
                  className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none focus:outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-slate-700 block">
                  Description & Requirements
                </label>
                <textarea
                  rows={3}
                  value={newJobDesc}
                  onChange={e => setNewJobDesc(e.target.value)}
                  placeholder="Clinical shift requirements, procedures required, shift timing..."
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
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer"
                >
                  {newJobSubmitting ? 'Publishing…' : 'Publish Shift Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVITE LOCUM MODAL */}
      {/* ========================================================================= */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Invite {inviteModal.name} ({inviteModal.role})
              </h3>
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {inviteSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Link to Active Shift Opening (Optional)
                  </label>
                  <select
                    value={inviteJobId}
                    onChange={e => setInviteJobId(e.target.value)}
                    className="w-full border border-[color:var(--t-200)] px-3 py-2 text-sm rounded-none bg-white focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    <option value="">No specific job (General shift inquiry)</option>
                    {jobs.filter(j => j.status === 'Active').map(j => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.salaryRange})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-slate-700 block">
                    Invitation Message *
                  </label>
                  <textarea
                    rows={4}
                    required
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
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] cursor-pointer"
                  >
                    {inviteSubmitting ? 'Sending…' : 'Send Locum Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
