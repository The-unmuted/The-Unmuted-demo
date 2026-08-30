/**
 * 结果卡片图片渲染器 — 用 Canvas 手绘。
 *
 * 布局：1080 × 1920 竖版
 *   1. 品牌头：logo + 非默 THE UNMUTED + 情景模拟·结果报告
 *   2. Headline 区：大字鼓励语（"你已经迈出了重要的一步"）
 *   3. 情景卡：本次情景标题 + 简述（描边玻璃卡）
 *   4. 分数区：大数字分数 + 4 档标尺 + 当前档位说明
 *   5. 两个动作卡：做对的 (top 2) + 可以做更好的 (top 2)
 *   6. 小建议：一段总结
 *   7. 底部：二维码 + 扫码提示 + 品牌底纹
 */

import QRCode from "qrcode";
import { pickTop, shortLabelFor, type SimulationScoreResult } from "./simulationScore";

const W = 1080;
const H = 1920;
const BETA_URL = "https://the-unmuted-beta.pages.dev/";

interface RenderOpts {
  language: "en" | "zh";
  scenarioTitle: string;
  scenarioTagline: string;
  endingTitle: string;
  score: SimulationScoreResult;
}

// 深紫渐变主色
const COLOR = {
  bg1: "#1a0d2e",
  bg2: "#0a0518",
  card: "rgba(255, 255, 255, 0.04)",
  cardBorder: "rgba(255, 255, 255, 0.10)",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.65)",
  textDim: "rgba(255, 255, 255, 0.45)",
  brandPurple: "#c084fc",
  brandPink: "#f472b6",
  brandGold: "#fbbf24",
  emerald: "#4ade80",
  amber: "#fbbf24",
  rose: "#f87171",
} as const;

const FONT_ZH = "'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
const FONT_LATIN = "'Helvetica Neue', 'Inter', sans-serif";

export async function renderScoreCard(opts: RenderOpts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const lang = opts.language;

  // ─── 1. 背景 ─────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, COLOR.bg1);
  bg.addColorStop(1, COLOR.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ─── 2. 品牌头（顶部 y=60~140）─────────────────
  drawBrandHeader(ctx, lang);

  // ─── 3. Headline + 情景卡（y=210~530）─────────
  drawHeadlineAndScenario(ctx, opts);

  // ─── 4. 分数环 + 标尺（y=590~1030）─────────────
  drawScoreSection(ctx, opts);

  // ─── 5. 动作卡：做对/可以做更好（y=1090~1400）──
  drawActionCards(ctx, opts);

  // ─── 6. 小建议（y=1450~1600）─────────────────
  drawTip(ctx, opts);

  // ─── 7. 底部二维码 + 品牌线（y=1650~1900）──────
  await drawFooter(ctx, lang);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png", 0.95);
  });
}

// ─── 1. 品牌头 ─────────────────────────────────
function drawBrandHeader(ctx: CanvasRenderingContext2D, lang: "en" | "zh") {
  // 左侧: 品牌 icon（简化的品牌标记：紫粉渐变圆点）
  const iconCx = 100;
  const iconCy = 110;
  const iconR = 32;
  const g = ctx.createLinearGradient(iconCx - iconR, iconCy - iconR, iconCx + iconR, iconCy + iconR);
  g.addColorStop(0, COLOR.brandPurple);
  g.addColorStop(1, COLOR.brandPink);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
  ctx.fill();
  // 简化的手形/声波
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(iconCx, iconCy - 8, 14, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(iconCx - 12, iconCy + 12);
  ctx.quadraticCurveTo(iconCx, iconCy + 2, iconCx + 12, iconCy + 12);
  ctx.stroke();

  // 品牌名 非默 THE UNMUTED
  ctx.fillStyle = COLOR.text;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `bold 48px ${FONT_ZH}`;
  ctx.fillText("非默", 155, 92);
  ctx.font = `500 22px ${FONT_LATIN}`;
  ctx.fillStyle = COLOR.textMuted;
  ctx.letterSpacing = "0.15em";
  ctx.fillText("THE UNMUTED", 155, 128);

  // 右侧胶囊：情景模拟·结果报告
  const pillText = lang === "zh" ? "情景模拟 · 结果报告" : "Scenario · Result";
  ctx.font = `600 24px ${FONT_ZH}`;
  const pillTextW = ctx.measureText(pillText).width;
  const pillW = pillTextW + 90;
  const pillH = 56;
  const pillX = W - 60 - pillW;
  const pillY = 82;
  drawRoundRect(ctx, pillX, pillY, pillW, pillH, 28);
  ctx.strokeStyle = "rgba(192, 132, 252, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // 星标
  drawStar(ctx, pillX + 32, pillY + pillH / 2, 10, COLOR.brandPurple);
  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, pillX + 58, pillY + pillH / 2);
}

