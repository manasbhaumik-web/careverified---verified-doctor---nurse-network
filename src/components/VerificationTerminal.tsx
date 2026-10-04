import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserCheck, Stethoscope, Award, FileText, Loader, 
  CheckCircle2, AlertCircle, Edit, Star, Shield, MessageSquare, 
  Save, X, ThumbsUp, MapPin, DollarSign, Activity, Send, Check,
  Calendar, Clock, TrendingUp, Users, Plus, Trash2, Heart, ShieldAlert,
  FileSignature, AlertTriangle, Ambulance, ChevronRight, Eye, Bold, Italic, List, Quote, LayoutGrid
} from 'lucide-react';
import { UserRole, DoctorProfile, NurseProfile, Review, VerificationStatus, Booking, OnCallDispatch, ConsultationMode } from '../types';
import PractitionerOverviewTab from './practitioner/PractitionerOverviewTab';
import PractitionerAccreditationTab from './practitioner/PractitionerAccreditationTab';
import PractitionerBookingsTab from './practitioner/PractitionerBookingsTab';
import PractitionerFeedbackTab from './practitioner/PractitionerFeedbackTab';
import PractitionerAnalyticsTab from './practitioner/PractitionerAnalyticsTab';
import PractitionerSettingsTab from './practitioner/PractitionerSettingsTab';
import PageBanner from './PageBanner';

interface VerificationTerminalProps {
  currentUser?: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string } | null;
  professionals?: (DoctorProfile | NurseProfile)[];
  reviews?: Review[];
  bookings?: Booking[];
  onRefreshData?: () => void;
}

