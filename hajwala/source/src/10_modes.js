// =====================================================================
//  GAME MODES
// =====================================================================
const GAME = { scene: null, camera: null, renderer: null, player: null, vehicles: [], mode: null, state: 'boot', t: 0, paused: false, money: 0, quality: 'high', freeze: false };
function addMoney(n, why) { if (!n) return; SAVE.money = Math.max(0, Math.round(SAVE.money + n)); persist(); UI.money(n, why); }
function teleport(v, x, z, hd, y) { v.reset(V3(x, y ?? groundAt(x, z, 60).h, z), hd); if (v === GAME.player) CAM.snap = true; }
const PHRASES = [[2500, 'حلو!', '#ffd23f'], [8000, 'فنّان!', '#3fe0ff'], [18000, 'يا ساتر!', '#ff7b1c'], [35000, 'شيخ المفحطين!', '#ff3ea5'], [70000, 'أسطورة الساحة!', '#7dff6a']];

// ---------------------------------------------------------------- drift scoring engine (shared)
class DriftScore {
  constructor() { this.reset(); }
  reset() { this.total = 0; this.chain = 0; this.mult = 1; this.chainT = 0; this.gap = 0; this.active = false; this.phrase = 0; this.best = 0; this.angle = 0; }
  update(v, dt, allowed = true) {
    const ang = Math.abs(v.slipAngle) * 180 / Math.PI;
    this.angle = ang;
    const drifting = allowed && v.grounded && ang > 12 && ang < 120 && v.speed > 6;
    if (drifting) {
      this.active = true; this.gap = 0; this.chainT += dt;
      this.chain += (ang - 8) * v.speed * 0.13 * dt * 10;
      this.mult = Math.min(8, 1 + Math.floor(this.chainT / 2.2));
      for (let k = this.phrase; k < PHRASES.length; k++) if (this.chain * this.mult >= PHRASES[k][0]) { this.phrase = k + 1; UI.big(PHRASES[k][1], PHRASES[k][2]); AUDIO.cheer(0.12 + k * 0.05); }
    } else if (this.active) {
      this.gap += dt;
      if (this.gap > 1.3) return this.bank();
    }
    return 0;
  }
  bank() { const pts = Math.round(this.chain * this.mult); this.total += pts; this.best = Math.max(this.best, pts); this.chain = 0; this.mult = 1; this.chainT = 0; this.active = false; this.phrase = 0; if (pts > 300) SAVE.stats.drifts++; return pts; }
  crash() { if (this.chain > 50) UI.big('خسرت الدريفت!', '#ff4040', 0.9); this.chain = 0; this.mult = 1; this.chainT = 0; this.active = false; this.phrase = 0; }
  get excite() { return clamp(this.chain * this.mult / 22000, 0, 1) * 0.75 + (this.mult - 1) / 7 * 0.25; }
}

// ---------------------------------------------------------------- markers (mode starts, destinations, checkpoints)
const MARK = { list: [], group: new THREE.Group() };
function makeRingMesh(r, c, h = 0.25) {
  const g = new THREE.RingGeometry(r * 0.82, r, 40); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 14, 24, 1, true), new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(c) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying float vY; varying float vD; void main(){ vY = position.y/14.0+0.5; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying float vY; varying float vD; void main(){ gl_FragColor=vec4(c*pow(1.0-vY,2.0)*0.4*smoothstep(4.0,22.0,vD),1.); }'
  }));
  pillar.position.y = 7;
  const grp = new THREE.Group(); grp.add(m, pillar); return grp;
}
function textSprite(text, color = '#fff', size = 1) {
  const t = canvasTex(512, 128, (g, w, h) => { g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `64px ${FONT_AR}`; g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2 + 4, 490); g.shadowBlur = 0; g.globalAlpha = 0.5; g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4, 490); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(8 * size, 2 * size, 1); s.renderOrder = 9; return s;
}
function addMarker(x, z, r, color, label, data) {
  const y = groundAt(x, z, 80).h + 0.08;
  const g = makeRingMesh(r, color); g.position.set(x, y, z);
  let sp = null; if (label) { sp = textSprite(label, color); sp.position.set(x, y + 6.5, z); MARK.group.add(sp); }
  MARK.group.add(g);
  const m = { x, z, y, r, g, sp, data, color }; MARK.list.push(m); return m;
}
function removeMarker(m) { if (!m) return; MARK.group.remove(m.g); if (m.sp) MARK.group.remove(m.sp); MARK.list = MARK.list.filter(q => q !== m); }
function clearMarkers(tag) { for (const m of [...MARK.list]) if (!tag || (m.data && m.data.tag === tag)) removeMarker(m); }
function updateMarkers(t) { for (const m of MARK.list) { const k = 1 + Math.sin(t * 3 + m.x) * 0.06; m.g.scale.set(k, 1, k); m.g.children[0].material.opacity = 0.6 + Math.sin(t * 4) * 0.25; } }

