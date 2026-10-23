/* ANT EMPIRE - dibujo vectorial de hormigas de perfil + caché de sprites */
'use strict';

AE.S = (function () {
  const U = AE.U;
  const OUT = '#22100a';

  // Tipos: proporciones y colores. Unidades: obrera ≈ 26 de largo.
  const TYPES = {
    worker:  { sc: 1.35, body: '#9a3d1e', dark: '#5e200e', light: '#d0703e', gx: 6, gy: 4.6, head: [3.6, 3.2], legs: 1.0, ant: 1.0, mand: 1 },
    forager: { sc: 1.35, body: '#c0521f', dark: '#7a2e10', light: '#f08a44', gx: 6, gy: 4.4, head: [3.6, 3.1], legs: 1.18, ant: 1.05, mand: 1 },
    digger:  { sc: 1.485, body: '#6b3a1c', dark: '#3d1d0b', light: '#9b6236', gx: 6.2, gy: 4.8, head: [4.4, 3.8], legs: 0.95, ant: 0.9, mand: 2, dust: true },
    nurse:   { sc: 1.107, body: '#d9953f', dark: '#9a5a1c', light: '#ffd28a', gx: 6.8, gy: 5.6, head: [3.3, 3.0], legs: 0.9, ant: 1.0, mand: 0.6, translucent: true },
    soldier: { sc: 1.782, body: '#6e1a12', dark: '#360a06', light: '#a8402a', gx: 6.3, gy: 4.9, head: [5.8, 4.9], legs: 1.0, ant: 0.9, mand: 3 },
    scout:   { sc: 1.282, body: '#8e7a28', dark: '#4e4210', light: '#d3bf58', gx: 5.6, gy: 3.8, head: [3.3, 2.9], legs: 1.35, ant: 1.45, mand: 0.8, stripe: true },
    male:    { sc: 1.323, body: '#2c211c', dark: '#120b08', light: '#6a554a', gx: 6.4, gy: 3.6, head: [2.7, 2.6], legs: 1.1, ant: 1.15, mand: 0.4, wings: true, bigEye: true },
    princess:{ sc: 1.7, body: '#a8641e', dark: '#5c3208', light: '#e8a850', gx: 8.6, gy: 6.2, head: [3.8, 3.4], legs: 1.0, ant: 1.0, mand: 1, wings: true },
    queen:   { sc: 2.55, body: '#8e3518', dark: '#4e1808', light: '#cf6a38', gx: 11.5, gy: 7.6, head: [4.0, 3.6], legs: 0.92, ant: 1.0, mand: 1, queen: true }
  };

  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, U.TAU); }

  function part(ctx, x, y, rx, ry, rot, T, glossK) {
    ell(ctx, x, y, rx, ry, rot);
    const gr = ctx.createLinearGradient(x, y - ry, x, y + ry);
    gr.addColorStop(0, T.light); gr.addColorStop(0.45, T.body); gr.addColorStop(1, T.dark);
    ctx.fillStyle = gr; ctx.fill(); ctx.stroke();
    // brillo
    ctx.save();
    ell(ctx, x - rx * 0.15, y - ry * 0.45, rx * 0.55, ry * 0.28, rot);
    ctx.fillStyle = 'rgba(255,240,220,' + (glossK || 0.32) + ')'; ctx.fill();
    ctx.restore();
  }

  function leg(ctx, ax, ay, fx, fy, len1, len2, w, color) {
    // IK de dos segmentos, rodilla hacia arriba
    const dx = fx - ax, dy = fy - ay;
    let d = Math.hypot(dx, dy);
    const maxd = len1 + len2 - 0.01; if (d > maxd) d = maxd;
    const a = Math.atan2(dy, dx);
    const cosK = U.clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
    const k = Math.acos(cosK);
    const sgn = dx >= 0 ? -1 : 1;
    const kx = ax + Math.cos(a + k * sgn) * len1, ky = ay + Math.sin(a + k * sgn) * len1;
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 1.1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  }

  /*  Dibuja una hormiga mirando a la derecha, centro del cuerpo en (0,0), patas en y=+4.6*sc.
      ph: fase de la marcha (0..1), opts: {antPh, wingsOn, digging, eggPulse} */
  function drawAnt(ctx, typeKey, ph, opts) {
    const T = TYPES[typeKey]; opts = opts || {};
    const s = T.sc;
    ctx.save();
    ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const lw = 0.9 / Math.sqrt(s) * (T.queen ? 1.3 : 1);
    const footY = 4.6;
    const q = T.queen || typeKey === 'princess';
    const gX = q ? -6.5 - T.gx * 0.75 : -8, gY = q ? -1.2 : -1.2;
    const thx = q ? 2 : 1.5, thR = q ? 5.6 : 4.5, thRy = q ? 3.4 : 2.6;
    const hx = thx + thR + T.head[0] * 0.85, hy = -3 - (T.head[1] - 3.2) * 0.4;
    const legC = T.dark, legW = (T.queen ? 1.1 : 1.15) * (typeKey === 'soldier' ? 1.15 : 1);
    const ll = T.legs;
    const TAU = U.TAU;
    // posiciones de las patas
    const attach = [[thx + 2.2, 0.2], [thx + 0.2, 0.6], [thx - 1.8, 0.6]];
    const base = [thx + 6 * ll, thx + 0.5, thx - 6.5 * ll];
    const stride = 2.6 * ll * (opts.still ? 0 : 1);
    function legsSide(far) {
      for (let i = 0; i < 3; i++) {
        const p = (ph + (i % 2 ? 0.5 : 0) + (far ? 0.5 : 0)) * TAU;
        const fx = base[i] + Math.sin(p) * stride + (far ? 1.2 : 0);
        const lift = Math.max(0, Math.cos(p)) * 1.6 * (opts.still ? 0 : 1);
        const fy = footY - lift - (far ? 0.6 : 0);
        const L1 = (i === 2 ? 4.6 : 4.0) * ll, L2 = (i === 2 ? 5.4 : 4.6) * ll;
        leg(ctx, attach[i][0] + (far ? 0.6 : 0), attach[i][1] - (far ? 0.5 : 0), fx, fy, L1, L2, legW * (far ? 0.85 : 1), far ? T.dark : shade(T.body, -0.15));
      }
    }
    ctx.lineWidth = lw; ctx.strokeStyle = OUT;
    // alas traseras (lejos)
    if (T.wings && opts.wingsOn !== false) wings(ctx, thx, -thRy - 0.5, T, opts.flap || 0, true);
    legsSide(true);
    ctx.lineWidth = lw; ctx.strokeStyle = OUT;
    // abdomen (gáster)
    const gr = -0.12 + Math.sin(ph * TAU * 2) * 0.03;
    part(ctx, gX, gY, T.gx, T.gy, gr, T, 0.3);
    // bandas de segmentos
    ctx.save(); ell(ctx, gX, gY, T.gx, T.gy, gr); ctx.clip();
    ctx.strokeStyle = 'rgba(40,12,4,0.45)'; ctx.lineWidth = q ? 0.7 : 0.5;
    const nb = q ? 4 : 3;
    for (let i = 1; i <= nb; i++) {
      const bx = gX + T.gx - (i * 2 * T.gx) / (nb + 1);
      ctx.beginPath(); ctx.ellipse(bx, gY, T.gx * 0.18, T.gy * 1.1, gr, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    if (T.stripe) { ctx.fillStyle = 'rgba(255,240,170,0.55)'; ctx.fillRect(gX - 1.2, gY - T.gy, 1.6, T.gy * 2); }
    if (T.translucent) { ell(ctx, gX - 0.5, gY + 0.6, T.gx * 0.55, T.gy * 0.5, gr); ctx.fillStyle = 'rgba(255,230,160,0.35)'; ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = lw;
    // peciolo
    const pxp = gX + T.gx - 0.4;
    part(ctx, (pxp + thx - thR) / 2 + 0.3, -1.3, 1.6, 1.8, 0, T, 0.2);
    // tórax
    part(ctx, thx, -1.6, thR, thRy, -0.12, T, 0.35);
    if (T.queen) { // cicatrices de las alas
      ctx.fillStyle = T.dark; ell(ctx, thx - 1, -1.6 - thRy + 0.6, 1.1, 0.6, 0); ctx.fill();
      ell(ctx, thx + 1.5, -1.6 - thRy + 0.5, 0.9, 0.5, 0); ctx.fill();
    }
    // cabeza
    const hb = opts.digging ? Math.sin(opts.digging * TAU) * 1.2 : 0;
    ctx.save(); ctx.translate(hx, hy + hb); ctx.rotate(opts.digging ? Math.sin(opts.digging * TAU) * 0.2 : 0);
    ctx.strokeStyle = OUT; ctx.lineWidth = lw;
    // mandíbulas
    mandibles(ctx, T, lw);
    part(ctx, 0, 0, T.head[0], T.head[1], 0.15, T, 0.35);
    // ojo
    const eR = T.bigEye ? 1.4 : (typeKey === 'soldier' ? 0.8 : 1.0);
    ell(ctx, T.head[0] * 0.3, -T.head[1] * 0.25, eR, eR * 1.1, 0); ctx.fillStyle = '#140805'; ctx.fill();
    ell(ctx, T.head[0] * 0.3 + eR * 0.35, -T.head[1] * 0.25 - eR * 0.4, eR * 0.35, eR * 0.35, 0); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    // antenas
    const ap = (opts.antPh !== undefined ? opts.antPh : ph) * TAU;
    antenna(ctx, T, ap, true, lw);
    antenna(ctx, T, ap + 1.7, false, lw);
    ctx.restore();
    // patas cercanas
    ctx.lineWidth = lw; ctx.strokeStyle = OUT;
    legsSide(false);
    if (T.dust) { ctx.fillStyle = 'rgba(205,160,110,0.7)'; [[-9, -3], [-6, 1], [2, -3], [-10, 1.5]].forEach(p => { ell(ctx, p[0], p[1], 0.55, 0.55, 0); ctx.fill(); }); }
    if (T.wings && opts.wingsOn !== false) wings(ctx, thx, -thRy - 0.5, T, opts.flap || 0, false);
    ctx.restore();
  }

  function mandibles(ctx, T, lw) {
    const m = T.mand, hx = T.head[0];
    ctx.fillStyle = shade(T.dark, -0.1);
    ctx.lineWidth = lw;
    if (m >= 3) { // soldado: grandes y curvas
      ctx.beginPath(); ctx.moveTo(hx * 0.6, 0.8); ctx.quadraticCurveTo(hx + 4.5, -0.5, hx + 5.5, 3.2);
      ctx.quadraticCurveTo(hx + 2.5, 1.8, hx * 0.5, 2.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 1.5, 1.2); ctx.lineTo(hx + 2.4, 2.4); ctx.moveTo(hx + 3, 1.0); ctx.lineTo(hx + 3.6, 2.3); ctx.stroke();
    } else if (m >= 2) { // excavadora: anchas como pala
      ctx.beginPath(); ctx.moveTo(hx * 0.6, 1.0); ctx.lineTo(hx + 3.2, 1.2); ctx.lineTo(hx + 3.4, 3.0); ctx.lineTo(hx * 0.5, 2.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      const k = m;
      ctx.beginPath(); ctx.moveTo(hx * 0.6, 1.0); ctx.quadraticCurveTo(hx + 2.4 * k, 0.6, hx + 2.6 * k, 2.4);
      ctx.quadraticCurveTo(hx + 1.2 * k, 1.9, hx * 0.5, 2.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  function antenna(ctx, T, a, near, lw) {
    const k = T.ant;
    const bx = T.head[0] * 0.25, by = -T.head[1] * 0.8;
    const ex = bx + 2.2 * k + (near ? 0 : -0.6), ey = by - 4.2 * k + Math.sin(a) * 0.4;
    const tx = ex + 4.2 * k + Math.cos(a * 0.8) * 0.8, ty = ey + 2.0 * k + Math.sin(a) * 1.2;
    ctx.strokeStyle = OUT; ctx.lineWidth = (near ? 1.25 : 1.05) + 0.6;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.quadraticCurveTo(ex + 2 * k, ey - 0.4, tx, ty); ctx.stroke();
    ctx.strokeStyle = near ? T.dark : shade(T.dark, -0.2); ctx.lineWidth = near ? 1.0 : 0.8;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.quadraticCurveTo(ex + 2 * k, ey - 0.4, tx, ty); ctx.stroke();
    ctx.fillStyle = near ? T.dark : shade(T.dark, -0.2);
    ctx.beginPath(); ctx.ellipse(tx, ty, 0.75, 0.65, 0, 0, U.TAU); ctx.fill();
  }

  function wings(ctx, x, y, T, flap, far) {
    ctx.save();
    ctx.translate(x - 0.5, y + 0.5);
    const a = -0.18 - flap * 0.9 + (far ? -0.12 : 0);
    ctx.rotate(a);
    ctx.globalAlpha = far ? 0.55 : 0.75;
    const L = T.queen || T.sc > 1.2 ? 15 : 13;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-L * 0.45, -3.6, -L, -1.4); ctx.quadraticCurveTo(-L * 0.6, 1.8, 0, 0.6); ctx.closePath();
    ctx.fillStyle = 'rgba(225,235,245,0.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(70,60,60,0.7)'; ctx.lineWidth = 0.45; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -0.4); ctx.lineTo(-L * 0.7, -1.6); ctx.moveTo(-L * 0.3, -1.2); ctx.lineTo(-L * 0.45, 0.6); ctx.stroke();
    ctx.restore();
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  /* ---------- Caché de sprites (8 fotogramas por tipo) ---------- */
  const FR = 8, SPR = 3;
  const cache = {};
  function build() {
    for (const k in TYPES) {
      if (k === 'queen') continue;
      const T = TYPES[k];
      const w = Math.ceil(52 * T.sc), h = Math.ceil(34 * T.sc);
      const ax = 28 * T.sc, ay = 22 * T.sc;
      const frames = [];
      for (let f = 0; f < FR; f++) {
        const cv = document.createElement('canvas');
        cv.width = w * SPR; cv.height = h * SPR;
        const c = cv.getContext('2d');
        c.scale(SPR, SPR); c.translate(ax, ay);
        drawAnt(c, k, f / FR, { antPh: f / FR });
        frames.push(cv);
      }
      // fotograma quieto
      const cv = document.createElement('canvas'); cv.width = w * SPR; cv.height = h * SPR;
      const c = cv.getContext('2d'); c.scale(SPR, SPR); c.translate(ax, ay);
      drawAnt(c, k, 0, { still: true, antPh: 0.2 });
      cache[k] = { frames, still: cv, w, h, ax, ay, foot: 4.6 * T.sc };
    }
    // objetos transportados
    cache.leaf = item(18, 14, c => {
      c.translate(9, 8); c.rotate(-0.5);
      c.beginPath(); c.moveTo(-7, 0); c.quadraticCurveTo(0, -6, 7, 0); c.quadraticCurveTo(0, 6, -7, 0);
      const g = c.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, '#9fd65a'); g.addColorStop(1, '#4f8f2a');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#2d5418'; c.lineWidth = 0.8; c.stroke();
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.strokeStyle = 'rgba(40,80,20,0.6)'; c.lineWidth = 0.5; c.stroke();
    });
    cache.soil = item(10, 10, c => { c.beginPath(); c.arc(5, 5, 3.4, 0, U.TAU); c.fillStyle = '#7a5030'; c.fill(); c.strokeStyle = '#3b2312'; c.lineWidth = 0.8; c.stroke(); c.fillStyle = 'rgba(255,220,180,0.3)'; c.beginPath(); c.arc(4, 4, 1.2, 0, U.TAU); c.fill(); });
    cache.food = item(10, 10, c => { c.beginPath(); c.arc(5, 5, 3.2, 0, U.TAU); c.fillStyle = '#efe6d0'; c.fill(); c.strokeStyle = '#8a7a5a'; c.lineWidth = 0.7; c.stroke(); });
    cache.egg = item(10, 10, c => { c.beginPath(); c.ellipse(5, 5, 2.4, 3.4, 0.3, 0, U.TAU); c.fillStyle = '#fbf6ea'; c.fill(); c.strokeStyle = '#b8a888'; c.lineWidth = 0.6; c.stroke(); });
  }
  function item(w, h, fn) {
    const cv = document.createElement('canvas'); cv.width = w * SPR; cv.height = h * SPR;
    const c = cv.getContext('2d'); c.scale(SPR, SPR); c.lineJoin = 'round'; fn(c);
    return { cv, w, h };
  }

  // Miniatura para la interfaz
  function icon(typeKey, size) {
    const cv = document.createElement('canvas');
    const T = TYPES[typeKey];
    cv.width = size * 2; cv.height = size * 1.3 * 2;
    const c = cv.getContext('2d');
    const span = T.queen ? 50 : 40;
    const k = (size * 2) / (span * T.sc);
    c.scale(k, k);
    c.translate((T.queen ? 31 : 24) * T.sc, (T.queen ? 24 : 20) * T.sc);
    drawAnt(c, typeKey, 0.1, { still: true, antPh: 0.2 });
    cv.style.width = size + 'px'; cv.style.height = (size * 1.3) + 'px';
    return cv;
  }

  return { TYPES, drawAnt, build, cache, FR, SPR, icon, shade };
})();
