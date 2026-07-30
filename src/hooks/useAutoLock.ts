/**
 * Auto-lock (external review 2026-07-27, item 5).
 *
 * The threat model's top real-world risk is someone close to the user picking
 * up her unlocked phone. While the vault is unlocked, we re-lock after a period
 * of no interaction, or when the app has been in the background for a while.
 * Background timers are throttled by mobile browsers, so the hidden case is
 * checked against a timestamp when the page becomes visible again.
 */

import { useEffect, useRef } from "react";

const IDLE_MS = 10 * 60_000;
const HIDDEN_MS = 3 * 60_000;
const CHECK_EVERY_MS = 30_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

export function useAutoLock(enabled: boolean, onLock: () => void): void {
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (!enabled) return;

    let lastActivity = Date.now();
    let hiddenAt: number | null = null;

    const markActivity = () => {
      lastActivity = Date.now();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else {
        if (hiddenAt !== null && Date.now() - hiddenAt >= HIDDEN_MS) {
          onLockRef.current();
          return;
        }
        hiddenAt = null;
        markActivity();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastActivity >= IDLE_MS) onLockRef.current();
    }, CHECK_EVERY_MS);

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);
}
