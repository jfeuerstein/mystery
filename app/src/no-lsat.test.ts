// The game never names the test it happens to be good practice for (decision 18).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const SHIPPED = ["app/src", "app/index.html", "app/public", "packages/schema/src", "packages/logic/src", "fixtures"];

function* files(path: string): Generator<string> {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) yield* files(join(path, name));
  } else if (/\.(tsx?|json|html|css|md)$/.test(path) && !path.endsWith("no-lsat.test.ts")) {
    yield path;
  }
}

describe("no LSAT in the game", () => {
  it.each(SHIPPED)("%s never mentions it", (dir) => {
    for (const file of files(resolve(ROOT, dir))) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/\blsat\b/i);
    }
  });
});
