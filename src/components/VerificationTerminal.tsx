import { expiryLabel } from '../registries';
import ClinicalWorkspace from './ClinicalWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  Award, FileText, Loader, 
  CheckCircle2, AlertCircle, Edit, Shield, ShieldCheck, MessageSquare, 
  X, Send, Check, Calendar, TrendingUp, Eye, LayoutGrid, Wallet, Radio,
  Star, SlidersHorizontal, Globe
} from 'lucide-react';
import { UserRole, DoctorProfile, NurseProfile, Review, VerificationStatus, Booking, OnCallDispatch } from '../types';
import PractitionerOverviewTab from './practitioner/PractitionerOverviewTab';
import PractitionerAccreditationTab from './practitioner/PractitionerAccreditationTab';
import PractitionerBookingsTab from './practitioner/PractitionerBookingsTab';
import PractitionerFeedbackTab from './practitioner/PractitionerFeedbackTab';
import PractitionerAnalyticsTab from './practitioner/PractitionerAnalyticsTab';
import PractitionerSettingsTab from './practitioner/PractitionerSettingsTab';
import PractitionerEarnings from './PractitionerEarnings';
import PractitionerOnCall from './PractitionerOnCall';
import PractitionerQuality from './PractitionerQuality';
import SecureMessenger from './SecureMessenger';
import TourismDesk from './TourismDesk';
import PractitionerHeroBanner from './PractitionerHeroBanner';
import DashboardHeader, { BannerRow, BannerIdentity, BannerBadge, BannerKpis, bannerOnBrandPrimaryBtn, bannerOnBrandSecondaryBtn } from './DashboardHeader';
import PageBanner from './PageBanner';

export type PractitionerDashboardTab = 'home' | 'bookings' | 'oncall' | 'messages' | 'global' | 'earnings' | 'quality' | 'accreditation' | 'reviews' | 'analytics' | 'settings';
export type PractitionerTabGroup = 'clinical' | 'practice' | 'performance';

