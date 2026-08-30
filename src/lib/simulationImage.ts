/**
 * 结果卡片图片渲染器 — 用 Canvas 手绘（避免 html2canvas 依赖）。
 *
 * 输出：1080 × 1920 竖版图（适合手机截图 / 朋友圈分享）。
 * 包含：品牌头 · 分数环 · 情景标题 · 简短总结 · 二维码 · 底部提示。
 */

import QRCode from "qrcode";
import type { SimulationScoreResult } from "./simulationScore";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const BETA_URL = "https://the-unmuted-demo.vercel.app/";

interface RenderOpts {
  language: "en" | "zh";
  scenarioTitle: string;
  endingTitle: string;
  score: SimulationScoreResult;
}

export async function renderScoreCard(opts: RenderOpts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // ─── 背景（深紫渐变，呼应品牌） ──────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bg.addColorStop(0, "#1a0d2e");
  bg.addColorStop(1, "#0a0518");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // ─── 顶部品牌栏 ──────────────────────
  ctx.fillStyle = "#e2b8ff";
  ctx.font = "bold 56px 'PingFang SC', 'Helvetica Neue', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.language === "zh" ? "非默 · 内测版" : "The Unmuted · Beta", CARD_WIDTH / 2, 140);

  ctx.fillStyle = "rgba(226, 184, 255, 0.55)";
  ctx.font = "500 32px 'PingFang SC', 'Helvetica Neue', sans-serif";
  ctx.fillText(
    opts.language === "zh" ? "情景模拟 · 结果" : "Scenario Simulation · Result",
    CARD_WIDTH / 2,
    200
  );

  // ─── 情景标题 ──────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px 'PingFang SC', 'Helvetica Neue', sans-serif";
  wrapText(ctx, opts.scenarioTitle, CARD_WIDTH / 2, 320, CARD_WIDTH - 160, 56);

  // ─── 分数环 ──────────────────────
  const scoreCenter = { x: CARD_WIDTH / 2, y: 680 };
  const scoreRadius = 220;
  const scorePct = opts.score.score / 100;

  // 背景圆环
  ctx.beginPath();
  ctx.arc(scoreCenter.x, scoreCenter.y, scoreRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 32;
  ctx.stroke();

  // 分数弧
  const bandColor =
    opts.score.band === "high" ? "#4ade80" :
    opts.score.band === "medium" ? "#fbbf24" :
    "#f87171";
  ctx.beginPath();
  ctx.arc(
    scoreCenter.x,
    scoreCenter.y,
    scoreRadius,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * scorePct
  );
  ctx.strokeStyle = bandColor;
  ctx.lineWidth = 32;
  ctx.lineCap = "round";
  ctx.stroke();

  // 分数数字
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 180px 'Helvetica Neue', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(opts.score.score), scoreCenter.x, scoreCenter.y - 10);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "500 36px 'Helvetica Neue', sans-serif";
  ctx.fillText("/ 100", scoreCenter.x, scoreCenter.y + 100);
  ctx.textBaseline = "alphabetic";

  // ─── 分数标签 ──────────────────────
  ctx.fillStyle = bandColor;
  ctx.font = "bold 38px 'PingFang SC', 'Helvetica Neue', sans-serif";
  wrapText(
    ctx,
    opts.language === "zh" ? opts.score.label.zh : opts.score.label.en,
    CARD_WIDTH / 2,
    1010,
    CARD_WIDTH - 160,
    52
  );

  // ─── 决策统计 ──────────────────────
  const statY = 1160;
  const statBoxW = 380;
  const statGap = 40;
  const totalStatW = statBoxW * 2 + statGap;
  const statStartX = (CARD_WIDTH - totalStatW) / 2;

  drawStat(
    ctx,
    statStartX,
    statY,
    statBoxW,
    140,
    "✅",
    String(opts.score.goodCount),
    opts.language === "zh" ? "做对的关键动作" : "Right actions",
    "#4ade80"
  );
  drawStat(
    ctx,
    statStartX + statBoxW + statGap,
    statY,
    statBoxW,
    140,
    "⚠️",
    String(opts.score.badCount),
    opts.language === "zh" ? "错过的关键动作" : "Missed actions",
    "#f87171"
  );

  // ─── 结局标题 ──────────────────────
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = "500 28px 'PingFang SC', 'Helvetica Neue', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    opts.language === "zh" ? "本次结局" : "This run's ending",
    CARD_WIDTH / 2,
    1360
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 32px 'PingFang SC', 'Helvetica Neue', sans-serif";
  wrapText(ctx, opts.endingTitle, CARD_WIDTH / 2, 1410, CARD_WIDTH - 160, 44);

  // ─── 二维码 ──────────────────────
  const qrDataUrl = await QRCode.toDataURL(BETA_URL, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1a0d2e", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 300;
  const qrX = (CARD_WIDTH - qrSize) / 2;
  const qrY = 1560;

  // 二维码白色圆角背景
  drawRoundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // ─── 底部 CTA ──────────────────────
  ctx.fillStyle = "#e2b8ff";
  ctx.font = "bold 30px 'PingFang SC', 'Helvetica Neue', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    opts.language === "zh" ? "扫码体验非默内测版" : "Scan to try The Unmuted Beta",
    CARD_WIDTH / 2,
    1930 - 40
  );

  // ─── 输出 ──────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}

// ─── helpers ──────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const chars = [...text];
  let line = "";
  const lines: string[] = [];
  for (const ch of chars) {
    const testLine = line + ch;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * lineHeight));
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  icon: string,
  count: string,
  label: string,
  color: string
) {
  drawRoundRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fill();

  ctx.font = "50px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, x + 30, y + h / 2);

  ctx.fillStyle = color;
  ctx.font = "bold 60px 'Helvetica Neue', sans-serif";
  ctx.fillText(count, x + 110, y + h / 2 - 12);

  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "500 24px 'PingFang SC', 'Helvetica Neue', sans-serif";
  ctx.fillText(label, x + 110, y + h / 2 + 32);

  ctx.textBaseline = "alphabetic";
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 保存到设备。优先用 Web Share API（iOS/Android 上会弹出系统分享菜单，含「存到相册」），
 * 桌面浏览器降级到 <a download> 触发下载。
 */
export async function saveOrShareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });

  // Try Web Share API (best UX on mobile — includes "Save to Photos" on iOS)
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return { method: "share" as const };
    } catch (e) {
      // User cancelled or error — fall through to download
      if ((e as DOMException).name !== "AbortError") {
        console.warn("Web Share failed, falling back to download:", e);
      } else {
        return { method: "cancelled" as const };
      }
    }
  }

  // Desktop / browsers without Web Share Files API — trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { method: "download" as const };
}
