// Adaptive difficulty in the app (GAME_DESIGN.md §11.3): a skill rating per
// concept, learned from the first Declare of every deduction, and the choice
// of variant for each deduction when its chapter begins.
import type { Case, ConceptId, DeductionVariant } from "@afoot/schema";
import type { Attempt } from "./ledger";
import type { CaseProgress } from "./progress";

/** Variant difficulty runs from 1 (gentle) to 5; a new player rates 2 in everything. */
export const START_SKILL = 2;
/** How far one Declare moves a rating. */
const K = 0.5;
/** The first-try success the choice aims for. */
const TARGET = 0.7;
const WEAKNESS = 0.15;
/** A right answer slower than this counts for a little less. */
const SLOW_MS = 180_000;

const sigma = (x: number) => 1 / (1 + Math.exp(-x));

export type Skills = Partial<Record<ConceptId, number>>;

export function skillOf(skills: Skills, concepts: readonly ConceptId[]): number {
  if (concepts.length === 0) return START_SKILL;
  return concepts.reduce((sum, c) => sum + (skills[c] ?? START_SKILL), 0) / concepts.length;
}

/** Elo-style ratings, replayed from the Ledger in order. Only first Declares count: a second try has been told it was wrong. */
export function ratings(attempts: readonly Attempt[]): Skills {
  const skills: Skills = {};
  for (const a of attempts) {
    if (a.attempt !== 1 || a.concepts.length === 0) continue;
    const expected = sigma(skillOf(skills, a.concepts) - (a.difficulty ?? START_SKILL));
    const score = a.correct ? (a.ms > SLOW_MS ? 0.8 : 1) : 0;
    for (const c of a.concepts) skills[c] = (skills[c] ?? START_SKILL) + K * (score - expected);
  }
  return skills;
}

/** −|expected success − 70%|, plus a bonus for concepts the player is weak in. */
export function variantScore(skills: Skills, v: DeductionVariant): number {
  const fit = -Math.abs(sigma(skillOf(skills, v.concepts) - v.difficulty) - TARGET);
  const weakness = Math.max(0, ...v.concepts.map((c) => Math.min(1, START_SKILL - (skills[c] ?? START_SKILL))));
  return fit + WEAKNESS * weakness;
}

/** The index of the best variant for this player; a tie goes to the earlier one. */
export function chooseVariant(skills: Skills, variants: readonly DeductionVariant[]): number {
  let best = 0;
  let bestScore = -Infinity;
  variants.forEach((v, i) => {
    const score = variantScore(skills, v);
    if (score > bestScore + 1e-9) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

/**
 * Chooses variants for the current chapter's deductions that have none yet.
 * A choice already made stands, including the fresh variant a restart swaps
 * in (§9.2), so the board never changes under the player mid-chapter.
 */
export function withVariants(c: Case, p: CaseProgress, skills: Skills): CaseProgress {
  if (p.stage.kind !== "chapter") return p;
  const slots = c.chapters[p.stage.chapter]!.beats.flatMap((b) => (b.kind === "deduction" ? [b.slot] : []));
  let variant = p.variant;
  for (const slot of slots) {
    if (variant[slot.id] !== undefined || slot.variants.length < 2) continue;
    variant = { ...variant, [slot.id]: chooseVariant(skills, slot.variants) };
  }
  return variant === p.variant ? p : { ...p, variant };
}
