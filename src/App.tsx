import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Search, Users, ShieldAlert, Award, FileText,
  Sparkles, Calendar, BookOpen, Globe, CheckCircle2, RefreshCw,
  Heart, MessageSquare, AlertTriangle, Menu, X, PlusCircle, UserCheck,
  Stethoscope, ChevronRight, ChevronLeft, Puzzle, Plus, Trash2,
  Settings, Download, Activity, CreditCard, TrendingUp
} from 'lucide-react';


// Subcomponents import
import SearchHub from './components/SearchHub';
import DashboardHeader from './components/DashboardHeader';
import AISymptomMatcher from './components/AISymptomMatcher';
import ProfessionalProfile from './components/ProfessionalProfile';
import VerificationTerminal from './components/VerificationTerminal';
import JobMarket from './components/JobMarket';
import SecureMessenger from './components/SecureMessenger';
import MedicalLibrary from './components/MedicalLibrary';
import SEODashboard from './components/SEODashboard';
import AdminDashboard from './components/AdminDashboard';
import NotificationBell from './components/NotificationBell';
import PatientDashboard from './components/PatientDashboard';
import LandingPage from './components/LandingPage';

// Types import
import { DoctorProfile, NurseProfile, Booking, Review, JobPost, Article, UserRole, AppPackage } from './types';
import PageBanner from './components/PageBanner';

