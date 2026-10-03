import React from 'react';
import { CheckCircle2, Loader } from 'lucide-react';
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
  isPending,
  nextUpcomingBooking,
  pendingDispatchesCount,
  patientsAttendedCount,
  upcomingBookingsCount,
  completedDispatchesCount,
  avgOverall,
  onViewBookings
}: PractitionerOverviewTabProps) {
  return (
    <div id="panel-home" role="tabpanel" aria-labelledby="tab-home" tabIndex={0} className="space-y-6 animate-fade-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        isVerified ? 'bg-emerald-50/40 border-emerald-100' : isPending ? 'bg-amber-50/40 border-amber-100' : 'bg-rose-50/40 border-rose-100'
      }`}>
        {isVerified ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <Loader className="h-5 w-5 text-amber-600 shrink-0 animate-spin" />}
        <div className="text-xs">
          <strong className="font-extrabold text-slate-900">
            {matchedProfile.licenseNumber} — {isVerified ? 'Active & In Good Standing' : isPending ? 'Credential Audit In Progress' : 'Credential Audit Failed'}
          </strong>
          <p className="text-slate-500 font-semibold font-mono text-[10px] mt-0.5">
            {(matchedProfile as any).medicalCouncil || (matchedProfile as any).nursingCouncil || "National Council"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Next Consultation</h4>
            {nextUpcomingBooking ? (
              <>
                <p className="text-sm font-extrabold text-slate-900 truncate">{nextUpcomingBooking.patientName}</p>
                <p className="text-xs text-slate-500 font-mono font-semibold">{nextUpcomingBooking.date} &bull; {nextUpcomingBooking.timeSlot} &bull; {nextUpcomingBooking.mode}</p>
              </>
            ) : (
              <p className="text-xs text-slate-500 font-semibold">No consultations scheduled.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onViewBookings}
            className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl cursor-pointer"
          >
            View Bookings
          </button>
        </div>

        <button
          type="button"
          onClick={onViewBookings}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs flex items-center gap-3 text-left cursor-pointer hover:border-slate-300"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {pendingDispatchesCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pendingDispatchesCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
          </span>
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">On-Call Dispatch Radar</h4>
            <p className="text-xs font-extrabold text-slate-900">
              {pendingDispatchesCount > 0 ? `${pendingDispatchesCount} pending dispatch${pendingDispatchesCount === 1 ? '' : 'es'}` : 'Live — no pending dispatches'}
            </p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs">
          <span className="font-mono tabular-nums text-xl font-bold text-slate-900">{patientsAttendedCount}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Patients Attended</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs">
          <span className="font-mono tabular-nums text-xl font-bold text-slate-900">{upcomingBookingsCount}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Upcoming Consultations</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs">
          <span className={`font-mono tabular-nums text-xl font-bold ${avgOverall ? 'text-slate-900' : 'text-slate-300'}`}>{avgOverall ?? 'New'}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Practice Rating</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs">
          <span className="font-mono tabular-nums text-xl font-bold text-slate-900">{completedDispatchesCount}</span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Dispatches Completed</p>
        </div>
      </div>
    </div>
  );
}
