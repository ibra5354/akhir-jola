// =====================================================================
//  INPUT: keyboard, gamepad, touch, gyro
// =====================================================================
const INPUT = {
  keys: new Set(), edges: new Set(), steer: 0, throttle: 0, brake: 0, hand: 0, nitro: 0, horn: false, src: 'kb',
  touch: { steer: 0, gas: 0, brake: 0, hand: 0, nitro: 0, horn: false, sid: null, sx: 0 },
  gyro: { on: false, val: 0, ok: false, got: false }, pad: null, padPrev: [],
  init() {
    addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const k = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.edges.add(k);
      this.keys.add(k); this.src = 'kb'; AUDIO.init();
    });
    addEventListener('keyup', e => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.resetTouch(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.keys.clear(); this.resetTouch(); } });
    // prevent zoom gestures / context menu
    ['gesturestart', 'gesturechange', 'dblclick'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
    document.addEventListener('contextmenu', e => { if (!(e.target && e.target.id === 'shotImg')) e.preventDefault(); });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    this.initTouch();
  },
  resetTouch() { const t = this.touch; t.steer = t.gas = t.brake = t.hand = t.nitro = 0; t.horn = false; t.sid = null; $$('.tb.down').forEach(b => b.classList.remove('down')); },
  initTouch() {
    if (IS_TOUCH) document.body.classList.add('touch');
    const t = this.touch;
    const zone = $('#steerZone'), wheel = $('#wheel');
    const range = () => Math.max(70, innerWidth * 0.13) / (SAVE.settings.sens || 1);
    zone.addEventListener('pointerdown', e => { e.preventDefault(); if (t.sid != null) return; t.sid = e.pointerId; t.sx = e.clientX; zone.setPointerCapture(e.pointerId); wheel.style.left = e.clientX + 'px'; wheel.style.top = e.clientY + 'px'; wheel.classList.add('on'); AUDIO.init(); this.src = 'touch'; $('.sz-hint').style.opacity = 0; });
    zone.addEventListener('pointermove', e => { if (e.pointerId !== t.sid) return; const dx = e.clientX - t.sx; t.steer = clamp(dx / range(), -1, 1); });
    const up = e => { if (e.pointerId !== t.sid) return; t.sid = null; t.steer = 0; wheel.classList.remove('on'); };
    zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
    const bind = (id, key) => {
      const b = $(id); const ids = new Set();
      const on = e => { e.preventDefault(); ids.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch (er) { } b.classList.add('down'); t[key] = key === 'horn' ? true : 1; AUDIO.init(); this.src = 'touch'; if (key === 'horn') this.edges.add('TouchHorn'); };
      const off = e => { ids.delete(e.pointerId); if (!ids.size) { b.classList.remove('down'); t[key] = key === 'horn' ? false : 0; } };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    };
    bind('#tGas', 'gas'); bind('#tBrake', 'brake'); bind('#tHand', 'hand'); bind('#tNitro', 'nitro'); bind('#tHorn', 'horn');
    $('#tCam').addEventListener('pointerdown', e => { e.preventDefault(); this.edges.add('KeyC'); });
  },
  async enableGyro(on) {
    const g = this.gyro; g.on = on; g.got = false;
    const msg = $('#gyroMsg'); if (msg) msg.textContent = '';
    if (!on) return true;
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw new Error('denied');
      }
      if (!this._gyroBound) { this._gyroBound = true; addEventListener('deviceorientation', e => { if (e.gamma == null) return; g.got = true; const land = Math.abs(window.orientation || (screen.orientation && screen.orientation.angle) || 0) === 90; const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0; let v = land ? (ang === 90 || ang === -270 ? e.beta : -e.beta) : e.gamma; if (SAVE.settings.invertGyro) v = -v; g.val = clamp(v / 28, -1, 1); }); }
      setTimeout(() => { if (g.on && !g.got) { if (msg) msg.textContent = 'الإمالة مو متاحة هنا، رجعنا للسحب'; g.on = false; SAVE.settings.gyro = false; persist(); const cb = $('#sGyro'); if (cb) cb.checked = false; } }, 1800);
      return true;
    } catch (e) { g.on = false; if (msg) msg.textContent = 'ما انعطى إذن الإمالة'; return false; }
  },
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null; for (const q of pads) if (q && q.connected) { p = q; break; }
    this.pad = p; if (!p) return null;
    const b = (i) => p.buttons[i] ? p.buttons[i].value || (p.buttons[i].pressed ? 1 : 0) : 0;
    const prev = this.padPrev, now = p.buttons.map(x => x.pressed);
    const edge = (i) => now[i] && !prev[i];
    if (edge(3)) this.edges.add('KeyC'); if (edge(9)) this.edges.add('Escape'); if (edge(8)) this.edges.add('KeyR'); if (edge(2) || edge(4)) this.edges.add('PadHorn'); if (edge(0)) this.edges.add('PadA');
    this.padPrev = now;
    let sx = p.axes[0] || 0; if (Math.abs(sx) < 0.1) sx = 0;
    const st = { steer: Math.sign(sx) * Math.pow(Math.abs(sx), 1.4), throttle: b(7), brake: b(6), hand: b(0) || b(1) * 0, nitro: Math.max(b(5), b(1)), horn: !!(p.buttons[2] && p.buttons[2].pressed) || !!(p.buttons[4] && p.buttons[4].pressed) };
    if (st.throttle > 0.05 || st.brake > 0.05 || Math.abs(st.steer) > 0.1 || st.hand) this.src = 'pad';
    return st;
  },
  update(dt) {
    const K = this.keys, pad = this.pollPad();
    const L = K.has('KeyA') || K.has('ArrowLeft'), R = K.has('KeyD') || K.has('ArrowRight');
    const kbSteer = (R ? 1 : 0) - (L ? 1 : 0);
    let thr = (K.has('KeyW') || K.has('ArrowUp')) ? 1 : 0, brk = (K.has('KeyS') || K.has('ArrowDown')) ? 1 : 0, hand = K.has('Space') ? 1 : 0, nitro = (K.has('ShiftLeft') || K.has('ShiftRight')) ? 1 : 0;
    let horn = K.has('KeyH');
    let target = kbSteer;
    if (this.src === 'kb') {
      const rate = kbSteer === 0 ? 7 : (Math.sign(kbSteer) !== Math.sign(this.steer) ? 9 : 4.2);
      this.steer = kbSteer === 0 ? damp(this.steer, 0, rate, dt) : clamp(this.steer + Math.sign(target - this.steer) * rate * dt, -1, 1);
      if (Math.abs(this.steer - target) < rate * dt) this.steer = target;
    }
    const t = this.touch;
    if (this.src === 'touch') {
      thr = Math.max(thr, t.gas); brk = Math.max(brk, t.brake); hand = Math.max(hand, t.hand); nitro = Math.max(nitro, t.nitro); horn = horn || t.horn;
      const s = this.gyro.on ? this.gyro.val * (SAVE.settings.sens || 1) : t.steer;
      this.steer = damp(this.steer, clamp(s, -1, 1), 16, dt);
    }
    if (pad && this.src === 'pad') { thr = Math.max(thr, pad.throttle); brk = Math.max(brk, pad.brake); hand = Math.max(hand, pad.hand); nitro = Math.max(nitro, pad.nitro); horn = horn || pad.horn; this.steer = damp(this.steer, pad.steer, 18, dt); }
    this.throttle = thr; this.brake = brk; this.hand = hand; this.nitro = nitro; this.horn = horn;
  },
  edge(code) { return this.edges.has(code); },
  endFrame() { this.edges.clear(); },
  apply(v) { const i = v.input; i.steer = this.steer; i.throttle = this.throttle; i.brake = this.brake; i.hand = this.hand; i.nitro = this.nitro; v.assist = SAVE.settings.assist && this.src !== 'pad'; }
};
