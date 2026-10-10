import type {
  ArrangementPuzzle,
  ChainCard,
  ChainPuzzle,
  Constraint,
  FlawPuzzle,
  ObjectionPuzzle,
  ObservationPuzzle,
  Reconstruction,
} from "@afoot/schema";
import { describe, expect, it } from "vitest";
import {
  checkArrangementAnswer,
  checkChainAnswer,
  classifyFormalArgument,
  closure,
  compile,
  entailsRule,
  findShortestChain,
  matchingPairs,
  solveArrangement,
  verifyArrangement,
  verifyChain,
  verifyFairPlay,
  verifyFlaw,
  verifyObjection,
  verifyObservation,
  verifyReconstruction,
} from "../src/index.js";

describe("propositional logic", () => {
  it("translates 'only if' and 'unless' in code", () => {
    expect(compile({ form: "only-if", a: "p", b: "q" }).rules).toEqual([{ if: "p", then: "q" }]);
    expect(compile({ form: "unless", a: "p", b: "q" }).rules).toEqual([{ if: "!q", then: "p" }]);
  });

  it("applies contrapositives when chaining", () => {
    const known = closure(["!c"], [
      { if: "a", then: "b" },
      { if: "b", then: "c" },
    ]);
    expect(known).toEqual(new Set(["!c", "!b", "!a"]));
  });

  it("does not treat the converse or inverse as entailed", () => {
    const rules = [{ if: "a", then: "b" }];
    expect(entailsRule(rules, { if: "!b", then: "!a" })).toBe(true);
    expect(entailsRule(rules, { if: "b", then: "a" })).toBe(false);
    expect(entailsRule(rules, { if: "!a", then: "!b" })).toBe(false);
  });
});

const rule = (id: string, a: string, b: string, form: "if" | "only-if" | "unless" = "if"): ChainCard => ({
  id,
  text: id,
  statement: { form, a, b },
  readings: { contrapositive: `${id} c`, converse: `${id} v`, inverse: `${id} i` },
});
const fact = (id: string, literal: string): ChainCard => ({ id, text: id, statement: { form: "fact", literal } });

describe("The Chain", () => {
  // From "no alibi" and "a → b → alibi", the contrapositive route proves ¬a.
  // From "b", the converse of r1 would (wrongly) give "a".
  const puzzle: ChainPuzzle = {
    type: "chain",
    prompt: "?",
    target: "!a",
    distractors: ["a"],
    cards: [fact("f", "!alibi"), rule("r1", "a", "b"), rule("r2", "b", "alibi", "only-if"), fact("g", "c"), rule("r3", "a", "c")],
  };

  it("accepts a chain that uses contrapositives", () => {
    expect(verifyChain(puzzle).errors).toEqual([]);
    const answer = {
      steps: [
        { cardId: "f" },
        { cardId: "r2", orientation: "contrapositive" as const },
        { cardId: "r1", orientation: "contrapositive" as const },
      ],
    };
    expect(checkChainAnswer(puzzle, answer)).toEqual({ correct: true });
    expect(findShortestChain(puzzle)).toEqual(answer);
  });

  it("rejects converse and inverse readings, broken links and chains without a fact", () => {
    const converse = { steps: [{ cardId: "g" }, { cardId: "r3", orientation: "converse" as const }] };
    expect(checkChainAnswer(puzzle, converse).correct).toBe(false);
    const inverse = { steps: [{ cardId: "f" }, { cardId: "r2", orientation: "inverse" as const }] };
    expect(checkChainAnswer(puzzle, inverse).correct).toBe(false);
    expect(checkChainAnswer(puzzle, { steps: [{ cardId: "f" }, { cardId: "r1", orientation: "contrapositive" }] }).correct).toBe(false);
    expect(checkChainAnswer(puzzle, { steps: [{ cardId: "r2", orientation: "contrapositive" }] }).correct).toBe(false);
    expect(checkChainAnswer(puzzle, { steps: [] }).correct).toBe(false);
  });

  it("reports that the converse trap reaches the distractor", () => {
    expect(verifyChain(puzzle).metrics.temptingDistractors).toBe(1);
  });

  it("accepts a converse that genuinely follows, and warns that it is no trap", () => {
    const biconditional: ChainPuzzle = { ...puzzle, cards: [...puzzle.cards, rule("r4", "c", "a")] };
    const r = verifyChain(biconditional);
    expect(r.warnings).toContain('card "r3": the converse also follows, so it is no trap');
  });

  it("flags distractors that follow, missing readings, and a target that doesn't follow", () => {
    const bad: ChainPuzzle = {
      ...puzzle,
      target: "a",
      distractors: ["!b"],
      cards: [...puzzle.cards, { id: "r5", text: "r5", statement: { form: "if", a: "x", b: "y" } }],
    };
    const errors = verifyChain(bad).errors.join("\n");
    expect(errors).toContain('distractor "!b" actually follows');
    expect(errors).toContain('"r5" needs readings');
    expect(errors).toContain("the target does not follow");
  });
});

