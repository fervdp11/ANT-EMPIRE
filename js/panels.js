/* ANT EMPIRE - paneles laterales: Excavar, Obreras, Mejoras y Objetivos */
'use strict';

AE.Panels = (function () {
  const U = AE.U;
  const $ = id => document.getElementById(id);
  let cur = null, last = '';

  function open(name) {
    if (cur === name) { close(); return; }
    cur = name; last = '';
    $('drawer').classList.add('vis');
    document.querySelectorAll('.sbtn').forEach(b => b.classList.toggle('on', b.dataset.panel === name));
    refresh(true);
  }
  function close() {
    cur = null; $('drawer').classList.remove('vis');
    document.querySelectorAll('.sbtn').forEach(b => b.classList.toggle('on', false));
  }
  function refresh() {
    if (!cur) return;
    let title = '', html = '';
    if (cur === 'dig') { title = 'Excavar'; html = digHtml(); }
    else if (cur === 'workers') { title = 'Obreras'; html = workersHtml(); }
    else if (cur === 'upgrades') { title = 'Mejoras'; html = upgradesHtml(); }
    else if (cur === 'goals') { title = 'Objetivos'; html = goalsHtml(); }
    if (html === last) return;
    const body = $('drawer-body');
    const sc = body.scrollTop;
    $('drawer-title').textContent = title;
    body.innerHTML = html; last = html;
    body.scrollTop = sc;
  }

  /* ---------- Excavar ---------- */
  function digHtml() {
    const E = AE.Eco, st = E.stats(), g = AE.G;
    const UI = AE.UI;
    let h = '<p class="pintro">Elige un tipo de cámara y colócala en la tierra. Se conectará con un túnel a la cámara más cercana. Las <b>excavadoras</b> harán el trabajo (la reina puede ayudar manteniendo <kbd>E</kbd> junto a la obra).</p>';
    const jobs = g.chambers.filter(c => !c.done);
    if (jobs.length) {
      h += '<h4>Obras en curso</h4>';
      for (const c of jobs) h += '<div class="row job"><span>' + AE.CHAMBERS[c.type].name + '</span><div class="bar"><i style="width:' + (c.work / c.total * 100) + '%;background:#f2b84b"></i></div><b>' + Math.floor(c.work / c.total * 100) + '%</b>' + UI.btn('goto:' + c.id, 'Ver') + '</div>';
      h += '<div class="hint">Excavadoras: ' + g.ants.digger + ' · Velocidad: ' + U.fmt(g.ants.digger * st.digMult * 60) + ' trabajo/min</div>';
    }
    h += '<h4>Cámaras</h4>';
    for (const k of AE.CHAMBER_ORDER) {
      const T = AE.CHAMBERS[k];
      const unlocked = T.unlock(st);
      const cost = E.buildCost(k);
      const n = E.countType(k);
      const ok = unlocked && E.canAfford(cost) && jobs.length < 3;
      h += '<div class="card2' + (unlocked ? '' : ' locked') + '"><div class="c2h"><span class="sw" style="background:' + T.color + '"></span><b>' + T.name + '</b>' + (n ? '<small>×' + n + '</small>' : '') + '</div>' +
        '<p>' + T.desc + '</p>' +
        (unlocked ? '<div class="c2f"><span>' + UI.costHtml(cost) + '</span>' + UI.btn('place:' + k, '⛏ Excavar', ok) + '</div>' + (E.overCap(cost) ? '<div class="hint warn">Supera la capacidad de almacenamiento.</div>' : '')
          : '<div class="c2f"><span class="lockt">🔒 ' + T.unlockTxt + '</span></div>') + '</div>';
    }
    return h;
  }

  /* ---------- Obreras ---------- */
  function workersHtml() {
    const E = AE.Eco, st = E.stats(), g = AE.G, UI = AE.UI;
    let h = '<div class="sumrow"><div>' + UI.icon('ant') + '<b>' + U.fmt(E.adults()) + '</b>/' + U.fmt(st.popCap) + '<small>población</small></div><div>' + UI.icon('egg') + '<b>' + U.fmt(E.broodCount()) + '</b>/' + U.fmt(st.broodCap) + '<small>cría</small></div><div class="idle">' + '<b>' + U.fmt(g.ants.idle) + '</b><small>libres</small></div></div>';
    h += '<p class="pintro">Asigna las obreras libres a cada tarea. Cada clase tiene su propio aspecto: ¡aprende a reconocerlas en el nido!</p>';
    for (const r of AE.WORK_ROLES) {
      const R = AE.ROLES[r];
      const av = E.roleAvailable(r);
      const n = g.ants[r];
      let info = R.fn;
      if (r === 'soldier') info += ' Máx. ' + st.soldierCap + ' · coste ' + UI.costHtml(E.soldierCost());
      h += '<div class="wrole' + (av ? '' : ' locked') + '">' + UI.antIcon(R.spr) + '<div class="wr-main"><div class="wr-h"><b>' + R.plural + '</b><span class="cnt">' + U.fmt(n) + '</span></div><p>' + info + '</p>' +
        (av ? '<div class="wr-b">' + UI.btn('un:' + r + ':10', '−10', n > 0) + UI.btn('un:' + r + ':1', '−1', n > 0) + UI.btn('as:' + r + ':1', '+1', g.ants.idle > 0) + UI.btn('as:' + r + ':10', '+10', g.ants.idle > 0) + UI.btn('as:' + r + ':all', '+Todas', g.ants.idle > 0) + '</div>'
          : '<div class="lockt">🔒 Requiere ' + (r === 'soldier' ? 'un Cuartel' : 'un Puesto de exploración') + '</div>') + '</div></div>';
    }
    // castas reproductoras
    h += '<div class="wrole"><div class="duo">' + UI.antIcon('male') + UI.antIcon('princess') + '</div><div class="wr-main"><div class="wr-h"><b>Machos y princesas</b><span class="cnt">' + g.ants.male + ' · ' + g.ants.princess + '</span></div><p>Se crían en la Cámara nupcial y fundan nuevas colonias en el vuelo nupcial.</p></div></div>';
    h += '<div class="wrole"><div>' + UI.antIcon('worker') + '</div><div class="wr-main"><div class="wr-h"><b>Obreras libres</b><span class="cnt">' + U.fmt(g.ants.idle) + '</span></div><p>Pasean por el nido esperando órdenes. Defienden algo si hay ataques.</p></div></div>';
    // automatización
    h += '<h4>Asignación automática</h4>';
    if (E.up('caste')) {
      h += '<div class="row">' + UI.btn('autotoggle', g.auto.on ? '✔ Activada' : '✖ Desactivada', true, g.auto.on ? ' style="background:#4f8a2a"' : '') + '<span class="hint">Las nuevas obreras se reparten según estas proporciones.</span></div>';
      for (const r of AE.WORK_ROLES) {
        if (!E.roleAvailable(r)) continue;
        h += '<div class="row wt"><span>' + AE.ROLES[r].plural + '</span>' + UI.btn('w:' + r + ':-1', '−') + '<b>' + g.auto.w[r] + '</b>' + UI.btn('w:' + r + ':1', '+') + '</div>';
      }
    } else h += '<div class="hint">Compra la mejora <b>Feromonas de casta</b> para automatizar el reparto.</div>';
    h += '<h4>Órdenes generales</h4><div class="row">' + UI.btn('order:rally', '📯 Reunir junto a la reina', g.order !== 'rally') + UI.btn('order:work', '⚒ Volver al trabajo', g.order !== 'work') + '</div>';
    return h;
  }

  /* ---------- Mejoras ---------- */
  function upgradesHtml() {
    const E = AE.Eco, st = E.stats(), UI = AE.UI;
    let h = '<p class="pintro">Mejoras permanentes para toda la colonia. Cada nivel es más caro, pero sus efectos se acumulan sin límite.</p>';
    let hidden = 0;
    for (const k of AE.UPGRADE_ORDER) {
      const D = AE.UPGRADES[k];
      if (!D.unlock(st)) { hidden++; continue; }
      const lvl = E.up(k), maxed = D.max && lvl >= D.max;
      const cost = E.upgradeCost(k);
      h += '<div class="card2"><div class="c2h">' + UI.icon(D.icon) + '<b>' + D.name + '</b><small>' + (D.max ? (maxed ? 'Adquirida' : '') : 'Nv. ' + lvl) + '</small></div><p>' + D.desc + '</p>' +
        (maxed ? '' : '<div class="c2f"><span>' + UI.costHtml(cost) + '</span>' + UI.btn('buy:' + k, 'Comprar', E.canAfford(cost)) + '</div>' + (E.overCap(cost) ? '<div class="hint warn">Supera la capacidad de almacenamiento.</div>' : '')) + '</div>';
    }
    if (hidden) h += '<div class="hint">🔒 ' + hidden + ' mejora' + (hidden > 1 ? 's' : '') + ' por descubrir a medida que crezca la colonia.</div>';
    return h;
  }

  /* ---------- Objetivos ---------- */
  function goalsHtml() {
    const E = AE.Eco, g = AE.G, UI = AE.UI;
    const o = E.objective(g.obj);
    const v = Math.max(0, Math.min(o.n, o.v(g)));
    let h = '<div class="card2 goal"><div class="c2h">' + UI.icon('target') + '<b>Objetivo actual</b><small>#' + (g.obj + 1) + '</small></div><p>' + o.t + '</p><div class="bar big"><i style="width:' + (v / o.n * 100) + '%;background:#f2b84b"></i></div><div class="c2f"><span>' + U.fmt(v) + ' / ' + U.fmt(o.n) + '</span><span>Recompensa: ' + UI.costHtml(o.r).replace(/class="cost[^"]*"/g, 'class="cost"') + '</span></div></div>';
    h += '<p class="hint">Objetivos completados: <b>' + g.obj + '</b>. Siempre habrá nuevos retos.</p>';
    const s = g.stats;
    h += '<h4>Crónica del imperio</h4>' +
      kv('Tiempo de juego', U.fmtTime(s.playTime)) + kv('Día / estación', E.dayNum() + ' · ' + E.season().name) +
      kv('Huevos puestos', U.fmt(s.eggs)) + kv('Hormigas nacidas', U.fmt(s.adults)) + kv('Hojas recolectadas', U.fmt(s.leaf)) +
      kv('Cámaras excavadas', E.stats().nChambers) + kv('Territorio', 'Nivel ' + g.territory.lvl) +
      kv('Colonias filiales', g.colonies) + kv('Batallas ganadas / perdidas', s.won + ' / ' + s.lost) +
      kv('Multiplicador global', '×' + E.stats().gm.toFixed(2));
    return h;
  }
  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>'; }

  function action(a, b) {
    const E = AE.Eco, g = AE.G;
    const parts = b ? b.split(':') : [];
    if (a === 'place') { AE.Main.startPlacing(parts[0]); }
    else if (a === 'goto') { const c = AE.W.ch(+parts[0]); if (c) { AE.Main.peekAt(c.x, c.y); AE.UI.inspect({ kind: 'chamber', c }); } }
    else if (a === 'as') { const n = parts[1] === 'all' ? g.ants.idle : +parts[1]; E.assign(parts[0], n); AE.Save.soon(); }
    else if (a === 'un') { E.unassign(parts[0], +parts[1]); AE.Save.soon(); }
    else if (a === 'buy') E.buyUpgrade(parts[0]);
    else if (a === 'autotoggle') { g.auto.on = !g.auto.on; }
    else if (a === 'w') { g.auto.w[parts[0]] = U.clamp((g.auto.w[parts[0]] || 0) + +parts[1], 0, 20); }
    else if (a === 'order') {
      g.order = parts[0]; AE.Agents.retaskAll();
      AE.UI.toast(g.order === 'rally' ? '📯 ¡Todas las hormigas acuden junto a la reina!' : '⚒ Las hormigas vuelven a sus tareas.', 'good');
    }
    last = '';
    refresh();
  }

  function init() {
    AE.UI.bindActions($('drawer'));
    $('drawer-close').onclick = close;
    document.querySelectorAll('.sbtn').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.panel;
      if (p === 'queen') { const s = AE.UI.selected; if (s && s.kind === 'queen') AE.UI.closeInspector(); else { AE.UI.inspect({ kind: 'queen' }); AE.Main.centerQueen(); } return; }
      open(p);
    }));
  }
  return { init, open, close, refresh, action, get cur() { return cur; } };
})();
