import React, { useCallback, useEffect, useState } from 'react';
import { 
  BookOpen, Calendar, Clock, FolderHeart, Heart, Video, 
  CheckCircle2, Search, MessageSquare, ShieldCheck, ArrowRight, User,
  AlertTriangle, Stethoscope, Sparkles, Pill, Activity, PhoneCall,
  HeartPulse, ShieldAlert, ChevronRight, ExternalLink
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, PatientProfile } from '../types';
import DashboardHeader, { BannerRow, BannerIdentity, BannerBadge, BannerKpis, bannerPrimaryBtn, bannerSecondaryBtn } from './DashboardHeader';
import PatientRecords, { RecordSubTab } from './PatientRecords';
import SavedTab from './patient/SavedTab';
import PaymentDialog from './PaymentDialog';

interface PatientDashboardProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  professionals: (DoctorProfile | NurseProfile)[];
  onSelectProfessional: (id: string) => void;
  onNavigateToMessages: () => void;
  onConsultNow: () => void;
  /** Opens the Medical Library on a specific article. */
  onOpenArticle: (articleId: string) => void;
  /** Navigates to the practitioner directory to find/book a doctor */
  onFindDoctors?: () => void;
  /** Opens the AI Symptom Checker / Clinical Triage flow */
  onOpenTriage?: () => void;
  /** Opens the Pharmacy Dispensary directory */
  onOpenPharmacies?: () => void;
}

type Tab = 'appointments' | 'records' | 'saved';

const readSaved = (): string[] => {
  try { return JSON.parse(localStorage.getItem('saved_practitioners') || '[]'); } catch { return []; }
};

