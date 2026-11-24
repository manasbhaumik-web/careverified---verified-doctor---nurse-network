import React, { useState } from 'react';
import {
  Video,
  Pill,
  MessageSquare,
  Store,
  CalendarPlus,
  HeartPulse,
  ShieldCheck,
  Calendar,
  Clock,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Booking, DoctorProfile, NurseProfile } from '../../types';
import { useTr, formatDate } from '../../locale';
import { UserAvatar } from '../../avatars';
import WorkspaceHeader from '../../shared/ui/WorkspaceHeader';

interface PatientOverviewTabProps {
  userName: string;
  greeting: string;
  upcoming: Booking[];
  activeConsult: any | null;
  summary: { activeRx: number; bp: any | null; pulse: any | null; glucose: any | null; spo2: any | null; temp: any | null } | null;
  recordsData: any | null;
  activePrescriptions: any[];
  careTeam: (DoctorProfile | NurseProfile)[];
  /** All professionals, used to find the photo of the doctor for the next visit. */
  professionals?: (DoctorProfile | NurseProfile)[];
  patientAllergies: string[];
  patientConditions: string[];
  onCallStatus: { onlineDoctors: number; consultFee: number } | null;
  onOpenAppointments: () => void;
  onOpenLiveRoom: () => void;
  onFindDoctor: () => void;
  onOpenRecords: () => void;
  onConsultNow: () => void;
  onOpenTriage: () => void;
  onOpenMessages: () => void;
  onOpenPrescriptions: () => void;
  onOpenVitals: () => void;
  onOpenCareTeam: () => void;
  onFindPharmacy: () => void;
  onSelectProfessional: (id: string) => void;
}

const card = 'bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] shadow-2xs flex flex-col rounded-none';
const cardHeadBar = 'px-4 sm:px-5 py-3.5 bg-[color:var(--t-50)]/60 border-b border-[color:var(--t-200)] flex items-center justify-between gap-3';
const iconTile = 'h-9 w-9 shrink-0 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center shadow-2xs';
const eyebrow = 'text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)]';
const btnP = 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors rounded-none shadow-2xs';
const btnS = 'bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] px-3 py-2 text-xs font-bold cursor-pointer transition-colors rounded-none';

