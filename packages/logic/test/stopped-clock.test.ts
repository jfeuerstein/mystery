// M0 "done when": the solvers verify the illustrative case's puzzles
// (GAME_DESIGN.md §16, §17).
import { Case, type Puzzle } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import caseJson from "../../../fixtures/stopped-clock.case.json";
import {
  checkArrangementAnswer,
  checkChainAnswer,
  checkFlawAnswer,
  checkObjectionAnswer,
  checkObservationAnswer,
  checkReconstructionAnswer,
  solveArrangement,
  verifyCase,
  verifyPuzzle,
} from "../src/index.js";

const fixture = Case.parse(caseJson);
const slots = fixture.chapters.flatMap((c) => c.beats.flatMap((b) => (b.kind === "deduction" ? [b.slot] : [])));
const variants = slots.flatMap((s) => s.variants.map((v) => [`${s.id}/${v.id}`, v.puzzle] as const));
const deduction = (id: string): Puzzle => {
  const slot = slots.find((x) => x.id === id);
  if (!slot) throw new Error(`no deduction ${id}`);
  return slot.variants[0]!.puzzle;
};

describe("The Stopped Clock (§16)", () => {
  it("verifies as a whole case: references, fair play and the Reconstruction", () => {
    const result = verifyCase(fixture);
    expect(result.errors).toEqual([]);
    // Only Observation relies on the blind playtest; everything else is clean.
    expect(result.warnings.every((w) => w.includes("blind playtest"))).toBe(true);
  });

  it.each(variants)("%s passes verification", (_, puzzle) => {
    const result = verifyPuzzle(puzzle);
    expect(result.errors).toEqual([]);
    if (puzzle.type !== "observation") expect(result.warnings).toEqual([]);
  });

  it("accepts the right Reconstruction and rejects a wrong one", () => {
    const r = fixture.finale.reconstruction;
    const right = Object.fromEntries(r.blanks.map((b) => [b.id, b.answer]));
    expect(checkReconstructionAnswer(r, right)).toBe(true);
    expect(checkReconstructionAnswer(r, { ...right, culprit: "Pike" })).toBe(false);
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
