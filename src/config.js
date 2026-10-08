// All layout, balance and progression numbers live here so tuning never means hunting through code.

export const WORLD = { w: 1000, h: 1600 };
export const BOUNDS = { x1: 62, x2: 938, y1: 236, y2: 1335 }; // where the player may walk (inside the fence)
export const GATE = { x: 500, y: 1360 };

// Every item in the game. h = height it adds to a carried stack.
export const ITEMS = {
  puff: { name: 'Puff-puff', price: 4, tex: 'item_puff', icon: 'icon_puff', h: 13 },
  zobo: { name: 'Zobo', price: 6, tex: 'item_zobo', icon: 'icon_zobo', h: 22 },
  jollof: { name: 'Jollof rice', price: 30, tex: 'item_jollof', icon: 'icon_jollof', h: 12 },
  noodles: { name: 'Noodles', price: 24, tex: 'item_noodles', icon: 'icon_noodles', h: 14 },
  akara: { name: 'Akara', price: 12, tex: 'item_akara', icon: 'icon_akara', h: 12 },
  bread: { name: 'Bread', price: 10, tex: 'item_bread', icon: 'icon_bread', h: 13 },
  malt: { name: 'Malt', price: 15, tex: 'item_malt', icon: 'icon_malt', h: 22 },
  dirty: { name: 'Dirty plate', price: 0, tex: 'item_dirty', icon: 'icon_dirty', h: 6 },
};

export const PLAYER = {
  speed: 230,
  carry: 5,
  radius: 15,
  pickEvery: 0.11,  // seconds between items while standing in a zone
  dropEvery: 0.09,
};

// ---------- endless systems ----------
export const FAME = {
  xpNeed: (lvl) => Math.round(12 * Math.pow(1.3, lvl - 1)),
  demand: (lvl) => Math.min(2.6, 1 + 0.07 * (lvl - 1)),       // customers arrive this much faster
  extraItems: (lvl) => Math.min(4, Math.floor((lvl - 1) / 4)), // bigger orders
  patience: (lvl) => Math.max(0.5, 1 - 0.035 * (lvl - 1)),     // customers get less patient
  price: (lvl) => 1 + 0.05 * (lvl - 1),                        // but pay more
};
export const RUSH = { every: [110, 190], length: 40, demand: 2.2, pay: 1.5 };

// ---------- Branch 1: Faulks Road spot (puff-puff & zobo) ----------
export const PRODUCERS = {
  fryer1: { type: 'puff', x: 250, y: 600, interval: 2.0, cap: 10, start: 4, kind: 'fryer' },
  fryer2: { type: 'puff', x: 250, y: 370, interval: 2.0, cap: 10, start: 4, kind: 'fryer' },
  zobo1: { type: 'zobo', x: 750, y: 600, interval: 2.5, cap: 10, start: 4, kind: 'zobo' },
  zobo2: { type: 'zobo', x: 750, y: 370, interval: 2.5, cap: 10, start: 4, kind: 'zobo' },
};

export const COUNTER = {
  x1: 320, x2: 680, y1: 892, y2: 940,
  dropZone: { x1: 330, x2: 670, y1: 794, y2: 866 },
  shelfCap: 16,
  shelves: { puff: { x: 388, y: 912 }, zobo: { x: 612, y: 912 } },
};

export const REGISTER = { x1: 700, x2: 780, y1: 892, y2: 940, zone: { x: 740, y: 834, r: 42 } };
export const REGISTER_CASH = { x: 862, y: 880 };
export const ORDER_SPOT = { x: 500, y: 992 };
export const PAY_SPOT = { x: 740, y: 992 };
export const QUEUE_GAP = 60;
export const QUEUE_MAX = 6;

