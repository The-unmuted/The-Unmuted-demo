/**
 * First-run guidance shown after entry. It points people to the feedback
 * control and the official The Unmuted website without relying on a static
 * language-specific artwork.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, Globe2, Mail, X } from "lucide-react";
import { OFFICIAL_WEBSITE_URL } from "@/components/OfficialWebsiteButton";
import { type AppLanguage, copyFor } from "@/lib/locale";

// The content and destination changed materially, so show the revised guide
// once even to visitors who saw the earlier tester-group version.
export const WELCOME_POPUP_SEEN_KEY = "unmuted:welcome-feedback-seen:v2";

export function hasSeenWelcomePopup(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage.getItem(WELCOME_POPUP_SEEN_KEY);
  } catch {
    return false;
  }
}

export function markWelcomePopupSeen(): void {
  try {
    window.localStorage.setItem(WELCOME_POPUP_SEEN_KEY, new Date().toISOString());
  } catch {
    // If storage is blocked, showing the guidance again next time is safe.
  }
}

export default function WelcomeFeedbackDialog({
  open,
  onOpenChange,
  language,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  language: AppLanguage;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-primary/20 bg-card px-6 pb-7 pt-8 text-foreground shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {copyFor(
              language,
              "Welcome to The Unmuted",
              "欢迎使用非默",
              "Willkommen bei The Unmuted",
            )}
          </DialogPrimitive.Title>

          <div className="text-center">
            <img
              src="/the-unmuted-mark.png"
              alt=""
              width={72}
              height={72}
              className="mx-auto h-16 w-16 object-contain drop-shadow-[0_0_22px_hsl(var(--primary)/0.32)]"
            />
            <h2 className="mt-4 text-xl font-black">
              {copyFor(
                language,
                "Welcome to The Unmuted",
                "欢迎使用非默",
                "Willkommen bei The Unmuted",
              )}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {copyFor(
                language,
                "Thank you for testing this early version. Your feedback helps us improve its safety, clarity, and accessibility.",
                "感谢你参与体验。你的反馈会帮助我们继续改善产品的安全性、清晰度和无障碍体验。",
                "Danke, dass du diese frühe Version testest. Deine Hinweise helfen uns, Sicherheit, Verständlichkeit und Zugänglichkeit weiter zu verbessern.",
              )}
            </p>

            <div className="mt-5 space-y-3 text-left">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold">
                    {copyFor(language, "Share feedback", "给我们反馈", "Feedback geben")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {copyFor(
                      language,
                      "Use the envelope button at the top right to report a problem or suggest an improvement.",
                      "点击右上角的信封按钮，告诉我们遇到的问题或你的改进建议。",
                      "Nutze oben rechts die Umschlag-Schaltfläche, um ein Problem oder einen Verbesserungsvorschlag zu senden.",
                    )}
                  </p>
                </div>
              </div>

              <a
                href={OFFICIAL_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-20 items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 transition-[background-color,border-color,transform] duration-100 ease-out hover:border-primary/55 hover:bg-primary/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    {copyFor(
                      language,
                      "Visit our official website",
                      "访问非默官方网站",
                      "Unsere offizielle Website besuchen",
                    )}
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 transition-transform duration-100 ease-out group-hover:-translate-y-px group-hover:translate-x-px"
                      aria-hidden="true"
                    />
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {copyFor(
                      language,
                      "Learn more about our mission, team, and latest work.",
                      "进一步了解我们的使命、团队和最新进展。",
                      "Erfahre mehr über unsere Mission, unser Team und unsere aktuelle Arbeit.",
                    )}
                  </p>
                </div>
              </a>
            </div>

            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              {copyFor(
                language,
                "Please do not use real evidence or sensitive personal data while testing.",
                "测试时请勿使用真实证据或敏感个人信息。",
                "Bitte verwende für Tests keine echten Beweismittel oder sensiblen persönlichen Daten.",
              )}
            </p>
          </div>

          <DialogPrimitive.Close
            aria-label={copyFor(language, "Close", "关闭", "Schließen")}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur-md transition-[background-color,transform] duration-100 ease-out hover:bg-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            <span className="sr-only">
              {copyFor(language, "Close", "关闭", "Schließen")}
            </span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
