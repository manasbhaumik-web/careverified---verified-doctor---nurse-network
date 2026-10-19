import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Building2, CalendarClock, Globe2 } from 'lucide-react';
import { MY_STATES } from '../identity';
import { formatMoney, formatDate } from '../locale';

const jget = (url: string) => fetch(url).then(r => r.json());
const jsend = (method: string, url: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const input = 'border border-[color:var(--t-200)] py-2 px-3 text-xs font-semibold bg-white outline-none focus:border-[color:var(--t-600)]';
const label = 'block text-xs font-bold text-slate-600 mb-1.5';

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
  const [employers, setEmployers] = useState<any[]>([]);
  useEffect(() => { jget('/api/jobs/employers').then(d => d.status === 'success' && setEmployers(d.data)).catch(() => {}); }, []);
  const set = (p: Partial<JobExtras>) => onChange({ ...value, ...p });
  const emp = employers.find(e => e.id === value.facilityId);
  return (
    <div className="space-y-4 border border-[color:var(--t-200)] bg-[color:var(--t-50)]/40 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={label}>Sector</label>
          <select className={`${input} w-full`} value={value.sector} onChange={e => set({ sector: e.target.value })}>
            <option value="private">Private</option><option value="public">Public (government)</option><option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={label}>State</label>
          <select className={`${input} w-full`} value={value.state} onChange={e => set({ state: e.target.value })}>{MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
        <div>
          <label className={label}>Who can apply</label>
          <select className={`${input} w-full`} value={value.roleRequired} onChange={e => set({ roleRequired: e.target.value })}>
            <option value="any">Doctors and nurses</option><option value="doctor">Doctors only</option><option value="nurse">Nurses only</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Employer (licensed facility register)</label>
        <select className={`${input} w-full`} value={value.facilityId} onChange={e => set({ facilityId: e.target.value })}>
          <option value="">{value.sector === 'private' ? 'Choose a facility…' : 'Not in the register (shown as unchecked)'}</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.name} · {e.licenceOk ? 'licence checked' : 'licence NOT checked'}</option>)}
        </select>
        {value.sector === 'private' && employers.length === 0 && <p className="text-xs text-amber-800 mt-1">Private-sector posts need a licensed facility you are assigned to. Ask an admin to add the facility and assign you (Medical tourism &gt; Facilities).</p>}
        {emp && !emp.licenceOk && <p className="text-xs text-rose-700 mt-1">This facility's licence has not been checked or has expired, so it cannot advertise yet.</p>}
      </div>

      <div>
        <label className={label}>Pay (Malaysian ringgit)</label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>RM</span><input className={`${input} w-28`} type="number" min={0} step="0.01" placeholder="Min" aria-label="Minimum pay" value={value.salaryMin} onChange={e => set({ salaryMin: e.target.value })} />
          <span>to</span><input className={`${input} w-28`} type="number" min={0} step="0.01" placeholder="Max" aria-label="Maximum pay" value={value.salaryMax} onChange={e => set({ salaryMax: e.target.value })} />
          <select className={input} aria-label="Pay period" value={value.salaryPeriod} onChange={e => set({ salaryPeriod: e.target.value })}>
            <option value="month">per month</option><option value="day">per day</option><option value="hour">per hour</option><option value="shift">per shift</option>
          </select>
        </div>
      </div>

      {(jobType === 'Locum' || jobType === 'Shift-based') && (
        <div>
          <label className={label}>Shifts {jobType === 'Locum' ? '(at least one)' : '(optional)'}</label>
          <div className="space-y-2">
            {value.shifts.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <input type="date" className={input} aria-label="Shift date" value={s.date} onChange={e => set({ shifts: value.shifts.map((x, k) => (k === i ? { ...x, date: e.target.value } : x)) })} />
                <input type="time" className={input} aria-label="Start" value={s.start} onChange={e => set({ shifts: value.shifts.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)) })} />
                <span>to</span>
                <input type="time" className={input} aria-label="End" value={s.end} onChange={e => set({ shifts: value.shifts.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)) })} />
                <button type="button" className="text-rose-700 font-bold cursor-pointer" onClick={() => set({ shifts: value.shifts.filter((_, k) => k !== i) })}>remove</button>
              </div>
            ))}
            <button type="button" className="text-xs font-bold underline cursor-pointer" onClick={() => set({ shifts: [...value.shifts, { date: '', start: '08:00', end: '20:00' }] })}>Add a shift</button>
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs">
        <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={value.acceptsForeign} onChange={e => set({ acceptsForeign: e.target.checked })} /><span>We also consider practitioners registered outside Malaysia. (Their Malaysian registration and work permit are the employer's responsibility: see the Eligibility tab.)</span></label>
        {value.acceptsForeign && (
          <>
            <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={value.visaSupport} onChange={e => set({ visaSupport: e.target.checked })} /><span>We help with MMC/LJM registration and the work permit.</span></label>
            <textarea className={`${input} w-full`} rows={2} maxLength={500} placeholder="Notes for foreign applicants (what you can sponsor, timelines)" value={value.foreignNotes} onChange={e => set({ foreignNotes: e.target.value })} />
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
  return (
    <section aria-label="Malaysian filters" className="bg-white border border-[color:var(--t-200)] shadow-xs p-4 flex flex-wrap gap-3 items-center text-xs">
      <select className={input} aria-label="State" value={value.state} onChange={e => onChange({ ...value, state: e.target.value })}><option value="all">All states</option>{MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
      <select className={input} aria-label="Sector" value={value.sector} onChange={e => onChange({ ...value, sector: e.target.value })}><option value="all">Public and private</option><option value="public">Public sector</option><option value="private">Private sector</option><option value="other">Other</option></select>
      <select className={input} aria-label="Role" value={value.role} onChange={e => onChange({ ...value, role: e.target.value })}><option value="all">Doctors and nurses</option><option value="doctor">Doctors</option><option value="nurse">Nurses</option></select>
      <label className="flex items-center gap-1.5 font-bold"><input type="checkbox" checked={value.foreign} onChange={e => onChange({ ...value, foreign: e.target.checked })} /> Considers practitioners registered abroad</label>
    </section>
  );
}

// ───────── badges and detail on a listing ─────────
export function JobBadges({ job }: { job: any }) {
  const emp = job.employer;
  return (
    <div className="flex flex-wrap gap-1.5 text-xs font-black uppercase tracking-wide">
      {job.sector && <span className="px-2 py-0.5 border border-slate-300 bg-slate-50 text-slate-700">{SECTOR_LABEL[job.sector] ?? job.sector}</span>}
      {job.state && <span className="px-2 py-0.5 border border-slate-300 bg-slate-50 text-slate-700">{job.state}</span>}
      {emp?.licenceOk
        ? <span className="px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-900 inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Facility licence checked{emp.licenceExpiry ? ` · to ${emp.licenceExpiry}` : ''}</span>
        : <span title={emp?.problem ?? ''} className="px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-900 inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3" />Employer licence not checked</span>}
      {job.shifts?.length > 0 && <span className="px-2 py-0.5 border border-sky-300 bg-sky-50 text-sky-900 inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{job.shifts.length} shift{job.shifts.length === 1 ? '' : 's'}</span>}
      {job.acceptsForeign && <span className="px-2 py-0.5 border border-violet-300 bg-violet-50 text-violet-900 inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />Considers foreign-registered{job.visaSupport ? ' · helps with permit' : ''}</span>}
    </div>
  );
}

export function JobDetailExtras({ job }: { job: any }) {
  return (
    <div className="space-y-3 text-xs">
      <JobBadges job={job} />
      {job.employer?.problem && <p className="text-amber-800 bg-amber-50 border border-amber-200 p-2">{job.employer.problem}</p>}
      {job.shifts?.length > 0 && (
        <div><p className="font-black uppercase tracking-wide text-slate-700 mb-1">Shifts</p>
          <ul className="space-y-0.5">{job.shifts.map((s: any, i: number) => <li key={i}>{formatDate(s.date)} · {s.start} to {s.end}</li>)}</ul></div>
      )}
      {job.acceptsForeign && (
        <div className="bg-violet-50 border border-violet-200 p-2 space-y-1">
          <p><b>Practitioners registered abroad:</b> considered{job.visaSupport ? ', and the employer says it helps with registration and the work permit' : ', but the employer has not said it helps with registration or the permit'}.</p>
          {job.foreignNotes && <p>{job.foreignNotes}</p>}
          <p className="text-slate-500">Confirm registration and permit support in writing before you resign or travel.</p>
        </div>
      )}
      {job.applyBlockedReason && <p className="text-rose-800 bg-rose-50 border border-rose-200 p-2 font-semibold">You cannot apply yet: {job.applyBlockedReason}</p>}
    </div>
  );
}

// ───────── eligibility information ─────────
export function EligibilityInfo() {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => { jget('/api/jobs/info').then(d => d.status === 'success' && setInfo(d.data)).catch(() => {}); }, []);
  return (
    <div className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
      {info?.draft && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2 font-semibold">Draft from web research: not legal or immigration advice. Confirm with the Malaysian Medical Council, the Nursing Board and Immigration.</p>}
      {info?.sections.map((s: any) => <section key={s.heading}><h3 className="text-xs font-black uppercase tracking-wide text-slate-700">{s.heading}</h3><p className="text-xs text-slate-700 leading-relaxed mt-1">{s.body}</p></section>)}
    </div>
  );
}

// ───────── locum profiles and directory ─────────
export function LocumBoard({ role, jobs }: { role: string; jobs: any[] }) {
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
    setMsg(d.status === 'success' ? 'Saved. Employers can find you when your annual practising certificate is valid.' : d.message);
    if (d.status === 'success') loadMine();
  };
  const sendInvite = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const d = await jsend('POST', `/api/locums/${id}/invite`, { message: inv.message, jobId: inv.jobId || undefined });
    setMsg(d.status === 'success' ? d.message : d.message);
    if (d.status === 'success') { setInviting(null); setInv({ message: '', jobId: '' }); }
  };

  return (
    <div className="space-y-5 text-xs">
      {msg && <p className="font-bold text-sky-900 bg-sky-50 border border-sky-200 p-2" role="status">{msg}</p>}

      {role === 'practitioner' && (
        <form onSubmit={save} className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
          <h3 className="font-black uppercase tracking-wide">My locum availability</h3>
          <p className={apc?.validUntil && apc.validUntil >= new Date().toISOString().slice(0, 10) ? 'text-emerald-800' : 'text-rose-700 font-bold'}>
            Annual practising certificate: {apc?.validUntil ? `valid to ${apc.validUntil}` : 'no expiry date on your profile'}{apc?.validUntil && apc.validUntil < new Date().toISOString().slice(0, 10) ? ' (expired: you will not be listed)' : ''}
          </p>
          <fieldset className="border border-slate-200 p-3"><legend className="px-1 font-bold">States I can work in</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">{MY_STATES.map(s => <label key={s} className="flex items-center gap-1"><input type="checkbox" checked={form.states.includes(s)} onChange={e => setForm({ ...form, states: e.target.checked ? [...form.states, s] : form.states.filter(x => x !== s) })} />{s}</label>)}</div></fieldset>
          <input className={`${input} w-full`} placeholder="Specialties (comma-separated)" value={form.specialties} onChange={e => setForm({ ...form, specialties: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2"><span>Minimum rate RM</span>
            <input className={`${input} w-28`} type="number" min={0} step="0.01" value={form.minRate} onChange={e => setForm({ ...form, minRate: e.target.value })} />
            <select className={input} value={form.ratePeriod} onChange={e => setForm({ ...form, ratePeriod: e.target.value })}><option value="hour">per hour</option><option value="shift">per shift</option><option value="day">per day</option><option value="month">per month</option></select>
            <span>Available</span><input className={input} type="date" value={form.availableFrom} onChange={e => setForm({ ...form, availableFrom: e.target.value })} /><span>to</span><input className={input} type="date" value={form.availableTo} onChange={e => setForm({ ...form, availableTo: e.target.value })} /></div>
          <input className={`${input} w-full`} maxLength={400} placeholder="Note (e.g. weekends and nights only)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} />Show me to employers</label>
          <button className="bg-[color:var(--t-600)] text-white font-bold px-4 py-2 cursor-pointer">{mine ? 'Update' : 'List me for locum work'}</button>
        </form>
      )}

      {list !== null && (
        <section className="space-y-3">
          <h3 className="font-black uppercase tracking-wide">Available locums</h3>
          <div className="flex flex-wrap gap-2">
            <select className={input} aria-label="State" value={f.state} onChange={e => setF({ ...f, state: e.target.value })}><option value="">Any state</option>{MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select className={input} aria-label="Role" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="">Doctors and nurses</option><option value="doctor">Doctors</option><option value="nurse">Nurses</option></select>
            <input className={input} placeholder="Specialty" value={f.specialty} onChange={e => setF({ ...f, specialty: e.target.value })} />
            <input className={`${input} w-28`} type="number" placeholder="Max RM rate" value={f.maxRate} onChange={e => setF({ ...f, maxRate: e.target.value })} />
            <label className="flex items-center gap-1">Free on <input className={input} type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
          </div>
          {list.length === 0 && <p className="text-slate-500 bg-white border border-dashed border-slate-300 p-4">No locums match. Only verified practitioners with a valid annual practising certificate are listed.</p>}
          <ul className="space-y-2">
            {list.map(l => (
              <li key={l.profileId} className="bg-white border border-slate-200 p-3 space-y-1.5">
                <p><b>{l.name}</b> · {l.role} · {l.specialization} · {l.states.join(', ')}</p>
                <p className="text-slate-600">{l.registry}{l.registeredInMalaysia ? ' (registered in Malaysia)' : ' (registered abroad)'} · APC <b className={l.apcStatus === 'expiring' ? 'text-amber-700' : 'text-emerald-700'}>{l.apcStatus} to {l.apcValidUntil}</b>{l.minRate != null ? ` · from ${formatMoney(l.minRate)} per ${l.ratePeriod}` : ''}{l.availableFrom || l.availableTo ? ` · available ${l.availableFrom ?? '…'} to ${l.availableTo ?? '…'}` : ''}</p>
                {l.note && <p className="text-slate-600">{l.note}</p>}
                {inviting === l.profileId ? (
                  <form onSubmit={e => sendInvite(e, l.profileId)} className="space-y-2">
                    <textarea className={`${input} w-full`} rows={2} required minLength={10} maxLength={500} placeholder="Describe the cover you need" value={inv.message} onChange={e => setInv({ ...inv, message: e.target.value })} />
                    <select className={input} value={inv.jobId} onChange={e => setInv({ ...inv, jobId: e.target.value })}><option value="">Not linked to a listing</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title} · {j.hospitalName}</option>)}</select>
                    <div className="flex gap-3"><button className="bg-[color:var(--t-600)] text-white font-bold px-3 py-1.5 cursor-pointer">Send invitation</button><button type="button" className="font-bold cursor-pointer" onClick={() => setInviting(null)}>Cancel</button></div>
                  </form>
                ) : <button className="font-bold underline cursor-pointer" onClick={() => setInviting(l.profileId)}>Invite</button>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {list === null && role !== 'practitioner' && <p className="text-slate-500">Only facility staff and admins can browse locums.</p>}
    </div>
  );
}

export { Building2 };
