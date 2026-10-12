import type {
  ArrangementPuzzle,
  ChainCard,
  ChainPuzzle,
  Constraint,
  FlawPuzzle,
  MissingLinkPuzzle,
  ObjectionPuzzle,
  ObservationPuzzle,
  ParallelPuzzle,
  Reconstruction,
} from "@afoot/schema";
import { describe, expect, it } from "vitest";
import {
  checkArrangementAnswer,
  checkChainAnswer,
  checkMissingLinkAnswer,
  checkParallelAnswer,
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
  verifyMissingLink,
  verifyObjection,
  verifyObservation,
  verifyParallel,
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
    phrases: { "!a": "not a", a: "a" },
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

  // A schedule (complex arrangements): days in order, several callers a day.
  const schedule = (overrides: Partial<ArrangementPuzzle> = {}): ArrangementPuzzle => ({
    type: "arrangement",
    layout: "schedule",
    entities: ["holt", "ives", "kerr", "lamb", "moss"].map((id) => ({ id, name: id })),
    slots: [
      { id: "mon", label: "Monday", max: 3 },
      { id: "tue", label: "Tuesday", max: 2 },
      { id: "wed", label: "Wednesday", max: 1 },
    ],
    rules: [
      { id: "r1", text: "Holt called the day before Kerr.", constraint: { op: "immediately-before", a: "holt", b: "kerr" } },
      { id: "r2", text: "Ives and Lamb called on the same day.", constraint: { op: "same", a: "ives", b: "lamb" } },
      { id: "r3", text: "Moss called on an earlier day than Holt.", constraint: { op: "before", a: "moss", b: "holt" } },
    ],
    question: { kind: "full" },
    ...overrides,
  });

  it("solves a schedule by deduction, counting who already fills a day", () => {
    // Ives and Lamb can't share Tuesday: it holds two, and Holt is settled there.
    const result = verifyArrangement(schedule());
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(solveArrangement(schedule())).toEqual({
      kind: "full",
      placements: { holt: "tue", ives: "mon", kerr: "wed", lamb: "mon", moss: "mon" },
    });
    const wrong = { holt: "tue", ives: "tue", kerr: "wed", lamb: "tue", moss: "mon" };
    expect(checkArrangementAnswer(schedule(), { kind: "full", placements: wrong })).toBe(false);
  });

  it("rejects a schedule that is only an ordering or only a grouping", () => {
    const p = schedule();
    const onePerDay = schedule({ entities: p.entities.slice(0, 3), slots: p.slots });
    expect(verifyArrangement(onePerDay).errors.join()).toContain("only an ordering");
    const noOrder = schedule({ rules: [p.rules[1]!] });
    expect(verifyArrangement(noOrder).errors.join()).toContain("only a grouping");
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

describe("the Parallel", () => {
  // The argument affirms the consequent; o2 makes the same error on another
  // subject, o1 argues validly about the same subject (the surface trap) and
  // o3 attacks the man.
  const parallel = (overrides: Partial<ParallelPuzzle>): ParallelPuzzle => ({
    type: "parallel",
    speaker: "lestrade",
    sentences: [
      { id: "s1", role: "premise", text: "Whoever forged the cheque had the bank's paper." },
      { id: "s2", role: "premise", text: "Mr. Crane had the bank's paper." },
      { id: "s3", role: "conclusion", text: "So Mr. Crane forged the cheque." },
    ],
    flaw: "necessary-as-sufficient",
    formal: {
      premises: [
        { form: "if", a: "crane-forged", b: "crane-paper" },
        { form: "fact", literal: "crane-paper" },
      ],
      conclusion: "crane-forged",
    },
    options: [
      {
        id: "o1",
        text: "Whoever forged the cheque had the bank's paper. Mr. Crane had none, so he did not forge it.",
        flaw: "valid",
        formal: {
          premises: [
            { form: "if", a: "crane-forged", b: "crane-paper" },
            { form: "fact", literal: "!crane-paper" },
          ],
          conclusion: "!crane-forged",
        },
      },
      {
        id: "o2",
        text: "Anyone who rode to the mill got mud on his boots. The miller's boy has mud on his boots, so he rode to the mill.",
        flaw: "necessary-as-sufficient",
        formal: {
          premises: [
            { form: "if", a: "boy-rode", b: "boy-mud" },
            { form: "fact", literal: "boy-mud" },
          ],
          conclusion: "boy-rode",
        },
      },
      {
        id: "o3",
        text: "The curate says the bell rang at nine. But the curate is a gambler, so it did not.",
        flaw: "attacking-the-man",
      },
    ],
    answer: { optionId: "o2" },
    ...overrides,
  });

  it("accepts one option with the same error and others that go wrong differently", () => {
    const result = verifyParallel(parallel({}));
    expect(result.errors).toEqual([]);
    expect(result.metrics.options).toBe(3);
    expect(checkParallelAnswer(parallel({}), { optionId: "o2" })).toBe(true);
    expect(checkParallelAnswer(parallel({}), { optionId: "o1" })).toBe(false);
  });

  it("rejects an answer that commits a different error, or a second match", () => {
    expect(verifyParallel(parallel({ answer: { optionId: "o3" } })).errors.join()).toContain('commits "attacking-the-man"');
    const p = parallel({});
    const twice = parallel({ options: [...p.options, { ...p.options[1]!, id: "o4" }] });
    expect(verifyParallel(twice).errors.join()).toContain("2 options commit");
  });

  it("rejects a puzzle whose other options are all valid", () => {
    const p = parallel({});
    const valid = { ...p.options[0]!, id: "o3" };
    expect(verifyParallel(parallel({ options: [p.options[0]!, p.options[1]!, valid] })).errors.join()).toContain("merely the flawed one");
  });

  it("checks every logical form against the error it is said to commit", () => {
    const p = parallel({});
    // o1 is labelled as the same error, but its form is valid.
    const mislabelled = parallel({ options: [{ ...p.options[0]!, flaw: "sufficient-as-necessary" }, p.options[1]!, p.options[2]!] });
    expect(verifyParallel(mislabelled).errors.join()).toContain('option "o1"\'s logical form reads as "valid"');
    const { formal: _, ...bare } = p.options[1]!;
    expect(verifyParallel(parallel({ options: [p.options[0]!, bare, p.options[2]!] })).errors.join()).toContain("needs a logical form");
  });

  it("rejects an unknown answer and duplicate ids", () => {
    expect(verifyParallel(parallel({ answer: { optionId: "o9" } })).ok).toBe(false);
    const p = parallel({});
    expect(verifyParallel(parallel({ options: [p.options[0]!, { ...p.options[1]!, id: "o1" }, p.options[2]!] })).ok).toBe(false);
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

describe("The Missing Link", () => {
  // "Pike was in the stables at nine, so he cannot have stopped the clock."
  // Unsaid: no one who was in the stables at nine could have stopped it.
  const link: MissingLinkPuzzle = {
    type: "missing-link",
    speaker: "lestrade",
    sentences: [
      { id: "s1", text: "Pike was in the stables at nine.", role: "premise" },
      { id: "s2", text: "So Pike cannot have stopped the clock.", role: "conclusion" },
    ],
    premises: [{ form: "fact", literal: "pike-in-stables" }],
    conclusion: "!pike-stopped-clock",
    frame: "no-one-who",
    tiles: [
      { id: "stables", text: "was in the stables at nine", literal: "pike-in-stables" },
      { id: "clock", text: "stopped the clock", literal: "pike-stopped-clock" },
      { id: "dogs", text: "heard the dogs", literal: "pike-heard-dogs" },
      { id: "key", text: "had a key to the hall", literal: "pike-had-key" },
    ],
    answer: { a: "stables", b: "clock" },
  };

  it("verifies a link with one premise that closes the gap", () => {
    const r = verifyMissingLink(link);
    expect(r.errors).toEqual([]);
    expect(checkMissingLinkAnswer(link, { a: "stables", b: "clock" })).toBe(true);
    // "No one who stopped the clock was in the stables" says the same thing.
    expect(checkMissingLinkAnswer(link, { a: "clock", b: "stables" })).toBe(true);
    expect(checkMissingLinkAnswer(link, { a: "dogs", b: "clock" })).toBe(false);
    expect(checkMissingLinkAnswer(link, { a: "stables", b: "stables" })).toBe(false);
  });

  it("rejects an argument with no gap", () => {
    const closed = { ...link, premises: [...link.premises, { form: "if" as const, a: "pike-in-stables", b: "!pike-stopped-clock" }] };
    expect(verifyMissingLink(closed).errors.join()).toMatch(/no gap/);
  });

  it("rejects a reversed if-then link, and accepts only the direction that follows", () => {
    // "The clock was stopped on purpose, so the murderer wanted a false time of death."
    const ifLink: MissingLinkPuzzle = {
      ...link,
      frame: "if",
      premises: [{ form: "fact", literal: "stopped-on-purpose" }],
      conclusion: "wanted-false-time",
      tiles: [
        { id: "purpose", text: "the clock was stopped on purpose", literal: "stopped-on-purpose" },
        { id: "false", text: "the murderer wanted a false time of death", literal: "wanted-false-time" },
        { id: "alibi", text: "the murderer had an alibi", literal: "had-alibi" },
        { id: "servant", text: "the murderer was a servant", literal: "servant" },
      ],
      answer: { a: "purpose", b: "false" },
    };
    expect(verifyMissingLink(ifLink).errors).toEqual([]);
    expect(checkMissingLinkAnswer(ifLink, { a: "false", b: "purpose" })).toBe(false);
    const wrongWay = { ...ifLink, answer: { a: "false", b: "purpose" } };
    expect(verifyMissingLink(wrongWay).errors.join()).toMatch(/intended filling does not close/);
  });

  it("rejects tiles that let two different premises close the gap", () => {
    // With a fact A and a rule B → C, both A → B and A → C close it.
    const twoWays: MissingLinkPuzzle = {
      ...link,
      frame: "if",
      premises: [
        { form: "fact", literal: "a" },
        { form: "if", a: "b", b: "c" },
      ],
      conclusion: "c",
      tiles: [
        { id: "ta", text: "a", literal: "a" },
        { id: "tb", text: "b", literal: "b" },
        { id: "tc", text: "c", literal: "c" },
        { id: "td", text: "d", literal: "d" },
      ],
      answer: { a: "ta", b: "tb" },
    };
    expect(verifyMissingLink(twoWays).errors.join()).toMatch(/more than one premise/);
    const withoutC = { ...twoWays, tiles: twoWays.tiles.filter((t) => t.id !== "tc") };
    expect(verifyMissingLink(withoutC).errors).toEqual([]);
  });

  it("reads 'unless' and 'only if' frames by code, not by the case", () => {
    const unless: MissingLinkPuzzle = {
      ...link,
      frame: "unless",
      premises: [{ form: "fact", literal: "!dogs-barked" }],
      conclusion: "visitor-known",
      tiles: [
        { id: "known", text: "the visitor was known to the house", literal: "visitor-known" },
        { id: "barked", text: "the dogs barked", literal: "dogs-barked" },
        { id: "rain", text: "it was raining", literal: "raining" },
        { id: "late", text: "the hour was late", literal: "late" },
      ],
      // "The visitor was known to the house unless the dogs barked": ¬barked → known.
      answer: { a: "known", b: "barked" },
    };
    expect(verifyMissingLink(unless).errors).toEqual([]);
    // "a unless b" is "a or b": read either way round, it is the same premise.
    expect(checkMissingLinkAnswer(unless, { a: "barked", b: "known" })).toBe(true);
    expect(checkMissingLinkAnswer(unless, { a: "known", b: "rain" })).toBe(false);
    const onlyIf = { ...unless, frame: "only-if" as const, premises: [{ form: "fact" as const, literal: "visitor-known" }], conclusion: "!dogs-barked" };
    // "The dogs barked only if the visitor was a stranger" is not offered; known → ¬barked needs "barked only if not known".
    expect(verifyMissingLink(onlyIf).errors.join()).toMatch(/no filling/);
  });
});
