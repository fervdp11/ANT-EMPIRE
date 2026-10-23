/* ANT EMPIRE - datos de diseño: cámaras, castas, mejoras, objetivos, estaciones */
'use strict';

AE.C = {
  WORLD_W: 9000,
  EX: 4500,              // x de la entrada
  TUN_R: 30,             // radio de los túneles
  MAX_TUNNEL: 680,       // longitud máxima de un túnel nuevo
  DAY_LEN: 240,          // segundos por día
  SEASON_DAYS: 3,
  SAVE_KEY: 'antEmpire.save.v1',
  AUTOSAVE: 10,
  OFFLINE_MAX: 12 * 3600
};

AE.RES = [
  { k: 'leaf', name: 'Hojas', icon: 'leaf' },
  { k: 'fungus', name: 'Hongos', icon: 'fungus' },
  { k: 'water', name: 'Agua', icon: 'water' },
  { k: 'soil', name: 'Tierra', icon: 'soil' }
];

/* Cámaras ---------------------------------------------------------- */
AE.CHAMBERS = {
  royal: {
    name: 'Cámara Real', rx: 150, ry: 86, unique: true, color: '#e0a64a',
    desc: 'El corazón de la colonia. Aquí la reina descansa, es alimentada y pone sus huevos.',
    upCost: l => ({ leaf: 40 * Math.pow(1.75, l - 1), fungus: l > 2 ? 25 * Math.pow(1.7, l - 3) : 0, soil: 15 * Math.pow(1.6, l - 1) }),
    effect: l => `Cría +${4 * l} · Reservas máx. ${100 + 20 * (l - 1)} · Puesta automática ${(0.06 * (l - 1) * 60).toFixed(1)}/min`
  },
  nursery: {
    name: 'Guardería', rx: 132, ry: 78, color: '#f3e7c9',
    desc: 'Las nodrizas cuidan aquí huevos, larvas y pupas. Aumenta la capacidad de cría.',
    cost: { leaf: 25 }, unlock: () => true, unlockTxt: '',
    upCost: l => ({ leaf: 45 * Math.pow(1.6, l - 1), fungus: 10 * Math.pow(1.6, l - 1) }),
    effect: l => `Capacidad de cría +${Math.floor(12 * Math.pow(l, 1.5))} · Desarrollo +${10 * (l - 1)}%`
  },
  storage: {
    name: 'Almacén', rx: 142, ry: 80, color: '#7fb04a',
    desc: 'Guarda hojas, hongos, agua y tierra. Aumenta la capacidad máxima de todos los recursos.',
    cost: { leaf: 20 }, unlock: () => true, unlockTxt: '',
    upCost: null, // coste dinámico: siempre cabe en el almacenamiento actual
    effect: l => `Almacenamiento +${AE.U.fmt(300 * Math.pow(1.7, l - 1))}`
  },
  dorm: {
    name: 'Dormitorio', rx: 140, ry: 78, color: '#c7905a',
    desc: 'Galerías de descanso. Aumenta la población máxima de la colonia.',
    cost: { leaf: 40, soil: 10 }, unlock: s => s.totalAdults >= 1, unlockTxt: 'Requiere tu primera obrera',
    upCost: l => ({ leaf: 60 * Math.pow(1.62, l - 1), soil: 25 * Math.pow(1.6, l - 1) }),
    effect: l => `Población +${Math.floor(16 * Math.pow(l, 1.6))}`
  },
  fungus: {
    name: 'Jardín de hongos', rx: 150, ry: 84, color: '#e8e2d0',
    desc: 'Las hojas se convierten en hongo, el alimento más nutritivo para la cría y la reina.',
    cost: { leaf: 70, soil: 25 }, unlock: s => s.totalAdults >= 5, unlockTxt: 'Requiere 5 hormigas',
    upCost: l => ({ leaf: 90 * Math.pow(1.65, l - 1), fungus: 20 * Math.pow(1.65, l - 1), soil: 30 * Math.pow(1.55, l - 1) }),
    effect: l => `Convierte ${(0.5 * Math.pow(l, 1.5) * 60).toFixed(0)} hojas/min en hongos`
  },
  cistern: {
    name: 'Cisterna de rocío', rx: 115, ry: 74, color: '#6fb8e0',
    desc: 'Recoge la humedad que se filtra por la tierra. Produce agua.',
    cost: { leaf: 60, soil: 40 }, unlock: s => s.totalAdults >= 8, unlockTxt: 'Requiere 8 hormigas',
    upCost: l => ({ leaf: 70 * Math.pow(1.6, l - 1), soil: 50 * Math.pow(1.6, l - 1) }),
    effect: l => `Agua +${(0.35 * Math.pow(l, 1.5) * 60).toFixed(0)}/min`
  },
  workshop: {
    name: 'Taller de excavación', rx: 122, ry: 74, color: '#a87a4c',
    desc: 'Herramientas y técnicas de excavación. Acelera las obras y produce tierra.',
    cost: { leaf: 110, soil: 70 }, unlock: s => s.nChambers >= 4, unlockTxt: 'Requiere 4 cámaras',
    upCost: l => ({ leaf: 100 * Math.pow(1.6, l - 1), soil: 80 * Math.pow(1.6, l - 1) }),
    effect: l => `Excavación +${25 * l}% · Tierra +${(0.3 * l * 60).toFixed(0)}/min`
  },
  scout: {
    name: 'Puesto de exploración', rx: 125, ry: 74, color: '#b8b04a',
    desc: 'Base de las exploradoras. Permite criarlas y mejora el descubrimiento de territorio.',
    cost: { leaf: 140, fungus: 30, water: 20 }, unlock: s => s.totalAdults >= 14, unlockTxt: 'Requiere 14 hormigas',
    upCost: l => ({ leaf: 140 * Math.pow(1.6, l - 1), fungus: 40 * Math.pow(1.6, l - 1) }),
    effect: l => `Exploración +${30 * l}%`
  },
  barracks: {
    name: 'Cuartel', rx: 140, ry: 82, color: '#b0402c',
    desc: 'Entrenamiento de soldados. Cada nivel permite más soldados y los hace más fuertes.',
    cost: { leaf: 160, fungus: 50, soil: 100 }, unlock: s => s.totalAdults >= 20, unlockTxt: 'Requiere 20 hormigas',
    upCost: l => ({ fungus: 70 * Math.pow(1.6, l - 1), soil: 110 * Math.pow(1.6, l - 1) }),
    effect: l => `Soldados máx. ${Math.floor(5 * Math.pow(l, 1.7))} · Fuerza +${15 * (l - 1)}%`
  },
  nuptial: {
    name: 'Cámara nupcial', rx: 145, ry: 84, color: '#d9b45a',
    desc: 'Aquí se crían machos y princesas aladas para los vuelos nupciales que fundan nuevas colonias.',
    cost: { leaf: 400, fungus: 150, water: 100, soil: 200 }, unlock: s => s.totalAdults >= 35, unlockTxt: 'Requiere 35 hormigas',
    upCost: l => ({ fungus: 200 * Math.pow(1.7, l - 1), water: 120 * Math.pow(1.7, l - 1) }),
    effect: l => `Capacidad alada ${4 + 3 * (l - 1)} · Hasta ${1 + Math.floor(l / 3)} colonia(s) por vuelo`
  }
};
AE.CHAMBER_ORDER = ['storage', 'nursery', 'dorm', 'fungus', 'cistern', 'workshop', 'scout', 'barracks', 'nuptial'];

