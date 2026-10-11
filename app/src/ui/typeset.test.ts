import { Case } from "@afoot/schema";
import { describe, expect, it } from "vitest";
import caseJson from "../../../fixtures/stopped-clock.case.json";
import { typeset, typesetAll } from "./typeset";

describe("typeset", () => {
  it("curls quotes and apostrophes", () => {
    expect(typeset(`"I was at home," said the Colonel's man.`)).toBe("“I was at home,” said the Colonel’s man.");
    expect(typeset(`He said 'only if' twice.`)).toBe("He said ‘only if’ twice.");
    expect(typeset(`("Quite so.")`)).toBe("(“Quite so.”)");
    expect(typeset(`Holmes' notebook`)).toBe("Holmes’ notebook");
    expect(typeset(`'Tis the season`)).toBe("’Tis the season");
  });

  it("leaves a whole case valid and its ids untouched", () => {
    const c = Case.parse(caseJson);
    const t = Case.parse(typesetAll(c));
    expect(t.cast.map((x) => x.id)).toEqual(c.cast.map((x) => x.id));
    expect(JSON.stringify(t)).not.toMatch(/\\"|'/);
  });
});
