import React from 'react';
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

  return (
    <footer className="app-dark-footer bg-[color:var(--dark)] text-slate-300 border-t border-[color:var(--t-800)] shrink-0 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-14 pb-12 space-y-10">
        
        {/* ─── TIER 1: 5-COLUMN STRUCTURED NAVIGATION & TELEMETRY HUB ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-[color:var(--t-800)]">
          
          {/* Column 1: Ecosystem Identity & Live Status Telemetry (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-800)] shadow-xs">
                <Cross className="h-4 w-4" />
              </span>
              <span className="font-display font-black text-xl text-white tracking-tight">MedCred</span>
              <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5">
                {variant === 'app' ? 'Portal v2.4' : 'Registry v2.4'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Malaysia's sovereign clinical verification infrastructure. Real-time board credential auditing, authenticated e-prescriptions, and hospital shift locum governance.
            </p>

            {/* Real-time Health Telemetry Widget */}
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 space-y-2 max-w-sm">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <span className="w-2 h-2 bg-emerald-400 rounded-none animate-ping" />
                  Registry Network
                </span>
                <span className="text-emerald-400 font-mono font-bold text-[10px]">100% OPERATIONAL</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase">Latency</span>
                  <span className="text-slate-300 font-bold">14ms (KUL-01)</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[9px] uppercase">Encryption</span>
                  <span className="text-slate-300 font-bold">256-Bit AES / TLS 1.3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Portals & Navigation (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              {variant === 'app' ? 'Portal Sitemap' : 'Portal Lounges'}
            </h4>
            
            {variant === 'app' && navItems.length > 0 ? (
              <ul className="space-y-1.5 font-semibold">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onNavigateView?.(item.id)}
                        className={`flex items-center gap-2 text-xs transition-colors hover:text-white cursor-pointer w-full text-left py-1 group ${
                          isActive ? 'text-[color:var(--t-600)] font-extrabold' : 'text-slate-400'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[color:var(--t-600)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span>{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
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
            )}
          </div>

          {/* Column 3: Verification & Registers (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              Verification Hub
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#verify-section" className="hover:text-white transition-colors cursor-pointer block">
                  MMC Doctor Registry
                </a>
              </li>
              <li>
                <a href="#verify-section" className="hover:text-white transition-colors cursor-pointer block">
                  LJM Nurse Credentials
                </a>
              </li>
              <li>
                <a href="#verify-section" className="hover:text-white transition-colors cursor-pointer block">
                  APC Validity Search
                </a>
              </li>
              <li>
                <a href="#verify-section" className="hover:text-white transition-colors cursor-pointer block">
                  QR Prescription Audit
                </a>
              </li>
              <li>
                <span className="text-slate-500 flex items-center justify-between">
                  <span>NSR Specialists</span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5">Live</span>
                </span>
              </li>
              <li>
                <span className="text-slate-500 flex items-center justify-between">
                  <span>Disciplinary Log</span>
                  <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1 py-0.5">Clean</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance & Medical Governance (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              Governance & Law
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-slate-200 cursor-pointer transition-colors">PHFSA Act 1998</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">KKM Telemedicine Norms</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">PDPA 2010 Privacy</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">E-E-A-T Medical Review</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">MMA Clinical Ethics</li>
              <li className="hover:text-slate-200 cursor-pointer transition-colors">Indemnity Protocols</li>
            </ul>
          </div>

          {/* Column 5: Headquarters & Session Desk (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-[11px] font-black uppercase text-white tracking-widest border-b border-slate-800 pb-2">
              {variant === 'app' ? 'Session & HQ' : 'Operational HQ'}
            </h4>
            <div className="text-xs text-slate-400 space-y-2.5">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Kuala Lumpur Center</span>
                <p className="text-slate-300 text-[11px] leading-tight mt-0.5">
                  Level 28, The Horizon, Bangsar South, 59200 Kuala Lumpur
                </p>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Registry Helpdesk</span>
                <p className="text-slate-300 font-mono text-[11px]">registry@medcred.gov.my</p>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Audit Hours</span>
                <p className="text-slate-300 text-[11px]">Mon-Sun: 08:00 - 22:00 MYT</p>
              </div>

              {variant === 'app' && onLogout && (
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full px-3 py-2 bg-slate-900 hover:bg-rose-900/60 hover:border-rose-700 text-white text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Sign Out of Session</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>


        {/* ─── TIER 3: CLINICAL & REGULATORY DISCLAIMER ─── */}
        <div className="py-4 border-b border-[color:var(--t-800)] text-[11px] text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-300 uppercase tracking-wider text-[10px] mr-1">Medical Disclaimer:</strong>
            MedCred operates as an independent medical directory, credential validation authority, and tele-consultation facilitation network. It is not an acute emergency response dispatch. Medical opinions, diagnoses, and prescriptions issued through the platform are rendered solely by autonomous, board-verified practitioners who maintain active Annual Practising Certificates (APC) under the Malaysian Medical Council or Lembaga Jururawat Malaysia. In the event of an urgent or life-threatening emergency, immediately contact national dispatch services at <strong className="text-slate-200">999</strong> or present at the nearest accredited hospital casualty department.
          </p>
        </div>

        {/* ─── TIER 4: BOTTOM UTILITY BAR & LOCALIZATION ─── */}
        <div className="pt-2 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-start">
            <span>&copy; {currentYear} MedCred Healthcare Network Sdn Bhd. All rights reserved.</span>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="text-slate-700 hidden sm:inline">&bull;</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Terms of Service</span>
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
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none animate-pulse" />
              MY-KUL-01
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
