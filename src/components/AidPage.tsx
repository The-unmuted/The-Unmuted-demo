/**
 * 援助 — merged Mental Health + Legal Aid tab (2026-07-30).
 * Segmented toggle at the top; each segment renders the existing page unchanged.
 */
import { useState } from "react";
import { Brain, Scale } from "lucide-react";
import { AppLanguage, copyFor } from "@/lib/locale";
import PsychPage from "@/components/PsychPage";
import LegalPage from "@/components/LegalPage";

interface AidPageProps {
  language: AppLanguage;
}

type AidSegment = "psych" | "legal";

export default function AidPage({ language }: AidPageProps) {
  const [segment, setSegment] = useState<AidSegment>("psych");

  const segments = [
    { id: "psych" as const, english: "Mental Health", chinese: "心理", icon: Brain },
    { id: "legal" as const, english: "Legal Aid", chinese: "法律", icon: Scale },
  ];

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 px-4 pt-3 pb-2 backdrop-blur-sm">
        <div
          role="tablist"
          aria-label={copyFor(language, "Aid categories", "援助类别")}
          className="mx-auto flex max-w-sm rounded-2xl border border-border/60 bg-card/70 p-1"
        >
          {segments.map((s) => {
            const Icon = s.icon;
            const isActive = segment === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setSegment(s.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {copyFor(language, s.english, s.chinese)}
              </button>
            );
          })}
        </div>
      </div>

      {segment === "psych" ? (
        <PsychPage language={language} />
      ) : (
        <LegalPage language={language} />
      )}
    </div>
  );
}
