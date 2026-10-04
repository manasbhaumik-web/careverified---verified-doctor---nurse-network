import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MapPin, ShieldCheck, Heart, AlertTriangle, User, Phone, 
  Clock, Navigation, CheckCircle2, ChevronRight, HelpCircle, 
  Lock, RefreshCw, Star, ArrowRight, Ambulance, ShieldAlert, CreditCard
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, OnCallDispatch, PaymentReceipt } from '../types';
import PaymentCheckout from './PaymentCheckout';

interface DoctorOnCallModalProps {
  professionals: (DoctorProfile | NurseProfile)[];
  currentUser: { name: string; email: string; role: string; } | null;
  onClose: () => void;
  onDispatchCreated: (dispatch: OnCallDispatch) => void;
  activeDispatch: OnCallDispatch | null;
  onUpdateDispatchStatus: (dispatchId: string, status: OnCallDispatch['dispatchStatus'], eta: number) => void;
}

export default function DoctorOnCallModal({
  professionals,
  currentUser,
  onClose,
  onDispatchCreated,
  activeDispatch,
  onUpdateDispatchStatus
}: DoctorOnCallModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Info, 2: Match/Select, 3: Payment, 4: Tracking (if dispatch active)
  
  // Form fields
  const [patientClass, setPatientClass] = useState<'emergency' | 'elderly'>('elderly');
  const [patientName, setPatientName] = useState(currentUser?.name || 'Ahmad Fauzi Bin Ramli');
  const [patientAge, setPatientAge] = useState<number>(72); // elderly defaults to 72, emergency can change
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientPhone, setPatientPhone] = useState('+60-12-345-6789');
  const [dispatchAddress, setDispatchAddress] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('auto');
  const [isLocating, setIsLocating] = useState(false);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutFee, setCheckoutFee] = useState(180);

  // Simulated GPS tracker state (for step 4)
  const [progressPercent, setProgressPercent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update step if an active dispatch is found
  useEffect(() => {
    if (activeDispatch) {
      setStep(4);
    } else {
      setStep(1);
    }
  }, [activeDispatch]);

  // Handle active dispatch GPS ticks
  useEffect(() => {
    if (activeDispatch && activeDispatch.dispatchStatus !== 'Completed') {
      setProgressPercent(0);
      let currentPercent = 0;
      
      const interval = setInterval(() => {
        currentPercent += 5;
        if (currentPercent > 100) currentPercent = 100;
        setProgressPercent(currentPercent);

        if (currentPercent === 20) {
          onUpdateDispatchStatus(activeDispatch.id, 'En-Route', 12);
        } else if (currentPercent === 70) {
          onUpdateDispatchStatus(activeDispatch.id, 'Arrived', 0);
        } else if (currentPercent === 100) {
          onUpdateDispatchStatus(activeDispatch.id, 'Completed', 0);
          clearInterval(interval);
        }
      }, 3500); // Progress ticks every 3.5s

      return () => clearInterval(interval);
    }
  }, [activeDispatch?.id]);

  const toggleSymptom = (s: string) => {
    if (selectedSymptoms.includes(s)) {
      setSelectedSymptoms(selectedSymptoms.filter(item => item !== s));
    } else {
      setSelectedSymptoms([...selectedSymptoms, s]);
    }
  };

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms([...selectedSymptoms, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const handleSimulateGPS = () => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      setDispatchAddress('Block C-12, Kiara Park Condominium, Jalan Kiara 3, Mont Kiara, 50480 Kuala Lumpur');
    }, 1200);
  };

  const handleNextToMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchAddress.trim()) {
      alert('Please enter or select a dispatch address.');
      return;
    }
    if (selectedSymptoms.length === 0) {
      alert('Please specify or check at least one symptom.');
      return;
    }
    
    // Set appropriate dispatch fee
    const fee = patientClass === 'emergency' ? 250 : 180;
    setCheckoutFee(fee);
    setStep(2);
  };

  // Find qualified doctors who perform Home Visits or General/Emergency Medicine
  const availableDoctors = professionals.filter(p => 
    p.role === UserRole.DOCTOR && 
    (p.specialization.includes('GP') || 
     p.specialization.includes('Physician') || 
     p.specialization.includes('Cardiologist') ||
     p.specialization.includes('Care') ||
     p.specialization.includes('Critical') ||
     p.fee <= 300)
  );

  const handleSelectMatch = (docId: string) => {
    setSelectedDoctorId(docId);
    setStep(3);
  };

  const handlePaymentSuccess = async (receipt: PaymentReceipt) => {
    setShowCheckout(false);

    // Formulate Dispatch Object
    let assignedDoctor: any = null;
    if (selectedDoctorId === 'auto') {
      // Auto-assign first available
      assignedDoctor = availableDoctors[0] || {
        id: 'doc-emergency',
        name: 'Dr. Sarah Binti Al-Jafri',
        avatar: '/assets/malaysian_female_doctor.jpg'
      };
    } else {
      assignedDoctor = availableDoctors.find(d => d.id === selectedDoctorId);
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: assignedDoctor.id,
          patientName,
          patientPhone,
          patientEmail: currentUser?.email || 'patient@example.com',
          date: new Date().toISOString().split('T')[0],
          timeSlot: 'Immediate Emergency Call',
          mode: 'Home Visit',
          fee: checkoutFee,
          symptoms: `🚨 [DOCTOR ON CALL DISPATCH: ${patientClass.toUpperCase()}] Address: ${dispatchAddress}. Symptoms: ${selectedSymptoms.join(', ')}`
        })
      });

      const bData = await response.json();
      if (bData.status === 'success') {
        // Create dispatch record
        const dispatchRecord: OnCallDispatch = {
          id: `DSP-${Math.floor(100000 + Math.random() * 900000)}`,
          patientId: bData.data.patientId,
          patientName,
          patientAge,
          patientPhone,
          patientGender,
          isEmergency: patientClass === 'emergency',
          isElderly: patientClass === 'elderly',
          dispatchAddress,
          symptoms: selectedSymptoms,
          doctorId: assignedDoctor.id,
          doctorName: assignedDoctor.name,
          doctorAvatar: assignedDoctor.avatar,
          fee: checkoutFee,
          paymentId: receipt.paymentId,
          paymentStatus: 'Paid',
          dispatchStatus: 'Pending Dispatch',
          etaMinutes: 15,
          createdAt: new Date().toISOString()
        };

        onDispatchCreated(dispatchRecord);
        setStep(4);
      }
    } catch (err) {
      console.error("Error creating booking for doctor-on-call dispatch:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-xs animate-fade-in" id="doctor-on-call-lightbox">
      <div className="bg-white rounded-3xl border-2 border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-down">
        
        {/* Header banner */}
        <div className="bg-[#0F172A] text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-md animate-pulse">
              <Ambulance className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                Verified Doctor-on-Call Dispatch
                <span className="text-[9px] px-1.5 py-0.5 bg-rose-500 text-white rounded-md font-bold uppercase tracking-widest">Immediate</span>
              </h3>
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Physical Medical Dispatch Service & Eldercare Home Visits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-slate-800 rounded-xl transition-all border border-slate-700 cursor-pointer text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Wizard Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
          <span className={step === 1 ? 'text-[#DC2626]' : 'text-slate-400'}>1. Patient Details</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step === 2 ? 'text-[#DC2626]' : 'text-slate-400'}>2. Match Doctor</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step === 3 ? 'text-[#DC2626]' : 'text-slate-400'}>3. Secure Deposit</span>
          <ChevronRight className="h-3 w-3" />
          <span className={step === 4 ? 'text-[#DC2626]' : 'text-slate-400'}>4. Live Dispatch Tracker</span>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: PATIENT INFORMATION & CLASS SELECTION */}
          {step === 1 && (
            <form onSubmit={handleNextToMatch} className="space-y-5">
              {/* Dispatch Mode Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setPatientClass('elderly');
                    setPatientAge(72);
                  }}
                  className={`p-4 border-2 rounded-2xl text-left transition-all relative overflow-hidden cursor-pointer ${
                    patientClass === 'elderly' 
                      ? 'border-[#DC2626] bg-[#FFF0F2] shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="p-2 bg-[#FFF0F2] text-[#DC2626] rounded-lg">
                      <Heart className="h-5 w-5" />
                    </span>
                    {patientClass === 'elderly' && <CheckCircle2 className="h-5 w-5 text-[#DC2626]" />}
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-xs mt-3">Eldercare Home Visit</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                    Home consultation for seniors, mobility-restricted, or chronic management patients. Est Fee: RM180.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPatientClass('emergency');
                    setPatientAge(45);
                  }}
                  className={`p-4 border-2 rounded-2xl text-left transition-all relative overflow-hidden cursor-pointer ${
                    patientClass === 'emergency' 
                      ? 'border-rose-500 bg-rose-50/50 shadow-sm' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                      <ShieldAlert className="h-5 w-5" />
                    </span>
                    {patientClass === 'emergency' && <CheckCircle2 className="h-5 w-5 text-rose-600" />}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs mt-3">Urgent Doctor-on-Call</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                    Rapid physician dispatch for acute onset symptoms, high fever, or trauma stabilization. Est Fee: RM250.
                  </p>
                </button>
              </div>

              {/* Warning box for Emergency */}
              {patientClass === 'emergency' && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 text-rose-900 text-[10px] font-semibold leading-normal">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">FOR CRITICAL LIFE-THREATENING EMERGENCIES</p>
                    <p className="text-rose-700">If patient is experiencing severe cardiac arrest, stroke, massive hemorrhaging, or complete respiratory failure, call National Emergency Services (999) immediately.</p>
                  </div>
                </div>
              )}

              {/* Patient Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Patient Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-[#DC2626] font-bold text-slate-700"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Patient Age</label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-[#DC2626] font-bold text-slate-700 text-center"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e: any) => setPatientGender(e.target.value)}
                      className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-3 py-2.5 outline-none focus:border-[#DC2626] font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Contact Phone Number</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-[#DC2626] font-bold text-slate-700"
                    placeholder="+60-12-345-6789"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Physical Dispatch Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dispatchAddress}
                      onChange={(e) => setDispatchAddress(e.target.value)}
                      className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-[#DC2626] font-bold text-slate-700 placeholder-slate-400 truncate"
                      placeholder="Street, Block, Condo, Postcode, City"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSimulateGPS}
                      className="absolute right-2 top-1.5 p-1.5 bg-[#FFF0F2] hover:bg-[#FECDD3] text-[#DC2626] rounded-lg transition-colors cursor-pointer"
                      title="Acquire current location via GPS"
                    >
                      {isLocating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Symptom Tag Checklist */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Select active symptoms</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Chest Discomfort', 'Sudden Numbness', 'Severe Breathing Difficulty', 
                    'Fever & Chills', 'Extreme Senior Fatigue', 'Regular Eldercare Checkup', 
                    'Joint Pain / Immobility', 'Wound Dressings Shift'
                  ].map((symptom) => {
                    const isChecked = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        type="button"
                        key={symptom}
                        onClick={() => toggleSymptom(symptom)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-3xs' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
                
                {/* Custom Symptom Input */}
                <div className="flex gap-2 max-w-sm mt-2">
                  <input
                    type="text"
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    placeholder="Add other symptom..."
                    className="flex-1 text-[11px] bg-slate-50 border-2 border-slate-200/80 rounded-lg px-3 py-1.5 outline-none font-bold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={addCustomSymptom}
                    className="bg-[#DC2626] hover:bg-[#0F172A] text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                className="w-full py-3 bg-[#DC2626] hover:bg-[#0F172A] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Find Near-Home Medical Dispatchers</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* STEP 2: DOCTOR MATCHING / SELECTOR */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Select Certified Practitioner for Dispatch</h4>
                <p className="text-[10px] text-slate-500 font-semibold">Only vetted practitioners supporting Home/In-person dispatches in your vicinity are shown.</p>
              </div>

              <div className="space-y-3">
                {/* Automatic Assignment Choice */}
                <button
                  type="button"
                  onClick={() => handleSelectMatch('auto')}
                  className={`w-full text-left p-4 border-2 rounded-2xl transition-all relative overflow-hidden flex items-center justify-between cursor-pointer ${
                    selectedDoctorId === 'auto'
                      ? 'border-[#DC2626] bg-[#FFF0F2] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    <div className="h-10 w-10 bg-[#DC2626] text-white rounded-xl flex items-center justify-center text-base shadow-sm shrink-0">
                      ⚡
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Auto-Assign Closest Certified Doctor</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Dispatches the fastest-responding physician matching symptoms.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                {/* Filtered Doctor Cards */}
                {availableDoctors.map((doc) => (
                  <button
                    type="button"
                    key={doc.id}
                    onClick={() => handleSelectMatch(doc.id)}
                    className={`w-full text-left p-4 border-2 rounded-2xl transition-all relative overflow-hidden flex items-center justify-between cursor-pointer ${
                      selectedDoctorId === doc.id
                        ? 'border-[#DC2626] bg-[#FFF0F2] shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <img
                        src={doc.avatar}
                        alt={doc.name}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-800">{doc.name}</h4>
                          <span className="text-[8px] px-1 bg-emerald-50 text-emerald-700 font-extrabold rounded border border-emerald-100 flex items-center">Verified</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">{doc.specialization} &bull; {doc.experienceYears} Years Exp</p>
                        <div className="flex items-center gap-1 text-[9px] text-amber-500 font-bold mt-0.5">
                          <Star className="h-3 w-3 fill-amber-500" />
                          <span>{doc.rating.toFixed(1)} ({doc.reviewCount} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-800">RM {doc.fee}</span>
                      <span className="text-[8px] text-slate-400 block font-bold">Consult Fee</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 text-xs font-black transition-all cursor-pointer text-center"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#0F172A] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md text-center"
                >
                  Proceed to Secure Checkout
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT DEPOSIT DECK */}
          {step === 3 && (
            <div className="space-y-6 text-center py-4">
              <div className="h-16 w-16 bg-[#FFF0F2] text-[#DC2626] rounded-full flex items-center justify-center mx-auto border border-[#FECDD3]">
                <Lock className="h-7 w-7" />
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h4 className="text-sm font-black text-slate-900">Secure Dispatch Deposit Escrow</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  To complete physician routing and locking, a secure deposit of <span className="font-extrabold text-slate-800">RM {checkoutFee.toFixed(2)}</span> is required.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Dispatch Class:</span>
                  <span className="font-extrabold text-slate-800 capitalize">{patientClass} Visit</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Target Patient:</span>
                  <span className="font-extrabold text-slate-800">{patientName} (Age {patientAge})</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Assigned Practitioner:</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedDoctorId === 'auto' ? 'Closest Auto-Match' : availableDoctors.find(d => d.id === selectedDoctorId)?.name}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2.5 flex justify-between text-xs font-black text-[#0F172A] uppercase">
                  <span>Total Payable Deposit:</span>
                  <span>RM {checkoutFee.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 text-xs font-black transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  className="flex-1 py-3 bg-[#DC2626] hover:bg-[#0F172A] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Launch Secure Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: LIVE DISPATCH TRACKER */}
          {step === 4 && activeDispatch && (
            <div className="space-y-6">
              
              {/* Tracker Card */}
              <div className="bg-[#0F172A] text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                {/* Backglow ambulance visual */}
                <div className="absolute top-2 right-2 opacity-15">
                  <Ambulance className="h-20 w-20 animate-pulse text-white" />
                </div>

                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <span className="text-[9px] px-2 py-0.5 bg-rose-500/30 text-rose-200 border border-rose-500/20 rounded-md font-extrabold uppercase tracking-widest">
                      {activeDispatch.isEmergency ? 'Urgent Emergency Call' : 'Elder Care Home Checkup'}
                    </span>
                    <h4 className="text-base font-black mt-2">Active Dispatch: {activeDispatch.id}</h4>
                    <p className="text-[10px] text-slate-300 font-semibold mt-1">Status: {activeDispatch.dispatchStatus}</p>
                  </div>
                  <div className="text-right">
                    {activeDispatch.dispatchStatus !== 'Completed' && activeDispatch.dispatchStatus !== 'Arrived' ? (
                      <>
                        <span className="text-3xl font-black">{activeDispatch.etaMinutes}</span>
                        <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wide">Mins ETA</span>
                      </>
                    ) : (
                      <span className="text-[10px] bg-emerald-500 text-white font-black px-2.5 py-1 rounded-lg uppercase tracking-wide">
                        {activeDispatch.dispatchStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar representation */}
                <div className="mt-5 space-y-1.5 z-10 relative">
                  <div className="flex justify-between text-[9px] text-rose-300 font-bold uppercase">
                    <span>Base Station</span>
                    <span>Practitioner En-Route</span>
                    <span>Arrived</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-1000 ease-out" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Grid: Doctor & Patient Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Doctor Bio */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3">
                  <img
                    src={activeDispatch.doctorAvatar}
                    alt={activeDispatch.doctorName}
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h5 className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Dispatched Doctor</h5>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{activeDispatch.doctorName}</p>
                    <span className="text-[9px] text-[#DC2626] font-bold flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      MMC Certified Surgeon/GP
                    </span>
                  </div>
                </div>

                {/* Dispatch Destination Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <h5 className="text-[11px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    Dispatch Address
                  </h5>
                  <p className="text-[10px] text-slate-700 font-bold mt-1.5 leading-relaxed truncate" title={activeDispatch.dispatchAddress}>
                    {activeDispatch.dispatchAddress}
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold mt-1">Patient: {activeDispatch.patientName} (Age {activeDispatch.patientAge})</p>
                </div>
              </div>

              {/* Simulated Map Visual */}
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 h-52 flex flex-col relative overflow-hidden">
                <span className="absolute top-3 left-3 bg-white/85 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[9px] text-slate-600 font-bold border border-slate-200 flex items-center gap-1 z-10">
                  <Navigation className="h-3 w-3 text-[#DC2626] animate-spin" />
                  Live GPS Ledger Stream
                </span>

                {/* Simulated SVG Map Route */}
                <svg className="w-full h-full text-slate-300" viewBox="0 0 400 180" fill="none">
                  {/* Streets Grid */}
                  <path d="M 0,40 L 400,40 M 0,90 L 400,90 M 0,140 L 400,140" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M 50,0 L 50,180 M 150,0 L 150,180 M 270,0 L 270,180 M 350,0 L 350,180" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />

                  {/* Route path from Doctor (Start: 40, 40) to Patient (End: 350, 140) */}
                  <path d="M 40,40 L 150,40 L 150,90 L 270,90 L 270,140 L 350,140" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" />

                  {/* Base Station (Doctor Avatar placement start) */}
                  <circle cx="40" cy="40" r="8" fill="#DC2626" />
                  <text x="40" y="28" textAnchor="middle" fill="#0F172A" className="text-[8px] font-black font-sans">CLINIC</text>

                  {/* Patient Pin placement (End) */}
                  <circle cx="350" cy="140" r="10" fill="#f43f5e" className="animate-pulse" />
                  <circle cx="350" cy="140" r="5" fill="#ffffff" />
                  <text x="350" y="125" textAnchor="middle" fill="#9f1239" className="text-[8px] font-black font-sans">HOME</text>

                  {/* Interactive vehicle marker moving along the path */}
                  {activeDispatch.dispatchStatus === 'Pending Dispatch' && (
                    <g transform="translate(40, 40)">
                      <circle r="12" fill="#DC2626" className="opacity-20 animate-ping" />
                      <circle r="6" fill="#DC2626" />
                    </g>
                  )}
                  {activeDispatch.dispatchStatus === 'En-Route' && (
                    // Move translate along path based on progress
                    <g transform={`translate(${40 + (progressPercent / 100) * 310}, ${40 + (progressPercent / 100) * 100})`}>
                      <circle r="14" fill="#DC2626" className="opacity-25 animate-ping" />
                      <path d="M-6,-4 L6,-4 L6,4 L-6,4 Z" fill="#0F172A" />
                      <circle cx="-3" cy="5" r="2.5" fill="#000" />
                      <circle cx="3" cy="5" r="2.5" fill="#000" />
                    </g>
                  )}
                  {activeDispatch.dispatchStatus === 'Arrived' && (
                    <g transform="translate(350, 140)">
                      <circle r="14" fill="#10b981" className="opacity-30 animate-ping" />
                      <circle r="7" fill="#059669" />
                    </g>
                  )}
                </svg>
              </div>

              {/* Completion Action */}
              {activeDispatch.dispatchStatus === 'Completed' && (
                <div className="text-center bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-2">
                  <p className="text-xs font-extrabold text-emerald-800">Dispatch Session Completed Successfully</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">The physician has completed the home medical evaluation. Signed clinical records are updated under your Records register.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
            <Lock className="h-3.5 w-3.5 text-[#DC2626]" />
            <span>End-to-End Cryptographically Secured Channels</span>
          </div>
          {step === 4 && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#DC2626] hover:bg-[#0F172A] text-white text-xs font-black rounded-xl transition-all cursor-pointer"
            >
              Minimize Tracker
            </button>
          )}
        </div>
      </div>

      {/* Embedded Checkout Modal overlay */}
      {showCheckout && (
        <PaymentCheckout
          amount={checkoutFee}
          purpose={`${patientClass === 'emergency' ? 'Emergency Dispatch Deposit' : 'Elder Care Checkup Visit'} - ${patientName}`}
          customerName={patientName}
          customerEmail={currentUser?.email || 'patient@example.com'}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