// ---------------------------------------------------------------- karak cups
const CUPS = { mesh: null, list: [] };
function buildCups(scene) {
  const g = new Geo();
  g.cyl(0, 0, 0, 0.18, 0.24, 0.5, 14, col('#f4efe4'), { capCol: col('#8a5a2a') });
  g.cyl(0, 0.18, 0, 0.215, 0.228, 0.16, 14, col('#c4261d'), { cap: false });
  g.cyl(0, 0.5, 0, 0.25, 0.25, 0.05, 14, col('#ffffff'));
  g.cyl(0, 0.55, 0, 0.12, 0.08, 0.06, 10, col('#ffffff'));
  const geo = g.build(false); geo.setAttribute('bake', new THREE.BufferAttribute(new Float32Array(g.count * 3), 3));
  const m = new THREE.InstancedMesh(geo, worldMat({ roughness: 0.5, emissive: col('#ffb060'), emissiveIntensity: 0.6 }), W.cupSpots.length);
  m.frustumCulled = false; scene.add(m); CUPS.mesh = m;
  CUPS.list = W.cupSpots.map((c, i) => ({ ...c, i, got: SAVE.cups.includes(i) }));
  updateCups(0, null);
}
function updateCups(t, player) {
  const q = new THREE.Quaternion(), s = V3();
  for (const c of CUPS.list) {
    const sc = c.got ? 0 : 1.7;
    q.setFromAxisAngle(_v1.set(0, 1, 0), t * 2 + c.i);
    _m4.compose(_v2.set(c.x, c.y + Math.sin(t * 2 + c.i) * 0.2, c.z), q, s.set(sc, sc, sc)); CUPS.mesh.setMatrixAt(c.i, _m4);
    if (!c.got) GLOW_D.add(c.x, c.y + 0.5, c.z, 1.3 + Math.sin(t * 5 + c.i) * 0.25, 1, 0.55, 0.18, 0.55, 0);
    if (!c.got && player && GAME.mode && GAME.mode.cups) {
      const d2 = (player.pos.x - c.x) ** 2 + (player.pos.z - c.z) ** 2, dy = Math.abs(player.pos.y - c.y);
      if (d2 < 4.2 * 4.2 && dy < 3.5) {
        c.got = true; SAVE.cups.push(c.i); persist();
        const n = SAVE.cups.length;
        AUDIO.chime('cup'); UI.big(`كوب كرك! ${toAr(n)}/${toAr(CUPS.list.length)}`, '#ffb060');
        addMoney(250, 'كوب كرك');
        if (n === CUPS.list.length) { setTimeout(() => { UI.big('جمعت كل أكواب الكرك! 🏆', '#7dff6a', 2.2); addMoney(10000, 'كل الأكواب'); }, 1600); }
      }
    }
  }
  CUPS.mesh.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- race tracks
const TRACKS = [
  { id: 't1', name: 'لفة الحي', desc: 'شوارع الحي، لفتين', laps: 2, closed: true, pts: [[-100, -65], [-195, -65], [-210, -80], [-210, -220], [-195, -235], [-5, -235], [10, -220], [10, -80], [-5, -65]], reward: 2400 },
  { id: 't2', name: 'الطريق السريع', desc: 'سرعة قصوى للبر', laps: 1, closed: false, pts: [[40, -150], [120, -150], [170, -150], [190, -140], [195, -110], [195, 0], [195, 140], [195, 200], [195, 288]], reward: 2600 },
  { id: 't3', name: 'رالي البر', desc: 'طعوس ورمل، لفتين', laps: 2, closed: true, pts: [[-100, 118], [-60, 170], [0, 160], [70, 175], [95, 230], [60, 285], [-30, 292], [-110, 250], [-140, 205], [-128, 150]], reward: 3200 },
  { id: 't4', name: 'الهجولة الكبرى', desc: 'حي وبر وطريق سريع', laps: 1, closed: false, pts: [[-180, 20], [-112, 20], [-100, 35], [-100, 112], [-60, 150], [40, 140], [120, 120], [180, 105], [204, 80], [205, 0], [205, -130], [190, -150], [120, -150], [60, -150]], reward: 3800 },
];
function trackPath(tr) {
  const cr = new THREE.CatmullRomCurve3(tr.pts.map(p => V3(p[0], 0, p[1])), tr.closed, 'centripetal', 0.5);
  const n = Math.ceil(cr.getLength() / 2.5);
  const pts = cr.getSpacedPoints(n).map(p => [p.x, p.z]);
  if (tr.closed) pts.pop();
  return new Path(pts, tr.closed);
}

// ---------------------------------------------------------------- MODES
const MODES = {};
// --- free roam
MODES.free = {
  id: 'free', name: 'الهجولة الحرة', cups: true,
  start(opt = {}) {
    this.drift = new DriftScore(); this.jumpFrom = null; this.gasT = 0; this.prompt = null;
    if (opt.fromMenu) { const L = SAVE.lastPos; if (L && isFinite(L.x)) { teleport(GAME.player, L.x, L.z, L.h); UI.toast('كمّلنا من آخر محطة ⛽'); } else { const g = WORLD.garageZone; teleport(GAME.player, g.x, g.z - 4, 0); } }
    if (!SAVE.tutorialDone) setTimeout(() => UI.maybeTutorial(), 600);
    clearMarkers();
    const P = W.PLAZA;
    addMarker((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2 + 22, 5, '#ff7b1c', 'تحدي التفحيط', { tag: 'start', mode: 'drift' });
    TRACKS.forEach((tr, i) => { const p = tr.pts[0]; addMarker(p[0], p[1], 4.5, '#3fe0ff', 'سباق: ' + tr.name, { tag: 'start', mode: 'race', track: i }); });
    const sh = W.shops.find(s => s.k === 1) || W.shops[0];
    if (sh) addMarker(sh.x, sh.z, 4.5, '#ff4fc8', 'الدورية: توصيل', { tag: 'start', mode: 'patrol' });
    addMarker(-205, 196, 5, '#ffd23f', 'التطعيس', { tag: 'start', mode: 'dune' });
    UI.modeHUD('');
  },
  update(dt) {
    const v = GAME.player;
    const pts = this.drift.update(v, dt, true);
    if (pts > 400) { const m = Math.round(pts / 120); addMoney(m, 'دريفت'); UI.toast(`دريفت ${fmtEn(pts)} نقطة`); }
    // secret jumps
    if (v.grounded) { const r = rampUnder(v); if (r) this.jumpFrom = { r, t: GAME.t }; else if (this.jumpFrom && GAME.t - this.jumpFrom.t > 0.5) this.jumpFrom = null; }
    if (!v.grounded && this.jumpFrom && v.airT > 0.7) {
      const id = this.jumpFrom.r.jump;
      if (id && !SAVE.jumps.includes(id)) { SAVE.jumps.push(id); persist(); AUDIO.chime('secret'); UI.big(`قفزة سرية! ${toAr(SAVE.jumps.length)}/${toAr(W.jumpSpots.length)}`, '#7affd8', 1.6); addMoney(500, 'قفزة سرية'); }
      this.jumpFrom = null;
    }
    // zones
    this.prompt = null;
    const near = (z) => z && Math.hypot(v.pos.x - z.x, v.pos.z - z.z) < z.r;
    if (near(WORLD.gasZone) && v.speed < 3) {
      this.gasT += dt;
      if (this.gasT > 0.6 && this.gasT - dt <= 0.6) { v.nitro = 1; const fixed = v.scratches > 0; v.scratches = 0; applyWear(v); SAVE.lastPos = { x: v.pos.x, z: v.pos.z, h: v.heading() }; persist(true); AUDIO.chime('money'); UI.toast(fixed ? '⛽ تعبّى النيترو وتلمّعت السيارة وانحفظ شغلك' : '⛽ تعبّى النيترو وانحفظ شغلك'); }
    } else this.gasT = 0;
    if (near(WORLD.garageZone) && v.speed < 6) this.prompt = { text: 'ادخل الكراج 🔧', act: () => openGarage() };
    if (near(WORLD.campZone) && v.speed < 3) this.prompt = { text: 'سولف 💬', act: () => UI.openEmotes() };
    for (const m of MARK.list) if (m.data && m.data.tag === 'start' && Math.hypot(v.pos.x - m.x, v.pos.z - m.z) < m.r + 1 && v.speed < 10) {
      const d = m.data;
      this.prompt = { text: m.sp ? 'ابدأ: ' + (d.mode === 'race' ? TRACKS[d.track].name : d.mode === 'drift' ? 'تحدي التفحيط' : d.mode === 'patrol' ? 'الدورية' : 'التطعيس') : 'ابدأ', act: () => d.mode === 'dune' ? UI.openModes('dune') : startMode(d.mode, { track: d.track }) };
    }
    UI.prompt(this.prompt);
    UI.driftHUD(this.drift, false);
  },
  impact(s) { if (s > 4.5) this.drift.crash(); },
  end() { clearMarkers(); UI.prompt(null); },
};
function rampUnder(v) {
  const cell = cellAt(v.pos.x, v.pos.z); if (!cell) return null;
  for (const o of cell) if (o.t === 0 && o.jump && v.pos.x > o.x0 - 2 && v.pos.x < o.x1 + 2 && v.pos.z > o.z0 - 2 && v.pos.z < o.z1 + 2) return o;
  return null;
}

// --- drift challenge
MODES.drift = {
  id: 'drift', name: 'تحدي التفحيط', dur: 90,
  start() {
    const P = W.PLAZA; this.drift = new DriftScore(); this.t = this.dur; this.over = false;
    teleport(GAME.player, (P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2 + 8, Math.PI / 2);
    UI.countdown(() => { this.go = true; });
    this.go = false;
  },
  update(dt) {
    const v = GAME.player, P = W.PLAZA;
    if (!this.go || this.over) { if (!this.go) { v.input.throttle *= 0; } UI.driftHUD(this.drift, true); return; }
    this.t -= dt;
    const inside = v.pos.x > P.x0 && v.pos.x < P.x1 && v.pos.z > P.z0 && v.pos.z < P.z1;
    this.drift.update(v, dt, inside);
    CROWD.uEx.value = damp(CROWD.uEx.value, this.drift.excite, 3, dt);
    NET.setDrift(this.drift.total + Math.round(this.drift.chain * this.drift.mult));
    UI.modeHUD(`<div class="mh-t">⏱ ${toAr(Math.ceil(this.t))}</div><div class="mh-s">${fmtEn(this.drift.total)}</div><div class="mh-l">أفضل: ${fmtEn(SAVE.best.drift)}</div>` + NET.driftBoardHTML());
    UI.driftHUD(this.drift, true);
    if (this.t <= 0) {
      this.over = true; this.drift.bank();
      const sc = this.drift.total, best = sc > SAVE.best.drift; if (best) SAVE.best.drift = sc;
      const money = Math.round(sc / 45); addMoney(money, 'تحدي التفحيط'); persist(true);
      NET.setDrift(sc);
      UI.results({ title: 'انتهى التحدي', big: fmtEn(sc) + ' نقطة', lines: [best ? '🔥 رقم قياسي جديد!' : `أفضل رقم: ${fmtEn(SAVE.best.drift)}`, `أطول سلسلة: ${fmtEn(this.drift.best)}`, `الفلوس: +${fmtEn(money)}`], retry: () => startMode('drift') });
    }
  },
  impact(s) { if (s > 4) this.drift.crash(); },
  end() { CROWD.uEx.value = 0; UI.modeHUD(''); },
};

// --- race
MODES.race = {
  id: 'race', name: 'السباقات',
  start(opt = {}) {
    this.tr = TRACKS[opt.track || 0]; this.path = trackPath(this.tr); this.opt = opt;
    this.group = opt.group || null;
    this.go = false; this.t = 0; this.over = false; this.lapT = 0; this.lapStart = 0; this.bestLap = Infinity; this.record = []; this.recT = 0;
    this.cpIdx = 0; this.lap = 0; this.finishT = null; this.runId = (this.runId || 0) + 1;
    // checkpoints every ~50m
    this.cps = []; for (let s = 50; s < this.path.len - 10; s += 50) this.cps.push(s);
    this.cps.push(this.tr.closed ? this.path.len - 2 : this.path.len - 1);
    // grid
    const st = this.path.at(0), hd = Math.atan2(-st.dx, -st.dz);
    const gridPos = (k) => { const back = 8 + Math.floor(k / 2) * 9, side = (k % 2 ? 1 : -1) * 3; return [st.x - st.dx * back - st.dz * side, st.z - st.dz * back + st.dx * side]; };
    let pk = 0;
    if (this.group) pk = this.group.slot;
    const gp = gridPos(pk);
    teleport(GAME.player, gp[0], gp[1], hd);
    this.ai = [];
    if (!this.group) {
      const pool = CAR_ORDER.filter(c => c !== GAME.player.id).concat([GAME.player.id]);
      for (let k = 1; k <= 3; k++) {
        const cid = pool[(k - 1) % pool.length];
        const look = Object.assign(defaultLook(cid), { paint: pick(PAINTS), stripe: ri(0, 4), stripeCol: pick(['#111', '#fff', '#ff7b1c']) });
        const ups = { engine: ri(0, 3), turbo: ri(0, 2), grip: ri(1, 3) };
        const v = new Vehicle(cid, { look, ups, beams: false });
        // balance AI to player's car performance
        const pp = GAME.player.ph; v.ph.power = Math.max(v.ph.power * 0.8, pp.power * rr(0.92, 1.06)); v.ph.fmax = Math.max(v.ph.fmax, pp.fmax * 0.95); v.ph.vmax = pp.vmax * rr(0.95, 1.04); const vm = v.ph.vmax / 3.6; v.ph.cd = Math.max(0.05, (v.ph.power / vm - 0.012 * v.ph.mass * 9.81) / (vm * vm));
        v.ai = new AIDriver(v, 'race', { skill: rr(0.84, 0.97), lane: (k - 2) * 1.6 });
        const g2 = gridPos(k); teleport(v, g2[0], g2[1], hd);
        v.name = pick(['بو فهد', 'سعود', 'ناصر', 'بو خالد', 'مشعل', 'فيصل', 'راشد', 'بندر', 'تركي', 'حمد']);
        addVehicle(v); this.ai.push(v);
      }
    }
    // ghost
    this.ghost = null;
    const gf = SAVE.ghosts[this.tr.id];
    if (gf && gf.car && !this.group) { this.ghost = new Ghost(GAME.scene, gf.car); this.ghost.play(gf.f); }
    // gates
    this.gates = [];
    this.updateGates();
    UI.countdown(() => { this.go = true; this.t = 0; this.lapStart = 0; }, this.group ? this.group.startAt : null);
  },
  updateGates() {
    for (const g of this.gates) removeMarker(g); this.gates = [];
    for (let k = 0; k < 2 && this.cpIdx + k < this.cps.length; k++) {
      const s = this.cps[this.cpIdx + k], p = this.path.at(s);
      const last = this.cpIdx + k === this.cps.length - 1 && (!this.tr.closed || this.lap === this.tr.laps - 1);
      this.gates.push(addMarker(p.x, p.z, 7, k === 0 ? (last ? '#7dff6a' : '#3fe0ff') : '#1a6a88', k === 0 && last ? 'النهاية' : '', { tag: 'gate' }));
    }
  },
  progressOf(v) {
    if (v === GAME.player) return this.lap * this.path.len + (this.cpIdx > 0 ? this.cps[this.cpIdx - 1] : 0) + Math.min(50, this.distToNext());
    return v.ai ? v.ai.prog : 0;
  },
  distToNext() { const p = this.path.at(this.cps[this.cpIdx]); return 50 - Math.hypot(GAME.player.pos.x - p.x, GAME.player.pos.z - p.z); },
  update(dt) {
    const v = GAME.player;
    if (!this.go) { for (const a of this.ai) { a.input.throttle = 0; a.input.brake = 1; } v.input.brake = Math.max(v.input.brake, 0.6); v.input.throttle *= this.group ? 0 : 0; return; }
    if (!this.over) this.t += dt;
    for (const a of this.ai) if (!a.finished) a.ai.updateRace(dt, this.path); else { a.input.throttle = 0; a.input.brake = 0.5; }
    // ghost
    if (this.ghost) this.ghost.update(this.t - this.lapStart);
    // record
    this.recT += dt; if (this.recT >= 0.1 && !this.over) { this.recT -= 0.1; this.record.push([+v.pos.x.toFixed(2), +v.pos.y.toFixed(2), +v.pos.z.toFixed(2), +v.heading().toFixed(3)]); }
    // checkpoint
    if (!this.over) {
      const p = this.path.at(this.cps[this.cpIdx]);
      const nn = this.path.nearest(v.pos.x, v.pos.z, this.pHint ?? -1, 40); this.pHint = nn.i;
      const cs = this.cps[this.cpIdx], passed = nn.d < 26 && nn.s >= cs && nn.s < cs + 45 && !(this.tr.closed && this.cpIdx === 0 && nn.s > this.path.len - 60);
      if (Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 13 || passed) {
        this.cpIdx++; AUDIO.chime('cp');
        if (this.cpIdx >= this.cps.length) {
          const lt = this.t - this.lapStart;
          if (lt < this.bestLap) this.bestLap = lt;
          this.saveGhost(lt);
          this.lap++; this.cpIdx = 0; this.lapStart = this.t; this.record = [];
          if (this.lap >= this.tr.laps) return this.finish();
          UI.big(`اللفة ${toAr(this.lap + 1)}/${toAr(this.tr.laps)}`, '#3fe0ff');
          if (this.ghost) this.ghost.play(SAVE.ghosts[this.tr.id] && SAVE.ghosts[this.tr.id].f);
        }
        this.updateGates();
      }
    }
    // AI finish detection
    for (const a of this.ai) if (!a.finished && a.ai.prog >= this.tr.laps * this.path.len - (this.tr.closed ? 3 : 2)) { a.finished = this.t; }
    // positions
    const me = this.progressOf(v);
    let pos = 1; for (const a of this.ai) if ((a.finished && !this.over) || (!a.finished && this.progressOf(a) > me)) pos++;
    if (this.group) pos = NET.raceRank(me, this.over ? this.finishT : null);
    this.pos = pos;
    const nAll = this.group ? NET.raceCount() : this.ai.length + 1;
    UI.modeHUD(`<div class="mh-l">${escapeHTML(this.tr.name)}</div><div class="mh-s">${toAr(pos)}<small>/${toAr(nAll)}</small></div><div class="mh-t">${fmtTime(this.t)}</div><div class="mh-l">اللفة ${toAr(Math.min(this.lap + 1, this.tr.laps))}/${toAr(this.tr.laps)}${isFinite(this.bestLap) ? ' · أفضل ' + fmtTime(this.bestLap) : ''}</div>`);
    if (this.group) NET.setRace({ id: this.group.id, prog: Math.round(me), fin: this.finishT });
  },
  saveGhost(lt) {
    const g = SAVE.ghosts[this.tr.id];
    if (!g || lt < g.t) { SAVE.ghosts[this.tr.id] = { t: lt, car: GAME.player.id, f: this.record.slice(0, 1500) }; persist(); }
  },
  finish() {
    this.over = true; this.finishT = this.t;
    const place = this.pos || 1, rw = this.tr.reward, money = Math.round(place === 1 ? rw : place === 2 ? rw * 0.5 : place === 3 ? rw * 0.28 : rw * 0.1);
    const prev = SAVE.best.races[this.tr.id];
    if (!prev || this.t < prev) SAVE.best.races[this.tr.id] = this.t;
    addMoney(money, 'سباق'); persist(true);
    if (place === 1) AUDIO.cheer(0.3);
    for (const g of this.gates) removeMarker(g); this.gates = [];
    if (this.group) NET.setRace({ id: this.group.id, prog: 1e9, fin: this.t });
    const rid = this.runId;
    setTimeout(() => GAME.mode === this && this.runId === rid && UI.results({ title: place === 1 ? 'الأول! 🏆' : `المركز ${toAr(place)}`, big: fmtTime(this.t), lines: [`أفضل لفة: ${fmtTime(this.bestLap)}`, `رقمك القياسي: ${fmtTime(SAVE.best.races[this.tr.id])}`, `الفلوس: +${fmtEn(money)}`].concat(this.group ? NET.raceResultsLines() : []), retry: this.group ? null : () => startMode('race', { track: TRACKS.indexOf(this.tr) }) }), 900);
  },
  impact() { },
  end() { for (const a of this.ai) removeVehicle(a); this.ai = []; if (this.ghost) this.ghost.dispose(GAME.scene); this.ghost = null; for (const g of this.gates || []) removeMarker(g); UI.modeHUD(''); if (this.group) { NET.setRace(null); NET.lobby = null; NET.joined = null; } }
};

// --- patrol chase (delivery)
MODES.patrol = {
  id: 'patrol', name: 'الدورية',
  start() {
    const sh = W.shops.find(s => s.k === 1) || W.shops[0];
    teleport(GAME.player, sh.x + sh.nx * 2, sh.z + sh.nz * 2, Math.atan2(-sh.nx, -sh.nz));
    // destination far away
    const cands = [...WORLD.villas.map(v => ({ x: v.gate.x, z: v.gate.z })), ...W.shops.map(s => ({ x: s.x, z: s.z }))].filter(p => Math.hypot(p.x - sh.x, p.z - sh.z) > 220);
    this.dest = pick(cands.length ? cands : [{ x: 60, z: -300 }]);
    const d = Math.hypot(this.dest.x - sh.x, this.dest.z - sh.z);
    this.tLeft = Math.round(d / 8 + 45); this.stars = 1; this.starT = 0; this.escT = 0; this.bustT = 0; this.over = false; this.police = [];
    this.mk = addMarker(this.dest.x, this.dest.z, 6, '#7dff6a', 'التوصيل هنا 📦', { tag: 'dest' });
    UI.big('وصّل الطلبية! 🌯', '#ff9a3c', 1.4);
    UI.toast('انتبه من الدورية… اقطع خط الرؤية عشان تفلت');
    this.go = true; this.spawnT = 3;
  },
  spawnPolice() {
    const v = GAME.player, f = v.forward(V3());
    // node behind the player, 90-160m away, not visible
    let best = null, bd = -1;
    for (const n of GRAPH.nodes) { const dx = n.x - v.pos.x, dz = n.z - v.pos.z, d = Math.hypot(dx, dz); if (d < 70 || d > 200) continue; const behind = -(dx * f.x + dz * f.z) / d; const sc = behind + (losClear(v.pos.x, v.pos.z, n.x, n.z) ? -0.8 : 0.5) + Math.random() * 0.3; if (sc > bd) { bd = sc; best = n; } }
    if (!best) best = GRAPH.nodes[0];
    const look = { paint: '#f4f6f8', finish: 'gloss', stripe: 2, stripeCol: '#1446a0', tint: 3, plate: { l: [5, 5, 5], d: '9' + ri(100, 999) } };
    const p = new Vehicle('shabah', { look, ups: { engine: 2, grip: 2 }, beams: false });
    const pp = GAME.player.ph; p.ph.power = pp.power * (0.95 + this.stars * 0.07); p.ph.fmax = Math.max(p.ph.fmax, pp.fmax); const vm = Math.max(pp.vmax, 160) / 3.6 * (1 + this.stars * 0.02); p.ph.vmax = vm * 3.6; p.ph.cd = Math.max(0.05, (p.ph.power / vm - 0.012 * p.ph.mass * 9.81) / (vm * vm));
    p.ai = new AIDriver(p, 'chase'); p.isPolice = true; p.name = 'دورية';
    addPoliceBar(p);
    teleport(p, best.x, best.z, Math.atan2(-(v.pos.x - best.x), -(v.pos.z - best.z)));
    addVehicle(p); this.police.push(p);
  },
  update(dt) {
    if (this.over) return;
    const v = GAME.player;
    this.tLeft -= dt; this.starT += dt;
    if (this.starT > 24 && this.stars < 5 && this.stars > 0) { this.stars++; this.starT = 0; UI.toast('⭐ زادت النجوم!'); }
    const want = this.stars > 0 ? Math.min(4, this.stars) : 0;
    this.spawnT -= dt;
    if (this.police.length < want && this.spawnT <= 0) { this.spawnPolice(); this.spawnT = 6; }
    let anySee = false, minD = 1e9;
    for (const p of [...this.police]) {
      const d = Math.hypot(p.pos.x - v.pos.x, p.pos.z - v.pos.z); minD = Math.min(minD, d);
      if (this.stars > 0) p.ai.updateChase(dt, v); else { p.input.throttle = 0.3; p.input.steer = 0.4; p.input.brake = 0; }
      if (d < 90 && losClear(p.pos.x, p.pos.z, v.pos.x, v.pos.z, v.pos.y + 0.6)) anySee = true;
      if (d > 260 || (p.ai.stuckCount || 0) > 4 || (this.stars === 0 && d > 120)) { removeVehicle(p); this.police = this.police.filter(q => q !== p); }
    }
    AUDIO.siren(this.police.length ? clamp(1 - minD / 140, 0, 1) : 0);
    // escape
    if (this.stars > 0 && !anySee && this.police.length) { this.escT += dt; if (this.escT > 7) { this.stars = Math.max(0, this.stars - 1); this.escT = 0; this.starT = 0; UI.big(this.stars ? 'نقصت نجمة! 😎' : 'فلتّ منهم! 😎', '#7dff6a'); if (!this.stars) AUDIO.chime('secret'); } }
    else this.escT = Math.max(0, this.escT - dt * 2);
    // busted
    if (this.stars > 0 && minD < 7.5 && v.speed < 2.5) { this.bustT += dt; if (this.bustT > 2.2) return this.fail('انمسكت! 🚓', 'الدورية وقفتك… المرة الجاية اهرب أسرع 😅'); } else this.bustT = Math.max(0, this.bustT - dt);
    if (this.tLeft <= 0) return this.fail('خلص الوقت ⌛', 'الطلبية بردت… 🌯');
    const dd = Math.hypot(v.pos.x - this.dest.x, v.pos.z - this.dest.z);
    if (dd < 7 && v.speed < 9) return this.win();
    const stars = '★'.repeat(this.stars) + '☆'.repeat(5 - this.stars);
    UI.modeHUD(`<div class="mh-l">توصيل 📦 ${toAr(Math.round(dd))} م</div><div class="mh-t">⏱ ${toAr(Math.ceil(this.tLeft))}</div><div class="mh-stars">${stars}</div>${this.escT > 0.5 ? `<div class="mh-bar"><i style="width:${clamp(this.escT / 7 * 100, 0, 100)}%"></i></div><div class="mh-l">قاعد تفلت…</div>` : ''}${this.bustT > 0.3 ? '<div class="mh-l warn">تحرّك! بيمسكونك</div>' : ''}`);
  },
  win() {
    this.over = true; const money = 1200 + this.stars * 700 + Math.round(this.tLeft) * 12;
    addMoney(money, 'توصيل'); if (money > (SAVE.best.patrol || 0)) SAVE.best.patrol = money; persist(true); AUDIO.chime('money');
    UI.results({ title: 'وصلت الطلبية! 🌯', big: '+' + fmtEn(money), lines: [`النجوم وقت التوصيل: ${'★'.repeat(this.stars) || '—'}`, `الوقت الباقي: ${toAr(Math.round(this.tLeft))} ث`], retry: () => startMode('patrol') });
  },
  fail(t, sub) { this.over = true; AUDIO.chime('bad'); UI.results({ title: t, big: '', lines: [sub], retry: () => startMode('patrol') }); },
  impact(s, p, n, obj) { if (obj && obj.kind === 'car' && obj.car.isPolice && s > 6 && this.stars < 5) { this.stars++; this.starT = 0; UI.toast('⭐ صدمت الدورية!'); } },
  end() { for (const p of this.police) removeVehicle(p); this.police = []; removeMarker(this.mk); AUDIO.siren(0); UI.modeHUD(''); }
};
function addPoliceBar(v) {
  const g = new THREE.Group(), s = v.spec, y = Math.max(...s.cabin.map(p => p[1])) + 0.03;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.1), toneMapped: false }));
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.3, 3), toneMapped: false }));
  bar.position.set(0, y + 0.06, -0.15); red.position.set(0.28, y + 0.14, -0.15); blue.position.set(-0.28, y + 0.14, -0.15);
  g.add(bar, red, blue); v.model.body.add(g); v.lightbar = { red, blue, y: y + 0.2 };
}

