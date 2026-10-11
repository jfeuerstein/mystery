import { ENTRIES, entryById, type Case } from "@afoot/schema";
import { useState } from "react";
import type { CaseProgress } from "../engine/progress";
import { useGame } from "../engine/store";
import { Sheet } from "../ui/common";

type Tab = "evidence" | "testimony" | "persons" | "established";

/** The Case File drawer (§6): everything gathered so far. */
export function CaseFile(props: { c: Case; p: CaseProgress; onClose: () => void }) {
  const { c, p } = props;
  const [tab, setTab] = useState<Tab>("evidence");
  const known = new Set(p.known);

  const evidence = c.evidence.filter((e) => known.has(e.id));
  const details = c.chapters.flatMap((ch) =>
    ch.beats.flatMap((b) => (b.kind === "observe" ? b.details.filter((d) => known.has(d.id)) : [])),
  );
  const testimony = c.chapters.flatMap((ch) =>
    ch.beats.flatMap((b) =>
      b.kind === "interrogate"
        ? b.topics.filter((t) => known.has(t.id)).map((t) => ({ witness: b.witness, topic: t }))
        : [],
    ),
  );
  const facts = c.facts.filter((f) => known.has(f.id));
  const name = (id: string) => c.cast.find((x) => x.id === id)?.name ?? id;

  return (
    <Sheet onClose={props.onClose}>
      <h2 className="display" style={{ margin: "0 0 8px", textAlign: "center" }}>
        The Case File
      </h2>
      <div className="tabs" role="tablist">
        {(["evidence", "testimony", "persons", "established"] as const).map((t) => (
          <button key={t} role="tab" className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="list">
        {tab === "evidence" &&
          (evidence.length + details.length === 0 ? (
            <p className="muted">Nothing yet.</p>
          ) : (
            <>
              {details.map((d) => (
                <div key={d.id} className="card clipping">
                  <div className="smallcaps muted">Observed</div>
                  {d.text}
                </div>
              ))}
              {evidence.map((e) => (
                <div key={e.id} className="card clipping">
                  <div className="display">{e.name}</div>
                  {e.description}
                </div>
              ))}
            </>
          ))}
        {tab === "testimony" &&
          (testimony.length === 0 ? (
            <p className="muted">No one has been questioned yet.</p>
          ) : (
            testimony.map(({ witness, topic }) => (
              <div key={topic.id} className="card clipping">
                <div className="smallcaps muted">
                  {name(witness)}, on {topic.label.toLowerCase()}
                </div>
                {topic.sentences.map((s) => (
                  <p key={s.id} className="speech" style={{ margin: "4px 0" }}>
                    “{s.text}”
                  </p>
                ))}
              </div>
            ))
          ))}
        {tab === "persons" &&
          c.cast.map((person) => (
            <div key={person.id} className="card clipping">
              <div className="display">{person.name}</div>
              <div className="muted smallcaps">{person.role}</div>
              {person.description}
            </div>
          ))}
        {tab === "established" &&
          (facts.length === 0 ? (
            <p className="muted">Nothing established yet.</p>
          ) : (
            facts.map((f) => (
              <div key={f.id} className="card clipping">
                {f.text}
              </div>
            ))
          ))}
      </div>
    </Sheet>
  );
}

/** Holmes' Notebook (§10): concepts only, never hints. */
export function NotebookSheet(props: { onClose: () => void }) {
  const { unlocked } = useGame();
  const [open, setOpen] = useState<string>();
  const entries = ENTRIES.filter((e) => unlocked.includes(e.id));
  const entry = open ? entryById(open) : undefined;

  return (
    <Sheet onClose={props.onClose}>
      <div className="notebook" key={entry?.id ?? "index"}>
        <div className="ribbon" aria-hidden="true" />
        <h2 className="ink-in" style={{ textAlign: "left", paddingRight: 30 }}>
          {entry ? entry.title : "Holmes’ Notebook"}
        </h2>
        {entry ? (
          <div className="ink-in">
            <p style={{ fontStyle: "italic" }}>{entry.gloss}</p>
            <p>{entry.plain}</p>
            <p>
              <span className="smallcaps muted">For example: </span>
              {entry.example}
            </p>
            <p className="smallcaps muted" style={{ fontSize: "0.8em" }}>
              In the logic books: {entry.term}
            </p>
            <button className="btn" onClick={() => setOpen(undefined)}>
              Back to the index
            </button>
          </div>
        ) : (
          <div>
            {(["fallacy", "method"] as const).map((section) => (
              <div key={section} style={{ marginBottom: 14 }}>
                <div className="smallcaps muted" style={{ margin: "6px 0" }}>
                  {section === "fallacy" ? "The Fallacy Index" : "The Methods"}
                </div>
                {entries
                  .filter((e) => e.section === section)
                  .map((e, i) => (
                    <button
                      key={e.id}
                      className="entry-link ink-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => setOpen(e.id)}
                    >
                      {e.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
