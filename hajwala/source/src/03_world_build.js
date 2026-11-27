// =====================================================================
//  WORLD BUILD: plan layout -> lamps -> bake -> meshes
// =====================================================================
const WORLD = { group: new THREE.Group(), meshes: {}, dyn: {}, roads: [], blocks: [], buildings: [], nodes: [], rampList: [], alleys: [], villas: [] };
const C_ASPH = col('#2a2b31'), C_ASPH2 = col('#303139'), C_LINE = col('#e8e2d0'), C_YEL = col('#e8b830'), C_CURB = col('#9a958c'), C_SIDE = col('#6f6a62'), C_CONC = col('#86807a'), C_DARK = col('#1a1b20');
const C_SAND = col('#d6aa70');
const BLD_COLS = ['#ddc9a6', '#e9e4d8', '#d3cbc0', '#cfa982', '#dcbcae', '#c7c2b4', '#e3d6bd', '#bfae94'].map(col);

function planWorld() {
  const XL = W.XL, ZL = W.ZL;
  // ----- road segments (rendering + surface + lamps)
  const segs = []; // {ax:'x' (runs along x) or 'z', c: fixed coord, a0, a1, hw, kind}
  const cutAt = (line, cross, crossHW) => (line === -100 && cross === -150) || (line === -150 && cross === -100) ? W.RB.r + 1 : crossHW;
  for (const x of XL) { // vertical roads (along z)
    const hw = roadHW(x); let zs = [...ZL];
    for (let k = 0; k < zs.length - 1; k++) {
      const a = zs[k] + cutAt(x, zs[k], roadHW(zs[k])), b = zs[k + 1] - cutAt(x, zs[k + 1], roadHW(zs[k + 1]));
      segs.push({ ax: 'z', c: x, a0: a, a1: b, hw, kind: 'city' });
    }
  }
  for (const z of ZL) {
    const hw = roadHW(z);
    for (let k = 0; k < XL.length - 1; k++) {
      const a = XL[k] + cutAt(z, XL[k], roadHW(XL[k])), b = XL[k + 1] - cutAt(z, XL[k + 1], roadHW(XL[k + 1]));
      segs.push({ ax: 'x', c: z, a0: a, a1: b, hw, kind: 'city' });
    }
  }
  // stubs to outer edges & connectors
  segs.push({ ax: 'x', c: -150, a0: 120 + 6, a1: W.HWY.x - W.HWY.w / 2, hw: 8, kind: 'conn' });
  segs.push({ ax: 'x', c: -320, a0: 120 + 6, a1: W.HWY.x - W.HWY.w / 2, hw: 6, kind: 'conn' });
  segs.push({ ax: 'z', c: -100, a0: 20 + 6, a1: 122, hw: 6, kind: 'desert' });
  segs.push({ ax: 'z', c: W.HWY.x, a0: W.HWY.z0, a1: 312, hw: W.HWY.w / 2, kind: 'hwy' });
  WORLD.roads = segs;
  // intersections (square patches)
  WORLD.inters = [];
  for (const x of XL) for (const z of ZL) { if (x === -100 && z === -150) continue; WORLD.inters.push({ x, z, hx: roadHW(x), hz: roadHW(z) }); }
  WORLD.inters.push({ x: W.HWY.x, z: -150, hx: W.HWY.w / 2, hz: 8, hwy: true }, { x: W.HWY.x, z: -320, hx: W.HWY.w / 2, hz: 6, hwy: true });

  // ----- surfaces raster
  SURF.a = new Uint8Array(SURF.N * SURF.N);
  for (let j = 0; j < SURF.N; j++) for (let i = 0; i < SURF.N; i++) {
    const x = SURF.ORG + (i + 0.5) * SURF.C, z = SURF.ORG + (j + 0.5) * SURF.C;
    SURF.a[j * SURF.N + i] = desertMask(x, z) > 0.2 || (z > 34 && Math.abs(x - W.HWY.x) > 12) || x > 213 ? S_SAND : S_DIRT;
  }
  for (const s of segs) { if (s.ax === 'z') surfFill(s.c - s.hw, s.a0, s.c + s.hw, s.a1, S_ASPH); else surfFill(s.a0, s.c - s.hw, s.a1, s.c + s.hw, S_ASPH); }
  for (const it of WORLD.inters) surfFill(it.x - it.hx, it.z - it.hz, it.x + it.hx, it.z + it.hz, S_ASPH);
  surfFill(W.RB.x - 27, W.RB.z - 27, W.RB.x + 27, W.RB.z + 27, S_ASPH);
  surfFill(W.PLAZA.x0, W.PLAZA.z0, W.PLAZA.x1, W.PLAZA.z1, S_ASPH);

  // ----- lamps along roads
  const lampPos = [];
  for (const s of segs) {
    if (s.kind === 'hwy') {
      for (let a = s.a0 + 10; a < s.a1; a += 38) if (Math.abs(a + 148) > 16 && Math.abs(a + 320) > 10 && Math.abs(a - 92) > 16) lampPos.push({ x: s.c, z: a, dir: 0, hwy: true });
      continue;
    }
    const len = s.a1 - s.a0; if (len < 14) continue;
    const n = Math.max(1, Math.round(len / 30));
    for (let k = 0; k < n; k++) {
      const a = s.a0 + (k + 0.5) * len / n;
      const side = (k % 2 ? 1 : -1), off = s.hw + 1.0;
      if (s.ax === 'z') lampPos.push({ x: s.c + side * off, z: a, ry: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
      else lampPos.push({ x: a, z: s.c + side * off, ry: side > 0 ? 0 : Math.PI });
    }
  }
  W.poles = lampPos;
  for (const L of lampPos) {
    if (L.hwy) { for (const sd of [-1, 1]) W.lamps.push({ x: L.x + sd * 3, y: 10, z: L.z, r: 1.0, g: 0.62, b: 0.28, i: 1.15, r0: 9, range: 30 }); }
    else { const hx = L.x + Math.cos(L.ry ?? 0) * 0 - Math.sin(L.ry) * 0; const dx = -Math.sin(L.ry) * 2.2, dz = -Math.cos(L.ry) * 2.2; L.hx = L.x + dx; L.hz = L.z + dz; W.lamps.push({ x: L.hx, y: 8.6, z: L.hz, r: 1.0, g: 0.6, b: 0.26, i: 1.25, r0: 8.5, range: 28 }); }
  }
  // roundabout lights (ring of lamps)
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; W.lamps.push({ x: W.RB.x + Math.cos(a) * 11, y: 6, z: W.RB.z + Math.sin(a) * 11, r: 1, g: 0.75, b: 0.45, i: 0.9, r0: 8, range: 24 }); }
  W.lamps.push({ x: W.RB.x, y: 4, z: W.RB.z, r: 1, g: 0.85, b: 0.55, i: 2.0, r0: 8, range: 22, monument: true });
  // plaza masts
  const P = W.PLAZA;
  W.masts = [[P.x0 + 6, P.z0 + 6], [P.x1 - 6, P.z0 + 6], [P.x0 + 6, P.z1 - 6], [P.x1 - 6, P.z1 - 6], [(P.x0 + P.x1) / 2, P.z1 - 3]];
  for (const [x, z] of W.masts) W.lamps.push({ x, y: 16, z, r: 1.0, g: 0.82, b: 0.6, i: 1.5, r0: 16, range: 55 });
  // gas station canopy
  W.lamps.push({ x: W.GAS.x - 7, y: 5, z: W.GAS.z, r: 0.85, g: 0.95, b: 1.0, i: 1.6, r0: 7, range: 24 }, { x: W.GAS.x + 7, y: 5, z: W.GAS.z, r: 0.85, g: 0.95, b: 1.0, i: 1.6, r0: 7, range: 24 });
  // garage door glow
  W.lamps.push({ x: W.GARAGE.door.x, y: 3, z: W.GARAGE.door.z - 2, r: 1, g: 0.5, b: 0.15, i: 1.4, r0: 7, range: 22 });
  // campfire
  const cy = terrainH(W.CAMP.x, W.CAMP.z);
  W.lamps.push({ x: W.CAMP.x, y: cy + 1.2, z: W.CAMP.z, r: 1, g: 0.5, b: 0.18, i: 2.6, r0: 6, range: 30, fire: true });
  W.lamps.push({ x: W.CAMP.x - 1, y: cy + 1.6, z: W.CAMP.z - 6, r: 1, g: 0.62, b: 0.3, i: 1.2, r0: 4, range: 14 });
}

// -------------------------------------------------------------------------------------------------
function buildWorld(scene) {
  rnd = mulberry(2024);
  buildTerrain(); colInit(); planWorld(); lampGridBuild();
  const G = { st: new Geo(), road: new Geo(), fac: new Geo(), sign: new Geo() };
  buildTerrainMesh(scene);
  buildRoads(G.road);
  buildBlocks(G);
  buildPlaza(G); buildGas(G); buildGarage(G); buildRoundabout(G); buildHighway(G); buildCamp(G); buildRamps(G); buildBounds();
  const mSt = new THREE.Mesh(G.st.build(), worldMat({ roughness: 0.9 }));
  const mRoad = new THREE.Mesh(G.road.build(), worldMat({ roughness: 0.78, map: TEX.asph }));
  const mFac = new THREE.Mesh(G.fac.build(), worldMat({ map: TEX.win, emissiveMap: TEX.winEm, emissive: col('#ffffff'), emissiveIntensity: 1.25, roughness: 0.7 }));
  const sg = G.sign.build(false);
  const mSign = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: TEX.signs, toneMapped: false, color: col('#ffffff') }));
  for (const m of [mSt, mRoad, mFac]) { m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); }
  mSign.matrixAutoUpdate = false;
  mRoad.renderOrder = 0;
  scene.add(mSt, mRoad, mFac, mSign);
  Object.assign(WORLD.meshes, { st: mSt, road: mRoad, fac: mFac, sign: mSign });
  buildPoles(scene); buildPalms(scene); buildTrafficLights(scene); buildCrowd(scene); buildStaticGlows(scene);
}

