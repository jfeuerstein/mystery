import type { Case, ConceptId } from "@afoot/schema";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { audio } from "../audio/director";
import { candleSeconds } from "../engine/candle";
import * as engine from "../engine/progress";
import { puzzleFor, variantFor, type CaseProgress } from "../engine/progress";
import { useGame } from "../engine/store";
import {
  ArrangementRoom,
  ChainRoom,
  FlawRoom,
  MissingLinkRoom,
  ObjectionRoom,
  ObservationRoom,
  ParallelRoom,
  ReconstructionRoom,
} from "../palace/rooms";
import { Candle, PatienceMeter, SheetHost, useThemeColor } from "../ui/common";
import { holderKind, Notebook } from "../ui/icons";
import { CaseFile, NotebookSheet } from "./Sheets";

/** The Palace's ground (styles.css `--palace-bg`), for the status bar. */
const PALACE_BG = "#0f0d0b";

const ROOM_NAMES = {
  flaw: "Gallery of Testimony",
  parallel: "Gallery of Testimony",
  objection: "Gallery of Testimony",
  chain: "Chain Hall",
  arrangement: "Map Room",
  observation: "Evidence Room",
  "missing-link": "Gallery of Testimony",
} as const;

/**
 * The one-time guide to each room's controls (§11.2). It explains how to
 * build an answer here, never how to reason about one.
 */
const GUIDES: Record<string, string> = {
  flaw: "Tap the sentence where the reasoning goes wrong, then the name of the error from the Fallacy Index. Press and hold Declare to commit.",
  parallel:
    "Read the reasoning, then tap the argument from the commonplace book that goes wrong in the same way. Press and hold Declare to commit.",
  objection:
    "Tap the statement you mean to challenge, then present a card from the hand of evidence. Press and hold Declare to commit.",
  chain:
    "Begin the chain with a fact, then lay cards one after another. Turn a card to read it another way; lift the last card to take it back. Where the chain ends is your answer.",
  arrangement:
    "Tap a person, then a place to put them there; tap a placed person to lift them. Press and hold Declare when the board says what you mean.",
  observation:
    "Tap an observation, then the inference you would draw from it. Tap a link again to undo it. Press and hold Declare to commit.",
  "missing-link":
    "Tap a blank in the unsaid sentence, then a phrase to fill it. Press and hold Declare when the sentence is complete.",
  reconstruction:
    "Tap a blank in the account, then a word or phrase to fill it. Press and hold Declare when every blank is filled.",
};

function needsGuide(room: string, seenRooms: readonly string[]): boolean {
  return GUIDES[room] !== undefined && !seenRooms.includes(room);
}

function RoomGuide(props: { room: string; onRead: () => void }) {
  const { seenRooms, markRoomSeen } = useGame();
  const text = GUIDES[props.room];
  if (!text || !needsGuide(props.room, seenRooms)) return null;
  return (
    <div className="room-guide" role="dialog" aria-label="How this room works">
      <div className="room-guide-card">
        <div className="palace-section">How this room works</div>
        <p>{text}</p>
        <button
          className="btn"
          onClick={() => {
            markRoomSeen(props.room);
            props.onRead();
          }}
          data-testid="room-guide-ok"
        >
          Understood
        </button>
      </div>
    </div>
  );
}

/** The time the Palace takes to collapse back into the scene after a right answer. */
const CLOSE_MS = 560;

/** Fractures across the glass of the Palace: a wrong Declare (decision 21). */
function Crack() {
  return (
    <svg className="crack" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M210 400 L170 330 L182 280 L140 210 L150 150" />
      <path d="M210 400 L260 360 L300 372 L352 318" />
      <path d="M210 400 L238 470 L226 530 L262 600 L250 660" />
      <path d="M210 400 L150 438 L110 430 L60 470" />
      <path d="M182 280 L222 250" />
      <path d="M238 470 L290 490" />
      <path d="M150 438 L140 500" />
    </svg>
  );
}

function PalaceFrame(props: {
  room: string;
  /** The puzzle type, for the room's one-time guide. */
  kind: string;
  /** The guide has been read: the clock starts now. */
  onGuideRead: () => void;
  prompt: string;
  c: Case;
  p: CaseProgress;
  children: ReactNode;
  struck: number;
  leaving: boolean;
  candle?: { seconds: number; onGutter: () => void } | undefined;
}) {
  const { sheet, openSheet, seenRooms } = useGame();
  const holder = engine.patienceHolderPerson(props.c, props.p);
  useThemeColor(PALACE_BG);
  // The candle is lit only once the guide, if any, has been read.
  const guiding = needsGuide(props.kind, seenRooms);
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (props.struck > 0) setShake(true);
  }, [props.struck]);
  return (
    <div className={`palace ${props.leaving ? "leaving" : ""}`} data-testid="palace">
      <div className="palace-lines" />
      <div className="palace-inner">
        <div className="header">
          <button className="icon-btn" aria-label="Notebook" onClick={() => openSheet("notebook")}>
            <Notebook />
          </button>
          <div className="title palace-room" style={{ textAlign: "center" }}>
            {props.room}
          </div>
          <PatienceMeter holder={holder.name} kind={holderKind(holder)} patience={props.p.patience} />
        </div>
        {/* The board is never reset by a wrong Declare: the partial answer stays (§9.1). */}
        <div
          className={shake ? "struck" : ""}
          onAnimationEnd={(e) => e.animationName === "struck" && setShake(false)}
          style={{ display: "flex", flexDirection: "column", flex: 1 }}
        >
          <p className="palace-prompt">{props.prompt}</p>
          {props.children}
        </div>
        <button className="link" style={{ marginTop: 14, alignSelf: "center" }} onClick={() => openSheet("casefile")}>
          Open the Case File
        </button>
      </div>
      {props.struck > 0 && <Crack key={props.struck} />}
      {props.candle && !guiding && <Candle seconds={props.candle.seconds} onGutter={props.candle.onGutter} />}
      <RoomGuide room={props.kind} onRead={props.onGuideRead} />
      {/* The Palace's sheets stay inside it, where its dark styles dress them. */}
      <SheetHost.Provider value="inline">
        {sheet === "casefile" && <CaseFile c={props.c} p={props.p} onClose={() => openSheet(null)} />}
        {sheet === "notebook" && <NotebookSheet onClose={() => openSheet(null)} />}
      </SheetHost.Provider>
    </div>
  );
}

