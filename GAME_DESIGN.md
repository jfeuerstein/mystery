# The Game Is Afoot — Game Design Document

> *"You see, but you do not observe. The distinction is clear."*
> — *A Scandal in Bohemia*

**Status:** v1.7. Written from a design interview, October 2026
**Platform:** iPhone (installable web app / PWA), portrait only
**Audience:** One player (personal project, never distributed)

---

## Table of Contents

1. [Vision](#1-vision)
2. [Design Pillars](#2-design-pillars)
3. [Decisions Log](#3-decisions-log)
4. [Setting, Characters and Tone](#4-setting-characters-and-tone)
5. [Structure: Cases, Chapters, Beats](#5-structure-cases-chapters-beats)
6. [The Core Loop](#6-the-core-loop)
7. [Investigation](#7-investigation)
8. [The Mind Palace](#8-the-mind-palace)
9. [Patience, Failure and Grading](#9-patience-failure-and-grading)
10. [Holmes' Notebook](#10-holmes-notebook)
11. [Progression: Curriculum and Adaptive Difficulty](#11-progression-curriculum-and-adaptive-difficulty)
12. [By Candlelight and Holmes' Ledger](#12-by-candlelight-and-holmes-ledger)
13. [Presentation: Art, UI and Audio](#13-presentation-art-ui-and-audio)
14. [Content Generation Pipeline](#14-content-generation-pipeline)
15. [Technical Architecture](#15-technical-architecture)
16. [Illustrative Case: The Stopped Clock](#16-illustrative-case-the-stopped-clock)
17. [Roadmap](#17-roadmap)
18. [Risks](#18-risks)
19. [Appendix A: Logic Concept Taxonomy](#appendix-a-logic-concept-taxonomy)
20. [Appendix B: Motif Library Format](#appendix-b-motif-library-format)
21. [Document History](#document-history)

---

## 1. Vision

**The Game Is Afoot** is an episodic deduction game for iPhone. You play as
Sherlock Holmes, and the cases are new ones, written in the style of the
Strand Magazine stories. Each case plays like an illustrated story told in
sepia ink. At every moment that calls for real reasoning, the scene freezes
and you drop into Holmes' **Mind Palace**, where you do the reasoning yourself.

The puzzles are not decorations attached to the story. **The deductions are
the investigation.** You expose the flaw in Lestrade's theory, catch the groom
in a lie by presenting the right piece of evidence, link conditional
statements into a chain that names the killer, and work out from scattered
testimony the order in which the household passed the hall clock. The logic
draws heavily on the kinds of reasoning the LSAT tests: argument flaws,
conditional logic, inference, and ordering and grouping. The game itself
never names the test (decision 18): it should be good practice without
feeling related to it. It is wrapped in a mystery that has to be satisfying
in its own right.

Cases are **generated, not hand-written**, so the player never knows the
solution in advance, and they are **verified by machine before they ship**.
Every puzzle is checked to have exactly one correct answer and to be fair:
every clue you need appears before you need it.

**One-line pitch:** *Obra Dinn's deduction plus Ace Attorney's objections, in
a Sidney Paget illustration, sized for a commute.*

---

## 2. Design Pillars

1. **Deduction is the story.** Every Mind Palace puzzle advances the case. No
   sliding-block puzzles, no riddles unrelated to the crime. If a puzzle could
   be removed without the story noticing, it doesn't belong.
2. **Construct, don't choose.** Wherever possible you *build* your answer:
   tap the faulty sentence, name the flaw, present the evidence, assemble the
   chain. Multiple choice is rare. Guessing should be both expensive and
   unrewarding.
3. **Fair play, always.** Every case follows the Golden Age contract (see
   Knox's Decalogue, 1929): all the evidence is shown to the reader, nothing
   hinges on undisclosed facts, and the solution is unique. The pipeline
   enforces this mechanically.
4. **Rigor with a light touch.** The logic is genuinely hard and grounded in
   the reasoning the LSAT tests, but the game never feels like a test-prep
   app and never names the test. The Notebook gives each concept its classic
   name from the logic books (*modus tollens*, *affirming the consequent*),
   small and never forced on you.
5. **Built for the phone in your hand.** Portrait, one thumb, playable in
   5-minute bursts, with autosave at every beat. A 30-minute case survives
   being interrupted ten times.

---

## 3. Decisions Log

Every design decision from the interview and the revisions that followed, with the reasoning behind each. All decisions are final for v1.0.

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Protagonist | **Play as Holmes directly**, with Watson narrating | The fantasy *is* being Holmes. The canon is public domain in the US. |
| 2 | Puzzle and story relationship | **Deduction IS the story** (Obra Dinn / Golden Idol) | Puzzles carry narrative weight, and solving the puzzles solves the case. |
| 3 | Logic types | **Argument analysis, ordering/grouping games, formal and conditional logic** | Covers LSAT Logical Reasoning plus the classic logic games, which are no longer on the test but make excellent game mechanics. Reading Comprehension is not a target. |
| 4 | Episode length | **20–40 minutes**, chunked | Commute-sized chapters with a satisfying whole. |
| 5 | Answer input | **Construct answers, rarely multiple choice** | Harder to guess, and closer to real reasoning. |
| 6 | Failure | **Limited mistakes**, tracked by a Patience meter | Wrong accusations carry real stakes. |
| 7 | Failure scope | **Restart the current chapter** | Stakes without losing 30 minutes of progress. |
| 8 | Help | **Holmes' Notebook as reference only**, no hints | The purist route: you learn concepts, not answers. |
| 9 | Aesthetic | **Strand Magazine visual novel**: black, white and sepia, portrait orientation | A blend of the case-file and illustrated-scene options. |
| 10 | Argument mechanics | **Mind Palace cutaway** containing: tap and name the flaw, present evidence, draw the inference chain | Proposed by the player. Turns Holmes' split-second reasoning into a place you visit. |
| 11 | Platform | **PWA** (TypeScript + React), installed to the home screen | No App Store and no Mac required. Fastest to iterate. |
| 12 | Content source | **AI-generated cases** drawing on a public-domain motif library *and* popular fandom tropes | The player can't author the cases without spoiling them. Personal use only. |
| 13 | Generation timing | **Sealed batches, generated offline**, verified and encrypted | No bad puzzles at play time, the app works offline, and the player can't peek. |
| 14 | Timing | **Untimed by default, plus an optional By Candlelight mode** | Thinking time is respected, and timed practice is available when wanted. |
| 15 | Progression | **Notebook curriculum** plus **adaptive difficulty** | Concepts arrive gradually, and the game leans into your weak spots. |
| 16 | Investigation | **All of them:** linear story spine, plus Observe (cold read), Examine scenes, and Interrogate set pieces | The story stays brisk, with hands-on moments at the key beats. |
| 17 | Audio | **Violin music and violin sound effects**, no voice | Atmosphere without narration cost. Revised in v1.4: public-domain string recordings for the music and violin samples for the effects; no location ambience. |
| 18 | LSAT fidelity | **The concepts only; the test is never named in the app** | The mystery comes first. LSAT concepts inform design, and an internal tag system powers adaptivity, but play should not feel related to the test. Revised in v1.4: the Notebook's glossary shows each concept's classic name from the logic books instead of the test's category name, and a test fails the build if the word appears in the app, schema, logic package or fixtures. |
| 19 | Title | **The Game Is Afoot** | Chosen by the player. |
| 20 | Case order | **Strictly sequential**, one open case at a time | Keeps the curriculum and adaptive tuning in a fixed order. |
| 21 | Wrong-answer feedback | **None**: a miss costs one Patience and reveals nothing | Purist, consistent with decision 8. Guessing teaches nothing. |
| 22 | Patience budget | **3 per chapter**, 3 for the finale, for every patience-holder | Confirmed by the player after the first draft. |
| 23 | Art source | **Public-domain engravings only**, with no AI image generation | Authentic period look. The pipeline writes cases to fit the art catalog. |
| 24 | Story arc | **Standalone cases, no Moriarty storyline yet.** Moriarty is excluded from the motif library for now. | Keeps every case self-contained. An arc can be revisited later. Revised in v1.7: Season 2 tries a serial thread as an experiment (decision 27); still no Moriarty. |
| 25 | Generation runner | **Claude Code sessions on the player's existing subscription**, not the Claude API | No per-case cost. The writing steps run in a session that follows a repo skill, and the code checks stay the same. |
| 26 | Reading Comprehension | **Out of scope**, not planned for any season | Keeps the game focused on argument, conditional and ordering logic. Documents (letters, wills, newspaper columns) remain clue sources only. |
| 27 | Season 2 | **A serial season, as an experiment:** one thread and its people carry from case to case and resolve in the season's last case (§5) | Proposed by the player, to try more carry-over between cases. Seasons stay standalone by default; each case keeps its own culprit and is solved from its own text. |

---

## 4. Setting, Characters and Tone

### Setting
London and the Home Counties, **1881–1903**, the years of the canonical
partnership. Fog, gaslight, hansom cabs, railway timetables, telegrams, and
country houses a fast train away from Waterloo. Cases may also travel to
Dartmoor, the Sussex Downs, Edinburgh, or across the Channel.

### Characters

| Character | Role in the game |
|-----------|------------------|
| **Sherlock Holmes** (you) | Your inner voice in the Mind Palace. Out of it, Holmes' dialogue is written to *follow from your deductions*: he states aloud what you just proved. |
| **Dr. John Watson** | Narrator of the story text, and a frequent source of well-meaning but flawed theories for you to dissect. Writes the end-of-case **Account** that grades you. |
| **Inspector Lestrade** (and Gregson, Hopkins, Bradstreet) | Official police. Usually the owner of the **Patience** meter. Prone to confident leaps of logic. |
| **Mrs. Hudson** | Frames the start and end of cases at 221B. |
| **Mycroft Holmes** | Occasional client for government cases, and an occasional patience-holder (with the same budget of 3 as everyone else). |
| **The Baker Street Irregulars** | Bring in leads, sometimes as unreliable testimony to analyze. |
| **Antagonists** | Each case has its own original culprit. Canon villains such as Milverton or Moran may appear as one-off adversaries. **Moriarty does not appear, and there is no Moriarty storyline for now** (decision 24); he is held back for a possible future arc. |

### Tone
- **Prose:** Watson's first-person narration, pastiching Doyle's cadence:
  formal, warm, a little wry. Sentences short enough to read comfortably on
  a phone. Roughly 150–300 words of narration per beat.
- **Holmes in the Mind Palace:** clipped, sharp, second person (*"The groom
  says he never left the stables. Then why is the river on his boots?"*).
- **Content:** murders happen off screen, as in the canon. Nothing gratuitous.

---

## 5. Structure: Cases, Chapters, Beats

```
Season (a sealed batch of ~8 cases)
└── Case (20–40 min, one mystery)
    ├── Chapter I    ── Patience budget resets here
    │   ├── Beat: Narration
    │   ├── Beat: Observe (cold read)
    │   └── Beat: Mind Palace deduction
    ├── Chapter II
    │   ├── Beat: Examine scene
    │   ├── Beat: Interrogate
    │   └── Beat: Mind Palace deduction ×2
    ├── Chapter III
    │   └── ...
    └── Finale: The Reconstruction
```

| Unit | Size | Notes |
|------|------|-------|
| **Season** | 6–10 cases | One sealed content bundle. **Strictly sequential:** only one unsolved case is open at a time, and the next unlocks when the current one is solved. Replaying finished cases is allowed. |
| **Case** | 3–4 chapters, 6–10 deductions | One self-contained mystery (in a serial season, one that also carries the season's thread). |
| **Chapter** | 5–10 minutes, 2–3 deductions | The unit of failure (decision 7) and a natural stopping point. |
| **Beat** | 30 seconds to 3 minutes | The unit of autosave. Closing the app mid-beat resumes at the start of that beat. |

### Case template (default shape)
1. **Chapter I: The Client.** Mrs. Hudson shows in a visitor. **Observe**
   (cold read). The client tells the story. The first deduction (often
   dissecting a theory already held by the police or the client).
2. **Chapter II: The Scene.** Travel. **Examine** the scene and gather
   evidence cards. Deductions about the physical evidence (an Arrangement or
   a Chain).
3. **Chapter III: The Witnesses.** **Interrogate**, followed by
   **Objection** deductions against testimony, Flaw deductions against
   alibis, and the twist.
4. **Finale: The Reconstruction.** A Golden Idol-style fill-in-the-blanks
   account of what really happened. Watson's Account and the grade follow.

The generator may vary this template (a case might open at the crime scene,
or include a second victim mid-case), but all four phases are always present.

### Serial seasons (decision 27)
Seasons are standalone by default. Season 2 is an experiment in carry-over:

- **One thread runs through the season.** Its first case plans it (the
  secret truth, how it surfaces in each case, how it ends), and the
  season's last case resolves it, as its main mystery or as the twist in
  its own. The thread is human-scale: a recurring adversary, a client whose
  trouble runs deeper than one case, linked incidents, a matter touching
  Watson, Mrs. Hudson or an inspector. Never Moriarty or a stand-in for him.
- **People and consequences return.** From the second case on, every case
  brings back someone or something from an earlier one.
- **Each case still stands on its own.** It has its own crime and culprit,
  and a short recollection in Watson's voice reminds the player of what
  matters. Every fact a deduction needs is in that case's text, so nothing
  depends on remembering an earlier case (and the blind solvers, who see
  only one case, check this).
- **The thread travels sealed.** Each case records what it hands on (how it
  ended, what it showed of the thread, who could return, loose ends) in the
  sealed ledger, and `afoot next` gives it to the next generation session.
  `afoot seal` refuses a serial case that changes what was already played,
  calls back to nothing, or leaves the season's end with loose ends.

If the experiment works, later seasons can adopt it in
`pipeline/src/seasons.ts`.

---

## 6. The Core Loop

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   ▼                                                          │
 NARRATION ──► INVESTIGATE ──► MIND PALACE ──► HOLMES SPEAKS ─┘
 (Watson's     (Observe /      (scene freezes;   (the deduction you
  account)      Examine /       you construct    just proved is
                Interrogate)    the deduction)   spoken aloud and
                     │                           moves the story on)
                     ▼
               CASE FILE grows
               (evidence, testimony, people, facts established)
```

- **Narration** moves the story forward and delivers some clues passively
  (decision 16: the linear spine).
- **Investigation** set pieces let you gather clues hands-on. Everything you
  gather goes into the **Case File**.
- The **Mind Palace** is where every scored decision happens. Outside it,
  nothing you do costs Patience.
- **Holmes Speaks** is the payoff. The scene unfreezes and Holmes delivers
  your deduction with full theatrical flourish. That moment is the reward.

### The Case File
A persistent drawer, reachable from any screen with a swipe up from the
bottom edge. It has four tabs:

| Tab | Contents |
|-----|----------|
| **Evidence** | Physical evidence cards, each with an engraving-style vignette and a short description. |
| **Testimony** | A verbatim record of every statement, attributed and timestamped. Sentences are individually addressable (this matters in the Mind Palace). |
| **Persons** | The cast list with portraits, relationships, and what you've established about each. |
| **Established** | Facts you have *proved* in earlier deductions. These become premises for later ones. |

**The story so far.** The open book in the header shows every page read in
the case, in order, ending where you are: narration, what you observed and
found, the answers you heard, each deduction's question and, once solved,
Holmes' conclusion. It is read-only (the story only moves forward) and shows
nothing you haven't been shown, so a page tapped past too quickly can always
be read again.

---

## 7. Investigation

All investigation is **free of mistakes**. You cannot lose Patience outside
the Mind Palace. Investigation is about *gathering*; the Mind Palace is about
*reasoning*.

### 7.1 Observe: The Cold Read
The signature Holmes moment, and the opener of almost every case.

- The client appears as a **full-length engraving**. Around them sit 4–6
  **magnifier vignettes**: close-up details you tap to inspect (a frayed
  cuff, a railway ticket tucked into a glove, a callus, a mud stain).
- Each inspected detail becomes an *Observation* card.
- Then the scene freezes for an **Observation deduction** in the Mind Palace
  (§8.6), where you link observations to conclusions.
- Holmes delivers the read aloud ("You have come up from Surrey this
  morning, you write a great many letters, and you play the violin, though
  not, I think, for an audience"), and the client is suitably astonished.

### 7.2 Examine: The Scene
- A vertical, scrollable **engraved illustration** of the location, such as
  a study, a railway carriage, or a riverbank.
- Tapping a hotspot reveals a vignette and adds an evidence card. A
  pulsing-ink indicator shows how many items in the scene remain unfound
  (e.g. "4 of 6").
- Hotspots are generous in size (at least 44 pt) and the scene can be
  pinch-zoomed.
- **Every** evidence card is used in at least one later deduction, either as
  key evidence or as a deliberate red herring that a deduction rules out.
  Nothing is clutter.

### 7.3 Interrogate
- A witness portrait at the top, with Watson's narration and the witness's
  speech below.
- You choose **topics** to ask about (unlocked by evidence and earlier
  testimony) or **show** an evidence card to provoke a reaction.
- Every statement is recorded verbatim in the Testimony tab, broken into
  individually addressable sentences.
- Interrogation is exploratory and free. Contradicting a witness happens
  later, in the Mind Palace (§8.3), where it is scored.

### 7.4 Narration
- Watson's prose, styled like a Strand page: drop cap, ornamental rules, a
  half-page engraving at chapter openings.
- Tap or swipe to advance. Text appears a paragraph at a time, never
  letter by letter.
- Some clues arrive only here, in the Golden Age tradition: "I noticed,
  though I thought nothing of it at the time, that the Colonel's dog did not
  rise when the stranger entered."

---

## 8. The Mind Palace

> *The scene freezes. The ink drains from the world, and you are somewhere
> else.*

### 8.1 Presentation and the cutaway
- **Trigger:** narration reaches a point where Holmes must reason ("Holmes
  was silent for a long moment…"). A deduction can also be triggered from
  testimony with an **"Objection!"** gesture (§8.3).
- **Transition (~600 ms):** the sepia scene freezes, desaturates, and
  *inverts*, so ink becomes light on a black ground. The relevant elements
  (the testimony sentences, the evidence cards, the people involved) lift
  off the frozen scene and float into the Palace.
- **The Palace:** a dark, architectural space drawn in fine white line, like
  an engraving negative. Each puzzle type has its own "room": the Gallery of
  Testimony, the Evidence Room, the Chain Hall, the Map Room.
- **Declare:** press and hold for 0.6 s to submit, which prevents fat-finger
  submissions. A wrong Declare keeps you in the Palace (§9.1).
- **Exit:** when a Declare is correct, the Palace collapses back into the
  scene, colour returns, and Holmes speaks.
- The **Notebook** (§10) is always reachable from the Palace via a ribbon
  bookmark in the corner. **The Case File** is also available.
- The **Patience** meter is visible at the top of the screen.

### Puzzle types at a glance

| Type | Room | You construct… | LSAT kinship |
|------|------|----------------|--------------|
| **The Flaw** | Gallery of Testimony | the faulty step, plus the *name* of the error | LR: Flaw, Parallel Flaw |
| **Objection!** | Gallery of Testimony | the statement, plus the evidence that breaks it | LR: Weaken, Resolve/Explain, Inconsistency |
| **Corroborate** | Gallery of Testimony | the statement, plus the evidence that supports it | LR: Strengthen, Sufficient Assumption |
| **The Chain** | Chain Hall | a chain of linked premises ending in a conclusion | LR: Must Be True, Conditional Inference |
| **The Arrangement** | Map Room | a filled grid or timeline | Analytical Reasoning: Ordering, Grouping, Matching |
| **Observation** | Evidence Room | links from observations to inferences | LR: Most Strongly Supported, Explain |
| **The Missing Link** | Chain Hall | the unstated premise, built from phrase tiles | LR: Necessary / Sufficient Assumption |
| **The Reconstruction** | (Finale) | the full account, filled from a word bank | (none; the payoff) |

### 8.2 The Flaw
*"Lestrade's reasoning has a hole in it. Find it, and name it."*

- **Shown:** an argument (from Lestrade, Watson, a suspect or the client) as
  3–6 tappable sentences, each tagged in the UI by its role once you tap it
  (premise, conclusion, context).
- **Step 1, Locate:** tap the sentence where the reasoning breaks. Usually
  this is the conclusion or the inference step, sometimes a premise doing
  illegitimate work.
- **Step 2, Name:** choose the error from the **Fallacy Index** in your
  Notebook. Only fallacies you have *unlocked* appear, so early cases have
  3–4 options and later cases 15 or more. This is the "rarely multiple
  choice" exception, kept honest by the growing index and by combining it
  with Step 1.
- **Declare.** Both parts must be correct.
- **On a miss:** you lose one Patience, and that is all you learn. There is
  no feedback on which part was wrong (§9.1).

### 8.3 Objection! and Corroborate
*"The groom says he never left the stables. The river says otherwise."*

- **Shown:** a witness's testimony, sentence by sentence (Ace Attorney's
  cross-examination, rotated for portrait).
- **Objection:** select a sentence, then **present** an evidence card (or an
  Established fact) that contradicts or undermines it. Evidence slides up
  from the Case File drawer as a hand of cards.
- **Corroborate:** the same interaction, but you present evidence that
  *supports* a claim the police doubt. Used for clearing the innocent.
- **Weaken variant (LSAT-style, harder):** the target isn't a direct lie but
  a *causal or inferential* claim ("The dog howled, so the intruder must have
  been a stranger"). The correct card provides an **alternative
  explanation**. That is the Weaken skill in costume.
- Often triggered by the "Objection!" gesture *during* an Interrogation
  replay. Note that an objection can only be raised in a beat the generator
  designated as a deduction. Objecting at an arbitrary time is not possible,
  which keeps the scoring deterministic.

### 8.4 The Chain
*"If this, then that. And if that…"*

- **Shown:** a set of 5–9 **premise cards** drawn from evidence, testimony
  and established facts. Every card is true. Each is a fact or a conditional
  in period English ("No one who dined at the Hall left before ten," "The
  study can be reached only through the library"). Quantified cards ("some",
  "most", "all") arrive with tier 3.
- **Built:** drag cards onto the Chain Hall board and link them
  head-to-tail. The final link lands in a **Conclusion** slot that offers
  conclusions phrased on the fly from the end of your chain.
- **The prompt** states what must be determined ("What must be true of
  the murderer?").
- **Turning a card:** a chain starts from a fact card. Every conditional
  card you place can be **turned** (tap to cycle) through four readings,
  each written out in plain English with no labels: as stated, its
  *contrapositive*, its *converse*, and its *inverse*. You pick the reading
  that links to the end of your chain. Only the stated reading and the
  contrapositive are valid; the converse and inverse are the **traps**.
  They read naturally, they snap into place, and they lead to a wrong
  conclusion. "Unless" and "only if" cards make the stated reading itself
  hard to recognize, which is the point.
- **Why this design:** every link is a real test of telling the four
  readings apart. An earlier draft used separate "trap cards," which a
  player could beat by never using them.
- **Validation:** the declared chain must be *valid*, meaning each link
  follows, and must reach the target conclusion. Any valid chain counts, so
  alternative routes to the same conclusion are accepted.

### 8.5 The Arrangement
*"Five people passed the hall clock between eight and nine. In what order?"*

- **Shown:** the rules, numbered and drawn from testimony, plus a grid or
  timeline. Arrangement types:
  - **Ordering:** a timeline of slots (who arrived when).
  - **Grouping:** rooms, carriages, or teams (who was where).
  - **Matching:** a two-attribute grid (who owned which cane, and which
    cane was found where).
  - **Hybrid:** later in the curriculum.
- **Interaction:** tap a cell to cycle ✓ / ✗ / blank, or drag a person onto
  a slot. Pencil marks are free. You can annotate rules as "used".
- **Declare** the full arrangement. On a miss, you lose one Patience and get
  no other feedback, not even how many placements were wrong.
- **Sometimes the question is partial.** Instead of the full arrangement, it
  asks "Who must have been third?" or "Which pair *could* have been together
  in the library?" This is the classic logic-game question style, answered
  by tapping persons on the board.
- **Quality bar:** the solver confirms exactly one solution (or that the
  answer to the partial question is forced), and that the puzzle is solvable
  by *deduction without trial and error* (§14.4).

### 8.6 Observation
*"You see, but you do not observe."*

- **Shown:** your Observation cards from the cold read or the scene, and 4–7
  candidate **inference cards**, some of them plausible but wrong.
- **Built:** draw a thread from each observation to the inference it
  supports. Not every inference is used, and some observations may support
  nothing.
- **Teaches:** "most strongly supported" reasoning, and **alternative
  explanations**. The left-hand calluses suggest a violinist, *not* a
  left-handed person (see §16).

### 8.7 The Missing Link
*"The argument assumes something it does not say."*

- **Shown:** an argument with a visible gap between its premises and its
  conclusion.
- **Built:** complete the unsaid premise by filling a sentence frame's two
  blanks with **phrase tiles**: "If ___, then ___", "___ only if ___",
  "___ unless ___" or "No one who ___ could have ___". Four to six tiles:
  the two that link, and distractors from the case.
- **Validation:** code, never the case, gives each frame its logical form
  (`packages/logic/src/missinglink.ts`). The premise asked for is the one
  that is *enough* (a sufficient assumption): added to the premises, it
  makes the conclusion follow. The verifier checks that the premises alone
  fall short, and that exactly one premise, up to logical equivalence,
  closes the gap. The reversed link must not, so the converse is the
  built-in trap. "No one who A could have B" and "A unless B" read either
  way round say the same thing, and both orders are accepted.
- Introduced last in tier 3 (`unstated-premise`), because it is the hardest
  type to construct well.

### 8.8 The Reconstruction (Finale)
*"Then let me tell you what happened at Darrow Hall."*

- A Golden Idol-style passage of 4–8 sentences with blanks, covering **who,
  how, when, why**, and the *trick* (how the false appearance was created).
- Blanks are filled from a **word bank** harvested from the case: every
  person, item, time and motive you encountered, with no extra answers added
  that weren't in the case.
- Declaring is all-or-nothing. Unlike Golden Idol, a miss does **not**
  report how many blanks are wrong. The Reconstruction has its own Patience
  budget (§9).
- On success, Holmes delivers the full solution as the case's climax, with a
  full-page engraving.

---

## 9. Patience, Failure and Grading

### 9.1 The Patience meter
- Each chapter has a **Patience budget of 3**. The finale has its own
  budget, also 3. The budget is fixed, never adapted, and the same for
  every patience-holder.
- It is owned diegetically by whoever is watching Holmes work: Lestrade
  (drawn as bowler hats), the client (teacups), or Mycroft (clock hands).
  The meter works the same way in every case; only the art and dialogue
  change.
- **Every wrong Declare costs one point.** Nothing outside the Mind Palace
  costs Patience.
- **No feedback on a wrong Declare.** The answer is rejected (a struck-glass
  chime, and one Patience point falls), and nothing else is said: not which
  part was wrong, not how many placements or blanks were wrong. Your
  partial answer stays on the board so you can rethink it, but the game
  never tells you where the error is. The Notebook remains the only help.
- **When Patience runs out:** a short scene plays in which Lestrade storms
  off ("The case has gone cold, Mr. Holmes"), and the **chapter restarts**
  (decision 7). Evidence and testimony gathered *in that chapter* are reset.
  Everything from earlier chapters is kept.

### 9.2 Anti-memorization on restart
When a chapter restarts, every deduction you **failed** in that chapter is
swapped for an **alternate variant** where one exists. Every deduction slot
ships with 2–3 variants (§11.3), each verified against the same underlying
truth. You can't simply replay the answer you saw rejected; you have to
re-reason it. Deductions you got right keep the same variant.

### 9.3 Watson's Account (grading)
At the end of each case, Watson writes a short account of the case in the
Strand style, and its tone reflects your record:

| Grade | Criteria | Watson's framing |
|-------|----------|------------------|
| **Masterful** | No wrong Declares in the whole case | "Never had I seen my friend's faculties in finer order…" |
| **Workmanlike** | 1–3 wrong Declares, no chapter restarts | "Holmes stumbled once or twice, but…" |
| **Untidy** | 4 or more wrong Declares, or any restart | "I record this case not as one of his triumphs…" |

- The Casebook (the case select screen) shows each case's best grade as a
  wax seal.
- Replaying a case uses fresh variants wherever possible.

---

## 10. Holmes' Notebook

The **only** help in the game (decision 8). It is a reference, never a hint:
it explains *concepts*, and never says anything about the puzzle in front of
you.

### Structure
- **The Fallacy Index:** one entry per flaw type, such as *On the Gate and
  the Key* (treating a necessary condition as sufficient), *On the Shut
  Gate* (treating a sufficient condition as necessary), *On the Rooster and
  the Dawn* (correlation and causation), *On the Unrepresentative Witness*
  (biased samples), *On Some, Most and All* (errors of quantity: "some"
  read as "all", two "some" statements chained). Each logical error has exactly one entry, so a Flaw
  never has two defensible names.
- **The Methods:** entries on reasoning tools, such as *On Turning a
  Statement About* (the contrapositive), *On Reversed Arrows* (why the
  converse and inverse don't follow), *On "Only If" and "Unless"*, *On
  Ordering by Elimination*, *On the Unstated Premise*.
- **The Casebook Margins:** after you solve a deduction, it is appended to
  the relevant entry as a worked example in Holmes' hand. Your past cases
  become your textbook.

### Each entry contains
1. **Holmes' gloss:** a short, characterful explanation in period voice.
2. **The plain version:** a modern one-paragraph explanation, with a
   diagram where useful (arrow notation for conditionals).
3. **A worked example:** a canonical miniature example, never taken from a
   current case.
4. **Your examples:** solved deductions from your own cases.
5. **In the logic books** (small, unobtrusive): the concept's classic name,
   such as *The contrapositive, or modus tollens* or *Affirming the
   consequent*. Never a test's name (decision 18).

### Unlocking
Entries unlock **just before** a concept is first needed. Holmes recalls it
in narration ("Watson, you will recall my monograph on the converse error…")
and the Notebook glows. The unlocked set also defines the options available
in Flaw naming (§8.2), so the Notebook doubles as the puzzle's vocabulary.

---

## 11. Progression: Curriculum and Adaptive Difficulty

### 11.1 Concept graph
Every logic concept (Appendix A) is a node in a prerequisite graph. For
example, *Conditionals → Contrapositive → Converse trap → "Only if" → "Unless"
→ Conditional chains → Quantified chains*.

### 11.2 Curriculum rules (enforced by the pipeline)
- A case introduces **at most one new concept** and reinforces 2–3 known
  ones.
- A new concept's first appearance is a **gentle** variant: a single step,
  with the concept isolated from other complications.
- The first appearance of each **puzzle type** comes with a one-time
  **interaction guide** ("How this room works"), which covers the controls
  only, never the logic. The candle and the solve clock wait until it is
  read.
- Within a tier, concepts arrive in the order of `CONCEPTS` in
  `packages/schema/src/ids.ts`. Tier 3: the unrepresentative witness,
  attacking the man, two doors only, the slippery word, some/most/all, and
  last the unstated premise (the Missing Link).
- Season 1 covers tiers 1–2 of Appendix A. Later seasons add tiers 3–4.

### 11.3 Adaptive difficulty
Adaptivity has to work with *pre-generated, sealed* content (decision 13),
so it operates at two levels:

**In-app: variant selection.** Every deduction slot ships with 2–3
variants. They test the same underlying deduction but differ in difficulty
(more rules, more distractors, a longer chain) or exercise a different
concept (the same alibi broken by an Objection in one variant and by a Chain
in another). The app keeps a **skill rating per concept** (an Elo-style
estimate, updated on each Declare, weighted by first-try success and solve
time) and picks the variant for each slot when the chapter begins:

```
expected_success(variant) = σ(skill[concept] − difficulty[variant])
score(variant) = −|expected_success − 0.70|        // aim for ~70% first-try success
               + 0.15 × weakness_bonus(concept)    // lean into weak concepts
```

Built (`app/src/engine/adaptive.ts`): variant difficulty runs from 1
(gentle) to 5, and a new player rates 2 in every concept. Each first
Declare moves the ratings of the variant's concepts by 0.5 × (score −
expected), where a right answer scores 1 (0.8 if slower than three
minutes) and a wrong one 0; second tries teach nothing. The weakness bonus
is how far a concept's rating sits below 2, capped at 1. A chapter's
variants are chosen as it begins and stand until it restarts, when §9.2's
swap takes precedence.

**Between seasons: profile-guided generation.** The app can export a
**player profile** (concept ratings, solve times, error patterns such as
"often falls for the converse"). The pipeline reads it when generating the
next season, to choose curriculum targets and overall difficulty. Errors the
player keeps making become the next season's featured traps.

---

## 12. By Candlelight and Holmes' Ledger

**By Candlelight** is an optional toggle in Settings (decision 14), off by
default.

- In the Mind Palace, a **candle** burns down along the edge of the screen.
- Its length follows the deduction: about 85 seconds for a standard
  argument (a Flaw, an Objection, an Observation); 60 seconds plus 25 a rule
  and 10 an entity for an Arrangement; 15 more a card for a Chain; and 40
  plus 25 a blank for the Reconstruction (`app/src/engine/candle.ts`).
- **When the candle gutters out, it counts as one wrong Declare** (it costs
  one Patience) and the candle relights. You continue the same deduction.

**Holmes' Ledger** is reached from the Casebook. Every Declare is recorded
in either mode (case, deduction, variant, concepts, attempt number, time
since the Palace opened, and whether the candle went out). The Ledger shows,
for each Notebook concept met so far, how many deductions were solved at the
first Declare and the median time to a right answer ("2 of 3 at the first
declaration · typically 1m 40s"). The same records travel in the exported
save and feed adaptive difficulty (§11.3).

---

## 13. Presentation: Art, UI and Audio

### 13.1 Visual identity
- **Palette:** black ink, sepia, and aged paper (#F3E9D2-ish) in scenes.
  Inverted (warm white line on near-black) in the Mind Palace. **No other
  colour, with one exception:** the oxblood sealing wax of the grade seal
  (chosen by the player in v1.4). Highlights in the Mind Palace use
  brightness and line weight, not hue.
- **Illustration style:** Sidney Paget / Strand Magazine pen-and-ink with
  halftone and cross-hatching.
- **Typography:** a Caslon or Baskerville-style serif for body text (e.g.
  *Libre Caslon* or *EB Garamond*), small caps for headings, and an
  engraved display face for case titles. Minimum 17 pt body text, with
  user-adjustable size.
- **Ornaments:** Strand-style rules, drop caps, fleurons, and chapter
  headings set like "THE ADVENTURE OF THE STOPPED CLOCK."
- **Paper:** grain, foxing and a vignette drawn by SVG turbulence (no image
  files), laid over every paper surface alike. Cases are manila folders with
  a tab, twine when sealed, and an oxblood wax seal bearing the grade (M, W
  or U). Watson's Account is a letter that is stamped with that seal.
- **Printer's quotes:** case and Notebook text is set with curly quotes and
  apostrophes when a case is opened.
- **Motion** (CSS only; Reduce Motion turns it into cross-fades): pages ink
  in; rules draw themselves; the Mind Palace opens and closes as an iris
  from the centre; a wrong Declare shakes the board and cracks the glass,
  and a Patience pip is snuffed; a right one lets the colour return to the
  scene; Chain links draw and turned cards flip; placed entities settle into
  their slots. Patience pips take the holder's emblem: a bowler for the
  police, a clock for Mycroft, a teacup for anyone else.

### 13.2 Art production
**All art comes from genuine public-domain Victorian engravings. There is
no AI image generation** (decision 23). This keeps the look authentic and
consistent, and it means hotspot positions are always known, because the
pipeline composes the scenes itself:

1. **Asset library.** Public-domain Victorian engravings, Sidney Paget's
   Strand illustrations first, then other period illustrators, encyclopedia
   cuts and catalogues. `pipeline/art/plates.json` names each catalog tag's
   source page, original file, crop, focus point and licence (public domain
   or CC0 only). `afoot art build` downloads each original, crops it, takes
   it to greyscale, sets ink to black and paper to white from its histogram,
   and writes a WebP (portrait 560×640 for an oval frame, scene 720×960 for
   the upright Examine frame, vignette 640×480, the object shown whole on
   white). A plate may whiten scan marks or a neighbouring cut (`erase`).
   Images come from large Commons renderings (`thumb.wikimedia.org`), the
   Internet Archive and museum collections. 112 of the 116 tags have a
   plate; cigar ash, a thread, a will and a calling card keep their
   placeholder until a plate good enough turns up. The app lays every plate
   onto the paper with a multiply blend and one sepia filter, which is what
   makes plates from different sources look like one magazine. `afoot art
   check` (also a unit test) confirms every plate exists and is credited;
   the Credits screen lists every artist, work and source.
2. **Composition by the pipeline.** A scene is a background plus placed
   object layers. Because the pipeline *places* each evidence object, the
   hotspot coordinates are known by construction. Each object's vignette
   sits in a small paper medallion at its hotspot, with a faint ring
   breathing out from it until it is found.
3. **Portraits** are one figure from a plate, cropped for the oval. Detail
   overlays and expression variants are later work.
4. **The art catalog constrains the writing.** Every asset is tagged in a
   catalog (`app/public/art/catalog.json`): figure type, era, dress, pose,
   object, room type. The catalog is an input to pipeline stages 1–3, so a
   case may only call for people, places, objects and cold-read details the
   library can actually show. The consistency audit (stage 7) fails any case
   that references an art tag the catalog doesn't contain. When the stories
   start feeling limited by the art, the fix is to grow the library, not to
   generate images. A tag without a plate yet is drawn as a hatched
   placeholder.

### 13.3 Portrait screen layouts

**Scene (Narration, Interrogation)**
```
┌─────────────────────────────┐
│ ≡  Ch. II · The Scene   ●●○ │  ← chapter, Patience
├─────────────────────────────┤
│                             │
│   [ engraved illustration ] │  ← ~45% of the screen
│   [  witness portrait     ] │
│                             │
├─────────────────────────────┤
│ “I was in the stables all   │
│  evening, sir, from seven   │  ← text panel, Strand type
│  until the alarm.”          │
│                    — PIKE   │
│                             │
│  ┌ Ask: The dogs ┐ ┌ Show ┐ │  ← choices / actions in the
│  └───────────────┘ └──────┘ │     thumb zone
├─────────────────────────────┤
│        ︿ Case File          │  ← swipe-up drawer
└─────────────────────────────┘
```

**Mind Palace (Objection)**
```
┌─────────────────────────────┐
│ ✕   GALLERY OF TESTIMONY ●●○│   (inverted: white on black)
├─────────────────────────────┤
│ Pike's testimony            │
│ ┌─────────────────────────┐ │
│ │1 I never left the       │◄┼── selected sentence glows
│ │  stables from seven     │ │
│ │  until ten.             │ │
│ └─────────────────────────┘ │
│  2 I heard nothing unusual. │
│  3 The dogs never barked.   │
│                             │
├─────────────────────────────┤
│  PRESENT EVIDENCE           │
│ ┌────┐┌────┐┌────┐┌────┐ ›  │  ← hand of evidence cards,
│ │boot││clck││lamp││note│    │     scroll horizontally
│ └────┘└────┘└────┘└────┘    │
│                             │
│   [ HOLD TO DECLARE ]       │  ← press and hold 0.6 s
└─────────────────────────────┘
```

### 13.4 Ergonomics
- Portrait only, locked. Designed for one thumb: all actions sit in the
  bottom 40% of the screen.
- Respect safe-area insets (notch, Dynamic Island, home indicator). The strip
  under the status bar is plain paper, matching the status bar iOS paints in
  the theme colour; the Mind Palace switches the theme colour to its own
  black while it is open.
- A page's forward button sits in the same place on every page, so it
  ignores taps for a moment (0.45 s) after it appears or changes. A tap on
  the page reads on through narration, but only the button leaves it.
- Long text never requires horizontal scrolling. Arrangement grids of up to
  6×6 fit on a 375 pt-wide screen, and larger grids scroll vertically only.
- An accessibility text size setting, and Reduce Motion support (the Palace
  transition becomes a cross-fade).

### 13.5 Audio (decision 17: violin music and effects)
- **Music** follows the story in four cues, crossfaded: *theme* (title and
  Casebook), *investigation* (a case's scenes), *palace* (the Mind Palace)
  and *finale* (the Reconstruction's aftermath and Watson's Account). Each is
  an excerpt of a public-domain or CC0 string recording, faded at both ends
  so the loop seam is a breath.
- **Effects** are violin, from recordings released without restriction: a
  pizzicato *pluck* when you inspect or find something, a bowed chord that
  *reveals* a right Declare, a bowed minor-second *discord* for a wrong one,
  a low pizzicato for the *seal* on Watson's Account, and a *page* turn.
- `pipeline/audio/sounds.json` describes every cue as excerpts (source,
  start, length, level, entry offset for chords) with its credit;
  `afoot audio build` cuts, layers, fades and levels them with ffmpeg into
  AAC files and the manifest the app reads. A cue without a file is silent.
- In the app, effects are decoded once into memory; music streams from a
  media element fed by the whole file fetched once, so it is cached for
  offline play without holding a decoded track in memory.
- Separate volume sliders for music and sound. The game is fully playable
  muted.

---

## 14. Content Generation Pipeline

The heart of the project, and its biggest risk. **Goal:** produce cases the
player has never seen, every one of them fair, logically sound, and with a
unique solution, without the player ever reading them before play.

### 14.1 Principles
1. **Truth first, prose last.** The model never improvises a puzzle in
   prose. It first builds a **structured ground-truth world model**. Code
   derives and verifies the puzzles from that model. Only then is prose
   written around verified structure.
2. **Verify with code where possible, and with independent blind solvers
   where not.** Formal puzzle types (Arrangement, Chain, Missing Link) are
   checked by deterministic solvers. Argument puzzles (Flaw, Objection,
   Observation) are checked by structural rules *plus* multiple independent
   blind playthroughs.
3. **Nothing ships that fails a check.** A failing deduction is regenerated.
   A case that keeps failing is discarded.
4. **Spoiler hygiene.** Generation runs in sessions the player never opens,
   and everything those sessions report (final messages, commit messages,
   logs) contains only identifiers and pass/fail metrics, never story
   content (§14.7).
5. **No per-case cost.** The model work is done by Claude Code on the
   player's existing subscription (§14.5). Everything else is free,
   deterministic code.

### 14.2 Sources of story material (decision 12)
The **motif library** (`pipeline/motifs/`, format in Appendix B) holds:
- **Canon motifs**, abstracted from the public-domain Doyle canon and other
  public-domain Golden Age mysteries (Poe, Chesterton, Freeman, Collins,
  early Christie): plot devices such as *the tampered clock*, *the
  impersonated heir*, *the dog that did not bark*, *the locked room with a
  second door*, *the false trail laid for the police*, *the victim who is the
  villain*.
- **Fandom tropes**, popular premises and situations from Holmes fandom,
  captured *as abstract premises* (*Holmes faces an intellectual equal*,
  *Watson is the client*, *a case Holmes once got wrong returns*, *Mycroft
  needs deniable help*, *Mrs. Hudson's past*). This is a personal-use
  project, so fandom inspiration is in scope. The library stores tropes and
  premises, not text taken from specific fan works, which also keeps the
  generator recombining ideas instead of retelling stories.
- **Period texture:** professions, railway lines, poisons known in the era,
  telegram conventions, and social settings.

The library excludes Moriarty and any motif that depends on a long-running
conspiracy (decision 24). Every case is self-contained. A serial
season's thread (decision 27) is the generation session's own invention, not
a library motif, and is never Moriarty or a stand-in for him.

Each case combines 2–3 motifs (one central trick and one or two
complications), a setting, and the curriculum targets. A **novelty check**
keeps the season's motif combinations distinct and avoids reusing a central
trick within the last N cases.

### 14.3 Pipeline stages

```
 ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐
 │ 1 CONCEPT    │──►│ 2 WORLD MODEL  │──►│ 3 DEDUCTION PLAN │
 │ motifs,      │   │ ground truth:  │   │ beats, deduction │
 │ curriculum,  │   │ cast, timeline,│   │ slots + variants,│
 │ setting      │   │ facts, clues   │   │ formal specs     │
 └──────────────┘   └────────────────┘   └────────┬─────────┘
                                                   ▼
 ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐
 │ 6 BLIND      │◄──│ 5 PROSE        │◄──│ 4 FORMAL VERIFY  │
 │ PLAYTEST     │   │ Watson's voice │   │ solvers, fair-   │
 │ ×3 solvers + │   │ around verified│   │ play graph,      │
 │ adversary    │   │ structure      │   │ uniqueness       │
 └──────┬───────┘   └────────────────┘   └──────────────────┘
        ▼
 ┌──────────────┐   ┌────────────────┐
 │ 7 CONSISTENCY│──►│ 8 ASSETS +     │──►  sealed .case bundle
 │ AUDIT prose  │   │ SEAL (compose  │
 │ vs. truth    │   │ scenes, encrypt│
 └──────────────┘   └────────────────┘
```

Every stage is either **writing**, done by the generation session (§14.5), or
**code**, done by the `afoot` CLI the session runs. The session never judges
its own work. It writes, runs the checker, and fixes what the checker
reports.

| # | Stage | Who | Output |
|---|-------|-----|--------|
| 1 | **Concept** | Session | Motif selection, setting, a one-paragraph secret synopsis, curriculum targets (from the player profile) |
| 2 | **World model** | Session writes JSON; `afoot validate` checks it against the schema | Full ground truth: cast (with secrets and motives), locations, a minute-level timeline of true events, physical evidence, what each witness knows, believes and will lie about, plus red herrings and their innocent explanations |
| 3 | **Deduction plan** | Session, then `afoot validate` | Beat sequence, and for each deduction slot: type, concepts, 2–3 variants, each with a **formal spec** (below) |
| 4 | **Formal verification** | `afoot verify` | Pass or fail per deduction. Fair-play graph check. Difficulty metrics. |
| 5 | **Prose** | Session | Narration, dialogue and puzzle text, written *from* the specs with fixed fact anchors |
| 6 | **Blind playtest** | 3 blind-solver sub-agents plus 1 adversary sub-agent, with no access to the truth (§14.5) | Each solver sees only what the player would see and must reach the intended answer. The adversary tries to argue for a different defensible answer. |
| 7 | **Consistency audit** | `afoot audit` (names, times, places, art tags) plus a session read-through | The prose contradicts no world-model fact and leaks no answer early. Proper nouns, times and places match the model. |
| 8 | **Assets and seal** | `afoot compose` and `afoot seal` | Scenes composed and hotspots placed, the bundle encrypted |

### 14.4 Formal specs and verifiers per puzzle type

| Type | Formal spec | Verifier |
|------|-------------|----------|
| **Arrangement** | Entities, slots, and constraints in a small DSL (`before(A,B)`, `adjacent(A,B)`, `not_in(A,{1,5})`, `same_group(A,B)`…) | A backtracking solver confirms **exactly one** solution, or that the partial-question answer is forced. A human-style propagation solver confirms it is solvable **without guessing**, and its step count sets the difficulty score. |
| **Chain** | Premises as typed logical forms (`A→B`, `all(X,Y)`, `some(X,Y)`, `A→¬B`), with surface phrasing ("only if", "unless") mapped to logical form by **code, not by the model** | Forward chaining with contrapositives confirms the target is entailed and no distractor is. Each card's converse and inverse readings are confirmed *not* to follow (so they really are traps), and at least one distractor must be reachable through them. |
| **Missing Link** | Argument in logical form, plus the gap | The solver confirms the intended premise is necessary (or sufficient), and that every tile combination reaching a *different* logical form fails the test. |
| **Flaw** | Sentences with roles, the failing sentence id, a flaw type from the taxonomy, and (for formal flaws) the argument's logical form | Formal flaws (converse, necessary/sufficient, quantifier errors) are checked mechanically. All flaws go through blind playtest agreement (3 of 3) plus the adversary pass. |
| **Objection / Corroborate** | Each testimony sentence mapped to world-model propositions; each evidence card mapped to the facts it establishes | Code computes every (sentence, evidence) pair that contradicts or supports. There must be **exactly one** intended pair, and no unintended pairs among the cards available. |
| **Observation** | Observation-to-inference links grounded in world-model facts, with distractors grounded in "defeaters" | Blind playtest agreement, plus an adversary pass on each distractor. |
| **Reconstruction** | Each blank mapped to a world-model field and to the deduction ids that establish it | Code confirms every blank is determined by earlier deductions (fair play) and the word bank contains each correct answer exactly once. |

**Fair-play graph (all cases):** every deduction lists the clue ids it
requires, and the beat order must introduce each clue *before* the
deduction that uses it. Chapter-restart variants must satisfy the same
graph.

### 14.5 The generation runner: Claude Code
There is **no Claude API usage and no per-case cost** (decision 25). The
writing stages are performed by a **Claude Code session** running on the
player's existing Claude subscription, the same way this design was
written. Generation uses up plan usage limits instead of money.

**The pieces**

| Piece | Where | What it does |
|-------|-------|--------------|
| **`afoot` CLI** | `pipeline/` (TypeScript, Node; `npm run afoot`) | All the deterministic stages: `next`, `validate`, `verify`, `audit`, `compose`, `view`, `check`, `adversary`, `status`, `seal`, `sealed-check`, `motifs`. Free to run, and the only judge of pass or fail. |
| **Generation skill** | `.claude/skills/generate-case/SKILL.md` | The step-by-step procedure the session follows for stages 1–8, including the retry rules and the spoiler protocol. |
| **Blind-solver agent** | `.claude/agents/blind-solver.md` | A sub-agent definition **with no file or shell tools** (Claude Code can't define a sub-agent with zero tools, so it gets only web search, which can't reach the unpushed plaintext). It receives only the player view, passed into its prompt. |
| **Adversary agent** | `.claude/agents/adversary.md` | Same restrictions. Given the player view *and* the intended answer, it tries to argue for a second defensible answer. |
| **Motif library and art catalog** | `pipeline/motifs/motifs.yaml`, `app/public/art/catalog.json` | The inputs the session draws from. |

**One case per session.** Each session generates exactly one case, from
concept to sealed bundle, then commits and ends:

1. Read the skill, the motif library, the art catalog, the curriculum
   state, and the latest player profile (if one has been committed).
2. Write the concept, world model and deduction plan as JSON in
   `content/.plain/`. Run `afoot validate` and `afoot verify`, and fix and
   re-run until everything passes.
3. Write the prose. Run `afoot audit`.
4. For each deduction variant, run `afoot view` to export only what the
   player would see. Argument puzzles (Flaw, Objection, Observation) go to
   three blind solvers and one adversary; formal puzzles and the finale to
   one blind solver. Check each answer with `afoot check --solver`, which
   records the result against a hash of the puzzle, so revising a puzzle
   voids its old results and a failed puzzle must change before it can pass.
5. Run `afoot compose` and `afoot seal`, delete `content/.plain/`, and
   commit only the sealed case.
6. If a case still fails after a set number of revision rounds (default 3
   per deduction), discard it and start a fresh concept.

Because each session handles a single case, the context stays small and a
session that runs into a usage limit loses at most one unfinished case. Its
plaintext dies with the session's container and the case is simply
regenerated next time.

**Starting a season.** Either run one cloud session per case, or set up a
scheduled routine that starts a fresh session each night until the season
has its 6–10 cases. The player profile reaches the generator by committing
the exported `profile.json` to `content/profiles/` (from the iPhone, via
the GitHub app or website). A profile isn't a spoiler.

**Model quality.** It's the same family of Claude models the API would
have used, and the quality guarantee comes from the `afoot` checks, not
from trusting the writer.

### 14.6 Sealing
- Output: one `season-N.bundle` containing per-case JSON, compressed and
  encrypted with AES-GCM (WebCrypto in the app).
- The key ships in the app. This is **spoiler protection, not security.** It
  only has to stop the player from reading a case by accident.
- Plaintext lives only in a git-ignored `content/.plain/` directory inside
  the generation session's container. It is deleted after sealing and is
  never committed or pushed.
- A repository `CLAUDE.md` rule instructs every coding session that isn't a
  generation session never to decrypt, display, summarize, or quote case
  content.

### 14.7 Spoiler protocol for generation sessions
The person who can read a Claude Code session's transcript is the player.
So:

- **Never open a generation session.** Generation runs in background cloud
  sessions or scheduled routines, titled like "Sealed generation, do not
  open: S1 case 3."
- **Metric-only reporting.** The skill requires the session's final message
  to be a fixed template, for example `S1 case 3: SEALED. 9/9 deductions
  verified, 27/27 blind solves, 0 adversary objections, 2 revisions.` It
  contains no title, names, motifs or plot.
- **Metric-only commits.** Commit messages follow the same template. The
  case title is inside the sealed bundle, not in a file name.
- **Notifications** from scheduled routines carry the session's final
  message, so they are metric-only too.
- **Status lines.** A session's status summary (what a session list or an
  orchestrating session shows) is generated from its narration, task list
  and sub-agent descriptions, so those are content-free too, and deduction
  slots have neutral ids (`d1`, `d2`, …).
- **Development sessions** (building the app) work against the hand-written
  §16 sample case and never decrypt real content.

---

## 15. Technical Architecture

### 15.1 Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Build | **Vite + TypeScript** | Fast iteration. |
| UI | **React** | With CSS modules and CSS custom properties for the two palettes. |
| Animation | **CSS animations** | The Mind Palace transition and the struck-glass shake. (Framer Motion was the plan; plain CSS proved enough for M1.) |
| State | **Zustand** | A small store, serializable for saves. |
| Persistence | **IndexedDB** (via `idb-keyval`) | Saves, the profile, and settings. Export and import as a JSON file for backup. |
| Offline | **vite-plugin-pwa** (Workbox) | Precaches the app shell, fonts, art and sealed bundles. |
| Audio | **Web Audio API** | Loops and crossfades. Unlocked on the first tap, as iOS requires. |
| Schema | **Zod** | One case schema shared by the app and the pipeline. |
| Logic core | **Pure TypeScript package** | Arrangement solver, Chain checker, logical-form compiler, used by both the app and the pipeline. |
| Pipeline | **Node CLI (`afoot`)**, no model SDK | Deterministic stages only. The model work is done by Claude Code sessions following `.claude/skills/generate-case/` (§14.5). |
| Hosting | **Cloudflare Pages or Netlify** (free, deploy from a private repo) | GitHub Pages also works if the repo is public. The bundles are sealed either way. |

### 15.2 Repository layout (proposed)
```
/
├── GAME_DESIGN.md          ← this document
├── CLAUDE.md               ← agent rules, including the spoiler rule
├── .claude/
│   ├── skills/generate-case/  ← the generation procedure (§14.5)
│   └── agents/             ← blind-solver and adversary (no file tools)
├── packages/
│   ├── schema/             ← Zod case schema, types and Notebook entries (shared)
│   ├── logic/              ← solvers and validators (shared, unit-tested)
│   └── seal/               ← seal/unseal, shared by the pipeline and the app
├── app/                    ← the PWA
│   ├── src/
│   │   ├── scenes/         ← Narration, Observe, Examine, Interrogate
│   │   ├── palace/         ← one module per puzzle type
│   │   ├── notebook/
│   │   ├── casefile/
│   │   └── engine/         ← beat runner, save system, Patience, adaptivity
│   └── public/art/         ← the engraving catalog (and, later, the engravings)
├── pipeline/
│   ├── motifs/             ← motif library (YAML)
│   └── src/                ← the afoot CLI: validate, verify, player-view,
│                              check-answer, audit, compose, seal
└── content/
    ├── sealed/             ← committed: season bundles
    ├── profiles/           ← committed: exported player profiles
    └── .plain/             ← git-ignored, transient
```

### 15.3 iOS PWA considerations
- **Install:** Safari → Share → Add to Home Screen. Use
  `display: standalone`, `orientation: portrait`, and the Apple touch icons
  and splash screens.
- **Storage eviction:** Safari can clear website data that hasn't been used
  recently, and installed home-screen apps are treated more generously. The
  game also offers **Export Save**, to the Files app, after each case.
- **No haptics:** iOS Safari does not support the Vibration API, so feedback
  is visual and audio only. Don't design around haptics.
- **Gestures:** disable pull-to-refresh and overscroll bounce inside the
  game surface (`overscroll-behavior: none`), and avoid the left-edge swipe,
  which iOS reserves for back navigation.
- **Audio** must start from a user gesture (the title screen's "Begin" tap
  does this).

### 15.4 Case schema (sketch)
```ts
type Case = {
  id: string; title: string; season: number;
  concepts: { introduces?: ConceptId; reinforces: ConceptId[] };
  cast: Person[]; locations: Location[];
  evidence: EvidenceCard[]; // hotspot coordinates included
  chapters: Chapter[];
  reconstruction: Reconstruction;
  account: { masterful: string; workmanlike: string; untidy: string };
};

type Chapter = { id: string; title: string; patience: number; beats: Beat[] };

type Beat =
  | { kind: "narration"; paragraphs: string[]; art?: ArtRef }
  | { kind: "observe"; subject: PersonId; details: ObservationDetail[] }
  | { kind: "examine"; scene: SceneRef; hotspots: EvidenceId[] }
  | { kind: "interrogate"; witness: PersonId; topics: Topic[] }
  | { kind: "deduction"; slot: DeductionSlot };

type DeductionSlot = {
  id: string; requires: ClueId[];            // fair-play graph
  variants: DeductionVariant[];              // 2–3, verified
  onSolved: { holmesSpeaks: string; establishes: FactId[] };
};

type DeductionVariant = {
  id: string; difficulty: number; concepts: ConceptId[];
} & (FlawPuzzle | ObjectionPuzzle | ChainPuzzle | ArrangementPuzzle
     | ObservationPuzzle | MissingLinkPuzzle);
```
The answer is part of each variant, so it is validated on the device. That's
acceptable because the bundle is sealed.

---

## 16. Illustrative Case: The Stopped Clock

*This sample shows how each puzzle type plays. It is hand-written, will never
appear in the generated game, and doubles as the development test fixture
for the vertical slice.*

**Premise.** Surrey, 1891. Mr. Silas Orme, solicitor to Colonel Hugh
Darrow, is found dead in the study at Darrow Hall. The hall clock has been
smashed, its hands stopped at 9:14. At 9:14, by every account, the Colonel
and his business partner Mr. Julian Vance were at cards in the drawing
room. Miss Clara Darrow travels up to Baker Street the next morning.

**Cast:** Colonel Darrow, Miss Clara Darrow, Mr. Julian Vance, Pike (the
groom), Mrs. Hale (the housekeeper).

### Chapter I: The Client

**Observe → Observation deduction**

| Observation (tapped vignettes) | Inference cards offered |
|---|---|
| O1 The return half of a first-class ticket from Guildford, tucked into her glove | **A.** She travelled up from Surrey this morning ✔ |
| O2 A violet ink stain on the inside of the right middle finger, half scrubbed away | **B.** She wrote a letter in haste before setting out ✔ |
| O3 Hard calluses on the fingertips of her *left* hand, and a faint mark under the left side of her jaw | **C.** She plays the violin, and seriously ✔ |
| | **D.** She is left-handed ✘ *(the trap: an alternative explanation the evidence doesn't support; violinists stop the strings with the left hand)* |
| | **E.** She has lately come out of mourning ✘ *(no supporting observation)* |

Correct links: O1→A, O2→B, O3→C. *Concept: alternative explanations.*

**Flaw deduction.** Miss Darrow reports that Orme received a threatening
letter on the Colonel's blue paper the week before he died. Watson, eager:

> ① "Whoever wrote that letter must have had access to the Colonel's
> desk, for the paper is his own blue stationery."
> ② "Miss Darrow herself tells us she uses that desk every morning."
> ③ "It follows that Miss Darrow wrote the letter."

- **Locate:** ③.
- **Name:** *On the Gate and the Key*: it treats a **necessary** condition
  (access to the desk) as if it were **sufficient**.
- Holmes speaks: *"Access is the gate, Watson, not the key. Half the house
  passes that desk daily."*

### Chapter II: The Scene

**Examine** the study and hall. Evidence cards: *the smashed clock (hands at
9:14; the glass broken from the front, but no glass on the floor beneath)*,
*Orme's cold teacup*, *the library door key*, *Pike's boots (wet grey river
clay)*, *a half-burned partnership deed in the grate*.

**Arrangement deduction: who passed the hall clock?** From Mrs. Hale's
recollections and the servants' testimony, the order in which five people
passed through the hall between eight and nine:

1. Mrs. Hale passed immediately after the Colonel.
2. Pike was neither the first nor the last.
3. Miss Darrow passed after Mrs. Hale.
4. Pike passed before the Colonel.

*Solution (verified unique, solvable without guessing, and with no
redundant rule, by `@afoot/logic`):* **Vance, Pike, Colonel, Mrs. Hale,
Miss Darrow.** Vance was first, and alone in the hall well before nine.

### Chapter III: The Witnesses

**Interrogate → Objection deduction.** Pike's testimony:

> ① "I never left the stables from seven until the alarm at ten."
> ② "I heard nothing unusual."
> ③ "The dogs never barked once."

- **Present:** *Pike's boots (wet grey river clay)* against ① (the river path
  lies on the far side of the house from the stables).
- Holmes speaks, and Pike confesses to slipping out to meet Mrs. Hale's
  niece at the river. **A red herring is resolved:** Pike lied, but not
  about murder.

**Chain deduction.** *"What must be true of the murderer?"*

| Card | Stated reading |
|---|---|
| P1 | If the clock was stopped deliberately, then the murderer wished to fix a false time of death. |
| P2 | The murderer wished to fix a false time only if he had an alibi for that false time. (*"only if": wished → alibi*) |
| P3 | The clock was stopped deliberately. *(fact; Established: the glass broke from the front, with no glass beneath)* |
| P4 | If the murderer was one of the servants, he had no alibi for 9:14, for the servants were below stairs and unaccounted for. |
| P5 | The dogs did not bark. *(fact)* |
| P6 | If the murderer was one of the servants, the dogs would not have barked. |

Valid chain: **P3 → P1 → P2 → P4 turned to its contrapositive** ("If the
murderer had an alibi for 9:14, he was not one of the servants") **⇒ "The
murderer was not one of the servants."**

The trap: start from P5 and turn P6 to its *converse*, "If the dogs did not
bark, the murderer was one of the servants." It reads naturally and snaps
into place, but it affirms the consequent and reaches the opposite
conclusion. Holmes speaks: *"The man we seek is no servant, Watson. He is a
man with the best alibi in the house."* The twist points at the card table.

### Finale: The Reconstruction

> **[Mr. Vance]** killed Mr. Orme **[before nine]**, when he was alone in
> the hall. He set the clock's hands to **[9:14]** and broke it, so that his
> card game with **[the Colonel]** would serve as his alibi. His motive was
> **[the forged partnership deed]**, which Orme had discovered.

Word bank: every person, time, object and motive from the case (Pike, Miss
Darrow, after ten, the threatening letter, the library key, and so on).
Every blank traces to an earlier deduction: *before nine* and *alone in the
hall* from the Arrangement, *9:14* and the alibi from the Chain, and the deed
from the Examine scene.

---

## 17. Roadmap

| Milestone | Scope | Done when |
|-----------|-------|-----------|
| **M0: Foundations** ✓ | Repo scaffold, `CLAUDE.md` with the spoiler rule, Zod schema, the logic package (Arrangement solver, Chain checker) with unit tests | The solvers verify §16's puzzles in CI |
| **M1: Vertical slice** ✓ | PWA shell, beat engine, Narration, Observe, Examine and Interrogate screens, all Mind Palace types, Case File, Notebook (5 entries), Patience and chapter restart, saves. Content: §16 hand-encoded. | §16 is playable start to finish on an iPhone from the home screen |
| **M2: Pipeline v1** ✓ | The `afoot` CLI, the generate-case skill, blind-solver and adversary agents, motif library (~40 motifs), art catalog | One case generated in an unopened session passes every check and is played blind |
| **M3: Season 1** | 8 cases, curriculum tiers 1–2, variants and adaptive selection, Watson's Account, grading | The season is played; tune difficulty from the exported profile |
| **M4: Polish** ✓ | Mind Palace transition, audio, By Candlelight, Holmes' Ledger, engraving library, visual pass | Feels like a finished game |
| **Later** | Profile-guided Season 2, tiers 3–4, a possible season arc (deferred, decision 24) | — |

---

## 18. Risks

| Risk | Mitigation |
|------|------------|
| **Generated argument puzzles are ambiguous** (two defensible flaws) | Formal encoding wherever the flaw type allows it, 3-of-3 blind agreement, an adversary pass, and discarding on doubt |
| **Doyle-voice prose is flat or repetitive** | A style guide prompt with canon excerpts (public domain), an editing pass, a banned-phrase list, and per-season vocabulary variety checks |
| **Difficulty is miscalibrated** | Solver step counts and blind-solver effort as proxies, the 70% target band, and profile feedback between seasons |
| **Mysteries feel samey** | Motif novelty check, a varied case template, a large motif library, and per-season motif rotation |
| **Art consistency and hotspot coverage** | The composed-engraving approach (§13.2), and a curated library built once and reused |
| **The engraving library limits what stories can show** | The art catalog feeds the generator (§13.2), and the library grows between seasons |
| **Accidental spoilers** during development (the player is the developer) | Sealed bundles, unopened generation sessions, metric-only reports and commits (§14.7), the `CLAUDE.md` rule, and plaintext that never leaves the session's container |
| **Subscription usage limits** slow down generation | One case per session, so a limit costs at most one case. Spread a season over several days with a scheduled routine. |
| **iOS clears saved data** | Install to the home screen, plus Export Save |

There are no open design questions as of v1.0. New questions that come up
during building are added to the decisions log once they're settled.

---

## Appendix A: Logic Concept Taxonomy

Tiers set the curriculum order. The LSAT column is for design only and never
appears in the app (decision 18); the Notebook shows each concept's classic
name from the logic books (`term` in `packages/schema/src/notebook.ts`).

| Tier | Concept (Notebook title) | Plain meaning | LSAT glossary | Typical puzzle types |
|------|--------------------------|---------------|---------------|----------------------|
| 1 | *On Seeing and Observing* | Inferring from physical detail, and alternative explanations | Most Strongly Supported | Observation |
| 1 | *On the Plain Contradiction* | Two statements can't both be true | Inconsistency | Objection |
| 1 | *On If and Then* | Basic conditionals | Conditional reasoning | Chain |
| 1 | *On Turning a Statement About* | The contrapositive | Contrapositive | Chain |
| 1 | *On Order by Elimination* | Simple sequencing | Ordering games | Arrangement |
| 2 | *On Reversed Arrows* (Method) | The converse and inverse don't follow from a conditional | Mistaken Reversal / Negation | Chain (turning cards) |
| 2 | *On the Gate and the Key* | Treating a necessary condition as sufficient (affirming the consequent) | Sufficient/Necessary Confusion | Flaw, Missing Link |
| 2 | *On the Shut Gate* | Treating a sufficient condition as necessary (denying the antecedent) | Mistaken Negation | Flaw |
| 2 | *On "Only If" and "Unless"* | Translating tricky conditionals | Conditional indicators | Chain |
| 2 | *On the Rooster and the Dawn* | Correlation versus causation | Causal flaw | Flaw, Objection (Weaken) |
| 2 | *On the Other Explanation* | Alternative causes weaken causal claims | Weaken: alternative cause | Objection |
| 2 | *On Who Stood Where* | Grouping and in/out selection | Grouping games | Arrangement |
| 3 | *On Some, Most and All* (Fallacy Index) | Quantifier logic | Formal logic: quantifiers | Flaw |
| 3 | *On the Unrepresentative Witness* | Biased or small samples | Sampling flaw | Flaw |
| 3 | *On Attacking the Man* | Source attacks instead of arguments | Ad hominem | Flaw |
| 3 | *On the Slippery Word* | Equivocation | Equivocation | Flaw |
| 3 | *On the Unstated Premise* | Sufficient assumptions | Assumption questions | Missing Link, Corroborate |
| 3 | *On Two Doors Only* | False dichotomy | False choice | Flaw |
| 4 | *On the Part and the Whole* | Composition and division | Part/whole flaw | Flaw |
| 4 | *On Proportion and Number* | Percentages versus totals | Numbers vs. percentages | Flaw, Objection |
| 4 | *On Arguing in a Circle* | Circular reasoning | Circular reasoning | Flaw |
| 4 | *On Absence of Evidence* | Treating a lack of proof as disproof | Absence of evidence | Flaw |
| 4 | *On Parallel Errors* | Matching the structure of a flawed argument | Parallel Flaw | Flaw (structure-matching variant) |
| 4 | *On Complex Arrangements* | Hybrid ordering and grouping | Hybrid games | Arrangement |

---

## Appendix B: Motif Library Format

```yaml
- id: tampered-clock
  source: canon-pd          # canon-pd | golden-age-pd | fandom-trope | original
  kind: central-trick       # central-trick | complication | premise | setting
  summary: >
    A clock is set to a false time and stopped, to fix a time of death for
    which the culprit holds an alibi.
  requires: [timepiece, alibi-witness]
  fair-play-tells:          # what the player must be able to observe
    - physical sign the stop was staged (glass pattern, winding state, dust)
    - a second, independent time source contradicts the clock
  pairs-well-with: [false-alibi-by-card-game, servant-red-herring]
  concepts: [conditionals, alternative-explanation, ordering]

- id: watson-is-the-client
  source: fandom-trope
  kind: premise
  summary: >
    Watson brings Holmes a personal matter (an old army friend, a patient)
    and his closeness to it clouds his reasoning, so he becomes a natural
    source of flawed arguments.
  concepts: [flaw-*, ad-hominem]
```

---

*"It is a capital mistake to theorize before one has data."*
— *A Scandal in Bohemia*

---

## Document History

| Version | Changes |
|---------|---------|
| v0.1 | First draft from the design interview (decisions 1–19). |
| v0.2 | Strictly sequential cases, no feedback on wrong answers, Patience of 3 (decisions 20–22). |
| v0.3 | Public-domain engravings only, no Moriarty storyline (decisions 23–24). |
| v0.4 | Generation moved from the Claude API to Claude Code sessions, with a spoiler protocol (decision 25). |
| v1.0 | Reading Comprehension ruled out (decision 26). Polish pass: cross-references fixed, Mind Palace exit clarified, remaining inconsistencies removed. Final. |
| v1.7 | Season 2 is a serial season, as an experiment: a thread and its people carry from case to case and resolve in the season's last case; each case still stands alone (decision 27, §5). Generation sessions keep their status lines content-free and their deduction slot ids neutral (§14.7). The story so far (§6), the forward button's settle, and the status-bar strip (§13.4). |
| v1.6 | The engraving library: 112 of 116 catalog tags have a public-domain plate (Paget's Strand illustrations, Cassell's *Old and New London*, Doré, Gross's *Criminal Investigation*, trade catalogues, museum prints). Evidence objects sit in paper medallions in Examine scenes (§13.2). |
| v1.5 | Season 2 groundwork. Tier 3's Notebook entries; *On Some, Most and All* moves to the Fallacy Index. The Missing Link is built as a sufficient-assumption puzzle with code-owned frames (§8.7). Adaptive variant selection and one-time room guides are built (§11.2, §11.3); variant difficulty is 1–5. |
| v1.4 | M4 built. The test is never named in the app; the Notebook shows classic logic terms (decision 18). Audio is violin music and violin effects, with no ambience (decision 17, §13.5). Test Conditions is renamed By Candlelight, and Holmes' Ledger records every Declare (§12). Visual system, motion and the engraving build are written down (§13.1, §13.2); the grade seal's oxblood wax is the palette's one colour. |
| v1.3 | M2 built. The art catalog is JSON. The Notebook moved into the shared schema package. Seal format: gzip + AES-GCM + base64 in `packages/seal`. Playtest records are tied to a hash of the puzzle. Blind playtest counts: three solvers and an adversary for argument puzzles, one solver for formal puzzles and the finale. Motif suggestions use a random seed so nothing outside a generation session can predict them. |
| v1.2 | M1 built. Animation uses CSS instead of Framer Motion. The vertical slice uses placeholder engraving plates until the art catalog exists. The Missing Link puzzle type is deferred to the tier 3 curriculum. |
| v1.1 | Corrections found while building the M0 checkers. The Chain's traps are now converse and inverse *readings* of true cards rather than separate trap cards (§8.4). The Fallacy Index splits necessary/sufficient errors into two entries so no Flaw has two right names (§10, Appendix A). The §16 Arrangement drops two redundant rules, and its Chain gains a real converse trap. |
