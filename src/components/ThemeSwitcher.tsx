import React, { useEffect, useRef, useState } from 'react';
import { Settings, Check } from 'lucide-react';
import { useTr } from '../locale';

export type ThemeName = 'light-cyan' | 'sky' | 'crimson';

const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'light-cyan', label: 'Light Cyan', swatch: '#06B6D4' },
  { id: 'sky', label: 'Sky Blue', swatch: '#0270A9' },
  { id: 'crimson', label: 'Crimson Red', swatch: '#C81E1E' },
];

const STORAGE_KEY = 'medcred-theme-v2';

function readTheme(): ThemeName {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'light-cyan' || t === 'sky' || t === 'crimson') return t;
  } catch { /* storage unavailable */ }
  return 'light-cyan';
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  const color = THEMES.find(t => t.id === theme)?.swatch;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color || '#06B6D4');
}

interface Props {
  className?: string;
  /** "onColor" for buttons sitting on the coloured app header; "light" for light surfaces. */
  tone?: 'onColor' | 'light';
}

export default function ThemeSwitcher({ className = '', tone = 'light' }: Props) {
  const tx = useTr();
  const [theme, setTheme] = useState<ThemeName>(readTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  // Keep multiple mounted switchers (landing page + app header) in sync
  useEffect(() => {
    const onChange = (e: Event) => setTheme((e as CustomEvent<ThemeName>).detail);
    window.addEventListener('medcred-theme', onChange);
    return () => window.removeEventListener('medcred-theme', onChange);
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (id: ThemeName) => {
    setTheme(id);
    window.dispatchEvent(new CustomEvent('medcred-theme', { detail: id }));
    setOpen(false);
  };

  const buttonTone = tone === 'onColor'
    ? 'text-white border-white/25 hover:border-white/50 bg-white/10 hover:bg-white/20'
    : 'text-slate-700 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={tx('Settings: application theme')}
        title={tx('Settings')}
        className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-white/40 ${buttonTone}`}
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-white border border-slate-200 shadow-xl text-slate-800 rounded-none overflow-hidden panel-edge">
          <p className="px-3.5 py-2 text-2xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] bg-[color:var(--t-50)] border-b border-slate-200">
            {tx('Application theme')}
          </p>
          <ul role="listbox" aria-label={tx('Application theme')} className="py-1">
            {THEMES.map(t => (
              <li key={t.id} role="option" aria-selected={theme === t.id}>
                <button
                  type="button"
                  onClick={() => choose(t.id)}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs font-bold text-left hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: t.swatch }}
                    />
                    <span className="text-slate-800 font-bold text-xs">{t.label}</span>
                  </span>
                  {theme === t.id && (
                    <Check className="h-4 w-4 text-[color:var(--t-600)] shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
