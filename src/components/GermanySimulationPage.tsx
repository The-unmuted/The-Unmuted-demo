import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Compass,
  ExternalLink,
  FileText,
  LifeBuoy,
  Phone,
  RotateCcw,
  Scale,
  ShieldCheck,
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
import {
  GERMANY_DOMESTIC_VIOLENCE_SCENARIO as SCENARIO,
  GERMANY_SEXUAL_ASSAULT_SCENARIO,
  GERMANY_SEXUAL_HARASSMENT_SCENARIO,
  type GermanySimulationChoice,
  type GermanySimulationScene,
} from "@/data/germanySimulation";

interface GermanySimulationPageProps {
  onGoToAid: () => void;
}

type LogItem =
  | { kind: "narration"; text: string }
  | { kind: "me"; text: string }
  | { kind: "feedback"; text: string };

interface RunState {
  sceneId: string | null;
  endingId: string | null;
  flags: Set<string>;
  log: LogItem[];
}

const scenes = SCENARIO.scenes as Record<string, GermanySimulationScene>;
const SCENARIOS = [SCENARIO, GERMANY_SEXUAL_ASSAULT_SCENARIO, GERMANY_SEXUAL_HARASSMENT_SCENARIO] as const;
type GermanyScenario = (typeof SCENARIOS)[number];

