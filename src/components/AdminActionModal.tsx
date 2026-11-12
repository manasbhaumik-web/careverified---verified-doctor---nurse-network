import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useTr } from '../locale';

export interface AdminActionModalConfig {
  title: string;
  description?: string;
  tone?: 'brand' | 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  initialValue?: string;
  checkboxLabel?: string;
  initialChecked?: boolean;
  onConfirm: (value: string, checked: boolean) => void | Promise<void>;
}

interface AdminActionModalProps {
  config: AdminActionModalConfig | null;
  onClose: () => void;
}

export default function AdminActionModal({ config, onClose }: AdminActionModalProps) {
  const tx = useTr();
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!config) return;
    setValue(config.initialValue || '');
    setChecked(Boolean(config.initialChecked));
    setError(null);
    setBusy(false);
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [config, busy, onClose]);

  if (!config) return null;

  const tone = config.tone || 'brand';
  const borderClass =
    tone === 'danger' ? 'border-rose-700' : tone === 'warning' ? 'border-amber-600' : 'border-[color:var(--t-600)]';
  const btnClass =
    tone === 'danger'
      ? 'bg-rose-700 hover:bg-rose-800 text-white border border-rose-800'
      : tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700'
      : 'bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white border border-[color:var(--t-700)]';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.inputLabel && config.inputRequired !== false && !value.trim()) {
      setError(tx('Please provide the required information before continuing.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await config.onConfirm(value.trim(), checked);
      onClose();
    } catch (err: any) {
      setError(err?.message || tx('Could not complete action.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-action-modal-title"
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={() => !busy && onClose()}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white border-2 ${borderClass} rounded-none max-w-md w-full p-6 shadow-2xl space-y-4`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`h-9 w-9 flex items-center justify-center shrink-0 border ${
                tone === 'danger'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : tone === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-[color:var(--t-50)] text-[color:var(--t-600)] border-[color:var(--t-200)]'
              }`}
            >
              {tone === 'danger' || tone === 'warning' ? (
                <AlertTriangle className="h-4.5 w-4.5" />
              ) : (
                <ShieldCheck className="h-4.5 w-4.5" />
              )}
            </div>
            <h3 id="admin-action-modal-title" className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {config.title}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label={tx('Close dialog')}
            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {config.description && (
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{config.description}</p>
        )}

        {config.inputLabel && (
          <div className="space-y-1.5">
            <label htmlFor="admin-action-modal-input" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
              {config.inputLabel}
            </label>
            <input
              id="admin-action-modal-input"
              type="text"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.inputPlaceholder || ''}
              className="w-full h-11 border border-slate-300 rounded-none px-3 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-[color:var(--t-600)]"
            />
          </div>
        )}

        {config.checkboxLabel && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="h-4 w-4 accent-rose-700 rounded-none cursor-pointer"
            />
            <span>{config.checkboxLabel}</span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 p-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer rounded-none"
          >
            {config.cancelLabel || tx('Cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            autoFocus={!config.inputLabel}
            className={`h-9 px-4 text-xs font-black uppercase tracking-wider cursor-pointer rounded-none disabled:opacity-50 ${btnClass}`}
          >
            {busy ? tx('Processing…') : config.confirmLabel || tx('Confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
