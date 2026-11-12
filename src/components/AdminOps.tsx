import React, { useEffect, useState } from 'react';
import AdminPayouts from './AdminPayouts';
import AdminEmail from './AdminEmail';
import { Siren, TrendingUp, BarChart2, CheckCircle2, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { formatMoney, useTr } from '../locale';
import AdminActionModal, { type AdminActionModalConfig } from './AdminActionModal';

const post = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface AdminTelemetry {
  shifts: {
    totalJobs: number;
    filledJobs: number;
    fillRatePct: number;
    totalApplications: number;
    acceptedApplications: number;
    daily: Array<{ day: number; date: string; applications: number; accepted: number }>;
  };
  settlements: {
    grossSen: number;
    platformFeeSen: number;
    taxSen: number;
    paidCount: number;
    refundedCount: number;
    daily: Array<{ day: number; date: string; grossSen: number; feeSen: number; count: number }>;
  };
}

export type OpsSubTab = 'roster' | 'settlements' | 'email' | 'pharmacies';

export const OPS_SUBS: { id: OpsSubTab; label: string }[] = [
  { id: 'roster', label: 'Roster & Emergency SOS' },
  { id: 'settlements', label: 'Settlements & Payouts' },
  { id: 'email', label: 'System Email Health' },
  { id: 'pharmacies', label: 'Partner Pharmacies Network' },
];

export interface AdminOpsProps {
  activeSub?: OpsSubTab;
  onSubChange?: (sub: OpsSubTab) => void;
  hideHeaderTabs?: boolean;
}

/** Admin operations: 24/7 roster coverage, SOS alerts, payments and refunds. */
const SERVICES = ['24 hours', 'Home delivery', 'Drive-through', 'Vaccinations', 'Online ordering'];

export default function AdminOps({
  activeSub,
  onSubChange,
  hideHeaderTabs = false,
}: AdminOpsProps = {}) {
  const tx = useTr();
  const [internalSub, setInternalSub] = useState<OpsSubTab>('roster');
  const sub = activeSub ?? internalSub;
  const setSub = (newSub: OpsSubTab) => {
    if (onSubChange) onSubChange(newSub);
    else setInternalSub(newSub);
  };
  const [coverage, setCoverage] = useState<any | null>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [payments, setPayments] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const blankPharm = { name: '', address: '', city: '', phone: '', hours: '', services: [] as string[] };
  const [newPharm, setNewPharm] = useState(blankPharm);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(blankPharm);
  const [issued, setIssued] = useState<{ id: string; pin: string } | null>(null);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [loginDraft, setLoginDraft] = useState({ name: '', email: '' });
  const [loginIssued, setLoginIssued] = useState<{ pharmacy: string; email: string; password: string } | null>(null);
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  const blankVerify = { licenceNumber: '', pharmacistName: '', pharmacistRegNo: '', licenceExpiry: '', pharmacistApcExpiry: '', registryReference: '', confirmed: false };
  const [verifyDraft, setVerifyDraft] = useState(blankVerify);
  const [hoveredShiftDay, setHoveredShiftDay] = useState<number | null>(null);
  const [hoveredSettlementDay, setHoveredSettlementDay] = useState<number | null>(null);
  const [modal, setModal] = useState<AdminActionModalConfig | null>(null);
  const [telemetry, setTelemetry] = useState<AdminTelemetry | null>(null);

  const load = async () => {
    const [c, e, p, tel] = await Promise.all([
      fetch('/api/admin/coverage').then(r => r.json()),
      fetch('/api/admin/emergencies').then(r => r.json()),
      fetch('/api/admin/payments').then(r => r.json()),
      fetch('/api/admin/telemetry').then(r => r.json()).catch(() => null),
    ]);
    if (c.status === 'success') setCoverage(c.data);
    if (e.status === 'success') setEmergencies(e.data);
    if (p.status === 'success') setPayments(p.data);
    if (tel?.status === 'success' && tel.data) setTelemetry(tel.data);
    const ph = await fetch('/api/admin/pharmacies').then(r => r.json());
    if (ph.status === 'success') setPharmacies(ph.data);
    const sm = await fetch('/api/admin/pharmacies/summary').then(r => r.json()).catch(() => null);
    if (sm?.status === 'success') setSummary(sm.data);
  };
  useEffect(() => { load().catch(() => setMsg(tx('Could not load data.'))); const t = setInterval(() => load().catch(() => {}), 15000); return () => clearInterval(t); }, []);

  const handle = async (id: string) => { await post(`/api/admin/emergencies/${id}/handle`); load(); };
  const refund = (id: string) => {
    setModal({
      title: tx('Issue Patient Refund'),
      description: tx('Record the statutory reason for refunding this consultation payment.'),
      tone: 'danger',
      inputLabel: tx('Refund Reason *'),
      inputPlaceholder: tx('e.g. Practitioner unavailable within 10-minute SLA'),
      confirmLabel: tx('Confirm Refund'),
      onConfirm: async (reason) => {
        const d = await post(`/api/payments/${id}/refund`, { reason });
        setMsg(d.status === 'success' ? 'Refunded.' : d.message || tx('Refund failed.'));
        load();
      },
    });
  };

  const addPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await post('/api/admin/pharmacies', newPharm);
    if (d.status === 'success') { setIssued(d.data); setNewPharm(blankPharm); load(); } else setMsg(d.message || tx('Could not add the pharmacy.'));
  };
  const toggleService = (list: string[], s: string) => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]);
  const startEdit = (p: any) => { setEditing(p.id); setDraft({ name: p.name, address: p.address, city: p.city ?? '', phone: p.phone ?? '', hours: p.hours ?? '', services: p.services ?? [] }); };
  const saveEdit = async (id: string) => {
    const d = await fetch(`/api/admin/pharmacies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }).then(r => r.json());
    if (d.status === 'success') { setEditing(null); load(); } else setMsg(d.message || tx('Could not save.'));
  };
  const togglePharmacy = async (id: string, active: boolean) => { await post(`/api/admin/pharmacies/${id}/active`, { active }); load(); };
  const createLogin = async (p: any) => {
    const d = await post(`/api/admin/pharmacies/${p.id}/account`, loginDraft);
    if (d.status === 'success') { setLoginIssued({ pharmacy: p.name, ...d.data }); setLoginFor(null); setLoginDraft({ name: '', email: '' }); load(); }
    else setMsg(d.message || tx('Could not create the login.'));
  };
  const resetLogin = async (p: any) => {
    if (!window.confirm(`Reset the password for ${p.name}? They will be signed out.`)) return;
    const d = await post(`/api/admin/pharmacies/${p.id}/account/reset`);
    if (d.status === 'success') setLoginIssued({ pharmacy: p.name, ...d.data }); else setMsg(d.message || tx('Could not reset the password.'));
    load();
  };
  const verifyPharmacy = async (p: any) => {
    const d = await post(`/api/admin/pharmacies/${p.id}/verification`, verifyDraft);
    if (d.status === 'success') { setVerifyFor(null); setVerifyDraft(blankVerify); load(); } else setMsg(d.message || tx('Could not record the verification.'));
  };
  const minutes = (m: number | null | undefined) => (m == null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`);

  const gaps = coverage ? coverage.grid.flat().filter((n: number) => n === 0).length : 0;
  const openSos = emergencies.filter(e => e.status === 'open');

  return (
    <div className="space-y-6 text-slate-800">
      {!hideHeaderTabs && (
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
          {OPS_SUBS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={sub === t.id}
              onClick={() => { setSub(t.id); setMsg(''); }}
              className={`px-3 py-2.5 text-xs font-bold cursor-pointer rounded-none ${
                sub === t.id ? 'border-b-2 border-[color:var(--t-600)] text-[color:var(--t-700)]' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.id === 'roster' && openSos.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-2xs bg-rose-100 text-rose-700 font-mono font-bold rounded-none">{openSos.length}</span>
              )}
              {t.id === 'pharmacies' && pharmacies.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-2xs bg-slate-100 text-slate-700 font-mono font-bold rounded-none">{pharmacies.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {msg && <p className="text-xs font-bold bg-slate-50 border border-slate-200 p-3 rounded-none">{msg}</p>}

      {sub === 'roster' && (
        <>
          <section className={`border p-5 space-y-3 rounded-none ${openSos.length ? 'bg-rose-50 border-rose-300' : 'bg-white border-[color:var(--t-200)]'}`}>
            <h3 className="text-sm font-extrabold flex items-center gap-2"><Siren className="h-4 w-4 text-rose-600" /> SOS alerts ({openSos.length} open)</h3>
            {emergencies.length === 0 ? <p className="text-xs text-slate-500">{tx('No SOS alerts.')}</p> : (
              <ul className="space-y-2 text-xs">
                {emergencies.slice(0, 20).map(e => (
                  <li key={e.id} className="bg-white border border-slate-200 p-3 flex flex-wrap justify-between gap-2 rounded-none">
                    <span>
                      <b>{e.userName}</b> ({e.userEmail}) · {new Date(e.ts).toLocaleString()}
                      {e.lat != null && <> · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=15/${e.lat}/${e.lng}`}>location</a></>}
                      {e.note && <> · “{e.note}”</>}
                    </span>
                    {e.status === 'open' ? <button onClick={() => handle(e.id)} className="font-bold text-rose-700 cursor-pointer">{tx('Mark handled')}</button> : <span className="text-slate-400">handled</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3 rounded-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold">{tx('24/7 roster coverage')}</h3>
              {coverage && <p className="text-xs font-bold">{coverage.onlineNow} doctor(s) online now · {coverage.queued} waiting · {coverage.active} in consultation · <span className={gaps ? 'text-rose-700' : 'text-emerald-700'}>{gaps} uncovered hour(s) per week</span></p>}
            </div>
            {coverage && (
              <div className="overflow-x-auto">
                <table className="text-xs border-separate border-spacing-0.5">
                  <thead><tr><th />{Array.from({ length: 24 }, (_, h) => <th key={h} className="font-semibold text-slate-500 w-6">{h}</th>)}</tr></thead>
                  <tbody>
                    {coverage.grid.map((row: number[], d: number) => (
                      <tr key={d}>
                        <th className="pr-2 text-right font-bold text-slate-600">{DAYS[d]}</th>
                        {row.map((n, h) => (
                          <td key={h} title={`${DAYS[d]} ${h}:00 — ${n} doctor(s)`}
                            className={`w-6 h-6 text-center font-bold ${n === 0 ? 'bg-rose-100 text-rose-700' : n === 1 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{n}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-500 mt-2">Red = nobody rostered, amber = a single doctor, green = two or more.</p>
              </div>
            )}
          </section>

          {/* 30-Day Locum Shift Fill Rates & Urgent Care Roster Telemetry */}
          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-4 rounded-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[color:var(--t-600)] text-white rounded-none">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{tx('30-Day Shift Fill Rate & Locum Telemetry')}</h3>
                    <span className="text-2xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5">{tx('Live SQLite · 30-Day')}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{tx('Live tracking of posted clinical shifts and locum applications from SQLite.')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase block tracking-wider">{tx('Current Fill Rate')}</span>
                  <span className="text-lg font-black text-emerald-700 font-mono tabular-nums">
                    {telemetry ? `${telemetry.shifts.fillRatePct}% ${tx('Filled')}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick KPI cohort indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Total Posted Shifts')}</span>
                <span className="text-base font-black text-slate-900 font-mono tabular-nums">{telemetry ? telemetry.shifts.totalJobs : '—'}</span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('Active + filled shifts')}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Filled Shifts')}</span>
                <span className="text-base font-black text-emerald-700 font-mono tabular-nums">{telemetry ? telemetry.shifts.filledJobs : '—'}</span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('Accepted or completed')}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('30-Day Applications')}</span>
                <span className="text-base font-black text-slate-900 font-mono tabular-nums">{telemetry ? telemetry.shifts.totalApplications : '—'}</span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('Submitted in window')}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Accepted Applications')}</span>
                <span className="text-base font-black text-emerald-700 font-mono tabular-nums">{telemetry ? telemetry.shifts.acceptedApplications : '—'}</span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('30-day approved')}</span>
              </div>
            </div>

            {/* Interactive 30-Day Applications Chart */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">{tx('Daily Locum Applications (30 Days)')}</span>
                {hoveredShiftDay && telemetry?.shifts.daily[hoveredShiftDay - 1] ? (
                  <span className="font-mono text-2xs font-bold text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 tabular-nums">
                    {telemetry.shifts.daily[hoveredShiftDay - 1].date}: {telemetry.shifts.daily[hoveredShiftDay - 1].applications} applications · {telemetry.shifts.daily[hoveredShiftDay - 1].accepted} accepted
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">{tx('Hover over bars to inspect daily application counts')}</span>
                )}
              </div>

              <div className="h-28 flex items-end gap-1.5 pt-4 pb-1 px-1 bg-slate-50 border border-slate-200 overflow-x-auto">
                {(telemetry?.shifts.daily || []).map((item) => {
                  const isHovered = hoveredShiftDay === item.day;
                  const maxApps = Math.max(1, ...(telemetry?.shifts.daily.map(d => d.applications) || [1]));
                  const heightPct = item.applications === 0 ? 4 : Math.max(12, Math.round((item.applications / maxApps) * 100));
                  return (
                    <div
                      key={item.day}
                      onMouseEnter={() => setHoveredShiftDay(item.day)}
                      onMouseLeave={() => setHoveredShiftDay(null)}
                      className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full cursor-pointer group"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full transition-all rounded-none ${
                          isHovered
                            ? 'bg-[color:var(--t-600)]'
                            : item.applications === 0
                            ? 'bg-slate-200'
                            : item.accepted > 0
                            ? 'bg-emerald-600 hover:bg-emerald-500'
                            : 'bg-emerald-400 hover:bg-emerald-500'
                        }`}
                        title={`${item.date}: ${item.applications} applications (${item.accepted} accepted)`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-600 px-1">
                <span>{tx('30 Days Ago')}</span>
                <span>{tx('15 Days Ago')}</span>
                <span>{tx('Today')}</span>
              </div>
            </div>
          </section>
        </>
      )}

      {sub === 'settlements' && (
        <>
          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3 rounded-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold">{tx('Payments')}</h3>
              {payments && <p className="text-xs font-bold">Mode: {payments.mode ?? 'not configured'} · Gross {formatMoney(payments.totals.gross)} · Platform fee {formatMoney(payments.totals.platformFee)} · SST collected {formatMoney(payments.totals.serviceTaxCollected ?? 0)}</p>}
            </div>
            {payments?.mode === 'sandbox' && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 font-semibold p-2 rounded-none">{tx('Test mode: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to take real payments.')}</p>}
            {payments && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2 pr-3">{tx('When')}</th><th className="pr-3">{tx('Patient')}</th><th className="pr-3">{tx('For')}</th><th className="pr-3">{tx('Amount')}</th><th className="pr-3">{tx('Status')}</th><th /></tr></thead>
                  <tbody>
                    {payments.rows.slice(0, 50).map((p: any) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{new Date(p.created_at).toLocaleString()}</td>
                        <td className="pr-3">{p.patientName}</td>
                        <td className="pr-3">{p.description}</td>
                        <td className="pr-3 tabular-nums">{formatMoney(p.amount_sen, { fromMinor: true })}</td>
                        <td className="pr-3 font-bold">{p.status}{p.provider === 'sandbox' ? ' (test)' : ''}</td>
                        <td>{p.status === 'paid' && <button onClick={() => refund(p.id)} className="font-bold text-rose-700 cursor-pointer">{tx('Refund')}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 30-Day Rolling Escrow & Settlement Volume Telemetry */}
          <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-4 rounded-none">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-700 text-white rounded-none">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{tx('30-Day Rolling Escrow & Settlement Telemetry')}</h3>
                    <span className="text-2xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5">{tx('Live SQLite · 30-Day')}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{tx('Live SQLite ledger reconciliation of paid escrow settlements, facilitator fees, and statutory tax.')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 uppercase block tracking-wider">{tx('30-Day Gross Volume')}</span>
                  <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                    {telemetry ? formatMoney(telemetry.settlements.grossSen, { fromMinor: true }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial telemetry stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Gross Paid GMV')}</span>
                <span className="text-base font-black text-slate-900 font-mono tabular-nums">
                  {telemetry ? formatMoney(telemetry.settlements.grossSen, { fromMinor: true }) : '—'}
                </span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5 tabular-nums">
                  {telemetry ? `${telemetry.settlements.paidCount} ${tx('paid transactions')}` : '—'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Platform Commission')}</span>
                <span className="text-base font-black text-[color:var(--t-700)] font-mono tabular-nums">
                  {telemetry ? formatMoney(telemetry.settlements.platformFeeSen, { fromMinor: true }) : '—'}
                </span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('Realized fee ledger')}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Statutory Tax Collected')}</span>
                <span className="text-base font-black text-slate-800 font-mono tabular-nums">
                  {telemetry ? formatMoney(telemetry.settlements.taxSen, { fromMinor: true }) : '—'}
                </span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('SST ledger total')}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-xs uppercase font-bold text-slate-500 block">{tx('Refunded Settlements')}</span>
                <span className="text-base font-black text-slate-900 font-mono tabular-nums">
                  {telemetry ? telemetry.settlements.refundedCount : '—'}
                </span>
                <span className="text-xs text-slate-600 font-medium block mt-0.5">{tx('30-day window')}</span>
              </div>
            </div>

            {/* Interactive 30-Day Volume Chart */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">{tx('Daily Settlement Volume (30 Days)')}</span>
                {hoveredSettlementDay && telemetry?.settlements.daily[hoveredSettlementDay - 1] ? (
                  <span className="font-mono text-2xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 tabular-nums">
                    {telemetry.settlements.daily[hoveredSettlementDay - 1].date}: {formatMoney(telemetry.settlements.daily[hoveredSettlementDay - 1].grossSen, { fromMinor: true })} Gross · {formatMoney(telemetry.settlements.daily[hoveredSettlementDay - 1].feeSen, { fromMinor: true })} Fee ({telemetry.settlements.daily[hoveredSettlementDay - 1].count} txs)
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">{tx('Hover over bars to inspect daily gross settlement amounts')}</span>
                )}
              </div>

              <div className="h-28 flex items-end gap-1.5 pt-4 pb-1 px-1 bg-slate-50 border border-slate-200 overflow-x-auto">
                {(telemetry?.settlements.daily || []).map((item) => {
                  const isHovered = hoveredSettlementDay === item.day;
                  const maxVol = Math.max(1, ...(telemetry?.settlements.daily.map(d => d.grossSen) || [1]));
                  const heightPct = item.grossSen === 0 ? 4 : Math.max(12, Math.round((item.grossSen / maxVol) * 100));
                  return (
                    <div
                      key={item.day}
                      onMouseEnter={() => setHoveredSettlementDay(item.day)}
                      onMouseLeave={() => setHoveredSettlementDay(null)}
                      className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full cursor-pointer group"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full transition-all rounded-none ${
                          isHovered
                            ? 'bg-[color:var(--t-700)]'
                            : item.grossSen === 0
                            ? 'bg-slate-200'
                            : 'bg-emerald-700 hover:bg-emerald-600'
                        }`}
                        title={`${item.date}: ${formatMoney(item.grossSen, { fromMinor: true })}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-600 px-1">
                <span>{tx('30 Days Ago')}</span>
                <span>{tx('15 Days Ago')}</span>
                <span>{tx('Today')}</span>
              </div>
            </div>
          </section>

          <AdminPayouts />
        </>
      )}

      {sub === 'email' && (
        <AdminEmail />
      )}

      {sub === 'pharmacies' && (
        <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3 rounded-none">
          <h3 className="text-sm font-extrabold">{tx('Partner pharmacies')}</h3>
          <p className="text-xs text-slate-600">{tx('Patients can send prescriptions to these pharmacies. Verify each pharmacy\'s licence and pharmacist against the official registers, then give it a workspace login (email and password) for its own inbox, status updates, activity and reports. The owner login adds its own staff. The ID and PIN still work at /pharmacy for quick counter lookups.')}</p>
          <form onSubmit={addPharmacy} className="space-y-2">
            <div className="flex flex-wrap gap-2 items-end">
              <input className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[10rem] rounded-none" placeholder={tx('Name')} value={newPharm.name} onChange={e => setNewPharm({ ...newPharm, name: e.target.value })} required />
              <input className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[12rem] rounded-none" placeholder={tx('Address')} value={newPharm.address} onChange={e => setNewPharm({ ...newPharm, address: e.target.value })} required />
              <input className="border border-slate-200 px-3 py-2 text-xs w-36 rounded-none" placeholder={tx('City')} value={newPharm.city} onChange={e => setNewPharm({ ...newPharm, city: e.target.value })} maxLength={60} />
              <input className="border border-slate-200 px-3 py-2 text-xs w-36 rounded-none" placeholder={tx('Phone')} value={newPharm.phone} onChange={e => setNewPharm({ ...newPharm, phone: e.target.value })} />
              <input className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[12rem] rounded-none" placeholder={tx('Opening hours, e.g. Mon–Sat 9am–10pm')} value={newPharm.hours} onChange={e => setNewPharm({ ...newPharm, hours: e.target.value })} maxLength={120} />
            </div>
            <fieldset className="flex flex-wrap gap-x-4 gap-y-1 items-center">
              <legend className="sr-only">{tx('Services')}</legend>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{tx('Services')}</span>
              {SERVICES.map(s => (
                <label key={s} className="text-xs inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={newPharm.services.includes(s)} onChange={() => setNewPharm({ ...newPharm, services: toggleService(newPharm.services, s) })} /> {s}</label>
              ))}
              <button className="ml-auto bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer rounded-none border border-[color:var(--t-700)] shadow-xs">{tx('Add pharmacy')}</button>
            </fieldset>
          </form>
          {issued && <p role="status" className="text-xs bg-amber-50 border border-amber-300 p-3 font-semibold rounded-none">Give the pharmacy these sign-in details now; the PIN is not shown again. ID: <span className="font-mono font-bold">{issued.id}</span> {tx('· PIN:')} <span className="font-mono font-bold">{issued.pin}</span> <button className="underline ml-2 cursor-pointer" onClick={() => setIssued(null)}>{tx('Done')}</button></p>}
          {loginIssued && <p role="status" className="text-xs bg-amber-50 border border-amber-300 p-3 font-semibold [overflow-wrap:anywhere] rounded-none">Workspace login for {loginIssued.pharmacy}. Share it now; the password is not shown again. Email: <span className="font-mono font-bold">{loginIssued.email}</span> {tx('· Temporary password:')} <span className="font-mono font-bold">{loginIssued.password}</span> <button className="underline ml-2 cursor-pointer" onClick={() => setLoginIssued(null)}>{tx('Done')}</button></p>}
          <ul className="text-xs divide-y divide-slate-100">
            {pharmacies.map(p => (
              <li key={p.id} className="py-2 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="min-w-0 [overflow-wrap:anywhere]"><b>{p.name}</b> · {p.address}{p.city && !p.address.toLowerCase().includes(p.city.toLowerCase()) ? `, ${p.city}` : ''} · <span className="font-mono">{p.id}</span>{p.hours ? <span className="text-slate-500"> · {p.hours}</span> : null}{p.services?.length ? <span className="text-slate-500"> · {p.services.join(', ')}</span> : null}</span>
                  <span className="flex gap-3">
                    <button onClick={() => (editing === p.id ? setEditing(null) : startEdit(p))} className="font-bold cursor-pointer">{editing === p.id ? tx('Cancel') : tx('Edit')}</button>
                    <button onClick={() => togglePharmacy(p.id, !p.active)} className="font-bold cursor-pointer">{p.active ? tx('Deactivate') : tx('Activate')}</button>
                  </span>
                </div>
                {summary[p.id] && (
                  <div className="text-slate-600 space-y-2">
                    {summary[p.id].verification ? (
                      <p className="[overflow-wrap:anywhere]">{tx('Verified by the board · licence')} <b>{summary[p.id].verification.licenceNumber}</b> {tx('· pharmacist')} <b>{summary[p.id].verification.pharmacistName}</b> ({summary[p.id].verification.pharmacistRegNo}) · {new Date(summary[p.id].verification.verifiedAt).toLocaleDateString()}
                        {summary[p.id].verification.licenceExpiry ? <> {tx('· licence expires')} <b>{summary[p.id].verification.licenceExpiry}</b>{tx(', pharmacist certificate')} <b>{summary[p.id].verification.pharmacistApcExpiry ?? 'not recorded'}</b></> : <> · <b className="text-amber-700">{tx('no expiry dates on file')}</b></>}
                        {summary[p.id].verification.problem && <b className="text-rose-700"> · {summary[p.id].verification.problem} The pharmacy is suspended and hidden from patients.</b>}
                        {' '}<button onClick={() => { setVerifyFor(p.id); setVerifyDraft({ ...blankVerify, licenceNumber: summary[p.id].verification.licenceNumber ?? '', pharmacistName: summary[p.id].verification.pharmacistName ?? '', pharmacistRegNo: summary[p.id].verification.pharmacistRegNo ?? '' }); }} className="font-bold underline cursor-pointer">{tx('Renew / update')}</button></p>
                    ) : null}
                    {verifyFor === p.id ? (
                      <form onSubmit={e => { e.preventDefault(); verifyPharmacy(p); }} className="bg-slate-50 border border-slate-200 p-3 space-y-2 rounded-none">
                        <div className="flex flex-wrap gap-2">
                          <input aria-label={tx('Pharmacy licence number')} placeholder={tx('Pharmacy licence number')} required className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem] rounded-none" value={verifyDraft.licenceNumber} onChange={e => setVerifyDraft({ ...verifyDraft, licenceNumber: e.target.value })} />
                          <input aria-label={tx('Pharmacist name')} placeholder={tx('Pharmacist name')} required className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem] rounded-none" value={verifyDraft.pharmacistName} onChange={e => setVerifyDraft({ ...verifyDraft, pharmacistName: e.target.value })} />
                          <input aria-label={tx('Pharmacist registration number')} placeholder={tx('Pharmacist registration no.')} required className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem] rounded-none" value={verifyDraft.pharmacistRegNo} onChange={e => setVerifyDraft({ ...verifyDraft, pharmacistRegNo: e.target.value })} />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center text-xs">
                          <label className="flex items-center gap-1.5">{tx('Licence expires')} <input type="date" required className="border border-slate-200 bg-white px-2 py-1.5 rounded-none" value={verifyDraft.licenceExpiry} onChange={e => setVerifyDraft({ ...verifyDraft, licenceExpiry: e.target.value })} /></label>
                          <label className="flex items-center gap-1.5">{tx('Pharmacist retention certificate expires')} <input type="date" required className="border border-slate-200 bg-white px-2 py-1.5 rounded-none" value={verifyDraft.pharmacistApcExpiry} onChange={e => setVerifyDraft({ ...verifyDraft, pharmacistApcExpiry: e.target.value })} /></label>
                        </div>
                        <input aria-label={tx('How it was checked')} placeholder={tx('How you checked it (register URL, who confirmed, reference)')} required className="border border-slate-200 bg-white px-3 py-2 text-xs w-full rounded-none" value={verifyDraft.registryReference} onChange={e => setVerifyDraft({ ...verifyDraft, registryReference: e.target.value })} />
                        <label className="text-xs inline-flex items-start gap-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={verifyDraft.confirmed} onChange={e => setVerifyDraft({ ...verifyDraft, confirmed: e.target.checked })} /> {tx('I checked these details against the official pharmacy and pharmacist registers.')}</label>
                        <div className="flex gap-3 items-center">
                          <button disabled={!verifyDraft.confirmed} className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] disabled:bg-slate-300 text-white text-xs font-extrabold px-4 py-2 cursor-pointer rounded-none border border-[color:var(--t-700)] shadow-xs">{tx('Record verification')}</button>
                          <button type="button" onClick={() => setVerifyFor(null)} className="font-bold cursor-pointer">{tx('Cancel')}</button>
                        </div>
                      </form>
                    ) : !summary[p.id].verification ? (
                      <p>{tx('Not verified yet.')} <button onClick={() => { setVerifyFor(p.id); setVerifyDraft(blankVerify); }} className="font-bold underline cursor-pointer">{tx('Verify pharmacy')}</button></p>
                    ) : null}
                  </div>
                )}
                {(() => {
                  const s = summary[p.id];
                  if (!s) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                      {s.account ? (
                        <>
                          <span className="[overflow-wrap:anywhere]">{tx('Login:')} <b>{s.account.email}</b>{s.account.mustChangePassword ? <span className="text-amber-700"> {tx('(temporary password not yet changed)')}</span> : null}</span>
                          <span>{tx('Staff logins:')} <b>{s.staffCount}</b> {tx('· Two-factor:')} <b>{s.account.twoFactor ? 'on' : 'off'}</b></span>
                          <span>{tx('New:')} <b>{s.inbox}</b> {tx('· In progress:')} <b>{s.inProgress}</b> {tx('· Dispensed:')} <b>{s.dispensed}</b></span>
                          <span>{tx('Avg response (30d):')} <b>{minutes(s.avgResponseMinutes)}</b></span>
                          <span>{tx('Last activity:')} <b>{s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'none yet'}</b></span>
                          <button onClick={() => resetLogin(p)} className="font-bold underline cursor-pointer">{tx('Reset password and two-factor')}</button>
                        </>
                      ) : loginFor === p.id ? (
                        <form onSubmit={e => { e.preventDefault(); createLogin(p); }} className="flex flex-wrap gap-2 items-center w-full">
                          <input aria-label={tx('Contact name')} placeholder={tx('Contact name')} className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[9rem] rounded-none" value={loginDraft.name} onChange={e => setLoginDraft({ ...loginDraft, name: e.target.value })} />
                          <input aria-label={tx('Login email')} type="email" required placeholder={tx('Login email')} className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[12rem] rounded-none" value={loginDraft.email} onChange={e => setLoginDraft({ ...loginDraft, email: e.target.value })} />
                          <button className="bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer rounded-none border border-[color:var(--t-700)] shadow-xs">{tx('Create login')}</button>
                          <button type="button" onClick={() => setLoginFor(null)} className="font-bold cursor-pointer">{tx('Cancel')}</button>
                        </form>
                      ) : (
                        <>
                          <span>{tx('No workspace login yet.')}</span>
                          {s.verification
                            ? <button onClick={() => { setLoginFor(p.id); setLoginDraft({ name: p.name, email: '' }); }} className="font-bold underline cursor-pointer">{tx('Create login')}</button>
                            : <span className="text-amber-700">{tx('Verify the pharmacy first.')}</span>}
                        </>
                      )}
                    </div>
                  );
                })()}
                {editing === p.id && (
                  <div className="bg-slate-50 border border-slate-200 p-3 space-y-2 rounded-none">
                    <div className="flex flex-wrap gap-2">
                      <input aria-label={tx('Name')} className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem] rounded-none" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                      <input aria-label={tx('Address')} className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[12rem] rounded-none" value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} />
                      <input aria-label={tx('City')} placeholder={tx('City')} className="border border-slate-200 bg-white px-3 py-2 text-xs w-36 rounded-none" value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} />
                      <input aria-label={tx('Phone')} placeholder={tx('Phone')} className="border border-slate-200 bg-white px-3 py-2 text-xs w-36 rounded-none" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
                      <input aria-label={tx('Opening hours')} placeholder={tx('Opening hours')} className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[12rem] rounded-none" value={draft.hours} onChange={e => setDraft({ ...draft, hours: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                      {SERVICES.map(s => (
                        <label key={s} className="text-xs inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={draft.services.includes(s)} onChange={() => setDraft({ ...draft, services: toggleService(draft.services, s) })} /> {s}</label>
                      ))}
                      <button onClick={() => saveEdit(p.id)} className="ml-auto bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer rounded-none border border-[color:var(--t-700)] shadow-xs">{tx('Save')}</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <AdminActionModal config={modal} onClose={() => setModal(null)} />
    </div>
  );
}
