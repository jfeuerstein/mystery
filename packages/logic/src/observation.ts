import type { ObservationPuzzle } from "@afoot/schema";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

export type ObservationAnswer = { links: { observation: string; inference: string }[] };

const key = (l: { observation: string; inference: string }): string => `${l.observation}->${l.inference}`;

/**
 * Structural verification of an Observation puzzle (§8.6). Whether the
 * inferences are actually the best-supported ones can't be checked by code;
 * that is the blind playtest's job (§14.4).
 */
export function verifyObservation(puzzle: ObservationPuzzle): VerifyResult {
  const report = new Report();
  checkUniqueIds(report, "observation", puzzle.observations.map((o) => o.id));
  checkUniqueIds(report, "inference", puzzle.inferences.map((i) => i.id));
  const observations = new Set(puzzle.observations.map((o) => o.id));
  const inferences = new Set(puzzle.inferences.map((i) => i.id));
  const linked = new Set<string>();
  const linkedObservations = new Set<string>();

  for (const link of puzzle.answer.links) {
    if (!observations.has(link.observation)) report.error(`link names unknown observation "${link.observation}"`);
    if (!inferences.has(link.inference)) report.error(`link names unknown inference "${link.inference}"`);
    if (linkedObservations.has(link.observation)) {
      report.error(`observation "${link.observation}" is linked more than once`);
    }
    linkedObservations.add(link.observation);
    linked.add(link.inference);
  }
  for (const inference of puzzle.inferences) {
    if (linked.has(inference.id) && inference.defeater) {
      report.error(`inference "${inference.id}" is linked but also has a defeater`);
    }
    if (!linked.has(inference.id) && !inference.defeater) {
      report.error(`unused inference "${inference.id}" needs a defeater explaining why it's wrong`);
    }
  }
  report.metric("distractors", puzzle.inferences.length - linked.size);
  report.warn("not formally checkable: relies on blind playtest agreement");
  return report.done();
}

export function checkObservationAnswer(puzzle: ObservationPuzzle, answer: ObservationAnswer): boolean {
  const expected = new Set(puzzle.answer.links.map(key));
  const given = new Set(answer.links.map(key));
  return expected.size === given.size && [...expected].every((k) => given.has(k));
}
