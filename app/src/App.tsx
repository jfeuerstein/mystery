import { Fragment, useEffect, useRef, useState } from "react";
import { audio, AUDIO_MANIFEST } from "./audio/director";
import { allCases, loadSealedCases } from "./content";
import { formatDuration, summarize } from "./engine/ledger";
import { skippableCase } from "./engine/progress";
import { caseById, exportSave, isUnlocked, useGame } from "./engine/store";
import { CaseView } from "./screens/CaseView";
import { ART, Corner, GradeSeal, Ornament, Sheet } from "./ui/common";
import { platesOf } from "./ui/plates";
import { Back, Cog, Ledger as LedgerIcon } from "./ui/icons";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ScreenHeader(props: { title: string; back: () => void; right?: React.ReactNode }) {
  return (
    <div className="header">
      <button className="icon-btn" aria-label="Back" onClick={props.back}>
        <Back />
      </button>
      <div className="title smallcaps" style={{ textAlign: "center" }}>
        {props.title}
      </div>
      {props.right ?? <span className="icon-btn" />}
    </div>
  );
}

function Title() {
  const { go, activeCase, progress, openCase } = useGame();
  const [installed] = useState(isStandalone);
  const p = activeCase ? progress[activeCase] : undefined;
  const resumable = activeCase && p && p.stage.kind !== "account" ? caseById(activeCase) : undefined;
  return (
    <div className="title-screen">
      <div className="title-frame">
        <div className="fog" />
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />
        <div className="smallcaps muted kicker">A Casebook of Deduction</div>
        <h1>
          <span>The Game</span>
          <span>Is Afoot</span>
        </h1>
        <Ornament />
        <div className="epigraph">
          <p style={{ fontStyle: "italic", maxWidth: "20em", margin: "0 auto" }}>
            “You see, but you do not observe. The distinction is clear.”
          </p>
          <p className="smallcaps muted" style={{ marginBottom: 0 }}>
            A Scandal in Bohemia
          </p>
        </div>
      </div>
      <div className="actions">
        {resumable && (
          <button
            className="btn"
            onClick={() => {
              audio.unlock();
              openCase(resumable.id);
            }}
            data-testid="resume"
          >
            Resume: <i>{resumable.title.replace(/^The Adventure of /, "")}</i>
          </button>
        )}
        <button
          className="btn"
          onClick={() => {
            // iOS only allows sound to start from a tap (§15.3).
            audio.unlock();
            go("casebook");
          }}
          data-testid="begin"
        >
          {resumable ? "The Casebook" : "Begin"}
        </button>
        {!installed && (
          <p className="muted" style={{ fontSize: "0.8em", margin: 0, textAlign: "center" }}>
            On iPhone, tap Share, then <i>Add to Home Screen</i>, to play full screen and offline.
          </p>
        )}
      </div>
    </div>
  );
}

const caseLabel = (c: { season: number; number: number }) => (c.season === 0 ? "The sample case" : `Season ${c.season} · No. ${c.number}`);

