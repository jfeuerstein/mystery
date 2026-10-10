import type { ObjectionPuzzle } from "@afoot/schema";
import { closure, compileAll, isContradictory, negate } from "./propositional.js";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

export type ObjectionAnswer = { sentenceId: string; evidenceId: string };

/**
 * Every (sentence, card) pair in which the card contradicts (or, for
 * Corroborate, supports) the sentence, given the background knowledge. A
 * claim the background already settles on its own doesn't count, since no
 * card is needed for it.
 */
export function matchingPairs(puzzle: ObjectionPuzzle): ObjectionAnswer[] {
  const background = compileAll(puzzle.background);
  const base = closure(background.facts, background.rules);
  const pairs: ObjectionAnswer[] = [];

  for (const card of puzzle.hand) {
    const known = closure([...background.facts, ...card.establishes], background.rules);
    for (const sentence of puzzle.testimony) {
      const hit = sentence.asserts.some((claim) => {
        const sought = puzzle.mode === "contradict" ? negate(claim) : claim;
        return known.has(sought) && !base.has(sought);
      });
      if (hit) pairs.push({ sentenceId: sentence.id, evidenceId: card.id });
    }
  }
  return pairs;
}

/** Pipeline verification of an Objection or Corroborate puzzle (§8.3, §14.4). */
export function verifyObjection(puzzle: ObjectionPuzzle): VerifyResult {
  const report = new Report();
  checkUniqueIds(report, "sentence", puzzle.testimony.map((s) => s.id));
  checkUniqueIds(report, "card", puzzle.hand.map((c) => c.id));
  if (!puzzle.testimony.some((s) => s.id === puzzle.answer.sentenceId)) {
    report.error(`answer names unknown sentence "${puzzle.answer.sentenceId}"`);
  }
  if (!puzzle.hand.some((c) => c.id === puzzle.answer.evidenceId)) {
    report.error(`answer names a card not in the hand: "${puzzle.answer.evidenceId}"`);
  }

  const background = compileAll(puzzle.background);
  for (const card of puzzle.hand) {
    if (isContradictory(closure([...background.facts, ...card.establishes], background.rules))) {
      report.error(`card "${card.id}" contradicts the background knowledge`);
    }
  }

  const pairs = matchingPairs(puzzle);
  const intended = pairs.some(
    (p) => p.sentenceId === puzzle.answer.sentenceId && p.evidenceId === puzzle.answer.evidenceId,
  );
  if (!intended) report.error("the intended card doesn't actually bear on the intended sentence");
  for (const p of pairs) {
    if (p.sentenceId !== puzzle.answer.sentenceId || p.evidenceId !== puzzle.answer.evidenceId) {
      report.error(`unintended second answer: card "${p.evidenceId}" against sentence "${p.sentenceId}"`);
    }
  }
  report.metric("sentences", puzzle.testimony.length);
  report.metric("cards", puzzle.hand.length);
  return report.done();
}

export function checkObjectionAnswer(puzzle: ObjectionPuzzle, answer: ObjectionAnswer): boolean {
  return answer.sentenceId === puzzle.answer.sentenceId && answer.evidenceId === puzzle.answer.evidenceId;
}
