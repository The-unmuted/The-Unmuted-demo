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

  // ─── 性骚扰情景（sexual-harassment.json）新增 flag ───
  // 高价值好行为
  "saved-records": 10,             // 保存证据（截图+备份）
  "complete-records": 8,           // 完整聊天记录导出
  "clear-refusal": 8,              // 明确书面拒绝
  "reported-police": 10,           // 报警
  "got-receipt": 10,               // 索要《受案回执》
  "formal-complaint": 8,           // 单位书面投诉
  "witnesses-willing": 8,          // 找到愿出庭的同事
  "signed-carefully": 5,           // 逐页核对笔录
  "submitted-evidence": 8,         // 主动提交证据给警方
  "applied-review": 5,             // 申请复议
  "hired-lawyer": 5,               // 委托律师
  "legal-aid": 5,                  // 使用法律援助
  "sought-support": 3,             // 拨打 12338
  "reported-quickly": 5,           // 尽快报警
  // 中等好行为
  "colleague-knows": 5,            // 事发时告诉同事
  "contemporaneous-note": 5,       // 事发时同期记录
  "escaped": 3,                    // 立即离开现场
  "told-someone-immediately": 5,   // 事发后立即告诉信任的人
  // 差行为 / 系统性错误
  "deleted-records": -8,           // 删除聊天记录
  "blocked-contact": -3,           // 拉黑（未备份即删除）
  "no-record": -5,                 // 事发当时没记录（覆盖性侵版本同名 flag —— 数值差异不大）
  "hr-notified-informal": -5,      // 只找 HR 口头谈
  "solo-documentation": -2,        // 只自己记录（缺乏外部记录）
  "confronted-alone": -8,          // 报警前私下对质
  "reputation-attack": -3,         // 因私下对质引发的名誉攻击（后果 flag）
  // 中途停手（记录已存在，但未走完）
  "stopped-at-admin": -3,          // 止步于行政处罚
  "stopped-at-warning": -3,        // 止步于《保证书》
  "stopped-after-review": -3,      // 复议后停手
  "did-not-sue": -2,               // 未提民事诉讼
  "pro-se": -3,                    // 自我代理（技术风险）
  "moved-out": -3,                 // 只搬家不报警
  "let-go": -2,                    // 选择放下
  // 创伤反应类（低扣分 —— 复盘文本明确说「不是你的错」）
  "frozen": -2,                    // 僵住
  "forced-normalcy": -2,           // 强作镇定

  // ─── 家暴情景（domestic-violence.json）─────────
  // 高价值好行为
  "reached-safety": 8,             // 先脱险
  "called-120": 5,                 // 拨打 120（独立官方记录）
  "neighbor-witness": 5,           // 邻居成为证人
  "stayed-safe": 5,                // 当晚在安全地方
  "used-shelter-system": 5,        // 使用庇护系统
  "friend-notified": 5,            // 事发时通知信任的人
  "building-record": 8,            // 持续留证
  "audio-recorded": 5,             // 事发中录音
  "multi-reports": 8,              // 反复报警
  "digital-evidence": 5,           // 保留数字骚扰证据
  "applied-po": 10,                // 申请保护令
  "parallel-tracks": 8,            // 并行多路径
  "full-claims": 10,               // 离婚案中一并主张全部赔偿
  "forensic-exam": 5,              // 法医鉴定
  "report-filed": 5,               // 正式报案笔录
  // 差行为 / 系统性错误
  "fought-back": -8,               // 还手（真实法律风险）
  "no-report-emergency": -5,       // 紧急时未报警
  "no-formal-report": -5,          // 未正式报案
  "scene-altered": -5,             // 求助前改动现场
  "stayed-home-unsafe": -3,        // 留在家（有时不可避免）
  "no-hospital": -5,               // 没留下就医记录
  "enduring": -5,                  // 继续忍
  "family-mediation": -3,          // 找加害者家属调解
  "evading": -3,                   // 试图躲避
  "split-claims": -10,             // 离婚案中未一并主张（真实陷阱）
  "gave-up-po": -3,                // 未再申请保护令
  "late-application": -2,          // 证据有限时申请
  "still-documenting": -2,         // 只留证不申请
  "no-action": -3,                 // 不采取行动
  "waiting": -2,                   // 选择等一等
};

const BASE_SCORE = 40;

export type ScoreBand = "excellent" | "good" | "partial" | "weak";

