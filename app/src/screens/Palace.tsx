import type { Case } from "@afoot/schema";
import { useEffect, useState, type ReactNode } from "react";
import * as engine from "../engine/progress";
import { patienceHolder, puzzleFor, variantFor, type CaseProgress } from "../engine/progress";
import { useGame } from "../engine/store";
import { ArrangementRoom, ChainRoom, FlawRoom, ObjectionRoom, ObservationRoom, ReconstructionRoom } from "../palace/rooms";
import { PatienceMeter } from "../ui/common";
import { CaseFile, NotebookSheet } from "./Sheets";

const ROOM_NAMES = {
  flaw: "Gallery of Testimony",
  objection: "Gallery of Testimony",
  chain: "Chain Hall",
  arrangement: "Map Room",
  observation: "Evidence Room",
} as const;

function PalaceFrame(props: {
  room: string;
  prompt: string;
  c: Case;
  p: CaseProgress;
  children: ReactNode;
  struck: boolean;
  onStruckEnd: () => void;
}) {
  const { sheet, openSheet } = useGame();
  return (
    <div className="palace" data-testid="palace">
      <div className="palace-inner">
        <div className="header">
          <button className="icon-btn" aria-label="Notebook" onClick={() => openSheet("notebook")}>
            <span className="smallcaps">Notes</span>
          </button>
          <div className="title palace-room" style={{ textAlign: "center" }}>
            {props.room}
          </div>
          <PatienceMeter holder={patienceHolder(props.c, props.p)} patience={props.p.patience} />
        </div>
        {/* The board is never reset by a wrong Declare: the partial answer stays (§9.1). */}
        <div
          className={props.struck ? "struck" : ""}
          onAnimationEnd={props.onStruckEnd}
          style={{ display: "flex", flexDirection: "column", flex: 1 }}
        >
          <p className="palace-prompt">{props.prompt}</p>
          {props.children}
        </div>
        <button className="link" style={{ marginTop: 14, alignSelf: "center" }} onClick={() => openSheet("casefile")}>
          Open the Case File
        </button>
      </div>
      {sheet === "casefile" && <CaseFile c={props.c} p={props.p} onClose={() => openSheet(null)} />}
      {sheet === "notebook" && <NotebookSheet onClose={() => openSheet(null)} />}
    </div>
  );
}

/** A deduction in progress: the scene has frozen and we are in the Palace (§8.1). */
export function DeductionPalace(props: { c: Case; p: CaseProgress }) {
  const { c, p } = props;
  const { step, unlocked, unlock } = useGame();
  const [struck, setStruck] = useState(false);
  const slot = engine.currentSlot(c, p)!;
  const variant = variantFor(p, slot);
  const puzzle = puzzleFor(p, slot);
  const name = (id: string) => c.cast.find((x) => x.id === id)?.name ?? id;

  // The Notebook glows with whatever this deduction draws on (§10).
  useEffect(() => unlock(variant.concepts), [variant.id, slot.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDeclare = (correct: boolean) => {
    if (!correct) setStruck(true);
    step((cc, pp) => engine.declare(cc, pp, correct));
  };

  let room: ReactNode;
  switch (puzzle.type) {
    case "flaw":
      room = <FlawRoom puzzle={puzzle} speaker={name(puzzle.speaker)} unlocked={unlocked} onDeclare={onDeclare} />;
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
  }

  return (
    // Keyed by variant so a restart's fresh variant starts with a clean board.
    <PalaceFrame key={`${slot.id}/${variant.id}`} room={ROOM_NAMES[puzzle.type]} prompt={slot.prompt} c={c} p={p} struck={struck} onStruckEnd={() => setStruck(false)}>
      {room}
    </PalaceFrame>
  );
}

export function FinalePalace(props: { c: Case; p: CaseProgress }) {
  const { step } = useGame();
  const [struck, setStruck] = useState(false);
  return (
    <PalaceFrame
      room="The Reconstruction"
      prompt="Then let me tell you what happened."
      c={props.c}
      p={props.p}
      struck={struck}
      onStruckEnd={() => setStruck(false)}
    >
      <ReconstructionRoom
        reconstruction={props.c.finale.reconstruction}
        onDeclare={(correct) => {
          if (!correct) setStruck(true);
          step((cc, pp) => engine.declare(cc, pp, correct));
        }}
      />
    </PalaceFrame>
  );
}
