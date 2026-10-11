// The game engine as pure functions over a serializable progress record.
// GAME_DESIGN.md §5 (structure), §6 (core loop), §9 (Patience and grading).
import { PATIENCE_PER_CHAPTER, type Beat, type Case, type DeductionSlot, type Puzzle } from "@afoot/schema";

export type BeatPhase =
  | { kind: "narration"; paragraph: number }
  | { kind: "observe"; inspected: string[] }
  | { kind: "examine"; found: string[] }
  | { kind: "interrogate"; asked: string[]; open?: string }
  | { kind: "deduction"; step: "intro" | "palace" | "speaks" };

export type Stage =
  | { kind: "chapter"; chapter: number; beat: number; phase: BeatPhase }
  /** Patience ran out; the chapter will restart (§9.1). */
  | { kind: "cold"; chapter: number }
  | { kind: "finale"; step: "intro" | "palace" | "solution" }
  | { kind: "finale-cold" }
  | { kind: "account" };

export type Grade = "masterful" | "workmanlike" | "untidy";

export type CaseProgress = {
  caseId: string;
  stage: Stage;
  patience: number;
  /** Ids in the Case File: details, evidence, topics, facts and solved deductions. */
  known: string[];
  /** Wrong Declares across the whole case. */
  wrong: number;
  restarts: number;
  /** Slot id → index of the variant in play. */
  variant: Record<string, number>;
  /** Slot id → variant indexes the player has failed with. */
  tried: Record<string, number[]>;
  failedThisChapter: string[];
  chapterStart: { known: string[] };
};

function initialPhase(beat: Beat): BeatPhase {
  switch (beat.kind) {
    case "narration":
      return { kind: "narration", paragraph: 0 };
    case "observe":
      return { kind: "observe", inspected: [] };
    case "examine":
      return { kind: "examine", found: [] };
    case "interrogate":
      return { kind: "interrogate", asked: [] };
    case "deduction":
      return { kind: "deduction", step: "intro" };
  }
}

function addKnown(known: string[], ids: readonly string[]): string[] {
  const set = new Set(known);
  return [...known, ...ids.filter((id) => !set.has(id))];
}

function chapterStage(c: Case, chapter: number): Stage {
  return { kind: "chapter", chapter, beat: 0, phase: initialPhase(c.chapters[chapter]!.beats[0]!) };
}

export function startCase(c: Case): CaseProgress {
  return {
    caseId: c.id,
    stage: chapterStage(c, 0),
    patience: PATIENCE_PER_CHAPTER,
    known: [],
    wrong: 0,
    restarts: 0,
    variant: {},
    tried: {},
    failedThisChapter: [],
    chapterStart: { known: [] },
  };
}

export function currentBeat(c: Case, p: CaseProgress): Beat | undefined {
  if (p.stage.kind !== "chapter") return undefined;
  return c.chapters[p.stage.chapter]?.beats[p.stage.beat];
}

export function currentSlot(c: Case, p: CaseProgress): DeductionSlot | undefined {
  const beat = currentBeat(c, p);
  return beat?.kind === "deduction" ? beat.slot : undefined;
}

export function puzzleFor(p: CaseProgress, slot: DeductionSlot): Puzzle {
  const index = p.variant[slot.id] ?? 0;
  return (slot.variants[index] ?? slot.variants[0]!).puzzle;
}

export function variantFor(p: CaseProgress, slot: DeductionSlot) {
  return slot.variants[p.variant[slot.id] ?? 0] ?? slot.variants[0]!;
}

/** Whether the current beat is finished and the story may move on. */
export function canAdvance(c: Case, p: CaseProgress): boolean {
  const beat = currentBeat(c, p);
  if (!beat || p.stage.kind !== "chapter") return false;
  const phase = p.stage.phase;
  switch (beat.kind) {
    case "narration":
      return phase.kind === "narration" && phase.paragraph >= beat.paragraphs.length - 1;
    case "observe":
      return phase.kind === "observe" && beat.details.every((d) => phase.inspected.includes(d.id));
    case "examine":
      return phase.kind === "examine" && beat.hotspots.every((id) => phase.found.includes(id));
    case "interrogate":
      return phase.kind === "interrogate" && beat.topics.every((t) => phase.asked.includes(t.id));
    case "deduction":
      return phase.kind === "deduction" && phase.step === "speaks";
  }
}

