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
    <section aria-label="Two-factor sign-in" className="bg-white border border-[color:var(--t-200)] rounded-none p-6 space-y-5 min-w-0">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--t-600)]" /> Two-Factor Authentication (TOTP)</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          {twoFactor.enabled
            ? 'Active. Signing in requires your primary credentials and a rotating 6-digit cryptographic authenticator code.'
            : 'Enforces a 6-digit TOTP code verification to prevent unauthorized prescription tampering from compromised passwords.'}
          {twoFactor.required && ' Mandatory clinical compliance standard for community pharmacy accounts.'}
        </p>
      </div>

      {!twoFactor.enabled && !setup && (
        <button type="button" onClick={start} disabled={busy} className={bannerPrimaryBtn}>Initialize Two-Factor Authentication</button>
      )}

      {!twoFactor.enabled && setup && (
        <form onSubmit={enable} className="space-y-4 bg-slate-50 border border-slate-250 p-4 rounded-none">
          <ol className="text-xs text-slate-700 font-semibold space-y-1.5 list-decimal ml-5">
            <li>Open an approved authenticator application (Google Authenticator, Microsoft Authenticator, or Aegis).</li>
            <li>Scan the encrypted QR code or enter the key manually for {email}.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-4 bg-white p-3 border border-slate-250">
            {setup.qr && <img src={setup.qr} alt="QR code to add MedCred to your authenticator app" width={140} height={140} className="border border-slate-300 bg-white rounded-none" />}
            <div className="text-xs text-slate-600 min-w-0 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">Manual Configuration Key:</span>
              <span className="font-mono font-bold text-2xs text-[color:var(--ink)] bg-slate-100 border border-slate-300 px-2 py-1 block [overflow-wrap:anywhere]">{setup.secret}</span>
            </div>
          </div>
          <label className="block"><span className={fieldLabel}>Verification 6-Digit Code</span>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required className="h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white text-base font-mono font-bold tracking-widest text-slate-900 outline-none focus:border-[color:var(--t-600)]" placeholder="000000" /></label>
          <button type="submit" disabled={busy || code.length !== 6} className={bannerPrimaryBtn}>Verify & Activate 2FA</button>
        </form>
      )}

      {twoFactor.enabled && !twoFactor.required && (
        <form onSubmit={disable} className="space-y-4 bg-slate-50 border border-slate-250 p-4 rounded-none">
          <p className="text-xs text-slate-600 font-semibold">To disable two-factor authentication, confirm with your password and a current TOTP token.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className={fieldLabel}>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white text-xs font-semibold text-slate-900 outline-none focus:border-[color:var(--t-600)]" /></label>
            <label className="block"><span className={fieldLabel}>Current 6-digit token</span><input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" required className="h-12 w-full border border-slate-300 rounded-none px-3.5 bg-white font-mono font-bold tracking-widest text-slate-900 outline-none focus:border-[color:var(--t-600)]" placeholder="000000" /></label>
          </div>
          <button type="submit" disabled={busy} className={btnDanger}>Deactivate Two-Factor</button>
        </form>
      )}

      {msg && <p role="status" className={`text-xs font-bold p-3 border rounded-none ${msg.ok ? 'text-emerald-900 bg-emerald-50 border-emerald-300' : 'text-rose-900 bg-rose-50 border-rose-300'}`}>{msg.text}</p>}
    </section>
  );
}
