// Synthesised sound effects and a light afro-pop music loop. No audio files needed.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.lastPlay = {};
    this.musicTimer = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.16 : 0;
      this.musicBus.connect(this.master);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setSfx(on) { this.sfxOn = on; }
  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.1);
    if (on) this.startMusic();
  }

  // ---- primitives ----
  tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005, bus = null } = {}) {
    const c = this.ctx; const t = c.currentTime + at;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, { vol = 0.2, at = 0, freq = 3000, q = 1, type = 'bandpass', bus = null, time = null } = {}) {
    const c = this.ctx; const t = time ?? c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  play(name, opt = {}) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
    const now = performance.now();
    const gap = { pick: 45, drop: 45, coin: 35, tick: 40, wash: 60, pop: 40 }[name] || 0;
    if (gap && now - (this.lastPlay[name] || 0) < gap) return;
    this.lastPlay[name] = now;
    const n = opt.n || 0;
    switch (name) {
      case 'pick': this.tone(520 + Math.min(n, 14) * 38, 0.09, { type: 'triangle', vol: 0.22, slide: 1.6 }); break;
      case 'drop': this.tone(300 - Math.min(n, 10) * 6, 0.1, { type: 'sine', vol: 0.3, slide: 0.55 }); this.noise(0.05, { vol: 0.05, freq: 1200 }); break;
      case 'coin': this.tone(1320, 0.07, { type: 'square', vol: 0.06 }); this.tone(1760, 0.12, { type: 'square', vol: 0.06, at: 0.05 }); break;
      case 'tick': this.tone(900 + (n % 8) * 40, 0.04, { type: 'square', vol: 0.04 }); break;
      case 'cash':
        this.noise(0.12, { vol: 0.12, freq: 5000, q: 0.7 });
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.12, at: 0.05 + i * 0.04 }));
        break;
      case 'unlock':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.2, at: i * 0.07 }));
        this.noise(0.5, { vol: 0.06, freq: 8000, at: 0.3, q: 0.5 });
        this.tone(130, 0.35, { type: 'sine', vol: 0.4, slide: 0.5 });
        break;
      case 'upgrade': [660, 880, 1175].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.18, at: i * 0.06 })); break;
      case 'honk': this.tone(392, 0.22, { type: 'square', vol: 0.07 }); this.tone(494, 0.22, { type: 'square', vol: 0.05 }); this.tone(392, 0.3, { type: 'square', vol: 0.07, at: 0.28 }); this.tone(494, 0.3, { type: 'square', vol: 0.05, at: 0.28 }); break;
      case 'happy': this.tone(880, 0.08, { type: 'sine', vol: 0.12, slide: 1.4 }); this.tone(1175, 0.1, { type: 'sine', vol: 0.1, at: 0.07, slide: 1.3 }); break;
      case 'click': this.tone(700, 0.05, { type: 'triangle', vol: 0.15 }); break;
      case 'deny': this.tone(200, 0.15, { type: 'square', vol: 0.06, slide: 0.7 }); break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, at: i * 0.1 }));
        break;
      case 'wash': this.noise(0.18, { vol: 0.12, freq: 1600, q: 0.6 }); this.tone(900, 0.08, { type: 'sine', vol: 0.06, slide: 1.8, at: 0.05 }); break;
      case 'rush': [392, 523, 659, 784, 659, 784].forEach((f, i) => this.tone(f, 0.14, { type: 'square', vol: 0.05, at: i * 0.08 })); break;
      case 'pop': this.tone(600, 0.06, { type: 'sine', vol: 0.15, slide: 2 }); break;
    }
  }

  // ---- music: 4-bar loop at 104 bpm, scheduled ahead of time ----
  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const bpm = 104; this.step16 = 60 / bpm / 4;
    this.nextTime = this.ctx.currentTime + 0.1; this.stepIdx = 0;
    // chord roots per bar (C, Am, F, G) and a marimba riff in C major pentatonic
    this.bass = [48, 0, 0, 48, 0, 0, 55, 0, 45, 0, 0, 45, 0, 52, 0, 0, 41, 0, 0, 41, 0, 0, 48, 0, 43, 0, 0, 43, 0, 47, 50, 0];
    this.riff = [
      72, 0, 76, 0, 79, 0, 76, 74, 0, 72, 0, 0, 69, 0, 72, 0,
      69, 0, 72, 0, 76, 0, 74, 72, 0, 69, 0, 0, 67, 0, 69, 0,
      65, 0, 69, 0, 72, 0, 74, 72, 0, 69, 0, 0, 72, 0, 74, 0,
      67, 0, 71, 0, 74, 0, 76, 74, 0, 79, 0, 76, 74, 0, 71, 0,
    ];
    this.musicTimer = setInterval(() => this.schedule(), 25);
  }
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') { if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05; return; }
    if (!this.musicOn) return;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.stepIdx, this.nextTime);
      this.nextTime += this.step16;
      this.stepIdx = (this.stepIdx + 1) % 64;
    }
  }
  playStep(i, t) {
    const b = this.musicBus; const c = this.ctx;
    const s = i % 16;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const at = t - c.currentTime;
    // kick: afrobeats-ish 3-3-2 feel
    if (s === 0 || s === 6 || s === 10) this.tone(110, 0.22, { type: 'sine', vol: 0.9, slide: 0.35, at, bus: b });
    // shaker on 16ths with accents
    this.noise(0.04, { vol: s % 4 === 2 ? 0.22 : 0.09, freq: 7000, q: 0.8, type: 'highpass', bus: b, time: t });
    // rim/clap on 4 and 12
    if (s === 4 || s === 12) this.noise(0.08, { vol: 0.35, freq: 1800, q: 2, bus: b, time: t });
    // log-drum style bass
    const bn = this.bass[Math.floor(i / 2) % 32];
    if (i % 2 === 0 && bn) this.tone(mtof(bn - 12), 0.3, { type: 'sine', vol: 0.55, slide: 0.92, at, bus: b });
    // marimba riff
    const m = this.riff[i];
    if (m) { this.tone(mtof(m), 0.25, { type: 'sine', vol: 0.32, at, bus: b }); this.tone(mtof(m) * 4, 0.06, { type: 'sine', vol: 0.06, at, bus: b }); }
  }
}

export const Sound = new AudioEngine();
