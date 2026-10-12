import { FORMAL_FLAW_TYPES, type ParallelPuzzle } from "@afoot/schema";
import { classifyFormalArgument } from "./flaw.js";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

export type ParallelAnswer = { optionId: string };

const isFormal = (flaw: string) => (FORMAL_FLAW_TYPES as readonly string[]).includes(flaw);

/** Checks a logical form, when given, against the error it is said to commit. */
function checkForm(
  report: Report,
  what: string,
  flaw: string,
  formal: ParallelPuzzle["formal"],
): void {
  if (isFormal(flaw) && !formal) report.error(`${what} is said to commit "${flaw}" and needs a logical form so it can be checked`);
  if (!formal) return;
  const verdict = classifyFormalArgument(formal.premises, formal.conclusion);
  if (verdict !== flaw) report.error(`${what}'s logical form reads as "${verdict}", not "${flaw}"`);
}

/**
 * Pipeline verification of a Parallel puzzle (§8.2): exactly one option goes
 * wrong in the same way as the argument, and at least one other goes wrong
 * differently, so the answer is not merely the one flawed option.
 */
export function verifyParallel(puzzle: ParallelPuzzle): VerifyResult {
  const report = new Report();
  checkUniqueIds(report, "sentence", puzzle.sentences.map((s) => s.id));
  checkUniqueIds(report, "option", puzzle.options.map((o) => o.id));
  if (!puzzle.sentences.some((s) => s.role === "conclusion")) report.error("the argument has no conclusion");

  const answer = puzzle.options.find((o) => o.id === puzzle.answer.optionId);
  if (!answer) report.error(`answer names unknown option "${puzzle.answer.optionId}"`);
  else if (answer.flaw !== puzzle.flaw) {
    report.error(`the answer commits "${answer.flaw}", not the argument's "${puzzle.flaw}"`);
  }
  const matching = puzzle.options.filter((o) => o.flaw === puzzle.flaw);
  if (matching.length > 1) {
    report.error(`${matching.length} options commit "${puzzle.flaw}": ${matching.map((o) => o.id).join(", ")}`);
  }
  const others = puzzle.options.filter((o) => o.flaw !== puzzle.flaw);
  if (!others.some((o) => o.flaw !== "valid")) {
    report.error("every other option is valid, so the answer is merely the flawed one");
  }

  checkForm(report, "the argument", puzzle.flaw, puzzle.formal);
  for (const o of puzzle.options) checkForm(report, `option "${o.id}"`, o.flaw, o.formal);

  const unchecked = [puzzle.formal ? [] : ["the argument"], puzzle.options.filter((o) => !o.formal).map((o) => o.id)].flat();
  if (unchecked.length) report.warn("not formally checkable: relies on blind playtest agreement");
  report.metric("sentences", puzzle.sentences.length);
  report.metric("options", puzzle.options.length);
  return report.done();
}

export function checkParallelAnswer(puzzle: ParallelPuzzle, answer: ParallelAnswer): boolean {
  return answer.optionId === puzzle.answer.optionId;
}
