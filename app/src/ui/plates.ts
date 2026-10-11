// Which engraving a case shows for each tag (GAME_DESIGN.md §13.2). A catalog
// tag may carry several plates; a case keeps one plate per tag throughout,
// people (or places, or objects) sharing a tag get different plates while
// there are enough, and which plate comes first varies from case to case.
import type { Case } from "@afoot/schema";

export type ArtCredit = { title: string; author: string; date?: string; source: string; license: string };
export type Plate = { file: string; focus?: [number, number]; credit?: ArtCredit };
export type ArtAsset = {
  tag: string;
  kind: "portrait" | "scene" | "vignette";
  description: string;
  /** The first processed engraving in public/art/, once sourced. */
  file?: string;
  /** Where a narrow frame centres on the plate, as fractions [x, y]. */
  focus?: [number, number];
  credit?: ArtCredit;
  /** Further plates of the same subject. */
  variants?: Plate[];
};

/** Every plate of a tag, the first plate first. */
export function platesOf(asset: ArtAsset | undefined): Plate[] {
  if (!asset?.file) return [];
  const first: Plate = { file: asset.file, ...(asset.focus ? { focus: asset.focus } : {}), ...(asset.credit ? { credit: asset.credit } : {}) };
  return [first, ...(asset.variants ?? [])];
}

/** Picks the plate for a tag, given who or what it depicts (a cast, location, evidence or detail id). */
export type PlateChooser = (tag: string, owner?: string) => Plate | undefined;

/** FNV-1a: a small, stable string hash. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function chooserFor(c: Case, lookup: (tag: string) => ArtAsset | undefined): PlateChooser {
  // Everyone and everything in the case that wears each tag, in case order.
  const owners = new Map<string, string[]>();
  const wear = (tag: string, id: string) => owners.set(tag, [...(owners.get(tag) ?? []), id]);
  for (const person of c.cast) wear(person.portrait.tag, person.id);
  for (const place of c.locations) wear(place.scene.tag, place.id);
  for (const item of c.evidence) wear(item.vignette.tag, item.id);
  for (const chapter of c.chapters) {
    for (const beat of chapter.beats) if (beat.kind === "observe") for (const d of beat.details) wear(d.vignette.tag, d.id);
  }
  return (tag, owner) => {
    const plates = platesOf(lookup(tag));
    if (!plates.length) return undefined;
    const index = owner ? Math.max(0, owners.get(tag)?.indexOf(owner) ?? 0) : 0;
    return plates[(hash(`${c.id}/${tag}`) + index) % plates.length];
  };
}
