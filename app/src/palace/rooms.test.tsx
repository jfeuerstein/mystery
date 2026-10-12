import type { ArrangementPuzzle, ParallelPuzzle } from "@afoot/schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArrangementRoom, ParallelRoom } from "./rooms";

const parallel: ParallelPuzzle = {
  type: "parallel",
  speaker: "lestrade",
  sentences: [
    { id: "s1", role: "premise", text: "Whoever forged the cheque had the bank's paper." },
    { id: "s2", role: "premise", text: "Mr. Crane had the bank's paper." },
    { id: "s3", role: "conclusion", text: "So Mr. Crane forged the cheque." },
  ],
  flaw: "necessary-as-sufficient",
  options: [
    { id: "o1", text: "Mr. Crane had none of the paper, so he did not forge it.", flaw: "valid" },
    { id: "o2", text: "The miller's boy has mud on his boots, so he rode to the mill.", flaw: "necessary-as-sufficient" },
    { id: "o3", text: "The curate is a gambler, so the bell did not ring at nine.", flaw: "attacking-the-man" },
  ],
  answer: { optionId: "o2" },
};

const schedule: ArrangementPuzzle = {
  type: "arrangement",
  layout: "schedule",
  entities: [
    { id: "holt", name: "Holt" },
    { id: "kerr", name: "Kerr" },
    { id: "moss", name: "Moss" },
  ],
  slots: [
    { id: "mon", label: "Monday", max: 2 },
    { id: "tue", label: "Tuesday", min: 1, max: 1 },
  ],
  rules: [{ id: "r1", text: "Holt called before Kerr.", constraint: { op: "before", a: "holt", b: "kerr" } }],
  question: { kind: "full" },
};

describe("Mind Palace rooms", () => {
  it("shows the Parallel's argument whole and its options to choose from", () => {
    const html = renderToStaticMarkup(<ParallelRoom puzzle={parallel} speaker="Lestrade" onDeclare={() => {}} />).replace(/&#x27;/g, "'");
    expect(html).toContain("Lestrade's reasoning");
    expect(html).toContain("So Mr. Crane forged the cheque.");
    expect(html).toContain("From the commonplace book");
    for (const o of parallel.options) expect(html).toContain(o.text);
    // The options never say which error they commit.
    expect(html).not.toContain("attacking-the-man");
  });

  it("shows how many each group of a schedule may hold", () => {
    const html = renderToStaticMarkup(<ArrangementRoom puzzle={schedule} onDeclare={() => {}} />);
    expect(html).toContain("at most 2");
    expect(html).toContain("exactly 1");
  });
});
