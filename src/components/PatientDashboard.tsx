import React, { useCallback, useEffect, useState } from 'react';
import { 
  BookOpen, Calendar, Clock, FolderHeart, Heart, Video, 
  CheckCircle2, Search, MessageSquare, ShieldCheck, ArrowRight, User,
  AlertTriangle, Stethoscope, Sparkles, Pill, Activity, PhoneCall,
  HeartPulse, ShieldAlert, ChevronRight, ExternalLink, LifeBuoy,
  Send, X, Star, MapPin, Radio, AlertCircle
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, PatientProfile, UserRole } from '../types';
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
  /** Opens the Help & Support Desk */
  onOpenHelp?: () => void;
}

type Tab = 'appointments' | 'records' | 'saved';

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string | null;
  phone: string | null;
  hours: string | null;
  services: string[];
}

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  respondWithinHours?: number;
}

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
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow, onOpenArticle, onFindDoctors, onOpenTriage, onOpenPharmacies, onOpenHelp,
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [recordsSubTab, setRecordsSubTab] = useState<RecordSubTab>('overview');
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  
  // Clinical Summary & Record Data
  const [summary, setSummary] = useState<{
    activeRx: number;
    bp: any | null;
    pulse: any | null;
    glucose: any | null;
    spo2: any | null;
    temp: any | null;
  } | null>(null);
  const [recordsData, setRecordsData] = useState<any | null>(null);

  // Live Telehealth & Queue State
  const [onCallStatus, setOnCallStatus] = useState<{ onlineDoctors: number; consultFee: number; paymentsEnabled?: boolean } | null>(null);
  const [myConsults, setMyConsults] = useState<any[]>([]);

  // Pharmacies & Inline Dispatch Modal
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [dispatchingRx, setDispatchingRx] = useState<any | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
  const [shareSafetyRecord, setShareSafetyRecord] = useState<boolean>(true);
  const [dispatchBusy, setDispatchBusy] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Care Concierge Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  // Modals & Messages
  const [paying, setPaying] = useState<Booking | null>(null);
  const [reading, setReading] = useState<{ id: string; articleId: string; title: string; doctor: string; note: string | null; seen: boolean }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Load Recommended Reading
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

  // Load Primary Records Data
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

  // Load On-Call, Consults, Pharmacies, and Support Inquiries
  const loadClinicalIntegrations = useCallback(async () => {
    const [onCall, consults, pharms, support] = await Promise.all([
      fetch('/api/on-call/status').then(r => r.json()).catch(() => null),
      fetch('/api/consults/mine').then(r => r.json()).catch(() => null),
      fetch('/api/pharmacies').then(r => r.json()).catch(() => null),
      fetch('/api/support/tickets').then(r => r.json()).catch(() => null),
    ]);

    if (onCall?.status === 'success') setOnCallStatus(onCall.data);
    if (consults?.status === 'success') setMyConsults(consults.data);
    if (pharms?.status === 'success') {
      setPharmacies(pharms.data);
      if (pharms.data.length > 0 && !selectedPharmacyId) {
        setSelectedPharmacyId(pharms.data[0].id);
      }
    }
    if (support?.status === 'success') setSupportTickets(support.data);
  }, [selectedPharmacyId]);

  useEffect(() => { 
    loadSummary(); 
    loadClinicalIntegrations();
  }, [loadSummary, loadClinicalIntegrations, activeTab]);

  // Active Consult State & Auto-Polling when Queued
  const activeConsult = myConsults.find(c => ['awaiting_payment', 'queued', 'active'].includes(c.status));
  useEffect(() => {
    if (activeConsult?.status !== 'queued') return;
    const interval = setInterval(() => {
      fetch('/api/consults/mine')
        .then(r => r.json())
        .then(d => d.status === 'success' && setMyConsults(d.data))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [activeConsult?.status]);

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

  // Condition-Aware Specialist Matching Engine
  const recommendedSpecialists: (DoctorProfile | NurseProfile)[] = (() => {
    const conditionsStr = patientConditions.join(' ').toLowerCase();
    const hasHypertension = conditionsStr.includes('hyper') || conditionsStr.includes('pressure') || (summary?.bp && summary.bp.value1 >= 130);
    const hasDermatology = conditionsStr.includes('skin') || conditionsStr.includes('derm') || conditionsStr.includes('eczema') || conditionsStr.includes('rash');
    const hasPediatric = conditionsStr.includes('pediat') || conditionsStr.includes('child');
    const hasNeuro = conditionsStr.includes('neuro') || conditionsStr.includes('migraine') || conditionsStr.includes('headache');

    const matched = professionals.filter(p => {
      const spec = p.specialization.toLowerCase();
      if (hasHypertension && (spec.includes('cardio') || spec.includes('physician') || spec.includes('general'))) return true;
      if (hasDermatology && spec.includes('derm')) return true;
      if (hasPediatric && spec.includes('pediat')) return true;
      if (hasNeuro && spec.includes('neuro')) return true;
      return false;
    });

    if (matched.length > 0) return matched.slice(0, 3);
    // Fallback: top verified doctors
    return professionals.filter(p => p.role === UserRole.DOCTOR).slice(0, 3);
  })();

  const cancelBooking = async (b: Booking) => {
    if (!window.confirm('Cancel this appointment?')) return;
    const d = await fetch(`/api/bookings/${b.id}/cancel`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (d?.status === 'success') {
      setBookings(prev => prev.map(x => (x.id === b.id ? d.data : x)));
      setMsg(d.message);
    } else setMsg(d?.message || 'Could not cancel.');
  };

  const cancelActiveConsult = async (id: string) => {
    if (!window.confirm('Cancel this consultation request and receive an immediate refund?')) return;
    const d = await fetch(`/api/consults/${id}/end`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (d?.status === 'success') {
      setMsg('Consultation request cancelled. Refund processed automatically.');
      loadClinicalIntegrations();
    } else {
      setMsg(d?.message || 'Failed to cancel consultation.');
    }
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

  // Dispatch Prescription Handler
  const handleDispatchPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingRx || !selectedPharmacyId) return;
    setDispatchBusy(true);
    setDispatchResult(null);

    try {
      const resp = await fetch(`/api/prescriptions/${dispatchingRx.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacyId: selectedPharmacyId, shareSafety: shareSafetyRecord })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setDispatchResult({ ok: true, text: data.message || 'Prescription transferred to pharmacy.' });
        loadSummary();
        setTimeout(() => {
          setDispatchingRx(null);
          setDispatchResult(null);
        }, 1500);
      } else {
        setDispatchResult({ ok: false, text: data.message || 'Could not transfer prescription.' });
      }
    } catch {
      setDispatchResult({ ok: false, text: 'Server connection error.' });
    } finally {
      setDispatchBusy(false);
    }
  };

  const openTickets = supportTickets.filter(t => t.status !== 'resolved');

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any>; count?: number }[] = [
    { id: 'appointments', label: 'Medical Assistance Hub', icon: Calendar, count: upcoming.length },
    { id: 'records', label: 'Clinical Health Record', icon: FolderHeart },
    { id: 'saved', label: 'Saved Practitioners', icon: Heart, count: savedIds.length },
  ];

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-5" id="patient-dashboard-root">
      {/* 1. PERSISTENT ACTIVE CONSULTATION QUEUE RIBBON (IF LIVE) */}
      {activeConsult && (
        <aside 
          aria-label="Active consultation alert" 
          className={`border-2 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in ${
            activeConsult.status === 'active'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : activeConsult.status === 'queued'
              ? 'bg-[color:var(--t-50)] text-[color:var(--ink)] border-[color:var(--t-600)]'
              : 'bg-amber-50 text-amber-950 border-amber-400'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeConsult.status === 'active' ? 'bg-white' : 'bg-[color:var(--t-600)]'
              }`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                activeConsult.status === 'active' ? 'bg-white' : 'bg-[color:var(--t-600)]'
              }`} />
            </span>
            <div className="min-w-0">
              <p className="font-display font-black text-xs sm:text-sm leading-tight">
                {activeConsult.status === 'active' && 'LIVE VIDEO CONSULTATION IN PROGRESS'}
                {activeConsult.status === 'queued' && 'ON-CALL DOCTOR QUEUE: MATCHING PRACTITIONER'}
                {activeConsult.status === 'awaiting_payment' && 'CONSULTATION SLOT RESERVED · AWAITING PAYMENT'}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${activeConsult.status === 'active' ? 'text-emerald-100' : 'text-slate-600'}`}>
                {activeConsult.status === 'active' && 'A licensed physician is waiting in the encrypted WebRTC consultation room.'}
                {activeConsult.status === 'queued' && 'Consultation payment confirmed. Keep window open. A doctor will connect within 10 min or refund automatically.'}
                {activeConsult.status === 'awaiting_payment' && `Fee: RM ${activeConsult.fee?.toFixed(2) || '50.00'} · Complete payment to be matched with on-call doctor.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onConsultNow}
              className={`min-h-[38px] px-4 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                activeConsult.status === 'active'
                  ? 'bg-white text-emerald-900 hover:bg-emerald-50 shadow-2xs'
                  : 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white shadow-xs'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>{activeConsult.status === 'active' ? 'Enter Video Room' : 'View Live Room'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {activeConsult.status === 'queued' && (
              <button
                type="button"
                onClick={() => cancelActiveConsult(activeConsult.id)}
                className="min-h-[38px] px-3 text-xs font-bold border border-slate-300 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer bg-white"
              >
                Cancel &amp; Refund
              </button>
            )}
          </div>
        </aside>
      )}

      {/* 2. INSTITUTIONAL PATIENT HEADER */}
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
                { value: onCallStatus ? onCallStatus.onlineDoctors : '–', label: 'Doctors On-Call' },
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

      {/* 3. NOTIFICATION / STATUS DISMISSAL */}
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

      {/* 4. PATIENT SAFETY & CLINICAL IDENTIFIER STRIP */}
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

      {/* 5. MAIN WORKSPACE VIEW */}
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
                {onCallStatus ? `${onCallStatus.onlineDoctors} Doctors Available Online` : 'Instant Telehealth Available'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CARD 1: ON-CALL VIDEO DOCTOR */}
              <div className="border-2 border-[color:var(--t-600)] bg-white p-5 shadow-xs flex flex-col justify-between relative group hover:border-[color:var(--t-700)] transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
                      {onCallStatus && onCallStatus.onlineDoctors > 0 ? `${onCallStatus.onlineDoctors} Doctors On Duty` : '24/7 Active On-Call'}
                    </span>
                    <span className="text-[11px] font-mono font-extrabold text-[color:var(--t-700)]">
                      {onCallStatus ? `RM ${onCallStatus.consultFee.toFixed(0)} / consult` : '< 3 Min Wait'}
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
                      <span>{pharmacies.length > 0 ? `${pharmacies.length} Partner Pharmacies Registered` : '50+ Verified Retail Pharmacies'}</span>
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDispatchingRx(rx);
                                    if (pharmacies.length > 0) setSelectedPharmacyId(pharmacies[0].id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white px-2.5 py-1 shadow-2xs cursor-pointer transition-colors"
                                >
                                  <Send className="h-3 w-3" /> Dispatch to Pharmacy
                                </button>
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
                              onClick={() => {
                                setDispatchingRx(rx);
                                if (pharmacies.length > 0) setSelectedPharmacyId(pharmacies[0].id);
                              }}
                              className="text-[11px] font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                            >
                              Transfer or View Details &rarr;
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

          {/* CONDITION-AWARE SPECIALIST RECOMMENDATION ENGINE */}
          {recommendedSpecialists.length > 0 && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Personalized specialist care recommendations">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display font-black text-base text-[color:var(--ink)] leading-tight">
                      Specialists Recommended for Your Health Profile
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Personalized matching based on {patientConditions.length > 0 ? `active conditions: ${patientConditions.join(', ')}` : 'vitals and primary wellness'}
                    </p>
                  </div>
                </div>

                {onFindDoctors && (
                  <button
                    type="button"
                    onClick={onFindDoctors}
                    className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" /> Full Registry
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendedSpecialists.map(prof => (
                  <div
                    key={prof.id}
                    className="p-4 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all bg-white flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        <img
                          src={prof.avatar || '/assets/malaysian_male_doctor.jpg'}
                          alt={prof.name}
                          className="w-12 h-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectProfessional(prof.id)}
                            className="font-display font-extrabold text-sm text-[color:var(--ink)] hover:text-[color:var(--t-600)] transition-colors text-left truncate block w-full cursor-pointer"
                          >
                            {prof.name}
                          </button>
                          <p className="text-xs text-[color:var(--t-700)] font-bold">{prof.specialization}</p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <strong className="text-slate-800">{prof.rating ? prof.rating.toFixed(1) : '5.0'}</strong>
                            <span>({prof.reviewCount || 12} reviews)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600 mb-3 border-t border-[color:var(--t-100)] pt-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Registration:</span>
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-200">
                            MMC Verified
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span className="font-medium text-slate-800">{prof.city || 'Kuala Lumpur'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Consultation Fee:</span>
                          <span className="font-mono font-extrabold text-[color:var(--ink)]">RM {prof.fee ? prof.fee.toFixed(2) : '80.00'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProfessional(prof.id)}
                      className="w-full min-h-[38px] px-3 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-[color:var(--t-700)] text-xs font-black border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Book Consultation</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CARE CONCIERGE & SUPPORT INQUIRIES WIDGET */}
          <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Care operations and assistance support">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                  <LifeBuoy className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display font-black text-base text-[color:var(--ink)] leading-tight">
                    Care Concierge &amp; Clinical Helpdesk
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Direct access to MedCred medical operations for assistance, digital MC inquiries, and dosage advice
                  </p>
                </div>
              </div>

              {onOpenHelp && (
                <button
                  type="button"
                  onClick={onOpenHelp}
                  className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Help Center</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* TICKET STATUS / PROMPT */}
              <div className="p-4 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)]">
                {openTickets.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5">
                        <AlertCircle className="h-3 w-3 text-amber-600" /> {openTickets.length} Active Inquiry
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">SLA: Response &lt; 2h</span>
                    </div>
                    <h4 className="font-display font-black text-sm text-[color:var(--ink)] mb-1">
                      {openTickets[0].subject}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mb-3">
                      Category: {openTickets[0].category} · Status: <span className="font-bold text-[color:var(--t-700)] capitalize">{openTickets[0].status}</span>
                    </p>
                    {onOpenHelp && (
                      <button
                        type="button"
                        onClick={onOpenHelp}
                        className="min-h-[36px] px-4 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] text-xs font-bold border border-[color:var(--t-200)] transition-colors cursor-pointer"
                      >
                        View Reply Thread &rarr;
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <h4 className="font-display font-black text-sm text-[color:var(--ink)] mb-1">
                      Have a Clinical or Administrative Question?
                    </h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                      Our care desk assists with prescription transfers, Medical Certificate (MC) verification, and appointment scheduling. Safety concerns are responded to within 1 hour.
                    </p>
                    {onOpenHelp && (
                      <button
                        type="button"
                        onClick={onOpenHelp}
                        className="min-h-[36px] px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Contact Care Operations
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* QUICK CLINICAL PROTOCOLS */}
              <div className="p-4 bg-white border border-[color:var(--t-200)] space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Clinical Quality Guarantees
                </h4>
                <ul className="text-xs space-y-2 text-slate-600 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--t-600)] mt-1.5 shrink-0" />
                    <span><strong>100% Council Verified:</strong> All doctors hold active MMC APC registrations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--t-600)] mt-1.5 shrink-0" />
                    <span><strong>Automatic Telehealth Refund:</strong> 10-minute maximum wait time or fee is returned in full.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--t-600)] mt-1.5 shrink-0" />
                    <span><strong>Licensed Pharmacy Dispatch:</strong> Digital signatures cryptographically checked.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

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
                          onClick={() => cancelBooking(b)}
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

      {/* INLINE PHARMACY DISPATCH MODAL */}
      {dispatchingRx && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="dispatch-dialog-title" 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white border-2 border-[color:var(--t-600)] max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]">
                  <Pill className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="dispatch-dialog-title" className="font-display font-black text-sm text-[color:var(--ink)] leading-tight">
                    Dispatch Prescription to Pharmacy
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">RX CODE: {dispatchingRx.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDispatchingRx(null); setDispatchResult(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PRESCRIPTION DETAILS */}
            <div className="p-3 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] text-xs space-y-1">
              <p className="font-bold text-[color:var(--ink)]">
                {Array.isArray(dispatchingRx.items) && dispatchingRx.items[0]?.name ? dispatchingRx.items[0].name : dispatchingRx.diagnosis || 'Prescribed Medicine'}
              </p>
              {Array.isArray(dispatchingRx.items) && dispatchingRx.items[0]?.instructions && (
                <p className="text-slate-600 font-medium">{dispatchingRx.items[0].instructions}</p>
              )}
              <p className="text-[11px] font-mono text-slate-500 pt-0.5">
                Prescribing Doctor: {dispatchingRx.doctor?.name || 'Verified Physician'}
              </p>
            </div>

            <form onSubmit={handleDispatchPrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Partner Pharmacy for Dispensing:
                </label>
                {pharmacies.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 bg-slate-50 border border-slate-200">
                    Loading partner pharmacies…
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {pharmacies.map(p => (
                      <label
                        key={p.id}
                        className={`block p-3 border cursor-pointer transition-all ${
                          selectedPharmacyId === p.id 
                            ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)]/60' 
                            : 'border-[color:var(--t-200)] bg-white hover:border-[color:var(--t-300)]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="pharmacyChoice"
                            value={p.id}
                            checked={selectedPharmacyId === p.id}
                            onChange={() => setSelectedPharmacyId(p.id)}
                            className="mt-1 text-[color:var(--t-600)] focus:ring-[color:var(--t-600)]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-[color:var(--ink)] leading-snug">{p.name}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{p.address}, {p.city}</span>
                            </p>
                            {p.services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {p.services.map((s, idx) => (
                                  <span key={idx} className="text-[9px] font-bold uppercase bg-white border border-[color:var(--t-200)] px-1.5 py-0.2 text-slate-700">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* SAFETY SHARING CONSENT */}
              <label className="flex items-start gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={shareSafetyRecord}
                  onChange={e => setShareSafetyRecord(e.target.checked)}
                  className="mt-0.5 text-[color:var(--t-600)] focus:ring-[color:var(--t-600)]"
                />
                <span>
                  Authorize pharmacist to view documented drug allergies &amp; conditions for safety cross-checking.
                </span>
              </label>

              {dispatchResult && (
                <div className={`p-3 text-xs font-bold border ${
                  dispatchResult.ok 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {dispatchResult.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[color:var(--t-100)]">
                <button
                  type="button"
                  onClick={() => { setDispatchingRx(null); setDispatchResult(null); }}
                  className="min-h-[40px] px-4 text-xs font-bold border border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchBusy || !selectedPharmacyId}
                  className="min-h-[40px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-50 text-white text-xs font-black shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{dispatchBusy ? 'Transmitting…' : 'Confirm Dispatch to Pharmacy'}</span>
                </button>
              </div>
            </form>
          </div>
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