// ─── 2. Headline + 情景卡 ──────────────────────
function drawHeadlineAndScenario(ctx: CanvasRenderingContext2D, opts: RenderOpts) {
  const lang = opts.language;
  // 大字 headline（左侧）
  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `bold 60px ${FONT_ZH}`;
  const headline = lang === "zh" ? opts.score.headline.zh : opts.score.headline.en;
  wrapText(ctx, headline, 60, 230, 500, 78, "left");

  // 副文案
  ctx.font = `500 24px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  const sub = lang === "zh"
    ? "通过情景模拟，检视你的反应与决策\n帮助你在真实情境中更从容地保护自己和他人。"
    : "The simulation reflects your reactions and decisions,\nso you can respond more calmly in real situations.";
  wrapText(ctx, sub, 60, 400, 500, 34, "left");

  // 情景卡（右侧）
  const cardX = 620;
  const cardY = 210;
  const cardW = W - cardX - 60;
  const cardH = 330;
  drawGlassCard(ctx, cardX, cardY, cardW, cardH);

  // "本次情景" 小标签
  ctx.font = `600 20px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textDim;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(lang === "zh" ? "本次情景" : "This scenario", cardX + 32, cardY + 32);

  // 情景标题
  ctx.font = `bold 34px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.text;
  wrapText(ctx, opts.scenarioTitle, cardX + 32, cardY + 72, cardW - 64, 44, "left");

  // 情景简述
  ctx.font = `500 20px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  wrapText(ctx, opts.scenarioTagline, cardX + 32, cardY + 172, cardW - 64, 30, "left");

  // 底部小徽章：显示 4 个能力关键词
  const badges = lang === "zh"
    ? ["人身安全", "识别风险", "寻求帮助", "证据保存"]
    : ["Safety", "Risk", "Help", "Evidence"];
  const badgeY = cardY + cardH - 60;
  let badgeX = cardX + 32;
  ctx.font = `600 18px ${FONT_ZH}`;
  for (const b of badges) {
    const bw = ctx.measureText(b).width + 28;
    drawRoundRect(ctx, badgeX, badgeY, bw, 34, 17);
    ctx.strokeStyle = "rgba(192, 132, 252, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COLOR.textMuted;
    ctx.textBaseline = "middle";
    ctx.fillText(b, badgeX + 14, badgeY + 17);
    badgeX += bw + 12;
    if (badgeX + 100 > cardX + cardW) break;
  }
  ctx.textBaseline = "alphabetic";
}

