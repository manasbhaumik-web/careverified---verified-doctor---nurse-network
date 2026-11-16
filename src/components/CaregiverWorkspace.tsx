import React, { useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  HeartHandshake,
  HeartPulse,
  HelpCircle,
  Home,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet,
} from 'lucide-react';
import DashboardHeader, {
  BannerBadge,
  BannerIdentity,
  BannerKpis,
  BannerRow,
  DashboardTab,
} from '../shared/ui/DashboardHeader';
import WorkspaceHeader from '../shared/ui/WorkspaceHeader';
import { useTr } from '../locale';
import type { Booking, DoctorProfile, JobPost, NurseProfile, Review } from '../types';
import { UserRole } from '../types';
import JobMarket from '../domains/staffing/JobMarket';
import SecureMessenger from '../domains/telemedicine/SecureMessenger';
import PractitionerEarnings from './PractitionerEarnings';

export type CaregiverGroup = 'care' | 'shifts' | 'credentials';
export type CaregiverSubTab =
  | 'overview'
  | 'visits'
  | 'tasks'
  | 'messages'
  | 'open'
  | 'licensing'
  | 'earnings';

interface CareTaskItem {
  id: string;
  patientName: string;
  task: string;
  category: 'Vitals' | 'Medication' | 'Wound Care' | 'Mobility & ADL';
  time: string;
  done: boolean;
}

export interface CaregiverWorkspaceProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    profileId?: string | null;
  };
  professionals: (DoctorProfile | NurseProfile)[];
  bookings: Booking[];
  jobs: JobPost[];
  reviews?: Review[];
  onNewJobCreated?: (job: JobPost) => void;
  onApplyJob?: (jobId: string, userId: string) => void;
  onUpdateBookingStatus?: (bookingId: string, status: Booking['status']) => void;
  onOpenHelp?: () => void;
}

const INITIAL_CARE_TASKS: CareTaskItem[] = [
  {
    id: 'adl-1',
    patientName: 'Aisyah Rahman',
    task: 'Morning BP, SpO2 & post-op wound dressing change',
    category: 'Wound Care',
    time: '09:00 AM',
    done: false,
  },
  {
    id: 'adl-2',
    patientName: 'Aisyah Rahman',
    task: 'Verify oral antibiotic & analgesic adherence',
    category: 'Medication',
    time: '09:30 AM',
    done: true,
  },
  {
    id: 'adl-3',
    patientName: 'Tan Wei Ming',
    task: 'Assisted ambulation & fall-prevention transfer check',
    category: 'Mobility & ADL',
    time: '02:30 PM',
    done: false,
  },
  {
    id: 'adl-4',
    patientName: 'Tan Wei Ming',
    task: 'Evening fasting glucose & blood pressure log',
    category: 'Vitals',
    time: '03:00 PM',
    done: false,
  },
];

