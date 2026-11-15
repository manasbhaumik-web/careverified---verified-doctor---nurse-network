import React, { useEffect, useMemo } from 'react';
import {
  Calendar,
  ShieldCheck,
  Plus,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  Check,
  FileText,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useTr } from '../../locale';
import WorkspaceHeader from '../../shared/ui/WorkspaceHeader';
import { BannerBadge, DashboardTab } from '../../shared/ui/DashboardHeader';
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
  const tx = useTr();

  useEffect(() => {
    if (filteredJobs.length === 0) {
      if (expandedJobId !== null) setExpandedJobId(null);
      return;
    }
    if (!expandedJobId || !filteredJobs.some((j) => j.id === expandedJobId)) {
      setExpandedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, expandedJobId, setExpandedJobId]);

  const selectedJob = useMemo(
    () => filteredJobs.find((j) => j.id === expandedJobId) || filteredJobs[0] || null,
    [filteredJobs, expandedJobId],
  );

  const selectedApplications = selectedJob?.applications || [];

  return (
    <div className="space-y-4">
      <WorkspaceHeader
        icon={Calendar}
        eyebrow={tx('Clinical Human Capital · Act 586 Staffing')}
        title={tx('Clinical Job Postings, Locum Shifts & Applications')}
        description={tx('Recruit credentialed doctors, staff nurses, and allied healthcare practitioners with automated regulatory license checks.')}
        badges={
          <BannerBadge tone="success">
            <ShieldCheck className="h-3 w-3 inline mr-1 text-emerald-600" /> {tx('Act 586 Staffing Compliant')}
          </BannerBadge>
        }
        tabs={embedded && displayedTabs.length > 1 ? displayedTabs : undefined}
        activeTab={tab}
        onTabChange={setTab}
        aside={
          embedded ? (
            <button
              type="button"
              onClick={onPostJob}
              className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 rounded-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{tx('Post Job Vacancy')}</span>
            </button>
          ) : undefined
        }
      />

      {/* COMPACT COMMAND BAR */}
      <div className="bg-white border border-[color:var(--t-200)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 rounded-none shadow-2xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={tx('Search job postings by title, specialty, ward or location…')}
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:border-[color:var(--t-600)] text-xs font-medium text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 rounded-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: tx('All Roles') },
              { id: 'doctor', label: tx('Doctors') },
              { id: 'nurse', label: tx('Nurses') },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setJobFilter(r.id)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer rounded-none ${
                jobFilter === r.id
                  ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-600)]'
                  : 'bg-white text-slate-600 border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]'
              }`}
            >
              {r.label}
            </button>
          ))}

          <div className="h-4 w-px bg-[color:var(--t-200)] mx-1" />

          {(
            [
              { id: 'all', label: tx('All Status') },
              { id: 'Active', label: tx('Active') },
              { id: 'Closed', label: tx('Closed') },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer rounded-none ${
                statusFilter === s.id
                  ? s.id === 'Active'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]'
              }`}
            >
              {s.label}
            </button>
          ))}

          <span className="ml-1 text-xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-1.5 rounded-none">
            {filteredJobs.length} {tx('vacancies')}
          </span>
        </div>
      </div>

      {/* MASTER-DETAIL SPLIT PANE (Left: Vacancies Queue · Right: Vacancy & Applicants Inspector) */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] p-10 text-center text-xs text-slate-500 space-y-3 rounded-none shadow-2xs">
          <Calendar className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">{tx('No job openings found matching your filter criteria.')}</p>
          <p>{tx('Create a new clinical vacancy to invite verified doctors and nurses across Malaysia.')}</p>
          <button
            type="button"
            onClick={onPostJob}
            className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black uppercase tracking-wider cursor-pointer rounded-none"
          >
            + {tx('Post Job Vacancy')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANE: VACANCIES QUEUE (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[color:var(--t-200)] rounded-none shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-[color:var(--t-bg)] border-b border-[color:var(--t-200)] flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[color:var(--t-600)]" />
                {tx('Open Vacancies & Shifts')}
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-[color:var(--t-200)] px-2 py-0.5">
                {filteredJobs.length}
              </span>
            </div>

            <div className="divide-y divide-[color:var(--t-100)] max-h-[620px] overflow-y-auto">
              {filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const appCount = (job.applications || []).length;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setExpandedJobId(job.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                      isSelected
                        ? 'bg-[color:var(--t-50)]/70 border-l-2 border-l-[color:var(--t-600)]'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-mono font-black uppercase px-2 py-0.5 border ${
                            job.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {job.status}
                        </span>
                        <span className="text-xs font-mono font-bold uppercase px-1.5 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                          {job.roleRequired === 'doctor'
                            ? tx('Doctor')
                            : job.roleRequired === 'nurse'
                            ? tx('Nurse')
                            : tx('Specialist')}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600 flex items-center gap-1">
                        <Users className="w-3 h-3 text-[color:var(--t-600)]" />
                        {appCount}
                      </span>
                    </div>

                    <div className="font-display font-black text-sm text-[color:var(--ink)] truncate">
                      {job.title}
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {job.specialtyRequired} · {job.city}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-xs font-medium text-slate-500">
                      <span>{job.type}</span>
                      <span className="font-mono font-black text-[color:var(--ink)] tabular-nums">
                        {job.salaryRange}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: LIVE VACANCY & APPLICANTS INSPECTOR (7 cols) */}
          <div className="lg:col-span-7 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] rounded-none shadow-xs p-5 sm:p-6">
            {selectedJob && (
              <div className="space-y-5">
                {/* Vacancy Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[color:var(--t-100)]">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs uppercase font-mono font-black tracking-wider px-2 py-0.5 border ${
                          selectedJob.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {selectedJob.status}
                      </span>
                      <span className="text-xs uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedJob.type}
                      </span>
                      <span className="text-xs uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                        {selectedJob.roleRequired === 'doctor'
                          ? tx('Doctor')
                          : selectedJob.roleRequired === 'nurse'
                          ? tx('Nurse')
                          : tx('Specialist')}
                      </span>
                      <span className="text-xs font-bold text-[color:var(--t-700)]">
                        {selectedJob.specialtyRequired}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-black text-[color:var(--ink)] tracking-tight">
                      {selectedJob.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                        {selectedJob.location} ({selectedJob.city})
                      </span>
                      <span>·</span>
                      <span className="font-extrabold text-[color:var(--ink)] font-mono tabular-nums">
                        {selectedJob.salaryRange}
                      </span>
                      <span>·</span>
                      <span>Posted {new Date(selectedJob.postedAt).toLocaleDateString('en-MY')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateJobStatus(selectedJob.id, selectedJob.status === 'Active' ? 'Closed' : 'Active')
                    }
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] cursor-pointer rounded-none shrink-0"
                  >
                    {selectedJob.status === 'Active' ? tx('Close Listing') : tx('Reopen Listing')}
                  </button>
                </div>

                {selectedJob.description && (
                  <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3.5">
                    <span className="text-xs font-mono font-bold uppercase text-slate-500 block mb-1">
                      {tx('Shift & Role Scope')}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedJob.description}</p>
                  </div>
                )}

                {/* Applications Section */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[color:var(--t-100)]">
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-800">
                      {tx('Applications for this Vacancy')} ({selectedApplications.length})
                    </h4>
                    <span className="text-xs font-mono text-slate-500">
                      {selectedJob.pendingCount} {tx('Pending Review')} · {selectedJob.acceptedCount}{' '}
                      {tx('Confirmed')}
                    </span>
                  </div>

                  {selectedApplications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-[color:var(--t-bg)] border border-dashed border-[color:var(--t-200)]">
                      {tx('No practitioners have applied for this vacancy yet. You can invite qualified doctors and nurses directly from the Practitioner Network tab.')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedApplications.map((app) => (
                        <div
                          key={app.id}
                          className="bg-[color:var(--t-bg)]/50 border border-[color:var(--t-200)] p-4 space-y-3 rounded-none"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-[color:var(--ink)]">{app.applicantName}</span>
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono font-extrabold uppercase border border-slate-200">
                                  {app.applicantRole}
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-mono font-black uppercase border border-emerald-200">
                                  {tx('APC Active')}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                                <span>
                                  {tx('Specialty:')} <strong className="text-slate-800">{app.specialization}</strong>
                                </span>
                                <span>
                                  {tx('Reg:')}{' '}
                                  <strong className="font-mono text-slate-800">
                                    {app.applicantLicense || tx('MMC/LJM Verified')}
                                  </strong>
                                </span>
                                <span>
                                  {tx('Exp:')} <strong className="text-slate-800">{app.experienceYears || 5} Years</strong>
                                </span>
                                {app.applicantRate && (
                                  <span>
                                    {tx('Rate:')}{' '}
                                    <strong className="text-emerald-700 font-mono font-bold">
                                      RM {app.applicantRate}/hr
                                    </strong>
                                  </span>
                                )}
                                <span>Applied: {new Date(app.appliedAt).toLocaleDateString('en-MY')}</span>
                              </div>
                            </div>

                            {/* Decision / Action Controls */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              {app.status === 'pending' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDecision(selectedJob.id, app, 'accepted')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer rounded-none"
                                  >
                                    {tx('Accept')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDecision(selectedJob.id, app, 'declined')}
                                    className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-black uppercase tracking-wider cursor-pointer rounded-none"
                                  >
                                    {tx('Decline')}
                                  </button>
                                </>
                              ) : app.status === 'accepted' ? (
                                <>
                                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-mono font-black uppercase border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {tx('Confirmed')}
                                  </span>
                                  {app.actualHours ? (
                                    app.timesheetStatus === 'approved' ? (
                                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-xs font-mono font-bold border border-blue-200">
                                        Timesheet Verified ({app.actualHours} hrs)
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => onApproveTimesheet(selectedJob.id, app)}
                                        className="px-2.5 py-1 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-mono font-black uppercase cursor-pointer flex items-center gap-1 rounded-none"
                                        title={tx('Verify shift completion & trigger payment release')}
                                      >
                                        <Clock className="h-3 w-3" />
                                        Approve Timesheet ({app.actualHours} hrs)
                                      </button>
                                    )
                                  ) : null}
                                  {app.paymentStatus === 'escrow_held' ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200 flex items-center gap-1">
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      {tx('Escrow Held')}
                                    </span>
                                  ) : app.paymentStatus === 'released' ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-mono font-bold border border-emerald-300 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      {tx('Payout Dispatched')}
                                    </span>
                                  ) : app.paymentStatus === 'invoiced' ? (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-800 text-xs font-mono font-bold border border-purple-200 flex items-center gap-1">
                                      <FileText className="h-3 w-3 text-purple-600" />
                                      Net-30 Invoiced ({app.invoiceNumber || tx('Pending')})
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => onOpenChat(selectedJob.id, selectedJob.title, app)}
                                    className="px-3 py-1 text-xs font-bold text-[color:var(--ink)] bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center gap-1 cursor-pointer rounded-none"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                                    {tx('Direct Message')}
                                  </button>
                                </>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-mono font-bold border border-slate-200">
                                  {tx('Declined')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Financial & Settlement Breakdown */}
                          {app.status === 'accepted' && (
                            <div className="bg-white border border-[color:var(--t-200)] p-2.5 flex flex-wrap items-center justify-between text-xs gap-3">
                              <div className="flex flex-wrap items-center gap-4 text-slate-700">
                                <div>
                                  <span className="text-slate-500 font-medium">{tx('Billing Mode:')} </span>
                                  <strong className="text-slate-900 uppercase font-black">
                                    {app.billingMode === 'invoice'
                                      ? tx('Corporate Net-30 Invoice')
                                      : tx('Upfront Escrow Deposit')}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">{tx('Practitioner Wage:')} </span>
                                  <strong className="text-emerald-700 font-mono font-bold tabular-nums">
                                    RM{' '}
                                    {app.shiftWageMyr
                                      ? app.shiftWageMyr.toFixed(2)
                                      : ((app.applicantRate || 80) * (app.scheduledHours || 8)).toFixed(2)}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">{tx('Platform Fee:')} </span>
                                  <strong className="text-slate-800 font-mono font-bold tabular-nums">
                                    RM {app.platformFeeMyr ? app.platformFeeMyr.toFixed(2) : '40.00'}
                                  </strong>
                                </div>
                                {app.paymentRef && (
                                  <div>
                                    <span className="text-slate-500 font-medium">{tx('Payment Ref:')} </span>
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
                            <div className="text-xs text-slate-600 bg-white p-2 border border-[color:var(--t-200)] font-mono">
                              Decision Note: {app.decisionNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
