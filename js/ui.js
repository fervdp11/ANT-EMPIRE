/* ANT EMPIRE - interfaz: HUD, avisos, inspector, ventanas y minimapa */
'use strict';

AE.UI = (function () {
  const U = AE.U;
  const $ = id => document.getElementById(id);
  const ICONS = {
    leaf: '<svg viewBox="0 0 24 24"><path d="M4 20C4 9 11 4 21 3c0 10-5 17-16 17z" fill="#7cc24a" stroke="#2f5a18" stroke-width="1.6"/><path d="M5 19C9 14 13 10 18 6" stroke="#2f5a18" stroke-width="1.4" fill="none"/></svg>',
    fungus: '<svg viewBox="0 0 24 24"><path d="M3 12c0-5 4-8 9-8s9 3 9 8z" fill="#e9a26a" stroke="#6a3a1a" stroke-width="1.6"/><rect x="9" y="12" width="6" height="8" rx="2" fill="#f4ead6" stroke="#6a3a1a" stroke-width="1.6"/><circle cx="9" cy="8" r="1.3" fill="#fff"/><circle cx="14" cy="7" r="1" fill="#fff"/></svg>',
    water: '<svg viewBox="0 0 24 24"><path d="M12 3C9 8 6 11 6 15a6 6 0 0012 0c0-4-3-7-6-12z" fill="#6cc0ef" stroke="#1f5f8f" stroke-width="1.6"/><ellipse cx="9.5" cy="15" rx="1.4" ry="2.2" fill="#e8f7ff"/></svg>',
    soil: '<svg viewBox="0 0 24 24"><path d="M3 18c1-6 5-10 9-10s8 4 9 10z" fill="#8a5a32" stroke="#3b2312" stroke-width="1.6"/><circle cx="9" cy="14" r="1.4" fill="#5c3a1c"/><circle cx="14" cy="12" r="1.2" fill="#5c3a1c"/><circle cx="16" cy="16" r="1" fill="#5c3a1c"/></svg>',
    ant: '<svg viewBox="0 0 24 24"><ellipse cx="6" cy="13" rx="4" ry="3" fill="#b0451e" stroke="#3b1408" stroke-width="1.3"/><ellipse cx="12" cy="12" rx="2.6" ry="2" fill="#b0451e" stroke="#3b1408" stroke-width="1.3"/><circle cx="17.5" cy="11" r="2.6" fill="#b0451e" stroke="#3b1408" stroke-width="1.3"/><path d="M18 8.5l2-4M11 14l-2 5M13 14l1 5M12 14l-5 4" stroke="#3b1408" stroke-width="1.3" fill="none"/></svg>',
    egg: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="6" ry="8" fill="#fbf6e8" stroke="#8a7a5a" stroke-width="1.6"/><ellipse cx="10" cy="10" rx="1.6" ry="2.6" fill="#fff"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 18l-1-11 5 4 5-7 5 7 5-4-1 11z" fill="#f6c84a" stroke="#7a4a08" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="14" r="1.8" fill="#d23c2c"/></svg>',
    pick: '<svg viewBox="0 0 24 24"><path d="M5 20L15 10" stroke="#8a5a32" stroke-width="3" stroke-linecap="round"/><path d="M8 6c4-3 9-2 12 2-4-1-7-1-9 1z" fill="#c8ccd2" stroke="#4a4a50" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#e8d6a8" stroke="#6a4a1a" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="#6a4a1a" stroke-width="1.2"/><circle cx="12" cy="11" r="1.6" fill="#d23c2c"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="#f4e8d0" stroke="#5a3a1a" stroke-width="1.5"/><circle cx="12" cy="12" r="3.5" fill="#6a3a1a"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f4e8d0" stroke="#7a2a1a" stroke-width="1.6"/><circle cx="12" cy="12" r="5" fill="#e06040" stroke="#7a2a1a" stroke-width="1.4"/><circle cx="12" cy="12" r="1.8" fill="#fff"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="#c05a3a" stroke="#4a1a0a" stroke-width="1.6"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 12l9-8 9 8M6 10v10h12V10" fill="#f0c890" stroke="#5a3a1a" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 3l7 8h-4v9H9v-9H5z" fill="#9ad15a" stroke="#2f5a18" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm8.6 4.9l1.9 1.5-2 3.4-2.3-.9c-.6.5-1.2.8-1.9 1.1L16 21h-4l-.4-2.5c-.7-.3-1.3-.6-1.9-1.1l-2.3.9-2-3.4 1.9-1.5a7 7 0 010-2.2L5.4 9.6l2-3.4 2.3.9c.6-.5 1.2-.8 1.9-1.1L12 3h4l.4 2.5c.7.3 1.3.6 1.9 1.1l2.3-.9 2 3.4-1.9 1.5c.1.7.1 1.5 0 2.2z" transform="translate(-2 0)" fill="#f4e8d0"/></svg>'
  };
  function icon(n) { return '<span class="ico">' + (ICONS[n] || '') + '</span>'; }
  const antImg = {};
  function antIcon(spr) {
    if (!antImg[spr]) antImg[spr] = AE.S.icon(spr, 44).toDataURL();
    return '<img class="anticon" src="' + antImg[spr] + '" alt="">';
  }

  function costHtml(cost) {
    const r = AE.G.res, cap = AE.Eco.stats().cap;
    return Object.keys(cost).map(k => {
      const cls = cost[k] > cap ? 'cap' : (r[k] < cost[k] ? 'lack' : '');
      return '<span class="cost ' + cls + '">' + icon(k) + U.fmt(cost[k]) + '</span>';
    }).join('');
  }

  /* ---------- HUD ---------- */
  let hudT = 0, savedT = 0;
  function updateHUD(dt) {
    hudT -= dt; savedT -= dt;
    if (hudT > 0) return;
    hudT = 0.25;
    const g = AE.G, st = AE.Eco.stats(), net = AE.Eco.net;
    for (const r of AE.RES) {
      const v = g.res[r.k];
      $('rv-' + r.k).textContent = U.fmt(v);
      const n = net[r.k] * 60;
      const re = $('rr-' + r.k);
      re.textContent = (n >= 0 ? '+' : '') + U.fmt(n) + '/min';
      re.className = 'rate ' + (n > 0.05 ? 'pos' : n < -0.05 ? 'neg' : '');
      $('rc-' + r.k).style.width = Math.min(100, v / st.cap * 100) + '%';
    }
    $('rv-cap').textContent = U.fmt(st.cap);
    $('rv-pop').textContent = U.fmt(AE.Eco.adults()) + '/' + U.fmt(st.popCap);
    $('rv-brood').textContent = U.fmt(AE.Eco.broodCount()) + '/' + U.fmt(st.broodCap);
    const ss = AE.Eco.season(), ph = AE.Eco.dayPhase();
    const hh = Math.floor((ph * 24 + 6) % 24), mm = Math.floor(((ph * 24 + 6) % 1) * 60);
    $('clock').innerHTML = '<span class="sicon">' + (AE.Eco.isNight() ? '🌙' : ss.icon) + '</span><b>Día ' + AE.Eco.dayNum() + '</b> · <span style="color:' + ss.color + '">' + ss.name + '</span> · ' + String(hh).padStart(2, '0') + ':' + String(mm - mm % 10).padStart(2, '0');
    const idle = g.ants.idle;
    const b = $('badge-workers'); b.textContent = idle; b.style.display = idle > 0 ? 'flex' : 'none';
    // objetivo
    const o = AE.Eco.objective(g.obj);
    const v = Math.max(0, Math.min(o.n, o.v(g)));
    $('obj-text').textContent = o.t;
    $('obj-prog').textContent = U.fmt(v) + ' / ' + U.fmt(o.n);
    $('obj-bar').style.width = (v / o.n * 100) + '%';
    // amenaza
    const th = g.threat.active;
    const te = $('threat');
    if (th) { te.style.display = 'block'; te.innerHTML = '⚔️ ' + th.name + ' ataca · fuerza <b>' + th.power + '</b> vs defensa <b>' + Math.round(st.defense) + '</b> · ' + Math.ceil(th.t) + 's'; }
    else te.style.display = 'none';
    // indicador de interacción
    const it = AE.Intro.isActive() ? null : AE.Q.interactable();
    const pr = $('prompt');
    if (it && !AE.Main.placing) { pr.textContent = it.label; pr.classList.add('vis'); } else pr.classList.remove('vis');
    updateInspector();
    if (AE.Panels) AE.Panels.refresh();
    if (mmOpen) drawMinimap();
  }
  function savedFlash() { const e = $('saved'); e.classList.add('vis'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('vis'), 1400); }

  /* ---------- Avisos ---------- */
  const recent = new Map();
  function toast(msg, kind) {
    const now = performance.now();
    if (recent.has(msg) && now - recent.get(msg) < 3500) return;
    recent.set(msg, now);
    const box = $('toasts');
    const e = U.el('div', 'toast ' + (kind || ''), msg);
    box.appendChild(e);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    requestAnimationFrame(() => e.classList.add('vis'));
    setTimeout(() => { e.classList.remove('vis'); setTimeout(() => e.remove(), 400); }, kind === 'gold' ? 6000 : 4300);
  }

  /* ---------- Inspector (tarjeta derecha) ---------- */
  let selected = null; // {kind:'queen'|'ant'|'chamber', agent, c}
  let lastInsp = '';
  function inspect(sel) { selected = sel; lastInsp = ''; $('inspector').classList.add('vis'); updateInspector(); }
  function closeInspector() { selected = null; $('inspector').classList.remove('vis'); }
  function bar(label, ic, v, max, col, txt) {
    return '<div class="stat">' + icon(ic) + '<span class="sl">' + label + '</span><div class="bar"><i style="width:' + U.clamp(v / max * 100, 0, 100) + '%;background:' + col + '"></i></div><span class="sv">' + (txt || Math.round(v) + '/' + Math.round(max)) + '</span></div>';
  }
  function btn(act, label, enabled, extra) { return '<button class="btn" data-act="' + act + '"' + (enabled === false ? ' disabled' : '') + (extra || '') + '>' + label + '</button>'; }

  function queenHtml() {
    const g = AE.G, q = g.queen, st = AE.Eco.stats(), Q = AE.Q;
    const ch = Q.chamber();
    const where = ch ? (ch.done ? 'En: ' + AE.CHAMBERS[ch.type].name : 'En una cámara en obras') : (q.y < AE.W.groundY(AE.C.EX) + 80 ? 'En la entrada del nido' : 'Recorriendo los túneles');
    const eggRate = Math.min(st.reserveRegen / 8, 99) * 60 + st.autoLay * 60;
    const canEat = ch && ch.done && (ch.type === 'royal' || ch.type === 'storage');
    const canDrink = ch && ch.done && (ch.type === 'royal' || ch.type === 'storage' || ch.type === 'cistern');
    let mood = 'Sana y fértil';
    if (q.health < 30) mood = '⚠️ Débil: necesita comida y agua';
    else if (q.hunger < 25) mood = '⚠️ Hambrienta';
    else if (q.hydration < 25) mood = '⚠️ Sedienta';
    else if (q.energy < 15) mood = '😴 Agotada: descansa en la Cámara Real';
    return '<div class="ihead"><div class="iport queen">' + antIcon('queen') + '</div><div><h3>Reina</h3><p>El corazón de la colonia. Pone huevos y mantiene unido el imperio.</p></div></div>' +
      '<div class="istate">' + where + ' · ' + mood + '</div>' +
      bar('Salud', 'shield', q.health, 100, '#5fc35a') +
      bar('Saciedad', 'fungus', q.hunger, 100, '#e9a24a') +
      bar('Hidratación', 'water', q.hydration, 100, '#5ab4e6') +
      bar('Energía', 'up', q.energy, 100, '#d8d05a') +
      bar('Reservas', 'egg', q.reserve, st.reserveMax, '#f0d8a0') +
      '<div class="stat">' + icon('egg') + '<span class="sl">Puesta</span><span class="sv wide">' + eggRate.toFixed(1) + ' huevos/min máx.</span></div>' +
      '<div class="iact">' + btn('lay', '🥚 Poner huevo (Q)', Q.canLay()) + btn('eat', '🍄 Comer', !!canEat) + btn('drink', '💧 Beber', !!canDrink) + '</div>' +
      (Q.canLay() ? '' : '<div class="hint">Para poner huevos, ve a la Cámara Real o a una Guardería.</div>') +
      '<div class="hint">Las nodrizas la alimentan cuando está en la Cámara Real, donde también recupera energía.</div>';
  }
  function antHtml(a) {
    const g = AE.G, R = AE.ROLES[a.role], st = AE.Eco.stats();
    const total = g.ants[a.role];
    const rep = Math.max(1, Math.round(total / Math.max(1, AE.Agents.list.filter(x => x.role === a.role).length)));
    const stateTxt = { move: 'En movimiento', dig: 'Trabajando', tend: 'Cuidando', groom: 'Acicalándose', rest: 'Descansando', idle: 'Parada', fight: 'Combatiendo', guard: 'Vigilando' }[a.state] || 'Activa';
    const carry = { leaf: 'Un trozo de hoja', soil: 'Una bolita de tierra', food: 'Alimento' }[a.carry] || 'Nada';
    const age = Math.max(0, g.time - a.born);
    let acts = '';
    if (a.role === 'idle') {
      acts = '<div class="iact">' + AE.WORK_ROLES.filter(r => AE.Eco.roleAvailable(r)).map(r => btn('assign1:' + r, AE.ROLES[r].name)).join('') + '</div>';
    } else if (AE.WORK_ROLES.indexOf(a.role) >= 0) acts = '<div class="iact">' + btn('unassign1:' + a.role, 'Liberar de su tarea') + '</div>';
    return '<div class="ihead"><div class="iport">' + antIcon(R.spr) + '</div><div><h3>' + R.name + '</h3><p>' + R.fn + '</p></div></div>' +
      '<div class="istate"><b>' + stateTxt + '</b> · ' + a.task + '</div>' +
      '<div class="kv"><span>Carga</span><b>' + carry + '</b></div>' +
      '<div class="kv"><span>Velocidad</span><b>' + Math.round(R.speed * a.speedK * st.speedMult) + ' px/s</b></div>' +
      '<div class="kv"><span>Edad</span><b>' + U.fmtTime(age) + '</b></div>' +
      '<div class="kv"><span>' + R.plural + ' en la colonia</span><b>' + U.fmt(total) + '</b></div>' +
      (rep > 1 ? '<div class="kv"><span>Representa</span><b>~' + U.fmt(rep) + ' hormigas</b></div>' : '') +
      (a.role === 'soldier' ? '<div class="kv"><span>Fuerza</span><b>' + st.soldierPow.toFixed(1) + '</b></div>' : '') + acts;
  }
  function chamberHtml(c) {
    const T = AE.CHAMBERS[c.type], g = AE.G, st = AE.Eco.stats();
    if (!c.done) {
      return '<div class="ihead"><div class="iport swatch" style="background:' + T.color + '">' + icon('pick') + '</div><div><h3>' + T.name + ' (en obras)</h3><p>' + T.desc + '</p></div></div>' +
        '<div class="stat">' + icon('pick') + '<span class="sl">Progreso</span><div class="bar"><i style="width:' + (c.work / c.total * 100) + '%;background:#f2b84b"></i></div><span class="sv">' + Math.floor(c.work / c.total * 100) + '%</span></div>' +
        '<div class="hint">Excavadoras trabajando: ' + g.ants.digger + '. La reina también puede excavar manteniendo E junto a la obra.</div>' +
        '<div class="iact">' + btn('cancel:' + c.id, 'Cancelar obra (recupera 50%)') + '</div>';
    }
    const up = AE.Eco.chamberUpCost(c);
    let extra = '';
    const here = AE.Q.chamber() === c;
    if (c.type === 'royal' || c.type === 'nursery') {
      extra += '<div class="kv"><span>Huevos · Larvas · Pupas</span><b>' + AE.Eco.broodCount(0) + ' · ' + AE.Eco.broodCount(1) + ' · ' + (AE.Eco.broodCount(2) + AE.Eco.broodCount(3)) + '</b></div>';
      extra += '<div class="iact">' + btn('lay', '🥚 Poner huevo (Q)', here) + (c.type === 'royal' ? btn('eat', '🍄 Comer', here) + btn('drink', '💧 Beber', here) : '') + '</div>';
      if (!here) extra += '<div class="hint">La reina debe estar en esta cámara para usar estas acciones.</div>';
    }
    if (c.type === 'storage') extra += '<div class="kv"><span>Capacidad por recurso</span><b>' + U.fmt(st.cap) + '</b></div><div class="iact">' + btn('eat', '🍄 Comer', here) + btn('drink', '💧 Beber', here) + '</div>';
    if (c.type === 'cistern') extra += '<div class="iact">' + btn('drink', '💧 Beber', here) + '</div>';
    if (c.type === 'dorm') extra += '<div class="kv"><span>Población</span><b>' + AE.Eco.adults() + ' / ' + st.popCap + '</b></div>';
    if (c.type === 'barracks') extra += '<div class="kv"><span>Soldados</span><b>' + g.ants.soldier + ' / ' + st.soldierCap + '</b></div><div class="kv"><span>Defensa total</span><b>' + Math.round(st.defense) + '</b></div><div class="iact">' + btn('assign1:soldier', 'Entrenar soldado ' + costHtml(AE.Eco.soldierCost()), g.ants.idle > 0) + '</div>';
    if (c.type === 'scout') { const t = g.territory; extra += '<div class="kv"><span>Territorio</span><b>Nivel ' + t.lvl + '</b></div>' + bar('Exploración', 'map', t.xp, 60 * Math.pow(1.9, t.lvl - 1), '#c8b84a', Math.floor(t.xp / (60 * Math.pow(1.9, t.lvl - 1)) * 100) + '%') + '<div class="hint">Cada nivel de territorio da +10% de hojas y un hallazgo.</div>'; }
    if (c.type === 'fungus') extra += '<div class="kv"><span>Producción total</span><b>' + U.fmt(st.fungusConv * 0.9 * 60) + ' hongos/min</b></div>';
    if (c.type === 'nuptial') {
      const fs = AE.Eco.flightStatus();
      extra += '<div class="kv"><span>Machos · Princesas</span><b>' + g.ants.male + ' · ' + g.ants.princess + '</b></div><div class="kv"><span>Alados (incl. cría) / capacidad</span><b>' + AE.Eco.wingedCount() + ' / ' + st.wingCap + '</b></div>' +
        '<div class="kv"><span>Colonias filiales</span><b>' + g.colonies + ' (+' + g.colonies * 25 + '% producción)</b></div>' +
        '<div class="iact">' + btn('breed:m', 'Criar macho ' + costHtml(AE.Eco.breedCost('m'))) + btn('breed:p', 'Criar princesa ' + costHtml(AE.Eco.breedCost('p'))) + '</div>' +
        '<div class="iact">' + btn('flight', '🦋 ¡Vuelo nupcial!', fs.ok) + '</div>' + (fs.ok ? '' : '<div class="hint">' + fs.why + '</div>');
    }
    return '<div class="ihead"><div class="iport swatch" style="background:' + T.color + '">' + icon(c.type === 'royal' ? 'crown' : 'home') + '</div><div><h3>' + T.name + ' <small>Nv. ' + c.level + '</small></h3><p>' + T.desc + '</p></div></div>' +
      '<div class="kv"><span>Actual</span><b>' + T.effect(c.level) + '</b></div>' +
      '<div class="kv next"><span>Siguiente nivel</span><b>' + T.effect(c.level + 1) + '</b></div>' +
      '<div class="iact">' + btn('upch:' + c.id, '⬆ Mejorar ' + costHtml(up), AE.Eco.canAfford(up)) + '</div>' +
      (AE.Eco.overCap(up) ? '<div class="hint warn">El coste supera la capacidad de almacenamiento: mejora un Almacén.</div>' : '') + extra;
  }
  function updateInspector() {
    if (!selected) return;
    let html = '';
    if (selected.kind === 'queen') html = queenHtml();
    else if (selected.kind === 'ant') { if (AE.Agents.list.indexOf(selected.agent) < 0) { closeInspector(); return; } html = antHtml(selected.agent); }
    else if (selected.kind === 'chamber') { if (AE.G.chambers.indexOf(selected.c) < 0) { closeInspector(); return; } html = chamberHtml(selected.c); }
    if (html !== lastInsp) { $('insp-body').innerHTML = html; lastInsp = html; }
  }

  /* ---------- Acciones de botones (pointerdown: inmune a los refrescos) ---------- */
  function doAction(act) {
    const ci = act.indexOf(':');
    const a = ci < 0 ? act : act.slice(0, ci), b = ci < 0 ? '' : act.slice(ci + 1);
    const E = AE.Eco;
    switch (a) {
      case 'lay': if (AE.Q.canLay()) E.layEgg('w'); else toast('Ve a la Cámara Real o a una Guardería para poner huevos.', 'warn'); break;
      case 'eat': { const c = AE.Q.chamber(); if (c && c.done && (c.type === 'royal' || c.type === 'storage')) E.eat(); else toast('La reina debe estar en la Cámara Real o en un Almacén.', 'warn'); break; }
      case 'drink': { const c = AE.Q.chamber(); if (c && c.done && ['royal', 'storage', 'cistern'].indexOf(c.type) >= 0) E.drink(); else toast('La reina debe estar en la Cámara Real, un Almacén o una Cisterna.', 'warn'); break; }
      case 'assign1': E.assign(b, 1); break;
      case 'unassign1': E.unassign(b, 1); break;
      case 'upch': { const c = AE.W.ch(+b); if (c) E.upgradeChamber(c); break; }
      case 'cancel': AE.Main.cancelJob(+b); break;
      case 'breed': E.breed(b); break;
      case 'flight': E.nuptialFlight(); break;
      default: if (AE.Panels) AE.Panels.action(a, b);
    }
    lastInsp = ''; hudT = 0;
    updateHUD(0);
  }
  function bindActions(root) {
    root.addEventListener('pointerdown', e => {
      const t = e.target.closest('[data-act]');
      if (!t || t.disabled || e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      t.classList.add('pressed'); setTimeout(() => t.classList.remove('pressed'), 120);
      doAction(t.getAttribute('data-act'));
    });
  }

  /* ---------- Ventanas modales ---------- */
  function openModal(id) { $(id).classList.add('vis'); }
  function closeModal(id) { $(id).classList.remove('vis'); if (id === 'minimap') mmOpen = false; }
  function anyModal() { return document.querySelector('.modal.vis'); }
  function confirmBox(text, onYes) {
    $('confirm-text').innerHTML = text;
    openModal('confirm');
    $('confirm-yes').onclick = () => { closeModal('confirm'); onYes(); };
    $('confirm-no').onclick = () => closeModal('confirm');
  }
  function showHelp(first) {
    $('help-first').style.display = first ? 'block' : 'none';
    openModal('help');
  }
  function welcome(r) {
    const parts = [];
    for (const k of ['leaf', 'fungus', 'water', 'soil']) if (Math.abs(r[k]) >= 1) parts.push('<div class="wrow">' + icon(k) + '<b>' + (r[k] >= 0 ? '+' : '') + U.fmt(r[k]) + '</b> ' + AE.RES.find(x => x.k === k).name.toLowerCase() + '</div>');
    if (r.adults > 0) parts.push('<div class="wrow">' + icon('ant') + '<b>+' + U.fmt(r.adults) + '</b> hormigas nacidas</div>');
    if (r.terr > 0) parts.push('<div class="wrow">' + icon('map') + '<b>+' + r.terr + '</b> niveles de territorio</div>');
    $('welcome-body').innerHTML = '<p>Has estado fuera <b>' + U.fmtTime(r.sec) + '</b>. Tu colonia ha seguido trabajando:</p>' + (parts.join('') || '<p>Sin cambios destacables.</p>');
    openModal('welcome');
  }
  function menuRefresh() {
    const g = AE.G;
    $('menu-info').innerHTML = 'Tiempo de juego: <b>' + U.fmtTime(g.stats.playTime) + '</b><br>Último guardado: <b>' + (AE.Save.lastSave ? new Date(AE.Save.lastSave).toLocaleTimeString() : '—') + '</b>';
    document.querySelectorAll('#quality button').forEach(b => b.classList.toggle('on', b.dataset.q === g.quality));
  }

  /* ---------- Minimapa ---------- */
  let mmOpen = false;
  function toggleMinimap() { mmOpen = !mmOpen; if (mmOpen) { openModal('minimap'); drawMinimap(); } else closeModal('minimap'); }
  function drawMinimap() {
    const cv = $('mm-canvas'), ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#3a2414'; ctx.fillRect(0, 0, W, H);
    const b = AE.W.bounds(true);
    const pad = 30;
    const k = Math.min((W - pad * 2) / (b.x1 - b.x0), (H - pad * 2) / (b.y1 - b.y0));
    const ox = W / 2 - (b.x0 + b.x1) / 2 * k, oy = H / 2 - (b.y0 + b.y1) / 2 * k;
    const X = x => x * k + ox, Y = y => y * k + oy;
    // cielo
    ctx.fillStyle = '#4a7a9a'; ctx.fillRect(0, 0, W, Math.max(0, Y(0)));
    ctx.fillStyle = '#5c9a3a'; ctx.fillRect(0, Y(0) - 3, W, 4);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const g = AE.G;
    for (const pass of [0, 1]) {
      for (const t of g.tunnels) {
        ctx.beginPath(); t.pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
        ctx.setLineDash(t.prog < 1 && pass ? [4, 4] : []);
        ctx.lineWidth = Math.max(3, AE.C.TUN_R * 2 * k) + (pass ? 0 : 3);
        ctx.strokeStyle = pass ? (t.prog < 1 ? 'rgba(240,200,150,0.5)' : '#d9a56a') : '#1e1006';
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const c of g.chambers) {
      const T = AE.CHAMBERS[c.type];
      ctx.beginPath(); ctx.ellipse(X(c.x), Y(c.y), Math.max(5, c.rx * k), Math.max(4, c.ry * k), 0, 0, U.TAU);
      ctx.fillStyle = c.done ? T.color : 'rgba(240,200,150,0.25)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#1e1006'; if (!c.done) ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      if (k > 0.12) { ctx.fillStyle = '#fff4e0'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3; const lbl = T.name + (c.done ? '' : ' ⛏'); ctx.strokeText(lbl, X(c.x), Y(c.y) + 4); ctx.fillText(lbl, X(c.x), Y(c.y) + 4); }
    }
    // reina
    const q = g.queen, pulse = 5 + Math.sin(performance.now() / 200) * 2;
    ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), pulse + 4, 0, U.TAU); ctx.fillStyle = 'rgba(255,215,90,0.35)'; ctx.fill();
    ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 5, 0, U.TAU); ctx.fillStyle = '#ffd34a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#5a2a00'; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.fillText('♛ Reina', X(q.x), Y(q.y) - 12);
    // entrada
    ctx.fillStyle = '#fff'; ctx.fillText('Entrada', X(AE.C.EX), Math.max(14, Y(0) - 8));
  }

  function init() {
    bindActions($('inspector'));
    $('insp-close').onclick = closeInspector;
    document.querySelectorAll('.modal .mclose, .modal [data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.closest('.modal').id)));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('pointerdown', e => { if (e.target === m && m.id !== 'confirm') closeModal(m.id); }));
    $('btn-gear').onclick = () => { menuRefresh(); openModal('menu'); };
    $('m-save').onclick = () => { AE.Save.save(true); menuRefresh(); };
    $('m-export').onclick = () => AE.Save.exportFile();
    $('m-import').onclick = () => $('importFile').click();
    $('importFile').onchange = e => { const f = e.target.files[0]; if (f) confirmBox('¿Importar esta partida? <br>Se sustituirá la partida actual.', () => AE.Save.importFile(f)); e.target.value = ''; };
    $('m-help').onclick = () => { closeModal('menu'); showHelp(false); };
    $('m-new').onclick = () => confirmBox('¿Empezar una <b>nueva partida</b>?<br>Se perderá todo el progreso actual (exporta antes una copia si quieres conservarla).', () => { closeModal('menu'); AE.Main.newGame(); });
    document.querySelectorAll('#quality button').forEach(b => b.onclick = () => { AE.G.quality = b.dataset.q; menuRefresh(); AE.Agents.reconcile(); AE.Save.soon(); });
    $('btn-minimap').onclick = toggleMinimap;
    $('btn-overview').onclick = () => AE.Main.toggleOverview();
    $('btn-center').onclick = () => AE.Main.centerQueen();
    $('obj-box').onclick = () => AE.Panels.open('goals');
  }

  return { init, toast, updateHUD, inspect, closeInspector, get selected() { return selected; }, icon, antIcon, costHtml, btn, bindActions, doAction, openModal, closeModal, anyModal, confirmBox, showHelp, welcome, toggleMinimap, savedFlash, get mmOpen() { return mmOpen; } };
})();
