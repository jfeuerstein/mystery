import type { ArrangementPuzzle, Constraint } from "@afoot/schema";
import { checkUniqueIds, Report, type VerifyResult } from "./result.js";

/** Entity id → slot index. */
type Assignment = Map<string, number>;

/** Entity id → slot id: a complete arrangement. */
export type Placements = Record<string, string>;

export type ArrangementAnswer =
  | { kind: "full"; placements: Placements }
  | { kind: "occupants"; entities: string[] }
  | { kind: "placement"; slot: string };

const ORDERING_ONLY = new Set(["before", "immediately-before", "adjacent", "not-adjacent"]);

/** How many a group may hold, as the board and the player view say it ("at most 3"), or nothing. */
export function capacityText(slot: { min?: number | undefined; max?: number | undefined }): string | undefined {
  const { min, max } = slot;
  if (min !== undefined && max !== undefined) return min === max ? `exactly ${min}` : `${min} to ${max}`;
  if (max !== undefined) return `at most ${max}`;
  if (min !== undefined && min > 0) return `at least ${min}`;
  return undefined;
}

function scope(c: Constraint, into = new Set<string>()): Set<string> {
  switch (c.op) {
    case "in":
    case "not-in":
      into.add(c.entity);
      break;
    case "if":
      scope(c.if, into);
      scope(c.then, into);
      break;
    case "not":
      scope(c.c, into);
      break;
    case "or":
      for (const sub of c.any) scope(sub, into);
      break;
    default:
      into.add(c.a);
      into.add(c.b);
  }
  return into;
}

function slotIdsIn(c: Constraint, into: string[] = []): string[] {
  switch (c.op) {
    case "in":
    case "not-in":
      into.push(...c.slots);
      break;
    case "if":
      slotIdsIn(c.if, into);
      slotIdsIn(c.then, into);
      break;
    case "not":
      slotIdsIn(c.c, into);
      break;
    case "or":
      for (const sub of c.any) slotIdsIn(sub, into);
      break;
  }
  return into;
}

function opsIn(c: Constraint, into: string[] = []): string[] {
  into.push(c.op);
  if (c.op === "if") {
    opsIn(c.if, into);
    opsIn(c.then, into);
  } else if (c.op === "not") opsIn(c.c, into);
  else if (c.op === "or") for (const sub of c.any) opsIn(sub, into);
  return into;
}

/** Three-valued evaluation: `undefined` while an involved entity is unplaced. */
function evaluate(c: Constraint, asg: Assignment, slotIndex: Map<string, number>): boolean | undefined {
  switch (c.op) {
    case "in":
    case "not-in": {
      const v = asg.get(c.entity);
      if (v === undefined) return undefined;
      const inside = c.slots.some((s) => slotIndex.get(s) === v);
      return c.op === "in" ? inside : !inside;
    }
    case "if": {
      const cond = evaluate(c.if, asg, slotIndex);
      if (cond === false) return true;
      const then = evaluate(c.then, asg, slotIndex);
      if (cond === true) return then;
      return then === true ? true : undefined;
    }
    case "not": {
      const v = evaluate(c.c, asg, slotIndex);
      return v === undefined ? undefined : !v;
    }
    case "or": {
      let unknown = false;
      for (const sub of c.any) {
        const v = evaluate(sub, asg, slotIndex);
        if (v === true) return true;
        if (v === undefined) unknown = true;
      }
      return unknown ? undefined : false;
    }
    default: {
      const a = asg.get(c.a);
      const b = asg.get(c.b);
      if (a === undefined || b === undefined) return undefined;
      switch (c.op) {
        case "same":
          return a === b;
        case "different":
          return a !== b;
        case "before":
          return a < b;
        case "immediately-before":
          return b === a + 1;
        case "adjacent":
          return Math.abs(a - b) === 1;
        case "not-adjacent":
          return Math.abs(a - b) !== 1;
      }
    }
  }
}

class Model {
  readonly entities: string[];
  readonly slotIndex: Map<string, number>;
  readonly ordering: boolean;
  readonly mins: number[];
  readonly maxes: number[];