// --- dune challenges
MODES.dune = {
  id: 'dune', name: 'التطعيس',
  start(opt = {}) {
    this.sub = opt.sub || 'climb'; this.over = false; this.t = 0; this.best = 0; this.last = 0;
    const B = W.BIGDUNE;
    if (this.sub === 'climb') {
      teleport(GAME.player, B.x, B.z - 68, Math.PI); this.started = false;
      this.finish = addMarker(B.x, B.z, 7, '#7dff6a', 'القمة 🚩', { tag: 'dune' });
      this.startMk = addMarker(B.x, B.z - 60, 6, '#ffd23f', '', { tag: 'dune' });
      UI.big('اطلع الطعس الكبير!', '#ffd23f');
    } else {
      teleport(GAME.player, 40, 175, Math.PI); this.t = 90; this.jf = null; this.maxY = 0;
      UI.big(this.sub === 'jump' ? 'أطول قفزة! 90 ثانية' : 'أعلى نقطة! 90 ثانية', '#ffd23f');
    }
  },
  update(dt) {
    if (this.over) return;
    const v = GAME.player, B = W.BIGDUNE;
    if (this.sub === 'climb') {
      if (!this.started) { if (Math.hypot(v.pos.x - B.x, v.pos.z - (B.z - 60)) > 6.5) { this.started = true; this.t = 0; AUDIO.chime('go'); } }
      else this.t += dt;
      const d = Math.hypot(v.pos.x - B.x, v.pos.z - B.z);
      const pb = SAVE.best.dune.climb;
      UI.modeHUD(`<div class="mh-l">الطعس الكبير</div><div class="mh-t">${fmtTime(this.t)}</div><div class="mh-l">الارتفاع ${toAr(Math.max(0, Math.round(v.pos.y - 1)))} م / ${toAr(B.h)}</div>${pb ? `<div class="mh-l">أفضل: ${fmtTime(pb)}</div>` : ''}`);
      if (this.started && d < 9 && v.pos.y > B.h - 3) {
        this.over = true; const best = !pb || this.t < pb; if (best) SAVE.best.dune.climb = this.t;
        const money = Math.round(1500 + Math.max(0, 40 - this.t) * 40); addMoney(money, 'التطعيس'); persist(true); AUDIO.cheer(0.25);
        UI.results({ title: 'طلعت الطعس! 🚩', big: fmtTime(this.t), lines: [best ? '🔥 رقم قياسي!' : `أفضل: ${fmtTime(pb)}`, `+${fmtEn(money)}`, GAME.player.id === 'abu' ? 'أبو غمّازة طلعه؟! أسطورة 😂' : ''], retry: () => startMode('dune', { sub: 'climb' }) });
      }
      return;
    }
    this.t -= dt;
    if (this.sub === 'jump') {
      if (v.grounded) { if (this.jf && this.jf.air > 0.5) { const dist = Math.hypot(v.pos.x - this.jf.x, v.pos.z - this.jf.z); this.last = dist; if (dist > this.best) { this.best = dist; UI.big(`${toAr(Math.round(dist))} متر!`, '#3fe0ff'); } } this.jf = { x: v.pos.x, z: v.pos.z, air: 0 }; }
      else if (this.jf) this.jf.air += dt;
      UI.modeHUD(`<div class="mh-l">أطول قفزة</div><div class="mh-t">⏱ ${toAr(Math.ceil(this.t))}</div><div class="mh-s">${toAr(Math.round(this.best))}<small> م</small></div><div class="mh-l">الأخيرة ${toAr(Math.round(this.last))} م · قياسي ${toAr(Math.round(SAVE.best.dune.jump || 0))} م</div>`);
    } else {
      this.maxY = Math.max(this.maxY, v.pos.y - v.ph.cgH);
      UI.modeHUD(`<div class="mh-l">أعلى نقطة</div><div class="mh-t">⏱ ${toAr(Math.ceil(this.t))}</div><div class="mh-s">${toAr(Math.round(this.maxY))}<small> م</small></div><div class="mh-l">قياسي ${toAr(Math.round(SAVE.best.dune.high || 0))} م</div>`);
    }
    if (this.t <= 0) {
      this.over = true; const key = this.sub === 'jump' ? 'jump' : 'high', val = this.sub === 'jump' ? this.best : this.maxY;
      const best = val > (SAVE.best.dune[key] || 0); if (best) SAVE.best.dune[key] = val;
      const money = Math.round(val * (key === 'jump' ? 25 : 40)); addMoney(money, 'التطعيس'); persist(true);
      UI.results({ title: 'انتهى الوقت', big: toAr(Math.round(val)) + ' م', lines: [best ? '🔥 رقم قياسي!' : `القياسي: ${toAr(Math.round(SAVE.best.dune[key]))} م`, `+${fmtEn(money)}`], retry: () => startMode('dune', { sub: this.sub }) });
    }
  },
  impact() { },
  end() { clearMarkers('dune'); UI.modeHUD(''); }
};

