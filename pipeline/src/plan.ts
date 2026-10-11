// The generation session's own working files: the concept and the
// ground-truth world model (GAME_DESIGN.md §14.3 stages 1–2).
import { ConceptId, Id } from "@afoot/schema";
import { z } from "zod";

/**
 * A serial season's thread (decision 27): planned in the season's first case,
 * then carried and revised by each later one. Secret, like the synopsis.
 */
export const SeasonArc = z.object({
  /** The truth behind the thread, which the player pieces together across the season. Fixed once case 1 is sealed. */
  truth: z.string().min(1),
  /** How the thread surfaces, one line per case through the season's last. Lines for cases already sealed are history. */
  plan: z.array(z.object({ case: z.number().int().positive(), beat: z.string().min(1) })).min(1),
  /** How the season's last case resolves it. */
  resolution: z.string().min(1),
});
export type SeasonArc = z.infer<typeof SeasonArc>;

/** What a serial-season case hands on to the cases after it (decision 27). Secret. */
export const Carry = z.object({
  /** How the case ended, as the player saw it: two to four sentences. */
  outcome: z.string().min(1),
  /** What this case showed the player of the thread. */
  threadBeat: z.string().min(1),
  /** People who could return, as the player last saw them. */
  cast: z.array(z.object({ name: z.string().min(1), role: z.string().min(1), lastSeen: z.string().min(1) })).default([]),
  /** Loose ends left for later cases. The season's last case leaves none. */
  hooks: z.array(z.string().min(1)).default([]),
  /** The earlier cases of the season whose people or consequences this case brings back. */
  callbacks: z.array(z.number().int().positive()).default([]),
});
export type Carry = z.infer<typeof Carry>;

/** Stage 1. Written by the session from `afoot next`. */
export const Concept = z.object({
  caseId: Id,
  season: z.number().int().positive(),
  number: z.number().int().positive(),
  motifs: z.object({
    central: Id,
    complications: z.array(Id).max(2),
    premise: Id.optional(),
  }),
  curriculum: z.object({
    introduces: ConceptId.optional(),
    reinforces: z.array(ConceptId),
  }),
  /** The secret one-paragraph synopsis. Never leaves the session. */
  synopsis: z.string().min(1),
  /** Serial seasons only: the season's thread, as this case leaves it. */
  arc: SeasonArc.optional(),
  /** Serial seasons only: what this case hands on. */
  carry: Carry.optional(),
});
export type Concept = z.infer<typeof Concept>;

/** Stage 2. The truth of what happened, before any puzzle or prose. */
export const WorldModel = z.object({
  caseId: Id,
  cast: z
    .array(
      z.object({
        id: Id,
        name: z.string().min(1),
        role: z.string().min(1),
        isCulprit: z.boolean().default(false),
        secret: z.string().optional(),
        motive: z.string().optional(),
      }),
    )
    .min(3),
  /** Minute-level true timeline. `time` is "HH:MM". */
  timeline: z
    .array(
      z.object({
        time: z.string().regex(/^\d{2}:\d{2}$/),
        where: z.string().min(1),
        who: z.array(Id),
        event: z.string().min(1),
        witnessedBy: z.array(Id).default([]),
      }),
    )
    .min(3),
  evidence: z.array(z.object({ id: Id, truth: z.string().min(1) })),
  witnesses: z.array(
    z.object({
      id: Id,
      knows: z.array(z.string()),
      lies: z.array(z.object({ claim: z.string(), truth: z.string(), why: z.string() })).default([]),
    }),
  ),
  redHerrings: z.array(z.object({ what: z.string(), innocentExplanation: z.string() })).default([]),
  solution: z.object({
    culprit: Id,
    method: z.string().min(1),
    motive: z.string().min(1),
    trick: z.string().min(1),
  }),
});
export type WorldModel = z.infer<typeof WorldModel>;
