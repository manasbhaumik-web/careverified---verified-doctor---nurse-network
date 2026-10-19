import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, Download, Inbox, KeyRound, LifeBuoy, Pill, Search, ShieldAlert, StickyNote, Store, UserRound, Users } from 'lucide-react';
import DashboardHeader, { BannerRow, BannerIdentity, BannerBadge, BannerKpis, FilterSelect, DashboardTab, bannerPrimaryBtn, bannerSecondaryBtn } from './DashboardHeader';
import { btnDanger, btnPlain, btnPrimary, fmtDate, fmtTime, jfetch } from './pharmacy/shared';
import { useLiveAlerts } from './pharmacy/useLiveAlerts';
import SecurityCard from './pharmacy/SecurityCard';
import TeamTab from './pharmacy/TeamTab';
import DeliveryActionModal from './pharmacy/DeliveryActionModal';
import WorkspaceHeader from './WorkspaceHeader';

export type PharmacyTab = 'inbox' | 'activity' | 'reports' | 'team' | 'profile';
export type PharmacyTabGroup = 'dispensing' | 'operations';

export const PHARMACY_GROUPS: Record<PharmacyTabGroup, {
  name: string;
  defaultTab: PharmacyTab;
  tabs: { id: PharmacyTab; label: string; icon: any; count?: number }[];
}> = {
  dispensing: {
    name: 'Prescription Dispensing',
    defaultTab: 'inbox',
    tabs: [
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'activity', label: 'Activity', icon: Activity },
    ],
  },
  operations: {
    name: 'Operations & Management',
    defaultTab: 'reports',
    tabs: [
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'team', label: 'Team', icon: Users },
      { id: 'profile', label: 'Pharmacy profile', icon: Store },
    ],
  },
};

type Tab = PharmacyTab;

export interface PharmacyWorkspaceProps {
  activeGroup?: PharmacyTabGroup;
  initialTab?: PharmacyTab;
  currentUser?: any;
}

type Bucket = 'new' | 'in_progress' | 'ready' | 'cannot_fill' | 'dispensed' | 'closed';
type Fill = 'received' | 'preparing' | 'ready' | 'cannot_fill';

interface Counts { new: number; in_progress: number; ready: number; cannot_fill: number; dispensed: number; closed: number; waitingOver24h: number }
interface Me {
  pharmacy: { id: string; name: string; address: string; city: string | null; phone: string | null; hours: string | null; services: string[]; deliveryMethods?: string[]; coldChain?: boolean; panelInsurers?: string[] };
  account: { name: string; email: string; mustChangePassword: boolean; isOwner: boolean; twoFactor: { enabled: boolean; required: boolean } };
  counts: Counts;
}
interface RxItem { name: string; strength?: string; form?: string; dose: string; frequency: string; durationDays: number; quantity: number; instructions?: string }
interface Rx {
  id: string; code: string; patientName: string; items: RxItem[]; notes: string | null; issuedAt: string; validUntil: string;
  status: string; bucket: Bucket; fillStatus: Fill | null; fillReason: string | null; fillUpdatedAt: string | null;
  sentAt: string | null; firstResponseAt: string | null; dispensedAt: string | null; assignedToMe: boolean; assignedElsewhere: boolean; note: string;
  prescriber: { name: string; licenseNumber: string; stillVerified: boolean } | null;
  cancelledReason: string | null;
  insurance: { insurer: string; memberNo: string; policyType: string; employer: string | null; glStatus: string; glNumber: string | null; glNote: string | null } | null;
  delivery: { id: string; method: string; status: string; coldChain: boolean } | null;
  coldChainItems: string[]; dispensingPharmacist: string | null; poisonsEntryNo: string | null;
  safety: { shared: false } | { shared: true; allergies: { name: string; detail: string | null; severity: string | null }[]; medicines: { name: string; detail: string | null }[]; doctorWarnings: { severity: string; type: string; message: string }[] };
}
interface EventRow { id: number; ts: string; type: string; code: string | null; actorName: string | null; detail: { reason?: string; name?: string; active?: boolean; on?: boolean } | null }
interface Report {
  days: number; received: number; dispensed: number; cannotFill: number; expiredUnfilled: number; fillRate: number | null;
  responseMinutes: { average: number | null; median: number | null; samples: number };
  dispenseMinutes: { average: number | null; median: number | null; samples: number };
  current: Counts; perDay: { date: string; received: number; dispensed: number }[]; topMedicines: { name: string; count: number }[];
}

const SERVICES = ['24 hours', 'Home delivery', 'Drive-through', 'Vaccinations', 'Online ordering'];
const ALL = 'all';
const BUCKET_LABEL: Record<Bucket, string> = { new: 'New', in_progress: 'In progress', ready: 'Ready', cannot_fill: "Can't fill", dispensed: 'Dispensed', closed: 'Expired / cancelled' };
const BUCKET_STYLE: Record<Bucket, string> = {
  new: 'text-[color:var(--t-700)] bg-[color:var(--t-50)] border-[color:var(--t-200)] font-black uppercase tracking-wider rounded-none',
  in_progress: 'text-amber-850 bg-amber-50 border-amber-300 font-black uppercase tracking-wider rounded-none',
  ready: 'text-emerald-850 bg-emerald-50 border-emerald-300 font-black uppercase tracking-wider rounded-none',
  cannot_fill: 'text-rose-800 bg-rose-50 border-rose-300 font-black uppercase tracking-wider rounded-none',
  dispensed: 'text-slate-800 bg-slate-100 border-slate-300 font-black uppercase tracking-wider rounded-none',
  closed: 'text-slate-600 bg-slate-50 border-slate-200 font-black uppercase tracking-wider rounded-none',
};

