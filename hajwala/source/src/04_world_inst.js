// =====================================================================
//  INSTANCED WORLD PARTS + GLOW SPRITES + DYNAMIC PROPS
// =====================================================================
class GlowSys {
  constructor(cap, scene, opt = {}) {
    this.cap = cap; this.count = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.colA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.size = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.pos); g.setAttribute('iCol', this.colA); g.setAttribute('iSize', this.size);
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uFogD: { value: 0.006 }, uLamp: U.uLamp, uLampMul: { value: opt.lampMul ? 1 : 0 } },
      vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute vec2 iSize; varying vec2 vUv; varying vec4 vCol; uniform float uFogD; uniform float uLamp; uniform float uLampMul;
        void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(iPos,1.0); float d=-mv.z;
          float s = iSize.x * (1.0 + iSize.y * clamp(d/60.0,0.0,3.0));
          mv.xy += position.xy * s; mv.z += min(1.0, d*0.5)*0.6; gl_Position = projectionMatrix*mv;
          float f = exp(-uFogD*uFogD*d*d*0.5); vCol = iCol; vCol.a *= f * mix(1.0, uLamp, uLampMul); }`,
      fragmentShader: `varying vec2 vUv; varying vec4 vCol; void main(){ float d=length(vUv-0.5)*2.0; float a = pow(max(0.0,1.0-d),2.6); float core = pow(max(0.0,1.0-d*2.4),3.0); gl_FragColor = vec4(vCol.rgb*(a*0.8 + core*0.9)*vCol.a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.g = g; scene.add(this.mesh);
  }
  add(x, y, z, s, r, g, b, a = 1, grow = 0) { if (this.count >= this.cap) return -1; const i = this.count++; this.set(i, x, y, z, s, r, g, b, a, grow); return i; }
  set(i, x, y, z, s, r, g, b, a = 1, grow = 0) {
    this.pos.array[i * 3] = x; this.pos.array[i * 3 + 1] = y; this.pos.array[i * 3 + 2] = z;
    this.colA.array[i * 4] = r; this.colA.array[i * 4 + 1] = g; this.colA.array[i * 4 + 2] = b; this.colA.array[i * 4 + 3] = a;
    this.size.array[i * 2] = s; this.size.array[i * 2 + 1] = grow;
  }
  setCol(i, r, g, b, a = 1) { const k = i * 4; this.colA.array[k] = r; this.colA.array[k + 1] = g; this.colA.array[k + 2] = b; this.colA.array[k + 3] = a; }
  upload() { this.g.instanceCount = this.count; this.pos.needsUpdate = this.colA.needsUpdate = this.size.needsUpdate = true; }
}
let GLOW_S, GLOW_D; // static, dynamic

