/**
 * 模拟 — chat-style scripted process simulator (draft, pending lawyer review).
 * All dialogue comes from reviewed JSON scripts (src/data/simulations/) —
 * no AI, no free-text input, no choice is ever recorded or uploaded.
 */
import { useEffect, useRef, useState } from "react";
import {
  Compass,
  LifeBuoy,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppLanguage, copyFor } from "@/lib/locale";
import {
  SIM_SCENARIOS,
  SimChoice,
  SimDebriefRule,
  SimEnding,
  SimGlossaryTerm,
  SimScenario,
  endingIdOf,
  evaluateDebrief,
  isEndingTarget,
  resolveAuto,
  simText,
} from "@/lib/simulation";
import {
  collectCoachHints,
  computeSimulationScore,
  pickTop,
  shortLabelFor,
  type SimulationScoreResult,
} from "@/lib/simulationScore";
import { renderScoreCard, type DomesticScoreCardSummary } from "@/lib/simulationImage";

interface SimulationPageProps {
  language: AppLanguage;
  onGoToAid: () => void;
}

type ChatItem =
  | { kind: "narration"; text: string }
  | { kind: "line"; speaker: string; text: string }
  | { kind: "coach"; text: string }
  | { kind: "me"; text: string }
  | { kind: "feedback"; text: string };

interface RunState {
  scenario: SimScenario;
  log: ChatItem[];
  sceneId: string | null;
  flags: Set<string>;
  visitedSceneIds: string[];
  ending: SimEnding | null;
}

