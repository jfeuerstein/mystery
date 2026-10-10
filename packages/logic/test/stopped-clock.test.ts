// M0 "done when": the solvers verify the illustrative case's puzzles
// (GAME_DESIGN.md §16, §17).
import { DeductionVariant, Id, Reconstruction } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import fixtureJson from "../../../fixtures/stopped-clock.json";
import {
  checkArrangementAnswer,
  checkChainAnswer,
  checkFlawAnswer,
  checkObjectionAnswer,
  checkObservationAnswer,
  checkReconstructionAnswer,
  solveArrangement,
  verifyFairPlay,
  verifyPuzzle,
  verifyReconstruction,
} from "../src/index.js";

const Fixture = z.object({
  sequence: z.array(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("clue"), id: Id }),
      z.object({
        kind: z.literal("deduction"),
        id: Id,
        requires: z.array(Id),
        establishes: z.array(Id).optional(),
      }),
    ]),
  ),
  deductions: z.array(DeductionVariant),
  reconstruction: Reconstruction,
});

const fixture = Fixture.parse(fixtureJson);
const deduction = (id: string) => {
  const d = fixture.deductions.find((x) => x.id === id);
  if (!d) throw new Error(`no deduction ${id}`);
  return d.puzzle;
};

describe("The Stopped Clock (§16)", () => {
  it.each(fixture.deductions.map((d) => [d.id, d] as const))("%s passes verification", (_, d) => {
    const result = verifyPuzzle(d.puzzle);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    // Only Observation relies on the blind playtest; everything else is clean.
    if (d.puzzle.type !== "observation") expect(result.warnings).toEqual([]);
  });

  it("follows the fair-play graph", () => {
    expect(verifyFairPlay(fixture.sequence).errors).toEqual([]);
  });

  it("has a verified Reconstruction", () => {
    const proven = new Set(fixture.sequence.flatMap((i) => [i.id, ...(i.kind === "deduction" ? (i.establishes ?? []) : [])]));
    expect(verifyReconstruction(fixture.reconstruction, proven).errors).toEqual([]);
    const right = Object.fromEntries(fixture.reconstruction.blanks.map((b) => [b.id, b.answer]));
    expect(checkReconstructionAnswer(fixture.reconstruction, right)).toBe(true);
    expect(checkReconstructionAnswer(fixture.reconstruction, { ...right, culprit: "Pike" })).toBe(false);
  });

  it("solves the hall-clock Arrangement to the documented order", () => {
    const puzzle = deduction("d-hall-order");
    if (puzzle.type !== "arrangement") throw new Error("wrong type");
    expect(solveArrangement(puzzle)).toEqual({
      kind: "full",
      placements: { vance: "first", pike: "second", colonel: "third", hale: "fourth", clara: "fifth" },
    });
    const wrong = { vance: "first", pike: "third", colonel: "second", hale: "fourth", clara: "fifth" };
    expect(checkArrangementAnswer(puzzle, { kind: "full", placements: wrong })).toBe(false);
  });

  it("accepts the Chain P3 → P1 → P2 → P4 (turned) and rejects the converse trap", () => {
    const puzzle = deduction("d-clock-chain");
    if (puzzle.type !== "chain") throw new Error("wrong type");
    const valid = {
      steps: [{ cardId: "p3" }, { cardId: "p1" }, { cardId: "p2" }, { cardId: "p4", orientation: "contrapositive" as const }],
    };
    expect(checkChainAnswer(puzzle, valid)).toEqual({ correct: true });
    // "The dogs did not bark, so it was a servant": the converse of P6.
    const trap = { steps: [{ cardId: "p5" }, { cardId: "p6", orientation: "converse" as const }] };
    expect(checkChainAnswer(puzzle, trap).correct).toBe(false);
  });

  it("checks the Flaw, Objection and Observation answers", () => {
    const flaw = deduction("d-watson-letter");
    const objection = deduction("d-pike-objection");
    const observation = deduction("d-cold-read");
    if (flaw.type !== "flaw" || objection.type !== "objection" || observation.type !== "observation") {
      throw new Error("wrong type");
    }
    expect(checkFlawAnswer(flaw, { sentenceId: "s3", flawType: "necessary-as-sufficient" })).toBe(true);
    expect(checkFlawAnswer(flaw, { sentenceId: "s3", flawType: "sufficient-as-necessary" })).toBe(false);
    expect(checkFlawAnswer(flaw, { sentenceId: "s1", flawType: "necessary-as-sufficient" })).toBe(false);

    expect(checkObjectionAnswer(objection, { sentenceId: "s1", evidenceId: "e-boots" })).toBe(true);
    expect(checkObjectionAnswer(objection, { sentenceId: "s3", evidenceId: "e-boots" })).toBe(false);

    expect(checkObservationAnswer(observation, observation.answer)).toBe(true);
    expect(
      checkObservationAnswer(observation, {
        links: [
          { observation: "o-ticket", inference: "i-surrey" },
          { observation: "o-ink", inference: "i-letter" },
          { observation: "o-calluses", inference: "i-left-handed" },
        ],
      }),
    ).toBe(false);
  });
});
