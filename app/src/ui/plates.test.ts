import { Case } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import caseJson from "../../../fixtures/stopped-clock.case.json";
import { chooserFor, platesOf, type ArtAsset } from "./plates";

const base = Case.parse(caseJson);
const credit = { title: "t", author: "a", source: "s", license: "Public domain" };

/** A catalog where every tag has `n` plates: tag.webp, tag-2.webp, … */
function catalogOf(n: number) {
  return (tag: string): ArtAsset => ({
    tag,
    kind: "portrait",
    description: tag,
    file: `${tag}.webp`,
    credit,
    variants: Array.from({ length: n - 1 }, (_, i) => ({ file: `${tag}-${i + 2}.webp`, credit })),
  });
}

describe("plates", () => {
  it("lists a tag's plates, the first first, and none until it is sourced", () => {
    expect(platesOf(undefined)).toEqual([]);
    expect(platesOf({ tag: "x", kind: "vignette", description: "x" })).toEqual([]);
    expect(platesOf(catalogOf(3)("x")).map((p) => p.file)).toEqual(["x.webp", "x-2.webp", "x-3.webp"]);
  });

  it("keeps one plate per tag through a case", () => {
    const choose = chooserFor(base, catalogOf(3));
    const person = base.cast[0]!;
    expect(choose(person.portrait.tag, person.id)).toEqual(choose(person.portrait.tag, person.id));
    expect(choose(person.portrait.tag)).toBeDefined();
  });

  it("gives people who share a tag different plates while there are enough", () => {
    // Make the first two of the cast share one portrait tag.
    const c = structuredClone(base);
    c.cast[1]!.portrait.tag = c.cast[0]!.portrait.tag;
    const tag = c.cast[0]!.portrait.tag;
    const two = chooserFor(c, catalogOf(2));
    expect(two(tag, c.cast[0]!.id)!.file).not.toBe(two(tag, c.cast[1]!.id)!.file);
    // With a single plate, both wear it.
    const one = chooserFor(c, catalogOf(1));
    expect(one(tag, c.cast[0]!.id)).toEqual(one(tag, c.cast[1]!.id));
  });

  it("varies which plate comes first from case to case", () => {
    const tag = base.cast[0]!.portrait.tag;
    const firsts = new Set(
      Array.from({ length: 12 }, (_, i) => chooserFor({ ...base, id: `case-${i}` }, catalogOf(3))(tag, base.cast[0]!.id)!.file),
    );
    expect(firsts.size).toBeGreaterThan(1);
  });
});
