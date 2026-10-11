// `afoot compose` (§13.2): places evidence hotspots on each scene, so the
// writer never has to. Deterministic; leaves existing positions alone.
import type { Case } from "@afoot/schema";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const R = 0.08;

export function compose(c: Case): { case: Case; placed: number } {
  const evidence = c.evidence.map((e) => ({ ...e }));
  let placed = 0;
  for (const ch of c.chapters) {
    for (const b of ch.beats) {
      if (b.kind !== "examine") continue;
      const taken = b.hotspots
        .map((id) => evidence.find((e) => e.id === id)?.hotspot)
        .filter((h): h is NonNullable<typeof h> => h !== undefined);
      for (const id of b.hotspots) {
        const e = evidence.find((x) => x.id === id);
        if (!e || e.hotspot) continue;
        // Try jittered points until one is clear of the others and the caption strip.
        let h = hash(`${c.id}/${id}`);
        let spot = { x: 0.5, y: 0.5, r: R };
        for (let attempt = 0; attempt < 200; attempt++) {
          const x = 0.12 + ((h % 1000) / 1000) * 0.76;
          const y = 0.12 + ((Math.floor(h / 1000) % 1000) / 1000) * 0.7;
          spot = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), r: R };
          const clear = taken.every((t) => Math.hypot(t.x - x, (t.y - y) * 0.75) > t.r + R + 0.04);
          if (clear) break;
          h = hash(`${h}`);
        }
        e.hotspot = spot;
        taken.push(spot);
        placed++;
      }
    }
  }
  return { case: { ...c, evidence }, placed };
}
