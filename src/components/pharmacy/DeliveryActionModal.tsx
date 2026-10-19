import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, AlertTriangle, Snowflake, X, ShieldCheck } from 'lucide-react';
import { btnPlain, btnPrimary, btnDanger, fieldLabel } from './shared';

export interface DeliveryActionModalProps {
  isOpen: boolean;
  status: 'arranged' | 'delivered' | 'failed' | null;
  delivery: {
    id: string;
    method: string;
    coldChain: boolean;
    partnerRef?: string;
    trackingUrl?: string;
  };
  rxCode?: string;
  patientName?: string;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => Promise<void> | void;
  busy: boolean;
}

const FAILURE_REASONS = [
  'Patient unreachable at contact phone number',
  'Incorrect or incomplete delivery address',
  'Cold-chain temperature excursion breach during transit',
  'Patient refused package / medication handover',
  'Delivery partner cancelled / rider unavailable',
  'Adverse weather or route inaccessible',
];

export default function DeliveryActionModal({
  isOpen,
  status,
  delivery,
  rxCode,
  patientName,
  onClose,
  onSubmit,
  busy,
}: DeliveryActionModalProps) {
  const [partnerRef, setPartnerRef] = useState(delivery.partnerRef || '');
  const [trackingUrl, setTrackingUrl] = useState(delivery.trackingUrl || '');
  const [temperature, setTemperature] = useState('');
  const [recipientName, setRecipientName] = useState(patientName || '');
  const [idVerified, setIdVerified] = useState(false);
  const [failureReason, setFailureReason] = useState(FAILURE_REASONS[0]);
  const [failureNotes, setFailureNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPartnerRef(delivery.partnerRef || '');
      setTrackingUrl(delivery.trackingUrl || '');
      setRecipientName(patientName || '');
      setIdVerified(false);
      setTemperature(delivery.coldChain ? '4.0' : '');
      setFailureReason(FAILURE_REASONS[0]);
      setFailureNotes('');
      setError('');
    }
  }, [isOpen, delivery, patientName]);

  if (!isOpen || !status) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (status === 'arranged') {
      if (delivery.method !== 'pharmacy_courier' && !partnerRef.trim()) {
        setError('Booking reference from delivery partner is required.');
        return;
      }
      const body: Record<string, unknown> = {
        status: 'arranged',
        partnerRef: partnerRef.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
      };
      if (delivery.coldChain && temperature.trim()) {
        const t = parseFloat(temperature);
        if (isNaN(t) || t < 0 || t > 25) {
          setError('Enter a valid departure temperature (e.g. 2.0 to 8.0 °C).');
          return;
        }
        body.temperatureCelsius = t;
      }
      onSubmit(body);
    } else if (status === 'delivered') {
      if (!recipientName.trim()) {
        setError('Recipient name is required for statutory medication handover.');
        return;
      }
      if (!idVerified) {
        setError('You must confirm recipient identity verification.');
        return;
      }
      const body: Record<string, unknown> = {
        status: 'delivered',
        recipientName: recipientName.trim(),
      };
      if (delivery.coldChain && temperature.trim()) {
        const t = parseFloat(temperature);
        if (isNaN(t)) {
          setError('Enter a valid delivery arrival temperature.');
          return;
        }
        body.temperatureCelsius = t;
      }
      onSubmit(body);
    } else if (status === 'failed') {
      const fullReason = failureNotes.trim()
        ? `${failureReason} - ${failureNotes.trim()}`
        : failureReason;
      onSubmit({
        status: 'failed',
        reason: fullReason,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onKeyDown={e => {
        if (e.key === 'Escape' && !busy) onClose();
      }}
    >
      <div className="bg-white border-2 border-[color:var(--t-600)] max-w-lg w-full shadow-2xl p-6 space-y-5 rounded-none max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 border rounded-none ${
                status === 'arranged'
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : status === 'delivered'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {status === 'arranged' && <Truck className="h-5 w-5" />}
              {status === 'delivered' && <CheckCircle2 className="h-5 w-5" />}
              {status === 'failed' && <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="delivery-modal-title" className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {status === 'arranged' && 'Confirm Courier Dispatch (Arranged)'}
                {status === 'delivered' && 'Confirm Medication Handover (Delivered)'}
                {status === 'failed' && 'Record Delivery Handover Failure'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Prescription: <span className="font-mono font-bold text-slate-700">{rxCode || delivery.id}</span>
                {patientName && ` · Patient: ${patientName}`}
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-none">
              {error}
            </div>
          )}

          {/* STATUS: ARRANGED */}
          {status === 'arranged' && (
            <div className="space-y-3.5">
              <div>
                <label htmlFor="partner-ref" className={fieldLabel}>
                  {delivery.method === 'pharmacy_courier' ? 'Internal Rider Batch / Trip ID' : 'Courier Booking Reference *'}
                </label>
                <input
                  id="partner-ref"
                  type="text"
                  required={delivery.method !== 'pharmacy_courier'}
                  value={partnerRef}
                  onChange={e => setPartnerRef(e.target.value)}
                  placeholder={delivery.method === 'pharmacy_courier' ? 'e.g. RIDER-02-AFTERNOON' : 'e.g. GRAB-948102 or LLM-48192'}
                  className="w-full h-10 border border-slate-300 bg-white px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              <div>
                <label htmlFor="tracking-url" className={fieldLabel}>
                  Live Tracking URL (Optional)
                </label>
                <input
                  id="tracking-url"
                  type="url"
                  value={trackingUrl}
                  onChange={e => setTrackingUrl(e.target.value)}
                  placeholder="https://tracker.partner.com/track/..."
                  className="w-full h-10 border border-slate-300 bg-white px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              {delivery.coldChain && (
                <div className="bg-sky-50 border border-sky-300 p-3 space-y-2 rounded-none">
                  <div className="flex items-center gap-1.5 text-sky-900 font-black text-xs uppercase tracking-wide">
                    <Snowflake className="h-4 w-4 text-sky-700" />
                    <span>NPRA GDP Cold-Chain Departure Check</span>
                  </div>
                  <p className="text-xs text-sky-800">
                    Insulin or biologics must depart between 2.0 °C and 8.0 °C with certified insulated ice-pack packaging.
                  </p>
                  <div>
                    <label htmlFor="departure-temp" className="text-xs font-bold text-sky-950 uppercase block mb-1">
                      Departure Box Temperature (°C)
                    </label>
                    <input
                      id="departure-temp"
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={e => setTemperature(e.target.value)}
                      placeholder="e.g. 4.2"
                      className="w-32 h-9 border border-sky-300 bg-white px-3 text-xs font-mono font-bold rounded-none outline-none focus:border-sky-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATUS: DELIVERED */}
          {status === 'delivered' && (
            <div className="space-y-3.5">
              <div>
                <label htmlFor="recipient-name" className={fieldLabel}>
                  Handover Recipient Full Name *
                </label>
                <input
                  id="recipient-name"
                  type="text"
                  required
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="e.g. Ahmad bin Razak (Patient or authorized proxy)"
                  className="w-full h-10 border border-slate-300 bg-white px-3 text-xs font-semibold rounded-none outline-none focus:border-[color:var(--t-600)]"
                />
              </div>

              {delivery.coldChain && (
                <div className="bg-sky-50 border border-sky-300 p-3 space-y-2 rounded-none">
                  <div className="flex items-center gap-1.5 text-sky-900 font-black text-xs uppercase tracking-wide">
                    <Snowflake className="h-4 w-4 text-sky-700" />
                    <span>Handover Temperature Verification</span>
                  </div>
                  <div>
                    <label htmlFor="arrival-temp" className="text-xs font-bold text-sky-950 uppercase block mb-1">
                      Handover Arrival Temperature (°C)
                    </label>
                    <input
                      id="arrival-temp"
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={e => setTemperature(e.target.value)}
                      placeholder="e.g. 5.1"
                      className="w-32 h-9 border border-sky-300 bg-white px-3 text-xs font-mono font-bold rounded-none outline-none focus:border-sky-600"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={idVerified}
                  onChange={e => setIdVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-none accent-[color:var(--t-600)]"
                />
                <span className="text-xs text-slate-800 font-semibold leading-relaxed">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 inline mr-1" />
                  I confirm that the courier verified recipient identity (NRIC / Passport or proxy authorization) in accordance with the Malaysian Poisons Regulations.
                </span>
              </label>
            </div>
          )}

          {/* STATUS: FAILED */}
          {status === 'failed' && (
            <div className="space-y-3.5">
              <div>
                <label htmlFor="failure-reason" className={fieldLabel}>
                  Reason for Non-Delivery *
                </label>
                <select
                  id="failure-reason"
                  value={failureReason}
                  onChange={e => setFailureReason(e.target.value)}
                  className="w-full h-10 border border-slate-300 bg-white px-3 text-xs font-semibold rounded-none outline-none focus:border-rose-600"
                >
                  {FAILURE_REASONS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="failure-notes" className={fieldLabel}>
                  Investigative Notes / Action Taken
                </label>
                <textarea
                  id="failure-notes"
                  rows={3}
                  value={failureNotes}
                  onChange={e => setFailureNotes(e.target.value)}
                  placeholder="e.g. Called patient 3 times; no answer at premises. Cold-chain medicine returned safely to dispensary refrigerator at 14:35."
                  className="w-full border border-slate-300 bg-white p-3 text-xs font-semibold rounded-none outline-none focus:border-rose-600"
                />
              </div>

              <p className="text-xs text-slate-500 font-medium">
                The patient will be immediately notified of the delivery failure and prompted to arrange redelivery or counter pickup.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="submit"
              disabled={busy}
              className={status === 'failed' ? btnDanger : btnPrimary}
            >
              {busy ? 'Processing…' : status === 'arranged' ? 'Dispatch Courier' : status === 'delivered' ? 'Confirm Delivery Handover' : 'Record Delivery Failure'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className={btnPlain}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
