import { launch, openGame } from './lib.mjs';
import fs from 'fs';
const b = await launch();
const { page, errors } = await openGame(b, { viewport: { width: 480, height: 270 }, init: [fs.readFileSync('vclock.js', 'utf8'), fs.readFileSync('bot.js', 'utf8')] });
await page.evaluate(() => { window.__renderEvery = 10; const H = window.__H; H.applyQuality('low'); H.SAVE.tutorialDone = true; });
await page.evaluate(() => window.__pump(40));
const tr = +(process.argv[2] || 2);
await page.evaluate((tr) => { window.__H.titleContinue(); document.querySelector('#menu').classList.remove('on'); window.__H.startMode('race', { track: tr }); }, tr);
const N = +(process.argv[3] || 16), PF = +(process.argv[4] || 200);
for (let i = 0; i < N; i++) {
  await page.evaluate((pf) => window.__pump(pf), PF);
  console.log(await page.evaluate(() => { const H = window.__H, m = H.GAME.mode; return 't=' + m.t.toFixed(0) + ' me cp=' + m.cpIdx + '/' + m.cps.length + ' lap=' + m.lap + ' ' + H.GAME.vehicles.map(v => `[${v.isPlayer ? 'ME' : v.id} ${v.pos.x.toFixed(0)},${v.pos.z.toFixed(0)} y${v.pos.y.toFixed(1)} ${(v.speed * 3.6).toFixed(0)}kmh${v.ai ? ' p' + v.ai.prog.toFixed(0) : ''}${v.finished ? ' FIN' : ''}]`).join(' ') + ' len=' + m.path.len.toFixed(0); }));
}
await b.close();
