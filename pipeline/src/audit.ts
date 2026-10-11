// `afoot audit`: everything about a case that isn't puzzle logic (§14.3 stage
// 7): structure, art, curriculum, prose hygiene, and agreement with the
// world model. Puzzle logic is `afoot verify`.
import { ENTRIES, type Case } from "@afoot/schema";
import type { Curriculum } from "./next.js";
import type { Concept, WorldModel } from "./plan.js";

export type AuditResult = { errors: string[]; warnings: string[]; words: number };

/** Phrases that mark flat or anachronistic prose. Warnings, not errors. */
export const BANNED_PHRASES = [
  "little did",
  "suddenly",
  "dark and stormy",
  "unbeknownst",
  "delve",
  "tapestry",
  "testament to",
  "a sense of",
  "couldn't help but",
  "in conclusion",
  "okay",
  "OK,",
];

function* texts(c: Case): Generator<string> {
  for (const ch of c.chapters) {
    for (const b of ch.beats) {
      if (b.kind === "narration") yield* b.paragraphs;
      if (b.kind === "observe") for (const d of b.details) yield d.text;
      if (b.kind === "interrogate") for (const t of b.topics) for (const s of t.sentences) yield s.text;
      if (b.kind === "deduction") yield b.slot.onSolved.holmesSpeaks;
    }
  }
  yield* c.finale.intro;
  yield* c.finale.solution;
  for (const e of c.evidence) yield e.description;
}

function artTags(c: Case): string[] {
  const tags = [
    ...c.cast.map((p) => p.portrait.tag),
    ...c.locations.map((l) => l.scene.tag),
    ...c.evidence.map((e) => e.vignette.tag),
  ];
  for (const ch of c.chapters) {
    for (const b of ch.beats) {
      if (b.kind === "narration" && b.art) tags.push(b.art.tag);
      if (b.kind === "observe") tags.push(...b.details.map((d) => d.vignette.tag));
    }
  }
  return tags;
}

