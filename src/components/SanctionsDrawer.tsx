import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  UserCheck, ShieldOff, FileText, ChevronRight, X, Loader, 
  ExternalLink, Building2, Gavel, Scale
} from 'lucide-react';

export interface DisciplinarySanction {
  id: string;
  professional_id: string;
  initiator_id: string;
  initiator_name: string;
  initiator_role: string;
  countersigner_id?: string | null;
  countersigner_name?: string | null;
  countersigner_role?: string | null;
  sanction_type: string;
  statutory_basis: string;
  reason: string;
  reference_no?: string;
  status: 'pending_countersign' | 'active' | 'dismissed';
  effective_from: string;
  countersigned_at?: string | null;
  created_at: string;
}

export interface SanctionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  practitioner: any | null;
  currentSubRole: string;
  currentUser: any;
  onSanctionSuccess: () => void;
}

export const STATUTORY_BASES = [
  {
    id: 'act50_s29',
    label: 'Medical Act 1971 (Act 50) — Section 29 Disciplinary Inquiry',
    desc: 'Statutory inquiry into infamous conduct in a professional respect or clinical negligence.'
  },
  {
    id: 'act180_s16',
    label: 'Nurses Act 1950 (Act 180) — Section 16 Disciplinary Order',
    desc: 'Board order for removal from nursing register or suspension of practicing certificate.'
  },
  {
    id: 'gazette_revocation',
    label: 'Official Malaysian Medical Council (MMC) Gazette Revocation Notice',
    desc: 'Formal publication in Federal Gazette of APC revocation or struck-off status.'
  },
  {
    id: 'act586_emergency',
    label: 'Private Healthcare Facilities & Services Act 1998 (Act 586) — Patient Safety Threat',
    desc: 'Urgent institutional ban due to immediate clinical danger to patients or public health.'
  },
  {
    id: 'court_conviction',
    label: 'Criminal Court Conviction / Financial Indictment',
    desc: 'Statutory automatic disqualification following criminal breach of trust or fraud.'
  }
];

export const SANCTION_PRESETS = [
  'Practitioner Annual Practicing Certificate (APC) expired or revoked by MMC.',
  'Formal investigation initiated following substantiated patient care negligence allegation.',
  'Unlawful prescription of controlled psychotropic substances under Poisons Act 1952.',
  'Falsification of medical certification or clinical timesheets.',
  'Non-compliance with Continuous Professional Development (CPD) requirements under MMC regulations.'
];