/* Castas / roles --------------------------------------------------- */
AE.ROLES = {
  idle: { name: 'Obrera libre', plural: 'Obreras libres', spr: 'worker', speed: 40,
    fn: 'Sin tarea asignada. Pasea por el nido esperando órdenes.' },
  forager: { name: 'Recolectora', plural: 'Recolectoras', spr: 'forager', speed: 50,
    fn: 'Sale a la superficie a buscar hojas y las transporta al almacén.' },
  digger: { name: 'Excavadora', plural: 'Excavadoras', spr: 'digger', speed: 38,
    fn: 'Excava túneles y cámaras nuevas y saca la tierra al exterior.' },
  nurse: { name: 'Nodriza', plural: 'Nodrizas', spr: 'nurse', speed: 34,
    fn: 'Cuida huevos, larvas y pupas y alimenta a la reina.' },
  soldier: { name: 'Soldado', plural: 'Soldados', spr: 'soldier', speed: 40, req: 'barracks',
    fn: 'Patrulla el nido y defiende la entrada de los invasores.' },
  scout: { name: 'Exploradora', plural: 'Exploradoras', spr: 'scout', speed: 62, req: 'scout',
    fn: 'Recorre el exterior para descubrir nuevo territorio y fuentes de alimento.' },
  male: { name: 'Macho alado', plural: 'Machos', spr: 'male', speed: 36,
    fn: 'Macho reproductor. Espera el vuelo nupcial para fecundar a una princesa.' },
  princess: { name: 'Princesa alada', plural: 'Princesas', spr: 'princess', speed: 34,
    fn: 'Futura reina. Durante el vuelo nupcial partirá a fundar una nueva colonia.' }
};
AE.WORK_ROLES = ['forager', 'digger', 'nurse', 'scout', 'soldier'];