export interface SimulationScoreResult {
  /** 0-100 的最终分数。 */
  score: number;
  /** 触发的 good flag 数量。 */
  goodCount: number;
  /** 触发的 bad flag 数量。 */
  badCount: number;
  /** 按贡献排序的详细项（用于展示）。 */
  breakdown: Array<{ flag: string; delta: number; kind: "good" | "bad" }>;
  /** 分数等级：4 档。 */
  band: ScoreBand;
  /** 用于结果卡片的简短标签（档位中文名，如「部分准备」）。 */
  label: { en: string; zh: string };
  /** 主副标题（结果页顶部大字），比 label 更鼓励。 */
  headline: { en: string; zh: string };
  /** 分数下方的一句话说明。 */
  detail: { en: string; zh: string };
}

const BANDS: Record<
  ScoreBand,
  { min: number; label: { en: string; zh: string }; headline: { en: string; zh: string }; detail: { en: string; zh: string } }
> = {
  excellent: {
    min: 80,
    label: { en: "Well-prepared", zh: "准备充分" },
    headline: {
      en: "You covered the essentials.",
      zh: "你已经掌握了关键步骤。",
    },
    detail: {
      en: "Your choices show a solid grasp of what to do — this preparation could save a friend or yourself.",
      zh: "你的选择显示出对关键步骤的清晰把握——这份准备可能会保护你自己或朋友。",
    },
  },
  good: {
    min: 60,
    label: { en: "Basic preparation", zh: "基本准备" },
    headline: {
      en: "You've built a solid base.",
      zh: "你已经打下了基础。",
    },
    detail: {
      en: "You caught the essentials but missed some details that could make a difference in the moment.",
      zh: "关键的你抓住了，但还有一些细节可能在真正的时刻起作用。",
    },
  },
  partial: {
    min: 40,
    label: { en: "Partial preparation", zh: "部分准备" },
    headline: {
      en: "You've taken important first steps.",
      zh: "你已经迈出了重要的一步。",
    },
    detail: {
      en: "You've made some right choices but there are still areas to strengthen.",
      zh: "你已经做出了一些关键选择，但仍有可以加强的地方。",
    },
  },
  weak: {
    min: 0,
    label: { en: "Needs strengthening", zh: "需要加强" },
    headline: {
      en: "Knowing what to do makes all the difference.",
      zh: "知道该怎么做，会带来完全不同的结果。",
    },
    detail: {
      en: "These gaps are common — nobody teaches this. Reading through the debrief below is a real step forward.",
      zh: "这些缺口很常见——没有人教过我们这些。看完下方复盘，就是真正的一步。"
    },
  },
};

/**
 * 每个 flag 的人话短描述（用于结果卡片 "做对了/可以做更好" 的列表）。
 * 保持每条 ≤ 24 个汉字，便于卡片排版。
 */
