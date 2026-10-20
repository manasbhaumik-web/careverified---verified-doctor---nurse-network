import React, { useState, useEffect } from 'react';
import { 
  Briefcase, MapPin, Search, PlusCircle, 
  CheckCircle2, Loader, Tag, Users, ShieldCheck, LayoutGrid, List, Eye, X, Clock 
} from 'lucide-react';
import { JobPost, Professional, Review, Booking } from '../types';
import DashboardHeader, { BannerBadge, FilterSelect } from './DashboardHeader';
import { MY_STATES } from '../identity';
import PractitionerHeroBanner from './PractitionerHeroBanner';
import WorkspaceHeader from './WorkspaceHeader';
import { JobFormFields, JobFilters, JobBadges, JobDetailExtras, EligibilityInfo, LocumBoard, blankExtras, blankFilter, extrasPayload, matchesFilter, type JobExtras, type JobFilter } from './JobMarketMy';

interface JobMarketProps {
  jobs: JobPost[];
  onNewJobCreated: (job: JobPost) => void;
  onApplyJob: (id: string, userId: string) => void;
  onRefreshData?: () => void;
  role?: string;
  currentUser?: any;
  professionals?: Professional[];
  reviews?: Review[];
  bookings?: Booking[];
  onOpenHelp?: () => void;
  embedded?: boolean;
}

