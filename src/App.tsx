import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Search, Users, ShieldAlert, Award, FileText,
  Sparkles, Calendar, BookOpen, Globe, CheckCircle2, RefreshCw,
  Heart, MessageSquare, AlertTriangle, Menu, X, PlusCircle, UserCheck,
  Stethoscope, ChevronRight, ChevronLeft, Puzzle, Plus, Trash2,
  Settings, Download, Activity, CreditCard, TrendingUp, Bell
} from 'lucide-react';


// Subcomponents import
import SearchHub from './components/SearchHub';
import AISymptomMatcher from './components/AISymptomMatcher';
import ProfessionalProfile from './components/ProfessionalProfile';
import VerificationTerminal from './components/VerificationTerminal';
import JobMarket from './components/JobMarket';
import SecureMessenger from './components/SecureMessenger';
import SEODashboard from './components/SEODashboard';
import AdminDashboard from './components/AdminDashboard';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // User Session State
  const [currentUser, setCurrentUser] = useState<{ role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string } | null>(() => {
    const cached = localStorage.getItem('medi_cert_logged_in_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        console.error("Error parsing cached login session:", err);
      }
    }
    return null;
  });

  const handleLoginSuccess = (user: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string }) => {
    setCurrentUser(user);
    localStorage.setItem('medi_cert_logged_in_user', JSON.stringify(user));
    // Automatically redirect to the standard view for their role
    if (user.role === 'patient') {
      setActiveView('patient_dashboard');
    } else if (user.role === 'practitioner') {
      setActiveView('onboard');
    } else if (user.role === 'admin') {
      setActiveView('admin');
    }
    setSelectedProfId(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('medi_cert_logged_in_user');
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">

      {/* Red Cross header: white bar under a red signal rule */}
      <header className="bg-cross border-b border-cross-dark sticky top-0 z-40 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">

          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              if (currentUser.role === 'patient') setActiveView('patient_dashboard');
              else if (currentUser.role === 'practitioner') setActiveView('onboard');
              else if (currentUser.role === 'admin') setActiveView('admin');
              setSelectedProfId(null);
            }}
          >
            <div className="w-10 h-10 rounded-lg bg-white text-cross flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
            </div>
            <div className="leading-none">
              <span className="font-display font-black text-[21px] text-white tracking-tight flex items-center gap-2.5">
                CareVerify
                <span className="text-[10px] text-white border-[1.5px] border-white/80 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-body">
                  {currentUser.role === 'admin' ? 'Board' : currentUser.role === 'practitioner' ? 'Clinical' : 'Patient'}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-cross-tint uppercase tracking-[0.16em] block mt-1.5">Verified Network</span>
            </div>
          </div>

          {/* Right-Side Desktop Actions & User Session Details */}
          <div className="hidden lg:flex items-center gap-5">
            <div className="flex items-center gap-2 border-[1.5px] border-white/60 px-3 py-1.5 rounded-md text-[11px] font-bold text-white">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              <span>Regulatory Aligned</span>
            </div>

            <div className="flex items-center gap-3 border-l border-white/30 pl-5">
              <button
                className="relative p-2 text-white hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full ring-2 ring-cross"></span>
              </button>

              <div className="text-right ml-1 hidden xl:block">
                <p className="text-sm font-bold text-white leading-none">{currentUser.name}</p>
                <p className="text-[11px] text-cross-tint font-semibold mt-1">
                  {currentUser.role === 'admin' ? 'Board Admin' : currentUser.role === 'practitioner' ? 'Practitioner Account' : 'Patient Account'}
                </p>
              </div>
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white ml-1"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={handleLogout}
                className="p-2 text-white hover:bg-white hover:text-cross rounded-md transition-colors ml-1 cursor-pointer"
                title="Sign Out"
                aria-label="Sign out"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Toggler */}
          <div className="flex lg:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-md border-[1.5px] border-white text-white hover:bg-white/15 cursor-pointer"
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
              className="lg:hidden bg-white text-slate-700 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-cross-dark overflow-hidden"
            >
              <div className="py-3 space-y-1 text-sm font-semibold text-slate-700">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); setSelectedProfId(null); setMobileMenuOpen(false); }}
                      className={`w-full text-left min-h-11 py-2.5 px-3.5 rounded-md flex items-center justify-between transition-colors cursor-pointer ${isActive
                        ? 'bg-cross text-white font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.name}</span>
                      </div>

                      {item.id === 'messages' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white text-cross' : 'bg-cross-tint text-cross'}`}>
                          2 new
                        </span>
                      )}
                      {item.id === 'recruitment' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white text-cross' : 'bg-slate-100 text-slate-700'}`}>
                          9 Open
                        </span>
                      )}
                      {item.id === 'onboard' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white text-cross' : 'bg-slate-100 text-slate-700'}`}>
                          MMC
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-cross shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink leading-none truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-600 font-semibold capitalize mt-1">{currentUser.role} Account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="min-h-11 px-4 border-[1.5px] border-cross text-cross hover:bg-cross hover:text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Navigation bar: underline tabs, red signal on the active one */}
      <div className="hidden lg:block bg-white border-b border-slate-200 px-8 shrink-0 sticky top-[65px] z-30">
        <div className="max-w-7xl mx-auto flex items-stretch justify-between">
          <div className="flex items-stretch gap-6">

            {/* Left: Perspective Identification Tag */}
            <div className="flex items-center gap-2 self-center bg-cross text-white px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
              <span>
                {currentUser.role === 'patient' && 'Patient Hub'}
                {currentUser.role === 'practitioner' && 'Practitioner Space'}
                {currentUser.role === 'admin' && 'Audit Board'}
              </span>
            </div>

            {/* Tabs */}
            <nav className="flex items-stretch gap-1 relative z-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setSelectedProfId(null); }}
                    className={`relative flex items-center gap-2 px-3.5 py-4 text-[13px] font-semibold transition-colors duration-200 cursor-pointer select-none group ${isActive ? 'text-cross' : 'text-slate-700 hover:text-ink hover:bg-slate-50'
                      }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-cross' : 'text-slate-500'}`} />
                    <span>{item.name}</span>

                    {item.id === 'messages' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${isActive ? 'bg-cross text-white' : 'bg-cross-tint text-cross'}`}>
                        2 new
                      </span>
                    )}
                    {item.id === 'recruitment' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${isActive ? 'bg-cross text-white' : 'bg-slate-100 text-slate-700'}`}>
                        9 Open
                      </span>
                    )}
                    {item.id === 'onboard' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${isActive ? 'bg-cross text-white' : 'bg-slate-100 text-slate-700'}`}>
                        MMC
                      </span>
                    )}
                    {item.id === 'seo' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${isActive ? 'bg-cross text-white' : 'bg-slate-100 text-slate-700'}`}>
                        98%
                      </span>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="activeNavUnderline"
                        className="absolute left-0 right-0 -bottom-px h-[3px] bg-cross"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: National medical connection active indicator */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <div className="h-2 w-2 rounded-full bg-emerald-600"></div>
            <span>LJM Sync Active</span>
          </div>

        </div>
      </div>

      {/* Primary Screen Area */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="text-center py-20 space-y-4">
            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Loading CareVerify...</h3>
            <p className="text-xs text-slate-500 font-semibold">Connecting to medical registry...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">

            {/* VIEW 1: REGISTRY & SYMPTOM MATCHER */}
            {activeView === 'registry' && !selectedProfId && (
              <div className="space-y-8">
                {/* Hero Banner Intro */}
                <PageBanner
                  as="h1"
                  eyebrow="Verified Medical Network"
                  title="Find Certified Doctors and Nurses"
                  description="Direct directory of practitioners with active, verified MMC and LJM licensing registration codes."
                />

                {/* AI Symptom Evaluator widget on top of search */}
                <div className="max-w-3xl mx-auto">
                  <AISymptomMatcher onSelectSpecialty={(spec) => setSelectedSpecialtyFilter(spec)} />
                </div>

                {/* National Directory List */}
                <div className="border-t border-slate-100 pt-8">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    Medical Registry Directory
                  </h3>
                  <SearchHub
                    professionals={professionals}
                    reviews={reviews}
                    onSelectProfessional={(id) => setSelectedProfId(id)}
                    selectedSpecialtyFilter={selectedSpecialtyFilter}
                    onSelectSpecialtyFilter={(spec) => setSelectedSpecialtyFilter(spec)}
                    onClearSpecialtyFilter={() => setSelectedSpecialtyFilter('')}
                  />
                </div>
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
              <div className="max-w-2xl mx-auto">
                <SecureMessenger />
              </div>
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
              <div className="space-y-8">
                <PageBanner
                  eyebrow="Verified Medical Library"
                  title="Clinical Library"
                  description="Clinical papers and health guidance written by licensed practitioners."
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {articles.map((art) => (
                    <div key={art.id} className="bg-white border-2 border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300 ease-in-out space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-50 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-blue-100/50">
                          {art.category}
                        </span>
                        <span className="text-slate-400 text-xs font-semibold">{art.date}</span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 hover:text-blue-600 transition-colors">
                        {art.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        {art.excerpt}
                      </p>

                      <div className="border-t-2 border-b-2 border-slate-100/80 py-4 text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                        {art.content}
                      </div>

                      {/* Author credentials card */}
                      <div className="flex gap-3 items-center bg-slate-50 p-3.5 rounded-xl border-2 border-slate-200/60 hover:border-blue-200/50 transition-all duration-200">
                        <img
                          src={art.authorAvatar}
                          alt={art.authorName}
                          className="h-10 w-10 rounded-full object-cover border-2 border-slate-200 shadow-xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            {art.authorName}
                            <span className="bg-emerald-50 text-emerald-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-150">Verified & Accredited</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">{art.authorTitle}</p>
                        </div>
                      </div>

                      {/* Citations Box */}
                      {art.citations && (
                        <div className="bg-slate-100 text-slate-800 rounded-xl p-4 space-y-2 text-xs border-2 border-slate-300">
                          <span className="text-[9px] font-extrabold text-blue-400 uppercase tracking-wide block">
                            Peer-Reviewed Medical Citations (E-E-A-T Compliant):
                          </span>
                          <ul className="list-decimal list-inside space-y-1 font-mono text-[10px] leading-normal">
                            {art.citations.map((cit, idx) => (
                              <li key={idx}>{cit}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Accordion FAQ Box */}
                      {art.faq && (
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Clinical Patient FAQs</span>
                          {art.faq.map((faqItem, idx) => (
                            <details key={idx} className="group border-2 border-slate-200/60 rounded-xl p-3 bg-slate-50/50 cursor-pointer hover:border-slate-300 transition-all duration-200">
                              <summary className="text-xs font-extrabold text-slate-800 flex justify-between items-center outline-none list-none">
                                {faqItem.question}
                                <span className="text-blue-600 group-open:rotate-180 transition-transform font-bold">+</span>
                              </summary>
                              <p className="text-xs text-slate-600 leading-relaxed font-normal mt-2 border-t-2 border-slate-100/80 pt-2">
                                {faqItem.answer}
                              </p>
                            </details>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-purple-100">v{activePkg.version}</span>
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
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
                          <Settings className="h-4.5 w-4.5 text-purple-600 animate-spin" />
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Interactive Package Terminal & Diagnostics</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase">Mountpoint Hook</span>
                              <p className="text-xs font-mono font-bold text-blue-600">/src/modules/{activePkg.id}/index.tsx</p>
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
                            <p className="text-purple-400">[DEBUG] Package Category: {activePkg.category}</p>
                            <p className="text-slate-300">[LIVE] Module {activePkg.name} is running healthy.</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => alert(`Dynamic simulation for "${activePkg.name}" triggered successfully!`)}
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-purple-500/10 cursor-pointer"
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
      <footer className="bg-slate-100 text-slate-700 border-t border-slate-300 pt-10 pb-6 text-xs mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Detailed Sitemap Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-300">
            {/* Column 1: Brand & Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-ink">
                <Stethoscope className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="font-extrabold text-sm tracking-tight">CareVerify</span>
                <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Registry</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                National Medical Directory & Verification network connecting licensed doctors and nurses with direct compliance protocols and shift management.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-950/20 w-max px-2 py-1 rounded border border-emerald-900/30">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Active Core Sync</span>
              </div>
            </div>

            {/* Column 2: Portal Sitemap */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Portal Sitemap</h4>
              <ul className="space-y-2 font-semibold">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => { setActiveView(item.id); setSelectedProfId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`flex items-center gap-2 text-[11px] transition-colors hover:text-ink cursor-pointer ${isActive ? 'text-blue-600 font-extrabold' : 'text-slate-700'
                          }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        <span>{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 3: Medical Compliance */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Compliance Registry</h4>
              <ul className="space-y-2 text-[11px] font-semibold text-slate-600">
                <li className="hover:text-slate-700 cursor-pointer">Malaysian Medical Council (MMC)</li>
                <li className="hover:text-slate-700 cursor-pointer">Lembaga Jururawat Malaysia (LJM)</li>
                <li className="hover:text-slate-700 cursor-pointer">HIPAA Secured Encrypted Pipeline</li>
                <li className="hover:text-slate-700 cursor-pointer">E-E-A-T Medical Content Standards</li>
                <li className="hover:text-slate-700 cursor-pointer">Kementerian Kesihatan Malaysia (KKM)</li>
              </ul>
            </div>

            {/* Column 4: Practitioner & Patient Links */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Global Resources</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Log in to alternate credentials to inspect verification terminals, board review portals, and clinical shift scheduling pipelines.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 text-[10px] font-extrabold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Switch Perspective
                </button>
              </div>
            </div>
          </div>

          {/* Copyright & Badges */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px]">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 font-bold justify-center">
              <span className="hover:text-slate-700 cursor-pointer transition-colors">HIPAA Secured</span>
              <span>&bull;</span>
              <span className="hover:text-slate-700 cursor-pointer transition-colors">MMC Compliance</span>
              <span>&bull;</span>
              <span className="hover:text-slate-700 cursor-pointer transition-colors">LJM Registered</span>
            </div>

            <div className="text-slate-600 font-bold">
              &copy; {new Date().getFullYear()} CareVerify. All rights reserved.
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
