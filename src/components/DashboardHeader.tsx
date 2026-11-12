import React from 'react';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { UserAvatar } from '../avatars';

export interface DashboardTab<T extends string = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  group?: string;
}

interface DashboardHeaderProps<T extends string> {
  /** Pill shown next to the title. */
  eyebrow?: string;
  /** Icon shown in the round badge beside the title (defaults to a shield). */
  icon?: React.ComponentType<{ className?: string }>;
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
  /** Optional background image URL for the hero banner (e.g. clinical suite photography). */
  bgImage?: string;
  /** When true, expands the hero banner across 100% full width of the screen. */
  fullWidth?: boolean;
  /** Optional element rendered on the far right of the tab group strip (e.g. Help tab). */
  tabsRight?: React.ReactNode;
}

/**
 * Standard dashboard header shared by dashboards: support full-width hero banner background,
 * high-contrast identity, KPI telemetry, and full-width underline tab strip.
 */
export default function DashboardHeader<T extends string>({
  eyebrow,
  icon,
  title,
  description,
  actions,
  children,
  tabs,
  activeTab,
  onTabChange,
  tabsLabel = 'Dashboard sections',
  id,
  fullWidth = true,
  tabsRight,
}: DashboardHeaderProps<T>) {
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
    const nextTabEl = document.getElementById(`tab-${ids[next]}`) as HTMLElement | null;
    nextTabEl?.focus();
  };

  const hasTabsBar = Boolean((tabs && tabs.length > 0) || tabsRight);
  const canCollapse = Boolean(title || hasTabsBar);
  const effectiveCollapsed = canCollapse && isCollapsed;

  return (
    <header
      id={id}
      className={`relative mt-0 bg-white border-b border-[color:var(--t-200)] shadow-xs overflow-hidden ${
        fullWidth ? 'w-full border-x-0' : 'border-x border-t-0'
      }`}
    >
      {(title || children) && (
        <div 
          className={`dh-brand relative border-t-0 text-[color:var(--ink)] bg-white transition-all duration-200 ease-in-out ${
            effectiveCollapsed ? 'max-h-0 opacity-0 overflow-hidden py-0 border-b-0' : 'max-h-[600px] opacity-100 overflow-visible border-b border-[color:var(--t-200)]'
          }`}
        >
          {title && (
            <div className={`relative z-10 py-3 sm:py-3.5 ${
              fullWidth ? 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8' : 'px-4 sm:px-7'
            }`}>
              <BannerRow
                identity={<BannerIdentity as="h1" icon={icon ?? ShieldCheck} name={title} badges={eyebrow ? <BannerBadge>{eyebrow}</BannerBadge> : undefined} description={description} />}
                aside={
                  <div className="flex items-center gap-2">
                    {actions}
                    {!hasTabsBar && (
                      <button
                        type="button"
                        onClick={toggleCollapse}
                        className="h-9 px-2.5 bg-slate-50 hover:bg-[color:var(--t-50)] text-slate-600 hover:text-[color:var(--t-700)] border border-slate-200 hover:border-[color:var(--t-300)] text-2xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors rounded-none"
                        title="Collapse Banner"
                        aria-expanded={!isCollapsed}
                        aria-label="Collapse banner"
                      >
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Collapse</span>
                      </button>
                    )}
                  </div>
                }
              />
            </div>
          )}

          {children && (
            <div className={`relative z-10 py-3 sm:py-3.5 ${
              fullWidth ? 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8' : 'px-5 sm:px-7'
            }`}>
              {children}
            </div>
          )}
        </div>
      )}

      {!hasTabsBar && effectiveCollapsed && (
        <div className="w-full bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] shadow-2xs">
          <div className={`flex items-center justify-end py-1.5 ${
            fullWidth ? 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8' : 'px-3 sm:px-5'
          }`}>
            <button
              type="button"
              onClick={toggleCollapse}
              className="px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-[color:var(--t-800)] hover:bg-[color:var(--t-100)] transition-colors flex items-center gap-1.5 cursor-pointer rounded-none border border-transparent hover:border-[color:var(--t-200)]"
              title="Expand Banner details"
              aria-expanded={false}
              aria-label="Expand banner"
            >
              <ChevronDown className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
              <span className="text-[color:var(--t-700)] font-black">Expand Banner</span>
            </button>
          </div>
        </div>
      )}

      {hasTabsBar && (
        <div className="w-full bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] shadow-2xs">
          <div
            role="tablist"
            aria-label={tabsLabel}
            className={`relative flex items-center gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              fullWidth ? 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8' : 'px-3 sm:px-5'
            }`}
          >
            {tabs?.map((tab, idx) => {
              const selected = activeTab === tab.id;
              const prevTab = idx > 0 ? tabs[idx - 1] : null;
              const isNewGroup = prevTab && tab.group && tab.group !== prevTab.group;

              return (
                <React.Fragment key={tab.id}>
                  {isNewGroup && (
                    <div className="flex items-center shrink-0 mx-2 self-center h-6 select-none" aria-hidden="true">
                      <span className="w-px h-5 bg-[color:var(--t-200)]" />
                      {tab.group && (
                        <span className="ml-2.5 mr-1 text-2xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)]/80 hidden xl:inline-block">
                          {tab.group}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onTabChange?.(tab.id)}
                    onKeyDown={handleKeyDown}
                    className={`shrink-0 min-h-[40px] px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors bg-transparent focus:outline-none focus-visible:underline focus-visible:underline-offset-4 ${
                      selected
                        ? 'font-black text-[color:var(--t-900)]'
                        : 'font-semibold text-slate-600 hover:text-[color:var(--t-800)]'
                    }`}
                  >
                    {selected && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[color:var(--t-600)] shadow-[0_0_6px_rgba(13,148,136,0.65)] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <tab.icon className={`h-4 w-4 transition-colors ${selected ? 'text-[color:var(--t-700)]' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="tabular-nums text-2xs min-w-[20px] text-center px-1.5 py-0.5 rounded-none font-extrabold bg-[color:var(--t-600)] text-white leading-none">
                        {tab.count}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
            <div className="ml-auto shrink-0 flex items-center self-stretch pl-2">
              {tabsRight}
              <button
                type="button"
                onClick={toggleCollapse}
                className="px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wider text-slate-600 hover:text-[color:var(--t-800)] hover:bg-[color:var(--t-100)] transition-colors flex items-center gap-1.5 cursor-pointer rounded-none ml-1.5 self-center border border-transparent hover:border-[color:var(--t-200)]"
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
                    <span className="hidden xl:inline">Collapse</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Shared building blocks for the identity banner used by the practitioner and patient dashboards.
 * ---------------------------------------------------------------------------------------------- */

export const bannerPrimaryBtn =
  'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black px-3.5 h-9 rounded-none shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none border border-[color:var(--t-700)]';
/** Same two buttons for use on the banner: a solid brand button and a crisp bordered white one. */
export const bannerOnBrandPrimaryBtn =
  'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black px-3.5 h-9 rounded-none shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none border border-[color:var(--t-700)]';
export const bannerOnBrandSecondaryBtn =
  'bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-xs font-bold px-3.5 h-9 rounded-none shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none';
export const bannerSecondaryBtn =
  'bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)] text-xs font-bold px-3.5 h-9 rounded-none shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none';

/** Two-column row: identity on the left, KPIs and actions on the right. */
export function BannerRow({ identity, aside }: { identity: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center justify-between gap-3 sm:gap-4">
      {identity}
      {aside && <div className="flex items-center gap-3 flex-wrap xl:justify-end border-t xl:border-t-0 border-[color:var(--t-200)] pt-2.5 xl:pt-0 min-w-0 max-w-full">{aside}</div>}
    </div>
  );
}

interface BannerIdentityProps {
  name: React.ReactNode;
  avatarUrl?: string | null;
  /** Role of the entity for smart failover avatar if avatarUrl fails to load */
  role?: string;
  /** Used instead of a photo or initials for pages that are not about a person. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Heading level; h1 for a page's primary banner. */
  as?: 'h1' | 'h2';
  /** Sentence under the name. */
  description?: React.ReactNode;
  /** Small badge pinned to the avatar corner (e.g. a verified shield). */
  avatarBadge?: React.ReactNode;
  /** Pills next to the name. */
  badges?: React.ReactNode;
  /** Metadata line under the name. */
  meta?: React.ReactNode;
}

export function BannerIdentity({ name, avatarUrl, role, icon: Icon, as: Heading = 'h2', description, avatarBadge, badges, meta }: BannerIdentityProps) {
  const initials = typeof name === 'string' ? name.replace(/^Dr\.?\s+/i, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '';
  return (
    <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
      <div className="relative shrink-0">
        {Icon ? (
          <div aria-hidden="true" className="h-11 w-11 sm:h-13 sm:w-13 rounded-none border border-[color:var(--t-200)] shadow-2xs bg-white text-[color:var(--t-700)] flex items-center justify-center text-lg sm:text-2xl font-bold">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        ) : (
          <UserAvatar 
            src={avatarUrl} 
            role={role} 
            alt={typeof name === 'string' ? name : 'User profile'} 
            className="h-11 w-11 sm:h-13 sm:w-13 rounded-full object-cover border-2 border-white shadow-xs" 
            referrerPolicy="no-referrer" 
          />
        )}
        {avatarBadge}
      </div>
      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Heading className="text-lg sm:text-2xl font-black text-[color:var(--ink)] tracking-tight leading-tight min-w-0">{name}</Heading>
          {badges && <div className="inline-flex items-center gap-1.5 max-w-full flex-wrap">{badges}</div>}
        </div>
        {description && <p className="text-xs font-medium text-[color:var(--ink-2)] leading-relaxed max-w-3xl line-clamp-3 sm:line-clamp-none">{description}</p>}
        {meta && <div className="flex items-center gap-2.5 text-xs text-[color:var(--ink-2)] font-semibold flex-wrap">{meta}</div>}
      </div>
    </div>
  );
}

/** Pill used beside the name: brand, success, neutral, or warning. */
export function BannerBadge({ tone = 'brand', children }: { tone?: 'brand' | 'success' | 'neutral' | 'warning'; children: React.ReactNode }) {
  if (tone === 'success') {
    return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-2xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-none inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">{children}</span>;
  }
  if (tone === 'neutral') {
    return <span className="bg-slate-50 text-slate-700 border border-slate-300 text-2xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-none inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">{children}</span>;
  }
  if (tone === 'warning') {
    return <span className="bg-amber-50 text-amber-800 border border-amber-300 text-2xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-none inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">{children}</span>;
  }
  return (
    <span className="bg-white text-[color:var(--t-700)] border border-[color:var(--t-200)] text-2xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-none inline-flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">{children}</span>
  );
}

/** KPI strip: one compact row, same height as the banner buttons (h-11). */
export function BannerKpis({ items }: { items: { value: React.ReactNode; label: string }[] }) {
  return (
    <div className="flex items-stretch w-full sm:w-auto sm:h-9 bg-white border border-[color:var(--t-200)] rounded-none shadow-2xs">
      {items.map((k, i) => (
        <div key={k.label} className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-0 min-w-0 ${i > 0 ? 'border-l border-[color:var(--t-100)]' : ''}`}>
          <span className="text-sm font-extrabold text-[color:var(--ink)] leading-none tabular-nums">{k.value}</span>
          <span className="text-2xs font-bold text-[color:var(--t-600)] uppercase tracking-wider leading-tight text-center">{k.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Inline h-11 labelled dropdown used in single-row filter bars (library, pharmacies, packages). */
export function FilterSelect({ label, value, onChange, children, className = '' }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <label className={`relative flex items-center bg-[color:var(--t-bg)] border border-[color:var(--t-200)] pl-3 pr-8 h-11 min-w-0 focus-within:border-[color:var(--t-600)] focus-within:bg-white transition-colors cursor-pointer rounded-none shadow-2xs ${className || 'flex-auto max-w-full'}`}>
      <span className="text-2xs font-black uppercase tracking-wider text-slate-500 shrink-0 select-none mr-2 whitespace-nowrap">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="filter-select-input flex-1 bg-transparent text-xs font-bold text-[color:var(--ink)] focus:outline-none cursor-pointer border-0 p-0 m-0 min-w-0 max-w-full leading-none whitespace-nowrap"
      >
        {children}
      </select>
      <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" aria-hidden="true" />
    </label>
  );
}
