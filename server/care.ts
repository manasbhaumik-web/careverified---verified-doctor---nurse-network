import crypto from "crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth, requireRole } from "./auth";
import { notify, notifyAdmins } from "./verification";
import { refundPayment, paymentsEnabled } from "./payments";
import { VerificationStatus } from "../src/types";
import { createGrant } from "./clinical";

/**
 * The 24/7 care engine: practitioner presence + on-call roster, the instant-consult queue,
 * the consultation room (chat + WebRTC signalling), and the emergency SOS log.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS presence (
  profile_id TEXT PRIMARY KEY,
  online INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS roster (
  profile_id TEXT NOT NULL,
  day INTEGER NOT NULL,
  hour INTEGER NOT NULL,
  PRIMARY KEY (profile_id, day, hour)
);
CREATE TABLE IF NOT EXISTS consults (
  id TEXT PRIMARY KEY,
  patient_user_id TEXT NOT NULL,
  professional_id TEXT,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  red_flags TEXT,
  fee_sen INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  queued_at TEXT,
  escalated_at TEXT,
  accepted_at TEXT,
  ended_at TEXT,
  end_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_consults_status ON consults(status);
CREATE TABLE IF NOT EXISTS consult_declines (
  consult_id TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  PRIMARY KEY (consult_id, professional_id)
);
CREATE TABLE IF NOT EXISTS consult_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consult_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cmsg ON consult_messages(consult_id, id);
CREATE TABLE IF NOT EXISTS consult_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consult_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_csig ON consult_signals(consult_id, id);
CREATE TABLE IF NOT EXISTS emergency_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  lat REAL,
  lng REAL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT,
  handled_at TEXT
);
`);

try { db.exec("ALTER TABLE consults ADD COLUMN share_record INTEGER NOT NULL DEFAULT 0"); } catch { /* column already exists */ }

const PRESENCE_TTL_MS = 90_000;
const ESCALATE_AFTER_MS = 3 * 60_000;
const UNMATCHED_AFTER_MS = 10 * 60_000;
const consultFeeSen = () => Math.round(Number(process.env.CONSULT_NOW_FEE ?? 80) * 100);

