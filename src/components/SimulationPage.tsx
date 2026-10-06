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
  AlertTriangle,
  Phone,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import simulationTips from "@/data/simulationTips.json";
import {
  FLAG_WEIGHTS,
  collectCoachHints,
  computeSimulationScore,
  type SimulationScoreResult,
} from "@/lib/simulationScore";
import {
  renderScoreCard,
  type DomesticScoreCardSummary,
  type KnowledgeCardItem,
} from "@/lib/simulationImage";

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
  selectedChoiceIds: string[];
  ending: SimEnding | null;
}

export default function SimulationPage({ language, onGoToAid }: SimulationPageProps) {
  const [run, setRun] = useState<RunState | null>(null);
  const [pendingScenario, setPendingScenario] = useState<SimScenario | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const resultTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (run?.ending) {
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
    visited: string[],
    selectedChoiceIds: string[]
  ): RunState => {
    let current = sceneId;
    let visitedNext = [...visited, sceneId];
    for (;;) {
      const scene = scenario.scenes[current];
      log = [...log, ...sceneItems(scenario, current)];
      if (!scene.auto)
        return {
          scenario,
          log,
          sceneId: current,
          flags,
          visitedSceneIds: visitedNext,
          selectedChoiceIds,
          ending: null,
        };
      const next = resolveAuto(scene, flags);
      if (!next)
        return {
          scenario,
          log,
          sceneId: current,
          flags,
          visitedSceneIds: visitedNext,
          selectedChoiceIds,
          ending: null,
        };
      if (isEndingTarget(next))
        return {
          scenario,
          log,
          sceneId: null,
          flags,
          visitedSceneIds: visitedNext,
          selectedChoiceIds,
          ending: scenario.endings[endingIdOf(next)],
        };
      current = next;
      visitedNext = [...visitedNext, current];
    }
  };

  const startScenario = (scenario: SimScenario) => {
    const log: ChatItem[] = [{ kind: "narration", text: simText(language, scenario.intro) }];
    setRun(enterScene(scenario, scenario.entry, log, new Set(), [], []));
  };

  const choose = (choice: SimChoice, choiceIndex: number) => {
    if (!run || !run.sceneId) return;
    const flags = new Set(run.flags);
    choice.flags?.forEach((f) => flags.add(f));
    const selectedChoiceIds = [...run.selectedChoiceIds, choiceId(run.sceneId, choiceIndex)];
    let log: ChatItem[] = [...run.log, { kind: "me", text: simText(language, choice.text) }];
    if (choice.feedback) log = [...log, { kind: "feedback", text: simText(language, choice.feedback) }];
    if (isEndingTarget(choice.next)) {
      setRun({
        ...run,
        log,
        flags,
        sceneId: null,
        selectedChoiceIds,
        ending: run.scenario.endings[endingIdOf(choice.next)],
      });
    } else {
      setRun(
        enterScene(
          run.scenario,
          choice.next,
          log,
          flags,
          run.visitedSceneIds,
          selectedChoiceIds
        )
      );
    }
  };

  if (!run) {
    return (
      <>
        <ScenarioPicker language={language} onStart={setPendingScenario} />
        <SensitiveContentDialog
          language={language}
          scenario={pendingScenario}
          onCancel={() => setPendingScenario(null)}
          onContinue={() => {
            if (!pendingScenario) return;
            const scenario = pendingScenario;
            setPendingScenario(null);
            startScenario(scenario);
          }}
        />
      </>
    );
  }

  const currentScene = run.sceneId ? run.scenario.scenes[run.sceneId] : null;
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

      {/* Every ending becomes a focused report instead of appearing beneath
          the full chat transcript. This keeps all scenario results consistent. */}
      {!run.ending && (
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
              onClick={() => choose(choice, i)}
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
            selectedChoiceIds={run.selectedChoiceIds}
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

function SensitiveContentDialog({
  language,
  scenario,
  onCancel,
  onContinue,
}: {
  language: AppLanguage;
  scenario: SimScenario | null;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <AlertDialog open={scenario !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="w-[min(92vw,440px)] rounded-3xl border-primary/25 bg-card p-6 shadow-[0_24px_80px_hsl(240_70%_4%/0.65)]">
        <AlertDialogHeader className="text-left">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-500">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="pr-6 text-xl font-black text-foreground">
            {copyFor(language, "Sensitive content warning", "敏感内容提示")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
            {copyFor(
              language,
              "This practice scenario discusses abuse, harassment, coercion, trauma, and the legal process that may follow. Some details may feel upsetting or bring up difficult memories.",
              "这个练习情景会讨论暴力、骚扰、胁迫、创伤，以及可能涉及的法律流程。部分内容可能令人不适，或触发创伤记忆。"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm leading-6 text-foreground/85">
          <p className="font-semibold text-foreground">
            {scenario ? simText(language, scenario.title) : ""}
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>
              {copyFor(
                language,
                "This is an educational simulation, not legal advice.",
                "这是教育性模拟，不构成法律意见。"
              )}
            </li>
            <li>
              {copyFor(
                language,
                "Scenes do not depict graphic violence, and nothing you choose is saved or uploaded.",
                "场景不会呈现暴力细节，你的选择不会被保存或上传。"
              )}
            </li>
            <li>
              {copyFor(
                language,
                "You can leave at any time. If you need real help, use the real-help button or call emergency services.",
                "你可以随时退出。如果你需要真实帮助，请使用真实帮助按钮或拨打紧急服务电话。"
              )}
            </li>
          </ul>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="mt-0 min-h-11 rounded-xl border-border bg-background/70 px-4 font-semibold text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copyFor(language, "Back", "返回")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="min-h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.24)] hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copyFor(language, "Continue to scenario", "继续进入练习")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

function choiceId(sceneId: string, choiceIndex: number): string {
  return `${sceneId}:${choiceIndex}`;
}

function EndingView({
  language,
  scenario,
  ending,
  flags,
  visitedSceneIds,
  selectedChoiceIds,
  onRetry,
  onExit,
  onGoToAid,
}: {
  language: AppLanguage;
  scenario: SimScenario;
  ending: SimEnding;
  flags: Set<string>;
  visitedSceneIds: string[];
  selectedChoiceIds: string[];
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
  const isReflection = scenario.resultMode === "reflection";
  const resultInsights = buildResultInsights(
    scenario,
    visitedSceneIds,
    flags,
    selectedChoiceIds,
    language,
    isReflection
  );
  const scoreCardSummary = buildScoreCardSummary(
    language,
    scenario,
    good,
    triggeredBad,
    avoidedBad,
    coachHints[0] ? simText(language, coachHints[0].text) : undefined,
    [...flags].sort().join("|")
  );

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
      {isReflection ? (
        <ReflectionResultReport
          language={language}
          scenarioTitle={simText(language, scenario.title)}
          endingTitle={simText(language, ending.title)}
          endingSummary={simText(language, ending.summary)}
          protectiveItems={resultInsights.protective}
        />
      ) : (
        <SimulationResultReport
          language={language}
          score={score}
          scenarioTitle={simText(language, scenario.title)}
          scenarioTagline={simText(language, scenario.tagline)}
          endingTitle={simText(language, ending.title)}
          endingSummary={simText(language, ending.summary)}
          summary={scoreCardSummary}
          protectiveItems={resultInsights.protective}
          avoidedRiskItems={resultInsights.avoidedRisks}
        />
      )}

      {!showAnalysis && (
        <button
          onClick={handleShowAnalysis}
          className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-base font-bold text-primary-foreground shadow-[0_10px_30px_hsl(var(--primary)/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {copyFor(language, "View detailed analysis", "查看具体分析")}
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {showAnalysis && (
        <div ref={analysisRef} className="flex flex-col gap-3">
          <RealFlowSection language={language} steps={scenario.realFlow} />

          {scenario.glossary && scenario.glossary.length > 0 && (
            <GlossarySection language={language} terms={scenario.glossary} />
          )}

          {coachHints.length > 0 && (
            <>
            <h2 className="px-1 text-lg font-black text-foreground">
              {copyFor(language, "Practical guidance and helpful reminders", "实用提示与参考建议")}
            </h2>
              <CoachHintsSection language={language} hints={coachHints} />
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" />
          {copyFor(language, "Try a different path", "换一条路再走一遍")}
        </button>
        <button
          onClick={onGoToAid}
          className="min-h-12 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-base font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {copyFor(language, "See real aid resources", "查看真实的援助资源")}
        </button>
        <button
          onClick={onExit}
          className="min-h-11 rounded-2xl px-4 py-2 text-base font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {copyFor(language, "Back to scenarios", "返回情景选择")}
        </button>
      </div>
    </div>
  );
}

function ReflectionResultReport({
  language,
  scenarioTitle,
  endingTitle,
  endingSummary,
  protectiveItems,
}: {
  language: AppLanguage;
  scenarioTitle: string;
  endingTitle: string;
  endingSummary: string;
  protectiveItems: ResultInsightItem[];
}) {
  return (
    <section
      data-testid="simulation-reflection-report"
      className="relative overflow-hidden rounded-[28px] border border-[#c084fc]/25 bg-[linear-gradient(180deg,#15142f_0%,#09091d_100%)] p-5 shadow-[0_24px_70px_rgba(5,4,22,0.42)] sm:p-7"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-[#f472b6]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#c084fc]/10 blur-3xl"
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-sm font-bold tracking-[0.1em] text-[#f472b6]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {copyFor(language, "Trauma-informed reflection", "创伤知情复盘")}
        </div>
        <h1 className="mt-5 text-2xl font-black leading-[1.3] tracking-tight text-white">
          {copyFor(language, "Your response does not need a score.", "你的反应不需要被打分。")}
        </h1>
        <p className="mt-4 text-base leading-7 text-white/75">
          {copyFor(
            language,
            "Questioning, blame, pressure, or disclosure without consent does not prove that you did anything wrong. You may pause, leave, set a boundary, or seek different support.",
            "质疑、责备、逼迫，或未经同意泄露你的经历，都不能证明你做错了什么。你可以暂停、离开、设定边界，也可以转向其他支持。"
          )}
        </p>
        <ResultInsightPanels
          language={language}
          protectiveItems={protectiveItems}
          avoidedRiskItems={[]}
          reflection
        />

        <div className="mt-6 border-t border-white/10 pt-5">
          <span className="inline-flex rounded-full border border-[#f472b6]/35 bg-[#f472b6]/10 px-3 py-1.5 text-sm font-bold text-[#f5a6d0]">
            {scenarioTitle}
          </span>
          <p className="mt-4 text-sm font-bold tracking-[0.08em] text-white/50">
            {copyFor(language, "THIS RUN'S ENDING", "本次结局")}
          </p>
          <h2 className="mt-2 text-[22px] font-black leading-8 text-white">{endingTitle}</h2>
          <p className="mt-2 text-base leading-7 text-white/75">{endingSummary}</p>
        </div>
      </div>
    </section>
  );
}

interface ResultInsightItem {
  id: string;
  title: string;
  detail: string;
}

interface ResultInsights {
  protective: ResultInsightItem[];
  avoidedRisks: ResultInsightItem[];
}

function buildResultInsights(
  scenario: SimScenario,
  visitedSceneIds: string[],
  selectedFlags: ReadonlySet<string>,
  selectedChoiceIds: string[],
  language: AppLanguage,
  reflection: boolean
): ResultInsights {
  const protective: ResultInsightItem[] = [];
  const avoidedRisks: ResultInsightItem[] = [];
  const triggeredRules = evaluateDebrief(scenario, selectedFlags);
  const selectedChoices = new Set(selectedChoiceIds);
  const seenProtective = new Set<string>();
  const seenRisks = new Set<string>();

  const detailFor = (
    choice: SimChoice,
    sceneId: string,
    rule: SimDebriefRule | undefined,
    fallbackEn: string,
    fallbackZh: string
  ) => {
    if (rule) return simText(language, rule.detail);
    if (choice.feedback) return simText(language, choice.feedback);
    const sceneCoach = scenario.scenes[sceneId]?.coach;
    if (sceneCoach) return simText(language, sceneCoach);
    return copyFor(language, fallbackEn, fallbackZh);
  };

  for (const sceneId of new Set(visitedSceneIds)) {
    const scene = scenario.scenes[sceneId];
    for (const [choiceIndex, choice] of (scene?.choices ?? []).entries()) {
      const choiceFlags = choice.flags ?? [];
      const selected = selectedChoices.has(choiceId(sceneId, choiceIndex));
      const matchingGood = triggeredRules.find(
        (rule) =>
          rule.kind === "good" &&
          rule.has?.some((flag) => choiceFlags.includes(flag))
      );
      const hasProtectiveFlag = choiceFlags.some((flag) => (FLAG_WEIGHTS[flag] ?? 0) > 0);
      const isReflectionChoice =
        reflection &&
        sceneId !== scenario.entry &&
        !choiceFlags.some((flag) => flag.startsWith("sv-path-"));

      if (selected && (hasProtectiveFlag || matchingGood || isReflectionChoice)) {
        const title = insightTitle(simText(language, choice.text), language);
        const key = `${title}\u001f${choiceFlags.join("|")}`;
        if (!seenProtective.has(key)) {
          seenProtective.add(key);
          protective.push({
            id: `protective-${sceneId}-${choiceIndex}`,
            title,
            detail: detailFor(
              choice,
              sceneId,
              matchingGood,
              "This choice supported safety, autonomy, evidence, or access to help on the path you took.",
              "这个选择在本次路径中帮助维护安全、决定权、证据或获得支持的机会。"
            ),
          });
        }
      }

      if (reflection || selected) continue;
      const negativeFlags = choiceFlags.filter((flag) => (FLAG_WEIGHTS[flag] ?? 0) < 0);
      if (negativeFlags.length === 0) continue;
      const matchingBad = scenario.debrief.find(
        (rule) =>
          rule.kind === "bad" &&
          rule.has?.some((flag) => negativeFlags.includes(flag))
      );
      const title = insightTitle(simText(language, choice.text), language);
      const key = `${title}\u001f${negativeFlags.join("|")}`;
      if (!seenRisks.has(key)) {
        seenRisks.add(key);
        avoidedRisks.push({
          id: `avoided-${sceneId}-${choiceIndex}`,
          title,
          detail: detailFor(
            choice,
            sceneId,
            matchingBad,
            "You avoided this alternative on the path you actually visited.",
            "你在实际走过的这条路径中避开了这个选项及其可能带来的风险。"
          ),
        });
      }
    }
  }

  return { protective, avoidedRisks };
}

function insightTitle(text: string, language: AppLanguage): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const limit = language === "zh" ? 32 : 76;
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`;
}

function ResultInsightPanels({
  language,
  protectiveItems,
  avoidedRiskItems,
  reflection = false,
}: {
  language: AppLanguage;
  protectiveItems: ResultInsightItem[];
  avoidedRiskItems: ResultInsightItem[];
  reflection?: boolean;
}) {
  const [openPanel, setOpenPanel] = useState<"protective" | "avoided" | null>(null);
  const activeItems = openPanel === "avoided" ? avoidedRiskItems : protectiveItems;
  const activeTitle = openPanel === "avoided"
    ? copyFor(language, "Risks you avoided on this path", "本次路径中避开的风险")
    : reflection
      ? copyFor(language, "Boundaries and support on this path", "本次路径中的边界与支持")
      : copyFor(language, "Protective choices on this path", "本次路径中的保护性选择");

  const toggle = (panel: "protective" | "avoided") => {
    setOpenPanel((current) => current === panel ? null : panel);
  };

  const panelButton = (
    panel: "protective" | "avoided",
    label: string,
    count: number
  ) => {
    const open = openPanel === panel;
    const controls = `result-${panel}-details`;
    return (
      <button
        type="button"
        aria-expanded={open}
        aria-controls={controls}
        onClick={() => toggle(panel)}
        className="group flex min-h-[104px] w-full items-center justify-between gap-3 rounded-2xl border border-[#f472b6]/35 bg-[#f472b6]/10 px-4 py-4 text-left transition-colors hover:border-[#f472b6]/60 hover:bg-[#f472b6]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5a6d0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0c25]"
      >
        <span>
          <span className="block text-sm font-bold leading-5 text-white/65">{label}</span>
          <span className="mt-1 block text-3xl font-black leading-none text-[#f472b6]">{count}</span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5a6d0] transition-transform group-hover:scale-105">
          {open ? (
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="mt-6">
      <div className={reflection ? "grid grid-cols-1" : "grid grid-cols-2 gap-3"}>
        {panelButton(
          "protective",
          reflection
            ? copyFor(language, "Boundaries and support", "边界与支持选择")
            : copyFor(language, "Protective choices", "保护性选择"),
          protectiveItems.length
        )}
        {!reflection && panelButton(
          "avoided",
          copyFor(language, "Risks avoided", "避开风险"),
          avoidedRiskItems.length
        )}
      </div>

      {openPanel && (
        <div
          id={`result-${openPanel}-details`}
          className="mt-3 rounded-2xl border border-white/10 bg-[#211d46]/75 p-4 shadow-inner"
        >
          <h3 className="text-base font-black leading-6 text-[#f5a6d0]">{activeTitle}</h3>
          {activeItems.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {activeItems.map((item, index) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f472b6]/15 text-sm font-black text-[#f5a6d0]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base font-bold leading-6 text-white">{item.title}</p>
                    <p className="mt-1.5 text-[15px] leading-7 text-white/70">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[15px] leading-7 text-white/65">
              {copyFor(
                language,
                "No separate items were identified on this path. This is not a judgment about your response.",
                "这条路径没有单独列出的项目，这不代表对你的反应作出评价。"
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function buildScoreCardSummary(
  language: AppLanguage,
  scenario: SimScenario,
  good: SimDebriefRule[],
  triggeredBad: SimDebriefRule[],
  avoidedBad: SimDebriefRule[],
  firstLegalTip?: string,
  resultSeed = ""
): DomesticScoreCardSummary {
  const correctItems: KnowledgeCardItem[] = [];
  const educationItems: KnowledgeCardItem[] = [];
  const addUnique = (items: KnowledgeCardItem[], item: KnowledgeCardItem) => {
    if (items.length >= 3 || items.some((existing) => existing.title === item.title)) return;
    items.push(item);
  };

  good.forEach((rule) => addUnique(correctItems, {
    title: conciseFeedbackTitle(simText(language, rule.title), language),
    detail: correctSupportText(language, rule),
  }));
  avoidedBad.forEach((rule) => addUnique(correctItems, {
    title: copyFor(
      language,
      `Avoided: ${conciseFeedbackTitle(simText(language, rule.title), language)}`,
      `避开：${conciseFeedbackTitle(simText(language, rule.title), language)}`
    ),
    detail: correctSupportText(language, rule),
  }));

  const triggeredGoodIds = new Set(good.map((rule) => rule.id));
  scenario.debrief
    .filter((rule) => rule.kind === "good" && !triggeredGoodIds.has(rule.id))
    .forEach((rule) => addUnique(educationItems, knowledgeItemForRule(language, rule)));

  triggeredBad.forEach((rule) =>
    addUnique(educationItems, knowledgeItemForRule(language, rule))
  );

  scenario.glossary?.forEach((term) => addUnique(educationItems, {
    title: simText(language, term.term),
    detail: simText(language, term.note),
  }));

  scenario.realFlow.forEach((step, index) => addUnique(educationItems, {
    title: copyFor(language, `Key step ${index + 1}`, `关键步骤 ${index + 1}`),
    detail: simText(language, step),
  }));

  return {
    scoreTitle: scoreTitleForScenario(language, scenario.id),
    shareHint: copyFor(
      language,
      "Long-press to save · May you never need this knowledge",
      "长按保存图片 · 希望这些知识永远不必用上"
    ),
    correctTitle: copyFor(language, "Protective choices", "保护性选择"),
    correctItems: correctItems.slice(0, 3),
    educationTitle: copyFor(language, "Key guidance", "关键提示"),
    educationItems: educationItems.slice(0, 3),
    qrLabel: copyFor(language, "Scan to try the beta", "扫码体验内测版"),
    sceneTipTitle: copyFor(
      language,
      "Scenario Tip",
      "场景科普小tip"
    ),
    sceneTip: scenarioTipFor(language, scenario.id, resultSeed, firstLegalTip),
  };
}

function scenarioTipFor(
  language: AppLanguage,
  scenarioId: string,
  seed: string,
  fallback?: string
): string | undefined {
  if (language !== "zh") return fallback;
  const pools = simulationTips as Record<string, string[]>;
  const pool = pools[scenarioId] ?? [];
  if (!pool.length) return fallback;
  let hash = 2166136261;
  for (const char of `${scenarioId}:${seed}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return pool[(hash >>> 0) % pool.length];
}

function knowledgeItemForRule(language: AppLanguage, rule: SimDebriefRule): KnowledgeCardItem {
  const source = `${rule.id} ${rule.title.zh} ${rule.title.en}`.toLowerCase();
  const item = (enTitle: string, zhTitle: string, enDetail: string, zhDetail: string) => ({
    title: copyFor(language, enTitle, zhTitle),
    detail: copyFor(language, enDetail, zhDetail),
  });

  if (/110|police|报警/.test(source)) return item(
    "Police records",
    "报警记录的作用",
    "Each report creates a record that may support later protection requests.",
    "每次报警形成的接处警记录，可支持后续保护令或诉讼。"
  );
  if (/安全|safe|shelter|庇护/.test(source)) return item(
    "Safety comes first",
    "安全转移优先",
    "Move to a safe place before preserving evidence or continuing the process.",
    "先转移到安全地点，再考虑留证和后续维权步骤。"
  );
  if (/证人|witness|同事|neighbor|邻居/.test(source)) return item(
    "Witness evidence",
    "证人证言的作用",
    "People who saw, heard, or were told promptly may provide supporting evidence.",
    "现场目击、听见经过或被及时告知的人，都可能提供佐证。"
  );
  if (/受案回执|case receipt/.test(source)) return item(
    "Case Receipt",
    "受案回执",
    "It proves that police received the report and anchors later review steps.",
    "它证明警方已受理报案，也是后续复议的重要凭据。"
  );
  if (/保护令|protection order/.test(source)) return item(
    "Protection orders",
    "人身安全保护令",
    "A protection order can prohibit contact, harassment, following, or entry.",
    "保护令可禁止接触、骚扰、跟踪，或进入特定住所。"
  );
  if (/告诫书|warning letter/.test(source)) return item(
    "Warning Letter",
    "家庭暴力告诫书",
    "This official document records police intervention and strengthens the evidence chain.",
    "告诫书记录公安干预情况，可补强后续案件的文书链。"
  );
  if (/病历|医院|medical|hospital/.test(source)) return item(
    "Medical records",
    "医疗记录的证据作用",
    "Same-day records connect injuries, time, treatment, and the reported cause.",
    "当天病历可连接伤情、时间、治疗过程和受伤原因。"
  );
  if (/法医|鉴定|forensic/.test(source)) return item(
    "Forensic examination",
    "伤情鉴定",
    "A formal examination can document injury severity beyond ordinary photos.",
    "正式鉴定能够记录伤情程度，证明力通常高于普通照片。"
  );
  if (/笔录|transcript|statement/.test(source)) return item(
    "Review before signing",
    "笔录签字核对",
    "Check names, dates, events, and omissions before signing every page.",
    "签字前应核对姓名、日期、事件经过和遗漏内容。"
  );
  if (/聊天|截图|证据|record|document|衣物|paper bag/.test(source)) return item(
    "Preserve complete evidence",
    "完整留存证据",
    "Keep originals, context, timestamps, and backups instead of isolated screenshots.",
    "应保留原始内容、完整上下文、时间信息和安全备份。"
  );
  if (/拒绝|refusal/.test(source)) return item(
    "Record an explicit refusal",
    "明确拒绝并留痕",
    "A saved refusal helps show that the conduct was unwanted.",
    "明确拒绝并保留记录，有助于证明相关行为违背意愿。"
  );
  if (/监控|surveillance/.test(source)) return item(
    "Request footage early",
    "及时调取监控",
    "Many systems overwrite footage quickly, so requests should be made early.",
    "监控常会被循环覆盖，应尽早提出保存和调取申请。"
  );
  if (/复议|reconsideration|不予立案/.test(source)) return item(
    "Review after non-filing",
    "不立案后的救济",
    "A written non-filing decision can be challenged through review procedures.",
    "收到不予立案文书后，可在期限内申请复议或监督。"
  );
  if (/投诉|hr|complaint/.test(source)) return item(
    "Written complaints",
    "书面投诉留痕",
    "Written submissions preserve the time, facts, requests, and employer response.",
    "书面投诉能固定时间、事实、具体诉求和单位回应。"
  );

  return {
    title: copyFor(language, "A key response step", "关键应对步骤"),
    detail: conciseKnowledgeText(simText(language, rule.detail), language),
  };
}

function conciseKnowledgeText(text: string, language: AppLanguage): string {
  const neutral = language === "zh" ? text.replace(/你/g, "当事人") : text.replace(/\byou\b/gi, "a person");
  const limit = language === "zh" ? 38 : 82;
  if (neutral.length <= limit) return neutral;
  const punctuation = language === "zh" ? /[，。；]/ : /[,.;]/;
  const firstClause = neutral.split(punctuation)[0];
  return firstClause.length >= 12 && firstClause.length <= limit ? `${firstClause}。` : `${neutral.slice(0, limit - 1)}…`;
}

function conciseFeedbackTitle(text: string, language: AppLanguage): string {
  const core = text.split(/——|--|—/)[0].trim();
  const limit = language === "zh" ? 15 : 34;
  return core.length <= limit ? core : core.slice(0, limit);
}

function correctSupportText(language: AppLanguage, rule: SimDebriefRule): string {
  const source = `${rule.id} ${rule.title.zh} ${rule.detail.zh}`.toLowerCase();
  if (/还手|对质|confront|retaliat/.test(source)) {
    return copyFor(language, "Leaving safely is safer than confronting danger", "优先脱离现场，比正面对抗更安全");
  }
  if (/现场|scene|改动/.test(source)) {
    return copyFor(language, "Preserving the scene supports later investigation", "保留原始现场，有助于后续调查取证");
  }
  if (/110|报警|police|报案/.test(source)) {
    return copyFor(language, "A formal report creates a traceable police record", "正式报警能够形成可追踪的警方记录");
  }
  if (/安全|safe|庇护|shelter/.test(source)) {
    return copyFor(language, "Reach safety before handling the next steps", "先到安全地点，再处理后续步骤");
  }
  if (/证人|witness|邻居|同事/.test(source)) {
    return copyFor(language, "Prompt disclosure may help establish witness evidence", "及时告知他人，有助于形成证人证言");
  }
  if (/保护令|protection order/.test(source)) {
    return copyFor(language, "Protection orders may restrict contact and following", "保护令可限制接触、骚扰和跟踪行为");
  }
  if (/病历|医院|medical|hospital/.test(source)) {
    return copyFor(language, "Same-day care records the injury and its timing", "当天就医可以固定伤情和发生时间");
  }
  if (/证据|记录|聊天|截图|evidence|record/.test(source)) {
    return copyFor(language, "Complete originals make evidence more reliable", "完整保留原件，可以提高证据可信度");
  }
  const text = simText(language, rule.detail).replace(/你/g, "");
  return text.slice(0, language === "zh" ? 20 : 48).replace(/[，,；;：:]$/, "");
}

function scoreTitleForScenario(language: AppLanguage, scenarioId: string): string {
  if (scenarioId === "sexual-harassment") {
    return copyFor(
      language,
      "Sexual-harassment response · Knowledge score",
      "性骚扰安全应对 · 知识储备得分"
    );
  }
  if (scenarioId === "sexual-assault") {
    return copyFor(
      language,
      "Post-assault response · Knowledge score",
      "性侵害后续应对 · 知识储备得分"
    );
  }
  if (scenarioId === "technology-facilitated-gender-violence") {
    return copyFor(
      language,
      "Technology-facilitated abuse · Safety knowledge score",
      "技术促成的性别暴力 · 安全知识得分"
    );
  }
  return copyFor(
    language,
    "Domestic-violence response · Knowledge score",
    "家庭暴力安全应对 · 知识储备得分"
  );
}

function SimulationResultReport({
  language,
  score,
  scenarioTitle,
  scenarioTagline,
  endingTitle,
  endingSummary,
  summary,
  protectiveItems,
  avoidedRiskItems,
}: {
  language: AppLanguage;
  score: SimulationScoreResult;
  scenarioTitle: string;
  scenarioTagline: string;
  endingTitle: string;
  endingSummary: string;
  summary: DomesticScoreCardSummary;
  protectiveItems: ResultInsightItem[];
  avoidedRiskItems: ResultInsightItem[];
}) {
  return (
    <div data-testid="simulation-result-report" className="flex flex-col gap-3">
      <section className="relative overflow-hidden rounded-[28px] border border-[#c084fc]/25 bg-[linear-gradient(180deg,#15142f_0%,#09091d_100%)] p-5 shadow-[0_24px_70px_rgba(5,4,22,0.42)] sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-[#f472b6]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#c084fc]/10 blur-3xl"
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-bold tracking-[0.1em] text-[#f472b6]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {copyFor(language, "Scenario simulation · result report", "情景模拟 · 结果报告")}
          </div>
          <h1 className="mt-5 max-w-xl text-2xl font-black leading-[1.3] tracking-tight text-white">
            {simText(language, score.headline)}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/75">
            {simText(language, score.detail)}
          </p>

          <ResultInsightPanels
            language={language}
            protectiveItems={protectiveItems}
            avoidedRiskItems={avoidedRiskItems}
          />

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#f472b6]/35 bg-[#f472b6]/10 px-3 py-1.5 text-sm font-bold text-[#f5a6d0]">
                {scenarioTitle}
              </span>
              <span className="text-sm font-semibold text-white/50">
                {copyFor(language, "This run's ending", "本次结局")}
              </span>
            </div>
            <h2 className="mt-3 text-[22px] font-black leading-8 text-white">{endingTitle}</h2>
            <p className="mt-2 text-base leading-7 text-white/75">{endingSummary}</p>
          </div>
        </div>
      </section>

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
  );
}

function RealFlowSection({ language, steps }: { language: AppLanguage; steps: { en: string; zh: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-primary/25 bg-card/90 p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-base font-bold leading-6 text-foreground">
            {copyFor(language, `Real-world process and options (${steps.length})`, `真实流程与参考步骤（${steps.length}）`)}
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
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">
                {i + 1}
              </span>
              <p className="text-base leading-7 text-foreground/85">{simText(language, step)}</p>
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
    <div className="rounded-2xl border border-primary/25 bg-card/90 p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-base font-bold leading-6 text-foreground">
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
            <div key={i} className="rounded-xl border border-border/50 bg-secondary/30 px-3.5 py-3">
              <p className="text-base font-bold leading-6 text-foreground">{simText(language, g.term)}</p>
              <p className="mt-1.5 text-[15px] leading-7 text-foreground/75">{simText(language, g.note)}</p>
            </div>
          ))}
        </div>
      )}
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
  const correctItemsKey = summary?.correctItems
    .map((item) => `${item.title}\u001e${item.detail ?? ""}`)
    .join("\u001f") ?? "";
  const educationItemsKey = summary?.educationItems
    .map((item) => `${item.title}\u001e${item.detail ?? ""}`)
    .join("\u001f") ?? "";

  // Auto-generate the image on mount
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        setBusy(true);
        setError(false);
        const blob = await renderScoreCard({
          language: language === "de" ? "en" : language,
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
    summary?.scoreTitle,
    summary?.shareHint,
    summary?.correctTitle,
    correctItemsKey,
    summary?.educationTitle,
    educationItemsKey,
    summary?.qrLabel,
    summary?.sceneTipTitle,
    summary?.sceneTip,
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
    <img
      data-testid="shareable-score-card"
      src={imageUrl}
      alt={copyFor(language, "Result card", "结果卡片")}
      className="shareable-score-card w-full rounded-2xl"
    />
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
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <h3 className="text-base font-bold leading-6 text-primary">
          💡 {copyFor(language, `Practical tips from your path (${hints.length})`, `本次流程中的实用提示（${hints.length} 条）`)}
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
              className="rounded-xl bg-card/60 px-3.5 py-3 text-[15px] leading-7 text-foreground/85"
            >
              {simText(language, h.text)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
