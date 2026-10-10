import React, { useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import { bannerPrimaryBtn } from '../DashboardHeader';
import { btnDanger, fieldLabel, jfetch } from './shared';

/** Two-factor sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy...). */
export default function SecurityCard({ twoFactor, email, onChanged }: { twoFactor: { enabled: boolean; required: boolean }; email: string; onChanged: () => void }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true); setMsg(null);
    const d = await jfetch('/api/pharmacy/2fa/setup', 'POST');
    setBusy(false);
    if (d.status !== 'success') return setMsg({ ok: false, text: d.message || 'Could not start the setup.' });
    const qr = await QRCode.toDataURL(d.data.otpauthUrl, { margin: 1, width: 180 }).catch(() => '');
    setSetup({ secret: d.data.secret, qr });
  };
  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await jfetch('/api/pharmacy/2fa/enable', 'POST', { code });
    setBusy(false);
    if (d.status === 'success') { setSetup(null); setCode(''); setMsg({ ok: true, text: 'Two-factor sign-in is on.' }); onChanged(); }
    else setMsg({ ok: false, text: d.message || 'That code is not correct.' });
  };
  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const d = await jfetch('/api/pharmacy/2fa/disable', 'POST', { password, code });
    setBusy(false);
    if (d.status === 'success') { setPassword(''); setCode(''); setMsg({ ok: true, text: 'Two-factor sign-in is off.' }); onChanged(); }
    else setMsg({ ok: false, text: d.message || 'Could not turn it off.' });
  };

  return (
    <section aria-label="Two-factor sign-in" className="bg-white border border-[color:var(--t-200)] shadow-xs p-5 space-y-4 min-w-0">
      <div>
        <h2 className="text-sm font-extrabold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" /> Two-factor sign-in</h2>
        <p className="text-[12px] text-slate-600 mt-0.5">
          {twoFactor.enabled
            ? 'On. Signing in needs your password and a 6-digit code from your authenticator app.'
            : 'Adds a 6-digit code from an authenticator app to your password, so a stolen password alone cannot open patient prescriptions.'}
          {twoFactor.required && ' It is required for pharmacy accounts.'}
        </p>
      </div>

      {!twoFactor.enabled && !setup && (
        <button type="button" onClick={start} disabled={busy} className={bannerPrimaryBtn}>Set up two-factor sign-in</button>
      )}

      {!twoFactor.enabled && setup && (
        <form onSubmit={enable} className="space-y-3">
          <ol className="text-[13px] text-slate-700 space-y-1 list-decimal ml-5">
            <li>Open your authenticator app and add an account by scanning this code.</li>
            <li>Type the 6-digit code it shows for {email}.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-4">
            {setup.qr && <img src={setup.qr} alt="QR code to add MedCred to your authenticator app" width={150} height={150} className="border border-[color:var(--t-200)] bg-white" />}
            <p className="text-[12px] text-slate-600 min-w-0">Cannot scan? Enter this key instead:<br /><span className="font-mono font-bold text-[color:var(--ink)] [overflow-wrap:anywhere]">{setup.secret}</span></p>
          </div>
          <label className="block"><span className={fieldLabel}>6-digit code</span>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required className="form-input w-full font-mono tracking-widest" /></label>
          <button type="submit" disabled={busy || code.length !== 6} className={bannerPrimaryBtn}>Turn on</button>
        </form>
      )}

      {twoFactor.enabled && !twoFactor.required && (
        <form onSubmit={disable} className="space-y-3">
          <p className="text-[12px] text-slate-600">To turn it off, confirm with your password and a current code.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className={fieldLabel}>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="form-input w-full" /></label>
            <label className="block"><span className={fieldLabel}>6-digit code</span><input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" required className="form-input w-full font-mono tracking-widest" /></label>
          </div>
          <button type="submit" disabled={busy} className={btnDanger}>Turn off two-factor sign-in</button>
        </form>
      )}

      {msg && <p role="status" className={`text-xs font-bold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
    </section>
  );
}
