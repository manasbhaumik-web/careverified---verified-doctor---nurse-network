import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, Building, Heart, PlusCircle, Pill, RefreshCw, Zap } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import PatientRegistrationForm from './PatientRegistrationForm';
import PractitionerSignUp from './PractitionerSignUp';
import { loginUrl, navigate, useLocation, type PortalRole } from '../nav';

type SessionUser = { id: string; role: PortalRole; name: string; email: string; avatarUrl?: string; profileId?: string | null };
type DemoAccounts = Partial<Record<PortalRole, { label: string; email: string; password: string }>>;

const ROLES: { key: PortalRole; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'patient', label: 'Member', desc: 'Vitals, appointments & e-prescriptions', icon: Heart },
  { key: 'practitioner', label: 'Practitioner', desc: 'Credential verification & clinical shifts', icon: PlusCircle },
  { key: 'pharmacy', label: 'Pharmacy', desc: 'Prescription inbox, records & reports', icon: Pill },
  { key: 'admin', label: 'Board Admin', desc: 'Licence audit & platform management', icon: Building },
];
const isRole = (v: string | null): v is PortalRole => v === 'patient' || v === 'practitioner' || v === 'pharmacy' || v === 'admin';
const PORTAL_NAME: Record<PortalRole, string> = { patient: 'Member Portal', practitioner: 'Practitioner Hub', pharmacy: 'Pharmacy Workspace', admin: 'Board Admin Console' };
const WHO: Record<PortalRole, string> = { patient: 'a Member', practitioner: 'a Practitioner', pharmacy: 'a Pharmacy', admin: 'a Board Admin' };

const inputCls = 'w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] placeholder-slate-500 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

/**
 * Sign in and sign up. The role and the sign-up form come from the address (/login?role=practitioner&register=1),
 * so the back button, a bookmark and links from the landing page all behave. Demo sign-in is offered only when the
 * server says demo mode is on (never in production).
 */
