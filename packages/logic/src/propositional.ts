import type { Literal, Statement } from "@afoot/schema";

/** A single-literal conditional: `if` → `then`. */
export type Rule = { if: Literal; then: Literal };

export function negate(literal: Literal): Literal {
  return literal.startsWith("!") ? literal.slice(1) : `!${literal}`;
}

export function contrapositive(rule: Rule): Rule {
  return { if: negate(rule.then), then: negate(rule.if) };
}

/** Turns a story statement into its logical form (§14.4). */
export function compile(statement: Statement): { facts: Literal[]; rules: Rule[] } {
  switch (statement.form) {
    case "fact":
      return { facts: [statement.literal], rules: [] };
    case "if":
    case "only-if":
      // "If a, then b" and "a only if b" both mean a → b.
      return { facts: [], rules: [{ if: statement.a, then: statement.b }] };
    case "unless":
      // "a unless b" means ¬b → a.
      return { facts: [], rules: [{ if: negate(statement.b), then: statement.a }] };
  }
}

export function compileAll(statements: readonly Statement[]): { facts: Literal[]; rules: Rule[] } {
  const facts: Literal[] = [];
  const rules: Rule[] = [];
  for (const s of statements) {
    const c = compile(s);
    facts.push(...c.facts);
    rules.push(...c.rules);
  }
  return { facts, rules };
}

/**
 * Everything that follows from `facts` under `rules`, by forward chaining.
 * Contrapositives are applied too, since they are always valid.
 */
export function closure(facts: Iterable<Literal>, rules: readonly Rule[]): Set<Literal> {
  const known = new Set(facts);
  const all = rules.flatMap((r) => [r, contrapositive(r)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of all) {
      if (known.has(r.if) && !known.has(r.then)) {
        known.add(r.then);
        changed = true;
      }
    }
  }
  return known;
}

/** True when the set holds some literal and its negation. */
export function isContradictory(literals: ReadonlySet<Literal>): boolean {
  for (const l of literals) if (literals.has(negate(l))) return true;
  return false;
}

/**
 * Whether `rule` follows from `rules` alone (without any facts): assuming its
 * antecedent, can its consequent be derived? Facts are deliberately left out:
 * a known-false antecedent makes any conditional vacuously true, which is
 * not what a player means by "this follows".
 */
export function entailsRule(rules: readonly Rule[], rule: Rule): boolean {
  return closure([rule.if], rules).has(rule.then);
}
