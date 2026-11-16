import React, { useState } from 'react';
import {
  Shield, Check, Eye, Send, CheckCircle2, X, LifeBuoy,
  Stethoscope, Briefcase, ShieldCheck, Wallet, BookOpen,
  LayoutGrid, Calendar, Radio, MessageSquare, Globe,
  Users, Award, TrendingUp, Star, SlidersHorizontal, BadgeCheck, Bookmark, HeartHandshake
} from 'lucide-react';
import { useTr, useLocale, dateLocaleOf } from '../locale';
import { Professional, Review, Booking, UserRole, VerificationStatus, ConsultationMode } from '../types';
import DashboardHeader, {
  BannerRow,
  BannerIdentity,
  BannerBadge,
  BannerKpis,
  bannerOnBrandPrimaryBtn,
  bannerOnBrandSecondaryBtn,
  type DashboardTab,
} from '../shared/ui/DashboardHeader';

export interface PractitionerHeroBannerProps<T extends string = string> {
  currentUser?: {
    role?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    profileId?: string | null;
    id?: string;
  } | null;
  professionals?: Professional[];
  reviews?: Review[];
  bookings?: Booking[];
  groupName?: string;
  tabs?: DashboardTab<T>[];
  activeTab?: T;
  onTabChange?: (tab: T) => void;
  activeSubTab?: string;
  onSubTabChange?: (subId: string) => void;
  tabsLabel?: string;
  onOpenHelp?: () => void;
  isHelpActive?: boolean;
}

/**
 * Unified User Information Hero Banner for Practitioner Portal and all practitioner dashboard views
 * (Clinical Care, Practice & Compliance, Performance & Profile, Clinical Shifts, Medical Library, Global Patient Services).
 */