  constructor(
    readonly puzzle: ArrangementPuzzle,
    readonly constraints: Constraint[] = puzzle.rules.map((r) => r.constraint),
  ) {
    this.entities = puzzle.entities.map((e) => e.id);
    this.slotIndex = new Map(puzzle.slots.map((s, i) => [s.id, i]));
    this.ordering = puzzle.layout === "ordering";
    this.mins = puzzle.slots.map((s) => (this.ordering ? 1 : (s.min ?? 0)));
    this.maxes = puzzle.slots.map((s) => (this.ordering ? 1 : (s.max ?? Infinity)));
  }

  get slotCount(): number {
    return this.puzzle.slots.length;
  }

  /** Every constraint holds and no capacity is exceeded (partial assignments allowed). */
  consistent(asg: Assignment): boolean {
    const counts = new Array<number>(this.slotCount).fill(0);
    for (const v of asg.values()) {
      counts[v] = (counts[v] ?? 0) + 1;
      if (counts[v]! > this.maxes[v]!) return false;
    }
    if (asg.size === this.entities.length) {
      if (counts.some((n, i) => n < this.mins[i]!)) return false;
    }
    return this.constraints.every((c) => evaluate(c, asg, this.slotIndex) !== false);
  }

  /** All solutions, up to `limit`. */
  solve(limit = 1000): Assignment[] {
    const solutions: Assignment[] = [];
    const asg: Assignment = new Map();
    const walk = (i: number): void => {
      if (solutions.length >= limit) return;
      if (i === this.entities.length) {
        solutions.push(new Map(asg));
        return;
      }
      const e = this.entities[i]!;
      for (let v = 0; v < this.slotCount; v++) {
        asg.set(e, v);
        if (this.consistent(asg)) walk(i + 1);
        asg.delete(e);
      }
    };
    walk(0);
    return solutions;
  }

  /**
   * Human-style solving without guessing: repeatedly removes candidates that
   * a single rule, or the one-per-slot / capacity limits, rule out. Never
   * removes a value that appears in some solution.
   */
  deduce(): { domains: Map<string, Set<number>>; eliminations: number; rounds: number; contradiction: boolean } {
    const domains = new Map(
      this.entities.map((e) => [e, new Set(Array.from({ length: this.slotCount }, (_, i) => i))]),
    );
    let eliminations = 0;
    let rounds = 0;
    const remove = (e: string, v: number): void => {
      if (domains.get(e)!.delete(v)) eliminations++;
    };

    let changed = true;
    while (changed) {
      changed = false;
      rounds++;
      const before = eliminations;

      for (const c of this.constraints) {
        const vars = [...scope(c)];
        for (const x of vars) {
          for (const v of [...domains.get(x)!]) {
            if (!this.supported(c, vars, x, v, domains)) remove(x, v);
          }
        }
      }

      if (this.ordering) {
        for (const [x, dom] of domains) {
          if (dom.size !== 1) continue;
          const [v] = dom;
          for (const [y, other] of domains) if (y !== x && other.has(v!)) remove(y, v!);
        }
        for (let v = 0; v < this.slotCount; v++) {
          const holders = this.entities.filter((e) => domains.get(e)!.has(v));
          if (holders.length === 1) {
            const dom = domains.get(holders[0]!)!;
            for (const w of [...dom]) if (w !== v) remove(holders[0]!, w);
          }
        }
      } else {
        for (let v = 0; v < this.slotCount; v++) {
          const fixed = this.entities.filter((e) => domains.get(e)!.size === 1 && domains.get(e)!.has(v));
          if (fixed.length >= this.maxes[v]!) {
            for (const e of this.entities) if (!fixed.includes(e)) remove(e, v);
          }
          const candidates = this.entities.filter((e) => domains.get(e)!.has(v));
          if (candidates.length === this.mins[v]) {
            for (const e of candidates) for (const w of [...domains.get(e)!]) if (w !== v) remove(e, w);
          }
        }
      }

      if ([...domains.values()].some((d) => d.size === 0)) {
        return { domains, eliminations, rounds, contradiction: true };
      }
      changed = eliminations > before;
    }
    return { domains, eliminations, rounds, contradiction: false };
  }

