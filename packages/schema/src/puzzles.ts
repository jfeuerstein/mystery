import { z } from "zod";
import { ConceptId, FlawType, Id } from "./ids.js";
import { Literal, Statement } from "./logic.js";

// ---------------------------------------------------------------------------
// The Flaw (§8.2)
// ---------------------------------------------------------------------------

export const ArgumentSentence = z.object({
  id: Id,
  text: z.string().min(1),
  role: z.enum(["premise", "conclusion", "context"]),
});
export type ArgumentSentence = z.infer<typeof ArgumentSentence>;

export const FlawPuzzle = z.object({
  type: z.literal("flaw"),
  speaker: Id,
  sentences: z.array(ArgumentSentence).min(2),
  answer: z.object({ sentenceId: Id, flawType: FlawType }),
  /** Logical form of the argument. Required for formal flaw types (§14.4). */
  formal: z
    .object({ premises: z.array(Statement).min(1), conclusion: Literal })
    .optional(),
});
export type FlawPuzzle = z.infer<typeof FlawPuzzle>;

// ---------------------------------------------------------------------------
// Objection! and Corroborate (§8.3)
// ---------------------------------------------------------------------------

export const TestimonySentence = z.object({
  id: Id,
  text: z.string().min(1),
  /** What the sentence claims, as literals. */
  asserts: z.array(Literal).min(1),
});
export type TestimonySentence = z.infer<typeof TestimonySentence>;

export const EvidenceCardRef = z.object({
  id: Id,
  name: z.string().min(1),
  /** What the card proves, as literals. */
  establishes: z.array(Literal).min(1),
});
export type EvidenceCardRef = z.infer<typeof EvidenceCardRef>;

export const ObjectionPuzzle = z.object({
  type: z.literal("objection"),
  /** `contradict` for Objection!, `support` for Corroborate. */
  mode: z.enum(["contradict", "support"]),
  witness: Id,
  testimony: z.array(TestimonySentence).min(1),
  /** The hand of cards offered, including the ones that don't apply. */
  hand: z.array(EvidenceCardRef).min(2),
  /** Background knowledge from the world model that links cards to claims. */
  background: z.array(Statement).default([]),
  answer: z.object({ sentenceId: Id, evidenceId: Id }),
});
export type ObjectionPuzzle = z.infer<typeof ObjectionPuzzle>;

// ---------------------------------------------------------------------------
// The Chain (§8.4)
// ---------------------------------------------------------------------------

/** The four ways a conditional card can be turned on the board (§8.4). */
export const ORIENTATIONS = ["stated", "contrapositive", "converse", "inverse"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];
export const Orientation = z.enum(ORIENTATIONS);

export const ChainCard = z.object({
  id: Id,
  /** The card as stated in the story. */
  text: z.string().min(1),
  statement: Statement,
  /**
   * Plain-English readings for the other three orientations, shown unlabelled
   * when the player turns the card. Required for conditional cards; only the
   * contrapositive is valid, the converse and inverse are the traps.
   */
  readings: z
    .object({ contrapositive: z.string().min(1), converse: z.string().min(1), inverse: z.string().min(1) })
    .optional(),
});
export type ChainCard = z.infer<typeof ChainCard>;

export const ChainPuzzle = z.object({
  type: z.literal("chain"),
  prompt: z.string().min(1),
  cards: z.array(ChainCard).min(2),
  target: Literal,
  /** Conclusions a careless chain (one using a converse or inverse) might reach. None may be entailed. */
  distractors: z.array(Literal).default([]),
  /** Plain-English phrasing of literals, so the board can state where a chain has got to. */
  phrases: z.record(Literal, z.string().min(1)).default({}),
});
export type ChainPuzzle = z.infer<typeof ChainPuzzle>;

// ---------------------------------------------------------------------------
// The Arrangement (§8.5)
// ---------------------------------------------------------------------------

export type Constraint =
  | { op: "in"; entity: string; slots: string[] }
  | { op: "not-in"; entity: string; slots: string[] }
  | { op: "same"; a: string; b: string }
  | { op: "different"; a: string; b: string }
  | { op: "before"; a: string; b: string }
  | { op: "immediately-before"; a: string; b: string }
  | { op: "adjacent"; a: string; b: string }
  | { op: "not-adjacent"; a: string; b: string }
  | { op: "if"; if: Constraint; then: Constraint }
  | { op: "not"; c: Constraint }
  | { op: "or"; any: Constraint[] };

