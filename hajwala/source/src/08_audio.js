// =====================================================================
//  AUDIO (all procedural WebAudio)
// =====================================================================
const AUDIO = {
  ctx: null, ok: false, master: null, sfx: null, mus: null, noiseBuf: null, engines: [], musicOn: true,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx = new C(); const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
      this.master.connect(comp).connect(c.destination);
      this.sfx = c.createGain(); this.sfx.connect(this.master); this.sfx.gain.value = SAVE.settings.sfx;
      this.mus = c.createGain(); this.mus.connect(this.master); this.mus.gain.value = SAVE.settings.music ? SAVE.settings.musicVol * 0.5 : 0;
      const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
      // reverb-ish delay send for music
      this.ok = true;
      this.crowdInit(); this.tiresInit(); this.windInit(); this.sirenInit();
      MUSIC.init();
      if (c.state === 'suspended') c.resume().catch(() => { });
    } catch (e) { this.ok = false; }
  },
  setSfx(v) { if (this.sfx) this.sfx.gain.value = v; },
  setMusic(on, vol) { if (this.mus) this.mus.gain.setTargetAtTime(on ? vol * 0.5 : 0, this.ctx.currentTime, 0.2); },
  noise(loop = true) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = loop; return s; },
  env(g, t, a, peak, dcy, end = 0.0001) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + dcy); },
  // ------------------------------------------------ engine voice
  makeEngine(v, full = true) {
    if (!this.ok) return null;
    const c = this.ctx, tone = v.spec.engine.tone;
    const out = c.createGain(); out.gain.value = 0;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = tone === 'muscle' ? 3 : 1.2;
    const shaper = c.createWaveShaper(); const curve = new Float32Array(1024); const drive = tone === 'muscle' ? 3.2 : tone === 'deep' ? 2.4 : tone === 'rattly' ? 4 : 1.8;
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * drive) / Math.tanh(drive); } shaper.curve = curve;
    const mix = c.createGain(); mix.gain.value = 0.5;
    const o1 = c.createOscillator(); o1.type = 'sawtooth';
    const o2 = c.createOscillator(); o2.type = tone === 'smooth' ? 'triangle' : 'square';
    const o3 = c.createOscillator(); o3.type = 'sawtooth';
    const g1 = c.createGain(), g2 = c.createGain(), g3 = c.createGain();
    g1.gain.value = 0.5; g2.gain.value = tone === 'deep' || tone === 'muscle' ? 0.55 : 0.3; g3.gain.value = tone === 'smooth' ? 0.22 : 0.12;
    o1.connect(g1).connect(mix); o2.connect(g2).connect(mix); o3.connect(g3).connect(mix);
    // lumpy AM
    const am = c.createGain(); am.gain.value = 1;
    const lfo = c.createOscillator(); lfo.type = 'sine'; const lfoG = c.createGain(); lfoG.gain.value = tone === 'muscle' ? 0.35 : tone === 'rattly' ? 0.5 : 0.12;
    lfo.connect(lfoG).connect(am.gain);
    mix.connect(am).connect(shaper).connect(lp);
    let nz = null, nzG = null, bp = null;
    if (full) {
      nz = this.noise(); bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5; nzG = c.createGain(); nzG.gain.value = 0;
      nz.connect(bp).connect(nzG).connect(lp); nz.start();
    }
    let tw = null, twG = null;
    if (full) { tw = c.createOscillator(); tw.type = 'sine'; twG = c.createGain(); twG.gain.value = 0; tw.connect(twG).connect(out); tw.start(); }
    if (pan) { lp.connect(out).connect(pan).connect(this.sfx); } else lp.connect(out).connect(this.sfx);
    for (const o of [o1, o2, o3, lfo]) o.start();
    const e = { v, out, lp, o1, o2, o3, lfo, nzG, bp, tw, twG, pan, full, boost: 0, lastThr: 0, popT: 0, vol: full ? 0.5 : 0.25 };
    this.engines.push(e); return e;
  },
  killEngine(e) { if (!e) return; try { e.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); setTimeout(() => { for (const o of [e.o1, e.o2, e.o3, e.lfo, e.tw]) o && o.stop(); e.out.disconnect(); }, 300); } catch (er) { } this.engines = this.engines.filter(x => x !== e); },
  updateEngine(e, dt, distGain = 1, panV = 0) {
    if (!e || !this.ok) return;
    const v = e.v, c = this.ctx, t = c.currentTime, cyl = v.spec.engine.cyl, rpm = v.rpm;
    const f = rpm / 60 * cyl / 2 * (v.spec.engine.tone === 'deep' ? 0.85 : 1);
    const k = 0.05;
    e.o1.frequency.setTargetAtTime(f, t, k); e.o2.frequency.setTargetAtTime(f * 0.5, t, k); e.o3.frequency.setTargetAtTime(f * 2.01, t, k);
    e.lfo.frequency.setTargetAtTime(f / (v.spec.engine.tone === 'rattly' ? 2 : 4), t, k);
    const thr = v.input.throttle;
    e.lp.frequency.setTargetAtTime(300 + thr * 2600 + rpm * 0.25 + (v.nitroOn ? 1500 : 0), t, 0.06);
    const vol = (0.22 + thr * 0.5 + rpm / 9000 * 0.3) * e.vol * distGain;
    e.out.gain.setTargetAtTime(vol, t, 0.05);
    if (e.pan) e.pan.pan.setTargetAtTime(clamp(panV, -1, 1), t, 0.05);
    if (e.full) {
      e.bp.frequency.setTargetAtTime(f * 3, t, 0.05); e.nzG.gain.setTargetAtTime(thr * 0.12 + (v.nitroOn ? 0.18 : 0), t, 0.05);
      // turbo
      if (v.ph.turbo) {
        e.boost = damp(e.boost, thr * clamp((rpm - 2500) / 4000, 0, 1), 3, dt);
        e.tw.frequency.setTargetAtTime(1800 + e.boost * 3800, t, 0.05); e.twG.gain.setTargetAtTime(e.boost * 0.035, t, 0.05);
        if (e.lastThr > 0.7 && thr < 0.2 && e.boost > 0.4) { this.blowoff(); e.boost = 0; }
      }
      // pops / crackle on lift
      if (e.lastThr > 0.6 && thr < 0.15 && rpm > 4200) { e.popT = 0.7 + Math.random() * 0.5; }
      if (e.popT > 0) {
        e.popT -= dt;
        const rate = v.spec.engine.tone === 'rattly' ? 22 : 12;
        if (Math.random() < rate * dt) { this.pop(v.spec.engine.tone === 'rattly' ? 0.55 : 0.4); if (Math.random() < 0.4) backfire(v); }
      }
      if (v.spec.engine.tone === 'rattly' && thr < 0.2 && Math.random() < dt * 3) this.pop(0.18);
      e.lastThr = thr;
    }
  },
  blowoff() { if (!this.ok) return; const c = this.ctx, t = c.currentTime; const n = this.noise(false), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(3800, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.4); this.env(g, t, 0.01, 0.35, 0.42); n.connect(bp).connect(g).connect(this.sfx); n.start(t); n.stop(t + 0.5); },
  pop(vol = 0.4) { if (!this.ok) return; const c = this.ctx, t = c.currentTime + Math.random() * 0.02; const n = this.noise(false), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 900 + Math.random() * 1500; this.env(g, t, 0.002, vol, 0.06); n.connect(lp).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.1); },
  shift(up) { if (!this.ok) return; const c = this.ctx, t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(up ? 140 : 110, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08); this.env(g, t, 0.003, 0.08, 0.09); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.12); this.pop(0.22); },
  // ------------------------------------------------ tyres, wind, sand
  tiresInit() {
    const c = this.ctx;
    const n = this.noise(), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 6;
    this.tireG = c.createGain(); this.tireG.gain.value = 0;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 880; const og = c.createGain(); og.gain.value = 0.25; const vib = c.createOscillator(); vib.frequency.value = 9; const vg = c.createGain(); vg.gain.value = 30; vib.connect(vg).connect(o.frequency); vib.start();
    n.connect(bp).connect(this.tireG); o.connect(og).connect(this.tireG); this.tireG.connect(this.sfx); n.start(); o.start(); this.tireOsc = o;
    const n2 = this.noise(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; this.sandG = c.createGain(); this.sandG.gain.value = 0;
    n2.connect(lp).connect(this.sandG).connect(this.sfx); n2.start();
  },
  windInit() { const c = this.ctx; const n = this.noise(), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.5; this.windG = c.createGain(); this.windG.gain.value = 0; this.windBp = bp; n.connect(bp).connect(this.windG).connect(this.sfx); n.start(); },
  updateCarAmb(v, dt) {
    if (!this.ok) return; const t = this.ctx.currentTime;
    let slip = 0, sand = 0;
    for (const w of v.wheels) if (w.contact) { if (w.surf !== S_SAND) slip = Math.max(slip, w.slip); else sand += 0.25; }
    const sq = clamp((slip - 0.45) * 1.2, 0, 1) * clamp(v.speed / 8, 0, 1);
    this.tireG.gain.setTargetAtTime(sq * 0.22, t, 0.05);
    this.tireOsc.frequency.setTargetAtTime(760 + slip * 220 + v.speed * 2, t, 0.1);
    this.sandG.gain.setTargetAtTime(sand * clamp(v.speed / 20, 0, 1) * 0.35, t, 0.08);
    const w = clamp(v.speed / 60, 0, 1); this.windG.gain.setTargetAtTime(w * w * 0.18, t, 0.1); this.windBp.frequency.setTargetAtTime(400 + w * 900, t, 0.1);
  },
  silenceCar() { if (!this.ok) return; const t = this.ctx.currentTime; for (const g of [this.tireG, this.sandG, this.windG]) g.gain.setTargetAtTime(0, t, 0.05); },
  // ------------------------------------------------ impacts
  thud(str = 0.5, kind = 'car') {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime, s = clamp(str, 0.05, 1);
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(kind === 'box' ? 180 : 95, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2); this.env(g, t, 0.003, 0.6 * s, 0.25); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.3);
    const n = this.noise(false), f = c.createBiquadFilter(), g2 = c.createGain(); f.type = kind === 'metal' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'metal' ? 2200 : kind === 'cone' ? 1400 : 700; f.Q.value = kind === 'metal' ? 4 : 0.7;
    this.env(g2, t, 0.002, 0.5 * s, kind === 'metal' ? 0.35 : 0.15); n.connect(f).connect(g2).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.5);
    if (kind === 'metal' || s > 0.6) { const o2 = c.createOscillator(), g3 = c.createGain(); o2.type = 'square'; o2.frequency.value = 1300 + Math.random() * 900; this.env(g3, t, 0.002, 0.05 * s, 0.2); o2.connect(g3).connect(this.sfx); o2.start(t); o2.stop(t + 0.25); }
  },
  scrape(str) { this.thud(str * 0.5, 'metal'); },
  // ------------------------------------------------ horns
  hornOn: null,
  horn(type, on, gain = 1, panV = 0) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime;
    if (!on) { if (this.hornOn && this.hornOn.g) { this.hornOn.g.gain.setTargetAtTime(0, t, 0.03); const h = this.hornOn; setTimeout(() => h.os.forEach(o => { try { o.stop(); } catch (e) { } }), 200); } this.hornOn = null; return; }
    const out = c.createGain(); out.gain.value = gain;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) { pan.pan.value = clamp(panV, -1, 1); out.connect(pan).connect(this.sfx); } else out.connect(this.sfx);
    const tone = (freqs, typ, dur, vol = 0.12, lpf = 2500) => {
      const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf; g.gain.value = 0;
      const os = freqs.map(f => { const o = c.createOscillator(); o.type = typ; o.frequency.value = f; o.connect(lp); o.start(t); return o; });
      lp.connect(g).connect(out); g.gain.setTargetAtTime(vol, t, 0.01);
      if (dur) { g.gain.setTargetAtTime(0, t + dur, 0.03); os.forEach(o => o.stop(t + dur + 0.2)); }
      return { g, os };
    };
    const seq = (notes, typ, vol = 0.11) => { notes.forEach(([f, st, d]) => { const o = c.createOscillator(), g = c.createGain(); o.type = typ; o.frequency.setValueAtTime(f, t + st); this.env(g, t + st, 0.005, vol, d); o.connect(g).connect(out); o.start(t + st); o.stop(t + st + d + 0.05); }); };
    let h = null;
    if (type === 0) h = tone([415, 520], 'square', 0, 0.09, 1800);
    else if (type === 1) h = tone([180, 227, 270], 'sawtooth', 0, 0.09, 1400);
    else if (type === 2) { seq([[620, 0, 0.09], [480, 0.1, 0.12], [620, 0.3, 0.09], [450, 0.4, 0.16]], 'square', 0.09); }
    else if (type === 3) { const D = 293.66, q = (s) => D * Math.pow(2, s / 12); seq([[q(0), 0, 0.12], [q(1), 0.12, 0.12], [q(4), 0.24, 0.12], [q(5), 0.36, 0.12], [q(7), 0.48, 0.25], [q(5), 0.75, 0.12], [q(4), 0.87, 0.12], [q(1), 0.99, 0.12], [q(0), 1.11, 0.35]], 'sawtooth', 0.07); }
    else if (type === 4) { seq([[2400, 0, 0.35], [3150, 0, 0.3], [2400, 0.22, 0.4], [3150, 0.22, 0.35]], 'sine', 0.08); }
    else if (type === 5) h = tone([290, 349], 'square', 0, 0.1, 1100);
    if (h && gain >= 0.99) this.hornOn = h;
    else if (h) { h.g.gain.setTargetAtTime(0, t + 0.5, 0.05); h.os.forEach(o => o.stop(t + 0.8)); }
  },
  // ------------------------------------------------ siren
  sirenInit() { const c = this.ctx; const o = c.createOscillator(); o.type = 'triangle'; const lfo = c.createOscillator(); lfo.frequency.value = 0.55; const lg = c.createGain(); lg.gain.value = 380; lfo.connect(lg).connect(o.frequency); o.frequency.value = 950; this.sirG = c.createGain(); this.sirG.gain.value = 0; const lp = c.createBiquadFilter(); lp.frequency.value = 2400; o.connect(lp).connect(this.sirG).connect(this.sfx); o.start(); lfo.start(); },
  siren(g) { if (!this.ok) return; this.sirG.gain.setTargetAtTime(g * 0.13, this.ctx.currentTime, 0.15); },
  // ------------------------------------------------ crowd
  crowdInit() {
    const c = this.ctx;
    const n = this.noise(), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
    const bp2 = c.createBiquadFilter(); bp2.type = 'peaking'; bp2.frequency.value = 1800; bp2.gain.value = 6;
    this.crowdG = c.createGain(); this.crowdG.gain.value = 0;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.7; const lg = c.createGain(); lg.gain.value = 0.3; const am = c.createGain(); am.gain.value = 0.7; lfo.connect(lg).connect(am.gain); lfo.start();
    n.connect(bp).connect(bp2).connect(am).connect(this.crowdG).connect(this.sfx); n.start(); this.crowdBp = bp;
    this.clapAcc = 0; this.whistleT = 0;
  },
  updateCrowd(level, excite, dt) {
    if (!this.ok) return; const t = this.ctx.currentTime;
    this.crowdG.gain.setTargetAtTime(level * (0.04 + excite * 0.22), t, 0.25);
    this.crowdBp.frequency.setTargetAtTime(600 + excite * 600, t, 0.3);
    this.clapAcc += dt * level * (excite * 26);
    while (this.clapAcc > 1) { this.clapAcc -= 1; this.clap(level * (0.05 + excite * 0.12)); }
    this.whistleT -= dt;
    if (excite > 0.6 && level > 0.3 && this.whistleT < 0 && Math.random() < dt * 1.5) { this.whistle(level * 0.08); this.whistleT = 1.2; }
  },
  clap(vol) { const c = this.ctx, t = c.currentTime + Math.random() * 0.05; for (let k = 0; k < 3; k++) { const n = this.noise(false), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1200 + Math.random() * 900; bp.Q.value = 1.2; const tt = t + k * 0.009; this.env(g, tt, 0.001, vol, 0.05); n.connect(bp).connect(g).connect(this.sfx); n.start(tt, Math.random()); n.stop(tt + 0.08); } },
  whistle(vol) { const c = this.ctx, t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(3200, t + 0.25); o.frequency.exponentialRampToValueAtTime(2000, t + 0.6); this.env(g, t, 0.02, vol, 0.6); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.7); },
  cheer(vol = 0.3) { if (!this.ok) return; const c = this.ctx, t = c.currentTime; const n = this.noise(false), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6; this.env(g, t, 0.15, vol, 1.6); n.connect(bp).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 2); for (let k = 0; k < 14; k++) setTimeout(() => this.clap(vol * 0.4), k * 60 + Math.random() * 80); },
  // ------------------------------------------------ ui
  chime(kind = 'cup') {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime;
    const notes = kind === 'cup' ? [880, 1108, 1318, 1760] : kind === 'money' ? [1318, 1760, 2093] : kind === 'cp' ? [988, 1318] : kind === 'bad' ? [330, 247] : kind === 'go' ? [1318] : kind === 'beep' ? [659] : kind === 'secret' ? [659, 880, 1108, 1318, 1760, 2217] : [784, 988];
    notes.forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = kind === 'bad' ? 'square' : 'triangle'; o.frequency.value = f; const st = t + i * (kind === 'secret' ? 0.07 : 0.085); this.env(g, st, 0.005, kind === 'go' ? 0.22 : 0.14, kind === 'go' ? 0.6 : 0.35); o.connect(g).connect(this.sfx); o.start(st); o.stop(st + 0.8); });
  },
  click() { if (!this.ok) return; const c = this.ctx, t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 1400; this.env(g, t, 0.002, 0.06, 0.05); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.08); },
};

