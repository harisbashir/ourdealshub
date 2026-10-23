import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Encrypt secrets at rest (social tokens) using a key derived from AUTH_SECRET.
 * Legacy plaintext values still open (no prefix) until re-saved.
 */

const PREFIX = "enc:v1:";

function keyMaterial(): Buffer | null {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (secret.length < 16) return null;
  // Internal key-derivation id (not site branding). Do not rename —
  // changing it breaks sealed social tokens already stored in the DB.
  return createHash("sha256").update(`abdealspoint:v1:${secret}`).digest();
}

/** Seal a secret for DB storage. Falls back to plaintext if no AUTH_SECRET. */
export function sealSecret(plain: string): string {
  const value = plain.trim();
  if (!value) return value;
  if (value.startsWith(PREFIX)) return value;

  const key = keyMaterial();
  if (!key) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    Buffer.concat([iv, tag, enc]).toString("base64url")
  );
}

/** Open a sealed or legacy-plaintext secret. */
export function openSecret(stored: string | null | undefined): string {
  const value = String(stored || "").trim();
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;

  const key = keyMaterial();
  if (!key) {
    throw new Error("Cannot decrypt secret: AUTH_SECRET is missing or too short.");
  }

  const raw = Buffer.from(value.slice(PREFIX.length), "base64url");
  if (raw.length < 12 + 16 + 1) {
    throw new Error("Corrupt sealed secret.");
  }
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8"
  );
}

export function isSealedSecret(stored: string | null | undefined): boolean {
  return String(stored || "").startsWith(PREFIX);
}
