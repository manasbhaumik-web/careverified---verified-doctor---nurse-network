import React, { useState } from 'react';
import { openLegal } from '../legal';
import { IdFields, PhoneField, AddressFields, emptyId, emptyPhone, emptyAddress, idProblem, phoneE164, type IdState, type PhoneState } from './IdentityFields';
import { addressProblem, parseNric, toE164, PREFERRED_LANGUAGES, RELATIONSHIPS, type Address } from '../identity';
import { 
  UserCheck, ShieldCheck, Mail, Lock, User, Phone, Calendar, 
  ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Check, Activity 
} from 'lucide-react';

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
  const [idState, setIdState] = useState<IdState>(emptyId);
  const [phone, setPhone] = useState<PhoneState>(emptyPhone);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [gender, setGender] = useState('Male');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState<PhoneState>(emptyPhone);
  const [separateNok, setSeparateNok] = useState(false);
  const [nokName, setNokName] = useState('');
  const [nokRelationship, setNokRelationship] = useState('Parent');
  const [nokPhone, setNokPhone] = useState<PhoneState>(emptyPhone);
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

  // Birth date and age come from the MyKad number, or from the date of birth entered with a passport.
  const nric = idState.idType === 'nric' ? parseNric(idState.idNumber) : null;
  const dateOfBirth = nric ? nric.birthDate : idState.dob;
  const age = (() => {
    if (nric) return nric.age;
    if (!idState.dob) return 0;
    const d = new Date(idState.dob), t = new Date();
    return t.getFullYear() - d.getFullYear() - (t < new Date(t.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  })();

  const step1Problem = () => {
    if (!name.trim() || !email.trim() || !password.trim()) return 'Please fill in all mandatory account details before continuing.';
    return idProblem(idState);
  };
  const step2Problem = () => {
    if (!phoneE164(phone)) return 'Enter a valid mobile or phone number.';
    if (age < 0 || age > 120) return 'The birth date looks wrong.';
    return addressProblem(address);
  };
  const isStep1Valid = () => step1Problem() === null;
  const isStep2Valid = () => step2Problem() === null;

  const [consent, setConsent] = useState(false);
  const isStep3Valid = () =>
    emergencyContactName.trim() !== '' && phoneE164(emergencyPhone) !== null && consent &&
    (!separateNok || (nokName.trim() !== '' && phoneE164(nokPhone) !== null));

  const handleNextStep = () => {
    setError('');
    const problem = step === 1 ? step1Problem() : step === 2 ? step2Problem() : null;
    if (problem) { setError(problem); return; }
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
          idType: idState.idType,
          icNumber: nric ? nric.normalised : idState.idNumber,
          nationality: idState.nationality,
          dateOfBirth,
          age,
          phone: phoneE164(phone),
          gender,
          preferredLanguage,
          address,
          chronicConditions: selectedConditions,
          allergies: allergiesText ? [allergiesText] : [],
          emergencyContactName,
          emergencyContactRelationship: emergencyRelationship,
          emergencyContactPhone: phoneE164(emergencyPhone),
          nextOfKin: separateNok ? { name: nokName, relationship: nokRelationship, phone: phoneE164(nokPhone) } : null,
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
    <div className="space-y-6 animate-fade-in text-[color:var(--ink)]" id="patient-registration-panel">
      {/* Header Panel */}
      <div className="flex justify-between items-center pb-4 border-b border-[color:var(--t-200)]">
        <div className="flex items-center gap-2.5">
          <div className="bg-[color:var(--t-600)] p-2.5 rounded-none text-white shadow-md">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-[color:var(--ink)]">Create Member Profile</h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">Secure National Health Register</p>
          </div>
        </div>
        <button 
          onClick={onCancel} 
          className="text-[color:var(--t-600)] hover:text-[color:var(--t-800)] transition-all text-xs font-black py-1.5 px-3 hover:bg-[color:var(--t-100)] rounded-none cursor-pointer"
        >
          Sign In Instead
        </button>
      </div>

      {/* Stepped Progress Guide Indicator */}
      <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] rounded-none p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[color:var(--t-600)] tracking-wider">
            <Activity className="h-4 w-4" />
            <span>Registration Progress Guide</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono font-bold">Step {step} of 3</span>
        </div>
        
        {/* Dynamic Timeline Steps */}
        <div className="relative select-none">
          {/* Row of circles and connecting lines, strictly centered vertically with each other */}
          <div className="flex items-center">
            {/* Step 1 Circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
              step > 1 
                ? 'bg-[color:var(--t-600)] border-2 border-[color:var(--t-600)] text-white shadow-md' 
                : step === 1 
                  ? 'bg-white border-2 border-[color:var(--t-600)] text-[color:var(--t-600)] ring-4 ring-[color:var(--t-600)]/15' 
                  : 'bg-white border-2 border-[color:var(--t-200)] text-slate-500'
            }`}>
              {step > 1 ? <Check className="h-4 w-4 font-black" /> : <span className="text-xs font-black">1</span>}
            </div>

            {/* Line 1 - 2 */}
            <div className={`flex-1 h-0.5 mx-2 transition-all ${step > 1 ? 'bg-[color:var(--t-600)]' : 'bg-[color:var(--t-200)]'}`}></div>

            {/* Step 2 Circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
              step > 2 
                ? 'bg-[color:var(--t-600)] border-2 border-[color:var(--t-600)] text-white shadow-md' 
                : step === 2 
                  ? 'bg-white border-2 border-[color:var(--t-600)] text-[color:var(--t-600)] ring-4 ring-[color:var(--t-600)]/15' 
                  : 'bg-white border-2 border-[color:var(--t-200)] text-slate-500'
            }`}>
              {step > 2 ? <Check className="h-4 w-4 font-black" /> : <span className="text-xs font-black">2</span>}
            </div>

            {/* Line 2 - 3 */}
            <div className={`flex-1 h-0.5 mx-2 transition-all ${step > 2 ? 'bg-[color:var(--t-600)]' : 'bg-[color:var(--t-200)]'}`}></div>

            {/* Step 3 Circle */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
              step === 3 
                ? 'bg-white border-2 border-[color:var(--t-600)] text-[color:var(--t-600)] ring-4 ring-[color:var(--t-600)]/15' 
                : 'bg-white border-2 border-[color:var(--t-200)] text-slate-500'
            }`}>
              <span className="text-xs font-black">3</span>
            </div>
          </div>

          {/* Row of labels aligned directly below circles */}
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[9px] font-black uppercase text-left ${step === 1 ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`}>Account Setup</span>
            <span className={`text-[9px] font-black uppercase text-center ${step === 2 ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`}>Demographics</span>
            <span className={`text-[9px] font-black uppercase text-right ${step === 3 ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`}>Medical Background</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-800)] p-3 rounded-none flex gap-2 text-xs font-semibold animate-shake">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-[color:var(--t-600)]" />
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
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">Full Name (as on your ID) *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmad Fauzi Bin Ramli" className="form-input pl-10" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmad@gmail.com" className="form-input pl-10" required />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">Account Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters, letters and numbers" className="form-input pl-10" required />
              </div>
            </div>
            <IdFields value={idState} onChange={setIdState} />
            <div className="flex justify-end pt-3">
              <button type="button" onClick={handleNextStep} disabled={!isStep1Valid()}
                className="py-2.5 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-none text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md">
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEMOGRAPHICS */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhoneField id="reg-phone" title="Mobile number" value={phone} onChange={setPhone} />
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block" htmlFor="reg-gender">Gender</label>
                <select id="reg-gender" value={gender} onChange={(e) => setGender(e.target.value)} className="form-select">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {nric && nric.gender !== gender && <p className="text-[11px] font-semibold text-amber-700 mt-1">Your MyKad number suggests {nric.gender}. Keep your choice if you prefer.</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block" htmlFor="reg-lang">Preferred language for care</label>
              <select id="reg-lang" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} className="form-select">
                {PREFERRED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Used to match you with a practitioner who speaks your language{age ? `. Age on record: ${age}.` : '.'}</p>
            </div>
            <AddressFields value={address} onChange={setAddress} />

            <div className="flex justify-between pt-3">
              <button type="button" onClick={handlePrevStep}
                className="py-2.5 px-5 border border-[color:var(--t-200)] bg-white text-slate-700 hover:text-[color:var(--t-800)] hover:bg-[color:var(--t-100)] rounded-none text-xs font-black transition-all flex items-center gap-2 cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button type="button" onClick={handleNextStep} disabled={!isStep2Valid()}
                className="py-2.5 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-none text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md">
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
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">Pre-Existing Chronic Conditions</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Hypertension', 'Diabetes Mellitus', 'Asthma', 'Heart Conditions', 'Chronic Kidney Disease'].map((cond) => {
                  const isChecked = selectedConditions.includes(cond);
                  return (
                    <button
                      type="button"
                      key={cond}
                      onClick={() => toggleCondition(cond)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-none border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-[color:var(--t-600)] text-white border-[color:var(--t-600)] shadow-md font-black' 
                          : 'bg-white text-slate-600 border-[color:var(--t-200)] hover:border-[color:var(--t-600)] hover:text-[color:var(--ink)]'
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
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">Drug or General Allergies (Optional)</label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Seafood, Peanuts"
                className="form-input"
              />
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-3.5 pt-2 border-t border-[color:var(--t-200)]">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">Emergency Contact (used for Doctor-on-Call dispatches) *</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block">Contact Person Name</label>
                  <input type="text" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Fatimah Binti Fauzi" className="form-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block">Relationship</label>
                  <select value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} className="form-select">
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <PhoneField id="reg-emergency-phone" title="Emergency phone number" value={emergencyPhone} onChange={setEmergencyPhone} />
              <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!separateNok} onChange={(e) => setSeparateNok(!e.target.checked)} className="mt-0.5 h-4 w-4 accent-[color:var(--t-600)]" />
                <span>This person is also my next of kin (the person we contact about your records if you cannot).</span>
              </label>
              {separateNok && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[color:var(--t-200)] p-3">
                  <input type="text" value={nokName} onChange={(e) => setNokName(e.target.value)} placeholder="Next of kin name" aria-label="Next of kin name" className="form-input" required />
                  <select value={nokRelationship} onChange={(e) => setNokRelationship(e.target.value)} aria-label="Next of kin relationship" className="form-select">
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="sm:col-span-2"><PhoneField id="reg-nok-phone" title="Next of kin phone" value={nokPhone} onChange={setNokPhone} /></div>
                </div>
              )}
              <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[color:var(--t-600)]"
                />
                <span>
                  I accept the <button type="button" onClick={() => openLegal('terms')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">Terms of Service</button> and <button type="button" onClick={() => openLegal('notice')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">Privacy Notice</button>, and consent to MedCred storing and processing my health information so practitioners can treat me, and agree that verified doctors may review samples of my care for quality and safety with my name hidden. I can export or request deletion of my data at any time.
                </span>
              </label>
            </div>

            {/* Stepped Navigation */}
            <div className="flex justify-between pt-3 border-t border-[color:var(--t-200)]">
              <button
                type="button"
                onClick={handlePrevStep}
                className="py-2.5 px-5 border border-[color:var(--t-200)] bg-white text-slate-700 hover:text-[color:var(--t-800)] hover:bg-[color:var(--t-100)] rounded-none text-xs font-black transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading || !isStep3Valid()}
                className="py-2.5 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-none text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
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