/** Asks before a case is skipped (decision 28). */
function SkipConfirm(props: { label: string; onSkip: () => void; onKeep: () => void }) {
  return (
    <Sheet onClose={props.onKeep}>
      <div data-testid="skip-confirm">
        <h2 className="display" style={{ margin: "0 0 4px", textAlign: "center" }}>
          Skip this case?
        </h2>
        <p className="muted smallcaps" style={{ textAlign: "center", marginTop: 0 }}>
          {props.label}
        </p>
        <p>The next case will open as though you had closed this one. It is meant for a Casebook whose progress was lost.</p>
        <p>This case stays in the Casebook, to play whenever you like; it earns no grade until you do. Its Notebook entries open now.</p>
        <div className="btn-row" style={{ marginTop: 18 }}>
          <button className="btn" onClick={props.onKeep} data-testid="skip-cancel">
            Keep it
          </button>
          <button className="btn" onClick={props.onSkip} data-testid="skip-ok">
            Skip it
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function Casebook() {
  const { grades, progress, skipped, openCase, skipCase, go } = useGame();
  const [confirming, setConfirming] = useState<string>();
  const skippable = skippableCase(allCases(), grades, skipped);
  return (
    <>
      <div className="header">
        <button className="icon-btn" aria-label="Title" onClick={() => go("title")}>
          <Back />
        </button>
        <div className="title smallcaps" style={{ textAlign: "center" }}>
          The Casebook
        </div>
        <button className="icon-btn" aria-label="Holmes’ Ledger" onClick={() => go("ledger")}>
          <LedgerIcon />
        </button>
        <button className="icon-btn" aria-label="Settings" onClick={() => go("settings")}>
          <Cog />
        </button>
      </div>
      <div className="list page">
        {allCases().map((c, i) => {
          const unlocked = isUnlocked(i, grades, skipped);
          const p = progress[c.id];
          const inProgress = p && p.stage.kind !== "account";
          const grade = grades[c.id];
          const label = caseLabel(c);
          const status = grade
            ? `Best: ${grade}`
            : skipped.includes(c.id)
              ? inProgress
                ? "Skipped · in progress"
                : "Skipped"
              : inProgress
                ? "In progress"
                : unlocked
                  ? "Unopened"
                  : "Opens when the case before it is closed";
          return (
            <Fragment key={c.id}>
              <button
                className={`folder ${unlocked ? "" : "locked"}`}
                style={{ animationDelay: `${i * 70}ms` }}
                disabled={!unlocked}
                onClick={() => openCase(c.id)}
                data-testid={`case-${c.id}`}
              >
                <span className="tab">{label}</span>
                {!unlocked && <span className="twine" aria-hidden="true" />}
                <div className="display" style={{ fontSize: "1.2em", paddingRight: grade || !unlocked ? 64 : 0 }}>
                  {/* A sealed case's title stays hidden until it unlocks. */}
                  {unlocked ? c.title : "Sealed"}
                </div>
                <div className="muted" style={{ fontSize: "0.9em", fontStyle: "italic" }}>
                  {status}
                </div>
                {grade && <GradeSeal grade={grade} />}
                {!unlocked && <span className="stamp">SEALED</span>}
              </button>
              {c.id === skippable && (
                <button
                  className="link skip-case"
                  style={{ animationDelay: `${i * 70 + 120}ms` }}
                  onClick={() => setConfirming(c.id)}
                  data-testid="skip-case"
                >
                  Skip this case
                </button>
              )}
            </Fragment>
          );
        })}
        <p className="muted" style={{ textAlign: "center", fontSize: "0.9em", fontStyle: "italic" }}>
          {allCases().length === 1 ? "New cases will appear here, one at a time." : "Cases open one at a time, in order."}
        </p>
      </div>
      {confirming && (
        <SkipConfirm
          label={caseLabel(caseById(confirming))}
          onKeep={() => setConfirming(undefined)}
          onSkip={() => {
            skipCase(confirming);
            setConfirming(undefined);
          }}
        />
      )}
    </>
  );
}

function Toggle(props: { on: boolean; onChange: (on: boolean) => void; label: string; hint: string }) {
  return (
    <button className="toggle" aria-pressed={props.on} onClick={() => props.onChange(!props.on)}>
      <span>
        <span style={{ display: "block" }}>{props.label}</span>
        <span className="muted" style={{ fontSize: "0.85em", fontStyle: "italic" }}>
          {props.hint}
        </span>
      </span>
      <span className="switch" />
    </button>
  );
}

function Settings() {
  const { settings, setSettings, go, resetProgress, importSave } = useGame();
  const fileInput = useRef<HTMLInputElement>(null);
  const download = () => {
    const blob = new Blob([exportSave()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afoot-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <ScreenHeader title="Settings" back={() => go("casebook")} />
      <div className="list page">
        <div className="card">
          <Toggle
            on={settings.candle}
            onChange={(candle) => setSettings({ candle })}
            label="By Candlelight"
            hint="A candle burns down while Holmes thinks. If it gutters, his patience costs a point."
          />
        </div>
        <div className="card">
          <div className="smallcaps muted">Music</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.music}
            style={{ "--fill": `${settings.music * 100}%` } as React.CSSProperties}
            onChange={(e) => setSettings({ music: Number(e.target.value) })}
            aria-label="Music volume"
          />
          <div className="smallcaps muted" style={{ marginTop: 8 }}>
            Sound
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.sfx}
            style={{ "--fill": `${settings.sfx * 100}%` } as React.CSSProperties}
            onChange={(e) => {
              setSettings({ sfx: Number(e.target.value) });
              audio.sfx("pluck");
            }}
            aria-label="Sound effects volume"
          />
        </div>
        <div className="card">
          <div className="smallcaps muted">Text size</div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            {(["normal", "large"] as const).map((t) => (
              <button key={t} className={`chip ${settings.textSize === t ? "selected" : ""}`} onClick={() => setSettings({ textSize: t })}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="smallcaps muted">Your save</div>
          <p style={{ margin: "6px 0 10px" }}>Safari can clear a website’s data. Export your save to the Files app now and then.</p>
          <div className="list">
            <button className="btn" onClick={download}>
              Export save
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Import save
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (!importSave(JSON.parse(await file.text()))) alert("That file isn’t a save from this game.");
                } catch {
                  alert("That file couldn’t be read.");
                }
              }}
            />
            <button
              className="btn"
              onClick={() => {
                if (confirm("Erase all progress? This can’t be undone.")) resetProgress();
              }}
            >
              Erase all progress
            </button>
          </div>
        </div>
        <button className="link" style={{ justifySelf: "center", margin: "6px 0 12px" }} onClick={() => go("credits")}>
          Credits: the engravings and music
        </button>
      </div>
    </>
  );
}

/** Holmes' Ledger (§12): how each line of reasoning is going. Concepts only, by their Notebook names. */
function LedgerScreen() {
  const { stats, go } = useGame();
  const rows = summarize(stats);
  return (
    <>
      <ScreenHeader title="Holmes’ Ledger" back={() => go("casebook")} />
      <div className="page">
        <p className="muted" style={{ fontStyle: "italic", marginTop: 0 }}>
          “I have a turn both for observation and for deduction.” How each has fared, by the Notebook’s reckoning:
        </p>
        {rows.length === 0 ? (
          <p className="muted">Nothing entered yet. Solve a deduction and it will be recorded here.</p>
        ) : (
          rows.map((r, i) => (
            <div key={r.concept} className="ledger-row ink-in" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="display">{r.title}</span>
              <div className="ledger-bar">
                <span style={{ width: `${r.firstTry * 100}%`, animationDelay: `${200 + i * 50}ms` }} />
              </div>
              <span className="ledger-note">
                {Math.round(r.firstTry * r.faced)} of {r.faced} at the first declaration
                {r.medianMs !== undefined && ` · typically ${formatDuration(r.medianMs)}`}
              </span>
            </div>
          ))
        )}
        {rows.length > 0 && (
          <p className="muted" style={{ fontSize: "0.85em", fontStyle: "italic", marginTop: 14 }}>
            The bar is the share of deductions solved at the first declaration; the time is the median to a right answer.
          </p>
        )}
      </div>
    </>
  );
}

/** Works grouped by artist: "Sidney Paget — The Naval Treaty (1893), …". */
function byAuthor(credits: { title: string; author: string; date?: string }[]) {
  const groups = new Map<string, Map<string, string | undefined>>();
  for (const c of credits) {
    const works = groups.get(c.author) ?? new Map<string, string | undefined>();
    works.set(c.title, c.date);
    groups.set(c.author, works);
  }
  return [...groups.entries()].sort((a, b) => b[1].size - a[1].size);
}

/** Recordings grouped by where they came from, so one sample library is credited once. */
function soundGroups(credits: { title: string; author: string; source: string; license: string }[]) {
  const groups = new Map<string, { key: string; author: string; source: string; license: string; titles: string[] }>();
  for (const c of credits) {
    const key = `${c.author}|${c.source}|${c.license}`;
    const g = groups.get(key) ?? { key, author: c.author, source: c.source, license: c.license, titles: [] };
    if (!g.titles.includes(c.title)) g.titles.push(c.title);
    groups.set(key, g);
  }
  return groups;
}

function Credits() {
  const { go } = useGame();
  // Every plate, each subject's variants included.
  const art = ART.flatMap((a) =>
    platesOf(a).flatMap((plate) => (plate.credit ? [{ key: plate.file, description: a.description, credit: plate.credit }] : [])),
  );
  const sounds = [...Object.entries(AUDIO_MANIFEST.music), ...Object.entries(AUDIO_MANIFEST.sfx)].filter(([, e]) => e) as [
    string,
    NonNullable<(typeof AUDIO_MANIFEST.music)["theme"]>,
  ][];
  return (
    <>
      <ScreenHeader title="Credits" back={() => go("settings")} />
      <div className="page prose credits">
        <p>
          Stories after Sir Arthur Conan Doyle; cases written and verified by machine. Every engraving is in the public
          domain, and every recording is in the public domain or free of all restriction.
        </p>
        <Ornament />
        <h3 className="smallcaps">Engravings</h3>
        {art.length === 0 ? (
          <p className="muted">Placeholder plates, until the engravings are sourced.</p>
        ) : (
          <>
            {byAuthor(art.map((a) => a.credit)).map(([author, works]) => (
              <p key={author} className="credit-group">
                <span className="smallcaps">{author}</span>:{" "}
                {[...works.entries()].map(([title, date], i) => (
                  <span key={title}>
                    {i > 0 && ", "}
                    <i>{title}</i>
                    {date && ` (${date})`}
                  </span>
                ))}
                .
              </p>
            ))}
            <details className="credit-list">
              <summary className="smallcaps">Every plate and its source</summary>
              <ul>
                {art.map((a) => (
                  <li key={a.key}>
                    {a.description}{" "}
                    <a href={a.credit.source} target="_blank" rel="noreferrer">
                      {a.credit.license}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
        <h3 className="smallcaps">Music and sound</h3>
        {sounds.length === 0 ? (
          <p className="muted">Silence, until the recordings are sourced.</p>
        ) : (
          <ul className="credit-list">
            {[...soundGroups(sounds.map(([, e]) => e.credit)).values()].map((g) => (
              <li key={g.key}>
                {g.titles.map((t, i) => (
                  <span key={t}>
                    {i > 0 && "; "}
                    <i>{t}</i>
                  </span>
                ))}
                . {g.author}.{" "}
                <a href={g.source} target="_blank" rel="noreferrer">
                  {g.license}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function App() {
  const { hydrated, screen, activeCase, progress, settings } = useGame();
  const [casesReady, setCasesReady] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.text = settings.textSize;
  }, [settings.textSize]);

  useEffect(() => {
    audio.setVolumes(settings.music, settings.sfx);
  }, [settings.music, settings.sfx]);

  useEffect(() => {
    void loadSealedCases().finally(() => setCasesReady(true));
  }, []);

  useEffect(() => {
    if (screen !== "case") audio.music("theme");
  }, [screen]);

  if (!hydrated || !casesReady) return <div className="app" />;

  let body: React.ReactNode;
  const p = activeCase ? progress[activeCase] : undefined;
  if (screen === "case" && activeCase && p) body = <CaseView c={caseById(activeCase)} p={p} />;
  else if (screen === "settings") body = <Settings />;
  else if (screen === "ledger") body = <LedgerScreen />;
  else if (screen === "credits") body = <Credits />;
  else if (screen === "casebook" || screen === "case") body = <Casebook />;
  else body = <Title />;

  return (
    <div className="app" key={screen}>
      {body}
    </div>
  );
}
