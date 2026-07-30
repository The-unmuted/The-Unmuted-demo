// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoLock } from "./useAutoLock";

const MIN = 60_000;

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useAutoLock (auto-lock, review item 5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibilityQuiet("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setVisibilityQuiet(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
  }

  it("locks after 10 minutes with no interaction", () => {
    const onLock = vi.fn();
    renderHook(() => useAutoLock(true, onLock));
    act(() => vi.advanceTimersByTime(9 * MIN));
    expect(onLock).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2 * MIN));
    expect(onLock).toHaveBeenCalled();
  });

  it("interaction resets the idle timer", () => {
    const onLock = vi.fn();
    renderHook(() => useAutoLock(true, onLock));
    act(() => {
      vi.advanceTimersByTime(9 * MIN);
      window.dispatchEvent(new Event("pointerdown"));
      vi.advanceTimersByTime(9 * MIN);
    });
    expect(onLock).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2 * MIN));
    expect(onLock).toHaveBeenCalled();
  });

  it("locks when returning after 3+ minutes in the background", () => {
    const onLock = vi.fn();
    renderHook(() => useAutoLock(true, onLock));
    act(() => {
      setVisibility("hidden");
      vi.advanceTimersByTime(4 * MIN);
      setVisibility("visible");
    });
    expect(onLock).toHaveBeenCalled();
  });

  it("does not lock after a brief background switch", () => {
    const onLock = vi.fn();
    renderHook(() => useAutoLock(true, onLock));
    act(() => {
      setVisibility("hidden");
      vi.advanceTimersByTime(1 * MIN);
      setVisibility("visible");
      vi.advanceTimersByTime(2 * MIN);
    });
    expect(onLock).not.toHaveBeenCalled();
  });

  it("does nothing while disabled (locked screen)", () => {
    const onLock = vi.fn();
    renderHook(() => useAutoLock(false, onLock));
    act(() => vi.advanceTimersByTime(60 * MIN));
    expect(onLock).not.toHaveBeenCalled();
  });
});
