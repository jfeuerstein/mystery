// How a season's cases relate to each other (GAME_DESIGN.md §5, decision 27).
// Seasons are standalone by default: every case is self-contained. A serial
// season carries a thread and its people from case to case. Its first case
// plans the thread, each case records in the sealed ledger what it handed on,
// and `afoot next` gives that record to the next case's session. Each case
// still has its own culprit and is solvable from its own text alone.
import type { LedgerEntry } from "./ledger.js";
import type { Carry, Concept, SeasonArc } from "./plan.js";

export type SeasonStyle = { serial: boolean; length: number };

/** Seasons that differ from the default. Season 2 was the serial experiment, and Season 3 kept it (decision 27). */
const SEASONS: Record<number, Partial<SeasonStyle>> = { 2: { serial: true }, 3: { serial: true } };

export function seasonStyle(season: number): SeasonStyle {
  return { serial: false, length: 8, ...SEASONS[season] };
}

/** What `next --init` writes for the session to replace. */
export const TO_WRITE = "WRITE THIS";

/** A serial season so far: the thread as the latest case left it, and what each case handed on. */
export function seasonSoFar(ledger: LedgerEntry[], season: number): { arc?: SeasonArc; previously: (Carry & { case: number })[] } {
  const earlier = ledger.filter((e) => e.season === season).sort((a, b) => a.number - b.number);
  const arc = earlier.filter((e) => e.arc).at(-1)?.arc;
  return {
    ...(arc ? { arc } : {}),
    previously: earlier.flatMap((e) => (e.carry ? [{ case: e.number, ...e.carry }] : [])),
  };
}

/** The continuity fields `next --init` puts in concept.json: the thread carried forward (or a plan to write), and a carry to fill. */
export function continuityTemplate(ledger: LedgerEntry[], season: number): Pick<Concept, "arc" | "carry"> {
  const { length } = seasonStyle(season);
  const arc = seasonSoFar(ledger, season).arc ?? {
    truth: TO_WRITE,
    plan: Array.from({ length }, (_, i) => ({ case: i + 1, beat: TO_WRITE })),
    resolution: TO_WRITE,
  };
  return { arc, carry: { outcome: TO_WRITE, threadBeat: TO_WRITE, cast: [], hooks: [], callbacks: [] } };
}

/** The `continuity` gates `afoot seal` applies. Standalone seasons have none. */
export function continuityGates(concept: Concept, ledger: LedgerEntry[]): string[] {
  const { serial, length } = seasonStyle(concept.season);
  if (!serial) return [];
  const gates: string[] = [];
  const { number } = concept;
  if (number > length) gates.push(`continuity: season ${concept.season} is planned as ${length} cases`);
  const { arc, carry } = concept;
  if (!arc || !carry) {
    gates.push("continuity: a serial season's concept.json needs arc and carry");
    return gates;
  }
  if (JSON.stringify({ arc, carry }).includes(TO_WRITE)) gates.push(`continuity: concept.json still says "${TO_WRITE}"`);
  const planned = new Set(arc.plan.map((p) => p.case));
  for (let n = number; n <= length; n++) if (!planned.has(n)) gates.push(`continuity: the arc has no line for case ${n}`);
  const before = seasonSoFar(ledger, concept.season).arc;
  if (before) {
    if (before.truth !== arc.truth) gates.push("continuity: the thread's truth changed after case 1");
    for (const line of before.plan.filter((p) => p.case < number)) {
      const now = arc.plan.find((p) => p.case === line.case);
      if (now?.beat !== line.beat) gates.push(`continuity: the arc's line for case ${line.case}, already played, changed`);
    }
  }
  if (number > 1 && carry.callbacks.length === 0) gates.push("continuity: a later case brings back someone or something from an earlier one (carry.callbacks)");
  for (const c of carry.callbacks) if (c >= number) gates.push(`continuity: carry.callbacks names case ${c}, which isn't earlier`);
  if (number === length && carry.hooks.length) gates.push("continuity: the season's last case leaves no hooks open");
  return gates;
}
