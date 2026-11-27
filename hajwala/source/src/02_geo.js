// =====================================================================
//  GEOMETRY BUILDER + SHARED MATERIALS / TEXTURES
// =====================================================================
const U = { uLamp: { value: 1 }, uTime: { value: 0 }, uDawn: { value: 0 } };

class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.e = []; }
  get count() { return this.p.length / 3; }
  v(x, y, z, nx, ny, nz, col, u = 0, w = 0, em) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); this.uv.push(u, w);
    if (em) this.e.push(em.r, em.g, em.b); else this.e.push(0, 0, 0);
  }
  // rectangle: o corner, a & b edge vectors (arrays), normal = a x b direction (must face outward)
  rect(o, a, b, col, opt = {}) {
    const su = Math.max(1, opt.su || 1), sv = Math.max(1, opt.sv || 1);
    const nx = a[1] * b[2] - a[2] * b[1], ny = a[2] * b[0] - a[0] * b[2], nz = a[0] * b[1] - a[1] * b[0];
    const nl = Math.hypot(nx, ny, nz) || 1;
    const N = [nx / nl, ny / nl, nz / nl];
    const la = Math.hypot(...a), lb = Math.hypot(...b);
    const uvf = opt.uv || ((s, t) => [s * la / (opt.uvs || 4), t * lb / (opt.uvs || 4)]);
    const P = (s, t) => [o[0] + a[0] * s + b[0] * t, o[1] + a[1] * s + b[1] * t, o[2] + a[2] * s + b[2] * t];
    for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
      const s0 = i / su, s1 = (i + 1) / su, t0 = j / sv, t1 = (j + 1) / sv;
      const q = [[s0, t0], [s1, t0], [s1, t1], [s0, t1]];
      const ord = [0, 1, 2, 0, 2, 3];
      for (const k of ord) { const [s, t] = q[k]; const p = P(s, t); const uv = uvf(s, t); this.v(p[0], p[1], p[2], N[0], N[1], N[2], col, uv[0], uv[1], opt.em); }
    }
  }
  // axis-aligned (or rotY) box. (x,z) center, y bottom
  box(x, y, z, sx, sy, sz, col, opt = {}) {
    const hx = sx / 2, hz = sz / 2, ry = opt.ry || 0, c = Math.cos(ry), s = Math.sin(ry);
    const R = (px, pz) => [x + px * c + pz * s, z - px * s + pz * c];
    const sub = opt.sub || 0;
    const sd = (len) => sub ? Math.max(1, Math.round(len / sub)) : 1;
    const svy = sub ? Math.max(1, Math.round(sy / sub)) : 1;
    const top = opt.top ?? col, side = opt.side ?? col;
    const corner = (px, py, pz) => { const r = R(px, pz); return [r[0], py, r[1]]; };
    const vec = (px, py, pz) => [px * c + pz * s, py, -px * s + pz * c];
    const em = opt.em, sopt = (len) => ({ su: sd(len), sv: svy, em, uvs: opt.uvs, uv: opt.uvf ? opt.uvf(len, sy) : undefined });
    // +z face
    if (!opt.noSides) {
      this.rect(corner(-hx, y, hz), vec(sx, 0, 0), vec(0, sy, 0), side, sopt(sx));
      this.rect(corner(hx, y, -hz), vec(-sx, 0, 0), vec(0, sy, 0), side, sopt(sx));
      this.rect(corner(hx, y, hz), vec(0, 0, -sz), vec(0, sy, 0), side, sopt(sz));
      this.rect(corner(-hx, y, -hz), vec(0, 0, sz), vec(0, sy, 0), side, sopt(sz));
    }
    if (opt.top !== false) this.rect(corner(-hx, y + sy, hz), vec(sx, 0, 0), vec(0, 0, -sz), top, { su: sd(sx), sv: sd(sz), em: opt.emTop ?? em, uvs: opt.uvs });
    if (opt.bottom) this.rect(corner(-hx, y, -hz), vec(sx, 0, 0), vec(0, 0, sz), side, {});
  }
  // vertical cylinder / cone. y bottom
  cyl(x, y, z, rb, rt, h, seg, col, opt = {}) {
    const cap = opt.cap ?? true;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const sl = (rb - rt) / h, nl = Math.hypot(1, sl);
      const n0 = [c0 / nl, sl / nl, s0 / nl], n1 = [c1 / nl, sl / nl, s1 / nl];
      const A = [x + c0 * rb, y, z + s0 * rb], B = [x + c1 * rb, y, z + s1 * rb], C = [x + c1 * rt, y + h, z + s1 * rt], D = [x + c0 * rt, y + h, z + s0 * rt];
      const pts = [[A, n0], [C, n1], [B, n1], [A, n0], [D, n0], [C, n1]];
      for (const [p, n] of pts) this.v(p[0], p[1], p[2], n[0], n[1], n[2], col, 0, 0, opt.em);
      if (cap && rt > 0) { this.v(x, y + h, z, 0, 1, 0, opt.capCol || col, 0, 0, opt.em); this.v(C[0], C[1], C[2], 0, 1, 0, opt.capCol || col, 0, 0, opt.em); this.v(D[0], D[1], D[2], 0, 1, 0, opt.capCol || col, 0, 0, opt.em); }
    }
  }
  // merge a THREE.BufferGeometry with matrix & color
  addGeo(g, mat, col, em) {
    const gg = g.index ? g.toNonIndexed() : g;
    if (mat) gg.applyMatrix4(mat);
    if (!gg.attributes.normal) gg.computeVertexNormals();
    const P = gg.attributes.position, N = gg.attributes.normal, UV = gg.attributes.uv, CC = gg.attributes.color;
    for (let i = 0; i < P.count; i++) {
      const cc = CC ? { r: CC.getX(i) * col.r, g: CC.getY(i) * col.g, b: CC.getZ(i) * col.b } : col;
      this.v(P.getX(i), P.getY(i), P.getZ(i), N.getX(i), N.getY(i), N.getZ(i), cc, UV ? UV.getX(i) : 0, UV ? UV.getY(i) : 0, em);
    }
  }
  build(withBake = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('emv', new THREE.Float32BufferAttribute(this.e, 3));
    if (withBake) bakeLighting(g);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
const col = (hex) => new THREE.Color(hex);
const colMul = (c, k) => new THREE.Color(c.r * k, c.g * k, c.b * k);

// ---------------------------------------------------------------- baked lamp lighting
const LAMPGRID = { C: 32, ORG: -384, N: 24, cells: null };
function lampGridBuild() {
  LAMPGRID.cells = Array.from({ length: LAMPGRID.N ** 2 }, () => []);
  for (const L of W.lamps) {
    const r = L.range;
    const i0 = clamp(Math.floor((L.x - r - LAMPGRID.ORG) / LAMPGRID.C), 0, LAMPGRID.N - 1), i1 = clamp(Math.floor((L.x + r - LAMPGRID.ORG) / LAMPGRID.C), 0, LAMPGRID.N - 1);
    const j0 = clamp(Math.floor((L.z - r - LAMPGRID.ORG) / LAMPGRID.C), 0, LAMPGRID.N - 1), j1 = clamp(Math.floor((L.z + r - LAMPGRID.ORG) / LAMPGRID.C), 0, LAMPGRID.N - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) LAMPGRID.cells[j * LAMPGRID.N + i].push(L);
  }
}
function lampLightAt(px, py, pz, nx, ny, nz, out) {
  out[0] = out[1] = out[2] = 0;
  const i = Math.floor((px - LAMPGRID.ORG) / LAMPGRID.C), j = Math.floor((pz - LAMPGRID.ORG) / LAMPGRID.C);
  if (i < 0 || j < 0 || i >= LAMPGRID.N || j >= LAMPGRID.N) return out;
  for (const L of LAMPGRID.cells[j * LAMPGRID.N + i]) {
    const dx = L.x - px, dy = L.y - py, dz = L.z - pz, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > L.range * L.range) continue;
    const d = Math.sqrt(d2) + 1e-4;
    let lam = (dx * nx + dy * ny + dz * nz) / d; lam = Math.max(0, lam) * 0.85 + 0.15;
    const att = L.i / (1 + d2 / (L.r0 * L.r0)) * (1 - smooth(L.range * 0.55, L.range, d));
    out[0] += L.r * att * lam; out[1] += L.g * att * lam; out[2] += L.b * att * lam;
  }
  out[0] = Math.min(out[0], 2.2); out[1] = Math.min(out[1], 2.0); out[2] = Math.min(out[2], 2.0);
  return out;
}
function bakeLighting(g) {
  const P = g.attributes.position, N = g.attributes.normal, n = P.count, arr = new Float32Array(n * 3), o = [0, 0, 0];
  if (LAMPGRID.cells) for (let k = 0; k < n; k++) {
    lampLightAt(P.getX(k), P.getY(k), P.getZ(k), N.getX(k), N.getY(k), N.getZ(k), o);
    arr[k * 3] = o[0]; arr[k * 3 + 1] = o[1]; arr[k * 3 + 2] = o[2];
  }
  g.setAttribute('bake', new THREE.BufferAttribute(arr, 3));
}

