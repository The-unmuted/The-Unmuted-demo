import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteEncryptedRecordDraft,
  listRecordDraftSummaries,
  openEncryptedRecordDraft,
  pullRecordDraftsFromCloud,
  recordDraftHasContent,
  registerRecordDraftOnlineSync,
  saveEncryptedRecordDraft,
  type RecordDraftPayload,
  type RecordDraftSummary,
} from "@/lib/recordDraftService";
import { EMERGENCY_EXIT_EVENT } from "@/lib/emergencyExit";

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

type UseEncryptedRecordDraftOptions = {
  userId: string | null;
  situationId: string;
  notes: Record<string, string | undefined>;
  enabled: boolean;
};

export function useEncryptedRecordDraft({
  userId,
  situationId,
  notes,
  enabled,
}: UseEncryptedRecordDraftOptions) {
  const [status, setStatus] = useState<DraftSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState<RecordDraftSummary | null>(null);
  const [loadingRecovery, setLoadingRecovery] = useState(true);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string | null>(null);
  const saveSequenceRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const mountedRef = useRef(true);

  const refreshRecovery = useCallback(async () => {
    if (!userId) {
      setRecoveryDraft(null);
      setLoadingRecovery(false);
      return;
    }
    setLoadingRecovery(true);
    setRecoveryError(null);
    try {
      await pullRecordDraftsFromCloud(userId);
      const [latest] = await listRecordDraftSummaries(userId);
      if (mountedRef.current) setRecoveryDraft(latest ?? null);
    } catch {
      if (mountedRef.current) setRecoveryError("draft-list-failed");
    } finally {
      if (mountedRef.current) setLoadingRecovery(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshRecovery();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshRecovery]);

  useEffect(() => {
    if (!userId) return;
    return registerRecordDraftOnlineSync(userId);
  }, [userId]);

  const saveNow = useCallback(async () => {
    if (!enabled || !userId || !recordDraftHasContent(notes)) return null;
    const sequence = ++saveSequenceRef.current;
    setStatus("saving");
    const execute = async () => {
      try {
        const record = await saveEncryptedRecordDraft({
          userId,
          draftId: draftIdRef.current ?? undefined,
          situationId,
          notes,
          createdAt: createdAtRef.current ?? undefined,
        });
        draftIdRef.current = record.draftId;
        createdAtRef.current = record.createdAt;
        if (mountedRef.current && sequence === saveSequenceRef.current) {
          setStatus("saved");
          setLastSavedAt(record.updatedAt);
        }
        return record;
      } catch {
        if (mountedRef.current && sequence === saveSequenceRef.current) setStatus("error");
        return null;
      }
    };
    const queued = saveQueueRef.current.then(execute, execute);
    saveQueueRef.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, [enabled, notes, situationId, userId]);

  useEffect(() => {
    if (!enabled || !recordDraftHasContent(notes)) return;
    setStatus("saving");
    const timeout = window.setTimeout(() => void saveNow(), 650);
    return () => window.clearTimeout(timeout);
  }, [enabled, notes, saveNow]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void saveNow();
    };
    const clearSensitiveState = () => {
      saveSequenceRef.current += 1;
      setStatus("idle");
      setLastSavedAt(null);
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener(EMERGENCY_EXIT_EVENT, clearSensitiveState);
    return () => {
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener(EMERGENCY_EXIT_EVENT, clearSensitiveState);
    };
  }, [saveNow]);

  const recover = useCallback(async (): Promise<RecordDraftPayload | null> => {
    if (!userId || !recoveryDraft) return null;
    setRecoveryError(null);
    try {
      const payload = await openEncryptedRecordDraft(userId, recoveryDraft.draftId);
      draftIdRef.current = payload.draftId;
      createdAtRef.current = payload.createdAt;
      setLastSavedAt(payload.updatedAt);
      setStatus("saved");
      setRecoveryDraft(null);
      return payload;
    } catch {
      setRecoveryError("draft-open-failed");
      return null;
    }
  }, [recoveryDraft, userId]);

  const discard = useCallback(async () => {
    if (!userId) return;
    const draftId = recoveryDraft?.draftId ?? draftIdRef.current;
    if (draftId) await deleteEncryptedRecordDraft(userId, draftId);
    draftIdRef.current = null;
    createdAtRef.current = null;
    setRecoveryDraft(null);
    setLastSavedAt(null);
    setStatus("idle");
  }, [recoveryDraft, userId]);

  const markFinalized = useCallback(async () => {
    if (!userId) return;
    // Serialize behind any in-flight debounced write. This prevents a late
    // autosave from recreating the draft after the completed record removed it.
    await saveNow();
    if (!draftIdRef.current) return;
    await deleteEncryptedRecordDraft(userId, draftIdRef.current);
    draftIdRef.current = null;
    createdAtRef.current = null;
    setRecoveryDraft(null);
    setLastSavedAt(null);
    setStatus("idle");
  }, [saveNow, userId]);

  return {
    status,
    lastSavedAt,
    recoveryDraft,
    loadingRecovery,
    recoveryError,
    saveNow,
    recover,
    discard,
    markFinalized,
    refreshRecovery,
  };
}
