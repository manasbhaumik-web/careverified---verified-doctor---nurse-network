import React, { useState, useEffect, useRef } from 'react';
import { setLocale, useLocale, useT } from '../locale';
import { HERO_TR } from '../locale/landing';
import PatientAccess from './PatientAccess';
import TouristAccess from './TouristAccess';
import VerificationScopeBadge from './VerificationScopeBadge';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react';
import {
  ShieldCheck, Search, CheckCircle2, RefreshCw,
  AlertTriangle, ArrowRight, Lock, AlertCircle, PlusCircle,
  Building, ChevronRight, Zap, Globe, Award, FileText,
  Stethoscope, Activity, Check,
  Clock, PhoneCall, Pill, Hospital, ChevronLeft, ChevronDown, UserCheck, Users
} from 'lucide-react';
import { DoctorProfile, NurseProfile } from '../types';
import { loginUrl, navigate } from '../nav';
import Footer from './Footer';
import heroBgImage from '../../assets/medical_hero_bg.jpg';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface LandingPageProps {
  professionals: (DoctorProfile | NurseProfile)[];
}

// ─────────────────────────────────────────────
// MedCred Medical Cross mark (solid iconic emblem)
// ─────────────────────────────────────────────
function Cross({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Animated Counter Hook
// ─────────────────────────────────────────────
function useCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || hasStarted.current) return;
    hasStarted.current = true;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration, startOnView]);

  return { count, ref };
}

// ─────────────────────────────────────────────
// Section Wrapper with Entrance Animation (Item 8)
// ─────────────────────────────────────────────
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number; key?: React.Key }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Stagger Item with 60ms Staggered Reveal (Item 8)
// ─────────────────────────────────────────────
function StaggerItem({ children, className = '', index = 0 }: { children: React.ReactNode; className?: string; index?: number; key?: React.Key }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.4,
        delay: shouldReduceMotion ? 0 : Math.min(index * 0.06, 0.36),
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// PROFESSIONAL MEDICAL ASSISTANCE MODULES DATA
// ─────────────────────────────────────────────
const PROFESSIONAL_ASSISTANCE_MODULES = [
  {
    id: 'telehealth',
    title: 'Attentive Doctor Consultations',
    tagline: 'Gentle, unhurried care with doctors ready to listen',
    icon: PhoneCall,
    badge: 'Video or Chat',
    summary: 'Connect from the comfort of home with a caring, board-verified doctor. Take all the time you need to share your symptoms in a calm, supportive setting. For severe medical emergencies, please dial 999 first.',
    highlights: [
      'Doctors are verified individually by our medical board before caring for patients',
      'Automatic refund guarantee if an on-call doctor cannot join within 10 minutes',
      'Immediate 999 emergency safety routing whenever red-flag symptoms arise'
    ],
    metricValue: 'Warm Care',
    metricLabel: 'Attentive, unhurried consultations',
    ctaText: 'Consult a Caring Doctor',
    href: '/login'
  },
  {
    id: 'credential',
    title: 'Careful Credential Verification',
    tagline: 'Hand-checked licences to protect you and your loved ones',
    icon: ShieldCheck,
    badge: 'Board Reviewed',
    summary: 'Your peace of mind is our sacred trust. Before any physician or nurse joins MedCred, our medical board carefully verifies their statutory licence and practising certificate against official registers by hand.',
    highlights: [
      'Continuous Annual Practising Certificate (APC) expiry tracking',
      'Regular 12-month re-verification to maintain patient safety',
      'Public register shows only in-good-standing, verified practitioners'
    ],
    metricValue: 'Every Doctor',
    metricLabel: 'Verified by hand before caring for you',
    ctaText: 'Verify a Practitioner',
    href: '#verify-section'
  },
  {
    id: 'prescriptions',
    title: 'Safety-Checked E-Prescriptions',
    tagline: 'Doctor-signed prescriptions delivered with care',
    icon: Pill,
    badge: 'Doctor-Signed',
    summary: 'Receive doctor-signed digital prescriptions with built-in allergy and drug interaction checks. Pick up medicine easily at your trusted neighbourhood pharmacy or request thoughtful delivery.',
    highlights: [
      'Every prescription carries a cryptographic QR code that pharmacies can check',
      'Automated allergy and interaction safety checks before any medication is issued',
      'You choose your preferred neighbourhood community pharmacy'
    ],
    metricValue: 'Safe QR',
    metricLabel: 'Every prescription verified for safety',
    ctaText: 'View Your Prescriptions',
    href: '/login'
  },
  {
    id: 'records',
    title: 'Personal Health Records & Care Vault',
    tagline: 'Your health story, protected with dignity under PDPA 2010',
    icon: Lock,
    badge: 'Protected & Private',
    summary: 'Keep your consultation summaries, vital readings, and family medical histories safely guarded in one private space. You always stay in complete control of who views your records.',
    highlights: [
      'Full patient ownership of health data under Malaysian PDPA 2010',
      'Share temporary, encrypted summaries with family doctors or outside specialists',
      'Track your vitals, care notes, and recovery milestones over time'
    ],
    metricValue: 'PDPA 2010',
    metricLabel: 'Complete, patient-centred privacy',
    ctaText: 'Open Member Portal',
    href: '/login'
  }
];

type PortalRole = 'patient' | 'practitioner' | 'admin' | 'pharmacy';
type Icon = React.ComponentType<{ className?: string }>;



// ─────────────────────────────────────────────
// PHASE 1: QUANTIFIED OUTCOME METRICS (Data-Driven Authority Strip)
// ─────────────────────────────────────────────
function StatCounter({ end, duration = 1800, suffix = '', prefix = '' }: { end: number; duration?: number; suffix?: string; prefix?: string }) {
  const { count, ref } = useCounter(end, duration);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count}{suffix}
    </span>
  );
}

const QUANTIFIED_METRICS = [
  {
    icon: Clock,
    valueComponent: <StatCounter end={10} suffix=" min" />,
    label: 'Prompt Care or Full Refund',
    subtext: 'If an on-call doctor cannot join your consultation within 10 minutes, your payment is refunded automatically with our apologies',
    badge: 'Our Promise',
  },
  {
    icon: ShieldCheck,
    valueComponent: <StatCounter end={100} suffix="%" />,
    label: 'Hand-Checked Practitioners',
    subtext: 'Every doctor and nurse is checked against official council registers before caring for you and your family',
    badge: 'Verified for You',
  },
  {
    icon: RefreshCw,
    valueComponent: <StatCounter end={12} suffix=" mo" />,
    label: 'Continuous Safety Oversight',
    subtext: 'Continuous verification and APC expiry monitoring to ensure you always receive safe, compliant medical care',
    badge: 'Continuous Care',
  },
  {
    icon: Zap,
    valueComponent: <StatCounter end={100} suffix="%" />,
    label: 'Doctor-Signed Prescriptions',
    subtext: 'Every prescription carries a cryptographic QR code and allergy check for your peace of mind',
    badge: 'Safe Dispensing',
  },
];

// ─────────────────────────────────────────────
// What the checks are built on. These are references, not partnerships.
// ─────────────────────────────────────────────
const TRUST_PARTNERS = [
  {
    title: 'Malaysian Medical Council (MMC) Register',
    category: 'Doctor Verification',
    status: 'Checked by hand before profile activation',
    icon: ShieldCheck,
  },
  {
    title: 'MoH & MMC Clinical Telemedicine Guidance',
    category: 'Patient Safety',
    status: 'Strict boundaries for safe clinical care',
    icon: Building,
  },
  {
    title: 'Personal Data Protection Act 2010',
    category: 'Your Privacy',
    status: 'Your health history is strictly confidential',
    icon: Lock,
  },
  {
    title: 'Poisons Act 1952 Dispensing Protocols',
    category: 'Pharmacy Care',
    status: 'Verified community pharmacies check every code',
    icon: Pill,
  },
  {
    title: 'Medical Board Audit & Incident Review',
    category: 'Caring Governance',
    status: 'Independent oversight focused on patient well-being',
    icon: Award,
  },
];