/* Mejoras globales -------------------------------------------------- */
AE.UPGRADES = {
  mandibles: { name: 'Mandíbulas afiladas', icon: 'leaf', desc: '+15% hojas recolectadas por nivel',
    base: { leaf: 40 }, g: 1.6, unlock: () => true },
  digging: { name: 'Excavación eficiente', icon: 'soil', desc: '+20% velocidad de excavación y tierra',
    base: { leaf: 50, soil: 20 }, g: 1.6, unlock: s => s.totalAdults >= 2 },
  larval: { name: 'Cuidados larvarios', icon: 'egg', desc: '+15% velocidad de desarrollo de la cría',
    base: { leaf: 60, water: 15 }, g: 1.6, unlock: s => s.totalAdults >= 3 },
  nutrition: { name: 'Nutrición real', icon: 'crown', desc: '+15% regeneración de reservas de la reina',
    base: { leaf: 70, water: 20 }, g: 1.6, unlock: s => s.totalAdults >= 4 },
  caste: { name: 'Feromonas de casta', icon: 'ant', desc: 'Desbloquea la asignación automática de las nuevas obreras',
    base: { leaf: 150 }, g: 1, max: 1, unlock: s => s.totalAdults >= 8 },
  trails: { name: 'Rastros de feromonas', icon: 'ant', desc: '+10% recolección y velocidad de las hormigas',
    base: { leaf: 120, fungus: 20 }, g: 1.65, unlock: s => s.totalAdults >= 10 },
  symbiosis: { name: 'Cultivo simbiótico', icon: 'fungus', desc: '+20% producción de los jardines de hongos',
    base: { leaf: 150, fungus: 40 }, g: 1.6, unlock: s => s.has.fungus },
  capillarity: { name: 'Capilaridad', icon: 'water', desc: '+20% producción de agua',
    base: { soil: 70, water: 30 }, g: 1.6, unlock: s => s.has.cistern },
  metabolism: { name: 'Metabolismo eficiente', icon: 'fungus', desc: '-6% consumo de alimento y agua (acumulativo)',
    base: { fungus: 80, water: 40 }, g: 1.7, unlock: s => s.totalAdults >= 25 },
  cartography: { name: 'Cartografía', icon: 'map', desc: '+20% exploración y botín de las exploradoras',
    base: { leaf: 200, fungus: 60 }, g: 1.6, unlock: s => s.has.scout },
  chitin: { name: 'Armadura quitinosa', icon: 'shield', desc: '+25% fuerza de combate',
    base: { fungus: 90, soil: 90 }, g: 1.6, unlock: s => s.has.barracks },
  fertility: { name: 'Fertilidad imperial', icon: 'egg', desc: '+20% capacidad de cría y puesta automática (acumulativo)',
    base: { leaf: 300, fungus: 120, water: 60 }, g: 1.75, unlock: s => s.totalAdults >= 40 },
  dynasty: { name: 'Dinastía', icon: 'crown', desc: '+12% a toda la producción de la colonia',
    base: { fungus: 800, water: 300 }, g: 1.9, unlock: s => s.colonies >= 1 }
};
AE.UPGRADE_ORDER = ['mandibles', 'digging', 'larval', 'nutrition', 'caste', 'trails', 'symbiosis', 'capillarity', 'metabolism', 'cartography', 'chitin', 'fertility', 'dynasty'];

