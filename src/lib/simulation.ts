/**
 * 模拟 — chat-style scripted process simulator (2026-07-30 draft).
 * Content/code separation like aidDirectory: scenarios are JSON under
 * src/data/simulations/,每句文本双语，全部来自脚本 — no AI, no free-text input,
 * so every line can be legally reviewed before launch.
 * DRAFT content is pending lawyer review (模拟版本，待律师校对).
 */
import { AppLanguage, copyFor } from "@/lib/locale";
import domesticViolence from "@/data/simulations/domestic-violence.json";
import sexualHarassment from "@/data/simulations/sexual-harassment.json";
import sexualAssault from "@/data/simulations/sexual-assault.json";

export interface SimText {
  en: string;
  zh: string;
}

export interface SimChoice {
  text: SimText;
  /** Immediate consequence bubble shown after picking this choice. */
  feedback?: SimText;
  flags?: string[];
  /** Scene id, or "end:<endingId>". */
  next: string;
}

export interface SimAutoRoute {
  /** All of these flags must be present. */
  has?: string[];
  /** None of these flags may be present. */
  missing?: string[];
  next: string;
}

export interface SimScene {
  /** Second-person situation description (restrained; never renders violence). */
  narration?: SimText;
  /** Who speaks the `line` bubble (民警 / 律师 / …). */
  speaker?: SimText;
  line?: SimText;
  /** Grey coach hint shown between bubbles. */
  coach?: SimText;
  choices?: SimChoice[];
  /** Flag-dependent auto-advance (evaluated in order; last entry must be unconditional). */
  auto?: SimAutoRoute[];
}

export interface SimEnding {
  title: SimText;
  summary: SimText;
}

export interface SimGlossaryTerm {
  term: SimText;
  note: SimText;
}

export interface SimDebriefRule {
  id: string;
  kind: "good" | "bad";
  has?: string[];
  missing?: string[];
  title: SimText;
  /** 正确做法 in plain language — addresses the system/method, never blames the user. */
  detail: SimText;
  /** Legal basis in plain language (待律师校对). */
  basis?: SimText;
}

export interface SimScenario {
  id: string;
  title: SimText;
  tagline: SimText;
  intro: SimText;
  entry: string;
  scenes: Record<string, SimScene>;
  endings: Record<string, SimEnding>;
  debrief: SimDebriefRule[];
  /** Ideal real-world process steps, shown after the debrief. */
  realFlow: SimText[];
  /** Plain-language glossary of legal terms used in this scenario. */
  glossary?: SimGlossaryTerm[];
}

export const SIM_SCENARIOS: SimScenario[] = [
  domesticViolence as SimScenario,
  sexualHarassment as SimScenario,
  sexualAssault as SimScenario,
];

export function scenarioById(id: string): SimScenario | undefined {
  return SIM_SCENARIOS.find((s) => s.id === id);
}

export function simText(language: AppLanguage, t: SimText): string {
  return copyFor(language, t.en, t.zh);
}

export function flagsMatch(
  flags: ReadonlySet<string>,
  cond: { has?: string[]; missing?: string[] }
): boolean {
  if (cond.has && !cond.has.every((f) => flags.has(f))) return false;
  if (cond.missing && cond.missing.some((f) => flags.has(f))) return false;
  return true;
}

/** Resolve an auto-scene to its next target for the given flags. */
export function resolveAuto(scene: SimScene, flags: ReadonlySet<string>): string | null {
  if (!scene.auto) return null;
  for (const route of scene.auto) {
    if (flagsMatch(flags, route)) return route.next;
  }
  return null;
}

export function isEndingTarget(next: string): boolean {
  return next.startsWith("end:");
}

export function endingIdOf(next: string): string {
  return next.slice("end:".length);
}

/** Debrief checklist for a finished run — only rules whose condition matches. */
export function evaluateDebrief(
  scenario: SimScenario,
  flags: ReadonlySet<string>
): SimDebriefRule[] {
  return scenario.debrief.filter((rule) => flagsMatch(flags, rule));
}

/**
 * Structural validation, used by unit tests: every next pointer must resolve,
 * every scene/ending must be reachable, every text must be bilingual.
 */