const HOW_STEPS = [
  { title: 'Tell us how you are feeling', text: 'Register in minutes with your MyKad or passport. Clear upfront fees and no complicated apps to install.' },
  { title: 'Speak with a dedicated doctor', text: 'Consult unhurriedly via video or chat in your browser with a verified doctor who is online and ready to listen.' },
  { title: 'Receive medicine & recovery guidance', text: 'Have doctor-signed prescriptions sent to your chosen pharmacy, and keep your care summary safe in your record.' },
];

// ─────────────────────────────────────────────
// HERO SLIDES: one per audience. Slide 1 is the original hero.
// ─────────────────────────────────────────────
const hl = (t: string) => <span className="text-[color:var(--t-600)]">{t}</span>;

interface HeroCardData {
  label: string;
  title: string;
  status: string;
  person: { img?: string; icon?: Icon; name: string; line1: string; line2: string };
  rows: { k: string; v: string; kind?: 'mono' | 'ok' }[];
  footId: string;
}

interface HeroSlide {
  id: string;
  pill: string;
  headline: React.ReactNode;
  body: React.ReactNode;
  cta: { label: string; role?: PortalRole; register?: boolean; href?: string };
  chips: string[];
  card: HeroCardData;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'network',
    pill: 'Gentle Doctor Consultations',
    headline: <>Thoughtful {hl('medical care & verified doctors')} <span className="text-black">always by your side.</span></>,
    body: <>When you or your loved ones feel unwell, MedCred connects you gently with <span className="text-[color:var(--t-600)] font-bold">board-verified doctors</span> across Malaysia for <span className="text-black font-bold">unhurried video or chat consultations</span>, doctor-signed e-prescriptions, and caring support.</>,
    cta: { label: 'Talk With a Caring Doctor', role: 'patient', register: true },
    chips: ['Attentive, unhurried consultations', 'Every doctor manually verified', 'Doctor-signed e-prescriptions'],
    card: {
      label: 'Verified Doctor on Call',
      title: 'Attentive Clinical Care',
      status: 'Verified Active',
      person: { img: '/assets/malaysian_male_doctor.jpg', name: 'Dr. Tan Seng Hock', line1: 'Senior Specialist · MMC Registered', line2: 'Kuala Lumpur Specialist Hospital' },
      rows: [
        { k: 'Council Registration', v: 'DEMO-MMC-32109', kind: 'mono' },
        { k: 'Statutory Standing', v: 'Good Standing · Active APC', kind: 'ok' },
        { k: 'Consultation Mode', v: 'Unhurried Video or Chat' },
      ],
      footId: '8F2A-9912',
    },
  },
  {
    id: 'prescriptions',
    pill: 'Neighbourhood Pharmacy & Care',
    headline: <>Carefully reviewed {hl('e-prescriptions')}, ready at <span className="text-black">your trusted pharmacy.</span></>,
    body: <>Your safety is our first priority. Receive doctor-signed <span className="text-[color:var(--t-600)] font-bold">digital e-prescriptions with safety allergy checks</span>, ready for pickup at your neighbourhood pharmacy or gentle delivery to your home.</>,
    cta: { label: 'Register for Patient Care', role: 'patient', register: true },
    chips: ['Safety & allergy checks', 'Doctor-signed QR code', 'Neighbourhood pharmacy pickup'],
    card: {
      label: 'Doctor-Signed E-Prescription',
      title: 'Safety-Checked Dispensing',
      status: 'Valid & Clear',
      person: { icon: Pill, name: 'Amoxicillin 500 mg', line1: '1 capsule, 3 times daily · 7 days', line2: 'Signed by Dr. Tan Seng Hock' },
      rows: [
        { k: 'Prescription Code', v: 'RX-7K4M-92QA', kind: 'mono' },
        { k: 'Allergy & Drug Safety', v: 'Allergies & interactions clear', kind: 'ok' },
        { k: 'Fulfilment Method', v: 'Trusted Community Pharmacy' },
      ],
      footId: 'RX-7K4M',
    },
  },
  {
    id: 'members',
    pill: 'Privacy & Gentle Record Keeping',
    headline: <>Your personal health story, {hl('protected with respect and care.')}</>,
    body: <>Keep your health history, vital readings, and consultation summaries guarded in a <span className="text-[color:var(--t-600)] font-bold">private vault under PDPA 2010</span>. You remain in <span className="text-black font-bold">complete, dignified control</span> over who sees your health records.</>,
    cta: { label: 'Join Our Caring Community', role: 'patient', register: true },
    chips: ['10-min refund guarantee', 'Protected under PDPA 2010', 'You own your health story'],
    card: {
      label: 'Confidential Health Vault',
      title: 'Personal Health Records',
      status: 'PDPA Protected',
      person: { icon: ShieldCheck, name: 'Patient Medical Vault', line1: 'Protected under Malaysian PDPA 2010', line2: 'Encrypted patient health history' },
      rows: [
        { k: 'Patient Ownership', v: 'Full Patient Control', kind: 'ok' },
        { k: 'Vault Security', v: 'AES-256 Encrypted Cloud' },
        { k: 'Record Sharing', v: 'Time-Limited Links You Control' },
      ],
      footId: 'PHR-2026',
    },
  },
  {
    id: 'tourism',
    pill: 'Warm Welcome For International Patients',
    headline: <>Malaysia’s accredited {hl('hospitals & specialist care')}, with <span className="text-black">transparent itemised quotes.</span></>,
    body: <>We are honoured to help you plan specialist treatment across <span className="text-[color:var(--t-600)] font-bold">Kuala Lumpur, Penang, Johor Bahru &amp; Melaka</span>. Register with your <span className="text-black font-bold">international passport</span> for pre-travel specialist video reviews and hospital quotes before you travel.</>,
    cta: { label: 'Explore Accredited Hospitals', href: '#tourist-section' },
    chips: ['Passport registration with care', 'JCI & MSQH accredited facilities', 'Transparent MYR & FX quotes'],
    card: {
      label: 'Accredited Hospital Network',
      title: 'International Care Quote',
      status: 'JCI Verified',
      person: { icon: Hospital, name: 'KL & Penang Specialist Centres', line1: 'KKM Act 586 · JCI & MSQH Accredited', line2: 'Cardiology · Oncology · Fertility · Ortho' },
      rows: [
        { k: 'Itemised Package', v: 'RM 3,200 (~USD 725)', kind: 'mono' },
        { k: 'Patient Intake', v: 'Passport · No MyKad needed', kind: 'ok' },
        { k: 'Concierge & Language', v: 'EN · ID · ZH · AR Interpreters' },
      ],
      footId: 'INTL-MHTC',
    },
  },
];



