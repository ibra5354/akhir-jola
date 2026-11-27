// =====================================================================
//  WORLD DATA: layout, terrain heights, collision, surfaces
// =====================================================================
const W = {
  HALF: 350,
  XL: [-320, -210, -100, 10, 120],
  ZL: [-320, -235, -150, -65, 20],
  RB: { x: -100, z: -150, r: 25, island: 12.5 },        // roundabout
  HWY: { x: 200, w: 22, z0: -346, z1: 346 },          // highway
  BRIDGE: { z0: 138, z1: 202 },
  WADI_Z: 170,
  PLAZA: { x0: -314, x1: -216, z0: -59, z1: 14 },
  GAS: { x: 44, z: -22 },
  GARAGE: { x: -155, z: -14, door: { x: -155, z: -8 } },
  CAMP: { x: 30, z: 222 },
  BIGDUNE: { x: -205, z: 268, h: 23 },
  lamps: [],        // {x,y,z,r,g,b,i,range}
  shops: [],
  palms: [], poles: [], tlights: [], props: [],
  cupSpots: [], jumpSpots: [],
};
const roadHW = v => (v === -100 || v === -150) ? 8 : 6;

// ---------------------------------------------------------------- terrain
const TER = { N: 176, CELL: 4, ORG: -352, h: null };
function desertMask(x, z) {
  let m = Math.max(smooth(40, 95, z), smooth(218, 250, x));
  // keep highway corridor flat
  const hw = 1 - smooth(13, 30, Math.abs(x - W.HWY.x));
  m *= 1 - hw;
  // desert road leaving city
  if (z < 140) m *= lerp(1, smooth(90, 140, z), 1 - smooth(8, 24, Math.abs(x + 100)));
  // smoother sandy run-up toward the big dune
  const lane = (1 - smooth(10, 30, Math.abs(x - W.BIGDUNE.x))) * smooth(60, 85, z) * (1 - smooth(200, 225, z));
  m *= 1 - lane * 0.8;
  // graded desert tracks (rally lines are smoother)
  const td = trackDist(x, z);
  m *= 1 - 0.7 * (1 - smooth(7, 24, td));
  // camp flat
  const dc = Math.hypot(x - W.CAMP.x, z - W.CAMP.z); m *= smooth(16, 40, dc);
  return clamp(m, 0, 1);
}
let _trkSegs = null;
function trackDist(x, z) {
  if (!_trkSegs) {
    _trkSegs = [];
    for (const k of [2, 3]) { const T = TRACKS[k], P = T.pts; for (let i = 0; i < P.length - (T.closed ? 0 : 1); i++) { const a = P[i], b = P[(i + 1) % P.length]; _trkSegs.push([a[0], a[1], b[0], b[1]]); } }
  }
  let best = 1e9;
  for (const [ax, az, bx, bz] of _trkSegs) {
    if (x < Math.min(ax, bx) - 30 || x > Math.max(ax, bx) + 30 || z < Math.min(az, bz) - 30 || z > Math.max(az, bz) + 30) continue;
    const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
function rawHeight(x, z) {
  const m = desertMask(x, z);
  let h = 0;
  if (m > 0) {
    const u = x * 0.62 + z * 0.78, w = -x * 0.78 + z * 0.62;
    const warp = fbm(x * 0.006 + 3, z * 0.006 - 7, 3) * 5;
    const r = 0.5 + 0.5 * Math.sin(u * 0.05 + warp + Math.sin(w * 0.021) * 1.3);
    const depth = smooth(0, 140, Math.max(z - 45, x - 220));
    let dune = Math.pow(r, 2.4) * (3.5 + 7.5 * depth) + fbm(x * 0.025, z * 0.025, 3) * 3.2 * (0.4 + depth);
    h = dune * m;
  }
  // big dune (smooth massive)
  const bd = W.BIGDUNE;
  const e = Math.sqrt(((x - bd.x) / 62) ** 2 + ((z - bd.z) / 30) ** 2);
  h = Math.max(h, bd.h * (1 - smooth(0.12, 2.5, e)) * smooth(0, 0.1, m));
  // wadi under bridge
  if (x > 100) {
    const wz = W.WADI_Z + Math.sin(x * 0.02) * 6;
    const d = Math.abs(z - wz);
    const wadi = (1 - smooth(9, 24, d)) * smooth(100, 135, x) * 8.5;
    h -= wadi;
  }
  // world rim
  const edge = Math.max(Math.abs(x), z);
  if (z > 40 || x > 220) h += 34 * smooth(318, 352, edge) * (0.7 + 0.3 * fbm(x * 0.03, z * 0.03, 2));
  return h;
}
function buildTerrain() {
  const n = TER.N + 1; TER.h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = TER.ORG + i * TER.CELL, z = TER.ORG + j * TER.CELL;
    TER.h[j * n + i] = rawHeight(x, z);
  }
}
// exact height matching mesh triangulation: quad (i,j) split along diagonal (i,j)-(i+1,j+1)
const _tn = { x: 0, y: 1, z: 0 };
function terrainH(x, z, wantN) {
  const n = TER.N + 1, C = TER.CELL;
  let fx = (x - TER.ORG) / C, fz = (z - TER.ORG) / C;
  fx = clamp(fx, 0, TER.N - 0.0001); fz = clamp(fz, 0, TER.N - 0.0001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const h00 = TER.h[j * n + i], h10 = TER.h[j * n + i + 1], h01 = TER.h[(j + 1) * n + i], h11 = TER.h[(j + 1) * n + i + 1];
  let h;
  if (u >= v) { h = h00 + (h10 - h00) * u + (h11 - h10) * v; if (wantN) { _tn.x = -(h10 - h00) / C; _tn.z = -(h11 - h10) / C; } }
  else { h = h00 + (h11 - h01) * u + (h01 - h00) * v; if (wantN) { _tn.x = -(h11 - h01) / C; _tn.z = -(h01 - h00) / C; } }
  if (wantN) { _tn.y = 1; const l = Math.hypot(_tn.x, 1, _tn.z); _tn.x /= l; _tn.y /= l; _tn.z /= l; }
  return h;
}

// ---------------------------------------------------------------- surfaces raster (2m)
const SURF = { N: 360, ORG: -360, C: 2, a: null };
const S_DIRT = 0, S_ASPH = 1, S_SAND = 2, S_CONC = 3;
function surfFill(x0, z0, x1, z1, t) {
  const C = SURF.C;
  const i0 = Math.max(0, Math.floor((x0 - SURF.ORG) / C)), i1 = Math.min(SURF.N - 1, Math.floor((x1 - SURF.ORG) / C));
  const j0 = Math.max(0, Math.floor((z0 - SURF.ORG) / C)), j1 = Math.min(SURF.N - 1, Math.floor((z1 - SURF.ORG) / C));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) SURF.a[j * SURF.N + i] = t;
}
function surfAt(x, z) {
  const i = Math.floor((x - SURF.ORG) / SURF.C), j = Math.floor((z - SURF.ORG) / SURF.C);
  if (i < 0 || j < 0 || i >= SURF.N || j >= SURF.N) return S_SAND;
  return SURF.a[j * SURF.N + i];
}

// ---------------------------------------------------------------- collision grid
const COL = { C: 16, ORG: -368, N: 46, cells: null, boxes: [], circles: [] };
function colInit() { COL.cells = Array.from({ length: COL.N * COL.N }, () => []); }
function colCellsFor(x0, z0, x1, z1, f) {
  const C = COL.C;
  const i0 = clamp(Math.floor((x0 - COL.ORG) / C), 0, COL.N - 1), i1 = clamp(Math.floor((x1 - COL.ORG) / C), 0, COL.N - 1);
  const j0 = clamp(Math.floor((z0 - COL.ORG) / C), 0, COL.N - 1), j1 = clamp(Math.floor((z1 - COL.ORG) / C), 0, COL.N - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(COL.cells[j * COL.N + i]);
}
// box: axis aligned; optional ramp {ax:'x'|'z', h0,h1} top varies from min->max along ax
function addBox(x0, z0, x1, z1, y0, y1, opt = {}) {
  const b = { t: 0, x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, ramp: opt.ramp || null, surf: opt.surf ?? S_CONC, kind: opt.kind || 'wall', tag: opt.tag };
  COL.boxes.push(b); colCellsFor(b.x0, b.z0, b.x1, b.z1, c => c.push(b)); return b;
}
function addCircle(x, z, r, y0, y1, opt = {}) {
  const c = { t: 1, x, z, r, y0, y1, kind: opt.kind || 'solid', on: true, ref: opt.ref, surf: opt.surf ?? S_CONC };
  COL.circles.push(c); colCellsFor(x - r, z - r, x + r, z + r, cl => cl.push(c)); return c;
}
function boxTop(b, x, z) {
  if (!b.ramp) return b.y1;
  const r = b.ramp;
  const t = r.ax === 'x' ? (x - b.x0) / (b.x1 - b.x0) : (z - b.z0) / (b.z1 - b.z0);
  return lerp(r.h0, r.h1, clamp(t, 0, 1));
}
function cellAt(x, z) {
  const i = Math.floor((x - COL.ORG) / COL.C), j = Math.floor((z - COL.ORG) / COL.C);
  if (i < 0 || j < 0 || i >= COL.N || j >= COL.N) return null; return COL.cells[j * COL.N + i];
}
// ground query. returns object (reused)
const GQ = { h: 0, nx: 0, ny: 1, nz: 0, surf: 0 };
const TESTFLAG = { flat: false };
function groundAt(x, z, yRef = 1e9) {
  if (TESTFLAG.flat) { GQ.h = 0; GQ.nx = 0; GQ.ny = 1; GQ.nz = 0; GQ.surf = TESTFLAG.surf ?? S_ASPH; return GQ; }
  let h = terrainH(x, z, true);
  GQ.nx = _tn.x; GQ.ny = _tn.y; GQ.nz = _tn.z;
  GQ.surf = surfAt(x, z);
  const cell = cellAt(x, z);
  if (cell) for (let k = 0; k < cell.length; k++) {
    const o = cell[k];
    if (o.t !== 0) {
      if (o.kind === 'island' || !o.on) continue;
      if ((x - o.x) ** 2 + (z - o.z) ** 2 > o.r * o.r) continue;
      if (o.y1 <= yRef && o.y1 > h) { h = o.y1; GQ.nx = 0; GQ.ny = 1; GQ.nz = 0; GQ.surf = o.surf; }
      continue;
    }
    if (x < o.x0 || x > o.x1 || z < o.z0 || z > o.z1) continue;
    const top = boxTop(o, x, z);
    if (top <= yRef && top > h) {
      h = top; GQ.surf = o.surf;
      if (o.ramp) {
        const r = o.ramp, len = r.ax === 'x' ? (o.x1 - o.x0) : (o.z1 - o.z0), s2 = (r.h1 - r.h0) / len, l = Math.hypot(s2, 1);
        if (r.ax === 'x') { GQ.nx = -s2 / l; GQ.ny = 1 / l; GQ.nz = 0; } else { GQ.nx = 0; GQ.ny = 1 / l; GQ.nz = -s2 / l; }
      } else { GQ.nx = 0; GQ.ny = 1; GQ.nz = 0; }
    }
  }
  GQ.h = h;
  return GQ;
}
// horizontal collision of a circle (car part) at height range [yb, yt]
// returns push (px,pz) and normal; calls cb for each contact
const STEP_H = 0.55;
function collideCircle(x, z, r, yb, yt, cb) {
  if (TESTFLAG.flat) return;
  const cell = cellAt(x, z); if (!cell) return;
  for (let k = 0; k < cell.length; k++) {
    const o = cell[k];
    if (o.t === 1) {
      if (!o.on) continue;
      if (yt < o.y0 || yb + STEP_H > o.y1) continue;
      const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), m = r + o.r;
      if (d < m && d > 1e-6) cb(dx / d, dz / d, m - d, o);
      continue;
    }
    if (yt < o.y0) continue;
    const cx = clamp(x, o.x0, o.x1), cz = clamp(z, o.z0, o.z1);
    const top = boxTop(o, cx, cz);
    if (yb + STEP_H > top) continue;
    let dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d < 1e-5) { // center inside box: push out along smallest axis
      const l = x - o.x0, rgt = o.x1 - x, f = z - o.z0, bk = o.z1 - z, mn = Math.min(l, rgt, f, bk);
      if (mn === l) cb(-1, 0, l + r, o); else if (mn === rgt) cb(1, 0, rgt + r, o); else if (mn === f) cb(0, -1, f + r, o); else cb(0, 1, bk + r, o);
    } else cb(dx / d, dz / d, r - d, o);
  }
}
// line of sight test on XZ at height y (used by police)
function losClear(ax, az, bx, bz, y = 1.2) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 6);
  for (let s = 1; s < n; s++) {
    const t = s / n, x = lerp(ax, bx, t), z = lerp(az, bz, t);
    const cell = cellAt(x, z); if (!cell) continue;
    for (const o of cell) if (o.t === 0 && (o.kind === 'bldg' || o.kind === 'wall' || o.kind === 'barrier' || o.kind === 'step' || o.kind === 'bound') && x > o.x0 - 0.5 && x < o.x1 + 0.5 && z > o.z0 - 0.5 && z < o.z1 + 0.5 && o.y1 > y) return false;
    if (terrainH(x, z) > y + 2.5) return false;
  }
  return true;
}
