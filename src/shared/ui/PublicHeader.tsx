import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronLeft,
  Globe,
  Heart,
  PackagePlus,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import LocaleSwitcher from '../../components/LocaleSwitcher';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import { loginUrl, navigate, useLocation } from '../../nav';

export interface PublicHeaderProps {
  /** Optional contextual pill shown next to the brand mark on sm+ viewports */
  badge?: string;
  /** Optional subtitle under BrandLogo */
  subtitle?: React.ReactNode;
  /** Primary action button label (defaults to "Sign In") */
  ctaLabel?: string;
  /** Primary action click handler (defaults to navigating to /login) */
  onCtaClick?: () => void;
  /** Optional secondary outline action button */
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
}

const CARE_LINKS = [
  {
    href: '/verify',
    label: 'Verify a Doctor or Nurse',
    desc: 'Check MMC & LJM registration status',
    Icon: ShieldCheck,
  },
  {
    href: '/packages',
    label: 'Packages & Directory',
    desc: 'Browse verified clinicians, clinics & packages',
    Icon: PackagePlus,
  },
  {
    href: '/for-patients',
    label: 'For Patients (Malaysia)',
    desc: 'Teleconsults, home nursing & e-prescriptions',
    Icon: Heart,
  },
  {
    href: '/medical-tourism',
    label: 'Medical Tourism',
    desc: 'International patient concierge & packages',
    Icon: Globe,
  },
] as const;

const PROVIDER_LINKS = [
  {
    href: '/for-doctors',
    label: 'Doctors (MMC)',
    desc: 'Telehealth, referrals & 100% fee clarity',
    Icon: Stethoscope,
  },
  {
    href: '/for-nurses',
    label: 'Nurses (LJM)',
    desc: 'In-home nursing care & verified shifts',
    Icon: UserCheck,
  },
  {
    href: '/for-clinics',
    label: 'Clinics & Hospitals',
    desc: 'Packages, locum staffing & referrals',
    Icon: Building2,
  },
  {
    href: '/for-pharmacies',
    label: 'Community Pharmacies',
    desc: 'Digital e-prescription dispensing & pickup',
    Icon: Pill,
  },
] as const;