export default function SimulationPage({ language, onGoToAid }: SimulationPageProps) {
  const [run, setRun] = useState<RunState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const resultTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (run?.ending && run.scenario.id === "domestic-violence") {
      resultTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      return;
    }
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [run?.log.length, run?.ending, run?.scenario.id]);

  // NOTE: coach hints are intentionally NOT shown during play — they would
  // reveal the "correct" answer. Coach text is aggregated at the ending screen.
  const sceneItems = (scenario: SimScenario, sceneId: string): ChatItem[] => {
    const scene = scenario.scenes[sceneId];
    const items: ChatItem[] = [];
    if (scene.narration) items.push({ kind: "narration", text: simText(language, scene.narration) });
    if (scene.line)
      items.push({
        kind: "line",
        speaker: scene.speaker ? simText(language, scene.speaker) : "",
        text: simText(language, scene.line),
      });
    return items;
  };

  /** Advance into a scene; auto-scenes resolve immediately (possibly chained). */
  const enterScene = (
    scenario: SimScenario,
    sceneId: string,
    log: ChatItem[],
    flags: Set<string>,
    visited: string[]
  ): RunState => {
    let current = sceneId;
    let visitedNext = [...visited, sceneId];
    for (;;) {
      const scene = scenario.scenes[current];
      log = [...log, ...sceneItems(scenario, current)];
      if (!scene.auto)
        return { scenario, log, sceneId: current, flags, visitedSceneIds: visitedNext, ending: null };
      const next = resolveAuto(scene, flags);
      if (!next)
        return { scenario, log, sceneId: current, flags, visitedSceneIds: visitedNext, ending: null };
      if (isEndingTarget(next))
        return {
          scenario,
          log,
          sceneId: null,
          flags,
          visitedSceneIds: visitedNext,
          ending: scenario.endings[endingIdOf(next)],
        };
      current = next;
      visitedNext = [...visitedNext, current];
    }
  };

  const startScenario = (scenario: SimScenario) => {
    const log: ChatItem[] = [{ kind: "narration", text: simText(language, scenario.intro) }];
    setRun(enterScene(scenario, scenario.entry, log, new Set(), []));
  };

  const choose = (choice: SimChoice) => {
    if (!run || !run.sceneId) return;
    const flags = new Set(run.flags);
    choice.flags?.forEach((f) => flags.add(f));
    let log: ChatItem[] = [...run.log, { kind: "me", text: simText(language, choice.text) }];
    if (choice.feedback) log = [...log, { kind: "feedback", text: simText(language, choice.feedback) }];
    if (isEndingTarget(choice.next)) {
      setRun({
        ...run,
        log,
        flags,
        sceneId: null,
        ending: run.scenario.endings[endingIdOf(choice.next)],
      });
    } else {
      setRun(enterScene(run.scenario, choice.next, log, flags, run.visitedSceneIds));
    }
  };

  if (!run) {
    return <ScenarioPicker language={language} onStart={startScenario} />;
  }

  const currentScene = run.sceneId ? run.scenario.scenes[run.sceneId] : null;
  const isDomesticViolenceResult = run.ending !== null && run.scenario.id === "domestic-violence";

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {/* Top bar: back + real-help exit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setRun(null)}
          className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {copyFor(language, "Exit simulation", "退出模拟")}
        </button>
        <button
          onClick={() => setHelpOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
        >
          <LifeBuoy className="h-4 w-4" />
          {copyFor(language, "I need real help now", "我现在就需要真实帮助")}
        </button>
      </div>

      {helpOpen && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="mb-2 text-xs leading-5 text-muted-foreground">
            {copyFor(
              language,
              "This is only a simulation. If any of this is happening to you, real help is one tap away:",
              "这里只是模拟。如果这些正发生在你身上，真实的帮助就在一步之外："
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="tel:110" className="flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
              <Phone className="h-3.5 w-3.5" /> 110
            </a>
            <a href="tel:12338" className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Phone className="h-3.5 w-3.5" /> 12338
            </a>
            <a href="tel:12348" className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <Phone className="h-3.5 w-3.5" /> 12348
            </a>
            <button
              onClick={onGoToAid}
              className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-foreground"
            >
              {copyFor(language, "Open aid directory", "打开援助目录")}
            </button>
          </div>
        </div>
      )}

      {/* The domestic-violence ending becomes a focused report instead of
          appearing beneath the entire chat transcript. Other scenarios retain
          the existing result flow until their redesign is approved. */}
      {!isDomesticViolenceResult && (
        <div className="flex flex-col gap-2.5">
          {run.log.map((item, i) => (
            <ChatBubble key={i} item={item} />
          ))}
        </div>
      )}

      {/* Choices */}
      {currentScene?.choices && !run.ending && (
        <div className="mt-1 flex flex-col gap-2 pb-2">
          {currentScene.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => choose(choice)}
              className="rounded-2xl border border-primary/35 bg-primary/5 px-4 py-3 text-left text-sm font-semibold leading-5 text-foreground transition-all hover:bg-primary/10 active:scale-[0.99]"
            >
              {simText(language, choice.text)}
            </button>
          ))}
        </div>
      )}

      {/* Ending + debrief */}
      {run.ending && (
        <div ref={resultTopRef}>
          <EndingView
            language={language}
            scenario={run.scenario}
            ending={run.ending}
            flags={run.flags}
            visitedSceneIds={run.visitedSceneIds}
            onRetry={() => startScenario(run.scenario)}
            onExit={() => setRun(null)}
            onGoToAid={onGoToAid}
          />
        </div>
      )}

      <p className="pb-2 text-center text-[10px] leading-4 text-muted-foreground/70">
        {copyFor(
          language,
          "Educational simulation — not legal advice. Nothing you choose here is saved.",
          "教育模拟，不构成法律意见。你的选择不会被保存。"
        )}
      </p>
      <div ref={bottomRef} />
    </div>
  );
}

function ChatBubble({ item }: { item: ChatItem }) {
  switch (item.kind) {
    case "narration":
      return (
        <p className="mx-auto max-w-[92%] rounded-2xl bg-secondary/60 px-4 py-2.5 text-center text-[13px] leading-5 text-foreground/85">
          {item.text}
        </p>
      );
    case "line":
      return (
        <div className="mr-10 flex flex-col gap-0.5">
          {item.speaker && (
            <span className="pl-2 text-[10px] font-semibold text-muted-foreground">{item.speaker}</span>
          )}
          <p className="w-fit rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-2.5 text-sm leading-5 text-foreground">
            {item.text}
          </p>
        </div>
      );
    case "coach":
      return (
        <p className="mx-auto max-w-[88%] text-center text-[11px] leading-4 text-muted-foreground">
          💡 {item.text}
        </p>
      );
    case "me":
      return (
        <p className="ml-10 w-fit self-end rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-2.5 text-sm font-semibold leading-5 text-foreground">
          {item.text}
        </p>
      );
    case "feedback":
      return (
        <p className="mx-auto max-w-[88%] rounded-xl border border-border/50 bg-card/50 px-3 py-2 text-center text-[11px] leading-4 text-foreground/70">
          {item.text}
        </p>
      );
  }
}

