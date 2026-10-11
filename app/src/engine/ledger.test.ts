import { Case } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import caseJson from "../../../fixtures/stopped-clock.case.json";
import { candleSeconds } from "./candle";
import { formatDuration, summarize, type Attempt } from "./ledger";

const a = (over: Partial<Attempt>): Attempt => ({
  caseId: "c",
  slot: "s",
  variant: "a",
  type: "chain",
  concepts: ["contrapositive"],
  correct: true,
  attempt: 1,
  ms: 60_000,
  at: 0,
  ...over,
});

describe("Holmes' Ledger", () => {
  it("summarizes first-try rate and median time per concept", () => {
    const rows = summarize([
      a({ slot: "x", ms: 30_000 }),
      a({ slot: "y", correct: false, ms: 10_000 }),
      a({ slot: "y", attempt: 2, ms: 90_000 }),
      a({ slot: "z", concepts: ["if-and-then", "contrapositive"], ms: 50_000 }),
    ]);
    const contra = rows.find((r) => r.concept === "contrapositive")!;
    expect(contra.title).toBe("On Turning a Statement About");
    expect(contra.faced).toBe(3);
    expect(contra.firstTry).toBeCloseTo(2 / 3);
    expect(contra.medianMs).toBe(50_000);
    expect(rows.find((r) => r.concept === "if-and-then")!.faced).toBe(1);
  });

  it("formats durations", () => {
    expect(formatDuration(42_000)).toBe("42s");
    expect(formatDuration(130_000)).toBe("2m 10s");
    expect(formatDuration(undefined)).toBe("–");
  });
});

describe("By Candlelight", () => {
  it("gives every sample deduction a sensible burn time", () => {
    const c = Case.parse(caseJson);
    for (const ch of c.chapters) {
      for (const b of ch.beats) {
        if (b.kind !== "deduction") continue;
        for (const v of b.slot.variants) {
          const s = candleSeconds(v.puzzle);
          expect(s).toBeGreaterThanOrEqual(60);
          expect(s).toBeLessThanOrEqual(300);
        }
      }
    }
    expect(candleSeconds({ type: "reconstruction", reconstruction: c.finale.reconstruction })).toBe(165);
  });
});
