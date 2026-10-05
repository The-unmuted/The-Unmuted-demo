import { useState } from "react";
import {
  Brain,
  Clock3,
  ExternalLink,
  FileCheck2,
  HeartHandshake,
  Phone,
  Scale,
  ShieldAlert,
} from "lucide-react";
import {
  GERMANY_AID_RESOURCES,
  type GermanyAidCategory,
  type GermanyAidResource,
} from "@/data/germanyAid";

const CATEGORIES: Array<{
  id: GermanyAidCategory;
  label: string;
  icon: typeof Brain;
}> = [
  { id: "psych", label: "Psychische Hilfe", icon: Brain },
  { id: "legal", label: "Recht", icon: Scale },
  { id: "social", label: "Beratung", icon: HeartHandshake },
];

export default function GermanyAidPage() {
  const [category, setCategory] = useState<GermanyAidCategory>("social");
  const resources = GERMANY_AID_RESOURCES.filter((resource) => resource.category === category);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4">
      <header className="pt-2 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <HeartHandshake className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-black text-foreground">Hilfe in Deutschland</h1>
        <p className="mx-auto mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Bundesweite, öffentlich dokumentierte Anlaufstellen. Telefonnummern und Angaben
          wurden am 1. Oktober 2026 mit den verlinkten Originalquellen abgeglichen.
        </p>
      </header>

      <section
        aria-labelledby="de-emergency-title"
        className="rounded-2xl border border-destructive/35 bg-destructive/5 p-4"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="de-emergency-title" className="text-sm font-black text-foreground">
              Akute Gefahr oder medizinischer Notfall
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Polizei: 110 · Rettungsdienst und Feuerwehr: 112. Wenn ein Anruf nicht sicher
              möglich ist, gehe – soweit möglich – zu einer anderen Person oder an einen
              öffentlichen Ort.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href="tel:110"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-3 text-sm font-black text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Polizei 110
              </a>
              <a
                href="tel:112"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-background/60 px-3 text-sm font-black text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Notruf 112
              </a>
            </div>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Hilfekategorien"
        className="grid grid-cols-3 rounded-2xl border border-border/60 bg-card/70 p-1"
      >
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          const active = item.id === category;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="de-aid-resources"
              onClick={() => setCategory(item.id)}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <section id="de-aid-resources" role="tabpanel" className="space-y-3">
        {resources.map((resource) => (
          <GermanyResourceCard key={resource.id} resource={resource} />
        ))}
      </section>

      <aside className="rounded-2xl border border-border/70 bg-card/45 p-4 text-xs leading-5 text-muted-foreground">
        <p className="flex items-center gap-2 font-bold text-foreground">
          <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Zur Einordnung
        </p>
        <p className="mt-2">
          Verfügbarkeit, Aufnahmeplätze und regionale Zuständigkeiten können sich ändern.
          Nutze deshalb für die letzte Prüfung immer die verlinkte Originalseite. Diese
          Übersicht ersetzt keine individuelle medizinische oder rechtliche Beratung.
        </p>
      </aside>
    </div>
  );
}

function GermanyResourceCard({ resource }: { resource: GermanyAidResource }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black leading-5 text-foreground">{resource.name}</h2>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">{resource.organization}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
          bundesweit
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-foreground/85">{resource.description}</p>

      <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{resource.hours}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Themen">
        {resource.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border/70 bg-background/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {resource.phoneAlt && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Weitere Nummern: <span className="font-semibold text-foreground/85">{resource.phoneAlt}</span>
        </p>
      )}

      <div className={`mt-4 grid gap-2 ${resource.phone ? "grid-cols-2" : "grid-cols-1"}`}>
        {resource.phone && (
          <a
            href={`tel:${resource.phone.replace(/\s/g, "")}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {resource.phone}
          </a>
        )}
        <a
          href={resource.websiteUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/5 px-3 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Website <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <a
        href={resource.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Originalquelle prüfen <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </article>
  );
}
