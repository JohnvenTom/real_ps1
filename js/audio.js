// ============================================================
// All-synthesized audio: SFX + per-scene ambient BGM.
// No external files. Starts muted; first user gesture enables.
// ============================================================
import { Toggles } from './config.js';

const NOTE = f => 440 * Math.pow(2, (f - 69) / 12);

const SCENES_BGM = {
  orbit:  { root: 33, chords: [[0, 3, 7, 10], [-2, 2, 5, 9]], tempo: 46, wave: 'sawtooth', cutoff: 420, pluck: false, noise: 90,  noiseQ: 0.6, boomEvery: [7, 16] },
  rings:  { root: 38, chords: [[0, 4, 7, 11], [5, 9, 12, 16]], tempo: 38, wave: 'sawtooth', cutoff: 380, pluck: true,  noise: 160, noiseQ: 1.2 },
  belt:   { root: 29, chords: [[0, 1, 7], [0, 3, 10]], tempo: 40, wave: 'square',  cutoff: 240, pluck: false, noise: 70,  noiseQ: 2.5, clankEvery: [4, 11] },
  warp:   { root: 35, chords: [[0, 5, 14], [2, 7, 16]], tempo: 60, wave: 'sawtooth', cutoff: 900, pluck: true,  noise: 400, noiseQ: 0.8, sweep: true },
  window: { root: 40, chords: [[0, 4, 9, 14], [2, 5, 12, 16], [-3, 4, 7, 11]], tempo: 44, wave: 'triangle', cutoff: 700, pluck: true, noise: 120, noiseQ: 0.7 },
  title:  { root: 36, chords: [[0, 3, 7, 12], [-4, 3, 8, 12]], tempo: 34, wave: 'sawtooth', cutoff: 300, pluck: false, noise: 60, noiseQ: 0.5 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sceneId = null;
    this._voices = [];
    this._timer = null;
    this._nextBeat = 0;
    this._beat = 0;
    this._lastBoom = 0;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return false; }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    return true;
  }

  get on() { return Toggles.sound && this.ctx; }
  setEnabled(v) {
    Toggles.sound = v;
    if (v && this.ensure() && this.ctx.state === 'suspended') this.ctx.resume();
    if (!v) this._duckMaster();
    else this.master.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.3);
  }
  _duckMaster() { if (this.ctx) this.master.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.15); }

  // ---------- SFX ----------
  _env(node, t0, a, d, peak = 0.5) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + a + d);
    node.connect(g).connect(this.master);
    return g;
  }
  beep(freq = 880, dur = 0.07, type = 'square', peak = 0.18) {
    if (!this.on) return;
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    this._env(o, this.ctx.currentTime, 0.005, dur, peak);
    o.start(); o.stop(this.ctx.currentTime + dur + 0.05);
  }
  confirm() { this.beep(660, 0.06); setTimeout(() => this.beep(990, 0.1), 70); }
  deny() { this.beep(220, 0.12, 'square'); }
  laser() {
    if (!this.on) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(1450, t0);
    o.frequency.exponentialRampToValueAtTime(320, t0 + 0.16);
    this._env(o, t0, 0.004, 0.16, 0.1);
    o.start(); o.stop(t0 + 0.25);
  }
  boom(dist = 0.5) {
    if (!this.on) return;
    const t0 = this.ctx.currentTime;
    const len = 0.9;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t0);
    f.frequency.exponentialRampToValueAtTime(60, t0 + len);
    src.connect(f);
    this._env(f, t0, 0.008, len, 0.45 * dist);
    // sub thump
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(80, t0);
    o.frequency.exponentialRampToValueAtTime(28, t0 + 0.5);
    this._env(o, t0, 0.005, 0.5, 0.35 * dist);
    o.start(); o.stop(t0 + 0.6);
    src.start();
  }
  clank() {
    if (!this.on) return;
    const t0 = this.ctx.currentTime;
    [523, 1244, 1867].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f * (0.98 + Math.random() * 0.04);
      this._env(o, t0 + i * 0.005, 0.002, 0.12 + i * 0.03, 0.06);
      o.start(); o.stop(t0 + 0.3);
    });
  }
  warp() {
    if (!this.on) return;
    const t0 = this.ctx.currentTime;
    const len = 2.2;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(120, t0);
    f.frequency.exponentialRampToValueAtTime(2600, t0 + len * 0.85);
    f.frequency.exponentialRampToValueAtTime(90, t0 + len);
    src.connect(f);
    this._env(f, t0, 0.15, len, 0.4);
    src.start();
  }

  // ---------- BGM ----------
  setScene(id) {
    this.sceneId = id;
    if (this.ctx) this._startBgm();
  }

  start() {   // called on first enabling user gesture
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._startBgm();
  }

  _stopVoices() {
    for (const v of this._voices) { try { v.stop ? v.stop() : v.disconnect(); } catch {} }
    this._voices = [];
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _startBgm() {
    this._stopVoices();
    const cfg = SCENES_BGM[this.sceneId] || SCENES_BGM.title;
    if (!this.on) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.0;
    bus.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2);
    bus.connect(this.master);
    this._bgmBus = bus;

    // pad: chord notes, detuned pairs, slow filter breathing
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = cfg.cutoff; padFilter.Q.value = 0.8;
    padFilter.connect(bus);
    const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
    lfo.frequency.value = 0.05 + Math.random() * 0.04; lfoG.gain.value = cfg.cutoff * 0.35;
    lfo.connect(lfoG).connect(padFilter.frequency); lfo.start();
    this._voices.push(lfo);

    for (const semi of cfg.chords[0]) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = cfg.wave;
        o.frequency.value = NOTE(cfg.root + 12 + semi);
        o.detune.value = det;
        const g = ctx.createGain(); g.gain.value = 0.05;
        o.connect(g).connect(padFilter);
        o.start();
        this._voices.push(o, g);
      }
    }
    // bass drone
    const bass = ctx.createOscillator();
    bass.type = 'sine'; bass.frequency.value = NOTE(cfg.root - 12);
    const bg = ctx.createGain(); bg.gain.value = 0.11;
    bass.connect(bg).connect(bus); bass.start();
    this._voices.push(bass, bg);
    // space hiss
    const nLen = 2;
    const nBuf = ctx.createBuffer(1, ctx.sampleRate * nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const nSrc = ctx.createBufferSource(); nSrc.buffer = nBuf; nSrc.loop = true;
    const nF = ctx.createBiquadFilter();
    nF.type = 'bandpass'; nF.frequency.value = cfg.noise; nF.Q.value = cfg.noiseQ;
    const nG = ctx.createGain(); nG.gain.value = 0.02;
    nSrc.connect(nF).connect(nG).connect(bus); nSrc.start();
    this._voices.push(nSrc, nG);

    // slow chord cycle + optional plucks via lookahead scheduler
    this._beat = 0;
    this._nextBeat = ctx.currentTime + 0.2;
    const beatDur = 60 / cfg.tempo;
    const chords = cfg.chords;
    this._timer = setInterval(() => {
      if (!this.on) return;
      while (this._nextBeat < ctx.currentTime + 0.35) {
        const b = this._beat++;
        const t0 = this._nextBeat;
        // chord change every 8 beats: retune pad oscillators softly
        if (b % 8 === 0 && b > 0) {
          const chord = chords[(b / 8) % chords.length | 0];
          let idx = 0;
          for (const v of this._voices) {
            if (v.frequency && v.detune && v.type === cfg.wave) {
              const semi = chord[idx++ % chord.length];
              v.frequency.setTargetAtTime(NOTE(cfg.root + 12 + semi), t0, 0.6);
            }
          }
        }
        // pluck arpeggio
        if (cfg.pluck && b % 2 === 0 && Math.random() < 0.75) {
          const chord = chords[((b / 8) | 0) % chords.length];
          const semi = chord[Math.random() * chord.length | 0] + (Math.random() < 0.3 ? 12 : 0);
          const o = ctx.createOscillator();
          o.type = 'triangle'; o.frequency.value = NOTE(cfg.root + 24 + semi);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.075, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
          o.connect(g).connect(this._bgmBus || this.master);
          o.start(t0); o.stop(t0 + 1);
        }
        this._nextBeat += beatDur;
      }
      // random distant booms / clanks
      if (cfg.boomEvery && ctx.currentTime - this._lastBoom > cfg.boomEvery[0] + Math.random() * (cfg.boomEvery[1] - cfg.boomEvery[0])) {
        this._lastBoom = ctx.currentTime;
        this.boom(0.35);
      }
      if (cfg.clankEvery && ctx.currentTime - this._lastBoom > cfg.clankEvery[0] + Math.random() * (cfg.clankEvery[1] - cfg.clankEvery[0])) {
        this._lastBoom = ctx.currentTime;
        this.clank();
      }
    }, 120);
  }
}
