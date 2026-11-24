import React, { Suspense, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Menu, X, UserCheck, Settings, Activity, Home as HomeIcon, CalendarDays, MessageSquare, FileText
} from 'lucide-react';


// Shared UI, Registry & Lazy-Loaded Modules
import DashboardHeader from './shared/ui/DashboardHeader';
import BrandLogo from './shared/ui/BrandLogo';
const CaregiverWorkspace = React.lazy(() => import('./components/CaregiverWorkspace'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
import NotificationBell from './components/NotificationBell';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useLocale, useTr } from './locale';
import SOSButton from './components/SOSButton';
import { navigate, useLocation, loginUrl } from './nav';
import Footer from './components/Footer';
import LoadingImage from './components/LoadingImage';
import { UserAvatar } from './avatars';
import PageBanner from './shared/ui/PageBanner';
import {
  buildNavItems,
  canAccessView,
  defaultViewForRole,
  getAdminGroup,
  getFacilityGroup,
  getPatientGroup,
  getPatientTab,
  getPharmacyGroup,
  isNavItemActive,
  MOBILE_PRIORITY,
  SHORT_LABEL,
  STANDARD_MODULE_IDS,
} from './app/moduleRegistry';
import {
  AccountRecovery,
  AdminDashboard,
  AISymptomMatcher,
  ClinicHospitalPage,
  ConsultNow,
  DashboardDesignPreview,
  FacilityWorkspace,
  HeaderColorSamples,
  InternationalPatientsPage,
  JobMarket,
  LandingDesignPreview,
  LandingPage,
  LoginPage,
  MalaysiaPatientsPage,
  MedicalAssistanceModule,
  MedicalLibrary,
  MedicalPackagesModule,
  MedicalTourism,
  PatientDashboard,
  PatientHeroBanner,
  PharmacyFinder,
  PharmacyPage,
  PharmacyWorkspace,
  PractitionerPage,
  ProfessionalProfile,
  PublicPackagesPage,
  SearchHub,
  SecureMessenger,
  SEODashboard,
  SupportDesk,
  TourismDesk,
  VerificationTerminal,
  VerifyPractitionersPage,
  FacilitySignUp,
} from './app/lazyComponents';

// Types import
import { DoctorProfile, NurseProfile, Booking, Review, JobPost, Article, AppPackage, AdminSubRole, ADMIN_SUB_ROLES } from './types';
import { INITIAL_DOCTORS, INITIAL_NURSES, INITIAL_JOBS, INITIAL_ARTICLES, INITIAL_REVIEWS } from './data';

export default function App() {
  useLocale(); // re-render the tree when language/region changes
  // Navigation & View State
  const [activeView, setActiveView] = useState<'registry' | 'profile' | 'onboard' | 'recruitment' | 'messages' | 'admin' | 'seo' | 'articles' | 'patient_dashboard' | string>('patient_dashboard');
  useEffect(() => {
    document.querySelector<HTMLElement>('nav[aria-label="Main"] button[data-active="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeView]);
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>('');
  const [prefilledSymptoms, setPrefilledSymptoms] = useState<string>('');
  const [registryTab, setRegistryTab] = useState<'directory' | 'triage'>('directory');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Which patient page is showing (the patient workspace reports it), so the phone bar can highlight it
  const [patientTab, setPatientTab] = useState<string>('overview');
  useEffect(() => {
    const onTab = (e: Event) => { const d = (e as CustomEvent<string>).detail; if (d) setPatientTab(d); };
    window.addEventListener('medcred-patient-tab', onTab);
    return () => window.removeEventListener('medcred-patient-tab', onTab);
  }, []);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // User Session State (server-side session cookie; nothing sensitive is kept in localStorage)
  type SessionUser = {
    id: string;
    role: 'patient' | 'practitioner' | 'nurse' | 'admin' | 'pharmacy' | 'facility';
    name: string;
    email: string;
    avatarUrl?: string;
    profileId?: string | null;
    facilityId?: string | null;
    adminSubRole?: AdminSubRole;
  };
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const route = useLocation();
  // Emails to a signed-in person are sent in the language they use in the app
  const { lang: appLang } = useLocale();
  const tt = useTr();
  useEffect(() => {
    if (currentUser) fetch('/api/me/language', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: appLang }) }).catch(() => {});
  }, [currentUser?.id, appLang]);
  // A signed-in user who opens /login is sent home
  useEffect(() => { if (currentUser && route.path === '/login') navigate('/', { replace: true }); }, [currentUser, route.path]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [notice, setNotice] = useState<string | null>(() => {
    // Stripe sends the patient back here with ?payment=success|cancelled
    const q = new URLSearchParams(window.location.search).get('payment');
    if (!q) return null;
    window.history.replaceState({}, '', window.location.pathname);
    return q === 'success' ? 'Payment received. It can take a few seconds to confirm.' : 'Payment was cancelled.';
  });

  const routeForRole = (role: SessionUser['role']) => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('profId') || params.get('consultProfId');
    const intent = params.get('intent');

    if (pId && role === 'patient') {
      setSelectedProfId(pId);
      setActiveView('patient_care');
      return;
    }

    if (intent === 'package' && role === 'patient') {
      setActiveView('patient_services');
      return;
    }

    setActiveView(
      role === 'patient'
        ? 'patient_care'
        : role === 'practitioner'
        ? 'onboard'
        : role === 'nurse'
        ? 'nurse_care'
        : role === 'pharmacy'
        ? 'pharmacy_dispensing'
        : role === 'facility'
        ? 'facility_staffing'
        : 'admin_registry'
    );
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
          if (d.data.user?.adminSubRole) {
            setAdminSubRole(d.data.user.adminSubRole);
            try { localStorage.setItem('cv_admin_subrole', d.data.user.adminSubRole); } catch { /* ignore */ }
          }
          rememberPatient(d.data.patient);
          routeForRole(d.data.user.role);
        }
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  // Listen for deep-link intent query parameters (e.g. ?profId=doc-1 or ?intent=package)
  useEffect(() => {
    const pId = route.params.get('profId') || route.params.get('consultProfId');
    const intent = route.params.get('intent');
    if (pId) {
      setSelectedProfId(pId);
      if (currentUser?.role === 'patient') {
        setActiveView('patient_care');
      }
    } else if (intent === 'package' && currentUser?.role === 'patient') {
      setActiveView('patient_services');
    }
  }, [route.params, currentUser]);

  const handleLoginSuccess = (user: SessionUser, patient?: unknown) => {
    // Leave the /login address behind once signed in, preserving query params (e.g. intent=package, profId=...)
    const search = window.location.search;
    if (window.location.pathname === '/login') navigate('/' + search, { replace: true });
    setCurrentUser(user);
    if (user.adminSubRole) {
      setAdminSubRole(user.adminSubRole);
      try { localStorage.setItem('cv_admin_subrole', user.adminSubRole); } catch { /* ignore */ }
    }
    rememberPatient(patient);
    routeForRole(user.role);
    loadData();
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setCurrentUser(null);
    navigate('/', { replace: true });
    rememberPatient(undefined);
    setBookings([]);
    loadData();
  };

  // App Global State (synced from API, pre-seeded with initial verified directory data)
  const [professionals, setProfessionals] = useState<(DoctorProfile | NurseProfile)[]>(() => [...INITIAL_DOCTORS, ...INITIAL_NURSES]);
  const [jobs, setJobs] = useState<JobPost[]>(() => [...INITIAL_JOBS]);
  const [articles, setArticles] = useState<Article[]>(() => [...INITIAL_ARTICLES]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>(() => [...INITIAL_REVIEWS]);
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

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveView(customEvent.detail);
        setSelectedProfId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('medcred-navigate', handleNavigate);
    return () => window.removeEventListener('medcred-navigate', handleNavigate);
  }, []);

  // Admin Sub-Role (RBAC) State
  const [adminSubRole, setAdminSubRole] = useState<AdminSubRole>(() => {
    return (localStorage.getItem('cv_admin_subrole') as AdminSubRole) || 'super_admin';
  });

  const applyAdminSubRole = (role: AdminSubRole, syncBackend = true) => {
    setAdminSubRole(role);
    try { localStorage.setItem('cv_admin_subrole', role); } catch { /* ignore */ }
    if (syncBackend && currentUser?.role === 'admin') {
      fetch('/api/admin/sub-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subRole: role }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleSubRoleChanged = (e: Event) => {
      const custom = e as CustomEvent<any>;
      const role = typeof custom.detail === 'string' ? custom.detail : custom.detail?.role;
      if (role && role in ADMIN_SUB_ROLES) {
        applyAdminSubRole(role as AdminSubRole, true);
      }
    };
    window.addEventListener('medcred-admin-subrole-changed', handleSubRoleChanged);
    return () => window.removeEventListener('medcred-admin-subrole-changed', handleSubRoleChanged);
  }, [currentUser?.role]);

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

  // Centralized Role & Sub-Role View Access Guard + Safety Redirect when a package is disabled
  useEffect(() => {
    if (!currentUser || loading) return;
    const allowed = canAccessView(activeView, currentUser.role, {
      adminSubRole,
      isPackageEnabled,
      packages,
    });
    if (!allowed) {
      const fallback = defaultViewForRole(currentUser.role, adminSubRole);
      if (activeView !== fallback) {
        setActiveView(fallback);
        setSelectedProfId(null);
        setNotice(tt('Access restricted: Your role does not have permission to open that module.'));
      }
    }
  }, [currentUser, loading, activeView, adminSubRole, packages]);

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
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[color:var(--t-bg)] text-slate-800 p-6 text-center animate-fade-in">
        <div className="relative mb-4 flex items-center justify-center">
          <LoadingImage size={80} />
        </div>
        <BrandLogo tone="light" size="md" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
          Verifying secure medical session…
        </p>
      </div>
    );
  }

  const routeFallback = (
    <div role="status" aria-live="polite" className="min-h-[60vh] flex flex-col items-center justify-center bg-[color:var(--t-bg)] text-slate-700 p-6 text-center">
      <LoadingImage size={56} />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-3">{tt('Loading module…')}</p>
    </div>
  );

  // Design Samples Preview routes (accessible both logged in and out)
  if (route.path === '/dashboard-preview') return <Suspense fallback={routeFallback}><DashboardDesignPreview /></Suspense>;
  if (route.path === '/header-samples') return <Suspense fallback={routeFallback}><HeaderColorSamples /></Suspense>;
  if (route.path === '/landing-preview' || route.path === '/design-preview') return <Suspense fallback={routeFallback}><LandingDesignPreview /></Suspense>;

  // Dedicated Target Audience and Verification Routes (Accessible by patients and observers)
  if (route.path === '/register-facility') return <Suspense fallback={routeFallback}><FacilitySignUp /></Suspense>;
  if (route.path === '/verify' || route.path === '/verify-practitioners') {
    return <Suspense fallback={routeFallback}><VerifyPractitionersPage professionals={professionals} onSignUp={() => navigate(loginUrl('patient', true))} /></Suspense>;
  }
  if (route.path === '/for-patients' || route.path === '/malaysia-patients') {
    return <Suspense fallback={routeFallback}><MalaysiaPatientsPage onSignUp={() => navigate(loginUrl('patient', true))} /></Suspense>;
  }
  if (route.path === '/medical-tourism' || route.path === '/international-patients') {
    return <Suspense fallback={routeFallback}><InternationalPatientsPage onSignUp={() => navigate(loginUrl('patient', true))} /></Suspense>;
  }

  // Public medical packages page: its own page, same for visitors and signed-in users
  if (
    route.path === '/packages' ||
    route.path.startsWith('/packages/') ||
    route.path === '/medical-packages' ||
    route.path === '/clinics' ||
    route.path === '/hospitals' ||
    route.path === '/nurses' ||
    route.path === '/doctors' ||
    route.path === '/pharmacies-directory'
  ) return <Suspense fallback={routeFallback}><PublicPackagesPage signedIn={!!currentUser} /></Suspense>;

  // If not logged in, render landing page
  if (!currentUser) {
    let publicView: React.ReactNode = <LandingPage professionals={professionals} />;
    if (route.path === '/login') publicView = <LoginPage onLoginSuccess={handleLoginSuccess} />;
    else if (route.path === '/for-practitioners') publicView = <PractitionerPage initialRole="all" />;
    else if (route.path === '/for-doctors') publicView = <PractitionerPage initialRole="doctor" />;
    else if (route.path === '/for-nurses') publicView = <PractitionerPage initialRole="nurse" />;
    else if (route.path === '/forgot-password') publicView = <AccountRecovery mode="forgot" />;
    else if (route.path === '/reset-password') publicView = <AccountRecovery mode="reset" />;
    else if (route.path === '/for-pharmacies') publicView = <PharmacyPage />;
    else if (route.path === '/for-clinics' || route.path === '/for-hospitals') publicView = <ClinicHospitalPage />;
    else if (route.path === '/assistance' || route.path === '/medical-assistance' || route.path === '/enquiries-quotes') publicView = <><MedicalAssistanceModule /><Footer variant="landing" /></>;
    return <Suspense fallback={routeFallback}>{publicView}</Suspense>;
  }

  // Define Horizontal Menu Items from declarative Module Registry
  const navItems = buildNavItems(currentUser.role, { adminSubRole, isPackageEnabled, packages });

  // The mobile bottom bar shows the places each role uses most (up to four); everything else is under "More".
  const mobileTabs = (() => {
    const wanted = (MOBILE_PRIORITY[currentUser.role] ?? []).map(id => navItems.find(n => n.id === id)).filter(Boolean) as typeof navItems;
    const rest = navItems.filter(n => !wanted.includes(n) && n.id !== 'help');
    return [...wanted, ...rest].slice(0, 4);
  })();

  // Phone bottom bar. Patients get Home, Visits, Messages, Records and More; other roles keep their top places.
  const onPatientPage = currentUser.role === 'patient' && !selectedProfId && ['patient_dashboard', 'patient_care', 'patient_records', 'patient_services', 'patient_discovery', 'overview', 'appointments', 'consult', 'messages', 'records', 'prescriptions', 'certs', 'labs', 'saved'].includes(activeView);
  const barItems: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; view: string; active: boolean }[] = currentUser.role === 'patient'
    ? [
        { id: 'bar-home', label: 'Home', icon: HomeIcon, view: 'overview', active: onPatientPage && patientTab === 'overview' },
        { id: 'bar-visits', label: 'Visits', icon: CalendarDays, view: 'appointments', active: onPatientPage && patientTab === 'appointments' },
        { id: 'bar-messages', label: 'Messages', icon: MessageSquare, view: 'messages', active: onPatientPage && patientTab === 'messages' },
        { id: 'bar-records', label: 'Records', icon: FileText, view: 'records', active: onPatientPage && ['records', 'prescriptions', 'labs', 'certs'].includes(patientTab) },
      ]
    : mobileTabs.map(item => ({ id: item.id, label: SHORT_LABEL[item.id] ?? item.name, icon: item.icon, view: item.id, active: activeView === item.id }));

  // "More" takes the highlight while its menu is open, and on any page that is not one of the bar's own tabs
  const moreActive = mobileMenuOpen || !barItems.some(i => i.active);

  const handleNavKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentId: string) => {
    const ids = navItems.map(n => n.id);
    const currentIndex = ids.indexOf(currentId);
    let nextIndex = -1;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ids.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = ids.length - 1;
    else return;

    e.preventDefault();
    const nextId = ids[nextIndex];
    setActiveView(nextId);
    setSelectedProfId(null);
    const nextEl = document.getElementById(`nav-tab-${nextId}`) as HTMLElement | null;
    nextEl?.focus();
  };

  return (
    <div className="workspace-font-dm-sans min-h-dvh bg-[color:var(--t-bg)] text-slate-800 flex flex-col font-sans antialiased selection:bg-[color:var(--t-100)] selection:text-[color:var(--t-600)] pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Skip to Main Content Link (WCAG 2.4.1 Bypass Blocks) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2.5 focus:bg-slate-900 focus:text-white focus:font-bold focus:text-xs focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-0 rounded-none transition-all uppercase tracking-wider"
      >
        {tt('Skip to main content')}
      </a>

      {notice && (
        <div role="status" className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[120] bg-slate-900 text-white text-xs font-semibold px-4 sm:px-5 py-3 shadow-lg flex items-center justify-between sm:justify-start gap-4">
          {notice}
          <button onClick={() => setNotice(null)} className="underline text-xs cursor-pointer">{tt('Dismiss')}</button>
        </div>
      )}

      {/* MediCred Elevated Primary Header */}
      <header className="bg-[color:var(--t-600)]/95 lg:backdrop-blur-md text-white border-0 sticky top-0 z-40 shrink-0 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

          {/* Brand Logo */}
          <button
            type="button"
            className="flex items-center cursor-pointer group text-left bg-transparent border-0 p-0"
            onClick={() => {
              if (currentUser.role === 'patient') setActiveView('patient_care');
              else if (currentUser.role === 'practitioner') setActiveView('onboard');
              else if (currentUser.role === 'nurse') setActiveView('nurse_care');
              else if (currentUser.role === 'pharmacy') setActiveView('pharmacy_dispensing');
              else if (currentUser.role === 'facility') setActiveView('facility_staffing');
              else if (currentUser.role === 'admin') setActiveView('admin_registry');
              setSelectedProfId(null);
            }}
          >
            <BrandLogo
              tone="onColor"
              size="lg"
              layout="badge"
              subtitle={
                currentUser.role === 'admin'
                  ? tt('Board Console')
                  : currentUser.role === 'practitioner'
                  ? tt('Practitioner Hub')
                  : currentUser.role === 'nurse'
                  ? tt('Nursing & Care Hub')
                  : currentUser.role === 'pharmacy'
                  ? tt('Pharmacy Workspace')
                  : currentUser.role === 'facility'
                  ? tt('Facility Portal')
                  : tt('Member Portal')
              }
            />
          </button>

          {/* Right-Side Desktop Actions & User Session Details - Standardized Gaps & Round Outlines */}
          <div className="hidden lg:flex items-center gap-2.5 sm:gap-3">
            <div className="hidden 2xl:flex items-center gap-2 bg-white/15 border-0 shadow-none px-3 py-1.5 rounded-none text-xs font-bold text-white whitespace-nowrap" title={tt('Council-Verified Network (Act 586)')}>
              <ShieldCheck className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              <span>{tt('Council-verified doctors')}</span>
            </div>

            <div className="hidden 2xl:block h-5 w-px bg-white/20 mx-0.5" aria-hidden="true" />

            {currentUser.role === 'patient' && <SOSButton />}
            <NotificationBell tone="onColor" />

            <div className="h-5 w-px bg-white/20 mx-0.5" aria-hidden="true" />

            {/* Profile Badge embedded with Settings & Close Session Buttons */}
            <div className="flex items-center gap-2 bg-white/15 border-0 shadow-none px-2.5 py-1 rounded-none transition-all">
              <button type="button" onClick={() => { setActiveView('my_profile'); setSelectedProfId(null); }} className="flex items-center gap-2 text-left bg-transparent border-0 p-0 cursor-pointer" aria-label={tt('My profile')} title={tt('My profile')}>
<UserAvatar
                src={currentUser.avatarUrl}
                role={currentUser.role}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-white/40 shrink-0"
              />
              <div className="text-left hidden xl:block leading-tight mr-0.5">
                <p className="text-xs font-black text-white leading-none truncate max-w-[140px]">{currentUser.name}</p>
                <p className="text-2xs text-white/85 font-extrabold uppercase tracking-wider mt-0.5">
                  {currentUser.role === 'admin' ? tt('Board Admin') : currentUser.role === 'practitioner' ? tt('Practitioner') : currentUser.role === 'pharmacy' ? tt('Pharmacy') : tt('Member')}
                </p>
              </div>
</button>
              <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-white/20">
                <ThemeSwitcher tone="onColor" variant="embedded" />
                <button
                  onClick={handleLogout}
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20 bg-transparent border-0 rounded-none transition-colors cursor-pointer flex items-center justify-center"
                  title={tt('Close Session')}
                  aria-label={tt('Close session')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Toggler - Standardized Gaps & Round Outlines */}
          <div className="flex lg:hidden items-center gap-2">
            {currentUser.role === 'patient' && <SOSButton />}
            <NotificationBell tone="onColor" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-10 min-w-10 flex items-center justify-center rounded-none border-0 text-white hover:bg-white/15 cursor-pointer"
              aria-label={tt('Toggle navigation')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="lg:hidden fixed inset-x-0 top-16 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 bg-white text-[color:var(--ink)] px-4 sm:px-6 border-t border-[color:var(--t-200)] overflow-y-auto overscroll-contain"
              role="dialog"
              aria-label="Menu"
            >
              <div className="py-3 space-y-1 text-xs font-bold text-[color:var(--ink)] pb-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(item.id, activeView);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); setSelectedProfId(null); setMobileMenuOpen(false); }}
                      className={`w-full text-left min-h-11 py-2.5 px-3.5 rounded-none flex items-center justify-between transition-colors cursor-pointer ${isActive
                        ? 'bg-[color:var(--t-600)] text-white font-extrabold'
                        : 'hover:bg-[color:var(--t-50)] text-[color:var(--ink)]'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-[color:var(--t-600)]'}`} />
                        <span>{tt(item.name)}</span>
                      </div>

                      {item.id === 'facility_staffing' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Shifts')}
                        </span>
                      )}
                      {item.id === 'pharmacy_dispensing' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Rx Live')}
                        </span>
                      )}
                      {item.id === 'admin_registry' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Audit')}
                        </span>
                      )}
                      {item.id === 'admin_ops' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Ops')}
                        </span>
                      )}
                      {item.id === 'messages' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-100)] text-[color:var(--t-600)]'}`}>
                          {tt('2 new')}
                        </span>
                      )}
                      {item.id === 'recruitment' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('9 Open')}
                        </span>
                      )}
                      {item.id === 'onboard' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Clinical')}
                        </span>
                      )}
                      {item.id === 'practice_compliance' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('MMC/LJM')}
                        </span>
                      )}
                      {item.id === 'performance_profile' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Profile')}
                        </span>
                      )}
                      {item.id === 'articles' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Library')}
                        </span>
                      )}
                      {item.id === 'tourism_desk' && (
                        <span className={`text-2xs px-2 py-0.5 rounded-none font-mono font-extrabold ${isActive ? 'bg-white text-[color:var(--t-600)]' : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)]'}`}>
                          {tt('Global')}
                        </span>
                      )}
                    </button>
                  );
                })}

                <button type="button" onClick={() => { setActiveView('my_profile'); setSelectedProfId(null); setMobileMenuOpen(false); }} className="w-full text-left px-1 pt-3 mt-3 border-t border-[color:var(--t-200)] text-sm font-bold text-[color:var(--t-700)] bg-transparent cursor-pointer">{tt('My profile')}</button>
                <div className="flex items-center justify-between px-1 pt-3 mt-3 border-t border-[color:var(--t-200)]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ink-2)]">Settings</span>
                  <span className="flex items-center gap-2"><ThemeSwitcher /></span>
                </div>
                <div className="pt-3 mt-3 border-t border-[color:var(--t-200)] flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      src={currentUser.avatarUrl}
                      role={currentUser.role}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-full object-cover border border-[color:var(--t-200)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[color:var(--ink)] leading-none truncate">{currentUser.name}</p>
                      <p className="text-xs text-[color:var(--ink-2)] font-semibold capitalize mt-1">{currentUser.role === 'patient' ? 'member' : currentUser.role} Account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="p-2 bg-transparent text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] rounded-full border-0 transition-colors cursor-pointer shrink-0"
                    title={tt('Close Session')}
                    aria-label={tt('Close session')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Primary Screen Area */}
      <main id="main-content" tabIndex={-1} className="flex-grow mt-0 pt-0 pb-4 sm:pb-8 w-full px-0 max-w-none focus:outline-none">
        {!loading && (currentUser.role === 'practitioner' || currentUser.role === 'nurse') && (() => {
          const myProf = currentUser.profileId ? professionals.find(p => p.id === currentUser.profileId) : null;
          const todayIso = new Date().toISOString().slice(0, 10);
          const isUnverified = !myProf || myProf.verificationStatus !== 'Verified';
          const isExpired = !!myProf?.licenseExpiry && myProf.licenseExpiry < todayIso;
          if (!isUnverified && !isExpired) return null;
          const credView = currentUser.role === 'nurse' ? 'nurse_credentials' : 'practice_compliance';
          return (
            <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-950">
              <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <span>
                    {isExpired
                      ? tt('Annual Practising Certificate (APC) expired on {date}. Clinical consultations, e-Rx, and shift applications are restricted until renewed.', { date: myProf?.licenseExpiry || '' })
                      : !myProf
                      ? tt('Board credentialing required: Submit your licence and registration details to unlock clinical consultations and shift applications.')
                      : tt('Credential verification status: {status}. Clinical consultations, e-Rx, and shift applications unlock once verified by the Board.', { status: myProf.verificationStatus })}
                  </span>
                </div>
                {activeView !== credView && (
                  <button
                    type="button"
                    onClick={() => { setActiveView(credView); setSelectedProfId(null); }}
                    className="font-bold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 px-3 py-1 cursor-pointer transition-colors"
                  >
                    {tt('Open Credentials & Licensing')}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
        {loading ? (
          <div role="status" aria-live="polite" className="text-center min-h-[60vh] space-y-4 animate-fade-in flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <LoadingImage size={64} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Loading your workspace…</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">This takes a moment.</p>
            </div>
          </div>
        ) : (
          <Suspense fallback={routeFallback}>
          <div className="w-full animate-fade-in">

            {/* VIEW 1: REGISTRY & SYMPTOM MATCHER */}
            {activeView === 'registry' && !selectedProfId && currentUser.role !== 'patient' && (
              <div className="w-full space-y-0">
                {/* Standard dashboard header with attached tabs */}
                <DashboardHeader
                  icon={UserCheck}
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

                <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                  {/* TAB CONTENT 1: Symptom Triage Search Panel */}
                  {registryTab === 'triage' && (
                    <div className="max-w-3xl mx-auto animate-fade-in">
                      <AISymptomMatcher
                        onSelectSpecialty={(spec) => {
                          setSelectedSpecialtyFilter(spec);
                          setRegistryTab('directory');
                        }}
                        onApplyTriage={(triage) => {
                          setSelectedSpecialtyFilter(triage.specialty);
                          setPrefilledSymptoms(triage.symptoms);
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
              </div>
            )}

            {/* VIEW 2: PROFILE VIEW WITH APPOINTMENT BOOKING */}
            {selectedProfId && (
              <div className="space-y-0">
                {currentUser?.role === 'patient' && (
                  <PatientHeroBanner
                    userName={currentUser.name}
                    userAvatar={currentUser.avatarUrl}
                    activeTab="discovery"
                    onTabChange={(grp) => {
                      setSelectedProfId(null);
                      const viewMap: Record<string, any> = {
                        care: 'patient_care',
                        records: 'patient_records',
                        services: 'patient_services',
                        discovery: 'patient_discovery',
                      };
                      setActiveView(viewMap[grp] || 'patient_discovery');
                    }}
                    onOpenHelp={() => {
                      setSelectedProfId(null);
                      setActiveView('help');
                    }}
                  />
                )}
                <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                  <ProfessionalProfile
                    professionalId={selectedProfId}
                    onBack={() => setSelectedProfId(null)}
                    onNewBookingCreated={handleNewBookingCreated}
                    reviews={reviews}
                    onNewReviewPosted={handleNewReviewPosted}
                    currentUser={currentUser}
                    prefilledSymptoms={prefilledSymptoms}
                  />
                </div>
              </div>
            )}

            {/* VIEW 3: PRACTITIONER PORTAL PARENT VIEWS */}
            {activeView === 'onboard' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="clinical"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'practice_compliance' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="practice"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'performance_profile' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="performance"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {/* VIEW 4: RECRUITMENT MARKET */}
            {activeView === 'recruitment' && ['practitioner', 'nurse', 'facility', 'admin'].includes(currentUser.role) && (
              <JobMarket
                jobs={jobs}
                onNewJobCreated={handleNewJobCreated}
                onApplyJob={handleApplyJob}
                onRefreshData={loadData}
                role={currentUser.role}
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {/* VIEW 5: PHARMACIES & WORKSPACES */}
            {activeView === 'pharmacies' && currentUser.role !== 'patient' && <PharmacyFinder />}

            {/* VIEW: FACILITY WORKSPACE (Handles all facility groups) */}
            {(currentUser.role === 'facility' || (currentUser.role === 'admin' && ['facility_workspace', 'facility_staffing', 'facility_care', 'facility_profile'].includes(activeView))) && [
              'facility_workspace', 'facility_staffing', 'facility_care', 'facility_profile'
            ].includes(activeView) && (
              <FacilityWorkspace activeGroup={getFacilityGroup(activeView)} currentUser={currentUser} />
            )}

            {/* VIEW: NURSE & CARING ATTENDANT WORKSPACE */}
            {currentUser.role === 'nurse' && [
              'nurse_workspace', 'nurse_care', 'nurse_shifts', 'nurse_credentials'
            ].includes(activeView) && (
              <CaregiverWorkspace
                currentUser={currentUser}
                professionals={professionals}
                bookings={bookings}
                jobs={jobs}
                reviews={reviews}
                onNewJobCreated={handleNewJobCreated}
                onApplyJob={handleApplyJob}
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {/* VIEW: PHARMACY WORKSPACE (Handles all pharmacy groups) */}
            {currentUser.role === 'pharmacy' && [
              'pharmacy_workspace', 'pharmacy_dispensing', 'pharmacy_operations'
            ].includes(activeView) && (
              <PharmacyWorkspace activeGroup={getPharmacyGroup(activeView)} currentUser={currentUser} />
            )}

            {activeView === 'consult' && currentUser.role !== 'patient' && (
              <ConsultNow myUserId={currentUser.id} />
            )}

            {activeView === 'packages' && currentUser.role !== 'patient' && <MedicalPackagesModule />}
            {activeView === 'assistance' && currentUser.role !== 'patient' && <MedicalAssistanceModule />}

            {activeView === 'tourism' && currentUser.role !== 'patient' && (
              <MedicalTourism onOpenProfessional={(id) => { setSelectedProfId(id); setActiveView('registry'); }} />
            )}

            {activeView === 'tourism_desk' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="clinical"
                initialTab="global"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'tourism_desk' && currentUser.role === 'admin' && (
              <TourismDesk
                isAdmin={true}
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
              />
            )}

            {activeView === 'my_profile' && (
              <Suspense fallback={routeFallback}>
                <ProfilePage
                  onUserUpdated={u => setCurrentUser(cu => (cu ? { ...cu, name: u.name, email: u.email } : cu))}
                  onOpenCredentials={currentUser.role === 'practitioner' ? () => setActiveView('practice_compliance') : undefined}
                />
              </Suspense>
            )}
            {activeView === 'help' && (
              <SupportDesk
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
              />
            )}

            {activeView === 'quality' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="practice"
                initialTab="quality"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'earnings' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="performance"
                initialTab="earnings"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'oncall' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="clinical"
                initialTab="oncall"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'messages' && currentUser.role === 'practitioner' && (
              <VerificationTerminal
                currentUser={currentUser}
                professionals={professionals}
                reviews={reviews}
                bookings={bookings}
                onRefreshData={loadData}
                activeGroup="clinical"
                initialTab="messages"
                onOpenHelp={() => setActiveView('help')}
              />
            )}

            {activeView === 'messages' && currentUser.role !== 'practitioner' && currentUser.role !== 'patient' && (
              <SecureMessenger currentUserId={currentUser.profileId || currentUser.id} />
            )}

            {/* VIEW 6: MEDICAL BOARD ADMIN (Unified admin dashboard with parent groups) */}
            {currentUser.role === 'admin' && [
              'admin', 'admin_registry', 'admin_ops', 'admin_facilities', 'admin_growth'
            ].includes(activeView) && (
              <AdminDashboard
                professionals={professionals}
                onProfessionalApproved={handleProfessionalApprovedByAdmin}
                packages={packages}
                onPackagesChanged={handlePackagesChanged}
                activeGroup={getAdminGroup(activeView)}
                jobs={jobs}
                onNewJobCreated={handleNewJobCreated}
                onApplyJob={handleApplyJob}
                onRefreshData={loadData}
                currentUser={currentUser}
                reviews={reviews}
                bookings={bookings}
                adminSubRole={adminSubRole}
                onAdminSubRoleChange={(role) => applyAdminSubRole(role, true)}
              />
            )}

            {/* VIEW 7: SEO DASHBOARD */}
            {activeView === 'seo' && currentUser.role === 'admin' && (
              <SEODashboard professionals={professionals} />
            )}

            {/* VIEW 9: PATIENT PORTAL DASHBOARD (Unified PatientHeroBanner & 4 parent groups for all patient views) */}
            {currentUser.role === 'patient' && [
              'patient_dashboard', 'patient_care', 'patient_records', 'patient_services', 'patient_discovery',
              'overview', 'appointments', 'consult', 'packages', 'assistance', 'tourism', 'pharmacies', 'messages', 'articles', 'registry', 'nurses', 'records', 'prescriptions', 'certs', 'labs', 'saved'
            ].includes(activeView) && !selectedProfId && (
              <PatientDashboard
                bookings={bookings}
                setBookings={setBookings}
                professionals={professionals}
                currentUser={currentUser}
                articles={articles}
                activeGroup={getPatientGroup(activeView)}
                initialTab={getPatientTab(activeView)}
                onSelectProfessional={(id) => setSelectedProfId(id)}
                onNavigateToMessages={() => setActiveView('messages')}
                onConsultNow={() => setActiveView('consult')}
                onFindDoctors={() => { setRegistryTab('directory'); setActiveView('patient_discovery'); setSelectedProfId(null); }}
                onOpenTriage={() => { setActiveView('patient_care'); setSelectedProfId(null); }}
                onOpenPharmacies={() => setActiveView('pharmacies')}
                onOpenHelp={() => setActiveView('help')}
                onOpenArticle={(id) => { try { sessionStorage.setItem('open_article', id); } catch { /* ignore */ } setActiveView('articles'); }}
                selectedSpecialtyFilter={selectedSpecialtyFilter}
                onSelectSpecialtyFilter={(spec) => setSelectedSpecialtyFilter(spec)}
                onClearSpecialtyFilter={() => setSelectedSpecialtyFilter('')}
              />
            )}

            {/* VIEW 8: HEALTH ARTICLES / EDUCATION */}
            {activeView === 'articles' && currentUser.role !== 'patient' && (
              <MedicalLibrary
                articles={articles}
                professionals={professionals}
                canRecommend={currentUser.role === 'practitioner'}
                currentUser={currentUser}
                reviews={reviews}
                bookings={bookings}
                onOpenHelp={() => setActiveView('help')}
                onReportProblem={(a) => {
                  try { sessionStorage.setItem('support_prefill', JSON.stringify({ category: 'Feedback', subject: `Problem with article: ${a.title}`.slice(0, 120) })); } catch { /* ignore */ }
                  setActiveView('help');
                }}
                onFindDoctor={(specialty) => { setSelectedSpecialtyFilter(specialty ?? ''); setRegistryTab('directory'); setActiveView('registry'); setSelectedProfId(null); }}
              />
            )}

            {/* VIEW: DYNAMIC CUSTOM / MARKETPLACE MODULE VIEW */}
            {!STANDARD_MODULE_IDS.has(activeView) && (
              (() => {
                const activePkg = packages.find(p => p.id === activeView);
                if (!activePkg) return null;
                return (
                  <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in text-slate-800">
                    <div className="bg-white border-2 border-slate-200/85 p-8 rounded-2xl shadow-sm space-y-6">
                      <PageBanner
                        eyebrow="Marketplace Module"
                        title={activePkg.name}
                        description={`Compiled & hot-loaded by ${activePkg.author}`}
                        actions={
                          <>
                            <span className="bg-[color:var(--t-50)] text-[color:var(--t-600)] text-2xs font-extrabold px-2 py-0.5 rounded-lg border border-[color:var(--t-200)]">v{activePkg.version}</span>
                            <span className="bg-emerald-50 text-emerald-800 tag-pill font-extrabold px-3 py-1.5 rounded-xs border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-xs animate-pulse"></span>
                              <span>Active Runtime Package</span>
                            </span>
                          </>
                        }
                      />

                      <div className="space-y-3">
                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider">Functional Package Description</h4>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 p-4.5 rounded-xl">
                          {activePkg.description}
                        </p>
                      </div>

                      {/* Interactive sandbox demonstration for custom module */}
                      <div className="border border-slate-200/60 rounded-2xl p-6 bg-slate-50/50 space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Settings className="h-4.5 w-4.5 text-[color:var(--t-600)] animate-spin" />
                          <h4 className="text-sm font-black uppercase text-slate-800 tracking-wider">Interactive Package Terminal & Diagnostics</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              <span className="text-xs text-slate-400 font-extrabold uppercase">Mountpoint Hook</span>
                              <p className="text-xs font-mono font-bold text-[color:var(--t-600)]">/src/modules/{activePkg.id}/index.tsx</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              <span className="text-xs text-slate-400 font-extrabold uppercase">Isolation</span>
                              <p className="text-xs font-mono font-bold text-emerald-600">Runs inside the app</p>
                            </div>
                          </div>

                          <div className="bg-slate-100 text-slate-800 border border-slate-300 font-mono p-4 rounded-xl text-xs leading-relaxed shadow-inner overflow-x-auto max-h-40">
                            <p className="text-emerald-400">[INFO] Hot-mounting package: {activePkg.id}</p>
                            <p className="text-slate-400">[OK] Injecting dynamic layout nodes...</p>
                            <p className="text-slate-400">[OK] Instantiating core API controllers...</p>
                            <p className="text-rose-400">[DEBUG] Package Category: {activePkg.category}</p>
                            <p className="text-slate-300">[LIVE] Module {activePkg.name} is running healthy.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

          </div>
          </Suspense>
        )}
      </main>


      {/* Mobile bottom tab bar: the few places used most, plus a menu for the rest */}
      <nav aria-label={tt('Primary')} className="bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[color:var(--t-200)] shadow-[0_-2px_10px_rgba(15,23,42,0.08)]">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${barItems.length + 1}, minmax(0, 1fr))` }}>
          {barItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active && !mobileMenuOpen;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { setActiveView(item.view); setSelectedProfId(null); setMobileMenuOpen(false); window.scrollTo({ top: 0 }); }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full h-16 flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${isActive ? 'text-[color:var(--t-700)]' : 'text-slate-500'}`}
                >
                  <span className={`h-7 w-12 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-[color:var(--t-100)]' : ''}`}><Icon className="h-5 w-5" /></span>
                  <span className="max-w-full truncate px-1">{tt(item.label)}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-expanded={mobileMenuOpen}
              aria-current={moreActive ? 'page' : undefined}
              className={`w-full h-16 flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${moreActive ? 'text-[color:var(--t-700)]' : 'text-slate-500'}`}
            >
              <span className={`h-7 w-12 rounded-full flex items-center justify-center ${moreActive ? 'bg-[color:var(--t-100)]' : ''}`}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</span>
              <span>{mobileMenuOpen ? tt('Close') : tt('More')}</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ═══════════ STANDARDIZED APPLICATION FOOTER ═══════════ */}
      {/* The footer waits until the page has loaded, so it does not sit under the spinner */}
      {!loading && <Footer
        variant="app"
        navItems={navItems}
        activeView={activeView}
        onNavigateView={(viewId) => {
          setActiveView(viewId);
          setSelectedProfId(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={handleLogout}
      />}
    </div>
  );
}
