import React, { useState, useEffect, useRef } from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  ShieldCheck, Search, CheckCircle2, RefreshCw, Heart,
  AlertTriangle, ArrowRight, Lock, AlertCircle, PlusCircle,
  Building, ChevronRight, Zap, Globe, Award, FileText,
  Sparkles, Calendar, Users, Stethoscope, Activity, Check, UserCheck,
  Clock, PhoneCall, FileSpreadsheet, Pill, Hospital, ExternalLink, Shield, ChevronLeft
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole } from '../types';
import PatientRegistrationForm from './PatientRegistrationForm';
import heroBgImage from '../../assets/medical_hero_bg.jpg';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface LandingPageProps {
  professionals: (DoctorProfile | NurseProfile)[];
  onLoginSuccess: (user: { id: string; role: 'patient' | 'practitioner' | 'admin' | 'pharmacy'; name: string; email: string; avatarUrl?: string; profileId?: string | null }, patient?: unknown) => void;
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
// Section Wrapper with Entrance Animation
// ─────────────────────────────────────────────
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number; key?: React.Key }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
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
    title: '24/7 On-Call Tele-Triage',
    tagline: 'Emergency & Urgent Consultations',
    icon: PhoneCall,
    badge: 'Chat or video',
    summary: 'Chat or video with a verified doctor who is online. Not for emergencies: in an emergency call 999 first.',
    highlights: [
      'Doctors are verified by our medical board before they can take consultations',
      'Refunded automatically if no doctor joins',
      'Red-flag symptoms show emergency numbers immediately'
    ],
    metricValue: 'Chat & video',
    metricLabel: 'Subject to doctors being online',
    ctaText: 'Sign in to consult',
    href: '#login-section'
  },
  {
    id: 'credential',
    title: 'Regulatory Credential Audit',
    tagline: 'Manual licence checks by our board',
    icon: ShieldCheck,
    badge: 'Board reviewed',
    summary: 'Every practitioner uploads their licence and certificates. A board reviewer checks the licence against the council register by hand and records how it was checked before approving.',
    highlights: [
      'Licence expiry tracked, with automatic suspension when it lapses',
      'Re-verification every 12 months',
      'Public licence lookup shows only currently verified practitioners'
    ],
    metricValue: 'Every one',
    metricLabel: 'Practitioner reviewed before going public',
    ctaText: 'Verify a Licence',
    href: '#verify-section'
  },
  {
    id: 'prescriptions',
    title: 'E-Prescriptions & Vitals Vault',
    tagline: 'Digital Pharmacy & Health Record',
    icon: Pill,
    badge: 'Doctor-signed',
    summary: 'Doctor-signed digital prescriptions with a code and QR that pharmacies can check, alongside your own health record and readings.',
    highlights: [
      'Check any prescription by its code, no sign-in needed',
      'Safety checks for allergies and interactions before issuing',
      'You choose which doctors can see your record'
    ],
    metricValue: 'QR',
    metricLabel: 'Every prescription can be verified',
    ctaText: 'Sign in to view prescriptions',
    href: '#login-section'
  },
  {
    id: 'locum',
    title: 'Hospital Locum Shift Network',
    tagline: 'Clinical Staffing Marketplace',
    icon: Hospital,
    badge: 'Verified practitioners',
    summary: 'A board for clinical shift and locum postings that only verified practitioners can apply to.',
    highlights: [
      'Only verified practitioners can apply',
      'Posts show pay range and requirements',
      'Applicant details stay private'
    ],
    metricValue: 'Verified',
    metricLabel: 'Applicants only',
    ctaText: 'Sign in to browse shifts',
    href: '#login-section'
  }
];

type PortalRole = 'patient' | 'practitioner' | 'admin' | 'pharmacy';
type Icon = React.ComponentType<{ className?: string }>;

const WHY_POINTS = [
  { icon: ShieldCheck, title: 'Every doctor is checked', text: 'Licences are checked by hand by our medical board and re-verified every 12 months.' },
  { icon: PhoneCall, title: 'Chat or video, online now', text: 'Talk to a verified doctor who is online. Refunded automatically if no doctor joins.' },
  { icon: Pill, title: 'Prescriptions you can check', text: 'Doctor-signed, with a code and QR that any pharmacy can verify.' },
  { icon: Lock, title: 'You decide who sees your record', text: 'Choose which doctors can see your health record. Every access is logged.' },
];

const HOW_STEPS = [
  { title: 'Create an account', text: 'Register as a member in a couple of minutes.' },
  { title: 'Talk to a verified doctor', text: 'Start a chat or video consultation with a doctor who is online.' },
  { title: 'Collect your prescription', text: 'Send it to a pharmacy and follow its status from your account.' },
];

const PERSPECTIVES = [
  {
    roleKey: 'patient' as const,
    icon: Heart,
    title: 'For Members & Families',
    tagline: 'Care you can trust',
    desc: 'Talk to verified doctors, and keep your prescriptions and health record in one private place.',
    features: ['Matched to the right specialty', 'Digital e-prescriptions', 'Private, encrypted messaging'],
    badge: 'Member Portal',
    note: '',
    ctaText: 'Open Member Portal'
  },
  {
    roleKey: 'practitioner' as const,
    icon: UserCheck,
    title: 'For Doctors & Nurses',
    tagline: 'Verified clinical practice',
    desc: 'Get verified, take online consultations, issue e-prescriptions and apply for locum shifts.',
    features: ['Credential review by our medical board', 'Clinical locum shift board', 'Consultations with payments and records'],
    badge: 'Practitioner Hub',
    note: '',
    ctaText: 'Open Practitioner Hub'
  },
  {
    roleKey: 'pharmacy' as const,
    icon: Pill,
    title: 'For Pharmacies',
    tagline: 'Prescriptions, handled',
    desc: 'Receive the prescriptions patients send you, update their status and keep your own records and reports.',
    features: ['Your own prescription inbox', 'Status updates the patient sees', 'Activity log and reports'],
    badge: 'Pharmacy Workspace',
    note: 'New pharmacy? Accounts are created by the MedCred board.',
    ctaText: 'Open Pharmacy Workspace'
  },
  {
    roleKey: 'admin' as const,
    icon: Building,
    title: 'For Boards & Admins',
    tagline: 'Governance & auditing',
    desc: 'Review licences, monitor compliance and keep a full audit trail across the network.',
    features: ['Licence document review queue', 'Complaints, incidents and peer review', 'Support desk and audit log'],
    badge: 'Board Admin',
    note: '',
    ctaText: 'Open Admin Console'
  },
];

