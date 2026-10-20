import React, { useCallback, useEffect, useState } from 'react';
import { maskNric } from '../identity';
import { 
  BookOpen, Calendar, Clock, FolderHeart, Heart, Video, 
  CheckCircle2, Search, MessageSquare, ShieldCheck, ArrowRight, User,
  AlertTriangle, Stethoscope, Sparkles, Pill, Activity, PhoneCall,
  HeartPulse, ShieldAlert, ChevronRight, ExternalLink, LifeBuoy,
  Send, X, Star, MapPin, Radio, AlertCircle, FileText, PackagePlus,
  HeartHandshake, Plane, Store, UserCheck, Tag, FlaskConical, ClipboardList, Share2
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, PatientProfile, UserRole, Article, ConsultationMode } from '../types';
import { INITIAL_ARTICLES } from '../data';
import DashboardHeader, { BannerRow, BannerIdentity, BannerBadge, BannerKpis, FilterSelect, bannerOnBrandPrimaryBtn, bannerOnBrandSecondaryBtn } from './DashboardHeader';
import PatientRecords, { RecordSubTab } from './PatientRecords';
import SavedTab from './patient/SavedTab';
import PaymentDialog from './PaymentDialog';
import { formatMoney, formatDate } from '../locale';
import ConsultNow from './ConsultNow';
import SecureMessenger from './SecureMessenger';
import MedicalPackagesModule from './MedicalPackagesModule';
import MedicalAssistanceModule from './MedicalAssistanceModule';
import MedicalTourism from './MedicalTourism';
import PharmacyFinder from './PharmacyFinder';
import MedicalLibrary from './MedicalLibrary';
import AISymptomMatcher from './AISymptomMatcher';
import PatientHeroBanner from './PatientHeroBanner';
import { useOnCallStatus, onCallLabel } from '../useOnCallStatus';
import { useSavedProviders } from '../savedProviders';
import { UserAvatar } from '../avatars';
import WorkspaceHeader from './WorkspaceHeader';

export type PatientDashboardTab = 
  | 'appointments' 
  | 'consult' 
  | 'messages' 
  | 'saved' 
  | 'records' 
  | 'prescriptions' 
  | 'certs' 
  | 'labs'
  | 'packages' 
  | 'assistance' 
  | 'tourism' 
  | 'registry' 
  | 'nurses'
  | 'pharmacies' 
  | 'articles';

export type PatientTabGroup = 'care' | 'records' | 'services' | 'discovery';

export const PATIENT_GROUPS: Record<PatientTabGroup, {
  name: string;
  defaultTab: PatientDashboardTab;
  tabs: { id: PatientDashboardTab; label: string; icon: any; count?: number }[];
}> = {
  care: {
    name: 'My Care & Consultations',
    defaultTab: 'appointments',
    tabs: [
      { id: 'appointments', label: 'Appointments & Visits', icon: Calendar },
      { id: 'consult', label: 'Consult Now', icon: Video },
      { id: 'messages', label: 'Care Mailbox', icon: MessageSquare },
      { id: 'saved', label: 'Care Team', icon: Heart },
    ],
  },
  records: {
    name: 'Health Records & Prescriptions',
    defaultTab: 'records',
    tabs: [
      { id: 'records', label: 'Clinical Profile & Vitals', icon: FolderHeart },
      { id: 'prescriptions', label: 'Prescriptions & Meds', icon: Pill },
      { id: 'certs', label: 'Certificates & Referrals', icon: FileText },
      { id: 'labs', label: 'Labs & Doctor Notes', icon: FlaskConical },
    ],
  },
  services: {
    name: 'Packages & Assistance',
    defaultTab: 'packages',
    tabs: [
      { id: 'packages', label: 'Medical Packages', icon: PackagePlus },
      { id: 'assistance', label: 'Assistance & Quotes', icon: HeartHandshake },
      { id: 'tourism', label: 'Global Patient Care', icon: Plane },
    ],
  },
  discovery: {
    name: 'Medical Network & Library',
    defaultTab: 'registry',
    tabs: [
      { id: 'registry', label: 'Doctors & Specialists', icon: Search },
      { id: 'nurses', label: 'Clinical Nurses', icon: UserCheck },
      { id: 'pharmacies', label: 'Pharmacies', icon: Store },
      { id: 'articles', label: 'Medical Library', icon: BookOpen },
    ],
  },
};

export interface PatientDashboardProps {
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
  activeGroup?: PatientTabGroup;
  initialTab?: PatientDashboardTab;
  currentUser?: any;
  articles?: Article[];
  selectedSpecialtyFilter?: string;
  onSelectSpecialtyFilter?: (spec: string) => void;
  onClearSpecialtyFilter?: () => void;
}

type Tab = PatientDashboardTab;

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


const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

