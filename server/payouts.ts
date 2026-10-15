import crypto from "crypto";
import fs from "fs";
import path from "path";
import rateLimit from "express-rate-limit";
import type { Application, Request, Response } from "express";
import { db, dataDir } from "./db";
import { audit } from "./audit";
import { requireRole, verifyPassword } from "./auth";
import { notify, notifyAdmins } from "./verification";

/**
 * Practitioner payouts.
 *
 * Money flow: patients pay the platform. Each paid consultation has a professional fee, an optional pass-through service tax,
 * and the platform commission (fixed when the payment was made). What the practitioner earns is  amount - tax - commission.
 * Nothing is sent automatically. The board runs payouts by bank transfer:
 *
 *   earnings become payable  ->  admin creates a batch  ->  approves it  ->  exports a bank file  ->  pays in the bank
 *   ->  records the bank reference for each payout  ->  the practitioner is told and can download a statement.
 *
 * Rules that keep it safe:
 *  - An earning is payable only after the visit is completed and PAYOUT_HOLD_DAYS have passed (refund and dispute window).
 *  - Each payment can be in at most one payout (primary key on payout_items). Refunds that happen after a payout was paid
 *    become a negative adjustment in the practitioner's next payout, so nothing is clawed back by hand.
 *  - A payout is only created for a practitioner whose bank account the board has verified (name matches the licence), and the
 *    bank details are copied into the payout when it is created, so a later change cannot redirect an approved payout.
 *  - Changing bank details needs the practitioner's password, resets verification and alerts the board.
 *  - Account numbers are encrypted (AES-256-GCM). Set PAYOUT_ENCRYPTION_KEY in production; without it bank details are not accepted.
 *  - Amounts under PAYOUT_MIN_MYR roll over to the next run. PAYOUT_FOUR_EYES=true requires a different admin to approve a batch.
 *
 * Not decided here (needs an accountant): withholding tax for non-resident practitioners, e-invoicing/self-billing, and the
 * retention period for payout records. See docs/PAYOUTS.md.
 */

