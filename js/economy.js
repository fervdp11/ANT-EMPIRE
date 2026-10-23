/* ANT EMPIRE - estado del juego, economía, cría, tiempo, eventos y objetivos */
'use strict';

AE.Eco = (function () {
  const U = AE.U, C = AE.C;
  const RK = ['leaf', 'fungus', 'water', 'soil'];
  let S = null;            // estadísticas derivadas (caché)
  let statT = 0;
  const net = { leaf: 0, fungus: 0, water: 0, soil: 0 };
  let acc = { leaf: 0, fungus: 0, water: 0, soil: 0 }, accT = 0;
  let objT = 0;
  let fungusFed = false;

  function G() { return AE.G; }
  function note(msg, kind) { if (AE.UI && AE.UI.toast) AE.UI.toast(msg, kind); }

  /* ---------- Partida nueva ---------- */
  function newState() {
    const seed = (Math.random() * 1e9) | 0;
    const EX = C.EX;
    const g = {
      v: 1, seed, time: C.DAY_LEN * 0.12, savedAt: Date.now(),
      res: { leaf: 20, fungus: 0, water: 12, soil: 0 },
      ants: { idle: 0, forager: 0, digger: 0, nurse: 0, soldier: 0, scout: 0, male: 0, princess: 0 },
      brood: [],
      queen: { x: EX + 40, y: 380, hunger: 85, hydration: 85, energy: 100, health: 100, reserve: 60, facing: 1 },
      chambers: [], tunnels: [], nextId: 1,
      up: {}, colonies: 0, territory: { lvl: 1, xp: 0 }, obj: 0,
      stats: { eggs: 0, adults: 0, leaf: 0, flights: 0, won: 0, lost: 0, playTime: 0 },
      auto: { on: false, w: { forager: 4, digger: 2, nurse: 2, scout: 1, soldier: 1 } },
      threat: { next: 540, count: 0 },
      order: 'work', introDone: false, quality: 'high'
    };
    // Cámara real y túnel de entrada (el intro los excava)
    const royal = { id: 0, type: 'royal', x: EX + 70, y: 400, rx: 150, ry: 86, level: 1, prog: 0, done: false, work: 0, total: 1, tun: 0 };
    const top = AE.W.groundY(EX) + 4;
    const p1 = { x: royal.x - 40, y: royal.y - royal.ry * 0.85 };
    const pts = AE.W.makeTunnelPts(EX, top, p1.x, p1.y, seed);
    g.tunnels.push({ id: 0, from: -1, to: 0, pts, prog: 0, a1: -Math.PI / 2 - 0.25 });
    g.chambers.push(royal);
    return g;
  }

  /* ---------- Ayudantes ---------- */
  function adults() { const a = G().ants; let n = 0; for (const k in a) n += a[k]; return n; }
  function workers() { const a = G().ants; return a.idle + a.forager + a.digger + a.nurse + a.scout + a.soldier; }
  function countType(type, doneOnly) { let n = 0; for (const c of G().chambers) if (c.type === type && (!doneOnly || c.done)) n++; return n; }
  function levelSum(type) { let n = 0; for (const c of G().chambers) if (c.type === type && c.done) n += c.level; return n; }
  function royal() { return G().chambers.find(c => c.type === 'royal'); }
  function up(k) { return G().up[k] || 0; }
  function upgradeLevels() { let n = 0; for (const k in G().up) n += G().up[k]; return n; }
  function broodCount(stage) { let n = 0; for (const b of G().brood) if (stage === undefined || b.s === stage) n += b.n; return n; }
  function wingedCount() { let n = G().ants.male + G().ants.princess; for (const b of G().brood) if (b.c !== 'w') n += b.n; return n; }

  function dayPhase() { return (G().time / C.DAY_LEN) % 1; }
  function dayNum() { return Math.floor(G().time / C.DAY_LEN) + 1; }
  function seasonIdx() { return Math.floor((dayNum() - 1) / C.SEASON_DAYS) % 4; }
  function season() { return AE.SEASONS[seasonIdx()]; }
  // 1 = pleno día, 0 = noche cerrada
  function daylight() {
    const p = dayPhase();
    if (p < 0.6) return 1;
    if (p < 0.7) return 1 - U.smooth((p - 0.6) / 0.1);
    if (p < 0.92) return 0;
    return U.smooth((p - 0.92) / 0.08);
  }
  function isNight() { return daylight() < 0.3; }

  /* ---------- Estadísticas derivadas ---------- */
  function computeStats() {
    const g = G();
    const has = {};
    let nCh = 0;
    for (const c of g.chambers) if (c.done) { has[c.type] = true; nCh++; }
    const r = royal();
    const rl = r ? r.level : 1;
    const gm = (1 + g.colonies * 0.25) * (1 + 0.12 * up('dynasty'));
    let cap = 150;
    for (const c of g.chambers) if (c.done && c.type === 'storage') cap += 300 * Math.pow(1.7, c.level - 1);
    let popCap = 5 + 3 * rl;
    let broodCap = 2 + 4 * rl;
    let soldierCap = 0, wingCap = 0;
    for (const c of g.chambers) {
      if (!c.done) continue;
      if (c.type === 'dorm') popCap += Math.floor(16 * Math.pow(c.level, 1.6));
      else if (c.type !== 'royal') popCap += 2;
      if (c.type === 'nursery') broodCap += Math.floor(12 * Math.pow(c.level, 1.5));
      if (c.type === 'barracks') soldierCap += Math.floor(5 * Math.pow(c.level, 1.7));
      if (c.type === 'nuptial') wingCap += 4 + 3 * (c.level - 1);
    }
    const fert = 1 + 0.2 * up('fertility');
    broodCap = Math.floor(broodCap * fert);
    const totalAdults = adults();
    S = {
      has, nChambers: nCh, totalAdults, colonies: g.colonies, gm,
      cap, popCap, broodCap, soldierCap, wingCap,
      reserveMax: 100 + 20 * (rl - 1),
      reserveRegen: (1 + 0.3 * (rl - 1)) * (1 + 0.15 * up('nutrition')),
      autoLay: 0.06 * (rl - 1) * fert,
      workshop: levelSum('workshop'),
      nurseryBonus: 1 + 0.1 * Math.max(0, levelSum('nursery') - countType('nursery', true)),
      digMult: (1 + 0.2 * up('digging')) * (1 + 0.25 * levelSum('workshop')),
      forageMult: (1 + 0.15 * up('mandibles')) * (1 + 0.1 * up('trails')) * (1 + 0.1 * (g.territory.lvl - 1)) * gm,
      fungusConv: 0, waterProd: 0.03 * gm,
      soldierPow: 3 * (1 + 0.25 * up('chitin')) * (1 + 0.15 * Math.max(0, levelSum('barracks') - countType('barracks', true))),
      scoutMult: (1 + 0.2 * up('cartography')) * (1 + 0.3 * levelSum('scout')),
      speedMult: 1 + 0.1 * up('trails'),
      consMult: Math.pow(0.94, up('metabolism'))
    };
    for (const c of g.chambers) {
      if (!c.done) continue;
      if (c.type === 'fungus') S.fungusConv += 0.5 * Math.pow(c.level, 1.5) * (1 + 0.2 * up('symbiosis')) * gm;
      if (c.type === 'cistern') S.waterProd += 0.35 * Math.pow(c.level, 1.5) * (1 + 0.2 * up('capillarity')) * gm;
    }
    S.defense = g.ants.soldier * S.soldierPow + (g.ants.idle + g.ants.forager + g.ants.digger + g.ants.scout) * 0.3 + 2;
    return S;
  }
  function stats() { return S || computeStats(); }

  /* ---------- Costes ---------- */
  function scaleCost(base, k) { const o = {}; for (const r in base) if (base[r] > 0) o[r] = Math.ceil(base[r] * k); return o; }
  function canAfford(cost) { const r = G().res; for (const k in cost) if ((r[k] || 0) < cost[k] - 1e-9) return false; return true; }
  function overCap(cost) { const cap = stats().cap; for (const k in cost) if (cost[k] > cap) return true; return false; }
  function pay(cost) { if (!canAfford(cost)) return false; const r = G().res; for (const k in cost) r[k] -= cost[k]; return true; }
  function gain(obj, mult) { const r = G().res, cap = stats().cap; for (const k in obj) r[k] = Math.min(cap, (r[k] || 0) + obj[k] * (mult || 1)); }
  function buildCost(type) {
    const T = AE.CHAMBERS[type];
    return scaleCost(T.cost, Math.pow(1.45, countType(type)) * Math.pow(1.1, Math.max(0, G().chambers.length - 1)));
  }
  function chamberUpCost(c) {
    if (c.type === 'storage') { const cap = stats().cap; return { leaf: Math.ceil(cap * 0.4), soil: Math.ceil(cap * 0.12) }; }
    const raw = AE.CHAMBERS[c.type].upCost(c.level); const o = {};
    for (const k in raw) if (raw[k] > 0.5) o[k] = Math.ceil(raw[k]);
    return o;
  }
  function upgradeCost(k) { const U2 = AE.UPGRADES[k]; return scaleCost(U2.base, Math.pow(U2.g, up(k))); }

  /* ---------- Acciones ---------- */
  function layEgg(caste, silent) {
    const g = G(), st = stats(), q = g.queen;
    caste = caste || 'w';
    if (broodCount() >= st.broodCap) { if (!silent) note('La guardería está llena. Amplía la capacidad de cría.', 'warn'); return false; }
    if (q.reserve < 8) { if (!silent) note('La reina no tiene reservas suficientes. Necesita alimento y descanso.', 'warn'); return false; }
    if (q.health < 15) { if (!silent) note('La reina está demasiado débil para poner huevos.', 'warn'); return false; }
    q.reserve -= 8;
    const last = g.brood[g.brood.length - 1];
    if (last && last.s === 0 && last.t < 0.08 && last.c === caste) last.n++;
    else g.brood.push({ s: 0, t: 0, n: 1, c: caste });
    g.stats.eggs++;
    if (AE.FX) AE.FX.eggLaid();
    return true;
  }
  function eat() {
    const g = G(), q = g.queen;
    if (q.hunger > 95) { note('La reina no tiene hambre.'); return; }
    if (g.res.fungus >= 4) g.res.fungus -= 4; else if (g.res.leaf >= 8) g.res.leaf -= 8; else { note('No hay comida suficiente.', 'warn'); return; }
    q.hunger = Math.min(100, q.hunger + 35); note('La reina se alimenta. 🍄');
  }
  function drink() {
    const g = G(), q = g.queen;
    if (q.hydration > 95) { note('La reina no tiene sed.'); return; }
    if (g.res.water < 3) { note('No hay agua suficiente.', 'warn'); return; }
    g.res.water -= 3; q.hydration = Math.min(100, q.hydration + 35); note('La reina bebe. 💧');
  }
  function buyUpgrade(k) {
    const D = AE.UPGRADES[k];
    if (D.max && up(k) >= D.max) return false;
    const cost = upgradeCost(k);
    if (!pay(cost)) { note('Recursos insuficientes.', 'warn'); return false; }
    G().up[k] = up(k) + 1; computeStats();
    note(D.name + ' → nivel ' + up(k), 'good');
    if (k === 'caste') { G().auto.on = true; }
    AE.Save && AE.Save.soon();
    return true;
  }
  function upgradeChamber(c) {
    const cost = chamberUpCost(c);
    if (!pay(cost)) { note('Recursos insuficientes.', 'warn'); return false; }
    c.level++; computeStats();
    note(AE.CHAMBERS[c.type].name + ' mejorada a nivel ' + c.level, 'good');
    AE.Save && AE.Save.soon();
    return true;
  }
  function startDig(type, v) {
    const g = G();
    const T = AE.CHAMBERS[type];
    const pending = g.chambers.filter(c => !c.done).length;
    if (pending >= 3) { note('Ya hay 3 excavaciones en curso. Espera a que terminen.', 'warn'); return false; }
    const cost = buildCost(type);
    if (!pay(cost)) { note('Recursos insuficientes.', 'warn'); return false; }
    const id = g.nextId++;
    const tunnelWork = v.len / 9;
    const chWork = (T.rx * T.ry) / 600;
    const total = (tunnelWork + chWork) * (1 + 0.06 * g.chambers.length);
    const c = { id, type, x: Math.round(v.x), y: Math.round(v.y), rx: T.rx, ry: T.ry, level: 1, prog: 0, done: false, work: 0, total, tunW: tunnelWork * (1 + 0.06 * g.chambers.length), tun: id, cost };
    const t = { id, from: v.parent.id, to: id, pts: v.pts, prog: 0, a0: v.a0, a1: v.a1 };
    g.tunnels.push(t); g.chambers.push(c);
    AE.W.rebuild();
    note('Excavación ordenada: ' + T.name + '. Las excavadoras se ponen en marcha.', 'good');
    if (g.ants.digger === 0) note('Asigna excavadoras (o mantén E junto a la obra) para excavar.', 'warn');
    AE.Save && AE.Save.soon();
    return c;
  }
  function addWork(c, w) {
    if (c.done) return;
    c.work = Math.min(c.total, c.work + w);
    const t = AE.W.tun(c.tun);
    const tw = c.tunW || c.total * 0.7;
    if (t) t.prog = U.clamp(c.work / tw, 0, 1);
    c.prog = U.clamp((c.work - tw) / (c.total - tw), 0, 1);
    if (c.work >= c.total - 1e-6) {
      c.done = true; c.prog = 1; if (t) t.prog = 1;
      computeStats();
      note('¡' + AE.CHAMBERS[c.type].name + ' terminada!', 'good');
      if (AE.FX) AE.FX.chamberDone(c);
      AE.Save && AE.Save.soon();
    }
  }
  function activeJob() { for (const c of G().chambers) if (!c.done && c.type !== 'royal') return c; return null; }

  function roleAvailable(role) {
    const st = stats();
    if (role === 'soldier') return !!st.has.barracks;
    if (role === 'scout') return !!st.has.scout;
    return true;
  }
  function soldierCost() { return { fungus: Math.ceil(8 * Math.pow(1.04, G().ants.soldier)) }; }
  function assign(role, n) {
    const g = G();
    n = Math.min(n, g.ants.idle);
    if (n <= 0) { note('No hay obreras libres.', 'warn'); return 0; }
    if (!roleAvailable(role)) { note('Necesitas construir ' + (role === 'soldier' ? 'un Cuartel' : 'un Puesto de exploración') + '.', 'warn'); return 0; }
    let done = 0;
    for (let i = 0; i < n; i++) {
      if (role === 'soldier') {
        if (g.ants.soldier >= stats().soldierCap) { if (!done) note('El cuartel está completo. Mejóralo para más soldados.', 'warn'); break; }
        if (!pay(soldierCost())) { if (!done) note('Entrenar un soldado requiere hongos.', 'warn'); break; }
      }
      g.ants.idle--; g.ants[role]++; done++;
    }
    computeStats();
    return done;
  }
  function unassign(role, n) {
    const g = G();
    n = Math.min(n, g.ants[role]);
    g.ants[role] -= n; g.ants.idle += n; computeStats();
    return n;
  }
  function autoAssign() {
    const g = G();
    if (!g.auto.on || !up('caste') || g.ants.idle <= 0) return;
    const roles = AE.WORK_ROLES.filter(r => roleAvailable(r) && (g.auto.w[r] || 0) > 0);
    let guard = 0;
    while (g.ants.idle > 0 && guard++ < 400) {
      let tw = 0, tot = 0; roles.forEach(r => { tw += g.auto.w[r]; tot += g.ants[r]; });
      if (tw <= 0) return;
      let best = null, bd = -1e9;
      roles.forEach(r => { const d = g.auto.w[r] / tw - g.ants[r] / Math.max(1, tot + 1); if (d > bd) { bd = d; best = r; } });
      if (!best) return;
      const chunk = Math.max(1, Math.floor(g.ants.idle / 10));
      if (assign(best, chunk) === 0) { roles.splice(roles.indexOf(best), 1); if (!roles.length) return; }
    }
  }
  function breedCost(kind) {
    const g = G();
    let pend = g.ants.princess; for (const b of g.brood) if (b.c === 'p') pend += b.n;
    const k = Math.pow(1.6, g.colonies) * (kind === 'p' ? 1 + 0.5 * pend : 1);
    return kind === 'p' ? { fungus: Math.ceil(120 * k), water: Math.ceil(60 * k) } : { fungus: Math.ceil(40 * k), water: Math.ceil(20 * k) };
  }
  function breed(kind) {
    const st = stats();
    if (!st.has.nuptial) return;
    if (wingedCount() >= st.wingCap) { note('La cámara nupcial está llena.', 'warn'); return; }
    const cost = breedCost(kind);
    if (!canAfford(cost)) { note('Recursos insuficientes.', 'warn'); return; }
    if (G().queen.reserve < 8) { note('La reina necesita reservas para poner este huevo.', 'warn'); return; }
    pay(cost); G().queen.reserve -= 8;
    G().brood.push({ s: 0, t: 0, n: 1, c: kind });
    note(kind === 'p' ? 'La reina pone un huevo de princesa. 👑' : 'La reina pone un huevo de macho.', 'good');
  }
  function flightStatus() {
    const g = G();
    if (g.ants.princess < 1 || g.ants.male < 2) return { ok: false, why: 'Necesitas al menos 1 princesa y 2 machos adultos.' };
    if (seasonIdx() > 1) return { ok: false, why: 'Los vuelos nupciales solo ocurren en primavera y verano.' };
    if (daylight() < 0.6) return { ok: false, why: 'Espera a que sea de día.' };
    return { ok: true };
  }
  function nuptialFlight() {
    const g = G(), fs = flightStatus();
    if (!fs.ok) { note(fs.why, 'warn'); return; }
    const maxN = 1 + Math.floor(levelSum('nuptial') / 3);
    const n = Math.min(g.ants.princess, Math.floor(g.ants.male / 2), maxN);
    g.ants.princess -= n; g.ants.male -= n * 2;
    g.colonies += n; g.stats.flights++;
    computeStats();
    gain({ leaf: 300 * n * Math.pow(1.5, g.colonies), fungus: 100 * n * Math.pow(1.5, g.colonies) });
    note('¡Vuelo nupcial! ' + n + ' nueva' + (n > 1 ? 's colonias fundadas' : ' colonia fundada') + '. Producción global +' + (25 * n) + '%', 'gold');
    if (AE.FX) AE.FX.flight(n * 3);
    AE.Save && AE.Save.soon();
  }

  /* ---------- Simulación ---------- */
  function tick(dt, offline) {
    const g = G();
    g.time += dt; g.stats.playTime += dt;
    statT -= dt; if (statT <= 0) { computeStats(); statT = 0.5; }
    const st = S, ss = season(), a = g.ants, r = g.res;
    const before = { leaf: r.leaf, fungus: r.fungus, water: r.water, soil: r.soil };
    const dayF = 0.55 + 0.45 * daylight();
    // producción
    const leafP = a.forager * 0.42 * st.forageMult * ss.forage * dayF;
    r.leaf += leafP * dt; g.stats.leaf += leafP * dt;
    let conv = Math.min(st.fungusConv * dt, r.leaf * 0.5);
    r.leaf -= conv; r.fungus += conv * 0.9;
    r.water += (st.waterProd * ss.water + a.forager * 0.01) * dt;
    // excavación
    const job = activeJob();
    const digRate = a.digger * 1.0 * st.digMult;
    if (job && digRate > 0) { addWork(job, digRate * dt); r.soil += digRate * 0.5 * dt; }
    else r.soil += a.digger * 0.12 * st.digMult * dt;
    r.soil += st.workshop * 0.3 * dt;
    // consumo
    const larvae = broodCount(1);
    // las adultas comen hojas; las larvas prefieren hongo (se desarrollan más rápido)
    const cm = ss.cons * st.consMult * dt;
    let starving = false;
    const adultFood = (adults() * 0.02 + a.soldier * 0.02) * cm;
    if (r.leaf >= adultFood) r.leaf -= adultFood; else r.leaf = 0;
    let larvaFood = adults() === 0 ? 0 : larvae * 0.025 * cm; // fundación claustral: la reina alimenta a la cría
    fungusFed = true;
    if (r.fungus >= larvaFood) r.fungus -= larvaFood;
    else { larvaFood -= r.fungus; r.fungus = 0; fungusFed = false; if (r.leaf >= larvaFood * 2) r.leaf -= larvaFood * 2; else { r.leaf = 0; starving = true; } }
    const wcons = (adults() * 0.006 + larvae * 0.01) * ss.cons * st.consMult * dt;
    if (r.water >= wcons) r.water -= wcons; else { r.water = 0; }
    for (const k of RK) r[k] = U.clamp(r[k], 0, st.cap);
    // cría
    tickBrood(dt, starving, offline);
    // reina
    tickQueen(dt, offline);
    // tasas netas (media móvil, sin contar recompensas puntuales)
    accT += dt;
    for (const k of RK) acc[k] += r[k] - before[k];
    if (accT >= 2) { for (const k of RK) { net[k] = U.lerp(net[k], acc[k] / accT, 0.6); acc[k] = 0; } accT = 0; }
    // exploración
    if (a.scout > 0) {
      const t = g.territory;
      t.xp += a.scout * 0.5 * st.scoutMult * dt;
      const need = 60 * Math.pow(1.9, t.lvl - 1);
      if (t.xp >= need) {
        t.xp -= need; t.lvl++;
        const finds = [['un claro con hojas tiernas', { leaf: need * 1.2 }], ['un charco de rocío', { water: need * 0.6 }], ['una colonia de pulgones', { fungus: need * 0.5 }], ['un tronco podrido lleno de alimento', { leaf: need * 0.8, fungus: need * 0.3 }]];
        const f = U.pick(finds);
        gain(f[1], st.scoutMult);
        computeStats();
        if (!offline) note('🗺️ Territorio nivel ' + t.lvl + ': tus exploradoras descubren ' + f[0] + '.', 'good');
      }
    }
    if (!offline) {
      autoAssign();
      tickThreat(dt);
      objT -= dt; if (objT <= 0) { objT = 1; checkObjectives(); }
    } else autoAssign();
  }

  function tickBrood(dt, starving, offline) {
    const g = G(), st = S, q = g.queen;
    const total = broodCount();
    const qCare = (offline || (AE.Q && AE.Q.inRoyal())) ? 3 : 0;
    const care = Math.min(1, ((g.ants.nurse + qCare) * 4) / Math.max(1, total));
    const speed = (0.5 + care) * (1 + 0.15 * up('larval')) * season().brood * st.nurseryBonus;
    const durs = [12, 18, 15];
    const larvae = broodCount(1);
    let room = st.popCap - adults();
    for (let i = 0; i < g.brood.length; i++) {
      const b = g.brood[i];
      if (b.s < 3) {
        let sp = speed / durs[b.s] * (b.c === 'w' ? 1 : 0.5);
        if (b.s === 1) { if (starving) sp *= 0.25; else if (fungusFed && larvae > 0) sp *= 1.25; }
        b.t += sp * dt;
        while (b.t >= 1 && b.s < 3) { b.t -= 1; b.s++; if (b.s === 3) b.t = 1; }
      }
      if (b.s === 3) {
        const k = Math.min(b.n, Math.max(0, room));
        if (k > 0) {
          b.n -= k; room -= k; g.stats.adults += k;
          if (b.c === 'w') g.ants.idle += k; else if (b.c === 'm') g.ants.male += k; else g.ants.princess += k;
          if (!offline) {
            if (g.stats.adults <= 3) note('¡Ha nacido una nueva obrera! 🐜', 'good');
            if (b.c === 'p') note('¡Ha nacido una princesa alada! 👑', 'gold');
            if (AE.Agents) AE.Agents.emerge(b.c, k);
          }
        } else if (!offline && !g._popWarn) { g._popWarn = true; note('No hay espacio para nuevas hormigas. Excava un Dormitorio o mejora la Cámara Real.', 'warn'); setTimeout(() => { g._popWarn = false; }, 30000); }
      }
    }
    if (g.brood.some(b => b.n <= 0)) g.brood = g.brood.filter(b => b.n > 0);
    // puesta automática
    if (st.autoLay > 0 && q.health > 20) {
      g._autoAcc = (g._autoAcc || 0) + st.autoLay * dt;
      while (g._autoAcc >= 1) {
        g._autoAcc -= 1;
        // la puesta automática respeta una reserva mínima para las puestas manuales y las princesas
        if (q.reserve < st.reserveMax * 0.3 || !layEgg('w', true)) { g._autoAcc = 0; break; }
      }
    }
  }

  function tickQueen(dt, offline) {
    const g = G(), q = g.queen, st = S, r = g.res;
    const founding = adults() === 0;
    q.hunger -= (founding ? 0.07 : 0.2) * dt;
    q.hydration -= (founding ? 0.06 : 0.16) * dt;
    const fedByNurses = (offline || (AE.Q && AE.Q.inRoyal())) && g.ants.nurse > 0;
    if (fedByNurses) {
      if (q.hunger < 92) { const need = 0.05 * dt; if (r.fungus >= need) { r.fungus -= need; q.hunger += 4 * dt; } else if (r.leaf >= need * 2) { r.leaf -= need * 2; q.hunger += 4 * dt; } }
      if (q.hydration < 92 && r.water >= 0.04 * dt) { r.water -= 0.04 * dt; q.hydration += 4 * dt; }
    }
    if (offline) { q.hunger = Math.max(q.hunger, 35); q.hydration = Math.max(q.hydration, 35); q.energy = 100; }
    q.hunger = U.clamp(q.hunger, 0, 100); q.hydration = U.clamp(q.hydration, 0, 100);
    if (q.hunger <= 0 || q.hydration <= 0) q.health = Math.max(10, q.health - 0.4 * dt);
    else if (q.hunger > 40 && q.hydration > 40) q.health = Math.min(100, q.health + 0.5 * dt);
    const fed = (q.hunger > 25 && q.hydration > 25) ? 1 : 0.25;
    q.reserve = Math.min(st.reserveMax, q.reserve + st.reserveRegen * fed * (0.4 + 0.6 * q.health / 100) * dt);
  }

  /* ---------- Amenazas ---------- */
  const ENEMIES = [{ k: 'beetle', name: 'Un escarabajo' }, { k: 'spider', name: 'Una araña' }, { k: 'rival', name: 'Hormigas rivales' }];
  function tickThreat(dt) {
    const g = G(), th = g.threat;
    if (th.active) {
      th.active.t -= dt;
      if (th.active.t <= 0) {
        const st = computeStats();
        const win = st.defense >= th.active.power;
        if (win) {
          const loot = { fungus: th.active.power * 4, leaf: th.active.power * 6 };
          gain(loot); g.stats.won++;
          note('⚔️ ¡Victoria! ' + th.active.name + ' ha sido derrotado. Botín: ' + U.fmt(loot.leaf) + ' hojas y ' + U.fmt(loot.fungus) + ' hongos.', 'good');
        } else {
          g.res.leaf *= 0.88; g.res.fungus *= 0.88; g.stats.lost++;
          note('💥 ' + th.active.name + ' ha saqueado parte de las provisiones (-12%). Entrena más soldados.', 'warn');
        }
        th.active = null; th.count++;
        th.next = g.time + U.rand(260, 420);
      }
      return;
    }
    if (g.time >= th.next && adults() >= 4) {
      const e = U.pick(ENEMIES);
      const power = Math.round(4 * Math.pow(1.28, th.count) * (1 + adults() / 60));
      th.active = { k: e.k, name: e.name, power, t: 16, side: Math.random() < 0.5 ? -1 : 1 };
      note('⚠️ ' + e.name + ' se acerca a la entrada (fuerza ' + power + ' · defensa ' + Math.round(stats().defense) + ')', 'warn');
      if (AE.Agents) AE.Agents.retaskRole('soldier');
    } else if (g.time >= th.next) th.next = g.time + 120;
  }

  /* ---------- Objetivos ---------- */
  function objective(i) {
    const L = AE.OBJECTIVES;
    if (i < L.length) return L[i];
    const k = i - L.length, tier = Math.floor(k / 4), kind = k % 4;
    const m = Math.pow(1.7, tier);
    if (kind === 0) { const n = Math.floor(60 * Math.pow(1.6, tier)); return { t: 'Alcanza ' + n + ' hormigas adultas', v: () => adults(), n, r: { leaf: 800 * m, fungus: 300 * m } }; }
    if (kind === 1) { const n = 12 + tier * 2; return { t: 'Ten ' + n + ' cámaras excavadas', v: () => stats().nChambers, n, r: { soil: 500 * m, water: 300 * m } }; }
    if (kind === 2) { const n = 20 + tier * 8; return { t: 'Suma ' + n + ' niveles de mejoras', v: () => upgradeLevels(), n, r: { fungus: 500 * m } }; }
    const n = 2 + tier; return { t: 'Funda ' + n + ' colonias filiales', v: () => G().colonies, n, r: { leaf: 2000 * m, fungus: 800 * m } };
  }
  function checkObjectives() {
    const g = G();
    const o = objective(g.obj);
    if (o.v(g) >= o.n) {
      gain(o.r);
      const rs = Object.keys(o.r).map(k => '+' + U.fmt(o.r[k]) + ' ' + AE.RES.find(x => x.k === k).name.toLowerCase()).join(', ');
      note('🏆 Objetivo cumplido: ' + o.t + ' (' + rs + ')', 'gold');
      g.obj++;
      AE.Save && AE.Save.soon();
    }
  }

  /* ---------- Progreso offline ---------- */
  function simulateOffline(sec) {
    const g = G();
    sec = Math.min(sec, C.OFFLINE_MAX);
    if (sec < 5) return null;
    const before = { leaf: g.res.leaf, fungus: g.res.fungus, water: g.res.water, soil: g.res.soil, adults: adults(), terr: g.territory.lvl };
    const step = sec > 3600 ? 10 : 5;
    let t = 0;
    computeStats();
    while (t < sec) { const d = Math.min(step, sec - t); tick(d, true); t += d; }
    if (g.threat.next < g.time + 60) g.threat.next = g.time + 200;
    computeStats();
    return {
      sec, leaf: g.res.leaf - before.leaf, fungus: g.res.fungus - before.fungus, water: g.res.water - before.water,
      soil: g.res.soil - before.soil, adults: adults() - before.adults, terr: g.territory.lvl - before.terr
    };
  }

  return {
    newState, tick, stats, computeStats, net, adults, workers, countType, levelSum, royal, up, upgradeLevels,
    broodCount, wingedCount, dayPhase, dayNum, season, seasonIdx, daylight, isNight,
    canAfford, overCap, pay, gain, buildCost, chamberUpCost, upgradeCost,
    layEgg, eat, drink, buyUpgrade, upgradeChamber, startDig, addWork, activeJob, roleAvailable, soldierCost,
    assign, unassign, breed, breedCost, flightStatus, nuptialFlight, objective, simulateOffline, note
  };
})();
