import React from 'react';

interface PageBannerProps {
  /** Small label above the title. */
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned content (counts, buttons, widgets). */
  actions?: React.ReactNode;
  /** Heading level; use h1 only for the page's primary banner. */
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
}

/**
 * Standardized Compact Page Banner: Sleek, low-profile executive visual header.
 */
export default function PageBanner({
  eyebrow,
  title,
  description,
  actions,
  as: Heading = 'h2',
  id,
  className = '',
}: PageBannerProps) {
  return (
    <div
      id={id}
      className={`bg-gradient-to-r from-[#FFF0F2] via-[#FFF5F6] to-[#FFE9EB] border border-[#FECDD3] text-[#1E293B] py-5 px-5 sm:px-6 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ${className}`}
    >
      <div className="min-w-0 max-w-4xl">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#047857]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>{eyebrow}</span>
        </div>
        <Heading className="font-display font-bold text-xl sm:text-2xl leading-tight tracking-tight text-[#1E293B] mt-1.5">
          {title}
        </Heading>
        {description && <p className="text-sm text-[#334155] mt-1 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

/** Large number + small caps label, used in banner actions. */
export function BannerStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-2 bg-white px-3 py-1.5 border border-[#FECDD3] rounded-lg shadow-3xs">
      <span className="font-display font-bold text-lg leading-none tracking-tight text-[#DC2626] tabular-nums">{value}</span>
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  );
}
