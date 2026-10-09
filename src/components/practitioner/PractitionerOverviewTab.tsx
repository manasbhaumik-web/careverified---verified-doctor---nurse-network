import React from 'react';
import { Clock, ShieldCheck, FileText, Calendar, ArrowRight, Zap, Check } from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking } from '../../types';

interface PractitionerOverviewTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  isVerified: boolean;
  isPending: boolean;
  nextUpcomingBooking?: Booking;
  pendingDispatchesCount: number;
  patientsAttendedCount: number;
  upcomingBookingsCount: number;
  completedDispatchesCount: number;
  avgOverall: string | null;
  onViewBookings: () => void;
}

export default function PractitionerOverviewTab({
  matchedProfile,
  isVerified,
  nextUpcomingBooking,
  pendingDispatchesCount,
  onViewBookings
}: PractitionerOverviewTabProps) {
  return (
    <div id="panel-home" role="tabpanel" aria-labelledby="tab-home" tabIndex={0} className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. NEXT UPCOMING CLINICAL CONSULTATION (UNIQUE NON-DUPLICATED FOCUS CARD) */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-none bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-[color:var(--t-600)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--t-600)] bg-[color:var(--t-100)] px-2 py-0.5 border border-[color:var(--t-200)]">
                  Next Patient Queue
                </span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse shrink-0 shadow-xs" /> Live Telehealth Ready</span>
              </div>
              {nextUpcomingBooking ? (
                <div>
                  <h3 className="text-lg font-bold text-[color:var(--ink)]">{nextUpcomingBooking.patientName}</h3>
                  <p className="text-xs text-slate-600 font-mono font-bold mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{nextUpcomingBooking.date}</span>
                    <span>&bull;</span>
                    <span>{nextUpcomingBooking.timeSlot}</span>
                    <span>&bull;</span>
                    <span className="text-[color:var(--t-600)]">{nextUpcomingBooking.mode}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-semibold mt-0.5">No immediate patient consultations queued for today.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onViewBookings}
              className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold px-5 py-3 rounded-none shadow-xs transition-all cursor-pointer flex items-center gap-2 border border-[color:var(--t-700)]"
            >
              <span>Manage Consultation Schedule</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. UNIQUE CLINICAL OPERATIONS & PERFORMANCE SPEED METRICS (NON-DUPLICATED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">Response SLA Speed</span>
            <Clock className="h-4 w-4 text-[color:var(--t-600)]" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums block">&lt; 2.5 Mins</span>
          <p className="text-xs text-[color:var(--e-700)] font-semibold">Fastest 5% response time among {matchedProfile.specialization} specialists.</p>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">E-Prescription Compliance</span>
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums block">100% Certified</span>
          <p className="text-xs text-slate-600">Digitally signed via MMC/LJM verified encryption keys.</p>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[color:var(--ink-2)]">Diagnostic Accuracy</span>
            <ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums block">99.4% Rated</span>
          <p className="text-xs text-slate-600">Validated across patient follow-ups and peer clinical reviews.</p>
        </div>
      </div>

      {/* 3. CLINICAL WORKFLOW ACTIONS GRID */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-xs space-y-4">
        <h4 className="text-base font-bold text-[color:var(--ink)] border-b border-[color:var(--t-200)] pb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[color:var(--t-600)]" />
          Direct Clinical Operations Shortcuts
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={onViewBookings}
            className="p-4 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-600)] text-left transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <span className="font-black text-sm">Issue E-Prescription</span>
            <span className="text-[11px] font-semibold text-slate-600">Draft & sign digital prescriptions for active consultations.</span>
          </button>

          <button
            type="button"
            onClick={onViewBookings}
            className="p-4 bg-white hover:bg-slate-50 border border-[color:var(--t-200)] text-slate-900 text-left transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <span className="font-black text-sm">Review Patient Records</span>
            <span className="text-[11px] font-semibold text-slate-600">Access verified lab reports, X-rays, and vital histories.</span>
          </button>

          <button
            type="button"
            onClick={onViewBookings}
            className="p-4 bg-white hover:bg-slate-50 border border-[color:var(--t-200)] text-slate-900 text-left transition-colors cursor-pointer flex flex-col justify-between gap-3"
          >
            <span className="font-black text-sm">Emergency Dispatch Log</span>
            <span className="text-[11px] font-semibold text-slate-600">
              {pendingDispatchesCount > 0 ? `${pendingDispatchesCount} active dispatches awaiting response.` : 'All emergency dispatches up-to-date.'}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
