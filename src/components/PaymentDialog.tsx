import React, { useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Lock, X } from 'lucide-react';

interface Props {
  kind: 'booking' | 'consult';
  refId: string;
  description: string;
  onPaid: (paymentId: string) => void;
  onCancel: () => void;
}

/**
 * Pays for a booking or consultation. Card details are never typed into this app:
 * with Stripe configured the patient is redirected to Stripe's hosted checkout;
 * in test mode a clearly-labelled confirmation button stands in for the payment.
 */
export default function PaymentDialog({ kind, refId, description, onPaid, onCancel }: Props) {
  const [state, setState] = useState<'starting' | 'sandbox' | 'redirecting' | 'paid' | 'error'>('starting');
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetch('/api/payments/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, refId }),
        }).then(r => r.json());
        if (cancelled) return;
        if (d.status !== 'success') { setError(d.message || 'Could not start the payment.'); setState('error'); return; }
        setPaymentId(d.data.paymentId);
        if (d.data.provider === 'stripe') {
          setState('redirecting');
          window.location.href = d.data.checkoutUrl;
        } else {
          setAmount(d.data.amount);
          setState('sandbox');
        }
      } catch {
        if (!cancelled) { setError('Server connection error.'); setState('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [kind, refId]);

  const confirmTest = async () => {
    setError('');
    const d = await fetch(`/api/payments/${paymentId}/sandbox-confirm`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (d?.status !== 'success') { setError(d?.message || 'Payment failed.'); return; }
    const inv = await fetch(`/api/payments/${paymentId}/invoice`).then(r => r.json()).catch(() => null);
    setInvoice(inv?.data ?? null);
    setState('paid');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="bg-white w-full max-w-md border border-[#FECDD3] shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2"><Lock className="h-4 w-4 text-[#DC2626]" /> Secure payment</h3>
            <p className="text-xs text-slate-600 mt-1">{description}</p>
          </div>
          {state !== 'paid' && (
            <button onClick={onCancel} aria-label="Close" className="p-1.5 hover:bg-slate-100 rounded cursor-pointer"><X className="h-4 w-4" /></button>
          )}
        </div>

        {state === 'starting' && <p className="text-sm text-slate-600">Preparing your payment…</p>}
        {state === 'redirecting' && <p className="text-sm text-slate-600">Redirecting you to our secure payment provider…</p>}
        {state === 'error' && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3">{error}</p>
            <button onClick={onCancel} className="text-xs font-bold text-slate-700 border border-slate-200 px-4 py-2 cursor-pointer">Close</button>
          </div>
        )}

        {state === 'sandbox' && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs font-semibold">
              <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Test mode: no real payment is taken. A live payment provider has not been connected yet.</span>
            </div>
            <p className="text-3xl font-black text-slate-900 tabular-nums">RM {amount.toFixed(2)}</p>
            {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
            <button onClick={confirmTest} className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-extrabold py-3 cursor-pointer">
              Confirm test payment
            </button>
          </div>
        )}

        {state === 'paid' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm"><CheckCircle2 className="h-5 w-5" /> Payment received</div>
            {invoice && (
              <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 bg-slate-50 border border-slate-200 p-3">
                <dt className="text-slate-500">Invoice</dt><dd className="font-mono font-bold">{invoice.invoiceNumber}</dd>
                <dt className="text-slate-500">Amount</dt><dd className="font-bold">RM {Number(invoice.total).toFixed(2)}</dd>
                <dt className="text-slate-500">For</dt><dd>{invoice.description}</dd>
                {invoice.testMode && (<><dt className="text-slate-500">Mode</dt><dd className="font-bold text-amber-700">Test payment</dd></>)}
              </dl>
            )}
            <button onClick={() => onPaid(paymentId)} className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-extrabold py-3 cursor-pointer">Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
