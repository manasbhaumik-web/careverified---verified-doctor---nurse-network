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
      <section aria-label="Staff logins" className="bg-white border border-[color:var(--t-200)] rounded-none min-w-0">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2"><Users className="h-4 w-4 text-[color:var(--t-600)]" /> Authorized Staff Logins</h2>
          <p className="text-[12px] text-slate-500 font-semibold mt-1">Staff members sign in individually so each clinical status update and dispense action in the audit trail is attributable. Staff can process prescriptions but cannot manage logins.</p>
        </div>
        {team === null ? <p className="p-5 text-sm text-slate-600 font-semibold">Loading authorized staff…</p> : (
          <ul className="divide-y divide-slate-200">
            {team.map(m => (
              <li key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 [overflow-wrap:anywhere] flex items-center gap-2">
                    {m.name}
                    {m.isOwner && <span className="text-[9px] font-black uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] border border-[color:var(--t-200)] px-2 py-0.5 rounded-none">Owner</span>}
                    {!m.active && <span className="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-none">Disabled</span>}
                  </p>
                  <p className="text-xs font-semibold text-slate-600 [overflow-wrap:anywhere] mt-0.5">{m.email} · added {fmtDate(m.createdAt)}</p>
                  <p className="text-[11px] mt-1 flex flex-wrap gap-x-3">
                    <span className={m.twoFactor ? 'text-emerald-800 font-bold inline-flex items-center gap-1' : 'text-slate-500 font-semibold'}>{m.twoFactor && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}Two-factor {m.twoFactor ? 'Active' : 'Disabled'}</span>
                    {m.mustChangePassword && <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5">Temporary password pending change</span>}
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

      <form onSubmit={add} className="bg-white border border-[color:var(--t-200)] rounded-none p-6 space-y-5 min-w-0">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Provision Staff Account</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Issue a secure sign-in for a licensed pharmacist or dispensary assistant.</p>
        </div>
        <label className="block"><span className={fieldLabel}>Staff Full Name</span><input value={name} onChange={e => setName(e.target.value)} required maxLength={100} className="h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[color:var(--t-600)]" /></label>
        <label className="block"><span className={fieldLabel}>Staff Email Address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[color:var(--t-600)]" /></label>
        <button type="submit" className={bannerPrimaryBtn}>Issue Staff Credentials</button>
        {msg && <p role="status" className={`text-xs font-bold p-3 border rounded-none ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{msg.text}</p>}
        {issued && (
          <div role="status" className="text-xs bg-amber-50 border border-amber-300 rounded-none p-4 font-semibold [overflow-wrap:anywhere] space-y-2">
            <p className="font-black uppercase tracking-wider text-amber-900">One-Time Temporary Credentials for {issued.who}</p>
            <p className="text-slate-700">Share these details immediately. The generated password cannot be retrieved again.</p>
            <div className="bg-white border border-amber-200 p-2.5 font-mono text-xs space-y-1">
              <div>Email: <span className="font-bold text-slate-900">{issued.email}</span></div>
              <div>Temporary password: <span className="font-bold text-[color:var(--t-700)]">{issued.password}</span></div>
            </div>
            <button type="button" className={`${btnPlain} w-full`} onClick={() => setIssued(null)}>Acknowledge & Close</button>
          </div>
        )}
      </form>
    </div>
  );
}
