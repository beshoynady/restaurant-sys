// Enterprise Payment Platform V1 — the platform's first reversible-encryption utility. Every
// other "crypto" usage in this codebase (auth-credential hashing, session tokens) is deliberately
// one-way (HMAC/SHA-256) because those values only ever need to be *compared*, never read back.
// Merchant payment-provider credentials are different: an outbound API call to Paymob/Stripe/etc.
// needs the real API key back, so this has to be genuinely reversible, not hashed.
//
// AES-256-GCM, not a hand-rolled cipher: GCM is an authenticated mode, meaning a tampered
// ciphertext fails to decrypt instead of silently returning garbage — important for something as
// sensitive as a merchant's live payment credentials.
import crypto from "crypto";
import throwError from "./throwError.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV is the NIST-recommended size for GCM, not the AES block size (16)
const KEY_LENGTH = 32; // AES-256 needs a 32-byte key

// Lazily resolved (not read at module-load time) so a test file that never touches encrypted
// credentials doesn't fail to even import this module in an environment without the var set.
function resolveKey() {
  const raw = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throwError(
      "PAYMENT_CREDENTIALS_ENCRYPTION_KEY is not set — cannot encrypt/decrypt payment provider credentials. " +
        "This must be a 64-character hex string (32 bytes), generated once per environment and never committed to source control.",
      500,
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_LENGTH) {
    throwError(
      `PAYMENT_CREDENTIALS_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (a 64-character hex string) — got ${key.length} bytes.`,
      500,
    );
  }
  return key;
}

/**
 * Encrypts a plaintext secret (an API key, a webhook secret, whatever a MerchantAccount stores).
 * Returns a self-contained object — the IV and auth tag travel WITH the ciphertext, not derived
 * from anything else, since GCM needs a fresh random IV per encryption (reusing an IV with the
 * same key breaks GCM's confidentiality guarantee entirely, not just weakens it).
 */
export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null; // an unset credential field stays unset — never encrypt an empty string into a fake secret
  }
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Reverses encryptSecret(). Throws (does not return garbage) if the ciphertext was tampered with
 * or the key is wrong — GCM's authentication tag check fails closed, by design.
 */
export function decryptSecret(encrypted) {
  if (!encrypted || !encrypted.ciphertext) return null;
  const key = resolveKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * A masked preview for admin UIs — "show the last 4 characters so an admin can visually confirm
 * which key is configured, never the real value." Used everywhere a MerchantAccount is serialized
 * back to an API response; the real decrypted value is only ever read in-process, at the moment of
 * an outbound provider call, never sent back over HTTP.
 */
export function maskSecret(plaintext) {
  if (!plaintext) return null;
  const str = String(plaintext);
  if (str.length <= 4) return "****";
  return `****${str.slice(-4)}`;
}
