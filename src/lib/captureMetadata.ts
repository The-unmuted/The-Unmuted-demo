/**
 * Capture-instant metadata for evidence records (Phase 2 取证).
 *
 * Everything gathered here goes into the record's *sealed* metadata
 * (encrypted client-side with the master key) — the cloud never sees it.
 * That is why precise coordinates are allowed here, unlike broadcast
 * channels where coordinates must be rounded to ~0.1°.
 */

import { wgs84ToGcj02 } from "@/hooks/useEmergencyContacts";

export interface CaptureLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  system: "GCJ-02";
}

/** Camera/mic capture inside the app vs importing a pre-existing file */
export type CaptureGrade = 1 | 2;

/**
 * Files coming through an `<input capture>` are grade 1 only when the file
 * was actually created just now (mobile camera). Desktop browsers ignore the
 * `capture` attribute and open a picker, and mobile users can still switch to
 * the gallery — an old `lastModified` reveals that honestly.
 */
const FRESH_CAPTURE_WINDOW_MS = 2 * 60 * 1000;

export function gradeForFile(file: File, now: number = Date.now()): CaptureGrade {
  return Math.abs(now - file.lastModified) <= FRESH_CAPTURE_WINDOW_MS ? 1 : 2;
}

/**
 * Best-effort one-shot location fix, converted to GCJ-02.
 * Never throws; resolves null on denial/timeout/unsupported.
 */
export function getCaptureLocation(timeoutMs = 8000): Promise<CaptureLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { lat, lng } = wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude);
        resolve({
          lat,
          lng,
          accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : undefined,
          system: "GCJ-02",
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

/** Full user agent — verbose, but the most reliable device identifier a web app has */
export function getDeviceInfo(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
}
