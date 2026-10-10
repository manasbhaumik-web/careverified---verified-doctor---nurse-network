import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { bannerPrimaryBtn } from '../DashboardHeader';
import { btnDanger, btnPlain, fieldLabel, fmtDate, jfetch } from './shared';

interface Member { id: string; name: string; email: string; active: boolean; isOwner: boolean; twoFactor: boolean; mustChangePassword: boolean; createdAt: string }

/** Owner account only: add the pharmacy's own staff so every action in the activity log is attributable to a person. */
export default function TeamTab() {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [issued, setIssued] = useState<{ who: string; email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    const d = await jfetch('/api/pharmacy/staff');
    setTeam(d.status === 'success' ? d.data : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const d = await jfetch('/api/pharmacy/staff', 'POST', { name, email });
    if (d.status === 'success') { setIssued({ who: name, ...d.data }); setName(''); setEmail(''); load(); }
    else setMsg({ ok: false, text: d.message || 'Could not add the login.' });
  };
  const setActive = async (m: Member, active: boolean) => {
    const d = await jfetch(`/api/pharmacy/staff/${m.id}/status`, 'POST', { active });
    if (d.status === 'success') load(); else setMsg({ ok: false, text: d.message || 'Could not update the login.' });
  };
  const reset = async (m: Member) => {
    if (!window.confirm(`Reset the password for ${m.name}? They will be signed out and need to set up two-factor sign-in again.`)) return;
    const d = await jfetch(`/api/pharmacy/staff/${m.id}/reset`, 'POST');
    if (d.status === 'success') { setIssued({ who: m.name, ...d.data }); load(); } else setMsg({ ok: false, text: d.message || 'Could not reset the password.' });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
      <section aria-label="Staff logins" className="bg-white border border-[color:var(--t-200)] shadow-xs min-w-0">
        <div className="px-5 py-4 border-b border-[color:var(--t-100)]">
          <h2 className="text-sm font-extrabold flex items-center gap-2"><Users className="h-4 w-4 text-[color:var(--t-600)]" /> Your team</h2>
          <p className="text-[12px] text-slate-600 mt-0.5">Everyone signs in with their own email and password, so the activity log shows who did what. Staff can use the inbox, activity and reports, but cannot manage logins.</p>
        </div>
        {team === null ? <p className="p-5 text-sm text-slate-600">Loading…</p> : (
          <ul className="divide-y divide-[color:var(--t-100)]">
            {team.map(m => (
              <li key={m.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold [overflow-wrap:anywhere]">{m.name}{m.isOwner && <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5">Owner</span>}{!m.active && <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5">Disabled</span>}</p>
                  <p className="text-[12px] text-slate-600 [overflow-wrap:anywhere]">{m.email} · added {fmtDate(m.createdAt)}</p>
                  <p className="text-[11px] mt-0.5 flex flex-wrap gap-x-3">
                    <span className={m.twoFactor ? 'text-emerald-700 font-semibold inline-flex items-center gap-1' : 'text-slate-500'}>{m.twoFactor && <ShieldCheck className="h-3 w-3" />}Two-factor {m.twoFactor ? 'on' : 'off'}</span>
                    {m.mustChangePassword && <span className="text-amber-700 font-semibold">Temporary password not changed yet</span>}
                  </p>
                </div>
                {!m.isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => reset(m)} className={btnPlain}>Reset password</button>
                    {m.active ? <button type="button" onClick={() => setActive(m, false)} className={btnDanger}>Disable</button> : <button type="button" onClick={() => setActive(m, true)} className={btnPlain}>Enable</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={add} className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 space-y-4 min-w-0">
        <h2 className="text-sm font-extrabold">Add a staff login</h2>
        <label className="block"><span className={fieldLabel}>Name</span><input value={name} onChange={e => setName(e.target.value)} required maxLength={100} className="form-input w-full" /></label>
        <label className="block"><span className={fieldLabel}>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="form-input w-full" /></label>
        <button type="submit" className={bannerPrimaryBtn}>Add login</button>
        {msg && <p role="status" className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
        {issued && (
          <p role="status" className="text-xs bg-amber-50 border border-amber-300 p-3 font-semibold [overflow-wrap:anywhere]">
            Share this with {issued.who} now; the password is not shown again.<br />Email: <span className="font-mono font-bold">{issued.email}</span><br />Temporary password: <span className="font-mono font-bold">{issued.password}</span>
            <button type="button" className={`${btnPlain} block mt-2`} onClick={() => setIssued(null)}>Done</button>
          </p>
        )}
      </form>
    </div>
  );
}
