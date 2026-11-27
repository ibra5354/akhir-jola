// =====================================================================
//  VEHICLE PHYSICS (raycast vehicle, arcade-tuned rigid body)
// =====================================================================
const GRAV = 9.81, SUBSTEP = 1 / 120;
const SURF_MU = [0.86, 1.0, 0.66, 0.96];       // dirt, asphalt, sand, concrete
const SURF_RR = [0.02, 0.012, 0.034, 0.013];
const SURF_DRAG = [0.5, 0, 1.5, 0];             // extra velocity drag per wheel (N per m/s per kN load)

function computePhys(id, ups = {}) {
  const b = CARS[id].phys, p = Object.assign({}, b);
  const e = ups.engine | 0, t = ups.turbo | 0, g = ups.grip | 0, n = ups.nitro | 0, s = ups.susp | 0;
  p.power = b.power * (1 + 0.09 * e) * (1 + 0.07 * t);
  p.fmax = b.fmax * (1 + 0.04 * e) * (1 + 0.05 * t);
  p.vmax = b.vmax * Math.cbrt(p.power / b.power);
  p.grip = b.grip * (1 + 0.035 * g); p.tail = Math.min(0.95, b.tail + 0.008 * g);
  p.sandMul = b.sandMul * (1 + 0.03 * g);
  p.nitroCap = 1 + 0.25 * n; p.nitroMul = 1.45 + 0.06 * n;
  p.k = b.k * (1 + 0.08 * s); p.c = b.c * (1 + 0.08 * s); p.arb = 0.55 + 0.06 * s;
  p.turbo = t > 0 || b.turbo;
  const vm = p.vmax / 3.6;
  p.cd = Math.max(0.05, (p.power / vm - 0.012 * p.mass * GRAV) / (vm * vm));
  return p;
}

