import { useTr } from '../locale';
import React from 'react';
import { openLegal } from '../legal';
import { navigate, loginUrl, type PortalRole } from '../nav';
import { ChevronRight, LogOut } from 'lucide-react';
import BrandLogo from '../shared/ui/BrandLogo';

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
  /** Where the portal links go. Defaults to the sign-in page for that role, so every page works without passing it. */
  onLoginRole?: (role: 'patient' | 'practitioner' | 'admin' | 'pharmacy', register?: boolean) => void;
  onLogout?: () => void;
}

// MediCred Medical Cross Emblem
function Cross({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
    </svg>
  );
}

/** The company's real address and contact email are set per deployment. When they are not set, nothing is shown. */
const env = (import.meta as any).env ?? {};
const COMPANY_ADDRESS: string = env.VITE_COMPANY_ADDRESS || '';
const CONTACT_EMAIL: string = env.VITE_CONTACT_EMAIL || '';

const linkCls = 'hover:text-white transition-colors cursor-pointer block';
const legalBtn = 'hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit';

export default function Footer({
  variant = 'landing',
  navItems = [],
  activeView,
  onNavigateView,
  onLoginRole,
  onLogout,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const tt = useTr();
  const goRole = (role: 'patient' | 'practitioner' | 'admin' | 'pharmacy', register?: boolean) =>
    onLoginRole ? onLoginRole(role, register) : navigate(loginUrl(role as PortalRole, !!register));

  // ─── STREAMLINED COMPACT FOOTER FOR USER DASHBOARDS ───
  if (variant === 'app') {
    return (
      <footer className="app-dark-footer bg-[color:var(--dark)] text-slate-400 border-t border-[color:var(--t-800)]/60 shrink-0 mt-auto py-2.5">
        <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">

          {/* Left: Brand Emblem & Copyright */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-slate-400 text-center md:text-left justify-center md:justify-start">
            <BrandLogo tone="dark" size="sm" />
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-xs text-slate-400">&copy; {currentYear} MediCred Healthcare Network Sdn Bhd</span>
          </div>

          {/* Right: Essential Legal Links, Emergency & Sign Out */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 justify-center">
            <button type="button" onClick={() => openLegal('notice')} className={legalBtn}>{tt('Privacy Policy')}</button>
            <span className="text-slate-700">&bull;</span>
            <button type="button" onClick={() => openLegal('terms')} className={legalBtn}>{tt('Terms of Care')}</button>
            <span className="text-slate-700">&bull;</span>
            <span className="text-slate-400">
              {tt('Emergency:')} <strong className="text-white font-bold">{tt('Call 999')}</strong>
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
                  <span>{tt('Sign Out')}</span>
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
      <div className="page-w mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-5 md:pt-7 md:pb-6 space-y-4">

        {/* ─── TIER 1: NAVIGATION ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6 pb-5 border-b border-[color:var(--t-800)]">

          {/* Column 1: identity */}
          <div className="lg:col-span-3 space-y-2.5">
            <BrandLogo tone="dark" size="sm" />
            <p className="text-xs text-slate-400 leading-snug max-w-sm">
              {tt('A Malaysian healthcare directory and booking platform: hospital packages, registered doctors and nurses, and community pharmacies, with the credential checks shown on each profile.')}
            </p>
            <div className="pt-0.5">
              <a
                href="/packages"
                onClick={e => { e.preventDefault(); navigate('/packages'); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <span>{tt('Browse Marketplace')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Column 2: Packages & directory (no counts: they would be fixed text, not the real number) */}
          <div className="space-y-2 lg:col-span-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-1.5">
              {tt('Packages & Directory')}
            </h4>
            <ul className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-1 text-xs text-slate-400">
              {([
                ['/packages', 'Healthcare Packages & Offers'],
                ['/packages?view=hospitals', 'Hospitals'],
                ['/packages?view=clinics', 'Specialist & Ambulatory Clinics'],
                ['/packages?view=doctors', 'Doctors'],
                ['/packages?view=nurses', 'Nurses'],
                ['/packages?view=pharmacies', 'Pharmacies & Vouchers'],
              ] as const).map(([to, label]) => (
                <li key={to}>
                  <a href={to} onClick={e => { e.preventDefault(); navigate(to); }} className={`${linkCls} font-medium`}>{tt(label)}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Portals */}
          <div className="hidden md:block lg:col-span-2 space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-1.5">
              {tt('Portal Lounges')}
            </h4>
            <ul className="space-y-1 text-xs">
              {([
                ['patient', 'Patient Lounge'],
                ['practitioner', 'Doctor Console'],
                ['practitioner', 'Nurse Shift Hub'],
                ['pharmacy', 'Pharmacy Queue'],
                ['admin', 'Board Admin Desk'],
              ] as const).map(([role, label]) => (
                <li key={label}>
                  <button type="button" onClick={() => goRole(role)} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left flex items-center justify-between w-full group">
                    <span>{tt(label)}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-[color:var(--t-600)]" />
                  </button>
                </li>
              ))}
              <li className="pt-0.5">
                <button type="button" onClick={() => goRole('patient', true)} className="text-[color:var(--t-300)] hover:text-white font-bold transition-colors cursor-pointer text-left flex items-center gap-1">
                  <span>{tt('Register as Patient →')}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Verification & audiences */}
          <div className="hidden md:block lg:col-span-2 space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-1.5">
              {tt('Verification Hub')}
            </h4>
            <ul className="space-y-1 text-xs text-slate-400">
              {([
                ['/verify-practitioners', 'Practitioner Licence Verification'],
                ['/for-patients', 'Malaysian Patients (MyKad)'],
                ['/medical-tourism', 'International Medical Tourism'],
                ['/for-clinics', 'Clinics & Hospitals Hub'],
                ['/for-doctors', 'MMC Doctor Portal'],
                ['/for-nurses', 'LJM Nurse Portal'],
              ] as const).map(([to, label]) => (
                <li key={to}>
                  <a href={to} onClick={e => { e.preventDefault(); navigate(to); }} className={linkCls}>{tt(label)}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Legal and contact: real links only */}
          <div className="hidden md:block lg:col-span-2 space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-widest border-b border-slate-800 pb-1.5">
              {tt('Legal & Help')}
            </h4>
            <ul className="space-y-1 text-xs text-slate-400">
              <li><button type="button" onClick={() => openLegal('notice')} className={`${legalBtn} text-left`}>{tt('Privacy Policy')}</button></li>
              <li><button type="button" onClick={() => openLegal('terms')} className={`${legalBtn} text-left`}>{tt('Terms of Service')}</button></li>
              <li>
                <a href="/assistance" onClick={e => { e.preventDefault(); navigate('/assistance'); }} className={linkCls}>{tt('Help & enquiries')}</a>
              </li>
              {CONTACT_EMAIL && <li><a href={`mailto:${CONTACT_EMAIL}`} className={linkCls}>{CONTACT_EMAIL}</a></li>}
              {COMPANY_ADDRESS && <li className="text-slate-300 leading-tight pt-1">{COMPANY_ADDRESS}</li>}
            </ul>
          </div>

        </div>

        {/* ─── TIER 2: DISCLAIMER ─── */}
        <div className="bg-black/25 border border-[color:var(--t-800)] px-3.5 py-2.5 text-xs leading-snug">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 shrink-0 bg-[color:var(--t-600)]/20 border border-[color:var(--t-600)]/40 text-white flex items-center justify-center mt-0.5">
              <Cross className="h-3 w-3 text-[color:var(--t-200)]" />
            </span>
            <p className="flex-1 text-xs text-slate-400 leading-snug">
              <strong className="text-white uppercase tracking-wider text-xs mr-1.5 font-bold">
                {tt('Medical Disclaimer:')}
              </strong>
              {tt('MediCred is an independent directory, credential-checking service and booking platform. It is not a regulator, a healthcare provider or an emergency service. Medical opinions, diagnoses and prescriptions are given by the registered practitioners themselves, who are not employed by MediCred. In an urgent or life-threatening emergency, call 999 (112 from a mobile phone) or go to the nearest hospital casualty department.')}
            </p>
          </div>
        </div>

        {/* ─── TIER 3: BOTTOM BAR ─── */}
        <div className="pt-0.5 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>{tt('© {year} MediCred Healthcare Network Sdn Bhd. All rights reserved.', { year: currentYear })}</span>
          <span className="text-slate-700 hidden sm:inline">&bull;</span>
          <button type="button" onClick={() => openLegal('notice')} className={legalBtn}>{tt('Privacy Policy')}</button>
          <span className="text-slate-700 hidden sm:inline">&bull;</span>
          <button type="button" onClick={() => openLegal('terms')} className={legalBtn}>{tt('Terms of Service')}</button>
        </div>

      </div>
    </footer>
  );
}