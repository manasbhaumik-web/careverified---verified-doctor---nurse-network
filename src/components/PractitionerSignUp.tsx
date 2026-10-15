import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { openLegal } from '../legal';

/** Practitioner account sign-up (shown on the sign-in page). */
export default function PractitionerSignUp({ onSuccess, onCancel }: {
  onSuccess: (user: { id: string; role: 'patient' | 'practitioner' | 'admin' | 'pharmacy'; name: string; email: string; profileId?: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const field = 'w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] placeholder-slate-400 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register-practitioner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, consent }),
      });
      const data = await resp.json();
      if (data.status === 'success') onSuccess(data.data.user);
      else setError(data.message || 'Could not create the account.');
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)]">Create a Practitioner Account</h3>
      <p className="text-sm text-slate-600 mt-1">
        After signing up you will submit your licence details and certificates. You appear in the public registry only once the medical board verifies you.
      </p>
      <form onSubmit={submit} className="space-y-5 mt-7">
        {error && (
          <div className="bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-600)] p-4 flex gap-3 text-xs font-bold">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="pr-name" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Full name (as on licence)</label>
          <input id="pr-name" className={field} value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
        </div>
        <div className="space-y-2">
          <label htmlFor="pr-email" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Email address</label>
          <input id="pr-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className={field} value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label htmlFor="pr-password" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Password</label>
          <input id="pr-password" type="password" className={field} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          <p className="text-[11px] text-slate-500">At least 8 characters, with letters and numbers.</p>
        </div>
        <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[color:var(--t-600)]" required />
          <span>I accept the <button type="button" onClick={() => openLegal('terms')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">Terms of Service</button> and <button type="button" onClick={() => openLegal('notice')} className="underline font-bold text-[color:var(--t-700)] cursor-pointer">Privacy Notice</button>, and agree that my credentials may be checked with the relevant medical council.</span>
        </label>
        <button type="submit" disabled={loading || !consent}
          className="w-full h-12 min-h-[48px] text-sm font-extrabold bg-[color:var(--t-600)] hover:bg-[color:var(--t-800)] text-white shadow-xs disabled:opacity-70 border border-[color:var(--t-800)] cursor-pointer flex items-center justify-center gap-2">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <button type="button" onClick={onCancel} className="w-full text-sm font-bold text-slate-600 hover:underline cursor-pointer">Back to sign in</button>
      </form>
    </div>
  );
}
