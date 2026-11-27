import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page, errors } = await openGame(b);
const res = await page.evaluate(() => {
  const H = window.__H, { Vehicle, THREE, W } = H;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const dt = 1 / 60;
  const out = {};
  function mk(id, ups) { const v = new Vehicle(id, { ups: ups || {}, beams: false }); return v; }
  // ---- top speed per car (highway loop)
  for (const id of ['abu', 'shabah', 'wahsh', 'sarookh']) {
    const v = mk(id); v.reset(V3(195, 0, -330), Math.PI);
    let vmax = 0, t = 0;
    for (let i = 0; i < 60 * 70; i++) { v.input.throttle = 1; v.input.steer = 0; v.step(dt); t += dt; if (v.pos.z > 290) { v.reset(V3(195, 0, -330), Math.PI, true); v.vel.set(0, 0, v.speed); } vmax = Math.max(vmax, v.speed * 3.6); }
    // 0-100
    const v2 = mk(id); v2.reset(V3(195, 0, -330), Math.PI); let t100 = null;
    for (let i = 0; i < 60 * 30; i++) { v2.input.throttle = 1; v2.step(dt); if (!t100 && v2.speed * 3.6 >= 100) { t100 = (i + 1) * dt; break; } }
    out['top_' + id] = Math.round(vmax); out['t100_' + id] = t100 && +t100.toFixed(2);
  }
  // ---- donut drift test in plaza
  for (const id of ['shabah', 'sarookh', 'abu', 'wahsh']) {
    const P = W.PLAZA, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
    const v = mk(id); v.reset(V3(cx - 25, 0, cz + 5), -Math.PI / 2); // facing +x
    let best = 0, cur = 0, maxAng = 0, minSpd = 99, trace = [];
    for (let i = 0; i < 60 * 14; i++) {
      const t = i * dt; const inp = v.input;
      if (t < 2.2) { inp.throttle = 1; inp.steer = 0; inp.hand = 0; }
      else if (t < 2.6) { inp.throttle = 0.6; inp.steer = 1; inp.hand = 1; }
      else {
        // hold-angle controller: target 45 deg
        const b = v.slipAngle; inp.hand = 0; const bt = -0.75;
        inp.steer = Math.max(-1, Math.min(1, 2.6 * (b - bt)));
        inp.throttle = b < -1.1 ? 0.5 : 1;
      }
      v.step(dt);
      const ang = Math.abs(v.slipAngle) * 180 / Math.PI;
      if (t > 2.6) { if (ang > 35 && v.speed > 5) { cur += dt; best = Math.max(best, cur); } else cur = 0; maxAng = Math.max(maxAng, ang); }
      if (i % 30 === 0) trace.push([+t.toFixed(1), Math.round(ang), Math.round(v.speed * 3.6)]);
    }
    out['drift_' + id] = { held35: +best.toFixed(2), maxAng: Math.round(maxAng), trace: trace.slice(4, 22).map(x => x.join('/')).join(' ') };
  }
  // ---- big dune
  const B = W.BIGDUNE;
  const climb = (id, z0, secs) => { const v = mk(id); v.reset(V3(B.x, 0, z0), Math.PI); let maxY = -1, reached = null; for (let i = 0; i < 60 * secs; i++) { v.input.throttle = 1; v.input.steer = 0; const dx = B.x - v.pos.x; v.input.steer = Math.max(-1, Math.min(1, -dx * 0.05)); v.step(dt); maxY = Math.max(maxY, v.pos.y - v.ph.cgH); if (!reached && Math.hypot(v.pos.x - B.x, v.pos.z - B.z) < 9 && v.pos.y > B.h - 3) reached = +(i * dt).toFixed(1); } return { maxY: +maxY.toFixed(1), reached }; };
  out.dune_wahsh_base = climb('wahsh', B.z - 68, 30);
  out.dune_abu_base = climb('abu', B.z - 72, 30);
  out.dune_abu_runup = climb('abu', 26, 45); out.dune_shabah_runup = climb('shabah', 26, 40);
  out.dune_shabah_base = climb('shabah', B.z - 68, 30);
  out.dune_sarookh_base = climb('sarookh', B.z - 68, 30);
  return out;
});
console.log(JSON.stringify(res, null, 1));
console.log('ERR', errors.filter(e => !e.includes('GPU stall')).slice(0, 10).join('\n'));
await b.close();