/* Estaciones -------------------------------------------------------- */
AE.SEASONS = [
  { name: 'Primavera', icon: '🌱', forage: 1.0, brood: 1.25, water: 1.25, cons: 1.0, color: '#8fd16a' },
  { name: 'Verano', icon: '☀️', forage: 1.25, brood: 1.05, water: 0.8, cons: 1.05, color: '#f2c14e' },
  { name: 'Otoño', icon: '🍂', forage: 1.15, brood: 0.9, water: 1.05, cons: 1.0, color: '#e08a3c' },
  { name: 'Invierno', icon: '❄️', forage: 0.6, brood: 0.75, water: 1.0, cons: 0.7, color: '#a9d2ef' }
];

/* Objetivos --------------------------------------------------------- */
AE.OBJECTIVES = [
  { t: 'Pon 2 huevos más (tecla Q en la Cámara Real)', v: g => g.stats.eggs - 4, n: 2, r: { leaf: 10 } },
  { t: 'Consigue tu primera obrera adulta', v: g => g.stats.adults, n: 1, r: { leaf: 15, water: 5 } },
  { t: 'Asigna una recolectora (panel Obreras)', v: g => g.ants.forager, n: 1, r: { leaf: 15 } },
  { t: 'Excava un Almacén (panel Excavar)', v: g => AE.Eco.countType('storage', true), n: 1, r: { leaf: 25 } },
  { t: 'Asigna una excavadora', v: g => g.ants.digger, n: 1, r: { soil: 20 } },
  { t: 'Excava una Guardería', v: g => AE.Eco.countType('nursery', true), n: 1, r: { leaf: 30 } },
  { t: 'Alcanza 6 hormigas adultas', v: g => AE.Eco.adults(), n: 6, r: { leaf: 40, water: 15 } },
  { t: 'Excava un Dormitorio', v: g => AE.Eco.countType('dorm', true), n: 1, r: { leaf: 40, soil: 20 } },
  { t: 'Asigna 2 nodrizas', v: g => g.ants.nurse, n: 2, r: { leaf: 40 } },
  { t: 'Excava un Jardín de hongos', v: g => AE.Eco.countType('fungus', true), n: 1, r: { fungus: 30 } },
  { t: 'Compra 4 niveles de mejoras', v: g => AE.Eco.upgradeLevels(), n: 4, r: { leaf: 80, fungus: 20 } },
  { t: 'Alcanza 15 hormigas adultas', v: g => AE.Eco.adults(), n: 15, r: { leaf: 120, water: 40 } },
  { t: 'Excava una Cisterna de rocío', v: g => AE.Eco.countType('cistern', true), n: 1, r: { water: 60 } },
  { t: 'Mejora la Cámara Real a nivel 3', v: g => AE.Eco.royal().level, n: 3, r: { fungus: 60 } },
  { t: 'Excava un Puesto de exploración', v: g => AE.Eco.countType('scout', true), n: 1, r: { leaf: 200 } },
  { t: 'Alcanza el territorio nivel 2', v: g => g.territory.lvl, n: 2, r: { fungus: 80, water: 50 } },
  { t: 'Excava un Cuartel', v: g => AE.Eco.countType('barracks', true), n: 1, r: { soil: 150 } },
  { t: 'Entrena 3 soldados', v: g => g.ants.soldier, n: 3, r: { fungus: 120 } },
  { t: 'Alcanza 40 hormigas adultas', v: g => AE.Eco.adults(), n: 40, r: { leaf: 500, fungus: 150 } },
  { t: 'Excava una Cámara nupcial', v: g => AE.Eco.countType('nuptial', true), n: 1, r: { fungus: 200, water: 100 } },
  { t: 'Cría una princesa y 2 machos', v: g => Math.min(g.ants.princess, 1) + Math.min(g.ants.male, 2) + g.colonies * 3, n: 3, r: { fungus: 200 } },
  { t: 'Completa un vuelo nupcial', v: g => g.colonies, n: 1, r: { leaf: 1500, fungus: 500 } }
];