// ─────────────────────────────────────────────
// HERO SLIDES: one per audience. Slide 1 is the original hero.
// ─────────────────────────────────────────────
/** Hero text: black letters with a white outline on each one (stroke is drawn behind the fill so letters stay full weight). */
const HERO_OUTLINE_HEAD: React.CSSProperties = { color: '#000', WebkitTextStroke: '3px #E2E8F0', paintOrder: 'stroke fill', textShadow: 'none' };
const HERO_OUTLINE_BODY: React.CSSProperties = { color: '#000', WebkitTextStroke: '2px #E2E8F0', paintOrder: 'stroke fill', textShadow: 'none' };
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const t = new Date(d);
  return isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
    pill: 'Online Medical Assistance Network',
    headline: <>Next-generation {hl('online medical assistance')} &amp; <span className="text-black">doctor network.</span></>,
    body: <>MedCred provides <span className="text-[#FBFCFD] [-webkit-text-stroke:2px_var(--t-600)] font-bold">real-time online medical assistance</span>, <span className="text-black font-bold">24/7 doctor tele-consultations</span>, <span className="text-[#FBFCFD] [-webkit-text-stroke:2px_var(--t-600)] font-bold">board-verified practitioners</span>, and <span className="text-black font-bold">digital e-prescriptions</span> built with verified clinical standards.</>,
    cta: { label: 'Create an Account', role: 'patient', register: true },
    chips: ['Online consultations', 'Board-verified doctors', 'Signed e-prescriptions'],
    card: {
      label: 'Medical Assistance Badge',
      title: 'Verified Practitioner',
      status: 'Verified Active',
      person: { img: '/assets/malaysian_male_doctor.jpg', name: 'Dr. Tan Seng Hock', line1: 'Senior Specialist · MMC Registered', line2: 'Kuala Lumpur Specialist Hospital' },
      rows: [
        { k: 'MMC Licence Number', v: 'MMC-32109', kind: 'mono' },
        { k: 'Registry Status', v: 'Malaysian Medical Council' },
        { k: 'Consultations', v: 'Chat or video' },
      ],
      footId: '8F2A-9912',
    },
  },
  {
    id: 'members',
    pill: 'For Members & Families',
    headline: <>Trusted care, {hl('one verified doctor')} away.</>,
    body: <>Chat or video with a <span className="text-[#FBFCFD] [-webkit-text-stroke:2px_var(--t-600)] font-bold">board-verified doctor</span>, keep your <span className="text-black font-bold">prescriptions and health record</span> in one place, and choose exactly who can see them.</>,
    cta: { label: 'Join as a Member', role: 'patient', register: true },
    chips: ['Chat or video', 'Refund if no doctor joins', 'You control access'],
    card: {
      label: 'E-Prescription',
      title: 'Signed Prescription',
      status: 'Valid',
      person: { icon: Pill, name: 'Amoxicillin 500 mg', line1: '1 capsule, 3 times daily · 7 days', line2: 'Signed by Dr. Tan Seng Hock' },
      rows: [
        { k: 'Prescription code', v: 'RX-7K4M-92QA', kind: 'mono' },
        { k: 'Safety check', v: 'Allergies & interactions clear', kind: 'ok' },
        { k: 'Collect from', v: 'Any partner pharmacy' },
      ],
      footId: 'RX-7K4M',
    },
  },
  {
    id: 'practitioners',
    pill: 'For Doctors & Nurses',
    headline: <>Get {hl('verified once')}, practise with confidence.</>,
    body: <>Submit your licence, be <span className="text-[#FBFCFD] [-webkit-text-stroke:2px_var(--t-600)] font-bold">reviewed by our medical board</span>, then take consultations, issue <span className="text-black font-bold">signed e-prescriptions</span> and apply for locum shifts.</>,
    cta: { label: 'Join as a Practitioner', role: 'practitioner', register: true },
    chips: ['Manual licence checks', 'Locum shift board', 'Paid consultations'],
    card: {
      label: 'Credential Review',
      title: 'Licence Review',
      status: 'Approved',
      person: { icon: ShieldCheck, name: 'Licence & certificates', line1: 'Checked by hand against the council register', line2: 'Re-verified every 12 months' },
      rows: [
        { k: 'Documents', v: 'Uploaded' },
        { k: 'Board review', v: 'Approved', kind: 'ok' },
        { k: 'Re-verification', v: 'Every 12 months' },
      ],
      footId: 'LIC-2041',
    },
  },
  {
    id: 'boards',
    pill: 'For Boards & Hospitals',
    headline: <>Every licence {hl('checked and on record.')}</>,
    body: <>Review documents, track expiry and renewals, handle <span className="text-[#FBFCFD] [-webkit-text-stroke:2px_var(--t-600)] font-bold">complaints and incidents</span>, and keep a <span className="text-black font-bold">full audit log</span> across the network.</>,
    cta: { label: 'Board Admin Sign-In', role: 'admin' },
    chips: ['Review queue', 'Expiry tracking', 'Audit log'],
    card: {
      label: 'Board Console',
      title: 'Review Queue',
      status: 'Up to date',
      person: { icon: Building, name: 'Licence review queue', line1: 'Complaints, incidents and peer review', line2: 'Support desk included' },
      rows: [
        { k: 'Awaiting review', v: '3 applications' },
        { k: 'Expiring in 30 days', v: '2 licences' },
        { k: 'Audit log', v: 'Every action recorded', kind: 'ok' },
      ],
      footId: 'BRD-0007',
    },
  },
  {
    id: 'pharmacies',
    pill: 'For Pharmacies',
    headline: <>Dispense with {hl('a code you can trust.')}</>,
    body: <>Receive prescriptions patients send you, update their status, and keep your own <span className="text-[#FBFCFD] [-webkit-text-stroke:2px_var(--t-600)] font-bold">records, activity and reports</span>. <span className="text-black font-bold">Every prescription is doctor-signed.</span></>,
    cta: { label: 'Pharmacy Sign-In', role: 'pharmacy' },
    chips: ['Your own inbox', 'Status updates', 'Activity reports'],
    card: {
      label: 'Pharmacy Check',
      title: 'Prescription Check',
      status: 'Signature valid',
      person: { icon: Pill, name: 'Prescription RX-7K4M-92QA', line1: 'Signed by a verified doctor', line2: 'In your pharmacy inbox' },
      rows: [
        { k: 'Prescriber status', v: 'Verified', kind: 'ok' },
        { k: 'Fill status', v: 'Preparing' },
        { k: 'Status updates', v: 'Shown to the patient' },
      ],
      footId: 'PH-3315',
    },
  },
];