export default function SanctionsDrawer({
  isOpen,
  onClose,
  practitioner,
  currentSubRole,
  currentUser,
  onSanctionSuccess
}: SanctionsDrawerProps) {
  const [statutoryBasis, setStatutoryBasis] = useState(STATUTORY_BASES[0].label);
  const [reason, setReason] = useState('');
  const [referenceNo, setReferenceNo] = useState(`MMC-SANCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [sanctionType, setSanctionType] = useState('disciplinary_suspension');
  const [requireDualSignoff, setRequireDualSignoff] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (practitioner) {
      setReason('');
      setError('');
      setSuccessMsg('');
      const prefix = practitioner.role === 'nurse' ? 'LJM' : 'MMC';
      setReferenceNo(`${prefix}-DISC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      if (practitioner.role === 'nurse') {
        setStatutoryBasis(STATUTORY_BASES[1].label);
      } else {
        setStatutoryBasis(STATUTORY_BASES[0].label);
      }
    }
  }, [practitioner]);

  if (!isOpen || !practitioner) return null;

  const isSuperAdmin = currentSubRole === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 15) {
      setError('Please provide a substantive statutory justification (minimum 15 characters).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (requireDualSignoff && !isSuperAdmin) {
        // Step 1: Initiate Dual-Signoff Flow (Medical Act 1971 Section 29)
        const res = await fetch(`/api/professionals/${practitioner.id}/sanction/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statutoryBasis,
            reason: reason.trim(),
            referenceNo,
            sanctionType,
            adminSubRole: currentSubRole
          })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setSuccessMsg(data.message);
          setTimeout(() => {
            onSanctionSuccess();
            onClose();
          }, 2000);
        } else {
          setError(data.message || 'Failed to initiate disciplinary sanction.');
        }
      } else {
        // Super-Admin direct sanction or plenary bypass
        const res = await fetch(`/api/professionals/${practitioner.id}/suspend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statutoryBasis,
            reason: reason.trim(),
            referenceNo,
            adminSubRole: currentSubRole,
            requireDualSignoff: !isSuperAdmin
          })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setSuccessMsg(`Practitioner ${practitioner.name} placed under formal statutory suspension. Hospital HR webhooks syndicated.`);
          setTimeout(() => {
            onSanctionSuccess();
            onClose();
          }, 2000);
        } else {
          setError(data.message || 'Failed to execute suspension.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error executing sanction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sanction-drawer-title"
    >
      <div 
        className="relative bg-white border-2 border-rose-600 rounded-none max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-500/20 text-rose-700 border border-rose-400 flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300">
                  Four-Eyes Principle
                </span>
                <span className="text-xs text-slate-500 font-mono">Medical Act 1971 / Nurses Act 1950</span>
              </div>
              <h3 id="sanction-drawer-title" className="text-base font-black text-slate-900 uppercase tracking-tight mt-0.5">
                Statutory Disciplinary Sanctions Order
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Practitioner Summary Box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Subject Practitioner</span>
            <span className="text-sm font-black text-slate-900">{practitioner.name}</span>
            <span className="text-xs text-slate-600 block">{practitioner.specialization} · License: <code className="font-mono font-bold text-slate-800">{practitioner.licenseNumber}</code></span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 block">Status</span>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              {practitioner.verificationStatus}
            </span>
          </div>
        </div>

        {/* Dual-Signoff Protocol Advisory Box */}
        <div className="p-3 bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
          <span className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wide text-amber-800">
            <Gavel className="h-3.5 w-3.5" />
            Statutory Two-Officer Signoff Mandate
          </span>
          <p className="text-[11px] leading-relaxed">
            Under Medical Act 1971 Section 29, practitioner suspension from clinical practice involves legal liability. 
            {isSuperAdmin ? (
              <span className="font-bold text-emerald-900 ml-1">
                You are operating under Executive Board Super-Admin Plenary Authority. You may execute immediate suspension or initiate committee dual-signoff.
              </span>
            ) : (
              <span className="font-bold text-amber-900 ml-1">
                As a Council Medical Registrar, your order will place this practitioner in provisional inquiry status until an authorized countersigner confirms the order.
              </span>
            )}
          </p>
        </div>

        {/* Error or Success feedback */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold animate-fade-in">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Statutory Basis Selection */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
              Statutory Basis &amp; Legal Framework *
            </label>
            <select
              value={statutoryBasis}
              onChange={(e) => setStatutoryBasis(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-rose-600"
            >
              {STATUTORY_BASES.map(b => (
                <option key={b.id} value={b.label}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
                Council Disciplinary Case File Ref No. *
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:border-rose-600"
                placeholder="MMC-DISC-2026-001"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
                Sanction Action Category
              </label>
              <select
                value={sanctionType}
                onChange={(e) => setSanctionType(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-rose-600"
              >
                <option value="disciplinary_suspension">Disciplinary Practice Suspension (Full)</option>
                <option value="apc_revocation">Annual Practicing Certificate Revocation</option>
                <option value="conditional_restriction">Conditional Practice Restriction</option>
              </select>
            </div>
          </div>

          {/* Reason Presets */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1">
              Select Standard Regulatory Ground (Optional Preset):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SANCTION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer text-left font-medium"
                >
                  + {preset.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-1">
              Detailed Statutory Order &amp; Formal Reasons *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the formal statutory findings, complaints reference, or council gazette notice justifying license suspension..."
              className="w-full border border-slate-300 p-2.5 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-rose-600"
              required
            />
            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
              This notice will be recorded in the immutable audit log and syndicated to hospital HR EHR gateways.
            </span>
          </div>

          {/* Signoff Mode Toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">Require Dual-Signoff Countersignature</span>
              <span className="text-[11px] text-slate-500">
                {requireDualSignoff ? 'Requires approval from a 2nd council registrar or super-admin.' : 'Immediate unilateral suspension (Super-Admin only).'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={requireDualSignoff}
              disabled={!isSuperAdmin}
              onChange={(e) => setRequireDualSignoff(e.target.checked)}
              className="h-4 w-4 accent-rose-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Recording Order...</span>
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4" />
                  <span>
                    {requireDualSignoff && !isSuperAdmin
                      ? 'Submit for Committee Dual-Signoff'
                      : 'Execute Statutory Sanction Order'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
