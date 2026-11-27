// =====================================================================
//  ONLINE (artifact "room" capability: presence-only, works for everyone)
// =====================================================================
const EMOTES = ['يا هلا 👋', 'تحدّاني؟ 😏', 'وش ذا التفحيط 🔥', 'ههههه 😂', 'يلا سباق 🏁', 'كفو! 👏', 'الكرك علي ☕', 'وين الشباب؟ 👀'];
const NET = {
  room: null, user: null, on: false, peers: new Map(), myPeer: null, seq: { horn: 0, em: 0 }, emote: null, sendT: 0, drift: 0, race: null, lobby: null, joined: null, tried: false, invites: new Set(),
  async init() {
    if (this.tried) return; this.tried = true;
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const room = await window.claude.use('room'); if (!room) return;
      this.room = room;
      try { this.user = await window.claude.use('user'); if (this.user && !SAVE.nick) { const me = await this.user.me(); if (me && me.name) { SAVE.nick = String(me.name).split(' ')[0].slice(0, 14); persist(); } } } catch (e) { }
      room.onConnection(c => { this.on = c; UI.netStatus(); }, () => { this.on = false; UI.netStatus(); });
      room.onPeers(ch => this.onPeers(ch), () => { });
      this.on = room.connected();
      UI.netStatus();
    } catch (e) { this.room = null; }
  },
  nick() { return (SAVE.nick || '').trim() || 'سوّاق'; },
  onPeers(ch) {
    for (const p of ch.peers) {
      if (p.isMe && p.sameTab) { this.myPeer = p.peer; continue; }
      if (p.kind !== 'viewer') continue;
      const h = p.presence && p.presence.h; if (!h || typeof h !== 'object') continue;
      let r = this.peers.get(p.peer);
      if (!r) { r = { peer: p.peer, buf: [], model: null, look: '', car: null, hornSeq: h.hn | 0, emSeq: (h.em && h.em[1]) | 0, tag: null, bubble: null, bubbleT: 0, last: 0 }; this.peers.set(p.peer, r); if (GAME.state !== 'boot') UI.toast(`${safeName(h.n)} دخل الحي 👋`); }
      if (r.lastP === p.presence) continue; r.lastP = p.presence;
      this.ingest(r, h);
    }
    for (const p of ch.left) { const r = this.peers.get(p.peer); if (r) { this.dropRemote(r); this.peers.delete(p.peer); UI.toast(`${safeName(r.h && r.h.n)} طلع`); } }
    UI.netStatus();
  },
  ingest(r, h) {
    r.h = h;
    const now = performance.now();
    if (Array.isArray(h.p) && h.p.length === 3 && Array.isArray(h.q) && h.q.length === 4 && h.p.every(Number.isFinite) && h.q.every(Number.isFinite)) {
      // timeline from the sender's own clock (regular spacing), mapped to ours by the smallest observed delay
      const st = Number.isFinite(h.t) ? h.t : null;
      let tt = now;
      if (st != null) { const off = now - st; if (r.off != null && Math.abs(off - r.off) > 5000) { r.off = null; r.buf.length = 0; } r.off = r.off == null ? off : Math.min(off, r.off + 2); tt = st + r.off; }
      if (r.buf.length && tt <= r.buf[r.buf.length - 1].t) tt = r.buf[r.buf.length - 1].t + 1;
      r.buf.push({ t: tt, p: V3(h.p[0], h.p[1], h.p[2]), q: new THREE.Quaternion(h.q[0], h.q[1], h.q[2], h.q[3]).normalize(), v: Array.isArray(h.v) ? V3(+h.v[0] || 0, +h.v[1] || 0, +h.v[2] || 0) : V3() });
      if (r.buf.length > 12) r.buf.shift();
    }
    r.last = now;
    // horn
    if ((h.hn | 0) !== r.hornSeq) { r.hornSeq = h.hn | 0; r.hornPending = true; }
    if (h.em && (h.em[1] | 0) !== r.emSeq) { r.emSeq = h.em[1] | 0; const i = h.em[0] | 0; if (i >= 0 && i < EMOTES.length) r.emotePending = i; }
    // race lobby invite
    if (h.rc && h.rc.id && typeof h.rc.id === 'string' && !this.invites.has(h.rc.id) && Number.isFinite(h.rc.at) && h.rc.at > Date.now() + 2000) { this.invites.add(h.rc.id); UI.raceInvite(r, h.rc); }
  },
  dropRemote(r) { if (r.model) { GAME.scene.remove(r.model.root); r.model.dispose(); r.model = null; } if (r.tag) GAME.scene.remove(r.tag); if (r.bubble) GAME.scene.remove(r.bubble); },
  // -------------------------------------------- outgoing
  tick(dt) {
    if (!this.room) return;
    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 0.1;
      const v = GAME.player; if (!v) return;
      const L = v.model.look || {};
      const h = {
        n: this.nick().slice(0, 16), c: v.id, col: L.paint, fin: L.finish, sp: L.stripe | 0, sc: L.stripeCol, ug: L.underglow || 0, sm: L.smoke, pl: L.plate, ht: L.horn | 0,
        p: [+v.pos.x.toFixed(2), +v.pos.y.toFixed(2), +v.pos.z.toFixed(2)], q: [+v.quat.x.toFixed(4), +v.quat.y.toFixed(4), +v.quat.z.toFixed(4), +v.quat.w.toFixed(4)],
        v: [+v.vel.x.toFixed(2), +v.vel.y.toFixed(2), +v.vel.z.toFixed(2)], s: +v.steerAng.toFixed(2), b: (v.input.brake > 0.1 || v.input.hand > 0.5) ? 1 : 0, d: v.drifting ? 1 : 0, ni: v.nitroOn ? 1 : 0,
        t: Date.now() % 1e9, hn: this.seq.horn, em: this.emote ? [this.emote, this.seq.em] : [0, this.seq.em], ds: this.drift | 0, m: GAME.mode ? GAME.mode.id : '', st: GAME.state === 'play' ? 1 : 0,
      };
      if (this.lobby) h.rc = this.lobby;
      if (this.joined) h.rj = this.joined;
      if (this.race) h.rp = this.race;
      try { this.room.presence({ h }).catch(() => { }); } catch (e) { }
    }
  },
  horn() { this.seq.horn++; },
  sendEmote(i) { this.emote = i; this.seq.em++; showBubble(null, EMOTES[i]); },
  setDrift(n) { this.drift = n; },
  setRace(r) { this.race = r; },
  // -------------------------------------------- group race
  hostRace(tr) { const id = 'r' + Math.random().toString(36).slice(2, 8); this.lobby = { id, tr, at: Date.now() + 15000 }; this.joined = id; this.invites.add(id); UI.lobbyWait(this.lobby, true); },
  joinRace(rc) { this.joined = rc.id; UI.lobbyWait(rc, false); },
  participants(id) {
    const list = [{ peer: this.myPeer || 'me', me: true, h: null }];
    for (const r of this.peers.values()) if (r.h && (r.h.rj === id || (r.h.rc && r.h.rc.id === id))) list.push({ peer: r.peer, me: false, h: r.h });
    list.sort((a, b) => a.peer < b.peer ? -1 : 1); return list;
  },
  launch(rc) {
    const parts = this.participants(rc.id); const slot = Math.max(0, parts.findIndex(p => p.me));
    this.groupId = rc.id;
    startMode('race', { track: rc.tr | 0, group: { id: rc.id, slot, startAt: rc.at } });
  },
  raceCount() { return this.participants(this.groupId).length; },
  raceRank(myProg, myFin) {
    let rank = 1;
    for (const r of this.peers.values()) {
      const rp = r.h && r.h.rp; if (!rp || rp.id !== this.groupId) continue;
      if (myFin != null) { if (rp.fin != null && rp.fin < myFin) rank++; }
      else if ((rp.fin != null) || (+rp.prog || 0) > myProg) rank++;
    }
    return rank;
  },
  raceResultsLines() {
    const rows = [];
    for (const r of this.peers.values()) { const rp = r.h && r.h.rp; if (rp && rp.id === this.groupId) rows.push(`${safeName(r.h.n)}: ${rp.fin != null ? fmtTime(rp.fin) : 'باقي يسوق…'}`); }
    return rows;
  },
  driftBoardHTML() {
    if (!this.peers.size) return '';
    const rows = [{ n: this.nick(), s: this.drift, me: true }];
    for (const r of this.peers.values()) if (r.h) rows.push({ n: safeName(r.h.n), s: +r.h.ds || 0 });
    rows.sort((a, b) => b.s - a.s);
    return '<div class="board"><b>ساحة الشباب</b>' + rows.slice(0, 6).map((r, i) => `<div class="${r.me ? 'me' : ''}"><span>${toAr(i + 1)}. ${escapeHTML(r.n)}</span><i>${fmtEn(r.s)}</i></div>`).join('') + '</div>';
  },
  // -------------------------------------------- remote rendering
  update(dt) {
    if (!this.room) return;
    const now = performance.now();
    for (const r of this.peers.values()) {
      const h = r.h; if (!h || !r.buf.length) continue;
      if (now - r.last > 8000) { if (r.model) { r.model.root.visible = false; } continue; }
      const carId = CARS[h.c] ? h.c : 'abu';
      const lookKey = [carId, h.col, h.fin, h.sp, h.sc, h.ug, h.sm, JSON.stringify(h.pl)].join('|');
      if (!r.model || r.car !== carId) {
        if (r.model) { GAME.scene.remove(r.model.root); r.model.dispose(); }
        r.model = buildCarModel(carId, { beams: true }); r.car = carId; r.look = ''; GAME.scene.add(r.model.root);
        r.fake = { spec: CARS[carId], wheels: [], model: r.model, vel: V3(), speed: 0, quat: new THREE.Quaternion(), pos: V3() };
      }
      if (r.look !== lookKey) { r.look = lookKey; try { r.model.setLook({ paint: safeColor(h.col, '#ccc'), finish: ['gloss', 'matte', 'chrome'].includes(h.fin) ? h.fin : 'gloss', stripe: clamp(h.sp | 0, 0, 4), stripeCol: safeColor(h.sc, '#111'), underglow: h.ug ? safeColor(h.ug, null) : null, smoke: safeColor(h.sm, '#fff'), plate: safePlate(h.pl) }); } catch (e) { } }
      // interpolate
      const rt = now - 170, B = r.buf;
      let a = B[0], b = B[B.length - 1], pos = V3(), q = new THREE.Quaternion();
      if (rt <= B[0].t) { pos.copy(B[0].p); q.copy(B[0].q); }
      else if (rt >= b.t) { const ex = Math.min(0.3, (rt - b.t) / 1000); pos.copy(b.p).addScaledVector(b.v, ex); q.copy(b.q); }
      else { for (let i = 0; i < B.length - 1; i++) if (B[i].t <= rt && B[i + 1].t >= rt) { a = B[i]; b = B[i + 1]; break; } const u = (rt - a.t) / Math.max(1, b.t - a.t); pos.lerpVectors(a.p, b.p, u); q.slerpQuaternions(a.q, b.q, u); }
      // smooth visual
      const R = r.model.root; if (!r.init) { R.position.copy(pos); R.quaternion.copy(q); r.init = true; }
      R.position.lerp(pos, 1 - Math.exp(-30 * dt)); R.quaternion.slerp(q, 1 - Math.exp(-30 * dt)); R.visible = true;
      const sp = b.v.length();
      r.model.body.position.y = -CARS[carId].phys.cgH;
      r.spin = (r.spin || 0) + sp / CARS[carId].R * dt;
      const s = CARS[carId];
      [[1, 1], [1, 0], [0, 1], [0, 0]].forEach(([f, l], k) => { _q1.setFromEuler(new THREE.Euler(l ? r.spin : -r.spin, (f ? -(+h.s || 0) : 0) + (l ? Math.PI : 0), 0, 'YXZ')); _m4.compose(_v1.set((l ? -1 : 1) * s.track / 2, s.R - s.phys.cgH, -(f ? s.aF : s.aR)), _q1, _v2.set(1, 1, 1)); r.model.wheels.setMatrixAt(k, _m4); });
      r.model.wheels.instanceMatrix.needsUpdate = true;
      r.model.setBrake(!!h.b); r.model.flames.visible = !!h.ni;
      if (r.model.ug.visible) r.model.ug.position.set(0, -(R.position.y - groundAt(R.position.x, R.position.z, R.position.y).h) + 0.06, 0);
      // drift smoke for remote
      if (h.d && sp > 5) {
        const c = _sc.set(safeColor(h.sm, '#fff'));
        for (const zz of [-s.aR]) for (const xx of [-s.track / 2, s.track / 2]) { if (Math.random() > 0.5) continue; const wp = V3(xx, -s.phys.cgH + 0.2, zz).applyQuaternion(R.quaternion).add(R.position); smokeTint(wp.x, wp.y, wp.z, c, _st); FX.smoke.emit(wp.x, wp.y, wp.z, b.v.x * 0.25, 1, b.v.z * 0.25, 2.6, 1, 6, _st[0], _st[1], _st[2], 0.5, 1.3, -0.2); }
      }
      // name tag
      const nm = safeName(h.n);
      if (!r.tag || r.tagName !== nm) { if (r.tag) GAME.scene.remove(r.tag); r.tag = textSprite(nm, '#7fe3ff', 0.42); r.tagName = nm; GAME.scene.add(r.tag); }
      r.tag.position.set(R.position.x, R.position.y + 2.3, R.position.z);
      // bubble
      if (r.emotePending != null) { showBubble(r, EMOTES[r.emotePending]); r.emotePending = null; }
      if (r.bubble) { r.bubbleT -= dt; r.bubble.position.set(R.position.x, R.position.y + 3.3, R.position.z); if (r.bubbleT <= 0) { GAME.scene.remove(r.bubble); r.bubble = null; } }
      // horn
      if (r.hornPending) { r.hornPending = false; const pl = GAME.player; const d = pl ? pl.pos.distanceTo(R.position) : 0; if (d < 160) { const ht = clamp(h.ht | 0, 0, HORNS.length - 1); AUDIO.horn(ht, true, clamp(1 - d / 160, 0.08, 0.9) * 0.95, 0); } }
      // push local player (remote is a kinematic obstacle)
      const pl = GAME.player;
      if (pl && GAME.state === 'play') {
        const dx = pl.pos.x - R.position.x, dz = pl.pos.z - R.position.z, d = Math.hypot(dx, dz), m = 2.4;
        if (d < m && d > 0.01 && Math.abs(pl.pos.y - R.position.y) < 2) { const nx = dx / d, nz = dz / d; pl.pos.x += nx * (m - d) * 0.5; pl.pos.z += nz * (m - d) * 0.5; const vn = pl.vel.x * nx + pl.vel.z * nz - (b.v.x * nx + b.v.z * nz); if (vn < 0) { pl.vel.x -= nx * vn * 1.2; pl.vel.z -= nz * vn * 1.2; if (-vn > 3) onImpact(pl, -vn, pl.pos.clone(), V3(nx, 0, nz), { kind: 'car' }); } }
      }
    }
    // my own bubble
    if (this.myBubble) { this.myBubble.t -= dt; const P = GAME.player.pos; this.myBubble.s.position.set(P.x, P.y + 3.3, P.z); if (this.myBubble.t <= 0) { GAME.scene.remove(this.myBubble.s); this.myBubble = null; } }
    // lobby launch timing
    const lb = this.lobby || (this.joined && [...this.peers.values()].map(r => r.h && r.h.rc).find(rc => rc && rc.id === this.joined));
    if (lb && this.joined === lb.id && GAME.mode && GAME.mode.id !== 'race' && Date.now() > lb.at - 5200) { this.launch(lb); this.joined = lb.id; }
  },
  peerList() { return [...this.peers.values()].filter(r => r.h).map(r => ({ n: safeName(r.h.n), c: CARS[r.h.c] ? CARS[r.h.c].name : '', m: r.h.m, ds: +r.h.ds || 0, x: r.model ? r.model.root.position.x : 0, z: r.model ? r.model.root.position.z : 0 })); }
};
function safeName(n) { return String(n == null ? 'سوّاق' : n).replace(/[\u0000-\u001f​-‏‪-‮]/g, '').slice(0, 16) || 'سوّاق'; }
function safeColor(c, def) { return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : def; }
function safePlate(p) { try { const l = (p && Array.isArray(p.l) ? p.l : [0, 1, 2]).slice(0, 3).map(i => clamp(i | 0, 0, PLATE_AR.length - 1)); const d = String((p && p.d) || '1234').replace(/[^0-9]/g, '').slice(0, 4) || '1'; return { l, d }; } catch (e) { return { l: [0, 1, 2], d: '1234' }; } }
function showBubble(r, text) {
  const s = textSprite(text, '#ffd23f', 0.55);
  if (!r) { if (NET.myBubble) GAME.scene.remove(NET.myBubble.s); NET.myBubble = { s, t: 3.2 }; GAME.scene.add(s); AUDIO.click(); return; }
  if (r.bubble) GAME.scene.remove(r.bubble); r.bubble = s; r.bubbleT = 3.2; GAME.scene.add(s); AUDIO.chime('beep');
}
