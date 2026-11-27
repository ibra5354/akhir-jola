import { launch, openGame } from './lib.mjs';
const b = await launch();
// ---------- desktop UI
{
  const { page, errors } = await openGame(b, { viewport: { width: 1280, height: 720 } });
  await page.evaluate(() => { const H = window.__H; H.applyQuality('medium'); H.SAVE.money = 99999; H.SAVE.tutorialDone = false; H.CAM.intro && (H.CAM.intro.t = 999); });
  await page.waitForTimeout(800);
  await page.mouse.click(640, 400); // title -> menu
  await page.waitForTimeout(800);
  await page.click('[data-act="modes"]'); await page.waitForTimeout(600); await page.screenshot({ path: 'shots/ui_modes.png' });
  await page.click('#modes [data-close]');
  await page.click('[data-act="settings"]'); await page.waitForTimeout(400); await page.screenshot({ path: 'shots/ui_settings.png' });
  await page.click('#settings [data-close]');
  await page.click('[data-act="online"]'); await page.waitForTimeout(400); await page.screenshot({ path: 'shots/ui_online.png' });
  await page.click('#online [data-close]');
  await page.click('[data-act="garage"]'); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/ui_garage_perf.png' });
  // buy engine upgrade
  const m0 = await page.evaluate(() => window.__H.SAVE.money);
  await page.click('#gPerf [data-u="engine"]'); await page.waitForTimeout(300);
  const m1 = await page.evaluate(() => [window.__H.SAVE.money, window.__H.SAVE.cars.abu.ups.engine]);
  console.log('upgrade money', m0, '->', JSON.stringify(m1));
  // next car & buy
  await page.click('#gNext'); await page.waitForTimeout(800);
  await page.click('#gBuy'); await page.waitForTimeout(300); await page.click('#cfY'); await page.waitForTimeout(500);
  console.log('owned', await page.evaluate(() => JSON.stringify([window.__H.SAVE.owned, window.__H.SAVE.car])));
  await page.click('[data-tab="look"]'); await page.waitForTimeout(300);
  await page.click('#gLook [data-k="paint"] button:nth-child(9)');
  await page.click('#gLook [data-k="stripe"] button:nth-child(2)');
  await page.click('#gLook [data-k="underglow"] button:nth-child(3)');
  await page.click('#gLook [data-k="finish"] button:nth-child(2)');
  await page.fill('#plD', '2024');
  await page.waitForTimeout(1200); await page.screenshot({ path: 'shots/ui_garage_look.png' });
  await page.click('#gBack'); await page.waitForTimeout(1500);
  const st = await page.evaluate(() => ({ state: window.__H.GAME.state, car: window.__H.GAME.player.id, look: window.__H.GAME.player.model.look.paint, tut: !document.querySelector('#tut').hidden }));
  console.log('after garage', JSON.stringify(st));
  // drive with keyboard a bit
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space'); await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shots/ui_drive.png' });
  await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
  const tut = await page.evaluate(() => ({ tutHidden: document.querySelector('#tut').hidden, step: window.__H.UI.tut && window.__H.UI.tut.step, speed: window.__H.GAME.player.speed }));
  console.log('tutorial', JSON.stringify(tut));
  // pause + photo
  await page.keyboard.press('Escape'); await page.waitForTimeout(400); await page.screenshot({ path: 'shots/ui_pause.png' });
  await page.click('[data-p="photo"]'); await page.waitForTimeout(600);
  await page.click('#phF [data-f="cine"]'); await page.waitForTimeout(800); await page.screenshot({ path: 'shots/ui_photo.png' });
  await page.click('#phSave'); await page.waitForTimeout(2500);
  console.log('shot modal', await page.evaluate(() => document.querySelector('#shot').classList.contains('on') && document.querySelector('#shotImg').src.length));
  await page.click('#shotClose'); await page.click('#phExit'); await page.waitForTimeout(300);
  // camera modes
  for (const k of [1, 2]) { await page.keyboard.press('KeyC'); await page.keyboard.down('KeyW'); await page.waitForTimeout(1800); await page.screenshot({ path: `shots/ui_cam${k}.png` }); await page.keyboard.up('KeyW'); }
  await page.keyboard.press('KeyC');
  console.log('desktop errors:', errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver')).slice(0, 10).join('\n'));
  await page.close();
}
// ---------- mobile touch
{
  const { page, errors, ctx } = await openGame(b, { viewport: { width: 844, height: 390 }, touch: true, mobile: true });
  const isTouch = await page.evaluate(() => document.body.classList.contains('touch'));
  console.log('touch mode:', isTouch);
  await page.evaluate(() => { const H = window.__H; H.CAM.intro && (H.CAM.intro.t = 999); });
  await page.waitForTimeout(600);
  await page.touchscreen.tap(400, 200); await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/m_menu.png' });
  await page.touchscreen.tap(...(await page.evaluate(() => { const r = document.querySelector('[data-act="free"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })));
  await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page);
  const gas = await page.evaluate(() => { const r = document.querySelector('#tGas').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  // finger 1 on gas, finger 2 drags steering
  const tp = (pts) => pts.map(([x, y, id]) => ({ x, y, id }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[gas[0], gas[1], 1]]) });
  await page.waitForTimeout(1500);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[gas[0], gas[1], 1], [150, 250, 2]]) });
  for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp([[gas[0], gas[1], 1], [150 + k * 12, 250, 2]]) }); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  const inp = await page.evaluate(() => { const I = window.__H.INPUT; return { src: I.src, throttle: I.throttle, steer: +I.steer.toFixed(2), speed: +window.__H.GAME.player.speed.toFixed(1) }; });
  console.log('touch input while holding gas + dragging right:', JSON.stringify(inp));
  await page.screenshot({ path: 'shots/m_drive.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const inp2 = await page.evaluate(() => { const I = window.__H.INPUT; return { throttle: I.throttle, steer: +I.steer.toFixed(2) }; });
  console.log('after release:', JSON.stringify(inp2));
  const zoom = await page.evaluate(() => [document.querySelector('meta[name=viewport]').content, getComputedStyle(document.body).userSelect || getComputedStyle(document.body).webkitUserSelect, getComputedStyle(document.body).touchAction]);
  console.log('zoom/select guards:', JSON.stringify(zoom));
  console.log('mobile errors:', errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver')).slice(0, 10).join('\n'));
  // portrait
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500); await page.screenshot({ path: 'shots/m_portrait.png' });
}
await b.close();