// ---------------------------------------------------------------- procedural khaleeji music
const MUSIC = {
  bpm: 100, step: 0, next: 0, timer: null, bar: 0, seedR: mulberry(31),
  init() {
    const c = AUDIO.ctx; this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(AUDIO.mus);
    // light delay for space
    const dl = c.createDelay(); dl.delayTime.value = 0.28; const fb = c.createGain(); fb.gain.value = 0.25; const wet = c.createGain(); wet.gain.value = 0.22;
    this.out.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(AUDIO.mus);
    this.next = c.currentTime + 0.3; this.makePhrase();
    this.timer = setInterval(() => this.sched(), 60);
  },
  // bayati on D with quarter tone (E half-flat)
  scale: [0, 1.5, 3, 5, 7, 8, 10, 12, 13.5, 15],
  makePhrase() {
    const r = this.seedR; this.mel = [];
    let deg = 4;
    for (let i = 0; i < 16; i++) {
      if ([0, 3, 6, 8, 10, 12, 14].includes(i) && r() < 0.85) { deg = clamp(deg + Math.round((r() - 0.5) * 4), 0, 9); this.mel.push(deg); } else this.mel.push(-1);
    }
    this.mel[15] = -1; this.mel[12] = 0;
  },
  sched() {
    const c = AUDIO.ctx; if (!c || AUDIO.mus.gain.value < 0.001 && !SAVE.settings.music) { this.next = c ? c.currentTime + 0.1 : 0; return; }
    const sp = 60 / this.bpm / 4;
    while (this.next < c.currentTime + 0.25) { this.play(this.step, this.next); this.next += sp; this.step = (this.step + 1) % 16; if (this.step === 0) { this.bar++; if (this.bar % 4 === 0) this.makePhrase(); } }
  },
  drum(t, f0, f1, dur, vol) { const c = AUDIO.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8); AUDIO.env(g, t, 0.003, vol, dur); o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05); },
  slap(t, f, q, vol, dur) { const c = AUDIO.ctx, n = AUDIO.noise(false), b = c.createBiquadFilter(), g = c.createGain(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; AUDIO.env(g, t, 0.001, vol, dur); n.connect(b).connect(g).connect(this.out); n.start(t, Math.random()); n.stop(t + dur + 0.05); },
  pluck(t, f, vol, dur) { const c = AUDIO.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 1.003; lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur); AUDIO.env(g, t, 0.004, vol, dur); o.connect(lp); o2.connect(lp); lp.connect(g).connect(this.out); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); },
  play(s, t) {
    // khaleeji groove: doum / tak / claps
    if (s === 0 || s === 6 || s === 10) this.drum(t, 120, 48, 0.32, 0.5);
    if (s === 3 || s === 8 || s === 13) this.slap(t, 1800, 1.4, 0.18, 0.08);
    if (s === 4 || s === 12) { for (let k = 0; k < 4; k++) this.slap(t + k * 0.008 + Math.random() * 0.006, 1300 + Math.random() * 800, 1.1, 0.12, 0.06); }
    if (s % 2 === 1) this.slap(t, 6000, 0.8, 0.025, 0.03);
    if (s === 14 && this.bar % 2 === 1) this.slap(t, 2200, 1.3, 0.12, 0.06);
    // bass
    const D = 73.42;
    if (s === 0 || s === 10) this.pluck(t, D, 0.16, 0.4);
    if (s === 6) this.pluck(t, D * 1.5, 0.12, 0.3);
    // melody
    const m = this.mel[s];
    if (m >= 0 && this.bar % 8 >= 2) { const semis = this.scale[m]; this.pluck(t, 293.66 * Math.pow(2, semis / 12), 0.06, 0.35); }
  }
};