export const CUSTOMERS = {
  spawnEvery: 3.6,
  speed: 145,
  puffMin: 1, puffMax: 3,
  zoboMax: 2,
  checkoutTime: 0.45,
  eatTime: [4, 7],
  tip: [3, 7],
  patience: 26,      // seconds at the counter before walking out (from fame 2)
  payPatience: 16,   // seconds at the till
};

export const BUS = {
  tex: 'm_bus',
  park: { x: 500, y: 150 },
  zone: { x: 500, y: 292, r: 50 },
  cash: { x: 628, y: 300 },
  firstDelay: 4,
  cooldown: [10, 16],
  bonus: 1.6,
  wait: 50, waitPerItem: 3,
  bubbleY: 168, exhaustX: 140,
};

export const TABLES = [
  { x: 815, y: 1150, seats: [{ x: -52, y: 4 }, { x: 52, y: 4 }] },
  { x: 815, y: 1285, seats: [{ x: -52, y: 4 }, { x: 52, y: 4 }] },
];

export const BOOTH = { x: 128, y: 880, zone: { x: 128, y: 950, r: 46 } };

export const SIGN = { x: 210, y: 1215 };

export const HELPERS = {
  runnerSpeed: 150,
  runnerCarry: 4,
  aisleX: 500,
};

// Unlocks appear in this order; the next two not-yet-bought ones are shown as pads.
export const UNLOCKS = [
  { id: 'zobo1', name: 'Zobo Cooler', cost: 30, x: 750, y: 600, icon: 'icon_zobo' },
  { id: 'bus', name: 'Shuttle Stop', cost: 90, x: 500, y: 292, icon: 'icon_bus' },
  { id: 'booth', name: 'Upgrade Desk', cost: 60, x: 128, y: 905, icon: 'icon_up' },
  { id: 'cashier', name: 'Hire Chioma', sub: 'Cashier', cost: 150, x: 870, y: 760, icon: 'icon_cashier' },
  { id: 'fryer2', name: 'Second Fryer', cost: 200, x: 250, y: 370, icon: 'icon_puff' },
  { id: 'seating', name: 'Seating Area', cost: 260, x: 815, y: 1215, icon: 'icon_table' },
  { id: 'runner1', name: 'Hire Tunde', sub: 'Puff runner', cost: 350, x: 500, y: 640, icon: 'icon_runner' },
  { id: 'zobo2', name: 'Second Cooler', cost: 450, x: 750, y: 370, icon: 'icon_zobo' },
  { id: 'runner2', name: 'Hire Emeka', sub: 'Zobo runner', cost: 600, x: 500, y: 470, icon: 'icon_runner' },
  { id: 'sign', name: 'Neon Sign', sub: 'More customers', cost: 1000, x: 210, y: 1215, icon: 'icon_sign' },
  { id: 'loader', name: 'Hire Bayo', sub: 'Shuttle loader', cost: 800, x: 380, y: 282, icon: 'icon_loader' },
  { id: 'manager', name: 'Hire Uju', sub: 'Manager', cost: 1500, x: 130, y: 1072, icon: 'icon_manager' },
];

// Upgrade tracks are long and get steeply more expensive, so there is always something to save for.
export const UPGRADES = [
  { id: 'carry', name: 'Bigger Tray', desc: 'Carry +1 item', icon: 'icon_tray', base: 40, mult: 1.42, max: 20 },
  { id: 'speed', name: 'Comfy Slippers', desc: 'Walk 6% faster', icon: 'icon_shoe', base: 50, mult: 1.45, max: 15, step: 0.06 },
  { id: 'cook', name: 'Hotter Oil', desc: 'Cook 10% faster', icon: 'icon_fire', base: 60, mult: 1.45, max: 20 },
  { id: 'price', name: 'Secret Recipe', desc: 'Prices +15%', icon: 'icon_star', base: 80, mult: 1.55, max: 40 },
  { id: 'patience', name: 'Shade & Fans', desc: 'Customers wait 10% longer', icon: 'icon_fan', base: 120, mult: 1.6, max: 12 },
  { id: 'staff', name: 'Staff Training', desc: 'Helpers 12% faster', icon: 'icon_runner', base: 120, mult: 1.5, max: 20, needs: 'runner1' },
  { id: 'safe', name: 'Bigger Cash Box', desc: 'Holds more while you\'re away', icon: 'icon_safe', base: 300, mult: 1.7, max: 15, needs: 'cashier' },
];

