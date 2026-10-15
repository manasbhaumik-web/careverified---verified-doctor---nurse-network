import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import LocaleSwitcher from './LocaleSwitcher';
import { loginUrl, navigate, useLocation } from '../nav';
import { getLocale } from '../locale/store';
import { useLocale } from '../locale/store';
import type { LangCode } from '../locale/config';

/** Forgotten password (/forgot-password) and choosing a new one from the emailed link (/reset-password?token=...). */
type Lang = 'en' | 'ms' | 'zh';
const pick = (l: LangCode): Lang => (l === 'ms' || l === 'zh' ? l : 'en');

const T: Record<Lang, Record<string, string>> = {
  en: {
    back: 'Back to sign in', forgotTitle: 'Forgot your password?', forgotIntro: 'Enter the email you signed up with. If an account uses it, we will email you a link to choose a new password.', email: 'Email address',
    send: 'Send reset link', sending: 'Sending…', sentTitle: 'Check your email', sent: 'If an account uses that email, we have sent a link. It works once and expires in 30 minutes. It can take a few minutes to arrive: look in your spam folder too.',
    adminNote: 'Board admin accounts cannot be reset by email. Ask the platform owner.', tryAgain: 'Use a different email',
    resetTitle: 'Choose a new password', resetIntro: 'Use at least 8 characters, with letters and numbers.', password: 'New password', confirm: 'Type it again', mismatch: 'The two passwords do not match.',
    save: 'Save new password', saving: 'Saving…', doneTitle: 'Password changed', done: 'You were signed out everywhere. Sign in with your new password.', signin: 'Sign in',
    badTitle: 'This link is not valid any more', bad: 'Reset links work once and expire after 30 minutes. Ask for a new one.', newLink: 'Ask for a new link', checking: 'Checking your link…', serverError: 'Could not reach the server. Please try again.',
  },
  ms: {
    back: 'Kembali ke log masuk', forgotTitle: 'Lupa kata laluan anda?', forgotIntro: 'Masukkan e-mel yang anda gunakan semasa mendaftar. Jika ada akaun menggunakannya, kami akan menghantar pautan untuk memilih kata laluan baharu.', email: 'Alamat e-mel',
    send: 'Hantar pautan tetapan semula', sending: 'Menghantar…', sentTitle: 'Semak e-mel anda', sent: 'Jika ada akaun menggunakan e-mel itu, kami telah menghantar pautan. Ia hanya boleh digunakan sekali dan tamat dalam 30 minit. Ia mungkin mengambil beberapa minit: semak juga folder spam.',
    adminNote: 'Akaun pentadbir lembaga tidak boleh ditetapkan semula melalui e-mel. Hubungi pemilik platform.', tryAgain: 'Guna e-mel lain',
    resetTitle: 'Pilih kata laluan baharu', resetIntro: 'Gunakan sekurang-kurangnya 8 aksara, dengan huruf dan nombor.', password: 'Kata laluan baharu', confirm: 'Taip semula', mismatch: 'Kedua-dua kata laluan tidak sepadan.',
    save: 'Simpan kata laluan baharu', saving: 'Menyimpan…', doneTitle: 'Kata laluan telah ditukar', done: 'Anda telah dilog keluar di semua tempat. Log masuk dengan kata laluan baharu anda.', signin: 'Log masuk',
    badTitle: 'Pautan ini tidak sah lagi', bad: 'Pautan tetapan semula hanya boleh digunakan sekali dan tamat selepas 30 minit. Minta pautan baharu.', newLink: 'Minta pautan baharu', checking: 'Menyemak pautan anda…', serverError: 'Tidak dapat menghubungi pelayan. Sila cuba lagi.',
  },
  zh: {
    back: '返回登录', forgotTitle: '忘记密码了？', forgotIntro: '请输入您注册时使用的电子邮件。如果有账户使用该邮箱，我们会发送一个设置新密码的链接。', email: '电子邮件',
    send: '发送重置链接', sending: '发送中…', sentTitle: '请查收邮件', sent: '如果有账户使用该邮箱，我们已发送链接。链接只能使用一次，30 分钟后失效。邮件可能需要几分钟才能送达，请也检查垃圾邮件箱。',
    adminNote: '委员会管理员账户无法通过邮件重置，请联系平台所有者。', tryAgain: '使用其他邮箱',
    resetTitle: '设置新密码', resetIntro: '至少 8 个字符，需包含字母和数字。', password: '新密码', confirm: '再输入一次', mismatch: '两次输入的密码不一致。',
    save: '保存新密码', saving: '保存中…', doneTitle: '密码已更改', done: '您已在所有设备上退出登录。请用新密码登录。', signin: '登录',
    badTitle: '此链接已失效', bad: '重置链接只能使用一次，30 分钟后失效。请重新申请。', newLink: '重新申请链接', checking: '正在检查链接…', serverError: '无法连接服务器，请重试。',
  },
};

const label = 'text-xs font-extrabold uppercase tracking-wider text-slate-700 block mb-1.5';
const input = 'w-full bg-white border border-[color:var(--t-200)] px-4 h-12 text-sm font-medium focus:outline-none focus:border-[color:var(--t-600)] focus:ring-1 focus:ring-[color:var(--t-600)]';
const primary = 'w-full h-12 min-h-[48px] text-sm font-extrabold text-white bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] border border-[color:var(--t-700)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60';

