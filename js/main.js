/* ANT EMPIRE - arranque, bucle principal, cámara, entrada y modo de construcción */
'use strict';

AE.Main = (function () {
  const U = AE.U, C = AE.C, W = AE.W;
  let cv, ctx, dpr = 1, vw = 0, vh = 0;
  const cam = { x: C.EX, y: 300, z: 1, cx: 0, cy: 0, vx0: 0, vx1: 0, vy0: 0, vy1: 0, mode: 'follow', userZoom: 1, offX: 0, offY: 0, peekT: 0, px: 0, py: 0 };
  const keys = {};
  let placing = null, ghost = null, mouse = { x: 0, y: 0, wx: 0, wy: 0, down: false, dragging: false, sx: 0, sy: 0 };
  let last = performance.now(), time = 0;
  let eHeld = false;

  /* ---------- Cámara ---------- */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = Math.floor(window.innerWidth * dpr); vh = Math.floor(window.innerHeight * dpr);
    cv.width = vw; cv.height = vh;
    cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
  }
  function overviewTarget() {
    const b = W.bounds(true);
    const w = b.x1 - b.x0, h = b.y1 - b.y0 + 200;
    const z = Math.min(vw / w, vh / h) * 0.86 / dpr;
    return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 - 60, z: U.clamp(z, 0.03, 1.1) };
  }
  function updateCam(dt) {
    const q = AE.G.queen;
    let tx, ty, tz, k = 5;
    if (cam.peekT > 0) { cam.peekT -= dt; tx = cam.px; ty = cam.py; tz = Math.min(cam.userZoom, 0.8); k = 2.5; }
    else if (cam.mode === 'overview') { const o = overviewTarget(); tx = o.x; ty = o.y; tz = o.z; k = 2.2; }
    else { tx = q.x + cam.offX; ty = q.y + cam.offY - 20; tz = cam.userZoom; if (AE.Intro.isActive()) tz = 1.05; }
    const f = 1 - Math.exp(-k * dt);
    cam.x += (tx - cam.x) * f; cam.y += (ty - cam.y) * f;
    const lz = Math.log(cam.z / dpr), ltz = Math.log(tz);
    cam.z = Math.exp(lz + (ltz - lz) * (1 - Math.exp(-(k * 0.8) * dt))) * dpr;
    cam.cx = vw / 2; cam.cy = vh / 2;
    cam.vx0 = cam.x - cam.cx / cam.z; cam.vx1 = cam.x + cam.cx / cam.z;
    cam.vy0 = cam.y - cam.cy / cam.z; cam.vy1 = cam.y + cam.cy / cam.z;
  }
  function snapCam() {
    const q = AE.G.queen; cam.x = q.x; cam.y = q.y - 20; cam.z = cam.userZoom * dpr; cam.mode = 'follow'; cam.offX = cam.offY = 0;
  }
  function toWorld(sx, sy) { return { x: (sx * dpr - cam.cx) / cam.z + cam.x, y: (sy * dpr - cam.cy) / cam.z + cam.y }; }
  function toggleOverview() {
    if (cam.mode === 'overview') centerQueen();
    else { cam.mode = 'overview'; document.body.classList.add('overview'); AE.UI.toast('🔭 Vista general del imperio'); }
  }
  function centerQueen() { cam.mode = 'follow'; cam.offX = cam.offY = 0; cam.peekT = 0; document.body.classList.remove('overview'); }
  function peekAt(x, y, dur) { cam.px = x; cam.py = y; cam.peekT = dur || 3.5; }

  /* ---------- Construcción ---------- */
  function startPlacing(type) {
    placing = type; ghost = null;
    AE.Panels.close();
    cam.userZoom = Math.min(cam.userZoom, 0.7);
    centerQueen();
    document.body.classList.add('placing');
    document.getElementById('place-name').textContent = AE.CHAMBERS[type].name;
    document.getElementById('place-cost').innerHTML = AE.UI.costHtml(AE.Eco.buildCost(type));
  }
  function stopPlacing() {
    placing = null; ghost = null; cam.offX = cam.offY = 0;
    document.body.classList.remove('placing');
  }
  function confirmPlace() {
    if (!placing) return;
    ghost = W.validate(placing, mouse.wx, mouse.wy);
    if (!ghost.ok) { AE.UI.toast(ghost.reason, 'warn'); return; }
    const c = AE.Eco.startDig(placing, ghost);
    if (c) stopPlacing();
  }
  function cancelJob(id) {
    const g = AE.G;
    const c = W.ch(id);
    if (!c || c.done || c.type === 'royal') return;
    AE.UI.confirmBox('¿Cancelar la excavación de <b>' + AE.CHAMBERS[c.type].name + '</b>?<br>Recuperarás el 50% del coste.', () => {
      if (c.cost) AE.Eco.gain(c.cost, 0.5);
      g.chambers = g.chambers.filter(x => x !== c);
      g.tunnels = g.tunnels.filter(t => t.id !== c.tun);
      W.rebuild();
      AE.UI.closeInspector();
      AE.Q.ensureValid();
      AE.Save.soon();
    });
  }

  /* ---------- Entrada ---------- */
  const MOVE = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', Space: 'space' };
  function onKey(e, down) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (MOVE[e.code]) { keys[MOVE[e.code]] = down; e.preventDefault(); }
    if (e.code === 'KeyE') { if (down && !e.repeat) interact(); eHeld = down; }
    if (!down || e.repeat) return;
    if (AE.Intro.isActive()) { if (e.code === 'Escape' || e.code === 'Enter') AE.Intro.finish(); return; }
    switch (e.code) {
      case 'KeyQ': AE.UI.doAction('lay'); break;
      case 'KeyM': AE.UI.toggleMinimap(); break;
      case 'KeyV': toggleOverview(); break;
      case 'KeyC': centerQueen(); break;
      case 'KeyR': AE.UI.inspect({ kind: 'queen' }); break;
      case 'Digit1': AE.Panels.open('dig'); break;
      case 'Digit2': AE.Panels.open('workers'); break;
      case 'Digit3': AE.Panels.open('upgrades'); break;
      case 'Digit4': AE.Panels.open('goals'); break;
      case 'Escape':
        if (placing) stopPlacing();
        else if (AE.UI.anyModal()) { const m = AE.UI.anyModal(); if (m.id !== 'confirm') AE.UI.closeModal(m.id); }
        else if (AE.UI.selected) AE.UI.closeInspector();
        else if (AE.Panels.cur) AE.Panels.close();
        else if (cam.mode === 'overview') centerQueen();
        break;
    }
  }
  function interact() {
    if (AE.Intro.isActive() || placing) return;
    const it = AE.Q.interactable();
    if (!it) return;
    if (it.kind === 'dig') { AE.Q.dig(); AE.UI.inspect({ kind: 'chamber', c: it.c }); }
    else if (it.kind === 'ant') AE.UI.inspect({ kind: 'ant', agent: it.a });
    else if (it.kind === 'chamber') AE.UI.inspect({ kind: 'chamber', c: it.c });
  }
  function bindInput() {
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; eHeld = false; });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); if (placing) stopPlacing(); });
    cv.addEventListener('pointerdown', e => {
      mouse.down = true; mouse.dragging = false; mouse.sx = e.clientX; mouse.sy = e.clientY;
      mouse.ox = cam.offX; mouse.oy = cam.offY;
    });
    window.addEventListener('pointermove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (mouse.down && placing) {
        const dx = e.clientX - mouse.sx, dy = e.clientY - mouse.sy;
        if (Math.hypot(dx, dy) > 6) mouse.dragging = true;
        if (mouse.dragging) { cam.offX = mouse.ox - dx * dpr / cam.z; cam.offY = mouse.oy - dy * dpr / cam.z; }
      }
    });
    window.addEventListener('pointerup', e => {
      if (!mouse.down) return;
      mouse.down = false;
      if (e.target !== cv || mouse.dragging || e.button !== 0) return;
      const w = toWorld(e.clientX, e.clientY);
      if (placing) { mouse.wx = w.x; mouse.wy = w.y; confirmPlace(); return; }
      if (AE.Intro.isActive()) return;
      const a = AE.Agents.pick(w.x, w.y, 16 + 8 / (cam.z / dpr));
      const qd = U.dist(w.x, w.y, AE.G.queen.x, AE.G.queen.y);
      if (a && U.dist(w.x, w.y, a.x, a.y) < qd * 0.8) AE.UI.inspect({ kind: 'ant', agent: a });
      else if (AE.Q.hit(w.x, w.y)) AE.UI.inspect({ kind: 'queen' });
      else if (a) AE.UI.inspect({ kind: 'ant', agent: a });
      else { const c = W.chamberAt(w.x, w.y) || AE.G.chambers.find(c => !c.done && ((w.x - c.x) / c.rx) ** 2 + ((w.y - c.y) / c.ry) ** 2 < 1); if (c) AE.UI.inspect({ kind: 'chamber', c }); else AE.UI.closeInspector(); }
    });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      if (cam.mode === 'overview') return;
      cam.userZoom = U.clamp(cam.userZoom * Math.pow(0.9, e.deltaY / 100), 0.3, 1.8);
    }, { passive: false });
    window.addEventListener('resize', resize);
  }

  /* ---------- Bucle ---------- */
  function frame(now) {
    let raw = (now - last) / 1000; last = now;
    if (raw > 5 && AE.G.introDone) {
      const r = AE.Eco.simulateOffline(raw);
      if (r && raw > 60) AE.UI.welcome(r);
      raw = 0;
    }
    const dt = Math.min(0.05, Math.max(0, raw));
    time += dt;
    try { update(dt); render(); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }
  function update(dt) {
    if (AE.Intro.isActive()) AE.Intro.update(dt);
    else {
      AE.Eco.tick(dt, false);
      if (eHeld) AE.Q.dig();
      AE.Q.update(dt, keys);
    }
    AE.Agents.update(dt);
    AE.FX.update(dt);
    updateCam(dt);
    if (placing) {
      const w = toWorld(mouse.x, mouse.y);
      if (!ghost || Math.abs(w.x - mouse.wx) + Math.abs(w.y - mouse.wy) > 3) {
        mouse.wx = w.x; mouse.wy = w.y;
        ghost = W.validate(placing, w.x, w.y);
        const pr = document.getElementById('place-reason');
        pr.textContent = ghost.ok ? '✔ Ubicación válida' : '✖ ' + ghost.reason;
        pr.className = ghost.ok ? 'ok' : 'bad';
      }
    }
    AE.UI.updateHUD(dt);
  }
  function worldT() { ctx.setTransform(cam.z, 0, 0, cam.z, cam.cx - cam.x * cam.z, cam.cy - cam.y * cam.z); }
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2a170a'; ctx.fillRect(0, 0, vw, vh);
    AE.R.drawSky(ctx, cam, vw, vh);
    worldT();
    AE.R.drawGround(ctx, cam);
    AE.R.drawStonesRoots(ctx, cam);
    AE.R.drawGrass(ctx, cam, false);
    AE.R.drawCaves(ctx, cam);
    AE.D.draw(ctx, cam, time);
    AE.R.drawPlanned(ctx, cam, time);
    AE.Intro.draw(ctx);
    AE.R.drawEnemy(ctx, time);
    AE.Agents.draw(ctx, cam, time);
    AE.Q.draw(ctx, cam, time);
    worldT();
    AE.R.drawGrass(ctx, cam, true);
    AE.FX.draw(ctx, cam);
    if (placing) AE.R.drawGhost(ctx, ghost, placing, time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    AE.R.drawOverlays(ctx, cam, vw, vh);
  }

  /* ---------- Partidas ---------- */
  function startWith(state) {
    AE.G = state;
    W.rebuild();
    AE.Eco.computeStats();
    AE.Agents.reset();
    AE.FX.clear();
    AE.R.cells.clear();
    if (state.introDone) AE.Q.ensureValid();
    stopPlacing();
    AE.UI.closeInspector();
    AE.Panels.close();
    snapCam();
    AE.Agents.reconcile();
  }
  function newGame() {
    AE.Save.wipe();
    startWith(AE.Eco.newState());
    AE.Intro.start();
    snapCam();
  }

  function boot() {
    cv = document.getElementById('cv');
    ctx = cv.getContext('2d', { alpha: false });
    resize();
    AE.S.build();
    AE.R.init();
    AE.UI.init();
    AE.Panels.init();
    bindInput();
    const saved = AE.Save.load();
    if (saved && saved.introDone) {
      startWith(saved);
      const away = (Date.now() - (saved.savedAt || Date.now())) / 1000;
      if (away > 30) { const r = AE.Eco.simulateOffline(away); if (r) AE.UI.welcome(r); }
    } else newGame();
    AE.Save.init();
    document.getElementById('loading').remove();
    last = performance.now();
    requestAnimationFrame(frame);
  }

  return { boot, startWith, newGame, toggleOverview, centerQueen, peekAt, startPlacing, stopPlacing, cancelJob, get placing() { return placing; }, cam };
})();

AE.Cam = { peek: (x, y, d) => AE.Main.peekAt(x, y, d) };
window.addEventListener('load', () => AE.Main.boot());
