/**
 * Key vault — D-017 key hierarchy (docs/decisions.md).
 *
 *   Recovery code (paper, one per user)──derive──▶ KEK-A ──wraps──┐
 *   Login password ────────────────────derive──▶ KEK-B ──wraps──┼──▶ Master key
 *                                                                │    (random, never
 *   Per-file keys ◀──wrapped by master key───────────────────────┘     stored in plaintext)
 *
 * The two "boxes" (master key wrapped by KEK-A / KEK-B) are safe to store
 * server-side: without the password or the recovery code they are opaque.
 * All derivation and unwrapping happens on-device via Web Crypto.
 */

// Charset excludes ambiguous characters (0/O, 1/I/L) — codes are hand-copied on paper
const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;

const PBKDF2_ITERATIONS = 310_000;

export interface KeyBox {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string; // base64
  iv: string;   // base64
  data: string; // base64 — master key encrypted by the derived KEK
}

export interface KeyVaultSetup {
  masterKey: CryptoKey;
  passwordBox: KeyBox;
  recoveryBox: KeyBox;
}

// ── base64 helpers ─────────────────────────────────────────────────────────────

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

// ── Recovery code ──────────────────────────────────────────────────────────────

/** Generate a 12-char recovery code, grouped for hand-copying: XXXX-XXXX-XXXX */
export function generateRecoveryCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[random[i] % CODE_CHARSET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

/** Tolerant to how people copy from paper: case, spaces, dashes all ignored */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isValidRecoveryCodeFormat(input: string): boolean {
  const code = normalizeRecoveryCode(input);
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_CHARSET.includes(c));
}

// ── KDF + wrap/unwrap primitives ──────────────────────────────────────────────

async function deriveKek(
  secret: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function wrapMasterKey(masterKeyRaw: ArrayBuffer, secret: string): Promise<KeyBox> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveKek(secret, salt, PBKDF2_ITERATIONS);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, masterKeyRaw);
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(data),
  };
}

async function unwrapMasterKey(box: KeyBox, secret: string): Promise<CryptoKey> {
  const kek = await deriveKek(secret, fromB64(box.salt), box.iterations);
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(box.iv) as BufferSource },
    kek,
    fromB64(box.data) as BufferSource
  );
  return importMasterKey(raw);
}

/** Extractable so the session can re-wrap boxes (password change / new recovery code) */
function importMasterKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ── Vault lifecycle ────────────────────────────────────────────────────────────

/** First-time setup: random master key wrapped twice (password + recovery code) */
export async function setupKeyVault(
  password: string,
  recoveryCode: string
): Promise<KeyVaultSetup> {
  const masterKeyRaw = crypto.getRandomValues(new Uint8Array(32)).buffer;
  const [passwordBox, recoveryBox, masterKey] = await Promise.all([
    wrapMasterKey(masterKeyRaw, password),
    wrapMasterKey(masterKeyRaw, normalizeRecoveryCode(recoveryCode)),
    importMasterKey(masterKeyRaw),
  ]);
  return { masterKey, passwordBox, recoveryBox };
}

export function openWithPassword(password: string, passwordBox: KeyBox): Promise<CryptoKey> {
  return unwrapMasterKey(passwordBox, password);
}

export function openWithRecoveryCode(code: string, recoveryBox: KeyBox): Promise<CryptoKey> {
  return unwrapMasterKey(recoveryBox, normalizeRecoveryCode(code));
}

/** After password change: re-wrap the password box; the recovery box is untouched */
export async function rewrapPasswordBox(
  masterKey: CryptoKey,
  newPassword: string
): Promise<KeyBox> {
  const raw = await crypto.subtle.exportKey("raw", masterKey);
  return wrapMasterKey(raw, newPassword);
}

/** Rotate the recovery code: returns the new code + its box; old box must be discarded */
export async function rotateRecoveryCode(
  masterKey: CryptoKey
): Promise<{ recoveryCode: string; recoveryBox: KeyBox }> {
  const recoveryCode = generateRecoveryCode();
  const raw = await crypto.subtle.exportKey("raw", masterKey);
  const recoveryBox = await wrapMasterKey(raw, normalizeRecoveryCode(recoveryCode));
  return { recoveryCode, recoveryBox };
}

// ── Sealing small payloads with the master key ────────────────────────────────

/** Encrypt any JSON value with the master key → "ivB64.dataB64" for cloud storage */
export async function sealJson(masterKey: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, plaintext);
  return `${toB64(iv)}.${toB64(data)}`;
}

export async function openJson<T>(masterKey: CryptoKey, sealed: string): Promise<T> {
  const [ivB64, dataB64] = sealed.split(".");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) as BufferSource },
    masterKey,
    fromB64(dataB64) as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

/** Wrap a file's AES key (JWK from evidenceCrypto) with the master key */
export function wrapFileKey(masterKey: CryptoKey, fileKeyJwk: JsonWebKey): Promise<string> {
  return sealJson(masterKey, fileKeyJwk);
}

export function unwrapFileKey(masterKey: CryptoKey, wrapped: string): Promise<JsonWebKey> {
  return openJson<JsonWebKey>(masterKey, wrapped);
}
