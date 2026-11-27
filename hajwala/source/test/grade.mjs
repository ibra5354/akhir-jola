import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page } = await openGame(b, { viewport: { width: 320, height: 200 } });
const r = await page.evaluate(() => {
  const H = window.__H, out = [];
  for (const tr of H.TRACKS) {
    const cr = new H.THREE.CatmullRomCurve3(tr.pts.map(p => new H.THREE.Vector3(p[0], 0, p[1])), tr.closed, 'centripetal', 0.5);
    const L = cr.getLength(), n = Math.ceil(L / 4); const pts = cr.getSpacedPoints(n);
    let maxG = 0, at = null, hs = [];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i]; const ha = H.groundAt(a.x, a.z, 99).h, hc = H.groundAt(c.x, c.z, 99).h; const g = (hc - ha) / a.distanceTo(c); if (g > maxG) { maxG = g; at = [c.x.toFixed(0), c.z.toFixed(0), hc.toFixed(1)]; } }
    for (let i = 0; i < pts.length; i += 10) hs.push(H.groundAt(pts[i].x, pts[i].z, 99).h.toFixed(0));
    out.push(tr.name + ' len=' + L.toFixed(0) + ' maxGrade=' + (Math.atan(maxG) * 57.3).toFixed(0) + 'deg at ' + at + ' heights: ' + hs.join(','));
  }
  return out;
});
console.log(r.join('\n'));
await b.close();
