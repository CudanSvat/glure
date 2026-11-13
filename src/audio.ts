/** Svi zvukovi su sintetizirani WebAudio API-jem – nema nijedne zvučne datoteke. */

const KEY = 'glure.zvuk';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambient: { stop: () => void } | null = null;
  private wantAmbient = false;
  muted: boolean;

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* privatni način rada – nema veze */
    }
    this.muted = stored === '0';
  }

  /** Preglednici traže korisničku gestu prije zvuka. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(ctx.destination);
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      if (this.wantAmbient) this.startAmbient();
    } catch {
      this.ctx = null;
    }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(KEY, this.muted ? '0' : '1');
    } catch {
      /* nema veze */
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
    return !this.muted;
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(freq: number, q: number, dur: number, gain: number, type: BiquadFilterType = 'lowpass', delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  click(): void {
    this.tone('sine', 720, 540, 0.05, 0.12);
  }

  blip(pitch: number): void {
    this.tone('triangle', pitch, pitch * 0.92, 0.045, 0.07);
  }

  /** Kamen sjeda na zid. */
  thud(): void {
    this.tone('sine', 150, 48, 0.2, 0.55);
    this.burst(520, 0.7, 0.12, 0.4);
    this.burst(2400, 1.2, 0.04, 0.12, 'bandpass');
  }

  /** Zdrav kamen zvoni. */
  tink(): void {
    this.tone('sine', 2093, 2080, 0.55, 0.2);
    this.tone('sine', 3136, 3120, 0.4, 0.11);
    this.tone('sine', 4410, 4390, 0.25, 0.06);
    this.burst(5000, 1, 0.02, 0.2, 'highpass');
  }

  /** Šupalj kamen tupo jekne. */
  tup(): void {
    this.tone('sine', 190, 80, 0.16, 0.5);
    this.burst(320, 0.8, 0.14, 0.5);
  }

  good(): void {
    this.tone('triangle', 659, 659, 0.12, 0.14);
    this.tone('triangle', 988, 988, 0.22, 0.14, 0.09);
  }

  great(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.26, 0.14, i * 0.08));
  }

  bad(): void {
    this.tone('sawtooth', 160, 96, 0.28, 0.12);
    this.tone('square', 113, 80, 0.28, 0.06);
  }

  nope(): void {
    this.tone('square', 220, 200, 0.07, 0.07);
    this.tone('square', 180, 165, 0.1, 0.07, 0.09);
  }

  toss(): void {
    this.burst(900, 0.8, 0.18, 0.18, 'bandpass');
    this.tone('sine', 120, 50, 0.16, 0.35, 0.22);
    this.burst(400, 0.7, 0.1, 0.3, 'lowpass', 0.22);
  }

  crumble(): void {
    this.burst(900, 0.6, 0.5, 0.45, 'bandpass');
    for (let i = 0; i < 4; i++) this.tone('sine', 140 - i * 14, 50, 0.14, 0.3, 0.05 + i * 0.07 + Math.random() * 0.03);
  }

  goat(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(470, t);
    o.frequency.linearRampToValueAtTime(410, t + 0.55);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const lg = ctx.createGain();
    lg.gain.value = 42;
    lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1300;
    f.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.05);
    g.gain.setValueAtTime(0.32, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.65);
    lfo.stop(t + 0.65);
  }

  wind(dur: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(260, t);
    f.frequency.linearRampToValueAtTime(900, t + dur * 0.35);
    f.frequency.linearRampToValueAtTime(520, t + dur * 0.6);
    f.frequency.linearRampToValueAtTime(1000, t + dur * 0.8);
    f.frequency.linearRampToValueAtTime(240, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.3);
    g.gain.setValueAtTime(0.5, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  stamp(): void {
    this.tone('sine', 110, 40, 0.25, 0.7);
    this.burst(300, 0.7, 0.16, 0.5);
  }

  /** More i cvrčci u pozadini. */
  startAmbient(): void {
    this.wantAmbient = true;
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise || this.ambient) return;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime, 1.5);
    out.connect(this.master);

    // Valovi
    const sea = ctx.createBufferSource();
    sea.buffer = this.noise;
    sea.loop = true;
    const sf = ctx.createBiquadFilter();
    sf.type = 'lowpass';
    sf.frequency.value = 480;
    const sgain = ctx.createGain();
    sgain.gain.value = 0.07;
    const slfo = ctx.createOscillator();
    slfo.frequency.value = 0.13;
    const slg = ctx.createGain();
    slg.gain.value = 0.045;
    slfo.connect(slg).connect(sgain.gain);
    sea.connect(sf).connect(sgain).connect(out);

    // Cvrčci
    const cic = ctx.createBufferSource();
    cic.buffer = this.noise;
    cic.loop = true;
    const cf = ctx.createBiquadFilter();
    cf.type = 'bandpass';
    cf.frequency.value = 5600;
    cf.Q.value = 9;
    const cg = ctx.createGain();
    cg.gain.value = 0.012;
    const clfo = ctx.createOscillator();
    clfo.type = 'square';
    clfo.frequency.value = 17;
    const clg = ctx.createGain();
    clg.gain.value = 0.011;
    clfo.connect(clg).connect(cg.gain);
    const slow = ctx.createOscillator();
    slow.frequency.value = 0.21;
    const slowG = ctx.createGain();
    slowG.gain.value = 0.006;
    slow.connect(slowG).connect(cg.gain);
    cic.connect(cf).connect(cg).connect(out);

    const nodes = [sea, slfo, cic, clfo, slow];
    nodes.forEach((n) => n.start());
    this.ambient = {
      stop: () => {
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        window.setTimeout(() => nodes.forEach((n) => n.stop()), 1500);
      },
    };
  }

  stopAmbient(): void {
    this.wantAmbient = false;
    this.ambient?.stop();
    this.ambient = null;
  }
}
