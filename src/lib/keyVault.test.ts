import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  isValidRecoveryCodeFormat,
  setupKeyVault,
  openWithPassword,
  openWithRecoveryCode,
  rewrapPasswordBox,
  rewrapBoxVerified,
  boxNeedsUpgrade,
  rotateRecoveryCode,
  wrapFileKey,
  unwrapFileKey,
  type KeyBoxV1,
} from "./keyVault";

async function randomFileKeyJwk(): Promise<JsonWebKey> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  return crypto.subtle.exportKey("jwk", key);
}

describe("recovery code", () => {
  it("generates XXXX-XXXX-XXXX from unambiguous charset", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateRecoveryCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01OIL]/);
      expect(isValidRecoveryCodeFormat(code)).toBe(true);
    }
  });

  it("normalization tolerates case, spaces and dashes", () => {
    expect(normalizeRecoveryCode(" abcd-EFGH 2345 ")).toBe("ABCDEFGH2345");
  });

  it("rejects wrong length or ambiguous characters", () => {
    expect(isValidRecoveryCodeFormat("ABCD-EFGH")).toBe(false);
    expect(isValidRecoveryCodeFormat("ABCD-EFGH-230O")).toBe(false);
  });
});

describe("key vault lifecycle", () => {
  it("password and recovery code independently unlock the same master key", async () => {
    const { masterKey, passwordBox, recoveryBox } = await setupKeyVault(
      "correct horse",
      "ABCD-EFGH-2345"
    );

    const fileKey = await randomFileKeyJwk();
    const wrapped = await wrapFileKey(masterKey, fileKey);

    const viaPassword = await openWithPassword("correct horse", passwordBox);
    expect(await unwrapFileKey(viaPassword, wrapped)).toEqual(fileKey);

    const viaCode = await openWithRecoveryCode("abcd efgh 2345", recoveryBox);
    expect(await unwrapFileKey(viaCode, wrapped)).toEqual(fileKey);
  });

  it("wrong password / wrong code fail to open", async () => {
    const { passwordBox, recoveryBox } = await setupKeyVault("pw", "ABCD-EFGH-2345");
    await expect(openWithPassword("wrong", passwordBox)).rejects.toThrow();
    await expect(openWithRecoveryCode("WXYZ-WXYZ-WXYZ", recoveryBox)).rejects.toThrow();
  });

  it("password change re-wraps only the password box; recovery box untouched", async () => {
    const { masterKey, recoveryBox } = await setupKeyVault("old-pw", "ABCD-EFGH-2345");
    const fileKey = await randomFileKeyJwk();
    const wrapped = await wrapFileKey(masterKey, fileKey);

    const newBox = await rewrapPasswordBox(masterKey, "new-pw");
    const viaNew = await openWithPassword("new-pw", newBox);
    expect(await unwrapFileKey(viaNew, wrapped)).toEqual(fileKey);
    await expect(openWithPassword("old-pw", newBox)).rejects.toThrow();

    const viaCode = await openWithRecoveryCode("ABCD-EFGH-2345", recoveryBox);
    expect(await unwrapFileKey(viaCode, wrapped)).toEqual(fileKey);
  });

  it("recovery code rotation yields a new working code", async () => {
    const { masterKey } = await setupKeyVault("pw", "ABCD-EFGH-2345");
    const fileKey = await randomFileKeyJwk();
    const wrapped = await wrapFileKey(masterKey, fileKey);

    const { recoveryCode, recoveryBox } = await rotateRecoveryCode(masterKey);
    expect(isValidRecoveryCodeFormat(recoveryCode)).toBe(true);

    const viaNewCode = await openWithRecoveryCode(recoveryCode, recoveryBox);
    expect(await unwrapFileKey(viaNewCode, wrapped)).toEqual(fileKey);
    await expect(openWithRecoveryCode("ABCD-EFGH-2345", recoveryBox)).rejects.toThrow();
  });
});

// ── D-027: Argon2id upgrade + legacy PBKDF2 compatibility ─────────────────────

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Reproduces the pre-2026-07 v1 wrap so we can prove old vaults still open. */
async function legacyWrapV1(masterKeyRaw: ArrayBuffer, secret: string): Promise<KeyBoxV1> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const kek = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 310_000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, masterKeyRaw);
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: 310_000,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(data),
  };
}

describe("Argon2id KDF upgrade (D-027)", () => {
  it("new vaults are wrapped with Argon2id (v2 boxes)", async () => {
    const { passwordBox, recoveryBox } = await setupKeyVault("pw-argon-1", "ABCD-EFGH-2345");
    expect(passwordBox.v).toBe(2);
    expect(passwordBox.kdf).toBe("Argon2id");
    expect(recoveryBox.v).toBe(2);
    expect(boxNeedsUpgrade(passwordBox)).toBe(false);
  });

  it("legacy v1 PBKDF2 boxes still open with the right password", async () => {
    const masterKeyRaw = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const v1Box = await legacyWrapV1(masterKeyRaw, "old-user-pw");
    expect(boxNeedsUpgrade(v1Box)).toBe(true);

    const key = await openWithPassword("old-user-pw", v1Box);
    expect(key.type).toBe("secret");
    await expect(openWithPassword("wrong-pw", v1Box)).rejects.toThrow();
  });

  it("verify-then-replace: upgraded box opens the same master key", async () => {
    const masterKeyRaw = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const v1Box = await legacyWrapV1(masterKeyRaw, "old-user-pw");
    const masterKey = await openWithPassword("old-user-pw", v1Box);

    const fileKey = await randomFileKeyJwk();
    const wrapped = await wrapFileKey(masterKey, fileKey);

    const v2Box = await rewrapBoxVerified(masterKey, "old-user-pw");
    expect(v2Box.kdf).toBe("Argon2id");

    const reopened = await openWithPassword("old-user-pw", v2Box);
    expect(await unwrapFileKey(reopened, wrapped)).toEqual(fileKey);
    await expect(openWithPassword("wrong-pw", v2Box)).rejects.toThrow();
  });
});