// ---------------------------------------------------------------- world material
function worldMat(opt = {}) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.92, metalness: 0.0 }, opt));
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLamp = U.uLamp;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 emv;\nattribute vec3 bake;\nvarying vec3 vEmv;\nvarying vec3 vBake;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEmv = emv; vBake = bake;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEmv;\nvarying vec3 vBake;\nuniform float uLamp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uLamp;\ntotalEmissiveRadiance += vEmv * (0.35 + 0.65*uLamp) + vBake * (diffuseColor.rgb * 1.3 + vec3(0.03)) * uLamp;');
  };
  return m;
}

// ---------------------------------------------------------------- canvas textures
function canvasTex(w, h, draw, opt = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opt.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opt.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  if (opt.nearest) { t.magFilter = THREE.NearestFilter; }
  t._cv = cv;
  return t;
}
const TEX = {};
function buildTextures() {
  const R = mulberry(77);
  // window facade: 16 x 32 cells of 32px
  const lit = [];
  for (let i = 0; i < 16 * 32; i++) { const r = R(); lit.push(r < 0.30 ? 1 + Math.floor(R() * 4) : 0); }
  const drawWin = (em) => (g, w, h) => {
    const cw = w / 16, ch = h / 32;
    g.fillStyle = em ? '#000' : '#e9e2d6'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 32; j++) for (let i = 0; i < 16; i++) {
      const L = lit[j * 16 + i], x = i * cw, y = j * ch;
      const style = (Math.floor(j / 4) + Math.floor(i / 2)) % 3;
      const ww = style === 0 ? cw * 0.56 : cw * 0.66, wh = ch * 0.6;
      const ox = x + (cw - ww) / 2, oy = y + ch * 0.18;
      if (!em) {
        g.fillStyle = '#cfc6b8'; g.fillRect(x, y + ch * 0.86, cw, ch * 0.14);  // floor slab line
        g.fillStyle = '#3c4048'; g.fillRect(ox - 2, oy - 2, ww + 4, wh + 4);
        g.fillStyle = L ? '#9a8a60' : '#20252e'; g.fillRect(ox, oy, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(ox, oy, ww * 0.4, wh);
        if (style === 2) { g.fillStyle = '#6b5a45'; for (let k = 0; k < 4; k++) g.fillRect(ox + k * ww / 4, oy, 1.5, wh); } // mashrabiya hint
      } else if (L) {
        const cols = ['#ffcf7a', '#ffe7b0', '#d8ecff', '#7fb0ff'];
        g.fillStyle = cols[L - 1]; g.fillRect(ox, oy, ww, wh);
        if (R() < 0.5) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(ox, oy, ww * (0.3 + R() * 0.4), wh); } // curtain
      }
    }
  };
  TEX.win = canvasTex(512, 1024, drawWin(false), { repeat: true });
  TEX.winEm = canvasTex(512, 1024, drawWin(true), { repeat: true });
  // radial glow
  TEX.glow = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  // soft smoke puff
  TEX.puff = canvasTex(128, 128, (g, w) => {
    const r = mulberry(5);
    for (let k = 0; k < 14; k++) {
      const x = w / 2 + (r() - 0.5) * w * 0.35, y = w / 2 + (r() - 0.5) * w * 0.35, rad = w * (0.18 + r() * 0.2);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }
  });
  // noise detail (sand ripples / asphalt)
  TEX.sand = canvasTex(256, 256, (g, w) => {
    const im = g.createImageData(w, w), r = mulberry(11);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const rip = Math.sin((x * 0.7 + y * 0.25 + Math.sin(y * 0.09) * 6) * 0.42) * 0.5 + 0.5;
      const v = 200 + rip * 40 + (r() - 0.5) * 26;
      const k = (y * w + x) * 4; im.data[k] = v; im.data[k + 1] = v * 0.97; im.data[k + 2] = v * 0.93; im.data[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }, { repeat: true });
  TEX.asph = canvasTex(256, 256, (g, w) => {
    const im = g.createImageData(w, w), r = mulberry(12);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const v = 205 + (r() - 0.5) * 70 + (vnoise(x * 0.05, y * 0.05) - 0.5) * 30;
      const k = (y * w + x) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = clamp(v, 0, 255); im.data[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }, { repeat: true });
}

// neon sign atlas
const SIGN_NAMES = [
  ['بقالة البركة', '#3fe0ff'], ['شاورما الطعس', '#ff9a3c'], ['كرك المسا', '#ffd23f'], ['كوفي ليوان', '#ff5fa8'],
  ['بنشر الفزعة', '#7dff6a'], ['مطعم الديرة', '#ff6a4d'], ['حلويات السنابل', '#ffb3e6'], ['كرك وزعتر', '#ffcc33'],
  ['مغسلة الريان', '#59c3ff'], ['بوفية الشباب', '#ff8c42'], ['عطور الوجيه', '#c49bff'], ['جوالات النخبة', '#45f0c0'],
  ['كوفي سهيل', '#ff7ad1'], ['بقالة الحارة', '#4de1ff'], ['مندي الربع', '#ffae3c'], ['كراج الهجولة', '#ff7b1c'],
  ['ساحة التفحيط', '#ff7b1c'], ['وقود الديرة', '#29d2ff'], ['هجولة', '#ff7b1c'], ['الكشتة', '#ffcf66'],
  ['حي الهجولة', '#7fe3ff'], ['الطريق السريع', '#59ff9a'], ['البر ⟵', '#ffcf66'], ['تموينات النسيم', '#7affd8']
];
function buildSignAtlas() {
  // 4 cols x 6 rows, 512x160 each => 2048x960 (use 1024 tall)
  TEX.signs = canvasTex(2048, 1024, (g) => {
    g.fillStyle = '#05060a'; g.fillRect(0, 0, 2048, 1024);
    SIGN_NAMES.forEach(([t, c], k) => {
      const i = k % 4, j = Math.floor(k / 4), x = i * 512, y = j * 160;
      g.fillStyle = '#0b0d16'; g.fillRect(x + 6, y + 6, 500, 148);
      g.strokeStyle = c; g.lineWidth = 5; g.shadowColor = c; g.shadowBlur = 18; g.strokeRect(x + 16, y + 16, 480, 128);
      g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `82px ${FONT_AR}`; g.fillStyle = '#fff'; g.shadowBlur = 26;
      g.fillText(t, x + 256, y + 84, 450);
      g.shadowBlur = 8; g.fillStyle = c; g.globalAlpha = 0.55; g.fillText(t, x + 256, y + 84, 450); g.globalAlpha = 1;
      g.shadowBlur = 0;
    });
  });
}
function signUV(k) { const i = k % 4, j = Math.floor(k / 4); return { u0: i / 4, u1: (i + 1) / 4, v0: 1 - (j * 160 + 160) / 1024, v1: 1 - (j * 160) / 1024 }; }