/** Moves to the next beat, chapter, or the finale. Collects narration facts on the way out. */
export function advance(c: Case, p: CaseProgress): CaseProgress {
  if (!canAdvance(c, p) || p.stage.kind !== "chapter") return p;
  const beat = currentBeat(c, p)!;
  const known = beat.kind === "narration" ? addKnown(p.known, beat.introduces) : p.known;
  const { chapter } = p.stage;
  const next = p.stage.beat + 1;
  const beats = c.chapters[chapter]!.beats;

  if (next < beats.length) {
    return { ...p, known, stage: { kind: "chapter", chapter, beat: next, phase: initialPhase(beats[next]!) } };
  }
  const fresh = { known, patience: PATIENCE_PER_CHAPTER, failedThisChapter: [], chapterStart: { known } };
  if (chapter + 1 < c.chapters.length) {
    return { ...p, ...fresh, stage: chapterStage(c, chapter + 1) };
  }
  return { ...p, ...fresh, stage: { kind: "finale", step: "intro" } };
}

/** One page of what the player has read so far (§6: looking back). */
export type StoryPage =
  | { kind: "chapter"; number: number; title: string }
  | { kind: "narration"; paragraphs: string[] }
  | { kind: "observed"; subject: string; notes: string[] }
  | { kind: "examined"; place: string; items: { name: string; text: string }[] }
  | { kind: "questioned"; witness: string; answers: { topic: string; sentences: string[] }[] }
  | { kind: "deduction"; prompt: string; conclusion?: string }
  | { kind: "finale"; paragraphs: string[] };

/** What the player has read of one beat: all of it if finished, else what its phase has shown. */
function pageFor(c: Case, beat: Beat, phase: BeatPhase | undefined, known: Set<string>): StoryPage | undefined {
  const name = (id: string) => c.cast.find((x) => x.id === id)?.name ?? id;
  switch (beat.kind) {
    case "narration": {
      const shown = phase?.kind === "narration" ? phase.paragraph + 1 : beat.paragraphs.length;
      return { kind: "narration", paragraphs: beat.paragraphs.slice(0, shown) };
    }
    case "observe": {
      const seen = (id: string) => (phase?.kind === "observe" ? phase.inspected.includes(id) : known.has(id));
      const notes = beat.details.filter((d) => seen(d.id)).map((d) => d.text);
      return notes.length ? { kind: "observed", subject: name(beat.subject), notes } : undefined;
    }
    case "examine": {
      const seen = (id: string) => (phase?.kind === "examine" ? phase.found.includes(id) : known.has(id));
      const items = beat.hotspots
        .filter(seen)
        .flatMap((id) => c.evidence.filter((e) => e.id === id))
        .map((e) => ({ name: e.name, text: e.description }));
      const place = c.locations.find((l) => l.id === beat.location)?.name ?? beat.location;
      return items.length ? { kind: "examined", place, items } : undefined;
    }
    case "interrogate": {
      const seen = (id: string) => (phase?.kind === "interrogate" ? phase.asked.includes(id) : known.has(id));
      const answers = beat.topics.filter((t) => seen(t.id)).map((t) => ({ topic: t.label, sentences: t.sentences.map((x) => x.text) }));
      return answers.length ? { kind: "questioned", witness: name(beat.witness), answers } : undefined;
    }
    case "deduction": {
      const solved = phase?.kind === "deduction" ? phase.step === "speaks" : true;
      return { kind: "deduction", prompt: beat.slot.prompt, ...(solved ? { conclusion: beat.slot.onSolved.holmesSpeaks } : {}) };
    }
  }
}

/**
 * Everything the player has read in this case, in order, up to where they are
 * now: so a page tapped past too quickly can be read again. It reveals nothing
 * the player has not already been shown.
 */
