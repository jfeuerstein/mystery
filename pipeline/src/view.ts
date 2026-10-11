// `afoot player-view`: exactly what the player sees at a deduction, and
// nothing they don't (§14.3 stage 6). Blind solvers get this text only.
import {
  entryById,
  ORIENTATIONS,
  type Case,
  type DeductionSlot,
  type DeductionVariant,
  type FlawType,
  type Orientation,
} from "@afoot/schema";
import { fillFrame } from "@afoot/logic";

export type Target = { slot: string; variant: string } | "finale";

export function parseTarget(arg: string): Target {
  if (arg === "finale") return "finale";
  const [slot, variant] = arg.split("/");
  if (!slot || !variant) throw new Error(`expected "<slot>/<variant>" or "finale", got "${arg}"`);
  return { slot, variant };
}

export function findVariant(c: Case, target: Exclude<Target, "finale">): { slot: DeductionSlot; variant: DeductionVariant } {
  for (const ch of c.chapters) {
    for (const b of ch.beats) {
      if (b.kind === "deduction" && b.slot.id === target.slot) {
        const variant = b.slot.variants.find((v) => v.id === target.variant);
        if (!variant) throw new Error(`deduction "${target.slot}" has no variant "${target.variant}"`);
        return { slot: b.slot, variant };
      }
    }
  }
  throw new Error(`no deduction "${target.slot}"`);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The order in which a card's four readings are listed to a blind solver,
 * numbered 1–4. Seeded by card id so the view and the answer checker agree,
 * and so "1" is not always the stated reading.
 */
export function readingOrder(cardId: string): Orientation[] {
  const out = [...ORIENTATIONS];
  let h = hash(cardId);
  for (let i = out.length - 1; i > 0; i--) {
    const j = h % (i + 1);
    h = Math.floor(h / (i + 1)) || hash(`${cardId}${i}`);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The story up to (not including) the target deduction, as the player read it. */
function storySoFar(c: Case, target: Target): string[] {
  const lines: string[] = [];
  const name = (id: string) => c.cast.find((p) => p.id === id)?.name ?? id;
  for (const ch of c.chapters) {
    lines.push(`\n## Chapter: ${ch.title}`);
    for (const b of ch.beats) {
      if (b.kind === "deduction" && target !== "finale" && b.slot.id === target.slot) return lines;
      switch (b.kind) {
        case "narration":
          lines.push(...b.paragraphs);
          break;
        case "observe":
          lines.push(`You examine ${name(b.subject)} closely and observe:`);
          for (const d of b.details) lines.push(`- ${d.text}`);
          break;
        case "examine": {
          const loc = c.locations.find((l) => l.id === b.location)?.name ?? b.location;
          lines.push(`You search ${loc} and find:`);
          for (const id of b.hotspots) {
            const e = c.evidence.find((x) => x.id === id);
            if (e) lines.push(`- ${e.name}: ${e.description}`);
          }
          break;
        }
        case "interrogate":
          lines.push(`You question ${name(b.witness)}.`);
          for (const t of b.topics) {
            lines.push(`- Asked about "${t.label}": ${t.sentences.map((s) => `"${s.text}"`).join(" ")}`);
          }
          break;
        case "deduction":
          lines.push(`(Holmes deduces.) ${b.slot.onSolved.holmesSpeaks}`);
          for (const id of b.slot.onSolved.establishes) {
            const f = c.facts.find((x) => x.id === id);
            if (f) lines.push(`Established: ${f.text}`);
          }
          break;
      }
    }
  }
  if (target === "finale") lines.push("\n## The finale", ...c.finale.intro);
  return lines;
}

/**
 * Renders the player's view of a deduction (or the finale) as Markdown.
 * Answers, logical forms, defeaters, and what each card or sentence
 * "establishes" or "asserts" are never included.
 */
export function playerView(c: Case, target: Target, flawOptions: readonly FlawType[]): string {
  const out: string[] = [`# ${c.title}`, "", "# The story so far", ...storySoFar(c, target), ""];
  const name = (id: string) => c.cast.find((p) => p.id === id)?.name ?? id;

  if (target === "finale") {
    const r = c.finale.reconstruction;
    out.push(
      "# The Mind Palace: The Reconstruction",
      "Fill every blank from the word bank to say what really happened.",
      "",
      r.passage,
      "",
      "Blanks: " + r.blanks.map((b) => `{{${b.id}}}`).join(", "),
      "Word bank: " + r.wordBank.map((w) => `"${w}"`).join(", "),
      "",
      "## How to answer",
      'Reply with JSON only: {"blanks": {"<blankId>": "<word bank entry>", ...}}',
    );
    return out.join("\n");
  }

  const { slot, variant } = findVariant(c, target);
  const p = variant.puzzle;
  out.push(`# The Mind Palace`, `*${slot.prompt}*`, "");

  switch (p.type) {
    case "observation":
      out.push("## Observations");
      for (const o of p.observations) out.push(`- [${o.id}] ${o.text}`);
      out.push("", "## Possible inferences");
      for (const i of p.inferences) out.push(`- [${i.id}] ${i.text}`);
      out.push(
        "",
        "Link each observation to the inference it most strongly supports. Not every inference is used; an observation may support nothing listed.",
        "## How to answer",
        'Reply with JSON only: {"links": [{"observation": "<id>", "inference": "<id>"}, ...]}',
      );
      break;
    case "flaw":
      out.push(`## ${name(p.speaker)}'s argument`);
      for (const s of p.sentences) out.push(`- [${s.id}] ${s.text}`);
      out.push("", "## The Fallacy Index (the names you may give)");
      for (const f of flawOptions) {
        const e = entryById(f);
        if (e) out.push(`- [${f}] ${e.title}: ${e.plain}`);
      }
      out.push(
        "",
        "Find the sentence where the reasoning fails, and name the error.",
        "## How to answer",
        'Reply with JSON only: {"sentenceId": "<id>", "flawType": "<id>"}',
      );
      break;
    case "objection":
      out.push(`## ${name(p.witness)}'s testimony`);
      for (const s of p.testimony) out.push(`- [${s.id}] "${s.text}"`);
      out.push("", "## Evidence you may present");
      for (const card of p.hand) {
        const e = c.evidence.find((x) => x.id === card.id);
        out.push(`- [${card.id}] ${card.name}${e ? `: ${e.description}` : ""}`);
      }
      out.push(
        "",
        p.mode === "contradict"
          ? "Choose the one statement that cannot stand and the one piece of evidence that breaks it."
          : "Choose the one statement the police doubt and the one piece of evidence that supports it.",
        "## How to answer",
        'Reply with JSON only: {"sentenceId": "<id>", "evidenceId": "<id>"}',
      );
      break;
    case "chain":
      out.push(
        "## The cards",
        "Every card is true. A conditional card may be laid in any of its four readings; some readings follow from the card and some do not.",
      );
      for (const card of p.cards) {
        if (card.statement.form === "fact") {
          out.push(`- [${card.id}] (fact) ${card.text}`);
          continue;
        }
        out.push(`- [${card.id}] ${card.text}`);
        readingOrder(card.id).forEach((o, i) => {
          const text = o === "stated" || !card.readings ? card.text : card.readings[o];
          out.push(`    - reading ${i + 1}: ${text}`);
        });
      }
      out.push(
        "",
        `Question: ${p.prompt}`,
        "Build a chain: start from a fact card, then lay conditional cards, each in a reading whose \"if\" part is where the chain has got to. Where the chain ends is your answer. A reading that does not follow from its card breaks the chain.",
        "## How to answer",
        'Reply with JSON only: {"steps": [{"card": "<fact id>"}, {"card": "<id>", "reading": <1-4>}, ...]}',
      );
      break;
    case "missing-link": {
      out.push(`## ${name(p.speaker)}'s argument`);
      for (const s of p.sentences) out.push(`- ${s.text}`);
      out.push(
        "",
        "## The unstated premise",
        `The argument needs a premise it does not say. Complete it: "${fillFrame(p.frame, "[A]", "[B]")}"`,
        "",
        "## Phrase tiles",
      );
      for (const t of p.tiles) out.push(`- [${t.id}] ${t.text}`);
      out.push(
        "",
        "Choose one tile for [A] and a different tile for [B], so that the completed sentence, added to the argument, makes its conclusion follow.",
        "## How to answer",
        'Reply with JSON only: {"a": "<tile id>", "b": "<tile id>"}',
      );
      break;
    }
    case "arrangement": {
      out.push("## The rules");
      p.rules.forEach((r, i) => out.push(`${i + 1}. ${r.text}`));
      out.push("", "## People");
      for (const e of p.entities) out.push(`- [${e.id}] ${e.name}`);
      out.push("", `## ${p.layout === "ordering" ? "Positions, in order" : "Places"}`);
      for (const s of p.slots) out.push(`- [${s.id}] ${s.label}`);
      const q = p.question;
      out.push("", "## How to answer");
      if (q.kind === "full") {
        out.push(
          p.layout === "ordering" ? "Place everyone in order." : "Place everyone.",
          'Reply with JSON only: {"placements": {"<person id>": "<slot id>", ...}}',
        );
      } else if (q.kind === "occupants") {
        out.push(
          `Who must have been in "${p.slots.find((s) => s.id === q.slot)?.label}"?`,
          'Reply with JSON only: {"entities": ["<person id>", ...]}',
        );
      } else {
        out.push(`Where must ${p.entities.find((e) => e.id === q.entity)?.name} have been?`, 'Reply with JSON only: {"slot": "<slot id>"}');
      }
      break;
    }
  }
  return out.join("\n");
}