export default function CaregiverWorkspace({
  currentUser,
  professionals,
  bookings,
  jobs,
  reviews = [],
  onNewJobCreated,
  onApplyJob,
  onUpdateBookingStatus,
  onOpenHelp,
}: CaregiverWorkspaceProps) {
  const tx = useTr();
  const [activeGroup, setActiveGroup] = useState<CaregiverGroup>('care');
  const [activeSubTab, setActiveSubTab] = useState<CaregiverSubTab>('overview');
  const [visitFilter, setVisitFilter] = useState<'all' | 'Upcoming' | 'Completed'>('all');
  const [careTasks, setCareTasks] = useState<CareTaskItem[]>(INITIAL_CARE_TASKS);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPatient, setNewTaskPatient] = useState('Aisyah Rahman');
  const [practitionerTier, setPractitionerTier] = useState<'Registered Nurse (LJM)' | 'Enrolled Nurse' | 'Caring Attendant'>('Registered Nurse (LJM)');

  const nurses = useMemo(
    () => professionals.filter((p): p is NurseProfile => p.role === UserRole.NURSE),
    [professionals]
  );

  const matchedNurse = useMemo(
    () =>
      nurses.find(
        (n) =>
          n.id === currentUser.profileId ||
          n.name.toLowerCase() === currentUser.name.toLowerCase()
      ) ?? nurses[0],
    [nurses, currentUser.profileId, currentUser.name]
  );

  const myBookings = useMemo(() => {
    if (!matchedNurse) return bookings.filter((b) => String(b.professionalRole).toLowerCase().includes('nurse'));
    return bookings.filter((b) => b.professionalId === matchedNurse.id);
  }, [bookings, matchedNurse]);

  const upcomingVisits = useMemo(
    () => myBookings.filter((b) => b.status === 'Upcoming' || b.status === 'Confirmed'),
    [myBookings]
  );

  const filteredVisits = useMemo(() => {
    if (visitFilter === 'all') return myBookings;
    return myBookings.filter((b) => b.status === visitFilter);
  }, [myBookings, visitFilter]);

  const pendingTasksCount = careTasks.filter((t) => !t.done).length;
  const nurseOpenJobs = jobs.filter((j) => !j.roleRequired || j.roleRequired === 'nurse' || j.roleRequired === 'any');

  const navigateGroup = (grp: CaregiverGroup, sub?: CaregiverSubTab) => {
    setActiveGroup(grp);
    if (sub) {
      setActiveSubTab(sub);
    } else if (grp === 'care') {
      setActiveSubTab('overview');
    } else if (grp === 'shifts') {
      setActiveSubTab('open');
    } else {
      setActiveSubTab('licensing');
    }
  };

  const toggleTask = (id: string) => {
    setCareTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    setCareTasks((prev) => [
      {
        id: `adl-${Date.now()}`,
        patientName: newTaskPatient.trim() || 'Assigned Patient',
        task: trimmed,
        category: 'Mobility & ADL',
        time: 'Today',
        done: false,
      },
      ...prev,
    ]);
    setNewTaskText('');
  };

  const tabs: DashboardTab<CaregiverGroup>[] = [
    {
      id: 'care',
      label: tx('Care Visits & Roster'),
      icon: HeartPulse,
      count: upcomingVisits.length || undefined,
      summary: tx('Home-care visits, daily ADL checklists, and care-team messaging.'),
      cta: { label: tx('View Home Visits'), onClick: () => navigateGroup('care', 'visits') },
      activeSubTab,
      onSubTabChange: (subId) => navigateGroup('care', subId as CaregiverSubTab),
      subItems: [
        {
          id: 'overview',
          label: tx('Care Overview'),
          description: tx('Today’s home-care schedule, pending ADLs & readiness'),
          icon: LayoutGrid,
        },
        {
          id: 'visits',
          label: tx('Home Care & Visits'),
          description: tx('Scheduled patient visits, wound care & status updates'),
          icon: Home,
          count: upcomingVisits.length || undefined,
        },
        {
          id: 'tasks',
          label: tx('Care Plans & ADLs'),
          description: tx('Vitals, medication prompts & mobility support tasks'),
          icon: ClipboardCheck,
          count: pendingTasksCount || undefined,
        },
        {
          id: 'messages',
          label: tx('Care Team Chat'),
          description: tx('Encrypted messaging with patients, doctors & clinics'),
          icon: MessageSquare,
        },
      ],
    },
    {
      id: 'shifts',
      label: tx('Shifts & Locums'),
      icon: Briefcase,
      count: nurseOpenJobs.length || undefined,
      summary: tx('Hospital nursing shifts, home-care assignments, and ward cover.'),
      cta: { label: tx('Browse Open Shifts'), onClick: () => navigateGroup('shifts', 'open') },
      activeSubTab,
      onSubTabChange: (subId) => navigateGroup('shifts', subId as CaregiverSubTab),
      subItems: [
        {
          id: 'open',
          label: tx('Open Nursing & Care Shifts'),
          description: tx('Hospital wards, home recovery & caring attendant roles'),
          icon: Briefcase,
          count: nurseOpenJobs.length || undefined,
        },
      ],
    },
    {
      id: 'credentials',
      label: tx('LJM & Credentials'),
      icon: ShieldCheck,
      summary: tx('Nursing board registration, BLS/caregiver certs, and payouts.'),
      cta: { label: tx('Review Credentials'), onClick: () => navigateGroup('credentials', 'licensing') },
      activeSubTab,
      onSubTabChange: (subId) => navigateGroup('credentials', subId as CaregiverSubTab),
      subItems: [
        {
          id: 'licensing',
          label: tx('LJM & Caregiver Verification'),
          description: tx('APC renewal, BLS, caregiver training & compliance'),
          icon: ShieldCheck,
        },
        {
          id: 'earnings',
          label: tx('Payouts & Allowances'),
          description: tx('Home-care visit payouts, shift rates & bank details'),
          icon: Wallet,
        },
      ],
    },
  ];

  const helpButton = onOpenHelp ? (
    <button
      type="button"
      onClick={onOpenHelp}
      className="px-3 py-2 text-xs font-semibold text-[color:var(--ink-2)] hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      <span>{tx('Help & Support')}</span>
    </button>
  ) : undefined;

  return (
    <div className="w-full space-y-0">
      <DashboardHeader<CaregiverGroup>
        fullWidth={true}
        menuStyle="mega"
        tabs={tabs}
        activeTab={activeGroup}
        onTabChange={(grp) => navigateGroup(grp)}
        tabsLabel={tx('Nursing & Caregiver sections')}
        tabsRight={helpButton}
      >
        <BannerRow
          identity={
            <BannerIdentity
              as="h1"
              avatarUrl={currentUser.avatarUrl || matchedNurse?.avatarUrl || '/assets/nurse_female_malay.jpg'}
              role="nurse"
              name={matchedNurse?.name || currentUser.name}
              badges={
                <div className="flex flex-wrap items-center gap-1.5">
                  <BannerBadge tone="success">
                    <ShieldCheck className="h-3 w-3 mr-1 inline" />
                    {tx('LJM Verified')}
                  </BannerBadge>
                  <BannerBadge tone="brand">{tx(practitionerTier)}</BannerBadge>
                </div>
              }
              description={
                <span>
                  {matchedNurse?.specialization || tx('Home Care, Post-Op & Elderly Support')}
                  {matchedNurse?.licenseNumber ? ` · ${matchedNurse.licenseNumber}` : ''}
                </span>
              }
            />
          }
          aside={
            <BannerKpis
              items={[
                { value: upcomingVisits.length, label: tx('Visits') },
                { value: pendingTasksCount, label: tx('ADLs Due') },
                { value: nurseOpenJobs.length, label: tx('Open Shifts') },
              ]}
            />
          }
        />
      </DashboardHeader>

      <div className="page-w mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeSubTab === 'overview' && (
          <>
            <WorkspaceHeader
              icon={HeartHandshake}
              eyebrow={tx('Allied Care & Nursing Hub · LJM & Caregiver Network')}
              title={tx('Nursing & Caring Attendant Workspace')}
              description={tx('Manage home-care visits, daily ADL & vitals checklists, hospital shift cover, and LJM / caregiver credentials in one dedicated workspace.')}
              badges={<BannerBadge tone="success">{tx('Active Roster')}</BannerBadge>}
              aside={
                <button
                  type="button"
                  onClick={() => navigateGroup('care', 'visits')}
                  className="btn btn-sm btn-primary whitespace-nowrap shrink-0"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>{tx('Open Visit Queue ({n})', { n: upcomingVisits.length })}</span>
                </button>
              }
            />

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: tx('Upcoming Home Visits'), value: upcomingVisits.length, sub: tx('Scheduled patient visits'), icon: Home },
                { label: tx('Pending Care Tasks'), value: pendingTasksCount, sub: tx('Vitals, meds & ADLs today'), icon: ClipboardCheck },
                { label: tx('Matching Open Shifts'), value: nurseOpenJobs.length, sub: tx('Clinics, wards & home care'), icon: Briefcase },
                { label: tx('Patient Rating'), value: matchedNurse?.rating ? `${matchedNurse.rating.toFixed(1)} ★` : '4.9 ★', sub: tx('Verified family feedback'), icon: Sparkles },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white border border-[color:var(--t-200)] p-4 shadow-2xs flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--ink-2)]">{stat.label}</p>
                      <p className="text-2xl font-black text-[color:var(--ink)] tabular-nums mt-1">{stat.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
                    </div>
                    <span className="w-9 h-9 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-[color:var(--t-700)] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Two-column Overview: Next Visits + Today's ADL Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-[color:var(--t-200)] shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[color:var(--ink)]">{tx('Upcoming Home & Ward Visits')}</h2>
                    <p className="text-xs text-[color:var(--ink-2)]">{tx('Assigned patient care sessions')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateGroup('care', 'visits')}
                    className="text-xs font-bold text-[color:var(--t-700)] hover:underline cursor-pointer"
                  >
                    {tx('View all')}
                  </button>
                </div>

                {upcomingVisits.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">{tx('No upcoming home-care visits scheduled.')}</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingVisits.slice(0, 4).map((b) => (
                      <div key={b.id} className="border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 p-3.5 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[color:var(--ink)]">{b.patientName}</span>
                            <BannerBadge tone="brand">{b.mode}</BannerBadge>
                          </div>
                          <p className="text-xs text-[color:var(--ink-2)] line-clamp-2">{b.symptoms || tx('Routine nursing & caregiving support')}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {b.date}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {b.timeSlot}</span>
                          </div>
                        </div>
                        {onUpdateBookingStatus && (
                          <button
                            type="button"
                            onClick={() => onUpdateBookingStatus(b.id, 'Completed')}
                            className="px-3 py-1.5 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold shrink-0 cursor-pointer"
                          >
                            {tx('Mark Done')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white border border-[color:var(--t-200)] shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[color:var(--ink)]">{tx('Daily Care & ADL Checklist')}</h2>
                    <p className="text-xs text-[color:var(--ink-2)]">{tx('Tap any item to mark care delivered')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateGroup('care', 'tasks')}
                    className="text-xs font-bold text-[color:var(--t-700)] hover:underline cursor-pointer"
                  >
                    {tx('Manage ADLs')}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {careTasks.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleTask(item.id)}
                      className={`w-full text-left p-3 border transition-colors flex items-start gap-3 cursor-pointer ${
                        item.done
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-500'
                          : 'bg-white border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]/60'
                      }`}
                    >
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${item.done ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${item.done ? 'line-through text-slate-500' : 'text-[color:var(--ink)]'}`}>
                            {item.patientName} · {item.category}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 tabular-nums">{item.time}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${item.done ? 'line-through' : 'text-[color:var(--ink-2)]'}`}>{item.task}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {activeSubTab === 'visits' && (
          <>
            <WorkspaceHeader
              icon={Home}
              eyebrow={tx('Home Care & Bedside Roster')}
              title={tx('Home Care & Patient Visits')}
              description={tx('Track scheduled home-care sessions, wound care, post-discharge recovery, and elderly support visits.')}
              aside={
                <div className="flex items-center gap-1.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)] p-1">
                  {(['all', 'Upcoming', 'Completed'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setVisitFilter(f)}
                      className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                        visitFilter === f ? 'bg-[color:var(--t-600)] text-white' : 'text-[color:var(--ink-2)] hover:text-[color:var(--ink)]'
                      }`}
                    >
                      {f === 'all' ? tx('All ({n})', { n: myBookings.length }) : tx(f)}
                    </button>
                  ))}
                </div>
              }
            />

            <div className="space-y-3">
              {filteredVisits.length === 0 ? (
                <div className="bg-white border border-[color:var(--t-200)] p-8 text-center text-xs text-slate-500">
                  {tx('No visits match the selected filter.')}
                </div>
              ) : (
                filteredVisits.map((b) => (
                  <div key={b.id} className="bg-white border border-[color:var(--t-200)] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-[color:var(--ink)]">{b.patientName}</h3>
                        <BannerBadge tone={b.status === 'Completed' ? 'success' : 'brand'}>{b.status}</BannerBadge>
                        <BannerBadge tone="neutral">{b.mode}</BannerBadge>
                      </div>
                      <p className="text-xs text-[color:var(--ink-2)]">{b.symptoms || tx('Scheduled nursing & caregiving visit')}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {b.date}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {b.timeSlot}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {matchedNurse?.location || 'Kuala Lumpur'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigateGroup('care', 'messages')}
                        className="px-3 py-2 border border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-50)] text-xs font-bold text-[color:var(--t-700)] cursor-pointer"
                      >
                        {tx('Message Patient')}
                      </button>
                      {b.status !== 'Completed' && onUpdateBookingStatus && (
                        <button
                          type="button"
                          onClick={() => onUpdateBookingStatus(b.id, 'Completed')}
                          className="px-3.5 py-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer"
                        >
                          {tx('Complete Visit')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeSubTab === 'tasks' && (
          <>
            <WorkspaceHeader
              icon={ClipboardCheck}
              eyebrow={tx('Activities of Daily Living · Nursing Log')}
              title={tx('Care Plans & Daily ADL Tasks')}
              description={tx('Log vitals checks, wound dressings, medication prompts, and mobility assistance for assigned patients.')}
              badges={<BannerBadge tone="brand">{tx('{n} Pending', { n: pendingTasksCount })}</BannerBadge>}
            />

            <form onSubmit={addTask} className="bg-white border border-[color:var(--t-200)] p-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newTaskPatient}
                onChange={(e) => setNewTaskPatient(e.target.value)}
                placeholder={tx('Patient name')}
                className="form-input text-xs sm:w-52 h-10"
              />
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder={tx('Add ADL or nursing care task (e.g., Check evening blood glucose)')}
                className="form-input text-xs flex-1 h-10"
              />
              <button
                type="submit"
                className="px-4 h-10 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{tx('Add Care Task')}</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {careTasks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleTask(item.id)}
                  className={`w-full text-left p-4 border transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                    item.done
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-white border-[color:var(--t-200)] hover:bg-[color:var(--t-50)]/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${item.done ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${item.done ? 'line-through text-slate-500' : 'text-[color:var(--ink)]'}`}>
                          {item.patientName}
                        </span>
                        <BannerBadge tone={item.done ? 'success' : 'brand'}>{item.category}</BannerBadge>
                      </div>
                      <p className={`text-xs mt-1 ${item.done ? 'line-through text-slate-500' : 'text-[color:var(--ink-2)]'}`}>
                        {item.task}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">{item.time}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {activeSubTab === 'messages' && (
          <SecureMessenger embedded={true} currentUserId={currentUser.id} />
        )}

        {activeSubTab === 'open' && (
          <JobMarket
            embedded={true}
            role="nurse"
            jobs={jobs}
            onNewJobCreated={onNewJobCreated || (() => {})}
            onApplyJob={onApplyJob || (() => {})}
            currentUser={currentUser}
            professionals={nurses}
            reviews={reviews}
            bookings={bookings}
          />
        )}

        {activeSubTab === 'licensing' && (
          <>
            <WorkspaceHeader
              icon={ShieldCheck}
              eyebrow={tx('Malaysian Nursing Board (LJM) & Caregiver Registry')}
              title={tx('Nursing & Caring Attendant Credentials')}
              description={tx('Manage your LJM Annual Practicing Certificate, caregiver competency certificates, and clinical safety clearances.')}
              badges={<BannerBadge tone="success">{tx('Active Standing')}</BannerBadge>}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-[color:var(--t-200)] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[color:var(--t-100)] pb-3">
                  <h2 className="text-sm font-extrabold text-[color:var(--ink)]">{tx('Verified Credential Checklist')}</h2>
                  <span className="text-xs font-mono font-bold text-[color:var(--t-700)]">
                    {matchedNurse?.licenseNumber || 'LJM-RN-2026-41223'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { title: tx('LJM / Caregiver Registration'), status: tx('Verified · Active 2026'), icon: FileCheck2 },
                    { title: tx('Basic Life Support (BLS)'), status: tx('Valid through Dec 2027'), icon: HeartPulse },
                    { title: tx('Immunization & Hep-B Titer'), status: tx('Cleared for Ward & Home'), icon: UserCheck },
                    { title: tx('Background & Identity Check'), status: tx('MyKad / Passport Verified'), icon: Award },
                  ].map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <div key={cred.title} className="border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 p-3.5 flex items-start gap-3">
                        <span className="w-8 h-8 bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[color:var(--ink)]">{cred.title}</div>
                          <div className="text-xs font-semibold text-emerald-700 mt-0.5">{cred.status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-[color:var(--ink)]">{tx('Practice Category')}</h2>
                <p className="text-xs text-[color:var(--ink-2)]">
                  {tx('Select your primary non-doctor clinical role shown to patients and partner hospitals.')}
                </p>
                <div className="space-y-2 pt-1">
                  {(['Registered Nurse (LJM)', 'Enrolled Nurse', 'Caring Attendant'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setPractitionerTier(tier)}
                      className={`w-full text-left px-3.5 py-2.5 border text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                        practitionerTier === tier
                          ? 'bg-[color:var(--t-50)] border-[color:var(--t-500)] text-[color:var(--t-900)]'
                          : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-slate-50'
                      }`}
                    >
                      <span>{tx(tier)}</span>
                      {practitionerTier === tier && <CheckCircle2 className="h-4 w-4 text-[color:var(--t-600)]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeSubTab === 'earnings' && (
          <PractitionerEarnings embedded={true} />
        )}
      </div>
    </div>
  );
}
