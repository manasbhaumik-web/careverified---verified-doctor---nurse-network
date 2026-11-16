import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  HeartPulse,
  MapPin,
  MessageSquare,
  Pill,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
  X,
} from 'lucide-react';
import { Booking, DoctorProfile, NurseProfile, UserRole } from '../../types';
import { formatMoney, useTr } from '../../locale';
import { UserAvatar } from '../../avatars';
import WorkspaceHeader from '../../shared/ui/WorkspaceHeader';
import { BannerBadge } from '../../shared/ui/DashboardHeader';

export interface PatientAppointmentsTabProps {
  bookings: Booking[];
  upcoming: Booking[];
  past: Booking[];
  professionals: (DoctorProfile | NurseProfile)[];
  appointmentsSubTab: 'all' | 'upcoming' | 'past';
  setAppointmentsSubTab: (tab: 'all' | 'upcoming' | 'past') => void;
  activeConsult: any | null;
  cancelActiveConsult: (id: string) => void;
  onCallStatus: { onlineDoctors: number; consultFee: number; paymentsEnabled?: boolean } | null;
  summary: {
    activeRx: number;
    bp: any | null;
    pulse: any | null;
    glucose: any | null;
    spo2: any | null;
    temp: any | null;
  } | null;
  recordsData: any | null;
  patientAllergies: string[];
  onSelectProfessional: (id: string) => void;
  onNavigateToMessages: () => void;
  onConsultNow: () => void;
  onFindDoctors?: () => void;
  onOpenTriage?: () => void;
  onOpenPharmacies?: () => void;
  onOpenVitals: () => void;
  onOpenRecordsOverview: () => void;
  onOpenLiveRoom: () => void;
  onOpenTriageTab: () => void;
  onOpenRxRecords: () => void;
  onPayBooking: (booking: Booking) => void;
  onCancelBooking: (booking: Booking) => void;
}

