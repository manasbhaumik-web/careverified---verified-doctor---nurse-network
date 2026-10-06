import crypto from "crypto";
import express, { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";

/**
 * Payments for bookings and instant consultations.
 *
 * Providers:
 *  - stripe:  used when STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET) are set. Hosted Checkout, so card data never
 *             touches this server. NOTE: not yet exercised against a live Stripe account.
 *  - sandbox: no real money; the patient confirms in-app. Disabled in production unless ALLOW_SANDBOX_PAYMENTS=true.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  professional_id TEXT,
  amount_sen INTEGER NOT NULL,
  platform_fee_sen INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  provider_ref TEXT,
  payment_intent TEXT,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  refunded_at TEXT,
  refund_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_pay_ref ON payments(kind, ref_id);
CREATE INDEX IF NOT EXISTS idx_pay_pro ON payments(professional_id, status);
`);

export interface Payable {
  kind: "booking" | "consult";
  id: string;
  userId: string;
  professionalId: string | null;
  amount: number; // RM
  description: string;
}
export interface PaymentRow {
  id: string; user_id: string; kind: "booking" | "consult"; ref_id: string; professional_id: string | null;
  amount_sen: number; platform_fee_sen: number; currency: string; status: string; provider: string;
  provider_ref: string | null; payment_intent: string | null; description: string;
  created_at: string; paid_at: string | null; refunded_at: string | null; refund_reason: string | null;
}
interface Handlers {
  resolve: (kind: string, refId: string) => Payable | null;
  onPaid: (p: PaymentRow) => void;
  onRefunded: (p: PaymentRow) => void;
}
let handlers: Handlers | null = null;
export const setPaymentHandlers = (h: Handlers) => { handlers = h; };

const stripeKey = () => process.env.STRIPE_SECRET_KEY || "";
const provider = (): "stripe" | "sandbox" | null =>
  stripeKey() ? "stripe"
  : process.env.NODE_ENV !== "production" || process.env.ALLOW_SANDBOX_PAYMENTS === "true" ? "sandbox"
  : null;
const commissionPct = () => Math.min(50, Math.max(0, Number(process.env.PLATFORM_COMMISSION_PCT ?? 15)));
const appUrl = () => (process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL : "http://localhost:3000").replace(/\/$/, "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const getPayment = (id: string) => db.prepare("SELECT * FROM payments WHERE id = ?").get(id) as unknown as PaymentRow | undefined;

export const paymentsEnabled = () => provider() !== null;
export const paymentMode = () => provider();

function markPaid(p: PaymentRow, paymentIntent?: string) {
  const changed = db.prepare("UPDATE payments SET status='paid', paid_at=?, payment_intent=COALESCE(?, payment_intent) WHERE id=? AND status='pending'")
    .run(new Date().toISOString(), paymentIntent ?? null, p.id).changes;
  if (changed) {
    audit(null, "payment.paid", { actor: { id: p.user_id, role: "patient" }, target: ["payment", p.id], details: { kind: p.kind, amountSen: p.amount_sen } });
    handlers?.onPaid(getPayment(p.id)!);
  }
}

export async function refundPayment(paymentId: string, reason: string, actorId: string | null): Promise<{ ok: boolean; error?: string }> {
  const p = getPayment(paymentId);
  if (!p) return { ok: false, error: "Payment not found." };
  if (p.status !== "paid") return { ok: false, error: "Only paid payments can be refunded." };
  if (p.provider === "stripe") {
    if (!p.payment_intent) return { ok: false, error: "No Stripe payment intent recorded." };
    const r = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey()}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ payment_intent: p.payment_intent, "metadata[payment_id]": p.id }),
    });
    if (!r.ok) return { ok: false, error: "The payment provider refused the refund." };
  }
  db.prepare("UPDATE payments SET status='refunded', refunded_at=?, refund_reason=? WHERE id=?").run(new Date().toISOString(), reason, p.id);
  audit(null, "payment.refund", { actor: actorId ? { id: actorId, role: "admin" } : null, target: ["payment", p.id], details: { reason } });
  handlers?.onRefunded(getPayment(p.id)!);
  return { ok: true };
}

/** Must be registered BEFORE express.json(): Stripe signs the raw request body. */
export function registerPaymentWebhook(app: Application) {
  app.post("/api/payments/stripe-webhook", express.raw({ type: "application/json", limit: "1mb" }), (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const header = String(req.headers["stripe-signature"] || "");
    if (!secret || !Buffer.isBuffer(req.body)) return res.status(400).end();
    const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=") as [string, string]));
    const t = Number(parts.t);
    const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${req.body.toString("utf8")}`).digest("hex");
    const sigOk = parts.v1 && parts.v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
    if (!sigOk || !t || Math.abs(Date.now() / 1000 - t) > 300) return res.status(400).end();

    const event = JSON.parse(req.body.toString("utf8"));
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const p = getPayment(s.client_reference_id);
      if (p && s.payment_status === "paid" && s.amount_total === p.amount_sen) markPaid(p, typeof s.payment_intent === "string" ? s.payment_intent : undefined);
    }
    res.json({ received: true });
  });
}

export function registerPaymentRoutes(app: Application) {
  app.get("/api/payments/config", (_req, res) => {
    res.json({ status: "success", data: { mode: provider(), currency: "MYR" } });
  });

  app.post("/api/payments/checkout", requireRole("patient"), async (req, res) => {
    const prov = provider();
    if (!prov) return fail(res, 503, "Online payments are not configured yet.");
    const kind = String(req.body.kind);
    const payable = handlers?.resolve(kind, String(req.body.refId));
    if (!payable || payable.userId !== req.user!.id) return fail(res, 404, "Nothing to pay for.");

    const existing = db.prepare("SELECT * FROM payments WHERE kind=? AND ref_id=? ORDER BY created_at DESC").all(kind, payable.id) as unknown as PaymentRow[];
    if (existing.some(p => p.status === "paid")) return fail(res, 409, "This has already been paid.");

    const amountSen = Math.round(payable.amount * 100);
    if (!(amountSen > 0)) return fail(res, 400, "Invalid amount.");
    let pay = existing.find(p => p.status === "pending" && p.provider === prov && p.amount_sen === amountSen);
    if (!pay) {
      const id = "pay-" + crypto.randomBytes(8).toString("hex");
      db.prepare(
        `INSERT INTO payments (id,user_id,kind,ref_id,professional_id,amount_sen,platform_fee_sen,provider,description,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).run(id, payable.userId, kind, payable.id, payable.professionalId, amountSen, Math.round(amountSen * commissionPct() / 100), prov, payable.description, new Date().toISOString());
      pay = getPayment(id)!;
    }

    if (prov === "sandbox") {
      return res.json({ status: "success", data: { paymentId: pay.id, provider: "sandbox", amount: payable.amount } });
    }

    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "myr",
      "line_items[0][price_data][unit_amount]": String(amountSen),
      "line_items[0][price_data][product_data][name]": payable.description,
      client_reference_id: pay.id,
      "metadata[payment_id]": pay.id,
      success_url: `${appUrl()}/?payment=success&pid=${pay.id}`,
      cancel_url: `${appUrl()}/?payment=cancelled&pid=${pay.id}`,
    });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey()}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const session: any = await r.json().catch(() => ({}));
    if (!r.ok || !session.url) return fail(res, 502, "Could not start the payment. Please try again.");
    db.prepare("UPDATE payments SET provider_ref = ? WHERE id = ?").run(session.id, pay.id);
    res.json({ status: "success", data: { paymentId: pay.id, provider: "stripe", checkoutUrl: session.url } });
  });

  // Test-mode confirmation (no real money)
  app.post("/api/payments/:id/sandbox-confirm", requireRole("patient"), (req, res) => {
    const p = getPayment(req.params.id);
    if (!p || p.user_id !== req.user!.id) return fail(res, 404, "Payment not found.");
    if (p.provider !== "sandbox" || provider() !== "sandbox") return fail(res, 400, "This payment cannot be confirmed here.");
    markPaid(p);
    res.json({ status: "success", data: getPayment(p.id) });
  });

  app.get("/api/payments/:id", requireAuth, (req, res) => {
    const p = getPayment(req.params.id);
    const u = req.user!;
    if (!p || (p.user_id !== u.id && u.role !== "admin" && !(u.role === "practitioner" && p.professional_id === u.profileId))) {
      return fail(res, 404, "Payment not found.");
    }
    res.json({ status: "success", data: p });
  });

  // Receipt / invoice for a paid or refunded payment
  app.get("/api/payments/:id/invoice", requireAuth, (req, res) => {
    const p = getPayment(req.params.id);
    const u = req.user!;
    if (!p || p.status === "pending" || (p.user_id !== u.id && u.role !== "admin")) return fail(res, 404, "Invoice not found.");
    const patient = db.prepare("SELECT name, email FROM users WHERE id = ?").get(p.user_id) as any;
    res.json({
      status: "success",
      data: {
        invoiceNumber: "INV-" + p.id.slice(4).toUpperCase(), paymentId: p.id, issuedAt: p.paid_at,
        billedTo: patient, description: p.description, currency: p.currency, total: p.amount_sen / 100,
        status: p.status, refundedAt: p.refunded_at, provider: p.provider,
        testMode: p.provider === "sandbox",
      },
    });
  });

  // Practitioner earnings (net of platform commission). Payout transfers are not automated yet.
  app.get("/api/me/earnings", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return res.json({ status: "success", data: { rows: [], totals: { gross: 0, fee: 0, net: 0 } } });
    const rows = db.prepare(
      "SELECT id, kind, description, amount_sen, platform_fee_sen, status, paid_at, refunded_at, provider FROM payments WHERE professional_id = ? AND status IN ('paid','refunded') ORDER BY paid_at DESC LIMIT 200"
    ).all(pid) as any[];
    const paid = rows.filter(r => r.status === "paid");
    const gross = paid.reduce((s, r) => s + r.amount_sen, 0);
    const fee = paid.reduce((s, r) => s + r.platform_fee_sen, 0);
    res.json({
      status: "success",
      data: {
        rows: rows.map(r => ({ ...r, net: (r.amount_sen - r.platform_fee_sen) / 100, gross: r.amount_sen / 100, testMode: r.provider === "sandbox" })),
        totals: { gross: gross / 100, fee: fee / 100, net: (gross - fee) / 100 },
        commissionPct: commissionPct(),
      },
    });
  });

  // Admin
  app.get("/api/admin/payments", requireRole("admin"), (_req, res) => {
    const rows = db.prepare(
      `SELECT p.*, u.name AS patientName FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 200`
    ).all();
    const totals = db.prepare("SELECT COALESCE(SUM(amount_sen),0) AS gross, COALESCE(SUM(platform_fee_sen),0) AS fee FROM payments WHERE status='paid'").get() as any;
    res.json({ status: "success", data: { rows, mode: provider(), totals: { gross: totals.gross / 100, platformFee: totals.fee / 100 } } });
  });

  app.post("/api/payments/:id/refund", requireRole("admin"), async (req, res) => {
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!reason) return fail(res, 400, "A reason is required.");
    const r = await refundPayment(req.params.id, reason, req.user!.id);
    if (!r.ok) return fail(res, 400, r.error || "Refund failed.");
    res.json({ status: "success" });
  });
}
