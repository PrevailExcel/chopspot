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
  // GRA Lounge (continental menu)
  steak: { name: 'Grilled steak', price: 90, tex: 'icon_steak', icon: 'icon_steak', h: 6, plural: 'grilled steaks' },
  pasta: { name: 'Seafood pasta', price: 75, tex: 'icon_pasta', icon: 'icon_pasta', h: 6, plural: 'plates of seafood pasta' },
  salad: { name: 'Caesar salad', price: 50, tex: 'icon_salad', icon: 'icon_salad', h: 6, plural: 'Caesar salads' },
  pizza: { name: 'Pizza', price: 80, tex: 'icon_pizza', icon: 'icon_pizza', h: 6, plural: 'pizzas' },
  dessert: { name: 'Chocolate cake', price: 45, tex: 'icon_dessert', icon: 'icon_dessert', h: 6, plural: 'slices of chocolate cake' },
  drink: { name: 'Mocktail', price: 35, tex: 'icon_drink', icon: 'icon_drink', h: 8, plural: 'mocktails' },
  // Chop Factory: made in Aba
  oil: { name: 'Palm oil', price: 60, tex: 'item_oil', icon: 'icon_oil', h: 22, plural: 'kegs of palm oil', one: 'keg of palm oil' },
  soap: { name: 'Bar soap', price: 75, tex: 'item_soap', icon: 'icon_soap', h: 15, plural: 'cartons of soap', one: 'carton of soap' },
  shoes: { name: 'Leather shoes', price: 210, tex: 'item_shoes', icon: 'icon_shoes', h: 14, plural: 'boxes of shoes', one: 'box of shoes' },
  shirts: { name: 'Shirts', price: 170, tex: 'item_shirts', icon: 'icon_shirts', h: 13, plural: 'bales of shirts', one: 'bale of shirts' },
  bags: { name: 'Handbags', price: 280, tex: 'item_bags', icon: 'icon_bags', h: 20, plural: 'cartons of bags', one: 'carton of bags' },
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

// ---------- Branch 3: GRA Lounge (3D, high-end) ----------
// Units match the other branches: 100 units = 1 metre on the floor. y grows towards the street.
export const LOUNGE = {
  bounds: { x1: 120, x2: 1880, y1: 230, y2: 1935 },
  spawn: { x: 1000, y: 1820 },
  door: { x: 1000, y: 1600 },
  gate: { x: 1000, y: 1960 },
  street: { y: 1985 },
  passY: 570,          // top of the kitchen pass, where plated dishes wait
  stationZoneY: 690,
  producers: {
    grill: { type: 'steak', x: 260, interval: 3.0, cap: 6, start: 3, kind: 'grill' },
    pasta: { type: 'pasta', x: 480, interval: 2.8, cap: 6, start: 2, kind: 'pasta' },
    salad: { type: 'salad', x: 700, interval: 2.2, cap: 6, start: 2, kind: 'salad' },
    pizza: { type: 'pizza', x: 920, interval: 3.2, cap: 6, start: 2, kind: 'pizza' },
    dessert: { type: 'dessert', x: 1140, interval: 2.4, cap: 6, start: 2, kind: 'dessert' },
    bar: { type: 'drink', x: 1570, y: 520, zone: { x: 1470, y: 520 }, interval: 2.0, cap: 8, start: 3, kind: 'bar' },
  },
  tables: [
    { id: 't1', x: 790, y: 800, seats: 4, kind: 'square' },
    { id: 't2', x: 1210, y: 800, seats: 4, kind: 'square' },
    { id: 't3', x: 790, y: 1060, seats: 2, kind: 'round' },
    { id: 't4', x: 1210, y: 1060, seats: 4, kind: 'square' },
    { id: 't5', x: 790, y: 1320, seats: 4, kind: 'square' },
    { id: 't6', x: 1210, y: 1320, seats: 2, kind: 'round' },
    { id: 'b1', x: 270, y: 1140, seats: 4, kind: 'booth' },
    { id: 'b2', x: 270, y: 1400, seats: 4, kind: 'booth' },
    { id: 't7', x: 700, y: 1770, seats: 2, kind: 'terrace', unlock: 'terrace' },
    { id: 't8', x: 1300, y: 1770, seats: 2, kind: 'terrace', unlock: 'terrace' },
  ],
  host: { x: 1170, y: 1510, zone: { x: 1170, y: 1440, r: 52 } },
  till: { x: 1300, y: 1520 },
  booth: { x: 830, y: 1515, zone: { x: 830, y: 1440, r: 50 } },
  // the scullery: walk into the kitchen through the gap at the end of the pass
  sink: { x: 1265, y: 235, zone: { x: 1305, y: 345, r: 56 } },
  rack: { x: 1385, y: 380 },
  kitchenDoor: { x: 1320, y: 572 },
  // dish return trolley just outside the kitchen door: drop dirty plates here instead of walking to the sink
  dishReturn: { x: 1385, y: 650, zone: { x: 1385, y: 735, r: 58 } },
  // porter: the kitchen washes plates slowly on its own (seconds per plate), so you never HAVE to wash
  plates: { base: 48, perUpgrade: 6, wash: 0.34, staffWash: 0.75, porter: 1.1 },
  // guests who wait this long at the door seat themselves at a free table (the host stand is now a shortcut)
  selfSeat: 5,
  queue: [{ x: 1000, y: 1690 }, { x: 1000, y: 1775 }, { x: 1000, y: 1860 }, { x: 1000, y: 1950 }, { x: 1000, y: 2040 }],
  eventTable: { x: 1690, y: 1270 },
  // the band stand sits clear of the kitchen pass, so the grill and pasta chefs stay in view and reachable
  stage: { x: 280, y: 875, w: 300, d: 210 },
  // front garden: a 1 m basin leaves a walkway between the facade (y 1612) and the compound wall (y 1950)
  fountain: { x: 380, y: 1780, r: 100 },
  guests: { spawnEvery: 13, speed: 120, read: [2.5, 4], eat: [9, 13], patience: 95, queuePatience: 60, tip: [0.08, 0.2] },
  booking: {
    label: 'A birthday party', bayText: 'Serve the party at the event table',
    firstDelay: 20, cooldown: [55, 85], bonus: 1.8, wait: 70, waitPerItem: 4,
  },
};

