/**
 * 社会工作 — Social Work & Community Support
 *
 * Numbers and links are sourced from the two user-provided articles or the
 * organisation's own website. The directory's verification date is shown on
 * every card so people can make an informed choice before calling.
 */
import { HandHeart } from "lucide-react";
import { AppLanguage, copyFor } from "@/lib/locale";
import AidResourceList from "@/components/AidResourceList";

interface SocialWorkPageProps {
  language: AppLanguage;
}

export default function SocialWorkPage({ language }: SocialWorkPageProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <div className="pt-2 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <HandHeart className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-black text-foreground">
          {copyFor(language, "Social Work & Community Support", "社会工作与社区支持")}
        </h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {copyFor(
            language,
            "Case support, safety planning, shelter referrals, family support, and community resources.",
            "提供个案支持、安全计划、庇护转介、家庭支持与社区资源链接。",
          )}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {copyFor(language, "Community organisations", "社区服务机构")}
        </h2>
        <AidResourceList category="social-work" language={language} />
      </section>

      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span className="font-semibold text-foreground/60">
          {copyFor(language, "Note · 提示", "提示")}
        </span>{"  "}
        {copyFor(
          language,
          "Social-work organisations may offer referral, accompaniment, or group support rather than emergency response. If you are in immediate danger, call 110 first.",
          "社会工作机构可能提供转介、陪伴或互助支持，不一定提供紧急出警服务。如处于即时危险中，请先拨打 110。",
        )}
      </div>
    </div>
  );
}
