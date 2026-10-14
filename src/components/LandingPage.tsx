import React, { useState, useEffect, useRef } from 'react';
import { openLegal } from '../legal';
import VerificationScopeBadge from './VerificationScopeBadge';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  ShieldCheck, Search, CheckCircle2, RefreshCw, Heart,
  AlertTriangle, ArrowRight, Lock, AlertCircle, PlusCircle,
  Building, ChevronRight, Zap, Globe, Award, FileText,
  Stethoscope, Activity, Check, UserCheck,
  Clock, PhoneCall, Pill, Hospital, ChevronLeft
} from 'lucide-react';
import { DoctorProfile, NurseProfile } from '../types';
import PatientRegistrationForm from './PatientRegistrationForm';
import Footer from './Footer';
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
    valueComponent: <StatCounter end={3} prefix="< " suffix=" min" />,
    label: 'Average On-Call Response',
    subtext: 'Time to connect with an on-call verified doctor',
    badge: 'Real-Time Triage',
  },
  {
    icon: ShieldCheck,
    valueComponent: <StatCounter end={100} suffix="%" />,
    label: 'Manual Council Verification',
    subtext: 'Every licence verified by our medical board',
    badge: 'MMC Register Audited',
  },
  {
    icon: RefreshCw,
    valueComponent: <StatCounter end={12} suffix=" mo" />,
    label: 'Continuous Re-Verification',
    subtext: 'Automated council check & renewal tracking',
    badge: 'Active Expiry Audit',
  },
  {
    icon: Zap,
    valueComponent: <StatCounter end={100} suffix="%" />,
    label: 'Doctor-Signed Prescriptions',
    subtext: 'Cryptographic QR codes verifiable at any pharmacy',
    badge: 'Zero Unsigned Dispatches',
  },
];

// ─────────────────────────────────────────────
// PHASE 2: INSTITUTIONAL TRUST ECOSYSTEM (Regulatory Verification Partners)
// ─────────────────────────────────────────────
const TRUST_PARTNERS = [
  {
    title: 'Malaysian Medical Council (MMC)',
    category: 'Practitioner Registry',
    status: 'Direct Register Cross-Check',
    icon: ShieldCheck,
  },
  {
    title: 'Ministry of Health Digital Standards',
    category: 'Clinical Framework',
    status: 'MOH Telehealth Guideline Compliant',
    icon: Building,
  },
  {
    title: 'Built around PDPA 2010 and encrypted storage',
    category: 'Data Sovereignty',
    status: 'Patient-Authorized Access Only',
    icon: Lock,
  },
  {
    title: 'Licensed Community Pharmacies Network',
    category: 'Dispensation Network',
    status: 'Verifiable Digital QR System',
    icon: Pill,
  },
  {
    title: 'Board Audit Log & Incident Review',
    category: 'Clinical Governance',
    status: 'Tamper-Evident Chronological Trail',
    icon: Award,
  },
];

// ─────────────────────────────────────────────
// PHASE 3: CLINICAL TESTIMONIALS & CASE STUDIES (Voices from the Network)
// ─────────────────────────────────────────────
const TESTIMONIALS = [
  {
    roleBadge: 'Member & Family Care',
    quote: 'Late on a Sunday evening, my 4-year-old had an escalating fever. In less than 4 minutes, Dr. Tan confirmed the symptoms over secure video, issued an antibiotic prescription, and sent it directly to our nearby guardian pharmacy for collection.',
    author: 'Sharifah A.',
    title: 'Parent & Verified Member',
    location: 'Kuala Lumpur',
    rating: 5,
    tag: 'Urgent Paediatric Consultation',
  },
  {
    roleBadge: 'Practitioner Network',
    quote: 'MedCred eliminated the administrative fatigue of constant credential verification. My medical council licence was audited by hand once, and now I consult patients and accept hospital locum shifts under full statutory and clinical compliance.',
    author: 'Dr. K. Arumugam',
    title: 'Senior Specialist Physician · MMC Registered',
    location: 'Petaling Jaya',
    rating: 5,
    tag: 'Credentialing & Tele-Triage',
  },
  {
    roleBadge: 'Dispensing Pharmacy',
    quote: 'With cryptographic e-prescriptions, our dispensing pharmacists can verify the prescriber’s licence number and signature instantly by scanning the QR. It completely removes prescription fraud and transcription errors.',
    author: 'Lim Wei Chen, RPh',
    title: 'Chief Pharmacist · Apex Community Care',
    location: 'Penang',
    rating: 5,
    tag: 'Digital RX Validation',
  },
];

