/**
 * Payment rules for Malaysia and international patients: accepted methods, service tax (SST), indicative
 * currency conversion and the refund policy per region.
 *
 * Basis (web research, Oct 2026; NOT tax or legal advice: have an accountant/counsel confirm before charging tax):
 *  - Stripe supports cards, FPX and GrabPay in Malaysia. Touch 'n Go eWallet, Boost and DuitNow QR were not
 *    confirmed on Stripe, so they need a Malaysian payment aggregator (see docs/PAYMENTS_MALAYSIA.md).
 *  - From 1 July 2025 private healthcare services carry 6% service tax, reported to apply mainly to non-citizens
 *    (citizens are exempt). Medicines are reported to be exempt. The registration threshold (reported as RM1.5
 *    million) and who is the taxable person (practitioner/clinic or platform) are unconfirmed.
 */

export type PatientRegion = "MY" | "INTL";

// ---------- payment methods & Malaysian local rails ----------
export const MALAYSIA_FPX_BANKS: { code: string; name: string; status: 'online' | 'maintenance' }[] = [
  { code: 'MBB0227', name: 'Maybank2u', status: 'online' },
  { code: 'CIMB0569', name: 'CIMB Clicks', status: 'online' },
  { code: 'PBB0233', name: 'Public Bank PBe', status: 'online' },
  { code: 'RHB0218', name: 'RHB Now', status: 'online' },
  { code: 'HLB0224', name: 'Hong Leong Connect', status: 'online' },
  { code: 'AMBB0209', name: 'AmOnline', status: 'online' },
  { code: 'BIMB0340', name: 'Bank Islam', status: 'online' },
  { code: 'BMMB0341', name: 'Bank Muamalat', status: 'online' },
  { code: 'AFFIN0336', name: 'Affin Bank (AffinAlways)', status: 'online' },
  { code: 'ALLIANCE0302', name: 'allianceonline', status: 'online' },
  { code: 'BSN0601', name: 'myBSN', status: 'online' },
  { code: 'OCBC0229', name: 'OCBC Online Banking', status: 'online' },
  { code: 'SCB0216', name: 'Standard Chartered', status: 'online' },
  { code: 'UOB0226', name: 'UOB Personal Internet Banking', status: 'online' },
  { code: 'HSBC0223', name: 'HSBC Online Banking', status: 'online' },
  { code: 'KFH0346', name: 'Kuwait Finance House', status: 'online' },
  { code: 'AGRO01', name: 'Agrobank Agronet', status: 'online' },
];

export const METHOD_INFO: Record<string, { label: string; note: string; category?: 'fpx' | 'duitnow' | 'card' | 'wallet' }> = {
  fpx: { label: "FPX Online Banking", note: "Direct debit across 17 Malaysian commercial & Islamic banks", category: 'fpx' },
  duitnow: { label: "DuitNow QR", note: "National QR standard by PayNet — instant scan & pay with any banking app or e-wallet", category: 'duitnow' },
  card: { label: "Credit / Debit Card", note: "Visa, Mastercard, MyDebit local and international cards", category: 'card' },
  grabpay: { label: "GrabPay", note: "Grab wallet balance (Malaysia & Singapore)", category: 'wallet' },
  tng: { label: "Touch 'n Go eWallet", note: "Direct TNG eWallet payment via PayNet DuitNow network", category: 'wallet' },
};

/** Methods offered at checkout. PAYMENT_METHODS overrides, e.g. "fpx,duitnow,card,grabpay,tng". */
export const paymentMethods = (): string[] => {
  const raw = (process.env.PAYMENT_METHODS ?? "fpx,duitnow,card,grabpay,tng").split(",").map(s => s.trim().toLowerCase());
  const known = raw.filter(m => m in METHOD_INFO);
  return known.length ? [...new Set(known)] : ["fpx", "duitnow", "card"];
};

/** Wallets & payment systems requiring external settlement gateway. */
export const NOT_YET_AVAILABLE = ["Boost", "ShopeePay"];

