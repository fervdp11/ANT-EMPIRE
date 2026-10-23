/* ANT EMPIRE - utilidades generales */
'use strict';
window.AE = window.AE || {};

AE.U = (function () {
  const TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randi(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Generador pseudoaleatorio determinista
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0);
  }

  function angLerp(a, b, t) {
    let d = ((b - a) % TAU + TAU * 1.5) % TAU - TAU / 2;
    return a + d * t;
  }
  function angNorm(a) { a = a % TAU; if (a < 0) a += TAU; return a; }

  function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  // distancia de un punto a un segmento
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const l2 = vx * vx + vy * vy;
    let t = l2 > 0 ? (wx * vx + wy * vy) / l2 : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    const dx = px - (ax + vx * t), dy = py - (ay + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // SDF aproximada de elipse (Inigo Quilez), negativa dentro
  function ellipseSdf(px, py, rx, ry) {
    const k0 = Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry));
    const k1 = Math.sqrt((px * px) / (rx * rx * rx * rx) + (py * py) / (ry * ry * ry * ry));
    if (k1 < 1e-6) return -Math.min(rx, ry);
    return k0 * (k0 - 1) / k1;
  }

  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
  function fmt(n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    const neg = n < 0; n = Math.abs(n);
    let s;
    if (n < 10) s = (Math.floor(n * 10) / 10).toString();
    else if (n < 1000) s = Math.floor(n).toString();
    else {
      let i = 0;
      while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
      if (n >= 1000) return (neg ? '-' : '') + (n * Math.pow(1000, i)).toExponential(2);
      s = (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString()) + SUF[i];
    }
    return (neg ? '-' : '') + s;
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  return { TAU, clamp, lerp, smooth, easeInOut, rand, randi, pick, mulberry32, hash2, angLerp, angNorm, dist, segDist, ellipseSdf, fmt, fmtTime, el };
})();
