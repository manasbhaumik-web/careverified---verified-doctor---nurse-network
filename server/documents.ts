import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { Router } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireAuth } from "./auth";

// Private storage: never served statically, only through the authorised download route below.
const root = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "uploads");
fs.mkdirSync(root, { recursive: true });

const MAX_BYTES = 5 * 1024 * 1024;
const KINDS = ["license", "degree", "identity", "lab_result", "other"];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

function detectType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  return null;
}

// Set by server.ts: returns the account id that owns a verification request (or null if unknown).
let requestOwner: (requestId: string) => string | null = () => null;
export const setRequestOwnerLookup = (fn: typeof requestOwner) => { requestOwner = fn; };

// Clinical hooks (set by server.ts): lab orders and who may open a patient's lab results.
interface ClinicalHooks {
  labOrderOwner: (orderId: string) => string | null;
  onLabResult: (orderId: string, documentId: string) => void;
  canViewLabDocument: (user: { role: string; profileId: string | null }, doc: { owner_id: string; kind: string }) => boolean;
}
let clinical: ClinicalHooks | null = null;
export const setClinicalHooks = (h: ClinicalHooks) => { clinical = h; };

export const documentsRouter = Router();

documentsRouter.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File is larger than 5 MB." : "Upload failed.";
      return res.status(400).json({ status: "error", message: msg });
    }
    const file = req.file;
    const kind = String(req.body.kind || "other");
    if (!file) return res.status(400).json({ status: "error", message: "No file provided." });
    if (!KINDS.includes(kind)) return res.status(400).json({ status: "error", message: "Unknown document type." });
    // Trust the file's bytes, not the client-declared MIME type or extension.
    const type = detectType(file.buffer);
    if (!type) return res.status(400).json({ status: "error", message: "Only PDF, JPG or PNG files are accepted." });

    const requestId = req.body.verificationRequestId ? String(req.body.verificationRequestId) : null;
    if (requestId && requestOwner(requestId) !== req.user!.id) {
      return res.status(403).json({ status: "error", message: "That verification request is not yours." });
    }
    const labOrderId = req.body.labOrderId ? String(req.body.labOrderId) : null;
    if (kind === "lab_result" && (!labOrderId || clinical?.labOrderOwner(labOrderId) !== req.user!.id)) {
      return res.status(403).json({ status: "error", message: "That lab order is not yours." });
    }
    const id = "doc-" + crypto.randomBytes(8).toString("hex");
    const storedName = `${crypto.randomBytes(16).toString("hex")}.${type.ext}`;
    fs.writeFileSync(path.join(root, storedName), file.buffer, { mode: 0o600 });
    db.prepare(
      "INSERT INTO documents (id,owner_id,kind,original_name,mime,size,stored_name,sha256,verification_request_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).run(
      id, req.user!.id, kind, path.basename(file.originalname).slice(0, 120), type.mime, file.size, storedName,
      crypto.createHash("sha256").update(file.buffer).digest("hex"), requestId, new Date().toISOString()
    );
    if (kind === "lab_result" && labOrderId) clinical?.onLabResult(labOrderId, id);
    audit(req, "document.upload", { target: ["document", id], details: { kind, size: file.size } });
    res.status(201).json({ status: "success", data: { id, kind, originalName: file.originalname, mime: type.mime, size: file.size } });
  });
});

const rowToDto = (r: any) => ({
  id: r.id, ownerId: r.owner_id, kind: r.kind, originalName: r.original_name, mime: r.mime,
  size: r.size, verificationRequestId: r.verification_request_id, createdAt: r.created_at,
});

// Own documents; admins may list another user's via ?ownerId= or a verification request via ?verificationRequestId=
documentsRouter.get("/", requireAuth, (req, res) => {
  const user = req.user!;
  let rows: any[];
  if (user.role === "admin" && (req.query.ownerId || req.query.verificationRequestId)) {
    rows = req.query.verificationRequestId
      ? db.prepare("SELECT * FROM documents WHERE verification_request_id = ? ORDER BY created_at DESC").all(String(req.query.verificationRequestId))
      : db.prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY created_at DESC").all(String(req.query.ownerId));
  } else {
    rows = db.prepare("SELECT * FROM documents WHERE owner_id = ? ORDER BY created_at DESC").all(user.id);
  }
  res.json({ status: "success", data: rows.map(rowToDto) });
});

documentsRouter.get("/:id/download", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id) as any;
  const user = req.user!;
  const allowed = !!row && (row.owner_id === user.id || user.role === "admin" || !!clinical?.canViewLabDocument(user, row));
  if (!row || !allowed) {
    return res.status(404).json({ status: "error", message: "Document not found." });
  }
  if (row.owner_id !== user.id) audit(req, "document.view", { target: ["document", row.id], details: { ownerId: row.owner_id } });
  res.setHeader("Content-Type", row.mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `attachment; filename="${row.original_name.replace(/[^\w.\- ]/g, "_")}"`);
  res.sendFile(path.join(root, row.stored_name));
});
