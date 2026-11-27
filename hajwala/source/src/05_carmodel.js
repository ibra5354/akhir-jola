// =====================================================================
//  CAR DEFINITIONS + PROCEDURAL MODELS
// =====================================================================
const CARS = {
  shabah: {
    id: 'shabah', name: 'الشبح', type: 'سيدان رياضية', price: 18000, desc: 'توازن ممتاز، وأفضل وحدة للتفحيط',
    L: 4.7, W: 1.86, R: 0.35, aF: 1.42, aR: -1.40, track: 1.6, clear: 0.2, tireW: 0.27,
    upper: [[-2.33, 0.3], [-2.38, 0.62], [-2.28, 0.9], [-1.3, 0.98], [1.05, 0.93], [2.2, 0.74], [2.36, 0.55], [2.33, 0.3]],
    cabin: [[-1.32, 0.97], [-0.72, 1.34], [0.38, 1.37], [1.12, 0.94]], taper: 0.8,
    head: { u: 2.3, v: 0.68, w: 0.52, h: 0.12, x: 0.6 }, tail: { u: -2.34, v: 0.8, w: 0.5, h: 0.1, x: 0.62 },
    paint: '#d8dde3', engine: { cyl: 6, base: 38, tone: 'smooth' },
    phys: { mass: 1380, power: 285e3, fmax: 9800, vmax: 245, drive: 'rwd', grip: 1.1, tail: 0.79, sandMul: 0.8, steer: 0.62, k: 52000, c: 3800, rest: 0.3, cgH: 0.5, frontBias: 0.5, turbo: false, driftAssist: 1.0 }
  },
  wahsh: {
    id: 'wahsh', name: 'الوحش', type: 'جيب دفع رباعي', price: 26000, desc: 'ثقيل، ملك البر والطعوس',
    L: 4.9, W: 2.0, R: 0.46, aF: 1.45, aR: -1.42, track: 1.72, clear: 0.42, tireW: 0.34,
    upper: [[-2.42, 0.52], [-2.46, 1.1], [-2.38, 1.24], [1.35, 1.2], [2.3, 1.12], [2.46, 0.92], [2.42, 0.54]],
    cabin: [[-2.34, 1.22], [-2.26, 1.88], [0.92, 1.9], [1.48, 1.2]], taper: 0.9,
    head: { u: 2.44, v: 0.98, w: 0.36, h: 0.2, x: 0.68 }, tail: { u: -2.45, v: 1.0, w: 0.16, h: 0.4, x: 0.88 },
    paint: '#2c3a2c', engine: { cyl: 8, base: 30, tone: 'deep' },
    phys: { mass: 2250, power: 330e3, fmax: 17500, vmax: 190, drive: 'awd', grip: 1.0, tail: 0.86, sandMul: 1.22, steer: 0.55, k: 72000, c: 6400, rest: 0.42, cgH: 0.8, frontBias: 0.42, turbo: false, driftAssist: 0.5 }
  },
  sarookh: {
    id: 'sarookh', name: 'الصاروخ', type: 'سيارة عضلات', price: 34000, desc: 'سرعة قاتلة على الخط ومؤخرة طيّارة',
    L: 4.85, W: 1.94, R: 0.37, aF: 1.5, aR: -1.38, track: 1.66, clear: 0.18, tireW: 0.32,
    upper: [[-2.4, 0.3], [-2.43, 0.66], [-2.35, 0.93], [-1.55, 0.98], [0.6, 0.96], [2.25, 0.88], [2.42, 0.68], [2.4, 0.32]],
    cabin: [[-1.6, 0.97], [-0.62, 1.3], [0.14, 1.31], [0.76, 0.95]], taper: 0.78,
    head: { u: 2.41, v: 0.72, w: 0.26, h: 0.16, x: 0.62 }, tail: { u: -2.43, v: 0.8, w: 1.5, h: 0.09, x: 0 },
    paint: '#c4261d', engine: { cyl: 8, base: 26, tone: 'muscle' },
    phys: { mass: 1620, power: 440e3, fmax: 11500, vmax: 282, drive: 'rwd', grip: 1.0, tail: 0.68, sandMul: 0.72, steer: 0.58, k: 56000, c: 4200, rest: 0.3, cgH: 0.52, frontBias: 0.56, turbo: false, driftAssist: 0.8 }
  },
  abu: {
    id: 'abu', name: 'أبو غمّازة', type: 'وانيت قديم', price: 0, desc: 'ضعيف بس ممتع ومضحك',
    L: 4.9, W: 1.76, R: 0.35, aF: 1.5, aR: -1.45, track: 1.5, clear: 0.3, tireW: 0.24,
    upper: [[-2.42, 0.42], [-2.45, 0.76], [-0.55, 0.76], [-0.55, 1.0], [0.9, 1.04], [2.3, 1.0], [2.43, 0.76], [2.4, 0.42]],
    cabin: [[-0.55, 0.99], [-0.5, 1.66], [0.48, 1.68], [0.95, 1.03]], taper: 0.92,
    head: { u: 2.43, v: 0.86, w: 0.2, h: 0.2, x: 0.62, round: true }, tail: { u: -2.46, v: 0.86, w: 0.14, h: 0.26, x: 0.74 },
    paint: '#e8e0c8', engine: { cyl: 4, base: 44, tone: 'rattly' },
    phys: { mass: 1250, power: 105e3, fmax: 6600, vmax: 152, drive: 'rwd', grip: 0.93, tail: 0.8, sandMul: 0.78, steer: 0.6, k: 40000, c: 3000, rest: 0.34, cgH: 0.62, frontBias: 0.58, turbo: false, driftAssist: 0.9 }
  },
};
const CAR_ORDER = ['abu', 'shabah', 'wahsh', 'sarookh'];
const PAINTS = ['#e8e0c8', '#f4f4f2', '#111214', '#c4261d', '#ff6a00', '#ffc400', '#2bd46b', '#1e6bff', '#16c8e6', '#7a3cff', '#ff3ea5', '#8a8f96', '#2c3a2c', '#6b4a2a', '#d8dde3', '#0b2a5a'];
const NEONS = ['#ff7b1c', '#16c8e6', '#ff3ea5', '#7a3cff', '#2bd46b', '#ffd400', '#ff2a2a', '#ffffff'];
const SMOKES = ['#ffffff', '#ff5a5a', '#5ab4ff', '#ffe14a', '#7dff6a', '#d58bff', '#ff9a3c', '#202020'];
const PLATE_AR = ['ا', 'ب', 'ح', 'د', 'ر', 'س', 'ص', 'ط', 'ع', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ى'];
const PLATE_EN = ['A', 'B', 'J', 'D', 'R', 'S', 'X', 'T', 'E', 'G', 'K', 'L', 'Z', 'N', 'H', 'U', 'V'];
const STRIPES = ['بدون', 'رنج وسط', 'رنج جانبي', 'سهم', 'نص ونص'];
const TINTS = ['شفاف', 'خفيف', 'متوسط', 'أسود ملكي'];
const HORNS = ['كلاسيك', 'تريلا', 'بطة', 'زمّور طرب', 'سيكل', 'باص المدرسة'];

let ENVMAP = null;
function buildEnvMap(renderer) {
  const sc = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 p; void main(){ float h=normalize(p).y; vec3 c = mix(vec3(0.10,0.07,0.06), vec3(0.03,0.05,0.12), smoothstep(-0.1,0.6,h)); c += vec3(1.0,0.55,0.2)*0.5*exp(-abs(h-0.02)*14.0); gl_FragColor=vec4(c,1.);}' }));
  sc.add(sky);
  const strip = (x, y, z, w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  strip(0, 6, 0, 6, 0.8, new THREE.Color(2.5, 2.2, 1.8)); strip(5, 3, -5, 3, 0.5, new THREE.Color(2.4, 1.3, 0.5)); strip(-6, 2, 3, 4, 0.4, new THREE.Color(0.6, 1.6, 2.4)); strip(3, 2, 7, 4, 0.4, new THREE.Color(2.4, 0.9, 0.3));
  const pm = new THREE.PMREMGenerator(renderer);
  ENVMAP = pm.fromScene(sc, 0.02).texture; pm.dispose();
}

// ---------------------------------------------------------------- helpers
const EXM = (d) => new THREE.Matrix4().set(0, 0, 1, -d / 2, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
function bodyShape(spec) {
  const s = new THREE.Shape(), up = spec.upper, ar = spec.R + 0.07, vb = spec.clear;
  s.moveTo(up[0][0], up[0][1]);
  for (let i = 1; i < up.length; i++) s.lineTo(up[i][0], up[i][1]);
  // bottom from front to rear with wheel arches
  const front = up[up.length - 1][0], rear = up[0][0];
  s.lineTo(front - 0.05, vb);
  const arch = (uc) => { s.lineTo(uc + ar, vb); s.absarc(uc, spec.R, ar, Math.asin(clamp((vb - spec.R) / ar, -1, 1)), Math.PI - Math.asin(clamp((vb - spec.R) / ar, -1, 1)), false); };
  arch(spec.aF); arch(spec.aR);
  s.lineTo(rear + 0.05, vb);
  s.lineTo(up[0][0], up[0][1]);
  return s;
}
function profileY(spec, u) { // highest body/cabin surface at u
  let best = 0;
  const scan = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]); if (u >= lo && u <= hi && hi > lo) { const t = (u - a[0]) / (b[0] - a[0]); best = Math.max(best, lerp(a[1], b[1], t)); } } };
  scan(spec.upper); scan(spec.cabin); return best;
}
function extrude(shape, depth, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.applyMatrix4(EXM(depth));
  return g;
}
function wheelGeo(R, w, style = 0) {
  const g = new Geo();
  const tire = new THREE.CylinderGeometry(R, R, w, 18, 1, false); tire.rotateZ(Math.PI / 2);
  g.addGeo(tire, null, col('#141416'));
  const side = new THREE.CylinderGeometry(R * 0.86, R * 0.86, w + 0.012, 18, 1, false); side.rotateZ(Math.PI / 2);
  g.addGeo(side, null, col('#1d1d20'));
  const rimR = R * 0.62;
  const rim = new THREE.CylinderGeometry(rimR, rimR, 0.04, 16); rim.rotateZ(Math.PI / 2); rim.translate(w / 2 + 0.008, 0, 0);
  g.addGeo(rim, null, col('#b9bec4'));
  const hub = new THREE.CylinderGeometry(rimR * 0.25, rimR * 0.3, 0.06, 8); hub.rotateZ(Math.PI / 2); hub.translate(w / 2 + 0.03, 0, 0);
  g.addGeo(hub, null, col('#6a6e74'));
  const nS = style === 1 ? 8 : 5;
  for (let k = 0; k < nS; k++) {
    const a = k / nS * TAU, sp = new THREE.BoxGeometry(0.03, rimR * 0.9, 0.07);
    sp.translate(0, rimR * 0.48, 0); sp.rotateX(a); sp.translate(w / 2 + 0.035, 0, 0);
    g.addGeo(sp, null, col('#d8dce0'));
  }
  // dark recess behind spokes
  const rec = new THREE.CylinderGeometry(rimR * 0.95, rimR * 0.95, 0.01, 16); rec.rotateZ(Math.PI / 2); rec.translate(w / 2 + 0.002, 0, 0);
  g.addGeo(rec, null, col('#2a2c30'));
  return g.build(false);
}

