import React, { useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Lock, X } from 'lucide-react';
import { formatMoney } from '../locale';

interface Props {
  kind: 'booking' | 'consult';
  refId: string;
  description: string;
  onPaid: (paymentId: string) => void;
  onCancel: () => void;
}

interface Breakdown {
  amount: number; subtotal: number; tax: number; taxRatePct: number; taxNote: string | null;
  methods: { id: string; label: string; note: string }[];
  indicative: { currency: string; amount: number; asOf: string | null }[];
  policy: { summary: string };
}

/**
 * Pays for a booking or consultation. Card details are never typed into this app:
 * with Stripe configured the patient reviews the price here, then goes to Stripe's hosted checkout (cards, FPX,
 * GrabPay); in test mode a clearly-labelled confirmation button stands in for the payment.
 */
export default function PaymentDialog({ kind, refId, description, onPaid, onCancel }: Props) {
  const [state, setState] = useState<'starting' | 'sandbox' | 'review' | 'redirecting' | 'paid' | 'error'>('starting');
  const [paymentId, setPaymentId] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [b, setB] = useState<Breakdown | null>(null);
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
        setB(d.data);
        if (d.data.provider === 'stripe') { setCheckoutUrl(d.data.checkoutUrl); setState('review'); }
        else setState('sandbox');
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

  const goToCheckout = () => { setState('redirecting'); window.location.href = checkoutUrl; };

  const Price = () => b && (
    <div className="space-y-2">
      <dl className="text-sm grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-slate-600">Consultation fee</dt><dd className="tabular-nums font-semibold">{formatMoney(b.subtotal)}</dd>
        {b.tax > 0 && (<><dt className="text-slate-600">Service tax (SST) {b.taxRatePct}%</dt><dd className="tabular-nums font-semibold">{formatMoney(b.tax)}</dd></>)}
        <dt className="font-extrabold">Total</dt><dd className="text-2xl font-black tabular-nums">{formatMoney(b.amount)}</dd>
      </dl>
      {b.taxNote && <p className="text-[11px] text-slate-500">{b.taxNote}</p>}
      {b.indicative.length > 0 && (
        <p className="text-[11px] text-slate-500">
          About {b.indicative.map(i => `${i.currency} ${i.amount.toFixed(2)}`).join(' · ')} (indicative{b.indicative[0].asOf ? `, rates as of ${b.indicative[0].asOf}` : ''}). You are charged in Malaysian ringgit; your bank sets the final conversion.
        </p>
      )}
    </div>
  );

  const Extras = () => b && (
    <div className="space-y-2 text-[11px] text-slate-600">
      <p><b>Pay with:</b> {b.methods.map(m => m.label).join(', ')}.</p>
      <details><summary className="cursor-pointer font-bold">Refund and cancellation policy</summary><p className="mt-1 leading-relaxed">{b.policy.summary}</p></details>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="bg-white w-full max-w-md border border-[color:var(--t-200)] shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2"><Lock className="h-4 w-4 text-[color:var(--t-600)]" /> Secure payment</h3>
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

        {state === 'review' && (
          <div className="space-y-4">
            <Price />
            <Extras />
            <button onClick={goToCheckout} className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-extrabold py-3 cursor-pointer">
              Continue to secure payment
            </button>
          </div>
        )}

        {state === 'sandbox' && (
          <div className="space-y-4">
            <div className="flex gap-2 bg-amber-50 border border-amber-200 text-amber-900 p-3 text-xs font-semibold">
              <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Test mode: no real payment is taken. A live payment provider has not been connected yet.</span>
            </div>
            <Price />
            <Extras />
            {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
            <button onClick={confirmTest} className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-extrabold py-3 cursor-pointer">
              Confirm test payment
            </button>
          </div>
        )}

        {state === 'paid' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm"><CheckCircle2 className="h-5 w-5" /> Payment received</div>
            {invoice && (
              <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 bg-slate-50 border border-slate-200 p-3">
                <dt className="text-slate-500">Receipt</dt><dd className="font-mono font-bold">{invoice.invoiceNumber}</dd>
                <dt className="text-slate-500">Issued by</dt><dd>{invoice.seller?.name}{invoice.seller?.sstRegistrationNo ? ` · SST reg. ${invoice.seller.sstRegistrationNo}` : ''}</dd>
                <dt className="text-slate-500">For</dt><dd>{invoice.description}</dd>
                <dt className="text-slate-500">Fee</dt><dd>{formatMoney(invoice.subtotal)}</dd>
                {invoice.tax > 0 && (<><dt className="text-slate-500">SST {invoice.taxRatePct}%</dt><dd>{formatMoney(invoice.tax)}</dd></>)}
                <dt className="text-slate-500">Total</dt><dd className="font-bold">{formatMoney(invoice.total)}</dd>
                {invoice.testMode && (<><dt className="text-slate-500">Mode</dt><dd className="font-bold text-amber-700">Test payment</dd></>)}
              </dl>
            )}
            <button onClick={() => onPaid(paymentId)} className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-sm font-extrabold py-3 cursor-pointer">Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
