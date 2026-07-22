import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  ShieldCheck, Search, Users, Award, FileText,
  Sparkles, Calendar, BookOpen, Globe, CheckCircle2, RefreshCw,
  Heart, MessageSquare, AlertTriangle, Key, ArrowRight, UserCheck,
  Stethoscope, Activity, Building, Lock, AlertCircle, PlusCircle,
  Star, Quote, ChevronRight, Zap, Shield, Eye, ExternalLink
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, VerificationStatus } from '../types';
import PatientRegistrationForm from './PatientRegistrationForm';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface LandingPageProps {
  professionals: (DoctorProfile | NurseProfile)[];
  onLoginSuccess: (user: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string }) => void;
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
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// TESTIMONIAL DATA
// ─────────────────────────────────────────────
const TESTIMONIALS = [
  {
    id: 1,
    quote: "CareVerify transformed how our hospital vets incoming practitioners. What used to take 3 weeks now takes 48 hours with full MMC cross-referencing.",
    name: "Dato' Dr. Lim Wei Keat",
    title: "Chief Medical Officer, Pantai Hospital KL",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120",
    rating: 5,
  },
  {
    id: 2,
    quote: "As a patient, I finally feel confident knowing my doctor's license is verified in real-time. The booking and prescription system is seamless.",
    name: "Nurul Aisyah Binti Hassan",
    title: "Registered Patient",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120",
    rating: 5,
  },
  {
    id: 3,
    quote: "The clinical shift marketplace has been a game-changer for locum work. Transparent pay, verified hospitals, and instant applications.",
    name: "Nurse Faridah Binti Yusof",
    title: "ICU Senior Nurse, LJM Registered",
    avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=120",
    rating: 5,
  },
];

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function LandingPage({ professionals, onLoginSuccess }: LandingPageProps) {
  // Login State
  const [activeTab, setActiveTab] = useState<'patient' | 'practitioner' | 'admin'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  // Instant Verification Lookup State
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<(DoctorProfile | NurseProfile)[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Navbar scroll state
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        onLoginSuccess({ role: 'patient', name: 'Ahmad Fauzi Bin Ramli', email: 'swarnabhaumik@gmail.com', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' });
      } else if (role === 'practitioner') {
        onLoginSuccess({ role: 'practitioner', name: 'Dr. Tan Seng Hock', email: 'tan@medicert.com', avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120' });
      } else if (role === 'admin') {
        onLoginSuccess({ role: 'admin', name: 'Sharifah Noor Al-Hadi', email: 'admin@medicert.com', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120' });
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
        onLoginSuccess({ role: 'patient', name: 'Ahmad Fauzi Bin Ramli', email, avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' });
      } else if (activeTab === 'practitioner') {
        onLoginSuccess({ role: 'practitioner', name: 'Dr. Tan Seng Hock', email, avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120' });
      } else {
        onLoginSuccess({ role: 'admin', name: 'Sharifah Noor Al-Hadi', email, avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120' });
      }
    }, 600);
  };

  // Animated counters
  const verifiedCount = useCounter(2400, 2200);
  const hospitalCount = useCounter(150, 1800);
  const consultationCount = useCounter(58000, 2500);
  const uptimeCount = useCounter(99, 1400);

  // Tab color mapping
  const tabColors = {
    patient: { active: 'bg-blue-600', ring: 'ring-blue-500/20', shadow: 'shadow-blue-500/10' },
    practitioner: { active: 'bg-emerald-600', ring: 'ring-emerald-500/20', shadow: 'shadow-emerald-500/10' },
    admin: { active: 'bg-indigo-600', ring: 'ring-indigo-500/20', shadow: 'shadow-indigo-500/10' },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased selection:bg-teal-100 selection:text-teal-900">

      {/* ═══════════════════════════════════════════
          SECTION 1: ENTERPRISE NAVBAR
          ═══════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-4 sm:px-6 lg:px-8 ${
          scrolled
            ? 'py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_12px_rgba(0,0,0,0.04)]'
            : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`p-2.5 rounded-xl shadow-md shrink-0 transition-colors duration-500 ${
                scrolled ? 'bg-teal-600 text-white' : 'bg-white/10 glass text-white'
              }`}
            >
              <Stethoscope className="h-5 w-5" />
            </motion.div>
            <div>
              <span className={`text-base font-extrabold tracking-tight block leading-none transition-colors duration-500 ${
                scrolled ? 'text-slate-900' : 'text-white'
              }`}>
                CareVerify
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] block mt-1 transition-colors duration-500 ${
                scrolled ? 'text-teal-700' : 'text-teal-300'
              }`}>
                Verified Network
              </span>
            </div>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-3">
            <a
              href="#verify-section"
              className={`hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                scrolled
                  ? 'text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200'
                  : 'text-white/80 hover:text-white hover:bg-white/10 border border-white/20'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify License
            </a>
            <a
              href="#login-section"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
            >
              Access Portal
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          SECTION 2: HERO
          ═══════════════════════════════════════════ */}
      <header className="relative hero-mesh min-h-[92vh] flex items-center overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=2000&q=80" alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/8 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full text-[11px] font-bold text-teal-300 uppercase tracking-wider mb-8">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                MMC & LJM Regulatory Integrated
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] mb-6"
            >
              The Trust Infrastructure for{' '}
              <span className="gradient-text">Verified Medical Professionals</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-base sm:text-lg text-slate-300 max-w-xl font-medium leading-relaxed mb-10"
            >
              CareVerify unites medical boards, clinics, and patients in a single secure environment. Instantly verify credentials, schedule consultations, and manage digital prescriptions with absolute trust.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="flex flex-wrap gap-4 mb-14"
            >
              <a
                href="#login-section"
                className="group px-7 py-3.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold rounded-2xl transition-all shadow-xl shadow-teal-500/25 flex items-center gap-2.5 cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="#verify-section"
                className="px-7 py-3.5 glass text-white text-sm font-bold rounded-2xl transition-all hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-teal-400" />
                Verify a License
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.75 }}
              className="flex flex-wrap gap-3"
            >
              {[
                { icon: ShieldCheck, label: 'HIPAA Certified', color: 'text-teal-400' },
                { icon: CheckCircle2, label: 'MMC Registry', color: 'text-emerald-400' },
                { icon: Lock, label: 'AES-256 Encrypted', color: 'text-cyan-400' },
                { icon: Shield, label: 'SOC-2 Compliant', color: 'text-indigo-400' },
              ].map((badge, i) => (
                <motion.span
                  key={badge.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-2 px-3.5 py-2 glass rounded-xl text-[11px] font-semibold text-slate-300 hover:bg-white/10 transition-all cursor-default"
                >
                  <badge.icon className={`h-3.5 w-3.5 ${badge.color}`} />
                  {badge.label}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
      </header>

      {/* ═══════════════════════════════════════════
          SECTION 3: STATS COUNTER BAR
          ═══════════════════════════════════════════ */}
      <section className="relative -mt-12 z-20 px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {[
                  { ref: verifiedCount.ref, count: verifiedCount.count, suffix: '+', label: 'Verified Professionals', icon: UserCheck, color: 'text-teal-600 bg-teal-50' },
                  { ref: hospitalCount.ref, count: hospitalCount.count, suffix: '+', label: 'Partner Hospitals', icon: Building, color: 'text-indigo-600 bg-indigo-50' },
                  { ref: consultationCount.ref, count: consultationCount.count, suffix: '+', label: 'Consultations Delivered', icon: Heart, color: 'text-rose-600 bg-rose-50' },
                  { ref: uptimeCount.ref, count: uptimeCount.count, suffix: '.9%', label: 'Uptime SLA', icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
                ].map((stat, i) => (
                  <div key={i} ref={stat.ref} className="text-center space-y-2">
                    <div className={`inline-flex p-2.5 rounded-xl ${stat.color.split(' ')[1]} mx-auto`}>
                      <stat.icon className={`h-5 w-5 ${stat.color.split(' ')[0]}`} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                      {stat.count.toLocaleString()}{stat.suffix}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════════════════════════════════════
          MAIN BODY
          ═══════════════════════════════════════════ */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">

        {/* ─── SECTION 4: PUBLIC LICENSE VERIFICATION LOOKUP ─── */}
        <AnimatedSection>
          <section id="verify-section" className="max-w-4xl mx-auto scroll-mt-24">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-lg shadow-slate-100/80 relative overflow-hidden">
              {/* Decorative gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 rounded-t-3xl" />

              <div className="text-center space-y-3 mb-8">
                <div className="inline-flex p-3 bg-teal-50 rounded-2xl mb-2">
                  <ShieldCheck className="h-6 w-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  Public License Verification
                </h2>
                <p className="text-sm text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
                  Anyone can verify a practitioner's active MMC or LJM registration status. Search by name, medical council license number, or specialization.
                </p>
              </div>

              <form onSubmit={handleInstantLookup} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder='Search name, license, or specialty (e.g. "MMC-32109", "Cardiologist")'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:border-teal-300 transition-all"
                    id="landing-search-input"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-md shadow-teal-600/15 flex items-center justify-center gap-2"
                  id="landing-search-submit-btn"
                >
                  <Search className="h-4 w-4" />
                  Verify
                </button>
              </form>

              {/* Results */}
              <AnimatePresence mode="wait">
                {hasSearched && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-slate-100 pt-6 mt-8 space-y-4 max-w-xl mx-auto"
                  >
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Results ({lookupResult?.length || 0})
                    </h3>

                    {lookupResult && lookupResult.length > 0 ? (
                      <div className="space-y-3">
                        {lookupResult.map((p, i) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex gap-4 items-center justify-between hover:border-teal-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex gap-3 items-center min-w-0">
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-sm shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{p.specialization}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-1">License: {p.licenseNumber}</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified Active
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">
                                {p.role === UserRole.DOCTOR ? 'MMC Registered' : 'LJM Registered'}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">No Registered Profile Found</p>
                          <p className="text-xs text-amber-700 font-medium mt-0.5">
                            No matching verified practitioner found. Please check the spelling or license code.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </AnimatedSection>

        {/* ─── SECTION 5: VALUE PROPOSITION BENTO GRID ─── */}
        <section className="space-y-10">
          <AnimatedSection className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full border border-teal-200 uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Platform Overview
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              One Network, Three Perspectives
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              CareVerify provides specialized modules for patients, practitioners, and clinical administrators — each designed to perfection.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Heart, color: 'blue', delay: 0,
                title: 'For Registered Patients',
                desc: 'Access your secure dashboard. View digital e-prescriptions, log vitals, track appointments, consult certified specialists, and share medical histories.',
                features: ['AI Symptom specialty matchmaking', 'Digital e-prescriptions directory', 'Secure end-to-end messenger'],
                gradient: 'from-blue-500/10 to-cyan-500/5',
                border: 'hover:border-blue-300',
                iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
                checkColor: 'text-blue-600',
              },
              {
                icon: PlusCircle, color: 'emerald', delay: 0.1,
                title: 'For Doctors & Nurses',
                desc: 'Verify credentials through our step-by-step terminal. Apply for clinical shifts, manage patient files, and communicate within HIPAA-protected channels.',
                features: ['Step-by-step verification board', 'Clinical locum shift recruitment', 'Peer-reviewed publications'],
                gradient: 'from-emerald-500/10 to-teal-500/5',
                border: 'hover:border-emerald-300',
                iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                checkColor: 'text-emerald-600',
              },
              {
                icon: ShieldCheck, color: 'indigo', delay: 0.2,
                title: 'For Medical Board Admins',
                desc: 'Audit registration documents in real-time. Manage expansion modules, monitor SEO compliance, and oversee licensing across the platform.',
                features: ['Direct licensing document audit', 'Modular package/feature toggles', 'HIPAA telemetry & analytics'],
                gradient: 'from-indigo-500/10 to-purple-500/5',
                border: 'hover:border-indigo-300',
                iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                checkColor: 'text-indigo-600',
              },
            ].map((card, i) => (
              <AnimatedSection key={card.title} delay={card.delay}>
                <div className={`group bg-white border border-slate-200/80 rounded-3xl p-7 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${card.border} relative overflow-hidden h-full`}>
                  {/* Decorative gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  <div className="relative space-y-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-black text-slate-900">{card.title}</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  <ul className="relative space-y-2.5 pt-5 border-t border-slate-100 mt-6">
                    {card.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2.5 text-xs font-semibold ${card.checkColor}`}>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ─── SECTION 6: TESTIMONIALS / SOCIAL PROOF ─── */}
        <section className="space-y-10">
          <AnimatedSection className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 uppercase tracking-wider">
              <Star className="h-3 w-3" /> Trusted Across Malaysia
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              What Our Community Says
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Hear from the hospitals, practitioners, and patients who rely on CareVerify every day.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={t.id} delay={i * 0.1}>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full relative">
                  {/* Quote mark */}
                  <div className="absolute top-5 right-6 text-slate-100">
                    <Quote className="h-10 w-10" />
                  </div>

                  <div className="relative space-y-4">
                    {/* Stars */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, si) => (
                        <Star key={si} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100 mt-6">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {t.name}
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">{t.title}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ─── SECTION 7: LOGIN PORTAL ─── */}
        <AnimatedSection>
          <section id="login-section" className="max-w-2xl mx-auto scroll-mt-24">
            <div className="bg-slate-900 text-white rounded-3xl p-7 sm:p-10 shadow-2xl shadow-slate-900/30 border border-slate-800 relative overflow-hidden">
              {/* Background accents */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />

              <div className="relative z-10">
                {/* Header */}
                <div className="text-center space-y-3 pb-7 border-b border-slate-800">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="bg-teal-600 inline-flex p-3 rounded-2xl shadow-lg shadow-teal-500/20"
                  >
                    <Key className="h-5 w-5 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-black tracking-tight">Access CareVerify Portal</h2>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                    Sign in with your registered account to access your personalized dashboard.
                  </p>
                </div>

                {/* Tab Selectors */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/80 rounded-xl mt-7 border border-slate-800/80">
                  {[
                    { key: 'patient' as const, label: 'Patient', icon: Heart, activeColor: 'bg-teal-600' },
                    { key: 'practitioner' as const, label: 'Practitioner', icon: PlusCircle, activeColor: 'bg-emerald-600' },
                    { key: 'admin' as const, label: 'Board Admin', icon: Building, activeColor: 'bg-indigo-600' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveTab(tab.key); setError(''); setIsRegistering(false); }}
                      className={`relative py-2.5 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === tab.key
                          ? `${tab.activeColor} text-white shadow-md`
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Registration or Login */}
                <AnimatePresence mode="wait">
                  {isRegistering && activeTab === 'patient' ? (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="pt-7"
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
                      key="login"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                    >
                      {/* Login Form */}
                      <form onSubmit={handleStandardSubmit} className="space-y-5 pt-7">
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-300 p-3.5 rounded-xl flex gap-2.5 text-xs font-medium"
                          >
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                            <span>{error}</span>
                          </motion.div>
                        )}

                        <div className="space-y-2">
                          <label htmlFor="login-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Email Address
                          </label>
                          <input
                            id="login-email"
                            type="email"
                            placeholder={
                              activeTab === 'patient' ? 'patient@careverify.com' :
                              activeTab === 'practitioner' ? 'doctor@careverify.com' : 'admin@careverify.com'
                            }
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition-all"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="login-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Password
                          </label>
                          <input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition-all"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className={`w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex justify-center items-center gap-2.5 shadow-lg ${
                            activeTab === 'patient' ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20' :
                            activeTab === 'practitioner' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' :
                            'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                          } text-white`}
                        >
                          {loading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Authenticating...
                            </>
                          ) : (
                            <>
                              Sign In to {activeTab === 'patient' ? 'Patient Portal' : activeTab === 'practitioner' ? 'Practitioner Hub' : 'Admin Panel'}
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </form>

                      {activeTab === 'patient' && (
                        <div className="pt-5 text-center">
                          <span className="text-xs text-slate-400 font-medium">
                            Need an account?{' '}
                            <button
                              type="button"
                              onClick={() => { setError(''); setIsRegistering(true); }}
                              className="text-teal-400 hover:text-teal-300 font-bold cursor-pointer underline underline-offset-2 hover:no-underline transition-colors"
                            >
                              Register as New Patient
                            </button>
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sandbox Access Bypass */}
                <div className="pt-7 border-t border-slate-800 mt-7">
                  <button
                    type="button"
                    onClick={() => setShowSandbox(!showSandbox)}
                    className="w-full text-center text-[10px] font-bold uppercase text-slate-500 tracking-widest cursor-pointer hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="h-3 w-3" />
                    {showSandbox ? 'Hide' : 'Show'} Quick Access Demo Logins
                    <ChevronRight className={`h-3 w-3 transition-transform ${showSandbox ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showSandbox && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4">
                          <button
                            type="button"
                            onClick={() => handleSandboxLogin('patient')}
                            className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 p-3.5 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                          >
                            <Heart className="h-4 w-4 text-teal-400" />
                            <span>Test Patient Hub</span>
                            <span className="text-[9px] text-slate-500 font-medium">(Ahmad Fauzi)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSandboxLogin('practitioner')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 p-3.5 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                          >
                            <PlusCircle className="h-4 w-4 text-emerald-400" />
                            <span>Test Practitioner</span>
                            <span className="text-[9px] text-slate-500 font-medium">(Dr. Tan Seng Hock)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSandboxLogin('admin')}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 p-3.5 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                          >
                            <Building className="h-4 w-4 text-indigo-400" />
                            <span>Test Board Admin</span>
                            <span className="text-[9px] text-slate-500 font-medium">(Sharifah Noor)</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </main>

      {/* ═══════════════════════════════════════════
          SECTION 8: ENTERPRISE FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-slate-800/60">

            {/* Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-600 p-2 rounded-xl">
                  <Stethoscope className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-white tracking-tight block leading-none">CareVerify</span>
                  <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider block mt-0.5">Verified Network</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Enterprise-grade medical credential verification platform. Connecting licensed practitioners with patients through secure, regulatory-aligned infrastructure.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                All Systems Operational
              </div>
            </div>

            {/* Platform Links */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Platform</h4>
              <ul className="space-y-2.5">
                {['Patient Dashboard', 'Doctor Registry', 'Nurse Registry', 'Clinical Shifts', 'Medical Library'].map((link) => (
                  <li key={link}>
                    <a href="#login-section" className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 group">
                      <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-teal-400 transition-colors" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compliance */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Compliance</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'HIPAA Security', icon: ShieldCheck },
                  { label: 'MMC Regulatory', icon: Award },
                  { label: 'LJM Standards', icon: FileText },
                  { label: 'AES-256 Encryption', icon: Lock },
                  { label: 'SOC-2 Type II', icon: Shield },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <item.icon className="h-3 w-3 text-slate-600" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal & Contact */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Data Processing Agreement', 'Cookie Policy', 'Contact Support'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 group">
                      <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-teal-400 transition-colors" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
            <p className="text-[11px] text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} CareVerify Sdn Bhd. All rights reserved. Regulated under the Malaysian Medical Act 1971.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors cursor-pointer">
                <Globe className="h-3 w-3" /> EN
              </span>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1.5 hover:text-slate-300 transition-colors cursor-pointer">
                <Globe className="h-3 w-3" /> BM
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
