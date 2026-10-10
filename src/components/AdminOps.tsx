import React, { useEffect, useState } from 'react';
import { Siren } from 'lucide-react';

const post = (url: string, body?: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => r.json());
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Admin operations: 24/7 roster coverage, SOS alerts, payments and refunds. */
const SERVICES = ['24 hours', 'Home delivery', 'Drive-through', 'Vaccinations', 'Online ordering'];

export default function AdminOps() {
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
  const blankVerify = { licenceNumber: '', pharmacistName: '', pharmacistRegNo: '', confirmed: false };
  const [verifyDraft, setVerifyDraft] = useState(blankVerify);

  const load = async () => {
    const [c, e, p] = await Promise.all([
      fetch('/api/admin/coverage').then(r => r.json()),
      fetch('/api/admin/emergencies').then(r => r.json()),
      fetch('/api/admin/payments').then(r => r.json()),
    ]);
    if (c.status === 'success') setCoverage(c.data);
    if (e.status === 'success') setEmergencies(e.data);
    if (p.status === 'success') setPayments(p.data);
    const ph = await fetch('/api/admin/pharmacies').then(r => r.json());
    if (ph.status === 'success') setPharmacies(ph.data);
    const sm = await fetch('/api/admin/pharmacies/summary').then(r => r.json()).catch(() => null);
    if (sm?.status === 'success') setSummary(sm.data);
  };
  useEffect(() => { load().catch(() => setMsg('Could not load data.')); const t = setInterval(() => load().catch(() => {}), 15000); return () => clearInterval(t); }, []);

  const handle = async (id: string) => { await post(`/api/admin/emergencies/${id}/handle`); load(); };
  const refund = async (id: string) => {
    const reason = window.prompt('Reason for the refund?');
    if (!reason) return;
    const d = await post(`/api/payments/${id}/refund`, { reason });
    setMsg(d.status === 'success' ? 'Refunded.' : d.message || 'Refund failed.');
    load();
  };

  const addPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = await post('/api/admin/pharmacies', newPharm);
    if (d.status === 'success') { setIssued(d.data); setNewPharm(blankPharm); load(); } else setMsg(d.message || 'Could not add the pharmacy.');
  };
  const toggleService = (list: string[], s: string) => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]);
  const startEdit = (p: any) => { setEditing(p.id); setDraft({ name: p.name, address: p.address, city: p.city ?? '', phone: p.phone ?? '', hours: p.hours ?? '', services: p.services ?? [] }); };
  const saveEdit = async (id: string) => {
    const d = await fetch(`/api/admin/pharmacies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }).then(r => r.json());
    if (d.status === 'success') { setEditing(null); load(); } else setMsg(d.message || 'Could not save.');
  };
  const togglePharmacy = async (id: string, active: boolean) => { await post(`/api/admin/pharmacies/${id}/active`, { active }); load(); };
  const createLogin = async (p: any) => {
    const d = await post(`/api/admin/pharmacies/${p.id}/account`, loginDraft);
    if (d.status === 'success') { setLoginIssued({ pharmacy: p.name, ...d.data }); setLoginFor(null); setLoginDraft({ name: '', email: '' }); load(); }
    else setMsg(d.message || 'Could not create the login.');
  };
  const resetLogin = async (p: any) => {
    if (!window.confirm(`Reset the password for ${p.name}? They will be signed out.`)) return;
    const d = await post(`/api/admin/pharmacies/${p.id}/account/reset`);
    if (d.status === 'success') setLoginIssued({ pharmacy: p.name, ...d.data }); else setMsg(d.message || 'Could not reset the password.');
    load();
  };
  const verifyPharmacy = async (p: any) => {
    const d = await post(`/api/admin/pharmacies/${p.id}/verification`, verifyDraft);
    if (d.status === 'success') { setVerifyFor(null); setVerifyDraft(blankVerify); load(); } else setMsg(d.message || 'Could not record the verification.');
  };
  const minutes = (m: number | null | undefined) => (m == null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${(m / 60).toFixed(1)} h` : `${(m / 1440).toFixed(1)} d`);

  const gaps = coverage ? coverage.grid.flat().filter((n: number) => n === 0).length : 0;
  const openSos = emergencies.filter(e => e.status === 'open');

  return (
    <div className="space-y-6 text-slate-800">
      {msg && <p className="text-xs font-bold bg-slate-50 border border-slate-200 p-3">{msg}</p>}

      <section className={`border p-5 space-y-3 ${openSos.length ? 'bg-rose-50 border-rose-300' : 'bg-white border-[color:var(--t-200)]'}`}>
        <h3 className="text-sm font-extrabold flex items-center gap-2"><Siren className="h-4 w-4 text-rose-600" /> SOS alerts ({openSos.length} open)</h3>
        {emergencies.length === 0 ? <p className="text-xs text-slate-500">No SOS alerts.</p> : (
          <ul className="space-y-2 text-xs">
            {emergencies.slice(0, 20).map(e => (
              <li key={e.id} className="bg-white border border-slate-200 p-3 flex flex-wrap justify-between gap-2">
                <span>
                  <b>{e.userName}</b> ({e.userEmail}) · {new Date(e.ts).toLocaleString()}
                  {e.lat != null && <> · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=15/${e.lat}/${e.lng}`}>location</a></>}
                  {e.note && <> · “{e.note}”</>}
                </span>
                {e.status === 'open' ? <button onClick={() => handle(e.id)} className="font-bold text-rose-700 cursor-pointer">Mark handled</button> : <span className="text-slate-400">handled</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">24/7 roster coverage</h3>
          {coverage && <p className="text-xs font-bold">{coverage.onlineNow} doctor(s) online now · {coverage.queued} waiting · {coverage.active} in consultation · <span className={gaps ? 'text-rose-700' : 'text-emerald-700'}>{gaps} uncovered hour(s) per week</span></p>}
        </div>
        {coverage && (
          <div className="overflow-x-auto">
            <table className="text-[10px] border-separate border-spacing-0.5">
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
            <p className="text-[11px] text-slate-500 mt-2">Red = nobody rostered, amber = a single doctor, green = two or more.</p>
          </div>
        )}
      </section>

      <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">Payments</h3>
          {payments && <p className="text-xs font-bold">Mode: {payments.mode ?? 'not configured'} · Gross RM {payments.totals.gross.toFixed(2)} · Platform fee RM {payments.totals.platformFee.toFixed(2)}</p>}
        </div>
        {payments?.mode === 'sandbox' && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 font-semibold p-2">Test mode: set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to take real payments.</p>}
        {payments && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[10px] uppercase text-slate-500"><th className="py-2 pr-3">When</th><th className="pr-3">Patient</th><th className="pr-3">For</th><th className="pr-3">Amount</th><th className="pr-3">Status</th><th /></tr></thead>
              <tbody>
                {payments.rows.slice(0, 50).map((p: any) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="pr-3">{p.patientName}</td>
                    <td className="pr-3">{p.description}</td>
                    <td className="pr-3 tabular-nums">RM {(p.amount_sen / 100).toFixed(2)}</td>
                    <td className="pr-3 font-bold">{p.status}{p.provider === 'sandbox' ? ' (test)' : ''}</td>
                    <td>{p.status === 'paid' && <button onClick={() => refund(p.id)} className="font-bold text-rose-700 cursor-pointer">Refund</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-[color:var(--t-200)] p-5 space-y-3">
        <h3 className="text-sm font-extrabold">Partner pharmacies</h3>
        <p className="text-xs text-slate-600">Patients can send prescriptions to these pharmacies. Verify each pharmacy's licence and pharmacist against the official registers, then give it a workspace login (email and password) for its own inbox, status updates, activity and reports. The owner login adds its own staff. The ID and PIN still work at /pharmacy for quick counter lookups.</p>
        <form onSubmit={addPharmacy} className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <input className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[10rem]" placeholder="Name" value={newPharm.name} onChange={e => setNewPharm({ ...newPharm, name: e.target.value })} required />
            <input className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[12rem]" placeholder="Address" value={newPharm.address} onChange={e => setNewPharm({ ...newPharm, address: e.target.value })} required />
            <input className="border border-slate-200 px-3 py-2 text-xs w-36" placeholder="City" value={newPharm.city} onChange={e => setNewPharm({ ...newPharm, city: e.target.value })} maxLength={60} />
            <input className="border border-slate-200 px-3 py-2 text-xs w-36" placeholder="Phone" value={newPharm.phone} onChange={e => setNewPharm({ ...newPharm, phone: e.target.value })} />
            <input className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[12rem]" placeholder="Opening hours, e.g. Mon–Sat 9am–10pm" value={newPharm.hours} onChange={e => setNewPharm({ ...newPharm, hours: e.target.value })} maxLength={120} />
          </div>
          <fieldset className="flex flex-wrap gap-x-4 gap-y-1 items-center">
            <legend className="sr-only">Services</legend>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Services</span>
            {SERVICES.map(s => (
              <label key={s} className="text-xs inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={newPharm.services.includes(s)} onChange={() => setNewPharm({ ...newPharm, services: toggleService(newPharm.services, s) })} /> {s}</label>
            ))}
            <button className="ml-auto bg-[color:var(--t-600)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Add pharmacy</button>
          </fieldset>
        </form>
        {issued && <p role="status" className="text-xs bg-amber-50 border border-amber-300 p-3 font-semibold">Give the pharmacy these sign-in details now; the PIN is not shown again. ID: <span className="font-mono font-bold">{issued.id}</span> · PIN: <span className="font-mono font-bold">{issued.pin}</span> <button className="underline ml-2 cursor-pointer" onClick={() => setIssued(null)}>Done</button></p>}
        {loginIssued && <p role="status" className="text-xs bg-amber-50 border border-amber-300 p-3 font-semibold [overflow-wrap:anywhere]">Workspace login for {loginIssued.pharmacy}. Share it now; the password is not shown again. Email: <span className="font-mono font-bold">{loginIssued.email}</span> · Temporary password: <span className="font-mono font-bold">{loginIssued.password}</span> <button className="underline ml-2 cursor-pointer" onClick={() => setLoginIssued(null)}>Done</button></p>}
        <ul className="text-xs divide-y divide-slate-100">
          {pharmacies.map(p => (
            <li key={p.id} className="py-2 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="min-w-0 [overflow-wrap:anywhere]"><b>{p.name}</b> · {p.address}{p.city && !p.address.toLowerCase().includes(p.city.toLowerCase()) ? `, ${p.city}` : ''} · <span className="font-mono">{p.id}</span>{p.hours ? <span className="text-slate-500"> · {p.hours}</span> : null}{p.services?.length ? <span className="text-slate-500"> · {p.services.join(', ')}</span> : null}</span>
                <span className="flex gap-3">
                  <button onClick={() => (editing === p.id ? setEditing(null) : startEdit(p))} className="font-bold cursor-pointer">{editing === p.id ? 'Cancel' : 'Edit'}</button>
                  <button onClick={() => togglePharmacy(p.id, !p.active)} className="font-bold cursor-pointer">{p.active ? 'Deactivate' : 'Activate'}</button>
                </span>
              </div>
              {summary[p.id] && (
                <div className="text-slate-600 space-y-2">
                  {summary[p.id].verification ? (
                    <p className="[overflow-wrap:anywhere]">Verified by the board · licence <b>{summary[p.id].verification.licenceNumber}</b> · pharmacist <b>{summary[p.id].verification.pharmacistName}</b> ({summary[p.id].verification.pharmacistRegNo}) · {new Date(summary[p.id].verification.verifiedAt).toLocaleDateString()}</p>
                  ) : verifyFor === p.id ? (
                    <form onSubmit={e => { e.preventDefault(); verifyPharmacy(p); }} className="bg-slate-50 border border-slate-200 p-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <input aria-label="Pharmacy licence number" placeholder="Pharmacy licence number" required className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem]" value={verifyDraft.licenceNumber} onChange={e => setVerifyDraft({ ...verifyDraft, licenceNumber: e.target.value })} />
                        <input aria-label="Pharmacist name" placeholder="Pharmacist name" required className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem]" value={verifyDraft.pharmacistName} onChange={e => setVerifyDraft({ ...verifyDraft, pharmacistName: e.target.value })} />
                        <input aria-label="Pharmacist registration number" placeholder="Pharmacist registration no." required className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem]" value={verifyDraft.pharmacistRegNo} onChange={e => setVerifyDraft({ ...verifyDraft, pharmacistRegNo: e.target.value })} />
                      </div>
                      <label className="text-xs inline-flex items-start gap-2 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={verifyDraft.confirmed} onChange={e => setVerifyDraft({ ...verifyDraft, confirmed: e.target.checked })} /> I checked these details against the official pharmacy and pharmacist registers.</label>
                      <div className="flex gap-3 items-center">
                        <button disabled={!verifyDraft.confirmed} className="bg-[color:var(--t-600)] disabled:bg-slate-300 text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Record verification</button>
                        <button type="button" onClick={() => setVerifyFor(null)} className="font-bold cursor-pointer">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <p>Not verified yet. <button onClick={() => { setVerifyFor(p.id); setVerifyDraft(blankVerify); }} className="font-bold underline cursor-pointer">Verify pharmacy</button></p>
                  )}
                </div>
              )}
              {(() => {
                const s = summary[p.id];
                if (!s) return null;
                return (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                    {s.account ? (
                      <>
                        <span className="[overflow-wrap:anywhere]">Login: <b>{s.account.email}</b>{s.account.mustChangePassword ? <span className="text-amber-700"> (temporary password not yet changed)</span> : null}</span>
                        <span>Staff logins: <b>{s.staffCount}</b> · Two-factor: <b>{s.account.twoFactor ? 'on' : 'off'}</b></span>
                        <span>New: <b>{s.inbox}</b> · In progress: <b>{s.inProgress}</b> · Dispensed: <b>{s.dispensed}</b></span>
                        <span>Avg response (30d): <b>{minutes(s.avgResponseMinutes)}</b></span>
                        <span>Last activity: <b>{s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'none yet'}</b></span>
                        <button onClick={() => resetLogin(p)} className="font-bold underline cursor-pointer">Reset password and two-factor</button>
                      </>
                    ) : loginFor === p.id ? (
                      <form onSubmit={e => { e.preventDefault(); createLogin(p); }} className="flex flex-wrap gap-2 items-center w-full">
                        <input aria-label="Contact name" placeholder="Contact name" className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[9rem]" value={loginDraft.name} onChange={e => setLoginDraft({ ...loginDraft, name: e.target.value })} />
                        <input aria-label="Login email" type="email" required placeholder="Login email" className="border border-slate-200 px-3 py-2 text-xs flex-1 min-w-[12rem]" value={loginDraft.email} onChange={e => setLoginDraft({ ...loginDraft, email: e.target.value })} />
                        <button className="bg-[color:var(--t-600)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Create login</button>
                        <button type="button" onClick={() => setLoginFor(null)} className="font-bold cursor-pointer">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <span>No workspace login yet.</span>
                        {s.verification
                          ? <button onClick={() => { setLoginFor(p.id); setLoginDraft({ name: p.name, email: '' }); }} className="font-bold underline cursor-pointer">Create login</button>
                          : <span className="text-amber-700">Verify the pharmacy first.</span>}
                      </>
                    )}
                  </div>
                );
              })()}
              {editing === p.id && (
                <div className="bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input aria-label="Name" className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[10rem]" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                    <input aria-label="Address" className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[12rem]" value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} />
                    <input aria-label="City" placeholder="City" className="border border-slate-200 bg-white px-3 py-2 text-xs w-36" value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} />
                    <input aria-label="Phone" placeholder="Phone" className="border border-slate-200 bg-white px-3 py-2 text-xs w-36" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
                    <input aria-label="Opening hours" placeholder="Opening hours" className="border border-slate-200 bg-white px-3 py-2 text-xs flex-1 min-w-[12rem]" value={draft.hours} onChange={e => setDraft({ ...draft, hours: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                    {SERVICES.map(s => (
                      <label key={s} className="text-xs inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={draft.services.includes(s)} onChange={() => setDraft({ ...draft, services: toggleService(draft.services, s) })} /> {s}</label>
                    ))}
                    <button onClick={() => saveEdit(p.id)} className="ml-auto bg-[color:var(--t-600)] text-white text-xs font-extrabold px-4 py-2 cursor-pointer">Save</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
