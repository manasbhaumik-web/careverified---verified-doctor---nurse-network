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
    ? 'text-white border-transparent hover:bg-white/15'
    : 'text-[color:var(--t-600)] border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)]';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language and region"
        title="Language and region"
        className={`h-11 px-2.5 flex items-center gap-1.5 border rounded-lg transition-colors cursor-pointer text-xs font-bold uppercase ${buttonTone}`}
      >
        <Globe className="h-[18px] w-[18px]" />{lang}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 z-50 bg-white border border-[color:var(--t-200)] shadow-lg text-slate-800 rounded-lg overflow-hidden">
          <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('common.language')}</p>
          <ul role="listbox" aria-label={t('common.language')}>
            {LANGUAGES.map(l => (
              <li key={l.code} role="option" aria-selected={lang === l.code}>
                <button type="button" onClick={() => { setLocale({ lang: l.code }); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[color:var(--t-50)] cursor-pointer">
                  <span className="flex-1 font-medium">{l.label}</span>
                  {lang === l.code && <Check className="h-4 w-4 text-[color:var(--t-600)]" />}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-t border-slate-100">{t('common.region')}</p>
          <ul role="listbox" aria-label={t('common.region')} className="pb-1.5">
            {(Object.keys(REGIONS) as RegionCode[]).map(r => (
              <li key={r} role="option" aria-selected={region === r}>
                <button type="button" onClick={() => { setLocale({ region: r }); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-[color:var(--t-50)] cursor-pointer">
                  <span className="flex-1 font-medium">{REGIONS[r].label}</span>
                  {region === r && <Check className="h-4 w-4 text-[color:var(--t-600)]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