export const PRACTITIONER_GROUPS: Record<PractitionerTabGroup, {
  name: string;
  defaultTab: PractitionerDashboardTab;
  tabs: { id: PractitionerDashboardTab; label: string; icon: any }[];
}> = {
  clinical: {
    name: 'Clinical Care',
    defaultTab: 'home',
    tabs: [
      { id: 'home', label: 'Overview', icon: LayoutGrid },
      { id: 'bookings', label: 'Bookings', icon: Calendar },
      { id: 'oncall', label: 'On Call', icon: Radio },
      { id: 'messages', label: 'Mailbox', icon: MessageSquare },
      { id: 'global', label: 'Global Patients', icon: Globe },
    ],
  },
  practice: {
    name: 'Practice & Compliance',
    defaultTab: 'earnings',
    tabs: [
      { id: 'earnings', label: 'Earnings', icon: Wallet },
      { id: 'quality', label: 'Quality & CPD', icon: Award },
      { id: 'accreditation', label: 'Accreditation', icon: ShieldCheck },
    ],
  },
  performance: {
    name: 'Performance & Profile',
    defaultTab: 'reviews',
    tabs: [
      { id: 'reviews', label: 'Feedback', icon: Star },
      { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
};

interface VerificationTerminalProps {
  currentUser?: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string; profileId?: string | null; id?: string } | null;
  professionals?: (DoctorProfile | NurseProfile)[];
  reviews?: Review[];
  bookings?: Booking[];
  onRefreshData?: () => void;
  initialTab?: PractitionerDashboardTab;
  activeGroup?: PractitionerTabGroup;
  onOpenHelp?: () => void;
}

export default function VerificationTerminal({ 
  currentUser, 
  professionals = [], 
  reviews = [], 
  bookings = [], 
  onRefreshData,
  initialTab,
  activeGroup,
  onOpenHelp,
}: VerificationTerminalProps) {
  // Try to match logged in practitioner with an existing registry profile
  const matchedProfile = professionals.find(p => 
    p.name.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  // Track currently active group and ensure the active tab belongs to the active group
  const currentGroup: PractitionerTabGroup = activeGroup || (
    initialTab ? (
      (['earnings', 'quality', 'accreditation'].includes(initialTab)) ? 'practice' :
      (['reviews', 'analytics', 'settings'].includes(initialTab)) ? 'performance' : 'clinical'
    ) : 'clinical'
  );

  // Dashboard state variables (for registered practitioner)
  const [activeDashboardTab, setActiveDashboardTab] = useState<PractitionerDashboardTab>(
    initialTab || PRACTITIONER_GROUPS[currentGroup].defaultTab
  );

  useEffect(() => {
    if (activeGroup) {
      const allowed = PRACTITIONER_GROUPS[activeGroup].tabs.map(t => t.id);
      if (!allowed.includes(activeDashboardTab)) {
        setActiveDashboardTab(initialTab && allowed.includes(initialTab) ? initialTab : PRACTITIONER_GROUPS[activeGroup].defaultTab);
      }
    } else if (initialTab) {
      setActiveDashboardTab(initialTab);
    }
  }, [activeGroup, initialTab]);

  const [editBio, setEditBio] = useState('');
  const [editFee, setEditFee] = useState(0);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');

  // Profile Hub Custom States
  const [certifications, setCertifications] = useState<string[]>(['Neonatal Care', 'Immunization']);
  const [newCert, setNewCert] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPublicProfilePreview, setShowPublicProfilePreview] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };
  
  // Availability Editing States
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState('');

  // Emergency Dispatch States
  const [dispatches, setDispatches] = useState<OnCallDispatch[]>([]);

  // E-Prescription State
  const [selectedBookingForPrescribe, setSelectedBookingForPrescribe] = useState<Booking | null>(null);
  const [prescribeDiagnosis, setPrescribeDiagnosis] = useState('');
  const [prescribeMeds, setPrescribeMeds] = useState('');
  const [prescribeInstructions, setPrescribeInstructions] = useState('');
  const [issuingPrescription, setIssuingPrescription] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Review Replies Map
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyingMap, setReplyingMap] = useState<Record<string, boolean>>({});
  const [replyExpandedId, setReplyExpandedId] = useState<string | null>(null);

  // Form State (for new registrations)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [name, setName] = useState(currentUser?.name || '');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [specialization, setSpecialization] = useState('Cardiologist');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('Malaysian Medical Council (MMC)');
  const [registryId, setRegistryId] = useState<string>('MMC');
  const [registrationType, setRegistrationType] = useState<string>('full');
  const [specialistRegNo, setSpecialistRegNo] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [education, setEducation] = useState('');
  const [bio, setBio] = useState('');
  const [fee, setFee] = useState('');
  const [city, setCity] = useState('Kuala Lumpur');
  const [practiceAddress, setPracticeAddress] = useState('');
  const [fileAttached, setFileAttached] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState('');

  // Load and Sync Emergency Dispatches from localStorage
  useEffect(() => {
    const loadDispatches = () => {
      try {
        const saved = localStorage.getItem('medi_dispatches');
        if (saved) {
          setDispatches(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error loading dispatches in VerificationTerminal:", e);
      }
    };
    loadDispatches();

    // Set up a small interval to poll local storage changes for emergency simulation
    const interval = setInterval(loadDispatches, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update edit values when matched profile is loaded
  useEffect(() => {
    if (matchedProfile) {
      setEditBio(matchedProfile.bio);
      setEditFee(matchedProfile.fee);
      setEditAddress(matchedProfile.practiceAddress);
      setEditCity(matchedProfile.city);
      setEditDays(matchedProfile.availability?.days || []);
      setEditSlots(matchedProfile.availability?.slots || []);
    }
  }, [matchedProfile?.id]);

  const handleFileUploadSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 5 * 1024 * 1024) {
        setSubmitError('File is larger than 5 MB.');
        return;
      }
      setSubmitError('');
      setFileObj(f);
      setFileAttached(f.name);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          specialization,
          licenseNumber,
          licenseExpiry,
          medicalCouncil,
          registryId,
          registrationType,
          specialistRegNo,
          experienceYears: Number(experienceYears),
          education: [education],
          bio,
          languages: ["Malay", "English", "Mandarin", "Tamil"],
          consultationModes: ["In-person", "Video Telehealth"],
          fee: Number(fee),
          practiceAddress,
          city,
          avatar: role === UserRole.DOCTOR 
            ? "/assets/malaysian_female_doctor.jpg"
            : "/assets/malaysian_female_nurse.jpg"
        })
      });

      const data = await response.json();
      if (data.status !== 'success') {
        setSubmitError(data.message || 'Registration failed.');
        return;
      }

      // Upload the certificate against the new verification request
      if (fileObj) {
        const form = new FormData();
        form.append('file', fileObj);
        form.append('kind', 'degree');
        form.append('verificationRequestId', data.data.verificationRequestId);
        const up = await fetch('/api/documents', { method: 'POST', body: form });
        const upData = await up.json();
        if (upData.status !== 'success') {
          setSubmitError(upData.message || 'Profile saved, but the certificate upload failed.');
          return;
        }
      }
      setSuccess(data.data);
      setStep(4);
      if (onRefreshData) onRefreshData();
    } catch (error) {
      console.error(error);
      setSubmitError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedProfile) return;
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      const response = await fetch(`/api/professionals/${matchedProfile.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: editBio,
          fee: Number(editFee),
          practiceAddress: editAddress,
          city: editCity,
          availability: {
            days: editDays,
            slots: editSlots
          }
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setSettingsSuccess(true);
        if (onRefreshData) onRefreshData();
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving practitioner settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePublishReply = async (reviewId: string) => {
    const replyText = replyTextMap[reviewId];
    if (!replyText?.trim()) return;

    setReplyingMap(prev => ({ ...prev, [reviewId]: true }));
    try {
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setReplyExpandedId(null);
        // Clear text field
        setReplyTextMap(prev => ({ ...prev, [reviewId]: '' }));
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error("Error replying to review:", err);
    } finally {
      setReplyingMap(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleUpdateDispatchStatus = (dispatchId: string, nextStatus: 'En-Route' | 'Arrived' | 'Completed') => {
    if (!matchedProfile) return;
    try {
      const saved = localStorage.getItem('medi_dispatches');
      if (saved) {
        const list: OnCallDispatch[] = JSON.parse(saved);
        const index = list.findIndex(d => d.id === dispatchId);
        if (index !== -1) {
          list[index].dispatchStatus = nextStatus;
          if (nextStatus === 'En-Route') {
            list[index].doctorId = matchedProfile.id;
            list[index].doctorName = matchedProfile.name;
            list[index].doctorAvatar = matchedProfile.avatar;
            list[index].etaMinutes = 15;
          } else if (nextStatus === 'Arrived') {
            list[index].etaMinutes = 0;
          } else if (nextStatus === 'Completed') {
            list[index].etaMinutes = 0;
          }
          localStorage.setItem('medi_dispatches', JSON.stringify(list));
          setDispatches(list);
        }
      }
    } catch (e) {
      console.error("Error updating dispatch status:", e);
    }
  };

  // --- 1. RENDER PORTAL DASHBOARD FOR REGISTERED PRACTITIONERS ---
  if (matchedProfile) {
    const isDoc = matchedProfile.role === UserRole.DOCTOR;
    const isVerified = matchedProfile.verificationStatus === VerificationStatus.VERIFIED;
    const isPending = matchedProfile.verificationStatus === VerificationStatus.PENDING;
    const isRejected = matchedProfile.verificationStatus === VerificationStatus.REJECTED;

    // Filter reviews specifically left for this professional
    const myReviews = reviews.filter(r => r.professionalId === matchedProfile.id);
    const myBookings = bookings.filter(b => b.professionalId === matchedProfile.id);
    const upcomingBookingsCount = myBookings.filter(b => b.status === 'Upcoming').length;

    // Compute dynamic rating sub-dimension metrics
    const hasReviews = myReviews.length > 0;
    const avgComm = hasReviews
      ? (myReviews.reduce((sum, r) => sum + (r.communication || r.rating), 0) / myReviews.length).toFixed(1)
      : "5.0";
    const avgPunct = hasReviews
      ? (myReviews.reduce((sum, r) => sum + (r.punctuality || r.rating), 0) / myReviews.length).toFixed(1)
      : "5.0";
    const avgSatis = hasReviews
      ? (myReviews.reduce((sum, r) => sum + (r.satisfaction || r.rating), 0) / myReviews.length).toFixed(1)
      : "5.0";
    const avgOverall = hasReviews
      ? (myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length).toFixed(1)
      : null;

    // Overview tab derived data
    const attendedBookings = myBookings.filter(b => b.status === 'Completed');
    const patientsAttendedCount = new Set(attendedBookings.map(b => b.patientId)).size;
    const completedDispatchesCount = dispatches.filter(d => d.doctorId === matchedProfile.id && d.dispatchStatus === 'Completed').length;
    const pendingDispatchesCount = dispatches.filter(d => d.dispatchStatus !== 'Completed').length;
    const nextUpcomingBooking = myBookings
      .filter(b => b.status === 'Upcoming')
      .sort((a, b) => new Date(`${a.date} ${a.timeSlot}`).getTime() - new Date(`${b.date} ${b.timeSlot}`).getTime())[0];

    const currentGroupTabs = PRACTITIONER_GROUPS[currentGroup].tabs.map(tab => ({
      ...tab,
      count: tab.id === 'bookings' ? upcomingBookingsCount : undefined,
    }));

    const dashboardTabOrder: PractitionerDashboardTab[] = currentGroupTabs.map(t => t.id);
    const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = dashboardTabOrder.indexOf(activeDashboardTab);
      let nextIndex = currentIndex;
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % dashboardTabOrder.length;
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + dashboardTabOrder.length) % dashboardTabOrder.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = dashboardTabOrder.length - 1;
      else return;
      e.preventDefault();
      setActiveDashboardTab(dashboardTabOrder[nextIndex]);
    };

    return (
      <div className="w-full space-y-0" id="practitioner-dashboard-root">
        {/* Absolute Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-[color:var(--dark)] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-slate-850 flex items-center gap-2 animate-bounce z-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        <PractitionerHeroBanner
          currentUser={currentUser}
          professionals={professionals}
          reviews={reviews}
          bookings={bookings}
          groupName={PRACTITIONER_GROUPS[currentGroup].name}
          tabs={currentGroupTabs}
          activeTab={activeDashboardTab}
          onTabChange={setActiveDashboardTab}
          tabsLabel={`${PRACTITIONER_GROUPS[currentGroup].name} sections`}
          onOpenHelp={onOpenHelp}
        />

          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            


              
              {/* Merged Banner Greeting */}
              <div className="hidden">
                <h3 className="font-sans text-2xl font-semibold text-slate-900 tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
                    return `${greeting}, ${matchedProfile.name}.`;
                  })()}
                </h3>
                <span className="text-[11px] font-mono font-semibold text-slate-400 tabular-nums">
                  {new Date().toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {activeDashboardTab === 'home' && (
                <PractitionerOverviewTab
                  matchedProfile={matchedProfile}
                  isDoc={isDoc}
                  isVerified={isVerified}
                  isPending={isPending}
                  nextUpcomingBooking={nextUpcomingBooking}
                  pendingDispatchesCount={pendingDispatchesCount}
                  patientsAttendedCount={patientsAttendedCount}
                  upcomingBookingsCount={upcomingBookingsCount}
                  completedDispatchesCount={completedDispatchesCount}
                  avgOverall={avgOverall}
                  onViewBookings={() => setActiveDashboardTab('bookings')}
                />
              )}

        {/* TAB CONTENT: ACCREDITATION OVERVIEW */}
        {activeDashboardTab === 'accreditation' && (
          <PractitionerAccreditationTab
            matchedProfile={matchedProfile}
            isVerified={isVerified}
            isPending={isPending}
            isDoc={isDoc}
            onRefreshData={onRefreshData}
          />
        )}

        {/* TAB CONTENT: MANAGE PUBLIC REGISTRY FILE */}
        {activeDashboardTab === 'settings' && (
          <PractitionerSettingsTab
            matchedProfile={matchedProfile}
            isVerified={isVerified}
            isDoc={isDoc}
            avgOverall={avgOverall}
            reviewCount={myReviews.length}
            editBio={editBio}
            setEditBio={setEditBio}
            editFee={editFee}
            setEditFee={setEditFee}
            editAddress={editAddress}
            setEditAddress={setEditAddress}
            editCity={editCity}
            setEditCity={setEditCity}
            certifications={certifications}
            setCertifications={setCertifications}
            newCert={newCert}
            setNewCert={setNewCert}
            editDays={editDays}
            setEditDays={setEditDays}
            editSlots={editSlots}
            setEditSlots={setEditSlots}
            newTimeSlot={newTimeSlot}
            setNewTimeSlot={setNewTimeSlot}
            savingSettings={savingSettings}
            settingsSuccess={settingsSuccess}
            onSubmit={handleSaveSettings}
            showToast={showToast}
          />
        )}

        {/* TAB CONTENT: REVIEW REPLIES LEDGER */}
        {activeDashboardTab === 'reviews' && (
          <PractitionerFeedbackTab
            myReviews={myReviews}
            hasReviews={hasReviews}
            avgOverall={avgOverall}
            avgComm={avgComm}
            avgPunct={avgPunct}
            avgSatis={avgSatis}
            replyTextMap={replyTextMap}
            replyingMap={replyingMap}
            replyExpandedId={replyExpandedId}
            onStartReply={(reviewId) => {
              setReplyExpandedId(reviewId);
              setReplyTextMap(prev => ({ ...prev, [reviewId]: '' }));
            }}
            onCancelReply={() => setReplyExpandedId(null)}
            onReplyTextChange={(reviewId, text) => setReplyTextMap(prev => ({ ...prev, [reviewId]: text }))}
            onPublishReply={handlePublishReply}
          />
        )}

        {/* TAB CONTENT: BOOKINGS & EMERGENCY DISPATCHES */}
        {activeDashboardTab === 'bookings' && (
          <PractitionerBookingsTab
            matchedProfile={matchedProfile}
            isDoc={isDoc}
            myBookings={myBookings}
            dispatches={dispatches}
            selectedBookingForPrescribe={selectedBookingForPrescribe}
            onStartPrescription={(booking) => {
              setSelectedBookingForPrescribe(booking);
              setPrescribeDiagnosis('');
              setPrescribeMeds('');
              setPrescribeInstructions('');
            }}
            onCancelPrescription={() => setSelectedBookingForPrescribe(null)}
            prescribeDiagnosis={prescribeDiagnosis}
            setPrescribeDiagnosis={setPrescribeDiagnosis}
            prescribeMeds={prescribeMeds}
            setPrescribeMeds={setPrescribeMeds}
            prescribeInstructions={prescribeInstructions}
            setPrescribeInstructions={setPrescribeInstructions}
            issuingPrescription={issuingPrescription}
            onSubmitPrescription={(e) => {
              e.preventDefault();
              if (!selectedBookingForPrescribe) return;
              setIssuingPrescription(true);
              setTimeout(() => {
                selectedBookingForPrescribe.prescription = {
                  diagnosis: prescribeDiagnosis,
                  medicines: prescribeMeds,
                  instructions: prescribeInstructions,
                  issuedAt: new Date().toISOString(),
                  digitalSignature: `MMC-SIG-${Date.now().toString(36).toUpperCase()}`
                };
                selectedBookingForPrescribe.status = 'Completed';
                setIssuingPrescription(false);
                setSelectedBookingForPrescribe(null);
                showToast("Doctor E-Prescription issued and digitally signed!");
                if (onRefreshData) onRefreshData();
              }, 400);
            }}
            onUpdateDispatchStatus={handleUpdateDispatchStatus}
          />
        )}

        {/* TAB CONTENT: ON CALL TELEHEALTH RADAR & ROSTER */}
        {activeDashboardTab === 'oncall' && (
          <div id="panel-oncall" role="tabpanel" aria-labelledby="tab-oncall" tabIndex={0} className="space-y-6 animate-fade-in">
            <PractitionerOnCall myUserId={currentUser?.id || matchedProfile.id} embedded={true} />
          </div>
        )}

        {/* TAB CONTENT: SECURE MAILBOX & PATIENT CHATS */}
        {activeDashboardTab === 'messages' && (
          <div id="panel-messages" role="tabpanel" aria-labelledby="tab-messages" tabIndex={0} className="space-y-6 animate-fade-in">
            <SecureMessenger currentUserId={currentUser?.profileId || currentUser?.id || matchedProfile.id} embedded={true} />
          </div>
        )}

        {/* TAB CONTENT: GLOBAL PATIENTS & CROSS-BORDER SERVICES */}
        {activeDashboardTab === 'global' && (
          <div id="panel-global" role="tabpanel" aria-labelledby="tab-global" tabIndex={0} className="space-y-6 animate-fade-in">
            <TourismDesk
              isAdmin={currentUser?.role === 'admin'}
              embedded={true}
              currentUser={currentUser}
              professionals={professionals}
              reviews={reviews}
              bookings={bookings}
            />
          </div>
        )}

        {/* TAB CONTENT: PRACTITIONER EARNINGS & DIRECT BANK PAYOUTS */}
        {activeDashboardTab === 'earnings' && (
          <div id="panel-earnings" role="tabpanel" aria-labelledby="tab-earnings" tabIndex={0} className="space-y-6 animate-fade-in">
            <PractitionerEarnings embedded={true} />
          </div>
        )}

        {/* TAB CONTENT: QUALITY, CPD & PEER REVIEW HUB */}
        {activeDashboardTab === 'quality' && (
          <div id="panel-quality" role="tabpanel" aria-labelledby="tab-quality" tabIndex={0} className="space-y-6 animate-fade-in">
            <PractitionerQuality profileId={matchedProfile.id || currentUser?.profileId || null} embedded={true} />
          </div>
        )}

        {/* TAB CONTENT: PERFORMANCE & REVENUE */}
        {activeDashboardTab === 'analytics' && (
          <PractitionerAnalyticsTab
            matchedProfile={matchedProfile}
            myBookings={myBookings}
            dispatches={dispatches}
            avgOverall={avgOverall}
            reviewCount={myReviews.length}
          />
        )}

            {/* Full-screen Public Profile Preview Modal */}
            {showPublicProfilePreview && (
              <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-150 shadow-2xl relative space-y-6">
                  
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setShowPublicProfilePreview(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer animate-fade-in"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="text-center space-y-3">
                    <img
                      src={matchedProfile.avatar}
                      alt={matchedProfile.name}
                      className="h-24 w-24 rounded-full object-cover border-4 border-[color:var(--t-600)]/20 shadow-md mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <h3 className="font-sans text-xl font-semibold text-slate-900">{matchedProfile.name}</h3>
                        {isVerified && <Shield className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500" />}
                      </div>
                      <p className="text-xs font-bold text-[color:var(--t-600)] uppercase tracking-widest">{matchedProfile.specialization}</p>
                    </div>
                  </div>

                  {/* Bio & Details */}
                  <div className="space-y-4 text-xs font-semibold text-slate-600">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Clinical Philosophy</span>
                      <p className="text-slate-700 leading-relaxed italic whitespace-pre-line">{editBio || "No description provided."}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Registration ID</span>
                        <strong className="text-slate-800 font-extrabold">{matchedProfile.id}</strong>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Co-Pay / Hourly Fee</span>
                        <strong className="text-slate-800 font-extrabold">RM {editFee}</strong>
                      </div>
                    </div>

                    {certifications.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Verified Clinical Credentials</span>
                        <div className="flex flex-wrap gap-1.5">
                          {certifications.map(cert => (
                            <span key={cert} className="bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-[10px] font-bold px-2.5 py-1 rounded-md">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Clinical Center Address</span>
                      <p className="text-slate-800 font-bold">{editAddress || "Beach Specialist Center"}, {editCity}</p>
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



        </div>
      </div>
    );
  }

  // --- 2. RENDER THE MULTI-STEP REGISTRATION WIZARD FOR UNREGISTERED USERS ---
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 max-w-3xl mx-auto" id="verification-terminal-wizard">
      <PageBanner
        eyebrow="Licensed Practitioners"
        title="National Credential Onboarding"
        description="Register as a licensed physician or certified registered nurse."
        className="mb-6"
      />

      {/* Premium Stepped Progress Guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mb-6 space-y-3 shadow-3xs select-none">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Award className="h-4 w-4 text-[color:var(--t-600)]" />
            Onboarding Progress Guide
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Step {step > 3 ? 3 : step} of 3</span>
        </div>
        
        <div className="flex items-center justify-between relative">
          {/* Step 1 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 1 
                ? 'bg-[color:var(--t-600)] border border-[color:var(--t-600)] text-white shadow-3xs' 
                : step === 1 
                  ? 'bg-white border-2 border-[color:var(--t-600)] text-[color:var(--t-600)] ring-4 ring-[color:var(--t-600)]/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 1 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">1</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 1 ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`}>Professional Info</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 transition-all ${step > 1 ? 'bg-[color:var(--t-600)]' : 'bg-slate-200'}`}></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 2 
                ? 'bg-[color:var(--t-600)] border border-[color:var(--t-600)] text-white shadow-3xs' 
                : step === 2 
                  ? 'bg-white border-2 border-[color:var(--t-600)] text-[color:var(--t-600)] ring-4 ring-[color:var(--t-600)]/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 2 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">2</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 2 ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`}>Licensing Credentials</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 transition-all ${step > 2 ? 'bg-[color:var(--t-600)]' : 'bg-slate-200'}`}></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 3
                ? 'bg-[color:var(--t-600)] border border-[color:var(--t-600)] text-white shadow-3xs'
                : step === 3 
                  ? 'bg-white border-2 border-[color:var(--t-600)] text-[color:var(--t-600)] ring-4 ring-[color:var(--t-600)]/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 3 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">3</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 3 ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`}>Certificate Upload</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Basic professional description */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Professional Title & Name</label>
              <input
                type="text"
                placeholder="Dr. Ahmad Ridzuan / Sister Nurul Ain"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-750"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Medical Category</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as any);
                  setSpecialization(e.target.value === UserRole.DOCTOR ? 'Cardiologist' : 'ICU & Critical Care');
                  setMedicalCouncil(e.target.value === UserRole.DOCTOR ? 'Malaysian Medical Council (MMC)' : 'Malaysian Nursing Board (LJM)');
                  setRegistryId(e.target.value === UserRole.DOCTOR ? 'MMC' : 'LJM');
                  setRegistrationType('full');
                }}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-extrabold text-slate-700"
              >
                <option value={UserRole.DOCTOR}>Doctor (MD / MBBS)</option>
                <option value={UserRole.NURSE}>Registered Nurse (RN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Specialization / Department Focus</label>
              {role === UserRole.DOCTOR ? (
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-705"
                >
                  <option value="Cardiologist">Cardiologist</option>
                  <option value="Pediatrician">Pediatrician</option>
                  <option value="Neurologist">Neurologist</option>
                  <option value="Dermatologist">Dermatologist</option>
                  <option value="General Physician">General Physician</option>
                </select>
              ) : (
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-705"
                >
                  <option value="ICU & Critical Care">ICU & Critical Care</option>
                  <option value="Geriatric & Eldercare">Geriatric & Eldercare</option>
                  <option value="Pediatric & Neonatal Care">Pediatric & Neonatal Care</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Total Years of Experience</label>
              <input
                type="number"
                placeholder="e.g. 10"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-705"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Professional Bio & Clinical Philosophy</label>
            <textarea
              placeholder="Give details about your clinical specialty, values, treatments, and approach..."
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full text-xs border border-slate-250 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-700 placeholder-slate-400"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!name || !experienceYears}
              className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Continue to Credentials
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Council Registration Numbers */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                {role === UserRole.DOCTOR ? "Medical Council Registry" : "Nursing Council Registry"}
              </label>
              <select
                value={registryId}
                onChange={(e) => {
                  setRegistryId(e.target.value);
                  if (e.target.value === "MMC") setMedicalCouncil("Malaysian Medical Council (MMC)");
                  else if (e.target.value === "LJM") setMedicalCouncil("Malaysian Nursing Board (LJM)");
                  else setMedicalCouncil("");
                  if (e.target.value === "LJM") setRegistrationType("full");
                }}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-705"
              >
                {role === UserRole.DOCTOR ? <option value="MMC">Malaysian Medical Council (MMC)</option> : <option value="LJM">Malaysian Nursing Board (LJM)</option>}
                <option value="OTHER">Another country's regulator (international)</option>
              </select>
              {registryId === "OTHER" && (
                <input type="text" required maxLength={100} placeholder="Regulator name and country, e.g. General Medical Council (UK)" value={medicalCouncil} onChange={(e) => setMedicalCouncil(e.target.value)} className="mt-2 w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-800" />
              )}
              <label className="block text-xs font-bold text-slate-600 mt-3 mb-1">Registration type</label>
              <select value={registrationType} onChange={(e) => setRegistrationType(e.target.value)} className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-705">
                <option value="full">Full registration</option>
                <option value="provisional">Provisional registration</option>
                {registryId !== "LJM" && <option value="specialist">Specialist register</option>}
              </select>
              {registrationType === "specialist" && (
                <input type="text" required maxLength={50} placeholder="Specialist register number" value={specialistRegNo} onChange={(e) => setSpecialistRegNo(e.target.value)} className="mt-2 w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-mono font-bold text-slate-800" />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Active Registration License Number</label>
              <input
                type="text"
                placeholder={role === UserRole.DOCTOR ? "MMC-REG-XXXXX" : "LJM-REG-XXXXX"}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-black font-mono text-slate-850"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">{expiryLabel(medicalCouncil)} date</label>
              <input
                type="date"
                min={new Date(Date.now() + 86400_000).toISOString().slice(0, 10)}
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-705"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Primary Degree & Qualifications</label>
              <input
                type="text"
                placeholder="e.g. MBBS (Malaya), M.Med (UKM) / Diploma in Nursing"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-705"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Consultation Charge (RM)</label>
              <input
                type="number"
                placeholder="e.g. 150"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-bold text-slate-705"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Active Practice City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-extrabold text-slate-700"
              >
                <option value="Kuala Lumpur">Kuala Lumpur</option>
                <option value="Petaling Jaya">Petaling Jaya</option>
                <option value="Penang">Penang</option>
                <option value="Johor Bahru">Johor Bahru</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Practice / Clinic Address</label>
              <input
                type="text"
                placeholder="Jalan Kiara, Mont Kiara"
                value={practiceAddress}
                onChange={(e) => setPracticeAddress(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-705"
                required
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="border border-slate-200 text-slate-600 text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Previous Step
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!licenseNumber || !licenseExpiry || !education || !fee || !practiceAddress}
              className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Continue to Documentation
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: File Attachment Upload */}
      {step === 3 && (
        <form onSubmit={handleOnboardingSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 space-y-3 relative">
            <input 
              type="file" 
              id="file-degree"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUploadSimulate}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <FileText className="h-10 w-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-800">Drag & Drop Degree Certificate or Council Practicing Slip</p>
              <p className="text-[10px] text-slate-500 mt-1">Supports PDF, JPG or PNG formats up to 5MB</p>
            </div>
            {fileAttached && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold py-2 px-4 rounded-xl inline-flex items-center gap-2 mx-auto animate-pulse">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Attached: {fileAttached}
              </div>
            )}
          </div>

          <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-4 rounded-xl text-xs text-[color:var(--t-700)] leading-relaxed font-semibold flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Our medical board reviews your documents and checks your licence against the council's register by hand. You will be notified in the app when a decision is made. Your profile is not public until you are approved.
            </div>
          </div>

          {submitError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold">{submitError}</div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="border border-slate-200 text-slate-600 text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Previous Step
            </button>
            <button
              type="submit"
              disabled={loading || !fileAttached}
              className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  Registering Credentials...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: Success confirmation screen */}
      {step === 4 && (
        <div className="text-center py-8 space-y-5 animate-fade-in">
          <div className="h-16 w-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-md">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-900">Application Lodged Successfully!</h3>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              Dr./Sister {name}, your registry profile has been established on MedCred. 
              Admin moderators will complete verification of your state license number <strong>{licenseNumber}</strong> shortly.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 max-w-sm mx-auto p-4 rounded-xl text-xs text-left space-y-2">
            <div className="flex justify-between font-bold text-slate-755">
              <span>Onboarding Ref ID:</span>
              <code className="font-mono text-[color:var(--t-700)]">{success?.id}</code>
            </div>
            <div className="flex justify-between font-semibold text-slate-600">
              <span>SEO Slug Allocated:</span>
              <code className="text-[10px] text-[color:var(--t-600)] font-mono">{success?.seoSlug}</code>
            </div>
            <div className="flex justify-between font-semibold text-slate-600">
              <span>Verification Status:</span>
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Loader className="h-3 w-3 animate-spin" />
                Pending Review
              </span>
            </div>
          </div>

          <button
            onClick={() => setStep(1)}
            className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Submit Another Application
          </button>
        </div>
      )}
    </div>
  );
}