// ---------------------------------------------------------------- lamp poles
function poleGeo(double) {
  const g = new Geo(), c = col('#6f7378'), dark = col('#2a2c30');
  g.cyl(0, 0, 0, 0.16, 0.1, 9, 8, c);
  g.cyl(0, 0, 0, 0.3, 0.26, 0.7, 8, dark);
  const arms = double ? [1, -1] : [1];
  for (const sd of arms) {
    if (double) { g.box(sd * 1.6, 8.75, 0, 3.2, 0.12, 0.12, c, {}); g.box(sd * 3.1, 8.45, 0, 0.9, 0.24, 0.5, dark, {}); g.box(sd * 3.1, 8.43, 0, 0.8, 0.02, 0.4, col('#fff2cc'), { em: col('#ffcc80'), noSides: true, top: false, bottom: true }); }
    else { g.box(0, 8.75, -1.2, 0.12, 0.12, 2.4, c, {}); g.box(0, 8.45, -2.25, 0.5, 0.24, 0.9, dark, {}); g.box(0, 8.43, -2.25, 0.4, 0.02, 0.8, col('#fff2cc'), { em: col('#ffcc80'), noSides: true, top: false, bottom: true }); }
  }
  const geo = g.build(false); geo.setAttribute('bake', new THREE.BufferAttribute(new Float32Array(g.count * 3), 3)); return geo;
}
function buildPoles(scene) {
  const single = W.poles.filter(p => !p.hwy), dbl = W.poles.filter(p => p.hwy);
  const mk = (list, geo) => {
    const m = new THREE.InstancedMesh(geo, worldMat({ roughness: 0.6, metalness: 0.3 }), list.length);
    list.forEach((p, i) => { _m4.makeRotationY(p.ry || 0).setPosition(p.x, 0, p.z); m.setMatrixAt(i, _m4); p.bend = 0; p.inst = i; p.mesh = m; p.col = addCircle(p.x, p.z, 0.28, 0, 9, { kind: 'pole', ref: p }); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); scene.add(m); return m;
  };
  WORLD.poleMesh = mk(single, poleGeo(false)); WORLD.poleMesh2 = mk(dbl, poleGeo(true));
  WORLD.bentPoles = [];
}
// bend a pole (called by physics on impact)
function bendPole(p, dirx, dirz, speed) {
  if (p.bend) return;
  p.bend = 0.0001; p.bendTarget = clamp(0.5 + speed * 0.035, 0.6, 1.25); p.bdx = dirx; p.bdz = dirz; p.col.on = false;
  WORLD.bentPoles.push(p);
  if (p.glow != null) GLOW_S.setCol(p.glow, 0, 0, 0, 0), GLOW_S.upload();
}
function updatePoles(dt) {
  for (const p of WORLD.bentPoles) {
    if (p.bend >= p.bendTarget) continue;
    p.bend = Math.min(p.bendTarget, p.bend + dt * 2.2);
    // rotation axis = up x dir
    const ax = V3(p.bdz, 0, -p.bdx).normalize();
    _q1.setFromAxisAngle(ax, p.bend);
    const m = new THREE.Matrix4().makeRotationFromQuaternion(_q1).multiply(new THREE.Matrix4().makeRotationY(p.ry || 0));
    m.setPosition(p.x, 0, p.z);
    p.mesh.setMatrixAt(p.inst, m); p.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- palms
function palmGeos() {
  const t = new Geo(), f = new Geo();
  const bark = col('#6a5440'), bark2 = col('#4e3d2e');
  const H = 9, seg = 7, rings = 10;
  for (let k = 0; k < rings; k++) {
    const y0 = k / rings * H, y1 = (k + 1) / rings * H, r0 = lerp(0.36, 0.2, k / rings), r1 = lerp(0.36, 0.2, (k + 1) / rings);
    const bend = (y) => (y / H) ** 2 * 0.9;
    const g2 = new Geo(); g2.cyl(0, 0, 0, r0, r1, y1 - y0, seg, k % 2 ? bark : bark2, { cap: false });
    const P = g2.p; for (let q = 0; q < P.length; q += 3) { const yy = P[q + 1] + y0; P[q] += bend(yy); P[q + 1] = yy; }
    t.p.push(...g2.p); t.n.push(...g2.n); t.c.push(...g2.c); t.uv.push(...g2.uv); t.e.push(...g2.e);
  }
  const top = [0.9, H, 0];
  const g1 = col('#2f5a2a'), g2c = col('#4a7a34'), tip = col('#9a9a48');
  const NF = 12;
  for (let i = 0; i < NF; i++) {
    const a = i / NF * TAU + (i % 2) * 0.2, droop = 0.55 + (i % 3) * 0.18, L = 3.6 + (i % 2) * 0.6;
    const dir = [Math.cos(a), 0, Math.sin(a)], side = [-Math.sin(a), 0, Math.cos(a)];
    const N = 7;
    const pt = (s) => { const d = s * L; return [top[0] + dir[0] * d, top[1] + Math.sin(s * 1.6) * 0.9 - (s * s) * droop * 2.6, top[2] + dir[2] * d]; };
    for (let k = 0; k < N; k++) {
      const s0 = k / N, s1 = (k + 1) / N, w0 = Math.sin(Math.PI * Math.min(1, s0 * 1.1 + 0.08)) * 0.55, w1 = Math.sin(Math.PI * Math.min(1, s1 * 1.1 + 0.08)) * 0.55;
      const A = pt(s0), B = pt(s1);
      const c0 = new THREE.Color().copy(g1).lerp(g2c, s0).lerp(tip, Math.max(0, s0 - 0.6)), c1 = new THREE.Color().copy(g1).lerp(g2c, s1).lerp(tip, Math.max(0, s1 - 0.6));
      // V-shaped leaf: left & right halves angled up
      for (const sd of [-1, 1]) {
        const L0 = [A[0] + side[0] * w0 * sd, A[1] + w0 * 0.25, A[2] + side[2] * w0 * sd], L1 = [B[0] + side[0] * w1 * sd, B[1] + w1 * 0.25, B[2] + side[2] * w1 * sd];
        const pts = sd > 0 ? [A, B, L1, A, L1, L0] : [A, L1, B, A, L0, L1];
        const cs = [c0, c1, c1, c0, c1, c0];
        pts.forEach((p, q) => f.v(p[0], p[1], p[2], 0, 1, 0, sd > 0 ? cs[q] : cs[[0, 2, 1, 3, 5, 4][q]]));
      }
    }
  }
  // date clusters
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; f.box(top[0] + Math.cos(a) * 0.45, H - 0.9, Math.sin(a) * 0.45, 0.35, 0.6, 0.35, col('#b8641a'), {}); }
  const tg = t.build(false), fg = f.build(false);
  for (const g of [tg, fg]) g.setAttribute('bake', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  fg.computeVertexNormals();
  return [tg, fg];
}
function buildPalms(scene) {
  // add road-side palms on the main avenues
  for (const s of WORLD.roads) {
    if (s.kind !== 'city' || s.hw < 8) continue;
    for (let a = s.a0 + 15; a < s.a1 - 8; a += 30) for (const sd of [-1, 1]) { const off = s.hw + 2.0; if (s.ax === 'z') W.palms.push({ x: s.c + sd * off, z: a, s: rr(0.85, 1.1) }); else W.palms.push({ x: a, z: s.c + sd * off, s: rr(0.85, 1.1) }); }
  }
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; W.palms.push({ x: W.CAMP.x + 26 + Math.cos(a) * rr(5, 12), z: W.CAMP.z - 14 + Math.sin(a) * rr(5, 10), s: rr(0.7, 1.1), desert: true }); }
  for (let z = 30; z < 120; z += 18) for (const sd of [-1, 1]) W.palms.push({ x: -100 + sd * 9, z, s: rr(0.8, 1.0) });
  for (let x = -312; x < -220; x += 14) W.palms.push({ x, z: 23.5, s: rr(0.8, 1.0) });
  const [tg, fg] = palmGeos();
  const n = W.palms.length;
  const mt = new THREE.InstancedMesh(tg, worldMat({ roughness: 1 }), n);
  const mfMat = worldMat({ roughness: 0.9, side: THREE.DoubleSide });
  const mf = new THREE.InstancedMesh(fg, mfMat, n);
  const q = new THREE.Quaternion(), s = V3(), p = V3();
  W.palms.forEach((pl, i) => {
    const y = pl.desert ? terrainH(pl.x, pl.z) - 0.2 : (surfAt(pl.x, pl.z) === S_CONC ? 0.16 : terrainH(pl.x, pl.z));
    q.setFromEuler(new THREE.Euler(0, rnd() * TAU, 0)); const sc = pl.s || 1; s.set(sc, sc * rr(0.85, 1.15), sc); p.set(pl.x, y, pl.z);
    _m4.compose(p, q, s); mt.setMatrixAt(i, _m4); mf.setMatrixAt(i, _m4);
    addCircle(pl.x, pl.z, 0.42 * sc, y - 1, y + 9, { kind: 'palm' });
  });
  for (const m of [mt, mf]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); scene.add(m); }
  // gentle sway for fronds
  mfMat.onBeforeCompile = (sh) => {
    sh.uniforms.uLamp = U.uLamp; sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 emv; attribute vec3 bake; varying vec3 vEmv; varying vec3 vBake; uniform float uTime;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmv=emv; vBake=bake; float sw = max(0.0, position.y-8.0); vec4 ip = instanceMatrix*vec4(0.,0.,0.,1.); transformed.x += sin(uTime*1.3 + ip.x*0.3)*0.05*sw*sw; transformed.z += cos(uTime*1.1 + ip.z*0.3)*0.05*sw*sw;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEmv; varying vec3 vBake; uniform float uLamp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmv;');
  };
  // bake palms lighting crudely: tint instance colors by nearby lamp light
  const o = [0, 0, 0];
  W.palms.forEach((pl, i) => { lampLightAt(pl.x, 5, pl.z, 0, 1, 0, o); const c = new THREE.Color(0.75 + o[0] * 0.9, 0.75 + o[1] * 0.7, 0.75 + o[2] * 0.5); mt.setColorAt(i, c); mf.setColorAt(i, c); });
  mt.instanceColor.needsUpdate = mf.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------- traffic lights
const TL_CYCLE = 16;
function tlPhase(t, offset) { const p = ((t + offset) % TL_CYCLE + TL_CYCLE) % TL_CYCLE; return p; }
// returns 'g','y','r' for axis ('x' = moving along x)
function tlState(it, axis, t) {
  const p = tlPhase(t, it.off);
  const a = p < 6 ? 'g' : p < 8 ? 'y' : 'r';
  const b = p >= 8 && p < 14 ? 'g' : p >= 14 ? 'y' : 'r';
  return axis === 'x' ? a : b;
}
function buildTrafficLights(scene) {
  const list = [[-100, -235], [-100, -65], [-210, -150], [10, -150], [10, -235], [-210, -65], [-100, -320], [10, -65]];
  WORLD.tl = [];
  const g = new Geo(), pc = col('#3a3d42');
  for (const [x, z] of list) {
    const it = WORLD.inters.find(i => i.x === x && i.z === z); if (!it) continue;
    it.tl = true; it.off = rr(0, TL_CYCLE); it.bulbs = [];
    // corners: each signal faces incoming traffic on its approach
    const appr = [ // [cornerX, cornerZ, facing dir of light (toward approaching cars), axis of those cars]
      [x + it.hx + 1.0, z + it.hz + 1.0, 0, 1, 'z'], [x - it.hx - 1.0, z - it.hz - 1.0, 0, -1, 'z'],
      [x - it.hx - 1.0, z + it.hz + 1.0, -1, 0, 'x'], [x + it.hx + 1.0, z - it.hz - 1.0, 1, 0, 'x']];
    for (const [cx, cz, fx, fz, axis] of appr) {
      g.cyl(cx, 0.16, cz, 0.12, 0.1, 5.2, 6, pc);
      addCircle(cx, cz, 0.2, 0, 6, { kind: 'solid' });
      g.box(cx, 4.0, cz, Math.abs(fx) ? 0.4 : 0.5, 1.5, Math.abs(fz) ? 0.4 : 0.5, col('#1b1c20'), {});
      for (let k = 0; k < 3; k++) {
        const by = 5.2 - 0.45 - k * 0.45;
        const gi = GLOW_S.add(cx + fx * 0.28, by - 0.0, cz + fz * 0.28, 0.9, 0, 0, 0, 1, 0.15);
        it.bulbs.push({ gi, k, axis });
      }
    }
    WORLD.tl.push(it);
  }
  const geo = g.build(); const m = new THREE.Mesh(geo, worldMat({ roughness: 0.6 })); m.matrixAutoUpdate = false; scene.add(m);
}
function updateTrafficLights(t) {
  let dirty = false;
  for (const it of WORLD.tl) for (const b of it.bulbs) {
    const st = tlState(it, b.axis, t);
    const on = (b.k === 0 && st === 'r') || (b.k === 1 && st === 'y') || (b.k === 2 && st === 'g');
    const key = on ? 1 : 0; if (b.last === key) continue; b.last = key; dirty = true;
    const c = b.k === 0 ? [1, 0.1, 0.05] : b.k === 1 ? [1, 0.7, 0.05] : [0.1, 1, 0.45];
    if (on) GLOW_S.setCol(b.gi, c[0] * 2.2, c[1] * 2.2, c[2] * 2.2, 1); else GLOW_S.setCol(b.gi, c[0] * 0.08, c[1] * 0.08, c[2] * 0.08, 1);
  }
  if (dirty) GLOW_S.upload();
}

// ---------------------------------------------------------------- crowd
function personGeo() {
  const g = new Geo();
  const part = (fn, tint, arm) => { const s = g.count; fn(); for (let k = s; k < g.count; k++) { g.tint.push(tint); g.arm.push(arm); } };
  g.tint = []; g.arm = [];
  const W1 = col('#ffffff'), skin = col('#b07a52'), black = col('#111111'), white = col('#f2f2f2'), sandal = col('#3a2a1a');
  part(() => { g.box(0, 0.06, 0, 0.44, 1.32, 0.3, W1, {}); g.box(0, 1.1, 0, 0.5, 0.36, 0.32, W1, {}); }, 1, 0);       // thobe
  part(() => { g.box(0, 0, 0.03, 0.4, 0.06, 0.28, sandal, {}); }, 0, 0);
  part(() => { g.box(0, 1.46, 0, 0.21, 0.24, 0.22, skin, {}); g.box(0, 1.45, 0.08, 0.16, 0.1, 0.08, col('#1a120c'), {}); }, 0, 0); // head + beard
  part(() => { g.box(0, 1.66, -0.02, 0.27, 0.07, 0.28, white, {}); g.box(0, 1.24, -0.12, 0.34, 0.46, 0.06, white, {}); g.box(-0.14, 1.3, 0.0, 0.05, 0.38, 0.24, white, {}); g.box(0.14, 1.3, 0.0, 0.05, 0.38, 0.24, white, {}); }, 2, 0); // ghutra (tint 2 = ghutra color)
  part(() => { g.box(0, 1.7, -0.02, 0.25, 0.045, 0.25, black, {}); }, 0, 0); // agal
  for (const sd of [-1, 1]) part(() => { g.box(sd * 0.3, 0.76, 0, 0.12, 0.62, 0.13, W1, {}); g.box(sd * 0.3, 0.7, 0, 0.09, 0.08, 0.1, skin, {}); }, 1, sd < 0 ? 1 : 2);
  part(() => { g.box(0.3, 0.62, 0.08, 0.08, 0.15, 0.015, col('#222'), { em: col('#9fd0ff') }); }, 0, 3); // phone in right hand
  const geo = g.build(false);
  geo.setAttribute('tint', new THREE.Float32BufferAttribute(g.tint, 1));
  geo.setAttribute('arm', new THREE.Float32BufferAttribute(g.arm, 1));
  geo.setAttribute('bake', new THREE.BufferAttribute(new Float32Array(g.count * 3), 3));
  return geo;
}
const CROWD = { mesh: null, uEx: { value: 0 }, uCar: { value: V3() }, n: 0 };
function buildCrowd(scene) {
  const spots = W.crowdSpots, n = spots.length, geo = personGeo();
  const phase = new Float32Array(n), gh = new Float32Array(n), phone = new Float32Array(n);
  const m = new THREE.InstancedMesh(geo, null, n);
  const thobes = ['#f4f2ec', '#f4f2ec', '#efe9dc', '#e9e1cf', '#d9d2c4', '#bfb6a6', '#8a7f70', '#4a4a4f', '#2c2c30', '#a89070'].map(col);
  const q = new THREE.Quaternion(), s = V3(1, 1, 1);
  spots.forEach((sp, i) => {
    const sc = rr(0.92, 1.08); s.set(sc, sc, sc);
    q.setFromEuler(new THREE.Euler(0, sp.face + rr(-0.35, 0.35), 0));
    _m4.compose(V3(sp.x, sp.y, sp.z), q, s); m.setMatrixAt(i, _m4);
    m.setColorAt(i, pick(thobes)); phase[i] = rnd(); gh[i] = rnd() < 0.55 ? 1 : 0; phone[i] = rnd() < 0.45 ? 1 : 0;
  });
  geo.setAttribute('iPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geo.setAttribute('iGh', new THREE.InstancedBufferAttribute(gh, 1));
  geo.setAttribute('iPhone', new THREE.InstancedBufferAttribute(phone, 1));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uEx = CROWD.uEx; sh.uniforms.uCar = CROWD.uCar; sh.uniforms.uLamp = U.uLamp;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 emv; attribute float tint; attribute float arm; attribute float iPhase; attribute float iGh; attribute float iPhone;
      uniform float uTime; uniform float uEx; uniform vec3 uCar; varying vec3 vEmv;`)
      .replace('#include <color_vertex>', `vColor = color;
      #ifdef USE_INSTANCING_COLOR
        vec3 ghc = mix(vec3(0.95), vec3(0.85,0.12,0.12), iGh);
        vColor.xyz = tint > 1.5 ? ghc : mix(vColor.xyz, vColor.xyz*instanceColor.xyz, tint);
      #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vEmv = emv;
        vec4 ipos = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
        float dCar = distance(ipos.xz, uCar.xz);
        float ex = uEx * smoothstep(70.0, 12.0, dCar) + 0.06;
        float t = uTime*8.0 + iPhase*40.0;
        float up = clamp(ex*1.6,0.0,1.0) * (0.75+0.25*sin(t*0.13 + iPhase*9.0));
        if (arm > 0.5) {
          float sd = (arm > 1.5) ? 1.0 : -1.0; if (arm > 2.5) sd = 1.0;
          bool isPhone = arm > 2.5;
          if (isPhone && iPhone < 0.5) transformed *= 0.0;
          vec3 piv = vec3(sd*0.3, 1.38, 0.0);
          vec3 p = transformed - piv;
          float raise = up * (isPhone || (sd>0.0 && iPhone>0.5) ? 2.75 : 2.55) + (1.0-up)*0.08*sin(t*0.2+sd);
          float clap = (iPhone>0.5 && sd>0.0) ? 0.0 : up * (0.25 + 0.25*sin(t));
          float c=cos(-raise), s=sin(-raise); p = vec3(p.x, p.y*c - p.z*s, p.y*s + p.z*c);
          float cz=cos(-sd*clap), sz=sin(-sd*clap); p = vec3(p.x*cz - p.y*sz, p.x*sz + p.y*cz, p.z);
          transformed = p + piv;
        }
        transformed.y += max(0.0, sin(t*0.9)) * 0.18 * clamp(ex*2.0-0.4,0.0,1.0) * step(0.5, fract(iPhase*7.0));
        if (isinf(transformed.y)) transformed.y = 0.0;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEmv; uniform float uLamp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmv*1.6 + diffuseColor.rgb*vec3(0.55,0.42,0.3)*uLamp*0.55;');
  };
  m.material = mat; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
  m.frustumCulled = false;
  scene.add(m); CROWD.mesh = m; CROWD.n = n;
}

// ---------------------------------------------------------------- static glows (lamp heads etc)
function buildStaticGlows(scene) {
  for (const p of W.poles) {
    if (p.hwy) { p.glow = GLOW_S.add(p.x + 3.1, 8.35, p.z, 2.4, 1.0, 0.5, 0.16, 0.9, 0.5); GLOW_S.add(p.x - 3.1, 8.35, p.z, 2.4, 1.0, 0.5, 0.16, 0.9, 0.5); }
    else p.glow = GLOW_S.add(p.hx, 8.35, p.hz, 2.4, 1.0, 0.5, 0.16, 0.9, 0.5);
  }
  for (const [x, z] of W.masts) for (const o of [-1, 0, 1]) GLOW_S.add(x + o * 1.0, 15.8, z, 3.2, 1, 0.9, 0.75, 1, 0.4);
  for (const u of WORLD.rbUp) GLOW_S.add(u[0], u[1], u[2], 1.5, 1, 0.8, 0.45, 1, 0);
  // garage doors & gas station strip
  for (const ox of [-10, 0, 10]) GLOW_S.add(W.GARAGE.door.x + ox, 0.3, W.GARAGE.door.z - 0.6, 3.2, 1, 0.45, 0.1, 0.5, 0);
  GLOW_S.add(W.GAS.x, 5.2, W.GAS.z, 10, 0.5, 0.75, 1, 0.35, 0);
  // minaret ring etc are emissive geometry already
  GLOW_S.upload();
}

// ---------------------------------------------------------------- dynamic props (cartons / cones)
const PROPS = { list: [], carton: null, cone: null };
function buildProps(scene) {
  const cg = new Geo(); cg.box(0, -0.3, 0, 0.6, 0.6, 0.6, col('#a8784a'), { top: col('#b88a58') }); cg.box(0, 0.295, 0, 0.62, 0.01, 0.12, col('#d8c8a0'), {});
  const kg = new Geo(); kg.cyl(0, -0.38, 0, 0.26, 0.04, 0.76, 10, col('#ff6a1a')); kg.cyl(0, -0.08, 0, 0.15, 0.11, 0.16, 10, col('#f2f2f2'), { cap: false }); kg.box(0, -0.4, 0, 0.5, 0.04, 0.5, col('#ff6a1a'), {});
  const items = [];
  for (const p of W.props) {
    if (p.type === 'cartons') { const n = ri(4, 7); for (let k = 0; k < n; k++) items.push({ type: 0, x: p.x + rr(-1, 1), z: p.z + rr(-1, 1), stack: k }); }
    else items.push({ type: 1, x: p.x, z: p.z });
  }
  const nC = items.filter(i => i.type === 0).length, nK = items.filter(i => i.type === 1).length;
  const mat = worldMat({ roughness: 0.9 });
  const mk = (g, n) => { const geo = g.build(false); geo.setAttribute('bake', new THREE.BufferAttribute(new Float32Array(g.count * 3), 3)); const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); return m; };
  PROPS.carton = mk(cg, nC); PROPS.cone = mk(kg, nK);
  let ic = 0, ik = 0;
  for (const it of items) {
    const g = groundAt(it.x, it.z, 50).h;
    const h = it.type === 0 ? 0.3 : 0.4;
    const pr = { type: it.type, idx: it.type === 0 ? ic++ : ik++, p: V3(it.x, g + h + (it.stack ? (it.stack % 3) * 0.6 : 0), it.z), v: V3(), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * TAU, 0)), w: V3(), active: false, r: it.type === 0 ? 0.45 : 0.3, h };
    pr.home = pr.p.clone(); pr.homeQ = pr.q.clone();
    PROPS.list.push(pr);
  }
  PROPS.grid = new Map();
  for (const pr of PROPS.list) propMatrix(pr);
  PROPS.carton.instanceMatrix.needsUpdate = PROPS.cone.instanceMatrix.needsUpdate = true;
}
function propMatrix(pr) { _m4.compose(pr.p, pr.q, V3(1, 1, 1)); (pr.type === 0 ? PROPS.carton : PROPS.cone).setMatrixAt(pr.idx, _m4); }
function hitProps(car) {
  const p = car.pos, v = car.vel, sp = v.length(); if (sp < 1.5) return;
  for (const pr of PROPS.list) {
    const dx = pr.p.x - p.x, dz = pr.p.z - p.z; if (dx * dx + dz * dz > 16) continue;
    // check vs car oriented box
    const loc = _v1.set(dx, pr.p.y - p.y, dz).applyQuaternion(_q1.copy(car.quat).invert());
    if (Math.abs(loc.x) < car.spec.width / 2 + pr.r && Math.abs(loc.z) < car.spec.length / 2 + pr.r && Math.abs(loc.y) < 2) {
      pr.active = true; pr.rest = 0;
      pr.v.copy(v).multiplyScalar(rr(0.9, 1.25)); pr.v.y = rr(2.5, 5) + sp * 0.08;
      pr.v.x += dx * 2; pr.v.z += dz * 2;
      pr.w.set(rr(-8, 8), rr(-8, 8), rr(-8, 8));
      if (!pr._hitT || performance.now() - pr._hitT > 300) { AUDIO.thud(0.3, pr.type === 0 ? 'box' : 'cone'); pr._hitT = performance.now(); }
      car.vel.multiplyScalar(0.985);
    }
  }
}
function updateProps(dt) {
  let dirty = false;
  for (const pr of PROPS.list) {
    if (!pr.active) continue;
    dirty = true;
    pr.v.y -= 18 * dt; pr.p.addScaledVector(pr.v, dt);
    const ang = pr.w.length(); if (ang > 0.01) { _q1.setFromAxisAngle(_v1.copy(pr.w).divideScalar(ang), ang * dt); pr.q.premultiply(_q1); }
    const g = groundAt(pr.p.x, pr.p.z, pr.p.y + 0.5).h + pr.h * 0.9;
    if (pr.p.y < g) { pr.p.y = g; if (pr.v.y < 0) pr.v.y *= -0.3; pr.v.x *= 0.82; pr.v.z *= 0.82; pr.w.multiplyScalar(0.7); }
    if (pr.v.lengthSq() < 0.05 && pr.p.y <= g + 0.02) { pr.rest += dt; if (pr.rest > 0.5) pr.active = false; }
    propMatrix(pr);
  }
  if (dirty) { PROPS.carton.instanceMatrix.needsUpdate = true; PROPS.cone.instanceMatrix.needsUpdate = true; }
}
function resetProps() { for (const pr of PROPS.list) { pr.p.copy(pr.home); pr.q.copy(pr.homeQ); pr.active = false; propMatrix(pr); } PROPS.carton.instanceMatrix.needsUpdate = PROPS.cone.instanceMatrix.needsUpdate = true; }
