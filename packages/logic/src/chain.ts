import type { ChainCard, ChainPuzzle, Literal, Orientation } from "@afoot/schema";
import {
  closure,
  compile,
  compileAll,
  contrapositive,
  entailsRule,
  isContradictory,
  negate,
  type Rule,
} from "./propositional.js";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

/** One card placed on the Chain Hall board, turned to an orientation (§8.4). */
export type ChainStep = { cardId: string; orientation?: Orientation };
export type ChainAnswer = { steps: ChainStep[] };

export type ChainCheck = { correct: true } | { correct: false; reason: string };

export function orient(rule: Rule, orientation: Orientation = "stated"): Rule {
  switch (orientation) {
    case "stated":
      return rule;
    case "contrapositive":
      return contrapositive(rule);
    case "converse":
      return { if: rule.then, then: rule.if };
    case "inverse":
      return { if: negate(rule.if), then: negate(rule.then) };
  }
}

function cardRule(card: ChainCard): Rule | undefined {
  return compile(card.statement).rules[0];
}

function cardFact(card: ChainCard): Literal | undefined {
  return compile(card.statement).facts[0];
}

function establishedRules(puzzle: ChainPuzzle): Rule[] {
  return compileAll(puzzle.cards.map((c) => c.statement)).rules;
}

/**
 * Checks a declared chain. It must start from a fact card; each following
 * card must be a conditional, turned so that its antecedent is the current
 * literal; and the chain must end on the target. A turned card is valid if
 * it still follows from the cards (always true for the stated reading and
 * the contrapositive, never for a genuine converse or inverse trap). Any
 * valid route counts.
 *
 * `reason` is for development and tests only; the player is never told why
 * a Declare failed (decision 21).
 */
export function checkChainAnswer(puzzle: ChainPuzzle, answer: ChainAnswer): ChainCheck {
  const cards = new Map(puzzle.cards.map((c) => [c.id, c]));
  const rules = establishedRules(puzzle);
  const used = new Set<string>();
  let current: Literal | undefined;

  for (const [i, step] of answer.steps.entries()) {
    const card = cards.get(step.cardId);
    if (!card) return { correct: false, reason: `unknown card "${step.cardId}"` };
    if (used.has(card.id)) return { correct: false, reason: `card "${card.id}" used twice` };
    used.add(card.id);

    if (i === 0) {
      const fact = cardFact(card);
      if (!fact || (step.orientation ?? "stated") !== "stated") {
        return { correct: false, reason: "a chain must start from a fact" };
      }
      current = fact;
      continue;
    }

    const rule = cardRule(card);
    if (!rule) return { correct: false, reason: `card "${card.id}" is not a conditional` };
    const applied = orient(rule, step.orientation);
    if (!entailsRule(rules, applied)) {
      return { correct: false, reason: `card "${card.id}" turned to its ${step.orientation} does not follow` };
    }
    if (applied.if !== current) {
      return { correct: false, reason: `card "${card.id}" does not follow from "${current}"` };
    }
    current = applied.then;
  }

  if (current === undefined) return { correct: false, reason: "empty chain" };
  if (current !== puzzle.target) {
    return { correct: false, reason: `chain ends at "${current}", not the target` };
  }
  return { correct: true };
}

/** The shortest valid chain to the target, or `undefined` if there is none. */
export function findShortestChain(puzzle: ChainPuzzle): ChainAnswer | undefined {
  const edges: { card: ChainCard; orientation: Orientation; rule: Rule }[] = [];
  for (const card of puzzle.cards) {
    const rule = cardRule(card);
    if (!rule) continue;
    edges.push({ card, orientation: "stated", rule });
    edges.push({ card, orientation: "contrapositive", rule: contrapositive(rule) });
  }

  type Node = { literal: Literal; steps: ChainStep[] };
  const queue: Node[] = [];
  const seen = new Set<Literal>();
  for (const card of puzzle.cards) {
    const fact = cardFact(card);
    if (fact && !seen.has(fact)) {
      seen.add(fact);
      queue.push({ literal: fact, steps: [{ cardId: card.id }] });
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.literal === puzzle.target) return { steps: node.steps };
    for (const e of edges) {
      if (e.rule.if !== node.literal || seen.has(e.rule.then)) continue;
      if (node.steps.some((s) => s.cardId === e.card.id)) continue;
      seen.add(e.rule.then);
      queue.push({
        literal: e.rule.then,
        steps: [...node.steps, { cardId: e.card.id, orientation: e.orientation }],
      });
    }
  }
  return undefined;
}

/** Pipeline verification of a Chain puzzle (§14.4). */
export function verifyChain(puzzle: ChainPuzzle): VerifyResult {
  const report = new Report();
  checkUniqueIds(report, "card", puzzle.cards.map((c) => c.id));

  const { facts, rules } = compileAll(puzzle.cards.map((c) => c.statement));
  const derived = closure(facts, rules);

  if (isContradictory(derived)) report.error("the cards contradict each other");
  if (facts.length === 0) report.error("no fact card to start a chain from");
  if (!derived.has(puzzle.target)) report.error("the target does not follow from the cards");

  for (const d of puzzle.distractors) {
    if (d === puzzle.target) report.error(`distractor "${d}" is the target`);
    else if (derived.has(d)) report.error(`distractor "${d}" actually follows from the cards`);
  }

  // The traps are the converse and inverse readings of each conditional.
  const trapRules: Rule[] = [];
  for (const card of puzzle.cards) {
    const rule = cardRule(card);
    if (!rule) {
      if (card.readings) report.error(`fact card "${card.id}" can't be turned, so it needs no readings`);
      continue;
    }
    if (!card.readings) report.error(`conditional card "${card.id}" needs readings for each orientation`);
    for (const o of ["converse", "inverse"] as const) {
      const trap = orient(rule, o);
      if (entailsRule(rules, trap)) report.warn(`card "${card.id}": the ${o} also follows, so it is no trap`);
      else trapRules.push(trap);
    }
  }

  // A careless reasoner who accepts converses and inverses should be able to
  // reach a wrong conclusion; otherwise the traps tempt nobody.
  const careless = closure(facts, [...rules, ...trapRules]);
  const tempting = puzzle.distractors.filter((d) => careless.has(d));
  if (puzzle.distractors.length > 0 && tempting.length === 0) {
    report.warn("no distractor is reachable through a converse or inverse");
  }

  for (const literal of [puzzle.target, ...puzzle.distractors]) {
    if (!puzzle.phrases[literal]) report.warn(`no phrase for "${literal}", so the board can't state it`);
  }

  const shortest = findShortestChain(puzzle);
  if (derived.has(puzzle.target) && !shortest) {
    report.error("the target follows, but no chain of cards reaches it");
  }
  if (shortest) {
    const check = checkChainAnswer(puzzle, shortest);
    if (!check.correct) report.error(`internal: shortest chain rejected (${check.reason})`);
    report.metric("chainLength", shortest.steps.length);
    report.metric("contrapositiveSteps", shortest.steps.filter((s) => s.orientation === "contrapositive").length);
  }
  report.metric("cards", puzzle.cards.length);
  report.metric("traps", trapRules.length);
  report.metric("temptingDistractors", tempting.length);
  return report.done();
}
