import React from 'react';

export interface BrandMarkProps {
  tone?: 'onColor' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MARK_SIZE: Record<'sm' | 'md' | 'lg', { box: string; svg: string }> = {
  sm: { box: 'w-6 h-6 rounded-[6px]', svg: 'h-6 w-6' },
  md: { box: 'w-9 h-9 rounded-[8px]', svg: 'h-9 w-9' },
  lg: { box: 'w-10 h-10 rounded-[9px]', svg: 'h-10 w-10' },
};

/**
 * MediCred "Connected Care Pulse" emblem:
 * A sculpted clinical waveform forming an abstract "M" bridge with an emerald verified node.
 * Uses CSS theme tokens (--t-*) so it automatically syncs with every workspace theme.
 */
export function BrandMark({ tone = 'light', size = 'md', className = '' }: BrandMarkProps) {
  const dims = MARK_SIZE[size];

  const boxClasses =
    tone === 'onColor'
      ? 'bg-white/15 text-white group-hover:bg-white/25'
      : tone === 'dark'
      ? 'bg-[color:var(--t-600)] text-white'
      : 'bg-[color:var(--t-600)] text-white group-hover:bg-[color:var(--t-700)]';

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 transition-colors ${dims.box} ${boxClasses} ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 42 42" fill="none" className={dims.svg}>
        <path
          d="M8 25h4.5l3.5-11 4.5 15 4-11 3 7H34"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="33" cy="11" r="3.5" fill="#34D399" />
      </svg>
    </span>
  );
}

export interface BrandLogoProps {
  tone?: 'onColor' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: React.ReactNode;
  className?: string;
}

/**
 * Unified MediCred brand lockup (Connected Care Pulse mark + two-tone wordmark + optional portal subtitle).
 */
export function BrandLogo({
  tone = 'light',
  size = 'md',
  subtitle,
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