export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: SessionUser, patient?: unknown) => void }) {
  const { params } = useLocation();
  const role: PortalRole = isRole(params.get('role')) ? (params.get('role') as PortalRole) : 'patient';
  const registering = params.get('register') === '1' && (role === 'patient' || role === 'practitioner');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  const [demo, setDemo] = useState<DemoAccounts | null>(null);

  useEffect(() => {
    fetch('/api/auth/options').then(r => r.json()).then(d => {
      if (d?.status === 'success' && d.data.demoLogin && d.data.demoAccounts) setDemo(d.data.demoAccounts);
    }).catch(() => {});
  }, []);

  // A sign-in page should not be indexed, and the tab should say where you are.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = registering ? 'Create an account | MedCred' : 'Sign in | MedCred';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.title = prevTitle; meta.remove(); };
  }, [registering]);

  const pickRole = (r: PortalRole) => { setError(''); setNeedsCode(false); setCode(''); navigate(loginUrl(r), { replace: true, scrollTop: false }); };
  const setRegistering = (on: boolean) => { setError(''); navigate(loginUrl(role, on), { replace: true, scrollTop: false }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, ...(needsCode ? { code } : {}) }),
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setPassword(''); setNeedsCode(false); setCode('');
        onLoginSuccess(data.data.user, data.data.patient);
      } else {
        if (data.needsCode) setNeedsCode(true);
        setError(data.message || 'Sign in failed.');
      }
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoSignIn = async (r: PortalRole) => {
    setError(''); setLoading(true);
    try {
      const resp = await fetch('/api/auth/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: r }) });
      const data = await resp.json();
      if (data.status === 'success') onLoginSuccess(data.data.user, data.data.patient);
      else setError(data.message || 'Demo sign-in is not available.');
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoForRole = demo?.[role];

  return (
    <div id="login-page" className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">Skip to content</a>

      <header className="sticky top-0 z-40 bg-[color:var(--t-50)]/95 backdrop-blur-md border-b border-[color:var(--t-200)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="flex items-center gap-2.5 min-w-0" aria-label="MedCred home">
            <span className="w-9 h-9 shrink-0 bg-[color:var(--t-600)] flex items-center justify-center text-white border border-[color:var(--t-700)]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
            </span>
            <span className="font-display font-black text-xl tracking-tight text-[color:var(--ink)]">MedCred<span className="text-[color:var(--t-600)]">.</span></span>
          </a>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-[color:var(--t-700)] hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
        </a>

        <div className="mt-2 mb-6">
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)]">{registering ? 'Create your account' : 'Sign in to MedCred'}</h1>
          <p className="text-sm sm:text-base text-slate-700 font-medium mt-1">Choose your role first. Each role has its own sign-in.</p>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] bg-white border-t-2 border-t-[color:var(--t-600)] border-x border-b border-[color:var(--t-200)] shadow-md">
          <div className="p-5 bg-[color:var(--t-50)] md:border-r border-b md:border-b-0 border-[color:var(--t-200)]">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-3" id="role-label">Your role</p>
            <div role="group" aria-labelledby="role-label" className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
              {ROLES.map(r => {
                const active = role === r.key;
                return (
                  <button key={r.key} type="button" onClick={() => pickRole(r.key)} aria-pressed={active}
                    className={`p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-start items-center text-center md:text-left gap-3 border ${active ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white' : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'}`}>
                    <r.icon className="h-5 w-5 shrink-0 md:mt-0.5" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold">{r.label}</span>
                      <span className={`hidden md:block text-xs mt-0.5 leading-snug ${active ? 'text-white' : 'text-slate-600'}`}>{r.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 sm:p-10 min-w-0 bg-white">
            <AnimatePresence mode="wait">
              {registering && role === 'patient' ? (
                <motion.div key="register" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                  <PatientRegistrationForm onRegisterSuccess={(user, patient) => onLoginSuccess(user as SessionUser, patient)} onCancel={() => setRegistering(false)} />
                </motion.div>
              ) : registering && role === 'practitioner' ? (
                <motion.div key="register-practitioner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                  <PractitionerSignUp onSuccess={user => onLoginSuccess(user as SessionUser)} onCancel={() => setRegistering(false)} />
                </motion.div>
              ) : (
                <motion.div key={`login-${role}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                  <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-[color:var(--ink)]">Sign in as {WHO[role]}</h2>
                  <p className="text-sm text-slate-700 mt-1">Enter your email and password.</p>

                  <form onSubmit={submit} className="space-y-5 mt-6">
                    {error && (
                      <div role="alert" className="bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-800)] p-4 flex gap-3 text-xs font-bold">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Email address</label>
                      <input id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                        enterKeyHint="next" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Password</label>
                      <input id="login-password" type="password" autoComplete="current-password" enterKeyHint="go" placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} className={inputCls} required />
                    </div>
                    {role !== 'admin' && (
                      <p className="-mt-2"><a href="/forgot-password" onClick={e => { e.preventDefault(); navigate('/forgot-password'); }} className="inline-block py-2 text-xs font-bold text-[color:var(--t-700)] hover:underline">Forgot your password?</a></p>
                    )}
                    {needsCode && (
                      <div className="space-y-2">
                        <label htmlFor="login-code" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">Authenticator code</label>
                        <input id="login-code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={code} autoFocus required
                          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputCls} font-mono tracking-widest`} />
                      </div>
                    )}
                    <button type="submit" disabled={loading}
                      className="w-full h-12 min-h-[48px] text-sm font-extrabold transition-all cursor-pointer flex justify-center items-center gap-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white shadow-xs disabled:opacity-70 border border-[color:var(--t-700)]">
                      {loading ? (<><RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />Signing in…</>) : (<>Sign in to {PORTAL_NAME[role]}<ArrowRight className="h-5 w-5" aria-hidden="true" /></>)}
                    </button>
                  </form>

                  {role === 'pharmacy' && <p className="pt-6 text-center text-sm text-slate-700">Pharmacy accounts are created by the MedCred board. To register your pharmacy, contact the board.</p>}
                  {(role === 'patient' || role === 'practitioner') && (
                    <p className="pt-6 text-center text-sm text-slate-700">
                      Need a new account?{' '}
                      <button type="button" onClick={() => setRegistering(true)} className="inline-block py-2 text-[color:var(--t-700)] hover:underline font-extrabold cursor-pointer">
                        {role === 'patient' ? 'Register as a New Member' : 'Create a Practitioner Account'}
                      </button>
                    </p>
                  )}

                  {/* Demo mode only: the server sends these accounts only when demo mode is on, never in production */}
                  {demoForRole && (
                    <div className="mt-6 p-3.5 bg-[color:var(--t-50)] border border-dashed border-[color:var(--t-200)] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-extrabold uppercase tracking-wider text-[10px] text-[color:var(--t-700)] block">Demo mode: {demoForRole.label}</span>
                        <span className="font-mono text-slate-800 break-all">{demoForRole.email} / {demoForRole.password}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => { setEmail(demoForRole.email); setPassword(demoForRole.password); setError(''); }}
                          className="px-3 min-h-[40px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--ink)] font-bold cursor-pointer">Fill form</button>
                        <button type="button" onClick={() => demoSignIn(role)} disabled={loading}
                          className="px-3 min-h-[40px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-extrabold cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" aria-hidden="true" />One-click demo</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer variant="landing" onLoginRole={(r, reg) => navigate(loginUrl(r, !!reg))} />
    </div>
  );
}
