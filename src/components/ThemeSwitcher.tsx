import React, { useEffect, useRef, useState } from 'react';
import { Settings, Check, Globe, Type } from 'lucide-react';
import { LANGUAGES, REGIONS, setLocale, useLocale, useT, useTr, type RegionCode } from '../locale';

export type ThemeName = 'ice-mint' | 'light-cyan' | 'sky';
export type FontPreset =
  | 'dm-sans'
  | 'clinical-precision'
  | 'swiss-architectural'
  | 'hospital-enterprise'
  | 'compact-geometric'
  | 'modern-medtech';

const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'ice-mint', label: 'Ice Mint', swatch: '#0A7A63' },
  { id: 'light-cyan', label: 'Light Cyan', swatch: '#06B6D4' },
  { id: 'sky', label: 'Sky Blue', swatch: '#0270A9' },
];

const FONT_PRESETS: { id: FontPreset; label: string; stack: string; previewFont: string }[] = [
  { id: 'dm-sans', label: 'DM Sans (Default)', stack: 'DM Sans · Uniform', previewFont: '"DM Sans", sans-serif' },
  { id: 'clinical-precision', label: 'Clinical Precision', stack: 'Plus Jakarta Sans · JetBrains Mono', previewFont: '"Plus Jakarta Sans", sans-serif' },
  { id: 'swiss-architectural', label: 'Swiss Architectural', stack: 'Space Grotesk · Inter · IBM Plex Mono', previewFont: '"Space Grotesk", sans-serif' },
  { id: 'hospital-enterprise', label: 'Hospital Enterprise', stack: 'IBM Plex Sans · IBM Plex Mono', previewFont: '"IBM Plex Sans", sans-serif' },
  { id: 'compact-geometric', label: 'Compact Geometric', stack: 'Manrope · JetBrains Mono', previewFont: '"Manrope", sans-serif' },
  { id: 'modern-medtech', label: 'Modern MedTech', stack: 'Sora · Inter', previewFont: '"Sora", sans-serif' },
];

const STORAGE_KEY = 'medcred-theme-v3';
const FONT_STORAGE_KEY = 'medcred-font-v1';

function readTheme(): ThemeName {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'lagoon') return 'ice-mint'; // renamed theme: keep saved choices working
    if (t === 'ice-mint' || t === 'light-cyan' || t === 'sky') return t;
  } catch { /* storage unavailable */ }
  return 'ice-mint';
}

function readFont(): FontPreset {
  try {
    const f = localStorage.getItem(FONT_STORAGE_KEY) as FontPreset | null;
    if (f && FONT_PRESETS.some(p => p.id === f)) return f;
  } catch { /* storage unavailable */ }
  return 'dm-sans';
}

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute('data-theme', theme);
  const color = THEMES.find(t => t.id === theme)?.swatch;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color || '#0A7A63');
}

function applyFont(font: FontPreset) {
  document.documentElement.setAttribute('data-font', font);
}

interface Props {
  className?: string;
  /** "onColor" for buttons sitting on the coloured app header; "light" for light surfaces. */
  tone?: 'onColor' | 'light';
  /** "embedded" when placed inside the user profile badge; "icon" for standalone circular button. */
  variant?: 'icon' | 'embedded';
}

