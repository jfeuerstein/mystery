import { Case, FLAW_TYPES } from "@afoot/schema";
import { seal } from "@afoot/seal";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import caseJson from "../../fixtures/stopped-clock.case.json";
import { checkAnswer } from "../src/answers.js";
import { audit } from "../src/audit.js";
import { compose } from "../src/compose.js";
import type { LedgerEntry } from "../src/ledger.js";
import { curriculumFor, suggestMotifs } from "../src/next.js";
import { ROOT } from "../src/paths.js";
import { coverage, puzzleHash, requirements, type PlaytestLog } from "../src/playtest.js";
import { checkMotifs, loadCatalog, loadMotifs } from "../src/sources.js";
import { playerView, readingOrder } from "../src/view.js";

const fixture = Case.parse(caseJson);
const catalog = loadCatalog();
const flawOptions = [...FLAW_TYPES].filter((f) => ["necessary-as-sufficient", "sufficient-as-necessary", "correlation-causation"].includes(f));

const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  season: 1,
  number: 1,
  caseId: "s1c1",
  motifs: [],
  central: "x",
  reinforces: [],
  ...over,
});

describe("sources", () => {
  it("the motif library is consistent with the art catalog", () => {
    const motifs = loadMotifs();
    expect(motifs.length).toBeGreaterThanOrEqual(40);
    expect(checkMotifs(motifs, catalog)).toEqual([]);
  });

  it("the catalog covers every tag the sample case uses", () => {
    const r = audit(fixture, { catalog: new Set(catalog.map((a) => a.tag)), curriculum: curriculumFor(1, []) });
    expect(r.errors.filter((e) => e.includes("art tag"))).toEqual([]);
  });
});

describe("curriculum and motifs", () => {
  it("introduces one new concept per case, in order, and only offers learnable flaw names", () => {
    const first = curriculumFor(1, []);
    expect(first.introduces).toBe("reversed-arrows");
    expect(first.flawTypes).toEqual(flawOptions);
    const second = curriculumFor(1, [entry({ introduces: "reversed-arrows" })]);
    expect(second.introduces).toBe("only-if-and-unless");
    expect(second.reinforces[0]).toBe("reversed-arrows");
  });

  it("never repeats a recent central trick", () => {
    const motifs = loadMotifs();
    const centrals = motifs.filter((m) => m.kind === "central-trick").map((m) => m.id);
    const ledger = centrals.slice(0, 6).map((central, i) => entry({ number: i + 1, central, motifs: [central] }));
    for (let seed = 1; seed <= 25; seed++) {
      const pick = suggestMotifs(motifs, ledger, curriculumFor(1, ledger), seed);
      expect(centrals.slice(0, 6)).not.toContain(pick.central.id);
      expect(pick.central.kind).toBe("central-trick");
      expect(pick.complications.every((m) => m.kind === "complication")).toBe(true);
    }
  });
});

describe("player view", () => {
  const slots = fixture.chapters.flatMap((c) => c.beats.flatMap((b) => (b.kind === "deduction" ? [b.slot] : [])));
  const targets = slots.flatMap((s) => s.variants.map((v) => ({ slot: s.id, variant: v.id })));

  it.each(targets.map((t) => [`${t.slot}/${t.variant}`, t] as const))("%s shows the puzzle but no answer", (_, t) => {
    const view = playerView(fixture, t, flawOptions);
    const slot = slots.find((s) => s.id === t.slot)!;
    const puzzle = slot.variants.find((v) => v.id === t.variant)!.puzzle;
    // The deduction's own payoff is not in the story yet.
    expect(view).not.toContain(slot.onSolved.holmesSpeaks.slice(0, 40));
    for (const secret of ["defeater", "asserts", "establishes", "formal", "constraint", "\"answer\""]) {
      expect(view).not.toContain(secret);
    }
    if (puzzle.type === "observation") {
      for (const i of puzzle.inferences) if (i.defeater) expect(view).not.toContain(i.defeater);
    }
    if (puzzle.type === "chain") {
      expect(view.match(/reading \d:/g)?.length).toBe(puzzle.cards.filter((c) => c.readings).length * 4);
    }
  });

  it("the finale view lists blanks and the word bank but no answers", () => {
    const view = playerView(fixture, "finale", flawOptions);
    expect(view).toContain("{{culprit}}");
    expect(view).toContain("Word bank");
    expect(view).not.toContain("establishedBy");
  });
});