export const LOUNGE_UNLOCKS = [
  { id: 'pasta', name: 'Pasta Station', cost: 1500, x: 480, y: 690, icon: 'icon_pasta' },
  { id: 't3', name: 'Table for Two', cost: 1800, x: 790, y: 1060, icon: 'icon_ltable' },
  { id: 'booth', name: 'Upgrade Desk', cost: 2200, x: 830, y: 1500, icon: 'icon_up' },
  { id: 'washer', name: 'Hire Kelechi', sub: 'Washes plates', cost: 2600, x: 1430, y: 840, icon: 'icon_washer' },
  { id: 'bar', name: 'Cocktail Bar', sub: 'Sells mocktails', cost: 3000, x: 1470, y: 520, icon: 'icon_drink' },
  { id: 'host', name: 'Hire Ifeoma', sub: 'Host: seats guests', cost: 4000, x: 1340, y: 1420, icon: 'icon_host' },
  { id: 't4', name: 'Table 4', cost: 4500, x: 1210, y: 1060, icon: 'icon_ltable' },
  { id: 'salad', name: 'Salad Station', cost: 5500, x: 700, y: 690, icon: 'icon_salad' },
  { id: 'waiter1', name: 'Hire Chidi', sub: 'Waiter', cost: 6500, x: 1000, y: 940, icon: 'icon_lwaiter' },
  { id: 'b1', name: 'Velvet Booth', cost: 7500, x: 270, y: 1140, icon: 'icon_booth' },
  { id: 'dessert', name: 'Pastry Station', cost: 9000, x: 1140, y: 690, icon: 'icon_dessert' },
  { id: 'busser', name: 'Hire Emeka', sub: 'Clears tables', cost: 10000, x: 560, y: 1250, icon: 'icon_busser' },
  { id: 'chandelier', name: 'Crystal Chandelier', sub: 'Guests pay 6% more', cost: 12000, x: 1000, y: 1080, icon: 'icon_chandelier' },
  { id: 't5', name: 'Table 5', cost: 13000, x: 790, y: 1320, icon: 'icon_ltable' },
  { id: 'pizza', name: 'Pizza Oven', cost: 15000, x: 920, y: 690, icon: 'icon_pizza' },
  { id: 'machine', name: 'Dishwasher', sub: 'Plates wash 2x faster', cost: 16000, x: 1430, y: 840, icon: 'icon_machine' },
  { id: 'waiter2', name: 'Hire Adaeze', sub: 'Waiter', cost: 17000, x: 1000, y: 940, icon: 'icon_lwaiter' },
  { id: 'band', name: 'Live Band', sub: 'More guests, +8% prices', cost: 20000, x: 280, y: 875, icon: 'icon_band' },
  { id: 't6', name: 'Table for Two', cost: 22000, x: 1210, y: 1320, icon: 'icon_ltable' },
  { id: 'b2', name: 'Velvet Booth 2', cost: 25000, x: 270, y: 1400, icon: 'icon_booth' },
  { id: 'events', name: 'Event Table', sub: 'Birthday & dinner bookings', cost: 28000, x: 1690, y: 1270, icon: 'icon_party' },
  { id: 'planner', name: 'Hire Tobi', sub: 'Event planner', cost: 32000, x: 1560, y: 1060, icon: 'icon_planner' },
  { id: 'art', name: 'Gallery Wall', sub: 'Guests pay 6% more', cost: 36000, x: 440, y: 1500, icon: 'icon_art' },
  { id: 'manager', name: 'Hire Mrs. Eze', sub: 'Manager', cost: 40000, x: 600, y: 1500, icon: 'icon_lmanager' },
  { id: 'terrace', name: 'Garden Terrace', sub: '2 outdoor tables', cost: 48000, x: 700, y: 1770, icon: 'icon_terrace' },
  { id: 'fountain', name: 'Fountain & Lights', sub: 'The finest spot in Aba', cost: 60000, x: 380, y: 1780, icon: 'icon_fountain' },
];

