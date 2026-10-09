import React from 'react';
import DashboardHeader from './DashboardHeader';

interface PageBannerProps {
  /** Pill next to the title. */
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned content (counts, buttons, widgets). */
  actions?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  id?: string;
  /** Spacing from the surrounding layout only. */
  className?: string;
}

/** Page banner without tabs. Renders the shared DashboardHeader so every page banner looks the same. */
export default function PageBanner({ eyebrow, title, description, actions, icon, id, className }: PageBannerProps) {
  return (
    <div className={className}>
      <DashboardHeader id={id} eyebrow={eyebrow} title={title} description={description} actions={actions} icon={icon} />
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
