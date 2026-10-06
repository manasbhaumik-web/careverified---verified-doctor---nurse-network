import React, { useState } from 'react';
import { 
  UserCheck, ShieldCheck, Mail, Lock, User, Phone, Calendar, 
  ArrowRight, ArrowLeft, RefreshCw, X, AlertCircle, Sparkles, HeartPulse, Check 
} from 'lucide-react';
import { PatientProfile } from '../types';

interface PatientRegistrationFormProps {
  onRegisterSuccess: (user: { id: string; role: 'patient'; name: string; email: string; avatarUrl?: string; profileId?: string | null }, patient?: unknown) => void;
  onCancel: () => void;
}

export default function PatientRegistrationForm({
  onRegisterSuccess,
  onCancel
}: PatientRegistrationFormProps) {
  // Wizard Step State
  const [step, setStep] = useState(1);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [age, setAge] = useState<number>(30);
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [allergiesText, setAllergiesText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCondition = (cond: string) => {
    if (selectedConditions.includes(cond)) {
      setSelectedConditions(selectedConditions.filter(c => c !== cond));
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  };

  // Validation checks for each step
  const isStep1Valid = () => {
    return name.trim() !== '' && email.trim() !== '' && password.trim() !== '' && icNumber.trim() !== '';
  };

  const isStep2Valid = () => {
    return phone.trim() !== '' && age > 0;
  };

  const [consent, setConsent] = useState(false);
  const isStep3Valid = () => {
    return emergencyContactName.trim() !== '' && emergencyContactPhone.trim() !== '' && consent;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1 && !isStep1Valid()) {
      setError('Please fill in all mandatory account details before continuing.');
      return;
    }
    if (step === 2 && !isStep2Valid()) {
      setError('Please fill in your valid contact phone and age before continuing.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isStep1Valid() || !isStep2Valid() || !isStep3Valid()) {
      setError('Please complete all wizard steps with valid credentials.');
      return;
    }

    setLoading(true);

    try {
      // Simulate real server registration or call backend API
      const response = await fetch('/api/register-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          icNumber,
          age,
          phone,
          gender,
          chronicConditions: selectedConditions,
          allergies: allergiesText ? [allergiesText] : [],
          emergencyContactName,
          emergencyContactPhone,
          consent
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setLoading(false);
        const me = await fetch('/api/auth/me').then(r => r.json());
        onRegisterSuccess(me.data.user, data.data);
      } else {
        setError(data.message || 'Registration failed.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('Server connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100" id="patient-registration-panel">
      {/* Header Panel */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#DC2626] p-2.5 rounded-xl text-white shadow-md">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Create Patient Profile</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Secure National Health Register</p>
          </div>
        </div>
        <button 
          onClick={onCancel} 
          className="text-slate-400 hover:text-white transition-all text-xs font-black py-1.5 px-3 hover:bg-[#DC2626] rounded-xl cursor-pointer"
        >
          Sign In Instead
        </button>
      </div>

      {/* Stepped Progress Guide Indicator */}
      <div className="bg-white/10 border border-slate-800 rounded-2xl p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-400 tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Registration Progress Guide</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold">Step {step} of 3</span>
        </div>
        
        {/* Dynamic Timeline Steps */}
        <div className="flex items-center justify-between relative select-none">
          {/* Step 1 Indicator */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              step > 1 
                ? 'bg-[#DC2626] border-2 border-[#DC2626] text-white shadow-md shadow-rose-500/10' 
                : step === 1 
                  ? 'bg-[#0F172A] border-2 border-[#DC2626] text-rose-400 ring-4 ring-[#DC2626]/10' 
                  : 'bg-[#0F172A] border-2 border-slate-800 text-slate-500'
            }`}>
              {step > 1 ? <Check className="h-4 w-4 font-black" /> : <span className="text-xs font-black">1</span>}
            </div>
            <span className={`text-[9px] font-black uppercase mt-1.5 ${step === 1 ? 'text-rose-400' : 'text-slate-500'}`}>Account Setup</span>
          </div>

          <div className={`flex-1 h-0.5 mx-2 transition-all ${step > 1 ? 'bg-[#DC2626]' : 'bg-[#DC2626]'}`}></div>

          {/* Step 2 Indicator */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              step > 2 
                ? 'bg-[#DC2626] border-2 border-[#DC2626] text-white shadow-md shadow-rose-500/10' 
                : step === 2 
                  ? 'bg-[#0F172A] border-2 border-[#DC2626] text-rose-400 ring-4 ring-[#DC2626]/10' 
                  : 'bg-[#0F172A] border-2 border-slate-800 text-slate-500'
            }`}>
              {step > 2 ? <Check className="h-4 w-4 font-black" /> : <span className="text-xs font-black">2</span>}
            </div>
            <span className={`text-[9px] font-black uppercase mt-1.5 ${step === 2 ? 'text-rose-400' : 'text-slate-500'}`}>Demographics</span>
          </div>

          <div className={`flex-1 h-0.5 mx-2 transition-all ${step > 2 ? 'bg-[#DC2626]' : 'bg-[#DC2626]'}`}></div>

          {/* Step 3 Indicator */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              step === 3 
                ? 'bg-[#0F172A] border-2 border-[#DC2626] text-rose-400 ring-4 ring-[#DC2626]/10' 
                : 'bg-[#0F172A] border-2 border-slate-800 text-slate-500'
            }`}>
              <span className="text-xs font-black">3</span>
            </div>
            <span className={`text-[9px] font-black uppercase mt-1.5 ${step === 3 ? 'text-rose-400' : 'text-slate-500'}`}>Medical Background</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl flex gap-2 text-xs font-semibold animate-shake">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Multistep Form Layout */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* STEP 1: ACCOUNT SETUP */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Full Patient Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ahmad Fauzi Bin Ramli"
                    className="form-input-dark pl-10 py-3"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ahmad@gmail.com"
                    className="form-input-dark pl-10 py-3"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Account Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input-dark pl-10 py-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block">National ID / IC / Passport *</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={icNumber}
                    onChange={(e) => setIcNumber(e.target.value)}
                    placeholder="720815-14-5399"
                    className="form-input-dark pl-10 py-3"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Stepped Navigation */}
            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isStep1Valid()}
                className="py-2.5 px-6 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626] disabled:text-slate-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-500/10"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEMOGRAPHICS */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-1 sm:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+60123456789"
                    className="form-input-dark pl-10 py-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Patient Age *</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="form-input-dark pl-10 py-3"
                    required
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="form-select-dark py-3"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Stepped Navigation */}
            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-2.5 px-5 border border-slate-800 text-slate-300 hover:text-white hover:bg-[#DC2626] rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={!isStep2Valid()}
                className="py-2.5 px-6 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626] disabled:text-slate-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-500/10"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MEDICAL HISTORY & EMERGENCY CONTACT */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            {/* Chronic Conditions */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Pre-Existing Chronic Conditions</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Hypertension', 'Diabetes Mellitus', 'Asthma', 'Heart Conditions', 'Chronic Kidney Disease'].map((cond) => {
                  const isChecked = selectedConditions.includes(cond);
                  return (
                    <button
                      type="button"
                      key={cond}
                      onClick={() => toggleCondition(cond)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-md shadow-rose-500/10 scale-102 font-black' 
                          : 'bg-[#0F172A] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drug Allergies */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Drug or General Allergies (Optional)</label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Seafood, Peanuts"
                className="form-input-dark py-3"
              />
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Emergency Contact (Crucial for Doctor-on-Call dispatches) *</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Contact Person Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Fatimah Binti Fauzi"
                    className="form-input-dark py-3"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Emergency Phone Number</label>
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+6017-987-6543"
                    className="form-input-dark py-3"
                    required
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#DC2626]"
                />
                <span>
                  I accept the Terms of Service and Privacy Policy, and consent to CareVerified storing and processing my health information so practitioners can treat me, and agree that verified doctors may review samples of my care for quality and safety with my name hidden. I can export or request deletion of my data at any time.
                </span>
              </label>
            </div>

            {/* Stepped Navigation */}
            <div className="flex justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-2.5 px-5 border border-slate-800 text-slate-300 hover:text-white hover:bg-[#DC2626] rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading || !isStep3Valid()}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#DC2626] disabled:text-slate-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>Registering Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Secure Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
