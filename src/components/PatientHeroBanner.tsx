import React from 'react';
import { useTr } from '../locale';
import {
  CheckCircle2, LifeBuoy, Video, Stethoscope, FolderHeart,
  Heart, Calendar, MessageSquare, Pill, FlaskConical, FileText,
  Search, UserCheck, Store, BookOpen, PackagePlus, HeartHandshake, Plane, LayoutDashboard
} from 'lucide-react';
import DashboardHeader, {
  BannerRow,
  BannerIdentity,
  BannerBadge,
  BannerKpis,
  bannerOnBrandPrimaryBtn,
  bannerOnBrandSecondaryBtn,
  type DashboardTab,
} from '../shared/ui/DashboardHeader';

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
  /** Retained for backward-compatibility; banner always renders full identity & KPIs for cross-page consistency. */
  compact?: boolean;
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
  const tx = useTr();
  const helpActive = isHelpActive ?? (groupName === 'Help & Support');

  const handleHelpClick = () => {
    if (helpActive) return;
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
        className={`shrink-0 min-h-[40px] px-3.5 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
          helpActive
            ? 'font-semibold text-[color:var(--t-700)] bg-[color:var(--t-50)]'
            : 'font-medium text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)]'
        }`}
        title={tx('Patient Care Concierge & Support Desk')}
      >
        <LifeBuoy className={`h-4 w-4 ${helpActive ? 'text-[color:var(--t-600)]' : 'text-slate-500'}`} />
        <span className="whitespace-nowrap font-medium sm:font-semibold">{tx('Help & Support')}</span>
        {openTicketsCount > 0 && (
          <span className="count-badge bg-[color:var(--t-600)] text-white">
            {openTicketsCount}
          </span>
        )}
      </button>
    </div>
  );

  const navigatePatientGroup = (groupKey: string, subId?: string) => {
    const viewMap: Record<string, string> = {
      care: 'patient_care',
      records: 'patient_records',
      discovery: 'patient_discovery',
      services: 'patient_services',
    };
    try {
      if (subId) sessionStorage.setItem('medcred_patient_subtab', subId);
    } catch { /* ignore */ }
    if (onTabChange && !subId) {
      onTabChange(groupKey as T);
      return;
    }
    const targetView = viewMap[groupKey] || 'patient_care';
    window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: targetView }));
  };

  const defaultPatientTabs: DashboardTab<any>[] = [
    {
      id: 'care',
      label: tx('My Care'),
      icon: Heart,
      count: upcomingCount || undefined,
      summary: tx('Upcoming visits, live consults, and your saved clinicians.'),
      cta: { label: tx('Start Instant Consult'), onClick: () => navigatePatientGroup('care', 'consult') },
      onSubTabChange: (subId) => navigatePatientGroup('care', subId),
      subItems: [
        { id: 'overview', label: tx('Overview'), description: tx('Today at a glance: visits, medicines, vitals & care team'), icon: LayoutDashboard },
        { id: 'appointments', label: tx('Appointments'), description: tx('Manage upcoming visits, reschedules & history'), icon: Calendar, count: upcomingCount || undefined },
        { id: 'consult', label: tx('Instant Consult'), description: tx('24/7 video consults & symptom triage'), icon: Video },
        { id: 'messages', label: tx('Messages'), description: tx('Encrypted chat with your doctors & clinics'), icon: MessageSquare },
        { id: 'saved', label: tx('My Care Team'), description: tx('Bookmarked specialists, nurses & clinics'), icon: Heart, count: careTeamCount || undefined },
      ],
    },
    {
      id: 'records',
      label: tx('Health Records'),
      icon: FolderHeart,
      summary: tx('Verified EHR vitals, prescriptions, labs, and digital MCs.'),
      cta: { label: tx('View Prescriptions'), onClick: () => navigatePatientGroup('records', 'prescriptions') },
      onSubTabChange: (subId) => navigatePatientGroup('records', subId),
      subItems: [
        { id: 'records', label: tx('Vitals & Profile'), description: tx('Blood pressure, allergies, chronic conditions & EHR'), icon: FolderHeart },
        { id: 'prescriptions', label: tx('Prescriptions'), description: tx('Active e-prescriptions, refills & pharmacy pickup'), icon: Pill },
        { id: 'labs', label: tx('Lab Results'), description: tx('Diagnostic panels, imaging & pathology reports'), icon: FlaskConical },
        { id: 'certs', label: tx('MC & Referrals'), description: tx('Digital medical certificates & specialist letters'), icon: FileText },
      ],
    },
    {
      id: 'discovery',
      label: tx('Find Care'),
      icon: Search,
      summary: tx('Search MMC doctors, LJM nurses, and verified pharmacies.'),
      cta: { label: tx('Find a Doctor'), onClick: () => navigatePatientGroup('discovery', 'registry') },
      onSubTabChange: (subId) => navigatePatientGroup('discovery', subId),
      subItems: [
        { id: 'registry', label: tx('Doctors & Specialists'), description: tx('Search MMC-verified physicians by specialty'), icon: Search },
        { id: 'nurses', label: tx('Nurses & Home Care'), description: tx('LJM-verified nurses for home recovery & care'), icon: UserCheck },
        { id: 'pharmacies', label: tx('Pharmacies'), description: tx('Nearby verified dispensaries & cold-chain delivery'), icon: Store },
        { id: 'articles', label: tx('Health Library'), description: tx('Clinician-reviewed guides & medication advice'), icon: BookOpen },
      ],
    },
    {
      id: 'services',
      label: tx('Packages & Quotes'),
      icon: PackagePlus,
      summary: tx('Bundled screening plans, cost estimates, and medical travel.'),
      cta: { label: tx('Browse Health Packages'), onClick: () => navigatePatientGroup('services', 'packages') },
      onSubTabChange: (subId) => navigatePatientGroup('services', subId),
      subItems: [
        { id: 'packages', label: tx('Health Packages'), description: tx('Bundled screening, maternity & checkup plans'), icon: PackagePlus },
        { id: 'assistance', label: tx('Cost Quotes & Aid'), description: tx('Treatment estimates & financial assistance requests'), icon: HeartHandshake },
        { id: 'tourism', label: tx('Medical Travel'), description: tx('Cross-border hospital coordination & concierge'), icon: Plane },
      ],
    },
  ];

  const resolvedTabs = tabs ?? (defaultPatientTabs as DashboardTab<T>[]);
  const handleDefaultTabChange = (grp: T) => {
    if (onTabChange) {
      onTabChange(grp);
      return;
    }
    navigatePatientGroup(String(grp));
  };

  return (
    <DashboardHeader
      fullWidth={true}
      tabs={resolvedTabs}
      activeTab={activeTab}
      onTabChange={handleDefaultTabChange}
      tabsLabel={tabsLabel || tx('{name} sections', { name: tx(groupName) })}
      tabsRight={helpRightNode}
      menuStyle="mega"
    >
      <BannerRow
        identity={
          <BannerIdentity
            name={userName}
            avatarUrl={userAvatar}
            role="patient"
            badges={
              <>
                <BannerBadge tone="success">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 stroke-[3]" /> {tx('Verified health record')}
                </BannerBadge>
              </>
            }
            meta={
              <>
                <span className="font-extrabold text-[color:var(--ink)]">{greeting}</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-[color:var(--ink-2)]">{nextVisitText}</span>
              </>
            }
          />
        }
        aside={
          <>
            <BannerKpis
              items={[
                { value: upcomingCount, label: tx('Upcoming') },
                { value: activeRxCount, label: tx('Prescriptions') },
                { value: careTeamCount, label: tx('Care Team') },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {onConsultNow && (
                <button type="button" onClick={onConsultNow} className={bannerOnBrandPrimaryBtn}>
                  <Video className="h-4 w-4" />
                  <span>{tx('On-Call Doctor')}</span>
                </button>
              )}
              {onOpenTriage && (
                <button type="button" onClick={onOpenTriage} className={bannerOnBrandSecondaryBtn}>
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>{tx('Symptom Triage')}</span>
                </button>
              )}
              {onOpenRecords && (
                <button type="button" onClick={onOpenRecords} className={bannerOnBrandSecondaryBtn}>
                  <FolderHeart className="h-3.5 w-3.5" />
                  <span>{tx('Health Records')}</span>
                </button>
              )}
            </div>
          </>
        }
      />
    </DashboardHeader>
  );
}