export default function AccountRecovery({ mode }: { mode: 'forgot' | 'reset' }) {
  const { lang } = useLocale();
  const tx = T[pick(lang)];
  const { params } = useLocation();
  const token = params.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  // Not indexed, and the tab says where you are.
  useEffect(() => {
    const prev = document.title;
    document.title = (mode === 'forgot' ? tx.forgotTitle : tx.resetTitle) + ' | MedCred';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex'; document.head.appendChild(meta);
    return () => { document.title = prev; meta.remove(); };
  }, [mode, tx.forgotTitle, tx.resetTitle]);

  useEffect(() => {
    if (mode !== 'reset') return;
    if (!token) { setValid(false); return; }
    fetch(`/api/auth/reset-password/check?token=${encodeURIComponent(token)}`).then(r => r.json()).then(d => setValid(!!d?.data?.valid)).catch(() => setValid(false));
  }, [mode, token]);

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, lang: getLocale().lang }) });
      const d = await r.json();
      if (d.status === 'success') setSent(true); else setError(d.message || tx.serverError);
    } catch { setError(tx.serverError); }
    finally { setBusy(false); }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (pw !== pw2) { setError(tx.mismatch); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: pw }) });
      const d = await r.json();
      if (d.status === 'success') setDone(true); else setError(d.message || tx.serverError);
    } catch { setError(tx.serverError); }
    finally { setBusy(false); }
  };

  const alert = error && <div role="alert" className="bg-rose-50 border border-rose-300 text-rose-900 p-3 flex gap-2 text-sm font-bold"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" /><span>{error}</span></div>;

  return (
    <div className="min-h-dvh bg-[color:var(--t-bg)] text-[color:var(--ink)] font-body flex flex-col antialiased">
      <header className="bg-[color:var(--t-50)] border-b border-[color:var(--t-200)]">
        <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} className="font-display font-black text-xl tracking-tight" aria-label="MedCred home">MedCred<span className="text-[color:var(--t-600)]">.</span></a>
          <div className="flex items-center gap-2"><LocaleSwitcher /><ThemeSwitcher /></div>
        </div>
      </header>

      <main id="main-content" className="flex-grow w-full max-w-xl mx-auto px-4 py-8">
        <a href="/login" onClick={e => { e.preventDefault(); navigate(loginUrl('patient')); }} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-[color:var(--t-700)] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{tx.back}</a>

        <div className="mt-3 bg-white border border-[color:var(--t-200)] border-t-2 border-t-[color:var(--t-600)] p-6 sm:p-8">
          {mode === 'forgot' && !sent && (
            <form onSubmit={submitForgot} className="space-y-5">
              <h1 className="font-display font-black text-2xl tracking-tight">{tx.forgotTitle}</h1>
              <p className="text-sm text-slate-700 font-medium">{tx.forgotIntro}</p>
              {alert}
              <div>
                <label htmlFor="fp-email" className={label}>{tx.email}</label>
                <input id="fp-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} className={input} value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} />
              </div>
              <button type="submit" disabled={busy} className={primary}>{busy ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />{tx.sending}</> : tx.send}</button>
              <p className="text-xs text-slate-600">{tx.adminNote}</p>
            </form>
          )}

          {mode === 'forgot' && sent && (
            <div role="status" className="space-y-4">
              <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />{tx.sentTitle}</h1>
              <p className="text-sm text-slate-800 font-medium">{tx.sent}</p>
              <button type="button" onClick={() => { setSent(false); setEmail(''); }} className="min-h-[44px] text-sm font-bold text-[color:var(--t-700)] hover:underline cursor-pointer">{tx.tryAgain}</button>
            </div>
          )}

          {mode === 'reset' && valid === null && <p role="status" className="text-sm text-slate-700">{tx.checking}</p>}

          {mode === 'reset' && valid === false && !done && (
            <div role="alert" className="space-y-4">
              <h1 className="font-display font-black text-2xl tracking-tight">{tx.badTitle}</h1>
              <p className="text-sm text-slate-800 font-medium">{tx.bad}</p>
              <button type="button" onClick={() => navigate('/forgot-password')} className={primary}>{tx.newLink}</button>
            </div>
          )}

          {mode === 'reset' && valid === true && !done && (
            <form onSubmit={submitReset} className="space-y-5">
              <h1 className="font-display font-black text-2xl tracking-tight">{tx.resetTitle}</h1>
              <p className="text-sm text-slate-700 font-medium">{tx.resetIntro}</p>
              {alert}
              <div>
                <label htmlFor="rp-pw" className={label}>{tx.password}</label>
                <input id="rp-pw" type="password" autoComplete="new-password" className={input} value={pw} onChange={e => setPw(e.target.value)} required minLength={8} maxLength={128} />
              </div>
              <div>
                <label htmlFor="rp-pw2" className={label}>{tx.confirm}</label>
                <input id="rp-pw2" type="password" autoComplete="new-password" className={input} value={pw2} onChange={e => setPw2(e.target.value)} required minLength={8} maxLength={128} />
              </div>
              <button type="submit" disabled={busy} className={primary}>{busy ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />{tx.saving}</> : tx.save}</button>
            </form>
          )}

          {mode === 'reset' && done && (
            <div role="status" className="space-y-4">
              <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />{tx.doneTitle}</h1>
              <p className="text-sm text-slate-800 font-medium">{tx.done}</p>
              <button type="button" onClick={() => navigate(loginUrl('patient'))} className={primary}>{tx.signin}</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
