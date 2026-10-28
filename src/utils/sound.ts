// Procedural Web Audio API Synthesizer for Micro-Interactions & Ambient Sound

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Liquid shockwave button click feedback
   */
  public playClick(freqBase = 520) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqBase, now);
    osc.frequency.exponentialRampToValueAtTime(freqBase * 1.45, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(freqBase * 0.65, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  /**
   * Biometric scan sweep sound
   */
  public playScanSweep() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.65);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  /**
   * Harmonic chime when an emotion detection completes
   */
  public playDetectionChime(baseHz = 432) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const ratios = [1, 1.25, 1.5, 2];

    ratios.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const start = now + idx * 0.055;
      osc.frequency.setValueAtTime(baseHz * ratio, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.045 / (idx + 1), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.8);
    });
  }

  /**
   * Soft cue for guided breathing phase transitions
   */
  public playBreathCue(phase: 'inhale' | 'hold' | 'exhale') {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (phase === 'inhale') {
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.45);
    } else if (phase === 'hold') {
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.setValueAtTime(425, now + 0.3);
    } else {
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.55);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.62);
  }
}

export const soundEngine = new SoundEngine();
