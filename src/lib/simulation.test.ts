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

describe("domestic-violence debrief", () => {
  const dv = SIM_SCENARIOS.find((s) => s.id === "domestic-violence")!;

  it("strong path yields good marks for receipt + warning letter", () => {
    const flags = new Set([
      "reported-night",
      "asked-receipt",
      "injury-exam",
      "warning-letter",
      "kept-note",
      "applied-po",
    ]);
    const rules = evaluateDebrief(dv, flags);
    expect(rules.every((r) => r.kind === "good")).toBe(true);
    expect(rules.map((r) => r.id)).toContain("warning-letter");
  });

  it("silent path flags the missing report", () => {
    const flags = new Set(["frozen-night", "destroyed-note", "po-abandoned"]);
    const ids = evaluateDebrief(dv, flags).map((r) => r.id);
    expect(ids).toContain("never-reported");
    expect(ids).toContain("destroyed-note");
    expect(ids).toContain("po-abandoned");
  });

  it("po-decision routes by evidence strength", () => {
    const decision = dv.scenes["po-decision"];
    expect(resolveAuto(decision, new Set(["warning-letter"]))).toBe("po-strong-cont");
    expect(resolveAuto(decision, new Set(["asked-receipt"]))).toBe("po-granted-cont");
    expect(resolveAuto(decision, new Set(["photo"]))).toBe("po-thin-cont");
    expect(resolveAuto(decision, new Set())).toBe("end:po-denied");
  });
});

describe("sexual-harassment scenario", () => {
  const sh = SIM_SCENARIOS.find((s) => s.id === "sexual-harassment")!;

  it("police outcome depends on saved records", () => {
    const police = sh.scenes["police-auto"];
    expect(resolveAuto(police, new Set(["saved-records"]))).toBe("police-strong");
    expect(resolveAuto(police, new Set())).toBe("police-weak");
  });

  it("civil outcome depends on saved records", () => {
    const civil = sh.scenes["civil-auto"];
    expect(resolveAuto(civil, new Set(["saved-records"]))).toBe("civil-win-cont");
    expect(resolveAuto(civil, new Set())).toBe("end:civil-thin");
  });

  it("debrief flags the six-month clock when victim endured", () => {
    const ids = evaluateDebrief(sh, new Set(["endured", "deleted-records"])).map((r) => r.id);
    expect(ids).toContain("endured");
    expect(ids).toContain("deleted-records");
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
