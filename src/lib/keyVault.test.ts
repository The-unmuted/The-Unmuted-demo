import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  isValidRecoveryCodeFormat,
  setupKeyVault,
  openWithPassword,
  openWithRecoveryCode,
  rewrapPasswordBox,
  rotateRecoveryCode,
  wrapFileKey,
  unwrapFileKey,
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