class Vehicle {
  constructor(id, opt = {}) {
    this.id = id; this.spec = CARS[id]; this.opt = opt;
    this.isPlayer = !!opt.player; this.ai = null;
    this.ups = opt.ups || {};
    this.ph = computePhys(id, this.ups);
    this.model = buildCarModel(id, { beams: opt.beams });
    this.model.setLook(opt.look || defaultLook(id));
    this.pos = V3(); this.vel = V3(); this.quat = new THREE.Quaternion(); this.angVel = V3();
    this.F = V3(); this.T = V3();
    const s = this.spec, ph = this.ph;
    this.wheels = [];
    for (const [front, left] of [[1, 1], [1, 0], [0, 1], [0, 0]]) {
      this.wheels.push({ front: !!front, left: !!left, x: (left ? -1 : 1) * s.track / 2, z: -(front ? s.aF : s.aR), comp: 0, prev: 0, contact: false, spin: 0, spinV: 0, steer: 0, slip: 0, slipLat: 0, spinSlip: 0, surf: 1, load: 0, gh: 0, cp: V3(), fwd: V3(), n: V3(0, 1, 0), lastSurf: 1 });
    }
    this.input = { throttle: 0, brake: 0, steer: 0, hand: 0, nitro: 0 };
    this.steerAng = 0; this.rpm = 900; this.gear = 1; this.shiftT = 0; this.nitro = 1; this.nitroOn = false; this.reverse = false;
    this.grounded = false; this.airT = 0; this.slipAngle = 0; this.drifting = false; this.speed = 0; this.fwdSpeed = 0;
    this.wheelspin = 0; this.impactCb = null; this.lastRamp = null; this.scratches = 0; this.lift = 0; this.onSand = 0;
    this.setInertia();
    this.reset(V3(0, 0, 0), 0);
  }
  setUps(ups) { this.ups = ups || {}; this.ph = computePhys(this.id, this.ups); this.setInertia(); }
  setInertia() {
    const s = this.spec, m = this.ph.mass, H = 1.3;
    this.inv = V3(1 / (m / 12 * (H * H + s.L * s.L) * 1.4), 1 / (m / 12 * (s.W * s.W + s.L * s.L) * 1.0), 1 / (m / 12 * (s.W * s.W + H * H) * 2.6));
    const ph = this.ph;
    this.compStatic = m * GRAV / 4 / ph.k;
    this.mountY = s.R - ph.cgH + ph.rest - this.compStatic;
  }
  reset(p, heading, keepVel = false) {
    this.quat.setFromAxisAngle(V3(0, 1, 0), heading);
    const g = groundAt(p.x, p.z, p.y + 3);
    this.pos.set(p.x, Math.max(p.y, g.h) + this.ph.cgH + 0.05, p.z);
    if (!keepVel) { this.vel.set(0, 0, 0); this.angVel.set(0, 0, 0); }
    for (const w of this.wheels) { w.comp = w.prev = this.compStatic; w.spin = 0; }
    this.nitroOn = false; this.airT = 0; this.drifting = false; this.gear = 1; this.rpm = 900;
    this.syncModel(0);
  }
  heading() { const f = _v1.set(0, 0, -1).applyQuaternion(this.quat); return Math.atan2(-f.x, -f.z); }
  forward(out = V3()) { return out.set(0, 0, -1).applyQuaternion(this.quat); }
  // world inverse inertia * v
  invI(v, out) { _q1.copy(this.quat).invert(); out.copy(v).applyQuaternion(_q1); out.x *= this.inv.x; out.y *= this.inv.y; out.z *= this.inv.z; return out.applyQuaternion(this.quat); }
  addForceAt(f, p) { this.F.add(f); const r = _v4.subVectors(p, this.pos); this.T.add(r.cross(f)); }
  applyImpulse(J, p) {
    this.vel.addScaledVector(J, 1 / this.ph.mass);
    const r = _v4.subVectors(p, this.pos), t = r.cross(J);
    const dw = this.invI(t, V3()); this.angVel.add(dw);
  }
  step(dt) {
    const n = Math.max(1, Math.round(dt / SUBSTEP)), h = dt / n;
    for (let i = 0; i < n; i++) this.substep(h);
    this.post(dt);
  }
  substep(dt) {
    const s = this.spec, ph = this.ph, inp = this.input, m = ph.mass;
    this.F.set(0, -m * GRAV, 0); this.T.set(0, 0, 0);
    const up = _v2.set(0, 1, 0).applyQuaternion(this.quat).clone();
    const fwdB = V3(0, 0, -1).applyQuaternion(this.quat);
    const vel = this.vel, speed = vel.length();
    this.fwdSpeed = vel.dot(fwdB);
    // ----- steering
    const vflat = Math.hypot(vel.x, vel.z);
    let beta = 0;
    if (vflat > 2) { const fx = fwdB.x, fz = fwdB.z, fl = Math.hypot(fx, fz) || 1; const cross = (fx * vel.z - fz * vel.x) / fl, dot = (fx * vel.x + fz * vel.z) / fl; beta = Math.atan2(cross, dot); if (this.fwdSpeed < 0) beta = 0; }
    this.slipAngle = beta;
    let maxSt = ph.steer * lerp(1, 0.3, smooth(4, 48, vflat));
    maxSt = Math.max(maxSt, Math.min(ph.steer, Math.abs(beta) + 0.15));
    let target = inp.steer * maxSt;
    if (this.assist && this.grounded && Math.abs(beta) > 0.12 && vflat > 6) target += clamp(-beta * 0.55 * ph.driftAssist, -0.35, 0.35) * (1 - Math.abs(inp.steer) * 0.4);
    this.steerAng = damp(this.steerAng, clamp(target, -ph.steer, ph.steer), 9, dt);
    // ----- engine
    const nitroActive = inp.nitro > 0 && this.nitro > 0.01 && inp.throttle > 0.1 && !this.reverse;
    this.nitroOn = nitroActive;
    if (nitroActive) this.nitro = Math.max(0, this.nitro - dt / (3.6 * ph.nitroCap));
    const vmag = Math.max(Math.abs(this.fwdSpeed), 2.5);
    let P = ph.power * (nitroActive ? ph.nitroMul * 1.05 : 1), Fm = ph.fmax * (nitroActive ? ph.nitroMul : 1);
    let drive = 0;
    if (this.reverse) { if (inp.brake > 0.05) drive = -inp.brake * ph.fmax * 0.55 * (this.fwdSpeed < -10 ? 0 : 1); if (inp.throttle > 0.1 && this.fwdSpeed > -1) this.reverse = false; }
    else {
      drive = inp.throttle * Math.min(Fm, P / vmag) * (this.shiftT > 0 ? 0.3 : 1);
      if (inp.brake > 0.1 && this.fwdSpeed < 0.6 && inp.throttle < 0.1) this.reverse = true;
    }
    const brakeF = (!this.reverse ? inp.brake : 0) * m * 9.5;
    // ----- wheels
    let contacts = 0, sandCount = 0; this.wheelspin = 0;
    const drv = ph.drive === 'awd' ? [0.42, 0.58] : ph.drive === 'fwd' ? [1, 0] : [0, 1];
    // anti-roll compute from previous comps
    const arb = ph.arb * ph.k;
    for (let k = 0; k < 4; k++) {
      const w = this.wheels[k];
      const mount = _v3.set(w.x, this.mountY, w.z).applyQuaternion(this.quat).add(this.pos);
      const g = groundAt(mount.x, mount.z, mount.y + 0.05);
      w.surf = g.surf; w.gh = g.h;
      const sinkR = g.surf === S_SAND ? 0.06 : 0;
      const upY = Math.max(0.35, up.y);
      const dist = (mount.y - g.h) / upY;
      const maxLen = ph.rest + s.R - sinkR;
      w.prev = w.comp;
      if (dist < maxLen + 0.02) {
        w.contact = true; contacts++;
        if (g.surf === S_SAND) sandCount++;
        let comp = Math.min(maxLen - dist, ph.rest * 1.25);
        w.comp = comp;
        const n = w.n.set(g.nx, g.ny, g.nz);
        // contact point
        const cp = w.cp.copy(mount).addScaledVector(up, -dist);
        const cv = (w.comp - w.prev) / dt;
        const other = this.wheels[k ^ 1];
        let Fz = ph.k * comp + ph.c * cv + arb * (comp - other.comp);
        if (comp > ph.rest * 0.92) Fz += ph.k * 6 * (comp - ph.rest * 0.92);
        Fz = Math.max(0, Fz);
        w.load = Fz;
        const fSus = _v1.copy(up).multiplyScalar(Fz * 0.7).addScaledVector(n, Fz * 0.3);
        this.addForceAt(fSus, cp);
        // tire frame
        const yaw = w.front ? -this.steerAng : 0;
        // forward of wheel in body frame: rotate (0,0,-1) by yaw around y
        const wf = w.fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)).applyQuaternion(this.quat);
        wf.addScaledVector(n, -wf.dot(n)).normalize();
        const right = _v1.crossVectors(wf, n).normalize();
        // contact velocity
        const r = _v4.subVectors(cp, this.pos);
        const pv = V3().crossVectors(this.angVel, r).add(vel);
        const vf = pv.dot(wf), vr = pv.dot(right);
        let mu = SURF_MU[g.surf] * ph.grip;
        if (g.surf === S_SAND) mu = SURF_MU[S_SAND] * ph.sandMul * (ph.drive === 'awd' ? 1.15 : 1);
        const Fmax = mu * Fz;
        // lateral
        const alpha = Math.atan2(vr, Math.abs(vf) + 0.6);
        const aa = Math.abs(alpha), peak = 0.15;
        let tail = w.front ? 0.97 : ph.tail;
        let curve = aa < peak ? aa / peak : lerp(1, tail, clamp((aa - peak) / 0.55, 0, 1));
        let latMul = 1;
        if (!w.front) {
          if (inp.hand > 0.1) latMul *= lerp(1, 0.34, inp.hand);
          if (aa > 0.13 && inp.throttle > 0.3 && ph.drive !== 'awd') latMul *= 1 - 0.24 * inp.throttle * ph.driftAssist;
          if (aa > 0.13 && inp.throttle > 0.3 && ph.drive === 'awd') latMul *= 1 - 0.13 * inp.throttle;
        }
        let Fy = -Math.sign(alpha) * curve * Fmax * latMul;
        const Fstop = Math.abs(vr) * (m / 4) / dt * 0.9;
        if (Math.abs(Fy) > Fstop) Fy = Math.sign(Fy) * Fstop;
        // longitudinal
        let Fx = drive * drv[w.front ? 0 : 1] / 2;
        const rrf = SURF_RR[g.surf] * Fz + SURF_DRAG[g.surf] * Fz / 1000 * Math.abs(vf);
        Fx -= Math.sign(vf) * Math.min(rrf, Math.abs(vf) * (m / 4) / dt);
        let bf = brakeF * (w.front ? 0.6 : 0.4) / 2;
        if (!w.front && inp.hand > 0.1) bf += m * 6 * inp.hand / 2;
        if (bf > 0) Fx -= Math.sign(vf) * Math.min(bf, Math.abs(vf) * (m / 4) / dt);
        // friction circle
        const tot = Math.hypot(Fx, Fy);
        let spinSlip = 0;
        if (tot > Fmax && tot > 1e-3) {
          const sc = Fmax / tot;
          if (Math.abs(drive) > 0 && Math.abs(Fx) > Fmax * 0.75 && ((w.front ? drv[0] : drv[1]) > 0)) spinSlip = clamp(Math.abs(Fx) / Fmax - 0.75, 0, 2);
          Fx *= sc; Fy *= sc;
        }
        w.spinSlip = spinSlip;
        this.wheelspin = Math.max(this.wheelspin, spinSlip);
        w.slipLat = aa; w.slip = clamp(aa * 2.2 + spinSlip * 1.2 + (bf > 0 && Math.abs(vf) > 3 && !w.front && inp.hand > 0.1 ? 0.6 : 0), 0, 2);
        const ft = V3().copy(wf).multiplyScalar(Fx).addScaledVector(right, Fy);
        // apply tire force a bit above contact to reduce roll-over
        const ap = V3().copy(cp).lerp(this.pos, 0.35);
        this.addForceAt(ft, ap);
        // wheel spin visual
        const targetSpin = (vf + (spinSlip > 0 ? Math.sign(drive) * spinSlip * 18 : 0)) / s.R;
        w.spinV = (!w.front && inp.hand > 0.3) ? 0 : targetSpin;
      } else {
        w.contact = false; w.comp = Math.max(0, w.comp - dt * 3); w.load = 0; w.slip = 0; w.spinSlip = 0;
        w.spinV *= 0.995; if (!w.front && drive) w.spinV += drive / m * dt * 8;
      }
      w.spin += w.spinV * dt;
    }
    this.grounded = contacts >= 2;
    this.onSand = sandCount / 4;
    // ----- aero
    const dragF = V3().copy(vel).multiplyScalar(-ph.cd * speed);
    this.F.add(dragF);
    if (contacts > 0) this.F.addScaledVector(up, -0.55 * speed * speed);
    // ----- air control / stabilise
    if (contacts === 0) {
      const lv = V3().crossVectors(up, V3(0, 1, 0));
      this.T.addScaledVector(lv, m * 2.6);
      const wl = this.angVel.clone(); wl.y *= 0.2;
      this.T.addScaledVector(wl, -m * 0.6);
      // light air steer
      this.T.y += -inp.steer * m * 0.6;
    } else if (contacts < 4) {
      const lv = V3().crossVectors(up, V3(0, 1, 0));
      this.T.addScaledVector(lv, m * 1.2);
    }
    // ----- arcade drift helper: keep speed in a powerslide, stop spin-outs
    if (this.grounded && vflat > 5 && !this.reverse) {
      const ab = Math.abs(beta), sb = Math.sign(beta), da = ph.driftAssist;
      if (ab > 0.12 && ab < 1.6 && inp.throttle > 0.2) {
        const k = clamp((ab - 0.12) / 0.35, 0, 1) * inp.throttle * da;
        this.F.x += vel.x / vflat * m * 2.7 * k; this.F.z += vel.z / vflat * m * 2.7 * k;
      }
      if (ab > 0.85 && inp.hand < 0.5) {
        const over = ab - 0.85;
        this.T.y -= sb * m * 26 * over * (0.6 + 0.4 * da);
        if (Math.sign(this.angVel.y) === sb) this.T.y -= this.angVel.y * m * 4 * clamp(over * 3, 0, 1);
      }
    }
    // angular damping (yaw a little, roll/pitch more)
    this.T.addScaledVector(this.angVel, -m * 0.25);
    // yaw stability when not drifting intentionally
    if (this.grounded && inp.hand < 0.1 && Math.abs(beta) < 0.15) this.T.y += -this.angVel.y * m * 0.35 * (1 - Math.abs(inp.steer));
    // ----- integrate
    this.vel.addScaledVector(this.F, dt / m);
    const dw = this.invI(this.T, V3()); this.angVel.addScaledVector(dw, dt);
    const wm = this.angVel.length(); if (wm > 9) this.angVel.multiplyScalar(9 / wm);
    this.pos.addScaledVector(this.vel, dt);
    if (wm > 1e-6) { _q1.setFromAxisAngle(_v1.copy(this.angVel).divideScalar(wm), wm * dt); this.quat.premultiply(_q1).normalize(); }
    // ----- collisions
    this.collide(dt);
    this.groundPen(dt);
  }
  collide(dt) {
    const s = this.spec, r = s.W / 2 * 0.98, yb = this.pos.y - this.ph.cgH + s.clear * 0.6, yt = yb + 1.3;
    const offs = [-(s.L / 2 - r * 0.9), 0, (s.L / 2 - r * 0.9)];
    for (const oz of offs) {
      const c = _v3.set(0, 0, oz).applyQuaternion(this.quat).add(this.pos);
      collideCircle(c.x, c.z, r, yb, yt, (nx, nz, pen, o) => {
        const isPole = o.kind === 'pole';
        const nrm = V3(nx, 0, nz);
        const cp = V3(c.x - nx * r, this.pos.y, c.z - nz * r);
        const rr_ = V3().subVectors(cp, this.pos);
        const pv = V3().crossVectors(this.angVel, rr_).add(this.vel);
        const vn = pv.dot(nrm);
        if (isPole && Math.abs(vn) > 3.5) { bendPole(o.ref, -nx, -nz, Math.abs(vn)); this.vel.multiplyScalar(0.82); this.impact(Math.abs(vn) * 0.6, cp, nrm, o); return; }
        this.pos.x += nx * pen * 1.01; this.pos.z += nz * pen * 1.01;
        if (vn < 0) {
          const rn = V3().crossVectors(rr_, nrm);
          const k = 1 / this.ph.mass + this.invI(rn, V3()).cross(rr_).dot(nrm);
          const e = vn < -3 ? 0.18 : 0, j = -(1 + e) * vn / k;
          const J = nrm.clone().multiplyScalar(j);
          // friction
          const vt = pv.clone().addScaledVector(nrm, -vn); const vtl = vt.length();
          if (vtl > 0.01) J.addScaledVector(vt, -Math.min(0.25 * j, vtl * this.ph.mass * 0.3) / vtl);
          J.y = 0;
          this.applyImpulse(J, cp);
          if (-vn > 2.5) this.impact(-vn, cp, nrm, o);
        }
      });
    }
  }
  groundPen(dt) {
    // body corner points against ground (roof/nose landings, flips)
    const s = this.spec, cg = this.ph.cgH;
    const ys = [s.clear - cg + 0.05, Math.max(...s.cabin.map(p => p[1])) - cg];
    for (const y of ys) for (const x of [-s.W / 2, s.W / 2]) for (const z of [-s.L / 2, s.L / 2]) {
      const p = _v3.set(x * 0.9, y, z * 0.92).applyQuaternion(this.quat).add(this.pos);
      const g = groundAt(p.x, p.z, p.y + 1.2);
      const pen = g.h - p.y;
      if (pen > 0) {
        const n = V3(g.nx, g.ny, g.nz);
        this.pos.addScaledVector(n, pen * 0.5);
        const rr_ = V3().subVectors(p, this.pos);
        const pv = V3().crossVectors(this.angVel, rr_).add(this.vel);
        const vn = pv.dot(n);
        if (vn < 0) {
          const rn = V3().crossVectors(rr_, n);
          const k = 1 / this.ph.mass + this.invI(rn, V3()).cross(rr_).dot(n);
          const j = -(1.15) * vn / k;
          const J = n.clone().multiplyScalar(j);
          const vt = pv.clone().addScaledVector(n, -vn), vtl = vt.length();
          if (vtl > 0.01) J.addScaledVector(vt, -Math.min(0.5 * j, vtl * this.ph.mass * 0.25) / vtl);
          this.applyImpulse(J, p);
          if (-vn > 4) this.impact(-vn * 0.7, p, n, null);
        }
      }
    }
  }
  impact(strength, p, n, obj) {
    const now = this._t || 0;
    if (now - (this._lastImpact || -1) < 0.12) return;
    this._lastImpact = now;
    if (strength > 4) this.scratches++;
    if (this.impactCb) this.impactCb(strength, p, n, obj);
  }
  post(dt) {
    this._t = (this._t || 0) + dt;
    const ph = this.ph;
    // gear/rpm (cosmetic + shift cut)
    const vmax = ph.vmax / 3.6, v = Math.abs(this.fwdSpeed);
    const tops = [0.2, 0.34, 0.5, 0.66, 0.83, 1.0].map(f => f * vmax * 1.04);
    if (this.shiftT > 0) this.shiftT -= dt;
    const idle = 850, red = this.spec.engine.cyl === 4 ? 6200 : this.spec.engine.cyl === 6 ? 7600 : 6800;
    if (this.reverse) this.gear = -1; else if (this.gear < 1) this.gear = 1;
    const g = Math.max(1, this.gear);
    const rpmV = idle + (v / tops[g - 1]) * (red - idle);
    let rpm = rpmV;
    if (g === 1 && v < tops[0] * 0.4) rpm = Math.max(rpm, idle + this.input.throttle * 3200);
    rpm += this.wheelspin * 2400 * this.input.throttle;
    if (!this.grounded) rpm = lerp(this.rpm, idle + this.input.throttle * (red - idle) * 0.95, 0.15);
    this.shiftCool = (this.shiftCool || 0) - dt;
    if (!this.reverse && this.shiftCool <= 0 && this.grounded) {
      if (rpmV > red * 0.95 && g < 6) { this.gear++; this.shiftT = 0.15; this.shiftCool = 0.6; BUS.emit('shift', this, 1); }
      else if (g > 1 && (idle + v / tops[g - 2] * (red - idle)) < red * 0.6 && this.wheelspin < 0.2) { this.gear--; this.shiftT = 0.08; this.shiftCool = 0.6; BUS.emit('shift', this, -1); }
    }
    this.rpm = clamp(damp(this.rpm, rpm, 14, dt), idle * 0.9, red * 1.02);
    this.redline = red;
    this.speed = this.vel.length();
    this.lift = this.input.throttle;
    // drift state
    this.drifting = this.grounded && Math.abs(this.slipAngle) > 0.2 && this.speed > 6;
    if (!this.grounded) this.airT += dt; else { if (this.airT > 0.6) BUS.emit('land', this, this.airT); this.airT = 0; }
    // safety: fell through world
    const gh = groundAt(this.pos.x, this.pos.z, this.pos.y + 50).h;
    if (this.pos.y < gh - 3 || !isFinite(this.pos.x + this.pos.y + this.pos.z)) { this.reset(V3(isFinite(this.pos.x) ? this.pos.x : 0, gh + 1, isFinite(this.pos.z) ? this.pos.z : 0), this.heading()); }
    this.syncModel(dt);
  }
  syncModel(dt) {
    const m = this.model, s = this.spec, ph = this.ph;
    m.root.position.copy(this.pos); m.root.quaternion.copy(this.quat);
    m.body.position.y = -ph.cgH;
    for (let k = 0; k < 4; k++) {
      const w = this.wheels[k];
      const y = this.mountY - (ph.rest - w.comp) - ph.cgH * 0;
      _q1.setFromEuler(new THREE.Euler(-w.spin, (w.front ? -this.steerAng : 0) + (w.left ? Math.PI : 0), 0, 'YXZ'));
      if (w.left) _q1.setFromEuler(new THREE.Euler(w.spin, (w.front ? -this.steerAng : 0) + Math.PI, 0, 'YXZ'));
      _m4.compose(_v1.set(w.x, Math.max(y, this.mountY - ph.rest - 0.05), w.z), _q1, _v2.set(1, 1, 1));
      m.wheels.setMatrixAt(k, _m4);
    }
    m.wheels.instanceMatrix.needsUpdate = true;
    m.wheels.position.set(0, 0, 0);
    m.setBrake(this.input.brake > 0.1 && !this.reverse || this.input.hand > 0.5);
    m.flames.visible = this.nitroOn;
    if (this.nitroOn) { const f = 0.8 + Math.random() * 0.6; m.flames.scale.set(1, 1, f); }
    // underglow & blob on ground
    if (m.ug.visible || m.blob.parent) {
      const g = groundAt(this.pos.x, this.pos.z, this.pos.y);
      const hAbove = this.pos.y - g.h;
      if (m.ug.visible) { m.ug.position.set(0, -hAbove + 0.06, 0); m.ug.material.opacity = clamp(1.3 - hAbove * 0.5, 0, 1); }
      if (m.blob.parent) { m.blob.position.set(this.pos.x, g.h + 0.04, this.pos.z); m.blob.rotation.z = this.heading(); m.blob.material.opacity = clamp(0.8 - (hAbove - ph.cgH) * 0.25, 0, 0.8); }
    }
  }
  wheelWorld(k, out) { const w = this.wheels[k]; return out.set(w.x, this.mountY - (this.ph.rest - w.comp) - this.spec.R + 0.02, w.z).applyQuaternion(this.quat).add(this.pos); }
}

