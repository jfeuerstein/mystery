import type { Beat, Case } from "@afoot/schema";
import { useState } from "react";
import * as engine from "../engine/progress";
import type { CaseProgress } from "../engine/progress";
import { useGame } from "../engine/store";
import { Engraving, Fleuron, PatienceMeter, Sheet } from "../ui/common";
import { DeductionPalace, FinalePalace } from "./Palace";
import { CaseFile, NotebookSheet } from "./Sheets";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function Header(props: { c: Case; p: CaseProgress; title: string }) {
  const { go, openSheet } = useGame();
  return (
    <div className="header">
      <button className="icon-btn" aria-label="Casebook" onClick={() => go("casebook")}>
        ‹
      </button>
      <div className="title smallcaps">{props.title}</div>
      <button className="icon-btn smallcaps" onClick={() => openSheet("notebook")} aria-label="Notebook">
        Notes
      </button>
      <PatienceMeter holder={engine.patienceHolder(props.c, props.p)} patience={props.p.patience} />
    </div>
  );
}

function Actions(props: { children: React.ReactNode }) {
  return <div className="actions">{props.children}</div>;
}

function CaseFileButton() {
  const { openSheet } = useGame();
  return (
    <button className="btn" onClick={() => openSheet("casefile")} data-testid="open-casefile">
      ︿ Case File
    </button>
  );
}

// ---------------------------------------------------------------------------

function Narration(props: { c: Case; p: CaseProgress; beat: Extract<Beat, { kind: "narration" }>; first: boolean }) {
  const { step } = useGame();
  const phase = props.p.stage.kind === "chapter" && props.p.stage.phase.kind === "narration" ? props.p.stage.phase : null;
  const shown = props.beat.paragraphs.slice(0, (phase?.paragraph ?? 0) + 1);
  const last = (phase?.paragraph ?? 0) >= props.beat.paragraphs.length - 1;
  return (
    <div className="stage" onClick={() => step(engine.nextParagraph)} data-testid="narration">
      <div className="stage-body prose">
        {props.beat.art && <Engraving tag={props.beat.art.tag} height={180} />}
        {shown.map((text, i) => (
          <p key={i} className={props.first && i === 0 ? "dropcap" : ""}>
            {text}
          </p>
        ))}
      </div>
      <Actions>
        <button className="btn" data-testid="continue">
          {last ? "Continue" : "Read on"}
        </button>
      </Actions>
    </div>
  );
}

function Observe(props: { c: Case; p: CaseProgress; beat: Extract<Beat, { kind: "observe" }> }) {
  const { step } = useGame();
  const [open, setOpen] = useState<string>();
  const phase = props.p.stage.kind === "chapter" && props.p.stage.phase.kind === "observe" ? props.p.stage.phase : null;
  const subject = props.c.cast.find((x) => x.id === props.beat.subject);
  const detail = props.beat.details.find((d) => d.id === open);
  return (
    <div className="stage">
      <div className="stage-body">
        <Engraving tag={subject?.portrait.tag ?? "portrait"} height={220} />
        <p className="muted" style={{ textAlign: "center", margin: "0 0 12px" }}>
          You see, but do you observe? Examine {subject?.name ?? "them"} closely.
        </p>
        <div className="observe-grid">
          {props.beat.details.map((d, i) => {
            const done = phase?.inspected.includes(d.id);
            return (
              <button
                key={d.id}
                className={`lens ${done ? "done" : ""}`}
                aria-label={`Detail ${i + 1}`}
                data-testid={`detail-${d.id}`}
                onClick={() => {
                  step((c, p) => engine.inspect(c, p, d.id));
                  setOpen(d.id);
                }}
              >
                {done ? "✓" : "⌕"}
              </button>
            );
          })}
        </div>
      </div>
      <Actions>
        <CaseFileButton />
        <button
          className="btn"
          disabled={!engine.canAdvance(props.c, props.p)}
          onClick={() => step(engine.advance)}
          data-testid="continue"
        >
          {engine.canAdvance(props.c, props.p) ? "Continue" : `${phase?.inspected.length ?? 0} of ${props.beat.details.length} observed`}
        </button>
      </Actions>
      {detail && (
        <Sheet onClose={() => setOpen(undefined)}>
          <Engraving tag={detail.vignette.tag} height={160} />
          <p>{detail.text}</p>
          <button className="btn" onClick={() => setOpen(undefined)} data-testid="close-detail">
            Noted
          </button>
        </Sheet>
      )}
    </div>
  );
}

