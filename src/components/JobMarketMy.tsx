import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Building2, CalendarClock, Globe2, Search, X, CheckCircle2, MapPin, Clock, Send } from 'lucide-react';
import { MY_STATES } from '../identity';
import { formatMoney, formatDate, useTr } from '../locale';
import { FilterSelect } from './DashboardHeader';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const input = 'border border-[color:var(--t-200)] h-11 px-3 text-xs font-semibold bg-[color:var(--t-bg)] text-[color:var(--ink)] outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors';
const label = 'block text-2xs font-black uppercase tracking-wider text-slate-500 mb-1.5';

export const SECTOR_LABEL: Record<string, string> = { public: 'Public sector', private: 'Private sector', other: 'Other sector' };

// ───────── posting form: Malaysia-specific fields ─────────
export interface JobExtras {
  sector: string; state: string; roleRequired: string; facilityId: string;
  salaryMin: string; salaryMax: string; salaryPeriod: string;
  shifts: { date: string; start: string; end: string }[];
  acceptsForeign: boolean; visaSupport: boolean; foreignNotes: string;
}
export const blankExtras: JobExtras = {
  sector: 'private', state: 'W.P. Kuala Lumpur', roleRequired: 'any', facilityId: '', salaryMin: '', salaryMax: '', salaryPeriod: 'month',
  shifts: [], acceptsForeign: false, visaSupport: false, foreignNotes: '',
};
export const extrasPayload = (e: JobExtras) => ({
  ...e, facilityId: e.facilityId || undefined,
  salaryMin: e.salaryMin === '' ? undefined : Number(e.salaryMin), salaryMax: e.salaryMax === '' ? undefined : Number(e.salaryMax),
});