// ─── 3. 分数区（含 4 档标尺）──────────────────────
function drawScoreSection(ctx: CanvasRenderingContext2D, opts: RenderOpts) {
  const lang = opts.language;
  const y0 = 600;
  const h = 430;

  // 大卡片背景
  drawGlassCard(ctx, 60, y0, W - 120, h);

  // 左上小标: ✦ 你的综合得分
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  drawStar(ctx, 100, y0 + 46, 10, COLOR.brandPurple);
  ctx.font = `600 26px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  ctx.fillText(lang === "zh" ? "你的综合得分" : "Your Score", 128, y0 + 34);

  // 大数字分数
  ctx.textBaseline = "alphabetic";
  const scoreGradient = ctx.createLinearGradient(80, y0 + 100, 380, y0 + 250);
  scoreGradient.addColorStop(0, COLOR.brandPurple);
  scoreGradient.addColorStop(0.5, COLOR.brandPink);
  scoreGradient.addColorStop(1, COLOR.brandGold);
  ctx.fillStyle = scoreGradient;
  ctx.font = `900 180px ${FONT_LATIN}`;
  ctx.fillText(String(opts.score.score), 90, y0 + 260);

  // /100
  ctx.fillStyle = COLOR.textDim;
  ctx.font = `500 40px ${FONT_LATIN}`;
  const scoreW = ctx.measureText(String(opts.score.score)).width;
  ctx.fillText("/ 100", 100 + scoreW + 10, y0 + 260);

  // 档位胶囊: 部分准备
  const bandLabel = lang === "zh" ? opts.score.label.zh : opts.score.label.en;
  const bandColor = bandColorFor(opts.score.band);
  ctx.font = `bold 28px ${FONT_ZH}`;
  const bandTextW = ctx.measureText(bandLabel).width;
  const bandPillW = bandTextW + 60;
  const bandPillH = 60;
  const bandPillX = 90;
  const bandPillY = y0 + 300;
  drawRoundRect(ctx, bandPillX, bandPillY, bandPillW, bandPillH, 30);
  ctx.strokeStyle = bandColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = bandColor;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(bandLabel, bandPillX + bandPillW / 2, bandPillY + bandPillH / 2);

  // detail 文字
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `500 22px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  const detail = lang === "zh" ? opts.score.detail.zh : opts.score.detail.en;
  wrapText(ctx, detail, 90, bandPillY + bandPillH + 20, 380, 32, "left");

  // 右侧 4 档标尺
  drawBandRuler(ctx, opts, y0 + 40, h - 80);
}

function drawBandRuler(ctx: CanvasRenderingContext2D, opts: RenderOpts, y0: number, h: number) {
  const lang = opts.language;
  const cx = W - 340;
  const bandsInfo: Array<{ band: typeof opts.score.band; min: number; max: number; labelZh: string; labelEn: string }> = [
    { band: "excellent", min: 80, max: 100, labelZh: "准备充分", labelEn: "Well-prepared" },
    { band: "good", min: 60, max: 79, labelZh: "基本准备", labelEn: "Basic preparation" },
    { band: "partial", min: 40, max: 59, labelZh: "部分准备", labelEn: "Partial preparation" },
    { band: "weak", min: 0, max: 39, labelZh: "需要加强", labelEn: "Needs strengthening" },
  ];

  const rowH = (h - 40) / bandsInfo.length;
  for (let i = 0; i < bandsInfo.length; i++) {
    const b = bandsInfo[i];
    const y = y0 + 20 + i * rowH;
    const isCurrent = b.band === opts.score.band;
    const color = bandColorFor(b.band);

    // 圆点
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx - 30, y + rowH / 2, isCurrent ? 10 : 6, 0, Math.PI * 2);
    ctx.fill();
    if (isCurrent) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 30, y + rowH / 2, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 分数区间
    ctx.font = `bold ${isCurrent ? 34 : 26}px ${FONT_LATIN}`;
    ctx.fillStyle = isCurrent ? color : COLOR.textMuted;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`${b.min}-${b.max}`, cx, y + rowH / 2 - 15);

    // 档位名字
    ctx.font = `600 ${isCurrent ? 26 : 22}px ${FONT_ZH}`;
    ctx.fillStyle = isCurrent ? COLOR.text : COLOR.textDim;
    ctx.fillText(lang === "zh" ? b.labelZh : b.labelEn, cx, y + rowH / 2 + 20);
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

