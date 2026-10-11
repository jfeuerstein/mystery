// The audio director (GAME_DESIGN.md §13.5): public-domain violin music that
// follows the story, and short violin sound effects. Every cue is optional;
// a cue with no file in the manifest is simply silent.
import manifestJson from "../../public/audio/manifest.json";

export type MusicCue = "theme" | "investigation" | "palace" | "finale";
export type SfxCue = "pluck" | "reveal" | "discord" | "page" | "seal";

export type Credit = { title: string; author: string; source: string; license: string };
type Entry = { file: string; credit: Credit; gain?: number; loop?: boolean };
export type AudioManifest = {
  version: 1;
  music: Partial<Record<MusicCue, Entry>>;
  sfx: Partial<Record<SfxCue, Entry>>;
};

export const AUDIO_MANIFEST = manifestJson as unknown as AudioManifest;

const FADE = 1.6;

/** A hundredth of a second of silence: played inside the first gesture so iOS lets the players start later. */
const SILENT = "data:audio/wav;base64,UklGRt0BAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YbkBAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=";

type Deck = { el: HTMLAudioElement; gain: GainNode; cue: MusicCue | undefined };

class Director {
  private ctx: AudioContext | undefined;
  private musicBus: GainNode | undefined;
  private sfxBus: GainNode | undefined;
  private buffers = new Map<string, Promise<AudioBuffer | undefined>>();
  /** Music is fetched whole once (so the service worker can keep it for offline play) and streamed from a blob. */
  private blobs = new Map<string, Promise<string | undefined>>();
  /** Two players, so one track can fade out while the next fades in. */
  private decks: Deck[] = [];
  private wanted: MusicCue | undefined;
  private volumes = { music: 0.6, sfx: 0.8 };

  /** Must be called from a user gesture on iOS (GAME_DESIGN.md §15.3). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.ctx.destination);
      this.sfxBus.connect(this.ctx.destination);
      this.applyVolumes();
      for (let i = 0; i < 2; i++) {
        const el = new Audio(SILENT);
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        this.ctx.createMediaElementSource(el).connect(gain).connect(this.musicBus);
        void el.play().catch(() => undefined);
        this.decks.push({ el, gain, cue: undefined });
      }
      for (const entry of Object.values(AUDIO_MANIFEST.sfx)) if (entry) void this.load(entry.file);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) void this.ctx?.suspend();
        else void this.ctx?.resume();
      });
    }
    void this.ctx.resume();
    if (this.wanted) this.play(this.wanted);
  }

  setVolumes(music: number, sfx: number): void {
    this.volumes = { music, sfx };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.volumes.music * this.volumes.music, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * this.volumes.sfx, t, 0.1);
  }

  private url(file: string): string {
    return `${import.meta.env.BASE_URL}audio/${file}`;
  }

  private load(file: string): Promise<AudioBuffer | undefined> {
    let p = this.buffers.get(file);
    if (!p) {
      p = fetch(this.url(file))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((data) => this.ctx!.decodeAudioData(data))
        .catch(() => undefined);
      this.buffers.set(file, p);
    }
    return p;
  }

  private blob(file: string): Promise<string | undefined> {
    let p = this.blobs.get(file);
    if (!p) {
      p = fetch(this.url(file))
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
        .then((b) => URL.createObjectURL(b))
        .catch(() => undefined);
      this.blobs.set(file, p);
    }
    return p;
  }

  /** Crossfades to a music cue; `undefined` fades to silence. */
  music(cue: MusicCue | undefined): void {
    if (this.wanted === cue) return;
    this.wanted = cue;
    if (this.ctx) this.play(cue);
  }

  private play(cue: MusicCue | undefined): void {
    const ctx = this.ctx!;
    const fade = (deck: Deck, to: number) => {
      const t = ctx.currentTime;
      deck.gain.gain.cancelScheduledValues(t);
      deck.gain.gain.setValueAtTime(deck.gain.gain.value, t);
      deck.gain.gain.linearRampToValueAtTime(to, t + FADE);
    };
    const playing = this.decks.find((d) => d.cue !== undefined && d.cue === cue);
    for (const deck of this.decks) {
      if (deck === playing || deck.cue === undefined) continue;
      fade(deck, 0);
      const was = deck.cue;
      window.setTimeout(() => {
        if (deck.cue === was && this.wanted !== was) {
          deck.el.pause();
          deck.cue = undefined;
        }
      }, FADE * 1000 + 100);
    }
    const entry = cue ? AUDIO_MANIFEST.music[cue] : undefined;
    if (!cue || !entry) return;
    if (playing) {
      // Back to a track that was fading out: bring it up again.
      fade(playing, entry.gain ?? 1);
      return;
    }
    void this.blob(entry.file).then((src) => {
      if (!src || this.wanted !== cue) return;
      // The quieter deck takes the new track.
      const deck = [...this.decks].sort((a, b) => a.gain.gain.value - b.gain.gain.value)[0]!;
      deck.cue = cue;
      deck.el.src = src;
      deck.el.loop = entry.loop ?? true;
      void deck.el.play().catch(() => undefined);
      fade(deck, entry.gain ?? 1);
    });
  }

  sfx(cue: SfxCue): void {
    const entry = AUDIO_MANIFEST.sfx[cue];
    if (!this.ctx || !this.sfxBus || !entry) return;
    const ctx = this.ctx;
    void this.load(entry.file).then((buffer) => {
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = entry.gain ?? 1;
      source.connect(gain).connect(this.sfxBus!);
      source.start();
    });
  }
}

export const audio = new Director();
