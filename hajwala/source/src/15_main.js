// =====================================================================
//  MAIN: renderer, sky, lights, camera, loop, boot
// =====================================================================
const CAM = { mode: SAVE.settings.cam | 0, pos: V3(0, 20, 0), look: V3(), shake: 0, snap: true, fov: 62, cin: { t: 0, p: V3() }, intro: null };
const LIGHTS = {};
let composer = null, bloomPass = null, SKY = null, STARS = null;
const FOGC_NIGHT = col('#1c1626'), FOGC_DAWN = col('#a07a86');

function nextFrame() { return new Promise(r => (window.__HAJ_TEST ? setTimeout(r, 0) : requestAnimationFrame(() => r()))); }
function setLoad(p, t) { const b = $('#loading .bar i'); if (b) b.style.width = Math.round(p * 100) + '%'; if (t) $('#loading .lt').textContent = t; }

function buildSky(scene) {
  const g = new THREE.SphereGeometry(900, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uDawn: U.uDawn, uTime: U.uTime, uMoon: { value: V3(-0.45, 0.52, 0.72).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uDawn; uniform float uTime; uniform vec3 uMoon; varying vec3 vD;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 topN = vec3(0.006,0.01,0.035), horN = vec3(0.06,0.05,0.10);
        vec3 topD = vec3(0.16,0.25,0.48), horD = vec3(1.0,0.56,0.38);
        vec3 top = mix(topN, topD, uDawn), hor = mix(horN, horD, uDawn);
        vec3 c = mix(hor, top, smoothstep(-0.02, 0.55, h));
        // city glow (sodium) near horizon
        c += vec3(0.6,0.26,0.06) * exp(-max(h,0.0)*14.0) * (1.0-uDawn*0.6) * 0.38;
        // dawn sun glow east
        vec3 sunD = normalize(vec3(1.0, 0.05, 0.25));
        c += vec3(1.0,0.6,0.35) * pow(max(dot(d,sunD),0.0), 6.0) * uDawn * 0.9;
        // stars
        vec3 q = floor(d*380.0); float s = hash(q); float tw = 0.6+0.4*sin(uTime*2.0 + s*60.0);
        float star = step(0.9965, s) * smoothstep(0.0,0.25,h) * tw * (1.0-uDawn);
        c += vec3(0.9,0.92,1.0) * star * (s-0.9965)*300.0;
        // moon
        float md = dot(d, uMoon);
        c += vec3(1.0,0.97,0.88) * smoothstep(0.99955,0.99975,md) * 1.6 * (1.0-uDawn*0.7);
        c += vec3(0.5,0.55,0.75) * pow(max(md,0.0), 160.0) * 0.35;
        c += vec3(0.25,0.28,0.4) * pow(max(md,0.0), 12.0) * 0.12;
        if (h < 0.0) c = mix(c, hor*0.6, smoothstep(0.0,-0.1,h));
        gl_FragColor = vec4(c, 1.0); }`
  });
  SKY = new THREE.Mesh(g, m); SKY.renderOrder = -10; SKY.frustumCulled = false; scene.add(SKY);
}
function buildLights(scene) {
  const hemi = new THREE.HemisphereLight('#4a5a8a', '#3a2614', 0.75); scene.add(hemi); LIGHTS.hemi = hemi;
  const moon = new THREE.DirectionalLight('#a8b8ff', 0.55); moon.position.set(-45, 52, 72); scene.add(moon); scene.add(moon.target); LIGHTS.moon = moon;
  moon.shadow.mapSize.set(1024, 1024); const sc = moon.shadow.camera; sc.left = sc.bottom = -16; sc.right = sc.top = 16; sc.near = 1; sc.far = 160; moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.03;
  LIGHTS.heads = [];
  for (let k = 0; k < 2; k++) { const s = new THREE.SpotLight('#fff0d6', 90, 70, 0.42, 0.55, 1.6); scene.add(s); scene.add(s.target); LIGHTS.heads.push(s); }
  const fire = new THREE.PointLight('#ff7a30', 30, 34, 1.6); fire.position.set(WORLD.fire.x, WORLD.fire.y + 1.2, WORLD.fire.z); scene.add(fire); LIGHTS.fire = fire;
}
function applyQuality(q) {
  GAME.quality = q;
  const r = GAME.renderer, dpr = window.devicePixelRatio || 1;
  const pr = q === 'low' ? Math.min(dpr, 1) * (IS_TOUCH ? 0.7 : 0.85) : q === 'medium' ? Math.min(dpr, IS_TOUCH ? 1.15 : 1.25) : Math.min(dpr, 2);
  GAME.pr = pr * (GAME.prScale || 1);
  r.setPixelRatio(GAME.pr);
  r.shadowMap.enabled = q === 'high';
  LIGHTS.moon.castShadow = q === 'high';
  GAME.scene.fog.density = q === 'low' ? 0.0062 : q === 'medium' ? 0.0046 : 0.0036;
  GAME.camera.far = q === 'low' ? 420 : q === 'medium' ? 700 : 950; GAME.camera.updateProjectionMatrix();
  for (const m of [GLOW_S, GLOW_D]) m.mat.uniforms.uFogD.value = GAME.scene.fog.density;
  FX.smoke.mat.uniforms.uFogD.value = FX.spark.mat.uniforms.uFogD.value = GAME.scene.fog.density;
  setFXQuality(q); setTrafficDensity(q);
  CROWD.mesh.count = Math.round(CROWD.n * (q === 'low' ? 0.4 : q === 'medium' ? 0.7 : 1));
  // material recompiles needed after shadow toggle
  GAME.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
  resize();
}
function autoQuality() { return IS_TOUCH ? 'medium' : 'high'; }
function resize() {
  const w = innerWidth, h = innerHeight; GAME.renderer.setSize(w, h, false);
  GAME.camera.aspect = w / h; GAME.camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(GAME.pr); composer.setSize(w, h); }
  if (bloomPass) bloomPass.resolution.set(w * GAME.pr * 0.5, h * GAME.pr * 0.5);
  $('#speedo').width = $('#speedo').height = IS_TOUCH ? 160 : 220; $('#minimap').width = $('#minimap').height = IS_TOUCH ? 150 : 200;
}
function setPlayerCar(id) {
  const old = GAME.player; let p = V3(W.GARAGE.door.x, 0, W.GARAGE.door.z - 12), hd = Math.PI;
  if (old) { p = old.pos.clone(); p.y -= old.ph.cgH; hd = old.heading(); removeVehicle(old); }
  const cs = carSave(id);
  const v = new Vehicle(id, { player: true, look: cs.look, ups: cs.ups });
  v.model.root.traverse(o => { if (o.isMesh && o !== v.model.ug) o.castShadow = true; });
  GAME.player = v; GAME.vehicles.unshift(v); GAME.scene.add(v.model.root); GAME.scene.add(v.model.blob);
  v.impactCb = (s, pp, n, o) => onImpact(v, s, pp, n, o);
  v.reset(p, hd);
  if (AUDIO.ok) v.eng = AUDIO.makeEngine(v, true);
  CAM.snap = true;
}
function resetCarToRoad() {
  const v = GAME.player;
  // nearest road point
  let best = null, bd = 1e9;
  for (const s of WORLD.roads) {
    const a = s.ax === 'z' ? clamp(v.pos.z, s.a0, s.a1) : clamp(v.pos.x, s.a0, s.a1);
    const x = s.ax === 'z' ? s.c + s.hw * 0.4 : a, z = s.ax === 'z' ? a : s.c + s.hw * 0.4;
    const d = (x - v.pos.x) ** 2 + (z - v.pos.z) ** 2; if (d < bd) { bd = d; best = { x, z, hd: s.ax === 'z' ? (v.vel.z > 0 ? Math.PI : 0) : (v.vel.x > 0 ? -Math.PI / 2 : Math.PI / 2) }; }
  }
  if (bd > 60 * 60 || desertMask(v.pos.x, v.pos.z) > 0.3) teleport(v, v.pos.x, v.pos.z, v.heading(), terrainH(v.pos.x, v.pos.z) + 0.5);
  else teleport(v, best.x, best.z, best.hd);
}
function pauseGame(on) {
  if (on && GAME.state === 'play') { GAME.state = 'pause'; UI.openModal($('#pause')); AUDIO.silenceCar(); AUDIO.horn(0, false); }
  else if (!on && GAME.state === 'pause') { GAME.state = 'play'; UI.closeAll(); }
}
function toMenu() {
  if (GAME.mode && GAME.mode.end) GAME.mode.end(); GAME.mode = null;
  clearMarkers(); UI.prompt(null);
  GAME.state = 'menu'; UI.showHUD(false); UI.screen('menu'); AUDIO.silenceCar();
  const P = W.PLAZA; teleport(GAME.player, (P.x0 + P.x1) / 2 + 10, (P.z0 + P.z1) / 2, -Math.PI * 0.62);
  menuInfo();
}
function menuInfo() { $('#mmoney').textContent = fmtEn(SAVE.money) + ' ريال'; $('#mcar').textContent = CARS[SAVE.car].name; $('#mhint').textContent = IS_TOUCH ? 'العب بالعرض · دركسون بالسحب يسار · الأزرار يمين' : 'WASD للسواقة · مسافة هاند بريك · Shift نيترو · H هرن · C كاميرا'; }
function leaveMenu() { UI.screen(null); }

// ---------------------------------------------------------------- camera
const _cdir = V3(), _cdes = V3(), _clook = V3();
function camObstruct(from, to) {
  const d = from.distanceTo(to), n = 8; let t = 1;
  for (let i = 1; i <= n; i++) {
    const u = i / n, x = lerp(from.x, to.x, u), y = lerp(from.y, to.y, u), z = lerp(from.z, to.z, u);
    const cell = cellAt(x, z); let hit = false;
    if (cell) for (const o of cell) if (o.t === 0 && (o.kind === 'bldg' || o.kind === 'wall') && x > o.x0 - 0.3 && x < o.x1 + 0.3 && z > o.z0 - 0.3 && z < o.z1 + 0.3 && y < o.y1 + 0.3) { hit = true; break; }
    if (!hit && terrainH(x, z) > y - 0.4) hit = true;
    if (hit) { t = Math.max(0.15, (i - 1) / n); break; }
  }
  return t;
}
function updateCamera(dt) {
  const c = GAME.camera, v = GAME.player;
  if (GAME.state === 'intro' && CAM.intro) {
    const I = CAM.intro; I.t += dt; const u = clamp(I.t / I.dur, 0, 1), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    I.path.getPoint(e, c.position); I.look.getPoint(Math.min(1, e + 0.04), _clook); c.lookAt(_clook);
    c.fov = 55; c.updateProjectionMatrix();
    if (I.t > I.dur - 1.6 && !I.titled) { I.titled = true; UI.screen('title'); }
    if (u >= 1) { CAM.intro = null; GAME.state = 'title'; CAM.orbit = Math.atan2(c.position.x - v.pos.x, c.position.z - v.pos.z); }
    return;
  }
  if (GAME.state === 'title' || GAME.state === 'menu') {
    CAM.orbit = (CAM.orbit || 0) + dt * 0.12;
    const narrow = innerWidth < innerHeight * 1.1, R = narrow ? 11 : 8.5;
    const tp = V3(v.pos.x + Math.sin(CAM.orbit) * R, v.pos.y + 1.6, v.pos.z + Math.cos(CAM.orbit) * R);
    c.position.lerp(tp, GAME.state === 'title' ? 0.03 : 0.06);
    const side = V3(Math.cos(CAM.orbit), 0, -Math.sin(CAM.orbit)).multiplyScalar(narrow ? 0 : innerWidth > 900 ? 2.3 : 1.6);
    _clook.copy(v.pos).add(V3(0, 0.3, 0)).add(side);
    c.lookAt(_clook); c.fov = damp(c.fov, 46, 2, dt); c.updateProjectionMatrix(); CAM.snap = true;
    return;
  }
  if (GAME.state === 'photo') { UI.photoUpdate(dt); return; }
  if (!v) return;
  const f = v.forward(_v1); f.y = 0; f.normalize();
  const sp = v.speed;
  const vel = _v2.set(v.vel.x, 0, v.vel.z);
  let dir = _cdir.copy(f);
  if (sp > 3 && vel.dot(f) > 0) { vel.normalize(); const b = v.drifting ? 0.5 : 0.2; dir.lerp(vel, b * clamp(sp / 12, 0, 1)).normalize(); }
  if (CAM.mode === 0) {
    const dist = Math.min(9.6, 6.0 + sp * 0.04), h = 2.15 + Math.min(1.2, sp * 0.012) + (v.grounded ? 0 : 0.4);
    _cdes.copy(v.pos).addScaledVector(dir, -dist); _cdes.y = v.pos.y + h;
    const tgt = _v3.copy(v.pos); tgt.y += 1.1;
    const t = camObstruct(tgt, _cdes); if (t < 1) _cdes.lerpVectors(tgt, _cdes, t);
    if (CAM.snap) { CAM.pos.copy(_cdes); CAM.snap = false; }
    const kx = 1 - Math.exp(-(v.grounded ? 7.5 : 4) * dt), ky = 1 - Math.exp(-4.5 * dt);
    CAM.pos.x += (_cdes.x - CAM.pos.x) * kx; CAM.pos.z += (_cdes.z - CAM.pos.z) * kx; CAM.pos.y += (_cdes.y - CAM.pos.y) * ky;
    const gh = groundAt(CAM.pos.x, CAM.pos.z, CAM.pos.y + 3).h; if (CAM.pos.y < gh + 0.6) CAM.pos.y = gh + 0.6;
    _clook.copy(v.pos).addScaledVector(f, 1.6); _clook.y += 1.0;
    c.position.copy(CAM.pos);
  } else if (CAM.mode === 1) {
    const up = V3(0, 1, 0).applyQuaternion(v.quat), ff = v.forward(V3());
    const s = v.spec, hoodY = Math.max(...s.cabin.map(p => p[1])) - v.ph.cgH - 0.25;
    c.position.copy(v.pos).addScaledVector(up, hoodY + 0.05).addScaledVector(ff, s.cabin[3][0] + 0.25);
    _clook.copy(c.position).addScaledVector(ff, 20).addScaledVector(up, -0.5);
    CAM.pos.copy(c.position); CAM.snap = true;
  } else {
    const C = CAM.cin; C.t -= dt;
    const d = C.p.distanceTo(v.pos);
    if (C.t <= 0 || d > 45 || CAM.snap) {
      const base = V3().copy(v.pos).add(V3(0, 1, 0));
      let found = false;
      for (let tries = 0; tries < 8 && !found; tries++) {
        const ahead = V3().copy(v.pos).addScaledVector(v.vel, rr(1.2, 2.6)).addScaledVector(f, rr(4, 10));
        const side = V3(-f.z, 0, f.x).multiplyScalar((tries % 2 ? -1 : 1) * rr(5, 11));
        const p = ahead.add(side); p.y = groundAt(p.x, p.z, 60).h + rr(0.6, 3.2);
        if (camObstruct(base, p) >= 1 && camObstruct(V3().copy(base).addScaledVector(v.vel, 2), p) >= 1) { C.p.copy(p); found = true; }
      }
      if (!found) { C.p.copy(v.pos).addScaledVector(f, -7).add(V3(0, 3, 0)); }
      C.t = rr(3.5, 6); CAM.snap = false;
    }
    c.position.copy(C.p); _clook.copy(v.pos); _clook.y += 0.6; CAM.pos.copy(c.position);
  }
  // shake
  CAM.shake = Math.max(0, CAM.shake - dt * 2.5);
  const sh = CAM.shake * CAM.shake * 0.6 + (CAM.mode === 0 ? clamp((sp - 30) / 60, 0, 1) * 0.02 : 0) + (v.nitroOn ? 0.03 : 0);
  if (sh > 0) c.position.add(V3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
  c.lookAt(_clook);
  const fovT = (CAM.mode === 2 ? 38 : 60) + clamp(sp * 0.3, 0, 20) + (v.nitroOn ? 9 : 0);
  c.fov = damp(c.fov, fovT, 3, dt); c.updateProjectionMatrix();
}
function startIntro() {
  const P = W.PLAZA, v = GAME.player;
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  const pts = [[160, 95, -335], [60, 70, -255], [-40, 42, -190], [-108, 30, -168], [-170, 26, -110], [-230, 16, -60], [v.pos.x + 7, v.pos.y + 2.2, v.pos.z + 6]];
  const look = [[60, 10, -240], [-60, 5, -180], [-100, 8, -150], [-150, 3, -110], [-220, 1, -40], [cx, 0, cz], [v.pos.x, v.pos.y + 0.5, v.pos.z]];
  CAM.intro = { t: 0, dur: TEST ? 1 : 10, path: new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), look: new THREE.CatmullRomCurve3(look.map(p => V3(...p))) };
  GAME.state = 'intro';
}

// ---------------------------------------------------------------- per-frame simulation
let lastHorn = false, fpsAcc = 0, fpsN = 0, qualT = 0, fpsAvg = 60;
function sim(dt) {
  GAME.t += dt; U.uTime.value += dt;
  const st = GAME.state, play = st === 'play';
  const v = GAME.player;
  INPUT.update(dt);
  if (INPUT.override) Object.assign(INPUT, INPUT.override);
  // keys
  if (INPUT.edge('Escape')) { if ($('#shot').classList.contains('on')) UI.closeModal($('#shot')); else if (st === 'photo') UI.exitPhoto(); else if (st === 'garage') closeGarage(); else if (UI.anyModal() && st !== 'play') { if (st === 'pause') pauseGame(false); else UI.closeAll(); } else if (play) pauseGame(true); }
  if ((st === 'title') && (INPUT.edges.size)) titleContinue();
  if (play) {
    if (INPUT.edge('KeyC')) { CAM.mode = (CAM.mode + 1) % 3; SAVE.settings.cam = CAM.mode; persist(); CAM.snap = true; }
    if (INPUT.edge('KeyR')) resetCarToRoad();
    if ((INPUT.edge('KeyE') || INPUT.edge('Enter') || INPUT.edge('PadA')) && UI.lastPrompt) UI.lastPrompt.act();
    if (INPUT.edge('KeyP')) UI.enterPhoto();
    const hornNow = INPUT.horn;
    if (hornNow && !lastHorn) { const ht = (v.model.look && v.model.look.horn) | 0; AUDIO.horn(ht, true); NET.horn(); }
    if (!hornNow && lastHorn) AUDIO.horn(0, false);
    lastHorn = hornNow;
    if (UI.anyModal()) { v.input.throttle = 0; v.input.brake = 0.4; v.input.steer = 0; v.input.hand = 0; v.input.nitro = 0; }
    else INPUT.apply(v);
  } else if (v) { v.input.throttle = 0; v.input.brake = st === 'menu' || st === 'title' || st === 'intro' ? 1 : 0.3; v.input.steer = 0; v.input.hand = 0; v.input.nitro = 0; }
  const running = st === 'play' || st === 'menu' || st === 'title' || st === 'intro';
  if (running) {
    if (play && GAME.mode && GAME.mode.update) GAME.mode.update(dt);
    if (play) { UI.tutUpdate(dt); UI.cdUpdate(); }
    for (const veh of GAME.vehicles) veh.step(dt);
    for (let i = 0; i < GAME.vehicles.length; i++) for (let j = i + 1; j < GAME.vehicles.length; j++) collideVehicles(GAME.vehicles[i], GAME.vehicles[j]);
    for (const veh of GAME.vehicles) { collideTraffic(veh); hitProps(veh); }
    updateTraffic(dt, GAME.t, GAME.vehicles);
    updateProps(dt); updatePoles(dt);
    if (play) { SAVE.stats.distance += v.speed * dt; }
  }
  updateTrafficLights(GAME.t);
  // dynamic glows rebuild
  GLOW_D.count = 0;
  trafficLights(GAME.camera);
  for (const veh of GAME.vehicles) if (veh.isPolice && veh.lightbar) {
    const ph = Math.floor(U.uTime.value * 7) % 2; const lb = veh.lightbar;
    lb.red.material.color.setRGB(ph ? 3 : 0.3, 0.05, 0.05); lb.blue.material.color.setRGB(0.05, 0.15, ph ? 0.3 : 3);
    const p = V3(ph ? 0.3 : -0.3, lb.y - veh.ph.cgH, -0.15).applyQuaternion(veh.quat).add(veh.pos);
    GLOW_D.add(p.x, p.y, p.z, 5, ph ? 1.5 : 0.1, 0.05, ph ? 0.05 : 1.6, 1, 0.3);
  }
  // crowd phone flashes when the plaza gets hyped
  if (CROWD.uEx.value > 0.25 && W.crowdSpots.length) { const n = CROWD.uEx.value * 22 * dt; for (let k = 0; k < Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); k++) { const sp = W.crowdSpots[Math.floor(Math.random() * Math.min(W.crowdSpots.length, CROWD.mesh.count))]; GLOW_D.add(sp.x, sp.y + 2.1, sp.z, 1.4, 2.2, 2.2, 2.4, 1, 0); } }
  updateCups(GAME.t, play ? v : null);
  updateMarkers(GAME.t);
  // fire flicker + sparks
  const fl = 0.75 + Math.sin(GAME.t * 17) * 0.12 + Math.sin(GAME.t * 7.3) * 0.13;
  LIGHTS.fire.intensity = 30 * fl * (1 - U.uDawn.value * 0.5);
  const F = WORLD.fire;
  if (v && Math.hypot(v.pos.x - F.x, v.pos.z - F.z) < 150) {
    GLOW_D.add(F.x, F.y + 0.6, F.z, 3.4 * fl, 1.6, 0.6, 0.15, 1, 0);
    if (Math.random() < dt * 14) FX.spark.emit(F.x + rr(-0.4, 0.4), F.y + 0.4, F.z + rr(-0.4, 0.4), rr(-0.4, 0.4), rr(2, 4.5), rr(-0.4, 0.4), rr(0.9, 1.8), 0.12, 0.04, 2.4, 1.0, 0.3, 1, 0.6, -0.5);
    if (Math.random() < dt * 22) FX.spark.emit(F.x + rr(-0.3, 0.3), F.y + 0.2, F.z + rr(-0.3, 0.3), 0, rr(0.8, 1.5), 0, 0.45, 0.9, 0.3, 1.6, 0.6, 0.12, 0.8, 1, -0.6);
  }
  GLOW_D.upload();
  // FX
  for (const veh of GAME.vehicles) { if (veh.pos.distanceToSquared(GAME.camera.position) < 160 * 160) vehicleFX(veh, dt, GAME.quality); }
  FX.smoke.update(dt); FX.spark.update(dt); FX.skids.upload();
  // crowd
  CROWD.uCar.value.copy(v ? v.pos : V3());
  if (!(play && GAME.mode && GAME.mode.id === 'drift')) {
    let ex = 0;
    if (v && play) { const P = W.PLAZA, inP = v.pos.x > P.x0 - 10 && v.pos.x < P.x1 + 10 && v.pos.z > P.z0 - 10 && v.pos.z < P.z1 + 10; if (inP && v.drifting) ex = clamp(Math.abs(v.slipAngle) * 1.2 * clamp(v.speed / 15, 0, 1), 0, 1); }
    CROWD.uEx.value = damp(CROWD.uEx.value, ex, ex > CROWD.uEx.value ? 2 : 0.6, dt);
  }
  // audio
  if (AUDIO.ok) {
    if (v && !v.eng) v.eng = AUDIO.makeEngine(v, true);
    const audible = st === 'play';
    for (const veh of GAME.vehicles) if (veh.eng) {
      if (veh === v) AUDIO.updateEngine(veh.eng, dt, audible ? 1 : (st === 'menu' || st === 'title' ? 0.35 : 0), 0);
      else { const d = veh.pos.distanceTo(GAME.camera.position); const rel = V3().subVectors(veh.pos, GAME.camera.position).normalize(); const right = V3(1, 0, 0).applyQuaternion(GAME.camera.quaternion); AUDIO.updateEngine(veh.eng, dt, audible ? clamp(1 - d / 90, 0, 1) : 0, rel.dot(right)); }
    }
    if (audible) AUDIO.updateCarAmb(v, dt); else AUDIO.silenceCar();
    const P = W.PLAZA, pc = V3((P.x0 + P.x1) / 2, 0, (P.z0 + P.z1) / 2), dC = GAME.camera.position.distanceTo(pc);
    AUDIO.updateCrowd(clamp(1 - dC / 120, 0, 1), CROWD.uEx.value, dt);
  }
  // day / dawn
  let dawn = 0;
  if (SAVE.settings.dawnCycle) { const T = (GAME.t % 300); dawn = T < 170 ? 0 : T < 215 ? smooth(170, 215, T) : T < 255 ? 1 : 1 - smooth(255, 295, T); }
  U.uDawn.value = damp(U.uDawn.value, dawn, 2, dt);
  const D = U.uDawn.value;
  U.uLamp.value = lerp(1, 0.25, D);
  LIGHTS.hemi.intensity = lerp(0.75, 1.5, D); LIGHTS.hemi.color.setRGB(lerp(0.29, 0.75, D), lerp(0.35, 0.62, D), lerp(0.54, 0.6, D));
  LIGHTS.moon.intensity = lerp(0.55, 1.6, D); LIGHTS.moon.color.setRGB(lerp(0.66, 1.0, D), lerp(0.72, 0.62, D), lerp(1.0, 0.45, D));
  GAME.scene.fog.color.copy(FOGC_NIGHT).lerp(FOGC_DAWN, D);
  for (const p of [FX.smoke]) p.mat.uniforms.uFog.value.copy(GAME.scene.fog.color);
  // player headlights
  if (v) {
    const s = v.spec, hd = s.head;
    LIGHTS.heads.forEach((L, k) => {
      const sd = k ? 1 : -1;
      L.position.set(sd * hd.x, hd.v - v.ph.cgH, -hd.u - 0.2).applyQuaternion(v.quat).add(v.pos);
      L.target.position.set(sd * hd.x * 1.6, -v.ph.cgH - 1.2, -hd.u - 16).applyQuaternion(v.quat).add(v.pos);
      L.intensity = 90 * (1 - D * 0.6);
    });
    v.model.beams && (v.model.beams.userData.mat.uniforms.uI.value = 0.16 * (1 - D * 0.8));
    if (LIGHTS.moon.castShadow) { LIGHTS.moon.target.position.copy(v.pos); LIGHTS.moon.position.copy(v.pos).add(V3(-45, 52, 72).normalize().multiplyScalar(80)); }
  }
  NET.tick(dt); NET.update(dt);
  if (st === 'garage') garageUpdate(dt);
  updateCamera(dt);
  if (SKY) SKY.position.copy(GAME.camera.position);
  saveTick(dt);
  INPUT.endFrame();
}
function renderFrame(force) {
  const r = GAME.renderer;
  r.info.reset();
  if (GAME.state === 'garage') { r.render(GARAGE.scene, GARAGE.cam); return; }
  if (composer && GAME.quality !== 'low') composer.render(); else r.render(GAME.scene, GAME.camera);
}
let lastT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = clamp((now - (lastT || now)) / 1000, 0.0001, 0.05); lastT = now;
  try { sim(dt); } catch (e) { console.error(e); }
  if (GAME.state === 'play' || GAME.state === 'pause') UI.hudFrame(dt);
  if (!(TEST && window.__renderEvery && ((GAME._fc = (GAME._fc || 0) + 1) % window.__renderEvery))) renderFrame();
  // fps & auto quality
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 2.5) {
    fpsAvg = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    if (SAVE.settings.quality === 'auto' && GAME.state === 'play') {
      qualT++;
      const target = IS_TOUCH ? 28 : 45;
      if (qualT > 1 && fpsAvg < target) {
        if (GAME.quality === 'high') applyQuality('medium'); else if (GAME.quality === 'medium') applyQuality('low');
        else if ((GAME.prScale || 1) > 0.6) { GAME.prScale = (GAME.prScale || 1) * 0.85; applyQuality('low'); }
        qualT = 0;
      }
    }
  }
}
function titleContinue() {
  if (GAME.state !== 'title') return;
  AUDIO.init(); AUDIO.click();
  GAME.state = 'menu'; UI.screen('menu'); menuInfo();
}

// ---------------------------------------------------------------- boot
async function boot() {
  setLoad(0.05, 'يجهّز الخطوط…');
  try { await Promise.race([Promise.all([document.fonts.load('80px Lalezar'), document.fonts.load('700 20px Cairo')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  buildTextures(); buildSignAtlas();
  await nextFrame(); setLoad(0.15, 'يرصف الشوارع…');
  const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'gl';
  $('#app').prepend(renderer.domElement);
  GAME.renderer = renderer;
  const scene = new THREE.Scene(); GAME.scene = scene;
  scene.fog = new THREE.FogExp2(FOGC_NIGHT.getHex(), 0.0036);
  scene.background = new THREE.Color('#05060c');
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.15, 950); GAME.camera = camera; camera.position.set(150, 90, -330);
  buildEnvMap(renderer);
  GLOW_S = new GlowSys(2600, scene, { lampMul: true }); GLOW_D = new GlowSys(900, scene);
  await nextFrame(); setLoad(0.3, 'يبني العماير…');
  buildWorld(scene);
  scene.add(MARK.group);
  await nextFrame(); setLoad(0.6, 'يزرع النخيل وينادي الجمهور…');
  buildSky(scene); buildLights(scene); buildProps(scene); buildCups(scene); buildFX(scene, 'high'); buildGraph();
  buildTraffic(scene);
  await nextFrame(); setLoad(0.8, 'يجهّز الكراج…');
  buildGarageScene();
  setPlayerCar(SAVE.owned.includes(SAVE.car) ? SAVE.car : 'abu');
  const P = W.PLAZA; teleport(GAME.player, (P.x0 + P.x1) / 2 + 10, (P.z0 + P.z1) / 2, -Math.PI * 0.62);
  // composer
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.55, 0.82);
  composer.addPass(bloomPass); composer.addPass(new OutputPass());
  INPUT.init(); UI.init();
  BUS.on('shift', (v, d) => { if (v === GAME.player && GAME.state === 'play') AUDIO.shift(d > 0); });
  BUS.on('land', (v, air) => {
    if (v !== GAME.player || GAME.state !== 'play') return;
    const k = clamp(air / 2.2, 0.15, 1); CAM.shake = Math.min(1.4, CAM.shake + k * 0.9); AUDIO.thud(k, 'car');
    const sand = v.onSand > 0.4;
    for (let i = 0; i < Math.round(10 + k * 30); i++) { const a = Math.random() * TAU, r = rr(0.5, 2.5); FX.smoke.emit(v.pos.x + Math.cos(a) * r, v.pos.y - v.ph.cgH + 0.2, v.pos.z + Math.sin(a) * r, Math.cos(a) * rr(2, 6), rr(0.5, 2.5), Math.sin(a) * rr(2, 6), rr(1.2, 2.4), 1, 5, sand ? 0.42 : 0.2, sand ? 0.33 : 0.2, sand ? 0.22 : 0.22, 0.55, 2, 0.3); }
    if (air > 1.2) UI.toast(`طيران ${toAr(air.toFixed(1))} ثانية ✈️`);
  });
  applyQuality(SAVE.settings.quality === 'auto' ? autoQuality() : SAVE.settings.quality);
  addEventListener('resize', resize);
  // garage drag rotate
  renderer.domElement.addEventListener('pointerdown', e => { if (GAME.state === 'garage') { GARAGE.drag = { x: e.clientX, r: GARAGE.rot }; } if (GAME.state === 'photo' && UI.photo) UI.photo.drag = { x: e.clientX, y: e.clientY, yaw: UI.photo.yaw, pitch: UI.photo.pitch }; });
  addEventListener('pointermove', e => { if (GARAGE.drag) GARAGE.rot = GARAGE.drag.r + (e.clientX - GARAGE.drag.x) * 0.01; if (UI.photo && UI.photo.drag) { UI.photo.yaw = UI.photo.drag.yaw - (e.clientX - UI.photo.drag.x) * 0.006; UI.photo.pitch = clamp(UI.photo.drag.pitch + (e.clientY - UI.photo.drag.y) * 0.005, -1.2, 1.3); } });
  addEventListener('pointerup', () => { GARAGE.drag = null; if (UI.photo) UI.photo.drag = null; });
  renderer.domElement.addEventListener('wheel', e => { if (UI.photo) { UI.photo.dist = clamp(UI.photo.dist * (1 + Math.sign(e.deltaY) * 0.1), 2, 40); } }, { passive: true });
  const skipIntro = () => { if (GAME.state === 'intro') { CAM.intro = null; GAME.state = 'title'; UI.screen('title'); } titleContinue(); };
  $('#title').addEventListener('click', skipIntro);
  renderer.domElement.addEventListener('click', () => { if (GAME.state === 'intro' || GAME.state === 'title') skipIntro(); });
  $('#title').addEventListener('pointerdown', () => AUDIO.init());
  setLoad(1, 'يلا!');
  await nextFrame();
  $('#loading').style.opacity = 0; setTimeout(() => $('#loading').remove(), 700);
  startIntro();
  NET.init();
  requestAnimationFrame(loop);
  window.__H = { GAME, SAVE, CARS, W, WORLD, COL, TRAFFIC, NET, CAM, INPUT, UI, sim, renderFrame, startMode, teleport, Vehicle, groundAt, terrainH, setPlayerCar, openGarage, closeGarage, applyQuality, THREE, MODES, TRACKS, CUPS, CROWD, FX, fps: () => fpsAvg, titleContinue, TESTFLAG, AIDriver, GRAPH, resetCarToRoad, Path, GARAGE_SHOW: (id) => { garageShow(id); UI.garage(); } };
  window.__H.ready = true;
}
boot().catch(e => { console.error(e); const l = $('#loading .lt'); if (l) l.textContent = 'صار خطأ وقت التحميل: ' + (e && e.message); });
