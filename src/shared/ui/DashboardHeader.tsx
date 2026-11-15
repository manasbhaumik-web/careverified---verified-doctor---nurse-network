import React from 'react';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { UserAvatar } from '../../avatars';

export interface DashboardSubTab<S extends string = string> {
  id: S;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

export interface DashboardTab<T extends string = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  group?: string;
  badge?: string;
  subItems?: DashboardSubTab[];
  activeSubTab?: string;
  onSubTabChange?: (subId: string) => void;
  summary?: string;
  cta?: { label: string; onClick: () => void };
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
  /** Submenu presentation style: compact per-tab dropdown (default) or full-width mega menu. */
  menuStyle?: 'dropdown' | 'mega';
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
  menuStyle = 'dropdown',
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

  const [openMenuId, setOpenMenuId] = React.useState<T | null>(null);
  const [megaLeft, setMegaLeft] = React.useState(0);
  const closeMenuTimer = React.useRef<number | null>(null);
  const navRef = React.useRef<HTMLElement | null>(null);
  const tablistRef = React.useRef<HTMLDivElement | null>(null);
  const tabRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const updateMegaAnchor = (menuId: T) => {
    const tabEl = tabRefs.current[String(menuId)];
    const listEl = tablistRef.current;
    if (!tabEl || !listEl) return;
    const maxOffset = Math.max(0, listEl.clientWidth - 470);
    setMegaLeft(Math.max(0, Math.min(tabEl.offsetLeft, maxOffset)));
  };

  const openMenu = (menuId: T) => {
    if (closeMenuTimer.current) window.clearTimeout(closeMenuTimer.current);
    if (menuStyle === 'mega') updateMegaAnchor(menuId);
    setOpenMenuId(menuId);
  };
  const scheduleCloseMenu = () => {
    if (closeMenuTimer.current) window.clearTimeout(closeMenuTimer.current);
    closeMenuTimer.current = window.setTimeout(() => setOpenMenuId(null), 140);
  };

