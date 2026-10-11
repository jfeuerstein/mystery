// The generation session's own working files: the concept and the
// ground-truth world model (GAME_DESIGN.md §14.3 stages 1–2).
import { ConceptId, Id } from "@afoot/schema";
import { z } from "zod";

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
