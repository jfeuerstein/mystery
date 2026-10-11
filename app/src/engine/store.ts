import { STARTER_ENTRIES, type Case, type ConceptId } from "@afoot/schema";
import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { allCases } from "../content";
import * as engine from "./progress";
import type { CaseProgress, Grade } from "./progress";

export type Screen = "title" | "casebook" | "case" | "settings";
export type Sheet = "casefile" | "notebook" | null;

type Settings = { textSize: "normal" | "large" };

type SaveData = {
  progress: Record<string, CaseProgress>;
  grades: Record<string, Grade>;
  unlocked: ConceptId[];
  settings: Settings;
};

type State = SaveData & {
  screen: Screen;
  sheet: Sheet;
  activeCase: string | null;
  hydrated: boolean;
  go: (screen: Screen) => void;
  openSheet: (sheet: Sheet) => void;
  openCase: (caseId: string) => void;
  /** Applies an engine step to the active case. */
  step: (fn: (c: Case, p: CaseProgress) => CaseProgress) => void;
  unlock: (concepts: readonly ConceptId[]) => void;
  completeCase: () => void;
  setSettings: (s: Partial<Settings>) => void;
  resetProgress: () => void;
  importSave: (data: unknown) => boolean;
};

// IndexedDB survives better than localStorage on iOS (GAME_DESIGN.md §15.3).
const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
};

const blankSave = (): SaveData => ({
  progress: {},
  grades: {},
  unlocked: [...STARTER_ENTRIES],
  settings: { textSize: "normal" },
});

export function caseById(id: string): Case {
  const c = allCases().find((x) => x.id === id);
  if (!c) throw new Error(`unknown case ${id}`);
  return c;
}

export const useGame = create<State>()(
  persist(
    (setState, getState) => ({
      ...blankSave(),
      screen: "title",
      sheet: null,
      activeCase: null,
      hydrated: false,
      go: (screen) => setState({ screen, sheet: null }),
      openSheet: (sheet) => setState({ sheet }),
      openCase: (caseId) => {
        const { progress } = getState();
        const c = caseById(caseId);
        const existing = progress[caseId];
        // A finished case replays from the start.
        const fresh = !existing || existing.stage.kind === "account";
        setState({
          activeCase: caseId,
          screen: "case",
          sheet: null,
          progress: fresh ? { ...progress, [caseId]: engine.startCase(c) } : progress,
        });
      },
      step: (fn) => {
        const { activeCase, progress } = getState();
        if (!activeCase) return;
        const p = progress[activeCase];
        if (!p) return;
        const next = fn(caseById(activeCase), p);
        if (next !== p) setState({ progress: { ...progress, [activeCase]: next } });
      },
      unlock: (concepts) => {
        const { unlocked } = getState();
        const add = concepts.filter((x) => !unlocked.includes(x));
        if (add.length > 0) setState({ unlocked: [...unlocked, ...add] });
      },
      completeCase: () => {
        const { activeCase, progress, grades } = getState();
        const p = activeCase ? progress[activeCase] : undefined;
        if (!activeCase || !p || p.stage.kind !== "account") return;
        const g = engine.grade(p);
        const order: Grade[] = ["untidy", "workmanlike", "masterful"];
        const best = grades[activeCase];
        const keep = best && order.indexOf(best) > order.indexOf(g) ? best : g;
        setState({ grades: { ...grades, [activeCase]: keep }, screen: "casebook", activeCase: null });
      },
      setSettings: (s) => setState({ settings: { ...getState().settings, ...s } }),
      resetProgress: () => setState({ ...blankSave(), screen: "title", activeCase: null }),
      importSave: (data) => {
        if (!data || typeof data !== "object" || !("progress" in data) || !("grades" in data)) return false;
        const d = data as SaveData;
        setState({ ...blankSave(), ...d, screen: "casebook", activeCase: null });
        return true;
      },
    }),
    {
      name: "afoot-save",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s): SaveData & { activeCase: string | null } => ({
        progress: s.progress,
        grades: s.grades,
        unlocked: s.unlocked,
        settings: s.settings,
        activeCase: s.activeCase,
      }),
      onRehydrateStorage: () => () => useGame.setState({ hydrated: true }),
    },
  ),
);

/** Cases unlock strictly in order (decision 20). */
export function isUnlocked(caseIndex: number, grades: Record<string, Grade>): boolean {
  if (caseIndex === 0) return true;
  const previous = allCases()[caseIndex - 1];
  return previous !== undefined && grades[previous.id] !== undefined;
}

/** The whole save as JSON, for Export Save (§15.3). */
export function exportSave(): string {
  const { progress, grades, unlocked, settings } = useGame.getState();
  return JSON.stringify({ version: 1, progress, grades, unlocked, settings }, null, 2);
}
