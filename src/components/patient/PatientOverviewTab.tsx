import React, { useState } from 'react';
import { Video, Pill, MessageSquare, Store, CalendarPlus, HeartPulse, ShieldCheck, Calendar, Clock } from 'lucide-react';
import { Booking, DoctorProfile, NurseProfile } from '../../types';
import { useTr, formatDate } from '../../locale';
import { UserAvatar } from '../../avatars';

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

const card = 'bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 sm:p-6 flex flex-col gap-4 rounded-none';
const eyebrow = 'text-xs font-semibold text-[color:var(--t-700)]';
const btnP = 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors rounded-none';
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
  const spark = (() => {
    if (bpSeries.length < 2) return '';
    const min = Math.min(...bpSeries), max = Math.max(...bpSeries);
    const span = Math.max(max - min, 1);
    return bpSeries.map((v, i) => `${8 + (i * 524) / (bpSeries.length - 1)},${56 - ((v - min) / span) * 40}`).join(' ');
  })();

  const bpText = summary?.bp ? `${summary.bp.value1}/${summary.bp.value2}` : '—';
  const dateText = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });


  return (
    <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" tabIndex={0} className="space-y-8">
      {/* Title strip */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={eyebrow}>{dateText}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[color:var(--ink)]">{greeting}, {userName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeConsult && (
            <span className="bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-none">{tx('Consult in progress')}</span>
          )}
          {onCallStatus && onCallStatus.onlineDoctors > 0 && (
            <span className="bg-[color:var(--t-50)] text-[color:var(--t-800)] border border-[color:var(--t-200)] text-xs font-bold px-2.5 py-1.5 rounded-none">
              {tx('{n} doctors online', { n: onCallStatus.onlineDoctors })}
            </span>
          )}
        </div>
      </div>

      {/* Today: next visit and medicines */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className="lg:col-span-7 bg-[color:var(--t-600)] text-white border border-[color:var(--t-700)] p-6 sm:p-7 flex flex-col justify-between gap-6 rounded-none">
            {next ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="bg-white/20 border border-white/30 text-xs font-bold px-2.5 py-1">{tx('Your next visit')}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{tx('Verified doctor')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 bg-white overflow-hidden">
                    <UserAvatar src={nextProf?.avatar} role={nextProf?.role || 'doctor'} alt="" className="h-full w-full object-cover" />
                  </div>
                  <h2 className="min-w-0 text-2xl sm:text-3xl font-bold leading-tight">{next.professionalName}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Video, label: tx('Format'), value: tx(String(next.mode)) },
                    { icon: Calendar, label: tx('Date'), value: visitDay(next.date, true) },
                    { icon: Clock, label: tx('Time'), value: next.timeSlot },
                  ].map(x => (
                    <div key={x.label} className="bg-white/15 px-3.5 py-3 flex flex-col gap-1.5 min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"><x.icon className="h-3.5 w-3.5" aria-hidden="true" />{x.label}</span>
                      <span className="text-base font-bold">{x.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {nextIsVideo ? (
                    <button type="button" onClick={props.onOpenLiveRoom} className="bg-white text-[color:var(--t-800)] px-4 py-3 text-sm font-bold cursor-pointer hover:bg-[color:var(--t-50)] rounded-none inline-flex items-center gap-2"><Video className="h-4 w-4" />{tx('Join video call')}</button>
                  ) : (
                    <button type="button" onClick={props.onOpenAppointments} className="bg-white text-[color:var(--t-800)] px-4 py-3 text-sm font-bold cursor-pointer hover:bg-[color:var(--t-50)] rounded-none">{tx('View visit details')}</button>
                  )}
                  {nextIsVideo && <button type="button" onClick={props.onOpenAppointments} className="border border-white/60 text-white px-4 py-3 text-sm font-bold cursor-pointer hover:bg-white/10 rounded-none">{tx('View visit details')}</button>}
                  <button type="button" onClick={() => props.onSelectProfessional(next.professionalId)} className="border border-white/60 text-white px-4 py-3 text-sm font-bold cursor-pointer hover:bg-white/10 rounded-none">{tx('Doctor profile')}</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="inline-block bg-white/20 border border-white/30 text-xs font-bold px-2 py-1">{tx('No upcoming visits')}</span>
                  <h2 className="mt-4 mb-1.5 text-2xl font-bold">{tx('See a verified doctor today')}</h2>
                  <p className="text-xs opacity-90">{tx('Start a video consult or book a visit with an MMC-verified doctor.')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={props.onConsultNow} className="bg-white text-[color:var(--t-800)] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[color:var(--t-50)] rounded-none inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />{tx('Start Instant Consult')}</button>
                  <button type="button" onClick={props.onOpenTriage} className="border border-white/50 text-white px-3 py-2 text-xs font-bold cursor-pointer hover:bg-white/10 rounded-none">{tx('Symptom Triage')}</button>
                </div>
              </>
            )}
          </article>

        <article className={`${card} lg:col-span-5`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-bold">{tx("Today's medicines")}</div>
                <div className="text-sm text-[color:var(--ink-2)] mt-0.5">{tx('{a} of {b} doses logged today', { a: takenCount, b: meds.length })}</div>
              </div>
              <Pill className="h-4 w-4 text-[color:var(--t-600)]" aria-hidden="true" />
            </div>
            <div className="h-2 bg-[color:var(--t-100)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dosePct} aria-label={tx('Medicines taken today')}>
              <div className="h-full bg-[color:var(--t-600)] transition-all" style={{ width: `${dosePct}%` }} />
            </div>
            {meds.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)]">{tx('No active medicines on your prescriptions.')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {meds.slice(0, 6).map(m => (
                  <label key={m.key} className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer rounded-none ${taken[m.key] ? 'bg-emerald-50' : 'bg-[color:var(--t-50)]'}`}>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold truncate">{m.name}</span>
                      {m.note && <span className="block text-2xs text-[color:var(--ink-2)] truncate">{m.note}</span>}
                    </span>
                    <input type="checkbox" checked={!!taken[m.key]} onChange={e => setTaken(prev => ({ ...prev, [m.key]: e.target.checked }))} className="h-4 w-4 accent-[color:var(--t-600)] cursor-pointer" />
                  </label>
                ))}
              </div>
            )}
          </article>
      </section>

      {/* What would you like to do? */}
      <section aria-labelledby="ov-todo" className="space-y-2.5">
        <h2 id="ov-todo" className="text-base font-bold text-[color:var(--ink)]">{tx('What would you like to do?')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CalendarPlus, label: tx('Book a doctor'), sub: tx('Find a verified doctor and pick a time'), onClick: props.onFindDoctor, primary: true },
            { icon: HeartPulse, label: tx('Check my symptoms'), sub: tx('Answer a few questions for guidance'), onClick: props.onOpenTriage },
            { icon: Pill, label: tx('My medicines'), sub: tx('{n} active prescriptions', { n: activePrescriptions.length }), onClick: props.onOpenPrescriptions },
            { icon: MessageSquare, label: tx('Messages'), sub: tx('Talk to your care team'), onClick: props.onOpenMessages },
          ].map(t => (
            <button key={t.label} type="button" onClick={t.onClick} className={`text-left min-h-[104px] p-5 flex flex-col gap-2.5 cursor-pointer transition-colors rounded-none border ${t.primary ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)] hover:bg-[color:var(--t-700)]' : 'bg-white text-[color:var(--ink)] border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]'}`}>
              <t.icon className={`h-5 w-5 ${t.primary ? 'text-white' : 'text-[color:var(--t-600)]'}`} aria-hidden="true" />
              <span className="text-sm font-bold">{t.label}</span>
              <span className={`text-xs ${t.primary ? 'text-white/90' : 'text-[color:var(--ink-2)]'}`}>{t.sub}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Health: vitals and allergies */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className={`${card} lg:col-span-7`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">{tx('Blood pressure over time')}</h3>
              </div>
              <button type="button" onClick={props.onOpenVitals} className={btnS}>{tx('+ Log Reading')}</button>
            </div>
            {spark ? (
              <svg viewBox="0 0 540 72" className="w-full h-[72px] bg-[color:var(--t-50)] border border-[color:var(--t-100)]" role="img" aria-label={tx('Blood pressure trend')}>
                <polyline fill="none" stroke="#0A7A63" strokeWidth="2.5" points={spark} />
              </svg>
            ) : (
              <p className="text-xs text-[color:var(--ink-2)] bg-[color:var(--t-50)] border border-[color:var(--t-100)] p-4">{tx('Log at least two blood pressure readings to see a trend.')}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { l: tx('BP'), v: bpText },
                { l: tx('Heart rate'), v: summary?.pulse?.value1 != null ? `${summary.pulse.value1}` : '—' },
                { l: tx('Glucose'), v: summary?.glucose?.value1 != null ? `${summary.glucose.value1}` : '—' },
                { l: tx('SpO₂'), v: summary?.spo2?.value1 != null ? `${summary.spo2.value1}%` : '—' },
              ].map(x => (
                <div key={x.l} className="bg-[color:var(--t-50)] py-3">
                  <div className="text-xs font-semibold text-[color:var(--ink-2)]">{x.l}</div>
                  <div className="text-sm font-bold tabular-nums">{x.v}</div>
                </div>
              ))}
            </div>
          </article>

        <article className={`${card} lg:col-span-5`}>
          <div className="border-b border-[color:var(--t-100)] pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">{tx('Allergies & conditions')}</h3>
            </div>
            <button type="button" onClick={props.onOpenVitals} className={btnS}>{tx('Update')}</button>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-[color:var(--ink-2)] mb-1.5">{tx('Allergies')}</div>
              {patientAllergies.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {patientAllergies.map(a => <span key={a} className="bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold px-2 py-1 rounded-none">{a}</span>)}
                </div>
              ) : <span className="text-xs text-[color:var(--ink-2)]">{tx('None recorded')}</span>}
            </div>
            <div>
              <div className="text-xs font-semibold text-[color:var(--ink-2)] mb-1.5">{tx('Chronic conditions')}</div>
              {patientConditions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {patientConditions.map(c => <span key={c} className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-800)] text-xs font-bold px-2 py-1 rounded-none">{c}</span>)}
                </div>
              ) : <span className="text-xs text-[color:var(--ink-2)]">{tx('None recorded')}</span>}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={props.onOpenMessages} className={`${btnP} inline-flex items-center gap-1.5`}><MessageSquare className="h-3.5 w-3.5" />{tx('Message a doctor')}</button>
              <button type="button" onClick={props.onOpenTriage} className={btnS}>{tx('Check my symptoms')}</button>
            </div>
          </div>
        </article>
      </section>

      {/* Prescriptions and care team */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className={`${card} lg:col-span-7`}>
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--t-100)] pb-3">
              <div>
                <h3 className="text-base font-bold">{tx('My medicines')} ({activePrescriptions.length})</h3>
              </div>
              <button type="button" onClick={props.onFindPharmacy} className={`${btnS} inline-flex items-center gap-1.5`}><Store className="h-3.5 w-3.5" />{tx('Find a Pharmacy')}</button>
            </div>
            {activePrescriptions.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)]">{tx('You have no active prescriptions.')}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activePrescriptions.slice(0, 4).map((rx: any) => (
                  <div key={rx.id} className="bg-[color:var(--t-50)] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 rounded-none">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        {Array.isArray(rx.items) && rx.items[0]?.name ? rx.items[0].name : rx.diagnosis || tx('Prescribed Medicine')}
                        {rx.code && <span className="ml-2 text-xs font-medium text-[color:var(--ink-2)]">{rx.code}</span>}
                      </div>
                      {rx.diagnosis && <div className="text-2xs text-[color:var(--ink-2)] mt-0.5 truncate">{rx.diagnosis}</div>}
                    </div>
                    <button type="button" onClick={props.onOpenPrescriptions} className={btnS}>{tx('Open')}</button>
                  </div>
                ))}
              </div>
            )}
          </article>

        <article className={`${card} lg:col-span-5 bg-[color:var(--t-50)]`}>
          <div className="border-b border-[color:var(--t-200)] pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">{tx('My Care Team')}</h3>
            </div>
            <button type="button" onClick={props.onOpenCareTeam} className={btnS}>{tx('View all')}</button>
          </div>
          {careTeam.length === 0 ? (
            <p className="text-xs text-[color:var(--ink-2)]">{tx('Your care team appears here after your first paid visit.')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {careTeam.slice(0, 3).map(p => (
                <div key={p.id} className="bg-white px-4 py-3 flex items-center justify-between gap-3 hover:bg-[color:var(--t-50)] rounded-none">
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-2xs text-[color:var(--ink-2)] truncate">{(p as any).specialty || (p as any).specialization || tx('Verified practitioner')}</div>
                  </div>
                  <button type="button" onClick={() => props.onSelectProfessional(p.id)} className={btnS}>{tx('Profile')}</button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
