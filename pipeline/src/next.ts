// `afoot next`: the deterministic decisions for the next case — which slot,
// which concepts (§11.2), which motifs (§14.2) — so the session only has to
// write.
import { CONCEPTS, ENTRIES, FLAW_TYPES, STARTER_ENTRIES, type ConceptId, type FlawType } from "@afoot/schema";
import type { LedgerEntry } from "./ledger.js";
import type { Motif } from "./sources.js";

/** Season 1 covers tiers 1–2; later seasons add a tier each (§11.2). */
export function maxTier(season: number): number {
  return Math.min(4, season + 1);
}

const hasEntry = (c: string) => ENTRIES.some((e) => e.id === c);

export type Curriculum = {
  introduces?: ConceptId;
  reinforces: ConceptId[];
  /** Concepts a deduction in this case may use: the known ones plus the new one. */
  allowed: ConceptId[];
  /** Fallacy Index names a Flaw deduction in this case may require. */
  flawTypes: FlawType[];
};

export function curriculumFor(season: number, ledger: LedgerEntry[]): Curriculum {
  const known = new Set<ConceptId>(STARTER_ENTRIES);
  const introducedOrder: ConceptId[] = [];
  for (const e of ledger) {
    if (e.introduces) {
      known.add(e.introduces);
      introducedOrder.push(e.introduces);
    }
  }
  const tier = maxTier(season);
  const introduces = (Object.keys(CONCEPTS) as ConceptId[]).find(
    (c) => CONCEPTS[c] <= tier && !known.has(c) && hasEntry(c),
  );
  // Reinforce the most recently introduced concepts first, then the starters.
  const pool = [...introducedOrder.reverse(), ...STARTER_ENTRIES.filter((c) => !introducedOrder.includes(c))];
  const reinforces = pool.slice(0, 3);
  const allowed = [...known, ...(introduces ? [introduces] : [])];
  const flawTypes = FLAW_TYPES.filter((f) => allowed.includes(f) && hasEntry(f));
  return { ...(introduces ? { introduces } : {}), reinforces, allowed, flawTypes };
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Central tricks may not repeat within this many cases (§14.2's novelty check). */
export const CENTRAL_COOLDOWN = 6;

export type MotifPick = { central: Motif; complications: Motif[]; premise?: Motif };

export function suggestMotifs(
  motifs: Motif[],
  ledger: LedgerEntry[],
  curriculum: Curriculum,
  seed: number,
): MotifPick {
  const random = rng(seed);
  const recent = (n: number) => new Set(ledger.slice(-n).flatMap((e) => e.motifs));
  const recentCentral = new Set(ledger.slice(-CENTRAL_COOLDOWN).map((e) => e.central));
  const byKind = (kind: Motif["kind"]) => shuffled(motifs.filter((m) => m.kind === kind), random);
  const fits = (m: Motif) => (curriculum.introduces && m.concepts.includes(curriculum.introduces) ? 1 : 0);

  const centrals = byKind("central-trick").filter((m) => !recentCentral.has(m.id));
  const pool = centrals.length > 0 ? centrals : byKind("central-trick");
  const central = [...pool].sort((a, b) => fits(b) - fits(a))[0]!;

  const recent3 = recent(3);
  const complications = byKind("complication")
    .filter((m) => !recent3.has(m.id))
    .sort((a, b) => Number(central["pairs-well-with"].includes(b.id)) - Number(central["pairs-well-with"].includes(a.id)))
    .slice(0, 2);

  const recent4 = recent(4);
  const premise = byKind("premise")
    .filter((m) => !recent4.has(m.id))
    .sort((a, b) => Number(central["pairs-well-with"].includes(b.id)) - Number(central["pairs-well-with"].includes(a.id)))[0];

  return { central, complications, ...(premise ? { premise } : {}) };
}

/** Whether a concept's central trick breaks the cooldown. */
export function centralIsFresh(central: string, ledger: LedgerEntry[]): boolean {
  return !ledger.slice(-CENTRAL_COOLDOWN).some((e) => e.central === central);
}