  /** Can `c` still hold with `x` in slot `v`, given the other entities' candidates? */
  private supported(
    c: Constraint,
    vars: string[],
    x: string,
    v: number,
    domains: Map<string, Set<number>>,
  ): boolean {
    const asg: Assignment = new Map([[x, v]]);
    const others = vars.filter((y) => y !== x);
    // People outside the rule already settled in a slot take up its room.
    const settled = new Array<number>(this.slotCount).fill(0);
    for (const [e, dom] of domains) if (!vars.includes(e) && dom.size === 1) settled[[...dom][0]!]!++;
    const walk = (i: number): boolean => {
      if (i === others.length) return evaluate(c, asg, this.slotIndex) === true;
      const y = others[i]!;
      for (const w of domains.get(y)!) {
        // Respect slot capacities (one per slot in an ordering), counting
        // the rule's own entities and everyone settled: "two people together
        // can't share a room with one bed left".
        const inSlot = [...asg.values()].filter((u) => u === w).length + settled[w]!;
        if (inSlot >= this.maxes[w]!) continue;
        asg.set(y, w);
        if (evaluate(c, asg, this.slotIndex) !== false && walk(i + 1)) return true;
        asg.delete(y);
      }
      return false;
    };
    return walk(0);
  }
}

function occupants(asg: Assignment, slot: number): string[] {
  return [...asg].filter(([, v]) => v === slot).map(([e]) => e).sort();
}

/** The answer every solution agrees on, or `undefined` if solutions disagree. */
function forcedAnswer(puzzle: ArrangementPuzzle, solutions: Assignment[]): ArrangementAnswer | undefined {
  const first = solutions[0];
  if (!first) return undefined;
  const slotIds = puzzle.slots.map((s) => s.id);
  const q = puzzle.question;
  switch (q.kind) {
    case "full": {
      if (solutions.length !== 1) return undefined;
      const placements: Placements = {};
      for (const [e, v] of first) placements[e] = slotIds[v]!;
      return { kind: "full", placements };
    }
    case "occupants": {
      const index = slotIds.indexOf(q.slot);
      const key = occupants(first, index).join(",");
      if (solutions.some((s) => occupants(s, index).join(",") !== key)) return undefined;
      return { kind: "occupants", entities: occupants(first, index) };
    }
    case "placement": {
      const v = first.get(q.entity);
      if (v === undefined || solutions.some((s) => s.get(q.entity) !== v)) return undefined;
      return { kind: "placement", slot: slotIds[v]! };
    }
  }
}

/** Whether deduction alone (no guessing) pins down what the question asks. */
function deductionSettles(puzzle: ArrangementPuzzle, domains: Map<string, Set<number>>): boolean {
  const q = puzzle.question;
  switch (q.kind) {
    case "full":
      return [...domains.values()].every((d) => d.size === 1);
    case "placement":
      return domains.get(q.entity)?.size === 1;
    case "occupants": {
      const index = puzzle.slots.findIndex((s) => s.id === q.slot);
      return [...domains.values()].every((d) => !d.has(index) || d.size === 1);
    }
  }
}