export function storySoFar(c: Case, p: CaseProgress): StoryPage[] {
  const s = p.stage;
  const known = new Set(p.known);
  // A cold chapter starts again, so only the chapters before it stand as read.
  const lastChapter = s.kind === "chapter" ? s.chapter : s.kind === "cold" ? s.chapter - 1 : c.chapters.length - 1;
  const pages: StoryPage[] = [];
  for (let ch = 0; ch <= lastChapter; ch++) {
    const chapter = c.chapters[ch]!;
    pages.push({ kind: "chapter", number: ch, title: chapter.title });
    const here = s.kind === "chapter" && s.chapter === ch;
    const lastBeat = here ? s.beat : chapter.beats.length - 1;
    for (let b = 0; b <= lastBeat; b++) {
      const page = pageFor(c, chapter.beats[b]!, here && b === lastBeat ? s.phase : undefined, known);
      if (page) pages.push(page);
    }
  }
  if (s.kind === "finale" || s.kind === "finale-cold" || s.kind === "account") {
    pages.push({ kind: "finale", paragraphs: c.finale.intro });
    if (s.kind === "account" || (s.kind === "finale" && s.step === "solution")) {
      pages.push({ kind: "finale", paragraphs: c.finale.solution });
    }
  }
  return pages;
}

export function nextParagraph(c: Case, p: CaseProgress): CaseProgress {
  const beat = currentBeat(c, p);
  if (p.stage.kind !== "chapter" || beat?.kind !== "narration" || p.stage.phase.kind !== "narration") return p;
  if (p.stage.phase.paragraph >= beat.paragraphs.length - 1) return advance(c, p);
  return { ...p, stage: { ...p.stage, phase: { kind: "narration", paragraph: p.stage.phase.paragraph + 1 } } };
}

/** Observe: the player inspects a detail. */
export function inspect(c: Case, p: CaseProgress, id: string): CaseProgress {
  const beat = currentBeat(c, p);
  if (p.stage.kind !== "chapter" || beat?.kind !== "observe" || p.stage.phase.kind !== "observe") return p;
  if (!beat.details.some((d) => d.id === id) || p.stage.phase.inspected.includes(id)) return p;
  const phase: BeatPhase = { kind: "observe", inspected: [...p.stage.phase.inspected, id] };
  return { ...p, known: addKnown(p.known, [id]), stage: { ...p.stage, phase } };
}

/** Examine: the player finds an evidence hotspot. */
export function find(c: Case, p: CaseProgress, id: string): CaseProgress {
  const beat = currentBeat(c, p);
  if (p.stage.kind !== "chapter" || beat?.kind !== "examine" || p.stage.phase.kind !== "examine") return p;
  if (!beat.hotspots.includes(id) || p.stage.phase.found.includes(id)) return p;
  const phase: BeatPhase = { kind: "examine", found: [...p.stage.phase.found, id] };
  return { ...p, known: addKnown(p.known, [id]), stage: { ...p.stage, phase } };
}

/** Topics the player may ask about now (§7.3). */
export function availableTopics(c: Case, p: CaseProgress) {
  const beat = currentBeat(c, p);
  if (beat?.kind !== "interrogate") return [];
  return beat.topics.filter((t) => t.unlockedBy.every((id) => p.known.includes(id)));
}

/** Interrogate: the player asks about a topic; the answer joins the Testimony tab. */
export function ask(c: Case, p: CaseProgress, topicId: string): CaseProgress {
  if (p.stage.kind !== "chapter" || p.stage.phase.kind !== "interrogate") return p;
  if (!availableTopics(c, p).some((t) => t.id === topicId)) return p;
  const asked = p.stage.phase.asked.includes(topicId) ? p.stage.phase.asked : [...p.stage.phase.asked, topicId];
  return {
    ...p,
    known: addKnown(p.known, [topicId]),
    stage: { ...p.stage, phase: { kind: "interrogate", asked, open: topicId } },
  };
}

export function enterPalace(p: CaseProgress): CaseProgress {
  if (p.stage.kind === "chapter" && p.stage.phase.kind === "deduction" && p.stage.phase.step === "intro") {
    return { ...p, stage: { ...p.stage, phase: { kind: "deduction", step: "palace" } } };
  }
  if (p.stage.kind === "finale" && p.stage.step === "intro") return { ...p, stage: { kind: "finale", step: "palace" } };
  return p;
}

