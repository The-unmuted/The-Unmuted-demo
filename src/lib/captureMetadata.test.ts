import { describe, it, expect } from "vitest";
import { gradeForFile, getCaptureLocation, getDeviceInfo } from "./captureMetadata";

function fileWithAge(ageMs: number, now: number): File {
  return new File(["x"], "test.jpg", { type: "image/jpeg", lastModified: now - ageMs });
}

describe("gradeForFile", () => {
  const now = Date.now();

  it("grades a just-captured file as 1 (现场取证)", () => {
    expect(gradeForFile(fileWithAge(0, now), now)).toBe(1);
    expect(gradeForFile(fileWithAge(30_000, now), now)).toBe(1);
  });

  it("grades a file at the 2-minute boundary as 1", () => {
    expect(gradeForFile(fileWithAge(2 * 60 * 1000, now), now)).toBe(1);
  });

  it("grades an old gallery file as 2 (事后导入)", () => {
    expect(gradeForFile(fileWithAge(2 * 60 * 1000 + 1, now), now)).toBe(2);
    expect(gradeForFile(fileWithAge(7 * 24 * 60 * 60 * 1000, now), now)).toBe(2);
  });

  it("tolerates a slightly-ahead device clock", () => {
    // file.lastModified 10s in the "future" relative to now
    expect(gradeForFile(fileWithAge(-10_000, now), now)).toBe(1);
  });
});

describe("getCaptureLocation", () => {
  it("resolves null instead of throwing when geolocation is unavailable", async () => {
    await expect(getCaptureLocation(100)).resolves.toBeNull();
  });
});

describe("getDeviceInfo", () => {
  it("returns a non-empty string", () => {
    expect(getDeviceInfo().length).toBeGreaterThan(0);
  });
});
