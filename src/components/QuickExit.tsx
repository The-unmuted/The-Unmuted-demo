/**
 * Usage-trace protection (D-028).
 *
 * QuickExitButton: one tap swaps this page for a neutral weather search via
 * location.replace, so the Back button does not return here.
 * SafetyTips: plain-language guidance on private browsing + clearing history.
 * Standard practice on DV-support sites; the biggest real-world threat is
 * someone close to the user picking up her phone.
 */

import { useState } from "react";
import { DoorOpen, ShieldQuestion, X } from "lucide-react";
import { copyFor, type AppLanguage } from "@/lib/locale";

function leaveNow(language: AppLanguage): void {
  const url =
    language === "zh"
      ? "https://www.baidu.com/s?wd=%E5%A4%A9%E6%B0%94"
      : "https://www.google.com/search?q=weather";
  window.location.replace(url);
}

export function QuickExitButton({ language }: { language: AppLanguage }) {
  return (
    <button
      onClick={() => leaveNow(language)}
      className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card/90 px-2 text-[11px] font-bold leading-none text-muted-foreground transition-colors hover:bg-accent"
      aria-label={copyFor(language, "Quick exit", "快速离开")}
    >
      <DoorOpen className="h-3.5 w-3.5" />
      {copyFor(language, "Exit", "离开")}
    </button>
  );
}

export function SafetyTips({
  language,
  variant,
}: {
  language: AppLanguage;
  variant: "link" | "menu-item";
}) {
  const [open, setOpen] = useState(false);

  const tips: Array<{ title: string; body: string }> = [
    {
      title: copyFor(language, "Quick exit", "快速离开"),
      body: copyFor(
        language,
        'Tap "Exit" at the top right and this page instantly becomes a weather search — the Back button will not come back here.',
        "点右上角“离开”，页面立刻变成天气搜索，按返回键也不会回到本站。"
      ),
    },
    {
      title: copyFor(language, "Use private browsing", "建议用无痕模式打开"),
      body: copyFor(
        language,
        "A private/incognito window leaves no history after you close it. iPhone Safari: tabs button → Private. Android Chrome: ⋮ → New Incognito tab.",
        "无痕窗口关闭后不留任何历史记录。iPhone Safari：右下角标签页按钮 → 无痕浏览。安卓 Chrome：右上角 ⋮ → 打开新的无痕式标签页。"
      ),
    },
    {
      title: copyFor(language, "Clear history afterwards", "事后清除历史"),
      body: copyFor(
        language,
        "If you didn't use private browsing: iPhone — Settings → Safari → Clear History and Website Data. Android Chrome — ⋮ → History → Clear browsing data.",
        "如果刚才没用无痕模式：iPhone——设置 → Safari → 清除历史记录与网站数据；安卓 Chrome——⋮ → 历史记录 → 清除浏览数据。"
      ),
    },
    {
      title: copyFor(language, "If your phone may be checked", "如果你的手机可能被翻看"),
      body: copyFor(
        language,
        "Prefer a safer device: a trusted friend's phone, or a public computer in a private window.",
        "优先用更安全的设备：信任的朋友的手机，或公共电脑的无痕窗口。"
      ),
    },
  ];

  return (
    <>
      {variant === "link" ? (
        <button
          onClick={() => setOpen(true)}
          className="mx-auto mt-4 block text-xs text-muted-foreground underline"
        >
          {copyFor(language, "How to use this site safely", "如何安全地使用本站")}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <ShieldQuestion className="h-4 w-4" />
          {copyFor(language, "Safe-use tips", "安全使用提示")}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-t-[1.75rem] border border-border bg-card p-5 text-left sm:rounded-[1.75rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {copyFor(language, "Using this site safely", "安全地使用本站")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground"
                aria-label={copyFor(language, "Close", "关闭")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {tips.map((tip) => (
                <div key={tip.title}>
                  <p className="text-xs font-bold text-foreground">{tip.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
