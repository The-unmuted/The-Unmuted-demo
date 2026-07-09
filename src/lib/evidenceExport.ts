/**
 * Phase 3 举证: one-tap court evidence package.
 *
 * The package is a plain ZIP — decrypted original file + a self-contained
 * bilingual HTML description — verifiable with universal tools (certutil /
 * shasum) even if 非默 no longer exists. No proprietary formats.
 */

import { zipSync, strToU8 } from "fflate";
import type { EvidenceRecord } from "./evidenceVaultService";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? esc(iso) : d.toLocaleString("zh-CN", { hour12: false }) + " (本机时区 local time)";
}

export function evidenceFileName(record: EvidenceRecord): string {
  return (
    record.meta.fileName ||
    `evidence-${record.clientTime.slice(0, 10)}.${(record.meta.mimeType.split("/")[1] ?? "bin").split(";")[0]}`
  );
}

function row(zhLabel: string, enLabel: string, value: string): string {
  return `<tr><th>${zhLabel}<br><span class="en">${enLabel}</span></th><td>${value}</td></tr>`;
}

export function buildPackageHtml(record: EvidenceRecord): string {
  const fileName = evidenceFileName(record);
  const grade1 = record.captureGrade === 1;
  const gradeZh = grade1
    ? "现场取证 — 在事发当下由本应用即时拍摄或录制，文件指纹在取证瞬间由设备本地计算并固定。"
    : "事后导入 — 由用户导入的已有文件，文件指纹在导入时由设备本地计算并固定；文件本身的生成时间以文件自身属性为准。";
  const gradeEn = grade1
    ? "Captured live in-app; the file fingerprint was computed and fixed on the device at the moment of capture."
    : "Imported pre-existing file; the fingerprint was fixed on the device at import time.";
  const loc = record.meta.location;
  const locText = loc
    ? `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}（坐标系 ${loc.system}${
        loc.accuracy ? `，精度约 ${Math.round(loc.accuracy)} 米 / accuracy ≈ ${Math.round(loc.accuracy)} m` : ""
      }）`
    : "—";

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>证据材料说明 · Evidence Package</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 28px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #bbb; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; width: 34%; font-weight: 600; }
  code { background: #f3f3f3; padding: 1px 5px; border-radius: 3px; font-size: 12px; word-break: break-all; }
  .en { color: #666; font-size: 11px; font-weight: normal; }
  .note { background: #fffbe6; border: 1px solid #e6d78a; border-radius: 6px; padding: 10px 14px; font-size: 13px; }
  .scenario { border: 1px solid #ccc; border-radius: 6px; padding: 10px 14px; margin: 10px 0; font-size: 13px; }
  .scenario h3 { margin: 0 0 6px; font-size: 14px; }
  footer { margin-top: 32px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
</style>
</head>
<body>
<h1>证据材料说明 <span class="en">Evidence Package Description</span></h1>

<h2>一、证据信息 <span class="en">Evidence details</span></h2>
<table>
${row("文件名", "File name", `<code>${esc(fileName)}</code>（位于本包 <code>证据文件/</code> 目录 / in the <code>证据文件/</code> folder）`)}
${row("文件类型", "MIME type", `<code>${esc(record.meta.mimeType)}</code>`)}
${row("文件大小", "Size", `${record.meta.originalSize} 字节 / bytes`)}
${row("取证方式", "Capture grade", `${esc(gradeZh)}<br><span class="en">${esc(gradeEn)}</span>`)}
${row("拍摄/录制时间", "Captured at", fmtTime(record.meta.capturedAt))}
${row("记录创建时间（设备）", "Record created (device clock)", fmtTime(record.clientTime))}
${row("云端入库时间（服务器）", "Stored in cloud (server clock)", fmtTime(record.serverTime))}
${row("拍摄地点", "Location", esc(locText))}
${row("取证设备", "Device", `<code>${esc(record.meta.deviceInfo ?? "—")}</code>`)}
${record.meta.note ? row("情况说明", "Note", esc(record.meta.note)) : ""}
${row("记录编号", "Record ID", `<code>${esc(record.txId)}</code>`)}
${row("原始文件指纹 SHA-256", "Original file SHA-256", `<code>${esc(record.originalHash)}</code>`)}
${row("加密文件指纹 SHA-256", "Encrypted file SHA-256", `<code>${esc(record.encryptedHash)}</code>`)}
</table>

<h2>二、完整性校验方法 <span class="en">How to verify integrity</span></h2>
<p>本包内 <code>证据文件/${esc(fileName)}</code> 的 SHA-256 指纹应与上表「原始文件指纹」完全一致。任何人都可以用系统自带工具重新计算，无需本应用：</p>
<table>
${row("Windows（命令提示符）", "Windows (Command Prompt)", `<code>certutil -hashfile "证据文件\\${esc(fileName)}" SHA256</code>`)}
${row("macOS / Linux（终端）", "macOS / Linux (Terminal)", `<code>shasum -a 256 "证据文件/${esc(fileName)}"</code>`)}
${row("应当得到", "Expected value", `<code>${esc(record.originalHash)}</code>`)}
</table>
<p class="note">说明：文件指纹（SHA-256）在取证当下由设备本地计算并固定，此后文件哪怕被改动一个字节，指纹都会完全不同。当前记录的时间为设备时间与云端服务器时间两份；可信时间戳（TSA）服务接入中，接入后将为记录追加权威时间证明。<br>
<span class="en">The SHA-256 fingerprint was fixed on the device at capture time; any later modification changes it completely. Times shown are device and server clocks; trusted timestamping (TSA) integration is in progress.</span></p>

<h2>三、使用场景指引 <span class="en">How to use this evidence</span></h2>
<p>无论你遭遇的是性侵害、家庭暴力、骚扰跟踪还是其他侵害，以下指引请选用适合你情况的部分。<span class="en">Whatever you experienced — sexual assault, domestic violence, stalking or other harm — use whichever sections apply to you.</span></p>

<div class="scenario">
<h3>1. 报警与立案（适用于所有情况）</h3>
<p>报警时携带手机与本包材料，<b>要求出具报警回执</b>；身体受伤的可要求进行伤情鉴定。<b>遭遇性侵害的：尽量第一时间报警并接受人身检查，报警前尽量不要洗澡、不要清洗或丢弃当时的衣物用品</b>——身体与物证由公安机关提取最有效，本包中的电子证据可配合你的陈述作为辅助证明。属于家庭暴力的，可要求公安机关出具<b>告诫书</b>——告诫书本身也是后续申请保护令和诉讼的有力证据。</p>
<p class="en">Ask the police for a written receipt (报警回执). For sexual assault, report as soon as you can and avoid washing yourself or the clothing involved beforehand — physical evidence collected by the police is strongest, and this package supports your statement. For domestic violence, ask for a written warning letter (告诫书).</p>
</div>

<div class="scenario">
<h3>2. 申请人身安全保护令（适用于家庭成员或亲密关系中的暴力）</h3>
<p>遭受家庭成员，或同居、恋爱等亲密关系中的暴力或暴力威胁的，可直接向你居住地或对方居住地的<b>基层人民法院</b>申请，<b>不需要先起诉离婚，也不限于婚姻关系</b>。法院一般在 72 小时内作出裁定，情况紧急的 24 小时内。除本包材料外，报警回执、公安告诫书、伤情照片、证人证言都有帮助。妇联（12338）、居委会/村委会可协助申请。</p>
<p class="en">For violence within family or intimate relationships (including cohabiting or dating), apply directly at the basic people's court — no divorce filing or marriage required. Rulings are normally issued within 72 hours (24 in emergencies).</p>
</div>

<div class="scenario">
<h3>3. 诉讼维权（刑事、民事赔偿或离婚诉讼）</h3>
<p>电子证据尽量同时保留<b>原始载体</b>（拍摄用的手机）。本包中的文件是加密保存记录的解密副本，配合上表指纹与时间信息可说明其自取证时起未被改动；App 账号内的加密原始记录建议继续保留，以备法庭核对。</p>
<p class="en">For criminal proceedings, civil compensation or divorce litigation: keep the original device where possible. This package is a decrypted copy; the fingerprint and timestamps show it is unchanged since capture.</p>
</div>

<p>如需免费法律帮助：司法部法律援助热线 <b>12348</b>；全国妇女维权热线 <b>12338</b>（均 24 小时）。</p>

<footer>本说明由「非默 The Unmuted」应用生成。校验不依赖本应用：文件指纹可用任何通用 SHA-256 工具重新计算核对。<br>
<span class="en">Generated by The Unmuted. Verification does not depend on this app — the fingerprint can be re-computed with any standard SHA-256 tool.</span></footer>
</body>
</html>`;
}

/** Assemble the ZIP: decrypted original under 证据文件/ + the HTML description. */
export async function buildCourtPackage(record: EvidenceRecord, decrypted: Blob): Promise<Blob> {
  const fileName = evidenceFileName(record);
  const bytes = new Uint8Array(await decrypted.arrayBuffer());
  const zipped = zipSync(
    {
      "举证说明.html": strToU8(buildPackageHtml(record)),
      [`证据文件/${fileName}`]: bytes,
    },
    // The original is already compressed media in most cases; store the HTML
    // compressed but keep default level low for speed on old phones.
    { level: 6 }
  );
  return new Blob([zipped], { type: "application/zip" });
}

export function courtPackageName(record: EvidenceRecord): string {
  return `举证包_${record.clientTime.slice(0, 10)}_${record.txId.slice(0, 6)}.zip`;
}
