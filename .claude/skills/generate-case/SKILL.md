---
name: generate-case
description: Generate, verify, blind-playtest and seal ONE new case for The Game Is Afoot, without ever revealing its content. Use only in a dedicated generation session (GAME_DESIGN.md §14.5), never in a development session.
---

# Generate one case

You are writing a new Sherlock Holmes case for a player who must never see it
before playing it. That player can read this session's transcript. Everything
below exists to make a fair, verified, *unseen* case.

## The spoiler protocol (non-negotiable)

1. Your **final message** is exactly one line: the line `afoot seal` prints,
   e.g. `S1 case 3: SEALED. 8 deductions, 12 variants verified, 22 blind solves, 4 adversary passes, 5210 words.`
   If you cannot seal, it is `S<season> case <n>: NOT SEALED.` followed by the
   gate names `afoot seal` printed (e.g. `playtest`, `audit`). Nothing else:
   no title, names, places, motifs, concepts, plot, puzzle text, or apology.
2. Your **commit message** is that same line. Commit only `content/sealed/`.
3. Plaintext lives only in `content/.plain/<caseId>/` (git-ignored). Never
   commit it, never copy it elsewhere, never paste it into a PR or comment.
   `afoot seal` deletes it.
4. Do not open a pull request, post comments, or message other sessions.
5. Keep your own narration between tool calls brief and content-free
   ("Writing the world model.", "Revising one deduction.").

## Tools

Run everything from the repo root:

```sh
npm ci                     # once
npm run -s afoot -- <cmd>  # the afoot CLI; `npm run -s afoot` alone prints usage
```

Read these before writing (they are the contract you write against):

- `GAME_DESIGN.md` §5–§8 (structure and every puzzle type), §13.1 (tone), §14.
- `packages/schema/src/case.ts` and `puzzles.ts`: the exact JSON shapes.
- `pipeline/src/plan.ts`: `Concept` and `WorldModel`.
- `fixtures/stopped-clock.case.json`: a complete worked example. It is the
  sample case; do not reuse its plot, cast or tricks.

## Stage 1: concept

```sh
npm run -s afoot -- next --init
```

This prints the slot (`caseId`, season, number), the **curriculum** (the one
concept to introduce, the ones to reinforce, every concept and flaw name the
case may use) and **suggested motifs** (a central trick, complications, a
premise), and writes `content/.plain/<caseId>/concept.json`.

- Read the chosen motifs in `pipeline/motifs/motifs.yaml`.
- You may swap complications or the premise for others in the library that
  fit better. Keep the central trick unless it cannot work; `seal` rejects a
  central trick used in the last 6 cases.
- Replace the synopsis placeholder with a one-paragraph secret synopsis.

## Stage 2: world model (`world.json`)

Design the crime before any puzzle or prose. Follow `WorldModel` in
`pipeline/src/plan.ts`: cast (with secrets and motives), a minute-level true
timeline, the truth behind every piece of evidence, what each witness knows
and what they lie about (and why), red herrings with innocent explanations,
and the solution (culprit, method, motive, trick).

Rules: one culprit; every lie has a reason; every red herring is resolved
innocently; the trick must be discoverable from physical evidence and
testimony alone (Knox's Decalogue: no secret passages unannounced, no
unknown poisons, no twins, no accidents of providence). Never Moriarty.

## Stage 3: the case skeleton (`case.json`)

Lay out chapters and beats, then build every deduction from the world model.

Structure (enforced by `afoot audit`):
- 3–4 chapters; 6–10 deductions; every chapter has at least one.
- Chapter I opens at Baker Street with a cold read (an `observe` beat followed
  by an Observation deduction).
- The last chapter's deductions lead to the finale Reconstruction.
- `concepts.introduces` must equal the curriculum's, and at least one
  deduction must use it. Every variant's `concepts` must come from the
  curriculum's `allowed` list; every Flaw answer from its `flawTypes`.
- Arrangement and Chain slots need **2–3 variants** testing the same truth
  (a failed chapter swaps in another variant). Other slots need 1–2.
- Every variant has a `difficulty` from 1 (gentle: one step, the concept on
  its own) to 5 (many rules or distractors, a long chain). The app picks the
  variant that suits the player (§11.3), so a slot's variants should differ
  by 1–2 points. A new concept's first deduction needs a variant at 1–2.
- Only art tags from `app/public/art/catalog.json`.

Designing each puzzle type (the verifiers will hold you to these):
- **Observation**: each observation supports exactly one listed inference;
  every unused inference has a `defeater` saying why the evidence doesn't
  support it. Include one tempting alternative explanation.
- **Flaw**: 3–6 sentences, the error at one sentence. For
  `necessary-as-sufficient` / `sufficient-as-necessary`, include `formal`
  (the verifier classifies it). The argument must contain no second flaw.
  The informal names need the error to be unmistakable and the only one:
  `unrepresentative-witness` (a few or hand-picked people stand for all),
  `attacking-the-man` (a claim dismissed for its speaker), `two-doors-only`
  (two options offered as the only ones, one ruled out), `slippery-word`
  (one word in two senses across the step), `some-most-all` ("some" or
  "most" treated as "all", or two "some" statements chained).
