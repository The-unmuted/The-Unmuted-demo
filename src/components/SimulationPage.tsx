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
  ending: SimEnding | null;
}

export default function SimulationPage({ language, onGoToAid }: SimulationPageProps) {
  const [run, setRun] = useState<RunState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [run?.log.length, run?.ending]);

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
    if (scene.coach) items.push({ kind: "coach", text: simText(language, scene.coach) });
    return items;
  };

  /** Advance into a scene; auto-scenes resolve immediately (possibly chained). */
  const enterScene = (
    scenario: SimScenario,
    sceneId: string,
    log: ChatItem[],
    flags: Set<string>
  ): RunState => {
    let current = sceneId;
    for (;;) {
      const scene = scenario.scenes[current];
      log = [...log, ...sceneItems(scenario, current)];
      if (!scene.auto) return { scenario, log, sceneId: current, flags, ending: null };
      const next = resolveAuto(scene, flags);
      if (!next) return { scenario, log, sceneId: current, flags, ending: null };
      if (isEndingTarget(next))
        return { scenario, log, sceneId: null, flags, ending: scenario.endings[endingIdOf(next)] };
      current = next;
    }
  };

  const startScenario = (scenario: SimScenario) => {
    const log: ChatItem[] = [{ kind: "narration", text: simText(language, scenario.intro) }];
    setRun(enterScene(scenario, scenario.entry, log, new Set()));
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
      setRun(enterScene(run.scenario, choice.next, log, flags));
    }
  };

  if (!run) {
    return <ScenarioPicker language={language} onStart={startScenario} />;
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

      {/* Chat log */}
      <div className="flex flex-col gap-2.5">
        {run.log.map((item, i) => (
          <ChatBubble key={i} item={item} />
        ))}
      </div>

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
        <EndingView
          language={language}
          scenario={run.scenario}
          ending={run.ending}
          flags={run.flags}
          onRetry={() => startScenario(run.scenario)}
          onExit={() => setRun(null)}
          onGoToAid={onGoToAid}
        />
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
  onRetry,
  onExit,
  onGoToAid,
}: {
  language: AppLanguage;
  scenario: SimScenario;
  ending: SimEnding;
  flags: Set<string>;
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

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <h2 className="text-base font-black text-foreground">{simText(language, ending.title)}</h2>
        <p className="mt-2 text-sm leading-6 text-foreground/85">{simText(language, ending.summary)}</p>
      </div>

      {/* Debrief section heading */}
      <h2 className="text-sm font-bold text-foreground px-1">
        {copyFor(language, "Debrief", "复盘")}
      </h2>

      {/* Good items — triggered */}
      {good.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-600">
            {copyFor(language, "✅ What you did right", "✅ 你做对了")}
          </h3>
          <div className="flex flex-col gap-3">
            {good.map((r) => <DebriefCard key={r.id} rule={r} language={language} />)}
          </div>
        </div>
      )}

      {/* Bad items — triggered (user made these mistakes) */}
      {triggeredBad.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-destructive">
            {copyFor(language, "❌ What went wrong this run", "❌ 这次出了问题的环节")}
          </h3>
          <div className="flex flex-col gap-3">
            {triggeredBad.map((r) => <DebriefCard key={r.id} rule={r} language={language} />)}
          </div>
        </div>
      )}

      {/* Bad items — avoided (user didn't trigger, but should know about) */}
      {avoidedBad.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-amber-600">
            {copyFor(language, "⚠️ Risks to know — you avoided these this time", "⚠️ 需要了解的风险——这次你避开了")}
          </h3>
          <div className="flex flex-col gap-3">
            {avoidedBad.map((r) => <DebriefCard key={r.id} rule={r} language={language} avoided />)}
          </div>
        </div>
      )}

      {triggered.length === 0 && allBad.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {copyFor(language, "No debrief entries for this run.", "这条路线没有产生复盘条目。")}
          </p>
        </div>
      )}

      <RealFlowSection language={language} steps={scenario.realFlow} />

      {scenario.glossary && scenario.glossary.length > 0 && (
        <GlossarySection language={language} terms={scenario.glossary} />
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

function RealFlowSection({ language, steps }: { language: AppLanguage; steps: { en: string; zh: string }[] }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {copyFor(language, "Real process — the right steps", "真实流程——正确的做法")}
        </h3>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
              {i + 1}
            </span>
            <p className="text-sm leading-6 text-foreground/85">{simText(language, step)}</p>
          </li>
        ))}
      </ol>
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
  const cardClass = isGood
    ? "border-emerald-500/30 bg-emerald-500/5"
    : avoided
    ? "border-amber-400/30 bg-amber-50/60 opacity-80"
    : "border-destructive/30 bg-destructive/5";
  const icon = isGood ? (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
  ) : avoided ? (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
  ) : (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  );
  return (
    <div className={`rounded-xl border p-3 ${cardClass}`}>
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <p className="text-sm font-bold text-foreground">{simText(language, rule.title)}</p>
          <p className="mt-1 text-xs leading-5 text-foreground/80">{simText(language, rule.detail)}</p>
          {rule.basis && (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
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
