import { launch, openGame } from './lib.mjs';
import fs from 'fs';
const minutes = +(process.argv[2] || 5);
const modes = (process.argv[3] || 'free,drift,race,patrol,dune').split(',');
const b = await launch();
const { page, errors } = await openGame(b, { viewport: { width: 640, height: 360 }, init: [fs.readFileSync('vclock.js', 'utf8'), fs.readFileSync('bot.js', 'utf8')] });
await page.evaluate(() => { window.__renderEvery = 4; const H = window.__H; H.applyQuality('low'); H.SAVE.settings.quality = 'low'; H.SAVE.tutorialDone = true; });
await page.evaluate(() => window.__pump(60));
await page.evaluate(() => { window.__H.titleContinue(); document.querySelector('#menu').classList.remove('on'); });
const report = {};
for (const md of modes) {
  const opt = md.startsWith('race') ? { track: +(md.split(':')[1] || 0) } : md.startsWith('dune') ? { sub: md.split(':')[1] || 'climb' } : {};
  const id = md.split(':')[0];
  await page.evaluate(([id, opt]) => { window.__wantMode = id; window.__stats.events = []; window.__stats.fall = 0; window.__stats.stuck = 0; window.__H.startMode(id, opt); }, [id, opt]);
  const frames = Math.round(minutes * 60 * 20);
  const t0 = Date.now(); let st;
  for (let f = 0; f < frames; f += 200) { st = await page.evaluate(() => window.__pump(200)); await page.waitForTimeout(30); }
  const info = await page.evaluate(() => { const H = window.__H, v = H.GAME.player; return { mode: H.GAME.mode && H.GAME.mode.id, pos: [v.pos.x, v.pos.y, v.pos.z].map(x => +x.toFixed(1)), money: H.SAVE.money, cups: H.SAVE.cups.length, best: H.SAVE.best }; });
  await page.screenshot({ path: `shots/long_${md.replace(':', '_')}.png` });
  report[md] = { realSec: Math.round((Date.now() - t0) / 1000), fall: st.fall, stuck: st.stuck, events: st.events.slice(0, 12), ...info };
  console.log(md, JSON.stringify(report[md]));
}
const errs = errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver'));
console.log('ERRORS (' + errs.length + '):\n' + errs.slice(0, 20).join('\n'));
await b.close();
