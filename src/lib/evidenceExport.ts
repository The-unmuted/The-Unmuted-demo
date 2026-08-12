/**
 * Phase 3 举证: one-tap court evidence package.
 *
 * The package is a plain ZIP containing:
 *   1. 举证说明.html   — self-contained bilingual description
 *   2. 解密工具.html   — self-contained in-browser decryptor (Web Crypto only)
 *   3. 证据文件/<name>.enc — the evidence, AES-256-GCM encrypted with a fresh
 *      export password (PBKDF2-SHA256, 600k iters). The plaintext never leaves
 *      the vault owner's device until the recipient runs the decryptor.
 *
 * The exported ZIP therefore cannot be opened without the password the
 * survivor sets at export time and shares out-of-band with the recipient.
 * SHA-256 verification still uses universal tools (shasum / certutil) after
 * decryption — no dependency on the 非默 application.
 */

import { zipSync, strToU8 } from "fflate";
import type { EvidenceRecord } from "./evidenceVaultService";

const KDF_ITERATIONS = 600_000;
const MAGIC = new Uint8Array([0x4e, 0x4d, 0x55, 0x54]); // "NMUT"
const FORMAT_VERSION = 0x01;

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

/** Encrypt evidence bytes with an export password.
 *  Layout: MAGIC(4) | version(1) | salt(16) | iv(12) | ciphertext+tag(N)
 */
export async function encryptForExport(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMat = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  const out = new Uint8Array(MAGIC.length + 1 + salt.length + iv.length + ct.length);
  out.set(MAGIC, 0);
  out[MAGIC.length] = FORMAT_VERSION;
  out.set(salt, MAGIC.length + 1);
  out.set(iv, MAGIC.length + 1 + salt.length);
  out.set(ct, MAGIC.length + 1 + salt.length + iv.length);
  return out;
}

