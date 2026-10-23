/* ANT EMPIRE - hormigas visibles: rutas por el nido, tareas y dibujo */
'use strict';

AE.Agents = (function () {
  const U = AE.U, C = AE.C, W = AE.W;
  let list = [];
  let nextId = 1;
  let recT = 0;
  const CAP = { high: 240, medium: 150, low: 80 };

  function G() { return AE.G; }
  function h(a) { return AE.S.cache[a.spr] ? AE.S.cache[a.spr].foot : 4.6; }

  /* ---------- Segmentos de ruta ---------- */
  function normA(a) { a = (a + Math.PI) % U.TAU; if (a < 0) a += U.TAU; return a - Math.PI; }
  function arcSeg(cid, a0, a1) {
    a0 = normA(a0); a1 = normA(a1);
    let d1 = normA(a1 - a0);
    const d2 = d1 > 0 ? d1 - U.TAU : d1 + U.TAU;
    const upper = Math.sin(a0) < 0.1 && Math.sin(a1) < 0.1;
    let d = d1;
    if (!upper) {
      const passes = dd => {
        if (dd >= 0) { let rel = (Math.PI / 2 - a0) % U.TAU; if (rel < 0) rel += U.TAU; return rel <= dd; }
        let rel = (a0 - Math.PI / 2) % U.TAU; if (rel < 0) rel += U.TAU; return rel <= -dd;
      };
      d = passes(d1) ? d1 : d2;
    }
    const c = W.ch(cid);
    const s = W.chScale(c) || 0.3;
    const L = Math.abs(d) * Math.sqrt((c.rx * c.rx + c.ry * c.ry) / 2) * s;
    return { k: 'arc', c: cid, a0, a1: a0 + d, L: Math.max(1, L) };
  }
  function tunSeg(tid, s0, s1) { return { k: 'tun', t: tid, s0, s1, L: Math.max(1, Math.abs(s1 - s0)) }; }
  function surfSeg(x0, x1) { return { k: 'surf', x0, x1, L: Math.max(1, Math.abs(x1 - x0)) }; }
  function waitSeg(d, anim, act, txt) { return { k: 'wait', d, anim, act, txt, L: 1 }; }

  // Construye la ruta desde la ubicación actual hasta dest
  function routeTo(a, dest) {
    const segs = [];
    let node, ang = 0, x = 0;
    const loc = a.loc;
    const destNode = dest.k === 'c' ? dest.id : dest.k === 's' ? -1 : (W.tun(dest.id) ? W.tun(dest.id).from : -1);
    if (loc.k === 't') {
      const t = W.tun(loc.id);
      if (!t) { node = 0; ang = Math.PI / 2; }
      else {
        const goTo = t.prog >= 1 && destNode !== -1 && W.ancestors(destNode).indexOf(t.to) >= 0;
        if (dest.k === 't' && dest.id === t.id) { segs.push(tunSeg(t.id, loc.s, dest.s)); return segs; }
        if (goTo) { segs.push(tunSeg(t.id, loc.s, t._len)); node = t.to; ang = t.a1; }
        else { segs.push(tunSeg(t.id, loc.s, 0)); node = t.from; if (node >= 0) ang = t.a0; else x = t.pts[0][0]; }
      }
    } else if (loc.k === 'c') { node = loc.id; ang = loc.a; if (!W.ch(node)) { node = 0; ang = Math.PI / 2; } }
    else { node = -1; x = loc.x; }

    const path = W.treePath(node, destNode);
    for (const step of path) {
      const t = W.tun(step.t);
      if (!t) break;
      if (node >= 0) segs.push(arcSeg(node, ang, step.dir > 0 ? t.a0 : t.a1));
      else segs.push(surfSeg(x, t.pts[0][0]));
      if (step.dir > 0) { segs.push(tunSeg(t.id, 0, t._len)); node = t.to; ang = t.a1; }
      else { segs.push(tunSeg(t.id, t._len, 0)); node = t.from; if (node >= 0) ang = t.a0; else x = t.pts[0][0]; }
    }
    if (dest.k === 'c') segs.push(arcSeg(node, ang, dest.a));
    else if (dest.k === 's') segs.push(surfSeg(node >= 0 ? x : x, dest.x));
    else if (dest.k === 't') {
      const t = W.tun(dest.id);
      if (node >= 0) segs.push(arcSeg(node, ang, t.a0)); else segs.push(surfSeg(x, t.pts[0][0]));
      segs.push(tunSeg(dest.id, 0, dest.s));
    }
    return segs;
  }
  function endLoc(seg, prev) {
    if (seg.k === 'arc') return { k: 'c', id: seg.c, a: normA(seg.a1) };
    if (seg.k === 'surf') return { k: 's', x: seg.x1 };
    if (seg.k === 'tun') {
      const t = W.tun(seg.t);
      if (t && seg.s1 >= t._len - 0.5 && t.prog >= 1) return { k: 'c', id: t.to, a: t.a1 };
      if (t && seg.s1 <= 0.5) return t.from >= 0 ? { k: 'c', id: t.from, a: t.a0 } : { k: 's', x: t.pts[0][0] };
      return { k: 't', id: seg.t, s: seg.s1 };
    }
    return prev;
  }

  /* ---------- Destinos útiles ---------- */
  function floorA() { return Math.PI / 2 + U.rand(-0.85, 0.85); }
  function chambersOf(type) { return G().chambers.filter(c => c.done && c.type === type); }
  function anyOf(type) { const l = chambersOf(type); return l.length ? U.pick(l) : AE.Eco.royal(); }
  function randomChamber() { const l = G().chambers.filter(c => c.done); return U.pick(l); }
  function surfX(min, max) { return U.clamp(C.EX + (Math.random() < 0.5 ? -1 : 1) * U.rand(min, max), 200, C.WORLD_W - 200); }

  function go(a, dest, after, txt) {
    a.segs = routeTo(a, dest).concat(after || []);
    a.si = 0; a.u = 0; a.task = txt || a.task;
  }

  /* ---------- Cerebro de cada casta ---------- */
  function think(a) {
    const g = G();
    a.retask = false;
    const night = AE.Eco.isNight();
    const th = g.threat.active;
    if (g.order === 'rally') {
      const qc = AE.Q.chamber() || W.nearestChamber(g.queen.x, g.queen.y, true);
      const qa = Math.atan2((g.queen.y - qc.y) / qc.ry, (g.queen.x - qc.x) / qc.rx);
      return go(a, { k: 'c', id: qc.id, a: Math.PI / 2 + U.rand(-1, 1) * 0.9 + (Math.sin(qa) > 0 ? (qa - Math.PI / 2) * 0.3 : 0) }, [waitSeg(U.rand(2, 4), 'idle', null, 'Reunida junto a la reina')], 'Acudiendo a la llamada de la reina');
    }
    switch (a.role) {
      case 'forager': {
        if (a.carry === 'leaf') { const st = anyOf('storage'); return go(a, { k: 'c', id: st.id, a: floorA() }, [waitSeg(1.2, 'idle', 'drop', 'Depositando la hoja')], 'Transportando una hoja al almacén'); }
        if (night && Math.random() < 0.55) { const d = anyOf('dorm'); return go(a, { k: 'c', id: d.id, a: floorA() }, [waitSeg(U.rand(6, 12), 'rest', null, 'Descansando durante la noche')], 'Volviendo a descansar'); }
        const x = surfX(220, 950);
        return go(a, { k: 's', x }, [waitSeg(U.rand(1.2, 2.2), 'dig', 'pick', 'Cortando un trozo de hoja')], 'Saliendo a buscar hojas');
      }
      case 'digger': {
        if (a.carry === 'soil') return go(a, { k: 's', x: surfX(25, 75) }, [waitSeg(0.8, 'idle', 'dump', 'Arrojando tierra fuera del nido')], 'Sacando tierra al exterior');
        const job = AE.Eco.activeJob();
        if (job) {
          const f = W.digFront(job);
          const dest = f.kind === 't' ? { k: 't', id: f.t.id, s: Math.max(0, f.s - U.rand(0, 18)) } : { k: 'c', id: job.id, a: U.rand(-Math.PI, Math.PI) };
          return go(a, dest, [waitSeg(U.rand(3, 5), 'dig', 'dug', 'Excavando: ' + AE.CHAMBERS[job.type].name)], 'Yendo a excavar ' + AE.CHAMBERS[job.type].name);
        }
        const c = Math.random() < 0.5 ? anyOf('workshop') : randomChamber();
        return go(a, { k: 'c', id: c.id, a: U.rand(-Math.PI, Math.PI) }, [waitSeg(U.rand(3, 5), 'dig', 'dug', 'Ensanchando galerías')], 'Buscando una pared que ensanchar');
      }
      case 'nurse': {
        const r = Math.random();
        const nur = anyOf('nursery');
        if (a.carry === 'food') return go(a, { k: 'c', id: nur.id, a: Math.PI / 2 + U.rand(-0.5, 0.5) }, [waitSeg(2.5, 'tend', 'drop', 'Alimentando a las larvas')], 'Llevando comida a la cría');
        if (r < 0.25 && AE.Q.inRoyal()) {
          const q = g.queen, rc = AE.Eco.royal();
          const qa = Math.atan2((q.y - rc.y) / rc.ry, (q.x - rc.x) / rc.rx);
          return go(a, { k: 'c', id: rc.id, a: qa + U.rand(-0.35, 0.35) }, [waitSeg(2.5, 'tend', null, 'Alimentando a la reina')], 'Acudiendo a alimentar a la reina');
        }
        if (r < 0.5) { const st = anyOf('storage'); return go(a, { k: 'c', id: st.id, a: floorA() }, [waitSeg(1, 'idle', 'food', 'Recogiendo alimento')], 'Yendo a por alimento'); }
        return go(a, { k: 'c', id: nur.id, a: Math.PI / 2 + U.rand(-0.6, 0.6) }, [waitSeg(U.rand(3, 6), 'tend', null, 'Limpiando y cuidando la cría')], 'Cuidando huevos y larvas');
      }
      case 'soldier': {
        if (th) return go(a, { k: 's', x: C.EX + th.side * U.rand(40, 130) }, [waitSeg(Math.max(1, th.t), 'fight', null, 'Combatiendo contra ' + th.name.toLowerCase())], '¡Defendiendo la entrada!');
        if (Math.random() < 0.4) return go(a, { k: 't', id: 0, s: U.rand(20, 70) }, [waitSeg(U.rand(4, 8), 'guard', null, 'Vigilando la entrada')], 'Patrullando hacia la entrada');
        const c = Math.random() < 0.5 ? anyOf('barracks') : randomChamber();
        return go(a, { k: 'c', id: c.id, a: floorA() }, [waitSeg(U.rand(3, 6), 'guard', null, 'Montando guardia')], 'Patrullando el nido');
      }
      case 'scout': {
        if (Math.random() < 0.75) {
          const x = surfX(1100, 2200);
          return go(a, { k: 's', x }, [waitSeg(U.rand(4, 9), 'idle', null, 'Explorando territorio lejano'), ], 'Saliendo de expedición');
        }
        const c = anyOf('scout');
        return go(a, { k: 'c', id: c.id, a: floorA() }, [waitSeg(U.rand(2, 4), 'groom', null, 'Compartiendo lo descubierto')], 'Volviendo al puesto de exploración');
      }
      case 'male': case 'princess': {
        const c = anyOf('nuptial');
        return go(a, { k: 'c', id: c.id, a: floorA() }, [waitSeg(U.rand(3, 7), 'groom', null, 'Esperando el vuelo nupcial')], 'Paseando por la cámara nupcial');
      }
      default: {
        const c = Math.random() < 0.6 ? randomChamber() : anyOf('dorm');
        const acts = [['groom', 'Acicalándose las antenas'], ['idle', 'Esperando órdenes'], ['rest', 'Descansando']];
        const ac = U.pick(acts);
        return go(a, { k: 'c', id: c.id, a: floorA() }, [waitSeg(U.rand(2, 6), ac[0], null, ac[1])], 'Paseando sin tarea');
      }
    }
  }

  function doAct(a, act) {
    if (act === 'pick') a.carry = 'leaf';
    else if (act === 'drop') a.carry = null;
    else if (act === 'food') a.carry = 'food';
    else if (act === 'dug') { if (Math.random() < 0.45) a.carry = 'soil'; }
    else if (act === 'dump') { a.carry = null; if (AE.FX) AE.FX.soil(a.x, a.y); }
  }

  /* ---------- Creación / reconciliación con la población real ---------- */
  function make(role, nearNursery) {
    const R = AE.ROLES[role];
    const c = nearNursery ? (chambersOf('nursery')[0] || AE.Eco.royal()) : (G().chambers.filter(x => x.done).length ? randomChamber() : AE.Eco.royal());
    const a = {
      id: nextId++, role, spr: R.spr, loc: { k: 'c', id: c.id, a: floorA() }, segs: [], si: 0, u: 0,
      x: c.x, y: c.y + c.ry * 0.7, ang: 0, face: Math.random() < 0.5 ? 1 : -1, ph: Math.random(),
      carry: null, task: 'Recién nacida', state: '', speedK: U.rand(0.85, 1.15), born: G().time
    };
    place(a);
    return a;
  }
  function place(a) {
    const l = a.loc;
    let p;
    if (l.k === 'c') { const c = W.ch(l.id); if (!c) return; p = W.chamberPos(c, l.a, h(a)); }
    else if (l.k === 's') p = W.surfacePos(l.x, h(a));
    else { const t = W.tun(l.id); if (!t) return; p = W.tunnelPos(t, l.s, h(a)); }
    a.x = p.x; a.y = p.y; a.ang = Math.atan2(-p.nx, p.ny);
  }
  function desired() {
    const g = G();
    const cap = CAP[g.quality] || 200;
    const tot = AE.Eco.adults();
    const out = {};
    for (const r in g.ants) {
      const n = g.ants[r];
      out[r] = tot <= cap ? n : (n > 0 ? Math.max(1, Math.round(n / tot * cap)) : 0);
    }
    return out;
  }
  let pendingNursery = 0;
  function reconcile() {
    const want = desired();
    const have = {};
    for (const r in want) have[r] = 0;
    for (const a of list) have[a.role] = (have[a.role] || 0) + 1;
    const surplus = [], deficit = [];
    for (const r in want) {
      const d = (have[r] || 0) - want[r];
      if (d > 0) for (let i = 0; i < d; i++) surplus.push(r);
      else for (let i = 0; i < -d; i++) deficit.push(r);
    }
    // convierte hormigas sobrantes en las que faltan (sin teletransporte)
    const isW = r => r === 'male' || r === 'princess';
    const sN = surplus.filter(r => !isW(r)), dN = deficit.filter(r => !isW(r));
    const m = Math.min(sN.length, dN.length);
    for (let i = 0; i < m; i++) {
      const a = list.find(x => x.role === sN[i]);
      if (!a) continue;
      a.role = dN[i]; a.spr = AE.ROLES[dN[i]].spr; a.carry = null; a.retask = true; a.task = 'Cambiando de tarea';
    }
    surplus.splice(0, surplus.length, ...sN.slice(m), ...surplus.filter(isW));
    deficit.splice(0, deficit.length, ...dN.slice(m), ...deficit.filter(isW));
    // nuevas y eliminadas
    for (const r of deficit) { list.push(make(r, pendingNursery > 0)); if (pendingNursery > 0) pendingNursery--; }
    for (const r of surplus) {
      const i = list.findIndex(x => x.role === r);
      if (i >= 0) { if (AE.UI && AE.UI.selected && AE.UI.selected.agent === list[i]) AE.UI.closeInspector(); list.splice(i, 1); }
    }
    pendingNursery = 0;
  }
  function emerge(caste, k) { pendingNursery += k; recT = 0; }
  function reset() { list = []; recT = 0; }
  function retaskAll() { for (const a of list) a.retask = true; }
  function retaskRole(role) { for (const a of list) if (a.role === role) a.retask = true; }

  /* ---------- Actualización ---------- */
  function update(dt) {
    recT -= dt;
    if (recT <= 0) { reconcile(); recT = 0.7; }
    const sm = AE.Eco.stats().speedMult;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.si >= a.segs.length) { think(a); if (!a.segs.length) continue; }
      let seg = a.segs[a.si];
      if (!validSeg(seg)) { a.segs = []; a.si = 0; a.loc = safeLoc(); place(a); continue; }
      const px = a.x, py = a.y;
      if (seg.k === 'wait') {
        a.state = seg.anim; a.u += dt;
        if (seg.txt) a.task = seg.txt;
        if (seg.anim === 'dig' && AE.FX && Math.random() < dt * 3) AE.FX.dust(a.x + Math.cos(a.ang) * a.face * 8, a.y + Math.sin(a.ang) * a.face * 8, 1);
        if (a.u >= seg.d || (a.retask && seg.anim !== 'dig')) { doAct(a, seg.act); a.si++; a.u = 0; if (a.retask) { a.segs = []; a.si = 0; } }
        continue;
      }
      a.state = 'move';
      const sp = AE.ROLES[a.role].speed * a.speedK * sm * (a.carry ? 0.85 : 1);
      a.u += sp * dt / seg.L;
      if (a.u >= 1) {
        a.u = 1; evalSeg(a, seg);
        a.loc = endLoc(seg, a.loc); a.si++; a.u = 0;
        if (a.retask) { a.segs = []; a.si = 0; }
      } else evalSeg(a, seg);
      const dx = a.x - px, dy = a.y - py;
      const lx = Math.cos(a.ang), ly = Math.sin(a.ang);
      const dd = dx * lx + dy * ly;
      if (dd > 0.05) a.face = 1; else if (dd < -0.05) a.face = -1;
      a.ph = (a.ph + Math.hypot(dx, dy) / (14 * AE.S.TYPES[a.spr].sc)) % 1;
    }
  }
  function validSeg(seg) {
    if (seg.k === 'arc') return !!W.ch(seg.c);
    if (seg.k === 'tun') return !!W.tun(seg.t);
    return true;
  }
  function safeLoc() { const r = AE.Eco.royal(); return { k: 'c', id: r.id, a: Math.PI / 2 }; }
  function evalSeg(a, seg) {
    let p;
    const hh = h(a);
    if (seg.k === 'arc') p = W.chamberPos(W.ch(seg.c), seg.a0 + (seg.a1 - seg.a0) * a.u, hh);
    else if (seg.k === 'tun') p = W.tunnelPos(W.tun(seg.t), seg.s0 + (seg.s1 - seg.s0) * a.u, hh);
    else p = W.surfacePos(seg.x0 + (seg.x1 - seg.x0) * a.u, hh);
    a.x = p.x; a.y = p.y;
    a.ang = U.angLerp(a.ang, Math.atan2(-p.nx, p.ny), 0.25);
  }

  /* ---------- Dibujo ---------- */
  function draw(ctx, cam, t) {
    const S = AE.S, FR = S.FR, k = 1 / S.SPR;
    const vx0 = cam.vx0 - 40, vx1 = cam.vx1 + 40, vy0 = cam.vy0 - 40, vy1 = cam.vy1 + 40;
    const z = cam.z;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.x < vx0 || a.x > vx1 || a.y < vy0 || a.y > vy1) continue;
      const sp = S.cache[a.spr];
      let img = sp.still, bob = 0, rot = 0;
      if (a.state === 'move') img = sp.frames[(a.ph * FR | 0) % FR];
      else if (a.state === 'dig') { img = sp.frames[((t * 6 + a.id) | 0) % 2 * 2]; rot = Math.sin(t * 14 + a.id) * 0.06; }
      else if (a.state === 'fight') { img = sp.frames[((t * 10 + a.id) | 0) % FR]; bob = Math.sin(t * 18 + a.id) * 1.5; }
      else if (a.state === 'tend' || a.state === 'groom') rot = Math.sin(t * 3 + a.id) * 0.04;
      const ang = a.ang + rot;
      const cs = Math.cos(ang), sn = Math.sin(ang);
      const sx = (a.x - cam.x) * z + cam.cx, sy = (a.y - cam.y) * z + cam.cy;
      const f = a.face;
      ctx.setTransform(cs * z * f, sn * z * f, -sn * z, cs * z, sx, sy);
      ctx.drawImage(img, -sp.ax, -sp.ay + bob, sp.w, sp.h);
      if (a.carry) {
        const it = S.cache[a.carry];
        const sc = AE.S.TYPES[a.spr].sc;
        if (a.carry === 'leaf') ctx.drawImage(it.cv, 6 * sc, -15 * sc, it.w * 1.1, it.h * 1.1);
        else ctx.drawImage(it.cv, 10 * sc, -4 * sc, it.w * 0.8, it.h * 0.8);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function pick(wx, wy, r) {
    let best = null, bd = r * r;
    for (const a of list) {
      const d = (a.x - wx) ** 2 + (a.y - wy) ** 2;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }
  function near(x, y, r) { return pick(x, y, r); }

  return { update, draw, pick, near, reset, emerge, retaskAll, retaskRole, reconcile, get list() { return list; }, routeTo, place };
})();
