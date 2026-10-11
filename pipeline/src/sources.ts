// The generator's inputs: the motif library and the art catalog (§13.2, §14.2).
import { ConceptId, Id } from "@afoot/schema";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import { PATHS } from "./paths.js";

export const Motif = z.object({
  id: Id,
  source: z.enum(["canon-pd", "golden-age-pd", "fandom-trope", "original"]),
  kind: z.enum(["central-trick", "complication", "premise"]),
  summary: z.string().min(1),
  "fair-play-tells": z.array(z.string()).default([]),
  art: z.array(z.string()).default([]),
  "pairs-well-with": z.array(Id).default([]),
  concepts: z.array(ConceptId).default([]),
});
export type Motif = z.infer<typeof Motif>;

export const ArtAsset = z.object({
  tag: Id,
  kind: z.enum(["portrait", "scene", "vignette"]),
  description: z.string().min(1),
});
export type ArtAsset = z.infer<typeof ArtAsset>;

export function loadMotifs(path = PATHS.motifs): Motif[] {
  return z.array(Motif).parse(parse(readFileSync(path, "utf8")));
}

export function loadCatalog(path = PATHS.catalog): ArtAsset[] {
  return z.object({ assets: z.array(ArtAsset) }).parse(JSON.parse(readFileSync(path, "utf8"))).assets;
}

/** Problems with the library itself: duplicates, dangling references, unknown art, Moriarty. */
export function checkMotifs(motifs: Motif[], catalog: ArtAsset[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const tags = new Set(catalog.map((a) => a.tag));
  for (const m of motifs) {
    if (ids.has(m.id)) problems.push(`duplicate motif "${m.id}"`);
    ids.add(m.id);
  }
  for (const m of motifs) {
    for (const p of m["pairs-well-with"]) if (!ids.has(p)) problems.push(`motif "${m.id}" pairs with unknown "${p}"`);
    for (const t of m.art) if (!tags.has(t)) problems.push(`motif "${m.id}" needs unknown art "${t}"`);
    if (/moriarty/i.test(JSON.stringify(m))) problems.push(`motif "${m.id}" mentions Moriarty (decision 24)`);
  }
  return problems;
}