export function buildPackageHtml(record: EvidenceRecord): string {
  const fileName = evidenceFileName(record);
  const encName = `${fileName}.enc`;
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
<title>证据材料说明 · Evidence Package Description</title>
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
  .warn { background: #fce8e6; border: 1px solid #ef9a9a; border-radius: 6px; padding: 10px 14px; font-size: 13px; }
  .scenario { border: 1px solid #ccc; border-radius: 6px; padding: 10px 14px; margin: 10px 0; font-size: 13px; }
  .scenario h3 { margin: 0 0 6px; font-size: 14px; }
  pre { background: #f3f3f3; border-radius: 4px; padding: 8px 12px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  footer { margin-top: 32px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
</style>
</head>
<body>
<h1>证据材料说明 <span class="en">Evidence Package Description</span></h1>

<div class="warn"><b>本包内的证据文件是加密的。</b>要查看原件必须两步：先用附带的 <code>解密工具.html</code> 加上发送人另行告知的密码解密，再用系统工具校验 SHA-256 指纹（见第二节）。密码由发送人通过短信、电话等安全渠道另行告知。<br>
<span class="en"><b>The evidence file in this package is encrypted.</b> To view the original, first decrypt it with the accompanying <code>解密工具.html</code> using the password shared separately by the sender, then verify the SHA-256 fingerprint using standard tools (see section 2).</span></div>

<h2>一、证据信息 <span class="en">Evidence details</span></h2>
<table>
${row("文件名（解密后）", "File name (after decrypt)", `<code>${esc(fileName)}</code>`)}
${row("加密文件名", "Encrypted file name", `<code>${esc(encName)}</code>（位于本包 <code>证据文件/</code> 目录 / in the <code>证据文件/</code> folder）`)}
${row("文件类型", "MIME type", `<code>${esc(record.meta.mimeType)}</code>`)}
${row("文件大小（解密后）", "Size (plaintext)", `${record.meta.originalSize} 字节 / bytes`)}
${row("取证方式", "Capture grade", `${esc(gradeZh)}<br><span class="en">${esc(gradeEn)}</span>`)}
${row("拍摄/录制时间", "Captured at", fmtTime(record.meta.capturedAt))}
${row("记录创建时间（设备）", "Record created (device clock)", fmtTime(record.clientTime))}
${row("云端入库时间（服务器）", "Stored in cloud (server clock)", fmtTime(record.serverTime))}
${row("拍摄地点", "Location", esc(locText))}
${row("取证设备", "Device", `<code>${esc(record.meta.deviceInfo ?? "—")}</code>`)}
${record.meta.note ? row("情况说明", "Note", esc(record.meta.note)) : ""}
${row("记录编号", "Record ID", `<code>${esc(record.txId)}</code>`)}
${row("原始文件指纹 SHA-256", "Original file SHA-256", `<code>${esc(record.originalHash)}</code>`)}
${row("云端密文指纹 SHA-256", "Cloud ciphertext SHA-256", `<code>${esc(record.encryptedHash)}</code>`)}
</table>

<h2>二、解密与完整性校验 <span class="en">Decrypt &amp; verify integrity</span></h2>

<div class="scenario">
<h3>第一步：解密 <span class="en">Step 1 — decrypt</span></h3>
<p>用任意现代浏览器（Chrome / Safari / Edge / Firefox）打开本包根目录中的 <code>解密工具.html</code>，选中 <code>证据文件/${esc(encName)}</code>，输入发送人告知的密码，点击「解密并下载」。解密完全在你的电脑本地进行，不会上传任何数据。<br>
<span class="en">Open <code>解密工具.html</code> in any modern browser, select <code>证据文件/${esc(encName)}</code>, enter the password shared by the sender, and click Decrypt. Everything happens locally.</span></p>
<p class="note">解密算法：PBKDF2-SHA256（60 万次迭代）→ AES-256-GCM。任何标准 Web Crypto 实现都可解，不依赖非默应用。<br>
<span class="en">Algorithm: PBKDF2-SHA256 (600k iterations) → AES-256-GCM, decryptable with any standard Web Crypto implementation.</span></p>
</div>

<div class="scenario">
<h3>第二步：校验解密后文件的 SHA-256 指纹 <span class="en">Step 2 — verify SHA-256 of the decrypted file</span></h3>
<p>解密后得到的 <code>${esc(fileName)}</code>，其 SHA-256 指纹应与上表「原始文件指纹」完全一致。用系统自带工具即可校验。</p>

<p><b>macOS / Linux 终端 · macOS / Linux Terminal</b></p>
<p>最简单的方法（推荐）：把解密后的 <code>${esc(fileName)}</code> 直接<b>拖进终端窗口</b>，系统会自动填入完整路径，然后在前面补上命令：</p>
<p><code>shasum -a 256 </code>（空格后拖入文件）→ 回车</p>
<p>或者手动输入：</p>
<pre><code>shasum -a 256 "${esc(fileName)}"</code></pre>

<p><b>Windows 命令提示符 · Windows Command Prompt</b></p>
<p>在文件管理器中进入解密后文件所在目录，在地址栏输入 <code>cmd</code> 回车打开命令行，然后运行：</p>
<pre><code>certutil -hashfile "${esc(fileName)}" SHA256</code></pre>
<p class="en">In File Explorer, open the folder that holds the decrypted file, type <code>cmd</code> in the address bar and press Enter, then run the command above.</p>
</div>

<table>
${row("应当得到 / Expected value", "SHA-256", `<code>${esc(record.originalHash)}</code>`)}
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
<p class="en">For criminal proceedings, civil compensation or divorce litigation: keep the original device where possible. The decrypted file is a copy; the fingerprint and timestamps show it is unchanged since capture.</p>
</div>

<p>如需免费法律帮助：司法部法律援助热线 <b>12348</b>；全国妇女维权热线 <b>12338</b>（均 24 小时）。</p>

<footer>本说明由「非默 The Unmuted」应用生成。校验不依赖本应用：解密工具用标准 Web Crypto，指纹可用任何通用 SHA-256 工具重新计算核对。<br>
<span class="en">Generated by The Unmuted. Verification does not depend on this app — the decryptor uses standard Web Crypto and the fingerprint can be re-computed with any standard SHA-256 tool.</span></footer>
</body>
</html>`;
}

/** Self-contained decryptor page bundled inside every court package. */
export function buildDecryptorHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>证据解密工具 · Evidence Decryption Tool</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 560px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 20px; }
  .note { background: #fffbe6; border: 1px solid #e6d78a; border-radius: 6px; padding: 10px 14px; font-size: 13px; margin: 16px 0; }
  input[type=file], input[type=password], button { font-size: 14px; padding: 10px 14px; border-radius: 6px; border: 1px solid #bbb; }
  input[type=file] { width: 100%; box-sizing: border-box; }
  input[type=password] { width: 100%; box-sizing: border-box; }
  button { background: #333; color: #fff; border: none; cursor: pointer; margin-top: 8px; }
  button:disabled { opacity: .5; cursor: default; }
  .row { margin: 14px 0; }
  label { display: block; font-size: 13px; margin-bottom: 4px; color: #555; }
  #status { margin-top: 20px; padding: 10px 14px; border-radius: 6px; font-size: 13px; display: none; }
  .ok { background: #e6f4ea; border: 1px solid #7ed492; }
  .err { background: #fce8e6; border: 1px solid #ef9a9a; }
  .en { color: #666; font-size: 12px; }
</style>
</head>
<body>
<h1>证据解密工具 <span class="en">Evidence Decryption Tool</span></h1>
<p>本页面用于解密 <code>证据文件/</code> 目录下的 <code>.enc</code> 文件。所有解密都在你的浏览器本地进行，不会上传任何数据。<br>
<span class="en">This page decrypts <code>.enc</code> files locally in your browser. Nothing is uploaded.</span></p>

<div class="note">解密后的原始文件将保存到你电脑的下载目录；使用完毕后请从下载目录彻底删除。<br>
<span class="en">The decrypted file downloads to your computer's Downloads folder. Delete it after use.</span></div>

<div class="row">
  <label>1. 选择加密文件（<code>.enc</code>）<span class="en">Select the encrypted file</span></label>
  <input type="file" id="f" accept=".enc,application/octet-stream" />
</div>

<div class="row">
  <label>2. 输入密码 <span class="en">Enter the password</span></label>
  <input type="password" id="p" autocomplete="off" placeholder="密码 / password" />
</div>

<button id="go" disabled>解密并下载 · Decrypt &amp; download</button>
<div id="status"></div>

<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function setStatus(msg, ok) {
    var s = $("status");
    s.style.display = "block";
    s.textContent = msg;
    s.className = ok ? "ok" : "err";
  }
  function update() { $("go").disabled = !($("f").files[0] && $("p").value); }
  $("f").addEventListener("change", update);
  $("p").addEventListener("input", update);

  $("go").addEventListener("click", async function () {
    var file = $("f").files[0];
    var password = $("p").value;
    $("go").disabled = true;
    setStatus("正在解密... / Decrypting…", true);
    try {
      var buf = new Uint8Array(await file.arrayBuffer());
      if (buf.length < 33) throw new Error("文件太小或格式无效 / File too small or invalid");
      var magic = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
      if (magic !== "NMUT") throw new Error("这不是一个有效的非默加密文件 / Not a valid Unmuted encrypted file");
      if (buf[4] !== 1) throw new Error("不支持的文件版本 / Unsupported version");
      var salt = buf.slice(5, 21);
      var iv = buf.slice(21, 33);
      var ct = buf.slice(33);
      var keyMat = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
      );
      var key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" },
        keyMat, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
      );
      var plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
      var outName = file.name.replace(/\\.enc$/, "") || "decrypted";
      var url = URL.createObjectURL(new Blob([plaintext]));
      var a = document.createElement("a");
      a.href = url; a.download = outName; a.click();
      URL.revokeObjectURL(url);
      setStatus("解密成功，已下载 " + outName + " / Decrypted OK, saved as " + outName, true);
    } catch (e) {
      var msg = (e && e.message) ? e.message : String(e);
      if (/operationerror|decrypt/i.test(msg)) {
        msg = "密码错误或文件被改动过 / Wrong password or file was tampered with";
      }
      setStatus("失败：" + msg, false);
    } finally {
      update();
    }
  });
})();
</script>
</body>
</html>`;
}

/** Assemble the ZIP: encrypted evidence file + HTML description + decryptor. */
export async function buildCourtPackage(
  record: EvidenceRecord,
  decrypted: Blob,
  exportPassword: string
): Promise<Blob> {
  if (!exportPassword) throw new Error("export password required");
  const fileName = evidenceFileName(record);
  const bytes = new Uint8Array(await decrypted.arrayBuffer());
  const encrypted = await encryptForExport(bytes, exportPassword);
  const zipped = zipSync(
    {
      "举证说明.html": strToU8(buildPackageHtml(record)),
      "解密工具.html": strToU8(buildDecryptorHtml()),
      [`证据文件/${fileName}.enc`]: encrypted,
    },
    { level: 6 }
  );
  return new Blob([zipped], { type: "application/zip" });
}

export function courtPackageName(record: EvidenceRecord): string {
  return `举证包_${record.clientTime.slice(0, 10)}_${record.txId.slice(0, 6)}.zip`;
}
