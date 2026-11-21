import { Howl, Howler } from "howler";

export type SoundEffect =
  | "click"
  | "bang"
  | "card"
  | "heartbeat"
  | "taunt"
  | "reveal"
  | "wrong"
  | "win";

const SOUND_FILES: Record<"click" | "bang" | "card" | "heartbeat", string> = {
  click: "/sounds/click.mp3",
  bang: "/sounds/bang.mp3",
  card: "/sounds/card.mp3",
  heartbeat: "/sounds/heartbeat.mp3",
};

class SoundManager {
  private muted = false;
  private initialized = false;
  private howls = new Map<string, Howl>();
  private failedFiles = new Set<string>();
  private audioCtx: AudioContext | null = null;

  unlock(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window !== "undefined") {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        this.audioCtx = new Ctx();
        if (this.audioCtx.state === "suspended") {
          void this.audioCtx.resume();
        }
      }
    }

    for (const [key, src] of Object.entries(SOUND_FILES)) {
      const howl = new Howl({
        src: [src],
        preload: true,
        volume: key === "heartbeat" ? 0.5 : 0.75,
        onloaderror: () => {
          this.failedFiles.add(key);
        },
      });
      this.howls.set(key, howl);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    Howler.mute(nextMuted);
  }

  play(effect: SoundEffect): void {
    if (this.muted) return;
    this.unlock();

    if (effect in SOUND_FILES && !this.failedFiles.has(effect)) {
      const howl = this.howls.get(effect);
      if (howl && howl.state() === "loaded") {
        howl.play();
        return;
      }
    }

    this.playSynthFallback(effect);
  }

  private playSynthFallback(effect: SoundEffect): void {
    const ctx = this.audioCtx;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    if (effect === "card") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.065);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
      return;
    }

    if (effect === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      return;
    }

    if (effect === "bang") {
      const bufferSize = ctx.sampleRate * 0.38;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.09));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(now);
      return;
    }

    if (effect === "heartbeat") {
      for (const offset of [0, 0.22]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(68, now + offset);
        osc.frequency.exponentialRampToValueAtTime(34, now + offset + 0.14);
        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.17);
      }
      return;
    }

    if (effect === "taunt") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    if (effect === "reveal") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
      return;
    }

    if (effect === "wrong") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.11);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    if (effect === "win") {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const offset = idx * 0.075;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.23);
      });
    }
  }
}

export const soundManager = new SoundManager();