// ---------- Branch 2: Ariaria Buka ----------
export const BUKA = {
  producers: {
    jollof: { type: 'jollof', x: 150, y: 430, interval: 2.6, cap: 8, start: 3, kind: 'jollof' },
    noodles: { type: 'noodles', x: 370, y: 430, interval: 2.4, cap: 8, start: 3, kind: 'noodles' },
    akara: { type: 'akara', x: 640, y: 430, interval: 2.0, cap: 10, start: 4, kind: 'akara' },
    bread: { type: 'bread', x: 830, y: 430, interval: 2.2, cap: 10, start: 4, kind: 'oven' },
    fridge: { type: 'malt', x: 880, y: 640, interval: 2.2, cap: 10, start: 4, kind: 'fridge' },
  },
  tables: [
    { id: 't1', x: 310, y: 760 }, { id: 't2', x: 690, y: 760 },
    { id: 'table3', x: 310, y: 960 }, { id: 'table4', x: 690, y: 960 },
    { id: 'table5', x: 310, y: 1160 }, { id: 'table6', x: 690, y: 1160 },
  ],
  seatDX: 58,
  sink: { x: 108, y: 720, zone: { x: 150, y: 812, r: 52 } },
  till: { x: 870, y: 1262, cash: { x: 760, y: 1300 } },
  booth: { x: 120, y: 1180, zone: { x: 120, y: 1250, r: 46 } },
  generator: { x: 112, y: 990 },
  queue: { x: 430, y: 1420, gap: 56, max: 6 },
  keke: {
    tex: 'm_keke', park: { x: 520, y: 150 }, zone: { x: 520, y: 300, r: 50 }, cash: { x: 668, y: 262 },
    firstDelay: 5, cooldown: [12, 18], bonus: 1.5, wait: 45, waitPerItem: 3.5, bubbleY: 150, exhaustX: 70,
  },
  customers: { spawnEvery: 7, speed: 140, eatTime: [6, 9], patience: 55, outsidePatience: 30, tip: [6, 14] },
  staffSpeed: 150,
  staffCarry: 4,
};

export const BUKA_UNLOCKS = [
  { id: 'noodles', name: 'Noodle Pot', cost: 250, x: 370, y: 430, icon: 'icon_noodles' },
  { id: 'table3', name: 'Table 3', cost: 300, x: 310, y: 960, icon: 'icon_btable' },
  { id: 'booth', name: 'Upgrade Desk', cost: 350, x: 120, y: 1190, icon: 'icon_up' },
  { id: 'akara', name: 'Akara Fryer', cost: 600, x: 640, y: 430, icon: 'icon_akara' },
  { id: 'waiter1', name: 'Hire Ngozi', sub: 'Waiter', cost: 900, x: 500, y: 640, icon: 'icon_waiter' },
  { id: 'table4', name: 'Table 4', cost: 1000, x: 690, y: 960, icon: 'icon_btable' },
  { id: 'bread', name: 'Bread Oven', cost: 1300, x: 830, y: 430, icon: 'icon_bread' },
  { id: 'cleaner', name: 'Hire Musa', sub: 'Cleaner', cost: 1600, x: 190, y: 640, icon: 'icon_cleaner' },
  { id: 'keke', name: 'Keke Orders', cost: 2000, x: 520, y: 300, icon: 'icon_keke' },
  { id: 'fridge', name: 'Drinks Fridge', sub: 'Sells malt', cost: 2500, x: 862, y: 640, icon: 'icon_malt' },
  { id: 'table5', name: 'Table 5', cost: 2800, x: 310, y: 1160, icon: 'icon_btable' },
  { id: 'waiter2', name: 'Hire Kemi', sub: 'Waiter', cost: 3500, x: 500, y: 860, icon: 'icon_waiter' },
  { id: 'table6', name: 'Table 6', cost: 4000, x: 690, y: 1160, icon: 'icon_btable' },
  { id: 'kloader', name: 'Hire Sule', sub: 'Keke loader', cost: 4500, x: 370, y: 284, icon: 'icon_loader' },
  { id: 'manager', name: 'Hire Obi', sub: 'Manager', cost: 6000, x: 870, y: 1130, icon: 'icon_manager' },
  { id: 'generator', name: 'Generator & Lights', sub: 'Open late: more customers', cost: 9000, x: 112, y: 1000, icon: 'icon_bulb' },
];

