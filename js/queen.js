/* ANT EMPIRE - la reina: física, control, necesidades e interacción */
'use strict';

AE.Q = (function () {
  const U = AE.U, W = AE.W, C = AE.C;
  const RAD = 13;
  const st = { vx: 0, vy: 0, ang: 0, attached: false, ph: 0, digging: 0, moving: false, grounded: false, idleT: 0, antT: 0, topMsgT: 0 };
  let curCh = null, chT = 0;

  function Q() { return AE.G.queen; }
  function chamber() { return curCh; }
  function inRoyal() { return !!(curCh && curCh.type === 'royal'); }

  function respawn() {
    const r = AE.Eco.royal();
    const q = Q();
    q.x = r.x; q.y = r.y + r.ry * W.chScale(r) - RAD - 4;
    st.vx = st.vy = 0;
  }
  function ensureValid() {
    const q = Q();
    if (!isFinite(q.x) || !isFinite(q.y) || W.sdf(q.x, q.y) > -RAD + 6) respawn();
  }

  function update(dt, inp) {
    const q = Q();
    const g = AE.G;
    const lowE = q.energy < 8 ? 0.5 : 1, weak = q.health < 30 ? 0.7 : 1;
    const speed = 95 * lowE * weak * AE.Eco.stats().speedMult;
    const climb = 70 * lowE * weak * AE.Eco.stats().speedMult;
    let ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let iy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    if (st.digging > 0) { ix = 0; iy = 0; }
    const steps = 2, h = dt / steps;
    for (let sI = 0; sI < steps; sI++) {
      let d = W.sdf(q.x, q.y);
      let n = W.grad(q.x, q.y);
      const clear = -d - RAD;
      const touching = clear < 4;
      const wantCling = (inp.space || (inp.up && touching) || (st.attached && (inp.up || inp.down))) && clear < 16;
      st.attached = wantCling;
      if (st.attached) {
        let mx = ix, my = iy;
        const ml = Math.hypot(mx, my);
        if (ml > 0) {
          mx /= ml; my /= ml;
          const dn = mx * n.x + my * n.y;
          let tx = mx - n.x * dn, ty = my - n.y * dn;
          const tl = Math.hypot(tx, ty);
          if (tl > 0.05) { st.vx = tx / tl * climb; st.vy = ty / tl * climb; }
          else if (dn < 0 && !inp.space) { st.attached = false; st.vx = mx * 40; st.vy = my * 40; }
          else { st.vx = 0; st.vy = 0; }
        } else { st.vx = 0; st.vy = 0; }
        q.x += st.vx * h; q.y += st.vy * h;
        // adherencia a la superficie
        const d2 = W.sdf(q.x, q.y), c2 = -d2 - RAD;
        if (c2 > 0.5 && c2 < 22) { const n2 = W.grad(q.x, q.y); q.x += n2.x * (c2 - 0.5); q.y += n2.y * (c2 - 0.5); }
        st.grounded = false;
      } else {
        st.grounded = touching && n.y > 0.55;
        if (st.grounded) {
          const tx = n.y, ty = -n.x;
          if (ix !== 0) { st.vx = tx * ix * speed; st.vy = ty * ix * speed + 30; }
          else { st.vx = 0; st.vy = 0; }
        } else {
          st.vy = Math.min(650, st.vy + 1100 * h);
          st.vx = U.lerp(st.vx, ix * speed * 0.7, 1 - Math.exp(-6 * h));
        }
        q.x += st.vx * h; q.y += st.vy * h;
      }
      // resolución de colisiones
      for (let it = 0; it < 4; it++) {
        d = W.sdf(q.x, q.y);
        const pen = d + RAD;
        if (pen <= 0) break;
        n = W.grad(q.x, q.y);
        q.x -= n.x * pen; q.y -= n.y * pen;
        const vn = st.vx * n.x + st.vy * n.y;
        if (vn > 0) { st.vx -= n.x * vn; st.vy -= n.y * vn; }
      }
      // no puede salir del nido
      const topY = W.groundY(C.EX) + 12;
      if (q.y < topY) {
        q.y = topY; if (st.vy < 0) st.vy = 0;
        if (st.topMsgT <= 0) { AE.Eco.note('La reina se asoma al exterior, pero nunca abandona el nido.'); st.topMsgT = 8; }
      }
    }
    st.topMsgT -= dt;
    if (W.sdf(q.x, q.y) > 8) respawn();

    // orientación
    const d = W.sdf(q.x, q.y), clear = -d - RAD;
    let target = 0;
    if (clear < 7) { const n = W.grad(q.x, q.y); target = Math.atan2(-n.x, n.y); }
    st.ang = U.angLerp(st.ang, target, 1 - Math.exp(-10 * dt));
    const lx = Math.cos(st.ang), ly = Math.sin(st.ang);
    const vd = st.vx * lx + st.vy * ly;
    if (vd > 5) q.facing = 1; else if (vd < -5) q.facing = -1;
    const sp = Math.hypot(st.vx, st.vy);
    st.moving = sp > 5 && (st.grounded || st.attached);
    if (st.moving) st.ph = (st.ph + sp * dt / 34) % 1;
    st.antT += dt;

    // necesidades: energía
    if (st.digging > 0) q.energy -= 1.2 * dt;
    else if (st.moving) q.energy -= 0.22 * dt;
    else q.energy += (inRoyal() ? 4 : 1.2) * dt;
    q.energy = U.clamp(q.energy, 0, 100);

    // cámara actual
    chT -= dt;
    if (chT <= 0) { curCh = W.chamberAt(q.x, q.y, 10); chT = 0.2; }

    // excavación manual
    if (st.digging > 0) {
      st.digging = Math.max(0, st.digging - dt);
      const job = nearDig();
      if (job && q.energy > 2) {
        AE.Eco.addWork(job, 2.6 * AE.Eco.stats().digMult * dt);
        g.res.soil = Math.min(AE.Eco.stats().cap, g.res.soil + 1.2 * dt);
        if (AE.FX && Math.random() < dt * 14) { const f = W.digFront(job); AE.FX.dust(U.lerp(q.x, f.x, 0.6), U.lerp(q.y, f.y, 0.6), 2); }
      } else st.digging = 0;
    }
  }

  function nearDig() {
    const q = Q();
    let best = null, bd = 120;
    for (const c of AE.G.chambers) {
      if (c.done) continue;
      const f = W.digFront(c);
      const d = U.dist(q.x, q.y, f.x, f.y);
      const lim = f.kind === 'c' ? Math.max(c.rx, c.ry) * W.chScale(c) + 60 : 100;
      if (d < lim && d < bd + (f.kind === 'c' ? 200 : 0)) { bd = d; best = c; }
    }
    return best;
  }
  function dig() { if (nearDig()) st.digging = 0.25; }

  // elemento con el que se puede interactuar
  function interactable() {
    const q = Q();
    const job = nearDig();
    if (job) return { kind: 'dig', c: job, label: 'Mantén E para excavar · ' + AE.CHAMBERS[job.type].name };
    const a = AE.Agents.near(q.x, q.y, 46);
    if (a) return { kind: 'ant', a, label: 'E · ' + AE.ROLES[a.role].name };
    if (curCh && curCh.done) {
      const extra = (curCh.type === 'royal' || curCh.type === 'nursery') ? '   ·   Q · Poner huevo' : '';
      return { kind: 'chamber', c: curCh, label: 'E · ' + AE.CHAMBERS[curCh.type].name + extra };
    }
    if (q.y < W.groundY(C.EX) + 80) return { kind: 'none', label: 'La entrada del hormiguero' };
    return null;
  }
  function canLay() { return !!(curCh && curCh.done && (curCh.type === 'royal' || curCh.type === 'nursery')); }

  function draw(ctx, cam, t) {
    const q = Q();
    const z = cam.z;
    const sx = (q.x - cam.x) * z + cam.cx, sy = (q.y - cam.y) * z + cam.cy;
    const cs = Math.cos(st.ang), sn = Math.sin(st.ang), f = q.facing || 1;
    // sombra/halo cálido
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90 * z);
    gl.addColorStop(0, 'rgba(255,200,120,0.18)'); gl.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gl; ctx.fillRect(sx - 90 * z, sy - 90 * z, 180 * z, 180 * z);
    ctx.setTransform(cs * z * f, sn * z * f, -sn * z, cs * z, sx, sy);
    const breathe = 1 + Math.sin(t * 2.2) * 0.012;
    ctx.scale(1, breathe);
    const dg = st.digging > 0 ? (t * 3) % 1 : 0;
    AE.S.drawAnt(ctx, 'queen', st.ph, { still: !st.moving, antPh: st.antT * 0.35, digging: dg, wingsOn: !!AE.Intro && AE.Intro.wings() });
    // corona
    ctx.setTransform(z, 0, 0, z, sx, sy);
    const hx = Math.cos(st.ang) * 27 * f - Math.sin(st.ang) * -30, hy = Math.sin(st.ang) * 27 * f + Math.cos(st.ang) * -30;
    drawCrown(ctx, hx, hy + Math.sin(t * 2) * 1.5);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawCrown(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-8, 4); ctx.lineTo(-9, -4); ctx.lineTo(-4.5, 0); ctx.lineTo(0, -7); ctx.lineTo(4.5, 0); ctx.lineTo(9, -4); ctx.lineTo(8, 4); ctx.closePath();
    const g = ctx.createLinearGradient(0, -7, 0, 4); g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#e0a020');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#7a4a08'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = '#d23c2c'; ctx.beginPath(); ctx.arc(0, 0.5, 1.5, 0, U.TAU); ctx.fill();
    ctx.restore();
  }
  function hit(wx, wy) { const q = Q(); return U.dist(wx, wy, q.x, q.y) < 42; }

  return { update, draw, chamber, inRoyal, respawn, ensureValid, dig, nearDig, interactable, canLay, hit, st, RAD };
})();
