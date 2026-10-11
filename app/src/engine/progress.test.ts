import { Case } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import caseJson from "../../../fixtures/stopped-clock.case.json";
import {
  advance,
  ask,
  availableTopics,
  canAdvance,
  currentBeat,
  currentSlot,
  declare,
  enterPalace,
  find,
  finish,
  grade,
  inspect,
  nextParagraph,
  puzzleFor,
  restartChapter,
  restartFinale,
  startCase,
  storySoFar,
  type CaseProgress,
} from "./progress";

const c = Case.parse(caseJson);

/** Completes the current beat the way a player would, declaring correctly. */
function playBeat(p: CaseProgress): CaseProgress {
  const beat = currentBeat(c, p);
  if (!beat) throw new Error(`no beat at ${JSON.stringify(p.stage)}`);
  switch (beat.kind) {
    case "narration":
      for (let i = 0; i < beat.paragraphs.length; i++) p = nextParagraph(c, p);
      return p;
    case "observe":
      for (const d of beat.details) p = inspect(c, p, d.id);
      return advance(c, p);
    case "examine":
      for (const id of beat.hotspots) p = find(c, p, id);
      return advance(c, p);
    case "interrogate":
      for (const t of beat.topics) p = ask(c, p, t.id);
      return advance(c, p);
    case "deduction":
      p = enterPalace(p);
      p = declare(c, p, true);
      return advance(c, p);
  }
}

function playToFinale(p: CaseProgress): CaseProgress {
  while (p.stage.kind === "chapter") p = playBeat(p);
  return p;
}

describe("engine", () => {
  it("plays the sample case start to finish for a Masterful grade", () => {
    let p = playToFinale(startCase(c));
    expect(p.stage).toEqual({ kind: "finale", step: "intro" });
    expect(p.known).toContain("f-murderer-not-servant");
    expect(p.known).toContain("n-card-game");
    p = declare(c, enterPalace(p), true);
    p = finish(p);
    expect(p.stage).toEqual({ kind: "account" });
    expect(grade(p)).toBe("masterful");
  });

  it("won't advance past an unfinished beat", () => {
    let p = playBeat(startCase(c)); // narration → observe
    expect(currentBeat(c, p)?.kind).toBe("observe");
    p = inspect(c, p, "o-ticket");
    expect(canAdvance(c, p)).toBe(false);
    expect(advance(c, p)).toBe(p);
  });

  it("only offers topics whose clues the player has", () => {
    const p = startCase(c);
    const hale = c.chapters[1]!.beats.findIndex((b) => b.kind === "interrogate");
    const atHale: CaseProgress = {
      ...p,
      stage: { kind: "chapter", chapter: 1, beat: hale, phase: { kind: "interrogate", asked: [] } },
    };
    expect(availableTopics(c, atHale).map((t) => t.id)).toEqual(["t-hale-evening"]);
    expect(ask(c, atHale, "t-hale-hall")).toBe(atHale);
    const withClock = { ...atHale, known: ["e-clock"] };
    expect(availableTopics(c, withClock).map((t) => t.id)).toEqual(["t-hale-evening", "t-hale-hall"]);
  });

  it("goes cold after three wrong Declares and restarts the chapter with a fresh variant", () => {
    let p = startCase(c);
    while (currentSlot(c, p)?.id !== "d-hall-order") p = playBeat(p);
    const chapterStartKnown = p.chapterStart.known;
    expect(p.known).toContain("e-clock"); // found during this chapter
    p = enterPalace(p);
    const before = puzzleFor(p, currentSlot(c, p)!);
    p = declare(c, p, false);
    p = declare(c, p, false);
    expect(p.patience).toBe(1);
    p = declare(c, p, false);
    expect(p.stage).toEqual({ kind: "cold", chapter: 1 });

    p = restartChapter(c, p);
    expect(p.stage.kind === "chapter" && p.stage.beat).toBe(0);
    expect(p.patience).toBe(3);
    expect(p.known).toEqual(chapterStartKnown);
    expect(p.known).not.toContain("e-clock");
    while (currentSlot(c, p)?.id !== "d-hall-order") p = playBeat(p);
    expect(puzzleFor(p, currentSlot(c, p)!)).not.toEqual(before);

    p = playToFinale(p);
    p = finish(declare(c, enterPalace(p), true));
    expect(p.wrong).toBe(3);
    expect(p.restarts).toBe(1);
    expect(grade(p)).toBe("untidy");
  });

  it("grades a few slips with no restart as Workmanlike", () => {
    let p = startCase(c);
    while (currentSlot(c, p)?.id !== "d-watson-letter") p = playBeat(p);
    p = declare(c, enterPalace(p), false);
    p = playToFinale(declare(c, p, true));
    p = finish(declare(c, enterPalace(p), true));
    expect(grade(p)).toBe("workmanlike");
  });

  it("restarts the finale when its Patience runs out", () => {
    let p = enterPalace(playToFinale(startCase(c)));
    for (let i = 0; i < 3; i++) p = declare(c, p, false);
    expect(p.stage).toEqual({ kind: "finale-cold" });
    p = restartFinale(p);
    expect(p.stage).toEqual({ kind: "finale", step: "intro" });
    expect(p.patience).toBe(3);
  });
});

