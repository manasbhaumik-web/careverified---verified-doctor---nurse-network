import React, { useState } from 'react';
import { Shield, Check, Eye, Send, CheckCircle2, X, LifeBuoy } from 'lucide-react';
import { Professional, Review, Booking, UserRole, VerificationStatus, ConsultationMode } from '../types';
import DashboardHeader, {
  BannerRow,
  BannerIdentity,
  BannerBadge,
  BannerKpis,
  bannerOnBrandPrimaryBtn,
  bannerOnBrandSecondaryBtn,
  type DashboardTab,
} from './DashboardHeader';

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
  tabsLabel,
  onOpenHelp,
  isHelpActive,
}: PractitionerHeroBannerProps<T>) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPublicProfilePreview, setShowPublicProfilePreview] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const helpActive = isHelpActive ?? (groupName === 'Help & Support');

  const handleHelpClick = () => {
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
        className={`shrink-0 min-h-[48px] px-3.5 sm:px-4 text-[13px] flex items-center gap-2 cursor-pointer border-b transition-colors ${
          helpActive
            ? 'font-semibold text-[color:var(--t-700)] border-[color:var(--t-600)] bg-[color:var(--t-50)]/60'
            : 'font-medium text-[color:var(--ink-2)] border-transparent hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]'
        }`}
        title="Practitioner Help & Support Desk"
      >
        <LifeBuoy className={`h-4 w-4 ${helpActive ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`} />
        <span className="whitespace-nowrap font-medium sm:font-semibold">Help & Support</span>
      </button>
    </div>
  );

  // Match profile from professionals by name or profileId
  const matchedProfile = professionals.find(p =>
    (currentUser?.name && p.name.toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser?.profileId && p.id === currentUser.profileId)
  );

  const fallbackProfile: Professional = {
    id: currentUser?.profileId || currentUser?.id || 'DOC-DEMO',
    name: currentUser?.name || 'Practitioner Account',
    avatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250',
    role: UserRole.DOCTOR,
    specialization: 'General Practice & Telemedicine',
    licenseNumber: 'MMC-ACTIVE',
    medicalCouncil: 'Malaysian Medical Council (MMC)',
    experienceYears: 10,
    education: ['MBBS (UM)'],
    bio: 'Licensed healthcare professional verified by the Malaysian Medical Board.',
    languages: ['English', 'Bahasa Melayu'],
    consultationModes: [ConsultationMode.VIDEO, ConsultationMode.IN_PERSON],
    fee: 150,
    rating: 5.0,
    reviewCount: 1,
    verificationStatus: VerificationStatus.VERIFIED,
    practiceAddress: 'Beach Specialist Center',
    city: 'Kuala Lumpur',
    availability: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slots: ['09:00 AM', '10:00 AM', '02:00 PM', '04:00 PM'],
    },
    seoSlug: 'dr-practitioner',
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
    : (profile.rating ? profile.rating.toFixed(1) : '5.0');

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[color:var(--dark)] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-bounce z-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      <DashboardHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabsLabel={tabsLabel || `${groupName} sections`}
        tabsRight={helpRightNode}
      >
        <BannerRow
          identity={
            <BannerIdentity
              name={profile.name}
              avatarUrl={profile.avatar}
              avatarBadge={isVerified && (
                <span
                  className="absolute -bottom-1 -right-1 bg-white text-[color:var(--t-600)] p-1.5 rounded-full shadow-md flex items-center justify-center border border-[color:var(--t-200)]"
                  title="Verified Licensed Practitioner"
                >
                  <Shield className="h-3.5 w-3.5 fill-current text-[color:var(--t-600)]" />
                </span>
              )}
              badges={
                <>
                  {groupName && <BannerBadge tone="brand">{groupName}</BannerBadge>}
                  <BannerBadge>{isDoc ? "Physician Account" : "Nurse Account"}</BannerBadge>
                  {isVerified && (
                    <BannerBadge tone="success">
                      <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> Verified Active
                    </BannerBadge>
                  )}
                </>
              }
              meta={
                <>
                  <span className="font-extrabold text-[color:var(--ink)]">{profile.specialization}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono text-[color:var(--ink-2)]">{profile.experienceYears} Years Exp.</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono font-bold text-[color:var(--t-700)] bg-white px-2 py-0.5 border border-[color:var(--t-200)] text-[10px] rounded-none shadow-2xs">
                    {profile.licenseNumber}
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono text-slate-700 text-[10px] bg-white px-1.5 py-0.5 border border-slate-200 rounded-none">
                    ID: {profile.id}
                  </span>
                  {isVerified && <span className="text-slate-400">&bull;</span>}
                  {isVerified && (
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Verified by the medical board
                    </span>
                  )}
                  {((profile as any).apcExpiry || (profile as any).licenseExpiry) && (
                    <>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-mono text-[color:var(--ink-2)] text-[11px] font-semibold">
                        APC: {new Date((profile as any).apcExpiry || (profile as any).licenseExpiry).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                { value: patientsAttendedCount, label: 'Patients' },
                { value: upcomingBookingsCount, label: 'Upcoming' },
                { value: avgOverall ?? '5.0', label: 'Rating' },
              ]} />
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => setShowPublicProfilePreview(true)} className={bannerOnBrandPrimaryBtn}>
                  <Eye className="h-4 w-4" />
                  <span>View Public Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://medicert.com/practitioner/${profile.id}`);
                    showToast("Profile link copied to clipboard!");
                  }}
                  className={bannerOnBrandSecondaryBtn}
                >
                  <Send className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                  <span>Share Link</span>
                </button>
              </div>
            </>
          }
        />
      </DashboardHeader>

      {/* Full-screen Public Profile Preview Modal */}
      {showPublicProfilePreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowPublicProfilePreview(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
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
                  <h3 className="font-sans text-xl font-semibold text-slate-900">{profile.name}</h3>
                  {isVerified && <Shield className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500" />}
                </div>
                <p className="text-xs font-bold text-[color:var(--t-600)] uppercase tracking-widest">{profile.specialization}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clinical Philosophy</span>
                <p className="text-slate-700 leading-relaxed italic whitespace-pre-line">{profile.bio || "Patient-centered evidence-based clinical practice."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Registration ID</span>
                  <strong className="text-slate-800 font-extrabold">{profile.id}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Consultation Fee</span>
                  <strong className="text-slate-800 font-extrabold">RM {profile.fee || 150}</strong>
                </div>
              </div>

              {(profile as any).certifications && (profile as any).certifications.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Verified Clinical Credentials</span>
                  <div className="flex flex-wrap gap-1.5">
                    {((profile as any).certifications as string[]).map(cert => (
                      <span key={cert} className="bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-[10px] font-bold px-2.5 py-1 rounded-md">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Clinical Center Address</span>
                <p className="text-slate-800 font-bold">{profile.practiceAddress || "Beach Specialist Center"}, {profile.city || "Kuala Lumpur"}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPublicProfilePreview(false)}
                className="w-full py-3 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
              >
                Close Public Profile Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
