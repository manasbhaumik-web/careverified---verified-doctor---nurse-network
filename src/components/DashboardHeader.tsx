import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface DashboardTab<T extends string = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface DashboardHeaderProps<T extends string> {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned content next to the title (buttons, KPI strips). */
  actions?: React.ReactNode;
  /** Free-form content between the title row and the tabs (e.g. identity strip). */
  children?: React.ReactNode;
  tabs?: DashboardTab<T>[];
  activeTab?: T;
  onTabChange?: (id: T) => void;
  tabsLabel?: string;
  id?: string;
}

/**
 * Standard dashboard header shared by every role's dashboard: pink hero with the
 * page title and actions, and the section tabs attached to its bottom edge.
 */
export default function DashboardHeader<T extends string>({
  eyebrow,
  title,
  description,
  actions,
  children,
  tabs,
  activeTab,
  onTabChange,
  tabsLabel = 'Dashboard sections',
  id,
}: DashboardHeaderProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!tabs || !onTabChange || activeTab === undefined) return;
    const ids = tabs.map(t => t.id);
    const current = ids.indexOf(activeTab);
    let next = current;
    if (e.key === 'ArrowRight') next = (current + 1) % ids.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    else return;
    e.preventDefault();
    onTabChange(ids[next]);
  };

  return (
    <header
      id={id}
      className="bg-gradient-to-r from-[#FFF0F2] via-[#FFF5F6] to-[#FFE9EB] border border-[#FECDD3] rounded-xl shadow-xs pt-5 px-5 sm:px-6"
    >
      {title && (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-5">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#047857]">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{eyebrow}</span>
              </div>
            )}
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B] leading-tight">{title}</h1>
            {description && <p className="mt-1 text-sm text-[#334155] leading-relaxed">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
        </div>
      )}

      {children && <div className="pb-5">{children}</div>}

      {tabs && tabs.length > 0 && (
        <div role="tablist" aria-label={tabsLabel} className="flex gap-1 overflow-x-auto -mb-px">
          {tabs.map(tab => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTabChange?.(tab.id)}
                onKeyDown={handleKeyDown}
                className={`shrink-0 min-h-[48px] px-4 text-[13px] flex items-center gap-2 cursor-pointer rounded-t-lg border border-b-0 transition-colors ${
                  selected
                    ? 'font-bold text-[#1E293B] bg-white border-[#FECDD3]'
                    : 'font-medium text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${selected ? 'text-[#DC2626]' : 'text-slate-500'}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="tabular-nums text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#DC2626] text-white leading-none">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
