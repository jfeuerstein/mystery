import { Report, type VerifyResult } from "./result.js";

/** One item in the order the player meets it. */
export type FairPlayItem =
  | { kind: "clue"; id: string }
  | { kind: "deduction"; id: string; requires: readonly string[]; establishes?: readonly string[] | undefined };

/**
 * The fair-play graph (§14.4): every clue a deduction needs must reach the
 * player before that deduction. A solved deduction's id and the facts it
 * establishes count as clues from then on.
 */
export function verifyFairPlay(sequence: readonly FairPlayItem[]): VerifyResult {
  const report = new Report();
  const known = new Set<string>();
  for (const item of sequence) {
    if (item.kind === "clue") {
      known.add(item.id);
      continue;
    }
    for (const id of item.requires) {
      if (!known.has(id)) report.error(`deduction "${item.id}" needs "${id}" before the player has it`);
    }
    known.add(item.id);
    for (const id of item.establishes ?? []) known.add(id);
  }
  report.metric("items", sequence.length);
  return report.done();
}