/**
 * Records a Declare. A wrong one costs one Patience and reveals nothing else
 * (decision 21); at zero, the chapter (or finale) goes cold.
 */
export function declare(c: Case, p: CaseProgress, correct: boolean): CaseProgress {
  const inChapter = p.stage.kind === "chapter" && p.stage.phase.kind === "deduction" && p.stage.phase.step === "palace";
  const inFinale = p.stage.kind === "finale" && p.stage.step === "palace";
  if (!inChapter && !inFinale) return p;

  if (correct) {
    if (inFinale) return { ...p, stage: { kind: "finale", step: "solution" } };
    const slot = currentSlot(c, p)!;
    const stage = p.stage as Extract<Stage, { kind: "chapter" }>;
    return {
      ...p,
      known: addKnown(p.known, [slot.id, ...slot.onSolved.establishes]),
      stage: { ...stage, phase: { kind: "deduction", step: "speaks" } },
    };
  }

  const patience = p.patience - 1;
  const wrong = p.wrong + 1;
  if (inFinale) {
    return { ...p, wrong, patience, stage: patience <= 0 ? { kind: "finale-cold" } : p.stage };
  }
  const slot = currentSlot(c, p)!;
  const stage = p.stage as Extract<Stage, { kind: "chapter" }>;
  const failedThisChapter = p.failedThisChapter.includes(slot.id)
    ? p.failedThisChapter
    : [...p.failedThisChapter, slot.id];
  return {
    ...p,
    wrong,
    patience,
    failedThisChapter,
    stage: patience <= 0 ? { kind: "cold", chapter: stage.chapter } : p.stage,
  };
}

/**
 * Restarts a cold chapter from its first beat with the Case File as it was
 * when the chapter began. Each deduction failed in the chapter swaps to a
 * variant the player hasn't failed with, where one exists (§9.2).
 */
export function restartChapter(c: Case, p: CaseProgress): CaseProgress {
  if (p.stage.kind !== "cold") return p;
  const slots = c.chapters[p.stage.chapter]!.beats.flatMap((b) => (b.kind === "deduction" ? [b.slot] : []));
  const variant = { ...p.variant };
  const tried = { ...p.tried };
  for (const slot of slots) {
    if (!p.failedThisChapter.includes(slot.id)) continue;
    const current = variant[slot.id] ?? 0;
    const failed = [...new Set([...(tried[slot.id] ?? []), current])];
    tried[slot.id] = failed;
    const fresh = slot.variants.findIndex((_, i) => !failed.includes(i));
    variant[slot.id] = fresh >= 0 ? fresh : (current + 1) % slot.variants.length;
  }
  return {
    ...p,
    known: p.chapterStart.known,
    patience: PATIENCE_PER_CHAPTER,
    restarts: p.restarts + 1,
    failedThisChapter: [],
    variant,
    tried,
    stage: chapterStage(c, p.stage.chapter),
  };
}

export function restartFinale(p: CaseProgress): CaseProgress {
  if (p.stage.kind !== "finale-cold") return p;
  return { ...p, patience: PATIENCE_PER_CHAPTER, restarts: p.restarts + 1, stage: { kind: "finale", step: "intro" } };
}

export function finish(p: CaseProgress): CaseProgress {
  if (p.stage.kind !== "finale" || p.stage.step !== "solution") return p;
  return { ...p, stage: { kind: "account" } };
}

/** Watson's Account (§9.3). */
export function grade(p: CaseProgress): Grade {
  if (p.wrong === 0 && p.restarts === 0) return "masterful";
  if (p.restarts === 0 && p.wrong <= 3) return "workmanlike";
  return "untidy";
}

export function patienceHolderPerson(c: Case, p: CaseProgress) {
  const id =
    p.stage.kind === "chapter" || p.stage.kind === "cold"
      ? c.chapters[p.stage.chapter]!.patienceHolder
      : c.finale.patienceHolder;
  return c.cast.find((x) => x.id === id) ?? { id, name: id, role: "" };
}

export function patienceHolder(c: Case, p: CaseProgress): string {
  return patienceHolderPerson(c, p).name;
}
