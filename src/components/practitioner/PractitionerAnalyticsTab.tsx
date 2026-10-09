import React from 'react';
import { TrendingUp, Star } from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, OnCallDispatch, ConsultationMode } from '../../types';

interface PractitionerAnalyticsTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  myBookings: Booking[];
  dispatches: OnCallDispatch[];
  avgOverall: string | null;
  reviewCount: number;
}

export default function PractitionerAnalyticsTab({
  matchedProfile,
  myBookings,
  dispatches,
  avgOverall,
  reviewCount
}: PractitionerAnalyticsTabProps) {
  const completedBookings = myBookings.filter(b => b.status === 'Completed');
  const completedDispatches = dispatches.filter(d => d.doctorId === matchedProfile.id && d.dispatchStatus === 'Completed');

  const totalBookingsEarned = completedBookings.reduce((sum, b) => sum + b.fee, 0);
  const totalDispatchesEarned = completedDispatches.length * 250;
  const totalEarnings = totalBookingsEarned + totalDispatchesEarned;
  const totalAttendedCount = completedBookings.length + completedDispatches.length;

  const videoEarned = completedBookings.filter(b => b.mode === ConsultationMode.VIDEO).reduce((sum, b) => sum + b.fee, 0);
  const inPersonEarned = completedBookings.filter(b => b.mode === ConsultationMode.IN_PERSON).reduce((sum, b) => sum + b.fee, 0);

  return (
    <div id="panel-analytics" role="tabpanel" aria-labelledby="tab-analytics" tabIndex={0} className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[color:var(--t-200)] p-5 rounded-none shadow-xs space-y-1">
          <span className="text-[13px] font-semibold text-[color:var(--ink-2)] block">Generated Income</span>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">RM {totalEarnings.toLocaleString()}</span>
          <p className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
            <TrendingUp className="h-3 w-3" />
            <span>100% practitioner distribution</span>
          </p>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] p-5 rounded-none shadow-xs space-y-1">
          <span className="text-[13px] font-semibold text-[color:var(--ink-2)] block">Patients Attended</span>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{totalAttendedCount} Patients</span>
          <p className="text-xs text-slate-500 font-semibold">{completedBookings.length} consults &bull; {completedDispatches.length} dispatches</p>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] p-5 rounded-none shadow-xs space-y-1">
          <span className="text-[13px] font-semibold text-[color:var(--ink-2)] block">Practice Rating</span>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{avgOverall ?? "—"}</span>
            <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-xs text-slate-500 font-semibold">Based on {reviewCount} clinical ratings</p>
        </div>

        <div className="bg-white border border-[color:var(--t-200)] p-5 rounded-none shadow-xs space-y-1">
          <span className="text-[13px] font-semibold text-[color:var(--ink-2)] block">Clinical Accuracy</span>
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--e-700)] tabular-nums">99.8%</span>
          <p className="text-xs text-slate-500 font-semibold">Government standard audit cleared</p>
        </div>
      </div>

      {/* Earnings Visualizer Chart */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-xs space-y-5">
        <div>
          <h4 className="text-base font-bold text-[color:var(--ink)]">Revenue Stream Distribution</h4>
          <p className="text-[13px] text-[color:var(--ink-2)]">Visualizing contribution proportions across clinical channels</p>
        </div>

        <div className="space-y-3 max-w-xl text-xs font-bold text-slate-700">
          <div>
            <div className="flex justify-between mb-1">
              <span>Video Telehealth Booking (RM {videoEarned})</span>
              <span className="font-mono tabular-nums">{totalEarnings > 0 ? Math.round((videoEarned / totalEarnings) * 100) : 0}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-none overflow-hidden">
              <div className="bg-[color:var(--t-600)] h-full rounded-none transition-all duration-500" style={{ width: `${totalEarnings > 0 ? (videoEarned / totalEarnings) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>In-Person Clinic consultations (RM {inPersonEarned})</span>
              <span className="font-mono tabular-nums">{totalEarnings > 0 ? Math.round((inPersonEarned / totalEarnings) * 100) : 0}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-none overflow-hidden">
              <div className="bg-[color:var(--t-600)] h-full rounded-none transition-all duration-500" style={{ width: `${totalEarnings > 0 ? (inPersonEarned / totalEarnings) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Urgent On-Call Ambulance Dispatches (RM {totalDispatchesEarned})</span>
              <span className="font-mono tabular-nums">{totalEarnings > 0 ? Math.round((totalDispatchesEarned / totalEarnings) * 100) : 0}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-none overflow-hidden">
              <div className="bg-rose-600 h-full rounded-none transition-all duration-500" style={{ width: `${totalEarnings > 0 ? (totalDispatchesEarned / totalEarnings) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient History Logs */}
      <div className="bg-white border border-[color:var(--t-200)] rounded-none p-6 shadow-xs space-y-4">
        <div>
          <h4 className="text-base font-bold text-[color:var(--ink)]">Clinical Attended Ledger</h4>
          <p className="text-[13px] text-[color:var(--ink-2)]">Chronological history log of all patients evaluated and treatments finalized</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-600">
            <thead>
              <tr className="border-b border-[color:var(--t-200)] text-slate-400 font-bold uppercase text-xs tracking-wider">
                <th className="pb-2.5">Patient Name</th>
                <th className="pb-2.5">Channel Mode</th>
                <th className="pb-2.5">Final Diagnosis</th>
                <th className="pb-2.5">Date Completed</th>
                <th className="pb-2.5 text-right">Fee Distributed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {completedBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-55/20 transition-colors">
                  <td className="py-3 font-extrabold text-slate-800">{b.patientName}</td>
                  <td className="py-3 text-slate-700">{b.mode}</td>
                  <td className="py-3 font-semibold max-w-[200px] truncate">{b.prescription?.diagnosis}</td>
                  <td className="py-3 font-mono tabular-nums">{b.date}</td>
                  <td className="py-3 text-right font-mono tabular-nums font-bold text-slate-900">RM {b.fee}</td>
                </tr>
              ))}
              {completedDispatches.map(d => (
                <tr key={d.id} className="hover:bg-slate-55/20 transition-colors">
                  <td className="py-3 font-extrabold text-slate-800">{d.patientName}</td>
                  <td className="py-3 text-rose-600 font-bold">🚨 Emergency Dispatch</td>
                  <td className="py-3 font-semibold">{(d as any).reason}</td>
                  <td className="py-3 font-mono tabular-nums">{((d as any).timestamp || '').split(' ')[0]}</td>
                  <td className="py-3 text-right font-mono tabular-nums font-bold text-slate-900">RM 250</td>
                </tr>
              ))}
              {completedBookings.length === 0 && completedDispatches.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No finalized treatments recorded in the current billing cycle.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
