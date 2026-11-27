import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page } = await openGame(b);
const res = await page.evaluate(() => {
  const H = window.__H, { Vehicle, THREE } = H; const V3 = (x, y, z) => new THREE.Vector3(x, y, z); const dt = 1 / 60; H.TESTFLAG.flat = true;
  const out = [];
  for (const id of ['sarookh', 'shabah']) {
    const v = new Vehicle(id, { beams: false }); v.reset(V3(0, 0, 0), -Math.PI / 2);
    for (let i = 0; i < 60 * 4; i++) {
      const t = i * dt; const inp = v.input;
      if (t < 2.2) { inp.throttle = 1; inp.steer = 0; } else { inp.throttle = 1; inp.steer = 1; inp.hand = t < 2.6 ? 1 : 0; }
      v.step(dt);
      if (i % 15 === 0 && t > 1.9) out.push(id + ' t=' + t.toFixed(2) + ' spd=' + (v.speed * 3.6).toFixed(0) + ' beta=' + (v.slipAngle * 57.3).toFixed(0) + ' gear=' + v.gear + ' rpm=' + v.rpm.toFixed(0) + ' yaw=' + v.angVel.y.toFixed(2) + ' ' + v.wheels.map(w => `[${w.contact ? 'c' : '-'} L${(w.load / 1000).toFixed(1)} sl${w.slipLat.toFixed(2)} sp${w.spinSlip.toFixed(2)}]`).join(''));
    }
  }
  return out;
});
console.log(res.join('\n'));
await b.close();
