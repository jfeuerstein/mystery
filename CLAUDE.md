# The Game Is Afoot

An episodic Sherlock Holmes deduction game for iPhone (a PWA). The design is
in `GAME_DESIGN.md`; read the relevant section before changing behaviour,
and update the doc when a design decision changes.

## Spoiler rule (read first)

The person you are working with is also the game's only player. They must
never see a generated case before playing it.

- Never decrypt, display, summarize, quote or describe the contents of
  anything under `content/sealed/`, in chat, commits, PRs, logs or files.
- `content/.plain/` (plaintext cases) exists only inside generation sessions,
  is git-ignored, and must never be committed or pushed.
- Generation sessions follow `GAME_DESIGN.md` §14.7: their final messages and
  commit messages use the metric-only template and contain no titles, names,
  motifs or plot.
- Development works against the hand-written sample case in
  `fixtures/stopped-clock.case.json` (GAME_DESIGN.md §16), which is not a
  spoiler.

## Layout

- `packages/schema` (`@afoot/schema`): Zod schemas and types for cases and
  puzzles, shared by the app and the generator.
- `packages/logic` (`@afoot/logic`): pure TypeScript verifiers and answer
  checkers for every puzzle type. No runtime dependencies beyond the schema
  types. The app checks Declares with the same code the pipeline verifies with.
- `app/` (`@afoot/app`): the PWA (Vite + React). `src/engine/progress.ts` is
  the game engine as pure functions; `src/engine/store.ts` wraps it with
  Zustand and IndexedDB saves; `src/palace/rooms.tsx` holds the Mind Palace
  puzzle rooms; `e2e/playthrough.mjs` plays the sample case in Chromium.
- `fixtures/`: hand-written test fixtures, including the full sample case.
- Planned (see GAME_DESIGN.md §15.2): `pipeline/` (the `afoot` CLI),
  `.claude/skills/generate-case/`, `.claude/agents/`, `content/`.

## Commands

```sh
npm ci            # install
npm run check     # typecheck + tests + build (what CI runs)
npm test          # vitest only
npm run typecheck # tsc only
npm run dev       # the app at http://localhost:5173
npm run e2e       # after `npm run build`: full playthrough in Chromium
```

## Conventions

- Logic belongs in `@afoot/logic`, data shapes in `@afoot/schema`.
- Code turns story phrasing into logical form (`compile` in
  `packages/logic/src/propositional.ts`); never let a model translate
  "only if" or "unless".
- A failed Declare tells the player nothing (decision 21). Checker `reason`
  strings are for tests and development only and must never reach the UI.
- Every verifier must reject the puzzles it exists to catch: add a failing
  example to `packages/logic/test/logic.test.ts` alongside each new check.