const fmtMin = (m: number | null) => (m === null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`);
const waiting = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
};

export default function PharmacyWorkspace({ activeGroup, initialTab, currentUser }: PharmacyWorkspaceProps = {}) {
  const currentGroup: PharmacyTabGroup = activeGroup || (
    initialTab ? (
      (['reports', 'team', 'profile'].includes(initialTab)) ? 'operations' : 'dispensing'
    ) : 'dispensing'
  );

  const [tab, setTab] = useState<Tab>(initialTab || PHARMACY_GROUPS[currentGroup].defaultTab);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeGroup) {
      const allowed = PHARMACY_GROUPS[activeGroup].tabs.map(t => t.id);
      if (!allowed.includes(tab)) {
        setTab(initialTab && allowed.includes(initialTab) ? initialTab : PHARMACY_GROUPS[activeGroup].defaultTab);
      }
    } else if (initialTab) {
      setTab(initialTab);
    }
  }, [activeGroup, initialTab]);

  const loadMe = useCallback(async () => {
    const d = await jfetch('/api/pharmacy/me');
    if (d.status === 'success') { setMe(d.data); setError(''); } else setError(d.message || 'Could not load your workspace.');
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  const counts = me?.counts;
  // Pharmacy accounts must use two-factor sign-in where the server requires it; until then only set-up is available.
  const gated = !!me && me.account.twoFactor.required && !me.account.twoFactor.enabled;
  const alerts = useLiveAlerts({ newCount: gated ? undefined : counts?.new, refresh: loadMe });

  const displayedTabs: DashboardTab<Tab>[] = PHARMACY_GROUPS[currentGroup].tabs
    .filter(t => t.id !== 'team' || me?.account.isOwner)
    .map(t => {
      if (t.id === 'inbox') return { ...t, count: counts ? counts.new : 0 };
      return t;
    });

  if (error && !me) {
    return <div className="bg-white border border-rose-200 p-8 text-center text-sm font-semibold text-rose-700" role="alert">{error}</div>;
  }

  if (gated && me) {
    return (
      <div className="w-full space-y-5">
        <DashboardHeader fullWidth={true}>
          <BannerRow
            identity={
              <BannerIdentity
                as="h1"
                icon={Store}
                name={me.pharmacy.name}
                badges={<BannerBadge>Pharmacy workspace</BannerBadge>}
                description="One more step before you can open your inbox."
              />
            }
          />
        </DashboardHeader>
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-4 flex items-center gap-3 text-sm font-semibold">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            Pharmacy accounts handle patients' health information, so two-factor sign-in is required. Set it up below to continue.
          </div>
          <SecurityCard twoFactor={me.account.twoFactor} email={me.account.email} onChanged={loadMe} />
        </div>
      </div>
    );
  }

  const pharmacyHelpTab = (
    <div className="flex items-center pl-2 ml-auto">
      <div className="h-5 w-px bg-slate-200 mr-2 hidden sm:block" aria-hidden="true" />
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('medcred-navigate', { detail: 'help' }));
        }}
        className="inline-flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[color:var(--t-700)] hover:bg-[color:var(--t-50)] transition-colors border-b-2 border-transparent"
        title="Open Support Desk & Help Center"
      >
        <LifeBuoy className="h-4 w-4 text-slate-500" />
        <span>Help &amp; Support</span>
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-0">
      <DashboardHeader
        fullWidth={true}
        tabs={displayedTabs}
        activeTab={tab}
        onTabChange={setTab}
        tabsLabel={`${PHARMACY_GROUPS[currentGroup].name} sections`}
        tabsRight={pharmacyHelpTab}
      >
        <BannerRow
          identity={
            <BannerIdentity
              as="h1"
              avatarUrl={currentUser?.avatarUrl || me?.account?.avatarUrl || '/assets/pharmacist_female_malay.jpg'}
              role="pharmacy"
              name={me?.pharmacy.name ?? 'Pharmacy workspace'}
              badges={
                <div className="flex flex-wrap items-center gap-1.5">
                  <BannerBadge tone="brand">{PHARMACY_GROUPS[currentGroup].name}</BannerBadge>
                  <BannerBadge>Type A Poison Licence</BannerBadge>
                  <BannerBadge tone="success">LFM Accredited</BannerBadge>
                </div>
              }
              description={
                me
                  ? `${me.pharmacy.address}${me.pharmacy.city && !me.pharmacy.address.toLowerCase().includes(me.pharmacy.city.toLowerCase()) ? `, ${me.pharmacy.city}` : ''} · Signed in as ${me.account.email}`
                  : 'Loading…'
              }
            />
          }
          aside={
            <BannerKpis
              items={[
                { value: counts ? counts.new : '—', label: 'New' },
                { value: counts ? counts.in_progress : '—', label: 'In progress' },
                { value: counts ? counts.ready : '—', label: 'Ready' },
                { value: counts ? counts.dispensed : '—', label: 'Dispensed' },
              ]}
            />
          }
        />
      </DashboardHeader>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {me?.account.mustChangePassword && (
          <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 p-4 flex flex-wrap items-center gap-3 text-sm">
            <KeyRound className="h-5 w-5 shrink-0" />
            <span className="flex-1 min-w-[220px] font-semibold">You are using a temporary password. Please set your own password now.</span>
            <button type="button" onClick={() => setTab('profile')} className={btnPlain}>Change password</button>
          </div>
        )}
        {counts && counts.waitingOver24h > 0 && (
          <div role="status" className="bg-rose-50 border border-rose-200 text-rose-800 p-4 flex items-center gap-3 text-sm font-semibold">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {counts.waitingOver24h} prescription{counts.waitingOver24h === 1 ? ' has' : 's have'} been waiting over 24 hours without a response.
          </div>
        )}

        <div className="bg-white border border-[color:var(--t-200)] px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Live: new prescriptions appear automatically · updated {new Date(alerts.updatedAt).toLocaleTimeString()}</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
            <input type="checkbox" checked={alerts.sound} onChange={alerts.toggleSound} className="h-4 w-4 accent-[color:var(--t-600)]" /> Sound alert
          </label>
          {alerts.desktopSupported && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
              <input type="checkbox" checked={alerts.desktop} onChange={alerts.toggleDesktop} className="h-4 w-4 accent-[color:var(--t-600)]" /> Desktop alerts
            </label>
          )}
        </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'inbox' && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Inbox}
              eyebrow="Electronic Prescription Dispensing · Poison Licence"
              title="Prescription Dispensing Inbox & Live Orders"
              description="Receive electronic prescriptions from MMC-verified physicians, review patient drug allergies, and prepare medication dispatches."
              badges={<BannerBadge tone="brand">Type A Poison Licensed</BannerBadge>}
            />
            <InboxTab counts={counts} onChanged={loadMe} tick={alerts.tick} />
          </div>
        )}
        {tab === 'activity' && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Activity}
              eyebrow="Dispensing Audit Trail · Ministry of Health"
              title="Medication Dispensing Activity & Fulfillment Logs"
              description="Permanent digital dispensing registry, pharmacist verification sign-offs, and cold-chain delivery confirmation."
              badges={<BannerBadge tone="brand">Poisons Act 1952 Compliant</BannerBadge>}
            />
            <ActivityTab />
          </div>
        )}
        {tab === 'reports' && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={BarChart3}
              eyebrow="Dispensary Analytics · Volume & Medication Demand"
              title="Pharmacy Dispensing Reports & Financial Telemetry"
              description="Overview of dispensed prescriptions, average turnaround times, insurance guarantee fulfillment, and drug category distribution."
              badges={<BannerBadge tone="brand">Monthly Audit Summary</BannerBadge>}
            />
            <ReportsTab />
          </div>
        )}
        {tab === 'team' && me?.account.isOwner && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Users}
              eyebrow="Dispensary Staffing · Pharmacist Licences"
              title="Pharmacy Team & Dispensing Personnel"
              description="Manage registered pharmacists, dispensary assistants, and delivery dispatch personnel with verified credentials."
              badges={<BannerBadge tone="brand">Pharmacy Board Registered</BannerBadge>}
            />
            <TeamTab />
          </div>
        )}
        {tab === 'profile' && me && (
          <div className="space-y-4">
            <WorkspaceHeader
              icon={Store}
              eyebrow="Retail & Hospital Dispensary Details"
              title="Pharmacy Profile, Services & Operating Hours"
              description="Maintain official pharmacy address, cold-chain delivery capabilities, 24-hour emergency status, and insurance panel affiliations."
              badges={<BannerBadge tone="brand">Licensed Community Pharmacy</BannerBadge>}
            />
            <ProfileTab me={me} onSaved={loadMe} />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Inbox */

function InboxTab({ counts, onChanged, tick }: { counts?: Counts; onChanged: () => void; tick: number }) {
  const [list, setList] = useState<Rx[] | null>(null);
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Rx | null>(null);
  const [lookupMsg, setLookupMsg] = useState('');

  const load = useCallback(async () => {
    const d = await jfetch('/api/pharmacy/prescriptions');
    setList(d.status === 'success' ? d.data.items : []);
  }, []);
  useEffect(() => { load(); }, [load, tick]);

  const changed = () => { load(); onChanged(); };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupMsg(''); setFound(null);
    if (!code.trim()) return;
    const d = await jfetch('/api/pharmacy/lookup-code', 'POST', { code });
    if (d.status === 'success') setFound(d.data); else setLookupMsg(d.message || 'No valid prescription with that code.');
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list ?? []).filter(r => (filter === ALL || r.bucket === filter)
      && (q === '' || r.code.toLowerCase().includes(q) || r.patientName.toLowerCase().includes(q) || r.items.some(i => i.name.toLowerCase().includes(q))));
  }, [list, filter, query]);

  return (
    <div className="space-y-5">
      <section aria-label="Find a prescription" className="bg-white border border-[color:var(--t-200)] rounded-none p-5 space-y-3">
        <form onSubmit={lookup} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[240px]">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">Look up a code (walk-in patient)</span>
            <input 
              value={code} 
              onChange={e => setCode(e.target.value.toUpperCase())} 
              placeholder="e.g. DCLHAS7GS3" 
              maxLength={20} 
              className="h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white font-mono font-bold text-sm text-slate-900 outline-none focus:border-[color:var(--t-600)]" 
            />
          </label>
          <button type="submit" className={bannerPrimaryBtn}>Look up code</button>
        </form>
        {lookupMsg && <p role="alert" className="text-xs font-bold text-rose-850 bg-rose-50 border border-rose-300 rounded-none p-3">{lookupMsg}</p>}
        {found && <RxCard rx={found} onChanged={() => { setFound(null); setCode(''); changed(); }} />}
      </section>

      <section aria-label="Inbox filters" className="bg-white border border-[color:var(--t-200)] rounded-none p-5 space-y-4">
        <div className="flex items-center gap-3 border border-slate-300 bg-white px-4 h-12 focus-within:border-[color:var(--t-600)] transition-colors">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <label htmlFor="inbox-search" className="sr-only">Search the inbox</label>
          <input id="inbox-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by prescription code, patient name, or medicine..."
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400 font-medium" />
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <FilterSelect label="Status" value={filter} onChange={setFilter}>
            <option value={ALL}>All statuses ({list?.length ?? 0})</option>
            {(Object.keys(BUCKET_LABEL) as Bucket[]).map(b => <option key={b} value={b}>{BUCKET_LABEL[b]}{counts ? ` (${counts[b]})` : ''}</option>)}
          </FilterSelect>
          {(filter !== ALL || query) && (
            <button type="button" onClick={() => { setFilter(ALL); setQuery(''); }} className="h-10 px-4 text-xs font-bold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] cursor-pointer transition-colors rounded-none">Clear filters</button>
          )}
          <span className="ml-auto self-center text-xs font-mono font-bold text-slate-600 tabular-nums bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-none" aria-live="polite">{shown.length} result{shown.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      {list === null ? (
        <p className="text-sm text-slate-600 font-semibold">Loading your inbox…</p>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-[color:var(--t-200)] rounded-none p-12 text-center space-y-3">
          <Inbox className="h-10 w-10 text-[color:var(--t-300)] mx-auto" />
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">{list.length === 0 ? 'No prescriptions yet' : 'Nothing matches your filters'}</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">{list.length === 0 ? 'When a patient sends you a prescription it will appear here and you will be notified.' : 'Try a different status or search filter.'}</p>
        </div>
      ) : (
        <section aria-label="Prescriptions" className="grid gap-5 lg:grid-cols-2">
          {shown.map(r => <RxCard key={r.id} rx={r} onChanged={changed} />)}
        </section>
      )}
    </div>
  );
}

function RxCard({ rx, onChanged }: { rx: Rx; onChanged: () => void; key?: React.Key }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState(rx.note);
  const [confirming, setConfirming] = useState(false);
  const [pharmacist, setPharmacist] = useState('');
  const [poisonsNo, setPoisonsNo] = useState('');
  const [glNumber, setGlNumber] = useState('');
  const [glNote, setGlNote] = useState('');
  const [deliveryModalStatus, setDeliveryModalStatus] = useState<'arranged' | 'delivered' | 'failed' | null>(null);
  const active = rx.status === 'active';

  const run = async (url: string, method: string, body?: unknown, done?: string) => {
    setBusy(true); setMsg(null);
    const d = await jfetch(url, method, body);
    setBusy(false);
    if (d.status === 'success') { setMsg({ ok: true, text: done ?? 'Saved.' }); setDeclining(false); setReason(''); setConfirming(false); onChanged(); }
    else setMsg({ ok: false, text: d.message || 'Could not save. Try again.' });
    return d;
  };
  const setStatus = (status: Fill) => run(`/api/pharmacy/prescriptions/${rx.id}/status`, 'POST', { status, reason }, 'Status updated. The patient was notified.');
  const dispense = () => run(`/api/pharmacy/prescriptions/${rx.id}/dispense`, 'POST', { pharmacistName: pharmacist || undefined, poisonsEntryNo: poisonsNo || undefined }, 'Recorded as dispensed.');
  const decideGl = (status: 'approved' | 'declined') => run(`/api/pharmacy/prescriptions/${rx.id}/guarantee-letter`, 'POST', { status, glNumber, note: glNote }, status === 'approved' ? 'Guarantee letter recorded.' : 'The patient was told to pay directly.');
  const deliveryStep = async (status: string) => {
    if (!rx.delivery) return;
    if (status === 'out_for_delivery') {
      await run(`/api/pharmacy/deliveries/${rx.delivery.id}/status`, 'POST', { status }, 'Delivery updated. The patient was notified.');
    } else if (status === 'arranged' || status === 'delivered' || status === 'failed') {
      setDeliveryModalStatus(status);
    }
  };
  const handleDeliveryModalSubmit = async (body: Record<string, unknown>) => {
    if (!rx.delivery) return;
    const res = await run(`/api/pharmacy/deliveries/${rx.delivery.id}/status`, 'POST', body, 'Delivery updated. The patient was notified.');
    if (res?.status === 'success') {
      setDeliveryModalStatus(null);
    }
  };
  const saveNote = async () => { const d = await run(`/api/pharmacy/prescriptions/${rx.id}/note`, 'PUT', { note }, 'Note saved.'); if (d.status === 'success') setNoting(false); };

  const overdue = rx.bucket === 'new' && rx.sentAt && Date.now() - Date.parse(rx.sentAt) > 86_400_000;

  return (
    <article className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-extrabold text-[color:var(--t-700)] tracking-wide">{rx.code}</p>
          <h3 className="text-base font-bold text-[color:var(--ink)] flex items-center gap-1.5 [overflow-wrap:anywhere]"><UserRound className="h-4 w-4 shrink-0 text-[color:var(--t-600)]" />{rx.patientName}</h3>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 border ${BUCKET_STYLE[rx.bucket]}`}>{BUCKET_LABEL[rx.bucket]}{rx.bucket === 'in_progress' && rx.fillStatus ? ` · ${rx.fillStatus === 'received' ? 'Received' : 'Preparing'}` : ''}</span>
      </div>

      <ul className="space-y-1.5">
        {rx.items.map((i, k) => (
          <li key={k} className="text-sm text-slate-800 flex gap-2 [overflow-wrap:anywhere]">
            <Pill className="h-4 w-4 shrink-0 mt-0.5 text-[color:var(--t-600)]" />
            <span><strong>{i.name}</strong> {[i.strength, i.form].filter(Boolean).join(' ')} · {i.dose}, {i.frequency} for {i.durationDays} days · qty {i.quantity}{i.instructions ? ` · ${i.instructions}` : ''}</span>
          </li>
        ))}
      </ul>
      {rx.notes && <p className="text-xs text-slate-600 [overflow-wrap:anywhere]">Doctor's note: {rx.notes}</p>}

      <div className="text-xs text-slate-600 space-y-0.5">
        {rx.prescriber && <p className="[overflow-wrap:anywhere]">Prescribed by {rx.prescriber.name} ({rx.prescriber.licenseNumber}){!rx.prescriber.stillVerified && <strong className="text-rose-700"> · NOT currently verified</strong>}</p>}
        <p>Valid until {fmtDate(rx.validUntil)}{rx.sentAt && ` · sent ${fmtTime(rx.sentAt)}`}</p>
        {overdue && rx.sentAt && <p className="font-bold text-rose-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Waiting {waiting(rx.sentAt)} with no response</p>}
        {rx.fillStatus === 'cannot_fill' && rx.fillReason && <p className="font-semibold text-rose-700 [overflow-wrap:anywhere]">Could not fill: {rx.fillReason}</p>}
        {rx.dispensedAt && <p className="font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Dispensed {fmtTime(rx.dispensedAt)}</p>}
      </div>

      {rx.coldChainItems.length > 0 && (
        <p className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2.5 [overflow-wrap:anywhere]">
          Cold chain: {rx.coldChainItems.join(', ')} must stay refrigerated (commonly 2 to 8 °C). Confirm the storage rule for each product.
        </p>
      )}

      {rx.insurance && (
        <div className="border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
          <p className="font-black uppercase tracking-wide text-slate-700">Insurance</p>
          <p className="[overflow-wrap:anywhere]"><b>{rx.insurance.insurer}</b> · member no. <span className="font-mono">{rx.insurance.memberNo}</span>{rx.insurance.policyType === 'corporate' && rx.insurance.employer ? ` · employer ${rx.insurance.employer}` : ''}</p>
          <p>Guarantee letter: <b className={rx.insurance.glStatus === 'declined' ? 'text-rose-700' : rx.insurance.glStatus === 'approved' ? 'text-emerald-700' : 'text-amber-700'}>{rx.insurance.glStatus === 'requested' ? 'waiting for you' : rx.insurance.glStatus}</b>{rx.insurance.glNumber ? ` (${rx.insurance.glNumber})` : ''}</p>
          {active && (
            <div className="flex flex-wrap gap-2 items-center">
              <input value={glNumber} onChange={e => setGlNumber(e.target.value)} placeholder="GL number" aria-label="Guarantee letter number" className="border border-slate-300 px-2 py-1.5 w-36" />
              <input value={glNote} onChange={e => setGlNote(e.target.value)} placeholder="Note (required to decline)" aria-label="Guarantee letter note" className="border border-slate-300 px-2 py-1.5 flex-1 min-w-[10rem]" />
              <button type="button" disabled={busy || !glNumber.trim()} onClick={() => decideGl('approved')} className={btnPlain}>GL approved</button>
              <button type="button" disabled={busy || glNote.trim().length < 3} onClick={() => decideGl('declined')} className={btnDanger}>GL declined</button>
            </div>
          )}
        </div>
      )}

      {rx.delivery && (
        <div className="border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
          <p className="font-black uppercase tracking-wide text-slate-700">Home delivery</p>
          <p><b>{rx.delivery.status.replace(/_/g, ' ')}</b> · {{ pharmacy_courier: 'own rider', grab: 'Grab', lalamove: 'Lalamove', other_courier: 'other courier' }[rx.delivery.method] ?? rx.delivery.method}{rx.delivery.coldChain ? ' · cold chain' : ''}</p>
          {['requested', 'arranged', 'out_for_delivery'].includes(rx.delivery.status) && (
            <div className="flex flex-wrap gap-2">
              {rx.delivery.status === 'requested' && <button type="button" disabled={busy} onClick={() => deliveryStep('arranged')} className={btnPlain}>Arranged</button>}
              {rx.delivery.status !== 'out_for_delivery' && <button type="button" disabled={busy} onClick={() => deliveryStep('out_for_delivery')} className={btnPlain}>Out for delivery</button>}
              <button type="button" disabled={busy} onClick={() => deliveryStep('delivered')} className={btnPrimary}>Delivered</button>
              <button type="button" disabled={busy} onClick={() => deliveryStep('failed')} className={btnDanger}>Failed</button>
            </div>
          )}
        </div>
      )}

      {rx.status === 'cancelled' && (
        <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 [overflow-wrap:anywhere]">
          Cancelled by the doctor{rx.cancelledReason ? `: ${rx.cancelledReason}` : ''}. Do not dispense.
        </p>
      )}

      {active && !rx.assignedElsewhere && (rx.safety.shared ? (
        <div className="border border-rose-300 bg-rose-50 rounded-none p-4 space-y-2 text-xs text-slate-850">
          <p className="font-black text-rose-900 uppercase tracking-wide flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 shrink-0 text-rose-700" /> Patient Safety Records (Shared)</p>
          <p className="[overflow-wrap:anywhere] font-semibold text-slate-800"><b>Allergies:</b> {rx.safety.allergies.length ? rx.safety.allergies.map(a => `${a.name}${a.severity ? ` (${a.severity})` : ''}`).join(', ') : 'none recorded'}</p>
          <p className="[overflow-wrap:anywhere] font-semibold text-slate-800"><b>Current medicines:</b> {rx.safety.medicines.length ? rx.safety.medicines.map(m => `${m.name}${m.detail ? ` ${m.detail}` : ''}`).join(', ') : 'none recorded'}</p>
          {rx.safety.doctorWarnings.length > 0 && (
            <ul className="list-disc ml-5 space-y-1 font-bold text-rose-850">
              {rx.safety.doctorWarnings.map((w, i) => <li key={i} className="[overflow-wrap:anywhere]"><b>Doctor warning:</b> {w.message}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-none p-3 font-semibold">
          The patient has not shared their allergies or current medicines. Inquire at the dispensing counter before releasing medicine.
        </p>
      ))}

      {rx.assignedElsewhere && <p className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-none p-3">This prescription was routed to a different pharmacy; you cannot update or dispense it.</p>}

      {active && !rx.assignedElsewhere && (
        <div className="space-y-3 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {rx.assignedToMe && !rx.fillStatus && <button type="button" disabled={busy} onClick={() => setStatus('received')} className={btnPlain}>Mark received</button>}
            {rx.assignedToMe && rx.fillStatus !== 'preparing' && rx.fillStatus !== 'ready' && <button type="button" disabled={busy} onClick={() => setStatus('preparing')} className={btnPlain}>Preparing</button>}
            {rx.assignedToMe && rx.fillStatus !== 'ready' && <button type="button" disabled={busy} onClick={() => setStatus('ready')} className={btnPlain}>Ready for pickup</button>}
            {rx.assignedToMe && rx.fillStatus !== 'cannot_fill' && <button type="button" disabled={busy} onClick={() => setDeclining(v => !v)} className={btnDanger}>Can't fill</button>}
            <button type="button" disabled={busy} onClick={() => setConfirming(true)} className={btnPrimary}>Mark dispensed</button>
          </div>
          {confirming && (
            <div role="alertdialog" aria-label="Confirm dispensing" className="border-2 border-[color:var(--t-600)] bg-[color:var(--t-50)] rounded-none p-4 space-y-3">
              <p className="text-xs font-black text-slate-900 [overflow-wrap:anywhere] uppercase tracking-wide">Confirm Dispensing: {rx.code} to {rx.patientName}?</p>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">This action marks the prescription as fulfilled and cannot be undone.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={pharmacist} onChange={e => setPharmacist(e.target.value)} placeholder="Dispensing pharmacist (default: registered pharmacist)" aria-label="Dispensing pharmacist" maxLength={100} className="border border-slate-300 px-2 py-2 text-xs bg-white" />
                <input value={poisonsNo} onChange={e => setPoisonsNo(e.target.value)} placeholder="Poisons / prescription book entry no." aria-label="Poisons book entry number" maxLength={40} className="border border-slate-300 px-2 py-2 text-xs bg-white" />
              </div>
              {!rx.safety.shared && <p className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 p-2 rounded-none">Allergies and current medicines were not shared. Have you confirmed verbally with the patient?</p>}
              {rx.prescriber && !rx.prescriber.stillVerified && <p className="text-xs font-black text-rose-800 bg-rose-100 border border-rose-300 p-2 rounded-none uppercase tracking-wide">Warning: The prescribing doctor is not currently verified by the medical board.</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" disabled={busy} onClick={dispense} className={btnPrimary}>Yes, Mark Dispensed</button>
                <button type="button" onClick={() => setConfirming(false)} className={btnPlain}>Go Back</button>
              </div>
            </div>
          )}
          {declining && (
            <div className="space-y-2.5 bg-slate-50 border border-slate-300 p-3.5 rounded-none">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block" htmlFor={`reason-${rx.id}`}>Reason for inability to fill (sent to patient)</label>
              <input id={`reason-${rx.id}`} value={reason} onChange={e => setReason(e.target.value)} maxLength={200} placeholder="e.g. Out of stock until Tuesday, recommended alternative clinic" className="h-10 w-full border border-slate-300 rounded-none px-3 bg-white text-xs font-semibold outline-none focus:border-[color:var(--t-600)]" />
              <div className="flex gap-2">
                <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => setStatus('cannot_fill')} className={btnDanger}>Send to patient</button>
                <button type="button" onClick={() => setDeclining(false)} className={btnPlain}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {rx.assignedToMe && (
        <div className="space-y-2 pt-1">
          {!noting ? (
            <button type="button" onClick={() => setNoting(true)} className="text-xs font-bold text-[color:var(--t-700)] hover:underline cursor-pointer inline-flex items-center gap-1.5 text-left">
              <StickyNote className="h-3.5 w-3.5 shrink-0" /> {rx.note ? <span className="[overflow-wrap:anywhere]">Private note: {rx.note}</span> : 'Add a private note'}
            </button>
          ) : (
            <div className="space-y-2 bg-slate-50 border border-slate-300 p-3.5 rounded-none">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block" htmlFor={`note-${rx.id}`}>Internal Pharmacist Note (Private to this pharmacy)</label>
              <textarea id={`note-${rx.id}`} value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500} className="w-full border border-slate-300 rounded-none p-3 bg-white text-xs font-semibold outline-none focus:border-[color:var(--t-600)]" />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={saveNote} className={btnPlain}>Save note</button>
                <button type="button" onClick={() => { setNoting(false); setNote(rx.note); }} className={btnPlain}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {msg && <p role="status" className={`text-xs font-bold p-3 border rounded-none ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{msg.text}</p>}

      {rx.delivery && deliveryModalStatus && (
        <DeliveryActionModal
          isOpen={true}
          status={deliveryModalStatus}
          delivery={rx.delivery}
          rxCode={rx.code}
          patientName={rx.patientName}
          onClose={() => setDeliveryModalStatus(null)}
          onSubmit={handleDeliveryModalSubmit}
          busy={busy}
        />
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ Activity */

const who = (e: EventRow) => e.actorName ?? 'Your pharmacy';
const EVENT_TEXT: Record<string, (e: EventRow) => string> = {
  sent: e => `A patient sent you prescription ${e.code ?? ''}`,
  redirected: e => `A patient sent prescription ${e.code ?? ''} to a different pharmacy`,
  cancelled: e => `The doctor cancelled prescription ${e.code ?? ''}${e.detail?.reason ? `: ${e.detail.reason}` : ''}`,
  received: e => `${who(e)} marked ${e.code ?? 'a prescription'} as received`,
  preparing: e => `${who(e)} started preparing ${e.code ?? 'a prescription'}`,
  ready: e => `${who(e)} marked ${e.code ?? 'a prescription'} ready for pickup`,
  cannot_fill: e => `${who(e)} could not fill ${e.code ?? 'a prescription'}${e.detail?.reason ? `: ${e.detail.reason}` : ''}`,
  dispensed: e => `${who(e)} dispensed ${e.code ?? 'a prescription'}`,
  note: e => `${who(e)} added a note on ${e.code ?? 'a prescription'}`,
  lookup: e => `${who(e)} looked up ${e.code ?? 'a prescription'}`,
  profile_update: e => `${who(e)} updated the pharmacy details`,
  staff_added: e => `${who(e)} added a staff login${e.detail?.name ? ` for ${e.detail.name}` : ''}`,
  staff_status: e => `${who(e)} ${e.detail?.active ? 'enabled' : 'disabled'} the login of ${e.detail?.name ?? 'a colleague'}`,
  two_factor: e => `${who(e)} turned two-factor sign-in ${e.detail?.on ? 'on' : 'off'}`,
};

function ActivityTab() {
  const [items, setItems] = useState<EventRow[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    jfetch('/api/pharmacy/activity?limit=30').then(d => { setItems(d.status === 'success' ? d.data.items : []); setNext(d.status === 'success' ? d.data.next : null); });
  }, []);
  const more = async () => {
    if (next === null) return;
    setLoadingMore(true);
    const d = await jfetch(`/api/pharmacy/activity?limit=30&before=${next}`);
    if (d.status === 'success') { setItems(prev => [...(prev ?? []), ...d.data.items]); setNext(d.data.next); }
    setLoadingMore(false);
  };

  if (items === null) return <p className="text-sm text-slate-600">Loading activity…</p>;
  if (items.length === 0) {
    return (
      <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2">
        <Activity className="h-10 w-10 text-[color:var(--t-200)] mx-auto" />
        <h2 className="text-sm font-extrabold">No activity yet</h2>
        <p className="text-sm text-slate-600">Everything your pharmacy does here is recorded in this timeline.</p>
      </div>
    );
  }
  return (
    <section aria-label="Activity log" className="bg-white border border-[color:var(--t-200)] rounded-none">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[color:var(--t-600)]" />
          <span>Operational Audit Trail ({items.length})</span>
        </h3>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attributable Dispensing Logs</span>
      </div>
      <ol className="divide-y divide-slate-200">
        {items.map(e => (
          <li key={e.id} className="p-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 hover:bg-slate-50 transition-colors">
            <span className="text-sm font-semibold text-slate-800 min-w-0 [overflow-wrap:anywhere]">{(EVENT_TEXT[e.type] ?? (() => e.type))(e)}</span>
            <time dateTime={e.ts} className="text-xs font-mono font-bold text-slate-500 tabular-nums">{fmtTime(e.ts)}</time>
          </li>
        ))}
      </ol>
      {next !== null && (
        <div className="p-4 border-t border-slate-200 text-center bg-slate-50">
          <button type="button" onClick={more} disabled={loadingMore} className={btnPlain}>{loadingMore ? 'Loading older entries…' : 'Load older activity'}</button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Reports */

function ReportsTab() {
  const [days, setDays] = useState('30');
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => {
    setR(null);
    jfetch(`/api/pharmacy/reports?days=${days}`).then(d => setR(d.status === 'success' ? d.data : null));
  }, [days]);

  const max = Math.max(1, ...(r?.perDay.map(d => Math.max(d.received, d.dispensed)) ?? [1]));
  const tile = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="bg-white border border-[color:var(--t-200)] rounded-none p-5 min-w-0 flex flex-col justify-between gap-1">
      <p className="text-xs font-black uppercase tracking-wider text-slate-600">{label}</p>
      <p className="text-2xl font-black text-[color:var(--ink)] mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500 font-semibold mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <section aria-label="Report period" className="bg-white border border-[color:var(--t-200)] rounded-none p-5 flex flex-wrap items-end gap-4">
        <FilterSelect label="Reporting Period" value={days} onChange={setDays}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </FilterSelect>
        <a href={`/api/pharmacy/reports?days=${days}&format=csv`} className={`${bannerSecondaryBtn} ml-auto`}><Download className="h-4 w-4" /> Download Audited CSV</a>
      </section>

      {!r ? <p className="text-sm text-slate-600 font-semibold">Loading report…</p> : (
        <>
          <section aria-label="Key figures" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {tile('Received', r.received, 'sent to pharmacy')}
            {tile('Dispensed', r.dispensed, 'orders fulfilled')}
            {tile("Couldn't fill", r.cannotFill, 'stock / declined')}
            {tile('Fill rate', r.fillRate === null ? '—' : `${r.fillRate}%`, 'of processed')}
            {tile('First response', fmtMin(r.responseMinutes.median), `median · avg ${fmtMin(r.responseMinutes.average)}`)}
            {tile('Time to dispense', fmtMin(r.dispenseMinutes.median), `median · avg ${fmtMin(r.dispenseMinutes.average)}`)}
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-label="Prescriptions per day" className="bg-white border border-[color:var(--t-200)] rounded-none p-5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Daily Prescription Volume</h2>
                <p className="text-xs font-bold text-slate-600 flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 bg-[color:var(--t-200)]" /> Received</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 bg-[color:var(--t-600)]" /> Dispensed</span>
                </p>
              </div>
              <div className="flex items-end gap-px h-44 bg-slate-50 border border-slate-200 p-2" role="img" aria-label={`Bar chart of prescriptions received and dispensed per day over the last ${r.days} days`}>
                {r.perDay.map(d => (
                  <div key={d.date} title={`${d.date}: ${d.received} received, ${d.dispensed} dispensed`} className="flex-1 min-w-0 h-full flex items-end gap-px">
                    <div className="flex-1 bg-[color:var(--t-200)]" style={{ height: `${(d.received / max) * 100}%`, minHeight: d.received ? 3 : 0 }} />
                    <div className="flex-1 bg-[color:var(--t-600)]" style={{ height: `${(d.dispensed / max) * 100}%`, minHeight: d.dispensed ? 3 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-mono font-bold text-slate-500 mt-2"><span>{r.perDay[0]?.date}</span><span>{r.perDay[r.perDay.length - 1]?.date}</span></div>
            </section>

            <section aria-label="Most prescribed medicines" className="bg-white border border-[color:var(--t-200)] rounded-none p-5 min-w-0">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 border-b border-slate-100 pb-3">Top Formulations Dispensed</h2>
              {r.topMedicines.length === 0 ? <p className="text-sm text-slate-600 font-semibold">Nothing in this period yet.</p> : (
                <ol className="divide-y divide-slate-100">
                  {r.topMedicines.map(m => (
                    <li key={m.name} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 [overflow-wrap:anywhere] font-bold text-slate-800 capitalize">{m.name}</span>
                      <span className="font-mono font-black tabular-nums text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">{m.count} units</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
          <p className="text-xs text-slate-500 font-medium">Telemetry covers prescriptions routed to your pharmacy via MedCred. Response latency runs from patient dispatch to first status mutation. Walk-in lookups are logged independently.</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Profile */

function ProfileTab({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const p = me.pharmacy;
  const [address, setAddress] = useState(p.address);
  const [city, setCity] = useState(p.city ?? '');
  const [phone, setPhone] = useState(p.phone ?? '');
  const [hours, setHours] = useState(p.hours ?? '');
  const [services, setServices] = useState<string[]>(p.services);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(p.deliveryMethods ?? []);
  const [coldChain, setColdChain] = useState(!!p.coldChain);
  const [panel, setPanel] = useState((p.panelInsurers ?? []).join(', '));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const d = await jfetch('/api/pharmacy/me', 'PATCH', { address, city, phone, hours, services, deliveryMethods, coldChain, panelInsurers: panel.split(',').map(x => x.trim()).filter(Boolean) });
    setSaving(false);
    setMsg({ ok: d.status === 'success', text: d.status === 'success' ? 'Your listing was updated. Patients see the new details straight away.' : d.message || 'Could not save.' });
    if (d.status === 'success') onSaved();
  };
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    const d = await jfetch('/api/auth/change-password', 'POST', { currentPassword: cur, newPassword: nw });
    setPwMsg({ ok: d.status === 'success', text: d.message || (d.status === 'success' ? 'Password updated.' : 'Could not change the password.') });
    if (d.status === 'success') { setCur(''); setNw(''); onSaved(); }
  };

  const field = 'text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5';
  const inputCls = 'h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[color:var(--t-600)]';
  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      <form onSubmit={save} className="bg-white border border-[color:var(--t-200)] rounded-none p-6 space-y-5 min-w-0">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Public Pharmacy Registry Listing</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">This information appears directly on the patient-facing Pharmacies directory. The legal registered name can only be edited by the Board Admin.</p>
        </div>
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">Official Board Entity</span>
          <p className="text-base font-black text-slate-900 [overflow-wrap:anywhere]">{p.name}</p>
        </div>
        <label className="block"><span className={field}>Street Address</span><input value={address} onChange={e => setAddress(e.target.value)} required maxLength={250} className={inputCls} /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className={field}>City</span><input value={city} onChange={e => setCity(e.target.value)} maxLength={60} className={inputCls} /></label>
          <label className="block"><span className={field}>Contact Phone</span><input value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} className={inputCls} /></label>
        </div>
        <label className="block"><span className={field}>Operational Opening Hours</span><input value={hours} onChange={e => setHours(e.target.value)} maxLength={120} placeholder="e.g. Mon–Sat 9am–10pm" className={inputCls} /></label>
        <fieldset className="border border-slate-200 p-4 rounded-none bg-slate-50">
          <legend className="text-xs font-black uppercase tracking-wider text-slate-700 px-1.5 bg-white border border-slate-200">Dispensing Services Available</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
            {SERVICES.map(s => (
              <label key={s} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={services.includes(s)} onChange={e => setServices(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))} className="h-4 w-4 rounded-none accent-[color:var(--t-600)]" />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="border border-slate-200 p-4 rounded-none bg-slate-50">
          <legend className="text-xs font-black uppercase tracking-wider text-slate-700 px-1.5 bg-white border border-slate-200">Home delivery partners (Malaysia)</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
            {([['pharmacy_courier', 'Own rider'], ['grab', 'Grab'], ['lalamove', 'Lalamove'], ['other_courier', 'Other courier']] as const).map(([id, label]) => (
              <label key={id} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={deliveryMethods.includes(id)} onChange={e => setDeliveryMethods(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id))} className="h-4 w-4 rounded-none accent-[color:var(--t-600)]" />
                {label}
              </label>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer mt-3">
            <input type="checkbox" checked={coldChain} onChange={e => setColdChain(e.target.checked)} className="h-4 w-4 rounded-none accent-[color:var(--t-600)]" />
            We can deliver refrigerated (cold-chain) medicines such as insulin
          </label>
          <p className="text-xs text-slate-500 mt-1">Delivery also needs "Home delivery" ticked above. Only tick cold chain if you have proper cold packs and handling.</p>
        </fieldset>
        <label className="block"><span className={field}>Insurance panel (comma-separated insurers)</span><input value={panel} onChange={e => setPanel(e.target.value)} maxLength={400} placeholder="e.g. AIA, Great Eastern, Allianz" className={inputCls} /></label>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className={bannerPrimaryBtn}>{saving ? 'Saving Changes…' : 'Save Registry Listing'}</button>
          {msg && <p role="status" className={`text-xs font-bold p-3 border rounded-none ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{msg.text}</p>}
        </div>
      </form>

      <div className="space-y-5 min-w-0">
      <form onSubmit={changePw} className="bg-white border border-[color:var(--t-200)] rounded-none p-6 space-y-5 min-w-0">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2"><KeyRound className="h-4 w-4 text-[color:var(--t-600)]" /> Account Password & Access</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1 [overflow-wrap:anywhere]">Signed in as {me.account.email}. Updating your password terminates active sessions on external devices.</p>
        </div>
        <label className="block"><span className={field}>Current password</span><input type="password" value={cur} onChange={e => setCur(e.target.value)} required autoComplete="current-password" className={inputCls} /></label>
        <label className="block"><span className={field}>New password</span><input type="password" value={nw} onChange={e => setNw(e.target.value)} required minLength={8} autoComplete="new-password" className={inputCls} />
          <span className="text-xs text-slate-500 font-semibold mt-1 block">At least 8 characters, combining uppercase, lowercase and numerals.</span></label>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className={bannerPrimaryBtn}>Update Password</button>
          {pwMsg && <p role="status" className={`text-xs font-bold p-3 border rounded-none ${pwMsg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{pwMsg.text}</p>}
        </div>
      </form>
      <SecurityCard twoFactor={me.account.twoFactor} email={me.account.email} onChanged={onSaved} />
      </div>
    </div>
  );
}
