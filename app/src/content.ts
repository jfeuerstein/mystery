import { Case } from "@afoot/schema";
import { unseal, type SealedIndex } from "@afoot/seal";
import stoppedClock from "../../fixtures/stopped-clock.case.json";

/** The hand-written sample case (GAME_DESIGN.md §16): always first, never sealed. */
export const SAMPLE: Case = Case.parse(stoppedClock);

// Sealed seasons are bundled as opaque text and opened in the browser (§14.6).
const indexFiles = import.meta.glob<SealedIndex>("../../content/sealed/index.json", { eager: true, import: "default" });
const sealedFiles = import.meta.glob<string>("../../content/sealed/**/*.sealed", {
  eager: true,
  query: "?raw",
  import: "default",
});

let cases: Case[] = [SAMPLE];

/** Every playable case in play order: the sample, then each season in order. */
export function allCases(): Case[] {
  return cases;
}

export async function loadSealedCases(): Promise<void> {
  const index = Object.values(indexFiles)[0];
  if (!index) return;
  const opened: Case[] = [];
  for (const entry of [...index.cases].sort((a, b) => a.season - b.season || a.number - b.number)) {
    const blob = sealedFiles[`../../content/sealed/${entry.file}`];
    if (!blob) continue;
    try {
      opened.push(Case.parse(await unseal(blob)));
    } catch {
      // Never print case content; just say which slot failed.
      console.error(`Season ${entry.season}, case ${entry.number} could not be opened`);
    }
  }
  cases = [SAMPLE, ...opened];
}
