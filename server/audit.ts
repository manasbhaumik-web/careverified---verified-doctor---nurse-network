import type { Request } from "express";
import { db } from "./db";

export function audit(
  req: Request | null,
  action: string,
  opts: { target?: [string, string]; actor?: { id: string; role: string } | null; details?: Record<string, unknown> } = {}
) {
  const actor = opts.actor ?? (req as any)?.user ?? null;
  db.prepare(
    "INSERT INTO audit_log (ts, actor_id, actor_role, action, target_type, target_id, ip, details) VALUES (?,?,?,?,?,?,?,?)"
  ).run(
    new Date().toISOString(),
    actor?.id ?? null,
    actor?.role ?? null,
    action,
    opts.target?.[0] ?? null,
    opts.target?.[1] ?? null,
    req?.ip ?? null,
    opts.details ? JSON.stringify(opts.details) : null
  );
}