// car-car collisions (vehicles as 3 circles each)
function vehicleCircles(v, out) {
  const s = v.spec, r = s.W / 2;
  out.length = 0;
  for (const oz of [-(s.L / 2 - r), 0, (s.L / 2 - r)]) { const c = V3(0, 0, oz).applyQuaternion(v.quat).add(v.pos); out.push(c); }
  return r;
}
const _ca = [], _cb = [];
function collideVehicles(a, b) {
  if (Math.abs(a.pos.x - b.pos.x) > 7 || Math.abs(a.pos.z - b.pos.z) > 7 || Math.abs(a.pos.y - b.pos.y) > 2.2) return;
  const ra = vehicleCircles(a, _ca), rb = vehicleCircles(b, _cb);
  for (const ca of _ca) for (const cb of _cb) {
    const dx = ca.x - cb.x, dz = ca.z - cb.z, d = Math.hypot(dx, dz), m = ra + rb;
    if (d >= m || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, pen = m - d;
    const ma = a.ph.mass, mb = b.ph.mass, ta = mb / (ma + mb), tb = ma / (ma + mb);
    a.pos.x += nx * pen * ta; a.pos.z += nz * pen * ta; b.pos.x -= nx * pen * tb; b.pos.z -= nz * pen * tb;
    const n = V3(nx, 0, nz), cp = V3().addVectors(ca, cb).multiplyScalar(0.5);
    const va = V3().crossVectors(a.angVel, V3().subVectors(cp, a.pos)).add(a.vel), vb = V3().crossVectors(b.angVel, V3().subVectors(cp, b.pos)).add(b.vel);
    const vn = V3().subVectors(va, vb).dot(n);
    if (vn < 0) {
      const j = -(1.25) * vn / (1 / ma + 1 / mb) * 0.85;
      a.applyImpulse(n.clone().multiplyScalar(j), cp); b.applyImpulse(n.clone().multiplyScalar(-j), cp);
      if (-vn > 2) { a.impact(-vn, cp, n, { kind: 'car', car: b }); b.impact(-vn, cp, n.clone().negate(), { kind: 'car', car: a }); }
    }
  }
}
