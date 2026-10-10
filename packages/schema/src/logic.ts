import { z } from "zod";

/**
 * A propositional literal: an atom such as `clock-stopped-deliberately`, or
 * its negation written with a leading `!`.
 */
export const Literal = z
  .string()
  .regex(/^!?[a-z0-9][a-z0-9_-]*$/, "literals are an id, optionally prefixed with '!'");
export type Literal = z.infer<typeof Literal>;

/**
 * A statement as it is phrased in the story. Code, never the model, turns the
 * surface form into a logical form (§14.4), so "only if" and "unless" can't be
 * mistranslated.
 *
 * - `fact`:    `literal` is true.
 * - `if`:      "If a, then b."     a → b
 * - `only-if`: "a only if b."      a → b
 * - `unless`:  "a unless b."       ¬b → a
 */
export const Statement = z.discriminatedUnion("form", [
  z.object({ form: z.literal("fact"), literal: Literal }),
  z.object({ form: z.literal("if"), a: Literal, b: Literal }),
  z.object({ form: z.literal("only-if"), a: Literal, b: Literal }),
  z.object({ form: z.literal("unless"), a: Literal, b: Literal }),
]);
export type Statement = z.infer<typeof Statement>;