function Examine(props: { c: Case; p: CaseProgress; beat: Extract<Beat, { kind: "examine" }> }) {
  const { step } = useGame();
  const [open, setOpen] = useState<string>();
  const phase = props.p.stage.kind === "chapter" && props.p.stage.phase.kind === "examine" ? props.p.stage.phase : null;
  const location = props.c.locations.find((l) => l.id === props.beat.location);
  const evidence = (id: string) => props.c.evidence.find((e) => e.id === id);
  const card = open ? evidence(open) : undefined;
  const found = phase?.found.length ?? 0;
  return (
    <div className="stage">
      <div className="stage-body">
        <div className="smallcaps muted" style={{ textAlign: "center", marginBottom: 8 }}>
          {location?.name}: {found} of {props.beat.hotspots.length} found
        </div>
        <Engraving tag={location?.scene.tag ?? "scene"} className="scene">
          {props.beat.hotspots.map((id) => {
            const e = evidence(id);
            const spot = e?.hotspot ?? { x: 0.5, y: 0.5, r: 0.08 };
            const done = phase?.found.includes(id);
            return (
              <button
                key={id}
                className={`hotspot ${done ? "found" : ""}`}
                style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, width: `${spot.r * 200}%`, aspectRatio: "1" }}
                aria-label={done ? e?.name : "Something here"}
                data-testid={`hotspot-${id}`}
                onClick={() => {
                  step((c, p) => engine.find(c, p, id));
                  setOpen(id);
                }}
              >
                {done ? "✓" : ""}
              </button>
            );
          })}
        </Engraving>
      </div>
      <Actions>
        <CaseFileButton />
        <button
          className="btn"
          disabled={!engine.canAdvance(props.c, props.p)}
          onClick={() => step(engine.advance)}
          data-testid="continue"
        >
          {engine.canAdvance(props.c, props.p) ? "Continue" : "Search the room"}
        </button>
      </Actions>
      {card && (
        <Sheet onClose={() => setOpen(undefined)}>
          <Engraving tag={card.vignette.tag} height={160} />
          <h3 className="display" style={{ margin: "0 0 6px" }}>
            {card.name}
          </h3>
          <p>{card.description}</p>
          <button className="btn" onClick={() => setOpen(undefined)} data-testid="close-detail">
            Into the Case File
          </button>
        </Sheet>
      )}
    </div>
  );
}

function Interrogate(props: { c: Case; p: CaseProgress; beat: Extract<Beat, { kind: "interrogate" }> }) {
  const { step } = useGame();
  const phase = props.p.stage.kind === "chapter" && props.p.stage.phase.kind === "interrogate" ? props.p.stage.phase : null;
  const witness = props.c.cast.find((x) => x.id === props.beat.witness);
  const topics = engine.availableTopics(props.c, props.p);
  const open = props.beat.topics.find((t) => t.id === phase?.open);
  return (
    <div className="stage">
      <div className="stage-body">
        <Engraving tag={witness?.portrait.tag ?? "portrait"} height={170} />
        {open ? (
          <div className="prose">
            {open.sentences.map((s) => (
              <p key={s.id} className="speech">
                "{s.text}"
              </p>
            ))}
            <div className="speaker">{witness?.name}</div>
          </div>
        ) : (
          <p className="muted" style={{ textAlign: "center" }}>
            {witness?.name}, {witness?.role}. What will you ask?
          </p>
        )}
        <div className="list" style={{ marginTop: 14 }}>
          {topics.map((t) => (
            <button
              key={t.id}
              className={`chip ${phase?.asked.includes(t.id) ? "" : "selected"}`}
              style={{ justifySelf: "start" }}
              onClick={() => step((c, p) => engine.ask(c, p, t.id))}
              data-testid={`topic-${t.id}`}
            >
              Ask: {t.label}
            </button>
          ))}
        </div>
      </div>
      <Actions>
        <CaseFileButton />
        <button
          className="btn"
          disabled={!engine.canAdvance(props.c, props.p)}
          onClick={() => step(engine.advance)}
          data-testid="continue"
        >
          {engine.canAdvance(props.c, props.p) ? "Continue" : "Ask about everything"}
        </button>
      </Actions>
    </div>
  );
}