export default function ThemeSwitcher({ className = '', tone = 'light', variant = 'icon' }: Props) {
  const tx = useTr();
  const t = useT();
  const { lang, region } = useLocale();
  const [theme, setTheme] = useState<ThemeName>(readTheme);
  const [font, setFont] = useState<FontPreset>(readFont);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    applyFont(font);
    try { localStorage.setItem(FONT_STORAGE_KEY, font); } catch { /* ignore */ }
  }, [font]);

  // Keep multiple mounted switchers (landing page + app header) in sync
  useEffect(() => {
    const onThemeChange = (e: Event) => setTheme((e as CustomEvent<ThemeName>).detail);
    const onFontChange = (e: Event) => setFont((e as CustomEvent<FontPreset>).detail);
    window.addEventListener('medcred-theme', onThemeChange);
    window.addEventListener('medcred-font', onFontChange);
    return () => {
      window.removeEventListener('medcred-theme', onThemeChange);
      window.removeEventListener('medcred-font', onFontChange);
    };
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
  };

  const chooseFont = (id: FontPreset) => {
    setFont(id);
    window.dispatchEvent(new CustomEvent('medcred-font', { detail: id }));
  };

  const buttonTone = tone === 'onColor'
    ? 'text-white border-white/25 hover:border-white/50 bg-white/10 hover:bg-white/20'
    : 'text-slate-700 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50';

  const buttonClass = variant === 'embedded'
    ? 'h-7 w-7 text-white/85 hover:text-white hover:bg-white/20 bg-transparent border-0 rounded-none transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/40'
    : `h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-white/40 ${buttonTone}`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={tx('Settings: theme and language')}
        title={tx('Settings (Theme & Language)')}
        className={buttonClass}
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-h-[82vh] overflow-y-auto z-50 bg-white border border-slate-200 shadow-xl text-slate-800 rounded-none panel-edge">
          {/* Section 1: Application Theme */}
          <p className="px-3.5 py-2 text-2xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] bg-[color:var(--t-50)] border-b border-slate-200">
            {tx('Application theme')}
          </p>
          <ul role="listbox" aria-label={tx('Application theme')} className="py-1 border-b border-slate-200">
            {THEMES.map(th => (
              <li key={th.id} role="option" aria-selected={theme === th.id}>
                <button
                  type="button"
                  onClick={() => choose(th.id)}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-1.5 text-xs font-bold text-left hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: th.swatch }}
                    />
                    <span className="text-slate-800 font-bold text-xs">{th.label}</span>
                  </span>
                  {theme === th.id && (
                    <Check className="h-4 w-4 text-[color:var(--t-600)] shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Section 1b: Font Style Preset */}
          <div className="px-3.5 py-2 bg-[color:var(--t-50)] border-b border-slate-200 flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
              <span>{tx('Font style')}</span>
            </span>
          </div>
          <ul role="listbox" aria-label={tx('Font style')} className="py-1 border-b border-slate-200">
            {FONT_PRESETS.map(fp => (
              <li key={fp.id} role="option" aria-selected={font === fp.id}>
                <button
                  type="button"
                  onClick={() => chooseFont(fp.id)}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-1.5 text-left hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate" style={{ fontFamily: fp.previewFont }}>
                      {fp.label}
                    </span>
                    <span className="block text-xs text-slate-500 truncate">
                      {fp.stack}
                    </span>
                  </div>
                  {font === fp.id && (
                    <Check className="h-4 w-4 text-[color:var(--t-600)] shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Section 2: Language Selection */}
          <div className="px-3.5 py-2 bg-[color:var(--t-50)] border-b border-slate-200 flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[color:var(--t-700)] flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[color:var(--t-600)]" />
              <span>{t('common.language')}</span>
            </span>
            <span className="tag-pill font-extrabold uppercase px-1.5 py-0.5 bg-white text-[color:var(--t-700)] border border-[color:var(--t-200)]">
              {region} · {lang.toUpperCase()}
            </span>
          </div>
          <ul role="listbox" aria-label={t('common.language')} className="py-1 border-b border-slate-200">
            {LANGUAGES.map(l => (
              <li key={l.code} role="option" aria-selected={lang === l.code}>
                <button
                  type="button"
                  onClick={() => setLocale({ lang: l.code })}
                  className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-left hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
                  <span className="w-6 font-mono font-bold uppercase text-slate-400">{l.code}</span>
                  <span className="flex-1 font-bold text-[color:var(--ink)]">{l.label}</span>
                  {lang === l.code && <Check className="h-4 w-4 text-[color:var(--t-600)] shrink-0" />}
                </button>
              </li>
            ))}
          </ul>

          {/* Section 3: Region / Audience Mode */}
          <p className="px-3.5 py-1.5 text-2xs font-extrabold uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-100">
            {t('common.region')} · Audience Mode
          </p>
          <ul role="listbox" aria-label={t('common.region')} className="py-1">
            {(Object.keys(REGIONS) as RegionCode[]).map(r => (
              <li key={r} role="option" aria-selected={region === r}>
                <button
                  type="button"
                  onClick={() => setLocale({ region: r })}
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-1.5 text-left hover:bg-[color:var(--t-50)] transition-colors cursor-pointer"
                >
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
        </div>
      )}
    </div>
  );
}
