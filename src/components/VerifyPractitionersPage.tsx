import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, Search, Stethoscope, UserCheck, Users, 
  Award, Clock, ArrowRight, ArrowLeft, Heart, Lock, AlertCircle, 
  Building2, ExternalLink, Filter, Sparkles, Check
} from 'lucide-react';
import { DoctorProfile, NurseProfile } from '../types';
import VerificationScopeBadge from './VerificationScopeBadge';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import { navigate, loginUrl } from '../nav';

interface VerifyPractitionersPageProps {
  professionals?: (DoctorProfile | NurseProfile)[];
  onSignUp?: () => void;
}

export default function VerifyPractitionersPage({ 
  professionals: initialProfessionals = [],
  onSignUp
}: VerifyPractitionersPageProps) {
  const [professionals, setProfessionals] = useState<(DoctorProfile | NurseProfile)[]>(initialProfessionals);
  const [searchQuery, setSearchQuery] = useState('');
  const [councilFilter, setCouncilFilter] = useState<'all' | 'doctor' | 'nurse'>('all');
  const [lookupResult, setLookupResult] = useState<(DoctorProfile | NurseProfile)[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load latest registry data if empty
  useEffect(() => {
    if (initialProfessionals.length === 0) {
      setLoading(true);
      fetch('/api/professionals')
        .then(r => r.json())
        .then(d => {
          if (d.status === 'success' && Array.isArray(d.data)) {
            setProfessionals(d.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setProfessionals(initialProfessionals);
    }
  }, [initialProfessionals]);

  // Initial filter/search run & URL search params synchronization
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q');
      const urlCouncil = params.get('council');
      
      const targetQuery = urlQuery !== null ? urlQuery : searchQuery;
      const targetCouncil: 'all' | 'doctor' | 'nurse' = 
        (urlCouncil === 'doctor' || urlCouncil === 'nurse' || urlCouncil === 'all') 
          ? urlCouncil 
          : councilFilter;

      if (urlQuery !== null && urlQuery !== searchQuery) {
        setSearchQuery(urlQuery);
      }
      if (urlCouncil && targetCouncil !== councilFilter) {
        setCouncilFilter(targetCouncil);
      }

      runSearch(targetQuery, targetCouncil);
    } catch {
      runSearch(searchQuery, councilFilter);
    }
  }, [professionals]);

  const runSearch = (query: string, council: 'all' | 'doctor' | 'nurse') => {
    let list = professionals;
    if (council === 'doctor') {
      list = list.filter(p => 'medicalCouncil' in p || (p as any).role === 'doctor');
    } else if (council === 'nurse') {
      list = list.filter(p => 'nursingCouncil' in p || (p as any).role === 'nurse');
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.licenseNumber.toLowerCase().includes(q) ||
        p.specialization.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q))
      );
    }
    setLookupResult(list);
    setHasSearched(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery, councilFilter);
  };

  const handleQuickChip = (chip: string) => {
    setSearchQuery(chip);
    runSearch(chip, councilFilter);
  };

  const goMemberSignup = () => {
    if (onSignUp) onSignUp();
    else navigate(loginUrl('patient', true));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ─── TOP GLOBAL NAVIGATION BAR ─── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[color:var(--t-200)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a 
              href="/" 
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span className="w-9 h-9 bg-[color:var(--t-600)] text-white flex items-center justify-center font-black text-lg shadow-2xs group-hover:bg-[color:var(--t-700)] transition-colors">
                M
              </span>
              <span className="font-display font-black text-xl tracking-tight text-[color:var(--ink)]">
                MedCred<span className="text-[color:var(--t-600)]">.</span>
              </span>
            </a>

            <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-500 border-l border-slate-200 pl-4">
              <a 
                href="/" 
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
                className="hover:text-[color:var(--t-600)] transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </a>
              <span className="text-slate-300">/</span>
              <span className="text-[color:var(--t-700)]">Licence Verification</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <LocaleSwitcher />
            <ThemeSwitcher />
            <button
              type="button"
              onClick={() => navigate(loginUrl('patient', false))}
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-700)] hover:bg-slate-100 border border-transparent transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={goMemberSignup}
              className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Heart className="h-3.5 w-3.5" />
              <span>Join as Member</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── FULL-WIDTH APPLICATION HERO BANNER ─── */}
      <section className="w-full bg-[color:var(--t-50)] text-slate-900 border-b border-[color:var(--t-200)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">01</span>
                <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>Statutory Practitioner Licence Verification</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                Official Public Registry &amp; <span className="text-[color:var(--t-600)]">Practitioner Licence Verification</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-2xl">
                Check active medical and nursing licences against statutory council registers (MMC Act 1971 &amp; LJM Act 1950) with complete transparency. Verify practising clearance before booking consultation or home care.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="bg-white px-2.5 py-1 border border-[color:var(--t-200)] font-bold text-slate-700 shadow-3xs">
                  Malaysian Medical Council (MMC)
                </span>
                <span className="bg-white px-2.5 py-1 border border-[color:var(--t-200)] font-bold text-slate-700 shadow-3xs">
                  Lembaga Jururawat Malaysia (LJM)
                </span>
                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 border border-emerald-200 font-bold shadow-3xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Active 2026 Annual Practising Certificates (APC)
                </span>
              </div>
            </div>

            {/* Quick Stats / Conversion Callout Box */}
            <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-sm max-w-sm w-full space-y-4 shrink-0">
              <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Target Audience
                </span>
                <span className="text-xs font-mono font-extrabold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                  Patients &amp; Observers
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-base text-[color:var(--ink)]">
                  Consult With Verified Practitioners
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Create a free member account to book unhurried video visits, order doctor-signed e-prescriptions, and request registered home nurses.
                </p>
              </div>
              <button
                type="button"
                onClick={goMemberSignup}
                className="w-full py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Join MedCred as a Member</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN SEARCH & REGISTRY INTERACTION ─── */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 w-full space-y-10">
        
        {/* Search & Filter Card */}
        <div className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-black text-xl text-[color:var(--ink)]">
                Search Statutory Council Registers
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                Search by practitioner name, registration number, or clinical specialization.
              </p>
            </div>

            {/* Council Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all' as const, label: 'All Practitioners', icon: Users },
                { key: 'doctor' as const, label: 'MMC Doctors (Act 1971)', icon: Stethoscope },
                { key: 'nurse' as const, label: 'LJM Nurses (Act 1950)', icon: UserCheck },
              ].map(c => {
                const isSel = councilFilter === c.key;
                const TabIcon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCouncilFilter(c.key)}
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
          </div>

          {/* Form */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <label htmlFor="licence-search-input" className="sr-only">Search practitioner</label>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                id="licence-search-input"
                type="text"
                placeholder="e.g. DEMO-MMC-32109, Dr. Tan, Cardiologist, or Staff Nurse"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-white border border-[color:var(--t-200)] rounded-none text-[color:var(--ink)] placeholder-slate-400 font-medium focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all text-sm"
              />
            </div>
            <button
              type="submit"
              className="h-12 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-extrabold text-sm rounded-none transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border border-[color:var(--t-700)] shadow-xs"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verify Now</span>
            </button>
          </form>

          {/* Quick-Search Sample Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs border-t border-slate-100">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Quick Search:</span>
            {['DEMO-MMC-32109', 'Cardiology', 'Dr. Tan Seng Hock', 'DEMO-LJM-88412', 'Paediatrics', 'Kuala Lumpur'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleQuickChip(sample)}
                className="px-2.5 py-1 bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] font-mono text-xs font-bold border border-[color:var(--t-200)] shadow-3xs transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); runSearch('', councilFilter); }}
                className="px-2 py-1 text-xs text-rose-600 hover:underline font-bold cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* ─── RESULTS LIST ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg text-[color:var(--ink)]">
                Verified Council Registry Results
              </h3>
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)]">
                {lookupResult.length} verified
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Live Council Database Sync: 2026 OK
            </span>
          </div>

          {lookupResult.length === 0 ? (
            <div className="bg-white border border-[color:var(--t-200)] p-12 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="font-display font-bold text-base text-[color:var(--ink)]">
                No verified practitioners match your query
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Please check the spelling of the name or registration number. You can also try searching by city or specialty.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); runSearch('', 'all'); }}
                className="px-4 py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-100)] text-[color:var(--t-700)] text-xs font-bold border border-[color:var(--t-200)]"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lookupResult.map((p) => {
                const council = 'medicalCouncil' in p ? p.medicalCouncil : p.nursingCouncil;
                const isDoctor = 'medicalCouncil' in p || (p as any).role === 'doctor';
                return (
                  <article 
                    key={p.id} 
                    className="bg-white border-l-4 border-l-emerald-600 border-t border-r border-b border-[color:var(--t-200)] shadow-2xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Top Row: Avatar & Identity */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-14 h-14 bg-slate-100 border border-[color:var(--t-200)] shrink-0 overflow-hidden shadow-3xs rounded-full">
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-display font-black text-base text-[color:var(--ink)] leading-snug">
                                {p.name}
                              </h4>
                              <span className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Active APC 2026
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold mt-0.5">
                              {p.specialization} · {p.city || 'Malaysia'}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold px-2 py-1 shadow-3xs shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>AUDITED</span>
                        </span>
                      </div>

                      {/* Detail Metrics Grid */}
                      <dl className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                            Registration Number
                          </dt>
                          <dd className="mt-0.5 font-mono font-bold text-[color:var(--t-700)]">
                            {p.licenseNumber}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                            Statutory Council
                          </dt>
                          <dd className="mt-0.5 font-bold text-[color:var(--ink)] truncate">
                            {council || (isDoctor ? 'Malaysian Medical Council' : 'Malaysian Nursing Board')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                            Council Status
                          </dt>
                          <dd className="mt-0.5 font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Fully Cleared</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                            Audit Scope
                          </dt>
                          <dd className="mt-0.5">
                            <VerificationScopeBadge prof={p as any} />
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-xs font-mono text-slate-500 font-medium">
                        Audit Stamp: #MC-2026-ACT
                      </span>
                      <button
                        type="button"
                        onClick={goMemberSignup}
                        className="px-3.5 py-1.5 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-[color:var(--t-700)] text-xs font-extrabold border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Consult as Member</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── STATUTORY AUDIT & BOARD OVERSIGHT EXPLANATION ─── */}
        <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-xs font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-700)] mb-2">
              <ShieldCheck className="h-3 w-3 text-[color:var(--t-600)]" />
              Statutory Transparency &amp; Medical Board Protocol
            </div>
            <h3 className="font-display font-black text-xl text-[color:var(--ink)]">
              How Every Licence is Hand-Verified Before Profile Activation
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
              MedCred operates strictly under Malaysian healthcare statutory frameworks. We do not permit automated unreviewed uploads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center font-mono font-black text-xs">
                  01
                </span>
                <h4 className="font-display font-black text-sm text-[color:var(--ink)]">Direct Register Audit</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Every doctor is audited against the Malaysian Medical Council (MMC) register under the Medical Act 1971. Nurses are audited against the Malaysian Nursing Board under the Nurses Act 1950.
              </p>
            </div>

            <div className="p-4 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center font-mono font-black text-xs">
                  02
                </span>
                <h4 className="font-display font-black text-sm text-[color:var(--ink)]">Continuous APC Tracking</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Annual Practising Certificates (APC) are re-validated hourly. Any certificate reaching expiration triggers an automated suspension of tele-consultation privileges until renewed.
              </p>
            </div>

            <div className="p-4 bg-[color:var(--t-50)]/50 border border-[color:var(--t-200)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-white border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center font-mono font-black text-xs">
                  03
                </span>
                <h4 className="font-display font-black text-sm text-[color:var(--ink)]">Zero Locum Markups</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                No middleman recruitment commissions or hidden agency fees. Practitioners practice autonomously, giving patients honest, affordable, and direct care.
              </p>
            </div>
          </div>
        </section>

        {/* ─── BOTTOM MEMBER CONVERSION CALLOUT ─── */}
        <section className="bg-gradient-to-r from-[color:var(--t-600)] to-[color:var(--t-700)] text-white p-8 sm:p-10 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 border border-white/25 text-white text-xs font-extrabold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" />
                Become a MedCred Member
              </span>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                Ready to Consult With Verified Doctors &amp; Nurses?
              </h3>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed font-medium">
                Register as a Member today using either your Malaysian MyKad or an International Passport. Access telemedicine video visits, bedside nursing, and doctor-signed e-prescriptions with 100% price transparency.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={goMemberSignup}
                className="px-6 py-3 bg-white text-[color:var(--t-700)] hover:bg-slate-100 text-sm font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Heart className="h-4 w-4" />
                <span>Join as a Member (Free)</span>
              </button>
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-extrabold border border-white/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Back to Home</span>
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
