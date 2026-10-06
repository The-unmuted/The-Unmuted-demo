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
import { computeSimulationScore } from "@/lib/simulationScore";

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

  it("opening branches to five situation-specific paths", () => {
    const opening = sh.scenes["opening"];
    const nextIds = opening.choices!.map((c) => c.next);
    expect(nextIds).toContain("wechat-open");
    expect(nextIds).toContain("workplace-open");
    expect(nextIds).toContain("acquaintance-open");
    expect(nextIds).toContain("landlord-open");
    expect(nextIds).toContain("transit-open");
    expect(opening.choices).toHaveLength(5);
  });

  it("transit route supports safety, witnesses, CCTV preservation, and 110", () => {
    const openFlags = sh.scenes["transit-open"].choices!.flatMap((choice) => choice.flags ?? []);
    const actionFlags = sh.scenes["transit-action"].choices!.flatMap((choice) => choice.flags ?? []);
    expect(openFlags).toEqual(expect.arrayContaining(["transit-reached-staff", "transit-used-intercom", "transit-safe-exit"]));
    expect(actionFlags).toEqual(expect.arrayContaining(["transit-recorded-details", "transit-witness-contact", "requested-cctv", "transit-followed"]));
  });

  it("debrief covers preserved-records and deleted-records", () => {
    const ids = evaluateDebrief(sh, new Set(["saved-records", "deleted-records"])).map((r) => r.id);
    expect(ids).toContain("good-saved-records");
    expect(ids).toContain("risk-deleted");
  });
});

describe("sexual-assault scenario", () => {
  const sa = SIM_SCENARIOS.find((s) => s.id === "sexual-assault")!;

  it("offers immediate, delayed, supporter, and incomplete-memory routes", () => {
    const nextIds = sa.scenes["opening"].choices!.map((choice) => choice.next);
    expect(nextIds).toEqual(expect.arrayContaining([
      "immediate-safety",
      "delayed-reassurance",
      "supporter-response",
      "memory-reassurance",
    ]));
  });

  it("contains judgment-derived evidence-chain guidance without guaranteeing an outcome", () => {
    const text = JSON.stringify(sa);
    expect(text).toContain("网约车记录");
    expect(text).toContain("SOS");
    expect(text).toContain("不等于同意");
    expect(text).toContain("不能保证");
    expect(text).not.toContain("黄金72小时决定");
  });

  it("does not deduct points for trauma responses or delayed disclosure", () => {
    expect(computeSimulationScore(new Set(["washed", "long-delay", "silence", "frozen", "forced-normalcy"])).score).toBe(40);
  });
});

describe("new trauma-informed scenarios", () => {
  const secondary = SIM_SCENARIOS.find((s) => s.id === "secondary-victimization")!;
  const technology = SIM_SCENARIOS.find((s) => s.id === "technology-facilitated-gender-violence")!;

  it("uses reflection mode for secondary victimisation", () => {
    expect(secondary.resultMode).toBe("reflection");
    expect(secondary.scenes.opening.choices).toHaveLength(5);
  });

  it("covers five technology-facilitated violence routes", () => {
    const nextIds = technology.scenes.opening.choices!.map((choice) => choice.next);
    expect(nextIds).toEqual(expect.arrayContaining(["sextortion", "deepfake", "doxxing", "stalking", "minor"]));
    expect(nextIds).toHaveLength(5);
  });

  it("never recommends copying a minor's sexual material", () => {
    const guidance = technology.scenes.minor.coach!.zh;
    expect(guidance).toContain("不要下载或转发");
    expect(guidance).toContain("不要要求孩子重新发送");
  });
});
