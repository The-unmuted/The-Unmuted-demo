import { useState } from "react";
import { Loader2, LockKeyhole, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copyFor, localeTag, type AppLanguage } from "@/lib/locale";
import type { RecordDraftSummary } from "@/lib/recordDraftService";

export default function RecordDraftRecoveryDialog({
  draft,
  error,
  language,
  onContinue,
  onDelete,
  onLater,
  onRetry,
}: {
  draft: RecordDraftSummary | null;
  error: string | null;
  language: AppLanguage;
  onContinue: () => Promise<void>;
  onDelete: () => Promise<void>;
  onLater: () => void;
  onRetry: () => Promise<void> | void;
}) {
  const [working, setWorking] = useState<"open" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const open = Boolean(draft || error);

  const continueDraft = async () => {
    setActionError(null);
    setWorking("open");
    try {
      await onContinue();
    } catch {
      setActionError(
        copyFor(
          language,
          "The protected draft could not be opened. Try again.",
          "暂时无法打开受保护草稿，请重试。",
          "Der geschützte Entwurf konnte nicht geöffnet werden. Versuche es erneut."
        )
      );
    } finally {
      setWorking(null);
    }
  };

  const deleteDraft = async () => {
    setActionError(null);
    setWorking("delete");
    try {
      await onDelete();
      setConfirmDelete(false);
    } catch {
      setActionError(
        copyFor(
          language,
          "The encrypted draft could not be deleted. Try again.",
          "暂时无法删除加密草稿，请重试。",
          "Der verschlüsselte Entwurf konnte nicht gelöscht werden. Versuche es erneut."
        )
      );
    } finally {
      setWorking(null);
    }
  };

  return (
    <>
      <Dialog open={open && !confirmDelete} onOpenChange={(next) => !next && onLater()}>
        <DialogContent
          closeLabel={copyFor(language, "Decide later", "稍后处理", "Später entscheiden")}
          className="w-[calc(100%-2rem)] max-w-sm rounded-[1.75rem] border-border/80 p-5"
        >
          <DialogHeader className="text-left">
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <DialogTitle className="text-base">
              {error
                ? copyFor(language, "Protected draft unavailable", "暂时无法读取受保护草稿", "Geschützter Entwurf nicht verfügbar")
                : copyFor(language, "Protected draft available", "发现一份受保护的草稿", "Geschützter Entwurf verfügbar")}
            </DialogTitle>
            <DialogDescription className="leading-5">
              {error
                ? copyFor(
                    language,
                    "The local vault could not be read. Your current work was not changed. Try again.",
                    "暂时无法读取本地保险柜，你当前的内容没有被改动。请重试。",
                    "Der lokale Tresor konnte nicht gelesen werden. Deine aktuellen Inhalte wurden nicht verändert. Versuche es erneut."
                  )
                : copyFor(
                    language,
                    "Continue only when it is safe. The screen will not reveal what the draft is about until you choose to open it.",
                    "请只在安全时继续。在你主动打开前，页面不会显示草稿涉及的具体情况。",
                    "Fahre nur fort, wenn es sicher ist. Der Inhalt wird erst angezeigt, wenn du ihn bewusst öffnest."
                  )}
            </DialogDescription>
          </DialogHeader>

          {draft && !error && (
            <div className="rounded-2xl border border-border bg-muted/45 px-3 py-2.5 text-xs text-muted-foreground">
              {copyFor(language, "Last protected", "最近保护时间", "Zuletzt geschützt")}: {" "}
              <time dateTime={draft.updatedAt}>
                {new Date(draft.updatedAt).toLocaleString(localeTag(language))}
              </time>
            </div>
          )}
          {actionError && !confirmDelete && (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
            {error ? (
              <Button type="button" onClick={() => void onRetry()} className="min-h-11 w-full gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {copyFor(language, "Try again", "重试", "Erneut versuchen")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void continueDraft()}
                disabled={working !== null}
                aria-busy={working === "open"}
                className="min-h-11 w-full gap-2"
              >
                {working === "open" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
                {copyFor(language, "Continue securely", "安全地继续填写", "Sicher fortfahren")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onLater} className="min-h-11 w-full">
              {copyFor(language, "Decide later", "稍后处理", "Später entscheiden")}
            </Button>
            {draft && !error && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="min-h-11 w-full gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {copyFor(language, "Delete permanently", "永久删除草稿", "Dauerhaft löschen")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-[1.75rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copyFor(language, "Delete this protected draft?", "永久删除这份受保护草稿？", "Geschützten Entwurf löschen?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {copyFor(
                language,
                "This removes the encrypted local copy and, if it was previously synced, queues deletion of the encrypted cloud copy. This cannot be undone.",
                "这会删除本机加密副本；如果此前已同步，也会排队删除云端密文副本。此操作无法撤销。",
                "Dadurch wird die verschlüsselte lokale Kopie gelöscht. Falls sie bereits synchronisiert war, wird auch die verschlüsselte Cloud-Kopie zur Löschung vorgemerkt. Dies kann nicht rückgängig gemacht werden."
              )}
            </AlertDialogDescription>
            {actionError && (
              <p className="text-sm text-destructive" role="alert">
                {actionError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">
              {copyFor(language, "Keep draft", "保留草稿", "Entwurf behalten")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteDraft();
              }}
              disabled={working !== null}
              aria-busy={working === "delete"}
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {working === "delete" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {copyFor(language, "Delete permanently", "永久删除", "Dauerhaft löschen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
