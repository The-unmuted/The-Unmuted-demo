/**
 * Evidence pipeline hook (production track, D-016/D-017).
 *
 * Encrypt on device → ciphertext to the private cloud vault, record into the
 * encrypted cloud index. No key files for the user to babysit: per-file keys
 * are wrapped by the session master key (password / paper recovery code).
 *
 * Legacy demo records (localStorage + user-held JSON key bundles) remain
 * readable via `legacyHistory` but nothing new is written to that path.
 */

import { useState, useEffect, useCallback } from 'react';
import { encryptFile, type EncryptionResult } from '@/lib/evidenceCrypto';
// DEMO branch: swapped from evidenceVaultService (Supabase-backed) to demoVault
// (IndexedDB-only, hardcoded master key). Same API surface — no other changes.
import {
  saveEvidence,
  listEvidence,
  listEvidencePartial,
  openEvidenceFile,
  syncPendingEvidence,
  deleteEvidence,
  purgeExpiredEvidence,
  DEMO_USER_ID,
  type EvidenceRecord,
  type SaveEvidenceOptions,
} from '@/lib/demoVault';
import { getSessionMasterKey } from '@/lib/keyVaultService';
import { loadVaultRecords, type VaultRecord } from '@/lib/localStorage';
import { AppLanguage, copyFor } from '@/lib/locale';

export type VaultStep = 'idle' | 'encrypting' | 'saving' | 'done' | 'error';

export interface VaultStepStatus {
  encrypting: 'pending' | 'running' | 'done' | 'error';
  saving: 'pending' | 'running' | 'done' | 'error';
}

export interface VaultResult {
  record: EvidenceRecord;
  encryptionResult: EncryptionResult;
}

export function useEvidenceVault(language: AppLanguage = 'en') {
  const [step, setStep] = useState<VaultStep>('idle');
  const [steps, setSteps] = useState<VaultStepStatus>({ encrypting: 'pending', saving: 'pending' });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VaultResult | null>(null);
  // DEMO: userId is a fixed constant, not fetched from Supabase auth.
  const [userId] = useState<string | null>(DEMO_USER_ID);
  const [history, setHistory] = useState<EvidenceRecord[]>([]);
  const [legacyHistory] = useState<VaultRecord[]>(() => loadVaultRecords());
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const canUseVault = Boolean(userId && getSessionMasterKey());

  const refreshHistory = useCallback(async () => {
    if (!userId) return;
    const masterKey = getSessionMasterKey();
    if (masterKey) void purgeExpiredEvidence(userId);
    try {
      setHistory(masterKey ? await listEvidence(userId) : await listEvidencePartial(userId));
    } catch {
      // offline with no mirror — leave the list as-is
    }
  }, [userId]);

  // Flush the pending queue whenever the network comes back
  useEffect(() => {
    if (!userId) return;
    const retry = () => void syncPendingEvidence(userId).then(() => refreshHistory());
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [userId, refreshHistory]);

  const processFile = useCallback(
    async (blob: Blob, mimeType: string, opts: SaveEvidenceOptions = {}): Promise<boolean> => {
      setStep('encrypting');
      setError(null);
      setResult(null);
      setSteps({ encrypting: 'running', saving: 'pending' });

      if (!userId) {
        setSteps({ encrypting: 'error', saving: 'pending' });
        setError(copyFor(language, 'Please sign in first.', '请先登录。'));
        setStep('error');
        return false;
      }
      if (!getSessionMasterKey()) {
        setSteps({ encrypting: 'error', saving: 'pending' });
        setError(
          copyFor(
            language,
            'Please unlock your vault first — go to Evidence Records and tap "Unlock & save" on any record.',
            '请先解锁保险柜——在「存证记录」中点击任意记录的「解锁查看」输入密码即可。'
          )
        );
        setStep('error');
        return false;
      }

      let enc: EncryptionResult;
      try {
        enc = await encryptFile(blob, mimeType);
        setSteps({ encrypting: 'done', saving: 'running' });
        setStep('saving');
      } catch (e) {
        setSteps({ encrypting: 'error', saving: 'pending' });
        setError(copyFor(language, 'Encryption failed: ', '加密失败：') + (e instanceof Error ? e.message : String(e)));
        setStep('error');
        return false;
      }

      try {
        const record = await saveEvidence(userId, enc, opts);
        setSteps({ encrypting: 'done', saving: 'done' });
        setResult({ record, encryptionResult: enc });
        setHistory((prev) => [record, ...prev]);
        setStep('done');
        return true;
      } catch (e) {
        setSteps({ encrypting: 'done', saving: 'error' });
        setError(copyFor(language, 'Could not save: ', '保存失败：') + (e instanceof Error ? e.message : String(e)));
        setStep('error');
        return false;
      }
    },
    [language, userId]
  );

  const processBatch = useCallback(
    async (
      items: Array<{ blob: Blob; mimeType: string; opts?: SaveEvidenceOptions }>
    ): Promise<{ success: number; failed: number }> => {
      let success = 0;
      let failed = 0;
      for (let i = 0; i < items.length; i++) {
        setBatchProgress({ current: i + 1, total: items.length });
        const { blob, mimeType, opts = {} } = items[i];
        const ok = await processFile(blob, mimeType, opts);
        if (ok) success++;
        else failed++;
      }
      setBatchProgress(null);
      setStep('idle');
      setSteps({ encrypting: 'pending', saving: 'pending' });
      setError(null);
      return { success, failed };
    },
    [processFile]
  );

  /** Decrypt one record back to the original file (cache or cloud) */
  const openFile = useCallback(
    async (record: EvidenceRecord): Promise<Blob | null> => {
      if (!userId) return null;
      try {
        return await openEvidenceFile(userId, record);
      } catch {
        return null;
      }
    },
    [userId]
  );

  /** Soft delete — record vanishes from the list; no recovery hints here (D-022) */
  const deleteRecord = useCallback(
    async (record: EvidenceRecord): Promise<boolean> => {
      if (!userId) return false;
      try {
        await deleteEvidence(userId, record);
        setHistory((prev) => prev.filter((r) => r.txId !== record.txId));
        return true;
      } catch {
        return false;
      }
    },
    [userId]
  );

  /** Retry pending uploads; refresh statuses afterwards */
  const syncNow = useCallback(async () => {
    if (!userId) return;
    await syncPendingEvidence(userId);
    await refreshHistory();
  }, [userId, refreshHistory]);

  const reset = useCallback(() => {
    setStep('idle');
    setSteps({ encrypting: 'pending', saving: 'pending' });
    setError(null);
    setResult(null);
  }, []);

  return {
    step,
    steps,
    error,
    result,
    history,
    legacyHistory,
    userId,
    canUseVault,
    batchProgress,
    processFile,
    processBatch,
    openFile,
    deleteRecord,
    refreshHistory,
    syncNow,
    reset,
  };
}