export default function PractitionerHeroBanner<T extends string = string>({
  currentUser,
  professionals = [],
  reviews = [],
  bookings = [],
  groupName = 'Practitioner Workspace',
  tabs,
  activeTab,
  onTabChange,
  activeSubTab,
  onSubTabChange,
  tabsLabel,
  onOpenHelp,
  isHelpActive,
}: PractitionerHeroBannerProps<T>) {
  const tx = useTr();
  const { lang } = useLocale();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPublicProfilePreview, setShowPublicProfilePreview] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const helpActive = isHelpActive ?? (groupName === 'Help & Support');

  const handleHelpClick = () => {
    if (helpActive) return;
    if (onOpenHelp) {
      onOpenHelp();
    }
    window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }));
  };

  const helpRightNode = (
    <div className="flex items-center h-full">
      <span className="w-px h-5 bg-[color:var(--t-200)] mr-2 self-center hidden sm:inline-block" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        id="tab-practitioner-help"
        aria-selected={helpActive}
        onClick={handleHelpClick}
        className={`shrink-0 min-h-[40px] px-3.5 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
          helpActive
            ? 'font-semibold text-[color:var(--t-700)] bg-[color:var(--t-50)]'
            : 'font-medium text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]'
        }`}
        title={tx('Practitioner Help & Support Desk')}
      >
        <LifeBuoy className={`h-4 w-4 ${helpActive ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`} />
        <span className="whitespace-nowrap font-medium sm:font-semibold">{tx('Help & Support')}</span>
      </button>
    </div>
  );

  // Match profile from professionals by name or profileId
  const matchedProfile = professionals.find(p =>
    (currentUser?.name && p.name.toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser?.profileId && p.id === currentUser.profileId)
  );

  const fallbackProfile = {
    id: currentUser?.profileId || currentUser?.id || '—',
    name: currentUser?.name || 'Practitioner Account',
    avatar: currentUser?.avatarUrl || (currentUser?.role === 'nurse' ? '/assets/malaysian_female_nurse.jpg' : '/assets/malaysian_female_doctor.jpg'),
    role: currentUser?.role === 'nurse' ? UserRole.NURSE : UserRole.DOCTOR,
    specialization: currentUser?.role === 'nurse' ? 'Registered Nursing' : 'General Practice',
    licenseNumber: 'Pending Verification',
    medicalCouncil: currentUser?.role === 'nurse' ? 'Lembaga Jururawat Malaysia (LJM)' : 'Malaysian Medical Council (MMC)',
    experienceYears: 0,
    education: [],
    bio: 'Practitioner profile awaiting credential synchronization.',
    languages: ['English', 'Bahasa Melayu'],
    consultationModes: [ConsultationMode.VIDEO, ConsultationMode.IN_PERSON],
    fee: 0,
    rating: 0,
    reviewCount: 0,
    verificationStatus: VerificationStatus.PENDING,
    practiceAddress: '—',
    city: 'Kuala Lumpur',
    availability: {
      days: [],
      slots: [],
    },
    seoSlug: '',
  };

  const profile = matchedProfile || fallbackProfile;
  const isDoc = profile.role === UserRole.DOCTOR || (profile as any).category === 'Doctor';
  const isVerified = profile.verificationStatus === VerificationStatus.VERIFIED || (profile as any).verified === true;

  // Filter reviews and bookings for this professional
  const myReviews = reviews.filter(r => r.professionalId === profile.id || (r as any).doctorId === profile.id);
  const myBookings = bookings.filter(b => b.professionalId === profile.id || (b as any).doctorId === profile.id);
  const upcomingBookingsCount = myBookings.filter(b => b.status === 'Upcoming').length;
  const attendedBookings = myBookings.filter(b => b.status === 'Completed');
  const patientsAttendedCount = new Set(attendedBookings.map(b => b.patientId)).size;
  const avgOverall = myReviews.length > 0
    ? (myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length).toFixed(1)
    : (profile.rating > 0 ? profile.rating.toFixed(1) : null);

  const navigatePractitionerGroup = (groupKey: string, subId?: string) => {
    const viewMap: Record<string, string> = {
      clinical: 'onboard',
      recruitment: 'recruitment',
      practice: 'practice_compliance',
      performance: 'performance_profile',
      articles: 'articles',
    };
    try {
      if (subId) {
        if (groupKey === 'recruitment') sessionStorage.setItem('medcred_shifts_subtab', subId);
        else if (groupKey === 'articles') sessionStorage.setItem('medcred_library_subtab', subId);
        else sessionStorage.setItem('medcred_practitioner_subtab', subId);
      }
    } catch { /* ignore */ }
    if (activeTab === groupKey && subId && onSubTabChange) {
      onSubTabChange(subId);
      return;
    }
    if (onTabChange && !subId) {
      onTabChange(groupKey as T);
      return;
    }
    const targetView = viewMap[groupKey] || groupKey;
    window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: targetView }));
  };

  const defaultPractitionerTabs: DashboardTab<any>[] = [
    {
      id: 'clinical',
      label: tx('Patient Care'),
      icon: Stethoscope,
      count: upcomingBookingsCount || undefined,
      summary: tx('Daily clinical schedule, on-call dispatches, and patient messaging.'),
      cta: { label: tx('View Appointments'), onClick: () => navigatePractitionerGroup('clinical', 'bookings') },
      activeSubTab: activeTab === 'clinical' ? activeSubTab : undefined,
      onSubTabChange: (subId) => navigatePractitionerGroup('clinical', subId),
      subItems: [
        { id: 'home', label: tx('Overview'), description: tx('Today’s schedule, pending tasks & clinical summary'), icon: LayoutGrid },
        { id: 'bookings', label: tx('Appointments'), description: tx('Upcoming consultations, video visits & reschedules'), icon: Calendar, count: upcomingBookingsCount || undefined },
        { id: 'oncall', label: tx('On-Call Dispatch'), description: tx('Urgent house calls & live patient dispatch requests'), icon: Radio },
        { id: 'messages', label: tx('Messages'), description: tx('Encrypted clinical chat with patients & care teams'), icon: MessageSquare },
        { id: 'global', label: tx('Global Patients'), description: tx('Cross-border consults & MHTC medical travel cases'), icon: Globe },
        // Caregivers only: families ask them for home visits
        ...(matchedProfile && (matchedProfile as any).role === 'caregiver'
          ? [{ id: 'homecare', label: tx('Home Care Requests'), description: tx('Visit requests from families: accept, visit and leave a note'), icon: HeartHandshake }]
          : []),
      ],
    },
    {
      id: 'recruitment',
      label: tx('Shifts & Locums'),
      icon: Briefcase,
      summary: tx('Verified hospital shifts, locum roster, and work eligibility.'),
      cta: { label: tx('Browse Open Shifts'), onClick: () => navigatePractitionerGroup('recruitment', 'open') },
      activeSubTab: activeTab === 'recruitment' ? activeSubTab : undefined,
      onSubTabChange: (subId) => navigatePractitionerGroup('recruitment', subId),
      subItems: [
        { id: 'open', label: tx('Open Shifts'), description: tx('Browse verified locum & hospital shift vacancies'), icon: Briefcase },
        { id: 'applied', label: tx('My Applications'), description: tx('Track submitted shift bids & facility offers'), icon: CheckCircle2 },
        { id: 'locums', label: tx('Locum Roster'), description: tx('Confirmed shift calendar & clinic assignments'), icon: Users },
        { id: 'eligibility', label: tx('Work Eligibility'), description: tx('APC status, facility privileges & compliance checks'), icon: ShieldCheck },
      ],
    },
    {
      id: 'practice',
      label: tx('Licensing & CPD'),
      icon: ShieldCheck,
      summary: tx('MMC/LJM credentials, annual practicing certificates, and CPD points.'),
      cta: { label: tx('Review Licensing & APC'), onClick: () => navigatePractitionerGroup('practice', 'accreditation') },
      activeSubTab: activeTab === 'practice' ? activeSubTab : undefined,
      onSubTabChange: (subId) => navigatePractitionerGroup('practice', subId),
      subItems: [
        { id: 'accreditation', label: tx('Licensing & APC'), description: tx('MMC/LJM registration, APC renewal & credentials'), icon: ShieldCheck },
        { id: 'quality', label: tx('CPD & Quality'), description: tx('Continuing professional development & audit logs'), icon: Award },
      ],
    },
    {
      id: 'performance',
      label: tx('Earnings & Profile'),
      icon: Wallet,
      summary: tx('Consultation payouts, practice analytics, reviews, and settings.'),
      cta: { label: tx('View Earnings & Payouts'), onClick: () => navigatePractitionerGroup('performance', 'earnings') },
      activeSubTab: activeTab === 'performance' ? activeSubTab : undefined,
      onSubTabChange: (subId) => navigatePractitionerGroup('performance', subId),
      subItems: [
        { id: 'earnings', label: tx('Earnings & Payouts'), description: tx('Consultation fees, locum payouts & statements'), icon: Wallet },
        { id: 'analytics', label: tx('Practice Analytics'), description: tx('Patient volume, response times & utilization trends'), icon: TrendingUp },
        { id: 'reviews', label: tx('Patient Reviews'), description: tx('Verified patient ratings & clinical feedback'), icon: Star },
        { id: 'settings', label: tx('Profile & Settings'), description: tx('Public bio, availability, rates & account preferences'), icon: SlidersHorizontal },
      ],
    },
    {
      id: 'articles',
      label: tx('Medical Library'),
      icon: BookOpen,
      summary: tx('Peer-reviewed clinical guides, research papers, and bookmarks.'),
      cta: { label: tx('Browse Medical Library'), onClick: () => navigatePractitionerGroup('articles', 'all') },
      activeSubTab: activeTab === 'articles' ? activeSubTab : undefined,
      onSubTabChange: (subId) => navigatePractitionerGroup('articles', subId),
      subItems: [
        { id: 'all', label: tx('All Articles'), description: tx('Browse all peer-reviewed articles & bulletins'), icon: BookOpen },
        { id: 'practitioner', label: tx('Clinical Guides'), description: tx('Malaysian CPG protocols & prescribing guidance'), icon: ShieldCheck },
        { id: 'research', label: tx('Research Papers'), description: tx('Recent medical studies & evidence summaries'), icon: BadgeCheck },
        { id: 'saved', label: tx('Saved Articles'), description: tx('Bookmarked clinical references & reading list'), icon: Bookmark },
      ],
    },
  ];

  const resolvedTabs = tabs ?? (defaultPractitionerTabs as DashboardTab<T>[]);
  const handleDefaultTabChange = (grp: T) => {
    if (onTabChange) {
      onTabChange(grp);
      return;
    }
    navigatePractitionerGroup(String(grp));
  };

  return (
    <>
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 bg-[color:var(--dark)] text-white text-xs font-semibold px-4 py-3 rounded-none shadow-lg border border-slate-800 flex items-center gap-2 z-50 transition-colors duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <DashboardHeader
        tabs={resolvedTabs}
        activeTab={activeTab}
        onTabChange={handleDefaultTabChange}
        tabsLabel={tabsLabel || `${groupName} sections`}
        tabsRight={helpRightNode}
      >
        <BannerRow
          identity={
            <BannerIdentity
              name={profile.name}
              avatarUrl={profile.avatar}
              role={isDoc ? 'doctor' : 'nurse'}
              avatarBadge={isVerified && (
                <span
                  className="absolute -bottom-1 -right-1 bg-white text-[color:var(--t-600)] p-1.5 rounded-full shadow-md flex items-center justify-center border border-[color:var(--t-200)]"
                  title={tx('Verified Licensed Practitioner')}
                >
                  <Shield className="h-3.5 w-3.5 fill-current text-[color:var(--t-600)]" />
                </span>
              )}
              badges={
                <>
                  <BannerBadge>{isDoc ? tx('Physician Account') : tx('Nurse Account')}</BannerBadge>
                  {isVerified && (
                    <BannerBadge tone="success">
                      <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> {tx('Verified Active')}
                    </BannerBadge>
                  )}
                </>
              }
              meta={
                <>
                  <span className="font-extrabold text-[color:var(--ink)]">{tx(profile.specialization)}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono text-[color:var(--ink-2)]">{tx('{n} Years Exp.', { n: profile.experienceYears })}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono font-bold text-[color:var(--t-700)] bg-white px-2 py-0.5 border border-[color:var(--t-200)] text-2xs rounded-none shadow-2xs">
                    {profile.licenseNumber}
                  </span>
                  {((profile as any).apcExpiry || (profile as any).licenseExpiry) && (
                    <>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-mono text-[color:var(--ink-2)] text-xs font-semibold">
                        {tx('APC:')} {new Date((profile as any).apcExpiry || (profile as any).licenseExpiry).toLocaleDateString(dateLocaleOf(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </>
                  )}
                </>
              }
            />
          }
          aside={
            <>
              <BannerKpis items={[
                { value: patientsAttendedCount, label: tx('Patients') },
                { value: upcomingBookingsCount, label: tx('Upcoming') },
                { value: avgOverall ?? '—', label: tx('Rating') },
              ]} />
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => setShowPublicProfilePreview(true)} className={bannerOnBrandPrimaryBtn}>
                  <Eye className="h-4 w-4" />
                  <span>{tx('View Public Profile')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/verify-practitioners?q=${encodeURIComponent(profile.id)}`);
                    showToast(tx('Profile link copied to clipboard!'));
                  }}
                  className={bannerOnBrandSecondaryBtn}
                >
                  <Send className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>{tx('Share Link')}</span>
                </button>
              </div>
            </>
          }
        />
      </DashboardHeader>

      {/* Full-screen Public Profile Preview Modal */}
      {showPublicProfilePreview && (
        <div role="dialog" aria-modal="true" aria-labelledby="practitioner-profile-preview-title" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onKeyDown={(e) => e.key === "Escape" && setShowPublicProfilePreview(false)}>
          <div className="bg-white rounded-none max-w-lg w-full p-6 sm:p-8 border border-[color:var(--t-600)] shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowPublicProfilePreview(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={tx('Close modal')}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-3">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-[color:var(--t-600)]/20 shadow-md mx-auto"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 id="practitioner-profile-preview-title" className="font-sans text-xl font-black text-slate-900">{profile.name}</h3>
                  {isVerified && <Shield className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500" />}
                </div>
                <p className="text-xs font-bold text-[color:var(--t-600)] uppercase tracking-widest">{tx(profile.specialization)}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="bg-slate-50 border border-slate-100 rounded-none p-4 space-y-1.5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{tx('Clinical Philosophy')}</span>
                <p className="text-slate-700 leading-relaxed italic whitespace-pre-line">{profile.bio || tx('Patient-centered evidence-based clinical practice.')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-none p-4">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{tx('Registration ID')}</span>
                  <strong className="text-slate-800 font-extrabold">{profile.id}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-none p-4">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{tx('Consultation Fee')}</span>
                  <strong className="text-slate-800 font-extrabold">RM {profile.fee || 150}</strong>
                </div>
              </div>

              {(profile as any).certifications && (profile as any).certifications.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">{tx('Verified Clinical Credentials')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {((profile as any).certifications as string[]).map(cert => (
                      <span key={cert} className="bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-2xs font-bold px-2.5 py-1 rounded-none">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">{tx('Clinical Center Address')}</span>
                <p className="text-slate-800 font-bold">{profile.practiceAddress || tx('Beach Specialist Center')}, {profile.city || tx('Kuala Lumpur')}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPublicProfilePreview(false)}
                className="w-full py-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black rounded-none transition-colors shadow-md cursor-pointer"
              >
                {tx('Close Public Profile Preview')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
