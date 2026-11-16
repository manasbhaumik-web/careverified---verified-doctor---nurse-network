import React from 'react';
import { Clock, ShieldCheck, FileText, Zap } from 'lucide-react';
import { useTr } from '../../locale';
import { DoctorProfile, NurseProfile, Booking } from '../../types';

interface PractitionerOverviewTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  isDoc?: boolean;
  isVerified: boolean;
  isPending: boolean;
  nextUpcomingBooking?: Booking;
  pendingDispatchesCount: number;
  patientsAttendedCount: number;
  upcomingBookingsCount: number;
  completedDispatchesCount: number;
  avgOverall: string | null;
  onViewBookings: () => void;
  onViewAnalytics?: () => void;
  onViewOnCall?: () => void;
}

export default function PractitionerOverviewTab({
  matchedProfile,
  isDoc = true,
  isVerified,
  isPending,
  pendingDispatchesCount,
  upcomingBookingsCount,
  completedDispatchesCount,
  avgOverall,
  onViewBookings,
  onViewAnalytics,
  onViewOnCall
}: PractitionerOverviewTabProps) {
  const tx = useTr();
  return (
    <div id="panel-home" role="tabpanel" aria-labelledby="tab-home" tabIndex={0} className="space-y-4 animate-fade-in font-sans">

      {/* 2. COMPACT 4-CELL OPERATIONS RIBBON */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[color:var(--t-200)]">
        <div className="p-3.5 sm:p-4 border-r border-b lg:border-b-0 border-[color:var(--t-100)] min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)]">
              {tx('Board Verification')}
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[color:var(--ink)] block mt-1 truncate">
            {isVerified ? tx('Verified Active') : isPending ? tx('Pending Review') : tx('Unverified')}
          </span>
          <p className="text-xs text-[color:var(--ink-2)] truncate">
            {matchedProfile.licenseNumber} · {tx(matchedProfile.city)}
          </p>
        </div>

        <button
          type="button"
          onClick={onViewBookings}
          className="text-left p-3.5 sm:p-4 lg:border-r border-b lg:border-b-0 border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)]">
              {tx('Upcoming Consults')}
            </span>
            <Clock className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[color:var(--ink)] tabular-nums block mt-1">
            {upcomingBookingsCount}
          </span>
          <p className="text-xs text-[color:var(--ink-2)] truncate">
            {tx('Scheduled patient visits')}
          </p>
        </button>

        <button
          type="button"
          onClick={onViewOnCall || onViewBookings}
          className="text-left p-3.5 sm:p-4 border-r border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0"
        >
          <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">
            {tx('Pending Dispatches')}
          </span>
          <span className={`text-lg font-bold tracking-tight tabular-nums block mt-1 ${pendingDispatchesCount > 0 ? 'text-amber-700' : 'text-[color:var(--ink)]'}`}>
            {pendingDispatchesCount}
          </span>
          <p className="text-xs text-[color:var(--ink-2)] truncate">
            {tx('On-call queue items')}
          </p>
        </button>

        <button
          type="button"
          onClick={onViewAnalytics || onViewBookings}
          className="text-left p-3.5 sm:p-4 hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)]">
              {tx('Completed')}
            </span>
            <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[color:var(--ink)] tabular-nums block mt-1">
            {completedDispatchesCount}
          </span>
          <p className="text-xs text-[color:var(--ink-2)] tabular-nums truncate">
            {avgOverall
              ? tx('Rating: {rating} / 5.0', { rating: avgOverall })
              : tx('No ratings yet')}
          </p>
        </button>
      </section>

      {/* 3. CLINICAL WORKFLOW ACTIONS GRID */}
      <div className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-4 sm:p-5 space-y-3.5">
        <h4 className="text-base font-bold text-[color:var(--ink)] border-b border-[color:var(--t-100)] pb-2.5 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[color:var(--t-600)]" />
          {isDoc ? tx('Doctor Clinical Operations Shortcuts') : tx('Nursing Operations & Care Shortcuts')}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            type="button"
            onClick={onViewBookings}
            className="p-3.5 bg-white hover:bg-slate-50 border border-[color:var(--t-200)] text-slate-900 text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 rounded-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-600)] focus-visible:outline-none"
          >
            <span className="font-bold text-sm">
              {isDoc ? tx('Issue E-Prescription') : tx('Complete Nursing Care Log')}
            </span>
            <span className="text-xs text-[color:var(--ink-2)] leading-snug">
              {isDoc
                ? tx('Draft & sign digital prescriptions for active consultations.')
                : tx('Log sterile wound dressing, vitals telemetry & clinical care notes.')}
            </span>
          </button>

          <button
            type="button"
            onClick={onViewBookings}
            className="p-3.5 bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--ink)] text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 rounded-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-600)] focus-visible:outline-none"
          >
            <span className="font-bold text-sm">
              {isDoc ? tx('Review Patient Records') : tx('Patient Vitals & Care History')}
            </span>
            <span className="text-xs text-[color:var(--ink-2)] leading-snug">
              {isDoc
                ? tx('Access verified lab reports, X-rays, and medical history.')
                : tx('Review patient baseline BP, blood glucose, and recovery trend.')}
            </span>
          </button>

          <button
            type="button"
            onClick={onViewOnCall || onViewBookings}
            className="p-3.5 bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--ink)] text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 rounded-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-600)] focus-visible:outline-none"
          >
            <span className="font-black text-sm">
              {isDoc ? tx('Emergency Dispatch Log') : tx('Home Nursing Transit Radar')}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {pendingDispatchesCount > 0 ? tx('{n} active dispatches awaiting response.', { n: pendingDispatchesCount }) : tx('All emergency dispatches up-to-date.')}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
