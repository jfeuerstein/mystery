import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** AFOOT_CONTENT overrides the content directory (tests use a temporary one). */
const CONTENT = process.env.AFOOT_CONTENT ? resolve(process.env.AFOOT_CONTENT) : resolve(ROOT, "content");

export const PATHS = {
  motifs: resolve(ROOT, "pipeline/motifs/motifs.yaml"),
  catalog: resolve(ROOT, "app/public/art/catalog.json"),
  plain: resolve(CONTENT, ".plain"),
  sealed: resolve(CONTENT, "sealed"),
  index: resolve(CONTENT, "sealed/index.json"),
  ledger: resolve(CONTENT, "sealed/ledger.sealed"),
  profiles: resolve(CONTENT, "profiles"),
};

/** Working files for one case being generated (`content/.plain/<caseId>/`). */
export function caseDir(caseId: string, base = PATHS.plain) {
  const dir = resolve(base, caseId);
  return {
    dir,
    concept: resolve(dir, "concept.json"),
    world: resolve(dir, "world.json"),
    case: resolve(dir, "case.json"),
    playtest: resolve(dir, "playtest.json"),
  };
}
