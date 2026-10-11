// Blind-playtest bookkeeping (§14.3 stage 6). Every record is tied to a hash
// of the puzzle it tested, so revising a puzzle discards its old results and
// a failed puzzle can't pass by being re-rolled: it must change.
import type { Case } from "@afoot/schema";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { findVariant, type Target } from "./view.js";

export type PlaytestLog = {
  solves: { target: string; hash: string; solver: string; correct: boolean }[];
  adversary: { target: string; hash: string; verdict: "clear" | "ambiguous" }[];
};

/** Puzzle types that code can't fully verify get three solvers and an adversary. */
const ARGUMENT_TYPES = new Set(["flaw", "objection", "observation"]);

export function targetKey(t: Target): string {
  return t === "finale" ? "finale" : `${t.slot}/${t.variant}`;
}

export function puzzleHash(c: Case, t: Target): string {
  const body = t === "finale" ? c.finale.reconstruction : (() => {
    const { slot, variant } = findVariant(c, t);
    return { prompt: slot.prompt, puzzle: variant.puzzle };
  })();
  return createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
}

export function readLog(path: string): PlaytestLog {
  if (!existsSync(path)) return { solves: [], adversary: [] };
  return JSON.parse(readFileSync(path, "utf8")) as PlaytestLog;
}

export function writeLog(path: string, log: PlaytestLog): void {
  writeFileSync(path, JSON.stringify(log, null, 2) + "\n");
}

export type Requirement = { target: string; type: string; solvers: number; adversary: boolean };

/** What each variant, and the finale, needs before the case can be sealed. */
export function requirements(c: Case): Requirement[] {
  const reqs: Requirement[] = [];
  for (const ch of c.chapters) {
    for (const b of ch.beats) {
      if (b.kind !== "deduction") continue;
      for (const v of b.slot.variants) {
        const argument = ARGUMENT_TYPES.has(v.puzzle.type);
        reqs.push({ target: `${b.slot.id}/${v.id}`, type: v.puzzle.type, solvers: argument ? 3 : 1, adversary: argument });
      }
    }
  }
  reqs.push({ target: "finale", type: "reconstruction", solvers: 1, adversary: false });
  return reqs;
}

export type Coverage = Requirement & {
  passes: number;
  failures: number;
  adversaryVerdict?: "clear" | "ambiguous";
  done: boolean;
};

export function coverage(c: Case, log: PlaytestLog): Coverage[] {
  return requirements(c).map((r) => {
    const target = r.target === "finale" ? "finale" : (() => {
      const [slot, variant] = r.target.split("/");
      return { slot: slot!, variant: variant! };
    })();
    const hash = puzzleHash(c, target);
    const solves = log.solves.filter((s) => s.target === r.target && s.hash === hash);
    const solvers = new Set(solves.filter((s) => s.correct).map((s) => s.solver));
    const failures = solves.filter((s) => !s.correct).length;
    const verdicts = log.adversary.filter((a) => a.target === r.target && a.hash === hash);
    const adversaryVerdict = verdicts.at(-1)?.verdict;
    const done =
      failures === 0 &&
      solvers.size >= r.solvers &&
      (!r.adversary || (verdicts.length > 0 && verdicts.every((v) => v.verdict === "clear")));
    return { ...r, passes: solvers.size, failures, ...(adversaryVerdict ? { adversaryVerdict } : {}), done };
  });
}
