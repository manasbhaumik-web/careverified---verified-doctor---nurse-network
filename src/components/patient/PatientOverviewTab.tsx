import React, { useState } from 'react';
import { Video, Pill, MessageSquare, Store } from 'lucide-react';
import { Booking, DoctorProfile, NurseProfile } from '../../types';
import { useTr } from '../../locale';

interface PatientOverviewTabProps {
  userName: string;
  greeting: string;
  upcoming: Booking[];
  activeConsult: any | null;
  summary: { activeRx: number; bp: any | null; pulse: any | null; glucose: any | null; spo2: any | null; temp: any | null } | null;
  recordsData: any | null;
  activePrescriptions: any[];
  careTeam: (DoctorProfile | NurseProfile)[];
  patientAllergies: string[];
  patientConditions: string[];
  onCallStatus: { onlineDoctors: number; consultFee: number } | null;
  onOpenAppointments: () => void;
  onConsultNow: () => void;
  onOpenTriage: () => void;
  onOpenMessages: () => void;
  onOpenPrescriptions: () => void;
  onOpenVitals: () => void;
  onOpenCareTeam: () => void;
  onFindPharmacy: () => void;
  onSelectProfessional: (id: string) => void;
}

const card = 'bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-4 sm:p-5 flex flex-col gap-3.5 rounded-none';
const eyebrow = 'text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)]';
const btnP = 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] px-3.5 py-2 text-xs font-bold cursor-pointer transition-colors rounded-none';
const btnS = 'bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] px-3 py-2 text-xs font-bold cursor-pointer transition-colors rounded-none';

