/* ANT EMPIRE - geometría del hormiguero: cámaras, túneles, colisiones (SDF) y navegación */
'use strict';

AE.W = (function () {
  const U = AE.U, C = AE.C;
  const R = C.TUN_R;

  function G() { return AE.G; }

  /* ---------- Superficie ---------- */
  function mound(x) { const d = (x - C.EX) / 150; return 30 * Math.exp(-d * d); }
  function groundY(x) { return 6 * Math.sin(x / 310) + 4 * Math.sin(x / 123 + 1) - mound(x); }
  function groundSlope(x) { return (groundY(x + 1) - groundY(x - 1)) / 2; }

  /* ---------- Caché derivada de túneles ---------- */
  function prepTunnel(t) {
    const p = t.pts;
    const cum = new Float32Array(p.length);
    let L = 0, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < p.length; i++) {
      if (i > 0) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      cum[i] = L;
      minX = Math.min(minX, p[i][0]); maxX = Math.max(maxX, p[i][0]);
      minY = Math.min(minY, p[i][1]); maxY = Math.max(maxY, p[i][1]);
    }
    t._cum = cum; t._len = L; t._bb = [minX, minY, maxX, maxY];
    t._path = null; t._pathProg = -1;
  }
  function rebuild() {
    const g = G();
    g.tunnels.forEach(prepTunnel);
    byId.clear();
    g.chambers.forEach(c => byId.set(c.id, c));
    tunById.clear();
    g.tunnels.forEach(t => tunById.set(t.id, t));
    // ángulos de las bocas de los túneles en sus cámaras
    g.tunnels.forEach(t => {
      const p0 = t.pts[0], p1 = t.pts[t.pts.length - 1];
      const cf = byId.get(t.from), ct = byId.get(t.to);
      if (cf) t.a0 = Math.atan2((p0[1] - cf.y) / cf.ry, (p0[0] - cf.x) / cf.rx);
      if (ct) t.a1 = Math.atan2((p1[1] - ct.y) / ct.ry, (p1[0] - ct.x) / ct.rx);
    });
    AE.W.version++;
  }
  const byId = new Map(), tunById = new Map();
  function ch(id) { return byId.get(id); }
  function tun(id) { return tunById.get(id); }

  function tunnelLen(t) { return t._len * t.prog; }
  function chScale(c) { return c.prog <= 0 ? 0 : 0.18 + 0.82 * U.smooth(c.prog); }

  // punto y tangente de un túnel a una distancia s
  function tunnelAt(t, s) {
    const p = t.pts, cum = t._cum;
    s = U.clamp(s, 0, t._len);
    let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const segL = cum[hi] - cum[lo] || 1;
    const f = (s - cum[lo]) / segL;
    const x = p[lo][0] + (p[hi][0] - p[lo][0]) * f;
    const y = p[lo][1] + (p[hi][1] - p[lo][1]) * f;
    const tx = (p[hi][0] - p[lo][0]) / segL, ty = (p[hi][1] - p[lo][1]) / segL;
    return { x, y, tx, ty };
  }

  /* ---------- SDF del espacio abierto (negativo = dentro del hueco) ---------- */
  function sdf(px, py) {
    const g = G();
    let d = 200;
    const ts = g.tunnels;
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      if (t.prog <= 0) continue;
      const bb = t._bb;
      if (px < bb[0] - R - 60 || px > bb[2] + R + 60 || py < bb[1] - R - 60 || py > bb[3] + R + 60) continue;
      const lim = t._len * t.prog, p = t.pts, cum = t._cum;
      for (let j = 1; j < p.length; j++) {
        if (cum[j - 1] >= lim) break;
        let bx = p[j][0], by = p[j][1];
        if (cum[j] > lim) {
          const f = (lim - cum[j - 1]) / (cum[j] - cum[j - 1]);
          bx = p[j - 1][0] + (bx - p[j - 1][0]) * f; by = p[j - 1][1] + (by - p[j - 1][1]) * f;
        }
        const dd = U.segDist(px, py, p[j - 1][0], p[j - 1][1], bx, by) - R;
        if (dd < d) d = dd;
      }
    }
    const cs = g.chambers;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (c.prog <= 0) continue;
      const dx = px - c.x, dy = py - c.y;
      if (Math.abs(dx) > c.rx + 80 || Math.abs(dy) > c.ry + 80) continue;
      const s = chScale(c);
      const dd = U.ellipseSdf(dx, dy, c.rx * s, c.ry * s);
      if (dd < d) d = dd;
    }
    return d;
  }
  function grad(px, py) {
    const e = 1.5;
    const gx = sdf(px + e, py) - sdf(px - e, py);
    const gy = sdf(px, py + e) - sdf(px, py - e);
    const l = Math.hypot(gx, gy) || 1;
    return { x: gx / l, y: gy / l };
  }

  /* ---------- Posiciones para hormigas (sobre el suelo / paredes) ---------- */
  function chamberPos(c, a, h) {
    const s = chScale(c) || 0.2;
    const rx = Math.max(6, c.rx * s - h), ry = Math.max(6, c.ry * s - h);
    const ca = Math.cos(a), sa = Math.sin(a);
    let nx = ca / c.rx, ny = sa / c.ry; const l = Math.hypot(nx, ny) || 1;
    return { x: c.x + rx * ca, y: c.y + ry * sa, nx: nx / l, ny: ny / l };
  }
  function floorSide(tx, ty) {
    // perpendicular que apunta "hacia el suelo" (o a la pared derecha si es vertical)
    let nx = -ty, ny = tx;
    if (ny + 0.25 * nx < 0) { nx = -nx; ny = -ny; }
    return { nx, ny };
  }
  function tunnelPos(t, s, h) {
    const q = tunnelAt(t, s);
    const n = floorSide(q.tx, q.ty);
    const L = t._len;
    const ramp = Math.min(1, s / 34, (L - s) / 34);
    const off = (R - h) * Math.max(0, ramp);
    return { x: q.x + n.nx * off, y: q.y + n.ny * off, nx: n.nx, ny: n.ny, tx: q.tx, ty: q.ty };
  }
  function surfacePos(x, h) {
    const sl = groundSlope(x);
    const l = Math.hypot(sl, 1);
    const nx = -sl / l, ny = 1 / l;
    return { x: x - nx * h, y: groundY(x) - ny * h, nx, ny };
  }

  /* ---------- Árbol de navegación ---------- */
  function ancestors(id) {
    const out = [];
    let c = ch(id), guard = 0;
    while (c && guard++ < 500) { out.push(c.id); const t = tun(c.tun); c = t && t.from >= 0 ? ch(t.from) : null; }
    out.push(-1);
    return out;
  }
  // tramos para ir del nodo A al nodo B (-1 = superficie). Devuelve lista de {t, dir}
  function treePath(a, b) {
    const A = a === -1 ? [-1] : ancestors(a);
    const B = b === -1 ? [-1] : ancestors(b);
    const setB = new Map(); B.forEach((v, i) => setB.set(v, i));
    let lca = -1, ia = A.length - 1;
    for (let i = 0; i < A.length; i++) { if (setB.has(A[i])) { lca = A[i]; ia = i; break; } }
    const out = [];
    for (let i = 0; i < ia; i++) { out.push({ t: ch(A[i]).tun, dir: -1 }); }
    const ib = setB.get(lca);
    for (let i = ib - 1; i >= 0; i--) { out.push({ t: ch(B[i]).tun, dir: 1 }); }
    return out;
  }

  /* ---------- Consultas varias ---------- */
  function chamberAt(x, y, margin) {
    const g = G(); margin = margin || 0;
    let best = null, bd = 1e9;
    for (const c of g.chambers) {
      if (c.prog <= 0) continue;
      const s = chScale(c);
      const dx = (x - c.x) / (c.rx * s + margin), dy = (y - c.y) / (c.ry * s + margin);
      const d = dx * dx + dy * dy;
      if (d <= 1 && d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function nearestChamber(x, y, doneOnly) {
    let best = null, bd = 1e18;
    for (const c of G().chambers) {
      if (doneOnly && !c.done) continue;
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function bounds(includePlanned) {
    let x0 = C.EX - 500, x1 = C.EX + 500, y0 = -260, y1 = 300;
    for (const c of G().chambers) {
      if (!includePlanned && c.prog <= 0) continue;
      x0 = Math.min(x0, c.x - c.rx - 120); x1 = Math.max(x1, c.x + c.rx + 120);
      y1 = Math.max(y1, c.y + c.ry + 120);
    }
    for (const t of G().tunnels) {
      if (!includePlanned && t.prog <= 0) continue;
      const bb = t._bb; x0 = Math.min(x0, bb[0] - 100); x1 = Math.max(x1, bb[2] + 100); y1 = Math.max(y1, bb[3] + 100);
    }
    return { x0, y0, x1, y1 };
  }
  // frente de excavación de un trabajo (punto donde se trabaja)
  function digFront(c) {
    const t = tun(c.tun);
    if (t && t.prog < 1) {
      const s = Math.max(0, t._len * t.prog);
      const q = tunnelAt(t, s);
      return { x: q.x, y: q.y, kind: 't', t, s: Math.max(0, s - 12) };
    }
    return { x: c.x, y: c.y + c.ry * chScale(c) * 0.5, kind: 'c', c };
  }

  /* ---------- Construcción de nuevas cámaras ---------- */
  function edgePoint(c, tx, ty, k) {
    const a = Math.atan2((ty - c.y) / c.ry, (tx - c.x) / c.rx);
    return { x: c.x + c.rx * k * Math.cos(a), y: c.y + c.ry * k * Math.sin(a), a };
  }
  function makeTunnelPts(x0, y0, x1, y1, seed) {
    const rng = U.mulberry32(seed);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const px = -(y1 - y0) / (len || 1), py = (x1 - x0) / (len || 1);
    const w = (rng() - 0.5) * 0.45 * len;
    const cx = (x0 + x1) / 2 + px * w, cy = (y0 + y1) / 2 + py * w;
    const n = Math.max(3, Math.ceil(len / 14));
    const ph = rng() * 6, amp = Math.min(7, len / 30);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, it = 1 - t;
      let x = it * it * x0 + 2 * it * t * cx + t * t * x1;
      let y = it * it * y0 + 2 * it * t * cy + t * t * y1;
      const wob = Math.sin(t * Math.PI) * Math.sin(t * 9 + ph) * amp;
      x += px * wob; y += py * wob;
      pts.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
    return pts;
  }
  // Comprueba si se puede colocar una cámara del tipo dado en (x,y)
  function validate(type, x, y) {
    const T = AE.CHAMBERS[type], g = G();
    const rx = T.rx, ry = T.ry;
    const res = { ok: false, reason: '', x, y, rx, ry, parent: null, pts: null };
    if (x - rx < 150 || x + rx > C.WORLD_W - 150) { res.reason = 'Demasiado cerca del límite del mundo'; return res; }
    if (y - ry < groundY(x) + 150) { res.reason = 'Demasiado cerca de la superficie'; return res; }
    for (const c of g.chambers) {
      const dx = (x - c.x) / (rx + c.rx + 50), dy = (y - c.y) / (ry + c.ry + 50);
      if (dx * dx + dy * dy < 1) { res.reason = 'Se solapa con otra cámara'; return res; }
    }
    for (const t of g.tunnels) {
      for (let i = 0; i < t.pts.length; i += 2) {
        if (U.ellipseSdf(t.pts[i][0] - x, t.pts[i][1] - y, rx + R + 8, ry + R + 8) < 0) { res.reason = 'Se solapa con un túnel'; return res; }
      }
    }
    // cámara padre: la terminada cuya conexión sea más corta y válida
    let best = null, bestL = 1e9, why = 'Demasiado lejos de una cámara terminada';
    for (const c of g.chambers) {
      if (!c.done) continue;
      const p0 = edgePoint(c, x, y, 0.86);
      const tmp = { x, y, rx, ry };
      const p1 = edgePoint(tmp, c.x, c.y, 0.86);
      const L = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (L > C.MAX_TUNNEL || L >= bestL) continue;
      const pts = makeTunnelPts(p0.x, p0.y, p1.x, p1.y, (x * 7 + y * 13) | 0);
      let blocked = false;
      for (const o of g.chambers) {
        if (o === c) continue;
        for (let i = 2; i < pts.length - 2; i++) {
          if (U.ellipseSdf(pts[i][0] - o.x, pts[i][1] - o.y, o.rx + R + 6, o.ry + R + 6) < 0) { blocked = true; break; }
        }
        if (blocked) break;
      }
      if (!blocked) {
        for (const t of g.tunnels) {
          if (t.to === c.id || t.from === c.id) continue;
          for (let i = 3; i < pts.length - 3 && !blocked; i += 2) {
            for (let j = 0; j < t.pts.length; j += 2) {
              const dx = pts[i][0] - t.pts[j][0], dy = pts[i][1] - t.pts[j][1];
              if (dx * dx + dy * dy < (R * 2.2) ** 2) { blocked = true; break; }
            }
          }
          if (blocked) break;
        }
      }
      if (blocked) { why = 'El túnel atravesaría otra galería'; continue; }
      if (pts.some(p => p[1] < groundY(p[0]) + 60)) { why = 'El túnel saldría a la superficie'; continue; }
      best = { c, pts, a0: p0.a, a1: p1.a }; bestL = L;
    }
    if (!best) { res.reason = why; return res; }
    res.ok = true; res.parent = best.c; res.pts = best.pts; res.a0 = best.a0; res.a1 = best.a1; res.len = bestL;
    return res;
  }

  return {
    version: 0, groundY, groundSlope, mound, rebuild, prepTunnel, ch, tun, tunnelAt, tunnelLen, chScale,
    sdf, grad, chamberPos, tunnelPos, surfacePos, floorSide, treePath, ancestors, chamberAt, nearestChamber,
    bounds, digFront, validate, edgePoint, makeTunnelPts
  };
})();