// ═══════════════════════════════════════════════
// PRACTITIONER ACCOUNT SIGN-UP
// ═══════════════════════════════════════════════
function PractitionerSignUp({ onSuccess, onCancel }: {
  onSuccess: (user: { id: string; role: 'patient' | 'practitioner' | 'admin' | 'pharmacy'; name: string; email: string; profileId?: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const field = 'w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none px-4 h-[50px] text-base font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register-practitioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, consent }),
      });
      const data = await resp.json();
      if (data.status === 'success') onSuccess(data.data.user);
      else setError(data.message || 'Could not create the account.');
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)]">Create a Practitioner Account</h3>
      <p className="text-sm text-slate-600 mt-1">
        After signing up you will submit your licence details and certificates. You appear in the public registry only once the medical board verifies you.
      </p>
      <form onSubmit={submit} className="space-y-5 mt-7">
        {error && (
          <div className="bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-600)] p-4 flex gap-3 text-xs font-bold">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="pr-name" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Full name (as on licence)</label>
          <input id="pr-name" className={field} value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
        </div>
        <div className="space-y-2">
          <label htmlFor="pr-email" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Email address</label>
          <input id="pr-email" type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="pr-password" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Password</label>
          <input id="pr-password" type="password" className={field} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          <p className="text-[11px] text-slate-500">At least 8 characters, with letters and numbers.</p>
        </div>
        <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[color:var(--t-600)]" required />
          <span>I accept the Terms of Service and Privacy Policy, and agree that my credentials may be checked with the relevant medical council.</span>
        </label>
        <button type="submit" disabled={loading || !consent}
          className="w-full h-[52px] text-base font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-800)] text-white shadow-md disabled:opacity-70 border border-[color:var(--t-800)] cursor-pointer">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <button type="button" onClick={onCancel} className="w-full text-sm font-bold text-slate-600 hover:underline cursor-pointer">Back to sign in</button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT (THIN BORDERS - LIGHT NAVBAR & HERO - NO BLACK BORDERS)
// ═══════════════════════════════════════════════
export default function LandingPage({ professionals, onLoginSuccess }: LandingPageProps) {
  // Login State
  const [activeTab, setActiveTab] = useState<'patient' | 'practitioner' | 'admin' | 'pharmacy'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');

  // Hero slider
  const [slideIdx, setSlideIdx] = useState(0);
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

  const goLogin = (role: PortalRole, register = false) => {
    setActiveTab(role);
    setError('');
    setIsRegistering(register);
    document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Active Assistance Module State (Split Layout)

  const [activeModuleId, setActiveModuleId] = useState<string>('telehealth');

  // Instant Verification Lookup State
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<(DoctorProfile | NurseProfile)[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Handle Instant Verification Search
  const handleInstantLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setLookupResult(null);
      setHasSearched(false);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const results = professionals.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.licenseNumber.toLowerCase().includes(query) ||
      p.specialization.toLowerCase().includes(query)
    );
    setLookupResult(results);
    setHasSearched(true);
  };

  // Standard Login Submission (server-verified credentials and session)
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: activeTab, ...(needsCode ? { code } : {}) }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setPassword('');
        setNeedsCode(false); setCode('');
        onLoginSuccess(data.data.user, data.data.patient);
      } else {
        if (data.needsCode) setNeedsCode(true);
        setError(data.message || 'Sign in failed.');
      }
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Animated counters



  const activeModule = PROFESSIONAL_ASSISTANCE_MODULES.find(m => m.id === activeModuleId) || PROFESSIONAL_ASSISTANCE_MODULES[0];

  const inputClass = 'w-full bg-white/10 border border-white/30 rounded-none px-4 h-[50px] text-base font-medium text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all';

  return (
    <div className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased selection:bg-[color:var(--t-100)] selection:text-[color:var(--t-600)]">

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">Skip to content</a>

      {/* ═══════════ TOP BANNER ═══════════ */}
      <div className="bg-[color:var(--t-100)] text-[color:var(--t-600)] text-xs font-semibold py-2 px-4 text-center border-b border-[color:var(--t-200)] flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-[color:var(--t-600)] text-white px-2.5 py-0.5 rounded-none text-[11px] uppercase tracking-wider font-bold">
          <Cross className="h-2.5 w-2.5" /> MedCred Standard
        </span>
        <span>Online Medical Assistance Platform — Verification &amp; Telehealth Network</span>
      </div>

      {/* ═══════════ NAVBAR (LIGHT TONE PRIMARY BACKGROUND) ═══════════ */}
      <nav className="sticky top-0 z-50 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <a href="#top" className="flex items-center gap-3.5 group">
            <span className="w-10 h-10 rounded-none bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)] group-hover:bg-[color:var(--t-700)] transition-colors">
              <Cross className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-black text-2xl tracking-tight text-[color:var(--ink)]">
                MedCred<span className="text-[color:var(--t-600)]">.</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--t-600)] mt-1">
                Medical Assistance Platform
              </span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#verify-section"
              className="hidden sm:inline-flex items-center gap-2 min-h-[44px] px-5 text-sm font-bold text-[color:var(--t-600)] bg-white border border-[color:var(--t-200)] rounded-none hover:bg-[color:var(--t-100)] transition-all cursor-pointer"
            >
              <Search className="h-4 w-4" />
              Verify a Licence
            </a>
            <a
              href="#login-section"
              className="inline-flex items-center gap-2 min-h-[44px] px-6 text-sm font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer"
            >
              Access Portal
              <ArrowRight className="h-4 w-4" />
            </a>
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

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
        className="relative text-[color:var(--ink)] border-b border-[color:var(--t-200)] overflow-hidden bg-[color:var(--t-50)]"
      >
        {/* Clinical Background Image (Opacity set to 80%) */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
          style={{ backgroundImage: `url(${heroBgImage})`, opacity: 0.8, filter: "hue-rotate(var(--t-hue)) brightness(var(--t-bright))" }}
        />
        <Cross className="absolute -right-24 -bottom-36 h-[520px] w-[520px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-[4.25rem] pb-12 lg:pt-[4.25rem] z-10">
          {/* All slides share one grid cell, so the hero is as tall as the tallest slide on every slide. Screen readers hear slide changes only once autoplay has stopped. */}
          <div className="grid" aria-live={autoplay ? 'off' : 'polite'}>
            {HERO_SLIDES.map((s, i) => {
              const active = i === slideIdx;
              const c = s.card;
              const PersonIcon = c.person.icon;
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
                  <div className="flex-[1_1_500px] min-w-0">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-4 shadow-xs">
                      <Cross className="h-3 w-3 text-[color:var(--t-600)]" />
                      {s.pill}
                    </div>

                    {i === 0 ? (
                      <h1
                        className="font-display font-black text-3xl sm:text-4xl leading-[1.1] tracking-tight text-black mb-3"
                        style={HERO_OUTLINE_HEAD}
                      >
                        {s.headline}
                      </h1>
                    ) : (
                      <h2
                        className="font-display font-black text-3xl sm:text-4xl leading-[1.1] tracking-tight text-black mb-3"
                        style={HERO_OUTLINE_HEAD}
                      >
                        {s.headline}
                      </h2>
                    )}

                    <p
                      className="text-base text-black font-semibold max-w-xl leading-relaxed mb-5"
                      style={HERO_OUTLINE_BODY}
                    >
                      {s.body}
                    </p>

                    <div className="flex flex-wrap gap-3 mb-5">
                      {s.cta.href ? (
                        <a
                          href={s.cta.href}
                          className="group inline-flex items-center gap-2.5 min-h-[46px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] rounded-none shadow-md transition-all cursor-pointer border border-[color:var(--t-700)]"
                        >
                          {s.cta.label}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => goLogin(s.cta.role!, !!s.cta.register)}
                          className="group inline-flex items-center gap-2.5 min-h-[46px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] rounded-none shadow-md transition-all cursor-pointer border border-[color:var(--t-700)]"
                        >
                          {s.cta.label}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                      <a
                        href="#verify-section"
                        className="inline-flex items-center gap-2 min-h-[46px] px-6 text-sm font-bold text-[color:var(--ink)] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] rounded-none transition-all cursor-pointer shadow-xs"
                      >
                        <Search className="h-4 w-4 text-[color:var(--t-600)]" />
                        Verify a Licence
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-[color:var(--ink)]">
                      {s.chips.map((b) => (
                        <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white/95 border border-[color:var(--t-200)] text-[color:var(--ink)] font-bold shadow-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right column: badge card that changes with the slide */}
                  <div className="hidden md:block flex-[1_1_340px] min-w-0 max-w-[420px]">
                    <div className="bg-white text-[color:var(--ink)] rounded-none p-5 shadow-xl border border-[color:var(--t-200)] relative">
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 shrink-0 rounded-none bg-[color:var(--t-100)] border border-[color:var(--t-200)] flex items-center justify-center text-[color:var(--t-600)]">
                            <Cross className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600 block">Example · {c.label}</span>
                            <span className="text-xs font-bold text-[color:var(--ink)]">{c.title}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold shrink-0">
                          <span className="w-1.5 h-1.5 rounded-none bg-emerald-500" />
                          {c.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 mb-4">
                        {c.person.img ? (
                          <img src={c.person.img} alt={c.person.name} className="w-14 h-14 rounded-full object-cover border border-[color:var(--t-200)] shadow-xs" />
                        ) : (
                          <span className="w-14 h-14 shrink-0 rounded-full bg-[color:var(--t-100)] border border-[color:var(--t-200)] flex items-center justify-center text-[color:var(--t-600)]">
                            {PersonIcon && <PersonIcon className="h-6 w-6" />}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-display font-extrabold text-lg tracking-tight text-[color:var(--ink)] leading-tight">{c.person.name}</p>
                          <p className="text-xs font-semibold text-[color:var(--t-600)] mt-0.5">{c.person.line1}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{c.person.line2}</p>
                        </div>
                      </div>

                      <div className="space-y-2 bg-[color:var(--t-bg)] rounded-none p-3.5 border border-[color:var(--t-200)] text-xs">
                        {c.rows.map((r, ri) => (
                          <div key={r.k} className={`flex justify-between items-center gap-3 py-1 ${ri < c.rows.length - 1 ? 'border-b border-rose-100' : ''}`}>
                            <span className="text-slate-500 font-medium">{r.k}</span>
                            {r.kind === 'mono' ? (
                              <span className="font-mono font-bold text-[color:var(--t-600)] bg-[color:var(--t-100)] px-2 py-0.5 border border-[color:var(--t-200)] rounded-none text-[11px]">{r.v}</span>
                            ) : r.kind === 'ok' ? (
                              <span className="font-semibold text-emerald-700 flex items-center gap-1 text-right"><CheckCircle2 className="h-3 w-3 shrink-0" /> {r.v}</span>
                            ) : (
                              <span className="font-semibold text-slate-800 text-right">{r.v}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Example only, not a real record
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">ID: {c.footId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slider controls: small arrows and dots, no play button */}
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { stopAutoplay(); setSlideIdx((slideIdx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); }}
              aria-label="Previous slide"
              className="relative h-5 w-5 inline-flex items-center justify-center text-[color:var(--t-600)] hover:text-[color:var(--t-800)] cursor-pointer after:content-[''] after:absolute after:-inset-3"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1.5 px-1">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { stopAutoplay(); setSlideIdx(i); }}
                  aria-label={`Go to slide ${i + 1}: ${s.pill}`}
                  aria-current={i === slideIdx}
                  className="h-8 min-w-6 justify-center inline-flex items-center cursor-pointer"
                >
                  <span className={`block h-1.5 transition-all ${i === slideIdx ? 'w-6 bg-[color:var(--t-600)]' : 'w-1.5 bg-[color:var(--t-600)]/30 hover:bg-[color:var(--t-600)]/60'}`} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { stopAutoplay(); setSlideIdx((slideIdx + 1) % HERO_SLIDES.length); }}
              aria-label="Next slide"
              className="relative h-5 w-5 inline-flex items-center justify-center text-[color:var(--t-600)] hover:text-[color:var(--t-800)] cursor-pointer after:content-[''] after:absolute after:-inset-3"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ VALUE STRIP: attached to the bottom edge of the hero ═══════════ */}
      <div className="bg-[color:var(--band-a)] border-b border-[color:var(--t-200)] pb-14 sm:pb-16">
      <section aria-label="Why MedCred" className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 mt-0">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--t-200)] border-x border-b border-[color:var(--t-200)] shadow-sm">
          {WHY_POINTS.map((p) => {
            const PointIcon = p.icon;
            return (
              <li key={p.title} className="bg-white p-5 flex items-start gap-4 min-w-0">
                <span className="w-11 h-11 shrink-0 bg-[color:var(--t-btn)] text-white flex items-center justify-center">
                  <PointIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-extrabold text-base tracking-tight text-[color:var(--ink)] leading-snug">{p.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">{p.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main id="main-content" className="flex-grow w-full">

        <div className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* ─── HOW IT WORKS + CALL TO ACTION ─── */}
        <section aria-label="Get started">
          <AnimatedSection>
            <div className="bg-[color:var(--t-100)] text-[color:var(--ink)] border border-[color:var(--t-200)] shadow-sm">
              {/* Top row: the question and the two actions */}
              <div className="p-7 sm:p-10 flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
                <div className="max-w-xl">
                  <h3 className="font-display font-black text-3xl sm:text-4xl tracking-tight leading-tight">Ready to see a verified doctor?</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">Not for emergencies. In an emergency, call 999 first.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => goLogin('patient', true)}
                    className="inline-flex items-center gap-2 min-h-[48px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-btn)] hover:bg-[color:var(--t-btn-hover)] transition-colors cursor-pointer"
                  >
                    Create an Account
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#verify-section"
                    className="inline-flex items-center gap-2 min-h-[48px] px-6 text-sm font-bold text-[color:var(--t-text)] border border-[color:var(--t-btn)] hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                  >
                    <Search className="h-4 w-4" />
                    Verify a Licence
                  </a>
                </div>
              </div>

              {/* Steps run left to right along a line */}
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--t-200)] border-t border-[color:var(--t-200)]">
                {HOW_STEPS.map((st, i) => (
                  <li key={st.title} className="relative bg-white p-7 sm:p-8 md:pr-12 flex items-start gap-4">
                    <span aria-hidden="true" className="w-11 h-11 shrink-0 bg-[color:var(--t-btn)] text-white border border-[color:var(--t-btn-hover)] flex items-center justify-center font-display font-black text-xl">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-lg leading-snug">{st.title}</p>
                      <p className="text-sm text-slate-600 leading-relaxed mt-1">{st.text}</p>
                    </div>
                    {i < HOW_STEPS.length - 1 && (
                      <ArrowRight aria-hidden="true" className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--t-400)]" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </AnimatedSection>
        </section>
          </div>
        </div>

        <div className="bg-[color:var(--band-a)] border-b border-[color:var(--t-200)] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* ─── INTERACTIVE CONTENT LAYOUT: PROFESSIONAL MEDICAL ASSISTANCE SUITE (THIN BORDERS) ─── */}
        <section>
          <AnimatedSection className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-text)] bg-[color:var(--t-100)] px-3.5 py-1.5 rounded-none border border-[color:var(--t-200)] mb-3">
              <Cross className="h-3.5 w-3.5" /> Platform Modules
            </div>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[color:var(--ink)] leading-[1.05]">
              Integrated Clinical Services.
            </h2>
            <p className="text-lg text-slate-600 mt-3 leading-relaxed">
              Telehealth, credential audits, e-prescriptions and locum shifts.
            </p>
          </AnimatedSection>

          {/* SPLIT LAYOUT: LEFT NAV + RIGHT STAGE (THIN BORDERS) */}
          <AnimatedSection>
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-0 bg-[color:var(--t-100)] border border-[color:var(--t-200)] rounded-none shadow-sm">

              {/* Left Selector Panel */}
              <div className="p-6 border-b lg:border-b-0 lg:border-r border-[color:var(--t-200)] flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-slate-600 mb-4 px-1">
                    Select Module
                  </div>
                  <div className="space-y-2">
                    {PROFESSIONAL_ASSISTANCE_MODULES.map((m) => {
                      const isActive = m.id === activeModuleId;
                      const IconComp = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setActiveModuleId(m.id)}
                          className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between border ${
                            isActive
                              ? 'bg-white border-[color:var(--t-btn)] text-[color:var(--ink)] shadow-xs'
                              : 'bg-transparent border-transparent text-slate-700 hover:bg-white hover:border-[color:var(--t-200)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-9 h-9 rounded-none flex items-center justify-center shrink-0 border ${
                              isActive ? 'bg-[color:var(--t-btn)] border-[color:var(--t-btn-hover)] text-white' : 'bg-white border-[color:var(--t-200)] text-[color:var(--t-text)]'
                            }`}>
                              <IconComp className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <span className="block font-bold text-sm leading-snug">{m.title}</span>
                              <span className="block text-[11px] text-slate-600">{m.tagline}</span>
                            </div>
                          </div>
                          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'translate-x-1 text-[color:var(--t-text)]' : 'text-slate-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[color:var(--t-200)] text-xs text-slate-600 font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[color:var(--t-text)]" />
                  <span>Licences checked by a medical board</span>
                </div>
              </div>

              {/* Right Stage Showcase */}
              <div className="p-8 sm:p-10 flex flex-col justify-between bg-white lg:border-l border-[color:var(--t-200)]">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-text)] text-xs font-extrabold uppercase tracking-wider">
                      <Cross className="h-3 w-3" /> {activeModule.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-widest">
                      Module ID: {activeModule.id.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-display font-black text-3xl tracking-tight text-[color:var(--ink)] mb-2">
                    {activeModule.title}
                  </h3>
                  <p className="text-sm font-bold uppercase tracking-wider text-[color:var(--t-text)] mb-4">
                    {activeModule.tagline}
                  </p>
                  <p className="text-slate-600 text-base leading-relaxed mb-8">
                    {activeModule.summary}
                  </p>

                  {/* Highlights Grid */}
                  <div className="mb-8">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-4">Clinical Capabilities</h4>
                    <div className="space-y-3">
                      {activeModule.highlights.map((h) => (
                        <div key={h} className="flex items-start gap-3 bg-[color:var(--t-50)] p-3.5 border border-[color:var(--t-200)] text-xs font-bold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-[color:var(--t-text)] shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Stage Footer */}
                <div className="pt-6 border-t border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <span className="block font-display font-black text-3xl text-[color:var(--t-text)] leading-none">
                      {activeModule.metricValue}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-1 block">
                      {activeModule.metricLabel}
                    </span>
                  </div>

                  <a
                    href={activeModule.href}
                    className="inline-flex items-center gap-2.5 min-h-[48px] px-7 text-sm font-extrabold text-white bg-[color:var(--t-btn)] hover:bg-[color:var(--t-btn-hover)] rounded-none shadow-xs transition-colors cursor-pointer border border-[color:var(--t-btn-hover)]"
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

        <div className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* ─── SECTION 2: ROLE PORTALS (four separate cards, filled icon tile, full-width action) ─── */}
        <section aria-labelledby="portals-heading">
          <AnimatedSection className="mb-12 max-w-2xl">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[color:var(--t-text)] mb-3">Role-based access</p>
              <h2 id="portals-heading" className="font-display font-black text-3xl sm:text-4xl tracking-tight text-[color:var(--ink)] leading-[1.05]">
                Clinical Workspaces by Role.
              </h2>
            </div>
            <p className="text-base text-slate-600 mt-3 leading-relaxed">
              Dedicated workspaces for members, clinicians, pharmacies and boards.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {PERSPECTIVES.map((card) => {
                const IconComp = card.icon;
                return (
                  <article
                    key={card.title}
                    className="group flex flex-col min-w-0 bg-white border border-[color:var(--t-200)] shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[color:var(--t-600)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <div className="p-6 sm:p-7 flex-1 flex flex-col">
                      <span className="w-12 h-12 mb-6 bg-[color:var(--t-btn)] text-white flex items-center justify-center shadow-xs">
                        <IconComp className="h-6 w-6" />
                      </span>

                      <h3 className="font-display font-extrabold text-xl tracking-tight text-[color:var(--ink)] leading-snug">{card.title}</h3>
                      <p className="text-xs font-bold text-[color:var(--t-text)] uppercase tracking-wider mt-1.5">{card.tagline}</p>

                      <ul className="mt-6 pt-6 border-t border-[color:var(--t-200)] space-y-3">
                        {card.features.slice(0, 2).map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm font-medium text-slate-800 leading-snug">
                            <CheckCircle2 className="h-4 w-4 text-[color:var(--t-text)] shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="px-6 sm:px-7 pb-6 sm:pb-7">
                      <button
                        type="button"
                        onClick={() => goLogin(card.roleKey)}
                        className="w-full min-h-[48px] px-5 text-sm font-bold text-[color:var(--t-text)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] group-hover:bg-[color:var(--t-btn)] group-hover:border-[color:var(--t-btn)] group-hover:text-white hover:bg-[color:var(--t-btn)] transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        {card.badge}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                      {card.note && <p className="mt-3 text-xs text-slate-600 leading-snug">{card.note}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </AnimatedSection>
        </section>
          </div>
        </div>

        <div className="bg-[color:var(--band-a)] border-b border-[color:var(--t-200)] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* ─── SECTION 3: PRACTITIONER LICENCE VERIFICATION (search + results, short trust notes) ─── */}
        <AnimatedSection>
          <section id="verify-section" aria-labelledby="verify-heading" className="scroll-mt-28">
            <div className="relative overflow-hidden bg-[color:var(--t-50)] border border-[color:var(--t-200)] shadow-sm p-6 sm:p-10 lg:p-12">
              <Cross className="absolute -right-20 -bottom-24 h-[440px] w-[440px] text-[color:var(--t-text)] opacity-5 pointer-events-none" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-start">
                {/* Left: heading, search, results */}
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[color:var(--t-text)] mb-3">Public practitioner register</p>
                  <h2 id="verify-heading" className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.05] text-[color:var(--ink)] mb-3">
                    Practitioner Licence Verification.
                  </h2>
                  <p className="text-[color:var(--ink-2)] text-base sm:text-lg leading-relaxed font-medium mb-7 max-w-xl">
                    Confirm a doctor or nurse holds a current licence. Search by name, licence number or specialty.
                  </p>

                  <form onSubmit={handleInstantLookup} role="search" className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                      <label htmlFor="licence-search" className="sr-only">Doctor or nurse name, licence number or specialty</label>
                      <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        id="licence-search"
                        type="text"
                        placeholder="e.g. MMC-32109"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 bg-white border border-[color:var(--t-200)] rounded-none text-[color:var(--ink)] placeholder-slate-500 font-medium focus:outline-none focus:border-[color:var(--t-600)] focus:ring-2 focus:ring-[color:var(--t-200)] transition-all text-base"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-14 px-8 bg-[color:var(--t-btn)] hover:bg-[color:var(--t-btn)] text-white font-extrabold text-base rounded-none transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-[color:var(--t-btn-hover)]"
                    >
                      Verify Now
                    </button>
                  </form>

                  <div className="mt-5" aria-live="polite">
                    <AnimatePresence mode="wait">
                      {hasSearched && (
                        <motion.div
                          key="results"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="space-y-3"
                        >
                          {lookupResult && lookupResult.length > 0 ? (
                            lookupResult.map((p) => {
                              const council = 'medicalCouncil' in p ? p.medicalCouncil : p.nursingCouncil;
                              return (
                                <article key={p.id} className="bg-white border border-[color:var(--t-200)] shadow-xs p-4 sm:p-5">
                                  <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                      <img
                                        src={p.avatar}
                                        alt=""
                                        className="w-14 h-14 rounded-none object-cover border border-[color:var(--t-200)] shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="min-w-0">
                                        <h3 className="font-display font-extrabold text-lg text-[color:var(--ink)] leading-tight">{p.name}</h3>
                                        <p className="text-sm text-slate-600">{p.specialization} · {p.city}</p>
                                      </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 shrink-0">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Verified
                                    </span>
                                  </div>
                                  <dl className="mt-4 pt-4 border-t border-[color:var(--t-200)] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div>
                                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Licence no.</dt>
                                      <dd className="mt-0.5 font-mono font-bold text-[color:var(--t-text)]">{p.licenseNumber}</dd>
                                    </div>
                                    <div className="min-w-0">
                                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Registered with</dt>
                                      <dd className="mt-0.5 font-bold text-[color:var(--ink)] break-words">{council}</dd>
                                    </div>
                                  </dl>
                                </article>
                              );
                            })
                          ) : (
                            <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-900 text-sm">
                              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                              <span><span className="font-bold">No matching record.</span> Check the spelling or licence number. Practitioners who are not currently verified are not listed.</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setHasSearched(false); setLookupResult(null); }}
                            className="min-h-[44px] px-1 text-sm font-semibold text-[color:var(--t-text)] hover:underline cursor-pointer"
                          >
                            Clear search
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right: three short trust notes */}
                <aside className="min-w-0 bg-white border border-[color:var(--t-200)] p-6 sm:p-7 shadow-xs">
                  <h3 className="font-display font-extrabold text-lg text-[color:var(--ink)] mb-5">Why you can rely on it</h3>
                  <ul className="space-y-5">
                    {[
                      { icon: ShieldCheck, title: 'Checked by hand', text: 'A board reviewer checks each licence against the council register.' },
                      { icon: Clock, title: 'Expiry tracked', text: 'A practitioner is suspended automatically when a licence lapses.' },
                      { icon: Award, title: 'Re-verified yearly', text: 'Every practitioner is re-checked every 12 months.' },
                    ].map((n) => {
                      const NoteIcon = n.icon;
                      return (
                        <li key={n.title} className="flex gap-4">
                          <span className="w-10 h-10 shrink-0 bg-[color:var(--t-btn)] text-white flex items-center justify-center">
                            <NoteIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-[color:var(--ink)] leading-snug">{n.title}</p>
                            <p className="text-sm text-slate-600 leading-relaxed mt-0.5">{n.text}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </aside>
              </div>
            </div>
          </section>
        </AnimatedSection>
          </div>
        </div>


      </main>

      {/* ═══════════ LOGIN PORTAL (REDESIGNED LIGHT THEME & THIN BORDERS) ═══════════ */}
      <section id="login-section" className="relative bg-gradient-to-br from-[color:var(--t-50)] via-[color:var(--t-100)] to-[color:var(--t-50)] text-[color:var(--ink)] border-t border-[color:var(--t-200)] overflow-hidden scroll-mt-20">
        <Cross className="absolute -right-24 -bottom-28 h-[520px] w-[520px] text-[color:var(--t-text)] opacity-5 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-20">
          {/* Heading */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-none bg-[color:var(--t-btn)] text-white shadow-md mb-5 border border-[color:var(--t-800)]">
              <Cross className="h-7 w-7" />
            </span>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[color:var(--ink)] mb-3">
              Secure Portal Sign-In
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Choose your role to continue.
            </p>
          </div>

          {/* Split card: role picker + form */}
          <div className="grid md:grid-cols-[280px_1fr] bg-white text-[color:var(--ink)] rounded-none border border-[color:var(--t-200)] shadow-xl">
            {/* Role picker side */}
            <div className="p-6 bg-[color:var(--t-50)] md:border-r border-b md:border-b-0 border-[color:var(--t-200)] flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-text)] mb-4">
                  Select User Role
                </div>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
                  {[
                    { key: 'patient' as const, label: 'Member', desc: 'Vitals, appointments & e-prescriptions', icon: Heart },
                    { key: 'practitioner' as const, label: 'Practitioner', desc: 'Credential verification & clinical shifts', icon: PlusCircle },
                    { key: 'pharmacy' as const, label: 'Pharmacy', desc: 'Prescription inbox, records & reports', icon: Pill },
                    { key: 'admin' as const, label: 'Board Admin', desc: 'Licence audit & platform management', icon: Building },
                  ].map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setActiveTab(tab.key); setError(''); setIsRegistering(false); setNeedsCode(false); setCode(''); }}
                        aria-pressed={active}
                        className={`rounded-none p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-start items-center text-center md:text-left gap-3 border ${
                          active
                            ? 'bg-[color:var(--t-btn)] border-[color:var(--t-800)] text-white shadow-xs'
                            : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'
                        }`}
                      >
                        <tab.icon className="h-5 w-5 shrink-0 md:mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold">{tab.label}</span>
                          <span className={`hidden md:block text-xs mt-0.5 leading-snug ${active ? 'text-white/90' : 'text-slate-500'}`}>
                            {tab.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden md:block pt-6 border-t border-[color:var(--t-200)] mt-6">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[color:var(--t-text)]" /> 256-Bit Encrypted Session
                </span>
              </div>
            </div>

            {/* Form pane */}
            <div className="p-6 sm:p-12 min-w-0 bg-white">
              <AnimatePresence mode="wait">
                {isRegistering && activeTab === 'patient' ? (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <PatientRegistrationForm
                      onRegisterSuccess={(user, patient) => {
                        onLoginSuccess(user, patient);
                        setIsRegistering(false);
                      }}
                      onCancel={() => setIsRegistering(false)}
                    />
                  </motion.div>
                ) : isRegistering && activeTab === 'practitioner' ? (
                  <motion.div
                    key="register-practitioner"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <PractitionerSignUp
                      onSuccess={(user) => { onLoginSuccess(user); setIsRegistering(false); }}
                      onCancel={() => setIsRegistering(false)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`login-${activeTab}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                  >
                    <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)]">
                      Sign in as {activeTab === 'patient' ? 'a Member' : activeTab === 'practitioner' ? 'a Practitioner' : activeTab === 'pharmacy' ? 'a Pharmacy' : 'a Board Admin'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">Enter your credentials to access the verified network.</p>

                    <form onSubmit={handleStandardSubmit} className="space-y-5 mt-7">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-text)] p-4 rounded-none flex gap-3 text-xs font-bold"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-text)]" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="login-email" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                          Email Address
                        </label>
                        <input
                          id="login-email"
                          type="email"
                          placeholder={
                            activeTab === 'patient' ? 'you@example.com' :
                            activeTab === 'practitioner' ? 'you@example.com' : 'you@example.com'
                          }
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none px-4 h-[50px] text-base font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="login-password" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                          Password
                        </label>
                        <input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none px-4 h-[50px] text-base font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all"
                          required
                        />
                      </div>

                      {needsCode && (
                        <div className="space-y-2">
                          <label htmlFor="login-code" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                            Authenticator code
                          </label>
                          <input
                            id="login-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6-digit code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoFocus
                            className="w-full bg-[color:var(--t-bg)] border border-[color:var(--t-200)] rounded-none px-4 h-[50px] text-base font-mono tracking-widest text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all"
                            required
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[52px] rounded-none text-base font-extrabold transition-all cursor-pointer flex justify-center items-center gap-2.5 bg-[color:var(--t-btn)] hover:bg-[color:var(--t-btn-hover)] text-white shadow-md disabled:opacity-70 border border-[color:var(--t-800)]"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin text-white" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            Sign in to {activeTab === 'patient' ? 'Member Portal' : activeTab === 'practitioner' ? 'Practitioner Hub' : activeTab === 'pharmacy' ? 'Pharmacy Workspace' : 'Board Admin Console'}
                            <ArrowRight className="h-5 w-5 text-white" />
                          </>
                        )}
                      </button>
                    </form>

                    {activeTab === 'pharmacy' && (
                      <p className="pt-6 text-center text-sm text-slate-600">
                        Pharmacy accounts are created by the MedCred board. To register your pharmacy, contact the board.
                      </p>
                    )}

                    {(activeTab === 'patient' || activeTab === 'practitioner') && (
                      <p className="pt-6 text-center text-sm text-slate-600">
                        Need a new account?{' '}
                        <button
                          type="button"
                          onClick={() => { setError(''); setIsRegistering(true); }}
                          className="inline-block py-2 text-[color:var(--t-text)] hover:underline font-extrabold cursor-pointer transition-colors"
                        >
                          {activeTab === 'patient' ? 'Register as a New Member' : 'Create a Practitioner Account'}
                        </button>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════ FOOTER (THIN BORDERS) ═══════════ */}
      <footer className="bg-[color:var(--dark)] text-slate-300 border-t border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-16 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12 pb-12 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-none bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-800)]">
                  <Cross className="h-5 w-5" />
                </span>
                <span className="font-display font-black text-2xl text-white">MedCred</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Online medical assistance and practitioner licence verification. Every practitioner is checked by hand by our medical board.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-4">Sign in</h4>
              <ul className="space-y-1.5 text-sm">
                {([
                  ['Member', 'patient'],
                  ['Doctor or nurse', 'practitioner'],
                  ['Pharmacy', 'pharmacy'],
                  ['Board admin', 'admin'],
                ] as const).map(([label, role]) => (
                  <li key={label}>
                    <button type="button" onClick={() => goLogin(role)} className="inline-block py-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer text-left">{label}</button>
                  </li>
                ))}
                <li>
                  <a href="#verify-section" className="inline-block py-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer">Verify a licence</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-4">Our commitments</h4>
              <ul className="space-y-1.5 text-sm text-slate-300">
                {['Licences checked by our medical board', 'Prescriptions signed and verifiable', 'Access to your records is logged', 'You choose who sees your health record'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--t-600)] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-xs text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} MedCred Network. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> English</span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Bahasa Melayu</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
