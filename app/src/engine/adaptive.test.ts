import { Case, type DeductionVariant } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import caseJson from "../../../fixtures/stopped-clock.case.json";
import { chooseVariant, ratings, START_SKILL, withVariants } from "./adaptive";
import type { Attempt } from "./ledger";
import { startCase } from "./progress";

const c = Case.parse(caseJson);
const template = c.chapters[0]!.beats.flatMap((b) => (b.kind === "deduction" ? b.slot.variants : []))[0]!;
const variant = (id: string, difficulty: number, concepts: DeductionVariant["concepts"]): DeductionVariant => ({
  ...template,
  id,
  difficulty,
  concepts,
});

const attempt = (correct: boolean, concepts: Attempt["concepts"], difficulty = 2, ms = 30_000): Attempt => ({
  caseId: "x",
  slot: "s",
  variant: "a",
  difficulty,
  type: "chain",
  concepts,
  correct,
  attempt: 1,
  ms,
  at: 0,
});

describe("adaptive difficulty", () => {
  it("gives a new player the variant nearest a 70% first-try chance", () => {
    expect(chooseVariant({}, [variant("hard", 3, ["contrapositive"]), variant("easy", 1, ["contrapositive"])])).toBe(1);
    // Equal variants: the earlier one, so the order a case was written in decides.
    expect(chooseVariant({}, [variant("a", 2, ["contrapositive"]), variant("b", 2, ["contrapositive"])])).toBe(0);
  });

  it("learns from first Declares only, and moves a rating the right way", () => {
    const failing = ratings([attempt(false, ["reversed-arrows"]), attempt(false, ["reversed-arrows"])]);
    expect(failing["reversed-arrows"]).toBeLessThan(START_SKILL);
    const strong = ratings([attempt(true, ["if-and-then"], 3), attempt(true, ["if-and-then"], 3)]);
    expect(strong["if-and-then"]).toBeGreaterThan(START_SKILL);
    // A second try (told it was wrong) teaches nothing.
    expect(ratings([{ ...attempt(true, ["if-and-then"]), attempt: 2 }])).toEqual({});
    // A slow right answer counts for less than a quick one.
    const slow = ratings([attempt(true, ["if-and-then"], 2, 400_000)])["if-and-then"]!;
    const quick = ratings([attempt(true, ["if-and-then"], 2)])["if-and-then"]!;
    expect(slow).toBeLessThan(quick);
  });

  it("raises the bar for a strong player and leans into a weak concept", () => {
    const strong = ratings(Array.from({ length: 8 }, () => attempt(true, ["contrapositive"], 3)));
    expect(chooseVariant(strong, [variant("easy", 1, ["contrapositive"]), variant("hard", 4, ["contrapositive"])])).toBe(1);
    const weak = ratings([attempt(false, ["reversed-arrows"]), attempt(false, ["reversed-arrows"]), attempt(true, ["if-and-then"])]);
    // Equally good fits for two concepts: the weaker concept wins the nudge.
    const gap = weak["if-and-then"]! - 1.5;
    const fair = [variant("a", 1.5, ["if-and-then"]), variant("b", weak["reversed-arrows"]! - gap, ["reversed-arrows"])];
    expect(chooseVariant(weak, fair)).toBe(1);
  });

  it("chooses once per chapter and keeps a restart's swap", () => {
    // Chapter II of the sample case holds its two-variant Arrangement.
    const start = startCase(c);
    const p = { ...start, stage: { kind: "chapter" as const, chapter: 1, beat: 0, phase: { kind: "narration" as const, paragraph: 0 } } };
    const chosen = withVariants(c, p, {});
    expect(chosen.variant["d-hall-order"]).toBe(0);
    expect(withVariants(c, chosen, {})).toBe(chosen);
    const swapped = { ...p, variant: { "d-hall-order": 1 } };
    expect(withVariants(c, swapped, {})).toBe(swapped);
    // Nothing is chosen outside a chapter, nor for single-variant deductions.
    expect(withVariants(c, start, {}).variant).toEqual({});
  });
});
