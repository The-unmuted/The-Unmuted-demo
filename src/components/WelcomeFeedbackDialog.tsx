/**
 * WelcomeFeedbackDialog — first-run popup shown after the user taps
 * "进入内测" on the DemoWelcome screen. Points them at the feedback
 * widget (top-right envelope) and the WeChat tester group button (👗)
 * so they know how to give us feedback / join the group.
 *
 * Frequency: shown only on first entry per browser. We set a
 * localStorage flag after it closes so returning users are not nagged.
 * Katie can force it back on for a session by clearing the flag via
 * DevTools: `localStorage.removeItem('unmuted:welcome-feedback-seen')`.
 *
 * The popup content is a single pre-rendered image at
 * /public/welcome-feedback-popup.jpg so copy / illustration edits
 * happen in the design file, not in code.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Mail, MessageCircle, X } from "lucide-react";
import { AppLanguage, copyFor } from "@/lib/locale";

const POPUP_SRC = "/welcome-feedback-popup.jpg";

// Bump the version if you want to re-show the popup to everyone (e.g.
// when the artwork changes materially).
export const WELCOME_POPUP_SEEN_KEY = "unmuted:welcome-feedback-seen:v1";

export function hasSeenWelcomePopup(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage.getItem(WELCOME_POPUP_SEEN_KEY);
  } catch {
    // localStorage may be blocked (private mode / storage disabled). Fall
    // back to "not seen" so the popup at least shows once per session.
    return false;
  }
}

export function markWelcomePopupSeen(): void {
  try {
    window.localStorage.setItem(WELCOME_POPUP_SEEN_KEY, new Date().toISOString());
  } catch {
    // Silent: if storage is blocked, we'll just show it again next time,
    // which is acceptable behavior in restricted browsers.
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-[min(92vw,420px)] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {copyFor(language, "Welcome to The Unmuted", "欢迎使用非默")}
          </DialogPrimitive.Title>

          {language === "de" ? (
            <div className="border border-primary/20 bg-card px-6 pb-7 pt-8 text-center text-foreground">
              <img
                src="/the-unmuted-mark.png"
                alt=""
                width={72}
                height={72}
                className="mx-auto h-16 w-16 object-contain drop-shadow-[0_0_22px_hsl(var(--primary)/0.32)]"
              />
              <h2 className="mt-4 text-xl font-black">Willkommen bei The Unmuted</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Danke, dass du diese frühe Version testest. Deine Hinweise helfen uns,
                Sicherheit, Verständlichkeit und Zugänglichkeit weiter zu verbessern.
              </p>
              <div className="mt-5 space-y-3 text-left">
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold">Feedback geben</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Nutze oben rechts die Umschlag-Schaltfläche, um Fehler oder Vorschläge zu senden.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
                  <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold">Mit der Testgruppe austauschen</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Über die 👗-Schaltfläche gelangst du zur WeChat-Testgruppe.
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Bitte verwende für Tests keine echten Beweismittel oder sensiblen persönlichen Daten.
              </p>
            </div>
          ) : (
            <img
              src={POPUP_SRC}
              alt={copyFor(language, "Welcome to The Unmuted — tell us what you think", "欢迎使用非默 — 我们期待你的反馈")}
              className="block h-auto w-full select-none"
              draggable={false}
            />
          )}

          <DialogPrimitive.Close
            aria-label={copyFor(language, "Close", "关闭")}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
            <span className="sr-only">{copyFor(language, "Close", "关闭")}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
