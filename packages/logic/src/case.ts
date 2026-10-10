import type { Case } from "@afoot/schema";
import { verifyFairPlay, type FairPlayItem } from "./fairplay.js";
import { verifyReconstruction } from "./reconstruction.js";
import { Report, type VerifyResult } from "./result.js";
import { verifyPuzzle } from "./verify.js";

/** The order in which the player meets every clue and deduction in a case. */
export function caseSequence(c: Case): FairPlayItem[] {
  const items: FairPlayItem[] = [];
  for (const chapter of c.chapters) {
    for (const beat of chapter.beats) {
      switch (beat.kind) {
        case "narration":
          for (const id of beat.introduces) items.push({ kind: "clue", id });
          break;
        case "observe":
          for (const d of beat.details) items.push({ kind: "clue", id: d.id });
          break;
        case "examine":
          for (const id of beat.hotspots) items.push({ kind: "clue", id });
          break;
        case "interrogate":
          for (const t of beat.topics) items.push({ kind: "clue", id: t.id });
          break;
        case "deduction":
          items.push({
            kind: "deduction",
            id: beat.slot.id,
            requires: beat.slot.requires,
            establishes: beat.slot.onSolved.establishes,
          });
          break;
      }
    }
  }
  return items;
}

/**
 * Verifies a whole case: every puzzle variant, cross-references, the
 * fair-play graph and the Reconstruction. Messages are prefixed with where
 * the problem is.
 */
export function verifyCase(c: Case): VerifyResult {
  const report = new Report();
  const cast = new Set(c.cast.map((p) => p.id));
  const evidence = new Set(c.evidence.map((e) => e.id));
  const locations = new Set(c.locations.map((l) => l.id));
  const facts = new Set(c.facts.map((f) => f.id));
  const examined = new Set<string>();
  const known = new Set<string>();
  let deductions = 0;

  for (const chapter of c.chapters) {
    const where = `chapter "${chapter.id}"`;
    if (!cast.has(chapter.patienceHolder)) report.error(`${where}: unknown patience-holder "${chapter.patienceHolder}"`);
    for (const [i, beat] of chapter.beats.entries()) {
      const at = `${where} beat ${i + 1}`;
      switch (beat.kind) {
        case "narration":
          for (const id of beat.introduces) {
            if (!facts.has(id)) report.error(`${at}: introduces unknown fact "${id}"`);
            known.add(id);
          }
          break;
        case "observe":
          if (!cast.has(beat.subject)) report.error(`${at}: unknown subject "${beat.subject}"`);
          for (const d of beat.details) known.add(d.id);
          break;
        case "examine":
          if (!locations.has(beat.location)) report.error(`${at}: unknown location "${beat.location}"`);
          for (const id of beat.hotspots) {
            if (!evidence.has(id)) report.error(`${at}: unknown evidence "${id}"`);
            examined.add(id);
            known.add(id);
          }
          break;
        case "interrogate":
          if (!cast.has(beat.witness)) report.error(`${at}: unknown witness "${beat.witness}"`);
          for (const t of beat.topics) {
            for (const id of t.unlockedBy) {
              if (!known.has(id)) report.error(`${at}: topic "${t.id}" is unlocked by "${id}", which the player can't have yet`);
            }
            known.add(t.id);
          }
          break;
        case "deduction": {
          deductions++;
          const slot = beat.slot;
          for (const id of slot.onSolved.establishes) {
            if (!facts.has(id)) report.error(`${at}: establishes unknown fact "${id}"`);
          }
          for (const variant of slot.variants) {
            const result = verifyPuzzle(variant.puzzle);
            for (const e of result.errors) report.error(`deduction "${slot.id}" variant "${variant.id}": ${e}`);
            for (const w of result.warnings) report.warn(`deduction "${slot.id}" variant "${variant.id}": ${w}`);
          }
          known.add(slot.id);
          for (const id of slot.onSolved.establishes) known.add(id);
          break;
        }
      }
    }
  }

  for (const e of verifyFairPlay(caseSequence(c)).errors) report.error(e);
  if (!cast.has(c.finale.patienceHolder)) report.error(`finale: unknown patience-holder "${c.finale.patienceHolder}"`);
  for (const e of verifyReconstruction(c.finale.reconstruction, known).errors) report.error(`finale: ${e}`);
  for (const e of c.evidence) {
    if (!examined.has(e.id)) report.warn(`evidence "${e.id}" is never found in a scene`);
  }
  report.metric("chapters", c.chapters.length);
  report.metric("deductions", deductions);
  return report.done();
}
