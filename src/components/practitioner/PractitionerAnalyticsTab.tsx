import React, { useMemo, useState } from 'react';
import { TrendingUp, Star, AlertTriangle, Info } from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, OnCallDispatch, ConsultationMode } from '../../types';
import { formatMoney, useTr } from '../../locale';
import WorkspaceHeader from '../../shared/ui/WorkspaceHeader';
import { BannerBadge } from '../../shared/ui/DashboardHeader';

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
  const tx = useTr();
  const [period, setPeriod] = useState<'30d' | '90d' | 'all'>('all');

  const inPeriod = (dateStr?: string) => {
    if (period === 'all' || !dateStr) return true;
    const t = Date.parse(dateStr);
    if (Number.isNaN(t)) return true;
    const days = period === '30d' ? 30 : 90;
    return Date.now() - t <= days * 86_400_000;
  };

  const scopedBookings = useMemo(() => myBookings.filter(b => inPeriod(b.date)), [myBookings, period]);
  const completedBookings = scopedBookings.filter(b => b.status === 'Completed');
  const completedDispatches = dispatches.filter(d => d.doctorId === matchedProfile.id && d.dispatchStatus === 'Completed' && inPeriod(((d as any).timestamp || '').split(' ')[0]));

  const totalBookingsEarned = completedBookings.reduce((sum, b) => sum + b.fee, 0);
  const totalDispatchesEarned = completedDispatches.reduce((sum, d) => sum + ((d as any).fee ?? 0), 0);
  const totalEarnings = totalBookingsEarned + totalDispatchesEarned;
  const totalAttendedCount = completedBookings.length + completedDispatches.length;
  const completionRatePct = scopedBookings.length > 0 ? Math.round((completedBookings.length / scopedBookings.length) * 100) : null;

  const videoEarned = completedBookings.filter(b => b.mode === ConsultationMode.VIDEO).reduce((sum, b) => sum + b.fee, 0);
  const inPersonEarned = completedBookings.filter(b => b.mode === ConsultationMode.IN_PERSON).reduce((sum, b) => sum + b.fee, 0);

  return (
    <div id="panel-analytics" role="tabpanel" aria-labelledby="tab-analytics" tabIndex={0} className="space-y-4 animate-fade-in">
      <WorkspaceHeader
        icon={TrendingUp}
        eyebrow={tx('Practice Intelligence · Analytics')}
        title={tx('Consultation Analytics & Performance')}
        description={tx('Completed consultations, revenue distribution, and patient satisfaction ratings.')}
        aside={
          <div className="inline-flex border border-[color:var(--t-200)] bg-white" role="group" aria-label={tx('Analytics time period')}>
            {([['30d', tx('30 Days')], ['90d', tx('90 Days')], ['all', tx('All Time')]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  period === id
                    ? 'bg-[color:var(--t-600)] text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {totalAttendedCount === 0 && (
        <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-3.5 text-xs text-[color:var(--t-700)] flex items-start gap-2.5">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{tx('No completed consultations or dispatches in this period yet. Metrics will populate automatically as you finalize patient encounters in Appointments or On-Call Dispatch.')}</span>
        </div>
      )}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[color:var(--t-200)]">
        <div className="p-3.5 sm:p-4 border-r border-b lg:border-b-0 border-[color:var(--t-100)] space-y-0.5 min-w-0">
          <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Generated Income')}</span>
          <span className="text-lg font-bold tracking-tight text-[color:var(--ink)] tabular-nums block">{formatMoney(totalEarnings)}</span>
          <p className="text-xs text-[color:var(--ink-2)] truncate">
            {tx('{n} finalized items', { n: totalAttendedCount })}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 lg:border-r border-b lg:border-b-0 border-[color:var(--t-100)] space-y-0.5 min-w-0">
          <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Patients Attended')}</span>
          <span className="text-lg font-bold tracking-tight text-[color:var(--ink)] tabular-nums block">{tx('{n} Patients', { n: totalAttendedCount })}</span>
          <p className="text-xs text-[color:var(--ink-2)] truncate">{tx('{a} consults • {b} dispatches', { a: completedBookings.length, b: completedDispatches.length })}</p>
        </div>

        <div className="p-3.5 sm:p-4 border-r border-[color:var(--t-100)] space-y-0.5 min-w-0">
          <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Practice Rating')}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-[color:var(--ink)] tabular-nums">{avgOverall ?? "—"}</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-xs text-[color:var(--ink-2)] truncate">{tx('Based on {n} clinical ratings', { n: reviewCount })}</p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-0.5 min-w-0">
          <span className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)] block">{tx('Completion Rate')}</span>
          <span className="text-lg font-bold tracking-tight text-[color:var(--e-700)] tabular-nums block">{completionRatePct != null ? `${completionRatePct}%` : '—'}</span>
          <p className="text-xs text-[color:var(--ink-2)] truncate">{tx('{a} of {b} bookings completed', { a: completedBookings.length, b: scopedBookings.length })}</p>
        </div>
      </section>

      {/* Earnings Visualizer Chart */}
      <div className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] rounded-none p-4 sm:p-5 space-y-4">
        <div>
          <h4 className="text-base font-bold text-[color:var(--ink)]">{tx('Revenue Stream Distribution')}</h4>
          <p className="text-xs text-[color:var(--ink-2)]">{tx('Contribution proportions across clinical channels')}</p>
        </div>

        <div className="space-y-3 max-w-xl text-xs font-bold text-slate-700">
          <div>
            <div className="flex justify-between mb-1">
              <span>{tx('Video Telehealth Booking ({amount})', { amount: formatMoney(videoEarned) })}</span>
              <span className="tabular-nums">{totalEarnings > 0 ? Math.round((videoEarned / totalEarnings) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-none overflow-hidden">
              <div className="bg-[color:var(--t-600)] h-full rounded-none transition-colors duration-500" style={{ width: `${totalEarnings > 0 ? (videoEarned / totalEarnings) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>{tx('In-Person Clinic consultations ({amount})', { amount: formatMoney(inPersonEarned) })}</span>
              <span className="tabular-nums">{totalEarnings > 0 ? Math.round((inPersonEarned / totalEarnings) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-none overflow-hidden">
              <div className="bg-[color:var(--t-600)] h-full rounded-none transition-colors duration-500" style={{ width: `${totalEarnings > 0 ? (inPersonEarned / totalEarnings) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>{tx('Urgent On-Call Ambulance Dispatches ({amount})', { amount: formatMoney(totalDispatchesEarned) })}</span>
              <span className="tabular-nums">{totalEarnings > 0 ? Math.round((totalDispatchesEarned / totalEarnings) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-none overflow-hidden">
              <div className="bg-rose-600 h-full rounded-none transition-colors duration-500" style={{ width: `${totalEarnings > 0 ? (totalDispatchesEarned / totalEarnings) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient History Logs */}
      <div className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] rounded-none p-4 sm:p-5 space-y-3.5">
        <div>
          <h4 className="text-base font-bold text-[color:var(--ink)]">{tx('Clinical Attended Ledger')}</h4>
          <p className="text-xs text-[color:var(--ink-2)]">{tx('Chronological history log of all patients evaluated and treatments finalized')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-600">
            <thead>
              <tr className="border-b border-[color:var(--t-200)] text-slate-400 font-bold uppercase text-xs tracking-wider">
                <th className="pb-2.5">{tx('Patient Name')}</th>
                <th className="pb-2.5">{tx('Channel Mode')}</th>
                <th className="pb-2.5">{tx('Final Diagnosis')}</th>
                <th className="pb-2.5">{tx('Date Completed')}</th>
                <th className="pb-2.5 text-right">{tx('Fee Distributed')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {completedBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-55/20 transition-colors">
                  <td className="py-3 font-extrabold text-slate-800">{b.patientName}</td>
                  <td className="py-3 text-slate-700">{b.mode}</td>
                  <td className="py-3 font-semibold max-w-[200px] truncate">{b.prescription?.diagnosis}</td>
                  <td className="py-3 font-mono tabular-nums">{b.date}</td>
                  <td className="py-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatMoney(b.fee)}</td>
                </tr>
              ))}
              {completedDispatches.map(d => (
                <tr key={d.id} className="hover:bg-slate-55/20 transition-colors">
                  <td className="py-3 font-extrabold text-slate-800">{d.patientName}</td>
                  <td className="py-3 text-rose-600 font-bold"><span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {tx('Emergency Dispatch')}</span></td>
                  <td className="py-3 font-semibold">{(d as any).reason}</td>
                  <td className="py-3 font-mono tabular-nums">{((d as any).timestamp || '').split(' ')[0]}</td>
                  <td className="py-3 text-right font-mono tabular-nums font-bold text-slate-900">{(d as any).fee != null ? formatMoney((d as any).fee) : '—'}</td>
                </tr>
              ))}
              {completedBookings.length === 0 && completedDispatches.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">{tx('No finalized treatments recorded in the current billing cycle.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