// ---------------------------------------------------------------- build model
// returns { group, root, wheels(InstancedMesh), parts:{...}, spec, setBrake(), setLook() }
function buildCarModel(id, opt = {}) {
  const spec = CARS[id], L = spec.L, Wd = spec.W, d = Wd - 0.12;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paintMat = new THREE.MeshStandardMaterial({ color: col(spec.paint), metalness: 0.55, roughness: 0.28, envMap: ENVMAP, envMapIntensity: 1.1 });
  const trimMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.5, envMap: ENVMAP, envMapIntensity: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: col('#0d1218'), metalness: 0.9, roughness: 0.08, envMap: ENVMAP, envMapIntensity: 1.4, transparent: true, opacity: 0.88 });
  // lower body
  const bodyG = extrude(bodyShape(spec), d, 0.06);
  // cabin glass (tapered)
  const cs = new THREE.Shape(); spec.cabin.forEach((p, i) => i ? cs.lineTo(p[0], p[1]) : cs.moveTo(p[0], p[1])); cs.lineTo(spec.cabin[0][0], spec.cabin[0][1]);
  const cab = extrude(cs, d - 0.06, 0.04);
  const belt = Math.min(...spec.cabin.map(p => p[1])), top = Math.max(...spec.cabin.map(p => p[1]));
  const taper = (g, k) => { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); const t = clamp((y - belt) / (top - belt), 0, 1); P.setX(i, P.getX(i) * lerp(1, k, t)); } P.needsUpdate = true; g.computeVertexNormals(); };
  taper(cab, spec.taper);
  // roof panel (painted): top part of cabin as a thin slab
  const rs = new THREE.Shape(); const c2 = spec.cabin[1], c3 = spec.cabin[2];
  rs.moveTo(c2[0] + 0.04, c2[1] - 0.02); rs.lineTo(c3[0] - 0.02, c3[1] - 0.02); rs.lineTo(c3[0] - 0.04, c3[1] + 0.035); rs.lineTo(c2[0] + 0.06, c2[1] + 0.035); rs.lineTo(c2[0] + 0.04, c2[1] - 0.02);
  const roofG = extrude(rs, (d - 0.06) * spec.taper + 0.02, 0.025);
  const parts = [bodyG, roofG];
  // per-car painted extras
  const pg = (g) => parts.push(g);
  const trim = new Geo(), C_BLK = col('#0e0f11'), C_CHR = col('#c9ced4'), C_GRY = col('#3a3d42');
  const fx = spec.upper[spec.upper.length - 2][0], rx = spec.upper[1][0];
  // common trims: front grille, bumper lips, skirts, mirrors
  const zf = -spec.upper[spec.upper.length - 1][0], zr = -spec.upper[0][0];
  trim.box(0, spec.clear + 0.02, zf + 0.12, Wd - 0.3, 0.12, 0.2, C_BLK, {});
  trim.box(0, spec.clear + 0.02, zr - 0.12, Wd - 0.3, 0.12, 0.2, C_BLK, {});
  for (const sd of [-1, 1]) trim.box(sd * (Wd / 2 - 0.02), spec.clear, -(spec.aF + spec.aR) / 2, 0.06, 0.1, Math.abs(spec.aF - spec.aR) - 1.0, C_BLK, {});
  const mirU = spec.cabin[3][0] - 0.1, mirY = spec.cabin[3][1] + 0.08;
  for (const sd of [-1, 1]) trim.box(sd * (Wd / 2 + 0.06), mirY, -mirU, 0.16, 0.1, 0.12, C_BLK, {});
  if (id === 'shabah') {
    trim.box(0, 0.38, zf + 0.04, Wd * 0.55, 0.16, 0.04, C_BLK, {}); // grille
    // wing
    for (const sd of [-0.55, 0.55]) trim.box(sd, 0.98, -(-2.0), 0.06, 0.18, 0.1, C_BLK, {});
    pg(new THREE.BoxGeometry(Wd - 0.2, 0.04, 0.32).translate(0, 1.18, 2.02));
    trim.box(0, spec.clear - 0.02, zr - 0.05, Wd * 0.7, 0.06, 0.4, C_GRY, {}); // diffuser
    for (const sd of [-0.45, 0.45]) { const ex = new THREE.CylinderGeometry(0.055, 0.055, 0.2, 10); ex.rotateX(Math.PI / 2); ex.translate(sd, 0.3, zr + 0.02); trim.addGeo(ex, null, C_CHR); }
  }
  if (id === 'sarookh') {
    pg(new THREE.BoxGeometry(0.62, 0.12, 0.9).translate(0, 0.99, -1.25)); // hood scoop
    trim.box(0, 0.99, -1.66, 0.5, 0.08, 0.05, C_BLK, {});
    trim.box(0, 0.42, zf + 0.03, Wd * 0.75, 0.22, 0.04, C_BLK, {});
    trim.box(0, spec.clear - 0.04, zf + 0.25, Wd - 0.1, 0.04, 0.3, C_BLK, {}); // splitter
    pg(new THREE.BoxGeometry(Wd - 0.3, 0.05, 0.22).translate(0, 1.0, 2.25)); // ducktail
    for (const sd of [-0.5, -0.36, 0.36, 0.5]) { const ex = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10); ex.rotateX(Math.PI / 2); ex.translate(sd, 0.28, zr + 0.02); trim.addGeo(ex, null, C_CHR); }
  }
  if (id === 'wahsh') {
    trim.box(0, 0.62, zf + 0.04, Wd * 0.65, 0.3, 0.05, C_BLK, {});
    // bull bar
    for (const sd of [-0.5, 0.5]) trim.box(sd, 0.4, zf - 0.12, 0.08, 0.7, 0.08, C_GRY, {});
    trim.box(0, 0.95, zf - 0.12, 1.2, 0.08, 0.08, C_GRY, {}); trim.box(0, 0.5, zf - 0.12, 1.3, 0.08, 0.08, C_GRY, {});
    // fender flares
    for (const sd of [-1, 1]) for (const ax of [spec.aF, spec.aR]) trim.box(sd * (Wd / 2 + 0.03), spec.R + 0.38, -ax, 0.1, 0.12, 1.15, C_BLK, {});
    // roof rack + light bar
    for (const sd of [-0.75, 0.75]) trim.box(sd, 1.92, -0.6, 0.06, 0.06, 2.6, C_BLK, {});
    for (let k = 0; k < 4; k++) trim.box(0, 1.94, -1.8 + k * 0.8, 1.55, 0.04, 0.06, C_BLK, {});
    trim.box(0, 1.96, -1.95, 1.4, 0.14, 0.12, C_GRY, {});
    // spare tire
    const sp = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 14); sp.rotateX(Math.PI / 2); sp.translate(0, 1.0, zr + 0.16); trim.addGeo(sp, null, col('#151517'));
    trim.box(0, spec.clear + 0.1, 0, 0.1, 0.1, 0.1, C_BLK, {});
    for (const sd of [-1, 1]) trim.box(sd * (Wd / 2 + 0.08), spec.clear + 0.05, -(spec.aF + spec.aR) / 2, 0.22, 0.05, 1.5, C_GRY, {}); // steps
  }
  if (id === 'abu') {
    // chrome bumpers
    trim.box(0, 0.42, zf - 0.06, Wd + 0.04, 0.16, 0.12, C_CHR, {}); trim.box(0, 0.42, zr + 0.06, Wd + 0.04, 0.16, 0.12, C_CHR, {});
    trim.box(0, 0.68, zf + 0.02, 1.0, 0.24, 0.04, C_CHR, {}); // grille
    for (let k = 0; k < 4; k++) trim.box(0, 0.58 + k * 0.06, zf, 0.95, 0.02, 0.04, C_BLK, {});
    // bed walls (painted)
    for (const sd of [-1, 1]) pg(new THREE.BoxGeometry(0.07, 0.3, 1.88).translate(sd * (Wd / 2 - 0.08), 0.91, 1.5));
    pg(new THREE.BoxGeometry(Wd - 0.1, 0.3, 0.07).translate(0, 0.91, 2.42));
    trim.box(0, 0.76, 1.5, Wd - 0.22, 0.02, 1.8, col('#2a2420'), {});
    // mirror arms
    for (const sd of [-1, 1]) trim.box(sd * (Wd / 2 + 0.18), 1.2, -0.85, 0.05, 0.22, 0.14, C_CHR, {});
    // rust patches as trim (brownish)
    trim.box(Wd / 2 + 0.035, 0.5, -1.9, 0.01, 0.18, 0.4, col('#7a4a22'), {}); trim.box(-Wd / 2 - 0.035, 0.55, 2.05, 0.01, 0.14, 0.3, col('#6a3e1e'), {});
    // stuff in the bed: gas cylinder & firewood
    const gc = new THREE.CylinderGeometry(0.16, 0.16, 0.6, 10); gc.translate(0.4, 1.06, 1.9); trim.addGeo(gc, null, col('#c8302a'));
    trim.box(-0.3, 0.78, 1.3, 0.7, 0.22, 0.6, col('#5a3a20'), {});
  }
  const bodyMesh = new THREE.Mesh(mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; })), paintMat);
  const glassMesh = new THREE.Mesh(cab, glassMat);
  const trimMesh = new THREE.Mesh(trim.build(false), trimMat);
  body.add(bodyMesh, glassMesh, trimMesh);
  // lights
  const lightG = new Geo(), tailG = new Geo(), HC = col('#ffffff');
  const hd = spec.head, tl = spec.tail;
  for (const sd of [-1, 1]) {
    if (hd.round) { const c = new THREE.CylinderGeometry(hd.w / 2, hd.w / 2, 0.06, 12); c.rotateX(Math.PI / 2); c.translate(sd * hd.x, hd.v, -hd.u - 0.02); lightG.addGeo(c, null, HC); }
    else lightG.box(sd * hd.x, hd.v - hd.h / 2, -hd.u - 0.01, hd.w, hd.h, 0.06, HC, {});
    if (tl.x === 0) { if (sd > 0) tailG.box(0, tl.v - tl.h / 2, -tl.u + 0.01, tl.w, tl.h, 0.06, HC, {}); }
    else tailG.box(sd * tl.x, tl.v - tl.h / 2, -tl.u + 0.01, tl.w, tl.h, 0.06, HC, {});
  }
  if (id === 'wahsh') lightG.box(0, 1.96, -1.95 - 0.07, 1.3, 0.09, 0.02, HC, {});
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.9), toneMapped: false });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.02, 0.02), toneMapped: false });
  const lightMesh = new THREE.Mesh(lightG.build(false), lightMat), tailMesh = new THREE.Mesh(tailG.build(false), tailMat);
  body.add(lightMesh, tailMesh);
  // wheels
  const wg = wheelGeo(spec.R, spec.tireW, id === 'sarookh' ? 1 : 0);
  const wheels = new THREE.InstancedMesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.45, envMap: ENVMAP }), 4);
  wheels.frustumCulled = false;
  root.add(wheels);
  // stripes (built on look change)
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.35, envMap: ENVMAP, polygonOffset: true, polygonOffsetFactor: -2 });
  const stripeMesh = new THREE.Mesh(new THREE.BufferGeometry(), stripeMat); body.add(stripeMesh);
  // plates
  const plateTex = canvasTex(256, 64, () => { });
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex, color: new THREE.Color(0.75, 0.75, 0.75) });
  const pgeo = new THREE.PlaneGeometry(0.52, 0.13);
  const plateF = new THREE.Mesh(pgeo, plateMat); plateF.position.set(0, spec.clear + 0.22, zf - 0.14); plateF.rotation.y = Math.PI;
  const plateR = new THREE.Mesh(pgeo, plateMat); plateR.position.set(0, spec.clear + 0.3, zr + 0.14);
  if (id === 'abu') { plateF.position.y = 0.3; plateR.position.y = 0.62; plateR.position.z = zr + 0.1; }
  if (id === 'wahsh') { plateR.position.y = 0.62; plateR.position.z = zr + 0.32; plateF.position.y = 0.42; }
  body.add(plateF, plateR);
  // underglow
  const ugMat = new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ug = new THREE.Mesh(new THREE.PlaneGeometry(Wd + 1.6, L + 1.2), ugMat); ug.rotation.x = -Math.PI / 2; ug.position.y = 0.04; ug.visible = false; ug.renderOrder = 3;
  root.add(ug);
  // headlight beams (fake volumetric)
  let beams = null;
  if (opt.beams !== false) {
    const bg = new THREE.ConeGeometry(2.2, 13, 16, 1, true); bg.translate(0, -6.5, 0); bg.rotateX(Math.PI / 2 - 0.06);
    const bm = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0.18 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying float vZ; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vZ = -position.z/13.0; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; vV = normalize(-mv.xyz); vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float uI; varying float vZ; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ float rim = pow(abs(dot(vN,vV)),1.5); float a = (1.0-vZ)*(1.0-vZ)*rim*uI*smoothstep(2.0,9.0,vD); gl_FragColor = vec4(vec3(1.0,0.92,0.75)*a,1.0); }'
    });
    beams = new THREE.Group();
    for (const sd of [-1, 1]) { const b = new THREE.Mesh(bg, bm); b.position.set(sd * hd.x, hd.v, -hd.u - 0.05); b.renderOrder = 4; beams.add(b); }
    body.add(beams);
    beams.userData.mat = bm;
  }
  // nitro flames
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.7, 3.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flG = new THREE.ConeGeometry(0.11, 1.0, 8, 1, true); flG.translate(0, 0.5, 0); flG.rotateX(Math.PI / 2);
  const flames = new THREE.Group();
  const exX = id === 'sarookh' ? [-0.43, 0.43] : id === 'abu' ? [0.55] : id === 'wahsh' ? [-0.6, 0.6] : [-0.45, 0.45];
  for (const x of exX) { const f = new THREE.Mesh(flG, flameMat); f.position.set(x, id === 'wahsh' ? 0.5 : id === 'abu' ? 0.36 : 0.3, zr + 0.1); flames.add(f); const f2 = new THREE.Mesh(flG, flameMat); f2.scale.set(1.8, 1.8, 0.55); f2.position.copy(f.position); flames.add(f2); }
  flames.visible = false; body.add(flames);
  // exhaust positions for smoke/backfire
  const exhaust = exX.map(x => V3(x, flames.children[0].position.y, zr + 0.15));
  // shadows
  bodyMesh.castShadow = true; trimMesh.castShadow = true; glassMesh.castShadow = true;
  // blob shadow
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(Wd + 0.6, L + 0.4), new THREE.MeshBasicMaterial({ map: TEX.glow, color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.NormalBlending }));
  blob.rotation.x = -Math.PI / 2; blob.renderOrder = 2;
  const model = {
    id, spec, root, body, wheels, bodyMesh, glassMesh, trimMesh, stripeMesh, paintMat, glassMat, tailMat, lightMat, plateTex, plateF, plateR, ug, ugMat, beams, flames, flameMat, exhaust, blob, look: null,
    setBrake(b, lightsOn = true) { const k = b ? 3.2 : (lightsOn ? 0.9 : 0.25); tailMat.color.setRGB(k, k * 0.03, k * 0.03); },
    setLights(on) { lightMat.color.setRGB(on ? 2.2 : 0.3, on ? 2.1 : 0.3, on ? 1.9 : 0.28); if (beams) beams.visible = on; },
    setLook(look) { applyLook(model, look); },
    dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } }); plateTex.dispose(); }
  };
  model.setBrake(false);
  return model;
}
function stripeGeometry(spec, type) {
  const g = new Geo(), white = col('#ffffff');
  const L = spec.L, u0 = spec.upper[0][0] + 0.05, u1 = spec.upper[spec.upper.length - 1][0] - 0.05;
  if (type === 1 || type === 3) { // center double / arrow
    const N = 40;
    for (const xo of (type === 1 ? [-0.2, 0.2] : [0])) {
      for (let k = 0; k < N; k++) {
        const a = lerp(u0, u1, k / N), b = lerp(u0, u1, (k + 1) / N);
        const ya = profileY(spec, a) + 0.035, yb = profileY(spec, b) + 0.035;
        const taper = (u) => { const t = clamp((u - spec.cabin[0][0]) / (spec.cabin[3][0] - spec.cabin[0][0]), 0, 1); return (u > spec.cabin[0][0] && u < spec.cabin[3][0]) ? spec.taper + (1 - spec.taper) * (1 - Math.sin(t * Math.PI)) * 0.3 : 1; };
        const w = type === 1 ? 0.12 : lerp(0.05, 0.36, clamp((a - u0) / (u1 - u0), 0, 1));
        const xa = xo * taper(a), xb = xo * taper(b);
        const A = [xa - w, ya, -a], B = [xb - w, yb, -b], C = [xb + w, yb, -b], D = [xa + w, ya, -a];
        for (const p of [A, C, B, A, D, C]) g.v(p[0], p[1], p[2], 0, 1, 0, white);
      }
    }
  }
  if (type === 2) { // side stripe at beltline
    const y = Math.min(...spec.cabin.map(p => p[1])) - 0.16;
    for (const sd of [-1, 1]) {
      const x = sd * (spec.W / 2 + 0.012), a = spec.upper[0][0] + 0.2, b = spec.upper[spec.upper.length - 1][0] - 0.4;
      const A = [x, y, -a], B = [x, y, -b], C = [x, y + 0.1, -b], D = [x, y + 0.1, -a];
      const pts = sd > 0 ? [A, C, B, A, D, C] : [A, B, C, A, C, D];
      for (const p of pts) g.v(p[0], p[1], p[2], sd, 0, 0, white);
      const A2 = [x, y - 0.06, -a], B2 = [x, y - 0.06, -b], C2 = [x, y - 0.03, -b], D2 = [x, y - 0.03, -a];
      const pts2 = sd > 0 ? [A2, C2, B2, A2, D2, C2] : [A2, B2, C2, A2, C2, D2];
      for (const p of pts2) g.v(p[0], p[1], p[2], sd, 0, 0, white);
    }
  }
  if (type === 4) { // two-tone: lower half sides
    const y0 = spec.clear + 0.05, y1 = spec.clear + 0.34;
    for (const sd of [-1, 1]) {
      const x = sd * (spec.W / 2 + 0.012), a = spec.upper[0][0] + 0.1, b = spec.upper[spec.upper.length - 1][0] - 0.1;
      const A = [x, y0, -a], B = [x, y0, -b], C = [x, y1, -b], D = [x, y1, -a];
      const pts = sd > 0 ? [A, C, B, A, D, C] : [A, B, C, A, C, D];
      for (const p of pts) g.v(p[0], p[1], p[2], sd, 0, 0, white);
    }
  }
  return g.build(false);
}
function drawPlate(tex, plate) {
  const cv = tex._cv, g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  const sw = 34; // side strip
  g.fillStyle = '#0d4f9a'; g.fillRect(w - sw - 3, 3, sw, h - 6);
  g.fillStyle = '#fff'; g.font = `bold 11px ${FONT_UI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('K', w - sw / 2 - 3, 16); g.fillText('S', w - sw / 2 - 3, 32); g.fillText('A', w - sw / 2 - 3, 48);
  const mid = (w - sw - 6) / 2;
  g.beginPath(); g.moveTo(3, h / 2); g.lineTo(w - sw - 3, h / 2); g.moveTo(mid + 3, 3); g.lineTo(mid + 3, h - 3); g.strokeStyle = '#222'; g.lineWidth = 2; g.stroke();
  const letters = (plate && plate.l) || [0, 1, 2], digits = (plate && plate.d) || '1234';
  const ar = letters.map(i => PLATE_AR[i]).join(' '), en = letters.map(i => PLATE_EN[i]).slice().reverse().join(' ');
  g.fillStyle = '#111';
  g.font = `bold 26px ${FONT_UI}`;
  g.direction = 'rtl'; g.fillText(toAr(digits.split('').join(' ')), mid / 2 + 3, 17); g.fillText(ar, mid + 3 + mid / 2, 17);
  g.direction = 'ltr'; g.font = `bold 24px Arial, sans-serif`;
  g.fillText(digits.split('').join(' '), mid / 2 + 3, 48); g.fillText(en, mid + 3 + mid / 2, 48);
  tex.needsUpdate = true;
}
function defaultLook(id) { return { paint: CARS[id].paint, finish: 'gloss', stripe: 0, stripeCol: '#111214', tint: 2, underglow: null, smoke: '#ffffff', plate: { l: [0, 1, 2], d: String(ri(1000, 9999)) }, horn: 0, rim: '#b9bec4' }; }
function applyLook(m, look) {
  look = Object.assign(defaultLook(m.id), look || {});
  const prev = m.look; m.look = look;
  m.paintMat.color.set(look.paint);
  if (look.finish === 'matte') { m.paintMat.metalness = 0.0; m.paintMat.roughness = 0.78; m.paintMat.envMapIntensity = 0.25; }
  else if (look.finish === 'chrome') { m.paintMat.metalness = 1.0; m.paintMat.roughness = 0.08; m.paintMat.envMapIntensity = 1.6; }
  else { m.paintMat.metalness = 0.55; m.paintMat.roughness = 0.26; m.paintMat.envMapIntensity = 1.1; }
  if (!prev || prev.stripe !== look.stripe) { m.stripeMesh.geometry.dispose(); m.stripeMesh.geometry = look.stripe ? stripeGeometry(m.spec, look.stripe) : new THREE.BufferGeometry(); }
  m.stripeMesh.material.color.set(look.stripeCol);
  const tints = [0.35, 0.6, 0.8, 0.95];
  m.glassMat.opacity = tints[look.tint ?? 2]; m.glassMat.color.set(look.tint >= 3 ? '#050608' : '#0d1218');
  if (look.underglow) { m.ug.visible = true; m.ugMat.color.set(look.underglow).multiplyScalar(1.6); } else m.ug.visible = false;
  if (!prev || JSON.stringify(prev.plate) !== JSON.stringify(look.plate)) drawPlate(m.plateTex, look.plate);
}

// ---------------------------------------------------------------- simple merged models for traffic / police (instancing)
function simpleCarGeo(kind) {
  const base = kind === 'suv' || kind === 'police' ? CARS.wahsh : kind === 'pickup' ? CARS.abu : CARS.shabah;
  const spec = Object.assign({}, base);
  if (kind === 'van') { Object.assign(spec, { L: 5.0, W: 1.9, R: 0.36, aF: 1.6, aR: -1.5, clear: 0.28, upper: [[-2.48, 0.4], [-2.5, 1.0], [-2.46, 1.05], [1.6, 1.05], [2.3, 0.95], [2.48, 0.7], [2.46, 0.42]], cabin: [[-2.42, 1.04], [-2.4, 2.1], [1.2, 2.12], [2.05, 1.05]], taper: 0.95, head: { u: 2.46, v: 0.8, w: 0.3, h: 0.14, x: 0.65 } }); }
  const g = new Geo(), d = spec.W - 0.12;
  const paint = col('#ffffff'), glass = col('#0b0e12'), blk = col('#0d0d0f');
  const bodyG = extrude(bodyShape(spec), d, 0.05);
  g.addGeo(bodyG, null, paint);
  const cs = new THREE.Shape(); spec.cabin.forEach((p, i) => i ? cs.lineTo(p[0], p[1]) : cs.moveTo(p[0], p[1]));
  const cab = extrude(cs, d - 0.06, 0.03);
  const belt = Math.min(...spec.cabin.map(p => p[1])), top = Math.max(...spec.cabin.map(p => p[1]));
  const P = cab.attributes.position; for (let i = 0; i < P.count; i++) { const t = clamp((P.getY(i) - belt) / (top - belt), 0, 1); P.setX(i, P.getX(i) * lerp(1, spec.taper, t)); }
  cab.computeVertexNormals();
  g.addGeo(cab, null, glass);
  // roof
  const c2 = spec.cabin[1], c3 = spec.cabin[2];
  g.box(0, Math.max(c2[1], c3[1]) - 0.02, -(c2[0] + c3[0]) / 2, (d - 0.06) * spec.taper, 0.06, Math.abs(c3[0] - c2[0]) - 0.1, paint, {});
  const zf = -spec.upper[spec.upper.length - 1][0], zr = -spec.upper[0][0];
  g.box(0, spec.clear, zf + 0.1, spec.W - 0.2, 0.16, 0.2, blk, {}); g.box(0, spec.clear, zr - 0.1, spec.W - 0.2, 0.16, 0.2, blk, {});
  // wheels static
  const wg = new THREE.CylinderGeometry(spec.R, spec.R, 0.24, 12); wg.rotateZ(Math.PI / 2);
  for (const ax of [spec.aF, spec.aR]) for (const sd of [-1, 1]) g.addGeo(wg.clone().translate(sd * (spec.track / 2), spec.R, -ax), null, col('#141414'));
  // lights (emissive)
  const hd = spec.head;
  for (const sd of [-1, 1]) { g.box(sd * hd.x, hd.v - 0.07, zf - 0.02, 0.3, 0.12, 0.05, col('#ffffff'), { em: col('#fff4dd') }); g.box(sd * 0.7, 0.75, zr + 0.02, 0.28, 0.1, 0.05, col('#550000'), { em: col('#a00000') }); }
  if (kind === 'police') {
    // stripe & light bar
    for (const sd of [-1, 1]) g.box(sd * (spec.W / 2 + 0.01), 0.72, 0, 0.02, 0.22, spec.L - 1.0, col('#1446a0'), {});
    g.box(0, 1.9, -0.2, 1.3, 0.16, 0.3, col('#222'), {});
    g.box(-0.35, 2.02, -0.2, 0.55, 0.1, 0.26, col('#2050ff'), { em: col('#1a3aff') });
    g.box(0.35, 2.02, -0.2, 0.55, 0.1, 0.26, col('#ff2020'), { em: col('#ff1010') });
    g.box(0, 1.0, zf - 0.1, 1.2, 0.3, 0.06, col('#111'), {});
  }
  const geo = g.build(false);
  geo.setAttribute('bake', new THREE.BufferAttribute(new Float32Array(g.count * 3), 3));
  geo.userData = { spec };
  return geo;
}