export default function PatientOverviewTab(props: PatientOverviewTabProps) {
  const tx = useTr();
  const {
    userName, greeting, upcoming, activeConsult, summary, recordsData, activePrescriptions,
    careTeam, patientAllergies, patientConditions, onCallStatus,
  } = props;

  const next = upcoming[0];
  const meds: { key: string; name: string; note: string }[] = activePrescriptions.flatMap((rx: any) =>
    (Array.isArray(rx.items) && rx.items.length
      ? rx.items.map((it: any, i: number) => ({ key: `${rx.id}-${i}`, name: it.name, note: it.instructions || rx.diagnosis || '' }))
      : [{ key: String(rx.id), name: rx.diagnosis || tx('Prescribed Medicine'), note: rx.code || '' }])
  ).filter((m: any) => m.name);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const takenCount = meds.filter(m => taken[m.key]).length;

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

  const kpis = [
    { label: tx('Next Consultation'), value: next ? `${next.date} · ${next.timeSlot}` : tx('None scheduled'), sub: next ? next.professionalName : tx('Book a visit to get started') },
    { label: tx('Active Prescriptions'), value: String(summary?.activeRx ?? activePrescriptions.length ?? 0), sub: meds.slice(0, 2).map(m => m.name).join(' · ') || tx('No active medicines') },
    { label: tx('Blood Pressure'), value: bpText, sub: summary?.pulse?.value1 != null ? `${tx('HR')} ${summary.pulse.value1} bpm` : tx('No recent reading') },
    { label: tx('Daily Adherence'), value: `${takenCount} / ${meds.length}`, sub: tx('Doses logged today') },
  ];

  return (
    <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" tabIndex={0} className="space-y-5">
      {/* Title strip */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={eyebrow}>{tx('Patient Care Overview')} · {dateText}</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--ink)]">{greeting}, {userName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeConsult && (
            <span className="bg-amber-50 text-amber-900 border border-amber-300 text-2xs font-bold uppercase px-2.5 py-1.5 rounded-none">{tx('Consult in progress')}</span>
          )}
          <span className="bg-[color:var(--t-50)] text-[color:var(--t-800)] border border-[color:var(--t-200)] text-2xs font-bold uppercase px-2.5 py-1.5 rounded-none">
            {onCallStatus ? tx('{n} doctors online', { n: onCallStatus.onlineDoctors }) : tx('Checking doctor availability')}
          </span>
        </div>
      </div>

      {/* KPI ribbon */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[color:var(--t-200)] rounded-none" aria-label={tx('Key figures')}>
        {kpis.map((k, i) => (
          <div key={k.label} className={`p-4 flex flex-col gap-1 min-w-0 ${i < kpis.length - 1 ? 'lg:border-r border-[color:var(--t-100)]' : ''} ${i % 2 === 0 ? 'border-r lg:border-r' : ''} border-[color:var(--t-100)]`}>
            <div className={eyebrow}>{k.label}</div>
            <div className="text-xl font-bold text-[color:var(--ink)] tabular-nums truncate">{k.value}</div>
            <div className="text-xs text-[color:var(--ink-2)] truncate">{k.sub}</div>
          </div>
        ))}
      </section>

      {/* 12-column grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <article className="bg-[color:var(--t-600)] text-white border border-[color:var(--t-700)] border-t-[3px] border-t-[color:var(--t-300)] p-5 flex flex-col justify-between gap-4 rounded-none">
            {next ? (
              <>
                <div>
                  <span className="inline-block bg-white/20 border border-white/30 text-2xs font-bold uppercase tracking-wider px-2 py-1">{tx('Next confirmed visit')}</span>
                  <h2 className="mt-3 mb-1 text-xl font-bold">{next.professionalName}</h2>
                  <p className="text-xs opacity-90">{next.mode} · {next.date} · {next.timeSlot}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={props.onOpenAppointments} className="bg-white text-[color:var(--t-800)] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[color:var(--t-50)] rounded-none">{tx('View appointment')}</button>
                  <button type="button" onClick={() => props.onSelectProfessional(next.professionalId)} className="border border-white/50 text-white px-3 py-2 text-xs font-bold cursor-pointer hover:bg-white/10 rounded-none">{tx('Doctor profile')}</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="inline-block bg-white/20 border border-white/30 text-2xs font-bold uppercase tracking-wider px-2 py-1">{tx('No upcoming visits')}</span>
                  <h2 className="mt-3 mb-1 text-xl font-bold">{tx('See a verified doctor today')}</h2>
                  <p className="text-xs opacity-90">{tx('Start a video consult or book a visit with an MMC-verified doctor.')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={props.onConsultNow} className="bg-white text-[color:var(--t-800)] px-3.5 py-2 text-xs font-bold cursor-pointer hover:bg-[color:var(--t-50)] rounded-none inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />{tx('Start Instant Consult')}</button>
                  <button type="button" onClick={props.onOpenTriage} className="border border-white/50 text-white px-3 py-2 text-xs font-bold cursor-pointer hover:bg-white/10 rounded-none">{tx('AI Triage')}</button>
                </div>
              </>
            )}
          </article>

          <article className={card}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={eyebrow}>{tx("Today's Medication Schedule")}</div>
                <div className="text-sm font-bold mt-0.5">{tx('{a} of {b} doses logged today', { a: takenCount, b: meds.length })}</div>
              </div>
              <Pill className="h-4 w-4 text-[color:var(--t-600)]" aria-hidden="true" />
            </div>
            {meds.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)]">{tx('No active medicines on your prescriptions.')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {meds.slice(0, 6).map(m => (
                  <label key={m.key} className={`flex items-center justify-between gap-3 border px-3 py-2.5 cursor-pointer rounded-none ${taken[m.key] ? 'bg-emerald-50 border-emerald-200' : 'bg-[color:var(--t-50)] border-[color:var(--t-100)]'}`}>
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
        </div>

        {/* Right */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <article className={card}>
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--t-100)] pb-3">
              <div>
                <div className={eyebrow}>{tx('Prescriptions')}</div>
                <h3 className="text-base font-bold mt-0.5">{tx('Active Prescriptions')} ({activePrescriptions.length})</h3>
              </div>
              <button type="button" onClick={props.onFindPharmacy} className={`${btnS} inline-flex items-center gap-1.5`}><Store className="h-3.5 w-3.5" />{tx('Find a Pharmacy')}</button>
            </div>
            {activePrescriptions.length === 0 ? (
              <p className="text-xs text-[color:var(--ink-2)]">{tx('You have no active prescriptions.')}</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activePrescriptions.slice(0, 4).map((rx: any) => (
                  <div key={rx.id} className="border border-slate-200 px-3.5 py-3 flex flex-wrap items-center justify-between gap-3 rounded-none">
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

          <article className={card}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={eyebrow}>{tx('Vitals trend')}</div>
                <h3 className="text-base font-bold mt-0.5">{tx('Blood pressure (systolic)')}</h3>
              </div>
              <button type="button" onClick={props.onOpenVitals} className={btnS}>{tx('+ Log Reading')}</button>
            </div>
            {spark ? (
              <svg viewBox="0 0 540 72" className="w-full h-[72px] bg-[color:var(--t-50)] border border-[color:var(--t-100)]" role="img" aria-label={tx('Blood pressure trend')}>
                <polyline fill="none" stroke="#0891B2" strokeWidth="2.5" points={spark} />
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
                <div key={x.l} className="border border-[color:var(--t-100)] bg-[color:var(--t-50)] py-2">
                  <div className="text-2xs font-bold uppercase text-[color:var(--ink-2)]">{x.l}</div>
                  <div className="text-sm font-bold tabular-nums">{x.v}</div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Bottom row */}
        <article className={`${card} lg:col-span-6 bg-[color:var(--t-50)]`}>
          <div className="border-b border-[color:var(--t-200)] pb-2.5 flex items-center justify-between">
            <div>
              <div className={eyebrow}>{tx('Verified care network')}</div>
              <h3 className="text-base font-bold mt-0.5">{tx('My Care Team')}</h3>
            </div>
            <button type="button" onClick={props.onOpenCareTeam} className={btnS}>{tx('View all')}</button>
          </div>
          {careTeam.length === 0 ? (
            <p className="text-xs text-[color:var(--ink-2)]">{tx('Your care team appears here after your first paid visit.')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {careTeam.slice(0, 3).map(p => (
                <div key={p.id} className="border border-[color:var(--t-100)] bg-white px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-[color:var(--t-50)] rounded-none">
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

        <article className={`${card} lg:col-span-6`}>
          <div className="border-b border-[color:var(--t-100)] pb-2.5 flex items-center justify-between">
            <div>
              <div className={eyebrow}>{tx('Health profile')}</div>
              <h3 className="text-base font-bold mt-0.5">{tx('Allergies & conditions')}</h3>
            </div>
            <button type="button" onClick={props.onOpenVitals} className={btnS}>{tx('Update')}</button>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-2xs font-bold uppercase text-[color:var(--ink-2)] mb-1.5">{tx('Allergies')}</div>
              {patientAllergies.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {patientAllergies.map(a => <span key={a} className="bg-rose-50 border border-rose-300 text-rose-900 text-2xs font-bold uppercase px-2 py-1 rounded-none">{a}</span>)}
                </div>
              ) : <span className="text-xs text-[color:var(--ink-2)]">{tx('None recorded')}</span>}
            </div>
            <div>
              <div className="text-2xs font-bold uppercase text-[color:var(--ink-2)] mb-1.5">{tx('Chronic conditions')}</div>
              {patientConditions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {patientConditions.map(c => <span key={c} className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-800)] text-2xs font-bold uppercase px-2 py-1 rounded-none">{c}</span>)}
                </div>
              ) : <span className="text-xs text-[color:var(--ink-2)]">{tx('None recorded')}</span>}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={props.onOpenMessages} className={`${btnP} inline-flex items-center gap-1.5`}><MessageSquare className="h-3.5 w-3.5" />{tx('Message a doctor')}</button>
              <button type="button" onClick={props.onOpenTriage} className={btnS}>{tx('AI Triage')}</button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
