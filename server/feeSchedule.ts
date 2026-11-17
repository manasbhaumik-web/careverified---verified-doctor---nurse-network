import type { Application } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";
import { str, fail, row, rows } from "./util";

/**
 * Platform fees, set per kind of payment, with a switch to turn each off.
 *
 * Why this exists (docs/REVENUE_MODEL_SPEC.md): the platform must not keep a share of a professional's own fee for assigning patients
 * (the medical council's May 2026 fee-splitting ruling), so the new models charge the PATIENT a separate, itemised platform fee on top
 * and pay the professional in full. The old model (a percentage taken out of the professional's fee) is kept only so earlier payments
 * still read correctly, and so an operator who explicitly sets PLATFORM_COMMISSION_PCT keeps today's behaviour until counsel decides.
 * Which model is lawful is a question for counsel; nothing here is legal advice.
 */

export const FEE_KINDS = ["booking", "consult", "care"] as const;
export type FeeKind = (typeof FEE_KINDS)[number];
export const FEE_MODELS = ["flat_service_fee", "percent_service_fee", "legacy_percent_of_professional_fee"] as const;
export type FeeModel = (typeof FEE_MODELS)[number];
export const LEGACY: FeeModel = "legacy_percent_of_professional_fee";

db.exec(`
CREATE TABLE IF NOT EXISTS fee_schedule (
  kind TEXT PRIMARY KEY, model TEXT NOT NULL, flat_sen INTEGER NOT NULL DEFAULT 0, percent REAL NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 0, effective_from TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT, reason TEXT
);
CREATE TABLE IF NOT EXISTS fee_schedule_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, model TEXT NOT NULL, flat_sen INTEGER NOT NULL, percent REAL NOT NULL,
  enabled INTEGER NOT NULL, changed_by TEXT, reason TEXT, changed_at TEXT NOT NULL
);
`);

const clampPct = (n: number) => Math.min(50, Math.max(0, Number.isFinite(n) ? n : 0));

