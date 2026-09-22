/**
 * In-memory master-key session state.
 *
 * Keeping this tiny state holder separate from the vault services avoids a
 * demo-vault ↔ key-vault import cycle and guarantees the key is cleared on a
 * reload or explicit lock without persisting secrets anywhere.
 */

let sessionMasterKey: CryptoKey | null = null;

export function setSessionMasterKey(key: CryptoKey | null): void {
  sessionMasterKey = key;
}

export function getSessionMasterKey(): CryptoKey | null {
  return sessionMasterKey;
}
