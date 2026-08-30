/**
 * 模拟评分引擎 — 基于 flag 计算 0-100 分。
 *
 * 设计原则：
 * 1. 起点 50 分（中性）——即使什么都不做也不会得 0。
 * 2. 「good」flag 按权重加分；「bad」flag 按权重扣分。
 * 3. 创伤反应类的 bad（洗澡、延迟披露、沉默）只扣少量分，配合复盘文本
 *    「这是创伤反应，不是你的错」，避免评分变成道德审判。
 * 4. 系统性错误（签谅解书、放弃复议）扣分较重，因为知识缺口是可弥补的。
 * 5. 最终分数 clamp 到 [0, 100]。
 */

import type { SimScenario } from "./simulation";

/**
 * 每个 flag 的权重。正数 = 好行为加分，负数 = 差行为扣分。
 * 未列出的 flag 视为 0（不影响分数，只影响复盘展示）。
 */
export const FLAG_WEIGHTS: Record<string, number> = {
  // ─── 高价值好行为（+10）
  "immediate-action": 10,      // 72 小时内行动
  "medical-exam": 10,          // 医院取证（最强物证）
  "reported": 10,              // 监控还在时报案
  "asked-receipt-sa": 10,      // 索要受案回执（后续所有渠道的前提）
  "refused-settlement": 10,    // 拒绝私和
  "has-lawyer": 8,             // 委托律师

  // ─── 中等好行为（+5）
  "called-friend": 5,          // 求助他人（日后可作证人）
  "kept-clothes": 5,           // 纸袋封存衣物
  "requested-cctv": 5,         // 主动请警方调取监控
  "linked-samples": 5,         // 请警方调入医院检材
  "sought-review": 5,          // 复议 / 立案监督
  "specific-grounds": 5,       // 复议写具体依据
  "dual-channel": 5,           // 复议 + 立案监督两渠道并行
  "actively-following": 5,     // 主动跟进侦查
  "monitoring-dv": 3,          // 持续跟进
  "prosecutor-supervision": 5, // 申请侦查监督
  "civil-claim-material": 5,   // 附带民事只主张物质损失
  "psych-support": 5,          // 寻求心理支持
  "reported-late-sa": 5,       // 晚报案（依然被受理）
  "attended-trial": 3,         // 出庭
  "medical-certificate-only": 3, // 只开证明书（弱于取证但强于无记录）

  // ─── 系统性错误 / 高代价（-10）
  "private-settlement": -15,   // 签了谅解书（最大陷阱）
  "gave-up-sa": -10,           // 未申请复议（错过 7 日窗口）
  "no-exam": -8,               // 未做取证检查
  "destroyed-traces": -8,      // 衣物被清洗 / 丢弃
  "no-record": -8,             // 医院无就诊记录
  "confronted": -8,            // 警方介入前联系嫌疑人
  "alerted-him": -5,           // 打草惊蛇
  "took-money-only": -8,       // 收钱但未签字（灰色）
  "civil-claim-emotional": -3, // 附带民事主张精神抚慰金（几乎必被驳）

  // ─── 创伤反应类（-2 或 -3）— 语气：不指责但如实反映证据代价
  "washed": -3,                // 洗澡
  "delayed-night": -2,         // 当晚未行动
  "long-delay": -3,            // 长期沉默
  "silence": -2,               // 尚未决定
};

const BASE_SCORE = 50;

export interface SimulationScoreResult {
  /** 0-100 的最终分数。 */
  score: number;
  /** 触发的 good flag 数量。 */
  goodCount: number;
  /** 触发的 bad flag 数量。 */
  badCount: number;
  /** 按贡献排序的详细项（用于展示）。 */
  breakdown: Array<{ flag: string; delta: number; kind: "good" | "bad" }>;
  /** 分数等级：high / medium / low。 */
  band: "high" | "medium" | "low";
  /** 用于结果卡片的简短标签。 */
  label: { en: string; zh: string };
}

export function computeSimulationScore(flags: Set<string>): SimulationScoreResult {
  const breakdown: SimulationScoreResult["breakdown"] = [];
  let delta = 0;
  let goodCount = 0;
  let badCount = 0;

  for (const flag of flags) {
    const weight = FLAG_WEIGHTS[flag];
    if (weight == null) continue;
    delta += weight;
    if (weight > 0) {
      goodCount++;
      breakdown.push({ flag, delta: weight, kind: "good" });
    } else if (weight < 0) {
      badCount++;
      breakdown.push({ flag, delta: weight, kind: "bad" });
    }
  }

  breakdown.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const raw = BASE_SCORE + delta;
  const score = Math.max(0, Math.min(100, raw));

  let band: SimulationScoreResult["band"];
  let label: SimulationScoreResult["label"];
  if (score >= 75) {
    band = "high";
    label = {
      en: "Well-prepared — you covered the essentials",
      zh: "准备充分——你抓住了关键步骤",
    };
  } else if (score >= 45) {
    band = "medium";
    label = {
      en: "Partially prepared — key gaps remain",
      zh: "部分准备——仍有关键缺口",
    };
  } else {
    band = "low";
    label = {
      en: "Room to prepare — the knowledge gaps are common, not personal",
      zh: "有很多可以准备的——这些缺口很常见，不是你个人的问题",
    };
  }

  return { score, goodCount, badCount, breakdown, band, label };
}

/**
 * 收集本次流程中经过的所有 coach 提示 —— 用于结束时展示「你走过的路上的法律 tips」。
 * 由 SimulationPage 通过记录访问过的 sceneId 传入。
 */
export function collectCoachHints(
  scenario: SimScenario,
  visitedSceneIds: string[]
): Array<{ sceneId: string; text: { en: string; zh: string } }> {
  const hints: Array<{ sceneId: string; text: { en: string; zh: string } }> = [];
  const seen = new Set<string>();
  for (const sid of visitedSceneIds) {
    if (seen.has(sid)) continue;
    seen.add(sid);
    const scene = scenario.scenes[sid];
    if (scene?.coach) {
      hints.push({ sceneId: sid, text: scene.coach });
    }
  }
  return hints;
}
