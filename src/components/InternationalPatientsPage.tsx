import React, { useState } from 'react';
import { 
  Plane, Globe, Building2, ShieldCheck, Heart, ArrowRight, ArrowLeft, 
  Car, Languages, Utensils, HeartHandshake, FileText, CheckCircle2, 
  HelpCircle, Sparkles, DollarSign, ExternalLink, Check
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import TouristAccess from './TouristAccess';
import { navigate, loginUrl } from '../nav';

interface InternationalPatientsPageProps {
  onSignUp?: () => void;
}

export default function InternationalPatientsPage({ onSignUp }: InternationalPatientsPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const goMemberSignup = () => {
    if (onSignUp) onSignUp();
    else navigate(loginUrl('patient', true));
  };

  const FAQS = [
    {
      q: 'Do I need a Malaysian MyKad to register and send an inquiry?',
      a: 'No. International patients and medical travellers register directly using their international passport number, nationality, and date of birth. Our platform coordinates pre-travel intakes without any local Malaysian ID requirement.'
    },
    {
      q: 'How are hospital quotes calculated and billed?',
      a: 'All Malaysian hospitals officially bill in Malaysian Ringgit (MYR). We provide transparent indicative benchmarks in your home currency (USD, SGD, IDR, AUD, SAR). The final itemised quote is issued directly by your chosen accredited hospital with zero hidden platform markups.'
    },
    {
      q: 'Can I obtain a Malaysian Medical Visa / eVisa?',
      a: 'Yes. If you are travelling from a country requiring an entry visa, Malaysia Healthcare Travel Council (MHTC) member hospitals issue official appointment letters and Medical Visa facilitation documents for you and an accompanying companion.'
    },
    {
      q: 'Are on-site medical interpreters available at the hospitals?',
      a: 'Yes. Participating specialist hospitals in Kuala Lumpur and Penang provide dedicated international patient lounges with professional interpreters fluent in Arabic, Bahasa Indonesia, Mandarin, and English.'
    },
    {
      q: 'How do I share my medical records with my family doctor back home?',
      a: 'Upon discharge, your hospital provides a bilingual English/Malay medical summary. You can store this in your MedCred patient vault and generate an encrypted, time-limited link to share directly with your home country physician.'
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
              <span className="text-[color:var(--t-700)]">International Patients &amp; Travel Guide</span>
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
              <Plane className="h-3.5 w-3.5" />
              <span>Register with Passport</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── FULL-WIDTH APPLICATION HERO BANNER ─── */}
      <section className="w-full bg-[color:var(--t-50)] text-slate-900 border-b border-[color:var(--t-200)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-xs border border-[color:var(--t-200)] text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono">03</span>
                <Globe className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span>International Patients &amp; Medical Tourism</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-[color:var(--ink)] tracking-tight leading-tight">
                Welcoming You to Malaysia · <span className="text-[color:var(--t-600)]">Cross-Border Care Guide</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-2xl">
                Comprehensive guidance, travel logistics, and accredited hospital coordination for international patients and medical travellers seeking world-class medical treatment in Malaysia.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="bg-white px-2.5 py-1 border border-[color:var(--t-200)] font-bold text-slate-700 shadow-3xs">
                  JCI &amp; MSQH Accredited Hospitals
                </span>
                <span className="bg-white px-2.5 py-1 border border-[color:var(--t-200)] font-bold text-slate-700 shadow-3xs">
                  MHTC Facilitated Medical Visas
                </span>
                <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 border border-emerald-200 font-bold shadow-3xs flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Transparent Itemised MYR Quotes (Zero Agency Markup)
                </span>
              </div>
            </div>

            {/* Quick Conversion Card */}
            <div className="bg-white border border-[color:var(--t-200)] p-6 shadow-sm max-w-sm w-full space-y-4 shrink-0">
              <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Passport Registration
                </span>
                <span className="text-xs font-mono font-extrabold text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                  International Member
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-base text-[color:var(--ink)]">
                  Begin Your Healing Journey
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Register with your passport to submit diagnostic reports, request specialist remote case reviews, and receive structured hospital quotes.
                </p>
              </div>
              <button
                type="button"
                onClick={goMemberSignup}
                className="w-full py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold border border-[color:var(--t-700)] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plane className="h-3.5 w-3.5" />
                <span>Register with Passport (Free)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPREHENSIVE TOURIST ACCESS EMBEDDED CONTENT ─── */}
      <main className="flex-grow w-full space-y-12">
        <TouristAccess onSignUp={goMemberSignup} />

        {/* Section: International Travel FAQs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-12">
          <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[color:var(--t-600)]" />
              <h3 className="font-display font-black text-xl text-[color:var(--ink)]">
                Frequently Asked Questions for Medical Travellers
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
          <section className="mt-12 bg-gradient-to-r from-[color:var(--t-600)] to-[color:var(--t-700)] text-white p-8 sm:p-10 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 border border-white/25 text-white text-xs font-extrabold uppercase tracking-widest">
                  <Sparkles className="h-3.5 w-3.5" />
                  International Patient Membership
                </span>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                  Travel with Confidence to Malaysia
                </h3>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed font-medium">
                  Register as an International Member with your Passport. Access verified hospital benchmarks, upload diagnostic imaging securely, and connect directly with hospital coordinators.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={goMemberSignup}
                  className="px-6 py-3 bg-white text-[color:var(--t-700)] hover:bg-slate-100 text-sm font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plane className="h-4 w-4" />
                  <span>Register with Passport (Free)</span>
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
        </div>
      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
