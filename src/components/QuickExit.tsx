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
import { CloudSun, DoorOpen, ShieldQuestion, X } from "lucide-react";
import { copyFor, type AppLanguage } from "@/lib/locale";

function leaveNow(language: AppLanguage): void {
  const url =
    language === "zh"
      ? "https://www.baidu.com/s?wd=%E5%A4%A9%E6%B0%94"
      : "https://www.google.com/search?q=weather";
  window.location.replace(url);
}

/**
 * Returnable weather exit. Unlike QuickExitButton, this intentionally keeps
 * the current page in browser history so the native Back gesture/button can
 * return to the app on Safari, Chrome, Firefox, Edge, and mobile WebViews.
 */
function openWeather(language: AppLanguage): void {
  const url =
    language === "zh"
      ? "https://www.baidu.com/s?wd=%E5%A4%A9%E6%B0%94"
      : "https://www.google.com/search?q=weather";
  window.location.assign(url);
}

export function WeatherExitButton({ language }: { language: AppLanguage }) {
  return (
    <button
      type="button"
      onClick={() => openWeather(language)}
      className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-300/35 bg-sky-300/10 text-sky-200 shadow-[0_0_18px_hsl(196_90%_70%/0.12)] transition-[background-color,box-shadow,transform] duration-100 ease-out hover:bg-sky-300/20 hover:shadow-[0_0_22px_hsl(196_90%_70%/0.22)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={copyFor(language, "Open weather (Back returns here)", "打开天气（返回键可回到本站）")}
      title={copyFor(language, "Weather · Back returns here", "天气 · 返回键可回到本站")}
    >
      <CloudSun className="h-4 w-4 transition-transform duration-100 ease-out group-hover:-translate-y-px" aria-hidden="true" />
    </button>
  );
}

export function QuickExitButton({ language }: { language: AppLanguage }) {
  return (
    <button
      onClick={() => leaveNow(language)}
      type="button"
      className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card/90 px-3 text-[11px] font-bold leading-none text-muted-foreground transition-[background-color,transform] duration-100 ease-out hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      title: copyFor(language, "Returnable weather button", "可返回的天气按钮"),
      body: copyFor(
        language,
        "The small cloud button opens weather while keeping this page in browser history. Use the browser Back button or gesture to return. If your phone may be checked, use the Exit button instead.",
        "小云朵按钮会打开天气，但会保留本站历史记录。可用浏览器返回键或返回手势回来。如果手机可能被翻看，请改用“离开”按钮。"
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