export function audit(
  c: Case,
  opts: { catalog: Set<string>; curriculum: Curriculum; concept?: Concept; world?: WorldModel },
): AuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const allText = [...texts(c)];
  const joined = allText.join("\n");
  const words = joined.split(/\s+/).filter(Boolean).length;

  // Structure (§5).
  if (c.chapters.length < 3 || c.chapters.length > 4) errors.push(`${c.chapters.length} chapters; a case has 3–4`);
  let deductions = 0;
  for (const ch of c.chapters) {
    const slots = ch.beats.filter((b) => b.kind === "deduction");
    deductions += slots.length;
    if (slots.length === 0) errors.push(`chapter "${ch.id}" has no deduction`);
    for (const b of slots) {
      const slot = b.slot;
      const types = new Set(slot.variants.map((v) => v.puzzle.type));
      const formal = [...types].some((t) => t === "arrangement" || t === "chain");
      if (formal && slot.variants.length < 2) {
        errors.push(`deduction "${slot.id}" needs at least 2 variants (§9.2); formal puzzles are cheap to vary`);
      }
      if (slot.variants.length > 3) warnings.push(`deduction "${slot.id}" has more than 3 variants`);
    }
  }
  if (deductions < 6 || deductions > 10) errors.push(`${deductions} deductions; a case has 6–10`);
  if (!c.chapters[0]?.beats.some((b) => b.kind === "observe")) warnings.push("the first chapter has no cold read (§7.1)");

  // Art (§13.2): only catalog tags.
  for (const tag of new Set(artTags(c))) {
    if (!opts.catalog.has(tag)) errors.push(`art tag "${tag}" is not in the catalog`);
  }

  // Curriculum (§11.2).
  const allowed = new Set<string>(opts.curriculum.allowed);
  for (const ch of c.chapters) {
    for (const b of ch.beats) {
      if (b.kind !== "deduction") continue;
      for (const v of b.slot.variants) {
        for (const concept of v.concepts) {
          if (!allowed.has(concept)) errors.push(`deduction "${b.slot.id}/${v.id}" uses "${concept}", not yet in the curriculum`);
        }
        if (v.puzzle.type === "flaw" && !opts.curriculum.flawTypes.includes(v.puzzle.answer.flawType)) {
          errors.push(`deduction "${b.slot.id}/${v.id}" needs flaw name "${v.puzzle.answer.flawType}", which the player can't choose yet`);
        }
      }
    }
  }
  if (opts.concept) {
    const want = opts.concept.curriculum;
    if ((c.concepts.introduces ?? null) !== (want.introduces ?? null)) {
      errors.push(`case introduces "${c.concepts.introduces ?? "nothing"}" but the concept says "${want.introduces ?? "nothing"}"`);
    }
    if (c.season !== opts.concept.season || c.number !== opts.concept.number || c.id !== opts.concept.caseId) {
      errors.push("case id, season or number differs from concept.json");
    }
  }
  const used = new Set(
    c.chapters.flatMap((ch) => ch.beats.flatMap((b) => (b.kind === "deduction" ? b.slot.variants.flatMap((v) => v.concepts) : []))),
  );
  if (c.concepts.introduces && !used.has(c.concepts.introduces)) {
    errors.push(`the case introduces "${c.concepts.introduces}" but no deduction uses it`);
  }
  if (c.concepts.introduces && !ENTRIES.some((e) => e.id === c.concepts.introduces)) {
    errors.push(`introduced concept "${c.concepts.introduces}" has no Notebook entry`);
  }

  // Prose hygiene.
  if (/moriarty/i.test(JSON.stringify(c))) errors.push("Moriarty appears (decision 24)");
  if (/\blsat\b/i.test(JSON.stringify(c))) errors.push("the case names the LSAT; the game never does (decision 18)");
  for (const marker of ["TODO", "TBD", "XXX", "lorem ipsum"]) {
    if (joined.includes(marker)) errors.push(`placeholder text "${marker}" left in the prose`);
  }
  if (allText.some((t) => t.includes("{{"))) errors.push("a {{placeholder}} appears outside the Reconstruction");
  for (const phrase of BANNED_PHRASES) {
    if (joined.toLowerCase().includes(phrase.toLowerCase())) warnings.push(`banned phrase "${phrase}"`);
  }
  for (const t of allText) {
    const n = t.split(/\s+/).length;
    if (n > 130) warnings.push(`a ${n}-word paragraph; keep paragraphs phone-sized (≤130 words)`);
  }
  if (words < 2500 || words > 7500) warnings.push(`${words} words; a 20–40 minute case is usually 2,500–7,500`);
  for (const person of c.cast) {
    const surname = person.name.split(" ").at(-1)!;
    if (!joined.includes(surname)) warnings.push(`${person.name} is never named in the prose`);
  }

  // Agreement with the world model.
  if (opts.world) {
    const worldCast = new Set(opts.world.cast.map((p) => p.id));
    for (const p of c.cast) {
      if (!worldCast.has(p.id) && !["holmes", "watson", "lestrade", "mrs-hudson"].includes(p.id)) {
        warnings.push(`cast member "${p.id}" is not in the world model`);
      }
    }
    const worldEvidence = new Set(opts.world.evidence.map((e) => e.id));
    for (const e of c.evidence) if (!worldEvidence.has(e.id)) errors.push(`evidence "${e.id}" has no truth in the world model`);
    const culprit = opts.world.cast.find((p) => p.id === opts.world!.solution.culprit);
    const answers = c.finale.reconstruction.blanks.map((b) => b.answer).join(" ");
    if (culprit && !answers.includes(culprit.name.split(" ").at(-1)!)) {
      errors.push("the Reconstruction's answers don't name the world model's culprit");
    }
  }

  return { errors, warnings, words };
}
