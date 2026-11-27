(() => {
  let drv = null, mode = null, tgt = null, t = 0, stuckT = 0, retryT = 0, hornT = 3, handT = 6;
  const pickNode = (H) => { const N = H.GRAPH.nodes; return N[Math.floor(Math.random() * N.length)]; };
  window.__bot = (dt) => {
    const H = window.__H; if (!H || !H.ready) return; const G = H.GAME, v = G.player;
    // auto handle results / modals
    const res = document.querySelector('#results.on');
    if (res) { retryT += dt; if (retryT > 1.5) { window.__stats.events.push('RESULT: ' + document.querySelector('#resT').textContent + ' | ' + document.querySelector('#resB').textContent); retryT = 0; res.classList.remove('on'); if (H.UI._retry) H.UI._retry(); else H.startMode(window.__wantMode || 'free'); } H.INPUT.override = { steer: 0, throttle: 0, brake: 1, hand: 0, nitro: 0, horn: false }; return; }
    if (G.state !== 'play' || !v) { H.INPUT.override = null; return; }
    const m = G.mode; t += dt;
    if (!drv || drv.v !== v || mode !== m) { drv = new H.AIDriver(v, 'x', { skill: 0.9 }); mode = m; tgt = null; }
    const keep = { ...v.input };
    if (m.id === 'race') drv.updateRace(dt, m.path);
    else if (m.id === 'drift') {
      const b = v.slipAngle; const P = H.W.PLAZA, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
      const far = Math.hypot(v.pos.x - cx, v.pos.z - cz) > 28;
      window.__dk = window.__dk || { init: 0 };
      if (far) { drv.updateChase(dt, { pos: new H.THREE.Vector3(cx, 0, cz), vel: new H.THREE.Vector3(), speed: 0 }); v.input.hand = 0; window.__dk.init = 0; }
      else if (v.speed < 9 && Math.abs(b) < 0.3) { v.input.throttle = 1; v.input.brake = 0; v.input.hand = 0; v.input.steer = 0.15; window.__dk.init = 0; }
      else if (window.__dk.init < 0.4 && Math.abs(b) < 0.35) { window.__dk.init += dt; v.input.hand = 1; v.input.steer = 1; v.input.throttle = 0.7; }
      else { v.input.hand = 0; v.input.steer = Math.max(-1, Math.min(1, 2.4 * (b + 0.7))); v.input.throttle = 1; v.input.brake = 0; }
    } else {
      let target;
      if (m.id === 'patrol') target = m.dest;
      else if (m.id === 'dune' && m.sub === 'climb') target = { x: H.W.BIGDUNE.x, z: H.W.BIGDUNE.z };
      else { if (!tgt || Math.hypot(v.pos.x - tgt.x, v.pos.z - tgt.z) < 15 || t > 40) { tgt = m.id === 'dune' ? { x: -150 + Math.random() * 300, z: 120 + Math.random() * 180 } : pickNode(H); t = 0; } target = tgt; }
      drv.updateChase(dt, { pos: new H.THREE.Vector3(target.x, 0, target.z), vel: new H.THREE.Vector3(), speed: 0 });
      handT -= dt; if (handT < 0) { v.input.hand = 1; if (handT < -0.6) handT = 5 + Math.random() * 8; }
    }
    hornT -= dt; const horn = hornT < 0 && hornT > -0.3; if (hornT < -0.3) hornT = 6 + Math.random() * 10;
    H.INPUT.override = { steer: v.input.steer, throttle: v.input.throttle, brake: v.input.brake, hand: v.input.hand, nitro: v.input.nitro, horn };
    // stuck handling
    window.__mv = window.__mv || { t: 0, p: v.pos.clone() }; const mv = window.__mv; mv.t += dt;
    if (mv.t > 2) { if (v.pos.distanceTo(mv.p) < 2 && v.input.throttle > 0.5) stuckT += mv.t; else stuckT = 0; mv.t = 0; mv.p.copy(v.pos); }
    if (stuckT > 8) { window.__stats.stuck++; window.__stats.events.push('stuck@' + v.pos.x.toFixed(0) + ',' + v.pos.z.toFixed(0) + ' ' + m.id); H.resetCarToRoad(); stuckT = 0; }
  };
  window.__mon = (dt) => {
    const H = window.__H; if (!H || !H.ready) return; const v = H.GAME.player; if (!v) return;
    const g = H.groundAt(v.pos.x, v.pos.z, v.pos.y + 0.5).h;
    const g2 = H.terrainH(v.pos.x, v.pos.z);
    if (v.pos.y - v.ph.cgH < Math.max(g, g2) - 1.0) { window.__stats.fall++; if (window.__stats.fall < 6) window.__stats.events.push('below@' + v.pos.x.toFixed(1) + ',' + v.pos.y.toFixed(1) + ',' + v.pos.z.toFixed(1) + ' g=' + g.toFixed(1)); }
    if (!isFinite(v.pos.x + v.pos.y + v.pos.z)) window.__stats.events.push('NaN');
  };
})();
