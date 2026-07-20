import { describe, it, expect } from "vitest";
import { checkPassword, passwordIssueCopy } from "./passwordPolicy";

describe("password policy (D-027)", () => {
  it("rejects short passwords", () => {
    expect(checkPassword("abc123")).toBe("too-short");
    expect(checkPassword("")).toBe("too-short");
  });

  it("rejects common passwords regardless of case", () => {
    expect(checkPassword("12345678")).toBe("common");
    expect(checkPassword("Password")).toBe("common");
    expect(checkPassword("woaini1314")).toBe("common");
  });

  it("rejects digits-only and single-repeated-character passwords", () => {
    expect(checkPassword("20260719")).toBe("all-digits");
    expect(checkPassword("qqqqqqqq")).toBe("repeated");
  });

  it("accepts reasonable passwords", () => {
    expect(checkPassword("correct horse")).toBeNull();
    expect(checkPassword("mao2mi!Jia")).toBeNull();
    expect(checkPassword("八个汉字也可以吗")).toBeNull();
  });

  it("every issue has bilingual copy", () => {
    for (const issue of ["too-short", "common", "all-digits", "repeated"] as const) {
      expect(passwordIssueCopy("en", issue).length).toBeGreaterThan(0);
      expect(passwordIssueCopy("zh", issue).length).toBeGreaterThan(0);
    }
  });
});
