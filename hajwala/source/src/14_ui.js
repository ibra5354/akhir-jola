// =====================================================================
//  UI: menus, HUD, garage panel, photo mode, tutorial
// =====================================================================
const UI = {
  _mh: null, _bigT: 0, mapImg: null, mapScale: 1, tut: null, photo: null, lastPrompt: null,
  init() {
    const on = (sel, ev, f) => { const e = $(sel); if (e) e.addEventListener(ev, f); };
    // generic: close buttons
    $$('[data-close]').forEach(b => b.addEventListener('click', () => { AUDIO.click(); this.closeModal(b.closest('.modal')); }));
    // menu
    $$('#menu [data-act]').forEach(b => b.addEventListener('click', () => {
      AUDIO.init(); AUDIO.click();
      const a = b.dataset.act;
      if (a === 'free') { leaveMenu(); startMode('free', { fromMenu: true }); }
      if (a === 'modes') this.openModes();
      if (a === 'garage') { leaveMenu(); openGarage(); }
      if (a === 'online') this.openOnline();
      if (a === 'settings') this.openSettings();
    }));
    // pause
    on('#bpause', 'click', () => pauseGame(true));
    $$('#pause [data-p]').forEach(b => b.addEventListener('click', () => {
      AUDIO.click(); const p = b.dataset.p;
      if (p === 'resume') pauseGame(false);
      if (p === 'restart') { pauseGame(false); const m = GAME.mode; if (m) startMode(m.id, m.id === 'race' ? { track: TRACKS.indexOf(m.tr) } : m.id === 'dune' ? { sub: m.sub } : {}); }
      if (p === 'reset') { pauseGame(false); resetCarToRoad(); }
      if (p === 'photo') { pauseGame(false); this.enterPhoto(); }
      if (p === 'cam') { CAM.mode = (CAM.mode + 1) % 3; SAVE.settings.cam = CAM.mode; persist(); this.toast(['كاميرا المطاردة', 'كاميرا الكبوت', 'كاميرا سينمائية'][CAM.mode]); }
      if (p === 'free') { pauseGame(false); startMode('free'); }
      if (p === 'settings') this.openSettings();
      if (p === 'menu') { pauseGame(false); toMenu(); }
    }));
    // modes modal
    $$('#modes [data-m]').forEach(b => b.addEventListener('click', () => { AUDIO.click(); this.closeModal($('#modes')); leaveMenu(); startMode(b.dataset.m); }));
    $$('#modes [data-d]').forEach(b => b.addEventListener('click', () => { AUDIO.click(); this.closeModal($('#modes')); leaveMenu(); startMode('dune', { sub: b.dataset.d }); }));
    // results
    on('#resBack', 'click', () => { AUDIO.click(); this.closeModal($('#results')); startMode('free'); });
    on('#resRetry', 'click', () => { AUDIO.click(); this.closeModal($('#results')); if (this._retry) this._retry(); });
    // settings
    this.bindSettings();
    // garage
    $$('#garage .tabs button').forEach(b => b.addEventListener('click', () => { GARAGE.tab = b.dataset.tab; AUDIO.click(); this.garage(); }));
    on('#gBack', 'click', () => { AUDIO.click(); closeGarage(); });
    on('#gPrev', 'click', () => { const i = CAR_ORDER.indexOf(GARAGE.sel); garageShow(CAR_ORDER[(i + CAR_ORDER.length - 1) % CAR_ORDER.length]); AUDIO.click(); this.garage(); });
    on('#gNext', 'click', () => { const i = CAR_ORDER.indexOf(GARAGE.sel); garageShow(CAR_ORDER[(i + 1) % CAR_ORDER.length]); AUDIO.click(); this.garage(); });
    on('#gBuy', 'click', () => this.garageBuy());
    // photo
    $$('#phF button').forEach(b => b.addEventListener('click', () => { $$('#phF button').forEach(x => x.classList.toggle('on', x === b)); this.photo.filter = b.dataset.f; GAME.renderer.domElement.style.filter = PHOTO_FILTERS[b.dataset.f].css; }));
    on('#phSave', 'click', () => this.savePhoto());
    on('#phExit', 'click', () => this.exitPhoto());
    on('#shotClose', 'click', () => this.closeModal($('#shot')));
    // emotes
    $('#emg').innerHTML = EMOTES.map((e, i) => `<button data-e="${i}">${e}</button>`).join('');
    $$('#emg button').forEach(b => b.addEventListener('click', () => { NET.sendEmote(+b.dataset.e); this.closeModal($('#emotes')); }));
    on('#tskip', 'click', () => this.endTutorial());
    on('#prompt', 'click', () => { if (this.lastPrompt) this.lastPrompt.act(); });
    on('#cfN', 'click', () => this.closeModal($('#confirm')));
    on('#nick', 'input', e => { SAVE.nick = e.target.value.slice(0, 14); persist(); });
    on('#invN', 'click', () => { $('#invite').hidden = true; });
    // build track lists
    $('#trkList').innerHTML = TRACKS.map((t, i) => `<button data-t="${i}">${t.name}<small data-rt="${t.id}"></small></button>`).join('');
    $$('#trkList button').forEach(b => b.addEventListener('click', () => { AUDIO.click(); this.closeModal($('#modes')); leaveMenu(); startMode('race', { track: +b.dataset.t }); }));
    $('#grpTracks').innerHTML = TRACKS.map((t, i) => `<button data-g="${i}">${t.name}<small>ابدأ وخلّ الشباب ينضمون</small></button>`).join('');
    $$('#grpTracks button').forEach(b => b.addEventListener('click', () => { if (!NET.room) { this.toast('اللعب الجماعي يشتغل لما تفتح اللعبة من رابطها'); return; } AUDIO.click(); this.closeModal($('#online')); if (GAME.state !== 'play') { leaveMenu(); startMode('free'); } NET.hostRace(+b.dataset.g); }));
    this.buildMap();
  },
  // ------------------------------------------------ screens & modals
  screen(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); document.body.classList.toggle('playing', !id); },
  openModal(m) { m.classList.add('on'); },
  closeModal(m) { if (!m) return; m.classList.remove('on'); if (m.id === 'settings' || m.id === 'online' || m.id === 'modes') { if (GAME.state === 'pause') { } } },
  closeAll() { $$('.modal').forEach(m => m.classList.remove('on')); },
  anyModal() { return $$('.modal.on').length > 0; },
  showHUD(on) { $('#hud').classList.toggle('on', on); document.body.classList.toggle('playing', on); },
  confirm(text, yes) { $('#cfT').textContent = text; this.openModal($('#confirm')); $('#cfY').onclick = () => { this.closeModal($('#confirm')); yes(); }; },
  // ------------------------------------------------ messages
  toast(t) { const box = $('#toasts'); const e = el('div', 'toast'); e.textContent = t; box.appendChild(e); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => e.remove(), 3300); },
  big(t, c = '#ff7b1c', dur = 1) { const b = $('#big'); b.innerHTML = ''; const e = el('div', 'bt'); e.textContent = t; e.style.color = c; e.style.animationDuration = (1.4 * dur) + 's'; b.appendChild(e); },
  money(n, why) { const f = $('#moneyfly'); const e = el('div', 'mf'); e.textContent = (n > 0 ? '+' : '') + fmtEn(n); if (why) { const s = el('small'); s.textContent = why; e.appendChild(s); } f.appendChild(e); setTimeout(() => e.remove(), 1700); if (n > 0) AUDIO.chime('money'); },
  modeHUD(html) { if (html === this._mh) return; this._mh = html; $('#modehud').innerHTML = html; },
  driftHUD(d, force) {
    const box = $('#drift'), show = d.active && d.chain > 5;
    box.classList.toggle('on', show || (force && d.total > 0 && false));
    if (show) { $('#dpts').textContent = fmtEn(d.chain * d.mult); $('#dmult').textContent = '×' + d.mult; $('#dang').style.width = clamp(d.angle / 70 * 100, 0, 100) + '%'; }
  },
  prompt(p) {
    const b = $('#prompt'); this.lastPrompt = p;
    if (!p) { if (!b.hidden) b.hidden = true; return; }
    const html = (IS_TOUCH ? '' : '<kbd>E</kbd>') + escapeHTML(p.text);
    if (b._h !== html) { b.innerHTML = html; b._h = html; }
    b.hidden = false;
  },
  countdown(cb, startAt) {
    // game-time based (pauses with the game); group races use the shared wall clock
    this.cd = { cb, wall: !!startAt, t0: startAt ? startAt - 3000 : GAME.t + 0.4, k: -1 };
  },
  cdUpdate() {
    const c = this.cd; if (!c) return;
    const box = $('#countdown');
    const el2 = c.wall ? (Date.now() - c.t0) / 1000 : GAME.t - c.t0, idx = Math.floor(el2);
    const steps = ['٣', '٢', '١', 'يلا!'];
    if (idx >= 0 && idx !== c.k && idx < 4) { c.k = idx; box.innerHTML = ''; const e = el('div', 'c'); e.textContent = steps[idx]; box.appendChild(e); AUDIO.chime(idx === 3 ? 'go' : 'beep'); if (idx === 3) c.cb(); }
    if (idx >= 4) { box.innerHTML = ''; this.cd = null; }
  },
  results(r) {
    $('#resT').textContent = r.title; $('#resB').textContent = r.big || '';
    $('#resL').innerHTML = (r.lines || []).filter(Boolean).map(l => `<div>${escapeHTML(l)}</div>`).join('');
    this._retry = r.retry; $('#resRetry').hidden = !r.retry;
    const tok = this._rt = (this._rt || 0) + 1;
    setTimeout(() => { if (tok === this._rt) this.openModal($('#results')); }, 300);
  },
  // ------------------------------------------------ modes / online / settings
  openModes() {
    const B = SAVE.best;
    $('#rDrift').textContent = B.drift ? `أفضل: ${fmtEn(B.drift)} نقطة` : '';
    $('#rPatrol').textContent = B.patrol ? `أفضل توصيل: +${fmtEn(B.patrol)}` : '';
    $$('#trkList [data-rt]').forEach(s => { const v = B.races[s.dataset.rt]; s.textContent = v ? fmtTime(v) : ''; });
    $('#rClimb').textContent = B.dune.climb ? fmtTime(B.dune.climb) : ''; $('#rJump').textContent = B.dune.jump ? toAr(Math.round(B.dune.jump)) + ' م' : ''; $('#rHigh').textContent = B.dune.high ? toAr(Math.round(B.dune.high)) + ' م' : '';
    this.openModal($('#modes'));
  },
  openOnline() { $('#nick').value = SAVE.nick || ''; this.netStatus(); this.openModal($('#online')); },
  netStatus() {
    const n = NET.peers.size, st = $('#onStat'), note = $('#onNote');
    $('#hnet').hidden = !NET.room; $('#hnetn').textContent = toAr(n + 1);
    if (!NET.room) { st.textContent = 'غير متصل'; st.style.color = '#ff9a7a'; note.textContent = 'اللعب الجماعي يشتغل لما تفتح اللعبة من رابطها المشترك. أرسل الرابط للشباب وأي أحد يفتحه بنفس الوقت يطلع معك في نفس الحي. وتقدر تلعب لحالك عادي.'; $('#mnet').textContent = 'العب مع الربع أونلاين'; }
    else { st.textContent = NET.on ? `متصل · ${toAr(n + 1)} بالحي` : 'يحاول يتصل…'; st.style.color = NET.on ? '#57f08a' : '#ffd23f'; note.textContent = 'أرسل رابط اللعبة للشباب. كل اللي فاتحينها الحين يشوفون سيارات بعض ويسمعون الهرن.'; $('#mnet').textContent = n ? `${toAr(n)} من الشباب موجودين` : 'العب مع الربع أونلاين'; }
    const pl = NET.peerList();
    $('#peerList').innerHTML = `<div class="me"><span>${escapeHTML(NET.nick())} (أنت)</span><i>${escapeHTML(CARS[SAVE.car].name)}</i></div>` + (pl.length ? pl.map(p => `<div><span>${escapeHTML(p.n)}</span><i>${escapeHTML(p.c)}</i></div>`).join('') : '<div class="empty">ما فيه أحد ثاني الحين</div>');
    const rows = [{ n: NET.nick(), s: NET.drift, me: 1 }, ...pl.map(p => ({ n: p.n, s: p.ds }))].sort((a, b) => b.s - a.s);
    $('#dboard').innerHTML = rows.map((r, i) => `<div class="${r.me ? 'me' : ''}"><span>${toAr(i + 1)}. ${escapeHTML(r.n)}</span><i>${fmtEn(r.s)}</i></div>`).join('');
  },
  raceInvite(r, rc) {
    if (!rc || !TRACKS[rc.tr | 0]) return;
    const box = $('#invite'); $('#invT').textContent = `${safeName(r.h.n)} يبي سباق: ${TRACKS[rc.tr | 0].name} 🏁`; box.hidden = false;
    $('#invY').onclick = () => { box.hidden = true; if (GAME.state !== 'play') { leaveMenu(); startMode('free'); } NET.joinRace(rc); };
    AUDIO.chime('cp');
    clearTimeout(this._invT); this._invT = setTimeout(() => box.hidden = true, Math.max(2000, rc.at - Date.now() - 5500));
  },
  lobbyWait(rc, host) { this.toast(host ? 'السباق يبدأ بعد شوي… خلّ الشباب ينضمون' : 'انضميت! السباق يبدأ بعد شوي'); },
  openEmotes() { this.openModal($('#emotes')); },
  openSettings() {
    const S = SAVE.settings;
    $$('#sQ button').forEach(b => b.classList.toggle('on', b.dataset.v === S.quality));
    $('#sMus').checked = S.music; $('#sMusV').value = S.musicVol; $('#sSfx').value = S.sfx; $('#sAssist').checked = S.assist; $('#sGyro').checked = S.gyro; $('#sSens').value = S.sens; $('#sDawn').checked = S.dawnCycle;
    this.openModal($('#settings'));
  },
  bindSettings() {
    const S = () => SAVE.settings;
    $$('#sQ button').forEach(b => b.addEventListener('click', () => { S().quality = b.dataset.v; persist(); $$('#sQ button').forEach(x => x.classList.toggle('on', x === b)); applyQuality(b.dataset.v === 'auto' ? autoQuality() : b.dataset.v); }));
    $('#sMus').addEventListener('change', e => { S().music = e.target.checked; persist(); AUDIO.init(); AUDIO.setMusic(S().music, S().musicVol); });
    $('#sMusV').addEventListener('input', e => { S().musicVol = +e.target.value; persist(); AUDIO.setMusic(S().music, S().musicVol); });
    $('#sSfx').addEventListener('input', e => { S().sfx = +e.target.value; persist(); AUDIO.setSfx(S().sfx); });
    $('#sAssist').addEventListener('change', e => { S().assist = e.target.checked; persist(); });
    $('#sGyro').addEventListener('change', async e => { S().gyro = e.target.checked; persist(); const ok = await INPUT.enableGyro(S().gyro); if (!ok) { e.target.checked = false; S().gyro = false; persist(); } });
    $('#sSens').addEventListener('input', e => { S().sens = +e.target.value; persist(); });
    $('#sDawn').addEventListener('change', e => { S().dawnCycle = e.target.checked; persist(); });
    $('#sReset').addEventListener('click', () => this.confirm('أكيد تبي تمسح كل التقدم؟', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } SAVE = DEFAULT_SAVE(); persist(true); CUPS.list.forEach(c => c.got = false); setPlayerCar('abu'); this.toast('انمسح التقدم'); }));
  },
  // ------------------------------------------------ garage
  garage() {
    const id = GARAGE.sel, car = CARS[id], owned = SAVE.owned.includes(id), cs = carSave(id);
    $('#garage').classList.add('on');
    $('#gmoney').textContent = fmtEn(SAVE.money);
    $('#gCar').textContent = car.name; $('#gType').textContent = car.type + ' · ' + car.desc;
    const buy = $('#gBuy');
    buy.classList.toggle('sel', owned && SAVE.car === id);
    buy.textContent = owned ? (SAVE.car === id ? 'مختارة ✓' : 'اختر هذي') : `اشترها بـ ${fmtEn(car.price)}`;
    buy.disabled = !owned && SAVE.money < car.price;
    $$('#garage .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === GARAGE.tab));
    $('#gPerf').hidden = GARAGE.tab !== 'perf'; $('#gLook').hidden = GARAGE.tab !== 'look';
    // perf
    const st = carStats(id, cs.ups), base = carStats(id, {});
    let h = st.map(([n, v], i) => `<div class="stat"><span>${n}</span><div class="sb"><i style="width:${Math.round(v * 100)}%" class="${v > base[i][1] + 0.005 ? 'up' : ''}"></i></div></div>`).join('');
    const ph = computePhys(id, cs.ups);
    h += `<div class="lk">${toAr(Math.round(ph.vmax))} كم/س · ${toAr(Math.round(ph.power / 745.7))} حصان · ${ph.drive === 'awd' ? 'دفع رباعي' : 'دفع خلفي'}</div>`;
    h += UPG.map(u => { const l = cs.ups[u.k] | 0, cost = upgCost(id, u.k, l), max = l >= 5; return `<div class="up"><b>${u.n}</b><small>${u.d}</small><div class="pips">${[0, 1, 2, 3, 4].map(k => `<i class="${k < l ? 'on' : ''}"></i>`).join('')}</div><button data-u="${u.k}" ${max || !owned || SAVE.money < cost ? 'disabled' : ''}>${max ? 'كامل' : owned ? fmtEn(cost) : 'اشترها أول'}</button></div>`; }).join('');
    $('#gPerf').innerHTML = h;
    $$('#gPerf [data-u]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.u, l = cs.ups[k] | 0, c = upgCost(id, k, l); if (SAVE.money < c || l >= 5) return; SAVE.money -= c; cs.ups[k] = l + 1; persist(true); AUDIO.chime('money'); if (k === 'turbo') AUDIO.blowoff(); this.garage(); }));
    // look
    const L = cs.look;
    const sw = (key, list, offOpt) => `<div class="sw8" data-k="${key}">${offOpt ? `<button class="off ${!L[key] ? 'on' : ''}" data-v="" aria-label="بدون"></button>` : ''}${list.map(c => `<button style="background:${c}" class="${L[key] === c ? 'on' : ''}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>`;
    const seg = (key, opts, vals) => `<div class="seg" data-k="${key}">${opts.map((o, i) => `<button data-v="${vals ? vals[i] : i}" class="${String(L[key]) === String(vals ? vals[i] : i) ? 'on' : ''}">${o}</button>`).join('')}</div>`;
    let g = '';
    g += `<div class="lk">لون الهيكل</div>` + sw('paint', PAINTS);
    g += `<div class="lk">اللمعة</div>` + seg('finish', ['لامع', 'مطفي', 'كروم'], ['gloss', 'matte', 'chrome']);
    g += `<div class="lk">الرنجات</div>` + seg('stripe', STRIPES) + sw('stripeCol', ['#111214', '#f4f4f2', '#ff7b1c', '#ffc400', '#16c8e6', '#c4261d', '#2bd46b', '#7a3cff']);
    g += `<div class="lk">التظليل</div>` + seg('tint', TINTS);
    g += `<div class="lk">الإضاءة الأرضية</div>` + sw('underglow', NEONS, true);
    g += `<div class="lk">لون دخان الكفرات</div>` + sw('smoke', SMOKES);
    g += `<div class="lk">اللوحة</div><div class="plate">${[0, 1, 2].map(k => `<select data-pl="${k}" aria-label="حرف ${k + 1}">${PLATE_AR.map((a, i) => `<option value="${i}" ${L.plate.l[k] === i ? 'selected' : ''}>${a} ${PLATE_EN[i]}</option>`).join('')}</select>`).join('')}<input id="plD" inputmode="numeric" maxlength="4" value="${escapeHTML(L.plate.d)}" aria-label="الأرقام"></div>`;
    g += `<div class="lk">صوت الهرن</div>` + seg('horn', HORNS);
    $('#gLook').innerHTML = g;
    const apply = () => { persist(); GARAGE.model.setLook(L); };
    $$('#gLook .sw8 button, #gLook .seg button').forEach(b => b.addEventListener('click', () => {
      const k = b.parentElement.dataset.k; let v = b.dataset.v;
      if (['stripe', 'tint', 'horn'].includes(k)) v = +v; if (k === 'underglow' && !v) v = null;
      L[k] = v; apply(); AUDIO.click(); if (k === 'horn') { AUDIO.horn(v, true); setTimeout(() => AUDIO.horn(v, false), 450); }
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    }));
    $$('#gLook [data-pl]').forEach(s => s.addEventListener('change', () => { L.plate = { l: [0, 1, 2].map(k => +$(`#gLook [data-pl="${k}"]`).value), d: L.plate.d }; apply(); }));
    $('#plD').addEventListener('input', e => { const d = e.target.value.replace(/[^0-9]/g, '').slice(0, 4); e.target.value = d; if (d) { L.plate = { l: L.plate.l, d }; apply(); } });
  },
  garageBuy() {
    const id = GARAGE.sel, car = CARS[id];
    if (SAVE.owned.includes(id)) { SAVE.car = id; persist(true); AUDIO.click(); this.garage(); return; }
    if (SAVE.money < car.price) return;
    this.confirm(`تشتري ${car.name} بـ ${fmtEn(car.price)} ريال؟`, () => { SAVE.money -= car.price; SAVE.owned.push(id); SAVE.car = id; persist(true); AUDIO.chime('secret'); this.big('مبروك! ' + car.name, '#57f08a'); this.garage(); });
  },
  // ------------------------------------------------ tutorial
  maybeTutorial() { if (SAVE.tutorialDone || this.tut || GAME.state !== 'play') return; this.tut = { step: 0, t: 0 }; $('#tut').hidden = false; this.tutRender(); },
  tutRender() {
    const s = this.tut.step;
    const txt = ['دوس بنزين', 'لف', 'اسحب الهاند بريك'];
    const keys = IS_TOUCH ? ['اضغط زر «بنزين» يمين تحت', 'اسحب يمين ويسار في نص الشاشة الأيسر', 'وأنت ماشي لف واضغط «هاند»'] : ['اضغط W أو السهم فوق', 'A / D أو الأسهم', 'وأنت ماشي لف واضغط مسافة (Space)'];
    $('#tstep').textContent = `الخطوة ${toAr(s + 1)} من ٣`; $('#ttext').textContent = txt[s]; $('#tkeys').textContent = keys[s];
    $$('#tut .tdots i').forEach((d, i) => d.classList.toggle('on', i <= s));
  },
  tutUpdate(dt) {
    if (!this.tut) return; const v = GAME.player, i = v.input, s = this.tut.step;
    const ok = s === 0 ? i.throttle > 0.5 && v.speed > 3 : s === 1 ? Math.abs(i.steer) > 0.5 && v.speed > 4 : i.hand > 0.5 && v.speed > 7;
    if (ok) this.tut.t += dt; if (this.tut.t > (s === 2 ? 0.4 : 0.9)) { this.tut.step++; this.tut.t = 0; AUDIO.chime('cp'); if (this.tut.step >= 3) { this.big('كفو! الحي حقك 🔥', '#57f08a'); this.endTutorial(); return; } this.tutRender(); }
  },
  endTutorial() { this.tut = null; $('#tut').hidden = true; SAVE.tutorialDone = true; persist(); },
  // ------------------------------------------------ photo mode
  enterPhoto() {
    GAME.state = 'photo'; this.showHUD(false); $('#photo').classList.add('on');
    const c = GAME.camera, p = GAME.player.pos;
    const off = V3().subVectors(c.position, p);
    this.photo = { filter: 'none', yaw: Math.atan2(off.x, off.z), pitch: Math.asin(clamp(off.y / off.length(), -0.9, 0.9)), dist: off.length(), target: p.clone().add(V3(0, 0.8, 0)), fov: c.fov, drag: null };
    $$('#phF button').forEach(x => x.classList.toggle('on', x.dataset.f === 'none'));
    AUDIO.silenceCar();
  },
  exitPhoto() { $('#photo').classList.remove('on'); GAME.renderer.domElement.style.filter = ''; GAME.state = 'play'; this.showHUD(true); this.photo = null; CAM.snap = true; },
  photoUpdate(dt) {
    const P = this.photo, K = INPUT.keys, c = GAME.camera; if (!P) return;
    const mv = V3(), f = V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = V3(-f.z, 0, f.x);
    if (K.has('KeyW') || K.has('ArrowUp')) mv.add(f); if (K.has('KeyS') || K.has('ArrowDown')) mv.sub(f);
    if (K.has('KeyD') || K.has('ArrowRight')) mv.add(r); if (K.has('KeyA') || K.has('ArrowLeft')) mv.sub(r);
    if (K.has('KeyE')) mv.y += 1; if (K.has('KeyQ')) mv.y -= 1;
    const pad = INPUT.pad; if (pad) { mv.addScaledVector(r, pad.axes[0] || 0); mv.addScaledVector(f, -(pad.axes[1] || 0)); P.yaw -= (pad.axes[2] || 0) * dt * 2; P.pitch = clamp(P.pitch + (pad.axes[3] || 0) * dt * 1.5, -1.2, 1.2); }
    P.target.addScaledVector(mv, dt * 8);
    P.target.y = Math.max(P.target.y, groundAt(P.target.x, P.target.z, P.target.y + 20).h + 0.3);
    const pos = V3(Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), Math.cos(P.yaw) * Math.cos(P.pitch)).multiplyScalar(P.dist).add(P.target);
    pos.y = Math.max(pos.y, groundAt(pos.x, pos.z, pos.y + 20).h + 0.3);
    c.position.copy(pos); c.lookAt(P.target); c.fov = P.fov; c.updateProjectionMatrix();
  },
  async savePhoto() {
    const P = this.photo; if (!P) return;
    renderFrame(true);
    const src = GAME.renderer.domElement, w = src.width, h = src.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.filter = PHOTO_FILTERS[P.filter].css || 'none'; g.drawImage(src, 0, 0); g.filter = 'none';
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.font = `${Math.round(h * 0.06)}px ${FONT_AR}`; g.textAlign = 'left'; g.direction = 'rtl'; g.fillStyle = '#fff4e6'; g.shadowColor = '#ff7b1c'; g.shadowBlur = h * 0.02; g.fillText('هجولة', w * 0.03 + g.measureText('هجولة').width, h * 0.95);
    const url = cv.toDataURL('image/jpeg', 0.92);
    AUDIO.chime('cp');
    let saved = false;
    try {
      const dl = await Promise.race([window.claude && window.claude.use ? window.claude.use('downloads') : null, new Promise(r => setTimeout(() => r(null), 1500))]);
      if (dl) { const blob = await (await fetch(url)).blob(); await dl.save({ filename: 'hajwala-' + Date.now() + '.jpg', data: blob }); saved = true; this.toast('انحفظت الصورة 📸'); }
    } catch (e) { saved = false; }
    if (!saved) { $('#shotImg').src = url; $('#shotNote').textContent = IS_TOUCH ? 'اضغط مطوّل على الصورة واحفظها' : 'كليك يمين على الصورة واحفظها'; this.openModal($('#shot')); }
  },
  // ------------------------------------------------ HUD frame
  buildMap() {
    const S = 1.0, N = 720, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), X = x => (x + 360) * S, Z = z => (z + 360) * S;
    g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, N, N);
    // desert shading
    for (let j = 0; j < N; j += 6) for (let i = 0; i < N; i += 6) { const x = i / S - 360, z = j / S - 360; const m = desertMask(x, z); if (m > 0.2 || z > 40 || x > 215) { const h = terrainH(x, z); const v = clamp(90 + h * 5, 40, 170); g.fillStyle = `rgb(${v + 40},${v + 10},${v - 30})`; g.fillRect(i, j, 6, 6); } else { g.fillStyle = '#26262e'; g.fillRect(i, j, 6, 6); } }
    g.fillStyle = '#4b4b58'; for (const b of COL.boxes) if (b.kind === 'bldg') g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * S, (b.z1 - b.z0) * S);
    g.fillStyle = '#9a98a8';
    for (const s of WORLD.roads) { if (s.ax === 'z') g.fillRect(X(s.c - s.hw), Z(s.a0), s.hw * 2 * S, (s.a1 - s.a0) * S); else g.fillRect(X(s.a0), Z(s.c - s.hw), (s.a1 - s.a0) * S, s.hw * 2 * S); }
    for (const it of WORLD.inters) g.fillRect(X(it.x - it.hx), Z(it.z - it.hz), it.hx * 2 * S, it.hz * 2 * S);
    g.beginPath(); g.arc(X(W.RB.x), Z(W.RB.z), 25 * S, 0, TAU); g.fill(); g.fillStyle = '#5f7d44'; g.beginPath(); g.arc(X(W.RB.x), Z(W.RB.z), 12 * S, 0, TAU); g.fill();
    const P = W.PLAZA; g.fillStyle = 'rgba(255,123,28,.55)'; g.fillRect(X(P.x0), Z(P.z0), (P.x1 - P.x0) * S, (P.z1 - P.z0) * S);
    g.fillStyle = '#c9a070'; g.fillRect(X(W.HWY.x - 11), Z(W.BRIDGE.z0), 22 * S, (W.BRIDGE.z1 - W.BRIDGE.z0) * S);
    this.mapImg = cv; this.mapS = S;
  },
  hudFrame(dt) {
    const v = GAME.player; if (!v) return;
    this._hf = (this._hf || 0) + 1;
    if (this._hf % 10 === 0) { $('#hmoney').textContent = fmtEn(SAVE.money); $('#hcups').textContent = `${toAr(SAVE.cups.length)}/${toAr(CUPS.list.length)}`; }
    this.drawSpeedo(v); this.drawMinimap(v); this.drawLines(v, dt);
  },
  drawSpeedo(v) {
    const cv = $('#speedo'), g = cv.getContext('2d'), W2 = cv.width, cx = W2 / 2, cy = W2 / 2, R = W2 * 0.42;
    g.clearRect(0, 0, W2, W2);
    const kmh = Math.abs(v.fwdSpeed) * 3.6, vmax = Math.ceil(v.ph.vmax * 1.12 / 40) * 40;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, A = (x) => a0 + (a1 - a0) * clamp(x, 0, 1);
    g.fillStyle = 'rgba(8,9,14,.78)'; g.beginPath(); g.arc(cx, cy, R + 14, 0, TAU); g.fill();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
    const gr = g.createLinearGradient(0, W2, W2, 0); gr.addColorStop(0, '#29c8ff'); gr.addColorStop(0.6, '#ff7b1c'); gr.addColorStop(1, '#ff3ea5');
    g.strokeStyle = gr; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R, a0, A(kmh / vmax)); g.stroke();
    // rpm inner
    const rp = v.rpm / (v.redline || 7000);
    g.strokeStyle = rp > 0.9 ? '#ff3a3a' : 'rgba(255,210,63,.85)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R - 14, a0, A(rp)); g.stroke();
    // nitro
    g.strokeStyle = 'rgba(41,200,255,.25)'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R + 9, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
    g.strokeStyle = v.nitroOn ? '#9ff0ff' : '#29c8ff'; g.beginPath(); g.arc(cx, cy, R + 9, Math.PI * 0.7 - Math.PI * 0.4 * v.nitro, Math.PI * 0.7); g.stroke();
    // ticks
    g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `${Math.round(W2 * 0.06)}px Cairo,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (W2 > 150) for (let s = 0; s <= vmax; s += 40) { const a = A(s / vmax); g.fillText(toAr(s), cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30)); }
    // needle
    const an = A(kmh / vmax); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(an) * (R * 0.25), cy + Math.sin(an) * (R * 0.25)); g.lineTo(cx + Math.cos(an) * (R - 4), cy + Math.sin(an) * (R - 4)); g.stroke();
    g.fillStyle = '#fff'; g.font = `${Math.round(W2 * 0.2)}px Lalezar,Cairo,sans-serif`; g.fillText(toAr(Math.round(kmh)), cx, cy + W2 * 0.06);
    g.font = `${Math.round(W2 * 0.065)}px Cairo,sans-serif`; g.fillStyle = '#aaa'; g.fillText('كم/س', cx, cy + W2 * 0.2);
    g.fillStyle = v.shiftT > 0 ? '#ffd23f' : '#29c8ff'; g.font = `${Math.round(W2 * 0.09)}px Lalezar,sans-serif`; g.fillText(v.reverse && v.fwdSpeed < -0.3 ? 'R' : (Math.abs(v.fwdSpeed) < 0.4 && v.input.throttle < 0.1 ? 'N' : String(Math.max(1, v.gear))), cx, cy - W2 * 0.17);
  },
  drawMinimap(v) {
    const cv = $('#minimap'), g = cv.getContext('2d'), N = cv.width, c = N / 2;
    g.clearRect(0, 0, N, N);
    g.save(); g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.clip();
    g.fillStyle = '#111'; g.fillRect(0, 0, N, N);
    const sc = (N / 200) * clamp(1.15 - v.speed / 120, 0.6, 1.15), hd = v.heading();
    g.translate(c, c); g.rotate(hd); g.scale(sc, sc);
    g.translate(-(v.pos.x + 360) * this.mapS, -(v.pos.z + 360) * this.mapS);
    g.globalAlpha = 0.9; g.drawImage(this.mapImg, 0, 0); g.globalAlpha = 1;
    const dot = (x, z, r, col, ring) => { g.fillStyle = col; g.beginPath(); g.arc((x + 360) * this.mapS, (z + 360) * this.mapS, r / sc, 0, TAU); g.fill(); if (ring) { g.strokeStyle = '#000'; g.lineWidth = 1.5 / sc; g.stroke(); } };
    for (const m of MARK.list) dot(m.x, m.z, m.data && m.data.tag === 'start' ? 4 : 6, m.color, true);
    if (GAME.mode && GAME.mode.id === 'race' && GAME.mode.path) { const p = GAME.mode.path; g.strokeStyle = 'rgba(41,200,255,.7)'; g.lineWidth = 3 / sc; g.beginPath(); p.p.forEach((q, i) => i ? g.lineTo((q.x + 360) * this.mapS, (q.z + 360) * this.mapS) : g.moveTo((q.x + 360) * this.mapS, (q.z + 360) * this.mapS)); if (p.closed) g.closePath(); g.stroke(); }
    for (const o of GAME.vehicles) if (o !== v) dot(o.pos.x, o.pos.z, 4.5, o.isPolice ? (Math.floor(U.uTime.value * 6) % 2 ? '#ff3030' : '#3060ff') : '#ffffff', true);
    for (const r of NET.peers.values()) if (r.model && r.model.root.visible) dot(r.model.root.position.x, r.model.root.position.z, 5, '#29c8ff', true);
    dot(WORLD.garageZone.x, WORLD.garageZone.z, 3.5, '#ff7b1c'); dot(WORLD.gasZone.x, WORLD.gasZone.z, 3.5, '#57f08a'); dot(WORLD.campZone.x, WORLD.campZone.z, 3.5, '#ffd23f');
    g.restore();
    // player arrow
    g.fillStyle = '#ff7b1c'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(c, c - 9); g.lineTo(c + 6, c + 7); g.lineTo(c, c + 3); g.lineTo(c - 6, c + 7); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,123,28,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.stroke();
    // north marker
    g.fillStyle = '#fff'; g.font = '12px Cairo'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ش', c + Math.sin(hd) * (c - 12), c - Math.cos(hd) * (c - 12));
  },
  drawLines(v, dt) {
    const cv = $('#lines'), kmh = v.speed * 3.6, k = clamp((kmh - 140) / 120, 0, 1) + (v.nitroOn ? 0.6 : 0);
    if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
    const g = cv.getContext('2d');
    if (k <= 0.01 || GAME.state !== 'play' || CAM.mode === 2) { if (this._linesOn) { g.clearRect(0, 0, cv.width, cv.height); this._linesOn = false; } return; }
    this._linesOn = true;
    g.clearRect(0, 0, cv.width, cv.height);
    const cx = cv.width / 2, cy = cv.height * 0.45, n = Math.round(10 + k * 30);
    g.strokeStyle = v.nitroOn ? 'rgba(160,230,255,' + (0.18 * k) + ')' : 'rgba(255,255,255,' + (0.13 * k) + ')';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r0 = (0.35 + Math.random() * 0.4) * Math.max(cx, cy), len = (40 + Math.random() * 120) * k;
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
    }
    g.stroke();
  },
};
const PHOTO_FILTERS = { none: { css: '' }, cine: { css: 'contrast(1.15) saturate(0.85) sepia(0.15)' }, warm: { css: 'sepia(0.35) saturate(1.3) brightness(1.05)' }, neon: { css: 'saturate(1.8) contrast(1.15) hue-rotate(-8deg)' }, bw: { css: 'grayscale(1) contrast(1.25)' } };