// ---------------------------------------------------------------- mode control
function startMode(id, opt = {}) {
  if (GAME.mode && GAME.mode.end) GAME.mode.end();
  UI.cd = null; UI._rt = (UI._rt || 0) + 1; const cdb = $('#countdown'); if (cdb) cdb.innerHTML = '';
  UI.closeAll();
  GAME.mode = MODES[id];
  GAME.state = 'play';
  if (id !== 'free') clearMarkers('start');
  GAME.mode.start(opt);
  UI.showHUD(true);
  BUS.emit('mode', id);
}
function addVehicle(v) { GAME.vehicles.push(v); GAME.scene.add(v.model.root); v.model.blob.parent || GAME.scene.add(v.model.blob); v.impactCb = (s, p, n, o) => onImpact(v, s, p, n, o); if (AUDIO.ok && GAME.vehicles.length <= 4) v.eng = AUDIO.makeEngine(v, false); }
function removeVehicle(v) { GAME.vehicles = GAME.vehicles.filter(q => q !== v); GAME.scene.remove(v.model.root); GAME.scene.remove(v.model.blob); if (v.eng) AUDIO.killEngine(v.eng); v.model.dispose(); }
function applyWear(v) {
  const m = v.model, k = clamp(v.scratches / 14, 0, 1), L = m.look || {};
  const baseR = L.finish === 'matte' ? 0.78 : L.finish === 'chrome' ? 0.08 : 0.26;
  m.paintMat.roughness = baseR + k * 0.4; m.paintMat.color.set(L.paint || '#ccc').multiplyScalar(1 - k * 0.28);
}
function onImpact(v, s, p, n, o) {
  if (v === GAME.player) {
    if (s > 4) applyWear(v);
    CAM.shake = Math.min(1.2, CAM.shake + s * 0.05);
    AUDIO.thud(clamp(s / 14, 0.1, 1), o && (o.kind === 'pole' || o.kind === 'barrier') ? 'metal' : 'car');
    if (s > 5) sparksAt(p, Math.min(30, Math.round(s * 1.5)), s);
    if (GAME.mode && GAME.mode.impact) GAME.mode.impact(s, p, n, o);
    if (IS_TOUCH && navigator.vibrate && s > 6) try { navigator.vibrate(Math.min(80, s * 4)); } catch (e) { }
  } else if (s > 6 && GAME.player && v.pos.distanceTo(GAME.player.pos) < 40) { AUDIO.thud(clamp(s / 20, 0.05, 0.4), 'car'); sparksAt(p, 10, s); }
}