export const FLAG_SHORT_LABELS: Record<string, { en: string; zh: string }> = {
  // good
  "immediate-action": { en: "Acted within the 72-hour evidence window", zh: "在 72 小时证据窗口内行动" },
  "called-friend": { en: "Reached out to someone you trust", zh: "向信任的人求助陪同" },
  "kept-clothes": { en: "Preserved clothing in a paper bag", zh: "用纸袋保存了衣物" },
  "medical-exam": { en: "Completed the forensic examination", zh: "完成了医院取证检查" },
  "medical-certificate-only": { en: "Obtained a medical certificate", zh: "取得了《疾病证明书》" },
  "reported": { en: "Reported while CCTV still existed", zh: "在监控还在时报案" },
  "asked-receipt-sa": { en: "Obtained the Case Receipt", zh: "索要并保留了《受案回执》" },
  "requested-cctv": { en: "Requested police to retrieve CCTV", zh: "请警方调取监控" },
  "linked-samples": { en: "Linked sealed samples to the case file", zh: "请警方调入医院封存检材" },
  "sought-review": { en: "Challenged the non-filing decision", zh: "对不予立案提出复议" },
  "specific-grounds": { en: "Cited specific grounds in reconsideration", zh: "复议写明具体依据" },
  "dual-channel": { en: "Used both review channels", zh: "同时走复议和立案监督" },
  "actively-following": { en: "Actively followed the investigation", zh: "主动跟进侦查进展" },
  "monitoring-dv": { en: "Kept the case visible with regular check-ins", zh: "定期跟进案件" },
  "prosecutor-supervision": { en: "Applied for investigation supervision", zh: "申请检察院侦查监督" },
  "refused-settlement": { en: "Refused the settlement offer", zh: "拒绝了私和" },
  "has-lawyer": { en: "Appointed a lawyer as representative", zh: "委托律师作为代理人" },
  "attended-trial": { en: "Attended the trial", zh: "出席了庭审" },
  "civil-claim-material": { en: "Claimed material losses in the case", zh: "附带民事主张物质损失" },
  "psych-support": { en: "Sought psychological support", zh: "拨打 12338 寻求心理支持" },
  "reported-late-sa": { en: "Filed a late report — still valid", zh: "选择晚报案（依然有效）" },
  // bad
  "washed": { en: "Showered before evidence could be collected", zh: "在取证前洗澡（本能反应）" },
  "destroyed-traces": { en: "Clothing was washed/discarded", zh: "衣物被清洗或丢弃" },
  "no-exam": { en: "Skipped the forensic examination", zh: "未做取证检查" },
  "no-record": { en: "No medical record was created", zh: "医院无就诊记录" },
  "delayed-night": { en: "The night passed without action", zh: "当晚未采取行动" },
  "confronted": { en: "Contacted the suspect before police did", zh: "警方介入前联系了嫌疑人" },
  "alerted-him": { en: "Suspect was aware you might act", zh: "打草惊蛇" },
  "private-settlement": { en: "Signed a forgiveness letter", zh: "签下了谅解书" },
  "took-money-only": { en: "Accepted money without signing", zh: "只收下钱未签字" },
  "long-delay": { en: "Time passed before you could speak", zh: "开口前时间已过去" },
  "silence": { en: "Have not yet decided", zh: "尚未采取行动" },
  "gave-up-sa": { en: "Missed the reconsideration window", zh: "错过 7 日复议窗口" },
  "civil-claim-emotional": { en: "Claimed emotional damages in the case", zh: "附带民事主张精神抚慰金（常被驳回）" },

  // ─── 性骚扰情景（sexual-harassment.json）───
  // good
  "saved-records": { en: "Preserved evidence with screenshots", zh: "保存了证据（截图+备份）" },
  "complete-records": { en: "Exported complete chat history", zh: "导出完整聊天记录" },
  "clear-refusal": { en: "Made refusal explicit in writing", zh: "书面明确拒绝" },
  "reported-police": { en: "Filed a police report", zh: "去派出所报案" },
  "reported-quickly": { en: "Reported within days of the incident", zh: "事发几天内就报了案" },
  "got-receipt": { en: "Obtained the Case Receipt", zh: "取得了《受案回执》" },
  "formal-complaint": { en: "Submitted written complaint to employer", zh: "向单位提交书面投诉" },
  "witnesses-willing": { en: "Found colleagues willing to testify", zh: "找到愿出庭作证的同事" },
  "signed-carefully": { en: "Reviewed and corrected the transcript", zh: "逐页核对笔录后签字" },
  "submitted-evidence": { en: "Proactively provided evidence to police", zh: "主动向警方提交证据" },
  "applied-review": { en: "Applied for reconsideration", zh: "申请了复议" },
  "hired-lawyer": { en: "Hired a lawyer for the civil case", zh: "为民事诉讼委托律师" },
  "legal-aid": { en: "Used legal aid (free lawyer)", zh: "使用了法律援助（免费律师）" },
  "sought-support": { en: "Called 12338 for support", zh: "拨打 12338 寻求支持" },
  "colleague-knows": { en: "A colleague learned in real time", zh: "第一时间告知了同事" },
  "contemporaneous-note": { en: "Documented details immediately", zh: "事发当时记录了细节" },
  "escaped": { en: "Got out of the space safely", zh: "安全离开了现场" },
  "told-someone-immediately": { en: "Told a trusted person right away", zh: "事后立即告诉信任的人" },
  // bad
  "deleted-records": { en: "Deleted the chat records", zh: "删除了聊天记录" },
  "blocked-contact": { en: "Blocked before backing up records", zh: "备份前就拉黑了" },
  "hr-notified-informal": { en: "HR notified only verbally, no paper trail", zh: "只找 HR 口头谈，没留下书面记录" },
  "solo-documentation": { en: "Only self-documented, no external record", zh: "仅自己记录，没有外部记录" },
  "confronted-alone": { en: "Confronted the perpetrator alone first", zh: "报警前先私下对质" },
  "reputation-attack": { en: "Faced counter-narrative from acquaintances", zh: "遭到来自熟人的反向说辞攻击" },
  "stopped-at-admin": { en: "Stopped at administrative penalty", zh: "止步于行政处罚，未提民事" },
  "stopped-at-warning": { en: "Stopped after just the Assurance", zh: "止步于《保证书》，未提民事" },
  "stopped-after-review": { en: "Stopped after exhausting admin remedies", zh: "复议后停手，未提民事" },
  "did-not-sue": { en: "Chose not to file civil lawsuit", zh: "选择不提民事诉讼" },
  "pro-se": { en: "Self-represented in civil case", zh: "民事诉讼自我代理" },
  "moved-out": { en: "Moved out without reporting", zh: "只搬家，没报警" },
  "let-go": { en: "Chose to let it go", zh: "选择放下这件事" },
  "frozen": { en: "Froze in the moment — normal trauma response", zh: "当下僵住——正常创伤反应" },
  "forced-normalcy": { en: "Forced a normal appearance to escape", zh: "强作镇定以便脱身" },

  // ─── 家暴情景（domestic-violence.json）─────────
  "reached-safety": { en: "Reached a safe location", zh: "先到达了安全的地方" },
  "called-120": { en: "Also called emergency medical", zh: "同时拨打了 120" },
  "neighbor-witness": { en: "A neighbor became a witness", zh: "邻居成为证人" },
  "stayed-safe": { en: "Stayed somewhere safe that night", zh: "当晚在安全的地方过夜" },
  "used-shelter-system": { en: "Used the emergency shelter system", zh: "使用了紧急庇护系统" },
  "friend-notified": { en: "Notified a trusted person in real time", zh: "第一时间告知了信任的人" },
  "building-record": { en: "Built an ongoing record", zh: "在持续留证" },
  "audio-recorded": { en: "Recorded audio during the incident", zh: "事发中录了音" },
  "multi-reports": { en: "Reported repeatedly", zh: "反复报警" },
  "digital-evidence": { en: "Preserved digital harassment evidence", zh: "保留了数字骚扰证据" },
  "applied-po": { en: "Applied for a Protection Order", zh: "申请了人身安全保护令" },
  "parallel-tracks": { en: "Ran multiple legal tracks in parallel", zh: "并行推进多条法律路径" },
  "full-claims": { en: "Claimed all damages in the divorce case", zh: "离婚案中一并主张全部损害" },
  "forensic-exam": { en: "Had a legal-medical forensic exam", zh: "做了法医鉴定" },
  "report-filed": { en: "Filed a formal police statement", zh: "做完正式询问笔录" },
  "fought-back": { en: "Fought back — real legal risk", zh: "还手——存在真实法律风险" },
  "no-report-emergency": { en: "Did not report during the emergency", zh: "紧急事件未报警" },
  "no-formal-report": { en: "Police left without a formal report", zh: "警察离开时未正式报案" },
  "scene-altered": { en: "Scene altered before help arrived", zh: "求助前场景被改动" },
  "stayed-home-unsafe": { en: "Stayed home in the aftermath", zh: "事发后留在家" },
  "no-hospital": { en: "No hospital record was created", zh: "没有留下就医记录" },
  "enduring": { en: "Continuing to endure the situation", zh: "继续忍受这种情况" },
  "family-mediation": { en: "Went through his family — didn't stop it", zh: "找他家人劝阻——未能阻止" },
  "evading": { en: "Tried to disappear — temporary fix", zh: "试图消失——只是权宜之计" },
  "split-claims": { en: "Split damages from the divorce case", zh: "损害赔偿未随离婚案一并主张" },
  "gave-up-po": { en: "Did not reapply for protection order", zh: "没有再次申请保护令" },
  "late-application": { en: "Applied with limited evidence", zh: "证据有限时申请" },
  "still-documenting": { en: "Documented but did not file", zh: "只留证，未申请" },
  "no-action": { en: "No action taken yet", zh: "尚未采取行动" },
  "waiting": { en: "Chose to wait", zh: "选择先等一等" },
};

export function shortLabelFor(flag: string, language: "en" | "zh"): string {
  const l = FLAG_SHORT_LABELS[flag];
  if (!l) return flag;
  return language === "zh" ? l.zh : l.en;
}

/**
 * 从 breakdown 里选出 top-N 具体条目，用于结果卡上展示。
 */
export function pickTop(
  breakdown: SimulationScoreResult["breakdown"],
  kind: "good" | "bad",
  n: number
): Array<{ flag: string; delta: number }> {
  return breakdown
    .filter((b) => b.kind === kind)
    .slice(0, n)
    .map(({ flag, delta }) => ({ flag, delta }));
}

function bandFor(score: number): ScoreBand {
  if (score >= BANDS.excellent.min) return "excellent";
  if (score >= BANDS.good.min) return "good";
  if (score >= BANDS.partial.min) return "partial";
  return "weak";
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

  const band = bandFor(score);
  const bandInfo = BANDS[band];

  return {
    score,
    goodCount,
    badCount,
    breakdown,
    band,
    label: bandInfo.label,
    headline: bandInfo.headline,
    detail: bandInfo.detail,
  };
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
