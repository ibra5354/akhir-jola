import { launch, openGame } from './lib.mjs';
const b = await launch();
{
  const { page, errors } = await openGame(b, { viewport: { width: 1280, height: 720 } });
  await page.evaluate(() => { const H = window.__H; H.SAVE.settings.quality = 'high'; H.applyQuality('high'); H.SAVE.money = 1e6; H.SAVE.owned = ['abu', 'shabah', 'wahsh', 'sarookh']; H.SAVE.tutorialDone = true; });
  // intro mid-flight
  await page.evaluate(() => { const H = window.__H; H.CAM.intro.dur = 10; H.CAM.intro.t = 4.5; });
  await page.waitForTimeout(1200); await page.screenshot({ path: 'shots/t_intro_mid.png' });
  await page.evaluate(() => { window.__H.CAM.intro.t = 9.3; }); await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/t_intro_title.png' });
  await page.evaluate(() => { const H = window.__H; H.CAM.intro && (H.CAM.intro.t = 99); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const H = window.__H; H.titleContinue(); document.querySelector('#menu').classList.remove('on'); });
  // garage cars
  await page.evaluate(() => window.__H.openGarage());
  for (const id of ['abu', 'shabah', 'wahsh', 'sarookh']) { await page.evaluate((id) => { window.__H.GARAGE_SHOW && window.__H.GARAGE_SHOW(id); }, id); await page.waitForTimeout(1600); await page.screenshot({ path: `shots/t_garage_${id}.png` }); }
  await page.evaluate(() => window.__H.closeGarage());
  // drift in plaza with smoke (shabah)
  await page.evaluate(() => { const H = window.__H; H.SAVE.car = 'shabah'; H.setPlayerCar('shabah'); H.startMode('drift'); });
  await page.waitForTimeout(4200);
  await page.evaluate(() => { const H = window.__H; H.INPUT.override = { steer: 0, throttle: 1, brake: 0, hand: 0, nitro: 0, horn: false }; });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const H = window.__H; H.INPUT.override = { steer: 1, throttle: 0.8, brake: 0, hand: 1, nitro: 0, horn: false }; });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const H = window.__H; window.__dI = setInterval(() => { const b = H.GAME.player.slipAngle; H.INPUT.override = { steer: Math.max(-1, Math.min(1, 2.4 * (b + 0.7))), throttle: 1, brake: 0, hand: 0, nitro: 0, horn: false }; }, 30); });
  await page.waitForTimeout(3500); await page.screenshot({ path: 'shots/t_drift1.png' });
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/t_drift2.png' });
  await page.evaluate(() => { clearInterval(window.__dI); window.__H.INPUT.override = null; });
  // dawn
  await page.evaluate(() => { const H = window.__H; H.startMode('free'); H.teleport(H.GAME.player, -100, -110, 0); H.SAVE.settings.dawnCycle = true; H.GAME.t = 230; });
  await page.waitForTimeout(4000); await page.screenshot({ path: 'shots/t_dawn.png' });
  await page.evaluate(() => { const H = window.__H; H.SAVE.settings.dawnCycle = false; });
  // big dune from desert, wahsh
  await page.evaluate(() => { const H = window.__H; H.setPlayerCar('wahsh'); H.teleport(H.GAME.player, -205, 190, Math.PI); });
  await page.waitForTimeout(3500); await page.screenshot({ path: 'shots/t_bigdune.png' });
  // camp with sarookh
  await page.evaluate(() => { const H = window.__H; H.setPlayerCar('sarookh'); H.teleport(H.GAME.player, 30, 236, 0); });
  await page.waitForTimeout(3500); await page.screenshot({ path: 'shots/t_camp.png' });
  // patrol chase
  await page.evaluate(() => { const H = window.__H; H.startMode('patrol'); });
  await page.waitForTimeout(9000); await page.screenshot({ path: 'shots/t_patrol.png' });
  console.log('errors:', errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver')).slice(0, 10).join('\n'));
  await page.close();
}
{
  const { page, errors } = await openGame(b, { viewport: { width: 844, height: 390 }, touch: true, mobile: true });
  await page.evaluate(() => { const H = window.__H; H.CAM.intro && (H.CAM.intro.t = 99); H.SAVE.tutorialDone = true; });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const H = window.__H; H.titleContinue(); document.querySelector('#menu').classList.remove('on'); H.startMode('race', { track: 0 }); });
  await page.waitForTimeout(6000); await page.screenshot({ path: 'shots/t_mobile_race.png' });
  await page.evaluate(() => window.__H.openGarage()); await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/t_mobile_garage.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.__H.closeGarage()); await page.waitForTimeout(800); await page.screenshot({ path: 'shots/t_mobile_portrait.png' });
  console.log('m errors:', errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver')).slice(0, 10).join('\n'));
}
await b.close();