// ─── 4. 两个动作卡 ─────────────────────────────
function drawActionCards(ctx: CanvasRenderingContext2D, opts: RenderOpts) {
  const lang = opts.language;
  const y0 = 1090;
  const h = 340;
  const gap = 30;
  const cardW = (W - 120 - gap) / 2;

  const good = pickTop(opts.score.breakdown, "good", 2);
  const bad = pickTop(opts.score.breakdown, "bad", 2);

  drawActionCard(
    ctx,
    60, y0, cardW, h,
    COLOR.emerald,
    "✓",
    lang === "zh" ? "你做对了" : "You did right",
    opts.score.goodCount,
    lang === "zh" ? "个关键动作" : "key actions",
    lang === "zh" ? "这些行为帮助你更好地保护了自己" : "These help protect yourself and others",
    good,
    lang
  );

  drawActionCard(
    ctx,
    60 + cardW + gap, y0, cardW, h,
    COLOR.rose,
    "!",
    lang === "zh" ? "你可以做得更好" : "You can do better",
    opts.score.badCount,
    lang === "zh" ? "个关键动作" : "key actions",
    lang === "zh" ? "这些环节可以进一步提升你的安全保障" : "These areas can strengthen your safety",
    bad,
    lang
  );
}

function drawActionCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  accent: string,
  icon: string,
  title: string,
  count: number,
  countUnit: string,
  subtitle: string,
  items: Array<{ flag: string; delta: number }>,
  lang: "en" | "zh"
) {
  drawGlassCard(ctx, x, y, w, h);

  // 顶部：图标 + 标题 + 计数
  const padX = 32;
  const padY = 32;
  // 圆形图标
  const icX = x + padX + 20;
  const icY = y + padY + 22;
  ctx.beginPath();
  ctx.arc(icX, icY, 22, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `bold 28px ${FONT_LATIN}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon, icX, icY + 1);

  // 标题
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `bold 28px ${FONT_ZH}`;
  ctx.fillStyle = accent;
  ctx.fillText(title, x + padX + 56, y + padY + 4);

  // 计数
  ctx.font = `bold 30px ${FONT_LATIN}`;
  ctx.fillStyle = accent;
  const titleW = ctx.measureText(title).width;
  // dot separator
  ctx.font = `bold 30px ${FONT_LATIN}`;
  const spacer = "  ";
  ctx.font = `bold 30px ${FONT_ZH}`;
  ctx.fillText(String(count), x + padX + 56 + ctx.measureText(title).width + 20, y + padY);
  const countStr = String(count);
  ctx.font = `600 22px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText(countUnit, x + padX + 56 + titleW + 20 + ctx.measureText(countStr).width + 10, y + padY + 8);

  // 副标题
  ctx.font = `500 20px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  ctx.fillText(subtitle, x + padX, y + padY + 60);

  // 具体条目（01/02 编号）
  const listStartY = y + padY + 110;
  const rowH = 90;
  for (let i = 0; i < items.length && i < 2; i++) {
    const item = items[i];
    const ry = listStartY + i * rowH;
    // 编号方块
    drawRoundRect(ctx, x + padX, ry, 44, 44, 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fill();
    ctx.font = `bold 20px ${FONT_LATIN}`;
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1).padStart(2, "0"), x + padX + 22, ry + 23);

    // 描述文字
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `500 22px ${FONT_ZH}`;
    ctx.fillStyle = COLOR.text;
    const label = shortLabelFor(item.flag, lang);
    wrapText(ctx, label, x + padX + 60, ry + 4, w - padX * 2 - 60, 30, "left");
  }
}

// ─── 5. 小建议 ─────────────────────────────────
function drawTip(ctx: CanvasRenderingContext2D, opts: RenderOpts) {
  const lang = opts.language;
  const y0 = 1470;
  const h = 180;
  drawGlassCard(ctx, 60, y0, W - 120, h);

  // 灯泡图标 + 标题
  ctx.font = `28px ${FONT_LATIN}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("💡", 92, y0 + 30);
  ctx.font = `bold 28px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.text;
  ctx.fillText(lang === "zh" ? "小建议" : "Tip", 140, y0 + 34);

  // 建议文字
  ctx.font = `500 22px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  const tip = lang === "zh"
    ? "在面对潜在风险时，尽早识别、及时求助、保留证据，能帮助你更好地保护自己，也为后续维权提供支持。"
    : "In the face of risk, early recognition, timely help-seeking, and evidence preservation are what protect you and enable later action.";
  wrapText(ctx, tip, 92, y0 + 82, W - 184, 32, "left");
}

// ─── 6. 底部：二维码 + 品牌线 ───────────────────
async function drawFooter(ctx: CanvasRenderingContext2D, lang: "en" | "zh") {
  const y0 = 1700;

  // 二维码
  const qrDataUrl = await QRCode.toDataURL(BETA_URL, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: "#1a0d2e", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 160;
  const qrX = W - 60 - qrSize - 20;
  const qrY = y0;
  drawRoundRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 二维码旁提示
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = `bold 26px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.text;
  ctx.fillText(lang === "zh" ? "扫码体验" : "Scan to try", qrX - 30, qrY + 40);
  ctx.font = `600 24px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.brandPurple;
  ctx.fillText(lang === "zh" ? "非默内测版" : "The Unmuted Beta", qrX - 30, qrY + 80);

  // 左侧：鼓励语
  ctx.textAlign = "left";
  ctx.font = `500 26px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  ctx.fillText(lang === "zh" ? "你不是一个人" : "You are not alone", 90, y0 + 30);
  ctx.font = `500 22px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText(lang === "zh" ? "我们在这里 ♡" : "We are here ♡", 90, y0 + 66);

  // 底部品牌线
  ctx.textAlign = "center";
  ctx.font = `500 20px ${FONT_LATIN}`;
  ctx.fillStyle = COLOR.textDim;
  ctx.fillText("THE UNMUTED · 非默", W / 2, y0 + 190);
}

// ─── helpers ──────────────────────────────────

function bandColorFor(band: SimulationScoreResult["band"]): string {
  switch (band) {
    case "excellent": return COLOR.emerald;
    case "good": return "#67e8f9"; // cyan
    case "partial": return COLOR.amber;
    case "weak": return COLOR.rose;
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a + Math.PI / 4) * r * 0.35, cy + Math.sin(a + Math.PI / 4) * r * 0.35);
  }
  ctx.closePath();
  ctx.fill();
  // 四角小圆点
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
) {
  drawRoundRect(ctx, x, y, w, h, 32);
  ctx.fillStyle = COLOR.card;
  ctx.fill();
  ctx.strokeStyle = COLOR.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "left"
) {
  ctx.textAlign = align;
  const paragraphs = text.split("\n");
  let cursorY = y;
  for (const para of paragraphs) {
    const chars = [...para];
    let line = "";
    const lines: string[] = [];
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (const ln of lines) {
      const drawX = align === "center" ? x : align === "right" ? x : x;
      ctx.fillText(ln, drawX, cursorY);
      cursorY += lineHeight;
    }
  }
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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
 * 保存到设备。策略：
 * 1. 桌面浏览器 → 直接触发下载
 * 2. 移动端 → 优先 Web Share（含 iOS「存储到照片」）；失败则返回 blob 让 UI 展示图片
 */
export async function saveOrShareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile && nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return { method: "share" as const };
    } catch (e) {
      if ((e as DOMException).name === "AbortError") {
        return { method: "cancelled" as const, blob };
      }
      console.warn("Web Share failed, falling back to inline image:", e);
      return { method: "inline" as const, blob };
    }
  }

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
