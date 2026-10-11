// The engraving library (GAME_DESIGN.md §13.2). `pipeline/art/plates.json`
// names a public-domain source for each catalog tag; `afoot art build`
// downloads it, crops it and prints it in the house manner (greyscale ink on
// white, so the app's multiply blend lays it onto the paper), then records the
// file and its credit in the catalog.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { PATHS, ROOT } from "./paths.js";

/** Only plates free of all restrictions: the public domain, or dedicated to it. */
export const PUBLIC_DOMAIN = /^(public domain|cc0|pdm)\b/i;

const Fraction = z.number().min(0).max(1);

export const Plate = z.object({
  /** The page that documents the image and its licence (a Commons file page, say). */
  page: z.string().url(),
  /** The file the build prints from: a large Commons rendering (thumb.wikimedia.org) or the original. */
  image: z.string().url(),
  title: z.string().min(1),
  author: z.string().min(1),
  date: z.string().min(1),
  license: z.string().regex(PUBLIC_DOMAIN, "plates must be public domain or CC0"),
  /** Crop as fractions of the original: [left, top, right, bottom]. */
  crop: z.tuple([Fraction, Fraction, Fraction, Fraction]).optional(),
  /** Where narrow frames centre on the plate, as fractions [x, y]. Defaults to the middle. */
  focus: z.tuple([Fraction, Fraction]).optional(),
  /** Mirror the plate, so a figure faces into the page. */
  flip: z.boolean().optional(),
  /** Rectangles to whiten before toning (scan marks, a neighbouring cut), as fractions of the crop: [left, top, right, bottom]. */
  erase: z.array(z.tuple([Fraction, Fraction, Fraction, Fraction])).optional(),
  /** Black and white points (0–255) after greyscale; by default taken from the histogram. */
  levels: z.tuple([z.number().int().min(0).max(255), z.number().int().min(0).max(255)]).optional(),
});
export type Plate = z.infer<typeof Plate>;

export const PlateBook = z.object({ $comment: z.string().optional(), plates: z.record(Plate) });

export const ART_PATHS = {
  plates: resolve(ROOT, "pipeline/art/plates.json"),
  out: resolve(ROOT, "app/public/art"),
  cache: resolve(ROOT, "pipeline/.cache/art"),
};

/** Output size by kind: portraits fill an oval, scenes the 3:4 Examine frame, vignettes a small plate. */
export const SIZES = {
  portrait: { width: 560, height: 640 },
  scene: { width: 720, height: 960 },
  vignette: { width: 640, height: 480 },
} as const;

type Kind = keyof typeof SIZES;

type Credit = { title: string; author: string; date: string; source: string; license: string };

/** A further plate for the same tag; the app chooses one per case (§13.2). */
type Variant = { file: string; focus?: [number, number]; credit: Credit };

export type CatalogAsset = {
  tag: string;
  kind: Kind;
  description: string;
  file?: string;
  focus?: [number, number];
  credit?: Credit;
  variants?: Variant[];
};

/**
 * A plates.json key is a catalog tag for its first plate, and `tag#2`,
 * `tag#3`, … for further variants of the same subject.
 */
export function plateKey(key: string): { tag: string; n: number } {
  const m = /^(.+)#(\d+)$/.exec(key);
  return m ? { tag: m[1]!, n: Number(m[2]) } : { tag: key, n: 1 };
}

const fileFor = (tag: string, n: number) => (n === 1 ? `${tag}.webp` : `${tag}-${n}.webp`);

type Catalog = { $comment?: string; version: number; assets: CatalogAsset[] };

export function readPlates(path = ART_PATHS.plates): Record<string, Plate> {
  if (!existsSync(path)) return {};
  return PlateBook.parse(JSON.parse(readFileSync(path, "utf8"))).plates;
}

function readCatalog(): Catalog {
  return JSON.parse(readFileSync(PATHS.catalog, "utf8")) as Catalog;
}

// Behind an HTTPS proxy, run with NODE_USE_ENV_PROXY=1 so fetch honours it.
const UA = "AfootArtTool/1.0 (https://github.com/jfeuerstein/mystery)";

