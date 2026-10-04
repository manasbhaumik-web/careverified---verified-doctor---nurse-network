import React, { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, MapPin, Search, PlusCircle, AlertCircle, 
  CheckCircle2, Loader, Tag, Users, ShieldCheck, Heart, LayoutGrid, List, Eye, X, Clock 
} from 'lucide-react';
import { JobPost, UserRole } from '../types';
import PageBanner, { BannerStat } from './PageBanner';

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

  // Filter list
  const filteredJobs = jobs.filter(job => {
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
      {/* Intro Header banner */}
      <PageBanner
        eyebrow="B2B Shift & Staff Recruitment"
        title="Hospital Staffing & Nurse Shift Marketplace"
        description="Clinics can source credential-verified staff for temporary and full contract roles."
        actions={
          <>
            <BannerStat value={jobs.length} label="Open listings" />
            <button
              onClick={() => setShowForm(!showForm)}
              className="min-h-11 px-5 border-[1.5px] border-cross text-cross hover:bg-cross hover:text-white rounded-md text-sm font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              {showForm ? "View Active Shifts" : "Post Hospital Vacancy"}
            </button>
          </>
        }
      />

      {/* JOB POSTING FORM */}
      {showForm && (
        <form onSubmit={handleCreateJob} className="bg-white border-2 border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6 animate-slide-down">
          <h3 className="text-sm font-extrabold text-slate-900 border-b-2 border-slate-100 pb-3">Publish Shift Openings & Vacancies</h3>
          
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
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all"
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
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Contract Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-extrabold text-slate-700 cursor-pointer transition-all"
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
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all"
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
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Metro Area / City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-extrabold text-slate-700 cursor-pointer transition-all"
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
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-extrabold text-slate-700 cursor-pointer transition-all"
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
                  className="w-full text-xs border-2 border-slate-200/80 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all"
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
                  className="w-full text-xs border-2 border-slate-200/80 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold transition-all"
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
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold px-8 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
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
      <div className="bg-white border-2 border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shift descriptions, requirements or hospital hubs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
          />
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
          >
            <option value="all">📁 All Job Formats</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Shift-based">Shift-based</option>
          </select>
        </div>

        <div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
          >
            <option value="all">📍 All Cities</option>
            <option value="Kuala Lumpur">Kuala Lumpur</option>
            <option value="Petaling Jaya">Petaling Jaya</option>
            <option value="Penang">Penang</option>
            <option value="Johor Bahru">Johor Bahru</option>
          </select>
        </div>

        {/* List/Grid View Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0 items-center">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="List View"
            id="toggle-job-list-view"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden md:inline">List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grid View"
            id="toggle-job-grid-view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Grid</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SHIFTS CONTAINER */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-4"}>
        {filteredJobs.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-slate-200/80 rounded-xl p-12 text-center space-y-3">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto animate-pulse" />
            <h4 className="text-sm font-extrabold text-slate-800">No shift posts match active filters</h4>
            <p className="text-xs text-slate-500 font-semibold">Modify filters to explore other contract categories.</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasApplied = appliedJobs.includes(job.id);
            
            if (viewMode === 'list') {
              return (
                <div 
                  key={job.id}
                  onClick={() => setSelectedModalJob(job)}
                  className={`bg-white border-2 border-slate-200/80 hover:border-blue-300 rounded-xl p-4 shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 cursor-pointer ${
                    job.type === 'Shift-based' ? 'border-l-red-500' : 'border-l-blue-600'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 bg-slate-50 border-2 border-slate-150 rounded-xl flex items-center justify-center text-base shadow-xs shrink-0">
                      {job.hospitalLogo}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-800 truncate">{job.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{job.hospitalName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <span className="bg-blue-50 border border-blue-100 text-blue-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0">
                      {job.type}
                    </span>
                    <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      📍 {job.city}
                    </span>
                    <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      🏷️ {job.specialtyRequired}
                    </span>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right mr-2">
                      <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Offered Allowance</span>
                      <span className="font-mono text-xs font-extrabold text-blue-900 leading-relaxed block">{job.salaryRange}</span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedModalJob(job)}
                        className="text-xs font-bold py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApply(job.id)}
                        disabled={hasApplied}
                        className={`text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer ${
                          hasApplied 
                            ? "bg-emerald-50 border-2 border-emerald-100 text-emerald-800 cursor-not-allowed" 
                            : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]"
                        }`}
                      >
                        {hasApplied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Applied
                          </>
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={job.id}
                className={`bg-white border-2 border-slate-200/80 hover:border-blue-300 rounded-xl p-6 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border-l-4 ${
                  job.type === 'Shift-based' ? 'border-l-red-500' : 'border-l-blue-600'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-3 items-center">
                      <div className="h-11 w-11 bg-slate-50 border-2 border-slate-150 rounded-xl flex items-center justify-center text-lg shadow-xs">
                        {job.hospitalLogo}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800">{job.title}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{job.hospitalName}</span>
                      </div>
                    </div>
                    <span className="bg-blue-50 border border-blue-100 text-blue-800 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {job.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">{job.description}</p>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5 bg-slate-50/50 p-2 rounded-lg border-2 border-slate-200/40">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.location}, {job.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50/50 p-2 rounded-lg border-2 border-slate-200/40">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.specialtyRequired}</span>
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="bg-slate-50/30 border-2 border-slate-200/60 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Verification Licensing Mandate:
                    </span>
                    <ul className="text-[10px] text-slate-600 list-disc list-inside space-y-1">
                      {job.requirements.slice(0, 3).map((req, idx) => (
                        <li key={idx} className="font-semibold leading-relaxed">{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer and apply action */}
                <div className="flex justify-between items-center border-t-2 border-slate-100/80 pt-4 mt-5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span><span className="font-mono tabular-nums">{job.applicantsCount}</span> Applicants</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Offered Allowance</span>
                      <span className="font-mono text-xs font-extrabold text-blue-900 leading-relaxed block">{job.salaryRange}</span>
                    </div>

                    <button
                      onClick={() => handleApply(job.id)}
                      disabled={hasApplied}
                      className={`text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer ${
                        hasApplied 
                          ? "bg-emerald-50 border-2 border-emerald-100 text-emerald-800 cursor-not-allowed" 
                          : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]"
                      }`}
                    >
                      {hasApplied ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Applied
                        </>
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================== */}
      {/* SHIFT DETAIL MODAL POPUP (LIGHTBOX)        */}
      {/* ========================================== */}
      {selectedModalJob && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalJob(null)}
        >
          <div 
            className="bg-white border-2 border-slate-200 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-slide-down flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header banner */}
            <div className="bg-blue-700 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600 border border-slate-700 rounded-xl flex items-center justify-center text-lg shadow-xs shrink-0">
                  {selectedModalJob.hospitalLogo}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wide leading-tight">
                    {selectedModalJob.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {selectedModalJob.hospitalName} &bull; Verified Employer
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedModalJob(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Allowance Badge Panel */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[9px] text-blue-800 block font-black uppercase tracking-wider">Estimated Allowance</span>
                  <span className="font-mono text-base font-extrabold text-blue-900 leading-tight block">{selectedModalJob.salaryRange}</span>
                </div>
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider">
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
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]"
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
