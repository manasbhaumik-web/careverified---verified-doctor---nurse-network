import ReportPractitioner from './ReportPractitioner';
import VerificationScopeBadge from './VerificationScopeBadge';
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BadgeCheck, Stethoscope, Award, GraduationCap, MapPin, 
  Languages, ShieldAlert, Star, Calendar, 
  CheckCircle2, RefreshCw, Activity, Heart
} from 'lucide-react';
import { ConsultationMode, UserRole, Booking, Review } from '../types';
import PaymentDialog from './PaymentDialog';
import { formatMoney } from '../locale';

interface ProfessionalProfileProps {
  professionalId: string;
  onBack: () => void;
  onNewBookingCreated: (booking: Booking) => void;
  reviews: Review[];
  onNewReviewPosted: (review: Review) => void;
  currentUser: { name: string; email: string; role: string } | null;
}

export default function ProfessionalProfile({ 
  professionalId, 
  onBack, 
  onNewBookingCreated,
  reviews,
  onNewReviewPosted,
  currentUser
}: ProfessionalProfileProps) {
  const [prof, setProf] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Saved / Bookmarked state
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (prof?.id) {
      const saved = JSON.parse(localStorage.getItem('saved_practitioners') || '[]');
      setIsSaved(saved.includes(prof.id));
    }
  }, [prof?.id]);

  const handleToggleSave = () => {
    if (!prof?.id) return;
    const saved = JSON.parse(localStorage.getItem('saved_practitioners') || '[]');
    let updated;
    if (saved.includes(prof.id)) {
      updated = saved.filter((id: string) => id !== prof.id);
      setIsSaved(false);
    } else {
      updated = [...saved, prof.id];
      setIsSaved(true);
    }
    localStorage.setItem('saved_practitioners', JSON.stringify(updated));
  };
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingMode, setBookingMode] = useState<ConsultationMode>(ConsultationMode.IN_PERSON);
  const [symptoms, setSymptoms] = useState('');
  const [shareRecord, setShareRecord] = useState(false);
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; issuer: string; expiry_date: string | null }[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Review Form State
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPunctuality, setReviewPunctuality] = useState(5);
  const [reviewCommunication, setReviewCommunication] = useState(5);
  const [reviewSatisfaction, setReviewSatisfaction] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Load profile data from server API
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/professionals/${professionalId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setProf(data.data);
      }
    } catch (error) {
      console.error("Error loading professional profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [professionalId]);

  useEffect(() => {
    fetch(`/api/professionals/${professionalId}/credentials`).then(r => r.json()).then(d => d.status === 'success' && setCredentials(d.data)).catch(() => {});
    if (currentUser?.role === 'patient') {
      fetch(`/api/reviews/eligibility?professionalId=${professionalId}`).then(r => r.json()).then(d => setCanReview(d.status === 'success' ? d.data.eligible : false)).catch(() => setCanReview(false));
    } else setCanReview(false);
  }, [professionalId, reviewSuccess]);

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingSlot) return;
    holdSlotThenPay();
  };

  // Booking is created first (the slot is held for 15 minutes), then paid for.
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const [bookingError, setBookingError] = useState('');

  const holdSlotThenPay = async () => {
    setBookingLoading(true);
    setBookingError('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: prof.id,
          date: bookingDate,
          timeSlot: bookingSlot,
          mode: bookingMode,
          symptoms,
          shareRecord
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPendingBooking(data.data);
        setShowPayment(true);
      } else {
        setBookingError(data.message || 'Could not book that slot.');
      }
    } catch (err) {
      setBookingError('Server connection error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    if (!pendingBooking) return;
    const paid = { ...pendingBooking, paymentStatus: 'Paid' as const };
    setBookingSuccess(paid);
    onNewBookingCreated(paid);
    setPendingBooking(null);
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment) return;

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: prof.id,
          patientName: reviewName,
          rating: reviewRating,
          punctuality: reviewPunctuality,
          communication: reviewCommunication,
          satisfaction: reviewSatisfaction,
          comment: reviewComment
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        onNewReviewPosted(data.data);
        setReviewSuccess(true);
        setReviewName('');
        setReviewComment('');
        // Reload profile rating aggregate from server
        fetchProfile();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-4 shadow-sm">
        <RefreshCw className="h-8 w-8 text-[color:var(--t-600)] animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold">Retrieving verified credential profile records...</p>
      </div>
    );
  }

  if (!prof) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-4 shadow-sm">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto animate-pulse" />
        <h4 className="text-sm font-bold text-slate-800">Credential profile not found or suspended</h4>
        <button onClick={onBack} className="text-xs font-semibold bg-[color:var(--dark)] text-white rounded-lg py-2 px-4 hover:bg-[color:var(--t-600)]">
          Back to Directory
        </button>
      </div>
    );
  }

  const isDoc = prof.role === UserRole.DOCTOR;
  const filteredReviews = reviews.filter(r => r.professionalId === prof.id);
  const hasReviews = filteredReviews.length > 0;

  // Compute breakdown scores from real reviews only — no fabricated fallback
  const avgOverall = hasReviews
    ? Number((filteredReviews.reduce((s, r) => s + r.rating, 0) / filteredReviews.length).toFixed(1))
    : null;
  const scorePunctuality = hasReviews
    ? Number((filteredReviews.reduce((s, r) => s + r.punctuality, 0) / filteredReviews.length).toFixed(1))
    : null;
  const scoreCommunication = hasReviews
    ? Number((filteredReviews.reduce((s, r) => s + r.communication, 0) / filteredReviews.length).toFixed(1))
    : null;
  const scoreSatisfaction = hasReviews
    ? Number((filteredReviews.reduce((s, r) => s + r.satisfaction, 0) / filteredReviews.length).toFixed(1))
    : null;

  return (
    <div className="space-y-6" id={`professional-profile-${prof.id}`}>
      {/* Back Button & Save Toggle Button */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <button 
          onClick={onBack}
          className="text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Verified Network Directory
        </button>

        <button
          onClick={handleToggleSave}
          className={`text-xs font-bold border rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
            isSaved 
              ? 'bg-rose-50 border-rose-200 text-rose-600' 
              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 font-bold'
          }`}
        >
          <Heart className={`h-4 w-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
          {isSaved ? 'Practitioner Saved' : 'Save Practitioner'}
        </button>
      </div>
      {currentUser?.role === 'patient' && <ReportPractitioner professionalId={prof.id} />}

      {/* Main Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Primary Details Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
              <div className="flex gap-4 items-center">
                <img 
                  src={prof.avatar} 
                  alt={prof.name}
                  className="h-20 w-20 object-cover border border-[color:var(--t-200)] shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[color:var(--ink)]">{prof.name}</h2>
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Verified
                    </span>
                  </div>

                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                    {isDoc ? "Doctor (MMC Registered)" : "Registered Nurse (LJM Registered)"}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-[color:var(--ink-2)] font-semibold">
                    <Stethoscope className="h-4 w-4 text-[color:var(--t-600)]" />
                    <span>{prof.specialization} specialist</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[color:var(--ink-2)] font-semibold">
                    <MapPin className="h-4 w-4 text-[color:var(--t-600)]" />
                    <span>Practicing in {prof.city}</span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right bg-[color:var(--t-bg)] p-4 border border-[color:var(--t-200)] min-w-[150px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Consultation Fee</span>
                <span className="text-xl font-extrabold text-[color:var(--t-700)] block">
                  RM {prof.fee}
                  <span className="text-xs font-normal text-slate-500">{isDoc ? "" : "/hr"}</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">Verified Practitioner</span>
              </div>
            </div>

            {/* License details */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-900 uppercase block tracking-wider">Council Accreditation</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{prof.medicalCouncil || (prof as any).nursingCouncil}</p>
                <VerificationScopeBadge prof={prof as any} className="mt-1" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-900 uppercase block tracking-wider">Annual Practising Certificate</span>
                <code className="text-xs font-bold font-mono text-emerald-950 mt-0.5 block">{prof.licenseNumber}</code>
              </div>
            </div>

            {/* Doctor Bio */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[color:var(--ink)] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[color:var(--t-600)]" />
                Clinical Overview & Experience
              </h3>
              <p className="text-xs text-[color:var(--ink-2)] leading-relaxed bg-[color:var(--t-bg)] p-4 border border-[color:var(--t-200)]">
                "{prof.bio}"
              </p>
              {credentials.length > 0 && (
                <div className="pt-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Verified Medical Credentials</p>
                  <ul className="flex flex-wrap gap-2">
                    {credentials.map((c, i) => (
                      <li key={i} className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-1">{c.name} · {c.issuer}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Education & Achievements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[color:var(--ink)] uppercase tracking-wider flex items-center gap-1">
                  <GraduationCap className="h-4 w-4 text-[color:var(--t-600)]" />
                  Degrees & Certifications
                </h4>
                <ul className="space-y-2 text-xs">
                  {prof.education.map((edu: string, i: number) => (
                    <li key={i} className="flex gap-2 items-center bg-[color:var(--t-bg)] p-2.5 border border-[color:var(--t-200)] font-semibold text-[color:var(--ink)]">
                      <span className="w-1.5 h-1.5 bg-[color:var(--t-600)] shrink-0"></span>
                      {edu}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[color:var(--ink)] uppercase tracking-wider flex items-center gap-1">
                  <Languages className="h-4 w-4 text-[color:var(--t-600)]" />
                  Languages & Spoken Dialects
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {prof.languages.map((lang: string, i: number) => (
                    <span key={i} className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] text-[10px] font-bold py-1 px-2.5">
                      {lang}
                    </span>
                  ))}
                </div>

                <h4 className="text-xs font-bold text-[color:var(--ink)] uppercase tracking-wider flex items-center gap-1 mt-4">
                  <Award className="h-4 w-4 text-[color:var(--t-600)]" />
                  Clinical Seniority
                </h4>
                <p className="text-xs font-extrabold text-[color:var(--ink)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-3 py-1.5 inline-block font-mono">
                  {prof.experienceYears} Years in Clinical Practice
                </p>
              </div>
            </div>
          </div>

          {/* Practice Location with Interactive Coordinates Map */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[color:var(--t-600)] animate-bounce" />
              Practice Locations & Clinic Coordinates
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
              <div>
                <p className="font-extrabold text-slate-800">Primary Outpatient Ward</p>
                <p className="text-slate-500 mt-1 font-medium">{prof.practiceAddress}</p>
              </div>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-emerald-100">
                Active Now
              </span>
            </div>
          </div>

          {/* Feedback & Patient Reviews */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900">
              Patient Feedback & Verified Reviews
            </h3>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="text-center md:border-r border-slate-200/50">
                <span className="text-3xl font-extrabold text-slate-900 block">{avgOverall ?? "New"}</span>
                <div className="flex justify-center my-1">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{filteredReviews.length} Review{filteredReviews.length === 1 ? '' : 's'}</span>
              </div>

              <div className="text-center md:border-r border-slate-200/50">
                <span className="text-lg font-extrabold text-[color:var(--t-700)] block">{hasReviews ? `⭐ ${scorePunctuality} / 5` : '—'}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Punctuality</span>
              </div>

              <div className="text-center md:border-r border-slate-200/50">
                <span className="text-lg font-extrabold text-[color:var(--t-700)] block">{hasReviews ? `⭐ ${scoreCommunication} / 5` : '—'}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Communication</span>
              </div>

              <div className="text-center">
                <span className="text-lg font-extrabold text-[color:var(--t-700)] block">{hasReviews ? `⭐ ${scoreSatisfaction} / 5` : '—'}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mt-1">Satisfaction</span>
              </div>
            </div>

            {/* Review List */}
            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No patient reviews published yet. Be the first to consult and post.</p>
              ) : (
                filteredReviews.map((rev) => (
                  <div key={rev.id} className="border-b border-slate-100 pb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-slate-800">{rev.patientName}</span>
                        {rev.isVerifiedPatient && (
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-extrabold ml-2 px-1.5 py-0.5 rounded border border-emerald-100">
                            Verified Patient
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{rev.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">"{rev.comment}"</p>

                    {rev.replyText && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2 text-xs">
                        <span className="font-bold text-slate-800 block mb-1">Reply from {prof.name}:</span>
                        <p className="text-slate-600 leading-relaxed font-normal">"{rev.replyText}"</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Post a Review Form: only after a completed visit */}
            {canReview === false && !reviewSuccess && (
              <p className="border-t border-slate-100 pt-6 text-xs text-slate-500">Only patients with a completed visit can write a review, so every review comes from a real consultation.</p>
            )}
            {(canReview || reviewSuccess) && (
            <form onSubmit={handlePostReview} className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">You have completed a visit with this specialist. Write a review</h4>
              
              {reviewSuccess ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Review submitted and verified successfully!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="hidden">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="Ahmad Fauzi Bin Ramli"
                        className="w-full text-xs border border-slate-200/80 rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Punctuality (1-5)</label>
                        <select 
                          value={reviewPunctuality} 
                          onChange={(e) => setReviewPunctuality(Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-lg p-1 outline-none"
                        >
                          {[5,4,3,2,1].map(n => <option key={n} value={n}>⭐ {n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Communication (1-5)</label>
                        <select 
                          value={reviewCommunication} 
                          onChange={(e) => setReviewCommunication(Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-lg p-1 outline-none"
                        >
                          {[5,4,3,2,1].map(n => <option key={n} value={n}>⭐ {n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Treatment Satisfaction Comments</label>
                      <textarea
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Write your clinical experience details..."
                        className="w-full text-xs border border-slate-200/80 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[color:var(--t-600)] font-semibold text-slate-700 placeholder-slate-400"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white rounded-xl py-2.5 text-xs font-bold shadow-sm transition-colors"
                    >
                      Publish Patient Review
                    </button>
                  </div>
                </div>
              )}
            </form>
            )}
          </div>
        </div>

        {/* Right Appointment Booking Drawer Column */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-[color:var(--t-200)] p-5 shadow-xs sticky top-24 space-y-6">
            <h3 className="text-sm font-bold text-[color:var(--ink)] flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="h-4 w-4 text-[color:var(--t-600)]" />
              Book Clinical Consultation
            </h3>

            {bookingSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="h-12 w-12 bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[color:var(--ink)]">Appointment Confirmed!</h4>
                  <p className="text-xs text-[color:var(--ink-2)] mt-1 font-medium">Consultation slot secured with {prof.name}</p>
                </div>

                <div className="bg-[color:var(--t-bg)] p-4 text-left border border-[color:var(--t-200)] text-xs space-y-2">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Reference ID:</span>
                    <code className="font-mono text-[color:var(--t-700)]">{bookingSuccess.id}</code>
                  </div>
                  <div className="flex justify-between font-medium text-[color:var(--ink-2)]">
                    <span>Date:</span>
                    <span className="font-bold text-[color:var(--ink)]">{bookingSuccess.date}</span>
                  </div>
                  <div className="flex justify-between font-medium text-[color:var(--ink-2)]">
                    <span>Time Slot:</span>
                    <span className="font-bold text-[color:var(--ink)]">{bookingSuccess.timeSlot}</span>
                  </div>
                  <div className="flex justify-between font-medium text-[color:var(--ink-2)]">
                    <span>Mode:</span>
                    <span className="font-bold text-[color:var(--t-700)]">{bookingSuccess.mode}</span>
                  </div>
                </div>

                <button
                  onClick={() => setBookingSuccess(null)}
                  className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white h-12 text-xs font-bold transition-colors cursor-pointer"
                >
                  Book Another Appointment
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment} className="space-y-4">
                {/* Mode selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-2">Consultation Format</label>
                  <div className="grid grid-cols-1 gap-2">
                    {prof.consultationModes.map((m: any, idx: number) => (
                      <label 
                        key={idx}
                        className={`border p-3 flex justify-between items-center cursor-pointer transition-all ${
                          bookingMode === m 
                            ? "border-[color:var(--t-600)] bg-[color:var(--t-50)] shadow-[inset_0_0_0_1px_var(--t-600)]" 
                            : "border-[color:var(--t-200)] hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="booking-mode" 
                            value={m}
                            checked={bookingMode === m}
                            onChange={() => setBookingMode(m)}
                            className="accent-[color:var(--t-600)]"
                          />
                          <span className="text-xs font-bold text-[color:var(--ink)]">{m}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Calendar Date selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-1.5">Select Appointment Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-12 text-xs border border-[color:var(--t-200)] px-3.5 bg-white outline-none focus:border-[color:var(--t-600)] font-semibold text-[color:var(--ink)]"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Slots selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-1.5">Available Slots</label>
                  <div className="grid grid-cols-2 gap-2">
                    {prof.availability.slots.map((slot: string, idx: number) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setBookingSlot(slot)}
                        className={`h-10 text-[11px] font-bold border transition-all cursor-pointer ${
                          bookingSlot === slot 
                            ? "bg-[color:var(--t-600)] border-[color:var(--t-600)] text-white shadow-xs" 
                            : "bg-white border-[color:var(--t-200)] text-[color:var(--ink-2)] hover:border-[color:var(--t-600)]"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symptoms description box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] mb-1.5">Consultation Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Briefly state symptoms or clinical concerns…"
                    className="w-full text-xs border border-[color:var(--t-200)] p-3 outline-none focus:border-[color:var(--t-600)] text-[color:var(--ink)] placeholder-slate-400 bg-[color:var(--t-bg)]"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs text-[color:var(--ink-2)] cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-[color:var(--t-600)]" checked={shareRecord} onChange={(e) => setShareRecord(e.target.checked)} />
                  <span>Share my medical records (allergies, medications) with this specialist.</span>
                </label>

                {bookingError && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5">{bookingError}</p>}
                <button
                  type="submit"
                  disabled={bookingLoading || !bookingDate || !bookingSlot}
                  className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white h-12 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {bookingLoading ? "Securing appointment slot…" : `Confirm & Pay ${formatMoney(prof.fee)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {showPayment && pendingBooking && (
        <PaymentDialog
          kind="booking"
          refId={pendingBooking.id}
          description={`Appointment with ${prof.name} on ${pendingBooking.date}, ${pendingBooking.timeSlot}`}
          onPaid={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