// ---------------------------------------------------------------- terrain mesh
function buildTerrainMesh(scene) {
  const n = TER.N + 1, C = TER.CELL, g = new Geo();
  const pos = new Float32Array(n * n * 3), colA = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
  const cSand = col('#d9ad72'), cSand2 = col('#b98b55'), cSand3 = col('#ecc58e'), cCity = col('#5a544c'), cWadi = col('#9c7a52');
  const tmp = new THREE.Color();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = TER.ORG + i * C, z = TER.ORG + j * C, h = TER.h[j * n + i], k = j * n + i;
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const m = Math.max(desertMask(x, z), (z > 30 || x > 213) ? 1 : 0);
    const hn = clamp(h / 14, 0, 1), nz = fbm(x * 0.05, z * 0.05, 2);
    tmp.copy(cSand2).lerp(cSand, clamp(0.35 + hn * 0.9 + (nz - 0.5) * 0.6, 0, 1)).lerp(cSand3, clamp((hn - 0.6) * 1.2, 0, 0.6));
    if (h < -2) tmp.lerp(cWadi, clamp((-h - 2) / 5, 0, 0.8));
    tmp.lerp(cCity, 1 - smooth(0.0, 0.6, m));
    colA[k * 3] = tmp.r; colA[k * 3 + 1] = tmp.g; colA[k * 3 + 2] = tmp.b;
    uv[k * 2] = x / 7; uv[k * 2 + 1] = z / 7;
  }
  const idx = [];
  for (let j = 0; j < TER.N; j++) for (let i = 0; i < TER.N; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    // match terrainH: triangles (a,b,d) [u>=v] and (a,d,c)
    idx.push(a, d, b, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  geo.setAttribute('emv', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  bakeLighting(geo);
  const m = new THREE.Mesh(geo, worldMat({ map: TEX.sand, roughness: 1 }));
  m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
  scene.add(m); WORLD.meshes.terrain = m;
}

// ---------------------------------------------------------------- roads
function buildRoads(g) {
  const Y = 0.03;
  const flat = (x0, z0, x1, z1, c, y = Y, sub = 5) => g.rect([x0, y, z1], [x1 - x0, 0, 0], [0, 0, z0 - z1], c, { su: Math.max(1, Math.round((x1 - x0) / sub)), sv: Math.max(1, Math.round((z1 - z0) / sub)), uv: (s, t) => [(x0 + s * (x1 - x0)) / 9, (z1 + t * (z0 - z1)) / 9] });
  for (const s of WORLD.roads) {
    const { c, a0, a1, hw } = s; if (a1 - a0 < 0.5) continue;
    const ac = s.kind === 'desert' ? C_ASPH2 : C_ASPH;
    if (s.ax === 'z') flat(c - hw, a0, c + hw, a1, ac); else flat(a0, c - hw, a1, c + hw, ac);
    // markings
    const L = Y + 0.012;
    const dash = (p0, p1, off, w, colr) => { if (s.ax === 'z') flat(c + off - w / 2, p0, c + off + w / 2, p1, colr, L, 50); else flat(p0, c + off - w / 2, p1, c + off + w / 2, colr, L, 50); };
    if (s.kind === 'hwy') {
      for (const sd of [-1, 1]) {
        dash(a0, a1, sd * (hw - 0.6), 0.22, C_LINE);
        for (let a = a0; a < a1 - 6; a += 14) dash(a, a + 6, sd * 5.2, 0.18, C_LINE);
        dash(a0, a1, sd * 1.0, 0.18, C_YEL);
      }
    } else {
      if (hw >= 8) { dash(a0, a1, -0.25, 0.14, C_YEL); dash(a0, a1, 0.25, 0.14, C_YEL); for (const sd of [-1, 1]) for (let a = a0 + 2; a < a1 - 5; a += 11) dash(a, a + 5, sd * 4, 0.14, C_LINE); }
      else for (let a = a0 + 2; a < a1 - 4; a += 9) dash(a, a + 4, 0, 0.14, C_LINE);
      for (const sd of [-1, 1]) dash(a0, a1, sd * (hw - 0.35), 0.12, colMul(C_LINE, 0.7));
      // crosswalk stripes near ends
      if (s.kind === 'city') for (const end of [a0 + 1.6, a1 - 4.6]) for (let k = -hw + 1; k < hw - 1; k += 1.6) {
        if (s.ax === 'z') flat(c + k, end, c + k + 0.8, end + 3, C_LINE, L, 50); else flat(end, c + k, end + 3, c + k + 0.8, C_LINE, L, 50);
      }
    }
  }
  for (const it of WORLD.inters) flat(it.x - it.hx, it.z - it.hz, it.x + it.hx, it.z + it.hz, C_ASPH);
  // roundabout square + ring
  const R = W.RB; flat(R.x - 27, R.z - 27, R.x + 27, R.z + 27, C_ASPH, Y - 0.005, 4);
  for (let k = 0; k < 48; k += 2) { // dashed ring line
    const a0 = k / 48 * TAU, a1 = (k + 1) / 48 * TAU, r0 = 18.6, r1 = 18.8;
    const P = (a, r) => [R.x + Math.cos(a) * r, Y + 0.012, R.z + Math.sin(a) * r];
    const A = P(a0, r0), B = P(a1, r0), Cc = P(a1, r1), D = P(a0, r1);
    for (const p of [A, Cc, B, A, D, Cc]) g.v(p[0], p[1], p[2], 0, 1, 0, C_LINE);
  }
}

// ---------------------------------------------------------------- blocks & buildings
function blockRect(i, j) {
  const XL = W.XL, ZL = W.ZL;
  return { x0: XL[i] + roadHW(XL[i]), x1: XL[i + 1] - roadHW(XL[i + 1]), z0: ZL[j] + roadHW(ZL[j]), z1: ZL[j + 1] - roadHW(ZL[j + 1]) };
}
function slab(G, x0, z0, x1, z1, opt = {}) {
  const h = 0.16;
  addBox(x0, z0, x1, z1, -1, h, { kind: 'slab', surf: S_CONC });
  G.st.box((x0 + x1) / 2, -0.2, (z0 + z1) / 2, x1 - x0, h + 0.2, z1 - z0, C_CURB, { top: opt.top || C_SIDE, sub: 6 });
  surfFill(x0, z0, x1, z1, S_CONC);
}
function buildBlocks(G) {
  const special = { '0,3': 'plaza', '1,3': 'garage', '3,3': 'gas' };
  let shopK = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const key = i + ',' + j, b = blockRect(i, j);
    WORLD.blocks.push({ ...b, i, j, kind: special[key] || 'city' });
    if (special[key]) continue;
    // roundabout corner cut
    const near = (Math.abs(b.x0 - W.RB.x) < 12 || Math.abs(b.x1 - W.RB.x) < 12) && (Math.abs(b.z0 - W.RB.z) < 12 || Math.abs(b.z1 - W.RB.z) < 12);
    let pieces = [b];
    if (near) {
      const cx = Math.abs(b.x0 - W.RB.x) < 12 ? 'x0' : 'x1', cz = Math.abs(b.z0 - W.RB.z) < 12 ? 'z0' : 'z1';
      const cut = 30; // square cut from corner near roundabout
      const xc = cx === 'x0' ? W.RB.x + cut : W.RB.x - cut, zc = cz === 'z0' ? W.RB.z + cut : W.RB.z - cut;
      if (cx === 'x0') pieces = [{ x0: xc, x1: b.x1, z0: b.z0, z1: b.z1 }, cz === 'z0' ? { x0: b.x0, x1: xc, z0: zc, z1: b.z1 } : { x0: b.x0, x1: xc, z0: b.z0, z1: zc }];
      else pieces = [{ x0: b.x0, x1: xc, z0: b.z0, z1: b.z1 }, cz === 'z0' ? { x0: xc, x1: b.x1, z0: zc, z1: b.z1 } : { x0: xc, x1: b.x1, z0: b.z0, z1: zc }];
      // corner plaza with palms
      const px0 = Math.min(b[cx], xc), px1 = Math.max(b[cx], xc), pz0 = Math.min(b[cz], zc), pz1 = Math.max(b[cz], zc);
      const ccx = cx === 'x0' ? px0 : px1, ccz = cz === 'z0' ? pz0 : pz1;
      // small planted corner (low, drivable flat paving)
      G.st.box((px0 + px1) / 2, -0.15, (pz0 + pz1) / 2, px1 - px0, 0.17, pz1 - pz0, C_CURB, { top: col('#77705f'), sub: 6 });
      addBox(px0, pz0, px1, pz1, -1, 0.02, { kind: 'slab', surf: S_CONC });
      W.palms.push({ x: lerp(px0, px1, 0.5), z: lerp(pz0, pz1, 0.5), s: 1.1 });
    }
    for (const p of pieces) { slab(G, p.x0, p.z0, p.x1, p.z1); fillLots(G, p, () => shopK++, i, j); }
  }
  // outer boundary rows (tall)
  const ring = [];
  for (let x = -346; x < 126; x += 26) ring.push({ x0: x, x1: Math.min(x + 24, 126), z0: -350, z1: -327 });
  for (let z = -326; z < 28; z += 26) ring.push({ x0: -350, x1: -327, z0: z, z1: Math.min(z + 24, 28) });
  for (const r of ring) { const H = rr(16, 40); addBuilding(G, r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1, Math.round(H / 3.4), { tall: true, plainGround: true }); }
  // east warehouses between city and highway
  const east = [{ x0: 128, x1: 186, z0: -314, z1: -158 }, { x0: 128, x1: 186, z0: -142, z1: 14 }, { x0: 128, x1: 186, z0: -346, z1: -327 }];
  for (const e of east) slab(G, e.x0, e.z0, e.x1, e.z1, { top: col('#5e5a52') });
  // warehouse rows
  const wh = (x0, z0, x1, z1, H, c) => { addBox(x0, z0, x1, z1, 0, H, { kind: 'bldg' }); G.st.box((x0 + x1) / 2, 0.16, (z0 + z1) / 2, x1 - x0, H - 0.16, z1 - z0, c, { sub: 5, top: colMul(c, 0.8) }); /* roof ribs */ for (let k = x0 + 2; k < x1 - 1; k += 3) G.st.box(k, H, (z0 + z1) / 2, 0.3, 0.25, z1 - z0 - 0.4, colMul(c, 0.7), {}); };
  wh(134, -300, 180, -262, 9, col('#8f9aa3')); wh(134, -250, 160, -170, 7, col('#a7a49a')); wh(164, -250, 182, -200, 6, col('#7f8c84'));
  // the rooftop warehouse with access ramp
  wh(140, -64, 178, -24, 7, col('#9a8f80'));
  const rp = addBox(152, -24, 166, 14, 0, 7.15, { kind: 'ramp', surf: S_CONC, ramp: { ax: 'z', h0: 7.15, h1: 0.1 } });
  WORLD.rampList.push({ b: rp, color: col('#77706a'), stripes: true, id: 'roof' });
  wh(134, -130, 150, -80, 5, col('#b0a690')); wh(166, -136, 184, -84, 8, col('#88857c'));
  addBuilding(G, 132, -16, 150, 10, 3, { shopFace: 'z1', shopK: 14 });
  W.cupSpots.push({ x: 159, y: 8.3, z: -46, hint: 'سطح' });
  // north strip east
  wh(130, -344, 184, -330, 12, col('#7b7f86'));
}
function fillLots(G, b, nextShop, bi, bj) {
  // lot area inset by sidewalk
  const s = 3.2, L = { x0: b.x0 + s, x1: b.x1 - s, z0: b.z0 + s, z1: b.z1 - s };
  const parts = [];
  const split = (r, depth) => {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    if ((w < 34 && d < 34) || depth > 3) { parts.push(r); return; }
    const alley = rnd() < 0.35 ? rr(5, 7) : 0;
    if (w > d) { const m = r.x0 + w * rr(0.38, 0.62); split({ ...r, x1: m - alley / 2 }, depth + 1); split({ ...r, x0: m + alley / 2 }, depth + 1); if (alley) WORLD.alleys.push({ x: m, z: (r.z0 + r.z1) / 2, ax: 'z', len: d }); }
    else { const m = r.z0 + d * rr(0.38, 0.62); split({ ...r, z1: m - alley / 2 }, depth + 1); split({ ...r, z0: m + alley / 2 }, depth + 1); if (alley) WORLD.alleys.push({ x: (r.x0 + r.x1) / 2, z: m, ax: 'x', len: w }); }
  };
  split(L, 0);
  const mainAdj = (r) => {
    // which faces touch the block edge (road side)
    const f = [];
    if (Math.abs(r.x0 - L.x0) < 0.5) f.push('x0'); if (Math.abs(r.x1 - L.x1) < 0.5) f.push('x1');
    if (Math.abs(r.z0 - L.z0) < 0.5) f.push('z0'); if (Math.abs(r.z1 - L.z1) < 0.5) f.push('z1');
    return f;
  };
  let mosqueDone = WORLD._mosque;
  for (const r of parts) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0, faces = mainAdj(r);
    const centerDist = Math.hypot((r.x0 + r.x1) / 2 - W.RB.x, (r.z0 + r.z1) / 2 - W.RB.z);
    const roll = rnd();
    if (!mosqueDone && w > 20 && d > 20 && bi === 3 && bj === 1) { buildMosque(G, r); mosqueDone = WORLD._mosque = true; continue; }
    if (roll < 0.08) { // empty sandy lot / parking
      G.st.box((r.x0 + r.x1) / 2, 0.16, (r.z0 + r.z1) / 2, w - 1, 0.02, d - 1, col('#4b463f'), { sub: 6, noSides: true });
      if (rnd() < 0.6) W.props.push({ type: 'cartons', x: r.x0 + 3, z: r.z0 + 3 });
      continue;
    }
    if (roll < 0.30 && centerDist > 90) { addVilla(G, r); continue; }
    const tall = centerDist < 120 && rnd() < 0.5;
    const floors = tall ? ri(7, 13) : ri(3, 6);
    const inset = rr(1.2, 2.5);
    const shopFace = faces.length ? faces[Math.floor(rnd() * faces.length)] : null;
    addBuilding(G, r.x0 + inset, r.z0 + inset, r.x1 - inset, r.z1 - inset, floors, { tall, shopFace, shopK: shopFace ? nextShop() % 15 : -1 });
    if (rnd() < 0.35) W.props.push({ type: 'cartons', x: r.x0 + 1.2, z: (r.z0 + r.z1) / 2 });
  }
}
function addBuilding(G, x0, z0, x1, z1, floors, opt = {}) {
  const w = x1 - x0, d = z1 - z0, GF = 4.2, FH = 3.4, H = GF + (floors - 1) * FH;
  const c = pick(BLD_COLS), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, base = 0.16;
  addBox(x0, z0, x1, z1, 0, H + base, { kind: 'bldg' });
  WORLD.buildings.push({ x0, z0, x1, z1, h: H + base });
  // ground floor band (plain + optional shopfront)
  G.st.box(cx, base, cz, w, GF, d, colMul(c, 0.82), { sub: 4, top: false });
  // upper facade (textured windows): four faces
  const uo = Math.floor(rnd() * 16) / 16, vo = Math.floor(rnd() * 32) / 32;
  const fh = H - GF;
  if (fh > 0.5) {
    const uvf = (len) => (s, t) => [uo + s * len / 3.0 / 16, vo + t * fh / FH / 32];
    G.fac.box(cx, base + GF, cz, w, fh, d, c, { sub: 3.4, top: false, uvf: (len) => uvf(len) });
  }
  // roof
  const roofY = base + H;
  G.st.box(cx, roofY - 0.02, cz, w, 0.04, d, colMul(c, 0.6), { noSides: true, sub: 8 });
  // parapet
  const pc = colMul(c, 0.92), ph = 0.9;
  G.st.box(cx, roofY, z0 + 0.15, w, ph, 0.3, pc, {}); G.st.box(cx, roofY, z1 - 0.15, w, ph, 0.3, pc, {});
  G.st.box(x0 + 0.15, roofY, cz, 0.3, ph, d - 0.6, pc, {}); G.st.box(x1 - 0.15, roofY, cz, 0.3, ph, d - 0.6, pc, {});
  // roof clutter: water tanks, AC units, dish
  const nT = ri(1, 3);
  for (let k = 0; k < nT; k++) G.st.cyl(rr(x0 + 2, x1 - 2), roofY, rr(z0 + 2, z1 - 2), 0.7, 0.7, 1.4, 8, col('#e8e8e8'), { capCol: col('#cfd3d6') });
  for (let k = 0; k < ri(2, 5); k++) G.st.box(rr(x0 + 1.5, x1 - 1.5), roofY, rr(z0 + 1.5, z1 - 1.5), 1.1, 0.8, 0.8, col('#9aa0a4'), {});
  if (rnd() < 0.5) G.st.cyl(rr(x0 + 2, x1 - 2), roofY + 0.5, rr(z0 + 2, z1 - 2), 0.05, 0.6, 0.15, 8, col('#ddd'), {});
  // LED crown strip on tall ones
  if (opt.tall && floors >= 7 && rnd() < 0.7) {
    const ec = pick([col('#3ad6ff'), col('#ff4fc8'), col('#ffb23a'), col('#8a6bff'), col('#4dffb0')]);
    const em = colMul(ec, 2.2), y = roofY + ph - 0.1;
    G.st.box(cx, y, z0 - 0.02, w, 0.14, 0.06, ec, { em }); G.st.box(cx, y, z1 + 0.02, w, 0.14, 0.06, ec, { em });
    G.st.box(x0 - 0.02, y, cz, 0.06, 0.14, d, ec, { em }); G.st.box(x1 + 0.02, y, cz, 0.06, 0.14, d, ec, { em });
    if (rnd() < 0.5) for (const xx of [x0, x1]) for (const zz of [z0, z1]) G.st.box(xx, base + GF, zz, 0.08, H - GF, 0.08, ec, { em: colMul(ec, 1.4) });
  }
  // shopfront + sign
  if (opt.shopFace && opt.shopK >= 0) {
    const f = opt.shopFace, glass = col('#2a2418'), glow = col('#ffe2b0');
    const em = colMul(glow, 0.5), sy = base + 0.5, sh = 2.8;
    const along = (f === 'x0' || f === 'x1') ? d : w;
    const sw = Math.min(along - 3, 14);
    let nx = 0, nz = 0, px = cx, pz = cz;
    if (f === 'x0') { nx = -1; px = x0 - 0.06; } if (f === 'x1') { nx = 1; px = x1 + 0.06; }
    if (f === 'z0') { nz = -1; pz = z0 - 0.06; } if (f === 'z1') { nz = 1; pz = z1 + 0.06; }
    if (nx) G.st.box(px, sy, pz, 0.1, sh, sw, glass, { em }); else G.st.box(px, sy, pz, sw, sh, 0.1, glass, { em });
    const fr = col('#2a2a2e'), nm = Math.max(2, Math.round(sw / 2.4));
    for (let q = 0; q <= nm; q++) { const o = -sw / 2 + q * sw / nm; if (nx) G.st.box(px + nx * 0.04, sy, pz + o, 0.06, sh, 0.12, fr, {}); else G.st.box(px + o, sy, pz + nz * 0.04, 0.12, sh, 0.06, fr, {}); }
    if (nx) G.st.box(px + nx * 0.04, sy, pz, 0.06, 0.7, sw, col('#3a3530'), {}); else G.st.box(px, sy, pz + nz * 0.04, sw, 0.7, 0.06, col('#3a3530'), {});
    // awning
    const aw = col(pick(['#b83a2a', '#2a6eb8', '#2f8f5a', '#c9952a']));
    if (nx) G.st.box(px + nx * 0.9, sy + sh + 0.1, pz, 1.8, 0.12, sw + 0.6, aw, {}); else G.st.box(px, sy + sh + 0.1, pz + nz * 0.9, sw + 0.6, 0.12, 1.8, aw, {});
    // sign board above awning (atlas)
    const sk = opt.shopK, uv = signUV(sk), sW = Math.min(sw, 9), sH = sW * 160 / 512, sY = sy + sh + 0.45;
    addSignQuad(G.sign, px + nx * 0.12, sY, pz + nz * 0.12, nx, nz, sW, sH, uv);
    W.shops.push({ x: px + nx * 4, z: pz + nz * 4, k: sk, name: SIGN_NAMES[sk][0], nx, nz });
    W.lamps.length; // (sign glows are not baked to keep bake cheap)
  }
}
function addSignQuad(g, x, y, z, nx, nz, w, h, uv) {
  // facing (nx,nz). right vector = (-nz, nx) ... for rtl text reading left->right in texture we map u0..u1 across
  const rx = nz, rz = -nx; // so that looking at the sign (from +n), texture u increases to viewer's right
  const hw = w / 2;
  const A = [x - rx * hw, y, z - rz * hw], B = [x + rx * hw, y, z + rz * hw], C = [x + rx * hw, y + h, z + rz * hw], D = [x - rx * hw, y + h, z - rz * hw];
  const white = col('#ffffff');
  const tri = (p, u, v) => g.v(p[0], p[1], p[2], nx, 0, nz, white, u, v);
  // flip winding depending on facing so front faces viewer
  tri(A, uv.u0, uv.v0); tri(B, uv.u1, uv.v0); tri(C, uv.u1, uv.v1);
  tri(A, uv.u0, uv.v0); tri(C, uv.u1, uv.v1); tri(D, uv.u0, uv.v1);
}
function addVilla(G, r) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  // boundary wall
  const wc = col(pick(['#d8c7a8', '#e6dccb', '#cdb89a'])), wh = 2.6, t = 0.35;
  const gateSide = rnd() < 0.5 ? 'z0' : 'x0';
  const seg = (x0, z0, x1, z1) => { if (x1 - x0 < 0.2 && z1 - z0 < 0.2) return; addBox(x0, z0, x1, z1, 0, wh, { kind: 'wall' }); G.st.box((x0 + x1) / 2, 0.16, (z0 + z1) / 2, x1 - x0, wh - 0.16, z1 - z0, wc, { sub: 4, top: colMul(wc, 0.85) }); };
  const gx = cx, gz = cz, gw = 4.5;
  if (gateSide === 'z0') { seg(r.x0, r.z0, gx - gw / 2, r.z0 + t); seg(gx + gw / 2, r.z0, r.x1, r.z0 + t); } else seg(r.x0, r.z0, r.x1, r.z0 + t);
  seg(r.x0, r.z1 - t, r.x1, r.z1);
  if (gateSide === 'x0') { seg(r.x0, r.z0, r.x0 + t, gz - gw / 2); seg(r.x0, gz + gw / 2, r.x0 + t, r.z1); } else seg(r.x0, r.z0, r.x0 + t, r.z1);
  seg(r.x1 - t, r.z0, r.x1, r.z1);
  // gate (metal, darker)
  const gc = col('#4a3c2c');
  if (gateSide === 'z0') G.st.box(gx, 0.16, r.z0 + t / 2, gw, 2.2, 0.12, gc, {}); else G.st.box(r.x0 + t / 2, 0.16, gz, 0.12, 2.2, gw, gc, {});
  // gate light
  W.lampsLate = W.lampsLate || [];
  // house
  const hx0 = r.x0 + w * 0.22, hx1 = r.x1 - w * 0.12, hz0 = r.z0 + d * 0.22, hz1 = r.z1 - d * 0.12;
  addBuilding(G, hx0, hz0, hx1, hz1, 2, {});
  if (rnd() < 0.8) W.palms.push({ x: r.x0 + 2.4, z: r.z1 - 2.4, s: rr(0.8, 1.0) });
  WORLD.villas.push({ x: (r.x0 + hx0) / 2, z: (r.z0 + hz0) / 2, gate: gateSide === 'z0' ? { x: gx, z: r.z0 } : { x: r.x0, z: gz } });
}
function buildMosque(G, r) {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, w = Math.min(r.x1 - r.x0, r.z1 - r.z0) - 6;
  const c = col('#efe9dc'), base = 0.16;
  addBox(cx - w / 2, cz - w / 2, cx + w / 2, cz + w / 2, 0, 9, { kind: 'bldg' });
  G.st.box(cx, base, cz, w, 8, w, c, { sub: 4, top: colMul(c, 0.8) });
  // arched windows (dark insets with warm glow)
  for (let k = -2; k <= 2; k++) for (const sd of [-1, 1]) {
    G.st.box(cx + k * w / 6, 2.2, cz + sd * (w / 2 + 0.03), 1.4, 3.2, 0.06, col('#2a2010'), { em: col('#ffcf8a') });
    G.st.box(cx + sd * (w / 2 + 0.03), 2.2, cz + k * w / 6, 0.06, 3.2, 1.4, col('#2a2010'), { em: col('#ffcf8a') });
  }
  // dome (lathe)
  const pts = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * w * 0.32 + 0.001, Math.sin(a) * w * 0.38)); }
  const dome = new THREE.LatheGeometry(pts, 16);
  G.st.addGeo(dome, new THREE.Matrix4().makeTranslation(cx, 8 + base, cz), col('#d8dfe6'));
  G.st.cyl(cx, 8 + base + w * 0.38, cz, 0.12, 0.05, 1.6, 6, col('#e6c35a'), { em: col('#5a4a10') });
  // minaret
  const mx = cx + w / 2 - 1.5, mz = cz - w / 2 - 2.5;
  addCircle(mx, mz, 1.7, 0, 30, { kind: 'solid' });
  G.st.cyl(mx, base, mz, 1.6, 1.4, 22, 10, c);
  G.st.cyl(mx, base + 22, mz, 2.1, 2.1, 0.6, 10, col('#d9cfbb'));
  G.st.cyl(mx, base + 22.6, mz, 1.2, 1.2, 3.2, 10, c, {});
  G.st.cyl(mx, base + 25.8, mz, 1.25, 0.05, 3.6, 10, col('#3a9a6a'), { em: col('#0e6b3a') });
  G.st.box(mx, base + 23.2, mz, 2.6, 0.12, 2.6, col('#3dff9a'), { em: col('#38ff96') });
  W.cupSpots.push({ x: cx - w / 2 - 2, y: 1.2, z: cz + w / 2 + 2, hint: 'جنب المسجد' });
}

