import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface BrandMarkProps {
  tone?: 'onColor' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MARK_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

/**
 * MediCred "Verified Pulse" emblem:
 * A shield (trust) holding a heartbeat that reads as an "M", with an emerald verified-check badge.
 * Theme-aware via CSS tokens (--t-*), so it syncs with every workspace theme.
 */
export function BrandMark({ tone = 'light', size = 'md', className = '' }: BrandMarkProps) {
  const shield = tone === 'light' ? 'var(--t-600)' : '#FFFFFF';
  const pulse = tone === 'light' ? '#FFFFFF' : 'var(--t-700)';
  const ring = tone === 'light' ? '#FFFFFF' : tone === 'dark' ? '#0F172A' : 'var(--t-700)';

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`shrink-0 ${MARK_SIZE[size]} ${className}`}
      aria-hidden="true"
    >
      <path d="M24 3 40 9v13c0 10-7 18-16 23C15 40 8 32 8 22V9z" fill={shield} />
      <path
        d="M13 26h5.5l3-9.5 5 15.5 3.5-10 1.5 4H35"
        stroke={pulse}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="38" r="8" fill="#10B981" stroke={ring} strokeWidth="2.5" />
      <path
        d="m32.5 38 2.5 2.5 4.5-5"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface BrandLogoProps {
  tone?: 'onColor' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: React.ReactNode;
  /** 'stacked' (default) puts the subtitle under the wordmark; 'badge' puts it in a bordered badge beside it, on one line. */
  layout?: 'stacked' | 'badge';
  className?: string;
}

/**
 * Unified MediCred brand lockup (Connected Care Pulse mark + two-tone wordmark + optional portal subtitle).
 */
export function BrandLogo({
  tone = 'light',
  size = 'md',
  subtitle,
  layout = 'stacked',
  className = '',
}: BrandLogoProps) {
  const wordmarkSize =
    size === 'sm'
      ? 'text-sm sm:text-base'
      : size === 'lg'
      ? 'text-xl sm:text-2xl'
      : 'text-xl';

  const mediColor =
    tone === 'onColor' || tone === 'dark' ? 'text-white' : 'text-[color:var(--ink)]';

  const credColor =
    tone === 'onColor'
      ? 'font-semibold text-[color:var(--t-100)]'
      : tone === 'dark'
      ? 'text-[color:var(--t-300)]'
      : 'text-[color:var(--t-600)]';

  const subColor =
    tone === 'onColor'
      ? 'text-white/90'
      : tone === 'dark'
      ? 'text-slate-400'
      : 'text-[color:var(--t-700)]';

  if (layout === 'badge' && subtitle) {
    return (
      <span className={`inline-flex items-center gap-3 sm:gap-4 min-w-0 ${className}`}>
        <span className="inline-flex items-center gap-3 min-w-0">
          <BrandMark tone={tone} size={size} />
          <span className={`font-display font-black tracking-tight leading-none ${wordmarkSize} ${mediColor}`}>
            Medi<span className={credColor}>Cred</span>
          </span>
        </span>
        <span className="hidden sm:block w-px h-8 bg-white/40" aria-hidden="true" />
        <span className="hidden sm:inline-flex items-center gap-2 h-8 px-3 bg-white/15 border border-white/40 text-white tag-pill font-extrabold uppercase tracking-[0.14em] whitespace-nowrap rounded-none">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
          {subtitle}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 min-w-0 ${className}`}>
      <BrandMark tone={tone} size={size} />
      <span className="flex flex-col leading-none min-w-0">
        <span className={`font-display font-black tracking-tight ${wordmarkSize} ${mediColor}`}>
          Medi<span className={credColor}>Cred</span>
        </span>
        {subtitle && (
          <span className={`text-2xs font-extrabold uppercase tracking-[0.16em] mt-1 truncate ${subColor}`}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export default BrandLogo;