export const LOUNGE_UPGRADES = [
  { id: 'carry', name: 'Silver Tray', desc: 'Carry +1 dish', icon: 'icon_tray', base: 1500, mult: 1.42, max: 20 },
  { id: 'speed', name: 'Leather Loafers', desc: 'Walk 6% faster', icon: 'icon_shoe', base: 1800, mult: 1.45, max: 15, step: 0.06 },
  { id: 'cook', name: 'Pro Kitchen', desc: 'Cook 10% faster', icon: 'icon_fire', base: 2000, mult: 1.45, max: 20 },
  { id: 'price', name: 'Chef\'s Signature', desc: 'Prices +15%', icon: 'icon_star', base: 2500, mult: 1.55, max: 40 },
  { id: 'plates', name: 'Extra Plates', desc: '+6 clean plates', icon: 'icon_dish', base: 1200, mult: 1.5, max: 10 },
  { id: 'patience', name: 'Air Conditioning', desc: 'Guests wait 10% longer', icon: 'icon_fan', base: 3000, mult: 1.6, max: 12 },
  { id: 'staff', name: 'Staff Training', desc: 'Staff 12% faster', icon: 'icon_lwaiter', base: 4000, mult: 1.5, max: 20, needs: 'waiter1' },
  { id: 'safe', name: 'Bigger Safe', desc: 'Holds more while you\'re away', icon: 'icon_safe', base: 8000, mult: 1.7, max: 15, needs: 'busser' },
];
// decor that lifts prices ("ambience")
export const LOUNGE_AMBIENCE = { chandelier: 0.06, band: 0.08, art: 0.06, fountain: 0.1, terrace: 0.04 };

