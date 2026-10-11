// The music and sound effects (GAME_DESIGN.md §13.5). `pipeline/audio/sounds.json`
// describes each cue as excerpts of public-domain recordings, layered and
// faded; `afoot audio build` cuts them with ffmpeg into AAC files in
// app/public/audio and records each with its credit in the manifest.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { ROOT } from "./paths.js";

/** Public domain, CC0, or a source that releases its recordings without any restriction. */
export const FREE_AUDIO = /^(public domain|cc0|pdm|free to use without restriction)\b/i;

const Layer = z.object({
  /** The original recording. */
  url: z.string().url(),
  /** Seconds into the recording where the excerpt begins. */
  start: z.number().min(0),
  duration: z.number().positive(),
  /** Level change in dB. */
  gain: z.number().default(0),
  /** Seconds after the cue begins that this layer enters (for a spread chord). */
  offset: z.number().min(0).default(0),
});

export const Sound = z.object({
  kind: z.enum(["music", "sfx"]),
  layers: z.array(Layer).min(1),
  fadeIn: z.number().min(0).default(0),
  fadeOut: z.number().min(0).default(0),
  /** Music loops; its ends are faded so the seam is a breath, not a click. */
  loop: z.boolean().default(false),
  /** Playback level in the app, 0–1. */
  gain: z.number().min(0).max(1).optional(),
  credit: z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    source: z.string().url(),
    license: z.string().regex(FREE_AUDIO, "recordings must be public domain, CC0 or free of restrictions"),
  }),
});
export type Sound = z.infer<typeof Sound>;

const SoundBook = z.object({ $comment: z.string().optional(), cues: z.record(Sound) });

export const AUDIO_PATHS = {
  sounds: resolve(ROOT, "pipeline/audio/sounds.json"),
  out: resolve(ROOT, "app/public/audio"),
  manifest: resolve(ROOT, "app/public/audio/manifest.json"),
  cache: resolve(ROOT, "pipeline/.cache/audio"),
};

const UA = "AfootAudioTool/1.0 (https://github.com/jfeuerstein/mystery)";

export function readSounds(path = AUDIO_PATHS.sounds): Record<string, Sound> {
  if (!existsSync(path)) return {};
  return SoundBook.parse(JSON.parse(readFileSync(path, "utf8"))).cues;
}

async function download(url: string): Promise<string> {
  mkdirSync(AUDIO_PATHS.cache, { recursive: true });
  const file = resolve(AUDIO_PATHS.cache, createHash("sha256").update(url).digest("hex").slice(0, 24));
  if (existsSync(file)) return file;
  let wait = 5000;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return file;
    }
    if (res.status !== 429 && res.status !== 503) throw new Error(`${url}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, Math.max(wait, Number(res.headers.get("retry-after")) * 1000 || 0)));
    wait *= 2;
  }
  throw new Error(`${url}: still rate-limited after retries`);
}

/** The ffmpeg arguments that cut, layer, fade and level one cue. */
export function ffmpegArgs(sound: Sound, inputs: string[], out: string): string[] {
  const args = ["-y", "-v", "error"];
  sound.layers.forEach((l, i) => args.push("-ss", String(l.start), "-t", String(l.duration), "-i", inputs[i]!));
  const length = Math.max(...sound.layers.map((l) => l.offset + l.duration));
  const parts = sound.layers.map((l, i) => {
    const delay = Math.round(l.offset * 1000);
    return `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${l.gain}dB,adelay=${delay}|${delay}[l${i}]`;
  });
  const mixed = sound.layers.length > 1 ? `${sound.layers.map((_, i) => `[l${i}]`).join("")}amix=inputs=${sound.layers.length}:normalize=0[m]` : "[l0]anull[m]";
  const level = sound.kind === "music" ? "loudnorm=I=-20:TP=-2:LRA=14" : "loudnorm=I=-16:TP=-1.5:LRA=11";
  const fades = [
    sound.fadeIn ? `afade=t=in:d=${sound.fadeIn}` : "",
    sound.fadeOut ? `afade=t=out:st=${Math.max(0, length - sound.fadeOut)}:d=${sound.fadeOut}` : "",
  ].filter(Boolean);
  // loudnorm can overshoot on short sounds; the limiter keeps a decibel of headroom.
  const chain = ["highpass=f=60", ...fades, level, "aresample=44100", "alimiter=limit=0.89:level=false"].join(",");
  args.push("-filter_complex", `${parts.join(";")};${mixed};[m]${chain}[out]`, "-map", "[out]");
  if (sound.kind === "sfx") args.push("-ac", "1", "-c:a", "aac", "-b:a", "96k");
  else args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-movflags", "+faststart", out);
  return args;
}

type Manifest = {
  $comment?: string;
  version: 1;
  music: Record<string, { file: string; credit: Sound["credit"]; gain?: number; loop?: boolean }>;
  sfx: Record<string, { file: string; credit: Sound["credit"]; gain?: number; loop?: boolean }>;
};

export async function buildAudio(cues: string[], log: (line: string) => void): Promise<number> {
  const sounds = readSounds();
  const manifest = JSON.parse(readFileSync(AUDIO_PATHS.manifest, "utf8")) as Manifest;
  const wanted = cues.length ? cues : Object.keys(sounds);
  let failed = 0;
  mkdirSync(AUDIO_PATHS.out, { recursive: true });
  for (const cue of wanted) {
    const sound = sounds[cue];
    if (!sound) {
      log(`${cue}: no such cue in sounds.json`);
      failed++;
      continue;
    }
    try {
      const inputs: string[] = [];
      for (const l of sound.layers) inputs.push(await download(l.url));
      const file = `${cue}.m4a`;
      const run = spawnSync("ffmpeg", ffmpegArgs(sound, inputs, resolve(AUDIO_PATHS.out, file)), { encoding: "utf8" });
      if (run.error) throw new Error(`ffmpeg is needed for the audio build (${run.error.message})`);
      if (run.status !== 0) throw new Error(run.stderr.trim().split("\n").slice(-3).join(" "));
      const section = sound.kind === "music" ? manifest.music : manifest.sfx;
      section[cue] = {
        file,
        credit: sound.credit,
        ...(sound.gain !== undefined ? { gain: sound.gain } : {}),
        ...(sound.loop ? { loop: true } : {}),
      };
      const kb = Math.round(readFileSync(resolve(AUDIO_PATHS.out, file)).length / 1024);
      log(`${cue}: ${kb} KB`);
    } catch (e) {
      failed++;
      log(`${cue}: FAILED ${(e as Error).message}`);
    }
  }
  writeFileSync(AUDIO_PATHS.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  return failed;
}

/** Offline consistency: every manifest file exists and is credited under a free licence. */
export function checkAudio(): string[] {
  const problems: string[] = [];
  const manifest = JSON.parse(readFileSync(AUDIO_PATHS.manifest, "utf8")) as Manifest;
  for (const [cue, entry] of [...Object.entries(manifest.music), ...Object.entries(manifest.sfx)]) {
    if (!existsSync(resolve(AUDIO_PATHS.out, entry.file))) problems.push(`${cue}: ${entry.file} is missing`);
    if (!FREE_AUDIO.test(entry.credit.license)) problems.push(`${cue}: licence "${entry.credit.license}" is not free`);
  }
  return problems;
}
