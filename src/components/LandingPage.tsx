import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  ShieldCheck, Search, CheckCircle2, RefreshCw, Heart,
  AlertTriangle, ArrowRight, Lock, AlertCircle, PlusCircle,
  Building, ChevronRight, Zap, Globe,
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole } from '../types';
import PatientRegistrationForm from './PatientRegistrationForm';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface LandingPageProps {
  professionals: (DoctorProfile | NurseProfile)[];
  onLoginSuccess: (user: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string }) => void;
}

// ─────────────────────────────────────────────
// Red Cross mark (solid plus)
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
  },
  {
    id: 2,
    quote: "As a patient, I finally feel confident knowing my doctor's license is verified in real-time. The booking and prescription system is seamless.",
    name: "Nurul Aisyah Binti Hassan",
    title: "Registered Patient",
  },
  {
    id: 3,
    quote: "The clinical shift marketplace has been a game-changer for locum work. Transparent pay, verified hospitals, and instant applications.",
    name: "Nurse Faridah Binti Yusof",
    title: "ICU Senior Nurse, LJM Registered",
  },
];

const PERSPECTIVES = [
  {
    title: 'For registered patients',
    desc: 'Open your secure dashboard. View e-prescriptions, log vitals, track appointments, consult certified specialists and share medical history.',
    features: ['AI symptom specialty matching', 'Digital e-prescriptions directory', 'Secure end-to-end messenger'],
  },
  {
    title: 'For doctors & nurses',
    desc: 'Verify credentials through a step-by-step terminal. Apply for clinical shifts, manage patient files and communicate in HIPAA-protected channels.',
    features: ['Step-by-step verification board', 'Clinical locum shift recruitment', 'Peer-reviewed publications'],
  },
  {
    title: 'For medical board admins',
    desc: 'Audit registration documents in real time. Manage expansion modules, monitor SEO compliance and oversee licensing across the platform.',
    features: ['Direct licensing document audit', 'Modular package and feature toggles', 'HIPAA telemetry & analytics'],
  },
];