// ---------- Branch 4: Chop Factory (2D, made in Aba) ----------
// Lines make finished goods. Sell them to traders at the factory shop, or load the trucks that pull
// into the bays. Belts carry each line's goods up to the dispatch rack next to the bays.
export const FACTORY = {
  bounds: { x1: 62, x2: 938, y1: 236, y2: 1335 },
  spawn: { x: 500, y: 1080 },
  carry: 8,          // you start with a bigger trolley than at Faulks Road
  pickEvery: 0.075, dropEvery: 0.06,
  lines: {
    oil: { type: 'oil', kind: 'oilpress', x: 200, y: 640, interval: 2.0, cap: 12, start: 5 },
    soap: { type: 'soap', kind: 'soapline', x: 800, y: 640, interval: 2.2, cap: 12, start: 4 },
    shoes: { type: 'shoes', kind: 'shoebench', x: 200, y: 850, interval: 2.8, cap: 10, start: 3 },
    shirts: { type: 'shirts', kind: 'sewing', x: 800, y: 850, interval: 2.6, cap: 10, start: 3 },
    bags: { type: 'bags', kind: 'bagline', x: 200, y: 1060, interval: 3.2, cap: 10, start: 3 },
  },
  // dispatch rack: one slot per product, with a pick-up strip between it and the bays
  rack: { y: 478, x1: 290, x2: 710, cap: 14, slots: { oil: 330, shoes: 415, bags: 500, shirts: 585, soap: 670 }, zone: { x1: 292, x2: 708, y1: 362, y2: 428 } },
  // conveyor belts from each line's pallet to its rack slot (walk over them freely)
  belts: {
    oil: [[300, 664], [330, 664], [330, 494]],
    shoes: [[300, 874], [415, 874], [415, 494]],
    bags: [[300, 1084], [500, 1084], [500, 494]],
    soap: [[700, 664], [670, 664], [670, 494]],
    shirts: [[700, 874], [585, 874], [585, 494]],
  },
  beltEvery: 0.5,   // seconds between cartons riding a belt
  beltSpeed: 150,
  shop: {
    counter: { x1: 300, x2: 700, y1: 1190, y2: 1230 },
    dropZone: { x1: 366, x2: 694, y1: 1112, y2: 1178 },
    shelves: { oil: 340, soap: 420, shoes: 500, shirts: 580, bags: 660 },
    shelfCap: 12,
    cash: { x: 236, y: 1252 },
    orderSpot: { x: 500, y: 1282 }, gap: 52, max: 4,
    traders: { spawnEvery: 5.5, speed: 150, patience: 60, take: 0.14 },
  },
  booth: { x: 120, y: 1196, zone: { x: 120, y: 1266, r: 46 } },
  generator: { x: 878, y: 1220, zone: { x: 878, y: 1290, r: 48 } },
  office: { x: 840, y: 1060 },
  sign: { x: 166, y: 528 },
  // trucks: a pickup from Aba, box trucks to other cities, trailers to Lagos, Kano and the port
  bays: [
    { id: 'bay1', unlock: 'bay1', tex: 'm_pickup', kind: 'Pickup', park: { x: 820, y: 152 }, zone: { x: 820, y: 300, r: 62 }, cash: { x: 924, y: 302 },
      firstDelay: 3, cooldown: [5, 9], bonus: 1.4, wait: 70, waitPerItem: 4, bubbleY: 142, exhaustX: 96, size: [4, 9],
      buyers: ['Ariaria Market', 'Ekeoha Shopping Centre', 'Ahia Ohuru (New Market)', 'Cemetery Market', 'Relief Market, Owerri'] },
    { id: 'bay2', unlock: 'bay2', tex: 'm_lorry', kind: 'Box truck', park: { x: 520, y: 152 }, zone: { x: 520, y: 300, r: 62 }, cash: { x: 640, y: 296 },
      firstDelay: 4, cooldown: [8, 13], bonus: 1.65, wait: 85, waitPerItem: 4, bubbleY: 168, exhaustX: 130, size: [9, 16],
      buyers: ['Mile 1 Market, Port Harcourt', 'Oil Mill Market, Port Harcourt', 'Ogbete Main Market, Enugu', 'Onitsha Main Market', 'Wuse Market, Abuja'] },
    { id: 'bay3', unlock: 'bay3', tex: 'm_trailer', kind: 'Trailer', park: { x: 200, y: 152 }, zone: { x: 200, y: 300, r: 62 }, cash: { x: 80, y: 300 },
      firstDelay: 5, cooldown: [12, 20], bonus: 1.95, wait: 110, waitPerItem: 4, bubbleY: 176, exhaustX: 160, size: [16, 28],
      buyers: ['Balogun Market, Lagos', 'Trade Fair Complex, Lagos', 'Kurmi Market, Kano', 'Onne Port (export)'] },
  ],
  // NEPA takes light now and then: machines slow down (never stop) until you start the generator or it comes back
  power: { first: 240, every: [300, 420], length: 30, slow: 0.5 },
  staffSpeed: 175, staffCarry: 6,
};