  React.useEffect(() => {
    if (!openMenuId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [openMenuId]);

  const megaTab = menuStyle === 'mega' && openMenuId
    ? tabs?.find(t => t.id === openMenuId && t.subItems && t.subItems.length > 0)
    : undefined;

  const activeMainTab = tabs?.find(t => t.id === activeTab);
  const activeSubItems = activeMainTab?.subItems;

  return (
    <>
      <header
        id={id}
        className={`relative z-20 mt-0 bg-white overflow-visible ${
          effectiveCollapsed
            ? 'border-b-0 shadow-none'
            : 'border-b border-[color:var(--t-200)] shadow-[0_2px_6px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]'
        } ${fullWidth ? 'w-full border-x-0 px-4 sm:px-6 lg:px-8' : 'border-x border-t-0'}`}
      >
        {(title || children) && (
          <div 
            className={`dh-brand relative border-t-0 text-[color:var(--ink)] bg-white transition-all duration-200 ease-in-out ${
              effectiveCollapsed ? 'max-h-0 opacity-0 overflow-hidden py-0 border-b-0' : 'max-h-[600px] opacity-100 overflow-visible'
            }`}
          >
          {title && (
            <div className={`relative z-10 py-3 sm:py-3.5 ${
              fullWidth ? 'max-w-[1440px] mx-auto' : 'px-4 sm:px-7'
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
              fullWidth ? 'max-w-[1440px] mx-auto' : 'px-5 sm:px-7'
            }`}>
              {children}
            </div>
          )}
        </div>
      )}

      {!hasTabsBar && effectiveCollapsed && (
        <div className="w-full bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] shadow-2xs">
          <div className={`flex items-center justify-end py-1.5 ${
            fullWidth ? 'max-w-[1440px] mx-auto' : 'px-3 sm:px-5'
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

      </header>

      {/* Dedicated NavBar under the Header Banner */}
      {hasTabsBar && (
        <nav
          ref={navRef}
          aria-label={tabsLabel}
          onMouseLeave={() => {
            if (menuStyle === 'mega') scheduleCloseMenu();
          }}
          className={`sticky top-16 z-30 w-full bg-[color:var(--t-50)] border-b border-[color:var(--t-200)] shadow-[0_2px_6px_-1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] ${
            fullWidth ? 'border-x-0 px-4 sm:px-6 lg:px-8' : 'border-x'
          }`}
        >
          <div
            ref={tablistRef}
            role="tablist"
            aria-label={tabsLabel}
            className={`relative flex items-center gap-1 overflow-x-auto overflow-y-hidden lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              fullWidth ? 'max-w-[1440px] mx-auto' : 'px-3 sm:px-5'
            }`}
          >
            {tabs?.map((tab, idx) => {
              const selected = activeTab === tab.id;
              const prevTab = idx > 0 ? tabs[idx - 1] : null;
              const isNewGroup = prevTab && tab.group && tab.group !== prevTab.group;
              const hasSub = Boolean(tab.subItems && tab.subItems.length > 0);
              const isDropdownOpen = hasSub && openMenuId === tab.id;
              const activeSubItem = selected && hasSub
                ? (tab.subItems?.find(s => s.id === tab.activeSubTab) || tab.subItems?.[0])
                : undefined;

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
                  <div
                    ref={(el) => { tabRefs.current[String(tab.id)] = el; }}
                    className="relative shrink-0"
                    onMouseEnter={() => { if (hasSub) openMenu(tab.id); }}
                    onMouseLeave={() => { if (hasSub) scheduleCloseMenu(); }}
                  >
                    <button
                      type="button"
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-selected={selected}
                      aria-haspopup={hasSub ? 'menu' : undefined}
                      aria-expanded={hasSub ? isDropdownOpen : undefined}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => {
                        if (menuStyle === 'mega' && hasSub) {
                          if (selected) {
                            if (openMenuId === tab.id) {
                              setOpenMenuId(null);
                            } else {
                              openMenu(tab.id);
                            }
                          } else {
                            onTabChange?.(tab.id);
                            openMenu(tab.id);
                          }
                          return;
                        }
                        onTabChange?.(tab.id);
                        setOpenMenuId(null);
                      }}
                      onKeyDown={(e) => {
                        if (menuStyle === 'mega' && hasSub && e.key === 'ArrowDown') {
                          e.preventDefault();
                          openMenu(tab.id);
                          return;
                        }
                        handleKeyDown(e);
                      }}
                      className={`shrink-0 min-h-[42px] px-3.5 text-xs flex items-center gap-2 cursor-pointer transition-colors bg-transparent focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 focus-visible:underline focus-visible:underline-offset-4 ${
                        selected
                          ? 'font-black text-[color:var(--t-900)] border-b-2 border-b-[color:var(--t-600)]'
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
                      {activeSubItem && activeSubItem.label !== tab.label ? (
                        <span className="text-2xs px-1.5 py-0.5 rounded-none font-semibold bg-[color:var(--t-600)] text-white leading-none">
                          {activeSubItem.label}
                        </span>
                      ) : tab.badge ? (
                        <span className={`text-2xs px-1.5 py-0.5 rounded-none font-mono font-extrabold leading-none ${
                          selected
                            ? 'bg-[color:var(--t-600)] text-white'
                            : 'bg-white text-[color:var(--t-700)] border border-[color:var(--t-200)]'
                        }`}>
                          {tab.badge}
                        </span>
                      ) : null}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="tabular-nums text-2xs min-w-[20px] text-center px-1.5 py-0.5 rounded-none font-extrabold bg-[color:var(--t-600)] text-white leading-none">
                          {tab.count}
                        </span>
                      )}
                      {hasSub && (
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180 text-[color:var(--t-700)]' : 'text-slate-400'}`} />
                      )}
                    </button>

                    {menuStyle === 'dropdown' && isDropdownOpen && tab.subItems && (
                      <div
                        role="menu"
                        aria-label={`${tab.label} submenu`}
                        className="hidden lg:block absolute left-0 top-full mt-0 min-w-[230px] bg-white border border-[color:var(--t-200)] shadow-lg z-50 py-1 rounded-none"
                      >
                        <div className="px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border-b border-[color:var(--t-100)]">
                          {tab.label}
                        </div>
                        {tab.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = selected && tab.activeSubTab === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                if (!selected) onTabChange?.(tab.id);
                                tab.onSubTabChange?.(sub.id);
                                setOpenMenuId(null);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                subActive
                                  ? 'bg-[color:var(--t-50)] text-[color:var(--t-900)] font-black'
                                  : 'text-slate-700 font-semibold hover:bg-[color:var(--t-50)] hover:text-[color:var(--t-800)]'
                              }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {SubIcon && <SubIcon className={`h-3.5 w-3.5 shrink-0 ${subActive ? 'text-[color:var(--t-600)]' : 'text-slate-400'}`} />}
                                <span className="truncate">{sub.label}</span>
                              </span>
                              {sub.count !== undefined && sub.count > 0 && (
                                <span className="tabular-nums text-xs px-1.5 py-0.5 bg-[color:var(--t-600)] text-white font-bold leading-none">
                                  {sub.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

          {megaTab && megaTab.subItems && (
            <div className={`absolute left-0 right-0 top-full z-50 pointer-events-none ${fullWidth ? 'px-4 sm:px-6 lg:px-8' : 'px-3 sm:px-5'}`}>
              <div className={fullWidth ? 'max-w-[1440px] mx-auto' : ''}>
                <div
                  role="menu"
                  aria-label={`${megaTab.label} mega menu`}
                  onMouseEnter={() => openMenu(megaTab.id)}
                  onMouseLeave={scheduleCloseMenu}
                  style={{ '--mega-left': `${megaLeft}px` } as React.CSSProperties}
                  className="pointer-events-auto w-full sm:w-[470px] sm:ml-[var(--mega-left)] bg-white border border-[color:var(--t-200)] border-b-2 border-b-[color:var(--t-600)] shadow-[0_12px_24px_-6px_rgba(15,23,42,0.16)] grid grid-cols-1 sm:grid-cols-[1.45fr_1fr] rounded-none"
                >
                  {/* Left: Borderless Sub-item Rows */}
                  <div className="p-2 flex flex-col gap-0.5">
                    {megaTab.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = activeTab === megaTab.id && megaTab.activeSubTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            if (activeTab !== megaTab.id) onTabChange?.(megaTab.id);
                            megaTab.onSubTabChange?.(sub.id);
                            setOpenMenuId(null);
                          }}
                          className={`group w-full text-left px-2.5 py-2 transition-colors cursor-pointer flex items-start gap-2.5 rounded-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40 ${
                            subActive
                              ? 'bg-[color:var(--t-50)]'
                              : 'bg-transparent hover:bg-[color:var(--t-50)]/80'
                          }`}
                        >
                          {SubIcon && (
                            <SubIcon className={`h-4 w-4 shrink-0 mt-0.5 transition-colors ${
                              subActive ? 'text-[color:var(--t-700)]' : 'text-slate-400 group-hover:text-[color:var(--t-600)]'
                            }`} />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-extrabold truncate ${
                                subActive ? 'text-[color:var(--t-900)]' : 'text-[color:var(--ink)] group-hover:text-[color:var(--t-800)]'
                              }`}>
                                {sub.label}
                              </span>
                              {sub.count !== undefined && sub.count > 0 && (
                                <span className="tabular-nums text-2xs px-1.5 py-0.5 bg-[color:var(--t-600)] text-white font-extrabold leading-none shrink-0">
                                  {sub.count}
                                </span>
                              )}
                            </div>
                            {sub.description && (
                              <p className="text-2xs text-slate-500 font-medium mt-0.5 leading-snug">
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Highlighted Group Summary + Primary Quick Action */}
                  <div className="bg-[color:var(--t-50)] border-t sm:border-t-0 sm:border-l border-[color:var(--t-100)] p-3 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs font-mono font-black uppercase tracking-wider text-[color:var(--t-700)]">
                          {megaTab.label}
                        </span>
                        <span className="text-2xs font-medium text-slate-400 hidden sm:inline">Esc</span>
                      </div>
                      <p className="text-2xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                        {megaTab.summary || `${megaTab.subItems.length} sections available in ${megaTab.label}.`}
                      </p>
                    </div>
                    {megaTab.cta ? (
                      <button
                        type="button"
                        onClick={() => {
                          megaTab.cta?.onClick();
                          setOpenMenuId(null);
                        }}
                        className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] text-2xs font-extrabold px-2.5 py-2 cursor-pointer transition-colors text-center rounded-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40"
                      >
                        {megaTab.cta.label} →
                      </button>
                    ) : megaTab.subItems[0] ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeTab !== megaTab.id) onTabChange?.(megaTab.id);
                          megaTab.onSubTabChange?.(megaTab.subItems![0].id);
                          setOpenMenuId(null);
                        }}
                        className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)] text-2xs font-extrabold px-2.5 py-2 cursor-pointer transition-colors text-center rounded-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-500)]/40"
                      >
                        Open {megaTab.subItems[0].label} →
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}
    </>
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
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  children,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
  className?: string;
}) {
  const renderedChildren = options
    ? options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))
    : children;
  const optionNodes = React.Children.toArray(renderedChildren) as React.ReactElement<{ value: string; children: React.ReactNode }>[];
  const selectedOption = optionNodes.find(opt => opt && React.isValidElement(opt) && String(opt.props?.value) === String(value));
  const displayLabel = selectedOption?.props?.children ?? value;

  return (
    <div className={`relative flex items-center bg-[color:var(--t-bg)] border border-[color:var(--t-200)] pl-3.5 pr-3 h-11 min-w-0 focus-within:border-[color:var(--t-600)] focus-within:bg-white focus-within:ring-1 focus-within:ring-[color:var(--t-600)] transition-colors rounded-none shadow-2xs ${className || 'w-full sm:w-auto sm:min-w-[200px]'}`}>
      <span className="text-2xs font-black uppercase tracking-wider text-slate-500 shrink-0 select-none mr-2 whitespace-nowrap leading-none flex items-center h-full">{label}:</span>
      <span className="flex-1 text-xs font-bold text-[color:var(--ink)] truncate pr-2 select-none leading-none flex items-center h-full">{displayLabel}</span>
      <ChevronDown className="h-3.5 w-3.5 text-slate-500 pointer-events-none shrink-0" aria-hidden="true" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        aria-label={label}
      >
        {renderedChildren}
      </select>
    </div>
  );
}
