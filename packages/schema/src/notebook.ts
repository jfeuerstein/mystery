// Holmes' Notebook (GAME_DESIGN.md §10). Concepts, never answers: no entry
// mentions any case. Each entry's worked example is a standalone miniature.
import type { ConceptId } from "./ids.js";

export type NotebookEntry = {
  id: ConceptId;
  title: string;
  section: "fallacy" | "method";
  /** Holmes' gloss, in period voice. */
  gloss: string;
  /** The plain modern version. */
  plain: string;
  example: string;
  /** The concept's name in the logic books, shown small. Never a test's name (decision 18). */
  term: string;
};

export const ENTRIES: NotebookEntry[] = [
  {
    id: "seeing-and-observing",
    title: "On Seeing and Observing",
    section: "method",
    gloss:
      "Every man carries his history upon his person, if one troubles to read it. But read it whole: a mark has more than one possible author, and the first that occurs to you is merely the first.",
    plain:
      "Match each detail to the conclusion it most strongly supports. Before you accept a conclusion, ask what else could have produced the same detail. If another explanation fits as well, the detail doesn’t support your conclusion.",
    example:
      "A man’s right cuff is shiny and his left elbow worn smooth. He writes at a desk for long hours. That he is right-handed is likely; that he is a clerk is supported; that he is unhappy in his work is not supported at all.",
    term: "Inference to the best explanation",
  },
  {
    id: "plain-contradiction",
    title: "On the Plain Contradiction",
    section: "method",
    gloss:
      "When a statement and a fact cannot both be true, one of them must go, and it is seldom the fact. Find the precise sentence the fact forbids; the rest of the story may be honest enough.",
    plain:
      "Two claims contradict when they can’t both be true. To object, pick the exact statement and the exact piece of evidence that rules it out. Evidence that merely seems suspicious isn’t a contradiction.",
    example:
      "“I was at home all evening.” A ticket stamped at Paddington at eight o’clock contradicts it. A muddy coat does not: he may have muddied it yesterday.",
    term: "Contradiction",
  },
  {
    id: "if-and-then",
    title: "On If and Then",
    section: "method",
    gloss:
      "“If this, then that” is a one-way street, Watson. You may drive down it from this to that; you may not drive up it from that to this.",
    plain:
      "“If A, then B” (A → B) means whenever A is true, B is true. Knowing A lets you conclude B. Knowing B tells you nothing about A.",
    example:
      "If it rained, the lawn is wet. It rained, so the lawn is wet. But a wet lawn doesn’t prove rain: the gardener may have watered it.",
    term: "The conditional, or modus ponens",
  },
  {
    id: "contrapositive",
    title: "On Turning a Statement About",
    section: "method",
    gloss:
      "There is exactly one honest way to turn a conditional about: deny the consequence, and you may deny the cause. Every other way of turning it is a forgery.",
    plain:
      "“If A, then B” always means the same as “If not B, then not A.” That turned version is the contrapositive, and it is the only rearrangement that keeps the meaning.",
    example:
      "If the dog was loose, the postman was bitten. The postman was not bitten, so the dog was not loose.",
    term: "The contrapositive, or modus tollens",
  },
  {
    id: "reversed-arrows",
    title: "On Reversed Arrows",
    section: "method",
    gloss:
      "The commonest forgery in logic is to turn a conditional the wrong way about. It reads smoothly, it sounds like the original, and it is false as often as it is true.",
    plain:
      "From “If A, then B” you may NOT conclude “If B, then A” (the converse) or “If not A, then not B” (the inverse). Only the contrapositive, “If not B, then not A”, follows.",
    example:
      "If he is a sailor, he is tanned. Converse (false): if he is tanned, he is a sailor. Inverse (false): if he is not a sailor, he is not tanned. Contrapositive (true): if he is not tanned, he is not a sailor.",
    term: "The converse and the inverse",
  },
  {
    id: "only-if-and-unless",
    title: "On “Only If” and “Unless”",
    section: "method",
    gloss:
      "Two little words have hanged more innocent men than any rope. “Only if” points the arrow the opposite way to “if”; “unless” means “if not”. Translate them before you reason with them.",
    plain:
      "“A only if B” means A → B (B is required for A). “A unless B” means “if not B, then A”. Rewrite the sentence as a plain if-then first.",
    example:
      "“He will sail only if the wind turns”: if he sails, the wind turned. “He will sail unless the wind drops”: if the wind does not drop, he sails.",
    term: "Necessary conditions",
  },
  {
    id: "order-by-elimination",
    title: "On Ordering by Elimination",
    section: "method",
    gloss:
      "When five men pass a door and each witness gives you a scrap, do not guess the order. Strike out what each scrap forbids, and the order will remain.",
    plain:
      "For ordering puzzles, ask what each rule rules out, especially rules that pin people together (“immediately after”) or to the ends (“not first”). Rule things out until only one arrangement survives. You should never need to guess.",
    example:
      "A, B and C in a row. B is not first. C is immediately after A. A–C must be a block, B can’t lead it, so the order is A, C, B.",
    term: "The process of elimination",
  },
  {
    id: "other-explanation",
    title: "On the Other Explanation",
    section: "method",
    gloss:
      "When a man tells you that one thing caused another, ask what else might have caused it. If you can name a second author as plausible as the first, his case is weakened, however confidently he states it.",
    plain:
      "A claim that X caused Y is weakened by evidence of a different cause that explains Y just as well. To undermine such a claim, look for the evidence that supplies the alternative.",
    example:
      "“The window was broken, so a burglar came in.” A cricket ball lying on the carpet weakens it. A broken lock on the door does not; that only suggests a second way in.",
    term: "Alternative explanation",
  },
  {
    id: "who-stood-where",
    title: "On Who Stood Where",
    section: "method",
    gloss:
      "When people must be divided among rooms, parties or carriages, begin with whoever is most constrained. Each placement narrows the rest; the last few place themselves.",
    plain:
      "In grouping puzzles, find the rules that tie people together (“with”) or keep them apart (“never with”), and any limits on how many fit in a place. Fill the tightest places first.",
    example:
      "Three guests, two rooms, the blue room holds one. Ames is never with Blake. Then Ames and Blake can’t share the green room, so one of them is in the blue room and Clay is in the green.",
    term: "Reasoning by constraint",
  },
  {
    id: "necessary-as-sufficient",
    title: "On the Gate and the Key",
    section: "fallacy",
    gloss:
      "A thing may be necessary without being enough. Every man who enters the house must pass the gate; not every man who passes the gate has entered the house.",
    plain:
      "The error: treating a necessary condition as if it were sufficient. From “anyone who did X must have Y” and “this person has Y”, the argument concludes “this person did X”. That doesn’t follow.",
    example:
      "The forger must have known the banker’s hand. His clerk knew the banker’s hand. Therefore the clerk is the forger. (So might a dozen others.)",
    term: "Affirming the consequent",
  },
  {
    id: "sufficient-as-necessary",
    title: "On the Shut Gate",
    section: "fallacy",
    gloss:
      "A thing may be enough without being necessary. A key opens the door; but a man without the key may come in by the window.",
    plain:
      "The error: treating a sufficient condition as if it were necessary. From “if X, then Y” and “not X”, the argument concludes “not Y”. That doesn’t follow.",
    example:
      "Anyone holding a ticket was admitted. Mr. Price held no ticket. Therefore Mr. Price was not admitted. (He may have been a guest of the house.)",
    term: "Denying the antecedent",
  },
  {
    id: "correlation-causation",
    title: "On the Rooster and the Dawn",
    section: "fallacy",
    gloss:
      "The rooster crows and the sun rises; it does not follow that the rooster raises the sun. Two things that keep company may both be servants of a third.",
    plain:
      "The error: concluding that one thing causes another just because they occur together. They might share a common cause, the cause might run the other way, or it might be chance.",
    example:
      "Every house in the street that keeps a dog has been burgled. Therefore dogs attract burglars. (Perhaps wealthy houses keep dogs, and burglars prefer wealthy houses.)",
    term: "Cum hoc ergo propter hoc: correlation taken for cause",
  },
];

/** Entries open from the first case. Others unlock as their concepts arrive (§10). */
export const STARTER_ENTRIES: ConceptId[] = [
  "seeing-and-observing",
  "plain-contradiction",
  "if-and-then",
  "contrapositive",
  "order-by-elimination",
  "necessary-as-sufficient",
  "sufficient-as-necessary",
  "correlation-causation",
];

export const entryById = (id: string) => ENTRIES.find((e) => e.id === id);