- **Missing Link** (`missing-link`, for `unstated-premise`): an argument of
  2–4 sentences whose `premises` (logical form) stop short of `conclusion`.
  Pick a `frame` (`if`, `only-if`, `unless`, `no-one-who`); code gives it its
  meaning, so write tile `text` that reads naturally in it (clauses for
  `if`/`only-if`/`unless`, verb phrases for "No one who ___ could have
  ___"). Give 4–6 `tiles`, each with the `literal` it asserts: the two link
  phrases plus distractors from the case. The verifier requires that exactly
  one premise closes the gap, so the reversed link must fail, and a tile for
  the conclusion itself must not let a shortcut close it. Use `only-if` and
  `unless` frames only once `only-if-and-unless` is known.
- **Objection / Corroborate**: each testimony sentence `asserts` literals;
  each hand card `establishes` literals; `background` rules link them. Exactly
  one (sentence, card) pair may contradict (or support). Include 3–5 cards,
  most of them real evidence from the case that bears on nothing here.
- **Chain**: every card is true. Conditional cards need natural-sounding
  `readings` for contrapositive, converse and inverse; the converse and
  inverse must read plausibly, because they are the traps. Put at least one
  tempting distractor within reach of a converse or inverse, and give
  `phrases` for the target and every distractor. Use "only if"/"unless"
  only once the curriculum allows `only-if-and-unless`.
- **Arrangement**: rules must solve by elimination with no guessing and no
  redundant rule (the verifier checks both). Rule text must say exactly what
  the constraint says ("immediately after" is `immediately-before` reversed).
- **Reconstruction**: 4–8 blanks covering who, when, how, why and the trick;
  each blank's `establishedBy` names the deductions or clues that prove it;
  the word bank holds every right answer once plus plausible wrong ones from
  the case.

Fair play: every id a deduction `requires` must be introduced earlier (by
narration `introduces`, an observed detail, a found hotspot, an asked topic,
or an earlier deduction's `establishes`).

Then:

```sh
npm run -s afoot -- validate <caseId>
npm run -s afoot -- verify <caseId>
```

Fix everything until `verify` prints `OK` with no warnings other than
"relies on blind playtest agreement".

## Stage 4: prose

Write the narration, testimony, evidence descriptions, Holmes' lines and the
finale around the verified structure.

- Watson narrates in the first person, in Doyle's cadence: formal, warm, a
  little wry; period vocabulary; no modern idiom.
- Paragraphs of at most ~130 words, read on a phone. 2,500–7,500 words in all.
- The clues are in the text, stated plainly but not flagged. Never state a
  deduction's answer before the deduction.
- `holmesSpeaks` states, with flourish, exactly what the player just proved.
- `account` has three versions (masterful, workmanlike, untidy) in Watson's voice.

```sh
npm run -s afoot -- compose <caseId>   # places evidence hotspots
npm run -s afoot -- audit <caseId>
npm run -s afoot -- verify <caseId>
```

Fix every audit error, and every warning you reasonably can.

## Stage 5: blind playtest

`npm run -s afoot -- status <caseId>` lists every target (each deduction
variant, and `finale`) and what it still needs: argument puzzles (Flaw,
Objection, Observation) need **three** blind solvers and a clear adversary
verdict; formal puzzles and the finale need one blind solver.

For each target:

1. `npm run -s afoot -- view <caseId> <target> > /tmp/afoot-view.md`
   and read it. This is everything the player knows, and nothing more.
2. Spawn **separate** `blind-solver` sub-agents (in parallel), each given the
   full view text pasted into its prompt. Never give a file path, the case
   id, the intended answer, or any hint. Launch every playtest agent in the
   foreground (`run_in_background: false`): several in one message still run
   in parallel, and their answers come back in the same turn. A session that
   ends its turn while agents run in the background may never be woken.
3. Save each solver's reply to a temp file and record it:
   `npm run -s afoot -- check <caseId> <target> /tmp/afoot-answer-N.json --solver solver-N`
   (use distinct solver names; it prints CORRECT or WRONG).
4. For argument puzzles, spawn one `adversary` sub-agent with the view text
   and the intended answer, then record its verdict:
   `npm run -s afoot -- adversary <caseId> <target> clear|ambiguous`.

If any solver is WRONG or the adversary finds a defensible alternative, the
puzzle (or the story's clues for it) is unclear or flawed: revise it, re-run
`verify` and `audit`, and test again. Results for the old version stop
counting automatically. Allow up to 3 revision rounds per deduction; if one
still fails, replace it with a different deduction. If the case cannot pass,
delete `content/.plain/<caseId>/` and start again from Stage 1.

If a sub-agent type is unavailable or fails to launch, stop: you cannot
playtest blind yourself. Report `NOT SEALED. playtest` and end.

## Stage 6: seal and commit

```sh
npm run -s afoot -- seal <caseId>
npm run -s afoot -- sealed-check
git add content/sealed
git commit -m "<the line afoot seal printed>"
git push
```

`seal` refuses unless every gate passes (slot, novelty, verify, audit,
playtest). On success it writes `content/sealed/`, updates the spoiler-free
index and the sealed ledger, and deletes the plaintext.

End with the one-line final message from the protocol above.
