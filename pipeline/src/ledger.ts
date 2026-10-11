// What has been sealed so far. The index is spoiler-free (numbers and file
// names only); the ledger, which records motifs and concepts for novelty and
// curriculum, is itself sealed (§14.7).
import type { ConceptId } from "@afoot/schema";
import { seal, unseal, type SealedIndex } from "@afoot/seal";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PATHS } from "./paths.js";
import type { Carry, SeasonArc } from "./plan.js";

export type LedgerEntry = {
  season: number;
  number: number;
  caseId: string;
  motifs: string[];
  central: string;
  introduces?: ConceptId | undefined;
  reinforces: ConceptId[];
  /** Serial seasons (decision 27): the season's thread as this case left it, and what it handed on. */
  arc?: SeasonArc | undefined;
  carry?: Carry | undefined;
};

export function readIndex(path = PATHS.index): SealedIndex {
  if (!existsSync(path)) return { version: 1, cases: [] };
  return JSON.parse(readFileSync(path, "utf8")) as SealedIndex;
}

export function writeIndex(index: SealedIndex, path = PATHS.index): void {
  index.cases.sort((a, b) => a.season - b.season || a.number - b.number);
  writeFileSync(path, JSON.stringify(index, null, 2) + "\n");
}

export async function readLedger(path = PATHS.ledger): Promise<LedgerEntry[]> {
  if (!existsSync(path)) return [];
  return unseal<LedgerEntry[]>(readFileSync(path, "utf8"));
}

export async function writeLedger(entries: LedgerEntry[], path = PATHS.ledger): Promise<void> {
  writeFileSync(path, (await seal(entries)) + "\n");
}

/** The next case to generate: continue the latest season. */
export function nextSlot(index: SealedIndex, season?: number): { season: number; number: number } {
  const s = season ?? Math.max(1, ...index.cases.map((c) => c.season));
  const inSeason = index.cases.filter((c) => c.season === s);
  return { season: s, number: Math.max(0, ...inSeason.map((c) => c.number)) + 1 };
}