async function download(url: string): Promise<Buffer> {
  mkdirSync(ART_PATHS.cache, { recursive: true });
  const file = resolve(ART_PATHS.cache, createHash("sha256").update(url).digest("hex").slice(0, 24));
  if (existsSync(file)) return readFileSync(file);
  let wait = 4000;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      return buf;
    }
    if (res.status !== 429 && res.status !== 503) throw new Error(`${url}: HTTP ${res.status}`);
    const after = Number(res.headers.get("retry-after"));
    await new Promise((r) => setTimeout(r, Math.max(wait, after * 1000 || 0)));
    wait *= 2;
  }
  throw new Error(`${url}: still rate-limited after retries`);
}

/** The pth percentile (0–1) of an 8-bit greyscale buffer. */
function percentile(pixels: Buffer, p: number): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of pixels) hist[v]!++;
  let target = p * pixels.length;
  for (let v = 0; v < 256; v++) {
    target -= hist[v]!;
    if (target <= 0) return v;
  }
  return 255;
}

/** Crops, tones and sizes one plate. Returns webp bytes. */
export async function printPlate(source: Buffer, plate: Plate, kind: Kind): Promise<Buffer> {
  const meta = await sharp(source).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const [l, t, r, b] = plate.crop ?? [0, 0, 1, 1];
  const region = {
    left: Math.round(l * w),
    top: Math.round(t * h),
    width: Math.max(1, Math.round((r - l) * w)),
    height: Math.max(1, Math.round((b - t) * h)),
  };
  const { width, height } = SIZES[kind];
  const cut = await sharp(source).rotate().extract(region).greyscale().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  for (const [el, et, er, eb] of plate.erase ?? []) {
    const cw = cut.info.width;
    const ch = cut.info.height;
    for (let y = Math.floor(et * ch); y < Math.ceil(eb * ch); y++) {
      for (let x = Math.floor(el * cw); x < Math.ceil(er * cw); x++) cut.data[y * cw + x] = 255;
    }
  }
  let img = sharp(cut.data, { raw: { width: cut.info.width, height: cut.info.height, channels: 1 } });
  if (plate.flip) img = img.flop();
  // A touch of blur before the reduction tames the halftone screen of magazine scans.
  const scale = Math.min(region.width / width, region.height / height);
  if (scale > 2) img = img.blur(Math.min(1.2, 0.3 * scale));
  // Portraits and scenes fill their frame (cover-fit around the focus point,
  // by hand, so the focus survives); a vignette's object is shown whole, on
  // white paper (contain-fit).
  const whole = kind === "vignette";
  const fit = whole
    ? Math.min(width / region.width, height / region.height)
    : Math.max(width / region.width, height / region.height);
  const scaledW = Math.max(1, Math.round(region.width * fit));
  const scaledH = Math.max(1, Math.round(region.height * fit));
  const innerW = Math.min(width, scaledW);
  const innerH = Math.min(height, scaledH);
  const fx = plate.focus?.[0] ?? 0.5;
  const fy = plate.focus?.[1] ?? 0.5;
  const left = Math.min(scaledW - innerW, Math.max(0, Math.round(fx * scaledW - innerW / 2)));
  const top = Math.min(scaledH - innerH, Math.max(0, Math.round(fy * scaledH - innerH / 2)));
  const sized = await img
    .resize(scaledW, scaledH, { kernel: "lanczos3" })
    .extract({ left, top, width: innerW, height: innerH })
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = sized.data;
  // Ink to black, paper to white, measured on the plate itself (before any
  // padding): the page's own colour comes from the app.
  const [black, white] = plate.levels ?? [percentile(pixels, 0.005), Math.max(percentile(pixels, 0.95) - 4, 40)];
  const span = Math.max(1, white - black);
  const out = Buffer.alloc(width * height, 255);
  const ox = Math.floor((width - innerW) / 2);
  const oy = Math.floor((height - innerH) / 2);
  for (let y = 0; y < innerH; y++) {
    for (let x = 0; x < innerW; x++) {
      const v = (pixels[y * innerW + x]! - black) / span;
      out[(y + oy) * width + x + ox] = Math.round(255 * Math.min(1, Math.max(0, v)));
    }
  }
  return sharp(out, { raw: { width, height, channels: 1 } })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 74, effort: 6 })
    .toBuffer();
}

