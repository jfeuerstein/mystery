import { z } from "zod";
import { ConceptId, Id } from "./ids.js";
import { DeductionVariant, Reconstruction } from "./puzzles.js";

/** A reference into the engraving catalog (§13.2). */
export const ArtRef = z.object({ tag: Id });
export type ArtRef = z.infer<typeof ArtRef>;

export const Person = z.object({
  id: Id,
  name: z.string().min(1),
  description: z.string(),
  portrait: ArtRef,
});
export type Person = z.infer<typeof Person>;

export const Location = z.object({
  id: Id,
  name: z.string().min(1),
  scene: ArtRef,
});
export type Location = z.infer<typeof Location>;

export const EvidenceCard = z.object({
  id: Id,
  name: z.string().min(1),
  description: z.string().min(1),
  vignette: ArtRef,
  /** Hotspot in scene coordinates (0–1), known because the pipeline placed it. */
  hotspot: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), r: z.number().positive() })
    .optional(),
});
export type EvidenceCard = z.infer<typeof EvidenceCard>;

export const ObservationDetail = z.object({
  id: Id,
  text: z.string().min(1),
  vignette: ArtRef,
});
export type ObservationDetail = z.infer<typeof ObservationDetail>;

export const Topic = z.object({
  id: Id,
  label: z.string().min(1),
  /** Clue ids that must be in the Case File before this topic can be asked. */
  unlockedBy: z.array(Id).default([]),
  /** The witness's answer, one addressable sentence per entry (§7.3). */
  sentences: z.array(z.object({ id: Id, text: z.string().min(1) })).min(1),
});
export type Topic = z.infer<typeof Topic>;

export const DeductionSlot = z.object({
  id: Id,
  /** Clue ids the deduction depends on: the fair-play graph (§14.4). */
  requires: z.array(Id),
  /** 2–3 verified variants (§11.3); the vertical slice may ship one. */
  variants: z.array(DeductionVariant).min(1),
  onSolved: z.object({
    holmesSpeaks: z.string().min(1),
    /** Facts added to the Established tab, usable as clues afterwards. */
    establishes: z.array(Id).default([]),
  }),
});
export type DeductionSlot = z.infer<typeof DeductionSlot>;

export const Beat = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("narration"),
    paragraphs: z.array(z.string().min(1)).min(1),
    art: ArtRef.optional(),
    /** Clues delivered passively by this narration. */
    introduces: z.array(Id).default([]),
  }),
  z.object({
    kind: z.literal("observe"),
    subject: Id,
    details: z.array(ObservationDetail).min(1),
  }),
  z.object({
    kind: z.literal("examine"),
    location: Id,
    hotspots: z.array(Id).min(1),
  }),
  z.object({
    kind: z.literal("interrogate"),
    witness: Id,
    topics: z.array(Topic).min(1),
  }),
  z.object({ kind: z.literal("deduction"), slot: DeductionSlot }),
]);
export type Beat = z.infer<typeof Beat>;

export const Chapter = z.object({
  id: Id,
  title: z.string().min(1),
  patienceHolder: Id,
  beats: z.array(Beat).min(1),
});
export type Chapter = z.infer<typeof Chapter>;

/** Fixed for every chapter, the finale and every patience-holder (decision 22). */
export const PATIENCE_PER_CHAPTER = 3;

export const Case = z.object({
  id: Id,
  title: z.string().min(1),
  season: z.number().int().positive(),
  number: z.number().int().positive(),
  concepts: z.object({
    introduces: ConceptId.optional(),
    reinforces: z.array(ConceptId),
  }),
  cast: z.array(Person).min(1),
  locations: z.array(Location).min(1),
  evidence: z.array(EvidenceCard),
  chapters: z.array(Chapter).min(1),
  reconstruction: Reconstruction,
  account: z.object({
    masterful: z.string().min(1),
    workmanlike: z.string().min(1),
    untidy: z.string().min(1),
  }),
});
export type Case = z.infer<typeof Case>;
