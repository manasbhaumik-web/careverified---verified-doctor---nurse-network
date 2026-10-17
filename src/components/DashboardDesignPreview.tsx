import React, { useState } from 'react';
import { 
  Activity, Video, Heart, Calendar, FolderHeart, Pill, ShieldCheck, 
  ArrowRight, Clock, CheckCircle2, ChevronRight, User, AlertCircle, 
  Sparkles, MessageSquare, PhoneCall, HeartPulse, RefreshCw, Layers, Check,
  Plane, BookOpen, LifeBuoy, Search, X, Menu, Bell
} from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import SOSButton from './SOSButton';
import NotificationBell from './NotificationBell';
import Footer from './Footer';
import { navigate } from '../nav';

export default function DashboardDesignPreview() {
  const [sample, setSample] = useState<1 | 2 | 3>(1);
  const [activeNav, setActiveNav] = useState('patient_dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--t-bg)] text-[color:var(--ink)] font-sans selection:bg-[color:var(--t-100)] selection:text-[color:var(--t-600)]">
      
      {/* ─── 0. TOP DESIGN SWITCHER BAR (COMPACT TOOLBAR) ─── */}
      <div className="bg-slate-950 text-white px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between border-b border-slate-800 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate('/')} 
            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            &larr; Back to MedCred Home
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[color:var(--t-300,#FDA4AF)]">
            Viewing: {sample === 1 ? '1. Telemetry Command' : sample === 2 ? '2. Care Journey' : '3. Health Bento'}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Switch Layout:</span>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setSample(1)}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                sample === 1 ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Telemetry Command
            </button>
            <button
              type="button"
              onClick={() => setSample(2)}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                sample === 2 ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Care Journey
            </button>
            <button
              type="button"
              onClick={() => setSample(3)}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                sample === 3 ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              3. Health Bento
            </button>
          </div>
        </div>
      </div>

      {/* ─── 1. MEDCRED PRIMARY APPLICATION HEADER (IN APPLICATION COLOR) ─── */}
      <header className="bg-[color:var(--t-600)] text-white border-0 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 shrink-0 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between h-16">

          {/* Brand Logo */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-none bg-white text-[color:var(--t-600)] flex items-center justify-center shrink-0 group-hover:bg-[color:var(--t-50)] transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
              </svg>
            </div>
            <div className="leading-none">
              <span className="font-display font-extrabold text-[22px] text-white tracking-tight block">
                MedCred<span className="text-white/80">.</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-white/90 uppercase tracking-[0.14em] block mt-1">
                Member Portal &bull; Act 586 Verified
              </span>
            </div>
          </div>

          {/* Right-Side Desktop Actions & User Session Details */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/15 border-0 shadow-none px-3 py-1.5 rounded-none text-xs font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" aria-hidden="true"></span>
              <ShieldCheck className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              <span>Council-Verified Network (Act 586)</span>
            </div>

            <LocaleSwitcher tone="onColor" />
            <ThemeSwitcher tone="onColor" />
            
            <div className="flex items-center gap-3 pl-4">
              <SOSButton />
              <NotificationBell />

              {/* Profile Badge */}
              <div className="flex items-center gap-2.5 bg-white/15 border-0 shadow-none px-2.5 py-1">
                <div className="w-8 h-8 bg-white text-[color:var(--t-800)] font-black text-xs flex items-center justify-center shrink-0">
                  AR
                </div>
                <div className="text-left hidden xl:block leading-tight">
                  <p className="text-xs font-black text-white leading-none truncate max-w-[140px]">Ahmad Bin Razak</p>
                  <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mt-0.5">
                    Member Account
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20 bg-transparent border-0 rounded-none transition-colors cursor-pointer ml-1 flex items-center justify-center"
                  title="Close Session"
                  aria-label="Close session"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ─── 2. ELEVATED SECONDARY NAVBAR (IN APPLICATION COLOR) ─── */}
      <nav aria-label="Dashboard navigation" className="hidden lg:block bg-[color:var(--t-800)] text-white border-0 px-4 sm:px-6 lg:px-8 shrink-0 sticky top-16 z-30">
        <div className="w-full max-w-[1920px] mx-auto flex items-stretch justify-between gap-4">
          <div className="flex items-stretch min-w-0 flex-1">

            {/* Navigation Tabs - Full Height & Width Coverage on Hover/Selection */}
            <div className="flex items-stretch gap-1 relative z-0 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveNav('patient_dashboard')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'patient_dashboard'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <Heart className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'patient_dashboard' ? 'text-white' : 'text-white/70'}`} />
                <span>Member Hub</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('consult')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'consult'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <Video className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'consult' ? 'text-white' : 'text-white/70'}`} />
                <span>Consult Now</span>
                <span className="text-[10px] px-2 py-0.5 rounded-none font-mono font-extrabold ml-0.5 bg-emerald-500 text-white">
                  Live
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('pharmacies')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'pharmacies'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <Pill className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'pharmacies' ? 'text-white' : 'text-white/70'}`} />
                <span>Pharmacies</span>
                <span className="text-[10px] px-2 py-0.5 rounded-none font-mono font-extrabold ml-0.5 bg-white/20 text-white">
                  3 Rx
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('tourism')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'tourism'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <Plane className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'tourism' ? 'text-white' : 'text-white/70'}`} />
                <span>Medical Tourism</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('registry')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'registry'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'registry' ? 'text-white' : 'text-white/70'}`} />
                <span>Doctors & Nurses</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('articles')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'articles'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <BookOpen className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'articles' ? 'text-white' : 'text-white/70'}`} />
                <span>Medical Library</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('help')}
                className={`relative flex items-center gap-2.5 px-4 xl:px-5 h-12 text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer select-none rounded-none ${
                  activeNav === 'help'
                    ? 'text-white bg-white/15 font-black'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                <LifeBuoy className={`h-4 w-4 shrink-0 transition-colors ${activeNav === 'help' ? 'text-white' : 'text-white/70'}`} />
                <span>Help Desk</span>
              </button>
            </div>
          </div>

          {/* Right: Registry live doctor telemetry indicator */}
          <div className="hidden xl:flex items-center gap-2.5 self-center shrink-0 whitespace-nowrap bg-white/15 border-0 px-3.5 py-1.5 rounded-none text-[11px] font-extrabold text-white my-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>24/7 MMC Doctors On-Call</span>
          </div>

        </div>
      </nav>

      {/* ─── 3. FULL-WIDTH HERO BANNER MAIN HEADER (OPTION 2: SOFT ICE-CYAN MORNING GLOW) ─── */}
      <div className="w-full relative overflow-hidden bg-[color:var(--t-50)] text-[color:var(--ink)] border-b border-[color:var(--t-200)] shadow-xs">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white text-[color:var(--t-700)] flex items-center justify-center font-black text-2xl shadow-sm border border-[color:var(--t-200)] shrink-0">
                AR
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[color:var(--ink)]">
                    Ahmad Bin Razak
                  </h1>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-white text-[color:var(--t-700)] border border-[color:var(--t-200)] tracking-wider shadow-2xs">
                    EHR Verified Patient &bull; Act 586
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[color:var(--ink-2)] font-semibold flex-wrap">
                  <span className="font-extrabold text-[color:var(--ink)]">Good afternoon</span>
                  <span className="text-slate-400">&bull;</span>
                  <span>Next: Dr. Tan Wei Lun (Cardiology) &bull; Tomorrow 10:30 AM</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-mono font-bold text-[color:var(--t-700)] bg-white px-2 py-0.5 border border-[color:var(--t-200)] shadow-2xs">
                    BP: 122/80 mmHg
                  </span>
                </div>
              </div>
            </div>

            {/* Header KPIs & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-stretch bg-white border border-[color:var(--t-200)] h-11 shadow-2xs">
                <div className="px-3.5 flex flex-col justify-center text-center border-r border-[color:var(--t-100)]">
                  <span className="text-base font-black leading-none text-[color:var(--ink)]">2</span>
                  <span className="text-[9px] uppercase font-bold text-[color:var(--t-600)]">Upcoming</span>
                </div>
                <div className="px-3.5 flex flex-col justify-center text-center border-r border-[color:var(--t-100)]">
                  <span className="text-base font-black leading-none text-[color:var(--ink)]">3</span>
                  <span className="text-[9px] uppercase font-bold text-[color:var(--t-600)]">Active Rx</span>
                </div>
                <div className="px-3.5 flex flex-col justify-center text-center">
                  <span className="text-base font-black leading-none text-[color:var(--ink)]">RM 250</span>
                  <span className="text-[9px] uppercase font-bold text-[color:var(--t-600)]">Care Wallet</span>
                </div>
              </div>

              <button 
                type="button" 
                className="h-11 px-4 bg-[color:var(--t-600)] text-white font-black text-xs border border-[color:var(--t-700)] hover:bg-[color:var(--t-700)] transition-all flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Video className="h-4 w-4" />
                <span>On-Call Doctor Now</span>
              </button>
              <button 
                type="button" 
                className="h-11 px-4 bg-white text-[color:var(--t-700)] font-bold text-xs border border-[color:var(--t-200)] hover:bg-[color:var(--t-50)] transition-all flex items-center gap-2 shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Triage</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. FULL-WIDTH SUB-TABS STRIP ─── */}
      <div className="w-full bg-white border-b border-[color:var(--t-200)] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex text-xs font-semibold overflow-x-auto">
          <button className="px-4 py-3.5 border-b border-[color:var(--t-600)] text-[color:var(--t-700)] font-extrabold flex items-center gap-2 whitespace-nowrap">
            <Calendar className="h-4 w-4 text-[color:var(--t-600)]" />
            <span>My Care & Appointments</span>
            <span className="bg-[color:var(--t-600)] text-white text-[10px] px-1.5 py-0.2 rounded-full">2</span>
          </button>
          <button className="px-4 py-3.5 border-b border-transparent text-slate-600 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors flex items-center gap-2 whitespace-nowrap">
            <FolderHeart className="h-4 w-4 text-slate-400" />
            <span>Clinical Health Records (EHR)</span>
          </button>
          <button className="px-4 py-3.5 border-b-2 border-transparent text-slate-600 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors flex items-center gap-2 whitespace-nowrap">
            <Pill className="h-4 w-4 text-slate-400" />
            <span>Pharmacy & e-Prescriptions</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">3</span>
          </button>
          <button className="px-4 py-3.5 border-b-2 border-transparent text-slate-600 hover:text-[color:var(--t-600)] hover:bg-[color:var(--t-50)] transition-colors flex items-center gap-2 whitespace-nowrap">
            <Heart className="h-4 w-4 text-slate-400" />
            <span>Saved Practitioners</span>
          </button>
        </div>
      </div>

      {/* ─── 5. MAIN USER DASHBOARD CONTENT WORKSPACE ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ========================================================================= */}
        {/* SAMPLE 1: CLINICAL TELEMETRY COMMAND */}
        {/* ========================================================================= */}
        {sample === 1 && (
          <div className="mt-0 space-y-5 animate-fade-in">

            {/* Live Telemetry Strip HUD */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-[color:var(--t-200)] p-4 border-l-4 border-l-[color:var(--t-600)] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <span>Blood Pressure</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold">Optimal</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  122/80 <span className="text-xs font-normal text-slate-500">mmHg</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Logged today, 8:15 AM via Omron Sync</div>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 border-l-4 border-l-emerald-600 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <span>Resting Heart Rate</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold">Normal</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  68 <span className="text-xs font-normal text-slate-500">BPM</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Cardiac rhythm regular &bull; Normal sinus</div>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 border-l-4 border-l-amber-500 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <span>Fasting Glucose</span>
                  <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 border border-amber-200 font-bold">Borderline</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  5.8 <span className="text-xs font-normal text-slate-500">mmol/L</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Slight elevation &bull; Next HbA1c test Oct 22</div>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-4 border-l-4 border-l-[color:var(--t-600)] shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <span>Oxygen (SpO2)</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold">99%</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  99 <span className="text-xs font-normal text-slate-500">%</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Excellent peripheral saturation</div>
              </div>
            </div>

            {/* 2-Column Split: Scheduled Consult + Prescriptions */}
            <div className="grid lg:grid-cols-12 gap-5">
              {/* Upcoming Appointment */}
              <div className="lg:col-span-7 bg-white border border-[color:var(--t-200)] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[color:var(--t-600)]"></span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Upcoming Video Consultation</h2>
                  </div>
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold">
                    SLOT CONFIRMED
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[color:var(--t-50)] border border-[color:var(--t-200)]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 bg-white border border-[color:var(--t-200)] flex items-center justify-center font-bold text-slate-700 text-lg shrink-0">
                      TW
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900">Dr. Tan Wei Lun</h3>
                        <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 border border-slate-300 text-slate-700">MMC #48291</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">Consultant Cardiologist &bull; Gleneagles Hospital KL</p>
                      <p className="text-xs font-extrabold text-[color:var(--t-700)] mt-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Tomorrow &bull; 10:30 AM &bull; 30 Mins (Encrypted WebRTC Room)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                    <button className="px-4 py-2.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black transition-all cursor-pointer text-center whitespace-nowrap">
                      Enter Consultation Room
                    </button>
                    <button className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer text-center">
                      Reschedule
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                  <p><strong>Clinical Reason:</strong> 3-Month Hypertension review & Holter telemetry readout.</p>
                  <p><strong>Document Access:</strong> Dr. Tan has pre-consultation clearance to view your recent vitals and blood profile.</p>
                </div>
              </div>

              {/* Active Prescriptions */}
              <div className="lg:col-span-5 bg-white border border-[color:var(--t-200)] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-600"></span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Active e-Prescriptions</h2>
                  </div>
                  <span className="text-xs font-bold text-[color:var(--t-700)]">3 Current</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">Amlodipine Besylate 5mg</div>
                      <div className="text-[11px] text-slate-600">1 Tablet Daily &bull; Morning</div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-0.5">24 Days Supply Remaining</div>
                    </div>
                    <button className="px-2.5 py-1.5 bg-white border border-[color:var(--t-200)] text-[color:var(--t-700)] font-extrabold text-xs hover:bg-[color:var(--t-100)] cursor-pointer whitespace-nowrap">
                      Refill
                    </button>
                  </div>

                  <div className="p-3 bg-white border border-[color:var(--t-200)] flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-xs text-slate-900">Atorvastatin Calcium 20mg</div>
                      <div className="text-[11px] text-slate-600">1 Tablet Nightly &bull; Before sleep</div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">Dispatched to Caring Pharmacy Bangsar</div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 font-bold whitespace-nowrap">
                      READY FOR PICKUP
                    </span>
                  </div>
                </div>

                <button className="w-full py-2.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] font-black text-xs hover:bg-[color:var(--t-100)] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <span>Find Licensed Partner Pharmacy</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SAMPLE 2: CARE JOURNEY TIMELINE */}
        {/* ========================================================================= */}
        {sample === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="border border-[color:var(--t-200)] shadow-xs bg-white p-6 space-y-6">
              <div className="border-b border-[color:var(--t-100)] pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2.5 py-0.5 border border-[color:var(--t-200)]">
                    ACTIVE EPISODE OF CARE
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                    Post-Surgical Day 14 Recovery & Wound Healing
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Assigned Care Coordinator: <strong>Staff Nurse Siti Aishah</strong> (LJM Reg: #62810 &bull; Pantai Hospital Cheras)
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button className="px-4 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black cursor-pointer shadow-xs">
                    Message Nurse Manager
                  </button>
                  <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer">
                    Discharge Plan Instructions
                  </button>
                </div>
              </div>

              {/* 5-Step Trajectory Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3.5 bg-emerald-50 border-t-4 border-t-emerald-600 border border-emerald-200">
                  <span className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Step 1 &bull; Complete
                  </span>
                  <p className="font-extrabold text-xs text-slate-900 mt-1">Discharge & e-Prescription</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Oct 02 &bull; Hospital Pharmacy</p>
                </div>

                <div className="p-3.5 bg-emerald-50 border-t-4 border-t-emerald-600 border border-emerald-200">
                  <span className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Step 2 &bull; Complete
                  </span>
                  <p className="font-extrabold text-xs text-slate-900 mt-1">In-Home Wound Dressing</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Oct 06 &bull; LJM Nurse Visited</p>
                </div>

                <div className="p-3.5 bg-[color:var(--t-50)] border-t-4 border-t-[color:var(--t-600)] border border-[color:var(--t-200)] shadow-xs">
                  <span className="text-[10px] font-black text-[color:var(--t-700)] uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[color:var(--t-600)] animate-ping" />
                    Step 3 &bull; In Progress
                  </span>
                  <p className="font-extrabold text-xs text-slate-900 mt-1">Suture Line Teleconsult</p>
                  <p className="text-[10px] text-slate-600 font-semibold mt-0.5">Tomorrow, 10:30 AM</p>
                </div>

                <div className="p-3.5 bg-slate-50 border-t-4 border-t-slate-300 border border-slate-200 opacity-60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Step 4 &bull; Pending</span>
                  <p className="font-bold text-xs text-slate-700 mt-1">Physiotherapy Tele-Session</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Scheduled Oct 20</p>
                </div>

                <div className="p-3.5 bg-slate-50 border-t-4 border-t-slate-300 border border-slate-200 opacity-60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Step 5 &bull; Pending</span>
                  <p className="font-bold text-xs text-slate-700 mt-1">Final Care Discharge Clearance</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Target Oct 28</p>
                </div>
              </div>

              {/* Action Callout */}
              <div className="p-4 bg-[color:var(--t-50)] border border-[color:var(--t-200)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[color:var(--t-600)] text-white flex items-center justify-center font-bold text-base shrink-0">
                    !
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">Pre-Consultation Photo Upload Required</p>
                    <p className="text-xs text-slate-600">Please capture a well-lit photo of your incision line before tomorrow's video consult for Dr. Tan's assessment.</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-[color:var(--t-600)] text-white font-black text-xs hover:bg-[color:var(--t-700)] cursor-pointer whitespace-nowrap">
                  Upload Secure Photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SAMPLE 3: EXECUTIVE HEALTH BENTO */}
        {/* ========================================================================= */}
        {sample === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bento 1: Rapid Telehealth */}
              <div 
                className="p-5 text-white flex flex-col justify-between h-56 border border-[color:var(--t-700)] shadow-xs"
                style={{ background: 'linear-gradient(135deg, var(--t-600) 0%, var(--t-800) 100%)' }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5">RAPID TELEHEALTH</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>
                  <h3 className="text-xl font-black mt-3">Connect to On-Call Doctor</h3>
                  <p className="text-xs text-white/80 mt-1">12 MMC-registered physicians online now. Average connect time under 4 minutes.</p>
                </div>
                <button className="w-full py-2.5 bg-white text-[color:var(--t-800)] font-black text-xs hover:bg-[color:var(--t-50)] transition-colors cursor-pointer text-center">
                  Start Live Triage &bull; RM 50
                </button>
              </div>

              {/* Bento 2: Act 586 QR Health Pass */}
              <div className="p-5 bg-white border border-[color:var(--t-200)] flex flex-col justify-between h-56 shadow-2xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)]">
                    ACT 586 STATUTORY COMPLIANCE
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2">Hospital Check-in QR Pass</h3>
                  <p className="text-xs text-slate-600 mt-1">One-tap cryptographic QR pass sharing encrypted medical history with private clinic reception desks.</p>
                </div>
                <button className="w-full py-2 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] font-extrabold text-xs hover:bg-[color:var(--t-100)] cursor-pointer text-center">
                  Display Verified Pass
                </button>
              </div>

              {/* Bento 3: Records Vault */}
              <div className="p-5 bg-white border border-[color:var(--t-200)] flex flex-col justify-between h-56 shadow-2xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    CONCIERGE VAULT
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2">Medical Records Vault</h3>
                  <p className="text-xs text-slate-600 mt-1">8 verified laboratory & radiology reports archived with permanent cryptographic audit signatures.</p>
                </div>
                <button className="w-full py-2 bg-white border border-slate-300 text-slate-700 font-extrabold text-xs hover:bg-slate-50 cursor-pointer text-center">
                  Access My Records Archive
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ─── 4. COMPACT DASHBOARD FOOTER ─── */}
      <Footer variant="app" onLogout={() => navigate('/')} />
    </div>
  );
}
