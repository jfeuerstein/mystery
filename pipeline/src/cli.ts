#!/usr/bin/env -S npx tsx
// The `afoot` CLI (GAME_DESIGN.md §14.5). Every deterministic pipeline stage;
// the generation session does the writing and calls these to check it.
//
// Spoiler rule: commands that print case content (`view`, `verify`, `audit`
// messages) are for generation sessions only. `seal` and `sealed-check`
// print metrics only.
import { verifyCase } from "@afoot/logic";
import { Case } from "@afoot/schema";
import { seal, unseal } from "@afoot/seal";
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { z } from "zod";
import { checkAnswer, extractJson } from "./answers.js";
import { buildArt, checkArt, previewArt } from "./art.js";
import { buildAudio, checkAudio } from "./audio.js";
import { audit } from "./audit.js";
import { compose } from "./compose.js";
import { nextSlot, readIndex, readLedger, writeIndex, writeLedger } from "./ledger.js";
import { centralIsFresh, curriculumFor, suggestMotifs } from "./next.js";
import { caseDir, PATHS, ROOT } from "./paths.js";
import { Concept, WorldModel } from "./plan.js";
import { coverage, puzzleHash, readLog, targetKey, writeLog } from "./playtest.js";
import { checkMotifs, loadCatalog, loadMotifs } from "./sources.js";
import { parseTarget, playerView } from "./view.js";

const USAGE = `afoot <command> [args]

  next [--season N] [--init]     the next case: slot, curriculum, suggested motifs
                                 (--init writes content/.plain/<id>/concept.json)
  validate <id>                  schema-check concept.json, world.json, case.json
  verify <id>                    verify every puzzle, the fair-play graph, the finale
  audit <id>                     structure, art, curriculum, prose, world agreement
  compose <id>                   place evidence hotspots on scenes
  view <id> <slot/variant|finale>        the player's view, for blind solvers
  check <id> <slot/variant|finale> <answer.json|-> [--solver NAME]
                                 CORRECT or WRONG; --solver records the result
  adversary <id> <slot/variant> clear|ambiguous   record an adversary verdict
  status <id>                    blind-playtest coverage
  seal <id> [--keep]             run every gate, seal, update index and ledger
  sealed-check [--details]       open every sealed case and verify it (metrics only)
  motifs                         check the motif library against the art catalog
  art build [tag...]             download, crop and print engravings from pipeline/art/plates.json
  art check                      every catalog plate exists and is credited as public domain
  art preview <plates.json> <dir>   print another plates file as PNGs, catalog untouched
  audio build [cue...]           cut the music and effects in pipeline/audio/sounds.json (needs ffmpeg)
  audio check                    every manifest recording exists and is credited under a free licence

  Behind an HTTPS proxy, run the builds with NODE_USE_ENV_PROXY=1.`;

type Args = { _: string[]; flags: Record<string, string | true> };

function parseArgs(argv: string[]): Args {
  const out: Args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--") && ["season", "solver", "seed"].includes(a.slice(2))) {
        out.flags[a.slice(2)] = next;
        i++;
      } else out.flags[a.slice(2)] = true;
    } else out._.push(a);
  }
  return out;
}

class Fail extends Error {}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Fail(`missing ${what}\n\n${USAGE}`);
  return value;
}