describe("the story so far", () => {
  it("holds exactly what has been read, in order, up to the current paragraph", () => {
    const first = c.chapters[0]!.beats[0]!;
    if (first.kind !== "narration") throw new Error("expected an opening narration");
    let p = startCase(c);
    expect(storySoFar(c, p)).toEqual([
      { kind: "chapter", number: 0, title: "The Client" },
      { kind: "narration", paragraphs: [first.paragraphs[0]] },
    ]);
    p = nextParagraph(c, p);
    const opening = storySoFar(c, p)[1]!;
    expect(opening.kind === "narration" && opening.paragraphs.length).toBe(2);

    // Mid-observation: only the details inspected so far.
    p = playBeat(startCase(c));
    const observe = currentBeat(c, p)!;
    if (observe.kind !== "observe") throw new Error("expected the cold read");
    p = inspect(c, p, observe.details[0]!.id);
    expect(storySoFar(c, p).at(-1)).toEqual({ kind: "observed", subject: expect.any(String), notes: [observe.details[0]!.text] });
  });

  it("shows a deduction's conclusion only once it is solved", () => {
    let p = startCase(c);
    while (currentBeat(c, p)?.kind !== "deduction") p = playBeat(p);
    expect(storySoFar(c, p).at(-1)).toEqual({ kind: "deduction", prompt: currentSlot(c, p)!.prompt });
    p = declare(c, enterPalace(p), true);
    expect(storySoFar(c, p).at(-1)).toMatchObject({ kind: "deduction", conclusion: currentSlot(c, p)!.onSolved.holmesSpeaks });
  });

  it("covers the whole case at the finale, and drops a chapter that has gone cold", () => {
    let p = playToFinale(startCase(c));
    const pages = storySoFar(c, p);
    expect(pages.filter((x) => x.kind === "chapter").map((x) => x.kind === "chapter" && x.title)).toEqual(c.chapters.map((ch) => ch.title));
    expect(pages.at(-1)).toEqual({ kind: "finale", paragraphs: c.finale.intro });
    // Nothing from the finale's solution until it is reached.
    expect(JSON.stringify(pages)).not.toContain(c.finale.solution[0]!);

    p = startCase(c);
    while (p.stage.kind === "chapter" && p.stage.chapter === 0) p = playBeat(p);
    while (currentBeat(c, p)?.kind !== "deduction") p = playBeat(p);
    p = enterPalace(p);
    for (let i = 0; i < 3; i++) p = declare(c, p, false);
    expect(p.stage.kind).toBe("cold");
    expect(storySoFar(c, p).filter((x) => x.kind === "chapter")).toEqual([{ kind: "chapter", number: 0, title: "The Client" }]);
  });
});
