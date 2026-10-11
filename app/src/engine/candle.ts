// By Candlelight (GAME_DESIGN.md §12): how long the candle burns for each
// deduction. About a minute and a half for a short argument, scaled by how
// much there is to read and arrange.
import type { Puzzle, Reconstruction } from "@afoot/schema";

const BASE = 85;

export function candleSeconds(puzzle: Puzzle | { type: "reconstruction"; reconstruction: Reconstruction }): number {
  switch (puzzle.type) {
    case "flaw":
      return BASE + 8 * Math.max(0, puzzle.sentences.length - 3);
    case "objection":
      return BASE + 6 * Math.max(0, puzzle.testimony.length + puzzle.hand.length - 6);
    case "observation":
      return BASE + 10 * Math.max(0, puzzle.observations.length - 2);
    case "chain":
      return BASE + 15 * puzzle.cards.length;
    case "arrangement":
      return 60 + 25 * puzzle.rules.length + 10 * puzzle.entities.length;
    case "missing-link":
      return BASE + 10 * Math.max(0, puzzle.tiles.length - 4) + 8 * Math.max(0, puzzle.sentences.length - 3);
    case "reconstruction":
      return 40 + 25 * puzzle.reconstruction.blanks.length;
  }
}
