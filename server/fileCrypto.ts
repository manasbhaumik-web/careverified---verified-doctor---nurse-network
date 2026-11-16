import crypto from "crypto";
import fs from "fs";
import path from "path";
import { dataDir } from "./db";

/**
 * Encryption at rest for uploaded files (credential documents, patient files, facility photos): AES-256-GCM.
 *
 * Key: FILE_ENCRYPTION_KEY (64 hex characters or 32 bytes as base64). In production it must be set, and uploads are refused without it.
 * Outside production, a key is made once and kept in a file next to (not inside) the database, the same way payout keys are handled.
 * Files written before this existed have no marker and are read as they are, so nothing already stored breaks.
 *
 * Stored layout: "CVENC1" | iv (12 bytes) | auth tag (16 bytes) | ciphertext.
 */
const MAGIC = Buffer.from("CVENC1");

function key(): Buffer | null {
  const env = process.env.FILE_ENCRYPTION_KEY;
  if (env) {
    const b = /^[0-9a-fA-F]{64}$/.test(env) ? Buffer.from(env, "hex") : Buffer.from(env, "base64");
    return b.length === 32 ? b : null;
  }
  if (process.env.NODE_ENV === "production") return null;
  const f = path.join(dataDir, ".file-key");
  try {
    if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
    return Buffer.from(fs.readFileSync(f, "utf8").trim(), "hex");
  } catch { return null; }
}

export const fileEncryptionAvailable = () => key() !== null;

export function encryptFile(plain: Buffer): Buffer {
  const k = key();
  if (!k) throw new Error("File encryption key is not configured.");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}

export const isEncrypted = (stored: Buffer) => stored.length > MAGIC.length + 28 && stored.subarray(0, MAGIC.length).equals(MAGIC);

/** Returns the original bytes. A file without the marker was stored before encryption existed and is returned unchanged. */
export function decryptFile(stored: Buffer): Buffer {
  if (!isEncrypted(stored)) return stored;
  const k = key();
  if (!k) throw new Error("File encryption key is not configured.");
  const iv = stored.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = stored.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const d = crypto.createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(stored.subarray(MAGIC.length + 28)), d.final()]);
}
