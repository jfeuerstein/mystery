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
- Generating a case is done only by following
  `.claude/skills/generate-case/SKILL.md` in a dedicated session.
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
- `packages/seal` (`@afoot/seal`): seal/unseal (gzip + AES-GCM), shared by
  the pipeline and the app.
- `pipeline/` (`@afoot/pipeline`): the `afoot` CLI (`npm run afoot`), the
  motif library (`pipeline/motifs/motifs.yaml`) and generator-side code.
  `pipeline/src/seasons.ts` says which seasons are serial (Seasons 2 and 3:
  decision 27); every other season is standalone.
- `.claude/skills/generate-case/`: the procedure a generation session follows;
  `.claude/agents/`: the blind-solver and adversary playtesters.
- `content/sealed/`: sealed cases, the spoiler-free `index.json`, and the
  sealed `ledger.sealed`. `content/.plain/` is git-ignored plaintext that
  exists only inside a generation session.
- `app/public/art/catalog.json`: the engraving catalog; cases may only use
  its tags. `pipeline/art/plates.json` names each plate's public-domain
  source and crop (`tag#2`, `tag#3`, … are further plates of a tag); `afoot
  art build` prints them into `app/public/art/`.
- `pipeline/audio/sounds.json`: every music cue and violin effect as
  excerpts of free recordings; `afoot audio build` (needs ffmpeg) cuts them
  into `app/public/audio/` and its manifest.
- `fixtures/`: hand-written test fixtures, including the full sample case.

## Commands

```sh
npm ci            # install
npm run check     # typecheck + tests + build (what CI runs)
npm test          # vitest only
npm run typecheck # tsc only
npm run dev       # the app at http://localhost:5173
npm run e2e       # after `npm run build`: full playthrough in Chromium
npm run afoot     # the generation CLI (prints its commands)
NODE_USE_ENV_PROXY=1 npm run afoot -- art build    # behind a proxy
```

Development sessions: never run `afoot next`, `view`, `verify` or `audit`
against real generated content, and don't print motif suggestions. Use
`afoot sealed-check` (metrics only) to confirm sealed cases are sound.

## Conventions

- Logic belongs in `@afoot/logic`, data shapes in `@afoot/schema`.
- Code turns story phrasing into logical form (`compile` in
  `packages/logic/src/propositional.ts`); never let a model translate
  "only if" or "unless".
- A failed Declare tells the player nothing (decision 21). Checker `reason`
  strings are for tests and development only and must never reach the UI.
- Every verifier must reject the puzzles it exists to catch: add a failing
  example to `packages/logic/test/logic.test.ts` alongside each new check.
- The app never names the LSAT (decision 18); `app/src/no-lsat.test.ts`
  enforces it. The Notebook's `term` is the concept's classic logic name.
- Art and audio are public domain or CC0 (effects may also be free of all
  restriction), credited in the catalog and manifest. Never images of
  Moriarty.
