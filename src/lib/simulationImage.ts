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
  variant?: "default" | "domestic-report";
  summary?: DomesticScoreCardSummary;
}

export interface DomesticScoreCardSummary {
  scoreTitle: string;
  shareHint: string;
  correctTitle: string;
  correctItems: KnowledgeCardItem[];
  educationTitle: string;
  educationItems: KnowledgeCardItem[];
  qrLabel: string;
  correctCount?: number;
  sceneTipTitle?: string;
  sceneTip?: string;
}

export interface KnowledgeCardItem {
  title: string;
  detail?: string;
}

// 深紫渐变主色
const COLOR = {
  bg1: "#15142f",
  bg2: "#09091d",
  card: "rgba(35, 32, 70, 0.58)",
  cardBorder: "rgba(180, 174, 232, 0.16)",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.65)",
  textDim: "rgba(255, 255, 255, 0.45)",
  brandPurple: "#c084fc",
  brandPink: "#f472b6",
  brandGold: "#fbbf24",
  emerald: "#86dfa0",
  amber: "#f2d08a",
  rose: "#eb7186",
} as const;

const SCORE_BAND_COLOR: Record<SimulationScoreResult["band"], string> = {
  excellent: "#86dfa0",
  good: "#e29bde",
  partial: "#e9bd66",
  weak: "#f47b91",
};

const FONT_ZH = "'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
const FONT_LATIN = "'Helvetica Neue', 'Inter', sans-serif";

export async function renderScoreCard(opts: RenderOpts): Promise<Blob> {
  if (opts.variant === "domestic-report") {
    return renderDomesticResultCard(opts);
  }

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
  await drawBrandHeader(ctx, lang);

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

/** Unified score/report card used by all three scenarios. */
async function renderDomesticResultCard(opts: RenderOpts): Promise<Blob> {
  const summary = opts.summary;
  const cardHeight = 1020;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = cardHeight;
  const ctx = canvas.getContext("2d")!;
  const lang = opts.language;

  const bg = ctx.createLinearGradient(0, 0, 0, cardHeight);
  bg.addColorStop(0, COLOR.bg1);
  bg.addColorStop(1, COLOR.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, cardHeight);
  drawBackgroundAtmosphere(ctx, cardHeight);

  await drawBrandHeader(ctx, lang);

  const scoreY = 175;
  const contentY = scoreY + 28;
  const scoreX = 106;
  drawGlassCard(ctx, 60, scoreY, W - 120, 800);
  drawStar(ctx, 104, contentY + 47, 11, COLOR.brandPink);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.text;
  ctx.font = `bold 29px ${FONT_ZH}`;
  ctx.fillText(summary?.scoreTitle ?? (lang === "zh" ? "安全应对 · 知识储备得分" : "Safety response · Knowledge score"), 134, contentY + 31);
  ctx.fillStyle = COLOR.textMuted;
  ctx.font = `500 20px ${FONT_ZH}`;
  ctx.fillText(summary?.shareHint ?? (lang === "zh" ? "长按保存图片 · 希望这些知识永远不必用上" : "Long-press to save · May you never need this knowledge"), 134, contentY + 73);

  const bandColor = bandColorFor(opts.score.band);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = bandColor;
  ctx.font = `900 156px ${FONT_LATIN}`;
  ctx.shadowColor = bandColor;
  ctx.shadowBlur = 16;
  const scoreText = String(opts.score.score);
  const digitGap = scoreText.length === 2 ? -12 : 0;
  let scoreWidth = 0;
  for (const digit of scoreText) {
    ctx.fillText(digit, scoreX + scoreWidth, contentY + 286);
    scoreWidth += ctx.measureText(digit).width + digitGap;
  }
  scoreWidth -= digitGap;
  ctx.shadowBlur = 0;
  if (opts.score.score !== 100) {
    ctx.fillStyle = COLOR.textMuted;
    ctx.font = `600 38px ${FONT_LATIN}`;
    ctx.fillText("/ 100", scoreX + scoreWidth - 5, contentY + 286);
  }

  const bandLabel = lang === "zh" ? opts.score.label.zh : opts.score.label.en;
  ctx.font = `bold 28px ${FONT_ZH}`;
  const pillWidth = Math.min(360, ctx.measureText(bandLabel).width + 64);
  drawRoundRect(ctx, scoreX, contentY + 322, pillWidth, 58, 29);
  ctx.strokeStyle = bandColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = bandColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bandLabel, scoreX + pillWidth / 2, contentY + 351);

  await drawDomesticBandCircle(ctx, opts, 620, contentY + 365, 172);
  drawDomesticBandLegend(ctx, opts, 880, contentY + 150, 102);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.textMuted;
  ctx.font = `500 19px ${FONT_ZH}`;
  drawWrappedText(
    ctx,
    lang === "zh" ? opts.score.detail.zh : opts.score.detail.en,
    scoreX,
    contentY + 455,
    280,
    28,
    3
  );

  drawCompactSummary(ctx, lang, summary, 92, 805, W - 184);
  return canvasToBlob(canvas);
}