// Remaps the app-wide teal "blue" scale to Red Cross red inside the portal,
// so the shared registration form picks up the landing palette.
const PORTAL_RED_SCALE = {
  '--color-blue-400': '#ff8a98',
  '--color-blue-500': '#e0243f',
  '--color-blue-600': '#c8102e',
  '--color-blue-700': '#a50f2a',
} as React.CSSProperties;

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

  const stats = [
    { ref: verifiedCount.ref, count: verifiedCount.count, suffix: '+', label: 'Verified professionals' },
    { ref: hospitalCount.ref, count: hospitalCount.count, suffix: '+', label: 'Partner hospitals' },
    { ref: consultationCount.ref, count: consultationCount.count, suffix: '+', label: 'Consultations delivered' },
    { ref: uptimeCount.ref, count: uptimeCount.count, suffix: '.9%', label: 'Uptime SLA' },
  ];

  const inputClass = 'w-full bg-white/5 border-[1.5px] border-white/30 rounded-md px-4 h-[52px] text-base font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cross/60 focus:border-white transition-all';

  return (
    <div className="min-h-screen bg-white text-ink font-body flex flex-col antialiased selection:bg-cross-tint selection:text-cross-dark">

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 flex flex-wrap justify-between items-center gap-4">
          <a href="#top" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-cross flex items-center justify-center text-white shrink-0">
              <Cross className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display font-black text-[21px] tracking-tight">CareVerify</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 mt-1">Verified Network</span>
            </span>
          </a>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#verify-section"
              className="hidden sm:inline-flex items-center min-h-11 px-[18px] text-sm font-semibold text-ink border-[1.5px] border-ink rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Verify a license
            </a>
            <a
              href="#login-section"
              className="inline-flex items-center gap-2 min-h-11 px-5 text-sm font-semibold text-white bg-cross hover:bg-cross-dark rounded-md transition-colors cursor-pointer"
            >
              Access portal
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <header id="top" className="relative bg-cross text-white overflow-hidden">
        <Cross className="absolute -right-32 -bottom-40 h-[560px] w-[560px] text-white opacity-10 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-20 pb-24 flex flex-wrap items-center gap-14">
          <div className="flex-[1_1_480px] min-w-0">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 border-[1.5px] border-white/70 rounded-full text-xs font-semibold uppercase tracking-widest"
            >
              <Cross className="h-3 w-3" />
              MMC &amp; LJM regulatory integrated
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display font-black text-[40px] sm:text-6xl lg:text-[76px] leading-none tracking-tighter mt-7 mb-6"
            >
              The trust infrastructure for verified medical professionals.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-[19px] text-cross-tint max-w-xl leading-relaxed mb-9"
            >
              CareVerify unites medical boards, clinics and patients in one secure environment. Verify credentials instantly, book consultations and manage digital prescriptions with absolute trust.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3.5 mb-10"
            >
              <a
                href="#login-section"
                className="group inline-flex items-center gap-2.5 min-h-[52px] px-7 text-base font-bold text-cross bg-white hover:bg-cross-tint rounded-md transition-colors cursor-pointer"
              >
                Get started free
                <ArrowRight className="h-[18px] w-[18px] group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="#verify-section"
                className="inline-flex items-center min-h-[52px] px-7 text-base font-semibold text-white border-[1.5px] border-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              >
                Verify a license
              </a>
            </motion.div>

            <div className="flex flex-wrap gap-x-5 gap-y-2.5 text-[13px] font-semibold">
              {['HIPAA certified', 'MMC registry', 'AES-256 encrypted', 'SOC-2 compliant'].map((b, i) => (
                <React.Fragment key={b}>
                  {i > 0 && <span className="opacity-60" aria-hidden="true">+</span>}
                  <span>{b}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Credential card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex-[1_1_380px] min-w-0 max-w-[500px]"
          >
            <div className="bg-white text-ink rounded-xl p-8 shadow-2xl shadow-black/40">
              <div className="flex justify-between items-center gap-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Credential check</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cross text-white text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified active
                </span>
              </div>
              <div className="font-display font-extrabold text-3xl tracking-tight leading-tight">Dr. Tan Seng Hock</div>
              <div className="text-slate-600 mt-1.5 mb-6">Pediatrician · MMC registered</div>
              <div className="border-t-2 border-ink text-sm">
                <div className="flex justify-between gap-4 py-3.5 border-b border-slate-200">
                  <span className="text-slate-600">License</span>
                  <span className="font-mono font-medium text-cross">MMC-32109</span>
                </div>
                <div className="flex justify-between gap-4 py-3.5 border-b border-slate-200">
                  <span className="text-slate-600">Registry</span>
                  <span className="font-semibold">Malaysian Medical Council</span>
                </div>
                <div className="flex justify-between gap-4 py-3.5">
                  <span className="text-slate-600">Status checked</span>
                  <span className="font-semibold">Live, at lookup</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ═══════════ STATS ═══════════ */}
      <section className="bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              ref={stat.ref}
              className={`py-10 px-6 first:pl-0 last:pr-0 ${i < 3 ? 'md:border-r border-slate-300' : ''} ${i % 2 === 0 ? 'border-r md:border-r' : ''} border-slate-300`}
            >
              <div className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none text-cross tabular-nums">
                {stat.count.toLocaleString()}{stat.suffix}
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-700">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ MAIN BODY ═══════════ */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 pt-28 space-y-28">

        {/* ─── THREE PERSPECTIVES ─── */}
        <section>
          <AnimatedSection className="max-w-2xl mb-12">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] text-cross">
              <Cross className="h-3.5 w-3.5" /> Platform overview
            </div>
            <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.02] tracking-tighter mt-3.5 mb-4">
              One network, three perspectives.
            </h2>
            <p className="text-[17px] text-slate-700">
              Specialized modules for patients, practitioners and clinical administrators, each built around the work they actually do.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PERSPECTIVES.map((card, i) => (
              <AnimatedSection key={card.title} delay={i * 0.1}>
                <article className="bg-white border-[1.5px] border-ink border-t-[6px] border-t-cross rounded-md p-8 flex flex-col gap-[18px] h-full">
                  <h3 className="font-display font-extrabold text-2xl tracking-tight">{card.title}</h3>
                  <p className="text-slate-700">{card.desc}</p>
                  <ul className="mt-auto pt-5 border-t border-slate-200 flex flex-col gap-2.5 text-sm font-semibold">
                    {card.features.map((f) => (
                      <li key={f}>+ {f}</li>
                    ))}
                  </ul>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </section>

        {/* ─── PUBLIC LICENSE VERIFICATION ─── */}
        <AnimatedSection>
          <section id="verify-section" className="scroll-mt-24">
            <div className="bg-slate-100 rounded-xl p-8 sm:p-14">
              <div className="flex flex-wrap items-center gap-10">
                <div className="flex-[1_1_360px] min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-cross">Open to everyone</div>
                  <h2 className="font-display font-black text-3xl sm:text-[44px] leading-[1.02] tracking-tighter mt-3 mb-3.5">
                    Public license verification.
                  </h2>
                  <p className="text-[17px] text-slate-700">
                    Anyone can confirm a practitioner's active MMC or LJM registration. Search by name, license number or specialization.
                  </p>
                </div>

                <form onSubmit={handleInstantLookup} className="flex-[1_1_420px] min-w-0 flex flex-wrap gap-3">
                  <label htmlFor="landing-search-input" className="sr-only">Search name, license or specialty</label>
                  <div className="relative flex-[1_1_240px] min-w-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Name, license or specialty, e.g. MMC-32109"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border-[1.5px] border-ink rounded-md pl-11 pr-4 h-14 text-base font-medium text-ink placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cross/40 focus:border-cross transition-all"
                      id="landing-search-input"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-14 px-7 bg-cross hover:bg-cross-dark text-white text-base font-bold rounded-md transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-2"
                    id="landing-search-submit-btn"
                  >
                    Verify
                  </button>
                </form>
              </div>

              <AnimatePresence mode="wait">
                {hasSearched && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-slate-300 pt-6 mt-10 space-y-4"
                  >
                    <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">
                      Results ({lookupResult?.length || 0})
                    </h3>

                    {lookupResult && lookupResult.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {lookupResult.map((p, i) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="bg-white border-[1.5px] border-ink rounded-md p-4 flex gap-4 items-center justify-between"
                          >
                            <div className="flex gap-3 items-center min-w-0">
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-11 h-11 rounded-md object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{p.name}</p>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">{p.specialization}</p>
                                <p className="text-[11px] text-cross font-mono mt-1">License: {p.licenseNumber}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="bg-cross text-white text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified active
                              </span>
                              <span className="text-[11px] text-slate-600 font-semibold block mt-1.5">
                                {p.role === UserRole.DOCTOR ? 'MMC Registered' : 'LJM Registered'}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white border-[1.5px] border-cross rounded-md p-4 flex gap-3 text-ink">
                        <AlertTriangle className="h-5 w-5 text-cross shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">No registered profile found</p>
                          <p className="text-xs text-slate-700 font-medium mt-0.5">
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

        {/* ─── TESTIMONIALS ─── */}
        <section>
          <AnimatedSection className="max-w-2xl mb-12">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-cross">Trusted across Malaysia</div>
            <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.02] tracking-tighter mt-3.5">
              What our community says.
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={t.id} delay={i * 0.1}>
                <figure className="bg-slate-100 rounded-xl p-8 flex flex-col gap-6 h-full m-0">
                  <Cross className="h-7 w-7 text-cross" />
                  <blockquote className="text-[17px] m-0">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-auto pt-5 border-t border-slate-300">
                    <div className="font-bold">{t.name}</div>
                    <div className="text-sm text-slate-600">{t.title}</div>
                  </figcaption>
                </figure>
              </AnimatedSection>
            ))}
          </div>
        </section>
      </main>

      {/* ═══════════ LOGIN PORTAL ═══════════ */}
      <section id="login-section" className="relative mt-28 bg-cross text-white overflow-hidden scroll-mt-16">
        <Cross className="absolute -right-24 -bottom-28 h-[420px] w-[420px] text-white opacity-10 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-20">
          {/* Heading */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white text-cross mb-6">
              <Cross className="h-6 w-6" />
            </span>
            <h2 className="font-display font-black text-4xl sm:text-5xl leading-none tracking-tighter mb-4">
              Access the CareVerify portal.
            </h2>
            <p className="text-lg text-cross-tint">
              Choose your role and sign in to open your personalized dashboard.
            </p>
          </div>

          {/* Split card: role picker + form */}
          <div
            className="grid md:grid-cols-[260px_1fr] bg-blue-700 text-white rounded-2xl overflow-hidden border border-white/25 shadow-2xl shadow-blue-900/40"
            style={PORTAL_RED_SCALE}
          >
            {/* Role picker */}
            <div className="p-4 md:p-5 bg-blue-800/60 md:border-r border-b md:border-b-0 border-white/10">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 px-2 pb-3 hidden md:block">
                I am a
              </div>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                {[
                  { key: 'patient' as const, label: 'Patient', desc: 'Appointments, prescriptions, vitals', icon: Heart },
                  { key: 'practitioner' as const, label: 'Practitioner', desc: 'Verification, shifts, patient files', icon: PlusCircle },
                  { key: 'admin' as const, label: 'Board Admin', desc: 'License audit, modules, analytics', icon: Building },
                ].map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => { setActiveTab(tab.key); setError(''); setIsRegistering(false); }}
                      aria-pressed={active}
                      className={`rounded-lg p-3 md:p-4 transition-colors cursor-pointer flex flex-col md:flex-row md:items-start items-center text-center md:text-left gap-2 md:gap-3 border-[1.5px] ${
                        active
                          ? 'bg-cross border-cross text-white'
                          : 'border-white/15 text-slate-200 hover:bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <tab.icon className="h-5 w-5 shrink-0 md:mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{tab.label}</span>
                        <span className={`hidden md:block text-xs mt-0.5 leading-snug ${active ? 'text-cross-tint' : 'text-slate-400'}`}>
                          {tab.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form pane */}
            <div className="p-6 sm:p-10 min-w-0">
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
                    <h3 className="font-display font-extrabold text-2xl tracking-tight">
                      Sign in as {activeTab === 'patient' ? 'a patient' : activeTab === 'practitioner' ? 'a practitioner' : 'a board admin'}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Use the email and password registered with CareVerify.</p>

                    <form onSubmit={handleStandardSubmit} className="space-y-5 mt-7">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/10 border border-cross text-white p-3.5 rounded-md flex gap-2.5 text-xs font-medium"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#ff8a98]" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                          Email address
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
                          className={inputClass}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                          Password
                        </label>
                        <input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={inputClass}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[54px] rounded-md text-base font-bold transition-colors cursor-pointer flex justify-center items-center gap-2.5 bg-cross hover:bg-cross-dark disabled:opacity-70 text-white"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            Sign in to {activeTab === 'patient' ? 'Patient Portal' : activeTab === 'practitioner' ? 'Practitioner Hub' : 'Admin Panel'}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {activeTab === 'patient' && (
                      <p className="pt-5 text-center text-sm text-slate-300">
                        Need an account?{' '}
                        <button
                          type="button"
                          onClick={() => { setError(''); setIsRegistering(true); }}
                          className="text-[#ff8a98] hover:text-white font-bold cursor-pointer underline underline-offset-2 transition-colors"
                        >
                          Register as a new patient
                        </button>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Demo logins */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-cross-tint">
              <Zap className="h-3.5 w-3.5" /> Quick access demo logins
            </span>
            {[
              { role: 'patient' as const, icon: Heart, label: 'Patient' },
              { role: 'practitioner' as const, icon: PlusCircle, label: 'Practitioner' },
              { role: 'admin' as const, icon: Building, label: 'Board Admin' },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => handleSandboxLogin(d.role)}
                disabled={loading}
                className="inline-flex items-center gap-2 min-h-11 px-4 text-sm font-semibold text-white border-[1.5px] border-white/70 hover:bg-white hover:text-cross rounded-md transition-colors cursor-pointer disabled:opacity-60"
              >
                <d.icon className="h-4 w-4" />
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-slate-100 text-slate-700 border-t border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-14 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-slate-300">
            <div>
              <div className="flex items-center gap-2.5">
                <Cross className="h-5 w-5 text-ink" />
                <span className="font-display font-black text-xl text-ink">CareVerify</span>
              </div>
              <p className="text-sm mt-3 max-w-xs">
                Enterprise-grade medical credential verification. Connecting licensed practitioners with patients through regulatory-aligned infrastructure.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3.5">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                {['Patient Dashboard', 'Doctor Registry', 'Nurse Registry', 'Clinical Shifts', 'Medical Library'].map((link) => (
                  <li key={link}>
                    <a href="#login-section" className="hover:text-cross transition-colors cursor-pointer">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3.5">Compliance</h4>
              <ul className="space-y-2.5 text-sm">
                {['HIPAA Security', 'MMC Regulatory', 'LJM Standards', 'AES-256 Encryption', 'SOC-2 Type II'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    {item.startsWith('AES') ? <Lock className="h-3 w-3 text-slate-600" /> : <ShieldCheck className="h-3 w-3 text-slate-600" />}
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3.5">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                {['Privacy Policy', 'Terms of Service', 'Data Processing Agreement', 'Cookie Policy', 'Contact Support'].map((link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-cross transition-colors cursor-pointer">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 text-[13px]">
            <p>
              &copy; {new Date().getFullYear()} CareVerify Sdn Bhd. Regulated under the Malaysian Medical Act 1971.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-ink">
              <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> EN</span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> BM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
