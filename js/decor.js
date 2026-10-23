/* ANT EMPIRE - decoración de cámaras (cría, provisiones, hongos, agua...) y partículas */
'use strict';

AE.D = (function () {
  const U = AE.U, W = AE.W;

  function floorPt(c, a, inset) {
    const s = W.chScale(c);
    return { x: c.x + Math.cos(a) * (c.rx * s - inset), y: c.y + Math.sin(a) * (c.ry * s - inset) };
  }
  function egg(ctx, x, y, r, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.72, r, rot, 0, U.TAU);
    ctx.fillStyle = '#fbf6e8'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#a89878'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.35, r * 0.25, r * 0.35, rot, 0, U.TAU); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
  }
  function larva(ctx, x, y, r, t, i) {
    const w = Math.sin(t * 2 + i) * 0.15;
    ctx.save(); ctx.translate(x, y); ctx.rotate(w);
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 0.15, Math.PI * 1.55);
    ctx.lineWidth = r * 0.95; ctx.lineCap = 'round'; ctx.strokeStyle = '#a89070'; ctx.stroke();
    ctx.lineWidth = r * 0.75; ctx.strokeStyle = '#f6ecd6'; ctx.stroke();
    ctx.restore();
  }
  function pupa(ctx, x, y, r, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.5, r * 0.85, rot, 0, U.TAU);
    const g = ctx.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, '#f4e2bc'); g.addColorStop(1, '#cfae7a');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = '#8a6a40'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.7); ctx.lineTo(x - r * 0.5, y + r * 0.7); ctx.moveTo(x + r * 0.3, y - r * 0.75); ctx.lineTo(x + r * 0.3, y + r * 0.75);
    ctx.strokeStyle = 'rgba(138,106,64,0.5)'; ctx.stroke();
  }

  function broodHere(c) {
    const nurs = AE.G.chambers.filter(x => x.done && x.type === 'nursery');
    if (c.type === 'nursery') return nurs.length ? 1 / nurs.length : 0;
    if (c.type === 'royal') return nurs.length ? 0 : 1;
    return 0;
  }

  function drawBrood(ctx, c, frac, t) {
    const e = AE.Eco.broodCount(0) * frac, l = AE.Eco.broodCount(1) * frac, p = (AE.Eco.broodCount(2) + AE.Eco.broodCount(3)) * frac;
    const s = W.chScale(c);
    const base = c.type === 'royal' ? 0.55 : 0;
    const k = c.type === 'royal' ? 0.45 : 1;
    const rng = U.mulberry32(c.id * 31 + 7);
    const draw = (n, cap, a0, spread, fn) => {
      n = Math.min(cap, Math.ceil(n));
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + a0 + (rng() - 0.5) * spread;
        const row = Math.floor(i / 9);
        const pt = floorPt(c, a, 6 + row * 7 + rng() * 3);
        fn(pt.x, pt.y, i);
      }
    };
    draw(p, 18, base + 0.55 * k, 0.5 * k, (x, y) => pupa(ctx, x, y, 5.5, (rng() - 0.5) * 0.5));
    draw(l, 18, base, 0.55 * k, (x, y, i) => larva(ctx, x, y, 4.2, t, i));
    draw(e, 30, base - 0.55 * k, 0.5 * k, (x, y) => egg(ctx, x, y, 3.6, (rng() - 0.5)));
  }

  function leafBit(ctx, x, y, r, rot, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * 0.8, r, 0); ctx.quadraticCurveTo(0, r * 0.8, -r, 0);
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#2d4a18'; ctx.stroke();
    ctx.restore();
  }
  function fungusBlob(ctx, x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#d6ccb0');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#968a6a'; ctx.stroke();
  }
  function mushroom(ctx, x, y, s) {
    ctx.fillStyle = '#f2ead6'; ctx.strokeStyle = '#7d6a4a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(x - 1.6 * s, y - 7 * s, 3.2 * s, 7 * s); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 7 * s, 6 * s, 4 * s, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = '#e9a26a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x - 2 * s, y - 9 * s, 1 * s, 0, U.TAU); ctx.fill();
  }

  function drawChamber(ctx, c, t) {
    if (!c.done && c.prog < 0.6) return;
    const s = W.chScale(c);
    const g = AE.G, cap = AE.Eco.stats().cap;
    const bf = broodHere(c);
    if (bf > 0) drawBrood(ctx, c, bf, t);
    const rng = U.mulberry32(c.id * 131 + 11);
    switch (c.type) {
      case 'royal': {
        // cojín real de fibras vegetales
        const p = floorPt(c, Math.PI / 2 + 0.15, 4);
        ctx.fillStyle = 'rgba(200,140,60,0.35)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, c.rx * 0.45, 10, 0, 0, U.TAU); ctx.fill();
        if (!g.chambers.some(x => x.done && x.type === 'storage')) storagePile(ctx, c, rng, cap * 0.4);
        break;
      }
      case 'storage': storagePile(ctx, c, rng, cap); break;
      case 'fungus': {
        const n = Math.min(14, 5 + c.level * 2);
        const fill = U.clamp(0.4 + g.res.leaf / Math.max(1, cap), 0.4, 1);
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + (i / (n - 1) - 0.5) * 1.6;
          const p = floorPt(c, a, 10 + rng() * 4);
          fungusBlob(ctx, p.x, p.y - 4, (8 + rng() * 9) * fill);
        }
        for (let i = 0; i < Math.min(8, 2 + c.level); i++) {
          const a = Math.PI / 2 + (rng() - 0.5) * 1.4; const p = floorPt(c, a, 20);
          mushroom(ctx, p.x, p.y - 8, 0.9 + rng() * 0.6);
        }
        break;
      }
      case 'cistern': {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * s, c.ry * s, 0, 0, U.TAU); ctx.clip();
        const lvl = U.clamp(g.res.water / Math.max(1, cap), 0.1, 1);
        const wy = c.y + c.ry * s * (1 - lvl * 0.7);
        const gr = ctx.createLinearGradient(0, wy, 0, c.y + c.ry);
        gr.addColorStop(0, 'rgba(120,200,240,0.85)'); gr.addColorStop(1, 'rgba(40,110,170,0.9)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(c.x - c.rx, wy);
        for (let x = -c.rx; x <= c.rx; x += 10) ctx.lineTo(c.x + x, wy + Math.sin(x * 0.05 + t * 2) * 2);
        ctx.lineTo(c.x + c.rx, c.y + c.ry + 5); ctx.lineTo(c.x - c.rx, c.y + c.ry + 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(230,250,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); for (let x = -c.rx * 0.7; x <= c.rx * 0.7; x += 10) ctx.lineTo(c.x + x, wy + Math.sin(x * 0.05 + t * 2) * 2); ctx.stroke();
        ctx.restore();
        if (Math.random() < 0.02 && AE.FX) AE.FX.drop(c.x + U.rand(-c.rx * 0.5, c.rx * 0.5), c.y - c.ry * 0.8, wy);
        break;
      }
      case 'dorm': {
        for (let i = 0; i < 5; i++) {
          const p = floorPt(c, Math.PI / 2 + (i - 2) * 0.32, 3);
          ctx.fillStyle = 'rgba(110,60,25,0.45)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 16, 5, 0, 0, U.TAU); ctx.fill();
        }
        break;
      }
      case 'workshop': {
        for (let i = 0; i < 4; i++) {
          const p = floorPt(c, Math.PI / 2 + (i - 1.5) * 0.45, 2);
          ctx.fillStyle = '#7a5030'; ctx.strokeStyle = '#3b2312'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, 16 + rng() * 8, 12, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
          for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(p.x + (rng() - 0.5) * 22, p.y - 6 - rng() * 8, 2.5, 0, U.TAU); ctx.fillStyle = '#8c6038'; ctx.fill(); ctx.stroke(); }
        }
        break;
      }
      case 'scout': {
        for (let i = 0; i < 6; i++) {
          const p = floorPt(c, Math.PI / 2 + (rng() - 0.5) * 1.6, 6);
          if (i % 2) leafBit(ctx, p.x, p.y - 3, 8, rng() * 3, '#c7a33c');
          else { ctx.fillStyle = '#d8c070'; ctx.strokeStyle = '#6a5420'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y - 3, 5, 3, rng(), 0, U.TAU); ctx.fill(); ctx.stroke(); }
        }
        break;
      }
      case 'barracks': {
        for (let i = 0; i < 6; i++) {
          const p = floorPt(c, Math.PI / 2 + (i - 2.5) * 0.3, 4);
          ctx.fillStyle = '#6e5848'; ctx.strokeStyle = '#2e1c10'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 7, 9, 8, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case 'nuptial': {
        const gl = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
        gl.addColorStop(0, 'rgba(255,220,120,0.25)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * s, c.ry * s, 0, 0, U.TAU); ctx.fill();
        for (let i = 0; i < 9; i++) {
          const p = floorPt(c, Math.PI / 2 + (rng() - 0.5) * 1.8, 5);
          ctx.fillStyle = rng() < 0.5 ? '#f4c6d8' : '#fbe9a0';
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 5, 2.5, rng() * 3, 0, U.TAU); ctx.fill();
        }
        break;
      }
    }
  }
  function storagePile(ctx, c, rng, cap) {
    const r = AE.G.res;
    const lf = U.clamp(r.leaf / Math.max(1, cap), 0, 1), fu = U.clamp(r.fungus / Math.max(1, cap), 0, 1);
    const nl = Math.round(3 + lf * 22), nf = Math.round(fu * 12);
    for (let i = 0; i < nl; i++) {
      const a = Math.PI / 2 - 0.15 + (rng() - 0.5) * 1.1;
      const p = floorPt(c, a, 6 + (i % 4) * 5);
      leafBit(ctx, p.x, p.y - 2, 7 + rng() * 5, rng() * 3, rng() < 0.6 ? '#7cc24a' : '#5c9a32');
    }
    for (let i = 0; i < nf; i++) {
      const a = Math.PI / 2 + 0.5 + (rng() - 0.5) * 0.6;
      const p = floorPt(c, a, 8 + (i % 3) * 6);
      fungusBlob(ctx, p.x, p.y - 3, 5 + rng() * 3);
    }
    if (r.water > 5) {
      const p = floorPt(c, Math.PI / 2 - 0.8, 8);
      for (let i = 0; i < Math.min(5, 1 + r.water / cap * 6); i++) {
        const x = p.x + i * 9 - 10, y = p.y - 3;
        ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.quadraticCurveTo(x + 5, y, x, y + 2); ctx.quadraticCurveTo(x - 5, y, x, y - 7);
        ctx.fillStyle = 'rgba(110,190,240,0.9)'; ctx.fill(); ctx.strokeStyle = '#2c6a9a'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  function draw(ctx, cam, t) {
    for (const c of AE.G.chambers) if ((c.done || c.prog > 0.6) && AE.R.visC(c, cam, 20)) drawChamber(ctx, c, t);
  }
  return { draw, egg };
})();

/* ---------- Partículas ---------- */
AE.FX = (function () {
  const U = AE.U;
  let ps = [];
  const MAX = 400;
  function add(p) { if (ps.length < MAX) ps.push(p); }
  function dust(x, y, n) {
    for (let i = 0; i < n; i++) add({ k: 'dust', x, y, vx: U.rand(-30, 30), vy: U.rand(-40, -5), life: 0, max: U.rand(0.5, 1), r: U.rand(1.5, 3.5), col: Math.random() < 0.5 ? '#a8784a' : '#7a5030' });
  }
  function soil(x, y) { add({ k: 'pellet', x, y: y - 4, vx: U.rand(-20, 20), vy: -40, life: 0, max: 8, r: 3.2 }); }
  function spark(x, y) { add({ k: 'spark', x, y, vx: U.rand(-40, 40), vy: U.rand(-60, -10), life: 0, max: 0.5, r: 2 }); }
  function drop(x, y, toY) { add({ k: 'drop', x, y, vx: 0, vy: 0, life: 0, max: 3, r: 2.5, to: toY }); }
  function eggLaid() {
    const q = AE.G.queen;
    for (let i = 0; i < 8; i++) add({ k: 'spark', x: q.x - 20 * q.facing, y: q.y + 4, vx: U.rand(-35, 35), vy: U.rand(-50, -10), life: 0, max: 0.8, r: 2.2, gold: true });
  }
  function chamberDone(c) {
    for (let i = 0; i < 26; i++) add({ k: 'dust', x: c.x + U.rand(-c.rx * 0.8, c.rx * 0.8), y: c.y + U.rand(-c.ry * 0.6, c.ry * 0.6), vx: U.rand(-25, 25), vy: U.rand(-30, 10), life: 0, max: U.rand(0.8, 1.6), r: U.rand(2, 5), col: '#c09060' });
  }
  function flight(n) {
    n = Math.min(40, n + 6);
    const x0 = AE.C.EX;
    for (let i = 0; i < n; i++) add({ k: 'flyer', x: x0 + U.rand(-30, 30), y: AE.W.groundY(x0) - 5, vx: U.rand(-40, 40), vy: U.rand(-90, -50), life: -i * 0.25, max: 9, spr: i % 3 === 0 ? 'princess' : 'male', ph: Math.random() * 6 });
    if (AE.Cam) AE.Cam.peek(x0, -200, 6);
  }
  function update(dt) {
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life < 0) continue;
      if (p.k === 'dust') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
      else if (p.k === 'pellet') {
        const gy = AE.W.groundY(p.x) - 2;
        if (p.y < gy) { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > gy) { p.y = gy; p.vx = 0; } }
      } else if (p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
      else if (p.k === 'drop') { p.vy += 300 * dt; p.y += p.vy * dt; if (p.y > p.to) p.life = p.max; }
      else if (p.k === 'flyer') { p.ph += dt * 30; p.x += (p.vx + Math.sin(p.life * 2 + p.ph * 0.05) * 30) * dt; p.y += p.vy * dt; }
      if (p.life >= p.max) ps.splice(i, 1);
    }
  }
  function draw(ctx, cam) {
    for (const p of ps) {
      if (p.life < 0) continue;
      if (p.x < cam.vx0 - 50 || p.x > cam.vx1 + 50 || p.y < cam.vy0 - 50 || p.y > cam.vy1 + 50) continue;
      const a = 1 - p.life / p.max;
      if (p.k === 'dust') { ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill(); }
      else if (p.k === 'pellet') { ctx.globalAlpha = Math.min(1, a * 3); ctx.fillStyle = '#7a5030'; ctx.strokeStyle = '#3b2312'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill(); ctx.stroke(); }
      else if (p.k === 'spark') { ctx.globalAlpha = a; ctx.fillStyle = p.gold ? '#ffe08a' : '#fff4c0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a + 0.5, 0, U.TAU); ctx.fill(); }
      else if (p.k === 'drop') { ctx.globalAlpha = 0.9; ctx.fillStyle = '#8fd0f4'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 2, 3.5, 0, 0, U.TAU); ctx.fill(); }
      else if (p.k === 'flyer') {
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.vx < 0 ? -1.2 : 1.2, 1.2); ctx.rotate(-0.3);
        AE.S.drawAnt(ctx, p.spr, 0.2, { still: true, flap: (Math.sin(p.ph) + 1) * 0.5 });
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
  function clear() { ps = []; }
  return { dust, soil, spark, drop, eggLaid, chamberDone, flight, update, draw, clear };
})();