export default function VerificationTerminal({ 
  currentUser, 
  professionals = [], 
  reviews = [], 
  bookings = [], 
  onRefreshData 
}: VerificationTerminalProps) {
  // Try to match logged in practitioner with an existing registry profile
  const matchedProfile = professionals.find(p => 
    p.name.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  // Dashboard state variables (for registered practitioner)
  const [activeDashboardTab, setActiveDashboardTab] = useState<'home' | 'accreditation' | 'bookings' | 'reviews' | 'analytics' | 'settings'>('home');
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
  const [medicalCouncil, setMedicalCouncil] = useState('Malaysian Medical Council (MMC)');
  const [experienceYears, setExperienceYears] = useState('');
  const [education, setEducation] = useState('');
  const [bio, setBio] = useState('');
  const [fee, setFee] = useState('');
  const [city, setCity] = useState('Kuala Lumpur');
  const [practiceAddress, setPracticeAddress] = useState('');
  const [fileAttached, setFileAttached] = useState<string | null>(null);

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
      setFileAttached(e.target.files[0].name);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          medicalCouncil,
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
      if (data.status === 'success') {
        setSuccess(data.data);
        setStep(4);
        if (onRefreshData) onRefreshData();
      }
    } catch (error) {
      console.error(error);
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

  const handleIssuePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForPrescribe) return;
    setIssuingPrescription(true);
    try {
      const response = await fetch(`/api/bookings/${selectedBookingForPrescribe.id}/prescribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: prescribeDiagnosis,
          medicines: prescribeMeds,
          instructions: prescribeInstructions,
          signature: `Digitally signed by ${matchedProfile?.name} (${matchedProfile?.role === UserRole.DOCTOR ? (matchedProfile as DoctorProfile).medicalCouncil : (matchedProfile as NurseProfile).nursingCouncil} License: ${matchedProfile?.licenseNumber})`
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSelectedBookingForPrescribe(null);
        setPrescribeDiagnosis('');
        setPrescribeMeds('');
        setPrescribeInstructions('');
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error("Error issuing e-prescription:", err);
    } finally {
      setIssuingPrescription(false);
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

    const dashboardTabOrder: Array<'home' | 'bookings' | 'accreditation' | 'reviews' | 'analytics' | 'settings'> =
      ['home', 'bookings', 'accreditation', 'reviews', 'analytics', 'settings'];
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
      <div className="space-y-8 w-full max-w-[1920px] mx-auto" id="practitioner-dashboard-root">
        {/* Absolute Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-[#0F172A] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-slate-850 flex items-center gap-2 animate-bounce z-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}




          {/* ═══════════ MERGED EXECUTIVE CRIMSON HERO BANNER ═══════════ */}
          <div className="bg-gradient-to-r from-[#FFF1F2] via-[#FFF5F5] to-[#FFE4E6] border-l-8 border-[#DC2626] border-y border-r border-[#FECDD3] text-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden space-y-4">
            {/* Integrated Top Bar: Dynamic Time-of-Day Greeting & Date Badge */}
            <div className="flex items-center justify-between gap-4 border-b border-[#FECDD3]/80 pb-3 flex-wrap">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-xs font-black tracking-wider uppercase font-mono text-[#DC2626]">Practitioner Terminal</span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
                    return `${greeting}, ${matchedProfile.name}.`;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#DC2626] bg-white border border-[#FECDD3] px-3 py-1 rounded-full tabular-nums shadow-xs">
                  {new Date().toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              {/* Left Practitioner Identity */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <img 
                    src={matchedProfile.avatar} 
                    alt={matchedProfile.name}
                    className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  {isVerified && (
                    <span 
                      className="absolute -bottom-1 -right-1 bg-white text-[#DC2626] p-1.5 rounded-full shadow-md flex items-center justify-center border border-[#FECDD3]"
                      title="Verified Licensed Practitioner"
                    >
                      <Shield className="h-3.5 w-3.5 fill-current text-[#DC2626]" />
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{matchedProfile.name}</h2>
                    <span className="bg-white text-[#DC2626] border border-[#FECDD3] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs">
                      {isDoc ? "Physician Account" : "Nurse Account"}
                    </span>
                    {isVerified && (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> Verified Active
                      </span>
                    )}
                  </div>

                  {/* Integrated Essential Practice Metadata Strip */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold flex-wrap">
                    <span className="font-extrabold text-slate-900">{matchedProfile.specialization}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-mono text-slate-700">{matchedProfile.experienceYears} Years Exp.</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 border border-[#FECDD3] text-[10px] rounded-md shadow-2xs">
                      {matchedProfile.licenseNumber}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="font-mono text-slate-700 text-[10px] bg-white px-1.5 py-0.5 border border-slate-200 rounded-md">
                      ID: {matchedProfile.id}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      MMC/LJM Connected (Active)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right High-Contrast KPI Executive Strip */}
              <div className="flex items-center gap-4 flex-wrap lg:justify-end border-t lg:border-t-0 border-[#FECDD3]/80 pt-4 lg:pt-0">
                <div className="grid grid-cols-3 gap-3 bg-white/90 p-3 border border-[#FECDD3] rounded-xl text-center min-w-[280px] shadow-xs">
                  <div>
                    <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">{patientsAttendedCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Patients</span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">{upcomingBookingsCount}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Upcoming</span>
                  </div>
                  <div>
                    <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">{avgOverall ?? '5.0'}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rating</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPublicProfilePreview(true)}
                    className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black px-4 py-3 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 border border-[#B91C1C]"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Public Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://medicert.com/practitioner/${matchedProfile.id}`);
                      showToast("Profile link copied to clipboard!");
                    }}
                    className="bg-white hover:bg-[#FFF1F2] text-[#DC2626] border border-[#FECDD3] text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5 text-white" />
                    <span>Share Link</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full space-y-6">
            


              
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

                                    {/* [ UNDERLINE TABBED NAVIGATION ] */}
              <div
                role="tablist"
                aria-label="Practitioner workspace sections"
                className="flex flex-wrap gap-1.5 border border-[#FECDD3] rounded-none sticky top-[72px] bg-[#FFF0F2]/95 backdrop-blur-md z-30 p-1.5 shadow-3xs"
              >
                <button
                  role="tab"
                  id="tab-home"
                  aria-controls="panel-home"
                  aria-selected={activeDashboardTab === 'home'}
                  tabIndex={activeDashboardTab === 'home' ? 0 : -1}
                  onClick={() => setActiveDashboardTab('home')}
                  onKeyDown={handleTabKeyDown}
                  className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
                    activeDashboardTab === 'home' ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-3xs' : 'bg-white text-slate-700 border-[#FECDD3] hover:text-[#DC2626] hover:bg-[#FFF0F2]'
                  }`}
                >
                  <LayoutGrid className={`h-4 w-4 ${activeDashboardTab === 'home' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Overview</span>
                </button>

                <button
                  role="tab"
                  id="tab-bookings"
                  aria-controls="panel-bookings"
                  aria-selected={activeDashboardTab === 'bookings'}
                  tabIndex={activeDashboardTab === 'bookings' ? 0 : -1}
                  onClick={() => setActiveDashboardTab('bookings')}
                  onKeyDown={handleTabKeyDown}
                  className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
                    activeDashboardTab === 'bookings' ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-3xs' : 'bg-white text-slate-700 border-[#FECDD3] hover:text-[#DC2626] hover:bg-[#FFF0F2]'
                  }`}
                >
                  <Calendar className={`h-4 w-4 ${activeDashboardTab === 'bookings' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Bookings</span>
                  {upcomingBookingsCount > 0 && (
                    <span className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-full font-black bg-[#DC2626] text-white leading-none">
                      {upcomingBookingsCount}
                    </span>
                  )}
                </button>

                <button
                  role="tab"
                  id="tab-accreditation"
                  aria-controls="panel-accreditation"
                  aria-selected={activeDashboardTab === 'accreditation'}
                  tabIndex={activeDashboardTab === 'accreditation' ? 0 : -1}
                  onClick={() => setActiveDashboardTab('accreditation')}
                  onKeyDown={handleTabKeyDown}
                  className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
                    activeDashboardTab === 'accreditation' ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-3xs' : 'bg-white text-slate-700 border-[#FECDD3] hover:text-[#DC2626] hover:bg-[#FFF0F2]'
                  }`}
                >
                  <Award className={`h-4 w-4 ${activeDashboardTab === 'accreditation' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Accreditation</span>
                </button>

                <button
                  role="tab"
                  id="tab-reviews"
                  aria-controls="panel-reviews"
                  aria-selected={activeDashboardTab === 'reviews'}
                  tabIndex={activeDashboardTab === 'reviews' ? 0 : -1}
                  onClick={() => setActiveDashboardTab('reviews')}
                  onKeyDown={handleTabKeyDown}
                  className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
                    activeDashboardTab === 'reviews' ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-3xs' : 'bg-white text-slate-700 border-[#FECDD3] hover:text-[#DC2626] hover:bg-[#FFF0F2]'
                  }`}
                >
                  <MessageSquare className={`h-4 w-4 ${activeDashboardTab === 'reviews' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Feedback</span>
                </button>

                <button
                  role="tab"
                  id="tab-analytics"
                  aria-controls="panel-analytics"
                  aria-selected={activeDashboardTab === 'analytics'}
                  tabIndex={activeDashboardTab === 'analytics' ? 0 : -1}
                  onClick={() => setActiveDashboardTab('analytics')}
                  onKeyDown={handleTabKeyDown}
                  className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
                    activeDashboardTab === 'analytics' ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-3xs' : 'bg-white text-slate-700 border-[#FECDD3] hover:text-[#DC2626] hover:bg-[#FFF0F2]'
                  }`}
                >
                  <TrendingUp className={`h-4 w-4 ${activeDashboardTab === 'analytics' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Analytics</span>
                </button>

                <button
                  role="tab"
                  id="tab-settings"
                  aria-controls="panel-settings"
                  aria-selected={activeDashboardTab === 'settings'}
                  tabIndex={activeDashboardTab === 'settings' ? 0 : -1}
                  onClick={() => setActiveDashboardTab('settings')}
                  onKeyDown={handleTabKeyDown}
                  className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
                    activeDashboardTab === 'settings' ? 'bg-[#DC2626] text-white border-[#B91C1C] shadow-3xs' : 'bg-white text-slate-700 border-[#FECDD3] hover:text-[#DC2626] hover:bg-[#FFF0F2]'
                  }`}
                >
                  <Edit className={`h-4 w-4 ${activeDashboardTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
                  <span>Settings</span>
                </button>
              </div>

              {/* TAB CONTENT: OVERVIEW (default landing tab) */}
              {activeDashboardTab === 'home' && (
                <PractitionerOverviewTab
                  matchedProfile={matchedProfile}
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
            onSubmitPrescription={handleIssuePrescriptionSubmit}
            onUpdateDispatchStatus={handleUpdateDispatchStatus}
          />
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
                      className="h-24 w-24 rounded-full object-cover border-4 border-[#DC2626]/20 shadow-md mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <h3 className="font-sans text-xl font-semibold text-slate-900">{matchedProfile.name}</h3>
                        {isVerified && <Shield className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500" />}
                      </div>
                      <p className="text-xs font-bold text-[#DC2626] uppercase tracking-widest">{matchedProfile.specialization}</p>
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
                            <span key={cert} className="bg-[#FFF0F2] text-[#B91C1C] border border-[#FECDD3] text-[10px] font-bold px-2.5 py-1 rounded-md">
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
                      className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
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
            <Award className="h-4 w-4 text-[#DC2626]" />
            Onboarding Progress Guide
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Step {step > 3 ? 3 : step} of 3</span>
        </div>
        
        <div className="flex items-center justify-between relative">
          {/* Step 1 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 1 
                ? 'bg-[#DC2626] border border-[#DC2626] text-white shadow-3xs' 
                : step === 1 
                  ? 'bg-white border-2 border-[#DC2626] text-[#DC2626] ring-4 ring-[#DC2626]/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 1 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">1</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 1 ? 'text-[#DC2626]' : 'text-slate-500'}`}>Professional Info</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 transition-all ${step > 1 ? 'bg-[#DC2626]' : 'bg-slate-200'}`}></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 2 
                ? 'bg-[#DC2626] border border-[#DC2626] text-white shadow-3xs' 
                : step === 2 
                  ? 'bg-white border-2 border-[#DC2626] text-[#DC2626] ring-4 ring-[#DC2626]/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 2 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">2</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 2 ? 'text-[#DC2626]' : 'text-slate-500'}`}>Licensing Credentials</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 transition-all ${step > 2 ? 'bg-[#DC2626]' : 'bg-slate-200'}`}></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 3
                ? 'bg-[#DC2626] border border-[#DC2626] text-white shadow-3xs'
                : step === 3 
                  ? 'bg-white border-2 border-[#DC2626] text-[#DC2626] ring-4 ring-[#DC2626]/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 3 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">3</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 3 ? 'text-[#DC2626]' : 'text-slate-500'}`}>Certificate Upload</span>
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-750"
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
                }}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-extrabold text-slate-700"
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
                  className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-705"
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
                  className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-705"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-705"
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
              className="w-full text-xs border border-slate-250 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-700 placeholder-slate-400"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!name || !experienceYears}
              className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
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
                value={medicalCouncil}
                onChange={(e) => setMedicalCouncil(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-705"
              >
                {role === UserRole.DOCTOR ? (
                  <option value="Malaysian Medical Council (MMC)">Malaysian Medical Council (MMC)</option>
                ) : (
                  <option value="Malaysian Nursing Board (LJM)">Malaysian Nursing Board (LJM)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Active Registration License Number</label>
              <input
                type="text"
                placeholder={role === UserRole.DOCTOR ? "MMC-REG-XXXXX" : "LJM-REG-XXXXX"}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-black font-mono text-slate-850"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-705"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-705"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Active Practice City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-extrabold text-slate-700"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-705"
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
              disabled={!licenseNumber || !education || !fee || !practiceAddress}
              className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
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

          <div className="bg-[#FFF0F2] border border-[#FECDD3] p-4 rounded-xl text-xs text-[#B91C1C] leading-relaxed font-semibold flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Our system runs cross-checks against state medical council database APIs automatically. 
              The profile validation cycle completes within 24 hours of submission.
            </div>
          </div>

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
              className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 text-white text-xs font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
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
              <code className="font-mono text-[#B91C1C]">{success?.id}</code>
            </div>
            <div className="flex justify-between font-semibold text-slate-600">
              <span>SEO Slug Allocated:</span>
              <code className="text-[10px] text-[#DC2626] font-mono">{success?.seoSlug}</code>
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
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Submit Another Application
          </button>
        </div>
      )}
    </div>
  );
}
