import React, { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, MapPin, Search, PlusCircle, AlertCircle, 
  CheckCircle2, Loader, Tag, Users, ShieldCheck, Heart, LayoutGrid, List, Eye, X, Clock 
} from 'lucide-react';
import { JobPost, UserRole } from '../types';
import DashboardHeader from './DashboardHeader';

interface JobMarketProps {
  jobs: JobPost[];
  onNewJobCreated: (job: JobPost) => void;
  onApplyJob: (id: string, userId: string) => void;
}

export default function JobMarket({ jobs, onNewJobCreated, onApplyJob }: JobMarketProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedModalJob, setSelectedModalJob] = useState<JobPost | null>(null);

  // Job form inputs
  const [hospitalName, setHospitalName] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Shift-based'>('Full-time');
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

  const [activeTab, setActiveTab] = useState<'open' | 'applied'>('open');
  const myApplications = jobs.filter(j => appliedJobs.includes(j.id) || j.appliedUserIds?.includes('doc-1'));
  const baseJobs = activeTab === 'applied' ? myApplications : jobs;
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

    return matchesSearch && matchesType && matchesCity;
  });

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName || !title || !description) return;

    setFormLoading(true);
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
          salaryRange,
          requirements: requirementText.split('\n').filter(r => r.trim() !== '')
        })
      });

      const data = await response.json();
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
      const simulatedUserId = "doc-1"; // Simulate applying as an active practitioner
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: simulatedUserId })
      });

      const data = await response.json();
      if (data.status === 'success') {
        onApplyJob(jobId, simulatedUserId);
        setAppliedJobs([...appliedJobs, jobId]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8" id="job-market-section">
      {/* Standard dashboard header with attached tabs */}
      <DashboardHeader
        eyebrow="B2B Shift & Staff Recruitment"
        title="Hospital Staffing & Nurse Shift Marketplace"
        description="Clinics source credential-verified staff for temporary and full contract roles."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] px-5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold transition-colors cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            {showForm ? 'View Active Shifts' : 'Post Hospital Vacancy'}
          </button>
        }
        tabs={[
          { id: 'open' as const, label: 'Open shifts', icon: Briefcase, count: jobs.length },
          { id: 'applied' as const, label: 'My applications', icon: CheckCircle2, count: myApplications.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabsLabel="Shift sections"
      />

      {/* Summary metrics */}
      <section aria-label="Marketplace summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Open listings', value: jobs.length, caption: 'Across all contract types', icon: Briefcase, tone: 'crimson' },
          { label: 'Shift-based roles', value: shiftBasedCount, caption: 'Temporary cover, nights & weekends', icon: Clock, tone: 'emerald' },
          { label: 'Applications sent', value: myApplications.length, caption: 'Awaiting hospital response', icon: CheckCircle2, tone: 'crimson' },
          { label: 'Verified hospitals', value: hospitalCount, caption: 'Credential-checked posters', icon: ShieldCheck, tone: 'emerald' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#FECDD3] shadow-xs p-5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#334155]">{card.label}</span>
              <span className={`h-8 w-8 flex items-center justify-center border ${card.tone === 'emerald' ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]' : 'bg-[#FFF0F2] border-[#FECDD3] text-[#DC2626]'}`}>
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <span className="text-3xl font-bold tracking-tight text-[#1E293B] tabular-nums">{card.value}</span>
            <span className="text-xs text-slate-600">{card.caption}</span>
          </div>
        ))}
      </section>

      {/* JOB POSTING FORM */}
      {showForm && (
        <form onSubmit={handleCreateJob} className="bg-white border border-[#FECDD3] p-6 shadow-xs space-y-6 animate-slide-down">
          <h3 className="text-base font-bold text-[#1E293B] border-b border-[#FECDD3] pb-3">Publish Shift Openings & Vacancies</h3>
          
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
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
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
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Contract Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="Full-time">Full-time Vacancy</option>
                    <option value="Part-time">Part-time Role</option>
                    <option value="Contract">Contractual Term</option>
                    <option value="Shift-based">Shift-based Marketplace</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Salary Range / Shift Allowance</label>
                  <input
                    type="text"
                    placeholder="e.g. RM 5,000 - RM 8,000 / month"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Location Details</label>
                  <input
                    type="text"
                    placeholder="ICU Department, Ground Floor"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Metro Area / City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="Kuala Lumpur">Kuala Lumpur</option>
                    <option value="Petaling Jaya">Petaling Jaya</option>
                    <option value="Penang">Penang</option>
                    <option value="Johor Bahru">Johor Bahru</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Specialty Required</label>
                  <select
                    value={specialtyRequired}
                    onChange={(e) => setSpecialtyRequired(e.target.value)}
                    className="w-full text-xs border border-[#FECDD3] py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-extrabold text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="ICU & Critical Care">ICU & Critical Care</option>
                    <option value="Geriatric & Eldercare">Geriatric & Eldercare</option>
                    <option value="Pediatric & Neonatal Care">Pediatric & Neonatal Care</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Dermatologist">Dermatologist</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Detailed Description of Clinical Roles</label>
                <textarea
                  rows={3}
                  placeholder="Outline shift schedules, clinical assignments, equipment operation needed, and team scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs border border-[#FECDD3] p-3 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
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
                  className="w-full text-xs border border-[#FECDD3] p-3 outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] font-semibold transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border-2 border-slate-200 text-slate-600 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-rose-400 text-white text-xs font-bold px-8 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                >
                  {formLoading && <Loader className="h-3 w-3 animate-spin" />}
                  Publish Job Vacancy
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* FILTER CONTROLS */}
      <section aria-label="Filters" className="bg-white border border-[#FECDD3] shadow-xs px-5 py-4 flex flex-wrap gap-3 items-center">
        <label htmlFor="job-search" className="sr-only">Search shifts</label>
        <div className="flex-[2_1_280px] flex items-center gap-2.5 border border-[#FECDD3] bg-[#FFF8F9] px-3.5 min-h-[46px] focus-within:border-[#DC2626]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            id="job-search"
            type="text"
            placeholder="Search by role, hospital or keyword"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-[#1E293B] outline-none placeholder-slate-500"
          />
        </div>

        <label htmlFor="job-type" className="sr-only">Contract type</label>
        <select
          id="job-type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex-[1_1_180px] min-h-[46px] border border-[#FECDD3] bg-white px-3 text-sm font-semibold text-[#1E293B] outline-none focus:border-[#DC2626] cursor-pointer"
        >
          <option value="all">All contract types</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
          <option value="Shift-based">Shift-based</option>
        </select>

        <label htmlFor="job-city" className="sr-only">City</label>
        <select
          id="job-city"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="flex-[1_1_180px] min-h-[46px] border border-[#FECDD3] bg-white px-3 text-sm font-semibold text-[#1E293B] outline-none focus:border-[#DC2626] cursor-pointer"
        >
          <option value="all">All cities</option>
          <option value="Kuala Lumpur">Kuala Lumpur</option>
          <option value="Petaling Jaya">Petaling Jaya</option>
          <option value="Penang">Penang</option>
          <option value="Johor Bahru">Johor Bahru</option>
        </select>

        <div className="flex border border-[#FECDD3]">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
            id="toggle-job-grid-view"
            className={`h-11 w-11 flex items-center justify-center cursor-pointer ${viewMode === 'grid' ? 'bg-[#FFF0F2] text-[#B91C1C]' : 'bg-white text-slate-500 hover:bg-[#FFF0F2]'}`}
          >
            <LayoutGrid className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            id="toggle-job-list-view"
            className={`h-11 w-11 flex items-center justify-center border-l border-[#FECDD3] cursor-pointer ${viewMode === 'list' ? 'bg-[#FFF0F2] text-[#B91C1C]' : 'bg-white text-slate-500 hover:bg-[#FFF0F2]'}`}
          >
            <List className="h-[18px] w-[18px]" />
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#1E293B]">{activeTab === 'applied' ? 'Your applications' : 'Open shifts & vacancies'}</h2>
        <span className="text-[13px] text-slate-600">Showing {filteredJobs.length} listing{filteredJobs.length === 1 ? '' : 's'}</span>
      </div>

      {/* ACTIVE SHIFTS CONTAINER */}
      <div
        id={activeTab === 'applied' ? 'panel-applied' : 'panel-open'}
        role="tabpanel"
        aria-labelledby={activeTab === 'applied' ? 'tab-applied' : 'tab-open'}
        className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-4'}
      >
        {filteredJobs.length === 0 ? (
          <div className="col-span-full bg-white border border-[#FECDD3] p-12 text-center space-y-3">
            <Briefcase className="h-12 w-12 text-[#FECDD3] mx-auto" />
            <h4 className="text-sm font-bold text-[#1E293B]">
              {activeTab === 'applied' ? 'You have not applied to any shifts yet' : 'No shift posts match active filters'}
            </h4>
            <p className="text-[13px] text-slate-600">
              {activeTab === 'applied' ? 'Apply to an open shift and it will appear here.' : 'Modify filters to explore other contract categories.'}
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasApplied = appliedJobs.includes(job.id) || job.appliedUserIds?.includes('doc-1');
            const typePill = job.type === 'Shift-based'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FFF0F2] border-[#FECDD3] text-[#B91C1C]';
            const applyButton = (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleApply(job.id); }}
                disabled={hasApplied}
                className={`min-h-[44px] px-5 text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  hasApplied
                    ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] cursor-not-allowed'
                    : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer'
                }`}
              >
                {hasApplied ? (<><CheckCircle2 className="h-4 w-4 text-[#059669]" />Applied</>) : 'Apply for shift'}
              </button>
            );

            if (viewMode === 'list') {
              return (
                <article
                  key={job.id}
                  onClick={() => setSelectedModalJob(job)}
                  className="bg-white border border-[#FECDD3] hover:border-[#FDA4AF] shadow-xs p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 bg-[#FFF0F2] border border-[#FECDD3] flex items-center justify-center text-lg shrink-0">{job.hospitalLogo}</div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[#1E293B] truncate">{job.title}</h3>
                      <p className="text-[13px] text-[#334155] truncate">{job.hospitalName}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-1 text-xs text-[#334155]">
                    <span className={`border text-[11px] font-bold px-2.5 py-1 ${typePill}`}>{job.type}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-500" />{job.city}</span>
                    <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-slate-500" />{job.specialtyRequired}</span>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <span className="text-[15px] font-bold text-[#1E293B]">{job.salaryRange}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedModalJob(job); }}
                        className="min-h-[44px] px-4 bg-white border border-[#FECDD3] hover:bg-[#FFE4E6] text-[#1E293B] text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer"
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
                className="bg-white border border-[#FECDD3] hover:border-[#FDA4AF] shadow-xs hover:shadow-md p-5 transition-all flex flex-col gap-4"
              >
                <div className="flex gap-3.5 items-start">
                  <div className="h-12 w-12 bg-[#FFF0F2] border border-[#FECDD3] flex items-center justify-center text-lg shrink-0">{job.hospitalLogo}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-[#1E293B] leading-snug">{job.title}</h3>
                    <p className="text-[13px] text-[#334155] mt-0.5">{job.hospitalName}</p>
                  </div>
                  <span className={`border text-[11px] font-bold px-2.5 py-1 shrink-0 ${typePill}`}>{job.type}</span>
                </div>

                <div className="flex flex-col gap-2 text-[13px] text-[#334155]">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500 shrink-0" />{job.location}, {job.city}</div>
                  <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-slate-500 shrink-0" />{job.specialtyRequired}</div>
                </div>

                <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2">{job.description}</p>

                <div className="border-t border-[#FFE4E6] pt-3.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[15px] font-bold text-[#1E293B]">{job.salaryRange}</span>
                  <span className="text-xs text-slate-600 inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /><span className="tabular-nums">{job.applicantsCount}</span> applicants</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedModalJob(job)}
                    className="min-h-[44px] bg-white border border-[#FECDD3] hover:bg-[#FFE4E6] text-[#1E293B] text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> View details
                  </button>
                  {applyButton}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Trust note */}
      <section className="bg-[#ECFDF5] border border-[#A7F3D0] px-5 py-4 flex flex-wrap items-center gap-3.5">
        <ShieldCheck className="h-5 w-5 text-[#059669] shrink-0" />
        <p className="flex-1 min-w-[260px] text-[13px] leading-relaxed text-[#065F46]">
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
            className="bg-white border border-[#FECDD3] w-full max-w-xl shadow-2xl overflow-hidden animate-slide-down flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header banner */}
            <div className="bg-[#FFF0F2] text-[#1E293B] border-b border-[#FECDD3] p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#DC2626] border border-slate-700 rounded-xl flex items-center justify-center text-lg shadow-xs shrink-0">
                  {selectedModalJob.hospitalLogo}
                </div>
                <div>
                  <h4 className="text-base font-bold leading-tight">
                    {selectedModalJob.title}
                  </h4>
                  <p className="text-xs text-[#334155] mt-0.5">
                    {selectedModalJob.hospitalName} &bull; Verified Employer
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedModalJob(null)}
                className="text-slate-600 hover:text-[#DC2626] transition-colors cursor-pointer"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Allowance Badge Panel */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-[#FFF0F2] p-4 rounded-xl border border-[#FECDD3]">
                <div>
                  <span className="text-[9px] text-[#B91C1C] block font-black uppercase tracking-wider">Estimated Allowance</span>
                  <span className="font-mono text-base font-extrabold text-[#0F172A] leading-tight block">{selectedModalJob.salaryRange}</span>
                </div>
                <span className="bg-[#DC2626] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
                  {selectedModalJob.type}
                </span>
              </div>

              {/* Location & Specialty Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 block uppercase">Department & City</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {selectedModalJob.location}, {selectedModalJob.city}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[9px] text-slate-400 block uppercase">Specialty Focus</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {selectedModalJob.specialtyRequired}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Detailed Clinical Scope & Shift Schedule</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50/40 p-4 rounded-xl border border-slate-150">
                  {selectedModalJob.description}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5">
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

              {/* Employer verification signature */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  {selectedModalJob.applicantsCount} Practitioners applied
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border border-emerald-100">
                  Verified Healthcare Center
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
              <button
                type="button"
                onClick={() => {
                  handleApply(selectedModalJob.id);
                  setSelectedModalJob(null);
                }}
                disabled={appliedJobs.includes(selectedModalJob.id)}
                className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                  appliedJobs.includes(selectedModalJob.id) 
                    ? "bg-emerald-50 border-2 border-emerald-100 text-emerald-800 cursor-not-allowed" 
                    : "bg-[#DC2626] hover:bg-[#B91C1C] text-white hover:scale-[1.01]"
                }`}
              >
                {appliedJobs.includes(selectedModalJob.id) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Applied
                  </>
                ) : (
                  "Apply for Shift"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