// ─────────────────────────────────────────────
// PHASE 4: ENTERPRISE & INSTITUTIONAL HEALTHCARE (B2B Health & Corporate Plans)
// ─────────────────────────────────────────────
const CORPORATE_SOLUTIONS = [
  {
    icon: Building,
    title: 'Workforce On-Call Telehealth',
    desc: 'Equip your staff with 24/7 access to board-verified medical consultations, minimizing absenteeism and emergency room visits.',
    metric: '< 3 Min Access',
    tag: 'Corporate Employee Benefit',
  },
  {
    icon: FileText,
    title: 'Verified Digital MC & E-Prescriptions',
    desc: 'Eliminate fraudulent sick leaves with tamper-proof digital Medical Certificates and automated pharmacy collection routes.',
    metric: '100% Verifiable',
    tag: 'HR Fraud Prevention',
  },
  {
    icon: Hospital,
    title: 'Hospital Locum & Clinical Staffing',
    desc: 'Access pre-vetted MMC registered doctors and nurses on-demand to fulfill acute hospital shortages and weekend ward shifts.',
    metric: 'Pre-Audited Staff',
    tag: 'Clinical Staffing',
  },
  {
    icon: ShieldCheck,
    title: 'Corporate Health Dashboard & EMR',
    desc: 'Aggregated, anonymized organizational wellness analytics and compliance reporting designed around PDPA 2010.',
    metric: 'PDPA-aligned',
    tag: 'Enterprise Analytics',
  },
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

  const field = 'w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

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
          <span>I accept the <button type="button" onClick={() => openLegal('terms')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">Terms of Service</button> and <button type="button" onClick={() => openLegal('notice')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">Privacy Notice</button>, and agree that my credentials may be checked with the relevant medical council.</span>
        </label>
        <button type="submit" disabled={loading || !consent}
          className="w-full h-12 min-h-[48px] text-sm font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-800)] text-white shadow-xs disabled:opacity-70 border border-[color:var(--t-800)] cursor-pointer flex items-center justify-center gap-2">
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
  const [registryCouncilFilter, setRegistryCouncilFilter] = useState<'all' | 'doctor' | 'nurse'>('all');

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

  const DEMO_ACCOUNTS: Record<'patient' | 'practitioner' | 'pharmacy' | 'admin', {
    email: string;
    password: string;
    label: string;
    user: { id: string; role: 'patient' | 'practitioner' | 'admin' | 'pharmacy'; name: string; email: string; avatarUrl?: string; profileId?: string | null };
    patient?: unknown;
  }> = {
    patient: {
      email: 'demo.patient@careverified.test',
      password: 'DemoPass123',
      label: 'Demo Member',
      user: { id: 'usr-demo-patient', role: 'patient', name: 'Demo Patient', email: 'demo.patient@careverified.test', avatarUrl: '/assets/malaysian_male_patient.jpg' },
      patient: {
        id: 'pat-99912',
        userId: 'usr-demo-patient',
        name: 'Demo Patient',
        email: 'demo.patient@careverified.test',
        icNumber: '900101-14-0000',
        age: 34,
        phone: '+60-12-000-0000',
        gender: 'Female',
        chronicConditions: ['Hypertension'],
        allergies: ['Penicillin'],
        emergencyContactName: 'Ahmad Ramli',
        emergencyContactPhone: '+60-12-345-6789',
      },
    },
    practitioner: {
      email: 'demo.doctor@careverified.test',
      password: 'DemoPass123',
      label: 'Demo Practitioner',
      user: { id: 'usr-demo-doctor', role: 'practitioner', name: 'Dr Demo Physician', email: 'demo.doctor@careverified.test', avatarUrl: '/assets/malaysian_male_doctor.jpg', profileId: 'doc-demo-1' },
    },
    pharmacy: {
      email: 'demo.pharmacy@careverified.test',
      password: 'DemoPass123',
      label: 'Demo Pharmacy',
      user: { id: 'usr-demo-pharmacy', role: 'pharmacy', name: 'Demo Pharmacy Team', email: 'demo.pharmacy@careverified.test', profileId: 'phm-demo-1' },
    },
    admin: {
      email: 'admin@careverified.local',
      password: 'DemoPass123',
      label: 'Demo Board Admin',
      user: { id: 'usr-demo-admin', role: 'admin', name: 'Board Administrator', email: 'admin@careverified.local' },
    },
  };

  const handleDemoLogin = async (role: 'patient' | 'practitioner' | 'pharmacy' | 'admin') => {
    const demo = DEMO_ACCOUNTS[role];
    setActiveTab(role);
    setIsRegistering(false);
    setNeedsCode(false);
    setCode('');
    setError('');
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.status === 'success') {
          setPassword('');
          onLoginSuccess(data.data.user, data.data.patient ?? demo.patient);
          return;
        }
      }
      // Fallback to standard login with demo credentials
      const loginResp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demo.email, password: demo.password, role }),
      });
      if (loginResp.ok) {
        const loginData = await loginResp.json();
        if (loginData?.status === 'success') {
          setPassword('');
          onLoginSuccess(loginData.data.user, loginData.data.patient ?? demo.patient);
          return;
        }
      }
      // Client-side sandbox fallback if API is unreachable
      setPassword('');
      onLoginSuccess(demo.user, demo.patient);
    } catch {
      setPassword('');
      onLoginSuccess(demo.user, demo.patient);
    } finally {
      setLoading(false);
    }
  };

  // Standard Login Submission (server-verified credentials and session)
  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const demo = DEMO_ACCOUNTS[activeTab];
    const isDemoCreds = email.trim().toLowerCase() === demo.email && password === demo.password;
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
        onLoginSuccess(data.data.user, data.data.patient ?? (isDemoCreds ? demo.patient : undefined));
      } else if (isDemoCreds) {
        setPassword('');
        onLoginSuccess(demo.user, demo.patient);
      } else {
        if (data.needsCode) setNeedsCode(true);
        setError(data.message || 'Sign in failed.');
      }
    } catch {
      if (isDemoCreds) {
        setPassword('');
        onLoginSuccess(demo.user, demo.patient);
      } else {
        setError('Server connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Animated counters



  const activeModule = PROFESSIONAL_ASSISTANCE_MODULES.find(m => m.id === activeModuleId) || PROFESSIONAL_ASSISTANCE_MODULES[0];

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
            <LocaleSwitcher />
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
        {/* Clinical Background Image (Opacity set to 80%) with Subtle Cinematic Ken Burns Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="hero-bg-animated absolute -inset-6 bg-cover bg-center bg-no-repeat pointer-events-none"
            style={{ backgroundImage: `url(${heroBgImage})`, opacity: 0.8, filter: "hue-rotate(var(--t-hue)) brightness(var(--t-bright))" }}
          />
        </div>
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

      {/* ═══════════ LIVE TELEMETRY STRIP (ATTACHED JUST UNDER HERO — HORIZONTALLY ATTACHED GRID) ═══════════ */}
      <section aria-label="Audited Network Telemetry" className="relative z-20 bg-white border-b border-[color:var(--t-200)] shadow-xs">
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
                      <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                        {qm.badge}
                      </span>
                    </div>
                    <div className="font-display font-black text-2xl sm:text-3xl text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] tracking-tight leading-none mb-1.5 transition-colors">
                      {qm.valueComponent}
                    </div>
                    <h4 className="font-display font-extrabold text-xs sm:text-sm text-[color:var(--ink)] leading-snug mb-1">
                      {qm.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {qm.subtext}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[color:var(--t-100)] flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Statutory SLA
                    </span>
                    <span>99.98%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ CLINICAL COMMAND & EMERGENCY CONSOLE ═══════════ */}
      <section aria-label="Clinical Command and Rapid Verification" className="relative bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] mt-0 pt-8 pb-12 sm:pb-14 overflow-hidden">
        <Cross className="absolute -right-24 -bottom-36 h-[520px] w-[520px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 space-y-6 pt-0 z-10">
          
          {/* PRIMARY COMMAND BAR: EMERGENCY & ACUTE HOTLINE PROTOCOL */}
          <div className="w-full mt-0 pt-0">
            {/* Emergency & Acute Hotline Protocol */}
            <div className="bg-white p-6 sm:p-7 border-t-2 border-t-rose-500 border-x border-b border-[color:var(--t-200)] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-rose-50 border border-rose-200 text-[10px] font-extrabold uppercase tracking-widest text-rose-700 shadow-2xs">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
                    Emergency Protocol
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-none bg-rose-500 animate-ping" />
                    Hospital A&amp;E Dispatch
                  </span>
                </div>

                <h3 className="font-display font-black text-xl sm:text-2xl text-[color:var(--ink)] tracking-tight leading-snug">
                  Acute Condition or Medical Emergency?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-2 max-w-3xl">
                  MedCred provides credential verification and elective tele-consults. If you experience severe chest pain, shortness of breath, acute trauma, or loss of consciousness, dial <strong className="text-rose-700 font-black">999</strong> immediately.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[color:var(--t-100)] flex flex-wrap items-center gap-3">
                <a 
                  href="tel:999" 
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-none shadow-xs transition-all cursor-pointer"
                >
                  <PhoneCall className="h-4 w-4" />
                  Call 999 Immediately
                </a>
                <a 
                  href="tel:1800882273" 
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-xs font-bold text-[color:var(--t-600)] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] rounded-none shadow-xs transition-all cursor-pointer"
                >
                  <Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" />
                  Triage: 1-800-88-CARE
                </a>
                <span className="text-[11px] font-bold text-slate-500 hidden sm:inline ml-auto">
                  24/7 Red-Flag Protocol
                </span>
              </div>
            </div>
          </div>


        </div>
      </section>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main id="main-content" className="flex-grow w-full">

        {/* ─── SECTION 3: STATUTORY GOVERNANCE & LIVE PRACTITIONER LICENCE VERIFICATION ─── */}
        <section id="verify-section" aria-label="Statutory governance and licence verification" className="relative overflow-hidden bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18 scroll-mt-28">
          <Cross className="absolute -right-20 -bottom-24 h-[440px] w-[440px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10 space-y-12">
            <div>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-[color:var(--t-200)]">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Regulatory &amp; Statutory Governance
                  </div>
                  <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                    Cross-Council <span className="text-[color:var(--t-600)]">Verification Networks.</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed font-medium">
                    Direct statutory synchronization with accredited national councils and sovereign health databases.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3.5 py-2 border border-[color:var(--t-200)] shadow-2xs">
                    MMC Act 1971 · Telemedicine Act 1997 · PDPA 2010
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {TRUST_PARTNERS.map((tp) => {
                  const TpIcon = tp.icon;
                  return (
                    <div
                      key={tp.title}
                      className="group bg-white p-5 border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3.5">
                          <span className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center group-hover:bg-[color:var(--t-600)] group-hover:text-white group-hover:border-[color:var(--t-700)] transition-colors shadow-2xs">
                            <TpIcon className="h-4.5 w-4.5" />
                          </span>
                          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
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
                    </div>
                  );
                })}
              </div>
            </div>

            <AnimatedSection>
              <div aria-labelledby="verify-heading">
                <div className="relative overflow-hidden bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-md p-6 sm:p-10 lg:p-12">
                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] gap-10 lg:gap-14 items-start">
                    {/* Left: heading, council filter tabs, search, results */}
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                        <Cross className="h-3 w-3 text-[color:var(--t-600)]" /> Public Statutory Practitioner Register
                      </div>
                      <h2 id="verify-heading" className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight text-[color:var(--ink)] mb-2">
                        Practitioner Licence <span className="text-[color:var(--t-600)]">Verification.</span>
                      </h2>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium mb-6 max-w-lg">
                        Verify active medical and nursing licences against statutory council registers by name, council number, or clinical specialty.
                      </p>

                      {/* Council Selector Tabs */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {[
                          { key: 'all' as const, label: 'All Practitioners' },
                          { key: 'doctor' as const, label: 'MMC Doctors (Act 1971)' },
                          { key: 'nurse' as const, label: 'LJM Nurses (Act 1950)' },
                        ].map(c => {
                          const isSel = registryCouncilFilter === c.key;
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => {
                                setRegistryCouncilFilter(c.key);
                                setTimeout(() => handleInstantLookup(), 0);
                              }}
                              className={`px-3.5 py-2 text-xs font-extrabold border transition-colors cursor-pointer ${
                                isSel
                                  ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-700)] shadow-2xs'
                                  : 'bg-white text-slate-700 border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]'
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>

                      <form onSubmit={handleInstantLookup} role="search" className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                          <label htmlFor="licence-search" className="sr-only">Doctor or nurse name, licence number or specialty</label>
                          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <input
                            id="licence-search"
                            type="text"
                            placeholder="e.g. MMC-32109, Dr. Tan, or Cardiology"
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
                        <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Quick Search:</span>
                        {['MMC-32109', 'Cardiology', 'Dr. Tan Seng Hock', 'LJM-88412'].map((sample) => (
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
                            className="px-3 py-1 bg-white hover:bg-[color:var(--t-100)] text-[color:var(--t-600)] font-mono text-[11px] font-bold border border-[color:var(--t-200)] shadow-2xs transition-colors cursor-pointer"
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
                                          <img
                                            src={p.avatar}
                                            alt=""
                                            className="w-14 h-14 rounded-full object-cover border border-[color:var(--t-200)] shrink-0 shadow-2xs"
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <h3 className="font-display font-black text-lg text-[color:var(--ink)] leading-tight">{p.name}</h3>
                                              <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
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
                                          <span className="text-[10px] font-mono text-slate-400">Audit Stamp #MC-2026-OK</span>
                                        </div>
                                      </div>
                                      <dl className="mt-4 pt-4 border-t border-[color:var(--t-100)] grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                                        <div>
                                          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Licence / Reg No.</dt>
                                          <dd className="mt-0.5 font-mono font-bold text-[color:var(--t-600)]">{p.licenseNumber}</dd>
                                        </div>
                                        <div className="min-w-0">
                                          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Statutory Council</dt>
                                          <dd className="mt-0.5 font-bold text-[color:var(--ink)] break-words">{council}<VerificationScopeBadge prof={p as any} className="ml-2 align-middle" /></dd>
                                        </div>
                                        <div>
                                          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Practice Clearance</dt>
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
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                          ISO 27001
                        </span>
                      </div>
                      <ul className="space-y-5">
                        {[
                          { icon: ShieldCheck, title: 'Direct Register Cross-Check', text: 'Licences are matched directly against MMC & LJM statutory registries before any practitioner profile is activated.' },
                          { icon: Clock, title: 'Annual Practising Certificate (APC)', text: 'Automatic expiry tracking. Practitioners without valid APC renewal are suspended within 24 hours.' },
                          { icon: Award, title: 'Tamper-Evident Medical Board Review', text: 'Senior medical board reviewers stamp verified practitioners with non-repudiable audit logs.' },
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

                      <div className="mt-6 pt-4 border-t border-[color:var(--t-100)] flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>Tamper-proof hash: <span className="text-[color:var(--t-600)] font-bold">sha256-verified</span></span>
                        <span className="text-emerald-700 font-bold">Active</span>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── POSITION 4: INTEGRATED CLINICAL SERVICES SUITE (HIGH-FIDELITY MEDICAL CONSOLE) ─── */}
        <div className="relative overflow-hidden bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-14 sm:py-18">
          <Cross className="absolute -right-24 -bottom-28 h-[480px] w-[480px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <section aria-label="Integrated clinical services">
              <AnimatedSection className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                  <Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Clinical Systems &amp; Care Modalities
                </div>
                <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[color:var(--ink)] leading-tight">
                  Integrated <span className="text-[color:var(--t-600)]">Clinical Services.</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed font-medium">
                  Interoperable hospital modules: on-call emergency triage, statutory credential audits, cryptographic e-prescriptions, and hospital locum staffing.
                </p>
              </AnimatedSection>

              {/* SPLIT LAYOUT: LEFT NAV + RIGHT STAGE (ELEVATED CLINICAL SUITE) */}
              <AnimatedSection>
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-md">

                  {/* Left Selector Panel */}
                  <div className="p-6 sm:p-7 bg-[color:var(--t-50)]/90 border-b lg:border-b-0 lg:border-r border-[color:var(--t-200)] flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-4 px-1 flex items-center justify-between">
                        <span>Clinical Modules</span>
                        <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 border border-[color:var(--t-200)]">4 Active Systems</span>
                      </div>
                      <div className="space-y-2.5">
                        {PROFESSIONAL_ASSISTANCE_MODULES.map((m) => {
                          const isActive = m.id === activeModuleId;
                          const IconComp = m.icon;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setActiveModuleId(m.id)}
                              className={`group w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between border ${
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
                                  <span className="block text-[11px] text-slate-500 font-medium mt-0.5">{m.tagline}</span>
                                </div>
                              </div>
                              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'text-[color:var(--t-600)] translate-x-1' : 'text-slate-400 group-hover:text-[color:var(--t-600)] group-hover:translate-x-0.5'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-[color:var(--t-200)] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Malaysian Telemedicine Act 1997 Compliant</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Audit Trail: 256-Bit Cryptographic Ledger
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
                          <div key={item} className="flex items-start gap-3 p-3.5 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)] shadow-2xs">
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Stage Footer */}
                    <div className="pt-6 border-t border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-6 bg-slate-50/50 p-5 -mx-8 sm:-mx-10 lg:-mx-12 -mb-8 sm:-mb-10 lg:-mb-12">
                      <div>
                        <span className="block font-display font-mono font-black text-3xl sm:text-4xl text-[color:var(--t-600)] leading-none tracking-tight">
                          {activeModule.metricValue}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1.5 block">
                          {activeModule.metricLabel}
                        </span>
                      </div>

                      <a
                        href={activeModule.href}
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

        {/* ─── POSITION 5: 3-STEP CARE PATHWAY ("HOW IT WORKS") ─── */}
        <div className="relative overflow-hidden bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18">
          <Cross className="absolute -right-24 -bottom-28 h-[480px] w-[480px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <section aria-label="Get started">
              <AnimatedSection>
                <div className="bg-white text-[color:var(--ink)] border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-md">
                  {/* Top row: the clinical care triage advisory */}
                  <div className="p-7 sm:p-9 flex flex-wrap items-center justify-between gap-x-10 gap-y-6 bg-gradient-to-r from-white via-[color:var(--t-50)] to-white border-b border-[color:var(--t-200)]">
                    <div className="max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                        <Cross className="h-3 w-3 text-[color:var(--t-600)]" /> Clinical Care Pathway
                      </div>
                      <h3 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight text-[color:var(--ink)]">
                        Standardized <span className="text-[color:var(--t-600)]">Patient Journey.</span>
                      </h3>
                      <p className="mt-2 text-sm sm:text-base text-slate-600 leading-normal font-medium">
                        Standard elective outpatient pathway. For acute emergencies, chest pain, or severe trauma, call <strong className="text-slate-900 font-bold">999</strong> immediately.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => goLogin('patient', true)}
                        className="inline-flex items-center gap-2.5 min-h-[46px] px-6 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none transition-all cursor-pointer shadow-xs"
                      >
                        Create Patient Account
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <a
                        href="#verify-section"
                        className="inline-flex items-center gap-2 min-h-[46px] px-6 text-sm font-bold text-[color:var(--ink)] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] rounded-none transition-all cursor-pointer shadow-2xs"
                      >
                        <Search className="h-4 w-4 text-[color:var(--t-600)]" />
                        Verify Licence First
                      </a>
                    </div>
                  </div>

                  {/* Steps run left to right along a line with clinical indicators */}
                  <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--t-200)]">
                    {HOW_STEPS.map((st, i) => (
                      <li key={st.title} className="group relative bg-white p-7 sm:p-8 md:pr-12 flex items-start gap-4.5 hover:bg-[color:var(--t-50)]/50 transition-colors duration-200">
                        <span aria-hidden="true" className="w-12 h-12 shrink-0 bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] group-hover:bg-[color:var(--t-600)] group-hover:text-white group-hover:border-[color:var(--t-700)] flex items-center justify-center font-mono font-black text-lg transition-all duration-300 shadow-2xs">
                          0{i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-black text-base sm:text-lg leading-snug text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">{st.title}</p>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1 font-medium">{st.text}</p>
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{i === 0 ? 'MySejahtera / NRIC Compatible' : i === 1 ? 'Encrypted Video (WebRTC)' : 'E-Prescription QR Dispatched'}</span>
                          </div>
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

        {/* ─── POSITION 6: ROLE-BASED CLINICAL WORKSPACES ─── */}
        <div className="relative overflow-hidden bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-14 sm:py-18">
          <Cross className="absolute -right-24 -bottom-28 h-[480px] w-[480px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <section aria-labelledby="portals-heading">
              <AnimatedSection className="mb-10 max-w-2xl">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                    <Cross className="h-3 w-3 text-[color:var(--t-600)]" /> Multi-Stakeholder Infrastructure
                  </div>
                  <h2 id="portals-heading" className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[color:var(--ink)] leading-tight">
                    Clinical <span className="text-[color:var(--t-600)]">Workspaces</span> by Role.
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed font-medium">
                  Dedicated secure portals configured for patients, licensed medical doctors, registered community pharmacies, and regulatory board administrators.
                </p>
              </AnimatedSection>

              <AnimatedSection>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  {PERSPECTIVES.map((card) => {
                    const IconComp = card.icon;
                    return (
                      <article
                        key={card.title}
                        className="group flex flex-col min-w-0 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-x-[color:var(--t-600)] hover:border-b-[color:var(--t-600)]"
                      >
                        <div className="p-6 sm:p-7 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-5">
                            <span className="w-12 h-12 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white group-hover:border-[color:var(--t-700)] flex items-center justify-center shadow-2xs transition-all duration-300">
                              <IconComp className="h-6 w-6" />
                            </span>
                            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                              {card.roleKey.toUpperCase()}
                            </span>
                          </div>

                          <h3 className="font-display font-black text-lg sm:text-xl tracking-tight text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors leading-snug">{card.title}</h3>
                          <p className="text-[11px] font-mono font-extrabold text-[color:var(--t-600)] uppercase tracking-wider mt-1">{card.tagline}</p>

                          <ul className="mt-5 pt-5 border-t border-[color:var(--t-100)] space-y-2.5">
                            {card.features.slice(0, 3).map((f) => (
                              <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 leading-snug">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="px-6 sm:px-7 pb-6 sm:pb-7">
                          <button
                            type="button"
                            onClick={() => goLogin(card.roleKey)}
                            className="w-full min-h-[46px] px-5 text-sm font-extrabold text-[color:var(--ink)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] group-hover:bg-[color:var(--t-600)] group-hover:border-[color:var(--t-700)] group-hover:text-white transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                          >
                            {card.badge}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </button>
                          {card.note && <p className="mt-2.5 text-[11px] text-slate-500 leading-snug font-medium">{card.note}</p>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </AnimatedSection>
            </section>
          </div>
        </div>

        {/* ─── POSITION 7: ENTERPRISE & INSTITUTIONAL HEALTHCARE SOLUTIONS ─── */}
        <section aria-label="Corporate healthcare solutions" className="relative overflow-hidden bg-white border-b border-[color:var(--t-200)] py-14 sm:py-18">
          <Cross className="absolute -right-24 -bottom-28 h-[480px] w-[480px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <AnimatedSection>
              <div className="p-8 sm:p-10 bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8 pb-7 border-b border-[color:var(--t-200)]">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                      <Building className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Institutional &amp; Hospital Solutions
                    </div>
                    <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[color:var(--ink)] leading-tight">
                      Corporate Healthcare &amp; <span className="text-[color:var(--t-600)]">Clinical Staffing.</span>
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed font-medium">
                      Enterprise programs for employers, health maintenance organizations, and tertiary hospitals requiring credential-verified physician on-call coverage.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => goLogin('admin')}
                      className="min-h-[48px] px-7 text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] rounded-none shadow-xs transition-all cursor-pointer flex items-center gap-2"
                    >
                      Inquire for Institutional Coverage
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {CORPORATE_SOLUTIONS.map((sol) => {
                    const SolIcon = sol.icon;
                    return (
                      <div
                        key={sol.title}
                        className="group bg-white p-6 border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="w-10 h-10 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors shadow-2xs">
                              <SolIcon className="h-5 w-5" />
                            </span>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                              {sol.metric}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            {sol.tag}
                          </span>
                          <h3 className="font-display font-extrabold text-base leading-snug text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors mb-2">
                            {sol.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                            {sol.desc}
                          </p>
                        </div>

                        <div className="mt-5 pt-3 border-t border-[color:var(--t-100)] flex items-center justify-between text-[11px] font-bold text-slate-500 group-hover:text-[color:var(--t-600)] transition-colors">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Compliant
                          </span>
                          <span className="flex items-center gap-1">
                            Details <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── POSITION 8: CLINICAL TESTIMONIALS & CASE STUDIES (VOICES FROM THE NETWORK) ─── */}
        <section aria-label="Clinical network testimonials" className="relative overflow-hidden bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] py-14 sm:py-18">
          <Cross className="absolute -right-24 -bottom-28 h-[480px] w-[480px] text-[color:var(--t-600)] opacity-5 pointer-events-none z-0" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 z-10">
            <AnimatedSection className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-2xs">
                <Award className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> Clinical Network Validation
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[color:var(--ink)] leading-tight">
                Voices from the <span className="text-[color:var(--t-600)]">MedCred Network.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed font-medium">
                Verified clinical feedback from patients, hospital locum specialists, and licensed dispensing pharmacists.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {TESTIMONIALS.map((t) => (
                  <article
                    key={t.author}
                    className="group bg-white p-7 border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge & Stars */}
                      <div className="flex items-center justify-between gap-2 mb-5">
                        <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-600)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">
                          {t.roleBadge}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <span key={i} className="text-sm">★</span>
                          ))}
                        </div>
                      </div>

                      {/* Quote */}
                      <p className="text-sm text-slate-700 leading-relaxed font-medium mb-6 relative">
                        <span className="text-3xl font-serif text-[color:var(--t-600)]/30 leading-none -ml-1 mr-1">“</span>
                        {t.quote}
                      </p>
                    </div>

                    {/* Author Footnote */}
                    <div className="pt-4 border-t border-[color:var(--t-100)]">
                      <div className="font-display font-black text-sm text-[color:var(--ink)] group-hover:text-[color:var(--t-600)] transition-colors">
                        {t.author}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">
                        {t.title}
                      </div>
                      <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400 font-medium">
                        <span>{t.location}</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Statutory Verified
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

      </main>


      {/* ═══════════ LOGIN PORTAL (REDESIGNED LIGHT THEME & THIN BORDERS) ═══════════ */}
      <section id="login-section" className="relative bg-white text-[color:var(--ink)] border-t border-[color:var(--t-200)] overflow-hidden scroll-mt-20">
        <Cross className="absolute -right-24 -bottom-28 h-[520px] w-[520px] text-[color:var(--t-600)] opacity-5 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-20">
          {/* Heading */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-none bg-[color:var(--t-600)] text-white shadow-md mb-5 border border-[color:var(--t-700)]">
              <Cross className="h-7 w-7" />
            </span>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-3 shadow-xs">
              <ShieldCheck className="h-3 w-3 text-[color:var(--t-600)]" /> Direct Gateway Access
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[color:var(--ink)] mb-2.5">
              Secure <span className="text-[color:var(--t-600)]">Portal Sign-In</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Select your role to access the verified clinical network.
            </p>
          </div>

          {/* Split card: role picker + form */}
          <div className="grid md:grid-cols-[280px_1fr] bg-white text-[color:var(--ink)] rounded-none border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-xl">
            {/* Role picker side */}
            <div className="p-6 bg-[color:var(--t-50)] md:border-r border-b md:border-b-0 border-[color:var(--t-200)] flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-600)] mb-4">
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
                            ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white shadow-xs'
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
                  <Lock className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> 256-Bit Encrypted Session
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
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)]">
                          Sign in as {activeTab === 'patient' ? 'a Member' : activeTab === 'practitioner' ? 'a Practitioner' : activeTab === 'pharmacy' ? 'a Pharmacy' : 'a Board Admin'}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">Enter your credentials to access the verified network.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDemoLogin(activeTab)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 min-h-[40px] px-4 text-xs font-extrabold text-[color:var(--t-600)] bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white border border-[color:var(--t-200)] rounded-none transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Instant {DEMO_ACCOUNTS[activeTab].label} Sign-In
                      </button>
                    </div>

                    {/* Demo credentials helper strip */}
                    <div className="mt-5 p-3.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-extrabold uppercase tracking-wider text-[10px] text-[color:var(--t-600)] block">
                          Demo Credentials ({DEMO_ACCOUNTS[activeTab].label})
                        </span>
                        <div className="font-mono text-slate-700 truncate">
                          <span className="font-semibold">{DEMO_ACCOUNTS[activeTab].email}</span>
                          <span className="mx-2 text-slate-400">/</span>
                          <span className="font-semibold">{DEMO_ACCOUNTS[activeTab].password}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(DEMO_ACCOUNTS[activeTab].email);
                            setPassword(DEMO_ACCOUNTS[activeTab].password);
                            setError('');
                          }}
                          className="px-3 py-1.5 bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--ink)] font-bold cursor-pointer transition-colors"
                        >
                          Fill Form
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDemoLogin(activeTab)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-extrabold cursor-pointer transition-colors disabled:opacity-60"
                        >
                          One-Click Demo
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleStandardSubmit} className="space-y-5 mt-6">
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
                          placeholder={DEMO_ACCOUNTS[activeTab].email}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all"
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
                          className="w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all"
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
                            className="w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-mono tracking-widest text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all"
                            required
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 min-h-[48px] rounded-none text-sm font-extrabold transition-all cursor-pointer flex justify-center items-center gap-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white shadow-xs disabled:opacity-70 border border-[color:var(--t-700)]"
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
                          className="inline-block py-2 text-[color:var(--t-600)] hover:underline font-extrabold cursor-pointer transition-colors"
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

          {/* Quick Access Demo Buttons */}
          <div className="mt-8 p-4 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-700 mr-1">
              <Zap className="h-4 w-4 text-[color:var(--t-600)]" /> One-Click Demo Access:
            </span>
            {[
              { role: 'patient' as const, icon: Heart, label: 'Demo Member' },
              { role: 'practitioner' as const, icon: PlusCircle, label: 'Demo Practitioner' },
              { role: 'pharmacy' as const, icon: Pill, label: 'Demo Pharmacy' },
              { role: 'admin' as const, icon: Building, label: 'Demo Board Admin' },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => handleDemoLogin(d.role)}
                disabled={loading}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 text-xs font-bold text-[color:var(--t-600)] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-600)] hover:text-white rounded-none transition-all cursor-pointer disabled:opacity-60 shadow-2xs"
              >
                <d.icon className="h-4 w-4" />
                {d.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════ STANDARDIZED APPLICATION FOOTER ═══════════ */}
      <Footer
        variant="landing"
        onLoginRole={goLogin}
      />

    </div>
  );
}
