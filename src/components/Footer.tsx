import React from 'react';
import { openLegal } from '../legal';
import { navigate } from '../nav';
import { Globe, ChevronRight, LogOut } from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface FooterProps {
  variant?: 'landing' | 'app';
  navItems?: NavItem[];
  activeView?: string;
  onNavigateView?: (viewId: string) => void;
  onLoginRole?: (role: 'patient' | 'practitioner' | 'admin' | 'pharmacy', register?: boolean) => void;
  onLogout?: () => void;
}

// MedCred Medical Cross Emblem
function Cross({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
    </svg>
  );
}

export default function Footer({
  variant = 'landing',
  navItems = [],
  activeView,
  onNavigateView,
  onLoginRole,
  onLogout,
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  // ─── STREAMLINED COMPACT FOOTER FOR USER DASHBOARDS ───
  if (variant === 'app') {
    return (
      <footer className="app-dark-footer bg-[color:var(--dark)] text-slate-400 border-t border-[color:var(--t-800)]/60 shrink-0 mt-auto py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Left: Brand Emblem, Act 586 Status & Copyright */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-slate-400 text-center md:text-left justify-center md:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[color:var(--t-600)] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <Cross className="h-3 w-3" />
              </span>
              <span className="font-display font-extrabold text-sm text-white tracking-tight">MedCred</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse shrink-0" />
              Act 586 Verified
            </span>
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-xs text-slate-400">&copy; {currentYear} MedCred Healthcare Network Sdn Bhd</span>
          </div>

          {/* Right: Essential Legal Links, Emergency Dispatch & Sign Out */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 justify-center">
            <button type="button" onClick={() => openLegal('notice')} className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <span className="text-slate-700">&bull;</span>
            <button type="button" onClick={() => openLegal('terms')} className="hover:text-white transition-colors cursor-pointer">
              Terms of Care
            </button>
            <span className="text-slate-700">&bull;</span>
            <span className="hover:text-white transition-colors cursor-pointer">
              Clinical Governance
            </span>
            <span className="text-slate-700">&bull;</span>
            <span className="text-slate-400">
              Emergency: <strong className="text-white font-bold">Call 999</strong>
            </span>
            {onLogout && (
              <>
                <span className="text-slate-700">&bull;</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer font-bold inline-flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>

        </div>
      </footer>
    );
  }

  return (
    <footer className="app-dark-footer bg-[color:var(--dark)] text-slate-300 border-t border-[color:var(--t-800)] shrink-0 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-8 pb-8 md:pt-12 md:pb-10 space-y-5 md:space-y-6">
        
        {/* ─── TIER 1: 5-COLUMN STRUCTURED NAVIGATION & TELEMETRY HUB ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-6 md:pb-8 border-b border-[color:var(--t-800)]">
          
          {/* Column 1: Ecosystem Identity & Live Status Telemetry (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-800)] shadow-xs">
                <Cross className="h-4 w-4" />
              </span>
              <span className="font-display font-black text-xl text-white tracking-tight">MedCred</span>
              <span className="text-xs font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5">
                Registry v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              A network of verified doctors, nurses and pharmacies in Malaysia: licence checks, online consultations and doctor-signed e-prescriptions.
            </p>
          </div>

          {/* Column 2: Portals & Navigation (2 Cols) */}
          <div className="hidden md:block lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              Portal Lounges
            </h4>
            
            <ul className="space-y-2 text-xs">
                <li>
                  <button type="button" onClick={() => onLoginRole?.('patient')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left flex items-center justify-between w-full group">
                    <span>Patient Lounge</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--t-600)]" />
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onLoginRole?.('practitioner')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left flex items-center justify-between w-full group">
                    <span>Doctor Console</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--t-600)]" />
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onLoginRole?.('practitioner')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left flex items-center justify-between w-full group">
                    <span>Nurse Shift Hub</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--t-600)]" />
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onLoginRole?.('pharmacy')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left flex items-center justify-between w-full group">
                    <span>Pharmacy Queue</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--t-600)]" />
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onLoginRole?.('admin')} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left flex items-center justify-between w-full group">
                    <span>Board Admin Desk</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--t-600)]" />
                  </button>
                </li>
                <li className="pt-1">
                  <button type="button" onClick={() => onLoginRole?.('patient', true)} className="text-[color:var(--t-600)] hover:text-white font-bold transition-colors cursor-pointer text-left flex items-center gap-1">
                    <span>Register as Patient &rarr;</span>
                  </button>
                </li>
              </ul>
          </div>

          {/* Column 3: Verification & Registers (2 Cols) */}
          <div className="hidden md:block lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              Verification Hub
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="/verify-practitioners" onClick={e => { e.preventDefault(); navigate('/verify-practitioners'); }} className="hover:text-white transition-colors cursor-pointer block">
                  Practitioner Licence Verification
                </a>
              </li>
              <li>
                <a href="/for-patients" onClick={e => { e.preventDefault(); navigate('/for-patients'); }} className="hover:text-white transition-colors cursor-pointer block">
                  Malaysian Patients (MyKad)
                </a>
              </li>
              <li>
                <a href="/medical-tourism" onClick={e => { e.preventDefault(); navigate('/medical-tourism'); }} className="hover:text-white transition-colors cursor-pointer block">
                  International Medical Tourism
                </a>
              </li>
              <li>
                <a href="/for-clinics" onClick={e => { e.preventDefault(); navigate('/for-clinics'); }} className="hover:text-white transition-colors cursor-pointer block">
                  Clinics & Hospitals Hub
                </a>
              </li>
              <li>
                <a href="/for-doctors" onClick={e => { e.preventDefault(); navigate('/for-doctors'); }} className="hover:text-white transition-colors cursor-pointer block">
                  MMC Doctor Portal
                </a>
              </li>
              <li>
                <a href="/for-nurses" onClick={e => { e.preventDefault(); navigate('/for-nurses'); }} className="hover:text-white transition-colors cursor-pointer block">
                  LJM Nurse Portal
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance & Medical Governance (2 Cols) */}
          <div className="hidden md:block lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              Governance & Law
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-slate-200 cursor-pointer transition-colors">PHFSA Act 1998</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">KKM Telemedicine Norms</li>
              <li onClick={() => openLegal('notice')} className="hover:text-slate-200 cursor-pointer transition-colors">PDPA 2010 Privacy</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">E-E-A-T Medical Review</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">MMA Clinical Ethics</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">Indemnity Protocols</li>
            </ul>
          </div>

          {/* Column 5: Headquarters & Session Desk (2 Cols) */}
          <div className="hidden md:block lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              Operational HQ
            </h4>
            <div className="text-xs text-slate-400 space-y-2.5">
              <div>
                <span className="block text-xs uppercase font-bold text-slate-500">Kuala Lumpur Center</span>
                <p className="text-slate-300 text-xs leading-tight mt-0.5">
                  Level 28, The Horizon, Bangsar South, 59200 Kuala Lumpur
                </p>
              </div>
              <div>
                <span className="block text-xs uppercase font-bold text-slate-500">Registry Helpdesk</span>
                <p className="text-slate-300 font-mono text-xs">registry@medcred.gov.my</p>
              </div>
              <div>
                <span className="block text-xs uppercase font-bold text-slate-500">Audit Hours</span>
                <p className="text-slate-300 text-xs">Mon-Sun: 08:00 - 22:00 MYT</p>
              </div>
            </div>
          </div>

        </div>


        {/* ─── TIER 2: CLINICAL & REGULATORY DISCLAIMER CALLOUT ─── */}
        <div className="bg-black/25 border border-[color:var(--t-800)] p-4 sm:p-5 text-xs leading-relaxed">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 shrink-0 bg-[color:var(--t-600)]/20 border border-[color:var(--t-600)]/40 text-white flex items-center justify-center mt-0.5">
              <Cross className="h-3.5 w-3.5 text-[color:var(--t-200)]" />
            </span>
            <p className="flex-1 text-xs text-slate-400 leading-relaxed">
              <strong className="text-white uppercase tracking-wider text-xs mr-1.5 font-bold">
                Medical Disclaimer:
              </strong>
              MedCred operates as an independent medical directory, credential validation authority, and tele-consultation facilitation network. It is not an acute emergency response dispatch. Medical opinions, diagnoses, and prescriptions issued through the platform are rendered solely by autonomous, board-verified practitioners who maintain active Annual Practising Certificates (APC) under the Malaysian Medical Council or Lembaga Jururawat Malaysia. In the event of an urgent or life-threatening emergency, immediately contact national dispatch services at <strong className="text-white font-bold">999</strong> (112 from a mobile phone) or present at the nearest accredited hospital casualty department.
            </p>
          </div>
        </div>

        {/* ─── TIER 4: BOTTOM UTILITY BAR & LOCALIZATION ─── */}
        <div className="pt-2 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-start">
            <span>&copy; {currentYear} MedCred Healthcare Network Sdn Bhd. All rights reserved.</span>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span onClick={() => openLegal('notice')} className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span onClick={() => openLegal('terms')} className="hover:text-slate-200 cursor-pointer transition-colors">Terms of Service</span>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Clinical Governance</span>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Security Disclosure</span>
          </div>

          <div className="flex items-center gap-4 font-bold text-slate-300 shrink-0">
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <Globe className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> English
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              Bahasa Melayu
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none animate-pulse" />
              MY-KUL-01
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