// ═══════════════════════════════════════════════
// MAIN COMPONENT (THIN BORDERS - LIGHT NAVBAR & HERO - NO BLACK BORDERS)
// ═══════════════════════════════════════════════
export default function LandingPage({ professionals }: LandingPageProps) {
  const { lang, region } = useLocale();
  const t = useT();
  const heroTr = HERO_TR[lang];
  const [testimonials, setTestimonials] = useState<{ id: string; text: string; rating: number | null; name: string; location: string | null; demo: boolean }[]>([]);
  useEffect(() => { fetch('/api/testimonials').then(r => r.json()).then(d => d.status === 'success' && setTestimonials(d.data)).catch(() => {}); }, []);
  // Hero slider
  const [slideIdx, setSlideIdx] = useState(() => (region === 'INTL' ? 3 : 0));
  useEffect(() => {
    if (region === 'INTL') setSlideIdx(3);
  }, [region]);
  const [heroPaused, setHeroPaused] = useState(false); // temporary: while the pointer or keyboard focus is on the hero
  // Autoplay is limited so it never moves content the visitor did not ask for (WCAG 2.2.2):
  // it plays one pass (ending back on the first slide) and stops for good after any interaction.
  const [autoplay, setAutoplay] = useState(true);
  const advances = useRef(0);
  const stopAutoplay = () => setAutoplay(false);
  useEffect(() => {
    if (!autoplay || heroPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => {
      advances.current += 1;
      setSlideIdx(i => (i + 1) % HERO_SLIDES.length);
      if (advances.current >= HERO_SLIDES.length) setAutoplay(false);
    }, 7000);
    return () => clearTimeout(t);
  }, [autoplay, heroPaused, slideIdx]);

  // Sign-in and sign-up live on their own page (/login)
  const goLogin = (role: PortalRole, register = false) => navigate(loginUrl(role, register));

  // Active Assistance Module State (Split Layout)

  const [activeModuleId, setActiveModuleId] = useState<string>('telehealth');

  // Instant Verification Lookup State
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<(DoctorProfile | NurseProfile)[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [registryCouncilFilter, setRegistryCouncilFilter] = useState<'all' | 'doctor' | 'nurse'>('all');

  // Navmenu Dropdown States (Quick Views & Join Us)
  const [quickViewsOpen, setQuickViewsOpen] = useState(false);
  const [joinUsOpen, setJoinUsOpen] = useState(false);
  const quickViewsRef = useRef<HTMLDivElement>(null);
  const joinUsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quickViewsOpen && !joinUsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (quickViewsOpen && !quickViewsRef.current?.contains(e.target as Node)) {
        setQuickViewsOpen(false);
      }
      if (joinUsOpen && !joinUsRef.current?.contains(e.target as Node)) {
        setJoinUsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickViewsOpen(false);
        setJoinUsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [quickViewsOpen, joinUsOpen]);

  // Handle Instant Verification Search
  const handleInstantLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() && registryCouncilFilter === 'all') {
      setLookupResult(null);
      setHasSearched(false);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const results = professionals.filter(p => {
      const matchesCouncil = registryCouncilFilter === 'all' ||
        (registryCouncilFilter === 'doctor' && 'medicalCouncil' in p) ||
        (registryCouncilFilter === 'nurse' && 'nursingCouncil' in p);
      
      if (!query) return matchesCouncil;
      
      const matchesQuery = p.name.toLowerCase().includes(query) ||
        p.licenseNumber.toLowerCase().includes(query) ||
        p.specialization.toLowerCase().includes(query);
      return matchesCouncil && matchesQuery;
    });
    setLookupResult(results);
    setHasSearched(true);
  };

  // Animated counters



  const activeModule = PROFESSIONAL_ASSISTANCE_MODULES.find(m => m.id === activeModuleId) || PROFESSIONAL_ASSISTANCE_MODULES[0];

  return (
    <div className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased selection:bg-[color:var(--t-100)] selection:text-[color:var(--t-600)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">{t('nav.skip')}</a>

      {/* ═══════════ TOP BANNER ═══════════ */}
      <div className="hidden sm:flex bg-[color:var(--t-100)] text-[color:var(--t-600)] text-xs font-semibold py-2 px-4 text-center border-b border-[color:var(--t-200)] items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-[color:var(--t-600)] text-white px-2.5 py-0.5 rounded-none text-xs uppercase tracking-wider font-bold">
          <Cross className="h-2.5 w-2.5" /> Compassionate Care Standard
        </span>
        <span>Dedicated to Patient Well-Being, Verified Practitioners &amp; Gentle Medical Support Across Malaysia</span>
      </div>

      {/* ═══════════ NAVBAR (LIGHT TONE PRIMARY BACKGROUND) ═══════════ */}
      <nav className="sticky top-0 z-50 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-2.5 sm:py-3.5 flex flex-nowrap sm:flex-wrap justify-between items-center gap-2 sm:gap-4">
          <a href="#top" className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0">
            <span className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-none bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)] group-hover:bg-[color:var(--t-700)] transition-colors">
              <Cross className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-[color:var(--ink)]">
                MedCred<span className="text-[color:var(--t-600)]">.</span>
              </span>
              <span className="hidden sm:block text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--t-600)] mt-1">
                {t('nav.tagline')}
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3 sm:flex-wrap shrink-0">
            {/* 1. Quick Views Navmenu Dropdown */}
            <div ref={quickViewsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setQuickViewsOpen(o => !o);
                  setJoinUsOpen(false);
                }}
                aria-haspopup="true"
                aria-expanded={quickViewsOpen}
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold border transition-all cursor-pointer ${
                  quickViewsOpen
                    ? 'bg-white text-[color:var(--t-600)] border-[color:var(--t-600)] shadow-xs'
                    : 'text-[color:var(--ink)] bg-white/70 hover:bg-white border-[color:var(--t-200)] hover:border-[color:var(--t-300)]'
                }`}
              >
                <Activity className="h-4 w-4 text-[color:var(--t-600)]" />
                <span>Quick Views</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${quickViewsOpen ? 'rotate-180 text-[color:var(--t-600)]' : ''}`} />
              </button>

              {quickViewsOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 sm:w-80 z-50 bg-white border border-[color:var(--t-200)] shadow-xl text-slate-800 rounded-none overflow-hidden panel-edge">
                  <div className="px-3.5 py-2 bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] text-[10px] font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)] flex items-center justify-between">
                    <span>Clinical Navigation</span>
                    <Activity className="h-3 w-3" />
                  </div>

                  {/* Clinical Protocols & Governance */}
                  <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Clinical Protocols &amp; Services
                  </div>
                  <div className="px-1.5 space-y-0.5">
                    <a
                      href="#verify-section"
                      onClick={() => setQuickViewsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="section-index-badge">01</span>
                        <span className="truncate">Statutory Licence Verification</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </a>
                    <a
                      href="#services-section"
                      onClick={() => setQuickViewsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="section-index-badge">02</span>
                        <span className="truncate">Clinical Services &amp; Modalities</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </a>
                    <a
                      href="#pathway-section"
                      onClick={() => setQuickViewsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="section-index-badge">03</span>
                        <span className="truncate">Outpatient Care Pathway</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </a>
                    <a
                      href="#ecosystem-section"
                      onClick={() => setQuickViewsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="section-index-badge">05</span>
                        <span className="truncate">Partner &amp; Practitioner Ecosystem</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </a>
                    {testimonials.length > 0 && (
                      <a
                        href="#feedback-section"
                        onClick={() => setQuickViewsOpen(false)}
                        className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="section-index-badge">06</span>
                          <span className="truncate">Verified Clinical Feedback</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </a>
                    )}
                  </div>

                  {/* Patient Intake & Access Modalities */}
                  <div className="border-t border-slate-100 my-1 pt-1.5 px-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    04 · Patient Access &amp; Intake
                  </div>
                  <div className="px-1.5 pb-1.5 space-y-0.5">
                    <a
                      href="#access-section"
                      onClick={() => setQuickViewsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-2 hover:bg-[color:var(--t-50)] transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center text-[10px] font-mono font-black">
                          MY
                        </span>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-[color:var(--ink)] group-hover:text-[color:var(--t-600)]">Malaysia Patient Access</span>
                          <span className="block text-[10px] text-slate-500 font-medium truncate">MyKad registration, local fees &amp; telemedicine</span>
                        </div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </a>

                    <a
                      href="#tourist-section"
                      onClick={() => setQuickViewsOpen(false)}
                      className="flex items-center justify-between px-2.5 py-2 hover:bg-[color:var(--t-50)] transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center text-[10px] font-mono font-black">
                          INTL
                        </span>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-[color:var(--ink)] group-hover:text-[color:var(--t-600)]">International Patient Care</span>
                          <span className="block text-[10px] text-slate-500 font-medium truncate">Medical tourism, passport intake &amp; accredited hospitals</span>
                        </div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Join Us Navmenu Dropdown */}
            <div ref={joinUsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setJoinUsOpen(o => !o);
                  setQuickViewsOpen(false);
                }}
                aria-haspopup="true"
                aria-expanded={joinUsOpen}
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 text-xs sm:text-sm font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
                  joinUsOpen
                    ? 'bg-white text-[color:var(--t-600)] border-[color:var(--t-600)] shadow-xs'
                    : 'text-[color:var(--ink)] bg-white/70 hover:bg-white border-[color:var(--t-200)] hover:border-[color:var(--t-300)]'
                }`}
              >
                <span>Join Us</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${joinUsOpen ? 'rotate-180 text-[color:var(--t-600)]' : ''}`} />
              </button>

              {joinUsOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 z-50 bg-white border border-[color:var(--t-200)] shadow-xl text-slate-800 rounded-none overflow-hidden panel-edge">
                  <div className="px-3.5 py-2 bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] text-[10px] font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)] flex items-center justify-between">
                    <span>Practitioner & Partner Network</span>
                    <PlusCircle className="h-3 w-3" />
                  </div>
                  <div className="p-1.5 space-y-1">
                    <a
                      href="/for-doctors"
                      onClick={e => {
                        e.preventDefault();
                        setJoinUsOpen(false);
                        navigate('/for-doctors');
                      }}
                      className="flex items-start gap-3 p-2.5 hover:bg-[color:var(--t-50)] transition-colors group cursor-pointer"
                    >
                      <span className="w-8 h-8 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center">
                        <Stethoscope className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] flex items-center justify-between">
                          <span>Doctors &amp; Specialists</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug font-medium">MMC verification, consults &amp; e-Rx</p>
                      </div>
                    </a>

                    <a
                      href="/for-nurses"
                      onClick={e => {
                        e.preventDefault();
                        setJoinUsOpen(false);
                        navigate('/for-nurses');
                      }}
                      className="flex items-start gap-3 p-2.5 hover:bg-[color:var(--t-50)] transition-colors group cursor-pointer"
                    >
                      <span className="w-8 h-8 shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-[color:var(--ink)] group-hover:text-emerald-700 flex items-center justify-between">
                          <span>Nurses &amp; Home Care</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug font-medium">LJM verification, home nursing &amp; locums</p>
                      </div>
                    </a>

                    <div className="border-t border-slate-100 my-1 pt-1">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Clinics &amp; Pharmacies
                      </div>
                      <a
                        href="/for-clinics"
                        onClick={e => {
                          e.preventDefault();
                          setJoinUsOpen(false);
                          navigate('/for-clinics');
                        }}
                        className="flex items-start gap-3 p-2 hover:bg-[color:var(--t-50)] transition-colors group cursor-pointer"
                      >
                        <span className="w-8 h-8 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center">
                          <Hospital className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] flex items-center justify-between">
                            <span>Clinics &amp; Hospitals</span>
                            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug font-medium">Patient intake, medical tourism &amp; staffing</p>
                        </div>
                      </a>

                      <a
                        href="/for-pharmacies"
                        onClick={e => {
                          e.preventDefault();
                          setJoinUsOpen(false);
                          navigate('/for-pharmacies');
                        }}
                        className="flex items-start gap-3 p-2 hover:bg-[color:var(--t-50)] transition-colors group cursor-pointer"
                      >
                        <span className="w-8 h-8 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center">
                          <Pill className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] flex items-center justify-between">
                            <span>Community Pharmacies</span>
                            <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug font-medium">Digital e-prescription dispensing &amp; records</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/login"
              onClick={e => { e.preventDefault(); navigate('/login'); }}
              className="hidden sm:inline-flex items-center gap-2 min-h-[44px] px-4 sm:px-6 text-[13px] sm:text-sm font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              {t('nav.portal')}
              <ArrowRight className="h-4 w-4" />
            </a>
            <LocaleSwitcher />
            <span className="hidden sm:inline-flex"><ThemeSwitcher /></span>
          </div>
        </div>
      </nav>

      {/* Phones: sign-in and sign-up stay in reach on the long page */}
      <div className={`sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-[color:var(--t-200)] px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-2.5 shadow-[0_-4px_12px_rgba(15,23,42,0.08)]`}>
        <button type="button" onClick={() => goLogin('patient', false)} className="min-h-[46px] text-sm font-extrabold text-[color:var(--t-700)] bg-white border border-[color:var(--t-300,var(--t-200))] cursor-pointer">Sign in</button>
        <button type="button" onClick={() => goLogin('patient', true)} className="min-h-[46px] text-sm font-extrabold text-white bg-[color:var(--t-600)] border border-[color:var(--t-700)] cursor-pointer">Create account</button>
      </div>

      {/* ═══════════ HERO SLIDER: one slide per audience, all stacked so the height never changes ═══════════ */}
      <header
        id="top"
        role="region"
        aria-roledescription="carousel"
        aria-label="MedCred for every user"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onFocus={() => setHeroPaused(true)}
        onBlur={() => setHeroPaused(false)}
        onPointerDown={stopAutoplay}
        onKeyDown={stopAutoplay}
        className="relative text-[color:var(--ink)] border-b border-[color:var(--t-200)] overflow-hidden bg-[color:var(--t-50)] h-[660px] sm:h-[640px] lg:h-[620px] flex items-center"
      >
        {/* Clinical Background Image (Restored natural orientation with 70% opacity) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="hero-bg-animated absolute -inset-6 bg-cover bg-center bg-no-repeat pointer-events-none"
            style={{
              backgroundImage: `url(${heroBgImage})`,
              opacity: 0.7,
              filter: "hue-rotate(var(--t-hue)) brightness(var(--t-bright))",
            }}
          />
        </div>
        <Cross className="absolute -right-24 -bottom-36 h-[520px] w-[520px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 w-full z-10 py-4 sm:py-6">
          {/* All slides share one grid cell, so the hero is as tall as the tallest slide on every slide. Screen readers hear slide changes only once autoplay has stopped. */}
          <div className="grid" aria-live={autoplay ? 'off' : 'polite'}>
            {HERO_SLIDES.map((s, i) => {
              const active = i === slideIdx;
              const tr = heroTr?.[s.id];
              return (
                <div
                  key={s.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${HERO_SLIDES.length}`}
                  inert={!active}
                  className={`[grid-area:1/1] flex flex-wrap items-center justify-between gap-8 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  {/* Left column: message */}
                  <div className="max-w-2xl min-w-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-4">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Cross className="h-3 w-3 text-[color:var(--t-600)]" />
                      {tr?.pill ?? s.pill}
                    </div>

                    {i === 0 ? (
                      <h1
                        className="font-display font-black text-3xl sm:text-4xl lg:text-[42px] leading-[1.12] tracking-tight text-slate-900 mb-3"
                      >
                        {tr?.headline ?? s.headline}
                      </h1>
                    ) : (
                      <h2
                        className="font-display font-black text-3xl sm:text-4xl lg:text-[42px] leading-[1.12] tracking-tight text-slate-900 mb-3"
                      >
                        {tr?.headline ?? s.headline}
                      </h2>
                    )}

                    <p
                      className="text-base text-slate-700 font-medium max-w-xl leading-relaxed mb-5"
                    >
                      {tr?.body ?? s.body}
                    </p>

                    <div className="flex flex-wrap gap-3 mb-5">
                      {s.cta.href ? (
                        <a
                          href={s.cta.href}
                          onClick={e => { if (s.cta.href!.startsWith('/')) { e.preventDefault(); navigate(s.cta.href!); } }}
                          className="group inline-flex items-center gap-2.5 min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer border border-[color:var(--t-700)]"
                        >
                          {tr?.cta ?? s.cta.label}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => goLogin(s.cta.role!, !!s.cta.register)}
                          className="group inline-flex items-center gap-2.5 min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer border border-[color:var(--t-700)]"
                        >
                          {tr?.cta ?? s.cta.label}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                      <a
                        href="#verify-section"
                        className="inline-flex items-center gap-2 min-h-[48px] px-6 text-sm font-bold text-[color:var(--ink)] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] rounded-none transition-all cursor-pointer shadow-xs"
                      >
                        <Search className="h-4 w-4 text-[color:var(--t-600)]" />
                        {t('nav.verify')}
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-[color:var(--ink)]">
                      {(tr?.chips ?? s.chips).map((b) => (
                        <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white/95 border border-[color:var(--t-200)] text-[color:var(--ink)] font-bold shadow-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right column: live credential / prescription / international quote preview card */}
                  <div className="hidden lg:block w-[360px] shrink-0 bg-white/95 backdrop-blur-md border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-5 shadow-lg panel-edge corner-bracket">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[color:var(--t-100)]">
                      <div>
                        <span className="block text-[10px] font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)]">
                          {s.card.label}
                        </span>
                        <span className="font-display font-black text-sm text-[color:var(--ink)]">
                          {s.card.title}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {s.card.status}
                      </span>
                    </div>

                    <div className="py-3.5 flex items-center gap-3 border-b border-[color:var(--t-100)]">
                      {s.card.person.img ? (
                        <img
                          src={s.card.person.img}
                          alt={s.card.person.name}
                          className="w-11 h-11 rounded-full object-cover border border-[color:var(--t-200)] shrink-0"
                        />
                      ) : s.card.person.icon ? (
                        <span className="w-11 h-11 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0">
                          <s.card.person.icon className="h-5 w-5" />
                        </span>
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-display font-extrabold text-sm text-[color:var(--ink)] truncate">{s.card.person.name}</p>
                        <p className="text-xs text-slate-600 font-semibold truncate">{s.card.person.line1}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate">{s.card.person.line2}</p>
                      </div>
                    </div>

                    <dl className="py-3 space-y-2 text-xs">
                      {s.card.rows.map((r) => (
                        <div key={r.k} className="flex items-center justify-between gap-2">
                          <dt className="text-slate-500 font-medium">{r.k}</dt>
                          <dd className={
                            r.kind === 'mono'
                              ? 'font-mono font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]'
                              : r.kind === 'ok'
                                ? 'font-bold text-emerald-700 inline-flex items-center gap-1'
                                : 'font-bold text-[color:var(--ink)]'
                          }>
                            {r.kind === 'ok' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            {r.v}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="pt-2.5 border-t border-[color:var(--t-100)] flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                      <span>AUDIT REF: {s.card.footId}</span>
                      <span className="text-[color:var(--t-600)]">MEDCRED REGISTRY</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Audience & Care Navigator Strip */}
          <div className="mt-6 pt-3.5 border-t border-[color:var(--t-200)]/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-500 mr-1 hidden md:inline-block">
                Explore Care:
              </span>
              {[
                { id: 'network', label: 'Doctor Consults', icon: Stethoscope },
                { id: 'prescriptions', label: 'E-Prescriptions', icon: Pill },
                { id: 'members', label: 'Health Vault', icon: ShieldCheck },
                { id: 'tourism', label: 'Hospital Tourism', icon: Globe },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                const isSelected = idx === slideIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { stopAutoplay(); setSlideIdx(idx); }}
                    className={`px-3 py-1.5 text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      isSelected
                        ? 'bg-white text-[color:var(--t-700)] border-[color:var(--t-600)] shadow-xs ring-1 ring-[color:var(--t-600)]/20'
                        : 'bg-white/80 text-slate-600 border-[color:var(--t-200)] hover:bg-white hover:text-[color:var(--ink)] hover:border-[color:var(--t-300)]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <ItemIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-[color:var(--t-600)]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick arrows & step count */}
            <div className="flex items-center gap-2 self-end sm:self-auto ml-auto">
              <span className="text-[11px] font-mono font-bold text-slate-500">
                0{slideIdx + 1} / 0{HERO_SLIDES.length}
              </span>
              <button
                type="button"
                onClick={() => { stopAutoplay(); setSlideIdx((slideIdx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); }}
                aria-label="Previous slide"
                className="w-7 h-7 bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] hover:bg-[color:var(--t-50)] text-[color:var(--t-600)] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { stopAutoplay(); setSlideIdx((slideIdx + 1) % HERO_SLIDES.length); }}
                aria-label="Next slide"
                className="w-7 h-7 bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] hover:bg-[color:var(--t-50)] text-[color:var(--t-600)] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ LIVE TELEMETRY STRIP (ATTACHED JUST UNDER HERO — HORIZONTALLY ATTACHED GRID) ═══════════ */}
      <section aria-label="How MedCred works" className="relative z-20 bg-white border-b border-[color:var(--t-200)] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          {/* Continuous Horizontally-Attached Cards (Separated by hairline 1px borders) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-x border-[color:var(--t-200)] divide-y sm:divide-y-0 sm:divide-x divide-[color:var(--t-200)]">
            {QUANTIFIED_METRICS.map((qm) => {
              const QmIcon = qm.icon;
              return (
                <div
                  key={qm.label}
                  className="group relative bg-white p-5 sm:p-6 transition-all duration-300 hover:bg-[color:var(--t-50)] flex flex-col justify-between border-t-2 border-t-[color:var(--t-600)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="w-8 h-8 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors shadow-2xs">
                        <QmIcon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                        {qm.badge}
                      </span>
                    </div>
                    <div className="font-display font-black text-2xl sm:text-3xl text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] tracking-tight leading-none mb-1.5 transition-colors">
                      {qm.valueComponent}
                    </div>
                    <h4 className="font-display font-extrabold text-xs sm:text-sm text-[color:var(--ink)] leading-snug mb-1">
                      {qm.label}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {qm.subtext}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ COMPACT CLINICAL EMERGENCY ADVISORY BAR ═══════════ */}
      <section aria-label="Emergency Hotline Protocol" className="relative bg-rose-50/80 border-b border-rose-200 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 text-white text-[11px] font-mono font-extrabold uppercase tracking-wider shrink-0">
              <AlertCircle className="h-3.5 w-3.5 animate-pulse" />
              Emergency 999
            </span>
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-snug">
              <strong className="font-extrabold text-slate-900">Your Health &amp; Safety Come First:</strong> MedCred is dedicated to outpatient tele-consultations and practitioner verification. For acute chest discomfort, sudden breathlessness, or severe trauma, please dial <strong className="text-rose-700 font-black">999</strong> (or 112 from a mobile) immediately.
            </p>
          </div>
          <a
            href="tel:999"
            className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-none shadow-2xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Call 999 Now
          </a>
        </div>
      </section>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main id="main-content" className="flex-grow w-full">

        {/* ─── SECTION 01: STATUTORY GOVERNANCE & LIVE PRACTITIONER LICENCE VERIFICATION ─── */}
        <section id="verify-section" aria-label="Statutory governance and licence verification" className="relative overflow-hidden bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10 space-y-12">
            <div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-[color:var(--t-200)]">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="section-index-badge">01</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                    Caring For Your Safety &amp; Peace of Mind
                  </div>
                  <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                    How we carefully verify every <span className="text-[color:var(--t-600)]">practitioner who cares for you.</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl leading-relaxed">
                    We believe patient trust is a sacred responsibility. Every doctor and nurse is verified individually by hand against official council registers (MMC &amp; LJM) with active Annual Practising Certificates before they can offer consultations.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3.5 py-2 border border-[color:var(--t-200)] shadow-2xs">
                    Medical Act 1971 · Nurses Act 1950 · PDPA 2010
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-[color:var(--t-200)] border border-[color:var(--t-200)]">
                {TRUST_PARTNERS.map((tp, idx) => {
                  const TpIcon = tp.icon;
                  return (
                    <StaggerItem
                      key={tp.title}
                      index={idx}
                      className="group bg-white p-5 border-t-2 border-t-[color:var(--t-600)] hover:bg-[color:var(--t-50)]/60 transition-all duration-300 flex flex-col justify-between h-full"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3.5">
                          <span className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center group-hover:bg-[color:var(--t-600)] group-hover:text-white group-hover:border-[color:var(--t-700)] transition-colors shadow-2xs">
                            <TpIcon className="h-4.5 w-4.5" />
                          </span>
                          <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                            {tp.category}
                          </span>
                        </div>
                        <h4 className="font-display font-extrabold text-sm leading-snug text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">
                          {tp.title}
                        </h4>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[color:var(--t-100)] flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">{tp.status}</span>
                      </div>
                    </StaggerItem>
                  );
                })}
              </div>
            </div>

            <AnimatedSection>
              <div aria-labelledby="verify-heading">
                <div className="relative overflow-hidden bg-white panel-edge corner-bracket p-6 sm:p-10 lg:p-12">
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] gap-10 lg:gap-14 items-start">
                    {/* Left: heading, council filter tabs, search, results */}
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <Cross className="h-3 w-3 text-[color:var(--t-600)]" />
                        Public Statutory Practitioner Register
                      </div>
                      <h2 id="verify-heading" className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight text-[color:var(--ink)] mb-2">
                        Practitioner Licence <span className="text-[color:var(--t-600)]">Verification.</span>
                      </h2>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium mb-6 max-w-lg">
                        Check active medical and nursing licences against statutory council registers with complete transparency before booking care.
                      </p>

                      {/* Council Selector Tabs */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {[
                          { key: 'all' as const, label: 'All Practitioners', icon: Users },
                          { key: 'doctor' as const, label: 'MMC Doctors (Act 1971)', icon: Stethoscope },
                          { key: 'nurse' as const, label: 'LJM Nurses (Act 1950)', icon: UserCheck },
                        ].map(c => {
                          const isSel = registryCouncilFilter === c.key;
                          const TabIcon = c.icon;
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => {
                                setRegistryCouncilFilter(c.key);
                                setTimeout(() => handleInstantLookup(), 0);
                              }}
                              className={`px-3.5 py-2 text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                isSel
                                  ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)] shadow-xs ring-1 ring-[color:var(--t-600)]/20'
                                  : 'bg-white text-slate-700 border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] hover:border-[color:var(--t-300)]'
                              }`}
                            >
                              <TabIcon className={`h-3.5 w-3.5 ${isSel ? 'text-white' : 'text-[color:var(--t-600)]'}`} />
                              <span>{c.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <form onSubmit={handleInstantLookup} role="search" className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                          <label htmlFor="licence-search" className="sr-only">Doctor or nurse name, licence number or specialty</label>
                          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                          <input
                            id="licence-search"
                            type="text"
                            placeholder="e.g. DEMO-MMC-32109, Dr. Tan, or Cardiology"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 bg-white border border-[color:var(--t-200)] rounded-none text-[color:var(--ink)] placeholder-slate-400 font-medium focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all text-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          className="h-12 min-h-[48px] px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-extrabold text-sm rounded-none transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-[color:var(--t-700)] shadow-xs"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Verify Now
                        </button>
                      </form>

                      {/* Quick-Search Sample Tags */}
                      <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Quick Search:</span>
                        {['DEMO-MMC-32109', 'Cardiology', 'Dr. Tan Seng Hock', 'DEMO-LJM-88412'].map((sample) => (
                          <button
                            key={sample}
                            type="button"
                            onClick={() => {
                              setSearchQuery(sample);
                              const query = sample.toLowerCase();
                              const results = professionals.filter(p =>
                                p.name.toLowerCase().includes(query) ||
                                p.licenseNumber.toLowerCase().includes(query) ||
                                p.specialization.toLowerCase().includes(query)
                              );
                              setLookupResult(results);
                              setHasSearched(true);
                            }}
                            className="px-3 py-1 bg-white hover:bg-[color:var(--t-100)] text-[color:var(--t-600)] font-mono text-xs font-bold border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer"
                          >
                            {sample}
                          </button>
                        ))}
                      </div>

                      <div className="mt-6" aria-live="polite">
                        <AnimatePresence mode="wait">
                          {hasSearched && (
                            <motion.div
                              key="results"
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="space-y-3.5"
                            >
                              {lookupResult && lookupResult.length > 0 ? (
                                lookupResult.map((p) => {
                                  const council = 'medicalCouncil' in p ? p.medicalCouncil : p.nursingCouncil;
                                  return (
                                    <article key={p.id} className="bg-white border-l-4 border-l-emerald-600 border-t border-r border-b border-[color:var(--t-200)] shadow-xs p-5">
                                      <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                          <div className="photo-clinical-frame corner-bracket w-14 h-14 shrink-0 shadow-2xs">
                                            <img
                                              src={p.avatar}
                                              alt=""
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <h3 className="font-display font-black text-lg text-[color:var(--ink)] leading-tight">{p.name}</h3>
                                              <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                Active APC 2026
                                              </span>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium mt-0.5">{p.specialization} · {p.city}</p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 shadow-2xs">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            Council Verified
                                          </span>
                                          <span className="text-xs font-mono text-slate-500">Audit Stamp #MC-2026-OK</span>
                                        </div>
                                      </div>
                                      <dl className="mt-4 pt-4 border-t border-[color:var(--t-100)] grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                                        <div>
                                          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Licence / Reg No.</dt>
                                          <dd className="mt-0.5 font-mono font-bold text-[color:var(--t-600)]">{p.licenseNumber}</dd>
                                        </div>
                                        <div className="min-w-0">
                                          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Statutory Council</dt>
                                          <dd className="mt-0.5 font-bold text-[color:var(--ink)] break-words">{council}<VerificationScopeBadge prof={p as any} className="ml-2 align-middle" /></dd>
                                        </div>
                                        <div>
                                          <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Clearance</dt>
                                          <dd className="mt-0.5 font-bold text-emerald-700 flex items-center gap-1">
                                            <Check className="h-3.5 w-3.5" /> Full Independent Practice
                                          </dd>
                                        </div>
                                      </dl>
                                    </article>
                                  );
                                })
                              ) : (
                                <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-900 text-sm">
                                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                  <span><span className="font-bold">No matching record found.</span> Check the licence number or spelling. Practitioners who are suspended, lapsed, or pending board verification are omitted from this public register.</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setHasSearched(false); setLookupResult(null); setRegistryCouncilFilter('all'); }}
                                className="min-h-[44px] px-1 text-sm font-bold text-[color:var(--t-600)] hover:underline cursor-pointer"
                              >
                                Clear search filters
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Right: three clinical trust notes with verification telemetry card */}
                    <aside className="min-w-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-6 sm:p-7 shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-5 pb-4 border-b border-[color:var(--t-100)]">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4.5 w-4.5 text-[color:var(--t-600)]" />
                          <h3 className="font-display font-black text-lg text-[color:var(--ink)]">Verification Standard</h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                          Manual check
                        </span>
                      </div>
                      <ul className="space-y-5">
                        {[
                          { icon: ShieldCheck, title: 'Checked against the council register', text: 'Doctors are checked against the MMC register and nurses are confirmed with the Nursing Board before a profile goes public. Our team records how and when, and whether the practitioner is registered in Malaysia.' },
                          { icon: Clock, title: 'Annual Practising Certificate (APC)', text: 'Expiry dates are tracked. A practitioner whose certificate expires is suspended automatically (checked hourly) until they renew.' },
                          { icon: Award, title: 'Board review is logged', text: 'Each approval is recorded in an audit log with who did it and when.' },
                        ].map((n) => {
                          const NoteIcon = n.icon;
                          return (
                            <li key={n.title} className="flex gap-4">
                              <span className="w-10 h-10 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs">
                                <NoteIcon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-display font-black text-sm text-[color:var(--ink)] leading-snug">{n.title}</p>
                                <p className="text-xs text-slate-600 leading-relaxed mt-1 font-medium">{n.text}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                    </aside>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── SECTION 02: INTEGRATED CLINICAL SERVICES SUITE ─── */}
        <div id="services-section" className="relative overflow-hidden bg-[color:var(--t-50)]/30 border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <section aria-label="Integrated clinical services">
              <AnimatedSection className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="section-index-badge">02</span>
                  <Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  Compassionate Outpatient Care
                </div>
                <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                  Thoughtful clinical services <span className="text-[color:var(--t-600)]">designed around your well-being.</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl leading-relaxed">
                  Healthcare should feel gentle, attentive, and dependable. From unhurried video visits when you need rest, to doctor-signed prescriptions and confidential health vaults, we are here to support your health journey.
                </p>
              </AnimatedSection>

              {/* SPLIT LAYOUT: LEFT NAV + RIGHT STAGE (ELEVATED CLINICAL SUITE) */}
              <AnimatedSection>
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 bg-white panel-edge corner-bracket">

                  {/* Left Selector Panel */}
                  <div className="p-6 sm:p-7 bg-[color:var(--t-50)]/90 border-b lg:border-b-0 lg:border-r border-[color:var(--t-200)] flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-4 px-1 flex items-center justify-between">
                        <span>Clinical Modules</span>
                        <span className="text-xs text-slate-500 font-bold bg-white px-2 py-0.5 border border-[color:var(--t-200)]">4 Active Systems</span>
                      </div>
                      <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-x-visible pb-2.5 lg:pb-0 scrollbar-none snap-x snap-mandatory">
                        {PROFESSIONAL_ASSISTANCE_MODULES.map((m) => {
                          const isActive = m.id === activeModuleId;
                          const IconComp = m.icon;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setActiveModuleId(m.id)}
                              className={`group w-full min-w-[270px] lg:min-w-0 snap-start p-4 text-left transition-all cursor-pointer flex items-center justify-between border min-h-[52px] ${
                                isActive
                                  ? 'bg-white border-l-4 border-l-[color:var(--t-600)] border-t-[color:var(--t-200)] border-r-[color:var(--t-200)] border-b-[color:var(--t-200)] text-[color:var(--ink)] shadow-xs'
                                  : 'bg-white/80 border-[color:var(--t-200)] text-slate-700 hover:bg-white hover:border-[color:var(--t-600)]'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <span className={`w-10 h-10 flex items-center justify-center shrink-0 border transition-all ${
                                  isActive
                                    ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-2xs'
                                    : 'bg-[color:var(--t-50)] border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white'
                                }`}>
                                  <IconComp className="h-4.5 w-4.5" />
                                </span>
                                <div className="min-w-0">
                                  <span className={`block font-display font-black text-sm leading-snug transition-colors ${isActive ? 'text-[color:var(--t-600)]' : 'text-[color:var(--ink)] group-hover:text-[color:var(--t-600)]'}`}>
                                    {m.title}
                                  </span>
                                  <span className="block text-xs text-slate-500 font-medium mt-0.5">{m.tagline}</span>
                                </div>
                              </div>
                              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'text-[color:var(--t-600)] translate-x-1' : 'text-slate-500 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-[color:var(--t-200)] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Built around MMC telemedicine guidance</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        Audit trail: every decision is logged
                      </div>
                    </div>
                  </div>

                  {/* Right Hero Stage for Selected Module */}
                  <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-[color:var(--t-100)]">
                        <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)] bg-[color:var(--t-50)] px-3 py-1 border border-[color:var(--t-200)] shadow-2xs">
                          {activeModule.badge}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>CLINICAL PROTOCOL: VERIFIED ACTIVE</span>
                        </div>
                      </div>

                      <h3 className="font-display font-black text-2xl sm:text-3xl text-[color:var(--ink)] tracking-tight leading-tight mb-3">
                        {activeModule.title}
                      </h3>

                      <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed mb-7 max-w-2xl">
                        {activeModule.summary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
                        {activeModule.highlights.map((item) => (
                          <div key={item} className="card-feature flex items-start gap-3 p-3.5 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)]">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Stage Footer */}
                    <div className="pt-6 border-t border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-6 bg-slate-50/50 p-5 -mx-8 sm:-mx-10 lg:-mx-12 -mb-8 sm:-mb-10 lg:-mb-12">
                      <div>
                        <span className="block stat-display text-3xl sm:text-4xl text-[color:var(--t-600)] leading-none tracking-tight">
                          {activeModule.metricValue}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1.5 block">
                          {activeModule.metricLabel}
                        </span>
                      </div>

                      <a
                        href={activeModule.href}
                        onClick={e => { if (activeModule.href.startsWith('/')) { e.preventDefault(); navigate(activeModule.href); } }}
                        className="inline-flex items-center gap-2.5 min-h-[48px] px-8 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer"
                      >
                        {activeModule.ctaText}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                </div>
              </AnimatedSection>
            </section>
          </div>
        </div>

        {/* ─── SECTION 03: 3-STEP CARE PATHWAY ("HOW IT WORKS") ─── */}
        <div id="pathway-section" className="relative overflow-hidden bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <section aria-label="Get started">
              <AnimatedSection>
                <div className="bg-white text-[color:var(--ink)] panel-edge corner-bracket">
                  {/* Top row: the clinical care triage advisory */}
                  <div className="p-7 sm:p-9 flex flex-wrap items-center justify-between gap-x-10 gap-y-6 bg-gradient-to-r from-white via-[color:var(--t-50)] to-white border-b border-[color:var(--t-200)]">
                    <div className="max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="section-index-badge">03</span>
                        <Cross className="h-3 w-3 text-[color:var(--t-600)]" />
                        Your Gentle Care Pathway
                      </div>
                      <h3 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight text-[color:var(--ink)]">
                        Simple, transparent steps from <span className="text-[color:var(--t-600)]">consultation to recovery.</span>
                      </h3>
                      <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                        No complicated steps or hidden surprises. Here is how we support you and your loved ones with promptness, dignity, and gentle care.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => goLogin('patient', true)}
                        className="inline-flex items-center gap-2.5 min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none transition-all cursor-pointer shadow-xs"
                      >
                        Start Your Care Journey
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Steps run left to right along a line with clinical indicators */}
                  <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--t-200)]">
                    {HOW_STEPS.map((st, i) => (
                      <li key={st.title} className="bg-white">
                        <StaggerItem index={i} className="group relative p-7 sm:p-8 md:pr-12 flex items-start gap-4.5 hover:bg-[color:var(--t-50)]/50 transition-colors duration-200 h-full">
                          <span aria-hidden="true" className="w-12 h-12 shrink-0 bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] group-hover:bg-[color:var(--t-600)] group-hover:text-white group-hover:border-[color:var(--t-700)] flex items-center justify-center stat-display text-lg transition-all duration-300 shadow-2xs">
                            0{i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-black text-base sm:text-lg leading-snug text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">{st.title}</p>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1 font-medium">{st.text}</p>
                            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{i === 0 ? 'MyKad or passport accepted' : i === 1 ? 'Chat or video in your browser' : 'Prescription code and QR'}</span>
                            </div>
                          </div>
                          {i < HOW_STEPS.length - 1 && (
                            <ArrowRight aria-hidden="true" className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--t-400)]" />
                          )}
                        </StaggerItem>
                      </li>
                    ))}
                  </ol>
                </div>
              </AnimatedSection>
            </section>
          </div>
        </div>

        {/* ─── SECTION 04 (04A / 04B): MALAYSIA PATIENT ACCESS & INTERNATIONAL MEDICAL TOURISM ─── */}
        <div className="bg-gradient-to-r from-white via-[color:var(--t-50)]/50 to-white border-b border-[color:var(--t-200)] py-4.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-extrabold text-[color:var(--ink)]">
              <span className="w-8 h-8 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shadow-2xs shrink-0">
                <Globe className="h-4 w-4" />
              </span>
              <div>
                <span className="font-display font-black text-sm text-[color:var(--ink)] block">
                  Select Your Care Pathway
                </span>
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                  Personalises services for Malaysian citizens (MyKad) or cross-border medical travel (Passport)
                </span>
              </div>
            </div>
            <div role="group" aria-label="Patient audience mode" className="grid grid-cols-2 sm:inline-flex bg-white border border-[color:var(--t-200)] p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setLocale({ region: 'MY' })}
                aria-pressed={region === 'MY'}
                className={`px-4 py-2 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  region === 'MY'
                    ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[color:var(--ink)] hover:bg-[color:var(--t-50)]'
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-black/10 border border-current/20">MY</span>
                <span>Malaysia Resident (MyKad)</span>
              </button>
              <button
                type="button"
                onClick={() => setLocale({ region: 'INTL' })}
                aria-pressed={region === 'INTL'}
                className={`px-4 py-2 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  region === 'INTL'
                    ? 'bg-[color:var(--t-600)] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[color:var(--ink)] hover:bg-[color:var(--t-50)]'
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-black/10 border border-current/20">INTL</span>
                <span>International Patient (Passport)</span>
              </button>
            </div>
          </div>
        </div>
        {region === 'INTL'
          ? <><TouristAccess onSignUp={() => goLogin('patient', true)} /><PatientAccess /></>
          : <><PatientAccess /><TouristAccess onSignUp={() => goLogin('patient', true)} /></>}

        {/* ─── SECTION 05: PARTNER & PRACTITIONER NETWORK ECOSYSTEM ─── */}
        <section id="ecosystem-section" aria-label="Practitioner and partner network" className="relative overflow-hidden bg-[color:var(--t-50)]/60 border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
            <AnimatedSection className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="section-index-badge">05</span>
                <PlusCircle className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                Serving Together In Healthcare
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                Dedicated to supporting Malaysia's <span className="text-[color:var(--t-600)]">doctors, nurses, clinics &amp; pharmacies.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl leading-relaxed">
                We are humbled to support Malaysia’s dedicated healthcare professionals and community institutions with tools that make caring for patients simpler, safer, and more fulfilling.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  badge: 'MMC Act 1971',
                  title: 'Doctors & Specialists',
                  desc: 'Provide thoughtful online tele-consultations, issue doctor-signed e-prescriptions, and accept verified hospital locum sessions.',
                  cta: 'Explore Doctor Portal',
                  href: '/for-doctors',
                  icon: Stethoscope,
                },
                {
                  badge: 'LJM Act 1950',
                  title: 'Registered Nurses',
                  desc: 'Verify your LJM Annual Practising Certificate, deliver compassionate home-nursing visits, and manage hospital rosters.',
                  cta: 'Explore Nurse Portal',
                  href: '/for-nurses',
                  icon: UserCheck,
                },
                {
                  badge: 'KKM Act 586',
                  title: 'Clinics & Hospitals',
                  desc: 'Rely on verified locum clinicians, welcome international medical tourism patients, and issue transparent itemised quotes.',
                  cta: 'Explore Facility Network',
                  href: '/for-clinics',
                  icon: Hospital,
                },
                {
                  badge: 'Poisons Act 1952',
                  title: 'Community Pharmacies',
                  desc: 'Dispense QR e-prescriptions at 0% platform commission, double-check patient allergy flags, and maintain secure Poisons Book entries.',
                  cta: 'Explore Pharmacy Network',
                  href: '/for-pharmacies',
                  icon: Pill,
                },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <StaggerItem key={item.title} index={idx} className="h-full">
                    <a
                      href={item.href}
                      onClick={e => {
                        e.preventDefault();
                        navigate(item.href);
                      }}
                      className="group bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-6 flex flex-col justify-between h-full hover:border-[color:var(--t-600)] shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer panel-edge corner-bracket"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="w-10 h-10 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center shadow-2xs">
                            <ItemIcon className="h-5 w-5" />
                          </span>
                          <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)]">
                            {item.badge}
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                          {item.desc}
                        </p>
                      </div>
                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-[color:var(--t-600)]">
                        <span>{item.cta}</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  </StaggerItem>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── SECTION 06: PATIENT TESTIMONIALS (only real, approved ones are shown) ─── */}
        {testimonials.length > 0 && (
          <section id="feedback-section" aria-label="Patient testimonials" className="relative overflow-hidden bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
              <AnimatedSection className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-xs mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="section-index-badge">06</span>
                  <Cross className="h-3 w-3 text-[color:var(--t-600)]" />
                  Heartfelt Patient Experiences
                </div>
                <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                  Real stories of care, <span className="text-[color:var(--t-600)]">recovery and comfort.</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-2 font-medium max-w-2xl leading-relaxed">
                  Every patient’s peace of mind and recovery inspires our team to serve with greater humility, warmth, and dedication.
                </p>
              </AnimatedSection>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((tm, idx) => (
                  <StaggerItem key={tm.id} index={idx} className="h-full">
                    <article className="bg-white p-7 border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] panel-edge flex flex-col justify-between corner-bracket h-full shadow-2xs hover:shadow-xs transition-all">
                      <div>
                        {tm.demo && <span className="inline-block mb-3 text-xs font-extrabold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5">Demo testimonial, not a real patient</span>}
                        {tm.rating && <div className="flex items-center gap-1 text-amber-500 mb-3" aria-label={`${tm.rating} out of 5`}>{Array.from({ length: tm.rating }).map((_, i) => <span key={i} className="text-sm">★</span>)}</div>}
                        <p className="text-sm text-slate-700 leading-relaxed font-medium mb-6">“{tm.text}”</p>
                      </div>
                      <div className="pt-4 border-t border-[color:var(--t-100)] flex items-center justify-between gap-2">
                        <div>
                          <div className="font-display font-black text-sm text-[color:var(--ink)]">{tm.name}</div>
                          {tm.location && <div className="text-xs font-semibold text-slate-500 mt-0.5">{tm.location}</div>}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Verified
                        </span>
                      </div>
                    </article>
                  </StaggerItem>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>


      {/* ═══════════ STANDARDIZED APPLICATION FOOTER ═══════════ */}
      <Footer
        variant="landing"
        onLoginRole={goLogin}
      />

    </div>
  );
}
