import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface DashboardTab<T extends string = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
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
}

/**
 * Standard dashboard header shared by every role's dashboard: white card with a brand accent rule,
 * the page title and actions, and an underline tab strip along the bottom.
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
      className="relative bg-white border border-[color:var(--t-200)] shadow-xs overflow-hidden"
    >
      {/* soft brand wash on the right edge */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[color:var(--t-50)] to-transparent" />

      {title && (
        <div className="relative px-5 sm:px-7 pt-5 pb-5">
          <BannerRow
            identity={<BannerIdentity as="h1" icon={icon ?? ShieldCheck} name={title} badges={eyebrow ? <BannerBadge>{eyebrow}</BannerBadge> : undefined} description={description} />}
            aside={actions}
          />
        </div>
      )}

      {children && <div className="relative px-5 sm:px-7 pb-5">{children}</div>}

      {tabs && tabs.length > 0 && (
        <div role="tablist" aria-label={tabsLabel} className="relative flex gap-1 overflow-x-auto overflow-y-hidden px-3 sm:px-5 border-t border-[color:var(--t-200)] bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                className={`shrink-0 min-h-[48px] px-4 text-[13px] flex items-center gap-2 cursor-pointer border-b-2 transition-colors ${
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

/* ------------------------------------------------------------------------------------------------
 * Shared building blocks for the identity banner used by the practitioner and patient dashboards.
 * ---------------------------------------------------------------------------------------------- */

export const bannerPrimaryBtn =
  'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black px-4 h-11 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none border border-[color:var(--t-700)]';
export const bannerSecondaryBtn =
  'bg-white hover:bg-[color:var(--t-50)] text-[color:var(--t-600)] border border-[color:var(--t-200)] text-xs font-bold px-4 h-11 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap flex-1 sm:flex-none shadow-xs';

/** Two-column row: identity on the left, KPIs and actions on the right. */
export function BannerRow({ identity, aside }: { identity: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
      {identity}
      {aside && <div className="flex items-center gap-4 flex-wrap lg:justify-end border-t lg:border-t-0 border-[color:var(--t-200)]/80 pt-4 lg:pt-0 shrink-0">{aside}</div>}
    </div>
  );
}

interface BannerIdentityProps {
  name: React.ReactNode;
  avatarUrl?: string | null;
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

export function BannerIdentity({ name, avatarUrl, icon: Icon, as: Heading = 'h2', description, avatarBadge, badges, meta }: BannerIdentityProps) {
  const initials = typeof name === 'string' ? name.replace(/^Dr\.?\s+/i, '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '';
  return (
    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={typeof name === 'string' ? name : ''} className="h-14 w-14 sm:h-20 sm:w-20 rounded-full object-cover border-2 sm:border-4 border-white shadow-md" referrerPolicy="no-referrer" />
        ) : (
          <div aria-hidden="true" className="h-14 w-14 sm:h-20 sm:w-20 rounded-full border-2 sm:border-4 border-white shadow-md bg-[color:var(--t-100)] text-[color:var(--t-700)] flex items-center justify-center text-lg sm:text-2xl font-bold">
            {Icon ? <Icon className="h-6 w-6 sm:h-8 sm:w-8" /> : initials || '?'}
          </div>
        )}
        {avatarBadge}
      </div>
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Heading className="text-xl sm:text-2xl font-bold text-[color:var(--ink)] tracking-tight">{name}</Heading>
          {badges}
        </div>
        {description && <p className="text-sm text-[color:var(--ink-2)] leading-relaxed max-w-3xl">{description}</p>}
        {meta && <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold flex-wrap">{meta}</div>}
      </div>
    </div>
  );
}

/** Pill used beside the name: neutral (brand) or success. */
export function BannerBadge({ tone = 'brand', children }: { tone?: 'brand' | 'success'; children: React.ReactNode }) {
  return tone === 'success' ? (
    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">{children}</span>
  ) : (
    <span className="bg-white text-[color:var(--t-600)] border border-[color:var(--t-200)] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs">{children}</span>
  );
}

/** KPI strip: one compact row, same height as the banner buttons (h-11). */
export function BannerKpis({ items }: { items: { value: React.ReactNode; label: string }[] }) {
  return (
    <div className="flex items-stretch w-full sm:w-auto sm:h-11 bg-white/90 border border-[color:var(--t-200)] rounded-xl shadow-xs">
      {items.map((k, i) => (
        <div key={k.label} className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-0 min-w-0 ${i > 0 ? 'border-l border-slate-200' : ''}`}>
          <span className="text-base font-bold text-[color:var(--t-600)] leading-none tabular-nums">{k.value}</span>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight text-center">{k.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Labelled dropdown used in filter rows (library, pharmacies). Two per row on phones. */
export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0 basis-[calc(50%-8px)] sm:basis-auto sm:w-[190px]">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-[color:var(--t-200)] bg-white px-2 sm:px-3 min-h-[40px] text-[13px] font-semibold text-[color:var(--ink)] cursor-pointer focus:outline-none focus:border-[color:var(--t-600)]">
        {children}
      </select>
    </label>
  );
}