export default function GermanySimulationPage({ onGoToAid }: GermanySimulationPageProps) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<GermanyScenario>(SCENARIO);
  const [run, setRun] = useState<RunState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [run?.log.length, run?.endingId]);

  const startScenario = () => {
    setWarningOpen(false);
    setRun({
      sceneId: selectedScenario.entry,
      endingId: null,
      flags: new Set(),
      log: [{ kind: "narration", text: selectedScenario.scenes[selectedScenario.entry].narration }],
    });
  };

  const choose = (choice: GermanySimulationChoice) => {
    if (!run) return;
    const flags = new Set(run.flags);
    choice.flags?.forEach((flag) => flags.add(flag));
    const nextLog: LogItem[] = [
      ...run.log,
      { kind: "me", text: choice.text },
      { kind: "feedback", text: choice.feedback },
    ];

    if (choice.next.startsWith("end:")) {
      setRun({
        sceneId: null,
        endingId: choice.next.slice(4),
        flags,
        log: nextLog,
      });
      return;
    }

    setRun({
      sceneId: choice.next,
      endingId: null,
      flags,
      log: [...nextLog, { kind: "narration", text: selectedScenario.scenes[choice.next].narration }],
    });
  };

  if (!run) {
    return (
      <>
        <GermanyScenarioPicker
          selectedScenarioId={selectedScenario.id}
          onSelect={(scenario) => setSelectedScenario(scenario)}
          onStart={(scenario) => {
            setSelectedScenario(scenario);
            setWarningOpen(true);
          }}
        />
        <SensitiveWarning
          open={warningOpen}
          onBack={() => setWarningOpen(false)}
          onContinue={startScenario}
        />
      </>
    );
  }

  const currentScenes = selectedScenario.scenes as Record<string, GermanySimulationScene>;
  const scene = run.sceneId ? currentScenes[run.sceneId] : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setRun(null)}
          className="flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Übung verlassen
        </button>
        <button
          type="button"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((current) => !current)}
          className="flex min-h-10 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Ich brauche echte Hilfe
        </button>
      </div>

      {helpOpen && <RealHelpPanel onGoToAid={onGoToAid} />}

      {!run.endingId && (
        <>
          <div className="flex flex-col gap-2.5">
            {run.log.map((item, index) => (
              <ChatBubble key={`${item.kind}-${index}`} item={item} />
            ))}
          </div>

          {scene && (
            <section className="mt-1 space-y-3" aria-label="Nächste Entscheidung">
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3">
                <p className="flex items-start gap-2 text-xs leading-5 text-foreground/80">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{scene.coach}</span>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {scene.choices.map((choice, index) => (
                  <button
                    key={`${run.sceneId}-${index}`}
                    type="button"
                    onClick={() => choose(choice)}
                    className="min-h-11 rounded-2xl border border-primary/35 bg-card px-4 py-3 text-left text-sm font-semibold leading-5 text-foreground transition-[background-color,border-color,transform] hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {run.endingId && (
        <GermanyResult
          scenario={selectedScenario}
          endingId={run.endingId}
          flags={run.flags}
          onRetry={startScenario}
          onExit={() => setRun(null)}
          onGoToAid={onGoToAid}
        />
      )}

      <p className="pb-2 text-center text-xs leading-5 text-muted-foreground">
        Bildungsangebot, keine Rechtsberatung. Deine Auswahl wird nicht gespeichert oder hochgeladen.
      </p>
      <div ref={bottomRef} />
    </div>
  );
}

function GermanyScenarioPicker({
  selectedScenarioId,
  onSelect,
  onStart,
}: {
  selectedScenarioId: string;
  onSelect: (scenario: GermanyScenario) => void;
  onStart: (scenario: GermanyScenario) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4">
      <header className="pt-2 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-black text-foreground">Übungssimulator Deutschland</h1>
        <p className="mx-auto mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Erprobe sichere Handlungsmöglichkeiten anhand dokumentierter deutscher Praxisfälle,
          offizieller Hilfswege und geltender Rechtsgrundlagen.
        </p>
      </header>

      <section aria-labelledby="de-scenario-title">
        <h2
          id="de-scenario-title"
          className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
        >
          Szenario auswählen
        </h2>
        <div className="space-y-2">
          {SCENARIOS.map((scenario) => {
            const selected = scenario.id === selectedScenarioId;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => { onSelect(scenario); onStart(scenario); }}
                aria-pressed={selected}
                className={`w-full rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-primary/60 bg-primary/5" : "border-primary/30 bg-card"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-base font-black text-foreground">{scenario.title}</span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-500">
                    Nicht-grafisch · Quellen geprüft
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{scenario.tagline}</p>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-2xl border border-border/70 bg-card/45 p-4 text-xs leading-5 text-muted-foreground">
        <p className="font-bold text-foreground">Was „realitätsbasiert“ hier bedeutet</p>
        <p className="mt-2">
          Das Szenario kombiniert wiederkehrende, öffentlich dokumentierte Fallmuster. Es
          kopiert keine identifizierbare Geschichte. Polizeiliche Schritte, bundesweite
          Hilfsangebote und Gesetze sind mit Originalquellen belegt; Maßnahmen der Polizei
          können je nach Bundesland abweichen.
        </p>
      </aside>
    </div>
  );
}

function SensitiveWarning({
  open,
  onBack,
  onContinue,
}: {
  open: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onBack()}>
      <AlertDialogContent className="w-[min(92vw,440px)] rounded-3xl border-primary/25 bg-card p-6">
        <AlertDialogHeader className="text-left">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="text-xl font-black text-foreground">
            Hinweis zu belastenden Inhalten
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
            Diese Übung thematisiert Gewalt, sexualisierte Gewalt, Drohungen, Verletzungen und
            rechtliche Verfahren. Inhalte können belasten oder traumatische Erinnerungen auslösen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-2xl border border-border/70 bg-background/45 p-4 text-sm leading-6 text-foreground/85">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Du kannst die Übung jederzeit verlassen.</li>
            <li>Es werden keine grafischen Gewaltdarstellungen gezeigt.</li>
            <li>Deine Entscheidungen werden nicht gespeichert oder hochgeladen.</li>
            <li>Bei akuter Gefahr: Polizei 110 oder Rettungsdienst 112.</li>
          </ul>
        </div>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onBack}
            className="mt-0 min-h-11 rounded-xl font-semibold focus-visible:ring-2 focus-visible:ring-ring"
          >
            Zurück
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="min-h-11 rounded-xl bg-primary font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Übung beginnen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RealHelpPanel({ onGoToAid }: { onGoToAid: () => void }) {
  return (
    <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs leading-5 text-muted-foreground">
        Dies ist nur eine Übung. Wenn gerade Gefahr besteht oder jemand verletzt ist, nutze
        eine echte Anlaufstelle:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href="tel:110"
          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-destructive/10 px-3 text-xs font-bold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Polizei 110
        </a>
        <a
          href="tel:112"
          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-destructive/10 px-3 text-xs font-bold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Notruf 112
        </a>
        <a
          href="tel:116016"
          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> 116 016
        </a>
        <button
          type="button"
          onClick={onGoToAid}
          className="min-h-10 rounded-xl bg-secondary px-3 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Alle Hilfsangebote
        </button>
      </div>
    </aside>
  );
}

function ChatBubble({ item }: { item: LogItem }) {
  if (item.kind === "narration") {
    return (
      <p className="mx-auto max-w-[92%] rounded-2xl bg-secondary/60 px-4 py-2.5 text-center text-[13px] leading-5 text-foreground/85">
        {item.text}
      </p>
    );
  }
  if (item.kind === "me") {
    return (
      <p className="ml-10 w-fit self-end rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-2.5 text-sm font-semibold leading-5 text-foreground">
        {item.text}
      </p>
    );
  }
  return (
    <p className="mx-auto max-w-[88%] rounded-xl border border-border/50 bg-card/50 px-3 py-2 text-center text-xs leading-5 text-foreground/75">
      {item.text}
    </p>
  );
}

function GermanyResult({
  scenario,
  endingId,
  flags,
  onRetry,
  onExit,
  onGoToAid,
}: {
  scenario: GermanyScenario;
  endingId: string;
  flags: Set<string>;
  onRetry: () => void;
  onExit: () => void;
  onGoToAid: () => void;
}) {
  const ending = scenario.endings[endingId];
  const triggered = scenario.debrief.filter((item) => flags.has(item.flag));
  const good = triggered.filter((item) => item.kind === "good");
  const risks = triggered.filter((item) => item.kind === "risk");
  const score = Math.max(0, Math.min(100, 40 + good.length * 9 - risks.length * 5));
  const band = score >= 80 ? "Gut vorbereitet" : score >= 60 ? "Solide Grundlage" : score >= 40 ? "Erste Schritte" : "Mehr Orientierung hilfreich";
  const scoreColor = score >= 80 ? "text-fuchsia-500" : score >= 60 ? "text-pink-400" : score >= 40 ? "text-rose-300" : "text-amber-300";
  const conicStop = `${Math.max(8, score)}%`;
  const scoreRingStyle = useMemo(
    () => ({
      background: `conic-gradient(hsl(var(--primary)) 0%, #e879f9 ${conicStop}, hsl(var(--secondary)) ${conicStop} 100%)`,
    }),
    [conicStop],
  );

  return (
    <div className="flex flex-col gap-3" data-testid="germany-simulation-result">
      <section className="overflow-hidden rounded-3xl border border-primary/30 bg-card">
        <div className="bg-gradient-to-br from-primary/15 via-card to-pink-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Übungsergebnis · Wissensstand
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0 rounded-full p-2" style={scoreRingStyle}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card">
                <span className={`text-4xl font-black ${scoreColor}`}>{score}</span>
                <span className="text-xs font-bold text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">{band}</p>
              <h2 className="mt-1 text-xl font-black leading-6 text-foreground">{ending.title}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-foreground/85">{ending.summary}</p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Der Wert misst nur, wie viele Schutz- und Hilfswege in dieser Übung erkannt wurden.
            Er bewertet niemals das Verhalten oder die Verantwortung einer betroffenen Person.
          </p>
        </div>
      </section>

      <ExpandableSection title="Was in diesem Durchlauf hilfreich war" icon={CheckCircle2}>
        {good.length > 0 ? (
          <div className="space-y-2">
            {good.map((item) => (
              <AnalysisCard key={item.id} title={item.title} detail={item.detail} basis={item.basis} />
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            In diesem Weg wurde noch kein formeller Schutzschritt ausgelöst. Die Hinweise unten
            zeigen, wo du später wieder einsteigen kannst.
          </p>
        )}
      </ExpandableSection>

      {risks.length > 0 && (
        <ExpandableSection title="Offene Risiken – ohne Schuldzuweisung" icon={AlertTriangle}>
          <div className="space-y-2">
            {risks.map((item) => (
              <AnalysisCard key={item.id} title={item.title} detail={item.detail} basis={item.basis} warning />
            ))}
          </div>
        </ExpandableSection>
      )}

      <ExpandableSection title="Realer Ablauf in Deutschland" icon={ShieldCheck} defaultOpen>
        <ol className="space-y-3">
          {scenario.realFlow.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-foreground/85">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </ExpandableSection>

      <ExpandableSection title="Rechtsbegriffe" icon={Scale}>
        <dl className="space-y-3">
          {scenario.glossary.map((item) => (
            <div key={item.term} className="rounded-xl bg-background/45 p-3">
              <dt className="text-sm font-black text-foreground">{item.term}</dt>
              <dd className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</dd>
            </div>
          ))}
        </dl>
      </ExpandableSection>

      <ExpandableSection title="Originalquellen" icon={FileText}>
        <div className="space-y-2">
          {scenario.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block min-h-11 rounded-xl border border-border/70 bg-background/45 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-start justify-between gap-2 text-sm font-bold text-foreground">
                {source.label}
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{source.detail}</span>
            </a>
          ))}
        </div>
      </ExpandableSection>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Anderen Weg üben
        </button>
        <button
          type="button"
          onClick={onGoToAid}
          className="min-h-11 rounded-2xl border border-primary/40 bg-primary/5 px-4 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Echte Hilfsangebote öffnen
        </button>
        <button
          type="button"
          onClick={onExit}
          className="min-h-10 rounded-xl px-4 text-sm font-semibold text-muted-foreground hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Zurück zur Szenarioauswahl
        </button>
      </div>
    </div>
  );
}

function ExpandableSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: typeof ShieldCheck;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-border/70 bg-card p-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {title}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function AnalysisCard({
  title,
  detail,
  basis,
  warning = false,
}: {
  title: string;
  detail: string;
  basis: string;
  warning?: boolean;
}) {
  return (
    <article className={`rounded-xl p-3 ${warning ? "bg-amber-500/5" : "bg-primary/5"}`}>
      <h3 className="text-sm font-black text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-foreground/80">{detail}</p>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Grundlage: {basis}</p>
    </article>
  );
}
