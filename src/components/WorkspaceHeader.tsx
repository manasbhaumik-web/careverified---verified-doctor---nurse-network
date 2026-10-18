import React from 'react';

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
  children,
}: WorkspaceHeaderProps<T>) {
  return (
    <div
      className={`bg-white border border-[color:var(--t-200)] border-l-4 border-l-[color:var(--t-600)] p-4 sm:p-5 shadow-2xs ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-600)] flex items-center justify-center shrink-0 shadow-2xs">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[color:var(--t-700)] block mb-0.5">
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
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed line-clamp-2 md:line-clamp-none">
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
        <div className="border-t border-[color:var(--t-100)] pt-3 mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label={tabsLabel || 'Workspace section tabs'}
            className="flex flex-wrap items-center gap-1.5"
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
                  className={`min-h-[32px] px-3 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[color:var(--t-600)] text-white shadow-2xs border border-[color:var(--t-700)]'
                      : 'bg-[color:var(--t-50)]/70 hover:bg-[color:var(--t-100)] text-slate-700 hover:text-[color:var(--t-700)] border border-[color:var(--t-200)]'
                  }`}
                >
                  {TabIcon && (
                    <TabIcon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  )}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 leading-none ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 border border-[color:var(--t-200)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200">
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
