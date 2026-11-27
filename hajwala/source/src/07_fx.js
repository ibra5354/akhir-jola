// =====================================================================
//  FX: smoke / dust / sparks particles, skid marks
// =====================================================================
class Particles {
  constructor(cap, scene, opt = {}) {
    this.cap = cap; this.n = 0; this.add_ = opt.additive;
    this.P = new Float32Array(cap * 3); this.V = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap);
    this.s0 = new Float32Array(cap); this.s1 = new Float32Array(cap); this.col = new Float32Array(cap * 3); this.a0 = new Float32Array(cap); this.rot = new Float32Array(cap); this.rv = new Float32Array(cap);
    this.drag = new Float32Array(cap); this.grav = new Float32Array(cap);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aSR = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iCol', this.aCol); g.setAttribute('iSR', this.aSR);
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: opt.additive ? TEX.glow : TEX.puff }, uFogD: { value: 0.006 }, uFog: { value: new THREE.Color() } },
      vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute vec2 iSR; varying vec2 vUv; varying vec4 vCol; varying float vF; uniform float uFogD;
        void main(){ vUv=uv; vCol=iCol; vec4 mv=modelViewMatrix*vec4(iPos,1.0); float c=cos(iSR.y), s=sin(iSR.y);
          vec2 p = mat2(c,-s,s,c)*position.xy; mv.xy += p*iSR.x; gl_Position=projectionMatrix*mv; float d=-mv.z; vF = 1.0-exp(-uFogD*uFogD*d*d); }`,
      fragmentShader: opt.additive ? `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol; varying float vF; void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(vCol.rgb*t.a*vCol.a*(1.0-vF),1.0); }`
        : `uniform sampler2D map; uniform vec3 uFog; varying vec2 vUv; varying vec4 vCol; varying float vF; void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(mix(vCol.rgb,uFog,vF), t.a*vCol.a); }`,
      transparent: true, depthWrite: false, blending: opt.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = opt.additive ? 7 : 6;
    this.g = g; scene.add(this.mesh);
    this.limit = cap;
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag = 1.5, grav = 0) {
    let i;
    if (this.n < this.limit) i = this.n++; else { i = Math.floor(Math.random() * this.n); }
    this.P[i * 3] = x; this.P[i * 3 + 1] = y; this.P[i * 3 + 2] = z;
    this.V[i * 3] = vx; this.V[i * 3 + 1] = vy; this.V[i * 3 + 2] = vz;
    this.life[i] = 0; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; this.a0[i] = a;
    this.rot[i] = Math.random() * TAU; this.rv[i] = (Math.random() - 0.5) * 1.2; this.drag[i] = drag; this.grav[i] = grav;
  }
  update(dt) {
    let j = 0;
    const P = this.P, V = this.V, ap = this.aPos.array, ac = this.aCol.array, as = this.aSR.array;
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt;
      const t = this.life[i] / this.max[i];
      if (t >= 1) continue;
      const dk = Math.exp(-this.drag[i] * dt);
      V[i * 3] *= dk; V[i * 3 + 1] = V[i * 3 + 1] * dk - this.grav[i] * dt; V[i * 3 + 2] *= dk;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      this.rot[i] += this.rv[i] * dt;
      // compact
      if (j !== i) {
        for (let k = 0; k < 3; k++) { P[j * 3 + k] = P[i * 3 + k]; V[j * 3 + k] = V[i * 3 + k]; this.col[j * 3 + k] = this.col[i * 3 + k]; }
        this.life[j] = this.life[i]; this.max[j] = this.max[i]; this.s0[j] = this.s0[i]; this.s1[j] = this.s1[i]; this.a0[j] = this.a0[i]; this.rot[j] = this.rot[i]; this.rv[j] = this.rv[i]; this.drag[j] = this.drag[i]; this.grav[j] = this.grav[i];
      }
      const fade = this.add_ ? (1 - t) : Math.min(1, t * 6) * (1 - t) * (1 - t);
      ap[j * 3] = P[j * 3]; ap[j * 3 + 1] = P[j * 3 + 1]; ap[j * 3 + 2] = P[j * 3 + 2];
      ac[j * 4] = this.col[j * 3]; ac[j * 4 + 1] = this.col[j * 3 + 1]; ac[j * 4 + 2] = this.col[j * 3 + 2]; ac[j * 4 + 3] = this.a0[j] * fade;
      as[j * 2] = lerp(this.s0[j], this.s1[j], Math.sqrt(t)); as[j * 2 + 1] = this.rot[j];
      j++;
    }
    this.n = j;
    this.g.instanceCount = j;
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSR.needsUpdate = true;
  }
  clear() { this.n = 0; this.g.instanceCount = 0; }
}

// ---------------------------------------------------------------- skid marks (ring buffer)
class Skids {
  constructor(cap, scene) {
    this.cap = cap; this.i = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(cap * 6 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.ca = new THREE.BufferAttribute(new Float32Array(cap * 6 * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.bt = new THREE.BufferAttribute(new Float32Array(cap * 6), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pos); g.setAttribute('aCol', this.ca); g.setAttribute('aBirth', this.bt);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uLamp: U.uLamp },
      vertexShader: `attribute vec4 aCol; attribute float aBirth; varying vec4 vC; uniform float uTime; void main(){ vC=aCol; float age=uTime-aBirth; float life = aCol.r > 0.2 ? 45.0 : 110.0; vC.a = aCol.a * clamp(1.0 - age/life, 0.0, 1.0); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec4 vC; void main(){ gl_FragColor = vC; }`,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3
    });
    g.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
    this.g = g; this.count = 0; scene.add(this.mesh);
    this.dirty0 = cap; this.dirty1 = 0;
  }
  // segment between a,b (world) with half width hw, color, intensity
  add(ax, ay, az, bx, by, bz, hw, r, g, b, a, t) {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz); if (l < 0.01) return;
    const px = -dz / l * hw, pz = dx / l * hw;
    const k = this.i; this.i = (this.i + 1) % this.cap; this.count = Math.min(this.cap, this.count + 1);
    const P = this.pos.array, C = this.ca.array, B = this.bt.array, o = k * 18;
    const v = [[ax - px, ay, az - pz], [bx - px, by, bz - pz], [bx + px, by, bz + pz], [ax - px, ay, az - pz], [bx + px, by, bz + pz], [ax + px, ay, az + pz]];
    for (let q = 0; q < 6; q++) { P[o + q * 3] = v[q][0]; P[o + q * 3 + 1] = v[q][1]; P[o + q * 3 + 2] = v[q][2]; C[k * 24 + q * 4] = r; C[k * 24 + q * 4 + 1] = g; C[k * 24 + q * 4 + 2] = b; C[k * 24 + q * 4 + 3] = a; B[k * 6 + q] = t; }
    this.dirty0 = Math.min(this.dirty0, k); this.dirty1 = Math.max(this.dirty1, k + 1);
  }
  upload() {
    if (this.dirty1 > this.dirty0) {
      for (const [att, sz] of [[this.pos, 18], [this.ca, 24], [this.bt, 6]]) { att.clearUpdateRanges(); att.addUpdateRange(this.dirty0 * sz, (this.dirty1 - this.dirty0) * sz); att.needsUpdate = true; }
      this.dirty0 = this.cap; this.dirty1 = 0;
    }
    this.g.setDrawRange(0, this.count * 6);
  }
  clear() { this.count = 0; this.i = 0; this.g.setDrawRange(0, 0); }
}

const FX = { smoke: null, spark: null, skids: null, shake: 0 };
function buildFX(scene, q) {
  FX.smoke = new Particles(900, scene); FX.spark = new Particles(500, scene, { additive: true }); FX.skids = new Skids(5000, scene);
  setFXQuality(q);
}
function setFXQuality(q) { if (!FX.smoke) return; FX.smoke.limit = q === 'low' ? 220 : q === 'medium' ? 480 : 900; FX.spark.limit = q === 'low' ? 150 : 500; }
const _lc = [0, 0, 0];
function smokeTint(x, y, z, base, out) {
  lampLightAt(x, y, z, 0, 1, 0, _lc);
  const lk = U.uLamp.value, amb = 0.16 + 0.5 * U.uDawn.value;
  out[0] = base.r * (amb + _lc[0] * 0.55 * lk); out[1] = base.g * (amb + _lc[1] * 0.55 * lk); out[2] = base.b * (amb + _lc[2] * 0.55 * lk);
  return out;
}
const _st = [0, 0, 0], _sc = new THREE.Color(), _wp = V3();
// called per vehicle per frame
function vehicleFX(v, dt, quality, extra = {}) {
  const now = U.uTime.value;
  const smokeCol = _sc.set((v.model.look && v.model.look.smoke) || '#ffffff');
  const dens = quality === 'low' ? 0.45 : quality === 'medium' ? 0.75 : 1;
  v._skidLast ||= [null, null, null, null];
  for (let k = 0; k < 4; k++) {
    const w = v.wheels[k];
    const p = v.wheelWorld(k, _wp);
    const last = v._skidLast[k];
    const sand = w.surf === S_SAND;
    const slip = w.contact ? w.slip : 0;
    // skid / tracks
    const mark = w.contact && (sand ? v.speed > 1.2 : slip > 0.45);
    if (mark) {
      if (last) {
        const y = groundAt(p.x, p.z, p.y + 0.5).h + 0.03;
        const d2 = (p.x - last.x) ** 2 + (p.z - last.z) ** 2;
        if (d2 > 0.35 * 0.35) {
          if (d2 < 9) {
            if (sand) FX.skids.add(last.x, last.y, last.z, p.x, y, p.z, v.spec.tireW * 0.55, 0.45, 0.33, 0.2, 0.32 + slip * 0.1, now);
            else FX.skids.add(last.x, last.y, last.z, p.x, y, p.z, v.spec.tireW * 0.5, 0.02, 0.02, 0.025, clamp((slip - 0.4) * 0.6, 0.1, 0.45), now);
          }
          last.x = p.x; last.y = y; last.z = p.z;
        }
      } else v._skidLast[k] = { x: p.x, y: groundAt(p.x, p.z, p.y + 0.5).h + 0.03, z: p.z };
    } else v._skidLast[k] = null;
    if (!w.contact) continue;
    // tire smoke (asphalt) or dust (sand)
    if (!sand && slip > 0.55 && v.speed > 2 && (w.front ? slip > 0.9 : true)) {
      const rate = (slip - 0.5) * 60 * dens * dt * (extra.smokeMul || 1);
      let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
      for (let q = 0; q < n; q++) {
        const sx = p.x + (Math.random() - 0.5) * 0.4, sz = p.z + (Math.random() - 0.5) * 0.4;
        smokeTint(sx, p.y + 0.5, sz, smokeCol, _st);
        FX.smoke.emit(sx, p.y + 0.25, sz, v.vel.x * 0.28 + (Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.2, v.vel.z * 0.28 + (Math.random() - 0.5) * 2, 2.6 + Math.random() * 1.8, 0.9, 5.5 + slip * 2, _st[0], _st[1], _st[2], 0.55, 1.3, -0.25);
      }
    }
    if (sand && v.speed > 2.5) {
      const rate = (v.speed * 0.6 + slip * 30) * dens * dt;
      let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
      for (let q = 0; q < n; q++) {
        smokeTint(p.x, p.y + 0.5, p.z, _sc.setRGB(0.95, 0.75, 0.5), _st);
        FX.smoke.emit(p.x, p.y + 0.15, p.z, v.vel.x * 0.15 + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 1.6 + slip, v.vel.z * 0.15 + (Math.random() - 0.5) * 3, 1.8 + Math.random() * 1.5, 0.8, 4 + slip * 3, _st[0] * 1.2, _st[1] * 1.15, _st[2], 0.5, 1.6, 0.4);
      }
      if (slip > 0.5 && Math.random() < 0.5) FX.spark.emit(p.x, p.y + 0.1, p.z, -v.vel.x * 0.1 + (Math.random() - 0.5) * 4, 2 + Math.random() * 3, -v.vel.z * 0.1 + (Math.random() - 0.5) * 4, 0.6, 0.12, 0.08, 0.3, 0.22, 0.12, 0.6, 0.5, 9);
    }
    if (smokeCol) _sc.set((v.model.look && v.model.look.smoke) || '#ffffff');
  }
  // nitro: blue glow sparks
  if (v.nitroOn) for (const e of v.model.exhaust) {
    const wp = e.clone().applyMatrix4(v.model.body.matrixWorld);
    FX.spark.emit(wp.x, wp.y, wp.z, -v.vel.x * 0.1 + (Math.random() - 0.5), (Math.random() - 0.5), -v.vel.z * 0.1 + (Math.random() - 0.5), 0.25, 0.5, 0.9, 0.4, 0.6, 1.8, 0.8, 2, 0);
  }
}
function sparksAt(p, n, strength) {
  for (let k = 0; k < n; k++) FX.spark.emit(p.x, p.y + 0.3, p.z, (Math.random() - 0.5) * 9, Math.random() * 5, (Math.random() - 0.5) * 9, 0.35 + Math.random() * 0.4, 0.18, 0.05, 2.2, 1.4, 0.5, 1, 1.2, 14);
}
function backfire(v) {
  for (const e of v.model.exhaust) {
    const wp = e.clone().applyMatrix4(v.model.body.matrixWorld);
    for (let k = 0; k < 5; k++) FX.spark.emit(wp.x, wp.y, wp.z, (Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2, 0.12, 0.6, 0.2, 2.4, 1.2, 0.3, 1, 3, 0);
  }
}