export const FACTORY_UNLOCKS = [
  { id: 'bay1', name: 'Loading Bay', sub: 'Pickups from Aba markets', cost: 900, x: 820, y: 300, icon: 'icon_truck' },
  { id: 'soap', name: 'Soap Line', cost: 2200, x: 800, y: 640, icon: 'icon_soap' },
  { id: 'belt_oil', name: 'Palm Oil Belt', sub: 'Kegs to the rack', cost: 3500, x: 330, y: 546, icon: 'icon_belt' },
  { id: 'booth', name: 'Upgrade Desk', cost: 4500, x: 120, y: 1206, icon: 'icon_up' },
  { id: 'attendant', name: 'Hire Chinedu', sub: 'Runs the shop', cost: 6500, x: 780, y: 1150, icon: 'icon_cashier' },
  { id: 'belt_soap', name: 'Soap Belt', sub: 'Soap to the rack', cost: 9000, x: 670, y: 546, icon: 'icon_belt' },
  { id: 'shoes', name: 'Shoe Line', sub: 'Aba leather shoes', cost: 13000, x: 200, y: 850, icon: 'icon_shoes' },
  { id: 'loader1', name: 'Hire Ikenna', sub: 'Loads the trucks', cost: 17000, x: 370, y: 312, icon: 'icon_loader' },
  { id: 'bay2', name: 'Bay 2', sub: 'Box trucks to other cities', cost: 24000, x: 520, y: 300, icon: 'icon_truck' },
  { id: 'belt_shoes', name: 'Shoe Belt', cost: 30000, x: 415, y: 772, icon: 'icon_belt' },
  { id: 'shirts', name: 'Garment Line', sub: 'Made-in-Aba shirts', cost: 40000, x: 800, y: 850, icon: 'icon_shirts' },
  { id: 'electrician', name: 'Hire Sunday', sub: 'Electrician', cost: 50000, x: 764, y: 1292, icon: 'icon_bolt' },
  { id: 'belt_shirts', name: 'Garment Belt', cost: 62000, x: 585, y: 772, icon: 'icon_belt' },
  { id: 'loader2', name: 'Hire Amaka', sub: 'Loads the trucks', cost: 78000, x: 680, y: 312, icon: 'icon_loader' },
  { id: 'bags', name: 'Bag Line', sub: 'Leather handbags', cost: 98000, x: 200, y: 1060, icon: 'icon_bags' },
  { id: 'bay3', name: 'Bay 3', sub: 'Trailers to Lagos & Kano', cost: 125000, x: 200, y: 300, icon: 'icon_truck' },
  { id: 'belt_bags', name: 'Bag Belt', cost: 155000, x: 500, y: 982, icon: 'icon_belt' },
  { id: 'manager', name: 'Hire Mrs. Okafor', sub: 'Factory manager', cost: 200000, x: 840, y: 1060, icon: 'icon_manager' },
  { id: 'sign', name: 'MADE IN ABA Sign', sub: 'The finest factory in Aba', cost: 300000, x: 166, y: 528, icon: 'icon_factory' },
];

export const FACTORY_UPGRADES = [
  { id: 'carry', name: 'Bigger Trolley', desc: 'Carry +1 carton', icon: 'icon_tray', base: 2500, mult: 1.42, max: 20 },
  { id: 'speed', name: 'Safety Boots', desc: 'Walk 6% faster', icon: 'icon_shoe', base: 3000, mult: 1.45, max: 15, step: 0.06 },
  { id: 'cook', name: 'Faster Lines', desc: 'Lines run 10% faster', icon: 'icon_fire', base: 3500, mult: 1.45, max: 20 },
  { id: 'price', name: 'Made-in-Aba Quality', desc: 'Prices +15%', icon: 'icon_star', base: 4500, mult: 1.55, max: 40 },
  { id: 'patience', name: 'Dispatch Phone', desc: 'Buyers wait 10% longer', icon: 'icon_fan', base: 5000, mult: 1.6, max: 12 },
  { id: 'staff', name: 'Staff Training', desc: 'Staff 12% faster', icon: 'icon_loader', base: 7000, mult: 1.5, max: 20, needs: 'attendant' },
  { id: 'safe', name: 'Bigger Safe', desc: 'Holds more while you\'re away', icon: 'icon_safe', base: 15000, mult: 1.7, max: 15, needs: 'loader1' },
];

