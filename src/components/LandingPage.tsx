import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  ShieldCheck, Search, CheckCircle2, RefreshCw, Heart,
  AlertTriangle, ArrowRight, Lock, AlertCircle, PlusCircle,
  Building, ChevronRight, Zap, Globe, Award, FileText,
  Sparkles, Calendar, Users, Stethoscope, Activity, Check, UserCheck,
  Clock, PhoneCall, FileSpreadsheet, Pill, Hospital, ExternalLink, Shield
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole } from '../types';
import PatientRegistrationForm from './PatientRegistrationForm';
import heroBgImage from '../../assets/medical_hero_bg.jpg';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface LandingPageProps {
  professionals: (DoctorProfile | NurseProfile)[];
  onLoginSuccess: (user: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string }) => void;
}

// ─────────────────────────────────────────────
// CareVerified Medical Cross mark (solid iconic emblem)
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
    badge: 'Under 3-Min SLA',
    summary: 'Direct WebRTC video & audio room pairing patients with verified on-call doctors for immediate emergency triage, symptom assessment, and hospital referral.',
    highlights: [
      'Instant video room generation with end-to-end AES-256 encryption',
      'Smart symptom specialty matching engine',
      'Direct emergency room triage escalation protocol'
    ],
    metricValue: '< 3 Min',
    metricLabel: 'Average Consultation Wait',
    ctaText: 'Launch Telehealth Room'
  },
  {
    id: 'credential',
    title: 'Regulatory Credential Audit',
    tagline: 'MMC & LJM Registry Sync',
    icon: ShieldCheck,
    badge: 'Real-time API',
    summary: 'Live cross-referencing with official medical council databases. Automatically validates Annual Practicing Certificates (APC) and issues verified digital practitioner badges.',
    highlights: [
      'Automated daily MMC & LJM database synchronization',
      'Tamper-proof digital badge verification URL',
      'Instant disciplinary & licensing alert telemetry'
    ],
    metricValue: '100%',
    metricLabel: 'Verified MMC License Audit',
    ctaText: 'Verify a Practitioner'
  },
  {
    id: 'prescriptions',
    title: 'E-Prescriptions & Vitals Vault',
    tagline: 'Digital Pharmacy & Patient Record',
    icon: Pill,
    badge: 'HIPAA Compliant',
    summary: 'Doctor-signed digital prescriptions dispatched to accredited partner pharmacies, alongside patient biometric vitals tracking and exportable health history.',
    highlights: [
      'Pharmacist-verified digital signature authentication',
      'Biometric vitals logging (blood pressure, HR, glucose)',
      'Exportable PDF medical history records'
    ],
    metricValue: '58,000+',
    metricLabel: 'E-Prescriptions Issued',
    ctaText: 'View E-Prescriptions'
  },
  {
    id: 'locum',
    title: 'Hospital Locum Shift Network',
    tagline: 'Clinical Staffing Marketplace',
    icon: Hospital,
    badge: 'Accredited Hospitals',
    summary: 'Transparent clinical shift recruitment matching verified doctors and senior ICU nurses with accredited private and public hospital openings.',
    highlights: [
      'Verified hospital clinical shift postings',
      'Transparent hourly pay rates & instant application',
      'Automated credential check before shift assignment'
    ],
    metricValue: '150+',
    metricLabel: 'Partner Hospital Facilities',
    ctaText: 'Explore Shift Market'
  }
];

