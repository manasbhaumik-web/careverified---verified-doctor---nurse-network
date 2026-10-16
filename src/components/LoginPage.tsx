import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, Building, Heart, PlusCircle, Pill, RefreshCw, Zap, ShieldCheck, Globe } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import Footer from './Footer';
import PatientRegistrationForm from './PatientRegistrationForm';
import PractitionerSignUp from './PractitionerSignUp';
import { loginUrl, navigate, useLocation, type PortalRole } from '../nav';
import { useLocale, type LangCode } from '../locale';

type SessionUser = { id: string; role: PortalRole; name: string; email: string; avatarUrl?: string; profileId?: string | null };
type DemoAccounts = Partial<Record<PortalRole, { label: string; email: string; password: string }>>;

type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const ROLE_ICONS: Record<PortalRole, React.ComponentType<{ className?: string }>> = {
  patient: Heart,
  practitioner: PlusCircle,
  pharmacy: Pill,
  admin: Building,
};

const COPY: Record<Lang, {
  skip: string;
  backHome: string;
  createTitle: string;
  signInTitle: string;
  subtitle: string;
  yourRole: string;
  roles: Record<PortalRole, { label: string; desc: string; portal: string; who: string }>;
  signInAs: (who: string) => string;
  enterCreds: string;
  emailLabel: string;
  passwordLabel: string;
  forgotPassword: string;
  authCodeLabel: string;
  signingIn: string;
  signInTo: (portal: string) => string;
  pharmacyNote: string;
  needAccount: string;
  registerPatient: string;
  registerPractitioner: string;
  patientTrustBadges: string[];
  fillForm: string;
  oneClickDemo: string;
}> = {
  en: {
    skip: 'Skip to content',
    backHome: 'Back to home',
    createTitle: 'Create your account',
    signInTitle: 'Sign in to MedCred',
    subtitle: 'Choose your role first. Patients may register using either a Malaysian MyKad or an International Passport.',
    yourRole: 'Your role',
    roles: {
      patient: { label: 'Patient / Member', desc: 'MyKad & Passport intake, consults & e-Rx', portal: 'Member Portal', who: 'a Patient / Member' },
      practitioner: { label: 'Practitioner', desc: 'MMC / LJM verification & clinical shifts', portal: 'Practitioner Hub', who: 'a Practitioner' },
      pharmacy: { label: 'Pharmacy', desc: 'QR e-prescription inbox & dispensing logs', portal: 'Pharmacy Workspace', who: 'a Pharmacy' },
      admin: { label: 'Board Admin', desc: 'Licence audit & platform governance', portal: 'Board Admin Console', who: 'a Board Admin' },
    },
    signInAs: who => `Sign in as ${who}`,
    enterCreds: 'Enter your registered email address and password.',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot your password?',
    authCodeLabel: 'Authenticator code',
    signingIn: 'Signing in…',
    signInTo: portal => `Sign in to ${portal}`,
    pharmacyNote: 'Pharmacy accounts are provisioned after LFM & Poison Licence verification. Visit /for-pharmacies or contact the board to onboard.',
    needAccount: 'Need a new account?',
    registerPatient: 'Register as a New Patient (MyKad or Passport)',
    registerPractitioner: 'Create a Practitioner Account (MMC / LJM)',
    patientTrustBadges: ['Malaysian MyKad Accepted', 'International Passport Accepted', 'PDPA 2010 Protected'],
    fillForm: 'Fill form',
    oneClickDemo: 'One-click demo',
  },
  ms: {
    skip: 'Langkau ke kandungan',
    backHome: 'Kembali ke laman utama',
    createTitle: 'Cipta akaun anda',
    signInTitle: 'Log masuk ke MedCred',
    subtitle: 'Pilih peranan anda terlebih dahulu. Pesakit boleh mendaftar menggunakan MyKad Malaysia atau Pasport Antarabangsa.',
    yourRole: 'Peranan anda',
    roles: {
      patient: { label: 'Pesakit / Ahli', desc: 'Pendaftaran MyKad & Pasport, konsultasi & e-Rx', portal: 'Portal Ahli', who: 'Pesakit / Ahli' },
      practitioner: { label: 'Pengamal Perubatan', desc: 'Pengesahan MMC / LJM & syif klinikal', portal: 'Hab Pengamal', who: 'Pengamal Perubatan' },
      pharmacy: { label: 'Farmasi', desc: 'Peti masuk e-preskripsi QR & rekod dispens', portal: 'Ruang Kerja Farmasi', who: 'Farmasi' },
      admin: { label: 'Pentadbir Lembaga', desc: 'Audit lesen & tadbir urus platform', portal: 'Konsol Pentadbir', who: 'Pentadbir Lembaga' },
    },
    signInAs: who => `Log masuk sebagai ${who}`,
    enterCreds: 'Masukkan alamat e-mel dan kata laluan berdaftar anda.',
    emailLabel: 'Alamat e-mel',
    passwordLabel: 'Kata laluan',
    forgotPassword: 'Lupa kata laluan anda?',
    authCodeLabel: 'Kod pengesah (6 digit)',
    signingIn: 'Sedang log masuk…',
    signInTo: portal => `Log masuk ke ${portal}`,
    pharmacyNote: 'Akaun farmasi disediakan selepas semakan lesen LFM & Lesen Racun. Layari /for-pharmacies atau hubungi lembaga.',
    needAccount: 'Perlukan akaun baharu?',
    registerPatient: 'Daftar sebagai Pesakit Baharu (MyKad atau Pasport)',
    registerPractitioner: 'Cipta Akaun Pengamal Perubatan (MMC / LJM)',
    patientTrustBadges: ['MyKad Malaysia Diterima', 'Pasport Antarabangsa Diterima', 'Dilindungi PDPA 2010'],
    fillForm: 'Isi borang',
    oneClickDemo: 'Demo satu klik',
  },
  zh: {
    skip: '跳到主要内容',
    backHome: '返回首页',
    createTitle: '创建您的 MedCred 账户',
    signInTitle: '登录 MedCred 平台',
    subtitle: '请先选择您的身份角色。本地及国际患者均可凭马来西亚 MyKad 或国际护照快速注册。',
    yourRole: '您的角色',
    roles: {
      patient: { label: '患者 / 会员', desc: '支持 MyKad 与国际护照、问诊及电子处方', portal: '患者会员中心', who: '患者 / 会员' },
      practitioner: { label: '执业医护人员', desc: 'MMC / LJM 执照核验与临床排班', portal: '医护工作台', who: '执业医护人员' },
      pharmacy: { label: '社区药房', desc: '二维码电子处方核验与调配记录', portal: '药房工作台', who: '认证药房' },
      admin: { label: '委员会管理员', desc: '法定执照审核与平台合规管理', portal: '管理控制台', who: '委员会管理员' },
    },
    signInAs: who => `以${who}身份登录`,
    enterCreds: '请输入您的注册邮箱与密码。',
    emailLabel: '电子邮箱',
    passwordLabel: '登录密码',
    forgotPassword: '忘记密码？',
    authCodeLabel: '双重验证码 (6位)',
    signingIn: '正在登录…',
    signInTo: portal => `进入${portal}`,
    pharmacyNote: '药房账户需经委员会核实药剂师执照与毒药执照后开通。请访问 /for-pharmacies 或联系委员会。',
    needAccount: '还没有账户？',
    registerPatient: '注册新患者账户（支持 MyKad 或国际护照）',
    registerPractitioner: '创建执业医护账户（MMC / LJM）',
    patientTrustBadges: ['支持马来西亚 MyKad', '支持国际护照 (Passport)', 'PDPA 2010 隐私保护'],
    fillForm: '填入演示账号',
    oneClickDemo: '一键演示登录',
  },
};

