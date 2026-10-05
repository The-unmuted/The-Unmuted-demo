import { useEffect, useState } from "react";
import { Mail, X, Send, CheckCircle2, Loader2 } from "lucide-react";
import { copyFor, type AppLanguage } from "@/lib/locale";
import { supabase } from "@/lib/supabaseClient";

type FeedbackType = "bug" | "suggestion" | "other";

// Any component can open the widget with a prefilled message by dispatching
// this event, e.g. from the aid page's "submit a local hotline" box.
const OPEN_EVENT = "unmuted:open-feedback";

export function openFeedbackWidget(options?: { type?: FeedbackType; message?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: options ?? {} }));
}

interface FeedbackWidgetProps {
  language: AppLanguage;
}

export default function FeedbackWidget({ language }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: FeedbackType; message?: string }>).detail ?? {};
      setType(detail.type ?? "suggestion");
      setMessage(detail.message ?? "");
      setStatus("idle");
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_EVENT, handler as EventListener);
  }, []);

  const typeLabels: Record<FeedbackType, { en: string; zh: string }> = {
    bug:        { en: "Bug",        zh: "问题" },
    suggestion: { en: "Suggestion", zh: "建议" },
    other:      { en: "Other",      zh: "其他" },
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus("sending");
    if (!supabase) { setStatus("error"); return; }
    const { error } = await supabase
      .from("unmuted_feedback")
      .insert({ type, message: message.trim(), language });

    if (error) {
      setStatus("error");
    } else {
      setStatus("done");
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        setType("suggestion");
        setStatus("idle");
      }, 1800);
    }
  };

  return (
    <>
      {/* Trigger button — sits next to language toggle */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copyFor(language, "Feedback", "反馈")}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card/90 text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copyFor(language, "Send feedback", "发送反馈")}
          className="fixed left-1/2 top-1/2 z-50 w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-5 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">
              {copyFor(language, "Send feedback", "发送反馈")}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copyFor(language, "Close", "关闭")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {status === "done" ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-semibold text-foreground">
                {copyFor(language, "Thank you!", "感谢你的反馈！")}
              </p>
            </div>
          ) : (
            <>
              {/* Type selector */}
              <div className="mb-3 flex gap-2">
                {(["bug", "suggestion", "other"] as FeedbackType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 rounded-2xl border py-2 text-xs font-semibold transition-colors ${
                      type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {copyFor(language, typeLabels[t].en, typeLabels[t].zh)}
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                aria-label={copyFor(language, "Describe your feedback…", "请描述你的反馈…")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={copyFor(language, "Describe your feedback…", "请描述你的反馈…")}
                rows={4}
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />

              {status === "error" && (
                <p className="mt-1 text-xs text-red-400">
                  {copyFor(language, "Failed to send. Please try again.", "发送失败，请重试。")}
                </p>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!message.trim() || status === "sending"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {status === "sending"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
                {copyFor(language, "Submit", "提交")}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
