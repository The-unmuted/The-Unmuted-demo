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
import { X } from "lucide-react";
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

          <img
            src={POPUP_SRC}
            alt={copyFor(language, "Welcome to The Unmuted — tell us what you think", "欢迎使用非默 — 我们期待你的反馈")}
            className="block h-auto w-full select-none"
            draggable={false}
          />

          <DialogPrimitive.Close
            aria-label={copyFor(language, "Close", "关闭")}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
            <span className="sr-only">{copyFor(language, "Close", "关闭")}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
