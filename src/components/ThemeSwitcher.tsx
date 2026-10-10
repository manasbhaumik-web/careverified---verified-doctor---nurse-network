import React, { useEffect, useRef, useState } from 'react';
import { Settings, Check } from 'lucide-react';

export type ThemeName = 'crimson' | 'sky' | 'teal' | 'navy';

const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'crimson', label: 'Crimson Red', swatch: '#DC2626' },
  { id: 'sky', label: 'Sky Blue', swatch: '#0284C7' },
  { id: 'teal', label: 'Light Teal', swatch: '#0F766E' },
  { id: 'navy', label: 'Dark Navy Blue', swatch: '#0A1128' },
];

const STORAGE_KEY = 'medcred-theme';

function readTheme(): ThemeName {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'green') return 'teal'; // the old green theme became teal
    if (t === 'crimson' || t === 'sky' || t === 'teal' || t === 'navy') return t;
  } catch { /* storage unavailable */ }
  return 'sky';
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  const color = THEMES.find(t => t.id === theme)?.swatch;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color || '#0284C7');
}

interface Props {
  className?: string;
  /** "onColor" for buttons sitting on the coloured app header; "light" for light surfaces. */
  tone?: 'onColor' | 'light';
}

export default function ThemeSwitcher({ className = '', tone = 'light' }: Props) {
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
    ? 'text-white border-white/60 hover:bg-white/15'
    : 'text-[color:var(--t-600)] border-[color:var(--t-200)] bg-white hover:bg-[color:var(--t-100)]';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Settings: application theme"
        title="Settings"
        className={`h-11 w-11 flex items-center justify-center border rounded-lg transition-colors cursor-pointer ${buttonTone}`}
      >
        <Settings className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-white border border-slate-200 shadow-lg text-slate-800 rounded-lg overflow-hidden">
          <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Application theme
          </p>
          <ul role="listbox" aria-label="Application theme" className="pb-1.5">
            {THEMES.map(t => (
              <li key={t.id} role="option" aria-selected={theme === t.id}>
                <button
                  type="button"
                  onClick={() => choose(t.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-100 cursor-pointer"
                >
                  <span className="h-4 w-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: t.swatch }} />
                  <span className="flex-1 font-medium">{t.label}</span>
                  {theme === t.id && <Check className="h-4 w-4 text-slate-700" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
