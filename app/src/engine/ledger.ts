// Holmes' Ledger (GAME_DESIGN.md §12): a record of every Declare, and the
// per-concept summary shown to the player. Also the input adaptive difficulty
// will read in M3.
import { entryById, type ConceptId, type Puzzle } from "@afoot/schema";

export type Attempt = {
  caseId: string;
  /** Deduction slot id, or "finale". */
  slot: string;
  variant: string;
  /** The variant's difficulty (1–5), for the skill ratings (§11.3). */
  difficulty?: number;
  type: Puzzle["type"] | "reconstruction";
  concepts: ConceptId[];
  correct: boolean;
  /** 1 for the first Declare on this deduction in this visit, 2 for the next… */
  attempt: number;
  /** Time since the Mind Palace opened, in milliseconds. */
  ms: number;
  /** The candle went out (By Candlelight): counted as a wrong Declare. */
  timedOut?: boolean;
  at: number;
};

export type ConceptSummary = {
  concept: ConceptId;
  title: string;
  /** Deductions faced that use this concept. */
  faced: number;
  /** Share solved at the first Declare, 0–1. */
  firstTry: number;
  /** Median time to the right answer, in ms. */
  medianMs: number | undefined;
};

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function summarize(attempts: readonly Attempt[]): ConceptSummary[] {
  const byConcept = new Map<ConceptId, Attempt[]>();
  for (const a of attempts) {
    for (const c of a.concepts) byConcept.set(c, [...(byConcept.get(c) ?? []), a]);
  }
  const out: ConceptSummary[] = [];
  for (const [concept, list] of byConcept) {
    const firsts = list.filter((a) => a.attempt === 1);
    if (firsts.length === 0) continue;
    out.push({
      concept,
      title: entryById(concept)?.title ?? concept,
      faced: firsts.length,
      firstTry: firsts.filter((a) => a.correct).length / firsts.length,
      medianMs: median(list.filter((a) => a.correct).map((a) => a.ms)),
    });
  }
  return out.sort((a, b) => b.faced - a.faced || a.title.localeCompare(b.title));
}

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "–";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
