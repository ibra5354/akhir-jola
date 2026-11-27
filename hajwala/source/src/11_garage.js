// =====================================================================
//  GARAGE (studio scene + shop)
// =====================================================================
const UPG = [
  { k: 'engine', n: 'المحرّك', base: 1500, d: 'قوة أكثر وسرعة قصوى' },
  { k: 'turbo', n: 'التيربو', base: 2200, d: 'دفعة قوية + صوت بلو أوف' },
  { k: 'grip', n: 'الجريب', base: 1200, d: 'كفرات أمسك بالزوايا' },
  { k: 'nitro', n: 'النيترو', base: 1000, d: 'خزان أكبر ودفعة أقوى' },
  { k: 'susp', n: 'التعليق', base: 900, d: 'ثبات أكثر بالقفزات' },
];
const CAR_MUL = { abu: 0.6, shabah: 1, wahsh: 1.1, sarookh: 1.3 };
function carSave(id) { SAVE.cars[id] ||= { ups: {}, look: defaultLook(id) }; SAVE.cars[id].look = Object.assign(defaultLook(id), SAVE.cars[id].look); return SAVE.cars[id]; }
function upgCost(id, k, lvl) { const u = UPG.find(x => x.k === k); return Math.round(u.base * (lvl + 1) * CAR_MUL[id] / 50) * 50; }
function carStats(id, ups) {
  const p = computePhys(id, ups);
  return [
    ['السرعة', clamp(p.vmax / 300, 0, 1)],
    ['التسارع', clamp(p.power / p.mass / 320, 0, 1)],
    ['الجريب', clamp((p.grip - 0.8) / 0.45, 0, 1)],
    ['التفحيط', clamp(((1 - p.tail) * 2.6 + (p.drive === 'awd' ? -0.25 : 0.25)) * p.driftAssist * 0.9, 0, 1)],
    ['البر', clamp((p.sandMul * (p.drive === 'awd' ? 1.25 : 0.85) + (CARS[id].clear - 0.2) * 0.8) / 1.5, 0, 1)],
  ];
}
const GARAGE = { scene: null, cam: null, model: null, sel: 'abu', tab: 'perf', rot: 0, drag: null, open: false };
function buildGarageScene() {
  const sc = new THREE.Scene(); GARAGE.scene = sc;
  sc.background = new THREE.Color('#07080d');
  sc.fog = new THREE.Fog('#07080d', 14, 30);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#0b0c10', roughness: 0.25, metalness: 0.6, envMap: ENVMAP, envMapIntensity: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.18, 64), new THREE.MeshStandardMaterial({ color: '#1a1c22', roughness: 0.35, metalness: 0.7, envMap: ENVMAP }));
  plat.position.y = 0.09; plat.receiveShadow = true; sc.add(plat); GARAGE.plat = plat;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.72, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.9, 0.2), toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.17; sc.add(ring);
  // light strips on back wall
  for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 5.5, 0.08), new THREE.MeshBasicMaterial({ color: k % 2 ? new THREE.Color(0.3, 1.2, 2.2) : new THREE.Color(2.2, 0.9, 0.2), toneMapped: false })); const a = -0.9 + k * 0.3; s.position.set(Math.sin(a) * 11, 2.75, -Math.cos(a) * 11); sc.add(s); }
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.2, 7, 48, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ color: '#101218', side: THREE.BackSide, roughness: 0.9 }));
  wall.position.set(0, 3.5, 0); wall.rotation.y = Math.PI; sc.add(wall);
  sc.add(new THREE.HemisphereLight('#8090b0', '#100808', 0.6));
  const key = new THREE.SpotLight('#fff3e0', 260, 30, 0.6, 0.6, 1.4); key.position.set(4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); sc.add(key); sc.add(key.target);
  const rim1 = new THREE.SpotLight('#ff8a30', 70, 25, 0.5, 0.8, 1.4); rim1.position.set(-6, 5, -4); sc.add(rim1); sc.add(rim1.target);
  const rim2 = new THREE.SpotLight('#40c8ff', 90, 25, 0.5, 0.8, 1.4); rim2.position.set(6, 5, -4); sc.add(rim2); sc.add(rim2.target);
  const top = new THREE.RectAreaLight ? null : null;
  GARAGE.cam = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
}
function garageShow(id) {
  if (GARAGE.model) { GARAGE.scene.remove(GARAGE.model.root); GARAGE.model.dispose(); }
  const cs = carSave(id);
  const m = buildCarModel(id, { beams: false }); m.setLook(cs.look); m.setLights(true);
  m.root.position.set(0, CARS[id].phys.cgH + 0.18, 0); m.body.position.y = -CARS[id].phys.cgH;
  // wheel matrices static
  const s = CARS[id], ph = CARS[id].phys;
  [[1, 1], [1, 0], [0, 1], [0, 0]].forEach(([f, l], k) => { _q1.setFromEuler(new THREE.Euler(0, l ? Math.PI : 0, 0)); _m4.compose(V3((l ? -1 : 1) * s.track / 2, s.R - ph.cgH, -(f ? s.aF : s.aR)), _q1, V3(1, 1, 1)); m.wheels.setMatrixAt(k, _m4); });
  m.wheels.instanceMatrix.needsUpdate = true;
  m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  GARAGE.scene.add(m.root); GARAGE.model = m; GARAGE.sel = id;
}
function openGarage() {
  GAME.state = 'garage'; GARAGE.open = true; GARAGE.sel = SAVE.car; GARAGE.tab = 'perf';
  garageShow(SAVE.car); UI.closeAll(); UI.showHUD(false); UI.garage(); AUDIO.silenceCar();
}
function closeGarage() {
  GARAGE.open = false; $('#garage').classList.remove('on');
  // apply selected car to player
  setPlayerCar(SAVE.car);
  GAME.state = 'play'; UI.showHUD(true);
  if (!GAME.mode || GAME.mode.id !== 'free') startMode('free');
  const g = WORLD.garageZone; teleport(GAME.player, g.x, g.z - 6, 0);
}
function garageUpdate(dt) {
  if (!GARAGE.model) return;
  if (!GARAGE.drag) GARAGE.rot += dt * 0.35;
  GARAGE.model.root.rotation.y = GARAGE.rot; GARAGE.plat.rotation.y = GARAGE.rot;
  const c = GARAGE.cam, w = innerWidth, h = innerHeight; c.aspect = w / h;
  const side = $('.gside'), sr = side ? side.getBoundingClientRect() : { width: 0, height: 0, top: 0 };
  const narrow = w <= 820 && h > 500;
  // shift the rendered image so the car sits in the free area (left of the side panel, or above it on narrow screens)
  const ox = narrow ? 0 : (sr.width + 28) / 2, oy = narrow ? (h - sr.top) / 2 + 10 : 0;
  c.setViewOffset(w, h, ox, oy, w, h);
  const dist = narrow ? 11.5 : 9.4 + Math.max(0, (1.6 - w / h)) * 3 + (h < 500 ? 2.2 : 0);
  c.fov = 34; c.position.set(Math.sin(0.55) * dist, 2.4, Math.cos(0.55) * dist);
  c.lookAt(0, 0.75, 0); c.updateProjectionMatrix();
}
