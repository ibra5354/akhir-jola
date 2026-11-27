import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page, errors } = await openGame(b, { viewport: { width: 1280, height: 720 } });
await page.evaluate(() => { const H = window.__H; H.SAVE.settings.quality = 'high'; H.applyQuality('high'); H.SAVE.tutorialDone = true; H.titleContinue(); document.querySelector('#menu').classList.remove('on'); });
const views = [
  ['plaza_drift', () => { const H = window.__H; H.startMode('drift'); }],
  ['race_city', () => { const H = window.__H; H.startMode('race', { track: 0 }); }],
  ['roundabout', () => { const H = window.__H; H.startMode('free'); H.teleport(H.GAME.player, -100, -100, 0); }],
  ['overview_city', () => { const H = window.__H; H.startMode('free'); H.teleport(H.GAME.player, 0, -180, Math.PI / 2); H.CAM.mode = 0; }],
  ['patrol', () => { const H = window.__H; H.startMode('patrol'); }],
];
for (const [n, f] of views) {
  await page.evaluate(f);
  await page.waitForTimeout(4500);
  const r = await page.evaluate(() => {
    const H = window.__H, R = H.GAME.renderer; R.info.autoReset = false; R.info.reset();
    const t0 = performance.now(); for (let i = 0; i < 10; i++) H.sim(1 / 60); const simMs = (performance.now() - t0) / 10;
    R.info.reset(); const t1 = performance.now(); H.renderFrame(); const gl = R.getContext(); gl.finish(); const rMs = performance.now() - t1;
    const out = { calls: R.info.render.calls, tris: R.info.render.triangles, simMs: +simMs.toFixed(2), renderMsSwiftshader: +rMs.toFixed(0), q: H.GAME.quality, veh: H.GAME.vehicles.length };
    R.info.autoReset = true; return out;
  });
  console.log(n.padEnd(14), JSON.stringify(r));
  await page.screenshot({ path: `shots/perf_${n}.png` });
}
console.log('errors:', errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver')).slice(0, 8).join('\n'));
await b.close();