/** First run only: no env commission means no fee until an admin sets one; an explicit PLATFORM_COMMISSION_PCT keeps the old model. */
function seed() {
  if (row("SELECT 1 AS x FROM fee_schedule LIMIT 1")) return;
  const raw = process.env.PLATFORM_COMMISSION_PCT;
  const legacyPct = raw !== undefined && raw !== "" ? clampPct(Number(raw)) : null;
  const now = new Date().toISOString();
  for (const kind of FEE_KINDS) {
    const r = legacyPct !== null
      ? { model: LEGACY, flat: 0, pct: legacyPct, enabled: 1 }
      : { model: "flat_service_fee" as FeeModel, flat: 0, pct: 0, enabled: 0 };
    db.prepare("INSERT INTO fee_schedule (kind,model,flat_sen,percent,enabled,effective_from,updated_at,updated_by,reason) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(kind, r.model, r.flat, r.pct, r.enabled, now, now, "system", legacyPct !== null ? "From PLATFORM_COMMISSION_PCT" : "Default: no platform fee until set");
  }
}
seed();

export interface FeeRow { kind: FeeKind; model: FeeModel; flat_sen: number; percent: number; enabled: number; effective_from: string; updated_at: string; updated_by: string | null; reason: string | null }
export const feeRow = (kind: string): FeeRow | undefined => row("SELECT * FROM fee_schedule WHERE kind = ?", kind);

export interface FeeResult {
  model: FeeModel;
  /** Taken out of the professional's fee (the old model only). */
  deductSen: number;
  /** The platform's own fee, charged to the patient on top of the professional's fee. */
  patientFeeSen: number;
  patientFeeTaxSen: number;
}

/** Service tax on the platform's own fee. The rate is for the accountant to set; it defaults to 0 because sources conflict (6% or 8%). */
export const platformFeeTaxPct = () => {
  const n = Number(process.env.PLATFORM_FEE_TAX_PCT);
  return Number.isFinite(n) && n > 0 ? Math.min(20, n) : 0;
};

export function feeFor(kind: string, subtotalSen: number): FeeResult {
  const f = feeRow(kind);
  const none: FeeResult = { model: f?.model ?? "flat_service_fee", deductSen: 0, patientFeeSen: 0, patientFeeTaxSen: 0 };
  if (!f || !f.enabled || !(subtotalSen > 0)) return none;
  if (f.model === LEGACY) return { ...none, deductSen: Math.round(subtotalSen * clampPct(f.percent) / 100) };
  const patientFeeSen = f.model === "flat_service_fee" ? Math.max(0, Math.round(f.flat_sen)) : Math.round(subtotalSen * clampPct(f.percent) / 100);
  return { ...none, patientFeeSen, patientFeeTaxSen: Math.round(patientFeeSen * platformFeeTaxPct() / 100) };
}

/** The professional's own fee inside a payment: the total, less service tax on that fee, less the platform's fee and tax on it. */
export const professionalFeeSen = (p: { amount_sen: number; tax_sen?: number | null; patient_fee_sen?: number | null; patient_fee_tax_sen?: number | null }) =>
  p.amount_sen - (p.tax_sen ?? 0) - (p.patient_fee_sen ?? 0) - (p.patient_fee_tax_sen ?? 0);

const publicRow = (f: FeeRow) => ({
  kind: f.kind, model: f.model, flatMyr: f.flat_sen / 100, percent: f.percent, enabled: !!f.enabled,
  payer: f.model === LEGACY ? "professional" : "patient", effectiveFrom: f.effective_from, updatedAt: f.updated_at, updatedBy: f.updated_by, reason: f.reason,
});

export const feeScheduleSummary = () => (rows("SELECT * FROM fee_schedule ORDER BY kind") as FeeRow[]).map(publicRow);
/** True when no payment kind takes anything out of the professional's own fee. */
export const professionalsKeepFull = () => (rows("SELECT * FROM fee_schedule") as FeeRow[]).every(f => !(f.enabled && f.model === LEGACY));
/** The old commission percent still in force, for the public terms page (0 when none). */
export const legacyCommissionPct = () => {
  const f = (rows("SELECT * FROM fee_schedule") as FeeRow[]).find(x => x.enabled && x.model === LEGACY);
  return f ? clampPct(f.percent) : 0;
};

export function registerFeeSchedule(app: Application) {
  app.get("/api/admin/fee-schedule", requireRole("admin"), (_req, res) => {
    res.json({ status: "success", data: {
      schedule: feeScheduleSummary(), platformFeeTaxPct: platformFeeTaxPct(), professionalsKeepFull: professionalsKeepFull(),
      history: rows("SELECT kind, model, flat_sen, percent, enabled, changed_by, reason, changed_at FROM fee_schedule_history ORDER BY id DESC LIMIT 50")
        .map(h => ({ kind: h.kind, model: h.model, flatMyr: h.flat_sen / 100, percent: h.percent, enabled: !!h.enabled, changedBy: h.changed_by, reason: h.reason, changedAt: h.changed_at })),
    } });
  });

  app.put("/api/admin/fee-schedule/:kind", requireRole("admin"), (req, res) => {
    const kind = req.params.kind;
    if (!(FEE_KINDS as readonly string[]).includes(kind)) return fail(res, 404, "Unknown kind of payment.");
    const b = req.body ?? {};
    const existing = feeRow(kind)!;
    const reason = str(b.reason, 300);
    if (reason.length < 5) return fail(res, 400, "Give a reason for the change (at least 5 characters).");
    const model = (b.model ?? existing.model) as string;
    if (!(FEE_MODELS as readonly string[]).includes(model)) return fail(res, 400, "Unknown fee model.");
    if (model === LEGACY && existing.model !== LEGACY) return fail(res, 400, "The old model (a share of the professional's fee) cannot be chosen again. Use a service fee charged to the patient.");
    const enabled = b.enabled === undefined ? !!existing.enabled : b.enabled === true;
    let flatSen = existing.flat_sen, percent = existing.percent;
    if (b.flatMyr !== undefined) {
      const n = Number(b.flatMyr);
      if (!Number.isFinite(n) || n < 0 || n > 500) return fail(res, 400, "A flat fee must be between RM 0 and RM 500.");
      flatSen = Math.round(n * 100);
    }
    if (b.percent !== undefined) {
      const n = Number(b.percent);
      if (!Number.isFinite(n) || n < 0 || n > 50) return fail(res, 400, "A percentage must be between 0 and 50.");
      percent = n;
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE fee_schedule SET model=?, flat_sen=?, percent=?, enabled=?, effective_from=?, updated_at=?, updated_by=?, reason=? WHERE kind=?")
      .run(model, flatSen, percent, enabled ? 1 : 0, now, now, req.user!.id, reason, kind);
    db.prepare("INSERT INTO fee_schedule_history (kind,model,flat_sen,percent,enabled,changed_by,reason,changed_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(kind, model, flatSen, percent, enabled ? 1 : 0, req.user!.id, reason, now);
    audit(req, "fee_schedule.update", { target: ["fee_schedule", kind], details: { model, flatSen, percent, enabled } });
    res.json({ status: "success", data: feeScheduleSummary() });
  });
}