export function JobFormFields({ value, onChange, jobType }: { value: JobExtras; onChange: (v: JobExtras) => void; jobType: string }) {
  const tx = useTr();
  const [employers, setEmployers] = useState<any[]>([]);
  useEffect(() => { jget('/api/jobs/employers').then(d => d.status === 'success' && setEmployers(d.data)).catch(() => {}); }, []);
  const set = (p: Partial<JobExtras>) => onChange({ ...value, ...p });
  const emp = employers.find(e => e.id === value.facilityId);
  return (
    <div className="space-y-4 border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={label}>{tx('Sector')}</label>
          <select className={`${input} w-full`} value={value.sector} onChange={e => set({ sector: e.target.value })}>
            <option value="private">{tx('Private')}</option><option value="public">{tx('Public (government)')}</option><option value="other">{tx('Other')}</option>
          </select>
        </div>
        <div>
          <label className={label}>{tx('State')}</label>
          <select className={`${input} w-full`} value={value.state} onChange={e => set({ state: e.target.value })}>{MY_STATES.map(s => <option key={s} value={s}>{tx(s)}</option>)}</select>
        </div>
        <div>
          <label className={label}>{tx('Who can apply')}</label>
          <select className={`${input} w-full`} value={value.roleRequired} onChange={e => set({ roleRequired: e.target.value })}>
            <option value="any">{tx('Doctors and nurses')}</option><option value="doctor">{tx('Doctors only')}</option><option value="nurse">{tx('Nurses only')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>{tx('Employer (licensed facility register)')}</label>
        <select className={`${input} w-full`} value={value.facilityId} onChange={e => set({ facilityId: e.target.value })}>
          <option value="">{value.sector === 'private' ? tx('Choose a facility…') : tx('Not in the register (shown as unchecked)')}</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.name} · {e.licenceOk ? tx('licence checked') : tx('licence NOT checked')}</option>)}
        </select>
        {value.sector === 'private' && employers.length === 0 && <p className="text-xs text-amber-800 mt-1">{tx('Private-sector posts need a licensed facility you are assigned to. Ask an admin to add the facility and assign you (Medical tourism > Facilities).')}</p>}
        {emp && !emp.licenceOk && <p className="text-xs text-rose-700 mt-1">{tx('This facility\'s licence has not been checked or has expired, so it cannot advertise yet.')}</p>}
      </div>

      <div>
        <label className={label}>{tx('Pay (Malaysian ringgit)')}</label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>{tx('RM')}</span><input className={`${input} w-28`} type="number" min={0} step="0.01" placeholder={tx('Min')} aria-label={tx('Minimum pay')} value={value.salaryMin} onChange={e => set({ salaryMin: e.target.value })} />
          <span>to</span><input className={`${input} w-28`} type="number" min={0} step="0.01" placeholder={tx('Max')} aria-label={tx('Maximum pay')} value={value.salaryMax} onChange={e => set({ salaryMax: e.target.value })} />
          <select className={input} aria-label={tx('Pay period')} value={value.salaryPeriod} onChange={e => set({ salaryPeriod: e.target.value })}>
            <option value="month">{tx('per month')}</option><option value="day">{tx('per day')}</option><option value="hour">{tx('per hour')}</option><option value="shift">{tx('per shift')}</option>
          </select>
        </div>
      </div>

      {(jobType === 'Locum' || jobType === 'Shift-based') && (
        <div>
          <label className={label}>Shifts {jobType === 'Locum' ? '(at least one)' : '(optional)'}</label>
          <div className="space-y-2">
            {value.shifts.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <input type="date" className={input} aria-label={tx('Shift date')} value={s.date} onChange={e => set({ shifts: value.shifts.map((x, k) => (k === i ? { ...x, date: e.target.value } : x)) })} />
                <input type="time" className={input} aria-label={tx('Start')} value={s.start} onChange={e => set({ shifts: value.shifts.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)) })} />
                <span>to</span>
                <input type="time" className={input} aria-label={tx('End')} value={s.end} onChange={e => set({ shifts: value.shifts.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)) })} />
                <button type="button" className="text-rose-700 font-bold cursor-pointer" onClick={() => set({ shifts: value.shifts.filter((_, k) => k !== i) })}>remove</button>
              </div>
            ))}
            <button type="button" className="text-xs font-bold underline cursor-pointer" onClick={() => set({ shifts: [...value.shifts, { date: '', start: '08:00', end: '20:00' }] })}>{tx('Add a shift')}</button>
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs">
        <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={value.acceptsForeign} onChange={e => set({ acceptsForeign: e.target.checked })} /><span>{tx('We also consider practitioners registered outside Malaysia. (Their Malaysian registration and work permit are the employer\'s responsibility: see the Eligibility tab.)')}</span></label>
        {value.acceptsForeign && (
          <>
            <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={value.visaSupport} onChange={e => set({ visaSupport: e.target.checked })} /><span>{tx('We help with MMC/LJM registration and the work permit.')}</span></label>
            <textarea className="border border-[color:var(--t-200)] p-3 text-xs font-semibold bg-white w-full outline-none focus:border-[color:var(--t-600)]" rows={2} maxLength={500} placeholder={tx('Notes for foreign applicants (what you can sponsor, timelines)')} value={value.foreignNotes} onChange={e => set({ foreignNotes: e.target.value })} />
          </>
        )}
      </div>
    </div>
  );
}

// ───────── filters ─────────
export interface JobFilter { state: string; sector: string; role: string; foreign: boolean }
export const blankFilter: JobFilter = { state: 'all', sector: 'all', role: 'all', foreign: false };
export const matchesFilter = (j: any, f: JobFilter) =>
  (f.state === 'all' || j.state === f.state) && (f.sector === 'all' || j.sector === f.sector) &&
  (f.role === 'all' || !j.roleRequired || j.roleRequired === 'any' || j.roleRequired === f.role) && (!f.foreign || !!j.acceptsForeign);

