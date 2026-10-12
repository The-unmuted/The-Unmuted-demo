// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMERGENCY_EXIT_EVENT, consumeEmergencyLock, prepareEmergencyExit } from "./emergencyExit";
import { getSessionMasterKey, setSessionMasterKey } from "./sessionKey";

describe("emergency exit preparation", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, String(value)),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() {
          return values.size;
        },
      },
    });
    setSessionMasterKey(null);
  });

  it("clears the in-memory vault key, announces clearing, and requires re-entry", async () => {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    setSessionMasterKey(key);
    const listener = vi.fn();
    window.addEventListener(EMERGENCY_EXIT_EVENT, listener);

    prepareEmergencyExit();

    expect(listener).toHaveBeenCalledOnce();
    expect(getSessionMasterKey()).toBeNull();
    expect(consumeEmergencyLock()).toBe(true);
    expect(consumeEmergencyLock()).toBe(false);
    window.removeEventListener(EMERGENCY_EXIT_EVENT, listener);
  });
});
