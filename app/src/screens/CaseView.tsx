import type { Beat, Case } from "@afoot/schema";
import { useEffect, useMemo, useState } from "react";
import { audio, type MusicCue } from "../audio/director";
import * as engine from "../engine/progress";
import type { CaseProgress } from "../engine/progress";
import { useGame } from "../engine/store";
import { ArtChoice, artFor, artUrl, Engraving, Forward, GradeSeal, Ornament, PatienceMeter, ROMAN, Sheet, useArtChooser, useSettling } from "../ui/common";
import { chooserFor } from "../ui/plates";
import { Back, Folder, holderKind, Lens, Notebook, OpenBook } from "../ui/icons";
import { DeductionPalace, FinalePalace } from "./Palace";
import { CaseFile, NotebookSheet, StorySheet } from "./Sheets";

function Header(props: { c: Case; p: CaseProgress; title: string; inert: boolean }) {
  const { go, openSheet } = useGame();
  const holder = engine.patienceHolderPerson(props.c, props.p);
  return (
    // Behind the Mind Palace the scene is frozen: nothing in it can be reached.
    <div className="header" inert={props.inert}>
      <button className="icon-btn" aria-label="Casebook" onClick={() => go("casebook")}>
        <Back />
      </button>
      <div className="title smallcaps">{props.title}</div>
      <button className="icon-btn" onClick={() => openSheet("story")} aria-label="The story so far" data-testid="open-story">
        <OpenBook />
      </button>
      <button className="icon-btn" onClick={() => openSheet("notebook")} aria-label="Notebook">
        <Notebook />
      </button>
      <PatienceMeter holder={holder.name} kind={holderKind(holder)} patience={props.p.patience} />
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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Folder size={18} /> Case File
      </span>
    </button>
  );
}

