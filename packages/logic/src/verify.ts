import type { Puzzle } from "@afoot/schema";
import { verifyArrangement } from "./arrangement.js";
import { verifyChain } from "./chain.js";
import { verifyFlaw } from "./flaw.js";
import { verifyMissingLink } from "./missinglink.js";
import { verifyObjection } from "./objection.js";
import { verifyObservation } from "./observation.js";
import { verifyParallel } from "./parallel.js";
import type { VerifyResult } from "./result.js";

/** Verifies any Mind Palace puzzle with the checker for its type. */
export function verifyPuzzle(puzzle: Puzzle): VerifyResult {
  switch (puzzle.type) {
    case "flaw":
      return verifyFlaw(puzzle);
    case "parallel":
      return verifyParallel(puzzle);
    case "objection":
      return verifyObjection(puzzle);
    case "chain":
      return verifyChain(puzzle);
    case "arrangement":
      return verifyArrangement(puzzle);
    case "observation":
      return verifyObservation(puzzle);
    case "missing-link":
      return verifyMissingLink(puzzle);
  }
}
