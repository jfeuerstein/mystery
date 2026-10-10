import type { Reconstruction } from "@afoot/schema";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

/** Blank id → chosen word-bank entry. */
export type ReconstructionAnswer = Record<string, string>;

const PLACEHOLDER = /\{\{([a-z0-9][a-z0-9_-]*)\}\}/g;

/**
 * Pipeline verification of the finale (§8.8, §14.4).
 *
 * @param provenIds deduction and clue ids that exist in the case; every
 *   blank must be proven by at least one of them (fair play).
 */
export function verifyReconstruction(r: Reconstruction, provenIds: ReadonlySet<string>): VerifyResult {
  const report = new Report();
  checkUniqueIds(report, "blank", r.blanks.map((b) => b.id));

  const placeholders = [...r.passage.matchAll(PLACEHOLDER)].map((m) => m[1]!);
  checkUniqueIds(report, "placeholder", placeholders);
  const blankIds = new Set(r.blanks.map((b) => b.id));
  for (const p of placeholders) if (!blankIds.has(p)) report.error(`placeholder "{{${p}}}" has no blank`);
  for (const b of r.blanks) {
    if (!placeholders.includes(b.id)) report.error(`blank "${b.id}" has no placeholder in the passage`);
  }

  const bank = new Set<string>();
  for (const word of r.wordBank) {
    if (bank.has(word)) report.error(`word bank lists "${word}" twice`);
    bank.add(word);
  }
  for (const b of r.blanks) {
    if (!bank.has(b.answer)) report.error(`blank "${b.id}": answer "${b.answer}" is not in the word bank`);
    for (const id of b.establishedBy) {
      if (!provenIds.has(id)) report.error(`blank "${b.id}" cites unknown deduction or clue "${id}"`);
    }
  }
  report.metric("blanks", r.blanks.length);
  report.metric("wordBank", r.wordBank.length);
  return report.done();
}

/** All-or-nothing: every blank must be right (§8.8). */
export function checkReconstructionAnswer(r: Reconstruction, answer: ReconstructionAnswer): boolean {
  return r.blanks.every((b) => answer[b.id] === b.answer);
}
