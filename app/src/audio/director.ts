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

class Director {
  private ctx: AudioContext | undefined;
  private musicBus: GainNode | undefined;
  private sfxBus: GainNode | undefined;
  private buffers = new Map<string, Promise<AudioBuffer | undefined>>();
  private current: { cue: MusicCue; source: AudioBufferSourceNode; gain: GainNode } | undefined;
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
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) void this.ctx?.suspend();
        else void this.ctx?.resume();
      });
    }
    void this.ctx.resume();
    if (this.wanted) this.music(this.wanted);
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

  private load(file: string): Promise<AudioBuffer | undefined> {
    let p = this.buffers.get(file);
    if (!p) {
      const url = `${import.meta.env.BASE_URL}audio/${file}`;
      p = fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((data) => this.ctx!.decodeAudioData(data))
        .catch(() => undefined);
      this.buffers.set(file, p);
    }
    return p;
  }

  /** Crossfades to a music cue; `undefined` fades to silence. */
  music(cue: MusicCue | undefined): void {
    this.wanted = cue;
    if (!this.ctx || !this.musicBus) return;
    if (this.current?.cue === cue) return;
    const ctx = this.ctx;
    const old = this.current;
    if (old) {
      old.gain.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
      old.source.stop(ctx.currentTime + FADE + 0.1);
      this.current = undefined;
    }
    const entry = cue ? AUDIO_MANIFEST.music[cue] : undefined;
    if (!cue || !entry) return;
    void this.load(entry.file).then((buffer) => {
      if (!buffer || this.wanted !== cue || this.current) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = entry.loop ?? true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(entry.gain ?? 1, ctx.currentTime + FADE);
      source.connect(gain).connect(this.musicBus!);
      source.start();
      this.current = { cue, source, gain };
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