const PERSPECTIVES = [
  {
    roleKey: 'patient' as const,
    icon: Heart,
    title: 'For Patients & Families',
    tagline: 'Empowered Health Decisions',
    desc: 'Access verified doctors and nurses instantly. View real-time active e-prescriptions, log health vitals, book tele-consultations, and share medical history securely.',
    features: ['Smart symptom specialty matching', 'Instant digital e-prescriptions directory', 'End-to-end encrypted medical messaging'],
    badge: 'Patient Portal',
    ctaText: 'Launch Patient Portal'
  },
  {
    roleKey: 'practitioner' as const,
    icon: UserCheck,
    title: 'For Doctors & Nurses',
    tagline: 'Verified Clinical Practice',
    desc: 'Streamline credentialing through a step-by-step verification terminal. Apply for verified hospital shifts, manage patient consultations, and access peer-reviewed journals.',
    features: ['Real-time MMC & LJM credential check', 'Clinical locum shift marketplace', 'HIPAA-compliant telehealth hub'],
    badge: 'Practitioner Hub',
    ctaText: 'Access Practitioner Hub'
  },
  {
    roleKey: 'admin' as const,
    icon: Building,
    title: 'For Medical Boards & Admins',
    tagline: 'Governance & Auditing',
    desc: 'Audit registration documents in real time. Manage platform expansion modules, monitor regulatory compliance, and oversee licensing telemetry across the network.',
    features: ['Direct licensing document audit suite', 'Modular package and feature toggles', 'HIPAA telemetry & analytics dashboard'],
    badge: 'Board Admin',
    ctaText: 'Open Admin Audit Console'
  },
];

const TESTIMONIALS = [
  {
    id: 1,
    quote: "MedCred transformed how our hospital vets incoming practitioners. What used to take 3 weeks now takes 48 hours with full MMC cross-referencing.",
    name: "Dato' Dr. Lim Wei Keat",
    title: "Chief Medical Officer, Kuala Lumpur Specialist Hospital",
    avatar: "/assets/malaysian_male_doctor.jpg"
  },
  {
    id: 2,
    quote: "As a patient, I finally feel confident knowing my doctor's license is verified in real-time. The booking and prescription system is seamless.",
    name: "Nurul Aisyah Binti Hassan",
    title: "Registered Patient, Kuala Lumpur",
    avatar: "/assets/malaysian_female_nurse.jpg"
  },
  {
    id: 3,
    quote: "The clinical shift marketplace has been a game-changer for locum work. Transparent pay, verified hospitals, and instant applications.",
    name: "Nurse Faridah Binti Yusof",
    title: "ICU Senior Nurse, LJM Registered",
    avatar: "/assets/malaysian_female_nurse.jpg"
  },
];


