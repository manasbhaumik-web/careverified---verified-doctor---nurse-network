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
      className={`bg-gradient-to-r from-[#FFF0F2] via-[#FFF5F6] to-[#FFE9EB] border-l-4 border-[#DC2626] border-y border-r border-[#FECDD3] text-slate-900 py-3.5 px-5 rounded-none shadow-3xs flex flex-wrap items-center justify-between gap-x-6 gap-y-2 ${className}`}
    >
      <div className="min-w-0 max-w-4xl">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#DC2626]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-[#DC2626] shrink-0" aria-hidden="true">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
          </svg>
          <span>{eyebrow}</span>
        </div>
        <Heading className="font-display font-black text-base sm:text-lg leading-tight tracking-tight text-slate-900 mt-0.5">
          {title}
        </Heading>
        {description && <p className="text-xs text-slate-600 font-medium mt-0.5 leading-snug">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

/** Large number + small caps label, used in banner actions. */
export function BannerStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-2 bg-white px-3 py-1.5 border border-[#FECDD3] rounded-none shadow-3xs">
      <span className="font-display font-black text-lg leading-none tracking-tight text-[#DC2626] tabular-nums">{value}</span>
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  );
}
