import { launch, openGame } from './lib.mjs';
import fs from 'fs';
const b = await launch();
const { page, errors } = await openGame(b, { viewport: { width: 480, height: 270 }, init: [fs.readFileSync('vclock.js', 'utf8')] });
await page.evaluate(() => { window.__renderEvery = 20; const H = window.__H; H.applyQuality('low'); H.SAVE.tutorialDone = true; });
await page.evaluate(() => window.__pump(40));
const r = await page.evaluate(() => {
  const H = window.__H; H.titleContinue(); document.querySelector('#menu').classList.remove('on');
  H.setPlayerCar('shabah'); H.startMode('dune', { sub: 'jump' });
  H.teleport(H.GAME.player, 60, 40, Math.PI);
  H.INPUT.override = { steer: 0, throttle: 1, brake: 0, hand: 0, nitro: 1, horn: false };
  let maxAir = 0, maxY = 0;
  for (let i = 0; i < 260; i++) { window.__pump(1); const v = H.GAME.player; maxAir = Math.max(maxAir, v.airT); maxY = Math.max(maxY, v.pos.y); const dx = 60 - v.pos.x; H.INPUT.override.steer = Math.max(-1, Math.min(1, -dx * 0.08)); }
  const m = H.GAME.mode; return { best: +m.best.toFixed(1), last: +m.last.toFixed(1), maxAir: +maxAir.toFixed(2), maxY: +maxY.toFixed(1), jumpsFound: H.SAVE.jumps };
});
console.log(JSON.stringify(r));
// free roam secret jump detection on the same ramp
const r2 = await page.evaluate(() => {
  const H = window.__H; H.startMode('free'); H.teleport(H.GAME.player, 60, 40, Math.PI);
  H.INPUT.override = { steer: 0, throttle: 1, brake: 0, hand: 0, nitro: 1, horn: false };
  for (let i = 0; i < 260; i++) { window.__pump(1); const v = H.GAME.player; const dx = 60 - v.pos.x; H.INPUT.override.steer = Math.max(-1, Math.min(1, -dx * 0.08)); }
  return { jumps: H.SAVE.jumps, money: H.SAVE.money, cupsGot: H.SAVE.cups };
});
console.log(JSON.stringify(r2));
console.log(errors.filter(e => !e.includes('GPU') && !e.includes('GL Driver')).join('\n'));
await b.close();