export default function PublicHeader({
  badge,
  subtitle,
  ctaLabel = 'Sign In',
  onCtaClick,
  secondaryLabel,
  onSecondaryClick,
}: PublicHeaderProps) {
  const { path } = useLocation();
  const [openMenu, setOpenMenu] = useState<'care' | 'providers' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const go = (href: string) => {
    setOpenMenu(null);
    navigate(href);
  };

  const ESSENTIAL_LINKS = [
    { href: '/verify', label: 'Verify Licence' },
    { href: '/packages', label: 'Packages & Directory' },
    { href: '/for-patients', label: 'For Patients' },
    { href: '/medical-tourism', label: 'Medical Tourism' },
    { href: '/for-practitioners', label: 'Doctors & Nurses' },
    { href: '/for-clinics', label: 'Clinics & Hospitals' },
    { href: '/for-pharmacies', label: 'Pharmacies' },
  ] as const;

  return (
    <>
      {path !== '/' && (
        <div className="bg-[color:var(--t-900)] text-white/90">
          <nav
            aria-label="Quick essential links"
            className="page-w mx-auto px-4 sm:px-6 lg:px-12 flex flex-wrap items-center gap-x-5 gap-y-1 py-1 text-sm font-semibold"
          >
            <a
              href="/"
              onClick={e => {
                e.preventDefault();
                go('/');
              }}
              className="min-h-[44px] inline-flex items-center gap-1 hover:text-white hover:underline cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Home</span>
            </a>
            {ESSENTIAL_LINKS.map(link => {
              const isActive =
                path === link.href ||
                (link.href === '/for-practitioners' && (path === '/for-doctors' || path === '/for-nurses')) ||
                (link.href === '/for-clinics' && path === '/for-hospitals') ||
                (link.href === '/verify' && path === '/verify-practitioners') ||
                (link.href === '/packages' && ['/doctors', '/nurses', '/clinics', '/hospitals', '/pharmacies-directory'].includes(path));
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={e => {
                    e.preventDefault();
                    go(link.href);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[44px] inline-flex items-center hover:text-white hover:underline cursor-pointer whitespace-nowrap ${
                    isActive ? 'font-extrabold text-white' : ''
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      )}
      <header
        ref={navRef}
        className="sticky top-0 z-50 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)] shadow-2xs"
      >
      <div className="page-w mx-auto px-4 sm:px-6 lg:px-12 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/"
            onClick={e => {
              e.preventDefault();
              go('/');
            }}
            className="group min-w-0 cursor-pointer"
            aria-label="MediCred home"
          >
            <BrandLogo tone="light" size="md" subtitle={subtitle} />
          </a>
          {badge && (
            <span className="hidden xl:inline-block tag-pill font-extrabold uppercase px-2 py-0.5 bg-[color:var(--t-100)] text-[color:var(--t-700)] border border-[color:var(--t-300)] whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>

        <nav aria-label="Public navigation" className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2.5">
          {/* Explore Care Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(m => (m === 'care' ? null : 'care'))}
              aria-haspopup="true"
              aria-expanded={openMenu === 'care'}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                openMenu === 'care'
                  ? 'bg-white text-[color:var(--t-700)] border-[color:var(--t-600)] shadow-xs'
                  : 'text-[color:var(--ink)] bg-white/80 hover:bg-white border-[color:var(--t-200)]'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
              <span>Explore Care</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                  openMenu === 'care' ? 'rotate-180 text-[color:var(--t-600)]' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {openMenu === 'care' && (
              <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 sm:w-80 z-50 bg-white border border-[color:var(--t-200)] shadow-xl p-2 space-y-1">
                {CARE_LINKS.map(({ href, label, desc, Icon }) => {
                  const active = path === href;
                  return (
                    <a
                      key={href}
                      href={href}
                      onClick={e => {
                        e.preventDefault();
                        go(href);
                      }}
                      className={`flex items-start gap-3 p-2.5 transition-colors group ${
                        active ? 'bg-[color:var(--t-50)] border-l-2 border-[color:var(--t-600)]' : 'hover:bg-[color:var(--t-50)]'
                      }`}
                    >
                      <span className="w-8 h-8 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[color:var(--ink)] group-hover:text-[color:var(--t-700)] flex items-center justify-between">
                          <span>{label}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)]" aria-hidden="true" />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* For Providers Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(m => (m === 'providers' ? null : 'providers'))}
              aria-haspopup="true"
              aria-expanded={openMenu === 'providers'}
              className={`inline-flex items-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                openMenu === 'providers'
                  ? 'bg-white text-[color:var(--t-700)] border-[color:var(--t-600)] shadow-xs'
                  : 'text-[color:var(--ink)] bg-white/80 hover:bg-white border-[color:var(--t-200)]'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5 text-[color:var(--t-600)]" aria-hidden="true" />
              <span className="hidden min-[440px]:inline">For Providers</span>
              <span className="min-[440px]:hidden">Providers</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
                  openMenu === 'providers' ? 'rotate-180 text-[color:var(--t-600)]' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {openMenu === 'providers' && (
              <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 z-50 bg-white border border-[color:var(--t-200)] shadow-xl p-2 space-y-1">
                {PROVIDER_LINKS.map(({ href, label, desc, Icon }) => {
                  const active = path === href;
                  return (
                    <a
                      key={href}
                      href={href}
                      onClick={e => {
                        e.preventDefault();
                        go(href);
                      }}
                      className={`flex items-start gap-3 p-2.5 transition-colors group ${
                        active ? 'bg-[color:var(--t-50)] border-l-2 border-[color:var(--t-600)]' : 'hover:bg-[color:var(--t-50)]'
                      }`}
                    >
                      <span className="w-8 h-8 shrink-0 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] group-hover:bg-[color:var(--t-600)] group-hover:text-white transition-colors flex items-center justify-center">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[color:var(--ink)] group-hover:text-[color:var(--t-700)] flex items-center justify-between">
                          <span>{label}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[color:var(--t-600)]" aria-hidden="true" />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <a
            href="/packages"
            onClick={e => {
              e.preventDefault();
              go('/packages');
            }}
            className={`hidden md:inline-flex items-center min-h-[40px] px-3 text-xs sm:text-sm font-bold border transition-colors ${
              path === '/packages'
                ? 'bg-[color:var(--t-100)] text-[color:var(--t-800)] border-[color:var(--t-300)]'
                : 'text-[color:var(--ink)] bg-white/80 hover:bg-white border-[color:var(--t-200)]'
            }`}
          >
            Packages
          </a>

          {secondaryLabel && onSecondaryClick && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="hidden sm:inline-flex items-center min-h-[40px] px-3 text-xs sm:text-sm font-bold text-[color:var(--t-700)] bg-white hover:bg-[color:var(--t-50)] border border-[color:var(--t-300)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {secondaryLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onCtaClick ?? (() => go(loginUrl('patient', false)))}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <LocaleSwitcher />
          <span className="hidden sm:inline-flex">
            <ThemeSwitcher />
          </span>
        </nav>
      </div>
    </header>
    </>
  );
}
