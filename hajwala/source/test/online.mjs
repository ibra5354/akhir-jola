import { launch, openGame } from './lib.mjs';
import fs from 'fs';
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
const mock = fs.readFileSync('mockroom.js', 'utf8');
const A = await openGame(b, { ctx, init: [mock] });
const B = await openGame(b, { ctx, init: [mock] });
for (const P of [A, B]) await P.page.evaluate(() => { const H = window.__H; H.applyQuality('low'); H.SAVE.tutorialDone = true; H.titleContinue(); document.querySelector('#menu').classList.remove('on'); H.startMode('free'); });
await A.page.evaluate(() => { const H = window.__H; H.SAVE.nick = 'فهد'; H.teleport(H.GAME.player, -150, -65, -Math.PI / 2); H.INPUT.override = { steer: 0, throttle: 0.7, brake: 0, hand: 0, nitro: 0, horn: false }; });
await B.page.evaluate(() => { const H = window.__H; H.SAVE.nick = 'سعود'; H.teleport(H.GAME.player, -130, -55, Math.PI / 2); H.INPUT.override = { steer: 0, throttle: 0, brake: 1, hand: 0, nitro: 0, horn: false }; });
await A.page.waitForTimeout(2500);
// sample remote car on B over time
const samples = [];
for (let i = 0; i < 40; i++) {
  const s = await B.page.evaluate(() => { const H = window.__H; const r = [...H.NET.peers.values()][0]; if (!r || !r.model) return null; const p = r.model.root.position; return { t: performance.now(), x: p.x, z: p.z, name: r.h && r.h.n, peers: H.NET.peers.size }; });
  const a = await A.page.evaluate(() => { const p = window.__H.GAME.player.pos; return { x: p.x, z: p.z }; });
  samples.push({ s, a });
  await B.page.waitForTimeout(100);
}
const ok = samples.filter(x => x.s);
console.log('remote seen samples', ok.length, 'name', ok[0] && ok[0].s.name, 'peersB', ok[0] && ok[0].s.peers);
let maxJump = 0, maxLag = 0;
for (let i = 1; i < ok.length; i++) { const d = Math.hypot(ok[i].s.x - ok[i - 1].s.x, ok[i].s.z - ok[i - 1].s.z); const dt = (ok[i].s.t - ok[i - 1].s.t) / 1000; maxJump = Math.max(maxJump, d / Math.max(dt, 0.01)); maxLag = Math.max(maxLag, Math.hypot(ok[i].s.x - ok[i].a.x, ok[i].s.z - ok[i].a.z)); }
console.log('remote speed max (m/s, smoothness check):', maxJump.toFixed(1), ' max distance from true pos (m):', maxLag.toFixed(1));
console.log('remote x track:', ok.slice(0, 40).map(x => x.s.x.toFixed(1)).join(' '));
// horn & emote propagation
await A.page.bringToFront();
await A.page.evaluate(() => { window.__H.NET.horn(); window.__H.NET.sendEmote(2); window.__H.NET.setDrift(4321); });
await A.page.waitForTimeout(2500);
await B.page.bringToFront();
await B.page.waitForTimeout(1500);
const bub = await B.page.evaluate(() => { const r = [...window.__H.NET.peers.values()][0]; return { bubble: !!r.bubble || r.emSeq, em: r.h.em, hornSeq: r.hornSeq, ds: r.h.ds, board: window.__H.NET.driftBoardHTML().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') }; });
console.log('B sees:', JSON.stringify(bub));
// group race
await A.page.evaluate(() => window.__H.NET.hostRace(0));
await B.page.waitForTimeout(1500);
const inv = await B.page.evaluate(() => ({ shown: !document.querySelector('#invite').hidden, text: document.querySelector('#invT').textContent }));
console.log('invite on B:', JSON.stringify(inv));
await B.page.click('#invY');
await B.page.waitForTimeout(13000);
const rs = await Promise.all([A, B].map(P => P.page.evaluate(() => { const H = window.__H; return { mode: H.GAME.mode.id, group: H.GAME.mode.group, count: H.NET.raceCount() }; })));
console.log('race state:', JSON.stringify(rs));
await A.page.screenshot({ path: 'shots/online_A.png' }); await B.page.screenshot({ path: 'shots/online_B.png' });
for (const [n, P] of [['A', A], ['B', B]]) console.log(n, 'errors:', P.errors.filter(e => !e.includes('GPU stall') && !e.includes('GL Driver')).slice(0, 8).join('\n'));
await b.close();
