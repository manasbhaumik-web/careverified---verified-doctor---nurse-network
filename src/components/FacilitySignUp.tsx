import React, { useState } from 'react';
import { useTr } from '../locale';
import BrandLogo from '../shared/ui/BrandLogo';
import { navigate } from '../nav';

/**
 * Hospital or clinic registration. The facility can sign in and complete its profile straight away,
 * but it stays hidden from the public until the board checks the licence and approves it.
 */
export default function FacilitySignUp() {
  const tx = useTr();
  const [f, setF] = useState({ facilityName: '', kind: 'clinic', city: '', state: '', address: '', phone: '', licenceNo: '', contactName: '', email: '', password: '', consent: false });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    const r = await fetch('/api/auth/register-facility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }).then(x => x.json()).catch(() => null);
    setBusy(false);
    if (r?.status === 'success') window.location.assign('/'); // reload so the new session is picked up
    else setMsg(r?.message || tx('Could not register.'));
  };

  const field = (k: keyof typeof f, label: string, type = 'text', required = true) => (
    <div><label htmlFor={`fs-${String(k)}`} className="form-label">{tx(label)}{required ? ' *' : ''}</label><input id={`fs-${String(k)}`} type={type} className="form-input" required={required} value={f[k] as string} onChange={e => set(k, e.target.value)} /></div>
  );

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-10">
      <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} aria-label={tx('MediCred home')} className="mb-6"><BrandLogo tone="light" size="lg" /></a>
      <form onSubmit={submit} className="page-w max-w-2xl bg-white border border-[color:var(--t-200)] p-6 space-y-4">
        <h1 className="font-display font-black text-xl text-[color:var(--ink)]">{tx('Register your hospital or clinic')}</h1>
        <p className="text-xs text-slate-700">{tx('The board checks your facility licence before your profile is public. You can complete your profile while you wait.')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field('facilityName', 'Facility name')}
          <div><label htmlFor="fs-kind" className="form-label">{tx('Type')}</label><select id="fs-kind" className="form-input" value={f.kind} onChange={e => set('kind', e.target.value)}><option value="clinic">{tx('Clinic')}</option><option value="hospital">{tx('Hospital')}</option></select></div>
          {field('licenceNo', 'Facility licence number')}
          {field('phone', 'Phone', 'tel', false)}
          {field('city', 'City', 'text', false)}
          {field('state', 'State', 'text', false)}
          <div className="sm:col-span-2">{field('address', 'Address', 'text', false)}</div>
          {field('contactName', 'Your name')}
          {field('email', 'Email', 'email')}
          {field('password', 'Password', 'password')}
        </div>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={f.consent} onChange={e => set('consent', e.target.checked)} required className="mt-0.5" /><span>{tx('I accept the Terms and Privacy Policy.')}</span></label>
        {msg && <p role="alert" className="text-xs font-bold p-3 border text-rose-900 bg-rose-50 border-rose-200">{msg}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary">{busy ? tx('Registering…') : tx('Register facility')}</button>
      </form>
    </main>
  );
}
