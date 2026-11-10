import React, { useState } from 'react';
import { 
  Activity, Video, Heart, Calendar, FolderHeart, Pill, ShieldCheck, ChevronDown, 
  ArrowRight, Clock, CheckCircle2, ChevronRight, User, AlertCircle, 
  Sparkles, MessageSquare, PhoneCall, HeartPulse, RefreshCw, Layers, Check,
  Plane, BookOpen, LifeBuoy, Search, X, Menu, Bell, Settings, Plus, Stethoscope, Building2
} from 'lucide-react';
import { navigate } from '../nav';

export default function HeaderColorSamples() {
  const [activeRole, setActiveRole] = useState<'practitioner' | 'patient' | 'pharmacy' | 'facility'>('practitioner');
  const [viewMode, setViewMode] = useState<'proposed' | 'current' | 'compare'>('proposed');

  const roleConfig = {
    practitioner: {
      regBadge: 'Act 586 Licensed',
      regText: 'Council-Verified Practitioner Network · Ministry of Health Malaysia',
      brandSub: 'Doctor Workspace · MMC Registered',
      userName: 'Dr. Sarah Tan',
      userRole: 'MMC #48291',
      heroBadge: 'Clinical Suite',
      heroTitle: 'Outpatient Teleconsultation & Clinical Queue',
      heroDesc: 'Manage live triage queues, issue digital prescriptions (e-Rx), and review patient health records under MMC Code of Professional Conduct.',
      tabs: [
        { id: 'onboard', name: 'Clinical Queue', active: true, count: '4 Live' },
        { id: 'recruitment', name: 'Locum Shifts', count: '2 Open' },
        { id: 'practice_compliance', name: 'Practice Compliance', count: 'MMC/APC' },
        { id: 'performance_profile', name: 'Performance Profile' }
      ]
    },
    patient: {
      regBadge: 'Patient Portal',
      regText: 'Verified Care Network · 24/7 Medical Support Hotline Active',
      brandSub: 'Patient Workspace · MyKad Verified',
      userName: 'Enche Ahmad Razif',
      userRole: 'MRN #89124',
      heroBadge: 'Personal Healthcare',
      heroTitle: 'Patient Care Hub & Medical Records',
      heroDesc: 'Access upcoming consultations, active prescriptions, lab results, and hospital guarantee letters in one encrypted vault.',
      tabs: [
        { id: 'patient_care', name: 'My Care', active: true, count: '1 Next' },
        { id: 'patient_records', name: 'Health Records (EHR)', count: '12 Files' },
        { id: 'patient_services', name: 'Clinical Services', count: 'Packages' },
        { id: 'patient_discovery', name: 'Directory & Doctors' }
      ]
    },
    pharmacy: {
      regBadge: 'Poisons Act 1952',
      regText: 'Type A Poison Licensed Dispensary · Digital Statutory Dispensing Book',
      brandSub: 'Pharmacy Workspace · MOH Reg: A-8492',
      userName: 'Apothecary Lee',
      userRole: 'Pharm #P-9021',
      heroBadge: 'Dispensing Station',
      heroTitle: 'Pharmacy Dispensing Queue & Cold-Chain Dispatch',
      heroDesc: 'Fulfill verified digital prescriptions, sign statutory poison registers, and coordinate Grab/Lalamove 2°C–8°C cold-chain couriers.',
      tabs: [
        { id: 'pharmacy_dispensing', name: 'Dispensing Queue', active: true, count: '8 Pending' },
        { id: 'pharmacy_operations', name: 'Poisons Logbook', count: 'Statutory' }
      ]
    },
    facility: {
      regBadge: 'PHFMC Act 1998',
      regText: 'Licensed Private Healthcare Facility · Hospital Operations Centre',
      brandSub: 'Facility Workspace · Gleneagles KL',
      userName: 'Dato Dr. Lim',
      userRole: 'Medical Director',
      heroBadge: 'Operations Control',
      heroTitle: 'Ward Census, OT Scheduling & Locum Staffing',
      heroDesc: 'Monitor bed occupancy rates, allocate operating theatres, and credential locum doctors and private nurses across all clinical units.',
      tabs: [
        { id: 'facility_staffing', name: 'Clinical Staffing', active: true, count: '6 Shifts' },
        { id: 'facility_care', name: 'OT Scheduling', count: '4 Active' },
        { id: 'facility_profile', name: 'Ward & Bed Census', count: '88% Occupied' }
      ]
    }
  };

  const current = roleConfig[activeRole];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      
      {/* Interactive Control Header */}
      <div className="max-w-[1440px] mx-auto bg-slate-950 border border-slate-800 p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-2xs uppercase tracking-widest font-mono font-bold bg-[color:var(--t-600)] text-white">
              Live Interactive Prototype
            </span>
            <span className="text-xs text-slate-400 font-mono">http://localhost:3000/header-samples</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            MediCred User Workspace Header &amp; Public Alignment
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare the Proposed Luminous Public-Matching Header against the Current Dark Teal Stack.
          </p>
        </div>

        {/* View Mode & Role Switches */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* Mode Selector */}
          <div className="flex items-center bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('proposed')}
              className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'proposed'
                  ? 'bg-[color:var(--t-600)] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✦ Proposed (Public Match)
            </button>
            <button
              onClick={() => setViewMode('current')}
              className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'current'
                  ? 'bg-[color:var(--t-600)] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Current (Dark Teal Stack)
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer hidden xl:inline-block ${
                viewMode === 'compare'
                  ? 'bg-[color:var(--t-600)] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
          </div>

          {/* Role Selector */}
          <div className="flex items-center bg-slate-900 p-1 border border-slate-800 text-xs">
            <span className="text-2xs font-mono font-bold text-slate-400 uppercase px-2">Role:</span>
            <div className="flex items-center gap-1">
              {(['practitioner', 'patient', 'pharmacy', 'facility'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-2.5 py-1 text-xs font-bold capitalize transition-colors cursor-pointer ${
                    activeRole === role
                      ? 'bg-white text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="text-xs font-bold px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white cursor-pointer ml-1"
          >
            &larr; Exit Preview
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PROPOSED LUMINOUS PUBLIC-MATCHING HEADER                               */}
      {/* ========================================================================= */}
      {(viewMode === 'proposed' || viewMode === 'compare') && (
        <div className="max-w-[1440px] mx-auto bg-white text-slate-800 border-2 border-[color:var(--t-600)] shadow-2xl overflow-hidden">
          
          {/* Label Bar */}
          <div className="bg-slate-900 text-white px-4 py-1.5 text-2xs font-mono font-bold uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              RECOMMENDED SPECIFICATION: Luminous Swiss Clinical Stack (Matching Landing &amp; Public Pages)
            </span>
            <span className="text-[color:var(--t-300)]">bg-[color:var(--t-50)]/95 · Ink Logo MediCred. · Circular Outline Settings &amp; Bell</span>
          </div>

          {/* TIER 0: Top Regulatory & Statutory Ribbon */}
          <div className="bg-[color:var(--t-100)] text-[color:var(--t-800)] text-xs font-semibold py-2 px-4 sm:px-6 lg:px-8 border-b border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[color:var(--t-600)] text-white px-2 py-0.5 text-2xs uppercase tracking-wider font-extrabold rounded-none">
                <ShieldCheck className="h-3 w-3" />
                {current.regBadge}
              </span>
              <span className="text-xs font-bold text-[color:var(--t-900)] truncate">
                {current.regText}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-[color:var(--t-700)]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Council-Verified Network
              </span>
              <span className="text-[color:var(--t-300)]">|</span>
              <span className="font-mono text-2xs font-bold">HOTLINE: 1-800-MEDICRED</span>
            </div>
          </div>

          {/* TIER 1: Primary Navbar (Matching LandingPage.tsx) */}
          <nav className="bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)] px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">

              {/* Brand Logo Lockup */}
              <div className="flex items-center gap-3.5 cursor-pointer group min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-none bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)] group-hover:bg-[color:var(--t-700)] transition-colors shadow-2xs">
                  <Plus className="h-5 w-5" />
                </span>
                <div className="flex flex-col leading-none">
                  <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-[color:var(--ink)]">
                    MediCred<span className="text-[color:var(--t-600)]">.</span>
                  </span>
                  <span className="text-2xs font-extrabold uppercase tracking-[0.16em] text-[color:var(--t-600)] mt-1 truncate">
                    {current.brandSub}
                  </span>
                </div>
              </div>

              {/* Central Global Search Bar (Cmd+K) */}
              <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
                <div className="w-full relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-[color:var(--t-600)] pointer-events-none" />
                  <input
                    type="text"
                    readOnly
                    value="Search patient, IC, prescription, or clinical protocol (⌘K)..."
                    className="w-full h-10 pl-9 pr-14 text-xs font-semibold bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-400)] rounded-none text-slate-700 shadow-2xs"
                  />
                  <span className="absolute right-2.5 px-1.5 py-0.5 text-2xs font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200 select-none">⌘K</span>
                </div>
              </div>

              {/* Right Action Cluster: Circular Outline Buttons */}
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                
                {/* Language Switcher */}
                <button className="h-9 px-2.5 bg-white/80 hover:bg-white text-slate-700 hover:text-[color:var(--t-700)] border border-[color:var(--t-200)] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer rounded-none">
                  <span>EN</span>
                </button>

                {/* Circular Outline Settings Button */}
                <button 
                  className="w-9 h-9 rounded-full border border-[color:var(--t-200)] bg-white/80 hover:bg-white text-slate-700 hover:text-[color:var(--t-600)] flex items-center justify-center shadow-2xs transition-all hover:border-[color:var(--t-400)] cursor-pointer"
                  title="Workspace Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* Circular Outline Notification Bell */}
                <button 
                  className="relative w-9 h-9 rounded-full border border-[color:var(--t-200)] bg-white/80 hover:bg-white text-slate-700 hover:text-[color:var(--t-600)] flex items-center justify-center shadow-2xs transition-all hover:border-[color:var(--t-400)] cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
                </button>

                {/* Hairline Divider */}
                <div className="h-5 w-px bg-[color:var(--t-200)] mx-0.5" aria-hidden="true" />

                {/* Profile Badge & Close Session */}
                <div className="flex items-center gap-2 bg-white border border-[color:var(--t-200)] px-2.5 py-1 rounded-none shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-300)] flex items-center justify-center text-xs font-black">
                    {current.userName.charAt(0)}
                  </div>
                  <div className="hidden xl:block text-left leading-tight">
                    <p className="text-xs font-black text-[color:var(--ink)] truncate max-w-[120px]">{current.userName}</p>
                    <p className="text-2xs font-extrabold uppercase tracking-wider text-[color:var(--t-600)]">{current.userRole}</p>
                  </div>
                  <button className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors ml-1" title="Close Session">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* TIER 2: Workspace Domain Navigation Strip (Luminous White/Mint) */}
          <div className="bg-white/95 backdrop-blur-md border-b border-[color:var(--t-200)] px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <nav className="flex items-center gap-1 min-w-0 overflow-x-auto py-1">
                {current.tabs.map((tab: any, idx: number) => (
                  <button
                    key={idx}
                    className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs font-bold rounded-none cursor-pointer whitespace-nowrap transition-colors ${
                      tab.active
                        ? 'text-[color:var(--t-800)] bg-[color:var(--t-50)] border-b-2 border-[color:var(--t-600)] font-black'
                        : 'text-slate-600 hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]/60'
                    }`}
                  >
                    <span>{tab.name}</span>
                    {tab.count && (
                      <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded-none ${
                        tab.active ? 'bg-[color:var(--t-600)] text-white' : 'bg-[color:var(--t-100)] text-[color:var(--t-800)]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="hidden sm:flex items-center gap-2 shrink-0 py-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-2xs font-extrabold font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  On-Call: Active
                </span>
              </div>
            </div>
          </div>

          {/* TIER 3: Workspace Hero Identity & Subtabs */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-2xs font-bold uppercase tracking-widest">
                    {current.heroBadge}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">WORKSPACE ID: 2026-MY</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  {current.heroTitle}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-3xl">
                  {current.heroDesc}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button className="h-9 px-4 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
                  Statutory Reference
                </button>
                <button className="h-9 px-4 text-xs font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] transition-colors shadow-xs cursor-pointer flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Action Trigger</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview Content Area */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Notice the unified harmony: light mint tone, dark ink typography, and delicate hairline borders identical to the public pages.</span>
            <span className="font-mono font-bold text-[color:var(--t-600)]">WCAG 2.1 AAA Compliant</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CURRENT DARK TEAL STACK (FOR COMPARISON)                               */}
      {/* ========================================================================= */}
      {(viewMode === 'current' || viewMode === 'compare') && (
        <div className="max-w-[1440px] mx-auto bg-white text-slate-800 border border-slate-700 shadow-xl overflow-hidden mt-6">
          
          {/* Label Bar */}
          <div className="bg-slate-950 text-slate-400 px-4 py-1.5 text-2xs font-mono font-bold uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
            <span>BASELINE REFERENCE: Current Dark Teal Stack</span>
            <span className="text-slate-500">bg-[color:var(--t-600)] + bg-[color:var(--t-800)]</span>
          </div>

          {/* Current Header Tier 1: Dark Solid Teal */}
          <header className="bg-[color:var(--t-600)] text-white px-4 sm:px-6 lg:px-8 shadow-sm">
            <div className="flex items-center justify-between h-16 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-white text-[color:var(--t-600)] flex items-center justify-center font-black">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-white">MediCred</span>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-2xs font-bold uppercase tracking-wider bg-white/20 text-white">
                  Council-Verified (Act 586)
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button className="w-9 h-9 rounded-full border border-white/25 bg-white/10 text-white flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </button>
                <button className="w-9 h-9 rounded-full border border-white/25 bg-white/10 text-white flex items-center justify-center">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 bg-white/15 px-2.5 py-1 text-white">
                  <span className="text-xs font-bold">{current.userName}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Current Subnav Tier 2: Dark Navy/Teal */}
          <div className="bg-[color:var(--t-800)] text-white px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 h-12 text-xs font-bold overflow-x-auto">
              {current.tabs.map((tab, idx) => (
                <span 
                  key={idx} 
                  className={`px-4 py-2 ${tab.active ? 'bg-white/15 text-white font-black' : 'text-white/70'}`}
                >
                  {tab.name}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-100 text-slate-600 text-xs">
            <p>The heavy dark teal blocks above create a stark visual break from the bright mint aesthetic of the public pages.</p>
          </div>
        </div>
      )}

    </div>
  );
}
