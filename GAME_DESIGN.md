# The Game Is Afoot — Game Design Document

> *"You see, but you do not observe. The distinction is clear."*
> — *A Scandal in Bohemia*

**Status:** Draft v0.1, written from a design interview, October 2026
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
12. [Test Conditions Mode](#12-test-conditions-mode)
13. [Presentation: Art, UI and Audio](#13-presentation-art-ui-and-audio)
14. [Content Generation Pipeline](#14-content-generation-pipeline)
15. [Technical Architecture](#15-technical-architecture)
16. [Illustrative Case: The Stopped Clock](#16-illustrative-case-the-stopped-clock)
17. [Roadmap](#17-roadmap)
18. [Risks and Open Questions](#18-risks-and-open-questions)
19. [Appendix A: Logic Concept Taxonomy](#appendix-a-logic-concept-taxonomy)
20. [Appendix B: Motif Library Format](#appendix-b-motif-library-format)

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
conditional logic, inference, and ordering and grouping. It is wrapped in a
mystery that has to be satisfying in its own right.

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
   LSAT-style reasoning, but the game never feels like a test-prep app. LSAT
   terminology is present (in the Notebook glossary) and never forced on you.
5. **Built for the phone in your hand.** Portrait, one thumb, playable in
   5-minute bursts, with autosave at every beat. A 30-minute case survives
   being interrupted ten times.

---

## 3. Decisions Log

The decisions made in the design interview, with the reasoning behind each.

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
| 14 | Timing | **Untimed by default, plus an optional Test Conditions mode** | Thinking time is respected, and timed practice is available when wanted. |
| 15 | Progression | **Notebook curriculum** plus **adaptive difficulty** | Concepts arrive gradually, and the game leans into your weak spots. |
| 16 | Investigation | **All of them:** linear story spine, plus Observe (cold read), Examine scenes, and Interrogate set pieces | The story stays brisk, with hands-on moments at the key beats. |
| 17 | Audio | **Ambient sound and music only**, no voice | Atmosphere without narration cost. |
| 18 | LSAT fidelity | **LSAT-flavored only** | The mystery comes first. LSAT concepts inform design, and an internal tag system powers adaptivity. |
| 19 | Title | **The Game Is Afoot** | Chosen by the player. |
| 20 | Case order | **Strictly sequential**, one open case at a time | Keeps the curriculum and adaptive tuning in a fixed order. |
| 21 | Wrong-answer feedback | **None**: a miss costs one Patience and reveals nothing | Purist, consistent with decision 8. Guessing teaches nothing. |
| 22 | Patience budget | **3 per chapter**, 3 for the finale, for every patience-holder | Confirmed by the player after the first draft. |
| 23 | Art source | **Public-domain engravings only**, with no AI image generation | Authentic period look. The pipeline writes cases to fit the art catalog. |
| 24 | Story arc | **Standalone cases, no Moriarty storyline yet.** Moriarty is excluded from the motif library for now. | Keeps every case self-contained. An arc can be revisited later. |

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
| **Mycroft Holmes** | Occasional client for government cases, and an occasional patience-holder whose patience is especially short. |
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
| **Case** | 3–4 chapters, 6–10 deductions | One self-contained mystery. |
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
  (§8.5), where you link observations to conclusions.
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
  later, in the Mind Palace (§8.2), where it is scored.

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
  testimony with an **"Objection!"** gesture (§8.2).
- **Transition (~600 ms):** the sepia scene freezes, desaturates, and
  *inverts*, so ink becomes light on a black ground. The relevant elements
  (the testimony sentences, the evidence cards, the people involved) lift
  off the frozen scene and float into the Palace.
- **The Palace:** a dark, architectural space drawn in fine white line, like
  an engraving negative. Each puzzle type has its own "room": the Gallery of
  Testimony, the Evidence Room, the Chain Hall, the Map Room.
- **Exit:** when you **Declare** your deduction (press and hold for 0.6 s to
  prevent fat-finger submissions), the Palace collapses back into the scene,
  colour returns, and Holmes speaks.
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
| **The Missing Link** | Chain Hall | the unstated premise, built from phrase tiles | LR: Necessary Assumption |
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
  and established facts. Each is phrased as a conditional or quantified
  statement in period English ("No one who dined at the Hall left before
  ten," "The study can be reached only through the library").
- **Built:** drag cards onto the Chain Hall board and link them
  head-to-tail. The final link lands in a **Conclusion** slot that offers
  conclusions phrased on the fly from the end of your chain.
- **The prompt** states what must be determined ("What must be true of
  the man who stopped the clock?").
- **Traps:** distractor cards are deliberately the *converse* or *inverse*
  of real links, "unless" and "only if" phrasings, and "some" versus "all"
  mismatches. A chain built from a converse snaps together visually but
  reaches the wrong conclusion.
- **Contrapositives:** you can **flip** any conditional card (a double-tap
  turns "If A then B" into "If not B then not A"). Flipping is always
  allowed, because it is always valid. Learning that this is the *only*
  legal transformation is the lesson.
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
- **Built:** assemble the unstated premise from **phrase tiles** into a
  sentence frame ("No one who ___ could have ___").
- **Validation:** the assembled sentence is compiled into a logical form and
  checked for whether it is *required* (Necessary Assumption) or *enough*
  (Sufficient Assumption), depending on the prompt.
- Introduced mid-curriculum, because it is the hardest type to construct
  well.

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
  the Key* (necessary versus sufficient conditions), *On Reversed Arrows*
  (the converse), *On the Rooster and the Dawn* (correlation and causation),
  *On the Unrepresentative Witness* (biased samples).
- **The Methods:** entries on reasoning tools, such as *On Turning a
  Statement About* (the contrapositive), *On "Unless"*, *On Some, Most and
  All*, *On Ordering by Elimination*.
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
5. **Glossary note** (small caps, unobtrusive): the LSAT name for the
   concept, such as "LSAT: *Mistaken Reversal*" or "*Sufficient/Necessary
   Confusion*." This is the LSAT-flavored touch (decision 18).

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
  **interaction demo**. This covers the UI only, never the logic.
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

**Between seasons: profile-guided generation.** The app can export a
**player profile** (concept ratings, solve times, error patterns such as
"often falls for the converse"). The pipeline reads it when generating the
next season, to choose curriculum targets and overall difficulty. Errors the
player keeps making become the next season's featured traps.

---

## 12. Test Conditions Mode

An optional toggle in Settings (decision 14), off by default.

- In the Mind Palace, a **candle** burns down along the edge of the screen.
- Time per deduction is derived from LSAT pacing: about 1 minute 25 seconds
  per standard argument-type deduction, scaled by difficulty and by the size
  of Arrangements and Chains.
- **When the candle gutters out, it counts as one wrong Declare** (it costs
  one Patience) and the candle relights. You continue the same deduction.
- Solve times are always recorded, in either mode, and shown in a simple
  per-concept stats screen ("Chains: 84% first try, 2m 10s median").

---

## 13. Presentation: Art, UI and Audio

### 13.1 Visual identity
- **Palette:** black ink, sepia, and aged paper (#F3E9D2-ish) in scenes.
  Inverted (warm white line on near-black) in the Mind Palace. **No other
  colour, ever.** Highlights in the Mind Palace use brightness and line
  weight, not hue.
- **Illustration style:** Sidney Paget / Strand Magazine pen-and-ink with
  halftone and cross-hatching.
- **Typography:** a Caslon or Baskerville-style serif for body text (e.g.
  *Libre Caslon* or *EB Garamond*), small caps for headings, and an
  engraved display face for case titles. Minimum 17 pt body text, with
  user-adjustable size.
- **Ornaments:** Strand-style rules, drop caps, fleurons, and chapter
  headings set like "THE ADVENTURE OF THE STOPPED CLOCK."

### 13.2 Art production
**All art comes from genuine public-domain Victorian engravings. There is
no AI image generation** (decision 23). This keeps the look authentic and
consistent, and it means hotspot positions are always known, because the
pipeline composes the scenes itself:

1. **Asset library.** Public-domain Victorian engravings (Paget's Strand
   illustrations, period catalogues, the *Illustrated London News*, and
   similar sources) cleaned and normalized to one sepia halftone treatment.
   This covers **figures, portraits, furniture, objects, and backgrounds**.
2. **Composition by the pipeline.** A scene is a background plus placed
   object layers. Because the pipeline *places* each evidence object, the
   hotspot coordinates are known by construction.
3. **Portraits** combine a base figure with detail overlays (the ticket in
   the glove, the ink stain) for the cold read. Two or three expression
   variants per character (neutral, agitated, defiant) come from cropping
   and alternate engravings.
4. **The art catalog constrains the writing.** Every asset is tagged in a
   catalog (`app/public/art/catalog.yaml`): figure type, era, dress, pose,
   object, room type. The catalog is an input to pipeline stages 1–3, so a
   case may only call for people, places, objects and cold-read details the
   library can actually show. The consistency audit (stage 7) fails any case
   that references an art tag the catalog doesn't contain. When the stories
   start feeling limited by the art, the fix is to grow the library, not to
   generate images.

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
- Respect safe-area insets (notch, Dynamic Island, home indicator).
- Long text never requires horizontal scrolling. Arrangement grids of up to
  6×6 fit on a 375 pt-wide screen, and larger grids scroll vertically only.
- An accessibility text size setting, and Reduce Motion support (the Palace
  transition becomes a cross-fade).

### 13.5 Audio (decision 17: ambient and music only)
- **Ambience** per location: rain on the 221B window, the crackle of the
  fire, street noise, a ticking clock, wind on the moor, railway carriages.
  CC0 or public-domain sources.
- **Music:** a solo violin leitmotif for 221B (Holmes' violin), sparse cello
  or piano for tension. Public-domain compositions in CC0 recordings, or
  commissioned or generated later.
- **The Mind Palace is nearly silent:** a low sustained tone, a muffled
  heartbeat, and a pen scratch on each interaction. A wrong Declare sounds a
  struck-glass chime. A right one brings a rising string swell as the scene
  returns.
- Separate volume sliders for music and ambience. The game is fully
  playable muted.

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
4. **Spoiler hygiene.** The pipeline's console output and logs show only
   identifiers and pass/fail metrics, never story content.

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
conspiracy (decision 24). Every case is self-contained.

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

| # | Stage | Who | Output |
|---|-------|-----|--------|
| 1 | **Concept** | LLM | Motif selection, setting, a one-paragraph secret synopsis, curriculum targets (from the player profile) |
| 2 | **World model** | LLM, using structured output against a schema | Full ground truth: cast (with secrets and motives), locations, a minute-level timeline of true events, physical evidence, what each witness knows, believes and will lie about, plus red herrings and their innocent explanations |
| 3 | **Deduction plan** | LLM, then code checks | Beat sequence, and for each deduction slot: type, concepts, 2–3 variants, each with a **formal spec** (below) |
| 4 | **Formal verification** | Code | Pass or fail per deduction. Fair-play graph check. Difficulty metrics. |
| 5 | **Prose** | LLM | Narration, dialogue and puzzle text, written *from* the specs with fixed fact anchors |
| 6 | **Blind playtest** | LLM ×3 plus an adversary, with no access to the truth | Each solver sees only what the player would see and must reach the intended answer. The adversary tries to argue for a different defensible answer. |
| 7 | **Consistency audit** | LLM plus code | The prose contradicts no world-model fact and leaks no answer early. Proper nouns, times and places match the model. |
| 8 | **Assets and seal** | Code | Scenes composed and hotspots placed, the bundle encrypted |

### 14.4 Formal specs and verifiers per puzzle type

| Type | Formal spec | Verifier |
|------|-------------|----------|
| **Arrangement** | Entities, slots, and constraints in a small DSL (`before(A,B)`, `adjacent(A,B)`, `not_in(A,{1,5})`, `same_group(A,B)`…) | A backtracking solver confirms **exactly one** solution, or that the partial-question answer is forced. A human-style propagation solver confirms it is solvable **without guessing**, and its step count sets the difficulty score. |
| **Chain** | Premises as typed logical forms (`A→B`, `all(X,Y)`, `some(X,Y)`, `A→¬B`), with surface phrasing ("only if", "unless") mapped to logical form by **code, not by the LLM** | Forward chaining with contrapositives confirms the target is entailed, every offered distractor conclusion is *not* entailed, and each trap card produces a plausible-but-invalid chain. |
| **Missing Link** | Argument in logical form, plus the gap | The solver confirms the intended premise is necessary (or sufficient), and that every tile combination reaching a *different* logical form fails the test. |
| **Flaw** | Sentences with roles, the failing sentence id, a flaw type from the taxonomy, and (for formal flaws) the argument's logical form | Formal flaws (converse, necessary/sufficient, quantifier errors) are checked mechanically. All flaws go through blind playtest agreement (3 of 3) plus the adversary pass. |
| **Objection / Corroborate** | Each testimony sentence mapped to world-model propositions; each evidence card mapped to the facts it establishes | Code computes every (sentence, evidence) pair that contradicts or supports. There must be **exactly one** intended pair, and no unintended pairs among the cards available. |
| **Observation** | Observation-to-inference links grounded in world-model facts, with distractors grounded in "defeaters" | Blind playtest agreement, plus an adversary pass on each distractor. |
| **Reconstruction** | Each blank mapped to a world-model field and to the deduction ids that establish it | Code confirms every blank is determined by earlier deductions (fair play) and the word bank contains each correct answer exactly once. |

**Fair-play graph (all cases):** every deduction lists the clue ids it
requires, and the beat order must introduce each clue *before* the
deduction that uses it. Chapter-restart variants must satisfy the same
graph.

### 14.5 Models and cost
- All LLM stages use the **Claude API** with **Claude Opus 5.5**
  (`claude-opus-5-5`), with adaptive thinking at high effort for world
  modelling, deduction planning and the adversary, and medium effort for
  prose.
- **Structured outputs** (`output_config.format` with JSON schemas generated
  from the shared Zod schema) for stages 1–3 and 6.
- Because generation is offline, stages run through the **Message Batches
  API** (50% cost) where latency doesn't matter.
- **Budget:** a case runs on the order of 15–30 model calls, including
  retries and three blind solvers. Measure a pilot case before committing to
  a season. At current Opus 5.5 rates ($4 per million input tokens and $20
  per million output), expect single-digit dollars per verified case,
  pending that measurement.
- The pipeline is a **TypeScript (Node) CLI** in the same repository, so the
  case schema and the logic solvers are **shared** between the pipeline and
  the app. The app uses the same Chain and Arrangement validators to check
  your Declares.

### 14.6 Sealing
- Output: one `season-N.bundle` containing per-case JSON, compressed and
  encrypted with AES-GCM (WebCrypto in the app).
- The key ships in the app. This is **spoiler protection, not security.** It
  only has to stop the player from reading a case by accident.
- Plaintext lives only in a git-ignored `content/.plain/` directory on the
  generating machine and is deleted after sealing.
- A repository `CLAUDE.md` rule will instruct coding agents never to
  display, summarize, or quote decrypted case content to the player.

---

## 15. Technical Architecture

### 15.1 Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Build | **Vite + TypeScript** | Fast iteration. |
| UI | **React** | With CSS modules and CSS custom properties for the two palettes. |
| Animation | **Framer Motion** | The Mind Palace transition, the card hand, chain links. |
| State | **Zustand** | A small store, serializable for saves. |
| Persistence | **IndexedDB** (via `idb-keyval`) | Saves, the profile, and settings. Export and import as a JSON file for backup. |
| Offline | **vite-plugin-pwa** (Workbox) | Precaches the app shell, fonts, art and sealed bundles. |
| Audio | **Web Audio API** | Loops and crossfades. Unlocked on the first tap, as iOS requires. |
| Schema | **Zod** | One case schema shared by the app and the pipeline. |
| Logic core | **Pure TypeScript package** | Arrangement solver, Chain checker, logical-form compiler, used by both the app and the pipeline. |
| Pipeline | **Node + `@anthropic-ai/sdk`** | A CLI: `afoot generate --season 1 --profile profile.json`. |
| Hosting | **Cloudflare Pages or Netlify** (free, deploy from a private repo) | GitHub Pages also works if the repo is public. The bundles are sealed either way. |

### 15.2 Repository layout (proposed)
```
/
├── GAME_DESIGN.md          ← this document
├── CLAUDE.md               ← agent rules, including the spoiler rule
├── packages/
│   ├── schema/             ← Zod case schema and types (shared)
│   └── logic/              ← solvers and validators (shared, unit-tested)
├── app/                    ← the PWA
│   ├── src/
│   │   ├── scenes/         ← Narration, Observe, Examine, Interrogate
│   │   ├── palace/         ← one module per puzzle type
│   │   ├── notebook/
│   │   ├── casefile/
│   │   └── engine/         ← beat runner, save system, Patience, adaptivity
│   └── public/art/         ← the engraving asset library
├── pipeline/
│   ├── motifs/             ← motif library (YAML)
│   ├── stages/             ← 1–8
│   └── prompts/
└── content/
    ├── sealed/             ← committed: season bundles
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

1. Vance passed before Miss Darrow.
2. Mrs. Hale passed immediately after the Colonel.
3. Pike was neither the first nor the last.
4. Miss Darrow passed after Mrs. Hale.
5. The Colonel was not first.
6. Pike passed before the Colonel.

*Solution (verified unique by brute force):* **Vance, Pike, Colonel, Mrs. Hale,
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

**Chain deduction.** *"What must be true of the man who stopped the clock?"*

| Premise cards offered | |
|---|---|
| P1 If the clock was stopped deliberately, then the murderer wished to fix a false time of death. | ✔ |
| P2 The murderer wished to fix a false time only if he had an alibi for that false time. | ✔ (note "only if": *wished → alibi*) |
| P3 The clock was stopped deliberately. *(Established: the glass broke from the front, with no glass beneath.)* | ✔ |
| T1 Anyone with an alibi for 9:14 wished to fix a false time. | ✘ trap: the converse of P2 |
| T2 If the clock was not stopped deliberately, the murderer had no alibi for 9:14. | ✘ trap: the inverse of the P1→P2 chain |

Valid chain: **P3 → P1 → P2 ⇒ "The murderer has an alibi for 9:14."**
The twist lands: the culprit is someone with the *best* alibi, and that
points at the card table.

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
| **M0: Foundations** | Repo scaffold, `CLAUDE.md` with the spoiler rule, Zod schema, the logic package (Arrangement solver, Chain checker) with unit tests | The solvers verify §16's puzzles in CI |
| **M1: Vertical slice** | PWA shell, beat engine, Narration, Observe, Examine and Interrogate screens, all Mind Palace types, Case File, Notebook (5 entries), Patience and chapter restart, saves. Content: §16 hand-encoded. | §16 is playable start to finish on an iPhone from the home screen |
| **M2: Pipeline v1** | Stages 1–8, motif library (~40 motifs), blind playtest harness, seal | One generated case passes every check and is played blind |
| **M3: Season 1** | 8 cases, curriculum tiers 1–2, variants and adaptive selection, Watson's Account, grading | The season is played; tune difficulty from the exported profile |
| **M4: Polish** | Mind Palace transition, audio, Test Conditions, stats screen, engraving library expansion | Feels like a finished game |
| **Later** | Profile-guided Season 2, tiers 3–4, on-demand generation in the app, a possible season arc (deferred, decision 24) | — |

---

## 18. Risks and Open Questions

### Risks
| Risk | Mitigation |
|------|------------|
| **Generated argument puzzles are ambiguous** (two defensible flaws) | Formal encoding wherever the flaw type allows it, 3-of-3 blind agreement, an adversary pass, and discarding on doubt |
| **Doyle-voice prose is flat or repetitive** | A style guide prompt with canon excerpts (public domain), an editing pass, a banned-phrase list, and per-season vocabulary variety checks |
| **Difficulty is miscalibrated** | Solver step counts and blind-solver effort as proxies, the 70% target band, and profile feedback between seasons |
| **Mysteries feel samey** | Motif novelty check, a varied case template, a large motif library, and per-season motif rotation |
| **Art consistency and hotspot coverage** | The composed-engraving approach (§13.2), and a curated library built once and reused |
| **The engraving library limits what stories can show** | The art catalog feeds the generator (§13.2), and the library grows between seasons |
| **Accidental spoilers** during development (the player is the developer) | Sealed bundles, metric-only pipeline logs, the `CLAUDE.md` rule, and plaintext deleted after sealing |
| **iOS clears saved data** | Install to the home screen, plus Export Save |

### Open questions
1. **Reading Comprehension** isn't in scope. Should long documents (letters,
   wills, newspaper columns) eventually get comprehension-style deductions,
   since the LSAT tests it?

---

## Appendix A: Logic Concept Taxonomy

Tiers set the curriculum order. The LSAT names appear only in the Notebook
glossary.

| Tier | Concept (Notebook title) | Plain meaning | LSAT glossary | Typical puzzle types |
|------|--------------------------|---------------|---------------|----------------------|
| 1 | *On Seeing and Observing* | Inferring from physical detail, and alternative explanations | Most Strongly Supported | Observation |
| 1 | *On the Plain Contradiction* | Two statements can't both be true | Inconsistency | Objection |
| 1 | *On If and Then* | Basic conditionals | Conditional reasoning | Chain |
| 1 | *On Turning a Statement About* | The contrapositive | Contrapositive | Chain |
| 1 | *On Order by Elimination* | Simple sequencing | Ordering games | Arrangement |
| 2 | *On Reversed Arrows* | The converse and inverse errors | Mistaken Reversal / Negation | Flaw, Chain traps |
| 2 | *On the Gate and the Key* | Necessary versus sufficient | Sufficient/Necessary Confusion | Flaw, Missing Link |
| 2 | *On "Only If" and "Unless"* | Translating tricky conditionals | Conditional indicators | Chain |
| 2 | *On the Rooster and the Dawn* | Correlation versus causation | Causal flaw | Flaw, Objection (Weaken) |
| 2 | *On the Other Explanation* | Alternative causes weaken causal claims | Weaken: alternative cause | Objection |
| 2 | *On Who Stood Where* | Grouping and in/out selection | Grouping games | Arrangement |
| 3 | *On Some, Most and All* | Quantifier logic | Formal logic: quantifiers | Chain, Flaw |
| 3 | *On the Unrepresentative Witness* | Biased or small samples | Sampling flaw | Flaw |
| 3 | *On Attacking the Man* | Source attacks instead of arguments | Ad hominem | Flaw |
| 3 | *On the Slippery Word* | Equivocation | Equivocation | Flaw |
| 3 | *On the Unstated Premise* | Necessary and sufficient assumptions | Assumption questions | Missing Link, Corroborate |
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
