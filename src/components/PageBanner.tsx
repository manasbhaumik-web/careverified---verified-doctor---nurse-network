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
 * Standard page banner: styled with the same CareVerified Crimson background (#DC2626)
 * as the main Navbar for a cohesive, high-contrast executive visual header.
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
      className={`bg-gradient-to-r from-[#FFF1F2] via-[#FFF5F5] to-[#FFE4E6] border-l-8 border-[#DC2626] border-y border-r border-[#FECDD3] text-slate-900 p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-x-8 gap-y-4 ${className}`}
    >
      <div className="min-w-0 max-w-3xl">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#DC2626]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[#DC2626] shrink-0" aria-hidden="true">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
          </svg>
          <span>{eyebrow}</span>
        </div>
        <Heading className="font-display font-black text-2xl sm:text-[28px] leading-tight tracking-tight text-slate-900 mt-1.5">
          {title}
        </Heading>
        {description && <p className="text-sm text-slate-600 font-medium mt-1 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-5">{actions}</div>}
    </div>
  );
}

/** Large number + small caps label, used in banner actions. */
export function BannerStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-2 bg-white px-4 py-2 border border-[#FECDD3] rounded-xl shadow-xs">
      <span className="font-display font-black text-2xl leading-none tracking-tighter text-[#DC2626] tabular-nums">{value}</span>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}
