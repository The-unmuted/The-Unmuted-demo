import { describe, it, expect } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { unzipSync, strFromU8 } from "fflate";
import { buildPackageHtml, buildCourtPackage, evidenceFileName, courtPackageName } from "./evidenceExport";
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
  it("produces a zip with the HTML and the original file bytes", async () => {
    const original = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
    // jsdom's Blob lacks arrayBuffer(); Node's Blob matches the browser API.
    const blob = new NodeBlob([original], { type: "image/png" }) as unknown as Blob;
    const pkg = await buildCourtPackage(baseRecord, blob);
    // jsdom Blob also lacks arrayBuffer(); FileReader is implemented.
    const buf = await new Promise<ArrayBuffer>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as ArrayBuffer);
      fr.readAsArrayBuffer(pkg);
    });
    const entries = unzipSync(new Uint8Array(buf));
    const names = Object.keys(entries);
    expect(names).toContain("举证说明.html");
    expect(names).toContain("证据文件/e2e_capture_test.png");
    expect(Array.from(entries["证据文件/e2e_capture_test.png"])).toEqual(Array.from(original));
    expect(strFromU8(entries["举证说明.html"])).toContain(baseRecord.originalHash);
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
