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
 * Compact page banner; shares its look with DashboardHeader (white card, brand accent rule, tinted wash).
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
      className={`relative bg-white border border-[color:var(--t-200)] border-t-[3px] border-t-[color:var(--t-600)] text-[color:var(--ink)] shadow-xs overflow-hidden ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[color:var(--t-50)] to-transparent" />
      <div className="relative py-5 px-5 sm:px-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-4xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--t-700)]">
            <span className="flex h-5 w-5 items-center justify-center bg-[color:var(--t-100)] text-[color:var(--t-700)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span>{eyebrow}</span>
          </div>
          <Heading className="font-display font-semibold text-xl sm:text-2xl leading-tight tracking-tight text-[color:var(--ink)] mt-2.5">
            {title}
          </Heading>
          {description && <p className="text-sm text-[color:var(--ink-2)] mt-1.5 leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/** Large number + small caps label, used in banner actions. */
export function BannerStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-2 bg-white px-3 py-1.5 border border-[color:var(--t-200)] rounded-lg shadow-3xs">
      <span className="font-display font-bold text-lg leading-none tracking-tight text-[color:var(--t-600)] tabular-nums">{value}</span>
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  );
}