/** Pipeline verification of an Arrangement puzzle (§8.5, §14.4). */
export function verifyArrangement(puzzle: ArrangementPuzzle): VerifyResult {
  const report = new Report();
  const entityIds = new Set(puzzle.entities.map((e) => e.id));
  const slotIds = new Set(puzzle.slots.map((s) => s.id));
  checkUniqueIds(report, "entity", puzzle.entities.map((e) => e.id));
  checkUniqueIds(report, "slot", puzzle.slots.map((s) => s.id));
  checkUniqueIds(report, "rule", puzzle.rules.map((r) => r.id));

  if (puzzle.layout === "ordering") {
    if (puzzle.slots.length !== puzzle.entities.length) {
      report.error("an ordering needs exactly one slot per entity");
    }
    if (puzzle.slots.some((s) => s.min !== undefined || s.max !== undefined)) {
      report.error("ordering slots can't have capacities");
    }
  }
  for (const rule of puzzle.rules) {
    for (const e of scope(rule.constraint)) {
      if (!entityIds.has(e)) report.error(`rule "${rule.id}" names unknown entity "${e}"`);
    }
    for (const s of slotIdsIn(rule.constraint)) {
      if (!slotIds.has(s)) report.error(`rule "${rule.id}" names unknown slot "${s}"`);
    }
    if (puzzle.layout === "grouping" && opsIn(rule.constraint).some((op) => ORDERING_ONLY.has(op))) {
      report.error(`rule "${rule.id}" uses an ordering-only constraint in a grouping`);
    }
  }
  if (puzzle.layout === "schedule") {
    // A schedule is both at once: some group holds several people, and some rule is about order.
    if (puzzle.entities.length <= puzzle.slots.length) {
      report.error("a schedule needs more people than groups, or it is only an ordering");
    }
    if (!puzzle.rules.some((r) => opsIn(r.constraint).some((op) => ORDERING_ONLY.has(op)))) {
      report.error("a schedule needs a rule about order, or it is only a grouping");
    }
  }
  const q = puzzle.question;
  if (q.kind === "occupants" && !slotIds.has(q.slot)) report.error(`question names unknown slot "${q.slot}"`);
  if (q.kind === "placement" && !entityIds.has(q.entity)) {
    report.error(`question names unknown entity "${q.entity}"`);
  }
  if (report.errors.length > 0) return report.done();

  const model = new Model(puzzle);
  const solutions = model.solve();
  report.metric("solutions", solutions.length);
  if (solutions.length === 0) {
    report.error("the rules have no solution");
    return report.done();
  }
  const answer = forcedAnswer(puzzle, solutions);
  if (!answer) {
    report.error(
      q.kind === "full"
        ? `the arrangement is not unique (${solutions.length}${solutions.length >= 1000 ? "+" : ""} solutions)`
        : "the answer to the question is not forced",
    );
    return report.done();
  }

  const deduced = model.deduce();
  report.metric("eliminations", deduced.eliminations);
  report.metric("rounds", deduced.rounds);
  if (!deductionSettles(puzzle, deduced.domains)) {
    report.error("the answer can't be reached by deduction alone; it needs trial and error");
  }

  // A rule whose removal changes nothing is clutter (§7.2's spirit, for rules).
  for (const rule of puzzle.rules) {
    const without = new Model(
      puzzle,
      puzzle.rules.filter((r) => r !== rule).map((r) => r.constraint),
    );
    if (forcedAnswer(puzzle, without.solve())) report.warn(`rule "${rule.id}" is redundant`);
  }
  report.metric("rules", puzzle.rules.length);
  return report.done();
}

/** The correct answer to the puzzle's question, or `undefined` if it isn't forced. */
export function solveArrangement(puzzle: ArrangementPuzzle): ArrangementAnswer | undefined {
  return forcedAnswer(puzzle, new Model(puzzle).solve());
}

/** Checks a player's Declare. Any arrangement that satisfies every rule is correct. */
export function checkArrangementAnswer(puzzle: ArrangementPuzzle, answer: ArrangementAnswer): boolean {
  if (answer.kind !== puzzle.question.kind) return false;
  const model = new Model(puzzle);

  if (answer.kind === "full") {
    const asg: Assignment = new Map();
    for (const e of model.entities) {
      const slot = answer.placements[e];
      const v = slot === undefined ? undefined : model.slotIndex.get(slot);
      if (v === undefined) return false;
      asg.set(e, v);
    }
    if (model.ordering && new Set(asg.values()).size !== asg.size) return false;
    return model.consistent(asg);
  }

  const expected = solveArrangement(puzzle);
  if (!expected) return false;
  if (answer.kind === "occupants" && expected.kind === "occupants") {
    return [...answer.entities].sort().join(",") === expected.entities.join(",");
  }
  if (answer.kind === "placement" && expected.kind === "placement") {
    return answer.slot === expected.slot;
  }
  return false;
}
