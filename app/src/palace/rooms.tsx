// The Mind Palace rooms (GAME_DESIGN.md §8.2–8.8). Each builds an answer and
// reports only whether a Declare was right; the player is never told why
// (decision 21).
import {
  checkArrangementAnswer,
  checkChainAnswer,
  checkFlawAnswer,
  checkMissingLinkAnswer,
  checkObjectionAnswer,
  checkObservationAnswer,
  checkReconstructionAnswer,
  compile,
  FRAME_TEXT,
  orient,
  type ArrangementAnswer,
  type ChainStep,
} from "@afoot/logic";
import {
  entryById,
  FLAW_TYPES,
  ORIENTATIONS,
  type ArrangementPuzzle,
  type ChainCard,
  type ChainPuzzle,
  type ConceptId,
  type FlawPuzzle,
  type FlawType,
  type MissingLinkPuzzle,
  type ObjectionPuzzle,
  type ObservationPuzzle,
  type Reconstruction,
} from "@afoot/schema";
import { useState, type ReactNode } from "react";
import { HoldToDeclare } from "../ui/common";
import { Turn } from "../ui/icons";

type Declare = (correct: boolean) => void;

function Section(props: { children: ReactNode }) {
  return <div className="palace-section">{props.children}</div>;
}

function Footer(props: { ready: boolean; onDeclare: () => void }) {
  return (
    <div className="palace-footer">
      <HoldToDeclare disabled={!props.ready} onDeclare={props.onDeclare} />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function FlawRoom(props: { puzzle: FlawPuzzle; speaker: string; unlocked: ConceptId[]; onDeclare: Declare }) {
  const { puzzle } = props;
  const [sentence, setSentence] = useState<string>();
  const [flaw, setFlaw] = useState<FlawType>();
  // Only fallacies the player has unlocked can be named (§8.2).
  const names = FLAW_TYPES.filter((f) => props.unlocked.includes(f) && entryById(f));

  return (
    <>
      <Section>{props.speaker}'s reasoning</Section>
      <div className="list">
        {puzzle.sentences.map((s, i) => (
          <button
            key={s.id}
            className={`pick ${sentence === s.id ? "selected" : ""}`}
            onClick={() => setSentence(s.id)}
          >
            <span className="num">{i + 1}.</span>
            {s.text}
          </button>
        ))}
      </div>
      <Section>Name the error</Section>
      <div className="list">
        {names.map((f) => (
          <button key={f} className={`pick ${flaw === f ? "selected" : ""}`} onClick={() => setFlaw(f)}>
            <span className="display">{entryById(f)!.title}</span>
          </button>
        ))}
      </div>
      <Footer
        ready={sentence !== undefined && flaw !== undefined}
        onDeclare={() => props.onDeclare(checkFlawAnswer(puzzle, { sentenceId: sentence!, flawType: flaw! }))}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function ObjectionRoom(props: { puzzle: ObjectionPuzzle; witness: string; onDeclare: Declare }) {
  const { puzzle } = props;
  const [sentence, setSentence] = useState<string>();
  const [card, setCard] = useState<string>();
  return (
    <>
      <Section>{props.witness}'s testimony</Section>
      <div className="list">
        {puzzle.testimony.map((s, i) => (
          <button
            key={s.id}
            className={`pick ${sentence === s.id ? "selected" : ""}`}
            onClick={() => setSentence(s.id)}
          >
            <span className="num">{i + 1}.</span>"{s.text}"
          </button>
        ))}
      </div>
      <Section>{puzzle.mode === "contradict" ? "Present the evidence that breaks it" : "Present the evidence that supports it"}</Section>
      <div className="hand">
        {puzzle.hand.map((c) => (
          <button key={c.id} className={`pick ${card === c.id ? "selected" : ""}`} onClick={() => setCard(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <Footer
        ready={sentence !== undefined && card !== undefined}
        onDeclare={() => props.onDeclare(checkObjectionAnswer(puzzle, { sentenceId: sentence!, evidenceId: card! }))}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function ObservationRoom(props: { puzzle: ObservationPuzzle; onDeclare: Declare }) {
  const { puzzle } = props;
  const [links, setLinks] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | undefined>(puzzle.observations[0]?.id);
  const text = (id: string) => puzzle.inferences.find((i) => i.id === id)?.text;

  return (
    <>
      <Section>What you observed: tap one, then what it tells you</Section>
      <div className="list">
        {puzzle.observations.map((o) => (
          <div key={o.id}>
            <button className={`pick ${selected === o.id ? "selected" : ""}`} onClick={() => setSelected(o.id)}>
              {o.text}
            </button>
            {links[o.id] && (
              <button
                className="muted"
                style={{ display: "block", padding: "6px 12px", textAlign: "left" }}
                onClick={() => {
                  const { [o.id]: _, ...rest } = links;
                  setLinks(rest);
                }}
              >
                ↳ <i>{text(links[o.id]!)}</i> <span className="smallcaps">(remove)</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <Section>What it tells you</Section>
      <div className="list">
        {puzzle.inferences.map((i) => (
          <button
            key={i.id}
            className={`pick ${selected && links[selected] === i.id ? "selected" : ""}`}
            disabled={!selected}
            onClick={() => selected && setLinks({ ...links, [selected]: i.id })}
          >
            {i.text}
          </button>
        ))}
      </div>
      <Footer
        ready={Object.keys(links).length > 0}
        onDeclare={() =>
          props.onDeclare(
            checkObservationAnswer(puzzle, {
              links: Object.entries(links).map(([observation, inference]) => ({ observation, inference })),
            }),
          )
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

function readingOf(card: ChainCard, step: ChainStep): string {
  const o = step.orientation ?? "stated";
  return o === "stated" || !card.readings ? card.text : card.readings[o];
}

/** Where the chain has got to, following the links as laid (structure only, not validity). */
function chainEnd(puzzle: ChainPuzzle, steps: ChainStep[]): string | null | undefined {
  let current: string | undefined;
  for (const [i, step] of steps.entries()) {
    const card = puzzle.cards.find((c) => c.id === step.cardId)!;
    const compiled = compile(card.statement);
    if (i === 0) {
      current = compiled.facts[0];
      if (!current) return null;
      continue;
    }
    const rule = compiled.rules[0];
    if (!rule) return null;
    const applied = orient(rule, step.orientation);
    if (applied.if !== current) return null;
    current = applied.then;
  }
  return current;
}

export function ChainRoom(props: { puzzle: ChainPuzzle; onDeclare: Declare }) {
  const { puzzle } = props;
  const [steps, setSteps] = useState<ChainStep[]>([]);
  const deck = puzzle.cards.filter((c) => !steps.some((s) => s.cardId === c.id));
  const end = chainEnd(puzzle, steps);
  const card = (id: string) => puzzle.cards.find((c) => c.id === id)!;

  const turn = (index: number) =>
    setSteps(
      steps.map((s, i) => {
        if (i !== index) return s;
        const next = ORIENTATIONS[(ORIENTATIONS.indexOf(s.orientation ?? "stated") + 1) % ORIENTATIONS.length]!;
        return { ...s, orientation: next };
      }),
    );

  return (
    <>
      <Section>The board: start from a fact; turn a card to read it another way</Section>
      {steps.length === 0 && <p className="muted">Lay a card from the deck below.</p>}
      <div>
        {steps.map((s, i) => {
          const c = card(s.cardId);
          const turnable = compile(c.statement).rules.length > 0;
          return (
            <div key={s.cardId} className="chain-link">
              <div className="pick selected" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span key={s.orientation ?? "stated"} className={`reading ${s.orientation && s.orientation !== "stated" ? "turning" : ""}`} style={{ flex: 1 }}>
                  {readingOf(c, s)}
                </span>
                {turnable && (
                  <button className="icon-btn" aria-label="Turn card" onClick={() => turn(i)} data-testid={`turn-${c.id}`}>
                    <Turn size={20} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {steps.length > 0 && (
        <>
          <div className="therefore">
            {end === null ? (
              <span className="muted">The links do not join.</span>
            ) : (
              <>Therefore: {end !== undefined ? (puzzle.phrases[end] ?? "…") : "…"}</>
            )}
          </div>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => setSteps(steps.slice(0, -1))}>
              Lift last card
            </button>
            <button className="btn" onClick={() => setSteps([])}>
              Clear
            </button>
          </div>
        </>
      )}
      <Section>The deck</Section>
      <div className="list">
        {deck.map((c) => (
          <button
            key={c.id}
            className="pick"
            onClick={() => setSteps([...steps, { cardId: c.id, orientation: "stated" }])}
            data-testid={`card-${c.id}`}
          >
            {c.text}
          </button>
        ))}
      </div>
      <Footer
        ready={steps.length >= 2 && end !== null}
        onDeclare={() => props.onDeclare(checkChainAnswer(puzzle, { steps }).correct)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function ArrangementRoom(props: { puzzle: ArrangementPuzzle; onDeclare: Declare }) {
  const { puzzle } = props;
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [holding, setHolding] = useState<string>();
  const [used, setUsed] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const q = puzzle.question;
  const name = (id: string) => puzzle.entities.find((e) => e.id === id)?.name ?? id;
  const occupants = (slot: string) => Object.keys(placed).filter((e) => placed[e] === slot);
  const tray = puzzle.entities.filter((e) => !placed[e.id]);

  const placeInto = (slot: string) => {
    if (q.kind === "placement") {
      setPicked([slot]);
      return;
    }
    if (!holding) return;
    const next = { ...placed, [holding]: slot };
    if (puzzle.layout === "ordering") {
      for (const other of occupants(slot)) if (other !== holding) delete next[other];
    }
    setPlaced(next);
    setHolding(undefined);
  };

  const question =
    q.kind === "full"
      ? "Place everyone."
      : q.kind === "occupants"
        ? `Who must have been ${puzzle.slots.find((s) => s.id === q.slot)?.label.toLowerCase()}? Tap them below.`
        : `Where must ${name(q.entity)} have been? Tap the place.`;

  const answer = (): ArrangementAnswer =>
    q.kind === "full"
      ? { kind: "full", placements: placed }
      : q.kind === "occupants"
        ? { kind: "occupants", entities: picked }
        : { kind: "placement", slot: picked[0]! };
  const ready =
    q.kind === "full" ? Object.keys(placed).length === puzzle.entities.length : picked.length > 0;

  return (
    <>
      <Section>The rules: tap to strike through</Section>
      <ol style={{ margin: 0, paddingLeft: "1.4em" }}>
        {puzzle.rules.map((r) => (
          <li key={r.id} className={`rule-item ${used.includes(r.id) ? "used" : ""}`}>
            <button
              style={{ textAlign: "left", padding: "4px 0" }}
              onClick={() => setUsed(used.includes(r.id) ? used.filter((x) => x !== r.id) : [...used, r.id])}
            >
              {r.text}
            </button>
          </li>
        ))}
      </ol>
      <Section>{question}</Section>
      <div className="list">
        {puzzle.slots.map((s) => (
          <button
            key={s.id}
            className={`slot-row ${holding || (q.kind === "placement" && picked[0] === s.id) ? "target" : ""}`}
            onClick={() => placeInto(s.id)}
            data-testid={`slot-${s.id}`}
          >
            <span className="slot-label">{s.label}</span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {occupants(s.id).map((e) => (
                <span
                  key={e}
                  className={`chip ${holding === e ? "selected" : ""}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    const { [e]: _, ...rest } = placed;
                    setPlaced(rest);
                    setHolding(e);
                  }}
                >
                  {name(e)}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
      {q.kind !== "placement" && (
        <>
          <Section>{q.kind === "full" ? "Tap a name, then a place" : "Names"}</Section>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(q.kind === "full" ? tray : puzzle.entities).map((e) => {
              const on = q.kind === "full" ? holding === e.id : picked.includes(e.id);
              return (
                <button
                  key={e.id}
                  className={`chip ${on ? "selected" : ""}`}
                  data-testid={`entity-${e.id}`}
                  onClick={() => {
                    if (q.kind === "full") setHolding(holding === e.id ? undefined : e.id);
                    else setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id]);
                  }}
                >
                  {e.name}
                </button>
              );
            })}
          </div>
        </>
      )}
      <Footer ready={ready} onDeclare={() => props.onDeclare(checkArrangementAnswer(puzzle, answer()))} />
    </>
  );
}

// ---------------------------------------------------------------------------

export function ReconstructionRoom(props: { reconstruction: Reconstruction; onDeclare: Declare }) {
  const r = props.reconstruction;
  const [fills, setFills] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | undefined>(r.blanks[0]?.id);
  const parts = r.passage.split(/(\{\{[a-z0-9_-]+\}\})/);

  return (
    <>
      <Section>What happened</Section>
      <p className="passage">
        {parts.map((part, i) => {
          const m = /^\{\{([a-z0-9_-]+)\}\}$/.exec(part);
          if (!m) return <span key={i}>{part}</span>;
          const id = m[1]!;
          const value = fills[id];
          return (
            <button
              key={i}
              className={`blank ${value ? "" : "empty"} ${active === id ? "selected" : ""}`}
              onClick={() => setActive(id)}
              data-testid={`blank-${id}`}
            >
              {value ?? " ? "}
            </button>
          );
        })}
      </p>
      <Section>Fill the selected blank</Section>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {r.wordBank.map((w) => (
          <button
            key={w}
            className={`chip ${active && fills[active] === w ? "selected" : ""}`}
            disabled={!active}
            onClick={() => {
              if (!active) return;
              const next = { ...fills, [active]: w };
              setFills(next);
              const empty = r.blanks.find((b) => !next[b.id]);
              setActive(empty?.id ?? active);
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <Footer
        ready={r.blanks.every((b) => fills[b.id])}
        onDeclare={() => props.onDeclare(checkReconstructionAnswer(r, fills))}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

/** The Missing Link (§8.7): complete the premise the argument leaves unsaid. */
export function MissingLinkRoom(props: { puzzle: MissingLinkPuzzle; speaker: string; onDeclare: Declare }) {
  const { puzzle } = props;
  const [fills, setFills] = useState<{ a?: string; b?: string }>({});
  const [active, setActive] = useState<"a" | "b">("a");
  const text = (id?: string) => puzzle.tiles.find((t) => t.id === id)?.text;
  // The frame's words are code's, not the case's: split around the two blanks.
  const parts = FRAME_TEXT[puzzle.frame].split(/(\{[ab]\})/);

  const place = (tile: string) => {
    const next = { ...fills, [active]: tile };
    if (next.a === next.b) delete next[active === "a" ? "b" : "a"];
    setFills(next);
    if (!next.a) setActive("a");
    else if (!next.b) setActive("b");
  };

  return (
    <>
      <Section>{props.speaker}'s reasoning</Section>
      <div className="argument">
        {puzzle.sentences.map((s) => (
          <p key={s.id} className={s.role === "conclusion" ? "conclusion" : ""}>
            {s.text}
          </p>
        ))}
      </div>
      <Section>The premise left unsaid</Section>
      <p className="passage link-frame" data-testid="link-frame">
        {parts.map((part, i) => {
          const m = /^\{([ab])\}$/.exec(part);
          const lead = i === 0 && part.length > 0;
          if (!m) return <span key={i}>{lead ? part.charAt(0).toUpperCase() + part.slice(1) : part}</span>;
          const blank = m[1] as "a" | "b";
          const value = text(fills[blank]);
          return (
            <button
              key={i}
              className={`blank ${value ? "" : "empty"} ${active === blank ? "selected" : ""}`}
              onClick={() => setActive(blank)}
              data-testid={`link-${blank}`}
            >
              {value ?? " ? "}
            </button>
          );
        })}
      </p>
      <Section>Phrases</Section>
      <div className="list">
        {puzzle.tiles.map((t) => {
          const used = fills.a === t.id || fills.b === t.id;
          return (
            <button key={t.id} className={`pick ${used ? "selected" : ""}`} onClick={() => place(t.id)} data-testid={`tile-${t.id}`}>
              {t.text}
            </button>
          );
        })}
      </div>
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={() => (setFills({}), setActive("a"))} disabled={!fills.a && !fills.b}>
          Clear
        </button>
      </div>
      <Footer
        ready={!!fills.a && !!fills.b}
        onDeclare={() => props.onDeclare(checkMissingLinkAnswer(puzzle, { a: fills.a!, b: fills.b! }))}
      />
    </>
  );
}