function ChapterHead(props: { number: number; title: string }) {
  return (
    <div className="chapter-head">
      <div className="chapter-number">CHAPTER {ROMAN[props.number]}</div>
      <h2>{props.title}</h2>
      <Ornament />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Narration(props: {
  c: Case;
  p: CaseProgress;
  beat: Extract<Beat, { kind: "narration" }>;
  chapter?: { number: number; title: string } | undefined;
}) {
  const { step } = useGame();
  const phase = props.p.stage.kind === "chapter" && props.p.stage.phase.kind === "narration" ? props.p.stage.phase : null;
  const paragraph = phase?.paragraph ?? 0;
  const shown = props.beat.paragraphs.slice(0, paragraph + 1);
  const last = paragraph >= props.beat.paragraphs.length - 1;
  const settling = useSettling(paragraph);
  const turn = () => {
    if (last) audio.sfx("page");
    step(engine.nextParagraph);
  };
  return (
    <div
      className="stage page"
      // A tap anywhere reads on; leaving the page takes the button itself.
      onClick={() => {
        if (!last && !settling) turn();
      }}
      data-testid="narration"
    >
      <div className="stage-body prose">
        {props.chapter && <ChapterHead {...props.chapter} />}
        {props.beat.art && <Engraving tag={props.beat.art.tag} height={190} />}
        {shown.map((text, i) => (
          <p key={i} className={props.chapter && i === 0 ? "dropcap" : ""}>
            {text}
          </p>
        ))}
      </div>
      <Actions>
        <Forward settleKey={paragraph} onClick={turn}>
          {last ? "Continue" : "Read on"}
        </Forward>
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
  const ready = engine.canAdvance(props.c, props.p);
  const choose = useArtChooser();
  return (
    <div className="stage page">
      <div className="stage-body">
        <Engraving tag={subject?.portrait.tag ?? "portrait"} owner={subject?.id} height={250} />
        <p className="muted" style={{ textAlign: "center", margin: "0 0 12px", fontStyle: "italic" }}>
          You see, but do you observe? Examine {subject?.name ?? "them"} closely.
        </p>
        <div className="observe-grid">
          {props.beat.details.map((d, i) => {
            const done = phase?.inspected.includes(d.id);
            const art = choose(d.vignette.tag, d.id);
            return (
              <button
                key={d.id}
                className={`lens ${done ? "done" : ""}`}
                style={{ animationDelay: `${i * 90}ms` }}
                aria-label={`Detail ${i + 1}`}
                data-testid={`detail-${d.id}`}
                onClick={() => {
                  if (!done) audio.sfx("pluck");
                  step((c, p) => engine.inspect(c, p, d.id));
                  setOpen(d.id);
                }}
              >
                {art?.file && !done ? (
                  <img className="lens-plate" src={artUrl(art.file)} alt="" />
                ) : done ? (
                  "✓"
                ) : (
                  <Lens size={28} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <Actions>
        <CaseFileButton />
        <Forward disabled={!ready} settleKey={ready} onClick={() => step(engine.advance)}>
          {ready ? "Continue" : `${phase?.inspected.length ?? 0} of ${props.beat.details.length} observed`}
        </Forward>
      </Actions>
      {detail && (
        <Sheet onClose={() => setOpen(undefined)}>
          <Engraving tag={detail.vignette.tag} owner={detail.id} height={170} caption={false} />
          <p style={{ fontStyle: "italic" }}>{detail.text}</p>
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
  const ready = engine.canAdvance(props.c, props.p);
  const choose = useArtChooser();
  return (
    <div className="stage page">
      <div className="stage-body">
        <div className="smallcaps muted" style={{ textAlign: "center", marginBottom: 10 }}>
          {location?.name} · {found} of {props.beat.hotspots.length} found
        </div>
        <Engraving tag={location?.scene.tag ?? "scene"} owner={location?.id} className="scene" caption={false}>
          {props.beat.hotspots.map((id) => {
            const e = evidence(id);
            const spot = e?.hotspot ?? { x: 0.5, y: 0.5, r: 0.08 };
            const done = phase?.found.includes(id);
            // An engraved object is its own tap target; without one, a faint lens-mark.
            const art = e ? choose(e.vignette.tag, e.id) : undefined;
            return (
              <button
                key={id}
                className={`hotspot ${art?.file ? "object" : "mark"} ${done ? "found" : ""}`}
                style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, width: `${spot.r * 200}%`, aspectRatio: "1" }}
                aria-label={done ? e?.name : "Something here"}
                data-testid={`hotspot-${id}`}
                onClick={() => {
                  if (!done) audio.sfx("pluck");
                  step((c, p) => engine.find(c, p, id));
                  setOpen(id);
                }}
              >
                {art?.file && <img src={artUrl(art.file)} alt="" draggable={false} />}
                {done && <span className="tick">✓</span>}
              </button>
            );
          })}
        </Engraving>
      </div>
      <Actions>
        <CaseFileButton />
        <Forward disabled={!ready} settleKey={ready} onClick={() => step(engine.advance)}>
          {ready ? "Continue" : "Search the room"}
        </Forward>
      </Actions>
      {card && (
        <Sheet onClose={() => setOpen(undefined)}>
          <Engraving tag={card.vignette.tag} owner={card.id} height={170} caption={false} />
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
  const ready = engine.canAdvance(props.c, props.p);
  return (
    <div className="stage page">
      <div className="stage-body">
        <Engraving tag={witness?.portrait.tag ?? "portrait"} owner={witness?.id} height={200} />
        {open ? (
          <div className="prose" key={open.id}>
            {open.sentences.map((s) => (
              <p key={s.id} className="speech">
                “{s.text}”
              </p>
            ))}
            <div className="speaker">{witness?.name}</div>
          </div>
        ) : (
          <p className="muted" style={{ textAlign: "center", fontStyle: "italic" }}>
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
        <Forward disabled={!ready} settleKey={ready} onClick={() => step(engine.advance)}>
          {ready ? "Continue" : "Ask about everything"}
        </Forward>
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
      <div className="stage returning">
        <div className="stage-body prose holmes-speaks" data-testid="holmes-speaks">
          <Ornament />
          <p>{props.beat.slot.onSolved.holmesSpeaks}</p>
        </div>
        <Actions>
          <Forward onClick={() => step(engine.advance)}>Continue</Forward>
        </Actions>
      </div>
    );
  }
  return (
    <div className="stage page">
      <div className="stage-body prose">
        <Ornament />
        <p style={{ fontStyle: "italic", textAlign: "center" }}>{props.beat.slot.prompt}</p>
      </div>
      <Actions>
        <CaseFileButton />
        <Forward onClick={() => step((_, p) => engine.enterPalace(p))} testid="enter-palace">
          Enter the Mind Palace
        </Forward>
      </Actions>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Cold(props: { c: Case; p: CaseProgress; finale: boolean }) {
  const { step } = useGame();
  const holder = engine.patienceHolder(props.c, props.p);
  return (
    <div className="stage page">
      <div className="stage-body prose" style={{ textAlign: "center" }}>
        <Ornament />
        <h2 className="display" style={{ fontWeight: 400 }}>
          The case has gone cold
        </h2>
        <p style={{ textAlign: "center" }}>
          {holder} has lost all patience. “I have heard enough theories for one day, Mr. Holmes,” and with that the door
          closes.
        </p>
        <p className="muted" style={{ textAlign: "center" }}>
          {props.finale ? "Begin the finale again." : "The chapter begins again. Some of what you face may have changed."}
        </p>
      </div>
      <Actions>
        <Forward testid="restart" onClick={() => step((c, p) => (props.finale ? engine.restartFinale(p) : engine.restartChapter(c, p)))}>
          Begin again
        </Forward>
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
      <div className="stage returning">
        <div className="stage-body prose" data-testid="solution">
          <Ornament />
          {c.finale.solution.map((t, i) => (
            <p key={i} style={{ animationDelay: `${i * 160}ms` }}>
              {t}
            </p>
          ))}
        </div>
        <Actions>
          <Forward onClick={() => step((_, pp) => engine.finish(pp))}>Continue</Forward>
        </Actions>
      </div>
    );
  }
  if (p.stage.kind === "account") {
    const g = engine.grade(p);
    return (
      <div className="stage page">
        <div className="stage-body" data-testid="account">
          <h2 className="display" style={{ textAlign: "center", fontWeight: 400, margin: "4px 0 14px" }}>
            Watson’s Account
          </h2>
          <div className="letter prose">
            <p className="dropcap">{c.account[g]}</p>
            <p className="smallcaps muted" style={{ textAlign: "left", margin: 0 }}>
              — J. H. W.
            </p>
            <GradeSeal grade={g} stamped />
          </div>
          <p className="smallcaps" style={{ textAlign: "center", marginTop: 18 }} data-testid="grade">
            {g}
          </p>
          <p className="muted" style={{ textAlign: "center" }}>
            {p.wrong} wrong {p.wrong === 1 ? "declaration" : "declarations"}, {p.restarts}{" "}
            {p.restarts === 1 ? "restart" : "restarts"}
          </p>
        </div>
        <Actions>
          <Forward
            onClick={() => {
              audio.sfx("seal");
              completeCase();
            }}
          >
            Close the case
          </Forward>
        </Actions>
      </div>
    );
  }
  return (
    <div className="stage page">
      <div className="stage-body prose">
        <div className="chapter-head">
          <div className="chapter-number">THE FINALE</div>
          <Ornament />
        </div>
        {c.finale.intro.map((t, i) => (
          <p key={i} className={i === 0 ? "dropcap" : ""}>
            {t}
          </p>
        ))}
      </div>
      <Actions>
        <CaseFileButton />
        <Forward onClick={() => step((_, pp) => engine.enterPalace(pp))} testid="enter-palace">
          Enter the Mind Palace
        </Forward>
      </Actions>
    </div>
  );
}

// ---------------------------------------------------------------------------

function musicFor(p: CaseProgress): MusicCue {
  if (p.stage.kind === "finale" || p.stage.kind === "account" || p.stage.kind === "finale-cold") return "finale";
  return "investigation";
}

export function CaseView(props: { c: Case; p: CaseProgress }) {
  const { c, p } = props;
  const { sheet, openSheet } = useGame();
  const s = p.stage;
  const cue = musicFor(p);
  // One plate per tag for the whole case, different plates for people who share one.
  const choose = useMemo(() => chooserFor(c, artFor), [c]);
  const inPalace =
    (s.kind === "chapter" && s.phase.kind === "deduction" && s.phase.step === "palace") ||
    (s.kind === "finale" && s.step === "palace");

  useEffect(() => {
    if (!inPalace) audio.music(cue);
  }, [cue, inPalace]);

  let title = c.title;
  let body: React.ReactNode;
  if (s.kind === "chapter") {
    const chapter = c.chapters[s.chapter]!;
    title = `${ROMAN[s.chapter]}. ${chapter.title}`;
    const beat = chapter.beats[s.beat]!;
    const key = `${s.chapter}/${s.beat}`;
    switch (beat.kind) {
      case "narration":
        body = (
          <Narration key={key} c={c} p={p} beat={beat} chapter={s.beat === 0 ? { number: s.chapter, title: chapter.title } : undefined} />
        );
        break;
      case "observe":
        body = <Observe key={key} c={c} p={p} beat={beat} />;
        break;
      case "examine":
        body = <Examine key={key} c={c} p={p} beat={beat} />;
        break;
      case "interrogate":
        body = <Interrogate key={key} c={c} p={p} beat={beat} />;
        break;
      case "deduction":
        body = <Deduction key={key} c={c} p={p} beat={beat} />;
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
    body = <Finale key={s.kind === "finale" ? s.step : s.kind} c={c} p={p} />;
  }

  return (
    <ArtChoice.Provider value={choose}>
      <Header c={c} p={p} title={title} inert={inPalace} />
      {body}
      {!inPalace && sheet === "casefile" && <CaseFile c={c} p={p} onClose={() => openSheet(null)} />}
      {!inPalace && sheet === "notebook" && <NotebookSheet onClose={() => openSheet(null)} />}
      {!inPalace && sheet === "story" && <StorySheet c={c} p={p} onClose={() => openSheet(null)} />}
    </ArtChoice.Provider>
  );
}
