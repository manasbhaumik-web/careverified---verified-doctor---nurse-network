import React, { useState } from 'react';
import { 
  Heart, ShieldCheck, Video, Stethoscope, UserCheck, Pill, 
  CreditCard, Receipt, FileText, CheckCircle2, Clock, AlertTriangle, 
  PhoneCall, ArrowRight, ArrowLeft, Building2, Check, Sparkles, HelpCircle 
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import PatientAccess from './PatientAccess';
import { navigate, loginUrl } from '../nav';

interface MalaysiaPatientsPageProps {
  onSignUp?: () => void;
}

export default function MalaysiaPatientsPage({ onSignUp }: MalaysiaPatientsPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const goMemberSignup = () => {
    if (onSignUp) onSignUp();
    else navigate(loginUrl('patient', true));
  };

  const FAQS = [
    {
      q: 'How does MyKad registration work?',
      a: 'Malaysian citizens and permanent residents register using their 12-digit MyKad number. Our system validates the format and creates your secure medical record profile in less than 2 minutes. No app installation is required—it works directly in your mobile browser.'
    },
    {
      q: 'How much does a doctor tele-consultation cost and what is the 10-minute guarantee?',
      a: 'General Practitioner (GP) consultations start from RM 35, and Specialist physician consultations start from RM 80. If an on-call doctor does not join your video consultation within 10 minutes of booking, your consultation fee is refunded automatically with zero hassle.'
    },
    {
      q: 'Can I get a digital Medical Certificate (MC)?',
      a: 'In accordance with Malaysian Medical Council (MMC) Telemedicine Guidelines, official Medical Certificates (MC) require an in-person physical assessment. Telehealth doctors can issue doctor-signed clinical consultation summaries and medical referral letters.'
    },
    {
      q: 'Can I claim MedCred consultations from my insurance or employer?',
      a: 'Yes. Every consultation and prescription produces an official, itemised receipt with diagnostic ICD-10 coding. These are formatted for submission to corporate TPAs (PMCare, MiCare) and major insurers (AIA, Prudential, Great Eastern, Allianz) as well as LHDN tax relief.'
    },
    {
      q: 'How do digital e-prescriptions work at local pharmacies?',
      a: 'After your consultation, the doctor signs an encrypted QR e-prescription. You can present this QR code at any verified community pharmacy across Malaysia to pick up your medications at 0% platform markup, or opt for home courier delivery.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ─── TOP GLOBAL NAVIGATION BAR ─── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[color:var(--t-200)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a 
              href="/" 
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span className="w-9 h-9 bg-[color:var(--t-600)] text-white flex items-center justify-center font-black text-lg shadow-2xs group-hover:bg-[color:var(--t-700)] transition-colors">
                M
              </span>
              <span className="font-display font-black text-xl tracking-tight text-[color:var(--ink)]">
                MedCred<span className="text-[color:var(--t-600)]">.</span>
              </span>
            </a>

            <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-500 border-l border-slate-200 pl-4">
              <a 
                href="/" 
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
                className="hover:text-[color:var(--t-600)] transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </a>
              <span className="text-slate-300">/</span>
              <span className="text-[color:var(--t-700)]">Malaysia Patient Services</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <LocaleSwitcher />
            <ThemeSwitcher />
            <button
              type="button"
              onClick={() => navigate(loginUrl('patient', false))}
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[color:var(--t-700)] hover:bg-slate-100 border border-transparent transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={goMemberSignup}
              className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Heart className="h-3.5 w-3.5" />
              <span>Join as Member (MyKad)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── FULL-WIDTH APPLICATION HERO BANNER ─── */}
      <section className="w-full bg-[color:var(--t-50)] text-slate-900 border-b border-[color:var(--t-200)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">02</span>
                <Heart className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>Malaysian Patient Care &amp; Privileges</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                Gentle Care for Patients in Malaysia <span className="text-[color:var(--t-600)]">(MyKad)</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-2xl">
                Warm, dignified, and accessible healthcare crafted for Malaysian families. Consult verified MMC doctors, book LJM registered home nurses, and pay with zero hidden fees via FPX or DuitNow QR.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="bg-white px-2.5 py-1 border border-[color:var(--t-200)] font-bold text-slate-700 shadow-3xs">
                  GP Tele-Visit: Fixed RM 35
                </span>
                <span className="bg-white px-2.5 py-1 border border-[color:var(--t-200)] font-bold text-slate-700 shadow-3xs">
                  FPX · DuitNow QR · TNG eWallet
                </span>
                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 border border-emerald-200 font-bold shadow-3xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  LHDN Individual Tax Relief Ready (up to RM 10k)
                </span>
              </div>
            </div>

            {/* Quick Conversion Card */}
            <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-sm max-w-sm w-full space-y-4 shrink-0">
              <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Malaysian Resident Access
                </span>
                <span className="text-xs font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                  Instant Verification
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-base text-[color:var(--ink)]">
                  Register Your Patient Membership
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Use your 12-digit MyKad for quick signup. Keep your consultations, receipts, and e-prescriptions organized in one place.
                </p>
              </div>
              <button
                type="button"
                onClick={goMemberSignup}
                className="w-full py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Register with MyKad (Free)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DETAILED SECTIONS ─── */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 w-full space-y-12">
        
        {/* Section 1: Detailed Clinical Services Breakdown */}
        <section className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="font-display font-black text-xl sm:text-2xl text-[color:var(--ink)]">
              Complete Clinical Services &amp; Transparent Fee Schedule
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Know exactly what you pay before consulting. All pricing is displayed transparently in Malaysian Ringgit (MYR).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* GP Consult */}
            <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)]">
                    <Video className="h-5 w-5" />
                  </span>
                  <span className="font-mono font-black text-base text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2.5 py-1 border border-[color:var(--t-200)]">
                    RM 35 Fixed
                  </span>
                </div>
                <h3 className="font-display font-black text-lg text-[color:var(--ink)]">
                  Doctor Video Consultation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Unhurried 15-minute video consultation with an MMC-licensed General Practitioner. Suitable for acute cough, fever, allergies, minor ailments, and medication renewals.
                </p>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100 font-medium">
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>10-Minute Wait Refund Guarantee</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Doctor-signed digital medical summary</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Direct e-prescription routing</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={goMemberSignup}
                className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-bold border border-[color:var(--t-200)] text-[color:var(--t-700)] transition-colors cursor-pointer"
              >
                Consult a Doctor
              </button>
            </div>

            {/* Specialist Consult */}
            <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <span className="font-mono font-black text-base text-rose-700 bg-rose-50 px-2.5 py-1 border border-rose-200">
                    From RM 80
                  </span>
                </div>
                <h3 className="font-display font-black text-lg text-[color:var(--ink)]">
                  Specialist Physician Review
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  In-depth consultations with Board-Certified Specialists in Cardiology, Endocrinology, Paediatrics, Dermatology, and Family Medicine.
                </p>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100 font-medium">
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>NSR-verified specialist physicians</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Pre-upload lab &amp; ECG reports for review</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Hospital referral letters if required</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={goMemberSignup}
                className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-bold border border-[color:var(--t-200)] text-[color:var(--t-700)] transition-colors cursor-pointer"
              >
                Book Specialist
              </button>
            </div>

            {/* Home Nursing */}
            <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <UserCheck className="h-5 w-5" />
                  </span>
                  <span className="font-mono font-black text-base text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                    From RM 120 / Visit
                  </span>
                </div>
                <h3 className="font-display font-black text-lg text-[color:var(--ink)]">
                  Home &amp; Bedside Nursing
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  LJM-verified registered nurses visiting your doorstep for post-surgical care, certified wound dressing, medication administration, and vital signs tracking.
                </p>
                <ul className="text-xs text-slate-700 space-y-2 pt-2 border-t border-slate-100 font-medium">
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Sterile surgical wound &amp; ulcer dressing</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Injections, infusions &amp; catheter care</span>
                  </li>
                  <li className="flex items-center gap-2 text-emerald-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Detailed clinical notes synced to doctor</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={goMemberSignup}
                className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-bold border border-[color:var(--t-200)] text-[color:var(--t-700)] transition-colors cursor-pointer"
              >
                Request Home Nurse
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Malaysian Payment Rails & LHDN Tax Relief */}
        <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[10px] font-mono font-extrabold uppercase tracking-wider text-[color:var(--t-700)] mb-1.5">
              <CreditCard className="h-3 w-3 text-[color:var(--t-600)]" />
              Malaysian Payment Rails &amp; Tax Deductions
            </span>
            <h2 className="font-display font-black text-xl sm:text-2xl text-[color:var(--ink)]">
              Local Payment Infrastructure &amp; LHDN Tax Relieved Receipts
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
              We eliminate credit card surcharges and currency conversion fees. Pay in Malaysian Ringgit through the banking rails you already trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center text-[color:var(--t-600)] font-black text-sm">
                  FPX
                </span>
                <div>
                  <h4 className="font-display font-black text-sm text-[color:var(--ink)]">FPX &amp; DuitNow QR</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Instant Online Bank Transfers</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Seamless checkout with Maybank2u, CIMB Clicks, Public Bank, RHB Now, Hong Leong Connect, AmBank, Bank Islam, GrabPay, and Touch ’n Go eWallet.
              </p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-display font-black text-sm text-[color:var(--ink)]">LHDN Tax Relief Ready</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Claim up to RM 10,000</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Download itemised, official medical receipts bearing doctor MMC numbers and diagnosis codes, eligible for individual income tax medical relief under LHDN.
              </p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center text-sky-600">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="font-display font-black text-sm text-[color:var(--ink)]">TPA &amp; Corporate Panels</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Insurance Reimbursement</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Receive standardized ICD-10 medical summaries formatted for direct employee claims and reimbursement from PMCare, MiCare, AIA, Prudential, and Great Eastern.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Embed Accessibility & Inclusive Design Standards */}
        <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs">
          <PatientAccess />
        </section>

        {/* Section 4: Patient FAQs */}
        <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[color:var(--t-600)]" />
            <h3 className="font-display font-black text-xl text-[color:var(--ink)]">
              Frequently Asked Questions for Malaysian Patients
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {FAQS.map((faq, index) => (
              <div key={faq.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group"
                >
                  <span className="font-display font-extrabold text-sm text-slate-800 group-hover:text-[color:var(--t-600)] transition-colors">
                    {faq.q}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-[color:var(--t-600)] shrink-0">
                    {activeFaq === index ? '−' : '+'}
                  </span>
                </button>
                {activeFaq === index && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed font-medium">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── BOTTOM MEMBER CONVERSION CALLOUT ─── */}
        <section className="bg-gradient-to-r from-[color:var(--t-600)] to-[color:var(--t-700)] text-white p-8 sm:p-10 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 border border-white/25 text-white text-xs font-extrabold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" />
                Join Over 14,000+ Malaysian Patients
              </span>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                Dignified, Transparent Healthcare in Your Pocket
              </h3>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed font-medium">
                Sign up today with your MyKad in less than 2 minutes. Experience unhurried doctor tele-visits, doctor-signed e-prescriptions, and licensed home nursing care.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={goMemberSignup}
                className="px-6 py-3 bg-white text-[color:var(--t-700)] hover:bg-slate-100 text-sm font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Heart className="h-4 w-4" />
                <span>Create Free Patient Account</span>
              </button>
              <a
                href="/"
                onClick={(e) => { e.preventDefault(); navigate('/'); }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-extrabold border border-white/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Back to Home</span>
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
