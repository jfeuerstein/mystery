import { STARTER_ENTRIES, type Case, type ConceptId } from "@afoot/schema";
import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { allCases } from "../content";
import type { Attempt } from "./ledger";
import * as engine from "./progress";
import type { CaseProgress, Grade } from "./progress";

export type Screen = "title" | "casebook" | "case" | "settings" | "ledger" | "credits";
export type Sheet = "casefile" | "notebook" | null;

export type Settings = {
  textSize: "normal" | "large";
  /** By Candlelight: a burning candle times each deduction (§12). */
  candle: boolean;
  /** 0–1. */
  music: number;
  sfx: number;
};

type SaveData = {
  progress: Record<string, CaseProgress>;
  grades: Record<string, Grade>;
  unlocked: ConceptId[];
  settings: Settings;
  /** Every Declare, for Holmes' Ledger and (in M3) adaptive difficulty. */
  stats: Attempt[];
};

const DEFAULT_SETTINGS: Settings = { textSize: "normal", candle: false, music: 0.6, sfx: 0.8 };

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
  recordAttempt: (attempt: Attempt) => void;
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
  settings: { ...DEFAULT_SETTINGS },
  stats: [],
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
      recordAttempt: (attempt) => setState({ stats: [...getState().stats, attempt] }),
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
        const d = data as Partial<SaveData>;
        const blank = blankSave();
        setState({ ...blank, ...d, settings: { ...blank.settings, ...d.settings }, screen: "casebook", activeCase: null });
        return true;
      },
    }),
    {
      name: "afoot-save",
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      // Older saves lack the ledger and the newer settings.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<SaveData>;
        return { ...p, stats: p.stats ?? [], settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SaveData>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings }, stats: p.stats ?? [] };
      },
      partialize: (s): SaveData & { activeCase: string | null } => ({
        progress: s.progress,
        grades: s.grades,
        unlocked: s.unlocked,
        settings: s.settings,
        stats: s.stats,
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
  const { progress, grades, unlocked, settings, stats } = useGame.getState();
  return JSON.stringify({ version: 2, progress, grades, unlocked, settings, stats }, null, 2);
}