export function JobFilters({ value, onChange }: { value: JobFilter; onChange: (v: JobFilter) => void }) {
  const tx = useTr();
  return (
    <section aria-label={tx('Malaysian filters')} className="bg-white border border-[color:var(--t-200)] shadow-xs p-4 flex flex-wrap gap-3 items-center text-xs">
      <FilterSelect label={tx('State')} value={value.state} onChange={v => onChange({ ...value, state: v })}><option value="all">{tx('All states')}</option>{MY_STATES.map(s => <option key={s} value={s}>{tx(s)}</option>)}</FilterSelect>
      <FilterSelect label={tx('Sector')} value={value.sector} onChange={v => onChange({ ...value, sector: v })}><option value="all">{tx('Public and private')}</option><option value="public">{tx('Public sector')}</option><option value="private">{tx('Private sector')}</option><option value="other">{tx('Other')}</option></FilterSelect>
      <FilterSelect label={tx('Role')} value={value.role} onChange={v => onChange({ ...value, role: v })}><option value="all">{tx('Doctors and nurses')}</option><option value="doctor">{tx('Doctors')}</option><option value="nurse">{tx('Nurses')}</option></FilterSelect>
      <label className="flex items-center gap-1.5 font-bold"><input type="checkbox" checked={value.foreign} onChange={e => onChange({ ...value, foreign: e.target.checked })} /> {tx('Considers practitioners registered abroad')}</label>
    </section>
  );
}

