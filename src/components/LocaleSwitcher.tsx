import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { LANGUAGES, REGIONS, setLocale, useLocale, useT, type RegionCode } from '../locale';

interface Props {
  className?: string;
  /** "onColor" for buttons sitting on the coloured app header; "light" for light surfaces. */
  tone?: 'onColor' | 'light';
}

export default function LocaleSwitcher({ className = '', tone = 'light' }: Props) {
  const { lang, region } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const buttonTone = tone === 'onColor'
    ? 'text-white border-transparent bg-white/15 hover:bg-white/25'
    : 'text-[color:var(--t-600)] border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)]';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language and region"
        title="Switch language or audience region (Malaysia / International)"
        className={`h-11 px-3 flex items-center gap-1.5 border rounded-none transition-colors cursor-pointer text-xs font-extrabold uppercase tracking-wider ${buttonTone}`}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span>{region}</span>
        <span className="opacity-40">·</span>
        <span>{lang}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 z-50 bg-white border border-[color:var(--t-200)] shadow-xl text-slate-800 rounded-none overflow-hidden panel-edge">
          <p className="px-3.5 pt-3 pb-1.5 text-xs font-mono font-extrabold uppercase tracking-widest text-[color:var(--t-600)] bg-[color:var(--t-50)] border-b border-[color:var(--t-200)]">
            {t('common.region')} · Audience Mode
          </p>
          <ul role="listbox" aria-label={t('common.region')} className="py-1 border-b border-slate-100">
            {(Object.keys(REGIONS) as RegionCode[]).map(r => (
              <li key={r} role="option" aria-selected={region === r}>
                <button type="button" onClick={() => { setLocale({ region: r }); setOpen(false); }}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-left hover:bg-[color:var(--t-50)] cursor-pointer">
                  <div>
                    <span className="block text-xs font-extrabold text-[color:var(--ink)]">{REGIONS[r].label} ({r})</span>
                    <span className="block text-xs text-slate-500 font-medium">
                      {r === 'MY' ? 'MyKad · Local MYR & FPX/DuitNow' : 'Passport · Medical Tourism & FX'}
                    </span>
                  </div>
                  {region === r && <Check className="h-4 w-4 text-[color:var(--t-600)] shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-3.5 pt-2.5 pb-1 text-xs font-mono font-extrabold uppercase tracking-widest text-slate-500">
            {t('common.language')}
          </p>
          <ul role="listbox" aria-label={t('common.language')} className="pb-1.5">
            {LANGUAGES.map(l => (
              <li key={l.code} role="option" aria-selected={lang === l.code}>
                <button type="button" onClick={() => { setLocale({ lang: l.code }); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left hover:bg-[color:var(--t-50)] cursor-pointer">
                  <span className="w-6 font-mono font-bold uppercase text-slate-400">{l.code}</span>
                  <span className="flex-1 font-bold text-[color:var(--ink)]">{l.label}</span>
                  {lang === l.code && <Check className="h-4 w-4 text-[color:var(--t-600)]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
