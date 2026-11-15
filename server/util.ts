import crypto from "crypto";
import type { Response } from "express";
import { db } from "./db";

/** Small helpers shared by the newer server modules. (Older modules keep their own copies; move them here when they are next touched.) */

/** A trimmed string capped at `max` characters, or "" when the value is not a string. */
export const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The standard error answer. */
export const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });

/** JSON.parse that returns the fallback for empty or broken text. */
export const parse = <T,>(v: unknown, fallback: T): T => { try { return v ? (JSON.parse(String(v)) as T) : fallback; } catch { return fallback; } };

export const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;
export const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];

export const newId = (prefix: string) => `${prefix}-${crypto.randomBytes(5).toString("hex")}`;
export const today = () => new Date().toISOString().slice(0, 10);
export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