// ───────── badges and detail on a listing ─────────
export function JobBadges({ job }: { job: any }) {
  const tx = useTr();
  const emp = job.employer;
  return (
    <div className="flex flex-wrap gap-1.5 text-2xs font-black uppercase tracking-wider">
      {job.sector && <span className="px-2 py-0.5 border border-slate-300 bg-slate-50 text-slate-700">{tx(SECTOR_LABEL[job.sector] ?? job.sector)}</span>}
      {job.state && <span className="px-2 py-0.5 border border-slate-300 bg-slate-50 text-slate-700">{tx(job.state)}</span>}
      {emp?.licenceOk
        ? <span className="px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-900 inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{tx('Facility licence checked')}{emp.licenceExpiry ? ` · ${tx('to {date}', { date: emp.licenceExpiry })}` : ''}</span>
        : <span title={emp?.problem ?? ''} className="px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-900 inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3" />{tx('Employer licence not checked')}</span>}
      {job.shifts?.length > 0 && <span className="px-2 py-0.5 border border-sky-300 bg-sky-50 text-sky-900 inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{tx(job.shifts.length === 1 ? '{n} shift' : '{n} shifts', { n: job.shifts.length })}</span>}
      {job.acceptsForeign && <span className="px-2 py-0.5 border border-violet-300 bg-violet-50 text-violet-900 inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />{tx('Considers foreign-registered')}{job.visaSupport ? ` · ${tx('helps with permit')}` : ''}</span>}
    </div>
  );
}

export function JobDetailExtras({ job }: { job: any }) {
  const tx = useTr();
  return (
    <div className="space-y-3 text-xs">
      <JobBadges job={job} />
      {job.employer?.problem && <p className="text-amber-800 bg-amber-50 border border-amber-200 p-2">{job.employer.problem}</p>}
      {job.shifts?.length > 0 && (
        <div><p className="font-black uppercase tracking-wide text-slate-700 mb-1">{tx('Shifts')}</p>
          <ul className="space-y-0.5">{job.shifts.map((s: any, i: number) => <li key={i}>{formatDate(s.date)} · {s.start} to {s.end}</li>)}</ul></div>
      )}
      {job.acceptsForeign && (
        <div className="bg-violet-50 border border-violet-200 p-2 space-y-1">
          <p><b>{tx('Practitioners registered abroad:')}</b> {job.visaSupport ? tx('considered, and the employer says it helps with registration and the work permit.') : tx('considered, but the employer has not said it helps with registration or the permit.')}</p>
          {job.foreignNotes && <p>{job.foreignNotes}</p>}
          <p className="text-slate-500">{tx('Confirm registration and permit support in writing before you resign or travel.')}</p>
        </div>
      )}
      {job.applyBlockedReason && <p className="text-rose-800 bg-rose-50 border border-rose-200 p-2 font-semibold">{tx('You cannot apply yet: ')}{job.applyBlockedReason}</p>}
    </div>
  );
}

// ───────── eligibility information ─────────
export function EligibilityInfo() {
  const tx = useTr();
  const [info, setInfo] = useState<any>(null);
  useEffect(() => { jget('/api/jobs/info').then(d => d.status === 'success' && setInfo(d.data)).catch(() => {}); }, []);
  return (
    <div className="bg-white border border-[color:var(--t-200)] p-6 space-y-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--t-100)] pb-4">
        <div>
          <h3 className="text-base font-black text-[color:var(--ink)] uppercase tracking-wide">{tx('Malaysian Clinical Staffing & Registration Eligibility')}</h3>
          <p className="text-xs text-slate-600 mt-1">{tx('Statutory requirements for doctors (MMC) and nurses (LJM) applying to hospital shifts and locum posts.')}</p>
        </div>
        <span className="text-2xs font-black uppercase tracking-wider px-2.5 py-1 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
          MMC &amp; LJM Compliance
        </span>
      </div>
      {info?.draft && (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3 font-semibold">
          {tx('Draft from web research: not legal or immigration advice. Confirm with the Malaysian Medical Council, the Nursing Board and Immigration.')}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {info?.sections.map((s: any) => (
          <section key={s.heading} className="p-4 border border-[color:var(--t-200)] bg-[color:var(--t-bg)] space-y-1.5">
            <h4 className="text-sm font-black uppercase tracking-wider text-[color:var(--t-700)]">{s.heading}</h4>
            <p className="text-xs text-slate-700 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

// ───────── locum profiles and directory ─────────
export function LocumBoard({ role, jobs }: { role: string; jobs: any[] }) {
  const tx = useTr();
  const [mine, setMine] = useState<any>(null);
  const [apc, setApc] = useState<any>(null);
  const [form, setForm] = useState({ states: [] as string[], specialties: '', minRate: '', ratePeriod: 'hour', availableFrom: '', availableTo: '', note: '', visible: true });
  const [list, setList] = useState<any[] | null>(null);
  const [f, setF] = useState({ state: '', role: '', specialty: '', maxRate: '', date: '' });
  const [msg, setMsg] = useState('');
  const [inviting, setInviting] = useState<string | null>(null);
  const [inv, setInv] = useState({ message: '', jobId: '' });

  const loadMine = useCallback(async () => {
    if (role !== 'practitioner') return;
    const d = await jget('/api/locum/me').catch(() => null);
    if (d?.status !== 'success') return;
    setApc(d.apc);
    if (d.data) { setMine(d.data); setForm({ states: d.data.states, specialties: d.data.specialties.join(', '), minRate: d.data.minRate ?? '', ratePeriod: d.data.ratePeriod ?? 'hour', availableFrom: d.data.availableFrom ?? '', availableTo: d.data.availableTo ?? '', note: d.data.note ?? '', visible: d.data.visible }); }
  }, [role]);
  const loadList = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
    const d = await jget(`/api/locums?${qs}`).catch(() => null);
    setList(d?.status === 'success' ? d.data : null);
  }, [f]);
  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { loadList(); }, [loadList]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await jsend('PUT', '/api/locum/me', { ...form, minRate: form.minRate === '' ? undefined : Number(form.minRate), specialties: form.specialties.split(',').map(x => x.trim()).filter(Boolean) });
    setMsg(d.status === 'success' ? tx('Saved. Employers can find you when your annual practising certificate is valid.') : d.message);
    if (d.status === 'success') loadMine();
  };
  const sendInvite = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const d = await jsend('POST', `/api/locums/${id}/invite`, { message: inv.message, jobId: inv.jobId || undefined });
    setMsg(d.status === 'success' ? d.message : d.message);
    if (d.status === 'success') { setInviting(null); setInv({ message: '', jobId: '' }); }
  };

  const apcValid = Boolean(apc?.validUntil && apc.validUntil >= new Date().toISOString().slice(0, 10));
  const hasLocumFilters = Boolean(f.state || f.role || f.specialty.trim() || f.maxRate || f.date);

  return (
    <div className="space-y-5 text-xs">
      {msg && (
        <div className="font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between gap-2" role="status">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />{msg}</span>
          <button type="button" onClick={() => setMsg('')} className="text-slate-500 hover:text-slate-800 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {role === 'practitioner' && (
        <form onSubmit={save} className="bg-white border border-[color:var(--t-200)] p-5 shadow-2xs space-y-5">
          {/* Card Header + APC & Status Pill Badges */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[color:var(--t-100)]">
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-[color:var(--ink)]">{tx('My Locum Availability & Rate Profile')}</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {tx('Configure your preferred Malaysian states, clinical specialties, minimum rate, and availability dates so licensed hospitals can invite you.')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className={`text-2xs font-mono font-black uppercase tracking-wider px-2.5 py-1 border inline-flex items-center gap-1.5 ${
                apcValid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {apc?.validUntil
                  ? `${tx('Annual practising certificate: valid to {date}', { date: apc.validUntil })}${!apcValid ? ` (${tx('expired')})` : ''}`
                  : tx('Annual practising certificate: no expiry date on your profile')}
              </span>
              <span className={`text-2xs font-mono font-black uppercase tracking-wider px-2.5 py-1 border ${
                mine && form.visible
                  ? 'bg-[color:var(--t-50)] text-[color:var(--t-700)] border-[color:var(--t-200)]'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {mine ? (form.visible ? tx('Listed in Directory') : tx('Hidden from Employers')) : tx('Not Listed Yet')}
              </span>
            </div>
          </div>

          {/* Row 1: Symmetrical 16-State 8x2 Grid Selector */}
          <fieldset className="border border-[color:var(--t-200)] bg-[color:var(--t-bg)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-2xs font-black uppercase tracking-wider text-slate-600">
                {tx('States I Can Work In ({n} of {total} selected)', { n: form.states.length, total: MY_STATES.length })}
              </legend>
              <div className="flex items-center gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, states: ['Selangor', 'W.P. Kuala Lumpur', 'W.P. Putrajaya'] })}
                  className="text-[color:var(--t-700)] hover:underline cursor-pointer"
                >
                  {tx('Klang Valley')}
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, states: [...MY_STATES] })}
                  className="text-[color:var(--t-700)] hover:underline cursor-pointer"
                >
                  {tx('Select All')}
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, states: [] })}
                  className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {MY_STATES.map(s => {
                const checked = form.states.includes(s);
                return (
                  <label
                    key={s}
                    className={`h-9 px-2.5 border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors select-none truncate ${
                      checked
                        ? 'bg-[color:var(--t-50)] border-[color:var(--t-600)] text-[color:var(--t-800)] font-bold'
                        : 'bg-white border-[color:var(--t-200)] text-slate-700 hover:border-[color:var(--t-300)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setForm({ ...form, states: e.target.checked ? [...form.states, s] : form.states.filter(x => x !== s) })}
                      className="h-3.5 w-3.5 accent-[color:var(--t-600)] shrink-0"
                    />
                    <span className="truncate" title={s}>{s}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Row 2: Balanced 4-Column h-11 Rate, Specialties & Date Window Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className={label}>{tx('Clinical Specialties (Comma-Separated)')}</label>
              <input
                className={`${input} w-full`}
                placeholder={tx('Specialties (comma-separated)')}
                value={form.specialties}
                onChange={e => setForm({ ...form, specialties: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>{tx('Minimum Locum Rate (MYR)')}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center border border-[color:var(--t-200)] bg-[color:var(--t-bg)] h-11 px-3 focus-within:border-[color:var(--t-600)] focus-within:bg-white transition-colors">
                  <span className="text-2xs font-black uppercase tracking-wider text-slate-400 mr-2 shrink-0">{tx('RM')}</span>
                  <input
                    className="w-full bg-transparent text-xs font-bold text-[color:var(--ink)] outline-none"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={form.minRate}
                    onChange={e => setForm({ ...form, minRate: e.target.value })}
                  />
                </div>
                <select
                  className={`${input} shrink-0`}
                  value={form.ratePeriod}
                  onChange={e => setForm({ ...form, ratePeriod: e.target.value })}
                >
                  <option value="hour">{tx('per hour')}</option>
                  <option value="shift">{tx('per shift')}</option>
                  <option value="day">{tx('per day')}</option>
                  <option value="month">{tx('per month')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={label}>{tx('Available From')}</label>
              <input
                className={`${input} w-full`}
                type="date"
                value={form.availableFrom}
                onChange={e => setForm({ ...form, availableFrom: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>{tx('Available Until')}</label>
              <input
                className={`${input} w-full`}
                type="date"
                value={form.availableTo}
                onChange={e => setForm({ ...form, availableTo: e.target.value })}
              />
            </div>
          </div>

          {/* Row 3: Shift Note + Employer Visibility + Action Button on One Unified Row */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 pt-2 border-t border-[color:var(--t-100)]">
            <div className="flex-1">
              <label className={label}>{tx('Shift Preferences & Notes')}</label>
              <input
                className={`${input} w-full`}
                maxLength={400}
                placeholder={tx('Note (e.g. weekends and nights only)')}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
              <label className="h-11 px-3.5 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] inline-flex items-center gap-2 text-xs font-bold text-[color:var(--ink)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={e => setForm({ ...form, visible: e.target.checked })}
                  className="h-4 w-4 accent-[color:var(--t-600)]"
                />
                <span>{tx('Show me to employers')}</span>
              </label>

              <button
                type="submit"
                className="h-11 px-6 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors shadow-2xs"
              >
                {mine ? tx('Update') : tx('List me for locum work')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Available Locums Directory (Visible to Facility Staff & Admins) */}
      {list !== null && (
        <section className="space-y-4">
          {/* Unified Single-Row h-11 Filter Control Bar */}
          <div className="bg-white border border-[color:var(--t-200)] p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-[999_1_280px] min-w-[min(100%,280px)]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  className="w-full pl-10 pr-9 h-11 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] text-xs font-medium text-[color:var(--ink)] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:bg-white transition-colors"
                  placeholder={tx('Specialty')}
                  value={f.specialty}
                  onChange={e => setF({ ...f, specialty: e.target.value })}
                />
                {f.specialty && (
                  <button
                    type="button"
                    onClick={() => setF({ ...f, specialty: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 flex-auto max-w-full">
                <FilterSelect label={tx('State')} value={f.state} onChange={v => setF({ ...f, state: v })}>
                  <option value="">{tx('Any state')}</option>
                  {MY_STATES.map(s => <option key={s} value={s}>{tx(s)}</option>)}
                </FilterSelect>

                <FilterSelect label={tx('Role')} value={f.role} onChange={v => setF({ ...f, role: v })}>
                  <option value="">{tx('Doctors and nurses')}</option>
                  <option value="doctor">{tx('Doctors')}</option>
                  <option value="nurse">{tx('Nurses')}</option>
                </FilterSelect>

                <label className="flex items-center gap-2 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-3 h-11 flex-auto max-w-full min-w-0 focus-within:border-[color:var(--t-600)] focus-within:bg-white transition-colors">
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 shrink-0">{tx('Max RM:')}</span>
                  <input
                    className="flex-1 min-w-[70px] bg-transparent text-xs font-bold text-[color:var(--ink)] outline-none"
                    type="number"
                    placeholder={tx('Max RM rate')}
                    value={f.maxRate}
                    onChange={e => setF({ ...f, maxRate: e.target.value })}
                  />
                </label>

                <label className="flex items-center gap-2 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] px-3 h-11 flex-auto max-w-full min-w-0 focus-within:border-[color:var(--t-600)] focus-within:bg-white transition-colors">
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-400 shrink-0">{tx('Free on:')}</span>
                  <input
                    className="flex-1 min-w-0 bg-transparent text-xs font-bold text-[color:var(--ink)] outline-none"
                    type="date"
                    value={f.date}
                    onChange={e => setF({ ...f, date: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[color:var(--t-100)]">
              <span className="text-xs font-bold text-slate-600 tabular-nums">
                {tx('Available locums: Showing')} <strong className="font-black text-[color:var(--ink)]">{list.length}</strong> {tx(list.length === 1 ? 'verified practitioner' : 'verified practitioners')}
              </span>
              {hasLocumFilters && (
                <button
                  type="button"
                  onClick={() => setF({ state: '', role: '', specialty: '', maxRate: '', date: '' })}
                  className="text-xs font-bold text-[color:var(--t-700)] hover:text-[color:var(--dark)] underline underline-offset-2 cursor-pointer"
                >
                  {tx('Reset Filters')}
                </button>
              )}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="bg-white border border-[color:var(--t-200)] p-10 text-center space-y-2">
              <p className="text-sm font-black uppercase tracking-wider text-[color:var(--ink)]">{tx('No locums match')}</p>
              <p className="text-xs text-slate-500">{tx('Only verified practitioners with a valid annual practising certificate are listed.')}</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {list.map(l => (
                <li key={l.profileId} className="bg-white border border-[color:var(--t-200)] hover:border-[color:var(--t-600)] transition-colors p-4 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display font-extrabold text-xs text-[color:var(--ink)]">{l.name}</p>
                        <p className="text-xs font-bold text-[color:var(--t-700)]">{l.specialization}</p>
                      </div>
                      <span className="text-2xs font-mono font-black uppercase px-2 py-0.5 bg-[color:var(--t-50)] text-[color:var(--t-700)] border border-[color:var(--t-200)]">
                        {l.role}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-2xs font-mono font-bold uppercase px-2 py-0.5 border ${
                        l.apcStatus === 'expiring'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        APC {l.apcStatus} to {l.apcValidUntil}
                      </span>
                      {l.minRate != null && (
                        <span className="text-2xs font-mono font-bold px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200">
                          From {formatMoney(l.minRate)} / {l.ratePeriod}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[color:var(--t-100)] text-xs text-slate-600 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                        <span>{l.states.join(', ')}</span>
                      </p>
                      {(l.availableFrom || l.availableTo) && (
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[color:var(--t-600)] shrink-0" />
                          <span>Available {l.availableFrom ?? 'now'} to {l.availableTo ?? 'open'}</span>
                        </p>
                      )}
                      {l.note && <p className="text-slate-500 italic">"{l.note}"</p>}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[color:var(--t-100)] mt-auto">
                    {inviting === l.profileId ? (
                      <form onSubmit={e => sendInvite(e, l.profileId)} className="space-y-2.5 bg-[color:var(--t-bg)] border border-[color:var(--t-200)] p-3">
                        <textarea
                          className="border border-[color:var(--t-200)] p-2.5 text-xs font-semibold bg-white w-full outline-none focus:border-[color:var(--t-600)]"
                          rows={2}
                          required
                          minLength={10}
                          maxLength={500}
                          placeholder={tx('Describe the cover you need')}
                          value={inv.message}
                          onChange={e => setInv({ ...inv, message: e.target.value })}
                        />
                        <select className={`${input} w-full`} value={inv.jobId} onChange={e => setInv({ ...inv, jobId: e.target.value })}>
                          <option value="">{tx('Not linked to a listing')}</option>
                          {jobs.map(j => <option key={j.id} value={j.id}>{j.title} · {j.hospitalName}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button className="flex-1 h-9 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold cursor-pointer">
                            {tx('Send invitation')}
                          </button>
                          <button type="button" className="h-9 px-3 border border-[color:var(--t-200)] bg-white text-slate-700 font-bold cursor-pointer" onClick={() => setInviting(null)}>
                            {tx('Cancel')}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="w-full h-9 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        onClick={() => setInviting(l.profileId)}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{tx('Invite')}</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {list === null && role !== 'practitioner' && <p className="text-slate-500">{tx('Only facility staff and admins can browse locums.')}</p>}
    </div>
  );
}

export { Building2 };
