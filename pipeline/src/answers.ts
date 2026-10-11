// `afoot check-answer`: turns a blind solver's JSON into the checker's answer
// shape and checks it. Reports only right or wrong.
import {
  checkArrangementAnswer,
  checkChainAnswer,
  checkFlawAnswer,
  checkObjectionAnswer,
  checkObservationAnswer,
  checkReconstructionAnswer,
  type ArrangementAnswer,
} from "@afoot/logic";
import type { Case, FlawType } from "@afoot/schema";
import { findVariant, readingOrder, type Target } from "./view.js";

type Json = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Accepts a bare JSON object or one wrapped in prose / a code fence. */
export function extractJson(text: string): Json {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in the answer");
  return JSON.parse(text.slice(start, end + 1)) as Json;
}

export function checkAnswer(c: Case, target: Target, answer: Json): boolean {
  if (target === "finale") {
    const blanks = (answer.blanks ?? {}) as Record<string, string>;
    return checkReconstructionAnswer(c.finale.reconstruction, blanks);
  }
  const p = findVariant(c, target).variant.puzzle;
  switch (p.type) {
    case "observation": {
      const links = Array.isArray(answer.links) ? (answer.links as Json[]) : [];
      return checkObservationAnswer(p, {
        links: links.map((l) => ({ observation: str(l.observation), inference: str(l.inference) })),
      });
    }
    case "flaw":
      return checkFlawAnswer(p, { sentenceId: str(answer.sentenceId), flawType: str(answer.flawType) as FlawType });
    case "objection":
      return checkObjectionAnswer(p, { sentenceId: str(answer.sentenceId), evidenceId: str(answer.evidenceId) });
    case "chain": {
      const steps = Array.isArray(answer.steps) ? (answer.steps as Json[]) : [];
      const mapped = steps.map((s, i) => {
        const cardId = str(s.card ?? s.cardId);
        if (i === 0 && s.reading === undefined) return { cardId };
        const n = Number(s.reading);
        const orientation = readingOrder(cardId)[n - 1];
        // An out-of-range reading can't be laid; treat it as a broken chain.
        return orientation ? { cardId, orientation } : { cardId: `${cardId}#invalid` };
      });
      return checkChainAnswer(p, { steps: mapped }).correct;
    }
    case "arrangement": {
      const q = p.question;
      const a: ArrangementAnswer =
        q.kind === "full"
          ? { kind: "full", placements: (answer.placements ?? {}) as Record<string, string> }
          : q.kind === "occupants"
            ? { kind: "occupants", entities: Array.isArray(answer.entities) ? answer.entities.map(str) : [] }
            : { kind: "placement", slot: str(answer.slot) };
      return checkArrangementAnswer(p, a);
    }
  }
}