describe("check-answer", () => {
  it("accepts right answers and rejects wrong or garbled ones", () => {
    const chain = { slot: "d-clock-chain", variant: "a" };
    const n = (card: string, o: string) => readingOrder(card).indexOf(o as never) + 1;
    const good = { steps: [{ card: "p3" }, { card: "p1", reading: n("p1", "stated") }, { card: "p2", reading: n("p2", "stated") }, { card: "p4", reading: n("p4", "contrapositive") }] };
    expect(checkAnswer(fixture, chain, good)).toBe(true);
    const trap = { steps: [{ card: "p5" }, { card: "p6", reading: n("p6", "converse") }] };
    expect(checkAnswer(fixture, chain, trap)).toBe(false);
    expect(checkAnswer(fixture, chain, { steps: [{ card: "p3" }, { card: "p1", reading: 9 }] })).toBe(false);

    const flaw = { slot: "d-watson-letter", variant: "a" };
    expect(checkAnswer(fixture, flaw, { sentenceId: "s3", flawType: "necessary-as-sufficient" })).toBe(true);
    expect(checkAnswer(fixture, flaw, { sentenceId: "s3" })).toBe(false);

    const hall = { slot: "d-hall-order", variant: "b" };
    const placements = { vance: "first", pike: "second", colonel: "third", hale: "fourth", clara: "fifth" };
    expect(checkAnswer(fixture, hall, { placements })).toBe(true);

    const blanks = Object.fromEntries(fixture.finale.reconstruction.blanks.map((b) => [b.id, b.answer]));
    expect(checkAnswer(fixture, "finale", { blanks })).toBe(true);
  });
});

describe("playtest coverage", () => {
  const flaw = { slot: "d-watson-letter", variant: "a" };
  const hash = puzzleHash(fixture, flaw);
  const status = (log: PlaytestLog) => coverage(fixture, log).find((r) => r.target === "d-watson-letter/a")!;

  it("needs three distinct correct solvers and a clear adversary for an argument puzzle", () => {
    const solves = ["s1", "s2", "s3"].map((solver) => ({ target: "d-watson-letter/a", hash, solver, correct: true }));
    expect(status({ solves: solves.slice(0, 2), adversary: [] }).done).toBe(false);
    expect(status({ solves, adversary: [] }).done).toBe(false);
    expect(status({ solves, adversary: [{ target: "d-watson-letter/a", hash, verdict: "clear" }] }).done).toBe(true);
    expect(status({ solves, adversary: [{ target: "d-watson-letter/a", hash, verdict: "ambiguous" }] }).done).toBe(false);
  });

  it("a single failure blocks until the puzzle changes, and old results don't count for a changed puzzle", () => {
    const solves = ["s1", "s2", "s3"].map((solver) => ({ target: "d-watson-letter/a", hash, solver, correct: true }));
    const adversary = [{ target: "d-watson-letter/a", hash, verdict: "clear" as const }];
    const failed = { solves: [...solves, { target: "d-watson-letter/a", hash, solver: "s4", correct: false }], adversary };
    expect(status(failed).done).toBe(false);
    const stale = { solves: solves.map((s) => ({ ...s, hash: "0000000000000000" })), adversary };
    expect(status(stale).passes).toBe(0);
  });
});

describe("audit and compose", () => {
  it("enforces structure, art and Moriarty", () => {
    const bad = structuredClone(fixture);
    bad.cast[0]!.portrait.tag = "portrait-unicorn";
    bad.finale.solution.push("Moriarty smiled.");
    bad.finale.intro.push("It was like a question on the LSAT.");
    const r = audit(bad, { catalog: new Set(catalog.map((a) => a.tag)), curriculum: curriculumFor(1, []) });
    expect(r.errors.join("\n")).toContain('art tag "portrait-unicorn"');
    expect(r.errors.join("\n")).toContain("Moriarty");
    expect(r.errors.join("\n")).toContain("names the LSAT");
    expect(r.errors.join("\n")).toContain("5 deductions; a case has 6–10");
    expect(r.errors.join("\n")).toContain('deduction "d-clock-chain" needs at least 2 variants');
  });

  it("places hotspots that don't overlap", () => {
    const bare = structuredClone(fixture);
    for (const e of bare.evidence) delete e.hotspot;
    const { case: placed, placed: n } = compose(bare);
    expect(n).toBe(bare.evidence.length);
    const spots = placed.evidence.map((e) => e.hotspot!);
    for (const a of spots) for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, (a.y - b.y) * 0.75)).toBeGreaterThan(0.16);
  });
});

