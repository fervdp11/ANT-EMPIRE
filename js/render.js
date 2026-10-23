/* ANT EMPIRE - dibujo del mundo: cielo, superficie, tierra, piedras, raíces y galerías */
'use strict';

AE.R = (function () {
  const U = AE.U, C = AE.C, W = AE.W;
  const R = C.TUN_R;
  let dirtPat = null, dirtCanvas = null, vignette = null, vigW = 0, vigH = 0;
  const cells = new Map();
  let grass = null, plants = null;

  /* ---------- Texturas ---------- */
  function makeDirt() {
    const S = 512;
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d');
    c.fillStyle = '#7b4a26'; c.fillRect(0, 0, S, S);
    const rng = U.mulberry32(1234);
    function wrapped(fn, x, y, r) {
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        if (x + ox + r < 0 || x + ox - r > S || y + oy + r < 0 || y + oy - r > S) continue;
        fn(x + ox, y + oy);
      }
    }
    // manchas grandes suaves
    for (let i = 0; i < 70; i++) {
      const x = rng() * S, y = rng() * S, r = 20 + rng() * 60;
      const dark = rng() < 0.55;
      wrapped((X, Y) => {
        const g = c.createRadialGradient(X, Y, 0, X, Y, r);
        g.addColorStop(0, dark ? 'rgba(70,38,16,0.35)' : 'rgba(160,104,60,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(X - r, Y - r, r * 2, r * 2);
      }, x, y, r);
    }
    // grumos con contorno
    for (let i = 0; i < 140; i++) {
      const x = rng() * S, y = rng() * S, r = 2 + rng() * 7, ry = r * (0.6 + rng() * 0.4), rot = rng() * 3;
      const col = rng() < 0.5 ? '#6a3c1c' : '#8d5a32';
      wrapped((X, Y) => {
        c.beginPath(); c.ellipse(X, Y, r, ry, rot, 0, U.TAU);
        c.fillStyle = col; c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(50,25,10,0.55)'; c.stroke();
        c.beginPath(); c.ellipse(X - r * 0.3, Y - ry * 0.35, r * 0.45, ry * 0.3, rot, 0, U.TAU);
        c.fillStyle = 'rgba(255,210,160,0.18)'; c.fill();
      }, x, y, r);
    }
    // motas
    for (let i = 0; i < 900; i++) {
      const x = rng() * S, y = rng() * S;
      c.fillStyle = rng() < 0.5 ? 'rgba(40,20,8,0.35)' : 'rgba(200,150,100,0.22)';
      c.fillRect(x, y, 1.5, 1.5);
    }
    dirtCanvas = cv;
  }

  function cellData(cx, cy) {
    const key = cx + ',' + cy;
    let d = cells.get(key);
    if (d) return d;
    const rng = U.mulberry32(U.hash2(cx, cy, AE.G.seed));
    d = { stones: [], roots: [] };
    const x0 = cx * 400, y0 = cy * 400;
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * 400, y = y0 + rng() * 400;
      if (y < W.groundY(x) + 40) continue;
      const r = 7 + rng() * 22 * (rng() < 0.2 ? 2 : 1);
      d.stones.push({ x, y, rx: r, ry: r * (0.55 + rng() * 0.3), rot: (rng() - 0.5) * 0.8, tone: rng() });
    }
    if (y0 < 500 && y0 + 400 > -50) {
      const nr = Math.floor(rng() * 1.8);
      for (let i = 0; i < nr; i++) {
        const x = x0 + rng() * 400;
        const top = W.groundY(x) + 6;
        if (y0 > top + 400) continue;
        const len = 120 + rng() * 380;
        const pts = [[x, top]];
        let px = x, py = top, a = Math.PI / 2 + (rng() - 0.5) * 0.6;
        const segs = 8;
        for (let s = 0; s < segs; s++) { a += (rng() - 0.5) * 0.7; px += Math.cos(a) * len / segs; py += Math.sin(a) * len / segs; pts.push([px, py]); }
        const branches = [];
        for (let b = 0; b < 3; b++) {
          const k = 2 + Math.floor(rng() * 5), p = pts[k];
          const ba = a + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.6), bl = 30 + rng() * 70;
          branches.push([p[0], p[1], p[0] + Math.cos(ba) * bl, p[1] + Math.sin(ba) * bl + bl * 0.3]);
        }
        d.roots.push({ pts, w: 3 + rng() * 5, branches });
      }
    }
    cells.set(key, d);
    return d;
  }

  function buildSurface() {
    const rng = U.mulberry32(777);
    grass = [];
    for (let x = 0; x < C.WORLD_W; x += 6 + rng() * 5) {
      const m = W.mound(x) / 30;
      if (m > 0.55 && rng() < 0.85) continue;
      grass.push({ x, h: (10 + rng() * 16) * (1 - m * 0.6), lean: (rng() - 0.5) * 8, c: rng(), front: rng() < 0.22 });
    }
    plants = [];
    for (let i = 0; i < 90; i++) {
      const x = rng() * C.WORLD_W;
      if (Math.abs(x - C.EX) < 200) continue;
      plants.push({ x, kind: rng() < 0.4 ? 'clover' : rng() < 0.6 ? 'flower' : rng() < 0.5 ? 'leaf' : 'tall', s: 0.7 + rng() * 0.7, c: rng() });
    }
  }

  function init() { makeDirt(); buildSurface(); }

  /* ---------- Cielo y fondo ---------- */
  const colCache = new Map();
  function parseCol(c) {
    let v = colCache.get(c);
    if (v) return v;
    if (c[0] === '#') { const n = parseInt(c.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; }
    else { const m = c.match(/\d+(\.\d+)?/g); v = [+m[0], +m[1], +m[2]]; }
    if (colCache.size < 500) colCache.set(c, v);
    return v;
  }
  function mix(a, b, t) {
    const pa = parseCol(a), pb = parseCol(b);
    t = U.clamp(t, 0, 1);
    return 'rgb(' + ((pa[0] + (pb[0] - pa[0]) * t) | 0) + ',' + ((pa[1] + (pb[1] - pa[1]) * t) | 0) + ',' + ((pa[2] + (pb[2] - pa[2]) * t) | 0) + ')';
  }
  function duskAmt() {
    const p = AE.Eco.dayPhase();
    const a = Math.exp(-Math.pow((p - 0.65) / 0.045, 2)), b = Math.exp(-Math.pow((p - 0.955) / 0.035, 2));
    return Math.max(a, b);
  }
  function drawSky(ctx, cam, vw, vh) {
    const gy = (0 - cam.y) * cam.z + cam.cy;
    if (gy < -50) return;
    const dl = AE.Eco.daylight(), du = duskAmt();
    const top = mix('#0a1230', '#4f9fe0', dl);
    const bot = mix(mix('#25315a', '#cbe8f6', dl), '#f3a35c', du * 0.85);
    const syTop = (-1400 - cam.y) * cam.z + cam.cy;
    const g = ctx.createLinearGradient(0, syTop, 0, gy);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, Math.min(vh, gy + 60));
    // estrellas
    if (dl < 0.6) {
      ctx.fillStyle = 'rgba(255,255,240,' + (0.8 * (1 - dl / 0.6)) + ')';
      const rng = U.mulberry32(42);
      for (let i = 0; i < 120; i++) {
        const x = ((rng() * 3000 - cam.x * 0.05 * cam.z) % vw + vw) % vw, y = rng() * gy * 0.9;
        const s = rng() < 0.1 ? 2 : 1.2;
        ctx.fillRect(x, y, s, s);
      }
    }
    // sol y luna
    const p = AE.Eco.dayPhase();
    const sunT = (p + 0.06) / 0.76; // 0..1 durante el día
    if (sunT > 0 && sunT < 1) {
      const sx = vw * (0.1 + 0.8 * sunT), sy = gy - Math.sin(sunT * Math.PI) * Math.min(gy * 0.85, 420 * cam.z + 60) - 30;
      const r = 26 + 10 * cam.z;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3.5);
      sg.addColorStop(0, 'rgba(255,240,180,0.9)'); sg.addColorStop(0.3, 'rgba(255,220,140,0.35)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - r * 3.5, sy - r * 3.5, r * 7, r * 7);
      ctx.fillStyle = du > 0.3 ? '#ffc070' : '#fff3c4'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, U.TAU); ctx.fill();
    } else {
      const mt = ((p - 0.7 + 1) % 1) / 0.3;
      if (mt >= 0 && mt <= 1) {
        const mx = vw * (0.15 + 0.7 * mt), my = gy - Math.sin(mt * Math.PI) * Math.min(gy * 0.8, 380) - 30;
        ctx.fillStyle = '#f4f1dc'; ctx.beginPath(); ctx.arc(mx, my, 20, 0, U.TAU); ctx.fill();
        ctx.fillStyle = mix('#0a1230', '#4f9fe0', dl); ctx.beginPath(); ctx.arc(mx + 8, my - 5, 17, 0, U.TAU); ctx.fill();
      }
    }
    // nubes
    const cl = 'rgba(255,255,255,' + (0.25 + 0.55 * dl) + ')';
    ctx.fillStyle = cl;
    for (let i = 0; i < 6; i++) {
      const base = i * 900 + (AE.G.time * 6) % 5400;
      const x = ((base - cam.x * 0.25) * cam.z % (vw + 600) + vw + 600) % (vw + 600) - 300;
      const y = gy - (260 + (i % 3) * 120) * Math.min(1, cam.z + 0.3);
      if (y < -60) continue;
      const k = 0.6 + cam.z * 0.5;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + j * 34 * k, y + Math.sin(j * 2 + i) * 8 * k, 40 * k, 22 * k, 0, 0, U.TAU); ctx.fill(); }
    }
    // colinas lejanas (paralaje)
    hills(ctx, cam, vw, gy, 0.25, 140, mix('#3b5a6e', '#8bb9a8', dl), 0.0018, 1);
    hills(ctx, cam, vw, gy, 0.5, 80, mix('#2c4a3a', '#6fa25c', dl), 0.004, 2);
  }
  function hills(ctx, cam, vw, gy, par, hgt, col, fr, seed) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, gy + 10);
    const k = Math.max(0.35, cam.z);
    for (let x = 0; x <= vw + 20; x += 20) {
      const wx = (x - cam.cx) / k + cam.x * par;
      const y = gy - (hgt + Math.sin(wx * fr + seed) * hgt * 0.45 + Math.sin(wx * fr * 2.7 + seed * 3) * hgt * 0.2) * k;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(vw, gy + 10); ctx.closePath(); ctx.fill();
  }

  /* ---------- Superficie y tierra (coordenadas del mundo) ---------- */
  function drawGround(ctx, cam) {
    if (!dirtPat) dirtPat = ctx.createPattern(dirtCanvas, 'repeat');
    const x0 = Math.floor(cam.vx0 / 16) * 16 - 32, x1 = cam.vx1 + 32;
    const yb = cam.vy1 + 50;
    const top = Math.max(cam.vy0 - 50, -80);
    ctx.beginPath();
    if (cam.vy0 < 60) {
      ctx.moveTo(x0, W.groundY(x0));
      for (let x = x0 + 16; x <= x1 + 16; x += 16) ctx.lineTo(x, W.groundY(x));
    } else { ctx.moveTo(x0, top); ctx.lineTo(x1 + 16, top); }
    ctx.lineTo(x1 + 16, yb); ctx.lineTo(x0, yb); ctx.closePath();
    ctx.fillStyle = dirtPat; ctx.fill();
    // oscurecer con la profundidad
    const g = ctx.createLinearGradient(0, 0, 0, 3500);
    g.addColorStop(0, 'rgba(30,12,4,0)'); g.addColorStop(0.15, 'rgba(30,12,4,0.08)'); g.addColorStop(1, 'rgba(25,10,4,0.45)');
    ctx.fillStyle = g; ctx.fillRect(x0, Math.max(0, top), x1 - x0 + 16, yb - Math.max(0, top));
  }

  function drawStonesRoots(ctx, cam) {
    if (cam.z < 0.14) return;
    const cx0 = Math.floor(cam.vx0 / 400) - 1, cx1 = Math.floor(cam.vx1 / 400) + 1;
    const cy0 = Math.max(-1, Math.floor(cam.vy0 / 400) - 1), cy1 = Math.floor(cam.vy1 / 400) + 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const d = cellData(cx, cy);
      for (const r of d.roots) {
        ctx.strokeStyle = '#3d2210'; ctx.lineWidth = r.w + 3;
        ctx.beginPath(); ctx.moveTo(r.pts[0][0], r.pts[0][1]);
        for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
        ctx.stroke();
        ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = r.w;
        ctx.stroke();
        ctx.lineWidth = Math.max(1.5, r.w * 0.5);
        for (const b of r.branches) {
          ctx.strokeStyle = '#3d2210'; ctx.lineWidth = r.w * 0.5 + 2.5;
          ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.quadraticCurveTo((b[0] + b[2]) / 2 + 6, (b[1] + b[3]) / 2, b[2], b[3]); ctx.stroke();
          ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = r.w * 0.5; ctx.stroke();
        }
      }
      for (const s of d.stones) {
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, U.TAU);
        ctx.fillStyle = s.tone < 0.5 ? '#6e5848' : '#5c4535'; ctx.fill();
        ctx.lineWidth = 2.2; ctx.strokeStyle = '#2e1c10'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(s.x - s.rx * 0.25, s.y - s.ry * 0.35, s.rx * 0.5, s.ry * 0.3, s.rot, 0, U.TAU);
        ctx.fillStyle = 'rgba(255,235,210,0.22)'; ctx.fill();
      }
    }
  }

  function drawGrass(ctx, cam, front) {
    if (cam.vy0 > 80 || cam.vy1 < -200) return;
    const dl = AE.Eco.daylight();
    const sn = AE.Eco.seasonIdx();
    const baseCols = [['#4f9a2f', '#7cc443'], ['#5b9a2a', '#9ccf45'], ['#8a8f2c', '#c9a43c'], ['#6f8a5a', '#a7b896']][sn];
    const t = AE.G.time;
    if (!front) {
      // franja de césped
      ctx.beginPath();
      const x0 = cam.vx0 - 20, x1 = cam.vx1 + 20;
      ctx.moveTo(x0, W.groundY(x0));
      for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, W.groundY(x) + (W.mound(x) > 15 ? 0 : 0));
      ctx.lineWidth = 7; ctx.strokeStyle = mix(baseCols[0], '#1b2a1a', 0.5 * (1 - dl)); ctx.stroke();
      if (cam.z > 0.3) plantsDraw(ctx, cam, dl);
    }
    if (cam.z < 0.3) return;
    ctx.lineCap = 'round';
    for (const b of grass) {
      if (b.front !== front || b.x < cam.vx0 - 20 || b.x > cam.vx1 + 20) continue;
      const gy = W.groundY(b.x) + 3;
      const sway = Math.sin(t * 1.6 + b.x * 0.05) * 3;
      ctx.strokeStyle = mix(b.c < 0.5 ? baseCols[0] : baseCols[1], '#14201a', 0.55 * (1 - dl));
      ctx.lineWidth = front ? 3 : 2.4;
      ctx.beginPath(); ctx.moveTo(b.x, gy); ctx.quadraticCurveTo(b.x + b.lean * 0.3, gy - b.h * 0.6, b.x + b.lean + sway, gy - b.h * (front ? 1.2 : 1)); ctx.stroke();
    }
  }
  function plantsDraw(ctx, cam, dl) {
    const t = AE.G.time;
    for (const p of plants) {
      if (p.x < cam.vx0 - 80 || p.x > cam.vx1 + 80) continue;
      const gy = W.groundY(p.x) + 2, s = p.s;
      const dk = 0.5 * (1 - dl);
      ctx.save(); ctx.translate(p.x, gy); ctx.scale(s, s);
      ctx.rotate(Math.sin(t * 1.2 + p.x) * 0.03);
      ctx.lineWidth = 2; ctx.strokeStyle = mix('#2f5a1c', '#0d1a10', dk);
      if (p.kind === 'flower' || p.kind === 'tall') {
        const hgt = p.kind === 'tall' ? 70 : 45;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -hgt / 2, 0, -hgt); ctx.stroke();
        ctx.fillStyle = mix('#5c9d33', '#132013', dk);
        ctx.beginPath(); ctx.ellipse(-7, -hgt * 0.35, 9, 3.5, 0.5, 0, U.TAU); ctx.fill(); ctx.stroke();
        if (p.kind === 'flower') {
          const col = p.c < 0.33 ? '#f6e05a' : p.c < 0.66 ? '#f4f4f4' : '#e8789a';
          ctx.fillStyle = mix(col, '#202838', dk);
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(Math.cos(i) * 6, -hgt + Math.sin(i) * 6, 5, 3, i, 0, U.TAU); ctx.fill(); }
          ctx.fillStyle = '#e09a2a'; ctx.beginPath(); ctx.arc(0, -hgt, 3.5, 0, U.TAU); ctx.fill();
        } else {
          ctx.fillStyle = mix('#6aa83a', '#132013', dk);
          ctx.beginPath(); ctx.ellipse(6, -hgt * 0.7, 10, 3.5, -0.6, 0, U.TAU); ctx.fill(); ctx.stroke();
        }
      } else if (p.kind === 'clover') {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
        ctx.fillStyle = mix('#4f9a35', '#132013', dk);
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 1.1; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, -16 + Math.sin(a) * 6, 6, 4.5, a, 0, U.TAU); ctx.fill(); ctx.stroke(); }
      } else {
        ctx.fillStyle = mix(p.c < 0.5 ? '#7ab648' : '#c7a33c', '#132013', dk);
        ctx.beginPath(); ctx.moveTo(-12, -2); ctx.quadraticCurveTo(0, -12, 12, -2); ctx.quadraticCurveTo(0, 4, -12, -2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ---------- Galerías ---------- */
  function tunnelPath(t) {
    if (t._path && t._pathProg === t.prog) return t._path;
    const p = new Path2D();
    const lim = t._len * t.prog, pts = t.pts, cum = t._cum;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (cum[i] <= lim) p.lineTo(pts[i][0], pts[i][1]);
      else { const f = (lim - cum[i - 1]) / (cum[i] - cum[i - 1]); p.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); break; }
    }
    t._path = p; t._pathProg = t.prog;
    return p;
  }
  function visT(t, cam, m) { const b = t._bb; return !(b[2] + m < cam.vx0 || b[0] - m > cam.vx1 || b[3] + m < cam.vy0 || b[1] - m > cam.vy1); }
  function visC(c, cam, m) { return !(c.x + c.rx + m < cam.vx0 || c.x - c.rx - m > cam.vx1 || c.y + c.ry + m < cam.vy0 || c.y - c.ry - m > cam.vy1); }

  function drawCaves(ctx, cam) {
    const g = AE.G;
    const ts = g.tunnels.filter(t => t.prog > 0 && visT(t, cam, R + 30));
    const cs = g.chambers.filter(c => c.prog > 0 && visC(c, cam, 30));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // clip para que la boca del túnel de entrada no sobresalga sobre la superficie
    ctx.save();
    if (cam.vy0 < 60) {
      ctx.beginPath();
      const x0 = cam.vx0 - 40, x1 = cam.vx1 + 40;
      ctx.moveTo(x0, W.groundY(x0) + 2);
      for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, W.groundY(x) + 2);
      ctx.lineTo(x1 + 16, cam.vy1 + 100); ctx.lineTo(x0, cam.vy1 + 100); ctx.closePath();
      ctx.clip();
    }
    const passes = [[16, 9, '#3a1f0e'], [7, 4, '#c4864d'], [0, 0, '#a2653a']];
    for (let pi = 0; pi < 3; pi++) {
      const [tw, ce, col] = passes[pi];
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = R * 2 + tw;
      for (const t of ts) ctx.stroke(tunnelPath(t));
      for (const c of cs) {
        const s = W.chScale(c);
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * s + ce, c.ry * s + ce, 0, 0, U.TAU);
        if (pi === 2) {
          const rr = Math.max(c.rx, c.ry) * s;
          const gr = ctx.createRadialGradient(c.x, c.y + c.ry * s * 0.1, rr * 0.05, c.x, c.y + c.ry * s * 0.1, rr * 1.05);
          gr.addColorStop(0, '#f0bd7a'); gr.addColorStop(0.45, '#d29858'); gr.addColorStop(0.85, '#ac6e3e'); gr.addColorStop(1, '#a2653a');
          ctx.fillStyle = gr;
        }
        ctx.fill();
      }
    }
    // sombra en el techo de los túneles (sutil) y suelo de cámaras
    for (const c of cs) {
      const s = W.chScale(c);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx * s, c.ry * s, 0, 0, U.TAU); ctx.clip();
      ctx.fillStyle = 'rgba(120,68,32,0.55)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y + c.ry * s * 1.02, c.rx * s * 1.05, c.ry * s * 0.36, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(70,35,12,0.22)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y - c.ry * s * 1.05, c.rx * s * 1.1, c.ry * s * 0.45, 0, 0, U.TAU); ctx.fill();
      // guijarros del suelo
      const rng = U.mulberry32(c.id * 977 + 3);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI / 2 + (rng() - 0.5) * 2.2;
        const px = c.x + Math.cos(a) * c.rx * s * 0.86, py = c.y + Math.sin(a) * c.ry * s * 0.86;
        ctx.beginPath(); ctx.ellipse(px, py, 3 + rng() * 5, 2 + rng() * 3, 0, 0, U.TAU);
        ctx.fillStyle = rng() < 0.5 ? '#8c5a34' : '#7a4c2a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(50,25,10,0.6)'; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlanned(ctx, cam, t) {
    const g = AE.G;
    for (const c of g.chambers) {
      if (c.done || !visC(c, cam, 60)) continue;
      const tn = W.tun(c.tun);
      ctx.save();
      ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 20;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,232,196,0.75)';
      if (tn && tn.prog < 1) {
        ctx.lineWidth = R * 2; ctx.strokeStyle = 'rgba(255,225,180,0.07)'; ctx.setLineDash([]);
        ctx.beginPath(); tn.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
        ctx.setLineDash([10, 10]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,232,196,0.55)'; ctx.stroke();
      }
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,232,196,0.8)'; ctx.setLineDash([12, 9]);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, U.TAU); ctx.stroke();
      ctx.restore();
      if (c.prog < 0.35) pickaxe(ctx, c.x, c.y, 1.3, 'rgba(255,236,205,0.85)');
      // barra de progreso
      const w = 90, p = c.work / c.total;
      ctx.fillStyle = 'rgba(30,15,6,0.7)'; roundRect(ctx, c.x - w / 2 - 3, c.y + c.ry * 0.55 - 3, w + 6, 12, 6); ctx.fill();
      ctx.fillStyle = '#f2b84b'; roundRect(ctx, c.x - w / 2, c.y + c.ry * 0.55, Math.max(6, w * p), 6, 3); ctx.fill();
    }
  }
  function pickaxe(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.6);
    ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(0, -16, 14, -6); ctx.stroke();
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Previsualización durante la colocación de una cámara
  function drawGhost(ctx, v, type, t) {
    if (!v) return;
    ctx.save();
    const ok = v.ok;
    const col = ok ? 'rgba(160,255,140,0.9)' : 'rgba(255,120,100,0.9)';
    if (v.pts) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = R * 2; ctx.strokeStyle = ok ? 'rgba(160,255,140,0.12)' : 'rgba(255,120,100,0.12)';
      ctx.beginPath(); v.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.setLineDash([10, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
    }
    ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 30;
    ctx.fillStyle = ok ? 'rgba(160,255,140,0.12)' : 'rgba(255,120,100,0.12)';
    ctx.lineWidth = 3; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.ellipse(v.x, v.y, v.rx, v.ry, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
    pickaxe(ctx, v.x, v.y, 1.2, col);
  }

  /* ---------- Enemigos ---------- */
  function drawEnemy(ctx, t) {
    const th = AE.G.threat.active;
    if (!th) return;
    const x = C.EX + th.side * 190 + Math.sin(t * 2) * 10, y = W.groundY(x);
    ctx.save(); ctx.translate(x, y); ctx.scale(-th.side * 1.6, 1.6);
    const bob = Math.sin(t * 8) * 1.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (th.k === 'beetle') {
      ctx.strokeStyle = '#120a08'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const lx = -14 + i * 14, p = Math.sin(t * 10 + i * 2) * 4; ctx.beginPath(); ctx.moveTo(lx, -12); ctx.lineTo(lx + 6 + p, -4); ctx.lineTo(lx + 2 + p, 0); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, -22 + bob, 30, 18, 0, Math.PI, 0); ctx.closePath();
      const g = ctx.createLinearGradient(0, -40, 0, -6); g.addColorStop(0, '#5a7ab0'); g.addColorStop(1, '#1d2440');
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -40 + bob); ctx.lineTo(0, -22 + bob); ctx.stroke();
      ctx.fillStyle = '#1d2440'; ctx.beginPath(); ctx.ellipse(33, -16 + bob, 9, 7, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, -20 + bob); ctx.quadraticCurveTo(52, -34, 44, -40); ctx.stroke();
    } else if (th.k === 'spider') {
      ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
        const p = Math.sin(t * 9 + i + sd) * 4, bx = sd * (6 + i * 3);
        ctx.beginPath(); ctx.moveTo(bx * 0.3, -28 + bob); ctx.lineTo(bx * 2.6 + p, -46); ctx.lineTo(bx * 3.6 + p, 0); ctx.stroke();
      }
      ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.ellipse(-12, -30 + bob, 20, 16, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(12, -28 + bob, 11, 9, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e04030'; ctx.beginPath(); ctx.arc(18, -31 + bob, 2, 0, U.TAU); ctx.arc(14, -33 + bob, 1.6, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.ellipse(-14, -36 + bob, 7, 3, 0, 0, U.TAU); ctx.fill();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.translate(-i * 30, -6 + Math.sin(t * 9 + i) * 1.2); ctx.scale(1.25, 1.25);
        ctx.filter = 'none';
        AE.S.drawAnt(ctx, 'male', (t * 2 + i * 0.3) % 1, { wingsOn: false });
        ctx.restore();
      }
    }
    ctx.restore();
    // chispas de combate
    if (Math.random() < 0.3 && AE.FX) AE.FX.spark(C.EX + th.side * 150 + U.rand(-30, 30), y - U.rand(5, 30));
  }

  /* ---------- Superposiciones de pantalla ---------- */
  function drawOverlays(ctx, cam, vw, vh) {
    const dl = AE.Eco.daylight();
    const gy = (0 - cam.y) * cam.z + cam.cy;
    if (dl < 1 && gy > -100) {
      const a = 0.42 * (1 - dl);
      const g = ctx.createLinearGradient(0, gy - 60, 0, gy + 160 * cam.z);
      g.addColorStop(0, 'rgba(12,20,52,' + a + ')'); g.addColorStop(1, 'rgba(12,20,52,0)');
      ctx.fillStyle = 'rgba(12,20,52,' + a + ')'; ctx.fillRect(0, 0, vw, Math.max(0, gy - 60));
      ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, gy - 60), vw, 60 + 160 * cam.z);
    }
    if (!vignette || vigW !== vw || vigH !== vh) {
      vigW = vw; vigH = vh;
      vignette = document.createElement('canvas'); vignette.width = vw; vignette.height = vh;
      const c = vignette.getContext('2d');
      const g = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
      g.addColorStop(0, 'rgba(20,8,2,0)'); g.addColorStop(1, 'rgba(20,8,2,0.55)');
      c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    }
    ctx.drawImage(vignette, 0, 0);
  }

  return { init, drawSky, drawGround, drawStonesRoots, drawGrass, drawCaves, drawPlanned, drawGhost, drawEnemy, drawOverlays, roundRect, visC, mix, cells };
})();