export function validateScenario(s: SimScenario): string[] {
  const errors: string[] = [];
  const checkText = (t: SimText | undefined, where: string) => {
    if (!t) return;
    if (!t.en?.trim()) errors.push(`${where}: missing en text`);
    if (!t.zh?.trim()) errors.push(`${where}: missing zh text`);
  };
  const checkTarget = (next: string, where: string) => {
    if (isEndingTarget(next)) {
      if (!s.endings[endingIdOf(next)]) errors.push(`${where}: unknown ending "${next}"`);
    } else if (!s.scenes[next]) {
      errors.push(`${where}: unknown scene "${next}"`);
    }
  };

  checkText(s.title, `${s.id}.title`);
  checkText(s.tagline, `${s.id}.tagline`);
  checkText(s.intro, `${s.id}.intro`);
  if (!s.scenes[s.entry]) errors.push(`entry scene "${s.entry}" not found`);

  for (const [id, scene] of Object.entries(s.scenes)) {
    checkText(scene.narration, `${id}.narration`);
    checkText(scene.speaker, `${id}.speaker`);
    checkText(scene.line, `${id}.line`);
    checkText(scene.coach, `${id}.coach`);
    const hasChoices = (scene.choices?.length ?? 0) > 0;
    const hasAuto = (scene.auto?.length ?? 0) > 0;
    if (!hasChoices && !hasAuto) errors.push(`${id}: has neither choices nor auto routes`);
    if (hasChoices && hasAuto) errors.push(`${id}: has both choices and auto routes`);
    scene.choices?.forEach((c, i) => {
      checkText(c.text, `${id}.choices[${i}].text`);
      checkText(c.feedback, `${id}.choices[${i}].feedback`);
      checkTarget(c.next, `${id}.choices[${i}]`);
    });
    if (scene.auto) {
      scene.auto.forEach((r, i) => checkTarget(r.next, `${id}.auto[${i}]`));
      const last = scene.auto[scene.auto.length - 1];
      if (last.has?.length || last.missing?.length)
        errors.push(`${id}: last auto route must be unconditional (fallback)`);
    }
  }

  for (const [id, ending] of Object.entries(s.endings)) {
    checkText(ending.title, `endings.${id}.title`);
    checkText(ending.summary, `endings.${id}.summary`);
  }

  // Reachability from the entry scene.
  const seenScenes = new Set<string>();
  const seenEndings = new Set<string>();
  const queue = [s.entry];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seenScenes.has(id)) continue;
    const scene = s.scenes[id];
    if (!scene) continue;
    seenScenes.add(id);
    const targets = [
      ...(scene.choices?.map((c) => c.next) ?? []),
      ...(scene.auto?.map((r) => r.next) ?? []),
    ];
    for (const next of targets) {
      if (isEndingTarget(next)) seenEndings.add(endingIdOf(next));
      else queue.push(next);
    }
  }
  for (const id of Object.keys(s.scenes)) {
    if (!seenScenes.has(id)) errors.push(`scene "${id}" is unreachable`);
  }
  for (const id of Object.keys(s.endings)) {
    if (!seenEndings.has(id)) errors.push(`ending "${id}" is unreachable`);
  }

  s.realFlow.forEach((step, i) => checkText(step, `realFlow[${i}]`));
  s.glossary?.forEach((g, i) => {
    checkText(g.term, `glossary[${i}].term`);
    checkText(g.note, `glossary[${i}].note`);
  });

  // Debrief conditions must reference flags that some choice can actually set.
  const knownFlags = new Set<string>();
  for (const scene of Object.values(s.scenes)) {
    scene.choices?.forEach((c) => c.flags?.forEach((f) => knownFlags.add(f)));
  }
  s.debrief.forEach((rule) => {
    checkText(rule.title, `debrief.${rule.id}.title`);
    checkText(rule.detail, `debrief.${rule.id}.detail`);
    checkText(rule.basis, `debrief.${rule.id}.basis`);
    [...(rule.has ?? []), ...(rule.missing ?? [])].forEach((f) => {
      if (!knownFlags.has(f)) errors.push(`debrief.${rule.id}: unknown flag "${f}"`);
    });
  });

  return errors;
}
