import { describe, expect, it } from "vitest";
import {
  SIM_SCENARIOS,
  endingIdOf,
  evaluateDebrief,
  flagsMatch,
  isEndingTarget,
  resolveAuto,
  validateScenario,
} from "@/lib/simulation";

describe("simulation scenarios", () => {
  it("has at least one scenario", () => {
    expect(SIM_SCENARIOS.length).toBeGreaterThan(0);
  });

  for (const scenario of SIM_SCENARIOS) {
    it(`${scenario.id}: passes structural validation`, () => {
      expect(validateScenario(scenario)).toEqual([]);
    });

    it(`${scenario.id}: every path from entry terminates in an ending (no cycles)`, () => {
      // Walk every choice combination breadth-first; runs are finite because
      // validateScenario guarantees all targets resolve — here we bound depth
      // to catch accidental cycles.
      const MAX_DEPTH = 50;
      const stack: Array<{ scene: string; flags: Set<string>; depth: number }> = [
        { scene: scenario.entry, flags: new Set(), depth: 0 },
      ];
      const reachedEndings = new Set<string>();
      while (stack.length > 0) {
        const { scene: sceneId, flags, depth } = stack.pop()!;
        expect(depth).toBeLessThan(MAX_DEPTH);
        const scene = scenario.scenes[sceneId];
        expect(scene).toBeDefined();
        const advance = (next: string, nextFlags: Set<string>) => {
          if (isEndingTarget(next)) reachedEndings.add(endingIdOf(next));
          else stack.push({ scene: next, flags: nextFlags, depth: depth + 1 });
        };
        if (scene.auto) {
          const next = resolveAuto(scene, flags);
          expect(next).not.toBeNull();
          advance(next!, flags);
        } else {
          for (const choice of scene.choices!) {
            const nextFlags = new Set(flags);
            choice.flags?.forEach((f) => nextFlags.add(f));
            advance(choice.next, nextFlags);
          }
        }
      }
      expect(reachedEndings.size).toBeGreaterThan(0);
    });
  }
});

describe("flagsMatch", () => {
  const flags = new Set(["a", "b"]);
  it("matches when all has-flags present and no missing-flags present", () => {
    expect(flagsMatch(flags, { has: ["a"], missing: ["c"] })).toBe(true);
  });
  it("fails when a has-flag is absent", () => {
    expect(flagsMatch(flags, { has: ["c"] })).toBe(false);
  });
  it("fails when a missing-flag is present", () => {
    expect(flagsMatch(flags, { missing: ["b"] })).toBe(false);
  });
  it("unconditional rule always matches", () => {
    expect(flagsMatch(flags, {})).toBe(true);
  });
});

describe("domestic-violence scenario", () => {
  const dv = SIM_SCENARIOS.find((s) => s.id === "domestic-violence")!;

  it("opening branches to three situation-specific paths", () => {
    const opening = dv.scenes["opening"];
    const nextIds = opening.choices!.map((c) => c.next);
    expect(nextIds).toContain("emergency-open");
    expect(nextIds).toContain("ongoing-open");
    expect(nextIds).toContain("post-open");
  });

  it("strong path yields good debrief items for warning letter + receipt + applied-po", () => {
    const flags = new Set([
      "called-110",
      "got-warning-letter",
      "got-receipt",
      "hospital-record",
      "applied-po",
    ]);
    const rules = evaluateDebrief(dv, flags);
    expect(rules.every((r) => r.kind === "good")).toBe(true);
    expect(rules.map((r) => r.id)).toContain("good-got-warning-letter");
  });

  it("silent path flags the missing report and no-record", () => {
    const flags = new Set(["no-report-emergency", "no-record"]);
    const ids = evaluateDebrief(dv, flags).map((r) => r.id);
    expect(ids).toContain("bad-no-report-emergency");
    expect(ids).toContain("bad-no-record");
  });

  it("po-application routes by evidence strength", () => {
    const po = dv.scenes["po-application"];
    expect(resolveAuto(po, new Set(["got-warning-letter"]))).toBe("po-granted");
    expect(resolveAuto(po, new Set(["multi-reports"]))).toBe("po-granted");
    expect(resolveAuto(po, new Set(["self-documented"]))).toBe("po-granted-partial");
    expect(resolveAuto(po, new Set())).toBe("po-denied");
  });
});

describe("sexual-harassment scenario", () => {
  const sh = SIM_SCENARIOS.find((s) => s.id === "sexual-harassment")!;

  it("opening branches to four situation-specific paths", () => {
    const opening = sh.scenes["opening"];
    const nextIds = opening.choices!.map((c) => c.next);
    expect(nextIds).toContain("wechat-open");
    expect(nextIds).toContain("workplace-open");
    expect(nextIds).toContain("acquaintance-open");
    expect(nextIds).toContain("landlord-open");
  });

  it("police outcome routes to admin-detention when evidence is strong", () => {
    const police = sh.scenes["police-outcome-auto"];
    expect(resolveAuto(police, new Set(["submitted-evidence", "reported-quickly"]))).toBe("admin-detention");
    expect(resolveAuto(police, new Set(["complete-records"]))).toBe("admin-detention");
    expect(resolveAuto(police, new Set(["signed-carefully"]))).toBe("warning-only");
    expect(resolveAuto(police, new Set())).toBe("no-action");
  });

  it("civil-trial routes to strong-win when records + refusal + lawyer are all present", () => {
    const civil = sh.scenes["civil-trial"];
    expect(resolveAuto(civil, new Set(["complete-records", "clear-refusal", "hired-lawyer"]))).toBe("end:civil-strong-win");
    expect(resolveAuto(civil, new Set(["deleted-records"]))).toBe("end:civil-lost");
  });

  it("debrief covers preserved-records and deleted-records", () => {
    const ids = evaluateDebrief(sh, new Set(["saved-records", "deleted-records"])).map((r) => r.id);
    expect(ids).toContain("good-saved-records");
    expect(ids).toContain("bad-deleted-records");
  });
});

describe("sexual-assault scenario", () => {
  const sa = SIM_SCENARIOS.find((s) => s.id === "sexual-assault")!;

  it("filing routes by evidence strength", () => {
    const filing = sa.scenes["filing-auto"];
    // Strongest: medical exam → filing-decision-strong (real timeline: DNA + wait)
    expect(resolveAuto(filing, new Set(["medical-exam"]))).toBe("filing-decision-strong");
    // Medium: clothing kept, no medical exam → hard investigation branch
    expect(resolveAuto(filing, new Set(["kept-clothes"]))).toBe("filed-hard-cont");
    // Weakest: nothing → non-filing notice
    expect(resolveAuto(filing, new Set())).toBe("filing-weak");
  });

  it("late reporting after a private settlement hits the settlement trap", () => {
    const late = sa.scenes["late-police"];
    expect(resolveAuto(late, new Set(["private-settlement"]))).toBe("end:settlement-trap");
    expect(resolveAuto(late, new Set())).toBe("end:late-hard");
  });

  it("debrief never blames delayed disclosure without support", () => {
    const rules = evaluateDebrief(sa, new Set(["long-delay", "psych-support"]));
    const ids = rules.map((r) => r.id);
    expect(ids).toContain("bad-long-delay");
    expect(ids).toContain("good-psych");
  });
});