const ROLE_KEYS: PortalRole[] = ['patient', 'practitioner', 'pharmacy', 'admin'];
const isRole = (v: string | null): v is PortalRole => v === 'patient' || v === 'practitioner' || v === 'pharmacy' || v === 'admin';

const inputCls = 'w-full bg-white border border-[color:var(--t-200)] rounded-none px-4 h-12 text-sm font-medium text-[color:var(--ink)] placeholder-slate-500 focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)] transition-all';

/**
 * Sign in and sign up. The role and the sign-up form come from the address (/login?role=practitioner&register=1),
 * so the back button, a bookmark and links from the landing page all behave. Demo sign-in is offered only when the
 * server says demo mode is on (never in production).
 */
export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: (user: SessionUser, patient?: unknown) => void }) {
  const { params } = useLocation();
  const { lang } = useLocale();
  const L = pick(lang);
  const tx = COPY[L];

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
    document.title = registering ? `${tx.createTitle} | MedCred` : `${tx.signInTitle} | MedCred`;
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.title = prevTitle; meta.remove(); };
  }, [registering, tx.createTitle, tx.signInTitle]);

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
  const roleCopy = tx.roles[role];

  return (
    <div id="login-page" className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-[color:var(--t-700)] focus:px-4 focus:py-2 focus:border focus:border-[color:var(--t-600)] focus:font-bold">{tx.skip}</a>

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
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tx.backHome}
        </a>

        <div className="mt-2 mb-6">
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[color:var(--ink)]">{registering ? tx.createTitle : tx.signInTitle}</h1>
          <p className="text-sm sm:text-base text-slate-700 font-medium mt-1">{tx.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] bg-white panel-edge">
          <div className="p-5 bg-[color:var(--t-50)] md:border-r border-b md:border-b-0 border-[color:var(--t-200)]">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] mb-3" id="role-label">{tx.yourRole}</p>
            <div role="group" aria-labelledby="role-label" className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
              {ROLE_KEYS.map(key => {
                const active = role === key;
                const Icon = ROLE_ICONS[key];
                const r = tx.roles[key];
                return (
                  <button key={key} type="button" onClick={() => pickRole(key)} aria-pressed={active}
                    className={`p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-start items-center text-center md:text-left gap-3 border ${active ? 'bg-[color:var(--t-600)] border-[color:var(--t-700)] text-white' : 'bg-white border-[color:var(--t-200)] text-[color:var(--ink)] hover:bg-[color:var(--t-100)]'}`}>
                    <Icon className="h-5 w-5 shrink-0 md:mt-0.5" aria-hidden="true" />
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
            {role === 'patient' && (
              <div className="mb-5 pb-4 border-b border-[color:var(--t-100)] flex flex-wrap items-center gap-2">
                {tx.patientTrustBadges.map((b, i) => (
                  <span key={b} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[color:var(--t-50)] border border-[color:var(--t-200)] text-xs font-bold text-[color:var(--ink)]">
                    {i === 1 ? <Globe className="h-3.5 w-3.5 text-[color:var(--t-600)]" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                    {b}
                  </span>
                ))}
              </div>
            )}

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
                  <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-[color:var(--ink)]">{tx.signInAs(roleCopy.who)}</h2>
                  <p className="text-sm text-slate-700 mt-1">{tx.enterCreds}</p>

                  <form onSubmit={submit} className="space-y-5 mt-6">
                    {error && (
                      <div role="alert" className="bg-[color:var(--t-100)] border border-[color:var(--t-200)] text-[color:var(--t-800)] p-4 flex gap-3 text-xs font-bold">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">{tx.emailLabel}</label>
                      <input id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                        enterKeyHint="next" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} required />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">{tx.passwordLabel}</label>
                      <input id="login-password" type="password" autoComplete="current-password" enterKeyHint="go" placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} className={inputCls} required />
                    </div>
                    {role !== 'admin' && (
                      <p className="-mt-2"><a href="/forgot-password" onClick={e => { e.preventDefault(); navigate('/forgot-password'); }} className="inline-block py-2 text-xs font-bold text-[color:var(--t-700)] hover:underline">{tx.forgotPassword}</a></p>
                    )}
                    {needsCode && (
                      <div className="space-y-2">
                        <label htmlFor="login-code" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">{tx.authCodeLabel}</label>
                        <input id="login-code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={code} autoFocus required
                          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputCls} font-mono tracking-widest`} />
                      </div>
                    )}
                    <button type="submit" disabled={loading}
                      className="w-full h-12 min-h-[48px] text-sm font-extrabold transition-all cursor-pointer flex justify-center items-center gap-2 bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white shadow-xs disabled:opacity-70 border border-[color:var(--t-700)]">
                      {loading ? (<><RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />{tx.signingIn}</>) : (<>{tx.signInTo(roleCopy.portal)}<ArrowRight className="h-5 w-5" aria-hidden="true" /></>)}
                    </button>
                  </form>

                  {role === 'pharmacy' && <p className="pt-6 text-center text-sm text-slate-700">{tx.pharmacyNote}</p>}
                  {(role === 'patient' || role === 'practitioner') && (
                    <p className="pt-6 text-center text-sm text-slate-700">
                      {tx.needAccount}{' '}
                      <button type="button" onClick={() => setRegistering(true)} className="inline-block py-2 text-[color:var(--t-700)] hover:underline font-extrabold cursor-pointer">
                        {role === 'patient' ? tx.registerPatient : tx.registerPractitioner}
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
                          className="px-3 min-h-[40px] bg-white border border-[color:var(--t-200)] hover:bg-[color:var(--t-100)] text-[color:var(--ink)] font-bold cursor-pointer">{tx.fillForm}</button>
                        <button type="button" onClick={() => demoSignIn(role)} disabled={loading}
                          className="px-3 min-h-[40px] bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white font-extrabold cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" aria-hidden="true" />{tx.oneClickDemo}</button>
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
