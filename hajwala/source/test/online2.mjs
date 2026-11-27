import { launch, openGame } from './lib.mjs';
import fs from 'fs';
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 480, height: 270 } });
const mock = fs.readFileSync('mockroom.js', 'utf8');
const A = await openGame(b, { ctx, init: [mock] });
const B = await openGame(b, { ctx, init: [mock] });
for (const P of [A, B]) await P.page.evaluate(() => { const H = window.__H; H.applyQuality('low'); H.SAVE.tutorialDone = true; H.titleContinue(); document.querySelector('#menu').classList.remove('on'); H.startMode('free'); });
// A: move the car on a straight line at 20 m/s, driven by a timer (independent of A's frame rate)
await A.page.evaluate(() => { const H = window.__H, v = H.GAME.player; H.GAME.state = 'pause'; v.pos.set(-200, 0.6, -150); v.vel.set(20, 0, 0); const t0 = performance.now(); setInterval(() => { const t = (performance.now() - t0) / 1000; v.pos.set(-200 + 20 * t, 0.6, -150); H.NET.tick(0.1); }, 100); });
await B.page.bringToFront();
await B.page.waitForTimeout(3000);
const S = await B.page.evaluate(async () => {
  const H = window.__H, out = [];
  for (let i = 0; i < 60; i++) { await new Promise(r => requestAnimationFrame(r)); const r = [...H.NET.peers.values()][0]; if (r && r.model) out.push([performance.now(), r.model.root.position.x, r.model.root.position.z]); }
  return out;
});
// analyse: velocity between consecutive rendered frames
const vs = []; for (let i = 1; i < S.length; i++) { const dt = (S[i][0] - S[i - 1][0]) / 1000; if (dt > 0) vs.push((S[i][1] - S[i - 1][1]) / dt); }
const mean = vs.reduce((a, b) => a + b, 0) / vs.length, sd = Math.sqrt(vs.reduce((a, b) => a + (b - mean) ** 2, 0) / vs.length);
const zdev = Math.max(...S.map(s => Math.abs(s[2] + 150)));
const back = vs.filter(v => v < 0).length;
console.log('frames', S.length, 'B fps≈', (S.length / ((S[S.length - 1][0] - S[0][0]) / 1000)).toFixed(1), 'mean vx', mean.toFixed(1), 'sd', sd.toFixed(2), 'backward steps', back, 'max z deviation', zdev.toFixed(2));
await b.close();