const iso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const newId = (p: string) => `${p}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
const myr = (sen: number) => (sen / 100).toFixed(2);
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

// ---------- configuration ----------
const nonNegInt = (v: string | undefined, d: number) => (v !== undefined && v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0 ? Number(v) : d);
export const holdDays = () => nonNegInt(process.env.PAYOUT_HOLD_DAYS, 7);
export const minimumSen = () => Math.round((Number.isFinite(Number(process.env.PAYOUT_MIN_MYR)) && process.env.PAYOUT_MIN_MYR ? Number(process.env.PAYOUT_MIN_MYR) : 50) * 100);
const fourEyes = () => process.env.PAYOUT_FOUR_EYES === "true";

/** What a practitioner is told before joining and in their earnings page. */
export const payoutTerms = () => ({
  method: "bank transfer", runBy: "the board", automated: false,
  schedule: str(process.env.PAYOUT_SCHEDULE, 40) || "monthly",
  holdDays: holdDays(), minimumPayout: minimumSen() / 100, currency: "MYR",
  bankAccounts: "Malaysian bank accounts in your own name",
});

// ---------- encryption of bank account numbers ----------
function encryptionKey(): Buffer | null {
  const env = process.env.PAYOUT_ENCRYPTION_KEY;
  if (env) {
    const b = /^[0-9a-fA-F]{64}$/.test(env) ? Buffer.from(env, "hex") : Buffer.from(env, "base64");
    return b.length === 32 ? b : null;
  }
  if (process.env.NODE_ENV === "production") return null;
  // Development only: a key kept in a file next to, not inside, the database.
  const f = path.join(dataDir, ".payout-key");
  try {
    if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    return Buffer.from(fs.readFileSync(f, "utf8").trim(), "hex");
  } catch { return null; }
}
export const bankDetailsAvailable = () => encryptionKey() !== null;
export function encryptText(plain: string): string {
  const key = encryptionKey();
  if (!key) throw new Error("Payout encryption key is not configured.");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
export function decryptText(blob: string): string {
  const key = encryptionKey();
  if (!key || !blob.startsWith("v1:")) throw new Error("Cannot decrypt.");
  const raw = Buffer.from(blob.slice(3), "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

// ---------- validation ----------
export const normaliseAccountNumber = (s: string) => s.replace(/[\s-]/g, "");
export function bankProblem(b: any): string | null {
  if (str(b?.bankName, 60).length < 2) return "Enter the name of your bank.";
  if (str(b?.accountName, 120).length < 2) return "Enter the account holder name exactly as the bank has it.";
  if (!/^\d{6,20}$/.test(normaliseAccountNumber(str(b?.accountNumber, 40)))) return "Enter the account number using digits only (6 to 20 digits).";
  return null;
}

// ---------- schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS payout_accounts (
  professional_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, bank_name TEXT NOT NULL, account_name TEXT NOT NULL,
  account_enc TEXT NOT NULL, last4 TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unverified',
  verified_by TEXT, verified_at TEXT, note TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payout_batches (
  id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'draft', note TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
  approved_by TEXT, approved_at TEXT, exported_at TEXT, total_sen INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, professional_id TEXT NOT NULL, user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', amount_sen INTEGER NOT NULL, earnings_sen INTEGER NOT NULL, adjustments_sen INTEGER NOT NULL DEFAULT 0,
  bank_name TEXT NOT NULL, account_name TEXT NOT NULL, account_enc TEXT NOT NULL, last4 TEXT NOT NULL,
  reference TEXT, paid_on TEXT, failure_reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payouts_pro ON payouts(professional_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_batch ON payouts(batch_id);
CREATE TABLE IF NOT EXISTS payout_items (
  payout_id TEXT NOT NULL, payment_id TEXT NOT NULL, kind TEXT NOT NULL, amount_sen INTEGER NOT NULL,
  gross_sen INTEGER NOT NULL DEFAULT 0, fee_sen INTEGER NOT NULL DEFAULT 0, description TEXT, service_date TEXT,
  PRIMARY KEY (payment_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_items_payout ON payout_items(payout_id);
`);

// ---------- eligibility ----------
export interface Earning { paymentId: string; professionalId: string; netSen: number; grossSen: number; feeSen: number; description: string; serviceDate: string | null; state: "ready" | "waiting"; readyOn: string | null; reason: string | null; sandbox: boolean }
export interface Adjustment { paymentId: string; professionalId: string; amountSen: number; description: string }

/**
 * Every paid payment that is not yet in a payout, with whether it is payable today, and the negative adjustments owed for
 * payments refunded after their payout was paid. `getBooking` supplies the visit status for booked appointments.
 */
export function earningsFor(getBooking: (id: string) => any, professionalId?: string, now = today()): { earnings: Earning[]; adjustments: Adjustment[] } {
  const hold = holdDays();
  const where = professionalId ? "AND p.professional_id = ?" : "";
  const args = professionalId ? [professionalId] : [];
  const paid = rows(
    `SELECT p.* FROM payments p WHERE p.professional_id IS NOT NULL AND p.status = 'paid' ${where}
       AND NOT EXISTS (SELECT 1 FROM payout_items i WHERE i.payment_id = p.id AND i.kind = 'earning') ORDER BY p.paid_at`, ...args);
  const earnings: Earning[] = paid.map(p => {
    const net = p.amount_sen - (p.tax_sen ?? 0) - p.platform_fee_sen;
    let serviceDate: string | null = null, done = false;
    if (p.kind === "booking") {
      const b = getBooking(p.ref_id);
      done = !!b && b.status === "Completed";
      serviceDate = b?.date ?? null;
    } else {
      const c = row("SELECT status, ended_at FROM consults WHERE id = ?", p.ref_id);
      done = !!c && c.status === "completed";
      serviceDate = c?.ended_at ? String(c.ended_at).slice(0, 10) : null;
    }
    const readyOn = serviceDate ? addDays(serviceDate, hold) : null;
    const ready = done && !!readyOn && readyOn <= now && net > 0;
    return {
      paymentId: p.id, professionalId: p.professional_id, netSen: net, grossSen: p.amount_sen - (p.tax_sen ?? 0), feeSen: p.platform_fee_sen,
      description: p.description, serviceDate, state: ready ? "ready" : "waiting", readyOn,
      reason: ready ? null : !done ? "Waiting for the visit to be completed" : `Payable from ${readyOn}`, sandbox: p.provider === "sandbox",
    };
  });
  const refunded = rows(
    `SELECT p.id, p.professional_id, p.description, i.amount_sen FROM payments p
       JOIN payout_items i ON i.payment_id = p.id AND i.kind = 'earning'
       JOIN payouts o ON o.id = i.payout_id AND o.status = 'paid'
      WHERE p.status = 'refunded' ${where}
        AND NOT EXISTS (SELECT 1 FROM payout_items a WHERE a.payment_id = p.id AND a.kind = 'adjustment')`, ...args);
  const adjustments: Adjustment[] = refunded.map(r => ({ paymentId: r.id, professionalId: r.professional_id, amountSen: -r.amount_sen, description: `Refund after payout: ${r.description}` }));
  return { earnings, adjustments };
}