export default function PatientAppointmentsTab({
  bookings,
  upcoming,
  past,
  professionals,
  appointmentsSubTab,
  setAppointmentsSubTab,
  activeConsult,
  cancelActiveConsult,
  onCallStatus,
  summary,
  recordsData,
  patientAllergies,
  onSelectProfessional,
  onNavigateToMessages,
  onConsultNow,
  onFindDoctors,
  onOpenTriage,
  onOpenPharmacies,
  onOpenVitals,
  onOpenRecordsOverview,
  onOpenLiveRoom,
  onOpenTriageTab,
  onOpenRxRecords,
  onPayBooking,
  onCancelBooking,
}: PatientAppointmentsTabProps) {
  const tx = useTr();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const baseList = useMemo(() => {
    if (appointmentsSubTab === 'upcoming') return upcoming;
    if (appointmentsSubTab === 'past') return past;
    return [...upcoming, ...past];
  }, [appointmentsSubTab, upcoming, past]);

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((b) => {
      const prof = professionals.find((p) => p.id === b.professionalId);
      return (
        (b.professionalName || '').toLowerCase().includes(q) ||
        (prof?.specialization || '').toLowerCase().includes(q) ||
        (b.symptoms || '').toLowerCase().includes(q) ||
        (b.id || '').toLowerCase().includes(q)
      );
    });
  }, [baseList, query, professionals]);

  useEffect(() => {
    if (filteredBookings.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredBookings.some((b) => b.id === selectedId)) {
      setSelectedId(filteredBookings[0].id);
    }
  }, [filteredBookings, selectedId]);

  const selectedBooking = useMemo(
    () => filteredBookings.find((b) => b.id === selectedId) || null,
    [filteredBookings, selectedId],
  );

  const selectedProf = useMemo(
    () => (selectedBooking ? professionals.find((p) => p.id === selectedBooking.professionalId) : undefined),
    [selectedBooking, professionals],
  );

  const isPending = selectedBooking?.paymentStatus === 'Pending';
  const isCancelled = selectedBooking?.status === 'Cancelled';
  const isCompleted = selectedBooking?.status === 'Completed' || isCancelled;
  const isNurse = selectedProf?.role === UserRole.NURSE || (selectedProf as any)?.category === 'Nurse';
  const modeLower = (selectedBooking?.mode || '').toLowerCase();
  const isVideo = modeLower.includes('video') || modeLower.includes('tele') || modeLower.includes('online');
  const isHomeVisit = modeLower.includes('home');

  return (
    <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0} className="space-y-4">
      {/* 1. COMPACT WORKSPACE HEADER */}
      <WorkspaceHeader
        variant="overview"
        icon={Calendar}
        eyebrow={tx('My Care · Visits')}
        title={tx('Your Appointments')}
        description={tx('Join video visits, check upcoming bookings, and review past doctor summaries.')}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {onFindDoctors && (
              <button
                type="button"
                onClick={onFindDoctors}
                className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 rounded-none"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{tx('Book a Doctor')}</span>
              </button>
            )}
          </div>
        }
        tabs={[
          { id: 'all', label: tx('All Visits'), count: bookings.length },
          { id: 'upcoming', label: tx('Upcoming'), count: upcoming.length },
          { id: 'past', label: tx('Past Visits'), count: past.length },
        ]}
        activeTab={appointmentsSubTab}
        onTabChange={setAppointmentsSubTab}
      />

      {/* 2. ACTIVE LIVE CONSULTATION BANNER (If patient has an active/queued instant consult) */}
      {activeConsult && (
        <section
          aria-label={tx('Active live consultation status')}
          className="bg-emerald-50/90 border border-emerald-300 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-none"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xs font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-600 text-white">
                  {activeConsult.status === 'active'
                    ? tx('Live Room Open')
                    : activeConsult.status === 'queued'
                    ? tx('In Triage Queue')
                    : tx('Awaiting Payment')}
                </span>
                <h3 className="font-display font-black text-sm text-emerald-950">
                  {activeConsult.status === 'active'
                    ? tx('Your On-Call Doctor has joined the Video Room')
                    : tx('Instant Telehealth Consultation in Progress')}
                </h3>
              </div>
              <p className="text-xs text-emerald-900 font-medium mt-0.5 truncate">
                {activeConsult.symptoms
                  ? tx('Chief complaint: “{text}”', { text: activeConsult.symptoms })
                  : tx('Encrypted WebRTC audio/video consultation room ready.')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLiveRoom}
              className="min-h-[34px] px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 rounded-none"
            >
              <Video className="h-3.5 w-3.5" />
              <span>{tx('Enter Consultation Room')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => cancelActiveConsult(activeConsult.id)}
              className="min-h-[34px] px-3 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer rounded-none"
            >
              {tx('Cancel Request')}
            </button>
          </div>
        </section>
      )}

      {/* 3. COMPACT 4-CELL OVERVIEW RIBBON (Next Visit · Latest Vitals · Online Care · Quick Tools) */}
      <section
        aria-label={tx('Visit summary and quick actions')}
        className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[color:var(--t-200)] rounded-none"
      >
        <button
          type="button"
          onClick={() => upcoming[0] && setSelectedId(upcoming[0].id)}
          className="text-left p-3.5 border-r border-b lg:border-b-0 border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0"
        >
          <span className="text-xs font-semibold text-[color:var(--t-700)] block">{tx('Next Visit')}</span>
          <span className="text-sm font-bold text-[color:var(--ink)] tabular-nums truncate block mt-0.5">
            {upcoming[0] ? `${upcoming[0].date} · ${upcoming[0].timeSlot}` : tx('None scheduled')}
          </span>
          <span className="text-xs text-[color:var(--ink-2)] truncate block">
            {upcoming[0] ? upcoming[0].professionalName : tx('Book a doctor anytime')}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenVitals}
          className="text-left p-3.5 lg:border-r border-b lg:border-b-0 border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0"
        >
          <span className="text-xs font-semibold text-[color:var(--t-700)] block">{tx('Latest Vitals')}</span>
          <span className="text-sm font-bold text-[color:var(--ink)] tabular-nums truncate block mt-0.5">
            {summary?.bp ? `BP ${summary.bp.value1}/${summary.bp.value2}` : tx('BP not logged')}
            {summary?.pulse?.value1 != null ? ` · ${summary.pulse.value1} bpm` : ''}
          </span>
          <span className={`text-xs truncate block ${patientAllergies.length > 0 ? 'text-rose-700 font-semibold' : 'text-[color:var(--ink-2)]'}`}>
            {patientAllergies.length > 0
              ? tx('Allergies: {list}', { list: patientAllergies.map((a) => tx(a)).join(', ') })
              : recordsData?.allergyStatement?.kind === 'none_known'
              ? tx('No known allergies')
              : tx('Tap to update vitals')}
          </span>
        </button>

        <button
          type="button"
          onClick={onConsultNow}
          className="text-left p-3.5 border-r border-[color:var(--t-100)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer min-w-0"
        >
          <span className="text-xs font-semibold text-[color:var(--t-700)] block">{tx('Instant Video Visit')}</span>
          <span className="text-sm font-bold text-[color:var(--t-700)] truncate flex items-center gap-1.5 mt-0.5">
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span>{tx('See a Doctor Now')}</span>
          </span>
          <span className="text-xs text-[color:var(--ink-2)] truncate block">
            {onCallStatus && onCallStatus.onlineDoctors > 0
              ? tx('{n} doctors online', { n: onCallStatus.onlineDoctors })
              : tx('24/7 care available')}
          </span>
        </button>

        <div className="p-3.5 flex flex-col justify-between gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-[color:var(--t-700)] block">{tx('Quick Tools')}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onOpenTriageTab}
              className="px-2.5 py-1.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-800)] border border-[color:var(--t-200)] text-2xs font-bold cursor-pointer rounded-none inline-flex items-center gap-1"
            >
              <Stethoscope className="h-3 w-3" />
              <span>{tx('Symptom Check')}</span>
            </button>
            <button
              type="button"
              onClick={onOpenPharmacies ? onOpenPharmacies : onOpenRxRecords}
              className="px-2.5 py-1.5 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] border border-[color:var(--t-200)] text-2xs font-bold cursor-pointer rounded-none inline-flex items-center gap-1"
            >
              <Pill className="h-3 w-3 text-[color:var(--t-600)]" />
              <span>{tx('Refill Rx')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. COMMAND BAR */}
      <div className="bg-white border border-[color:var(--t-200)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 rounded-none shadow-2xs">
        <div className="relative flex-1 min-w-[240px] max-w-lg">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx('Search by doctor, specialty, or reason for visit...')}
            aria-label={tx('Search appointments')}
            className="w-full h-9 pl-9 pr-8 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] focus:border-[color:var(--t-600)] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 text-xs font-medium text-[color:var(--ink)] rounded-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={tx('Clear search query')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs font-bold text-[color:var(--t-700)] hover:underline cursor-pointer"
            >
              {tx('Reset filter')}
            </button>
          )}
          <span className="text-xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2.5 py-1.5 rounded-none tabular-nums">
            {tx('Showing')} {filteredBookings.length} {tx('of')} {baseList.length} {tx('visits')}
          </span>
        </div>
      </div>

      {/* 5. MASTER-DETAIL SPLIT PANE (Left: Appointments Queue · Right: Live Encounter Inspector) */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] p-10 text-center rounded-none shadow-2xs">
          <div className="w-12 h-12 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="font-display font-black text-base text-[color:var(--ink)] mb-1">
            {query ? tx('No matching visits found') : tx('No Consultations Currently Scheduled')}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto font-medium leading-relaxed mb-5">
            {query
              ? tx('Try clearing your search filter or switching tabs.')
              : tx('Connect immediately with an on-call triage doctor or book a future consultation with a council-verified practitioner.')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onConsultNow}
              className="btn btn-sm btn-primary rounded-none"
            >
              <Video className="h-3.5 w-3.5" />
              <span>{tx('Consult On-Call Doctor Now')}</span>
            </button>
            {onFindDoctors && (
              <button
                type="button"
                onClick={onFindDoctors}
                className="btn btn-sm btn-secondary rounded-none"
              >
                <Search className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>{tx('Browse Medical Registry')}</span>
              </button>
            )}
            {onOpenTriage && (
              <button
                type="button"
                onClick={onOpenTriageTab}
                className="btn btn-sm btn-secondary rounded-none"
              >
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>{tx('Check Symptoms')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT PANE: ENCOUNTER QUEUE (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[color:var(--t-200)] rounded-none shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-[color:var(--t-bg)] border-b border-[color:var(--t-200)] flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[color:var(--t-600)]" />
                {tx('Your visits')}
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-[color:var(--t-200)] px-2 py-0.5">
                {filteredBookings.length}
              </span>
            </div>

            <div className="divide-y divide-[color:var(--t-100)] max-h-[600px] overflow-y-auto">
              {filteredBookings.map((b) => {
                const prof = professionals.find((p) => p.id === b.professionalId);
                const isSelected = selectedBooking?.id === b.id;
                const bPending = b.paymentStatus === 'Pending';
                const bCancelled = b.status === 'Cancelled';
                const bCompleted = b.status === 'Completed';

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                      isSelected
                        ? 'bg-[color:var(--t-50)]/70 border-l-2 border-l-[color:var(--t-600)]'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {b.date} · {b.timeSlot}
                      </span>
                      <span
                        className={`text-xs font-mono font-black uppercase px-2 py-0.5 border ${
                          bPending
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : bCancelled
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : bCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]'
                        }`}
                      >
                        {bPending ? tx('Awaiting Payment') : tx(b.status)}
                      </span>
                    </div>

                    <div className="font-display font-black text-sm text-[color:var(--ink)] truncate">
                      {b.professionalName}
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {prof?.specialization ? tx(prof.specialization) : tx('General Practice')}
                      {b.symptoms ? ` · “${b.symptoms}”` : ''}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-xs font-medium text-slate-500">
                      <span>{tx(String(b.mode))}</span>
                      <span className="font-mono font-black text-[color:var(--ink)] tabular-nums">
                        {formatMoney(b.fee)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: LIVE ENCOUNTER INSPECTOR (7 cols) */}
          <div className="lg:col-span-7 panel-elevated border-t-2 border-t-[color:var(--t-600)] rounded-none p-5 sm:p-6">
            {selectedBooking && (
              <div key={selectedBooking.id} className="space-y-5 animate-panel-in">
                {/* Practitioner Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[color:var(--t-100)]">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-12 h-12 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] overflow-hidden">
                      <UserAvatar
                        src={selectedProf?.avatar}
                        role={selectedProf?.role || 'doctor'}
                        alt={selectedBooking.professionalName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectProfessional(selectedBooking.professionalId)}
                          className="font-display font-bold text-base text-[color:var(--ink)] hover:text-[color:var(--t-600)] transition-colors cursor-pointer text-left"
                        >
                          {selectedBooking.professionalName}
                        </button>
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          {isNurse ? tx('LJM Verified') : tx('MMC Verified')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[color:var(--t-700)] mt-0.5">
                        {selectedProf?.specialization ? tx(selectedProf.specialization) : tx('General Practice & Primary Care')}
                        {selectedProf?.city ? <span className="text-slate-500 font-medium"> · {selectedProf.city}</span> : null}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-2.5 py-1 border ${
                      isPending
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : isCancelled
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]'
                    }`}
                  >
                    {isPending ? tx('Awaiting Payment') : tx(selectedBooking.status)}
                  </span>
                </div>

                {/* 4-Step Encounter Progress Timeline */}
                {!isCancelled && (() => {
                  const currentStep = isCompleted ? 4 : isPending ? 1 : 2;
                  const steps = [
                    { n: 1, label: tx('Booked') },
                    { n: 2, label: tx('Confirmed') },
                    { n: 3, label: tx('Consultation') },
                    { n: 4, label: tx('Care Summary') },
                  ];
                  return (
                    <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-3.5 py-2.5" aria-label={tx('Encounter progress')}>
                      <div className="grid grid-cols-4 gap-2">
                        {steps.map((s) => {
                          const done = s.n < currentStep || (isCompleted && s.n === 4);
                          const active = s.n === currentStep && !isCompleted;
                          return (
                            <div key={s.n} className="flex flex-col gap-1.5">
                              <div className={`h-1 w-full ${done ? 'bg-emerald-500' : active ? 'bg-[color:var(--t-600)]' : 'bg-slate-200'}`} />
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-4 h-4 text-2xs font-mono font-bold flex items-center justify-center shrink-0 ${
                                    done
                                      ? 'bg-emerald-600 text-white'
                                      : active
                                      ? 'bg-[color:var(--t-600)] text-white'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {done ? '✓' : s.n}
                                </span>
                                <span className={`text-xs truncate ${done || active ? 'font-semibold text-[color:var(--ink)]' : 'font-medium text-slate-500'}`}>
                                  {s.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Metadata Bento Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3">
                    <span className="text-xs font-semibold text-slate-600 block">{tx('Date and time')}</span>
                    <span className="text-xs font-black text-[color:var(--ink)] font-mono mt-1 block">
                      {selectedBooking.date}
                    </span>
                    <span className="text-xs font-mono text-slate-600">{selectedBooking.timeSlot}</span>
                  </div>
                  <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3">
                    <span className="text-xs font-semibold text-slate-600 block">{tx('Channel')}</span>
                    <span className="text-xs font-black text-[color:var(--ink)] mt-1 flex items-center gap-1">
                      {isVideo ? (
                        <Video className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                      )}
                      <span className="truncate">{tx(String(selectedBooking.mode))}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {isVideo ? tx('Video Call') : isHomeVisit ? tx('Home Visit') : tx('In-Clinic')}
                    </span>
                  </div>
                  <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3">
                    <span className="text-xs font-semibold text-slate-600 block">{tx('Fee')}</span>
                    <span className="text-xs font-black font-mono tabular-nums text-[color:var(--ink)] mt-1 block">
                      {formatMoney(selectedBooking.fee)}
                    </span>
                    <span className="text-xs text-emerald-700 font-bold">
                      {selectedBooking.paymentStatus === 'Refunded'
                        ? tx('Refunded')
                        : isPending
                        ? tx('Payment Pending')
                        : tx('Confirmed & Paid')}
                    </span>
                  </div>
                  <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3">
                    <span className="text-xs font-semibold text-slate-600 block">{tx('Your doctor')}</span>
                    <span className="text-xs font-bold text-slate-700 mt-1 block truncate" title={selectedBooking.id}>
                      {selectedBooking.professionalName}
                    </span>
                    <span className="text-xs text-slate-500">{tx('Council-verified')}</span>
                  </div>
                </div>

                {/* Stated Symptoms */}
                {selectedBooking.symptoms && (
                  <div className="bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3.5">
                    <span className="text-xs font-semibold text-slate-600 block mb-1">
                      {tx('What You Shared')}
                    </span>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      “{selectedBooking.symptoms}”
                    </p>
                  </div>
                )}

                {/* Issued Prescription / Care Summary */}
                {selectedBooking.prescription && (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {tx('Issued E-Prescription & Care Summary')}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        {tx('Verified Digital Signature')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {tx('Diagnosis:')} {selectedBooking.prescription.diagnosis}
                    </p>
                    <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-white/80 p-2.5 border border-emerald-100">
                      {selectedBooking.prescription.medicines}
                    </pre>
                    {selectedBooking.prescription.instructions && (
                      <p className="text-xs text-slate-600">{selectedBooking.prescription.instructions}</p>
                    )}
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-3 border-t border-[color:var(--t-100)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => onPayBooking(selectedBooking)}
                        className="btn btn-sm btn-primary rounded-none"
                      >
                        <span>{tx('Pay {amount}', { amount: formatMoney(selectedBooking.fee) })}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : !isCompleted ? (
                      <>
                        {isVideo && (
                          <button
                            type="button"
                            onClick={onOpenLiveRoom}
                            className="btn btn-sm btn-primary rounded-none"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>{tx('Join Video Room')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onNavigateToMessages}
                          className="btn btn-sm btn-secondary rounded-none"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                          <span>{tx('Message')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProfessional(selectedBooking.professionalId)}
                          className="btn btn-sm btn-secondary rounded-none"
                        >
                          {tx('Doctor Profile')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onOpenRecordsOverview}
                          className="btn btn-sm btn-secondary rounded-none"
                        >
                          <FileText className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                          <span>{tx('Notes & Rx')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProfessional(selectedBooking.professionalId)}
                          className="btn btn-sm btn-primary rounded-none"
                        >
                          <span>{tx('Book Follow-Up')}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => onCancelBooking(selectedBooking)}
                      className="btn btn-sm btn-ghost text-slate-600 hover:text-rose-700 rounded-none"
                    >
                      {tx('Cancel Appointment')}
                    </button>
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