// ---------- "Give back to Aba": community projects ----------
// The money sink for rich players. Each level is a real gift to the city and gives a small
// permanent bonus to EVERY branch. Costs double each level, so there is always a next project.
export const PROJECTS = [
  { id: 'road', name: 'Fix Faulks Road', desc: '+5% customers', icon: 'icon_proj_road', base: 25000, mult: 2, max: 15, per: 0.05, kind: 'demand' },
  { id: 'water', name: 'Community Borehole', desc: 'Customers wait 5% longer', icon: 'icon_proj_water', base: 40000, mult: 2, max: 15, per: 0.05, kind: 'patience' },
  { id: 'solar', name: 'Solar for Ariaria Market', desc: '+10% earned while away', icon: 'icon_proj_solar', base: 60000, mult: 2, max: 15, per: 0.1, kind: 'away' },
  { id: 'school', name: 'Scholarship Fund', desc: 'Staff 5% faster', icon: 'icon_proj_school', base: 80000, mult: 2, max: 15, per: 0.05, kind: 'staff' },
  { id: 'league', name: 'Sponsor the Youth League', desc: 'Prices +4%', icon: 'icon_proj_league', base: 120000, mult: 2, max: 15, per: 0.04, kind: 'price' },
  { id: 'traders', name: 'Loans for Small Traders', desc: 'Cash boxes +25%', icon: 'icon_proj_traders', base: 150000, mult: 2, max: 15, per: 0.25, kind: 'cap' },
];
/** what the city calls you, by total project levels */
export const HONOURS = [[0, ''], [1, 'Good Neighbour'], [6, 'Community Builder'], [16, 'Pride of Aba'], [36, 'Enyimba City Legend'], [70, 'Father of the City']];
// projects appear once the player owns the Buka or has this much cash
export const PROJECTS_SHOW_CASH = 20000;

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
    blurb: 'Table service at Ariaria Market.',
    cost: 3000, requires: 'sign', requiresText: 'Needs the Neon Sign at Faulks Road',
    goalScale: 4, xpScale: 1,
    automation: { waiter1: 0.3, waiter2: 0.2, cleaner: 0.3, kloader: 0.1, generator: 0.1 },
    baseRate: 9, capBase: 8000,
  },
  lounge: {
    key: 'lounge', name: 'GRA Lounge', full: 'GRA Lounge', area: 'GRA', icon: 'icon_lounge',
    unlocks: LOUNGE_UNLOCKS, upgrades: LOUNGE_UPGRADES,
    cost: 25000, requires: 'generator', requiresBranch: 'buka', requiresText: 'Needs the Buka\'s Generator & Lights',
    blurb: 'A high-end 3D restaurant in GRA.',
    pitch: 'A high-end 3D restaurant in GRA. Seat guests, serve, book parties.',
    goalScale: 15, xpScale: 1,
    automation: { host: 0.15, waiter1: 0.25, waiter2: 0.2, busser: 0.2, washer: 0.05, planner: 0.1, manager: 0.05 },
    baseRate: 38, capBase: 40000,
  },
  factory: {
    key: 'factory', name: 'Chop Factory', full: 'Chop Factory', area: 'Aba', icon: 'icon_factory',
    unlocks: FACTORY_UNLOCKS, upgrades: FACTORY_UPGRADES,
    cost: 60000, requires: 'generator', requiresBranch: 'buka', requiresText: 'Needs the Buka\'s Generator & Lights',
    blurb: 'Your own made-in-Aba factory.',
    pitch: 'Palm oil, soap, shoes, shirts and bags. Sell to traders and trucks.',
    goalScale: 40, xpScale: 1,
    automation: { attendant: 0.3, loader1: 0.25, loader2: 0.15, belt_oil: 0.04, belt_soap: 0.04, belt_shoes: 0.04, belt_shirts: 0.04, belt_bags: 0.04, electrician: 0.05, manager: 0.05 },
    baseRate: 110, capBase: 150000,
  },
};
export const BRANCH_ORDER = ['stand', 'buka', 'lounge', 'factory'];

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