export const Constraint: z.ZodType<Constraint> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({ op: z.literal("in"), entity: Id, slots: z.array(Id).min(1) }),
    z.object({ op: z.literal("not-in"), entity: Id, slots: z.array(Id).min(1) }),
    z.object({ op: z.literal("same"), a: Id, b: Id }),
    z.object({ op: z.literal("different"), a: Id, b: Id }),
    z.object({ op: z.literal("before"), a: Id, b: Id }),
    z.object({ op: z.literal("immediately-before"), a: Id, b: Id }),
    z.object({ op: z.literal("adjacent"), a: Id, b: Id }),
    z.object({ op: z.literal("not-adjacent"), a: Id, b: Id }),
    z.object({ op: z.literal("if"), if: Constraint, then: Constraint }),
    z.object({ op: z.literal("not"), c: Constraint }),
    z.object({ op: z.literal("or"), any: z.array(Constraint).min(2) }),
  ]),
);

export const ArrangementPuzzle = z.object({
  type: z.literal("arrangement"),
  /**
   * `ordering`: one entity per slot, slots in order (a timeline).
   * `grouping`: slots are places or groups with optional capacity limits.
   */
  layout: z.enum(["ordering", "grouping"]),
  entities: z.array(z.object({ id: Id, name: z.string().min(1) })).min(2),
  slots: z
    .array(
      z.object({
        id: Id,
        label: z.string().min(1),
        min: z.number().int().nonnegative().optional(),
        max: z.number().int().positive().optional(),
      }),
    )
    .min(2),
  rules: z.array(z.object({ id: Id, text: z.string().min(1), constraint: Constraint })).min(1),
  question: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("full") }),
    /** "Who must have been third?" */
    z.object({ kind: z.literal("occupants"), slot: Id }),
    /** "Where must Pike have been?" */
    z.object({ kind: z.literal("placement"), entity: Id }),
  ]),
});
export type ArrangementPuzzle = z.infer<typeof ArrangementPuzzle>;

// ---------------------------------------------------------------------------
// Observation (§8.6)
// ---------------------------------------------------------------------------

export const ObservationPuzzle = z.object({
  type: z.literal("observation"),
  observations: z.array(z.object({ id: Id, text: z.string().min(1) })).min(1),
  inferences: z
    .array(
      z.object({
        id: Id,
        text: z.string().min(1),
        /** For wrong inferences: why the evidence doesn't support it. */
        defeater: z.string().min(1).optional(),
      }),
    )
    .min(2),
  answer: z.object({
    links: z.array(z.object({ observation: Id, inference: Id })).min(1),
  }),
});
export type ObservationPuzzle = z.infer<typeof ObservationPuzzle>;

// ---------------------------------------------------------------------------
// Any Mind Palace puzzle
// ---------------------------------------------------------------------------

export const Puzzle = z.discriminatedUnion("type", [
  FlawPuzzle,
  ObjectionPuzzle,
  ChainPuzzle,
  ArrangementPuzzle,
  ObservationPuzzle,
]);
export type Puzzle = z.infer<typeof Puzzle>;

export const DeductionVariant = z.object({
  id: Id,
  difficulty: z.number(),
  concepts: z.array(ConceptId).min(1),
  puzzle: Puzzle,
});
export type DeductionVariant = z.infer<typeof DeductionVariant>;

// ---------------------------------------------------------------------------
// The Reconstruction (§8.8)
// ---------------------------------------------------------------------------

export const Reconstruction = z.object({
  /** Prose with `{{blankId}}` placeholders. */
  passage: z.string().min(1),
  blanks: z
    .array(
      z.object({
        id: Id,
        answer: z.string().min(1),
        /** Deduction or clue ids that prove this blank (fair play). */
        establishedBy: z.array(Id).min(1),
      }),
    )
    .min(1),
  wordBank: z.array(z.string().min(1)).min(2),
});
export type Reconstruction = z.infer<typeof Reconstruction>;
