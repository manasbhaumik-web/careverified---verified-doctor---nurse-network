import React, { useState } from 'react';
import {
  ShieldCheck, CheckCircle2, ArrowRight, Video, Pill,
  UserCheck, Hospital, Heart, Clock, Check,
  ChevronRight, Sparkles, RefreshCw, AlertCircle, PhoneCall
} from 'lucide-react';
import { navigate } from '../nav';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';

// Bundled high-res assets
import malaysianMaleDoctor from '../../assets/malaysian_male_doctor.jpg';
import malaysianFemaleDoctor from '../../assets/malaysian_female_doctor.jpg';
import malaysianFemaleNurse from '../../assets/malaysian_female_nurse.jpg';
import malaysianMalePatient from '../../assets/malaysian_male_patient.jpg';
import pharmacyHeroBg from '../../assets/pharmacies_hero_bg.jpg';
import hospitalHeroBg from '../../assets/clinics_hospital_hero_bg.jpg';
import practitionersHeroBg from '../../assets/practitioners_hero_bg.jpg';
import clinicalSuiteFull from '../../assets/clean_light_doctor_suite_full.jpg';
import heroBgImage from '../../assets/landing_hero_treatment_nursing_pharmacy_2.jpg';

export default function LandingDesignPreview() {
  const [activeTab, setActiveTab] = useState<'all' | 'hero' | 'services' | 'journey'>('all');

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--t-bg)] text-[color:var(--ink)] font-sans selection:bg-[color:var(--t-100)] selection:text-[color:var(--t-600)]">

      {/* ─── 0. TOP DESIGN TOOLBAR ─── */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-800 text-xs shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors bg-white/10 px-2.5 py-1 border border-white/20"
          >
            &larr; Back to MedCred Home
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Landing Page Visual Redesign Samples (Less Text, More Visuals)
          </span>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <div className="flex items-center bg-slate-950 p-0.5 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 font-bold cursor-pointer transition-all ${
                activeTab === 'all' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Samples
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hero')}
              className={`px-3 py-1 font-bold cursor-pointer transition-all ${
                activeTab === 'hero' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Hero Doctor Card
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1 font-bold cursor-pointer transition-all ${
                activeTab === 'services' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Services 4-Card Gallery
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('journey')}
              className={`px-3 py-1 font-bold cursor-pointer transition-all ${
                activeTab === 'journey' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Visual Verification Journey
            </button>
          </div>
          <ThemeSwitcher />
        </div>
      </div>

      {/* ─── BANNER / EXECUTIVE SUMMARY ─── */}
      <div className="bg-white border-b border-[color:var(--t-200)] py-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[color:var(--t-50)] text-[color:var(--t-700)] text-xs font-mono font-extrabold uppercase tracking-wider border border-[color:var(--t-200)] mb-2.5">
              Visual-First Design Proposal
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight">
              Transforming Text Walls into Photographic Storytelling
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-3xl leading-relaxed">
              Replacing dense monospace audit tables, repetitive statutory disclaimers, and lengthy paragraph tabs with high-impact AI healthcare imagery, scannable data chips, and human doctor cards.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-[color:var(--t-50)]/70 border border-[color:var(--t-200)] p-4 text-center shrink-0">
            <div>
              <div className="text-xl font-black text-emerald-600">-65%</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Word Count</div>
            </div>
            <div className="border-x border-[color:var(--t-200)] px-3">
              <div className="text-xl font-black text-[color:var(--t-600)]">1 : 1</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Image to Copy</div>
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">&lt; 3s</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Scan Speed</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-16 flex-1">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SAMPLE 1: HERO SECTION REDESIGN */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'all' || activeTab === 'hero') && (
          <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[color:var(--t-200)] pb-4 gap-2">
              <div>
                <span className="text-xs font-mono font-extrabold uppercase text-[color:var(--t-600)] tracking-wider">Sample 1 · Hero Section</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  Replace Monospace Audit Box with a Cinematic Doctor Card
                </h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
                Before: 120 words · After: 24 words
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              
              {/* CURRENT BEFORE */}
              <div className="border border-red-200 bg-red-50/20 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono font-extrabold text-red-700 pb-2.5 border-b border-red-200 mb-4">
                    <span>CURRENT (TEXT-HEAVY)</span>
                    <span>Dense technical table</span>
                  </div>
                  <div className="bg-white border border-slate-300 p-5 font-mono text-xs text-slate-700 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Verified Doctor on Call</span>
                      <span className="text-emerald-700 font-black text-[10px] bg-emerald-50 px-2 py-0.5 border border-emerald-200">Verified Active</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-sans">Attentive Clinical Care</div>
                    <div className="text-slate-500 text-xs font-sans">Dr. Tan Seng Hock · MMC Registered · Kuala Lumpur Specialist Hospital</div>
                    <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Council Registration:</span>
                        <span className="font-bold text-slate-800">DEMO-MMC-32109</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Statutory Standing:</span>
                        <span className="text-emerald-700 font-bold">Good Standing · Active APC</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Consultation Mode:</span>
                        <span className="text-slate-800 font-bold">Unhurried Video or Chat</span>
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-100">
                      <span>AUDIT REF: 8F2A-9912</span>
                      <span>MEDCRED REGISTRY</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-red-700 mt-4 font-medium italic">
                  Note: Reading code hashes and regulatory tables creates cognitive friction for unwell patients.
                </p>
              </div>

              {/* PROPOSED AFTER */}
              <div className="border border-emerald-300 bg-emerald-50/20 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono font-extrabold text-emerald-800 pb-2.5 border-b border-emerald-200 mb-4">
                    <span>PROPOSED VISUAL REDESIGN</span>
                    <span>Emotional warmth &amp; instant credibility</span>
                  </div>

                  {/* Proposed Card */}
                  <div className="bg-white border border-slate-200 shadow-md overflow-hidden group">
                    <div className="relative h-64 bg-slate-100 overflow-hidden">
                      <img
                        src={malaysianMaleDoctor}
                        alt="Dr. Tan Seng Hock"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Floating Badge Overlay */}
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-[color:var(--t-200)] px-3 py-1 flex items-center gap-2 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-extrabold text-slate-900">Dr. Tan Seng Hock</span>
                        <span className="text-[10px] font-mono text-[color:var(--t-700)] font-extrabold bg-[color:var(--t-50)] px-1.5 py-0.5 border border-[color:var(--t-200)]">
                          MMC 32109
                        </span>
                      </div>

                      {/* Bottom Gradient Tag */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-4 text-white">
                        <div className="text-xs font-bold text-slate-200">Senior Consultant Physician · 18 Yrs Experience</div>
                        <div className="text-xs text-emerald-300 font-extrabold mt-0.5 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Online Now · Video Consult within 10 Mins</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-900">10-Min Wait Guarantee · RM 35</div>
                        <div className="text-[11px] text-slate-500 font-medium">Full refund if doctor is delayed</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Consult Now</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-emerald-800 mt-4 font-medium">
                  Benefit: Patients instantly recognize a caring, certified doctor while maintaining council verification.
                </p>
              </div>

            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SAMPLE 2: CLINICAL SERVICES 4-CARD VISUAL GALLERY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'all' || activeTab === 'services') && (
          <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[color:var(--t-200)] pb-4 gap-2">
              <div>
                <span className="text-xs font-mono font-extrabold uppercase text-[color:var(--t-600)] tracking-wider">Sample 2 · Clinical Services Suite</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  Replace Text-Heavy Tabs with a 4-Card Visual Showcase
                </h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] self-start sm:self-auto">
                All 4 Services Visible at a Glance
              </span>
            </div>

            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Currently, users must click 4 vertical tabs and read long paragraph blocks. In this proposed layout, all 4 key services are presented side-by-side with high-resolution photography and 2 bulleted benefit checks.
            </p>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* CARD 1: DOCTOR CONSULT */}
              <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all shadow-xs hover:shadow-md flex flex-col justify-between group">
                <div>
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={malaysianFemaleDoctor}
                      alt="Tele-Consultation"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-[color:var(--t-600)] text-white text-[10px] font-mono font-extrabold px-2 py-0.5 shadow-xs">
                      01 · TREATMENT
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-display font-black text-base text-slate-900 group-hover:text-[color:var(--t-600)] transition-colors">
                      Doctor Tele-Consultations
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Unhurried, empathetic video consultations with board-certified doctors in Malaysia.
                    </p>
                    <ul className="text-xs text-slate-700 font-semibold space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>10-min wait refund guarantee</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Doctor-signed digital medical slip</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-extrabold border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] text-[color:var(--t-700)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Talk with a Doctor</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* CARD 2: BEDSIDE NURSING */}
              <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all shadow-xs hover:shadow-md flex flex-col justify-between group">
                <div>
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={malaysianFemaleNurse}
                      alt="Home Nursing"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-mono font-extrabold px-2 py-0.5 shadow-xs">
                      02 · NURSING
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-display font-black text-base text-slate-900 group-hover:text-[color:var(--t-600)] transition-colors">
                      Home &amp; Bedside Nursing
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      LJM-verified registered nurses visiting your home for post-op, wound care &amp; vitals.
                    </p>
                    <ul className="text-xs text-slate-700 font-semibold space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Certified wound &amp; elderly care</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Pre-scheduled home visits</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => navigate('/for-nurses')}
                    className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-extrabold border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] text-[color:var(--t-700)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Request Home Nurse</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* CARD 3: PHARMACY DISPENSING */}
              <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all shadow-xs hover:shadow-md flex flex-col justify-between group">
                <div>
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={pharmacyHeroBg}
                      alt="Pharmacy Dispensing"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-amber-600 text-white text-[10px] font-mono font-extrabold px-2 py-0.5 shadow-xs">
                      03 · PHARMACY
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-display font-black text-base text-slate-900 group-hover:text-[color:var(--t-600)] transition-colors">
                      QR E-Prescriptions
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Doctor-signed digital prescriptions with safety allergy checks at verified pharmacies.
                    </p>
                    <ul className="text-xs text-slate-700 font-semibold space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Community pharmacy pickup</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>0% commission on medications</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => navigate('/for-pharmacies')}
                    className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-extrabold border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] text-[color:var(--t-700)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Nearby Pharmacies</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* CARD 4: MEDICAL TOURISM & HOSPITALS */}
              <div className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-all shadow-xs hover:shadow-md flex flex-col justify-between group">
                <div>
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img
                      src={hospitalHeroBg}
                      alt="Hospital Tourism"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-indigo-600 text-white text-[10px] font-mono font-extrabold px-2 py-0.5 shadow-xs">
                      04 · HOSPITALS
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-display font-black text-base text-slate-900 group-hover:text-[color:var(--t-600)] transition-colors">
                      Specialist Hospitals
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Pre-travel itemised quotes &amp; intake for international patients visiting Malaysia.
                    </p>
                    <ul className="text-xs text-slate-700 font-semibold space-y-1.5 pt-2 border-t border-slate-100">
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>JCI &amp; MSQH accredited centres</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Passport-only quick intake</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => navigate('/for-clinics')}
                    className="w-full py-2 bg-[color:var(--t-50)] hover:bg-[color:var(--t-600)] hover:text-white text-xs font-extrabold border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] text-[color:var(--t-700)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Hospital Concierge</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SAMPLE 3: 3-STEP VISUAL VERIFICATION JOURNEY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'all' || activeTab === 'journey') && (
          <section className="bg-white border border-[color:var(--t-200)] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[color:var(--t-200)] pb-4 gap-2">
              <div>
                <span className="text-xs font-mono font-extrabold uppercase text-[color:var(--t-600)] tracking-wider">Sample 3 · Statutory Verification</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  Replace 5 Legal Text Boxes with a 3-Step Visual Stepper
                </h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                Replaces 400 Words of Legalistic Paragraphs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* STEP 1 */}
              <div className="bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] p-6 space-y-4 relative group hover:border-[color:var(--t-600)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-none bg-[color:var(--t-600)] text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                    01
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-[color:var(--t-700)] uppercase tracking-wider bg-white px-2 py-0.5 border border-[color:var(--t-200)]">
                    Official Audit
                  </span>
                </div>
                <div className="h-36 bg-slate-100 overflow-hidden border border-[color:var(--t-200)] shadow-2xs">
                  <img
                    src={clinicalSuiteFull}
                    alt="Council Audit"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div>
                  <h4 className="font-display font-black text-base text-slate-900">Direct MMC &amp; LJM Audit</h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                    Every doctor and nurse is checked by hand against official council databases before a profile is ever activated.
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] p-6 space-y-4 relative group hover:border-[color:var(--t-600)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-none bg-[color:var(--t-600)] text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                    02
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-[color:var(--t-700)] uppercase tracking-wider bg-white px-2 py-0.5 border border-[color:var(--t-200)]">
                    Hourly Sync
                  </span>
                </div>
                <div className="h-36 bg-slate-100 overflow-hidden border border-[color:var(--t-200)] shadow-2xs">
                  <img
                    src={practitionersHeroBg}
                    alt="Continuous Oversight"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div>
                  <h4 className="font-display font-black text-base text-slate-900">Continuous APC Oversight</h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                    Annual Practising Certificates are tracked continuously. Expired certificates are automatically locked out from consultation.
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="bg-[color:var(--t-50)]/40 border border-[color:var(--t-200)] p-6 space-y-4 relative group hover:border-[color:var(--t-600)] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-none bg-[color:var(--t-600)] text-white font-mono font-black text-sm flex items-center justify-center shadow-xs">
                    03
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    Patient Safe
                  </span>
                </div>
                <div className="h-36 bg-slate-100 overflow-hidden border border-[color:var(--t-200)] shadow-2xs">
                  <img
                    src={malaysianMalePatient}
                    alt="Patient Peace of Mind"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div>
                  <h4 className="font-display font-black text-base text-slate-900">Complete Peace of Mind</h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                    You consult with total confidence knowing your health is managed by bona fide, licensed medical practitioners.
                  </p>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ─── BOTTOM ACTION CALLOUT ─── */}
        <div className="bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-black text-lg text-slate-900">
              Ready to approve any of these visual samples?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Let me know which sections you'd like implemented first into the main Landing Page!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
            >
              Return to Landing Page
            </button>
          </div>
        </div>

      </main>

      <Footer variant="app" onLoginRole={() => navigate('/login')} />

    </div>
  );
}
