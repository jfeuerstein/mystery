import { describe, expect, it } from "vitest";
import { seal, unseal } from "../src/index.js";

describe("seal", () => {
  it("round-trips a value and hides its text", async () => {
    const value = { title: "The Adventure of the Hidden Thing", n: [1, 2, 3] };
    const blob = await seal(value);
    expect(blob.startsWith("afoot-sealed-v1:")).toBe(true);
    expect(blob).not.toContain("Hidden");
    expect(await unseal(blob)).toEqual(value);
  });

  it("uses a fresh IV each time", async () => {
    expect(await seal({ a: 1 })).not.toBe(await seal({ a: 1 }));
  });

  it("rejects tampering and non-sealed text", async () => {
    const blob = await seal({ a: 1 });
    const tampered = blob.slice(0, -6) + (blob.endsWith("A") ? "B" : "A") + blob.slice(-5);
    await expect(unseal(tampered)).rejects.toThrow();
    await expect(unseal('{"a":1}')).rejects.toThrow("not a sealed blob");
  });
});
