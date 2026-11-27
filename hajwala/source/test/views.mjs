import { launch, openGame } from './lib.mjs';
const b = await launch();
const { page, errors } = await openGame(b);
await page.evaluate(() => { const H = window.__H; H.CAM.intro && (H.CAM.intro.t = 999); });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/v_title.png' });
await page.evaluate(() => window.__H.titleContinue());
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/v_menu.png' });
await page.evaluate(() => { const H = window.__H; H.UI.closeAll(); document.querySelector('#menu').classList.remove('on'); H.startMode('free'); });
const spots = [['city', -150, -65, Math.PI / 2], ['plaza', -250, -20, -Math.PI / 2], ['round', -100, -110, 0], ['desert', -100, 140, Math.PI], ['camp', 30, 205, Math.PI], ['highway', 195, 100, Math.PI], ['dune', -205, 180, Math.PI], ['gas', 44, 5, 0]];
for (const [n, x, z, h] of spots) {
  await page.evaluate(([x, z, h]) => { const H = window.__H; H.teleport(H.GAME.player, x, z, h); H.CAM.snap = true; }, [x, z, h]);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `shots/v_${n}.png` });
}
const info = await page.evaluate(() => { const H = window.__H; const r = H.GAME.renderer; r.info.autoReset = false; r.info.reset(); r.render(H.GAME.scene, H.GAME.camera); const c = r.info.render.calls; r.info.autoReset = true; return { calls: c, fps: H.fps(), q: H.GAME.quality }; });
console.log(JSON.stringify(info));
console.log(errors.filter(e => !e.includes('GPU stall')).slice(0, 10).join('\n'));
await b.close();
