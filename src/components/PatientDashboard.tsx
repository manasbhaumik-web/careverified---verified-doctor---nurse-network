import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Heart, Activity, Sparkles, Plus, Trash2, Clock, FileText, 
  Stethoscope, MapPin, Star, BadgeCheck, RefreshCw, PlusCircle, 
  CheckCircle2, Printer, Video, BookOpen, HeartPulse, Info, 
  TrendingUp, User, Phone, Mail, FileSignature, Eye, Check, X, FolderHeart, ShieldCheck, Ambulance,
  Lock, UserCheck, ScanLine, Bell, ArrowRight
} from 'lucide-react';
import { DoctorProfile, NurseProfile, Booking, UserRole, ConsultationMode, OnCallDispatch } from '../types';
import MedicalHistory from './MedicalHistory';
import DoctorOnCallModal from './DoctorOnCallModal';
import AppointmentsTab from './patient/AppointmentsTab';
import PrescriptionsTab from './patient/PrescriptionsTab';
import VitalsTab from './patient/VitalsTab';
import SavedTab from './patient/SavedTab';
import PageBanner from './PageBanner';

interface PatientDashboardProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  professionals: (DoctorProfile | NurseProfile)[];
  onSelectProfessional: (id: string) => void;
  onNavigateToMessages: () => void;
}

interface VitalsRecord {
  id: string;
  date: string;
  time: string;
  systolic: number;
  diastolic: number;
  bloodSugar: number;
  heartRate: number;
  mood: string;
  notes: string;
}

