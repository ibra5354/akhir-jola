// =====================================================================
//  AI: traffic (kinematic, instanced), AI drivers (race / chase), ghost
// =====================================================================
class Path {
  constructor(pts, closed) { // pts: array of [x,z]
    this.closed = closed; this.p = []; this.s = [0];
    for (const q of pts) this.p.push({ x: q[0], z: q[1] });
    for (let i = 1; i < this.p.length; i++) this.s.push(this.s[i - 1] + Math.hypot(this.p[i].x - this.p[i - 1].x, this.p[i].z - this.p[i - 1].z));
    if (closed) { const a = this.p[this.p.length - 1], b = this.p[0]; this.len = this.s[this.s.length - 1] + Math.hypot(b.x - a.x, b.z - a.z); } else this.len = this.s[this.s.length - 1];
  }
  idx(s) { // binary search
    let lo = 0, hi = this.s.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.s[m] <= s) lo = m; else hi = m - 1; }
    return lo;
  }
  at(s, out = {}) {
    if (this.closed) s = ((s % this.len) + this.len) % this.len; else s = clamp(s, 0, this.len);
    const i = this.idx(s), a = this.p[i], b = this.p[(i + 1) % this.p.length];
    const s0 = this.s[i], s1 = i + 1 < this.s.length ? this.s[i + 1] : this.len, t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
    out.x = lerp(a.x, b.x, t); out.z = lerp(a.z, b.z, t);
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; out.dx = dx / l; out.dz = dz / l;
    return out;
  }
  nearest(x, z, hint = -1, win = 40) {
    let best = 1e9, bi = 0;
    const N = this.p.length;
    const range = hint >= 0 ? [hint - win, hint + win] : [0, N - 1];
    for (let k = range[0]; k <= range[1]; k++) { const i = this.closed ? ((k % N) + N) % N : clamp(k, 0, N - 1); const d = (this.p[i].x - x) ** 2 + (this.p[i].z - z) ** 2; if (d < best) { best = d; bi = i; } }
    return { i: bi, d: Math.sqrt(best), s: this.s[bi] };
  }
}
// rounded rectangle loop on road centers with right-hand lane offset. dir: 1 = clockwise on map (x right, z down)
function loopPath(x0, z0, x1, z1, off, rad = 9, ccw = false) {
  // corners in clockwise order (screen): (x0,z0)->(x1,z0)->(x1,z1)->(x0,z1)
  let C = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  if (ccw) C = C.reverse();
  const pts = [];
  for (let k = 0; k < 4; k++) {
    const a = C[k], b = C[(k + 1) % 4], c = C[(k + 2) % 4];
    const dx = Math.sign(b[0] - a[0]), dz = Math.sign(b[1] - a[1]);
    const rx = -dz, rz = dx; // right of travel (x right, z down): forward (dx,dz) -> right = (-dz, dx)
    const A = [a[0] + rx * off, a[1] + rz * off];
    const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    const n = Math.max(2, Math.floor((len - 2 * rad) / 3));
    for (let i = 0; i <= n; i++) { const t = rad + (len - 2 * rad) * i / n; pts.push([A[0] + dx * t, A[1] + dz * t]); }
    // corner arc from this edge into next edge
    const dx2 = Math.sign(c[0] - b[0]), dz2 = Math.sign(c[1] - b[1]), rx2 = -dz2, rz2 = dx2;
    const B = [b[0] + rx * off + rx2 * off, b[1] + rz * off + rz2 * off];
    const p0 = [B[0] - dx * rad, B[1] - dz * rad], p2 = [B[0] + dx2 * rad, B[1] + dz2 * rad];
    for (let i = 1; i < 6; i++) { const t = i / 6, u = 1 - t; pts.push([u * u * p0[0] + 2 * u * t * B[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * B[1] + t * t * p2[1]]); }
  }
  return new Path(pts, true);
}
// right-hand driving: forward (dx,dz) right=(−dz,dx) in x-right/z-down? verify: north (0,-1) -> right (1,0) east. ok.

const TRAFFIC = { cars: [], paths: [], meshes: [], stops: [] };
const TRAFFIC_KINDS = ['sedan', 'suv', 'pickup', 'van'];
function buildTraffic(scene) {
  const P = [];
  P.push(loopPath(-320, -320, -210, -235, 3));
  P.push(loopPath(-210, -320, 10, -235, 3, 9, true));
  P.push(loopPath(10, -235, 120, -65, 3));
  P.push(loopPath(-320, -235, -210, 20, 3, 9, true));
  P.push(loopPath(-210, -65, 10, 20, 3));
  P.push(loopPath(10, -320, 120, -235, 3, 9, true));
  // roundabout circle (counter-clockwise on map = with island on the left)
  const rp = []; for (let k = 0; k < 48; k++) { const a = k / 48 * TAU; rp.push([W.RB.x + Math.cos(a) * 19, W.RB.z - Math.sin(a) * 19]); }
  P.push(new Path(rp, true));
  // highway: southbound (west side), northbound (east side) - open paths
  const hs = [], hn = []; for (let z = -338; z <= 296; z += 6) { hs.push([W.HWY.x - 5.5, z]); hn.unshift([W.HWY.x + 5.5, z]); }
  P.push(new Path(hs, false), new Path(hn, false));
  TRAFFIC.paths = P;
  // stop points at traffic lights
  for (const path of P) {
    path.stops = [];
    if (!path.closed || path === P[6]) continue;
    for (const it of WORLD.tl) {
      // find where path enters intersection box
      let inside = false;
      for (let i = 0; i < path.p.length; i++) {
        const q = path.p[i], inBox = Math.abs(q.x - it.x) < it.hx + 1 && Math.abs(q.z - it.z) < it.hz + 1;
        if (inBox && !inside) { const a = path.at(path.s[i]); const axis = Math.abs(a.dx) > Math.abs(a.dz) ? 'x' : 'z'; path.stops.push({ s: Math.max(0, path.s[i] - 3), it, axis }); }
        inside = inBox;
      }
    }
    path.stops.sort((a, b) => a.s - b.s);
  }
  // instanced meshes
  const mat = worldMat({ roughness: 0.4, metalness: 0.3 });
  mat.envMap = ENVMAP; mat.envMapIntensity = 0.7;
  for (const k of TRAFFIC_KINDS) { const geo = simpleCarGeo(k); const m = new THREE.InstancedMesh(geo, mat, 14); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.userData.spec = geo.userData.spec; scene.add(m); TRAFFIC.meshes.push(m); }
  const pal = ['#f2f2f2', '#f2f2f2', '#d0d3d8', '#1a1b1e', '#8b0f12', '#1c3d6e', '#bfa27a', '#5a5f66', '#e9e2c9', '#2e5a3a', '#c9c9c9'].map(col);
  // spawn
  const counts = [2, 3, 3, 3, 3, 2, 3, 4, 4];
  let id = 0;
  P.forEach((path, pi) => {
    const n = counts[pi];
    for (let k = 0; k < n; k++) {
      const kind = pi >= 7 ? (k % 3 === 0 ? 3 : k % 2) : Math.floor(rnd() * 4);
      const mesh = TRAFFIC.meshes[kind];
      const car = { id: id++, path, s: path.len * (k + rnd() * 0.5) / n, v: 0, cruise: pi >= 7 ? rr(21, 27) : pi === 6 ? 8 : rr(10, 13), kind, mesh, inst: mesh.count++, color: pick(pal), off: V3(), offV: V3(), yawOff: 0, stun: 0, honkT: 0, waitT: 0, x: 0, z: 0, y: 0, hd: 0, active: true, spec: mesh.userData.spec, brake: false, gl: -1 };
      mesh.setColorAt(car.inst, car.color);
      TRAFFIC.cars.push(car);
    }
  });
  for (const m of TRAFFIC.meshes) { if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  for (const c of TRAFFIC.cars) { const a = c.path.at(c.s); c.x = a.x; c.z = a.z; c.hd = Math.atan2(-a.dx, -a.dz); }
}
function setTrafficDensity(q) {
  const lim = q === 'low' ? 0.5 : q === 'medium' ? 0.8 : 1;
  TRAFFIC.cars.forEach((c, i) => { c.active = (i % 10) / 10 < lim; });
}
const _ta = {};
function updateTraffic(dt, t, vehicles) {
  const cars = TRAFFIC.cars;
  for (const c of cars) {
    if (!c.active) continue;
    const path = c.path;
    const a = path.at(c.s, _ta);
    const fx = a.dx, fz = a.dz;
    let target = c.cruise;
    // traffic light
    if (path.stops.length) {
      const sNow = ((c.s % path.len) + path.len) % path.len;
      for (const st of path.stops) {
        let ds = st.s - sNow; if (ds < -2) ds += path.len;
        if (ds > 40) continue; if (ds < -1) continue;
        const L = tlState(st.it, st.axis, t);
        if (L === 'r' || (L === 'y' && ds > 6)) target = Math.min(target, Math.max(0, (ds - 1) * 0.9));
        break;
      }
    }
    // obstacles ahead (other traffic + vehicles)
    let blockedByPlayer = false;
    const chk = (ox, oz, isPlayer, prio) => {
      const dx = ox - c.x, dz = oz - c.z, along = dx * fx + dz * fz, lat = -dx * fz + dz * fx;
      if (along > 0.5 && along < 16 && Math.abs(lat) < 2.4) { const lim = Math.max(0, (along - 6.5) * 1.1); if (lim < target) { target = lim; if (isPlayer) blockedByPlayer = true; } }
    };
    for (const o of cars) if (o !== c && o.active && (Math.abs(o.x - c.x) < 18 && Math.abs(o.z - c.z) < 18)) { if (o.id < c.id && Math.abs(o.hd - c.hd) > 0.8 && Math.abs(Math.abs(o.hd - c.hd) - Math.PI) > 0.8) continue; chk(o.x, o.z, false); }
    for (const v of vehicles) if (Math.abs(v.pos.x - c.x) < 18 && Math.abs(v.pos.z - c.z) < 18) chk(v.pos.x, v.pos.z, v.isPlayer);
    if (c.stun > 0) { c.stun -= dt; target = 0; }
    if (target < 0.5) c.waitT += dt; else c.waitT = 0;
    if (c.waitT > 7 && !blockedByPlayer) target = 4; // anti-deadlock creep
    if (blockedByPlayer && c.waitT > 1.5 && c.honkT <= 0) { c.honkT = 5; trafficHonk(c); }
    c.honkT -= dt;
    const acc = target > c.v ? 3 : 9;
    c.v = target > c.v ? Math.min(target, c.v + acc * dt) : Math.max(target, c.v - acc * dt);
    c.brake = target < c.v - 0.5 || c.v < 0.3;
    c.s += c.v * dt;
    if (!path.closed && c.s >= path.len) {
      // respawn at start if player not near
      const st = path.at(0), pl = vehicles[0];
      if (!pl || Math.hypot(pl.pos.x - st.x, pl.pos.z - st.z) > 70) c.s = 0; else c.s = path.len;
    }
    const b = path.at(c.s, _ta);
    // displacement from hits decays
    c.off.addScaledVector(c.offV, dt); c.offV.multiplyScalar(Math.exp(-4 * dt)); c.off.multiplyScalar(Math.exp(-0.8 * dt));
    c.yawOff *= Math.exp(-1.5 * dt);
    c.x = b.x + c.off.x; c.z = b.z + c.off.z;
    c.hd = Math.atan2(-b.dx, -b.dz) + c.yawOff;
    c.y = groundAt(c.x, c.z, 3).h;
  }
  // matrices
  const q = new THREE.Quaternion(), one = V3(1, 1, 1);
  for (const c of cars) {
    if (!c.active) { _m4.makeScale(0, 0, 0); c.mesh.setMatrixAt(c.inst, _m4); continue; }
    q.setFromAxisAngle(_v1.set(0, 1, 0), c.hd);
    _m4.compose(_v2.set(c.x, c.y, c.z), q, one); c.mesh.setMatrixAt(c.inst, _m4);
  }
  for (const m of TRAFFIC.meshes) m.instanceMatrix.needsUpdate = true;
}
function trafficLights(cam) {
  // headlight/taillight glows for traffic (into GLOW_D)
  for (const c of TRAFFIC.cars) {
    if (!c.active) continue;
    const d2 = (c.x - cam.position.x) ** 2 + (c.z - cam.position.z) ** 2; if (d2 > 260 * 260) continue;
    const fx = -Math.sin(c.hd), fz = -Math.cos(c.hd), rx = -fz, rz = fx, s = c.spec, hl = s.L / 2;
    for (const sd of [-0.65, 0.65]) {
      GLOW_D.add(c.x + fx * hl + rx * sd, c.y + 0.75, c.z + fz * hl + rz * sd, 1.1, 1.0, 0.92, 0.75, 0.9, 0.25);
      GLOW_D.add(c.x - fx * hl + rx * sd, c.y + 0.78, c.z - fz * hl + rz * sd, c.brake ? 1.0 : 0.6, 1, 0.05, 0.03, c.brake ? 1 : 0.55, 0.2);
    }
  }
}
function trafficHonk(c) {
  const pl = GAME.player; if (!pl) return;
  const d = Math.hypot(pl.pos.x - c.x, pl.pos.z - c.z); if (d > 45) return;
  AUDIO.horn([0, 5, 1, 0][c.kind], true, clamp(1 - d / 45, 0.1, 0.8) * 0.9, 0);
}
// player <-> traffic collisions
function collideTraffic(v) {
  const r = v.spec.W / 2;
  vehicleCircles(v, _ca);
  for (const c of TRAFFIC.cars) {
    if (!c.active) continue;
    if (Math.abs(c.x - v.pos.x) > 8 || Math.abs(c.z - v.pos.z) > 8 || Math.abs(c.y + 0.8 - v.pos.y) > 2.5) continue;
    const fx = -Math.sin(c.hd), fz = -Math.cos(c.hd), rr2 = c.spec.W / 2, hl = c.spec.L / 2 - rr2;
    for (const cc of _ca) for (const o of [-hl, 0, hl]) {
      const ox = c.x + fx * o, oz = c.z + fz * o;
      const dx = cc.x - ox, dz = cc.z - oz, d = Math.hypot(dx, dz), m = r + rr2;
      if (d >= m || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, pen = m - d;
      v.pos.x += nx * pen * 0.7; v.pos.z += nz * pen * 0.7;
      c.off.x -= nx * pen * 0.3; c.off.z -= nz * pen * 0.3;
      const n = V3(nx, 0, nz);
      const cvx = fx * c.v, cvz = fz * c.v;
      const vn = (v.vel.x - cvx) * nx + (v.vel.z - cvz) * nz;
      if (vn < 0) {
        const mT = 1500, j = -(1.2) * vn / (1 / v.ph.mass + 1 / mT);
        v.applyImpulse(n.clone().multiplyScalar(j), V3(cc.x - nx * r, v.pos.y, cc.z - nz * r));
        c.offV.x -= nx * j / mT * 0.8; c.offV.z -= nz * j / mT * 0.8; c.yawOff += (Math.random() - 0.5) * clamp(-vn * 0.05, 0, 0.6);
        if (-vn > 2) { c.stun = 2.5; if (c.honkT <= 0) { c.honkT = 3; trafficHonk(c); } v.impact(-vn, V3(cc.x - nx * r, v.pos.y, cc.z - nz * r), n, { kind: 'traffic', car: c }); }
      }
    }
  }
}

// ---------------------------------------------------------------- road graph (for chase pathing)
const GRAPH = { nodes: [], adj: [] };
function buildGraph() {
  const N = []; const key = (x, z) => x + ',' + z; const map = {};
  for (const x of W.XL) for (const z of W.ZL) { map[key(x, z)] = N.length; N.push({ x, z }); }
  map['hw1'] = N.length; N.push({ x: W.HWY.x, z: -150 }); map['hw2'] = N.length; N.push({ x: W.HWY.x, z: -320 });
  map['hwS'] = N.length; N.push({ x: W.HWY.x, z: 150 }); map['hwS2'] = N.length; N.push({ x: W.HWY.x, z: 290 });
  map['ds'] = N.length; N.push({ x: -100, z: 110 });
  const A = N.map(() => []);
  const link = (a, b) => { A[a].push(b); A[b].push(a); };
  for (let i = 0; i < W.XL.length; i++) for (let j = 0; j < W.ZL.length; j++) {
    const a = map[key(W.XL[i], W.ZL[j])];
    if (i + 1 < W.XL.length) link(a, map[key(W.XL[i + 1], W.ZL[j])]);
    if (j + 1 < W.ZL.length) link(a, map[key(W.XL[i], W.ZL[j + 1])]);
  }
  link(map[key(120, -150)], map.hw1); link(map[key(120, -320)], map.hw2); link(map.hw1, map.hw2); link(map.hw1, map.hwS); link(map.hwS, map.hwS2);
  link(map[key(-100, 20)], map.ds);
  GRAPH.nodes = N; GRAPH.adj = A;
}
function nearestNode(x, z) { let b = 0, bd = 1e9; GRAPH.nodes.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }
function graphPath(a, b) {
  const prev = new Array(GRAPH.nodes.length).fill(-1), q = [a]; prev[a] = a;
  while (q.length) { const u = q.shift(); if (u === b) break; for (const w of GRAPH.adj[u]) if (prev[w] < 0) { prev[w] = u; q.push(w); } }
  if (prev[b] < 0) return [b];
  const out = []; let u = b; while (u !== a) { out.unshift(u); u = prev[u]; } return out;
}

// ---------------------------------------------------------------- AI driver
class AIDriver {
  constructor(v, mode, opt = {}) {
    this.v = v; this.mode = mode; this.opt = opt; this.skill = opt.skill ?? 0.9; this.lane = opt.lane ?? 0;
    this.hint = -1; this.errT = rr(6, 14); this.err = null; this.stuckT = 0; this.revT = 0; this.prog = 0; this.lap = 0;
    this.pathNodes = []; this.repath = 0; this.powerMul = 1; this.wob = rnd() * 10;
  }
  steerTo(tx, tz) {
    const v = this.v, f = v.forward(_v1);
    const dx = tx - v.pos.x, dz = tz - v.pos.z;
    const ang = Math.atan2(f.x * dz - f.z * dx, f.x * dx + f.z * dz); // + = target to the right
    return ang;
  }
  updateRace(dt, path) {
    const v = this.v, inp = v.input, sp = v.speed;
    const near = path.nearest(v.pos.x, v.pos.z, this.hint, 30); this.hint = near.i;
    let s = near.s;
    // progress (handles wrap)
    if (path.closed) { if (this.lastS == null) { this.lastS = s; if (s > path.len / 2) this.lap = -1; } const ds = s - this.lastS; if (ds < -path.len / 2) this.lap++; if (ds > path.len / 2) this.lap--; this.lastS = s; this.prog = this.lap * path.len + s; } else this.prog = s;
    const look = 7 + sp * 0.55;
    const tg = path.at(s + look);
    const off = this.lane + Math.sin(U.uTime.value * 0.3 + this.wob) * 1.2;
    const tx = tg.x - tg.dz * off, tz = tg.z + tg.dx * off;
    let ang = this.steerTo(tx, tz);
    // curvature ahead -> target speed
    let vmax = 1e9;
    for (let d = 12; d < 90; d += 12) {
      const a = path.at(s + d), b = path.at(s + d + 10);
      const turn = Math.abs(wrapAngle(Math.atan2(b.dx, b.dz) - Math.atan2(a.dx, a.dz)));
      const kappa = turn / 10 + 1e-4;
      const vs = Math.sqrt((v.onSand > 0.5 ? 5.5 : 9.0) * this.skill / kappa) + d * 0.18;
      vmax = Math.min(vmax, vs);
    }
    let thr = 1, brk = 0, hand = 0;
    if (sp > vmax + 3) { thr = 0; brk = clamp((sp - vmax) / 8, 0.2, 1); }
    else if (sp > vmax) thr = 0.3;
    if (Math.abs(ang) > 0.9 && sp > 12) { thr = 0.2; hand = 0.6; }
    // human error
    this.errT -= dt;
    if (this.errT < 0) { this.err = { t: rr(0.4, 1.1), kind: pick(['lift', 'wobble', 'late']) }; this.errT = rr(8, 20) * (0.6 + this.skill * 0.6); }
    if (this.err) { this.err.t -= dt; if (this.err.kind === 'lift') thr *= 0.2; if (this.err.kind === 'wobble') ang += Math.sin(U.uTime.value * 9) * 0.25; if (this.err.kind === 'late') { brk = 0; thr = 1; } if (this.err.t < 0) this.err = null; }
    inp.steer = clamp(ang * 2.2, -1, 1); inp.throttle = thr; inp.brake = brk; inp.hand = hand; inp.nitro = (Math.abs(ang) < 0.08 && sp > 20 && sp < vmax - 6 && this.skill > 0.85 && Math.random() < 0.5) ? 1 : 0;
    // stuck / off-track
    this.mvT = (this.mvT || 0) + dt; if (!this.mvP) this.mvP = v.pos.clone();
    if (this.mvT > 2.5) { this.stuckT = v.pos.distanceTo(this.mvP) < 3 ? 9 : 0; this.mvT = 0; this.mvP.copy(v.pos); }
    if (this.stuckT > 2.5 || near.d > 28) { const p = path.at(s); v.reset(V3(p.x, 0, p.z), Math.atan2(-p.dx, -p.dz)); v.vel.set(p.dx * 8, 0, p.dz * 8); this.stuckT = 0; }
  }
  updateChase(dt, target) {
    const v = this.v, inp = v.input, sp = v.speed;
    const tp = _v3.copy(target.pos).addScaledVector(target.vel, clamp(Math.hypot(target.pos.x - v.pos.x, target.pos.z - v.pos.z) / 40, 0, 1.2));
    let tx = tp.x, tz = tp.z;
    const los = losClear(v.pos.x, v.pos.z, target.pos.x, target.pos.z, v.pos.y - 0.1);
    this.repath -= dt;
    if (!los) {
      if (this.repath <= 0 || !this.pathNodes.length) { this.pathNodes = graphPath(nearestNode(v.pos.x, v.pos.z), nearestNode(target.pos.x, target.pos.z)); this.repath = 1.5; }
      while (this.pathNodes.length) { const n = GRAPH.nodes[this.pathNodes[0]]; if (Math.hypot(n.x - v.pos.x, n.z - v.pos.z) < 12) this.pathNodes.shift(); else { tx = n.x; tz = n.z; break; } }
    }
    let ang = this.steerTo(tx, tz);
    // whiskers
    const f = v.forward(V3());
    for (const [a, dist] of [[0.45, 9], [-0.45, 9], [0, 14]]) {
      const c = Math.cos(a), s = Math.sin(a), wx = f.x * c - f.z * s, wz = f.x * s + f.z * c;
      const px = v.pos.x + wx * dist, pz = v.pos.z + wz * dist;
      let blocked = false; collideCircle(px, pz, 1.2, v.pos.y - 0.4, v.pos.y + 1, () => { blocked = true; });
      if (blocked) ang += a === 0 ? (ang >= 0 ? 0.5 : -0.5) : -a * 1.3;
    }
    let thr = 1, brk = 0, hand = 0;
    if (Math.abs(ang) > 1.1 && sp > 8) { thr = 0.3; brk = 0.4; hand = 0.4; }
    const dT = Math.hypot(target.pos.x - v.pos.x, target.pos.z - v.pos.z);
    if (dT < 8 && target.speed < 4) { thr = 0.25; }
    if (this.revT > 0) { this.revT -= dt; inp.steer = -clamp(ang * 2, -1, 1); inp.throttle = 0; inp.brake = 1; inp.hand = 0; return; }
    inp.steer = clamp(ang * 2.4, -1, 1); inp.throttle = thr; inp.brake = brk; inp.hand = hand; inp.nitro = (dT > 50 && Math.abs(ang) < 0.1) ? 1 : 0;
    // displacement-based stuck detection (robust against jitter at walls)
    this.mvT = (this.mvT || 0) + dt; if (!this.mvP) this.mvP = v.pos.clone();
    if (this.mvT > 1.6) { const moved = v.pos.distanceTo(this.mvP); if (moved < 2.2 && thr > 0.5) { this.revT = 1.2; this.stuckCount = (this.stuckCount || 0) + 1; } else this.stuckCount = Math.max(0, (this.stuckCount || 0) - 0.25); this.mvT = 0; this.mvP.copy(v.pos); }
  }
}

// ---------------------------------------------------------------- ghost
class Ghost {
  constructor(scene, carId) {
    this.model = buildCarModel(carId, { beams: false });
    this.model.root.traverse(o => { if (o.material && o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.32; o.material.depthWrite = false; } });
    scene.add(this.model.root); this.frames = null; this.model.root.visible = false;
  }
  play(frames) { this.frames = frames; this.model.root.visible = !!frames && frames.length > 2; }
  update(t) {
    const F = this.frames; if (!F || F.length < 2) return;
    const i = clamp(Math.floor(t * 10), 0, F.length - 2), u = clamp(t * 10 - i, 0, 1), a = F[i], b = F[i + 1];
    this.model.root.position.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
    const hd = lerp(a[3], a[3] + wrapAngle(b[3] - a[3]), u);
    this.model.root.quaternion.setFromAxisAngle(_v1.set(0, 1, 0), hd);
    this.model.root.visible = t * 10 < F.length;
  }
  dispose(scene) { scene.remove(this.model.root); this.model.dispose(); }
}
