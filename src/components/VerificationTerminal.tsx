import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserCheck, Stethoscope, Award, FileText, Loader, 
  CheckCircle2, AlertCircle, Edit, Star, Shield, MessageSquare, 
  Save, X, ThumbsUp, MapPin, DollarSign, Activity, Send, Check,
  Calendar, Clock, TrendingUp, Users, Plus, Trash2, Heart, ShieldAlert,
  FileSignature, AlertTriangle, Ambulance, ChevronRight, Eye, Bold, Italic, List, Quote
} from 'lucide-react';
import { UserRole, DoctorProfile, NurseProfile, Review, VerificationStatus, Booking, OnCallDispatch, ConsultationMode } from '../types';

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
  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'bookings' | 'reviews' | 'analytics' | 'settings'>('settings');
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
            ? "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250"
            : "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=250"
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

    return (
      <div className="bg-slate-50/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 min-h-screen" id="practitioner-dashboard-root">
        {/* Absolute Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-slate-850 flex items-center gap-2 animate-bounce z-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="max-w-[1200px] mx-auto space-y-6">


          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* LEFT COLUMN: 30% - Sticky Sidebar */}
            <aside className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-24 space-y-6">
              
              {/* [ PROFILE CARD ] */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                
                {/* Profile Photo */}
                <div className="relative inline-block mt-2 animate-fade-in">
                  <img 
                    src={matchedProfile.avatar} 
                    alt={matchedProfile.name}
                    className="h-24 w-24 rounded-full object-cover border-4 border-slate-50 shadow-md mx-auto hover:rotate-3 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  {/* Verified Checkmark Shield */}
                  {isVerified && (
                    <span 
                      className="absolute bottom-0 right-0 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-2 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-115 transition-transform duration-300"
                      title="Verified Medical Practitioner"
                    >
                      <Shield className="h-3.5 w-3.5 fill-current text-white animate-pulse" />
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-black text-slate-850 leading-tight">{matchedProfile.name}</h3>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                      {isDoc ? "Physician Account" : "Nurse Account"}
                    </span>
                    {isVerified && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-3xs animate-fade-in">
                        <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* PRACTICE STATUS */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-teal-600" />
                  Practice Status
                </h4>
                
                <div className="space-y-3 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Registry Connection</span>
                    <span className="flex items-center gap-2 font-extrabold text-slate-850">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
                      </span>
                      <span>Active</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Specialized</span>
                    <span className="font-extrabold text-slate-800">{matchedProfile.specialization}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Experience</span>
                    <span className="font-extrabold text-slate-800">{matchedProfile.experienceYears} Years</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Practitioner ID</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{matchedProfile.id}</span>
                  </div>
                </div>
              </div>

              {/* PROFILE STRENGTH */}
              {(() => {
                const strength = Math.min(
                  55 + 
                  (editBio.length > 20 ? 15 : 0) + 
                  (certifications.length * 10) + 
                  (editSlots.length > 0 ? 10 : 0),
                  100
                );
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-slate-900 uppercase tracking-wider">Profile Strength</span>
                      <span className="font-extrabold text-teal-700">{strength}%</span>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${strength}%` }}></div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold leading-normal italic">
                      {strength === 100 
                        ? "🎉 Your practitioner registry card is fully optimized!"
                        : "Engagement: Add certifications and bio to reach 100% and rank higher."}
                    </p>
                  </div>
                );
              })()}

              {/* QUICK ACTIONS */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Quick Actions
                </h4>
                
                <button
                  type="button"
                  onClick={() => setShowPublicProfilePreview(true)}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
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
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-55/60 text-slate-700 border border-slate-200 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                >
                  <Send className="h-3.5 w-3.5 text-slate-500" />
                  <span>Share Profile Link</span>
                </button>
              </div>

            </aside>

            {/* RIGHT COLUMN: 70% - Scrollable Content */}
            <div className="flex-grow w-full space-y-6">

                                    {/* [ SEGMENTED GLASSMORPHIC TABBED NAVIGATION ] */}
              <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap gap-1 shadow-sm sticky top-[80px] z-30">
                <button
                  onClick={() => setActiveDashboardTab('overview')}
                  className={`relative flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                    activeDashboardTab === 'overview' ? 'text-teal-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {activeDashboardTab === 'overview' && (
                    <div className="absolute inset-0 bg-teal-50 border border-teal-100 rounded-xl shadow-3xs -z-10" />
                  )}
                  <Award className={`h-4 w-4 ${activeDashboardTab === 'overview' ? 'text-teal-600' : ''}`} />
                  <span>Accreditation</span>
                </button>

                <button
                  onClick={() => setActiveDashboardTab('bookings')}
                  className={`relative flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                    activeDashboardTab === 'bookings' ? 'text-teal-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {activeDashboardTab === 'bookings' && (
                    <div className="absolute inset-0 bg-teal-50 border border-teal-100 rounded-xl shadow-3xs -z-10" />
                  )}
                  <Calendar className={`h-4 w-4 ${activeDashboardTab === 'bookings' ? 'text-teal-600' : ''}`} />
                  <span>Bookings</span>
                  {upcomingBookingsCount > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-1 ${
                      activeDashboardTab === 'bookings' ? 'bg-teal-100 text-teal-800' : 'bg-rose-500 text-white'
                    }`}>
                      {upcomingBookingsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveDashboardTab('reviews')}
                  className={`relative flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                    activeDashboardTab === 'reviews' ? 'text-teal-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {activeDashboardTab === 'reviews' && (
                    <div className="absolute inset-0 bg-teal-50 border border-teal-100 rounded-xl shadow-3xs -z-10" />
                  )}
                  <MessageSquare className={`h-4 w-4 ${activeDashboardTab === 'reviews' ? 'text-teal-600' : ''}`} />
                  <span>Feedback</span>
                </button>

                <button
                  onClick={() => setActiveDashboardTab('analytics')}
                  className={`relative flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                    activeDashboardTab === 'analytics' ? 'text-teal-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {activeDashboardTab === 'analytics' && (
                    <div className="absolute inset-0 bg-teal-50 border border-teal-100 rounded-xl shadow-3xs -z-10" />
                  )}
                  <TrendingUp className={`h-4 w-4 ${activeDashboardTab === 'analytics' ? 'text-teal-600' : ''}`} />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => setActiveDashboardTab('settings')}
                  className={`relative flex-1 min-w-[120px] py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer z-10 ${
                    activeDashboardTab === 'settings' ? 'text-teal-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {activeDashboardTab === 'settings' && (
                    <div className="absolute inset-0 bg-teal-50 border border-teal-100 rounded-xl shadow-3xs -z-10" />
                  )}
                  <Edit className={`h-4 w-4 ${activeDashboardTab === 'settings' ? 'text-teal-600' : ''}`} />
                  <span>Registry File</span>
                </button>
              </div>

        {/* TAB CONTENT: ACCREDITATION OVERVIEW */}
        {activeDashboardTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Certificate of Accreditation Widget */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-blue-600" />
                  National Network Accreditation
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Official credential status verified with governmental boards.</p>
              </div>

              {isVerified ? (
                <div className="border border-emerald-100 rounded-2xl p-6 bg-emerald-50/20 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600 shrink-0">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900">MMC/LJM Status: Active & In Good Standing</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Your professional practice certificate matches active licensing records inside the state database. No compliance alerts are pending on your record.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100/50 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Registry Authority</span>
                      <span className="font-extrabold text-slate-800 mt-0.5 block">{(matchedProfile as any).medicalCouncil || (matchedProfile as any).nursingCouncil || "National Council"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">License Key Number</span>
                      <code className="font-mono font-bold text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded text-[11px] mt-0.5 inline-block">{matchedProfile.licenseNumber}</code>
                    </div>
                  </div>
                </div>
              ) : isPending ? (
                <div className="border border-amber-100 rounded-2xl p-6 bg-amber-50/20 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600 shrink-0">
                      <Loader className="h-6 w-6 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900">Board Credential Auditing In Progress</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Our administrative registry team is cross-referencing your certificate files with government registers. This typically completes within 12-24 hours.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-rose-100 rounded-2xl p-6 bg-rose-50/20 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 shrink-0">
                      <AlertCircle className="h-6 w-6 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900">Credential Audit Failed</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Your registered license parameters could not be validated by government lookup services. Please verify your profile fields or contact our medical desk support.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Checklist Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700">Completed Quality Checkmarks</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-700">Identity Document check completed</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-700">Clinical Diploma authenticated</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-700">Malpractice Liability clearing active</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-150/40 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-700">Professional Ethics code accepted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability & Practice Scope Sidebar */}
            <div className="space-y-6">
              {/* Practice Directory Snap */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Practice Parameters</h4>
                </div>
                <div className="space-y-3 text-xs font-semibold text-slate-600">
                  <p className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800 font-extrabold block">Location:</strong>
                      {matchedProfile.practiceAddress}, {matchedProfile.city}
                    </span>
                  </p>
                  <p className="flex items-start gap-2.5">
                    <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800 font-extrabold block">Base Co-Pay Fee:</strong>
                      {isDoc ? `RM ${matchedProfile.fee} per consult` : `RM ${matchedProfile.fee} per hour`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Consultation Scheduling Schedule */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Availability Matrix</h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Clinical Days</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {matchedProfile.availability.days.map(d => (
                        <span key={d} className="bg-blue-50 text-blue-800 border border-blue-100/60 font-bold text-[10px] px-2 py-0.5 rounded-md">{d}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Scheduling Blocks</span>
                    <div className="flex flex-col gap-1 mt-1.5 font-mono text-[11px] text-slate-600">
                      {matchedProfile.availability.slots.map(s => (
                        <div key={s} className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">{s}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: MANAGE PUBLIC REGISTRY FILE */}
        {activeDashboardTab === 'settings' && (
          <div className="flex flex-col xl:flex-row gap-6 animate-fade-in items-start w-full">
            
            {/* LEFT PANE: Configuration Form */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs w-full">
              <div className="border-b border-slate-150 pb-3.5 mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Edit className="h-4.5 w-4.5 text-teal-600" />
                  Registry Listing Configuration
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Update the public information patients find when searching the registry.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Biography & Philosophy with formatting tools */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-xs font-black text-slate-700">Clinical Biography & Care Philosophy</label>
                    
                    {/* Formatting Tools */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setEditBio(prev => prev + " **Clinical Focus:** ");
                          showToast("Added Bold template");
                        }}
                        className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                        title="Add Bold section header"
                      >
                        <Bold className="h-3 w-3" />
                        <span>Bold</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setEditBio(prev => prev + " *[Patient Centered care]* ");
                          showToast("Added Italic template");
                        }}
                        className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                        title="Add Italic emphasis"
                      >
                        <Italic className="h-3 w-3" />
                        <span>Italic</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditBio(prev => prev + "\n- Pediatric Primary Care\n- Child Development Milestones");
                          showToast("Added Bullet List template");
                        }}
                        className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                        title="Add Bullet Points"
                      >
                        <List className="h-3 w-3" />
                        <span>List</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditBio(prev => prev + '\n> "My clinical philosophy is pediatric wellness."');
                          showToast("Added Quote template");
                        }}
                        className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                        title="Add Blockquote Quote"
                      >
                        <Quote className="h-3 w-3" />
                        <span>Quote</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditBio('');
                          showToast("Cleared biography");
                        }}
                        className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded text-[10px] font-extrabold transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-3.5 outline-none focus:ring-1 focus:ring-teal-500 font-semibold text-slate-700 leading-relaxed bg-white"
                    placeholder="Explain your approach to care, clinical experience, and focus areas..."
                    required
                  />
                </div>

                {/* Medical Certifications Tag Manager */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-700">Active Medical Certifications</label>
                  <p className="text-[10px] text-slate-500 font-semibold">Verify specialized training tags displayed on your public patient card.</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {certifications.map(cert => (
                      <span key={cert} className="bg-teal-50 text-teal-800 border border-teal-150 font-extrabold text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-3xs">
                        <span>{cert}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCertifications(certifications.filter(c => c !== cert));
                            showToast(`Removed certification: ${cert}`);
                          }}
                          className="text-teal-400 hover:text-rose-600 font-black cursor-pointer p-0.5 rounded transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {certifications.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No certifications listed. Add tags below.</span>
                    )}
                  </div>

                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      placeholder="e.g. Advanced Pediatric Life Support"
                      value={newCert}
                      onChange={(e) => setNewCert(e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-teal-500 font-semibold text-slate-700 flex-1 bg-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = newCert.trim();
                          if (trimmed) {
                            if (certifications.includes(trimmed)) {
                              showToast("Certification already exists!");
                            } else {
                              setCertifications([...certifications, trimmed]);
                              setNewCert('');
                              showToast(`Added certification: ${trimmed}`);
                            }
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newCert.trim();
                        if (trimmed) {
                          if (certifications.includes(trimmed)) {
                            showToast("Certification already exists!");
                          } else {
                            setCertifications([...certifications, trimmed]);
                            setNewCert('');
                            showToast(`Added certification: ${trimmed}`);
                          }
                        }
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Tag
                    </button>
                  </div>
                </div>

                {/* Professional Fee, City & Clinical Center */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      {isDoc ? "Standard Co-Pay Fee (RM)" : "Hourly Clinical Service Fee (RM)"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-black">RM</span>
                      <input
                        type="number"
                        value={editFee}
                        onChange={(e) => setEditFee(Number(e.target.value))}
                        className="w-full text-xs border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 outline-none focus:ring-1 focus:ring-teal-500 font-bold text-slate-700 bg-white"
                        placeholder="e.g. 150"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">Registered Practice City</label>
                    <select
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-teal-500 font-bold text-slate-700 bg-white"
                    >
                      <option value="Kuala Lumpur">Kuala Lumpur</option>
                      <option value="Petaling Jaya">Petaling Jaya</option>
                      <option value="Penang">Penang</option>
                      <option value="Johor Bahru">Johor Bahru</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">Practice Address / Clinical Center</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-teal-500 font-semibold text-slate-700 bg-white"
                    placeholder="e.g. Pantai Specialist Center, 8 Bukit Pantai"
                    required
                  />
                </div>

                {/* Dynamic Availability Matrix Config */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      Availability & Timeslot Configuration
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold mb-3">Define the days and times patients are allowed to book consultations with you.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2">Practice Days of the Week</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const isActive = editDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isActive) {
                                setEditDays(editDays.filter(d => d !== day));
                              } else {
                                setEditDays([...editDays, day]);
                              }
                            }}
                            className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-teal-600 text-white border-teal-600 shadow-3xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2">Configure Time Slots</label>
                    <div className="flex gap-2 mb-3 max-w-sm">
                      <input
                        type="text"
                        placeholder="e.g. 10:00 AM"
                        value={newTimeSlot}
                        onChange={(e) => setNewTimeSlot(e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-teal-500 font-bold text-slate-700 flex-1 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newTimeSlot.trim();
                          if (trimmed && !editSlots.includes(trimmed)) {
                            setEditSlots([...editSlots, trimmed]);
                            setNewTimeSlot('');
                            showToast(`Added timeslot: ${trimmed}`);
                          }
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Slot
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                      {editSlots.length === 0 ? (
                        <span className="text-[10px] text-slate-400 font-semibold p-2">No custom scheduling slots configured. Click 'Add Slot' above.</span>
                      ) : (
                        editSlots.map(slot => (
                          <span key={slot} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-3xs font-mono">
                            <span>{slot}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditSlots(editSlots.filter(s => s !== slot));
                                showToast(`Removed timeslot: ${slot}`);
                              }}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 rounded transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {settingsSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Public registry file updated successfully. Updates are now live nationwide.</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-black py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    {savingSettings ? (
                      <>
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Profile Updates</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT PANE: Patient-Facing Live Preview Card */}
            <div className="w-full xl:w-[380px] shrink-0 space-y-4 lg:sticky lg:top-24">
              <div className="bg-white border-2 border-dashed border-teal-500/40 rounded-3xl p-5 shadow-xs relative overflow-hidden space-y-4">
                <div className="bg-teal-50 text-teal-800 border border-teal-100 text-[9px] font-black uppercase py-1 px-3 rounded-full flex items-center gap-1 w-max">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping"></span>
                  Live Patient Search Card Preview
                </div>

                <div className="border border-slate-100 rounded-2xl p-4 shadow-3xs space-y-4 bg-white relative">
                  <div className="flex gap-3 items-start">
                    <img
                      src={matchedProfile.avatar}
                      alt={matchedProfile.name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-teal-50 shadow-3xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h4 className="text-sm font-black text-slate-850 truncate leading-snug">{matchedProfile.name}</h4>
                        {isVerified && <Shield className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 shrink-0" />}
                      </div>
                      
                      <p className="text-[10px] text-teal-700 font-extrabold uppercase tracking-wide">
                        {matchedProfile.specialization}
                      </p>

                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
                        <span className="text-amber-500">★</span>
                        <span className="text-slate-800">{matchedProfile.rating}</span>
                        <span>(52 Patient Reviews)</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                    {editBio || "No clinical biography provided. Please write a description to engage patients..."}
                  </p>

                  {/* Certifications displayed as patient-facing badges */}
                  {certifications.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase">Clinical Credentials</span>
                      <div className="flex flex-wrap gap-1">
                        {certifications.map(cert => (
                          <span key={cert} className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-[11px] text-slate-600 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{editAddress || "Pantai Specialist Center"}, {editCity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Base consultation co-pay:</span>
                      </div>
                      <strong className="text-slate-800 text-xs font-black">RM {editFee || 120}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-black rounded-xl transition-all shadow-3xs cursor-not-allowed mt-2"
                    disabled
                  >
                    Book Appointment (Preview)
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-medium text-center italic">
                  Changes above reflect instantly in the live doctor directory.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* TAB CONTENT: REVIEW REPLIES LEDGER */}
        {activeDashboardTab === 'reviews' && (
          <div className="space-y-6 animate-fade-in">
            {/* Reviews Metric Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Overall Clinical Rating</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900">{matchedProfile.rating}</span>
                  <div className="flex text-amber-400 shrink-0">
                    <Star className="h-4.5 w-4.5 fill-current" />
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 font-semibold">Based on verified reviews.</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Bedside Manners</span>
                <span className="text-xl font-extrabold text-indigo-700">{avgComm} / 5.0</span>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(Number(avgComm)/5)*100}%` }}></div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Clinic Punctuality</span>
                <span className="text-xl font-extrabold text-sky-700">{avgPunct} / 5.0</span>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-sky-600 h-full rounded-full" style={{ width: `${(Number(avgPunct)/5)*100}%` }}></div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Care Satisfaction</span>
                <span className="text-xl font-extrabold text-emerald-700">{avgSatis} / 5.0</span>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${(Number(avgSatis)/5)*100}%` }}></div>
                </div>
              </div>
            </div>

            {/* List of Patient Feedback */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Patient Care Logbook</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Below are verified experiences left by patients post-treatment.</p>
              </div>

              {myReviews.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Patient Reviews Logged Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">Reviews left on your public practitioner specialty page will compile here for clinical moderation.</p>
                </div>
              ) : (
                <div className="space-y-6 divide-y divide-slate-100">
                  {myReviews.map((rev, index) => {
                    const isReplying = replyingMap[rev.id];
                    const isExpanded = replyExpandedId === rev.id;

                    return (
                      <div key={rev.id} className={`pt-5 first:pt-0 space-y-3.5`}>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3 items-center">
                            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {rev.patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold text-slate-800">{rev.patientName}</h4>
                                {rev.isVerifiedPatient && (
                                  <span className="bg-blue-50/50 text-blue-700 border border-blue-100 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Verified Patient</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold">{rev.date}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-amber-50/50 border border-amber-100/50 px-2 py-0.5 rounded-lg text-xs font-extrabold text-amber-700 shrink-0">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                            <span>{rev.rating.toFixed(1)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50/40 border border-slate-100/30 p-3 rounded-xl italic">
                          "{rev.comment}"
                        </p>

                        {/* Individual Ratings Grid */}
                        <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-slate-500 max-w-md bg-slate-50/30 p-2 rounded-xl">
                          <div>Communication: <span className="text-slate-800 font-extrabold">{rev.communication || rev.rating}/5</span></div>
                          <div>Punctuality: <span className="text-slate-800 font-extrabold">{rev.punctuality || rev.rating}/5</span></div>
                          <div>Care Satisfaction: <span className="text-slate-800 font-extrabold">{rev.satisfaction || rev.rating}/5</span></div>
                        </div>

                        {/* Reply Container */}
                        {rev.replyText ? (
                          <div className="bg-blue-50/40 border border-blue-100/60 p-4 rounded-xl space-y-1 ml-4 sm:ml-8">
                            <div className="flex items-center gap-2 text-[10px] font-black text-blue-800 uppercase tracking-wider">
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                              <span>Your Clinical Clarification Reply</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                              {rev.replyText}
                            </p>
                          </div>
                        ) : (
                          <div className="ml-4 sm:ml-8">
                            {!isExpanded ? (
                              <button
                                onClick={() => {
                                  setReplyExpandedId(rev.id);
                                  setReplyTextMap(prev => ({ ...prev, [rev.id]: '' }));
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1.5 hover:underline"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Add Professional Reply</span>
                              </button>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 animate-fade-in max-w-xl">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                                    Draft Practitioner Response
                                  </span>
                                  <button 
                                    onClick={() => setReplyExpandedId(null)}
                                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-md transition-all cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <textarea
                                  rows={3}
                                  value={replyTextMap[rev.id] || ''}
                                  onChange={(e) => setReplyTextMap(prev => ({ ...prev, [rev.id]: e.target.value }))}
                                  className="w-full text-xs border border-slate-250 bg-white rounded-xl p-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                                  placeholder="Address feedback objectively and respect confidentiality guidelines..."
                                  required
                                />

                                <div className="flex justify-between items-center gap-2">
                                  <p className="text-[9px] text-slate-400 font-medium max-w-[300px]">
                                    Responses are published directly on your public specialty profile card.
                                  </p>
                                  <button
                                    onClick={() => handlePublishReply(rev.id)}
                                    disabled={isReplying || !replyTextMap[rev.id]?.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-[10px] font-extrabold py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                                  >
                                    {isReplying ? (
                                      <Loader className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                    <span>Publish Reply</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: BOOKINGS & EMERGENCY DISPATCHES */}
        {activeDashboardTab === 'bookings' && (
          <div className="space-y-6 animate-fade-in">
            {/* E-Prescription Floating Form / Modal */}
            {selectedBookingForPrescribe && (
              <div className="bg-blue-50/70 border-2 border-blue-200 rounded-3xl p-6 space-y-4 shadow-sm max-w-2xl mx-auto">
                <div className="flex justify-between items-center border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-blue-700" />
                    <h4 className="text-sm font-black text-slate-900">Issue Official Digitally Signed E-Prescription</h4>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedBookingForPrescribe(null)}
                    className="p-1 hover:bg-blue-100 rounded-lg cursor-pointer text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleIssuePrescriptionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Patient Identity</span>
                      <strong className="text-slate-800 text-sm font-extrabold">{selectedBookingForPrescribe.patientName}</strong>
                      <p className="text-slate-500 font-semibold mt-0.5">ID Ref: {selectedBookingForPrescribe.patientId}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-blue-100">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Consultation Mode</span>
                      <strong className="text-slate-800 font-extrabold">{selectedBookingForPrescribe.mode}</strong>
                      <p className="text-slate-500 font-semibold mt-0.5">Date: {selectedBookingForPrescribe.date} &bull; {selectedBookingForPrescribe.timeSlot}</p>
                    </div>
                  </div>

                  {selectedBookingForPrescribe.symptoms && (
                    <div className="bg-white p-3 rounded-xl border border-blue-100/50 text-xs text-slate-600">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Stated Symptoms at Booking</span>
                      "{selectedBookingForPrescribe.symptoms}"
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Diagnosis & Findings</label>
                      <input 
                        type="text"
                        placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI)"
                        value={prescribeDiagnosis}
                        onChange={(e) => setPrescribeDiagnosis(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prescribed Pharmacotherapy (Medicines & Dosage)</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. 1. Tab Paracetamol 500mg - 2 tabs QDS (PRN Fever)&#10;2. Syrup Diphenhydramine 10ml - TDS (Cough)"
                        value={prescribeMeds}
                        onChange={(e) => setPrescribeMeds(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Specific Care & Lifestyle Instructions</label>
                      <input 
                        type="text"
                        placeholder="e.g. Plenty of oral fluids. Avoid cold food items. Strict rest for 3 days."
                        value={prescribeInstructions}
                        onChange={(e) => setPrescribeInstructions(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex gap-2.5 items-start">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                      By signing this e-prescription, you certify that you have reviewed the patient's record, performed clinical validation, and your digital MMC/LJM registration credentials will be embedded into the PDF slip.
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForPrescribe(null)}
                      className="border border-slate-200 text-slate-600 text-xs font-bold px-5 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={issuingPrescription}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black px-6 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                    >
                      {issuingPrescription ? (
                        <>
                          <Loader className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating Encrypted Prescription...</span>
                        </>
                      ) : (
                        <>
                          <FileSignature className="h-3.5 w-3.5" />
                          <span>Generate & Sign E-Prescription</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Emergency Ambulance Dispatch Board */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Ambulance className="h-4.5 w-4.5 text-rose-500 animate-bounce" />
                    Urgent On-Call Emergency Center
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Claim active emergency dispatch tickets requested by high-risk patients nearby.</p>
                </div>
                <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Live Radar Active</span>
              </div>

              {dispatches.filter(d => d.dispatchStatus !== 'Completed').length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 space-y-2">
                  <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="font-bold">No Urgent Emergency Dispatches Pending</p>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto">Standard municipal emergency channels are quiet. If an emergency is triggered by a nearby patient, it will instantly blink here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dispatches.filter(d => d.dispatchStatus !== 'Completed').map(dispatch => {
                    const isClaimedByMe = dispatch.doctorId === matchedProfile.id;
                    const isClaimedByOthers = dispatch.doctorId !== 'auto' && !isClaimedByMe;

                    return (
                      <div key={dispatch.id} className={`border p-4.5 rounded-2xl space-y-3.5 transition-all relative ${
                        isClaimedByMe 
                          ? 'border-indigo-200 bg-indigo-50/30' 
                          : 'border-slate-200 bg-white hover:border-slate-350'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="bg-red-50 text-red-700 border border-red-100 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">CRITICAL ALERT</span>
                            <h4 className="text-sm font-black text-slate-900">{dispatch.patientName}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">{dispatch.timestamp}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            dispatch.dispatchStatus === 'Pending Dispatch' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {dispatch.dispatchStatus}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                          <p><strong className="text-slate-800 font-bold">Urgent Complaint:</strong> {dispatch.reason}</p>
                          <p><strong className="text-slate-800 font-bold">Dispatch Location:</strong> {dispatch.address}</p>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-rose-600">Base Compensation: RM 250</span>
                          {dispatch.etaMinutes ? (
                            <span className="text-[10px] text-slate-400 font-mono font-bold">ETA: {dispatch.etaMinutes} mins</span>
                          ) : null}
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          {dispatch.dispatchStatus === 'Pending Dispatch' && (
                            <button
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'En-Route')}
                              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black py-2 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Ambulance className="h-4 w-4" />
                              <span>CLAIM EMERGENCY TRANSIT</span>
                            </button>
                          )}

                          {dispatch.dispatchStatus === 'En-Route' && isClaimedByMe && (
                            <button
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'Arrived')}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <MapPin className="h-4 w-4" />
                              <span>📍 MARK ARRIVED AT PATIENT</span>
                            </button>
                          )}

                          {dispatch.dispatchStatus === 'Arrived' && isClaimedByMe && (
                            <button
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'Completed')}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>✅ COMPLETE CRITICAL CARE DISPATCH</span>
                            </button>
                          )}

                          {isClaimedByOthers && (
                            <span className="text-xs text-slate-400 font-bold block text-center italic py-1">Claimed by another nearby professional</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scheduled Clinical Consultations List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4.5 w-4.5 text-blue-600" />
                  Scheduled Consultations ({myBookings.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Review appointments booked by patients and generate e-prescriptions upon consultation completion.</p>
              </div>

              {myBookings.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Clock className="h-10 w-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Appointments Booked Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    When patients register on your public clinical page, their details, symptoms, and scheduling block will compile here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((booking) => {
                    const isUpcoming = booking.status === 'Upcoming';

                    return (
                      <div key={booking.id} className="border border-slate-150 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-slate-300 transition-colors">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700 text-xs">
                              {booking.patientName[0]}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800">{booking.patientName}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold font-mono">ID Ref: {booking.patientId}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 max-w-md bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Date & Slot</span>
                              <span className="text-slate-800 font-extrabold">{booking.date}</span> &bull; <span className="font-mono text-slate-700 font-bold">{booking.timeSlot}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Consultation Mode</span>
                              <span className="text-slate-800 font-extrabold">{booking.mode}</span>
                            </div>
                          </div>

                          {booking.symptoms && (
                            <p className="text-xs text-slate-600">
                              <strong className="text-slate-800 font-bold">Patient Complaint:</strong> "{booking.symptoms}"
                            </p>
                          )}

                          {booking.prescription && (
                            <div className="bg-emerald-50/30 border border-emerald-150 p-3 rounded-xl text-xs space-y-1.5 max-w-xl">
                              <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
                                <Check className="h-4 w-4 text-emerald-600" />
                                Issued E-Prescription
                              </div>
                              <p><strong className="text-slate-800 font-bold">Diagnosis:</strong> {booking.prescription.diagnosis}</p>
                              <p><strong className="text-slate-800 font-bold">Medicines:</strong> {booking.prescription.medicines}</p>
                              <p><strong className="text-slate-800 font-bold">Instructions:</strong> {booking.prescription.instructions}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-start sm:items-end justify-between shrink-0 gap-3">
                          <div className="space-y-1 sm:text-right">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Consultation Fee</span>
                            <span className="text-sm font-black text-slate-900">RM {booking.fee}</span>
                            <span className={`block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-center border mt-1 ${
                              isUpcoming 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {booking.status}
                            </span>
                          </div>

                          {isUpcoming && (
                            <button
                              onClick={() => {
                                setSelectedBookingForPrescribe(booking);
                                setPrescribeDiagnosis('');
                                setPrescribeMeds('');
                                setPrescribeInstructions('');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                            >
                              <FileSignature className="h-3.5 w-3.5" />
                              <span>Diagnose & Prescribe</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: PERFORMANCE & REVENUE */}
        {activeDashboardTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            {/* Dynamic Metric Grid */}
            {(() => {
              const completedBookings = myBookings.filter(b => b.status === 'Completed');
              const completedDispatches = dispatches.filter(d => d.doctorId === matchedProfile.id && d.dispatchStatus === 'Completed');
              
              const totalBookingsEarned = completedBookings.reduce((sum, b) => sum + b.fee, 0);
              const totalDispatchesEarned = completedDispatches.length * 250;
              const totalEarnings = totalBookingsEarned + totalDispatchesEarned;
              const totalAttendedCount = completedBookings.length + completedDispatches.length;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Generated Income</span>
                      <span className="text-2xl font-black text-slate-900">RM {totalEarnings.toLocaleString()}</span>
                      <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        <span>100% practitioner distribution</span>
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Patients Attended</span>
                      <span className="text-2xl font-black text-slate-900">{totalAttendedCount} Patients</span>
                      <p className="text-[9px] text-slate-500 font-semibold">{completedBookings.length} consults &bull; {completedDispatches.length} dispatches</p>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Practice Rating</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{matchedProfile.rating}</span>
                        <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                      </div>
                      <p className="text-[9px] text-slate-500 font-semibold">Based on {myReviews.length} clinical ratings</p>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Clinical Accuracy</span>
                      <span className="text-2xl font-black text-emerald-600">99.8%</span>
                      <p className="text-[9px] text-slate-500 font-semibold">Government standard audit cleared</p>
                    </div>
                  </div>

                  {/* Earnings Visualizer Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Revenue Stream Distribution</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">Visualizing contribution proportions across clinical channels</p>
                    </div>

                    <div className="space-y-3 max-w-xl text-xs font-bold text-slate-700">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Video Telehealth Booking (RM {completedBookings.filter(b => b.mode === ConsultationMode.VIDEO).reduce((sum, b) => sum + b.fee, 0)})</span>
                          <span>{totalEarnings > 0 ? Math.round((completedBookings.filter(b => b.mode === ConsultationMode.VIDEO).reduce((sum, b) => sum + b.fee, 0) / totalEarnings) * 100) : 0}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${totalEarnings > 0 ? (completedBookings.filter(b => b.mode === ConsultationMode.VIDEO).reduce((sum, b) => sum + b.fee, 0) / totalEarnings) * 100 : 0}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span>In-Person Clinic consultations (RM {completedBookings.filter(b => b.mode === ConsultationMode.IN_PERSON).reduce((sum, b) => sum + b.fee, 0)})</span>
                          <span>{totalEarnings > 0 ? Math.round((completedBookings.filter(b => b.mode === ConsultationMode.IN_PERSON).reduce((sum, b) => sum + b.fee, 0) / totalEarnings) * 100) : 0}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${totalEarnings > 0 ? (completedBookings.filter(b => b.mode === ConsultationMode.IN_PERSON).reduce((sum, b) => sum + b.fee, 0) / totalEarnings) * 100 : 0}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Urgent On-Call Ambulance Dispatches (RM {totalDispatchesEarned})</span>
                          <span>{totalEarnings > 0 ? Math.round((totalDispatchesEarned / totalEarnings) * 100) : 0}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${totalEarnings > 0 ? (totalDispatchesEarned / totalEarnings) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient History Logs */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Clinical Attended Ledger</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">Chronological history log of all patients evaluated and treatments finalized</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="pb-2.5">Patient Name</th>
                            <th className="pb-2.5">Channel Mode</th>
                            <th className="pb-2.5">Final Diagnosis</th>
                            <th className="pb-2.5">Date Completed</th>
                            <th className="pb-2.5 text-right">Fee Distributed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {completedBookings.map(b => (
                            <tr key={b.id} className="hover:bg-slate-55/20 transition-colors">
                              <td className="py-3 font-extrabold text-slate-800">{b.patientName}</td>
                              <td className="py-3 text-slate-700">{b.mode}</td>
                              <td className="py-3 font-semibold max-w-[200px] truncate">{b.prescription?.diagnosis}</td>
                              <td className="py-3">{b.date}</td>
                              <td className="py-3 text-right font-black text-slate-900">RM {b.fee}</td>
                            </tr>
                          ))}
                          {completedDispatches.map(d => (
                            <tr key={d.id} className="hover:bg-slate-55/20 transition-colors">
                              <td className="py-3 font-extrabold text-slate-800">{d.patientName}</td>
                              <td className="py-3 text-rose-600 font-bold">🚨 Urgent Dispatch</td>
                              <td className="py-3 font-semibold">{d.reason}</td>
                              <td className="py-3">{d.timestamp.split(' ')[0]}</td>
                              <td className="py-3 text-right font-black text-slate-900">RM 250</td>
                            </tr>
                          ))}
                          {completedBookings.length === 0 && completedDispatches.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">No finalized treatments recorded in the current billing cycle.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

            {/* Full-screen Public Profile Preview Modal */}
            {showPublicProfilePreview && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
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
                      className="h-24 w-24 rounded-full object-cover border-4 border-teal-500/20 shadow-md mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <h3 className="text-xl font-black text-slate-900">{matchedProfile.name}</h3>
                        {isVerified && <Shield className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500" />}
                      </div>
                      <p className="text-xs font-bold text-teal-700 uppercase tracking-widest">{matchedProfile.specialization}</p>
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
                            <span key={cert} className="bg-teal-50 text-teal-800 border border-teal-100 text-[10px] font-bold px-2.5 py-1 rounded-md">
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
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Close Public Profile Preview
                    </button>
                  </div>

                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER THE MULTI-STEP REGISTRATION WIZARD FOR UNREGISTERED USERS ---
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 max-w-3xl mx-auto" id="verification-terminal-wizard">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900">National Credential Onboarding</h2>
          <p className="text-xs text-slate-500">Register as a licensed physician or certified registered nurse</p>
        </div>
      </div>

      {/* Premium Stepped Progress Guide */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mb-6 space-y-3 shadow-3xs select-none">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Award className="h-4 w-4 text-blue-600" />
            Onboarding Progress Guide
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-bold">Step {step > 3 ? 3 : step} of 3</span>
        </div>
        
        <div className="flex items-center justify-between relative">
          {/* Step 1 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 1 
                ? 'bg-blue-600 border border-blue-600 text-white shadow-3xs' 
                : step === 1 
                  ? 'bg-white border-2 border-blue-500 text-blue-600 ring-4 ring-blue-500/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 1 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">1</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 1 ? 'text-blue-600' : 'text-slate-500'}`}>Professional Info</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 transition-all ${step > 1 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 2 
                ? 'bg-blue-600 border border-blue-600 text-white shadow-3xs' 
                : step === 2 
                  ? 'bg-white border-2 border-blue-500 text-blue-600 ring-4 ring-blue-500/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 2 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">2</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 2 ? 'text-blue-600' : 'text-slate-500'}`}>Licensing Credentials</span>
          </div>

          <div className={`flex-1 h-0.5 mx-3 transition-all ${step > 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              step > 3
                ? 'bg-blue-600 border border-blue-600 text-white shadow-3xs'
                : step === 3 
                  ? 'bg-white border-2 border-blue-500 text-blue-600 ring-4 ring-blue-500/10 font-black' 
                  : 'bg-white border border-slate-200 text-slate-450'
            }`}>
              {step > 3 ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <span className="text-xs font-black">3</span>}
            </div>
            <span className={`text-[10px] font-black uppercase hidden sm:inline ${step === 3 ? 'text-blue-600' : 'text-slate-500'}`}>Certificate Upload</span>
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-750"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-700"
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
                  className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-705"
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
                  className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-705"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-705"
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
              className="w-full text-xs border border-slate-250 rounded-xl p-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700 placeholder-slate-400"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!name || !experienceYears}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-705"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-black font-mono text-slate-850"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-705"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-705"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Active Practice City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-extrabold text-slate-700"
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
                className="w-full text-xs border border-slate-250 rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-705"
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
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
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

          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 leading-relaxed font-semibold flex gap-2">
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
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold px-8 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
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
              Dr./Sister {name}, your registry profile has been established on MediCert. 
              Admin moderators will complete verification of your state license number <strong>{licenseNumber}</strong> shortly.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 max-w-sm mx-auto p-4 rounded-xl text-xs text-left space-y-2">
            <div className="flex justify-between font-bold text-slate-755">
              <span>Onboarding Ref ID:</span>
              <code className="font-mono text-blue-800">{success?.id}</code>
            </div>
            <div className="flex justify-between font-semibold text-slate-600">
              <span>SEO Slug Allocated:</span>
              <code className="text-[10px] text-blue-700 font-mono">{success?.seoSlug}</code>
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
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Submit Another Application
          </button>
        </div>
      )}
    </div>
  );
}