export default function PatientDashboard({
  bookings,
  setBookings,
  professionals,
  onSelectProfessional,
  onNavigateToMessages
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'prescriptions' | 'vitals' | 'saved' | 'records'>('appointments');
  
  // Doctor on Call States
  const [showOnCallModal, setShowOnCallModal] = useState<boolean>(false);
  const [activeDispatch, setActiveDispatch] = useState<OnCallDispatch | null>(null);
  const [dispatches, setDispatches] = useState<OnCallDispatch[]>(() => {
    try {
      const saved = localStorage.getItem('medi_dispatches');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('medi_dispatches', JSON.stringify(dispatches));
    const active = dispatches.find(d => d.dispatchStatus !== 'Completed');
    if (active) {
      setActiveDispatch(active);
    } else {
      setActiveDispatch(null);
    }
  }, [dispatches]);

  const handleDispatchCreated = (dispatch: OnCallDispatch) => {
    setDispatches([dispatch, ...dispatches]);
    setActiveDispatch(dispatch);
  };

  const handleUpdateDispatchStatus = (dispatchId: string, status: OnCallDispatch['dispatchStatus'], eta: number) => {
    setDispatches(prev => prev.map(d => {
      if (d.id === dispatchId) {
        return { ...d, dispatchStatus: status, etaMinutes: eta };
      }
      return d;
    }));
  };
  
  const [userName, setUserName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('medi_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.name) return u.name;
      }
    } catch (e) {}
    return 'Ahmad Fauzi Bin Ramli';
  });
  const [selectedModalProf, setSelectedModalProf] = useState<DoctorProfile | NurseProfile | null>(null);
  
  // Local state for Saved Practitioners
  const [savedIds, setSavedIds] = useState<string[]>([]);
  
  // Vitals State
  const [vitalsList, setVitalsList] = useState<VitalsRecord[]>([]);
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [bloodSugar, setBloodSugar] = useState<number>(95);
  const [heartRate, setHeartRate] = useState<number>(72);
  const [mood, setMood] = useState<string>('Energetic');
  const [vitalsNotes, setVitalsNotes] = useState<string>('');
  const [vitalsSuccess, setVitalsSuccess] = useState<boolean>(false);

  // Wellness Journal State
  const [journalEntry, setJournalEntry] = useState<string>('');
  const [journalFeedback, setJournalFeedback] = useState<string | null>(null);
  const [journalFeedbackLoading, setJournalFeedbackLoading] = useState<boolean>(false);

  // Prescription Modal State
  const [selectedPrescriptionBooking, setSelectedPrescriptionBooking] = useState<Booking | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);

  // Video Consultation Room State
  const [activeVideoBooking, setActiveVideoBooking] = useState<Booking | null>(null);
  const [videoConnected, setVideoConnected] = useState<boolean>(false);
  const [videoTimer, setVideoTimer] = useState<number>(0);
  const [videoMuted, setVideoMuted] = useState<boolean>(false);
  const [cameraOff, setCameraOff] = useState<boolean>(false);

  // E-Prescription Draft and Generation Modal State
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [prescPatientName, setPrescPatientName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('medi_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.name) return u.name;
      }
    } catch (e) {}
    return 'Ahmad Fauzi Bin Ramli';
  });
  const [prescPatientEmail, setPrescPatientEmail] = useState<string>('swarnabhaumik@gmail.com');
  const [prescPatientPhone, setPrescPatientPhone] = useState<string>('+60-12-345-6789');
  
  // Available doctors for selection
  const doctorsList = professionals.filter(p => p.role === UserRole.DOCTOR);
  const [prescDoctorId, setPrescDoctorId] = useState<string>(doctorsList[0]?.id || 'doc-1');
  const [prescDiagnosis, setPrescDiagnosis] = useState<string>('Acute Upper Respiratory Tract Infection (URTI)');
  
  // Custom medicine list builder
  const [medsList, setMedsList] = useState<{name: string; dosage: string; frequency: string; duration: string;}[]>([
    { name: 'Paracetamol', dosage: '500mg', frequency: 'Three times daily (TDS)', duration: '5 days' },
    { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily (TDS)', duration: '7 days' }
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('Three times daily (TDS)');
  const [newMedDuration, setNewMedDuration] = useState('5 days');
  const [prescInstructions, setPrescInstructions] = useState<string>('To be taken after meals. Complete the course of antibiotics if prescribed. Drink plenty of warm water.');
  
  // Signature States
  const [signingMethod, setSigningMethod] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState<string>('');
  const [isSigned, setIsSigned] = useState<boolean>(false);

  // Drawing signature states
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setIsSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // dark blue
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
    setIsSigned(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  const handleAddMedicineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedDosage.trim()) return;
    setMedsList(prev => [
      ...prev,
      {
        name: newMedName.trim(),
        dosage: newMedDosage.trim(),
        frequency: newMedFrequency,
        duration: newMedDuration
      }
    ]);
    setNewMedName('');
    setNewMedDosage('');
  };

  const handleRemoveMedicineItem = (index: number) => {
    setMedsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleIssueEPrescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (medsList.length === 0) {
      alert("Please add at least one medication to the prescription.");
      return;
    }
    const selectedDoc = professionals.find(p => p.id === prescDoctorId) || professionals[0];
    const compiledMedicines = medsList.map(m => `💊 Paed/Med: ${m.name} (${m.dosage})\n   Frequency: ${m.frequency}\n   Duration: ${m.duration}`).join('\n\n');
    
    const newPrescriptionBooking: Booking = {
      id: `rx-${Math.floor(100000 + Math.random() * 900000)}`,
      professionalId: selectedDoc.id,
      professionalName: selectedDoc.name,
      professionalRole: UserRole.DOCTOR,
      patientId: 'pat-1',
      patientName: prescPatientName,
      patientPhone: prescPatientPhone,
      patientEmail: prescPatientEmail,
      date: new Date().toISOString().split('T')[0],
      timeSlot: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: ConsultationMode.VIDEO,
      fee: selectedDoc.fee,
      paymentStatus: 'Paid',
      status: 'Completed',
      symptoms: prescDiagnosis,
      prescription: {
        diagnosis: prescDiagnosis,
        medicines: compiledMedicines,
        instructions: prescInstructions,
        issuedAt: new Date().toISOString(),
        digitalSignature: signingMethod === 'type' 
          ? `Digitally Certified Token: [${typedSignature || selectedDoc.name}] (MMC Ref: ${selectedDoc.licenseNumber || 'MMC-99213'})`
          : `Hand-drawn Digital Signature [Verified MMC License: ${selectedDoc.licenseNumber || 'MMC-87429'}]`
      }
    };
    
    setBookings(prev => [newPrescriptionBooking, ...prev]);
    
    // Reset Form
    setPrescDiagnosis('Acute Upper Respiratory Tract Infection (URTI)');
    setMedsList([
      { name: 'Paracetamol', dosage: '500mg', frequency: 'Three times daily (TDS)', duration: '5 days' }
    ]);
    setPrescInstructions('To be taken after meals. Complete the course of antibiotics if prescribed. Drink plenty of warm water.');
    setTypedSignature('');
    setIsSigned(false);
    setShowGenerateModal(false);
    
    // Switch to Prescriptions tab to review
    setActiveTab('prescriptions');
  };

  // Load Saved Practitioners & Seed Vitals from LocalStorage on mount
  useEffect(() => {
    // 1. Saved Practitioners
    const saved = JSON.parse(localStorage.getItem('saved_practitioners') || '[]');
    setSavedIds(saved);

    // 2. Vitals seeding if empty
    const savedVitals = localStorage.getItem('vitals_records');
    if (savedVitals) {
      setVitalsList(JSON.parse(savedVitals));
    } else {
      const seedVitals: VitalsRecord[] = [
        {
          id: 'v-1',
          date: '2026-07-08',
          time: '08:30 AM',
          systolic: 118,
          diastolic: 78,
          bloodSugar: 92,
          heartRate: 68,
          mood: 'Restful',
          notes: 'Fasting glucose levels are optimal. Cardiovascular response excellent.'
        },
        {
          id: 'v-2',
          date: '2026-07-06',
          time: '07:00 PM',
          systolic: 124,
          diastolic: 82,
          bloodSugar: 110,
          heartRate: 75,
          mood: 'Tired',
          notes: 'Post-dinner measurements. Felt slight fatigue after work.'
        },
        {
          id: 'v-3',
          date: '2026-07-05',
          time: '12:15 PM',
          systolic: 120,
          diastolic: 80,
          bloodSugar: 98,
          heartRate: 72,
          mood: 'Calm',
          notes: 'Pre-consultation baseline with Dr. Tan Seng Hock.'
        }
      ];
      setVitalsList(seedVitals);
      localStorage.setItem('vitals_records', JSON.stringify(seedVitals));
    }
  }, []);

  // Filter Bookings for Current Patient
  const patientEmail = 'swarnabhaumik@gmail.com';
  const patientBookings = bookings.filter(b => b.patientEmail === patientEmail);
  const upcomingBookings = patientBookings.filter(b => b.status === 'Upcoming');
  const prescriptionBookings = patientBookings.filter(b => b.status === 'Completed' && b.prescription);

  // Filter Saved Professionals
  const savedProfessionals = professionals.filter(p => savedIds.includes(p.id));

  // Handle Log Vitals
  const handleAddVitals = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: VitalsRecord = {
      id: `v-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      systolic,
      diastolic,
      bloodSugar,
      heartRate,
      mood,
      notes: vitalsNotes || 'Routine home self-measurement.'
    };

    const updatedList = [newRecord, ...vitalsList];
    setVitalsList(updatedList);
    localStorage.setItem('vitals_records', JSON.stringify(updatedList));

    setVitalsNotes('');
    setVitalsSuccess(true);
    setTimeout(() => setVitalsSuccess(false), 3000);
  };

  // Delete vital record
  const handleDeleteVital = (id: string) => {
    const updated = vitalsList.filter(v => v.id !== id);
    setVitalsList(updated);
    localStorage.setItem('vitals_records', JSON.stringify(updated));
  };

  // Handle removing a saved practitioner
  const handleRemoveSaved = (id: string) => {
    const updated = savedIds.filter(savedId => savedId !== id);
    setSavedIds(updated);
    localStorage.setItem('vitals_records', JSON.stringify(updated));
    localStorage.setItem('saved_practitioners', JSON.stringify(updated));
  };

  // Calculate clinical feedback thresholds
  const getBPFeedback = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) return { label: 'Optimal Normal', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', desc: 'Blood pressure is in the ideal healthy range.' };
    if (sys >= 120 && sys <= 129 && dia < 80) return { label: 'Elevated BP', color: 'text-amber-600 bg-amber-50 border-amber-100', desc: 'Slightly elevated. Monitor sodium intake and stay hydrated.' };
    if (sys >= 130 || dia >= 80) return { label: 'Stage 1 Hypertension', color: 'text-rose-600 bg-rose-50 border-rose-100', desc: 'Vitals indicate high blood pressure. Share these metrics with Dr. Ananya Sen.' };
    return { label: 'Check Baseline', color: 'text-slate-600 bg-slate-50 border-slate-100', desc: 'Consult your health specialist.' };
  };

  const getSugarFeedback = (sugar: number) => {
    if (sugar < 100) return { label: 'Normal Fasting', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', desc: 'Glucose level is healthy.' };
    if (sugar >= 100 && sugar <= 125) return { label: 'Pre-diabetes Range', color: 'text-amber-600 bg-amber-50 border-amber-100', desc: 'Borderline high fasting blood glucose. Limit processed carbs.' };
    return { label: 'Hyperglycemia Risk', color: 'text-rose-600 bg-rose-50 border-rose-100', desc: 'Elevated glucose. Schedule a clinic review.' };
  };

  // Wellness Journal analysis engine (intelligent rule-based feedback aligned with CareVerified medical parameters)
  const handleJournalAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalEntry.trim()) return;

    setJournalFeedbackLoading(true);
    setJournalFeedback(null);

    setTimeout(() => {
      const text = journalEntry.toLowerCase();
      let feedback = "";

      if (text.includes("chest") || text.includes("pain") || text.includes("palpitation") || text.includes("breathe") || text.includes("shortness")) {
        feedback = "⚠️ ALERT: Your entries contain references to cardiovascular discomfort or respiratory changes. Please note that Dr. Siti Aminah Binti Ahmad (Verified Cardiologist) recommends scheduled clinical screenings if these baseline values fluctuate. In case of sudden chest compression or severe acute dyspnea, seek immediate emergency care.";
      } else if (text.includes("cough") || text.includes("fever") || text.includes("throat") || text.includes("cold")) {
        feedback = "🩺 CLINICAL SUMMARY: Your respiratory symptoms align with seasonal triggers. Dr. Tan Seng Hock's prescription history recommends warm steam inhalations twice daily, staying fully hydrated, and monitoring temperature levels. Let us know if symptoms persist beyond 4 days.";
      } else if (text.includes("stress") || text.includes("tired") || text.includes("sleep") || text.includes("anxious") || text.includes("headache")) {
        feedback = "🌸 WELLNESS RECOMMENDATION: Elevated fatigue or sleep deficits can directly elevate your baseline blood pressure. We recommend incorporating a 5-minute deep-breathing cycle. You can schedule a video teleconsultation with our specialist team for a holistic wellness assessment.";
      } else {
        feedback = "✨ VITALITY SCORE: Thank you for logging your health journey. Your systemic levels seem balanced. Regular logging of daily vitals (BP and glucose) is key to preventative healthcare and supports your verified clinical team in prescribing precise treatments.";
      }

      setJournalFeedback(feedback);
      setJournalFeedbackLoading(false);
    }, 1200);
  };

  // Cancel Booking action
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this verified booking? Your consultation fee will be processed for immediate refund.')) return;

    try {
      // Simulate backend update or do localized filtering
      const updatedBookings = bookings.map(b => {
        if (b.id === bookingId) {
          return { ...b, status: 'Cancelled' as const };
        }
        return b;
      });
      setBookings(updatedBookings);
    } catch (err) {
      console.error("Error cancelling booking:", err);
    }
  };

  // Simulated digital prescription printing
  const handlePrintPrescription = () => {
    setIsPrinting(true);
    setPrintSuccess(false);
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 3000);
    }, 1800);
  };

  // Telehealth Video Call Session Controls
  const handleStartVideoCall = (booking: Booking) => {
    setActiveVideoBooking(booking);
    setVideoConnected(false);
    setVideoTimer(0);
    // Connect after 2.5 seconds
    setTimeout(() => {
      setVideoConnected(true);
    }, 2500);
  };

  // Video call timer tick
  useEffect(() => {
    let interval: any = null;
    if (activeVideoBooking && videoConnected) {
      interval = setInterval(() => {
        setVideoTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVideoBooking, videoConnected]);

  const formatVideoTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndVideoCall = () => {
    setActiveVideoBooking(null);
    setVideoConnected(false);
    setVideoTimer(0);
  };

  const greetingText = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const patientTabs: { id: 'appointments' | 'prescriptions' | 'vitals' | 'records' | 'saved'; label: string; icon: React.ComponentType<any>; count?: number }[] = [
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: upcomingBookings.length },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, count: prescriptionBookings.length },
    { id: 'vitals', label: 'Vitals & Logs', icon: Activity },
    { id: 'records', label: 'Medical History', icon: FolderHeart },
    { id: 'saved', label: 'Saved Docs', icon: Heart, count: savedProfessionals.length }
  ];
  const handlePatientTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const ids = patientTabs.map(t => t.id);
    const currentIndex = ids.indexOf(activeTab);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ids.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = ids.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(ids[nextIndex]);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-8" id="patient-dashboard-root">
      
      {/* EXECUTIVE CRIMSON METRIC BANNER (CONCEPT 3) */}
      <div className="bg-gradient-to-r from-[#FFF1F2] via-[#FFF5F5] to-[#FFE4E6] border-l-8 border-[#DC2626] border-y border-r border-[#FECDD3] text-slate-900 rounded-none p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#DC2626] text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>MedCred Verified Health Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {greetingText}, <span className="underline decoration-rose-400">{userName}</span>
          </h1>
          <p className="text-xs text-slate-600 font-medium max-w-xl">
            Centralized clinical telemetry, verified e-prescriptions, and 24/7 doctor-on-call emergency triage.
          </p>
        </div>

        {/* High-Contrast Executive Metric Strip & Quick Actions */}
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="grid grid-cols-4 gap-3 bg-white/90 backdrop-blur-xs p-3 border border-[#FECDD3] rounded-none text-center min-w-[320px] shadow-xs">
            <div>
              <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">{upcomingBookings.length}</span>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Bookings</span>
            </div>
            <div className="border-l border-rose-200">
              <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">{prescriptionBookings.length}</span>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Rx Active</span>
            </div>
            <div className="border-l border-rose-200">
              <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">{vitalsList.length}</span>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Vitals Logs</span>
            </div>
            <div className="border-l border-rose-200">
              <span className="font-mono text-xl font-black text-[#DC2626] block leading-tight">60%</span>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">Profile</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowOnCallModal(true)} 
              className="px-4 py-3 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black rounded-none border border-[#DC2626] transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer shadow-sm hover:shadow-md"
            >
              <Ambulance className="h-4 w-4 text-white animate-bounce" />
              <span>{activeDispatch ? 'Track Triage' : 'Request On-Call'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Best Action Card */}
        {upcomingBookings.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#FECDD3] rounded-none p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-[#DC2626] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#FFF0F2] p-2.5 rounded-none text-[#DC2626] shrink-0 border border-[#FECDD3]">
                <Bell className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Next Best Action</h4>
                <p className="text-sm font-bold text-[#1E293B]">Telehealth consultation with {upcomingBookings[0].professionalName}</p>
              </div>
            </div>
            {upcomingBookings[0].mode === ConsultationMode.VIDEO ? (
              <button 
                onClick={() => setActiveTab('appointments')}
                className="shrink-0 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-extrabold px-4 py-2.5 rounded-none border border-[#B91C1C] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Video className="h-4 w-4" />
                Join Call
              </button>
            ) : (
              <button 
                onClick={() => setActiveTab('appointments')}
                className="shrink-0 bg-white hover:bg-[#FFE4E6] text-[#1E293B] border border-[#FECDD3] text-[11px] font-extrabold px-4 py-2.5 rounded-none transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                View Details
                <ArrowRight className="h-3.5 w-3.5 text-[#DC2626]" />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#FECDD3] rounded-none p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-[#DC2626] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#FFF0F2] p-2.5 rounded-none text-[#DC2626] shrink-0 border border-[#FECDD3]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Next Best Action</h4>
                <p className="text-sm font-bold text-[#1E293B]">Log today's biometric vitals for your health profile.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('vitals')}
              className="shrink-0 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-extrabold px-4 py-2.5 rounded-none border border-[#B91C1C] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              Log Vitals
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}

        {/* Recent Activity Card */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#FECDD3] rounded-none p-5 flex items-center justify-between shadow-xs hover:border-[#DC2626] transition-all"
        >
           <div className="flex items-center gap-4">
              <div className="bg-[#FFF0F2] p-2.5 rounded-none text-[#DC2626] shrink-0 border border-[#FECDD3]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Recent Activity</h4>
                <p className="text-sm font-bold text-[#1E293B]"><span className="font-mono tabular-nums text-[#DC2626]">{prescriptionBookings.length}</span> Active E-Prescriptions</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('prescriptions')}
              className="shrink-0 text-[#DC2626] bg-white border border-[#FECDD3] hover:bg-[#FFE4E6] text-[11px] font-extrabold px-4 py-2.5 rounded-none transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              View
            </button>
        </motion.div>
      </div>

      {/* TAB NAVIGATION */}
      <div
        role="tablist"
        aria-label="Patient hub sections"
        className="flex flex-wrap gap-2 border border-[#FECDD3] rounded-none sticky top-20 bg-[#FFF0F2]/95 backdrop-blur-md z-30 p-1.5 shadow-xs"
      >
        {patientTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id as any)}
            onKeyDown={handlePatientTabKeyDown}
            className={`shrink-0 py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 cursor-pointer rounded-none border transition-all ${
              activeTab === tab.id
                ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs'
                : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-[#DC2626]' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-[#DC2626] text-white leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <div className="space-y-6">

        {/* TAB 1: UPCOMING BOOKINGS */}
        {activeTab === 'appointments' && (
          <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments" tabIndex={0}>
            <AppointmentsTab
              upcomingBookings={upcomingBookings}
              professionals={professionals}
              onCancelBooking={handleCancelBooking}
              onStartVideoCall={handleStartVideoCall}
            />
          </div>
        )}

        {/* TAB 2: MY E-PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div id="panel-prescriptions" role="tabpanel" aria-labelledby="tab-prescriptions" tabIndex={0}>
            <PrescriptionsTab
              prescriptionBookings={prescriptionBookings}
              onViewPrescription={setSelectedPrescriptionBooking}
              onRequestRefill={() => setShowGenerateModal(true)}
            />
          </div>
        )}

        {/* TAB 3: HEALTH TRACKING & VITALS JOURNEY */}
        {activeTab === 'vitals' && (
          <div id="panel-vitals" role="tabpanel" aria-labelledby="tab-vitals" tabIndex={0}>
            <VitalsTab
              vitalsList={vitalsList}
              systolic={systolic}
              setSystolic={setSystolic}
              diastolic={diastolic}
              setDiastolic={setDiastolic}
              bloodSugar={bloodSugar}
              setBloodSugar={setBloodSugar}
              heartRate={heartRate}
              setHeartRate={setHeartRate}
              mood={mood}
              setMood={setMood}
              vitalsNotes={vitalsNotes}
              setVitalsNotes={setVitalsNotes}
              vitalsSuccess={vitalsSuccess}
              onSubmitVitals={handleAddVitals}
              onDeleteVital={handleDeleteVital}
              journalEntry={journalEntry}
              setJournalEntry={setJournalEntry}
              journalFeedback={journalFeedback}
              journalFeedbackLoading={journalFeedbackLoading}
              onSubmitJournal={handleJournalAnalysis}
              getBPFeedback={getBPFeedback}
              getSugarFeedback={getSugarFeedback}
            />
          </div>
        )}

        {/* TAB 4: SAVED PRACTITIONERS */}
        {activeTab === 'saved' && (
          <div id="panel-saved" role="tabpanel" aria-labelledby="tab-saved" tabIndex={0}>
            <SavedTab
              savedProfessionals={savedProfessionals}
              onRemoveSaved={handleRemoveSaved}
              onNavigateToMessages={onNavigateToMessages}
              onSelectProfessional={onSelectProfessional}
              onVerifyCredentials={setSelectedModalProf}
            />
          </div>
        )}

        {/* TAB 5: SECURED MEDICAL RECORDS / CLINICAL HISTORY */}
        {activeTab === 'records' && (
          <div id="panel-records" role="tabpanel" aria-labelledby="tab-records" tabIndex={0} className="space-y-6 animate-fade-in bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="border-b border-slate-150 pb-3.5">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FolderHeart className="h-4.5 w-4.5 text-indigo-600" />
                Medical Record Ledger
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Archived clinical notes, diagnostics reports, and historic treatment trails.
              </p>
            </div>
            <MedicalHistory />
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL: FULL E-PRESCRIPTION VIEW SLIP       */}
      {/* ========================================== */}
      {selectedPrescriptionBooking && (
        <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-xl shadow-xl overflow-hidden animate-slide-down flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-blue-700 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide">Verified Digital Rx Slip</h4>
              </div>
              <button 
                onClick={() => setSelectedPrescriptionBooking(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Print feedback alerts */}
            {printSuccess && (
              <div className="bg-emerald-50 border-b border-emerald-100 p-3 text-xs text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                Prescription downloaded successfully! PDF digital manifest ready.
              </div>
            )}

            {/* Prescription Slip Body */}
            <div className="p-8 overflow-y-auto space-y-8 flex-1 text-slate-800 bg-white relative" id="prescription-printable-area">
              
              {/* Official Watermark */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden z-0">
                <ShieldCheck className="h-96 w-96 text-slate-900 rotate-[-20deg]" />
              </div>

              <div className="relative z-10">
                {/* Rx Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-700 text-teal-100 p-2.5 rounded-xl">
                      <Stethoscope className="h-6 w-6" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-xl font-black text-teal-950 leading-none">MedCred</h3>
                      <span className="text-[11px] font-extrabold text-teal-700 uppercase tracking-[0.2em] block">Verified Medical Network</span>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded-md">
                      <Lock className="h-3 w-3" />
                      SECURE DIGITAL RX
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono font-bold tracking-wider">REF: {selectedPrescriptionBooking.id.toUpperCase()}</p>
                    <p className="text-xs text-slate-400 font-medium">{new Date(selectedPrescriptionBooking.prescription?.issuedAt || Date.now()).toLocaleString()}</p>
                  </div>
                </div>

                {/* Patient and Professional metadata */}
                <div className="grid grid-cols-2 gap-0 border-b border-slate-200 my-6">
                  <div className="space-y-1.5 border-r border-slate-200 pr-6 pb-6">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Patient Details</span>
                    <p className="text-sm font-black text-slate-900">{selectedPrescriptionBooking.patientName}</p>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5"><Phone className="h-3 w-3"/> {selectedPrescriptionBooking.patientPhone}</span>
                      <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5"><Mail className="h-3 w-3"/> {selectedPrescriptionBooking.patientEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 pl-6 pb-6">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Prescriber Details</span>
                    <p className="text-sm font-black text-slate-900">{selectedPrescriptionBooking.professionalName}</p>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5"><UserCheck className="h-3 w-3"/> Verified {selectedPrescriptionBooking.professionalRole}</span>
                      <span className="text-slate-500 text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-max">MMC ID: MMC-87429</span>
                    </div>
                  </div>
                </div>

                {/* Diagnosis detail */}
                <div className="space-y-2 mb-6">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Clinical Diagnosis</span>
                  <p className="text-base font-black text-slate-900 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    {selectedPrescriptionBooking.prescription?.diagnosis}
                  </p>
                </div>

                {/* Rx Medicine grid */}
                <div className="space-y-3 mb-6 relative">
                  <div className="absolute top-0 right-4 text-8xl font-black text-slate-100 pointer-events-none opacity-50 select-none font-serif">Rx</div>
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                    <FileSignature className="h-3.5 w-3.5" />
                    Prescribed Medications
                  </span>
                  <div className="border border-slate-200 rounded-xl p-5 bg-white whitespace-pre-line text-sm font-medium text-slate-800 leading-loose border-l-4 border-l-teal-600 relative z-10 shadow-sm">
                    {selectedPrescriptionBooking.prescription?.medicines}
                  </div>
                </div>

                {/* Instructions detail */}
                {selectedPrescriptionBooking.prescription?.instructions && (
                  <div className="space-y-2 mb-8">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Care Instructions</span>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                      {selectedPrescriptionBooking.prescription.instructions}
                    </p>
                  </div>
                )}

                {/* Signature stamp with digital certificate badge */}
                <div className="border-t-2 border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-end gap-6">
                  <div className="flex flex-col gap-2">
                    {/* Mock QR Code area for verification */}
                    <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 p-1 flex items-center justify-center relative overflow-hidden group cursor-help">
                      <div className="absolute inset-0 bg-slate-200/50 transition-all group-hover:bg-teal-500/10"></div>
                      <div className="w-full h-full border border-slate-300 border-dashed rounded relative flex items-center justify-center">
                        <ScanLine className="h-6 w-6 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 text-[11px] uppercase tracking-wider">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Valid Digital Signature</span>
                    </div>
                  </div>
                  <div className="text-center sm:text-right flex flex-col items-end">
                    <div className="w-40 border-b-2 border-slate-800 pb-2 mb-2">
                      <span className="font-mono text-lg font-black text-slate-700 italic opacity-80" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
                        {selectedPrescriptionBooking.professionalName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Authorized Signature</p>
                    <p className="font-mono text-[11px] font-bold text-slate-400 mt-1">
                      {selectedPrescriptionBooking.prescription?.digitalSignature}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-2.5">
              <button
                onClick={() => setSelectedPrescriptionBooking(null)}
                className="flex-1 border-2 border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close Window
              </button>
              <button
                onClick={handlePrintPrescription}
                disabled={isPrinting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 hover:scale-[1.01] cursor-pointer"
              >
                {isPrinting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating PDF Slip...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    Print & Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: SECURE E-PRESCRIPTION GENERATOR     */}
      {/* ========================================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-slide-down flex flex-col max-h-[92vh]">
            
            {/* Header banner */}
            <div className="bg-blue-700 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
                  <FileSignature className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                    Write Prescription
                  </h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Official digital prescription panel
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Form Container */}
            <form onSubmit={handleIssueEPrescriptionSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
              
              <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl text-xs font-semibold text-blue-900 leading-relaxed">
                ℹ️ Enter medication and dosage details below to issue an e-prescription.
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Column: Patient & Prescribing Practitioner Details */}
                <div className="space-y-4">
                  <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider block border-b border-slate-100 pb-1">
                    1. Patient & Practitioner Details
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Patient Full Name</label>
                    <input 
                      type="text" 
                      value={prescPatientName}
                      onChange={(e) => setPrescPatientName(e.target.value)}
                      className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-2 px-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
                      required
                      placeholder="Enter patient's full name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Patient Email</label>
                      <input 
                        type="email" 
                        value={prescPatientEmail}
                        onChange={(e) => setPrescPatientEmail(e.target.value)}
                        className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-2 px-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
                        required
                        placeholder="patient@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Patient Mobile Phone</label>
                      <input 
                        type="text" 
                        value={prescPatientPhone}
                        onChange={(e) => setPrescPatientPhone(e.target.value)}
                        className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-2 px-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
                        required
                        placeholder="+601xxxxxxxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Prescribing Doctor</label>
                    <select 
                      value={prescDoctorId}
                      onChange={(e) => setPrescDoctorId(e.target.value)}
                      className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-2.5 px-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none cursor-pointer"
                    >
                      {doctorsList.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.specialization})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">MMC Registration Number</label>
                    <div className="w-full text-xs font-mono font-bold bg-slate-100 border-2 border-slate-200 rounded-xl py-2 px-3 text-slate-700">
                      {professionals.find(p => p.id === prescDoctorId)?.licenseNumber || 'MMC-99213'} (Malaysian Medical Council Verified)
                    </div>
                  </div>
                </div>

                {/* Right Column: Diagnosis & Medicine Formulation */}
                <div className="space-y-4">
                  <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider block border-b border-slate-100 pb-1">
                    2. Diagnosis & Medications
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Primary Clinical Diagnosis</label>
                    <input 
                      type="text" 
                      value={prescDiagnosis}
                      onChange={(e) => setPrescDiagnosis(e.target.value)}
                      className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-2 px-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
                      required
                      placeholder="e.g. Hypertension stage 1 / Acute bronchitis"
                    />
                  </div>

                  {/* Added Medications Chip Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Medication List ({medsList.length})
                    </label>
                    {medsList.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        No drugs or medicines added yet. Use formulation builder below.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 bg-slate-50 border border-slate-150 rounded-xl">
                        {medsList.map((med, idx) => (
                          <div 
                            key={idx}
                            className="bg-white border border-slate-200 text-xs font-extrabold text-slate-700 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-xs"
                          >
                            <span className="text-emerald-600">💊</span>
                            <span>{med.name} ({med.dosage}) - {med.frequency} [{med.duration}]</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveMedicineItem(idx)}
                              className="text-slate-400 hover:text-red-600 font-extrabold ml-1 cursor-pointer"
                              title="Delete Item"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Formulation Builder Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase block">Add Medication</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Medicine Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Metformin"
                          value={newMedName}
                          onChange={(e) => setNewMedName(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-2 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Dosage / Strength</label>
                        <input 
                          type="text"
                          placeholder="e.g. 500mg"
                          value={newMedDosage}
                          onChange={(e) => setNewMedDosage(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-2 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Frequency</label>
                        <select
                          value={newMedFrequency}
                          onChange={(e) => setNewMedFrequency(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-1.5 outline-none bg-white cursor-pointer"
                        >
                          <option value="Three times daily (TDS)">Three times daily (TDS)</option>
                          <option value="Twice daily (BD)">Twice daily (BD)</option>
                          <option value="Once daily (OD)">Once daily (OD)</option>
                          <option value="Four times daily (QDS)">Four times daily (QDS)</option>
                          <option value="Before bed (PRN)">Before bed (PRN)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Duration</label>
                        <select
                          value={newMedDuration}
                          onChange={(e) => setNewMedDuration(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1 px-1.5 outline-none bg-white cursor-pointer"
                        >
                          <option value="3 days">3 days</option>
                          <option value="5 days">5 days</option>
                          <option value="7 days">7 days</option>
                          <option value="10 days">10 days</option>
                          <option value="14 days">14 days</option>
                          <option value="1 month">1 month</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMedicineItem}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-1.5 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Add Medication
                    </button>
                  </div>
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Special Instructions</label>
                <textarea 
                  value={prescInstructions}
                  onChange={(e) => setPrescInstructions(e.target.value)}
                  placeholder="e.g. Take plenty of fluids. Do not drink dairy within 2 hours of antibiotics."
                  rows={2}
                  className="w-full text-xs font-semibold border-2 border-slate-200 rounded-xl p-3 bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
                  required
                />
              </div>

              {/* Secure Digital Signature Area */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wide block">
                      3. Digital Signature
                    </span>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Sign below using touch/mouse or type your name
                    </p>
                  </div>

                  <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setSigningMethod('draw')}
                      className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        signingMethod === 'draw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigningMethod('type')}
                      className={`text-xs font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        signingMethod === 'type' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Type Digital Name
                    </button>
                  </div>
                </div>

                {signingMethod === 'draw' ? (
                  <div className="space-y-2">
                    <div className="bg-white border border-slate-200 rounded-xl p-2 relative">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawingTouch}
                        onTouchMove={drawTouch}
                        onTouchEnd={stopDrawing}
                        width={600}
                        height={100}
                        className="w-full h-[100px] block cursor-crosshair bg-slate-50 rounded-lg touch-none border border-slate-100"
                        title="Draw signature with mouse or touch screen"
                      />
                      <span className="absolute bottom-3 left-3 text-[11px] font-bold text-slate-300 pointer-events-none uppercase tracking-wider">
                        Sign within this box
                      </span>
                      {isSigned && (
                        <span className="absolute top-3 right-3 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Signed
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-400 font-semibold">Use your cursor or touch screen to draw your signature.</p>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-xs font-extrabold text-red-600 hover:text-red-800 cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg border border-red-200/50"
                      >
                        Clear Signature Pad
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Doctor Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Dr. Ananya Sen"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        className="w-full text-xs font-bold border-2 border-slate-200 rounded-xl py-2 px-3 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Signature Preview</span>
                      <p className="font-serif italic text-xl text-blue-900 tracking-wide select-none">
                        {typedSignature || (professionals.find(p => p.id === prescDoctorId)?.name || 'Dr. Ananya Sen')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </form>

            {/* Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
              <span className="text-[11px] text-slate-400 font-mono font-bold leading-relaxed max-w-[250px]">
                🔒 Securely processed under Malaysian cyberlaws.
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="border-2 border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel Draft
                </button>
                <button
                  type="button"
                  onClick={handleIssueEPrescriptionSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-md flex items-center gap-1.5 hover:scale-[1.01] cursor-pointer"
                >
                  <FileSignature className="h-4 w-4" />
                  Issue Prescription
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: LIVE TELEHEALTH CONSULTATION ROOM   */}
      {/* ========================================== */}
      {activeVideoBooking && (
        <div className="fixed inset-0 bg-blue-700/95 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-blue-700 rounded-3xl w-full max-w-2xl border border-blue-700 shadow-2xl overflow-hidden aspect-video flex flex-col justify-between relative text-white">
            
            {/* Top Bar overlay */}
            <div className="p-4 bg-gradient-to-b from-blue-800/80 to-transparent flex justify-between items-center z-10 absolute top-0 left-0 right-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span className="bg-rose-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                  LIVE SECURED TELEHEALTH
                </span>
                {videoConnected && (
                  <span className="font-mono text-xs font-bold text-slate-300 ml-2">
                    {formatVideoTimer(videoTimer)}
                  </span>
                )}
              </div>
              <div className="bg-blue-700/60 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-slate-300">
                Patient: {userName} &bull; PDPA Compliant
              </div>
            </div>

            {/* Video Feed Workspace */}
            <div className="flex-1 flex items-center justify-center relative bg-blue-800">
              
              {!videoConnected ? (
                <div className="text-center space-y-4 p-8">
                  <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-200">Establishing Secured Telehealth Room</h4>
                    <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto">
                      Connecting line with verified clinical provider **{activeVideoBooking.professionalName}**... Checking E-E-A-T council licenses...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full">
                  {/* Remote Video Stream (Simulated Practitioner) */}
                  <div className="w-full h-full bg-blue-600 relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={professionals.find(p => p.id === activeVideoBooking.professionalId)?.avatar || "/assets/malaysian_female_doctor.jpg"}
                      alt={activeVideoBooking.professionalName}
                      className="w-full h-full object-cover brightness-95 opacity-90"
                    />
                    
                    {/* Practitioner Name tag */}
                    <div className="absolute bottom-4 left-4 bg-blue-800/70 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs text-xs font-bold">
                      {activeVideoBooking.professionalName} (Consultant)
                    </div>
                  </div>

                  {/* Local Video Stream Pip (Self-view) */}
                  <div className="absolute bottom-4 right-4 w-32 sm:w-40 aspect-video bg-blue-800 border-2 border-blue-500 rounded-xl overflow-hidden shadow-md">
                    {!cameraOff ? (
                      <div className="w-full h-full relative bg-blue-500 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-blue-600 flex items-center justify-center">
                          <User className="h-10 w-10 text-white/50" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-blue-800/60 px-1 text-[10px] rounded text-white font-mono">
                          You (Self)
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-blue-700 flex items-center justify-center text-slate-500">
                        <X className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Call Controls Overlay */}
            <div className="p-4 bg-gradient-to-t from-blue-800/90 to-transparent z-10">
              <div className="flex justify-center items-center gap-3">
                <button
                  onClick={() => setVideoMuted(!videoMuted)}
                  className={`p-3.5 rounded-full border transition-all hover:scale-105 cursor-pointer ${
                    videoMuted 
                      ? 'bg-rose-600 border-rose-500 text-white' 
                      : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/20'
                  }`}
                  title={videoMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  <Phone className="h-5 w-5" />
                </button>
                
                <button
                  onClick={handleEndVideoCall}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-3.5 px-6 rounded-full transition-all shadow-md hover:scale-105 cursor-pointer"
                >
                  End Secure Consultation
                </button>

                <button
                  onClick={() => {
                    setPrescPatientName(activeVideoBooking.patientName);
                    setPrescPatientEmail(activeVideoBooking.patientEmail);
                    setPrescPatientPhone(activeVideoBooking.patientPhone);
                    const docProfile = professionals.find(p => p.name === activeVideoBooking.professionalName);
                    if (docProfile) {
                      setPrescDoctorId(docProfile.id);
                    }
                    setShowGenerateModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3.5 px-6 rounded-full transition-all shadow-md hover:scale-105 cursor-pointer flex items-center gap-1.5"
                  title="Draft digital prescription for active patient"
                >
                  <FileSignature className="h-4 w-4" />
                  Draft E-Prescription
                </button>

                <button
                  onClick={() => setCameraOff(!cameraOff)}
                  className={`p-3.5 rounded-full border transition-all hover:scale-105 cursor-pointer ${
                    cameraOff 
                      ? 'bg-rose-600 border-rose-500 text-white' 
                      : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/20'
                  }`}
                  title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  <Video className="h-5 w-5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Verification Card Lightbox / Modal Popup */}
      {selectedModalProf && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedModalProf(null)}
          id="credentials-modal-backdrop"
        >
          {/* Card Wrapper with responsive scaling */}
          <div 
            className="relative max-w-md w-full scale-100 md:hover:scale-[1.01] transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* The precise, styled card matching user's image with a vibrant teal border */}
            <div 
              className="bg-white border-[3px] border-teal-300 rounded-[28px] p-6 shadow-[0_20px_50px_rgba(13,148,136,0.15)] flex flex-col justify-between relative overflow-hidden"
              style={{ minHeight: '380px' }}
              id="credentials-modal-card"
            >
              {/* Floating Close Button in top corner */}
              <button
                onClick={() => setSelectedModalProf(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                {/* Header layout: Avatar, Name & Specialization, Verified Badge */}
                <div className="flex gap-4 pr-6">
                  {/* Avatar with rounded corners */}
                  <img 
                    src={selectedModalProf.avatar} 
                    alt={selectedModalProf.name}
                    className="h-20 w-20 rounded-2xl object-cover border border-slate-150 shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="space-y-1">
                    {/* Role badge */}
                    <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                      selectedModalProf.role === UserRole.DOCTOR 
                        ? "bg-teal-50 text-teal-800 border-teal-200/60" 
                        : "bg-slate-100 text-slate-800 border-slate-200"
                    }`}>
                      {selectedModalProf.role === UserRole.DOCTOR ? "DOCTOR (MD/MBBS)" : "REGISTERED NURSE (RN)"}
                    </span>
                    
                    {/* Name */}
                    <h3 className="text-lg font-extrabold text-[#c8102e] leading-tight mt-1">
                      {selectedModalProf.name}
                    </h3>
                    
                    {/* Specialty */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mt-1">
                      <Stethoscope className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                      <span>{selectedModalProf.specialization}</span>
                    </div>

                    {/* City */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedModalProf.city}</span>
                    </div>
                  </div>
                </div>

                {/* Verified badge pill */}
                <div className="mt-4 flex justify-between items-center bg-teal-50/10 px-3.5 py-1.5 rounded-xl border border-teal-100/50">
                  <div className="text-xs font-bold text-slate-500">Registry Verification Status</div>
                  <div className="border border-emerald-500/80 text-emerald-600 bg-emerald-50/40 px-3 py-1 rounded-xs text-xs font-bold flex items-center gap-1 shadow-3xs">
                    <span>Verified</span>
                    <span className="text-emerald-500">☑</span>
                  </div>
                </div>

                {/* Quote / Bio Block */}
                <p className="text-[11px] text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-3 mt-4">
                  "{selectedModalProf.bio}"
                </p>

                {/* License credentials details */}
                <div className="bg-slate-50/60 rounded-xl p-3.5 mt-4 space-y-2 border border-slate-150">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {selectedModalProf.role === UserRole.DOCTOR ? "MMC Registration:" : "LJM Nurse Registry:"}
                    </span>
                    <code className="font-mono font-bold text-[11px] text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">{selectedModalProf.licenseNumber}</code>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      Clinical Experience:
                    </span>
                    <span className="font-extrabold text-[11px] text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-3xs">{selectedModalProf.experienceYears} Years</span>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                <div className="flex items-center gap-1 font-extrabold text-slate-700 text-xs">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>{selectedModalProf.rating}</span>
                  <span className="text-slate-400 font-semibold">({selectedModalProf.reviewCount})</span>
                </div>
                
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-extrabold uppercase tracking-wider leading-none">Consultation Fee</span>
                  <span className="text-sm font-extrabold text-teal-800 font-mono mt-1 block">
                    RM {selectedModalProf.fee}
                    <span className="text-xs font-semibold text-slate-500 font-sans">{selectedModalProf.role === UserRole.DOCTOR ? "" : "/hr"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Container Under Card */}
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedModalProf(null)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold rounded-xl border-2 border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSelectProfessional(selectedModalProf.id);
                  setSelectedModalProf(null);
                }}
                className="px-5 py-2.5 bg-[#c8102e] hover:bg-[#a50f2a] text-white text-xs font-extrabold rounded-xl shadow-md shadow-teal-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Full Profile & Appointments</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnCallModal && (
        <DoctorOnCallModal
          professionals={professionals}
          currentUser={(() => {
            try {
              const saved = localStorage.getItem('medi_user');
              if (saved) return JSON.parse(saved);
            } catch (e) {}
            return { name: userName, email: 'swarnabhaumik@gmail.com', role: 'patient' };
          })()}
          onClose={() => setShowOnCallModal(false)}
          onDispatchCreated={handleDispatchCreated}
          activeDispatch={activeDispatch}
          onUpdateDispatchStatus={handleUpdateDispatchStatus}
        />
      )}

    </div>
  );
}