/**
 * Shared Declare handling: records the attempt, plays the cue, cracks the
 * glass on a miss, and on a hit lets the Palace collapse before the story
 * resumes.
 */
function useDeclare(meta: { slot: string; variant: string; difficulty?: number; type: string; concepts: ConceptId[] }) {
  const { step, recordAttempt, activeCase } = useGame();
  const [struck, setStruck] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const opened = useRef(Date.now());
  const attempts = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    struck,
    leaving,
    /** Restarts the solve clock, after a room guide has been read. */
    startClock: () => {
      opened.current = Date.now();
    },
    declare: (correct: boolean, timedOut = false) => {
      if (leaving) return;
      attempts.current += 1;
      recordAttempt({
        caseId: activeCase ?? "",
        slot: meta.slot,
        variant: meta.variant,
        ...(meta.difficulty !== undefined ? { difficulty: meta.difficulty } : {}),
        type: meta.type as never,
        concepts: meta.concepts,
        correct,
        attempt: attempts.current,
        ms: Date.now() - opened.current,
        ...(timedOut ? { timedOut } : {}),
        at: Date.now(),
      });
      if (correct) {
        audio.sfx("reveal");
        setLeaving(true);
        timer.current = window.setTimeout(() => step((c, p) => engine.declare(c, p, true)), CLOSE_MS);
      } else {
        audio.sfx("discord");
        setStruck((n) => n + 1);
        step((c, p) => engine.declare(c, p, false));
      }
    },
  };
}

/** A deduction in progress: the scene has frozen and we are in the Palace (§8.1). */
export function DeductionPalace(props: { c: Case; p: CaseProgress }) {
  const { c, p } = props;
  const { unlocked, unlock, settings } = useGame();
  const slot = engine.currentSlot(c, p)!;
  const variant = variantFor(p, slot);
  const puzzle = puzzleFor(p, slot);
  const name = (id: string) => c.cast.find((x) => x.id === id)?.name ?? id;
  const { struck, leaving, declare, startClock } = useDeclare({
    slot: slot.id,
    variant: variant.id,
    difficulty: variant.difficulty,
    type: puzzle.type,
    concepts: variant.concepts,
  });

  // The Notebook glows with whatever this deduction draws on (§10).
  useEffect(() => unlock(variant.concepts), [variant.id, slot.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => audio.music("palace"), []);

  const onDeclare = (correct: boolean) => declare(correct);

  let room: ReactNode;
  switch (puzzle.type) {
    case "flaw":
      room = <FlawRoom puzzle={puzzle} speaker={name(puzzle.speaker)} unlocked={unlocked} onDeclare={onDeclare} />;
      break;
    case "parallel":
      room = <ParallelRoom puzzle={puzzle} speaker={name(puzzle.speaker)} onDeclare={onDeclare} />;
      break;
    case "objection":
      room = <ObjectionRoom puzzle={puzzle} witness={name(puzzle.witness)} onDeclare={onDeclare} />;
      break;
    case "chain":
      room = <ChainRoom puzzle={puzzle} onDeclare={onDeclare} />;
      break;
    case "arrangement":
      room = <ArrangementRoom puzzle={puzzle} onDeclare={onDeclare} />;
      break;
    case "observation":
      room = <ObservationRoom puzzle={puzzle} onDeclare={onDeclare} />;
      break;
    case "missing-link":
      room = <MissingLinkRoom puzzle={puzzle} speaker={name(puzzle.speaker)} onDeclare={onDeclare} />;
      break;
  }

  return (
    // Keyed by variant so a restart's fresh variant starts with a clean board.
    <PalaceFrame
      key={`${slot.id}/${variant.id}`}
      room={ROOM_NAMES[puzzle.type]}
      kind={puzzle.type}
      onGuideRead={startClock}
      prompt={slot.prompt}
      c={c}
      p={p}
      struck={struck}
      leaving={leaving}
      candle={settings.candle && !leaving ? { seconds: candleSeconds(puzzle), onGutter: () => declare(false, true) } : undefined}
    >
      {room}
    </PalaceFrame>
  );
}

export function FinalePalace(props: { c: Case; p: CaseProgress }) {
  const { settings } = useGame();
  const reconstruction = props.c.finale.reconstruction;
  const { struck, leaving, declare, startClock } = useDeclare({ slot: "finale", variant: "a", type: "reconstruction", concepts: [] });
  useEffect(() => audio.music("palace"), []);
  return (
    <PalaceFrame
      room="The Reconstruction"
      kind="reconstruction"
      onGuideRead={startClock}
      prompt="Then let me tell you what happened."
      c={props.c}
      p={props.p}
      struck={struck}
      leaving={leaving}
      candle={
        settings.candle && !leaving
          ? { seconds: candleSeconds({ type: "reconstruction", reconstruction }), onGutter: () => declare(false, true) }
          : undefined
      }
    >
      <ReconstructionRoom reconstruction={reconstruction} onDeclare={(correct) => declare(correct)} />
    </PalaceFrame>
  );
}
