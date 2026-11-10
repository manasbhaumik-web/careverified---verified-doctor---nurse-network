import React from 'react';
import { useTr } from '../locale';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const tx = useTr();
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('medicred_banner_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('medicred_banner_collapsed', String(next)); } catch {}
      return next;
    });
  };
  return (
    <div
      className={`bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] p-3.5 sm:p-4 shadow-2xs ${className}`}
    >
      {/* Top Header Row */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all duration-200 ease-in-out ${
        isCollapsed ? 'max-h-0 opacity-0 overflow-hidden py-0' : 'max-h-[400px] opacity-100'
      }`}>
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

        <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
            {aside}
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-9 px-2.5 bg-slate-50 hover:bg-[color:var(--t-50)] text-slate-600 hover:text-[color:var(--t-700)] border border-slate-200 hover:border-[color:var(--t-300)] text-2xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors rounded-none"
              title={isCollapsed ? "Expand Banner" : "Collapse Banner"}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? "Expand banner" : "Collapse banner"}
            >
              <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Collapse</span>
            </button>
          </div>
      </div>

      {/* Embedded Live Sub-bar / Children Slot */}
      {children && (
        <div className={`border-t border-[color:var(--t-100)] pt-3.5 mt-3.5 transition-all duration-200 ${isCollapsed ? 'hidden' : 'block'}`}>
          {children}
        </div>
      )}

      {/* Attached Inner Workspace Subtab Strip */}
      {tabs && tabs.length > 0 && (
        <div className="border-t border-[color:var(--t-200)] bg-[color:var(--t-50)] p-2.5 -mx-3.5 -mb-3.5 sm:-mx-4 sm:-mb-4 mt-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label={tabsLabel || tx('Workspace section tabs')}
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
                  className={`h-9 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'text-[color:var(--t-900)] border-b-[color:var(--t-600)] font-black bg-transparent'
                      : 'text-slate-700 border-b-transparent hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-100)]/60 bg-transparent'
                  }`}
                >
                  {TabIcon && (
                    <TabIcon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                  )}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-2xs font-mono font-bold px-1.5 py-0.2 leading-none ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-700 border border-[color:var(--t-200)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="text-2xs font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={toggleCollapse}
            className="px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-[color:var(--t-800)] hover:bg-[color:var(--t-100)] transition-colors flex items-center gap-1 cursor-pointer rounded-none ml-auto border border-transparent hover:border-[color:var(--t-200)]"
            title={isCollapsed ? "Expand Banner details" : "Collapse Banner details"}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand banner" : "Collapse banner"}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
                <span className="text-[color:var(--t-700)] font-black">Expand Banner</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
