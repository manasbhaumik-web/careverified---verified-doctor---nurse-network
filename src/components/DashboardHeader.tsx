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
 * Standard dashboard header shared by every role's dashboard: white card with a brand accent rule,
 * the page title and actions, and an underline tab strip along the bottom.
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
      className="relative bg-white border border-[color:var(--t-200)] border-t-[3px] border-t-[color:var(--t-600)] shadow-xs overflow-hidden"
    >
      {/* soft brand wash on the right edge */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[color:var(--t-50)] to-transparent" />

      {title && (
        <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-5 px-5 sm:px-7 py-6">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && (
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--t-700)]">
                <span className="flex h-5 w-5 items-center justify-center bg-[color:var(--t-100)] text-[color:var(--t-700)]">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                </span>
                <span>{eyebrow}</span>
              </div>
            )}
            <h1 className="mt-2.5 text-2xl sm:text-[28px] font-semibold tracking-tight text-[color:var(--ink)] leading-tight">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-[color:var(--ink-2)] leading-relaxed">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
        </div>
      )}

      {children && <div className="relative px-5 sm:px-7 pb-5">{children}</div>}

      {tabs && tabs.length > 0 && (
        <div role="tablist" aria-label={tabsLabel} className="relative flex gap-1 overflow-x-auto px-3 sm:px-5 border-t border-[color:var(--t-200)] bg-white">
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
                className={`shrink-0 min-h-[48px] px-4 text-[13px] flex items-center gap-2 cursor-pointer border-b-2 -mb-px transition-colors ${
                  selected
                    ? 'font-semibold text-[color:var(--t-700)] border-[color:var(--t-600)]'
                    : 'font-medium text-[color:var(--ink-2)] border-transparent hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${selected ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="tabular-nums text-[11px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-semibold bg-[color:var(--t-600)] text-white leading-none">
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
