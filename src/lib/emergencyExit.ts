import { setSessionMasterKey } from "./sessionKey";

export const EMERGENCY_EXIT_EVENT = "the-unmuted:emergency-exit";
const EMERGENCY_LOCK_KEY = "the_unmuted_emergency_locked";

/**
 * Performs only synchronous, local work. Quick Exit must never wait for a
 * database write, encryption operation, analytics request, or cloud upload.
 */
export function prepareEmergencyExit(): void {
  window.dispatchEvent(new Event(EMERGENCY_EXIT_EVENT));
  setSessionMasterKey(null);
  try {
    localStorage.setItem(EMERGENCY_LOCK_KEY, "1");
  } catch {
    // Storage can be unavailable in strict private modes; leaving still wins.
  }
}

export function consumeEmergencyLock(): boolean {
  try {
    const wasLocked = localStorage.getItem(EMERGENCY_LOCK_KEY) === "1";
    localStorage.removeItem(EMERGENCY_LOCK_KEY);
    return wasLocked;
  } catch {
    return false;
  }
}
