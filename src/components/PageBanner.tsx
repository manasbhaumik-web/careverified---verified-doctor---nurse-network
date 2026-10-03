import React from 'react';

interface PageBannerProps {
  /** Small red label above the title. */
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
 * Standard page banner: transparent, red-cross eyebrow, display title,
 * short description, optional actions on the right, hairline rule below.
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
      className={`border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 ${className}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cross">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true">
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />
          </svg>
          {eyebrow}
        </div>
        <Heading className="font-display font-black text-2xl sm:text-[28px] leading-tight tracking-tight text-ink mt-1">
          {title}
        </Heading>
        {description && <p className="text-sm text-slate-700 mt-0.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-5">{actions}</div>}
    </div>
  );
}

/** Large number + small caps label, used in banner actions. */
export function BannerStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display font-black text-3xl leading-none tracking-tighter text-ink tabular-nums">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
    </div>
  );
}
