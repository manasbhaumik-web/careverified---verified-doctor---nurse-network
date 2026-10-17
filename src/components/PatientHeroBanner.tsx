import React from 'react';
import { CheckCircle2, LifeBuoy, Video, Sparkles, FolderHeart } from 'lucide-react';
import DashboardHeader, {
  BannerRow,
  BannerIdentity,
  BannerBadge,
  BannerKpis,
  bannerOnBrandPrimaryBtn,
  bannerOnBrandSecondaryBtn,
  type DashboardTab,
} from './DashboardHeader';

export interface PatientHeroBannerProps<T extends string = string> {
  userName?: string;
  userAvatar?: string;
  greeting?: string;
  groupName?: string;
  upcomingCount?: number;
  nextVisitText?: string;
  activeRxCount?: number | string;
  careTeamCount?: number;
  bpSummary?: { value1?: number | string; value2?: number | string; flag?: { level?: string } } | null;
  tabs?: DashboardTab<T>[];
  activeTab?: T;
  onTabChange?: (tab: T) => void;
  tabsLabel?: string;
  onOpenHelp?: () => void;
  isHelpActive?: boolean;
  openTicketsCount?: number;
  onConsultNow?: () => void;
  onOpenTriage?: () => void;
  onOpenRecords?: () => void;
}

/**
 * Unified User Information Hero Banner for Patient Portal and all patient dashboard views
 * (My Care, Clinical Records, Packages & Assistance, Medical Network & Library, Help & Support).
 */
export default function PatientHeroBanner<T extends string = string>({
  userName = 'Verified Patient',
  userAvatar,
  greeting = 'Welcome back',
  groupName = 'Patient Workspace',
  upcomingCount = 0,
  nextVisitText = 'No upcoming consultations',
  activeRxCount = '–',
  careTeamCount = 0,
  bpSummary,
  tabs,
  activeTab,
  onTabChange,
  tabsLabel,
  onOpenHelp,
  isHelpActive,
  openTicketsCount = 0,
  onConsultNow,
  onOpenTriage,
  onOpenRecords,
}: PatientHeroBannerProps<T>) {
  const helpActive = isHelpActive ?? (groupName === 'Help & Support');

  const handleHelpClick = () => {
    if (onOpenHelp) {
      onOpenHelp();
    }
    window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }));
  };

  const helpRightNode = (
    <div className="flex items-center h-full">
      <span className="w-px h-5 bg-[color:var(--t-200)] mr-2 self-center hidden sm:inline-block" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        id="tab-patient-help"
        aria-selected={helpActive}
        onClick={handleHelpClick}
        className={`shrink-0 min-h-[48px] px-3.5 sm:px-4 text-[13px] flex items-center gap-2 cursor-pointer border-b transition-colors ${
          helpActive
            ? 'font-semibold text-[color:var(--t-700)] border-[color:var(--t-600)] bg-[color:var(--t-50)]/60'
            : 'font-medium text-[color:var(--ink-2)] border-transparent hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]'
        }`}
        title="Patient Care Concierge & Support Desk"
      >
        <LifeBuoy className={`h-4 w-4 ${helpActive ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`} />
        <span className="whitespace-nowrap font-medium sm:font-semibold">Help & Support</span>
        {openTicketsCount > 0 && (
          <span className="tabular-nums text-[10px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full font-semibold bg-[color:var(--t-600)] text-white leading-none">
            {openTicketsCount}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <DashboardHeader
      fullWidth={true}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabsLabel={tabsLabel || `${groupName} sections`}
      tabsRight={helpRightNode}
    >
      <BannerRow
        identity={
          <BannerIdentity
            name={userName}
            avatarUrl={userAvatar}
            badges={
              <>
                {groupName && <BannerBadge tone="brand">{groupName}</BannerBadge>}
                <BannerBadge tone="success">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 stroke-[3]" /> EHR Verified Patient
                </BannerBadge>
              </>
            }
            meta={
              <>
                <span className="font-extrabold text-[color:var(--ink)]">{greeting}</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-[color:var(--ink-2)]">{nextVisitText}</span>
                {bpSummary && (
                  <>
                    <span className="text-slate-400">&bull;</span>
                    <span
                      className={
                        bpSummary.flag?.level === 'urgent'
                          ? 'text-white font-bold bg-red-700 px-1.5'
                          : 'font-mono font-bold text-[color:var(--t-700)] bg-white px-1.5 py-0.5 border border-[color:var(--t-200)] shadow-2xs'
                      }
                    >
                      BP: {bpSummary.value1}/{bpSummary.value2} mmHg
                    </span>
                  </>
                )}
              </>
            }
          />
        }
        aside={
          <>
            <BannerKpis
              items={[
                { value: upcomingCount, label: 'Upcoming' },
                { value: activeRxCount, label: 'Prescriptions' },
                { value: careTeamCount, label: 'Care Team' },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {onConsultNow && (
                <button type="button" onClick={onConsultNow} className={bannerOnBrandPrimaryBtn}>
                  <Video className="h-4 w-4" />
                  <span>On-Call Doctor</span>
                </button>
              )}
              {onOpenTriage && (
                <button type="button" onClick={onOpenTriage} className={bannerOnBrandSecondaryBtn}>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Triage</span>
                </button>
              )}
              {onOpenRecords && (
                <button type="button" onClick={onOpenRecords} className={bannerOnBrandSecondaryBtn}>
                  <FolderHeart className="h-3.5 w-3.5" />
                  <span>Health Records</span>
                </button>
              )}
            </div>
          </>
        }
      />
    </DashboardHeader>
  );
}