// ---------------------------------------------------------------- plaza (drift arena)
function buildPlaza(G) {
  const P = W.PLAZA, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  const g = G.road;
  // fresh asphalt w/ painted parking lines and drift circles
  g.rect([P.x0, 0.035, P.z1], [P.x1 - P.x0, 0, 0], [0, 0, P.z0 - P.z1], col('#26272d'), { su: 20, sv: 14, uv: (s, t) => [(P.x0 + s * (P.x1 - P.x0)) / 9, (P.z1 + t * (P.z0 - P.z1)) / 9] });
  for (let x = P.x0 + 10; x < P.x1 - 8; x += 3.2) { g.rect([x, 0.05, P.z0 + 11], [0.14, 0, 0], [0, 0, -5], C_LINE, {}); g.rect([x, 0.05, P.z1 - 6], [0.14, 0, 0], [0, 0, -5], C_LINE, {}); }
  // two drift rings (orange)
  for (const ox of [-22, 22]) for (let k = 0; k < 64; k++) {
    const a0 = k / 64 * TAU, a1 = (k + 1) / 64 * TAU, r0 = 11, r1 = 11.35;
    const Pp = (a, r) => [cx + ox + Math.cos(a) * r, 0.05, cz + Math.sin(a) * r];
    const A = Pp(a0, r0), B = Pp(a1, r0), Cc = Pp(a1, r1), D = Pp(a0, r1);
    for (const p of [A, Cc, B, A, D, Cc]) g.v(p[0], p[1], p[2], 0, 1, 0, col('#ff8a2a'), 0, 0, col('#3a1a00'));
  }
  // jersey barriers ring with gaps (north & east entrances)
  const bc = col('#c9c4ba'), stripe = col('#d24a2a');
  const inset = 7, bx0 = P.x0 + inset, bx1 = P.x1 - inset, bz0 = P.z0 + inset, bz1 = P.z1 - inset;
  const barrier = (x0, z0, x1, z1) => { addBox(x0, z0, x1, z1, 0, 0.95, { kind: 'barrier' }); G.st.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, 0.95, z1 - z0, bc, { sub: 3 }); const lx = x1 - x0 > z1 - z0; for (let a = (lx ? x0 : z0) + 1; a < (lx ? x1 : z1) - 1; a += 4) lx ? G.st.box(a, 0.5, (z0 + z1) / 2, 1.6, 0.2, z1 - z0 + 0.02, stripe, {}) : G.st.box((x0 + x1) / 2, 0.5, a, x1 - x0 + 0.02, 0.2, 1.6, stripe, {}); };
  const gap = 12;
  barrier(bx0, bz0, cx - gap / 2, bz0 + 0.6); barrier(cx + gap / 2, bz0, bx1, bz0 + 0.6); // north w/ gap
  barrier(bx0, bz1 - 0.6, bx1, bz1);                           // south
  barrier(bx0, bz0, bx0 + 0.6, bz1);                           // west
  barrier(bx1 - 0.6, bz0, bx1, cz - gap / 2); barrier(bx1 - 0.6, cz + gap / 2, bx1, bz1); // east w/ gap
  // bleachers (3 steps) outside barriers on N, S, W
  const sc = col('#8d867c'), sc2 = col('#a39b8f');
  W.crowdSpots = [];
  const bleacher = (x0, z0, x1, z1, axis, outward) => {
    for (let s = 0; s < 3; s++) {
      const h = 0.62 * (s + 1);
      let r;
      if (axis === 'x') { const d = (z1 - z0) / 3; r = outward < 0 ? { x0, x1, z0: z1 - d * (s + 1), z1: z1 - d * s } : { x0, x1, z0: z0 + d * s, z1: z0 + d * (s + 1) }; }
      else { const d = (x1 - x0) / 3; r = outward < 0 ? { z0, z1, x0: x1 - d * (s + 1), x1: x1 - d * s } : { z0, z1, x0: x0 + d * s, x1: x0 + d * (s + 1) }; }
      // keep step heights cumulative from outer edge inward (higher further away)
      addBox(r.x0, r.z0, r.x1, r.z1, 0, h, { kind: 'step', surf: S_CONC });
      G.st.box((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2, r.x1 - r.x0, h, r.z1 - r.z0, s % 2 ? sc : sc2, { sub: 4 });
      const n = Math.floor((axis === 'x' ? (r.x1 - r.x0) : (r.z1 - r.z0)) / 1.1);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        if (axis === 'x') W.crowdSpots.push({ x: lerp(r.x0, r.x1, t) + rr(-0.3, 0.3), y: h, z: (r.z0 + r.z1) / 2 + rr(-0.25, 0.25), face: outward < 0 ? 0 : Math.PI });
        else W.crowdSpots.push({ x: (r.x0 + r.x1) / 2 + rr(-0.25, 0.25), y: h, z: lerp(r.z0, r.z1, t) + rr(-0.3, 0.3), face: outward < 0 ? Math.PI / 2 : -Math.PI / 2 });
      }
    }
  };
  bleacher(bx0, P.z0 + 0.5, cx - gap / 2 - 2, bz0 - 0.5, 'x', -1);
  bleacher(cx + gap / 2 + 2, P.z0 + 0.5, bx1, bz0 - 0.5, 'x', -1);
  bleacher(bx0, bz1 + 0.5, bx1, P.z1 - 0.5, 'x', 1);
  bleacher(P.x0 + 0.5, bz0, bx0 - 0.5, bz1, 'z', -1);
  // masts
  for (const [x, z] of W.masts) {
    addCircle(x, z, 0.5, 0, 18);
    G.st.cyl(x, 0, z, 0.35, 0.22, 16, 8, col('#7c7f86'));
    G.st.box(x, 16, z, 3.2, 0.9, 1.0, col('#3a3c42'), { em: col('#000'), });
    G.st.box(x, 15.95, z, 3.0, 0.08, 0.8, col('#fff3d6'), { em: col('#fff0d0'), noSides: true, top: false, bottom: true });
  }
  // neon banner
  const uv = signUV(16);
  addSignQuad(G.sign, cx, 6, P.z0 + 1.2, 0, -1, 14, 14 * 160 / 512, uv);
  addSignQuad(G.sign, cx, 6, P.z0 + 1.0, 0, 1, 14, 14 * 160 / 512, uv);
  G.st.box(cx - 7.2, 0, P.z0 + 1.1, 0.3, 10, 0.3, col('#555'), {}); G.st.box(cx + 7.2, 0, P.z0 + 1.1, 0.3, 10, 0.3, col('#555'), {});
  addCircle(cx - 7.2, P.z0 + 1.1, 0.3, 0, 10); addCircle(cx + 7.2, P.z0 + 1.1, 0.3, 0, 10);
  // cones inside
  for (const ox of [-22, 22]) W.props.push({ type: 'cone', x: cx + ox, z: cz });
  for (let k = 0; k < 6; k++) W.props.push({ type: 'cone', x: cx + rr(-8, 8), z: cz + (k - 2.5) * 4 });
  W.cupSpots.push({ x: P.x0 + 2.2, y: 1.2, z: P.z1 - 2.2, hint: 'زاوية الساحة' });
  W.cupSpots.push({ x: P.x0 + 1.8, y: 1.2, z: P.z0 + 1.8, hint: 'ورا المدرجات' });
}