function readJson<S extends z.ZodTypeAny>(path: string, schema: S, what: string): z.output<S> {
  if (!existsSync(path)) throw new Fail(`${what} not found: ${relative(ROOT, path)}`);
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 20).map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Fail(`${what} is invalid:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

function load(id: string) {
  const files = caseDir(id);
  return {
    files,
    concept: () => readJson(files.concept, Concept, "concept.json"),
    world: () => readJson(files.world, WorldModel, "world.json"),
    case: () => readJson(files.case, Case, "case.json"),
  };
}

function print(lines: string[]): void {
  for (const l of lines) console.log(l);
}

async function curriculumOf(season: number) {
  return curriculumFor(season, await readLedger());
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const [command, id, ...rest] = args._;

  switch (command) {
    case "next": {
      const index = readIndex();
      const ledger = await readLedger();
      const slot = nextSlot(index, args.flags.season ? Number(args.flags.season) : undefined);
      const caseId = `s${slot.season}c${slot.number}`;
      const curriculum = curriculumFor(slot.season, ledger);
      // Random by default, so nothing run outside the generation session
      // (e.g. while developing) can predict a case's motifs.
      const seed = args.flags.seed ? Number(args.flags.seed) : randomInt(2 ** 31);
      const motifs = suggestMotifs(loadMotifs(), ledger, curriculum, seed);
      const summary = {
        caseId,
        ...slot,
        curriculum,
        motifs: {
          central: motifs.central,
          complications: motifs.complications,
          ...(motifs.premise ? { premise: motifs.premise } : {}),
        },
        artCatalog: relative(ROOT, PATHS.catalog),
      };
      console.log(JSON.stringify(summary, null, 2));
      if (args.flags.init) {
        const files = caseDir(caseId);
        mkdirSync(files.dir, { recursive: true });
        if (existsSync(files.concept)) throw new Fail(`${relative(ROOT, files.concept)} already exists`);
        const concept: Concept = {
          caseId,
          ...slot,
          motifs: {
            central: motifs.central.id,
            complications: motifs.complications.map((m) => m.id),
            ...(motifs.premise ? { premise: motifs.premise.id } : {}),
          },
          curriculum: {
            ...(curriculum.introduces ? { introduces: curriculum.introduces } : {}),
            reinforces: curriculum.reinforces,
          },
          synopsis: "WRITE THE SECRET SYNOPSIS HERE",
        };
        writeFileSync(files.concept, JSON.stringify(concept, null, 2) + "\n");
        console.log(`\nwrote ${relative(ROOT, files.concept)}`);
      }
      return 0;
    }

    case "validate": {
      const c = load(need(id, "case id"));
      const results: string[] = [];
      for (const [name, fn] of [
        ["concept.json", c.concept],
        ["world.json", c.world],
        ["case.json", c.case],
      ] as const) {
        try {
          fn();
          results.push(`${name}: valid`);
        } catch (e) {
          results.push(e instanceof Fail ? e.message : `${name}: ${String(e)}`);
        }
      }
      print(results);
      return results.every((r) => r.endsWith(": valid")) ? 0 : 1;
    }

    case "verify": {
      const result = verifyCase(load(need(id, "case id")).case());
      print([...result.errors.map((e) => `ERROR ${e}`), ...result.warnings.map((w) => `warn  ${w}`)]);
      console.log(`${result.ok ? "OK" : "FAILED"}: ${result.errors.length} errors, ${result.warnings.length} warnings, ${JSON.stringify(result.metrics)}`);
      return result.ok ? 0 : 1;
    }

    case "audit": {
      const c = load(need(id, "case id"));
      const theCase = c.case();
      const concept = c.concept();
      const world = existsSync(c.files.world) ? c.world() : undefined;
      const result = audit(theCase, {
        catalog: new Set(loadCatalog().map((a) => a.tag)),
        curriculum: await curriculumOf(concept.season),
        concept,
        ...(world ? { world } : {}),
      });
      print([...result.errors.map((e) => `ERROR ${e}`), ...result.warnings.map((w) => `warn  ${w}`)]);
      console.log(`${result.errors.length === 0 ? "OK" : "FAILED"}: ${result.errors.length} errors, ${result.warnings.length} warnings, ${result.words} words`);
      return result.errors.length === 0 ? 0 : 1;
    }

    case "compose": {
      const c = load(need(id, "case id"));
      const composed = compose(c.case());
      writeFileSync(c.files.case, JSON.stringify(composed.case, null, 2) + "\n");
      console.log(`placed ${composed.placed} hotspots`);
      return 0;
    }

    case "view": {
      const c = load(need(id, "case id"));
      const concept = c.concept();
      const curriculum = await curriculumOf(concept.season);
      console.log(playerView(c.case(), parseTarget(need(rest[0], "target")), curriculum.flawTypes));
      return 0;
    }

    case "check": {
      const c = load(need(id, "case id"));
      const target = parseTarget(need(rest[0], "target"));
      const source = need(rest[1], "answer file (or - for stdin)");
      const text = source === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(source), "utf8");
      const theCase = c.case();
      let correct = false;
      try {
        correct = checkAnswer(theCase, target, extractJson(text));
      } catch {
        correct = false;
      }
      console.log(correct ? "CORRECT" : "WRONG");
      if (typeof args.flags.solver === "string") {
        const log = readLog(c.files.playtest);
        log.solves.push({ target: targetKey(target), hash: puzzleHash(theCase, target), solver: args.flags.solver, correct });
        writeLog(c.files.playtest, log);
      }
      return 0;
    }

    case "adversary": {
      const c = load(need(id, "case id"));
      const target = parseTarget(need(rest[0], "target"));
      const verdict = need(rest[1], "verdict");
      if (verdict !== "clear" && verdict !== "ambiguous") throw new Fail("verdict must be clear or ambiguous");
      const log = readLog(c.files.playtest);
      log.adversary.push({ target: targetKey(target), hash: puzzleHash(c.case(), target), verdict });
      writeLog(c.files.playtest, log);
      console.log(`recorded: ${verdict}`);
      return 0;
    }

    case "status": {
      const c = load(need(id, "case id"));
      const cov = coverage(c.case(), readLog(c.files.playtest));
      for (const r of cov) {
        const adv = r.adversary ? ` adversary:${r.adversaryVerdict ?? "-"}` : "";
        console.log(`${r.done ? "done" : "TODO"}  ${r.target.padEnd(28)} ${r.type.padEnd(14)} solvers ${r.passes}/${r.solvers}${r.failures ? ` (${r.failures} failed: revise)` : ""}${adv}`);
      }
      const done = cov.filter((r) => r.done).length;
      console.log(`${done}/${cov.length} complete`);
      return done === cov.length ? 0 : 1;
    }

    case "seal": {
      const c = load(need(id, "case id"));
      const concept = c.concept();
      const world = c.world();
      const theCase = c.case();
      const index = readIndex();
      const ledger = await readLedger();
      const gates: string[] = [];

      const expected = nextSlot(index, concept.season);
      if (concept.number !== expected.number) gates.push(`slot: expected case ${expected.number} of season ${concept.season}`);
      if (!centralIsFresh(concept.motifs.central, ledger)) gates.push("novelty: the central trick was used too recently");
      const verified = verifyCase(theCase);
      if (!verified.ok) gates.push(`verify: ${verified.errors.length} errors`);
      const audited = audit(theCase, {
        catalog: new Set(loadCatalog().map((a) => a.tag)),
        curriculum: curriculumFor(concept.season, ledger),
        concept,
        world,
      });
      if (audited.errors.length) gates.push(`audit: ${audited.errors.length} errors`);
      const cov = coverage(theCase, readLog(c.files.playtest));
      const missing = cov.filter((r) => !r.done).length;
      if (missing) gates.push(`playtest: ${missing} of ${cov.length} targets incomplete (see afoot status)`);
      if (gates.length) {
        print(gates.map((g) => `NOT SEALED  ${g}`));
        return 1;
      }

      const file = `s${concept.season}/c${concept.number}.sealed`;
      const out = resolve(PATHS.sealed, file);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, (await seal(theCase)) + "\n");
      index.cases.push({ season: concept.season, number: concept.number, file });
      writeIndex(index);
      ledger.push({
        season: concept.season,
        number: concept.number,
        caseId: concept.caseId,
        central: concept.motifs.central,
        motifs: [concept.motifs.central, ...concept.motifs.complications, ...(concept.motifs.premise ? [concept.motifs.premise] : [])],
        ...(concept.curriculum.introduces ? { introduces: concept.curriculum.introduces } : {}),
        reinforces: concept.curriculum.reinforces,
      });
      await writeLedger(ledger);
      if (!args.flags.keep) rmSync(c.files.dir, { recursive: true, force: true });

      const variants = cov.filter((r) => r.target !== "finale").length;
      const solves = cov.reduce((n, r) => n + r.passes, 0);
      const adversary = cov.filter((r) => r.adversary).length;
      // The metric-only template (§14.7). No title, names, motifs or plot.
      console.log(
        `S${concept.season} case ${concept.number}: SEALED. ${verified.metrics.deductions} deductions, ${variants} variants verified, ${solves} blind solves, ${adversary} adversary passes, ${audited.words} words.`,
      );
      return 0;
    }

    case "sealed-check": {
      const index = readIndex();
      let failed = 0;
      for (const entry of index.cases) {
        const label = `S${entry.season} case ${entry.number}`;
        try {
          const theCase = Case.parse(await unseal(readFileSync(resolve(PATHS.sealed, entry.file), "utf8")));
          const result = verifyCase(theCase);
          if (!result.ok) failed++;
          console.log(`${label}: ${result.ok ? "OK" : "FAILED"}, ${result.metrics.deductions} deductions, ${result.errors.length} errors`);
          if (args.flags.details) print(result.errors.map((e) => `  ${e}`));
        } catch {
          failed++;
          console.log(`${label}: FAILED to open or parse`);
        }
      }
      console.log(`${index.cases.length - failed}/${index.cases.length} sealed cases verify`);
      return failed ? 1 : 0;
    }

    case "motifs": {
      const motifs = loadMotifs();
      const problems = checkMotifs(motifs, loadCatalog());
      print(problems);
      const kinds = motifs.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.kind]: (acc[m.kind] ?? 0) + 1 }), {});
      console.log(`${motifs.length} motifs ${JSON.stringify(kinds)}: ${problems.length ? "PROBLEMS" : "OK"}`);
      return problems.length ? 1 : 0;
    }

    case "art": {
      if (args._[1] === "build") {
        const failed = await buildArt(args._.slice(2), (line) => console.log(line));
        return failed ? 1 : 0;
      }
      if (args._[1] === "preview" && args._[2] && args._[3]) {
        return (await previewArt(args._[2], args._[3], (line) => console.log(line))) ? 1 : 0;
      }
      if (args._[1] === "check") {
        const problems = checkArt();
        print(problems);
        console.log(problems.length ? "PROBLEMS" : "OK");
        return problems.length ? 1 : 0;
      }
      console.log(USAGE);
      return 1;
    }

    case "audio": {
      if (args._[1] === "build") return (await buildAudio(args._.slice(2), (line) => console.log(line))) ? 1 : 0;
      if (args._[1] === "check") {
        const problems = checkAudio();
        print(problems);
        console.log(problems.length ? "PROBLEMS" : "OK");
        return problems.length ? 1 : 0;
      }
      console.log(USAGE);
      return 1;
    }

    default:
      console.log(USAGE);
      return command ? 1 : 0;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e instanceof Fail ? e.message : e);
    process.exit(1);
  });