export const BUKA_UPGRADES = [
  { id: 'carry', name: 'Bigger Tray', desc: 'Carry +1 item', icon: 'icon_tray', base: 300, mult: 1.42, max: 20 },
  { id: 'speed', name: 'Comfy Slippers', desc: 'Walk 6% faster', icon: 'icon_shoe', base: 350, mult: 1.45, max: 15, step: 0.06 },
  { id: 'cook', name: 'Bigger Pots', desc: 'Cook 10% faster', icon: 'icon_fire', base: 400, mult: 1.45, max: 20 },
  { id: 'price', name: 'Mama\'s Recipe', desc: 'Prices +15%', icon: 'icon_star', base: 500, mult: 1.55, max: 40 },
  { id: 'patience', name: 'Ceiling Fans', desc: 'Customers wait 10% longer', icon: 'icon_fan', base: 600, mult: 1.6, max: 12 },
  { id: 'staff', name: 'Staff Training', desc: 'Helpers 12% faster', icon: 'icon_waiter', base: 800, mult: 1.5, max: 20, needs: 'waiter1' },
  { id: 'safe', name: 'Bigger Cash Box', desc: 'Holds more while you\'re away', icon: 'icon_safe', base: 1500, mult: 1.7, max: 15, needs: 'cleaner' },
];

// Branch directory: name, how it is opened, how it earns while you're elsewhere.
export const BRANCHES = {
  stand: {
    key: 'stand', name: 'Faulks Road', full: 'Faulks Road Spot', area: 'Faulks Road', icon: 'icon_puff',
    unlocks: UNLOCKS, upgrades: UPGRADES,
    goalScale: 1, xpScale: 1,
    // share of full speed the stand reaches with nobody there
    automation: { cashier: 0.35, runner1: 0.2, runner2: 0.2, loader: 0.15, seating: 0.1 },
    baseRate: 2.2, capBase: 2500,
  },
  buka: {
    key: 'buka', name: 'Ariaria Buka', full: 'Ariaria Buka', area: 'Ariaria Market', icon: 'icon_jollof',
    unlocks: BUKA_UNLOCKS, upgrades: BUKA_UPGRADES,
    cost: 3000, requires: 'sign', requiresText: 'Unlock the Neon Sign at your Faulks Road spot first',
    goalScale: 4, xpScale: 1,
    automation: { waiter1: 0.3, waiter2: 0.2, cleaner: 0.3, kloader: 0.1, generator: 0.1 },
    baseRate: 9, capBase: 8000,
  },
};
export const BRANCH_ORDER = ['stand', 'buka'];

export const COLORS = {
  grass: 0x7cc35a,
  grassDark: 0x6bb04c,
  earth: 0xe6c98f,
  earthEdge: 0xcfae70,
  road: 0x5b6470,
  roadLine: 0xf2f2f2,
  kitchen: 0xf3e7d3,
  kitchenAlt: 0xe9d9bf,
  accent: 0xff7a1a,
  cash: 0x3fb46b,
};
