// The Missing Link (GAME_DESIGN.md §8.7): the player completes an argument's
// unstated premise by filling a sentence frame with phrase tiles. The frame's
// logical form is fixed here, in code. A puzzle is sound when its premises
// fall short of the conclusion and exactly one filling of the frame closes
// the gap (the reversed filling, among others, must not).
import type { Literal, MissingLinkFrame, MissingLinkPuzzle, PhraseTile, Statement } from "@afoot/schema";
import { closure, compile, compileAll, isContradictory, negate } from "./propositional.js";
import { Report, type VerifyResult } from "./result.js";

/** How each frame reads, with `{a}` and `{b}` for the blanks. */
export const FRAME_TEXT: Record<MissingLinkFrame, string> = {
  if: "If {a}, then {b}.",
  "only-if": "{a} only if {b}.",
  unless: "{a} unless {b}.",
  "no-one-who": "No one who {a} could have {b}.",
};

/** The unstated premise a filling states, as a story statement. */
export function frameStatement(frame: MissingLinkFrame, a: Literal, b: Literal): Statement {
  switch (frame) {
    case "if":
      return { form: "if", a, b };
    case "only-if":
      return { form: "only-if", a, b };
    case "unless":
      return { form: "unless", a, b };
    case "no-one-who":
      // "No one who a could have b": whoever a, not b.
      return { form: "if", a, b: negate(b) };
  }
}

/** The frame read aloud with two phrases (or blanks) in place. */
export function fillFrame(frame: MissingLinkFrame, a: string, b: string): string {
  const text = FRAME_TEXT[frame].replace("{a}", a).replace("{b}", b);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A filling's logical content, the same for equivalent fillings: its rules and their contrapositives. */
function meaning(frame: MissingLinkFrame, a: Literal, b: Literal): string {
  return compile(frameStatement(frame, a, b))
    .rules.flatMap((r) => [`${r.if}>${r.then}`, `${negate(r.then)}>${negate(r.if)}`])
    .sort()
    .join(",");
}

/** Whether the premises plus this filling reach the conclusion, consistently. */
export function closesGap(puzzle: MissingLinkPuzzle, a: PhraseTile, b: PhraseTile): boolean {
  const { facts, rules } = compileAll(puzzle.premises);
  const link = compile(frameStatement(puzzle.frame, a.literal, b.literal));
  const known = closure(facts, [...rules, ...link.rules]);
  return known.has(puzzle.conclusion) && !isContradictory(known);
}

export function verifyMissingLink(puzzle: MissingLinkPuzzle): VerifyResult {
  const report = new Report();
  const ids = new Set(puzzle.tiles.map((t) => t.id));
  if (ids.size !== puzzle.tiles.length) report.error("tile ids are not unique");
  if (new Set(puzzle.tiles.map((t) => t.literal)).size !== puzzle.tiles.length) report.error("two tiles assert the same literal");
  const tile = (id: string) => puzzle.tiles.find((t) => t.id === id);
  if (!tile(puzzle.answer.a) || !tile(puzzle.answer.b)) report.error("the answer names a tile that does not exist");
  if (puzzle.answer.a === puzzle.answer.b) report.error("the answer uses one tile for both blanks");
  if (!puzzle.sentences.some((s) => s.role === "conclusion")) report.error("the argument has no conclusion sentence");

  const { facts, rules } = compileAll(puzzle.premises);
  const unaided = closure(facts, rules);
  if (isContradictory(unaided)) report.error("the premises contradict each other");
  if (unaided.has(puzzle.conclusion)) report.error("the premises already reach the conclusion: there is no gap to fill");

  // Fillings that say the same thing (a frame read either way round, as "no
  // one who" can be) are one premise: uniqueness is up to equivalence.
  const premises = new Map<string, string[]>();
  for (const a of puzzle.tiles) {
    for (const b of puzzle.tiles) {
      if (a.id === b.id || !closesGap(puzzle, a, b)) continue;
      const key = meaning(puzzle.frame, a.literal, b.literal);
      premises.set(key, [...(premises.get(key) ?? []), `${a.id}/${b.id}`]);
    }
  }
  const a = tile(puzzle.answer.a);
  const b = tile(puzzle.answer.b);
  const intended = a && b ? meaning(puzzle.frame, a.literal, b.literal) : "";
  const listed = [...premises.values()].map((f) => f.join(" = ")).join("; ");
  if (premises.size === 0) report.error("no filling of the frame closes the argument");
  else if (!premises.has(intended)) report.error(`the intended filling does not close the argument; ${listed} does`);
  if (premises.size > 1) report.error(`more than one premise closes the argument: ${listed}`);
  if (puzzle.tiles.length < 4) report.warn("fewer than four tiles: the link is easy to guess");
  report.metric("tiles", puzzle.tiles.length);
  report.metric("premises", premises.size);
  return report.done();
}

export type MissingLinkAnswer = { a: string; b: string };

/** Checks a player's Declare. Any filling that closes the argument is correct. */
export function checkMissingLinkAnswer(puzzle: MissingLinkPuzzle, answer: MissingLinkAnswer): boolean {
  const a = puzzle.tiles.find((t) => t.id === answer.a);
  const b = puzzle.tiles.find((t) => t.id === answer.b);
  return !!a && !!b && a.id !== b.id && closesGap(puzzle, a, b);
}