export default function JobMarket({
  jobs,
  onNewJobCreated,
  onApplyJob,
  onRefreshData,
  role = 'practitioner',
  currentUser,
  professionals = [],
  reviews = [],
  bookings = [],
  onOpenHelp,
  embedded = false,
}: JobMarketProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedModalJob, setSelectedModalJob] = useState<JobPost | null>(null);

  // Job form inputs
  const [hospitalName, setHospitalName] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Shift-based' | 'Locum'>('Full-time');
  const [extras, setExtras] = useState<JobExtras>(blankExtras);
  const [filter, setFilter] = useState<JobFilter>(blankFilter);
  const [formError, setFormError] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('Kuala Lumpur');
  const [specialtyRequired, setSpecialtyRequired] = useState('ICU & Critical Care');
  const [description, setDescription] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [requirementText, setRequirementText] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Application tracker
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'open' | 'applied' | 'locums' | 'eligibility'>('open');
  const isJobApplied = (j: JobPost) => Boolean(j.myApplication) || appliedJobs.includes(j.id) || (j.appliedUserIds?.length ?? 0) > 0;
  const myApplications = jobs.filter(isJobApplied);
  const baseJobs = activeTab === 'applied' ? myApplications : jobs;
  const licensedEmployers = new Set(jobs.filter(j => j.employer?.licenceOk).map(j => j.hospitalName)).size;
  const shiftBasedCount = jobs.filter(j => j.type === 'Shift-based').length;
  const hospitalCount = new Set(jobs.map(j => j.hospitalName)).size;

  // Filter list
  const filteredJobs = baseJobs.filter(job => {
    const matchesSearch = searchTerm === '' || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || job.type === selectedType;
    const matchesCity = selectedCity === 'all' || job.city === selectedCity;

    return matchesSearch && matchesType && matchesCity && matchesFilter(job, filter);
  });

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName || !title || !description) return;

    setFormLoading(true);
    setFormError('');
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName,
          title,
          type,
          location,
          city,
          specialtyRequired,
          description,
          ...extrasPayload(extras),
          requirements: requirementText.split('\n').filter(r => r.trim() !== '')
        })
      });

      const data = await response.json();
      if (data.status !== 'success') setFormError(data.message || 'Could not publish the listing.');
      if (data.status === 'success') {
        onNewJobCreated(data.data);
        setFormSuccess(true);
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess(false);
          // Reset form fields
          setHospitalName('');
          setTitle('');
          setDescription('');
          setSalaryRange('');
          setExtras(blankExtras);
          setRequirementText('');
        }, 1500);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, { method: 'POST' });

      const data = await response.json();
      setApplyMsg(data.status === 'success' ? '' : data.message);
      if (data.status === 'success') {
        onApplyJob(jobId, data.data.appliedUserIds?.[0] ?? '');
        setAppliedJobs([...appliedJobs, jobId]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const [shiftActionLoading, setShiftActionLoading] = useState<string | null>(null);

  const handleClockIn = async (jobId: string) => {
    setShiftActionLoading(jobId);
    try {
      const response = await fetch(`/api/practitioner/shifts/${jobId}/clock-in`, { method: 'POST' });
      const data = await response.json();
      if (data.status === 'success') {
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.message || 'Could not clock in.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShiftActionLoading(null);
    }
  };

  const handleClockOut = async (jobId: string) => {
    const hoursStr = window.prompt('Confirm actual hours worked on shift:', '8.0');
    if (!hoursStr) return;
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      alert('Please enter a valid number of hours.');
      return;
    }
    setShiftActionLoading(jobId);
    try {
      const response = await fetch(`/api/practitioner/shifts/${jobId}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualHours: hours })
      });
      const data = await response.json();
      if (data.status === 'success') {
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.message || 'Could not clock out.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShiftActionLoading(null);
    }
  };

  const renderApplicationStatus = (job: JobPost) => {
    const app = job.myApplication;
    if (!app && !appliedJobs.includes(job.id) && activeTab !== 'applied') return null;

    const status = app?.status || 'pending';
    const isAccepted = status === 'accepted';
    const isDeclined = status === 'declined';
    const isPending = status === 'pending';

    const clockInAt = app?.clockInAt;
    const clockOutAt = app?.clockOutAt;
    const timesheetStatus = app?.timesheetStatus || 'unstarted';
    const totalPayout = app?.totalPayoutMyr;

    return (
      <div className="border border-[color:var(--t-200)] bg-[color:var(--t-bg)] p-3 text-xs space-y-2 mt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[color:var(--ink)]">Application:</span>
          {isAccepted && (
            <span className="inline-flex items-center gap-1 text-2xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Accepted & Escrow Secured
            </span>
          )}
          {isDeclined && (
            <span className="inline-flex items-center gap-1 text-2xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5">
              <X className="h-3 w-3 text-rose-600" /> Declined
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1 text-2xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5">
              <Clock className="h-3 w-3 text-amber-600" /> Under Hospital Review
            </span>
          )}
        </div>

        {app?.paymentRef && (
          <div className="text-xs text-slate-600 flex items-center justify-between">
            <span>Security Reference:</span>
            <span className="font-mono font-bold text-[color:var(--ink)]">{app.paymentRef}</span>
          </div>
        )}

        {app?.decisionNote && (
          <p className="text-xs text-slate-600 italic bg-white p-2 border border-slate-200">
            "{app.decisionNote}"
          </p>
        )}

        {isAccepted && (
          <div className="pt-2 border-t border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-2">
            {!clockInAt ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClockIn(job.id); }}
                disabled={shiftActionLoading === job.id}
                className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] text-white font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {shiftActionLoading === job.id ? <Loader className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                Clock In for Shift
              </button>
            ) : !clockOutAt ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  On Duty ({new Date(clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClockOut(job.id); }}
                  disabled={shiftActionLoading === job.id}
                  className="bg-[color:var(--t-700)] hover:bg-[color:var(--t-800)] border border-[color:var(--t-800)] text-white font-bold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {shiftActionLoading === job.id ? <Loader className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Clock Out & Submit Hours
                </button>
              </div>
            ) : timesheetStatus === 'submitted' ? (
              <span className="font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-1">
                ⏱️ Timesheet Submitted ({app.actualHours || 8} hrs) &bull; Pending Supervisor Sign-off
              </span>
            ) : timesheetStatus === 'approved' ? (
              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-1">
                💰 RM {totalPayout?.toFixed(2) || '---'} Released to Earnings
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-0" id="job-market-section">
      {/* Header section: WorkspaceHeader when embedded, otherwise full banner */}
      {embedded ? (
        <WorkspaceHeader
          icon={Briefcase}
          eyebrow="Clinical Human Capital · Act 586 Staffing"
          title="Hospital Staffing & Nurse Shift Marketplace"
          description="Clinics source credential-verified staff for temporary and full contract roles with automated compliance tracking."
          badges={<BannerBadge tone="brand">National Shift Registry</BannerBadge>}
          tabs={[
            { id: 'open' as const, label: 'Open shifts', icon: Briefcase, count: jobs.length },
            { id: 'applied' as const, label: 'My applications', icon: CheckCircle2, count: myApplications.length },
            { id: 'locums' as const, label: 'Locums', icon: Users },
            { id: 'eligibility' as const, label: 'Eligibility', icon: ShieldCheck },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          aside={
            (role === 'facility' || role === 'admin') ? (
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{showForm ? 'View Active Shifts' : 'Post Hospital Vacancy'}</span>
              </button>
            ) : undefined
          }
        />
      ) : role === 'practitioner' ? (
        <PractitionerHeroBanner
          currentUser={currentUser}
          professionals={professionals}
          reviews={reviews}
          bookings={bookings}
          groupName="Clinical Shifts"
          tabs={[
            { id: 'open' as const, label: 'Open shifts', icon: Briefcase, count: jobs.length },
            { id: 'applied' as const, label: 'My applications', icon: CheckCircle2, count: myApplications.length },
            { id: 'locums' as const, label: 'Locums', icon: Users },
            { id: 'eligibility' as const, label: 'Eligibility', icon: ShieldCheck },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsLabel="Shift sections"
          onOpenHelp={onOpenHelp}
        />
      ) : (
        <DashboardHeader
          eyebrow="B2B Shift & Staff Recruitment"
          title="Hospital Staffing & Nurse Shift Marketplace"
          description="Clinics source credential-verified staff for temporary and full contract roles."
          actions={
            (role === 'facility' || role === 'admin') ? (
              <button
                onClick={() => setShowForm(!showForm)}
                className="min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {showForm ? 'View Active Shifts' : 'Post Hospital Vacancy'}
              </button>
            ) : undefined
          }
          tabs={[
            { id: 'open' as const, label: 'Open shifts', icon: Briefcase, count: jobs.length },
            { id: 'applied' as const, label: 'My applications', icon: CheckCircle2, count: myApplications.length },
            { id: 'locums' as const, label: 'Locums', icon: Users },
            { id: 'eligibility' as const, label: 'Eligibility', icon: ShieldCheck },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsLabel="Shift sections"
        />
      )}

      <div className={embedded ? "space-y-6" : "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
        {/* Compact Summary Metrics Bar */}
        <section
          aria-label="Marketplace summary"
          className="bg-white border border-[color:var(--t-200)] shadow-2xs grid grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: 'Open listings', value: jobs.length, caption: 'Across all contract types', icon: Briefcase, tone: 'brand' },
            { label: 'Shift-based roles', value: shiftBasedCount, caption: 'Temporary cover, nights & weekends', icon: Clock, tone: 'emerald' },
            { label: 'Applications sent', value: myApplications.length, caption: 'Awaiting hospital response', icon: CheckCircle2, tone: 'brand' },
            { label: 'Licensed employers', value: licensedEmployers, caption: 'Facility licence checked by us', icon: ShieldCheck, tone: 'emerald' },
          ].map((card, idx) => (
            <div
              key={card.label}
              className={`p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 min-w-0 border-[color:var(--t-200)] ${
                idx !== 0 ? 'lg:border-l' : ''
              } ${idx % 2 === 1 ? 'border-l lg:border-l-0' : ''} ${
                idx < 2 ? 'border-b lg:border-b-0' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[color:var(--ink-2)] uppercase tracking-wider truncate">{card.label}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black font-mono text-[color:var(--ink)] tabular-nums leading-none">
                    {card.value}
                  </span>
                  <span className="text-xs text-slate-500 font-medium truncate hidden xl:inline">
                    {card.caption}
                  </span>
                </div>
              </div>
              <span
                className={`h-8 w-8 shrink-0 flex items-center justify-center border ${
                  card.tone === 'emerald'
                    ? 'bg-[color:var(--e-50)] border-[color:var(--e-200)] text-[color:var(--e-600)]'
                    : 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)]'
                }`}
              >
                <card.icon className="h-4 w-4" />
              </span>
            </div>
          ))}
        </section>

      {/* JOB POSTING FORM */}
      {showForm && (
        <form onSubmit={handleCreateJob} className="bg-white border border-[color:var(--t-200)] p-6 shadow-xs space-y-6 animate-slide-down">
          <h3 className="text-base font-bold text-[color:var(--ink)] border-b border-[color:var(--t-200)] pb-3">Publish Shift Openings & Vacancies</h3>
          
          {formSuccess ? (
            <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 font-extrabold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Listing posted successfully! Redirecting...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Clinic / Hospital Name</label>
                  <input
                    type="text"
                    placeholder="Kuala Lumpur Specialist Hospital"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    placeholder="ICU Nurse Night Duty Focus"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Contract Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="Full-time">Full-time Vacancy</option>
                    <option value="Part-time">Part-time Role</option>
                    <option value="Contract">Contractual Term</option>
                    <option value="Shift-based">Shift-based Marketplace</option>
                    <option value="Locum">Locum cover (dated shifts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Location Details</label>
                  <input
                    type="text"
                    placeholder="ICU Department, Ground Floor"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">City / Town</label>
                  <input type="text" placeholder="Petaling Jaya" value={city} onChange={(e) => setCity(e.target.value)} className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all" required />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Specialty Required</label>
                  <select
                    value={specialtyRequired}
                    onChange={(e) => setSpecialtyRequired(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="ICU & Critical Care">ICU & Critical Care</option>
                    <option value="Geriatric & Eldercare">Geriatric & Eldercare</option>
                    <option value="Pediatric & Neonatal Care">Pediatric & Neonatal Care</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Dermatologist">Dermatologist</option>
                  </select>
                </div>
              </div>

              <JobFormFields value={extras} onChange={setExtras} jobType={type} />

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Detailed Description of Clinical Roles</label>
                <textarea
                  rows={3}
                  placeholder="Outline shift schedules, clinical assignments, equipment operation needed, and team scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-[color:var(--t-200)] p-3 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Specific Requirements / Licensing (One per line)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Registered with state nursing council with active license"
                  value={requirementText}
                  onChange={(e) => setRequirementText(e.target.value)}
                  className="w-full text-xs border border-[color:var(--t-200)] p-3 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                  required
                />
              </div>

              {formError && <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-slate-300 text-slate-700 text-xs font-bold px-5 h-12 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-bold px-8 h-12 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {formLoading && <Loader className="h-4 w-4 animate-spin" />}
                  Publish Job Vacancy
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {activeTab === 'eligibility' && <EligibilityInfo />}
      {activeTab === 'locums' && <LocumBoard role={role} jobs={jobs} />}
      {applyMsg && <p role="alert" className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 p-3">{applyMsg}</p>}

      {(activeTab === 'open' || activeTab === 'applied') && (() => {
        const distinctCities = Array.from(new Set(jobs.map(j => j.city).filter(Boolean))).sort();
        const hasActiveFilters =
          searchTerm.trim() !== '' ||
          selectedType !== 'all' ||
          selectedCity !== 'all' ||
          filter.state !== 'all' ||
          filter.sector !== 'all' ||
          filter.role !== 'all' ||
          filter.foreign;

        const resetAllFilters = () => {
          setSearchTerm('');
          setSelectedType('all');
          setSelectedCity('all');
          setFilter(blankFilter);
        };

        return (
          <>
            {/* UNIFIED SINGLE-ROW h-11 FILTER CONTROL BAR */}
            <section aria-label="Filters" className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px]">
                  <label htmlFor="job-search" className="sr-only">Search shifts</label>
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="job-search"
                    type="text"
                    placeholder="Search clinical shifts by role, hospital name, or ward (e.g. ICU, Neonatal, Emergency)…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search query"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Dropdowns & Grid/List View Toggle */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <FilterSelect label="Role" value={filter.role} onChange={v => setFilter({ ...filter, role: v })}>
                    <option value="all">Doctors &amp; Nurses</option>
                    <option value="doctor">Doctors Only</option>
                    <option value="nurse">Nurses Only</option>
                  </FilterSelect>

                  <FilterSelect label="Contract" value={selectedType} onChange={setSelectedType}>
                    <option value="all">All Contracts</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Shift-based">Shift-based</option>
                    <option value="Locum">Locum</option>
                  </FilterSelect>

                  <FilterSelect label="City" value={selectedCity} onChange={setSelectedCity}>
                    <option value="all">All Cities ({distinctCities.length})</option>
                    {distinctCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </FilterSelect>

                  <FilterSelect label="State" value={filter.state} onChange={v => setFilter({ ...filter, state: v })}>
                    <option value="all">All States</option>
                    {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </FilterSelect>

                  <FilterSelect label="Sector" value={filter.sector} onChange={v => setFilter({ ...filter, sector: v })}>
                    <option value="all">Public &amp; Private</option>
                    <option value="private">Private Sector</option>
                    <option value="public">Public Sector</option>
                    <option value="other">Other Sector</option>
                  </FilterSelect>

                  <div className="flex border border-[color:var(--t-200)] h-11 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                      id="toggle-job-grid-view"
                      className={`h-full w-11 flex items-center justify-center cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-[color:var(--t-600)] text-white' : 'bg-[color:var(--t-bg)] text-slate-500 hover:bg-[color:var(--t-50)]'}`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                      id="toggle-job-list-view"
                      className={`h-full w-11 flex items-center justify-center border-l border-[color:var(--t-200)] cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-[color:var(--t-600)] text-white' : 'bg-[color:var(--t-bg)] text-slate-500 hover:bg-[color:var(--t-50)]'}`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Summary, Foreign Registration Toggle & Result Counter Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[color:var(--t-100)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
                    {activeTab === 'applied' ? 'Your applications: ' : 'Open shifts & vacancies: '}
                    Showing <strong className="font-black text-[color:var(--ink)]">{filteredJobs.length}</strong> of {baseJobs.length} listing{baseJobs.length === 1 ? '' : 's'}
                  </span>
                  {filter.role !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      Role: {filter.role}
                      <button type="button" onClick={() => setFilter({ ...filter, role: 'all' })} className="hover:text-slate-900 cursor-pointer"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {selectedType !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      Contract: {selectedType}
                      <button type="button" onClick={() => setSelectedType('all')} className="hover:text-slate-900 cursor-pointer"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {selectedCity !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      City: {selectedCity}
                      <button type="button" onClick={() => setSelectedCity('all')} className="hover:text-slate-900 cursor-pointer"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {filter.state !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      State: {filter.state}
                      <button type="button" onClick={() => setFilter({ ...filter, state: 'all' })} className="hover:text-slate-900 cursor-pointer"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {filter.sector !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      Sector: {filter.sector}
                      <button type="button" onClick={() => setFilter({ ...filter, sector: 'all' })} className="hover:text-slate-900 cursor-pointer"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filter.foreign}
                      onChange={e => setFilter({ ...filter, foreign: e.target.checked })}
                      className="h-3.5 w-3.5 accent-[color:var(--t-600)] rounded-none cursor-pointer"
                    />
                    <span>Considers practitioners registered abroad</span>
                  </label>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* ACTIVE SHIFTS CONTAINER */}
            <div
              id={activeTab === 'applied' ? 'panel-applied' : 'panel-open'}
              role="tabpanel"
              aria-labelledby={activeTab === 'applied' ? 'tab-applied' : 'tab-open'}
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-4'}
            >
              {filteredJobs.length === 0 ? (
                <div className="col-span-full bg-white border border-[color:var(--t-200)] p-12 text-center space-y-3">
                  <Briefcase className="h-10 w-10 text-[color:var(--t-200)] mx-auto" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">
                    {activeTab === 'applied' ? 'You have not applied to any shifts yet' : 'No shift posts match active filters'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {activeTab === 'applied' ? 'Apply to an open shift and it will appear here.' : 'Modify filters to explore other contract categories.'}
                  </p>
                  {hasActiveFilters && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="h-10 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const hasApplied = isJobApplied(job);
                  const blockedReason = hasApplied ? null : job.applyBlockedReason;
                  const blockedShortLabel = blockedReason?.includes('for nurses')
                    ? 'Nurses Only'
                    : blockedReason?.includes('for doctors')
                    ? 'Doctors Only'
                    : 'Not eligible';

                  const typePill = job.type === 'Shift-based'
                    ? 'bg-[color:var(--e-50)] border-[color:var(--e-200)] text-[color:var(--e-800)]'
                    : 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-700)]';

                  const applyButton = (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleApply(job.id); }}
                      disabled={hasApplied || !!blockedReason}
                      title={blockedReason ?? undefined}
                      className={`min-h-[40px] px-4 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        hasApplied
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 cursor-not-allowed'
                          : blockedReason
                          ? 'bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer'
                      }`}
                    >
                      {hasApplied ? (
                        <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Applied</>
                      ) : blockedReason ? (
                        blockedShortLabel
                      ) : (
                        'Apply for shift'
                      )}
                    </button>
                  );

                  if (viewMode === 'list') {
                    return (
                      <article
                        key={job.id}
                        onClick={() => setSelectedModalJob(job)}
                        className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] shadow-2xs p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="h-11 w-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center text-base shrink-0">{job.hospitalLogo}</div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-[color:var(--ink)] truncate">{job.title}</h3>
                            <p className="text-xs text-[color:var(--ink-2)] truncate">{job.hospitalName}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-1 text-xs text-[color:var(--ink-2)]">
                          <span className={`border text-2xs font-black uppercase tracking-wider px-2 py-0.5 ${typePill}`}>{job.type}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" />{job.city}</span>
                          <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-[color:var(--t-600)]" />{job.specialtyRequired}</span>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                          <span className="text-base font-bold font-mono text-[color:var(--ink)]">{job.salaryRange}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedModalJob(job); }}
                              className="min-h-[40px] px-4 bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </button>
                            {applyButton}
                          </div>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article
                      key={job.id}
                      className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] shadow-2xs p-5 transition-all flex flex-col gap-3.5"
                    >
                      {/* Header Row */}
                      <div className="flex gap-3 items-start">
                        <div className="h-11 w-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center text-base shrink-0">{job.hospitalLogo}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-[color:var(--ink)] leading-snug">{job.title}</h3>
                          <p className="text-xs text-[color:var(--ink-2)] font-medium mt-0.5">{job.hospitalName}</p>
                        </div>
                        <span className={`border text-2xs font-black uppercase tracking-wider px-2 py-0.5 shrink-0 ${typePill}`}>{job.type}</span>
                      </div>

                      {/* Location & Specialty Metadata */}
                      <div className="flex flex-col gap-1.5 text-xs text-[color:var(--ink-2)] font-medium">
                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" /><span>{job.location}, {job.city}</span></div>
                        <div className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" /><span>{job.specialtyRequired}</span></div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{job.description}</p>

                      {/* Salary, Applicants & Compliance Pill Badges */}
                      <div className="border-t border-[color:var(--t-100)] pt-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-extrabold font-mono text-[color:var(--ink)]">{job.salaryRange}</span>
                          <span className="text-2xs font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 inline-flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3 text-slate-500" />
                            <span className="tabular-nums">{job.applicantsCount}</span> applicant{job.applicantsCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <JobBadges job={job} />
                      </div>

                      {/* Bottom-Aligned Application Status & Action Buttons */}
                      <div className="mt-auto pt-3 border-t border-[color:var(--t-100)] space-y-3">
                        {renderApplicationStatus(job)}
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedModalJob(job)}
                            className="min-h-[40px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View details
                          </button>
                          {applyButton}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        );
      })()}

      {/* Trust note */}
      <section className="bg-[color:var(--e-50)] border border-[color:var(--e-200)] px-5 py-4 flex flex-wrap items-center gap-3.5">
        <ShieldCheck className="h-5 w-5 text-[color:var(--e-600)] shrink-0" />
        <p className="flex-1 min-w-[260px] text-xs leading-relaxed text-[color:var(--e-800)]">
          <strong className="font-bold">Credential-verified only.</strong> Every applicant is checked against MMC and LJM registries before a hospital sees the application.
        </p>
      </section>

      {/* ========================================== */}
      {/* SHIFT DETAIL MODAL POPUP (LIGHTBOX)        */}
      {/* ========================================== */}
      {selectedModalJob && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalJob(null)}
        >
          <div 
            className="bg-white border border-[color:var(--t-200)] w-full max-w-xl shadow-2xl overflow-hidden animate-slide-down flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header banner */}
            <div className="bg-[color:var(--t-50)] text-[color:var(--ink)] border-b border-[color:var(--t-200)] p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[color:var(--t-600)] border border-slate-700 rounded-xl flex items-center justify-center text-lg shadow-xs shrink-0">
                  {selectedModalJob.hospitalLogo}
                </div>
                <div>
                  <h4 className="text-base font-bold leading-tight">
                    {selectedModalJob.title}
                  </h4>
                  <p className="text-xs text-[color:var(--ink-2)] mt-0.5">
                    {selectedModalJob.hospitalName} &bull; {selectedModalJob.employer?.licenceOk ? 'Licence checked' : 'Licence not checked'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedModalJob(null)}
                className="text-slate-600 hover:text-[color:var(--t-600)] transition-colors cursor-pointer"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Allowance Badge Panel */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-[color:var(--t-50)] p-4 rounded-xl border border-[color:var(--t-200)]">
                <div>
                  <span className="text-xs text-[color:var(--t-700)] block font-black uppercase tracking-wider">Estimated Allowance</span>
                  <span className="font-mono text-base font-extrabold text-[color:var(--ink)] leading-tight block">{selectedModalJob.salaryRange}</span>
                </div>
                <span className="bg-[color:var(--t-600)] text-white text-2xs font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  {selectedModalJob.type}
                </span>
              </div>

              {/* Location & Specialty Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-xs text-slate-400 block uppercase">Department & City</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {selectedModalJob.location}, {selectedModalJob.city}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-xs text-slate-400 block uppercase">Specialty Focus</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {selectedModalJob.specialtyRequired}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block">Detailed Clinical Scope & Shift Schedule</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50/40 p-4 rounded-xl border border-slate-150">
                  {selectedModalJob.description}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                  Mandated Licensing & Clinical Credentials Check:
                </span>
                <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-4 space-y-2">
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-1.5">
                    {selectedModalJob.requirements.map((req, idx) => (
                      <li key={idx} className="font-semibold leading-relaxed">{req}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <JobDetailExtras job={selectedModalJob} />

              {/* Employer verification signature */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  {selectedModalJob.applicantsCount} Practitioners applied
                </span>
                <span className={`px-2 py-0.5 rounded text-2xs font-extrabold uppercase border ${selectedModalJob.employer?.licenceOk ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
                  {selectedModalJob.employer?.licenceOk ? 'Facility licence checked' : 'Employer not checked'}
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedModalJob(null)}
                className="flex-1 border-2 border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close Details
              </button>
              <div className="flex-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    handleApply(selectedModalJob.id);
                    setSelectedModalJob(null);
                  }}
                  disabled={isJobApplied(selectedModalJob) || !!selectedModalJob.applyBlockedReason || role === 'patient'}
                  className={`w-full text-xs font-bold py-2.5 transition-all flex items-center justify-center gap-1.5 ${
                    isJobApplied(selectedModalJob)
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-not-allowed" 
                      : selectedModalJob.applyBlockedReason || role === 'patient'
                      ? "bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white cursor-pointer"
                  }`}
                >
                  {isJobApplied(selectedModalJob) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Applied
                    </>
                  ) : selectedModalJob.applyBlockedReason ? (
                    "Not Eligible"
                  ) : role === 'patient' ? (
                    "Practitioners Only"
                  ) : (
                    "Apply for Shift"
                  )}
                </button>
                {!isJobApplied(selectedModalJob) && selectedModalJob.applyBlockedReason && (
                  <span className="text-xs text-rose-600 font-semibold text-center leading-tight">
                    {selectedModalJob.applyBlockedReason}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