const ordering = (rules: Constraint[], question: ArrangementPuzzle["question"] = { kind: "full" }): ArrangementPuzzle => ({
  type: "arrangement",
  layout: "ordering",
  entities: ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id })),
  slots: ["s1", "s2", "s3", "s4", "s5"].map((id) => ({ id, label: id })),
  rules: rules.map((constraint, i) => ({ id: `r${i + 1}`, text: `rule ${i + 1}`, constraint })),
  question,
});

describe("The Arrangement", () => {
  it("rejects a puzzle with more than one solution", () => {
    const r = verifyArrangement(ordering([{ op: "before", a: "a", b: "b" }]));
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain("not unique");
  });

  it("rejects a unique puzzle that needs trial and error", () => {
    // Found by random search: unique, but single-rule deduction stalls.
    const rules: Constraint[] = [
      { op: "if", if: { op: "not-in", entity: "e", slots: ["s5"] }, then: { op: "adjacent", a: "b", b: "a" } },
      { op: "if", if: { op: "adjacent", a: "d", b: "c" }, then: { op: "before", a: "b", b: "e" } },
      { op: "or", any: [{ op: "adjacent", a: "b", b: "c" }, { op: "immediately-before", a: "b", b: "e" }] },
      { op: "or", any: [{ op: "immediately-before", a: "c", b: "d" }, { op: "before", a: "b", b: "c" }] },
      { op: "if", if: { op: "not-in", entity: "b", slots: ["s5"] }, then: { op: "immediately-before", a: "d", b: "b" } },
      { op: "or", any: [{ op: "immediately-before", a: "a", b: "b" }, { op: "adjacent", a: "a", b: "d" }] },
    ];
    const r = verifyArrangement(ordering(rules));
    expect(r.metrics.solutions).toBe(1);
    expect(r.errors.join()).toContain("trial and error");
  });

  it("answers a partial question even when the full order isn't unique", () => {
    const p = ordering(
      [
        { op: "in", entity: "a", slots: ["s3"] },
        { op: "before", a: "b", b: "c" },
      ],
      { kind: "occupants", slot: "s3" },
    );
    expect(verifyArrangement(p).errors).toEqual([]);
    expect(solveArrangement(p)).toEqual({ kind: "occupants", entities: ["a"] });
    expect(checkArrangementAnswer(p, { kind: "occupants", entities: ["a"] })).toBe(true);
    expect(checkArrangementAnswer(p, { kind: "occupants", entities: ["b"] })).toBe(false);
  });

  it("warns about redundant rules", () => {
    const p = ordering([
      { op: "in", entity: "a", slots: ["s1"] },
      { op: "in", entity: "b", slots: ["s2"] },
      { op: "in", entity: "c", slots: ["s3"] },
      { op: "in", entity: "d", slots: ["s4"] },
      { op: "before", a: "a", b: "e" },
    ]);
    const r = verifyArrangement(p);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('rule "r5" is redundant');
  });

  it("handles groupings with capacities", () => {
    const p: ArrangementPuzzle = {
      type: "arrangement",
      layout: "grouping",
      entities: ["a", "b", "c", "d"].map((id) => ({ id, name: id })),
      slots: [
        { id: "library", label: "Library", min: 1, max: 1 },
        { id: "garden", label: "Garden", min: 3, max: 3 },
      ],
      rules: [
        { id: "r1", text: "a and b were apart.", constraint: { op: "different", a: "a", b: "b" } },
        { id: "r2", text: "c was in the garden.", constraint: { op: "in", entity: "c", slots: ["garden"] } },
        { id: "r3", text: "d was with b.", constraint: { op: "same", a: "d", b: "b" } },
      ],
      question: { kind: "placement", entity: "a" },
    };
    expect(verifyArrangement(p).errors).toEqual([]);
    expect(solveArrangement(p)).toEqual({ kind: "placement", slot: "library" });
    expect(checkArrangementAnswer(p, { kind: "placement", slot: "garden" })).toBe(false);
  });

  it("rejects ordering-only rules in a grouping, and unknown names", () => {
    const p: ArrangementPuzzle = {
      type: "arrangement",
      layout: "grouping",
      entities: [{ id: "a", name: "a" }, { id: "b", name: "b" }],
      slots: [{ id: "x", label: "x" }, { id: "y", label: "y" }],
      rules: [
        { id: "r1", text: "?", constraint: { op: "before", a: "a", b: "b" } },
        { id: "r2", text: "?", constraint: { op: "in", entity: "z", slots: ["w"] } },
      ],
      question: { kind: "full" },
    };
    const errors = verifyArrangement(p).errors.join("\n");
    expect(errors).toContain("ordering-only");
    expect(errors).toContain('unknown entity "z"');
    expect(errors).toContain('unknown slot "w"');
  });
});

