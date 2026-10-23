/* ANT EMPIRE - guardado automático/manual, exportación e importación */
'use strict';

AE.Save = (function () {
  const C = AE.C;
  let soonT = null, lastSave = 0, enabled = false;

  function replacer(k, v) { return (typeof k === 'string' && k.charAt(0) === '_') ? undefined : v; }
  function serialize() { return JSON.stringify(AE.G, replacer); }

  function save(manual) {
    if (!enabled || !AE.G) return false;
    try {
      AE.G.savedAt = Date.now();
      const data = serialize();
      const prev = localStorage.getItem(C.SAVE_KEY);
      if (prev) localStorage.setItem(C.SAVE_KEY + '.bak', prev);
      localStorage.setItem(C.SAVE_KEY, data);
      lastSave = Date.now();
      if (manual && AE.UI) AE.UI.toast('💾 Partida guardada', 'good');
      if (AE.UI && AE.UI.savedFlash) AE.UI.savedFlash();
      return true;
    } catch (e) {
      console.error(e);
      if (AE.UI) AE.UI.toast('No se pudo guardar la partida (almacenamiento lleno o bloqueado).', 'warn');
      return false;
    }
  }
  function soon() {
    if (soonT) return;
    soonT = setTimeout(() => { soonT = null; save(false); }, 1200);
  }

  // Comprueba y completa un estado cargado
  function sanitize(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.chambers) || !Array.isArray(o.tunnels) || !o.res || !o.ants || !o.queen) throw new Error('Formato de partida no válido');
    if (!o.chambers.some(c => c.type === 'royal')) throw new Error('La partida no tiene Cámara Real');
    const d = AE.Eco.newState();
    const out = Object.assign({}, d, o);
    out.res = Object.assign({}, d.res, o.res);
    out.ants = Object.assign({}, d.ants, o.ants);
    out.queen = Object.assign({}, d.queen, o.queen);
    out.stats = Object.assign({}, d.stats, o.stats);
    out.auto = Object.assign({}, d.auto, o.auto); out.auto.w = Object.assign({}, d.auto.w, (o.auto || {}).w);
    out.threat = Object.assign({}, d.threat, o.threat);
    out.territory = Object.assign({}, d.territory, o.territory);
    out.up = Object.assign({}, o.up || {});
    out.brood = Array.isArray(o.brood) ? o.brood.filter(b => b && b.n > 0) : [];
    for (const k in out.res) if (!isFinite(out.res[k]) || out.res[k] < 0) out.res[k] = 0;
    for (const k in out.ants) if (!isFinite(out.ants[k]) || out.ants[k] < 0) out.ants[k] = 0; else out.ants[k] = Math.floor(out.ants[k]);
    ['hunger', 'hydration', 'energy', 'health', 'reserve'].forEach(k => { if (!isFinite(out.queen[k])) out.queen[k] = 60; });
    if (!isFinite(out.time)) out.time = d.time;
    out.chambers.forEach(c => { if (!isFinite(c.work)) c.work = 0; if (!isFinite(c.level) || c.level < 1) c.level = 1; });
    if (!isFinite(out.nextId)) out.nextId = Math.max(...out.chambers.map(c => c.id)) + 1;
    // la amenaza activa no se conserva entre sesiones
    if (out.threat.active) { out.threat.active = null; out.threat.next = out.time + 200; }
    return out;
  }

  function load() {
    for (const key of [C.SAVE_KEY, C.SAVE_KEY + '.bak']) {
      try {
        const s = localStorage.getItem(key);
        if (!s) continue;
        const o = sanitize(JSON.parse(s));
        return o;
      } catch (e) { console.warn('Partida dañada en ' + key, e); }
    }
    return null;
  }

  function exportFile() {
    save(false);
    const blob = new Blob([serialize()], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.download = 'ant-empire-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.json';
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    AE.UI.toast('📤 Copia de seguridad exportada', 'good');
  }
  function importFile(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = sanitize(JSON.parse(fr.result));
        o.savedAt = Date.now();
        AE.Main.startWith(o, false);
        save(false);
        AE.UI.toast('📥 Partida importada correctamente', 'good');
      } catch (e) { AE.UI.toast('Archivo no válido: ' + e.message, 'warn'); }
    };
    fr.readAsText(file);
  }
  function wipe() {
    try { localStorage.removeItem(C.SAVE_KEY); localStorage.removeItem(C.SAVE_KEY + '.bak'); } catch (e) { }
  }

  function init() {
    enabled = true;
    setInterval(() => save(false), C.AUTOSAVE * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(false); });
    window.addEventListener('pagehide', () => save(false));
    window.addEventListener('beforeunload', () => save(false));
  }
  function setEnabled(v) { enabled = v; }

  return { save, soon, load, sanitize, exportFile, importFile, wipe, init, setEnabled, get lastSave() { return lastSave; } };
})();