const RED_FLAG_RULES: [RegExp, string][] = [
  [/chest (pain|tight|pressure)|crushing|pain.*(left arm|jaw)/i, "possible heart attack symptoms"],
  [/can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath|gasping|choking/i, "breathing difficulty"],
  [/unconscious|unresponsive|passed out|collapsed|not waking/i, "loss of consciousness"],
  [/stroke|face (is )?droop|slurred speech|sudden (weakness|numbness)|one side/i, "possible stroke signs"],
  [/seizure|convuls|fitting/i, "seizure"],
  [/severe bleeding|bleeding (a lot|heavily|won'?t stop)|vomiting blood|coughing (up )?blood/i, "severe bleeding"],
  [/anaphyla|throat (is )?(closing|swelling)|swollen (tongue|lips)/i, "severe allergic reaction"],
  [/suicid|kill myself|end my life|self[- ]harm|overdose/i, "risk to life or self-harm"],
  [/poison|swallowed.*(pills|bleach|chemical)/i, "possible poisoning"],
  [/not breathing|no pulse/i, "no breathing or pulse"],
];
export function redFlags(text: string): string[] {
  return RED_FLAG_RULES.filter(([re]) => re.test(text)).map(([, label]) => label);
}

export const emergencyNumbers = (): { label: string; number: string }[] => {
  try {
    const v = process.env.EMERGENCY_NUMBERS ? JSON.parse(process.env.EMERGENCY_NUMBERS) : null;
    if (Array.isArray(v) && v.every(x => x?.label && x?.number)) return v;
  } catch { /* fall through to default */ }
  return [
    { label: "National emergency (ambulance, police, fire)", number: "999" },
    { label: "Emergency from a mobile phone", number: "112" },
  ];
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const newId = (p: string) => `${p}-${crypto.randomBytes(6).toString("hex")}`;
const iso = () => new Date().toISOString();

interface Ctx {
  findProfessional: (id: string) => any | undefined;
  allProfessionals: () => any[];
}

export function registerCareRoutes(app: Application, ctx: Ctx) {
  const isOnline = (profileId: string) => {
    const r = db.prepare("SELECT online, last_seen FROM presence WHERE profile_id = ?").get(profileId) as any;
    return !!r && r.online === 1 && Date.now() - Date.parse(r.last_seen) < PRESENCE_TTL_MS;
  };
  const verifiedDoctor = (profileId: string | null | undefined) => {
    const p = profileId ? ctx.findProfessional(profileId) : null;
    return p && p.role === "doctor" && p.verificationStatus === VerificationStatus.VERIFIED ? p : null;
  };
  const onlineDoctorIds = () =>
    (db.prepare("SELECT profile_id FROM presence WHERE online = 1").all() as any[])
      .map(r => r.profile_id).filter(id => isOnline(id) && verifiedDoctor(id));
  const accountOfProfile = (profileId: string) => ((db.prepare("SELECT id FROM users WHERE profile_id = ?").get(profileId) as any)?.id) ?? null;

  // ---------- presence & roster ----------
  app.post("/api/presence", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid || !verifiedDoctor(pid)) return fail(res, 403, "Only verified doctors can go on call.");
    const online = req.body.online === true ? 1 : 0;
    db.prepare("INSERT INTO presence (profile_id, online, last_seen) VALUES (?,?,?) ON CONFLICT(profile_id) DO UPDATE SET online=excluded.online, last_seen=excluded.last_seen")
      .run(pid, online, iso());
    res.json({ status: "success", data: { online: !!online } });
  });

  app.get("/api/presence/me", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    res.json({ status: "success", data: { online: !!pid && isOnline(pid), canGoOnline: !!verifiedDoctor(pid) } });
  });

  app.get("/api/on-call/status", (_req, res) => {
    res.json({ status: "success", data: { onlineDoctors: onlineDoctorIds().length, consultFee: consultFeeSen() / 100, paymentsEnabled: paymentsEnabled() } });
  });

  app.get("/api/roster", requireRole("practitioner"), (req, res) => {
    const rows = db.prepare("SELECT day, hour FROM roster WHERE profile_id = ?").all(req.user!.profileId ?? "");
    res.json({ status: "success", data: rows });
  });

  app.put("/api/roster", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid || !verifiedDoctor(pid)) return fail(res, 403, "Only verified doctors can set an on-call roster.");
    const cells = Array.isArray(req.body.cells) ? req.body.cells : null;
    if (!cells || cells.length > 168) return fail(res, 400, "Invalid roster.");
    const clean = cells.filter((c: any) => Number.isInteger(c?.day) && c.day >= 0 && c.day < 7 && Number.isInteger(c?.hour) && c.hour >= 0 && c.hour < 24);
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM roster WHERE profile_id = ?").run(pid);
      const ins = db.prepare("INSERT OR IGNORE INTO roster (profile_id, day, hour) VALUES (?,?,?)");
      for (const c of clean) ins.run(pid, c.day, c.hour);
      db.exec("COMMIT");
    } catch (e) { db.exec("ROLLBACK"); throw e; }
    audit(req, "roster.update", { details: { hours: clean.length } });
    res.json({ status: "success" });
  });

  // 7x24 coverage of rostered, verified doctors (admin)
  app.get("/api/admin/coverage", requireRole("admin"), (_req, res) => {
    const rows = db.prepare("SELECT profile_id, day, hour FROM roster").all() as any[];
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of rows) if (verifiedDoctor(r.profile_id)) grid[r.day][r.hour]++;
    const queued = (db.prepare("SELECT COUNT(*) AS n FROM consults WHERE status='queued'").get() as any).n;
    const active = (db.prepare("SELECT COUNT(*) AS n FROM consults WHERE status='active'").get() as any).n;
    res.json({ status: "success", data: { grid, onlineNow: onlineDoctorIds().length, queued, active } });
  });

  // ---------- instant consults ----------
  const consultView = (c: any, viewer: { id: string; role: string; profileId: string | null }) => {
    const patient = db.prepare("SELECT name FROM users WHERE id = ?").get(c.patient_user_id) as any;
    const pro = c.professional_id ? ctx.findProfessional(c.professional_id) : null;
    return {
      id: c.id, status: c.status, mode: c.mode, symptoms: c.symptoms, redFlags: c.red_flags ? JSON.parse(c.red_flags) : [],
      fee: c.fee_sen / 100, createdAt: c.created_at, queuedAt: c.queued_at, acceptedAt: c.accepted_at, endedAt: c.ended_at, endReason: c.end_reason,
      patientName: viewer.role === "patient" ? undefined : patient?.name,
      professional: pro ? { id: pro.id, name: pro.name, avatar: pro.avatar, specialization: pro.specialization } : null,
    };
  };
  const loadConsult = (id: string) => db.prepare("SELECT * FROM consults WHERE id = ?").get(id) as any;
  const isParticipant = (c: any, u: { id: string; profileId: string | null }) =>
    c && (c.patient_user_id === u.id || (!!u.profileId && c.professional_id === u.profileId));

  app.post("/api/consults", requireRole("patient"), (req, res) => {
    const mode = req.body.mode === "video" ? "video" : req.body.mode === "chat" ? "chat" : null;
    const symptoms = str(req.body.symptoms, 1000);
    if (!mode) return fail(res, 400, "Choose chat or video.");
    if (symptoms.length < 10) return fail(res, 400, "Please describe your symptoms (at least 10 characters).");
    const open = db.prepare("SELECT id, status FROM consults WHERE patient_user_id = ? AND status IN ('awaiting_payment','queued','active')").get(req.user!.id) as any;
    if (open) return res.status(409).json({ status: "error", message: "You already have a consultation in progress.", data: { id: open.id } });
    if (onlineDoctorIds().length === 0) {
      return fail(res, 409, "No doctors are online right now. You can book an appointment instead. If this is an emergency, call 999.");
    }
    const flags = redFlags(symptoms);
    const id = newId("con");
    db.prepare("INSERT INTO consults (id, patient_user_id, status, mode, symptoms, red_flags, fee_sen, created_at, share_record) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, req.user!.id, "awaiting_payment", mode, symptoms, flags.length ? JSON.stringify(flags) : null, consultFeeSen(), iso(), req.body.shareRecord === true ? 1 : 0);
    audit(req, "consult.create", { target: ["consult", id], details: { mode, redFlags: flags } });
    res.status(201).json({ status: "success", data: { id, redFlags: flags, fee: consultFeeSen() / 100 } });
  });

  app.get("/api/consults/mine", requireAuth, (req, res) => {
    const u = req.user!;
    const rows = u.role === "patient"
      ? db.prepare("SELECT * FROM consults WHERE patient_user_id = ? ORDER BY created_at DESC LIMIT 50").all(u.id)
      : u.role === "practitioner" && u.profileId
        ? db.prepare("SELECT * FROM consults WHERE professional_id = ? ORDER BY created_at DESC LIMIT 50").all(u.profileId)
        : [];
    res.json({ status: "success", data: (rows as any[]).map(c => consultView(c, u)) });
  });

  app.get("/api/consults/offers", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!verifiedDoctor(pid) || !isOnline(pid!)) return res.json({ status: "success", data: [] });
    const rows = db.prepare(
      `SELECT c.*, u.name AS pname FROM consults c JOIN users u ON u.id = c.patient_user_id
       WHERE c.status = 'queued' AND c.id NOT IN (SELECT consult_id FROM consult_declines WHERE professional_id = ?)
       ORDER BY c.queued_at ASC LIMIT 20`
    ).all(pid) as any[];
    res.json({ status: "success", data: rows.map(c => ({
      id: c.id, mode: c.mode, symptoms: c.symptoms, redFlags: c.red_flags ? JSON.parse(c.red_flags) : [],
      queuedAt: c.queued_at, fee: c.fee_sen / 100, patientFirstName: String(c.pname).split(" ")[0],
    })) });
  });

  app.get("/api/consults/:id", requireAuth, (req, res) => {
    const c = loadConsult(req.params.id);
    if (!isParticipant(c, req.user!)) return fail(res, 404, "Consultation not found.");
    res.json({ status: "success", data: consultView(c, req.user!) });
  });

  app.post("/api/consults/:id/accept", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!verifiedDoctor(pid) || !isOnline(pid!)) return fail(res, 403, "You must be a verified doctor and online to accept.");
    const busy = db.prepare("SELECT 1 AS x FROM consults WHERE professional_id = ? AND status = 'active'").get(pid);
    if (busy) return fail(res, 409, "Finish your current consultation first.");
    // Atomic claim: only one doctor can win.
    const won = db.prepare("UPDATE consults SET status='active', professional_id=?, accepted_at=? WHERE id=? AND status='queued' AND professional_id IS NULL")
      .run(pid, iso(), req.params.id).changes;
    if (!won) return fail(res, 409, "Another doctor has already taken this consultation.");
    db.prepare("UPDATE payments SET professional_id = ? WHERE kind='consult' AND ref_id = ?").run(pid, req.params.id);
    const c = loadConsult(req.params.id);
    // The patient opted in when they requested the consult: share their record with this doctor for 30 days.
    if (c.share_record === 1) createGrant(c.patient_user_id, pid!, "consult", c.id, 30);
    notify(c.patient_user_id, "A doctor is ready", `${ctx.findProfessional(pid!).name} has joined your consultation.`);
    audit(req, "consult.accept", { target: ["consult", c.id] });
    res.json({ status: "success", data: consultView(c, req.user!) });
  });

  app.post("/api/consults/:id/decline", requireRole("practitioner"), (req, res) => {
    const pid = req.user!.profileId;
    if (!pid) return fail(res, 403, "No profile.");
    db.prepare("INSERT OR IGNORE INTO consult_declines (consult_id, professional_id) VALUES (?,?)").run(req.params.id, pid);
    res.json({ status: "success" });
  });

  app.post("/api/consults/:id/end", requireAuth, async (req, res) => {
    const c = loadConsult(req.params.id);
    const u = req.user!;
    if (!isParticipant(c, u)) return fail(res, 404, "Consultation not found.");
    if (c.status === "active") {
      db.prepare("UPDATE consults SET status='completed', ended_at=?, end_reason=? WHERE id=?").run(iso(), u.role === "patient" ? "ended_by_patient" : "ended_by_doctor", c.id);
      if (u.role === "practitioner") notify(c.patient_user_id, "Consultation finished", "Your consultation has ended. You can leave a review from the doctor's profile.");
    } else if ((c.status === "queued" || c.status === "awaiting_payment") && u.role === "patient") {
      db.prepare("UPDATE consults SET status='cancelled', ended_at=?, end_reason='cancelled_by_patient' WHERE id=?").run(iso(), c.id);
      if (c.status === "queued") await refundForConsult(c.id, "Cancelled before a doctor joined");
    } else {
      return fail(res, 409, "This consultation is already closed.");
    }
    audit(req, "consult.end", { target: ["consult", c.id] });
    res.json({ status: "success" });
  });

  // ---------- consultation room: chat ----------
  const activeFor = (req: any, res: Response) => {
    const c = loadConsult(req.params.id);
    if (!isParticipant(c, req.user!)) { fail(res, 404, "Consultation not found."); return null; }
    return c;
  };

  app.get("/api/consults/:id/messages", requireAuth, (req, res) => {
    const c = activeFor(req, res); if (!c) return;
    const after = Number(req.query.after) || 0;
    const rows = db.prepare("SELECT id, sender_user_id AS senderUserId, text, ts FROM consult_messages WHERE consult_id = ? AND id > ? ORDER BY id LIMIT 200").all(c.id, after);
    res.json({ status: "success", data: rows, consultStatus: c.status });
  });

  app.post("/api/consults/:id/messages", requireAuth, (req, res) => {
    const c = activeFor(req, res); if (!c) return;
    if (c.status !== "active") return fail(res, 409, "This consultation is not active.");
    const text = str(req.body.text, 2000);
    if (!text) return fail(res, 400, "Message is empty.");
    const r = db.prepare("INSERT INTO consult_messages (consult_id, sender_user_id, text, ts) VALUES (?,?,?,?)").run(c.id, req.user!.id, text, iso());
    res.status(201).json({ status: "success", data: { id: Number(r.lastInsertRowid) } });
  });

  // ---------- consultation room: WebRTC signalling (peer-to-peer media) ----------
  app.post("/api/consults/:id/signal", requireAuth, (req, res) => {
    const c = activeFor(req, res); if (!c) return;
    if (c.status !== "active" || c.mode !== "video") return fail(res, 409, "Video is not active for this consultation.");
    const kind = String(req.body.kind);
    if (!["offer", "answer", "ice", "hangup"].includes(kind)) return fail(res, 400, "Bad signal.");
    const payload = JSON.stringify(req.body.payload ?? null);
    if (payload.length > 16_000) return fail(res, 400, "Signal too large.");
    db.prepare("INSERT INTO consult_signals (consult_id, from_user_id, kind, payload, ts) VALUES (?,?,?,?,?)").run(c.id, req.user!.id, kind, payload, iso());
    res.status(201).json({ status: "success" });
  });

  app.get("/api/consults/:id/signals", requireAuth, (req, res) => {
    const c = activeFor(req, res); if (!c) return;
    const after = Number(req.query.after) || 0;
    const rows = db.prepare("SELECT id, kind, payload FROM consult_signals WHERE consult_id = ? AND id > ? AND from_user_id <> ? ORDER BY id LIMIT 100").all(c.id, after, req.user!.id) as any[];
    const lastId = (db.prepare("SELECT COALESCE(MAX(id),0) AS m FROM consult_signals WHERE consult_id = ?").get(c.id) as any).m;
    res.json({ status: "success", data: rows.map(r => ({ id: r.id, kind: r.kind, payload: JSON.parse(r.payload) })), cursor: lastId, consultStatus: c.status });
  });

  app.get("/api/ice-servers", requireAuth, (_req, res) => {
    // STUN only by default. Set ICE_SERVERS (JSON, include TURN) for patients behind strict NATs.
    let servers: unknown = [{ urls: "stun:stun.cloudflare.com:3478" }];
    try { if (process.env.ICE_SERVERS) servers = JSON.parse(process.env.ICE_SERVERS); } catch { /* keep default */ }
    res.json({ status: "success", data: servers });
  });

  // ---------- emergency SOS ----------
  app.get("/api/emergency/info", (_req, res) => {
    res.json({ status: "success", data: {
      numbers: emergencyNumbers(),
      disclaimer: "MedCred is not an emergency service and cannot send an ambulance. In an emergency call the number below first.",
    } });
  });

  app.post("/api/emergency", requireRole("patient"), (req, res) => {
    const lat = Number(req.body.lat), lng = Number(req.body.lng);
    const hasLoc = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && req.body.lat != null;
    const id = newId("sos");
    db.prepare("INSERT INTO emergency_events (id, user_id, ts, lat, lng, note) VALUES (?,?,?,?,?,?)")
      .run(id, req.user!.id, iso(), hasLoc ? lat : null, hasLoc ? lng : null, str(req.body.note, 500) || null);
    notifyAdmins("SOS raised", `${req.user!.name} pressed the emergency button.${hasLoc ? " Location shared." : ""}`);
    for (const pid of onlineDoctorIds()) notify(accountOfProfile(pid), "Patient SOS", `${req.user!.name} raised an emergency alert. Admins are following up.`);
    audit(req, "emergency.sos", { target: ["emergency", id] });
    res.status(201).json({
      status: "success",
      data: {
        id, numbers: emergencyNumbers(),
        mapUrl: hasLoc ? `https://www.openstreetmap.org/search?query=hospital#map=14/${lat}/${lng}` : null,
        message: "Call the emergency number now. We have alerted our on-call team, but we cannot send an ambulance.",
      },
    });
  });

  app.get("/api/admin/emergencies", requireRole("admin"), (_req, res) => {
    const rows = db.prepare(
      `SELECT e.*, u.name AS userName, u.email AS userEmail FROM emergency_events e LEFT JOIN users u ON u.id = e.user_id ORDER BY e.ts DESC LIMIT 100`
    ).all();
    res.json({ status: "success", data: rows });
  });

  app.post("/api/admin/emergencies/:id/handle", requireRole("admin"), (req, res) => {
    const r = db.prepare("UPDATE emergency_events SET status='handled', handled_by=?, handled_at=? WHERE id=? AND status='open'").run(req.user!.id, iso(), req.params.id);
    if (!r.changes) return fail(res, 404, "Event not found or already handled.");
    audit(req, "emergency.handled", { target: ["emergency", req.params.id] });
    res.json({ status: "success" });
  });

  // ---------- consult lifecycle: payment hooks and queue timeouts ----------
  async function refundForConsult(consultId: string, reason: string) {
    const p = db.prepare("SELECT id FROM payments WHERE kind='consult' AND ref_id=? AND status='paid'").get(consultId) as any;
    if (p) await refundPayment(p.id, reason, null);
  }

  const queueTick = async () => {
    const now = Date.now();
    for (const c of db.prepare("SELECT * FROM consults WHERE status = 'queued'").all() as any[]) {
      const age = now - Date.parse(c.queued_at);
      if (age > UNMATCHED_AFTER_MS) {
        db.prepare("UPDATE consults SET status='unmatched', ended_at=?, end_reason='no_doctor_available' WHERE id=? AND status='queued'").run(iso(), c.id);
        await refundForConsult(c.id, "No doctor became available");
        notify(c.patient_user_id, "No doctor was available", "You have been refunded in full. If this is an emergency call 999, or book an appointment.");
      } else if (age > ESCALATE_AFTER_MS && !c.escalated_at) {
        db.prepare("UPDATE consults SET escalated_at=? WHERE id=?").run(iso(), c.id);
        notifyAdmins("Consultation waiting", `A patient has waited over 3 minutes for a doctor (${onlineDoctorIds().length} online).`);
      }
    }
    db.prepare("UPDATE consults SET status='cancelled', ended_at=?, end_reason='payment_timeout' WHERE status='awaiting_payment' AND created_at < ?")
      .run(iso(), new Date(now - 30 * 60_000).toISOString());
  };
  setInterval(() => { queueTick().catch(e => console.error("queueTick", e)); }, 20_000).unref();

  return {
    resolveConsultPayable: (refId: string) => {
      const c = loadConsult(refId);
      if (!c || c.status !== "awaiting_payment") return null;
      return { kind: "consult" as const, id: c.id, userId: c.patient_user_id as string, professionalId: null, amount: c.fee_sen / 100, description: "Instant online consultation" };
    },
    onConsultPaid: (consultId: string) => {
      const changed = db.prepare("UPDATE consults SET status='queued', queued_at=? WHERE id=? AND status='awaiting_payment'").run(iso(), consultId).changes;
      if (changed) for (const pid of onlineDoctorIds()) notify(accountOfProfile(pid), "New consultation waiting", "A patient is waiting for an instant consultation.");
    },
    onConsultRefunded: (consultId: string) => {
      db.prepare("UPDATE consults SET status = CASE WHEN status='queued' THEN 'cancelled' ELSE status END WHERE id=?").run(consultId);
    },
  };
}
