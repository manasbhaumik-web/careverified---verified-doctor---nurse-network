import React, { useCallback, useEffect, useState } from 'react';
import { useTr } from '../../locale';

interface Profile {
  id: string; name: string; description: string | null; phone: string | null; website: string | null; address: string | null; city: string | null; state: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected'; approvalNote: string | null; staffRole: 'admin' | 'staff' | null;
  departments: { name: string; description?: string }[]; services: string[];
  accreditationClaims: { body: string; number: string; validUntil: string; status: string }[];
  photos: { id: string; url: string }[];
}
interface Staff { userId: string; name: string; email: string; staffRole: 'admin' | 'staff' }

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

/**
 * What the public sees about a facility (departments, services, accreditation claims, photos) and who can work in it.
 * Only a facility admin can change anything here; staff can read it. A pending facility is hidden from the public until the board approves it.
 */
export default function FacilityPublicProfile() {
  const tx = useTr();
  const [p, setP] = useState<Profile | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dept, setDept] = useState('');
  const [service, setService] = useState('');
  const [claim, setClaim] = useState({ body: '', number: '', validUntil: '' });
  const [invite, setInvite] = useState({ name: '', email: '', staffRole: 'staff' });
  const [temp, setTemp] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([send('/api/facility/profile', 'GET'), send('/api/facility/staff', 'GET')]);
    if (a.status === 'success') setP(a.data);
    if (b.status === 'success') setStaff(b.data);
  }, []);
  useEffect(() => { load().catch(() => setMsg({ ok: false, text: tx('Could not load.') })); }, [load]);

  const [mustChange, setMustChange] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  useEffect(() => { send('/api/facility/account', 'GET').then(r => r.status === 'success' && setMustChange(!!r.data.mustChangePassword)).catch(() => {}); }, []);

  if (!p) return <p role="status" className="text-xs text-slate-600 p-4">{tx('Loading…')}</p>;
  const admin = p.staffRole === 'admin';
  const done = (r: any, okText: string) => { setMsg({ ok: r.status === 'success', text: r.status === 'success' ? okText : r.message || tx('Could not save.') }); if (r.status === 'success') load(); return r.status === 'success'; };
  const set = (k: keyof Profile, v: any) => setP({ ...p, [k]: v });

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    done(await send('/api/facility/profile', 'PUT', { description: p.description, phone: p.phone, website: p.website, address: p.address, city: p.city, state: p.state, departments: p.departments, services: p.services }), tx('Profile saved.'));
  };
  const uploadPhoto = async (file: File) => {
    const form = new FormData(); form.set('kind', 'other'); form.set('file', file);
    const up = await fetch('/api/documents', { method: 'POST', body: form }).then(r => r.json());
    if (up.status !== 'success') return setMsg({ ok: false, text: up.message || tx('Upload failed.') });
    done(await send('/api/facility/photos', 'POST', { documentId: up.data.id }), tx('Photo added.'));
  };

  const banner = p.approvalStatus === 'pending' ? { cls: 'bg-amber-50 border-amber-300 text-amber-950', text: tx('Waiting for the board to approve your facility. Your profile is not public yet.') }
    : p.approvalStatus === 'rejected' ? { cls: 'bg-rose-50 border-rose-300 text-rose-900', text: `${tx('Your registration was not approved.')} ${p.approvalNote ?? ''}` } : null;

  return (
    <section aria-labelledby="fp-h" className="space-y-4">
      <h2 id="fp-h" className="text-sm font-extrabold">{tx('Public profile and staff')}</h2>
      {mustChange && (
        <form className="app-card grid sm:grid-cols-3 gap-2 items-end border-amber-300" onSubmit={async e => {
          e.preventDefault();
          const r = await send('/api/auth/change-password', 'POST', pw);
          if (r.status === 'success') { setMustChange(false); setPw({ currentPassword: '', newPassword: '' }); setMsg({ ok: true, text: tx('Password changed.') }); }
          else setMsg({ ok: false, text: r.message || tx('Could not save.') });
        }}>
          <p className="sm:col-span-3 text-xs font-bold text-amber-950">{tx('You are using a temporary password. Choose your own now.')}</p>
          <div><label htmlFor="pw-c" className="form-label">{tx('Temporary password')}</label><input id="pw-c" type="password" autoComplete="current-password" className="form-input" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} required /></div>
          <div><label htmlFor="pw-n" className="form-label">{tx('New password')}</label><input id="pw-n" type="password" autoComplete="new-password" className="form-input" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} required /></div>
          <button type="submit" className="btn btn-sm btn-primary">{tx('Change password')}</button>
        </form>
      )}
      {banner && <p role="status" className={`text-xs font-bold p-3 border ${banner.cls}`}>{banner.text}</p>}
      {!admin && <p className="text-xs text-slate-700 bg-white border border-[color:var(--t-200)] p-3">{tx('Only a facility admin can change the profile or the staff. You can read them here.')}</p>}
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-bold p-3 border ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-200' : 'text-rose-900 bg-rose-50 border-rose-200'}`}>{msg.text}</p>}

      <form onSubmit={saveProfile} className="app-card grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3"><label htmlFor="fp-desc" className="form-label">{tx('About the facility')}</label><textarea id="fp-desc" rows={3} className="form-input" disabled={!admin} value={p.description ?? ''} onChange={e => set('description', e.target.value)} /></div>
        {([['phone', 'Phone'], ['website', 'Website (https://…)'], ['address', 'Address'], ['city', 'City'], ['state', 'State']] as const).map(([k, l]) => (
          <div key={k}><label htmlFor={`fp-${k}`} className="form-label">{tx(l)}</label><input id={`fp-${k}`} className="form-input" disabled={!admin} value={(p[k] as string | null) ?? ''} onChange={e => set(k, e.target.value)} /></div>
        ))}

        <div className="sm:col-span-3 grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="fp-dept" className="form-label">{tx('Departments')}</label>
            <ul className="flex flex-wrap gap-1.5 mb-2">{p.departments.map(d => <li key={d.name} className="text-xs border border-[color:var(--t-200)] bg-white px-2 py-1">{d.name}{admin && <button type="button" aria-label={`${tx('Remove')} ${d.name}`} className="ml-1.5 font-bold" onClick={() => set('departments', p.departments.filter(x => x.name !== d.name))}>×</button>}</li>)}</ul>
            {admin && <div className="flex gap-2"><input id="fp-dept" className="form-input" value={dept} onChange={e => setDept(e.target.value)} /><button type="button" className="btn btn-sm btn-secondary" onClick={() => { if (dept.trim()) { set('departments', [...p.departments, { name: dept.trim() }]); setDept(''); } }}>{tx('Add')}</button></div>}
          </div>
          <div>
            <label htmlFor="fp-svc" className="form-label">{tx('Services')}</label>
            <ul className="flex flex-wrap gap-1.5 mb-2">{p.services.map(s => <li key={s} className="text-xs border border-[color:var(--t-200)] bg-white px-2 py-1">{s}{admin && <button type="button" aria-label={`${tx('Remove')} ${s}`} className="ml-1.5 font-bold" onClick={() => set('services', p.services.filter(x => x !== s))}>×</button>}</li>)}</ul>
            {admin && <div className="flex gap-2"><input id="fp-svc" className="form-input" value={service} onChange={e => setService(e.target.value)} /><button type="button" className="btn btn-sm btn-secondary" onClick={() => { if (service.trim()) { set('services', [...p.services, service.trim()]); setService(''); } }}>{tx('Add')}</button></div>}
          </div>
        </div>
        {admin && <div className="sm:col-span-3"><button type="submit" className="btn btn-sm btn-primary">{tx('Save profile')}</button></div>}
      </form>

      <div className="app-card space-y-3">
        <h3 className="text-xs font-extrabold">{tx('Accreditations')}</h3>
        <p className="text-xs text-slate-600">{tx('An accreditation you add here is a claim. It is shown publicly only after the board has checked it.')}</p>
        <ul className="text-xs space-y-1">{p.accreditationClaims.map(c => <li key={c.body}>{c.body} · {c.number} · {c.validUntil} · <span className="font-bold">{tx('Waiting for the board')}</span></li>)}</ul>
        {admin && (
          <form className="grid sm:grid-cols-4 gap-2 items-end" onSubmit={async e => { e.preventDefault(); if (done(await send('/api/facility/accreditations', 'POST', claim), tx('Claim sent to the board.'))) setClaim({ body: '', number: '', validUntil: '' }); }}>
            <div><label htmlFor="ac-b" className="form-label">{tx('Body (e.g. MSQH)')}</label><input id="ac-b" className="form-input" value={claim.body} onChange={e => setClaim({ ...claim, body: e.target.value })} required /></div>
            <div><label htmlFor="ac-n" className="form-label">{tx('Certificate number')}</label><input id="ac-n" className="form-input" value={claim.number} onChange={e => setClaim({ ...claim, number: e.target.value })} required /></div>
            <div><label htmlFor="ac-d" className="form-label">{tx('Valid until')}</label><input id="ac-d" type="date" className="form-input" value={claim.validUntil} onChange={e => setClaim({ ...claim, validUntil: e.target.value })} required /></div>
            <button type="submit" className="btn btn-sm btn-secondary">{tx('Add claim')}</button>
          </form>
        )}
      </div>

      <div className="app-card space-y-3">
        <h3 className="text-xs font-extrabold">{tx('Photos')}</h3>
        <ul className="flex flex-wrap gap-2">{p.photos.map(ph => (
          <li key={ph.id} className="border border-[color:var(--t-200)] bg-white p-1 text-center">
            {p.approvalStatus === 'approved' ? <img src={ph.url} alt="" className="h-20 w-28 object-cover" /> : <span className="block h-20 w-28 text-2xs text-slate-600 p-2">{tx('Shown once approved')}</span>}
            {admin && <button type="button" className="text-2xs font-bold underline" onClick={async () => done(await send(`/api/facility/photos/${ph.id}`, 'DELETE'), tx('Photo removed.'))}>{tx('Remove')}</button>}
          </li>))}</ul>
        {admin && <div><label htmlFor="ph-f" className="form-label">{tx('Add a photo (JPG or PNG, up to 5 MB)')}</label><input id="ph-f" type="file" accept="image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} /></div>}
      </div>

      <div className="app-card space-y-3">
        <h3 className="text-xs font-extrabold">{tx('Staff')}</h3>
        <ul className="divide-y divide-[color:var(--t-100)] text-xs">{staff.map(s => (
          <li key={s.userId} className="py-2 flex flex-wrap items-center justify-between gap-2">
            <span>{s.name} · {s.email}</span>
            {admin ? (
              <span className="flex items-center gap-2">
                <select aria-label={`${tx('Role of')} ${s.name}`} className="form-input" value={s.staffRole} onChange={async e => done(await send(`/api/facility/staff/${s.userId}`, 'PATCH', { staffRole: e.target.value }), tx('Role changed.'))}>
                  <option value="admin">{tx('Admin')}</option><option value="staff">{tx('Staff')}</option>
                </select>
                <button type="button" className="btn btn-sm btn-secondary" onClick={async () => done(await send(`/api/facility/staff/${s.userId}`, 'DELETE'), tx('Staff member removed.'))}>{tx('Remove')}</button>
              </span>
            ) : <span className="font-bold">{s.staffRole === 'admin' ? tx('Admin') : tx('Staff')}</span>}
          </li>))}</ul>
        {admin && (
          <form className="grid sm:grid-cols-4 gap-2 items-end" onSubmit={async e => {
            e.preventDefault();
            const r = await send('/api/facility/staff', 'POST', invite);
            if (done(r, tx('Staff account created.'))) { setTemp(r.data.temporaryPassword); setInvite({ name: '', email: '', staffRole: 'staff' }); }
          }}>
            <div><label htmlFor="st-n" className="form-label">{tx('Name')}</label><input id="st-n" className="form-input" value={invite.name} onChange={e => setInvite({ ...invite, name: e.target.value })} required /></div>
            <div><label htmlFor="st-e" className="form-label">{tx('Email')}</label><input id="st-e" type="email" className="form-input" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} required /></div>
            <div><label htmlFor="st-r" className="form-label">{tx('Role')}</label><select id="st-r" className="form-input" value={invite.staffRole} onChange={e => setInvite({ ...invite, staffRole: e.target.value })}><option value="staff">{tx('Staff')}</option><option value="admin">{tx('Admin')}</option></select></div>
            <button type="submit" className="btn btn-sm btn-primary">{tx('Add staff')}</button>
          </form>
        )}
        {temp && <p role="status" className="text-xs font-bold p-3 border bg-amber-50 border-amber-300 text-amber-950">{tx('Temporary password (shown once, give it to the staff member):')} <span className="font-mono select-all">{temp}</span></p>}
      </div>
    </section>
  );
}
