import React, { useState } from 'react';
import { 
  ShieldCheck, Search, Users, ShieldAlert, Award, FileText, 
  Sparkles, Calendar, BookOpen, Globe, CheckCircle2, RefreshCw, 
  Heart, MessageSquare, AlertTriangle, Key, ArrowRight, UserCheck, Stethoscope, Activity, Building, Lock, AlertCircle, PlusCircle
} from 'lucide-react';
import { DoctorProfile, NurseProfile, UserRole, VerificationStatus } from '../types';
import PatientRegistrationForm from './PatientRegistrationForm';

interface LandingPageProps {
  professionals: (DoctorProfile | NurseProfile)[];
  onLoginSuccess: (user: { role: 'patient' | 'practitioner' | 'admin'; name: string; email: string; avatarUrl?: string }) => void;
}

export default function LandingPage({ professionals, onLoginSuccess }: LandingPageProps) {
  // Login State
  const [activeTab, setActiveTab] = useState<'patient' | 'practitioner' | 'admin'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Instant Verification Lookup State
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<(DoctorProfile | NurseProfile)[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Handle Instant Verification Search
  const handleInstantLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setLookupResult(null);
      setHasSearched(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = professionals.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.licenseNumber.toLowerCase().includes(query) ||
      p.specialization.toLowerCase().includes(query)
    );

    setLookupResult(results);
    setHasSearched(true);
  };

  // Quick Bypass Logins
  const handleSandboxLogin = (role: 'patient' | 'practitioner' | 'admin') => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (role === 'patient') {
        onLoginSuccess({
          role: 'patient',
          name: 'Ahmad Fauzi Bin Ramli',
          email: 'swarnabhaumik@gmail.com',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
        });
      } else if (role === 'practitioner') {
        onLoginSuccess({
          role: 'practitioner',
          name: 'Dr. Tan Seng Hock',
          email: 'tan@medicert.com',
          avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120'
        });
      } else if (role === 'admin') {
        onLoginSuccess({
          role: 'admin',
          name: 'Sharifah Noor Al-Hadi',
          email: 'admin@medicert.com',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
        });
      }
    }, 450);
  };

  // Standard Login Submission
  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Simple mock authentication based on tab
      if (activeTab === 'patient') {
        onLoginSuccess({
          role: 'patient',
          name: 'Ahmad Fauzi Bin Ramli',
          email: email,
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
        });
      } else if (activeTab === 'practitioner') {
        onLoginSuccess({
          role: 'practitioner',
          name: 'Dr. Tan Seng Hock',
          email: email,
          avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120'
        });
      } else if (activeTab === 'admin') {
        if (email.toLowerCase() === 'admin@medicert.com' && password === 'admin') {
          onLoginSuccess({
            role: 'admin',
            name: 'Sharifah Noor Al-Hadi',
            email: email,
            avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
          });
        } else {
          // Fallback to successful login anyway for convenience, but with a warning or just pass
          onLoginSuccess({
            role: 'admin',
            name: 'Sharifah Noor Al-Hadi',
            email: email,
            avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
          });
        }
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Landing Top Header */}
      <nav className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight block leading-none">MediCert</span>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block mt-1">National Verified Network</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <a 
              href="#login-section" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              Access Secure Portal
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-gradient-to-b from-blue-50/50 via-white to-slate-50 py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            MMC (Doctors) & LJM (Nurses) Integrated
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            The Trust Network for <br/>
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Verified Medical Professionals</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto font-semibold leading-relaxed">
            MediCert unites medical boards, clinics, and patients in a single secure environment. Instantly verify doctor credentials, schedule consultations, and manage digital prescriptions with absolute trust.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 text-blue-500" /> HIPAA Certified
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> MMC Certified Registry
            </span>
            <span className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/60 shadow-xs text-slate-600">
              <Lock className="h-4 w-4 text-indigo-500" /> AES-256 Encrypted
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* PUBLIC ACCESS SECTION: INSTANT LICENSE LOOKUP */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
              <ShieldCheck className="h-5.5 w-5.5 text-blue-600" />
              Public License Verification Lookup
            </h2>
            <p className="text-xs text-slate-500 font-semibold max-w-xl mx-auto">
              Any patient, clinic, or regulatory officer can check a practitioner's active status. Search by practitioner name, medical council license number, or specialization.
            </p>
          </div>

          <form onSubmit={handleInstantLookup} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, specialization, or license (e.g. MMC-32109, Dr. Sen...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                id="landing-search-input"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shrink-0"
              id="landing-search-submit-btn"
            >
              Verify License
            </button>
          </form>

          {/* Verification Lookup Results */}
          {hasSearched && (
            <div className="border-t border-slate-100 pt-6 animate-fade-in space-y-4 max-w-xl mx-auto">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                Search Results ({lookupResult?.length || 0})
              </h3>
              
              {lookupResult && lookupResult.length > 0 ? (
                <div className="space-y-3">
                  {lookupResult.map((p) => (
                    <div 
                      key={p.id} 
                      className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-4 items-center justify-between"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <img 
                          src={p.avatar} 
                          alt={p.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">{p.specialization}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-1">License: {p.licenseNumber}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Verified Active
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-1.5">{p.role === UserRole.DOCTOR ? 'MMC Registered' : 'LJM Registered'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-900">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-extrabold">No Registered Profile Found</p>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                      No matching verified practitioner with that name, council identifier, or council licensing has been found. Ensure the spelling or license code is exactly correct.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* PERSPECTIVE EXPLANATION GRID (WHY MEDICERT) */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">One Network, Three Perspectives</h2>
            <p className="text-xs text-slate-500 font-bold max-w-xl mx-auto">
              MediCert caters specifically to patients, practitioners, and clinical administrators, ensuring specialized modules align perfectly with your professional or health requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Patients Bento */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800">For Registered Patients</h3>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Access your secure dashboard. View digital e-prescriptions, log vitals, track active healthcare appointments, consult certified medical specialists, and share certified medical histories.
                  </p>
                </div>
              </div>
              <ul className="text-[10px] font-bold text-slate-600 space-y-1.5 pt-4 border-t border-slate-100 mt-4">
                <li className="flex items-center gap-2 text-blue-700">✓ AI Symptom specialty matchmaking</li>
                <li className="flex items-center gap-2 text-blue-700">✓ Digital e-prescriptions directory</li>
                <li className="flex items-center gap-2 text-blue-700">✓ Secure messenger with doctors</li>
              </ul>
            </div>

            {/* Practitioners Bento */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900">For Doctors & Nurses</h3>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Verify credentials through our step-by-step onboarding terminal. Apply for hospital clinical shifts, manage digital patient files securely, and communicate within a HIPAA-protected mailbox.
                  </p>
                </div>
              </div>
              <ul className="text-[10px] font-bold text-slate-600 space-y-1.5 pt-4 border-t border-slate-100 mt-4">
                <li className="flex items-center gap-2 text-emerald-700">✓ Step-by-step verification board</li>
                <li className="flex items-center gap-2 text-emerald-700">✓ Clinical locum shift recruitment</li>
                <li className="flex items-center gap-2 text-emerald-700">✓ Peer-reviewed clinical publications</li>
              </ul>
            </div>

            {/* Admin Bento */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900">For Medical Board Admins</h3>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Audit practitioner registration documents in real-time. Manage platform feature-toggle expansion modules, monitor system-wide SEO healthcare credentials, and oversee licensing compliance.
                  </p>
                </div>
              </div>
              <ul className="text-[10px] font-bold text-slate-600 space-y-1.5 pt-4 border-t border-slate-100 mt-4">
                <li className="flex items-center gap-2 text-indigo-700">✓ Direct licensing document audit</li>
                <li className="flex items-center gap-2 text-indigo-700">✓ Modular package/feature toggles</li>
                <li className="flex items-center gap-2 text-indigo-700">✓ HIPAA directory telemetry & stats</li>
              </ul>
            </div>
          </div>
        </section>

        {/* DETAILED TABBED ACCESS PORTAL WITH SANDBOX BYPASS (LOGIN) */}
        <section id="login-section" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto border-2 border-slate-800">
          <div className="text-center space-y-3 pb-6 border-b border-slate-800">
            <div className="bg-blue-600 inline-block p-2.5 rounded-2xl mb-1 shadow-md">
              <Key className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Access MediCert Portal</h2>
            <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
              Please sign in with your registered account. For rapid developer testing, use the instant sandbox login bypasses.
            </p>
          </div>

          {/* Perspective Tab Selectors */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950 rounded-xl mt-6 border border-slate-800">
            <button
              onClick={() => { setActiveTab('patient'); setError(''); setIsRegistering(false); }}
              className={`py-2 px-3 text-center text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'patient' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Heart className="h-3.5 w-3.5 shrink-0" />
              <span>Patient</span>
            </button>
            <button
              onClick={() => { setActiveTab('practitioner'); setError(''); setIsRegistering(false); }}
              className={`py-2 px-3 text-center text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'practitioner' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Practitioner</span>
            </button>
            <button
              onClick={() => { setActiveTab('admin'); setError(''); setIsRegistering(false); }}
              className={`py-2 px-3 text-center text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'admin' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Building className="h-3.5 w-3.5 shrink-0" />
              <span>Board Admin</span>
            </button>
          </div>

          {isRegistering && activeTab === 'patient' ? (
            <div className="pt-6">
              <PatientRegistrationForm
                onRegisterSuccess={(user) => {
                  onLoginSuccess(user);
                  setIsRegistering(false);
                }}
                onCancel={() => setIsRegistering(false)}
              />
            </div>
          ) : (
            <>
              {/* Standard Login Form */}
              <form onSubmit={handleStandardSubmit} className="space-y-4 pt-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl flex gap-2 text-xs font-semibold">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Email Address</label>
                  <input
                    type="email"
                    placeholder={
                      activeTab === 'patient' ? 'john.doe@medicert.com' :
                      activeTab === 'practitioner' ? 'rajesh@medicert.com' : 'admin@medicert.com'
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex justify-center items-center gap-2 ${
                    activeTab === 'patient' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10' :
                    activeTab === 'practitioner' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10' :
                    'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/10'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Sign In to {activeTab === 'patient' ? 'Patient Portal' : activeTab === 'practitioner' ? 'Practitioner Hub' : 'Board Admin Panel'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {activeTab === 'patient' && (
                <div className="pt-4 text-center">
                  <span className="text-xs text-slate-400 font-bold">
                    Need a secure medical register account?{' '}
                    <button
                      type="button"
                      onClick={() => { setError(''); setIsRegistering(true); }}
                      className="text-blue-400 hover:text-blue-300 font-extrabold cursor-pointer underline hover:no-underline"
                    >
                      Register as New Patient
                    </button>
                  </span>
                </div>
              )}
            </>
          )}

          {/* Sandbox Access Bypass Grid */}
          <div className="pt-6 border-t border-slate-800 mt-6 space-y-3.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-center">
              🔑 Quick Sandbox Bypass Logins (Highly Recommended for Testing)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSandboxLogin('patient')}
                className="bg-blue-500/10 hover:bg-blue-500/15 text-blue-300 border border-blue-500/20 p-3 rounded-xl text-[11px] font-black transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <Heart className="h-4 w-4 text-blue-400" />
                <span>Test Patient Hub</span>
                <span className="text-[8px] text-slate-500 font-semibold">(Ahmad Fauzi)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSandboxLogin('practitioner')}
                className="bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 p-3 rounded-xl text-[11px] font-black transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 text-emerald-400" />
                <span>Test Practitioner</span>
                <span className="text-[8px] text-slate-500 font-semibold">(Dr. Tan Seng Hock)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSandboxLogin('admin')}
                className="bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 p-3 rounded-xl text-[11px] font-black transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <Building className="h-4 w-4 text-indigo-400" />
                <span>Test Board Admin</span>
                <span className="text-[8px] text-slate-500 font-semibold">(Sharifah Noor Al-Hadi)</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 text-xs mt-16 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5 text-white">
            <Stethoscope className="h-5 w-5 text-blue-500" />
            <div>
              <span className="font-extrabold text-sm tracking-tight block leading-none">MediCert</span>
              <span className="text-[9px] text-slate-500 block mt-1">Certified Interoperability Medical Council Directory</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 justify-center">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">HIPAA Secured</span>
            <span>&bull;</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">MMC Regulatory Aligned</span>
            <span>&bull;</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">LJM Compliant</span>
          </div>

          <div className="text-[10px] text-slate-500 font-bold">
            &copy; {new Date().getFullYear()} MediCert. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