export const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // a spreadsheet must not run a cell as a formula
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csv = (header: string[], lines: unknown[][]) => [header, ...lines].map(l => l.map(csvCell).join(",")).join("\r\n") + "\r\n";

// ---------- routes ----------
export function registerPayouts(app: Application, ctx: { getBooking: (id: string) => any; findProfessional: (id: string) => any | undefined }) {
  const nameOf = (pid: string) => ctx.findProfessional(pid)?.name ?? pid;
  const accountLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { status: "error", message: "Too many changes. Try again later." } });

  const maskedAccount = (a: any) => a ? { bankName: a.bank_name, accountName: a.account_name, last4: a.last4, status: a.status, verifiedAt: a.verified_at, note: a.note, updatedAt: a.updated_at } : null;
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

  function summaryFor(pid: string) {
    const { earnings, adjustments } = earningsFor(ctx.getBooking, pid);
    const ready = earnings.filter(e => e.state === "ready"), waiting = earnings.filter(e => e.state === "waiting");
    const paidOut = (row("SELECT COALESCE(SUM(amount_sen),0) AS n FROM payouts WHERE professional_id = ? AND status = 'paid'", pid).n as number);
    const inBatch = (row("SELECT COALESCE(SUM(amount_sen),0) AS n FROM payouts WHERE professional_id = ? AND status = 'pending'", pid).n as number);
    const availableSen = sum(ready.map(e => e.netSen)) + sum(adjustments.map(a => a.amountSen));
    return { ready, waiting, adjustments, waitingSen: sum(waiting.map(e => e.netSen)), availableSen, inBatchSen: inBatch, paidSen: paidOut };
  }

  // ===== practitioner =====
  app.get("/api/me/payouts", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return res.json({ status: "success", data: { terms: payoutTerms(), bank: null, bankAvailable: bankDetailsAvailable(), summary: null, upcoming: [], payouts: [] } });
    const s = summaryFor(pid);
    const payouts = rows("SELECT id, status, amount_sen, earnings_sen, adjustments_sen, reference, paid_on, failure_reason, created_at, last4, bank_name FROM payouts WHERE professional_id = ? ORDER BY created_at DESC LIMIT 100", pid)
      .map(p => ({ id: p.id, status: p.status, amount: p.amount_sen / 100, earnings: p.earnings_sen / 100, adjustments: p.adjustments_sen / 100, reference: p.reference, paidOn: p.paid_on, failureReason: p.failure_reason, createdAt: p.created_at, bank: `${p.bank_name} ••••${p.last4}` }));
    res.json({
      status: "success",
      data: {
        terms: payoutTerms(), bankAvailable: bankDetailsAvailable(), bank: maskedAccount(row("SELECT * FROM payout_accounts WHERE professional_id = ?", pid)),
        summary: { waiting: s.waitingSen / 100, available: s.availableSen / 100, inPayout: s.inBatchSen / 100, paid: s.paidSen / 100, belowMinimum: s.availableSen > 0 && s.availableSen < minimumSen() },
        upcoming: [...s.waiting, ...s.ready].slice(0, 60).map(e => ({ paymentId: e.paymentId, description: e.description, net: e.netSen / 100, state: e.state, note: e.reason, serviceDate: e.serviceDate, testMode: e.sandbox })),
        adjustments: s.adjustments.map(a => ({ paymentId: a.paymentId, description: a.description, amount: a.amountSen / 100 })),
        payouts,
      },
    });
  });

  app.put("/api/me/payout-account", requireRole("practitioner"), accountLimiter, (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return fail(res, 400, "Finish your practitioner registration first.");
    if (!bankDetailsAvailable()) return fail(res, 503, "Bank details cannot be saved yet because the server has no encryption key. Ask the board.");
    const u = row("SELECT password_hash FROM users WHERE id = ?", req.user!.id);
    if (!u || !verifyPassword(str(req.body?.password, 200), u.password_hash)) return fail(res, 403, "Your password is not correct.");
    const problem = bankProblem(req.body);
    if (problem) return fail(res, 400, problem);
    const number = normaliseAccountNumber(str(req.body.accountNumber, 40));
    db.prepare(`INSERT INTO payout_accounts (professional_id,user_id,bank_name,account_name,account_enc,last4,status,updated_at) VALUES (?,?,?,?,?,?, 'unverified', ?)
      ON CONFLICT(professional_id) DO UPDATE SET bank_name=excluded.bank_name, account_name=excluded.account_name, account_enc=excluded.account_enc, last4=excluded.last4,
        status='unverified', verified_by=NULL, verified_at=NULL, note=NULL, updated_at=excluded.updated_at`)
      .run(pid, req.user!.id, str(req.body.bankName, 60), str(req.body.accountName, 120), encryptText(number), number.slice(-4), iso());
    notifyAdmins("Payout account to verify", `${nameOf(pid)} added or changed their bank details.`);
    audit(req, "payout.account.update", { target: ["professional", pid] });
    res.json({ status: "success" });
  });

  app.get("/api/me/payouts/:id/statement.csv", requireRole("practitioner"), (req, res) => {
    const p = row("SELECT * FROM payouts WHERE id = ? AND professional_id = ?", req.params.id, req.user!.profileId);
    if (!p) return fail(res, 404, "Payout not found.");
    const items = rows("SELECT * FROM payout_items WHERE payout_id = ? ORDER BY service_date, payment_id", p.id);
    const out = csv(["Payout", "Type", "Visit date", "Description", "Payment", "Fee before commission (MYR)", "Commission (MYR)", "You receive (MYR)"],
      items.map(i => [p.id, i.kind === "adjustment" ? "Adjustment" : "Earning", i.service_date ?? "", i.description ?? "", i.payment_id, myr(i.gross_sen), myr(i.fee_sen), myr(i.amount_sen)]));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="payout-${p.id}.csv"`);
    res.send(out);
  });

  // ===== admin =====
  app.get("/api/admin/payouts/overview", requireRole("admin"), (_req, res) => {
    const { earnings, adjustments } = earningsFor(ctx.getBooking);
    const pids = [...new Set([...earnings.map(e => e.professionalId), ...adjustments.map(a => a.professionalId)])];
    const accounts = new Map(rows("SELECT * FROM payout_accounts").map(a => [a.professional_id as string, a]));
    const preview = pids.map(pid => {
      const ready = earnings.filter(e => e.professionalId === pid && e.state === "ready");
      const waiting = earnings.filter(e => e.professionalId === pid && e.state === "waiting");
      const adj = adjustments.filter(a => a.professionalId === pid);
      const net = sum(ready.map(e => e.netSen)) + sum(adj.map(a => a.amountSen));
      const acct = accounts.get(pid);
      const reason = !ready.length && !adj.length ? "Nothing payable yet" : net < minimumSen() ? `Below the RM ${myr(minimumSen())} minimum: rolls over` : !acct ? "No bank details" : acct.status !== "verified" ? "Bank account not verified" : null;
      return { professionalId: pid, name: nameOf(pid), readySen: sum(ready.map(e => e.netSen)), adjustmentsSen: sum(adj.map(a => a.amountSen)), netSen: net, waitingSen: sum(waiting.map(e => e.netSen)), items: ready.length + adj.length, willBePaid: !reason, reason, sandbox: ready.some(e => e.sandbox) };
    }).sort((a, b) => b.netSen - a.netSen);
    const toVerify = rows("SELECT professional_id, bank_name, account_name, last4, status, updated_at, note FROM payout_accounts ORDER BY status = 'verified', updated_at DESC LIMIT 100")
      .map(a => ({ professionalId: a.professional_id, practitionerName: nameOf(a.professional_id), bankName: a.bank_name, accountName: a.account_name, last4: a.last4, status: a.status, updatedAt: a.updated_at, note: a.note, nameMatches: a.account_name.trim().toLowerCase() === String(nameOf(a.professional_id)).trim().toLowerCase() }));
    const batches = rows("SELECT b.*, (SELECT COUNT(*) FROM payouts p WHERE p.batch_id = b.id) AS n FROM payout_batches b ORDER BY created_at DESC LIMIT 50")
      .map(b => ({ id: b.id, status: b.status, note: b.note, totalSen: b.total_sen, count: b.n, createdAt: b.created_at, approvedAt: b.approved_at, exportedAt: b.exported_at, createdBy: b.created_by, approvedBy: b.approved_by }));
    res.json({ status: "success", data: { terms: payoutTerms(), fourEyes: fourEyes(), bankAvailable: bankDetailsAvailable(), preview, accounts: toVerify, batches } });
  });

  app.post("/api/admin/payout-accounts/:pid/verify", requireRole("admin"), (req, res) => {
    const a = row("SELECT * FROM payout_accounts WHERE professional_id = ?", req.params.pid);
    if (!a) return fail(res, 404, "No bank details for this practitioner.");
    const ok = req.body?.verified === true;
    const note = str(req.body?.note, 300) || null;
    if (ok && req.body?.nameChecked !== true) return fail(res, 400, "Confirm you have checked that the account holder name matches the practitioner's name.");
    if (!ok && !note) return fail(res, 400, "Say why it is not verified, so the practitioner can fix it.");
    db.prepare("UPDATE payout_accounts SET status = ?, verified_by = ?, verified_at = ?, note = ? WHERE professional_id = ?").run(ok ? "verified" : "rejected", ok ? req.user!.id : null, ok ? iso() : null, note, a.professional_id);
    notify(a.user_id, ok ? "Your bank account is verified" : "Your bank details need attention", ok ? "You will be included in the next payout." : note!);
    audit(req, "payout.account.verify", { target: ["professional", a.professional_id], details: { verified: ok } });
    res.json({ status: "success" });
  });

  // Closing a practitioner's account (automatic erasure covers patients only): remove their bank details. Payout records stay for
  // accounting, with the amounts, dates, bank reference and last four digits, but without the holder name or full number.
  app.delete("/api/admin/payout-accounts/:pid", requireRole("admin"), (req, res) => {
    const a = row("SELECT * FROM payout_accounts WHERE professional_id = ?", req.params.pid);
    if (!a) return fail(res, 404, "No bank details for this practitioner.");
    if (row("SELECT COUNT(*) AS n FROM payouts WHERE professional_id = ? AND status = 'pending'", a.professional_id).n > 0) return fail(res, 409, "A payout for this practitioner is still being processed. Finish or cancel it first.");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM payout_accounts WHERE professional_id = ?").run(a.professional_id);
      db.prepare("UPDATE payouts SET account_enc = 'erased', account_name = 'Deleted' WHERE professional_id = ?").run(a.professional_id);
      db.exec("COMMIT");
    } catch (e) { try { db.exec("ROLLBACK"); } catch { /* done */ } throw e; }
    audit(req, "payout.account.delete", { target: ["professional", a.professional_id] });
    res.json({ status: "success" });
  });

  const loadBatch = (id: string) => row("SELECT * FROM payout_batches WHERE id = ?", id);
  const batchPayouts = (id: string) => rows("SELECT * FROM payouts WHERE batch_id = ? ORDER BY amount_sen DESC", id);
  /** Payments in a payout that were refunded since it was prepared. Paying them would pay for a visit that was refunded. */
  const refundedItems = (payoutIds: string[]) => payoutIds.length === 0 ? [] : rows(
    `SELECT i.payout_id, i.payment_id FROM payout_items i JOIN payments p ON p.id = i.payment_id WHERE i.kind = 'earning' AND p.status = 'refunded' AND i.payout_id IN (${payoutIds.map(() => "?").join(",")})`, ...payoutIds);
  const releasePayout = (payoutId: string, status: string, reason?: string) => {
    db.prepare("DELETE FROM payout_items WHERE payout_id = ?").run(payoutId);
    db.prepare("UPDATE payouts SET status = ?, failure_reason = COALESCE(?, failure_reason), updated_at = ? WHERE id = ?").run(status, reason ?? null, iso(), payoutId);
  };
  const refreshBatch = (id: string) => {
    const open = row("SELECT COUNT(*) AS n FROM payouts WHERE batch_id = ? AND status = 'pending'", id).n as number;
    const b = loadBatch(id);
    if (b && open === 0 && ["approved", "exported"].includes(b.status)) db.prepare("UPDATE payout_batches SET status = 'completed' WHERE id = ?").run(id);
  };

  app.post("/api/admin/payout-batches", requireRole("admin"), (req, res) => {
    if (!bankDetailsAvailable()) return fail(res, 503, "The server has no payout encryption key.");
    const { earnings, adjustments } = earningsFor(ctx.getBooking);
    const accounts = new Map(rows("SELECT * FROM payout_accounts WHERE status = 'verified'").map(a => [a.professional_id as string, a]));
    const pids = [...new Set([...earnings.filter(e => e.state === "ready").map(e => e.professionalId), ...adjustments.map(a => a.professionalId)])];
    const batchId = newId("PB"), now = iso();
    const skipped: { professional: string; reason: string }[] = [];
    let total = 0, count = 0;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO payout_batches (id,status,note,created_by,created_at) VALUES (?, 'draft', ?, ?, ?)").run(batchId, str(req.body?.note, 300) || null, req.user!.id, now);
      for (const pid of pids) {
        const ready = earnings.filter(e => e.professionalId === pid && e.state === "ready");
        const adj = adjustments.filter(a => a.professionalId === pid);
        const net = sum(ready.map(e => e.netSen)) + sum(adj.map(a => a.amountSen));
        const acct = accounts.get(pid);
        if (net < minimumSen()) { skipped.push({ professional: nameOf(pid), reason: net <= 0 ? "Nothing to pay after adjustments: carried forward" : `Below the minimum: rolls over` }); continue; }
        if (!acct) { skipped.push({ professional: nameOf(pid), reason: "Bank account missing or not verified" }); continue; }
        const payoutId = newId("PO");
        db.prepare(`INSERT INTO payouts (id,batch_id,professional_id,user_id,status,amount_sen,earnings_sen,adjustments_sen,bank_name,account_name,account_enc,last4,created_at,updated_at)
          VALUES (?,?,?,?, 'pending', ?,?,?,?,?,?,?,?,?)`).run(payoutId, batchId, pid, acct.user_id, net, sum(ready.map(e => e.netSen)), sum(adj.map(a => a.amountSen)), acct.bank_name, acct.account_name, acct.account_enc, acct.last4, now, now);
        const ins = db.prepare("INSERT INTO payout_items (payout_id,payment_id,kind,amount_sen,gross_sen,fee_sen,description,service_date) VALUES (?,?,?,?,?,?,?,?)");
        for (const e of ready) ins.run(payoutId, e.paymentId, "earning", e.netSen, e.grossSen, e.feeSen, e.description, e.serviceDate);
        for (const a of adj) ins.run(payoutId, a.paymentId, "adjustment", a.amountSen, 0, 0, a.description, null);
        total += net; count++;
      }
      if (count === 0) { db.exec("ROLLBACK"); return fail(res, 400, "Nothing is ready to pay." + (skipped.length ? ` Skipped: ${skipped.map(s => `${s.professional} (${s.reason})`).join("; ")}.` : "")); }
      db.prepare("UPDATE payout_batches SET total_sen = ? WHERE id = ?").run(total, batchId);
      db.exec("COMMIT");
    } catch (e) { try { db.exec("ROLLBACK"); } catch { /* already rolled back */ } throw e; }
    audit(req, "payout.batch.create", { target: ["payout_batch", batchId], details: { payouts: count, totalSen: total } });
    res.status(201).json({ status: "success", data: { id: batchId, payouts: count, total: total / 100, skipped } });
  });

  app.get("/api/admin/payout-batches/:id", requireRole("admin"), (req, res) => {
    const b = loadBatch(req.params.id);
    if (!b) return fail(res, 404, "Batch not found.");
    const payouts = batchPayouts(b.id).map(p => ({
      id: p.id, professionalId: p.professional_id, name: nameOf(p.professional_id), status: p.status, amount: p.amount_sen / 100, earnings: p.earnings_sen / 100, adjustments: p.adjustments_sen / 100,
      bank: `${p.bank_name} ••••${p.last4}`, accountName: p.account_name, reference: p.reference, paidOn: p.paid_on, failureReason: p.failure_reason,
      items: (row("SELECT COUNT(*) AS n FROM payout_items WHERE payout_id = ?", p.id).n as number),
    }));
    res.json({ status: "success", data: { id: b.id, status: b.status, note: b.note, total: b.total_sen / 100, createdAt: b.created_at, createdBy: b.created_by, approvedBy: b.approved_by, approvedAt: b.approved_at, exportedAt: b.exported_at, fourEyes: fourEyes(), payouts, refunded: refundedItems(batchPayouts(b.id).filter(p => p.status === "pending").map(p => p.id)).length } });
  });

  app.post("/api/admin/payout-batches/:id/approve", requireRole("admin"), (req, res) => {
    const b = loadBatch(req.params.id);
    if (!b) return fail(res, 404, "Batch not found.");
    if (b.status !== "draft") return fail(res, 409, "Only a draft batch can be approved.");
    if (fourEyes() && b.created_by === req.user!.id) return fail(res, 403, "A different admin must approve this batch.");
    const bad = refundedItems(batchPayouts(b.id).map(p => p.id));
    if (bad.length) return fail(res, 409, `${bad.length} payment(s) in this batch were refunded since it was prepared. Cancel the batch and create a new one.`);
    db.prepare("UPDATE payout_batches SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?").run(req.user!.id, iso(), b.id);
    audit(req, "payout.batch.approve", { target: ["payout_batch", b.id] });
    res.json({ status: "success" });
  });

  // The bank file. It contains full account numbers, so it is admin only, audit logged and only for approved batches.
  app.get("/api/admin/payout-batches/:id/export.csv", requireRole("admin"), (req, res) => {
    const b = loadBatch(req.params.id);
    if (!b) return fail(res, 404, "Batch not found.");
    if (!["approved", "exported"].includes(b.status)) return fail(res, 409, "Approve the batch before exporting it.");
    const pending = batchPayouts(b.id).filter(p => p.status === "pending");
    const bad = refundedItems(pending.map(p => p.id));
    if (bad.length) return fail(res, 409, `${bad.length} payment(s) in this batch were refunded since it was approved. Cancel the batch and create a new one.`);
    const out = csv(["Payout ID", "Beneficiary name", "Bank", "Account number", "Amount (MYR)", "Payment reference", "Email"],
      pending.map(p => [p.id, p.account_name, p.bank_name, decryptText(p.account_enc), myr(p.amount_sen), `MEDCRED ${p.id}`, row("SELECT email FROM users WHERE id = ?", p.user_id)?.email ?? ""]));
    db.prepare("UPDATE payout_batches SET status = 'exported', exported_at = COALESCE(exported_at, ?) WHERE id = ?").run(iso(), b.id);
    audit(req, "payout.batch.export", { target: ["payout_batch", b.id], details: { payouts: pending.length } });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="payouts-${b.id}.csv"`);
    res.send(out);
  });

  app.post("/api/admin/payouts/:id/paid", requireRole("admin"), (req, res) => {
    const p = row("SELECT * FROM payouts WHERE id = ?", req.params.id);
    if (!p) return fail(res, 404, "Payout not found.");
    const b = loadBatch(p.batch_id);
    if (p.status !== "pending") return fail(res, 409, `This payout is already ${p.status}.`);
    if (!b || !["approved", "exported"].includes(b.status)) return fail(res, 409, "The batch must be approved first.");
    const reference = str(req.body?.reference, 60), paidOn = str(req.body?.paidOn, 10) || today();
    if (reference.length < 3) return fail(res, 400, "Enter the bank's reference for this transfer.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today()) return fail(res, 400, "Enter the date the money was sent (not in the future).");
    if (refundedItems([p.id]).length) return fail(res, 409, "A payment in this payout was refunded after approval. Mark it failed so the rest is released, then prepare a new batch.");
    db.prepare("UPDATE payouts SET status = 'paid', reference = ?, paid_on = ?, updated_at = ? WHERE id = ?").run(reference, paidOn, iso(), p.id);
    refreshBatch(p.batch_id);
    notify(p.user_id, "A payout was sent to you", `RM ${myr(p.amount_sen)} to ${p.bank_name} ••••${p.last4}. Bank reference ${reference}.`);
    audit(req, "payout.paid", { target: ["payout", p.id], details: { amountSen: p.amount_sen } });
    res.json({ status: "success" });
  });

  app.post("/api/admin/payouts/:id/failed", requireRole("admin"), (req, res) => {
    const p = row("SELECT * FROM payouts WHERE id = ?", req.params.id);
    if (!p) return fail(res, 404, "Payout not found.");
    if (p.status !== "pending") return fail(res, 409, `This payout is already ${p.status}.`);
    const reason = str(req.body?.reason, 300);
    if (!reason) return fail(res, 400, "Say why it failed.");
    db.exec("BEGIN IMMEDIATE");
    try {
      releasePayout(p.id, "failed", reason);
      // Money that bounced usually means wrong details: hold future payouts until the board verifies the account again.
      if (req.body?.keepVerified !== true) db.prepare("UPDATE payout_accounts SET status = 'unverified', note = ? WHERE professional_id = ?").run(reason, p.professional_id);
      db.exec("COMMIT");
    } catch (e) { try { db.exec("ROLLBACK"); } catch { /* done */ } throw e; }
    refreshBatch(p.batch_id);
    notify(p.user_id, "A payout could not be completed", `${reason}. Check your bank details. Your earnings are safe and will be in the next payout.`);
    audit(req, "payout.failed", { target: ["payout", p.id], details: { reason } });
    res.json({ status: "success" });
  });

  app.post("/api/admin/payout-batches/:id/cancel", requireRole("admin"), (req, res) => {
    const b = loadBatch(req.params.id);
    if (!b) return fail(res, 404, "Batch not found.");
    if (!["draft", "approved", "exported"].includes(b.status)) return fail(res, 409, `A ${b.status} batch cannot be cancelled.`);
    if (row("SELECT COUNT(*) AS n FROM payouts WHERE batch_id = ? AND status = 'paid'", b.id).n > 0) return fail(res, 409, "Some payouts in this batch are already paid. Mark the rest failed instead.");
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const p of batchPayouts(b.id).filter(x => x.status === "pending")) releasePayout(p.id, "cancelled");
      db.prepare("UPDATE payout_batches SET status = 'cancelled' WHERE id = ?").run(b.id);
      db.exec("COMMIT");
    } catch (e) { try { db.exec("ROLLBACK"); } catch { /* done */ } throw e; }
    audit(req, "payout.batch.cancel", { target: ["payout_batch", b.id] });
    res.json({ status: "success" });
  });
}