function drawCompactSummary(
  ctx: CanvasRenderingContext2D,
  lang: "en" | "zh",
  summary: DomesticScoreCardSummary | undefined,
  x: number,
  y: number,
  width: number
) {
  const tip = summary?.educationItems[0];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `bold 22px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.brandPink;
  ctx.fillText(`ⓘ  ${summary?.sceneTipTitle ?? (lang === "zh" ? "场景科普小tip" : "Scenario tip")}`, x + 32, y + 18);
  ctx.fillStyle = COLOR.textMuted;
  ctx.font = `500 17px ${FONT_ZH}`;
  const tipText = normalizeTipText(summary?.sceneTip ?? tip?.detail ?? tip?.title ?? "");
  drawWrappedText(ctx, tipText, x + 32, y + 58, width - 64, 23, 3);
}

function normalizeTipText(text: string): string {
  return text.replace(/\s*\n\s*/g, "").trim();
}

async function drawDomesticBandCircle(
  ctx: CanvasRenderingContext2D,
  opts: RenderOpts,
  cx: number,
  cy: number,
  radius: number
) {
  const bandColor = bandColorFor(opts.score.band);
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.16, cx, cy, radius * 1.18);
  halo.addColorStop(0, "rgba(226,155,222,0.08)");
  halo.addColorStop(0.72, "rgba(31,28,65,0.05)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.setLineDash([2, 10]);
  ctx.strokeStyle = bandColor;
  ctx.globalAlpha = 0.46;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(74,70,112,0.58)";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const start = -Math.PI / 2;
  const end = start + (opts.score.score / 100) * Math.PI * 2;
  ctx.strokeStyle = bandColor;
  ctx.lineWidth = 24;
  ctx.shadowColor = bandColor;
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const endX = cx + Math.cos(end) * radius;
  const endY = cy + Math.sin(end) * radius;
  ctx.fillStyle = bandColor;
  ctx.shadowColor = bandColor;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(endX, endY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const logo = await loadImage("/the-unmuted-mark.png");
  drawVisibleLogoCentered(ctx, logo, cx, cy, radius * 1.42);
}

function drawDomesticBandLegend(
  ctx: CanvasRenderingContext2D,
  opts: RenderOpts,
  x: number,
  y: number,
  rowHeight: number
) {
  const bands: Array<{
    band: SimulationScoreResult["band"];
    range: string;
    zh: string;
    en: string;
  }> = [
    { band: "excellent", range: "80–100", zh: "准备充分", en: "Well-prepared" },
    { band: "good", range: "60–79", zh: "基本准备", en: "Basic preparation" },
    { band: "partial", range: "40–59", zh: "部分准备", en: "Partial preparation" },
    { band: "weak", range: "0–39", zh: "需要加强", en: "Needs strengthening" },
  ];

  for (let index = 0; index < bands.length; index++) {
    const band = bands[index];
    const rowY = y + index * rowHeight;
    const color = bandColorFor(band.band);
    const active = band.band === opts.score.band;
    ctx.globalAlpha = active ? 1 : 0.62;
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, rowY);
    ctx.lineTo(x - 18, rowY + 72);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${active ? "bold" : "600"} 24px ${FONT_LATIN}`;
    ctx.fillText(band.range, x, rowY);
    ctx.font = `${active ? "bold" : "600"} 21px ${FONT_ZH}`;
    drawWrappedText(ctx, opts.language === "zh" ? band.zh : band.en, x, rowY + 34, 150, 28, 2);
  }
  ctx.globalAlpha = 1;
}

function drawKnowledgeListCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: string,
  icon: string,
  title: string,
  items: KnowledgeCardItem[],
  showDetail = false,
  detailLines = 3
) {
  drawGlassCard(ctx, x, y, width, height);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 50, y + 50, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 24px ${FONT_LATIN}`;
  ctx.fillText(icon, x + 50, y + 51);

  ctx.fillStyle = COLOR.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `bold 26px ${FONT_ZH}`;
  drawWrappedText(ctx, title, x + 84, y + 30, width - 116, 32, 2);

  const rowHeight = showDetail ? 108 : 98;
  for (let index = 0; index < Math.min(items.length, 3); index++) {
    const rowY = y + 108 + index * rowHeight;
    if (index > 0) {
      ctx.strokeStyle = COLOR.cardBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 32, rowY - 8);
      ctx.lineTo(x + width - 32, rowY - 8);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.arc(x + 54, rowY + 18, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 16px ${FONT_LATIN}`;
    ctx.fillText(String(index + 1), x + 54, rowY + 19);

    ctx.fillStyle = COLOR.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `600 19px ${FONT_ZH}`;
    drawWrappedText(ctx, items[index].title, x + 88, rowY + 1, width - 116, 25, showDetail ? 1 : 2);
    if (showDetail && items[index].detail) {
      ctx.fillStyle = COLOR.textMuted;
      ctx.font = `500 16px ${FONT_ZH}`;
      drawWrappedText(ctx, items[index].detail!, x + 88, rowY + 30, width - 116, 20, detailLines);
    }
  }
}

