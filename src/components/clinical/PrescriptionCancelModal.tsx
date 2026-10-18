import React, { useState } from 'react';
import { AlertTriangle, X, Ban, ShieldAlert } from 'lucide-react';

interface PrescriptionCancelModalProps {
  isOpen: boolean;
  rxCode?: string;
  rxMedications?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  busy?: boolean;
}

const COMMON_CANCELLATION_REASONS = [
  'Adverse contraindication identified post-issuance',
  'Patient reported previously unrecorded drug allergy',
  'Incorrect dosage or frequency specified',
  'Patient requested alternative medication formulation',
  'Clinical diagnosis revised upon consultation review',
  'Prescription issued in error / duplicate',
];

export default function PrescriptionCancelModal({
  isOpen,
  rxCode,
  rxMedications,
  onClose,
  onConfirm,
  busy = false,
}: PrescriptionCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_CANCELLATION_REASONS[0]);
  const [customNotes, setCustomNotes] = useState('');
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!confirmedRisk) {
      setError('Please acknowledge that cancellation will immediately revoke pharmacy dispensing rights.');
      return;
    }

    const fullReason = customNotes.trim()
      ? `${selectedReason}: ${customNotes.trim()}`
      : selectedReason;

    await onConfirm(fullReason);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-rx-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onKeyDown={e => {
        if (e.key === 'Escape' && !busy) onClose();
      }}
    >
      <div className="bg-white border-2 border-rose-600 max-w-lg w-full shadow-2xl p-6 space-y-5 rounded-none max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-none">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-none">
                Poisons Act 1952 Audit Revocation
              </span>
              <h2 id="cancel-rx-modal-title" className="text-sm font-black text-slate-900 mt-1">
                Revoke &amp; Cancel E-Prescription
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Prescription Details Callout */}
        <div className="bg-slate-50 border border-slate-250 p-3 text-xs space-y-1 rounded-none">
          <p className="font-mono font-bold text-slate-800">
            Prescription Code: <span className="text-rose-700 font-extrabold">{rxCode || 'Pending'}</span>
          </p>
          {rxMedications && (
            <p className="text-slate-600 font-medium">
              Medication: <span className="font-semibold text-slate-900">{rxMedications}</span>
            </p>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-none">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="cancel-reason" className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Statutory Revocation Reason *
            </label>
            <select
              id="cancel-reason"
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full h-10 border border-slate-300 bg-white px-3 text-xs font-semibold rounded-none outline-none focus:border-rose-600"
            >
              {COMMON_CANCELLATION_REASONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cancel-notes" className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Clinical Context / Replacement Guidance (Optional)
            </label>
            <textarea
              id="cancel-notes"
              rows={3}
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              maxLength={300}
              placeholder="e.g. Patient advised to discontinue immediately; replacement prescription issued."
              className="w-full border border-slate-300 bg-white p-3 text-xs font-semibold rounded-none outline-none focus:border-rose-600"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 bg-rose-50/60 border border-rose-200 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmedRisk}
              onChange={e => setConfirmedRisk(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-none accent-rose-700"
            />
            <span className="text-xs text-rose-950 font-semibold leading-relaxed">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-700 inline mr-1" />
              I confirm that revoking this prescription immediately notifies the patient, bars all pharmacies from dispensing, and commits a permanent revocation audit event.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={busy || !confirmedRisk}
              className="h-10 px-5 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
            >
              {busy ? 'Revoking Prescription…' : 'Revoke & Cancel Prescription'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="h-10 px-4 border border-slate-300 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