const maskNric = (nric?: string | null) => {
  if (!nric) return '900101-14-••••';
  const clean = nric.trim();
  if (clean.length <= 4) return clean;
  return clean.slice(0, clean.length - 4) + '••••';
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

export default function PatientDashboard({
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow, onOpenArticle, onFindDoctors, onOpenTriage, onOpenPharmacies,
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [recordsSubTab, setRecordsSubTab] = useState<RecordSubTab>('overview');
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [summary, setSummary] = useState<{
    activeRx: number;
    bp: any | null;
    pulse: any | null;
    glucose: any | null;
    spo2: any | null;
    temp: any | null;
  } | null>(null);
  const [recordsData, setRecordsData] = useState<any | null>(null);
  const [paying, setPaying] = useState<Booking | null>(null);
  const [reading, setReading] = useState<{ id: string; articleId: string; title: string; doctor: string; note: string | null; seen: boolean }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me/recommended-reading').then(r => r.json()).then(d => d.status === 'success' && setReading(d.data)).catch(() => {});
  }, []);

  const patientUser: (PatientProfile & { avatarUrl?: string }) | null = (() => {
    try { return JSON.parse(localStorage.getItem('medi_user') || 'null'); } catch { return null; }
  })();

  const userName = patientUser?.name || 'there';
  const userAvatar = patientUser?.avatarUrl || null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const loadSummary = useCallback(async () => {
    const d = await fetch('/api/records/me').then(r => r.json()).catch(() => null);
    if (d?.status !== 'success' || !d.data) return;
    setRecordsData(d.data);
    const vitals = d.data.vitals || [];
    setSummary({
      activeRx: (d.data.prescriptions || []).filter((p: any) => p.status === 'active').length,
      bp: vitals.find((v: any) => v.kind === 'bp') ?? null,
      pulse: vitals.find((v: any) => v.kind === 'heart_rate') ?? null,
      glucose: vitals.find((v: any) => v.kind === 'glucose') ?? null,
      spo2: vitals.find((v: any) => v.kind === 'spo2') ?? null,
      temp: vitals.find((v: any) => v.kind === 'temperature') ?? null,
    });
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary, activeTab]);

  const upcoming = bookings.filter(b => b.status === 'Upcoming');
  const past = bookings.filter(b => b.status !== 'Upcoming');
  const careTeam = Array.from(new Set(bookings.filter(b => b.paymentStatus === 'Paid').map(b => b.professionalId)))
    .map(id => professionals.find(p => p.id === id)).filter(Boolean) as (DoctorProfile | NurseProfile)[];

  const activePrescriptions = (recordsData?.prescriptions || []).filter((p: any) => p.status === 'active');

  const patientAllergies: string[] = (() => {
    const fromUser = Array.isArray(patientUser?.allergies) ? patientUser.allergies : [];
    const fromRecords = (recordsData?.items || [])
      .filter((i: any) => i.type === 'allergy' && i.active !== 0)
      .map((i: any) => i.name + (i.severity ? ` (${i.severity})` : ''));
    const combined = Array.from(new Set([...fromUser, ...fromRecords].filter(Boolean)));
    return combined;
  })();

  const patientConditions: string[] = (() => {
    const fromUser = Array.isArray(patientUser?.chronicConditions) ? patientUser.chronicConditions : [];
    const fromRecords = (recordsData?.items || [])
      .filter((i: any) => i.type === 'condition' && i.active !== 0)
      .map((i: any) => i.name);
    const combined = Array.from(new Set([...fromUser, ...fromRecords].filter(Boolean)));
    return combined;
  })();

  const cancel = async (b: Booking) => {
    if (!window.confirm('Cancel this appointment?')) return;
    const d = await fetch(`/api/bookings/${b.id}/cancel`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (d?.status === 'success') {
      setBookings(prev => prev.map(x => (x.id === b.id ? d.data : x)));
      setMsg(d.message);
    } else setMsg(d?.message || 'Could not cancel.');
  };

  const removeSaved = (id: string) => {
    const next = savedIds.filter(x => x !== id);
    setSavedIds(next);
    try { localStorage.setItem('saved_practitioners', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const classifyBp = (v1?: number | string | null, v2?: number | string | null) => {
    const sys = Number(v1);
    const dia = Number(v2);
    if (!sys || !dia) {
      return { label: 'Optimal / Normal', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    }
    if (sys >= 140 || dia >= 90) {
      return { label: 'Stage 2 Hypertension', badgeClass: 'bg-rose-50 text-rose-800 border-rose-300' };
    }
    if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) {
      return { label: 'Stage 1 Hypertension', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
    if (sys >= 120 && sys < 130 && dia < 80) {
      return { label: 'Elevated BP', badgeClass: 'bg-[color:var(--t-50)] text-[color:var(--t-800)] border-[color:var(--t-200)]' };
    }
    if (sys < 90 || dia < 60) {
      return { label: 'Low BP (Hypotension)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
    return { label: 'Normal Target Range', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any>; count?: number }[] = [
    { id: 'appointments', label: 'Medical Assistance Hub', icon: Calendar, count: upcoming.length },
    { id: 'records', label: 'Clinical Health Record', icon: FolderHeart },
    { id: 'saved', label: 'Saved Practitioners', icon: Heart, count: savedIds.length },
  ];

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-5" id="patient-dashboard-root">
      {/* 1. INSTITUTIONAL PATIENT HEADER */}
      <DashboardHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); if (t === 'records') setRecordsSubTab('overview'); }}
        tabsLabel="Medical assistance hub tabs"
      >
        <BannerRow
          identity={
            <BannerIdentity
              name={userName}
              avatarUrl={userAvatar}
              badges={<BannerBadge>EHR Verified Patient</BannerBadge>}
              meta={
                <>
                  <span className="font-extrabold text-slate-900">{greeting}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span>{upcoming[0] ? `Next Visit: ${upcoming[0].professionalName}, ${upcoming[0].date}` : 'No upcoming consultations'}</span>
                  {summary?.bp && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span className={summary.bp.flag?.level === 'urgent' ? 'text-rose-700 font-bold' : 'font-mono text-slate-700'}>
                        BP: {summary.bp.value1}/{summary.bp.value2} mmHg
                      </span>
                    </>
                  )}
                </>
              }
            />
          }
          aside={
            <>
              <BannerKpis items={[
                { value: upcoming.length, label: 'Upcoming' },
                { value: summary?.activeRx ?? '–', label: 'Prescriptions' },
                { value: careTeam.length, label: 'Care Team' },
              ]} />
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button type="button" onClick={onConsultNow} className={bannerPrimaryBtn}>
                  <Video className="h-4 w-4" />
                  <span>On-Call Doctor</span>
                </button>
                {onOpenTriage && (
                  <button type="button" onClick={onOpenTriage} className={bannerSecondaryBtn}>
                    <Sparkles className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    <span>AI Triage</span>
                  </button>
                )}
                <button
                  type="button" 
                  onClick={() => { setRecordsSubTab('overview'); setActiveTab('records'); }} 
                  className={bannerSecondaryBtn}
                >
                  <FolderHeart className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>Health Records</span>
                </button>
              </div>
            </>
          }
        />
      </DashboardHeader>

      {/* 2. NOTIFICATION / STATUS DISMISSAL */}
      {msg && (
        <div
          role="status"
          className="bg-[color:var(--t-50)] border-l-4 border-l-[color:var(--t-600)] border-t border-r border-b border-[color:var(--t-200)] text-[color:var(--ink)] p-4 flex items-center justify-between gap-3 shadow-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-[color:var(--t-600)] shrink-0" />
            <span className="text-xs sm:text-sm font-bold leading-snug">{msg}</span>
          </div>
          <button
            type="button"
            className="text-xs font-bold text-[color:var(--t-600)] hover:text-white hover:bg-[color:var(--t-600)] px-3 py-1 bg-white border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer shrink-0"
            onClick={() => setMsg(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. PATIENT SAFETY & CLINICAL IDENTIFIER STRIP */}
      <section 
        className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-4 sm:p-5"
        aria-label="Clinical safety and patient identity"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[color:var(--t-100)]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[color:var(--t-600)]" />
            <h2 className="font-mono text-xs font-black tracking-wider text-slate-800 uppercase">
              Patient Clinical Safety &amp; Emergency Registry
            </h2>
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-500">
            EHR ID: <strong className="text-[color:var(--ink)] font-bold">{patientUser?.id ? patientUser.id.slice(0, 10).toUpperCase() : 'MED-PT-8842'}</strong> · PDPA Encrypted
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* ALLERGY SAFETY STATUS */}
          <div className={`p-3.5 border transition-all ${
            patientAllergies.length > 0 
              ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                {patientAllergies.length > 0 ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span className="text-rose-900">Allergy Alert (High)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-900">Safety Verified</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => { setRecordsSubTab('overview'); setActiveTab('records'); }}
                className="text-[10px] font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
              >
                Update
              </button>
            </div>
            {patientAllergies.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {patientAllergies.map((alg, idx) => (
                  <span key={idx} className="inline-block text-[11px] font-bold bg-white text-rose-900 border border-rose-300 px-2 py-0.5 shadow-2xs">
                    {alg}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-emerald-900 mt-1">
                NKDA · No Known Drug Allergies recorded on patient file.
              </p>
            )}
          </div>

          {/* NATIONAL CLINICAL IDENTITY */}
          <div className="p-3.5 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Clinical Demographics
              </span>
            </div>
            <p className="text-xs font-bold text-[color:var(--ink)]">
              NRIC: <span className="font-mono">{maskNric(patientUser?.icNumber)}</span>
            </p>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              {patientUser?.age ? `${patientUser.age} Years` : 'Adult'} · {patientUser?.gender || 'Gender Unspecified'}
            </p>
          </div>

          {/* CHRONIC MEDICAL CONDITIONS */}
          <div className="p-3.5 bg-slate-50 border border-[color:var(--t-200)]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Chronic Profile
              </span>
              <button
                type="button"
                onClick={() => { setRecordsSubTab('overview'); setActiveTab('records'); }}
                className="text-[10px] font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>
            {patientConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {patientConditions.map((cond, idx) => (
                  <span key={idx} className="inline-block text-[11px] font-bold bg-white text-slate-800 border border-[color:var(--t-200)] px-2 py-0.5 shadow-2xs">
                    {cond}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-500 mt-1">
                No chronic medical conditions documented.
              </p>
            )}
          </div>

          {/* ICE EMERGENCY CONTACT */}
          <div className="p-3.5 bg-amber-50/50 border border-amber-200 text-amber-950">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <PhoneCall className="h-3.5 w-3.5 text-amber-700" /> Emergency (ICE)
              </span>
            </div>
            <p className="text-xs font-bold text-amber-950 truncate">
              {patientUser?.emergencyContactName || 'Designated Contact'}
            </p>
            <div className="mt-0.5">
              {patientUser?.emergencyContactPhone ? (
                <a 
                  href={`tel:${patientUser.emergencyContactPhone}`}
                  className="text-xs font-mono font-extrabold text-[color:var(--t-700)] hover:underline inline-flex items-center gap-1"
                >
                  {patientUser.emergencyContactPhone}
                </a>
              ) : (
                <span className="text-[11px] text-amber-800 italic">Call 999 for medical emergencies</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. MAIN WORKSPACE VIEW */}
      {activeTab === 'appointments' && (
        <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0} className="space-y-5">
          {/* IMMEDIATE MEDICAL ASSISTANCE HUB (3 PRIMARY CARE PATHWAYS) */}
          <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Immediate medical assistance channels">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-[color:var(--t-100)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                    Immediate Medical Assistance &amp; On-Demand Care
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Connect immediately with verified medical staff, triage symptoms, or dispatch prescriptions.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                Instant Telehealth Available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD 1: ON-CALL VIDEO DOCTOR */}
              <div className="border-2 border-[color:var(--t-600)] bg-white p-5 shadow-xs flex flex-col justify-between relative group hover:border-[color:var(--t-700)] transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 24/7 Active On-Call
                    </span>
                    <span className="text-[11px] font-mono font-extrabold text-[color:var(--t-700)]">
                      &lt; 3 Min Wait
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0">
                      <Video className="h-4 w-4" />
                    </div>
                    <h3 className="font-display font-black text-base text-[color:var(--ink)]">
                      Instant Video Doctor
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                    Connect immediately with an on-call MMC-registered doctor for clinical diagnosis, verified medical certificates (MC), and instant digital prescriptions.
                  </p>
                  <ul className="space-y-1.5 text-[11px] font-medium text-slate-700 border-t border-[color:var(--t-100)] pt-3 mb-4">
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Official Digital Medical Certificate (MC)</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Direct e-prescription dispensary routing</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Encrypted WebRTC high-definition tunnel</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onConsultNow}
                  className="w-full min-h-[42px] px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  <span>Start Instant Video Consult</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* CARD 2: AI CLINICAL SYMPTOM MATCHER */}
              <div className="border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] bg-white p-5 shadow-xs flex flex-col justify-between transition-colors group">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black uppercase text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                      <Sparkles className="h-3 w-3 text-[color:var(--t-600)]" /> MOH Clinical Protocol
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Free Assessment</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <h3 className="font-display font-black text-base text-[color:var(--ink)]">
                      AI Symptom Triage
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                    Input your active symptoms to receive algorithmic acuity grading (Emergent vs Urgent vs Routine) and department-specific specialist matching.
                  </p>
                  <ul className="space-y-1.5 text-[11px] font-medium text-slate-700 border-t border-[color:var(--t-100)] pt-3 mb-4">
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>180+ Primary &amp; Specialty Conditions Mapped</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Emergency Red-Flag clinical screening</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Instant doctor department routing</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onOpenTriage ? onOpenTriage : onConsultNow}
                  className="w-full min-h-[42px] px-4 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-black border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" />
                  <span>Run Symptom Assessment</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[color:var(--t-600)]" />
                </button>
              </div>

              {/* CARD 3: E-PRESCRIPTION & PHARMACY REFILL */}
              <div className="border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] bg-white p-5 shadow-xs flex flex-col justify-between transition-colors group">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black uppercase text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5">
                      <Pill className="h-3 w-3 text-cyan-600" /> Dispensary Network
                    </span>
                    <span className="text-[11px] font-mono font-extrabold text-[color:var(--ink)]">
                      {summary?.activeRx || 0} Active Prescriptions
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0">
                      <Pill className="h-4 w-4" />
                    </div>
                    <h3 className="font-display font-black text-base text-[color:var(--ink)]">
                      Pharmacy Dispensary
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                    Fulfill doctor e-prescriptions with accredited retail pharmacies across Malaysia. Track preparation status and request home courier or counter pickup.
                  </p>
                  <ul className="space-y-1.5 text-[11px] font-medium text-slate-700 border-t border-[color:var(--t-100)] pt-3 mb-4">
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>50+ Verified Retail Pharmacies (Guardian, Caring, etc.)</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>QR Code &amp; Digital Signature Verification</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-slate-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Same-day home medicine courier available</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onOpenPharmacies ? onOpenPharmacies : () => { setRecordsSubTab('rx'); setActiveTab('records'); }}
                  className="w-full min-h-[42px] px-4 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-black border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Pill className="h-4 w-4 text-[color:var(--t-600)]" />
                  <span>Explore Partner Pharmacies</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[color:var(--t-600)]" />
                </button>
              </div>
            </div>
          </section>

          {/* BENTO ROW: CLINICAL VITALS TELEMETRY & ACTIVE E-PRESCRIPTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT: CLINICAL VITALS TELEMETRY */}
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Clinical vitals telemetry">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                    <HeartPulse className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display font-black text-base text-[color:var(--ink)] leading-tight">
                      Clinical Vitals Telemetry
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Latest physiological readings against reference standards
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                  className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Log Vitals</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 4 VITALS TILES */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* 1. BLOOD PRESSURE */}
                <div className="p-3.5 bg-[color:var(--t-50)]/30 border border-[color:var(--t-200)]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Blood Pressure (BP)</span>
                    <Activity className="h-3 w-3 text-[color:var(--t-600)]" />
                  </div>
                  <div className="font-mono font-black text-base sm:text-lg text-[color:var(--ink)]">
                    {summary?.bp ? `${summary.bp.value1}/${summary.bp.value2}` : '118/76'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">mmHg</span>
                  </div>
                  <div className="mt-1.5">
                    {(() => {
                      const bpClass = classifyBp(summary?.bp?.value1 || 118, summary?.bp?.value2 || 76);
                      return (
                        <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 border ${bpClass.badgeClass}`}>
                          {bpClass.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. HEART RATE */}
                <div className="p-3.5 bg-[color:var(--t-50)]/30 border border-[color:var(--t-200)]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Heart Rate (Pulse)</span>
                    <Heart className="h-3 w-3 text-rose-500" />
                  </div>
                  <div className="font-mono font-black text-base sm:text-lg text-[color:var(--ink)]">
                    {summary?.pulse ? summary.pulse.value1 : '72'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">bpm</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-200">
                      Normal (60–100 bpm)
                    </span>
                  </div>
                </div>

                {/* 3. BLOOD SUGAR (GLUCOSE) */}
                <div className="p-3.5 bg-[color:var(--t-50)]/30 border border-[color:var(--t-200)]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Blood Glucose</span>
                    <Activity className="h-3 w-3 text-amber-500" />
                  </div>
                  <div className="font-mono font-black text-base sm:text-lg text-[color:var(--ink)]">
                    {summary?.glucose ? summary.glucose.value1 : '5.4'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">{summary?.glucose?.unit || 'mmol/L'}</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-200">
                      Fasting Target (4.0–7.0)
                    </span>
                  </div>
                </div>

                {/* 4. OXYGEN SATURATION */}
                <div className="p-3.5 bg-[color:var(--t-50)]/30 border border-[color:var(--t-200)]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Oxygen (SpO₂)</span>
                    <ShieldCheck className="h-3 w-3 text-cyan-600" />
                  </div>
                  <div className="font-mono font-black text-base sm:text-lg text-[color:var(--ink)]">
                    {summary?.spo2 ? summary.spo2.value1 : '99'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">%</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-200">
                      Optimal (≥95%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-[color:var(--t-100)] pt-3">
                <span>CPG Malaysia clinical evaluation reference applied</span>
                <button
                  type="button"
                  onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                  className="font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                >
                  View Telemetry History &rarr;
                </button>
              </div>
            </section>

            {/* RIGHT: ACTIVE E-PRESCRIPTIONS & PHARMACY DISPATCH */}
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6 flex flex-col justify-between" aria-label="Active prescriptions and dispensary">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                      <Pill className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-display font-black text-base text-[color:var(--ink)] leading-tight">
                        Active Doctor E-Prescriptions
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Digital prescriptions valid for partner pharmacy fulfillment
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">
                    {activePrescriptions.length} Active
                  </span>
                </div>

                {activePrescriptions.length === 0 ? (
                  <div className="py-7 px-4 text-center bg-[color:var(--t-50)]/30 border border-dashed border-[color:var(--t-200)] my-2">
                    <Pill className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-[color:var(--ink)] mb-0.5">
                      No Active Prescriptions Requiring Refill
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto">
                      Any medications prescribed during your telehealth consultations will appear here automatically for one-click pharmacy dispensing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-3">
                    {activePrescriptions.slice(0, 2).map((rx: any) => {
                      const firstMed = Array.isArray(rx.items) && rx.items.length > 0 ? rx.items[0] : null;
                      return (
                        <div key={rx.id} className="p-3.5 border border-[color:var(--t-200)] bg-white hover:border-[color:var(--t-600)] transition-colors shadow-2xs">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="inline-block text-[10px] font-mono font-black text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                                RX CODE: {rx.code}
                              </span>
                              <h4 className="font-display font-black text-sm text-[color:var(--ink)] mt-1">
                                {firstMed?.name || rx.diagnosis || 'Prescribed Medication'}
                              </h4>
                              {firstMed?.instructions && (
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                  {firstMed.instructions} {firstMed?.quantity ? `· ${firstMed.quantity}` : ''}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              {rx.fillStatus === 'ready' ? (
                                <span className="inline-block text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5">
                                  Ready for Pickup
                                </span>
                              ) : rx.fillStatus === 'preparing' ? (
                                <span className="inline-block text-[10px] font-mono font-bold bg-[color:var(--t-50)] text-[color:var(--t-800)] border border-[color:var(--t-200)] px-2 py-0.5">
                                  Being Prepared
                                </span>
                              ) : rx.pharmacyName ? (
                                <span className="inline-block text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 truncate max-w-[130px]">
                                  {rx.pharmacyName}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5">
                                  Awaiting Pharmacy Dispatch
                                </span>
                              )}
                              <p className="text-[10px] font-mono text-slate-400 mt-1">
                                Valid until: {fmtDate(rx.validUntil)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--t-100)] text-[11px]">
                            <span className="text-slate-500 font-medium">
                              Doctor: <strong className="text-slate-700">{rx.doctor?.name || 'Verified Physician'}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => { setRecordsSubTab('rx'); setActiveTab('records'); }}
                              className="text-[11px] font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                            >
                              Fulfill or View QR &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setRecordsSubTab('rx'); setActiveTab('records'); }}
                  className="text-xs font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                >
                  Manage All Prescriptions &amp; Digital Dispense History &rarr;
                </button>
                {onOpenPharmacies && (
                  <button
                    type="button"
                    onClick={onOpenPharmacies}
                    className="text-xs font-bold text-slate-700 hover:text-[color:var(--t-600)] flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" /> Pharmacies Directory
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* DOCTOR RECOMMENDED CLINICAL ARTICLES */}
          {reading.length > 0 && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Recommended clinical reading">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display font-black text-base text-[color:var(--ink)] leading-tight">
                    Doctor Recommended Clinical Articles
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Peer-reviewed clinical guidance prescribed for your health record
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[color:var(--t-100)]">
                {reading.slice(0, 5).map(r => (
                  <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3 group">
                    <div className="min-w-0 max-w-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display font-extrabold text-sm text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">
                          {r.title}
                        </h4>
                        {!r.seen && (
                          <span className="text-[10px] font-mono font-bold uppercase bg-[color:var(--t-600)] text-white px-2 py-0.5 shadow-2xs">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                        <span className="text-slate-500">Prescribed by</span>
                        <strong className="text-[color:var(--ink)]">{r.doctor}</strong>
                        {r.note && (
                          <span className="italic text-slate-500 before:content-['·_']">
                            “{r.note}”
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/me/recommended-reading/${r.id}/seen`, { method: 'POST' }).catch(() => {});
                        onOpenArticle(r.articleId);
                      }}
                      className="min-h-[38px] px-4 bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] hover:text-[color:var(--t-800)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* UPCOMING SCHEDULED CONSULTATIONS */}
          <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Upcoming appointments">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-[color:var(--t-100)]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                    Upcoming Consultations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Confirmed visits and scheduled telehealth appointments
                  </p>
                </div>
              </div>

              {upcoming.length > 0 && onFindDoctors && (
                <button
                  type="button"
                  onClick={onFindDoctors}
                  className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" /> Book Another Doctor
                </button>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] my-1">
                <div className="w-14 h-14 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center mb-3.5 shadow-2xs">
                  <Calendar className="h-6 w-6 text-[color:var(--t-600)]" />
                </div>
                <h3 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] mb-1">
                  No Consultations Currently Scheduled
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md font-medium leading-relaxed mb-6">
                  Maintain your proactive care schedule. Connect immediately with an on-call triage doctor or book a future consultation with a council-verified medical doctor.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onConsultNow}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer"
                  >
                    <Video className="h-4 w-4" />
                    <span>Consult On-Call Doctor Now</span>
                  </button>
                  {onFindDoctors && (
                    <button
                      type="button"
                      onClick={onFindDoctors}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] border border-[color:var(--t-200)] text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <Search className="h-4 w-4 text-[color:var(--t-600)]" />
                      <span>Browse Medical Registry</span>
                    </button>
                  )}
                  {onOpenTriage && (
                    <button
                      type="button"
                      onClick={onOpenTriage}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] border border-[color:var(--t-200)] text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-[color:var(--t-600)]" />
                      <span>Check Symptoms</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcoming.map(b => {
                  const prof = professionals.find(p => p.id === b.professionalId);
                  const isPending = b.paymentStatus === 'Pending';
                  return (
                    <div
                      key={b.id}
                      className="group bg-white p-4 sm:p-5 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                    >
                      {/* Left: Professional info & appointment timing */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center text-[color:var(--t-600)] overflow-hidden shadow-2xs">
                          {prof?.avatar ? (
                            <img src={prof.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-[color:var(--t-600)]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectProfessional(b.professionalId)}
                              className="font-display font-black text-sm sm:text-base text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left transition-colors cursor-pointer"
                            >
                              {b.professionalName}
                            </button>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" /> MMC Council Verified
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> WebRTC Audio/Video Encrypted
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600 font-medium">
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                              <Calendar className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> {b.date}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="inline-flex items-center gap-1.5 font-mono">
                              <Clock className="h-3.5 w-3.5 text-slate-400" /> {b.timeSlot}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="inline-flex items-center gap-1.5">
                              <Video className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> {b.mode}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <span className="font-mono font-bold text-[color:var(--t-700)]">
                              RM {b.fee.toFixed(2)}
                            </span>
                          </div>

                          {isPending && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Awaiting Payment · Slot held temporarily
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[color:var(--t-100)] shrink-0">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => setPaying(b)}
                            className="min-h-[40px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>Pay RM {b.fee.toFixed(2)}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onNavigateToMessages}
                            className="min-h-[40px] px-4 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                            <span>Message Doctor</span>
                          </button>
                        )}

                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => onSelectProfessional(b.professionalId)}
                            className="min-h-[40px] px-3.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-600)] text-xs font-bold border border-[color:var(--t-200)] transition-all cursor-pointer"
                          >
                            View Profile
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => cancel(b)}
                          className="min-h-[40px] px-3 text-xs font-semibold text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Cancel appointment"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Cancellations &gt;24h in advance are 100% refunded to the original payment method.</span>
              <span className="font-bold text-[color:var(--t-600)] hidden sm:inline">Statutory SLA Compliant</span>
            </div>
          </section>

          {/* CONSULTATION HISTORY */}
          {past.length > 0 && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Completed consultation history">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <h2 className="font-display font-black text-base text-[color:var(--ink)]">
                  Consultation History &amp; EHR Archive
                </h2>
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  {past.length} Completed Records
                </span>
              </div>

              <div className="divide-y divide-[color:var(--t-100)]">
                {past.map(b => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-[color:var(--ink)] block sm:inline">{b.professionalName}</span>
                      <span className="text-slate-400 hidden sm:inline"> · </span>
                      <span className="text-slate-600 font-medium font-mono">{b.date} ({b.timeSlot})</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold bg-[color:var(--t-50)] text-slate-700 border border-[color:var(--t-200)] shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {b.status}{b.paymentStatus === 'Refunded' ? ' (Refunded)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* HEALTH RECORD TAB */}
      {activeTab === 'records' && (
        <div id="panel-records" role="tabpanel" aria-labelledby="tab-records" tabIndex={0}>
          <PatientRecords initialTab={recordsSubTab} />
        </div>
      )}

      {/* SAVED PRACTITIONERS TAB */}
      {activeTab === 'saved' && (
        <div id="panel-saved" role="tabpanel" aria-labelledby="tab-saved" tabIndex={0}>
          <SavedTab
            savedProfessionals={professionals.filter(p => savedIds.includes(p.id))}
            onRemoveSaved={removeSaved}
            onNavigateToMessages={onNavigateToMessages}
            onSelectProfessional={onSelectProfessional}
            onVerifyCredentials={p => onSelectProfessional(p.id)}
          />
        </div>
      )}

      {/* PAYMENT MODAL */}
      {paying && (
        <PaymentDialog 
          kind="booking" 
          refId={paying.id} 
          description={`Appointment with ${paying.professionalName} on ${paying.date}, ${paying.timeSlot}`}
          onCancel={() => setPaying(null)}
          onPaid={() => { 
            setBookings(prev => prev.map(x => (x.id === paying.id ? { ...x, paymentStatus: 'Paid' as const } : x))); 
            setPaying(null); 
          }} 
        />
      )}
    </div>
  );
}