/** Methods suitable for a patient region: FPX and DuitNow require Malaysian bank/e-wallet accounts. */
export const methodsFor = (region: PatientRegion) =>
  paymentMethods().filter(m => region === "MY" || (m !== "fpx" && m !== "duitnow" && m !== "tng")).map(id => ({ id, ...METHOD_INFO[id] }));

// ---------- service tax ----------
export const sstConfig = () => ({
  enabled: process.env.SST_ENABLED === "true",
  ratePct: Number.isFinite(Number(process.env.SST_RATE_PCT)) && process.env.SST_RATE_PCT ? Number(process.env.SST_RATE_PCT) : 6,
  registrationNo: process.env.SST_REG_NO || "",
});

export interface TaxResult { taxSen: number; ratePct: number; note: string | null }

/** Service tax on a professional fee. Only charged when SST_ENABLED=true and the patient is a non-citizen (INTL). */
export function computeTax(subtotalSen: number, region: PatientRegion): TaxResult {
  const c = sstConfig();
  if (!c.enabled) return { taxSen: 0, ratePct: 0, note: null };
  if (region === "MY") return { taxSen: 0, ratePct: 0, note: "Healthcare for Malaysian citizens is exempt from service tax." };
  return { taxSen: Math.round(subtotalSen * c.ratePct / 100), ratePct: c.ratePct, note: `Service tax (SST) ${c.ratePct}% on healthcare services for non-citizens.` };
}

// ---------- indicative currency conversion ----------
/**
 * Rates are supplied by the operator (FX_RATES_JSON='{"USD":0.21,"SGD":0.28}', MYR-based; FX_RATES_AS_OF='2026-10-01').
 * None are built in: without configuration no conversion is shown. Charging is always in MYR.
 */
export function indicativeConversions(amountMyr: number): { currency: string; amount: number; asOf: string | null }[] {
  try {
    const rates = JSON.parse(process.env.FX_RATES_JSON || "{}");
    return Object.entries(rates)
      .filter(([c, r]) => /^[A-Z]{3}$/.test(c) && typeof r === "number" && r > 0)
      .map(([currency, r]) => ({ currency, amount: Math.round(amountMyr * (r as number) * 100) / 100, asOf: process.env.FX_RATES_AS_OF || null }));
  } catch {
    return [];
  }
}

// ---------- refund and cancellation policy ----------
export interface RefundPolicy {
  region: PatientRegion;
  /** An appointment cancelled at least this many days ahead is refunded in full. */
  fullRefundMinDays: number;
  /** An instant consultation nobody joins is refunded automatically after this many minutes. */
  consultAutoRefundMinutes: number;
  summary: string;
}

const days = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 && process.env[name] !== undefined && process.env[name] !== "" ? Math.trunc(v) : fallback;
};

/** Defaults are the same for both regions (a business decision to confirm); each can be set separately. */
export function refundPolicy(region: PatientRegion): RefundPolicy {
  const fullRefundMinDays = region === "MY" ? days("REFUND_FULL_DAYS_MY", days("REFUND_FULL_DAYS", 1)) : days("REFUND_FULL_DAYS_INTL", days("REFUND_FULL_DAYS", 1));
  const consultAutoRefundMinutes = 10;
  const when = fullRefundMinDays === 0 ? "at any time before the appointment" : `at least ${fullRefundMinDays} day${fullRefundMinDays === 1 ? "" : "s"} before the appointment`;
  const how = region === "MY"
    ? "Refunds go back to the method you paid with (FPX, e-wallet or card); bank or wallet processing can take several business days."
    : "Refunds go back to the card or wallet you paid with, in Malaysian ringgit; your bank may show a different amount because of exchange rates, and processing can take several business days.";
  return {
    region, fullRefundMinDays, consultAutoRefundMinutes,
    summary: `Appointments cancelled ${when} are refunded in full, including any service tax. Later cancellations are not refundable. An instant consultation that no doctor joins within ${consultAutoRefundMinutes} minutes is refunded automatically. ${how}`,
  };
}