describe("The Flaw", () => {
  const flaw = (overrides: Partial<FlawPuzzle>): FlawPuzzle => ({
    type: "flaw",
    speaker: "lestrade",
    sentences: [
      { id: "s1", role: "premise", text: "Anyone who was at the dinner was invited." },
      { id: "s2", role: "premise", text: "Mr. Vance was not at the dinner." },
      { id: "s3", role: "conclusion", text: "So Mr. Vance was not invited." },
    ],
    answer: { sentenceId: "s3", flawType: "sufficient-as-necessary" },
    formal: {
      premises: [
        { form: "if", a: "vance-at-dinner", b: "vance-invited" },
        { form: "fact", literal: "!vance-at-dinner" },
      ],
      conclusion: "!vance-invited",
    },
    ...overrides,
  });

  it("classifies denying the antecedent", () => {
    expect(verifyFlaw(flaw({})).errors).toEqual([]);
  });

  it("classifies a valid argument as valid", () => {
    expect(
      classifyFormalArgument([{ form: "if", a: "p", b: "q" }, { form: "fact", literal: "p" }], "q"),
    ).toBe("valid");
  });

  it("rejects a mislabelled flaw, and a formal flaw with no logical form", () => {
    expect(verifyFlaw(flaw({ answer: { sentenceId: "s3", flawType: "necessary-as-sufficient" } })).ok).toBe(false);
    const { formal: _, ...rest } = flaw({});
    expect(verifyFlaw(rest).errors.join()).toContain("needs a logical form");
  });
});

describe("Objection!", () => {
  const objection: ObjectionPuzzle = {
    type: "objection",
    mode: "contradict",
    witness: "pike",
    testimony: [
      { id: "s1", text: "I stayed in the stables.", asserts: ["pike-in-stables"] },
      { id: "s2", text: "The lamp was out.", asserts: ["lamp-out"] },
    ],
    hand: [
      { id: "boots", name: "boots", establishes: ["pike-on-river-path"] },
      { id: "oil", name: "oil", establishes: ["lamp-burned-all-night"] },
    ],
    background: [
      { form: "if", a: "pike-on-river-path", b: "!pike-in-stables" },
      { form: "if", a: "lamp-burned-all-night", b: "!lamp-out" },
    ],
    answer: { sentenceId: "s1", evidenceId: "boots" },
  };

  it("finds an unintended second answer", () => {
    expect(matchingPairs(objection)).toHaveLength(2);
    expect(verifyObjection(objection).errors.join()).toContain("unintended second answer");
  });

  it("passes once the second contradiction is removed", () => {
    const fixed = { ...objection, hand: [objection.hand[0]!, { id: "key", name: "key", establishes: ["key-found"] }] };
    expect(verifyObjection(fixed).errors).toEqual([]);
  });

  it("supports Corroborate mode", () => {
    const corroborate: ObjectionPuzzle = {
      ...objection,
      mode: "support",
      testimony: [{ id: "s1", text: "I was on the river path.", asserts: ["pike-on-river-path"] }],
      hand: [
        { id: "boots", name: "boots", establishes: ["river-clay-on-boots"] },
        { id: "key", name: "key", establishes: ["key-found"] },
      ],
      background: [{ form: "if", a: "river-clay-on-boots", b: "pike-on-river-path" }],
    };
    expect(verifyObjection(corroborate).errors).toEqual([]);
  });
});

describe("Observation, Reconstruction and fair play", () => {
  it("requires a defeater for every unused inference", () => {
    const p: ObservationPuzzle = {
      type: "observation",
      observations: [{ id: "o1", text: "tan line" }],
      inferences: [
        { id: "i1", text: "has been abroad" },
        { id: "i2", text: "is a sailor" },
      ],
      answer: { links: [{ observation: "o1", inference: "i1" }] },
    };
    expect(verifyObservation(p).errors.join()).toContain('unused inference "i2" needs a defeater');
  });

  it("checks placeholders, the word bank and provenance", () => {
    const r: Reconstruction = {
      passage: "{{who}} did it with {{what}}.",
      blanks: [
        { id: "who", answer: "Vance", establishedBy: ["d1"] },
        { id: "how", answer: "poison", establishedBy: ["d9"] },
      ],
      wordBank: ["Vance", "Pike", "Pike"],
    };
    const errors = verifyReconstruction(r, new Set(["d1"])).errors.join("\n");
    expect(errors).toContain('placeholder "{{what}}" has no blank');
    expect(errors).toContain('blank "how" has no placeholder');
    expect(errors).toContain('"Pike" twice');
    expect(errors).toContain('answer "poison" is not in the word bank');
    expect(errors).toContain('unknown deduction or clue "d9"');
  });

  it("catches a deduction that comes before its clue", () => {
    const r = verifyFairPlay([
      { kind: "deduction", id: "d1", requires: ["boots"] },
      { kind: "clue", id: "boots" },
    ]);
    expect(r.errors).toEqual(['deduction "d1" needs "boots" before the player has it']);
  });
});