async function drawP2Footer(
  ctx: CanvasRenderingContext2D,
  lang: "en" | "zh",
  label: string,
  x: number,
  y: number
) {
  const size = 123;
  const qrDataUrl = await QRCode.toDataURL(BETA_URL, {
    width: size * 2,
    margin: 1,
    color: { dark: "#1a0d2e", light: "#ffffff" },
  });
  const qr = await loadImage(qrDataUrl);
  drawRoundRect(ctx, x, y, size, size, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(qr, x + 6, y + 6, size - 12, size - 12);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `bold 24px ${FONT_ZH}`;
  ctx.fillText(lang === "zh" ? "你不是一个人" : "You are not alone", 76, y + 18);
  ctx.fillStyle = COLOR.textDim;
  ctx.font = `500 18px ${FONT_ZH}`;
  ctx.fillText(lang === "zh" ? "非默 · 安全记录 守护发声" : "The Unmuted · Safety, evidence, voice", 76, y + 58);

  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.text;
  ctx.font = `bold 19px ${FONT_ZH}`;
  if (lang === "zh") {
    ctx.fillText("扫码体验", x - 18, y + 30);
    ctx.fillStyle = COLOR.brandPink;
    ctx.fillText("非默内测版", x - 18, y + 62);
  } else {
    drawWrappedText(ctx, label, x - 18, y + 31, 160, 26, 2);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.font = `600 17px ${FONT_LATIN}`;
  ctx.fillText("THE UNMUTED · 非默", W / 2, 1562);
}

// ─── 1. 品牌头 ─────────────────────────────────
async function drawBrandHeader(ctx: CanvasRenderingContext2D, lang: "en" | "zh") {
  // 左侧：使用正式品牌标记，并按可见像素居中。
  const iconCx = 100;
  const iconCy = 110;
  const brandLogo = await loadImage("/the-unmuted-mark.png");
  drawVisibleLogoCentered(ctx, brandLogo, iconCx, iconCy, 68);

  // 品牌名 非默 THE UNMUTED
  ctx.fillStyle = COLOR.text;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `bold 48px ${FONT_ZH}`;
  ctx.fillText("非默", 155, 84);
  ctx.font = `500 22px ${FONT_LATIN}`;
  ctx.fillStyle = COLOR.textMuted;
  ctx.letterSpacing = "0.15em";
  ctx.fillText("THE UNMUTED", 155, 140);

  // 右上角：内测体验二维码。
  const size = 96;
  const qrX = W - 60 - size;
  const qrY = 42;
  const qrDataUrl = await QRCode.toDataURL(BETA_URL, {
    width: size * 2,
    margin: 1,
    color: { dark: "#1a0d2e", light: "#ffffff" },
  });
  const qr = await loadImage(qrDataUrl);
  drawRoundRect(ctx, qrX, qrY, size, size, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(qr, qrX + 5, qrY + 5, size - 10, size - 10);
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLOR.textMuted;
  ctx.font = `600 17px ${FONT_ZH}`;
  ctx.fillText(lang === "zh" ? "扫码体验" : "Scan to try", qrX - 18, qrY + 27);
  ctx.fillStyle = COLOR.brandPurple;
  ctx.fillText(lang === "zh" ? "非默内测版" : "The Unmuted beta", qrX - 18, qrY + 57);
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

  // 左右两栏布局：文字 60%，胶囊标签 40%
  const badgeColW = 160;
  const textColW = cardW - badgeColW - 64;
  const textX = cardX + 32;

  // "本次情景" 小标签
  ctx.font = `600 20px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textDim;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(lang === "zh" ? "本次情景" : "This scenario", textX, cardY + 40);

  // 情景标题
  ctx.font = `bold 34px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.text;
  wrapText(ctx, opts.scenarioTitle, textX, cardY + 82, textColW, 44, "left");

  // 情景简述
  ctx.font = `500 20px ${FONT_ZH}`;
  ctx.fillStyle = COLOR.textMuted;
  wrapText(ctx, opts.scenarioTagline, textX, cardY + 190, textColW, 30, "left");

  // 右侧竖排 4 个胶囊标签
  const badges = lang === "zh"
    ? ["人身安全", "识别风险", "寻求帮助", "证据保存"]
    : ["Safety", "Risk", "Help", "Evidence"];
  const badgeX = cardX + cardW - badgeColW - 4;
  const badgeH = 44;
  const badgeGap = 16;
  const totalBadgeH = badges.length * badgeH + (badges.length - 1) * badgeGap;
  const badgeStartY = cardY + (cardH - totalBadgeH) / 2;
  ctx.font = `600 20px ${FONT_ZH}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let i = 0; i < badges.length; i++) {
    const by = badgeStartY + i * (badgeH + badgeGap);
    drawRoundRect(ctx, badgeX, by, badgeColW, badgeH, 22);
    ctx.strokeStyle = "rgba(192, 132, 252, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COLOR.textMuted;
    ctx.fillText(badges[i], badgeX + badgeColW / 2, by + badgeH / 2);
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
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

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    let normalizedParagraph = paragraph.replace(
      /(\d)\s+(小时|分钟|天|日|个月|月|年|元|万元)/g,
      "$1$2"
    );
    const containsChinese = /[\u3400-\u9fff]/.test(normalizedParagraph);
    if (containsChinese) normalizedParagraph = normalizedParagraph.replace(/\s+/g, "");
    const wordBased = !containsChinese && normalizedParagraph.includes(" ");
    const units = wordBased ? normalizedParagraph.split(/\s+/) : [...normalizedParagraph];
    const separator = wordBased ? " " : "";
    let line = "";

    for (const unit of units) {
      const candidate = line ? `${line}${separator}${unit}` : unit;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = unit;
      }
    }
    if (line) lines.push(line);
  }

  rebalanceChineseLineBreaks(lines);

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length > 0) {
    let last = visible[visible.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    visible[visible.length - 1] = `${last}…`;
  }

  for (let index = 0; index < visible.length; index++) {
    ctx.fillText(visible[index], x, y + index * lineHeight);
  }
}

function rebalanceChineseLineBreaks(lines: string[]) {
  const forbiddenLineStart = /^[，。！？；：、）】》”’…]/;
  const protectedPairs = new Set([
    "一些", "这个", "这些", "可以", "以及", "如果", "但是", "还有", "需要", "没有", "已经", "因为", "所以",
    "小时", "分钟", "个月", "万元",
  ]);

  for (let index = 1; index < lines.length; index++) {
    while (forbiddenLineStart.test(lines[index])) {
      lines[index - 1] += lines[index][0];
      lines[index] = lines[index].slice(1);
    }
    const previous = lines[index - 1];
    const current = lines[index];
    const trailingNumber = previous.match(/\d+$/)?.[0];
    if (trailingNumber && /^(小时|分钟|天|日|个月|月|年|元|万元)/.test(current)) {
      lines[index - 1] = previous.slice(0, -trailingNumber.length);
      lines[index] = trailingNumber + current;
      continue;
    }
    if (previous && current && protectedPairs.has(previous.slice(-1) + current[0])) {
      lines[index - 1] = previous.slice(0, -1);
      lines[index] = previous.slice(-1) + current;
    }
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png", 0.95);
  });
}

function bandColorFor(band: SimulationScoreResult["band"]): string {
  return SCORE_BAND_COLOR[band];
}

function drawBackgroundAtmosphere(ctx: CanvasRenderingContext2D, height: number) {
  const topGlow = ctx.createRadialGradient(W * 0.7, 120, 10, W * 0.7, 120, 620);
  topGlow.addColorStop(0, "rgba(151,107,255,0.13)");
  topGlow.addColorStop(0.55, "rgba(113,76,202,0.055)");
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, height);

  const sideGlow = ctx.createRadialGradient(90, height * 0.66, 10, 90, height * 0.66, 500);
  sideGlow.addColorStop(0, "rgba(244,114,182,0.075)");
  sideGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sideGlow;
  ctx.fillRect(0, 0, W, height);

  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = "#ffffff";
  let seed = 1947;
  for (let index = 0; index < 720; index++) {
    seed = (seed * 16807) % 2147483647;
    const x = (seed / 2147483647) * W;
    seed = (seed * 16807) % 2147483647;
    const y = (seed / 2147483647) * height;
    ctx.fillRect(x, y, 0.8, 0.8);
  }
  ctx.restore();
}

function drawVisibleLogoCentered(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cx: number,
  cy: number,
  targetSize: number
) {
  const sample = document.createElement("canvas");
  sample.width = image.naturalWidth || image.width;
  sample.height = image.naturalHeight || image.height;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true })!;
  sampleCtx.drawImage(image, 0, 0);
  const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
  let minX = sample.width;
  let minY = sample.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < sample.height; y += 2) {
    for (let x = 0; x < sample.width; x += 2) {
      const alpha = pixels[(y * sample.width + x) * 4 + 3];
      if (alpha < 32) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX > maxX || minY > maxY) return;
  const sourceWidth = maxX - minX + 1;
  const sourceHeight = maxY - minY + 1;
  const scale = targetSize / Math.max(sourceWidth, sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(
    image,
    minX,
    minY,
    sourceWidth,
    sourceHeight,
    cx - drawWidth / 2,
    cy - drawHeight / 2,
    drawWidth,
    drawHeight
  );
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
  ctx.save();
  ctx.shadowColor = "rgba(3, 2, 18, 0.4)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  drawRoundRect(ctx, x, y, w, h, 32);
  const fill = ctx.createLinearGradient(x, y, x + w, y + h);
  fill.addColorStop(0, "rgba(42, 39, 81, 0.72)");
  fill.addColorStop(0.55, COLOR.card);
  fill.addColorStop(1, "rgba(19, 18, 46, 0.72)");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = COLOR.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 34, y + 1);
  ctx.lineTo(x + w - 34, y + 1);
  ctx.stroke();
  ctx.restore();
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
