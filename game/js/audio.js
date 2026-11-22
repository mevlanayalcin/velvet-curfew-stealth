// Velvet Curfew — Procedural Spatial Web Audio Engine (Zero External Assets)

export {SpatialStealthAudio};

class SpatialStealthAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.droneGain = null;
    this.lastHeartbeat = 0;
  }

  playGuardFootstep(pan = 0, proximity = 0.5) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.065);
    const vol = Math.max(0.008, Math.min(0.055, proximity * 0.055));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
      osc.connect(gain); gain.connect(panner); panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain); gain.connect(this.ctx.destination);
    }
    osc.start(now); osc.stop(now + 0.08);
  }

  playCoinClink() {
    this._tone(1980, 0.22, 'sine', 0.08, 2240);
    setTimeout(() => this._tone(2740, 0.28, 'triangle', 0.05, 2560), 38);
  }

  playCurfewBell() {
    this._tone(520, 0.16, 'sawtooth', 0.085, 760);
    setTimeout(() => this._tone(740, 0.24, 'sawtooth', 0.075, 480), 140);
  }

  playSconceDouse() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.42);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(1100, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    src.connect(flt); flt.connect(gain); gain.connect(this.ctx.destination);
    src.start(now);
  }

  playVentClunk() {
    this._tone(190, 0.09, 'square', 0.05, 85);
    setTimeout(() => this._tone(240, 0.12, 'triangle', 0.045, 120), 65);
  }

  playStep(onCarpet, crouched) {
    const vol = crouched ? 0.022 : (onCarpet ? 0.032 : 0.055);
    this._tone(onCarpet ? 120 : 285, onCarpet ? 0.055 : 0.04, onCarpet ? 'sine' : 'triangle', vol, onCarpet ? 64 : 110);
  }

  playSuspicionSting() { this._tone(310, 0.19, 'sawtooth', 0.05, 440); }

  playRecoveryChime() {
    this._tone(440, 0.16, 'sine', 0.055, 554);
    setTimeout(() => this._tone(659, 0.22, 'sine', 0.055, 659), 90);
  }

  playLootChime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => setTimeout(() => this._tone(n, 0.24, 'triangle', 0.07), idx * 65));
  }

  playExtractChord() {
    [392, 493.88, 587.33, 783.99].forEach((n, idx) => setTimeout(() => this._tone(n, 0.55, 'sine', 0.065), idx * 55));
  }

  playHeartbeat(nowSec, urgency) {
    if (this.muted || !this.ctx) return;
    if (nowSec - this.lastHeartbeat < Math.max(0.32, 0.85 - urgency * 0.48)) return;
    this.lastHeartbeat = nowSec;
    this._tone(68, 0.11, 'sine', 0.05 + urgency * 0.05, 42);
    setTimeout(() => this._tone(58, 0.09, 'sine', 0.04 + urgency * 0.04, 38), 115);
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this._startAmbient();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(this.muted ? 0 : 0.028, this.ctx.currentTime, 0.08);
    }
    return this.muted;
  }

  _startAmbient() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator(), osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
    osc1.type = 'sine'; osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(55, now); osc2.frequency.setValueAtTime(82.41, now);
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(190, now);
    gain.gain.setValueAtTime(this.muted ? 0 : 0.028, now);
    osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    osc1.start(); osc2.start();
    this.droneGain = gain;
  }

  _tone(freq, dur, type = 'sine', vol = 0.08, endFreq = null) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + dur + 0.02);
  }
}