export default function PatientDashboard({
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow, onOpenArticle, onFindDoctors, onOpenTriage, onOpenPharmacies, onOpenHelp, activeGroup, initialTab, currentUser, articles,
  selectedSpecialtyFilter, onSelectSpecialtyFilter, onClearSpecialtyFilter,
}: PatientDashboardProps) {
  const currentGroup: PatientTabGroup = activeGroup || (
    initialTab ? (
      (['records', 'prescriptions', 'certs', 'labs'].includes(initialTab)) ? 'records' :
      (['packages', 'assistance', 'tourism'].includes(initialTab)) ? 'services' :
      (['registry', 'nurses', 'pharmacies', 'articles'].includes(initialTab)) ? 'discovery' : 'care'
    ) : 'care'
  );

  const [activeTab, setActiveTab] = useState<PatientDashboardTab>(
    initialTab || PATIENT_GROUPS[currentGroup].defaultTab
  );

  useEffect(() => {
    if (activeGroup) {
      const allowed = PATIENT_GROUPS[activeGroup].tabs.map(t => t.id);
      if (initialTab && allowed.includes(initialTab)) {
        // The app asked for a specific tab in this group (for example "Message" on a doctor's card): go there
        setActiveTab(initialTab);
      } else if (!allowed.includes(activeTab)) {
        setActiveTab(PATIENT_GROUPS[activeGroup].defaultTab);
      }
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [activeGroup, initialTab]);

  // Inner Workspace Subtabs State
  const [appointmentsSubTab, setAppointmentsSubTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [recordsSubTab, setRecordsSubTab] = useState<RecordSubTab>('overview');
  const [rxSubTab, setRxSubTab] = useState<'active' | 'history'>('active');
  const [certsSubTab, setCertsSubTab] = useState<'mc' | 'referrals'>('mc');
  const [labsSubTab, setLabsSubTab] = useState<'labs' | 'notes'>('labs');
  const [consultSubTab, setConsultSubTab] = useState<'instant' | 'triage'>('instant');
  const onCall = useOnCallStatus();
  const [savedSubTab, setSavedSubTab] = useState<'all' | 'doctors' | 'nurses'>('all');
  const [registrySubTab, setRegistrySubTab] = useState<'all' | 'telehealth' | 'specialists'>('all');
  const [registryQuery, setRegistryQuery] = useState('');
  const [registrySpecialty, setRegistrySpecialty] = useState('all');
  const [registryCity, setRegistryCity] = useState('all');
  const [registrySort, setRegistrySort] = useState<'rating' | 'experience' | 'fee_asc' | 'fee_desc'>('rating');

  const [nursesSubTab, setNursesSubTab] = useState<'all' | 'homecare' | 'clinic'>('all');
  const [nursesQuery, setNursesQuery] = useState('');
  const [nursesSpecialty, setNursesSpecialty] = useState('all');
  const [nursesCity, setNursesCity] = useState('all');
  const [nursesSort, setNursesSort] = useState<'rating' | 'experience' | 'fee_asc' | 'fee_desc'>('rating');
  const [pharmaciesSubTab, setPharmaciesSubTab] = useState<'all' | 'delivery' | 'open24'>('all');
  const [packagesSubTab, setPackagesSubTab] = useState<'packages' | 'promotions' | 'facilities'>('packages');
  const [assistanceSubTab, setAssistanceSubTab] = useState<'enquiry' | 'cases' | 'guide' | 'track'>('enquiry');
  const [tourismSubTab, setTourismSubTab] = useState<'find' | 'cases' | 'info'>('find');
  // Saved on the account (with a local copy), so they follow the patient to any device
  const savedStore = useSavedProviders({ id: currentUser?.id, role: currentUser?.role });
  const savedIds = savedStore.ids;
  
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

  const userName = currentUser?.name || patientUser?.name || 'there';
  const userAvatar = currentUser?.avatarUrl || patientUser?.avatarUrl || '/assets/patient_female_malay.jpg';
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

  const removeSaved = (id: string) => { void savedStore.remove(id); };
  const restoreSaved = (id: string) => { void savedStore.add(id); };

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

  const patientHelpTab = (
    <div className="flex items-center h-full">
      <span className="w-px h-5 bg-[color:var(--t-200)] mr-2 self-center hidden sm:inline-block" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        id="tab-patient-help"
        onClick={() => {
          if (onOpenHelp) onOpenHelp();
          else window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }));
        }}
        className="shrink-0 min-h-[48px] px-3.5 sm:px-4 text-xs flex items-center gap-2 cursor-pointer border-b border-transparent transition-colors font-medium text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]"
        title="Patient Help & Concierge Support Desk"
      >
        <LifeBuoy className="h-4 w-4 text-slate-500" />
        <span className="whitespace-nowrap font-medium sm:font-semibold">Help & Support</span>
        {openTickets.length > 0 && (
          <span className="tabular-nums text-2xs min-w-[18px] text-center px-1.5 py-0.5 rounded-full font-semibold bg-[color:var(--t-600)] text-white leading-none">
            {openTickets.length}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-0" id="patient-dashboard-root">
      {/* 2. INSTITUTIONAL PATIENT HEADER (HERO BANNER FULL WIDTH AS MAIN HEADER) */}
      <PatientHeroBanner
        userName={userName}
        userAvatar={userAvatar}
        greeting={greeting}
        groupName={PATIENT_GROUPS[currentGroup].name}
        upcomingCount={upcoming.length}
        nextVisitText={upcoming[0] ? `Next Visit: ${upcoming[0].professionalName}, ${upcoming[0].date}` : 'No upcoming consultations'}
        activeRxCount={summary?.activeRx ?? '–'}
        careTeamCount={careTeam.length}
        bpSummary={summary?.bp}
        tabs={PATIENT_GROUPS[currentGroup].tabs.map(t => {
          if (t.id === 'appointments') return { ...t, count: upcoming.length };
          if (t.id === 'prescriptions') return { ...t, count: activePrescriptions.length || undefined };
          if (t.id === 'saved') return { ...t, count: savedIds.length };
          return t;
        })}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          if (t === 'records') setRecordsSubTab('overview');
          if (t === 'prescriptions') setRxSubTab('active');
          if (t === 'certs') setCertsSubTab('mc');
          if (t === 'labs') setLabsSubTab('labs');
          if (t === 'consult') setConsultSubTab('instant');
        }}
        tabsLabel={`${PATIENT_GROUPS[currentGroup].name} sections`}
        onOpenHelp={onOpenHelp}
        openTicketsCount={openTickets.length}
        onConsultNow={onConsultNow}
        onOpenTriage={() => {
          setActiveTab('consult');
          setConsultSubTab('triage');
        }}
        onOpenRecords={() => { setActiveTab('records'); setRecordsSubTab('overview'); }}
      />

      {/* 3. MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* NOTIFICATION / STATUS DISMISSAL */}
      {msg && (
        <div
          role="status"
          className="bg-[color:var(--t-50)] border-l-4 border-l-[color:var(--t-600)] border-t border-r border-b border-[color:var(--t-200)] text-[color:var(--ink)] p-4 flex items-center justify-between gap-3 shadow-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-[color:var(--t-600)] shrink-0" />
            <span className="text-xs font-bold leading-snug">{msg}</span>
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

      {/* 4. MAIN WORKSPACE VIEW */}
      {activeTab === 'appointments' && (
        <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0} className="space-y-5">
          {/* INNER WORKSPACE HEADER TITLE SECTION */}
          <WorkspaceHeader
            icon={Calendar}
            eyebrow="My Care · Clinical Encounters"
            title="Appointments & Consultation Visits"
            description="Manage your upcoming confirmed visits, instant video consult rooms, and clinical consultation history archive."
            badges={<BannerBadge tone="brand">MOH Protocol</BannerBadge>}
            aside={
              <div className="flex flex-wrap items-center gap-2">
                {onFindDoctors && (
                  <button
                    type="button"
                    onClick={onFindDoctors}
                    className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Schedule Doctor Visit</span>
                  </button>
                )}
              </div>
            }
            tabs={[
              { id: 'all', label: 'All Encounters', count: bookings.length },
              { id: 'upcoming', label: 'Upcoming Visits', count: upcoming.length },
              { id: 'past', label: 'Consultation Archive', count: past.length },
            ]}
            activeTab={appointmentsSubTab}
            onTabChange={setAppointmentsSubTab}
          />

          {/* LIVE ON-CALL CONSULTATION BANNER (Rendered if patient has an active/queued instant consult) */}
          {activeConsult && (
            <section
              aria-label="Active live consultation status"
              className="bg-emerald-50/90 border-l-4 border-l-emerald-600 border-t border-r border-b border-emerald-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Radio className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-mono font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-600 text-white">
                      {activeConsult.status === 'active'
                        ? 'Live Room Open'
                        : activeConsult.status === 'queued'
                        ? 'In Triage Queue'
                        : 'Awaiting Payment'}
                    </span>
                    <h3 className="font-display font-black text-sm sm:text-base text-emerald-950">
                      {activeConsult.status === 'active'
                        ? 'Your On-Call Doctor has joined the Video Room'
                        : 'Instant Telehealth Consultation in Progress'}
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-900 font-medium mt-1">
                    {activeConsult.symptoms
                      ? `Chief complaint: “${activeConsult.symptoms}”`
                      : 'Encrypted WebRTC audio/video consultation room ready.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('consult');
                    setConsultSubTab('instant');
                  }}
                  className="min-h-[38px] px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Enter Consultation Room</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => cancelActiveConsult(activeConsult.id)}
                  className="min-h-[38px] px-3 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel Request
                </button>
              </div>
            </section>
          )}

          {/* TIER 1: UPCOMING SCHEDULED CONSULTATIONS (Shown in 'all' and 'upcoming' sub-tabs) */}
          {(appointmentsSubTab === 'all' || appointmentsSubTab === 'upcoming') && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Upcoming appointments">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3.5 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                        Upcoming Consultations
                      </h2>
                      <span className="text-2xs font-mono font-extrabold bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] px-2 py-0.5">
                        {upcoming.length} Scheduled
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Confirmed visits, video consult rooms, and scheduled clinic appointments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {past.length > 0 && appointmentsSubTab === 'upcoming' && (
                    <button
                      type="button"
                      onClick={() => setAppointmentsSubTab('past')}
                      className="text-xs font-bold text-slate-600 hover:text-[color:var(--t-600)] cursor-pointer"
                    >
                      View Archive ({past.length})
                    </button>
                  )}
                  {onFindDoctors && (
                    <button
                      type="button"
                      onClick={onFindDoctors}
                      className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Search className="h-3.5 w-3.5" /> Book Another Doctor
                    </button>
                  )}
                </div>
              </div>

              {upcoming.length === 0 ? (
                <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center bg-[color:var(--t-50)]/40 border border-dashed border-[color:var(--t-200)] my-1">
                  <div className="w-14 h-14 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center mb-3.5 shadow-2xs">
                    <Calendar className="h-6 w-6 text-[color:var(--t-600)]" />
                  </div>
                  <h3 className="font-display font-black text-sm text-[color:var(--ink)] mb-1">
                    No Consultations Currently Scheduled
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md font-medium leading-relaxed mb-6">
                    Maintain your proactive care schedule. Connect immediately with an on-call triage doctor or book a future consultation with a council-verified practitioner.
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
                        onClick={() => { setActiveTab('consult'); setConsultSubTab('triage'); }}
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
                    const isNurse = prof?.role === UserRole.NURSE || (prof as any)?.category === 'Nurse';
                    const modeLower = (b.mode || '').toLowerCase();
                    const isVideo = modeLower.includes('video') || modeLower.includes('tele') || modeLower.includes('online');
                    const isHomeVisit = modeLower.includes('home');

                    return (
                      <div
                        key={b.id}
                        className="group bg-white p-4 sm:p-5 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs"
                      >
                        {/* Left: Professional info & appointment timing */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-13 h-13 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-center text-[color:var(--t-600)] overflow-hidden shadow-2xs">
                            <UserAvatar
                              src={prof?.avatar}
                              role={prof?.role || 'doctor'}
                              alt={b.professionalName}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectProfessional(b.professionalId)}
                                className="font-display font-black text-xs sm:text-base text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left transition-colors cursor-pointer"
                              >
                                {b.professionalName}
                              </button>
                              <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                {isNurse ? 'LJM Board Verified' : 'MMC Council Verified'}
                              </span>
                              {isVideo ? (
                                <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> WebRTC Audio/Video Encrypted
                                </span>
                              ) : isHomeVisit ? (
                                <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5">
                                  <MapPin className="h-3 w-3 text-cyan-600" /> Home Care Visit
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5">
                                  <MapPin className="h-3 w-3 text-slate-600" /> In-Clinic Consultation
                                </span>
                              )}
                            </div>

                            {/* Specialty & Location Subtitle */}
                            <p className="text-xs font-bold text-[color:var(--t-700)] mt-0.5">
                              {prof?.specialization || 'General Practice & Primary Care'}
                              {prof?.city ? <span className="text-slate-500 font-medium"> · {prof.city}</span> : null}
                            </p>

                            {/* Date / Time / Mode / Fee Strip */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-600 font-medium">
                              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                                <Calendar className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> {b.date}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="inline-flex items-center gap-1.5 font-mono">
                                <Clock className="h-3.5 w-3.5 text-slate-400" /> {b.timeSlot}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="inline-flex items-center gap-1.5">
                                {isVideo ? (
                                  <Video className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                                ) : (
                                  <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                                )}
                                {b.mode}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="font-mono font-bold text-[color:var(--t-700)]">
                                {formatMoney(b.fee)}
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-2xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  Awaiting Payment
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Confirmed &amp; Paid
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-[color:var(--t-100)] shrink-0">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => setPaying(b)}
                              className="min-h-[40px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <span>Pay {formatMoney(b.fee)}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <>
                              {isVideo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('consult');
                                    setConsultSubTab('instant');
                                  }}
                                  className="min-h-[40px] px-4 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  <span>Join Video Room</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={onNavigateToMessages}
                                className="min-h-[40px] px-3.5 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                                <span>Message</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectProfessional(b.professionalId)}
                                className="min-h-[40px] px-3.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] text-xs font-bold border border-[color:var(--t-200)] transition-all cursor-pointer"
                              >
                                Doctor Profile
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => cancelBooking(b)}
                            className="min-h-[40px] px-3 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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

              <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Cancellations &gt;24h in advance are 100% refunded to the original payment method.</span>
                <span className="font-bold text-[color:var(--t-600)] hidden sm:inline">Statutory SLA Compliant</span>
              </div>
            </section>
          )}

          {/* TIER 2: COMPACT IMMEDIATE MEDICAL ASSISTANCE ACTION BAR (Shown in 'all' and 'upcoming') */}
          {(appointmentsSubTab === 'all' || appointmentsSubTab === 'upcoming') && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-3.5 sm:p-4" aria-label="Immediate medical assistance channels">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                    Immediate Medical Assistance
                  </h2>
                  <span className="hidden sm:inline text-xs text-slate-400">&bull;</span>
                  <span className="hidden sm:inline text-xs text-slate-500 font-medium">On-demand video doctor, clinical AI triage &amp; dispensary routing</span>
                </div>
                <span className="text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                  {onCallStatus && onCallStatus.onlineDoctors > 0 ? `${onCallStatus.onlineDoctors} Doctors Online` : '24/7 Care Triage'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* CARD 1: ON-CALL VIDEO DOCTOR */}
                <div className="border-2 border-[color:var(--t-600)] hover:border-[color:var(--t-700)] bg-white p-3 shadow-2xs flex flex-col justify-between transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0">
                          <Video className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-black text-sm text-[color:var(--ink)] leading-tight truncate">
                            On-Call Video Doctor
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            &lt; 3 min wait · MMC Certified
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2.5">
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">Digital MC</span>
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">e-Prescription</span>
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">WebRTC HD</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onConsultNow}
                    className="w-full min-h-[34px] px-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black border border-[color:var(--t-700)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Start Instant Consult</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* CARD 2: AI CLINICAL SYMPTOM MATCHER */}
                <div className="border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] bg-white p-3 shadow-2xs flex flex-col justify-between transition-colors group">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0">
                          <Stethoscope className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-black text-sm text-[color:var(--ink)] leading-tight truncate">
                            AI Symptom Triage
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            MOH Protocol · Free Assessment
                          </p>
                        </div>
                      </div>
                      <span className="text-2xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-1.5 py-0.2 shrink-0">
                        Triage
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2.5">
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">180+ Conditions</span>
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">Red-Flag Check</span>
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">Dept Route</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('consult'); setConsultSubTab('triage'); }}
                    className="w-full min-h-[34px] px-3 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-black border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    <span>Run Symptom Triage</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)]" />
                  </button>
                </div>

                {/* CARD 3: E-PRESCRIPTION & PHARMACY REFILL */}
                <div className="border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] bg-white p-3 shadow-2xs flex flex-col justify-between transition-colors group">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0">
                          <Pill className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-black text-sm text-[color:var(--ink)] leading-tight truncate">
                            Pharmacy Dispensary
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {summary?.activeRx || 0} Active Prescriptions
                          </p>
                        </div>
                      </div>
                      <span className="text-2xs font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.2 shrink-0">
                        Dispensary
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2.5">
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">50+ Retail Branches</span>
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">QR Verified</span>
                      <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.2">Home Courier</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenPharmacies ? onOpenPharmacies : () => { setRecordsSubTab('rx'); setActiveTab('records'); }}
                    className="w-full min-h-[34px] px-3 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-black border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Pill className="h-3.5 w-3.5 text-cyan-600" />
                    <span>Refill Prescriptions</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)]" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* TIER 3: CONSULTATION HISTORY & EHR ARCHIVE (Shown in 'all' and 'past' sub-tabs) */}
          {(appointmentsSubTab === 'all' || appointmentsSubTab === 'past') && (
            <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6" aria-label="Completed consultation history">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                        Consultation History &amp; Encounter Archive
                      </h2>
                      <span className="text-2xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-200">
                        {past.length} Encounters
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Past appointments, completed clinical visits, and follow-up rebooking
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setRecordsSubTab('overview'); setActiveTab('records'); }}
                  className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Clinical EHR</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {past.length > 0 ? (
                <div className="space-y-3">
                  {(appointmentsSubTab === 'past' ? past : past.slice(0, 4)).map(b => {
                    const prof = professionals.find(p => p.id === b.professionalId);
                    const isCancelled = b.status === 'Cancelled';
                    return (
                      <div
                        key={b.id}
                        className="p-3.5 sm:p-4 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <UserAvatar
                            src={prof?.avatar}
                            role={prof?.role || 'doctor'}
                            alt={b.professionalName}
                            className="w-10 h-10 object-cover border border-[color:var(--t-200)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectProfessional(b.professionalId)}
                                className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] transition-colors cursor-pointer text-left"
                              >
                                {b.professionalName}
                              </button>
                              <span className="text-xs font-semibold text-[color:var(--t-700)]">
                                {prof?.specialization || 'Clinical Specialist'}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-mono font-bold border ${
                                  isCancelled
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                <CheckCircle2 className={`h-3 w-3 ${isCancelled ? 'text-slate-500' : 'text-emerald-600'}`} />
                                {b.status}{b.paymentStatus === 'Refunded' ? ' · Refunded' : ''}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                              <span className="font-mono text-slate-700 font-semibold">{b.date}</span>
                              <span>&bull;</span>
                              <span className="font-mono">{b.timeSlot}</span>
                              <span>&bull;</span>
                              <span>{b.mode}</span>
                              <span>&bull;</span>
                              <span className="font-mono font-bold text-slate-700">{formatMoney(b.fee)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[color:var(--t-100)] shrink-0">
                          <button
                            type="button"
                            onClick={() => { setRecordsSubTab('overview'); setActiveTab('records'); }}
                            className="min-h-[34px] px-3 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] border border-[color:var(--t-200)] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Notes &amp; Rx
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectProfessional(b.professionalId)}
                            className="min-h-[34px] px-3 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-[color:var(--t-700)] border border-[color:var(--t-200)] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>Book Follow-Up</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {appointmentsSubTab === 'all' && past.length > 4 && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setAppointmentsSubTab('past')}
                        className="text-xs font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                      >
                        View All {past.length} Past Consultations &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center bg-[color:var(--t-50)]/30 border border-dashed border-[color:var(--t-200)] my-1">
                  <Calendar className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-sm font-bold text-slate-700">No Past Consultations Yet</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">
                    Completed consultations and clinical visits will be archived here for your permanent record.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* TIER 4: UNIFIED CLINICAL VITALS & SAFETY SNAPSHOT (Shown on 'all' overview only — single source of truth) */}
          {appointmentsSubTab === 'all' && (
            <section
              aria-label="Clinical vitals and safety snapshot"
              className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-[color:var(--t-600)]" />
                  <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                    Pre-Consultation Vitals &amp; Safety Snapshot
                  </h2>
                  <span className="hidden sm:inline text-xs text-slate-600">&bull;</span>
                  <span className="hidden sm:inline text-xs text-slate-600 font-medium">
                    Your doctor sees this only if you share your record
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xs font-mono font-bold px-2 py-0.5 border ${
                      patientAllergies.length > 0
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : recordsData?.allergyStatement?.kind === 'none_known'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    {patientAllergies.length > 0
                      ? `Allergies: ${patientAllergies.join(', ')}`
                      : recordsData?.allergyStatement?.kind === 'none_known'
                        ? 'You said: no known allergies'
                        : 'No allergies recorded yet'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                    className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Update Vitals</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Blood Pressure */}
                <div
                  onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                  className="bg-white border border-[color:var(--t-200)] p-3.5 border-l-4 border-l-[color:var(--t-600)] shadow-2xs hover:border-[color:var(--t-600)] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-[color:var(--ink)]">
                      <HeartPulse className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                      Blood Pressure
                    </span>
                    <span className={`text-2xs font-bold px-1.5 py-0.2 border ${classifyBp(summary?.bp?.value1 || 120, summary?.bp?.value2 || 78).badgeClass}`}>
                      {classifyBp(summary?.bp?.value1 || 120, summary?.bp?.value2 || 78).label.split('/')[0].trim()}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1.5 font-mono flex items-baseline gap-1">
                    <span>{summary?.bp ? `${summary.bp.value1}/${summary.bp.value2}` : '120/78'}</span>
                    <span className="text-xs font-normal text-slate-500 font-sans">mmHg</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                    {summary?.bp?.recordedAt ? `Logged ${fmtDate(summary.bp.recordedAt)}` : 'Reference Target < 120/80'}
                  </p>
                </div>

                {/* 2. Resting Heart Rate */}
                <div
                  onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                  className="bg-white border border-[color:var(--t-200)] p-3.5 border-l-4 border-l-emerald-600 shadow-2xs hover:border-[color:var(--t-600)] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-[color:var(--ink)]">
                      <Activity className="h-3.5 w-3.5 text-emerald-600" />
                      Heart Rate
                    </span>
                    <span className="text-2xs font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Normal
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1.5 font-mono flex items-baseline gap-1">
                    <span>{summary?.pulse?.value1 || '72'}</span>
                    <span className="text-xs font-normal text-slate-500 font-sans">BPM</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                    Resting target 60–100 BPM
                  </p>
                </div>

                {/* 3. Fasting Glucose */}
                <div
                  onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                  className="bg-white border border-[color:var(--t-200)] p-3.5 border-l-4 border-l-amber-500 shadow-2xs hover:border-[color:var(--t-600)] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-[color:var(--ink)]">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      Blood Glucose
                    </span>
                    <span className="text-2xs font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {summary?.glucose?.value1 ? (summary.glucose.value1 > 6.0 ? 'Elevated' : 'Target') : 'Target'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1.5 font-mono flex items-baseline gap-1">
                    <span>{summary?.glucose?.value1 || '5.4'}</span>
                    <span className="text-xs font-normal text-slate-500 font-sans">{summary?.glucose?.unit || 'mmol/L'}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                    Fasting target 4.0–7.0 mmol/L
                  </p>
                </div>

                {/* 4. Oxygen Saturation (SpO2) */}
                <div
                  onClick={() => { setRecordsSubTab('vitals'); setActiveTab('records'); }}
                  className="bg-white border border-[color:var(--t-200)] p-3.5 border-l-4 border-l-cyan-600 shadow-2xs hover:border-[color:var(--t-600)] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 text-slate-500 text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-[color:var(--ink)]">
                      <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                      Oxygen (SpO₂)
                    </span>
                    <span className="text-2xs font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Optimal
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1.5 font-mono flex items-baseline gap-1">
                    <span>{summary?.spo2?.value1 || '99'}</span>
                    <span className="text-xs font-normal text-slate-500 font-sans">%</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                    Arterial saturation ≥ 95%
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* TIER 5: CARE CONTINUITY ROW — E-PRESCRIPTIONS & SPECIALIST RECOMMENDATIONS (Shown on 'all' overview) */}
          {appointmentsSubTab === 'all' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* LEFT: ACTIVE E-PRESCRIPTIONS & PHARMACY DISPATCH */}
              <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6 flex flex-col justify-between" aria-label="Active prescriptions and dispensary">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                        <Pill className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                          Active Doctor E-Prescriptions
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Digital prescriptions from your consultations ready for fulfillment
                        </p>
                      </div>
                    </div>

                    <span className="text-2xs font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">
                      {activePrescriptions.length} Active
                    </span>
                  </div>

                  {activePrescriptions.length === 0 ? (
                    <div className="py-7 px-4 text-center bg-[color:var(--t-50)]/30 border border-dashed border-[color:var(--t-200)] my-2">
                      <Pill className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-[color:var(--ink)] mb-0.5">
                        No Active Prescriptions Requiring Refill
                      </p>
                      <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                        Medications prescribed during your telehealth consultations appear here automatically for one-click pharmacy dispensing.
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
                                <span className="inline-block text-2xs font-mono font-black text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
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
                                  <span className="inline-block text-2xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5">
                                    Ready for Pickup
                                  </span>
                                ) : rx.fillStatus === 'preparing' ? (
                                  <span className="inline-block text-2xs font-mono font-bold bg-[color:var(--t-50)] text-[color:var(--t-800)] border border-[color:var(--t-200)] px-2 py-0.5">
                                    Being Prepared
                                  </span>
                                ) : rx.pharmacyName ? (
                                  <span className="inline-block text-2xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 truncate max-w-[130px]">
                                    {rx.pharmacyName}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDispatchingRx(rx);
                                      if (pharmacies.length > 0) setSelectedPharmacyId(pharmacies[0].id);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-mono font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white px-2.5 py-1 shadow-2xs cursor-pointer transition-colors"
                                  >
                                    <Send className="h-3 w-3" /> Dispatch to Pharmacy
                                  </button>
                                )}
                                <p className="text-xs font-mono text-slate-600 mt-1">
                                  Valid until: {fmtDate(rx.validUntil)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[color:var(--t-100)] text-xs">
                              <span className="text-slate-500 font-medium">
                                Doctor: <strong className="text-slate-700">{rx.doctor?.name || 'Verified Physician'}</strong>
                              </span>
                              <button type="button" onClick={() => { setRxSubTab('active'); setActiveTab('prescriptions'); }} className="text-xs font-bold text-[color:var(--t-600)] hover:underline cursor-pointer">View Full Prescription &rarr;</button>
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
                    onClick={() => setActiveTab('prescriptions')}
                    className="text-xs font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                  >
                    Manage All Prescriptions &rarr;
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

              {/* RIGHT: RECOMMENDED SPECIALISTS FOR FOLLOW-UP */}
              <section className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs p-5 sm:p-6 flex flex-col justify-between" aria-label="Personalized specialist care recommendations">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                        <Stethoscope className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] leading-tight">
                          Recommended Specialists for You
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Matched to {patientConditions.length > 0 ? patientConditions.join(', ') : 'your clinical profile & vitals'}
                        </p>
                      </div>
                    </div>

                    {onFindDoctors && (
                      <button
                        type="button"
                        onClick={onFindDoctors}
                        className="text-xs font-bold text-[color:var(--t-600)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="h-3.5 w-3.5" /> Full Directory
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {recommendedSpecialists.map(prof => (
                      <div
                        key={prof.id}
                        className="p-3 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all bg-white flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            src={prof.avatar}
                            role={prof.role || 'doctor'}
                            alt={prof.name}
                            className="w-10 h-10 rounded-full object-cover border border-[color:var(--t-200)] shrink-0"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onSelectProfessional(prof.id)}
                              className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] transition-colors text-left truncate block cursor-pointer"
                            >
                              {prof.name}
                            </button>
                            <p className="text-xs text-[color:var(--t-700)] font-bold truncate">
                              {prof.specialization} · <span className="text-slate-500 font-medium">{prof.city || 'Kuala Lumpur'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono font-extrabold text-xs text-[color:var(--ink)] hidden sm:inline">
                            {formatMoney(prof.fee || 80)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectProfessional(prof.id)}
                            className="min-h-[34px] px-3 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-[color:var(--t-700)] text-xs font-black border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Book</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[color:var(--t-100)] mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Need help choosing a specialist or verifying an MC?</span>
                  {onOpenHelp && (
                    <button
                      type="button"
                      onClick={onOpenHelp}
                      className="font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                    >
                      Ask Care Concierge &rarr;
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {/* 1. HEALTH RECORDS: CLINICAL PROFILE & VITALS */}
      {activeTab === 'records' && (
        <div id="panel-records" role="tabpanel" aria-labelledby="tab-records" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={FolderHeart}
            eyebrow="Health record"
            title="Your health profile and readings"
            description="Your allergies, conditions, medicines and readings. You decide which doctors can see them."
            aside={
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 min-h-[44px] bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>Print this page</span>
              </button>
            }
            tabs={[
              { id: 'overview', label: 'Profile', icon: ClipboardList },
              { id: 'vitals', label: 'Readings', icon: Activity },
              { id: 'sharing', label: 'Sharing & PIN', icon: Share2 },
            ]}
            activeTab={recordsSubTab}
            onTabChange={setRecordsSubTab}
          />
          <PatientRecords
            activeSubTab={recordsSubTab}
            onSubTabChange={setRecordsSubTab}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {/* 2. PRESCRIPTIONS & MEDS */}
      {activeTab === 'prescriptions' && (
        <div id="panel-prescriptions" role="tabpanel" aria-labelledby="tab-prescriptions" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={Pill}
            eyebrow="Pharmacy"
            title="Prescriptions & medicines"
            description="Send a prescription to a partner pharmacy, follow its progress, and keep the past ones."
            aside={
              onOpenPharmacies && (
                <button
                  type="button"
                  onClick={onOpenPharmacies}
                  className="px-3.5 min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Find a pharmacy</span>
                </button>
              )
            }
            tabs={[
              { id: 'active', label: 'Active', icon: Pill, count: activePrescriptions.length },
              { id: 'history', label: 'Past prescriptions', icon: FileText },
            ]}
            activeTab={rxSubTab}
            onTabChange={setRxSubTab}
          />
          <PatientRecords
            activeSubTab={rxSubTab === 'history' ? 'rxhist' : 'rx'}
            onSubTabChange={t => setRxSubTab(t === 'rxhist' ? 'history' : 'active')}
            onOpenPharmacies={onOpenPharmacies}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {/* 3. CERTIFICATES & REFERRALS */}
      {activeTab === 'certs' && (
        <div id="panel-certs" role="tabpanel" aria-labelledby="tab-certs" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={FileText}
            eyebrow="Certificates and referrals"
            title="Medical certificates & referrals"
            description="Each certificate has a code and QR that your employer can check online. The check shows the doctor's registration number and whether the certificate has been changed since it was signed."
            tabs={[
              { id: 'mc', label: 'Medical Certificates (MC)', icon: FileText },
              { id: 'referrals', label: 'Referral Letters', icon: HeartHandshake },
            ]}
            activeTab={certsSubTab}
            onTabChange={setCertsSubTab}
          />
          <PatientRecords
            activeSubTab={certsSubTab}
            onFindDoctors={onFindDoctors}
            onBookSpecialist={(id) => { if (id) onSelectProfessional(id); else onFindDoctors?.(); }}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {/* 4. LABS & DOCTOR NOTES */}
      {activeTab === 'labs' && (
        <div id="panel-labs" role="tabpanel" aria-labelledby="tab-labs" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={FlaskConical}
            eyebrow="Clinical Diagnostics · Diagnostic Reports"
            title="Diagnostic Lab Reports & Doctor Clinical Notes"
            description="Pathology test results, blood analysis, radiology reports, and physician consultation summaries."
            badges={<BannerBadge tone="brand">Accredited Pathology</BannerBadge>}
            tabs={[
              { id: 'labs', label: 'Lab Test Reports', icon: FlaskConical },
              { id: 'notes', label: 'Doctor Clinical Notes', icon: FileText },
            ]}
            activeTab={labsSubTab}
            onTabChange={setLabsSubTab}
          />
          <PatientRecords
            activeSubTab={labsSubTab}
            onSubTabChange={setLabsSubTab}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {/* 5. CONSULT NOW TAB */}
      {activeTab === 'consult' && (
        <div id="panel-consult" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={Video}
            eyebrow="Telehealth network"
            title="Consult a doctor now"
            description="Chat or video with a doctor. If no doctor joins within 10 minutes you are refunded automatically."
            badges={
              onCall && onCall.onlineDoctors > 0 ? (
                <BannerBadge tone="success">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" /> {onCallLabel(onCall)}
                </BannerBadge>
              ) : (
                <span className="bg-amber-50 text-amber-900 border border-amber-300 text-2xs font-black uppercase px-2.5 py-0.5">{onCallLabel(onCall)}</span>
              )
            }
            aside={
              consultSubTab === 'instant' ? (
                <button
                  type="button"
                  onClick={() => setConsultSubTab('triage')}
                  className="px-3.5 min-h-[44px] bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>Not sure? Try AI symptom triage</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConsultSubTab('instant')}
                  className="px-3.5 min-h-[44px] bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Video className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>Back to consultation</span>
                </button>
              )
            }
          />
          {consultSubTab === 'instant' ? (
            <ConsultNow 
              myUserId={currentUser?.id} 
              embedded={true} 
              onNavigateToPrescriptions={() => setActiveTab('prescriptions')}
              onBookAppointment={onFindDoctors}
            />
          ) : (
            <div className="space-y-4">
              <AISymptomMatcher
                onSelectSpecialty={(spec) => {
                  if (onFindDoctors) onFindDoctors();
                }}
                onApplyTriage={(triage) => {
                  if (onFindDoctors) onFindDoctors();
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 6. CARE MESSAGES TAB */}
      {activeTab === 'messages' && (
        <div id="panel-messages" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={MessageSquare}
            eyebrow="Care messages"
            title="Patient Care Mailbox & Direct Messaging"
            description="Private messages with the doctors and nurses you have booked or consulted. Replies can take time. Not for emergencies: call 999."
            aside={
              onFindDoctors && (
                <button
                  type="button"
                  onClick={onFindDoctors}
                  className="px-3.5 py-2 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>Find Doctor to Message</span>
                </button>
              )
            }
          />
          <SecureMessenger
            currentUserId={currentUser?.profileId || currentUser?.id || 'patient-user'}
            embedded={true}
          />
        </div>
      )}

      {/* 7. SAVED CARE TEAM TAB */}
      {activeTab === 'saved' && (
        <div id="panel-saved" role="tabpanel" aria-labelledby="tab-saved" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={Heart}
            eyebrow="Personal Care Team · Saved Practitioners"
            title="Your Care Team & Saved Specialists"
            description="The doctors and nurses you have seen, and others you saved to book later."
            badges={<BannerBadge tone="brand">{careTeam.length} seen · {savedIds.length} saved</BannerBadge>}
            aside={
              onFindDoctors && (
                <button
                  type="button"
                  onClick={onFindDoctors}
                  className="px-3.5 h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Find a doctor or nurse</span>
                </button>
              )
            }
            tabs={[
              { id: 'all', label: 'All Care Team', count: careTeam.length + savedIds.length },
              { id: 'doctors', label: 'Doctors & Specialists', count: professionals.filter(p => (savedIds.includes(p.id) || careTeam.some(c => c.id === p.id)) && p.role === UserRole.DOCTOR).length },
              { id: 'nurses', label: 'Clinical Nurses', count: professionals.filter(p => (savedIds.includes(p.id) || careTeam.some(c => c.id === p.id)) && p.role === UserRole.NURSE).length },
            ]}
            activeTab={savedSubTab}
            onTabChange={setSavedSubTab}
          />
          <SavedTab
            hideHeader={true}
            careTeam={careTeam.filter(p => {
              if (savedSubTab === 'doctors' && p.role !== UserRole.DOCTOR) return false;
              if (savedSubTab === 'nurses' && p.role !== UserRole.NURSE) return false;
              return true;
            })}
            allProfessionals={professionals.filter(p => {
              if (savedSubTab === 'doctors' && p.role !== UserRole.DOCTOR) return false;
              if (savedSubTab === 'nurses' && p.role !== UserRole.NURSE) return false;
              return true;
            })}
            onFindProviders={onFindDoctors}
            savedProfessionals={professionals.filter(p => {
              if (!savedIds.includes(p.id)) return false;
              if (savedSubTab === 'doctors' && p.role !== UserRole.DOCTOR) return false;
              if (savedSubTab === 'nurses' && p.role !== UserRole.NURSE) return false;
              return true;
            })}
            onRemoveSaved={removeSaved}
            onRestoreSaved={restoreSaved}
            onNavigateToMessages={onNavigateToMessages}
            onSelectProfessional={onSelectProfessional}
            onVerifyCredentials={p => onSelectProfessional(p.id)}
          />
        </div>
      )}

      {/* 8. PACKAGES TAB */}
      {activeTab === 'packages' && (
        <div id="panel-packages" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={PackagePlus}
            eyebrow="Preventive Health · Hospital Packages"
            title="Comprehensive Medical Screening & Treatment Packages"
            description="Curated healthcare packages from accredited private hospitals and specialist clinics across Malaysia."
            badges={<BannerBadge tone="brand">Price Transparent</BannerBadge>}
            tabs={[
              { id: 'packages', label: 'Medical Packages' },
              { id: 'promotions', label: 'Promotions & Offers' },
              { id: 'facilities', label: 'Facilities & Infrastructure' },
            ]}
            activeTab={packagesSubTab}
            onTabChange={(t) => setPackagesSubTab(t as any)}
          />
          <MedicalPackagesModule
            embedded={true}
            activeTab={packagesSubTab}
            onTabChange={setPackagesSubTab}
          />
        </div>
      )}

      {/* 9. ASSISTANCE & QUOTES TAB */}
      {activeTab === 'assistance' && (
        <div id="panel-assistance" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={HeartHandshake}
            eyebrow="Treatment quotes"
            title="Treatment quotes and assistance"
            description="Ask a hospital for an itemised quote, then accept it or ask for changes. Sending a request is free and does not commit you."
            tabs={[
              { id: 'enquiry', label: 'Request a quote' },
              { id: 'cases', label: 'My requests and quotes' },
              { id: 'guide', label: 'Travel guide' },
              ...(currentUser ? [] : [{ id: 'track', label: 'Track a request' }]),
            ]}
            activeTab={assistanceSubTab}
            onTabChange={(t) => setAssistanceSubTab(t as any)}
          />
          <MedicalAssistanceModule
            embedded={true}
            activeTab={assistanceSubTab}
            onTabChange={setAssistanceSubTab}
          />
        </div>
      )}

      {/* 10. GLOBAL PATIENT SERVICES TAB */}
      {activeTab === 'tourism' && (
        <div id="panel-tourism" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={Plane}
            eyebrow="Hospitals and medical travel"
            title="Global patient care"
            description="Find licensed hospitals in Malaysia, ask one for an itemised quote, and follow your request. For patients in Malaysia and from abroad."
            tabs={[
              { id: 'find', label: 'Find a hospital' },
              { id: 'cases', label: 'My requests' },
              { id: 'info', label: 'Travel information' },
            ]}
            activeTab={tourismSubTab}
            onTabChange={(t) => setTourismSubTab(t as any)}
          />
          <MedicalTourism
            embedded={true}
            activeTab={tourismSubTab}
            onTabChange={setTourismSubTab}
            onOpenProfessional={onSelectProfessional}
          />
        </div>
      )}

      {/* 11. PHARMACIES TAB */}
      {activeTab === 'pharmacies' && (
        <div id="panel-pharmacies" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={Store}
            eyebrow="Pharmacy Registry · Poison Licences"
            title="Licensed Pharmacy Dispensary Network"
            description="Locate Type A Poison Licensed retail pharmacies and hospital dispensaries for prescription fulfillment and delivery."
            badges={<BannerBadge tone="brand">Type A Poison Licensed</BannerBadge>}
            tabs={[
              { id: 'all', label: 'All Dispensaries', count: pharmacies.length },
              { id: 'delivery', label: 'Home Delivery Licensed' },
              { id: 'open24', label: '24-Hour Emergency' },
            ]}
            activeTab={pharmaciesSubTab}
            onTabChange={setPharmaciesSubTab}
          />
          <PharmacyFinder embedded={true} />
        </div>
      )}

      {/* 12. MEDICAL LIBRARY TAB */}
      {activeTab === 'articles' && (
        <div id="panel-articles" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={BookOpen}
            eyebrow="Patient Health Guides · Evidence-Based Medicine"
            title="Clinical Health Library & Patient Guides"
            description="Physician-authored, evidence-based medical articles, disease management guides, and clinical wellness advice."
            badges={<BannerBadge tone="brand">Doctor Reviewed</BannerBadge>}
            aside={
              onFindDoctors && (
                <button
                  type="button"
                  onClick={onFindDoctors}
                  className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Find Article Author</span>
                </button>
              )
            }
          />
          <MedicalLibrary
            embedded={true}
            articles={articles || INITIAL_ARTICLES}
            professionals={professionals}
            onFindDoctor={() => {
              setActiveTab('registry');
            }}
          />
        </div>
      )}

      {/* 13. REGISTRY / DOCTORS TAB */}
      {activeTab === 'registry' && (() => {
        const allDoctors = professionals.filter((p): p is DoctorProfile => p.role === UserRole.DOCTOR);
        const doctorSpecialties = Array.from(new Set(allDoctors.map(d => d.specialization).filter(Boolean))).sort();
        const doctorCities = Array.from(new Set(allDoctors.map(d => d.city).filter(Boolean))).sort();
        const effectiveSpecialty = selectedSpecialtyFilter || (registrySpecialty !== 'all' ? registrySpecialty : '');

        const filteredDoctors = allDoctors
          .filter(d => {
            if (registrySubTab === 'telehealth' && !d.consultationModes?.includes(ConsultationMode.VIDEO)) return false;
            if (registrySubTab === 'specialists' && d.specialization?.toLowerCase() === 'general physician') return false;
            if (effectiveSpecialty && !d.specialization?.toLowerCase().includes(effectiveSpecialty.toLowerCase())) return false;
            if (registryCity !== 'all' && d.city !== registryCity) return false;
            if (registryQuery.trim()) {
              const q = registryQuery.trim().toLowerCase();
              const hay = `${d.name} ${d.specialization} ${d.city || ''} ${d.practiceAddress || ''} ${d.licenseNumber || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .sort((a, b) => {
            if (registrySort === 'fee_asc') return (a.fee || 0) - (b.fee || 0);
            if (registrySort === 'fee_desc') return (b.fee || 0) - (a.fee || 0);
            if (registrySort === 'experience') return (b.experienceYears || 0) - (a.experienceYears || 0);
            return (b.rating || 0) - (a.rating || 0);
          });

        const hasDoctorFilters = Boolean(registryQuery.trim() || effectiveSpecialty || registryCity !== 'all' || registrySubTab !== 'all');

        return (
          <div id="panel-registry" role="tabpanel" tabIndex={0} className="space-y-4">
            <WorkspaceHeader
              icon={Search}
              eyebrow="National Medical Registry · Doctor Directory"
              title="Verified Malaysian Doctors & Specialists"
              description="Directory of registered physicians verified directly against the Malaysian Medical Council (MMC) database with active Annual Practising Certificates (APC)."
              badges={<BannerBadge tone="success"><CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" /> MMC Verified</BannerBadge>}
              aside={
                onFindDoctors && (
                  <button
                    type="button"
                    onClick={onFindDoctors}
                    className="px-3.5 h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Full Interactive Directory</span>
                  </button>
                )
              }
              tabs={[
                { id: 'all', label: 'All Specialists', count: allDoctors.length },
                { id: 'telehealth', label: 'Available for Telehealth', count: allDoctors.filter(d => d.consultationModes?.includes(ConsultationMode.VIDEO)).length },
                { id: 'specialists', label: 'Consultant Physicians', count: allDoctors.filter(d => d.specialization?.toLowerCase() !== 'general physician').length },
              ]}
              activeTab={registrySubTab}
              onTabChange={setRegistrySubTab}
            />

            {/* Unified Single-Row Filter Control Bar */}
            <section aria-label="Filter doctors" className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px]">
                  <label htmlFor="registry-doctor-search" className="sr-only">Search doctors</label>
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="registry-doctor-search"
                    type="text"
                    placeholder="Search by doctor name, specialty, hospital, city, or MMC number…"
                    value={registryQuery}
                    onChange={e => setRegistryQuery(e.target.value)}
                    className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  />
                  {registryQuery && (
                    <button
                      type="button"
                      onClick={() => setRegistryQuery('')}
                      aria-label="Clear search query"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Dropdown Controls */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <FilterSelect
                    label="Specialty"
                    value={selectedSpecialtyFilter ? selectedSpecialtyFilter : registrySpecialty}
                    onChange={val => {
                      if (selectedSpecialtyFilter && onClearSpecialtyFilter) onClearSpecialtyFilter();
                      setRegistrySpecialty(val);
                    }}
                  >
                    <option value="all">All Specialties ({doctorSpecialties.length})</option>
                    {doctorSpecialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label="City" value={registryCity} onChange={setRegistryCity}>
                    <option value="all">All Cities ({doctorCities.length})</option>
                    {doctorCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label="Sort by" value={registrySort} onChange={v => setRegistrySort(v as any)}>
                    <option value="rating">Highest Rated</option>
                    <option value="experience">Most Experienced</option>
                    <option value="fee_asc">Fee: Low to High</option>
                    <option value="fee_desc">Fee: High to Low</option>
                  </FilterSelect>
                </div>
              </div>

              {/* Active Filter Summary & Result Counter Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
                    Showing <strong className="font-black text-[color:var(--ink)]">{filteredDoctors.length}</strong> of {allDoctors.length} verified doctor{allDoctors.length === 1 ? '' : 's'}
                  </span>
                  {effectiveSpecialty && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {selectedSpecialtyFilter ? 'AI Triage: ' : 'Specialty: '}{effectiveSpecialty}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSpecialtyFilter && onClearSpecialtyFilter) onClearSpecialtyFilter();
                          setRegistrySpecialty('all');
                        }}
                        className="hover:text-slate-900 cursor-pointer"
                        aria-label="Clear specialty filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {registryCity !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      City: {registryCity}
                      <button type="button" onClick={() => setRegistryCity('all')} className="hover:text-slate-900 cursor-pointer" aria-label="Clear city filter">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>

                {hasDoctorFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegistryQuery('');
                      setRegistrySpecialty('all');
                      setRegistryCity('all');
                      setRegistrySubTab('all');
                      if (selectedSpecialtyFilter && onClearSpecialtyFilter) onClearSpecialtyFilter();
                    }}
                    className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </section>

            {filteredDoctors.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2.5">
                <Search className="h-8 w-8 text-[color:var(--t-300)] mx-auto" />
                <p className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">No doctors match your current filter criteria</p>
                <p className="text-xs text-slate-500">Try clearing your specialty or city filter to see all registered practitioners.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDoctors.map(prof => (
                  <article key={prof.id} className="p-4 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all bg-white flex flex-col justify-between gap-3 shadow-2xs group">
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        <UserAvatar src={prof.avatar} role="doctor" alt={prof.name} className="w-12 h-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <button type="button" onClick={() => onSelectProfessional(prof.id)} className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left truncate block cursor-pointer">
                              {prof.name}
                            </button>
                            {prof.rating > 0 && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-2xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" /> {prof.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[color:var(--t-700)] font-bold mt-0.5">{prof.specialization}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                              MMC Verified · Active
                            </span>
                            {prof.licenseNumber && (
                              <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5">
                                {prof.licenseNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[color:var(--t-100)] text-xs text-slate-600 space-y-1">
                        {(prof.practiceAddress || prof.city) && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                            <span className="truncate">{prof.practiceAddress ? `${prof.practiceAddress}${prof.city && !prof.practiceAddress.includes(prof.city) ? `, ${prof.city}` : ''}` : prof.city}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-0.5">
                            {prof.experienceYears} yrs exp
                          </span>
                          {prof.consultationModes?.map(mode => (
                            <span key={mode} className="text-2xs font-bold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                              {mode}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[color:var(--t-100)] flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Consultation Fee</span>
                        <span className="font-mono text-xs font-extrabold text-[color:var(--ink)]">RM {prof.fee}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(prof.id)}
                        className="h-9 px-3.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>Book Visit</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 14. CLINICAL NURSES TAB */}
      {activeTab === 'nurses' && (() => {
        const allNurses = professionals.filter((p): p is NurseProfile => p.role === UserRole.NURSE);
        const nurseSpecialties = Array.from(new Set(allNurses.map(n => n.specialization).filter(Boolean))).sort();
        const nurseCities = Array.from(new Set(allNurses.map(n => n.city).filter(Boolean))).sort();

        const filteredNurses = allNurses
          .filter(n => {
            if (nursesSubTab === 'homecare' && !n.consultationModes?.includes(ConsultationMode.HOME_VISIT)) return false;
            if (nursesSubTab === 'clinic' && !n.consultationModes?.includes(ConsultationMode.IN_PERSON)) return false;
            if (nursesSpecialty !== 'all' && n.specialization !== nursesSpecialty) return false;
            if (nursesCity !== 'all' && n.city !== nursesCity) return false;
            if (nursesQuery.trim()) {
              const q = nursesQuery.trim().toLowerCase();
              const hay = `${n.name} ${n.specialization || ''} ${n.city || ''} ${n.practiceAddress || ''} ${n.licenseNumber || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .sort((a, b) => {
            if (nursesSort === 'fee_asc') return (a.fee || 0) - (b.fee || 0);
            if (nursesSort === 'fee_desc') return (b.fee || 0) - (a.fee || 0);
            if (nursesSort === 'experience') return (b.experienceYears || 0) - (a.experienceYears || 0);
            return (b.rating || 0) - (a.rating || 0);
          });

        const hasNurseFilters = Boolean(nursesQuery.trim() || nursesSpecialty !== 'all' || nursesCity !== 'all' || nursesSubTab !== 'all');

        return (
          <div id="panel-nurses" role="tabpanel" tabIndex={0} className="space-y-4">
            <WorkspaceHeader
              icon={UserCheck}
              eyebrow="National Nursing Registry · Clinical Nurses"
              title="LJM Registered Staff Nurses & Care Providers"
              description="Verified professional nurses registered with the Lembaga Jururawat Malaysia (LJM) for clinic care, home nursing, and wound dressing."
              badges={<BannerBadge tone="success"><CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" /> LJM Verified</BannerBadge>}
              aside={
                onFindDoctors && (
                  <button
                    type="button"
                    onClick={onFindDoctors}
                    className="px-3.5 h-10 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    <span>Search All Providers</span>
                  </button>
                )
              }
              tabs={[
                { id: 'all', label: 'All Registered Nurses', count: allNurses.length },
                { id: 'homecare', label: 'Home Care & Private Nursing', count: allNurses.filter(n => n.consultationModes?.includes(ConsultationMode.HOME_VISIT)).length },
                { id: 'clinic', label: 'Clinical & Hospital', count: allNurses.filter(n => n.consultationModes?.includes(ConsultationMode.IN_PERSON)).length },
              ]}
              activeTab={nursesSubTab}
              onTabChange={setNursesSubTab}
            />

            {/* Unified Single-Row Filter Control Bar */}
            <section aria-label="Filter nurses" className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px]">
                  <label htmlFor="registry-nurse-search" className="sr-only">Search nurses</label>
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="registry-nurse-search"
                    type="text"
                    placeholder="Search by nurse name, nursing specialty, city, or LJM number…"
                    value={nursesQuery}
                    onChange={e => setNursesQuery(e.target.value)}
                    className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  />
                  {nursesQuery && (
                    <button
                      type="button"
                      onClick={() => setNursesQuery('')}
                      aria-label="Clear nurse search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Dropdown Controls */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <FilterSelect label="Specialty" value={nursesSpecialty} onChange={setNursesSpecialty}>
                    <option value="all">All Specialties ({nurseSpecialties.length})</option>
                    {nurseSpecialties.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label="City" value={nursesCity} onChange={setNursesCity}>
                    <option value="all">All Cities ({nurseCities.length})</option>
                    {nurseCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label="Sort by" value={nursesSort} onChange={v => setNursesSort(v as any)}>
                    <option value="rating">Highest Rated</option>
                    <option value="experience">Most Experienced</option>
                    <option value="fee_asc">Rate: Low to High</option>
                    <option value="fee_desc">Rate: High to Low</option>
                  </FilterSelect>
                </div>
              </div>

              {/* Active Filter Summary & Result Counter Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
                    Showing <strong className="font-black text-[color:var(--ink)]">{filteredNurses.length}</strong> of {allNurses.length} registered nurse{allNurses.length === 1 ? '' : 's'}
                  </span>
                  {nursesSpecialty !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      Specialty: {nursesSpecialty}
                      <button type="button" onClick={() => setNursesSpecialty('all')} className="hover:text-slate-900 cursor-pointer" aria-label="Clear nurse specialty filter">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {nursesCity !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      City: {nursesCity}
                      <button type="button" onClick={() => setNursesCity('all')} className="hover:text-slate-900 cursor-pointer" aria-label="Clear nurse city filter">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>

                {hasNurseFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setNursesQuery('');
                      setNursesSpecialty('all');
                      setNursesCity('all');
                      setNursesSubTab('all');
                    }}
                    className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </section>

            {filteredNurses.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2.5">
                <UserCheck className="h-8 w-8 text-[color:var(--t-300)] mx-auto" />
                <p className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">No clinical nurses match your filter criteria</p>
                <p className="text-xs text-slate-500">Try resetting your specialty or city filter to browse all registered nurses.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredNurses.map(prof => (
                  <article key={prof.id} className="p-4 border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all bg-white flex flex-col justify-between gap-3 shadow-2xs group">
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        <UserAvatar src={prof.avatar} role="nurse" alt={prof.name} className="w-12 h-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <button type="button" onClick={() => onSelectProfessional(prof.id)} className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left truncate block cursor-pointer">
                              {prof.name}
                            </button>
                            {prof.rating > 0 && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-2xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" /> {prof.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[color:var(--t-700)] font-bold mt-0.5">{prof.specialization || 'Clinical Staff Nurse'}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                              LJM Verified · Active
                            </span>
                            {prof.licenseNumber && (
                              <span className="text-2xs font-mono font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5">
                                {prof.licenseNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[color:var(--t-100)] text-xs text-slate-600 space-y-1">
                        {(prof.practiceAddress || prof.city) && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                            <span className="truncate">{prof.practiceAddress ? `${prof.practiceAddress}${prof.city && !prof.practiceAddress.includes(prof.city) ? `, ${prof.city}` : ''}` : prof.city}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-0.5">
                            {prof.experienceYears} yrs exp
                          </span>
                          {prof.consultationModes?.map(mode => (
                            <span key={mode} className="text-2xs font-bold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                              {mode}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[color:var(--t-100)] flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Care Rate</span>
                        <span className="font-mono text-xs font-extrabold text-[color:var(--ink)]">RM {prof.fee || 60} / hr</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(prof.id)}
                        className="h-9 px-3.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>Book Nurse</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
                  <p className="text-xs font-mono text-slate-500">RX CODE: {dispatchingRx.code}</p>
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
              <p className="text-xs font-mono text-slate-500 pt-0.5">
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
                            <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{p.address}, {p.city}</span>
                            </p>
                            {p.services.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {p.services.map((s, idx) => (
                                  <span key={idx} className="text-2xs font-bold uppercase bg-white border border-[color:var(--t-200)] px-1.5 py-0.2 text-slate-700">
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
    </div>
  );
}