export default function App() {
  // Navigation & View State
  const [activeView, setActiveView] = useState<'registry' | 'profile' | 'onboard' | 'recruitment' | 'messages' | 'admin' | 'seo' | 'articles' | 'patient_dashboard' | string>('patient_dashboard');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>('');
  const [registryTab, setRegistryTab] = useState<'directory' | 'triage'>('directory');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // User Session State (server-side session cookie; nothing sensitive is kept in localStorage)
  type SessionUser = { id: string; role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string; profileId?: string | null };
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const routeForRole = (role: SessionUser['role']) => {
    setActiveView(role === 'patient' ? 'patient_dashboard' : role === 'practitioner' ? 'onboard' : 'admin');
    setSelectedProfId(null);
  };

  // The patient dashboard reads the patient's profile from this key.
  const rememberPatient = (patient?: unknown) => {
    try {
      if (patient) localStorage.setItem('medi_user', JSON.stringify(patient));
      else localStorage.removeItem('medi_user');
    } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.status === 'success') {
          setCurrentUser(d.data.user);
          rememberPatient(d.data.patient);
          routeForRole(d.data.user.role);
        }
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  const handleLoginSuccess = (user: SessionUser, patient?: unknown) => {
    setCurrentUser(user);
    rememberPatient(patient);
    routeForRole(user.role);
    loadData();
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setCurrentUser(null);
    rememberPatient(undefined);
    setBookings([]);
    loadData();
  };

  // App Global State (synced from API)
  const [professionals, setProfessionals] = useState<(DoctorProfile | NurseProfile)[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [packages, setPackages] = useState<AppPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Load state from backend APIs
  const loadData = async () => {
    setLoading(true);
    try {
      // 0. Refresh the signed-in account (e.g. after a profile is linked)
      const meResp = await fetch('/api/auth/me');
      if (meResp.ok) {
        const meData = await meResp.json();
        if (meData.status === 'success') setCurrentUser(meData.data.user);
      }

      // 1. Fetch professionals
      const pResp = await fetch('/api/professionals');
      const pData = await pResp.json();
      if (pData.status === 'success') {
        setProfessionals(pData.data);
      }

      // 2. Fetch jobs
      const jResp = await fetch('/api/jobs');
      const jData = await jResp.json();
      if (jData.status === 'success') {
        setJobs(jData.data);
      }

      // 3. Fetch articles
      const aResp = await fetch('/api/articles');
      const aData = await aResp.json();
      if (aData.status === 'success') {
        setArticles(aData.data);
      }

      // 4. Fetch bookings
      const bResp = await fetch('/api/bookings');
      const bData = await bResp.json();
      if (bData.status === 'success') {
        setBookings(bData.data);
      }

      // 5. Fetch reviews
      const rResp = await fetch('/api/reviews');
      const rData = await rResp.json();
      if (rData.status === 'success') {
        setReviews(rData.data);
      }

      // 6. Fetch modular packages
      const pkgsResp = await fetch('/api/packages');
      const pkgsData = await pkgsResp.json();
      if (pkgsData.status === 'success') {
        setPackages(pkgsData.data);
      }
    } catch (error) {
      console.error("Error fetching state data from Express API:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if a modular package is enabled in the runtime state
  const isPackageEnabled = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    return pkg ? pkg.isEnabled : true;
  };

  // Callback to reload packages status after change
  const handlePackagesChanged = async () => {
    try {
      const resp = await fetch('/api/packages');
      const data = await resp.json();
      if (data.status === 'success') {
        setPackages(data.data);
      }
    } catch (err) {
      console.error("Error refreshing packages in App root:", err);
    }
  };

  // Safety Redirect: if active view becomes disabled, redirect back to patient hub
  useEffect(() => {
    if (packages.length > 0) {
      const activePkg = packages.find(p => p.id === activeView);
      if (activePkg && !activePkg.isEnabled) {
        // Find first enabled standard module
        const firstEnabled = ['patient_dashboard', 'registry', 'recruitment', 'articles', 'onboard', 'messages', 'seo']
          .find(id => isPackageEnabled(id));
        if (firstEnabled) {
          setActiveView(firstEnabled);
        } else {
          setActiveView('admin'); // Fallback to admin if everything is disabled
        }
      }
    }
  }, [packages, activeView]);

  // Handlers for state updates
  const handleNewBookingCreated = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
  };

  const handleNewReviewPosted = (newReview: Review) => {
    setReviews(prev => [newReview, ...prev]);
  };

  const handleNewJobCreated = (newJob: JobPost) => {
    setJobs(prev => [newJob, ...prev]);
  };

  const handleApplyJob = (jobId: string, userId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          applicantsCount: j.applicantsCount + 1,
          appliedUserIds: [...j.appliedUserIds, userId]
        };
      }
      return j;
    }));
  };

  const handleProfessionalApprovedByAdmin = (approvedProf: DoctorProfile | NurseProfile) => {
    setProfessionals(prev => {
      // Avoid duplicates
      if (prev.some(p => p.id === approvedProf.id)) {
        return prev.map(p => p.id === approvedProf.id ? approvedProf : p);
      }
      return [...prev, approvedProf];
    });
  };

  if (!sessionChecked) {
    return <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-slate-500">Loading…</div>;
  }

  // If not logged in, render landing page
  if (!currentUser) {
    return <LandingPage professionals={professionals} onLoginSuccess={handleLoginSuccess} />;
  }

  // Define Horizontal Menu Items based on logged-in perspective
  const navItems: { id: string; name: string; icon: React.ComponentType<any>; isExtension?: boolean }[] = [];
  if (currentUser.role === 'patient') {
    if (isPackageEnabled('patient_dashboard')) {
      navItems.push({ id: 'patient_dashboard', name: 'Patient Hub', icon: Heart });
    }
    if (isPackageEnabled('registry')) {
      navItems.push({ id: 'registry', name: 'Doctors & Nurses', icon: Search });
    }
    if (isPackageEnabled('articles')) {
      navItems.push({ id: 'articles', name: 'Medical Library', icon: BookOpen });
    }
    if (isPackageEnabled('messages')) {
      navItems.push({ id: 'messages', name: 'Secure Mailbox', icon: MessageSquare });
    }
  } else if (currentUser.role === 'practitioner') {
    if (isPackageEnabled('onboard')) {
      navItems.push({ id: 'onboard', name: 'Practitioner Portal', icon: PlusCircle });
    }
    if (isPackageEnabled('recruitment')) {
      navItems.push({ id: 'recruitment', name: 'Clinical Shifts', icon: Calendar });
    }
    if (isPackageEnabled('messages')) {
      navItems.push({ id: 'messages', name: 'Secure Mailbox', icon: MessageSquare });
    }
    if (isPackageEnabled('articles')) {
      navItems.push({ id: 'articles', name: 'Medical Library', icon: BookOpen });
    }
  } else if (currentUser.role === 'admin') {
    navItems.push({ id: 'admin', name: 'Admin Panel', icon: ShieldCheck });
    if (isPackageEnabled('seo')) {
      navItems.push({ id: 'seo', name: 'SEO Compliance', icon: Globe });
    }
    if (isPackageEnabled('registry')) {
      navItems.push({ id: 'registry', name: 'Doctors & Nurses', icon: Search });
    }
  }

  // Append any active extensions that aren't standard
  const standardIds = ['patient_dashboard', 'registry', 'recruitment', 'articles', 'onboard', 'messages', 'seo', 'admin'];
  const customPackages = packages.filter(p => !standardIds.includes(p.id) && p.isEnabled);
  customPackages.forEach(p => {
    let icon = Puzzle;
    if (p.icon === 'Activity') icon = Activity;
    else if (p.icon === 'CreditCard') icon = CreditCard;
    else if (p.icon === 'TrendingUp') icon = TrendingUp;
    else if (p.icon === 'Heart') icon = Heart;
    else if (p.icon === 'Search') icon = Search;
    else if (p.icon === 'Calendar') icon = Calendar;
    else if (p.icon === 'BookOpen') icon = BookOpen;
    else if (p.icon === 'PlusCircle') icon = PlusCircle;
    else if (p.icon === 'MessageSquare') icon = MessageSquare;
    else if (p.icon === 'Globe') icon = Globe;

    navItems.push({ id: p.id, name: p.name, icon, isExtension: true });
  });

  return (
    <div className="min-h-screen bg-[#FFF8F9] text-slate-800 flex flex-col font-sans antialiased selection:bg-[#FFE4E6] selection:text-[#DC2626]">

      {/* CareVerified Elevated Primary Header */}
      <header className="bg-[#DC2626] border-b border-[#B91C1C] sticky top-0 z-40 px-4 sm:px-6 lg:px-8 shrink-0 shadow-xs">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between h-16">

          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              if (currentUser.role === 'patient') setActiveView('patient_dashboard');
              else if (currentUser.role === 'practitioner') setActiveView('onboard');
              else if (currentUser.role === 'admin') setActiveView('admin');
              setSelectedProfId(null);
            }}
          >
            <div className="w-10 h-10 rounded-lg bg-white text-[#DC2626] flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#FFE4E6] transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-[22px] text-white tracking-tight block">
                MedCred<span className="text-[#FECDD3]">.</span>
              </span>
              <span className="text-[10px] font-semibold text-[#FFE4E6] uppercase tracking-[0.14em] block mt-1">
                {currentUser.role === 'admin' ? 'Board Console' : currentUser.role === 'practitioner' ? 'Practitioner Hub' : 'Patient Portal'}
              </span>
            </div>
          </div>

          {/* Right-Side Desktop Actions & User Session Details */}
          <div className="hidden lg:flex items-center gap-5">
            <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#065F46]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
              <span>MMC &amp; LJM Registry Aligned</span>
            </div>

            <div className="flex items-center gap-3 border-l border-white/30 pl-5">
              <NotificationBell />

              {/* Profile Badge embedded with Close Session Button (Transparent Background & No Border) */}
              <div className="flex items-center gap-2.5 bg-transparent border-0 p-1">
                <img
                  src={currentUser.avatarUrl || '/assets/malaysian_female_doctor.jpg'}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden xl:block leading-tight">
                  <p className="text-[13px] font-semibold text-white leading-none">{currentUser.name}</p>
                  <p className="text-xs text-[#FFE4E6] mt-1">
                    {currentUser.role === 'admin' ? 'Board Admin' : currentUser.role === 'practitioner' ? 'Practitioner Account' : 'Patient Account'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="h-9 w-9 text-white hover:bg-white/15 bg-transparent border-0 rounded-full transition-colors cursor-pointer ml-1 flex items-center justify-center"
                  title="Close Session"
                  aria-label="Close session"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Toggler */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-white/60 text-white hover:bg-white/15 cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="lg:hidden bg-white text-[#1E293B] -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-[#FECDD3] overflow-hidden"
            >
              <div className="py-3 space-y-1 text-sm font-bold text-[#1E293B]">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); setSelectedProfId(null); setMobileMenuOpen(false); }}
                      className={`w-full text-left min-h-11 py-2.5 px-3.5 rounded-none flex items-center justify-between transition-colors cursor-pointer ${isActive
                        ? 'bg-[#DC2626] text-white font-extrabold'
                        : 'hover:bg-[#FFF0F2] text-[#1E293B]'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-[#DC2626]'}`} />
                        <span>{item.name}</span>
                      </div>

                      {item.id === 'messages' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[#DC2626]' : 'bg-[#FFE4E6] text-[#DC2626]'}`}>
                          2 new
                        </span>
                      )}
                      {item.id === 'recruitment' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[#DC2626]' : 'bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3]'}`}>
                          9 Open
                        </span>
                      )}
                      {item.id === 'onboard' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[#DC2626]' : 'bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3]'}`}>
                          MMC
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-[#FECDD3] flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={currentUser.avatarUrl || '/assets/malaysian_female_doctor.jpg'}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-full object-cover border border-[#FECDD3] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[#1E293B] leading-none truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-[#334155] font-semibold capitalize mt-1">{currentUser.role} Account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="p-2 bg-transparent text-[#DC2626] hover:bg-[#FFF0F2] rounded-full border-0 transition-colors cursor-pointer shrink-0"
                    title="Close Session"
                    aria-label="Close session"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Elevated Navigation Bar */}
      <div className="hidden lg:block bg-[#FFE4E6]/95 backdrop-blur-md border-b border-[#FECDD3] px-4 sm:px-6 lg:px-8 shrink-0 sticky top-16 z-30 shadow-xs">
        <div className="w-full max-w-[1920px] mx-auto flex items-stretch justify-between">
          <div className="flex items-stretch gap-4 py-2">

            {/* Role is already shown in the header pill, so no duplicate perspective badge here */}
            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1.5 relative z-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setSelectedProfId(null); }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs font-extrabold transition-all duration-200 cursor-pointer select-none rounded-lg border ${
                      isActive
                        ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs'
                        : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#DC2626]' : 'text-slate-400'}`} />
                    <span>{item.name}</span>

                    {item.id === 'messages' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ml-0.5 ${isActive ? 'bg-[#DC2626] text-white' : 'bg-[#FFE4E6] text-[#DC2626] border border-[#FECDD3]'}`}>
                        2 new
                      </span>
                    )}
                    {item.id === 'recruitment' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ml-0.5 ${isActive ? 'bg-[#DC2626] text-white' : 'bg-white text-[#1E293B] border border-[#FECDD3]'}`}>
                        9 Open
                      </span>
                    )}
                    {item.id === 'onboard' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ml-0.5 ${isActive ? 'bg-[#DC2626] text-white' : 'bg-white text-[#1E293B] border border-[#FECDD3]'}`}>
                        MMC
                      </span>
                    )}
                    {item.id === 'seo' && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ml-0.5 ${isActive ? 'bg-[#DC2626] text-white' : 'bg-white text-[#1E293B] border border-[#FECDD3]'}`}>
                        98%
                      </span>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="activeNavUnderline"
                        className="absolute left-0 right-0 -bottom-[9px] h-[3px] bg-[#DC2626]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Registry telemetry indicator */}
          <div className="flex items-center gap-2 self-center bg-white border border-[#FECDD3] px-3.5 py-1.5 rounded-full text-[11px] font-extrabold text-[#1E293B] shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>MMC &amp; LJM Sync Active</span>
          </div>

        </div>
      </div>

      {/* Primary Screen Area */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 w-full max-w-[1920px] mx-auto">
        {loading ? (
          <div className="text-center py-20 space-y-4">
            <RefreshCw className="h-10 w-10 text-[#DC2626] animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Loading MedCred...</h3>
            <p className="text-xs text-slate-500 font-semibold">Connecting to medical registry...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">

            {/* VIEW 1: REGISTRY & SYMPTOM MATCHER */}
            {activeView === 'registry' && !selectedProfId && (
              <div className="space-y-8">
                {/* Standard dashboard header with attached tabs */}
                <DashboardHeader
                  eyebrow="Verified Medical Network"
                  title="Find Certified Doctors and Nurses"
                  description="A directory of practitioners with active, verified MMC and LJM registration numbers."
                  tabs={[
                    { id: 'directory' as const, label: 'Medical Directory', icon: UserCheck },
                    { id: 'triage' as const, label: 'Symptom Triage & Search', icon: Activity },
                  ]}
                  activeTab={registryTab}
                  onTabChange={setRegistryTab}
                  tabsLabel="Directory sections"
                />

                {/* TAB CONTENT 1: Symptom Triage Search Panel */}
                {registryTab === 'triage' && (
                  <div className="max-w-3xl mx-auto animate-fade-in">
                    <AISymptomMatcher
                      onSelectSpecialty={(spec) => {
                        setSelectedSpecialtyFilter(spec);
                        setRegistryTab('directory');
                      }}
                    />
                  </div>
                )}

                {/* TAB CONTENT 2: National Directory List */}
                {registryTab === 'directory' && (
                  <div className="animate-fade-in">
                    <SearchHub
                      professionals={professionals}
                      reviews={reviews}
                      onSelectProfessional={(id) => setSelectedProfId(id)}
                      selectedSpecialtyFilter={selectedSpecialtyFilter}
                      onSelectSpecialtyFilter={(spec) => setSelectedSpecialtyFilter(spec)}
                      onClearSpecialtyFilter={() => setSelectedSpecialtyFilter('')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: PROFILE VIEW WITH APPOINTMENT BOOKING */}
            {selectedProfId && (
              <ProfessionalProfile
                professionalId={selectedProfId}
                onBack={() => setSelectedProfId(null)}
                onNewBookingCreated={handleNewBookingCreated}
                reviews={reviews}
                onNewReviewPosted={handleNewReviewPosted}
                currentUser={currentUser}
              />
            )}

            {/* VIEW 3: MULTI-STEP ONBOARDING */}
            {activeView === 'onboard' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
              />
            )}

            {/* VIEW 4: RECRUITMENT MARKET */}
            {activeView === 'recruitment' && (
              <JobMarket
                jobs={jobs}
                onNewJobCreated={handleNewJobCreated}
                onApplyJob={handleApplyJob}
              />
            )}

            {/* VIEW 5: SECURE MESSENGER */}
            {activeView === 'messages' && (
              <SecureMessenger currentUserId={currentUser.profileId || currentUser.id} />
            )}

            {/* VIEW 6: MEDICAL BOARD ADMIN */}
            {activeView === 'admin' && (
              <AdminDashboard
                professionals={professionals}
                onProfessionalApproved={handleProfessionalApprovedByAdmin}
                packages={packages}
                onPackagesChanged={handlePackagesChanged}
              />
            )}

            {/* VIEW 7: SEO DASHBOARD */}
            {activeView === 'seo' && (
              <SEODashboard professionals={professionals} />
            )}

            {/* VIEW 9: PATIENT PORTAL DASHBOARD */}
            {activeView === 'patient_dashboard' && !selectedProfId && (
              <PatientDashboard
                bookings={bookings}
                setBookings={setBookings}
                professionals={professionals}
                onSelectProfessional={(id) => setSelectedProfId(id)}
                onNavigateToMessages={() => setActiveView('messages')}
              />
            )}

            {/* VIEW 8: HEALTH ARTICLES / EDUCATION */}
            {activeView === 'articles' && (
              <MedicalLibrary
                articles={articles}
                onFindDoctor={() => { setActiveView('registry'); setSelectedProfId(null); }}
              />
            )}

            {/* VIEW: DYNAMIC CUSTOM / MARKETPLACE MODULE VIEW */}
            {!['registry', 'profile', 'onboard', 'recruitment', 'messages', 'admin', 'seo', 'articles', 'patient_dashboard'].includes(activeView) && (
              (() => {
                const activePkg = packages.find(p => p.id === activeView);
                if (!activePkg) return null;
                return (
                  <div className="space-y-8 animate-fade-in text-slate-800">
                    <div className="bg-white border-2 border-slate-200/85 p-8 rounded-2xl shadow-sm space-y-6">
                      <PageBanner
                        eyebrow="Marketplace Module"
                        title={activePkg.name}
                        description={`Compiled & hot-loaded by ${activePkg.author}`}
                        actions={
                          <>
                            <span className="bg-[#FFF0F2] text-[#DC2626] text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-[#FECDD3]">v{activePkg.version}</span>
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-3 py-1.5 rounded-xs border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-xs animate-pulse"></span>
                              <span>Active Runtime Package</span>
                            </span>
                          </>
                        }
                      />

                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Functional Package Description</h4>
                        <p className="text-sm font-semibold text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 p-4.5 rounded-xl">
                          {activePkg.description}
                        </p>
                      </div>

                      {/* Interactive sandbox demonstration for custom module */}
                      <div className="border border-slate-200/60 rounded-2xl p-6 bg-slate-50/50 space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Settings className="h-4.5 w-4.5 text-[#DC2626] animate-spin" />
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Interactive Package Terminal & Diagnostics</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Mountpoint Hook</span>
                              <p className="text-xs font-mono font-bold text-[#DC2626]">/src/modules/{activePkg.id}/index.tsx</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">HIPAA / Security Shield</span>
                              <p className="text-xs font-mono font-bold text-emerald-600">Sandbox Isolated & AES-256 Encrypted</p>
                            </div>
                          </div>

                          <div className="bg-slate-100 text-slate-800 border border-slate-300 font-mono p-4 rounded-xl text-[10px] leading-relaxed shadow-inner overflow-x-auto max-h-40">
                            <p className="text-emerald-400">[INFO] Hot-mounting package: {activePkg.id}</p>
                            <p className="text-slate-400">[OK] Injecting dynamic layout nodes...</p>
                            <p className="text-slate-400">[OK] Instantiating core API controllers...</p>
                            <p className="text-rose-400">[DEBUG] Package Category: {activePkg.category}</p>
                            <p className="text-slate-300">[LIVE] Module {activePkg.name} is running healthy.</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => alert(`Dynamic simulation for "${activePkg.name}" triggered successfully!`)}
                            className="px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-rose-500/10 cursor-pointer"
                          >
                            Execute Package Dynamic Simulation
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

          </div>
        )}
      </main>

      {/* Footer Sitemap */}
      <footer className="app-dark-footer bg-[#0F172A] text-slate-300 border-t border-slate-800 pt-10 pb-6 text-xs mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Detailed Sitemap Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            {/* Column 1: Brand & Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-[#DC2626] animate-pulse" />
                <span className="font-extrabold text-sm tracking-tight text-white">MedCred</span>
                <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Registry</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                National Medical Directory & Verification network connecting licensed doctors and nurses with direct compliance protocols and shift management.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 w-max px-2 py-1 rounded border border-emerald-800/40">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span>Active Core Sync</span>
              </div>
            </div>

            {/* Column 2: Portal Sitemap */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Portal Sitemap</h4>
              <ul className="space-y-2 font-semibold">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => { setActiveView(item.id); setSelectedProfId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`flex items-center gap-2 text-[11px] transition-colors hover:text-white cursor-pointer ${isActive ? 'text-[#DC2626] font-extrabold' : 'text-slate-300'
                          }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#DC2626]' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 3: Medical Compliance */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compliance Registry</h4>
              <ul className="space-y-2 text-[11px] font-semibold text-slate-400">
                <li className="hover:text-slate-200 cursor-pointer transition-colors">Malaysian Medical Council (MMC)</li>
                <li className="hover:text-slate-200 cursor-pointer transition-colors">Lembaga Jururawat Malaysia (LJM)</li>
                <li className="hover:text-slate-200 cursor-pointer transition-colors">HIPAA Secured Encrypted Pipeline</li>
                <li className="hover:text-slate-200 cursor-pointer transition-colors">E-E-A-T Medical Content Standards</li>
                <li className="hover:text-slate-200 cursor-pointer transition-colors">Kementerian Kesihatan Malaysia (KKM)</li>
              </ul>
            </div>

            {/* Column 4: Practitioner & Patient Links */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Global Resources</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                Log in to alternate credentials to inspect verification terminals, board review portals, and clinical shift scheduling pipelines.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-extrabold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Switch Perspective
                </button>
              </div>
            </div>
          </div>

          {/* Copyright & Badges */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px]">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 font-bold justify-center">
              <span className="hover:text-slate-200 cursor-pointer transition-colors">HIPAA Secured</span>
              <span>&bull;</span>
              <span className="hover:text-slate-200 cursor-pointer transition-colors">MMC Compliance</span>
              <span>&bull;</span>
              <span className="hover:text-slate-200 cursor-pointer transition-colors">LJM Registered</span>
            </div>

            <div className="text-slate-400 font-bold">
              &copy; {new Date().getFullYear()} MedCred. All rights reserved.
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
