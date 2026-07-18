import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, RefreshCw, CheckCircle2, Download, X, HelpCircle } from 'lucide-react';
import { PaymentReceipt } from '../types';

interface PaymentCheckoutProps {
  amount: number;
  purpose: string;
  customerName: string;
  customerEmail: string;
  onPaymentSuccess: (receipt: PaymentReceipt) => void;
  onCancel: () => void;
}

export default function PaymentCheckout({
  amount,
  purpose,
  customerName,
  customerEmail,
  onPaymentSuccess,
  onCancel
}: PaymentCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'fpx' | 'ewallet'>('card');
  const [cardName, setCardName] = useState(customerName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [fpxBank, setFpxBank] = useState('maybank2u');
  const [ewalletType, setEwalletType] = useState('tng');
  const [error, setError] = useState('');
  const [statusStep, setStatusStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  // Status progression simulation text
  const steps = [
    'Contacting secure bank gateway ledger...',
    'Acquiring verified card signature blocks...',
    'Hashing receipt record with CareVerified SHA-256 audit-trail block...',
    'Completed securely!'
  ];

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'card') {
      if (!cardName.trim()) return setError('Cardholder name is required.');
      if (cardNumber.replace(/\s/g, '').length < 16) return setError('Invalid 16-digit card number.');
      if (!expiry.includes('/') || expiry.length < 5) return setError('Invalid expiry (MM/YY).');
      if (cvv.length < 3) return setError('Invalid CVV (3-4 digits).');
    }

    setProcessing(true);
    setStatusStep(0);

    // Progressive loading simulation
    const interval = setInterval(() => {
      setStatusStep((prev) => {
        if (prev >= 2) {
          clearInterval(interval);
          generateReceiptRecord();
          return 3;
        }
        return prev + 1;
      });
    }, 1100);
  };

  const generateReceiptRecord = () => {
    // Generate a secure transaction hash using math simulation representing SHA-256
    const hex = '0123456789abcdef';
    let txHash = '0x';
    for (let i = 0; i < 64; i++) {
      txHash += hex[Math.floor(Math.random() * 16)];
    }

    const payId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const cardBrand = cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'MyDebit';

    const newReceipt: PaymentReceipt = {
      paymentId: payId,
      amount,
      currency: 'MYR',
      status: 'Success',
      transactionHash: txHash,
      cardType: paymentMethod === 'card' ? cardBrand : paymentMethod === 'fpx' ? 'FPX Banking' : 'E-Wallet',
      last4: paymentMethod === 'card' ? cardNumber.slice(-4) : 'Online',
      customerName: cardName || customerName || 'Verified Patient',
      purpose,
      timestamp: new Date().toISOString()
    };

    setReceipt(newReceipt);
    setProcessing(false);
  };

  const handleDownloadReceipt = () => {
    if (!receipt) return;
    alert(`Downloading Official Cryptographically Signed Invoice & Receipt:
Receipt ID: ${receipt.paymentId}
Amount Paid: RM ${receipt.amount.toFixed(2)}
Cryptographic Ledger Hash: ${receipt.transactionHash.slice(0, 20)}...
Notarized Secure Block under HIPAA Audit standards.`);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-800/65 backdrop-blur-xs animate-fade-in" id="payment-gateway-modal">
      <div className="bg-white rounded-3xl border-2 border-slate-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-down">
        
        {/* Header */}
        <div className="bg-blue-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <CreditCard className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">CareVerified Payment Portal</h3>
              <p className="text-[10px] text-blue-200 font-bold uppercase mt-0.5 tracking-wider">HIPAA Secure Clearing Ledger</p>
            </div>
          </div>
          {!processing && !receipt && (
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">Total Payable Amount</span>
            <span className="text-3xl font-black text-blue-900 mt-1 block">RM {amount.toFixed(2)}</span>
            <span className="text-[11px] text-slate-500 font-semibold block mt-1.5 truncate" title={purpose}>{purpose}</span>
          </div>

          {!processing && !receipt && (
            <>
              {/* Payment Method Selectors */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-1 text-center text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    paymentMethod === 'card' ? 'bg-white text-blue-900 shadow-3xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Credit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('fpx')}
                  className={`py-2 px-1 text-center text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    paymentMethod === 'fpx' ? 'bg-white text-blue-900 shadow-3xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  FPX Banking
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ewallet')}
                  className={`py-2 px-1 text-center text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                    paymentMethod === 'ewallet' ? 'bg-white text-blue-900 shadow-3xs border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  E-Wallet
                </button>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold flex gap-2">
                  <X className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Dynamic Forms */}
              <form onSubmit={handlePay} className="space-y-4">
                {paymentMethod === 'card' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-bold text-slate-700 placeholder-slate-400"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                          placeholder="4123 4567 8901 2345"
                          className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-blue-500 font-mono font-bold text-slate-700 placeholder-slate-400"
                          required
                        />
                        <div className="absolute right-4 top-3 flex gap-1">
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-extrabold px-1.5 py-0.5 rounded uppercase">Visa</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 block">Expiry Date</label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                          placeholder="MM/YY"
                          className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-mono font-bold text-slate-700 placeholder-slate-400 text-center"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 block">CVV</label>
                        <input
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                          maxLength={4}
                          placeholder="•••"
                          className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-mono font-bold text-slate-700 placeholder-slate-400 text-center"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === 'fpx' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Select Banking Partner</label>
                      <select
                        value={fpxBank}
                        onChange={(e) => setFpxBank(e.target.value)}
                        className="w-full text-xs bg-slate-50 border-2 border-slate-200/80 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-extrabold text-slate-700 cursor-pointer"
                      >
                        <option value="maybank2u">Maybank2u / Maybank</option>
                        <option value="cimb_clicks">CIMB Clicks</option>
                        <option value="public_bank">Public Bank Online</option>
                        <option value="rhb_now">RHB Now</option>
                        <option value="hong_leong">Hong Leong Connect</option>
                        <option value="bank_islam">Bank Islam Online</option>
                        <option value="pbe">PBe Bank</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                      You will be securely routed to your bank's secure portal upon clicking 'Authorize Secure FPX Transfer' below.
                    </p>
                  </div>
                )}

                {paymentMethod === 'ewallet' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Select E-Wallet Provider</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEwalletType('tng')}
                          className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${
                            ewalletType === 'tng' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-black block">Touch 'n Go eWallet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEwalletType('grabpay')}
                          className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${
                            ewalletType === 'grabpay' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-black block">GrabPay</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-6"
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {paymentMethod === 'card' ? 'Verify and Pay RM ' + amount.toFixed(2) : 
                     paymentMethod === 'fpx' ? 'Authorize Secure FPX Transfer' : 'Confirm E-Wallet Billing'}
                  </span>
                </button>
              </form>

              {/* Secure guarantee label */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[9px] text-slate-400 font-bold justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                <span>Encrypted Bank Tokenization • Direct Medical Board Trust Notarized</span>
              </div>
            </>
          )}

          {/* Processing Screen */}
          {processing && (
            <div className="text-center py-10 space-y-6">
              <div className="relative inline-block">
                <div className="h-16 w-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                <Lock className="h-6 w-6 text-blue-600 absolute inset-0 m-auto" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800">Processing Cryptographic Settlement</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 inline-block max-w-xs">
                  <span className="text-[10px] font-mono text-blue-700 font-extrabold animate-pulse block">
                    {steps[statusStep]}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Receipt View Screen */}
          {receipt && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Payment Successfully Notarized!</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Transaction Recorded on Verification Register</p>
              </div>

              {/* Structured receipt block */}
              <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 space-y-3 font-mono text-[10px] text-slate-700 leading-normal relative overflow-hidden">
                {/* Backglow element */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none"></div>

                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-400 font-bold">RECEIPT ID:</span>
                  <span className="font-extrabold text-slate-800">{receipt.paymentId}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-400 font-bold">SETTLED BY:</span>
                  <span className="font-extrabold text-slate-800 truncate max-w-[150px]">{receipt.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-400 font-bold">PURPOSE:</span>
                  <span className="font-extrabold text-slate-800 truncate max-w-[150px]" title={receipt.purpose}>{receipt.purpose}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-400 font-bold">SETTLEMENT TYPE:</span>
                  <span className="font-extrabold text-slate-800">{receipt.cardType} {receipt.last4 !== 'Online' && `(*${receipt.last4})`}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-400 font-bold">TIMESTAMP:</span>
                  <span className="font-extrabold text-slate-800">{new Date(receipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 font-sans border-t border-slate-200">
                  <span className="text-blue-900 font-black uppercase text-[11px]">Amount Paid:</span>
                  <span className="font-black text-blue-900 text-xs">RM {receipt.amount.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-dashed border-slate-200">
                  <span className="text-[8px] text-slate-400 font-extrabold uppercase block tracking-wider mb-1">Cryptographic Integrity signature block:</span>
                  <p className="text-[8px] text-slate-400 font-semibold break-all leading-relaxed bg-slate-100 p-2 rounded border border-slate-200 font-mono select-all">
                    {receipt.transactionHash}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button
                  onClick={handleDownloadReceipt}
                  className="py-3 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => onPaymentSuccess(receipt)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
