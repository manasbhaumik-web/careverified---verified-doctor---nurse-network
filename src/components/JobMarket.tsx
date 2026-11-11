import React, { useState, useEffect } from 'react';
import { 
  Briefcase, MapPin, Search, PlusCircle, 
  CheckCircle2, Loader, Tag, Users, ShieldCheck, LayoutGrid, List, Eye, X, Clock,
  Building2, Stethoscope, Home, Banknote
} from 'lucide-react';
import { useTr } from '../locale';
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

function renderFacilityIcon(job: Partial<JobPost>, className = 'h-5 w-5 text-[color:var(--t-600)]') {
  const logo = (job.hospitalLogo || '').trim();
  if (/^(https?:\/\/|\/|data:image\/)/.test(logo)) {
    return <img src={logo} alt={job.hospitalName || ''} className="h-full w-full object-cover" />;
  }
  const combined = `${job.title || ''} ${job.hospitalName || ''} ${job.specialtyRequired || ''}`.toLowerCase();
  if (logo === '🏠' || logo === '🏡' || logo === 'home' || /\bhome\b|geriatric|eldercare/.test(combined)) {
    return <Home className={className} />;
  }
  if (logo === '🩺' || logo === 'stethoscope' || /\bconsultant\b|\bdoctor\b|\bphysician\b|cardiology/.test(combined)) {
    return <Stethoscope className={className} />;
  }
  if (logo && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(logo) && logo !== 'hospital' && logo.length <= 4) {
    return <span className="text-xs font-black tracking-tight text-[color:var(--t-700)]">{logo}</span>;
  }
  return <Building2 className={className} />;
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
  const tx = useTr();
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
      if (data.status !== 'success') setFormError(data.message || tx('Could not publish the listing.'));
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
        alert(data.message || tx('Could not clock in.'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setShiftActionLoading(null);
    }
  };

  const handleClockOut = async (jobId: string) => {
    const hoursStr = window.prompt(tx('Confirm actual hours worked on shift:'), '8.0');
    if (!hoursStr) return;
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0) {
      alert(tx('Please enter a valid number of hours.'));
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
        alert(data.message || tx('Could not clock out.'));
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
          <span className="font-bold text-[color:var(--ink)]">{tx('Application:')}</span>
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
              <Clock className="h-3 w-3 text-amber-600" /> {tx('Under Hospital Review')}
            </span>
          )}
        </div>

        {app?.paymentRef && (
          <div className="text-xs text-slate-600 flex items-center justify-between">
            <span>{tx('Security Reference:')}</span>
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
                {tx('Clock In for Shift')}
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
                  {tx('Clock Out & Submit Hours')}
                </button>
              </div>
            ) : timesheetStatus === 'submitted' ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Timesheet Submitted ({app.actualHours || 8} hrs) &bull; Pending Supervisor Sign-off</span>
              </span>
            ) : timesheetStatus === 'approved' ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-1">
                <Banknote className="h-3.5 w-3.5 shrink-0" />
                <span>RM {totalPayout?.toFixed(2) || '---'} Released to Earnings</span>
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
          eyebrow={tx('Clinical Human Capital · Act 586 Staffing')}
          title={tx('Hospital Staffing & Nurse Shift Marketplace')}
          description={tx('Clinics source credential-verified staff for temporary and full contract roles with automated compliance tracking.')}
          badges={<BannerBadge tone="brand">{tx('National Shift Registry')}</BannerBadge>}
          tabs={[
            { id: 'open' as const, label: tx('Open shifts'), icon: Briefcase, count: jobs.length },
            { id: 'applied' as const, label: tx('My applications'), icon: CheckCircle2, count: myApplications.length },
            { id: 'locums' as const, label: tx('Locums'), icon: Users },
            { id: 'eligibility' as const, label: tx('Eligibility'), icon: ShieldCheck },
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
            { id: 'open' as const, label: tx('Open shifts'), icon: Briefcase, count: jobs.length },
            { id: 'applied' as const, label: tx('My applications'), icon: CheckCircle2, count: myApplications.length },
            { id: 'locums' as const, label: tx('Locums'), icon: Users },
            { id: 'eligibility' as const, label: tx('Eligibility'), icon: ShieldCheck },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsLabel={tx('Shift sections')}
          onOpenHelp={onOpenHelp}
        />
      ) : (
        <DashboardHeader
          eyebrow={tx('B2B Shift & Staff Recruitment')}
          title={tx('Hospital Staffing & Nurse Shift Marketplace')}
          description={tx('Clinics source credential-verified staff for temporary and full contract roles.')}
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
            { id: 'open' as const, label: tx('Open shifts'), icon: Briefcase, count: jobs.length },
            { id: 'applied' as const, label: tx('My applications'), icon: CheckCircle2, count: myApplications.length },
            { id: 'locums' as const, label: tx('Locums'), icon: Users },
            { id: 'eligibility' as const, label: tx('Eligibility'), icon: ShieldCheck },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsLabel={tx('Shift sections')}
        />
      )}

      <div className={embedded ? "space-y-6" : "max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
        {/* Compact Summary Metrics Bar */}
        <section
          aria-label={tx('Marketplace summary')}
          className="bg-white border border-[color:var(--t-200)] shadow-2xs grid grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: tx('Open listings'), value: jobs.length, caption: tx('Across all contract types'), icon: Briefcase, tone: 'brand' },
            { label: tx('Shift-based roles'), value: shiftBasedCount, caption: tx('Temporary cover, nights & weekends'), icon: Clock, tone: 'emerald' },
            { label: tx('Applications sent'), value: myApplications.length, caption: tx('Awaiting hospital response'), icon: CheckCircle2, tone: 'brand' },
            { label: tx('Licensed employers'), value: licensedEmployers, caption: tx('Facility licence checked by us'), icon: ShieldCheck, tone: 'emerald' },
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
          <h3 className="text-base font-bold text-[color:var(--ink)] border-b border-[color:var(--t-200)] pb-3">{tx('Publish Shift Openings & Vacancies')}</h3>
          
          {formSuccess ? (
            <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 font-extrabold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {tx('Listing posted successfully! Redirecting...')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Clinic / Hospital Name')}</label>
                  <input
                    type="text"
                    placeholder={tx('Kuala Lumpur Specialist Hospital')}
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Job Title')}</label>
                  <input
                    type="text"
                    placeholder={tx('ICU Nurse Night Duty Focus')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Contract Type')}</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="Full-time">{tx('Full-time Vacancy')}</option>
                    <option value="Part-time">{tx('Part-time Role')}</option>
                    <option value="Contract">{tx('Contractual Term')}</option>
                    <option value="Shift-based">{tx('Shift-based Marketplace')}</option>
                    <option value="Locum">{tx('Locum cover (dated shifts)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Location Details')}</label>
                  <input
                    type="text"
                    placeholder={tx('ICU Department, Ground Floor')}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('City / Town')}</label>
                  <input type="text" placeholder={tx('Petaling Jaya')} value={city} onChange={(e) => setCity(e.target.value)} className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all" required />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Specialty Required')}</label>
                  <select
                    value={specialtyRequired}
                    onChange={(e) => setSpecialtyRequired(e.target.value)}
                    className="w-full text-xs border border-[color:var(--t-200)] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="ICU & Critical Care">{tx('ICU & Critical Care')}</option>
                    <option value="Geriatric & Eldercare">{tx('Geriatric & Eldercare')}</option>
                    <option value="Pediatric & Neonatal Care">{tx('Pediatric & Neonatal Care')}</option>
                    <option value="Cardiologist">{tx('Cardiologist')}</option>
                    <option value="Dermatologist">{tx('Dermatologist')}</option>
                  </select>
                </div>
              </div>

              <JobFormFields value={extras} onChange={setExtras} jobType={type} />

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Detailed Description of Clinical Roles')}</label>
                <textarea
                  rows={3}
                  placeholder={tx('Outline shift schedules, clinical assignments, equipment operation needed, and team scope...')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-[color:var(--t-200)] p-3 outline-none focus:ring-2 focus:ring-[color:var(--t-600)]/20 focus:border-[color:var(--t-600)] font-semibold transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{tx('Specific Requirements / Licensing (One per line)')}</label>
                <textarea
                  rows={2}
                  placeholder={tx('e.g. Registered with state nursing council with active license')}
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
                  {tx('Publish Job Vacancy')}
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
            <section aria-label={tx('Filters')} className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-[999_1_360px] min-w-[min(100%,360px)]">
                  <label htmlFor="job-search" className="sr-only">{tx('Search shifts')}</label>
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="job-search"
                    type="text"
                    placeholder={tx('Search clinical shifts by role, hospital name, or ward (e.g. ICU, Neonatal, Emergency)…')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label={tx('Clear search query')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Dropdowns & Grid/List View Toggle */}
                <div className="flex flex-wrap items-center gap-2.5 flex-auto max-w-full">
                  <FilterSelect label={tx('Role')} value={filter.role} onChange={v => setFilter({ ...filter, role: v })}>
                    <option value="all">{tx('Doctors & Nurses')}</option>
                    <option value="doctor">{tx('Doctors Only')}</option>
                    <option value="nurse">{tx('Nurses Only')}</option>
                  </FilterSelect>

                  <FilterSelect label={tx('Contract')} value={selectedType} onChange={setSelectedType}>
                    <option value="all">{tx('All Contracts')}</option>
                    <option value="Full-time">{tx('Full-time')}</option>
                    <option value="Part-time">{tx('Part-time')}</option>
                    <option value="Contract">{tx('Contract')}</option>
                    <option value="Shift-based">{tx('Shift-based')}</option>
                    <option value="Locum">{tx('Locum')}</option>
                  </FilterSelect>

                  <FilterSelect label={tx('City')} value={selectedCity} onChange={setSelectedCity}>
                    <option value="all">{tx('All Cities ({n})', { n: distinctCities.length })}</option>
                    {distinctCities.map(c => <option key={c} value={c}>{tx(c)}</option>)}
                  </FilterSelect>

                  <FilterSelect label={tx('State')} value={filter.state} onChange={v => setFilter({ ...filter, state: v })}>
                    <option value="all">{tx('All States')}</option>
                    {MY_STATES.map(s => <option key={s} value={s}>{tx(s)}</option>)}
                  </FilterSelect>

                  <FilterSelect label={tx('Sector')} value={filter.sector} onChange={v => setFilter({ ...filter, sector: v })}>
                    <option value="all">{tx('Public & Private')}</option>
                    <option value="private">{tx('Private Sector')}</option>
                    <option value="public">{tx('Public Sector')}</option>
                    <option value="other">{tx('Other Sector')}</option>
                  </FilterSelect>

                  <div className="flex border border-[color:var(--t-200)] h-11 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label={tx('Grid view')}
                      aria-pressed={viewMode === 'grid'}
                      id="toggle-job-grid-view"
                      className={`h-full w-11 flex items-center justify-center cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-[color:var(--t-600)] text-white' : 'bg-[color:var(--t-bg)] text-slate-500 hover:bg-[color:var(--t-50)]'}`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label={tx('List view')}
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
                    {activeTab === 'applied' ? tx('Your applications: ') : tx('Open shifts & vacancies: ')}
                    {tx('Showing')} <strong className="font-black text-[color:var(--ink)]">{filteredJobs.length}</strong> {tx(baseJobs.length === 1 ? 'of {n} listing' : 'of {n} listings', { n: baseJobs.length })}
                  </span>
                  {filter.role !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {tx('Role: ')}{filter.role === 'doctor' ? tx('Doctors Only') : filter.role === 'nurse' ? tx('Nurses Only') : filter.role}
                      <button type="button" onClick={() => setFilter({ ...filter, role: 'all' })} className="hover:text-slate-900 cursor-pointer"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {selectedType !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {tx('Contract: ')}{tx(selectedType)}
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
                      {tx('State: ')}{tx(filter.state)}
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
                    <span>{tx('Considers practitioners registered abroad')}</span>
                  </label>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
                    >
                      {tx('Reset Filters')}
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
                    {activeTab === 'applied' ? tx('You have not applied to any shifts yet') : tx('No shift posts match active filters')}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {activeTab === 'applied' ? tx('Apply to an open shift and it will appear here.') : tx('Modify filters to explore other contract categories.')}
                  </p>
                  {hasActiveFilters && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="h-10 px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        {tx('Reset All Filters')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const hasApplied = isJobApplied(job);
                  const blockedReason = hasApplied ? null : job.applyBlockedReason;
                  const blockedShortLabel = blockedReason?.includes('for nurses')
                    ? tx('Nurses Only')
                    : blockedReason?.includes('for doctors')
                    ? tx('Doctors Only')
                    : tx('Not eligible');

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
                        <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{tx('Applied')}</>
                      ) : blockedReason ? (
                        blockedShortLabel
                      ) : (
                        tx('Apply for shift')
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
                          <div className="h-11 w-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center shrink-0">{renderFacilityIcon(job)}</div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-[color:var(--ink)] truncate">{job.title}</h3>
                            <p className="text-xs text-[color:var(--ink-2)] truncate">{job.hospitalName}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-1 text-xs text-[color:var(--ink-2)]">
                          <span className={`border text-2xs font-black uppercase tracking-wider px-2 py-0.5 ${typePill}`}>{tx(job.type)}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" />{tx(job.city)}</span>
                          <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-[color:var(--t-600)]" />{tx(job.specialtyRequired)}</span>
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
                        <div className="h-11 w-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center shrink-0">{renderFacilityIcon(job)}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-[color:var(--ink)] leading-snug">{job.title}</h3>
                          <p className="text-xs text-[color:var(--ink-2)] font-medium mt-0.5">{job.hospitalName}</p>
                        </div>
                        <span className={`border text-2xs font-black uppercase tracking-wider px-2 py-0.5 shrink-0 ${typePill}`}>{tx(job.type)}</span>
                      </div>

                      {/* Location & Specialty Metadata */}
                      <div className="flex flex-col gap-1.5 text-xs text-[color:var(--ink-2)] font-medium">
                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" /><span>{job.location}, {tx(job.city)}</span></div>
                        <div className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" /><span>{tx(job.specialtyRequired)}</span></div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{job.description}</p>

                      {/* Salary, Applicants & Compliance Pill Badges */}
                      <div className="border-t border-[color:var(--t-100)] pt-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-extrabold font-mono text-[color:var(--ink)]">{job.salaryRange}</span>
                          <span className="text-2xs font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 inline-flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3 text-slate-500" />
                            <span className="tabular-nums">{job.applicantsCount}</span> {tx(job.applicantsCount === 1 ? 'applicant' : 'applicants')}
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
                            <Eye className="h-3.5 w-3.5" /> {tx('View details')}
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
          <strong className="font-bold">{tx('Credential-verified only.')}</strong> {tx('Every applicant is checked against MMC and LJM registries before a hospital sees the application.')}
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
                <div className="h-10 w-10 bg-white border border-[color:var(--t-200)] rounded-none flex items-center justify-center shadow-2xs shrink-0">
                  {renderFacilityIcon(selectedModalJob)}
                </div>
                <div>
                  <h4 className="text-base font-bold leading-tight">
                    {selectedModalJob.title}
                  </h4>
                  <p className="text-xs text-[color:var(--ink-2)] mt-0.5">
                    {selectedModalJob.hospitalName} &bull; {selectedModalJob.employer?.licenceOk ? tx('Licence checked') : tx('Licence not checked')}
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
                  <span className="text-xs text-[color:var(--t-700)] block font-black uppercase tracking-wider">{tx('Estimated Allowance')}</span>
                  <span className="font-mono text-base font-extrabold text-[color:var(--ink)] leading-tight block">{selectedModalJob.salaryRange}</span>
                </div>
                <span className="bg-[color:var(--t-600)] text-white text-2xs font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  {tx(selectedModalJob.type)}
                </span>
              </div>

              {/* Location & Specialty Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-xs text-slate-400 block uppercase">{tx('Department & City')}</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {selectedModalJob.location}, {tx(selectedModalJob.city)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-xs text-slate-400 block uppercase">{tx('Specialty Focus')}</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {tx(selectedModalJob.specialtyRequired)}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block">{tx('Detailed Clinical Scope & Shift Schedule')}</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50/40 p-4 rounded-xl border border-slate-150">
                  {selectedModalJob.description}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                  {tx('Mandated Licensing & Clinical Credentials Check:')}
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
                  {tx('{n} Practitioners applied', { n: selectedModalJob.applicantsCount })}
                </span>
                <span className={`px-2 py-0.5 rounded text-2xs font-extrabold uppercase border ${selectedModalJob.employer?.licenceOk ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
                  {selectedModalJob.employer?.licenceOk ? tx('Facility licence checked') : tx('Employer not checked')}
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
                {tx('Close Details')}
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
