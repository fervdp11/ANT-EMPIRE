/* ANT EMPIRE - animación inicial: vuelo nupcial, pérdida de alas, excavación y primeros huevos */
'use strict';

AE.Intro = (function () {
  const U = AE.U, W = AE.W, C = AE.C;
  let active = false, t = 0, hasWings = true, eggs = 0;
  let fallingWings = [];
  let dom = null, caption = null, lastCap = '';

  function start() {
    active = true; t = 0; hasWings = true; eggs = 0; fallingWings = [];
    dom = document.getElementById('intro');
    caption = document.getElementById('introCaption');
    dom.classList.add('show');
    document.getElementById('introSkip').onclick = finish;
    document.body.classList.add('in-intro');
  }
  function wings() { return active && hasWings; }
  function isActive() { return active; }

  function cap(txt) {
    if (txt === lastCap) return;
    lastCap = txt;
    caption.classList.remove('vis');
    setTimeout(() => { caption.textContent = txt; caption.classList.add('vis'); }, 250);
  }

  function update(dt) {
    if (!active) return;
    t += dt;
    const g = AE.G, q = g.queen, st = AE.Q.st;
    const r = g.chambers[0], tn = g.tunnels[0];
    const landX = C.EX - 170;
    if (t < 4) {
      cap('Tras el vuelo nupcial, una joven reina fecundada busca un lugar para fundar su imperio...');
      const k = U.easeInOut(t / 4);
      const x0 = C.EX - 900, y0 = -520, cx = C.EX - 300, cy = -480, x1 = landX, y1 = W.groundY(landX) - 13;
      q.x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * cx + k * k * x1;
      q.y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cy + k * k * y1 + Math.sin(t * 6) * 6 * (1 - k);
      q.facing = 1; st.ang = U.lerp(-0.25, 0, k); st.moving = true; st.ph = (t * 3) % 1;
    } else if (t < 5.6) {
      cap('Al aterrizar, se desprende de sus alas: ya no volverá a volar.');
      q.x = landX; q.y = W.groundY(landX) - 13; st.moving = false; st.ang = 0;
      if (hasWings && t > 4.5) {
        hasWings = false;
        for (let i = 0; i < 2; i++) fallingWings.push({ x: q.x - 6 + i * 6, y: q.y - 34, vx: (i ? 25 : -30), vy: -30, rot: 0, vr: i ? 2 : -2.5, life: 0 });
      }
    } else if (t < 7.2) {
      cap('Busca tierra blanda y comienza a excavar...');
      const k = U.smooth((t - 5.6) / 1.6);
      q.x = U.lerp(landX, C.EX, k); q.y = W.groundY(q.x) - 13; st.moving = true; st.ph = (st.ph + dt * 2.6) % 1; q.facing = 1;
      st.ang = Math.atan(W.groundSlope(q.x));
    } else if (t < 10.5) {
      cap('Excava un túnel vertical hacia las profundidades.');
      const k = (t - 7.2) / 3.3;
      tn.prog = U.clamp(k, 0, 1);
      const p = W.tunnelAt(tn, Math.max(0, tn._len * tn.prog - 26));
      q.x = p.x; q.y = p.y;
      st.ang = U.angLerp(st.ang, Math.atan2(p.ty, p.tx), 0.2); q.facing = 1;
      st.moving = true; st.ph = (st.ph + dt * 1.5) % 1;
      if (AE.FX && Math.random() < 0.5) AE.FX.dust(p.x + p.tx * 30, p.y + p.ty * 30, 2);
    } else if (t < 13) {
      cap('Al fondo, construye su primera cámara: la Cámara Real.');
      tn.prog = 1;
      const k = (t - 10.5) / 2.5;
      r.prog = U.clamp(k, 0, 1);
      const p = W.chamberPos(r, U.lerp(-Math.PI / 2 - 0.3, Math.PI / 2 - 0.2, U.smooth(k)), AE.Q.RAD);
      q.x = U.lerp(q.x, p.x, 0.15); q.y = U.lerp(q.y, p.y, 0.15);
      st.ang = U.angLerp(st.ang, Math.atan2(-p.nx, p.ny), 0.15);
      st.digging = 0.1; st.moving = false;
      if (AE.FX && Math.random() < 0.6) AE.FX.dust(r.x + U.rand(-r.rx, r.rx) * W.chScale(r) * 0.8, r.y + U.rand(-r.ry, r.ry) * W.chScale(r) * 0.6, 2);
    } else if (t < 15.5) {
      cap('Y allí, a salvo bajo tierra, pone sus primeros huevos. Nace ANT EMPIRE.');
      r.prog = 1; r.done = true; r.work = r.total; st.digging = 0;
      const p = W.chamberPos(r, Math.PI / 2 - 0.2, AE.Q.RAD);
      q.x = U.lerp(q.x, p.x, 0.1); q.y = U.lerp(q.y, p.y, 0.1); st.ang = U.angLerp(st.ang, 0, 0.1); q.facing = -1;
      const want = Math.min(4, Math.floor((t - 13.2) / 0.5));
      while (eggs < want) { eggs++; forceEgg(); }
    } else finish();
    // alas cayendo
    for (const w of fallingWings) { w.life += dt; w.vy = Math.min(40, w.vy + 60 * dt); w.x += w.vx * dt + Math.sin(w.life * 3) * 0.6; w.y = Math.min(W.groundY(w.x) - 2, w.y + w.vy * dt); w.rot += w.vr * dt * (w.y < W.groundY(w.x) - 3 ? 1 : 0); }
  }
  function forceEgg() {
    const g = AE.G;
    const last = g.brood[g.brood.length - 1];
    if (last && last.s === 0) last.n++; else g.brood.push({ s: 0, t: 0, n: 1, c: 'w' });
    g.stats.eggs++;
    if (AE.FX) AE.FX.eggLaid();
  }
  function finish() {
    if (!active) return;
    const g = AE.G, r = g.chambers[0], tn = g.tunnels[0];
    tn.prog = 1; r.prog = 1; r.done = true; r.work = r.total;
    while (eggs < 4) { eggs++; forceEgg(); }
    hasWings = false;
    const p = W.chamberPos(r, Math.PI / 2 - 0.2, AE.Q.RAD);
    g.queen.x = p.x; g.queen.y = p.y; AE.Q.st.vx = AE.Q.st.vy = 0; AE.Q.st.digging = 0;
    g.introDone = true;
    active = false;
    dom.classList.remove('show');
    document.body.classList.remove('in-intro');
    AE.Eco.computeStats();
    AE.Save.save(false);
    AE.UI.showHelp(true);
  }
  function draw(ctx) {
    if (!fallingWings.length) return;
    for (const w of fallingWings) {
      if (w.life > 30) continue;
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.rot);
      ctx.globalAlpha = Math.max(0, 1 - w.life / 30);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-18, -10, -38, -4); ctx.quadraticCurveTo(-22, 6, 0, 2); ctx.closePath();
      ctx.fillStyle = 'rgba(225,235,245,0.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(70,60,60,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
  }
  return { start, update, draw, wings, isActive, finish };
})();
