import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { maskNric } from '../identity';
import { navigate } from '../nav';
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
import DashboardHeader, { BannerRow, BannerIdentity, BannerBadge, BannerKpis, FilterSelect, bannerOnBrandPrimaryBtn, bannerOnBrandSecondaryBtn } from '../shared/ui/DashboardHeader';
import type { RecordSubTab } from './PatientRecords';
import SavedTab from './patient/SavedTab';
import PatientAppointmentsTab from './patient/PatientAppointmentsTab';
import PaymentDialog from './PaymentDialog';
import { formatMoney, useTr } from '../locale';
import PatientHeroBanner from './PatientHeroBanner';
import { useOnCallStatus, onCallLabel } from '../useOnCallStatus';
import { useSavedProviders } from '../savedProviders';
import { UserAvatar } from '../avatars';
import WorkspaceHeader from '../shared/ui/WorkspaceHeader';
import { patientApi } from './patient/api';
import { classifyBp, fmtPatientDate as fmtDate, matchRecommendedSpecialists } from './patient/clinicalHelpers';

const PatientRecords = lazy(() => import('./PatientRecords'));
const ConsultNow = lazy(() => import('../domains/telemedicine/ConsultNow'));
const SecureMessenger = lazy(() => import('../domains/telemedicine/SecureMessenger'));
const MedicalPackagesModule = lazy(() => import('./MedicalPackagesModule'));
const MedicalAssistanceModule = lazy(() => import('./MedicalAssistanceModule'));
const MedicalTourism = lazy(() => import('./MedicalTourism'));
const PharmacyFinder = lazy(() => import('./PharmacyFinder'));
const MedicalLibrary = lazy(() => import('./MedicalLibrary'));
const AISymptomMatcher = lazy(() => import('../domains/telemedicine/AISymptomMatcher'));

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
  tabs: { id: PatientDashboardTab; label: string; description: string; icon: any; count?: number }[];
}> = {
  care: {
    name: 'My Care',
    defaultTab: 'appointments',
    tabs: [
      { id: 'appointments', label: 'Appointments', description: 'Manage upcoming visits, reschedules & history', icon: Calendar },
      { id: 'consult', label: 'Instant Consult', description: '24/7 video consults & AI symptom triage', icon: Video },
      { id: 'messages', label: 'Messages', description: 'Encrypted chat with your doctors & clinics', icon: MessageSquare },
      { id: 'saved', label: 'My Care Team', description: 'Bookmarked specialists, nurses & clinics', icon: Heart },
    ],
  },
  records: {
    name: 'Health Records',
    defaultTab: 'records',
    tabs: [
      { id: 'records', label: 'Vitals & Profile', description: 'Blood pressure, allergies, chronic conditions & EHR', icon: FolderHeart },
      { id: 'prescriptions', label: 'Prescriptions', description: 'Active e-prescriptions, refills & pharmacy pickup', icon: Pill },
      { id: 'labs', label: 'Lab Results', description: 'Diagnostic panels, imaging & pathology reports', icon: FlaskConical },
      { id: 'certs', label: 'MC & Referrals', description: 'Digital medical certificates & specialist letters', icon: FileText },
    ],
  },
  discovery: {
    name: 'Find Care',
    defaultTab: 'registry',
    tabs: [
      { id: 'registry', label: 'Doctors & Specialists', description: 'Search MMC-verified physicians by specialty', icon: Search },
      { id: 'nurses', label: 'Nurses & Home Care', description: 'LJM-verified nurses for home recovery & care', icon: UserCheck },
      { id: 'pharmacies', label: 'Pharmacies', description: 'Nearby verified dispensaries & cold-chain delivery', icon: Store },
      { id: 'articles', label: 'Health Library', description: 'Clinician-reviewed guides & medication advice', icon: BookOpen },
    ],
  },
  services: {
    name: 'Packages & Quotes',
    defaultTab: 'packages',
    tabs: [
      { id: 'packages', label: 'Health Packages', description: 'Bundled screening, maternity & checkup plans', icon: PackagePlus },
      { id: 'assistance', label: 'Cost Quotes & Aid', description: 'Treatment estimates & financial assistance requests', icon: HeartHandshake },
      { id: 'tourism', label: 'Medical Travel', description: 'Cross-border hospital coordination & concierge', icon: Plane },
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


export default function PatientDashboard({
  bookings, setBookings, professionals, onSelectProfessional, onNavigateToMessages, onConsultNow, onOpenArticle, onFindDoctors, onOpenTriage, onOpenPharmacies, onOpenHelp, activeGroup, initialTab, currentUser, articles,
  selectedSpecialtyFilter, onSelectSpecialtyFilter, onClearSpecialtyFilter,
}: PatientDashboardProps) {
  const tx = useTr();
  const currentGroup: PatientTabGroup = activeGroup || (
    initialTab ? (
      (['records', 'prescriptions', 'certs', 'labs'].includes(initialTab)) ? 'records' :
      (['packages', 'assistance', 'tourism'].includes(initialTab)) ? 'services' :
      (['registry', 'nurses', 'pharmacies', 'articles'].includes(initialTab)) ? 'discovery' : 'care'
    ) : 'care'
  );

  const [activeTab, setActiveTab] = useState<PatientDashboardTab>(() => {
    try {
      const pending = sessionStorage.getItem('medcred_patient_subtab') as PatientDashboardTab | null;
      if (pending) {
        sessionStorage.removeItem('medcred_patient_subtab');
        return pending;
      }
    } catch { /* ignore */ }
    return initialTab || PATIENT_GROUPS[currentGroup].defaultTab;
  });

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('medcred_patient_subtab') as PatientDashboardTab | null;
      if (pending) {
        sessionStorage.removeItem('medcred_patient_subtab');
        setActiveTab(pending);
        return;
      }
    } catch { /* ignore */ }
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
  const [cancelModal, setCancelModal] = useState<{ type: 'booking' | 'consult'; booking?: Booking; consultId?: string } | null>(null);

  // Care Concierge Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  // Modals & Messages
  const [paying, setPaying] = useState<Booking | null>(null);
  const [reading, setReading] = useState<{ id: string; articleId: string; title: string; doctor: string; note: string | null; seen: boolean }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Load Recommended Reading
  useEffect(() => {
    patientApi.getRecommendedReading().then(d => d?.status === 'success' && setReading(d.data));
  }, []);

  const patientUser: (PatientProfile & { avatarUrl?: string }) | null = (() => {
    try { return JSON.parse(localStorage.getItem('medi_user') || 'null'); } catch { return null; }
  })();

  const userName = currentUser?.name || patientUser?.name || 'there';
  const userAvatar = currentUser?.avatarUrl || patientUser?.avatarUrl || '/assets/patient_female_malay.jpg';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? tx('Good morning') : hour < 18 ? tx('Good afternoon') : tx('Good evening');

  // Load Primary Records Data
  const loadSummary = useCallback(async () => {
    const d = await patientApi.getMyRecords();
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
      patientApi.getOnCallStatus(),
      patientApi.getMyConsults(),
      patientApi.getPharmacies(),
      patientApi.getSupportTickets(),
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
  const recommendedSpecialists = matchRecommendedSpecialists(professionals, patientConditions, summary?.bp?.value1);

  const cancelBooking = (b: Booking) => {
    setCancelModal({ type: 'booking', booking: b });
  };

  const confirmCancelBooking = async (b: Booking) => {
    const d = await patientApi.cancelBooking(b.id);
    if (d?.status === 'success') {
      setBookings(prev => prev.map(x => (x.id === b.id ? d.data : x)));
      setMsg(d.message || tx('Appointment cancelled. Refund processed.'));
    } else setMsg(d?.message || tx('Could not cancel.'));
    setCancelModal(null);
  };

  const cancelActiveConsult = (id: string) => {
    setCancelModal({ type: 'consult', consultId: id });
  };

  const confirmCancelActiveConsult = async (id: string) => {
    const d = await patientApi.endConsult(id);
    if (d?.status === 'success') {
      setMsg(tx('Consultation request cancelled. Refund processed automatically.'));
      loadClinicalIntegrations();
    } else {
      setMsg(d?.message || tx('Failed to cancel consultation.'));
    }
    setCancelModal(null);
  };

  const removeSaved = (id: string) => { void savedStore.remove(id); };
  const restoreSaved = (id: string) => { void savedStore.add(id); };

  // Dispatch Prescription Handler
  const handleDispatchPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingRx || !selectedPharmacyId) return;
    setDispatchBusy(true);
    setDispatchResult(null);

    const data = await patientApi.dispatchPrescription(dispatchingRx.id, selectedPharmacyId, shareSafetyRecord);
    if (data?.status === 'success') {
      setDispatchResult({ ok: true, text: data.message || tx('Prescription transferred to pharmacy.') });
      loadSummary();
      setTimeout(() => {
        setDispatchingRx(null);
        setDispatchResult(null);
      }, 1500);
    } else {
      setDispatchResult({ ok: false, text: data?.message || tx('Could not transfer prescription.') });
    }
    setDispatchBusy(false);
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
        className="shrink-0 min-h-[48px] px-3.5 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors font-medium text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]"
        title={tx('Patient Help & Concierge Support Desk')}
      >
        <LifeBuoy className="h-4 w-4 text-slate-500" />
        <span className="whitespace-nowrap font-medium sm:font-semibold">{tx('Help & Support')}</span>
        {openTickets.length > 0 && (
          <span className="tabular-nums text-2xs min-w-[18px] text-center px-1.5 py-0.5 rounded-full font-semibold bg-[color:var(--t-600)] text-white leading-none">
            {openTickets.length}
          </span>
        )}
      </button>
    </div>
  );

  const navigateToTab = (tab: PatientDashboardTab) => {
    const tabToGroup: Record<PatientDashboardTab, PatientTabGroup> = {
      appointments: 'care',
      consult: 'care',
      messages: 'care',
      saved: 'care',
      records: 'records',
      prescriptions: 'records',
      labs: 'records',
      certs: 'records',
      registry: 'discovery',
      nurses: 'discovery',
      pharmacies: 'discovery',
      articles: 'discovery',
      packages: 'services',
      assistance: 'services',
      tourism: 'services',
    };
    const viewMap: Record<PatientTabGroup, string> = {
      care: 'patient_care',
      records: 'patient_records',
      services: 'patient_services',
      discovery: 'patient_discovery',
    };
    const grp = tabToGroup[tab] || 'care';
    try {
      sessionStorage.setItem('medcred_patient_subtab', tab);
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: viewMap[grp] }));
    setActiveTab(tab);
  };

  return (
    <div className="w-full space-y-0" id="patient-dashboard-root">
      {/* 2. INSTITUTIONAL PATIENT HEADER (HERO BANNER FULL WIDTH AS MAIN HEADER) */}
      <PatientHeroBanner
        userName={userName}
        userAvatar={userAvatar}
        greeting={greeting}
        groupName={PATIENT_GROUPS[currentGroup].name}
        upcomingCount={upcoming.length}
        nextVisitText={upcoming[0] ? tx('Next Visit: {name}, {date}', { name: upcoming[0].professionalName, date: upcoming[0].date }) : tx('No upcoming consultations')}
        activeRxCount={summary?.activeRx ?? '–'}
        careTeamCount={careTeam.length}
        bpSummary={summary?.bp}
        tabs={[
          { key: 'care' as PatientTabGroup, viewId: 'patient_care', icon: Heart, count: upcoming.length || undefined },
          { key: 'records' as PatientTabGroup, viewId: 'patient_records', icon: FolderHeart, count: activePrescriptions.length || undefined },
          { key: 'discovery' as PatientTabGroup, viewId: 'patient_discovery', icon: Search },
          { key: 'services' as PatientTabGroup, viewId: 'patient_services', icon: PackagePlus },
        ].map(g => ({
          id: g.key,
          label: tx(PATIENT_GROUPS[g.key].name),
          icon: g.icon,
          count: g.count,
          summary:
            g.key === 'care'
              ? tx('Upcoming visits, live consults, and your saved clinicians.')
              : g.key === 'records'
              ? tx('Verified EHR vitals, prescriptions, labs, and digital MCs.')
              : g.key === 'discovery'
              ? tx('Search MMC doctors, LJM nurses, and verified pharmacies.')
              : tx('Bundled screening plans, cost estimates, and medical travel.'),
          cta:
            g.key === 'care'
              ? { label: tx('Start Instant Consult'), onClick: () => { navigateToTab('consult'); setConsultSubTab('instant'); } }
              : g.key === 'records'
              ? { label: tx('View Prescriptions'), onClick: () => { setRxSubTab('active'); navigateToTab('prescriptions'); } }
              : g.key === 'discovery'
              ? { label: tx('Find a Doctor'), onClick: () => navigateToTab('registry') }
              : { label: tx('Browse Health Packages'), onClick: () => navigateToTab('packages') },
          activeSubTab: activeTab,
          onSubTabChange: (subId: string) => {
            const t = subId as PatientDashboardTab;
            window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: g.viewId }));
            setActiveTab(t);
            if (t === 'records') setRecordsSubTab('overview');
            if (t === 'prescriptions') setRxSubTab('active');
            if (t === 'certs') setCertsSubTab('mc');
            if (t === 'labs') setLabsSubTab('labs');
            if (t === 'consult') setConsultSubTab('instant');
          },
          subItems: PATIENT_GROUPS[g.key].tabs.map(tab => ({
            ...tab,
            label: tx(tab.label),
            description: tx(tab.description),
            count:
              tab.id === 'appointments'
                ? upcoming.length
                : tab.id === 'prescriptions'
                ? (activePrescriptions.length || undefined)
                : tab.id === 'saved'
                ? savedIds.length
                : undefined,
          })),
        }))}
        activeTab={currentGroup}
        onTabChange={(grp) => {
          const viewMap: Record<PatientTabGroup, string> = {
            care: 'patient_care',
            records: 'patient_records',
            services: 'patient_services',
            discovery: 'patient_discovery',
          };
          window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: viewMap[grp] }));
          setActiveTab(PATIENT_GROUPS[grp].defaultTab);
        }}
        tabsLabel={tx('{name} sections', { name: tx(PATIENT_GROUPS[currentGroup].name) })}
        onOpenHelp={onOpenHelp}
        openTicketsCount={openTickets.length}
        onConsultNow={() => {
          navigateToTab('consult');
          setConsultSubTab('instant');
        }}
        onOpenTriage={() => {
          navigateToTab('consult');
          setConsultSubTab('triage');
        }}
        onOpenRecords={() => {
          setRecordsSubTab('overview');
          navigateToTab('records');
        }}
      />

      {/* 3. MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse" aria-busy="true" aria-label={tx('Loading workspace section')}>
            <div className="h-20 bg-white border border-[color:var(--t-200)] p-4 flex items-center justify-between">
              <div className="space-y-2 w-1/2">
                <div className="h-3 w-28 bg-[color:var(--t-100)]" />
                <div className="h-5 w-64 bg-slate-200" />
              </div>
              <div className="h-9 w-36 bg-[color:var(--t-100)]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="h-24 bg-white border border-[color:var(--t-200)]" />
              <div className="h-24 bg-white border border-[color:var(--t-200)]" />
              <div className="h-24 bg-white border border-[color:var(--t-200)]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 h-72 bg-white border border-[color:var(--t-200)]" />
              <div className="lg:col-span-7 h-72 bg-white border border-[color:var(--t-200)]" />
            </div>
          </div>
        }
      >
        {/* NOTIFICATION / STATUS DISMISSAL */}
      {msg && (
        <div
          role="status"
          className="bg-[color:var(--t-50)] border border-[color:var(--t-300)] text-[color:var(--ink)] p-4 flex items-center justify-between gap-3 shadow-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4.5 w-4.5 text-[color:var(--t-600)] shrink-0" />
            <span className="text-xs font-bold leading-snug">{msg}</span>
          </div>
          <button
            type="button"
            className="text-xs font-bold text-[color:var(--t-600)] hover:text-white hover:bg-[color:var(--t-600)] px-3 py-1 bg-white border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer shrink-0"
            onClick={() => setMsg(null)}
          >
            {tx('Dismiss')}
          </button>
        </div>
      )}

      {/* 4. MAIN WORKSPACE VIEW */}
      {activeTab === 'appointments' && (
        <PatientAppointmentsTab
          bookings={bookings}
          upcoming={upcoming}
          past={past}
          professionals={professionals}
          appointmentsSubTab={appointmentsSubTab}
          setAppointmentsSubTab={setAppointmentsSubTab}
          activeConsult={activeConsult}
          cancelActiveConsult={cancelActiveConsult}
          onCallStatus={onCallStatus}
          summary={summary}
          recordsData={recordsData}
          patientAllergies={patientAllergies}
          onSelectProfessional={onSelectProfessional}
          onNavigateToMessages={onNavigateToMessages}
          onConsultNow={() => { navigateToTab('consult'); setConsultSubTab('instant'); }}
          onFindDoctors={() => navigateToTab('registry')}
          onOpenTriage={() => { navigateToTab('consult'); setConsultSubTab('triage'); }}
          onOpenPharmacies={() => navigateToTab('pharmacies')}
          onOpenVitals={() => { setRecordsSubTab('vitals'); navigateToTab('records'); }}
          onOpenRecordsOverview={() => { setRecordsSubTab('overview'); navigateToTab('records'); }}
          onOpenLiveRoom={() => { navigateToTab('consult'); setConsultSubTab('instant'); }}
          onOpenTriageTab={() => { navigateToTab('consult'); setConsultSubTab('triage'); }}
          onOpenRxRecords={() => { setRecordsSubTab('rx'); navigateToTab('records'); }}
          onPayBooking={setPaying}
          onCancelBooking={cancelBooking}
        />
      )}

      {/* 1. HEALTH RECORDS: CLINICAL PROFILE & VITALS */}
      {activeTab === 'records' && (
        <div id="panel-records" role="tabpanel" aria-labelledby="tab-records" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={FolderHeart}
            eyebrow={tx('Health record')}
            title={tx('Your health profile and readings')}
            description={tx('Your allergies, conditions, medicines and readings. You decide which doctors can see them.')}
            aside={
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 min-h-[44px] bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>{tx('Print this page')}</span>
              </button>
            }
            tabs={[
              { id: 'overview', label: tx('Profile'), icon: ClipboardList },
              { id: 'vitals', label: tx('Readings'), icon: Activity },
              { id: 'sharing', label: tx('Record Sharing & Consent'), icon: Share2 },
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
            eyebrow={tx('Pharmacy')}
            title={tx('Prescriptions & medicines')}
            description={tx('Send a prescription to a partner pharmacy, follow its progress, and keep the past ones.')}
            aside={
              <button
                type="button"
                onClick={() => navigateToTab('pharmacies')}
                className="px-3.5 min-h-[44px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Store className="h-3.5 w-3.5" />
                <span>{tx('Find a pharmacy')}</span>
              </button>
            }
            tabs={[
              { id: 'active', label: tx('Active'), icon: Pill, count: activePrescriptions.length },
              { id: 'history', label: tx('Past prescriptions'), icon: FileText },
            ]}
            activeTab={rxSubTab}
            onTabChange={setRxSubTab}
          />
          <PatientRecords
            activeSubTab={rxSubTab === 'history' ? 'rxhist' : 'rx'}
            onSubTabChange={t => setRxSubTab(t === 'rxhist' ? 'history' : 'active')}
            onOpenPharmacies={() => navigateToTab('pharmacies')}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {/* 3. CERTIFICATES & REFERRALS */}
      {activeTab === 'certs' && (
        <div id="panel-certs" role="tabpanel" aria-labelledby="tab-certs" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={FileText}
            eyebrow={tx('Certificates and referrals')}
            title={tx('Medical certificates & referrals')}
            description={tx('Each certificate has a code and QR that your employer can check online. The check shows the doctor\'s registration number and whether the certificate has been changed since it was signed.')}
            tabs={[
              { id: 'mc', label: tx('Medical Certificates (MC)'), icon: FileText },
              { id: 'referrals', label: tx('Referral Letters'), icon: HeartHandshake },
            ]}
            activeTab={certsSubTab}
            onTabChange={setCertsSubTab}
          />
          <PatientRecords
            activeSubTab={certsSubTab}
            onFindDoctors={() => navigateToTab('registry')}
            onBookSpecialist={(id) => { if (id) onSelectProfessional(id); else navigateToTab('registry'); }}
            hideHeaderTabs={true}
          />
        </div>
      )}

      {/* 4. LABS & DOCTOR NOTES */}
      {activeTab === 'labs' && (
        <div id="panel-labs" role="tabpanel" aria-labelledby="tab-labs" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={FlaskConical}
            eyebrow={tx('Clinical Diagnostics · Diagnostic Reports')}
            title={tx('Diagnostic Lab Reports & Doctor Clinical Notes')}
            description={tx('Pathology test results, blood analysis, radiology reports, and physician consultation summaries.')}
            badges={<BannerBadge tone="brand">{tx('Accredited Pathology')}</BannerBadge>}
            tabs={[
              { id: 'labs', label: tx('Lab Test Reports'), icon: FlaskConical },
              { id: 'notes', label: tx('Doctor Clinical Notes'), icon: FileText },
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
            eyebrow={tx('Telehealth network')}
            title={tx('Consult a doctor now')}
            description={tx('Chat or video with a doctor. If no doctor joins within 10 minutes you are refunded automatically.')}
            badges={
              onCall && onCall.onlineDoctors > 0 ? (
                <BannerBadge tone="success">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" /> {onCallLabel(onCall)}
                </BannerBadge>
              ) : (
                <span className="bg-amber-50 text-amber-900 border border-amber-300 text-2xs font-black uppercase px-2.5 py-0.5">{onCallLabel(onCall)}</span>
              )
            }
            tabs={[
              { id: 'instant', label: tx('Instant Video / Chat'), icon: Video },
              { id: 'triage', label: tx('AI Symptom Triage'), icon: Sparkles },
            ]}
            activeTab={consultSubTab}
            onTabChange={(t) => setConsultSubTab(t as any)}
          />
          {consultSubTab === 'instant' ? (
            <ConsultNow 
              myUserId={currentUser?.id} 
              embedded={true} 
              onNavigateToPrescriptions={() => navigateToTab('prescriptions')}
              onBookAppointment={() => navigateToTab('registry')}
            />
          ) : (
            <div className="space-y-4">
              <AISymptomMatcher
                onSelectSpecialty={(spec) => {
                  if (spec) setRegistrySpecialty(spec);
                  navigateToTab('registry');
                }}
                onApplyTriage={(triage) => {
                  if (triage?.specialty) setRegistrySpecialty(triage.specialty);
                  navigateToTab('registry');
                }}
                onConsultNow={() => setConsultSubTab('instant')}
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
            eyebrow={tx('Care messages')}
            title={tx('Patient Care Mailbox & Direct Messaging')}
            description={tx('Private messages with the doctors and nurses you have booked or consulted. Replies can take time. Not for emergencies: call 999.')}
            aside={
              <button
                type="button"
                onClick={() => navigateToTab('registry')}
                className="px-3.5 py-2 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>{tx('Find Doctor to Message')}</span>
              </button>
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
            eyebrow={tx('Personal Care Team · Saved Practitioners')}
            title={tx('Your Care Team & Saved Specialists')}
            description={tx('The doctors and nurses you have seen, and others you saved to book later.')}
            badges={<BannerBadge tone="brand">{tx('{a} seen · {b} saved', { a: careTeam.length, b: savedIds.length })}</BannerBadge>}
            aside={
              <button
                type="button"
                onClick={() => navigateToTab('registry')}
                className="px-3.5 h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{tx('Find a doctor or nurse')}</span>
              </button>
            }
            tabs={[
              { id: 'all', label: tx('All Care Team'), count: careTeam.length + savedIds.length },
              { id: 'doctors', label: tx('Doctors & Specialists'), count: professionals.filter(p => (savedIds.includes(p.id) || careTeam.some(c => c.id === p.id)) && p.role === UserRole.DOCTOR).length },
              { id: 'nurses', label: tx('Clinical Nurses'), count: professionals.filter(p => (savedIds.includes(p.id) || careTeam.some(c => c.id === p.id)) && p.role === UserRole.NURSE).length },
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
            onFindProviders={() => navigateToTab('registry')}
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
            eyebrow={tx('Preventive Health · Hospital Packages')}
            title={tx('Comprehensive Medical Screening & Treatment Packages')}
            description={tx('Curated healthcare packages from accredited private hospitals and specialist clinics across Malaysia.')}
            badges={<BannerBadge tone="brand">{tx('Price Transparent')}</BannerBadge>}
            aside={
              <a
                href="/packages"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/packages');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                <PackagePlus className="h-4 w-4" />
                <span>{tx('Explore Full Marketplace & Directory')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            }
            tabs={[
              { id: 'packages', label: tx('Medical Packages') },
              { id: 'promotions', label: tx('Promotions & Offers') },
              { id: 'facilities', label: tx('Facilities & Infrastructure') },
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
            eyebrow={tx('Financial Transparency · Pro-Forma Estimates')}
            title={tx('Itemized Treatment Quotes & Financial Aid')}
            description={tx('Request an itemized hospital fee breakdown before admission, convert currencies, or apply insurance guarantee letters (GL). Free and non-binding.')}
            badges={<BannerBadge tone="brand">{tx('Multi-Currency Estimate')}</BannerBadge>}
            tabs={[
              { id: 'enquiry', label: tx('Request Cost Quote') },
              { id: 'cases', label: tx('My Quotations & GLs') },
              { id: 'guide', label: tx('Billing & Aid Guide') },
              ...(currentUser ? [] : [{ id: 'track', label: tx('Track Quote Code') }]),
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
            eyebrow={tx('MHTC Accredited · International Patient Concierge')}
            title={tx('Medical Travel & Accredited Hospital Directory')}
            description={tx('Explore JCI and MSQH accredited destination hospitals across Malaysia with airport transfer, medical visa support, and interpreter services.')}
            badges={<BannerBadge tone="brand">{tx('JCI / MSQH Accredited')}</BannerBadge>}
            tabs={[
              { id: 'find', label: tx('Accredited Hospitals') },
              { id: 'cases', label: tx('Travel Cases & Admissions') },
              { id: 'info', label: tx('Visa & Arrival Checklist') },
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
            eyebrow={tx('Pharmacy Registry · Poison Licences')}
            title={tx('Licensed Pharmacy Dispensary Network')}
            description={tx('Locate Type A Poison Licensed retail pharmacies and hospital dispensaries for prescription fulfillment and delivery.')}
            badges={<BannerBadge tone="brand">{tx('Type A Poison Licensed')}</BannerBadge>}
            tabs={[
              { id: 'all', label: tx('All Dispensaries'), count: pharmacies.length },
              { id: 'delivery', label: tx('Home Delivery Licensed') },
              { id: 'open24', label: tx('24-Hour Emergency') },
            ]}
            activeTab={pharmaciesSubTab}
            onTabChange={setPharmaciesSubTab}
          />
          <PharmacyFinder embedded={true} filterTab={pharmaciesSubTab} />
        </div>
      )}

      {/* 12. MEDICAL LIBRARY TAB */}
      {activeTab === 'articles' && (
        <div id="panel-articles" role="tabpanel" tabIndex={0} className="space-y-4">
          <WorkspaceHeader
            icon={BookOpen}
            eyebrow={tx('Patient Health Guides · Evidence-Based Medicine')}
            title={tx('Clinical Health Library & Patient Guides')}
            description={tx('Physician-authored, evidence-based medical articles, disease management guides, and clinical wellness advice.')}
            badges={<BannerBadge tone="brand">{tx('Doctor Reviewed')}</BannerBadge>}
            aside={
              <button
                type="button"
                onClick={() => navigateToTab('registry')}
                className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{tx('Find Article Author')}</span>
              </button>
            }
          />
          {reading.length > 0 && (
            <section
              aria-label={tx('Prescribed reading from your doctor')}
              className="bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[color:var(--t-100)]">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[color:var(--t-600)]" />
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-[color:var(--ink)]">
                    {tx('Prescribed Reading from Your Care Team')}
                  </h3>
                </div>
                <span className="text-2xs font-mono font-bold px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                  {reading.length} {tx('Assigned')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reading.map(r => (
                  <div
                    key={r.id}
                    className="p-3 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-display font-bold text-xs text-[color:var(--ink)] truncate">{r.title}</p>
                      <p className="text-2xs text-slate-600 font-medium">
                        {tx('Recommended by {doctor}', { doctor: r.doctor })}
                      </p>
                      {r.note && <p className="text-xs text-slate-700 italic">“{r.note}”</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenArticle(r.articleId)}
                      className="shrink-0 h-8 px-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>{tx('Read')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          <MedicalLibrary
            embedded={true}
            articles={articles || INITIAL_ARTICLES}
            professionals={professionals}
            onFindDoctor={() => {
              navigateToTab('registry');
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
              eyebrow={tx('National Medical Registry · Doctor Directory')}
              title={tx('Verified Malaysian Doctors & Specialists')}
              description={tx('Directory of registered physicians verified directly against the Malaysian Medical Council (MMC) database with active Annual Practising Certificates (APC).')}
              badges={<BannerBadge tone="success"><CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" /> {tx('MMC Verified')}</BannerBadge>}
              aside={
                <button
                  type="button"
                  onClick={() => navigateToTab('nurses')}
                  className="px-3.5 h-10 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>{tx('Browse Clinical Nurses')}</span>
                </button>
              }
              tabs={[
                { id: 'all', label: tx('All Specialists'), count: allDoctors.length },
                { id: 'telehealth', label: tx('Available for Telehealth'), count: allDoctors.filter(d => d.consultationModes?.includes(ConsultationMode.VIDEO)).length },
                { id: 'specialists', label: tx('Consultant Physicians'), count: allDoctors.filter(d => d.specialization?.toLowerCase() !== 'general physician').length },
              ]}
              activeTab={registrySubTab}
              onTabChange={setRegistrySubTab}
            />

            {/* Unified Single-Row Filter Control Bar */}
            <section aria-label={tx('Filter doctors')} className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-[999_1_300px] min-w-[min(100%,300px)]">
                  <label htmlFor="registry-doctor-search" className="sr-only">{tx('Search doctors')}</label>
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="registry-doctor-search"
                    type="text"
                    placeholder={tx('Search by doctor name, specialty, hospital, city, or MMC number…')}
                    value={registryQuery}
                    onChange={e => setRegistryQuery(e.target.value)}
                    className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  />
                  {registryQuery && (
                    <button
                      type="button"
                      onClick={() => setRegistryQuery('')}
                      aria-label={tx('Clear search query')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Dropdown Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-auto max-w-full">
                  <FilterSelect
                    label={tx('Specialty')}
                    value={selectedSpecialtyFilter ? selectedSpecialtyFilter : registrySpecialty}
                    onChange={val => {
                      if (selectedSpecialtyFilter && onClearSpecialtyFilter) onClearSpecialtyFilter();
                      setRegistrySpecialty(val);
                    }}
                  >
                    <option value="all">{tx('All Specialties ({n})', { n: doctorSpecialties.length })}</option>
                    {doctorSpecialties.map(spec => (
                      <option key={spec} value={spec}>{tx(spec)}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label={tx('City')} value={registryCity} onChange={setRegistryCity}>
                    <option value="all">{tx('All Cities ({n})', { n: doctorCities.length })}</option>
                    {doctorCities.map(c => (
                      <option key={c} value={c}>{tx(c)}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label={tx('Sort by')} value={registrySort} onChange={v => setRegistrySort(v as any)}>
                    <option value="rating">{tx('Highest Rated')}</option>
                    <option value="experience">{tx('Most Experienced')}</option>
                    <option value="fee_asc">{tx('Fee: Low to High')}</option>
                    <option value="fee_desc">{tx('Fee: High to Low')}</option>
                  </FilterSelect>
                </div>
              </div>

              {/* Active Filter Summary & Result Counter Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
                    {tx('Showing')} <strong className="font-black text-[color:var(--ink)]">{filteredDoctors.length}</strong> {tx(allDoctors.length === 1 ? 'of {n} verified doctor' : 'of {n} verified doctors', { n: allDoctors.length })}
                  </span>
                  {effectiveSpecialty && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {selectedSpecialtyFilter ? tx('AI Triage: ') : tx('Specialty: ')}{effectiveSpecialty}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSpecialtyFilter && onClearSpecialtyFilter) onClearSpecialtyFilter();
                          setRegistrySpecialty('all');
                        }}
                        className="hover:text-slate-900 cursor-pointer"
                        aria-label={tx('Clear specialty filter')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {registryCity !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {tx('City: ')}{registryCity}
                      <button type="button" onClick={() => setRegistryCity('all')} className="hover:text-slate-900 cursor-pointer" aria-label={tx('Clear city filter')}>
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
                    {tx('Reset Filters')}
                  </button>
                )}
              </div>
            </section>

            {filteredDoctors.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2.5">
                <Search className="h-8 w-8 text-[color:var(--t-300)] mx-auto" />
                <p className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">{tx('No doctors match your current filter criteria')}</p>
                <p className="text-xs text-slate-500">{tx('Try clearing your specialty or city filter to see all registered practitioners.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDoctors.map(prof => (
                  <article key={prof.id} className="app-card-interactive app-card-equal p-5 group">
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        <UserAvatar src={prof.avatar} role="doctor" alt={prof.name} className="w-12 h-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <button type="button" onClick={() => onSelectProfessional(prof.id)} className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left truncate block cursor-pointer">
                              {prof.name}
                            </button>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {prof.rating > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-2xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" /> {prof.rating.toFixed(1)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => (savedIds.includes(prof.id) ? removeSaved(prof.id) : restoreSaved(prof.id))}
                                aria-label={savedIds.includes(prof.id) ? tx('Remove from My Care Team') : tx('Save to My Care Team')}
                                title={savedIds.includes(prof.id) ? tx('Saved in My Care Team') : tx('Save to My Care Team')}
                                className={`h-6 w-6 inline-flex items-center justify-center border transition-colors cursor-pointer ${
                                  savedIds.includes(prof.id)
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-white text-slate-400 border-[color:var(--t-200)] hover:text-rose-600 hover:border-rose-200'
                                }`}
                              >
                                <Heart className={`h-3 w-3 ${savedIds.includes(prof.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[color:var(--t-700)] font-bold mt-0.5">{tx(prof.specialization)}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                              {tx('MMC Verified · Active')}
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
                            <span className="truncate">{prof.practiceAddress ? `${prof.practiceAddress}${prof.city && !prof.practiceAddress.includes(prof.city) ? `, ${tx(prof.city)}` : ''}` : tx(prof.city)}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-0.5">
                            {tx('{n} yrs exp', { n: prof.experienceYears })}
                          </span>
                          {prof.consultationModes?.map(mode => (
                            <span key={mode} className="text-2xs font-bold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                              {tx(String(mode))}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[color:var(--t-100)] flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 block">{tx('Consultation Fee')}</span>
                        <span className="font-mono text-xs font-extrabold text-[color:var(--ink)]">RM {prof.fee}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(prof.id)}
                        className="btn btn-sm btn-primary whitespace-nowrap shrink-0"
                      >
                        <span>{tx('Book Visit')}</span>
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
              eyebrow={tx('National Nursing Registry · Clinical Nurses')}
              title={tx('LJM Registered Staff Nurses & Care Providers')}
              description={tx('Verified professional nurses registered with the Lembaga Jururawat Malaysia (LJM) for clinic care, home nursing, and wound dressing.')}
              badges={<BannerBadge tone="success"><CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" /> {tx('LJM Verified')}</BannerBadge>}
              aside={
                <button
                  type="button"
                  onClick={() => navigateToTab('registry')}
                  className="px-3.5 h-10 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--ink)] text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>{tx('Browse Doctors & Specialists')}</span>
                </button>
              }
              tabs={[
                { id: 'all', label: tx('All Registered Nurses'), count: allNurses.length },
                { id: 'homecare', label: tx('Home Care & Private Nursing'), count: allNurses.filter(n => n.consultationModes?.includes(ConsultationMode.HOME_VISIT)).length },
                { id: 'clinic', label: tx('Clinical & Hospital'), count: allNurses.filter(n => n.consultationModes?.includes(ConsultationMode.IN_PERSON)).length },
              ]}
              activeTab={nursesSubTab}
              onTabChange={setNursesSubTab}
            />

            {/* Unified Single-Row Filter Control Bar */}
            <section aria-label={tx('Filter nurses')} className="bg-white border border-[color:var(--t-200)] rounded-none p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-[999_1_300px] min-w-[min(100%,300px)]">
                  <label htmlFor="registry-nurse-search" className="sr-only">{tx('Search nurses')}</label>
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="registry-nurse-search"
                    type="text"
                    placeholder={tx('Search by nurse name, nursing specialty, city, or LJM number…')}
                    value={nursesQuery}
                    onChange={e => setNursesQuery(e.target.value)}
                    className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  />
                  {nursesQuery && (
                    <button
                      type="button"
                      onClick={() => setNursesQuery('')}
                      aria-label={tx('Clear nurse search')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Dropdown Controls */}
                <div className="flex flex-wrap items-center gap-2.5 flex-auto max-w-full">
                  <FilterSelect label={tx('Specialty')} value={nursesSpecialty} onChange={setNursesSpecialty}>
                    <option value="all">{tx('All Specialties ({n})', { n: nurseSpecialties.length })}</option>
                    {nurseSpecialties.map(spec => (
                      <option key={spec} value={spec}>{tx(spec)}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label={tx('City')} value={nursesCity} onChange={setNursesCity}>
                    <option value="all">{tx('All Cities ({n})', { n: nurseCities.length })}</option>
                    {nurseCities.map(c => (
                      <option key={c} value={c}>{tx(c)}</option>
                    ))}
                  </FilterSelect>

                  <FilterSelect label={tx('Sort by')} value={nursesSort} onChange={v => setNursesSort(v as any)}>
                    <option value="rating">{tx('Highest Rated')}</option>
                    <option value="experience">{tx('Most Experienced')}</option>
                    <option value="fee_asc">{tx('Rate: Low to High')}</option>
                    <option value="fee_desc">{tx('Rate: High to Low')}</option>
                  </FilterSelect>
                </div>
              </div>

              {/* Active Filter Summary & Result Counter Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 tabular-nums" aria-live="polite">
                    {tx('Showing')} <strong className="font-black text-[color:var(--ink)]">{filteredNurses.length}</strong> {tx(allNurses.length === 1 ? 'of {n} registered nurse' : 'of {n} registered nurses', { n: allNurses.length })}
                  </span>
                  {nursesSpecialty !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {tx('Specialty: ')}{nursesSpecialty}
                      <button type="button" onClick={() => setNursesSpecialty('all')} className="hover:text-slate-900 cursor-pointer" aria-label={tx('Clear nurse specialty filter')}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {nursesCity !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-2xs font-black uppercase tracking-wider">
                      {tx('City: ')}{nursesCity}
                      <button type="button" onClick={() => setNursesCity('all')} className="hover:text-slate-900 cursor-pointer" aria-label={tx('Clear nurse city filter')}>
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
                    {tx('Reset Filters')}
                  </button>
                )}
              </div>
            </section>

            {filteredNurses.length === 0 ? (
              <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2.5">
                <UserCheck className="h-8 w-8 text-[color:var(--t-300)] mx-auto" />
                <p className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">{tx('No clinical nurses match your filter criteria')}</p>
                <p className="text-xs text-slate-500">{tx('Try resetting your specialty or city filter to browse all registered nurses.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredNurses.map(prof => (
                  <article key={prof.id} className="app-card-interactive app-card-equal p-5 group">
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3">
                        <UserAvatar src={prof.avatar} role="nurse" alt={prof.name} className="w-12 h-12 rounded-full object-cover border border-[color:var(--t-200)] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <button type="button" onClick={() => onSelectProfessional(prof.id)} className="font-display font-extrabold text-xs text-[color:var(--ink)] hover:text-[color:var(--t-600)] text-left truncate block cursor-pointer">
                              {prof.name}
                            </button>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {prof.rating > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-2xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" /> {prof.rating.toFixed(1)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => (savedIds.includes(prof.id) ? removeSaved(prof.id) : restoreSaved(prof.id))}
                                aria-label={savedIds.includes(prof.id) ? tx('Remove from My Care Team') : tx('Save to My Care Team')}
                                title={savedIds.includes(prof.id) ? tx('Saved in My Care Team') : tx('Save to My Care Team')}
                                className={`h-6 w-6 inline-flex items-center justify-center border transition-colors cursor-pointer ${
                                  savedIds.includes(prof.id)
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-white text-slate-400 border-[color:var(--t-200)] hover:text-rose-600 hover:border-rose-200'
                                }`}
                              >
                                <Heart className={`h-3 w-3 ${savedIds.includes(prof.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[color:var(--t-700)] font-bold mt-0.5">{tx(prof.specialization || 'Clinical Staff Nurse')}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                              {tx('LJM Verified · Active')}
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
                            <span className="truncate">{prof.practiceAddress ? `${prof.practiceAddress}${prof.city && !prof.practiceAddress.includes(prof.city) ? `, ${tx(prof.city)}` : ''}` : tx(prof.city)}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-2 py-0.5">
                            {tx('{n} yrs exp', { n: prof.experienceYears })}
                          </span>
                          {prof.consultationModes?.map(mode => (
                            <span key={mode} className="text-2xs font-bold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">
                              {tx(String(mode))}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[color:var(--t-100)] flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 block">{tx('Care Rate')}</span>
                        <span className="font-mono text-xs font-extrabold text-[color:var(--ink)]">RM {prof.fee || 60} / hr</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(prof.id)}
                        className="btn btn-sm btn-primary whitespace-nowrap shrink-0"
                      >
                        <span>{tx('Book Nurse')}</span>
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
                    {tx('Dispatch Prescription to Pharmacy')}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">RX CODE: {dispatchingRx.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDispatchingRx(null); setDispatchResult(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label={tx('Close dialog')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PRESCRIPTION DETAILS */}
            <div className="p-3 bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] text-xs space-y-1">
              <p className="font-bold text-[color:var(--ink)]">
                {Array.isArray(dispatchingRx.items) && dispatchingRx.items[0]?.name ? dispatchingRx.items[0].name : dispatchingRx.diagnosis || tx('Prescribed Medicine')}
              </p>
              {Array.isArray(dispatchingRx.items) && dispatchingRx.items[0]?.instructions && (
                <p className="text-slate-600 font-medium">{dispatchingRx.items[0].instructions}</p>
              )}
              <p className="text-xs font-mono text-slate-500 pt-0.5">
                {tx('Prescribing Doctor: {name}', { name: dispatchingRx.doctor?.name || tx('Verified Physician') })}
              </p>
            </div>

            <form onSubmit={handleDispatchPrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  {tx('Select Partner Pharmacy for Dispensing:')}
                </label>
                {pharmacies.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 bg-slate-50 border border-slate-200">
                    {tx('Loading partner pharmacies…')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {pharmacies.map(p => (
                      <label
                        key={p.id}
                        className={`block p-3 border cursor-pointer transition-colors ${
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
                  {tx('Authorize pharmacist to view documented drug allergies & conditions for safety cross-checking.')}
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
                  {tx('Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={dispatchBusy || !selectedPharmacyId}
                  className="min-h-[40px] px-5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-50 text-white text-xs font-black shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{dispatchBusy ? tx('Transmitting…') : tx('Confirm Dispatch to Pharmacy')}</span>
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
          description={tx('Appointment with {name} on {date}, {slot}', { name: paying.professionalName, date: paying.date, slot: paying.timeSlot })}
          onCancel={() => setPaying(null)}
          onPaid={() => { 
            setBookings(prev => prev.map(x => (x.id === paying.id ? { ...x, paymentStatus: 'Paid' as const } : x))); 
            setPaying(null); 
          }} 
        />
      )}

      {/* STATUTORY CANCELLATION & REFUND MODAL */}
      {cancelModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className="bg-white border-2 border-slate-900 shadow-2xl max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <h3 id="cancel-dialog-title" className="font-display font-black text-base text-slate-900">
                  {cancelModal.type === 'booking' ? tx('Confirm Appointment Cancellation') : tx('Cancel Teleconsultation Request')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label={tx('Close dialog')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {cancelModal.type === 'booking' ? (
                tx('Are you sure you want to cancel your scheduled visit with {name}? Under MOH statutory telehealth regulations, cancellations made >24 hours prior are 100% refunded to your original payment method.', { name: cancelModal.booking?.professionalName || tx('your doctor') })
              ) : (
                tx('Are you sure you want to cancel this instant on-call consultation request? If your practitioner has not entered the consultation room, a 100% full refund is credited back immediately.')
              )}
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              <span className="font-bold block mb-0.5">{tx('Statutory SLA Guarantee')}</span>
              <span>{tx('Act 586 statutory patient protection guarantees automated refund reconciliation.')}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {tx('Keep Appointment')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cancelModal.type === 'booking' && cancelModal.booking) {
                    confirmCancelBooking(cancelModal.booking);
                  } else if (cancelModal.type === 'consult' && cancelModal.consultId) {
                    confirmCancelActiveConsult(cancelModal.consultId);
                  }
                }}
                className="px-4 py-2 text-xs font-black text-white bg-rose-700 hover:bg-rose-800 shadow-xs transition-colors cursor-pointer"
              >
                {tx('Confirm Cancellation & Refund')}
              </button>
            </div>
          </div>
        </div>
      )}
      </Suspense>
      </div>
    </div>
  );
}