/** Bookings store YYYY-MM-DD; show it the way people say it, e.g. "Sun 12 Jul". */
const visitDay = (d: string, withYear = false) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  if (!m) return d;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return formatDate(dt, withYear ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function PatientOverviewTab(props: PatientOverviewTabProps) {
  const tx = useTr();
  const {
    userName, greeting, upcoming, activeConsult, summary, recordsData, activePrescriptions,
    careTeam, patientAllergies, patientConditions, onCallStatus,
  } = props;

  const next = upcoming[0];
  const nextProf = next ? (props.professionals || careTeam).find(p => p.id === next.professionalId) : undefined;
  const nextMode = String(next?.mode || '').toLowerCase();
  const nextIsVideo = nextMode.includes('video') || nextMode.includes('tele') || nextMode.includes('online');
  const meds: { key: string; name: string; note: string }[] = activePrescriptions.flatMap((rx: any) =>
    (Array.isArray(rx.items) && rx.items.length
      ? rx.items.map((it: any, i: number) => ({ key: `${rx.id}-${i}`, name: it.name, note: it.instructions || rx.diagnosis || '' }))
      : [{ key: String(rx.id), name: rx.diagnosis || tx('Prescribed Medicine'), note: rx.code || '' }])
  ).filter((m: any) => m.name);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const takenCount = meds.filter(m => taken[m.key]).length;
  const dosePct = meds.length ? Math.round((takenCount / meds.length) * 100) : 0;

  const bpSeries: number[] = (recordsData?.vitals || [])
    .filter((v: any) => v.kind === 'bp' && v.value1 != null)
    .slice(0, 7)
    .map((v: any) => Number(v.value1))
    .reverse();
  const sparkCoords = (() => {
    if (bpSeries.length < 2) return [];
    const min = Math.min(...bpSeries), max = Math.max(...bpSeries);
    const span = Math.max(max - min, 1);
    return bpSeries.map((v, i) => ({
      x: 16 + (i * 508) / (bpSeries.length - 1),
      y: 56 - ((v - min) / span) * 38,
      v,
    }));
  })();
  const spark = sparkCoords.map(p => `${p.x},${p.y}`).join(' ');
  const sparkArea = sparkCoords.length >= 2
    ? `${sparkCoords[0].x},68 ${spark} ${sparkCoords[sparkCoords.length - 1].x},68`
    : '';

  const bpText = summary?.bp ? `${summary.bp.value1}/${summary.bp.value2}` : '—';
  const dateText = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" tabIndex={0} className="space-y-4 animate-fade-in">
      {/* 1. WORKSPACE HEADER STRIP (Matches WorkspaceHeader variant="overview" across all Patient tabs) */}
      <WorkspaceHeader
        variant="overview"
        icon={HeartPulse}
        eyebrow={dateText}
        title={`${greeting}, ${userName}`}
        badges={
          <>
            {activeConsult && (
              <span className="bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-none">
                {tx('Consult in progress')}
              </span>
            )}
            {onCallStatus && onCallStatus.onlineDoctors > 0 && (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-none inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-emerald-600 animate-pulse" aria-hidden="true" />
                {tx('{n} doctors online', { n: onCallStatus.onlineDoctors })}
              </span>
            )}
          </>
        }
        aside={
          <>
            <button
              type="button"
              onClick={props.onConsultNow}
              className={`${btnS} inline-flex items-center gap-1.5`}
            >
              <Video className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
              <span>{tx('Start Instant Consult')}</span>
            </button>
            <button
              type="button"
              onClick={props.onFindDoctor}
              className={`${btnP} inline-flex items-center gap-1.5`}
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{tx('Book a doctor')}</span>
            </button>
          </>
        }
      />

      {/* 2. TODAY: NEXT VISIT & TODAY'S MEDICINES */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <article className={`${card} lg:col-span-7 justify-between`}>
          <div className={cardHeadBar}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={iconTile}>
                <Calendar className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[color:var(--ink)] truncate">
                  {next ? tx('Your next visit') : tx('No upcoming visits')}
                </h2>
                <p className="text-xs text-[color:var(--ink-2)] truncate">
                  {next ? visitDay(next.date, true) : tx('Start a video consult or book a visit with an MMC-verified doctor.')}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              {tx('Verified doctor')}
            </span>
          </div>

          {next ? (
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-[color:var(--t-50)] border-2 border-[color:var(--t-200)] overflow-hidden shadow-2xs">
                    <UserAvatar src={nextProf?.avatar} role={nextProf?.role || 'doctor'} alt="" className="h-full w-full rounded-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[color:var(--ink)] leading-tight truncate">
                      {next.professionalName}
                    </h3>
                    <p className="text-xs text-[color:var(--ink-2)] font-medium mt-0.5 truncate">
                      {(nextProf as any)?.specialization || (nextProf as any)?.specialty || tx('Verified practitioner')}
                      {nextProf?.licenseNumber ? ` · ${nextProf.licenseNumber}` : ''}
                      {nextProf?.city ? ` · ${nextProf.city}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 border border-[color:var(--t-200)] bg-[color:var(--t-50)]/50 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--t-200)]">
                {[
                  { icon: Video, label: tx('Format'), value: tx(String(next.mode)) },
                  { icon: Calendar, label: tx('Date'), value: visitDay(next.date, true) },
                  { icon: Clock, label: tx('Time'), value: next.timeSlot },
                ].map(x => (
                  <div key={x.label} className="px-3.5 py-2.5 flex flex-col gap-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-[color:var(--t-700)]">
                      <x.icon className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
                      {x.label}
                    </span>
                    <span className="text-sm font-bold text-[color:var(--ink)] truncate">{x.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                {nextIsVideo ? (
                  <button
                    type="button"
                    onClick={props.onOpenLiveRoom}
                    className={`${btnP} inline-flex items-center gap-1.5`}
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{tx('Join video call')}</span>
                  </button>
                ) : (
                  <button type="button" onClick={props.onOpenAppointments} className={btnP}>
                    {tx('View visit details')}
                  </button>
                )}
                {nextIsVideo && (
                  <button type="button" onClick={props.onOpenAppointments} className={btnS}>
                    {tx('View visit details')}
                  </button>
                )}
                <button type="button" onClick={() => props.onSelectProfessional(next.professionalId)} className={btnS}>
                  {tx('Doctor profile')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] p-4 space-y-1.5">
                <h3 className="text-lg font-bold text-[color:var(--ink)]">{tx('See a verified doctor today')}</h3>
                <p className="text-xs text-[color:var(--ink-2)] leading-relaxed">
                  {tx('Start a video consult or book a visit with an MMC-verified doctor.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={props.onConsultNow}
                  className={`${btnP} inline-flex items-center gap-1.5`}
                >
                  <Video className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{tx('Start Instant Consult')}</span>
                </button>
                <button type="button" onClick={props.onOpenTriage} className={btnS}>
                  {tx('Symptom Triage')}
                </button>
              </div>
            </div>
          )}
        </article>

        <article className={`${card} lg:col-span-5`}>
          <div className={cardHeadBar}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={iconTile}>
                <Pill className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[color:var(--ink)] truncate">{tx("Today's medicines")}</h2>
                <p className="text-xs text-[color:var(--ink-2)] truncate">
                  {tx('{a} of {b} doses logged today', { a: takenCount, b: meds.length })}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center min-w-[40px] h-6 px-2 bg-white border border-[color:var(--t-200)] text-[color:var(--t-800)] text-xs font-bold tabular-nums">
              {dosePct}%
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-3.5">
            <div
              className="h-2 bg-[color:var(--t-100)] border border-[color:var(--t-200)]/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={dosePct}
              aria-label={tx('Medicines taken today')}
            >
              <div className="h-full bg-[color:var(--t-600)] transition-all" style={{ width: `${dosePct}%` }} />
            </div>

            {meds.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)] bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] p-3.5">
                {tx('No active medicines on your prescriptions.')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {meds.slice(0, 6).map(m => {
                  const isTaken = !!taken[m.key];
                  return (
                    <label
                      key={m.key}
                      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer border transition-colors rounded-none ${
                        isTaken
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : 'bg-[color:var(--t-50)]/40 hover:bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--ink)]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-bold truncate">{m.name}</span>
                        {m.note && <span className="block text-2xs text-[color:var(--ink-2)] truncate">{m.note}</span>}
                      </span>
                      <input
                        type="checkbox"
                        checked={isTaken}
                        onChange={e => setTaken(prev => ({ ...prev, [m.key]: e.target.checked }))}
                        className="h-4 w-4 accent-[color:var(--t-600)] cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </section>

      {/* 4. QUICK ACTIONS: WHAT WOULD YOU LIKE TO DO? */}
      <section aria-labelledby="ov-todo" className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--t-100)] pb-2.5">
          <h2 id="ov-todo" className="text-base font-bold text-[color:var(--ink)]">{tx('What would you like to do?')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { icon: CalendarPlus, label: tx('Book a doctor'), sub: tx('Find a verified doctor and pick a time'), onClick: props.onFindDoctor, primary: true },
            { icon: HeartPulse, label: tx('Check my symptoms'), sub: tx('Answer a few questions for guidance'), onClick: props.onOpenTriage },
            { icon: Pill, label: tx('My medicines'), sub: tx('{n} active prescriptions', { n: activePrescriptions.length }), onClick: props.onOpenPrescriptions },
            { icon: MessageSquare, label: tx('Messages'), sub: tx('Talk to your care team'), onClick: props.onOpenMessages },
          ].map(t => (
            <button
              key={t.label}
              type="button"
              onClick={t.onClick}
              className={`group text-left p-4 flex flex-col justify-between gap-3 cursor-pointer transition-colors rounded-none border ${
                t.primary
                  ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)] hover:bg-[color:var(--t-700)]'
                  : 'bg-[color:var(--t-50)]/35 text-[color:var(--ink)] border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] hover:border-[color:var(--t-300)]'
              }`}
            >
              <span className="flex items-center justify-between gap-2 w-full">
                <span
                  className={`h-9 w-9 shrink-0 flex items-center justify-center border ${
                    t.primary
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-white border-[color:var(--t-200)] text-[color:var(--t-700)]'
                  }`}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <ArrowRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                    t.primary ? 'text-white/80' : 'text-[color:var(--t-600)]'
                  }`}
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-snug">{t.label}</span>
                <span className={`block text-xs mt-1 leading-snug ${t.primary ? 'text-white/90' : 'text-[color:var(--ink-2)]'}`}>
                  {t.sub}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. HEALTH TELEMETRY: VITALS & ALLERGIES */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <article className={`${card} lg:col-span-7`}>
          <div className={cardHeadBar}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={iconTile}>
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-[color:var(--ink)] truncate">{tx('Blood pressure over time')}</h3>
            </div>
            <button type="button" onClick={props.onOpenVitals} className={btnS}>{tx('+ Log Reading')}</button>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            {spark ? (
              <svg
                viewBox="0 0 540 72"
                className="w-full h-[88px] bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)]"
                role="img"
                aria-label={tx('Blood pressure trend')}
              >
                <line x1="0" y1="24" x2="540" y2="24" stroke="var(--t-200)" strokeDasharray="3 3" strokeWidth="1" />
                <line x1="0" y1="48" x2="540" y2="48" stroke="var(--t-200)" strokeDasharray="3 3" strokeWidth="1" />
                {sparkArea && <polygon fill="var(--t-100)" fillOpacity="0.55" points={sparkArea} />}
                <polyline fill="none" stroke="var(--t-600)" strokeWidth="2.5" points={spark} />
                {sparkCoords.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="3" fill="white" stroke="var(--t-700)" strokeWidth="2" />
                ))}
              </svg>
            ) : (
              <div className="flex-1 min-h-[88px] bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] px-4 py-3.5 flex items-center">
                <p className="text-xs text-[color:var(--ink-2)]">
                  {tx('Log at least two blood pressure readings to see a trend.')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--t-200)] text-center">
              {[
                { l: tx('BP'), v: bpText },
                { l: tx('Heart rate'), v: summary?.pulse?.value1 != null ? `${summary.pulse.value1}` : '—' },
                { l: tx('Glucose'), v: summary?.glucose?.value1 != null ? `${summary.glucose.value1}` : '—' },
                { l: tx('SpO₂'), v: summary?.spo2?.value1 != null ? `${summary.spo2.value1}%` : '—' },
              ].map(x => (
                <div key={x.l} className="py-2.5 px-2">
                  <div className="text-2xs font-bold uppercase tracking-wider text-[color:var(--ink-2)]">{x.l}</div>
                  <div className="text-sm font-bold text-[color:var(--ink)] tabular-nums mt-0.5">{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className={`${card} lg:col-span-5`}>
          <div className={cardHeadBar}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={iconTile}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-[color:var(--ink)] truncate">{tx('Allergies & conditions')}</h3>
            </div>
            <button type="button" onClick={props.onOpenVitals} className={btnS}>{tx('Update')}</button>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)]">
                <div className="text-2xs font-bold uppercase tracking-wider text-[color:var(--ink-2)] mb-1.5">{tx('Allergies')}</div>
                {patientAllergies.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patientAllergies.map(a => (
                      <span key={a} className="bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold px-2 py-0.5 rounded-none">
                        {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[color:var(--ink-2)]">{tx('None recorded')}</span>
                )}
              </div>

              <div className="p-3 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)]">
                <div className="text-2xs font-bold uppercase tracking-wider text-[color:var(--ink-2)] mb-1.5">{tx('Chronic conditions')}</div>
                {patientConditions.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patientConditions.map(c => (
                      <span key={c} className="bg-white border border-[color:var(--t-200)] text-[color:var(--t-800)] text-xs font-bold px-2 py-0.5 rounded-none">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[color:var(--ink-2)]">{tx('None recorded')}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={props.onOpenMessages} className={`${btnP} inline-flex items-center gap-1.5`}>
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{tx('Message a doctor')}</span>
              </button>
              <button type="button" onClick={props.onOpenTriage} className={btnS}>{tx('Check my symptoms')}</button>
            </div>
          </div>
        </article>
      </section>

      {/* 6. CONTINUITY OF CARE: PRESCRIPTIONS & CARE TEAM */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <article className={`${card} lg:col-span-7`}>
          <div className={cardHeadBar}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={iconTile}>
                <Pill className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-[color:var(--ink)] truncate">
                {tx('My medicines')} ({activePrescriptions.length})
              </h3>
            </div>
            <button type="button" onClick={props.onFindPharmacy} className={`${btnS} inline-flex items-center gap-1.5`}>
              <Store className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
              <span>{tx('Find a Pharmacy')}</span>
            </button>
          </div>

          <div className="p-5 flex-1">
            {activePrescriptions.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)] bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] p-3.5">
                {tx('You have no active prescriptions.')}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activePrescriptions.slice(0, 4).map((rx: any) => (
                  <div
                    key={rx.id}
                    className="bg-[color:var(--t-50)]/40 hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-3.5 py-3 flex flex-wrap items-center justify-between gap-3 rounded-none transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[color:var(--ink)] truncate">
                          {Array.isArray(rx.items) && rx.items[0]?.name ? rx.items[0].name : rx.diagnosis || tx('Prescribed Medicine')}
                        </span>
                        {rx.code && (
                          <span className="font-mono text-2xs font-bold text-[color:var(--t-700)] bg-white border border-[color:var(--t-200)] px-1.5 py-0.5">
                            {rx.code}
                          </span>
                        )}
                      </div>
                      {rx.diagnosis && <div className="text-xs text-[color:var(--ink-2)] mt-0.5 truncate">{rx.diagnosis}</div>}
                    </div>
                    <button type="button" onClick={props.onOpenPrescriptions} className={btnS}>{tx('Open')}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className={`${card} lg:col-span-5`}>
          <div className={cardHeadBar}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={iconTile}>
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-[color:var(--ink)] truncate">{tx('My Care Team')}</h3>
            </div>
            <button type="button" onClick={props.onOpenCareTeam} className={btnS}>{tx('View all')}</button>
          </div>

          <div className="p-5 flex-1">
            {careTeam.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)] bg-[color:var(--t-50)]/60 border border-[color:var(--t-200)] p-3.5">
                {tx('Your care team appears here after your first paid visit.')}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {careTeam.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className="bg-[color:var(--t-50)]/40 hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-3.5 py-2.5 flex items-center justify-between gap-3 rounded-none transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-white border-2 border-[color:var(--t-200)] overflow-hidden shadow-2xs">
                        <UserAvatar src={p.avatar} role={p.role} alt="" className="h-full w-full rounded-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[color:var(--ink)] truncate">{p.name}</span>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                        </div>
                        <div className="text-xs text-[color:var(--ink-2)] truncate">
                          {(p as any).specialty || (p as any).specialization || tx('Verified practitioner')}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => props.onSelectProfessional(p.id)} className={btnS}>{tx('Profile')}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
