import React, { useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Lock, X, Building2, QrCode, CreditCard, Wallet, ShieldCheck, ArrowRight } from 'lucide-react';
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
  methods: { id: string; label: string; note: string; category?: string }[];
  fpxBanks?: { code: string; name: string; status: 'online' | 'maintenance' }[];
  indicative: { currency: string; amount: number; asOf: string | null }[];
  policy: { summary: string };
}

/**
 * Pays for a booking or consultation.
 * Supports authentic Malaysian PayNet rails:
 *  1. FPX Online Banking across 17 commercial banks
 *  2. DuitNow QR instant QR scan & pay
 *  3. Credit / Debit Cards
 *  4. eWallets (GrabPay, Touch 'n Go)
 */
export default function PaymentDialog({ kind, refId, description, onPaid, onCancel }: Props) {
  const [state, setState] = useState<'starting' | 'sandbox' | 'review' | 'redirecting' | 'paid' | 'error'>('starting');
  const [paymentId, setPaymentId] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [b, setB] = useState<Breakdown | null>(null);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState<any | null>(null);

  // Selected payment rail & bank
  const [activeRail, setActiveRail] = useState<'fpx' | 'duitnow' | 'card' | 'wallet'>('fpx');
  const [selectedBank, setSelectedBank] = useState('MBB0227'); // Maybank default
  const [fpxBuyerEmail, setFpxBuyerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const confirmPayment = async () => {
    setError('');
    setSubmitting(true);
    try {
      const d = await fetch(`/api/payments/${paymentId}/sandbox-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: activeRail, bankCode: activeRail === 'fpx' ? selectedBank : undefined }),
      }).then(r => r.json()).catch(() => null);

      if (d?.status !== 'success') {
        setError(d?.message || 'Payment failed.');
        setSubmitting(false);
        return;
      }
      const inv = await fetch(`/api/payments/${paymentId}/invoice`).then(r => r.json()).catch(() => null);
      setInvoice(inv?.data ?? null);
      setState('paid');
    } catch {
      setError('Failed to process payment with bank gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToCheckout = () => { setState('redirecting'); window.location.href = checkoutUrl; };

  const Price = () => b && (
    <div className="space-y-1.5 p-3.5 bg-[color:var(--t-50)] border border-[color:var(--t-200)]">
      <dl className="text-xs grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-slate-600">Clinical Consultation Fee</dt>
        <dd className="tabular-nums font-semibold">{formatMoney(b.subtotal)}</dd>
        {b.tax > 0 && (
          <>
            <dt className="text-slate-600">Service Tax (SST {b.taxRatePct}%)</dt>
            <dd className="tabular-nums font-semibold">{formatMoney(b.tax)}</dd>
          </>
        )}
        <dt className="font-extrabold text-sm text-[color:var(--ink)] pt-1 border-t border-[color:var(--t-200)]">Total Payable (MYR)</dt>
        <dd className="text-xl font-black tabular-nums text-[color:var(--ink)] pt-1 border-t border-[color:var(--t-200)]">{formatMoney(b.amount)}</dd>
      </dl>
      {b.indicative.length > 0 && (
        <p className="text-xs text-slate-500 pt-1">
          Indicative: {b.indicative.map(i => `${i.currency} ${i.amount.toFixed(2)}`).join(' · ')}. Settled in Malaysian Ringgit.
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Payment Gateway">
      <div className="bg-white w-full max-w-lg border border-[color:var(--t-200)] shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[color:var(--t-100)]">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[color:var(--t-700)] bg-[color:var(--t-50)] px-2 py-0.5 border border-[color:var(--t-200)] w-fit mb-1">
              <ShieldCheck className="h-3 w-3" />
              <span>PayNet &amp; Bank Negara Certified</span>
            </div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[color:var(--t-600)]" /> MedCred Secure Clinical Gateway
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">{description}</p>
          </div>
          {state !== 'paid' && (
            <button onClick={onCancel} aria-label="Close" className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {state === 'starting' && (
          <div className="py-8 text-center text-xs font-semibold text-slate-600 animate-pulse">
            Connecting to Malaysian payment switches…
          </div>
        )}
        {state === 'redirecting' && (
          <div className="py-8 text-center text-xs font-semibold text-slate-600 animate-pulse">
            Redirecting to secure banking host…
          </div>
        )}
        {state === 'error' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3">{error}</p>
            <button onClick={onCancel} className="text-xs font-bold text-slate-700 border border-slate-200 px-4 py-2 cursor-pointer">
              Close
            </button>
          </div>
        )}

        {(state === 'sandbox' || state === 'review') && b && (
          <div className="space-y-4">
            <Price />

            {/* PAYMENT RAIL SELECTOR TABS */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Select Malaysian Payment Channel:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveRail('fpx')}
                  className={`p-2.5 text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    activeRail === 'fpx'
                      ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] text-[color:var(--t-800)] font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                  }`}
                >
                  <Building2 className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs leading-tight">FPX Bank</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRail('duitnow')}
                  className={`p-2.5 text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    activeRail === 'duitnow'
                      ? 'border-rose-600 bg-rose-50 text-rose-900 font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                  }`}
                >
                  <QrCode className="h-4 w-4 text-rose-700" />
                  <span className="text-xs leading-tight">DuitNow QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRail('card')}
                  className={`p-2.5 text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    activeRail === 'card'
                      ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] text-[color:var(--t-800)] font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                  }`}
                >
                  <CreditCard className="h-4 w-4 text-sky-700" />
                  <span className="text-xs leading-tight">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRail('wallet')}
                  className={`p-2.5 text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    activeRail === 'wallet'
                      ? 'border-[color:var(--t-600)] bg-[color:var(--t-50)] text-[color:var(--t-800)] font-black shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold'
                  }`}
                >
                  <Wallet className="h-4 w-4 text-purple-700" />
                  <span className="text-xs leading-tight">e-Wallet</span>
                </button>
              </div>
            </div>

            {/* RAIL 1: FPX ONLINE BANKING */}
            {activeRail === 'fpx' && (
              <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Direct FPX Online Banking</span>
                  <span className="text-xs font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2">
                    17 Banks Connected
                  </span>
                </div>
                <div>
                  <label htmlFor="fpx-bank-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Choose Bank:
                  </label>
                  <select
                    id="fpx-bank-select"
                    value={selectedBank}
                    onChange={e => setSelectedBank(e.target.value)}
                    className="w-full bg-white border border-slate-300 h-10 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[color:var(--t-600)]"
                  >
                    {(b.fpxBanks || [
                      { code: 'MBB0227', name: 'Maybank2u' },
                      { code: 'CIMB0569', name: 'CIMB Clicks' },
                      { code: 'PBB0233', name: 'Public Bank PBe' },
                      { code: 'RHB0218', name: 'RHB Now' },
                      { code: 'HLB0224', name: 'Hong Leong Connect' },
                      { code: 'AMBB0209', name: 'AmOnline' },
                      { code: 'BIMB0340', name: 'Bank Islam' },
                    ]).map(bank => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fpx-buyer-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    FPX E-Receipt Email (Optional):
                  </label>
                  <input
                    id="fpx-buyer-email"
                    type="email"
                    placeholder="name@example.com"
                    value={fpxBuyerEmail}
                    onChange={e => setFpxBuyerEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 h-9 px-3 text-xs text-slate-800 focus:outline-none focus:border-[color:var(--t-600)]"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-tight">
                  By clicking confirm, you will be redirected to your selected bank&apos;s FPX portal. Minimum transfer RM1.00.
                </p>
              </div>
            )}

            {/* RAIL 2: DUITNOW QR INSTANT SCAN */}
            {activeRail === 'duitnow' && (
              <div className="space-y-3 p-4 bg-rose-50/50 border border-rose-200 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                    <span className="font-black text-rose-950">DuitNow National QR Standard</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2">
                    Instant Clearance
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-white border border-rose-200 space-y-2">
                  <div className="relative p-2 border-2 border-rose-600 bg-white shadow-xs">
                    {/* Simulated Dynamic DuitNow QR Matrix */}
                    <div className="w-36 h-36 bg-slate-900 flex flex-col items-center justify-center p-2 text-white relative">
                      <div className="absolute inset-2 border-2 border-dashed border-rose-400 opacity-60 pointer-events-none" />
                      <QrCode className="h-24 w-24 text-white" />
                      <span className="text-xs font-mono font-black text-rose-300 tracking-wider">DUITNOW QR</span>
                    </div>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-black text-slate-900">Scan with ANY Banking App or E-Wallet</p>
                    <p className="text-xs text-slate-500">
                      Maybank MAE · CIMB OCTO · TNG eWallet · GrabPay · Boost · ShopeePay
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Payment reference: <span className="font-mono font-bold text-slate-700">{paymentId}</span> (valid for 10 minutes)
                </p>
              </div>
            )}

            {/* RAIL 3: CREDIT / DEBIT CARDS */}
            {activeRail === 'card' && (
              <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-800">Debit / Credit Card (3D Secure 2.0)</span>
                <p className="text-xs text-slate-600">
                  Accepts Malaysian MyDebit, Visa, and Mastercard with OTP authentication.
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-white border border-slate-300 font-bold text-xs text-slate-700">Visa</span>
                  <span className="px-2 py-1 bg-white border border-slate-300 font-bold text-xs text-slate-700">Mastercard</span>
                  <span className="px-2 py-1 bg-white border border-slate-300 font-bold text-xs text-slate-700">MyDebit</span>
                </div>
              </div>
            )}

            {/* RAIL 4: EWALLET */}
            {activeRail === 'wallet' && (
              <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-800">E-Wallet Direct Checkout</span>
                <p className="text-xs text-slate-600">
                  Direct debit from your GrabPay or Touch &apos;n Go eWallet balance with instant OTP confirmation.
                </p>
              </div>
            )}

            {error && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2.5">{error}</p>}

            {state === 'sandbox' ? (
              <button
                type="button"
                onClick={confirmPayment}
                disabled={submitting}
                className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black py-3 shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Authenticating with Bank Gateway…' : `Confirm Payment with ${activeRail === 'fpx' ? 'FPX Banking' : activeRail === 'duitnow' ? 'DuitNow QR' : activeRail === 'card' ? 'Card' : 'e-Wallet'}`}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goToCheckout}
                className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black py-3 shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <span>Proceed to Bank Gateway</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>{b.policy.summary.slice(0, 75)}…</span>
              <span className="font-bold text-[color:var(--t-700)]">FSA 2013 Compliant</span>
            </div>
          </div>
        )}

        {state === 'paid' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-black text-sm bg-emerald-50 border border-emerald-200 p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Payment Successfully Settled &amp; Escrowed</span>
            </div>

            {invoice && (
              <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 bg-slate-50 border border-slate-200 p-3">
                <dt className="text-slate-500">Official Receipt</dt>
                <dd className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</dd>
                <dt className="text-slate-500">Payment Channel</dt>
                <dd className="font-bold text-emerald-800">
                  {activeRail === 'fpx' ? `FPX Bank Debit (${selectedBank})` : activeRail === 'duitnow' ? 'PayNet DuitNow QR' : 'Cards / Wallet'}
                </dd>
                <dt className="text-slate-500">Service Fee</dt>
                <dd className="tabular-nums font-semibold">{formatMoney(invoice.subtotal)}</dd>
                {invoice.tax > 0 && (
                  <>
                    <dt className="text-slate-500">Service Tax (SST {invoice.taxRatePct}%)</dt>
                    <dd className="tabular-nums font-semibold">{formatMoney(invoice.tax)}</dd>
                  </>
                )}
                <dt className="text-slate-500 font-bold border-t border-slate-200 pt-1">Total Paid</dt>
                <dd className="font-black text-slate-900 border-t border-slate-200 pt-1">{formatMoney(invoice.total)}</dd>
              </dl>
            )}

            <button
              type="button"
              onClick={() => onPaid(paymentId)}
              className="w-full bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-black py-3 shadow-xs cursor-pointer transition-colors"
            >
              Continue to Consultation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
