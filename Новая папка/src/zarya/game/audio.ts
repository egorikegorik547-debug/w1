/* Процедурный звуковой движок: эффекты и музыка на Web Audio (без внешних файлов). */

export type Sfx =
  | 'click' | 'select' | 'chop' | 'mine' | 'gather' | 'hammer' | 'drop' | 'coin' | 'place' | 'built' | 'research'
  | 'birth' | 'warn' | 'alarm' | 'horn' | 'battle' | 'victory' | 'defeat' | 'fanfare' | 'train' | 'tier';
export type MusicMode = 'menu' | 'game' | 'war' | null;

const MIN_GAP: Partial<Record<Sfx, number>> = { chop: 0.09, mine: 0.09, gather: 0.15, hammer: 0.12, drop: 0.08, coin: 0.08, click: 0.03, select: 0.05 };
const SCALES = { aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10] };

interface MusicCfg {
  bpm: number;
  root: number;
  scale: number[];
  prog: number[];
  drums: 0 | 1 | 2;
  melody: number;
  lute: number;
  pad: number;
  brass: boolean;
}
const CFG: Record<'menu' | 'game' | 'war', MusicCfg> = {
  menu: { bpm: 68, root: 50, scale: SCALES.aeolian, prog: [0, 6, 5, 6, 0, 3, 5, 6], drums: 1, melody: 0.85, lute: 1, pad: 1, brass: false },
  game: { bpm: 56, root: 45, scale: SCALES.aeolian, prog: [0, 5, 2, 6, 0, 3, 5, 4], drums: 0, melody: 0.5, lute: 0.7, pad: 1, brass: false },
  war: { bpm: 94, root: 50, scale: SCALES.phrygian, prog: [0, 1, 0, 6, 0, 1, 3, 6], drums: 2, melody: 0.35, lute: 0.5, pad: 0.8, brass: true },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  ambBus!: GainNode;
  verb!: ConvolverNode;
  verbSend!: GainNode;
  noiseBuf!: AudioBuffer;
  musicVol = 0.55;
  sfxVol = 0.8;
  mode: MusicMode = null;
  private cfg: MusicCfg = CFG.menu;
  private last: Partial<Record<Sfx, number>> = {};
  private timer = 0;
  private nextT = 0;
  private step = 0;
  private melodyQ: { t: number; midi: number; dur: number }[] = [];
  private birdT = 3;
  private cricketT = 0;
  private ambOn = false;
  private fadeTimer = 0;

  dispose() {
    window.clearInterval(this.timer);
  }

  constructor() {
    try {
      const s = JSON.parse(localStorage.getItem('dq11.audio') || '{}');
      if (typeof s.m === 'number') this.musicVol = s.m;
      if (typeof s.s === 'number') this.sfxVol = s.s;
    } catch {
      /* ignore */
    }
  }

  get running() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** вызывается по жесту пользователя */
  unlock() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume();
  }

  private init() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3.5;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.applyVol();
    // шум
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // реверб
    const rl = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, rl, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < rl; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6);
    }
    this.verb = ctx.createConvolver();
    this.verb.buffer = ir;
    this.verbSend = ctx.createGain();
    this.verbSend.gain.value = 0.55;
    this.verb.connect(this.verbSend);
    this.verbSend.connect(this.master);
    this.startAmbience();
    this.timer = window.setInterval(() => this.schedule(), 90);
    this.nextT = ctx.currentTime + 0.2;
  }

  setVolumes(m: number, s: number) {
    this.musicVol = m;
    this.sfxVol = s;
    this.applyVol();
    try {
      localStorage.setItem('dq11.audio', JSON.stringify({ m, s }));
    } catch {
      /* ignore */
    }
  }

  private applyVol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.8, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.sfxVol * (this.ambOn ? 0.9 : 0), t, 0.6);
  }

  /* ---------- Примитивы ---------- */

  private env(g: GainNode, t: number, peak: number, att: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
  }

  private noise(t: number, dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, att: number, out: AudioNode, send = 0) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, peak, att, dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    if (send > 0) this.sendVerb(g, send);
    src.start(t, Math.random() * 1.5, att + dur + 0.05);
  }

  private osc(t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, att: number, out: AudioNode, send = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + att + dur);
    const g = ctx.createGain();
    this.env(g, t, peak, att, dur);
    o.connect(g);
    g.connect(out);
    if (send > 0) this.sendVerb(g, send);
    o.start(t);
    o.stop(t + att + dur + 0.05);
  }

  private sendVerb(src: AudioNode, amt: number) {
    const s = this.ctx!.createGain();
    s.gain.value = amt;
    src.connect(s);
    s.connect(this.verb);
  }

  private bell(t: number, f: number, peak: number, dec: number, out: AudioNode, send = 0.5) {
    const parts = [
      [1, 1],
      [2.0, 0.5],
      [2.76, 0.38],
      [4.07, 0.2],
      [5.4, 0.12],
    ];
    for (const [r, a] of parts) this.osc(t, 'sine', f * r, f * r, dec / (0.7 + r * 0.3), peak * a, 0.003, out, send);
  }

  private brass(t: number, f: number, dur: number, peak: number, out: AudioNode, send = 0.35) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(350, t);
    lp.frequency.exponentialRampToValueAtTime(2000, t + 0.12);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.06);
    g.gain.setValueAtTime(peak, t + Math.max(0.07, dur - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.3);
    }
    lp.connect(g);
    g.connect(out);
    this.sendVerb(g, send);
  }

  /* ---------- Эффекты ---------- */

  play(name: Sfx, opts: { vol?: number; pan?: number } = {}) {
    if (!this.ctx || !this.running || this.sfxVol <= 0) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const gap = MIN_GAP[name] ?? 0.05;
    if (this.last[name] !== undefined && now - this.last[name]! < gap) return;
    this.last[name] = now;
    const out = ctx.createGain();
    out.gain.value = opts.vol ?? 1;
    let node: AudioNode = out;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, opts.pan ?? 0));
      out.connect(p);
      node = p;
    }
    node.connect(this.sfxBus);
    const t = now + 0.005;
    const pv = 0.9 + Math.random() * 0.25;
    switch (name) {
      case 'chop':
        this.thock(t, pv, out, 1);
        this.noise(t + 0.07, 0.07, 'bandpass', 1400 * pv, 1, 0.12, 0.004, out);
        break;
      case 'hammer':
        this.thock(t, pv * 1.35, out, 0.7);
        this.osc(t, 'sine', 2100 * pv, 2100 * pv, 0.12, 0.05, 0.002, out);
        this.thock(t + 0.12, pv * 1.45, out, 0.55);
        break;
      case 'mine':
        this.noise(t, 0.04, 'highpass', 3200, 0.7, 0.45, 0.001, out);
        this.osc(t, 'sine', 1700 * pv, 1700 * pv, 0.28, 0.22, 0.001, out, 0.15);
        this.osc(t, 'sine', 2650 * pv, 2650 * pv, 0.18, 0.12, 0.001, out, 0.15);
        this.osc(t, 'sine', 140, 70, 0.1, 0.35, 0.002, out);
        break;
      case 'gather':
        for (let i = 0; i < 3; i++) this.noise(t + i * 0.06, 0.07, 'bandpass', 2600 + Math.random() * 1500, 0.8, 0.16, 0.012, out);
        break;
      case 'drop':
        this.osc(t, 'sine', 120, 55, 0.14, 0.5, 0.002, out);
        this.noise(t, 0.09, 'lowpass', 520, 0.8, 0.3, 0.003, out);
        break;
      case 'coin':
        this.osc(t, 'sine', 2093, 2093, 0.3, 0.16, 0.002, out, 0.3);
        this.osc(t + 0.07, 'sine', 3136, 3136, 0.45, 0.14, 0.002, out, 0.3);
        break;
      case 'click':
        this.noise(t, 0.015, 'highpass', 1800, 0.7, 0.12, 0.001, out);
        this.osc(t, 'sine', 950, 620, 0.03, 0.09, 0.001, out);
        break;
      case 'select':
        this.osc(t, 'triangle', 1320, 1100, 0.04, 0.07, 0.001, out);
        break;
      case 'place':
        this.thock(t, 0.85, out, 0.9);
        this.thock(t + 0.09, 0.75, out, 0.7);
        break;
      case 'built':
        this.thock(t, 1.1, out, 0.7);
        [659, 880, 1318].forEach((f, i) => this.bell(t + 0.12 + i * 0.12, f, 0.2, 1.4, out, 0.5));
        break;
      case 'research':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.bell(t + i * 0.11, f, 0.18, 1.8, out, 0.7));
        break;
      case 'birth':
        this.bell(t, 880, 0.14, 1.2, out, 0.6);
        this.bell(t + 0.14, 1175, 0.12, 1.4, out, 0.6);
        break;
      case 'warn':
        this.osc(t, 'triangle', 262, 233, 0.16, 0.25, 0.01, out);
        this.osc(t + 0.17, 'triangle', 220, 196, 0.22, 0.25, 0.01, out);
        break;
      case 'alarm':
        for (let i = 0; i < 4; i++) {
          this.bell(t + i * 0.32, 392, 0.25, 0.9, out, 0.4);
          this.noise(t + i * 0.32, 0.05, 'highpass', 2500, 1, 0.2, 0.001, out);
        }
        break;
      case 'horn':
        this.brass(t, 98, 1.3, 0.34, out, 0.5);
        this.brass(t + 1.1, 147, 1.0, 0.3, out, 0.5);
        this.osc(t + 0.01, 'sine', 70, 55, 0.5, 0.5, 0.01, out);
        break;
      case 'battle':
        this.osc(t, 'sine', 80, 45, 0.4, 0.6, 0.003, out);
        this.noise(t, 1.6, 'bandpass', 700, 0.5, 0.1, 0.5, out, 0.2);
        for (let i = 0; i < 12; i++) {
          const tt = t + 0.05 + i * 0.13 + Math.random() * 0.08;
          this.noise(tt, 0.1, 'bandpass', 2000 + Math.random() * 2500, 1.4, 0.35, 0.001, out, 0.12);
          this.osc(tt, 'sine', 1200 + Math.random() * 2600, 1200 + Math.random() * 2600, 0.18, 0.1, 0.001, out, 0.15);
          if (i % 3 === 0) this.thock(tt + 0.03, 0.6, out, 0.6);
        }
        break;
      case 'victory':
        [392, 494, 587, 784].forEach((f, i) => this.brass(t + i * 0.2, f, i === 3 ? 1.2 : 0.22, 0.2, out, 0.5));
        break;
      case 'defeat':
        [220, 196, 165, 131].forEach((f, i) => this.brass(t + i * 0.45, f, 0.5, 0.18, out, 0.6));
        break;
      case 'fanfare':
        [392, 523, 659, 784, 1046].forEach((f, i) => this.brass(t + i * 0.14, f, i === 4 ? 1.3 : 0.18, 0.17, out, 0.55));
        this.bell(t + 0.7, 1046, 0.2, 2.2, out, 0.7);
        break;
      case 'tier':
        [523, 659, 784].forEach((f, i) => this.brass(t + i * 0.16, f, i === 2 ? 0.9 : 0.15, 0.15, out, 0.5));
        [1046, 1318].forEach((f, i) => this.bell(t + 0.45 + i * 0.12, f, 0.16, 1.8, out, 0.7));
        break;
      case 'train':
        this.noise(t, 0.28, 'highpass', 4000, 0.6, 0.18, 0.12, out);
        this.noise(t + 0.3, 0.05, 'highpass', 3000, 1, 0.4, 0.001, out);
        this.osc(t + 0.3, 'sine', 2400, 2400, 0.4, 0.15, 0.001, out, 0.2);
        break;
    }
  }

  private thock(t: number, p: number, out: AudioNode, a: number) {
    this.noise(t, 0.075, 'bandpass', 750 * p, 0.9, 0.95 * a, 0.002, out, 0.05);
    this.osc(t, 'sine', 200 * p, 70 * p, 0.1, 0.7 * a, 0.002, out);
    this.noise(t, 0.02, 'highpass', 2600, 0.7, 0.22 * a, 0.001, out);
  }

  /* ---------- Окружение ---------- */

  private startAmbience() {
    const ctx = this.ctx!;
    const mk = (type: BiquadFilterType, f: number, q: number, g: number, lfo: number, lfoDepth: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = type;
      bp.frequency.value = f;
      bp.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = g;
      const l = ctx.createOscillator();
      l.frequency.value = lfo;
      const ld = ctx.createGain();
      ld.gain.value = lfoDepth;
      l.connect(ld);
      ld.connect(gain.gain);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(this.ambBus);
      src.start();
      l.start();
    };
    mk('bandpass', 380, 0.4, 0.05, 0.07, 0.03); // ветер
    mk('lowpass', 650, 0.7, 0.035, 0.13, 0.025); // вода
  }

  /** dt в секундах; play — идёт ли игра; night 0..1 */
  ambience(dt: number, play: boolean, night: number, fireNear: boolean) {
    if (!this.ctx || !this.running) return;
    if (play !== this.ambOn) {
      this.ambOn = play;
      this.applyVol();
    }
    if (!play) return;
    const t = this.ctx.currentTime + 0.01;
    this.birdT -= dt;
    if (this.birdT <= 0) {
      this.birdT = 3 + Math.random() * 7;
      if (night < 0.45 && this.sfxVol > 0) {
        const n = 2 + Math.floor(Math.random() * 4);
        const base = 2800 + Math.random() * 1800;
        const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        const out = this.ctx.createGain();
        out.gain.value = 0.22;
        if (pan) {
          pan.pan.value = Math.random() * 1.6 - 0.8;
          out.connect(pan);
          pan.connect(this.ambBus);
        } else out.connect(this.ambBus);
        for (let i = 0; i < n; i++) this.osc(t + i * 0.11, 'sine', base, base * (1.25 + Math.random() * 0.4), 0.07, 0.35, 0.01, out, 0.15);
      }
    }
    this.cricketT -= dt;
    if (night > 0.5 && this.cricketT <= 0 && this.sfxVol > 0) {
      this.cricketT = 0.55;
      const o = this.ctx.createOscillator();
      o.frequency.value = 4300 + Math.random() * 300;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      for (let i = 0; i < 4; i++) {
        g.gain.setValueAtTime(0.025 * night, t + i * 0.07);
        g.gain.setValueAtTime(0, t + i * 0.07 + 0.035);
      }
      o.connect(g);
      g.connect(this.ambBus);
      o.start(t);
      o.stop(t + 0.35);
    }
    if (fireNear && Math.random() < dt * 9 && this.sfxVol > 0) {
      const o = this.ctx.createGain();
      o.gain.value = 0.25;
      o.connect(this.ambBus);
      this.noise(t, 0.015 + Math.random() * 0.02, 'highpass', 1800 + Math.random() * 3000, 0.8, 0.3 * Math.random() + 0.05, 0.001, o);
    }
  }

  /* ---------- Музыка ---------- */

  music(mode: MusicMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(0, t, 0.25);
    window.clearTimeout(this.fadeTimer);
    this.fadeTimer = window.setTimeout(() => {
      if (!this.ctx) return;
      this.step = 0;
      this.melodyQ = [];
      if (mode) this.cfg = CFG[mode];
      this.nextT = this.ctx.currentTime + 0.1;
      this.musicBus.gain.setTargetAtTime(mode ? this.musicVol * 0.8 : 0, this.ctx.currentTime, 0.8);
    }, 900);
  }

  private deg(d: number): number {
    const sc = this.cfg.scale;
    const o = Math.floor(d / 7);
    return this.cfg.root + sc[((d % 7) + 7) % 7] + 12 * o;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.mode || this.musicVol <= 0.001) {
      if (ctx) this.nextT = Math.max(this.nextT, ctx.currentTime);
      return;
    }
    while (this.nextT < ctx.currentTime + 0.4) {
      this.beat(this.nextT, this.step);
      this.nextT += 60 / this.cfg.bpm / 2; // восьмая
      this.step++;
    }
  }

  private beat(t: number, step: number) {
    const c = this.cfg;
    const eighth = 60 / c.bpm / 2;
    const bar = Math.floor(step / 8);
    const inBar = step % 8;
    const d = c.prog[bar % c.prog.length];
    const chord = [d, d + 2, d + 4].map((x) => this.deg(x));
    const out = this.musicBus;
    if (inBar === 0) {
      // пэд
      if (c.pad > 0) {
        for (const m of [chord[0] + 12, chord[1] + 12, chord[2] + 12]) this.pad(t, mtof(m), eighth * 8, 0.035 * c.pad, out);
      }
      // бас
      this.osc(t, 'triangle', mtof(chord[0] - 12), mtof(chord[0] - 12), eighth * 6, 0.26, 0.02, out);
      if (c.brass) this.brass(t, mtof(chord[0] - 12), eighth * 6, 0.07, out, 0.4);
      // мелодия: каждые две такта
      if (bar % 2 === 0 && Math.random() < c.melody) this.makePhrase(t, eighth, d);
    }
    // лютня
    if (c.lute > 0 && (inBar % 1 === 0)) {
      const pat = [0, 1, 2, 1, 0, 1, 2, 1];
      const skip = Math.random() > 0.75 * c.lute + 0.2;
      if (!skip) {
        const idx = pat[inBar];
        const hi = inBar === 3 || inBar === 7 ? 12 : 0;
        this.pluck(t + Math.random() * 0.012, mtof(chord[idx] + 12 + hi), 0.14 * (inBar % 2 ? 0.7 : 1), out);
      }
    }
    // ударные
    if (c.drums === 1) {
      if (inBar === 0) this.drum(t, 0.55, 95, out);
      if (inBar === 4) this.drum(t, 0.38, 80, out);
      if (inBar === 6 && Math.random() < 0.4) this.drum(t, 0.2, 110, out);
      if (inBar % 2 === 1) this.noise(t, 0.04, 'highpass', 6500, 0.7, 0.025, 0.002, out);
    } else if (c.drums === 2) {
      if (inBar % 2 === 0) this.drum(t, inBar === 0 ? 0.95 : 0.65, 70, out);
      if (inBar === 3 || inBar === 7) this.drum(t, 0.35, 100, out);
      if (inBar === 5) this.drum(t, 0.3, 90, out);
    }
    // мелодия
    while (this.melodyQ.length && this.melodyQ[0].t <= t + eighth * 0.5) {
      const n = this.melodyQ.shift()!;
      this.flute(Math.max(t, n.t), mtof(n.midi), n.dur, c.brass ? 0.1 : 0.16, out);
    }
  }

  private makePhrase(t: number, eighth: number, d: number) {
    const c = this.cfg;
    const lens = [2, 2, 4, 3, 1, 2, 4, 2];
    let pos = 0;
    let deg = d + 7 + [0, 2, 4][Math.floor(Math.random() * 3)];
    const total = 16;
    this.melodyQ = [];
    let i = 0;
    while (pos < total - 1 && i < 7) {
      const len = lens[Math.floor(Math.random() * lens.length)];
      if (Math.random() < 0.12) {
        pos += len;
        continue;
      }
      this.melodyQ.push({ t: t + pos * eighth, midi: this.deg(deg), dur: Math.min(len, total - pos) * eighth * 0.95 });
      deg += [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
      deg = Math.max(d + 3, Math.min(d + 13, deg));
      pos += len;
      i++;
    }
    void c;
  }

  private pluck(t: number, f: number, peak: number, out: AudioNode) {
    const ctx = this.ctx!;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'triangle';
    o2.type = 'sawtooth';
    o1.frequency.value = f;
    o2.frequency.value = f;
    o2.detune.value = 4;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(7000, f * 7), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 1.2), t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    g.connect(out);
    this.sendVerb(g, 0.45);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 1.2);
    o2.stop(t + 1.2);
  }

  private pad(t: number, f: number, dur: number, peak: number, out: AudioNode) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.3);
    }
    lp.connect(g);
    g.connect(out);
    this.sendVerb(g, 0.6);
  }

  private flute(t: number, f: number, dur: number, peak: number, out: AudioNode) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.09);
    g.gain.setValueAtTime(peak * 0.9, t + Math.max(0.1, dur - 0.1));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5 + Math.random();
    const ld = ctx.createGain();
    ld.gain.setValueAtTime(0, t);
    ld.gain.linearRampToValueAtTime(7, t + Math.min(0.5, dur));
    lfo.connect(ld);
    for (const [type, mul, a] of [['sine', 1, 1], ['sine', 2, 0.22], ['triangle', 1, 0.2]] as [OscillatorType, number, number][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      ld.connect(o.detune);
      const ga = ctx.createGain();
      ga.gain.value = a;
      o.connect(ga);
      ga.connect(g);
      o.start(t);
      o.stop(t + dur + 0.3);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.3);
    g.connect(out);
    this.sendVerb(g, 0.75);
    this.noise(t, dur, 'bandpass', f * 3, 1.2, peak * 0.18, 0.06, out);
  }

  private drum(t: number, peak: number, f: number, out: AudioNode) {
    this.osc(t, 'sine', f * 1.5, f * 0.6, 0.3, peak, 0.003, out, 0.25);
    this.noise(t, 0.12, 'lowpass', 500, 0.8, peak * 0.5, 0.002, out, 0.2);
  }
}

export const audio = new AudioEngine();