function Deduction(props: { c: Case; p: CaseProgress; beat: Extract<Beat, { kind: "deduction" }> }) {
  const { step } = useGame();
  const phase = props.p.stage.kind === "chapter" && props.p.stage.phase.kind === "deduction" ? props.p.stage.phase : null;
  if (phase?.step === "palace") return <DeductionPalace c={props.c} p={props.p} />;
  if (phase?.step === "speaks") {
    return (
      <div className="stage">
        <div className="stage-body prose" data-testid="holmes-speaks">
          <Fleuron />
          <p>{props.beat.slot.onSolved.holmesSpeaks}</p>
        </div>
        <Actions>
          <button className="btn" onClick={() => step(engine.advance)} data-testid="continue">
            Continue
          </button>
        </Actions>
      </div>
    );
  }
  return (
    <div className="stage">
      <div className="stage-body prose">
        <Fleuron />
        <p style={{ fontStyle: "italic", textAlign: "center" }}>{props.beat.slot.prompt}</p>
      </div>
      <Actions>
        <CaseFileButton />
        <button className="btn" onClick={() => step((_, p) => engine.enterPalace(p))} data-testid="enter-palace">
          Enter the Mind Palace
        </button>
      </Actions>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Cold(props: { c: Case; p: CaseProgress; finale: boolean }) {
  const { step } = useGame();
  const holder = engine.patienceHolder(props.c, props.p);
  return (
    <div className="stage">
      <div className="stage-body prose" style={{ textAlign: "center" }}>
        <Fleuron />
        <h2 className="display">The case has gone cold</h2>
        <p>
          {holder} has lost all patience. "I have heard enough theories for one day, Mr. Holmes," and with that the
          door closes.
        </p>
        <p className="muted">
          {props.finale ? "Begin the finale again." : "The chapter begins again. Some of what you face may have changed."}
        </p>
      </div>
      <Actions>
        <button
          className="btn"
          data-testid="restart"
          onClick={() => step((c, p) => (props.finale ? engine.restartFinale(p) : engine.restartChapter(c, p)))}
        >
          Begin again
        </button>
      </Actions>
    </div>
  );
}

function Finale(props: { c: Case; p: CaseProgress }) {
  const { step, completeCase } = useGame();
  const { c, p } = props;
  if (p.stage.kind === "finale" && p.stage.step === "palace") return <FinalePalace c={c} p={p} />;
  if (p.stage.kind === "finale" && p.stage.step === "solution") {
    return (
      <div className="stage">
        <div className="stage-body prose" data-testid="solution">
          <Fleuron />
          {c.finale.solution.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
        <Actions>
          <button className="btn" onClick={() => step((_, pp) => engine.finish(pp))} data-testid="continue">
            Continue
          </button>
        </Actions>
      </div>
    );
  }
  if (p.stage.kind === "account") {
    const g = engine.grade(p);
    return (
      <div className="stage">
        <div className="stage-body prose" data-testid="account">
          <h2 className="display" style={{ textAlign: "center" }}>
            Watson's Account
          </h2>
          <p className="dropcap">{c.account[g]}</p>
          <div className="fleuron">❦</div>
          <p className="smallcaps" style={{ textAlign: "center" }} data-testid="grade">
            {g}
          </p>
          <p className="muted" style={{ textAlign: "center" }}>
            {p.wrong} wrong {p.wrong === 1 ? "declaration" : "declarations"}, {p.restarts}{" "}
            {p.restarts === 1 ? "restart" : "restarts"}
          </p>
        </div>
        <Actions>
          <button className="btn" onClick={completeCase} data-testid="continue">
            Close the case
          </button>
        </Actions>
      </div>
    );
  }
  return (
    <div className="stage">
      <div className="stage-body prose">
        <Fleuron />
        {c.finale.intro.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      <Actions>
        <CaseFileButton />
        <button className="btn" onClick={() => step((_, pp) => engine.enterPalace(pp))} data-testid="enter-palace">
          Enter the Mind Palace
        </button>
      </Actions>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function CaseView(props: { c: Case; p: CaseProgress }) {
  const { c, p } = props;
  const { sheet, openSheet } = useGame();
  const s = p.stage;

  let title = c.title;
  let body: React.ReactNode;
  if (s.kind === "chapter") {
    const chapter = c.chapters[s.chapter]!;
    title = `${ROMAN[s.chapter]}. ${chapter.title}`;
    const beat = chapter.beats[s.beat]!;
    const first = s.beat === 0;
    switch (beat.kind) {
      case "narration":
        body = <Narration key={`${s.chapter}/${s.beat}`} c={c} p={p} beat={beat} first={first} />;
        break;
      case "observe":
        body = <Observe key={`${s.chapter}/${s.beat}`} c={c} p={p} beat={beat} />;
        break;
      case "examine":
        body = <Examine key={`${s.chapter}/${s.beat}`} c={c} p={p} beat={beat} />;
        break;
      case "interrogate":
        body = <Interrogate key={`${s.chapter}/${s.beat}`} c={c} p={p} beat={beat} />;
        break;
      case "deduction":
        body = <Deduction key={`${s.chapter}/${s.beat}`} c={c} p={p} beat={beat} />;
        break;
    }
  } else if (s.kind === "cold") {
    title = `${ROMAN[s.chapter]}. ${c.chapters[s.chapter]!.title}`;
    body = <Cold c={c} p={p} finale={false} />;
  } else if (s.kind === "finale-cold") {
    title = "The Reconstruction";
    body = <Cold c={c} p={p} finale />;
  } else {
    title = s.kind === "account" ? c.title : "The Reconstruction";
    body = <Finale c={c} p={p} />;
  }

  const inPalace =
    (s.kind === "chapter" && s.phase.kind === "deduction" && s.phase.step === "palace") ||
    (s.kind === "finale" && s.step === "palace");

  return (
    <>
      <Header c={c} p={p} title={title} />
      {body}
      {!inPalace && sheet === "casefile" && <CaseFile c={c} p={p} onClose={() => openSheet(null)} />}
      {!inPalace && sheet === "notebook" && <NotebookSheet onClose={() => openSheet(null)} />}
    </>
  );
}
