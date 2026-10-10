# The Game Is Afoot

An episodic Sherlock Holmes deduction game for iPhone (an installable web app).
You play as Holmes, and every deduction happens in the **Mind Palace**: expose
flawed arguments, catch lying witnesses with evidence, chain conditionals, and
solve ordering puzzles, with the logic drawn from the LSAT. Cases are
AI-generated, machine-verified for fairness and unique solutions, and sealed
so you never see them before you play.

See **[GAME_DESIGN.md](GAME_DESIGN.md)** for the full design document.

## Development

Requires Node 22.

```sh
npm ci
npm run dev     # play at http://localhost:5173
npm run check   # typecheck + tests + build
npm run e2e     # after a build: plays the sample case in headless Chromium
```

- `packages/schema`, `packages/logic`: the case format and the logic checkers that verify every puzzle.
- `app/`: the game, an installable web app for iPhone.
- `fixtures/stopped-clock.case.json`: the playable sample case from the design doc.
