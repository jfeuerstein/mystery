import { z } from "zod";

/** Lower-case kebab/snake identifier used for every id in a case. */
export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "ids are lower-case letters, digits, '-' and '_'");
export type Id = z.infer<typeof Id>;

/**
 * Logic concepts from GAME_DESIGN.md Appendix A. The tier sets the curriculum
 * order (§11.2).
 */
export const CONCEPTS = {
  "seeing-and-observing": 1,
  "plain-contradiction": 1,
  "if-and-then": 1,
  "contrapositive": 1,
  "order-by-elimination": 1,
  "reversed-arrows": 2,
  "necessary-as-sufficient": 2,
  "sufficient-as-necessary": 2,
  "only-if-and-unless": 2,
  "correlation-causation": 2,
  "other-explanation": 2,
  "who-stood-where": 2,
  "some-most-all": 3,
  "unrepresentative-witness": 3,
  "attacking-the-man": 3,
  "slippery-word": 3,
  "unstated-premise": 3,
  "two-doors-only": 3,
  "part-and-whole": 4,
  "proportion-and-number": 4,
  "arguing-in-a-circle": 4,
  "absence-of-evidence": 4,
  "parallel-errors": 4,
  "complex-arrangements": 4,
} as const;

export type ConceptId = keyof typeof CONCEPTS;
export const ConceptId = z.enum(Object.keys(CONCEPTS) as [ConceptId, ...ConceptId[]]);

/**
 * Entries of the Notebook's Fallacy Index (§10): the names a player can give
 * in a Flaw deduction. Each logical error has exactly one entry, so a Flaw
 * puzzle never has two defensible names.
 */
export const FLAW_TYPES = [
  "necessary-as-sufficient", // affirming the consequent / mistaken reversal
  "sufficient-as-necessary", // denying the antecedent / mistaken negation
  "correlation-causation",
  "unrepresentative-witness",
  "attacking-the-man",
  "slippery-word",
  "two-doors-only",
  "part-and-whole",
  "proportion-and-number",
  "arguing-in-a-circle",
  "absence-of-evidence",
] as const;

export type FlawType = (typeof FLAW_TYPES)[number];
export const FlawType = z.enum(FLAW_TYPES);

/** Flaw types that `@afoot/logic` can confirm mechanically from a logical form. */
export const FORMAL_FLAW_TYPES = ["necessary-as-sufficient", "sufficient-as-necessary"] as const;
