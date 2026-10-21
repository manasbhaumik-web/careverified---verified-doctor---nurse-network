import React from 'react';
import {
  Calendar, ShieldCheck, Plus, Search, MapPin, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Check, FileText, MessageSquare
} from 'lucide-react';
import WorkspaceHeader from '../WorkspaceHeader';
import { BannerBadge, DashboardTab } from '../DashboardHeader';
import { FacilityJob, Application } from './types';

interface FacilityShiftsTabProps {
  embedded?: boolean;
  displayedTabs: DashboardTab[];
  tab: string;
  setTab: (tab: any) => void;
  jobSearch: string;
  setJobSearch: (val: string) => void;
  jobFilter: 'all' | 'doctor' | 'nurse';
  setJobFilter: (val: 'all' | 'doctor' | 'nurse') => void;
  statusFilter: 'all' | 'Active' | 'Closed';
  setStatusFilter: (val: 'all' | 'Active' | 'Closed') => void;
  filteredJobs: FacilityJob[];
  expandedJobId: string | null;
  setExpandedJobId: (id: string | null) => void;
  onPostJob: () => void;
  onUpdateJobStatus: (jobId: string, newStatus: 'Active' | 'Closed') => void;
  onOpenDecision: (jobId: string, app: Application, action: 'accepted' | 'declined') => void;
  onApproveTimesheet: (jobId: string, app: Application) => void;
  onOpenChat: (jobId: string, jobTitle: string, app: Application) => void;
}

export default function FacilityShiftsTab({
  embedded,
  displayedTabs,
  tab,
  setTab,
  jobSearch,
  setJobSearch,
  jobFilter,
  setJobFilter,
  statusFilter,
  setStatusFilter,
  filteredJobs,
  expandedJobId,
  setExpandedJobId,
  onPostJob,
  onUpdateJobStatus,
  onOpenDecision,
  onApproveTimesheet,
  onOpenChat,
}: FacilityShiftsTabProps) {
  return (
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
            onClick={onPostJob}
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
            onClick={onPostJob}
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
                      onClick={() => onUpdateJobStatus(job.id, job.status === 'Active' ? 'Closed' : 'Active')}
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
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-2xs font-black uppercase border border-emerald-300">
                                    APC Active
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>Specialty: <strong className="text-slate-800">{app.specialization}</strong></span>
                                  <span>Reg: <strong className="font-mono text-slate-800">{app.applicantLicense || 'MMC/LJM Verified'}</strong></span>
                                  <span>Exp: <strong className="text-slate-800">{app.experienceYears || 5} Years</strong></span>
                                  {app.applicantRate && (
                                    <span>Rate: <strong className="text-emerald-700 font-bold">RM {app.applicantRate}/hr</strong></span>
                                  )}
                                  <span>Applied: {new Date(app.appliedAt).toLocaleDateString('en-MY')}</span>
                                </div>
                              </div>

                              {/* Decision Badges / Action Controls */}
                              <div className="flex items-center gap-2 shrink-0">
                                {app.status === 'pending' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onOpenDecision(job.id, app, 'accepted')}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenDecision(job.id, app, 'declined')}
                                      className="px-3 py-1 bg-white hover:bg-slate-100 text-rose-700 border border-rose-300 text-xs font-black uppercase tracking-wider cursor-pointer"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : app.status === 'accepted' ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-2xs font-black uppercase border border-emerald-300 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Confirmed
                                    </span>
                                    {/* Timesheet & Payment Release Action */}
                                    {app.actualHours ? (
                                      app.timesheetStatus === 'approved' ? (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-2xs font-bold border border-blue-200">
                                          Timesheet Verified ({app.actualHours} hrs)
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => onApproveTimesheet(job.id, app)}
                                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-2xs font-black uppercase border border-blue-700 cursor-pointer flex items-center gap-1"
                                          title="Verify shift completion & trigger payment release"
                                        >
                                          <Clock className="h-3 w-3" />
                                          Approve Timesheet ({app.actualHours} hrs)
                                        </button>
                                      )
                                    ) : null}
                                    {app.paymentStatus === 'escrow_held' ? (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-2xs font-bold border border-emerald-200 flex items-center gap-1">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        Escrow Held
                                      </span>
                                    ) : app.paymentStatus === 'released' ? (
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-bold border border-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                        Payout Dispatched
                                      </span>
                                    ) : app.paymentStatus === 'invoiced' ? (
                                      <span className="px-2 py-0.5 bg-purple-50 text-purple-800 text-2xs font-bold border border-purple-200 flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-purple-600" />
                                        Net-30 Invoiced ({app.invoiceNumber || 'Pending'})
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => onOpenChat(job.id, job.title, app)}
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
  );
}