// ---------------------------------------------------------------- gas station
function buildGas(G) {
  const b = blockRect(3, 3), { x, z } = W.GAS;
  // ground concrete flat
  G.road.rect([b.x0, 0.035, b.z1], [b.x1 - b.x0, 0, 0], [0, 0, b.z0 - b.z1], col('#3b3a3c'), { su: 18, sv: 12, uv: (s, t) => [s * 9, t * 6] });
  surfFill(b.x0, b.z0, b.x1, b.z1, S_ASPH);
  // canopy
  const cw = 26, cd = 15, ch = 5.6;
  G.st.box(x, ch, z, cw, 1.0, cd, col('#f2f2f2'), { top: col('#ddd') });
  G.st.box(x, ch - 0.02, z, cw - 0.4, 0.06, cd - 0.4, col('#ffffff'), { em: col('#d9ecff'), noSides: true, top: false, bottom: true });
  G.st.box(x, ch + 0.3, z - cd / 2 - 0.02, cw, 0.45, 0.06, col('#18a8e8'), { em: col('#1890d8') });
  G.st.box(x, ch + 0.3, z + cd / 2 + 0.02, cw, 0.45, 0.06, col('#18a8e8'), { em: col('#1890d8') });
  for (const ox of [-9, 9]) for (const oz of [-5, 5]) { G.st.box(x + ox, 0, z + oz, 0.6, ch, 0.6, col('#d8d8d8'), {}); addCircle(x + ox, z + oz, 0.45, 0, ch); }
  for (const ox of [-6, 0, 6]) { G.st.box(x + ox, 0.0, z, 1.2, 1.7, 0.8, col('#d43a2a'), { top: col('#222') }); G.st.box(x + ox, 1.0, z - 0.41, 0.7, 0.4, 0.02, col('#111'), { em: col('#5fd0ff') }); addBox(x + ox - 0.6, z - 0.4, x + ox + 0.6, z + 0.4, 0, 1.7, { kind: 'wall' }); }
  // shop
  addBuilding(G, x - 12, z - 34, x + 12, z - 22, 1, { shopFace: 'z1', shopK: 23 });
  // price pylon
  G.st.box(x + 20, 0, z + 14, 2.2, 7, 0.6, col('#1d2a3a'), {}); addBox(x + 18.9, z + 13.7, x + 21.1, z + 14.3, 0, 7, { kind: 'wall' });
  addSignQuad(G.sign, x + 20, 5.2, z + 14.32, 0, 1, 3.2, 1.0, signUV(17));
  addSignQuad(G.sign, x + 20, 5.2, z + 13.68, 0, -1, 3.2, 1.0, signUV(17));
  addSignQuad(G.sign, x, ch + 1.2, z + cd / 2 + 0.05, 0, 1, 8, 2.5, signUV(17));
  // other buildings in rest of block
  addBuilding(G, b.x1 - 40, b.z0 + 3, b.x1 - 3, b.z0 + 24, 4, { shopFace: 'x1', shopK: 11 });
  addBuilding(G, b.x1 - 30, b.z1 - 22, b.x1 - 3, b.z1 - 3, 3, { shopFace: 'z1', shopK: 2 });
  W.cupSpots.push({ x: x, y: 1.2, z: z - 38, hint: 'ورا المحطة' });
  WORLD.gasZone = { x, z, r: 9 };
  W.props.push({ type: 'cartons', x: x - 15, z: z - 36 });
}
// ---------------------------------------------------------------- garage
function buildGarage(G) {
  const b = blockRect(1, 3), g = W.GARAGE;
  G.road.rect([b.x0, 0.035, b.z1], [b.x1 - b.x0, 0, 0], [0, 0, b.z0 - b.z1], col('#2e2f35'), { su: 18, sv: 12, uv: (s, t) => [s * 9, t * 6] });
  surfFill(b.x0, b.z0, b.x1, b.z1, S_ASPH);
  // building
  const x0 = g.x - 20, x1 = g.x + 20, z0 = g.z + 6, z1 = b.z1 - 2;
  addBox(x0, z0, x1, z1, 0, 9, { kind: 'bldg' });
  G.st.box(g.x, 0, (z0 + z1) / 2, x1 - x0, 9, z1 - z0, col('#2b2e36'), { sub: 4, top: col('#222') });
  // big doors with orange glow
  for (const ox of [-10, 0, 10]) {
    G.st.box(g.x + ox, 0, z0 - 0.04, 8, 5.2, 0.08, col('#3c4250'), {});
    for (let k = 0; k < 13; k++) G.st.box(g.x + ox, 0.5 + k * 0.36, z0 - 0.09, 7.9, 0.05, 0.03, col('#262a33'), {});
    G.st.box(g.x + ox, 0.0, z0 - 0.1, 8, 0.35, 0.04, col('#ffb060'), { em: col('#ff7a20') });
    G.st.box(g.x + ox, 5.3, z0 - 0.1, 8.4, 0.25, 0.25, col('#ff7b1c'), { em: col('#c85008') });
  }
  // stripes
  G.st.box(g.x, 7.2, z0 - 0.05, 40, 0.3, 0.06, col('#ff7b1c'), { em: col('#ff6a10') });
  addSignQuad(G.sign, g.x, 6.0, z0 - 0.12, 0, -1, 9, 9 * 160 / 512, signUV(15));
  // tyre stacks
  for (const ox of [-18, 18]) for (let k = 0; k < 4; k++) G.st.cyl(g.x + ox, k * 0.32, z0 - 2.5, 0.42, 0.42, 0.3, 10, col('#141414'), { capCol: col('#222') });
  addCircle(g.x - 18, z0 - 2.5, 0.5, 0, 1.3); addCircle(g.x + 18, z0 - 2.5, 0.5, 0, 1.3);
  WORLD.garageZone = { x: g.door.x, z: g.door.z - 6, r: 8 };
  // shops on rest of block
  addBuilding(G, b.x0 + 3, b.z0 + 3, b.x0 + 26, b.z0 + 22, 3, { shopFace: 'z0', shopK: 1 });
  addBuilding(G, b.x1 - 22, b.z0 + 3, b.x1 - 3, b.z0 + 22, 4, { shopFace: 'x1', shopK: 9 });
  W.cupSpots.push({ x: b.x0 + 2, y: 1.2, z: b.z1 - 2, hint: 'زاوية الكراج' });
}
// ---------------------------------------------------------------- roundabout + dallah
function buildRoundabout(G) {
  const R = W.RB, isl = R.island;
  addCircle(R.x, R.z, isl, -1, 0.75, { kind: 'island' });
  // curb ring + planter
  G.st.cyl(R.x, 0, R.z, isl, isl, 0.75, 40, col('#b8b0a2'), { capCol: col('#4f6a3a') });
  G.st.cyl(R.x, 0.75, R.z, isl - 1.2, isl - 1.6, 0.05, 40, col('#5f7d44'), { capCol: col('#628447') });
  // pedestal + giant dallah (lathe)
  G.st.cyl(R.x, 0.75, R.z, 3.6, 3.2, 1.6, 16, col('#d9cdb8'), { em: col('#2a2010') });
  const prof = [[0, 0], [2.6, 0], [2.9, 0.6], [2.8, 1.6], [2.2, 2.8], [1.4, 3.6], [1.1, 4.4], [1.5, 4.9], [1.9, 5.3], [1.6, 5.9], [1.0, 6.5], [0.55, 7.2], [0.7, 7.6], [0.2, 8.3], [0.0, 8.4]];
  const dg = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0] + 0.001, p[1])), 24);
  const gold = col('#e0b24a');
  G.st.addGeo(dg, new THREE.Matrix4().makeTranslation(R.x, 2.35, R.z), gold, col('#2a1a00'));
  // spout (curved): chain of boxes
  for (let k = 0; k < 7; k++) { const t = k / 6; G.st.box(R.x + 2.3 + t * 2.6, 2.35 + 3.8 + t * 1.6 + Math.sin(t * 3) * 0.6, R.z, 0.6 - t * 0.25, 0.5, 0.6 - t * 0.25, gold, { em: col('#2a1a00'), ry: 0 }); }
  // handle
  for (let k = 0; k < 8; k++) { const a = k / 7 * Math.PI; G.st.box(R.x - 2.2 - Math.sin(a) * 1.4, 2.35 + 2.4 + (1 - Math.cos(a)) * 1.6, R.z, 0.45, 0.45, 0.45, gold, { em: col('#2a1a00') }); }
  // uplights glows recorded for glow system
  WORLD.rbUp = [];
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; WORLD.rbUp.push([R.x + Math.cos(a) * 3.9, 0.9, R.z + Math.sin(a) * 3.9]); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.3; W.palms.push({ x: R.x + Math.cos(a) * 8.5, z: R.z + Math.sin(a) * 8.5, s: 1.15 }); }
  W.cupSpots.push({ x: R.x + 20, y: 1.2, z: R.z + 20, hint: 'زاوية الدوار' });
}
// ---------------------------------------------------------------- highway & bridge
function buildHighway(G) {
  const H = W.HWY, B = W.BRIDGE, hw = H.w / 2;
  // median barrier with gaps at junctions
  const gaps = [[-162, -134], [-328, -312], [78, 106]];
  let z = H.z0;
  const segs = [];
  for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) { segs.push([z, g0]); z = g1; }
  segs.push([z, 310]);
  for (const [a, b] of segs) { addBox(H.x - 0.4, a, H.x + 0.4, b, -1, 1.0, { kind: 'barrier' }); G.st.box(H.x, 0, (a + b) / 2, 0.8, 1.0, b - a, col('#bdb7ab'), { sub: 8, top: col('#d6d0c4') }); }
  // poles on median (double arm)
  // bridge deck & railings
  addBox(H.x - hw - 1, B.z0, H.x + hw + 1, B.z1, -1.5, 0.03, { kind: 'deck', surf: S_ASPH });
  G.st.box(H.x, -1.5, (B.z0 + B.z1) / 2, H.w + 2, 1.5, B.z1 - B.z0, col('#a8a090'), { sub: 6, top: false });
  for (const sd of [-1, 1]) {
    addBox(H.x + sd * (hw + 0.5) - 0.3, B.z0 - 12, H.x + sd * (hw + 0.5) + 0.3, B.z1 + 12, -1, 1.1, { kind: 'barrier' });
    G.st.box(H.x + sd * (hw + 0.5), 0, (B.z0 + B.z1) / 2, 0.6, 1.1, B.z1 - B.z0 + 24, col('#cfc8bb'), { sub: 6 });
    G.st.box(H.x + sd * (hw + 0.5), 1.1, (B.z0 + B.z1) / 2, 0.15, 0.12, B.z1 - B.z0 + 24, col('#ffb02a'), { em: col('#7a4a00') });
  }
  for (const pz of [146, 158, 170, 182, 194]) for (const px of [-8, 8]) {
    const gy = terrainH(H.x + px, pz) - 0.5;
    addCircle(H.x + px, pz, 1.1, gy, -1.5);
    G.st.cyl(H.x + px, gy, pz, 1.1, 1.0, -1.5 - gy, 10, col('#9c958a'));
  }
  W.cupSpots.push({ x: H.x + 3, y: terrainH(H.x + 3, 170) + 1.0, z: 170, hint: 'تحت الجسر' });
  W.cupSpots.push({ x: H.x - 6, y: 1.2, z: H.z0 + 6, hint: 'آخر الطريق السريع' });
  // road end berm + kicker
  G.st.box(H.x, 0, 314, H.w + 4, 1.2, 2, col('#f0c020'), { em: col('#3a2a00') }); addBox(H.x - hw - 2, 313, H.x + hw + 2, 315, -1, 1.2, { kind: 'barrier' });
  for (let k = -4; k <= 4; k++) G.st.box(H.x + k * 2.4, 1.2, 314, 1.2, 0.04, 2.02, col('#111'), {});
}
// ---------------------------------------------------------------- camp (kashta)
function buildCamp(G) {
  const { x, z } = W.CAMP, y = terrainH(x, z);
  // carpet rugs
  const rug = (cx, cz, w, d, c1, c2) => { G.st.box(cx, y + 0.02, cz, w, 0.04, d, c1, { noSides: true }); G.st.box(cx, y + 0.045, cz, w * 0.8, 0.01, d * 0.7, c2, { noSides: true }); };
  rug(x - 2, z + 3, 6, 4, col('#8a1f1f'), col('#c9a23a')); rug(x + 4, z + 2, 5, 3.5, col('#6b1a2a'), col('#e0c070'));
  // tent (bait sha'ar): black/brown striped
  const tx = x - 1, tz = z - 7, tw = 12, td = 6, th = 3.2;
  addBox(tx - tw / 2, tz - td / 2, tx + tw / 2, tz + td / 2, y, y + th, { kind: 'wall' });
  for (let k = 0; k < 6; k++) {
    const c = k % 2 ? col('#3a2e24') : col('#7a5c3c');
    const sx = tx - tw / 2 + (k + 0.5) * tw / 6;
    // sloped roof halves
    const geo = new THREE.BufferGeometry();
    const hw = tw / 12, ps = [
      sx - hw, y + 2.0, tz - td / 2, sx + hw, y + 2.0, tz - td / 2, sx + hw, y + th, tz, sx - hw, y + 2.0, tz - td / 2, sx + hw, y + th, tz, sx - hw, y + th, tz,
      sx - hw, y + th, tz, sx + hw, y + th, tz, sx + hw, y + 2.0, tz + td / 2, sx - hw, y + th, tz, sx + hw, y + 2.0, tz + td / 2, sx - hw, y + 2.0, tz + td / 2];
    const rev = []; for (let q = 0; q < ps.length; q += 9) rev.push(ps[q], ps[q + 1], ps[q + 2], ps[q + 6], ps[q + 7], ps[q + 8], ps[q + 3], ps[q + 4], ps[q + 5]);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(ps.concat(rev), 3)); geo.computeVertexNormals();
    G.st.addGeo(geo, null, c);
  }
  for (let k = 0; k < 8; k++) G.st.box(tx - tw / 2 + (k + 0.5) * tw / 8, y, tz - td / 2 + 0.05, tw / 8, 2.0, 0.1, k % 2 ? col('#4a3a2c') : col('#8a6a46'), {});
  G.st.box(tx - tw / 2, y, tz, 0.1, 2.0, td, col('#6a5038'), {}); G.st.box(tx + tw / 2, y, tz, 0.1, 2.0, td, col('#6a5038'), {});
  for (const px of [-tw / 2, -tw / 6, tw / 6, tw / 2]) G.st.box(tx + px, y, tz + td / 2, 0.12, 2.1, 0.12, col('#5a4030'), {});
  // interior glow (lantern)
  G.st.box(tx, y + 1.4, tz, 0.3, 0.4, 0.3, col('#ffd28a'), { em: col('#ffb050') });
  // fire pit stones
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; G.st.box(x + Math.cos(a) * 1.1, y, z + Math.sin(a) * 1.1, 0.45, 0.35, 0.45, col('#5a5550'), { ry: a }); }
  addCircle(x, z, 1.4, y - 1, y + 0.4, { kind: 'solid' });
  // logs
  for (let k = 0; k < 3; k++) G.st.box(x, y + 0.1, z, 1.4, 0.18, 0.18, col('#3a2414'), { ry: k * 1.05 });
  // coffee set: dallah, finjans, thermos
  const pts = [[0, 0], [0.18, 0], [0.2, 0.08], [0.16, 0.22], [0.09, 0.3], [0.12, 0.38], [0.06, 0.48], [0.0, 0.5]].map(p => new THREE.Vector2(p[0] + 0.001, p[1]));
  G.st.addGeo(new THREE.LatheGeometry(pts, 10), new THREE.Matrix4().makeTranslation(x + 1.7, y, z + 0.6), col('#e0b24a'), col('#201000'));
  for (let k = 0; k < 5; k++) G.st.cyl(x - 1.5 + k * 0.25, y + 0.05, z + 3.2, 0.05, 0.07, 0.08, 6, col('#f4f0e6'));
  G.st.cyl(x + 3.2, y + 0.05, z + 2.4, 0.13, 0.13, 0.45, 8, col('#c8302a'), { capCol: col('#eee') });
  G.st.cyl(x + 3.6, y + 0.05, z + 2.6, 0.13, 0.13, 0.45, 8, col('#2a6ab8'), { capCol: col('#eee') });
  // cushions
  for (let k = 0; k < 5; k++) G.st.box(x - 4 + k * 1.3, y + 0.04, z + 5.1, 1.1, 0.5, 0.5, col(pick(['#b02a2a', '#7a1a3a', '#c98a2a'])), {});
  WORLD.campZone = { x, z: z + 1, r: 12 };
  WORLD.fire = { x, y: y + 0.4, z };
  W.cupSpots.push({ x: tx - 2, y: y + 1.0, z: tz - td / 2 - 2.5, hint: 'ورا الخيمة' });
}
// ---------------------------------------------------------------- jumps / ramps
function buildRamps(G) {
  const add = (x, z, dir, len, h, w, id, colr) => {
    // dir: +z, -z, +x, -x : direction of travel (rising toward)
    const gy = Math.max(terrainH(x, z), 0);
    let b;
    if (dir === '+z') b = addBox(x - w / 2, z - len, x + w / 2, z, gy - 2, 0, { kind: 'ramp', surf: S_CONC, ramp: { ax: 'z', h0: gy, h1: gy + h } });
    if (dir === '-z') b = addBox(x - w / 2, z, x + w / 2, z + len, gy - 2, 0, { kind: 'ramp', surf: S_CONC, ramp: { ax: 'z', h0: gy + h, h1: gy } });
    if (dir === '+x') b = addBox(x - len, z - w / 2, x, z + w / 2, gy - 2, 0, { kind: 'ramp', surf: S_CONC, ramp: { ax: 'x', h0: gy, h1: gy + h } });
    if (dir === '-x') b = addBox(x, z - w / 2, x + len, z + w / 2, gy - 2, 0, { kind: 'ramp', surf: S_CONC, ramp: { ax: 'x', h0: gy + h, h1: gy } });
    b.y1 = gy + h; b.jump = id;
    WORLD.rampList.push({ b, color: colr || col('#c79a5e'), stripes: !colr, id });
    W.jumpSpots.push({ id, x, z, dir });
  };
  add(60, 128, '+z', 12, 2.6, 7, 'j1');
  add(226, 60, '+x', 12, 2.4, 7, 'j2');
  add(258, 146, '+z', 14, 3.0, 8, 'j3');
  add(-100, 132, '+z', 12, 2.4, 8, 'j4', col('#6f6a62'));
  add(-30, 300, '+x', 12, 2.6, 7, 'j5');
  add(200, 312, '+z', 14, 2.8, 10, 'j6', col('#5f5a55'));
  add(130, 70, '-x', 12, 2.4, 7, 'j7');
  add(300, -120, '-z', 12, 2.6, 7, 'j8');
  // ramp meshes
  for (const r of WORLD.rampList) {
    const b = r.b, R = b.ramp, c = r.color, g = G.st;
    const y0 = Math.min(R.h0, R.h1) - 0.4;
    const top = (s, t) => R.ax === 'z' ? [lerp(b.x0, b.x1, s), lerp(R.h0, R.h1, t), lerp(b.z0, b.z1, t)] : [lerp(b.x0, b.x1, t), lerp(R.h0, R.h1, t), lerp(b.z0, b.z1, s)];
    const q = (a, bb, cc, d, cl, em) => { const n = new THREE.Vector3().subVectors(V3(...bb), V3(...a)).cross(new THREE.Vector3().subVectors(V3(...cc), V3(...a))).normalize(); for (const p of [a, bb, cc, a, cc, d]) g.v(p[0], p[1], p[2], n.x, n.y, n.z, cl, 0, 0, em); };
    // top surface subdivided
    const n = 6;
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const A = top(0, t0), B = top(1, t0), C = top(1, t1), D = top(0, t1);
      const cl = r.stripes && k % 2 ? col('#e8b820') : c;
      if (R.ax === 'z') q(A, D, C, B, cl); else q(A, B, C, D, cl);
    }
    // high side wall
    const hiAtMax = R.h1 > R.h0;
    if (R.ax === 'z') { const zz = hiAtMax ? b.z1 : b.z0, h = Math.max(R.h0, R.h1); const sgn = hiAtMax ? 1 : -1; const A = [b.x0, y0, zz], B = [b.x1, y0, zz], C = [b.x1, h, zz], D = [b.x0, h, zz]; sgn > 0 ? q(A, B, C, D, colMul(c, 0.6)) : q(B, A, D, C, colMul(c, 0.6)); }
    else { const xx = hiAtMax ? b.x1 : b.x0, h = Math.max(R.h0, R.h1); const sgn = hiAtMax ? 1 : -1; const A = [xx, y0, b.z1], B = [xx, y0, b.z0], C = [xx, h, b.z0], D = [xx, h, b.z1]; sgn > 0 ? q(A, B, C, D, colMul(c, 0.6)) : q(B, A, D, C, colMul(c, 0.6)); }
    // side triangles
    for (const s of [0, 1]) {
      const pts = [];
      for (let k = 0; k <= 1; k++) pts.push(top(s, k));
      const lo = pts[0], hi = pts[1];
      const loB = [lo[0], y0, lo[2]], hiB = [hi[0], y0, hi[2]];
      const nrm = R.ax === 'z' ? [s ? 1 : -1, 0, 0] : [0, 0, s ? 1 : -1];
      for (const p of [loB, hiB, hi, loB, hi, lo, loB, hi, hiB, loB, lo, hi]) g.v(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], colMul(c, 0.75));
    }
  }
  W.cupSpots.push({ x: 60, y: 5.2, z: 139, hint: 'في الهوا' });
  W.cupSpots.push({ x: 258, y: 6.5, z: 172, hint: 'فوق الوادي' });
}
function buildBounds() {
  const B = 349;
  addBox(-400, -400, 400, -B, -50, 200, { kind: 'bound' }); addBox(-400, B, 400, 400, -50, 200, { kind: 'bound' });
  addBox(-400, -400, -B, 400, -50, 200, { kind: 'bound' }); addBox(B, -400, 400, 400, -50, 200, { kind: 'bound' });
  // desert cups (computed on terrain)
  const dc = [[-205, W.BIGDUNE.z, 'قمة الطعس الكبير'], [-205, 300, 'ورا الطعس الكبير'], [330, 168, 'آخر الوادي'], [-300, 292, 'طعوس الغرب'], [290, -200, 'بر الشرق'], [300, -322, 'أقصى الشمال'], [122, 168, 'بداية الوادي'], [62, 262, 'ورا الكشتة'], [-100, 150, 'نهاية الخط'], [326, 300, 'أعلى قمة']];
  for (const [x, z, hint] of dc) W.cupSpots.push({ x, y: terrainH(x, z) + 1.1, z, hint });
  // alley + villa cups
  const al = WORLD.alleys.filter(a => a.len > 20);
  for (let k = 0; k < 2 && k < al.length; k++) { const a = al[Math.floor(k * al.length / 2 + al.length / 4) % al.length]; W.cupSpots.push({ x: a.x, y: 1.3, z: a.z, hint: 'في الزرنوق' }); }
  if (WORLD.villas.length) { const v = WORLD.villas[Math.floor(WORLD.villas.length / 2)]; W.cupSpots.push({ x: v.x, y: 1.3, z: v.z, hint: 'داخل حوش' }); }
  W.cupSpots.push({ x: 120, y: 1.3, z: -338, hint: 'زاوية المستودعات' });
  W.cupSpots = W.cupSpots.slice(0, 25);
}
