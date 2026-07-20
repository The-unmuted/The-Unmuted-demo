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
  rewrapBoxVerified,
  boxNeedsUpgrade,
  rotateRecoveryCode,
  generateRecoveryCode,
  normalizeRecoveryCode,
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

/**
 * "vault-unavailable" = the key boxes could not be loaded at all (fresh device
 * while offline, or cloud row unreadable) — the secret was never even checked.
 * "wrong-secret" = boxes loaded fine but the password / recovery code failed.
 */
export type UnlockFailureReason = "vault-unavailable" | "wrong-secret";

export type UnlockResult =
  | { ok: true; key: CryptoKey }
  | { ok: false; reason: UnlockFailureReason };

/**
 * Opportunistic KDF migration (PBKDF2 → Argon2id) after a successful unlock.
 * Verify-then-replace: `rewrapBoxVerified` throws unless the NEW box provably
 * opens, so any failure leaves the old box in place — the user can never be
 * locked out by a migration bug. Runs in the background; unlock never waits.
 */
async function upgradeLegacyBoxes(
  userId: string,
  masterKey: CryptoKey,
  boxes: KeyBoxes,
  secrets: { password?: string; recoveryCode?: string }
): Promise<void> {
  try {
    let { passwordBox, recoveryBox } = boxes;
    let changed = false;
    if (secrets.password && boxNeedsUpgrade(passwordBox)) {
      passwordBox = await rewrapBoxVerified(masterKey, secrets.password);
      changed = true;
    }
    if (secrets.recoveryCode && boxNeedsUpgrade(recoveryBox)) {
      recoveryBox = await rewrapBoxVerified(masterKey, normalizeRecoveryCode(secrets.recoveryCode));
      changed = true;
    }
    if (changed) await persistBoxes(userId, { passwordBox, recoveryBox });
  } catch {
    // Old boxes stay valid; migration retries on a future unlock.
  }
}

export async function unlockWithPassword(userId: string, password: string): Promise<UnlockResult> {
  const boxes = await loadBoxes(userId);
  if (!boxes) return { ok: false, reason: "vault-unavailable" };
  // Copy-paste often drags in stray whitespace; retry trimmed before failing.
  const trimmed = password.trim();
  const candidates = trimmed && trimmed !== password ? [password, trimmed] : [password];
  for (const candidate of candidates) {
    try {
      const key = await openWithPassword(candidate, boxes.passwordBox);
      sessionMasterKey = key;
      void syncPendingBoxes(userId);
      void upgradeLegacyBoxes(userId, key, boxes, { password: candidate });
      return { ok: true, key };
    } catch {
      // try the next candidate
    }
  }
  return { ok: false, reason: "wrong-secret" };
}

/** Recovery path: unlock with the paper code, then re-wrap with a new password */
export async function unlockWithRecoveryCode(
  userId: string,
  code: string,
  newPassword: string
): Promise<UnlockResult> {
  const boxes = await loadBoxes(userId);
  if (!boxes) return { ok: false, reason: "vault-unavailable" };
  try {
    const key = await openWithRecoveryCode(code, boxes.recoveryBox);
    const passwordBox = await rewrapPasswordBox(key, newPassword);
    let recoveryBox = boxes.recoveryBox;
    if (boxNeedsUpgrade(recoveryBox)) {
      try {
        recoveryBox = await rewrapBoxVerified(key, normalizeRecoveryCode(code));
      } catch {
        // keep the legacy recovery box — same paper code keeps working
      }
    }
    await persistBoxes(userId, { passwordBox, recoveryBox });
    sessionMasterKey = key;
    return { ok: true, key };
  } catch {
    return { ok: false, reason: "wrong-secret" };
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
