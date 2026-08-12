import { describe, it, expect } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { unzipSync, strFromU8 } from "fflate";
import {
  buildPackageHtml,
  buildCourtPackage,
  buildDecryptorHtml,
  evidenceFileName,
  courtPackageName,
  encryptForExport,
} from "./evidenceExport";
import type { EvidenceRecord } from "./evidenceVaultService";

const baseRecord: EvidenceRecord = {
  txId: "tx_abcdef123456",
  wrappedFileKey: "sealed",
  encryptedMeta: "sealed",
  originalHash: "51c11e48b1f17db95a344d510217da0a15fc6dbc88aaea55e57a6297e0e3d259",
  encryptedHash: "26458c9a7ccac5cc00000000000000000000000000000000000000000000aaaa",
  captureGrade: 1,
  clientTime: "2026-07-08T11:07:35.000Z",
  serverTime: "2026-07-08T11:07:36.000Z",
  syncStatus: "synced",
  meta: {
    fileName: "e2e_capture_test.png",
    mimeType: "image/png",
    originalSize: 8678,
    capturedAt: "2026-07-08T11:07:35.000Z",
    location: { lat: 31.2304, lng: 121.4737, accuracy: 12.4, system: "GCJ-02" },
    deviceInfo: "TestAgent/1.0",
  },
};

describe("buildPackageHtml", () => {
  it("includes both hashes, record id and file name", () => {
    const html = buildPackageHtml(baseRecord);
    expect(html).toContain(baseRecord.originalHash);
    expect(html).toContain(baseRecord.encryptedHash);
    expect(html).toContain(baseRecord.txId);
    expect(html).toContain("e2e_capture_test.png");
  });

  it("labels grade 1 as 现场取证 and includes location", () => {
    const html = buildPackageHtml(baseRecord);
    expect(html).toContain("现场取证");
    expect(html).toContain("31.230400");
    expect(html).toContain("GCJ-02");
  });

  it("labels grade 2 as 事后导入 and shows no coordinates", () => {
    const html = buildPackageHtml({
      ...baseRecord,
      captureGrade: 2,
      meta: { ...baseRecord.meta, location: undefined, capturedAt: undefined },
    });
    expect(html).toContain("事后导入");
    expect(html).not.toContain("31.230400");
  });

  it("contains the three scenario sections and verification commands", () => {
    const html = buildPackageHtml(baseRecord);
    expect(html).toContain("人身安全保护令");
    expect(html).toContain("离婚诉讼");
    expect(html).toContain("报警与立案");
    expect(html).toContain("certutil -hashfile");
    expect(html).toContain("shasum -a 256");
  });

  it("advertises the encrypted format and points to the decryptor tool", () => {
    const html = buildPackageHtml(baseRecord);
    expect(html).toContain("解密工具.html");
    expect(html).toContain("e2e_capture_test.png.enc");
    expect(html).toContain("PBKDF2");
    expect(html).toContain("AES-256-GCM");
  });

  it("has no un-interpolated template placeholders (regression: certutil ${esc(fileName)})", () => {
    const html = buildPackageHtml(baseRecord);
    expect(html).not.toContain("${esc(fileName)}");
    expect(html).not.toContain("${");
  });

  it("never overclaims: mentions TSA in progress, no 绝对安全/区块链", () => {
    const html = buildPackageHtml(baseRecord);
    expect(html).toContain("接入中");
    expect(html).not.toContain("绝对安全");
    expect(html).not.toContain("区块链");
  });

  it("escapes HTML in user-controlled fields", () => {
    const html = buildPackageHtml({
      ...baseRecord,
      meta: { ...baseRecord.meta, fileName: '<img src=x onerror="x">.png', note: "<script>1</script>" },
    });
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain("<script>1</script>");
  });
});

describe("buildCourtPackage", () => {
  async function readBlob(pkg: Blob): Promise<Uint8Array> {
    const buf = await new Promise<ArrayBuffer>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as ArrayBuffer);
      fr.readAsArrayBuffer(pkg);
    });
    return new Uint8Array(buf);
  }

  it("produces a zip containing the encrypted evidence, the description and the decryptor", async () => {
    const original = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
    const blob = new NodeBlob([original], { type: "image/png" }) as unknown as Blob;
    const pkg = await buildCourtPackage(baseRecord, blob, "test-password-123");
    const entries = unzipSync(await readBlob(pkg));
    const names = Object.keys(entries);
    expect(names).toContain("举证说明.html");
    expect(names).toContain("解密工具.html");
    expect(names).toContain("证据文件/e2e_capture_test.png.enc");
    // The .enc file must NOT equal the original bytes (proves it's encrypted).
    const encName = "证据文件/e2e_capture_test.png.enc";
    expect(entries[encName].length).toBeGreaterThan(original.length);
    // Header: "NMUT" magic + version 0x01
    expect(String.fromCharCode(...entries[encName].slice(0, 4))).toBe("NMUT");
    expect(entries[encName][4]).toBe(0x01);
    // Description still references the record.
    expect(strFromU8(entries["举证说明.html"])).toContain(baseRecord.originalHash);
    // Decryptor is standalone (contains its own crypto script).
    expect(strFromU8(entries["解密工具.html"])).toContain("crypto.subtle");
  }, 30_000);

  it("refuses to build without an export password", async () => {
    const blob = new NodeBlob([new Uint8Array([1, 2, 3])]) as unknown as Blob;
    await expect(buildCourtPackage(baseRecord, blob, "")).rejects.toThrow(/password/i);
  });

  it("round-trips: encrypted bytes can be decrypted with the same password", async () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encrypted = await encryptForExport(original, "correct horse battery staple");
    // Manually replay the decryptor's format parsing.
    const salt = encrypted.slice(5, 21);
    const iv = encrypted.slice(21, 33);
    const ct = encrypted.slice(33);
    const keyMat = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("correct horse battery staple"),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 600_000, hash: "SHA-256" },
      keyMat,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
    expect(Array.from(plaintext)).toEqual(Array.from(original));
  }, 30_000);
});

describe("buildDecryptorHtml", () => {
  it("is self-contained and uses only Web Crypto (no external deps)", () => {
    const html = buildDecryptorHtml();
    expect(html).toContain("crypto.subtle");
    expect(html).toContain("PBKDF2");
    expect(html).toContain("AES-GCM");
    expect(html).not.toContain("<script src=");
    expect(html).not.toContain("http://");
    expect(html).not.toContain("https://");
  });
});

describe("naming", () => {
  it("falls back to a dated name when fileName is missing", () => {
    const r = { ...baseRecord, meta: { ...baseRecord.meta, fileName: undefined } };
    expect(evidenceFileName(r)).toBe("evidence-2026-07-08.png");
  });

  it("court package name uses date + short txId", () => {
    expect(courtPackageName(baseRecord)).toBe("举证包_2026-07-08_tx_abc.zip");
  });
});