function EndingView({
  language,
  scenario,
  ending,
  flags,
  visitedSceneIds,
  onRetry,
  onExit,
  onGoToAid,
}: {
  language: AppLanguage;
  scenario: SimScenario;
  ending: SimEnding;
  flags: Set<string>;
  visitedSceneIds: string[];
  onRetry: () => void;
  onExit: () => void;
  onGoToAid: () => void;
}) {
  const triggered = evaluateDebrief(scenario, flags);
  const good = triggered.filter((r) => r.kind === "good");
  const triggeredBadIds = new Set(triggered.filter((r) => r.kind === "bad").map((r) => r.id));
  const allBad = scenario.debrief.filter((r) => r.kind === "bad");
  const triggeredBad = allBad.filter((r) => triggeredBadIds.has(r.id));
  const avoidedBad = allBad.filter((r) => !triggeredBadIds.has(r.id));

  const score = computeSimulationScore(flags);
  const coachHints = collectCoachHints(scenario, visitedSceneIds);
  const isDomesticViolence = scenario.id === "domestic-violence";

  const [showAnalysis, setShowAnalysis] = useState(false);
  const analysisRef = useRef<HTMLDivElement | null>(null);

  const handleShowAnalysis = () => {
    setShowAnalysis(true);
    // Smooth-scroll to the analysis section on next paint
    setTimeout(() => {
      analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="mt-2 flex flex-col gap-3">
      {isDomesticViolence ? (
        <DomesticViolenceResultReport
          language={language}
          score={score}
          scenarioTitle={simText(language, scenario.title)}
          endingTitle={simText(language, ending.title)}
          endingSummary={simText(language, ending.summary)}
          good={good}
          triggeredBad={triggeredBad}
          avoidedBad={avoidedBad}
        />
      ) : (
        <ScoreCard
          language={language}
          score={score}
          scenarioTitle={simText(language, scenario.title)}
          scenarioTagline={simText(language, scenario.tagline)}
          endingTitle={simText(language, ending.title)}
        />
      )}

      {!showAnalysis && (
        <button
          onClick={handleShowAnalysis}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground"
        >
          {copyFor(language, "View detailed analysis", "查看具体分析")}
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {showAnalysis && (
        <div ref={analysisRef} className="flex flex-col gap-3">
          {!isDomesticViolence && (
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {copyFor(language, "This run's ending", "本次结局")}
              </div>
              <h2 className="text-base font-black text-foreground">{simText(language, ending.title)}</h2>
              <p className="mt-2 text-sm leading-6 text-foreground/85">{simText(language, ending.summary)}</p>
            </div>
          )}

          {isDomesticViolence ? (
            <h2 className="px-1 text-sm font-bold text-foreground">
              {copyFor(language, "Legal tips and practical guidance", "法律提示与实用指引")}
            </h2>
          ) : (
            <>
              {/* Debrief section heading */}
              <h2 className="px-1 text-sm font-bold text-foreground">
                {copyFor(language, "Debrief", "复盘")}
              </h2>

              {/* Good items — triggered */}
              {good.length > 0 && (
                <CollapsibleSection
                  label={copyFor(language, `What you did right (${good.length})`, `你做对了（${good.length}）`)}
                  accent="emerald"
                  defaultOpen={false}
                >
                  <div className="flex flex-col gap-3">
                    {good.map((r) => <DebriefCard key={r.id} rule={r} language={language} />)}
                  </div>
                </CollapsibleSection>
              )}

              {/* Bad items — triggered (user made these mistakes) */}
              {triggeredBad.length > 0 && (
                <CollapsibleSection
                  label={copyFor(language, `Where things went wrong (${triggeredBad.length})`, `这次出了问题的环节（${triggeredBad.length}）`)}
                  accent="rose"
                  defaultOpen={false}
                >
                  <div className="flex flex-col gap-3">
                    {triggeredBad.map((r) => <DebriefCard key={r.id} rule={r} language={language} />)}
                  </div>
                </CollapsibleSection>
              )}

              {/* Bad items — avoided (user didn't trigger, but should know about) */}
              {avoidedBad.length > 0 && (
                <CollapsibleSection
                  label={copyFor(language, `Risks you avoided this time (${avoidedBad.length})`, `这次你避开的风险（${avoidedBad.length}）`)}
                  accent="amber"
                  defaultOpen={false}
                >
                  <div className="flex flex-col gap-3">
                    {avoidedBad.map((r) => <DebriefCard key={r.id} rule={r} language={language} avoided />)}
                  </div>
                </CollapsibleSection>
              )}

              {triggered.length === 0 && allBad.length === 0 && (
                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    {copyFor(language, "No debrief entries for this run.", "这条路线没有产生复盘条目。")}
                  </p>
                </div>
              )}
            </>
          )}

          {coachHints.length > 0 && (
            <CoachHintsSection language={language} hints={coachHints} />
          )}

          <RealFlowSection language={language} steps={scenario.realFlow} />

          {scenario.glossary && scenario.glossary.length > 0 && (
            <GlossarySection language={language} terms={scenario.glossary} />
          )}
        </div>
      )}

      {isDomesticViolence && (
        <DomesticResultImageSection
          language={language}
          score={score}
          scenarioTitle={simText(language, scenario.title)}
          scenarioTagline={simText(language, scenario.tagline)}
          endingTitle={simText(language, ending.title)}
          good={good}
          triggeredBad={triggeredBad}
          avoidedBad={avoidedBad}
        />
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          {copyFor(language, "Try a different path", "换一条路再走一遍")}
        </button>
        <button
          onClick={onGoToAid}
          className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-bold text-primary"
        >
          {copyFor(language, "See real aid resources", "查看真实的援助资源")}
        </button>
        <button
          onClick={onExit}
          className="rounded-2xl px-4 py-2 text-sm font-semibold text-muted-foreground"
        >
          {copyFor(language, "Back to scenarios", "返回情景选择")}
        </button>
      </div>
    </div>
  );
}

const RESULT_BANDS: Array<{
  id: SimulationScoreResult["band"];
  range: string;
  label: { en: string; zh: string };
  textClass: string;
  borderClass: string;
}> = [
  {
    id: "excellent",
    range: "80–100",
    label: { en: "Well-prepared", zh: "准备充分" },
    textClass: "text-emerald-300",
    borderClass: "border-emerald-400",
  },
  {
    id: "good",
    range: "60–79",
    label: { en: "Basic preparation", zh: "基本准备" },
    textClass: "text-cyan-300",
    borderClass: "border-cyan-400",
  },
  {
    id: "partial",
    range: "40–59",
    label: { en: "Partial preparation", zh: "部分准备" },
    textClass: "text-amber-300",
    borderClass: "border-amber-400",
  },
  {
    id: "weak",
    range: "0–39",
    label: { en: "Needs strengthening", zh: "需要加强" },
    textClass: "text-rose-300",
    borderClass: "border-rose-400",
  },
];

function DomesticViolenceResultReport({
  language,
  score,
  scenarioTitle,
  endingTitle,
  endingSummary,
  good,
  triggeredBad,
  avoidedBad,
}: {
  language: AppLanguage;
  score: SimulationScoreResult;
  scenarioTitle: string;
  endingTitle: string;
  endingSummary: string;
  good: SimDebriefRule[];
  triggeredBad: SimDebriefRule[];
  avoidedBad: SimDebriefRule[];
}) {
  const [openActionPanel, setOpenActionPanel] = useState<"good" | "secondary" | null>(null);
  const secondaryIsAvoided = triggeredBad.length === 0;
  const secondaryRules = secondaryIsAvoided ? avoidedBad : triggeredBad;
  const circumference = 2 * Math.PI * 52;
  const scoreOffset = circumference * (1 - score.score / 100);
  const activeBand = RESULT_BANDS.find((band) => band.id === score.band) ?? RESULT_BANDS[0];

  const bandAccent =
    score.band === "excellent"
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
      : score.band === "good"
      ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
      : score.band === "partial"
      ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
      : "border-rose-400/60 bg-rose-400/10 text-rose-300";

  return (
    <div data-testid="domestic-result-report" className="flex flex-col gap-3">
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {copyFor(language, "Scenario simulation · result report", "情景模拟 · 结果报告")}
          </div>
          <h1 className="mt-5 max-w-sm text-2xl font-black leading-tight tracking-tight text-foreground">
            {simText(language, score.headline)}
          </h1>
          <p className="mt-3 text-sm leading-6 text-foreground/75">
            {simText(language, score.detail)}
          </p>

          <div className="mt-5 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {scenarioTitle}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {copyFor(language, "This run's ending", "本次结局")}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-black leading-6 text-foreground">{endingTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{endingSummary}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          {copyFor(language, "Your overall score", "你的综合得分")}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span
            data-testid="domestic-score-value"
            className={`font-mono text-6xl font-black tabular-nums ${activeBand.textClass}`}
          >
            {score.score}
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums text-muted-foreground">/ 100</span>
        </div>
        <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${bandAccent}`}>
          {simText(language, score.label)}
        </span>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_6.75rem] items-center gap-3">
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center min-[390px]:h-44 min-[390px]:w-44">
            <svg
              viewBox="0 0 120 120"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={copyFor(language, `Score ${score.score} out of 100`, `得分 ${score.score}，满分 100`)}
            >
              <defs>
                <linearGradient id="domestic-score-gradient" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgb(168 85 247)" />
                  <stop offset="42%" stopColor="rgb(244 114 182)" />
                  <stop offset="72%" stopColor="rgb(251 146 60)" />
                  <stop offset="100%" stopColor="rgb(252 211 77)" />
                </linearGradient>
                <filter id="domestic-score-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
              <circle
                data-testid="domestic-score-gradient-progress"
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#domestic-score-gradient)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                filter="url(#domestic-score-glow)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/the-unmuted-mark.png"
                alt=""
                aria-hidden="true"
                width="72"
                height="72"
                className="h-16 w-16 object-contain drop-shadow-[0_0_18px_hsl(var(--primary)/0.3)]"
              />
            </div>
          </div>

          <ol className="flex flex-col gap-2">
            {RESULT_BANDS.map((band) => {
              const active = band.id === score.band;
              return (
                <li
                  key={band.id}
                  className={`border-l pl-3 text-xs leading-4 ${band.borderClass} ${
                    active ? "opacity-100" : "opacity-60"
                  }`}
                >
                  <span className={`block font-mono tabular-nums ${band.textClass}`}>{band.range}</span>
                  <span className={`mt-0.5 block font-bold ${band.textClass}`}>
                    {simText(language, band.label)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="grid grid-cols-2 items-stretch gap-3">
        <ResultActionSummary
          title={copyFor(language, `What you did right (${good.length})`, `你做对了（${good.length}）`)}
          tone="good"
          open={openActionPanel === "good"}
          onToggle={() => setOpenActionPanel((current) => current === "good" ? null : "good")}
        />
        <ResultActionSummary
          title={
            secondaryIsAvoided
              ? copyFor(
                  language,
                  `Risks you avoided this time (${avoidedBad.length})`,
                  `这次你避开的风险（${avoidedBad.length}）`
                )
              : copyFor(
                  language,
                  `Where things went wrong (${triggeredBad.length})`,
                  `这次出了问题的环节（${triggeredBad.length}）`
                )
          }
          tone={secondaryIsAvoided ? "avoided" : "improve"}
          open={openActionPanel === "secondary"}
          onToggle={() => setOpenActionPanel((current) => current === "secondary" ? null : "secondary")}
        />

        {openActionPanel && (
          <section
            className={`col-span-2 rounded-2xl border p-4 ${
              openActionPanel === "good"
                ? "border-primary/25 bg-primary/5"
                : secondaryIsAvoided
                ? "border-amber-400/25 bg-amber-400/5"
                : "border-rose-400/25 bg-rose-400/5"
            }`}
            data-testid="domestic-action-details"
          >
            <div className="flex flex-col gap-3">
              {(openActionPanel === "good" ? good : secondaryRules).map((rule) => (
                <DebriefCard
                  key={rule.id}
                  rule={rule}
                  language={language}
                  avoided={openActionPanel === "secondary" && secondaryIsAvoided}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ResultActionSummary({
  title,
  tone,
  open,
  onToggle,
}: {
  title: string;
  tone: "good" | "improve" | "avoided";
  open: boolean;
  onToggle: () => void;
}) {
  const toneClass =
    tone === "good"
      ? "border-primary/25 bg-primary/5 text-primary"
      : tone === "improve"
      ? "border-rose-400/25 bg-rose-400/5 text-rose-300"
      : "border-amber-400/25 bg-amber-400/5 text-amber-300";

  const Icon = tone === "good" ? CheckCircle2 : tone === "improve" ? AlertTriangle : ShieldCheck;

  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border p-3 ${toneClass}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-10 w-full items-start justify-between gap-1 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:translate-y-px"
      >
        <span className="flex min-w-0 items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-black leading-4 text-foreground min-[390px]:text-xs">{title}</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
      </button>
    </section>
  );
}

function DomesticResultImageSection({
  language,
  score,
  scenarioTitle,
  scenarioTagline,
  endingTitle,
  good,
  triggeredBad,
  avoidedBad,
}: {
  language: AppLanguage;
  score: SimulationScoreResult;
  scenarioTitle: string;
  scenarioTagline: string;
  endingTitle: string;
  good: SimDebriefRule[];
  triggeredBad: SimDebriefRule[];
  avoidedBad: SimDebriefRule[];
}) {
  const [open, setOpen] = useState(false);
  const topGood = pickTop(score.breakdown, "good", 2).map((item) => shortLabelFor(item.flag, language));
  const topBad = pickTop(score.breakdown, "bad", 2).map((item) => shortLabelFor(item.flag, language));
  const primaryItems = topGood.length > 0
    ? topGood
    : good.slice(0, 2).map((rule) => simText(language, rule.title));
  const improvementItems = topBad.length > 0
    ? topBad
    : triggeredBad.slice(0, 2).map((rule) => simText(language, rule.title));
  const secondaryIsAvoided = improvementItems.length === 0;
  const secondaryItems = secondaryIsAvoided
    ? avoidedBad.slice(0, 2).map((rule) => simText(language, rule.title))
    : improvementItems;
  const summary: DomesticScoreCardSummary = {
    primaryTitle: copyFor(language, `What you did right (${good.length})`, `你做对了（${good.length}）`),
    primaryCount: good.length,
    primaryItems,
    secondaryTitle: secondaryIsAvoided
      ? copyFor(
          language,
          `Risks you avoided this time (${avoidedBad.length})`,
          `这次你避开的风险（${avoidedBad.length}）`
        )
      : copyFor(
          language,
          `Where things went wrong (${triggeredBad.length})`,
          `这次出了问题的环节（${triggeredBad.length}）`
        ),
    secondaryCount: secondaryIsAvoided ? avoidedBad.length : triggeredBad.length,
    secondaryItems,
    secondaryTone: secondaryIsAvoided ? "avoided" : "improve",
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-foreground">
              {copyFor(language, "Save the shareable result card", "保存可分享的结果卡片")}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {copyFor(language, "Open the image, then long-press to save.", "展开图片后，长按即可保存。")}
            </span>
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="mt-4 border-t border-border/70 pt-4">
          <ScoreCard
            language={language}
            score={score}
            scenarioTitle={scenarioTitle}
            scenarioTagline={scenarioTagline}
            endingTitle={endingTitle}
            variant="domestic-report"
            summary={summary}
          />
        </div>
      )}
    </section>
  );
}

function RealFlowSection({ language, steps }: { language: AppLanguage; steps: { en: string; zh: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {copyFor(language, `Real process — the right steps (${steps.length})`, `真实流程——正确的做法（${steps.length}）`)}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-6 text-foreground/85">{simText(language, step)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function GlossarySection({ language, terms }: { language: AppLanguage; terms: SimGlossaryTerm[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {copyFor(language, "Term glossary", "名词解释")}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {terms.map((g, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5">
              <p className="text-sm font-bold text-foreground">{simText(language, g.term)}</p>
              <p className="mt-1 text-xs leading-5 text-foreground/75">{simText(language, g.note)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DebriefCard({
  rule,
  language,
  avoided = false,
}: {
  rule: SimDebriefRule;
  language: AppLanguage;
  avoided?: boolean;
}) {
  const isGood = rule.kind === "good";
  // Darker, higher-contrast backgrounds — the previous /5 tints were nearly invisible
  // against the dark-purple app background. Now: solid dark card + strong colored border.
  const cardClass = isGood
    ? "border-l-4 border-l-emerald-500 border-y border-r border-border/60 bg-secondary/50"
    : avoided
    ? "border-l-4 border-l-amber-500 border-y border-r border-border/60 bg-secondary/50 opacity-90"
    : "border-l-4 border-l-rose-500 border-y border-r border-border/60 bg-secondary/50";
  const icon = isGood ? (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
  ) : avoided ? (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
  ) : (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
  );
  return (
    <div className={`rounded-xl p-3 ${cardClass}`}>
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <p className="text-sm font-bold text-foreground">{simText(language, rule.title)}</p>
          <p className="mt-1 text-xs leading-5 text-foreground/85">{simText(language, rule.detail)}</p>
          {rule.basis && (
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground/90">
              {copyFor(language, "Basis: ", "依据：")}
              {simText(language, rule.basis)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScenarioPicker({
  language,
  onStart,
}: {
  language: AppLanguage;
  onStart: (scenario: SimScenario) => void;
}) {
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div className="text-center pt-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-black text-foreground">
          {copyFor(language, "Practice Simulator", "模拟练习")}
        </h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {copyFor(
            language,
            "Walk through the real process — from that night to the courtroom — safely, before it's real. Learn which step matters, and why.",
            "在安全的环境里，把真实流程先走一遍——从案发到结案。看清哪一步最关键、为什么。"
          )}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {copyFor(language, "Choose a scenario", "选择情景")}
        </h2>
        <div className="flex flex-col gap-3">
          {SIM_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => onStart(s)}
              className="rounded-2xl border border-primary/30 bg-card p-4 text-left transition-all hover:border-primary/60 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-foreground">{simText(language, s.title)}</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  {copyFor(language, "Draft · legal review pending", "模拟版本 · 待法律校对")}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{simText(language, s.tagline)}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span className="font-semibold text-foreground/60">
          {copyFor(language, "Note", "提示")}
        </span>
        {"  "}
        {copyFor(
          language,
          "This is an educational simulation, not legal advice — every case is different; call 12348 for free legal aid. Scenes describe situations without depicting violence. Your choices are never saved or uploaded.",
          "这是教育性模拟，不构成法律意见——每个真实案件都不同，可拨打 12348 获得免费法律咨询。场景只描述处境，不呈现暴力细节。你的选择不会被保存或上传。"
        )}
      </div>
    </div>
  );
}

function ScoreCard({
  language,
  score,
  scenarioTitle,
  scenarioTagline,
  endingTitle,
  variant = "default",
  summary,
}: {
  language: AppLanguage;
  score: SimulationScoreResult;
  scenarioTitle: string;
  scenarioTagline: string;
  endingTitle: string;
  variant?: "default" | "domestic-report";
  summary?: DomesticScoreCardSummary;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const primaryItemsKey = summary?.primaryItems.join("\u001f") ?? "";
  const secondaryItemsKey = summary?.secondaryItems.join("\u001f") ?? "";

  // Auto-generate the image on mount
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        setBusy(true);
        setError(false);
        const blob = await renderScoreCard({
          language,
          scenarioTitle,
          scenarioTagline,
          endingTitle,
          score,
          variant,
          summary,
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    language,
    score.score,
    scenarioTitle,
    scenarioTagline,
    endingTitle,
    variant,
    summary?.primaryTitle,
    summary?.primaryCount,
    primaryItemsKey,
    summary?.secondaryTitle,
    summary?.secondaryCount,
    secondaryItemsKey,
    summary?.secondaryTone,
  ]);

  if (busy) {
    return (
      <div className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/30">
        <p className="text-xs text-muted-foreground">
          {copyFor(language, "Generating result card...", "生成结果卡片...")}
        </p>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4">
        <p className="text-center text-xs text-rose-500">
          {copyFor(language, "Failed to generate card", "生成失败")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-xs font-bold text-foreground">
        {copyFor(
          language,
          "👇 Long-press the image to save to your album",
          "👇 长按下方图片，保存到相册"
        )}
      </p>
      <img
        src={imageUrl}
        alt={copyFor(language, "Result card", "结果卡片")}
        className="w-full rounded-2xl"
      />
    </div>
  );
}

function CoachHintsSection({
  language,
  hints,
}: {
  language: AppLanguage;
  hints: Array<{ sceneId: string; text: { en: string; zh: string } }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          💡 {copyFor(language, `Legal tips from your path (${hints.length})`, `本次流程中的法律提示（${hints.length} 条）`)}
        </h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary" />
        )}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {hints.map((h, i) => (
            <p
              key={h.sceneId + i}
              className="rounded-xl bg-card/60 px-3 py-2 text-xs leading-5 text-foreground/85"
            >
              {simText(language, h.text)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  label,
  accent,
  defaultOpen = false,
  children,
}: {
  label: string;
  accent: "emerald" | "rose" | "amber";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentText =
    accent === "emerald" ? "text-emerald-500" :
    accent === "rose" ? "text-rose-500" :
    "text-amber-500";
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className={`text-xs font-bold uppercase tracking-[0.12em] ${accentText}`}>
          {label}
        </span>
        {open ? (
          <ChevronUp className={`h-4 w-4 ${accentText}`} />
        ) : (
          <ChevronDown className={`h-4 w-4 ${accentText}`} />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
