import { FORMAL_FLAW_TYPES, type FlawPuzzle, type FlawType, type Literal, type Statement } from "@afoot/schema";
import { closure, compileAll, negate } from "./propositional.js";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

export type FlawAnswer = { sentenceId: string; flawType: FlawType };

export type FormalVerdict = "valid" | "necessary-as-sufficient" | "sufficient-as-necessary" | "unclassified";

/**
 * Classifies a single-step conditional argument.
 *
 * - `valid`: the conclusion follows.
 * - `necessary-as-sufficient`: from a → b and b, concludes a (affirming the
 *   consequent; LSAT "mistaken reversal").
 * - `sufficient-as-necessary`: from a → b and ¬a, concludes ¬b (denying the
 *   antecedent; LSAT "mistaken negation").
 */
export function classifyFormalArgument(premises: readonly Statement[], conclusion: Literal): FormalVerdict {
  const { facts, rules } = compileAll(premises);
  const known = closure(facts, rules);
  if (known.has(conclusion)) return "valid";
  for (const r of rules) {
    if (known.has(r.then) && conclusion === r.if) return "necessary-as-sufficient";
    if (known.has(negate(r.if)) && conclusion === negate(r.then)) return "sufficient-as-necessary";
  }
  return "unclassified";
}

/** Pipeline verification of a Flaw puzzle (§8.2, §14.4). */
export function verifyFlaw(puzzle: FlawPuzzle): VerifyResult {
  const report = new Report();
  checkUniqueIds(report, "sentence", puzzle.sentences.map((s) => s.id));

  const failing = puzzle.sentences.find((s) => s.id === puzzle.answer.sentenceId);
  if (!failing) report.error(`answer names unknown sentence "${puzzle.answer.sentenceId}"`);
  if (!puzzle.sentences.some((s) => s.role === "conclusion")) report.error("the argument has no conclusion");

  const formalType = (FORMAL_FLAW_TYPES as readonly string[]).includes(puzzle.answer.flawType);
  if (formalType && !puzzle.formal) {
    report.error(`flaw type "${puzzle.answer.flawType}" needs a logical form so it can be checked`);
  }
  if (puzzle.formal) {
    const verdict = classifyFormalArgument(puzzle.formal.premises, puzzle.formal.conclusion);
    if (verdict !== puzzle.answer.flawType) {
      report.error(`the logical form reads as "${verdict}", not "${puzzle.answer.flawType}"`);
    }
    if (failing && failing.role !== "conclusion") {
      report.error("for a formal flaw, the failing step is the conclusion");
    }
  }
  if (!puzzle.formal) report.warn("not formally checkable: relies on blind playtest agreement");
  report.metric("sentences", puzzle.sentences.length);
  return report.done();
}

export function checkFlawAnswer(puzzle: FlawPuzzle, answer: FlawAnswer): boolean {
  return answer.sentenceId === puzzle.answer.sentenceId && answer.flawType === puzzle.answer.flawType;
}
