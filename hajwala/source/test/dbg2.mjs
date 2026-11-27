import { launch, openGame } from './lib.mjs';
import fs from 'fs';
const b = await launch();
const { page, errors } = await openGame(b, { viewport: { width: 640, height: 360 }, init: [fs.readFileSync('vclock.js', 'utf8'), fs.readFileSync('bot.js', 'utf8')] });
await page.evaluate(() => { window.__renderEvery = 4; const H = window.__H; H.applyQuality('low'); H.SAVE.tutorialDone = true; });
await page.evaluate(() => window.__pump(60));
await page.evaluate(() => { window.__H.titleContinue(); document.querySelector('#menu').classList.remove('on'); window.__H.startMode('free'); });
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__pump(40));
  console.log(await page.evaluate(() => { const H = window.__H, v = H.GAME.player; return JSON.stringify({ st: H.GAME.state, modal: H.UI.anyModal(), mods: [...document.querySelectorAll('.modal.on')].map(m => m.id), ov: H.INPUT.override, inp: v.input, sp: v.speed.toFixed(2), pos: [v.pos.x.toFixed(1), v.pos.y.toFixed(2), v.pos.z.toFixed(1)], rev: v.reverse, grounded: v.grounded }); }));
}
console.log(errors.slice(0, 5).join('\n'));
await b.close();
