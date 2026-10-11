import { useEffect, useRef, useState } from "react";
import { allCases, loadSealedCases } from "./content";
import { caseById, exportSave, isUnlocked, useGame } from "./engine/store";
import { CaseView } from "./screens/CaseView";
import { Fleuron } from "./ui/common";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function Title() {
  const { go, activeCase, progress, openCase } = useGame();
  const [installed] = useState(isStandalone);
  const p = activeCase ? progress[activeCase] : undefined;
  const resumable = activeCase && p && p.stage.kind !== "account" ? caseById(activeCase) : undefined;
  return (
    <div className="stage" style={{ justifyContent: "center", textAlign: "center" }}>
      <div className="stage-body" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="smallcaps muted">A Casebook of Deduction</div>
        <h1 className="display" style={{ fontSize: "2.6em", lineHeight: 1.05, margin: "12px 0" }}>
          The Game
          <br />
          Is Afoot
        </h1>
        <Fleuron />
        <p style={{ fontStyle: "italic", maxWidth: "22em", margin: "0 auto" }}>
          "You see, but you do not observe. The distinction is clear."
        </p>
        <p className="smallcaps muted">A Scandal in Bohemia</p>
      </div>
      <div className="actions">
        {resumable && (
          <button className="btn" onClick={() => openCase(resumable.id)} data-testid="resume">
            Resume: <i>{resumable.title.replace(/^The Adventure of /, "")}</i>
          </button>
        )}
        <button className="btn" onClick={() => go("casebook")} data-testid="begin">
          {resumable ? "The Casebook" : "Begin"}
        </button>
        {!installed && (
          <p className="muted" style={{ fontSize: "0.8em", margin: 0 }}>
            On iPhone, tap Share, then <i>Add to Home Screen</i>, to play full screen and offline.
          </p>
        )}
      </div>
    </div>
  );
}

function Casebook() {
  const { grades, progress, openCase, go } = useGame();
  return (
    <>
      <div className="header">
        <button className="icon-btn" aria-label="Title" onClick={() => go("title")}>
          ‹
        </button>
        <div className="title smallcaps" style={{ textAlign: "center" }}>
          The Casebook
        </div>
        <button className="icon-btn smallcaps" onClick={() => go("settings")}>
          Settings
        </button>
      </div>
      <div className="list">
        {allCases().map((c, i) => {
          const unlocked = isUnlocked(i, grades);
          const p = progress[c.id];
          const inProgress = p && p.stage.kind !== "account";
          const label = c.season === 0 ? "The sample case" : `Season ${c.season}, case ${c.number}`;
          return (
            <button
              key={c.id}
              className="card"
              style={{ textAlign: "left", opacity: unlocked ? 1 : 0.45 }}
              disabled={!unlocked}
              onClick={() => openCase(c.id)}
              data-testid={`case-${c.id}`}
            >
              <div className="smallcaps muted">{label}</div>
              <div className="display" style={{ fontSize: "1.25em" }}>
                {/* A sealed case's title stays hidden until it unlocks. */}
                {unlocked ? c.title : "Sealed"}
              </div>
              <div className="muted">
                {grades[c.id] ? `Best: ${grades[c.id]}` : inProgress ? "In progress" : unlocked ? "Unopened" : "Locked"}
              </div>
            </button>
          );
        })}
        <p className="muted" style={{ textAlign: "center", fontSize: "0.9em" }}>
          {allCases().length === 1
            ? "Generated seasons will appear here, one case at a time."
            : "Cases open one at a time, in order."}
        </p>
      </div>
    </>
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
      <div className="header">
        <button className="icon-btn" aria-label="Back" onClick={() => go("casebook")}>
          ‹
        </button>
        <div className="title smallcaps" style={{ textAlign: "center" }}>
          Settings
        </div>
        <span className="icon-btn" />
      </div>
      <div className="list">
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
          <p style={{ margin: "6px 0 10px" }}>
            Safari can clear a website's data. Export your save to the Files app now and then.
          </p>
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
                  if (!importSave(JSON.parse(await file.text()))) alert("That file isn't a save from this game.");
                } catch {
                  alert("That file couldn't be read.");
                }
              }}
            />
            <button
              className="btn"
              onClick={() => {
                if (confirm("Erase all progress? This can't be undone.")) resetProgress();
              }}
            >
              Erase all progress
            </button>
          </div>
        </div>
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
    void loadSealedCases().finally(() => setCasesReady(true));
  }, []);

  if (!hydrated || !casesReady) return <div className="app" />;

  let body: React.ReactNode;
  const p = activeCase ? progress[activeCase] : undefined;
  if (screen === "case" && activeCase && p) body = <CaseView c={caseById(activeCase)} p={p} />;
  else if (screen === "settings") body = <Settings />;
  else if (screen === "casebook" || screen === "case") body = <Casebook />;
  else body = <Title />;

  return <div className="app">{body}</div>;
}