describe("CLI", () => {
  const cli = (content: string, ...args: string[]) =>
    execFileSync("npx", ["tsx", resolve(ROOT, "pipeline/src/cli.ts"), ...args], {
      env: { ...process.env, AFOOT_CONTENT: content },
      encoding: "utf8",
    });

  it("sealed-check opens sealed cases and prints metrics only", async () => {
    const content = mkdtempSync(join(tmpdir(), "afoot-"));
    mkdirSync(join(content, "sealed/s1"), { recursive: true });
    writeFileSync(join(content, "sealed/s1/c1.sealed"), await seal(fixture));
    writeFileSync(join(content, "sealed/index.json"), JSON.stringify({ version: 1, cases: [{ season: 1, number: 1, file: "s1/c1.sealed" }] }));
    const out = cli(content, "sealed-check");
    expect(out).toContain("S1 case 1: OK, 5 deductions, 0 errors");
    expect(out).not.toContain(fixture.title);
  }, 30000);

  it("seals a case that passes every gate, then removes its plaintext", () => {
    // Grow the sample into a legal Season 1 case: a fourth chapter with a
    // sixth deduction, and a second variant for the Chain.
    const c = structuredClone(fixture);
    c.id = "s1c1";
    c.season = 1;
    const chain = c.chapters[2]!.beats.find((b) => b.kind === "deduction" && b.slot.id === "d-clock-chain")!;
    if (chain.kind === "deduction") {
      // Season 1's first case may not lean on "only if" yet (the curriculum gate).
      chain.slot.variants[0]!.concepts = ["if-and-then", "contrapositive", "reversed-arrows"];
      chain.slot.variants.push({ ...structuredClone(chain.slot.variants[0]!), id: "b" });
    }
    const hall = structuredClone(c.chapters[1]!.beats.find((b) => b.kind === "deduction")!);
    if (hall.kind === "deduction") {
      hall.slot.id = "d-hall-again";
      hall.slot.onSolved.establishes = [];
    }
    c.chapters.push({ id: "ch4", title: "The Return", patienceHolder: "lestrade", beats: [hall] });
    const content = mkdtempSync(join(tmpdir(), "afoot-"));
    const dir = join(content, ".plain/s1c1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "case.json"), JSON.stringify(c));
    writeFileSync(
      join(dir, "concept.json"),
      JSON.stringify({
        caseId: "s1c1",
        season: 1,
        number: 1,
        motifs: { central: "tampered-clock", complications: ["servant-red-herring"] },
        curriculum: { introduces: "reversed-arrows", reinforces: ["seeing-and-observing"] },
        synopsis: "x",
      }),
    );
    writeFileSync(
      join(dir, "world.json"),
      JSON.stringify({
        caseId: "s1c1",
        cast: c.cast.map((p) => ({ id: p.id, name: p.name, role: p.role, isCulprit: p.id === "vance" })),
        timeline: [1, 2, 3].map((i) => ({ time: `20:0${i}`, where: "hall", who: ["vance"], event: "e" })),
        evidence: c.evidence.map((e) => ({ id: e.id, truth: "t" })),
        witnesses: [],
        solution: { culprit: "vance", method: "m", motive: "m", trick: "t" },
      }),
    );
    const parsed = Case.parse(c);
    const log: PlaytestLog = { solves: [], adversary: [] };
    for (const r of requirements(parsed)) {
      const [slot, variant] = r.target.split("/");
      const target = r.target === "finale" ? ("finale" as const) : { slot: slot!, variant: variant! };
      const hash = puzzleHash(parsed, target);
      for (let i = 0; i < r.solvers; i++) log.solves.push({ target: r.target, hash, solver: `solver-${i}`, correct: true });
      if (r.adversary) log.adversary.push({ target: r.target, hash, verdict: "clear" });
    }
    writeFileSync(join(dir, "playtest.json"), JSON.stringify(log));

    let out: string;
    try {
      out = cli(content, "seal", "s1c1");
    } catch (e) {
      out = String((e as { stdout: string }).stdout);
    }
    expect(out).toMatch(/^S1 case 1: SEALED\. 6 deductions, \d+ variants verified, \d+ blind solves, \d+ adversary passes, \d+ words\.$/m);
    expect(out).not.toContain(c.title);
    expect(existsSync(dir)).toBe(false);
    expect(JSON.parse(readFileSync(join(content, "sealed/index.json"), "utf8")).cases).toEqual([
      { season: 1, number: 1, file: "s1/c1.sealed" },
    ]);
    expect(readFileSync(join(content, "sealed/s1/c1.sealed"), "utf8")).not.toContain("Vance");
    expect(cli(content, "sealed-check")).toContain("1/1 sealed cases verify");
  }, 60000);

  it("seal refuses a case that fails its gates, and lists why", () => {
    const content = mkdtempSync(join(tmpdir(), "afoot-"));
    const dir = join(content, ".plain/s1c1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "case.json"), JSON.stringify({ ...caseJson, id: "s1c1", season: 1 }));
    writeFileSync(
      join(dir, "concept.json"),
      JSON.stringify({
        caseId: "s1c1",
        season: 1,
        number: 1,
        motifs: { central: "tampered-clock", complications: [] },
        curriculum: { introduces: "reversed-arrows", reinforces: [] },
        synopsis: "x",
      }),
    );
    writeFileSync(
      join(dir, "world.json"),
      JSON.stringify({
        caseId: "s1c1",
        cast: [{ id: "a", name: "A", role: "r" }, { id: "b", name: "B", role: "r" }, { id: "vance", name: "Mr. Vance", role: "r", isCulprit: true }],
        timeline: [1, 2, 3].map((i) => ({ time: `20:0${i}`, where: "hall", who: ["a"], event: "e" })),
        evidence: [],
        witnesses: [],
        solution: { culprit: "vance", method: "m", motive: "m", trick: "t" },
      }),
    );
    let out = "";
    try {
      cli(content, "seal", "s1c1");
    } catch (e) {
      out = (e as { stdout: string }).stdout;
    }
    expect(out).toContain("NOT SEALED  audit");
    expect(out).toContain("NOT SEALED  playtest");
    expect(readFileSync(join(dir, "case.json"), "utf8")).toBeTruthy(); // nothing deleted
  }, 30000);
});
