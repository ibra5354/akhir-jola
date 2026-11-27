import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page } = await openGame(b);
const res = await page.evaluate(() => {
  const H = window.__H, { Vehicle, THREE, W } = H; const V3 = (x, y, z) => new THREE.Vector3(x, y, z); const dt = 1 / 60; const out = {};
  H.TESTFLAG.flat = true; const cx = 0, cz = 0;
  for (const id of ['shabah', 'sarookh', 'abu', 'wahsh']) for (const style of ['pd', 'donut', 'assist']) {
    const v = new Vehicle(id, { beams: false }); v.reset(V3(cx - 25, 0, cz + 5), -Math.PI / 2);
    if (style === 'assist') v.assist = true;
    let best = 0, cur = 0, tr = [], lb = 0;
    for (let i = 0; i < 60 * 14; i++) {
      const t = i * dt, inp = v.input, b = v.slipAngle, db = (b - lb) / dt; lb = b;
      if (t < 2.2) { inp.throttle = 1; inp.steer = 0; inp.hand = 0; }
      else if (t < 2.6) { inp.throttle = 0.7; inp.steer = 1; inp.hand = 1; }
      else if (style === 'pd') { inp.hand = 0; inp.steer = Math.max(-1, Math.min(1, 2.4 * (b + 0.75) + 0.35 * db)); inp.throttle = 1; }
      else if (style === 'donut') { inp.hand = 0; inp.steer = 1; inp.throttle = 1; }
      else { inp.hand = 0; inp.steer = 0.35; inp.throttle = 1; }
      v.step(dt);
      // keep inside plaza: wrap teleport (preserve state)
      const ang = Math.abs(v.slipAngle) * 57.3;
      if (t > 2.6) { if (ang > 35 && v.speed > 5) { cur += dt; best = Math.max(best, cur); } else cur = 0; }
      if (i % 30 === 0 && t > 2) tr.push(Math.round(ang) + '/' + Math.round(v.speed * 3.6));
    }
    out[id + '_' + style] = best.toFixed(1) + '  ' + tr.slice(0, 22).join(' ');
  }
  return out;
});
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(16), v);
await b.close();
