/**
 * Key vault persistence + session state (D-017).
 *
 * The two key boxes (ciphertext) live in Supabase `key_vaults` bound to the
 * account, with a localStorage mirror so a known device can unlock offline.
 * The unwrapped master key lives only in module memory for the session.
 */

import { supabase } from "./supabaseClient";
import {
  setupKeyVault,
  openWithPassword,
  openWithRecoveryCode,
  rewrapPasswordBox,
  rotateRecoveryCode,
  generateRecoveryCode,
  type KeyBox,
} from "./keyVault";

export interface KeyBoxes {
  passwordBox: KeyBox;
  recoveryBox: KeyBox;
}

const CACHE_PREFIX = "unmuted_key_boxes_";
const DIRTY_PREFIX = "unmuted_key_boxes_dirty_";

// ── Session master key (memory only, cleared on logout/reload) ────────────────

let sessionMasterKey: CryptoKey | null = null;

export function setSessionMasterKey(key: CryptoKey | null): void {
  sessionMasterKey = key;
}

export function getSessionMasterKey(): CryptoKey | null {
  return sessionMasterKey;
}

// ── Local mirror (boxes are ciphertext — safe to cache) ───────────────────────

function cacheBoxes(userId: string, boxes: KeyBoxes): void {
  localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(boxes));
}

function readCachedBoxes(userId: string): KeyBoxes | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + userId);
    return raw ? (JSON.parse(raw) as KeyBoxes) : null;
  } catch {
    return null;
  }
}

// ── Cloud persistence with offline resilience ─────────────────────────────────

async function pushBoxes(userId: string, boxes: KeyBoxes): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("key_vaults").upsert({
    user_id: userId,
    password_box: boxes.passwordBox,
    recovery_box: boxes.recoveryBox,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

async function persistBoxes(userId: string, boxes: KeyBoxes): Promise<void> {
  cacheBoxes(userId, boxes);
  const ok = await pushBoxes(userId, boxes);
  if (ok) localStorage.removeItem(DIRTY_PREFIX + userId);
  else localStorage.setItem(DIRTY_PREFIX + userId, "1");
}

/** Retry any un-synced boxes (call after login / on network recovery) */
export async function syncPendingBoxes(userId: string): Promise<void> {
  if (!localStorage.getItem(DIRTY_PREFIX + userId)) return;
  const boxes = readCachedBoxes(userId);
  if (boxes && (await pushBoxes(userId, boxes))) {
    localStorage.removeItem(DIRTY_PREFIX + userId);
  }
}

/** Cloud first (fresh device), local mirror as offline fallback */
export async function loadBoxes(userId: string): Promise<KeyBoxes | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("key_vaults")
      .select("password_box, recovery_box")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) {
      const boxes: KeyBoxes = {
        passwordBox: data.password_box as KeyBox,
        recoveryBox: data.recovery_box as KeyBox,
      };
      cacheBoxes(userId, boxes);
      return boxes;
    }
  }
  return readCachedBoxes(userId);
}

// ── Vault lifecycle ────────────────────────────────────────────────────────────

/** First-time setup: returns the recovery code EXACTLY ONCE — show it, never store it */
export async function createVault(
  userId: string,
  password: string
): Promise<{ masterKey: CryptoKey; recoveryCode: string }> {
  const recoveryCode = generateRecoveryCode();
  const { masterKey, passwordBox, recoveryBox } = await setupKeyVault(password, recoveryCode);
  await persistBoxes(userId, { passwordBox, recoveryBox });
  sessionMasterKey = masterKey;
  return { masterKey, recoveryCode };
}

export async function unlockWithPassword(
  userId: string,
  password: string
): Promise<CryptoKey | null> {
  const boxes = await loadBoxes(userId);
  if (!boxes) return null;
  try {
    const key = await openWithPassword(password, boxes.passwordBox);
    sessionMasterKey = key;
    void syncPendingBoxes(userId);
    return key;
  } catch {
    return null;
  }
}

/** Recovery path: unlock with the paper code, then re-wrap with a new password */
export async function unlockWithRecoveryCode(
  userId: string,
  code: string,
  newPassword: string
): Promise<CryptoKey | null> {
  const boxes = await loadBoxes(userId);
  if (!boxes) return null;
  try {
    const key = await openWithRecoveryCode(code, boxes.recoveryBox);
    const passwordBox = await rewrapPasswordBox(key, newPassword);
    await persistBoxes(userId, { passwordBox, recoveryBox: boxes.recoveryBox });
    sessionMasterKey = key;
    return key;
  } catch {
    return null;
  }
}

/** Settings → change password (requires current session master key) */
export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  if (!sessionMasterKey) return false;
  const boxes = await loadBoxes(userId);
  if (!boxes) return false;
  const passwordBox = await rewrapPasswordBox(sessionMasterKey, newPassword);
  await persistBoxes(userId, { passwordBox, recoveryBox: boxes.recoveryBox });
  return true;
}

/** Settings → issue a new recovery code (old one stops working); show once */
export async function issueNewRecoveryCode(userId: string): Promise<string | null> {
  if (!sessionMasterKey) return null;
  const boxes = await loadBoxes(userId);
  if (!boxes) return null;
  const { recoveryCode, recoveryBox } = await rotateRecoveryCode(sessionMasterKey);
  await persistBoxes(userId, { passwordBox: boxes.passwordBox, recoveryBox });
  return recoveryCode;
}

export function hasVault(userId: string): Promise<boolean> {
  return loadBoxes(userId).then((b) => b !== null);
}