// ═══════════════════════════════════════════════
// MAIN COMPONENT (THIN BORDERS - LIGHT NAVBAR & HERO - NO BLACK BORDERS)
// ═══════════════════════════════════════════════
export default function LandingPage({ professionals, onLoginSuccess }: LandingPageProps) {
  // Login State
  const [activeTab, setActiveTab] = useState<'patient' | 'practitioner' | 'admin'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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

  // Quick Bypass Logins
  const handleSandboxLogin = (role: 'patient' | 'practitioner' | 'admin') => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (role === 'patient') {
        onLoginSuccess({ role: 'patient', name: 'Ahmad Fauzi Bin Ramli', email: 'swarnabhaumik@gmail.com', avatarUrl: '/assets/malaysian_male_patient.jpg' });
      } else if (role === 'practitioner') {
        onLoginSuccess({ role: 'practitioner', name: 'Dr. Tan Seng Hock', email: 'tan@medicert.com', avatarUrl: '/assets/malaysian_male_doctor.jpg' });
      } else if (role === 'admin') {
        onLoginSuccess({ role: 'admin', name: 'Sharifah Noor Al-Hadi', email: 'admin@medicert.com', avatarUrl: '/assets/malaysian_female_doctor.jpg' });
      }
    }, 450);
  };

  // Standard Login Submission
  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (activeTab === 'patient') {
        onLoginSuccess({ role: 'patient', name: 'Ahmad Fauzi Bin Ramli', email, avatarUrl: '/assets/malaysian_male_patient.jpg' });
      } else if (activeTab === 'practitioner') {
        onLoginSuccess({ role: 'practitioner', name: 'Dr. Tan Seng Hock', email, avatarUrl: '/assets/malaysian_male_doctor.jpg' });
      } else {
        onLoginSuccess({ role: 'admin', name: 'Sharifah Noor Al-Hadi', email, avatarUrl: '/assets/malaysian_female_doctor.jpg' });
      }
    }, 600);
  };

  // Animated counters
  const verifiedCount = useCounter(2400, 2200);
  const hospitalCount = useCounter(150, 1800);
  const consultationCount = useCounter(58000, 2500);
  const uptimeCount = useCounter(99, 1400);

  const stats = [
    { ref: verifiedCount.ref, count: verifiedCount.count, suffix: '+', label: 'Verified Professionals' },
    { ref: hospitalCount.ref, count: hospitalCount.count, suffix: '+', label: 'Partner Hospitals' },
    { ref: consultationCount.ref, count: consultationCount.count, suffix: '+', label: 'Consultations Delivered' },
    { ref: uptimeCount.ref, count: uptimeCount.count, suffix: '.9%', label: 'Network Uptime SLA' },
  ];

  const activeModule = PROFESSIONAL_ASSISTANCE_MODULES.find(m => m.id === activeModuleId) || PROFESSIONAL_ASSISTANCE_MODULES[0];

  const inputClass = 'w-full bg-white/10 border border-white/30 rounded-none px-4 h-[50px] text-base font-medium text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all';

  return (
    <div className="min-h-screen bg-[#FDFBFB] text-[#1E293B] font-body flex flex-col antialiased selection:bg-[#FFE4E6] selection:text-[#DC2626]">

      {/* ═══════════ TOP BANNER ═══════════ */}
      <div className="bg-[#FFE4E6] text-[#DC2626] text-xs font-semibold py-2 px-4 text-center border-b border-[#FECDD3] flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-[#DC2626] text-white px-2.5 py-0.5 rounded-none text-[10px] uppercase tracking-wider font-bold">
          <Cross className="h-2.5 w-2.5" /> CareVerified Standard
        </span>
        <span>Online Medical Assistance Platform — Verification &amp; Telehealth Network</span>
      </div>

      {/* ═══════════ NAVBAR (LIGHT TONE PRIMARY BACKGROUND) ═══════════ */}
      <nav className="sticky top-0 z-50 bg-[#FFF1F2]/95 backdrop-blur-md border-b border-[#FECDD3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <a href="#top" className="flex items-center gap-3.5 group">
            <span className="w-10 h-10 rounded-none bg-[#DC2626] flex items-center justify-center text-white border border-[#B91C1C] group-hover:bg-[#B91C1C] transition-colors">
              <Cross className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-black text-2xl tracking-tight text-[#1E293B]">
                MedCred<span className="text-[#DC2626]">.</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#DC2626] mt-1">
                Medical Assistance Platform
              </span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#verify-section"
              className="hidden sm:inline-flex items-center gap-2 min-h-[42px] px-5 text-sm font-bold text-[#DC2626] bg-white border border-[#FECDD3] rounded-none hover:bg-[#FFE4E6] transition-all cursor-pointer"
            >
              <Search className="h-4 w-4" />
              Verify a License
            </a>
            <a
              href="#login-section"
              className="inline-flex items-center gap-2 min-h-[42px] px-6 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] border border-[#B91C1C] rounded-none shadow-xs transition-all cursor-pointer"
            >
              Access Portal
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO HEADER (LIGHT CRIMSON BACKGROUND - ZERO BLACK BACKGROUNDS) ═══════════ */}
      <header id="top" className="relative text-[#1E293B] border-b border-[#FECDD3] overflow-hidden min-h-[560px] bg-[#FFF0F2]">
        {/* Clinical Background Image (Opacity strictly set to 80%) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
          style={{ backgroundImage: `url(${heroBgImage})`, opacity: 0.5 }}
        />
        <Cross className="absolute -right-24 -bottom-36 h-[520px] w-[520px] text-[#DC2626] opacity-5 pointer-events-none z-0" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-12 pb-14 lg:pt-16 lg:pb-18 flex flex-wrap items-center justify-between gap-10 z-10">
          {/* Left Column — Clean Light Crimson Layout */}
          <div className="flex-[1_1_500px] min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-white border border-[#FECDD3] text-[11px] font-extrabold uppercase tracking-widest text-[#DC2626] mb-5 shadow-xs"
            >
              <Cross className="h-3 w-3 text-[#DC2626] animate-pulse" />
              MMC &amp; LJM Integrated Medical Assistance Network
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-tight text-[#1E293B] drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] mb-4"
            >
              Next-generation online medical assistance &amp; doctor network.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-base sm:text-lg text-[#334155] font-semibold max-w-xl leading-relaxed mb-7 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]"
            >
              MedCred provides real-time online medical assistance, 24/7 doctor tele-consultations, MMC credential auditing, and digital e-prescriptions built with verified clinical standards.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap gap-3.5 mb-8"
            >
              <a
                href="#login-section"
                className="group inline-flex items-center gap-2.5 min-h-[48px] px-7 text-sm font-extrabold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-none shadow-md transition-all cursor-pointer border border-[#B91C1C]"
              >
                Access Portal Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#verify-section"
                className="inline-flex items-center gap-2 min-h-[48px] px-7 text-sm font-bold text-[#1E293B] bg-white border border-[#FECDD3] hover:bg-[#FFE4E6] rounded-none transition-all cursor-pointer shadow-xs"
              >
                <Search className="h-4 w-4 text-[#DC2626]" />
                Verify a Doctor
              </a>
            </motion.div>

            {/* Certification Badges */}
            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-[#1E293B]">
              {['24/7 Telehealth Triage', 'MMC Registered Doctors', 'AES-256 Encrypted', 'SOC-2 Type II'].map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-white/95 border border-[#FECDD3] text-[#1E293B] font-bold shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column — Glass & Hairline Border Showcase Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex-[1_1_340px] min-w-0 max-w-[420px]"
          >
            <div className="bg-white text-[#1A1A1A] rounded-none p-6 shadow-xl border border-[#FECDD3] relative">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-none bg-[#FFE9EB] border border-[#FECDD3] flex items-center justify-center text-[#C8102E]">
                    <Cross className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 block">Medical Assistance Badge</span>
                    <span className="text-xs font-bold text-[#1A1A1A]">Verified Practitioner</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-ping" />
                  Verified Active
                </span>
              </div>

              {/* Doctor Details */}
              <div className="flex items-center gap-3.5 mb-4">
                <img
                  src="/assets/malaysian_male_doctor.jpg"
                  alt="Dr. Tan Seng Hock"
                  className="w-14 h-14 rounded-full object-cover border border-[#FECDD3] shadow-xs"
                />
                <div>
                  <h3 className="font-display font-extrabold text-xl tracking-tight text-[#1A1A1A]">Dr. Tan Seng Hock</h3>
                  <p className="text-xs font-semibold text-[#C8102E] mt-0.5">Senior Specialist · MMC Registered</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kuala Lumpur Specialist Hospital</p>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2 bg-[#FFF9F9] rounded-none p-3.5 border border-[#FECDD3] text-xs">
                <div className="flex justify-between items-center py-1 border-b border-rose-100">
                  <span className="text-slate-500 font-medium">MMC License Number</span>
                  <span className="font-mono font-bold text-[#C8102E] bg-[#FFE9EB] px-2 py-0.5 border border-[#FECDD3] rounded-none text-[11px]">MMC-32109</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-rose-100">
                  <span className="text-slate-500 font-medium">Registry Status</span>
                  <span className="font-semibold text-slate-800">Malaysian Medical Council</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Response SLA</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> &lt; 3 Min On-Call
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C8102E]" /> CareVerified Standard
                </span>
                <span className="font-mono text-[10px] text-slate-400">ID: 8F2A-9912</span>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ═══════════ STATS BAR (THIN BORDER) ═══════════ */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              ref={stat.ref}
              className={`py-8 px-6 ${i < 3 ? 'lg:border-r border-slate-200' : ''} ${i % 2 === 0 ? 'border-r sm:border-r lg:border-r-0' : ''} border-slate-200 flex flex-col justify-center`}
            >
              <div className="flex items-center gap-2">
                <Cross className="h-5 w-5 text-[#C8102E] shrink-0" />
                <div className="font-display font-black text-3xl sm:text-4xl tracking-tight text-[#1A1A1A] tabular-nums">
                  {stat.count.toLocaleString()}{stat.suffix}
                </div>
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 pl-7">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 pt-20 space-y-24 pb-20">

        {/* ─── INTERACTIVE CONTENT LAYOUT: PROFESSIONAL MEDICAL ASSISTANCE SUITE (THIN BORDERS) ─── */}
        <section>
          <AnimatedSection className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#C8102E] bg-[#FFE9EB] px-3.5 py-1.5 rounded-none border border-[#FECDD3] mb-3">
              <Cross className="h-3.5 w-3.5" /> Professional Assistance Suite
            </div>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1A1A1A] leading-[1.05]">
              Executive Medical Assistance &amp; Triage Workflows.
            </h2>
            <p className="text-lg text-slate-600 mt-3 leading-relaxed">
              Explore our core medical assistance modules engineered for real-time telehealth, regulatory auditing, and clinical care.
            </p>
          </AnimatedSection>

          {/* SPLIT LAYOUT: LEFT NAV + RIGHT STAGE (THIN BORDERS) */}
          <AnimatedSection>
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 bg-white border border-slate-200 rounded-none shadow-sm">

              {/* Left Selector Panel */}
              <div className="p-6 bg-slate-50/60 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-4 px-1">
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
                              ? 'bg-white border-[#C8102E] text-[#1A1A1A] shadow-xs'
                              : 'bg-transparent border-transparent text-slate-600 hover:bg-white hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-9 h-9 rounded-none flex items-center justify-center shrink-0 border ${
                              isActive ? 'bg-[#C8102E] border-[#A50F2A] text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                              <IconComp className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <span className="block font-bold text-sm truncate">{m.title}</span>
                              <span className="block text-[11px] text-slate-500 truncate">{m.tagline}</span>
                            </div>
                          </div>
                          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'translate-x-1 text-[#C8102E]' : 'text-slate-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#C8102E]" />
                  <span>Regulatory Compliant Protocol</span>
                </div>
              </div>

              {/* Right Stage Showcase */}
              <div className="p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFE9EB] border border-[#FECDD3] text-[#C8102E] text-xs font-extrabold uppercase tracking-wider">
                      <Cross className="h-3 w-3" /> {activeModule.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Module ID: {activeModule.id.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-display font-black text-3xl tracking-tight text-[#1A1A1A] mb-2">
                    {activeModule.title}
                  </h3>
                  <p className="text-sm font-bold uppercase tracking-wider text-[#C8102E] mb-4">
                    {activeModule.tagline}
                  </p>
                  <p className="text-slate-600 text-base leading-relaxed mb-8">
                    {activeModule.summary}
                  </p>

                  {/* Highlights Grid */}
                  <div className="mb-8">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">Clinical Capabilities</h4>
                    <div className="space-y-3">
                      {activeModule.highlights.map((h) => (
                        <div key={h} className="flex items-start gap-3 bg-slate-50/80 p-3.5 border border-slate-200 text-xs font-bold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-[#C8102E] shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Stage Footer */}
                <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <span className="block font-display font-black text-3xl text-[#C8102E] leading-none">
                      {activeModule.metricValue}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1 block">
                      {activeModule.metricLabel}
                    </span>
                  </div>

                  <a
                    href="#login-section"
                    className="inline-flex items-center gap-2.5 min-h-[48px] px-7 text-sm font-extrabold text-white bg-[#C8102E] hover:bg-[#A50F2A] rounded-none shadow-xs transition-colors cursor-pointer border border-[#A50F2A]"
                  >
                    {activeModule.ctaText}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>

            </div>
          </AnimatedSection>
        </section>

        {/* ─── SECTION 2: USER ECOSYSTEM (REDESIGNED ROLE PORTALS) ─── */}
        <section>
          <AnimatedSection className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#C8102E] bg-[#FFE9EB] px-3.5 py-1.5 rounded-none border border-[#FECDD3] mb-3">
              <Cross className="h-3.5 w-3.5" /> User Ecosystem
            </div>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1A1A1A] leading-[1.05]">
              Tailored Portals for Every Healthcare Role.
            </h2>
            <p className="text-lg text-slate-600 mt-3 leading-relaxed">
              Direct access into specialized workspaces engineered for patient health, clinical practice, and regulatory oversight.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PERSPECTIVES.map((card, i) => {
              const IconComp = card.icon;
              return (
                <AnimatedSection key={card.title} delay={i * 0.12}>
                  <article className="bg-white rounded-none p-8 border border-slate-200 hover:border-[#C8102E] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group">
                    <div>
                      {/* Card Header: Icon & Badge */}
                      <div className="flex justify-between items-center gap-3 mb-6">
                        <span className="w-12 h-12 rounded-none bg-[#FFE9EB] border border-[#FECDD3] text-[#C8102E] flex items-center justify-center group-hover:bg-[#C8102E] group-hover:text-white transition-colors">
                          <IconComp className="h-6 w-6" />
                        </span>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#C8102E] bg-[#FFE9EB] px-3 py-1 rounded-none border border-[#FECDD3]">
                          {card.badge}
                        </span>
                      </div>

                      <h3 className="font-display font-extrabold text-2xl tracking-tight text-[#1A1A1A] mb-1">
                        {card.title}
                      </h3>
                      <p className="text-xs font-bold text-[#C8102E] uppercase tracking-wider mb-4">
                        {card.tagline}
                      </p>
                      <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        {card.desc}
                      </p>

                      {/* Key Capabilities List */}
                      <div className="pt-5 border-t border-slate-200 space-y-2.5">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Key Capabilities</h4>
                        {card.features.map((f) => (
                          <div key={f} className="flex items-center gap-2.5 bg-[#FFF9F9] border border-[#FECDD3] p-2.5 text-xs font-bold text-slate-800">
                            <CheckCircle2 className="h-4 w-4 text-[#C8102E] shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Direct Portal Entry CTA Button */}
                    <div className="pt-6 mt-6 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleSandboxLogin(card.roleKey)}
                        className="w-full min-h-[46px] px-5 text-xs font-extrabold text-white bg-[#C8102E] hover:bg-[#A50F2A] border border-[#A50F2A] rounded-none shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        {card.ctaText}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                </AnimatedSection>
              );
            })}
          </div>
        </section>

        {/* ─── SECTION 3: PUBLIC LICENSE LOOKUP (LIGHT CRIMSON DESIGN) ─── */}
        <AnimatedSection>
          <section id="verify-section" className="scroll-mt-28">
            <div className="bg-[#FFF0F2] text-[#1E293B] rounded-none p-8 sm:p-14 border border-[#FECDD3] shadow-sm relative overflow-hidden">
              <Cross className="absolute -right-20 -bottom-24 h-[440px] w-[440px] text-[#DC2626] opacity-5 pointer-events-none" />

              <div className="relative z-10 max-w-4xl">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-[#DC2626] text-white text-xs font-bold uppercase tracking-wider mb-4 border border-[#B91C1C]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Instant Doctor Lookup
                </span>
                <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight leading-tight text-[#1E293B] mb-4">
                  Confirm Active Medical Licensing.
                </h2>
                <p className="text-[#334155] text-base sm:text-lg mb-8 leading-relaxed max-w-2xl font-medium">
                  Search by practitioner name, license code (e.g., MMC-32109), or specialty to verify live practicing status instantly.
                </p>

                {/* Instant Search Form */}
                <form onSubmit={handleInstantLookup} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search doctor name, license number (e.g. MMC-32109), or specialty..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 bg-white border border-[#FECDD3] rounded-none text-[#1E293B] placeholder-slate-400 font-medium focus:outline-none focus:border-[#DC2626] transition-all text-base shadow-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-14 px-8 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-base rounded-none transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-[#B91C1C] shadow-sm"
                  >
                    <Search className="h-5 w-5" />
                    Verify Now
                  </button>
                </form>

                {/* Search Results Display */}
                <AnimatePresence mode="wait">
                  {hasSearched && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="mt-8 pt-8 border-t border-white/15 space-y-4"
                    >
                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>Search Results ({lookupResult?.length || 0})</span>
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setHasSearched(false); setLookupResult(null); }}
                          className="text-[#ff8a98] hover:underline cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>

                      {lookupResult && lookupResult.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {lookupResult.map((p) => (
                            <div
                              key={p.id}
                              className="bg-white/10 border border-white/20 rounded-none p-4 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <img
                                  src={p.avatar}
                                  alt={p.name}
                                  className="w-12 h-12 rounded-none object-cover border border-white/30 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <h4 className="font-bold text-white text-base truncate">{p.name}</h4>
                                  <p className="text-xs text-slate-300 font-medium truncate">{p.specialization}</p>
                                  <p className="text-xs font-mono font-bold text-[#ff8a98] mt-0.5">License: {p.licenseNumber}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-none">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                  Active
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-none p-5 flex items-center gap-3 text-red-200 text-sm">
                          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                          <div>
                            <span className="font-bold block">No matching record found</span>
                            <span className="text-xs text-red-300">Please verify spelling or license number (e.g., MMC-32109 or LJM-8812).</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ─── SECTION 4: COMMUNITY TESTIMONIAL CARDS (THIN BORDER) ─── */}
        <section>
          <AnimatedSection className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#C8102E] bg-[#FFE9EB] px-3.5 py-1.5 rounded-none border border-[#FECDD3] mb-3">
              <Cross className="h-3.5 w-3.5" /> Community Trust
            </div>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1A1A1A]">
              What Doctors, Nurses &amp; Patients Say.
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={t.id} delay={i * 0.1}>
                <div className="bg-white rounded-none p-8 border border-slate-200 shadow-xs flex flex-col justify-between h-full relative overflow-hidden group">
                  <Cross className="absolute right-4 bottom-4 h-32 w-32 text-[#C8102E] opacity-5 pointer-events-none" />
                  <div>
                    <div className="flex text-[#C8102E] gap-1 mb-4">
                      {[...Array(5)].map((_, idx) => (
                        <span key={idx}>★</span>
                      ))}
                    </div>
                    <blockquote className="text-base text-slate-700 italic leading-relaxed mb-6">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  </div>
                  <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-11 h-11 rounded-none object-cover border border-[#FECDD3] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-sm">{t.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{t.title}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

      </main>

      {/* ═══════════ LOGIN PORTAL (REDESIGNED LIGHT THEME & THIN BORDERS) ═══════════ */}
      <section id="login-section" className="relative bg-gradient-to-br from-[#FFF0F2] via-[#FFE9EB] to-[#FFF5F6] text-[#1A1A1A] border-t border-[#FECDD3] overflow-hidden scroll-mt-20">
        <Cross className="absolute -right-24 -bottom-28 h-[520px] w-[520px] text-[#C8102E] opacity-5 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-20">
          {/* Heading */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-none bg-[#C8102E] text-white shadow-md mb-5 border border-[#A50F2A]">
              <Cross className="h-7 w-7" />
            </span>
            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-[#1A1A1A] mb-3">
              Access the MedCred Portal
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Select your role below to log into your personalized portal dashboard.
            </p>
          </div>

          {/* Split card: role picker + form */}
          <div className="grid md:grid-cols-[280px_1fr] bg-white text-[#1A1A1A] rounded-none border border-[#FECDD3] shadow-xl">
            {/* Role picker side */}
            <div className="p-6 bg-[#FFF5F6] md:border-r border-b md:border-b-0 border-[#FECDD3] flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-widest text-[#C8102E] mb-4">
                  Select User Role
                </div>
                <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5">
                  {[
                    { key: 'patient' as const, label: 'Patient', desc: 'Vitals, appointments & e-prescriptions', icon: Heart },
                    { key: 'practitioner' as const, label: 'Practitioner', desc: 'Credential verification & clinical shifts', icon: PlusCircle },
                    { key: 'admin' as const, label: 'Board Admin', desc: 'License audit & platform management', icon: Building },
                  ].map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => { setActiveTab(tab.key); setError(''); setIsRegistering(false); }}
                        aria-pressed={active}
                        className={`rounded-none p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-start items-center text-center md:text-left gap-3 border ${
                          active
                            ? 'bg-[#C8102E] border-[#A50F2A] text-white shadow-xs'
                            : 'bg-white border-[#FECDD3] text-[#1A1A1A] hover:bg-[#FFE9EB]'
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

              <div className="hidden md:block pt-6 border-t border-[#FECDD3] mt-6">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#C8102E]" /> 256-Bit Encrypted Session
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
                      onRegisterSuccess={(user) => {
                        onLoginSuccess(user);
                        setIsRegistering(false);
                      }}
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
                    <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[#1A1A1A]">
                      Sign in as {activeTab === 'patient' ? 'a Patient' : activeTab === 'practitioner' ? 'a Practitioner' : 'a Board Admin'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">Enter your credentials to access the verified network.</p>

                    <form onSubmit={handleStandardSubmit} className="space-y-5 mt-7">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#FFE9EB] border border-[#FECDD3] text-[#C8102E] p-4 rounded-none flex gap-3 text-xs font-bold"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#C8102E]" />
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
                            activeTab === 'patient' ? 'patient@medcred.com' :
                            activeTab === 'practitioner' ? 'doctor@medcred.com' : 'admin@medcred.com'
                          }
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#FFF9F9] border border-[#FECDD3] rounded-none px-4 h-[50px] text-base font-medium text-[#1A1A1A] placeholder-slate-400 focus:outline-none focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] transition-all"
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
                          className="w-full bg-[#FFF9F9] border border-[#FECDD3] rounded-none px-4 h-[50px] text-base font-medium text-[#1A1A1A] placeholder-slate-400 focus:outline-none focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] transition-all"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[52px] rounded-none text-base font-extrabold transition-all cursor-pointer flex justify-center items-center gap-2.5 bg-[#C8102E] hover:bg-[#A50F2A] text-white shadow-md disabled:opacity-70 border border-[#A50F2A]"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin text-white" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            Sign in to {activeTab === 'patient' ? 'Patient Portal' : activeTab === 'practitioner' ? 'Practitioner Hub' : 'Admin Panel'}
                            <ArrowRight className="h-5 w-5 text-white" />
                          </>
                        )}
                      </button>
                    </form>

                    {activeTab === 'patient' && (
                      <p className="pt-6 text-center text-sm text-slate-600">
                        Need a new account?{' '}
                        <button
                          type="button"
                          onClick={() => { setError(''); setIsRegistering(true); }}
                          className="text-[#C8102E] hover:underline font-extrabold cursor-pointer transition-colors"
                        >
                          Register as a New Patient
                        </button>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Access Demo Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-600">
              <Zap className="h-4 w-4 text-[#C8102E]" /> One-Click Demo Access:
            </span>
            {[
              { role: 'patient' as const, icon: Heart, label: 'Demo Patient' },
              { role: 'practitioner' as const, icon: PlusCircle, label: 'Demo Practitioner' },
              { role: 'admin' as const, icon: Building, label: 'Demo Board Admin' },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => handleSandboxLogin(d.role)}
                disabled={loading}
                className="inline-flex items-center gap-2 min-h-[42px] px-5 text-xs font-bold text-[#C8102E] bg-white border border-[#FECDD3] hover:bg-[#C8102E] hover:text-white rounded-none transition-all cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <d.icon className="h-4 w-4" />
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER (THIN BORDERS) ═══════════ */}
      <footer className="bg-[#1A1A1A] text-slate-300 border-t border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-16 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-none bg-[#C8102E] flex items-center justify-center text-white border border-[#A50F2A]">
                  <Cross className="h-5 w-5" />
                </span>
                <span className="font-display font-black text-2xl text-white">MedCred</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enterprise medical credential verification network operating under verified clinical credentialing &amp; regulatory standards.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-4">Portals</h4>
              <ul className="space-y-3 text-sm">
                {['Patient Dashboard', 'Doctor Registry', 'Nurse Registry', 'Locum Clinical Shifts', 'Medical Articles'].map((link) => (
                  <li key={link}>
                    <a href="#login-section" className="text-slate-400 hover:text-white transition-colors cursor-pointer">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-4">Regulatory Standards</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                {['HIPAA Security Compliance', 'Malaysian Medical Council (MMC)', 'Lembaga Jururawat Malaysia (LJM)', 'AES-256 Encryption Standard', 'SOC-2 Type II Certified'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#C8102E] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white mb-4">Regulatory &amp; Legal</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                {['Privacy Policy', 'Terms of Service', 'Data Processing Agreement', 'Cookie Policy', 'Support Hotline'].map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-white transition-colors cursor-pointer">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 text-xs text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} MedCred Network. Operating in alignment with Medical Act 1971 credential guidelines. CareVerified Crimson System.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-[#C8102E]" /> English</span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-[#C8102E]" /> Bahasa Melayu</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
