import crypto from "crypto";

/**
 * Time-based one-time passwords (RFC 6238: HMAC-SHA1, 6 digits, 30 second steps) for authenticator apps.
 * Implemented with Node's crypto so no extra dependency is needed.
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBase32(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(s: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of s.toUpperCase().replace(/=+$/, "")) {
    const i = B32.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function hotp(key: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000;
  return String(n).padStart(6, "0");
}

export const newTotpSecret = () => toBase32(crypto.randomBytes(20));

/** The code an authenticator app shows right now (used by the demo seed and tests). */
export const currentTotp = (secret: string, now = Date.now()) => hotp(fromBase32(secret), Math.floor(now / 30_000));

/** Accepts the current 30-second code and the one either side of it, to allow for clock drift. */
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const clean = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const key = fromBase32(secret);
  const step = Math.floor(now / 30_000);
  let ok = false;
  for (const d of [-1, 0, 1]) {
    // compare all three windows without early exit
    if (crypto.timingSafeEqual(Buffer.from(hotp(key, step + d)), Buffer.from(clean))) ok = true;
  }
  return ok;
}

export const otpauthUrl = (account: string, secret: string, issuer = "MedCred") =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
