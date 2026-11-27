import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _v1 = V3(), _v2 = V3(), _v3 = V3(), _v4 = V3(), _q1 = new THREE.Quaternion(), _m4 = new THREE.Matrix4();
const ID = THREE.MathUtils.generateUUID;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
let rnd = mulberry(1407);
const rr = (a, b) => a + (b - a) * rnd();
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];

// value noise 2D (deterministic)
const NOISE_P = new Uint8Array(512);
{ const r = mulberry(99); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) NOISE_P[i] = p[i & 255]; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => NOISE_P[(NOISE_P[(i & 255)] + j) & 511] / 255;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }

// ---------------------------------------------------------------- persistence
const SAVE_KEY = 'hajwala.save.v1';
const DEFAULT_SAVE = () => ({
  money: 2500, owned: ['abu'], car: 'abu', nick: '',
  cars: {}, // per-car upgrades & looks
  cups: [], jumps: [], best: { drift: 0, races: {}, dune: {}, patrol: 0 }, ghosts: {},
  settings: { quality: 'auto', music: true, sfx: 0.9, musicVol: 0.5, assist: true, gyro: false, cam: 0, dawnCycle: false, sens: 1, invertGyro: false },
  tutorialDone: false, stats: { distance: 0, drifts: 0 }
});
let SAVE = DEFAULT_SAVE();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const d = JSON.parse(raw); const def = DEFAULT_SAVE(); SAVE = Object.assign(def, d); SAVE.settings = Object.assign(def.settings, d.settings || {}); SAVE.best = Object.assign(def.best, d.best || {}); }
  } catch (e) { SAVE = DEFAULT_SAVE(); }
}
let _saveT = 0;
function persist(now = false) {
  if (!now) { _saveT = 0.6; return; }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { }
}
function saveTick(dt) { if (_saveT > 0) { _saveT -= dt; if (_saveT <= 0) persist(true); } }
loadSave();

// ---------------------------------------------------------------- env flags
const IS_TOUCH = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer:coarse)').matches;
const TEST = !!window.__HAJ_TEST;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = n => Math.round(n).toLocaleString('ar-SA');
const fmtEn = n => Math.round(n).toLocaleString('en-US');
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toAr = s => String(s).replace(/[0-9]/g, d => AR_DIGITS[+d]);
const fmtTime = t => { if (!isFinite(t)) return '--:--'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };

// font used on canvases
const FONT_AR = "'Lalezar','Cairo','Tahoma',sans-serif";
const FONT_UI = "'Cairo','Tahoma',sans-serif";

// simple event bus
const BUS = { h: {}, on(e, f) { (this.h[e] ||= []).push(f); }, emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); } };
