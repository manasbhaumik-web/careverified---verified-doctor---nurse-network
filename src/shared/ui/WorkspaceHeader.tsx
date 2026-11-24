import React from 'react';
import { useTr } from '../../locale';

export interface WorkspaceHeaderTab<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string;
  badge?: string;
}

export interface WorkspaceHeaderProps<T extends string = string> {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  badges?: React.ReactNode;
  aside?: React.ReactNode;
  tabs?: WorkspaceHeaderTab<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;
  tabsLabel?: string;
  className?: string;
  /** 'overview' = flat editorial strip + square tab bar (Patient Overview style) */
  variant?: 'default' | 'overview';
  children?: React.ReactNode;
}

/**
 * Standard Institutional Inner Workspace Header Section
 * Designed to provide uniform visual hierarchy, icon branding, contextual badges,
 * and semantic sub-tab switching across user dashboards and workspaces.
 */
export default function WorkspaceHeader<T extends string = string>({
  icon: Icon,
  eyebrow,
  title,
  description,
  badges,
  aside,
  tabs,
  activeTab,
  onTabChange,
  tabsLabel,
  className = '',
  variant = 'overview',
  children,
}: WorkspaceHeaderProps<T>) {
  const tx = useTr();

  // "overview" variant: flat editorial title strip + square tab bar (matches the Patient Overview page)
  if (variant === 'overview') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-2xs font-bold uppercase tracking-widest text-[color:var(--t-700)]">{eyebrow}</div>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[color:var(--ink)] leading-tight">{title}</h2>
              {badges}
            </div>
            {description && (
              <p className="mt-1 text-xs text-[color:var(--ink-2)] leading-relaxed max-w-3xl">{description}</p>
            )}
          </div>
          {aside && <div className="flex items-center gap-2 flex-wrap shrink-0">{aside}</div>}
        </div>

        {children && (
          <div className="bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-3.5">{children}</div>
        )}

        {tabs && tabs.length > 0 && (
          // Segmented control: one pale rail, the open tab is solid teal
          <div
            role="tablist"
            aria-label={tabsLabel || tx('Workspace section tabs')}
            className="flex max-w-full items-stretch gap-1 self-start bg-[color:var(--t-50)] border border-[color:var(--t-100)] p-1 overflow-x-auto w-fit"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`min-h-[44px] px-4 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 ${
                    isActive
                      ? 'bg-[color:var(--t-600)] text-white font-bold'
                      : 'text-[color:var(--t-800)] font-semibold hover:bg-white'
                  }`}
                >
                  {TabIcon && <TabIcon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-[color:var(--t-600)]'}`} />}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold leading-none tabular-nums ${
                        isActive
                          ? 'bg-white text-[color:var(--t-900)]'
                          : 'bg-white text-[color:var(--t-700)] border border-[color:var(--t-200)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="tag-pill font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-3.5 sm:p-4 shadow-2xs ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[color:var(--t-700)] block mb-0.5">
                {eyebrow}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-black text-base sm:text-lg text-[color:var(--ink)] tracking-tight leading-snug">
                {title}
              </h2>
              {badges}
            </div>
            {description && (
              <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed line-clamp-2 md:line-clamp-none">
                {description}
              </p>
            )}
          </div>
        </div>

        {aside && (
          <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
            {aside}
          </div>
        )}
      </div>

      {/* Embedded Live Sub-bar / Children Slot */}
      {children && (
        <div className="border-t border-[color:var(--t-100)] pt-3.5 mt-3.5">
          {children}
        </div>
      )}

      {/* Attached Inner Workspace Subtab Strip */}
      {tabs && tabs.length > 0 && (
        <div className="subtab-strip px-2.5 -mx-3.5 -mb-3.5 sm:-mx-4 sm:-mb-4 mt-3.5">
          <div
            role="tablist"
            aria-label={tabsLabel || tx('Workspace section tabs')}
            className="flex flex-wrap items-center gap-1"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`h-9 px-3.5 text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 bg-transparent focus:outline-none focus-visible:underline focus-visible:underline-offset-4 ${
                    isActive
                      ? 'text-[color:var(--t-700)] font-black shadow-[inset_0_-3px_0_var(--t-600)]'
                      : 'text-slate-700 font-semibold hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]'
                  }`}
                >
                  {TabIcon && (
                    <TabIcon className={`h-3.5 w-3.5 transition-colors ${isActive ? 'text-[color:var(--t-700)]' : 'text-slate-500'}`} />
                  )}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`count-badge ${
                        isActive
                          ? 'bg-[color:var(--t-600)] text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="tag-pill font-bold uppercase tracking-wider px-1.5 py-0.2 bg-slate-100 text-slate-700">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