/** Builds the named plates (a tag builds all its variants), or every plate. */
export async function buildArt(tags: string[], log: (line: string) => void): Promise<number> {
  const plates = readPlates();
  const catalog = readCatalog();
  const wanted = tags.length ? Object.keys(plates).filter((k) => tags.includes(k) || tags.includes(plateKey(k).tag)) : Object.keys(plates);
  let failed = tags.filter((t) => !Object.keys(plates).some((k) => k === t || plateKey(k).tag === t)).length;
  for (const t of tags) if (!wanted.some((k) => k === t || plateKey(k).tag === t)) log(`${t}: no plate in plates.json`);
  mkdirSync(ART_PATHS.out, { recursive: true });
  for (const key of wanted) {
    const plate = plates[key]!;
    const { tag, n } = plateKey(key);
    const asset = catalog.assets.find((a) => a.tag === tag);
    if (!asset) {
      log(`${key}: not in the catalog`);
      failed++;
      continue;
    }
    try {
      const webp = await printPlate(await download(plate.image), plate, asset.kind);
      const file = fileFor(tag, n);
      writeFileSync(resolve(ART_PATHS.out, file), webp);
      const credit = { title: plate.title, author: plate.author, date: plate.date, source: plate.page, license: plate.license };
      if (n === 1) {
        asset.file = file;
        if (plate.focus) asset.focus = plate.focus;
        else delete asset.focus;
        asset.credit = credit;
      } else {
        const variant: Variant = { file, ...(plate.focus ? { focus: plate.focus } : {}), credit };
        asset.variants = [...(asset.variants ?? []).filter((v) => v.file !== file), variant].sort((a, b) =>
          a.file.localeCompare(b.file, "en", { numeric: true }),
        );
      }
      log(`${key}: ${Math.round(webp.length / 1024)} KB`);
    } catch (e) {
      failed++;
      log(`${key}: FAILED ${(e as Error).message}`);
    }
  }
  writeFileSync(PATHS.catalog, `${JSON.stringify(catalog, null, 2)}\n`);
  return failed;
}

/** Prints plates from another plates file into a directory, leaving the catalog alone: for choosing crops. */
export async function previewArt(platesPath: string, outDir: string, log: (line: string) => void): Promise<number> {
  const plates = readPlates(resolve(platesPath));
  const kinds = new Map(readCatalog().assets.map((a) => [a.tag, a.kind]));
  mkdirSync(resolve(outDir), { recursive: true });
  let failed = 0;
  for (const [key, plate] of Object.entries(plates)) {
    const { tag, n } = plateKey(key);
    const kind = kinds.get(tag);
    if (!kind) {
      log(`${key}: not in the catalog`);
      failed++;
      continue;
    }
    try {
      const webp = await printPlate(await download(plate.image), plate, kind);
      const file = resolve(outDir, `${n === 1 ? tag : `${tag}-${n}`}.png`);
      await sharp(webp).png().toFile(file);
      log(`${key}: ${file}`);
    } catch (e) {
      failed++;
      log(`${key}: FAILED ${(e as Error).message}`);
    }
  }
  return failed;
}

/** Offline consistency: every plate has a catalog tag; every catalog file exists and is credited as public domain. */
export function checkArt(): string[] {
  const problems: string[] = [];
  const plates = readPlates();
  const catalog = readCatalog();
  const tags = new Set(catalog.assets.map((a) => a.tag));
  for (const key of Object.keys(plates)) if (!tags.has(plateKey(key).tag)) problems.push(`plate "${key}" has no catalog tag`);
  const images = new Map<string, string>();
  for (const [key, plate] of Object.entries(plates)) {
    const other = images.get(plate.image + JSON.stringify(plate.crop ?? null));
    if (other) problems.push(`${key}: the same print and crop as ${other}`);
    images.set(plate.image + JSON.stringify(plate.crop ?? null), key);
  }
  for (const a of catalog.assets) {
    if (!a.file) {
      if (a.variants?.length) problems.push(`${a.tag}: variants without a first plate`);
      continue;
    }
    const prints = [{ key: a.tag, file: a.file, credit: a.credit }, ...(a.variants ?? []).map((v) => ({ key: `${a.tag}#${/-(\d+)\.webp$/.exec(v.file)?.[1]}`, ...v }))];
    for (const { key, file, credit } of prints) {
      if (!existsSync(resolve(ART_PATHS.out, file))) problems.push(`${key}: ${file} is missing`);
      if (!credit) problems.push(`${key}: no credit`);
      else if (!PUBLIC_DOMAIN.test(credit.license)) problems.push(`${key}: licence "${credit.license}" is not public domain`);
      if (!plates[key]) problems.push(`${key}: has a file but no plate in plates.json`);
    }
  }
  return problems;
}
