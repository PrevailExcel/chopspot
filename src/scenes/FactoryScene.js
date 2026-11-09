import Phaser from 'phaser';
import { WORLD, ITEMS, PLAYER, FACTORY, FACTORY_UNLOCKS, COLORS } from '../config.js';
import { img } from '../art.js';
import { Customer } from '../entities/Customer.js';
import { Worker, Manager } from '../entities/Helpers.js';
import { Vehicle } from '../entities/Bus.js';
import { Producer } from '../objects/Producer.js';
import { Pile } from '../objects/Pile.js';
import { Zone } from '../objects/Zone.js';
import { Belt } from '../objects/Belt.js';
import { fly } from '../objects/Fly.js';
import { label, money } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { NavGrid } from '../lounge/nav.js';
import { Haptic } from '../platform.js';
import BranchScene from './BranchScene.js';

const F = FACTORY;
const PRODUCTS = ['oil', 'soap', 'shoes', 'shirts', 'bags'];
const LOOKS = {
  chinedu: { skin: 0x6b4226, shirt: 0x2c7be5, pattern: 0xffffff, dress: false, hair: 'short', hairColor: 0x140d09, pants: 0x1e1e24, scale: 1.26 },
  ikenna: { skin: 0x5c3a21, shirt: 0xff7a1a, pattern: 0x2a3550, dress: false, hair: 'cap', hairColor: 0xffd23f, pants: 0x2a3550, scale: 1.28 },
  amaka: { skin: 0x8d5a36, shirt: 0xffc928, pattern: 0x2a3550, dress: false, hair: 'braids', hairColor: 0x1b120c, pants: 0x2a3550, scale: 1.24 },
  sunday: { skin: 0x4a2e1b, shirt: 0x2bb34a, pattern: 0xffd23f, dress: false, hair: 'cap', hairColor: 0xff7a1a, pants: 0x3a5f8f, scale: 1.27 },
  okafor: { skin: 0xa86b45, shirt: 0x7b2d8b, pattern: 0xffd23f, dress: true, hair: 'wrap', hairColor: 0x7b2d8b, wrapPattern: 0xffd23f, pants: 0x222222, scale: 1.26 },
};
const one = (k) => ITEMS[k].one || ITEMS[k].name.toLowerCase();
const many = (k, n) => (n === 1 ? one(k) : ITEMS[k].plural);

/**
 * Branch 4: Chop Factory. Lines make finished goods (palm oil, soap, shoes, shirts, handbags).
 * Sell them to traders at the factory shop, or load trucks for markets across Nigeria.
 * Belts carry each line's cartons to the dispatch rack beside the loading bays.
 * Built to be smoother than Faulks Road: bigger trolley, quicker hands, tap to walk,
 * traders pay at the counter, cash flies to you from further away, and trucks are patient.
 */
export default class FactoryScene extends BranchScene {
  constructor() { super('factory'); }

  // ===================================================================
  // world
  buildWorld() {
    this.queue = [];
    this.trucks = [];
    this.belts = {};
    this.staff = {};
    this.spawnTimer = 1.5;
    this.power = { next: F.power.first, left: 0, gen: false, cuts: 0 };
    this.buildGround();
    this.buildFence();
    this.buildDecor();
    this.buildStatic();
  }

  buildGround() {
    const tile = (x, y, w, h, key) => this.add.tileSprite(x, y, w, h, key).setOrigin(0).setDepth(-1000).setTileScale(0.5, 0.5);
    tile(-900, -600, WORLD.w + 1800, WORLD.h + 1400, 'g_stripes').tilePositionX = 900 * 2;
    const g = this.add.graphics().setDepth(-999);
    // the road at the back where trucks pull in, and the street at the front
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, -10, WORLD.w + 1800, 30);
    g.fillStyle(COLORS.road, 1); g.fillRect(-900, 20, WORLD.w + 1800, 180);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, 196, WORLD.w + 1800, 22);
    g.fillStyle(0xf5d742, 1); for (let x = -900; x < WORLD.w + 900; x += 90) g.fillRoundedRect(x, 106, 50, 8, 4);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, 1395, WORLD.w + 1800, 44);
    g.fillStyle(COLORS.road, 1); g.fillRect(-900, 1439, WORLD.w + 1800, 220);
    g.fillStyle(0xffffff, 0.85); for (let x = -900; x < WORLD.w + 900; x += 90) g.fillRoundedRect(x, 1545, 50, 8, 4);
    // factory floor
    const x1 = 44, x2 = 956, y1 = 218, y2 = 1362;
    g.fillStyle(0x9ea19b, 1); g.fillRect(x1 - 6, y1, x2 - x1 + 12, y2 - y1 + 6);
    tile(x1, y1, x2 - x1, y2 - y1, 'g_concrete').setDepth(-998);
    const m = this.add.graphics().setDepth(-997);
    // yellow loading-bay boxes and walkway lines
    m.lineStyle(5, 0xffd23f, 0.9);
    for (const b of F.bays) m.strokeRoundedRect(b.zone.x - 92, 232, 184, 120, 10);
    m.fillStyle(0xffd23f, 0.85);
    for (let y = 520; y < 1180; y += 34) { m.fillRect(352, y, 4, 18); m.fillRect(644, y, 4, 18); }
    for (let x = 70; x < 940; x += 34) m.fillRect(x, 1100, 18, 4);
    // the gate path down to the street
    m.fillStyle(0x8e918b, 1); m.fillRoundedRect(430, 1362, 140, 36, 6);
  }

  buildFence() {
    const add = (x, y) => img(this, x, y, 'd_post').setDepth(y + 0.5);
    const row = (y, xa, xb, gaps) => {
      let prev = null;
      for (let x = xa; x <= xb; x += 46) {
        if (gaps.some(([g1, g2]) => x > g1 && x < g2)) { prev = null; continue; }
        add(x, y);
        if (prev != null) img(this, prev, y, 'd_rail_h').setDepth(y + 0.4);
        prev = x;
      }
    };
    // wide gaps at the back for the three bays, one gate at the front for traders
    row(214, 40, 960, [[90, 320], [400, 640], [700, 940]]);
    row(1362, 40, 960, [[420, 580]]);
    for (let y = 214 + 46; y < 1362; y += 46) {
      add(40, y); add(960, y);
      img(this, 40, y - 10, 'd_rail_v').setDepth(y + 0.4); img(this, 960, y - 10, 'd_rail_v').setDepth(y + 0.4);
    }
  }

  buildDecor() {
    const rnd = new Phaser.Math.RandomDataGenerator(['chopfactory']);
    const put = (x, y, key, s = 1) => img(this, x, y, key).setDepth(y).setScale(0.5 * s);
    [[-60, 330], [-120, 620], [-50, 900], [-110, 1180], [1060, 300], [1120, 600], [1050, 880], [1110, 1200]].forEach(([x, y], i) => put(x, y, i % 3 === 1 ? 'd_tree' : 'd_palm', 1.1));
    for (let y = 300; y < 1340; y += 130) { put(5, y + rnd.between(-20, 20), 'd_bush', 0.9); put(995, y + rnd.between(-20, 20), 'd_bush', 0.9); }
    for (let i = 0; i < 80; i++) {
      const side = rnd.pick([-1, 1]);
      const x = side < 0 ? rnd.between(-500, 20) : rnd.between(980, 1500), y = rnd.between(240, 1380);
      put(x, y, rnd.pick(['d_tuft', 'd_flower', 'd_tuft', 'd_stone']), 1);
    }
    put(420, 1392, 'd_pot'); put(580, 1392, 'd_pot');
    const prop = (x, y, key, w, h) => { put(x, y, key); this.addCollider({ x1: x - w / 2, x2: x + w / 2, y1: y - h, y2: y + 4 }); };
    prop(90, 760, 'd_drum', 40, 16); prop(90, 940, 'd_sacks', 64, 22); prop(910, 960, 'd_drum', 40, 16);
  }

  buildStatic() {
    // dispatch rack between the lines and the bays
    const R = F.rack;
    img(this, 500, R.y + 6, 'm_rack').setDepth(R.y);
    this.addCollider({ x1: R.x1, x2: R.x2, y1: R.y - 38, y2: R.y + 4 });
    this.rack = {};
    for (const [type, x] of Object.entries(R.slots)) {
      const pile = new Pile(this, x, R.y - 14, { layout: 'slot', type, depth: R.y + 1, cap: R.cap });
      this.rack[type] = { type, pile, cap: R.cap, get count() { return pile.count; } };
    }
    this.rackZone = new Zone(this, R.zone, { color: 0xff9a1a });
    // factory shop: traders buy at the counter and pay right there (no till to stand at)
    const S = F.shop;
    img(this, 500, S.counter.y2 + 4, 'm_shopcounter').setDepth(S.counter.y2);
    this.addCollider(S.counter);
    this.shelves = {};
    for (const [type, x] of Object.entries(S.shelves)) {
      const pile = new Pile(this, x, S.counter.y1 + 8, { layout: 'slot', type, depth: S.counter.y2 + 1, cap: S.shelfCap });
      this.shelves[type] = { type, pile, cap: S.shelfCap, get count() { return pile.count; } };
    }
    this.dropZone = new Zone(this, S.dropZone);
    this.tillCash = this.addCashPile(S.cash.x, S.cash.y, { maxVisual: 18, zoneR: 82, unit: 120 });
    // generator for when NEPA takes light
    const G = F.generator;
    this.genImg = img(this, G.x, G.y, 'm_generator').setDepth(G.y);
    this.addCollider({ x1: G.x - 46, x2: G.x + 46, y1: G.y - 26, y2: G.y + 8 });
    this.genZone = new Zone(this, G.zone, { color: 0xffd23f });
    this.genZone.setVisible(false);
    this.dark = this.add.rectangle(-900, -600, WORLD.w + 1800, WORLD.h + 1400, 0x0b1430, 0).setOrigin(0).setDepth(24000).setVisible(false);
    this.genSmoke = this.add.particles(G.x + 30, G.y - 70, 'fx_soft', {
      speedY: { min: -50, max: -25 }, speedX: { min: -8, max: 14 }, scale: { start: 0.25, end: 0.8 }, alpha: { start: 0.4, end: 0 },
      tint: 0x777777, lifespan: 1500, frequency: 200, emitting: false,
    }).setDepth(G.y + 2);
    this.buyerLabels = {};
  }

  buildUnlock(id, animate) {
    if (F.lines[id]) {
      const p = new Producer(this, id, F.lines[id], this.b.prod[id] ?? null);
      this.producers[id] = p;
      this.addCollider(p.rect);
      if (animate) p.popIn();
      return;
    }
    if (id.startsWith('belt_')) {
      const type = id.slice(5);
      const src = this.producers[type];
      if (!src) return;
      this.belts[type] = new Belt(this, type, F.belts[type], src, this.rack[type], { every: F.beltEvery, speed: F.beltSpeed });
      if (animate) this.belts[type].parts.forEach((p) => { p.setAlpha(0); this.tweens.add({ targets: p, alpha: 1, duration: 500 }); });
      return;
    }
    const bay = F.bays.find((b) => b.unlock === id);
    if (bay) { this.buildTruck(bay, animate); return; }
    if (id === 'booth') {
      const B = F.booth;
      const im = img(this, B.x, B.y, 'm_booth').setDepth(B.y);
      this.boothZone = new Zone(this, B.zone, { color: 0x2c7be5 });
      this.addCollider({ x1: B.x - 56, x2: B.x + 50, y1: B.y - 34, y2: B.y + 10 });
      if (animate) this.popObj(im);
      return;
    }
    if (id === 'sign') { this.buildSign(animate); return; }
    const hire = {
      attendant: () => new Attendant(this, 560, 1080, LOOKS.chinedu, 'Chinedu'),
      loader1: () => new TruckLoader(this, 380, 400, LOOKS.ikenna, 'Ikenna'),
      loader2: () => new TruckLoader(this, 640, 400, LOOKS.amaka, 'Amaka'),
      electrician: () => new Electrician(this, 800, 1290, LOOKS.sunday, 'Sunday · Electrician'),
      manager: () => {
        const O = F.office;
        const im = img(this, O.x, O.y, 'm_office').setDepth(O.y);
        this.addCollider({ x1: O.x - 58, x2: O.x + 58, y1: O.y - 40, y2: O.y + 8 });
        if (animate) this.popObj(im);
        return new Manager(this, O.x, O.y + 50, LOOKS.okafor, 'Mrs. Okafor · Manager');
      },
    }[id];
    if (hire) {
      const h = hire();
      this.staff[id] = h; this.helpers.push(h);
      if (animate) this.popObj(h.rig, h.rig.scaleX);
    }
  }

  buildTruck(cfg, animate) {
    const v = new Vehicle(this, { ...cfg, label: `A ${cfg.kind.toLowerCase()}`, bayText: 'Load the order in the yellow bay', depthBias: cfg.id === 'bay3' ? -3 : cfg.id === 'bay2' ? -2 : -1 });
    v.cashPile = this.addCashPile(cfg.cash.x, cfg.cash.y, { maxVisual: 14, zoneR: 96, unit: 400 });
    v.buyerTag = label(this, 0, 0, '', { size: 14, color: '#ffffff', stroke: '#1d2a3a', sw: 5 }).setDepth(30001).setVisible(false);
    if (animate) v.timer = 1.2;
    this.trucks.push(v);
  }

  buildSign(animate) {
    const S = F.sign;
    const im = img(this, S.x, S.y, 'm_madeinaba').setDepth(S.y);
    this.addCollider({ x1: S.x - 60, x2: S.x + 60, y1: S.y - 14, y2: S.y + 6 });
    const top = S.y - 210;
    const l1 = this.signText(S.x, top + 30, () => this.ownerTitle(), { size: 18, color: '#ffffff', stroke: null, depth: S.y + 0.5, glow: '#7dff9a' });
    const l2 = this.signText(S.x, top + 58, () => 'CHOP FACTORY', { size: 20, color: '#ffd23f', stroke: null, depth: S.y + 0.5, glow: '#ffd23f' });
    const l3 = this.signText(S.x, top + 88, () => 'MADE IN ABA', { size: 15, color: '#ffffff', stroke: null, depth: S.y + 0.5 });
    this.add.particles(S.x, S.y - 150, 'fx_star', {
      x: { min: -100, max: 100 }, y: { min: -50, max: 50 }, scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0x7dff9a, 0xffd23f, 0xffffff], lifespan: 900, frequency: 180,
    }).setDepth(S.y + 1);
    if (animate) [im, l1, l2, l3].forEach((o) => this.popObj(o));
  }

  buildSigns() {
    this.signText(500, 1380, () => `${this.ownerTitle()} CHOP FACTORY`, { size: 16, depth: 1399 });
    img(this, 880, 212, 'd_roadsign').setDepth(212);
    this.signText(880, 142, () => 'PORT HARCOURT ROAD', { size: 12, color: '#ffffff', stroke: null, depth: 213 });
    img(this, 770, 1418, 'd_roadsign').setDepth(1418);
    this.signText(770, 1348, () => 'ABA-OWERRI ROAD', { size: 12, color: '#ffffff', stroke: null, depth: 1419 });
  }

  restore() {
    const b = this.b; const sh = b.shelves || {}; const rk = b.rack || {}; const pl = b.piles || {};
    for (const k of PRODUCTS) {
      this.shelves[k].pile.add(Math.min(sh[k] || 0, F.shop.shelfCap), false);
      this.rack[k].pile.add(Math.min(rk[k] || 0, F.rack.cap), false);
    }
    this.tillCash.restore(pl.till || 0);
    for (const v of this.trucks) v.cashPile.restore(pl['bay_' + v.cfg.id] || 0);
  }

  saveBranch() {
    const b = this.b;
    b.shelves = {}; b.rack = {};
    for (const k of PRODUCTS) { b.shelves[k] = this.shelves[k].count; b.rack[k] = this.rack[k].count; }
    // cartons still riding a belt land on the rack in the save
    for (const [k, belt] of Object.entries(this.belts)) b.rack[k] = Math.min(F.rack.cap, b.rack[k] + belt.inFlight);
    for (const v of this.trucks) b.piles['bay_' + v.cfg.id] = v.cashPile.value;
  }

  afterCreate() {
    this.setupTaps();
    if (this.b.tut === 0 && this.b.stats.served === 0 && !this.queue.length) this.spawnTrader({ oil: 2 }, true);
    this.cameras.main.setBackgroundColor(0x7cc35a);
  }

  // ===================================================================
  // rules and numbers
  startIds() { return ['oil']; }
  tutorialDone() { return this.b.tut >= 5; }
  finaleId() { return 'sign'; }
  walkBounds() { return F.bounds; }
  carryCap() { return F.carry + this.b.up.carry; }
  playerSpeed() { return PLAYER.speed * 1.08 * (1 + 0.06 * this.b.up.speed); }
  staffSpeed() { return F.staffSpeed * this.staffMult(); }
  staffCarry() { return F.staffCarry + Math.floor(this.b.up.staff * 0.6); }
  vehicleWaitMult() { return super.vehicleWaitMult() * 1.15; }
  get powerOut() { return this.power.left > 0 && !this.power.gen; }
  cookMult() { return super.cookMult() * (this.powerOut ? F.power.slow : 1); }
  products() { return PRODUCTS.filter((k) => this.producers[k]); }

  /** walking routes for staff and tap-to-walk: grid pathfinding around machines, the rack and the counter */
  addCollider(r) { super.addCollider(r); this.navDirty = true; }
  route(a, b) {
    if (!this.nav) this.nav = new NavGrid({ x0: 0, y0: 200, x1: 1000, y1: 1500, cell: 20 });
    if (this.navDirty !== false) {
      const B = F.bounds; const X = 5000;
      const walls = [{ x1: -X, y1: -X, x2: B.x1, y2: X }, { x1: B.x2, y1: -X, x2: X, y2: X }, { x1: -X, y1: -X, x2: X, y2: B.y1 }, { x1: -X, y1: B.y2, x2: X, y2: X }];
      this.nav.rebuild([...this.colliders, ...walls]); this.navDirty = false;
    }
    return this.nav.path(a, b);
  }

  goalTemplates() {
    const has = (id) => this.isUnlocked(id);
    return [
      { kind: 'serve', text: (n) => `Serve ${n} traders`, target: (t) => 8 + 4 * t },
      { kind: 'earn', text: (n) => `Collect ${money(n)}`, target: (t) => Math.round(3000 * Math.pow(1.3, t) / 100) * 100, weight: 1.2 },
      { kind: 'item:oil', text: (n) => `Sell ${n} kegs of palm oil`, target: (t) => 14 + 6 * t },
      { kind: 'item:soap', text: (n) => `Sell ${n} cartons of soap`, target: (t) => 12 + 5 * t, ok: has('soap') },
      { kind: 'item:shoes', text: (n) => `Sell ${n} boxes of Aba shoes`, target: (t) => 8 + 4 * t, ok: has('shoes') },
      { kind: 'item:shirts', text: (n) => `Sell ${n} bales of shirts`, target: (t) => 8 + 4 * t, ok: has('shirts') },
      { kind: 'item:bags', text: (n) => `Sell ${n} cartons of handbags`, target: (t) => 6 + 3 * t, ok: has('bags') },
      { kind: 'vehicle', text: (n) => `Fill ${n} truck order${n > 1 ? 's' : ''}`, target: (t) => 1 + Math.floor(t / 2), ok: has('bay1'), weight: 1.4 },
      { kind: 'streak', text: (n) => `Serve ${n} traders in a row with no walkouts`, target: (t) => 6 + 2 * t, weight: 1.3, ok: this.b.fame.lvl >= 3 },
      { kind: 'rush', text: (n) => `Serve ${n} traders during a rush hour`, target: (t) => 4 + 2 * t, ok: this.unlockCount() >= 3, weight: 1.3 },
    ];
  }

  // ===================================================================
  // trucks
  makeVehicleOrder(v) {
    const menu = this.products();
    const cfg = v.cfg;
    const [lo, hi] = cfg.size;
    const lvl = this.unlockCount() / FACTORY_UNLOCKS.length;
    let total = Math.round(lo + (hi - lo) * Math.min(1, lvl * 1.2 + Math.random() * 0.4)) + this.extraItems();
    const kinds = Phaser.Utils.Array.Shuffle([...menu]).slice(0, Math.min(menu.length, cfg.id === 'bay1' ? 1 + (Math.random() < 0.5 ? 1 : 0) : 2 + Math.floor(Math.random() * 2)));
    const o = {};
    kinds.forEach((k, i) => { const n = i === kinds.length - 1 ? total : Math.max(1, Math.round(total / (kinds.length - i) * (0.7 + Math.random() * 0.6))); o[k] = n; total -= n; });
    for (const k of Object.keys(o)) if (o[k] <= 0) delete o[k];
    v.buyer = Phaser.Utils.Array.GetRandom(cfg.buyers);
    v.buyerTag.setText(v.buyer);
    return o;
  }

  truckReward(v) {
    return Math.round(v.types.reduce((n, k) => n + v.order[k] * ITEMS[k].price, 0) * v.cfg.bonus * this.priceMult());
  }

  loadTruck(v, type, from) {
    this.fly(ITEMS[type].tex, from, { x: v.im.x + Phaser.Math.Between(-60, 60), y: v.im.y - 60 }, { duration: 230, arc: 50 });
    Sound.play('drop', { n: 2 });
    this.track('item:' + type, 1);
    const done = v.load(type);
    if (done) {
      const amt = this.truckReward(v);
      this.time.delayedCall(300, () => {
        v.cashPile.deposit(amt, { x: v.im.x, y: v.im.y - 60 });
        this.floatText(v.im.x, v.im.y - 200, `${v.buyer} +${money(amt)}`, '#bdf7a8', 24);
        Sound.play('cash'); Haptic.tap('heavy');
      });
      this.gs.stats.buses++; this.b.stats.vehicles++; this.b.vehicleIntro = true;
      this.addXP(5);
      this.track('vehicle', 1);
    }
  }

  /** a late truck still pays fair price for what it got (smoother than the shuttle's half) */
  onVehicleTimeout(v, frac) {
    const part = Math.round(this.truckReward(v) * frac * 0.8);
    if (part > 0) v.cashPile.deposit(part, { x: v.im.x, y: v.im.y - 60 });
    this.floatText(v.im.x, v.im.y - 200, part > 0 ? `Had to go. +${money(part)}` : 'The truck had to go', '#ffe9c8', 22);
    Sound.play('deny');
    this.b.vehicleIntro = true;
  }

  /** what every waiting truck still needs, minus what loaders already carry */
  truckWant(type) {
    let n = 0;
    for (const v of this.trucks) if (v.waiting) n += Math.max(0, v.needs(type));
    for (const h of this.helpers) if (h instanceof TruckLoader) n -= h.rig.countOf(type);
    return n;
  }

  // ===================================================================
  // traders at the factory shop
  slotPos(i) { const S = F.shop; return { x: S.orderSpot.x, y: S.orderSpot.y + i * S.gap }; }

  spawnTrader(order = null, instant = false) {
    const menu = this.products();
    if (!order) {
      order = {};
      const kinds = Phaser.Utils.Array.Shuffle([...menu]).slice(0, Math.random() < 0.55 || menu.length < 2 ? 1 : 2);
      kinds.forEach((k) => { order[k] = Phaser.Math.Between(1, 3 + Math.floor(this.extraItems() / 2)); });
    }
    const fromLeft = Math.random() < 0.5;
    const c = new Customer(this, fromLeft ? -60 : WORLD.w + 60, 1490 + Phaser.Math.Between(-12, 12), order, F.shop.traders.speed);
    const slot = this.queue.length;
    this.queue.push(c); this.customers.push(c);
    c.state = 'walk'; c.slot = slot;
    if (instant) { c.rig.setPosition(F.shop.orderSpot.x, 1420); c.goTo([this.slotPos(slot)], () => this.arriveSlot(c)); }
    else c.goTo([{ x: F.shop.orderSpot.x, y: 1490 }, this.slotPos(slot)], () => this.arriveSlot(c));
    return c;
  }

  arriveSlot(c) {
    c.state = c.slot === 0 ? 'ordering' : 'queue';
    c.refreshBubble(); c.bubble.show(c.state === 'ordering');
    // traders are patient; from fame 3 they will eventually give up
    if (c.state === 'ordering' && this.b.fame.lvl >= 3 && c.patience == null) c.startPatience(F.shop.traders.patience * this.patienceMult());
  }

  reslot() {
    this.queue.forEach((c, i) => {
      if (c.slot === i) return;
      c.slot = i;
      c.state = 'walk';
      c.goTo([this.slotPos(i)], () => this.arriveSlot(c));
    });
  }

  updateTraders(dt) {
    const S = F.shop;
    const spawnEvery = S.traders.spawnEvery / (1 + 0.12 * (this.products().length - 1)) / this.demandMult();
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnEvery * (0.8 + Math.random() * 0.4);
      if (this.queue.length < S.max && this.tutorialDone()) this.spawnTrader();
    }
    const front = this.queue[0];
    if (front && front.state === 'ordering' && front.arrived) {
      front.takeTimer -= dt;
      if (front.takeTimer <= 0) {
        for (const k of front.types) {
          if (front.needs(k) > 0 && this.shelves[k].count > 0) {
            front.takeTimer = S.traders.take;
            const from = this.shelves[k].pile.take();
            front.give(k); front.refreshBubble();
            fly(this, ITEMS[k].tex, from, () => ({ x: front.x, y: front.y - 50 }), { duration: 200, arc: 30, onDone: () => { Sound.play('pop'); if (!front.dead) front.rig.squash(); } });
            break;
          }
        }
      }
      if (front.complete) this.payTrader(front);
      else if (front.tickPatience(dt)) { this.queue.shift(); this.walkout(front); this.leave(front); this.reslot(); }
    }
    for (const c of this.customers) c.update(dt);
    this.customers = this.customers.filter((c) => !c.dead);
  }

  payTrader(c) {
    this.queue.shift();
    const amount = Math.max(1, Math.round(c.total * this.priceMult()));
    c.stopPatience();
    this.tillCash.deposit(amount, { x: c.x, y: c.y - 50 });
    this.floatText(c.x, c.y - 120, `+${money(amount)}`, '#bdf7a8');
    Sound.play('cash'); Haptic.tap('medium');
    this.served(1);
    c.types.forEach((k) => this.track('item:' + k, c.order[k]));
    c.bubble.set([{ icon: 'icon_happy', n: null }]); c.bubble.pulse();
    Sound.play('happy');
    this.time.delayedCall(700, () => { if (!c.dead) c.bubble.show(false); });
    if (this.b.tut === 2) this.b.tut = 3;
    this.leave(c);
    this.reslot();
  }

  leave(c) {
    c.state = 'leaving'; c.stopPatience();
    const exitX = Math.random() < 0.5 ? -80 : WORLD.w + 80;
    c.goTo([{ x: c.x + (c.x < 500 ? -40 : 40), y: 1420 }, { x: F.shop.orderSpot.x + (exitX < 0 ? -30 : 30), y: 1500 }, { x: exitX, y: 1505 }], () => c.destroy());
  }

  // ===================================================================
  // power cuts: mild by design. Lines slow to half (never stop), and only after the shoe line is up.
  updatePower(dt) {
    const P = this.power; const C = F.power;
    if (!this.tutorialDone() || !this.isUnlocked('shoes')) return;
    if (P.left > 0) {
      P.left -= dt;
      if (P.left <= 0) {
        P.left = 0; P.gen = false;
        P.next = Phaser.Math.Between(C.every[0], C.every[1]);
        this.genSmoke.stop(); this.genZone.setVisible(false);
        this.game.events.emit('toast', 'Light is back!');
      }
    } else {
      P.next -= dt;
      if (P.next <= 0) {
        P.left = C.length; P.gen = false; P.cuts++;
        this.genZone.setVisible(true);
        Sound.play('deny');
        this.game.events.emit('toast', this.staff.electrician ? 'NEPA took light. Sunday is starting the generator' : 'NEPA took light! Lines are slow. Start the generator');
      }
    }
    const want = this.powerOut ? 0.2 : 0;
    if (want || this.dark.visible) {
      this.dark.fillAlpha += (want - this.dark.fillAlpha) * Math.min(1, dt * 3);
      this.dark.setVisible(this.dark.fillAlpha > 0.004);
    }
  }

  startGenerator(by) {
    const P = this.power;
    if (P.left <= 0 || P.gen) return;
    P.gen = true;
    this.genSmoke.start(); this.genZone.setVisible(false);
    this.tweens.add({ targets: this.genImg, scaleY: 0.46, duration: 70, yoyo: true, repeat: 3 });
    Sound.play('upgrade'); Haptic.tap('medium');
    this.floatText(F.generator.x, F.generator.y - 110, by === this.player ? 'Generator on!' : 'Sunday started the gen', '#fff3b0', 20);
  }

  // ===================================================================
  // per frame
  updateBranch(dt) {
    this.rackZone.update(dt); this.dropZone.update(dt); this.genZone.update(dt);
    this.updateTraders(dt);
    this.updatePower(dt);
    const beltMult = this.cookMult();
    for (const belt of Object.values(this.belts)) belt.update(dt, Math.max(0.6, beltMult));
    for (const v of this.trucks) {
      v.update(dt);
      const show = v.waiting && !!v.buyer;
      v.buyerTag.setVisible(show);
      if (show) v.buyerTag.setPosition(v.im.x, v.im.y - v.cfg.bubbleY - 74);
    }
    this.followTap(dt);
  }

  // ===================================================================
  // what the player does here
  playerPick(pr) { super.playerPick(pr); this.pickCool = F.pickEvery; }

  interactBranch() {
    const p = this.player; const b = this.b;
    // dispatch rack: picks what the trucks (then the shop) need, so you never grab the wrong cartons
    const atRack = this.rackZone.contains(p.x, p.y);
    this.rackZone.setActive(atRack);
    if (atRack && this.pickCool <= 0 && p.carryCount < this.carryCap()) {
      const k = this.bestRackPick();
      if (k) {
        this.pickCool = F.pickEvery;
        const from = this.rack[k].pile.take();
        const im = p.addCarry(k); im.setVisible(false);
        this.fly(ITEMS[k].tex, from, () => p.stackTopWorld(), { duration: 160, arc: 36, onDone: () => im.active && im.setVisible(true) });
        Sound.play('pick', { n: p.carryCount }); Haptic.tap('light');
      }
    }
    // shop counter
    const atShop = this.dropZone.contains(p.x, p.y);
    this.dropZone.setActive(atShop);
    if (atShop && this.dropCool <= 0 && p.carryCount > 0) {
      for (let i = p.carryItems.length - 1; i >= 0; i--) {
        const k = p.carryItems[i].type; const sh = this.shelves[k];
        if (sh && sh.count < sh.cap) {
          this.dropCool = F.dropEvery;
          this.toShelf(k, p.removeCarry(k));
          Haptic.tap('light');
          if (b.tut === 1 && k === 'oil') b.tut = 2;
          break;
        }
      }
    }
    // trucks
    for (const v of this.trucks) {
      const inBay = v.waiting && v.zone.contains(p.x, p.y);
      v.zone.setActive(inBay);
      if (!inBay || this.dropCool > 0) continue;
      const k = v.types.find((t) => v.needs(t) > 0 && p.countOf(t) > 0);
      if (k) { this.dropCool = F.dropEvery; this.loadTruck(v, k, p.removeCarry(k)); Haptic.tap('light'); }
    }
    // generator
    if (this.power.left > 0 && !this.power.gen && this.genZone.contains(p.x, p.y)) this.startGenerator(p);
    // tutorial: cash collected from the counter
    if (b.tut === 3 && this.tillCash.value <= 0) { b.tut = 5; this.ensureGoals(); this.game.events.emit('toast', 'Chop Factory is open for business!'); this.confetti(p.x, p.y); }
  }

  toShelf(k, from, who = null) {
    const sh = this.shelves[k];
    const made = sh.pile.add(1, false)[0];
    if (made) { made.setVisible(false); this.fly(ITEMS[k].tex, from, { x: made.x, y: made.y }, { duration: 180, arc: 30, onDone: () => made.active && made.setVisible(true) }); }
    if (!who) Sound.play('drop', { n: sh.count });
  }

  /** shop shelves that are short, weighted by what the trader at the counter wants */
  shopWant(type) {
    const sh = this.shelves[type]; const front = this.queue[0];
    // what the traders in line want comes first; then keep a few of everything on the counter
    let need = front ? Math.max(0, front.needs(type)) : 0;
    for (const c of this.queue.slice(1)) need += Math.max(0, c.order[type] || 0) * 0.5;
    const short = need - sh.count;
    return short > 0 ? 10 + short : Math.min(4, sh.cap - sh.count) * (sh.count < 4 ? 1 : 0.4);
  }

  bestRackPick() {
    const p = this.player;
    let best = null, bv = 0;
    for (const k of PRODUCTS) {
      if (!this.rack[k].count) continue;
      const truck = this.truckWant(k) - p.countOf(k);
      const v = truck > 0 ? 100 + truck : Math.max(0, this.shopWant(k) - p.countOf(k));
      if (v > bv) { bv = v; best = k; }
    }
    return best;
  }

  // ===================================================================
  // tap to walk (the joystick and keys still work; using them cancels the walk)
  setupTaps() {
    this.input.on('pointerdown', (ptr) => { this.tapStart = { x: ptr.x, y: ptr.y, t: this.time.now }; });
    this.input.on('pointerup', (ptr) => {
      const s0 = this.tapStart; this.tapStart = null;
      const dpr = this.registry.get('dpr') || 1;
      if (!s0 || Math.hypot(ptr.x - s0.x, ptr.y - s0.y) > 14 * dpr || this.time.now - s0.t > 380) return;
      const ui = this.scene.get('UI');
      if (ui && (ui.modal || ui.titleOpen)) return;
      if (ui && ui.input.hitTestPointer(ptr).length) return;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      this.walkTo(wp.x, wp.y);
    });
  }

  walkTo(x, y) {
    // snap to the nearest useful spot
    const spots = [
      { x: this.rackZone.cx, y: this.rackZone.cy },
      { x: this.dropZone.cx, y: this.dropZone.cy },
      { x: this.tillCash.x, y: this.tillCash.y },
      ...Object.values(this.producers).map((pr) => ({ x: pr.zone.cx, y: pr.zone.cy })),
      ...this.trucks.map((v) => ({ x: v.zone.cx, y: v.zone.cy })),
      ...this.pads.map((pd) => ({ x: pd.x, y: pd.y })),
    ];
    if (this.boothZone) spots.push({ x: this.boothZone.cx, y: this.boothZone.cy });
    if (this.power.left > 0) spots.push({ x: this.genZone.cx, y: this.genZone.cy });
    let best = null, bd = 110;
    for (const s of spots) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
    if (best) { x = best.x; y = best.y; }
    const B = F.bounds;
    x = Phaser.Math.Clamp(x, B.x1 + 10, B.x2 - 10); y = Phaser.Math.Clamp(y, B.y1 + 10, B.y2 - 10);
    this.tapPath = this.route({ x: this.player.x, y: this.player.y }, { x, y });
    if (!this.tapMark) {
      this.tapMark = this.add.graphics().setDepth(3);
      this.tapMark.lineStyle(3, 0xffffff, 0.9); this.tapMark.strokeEllipse(0, 0, 44, 26);
    }
    this.tapMark.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1.3);
    this.tweens.add({ targets: this.tapMark, scale: 1, duration: 180 });
    this.tapStuck = 0;
    Sound.play('click');
  }

  followTap(dt) {
    if (!this.tapPath) return;
    const p = this.player;
    const moved = Math.hypot(p.x - (this.tapLast?.x ?? p.x), p.y - (this.tapLast?.y ?? p.y));
    this.tapLast = { x: p.x, y: p.y };
    this.tapStuck = moved < 0.4 ? this.tapStuck + dt : 0;
    if (this.tapStuck > 0.6) this.stopTap();
  }
  stopTap() { this.tapPath = null; if (this.tapMark) this.tapMark.setVisible(false); }

  readInput() {
    const inp = super.readInput();
    if (Math.hypot(inp.x, inp.y) > 0.1) { if (this.tapPath) this.stopTap(); return inp; }
    const path = this.tapPath;
    if (!path || !path.length) return inp;
    const p = this.player; const t = path[0];
    const dx = t.x - p.x, dy = t.y - p.y; const d = Math.hypot(dx, dy);
    if (d < 10) { path.shift(); if (!path.length) this.stopTap(); return { x: 0, y: 0 }; }
    const sp = Math.min(1, d / 36 + 0.35);
    return { x: (dx / d) * sp, y: (dy / d) * sp };
  }

  // ===================================================================
  // tutorial & hints (Mama Ada still mentors you)
  computeGoal() {
    const b = this.b; const p = this.player;
    const oil = this.producers.oil;
    const zc = (z) => ({ x: z.cx, y: z.cy });
    if (b.tut === 0) {
      if (p.countOf('oil') > 0) b.tut = 1;
      else return { target: zc(oil.zone), text: 'Welcome to your factory! Grab kegs of palm oil from the press' };
    }
    if (b.tut === 1) return { target: zc(this.dropZone), text: 'Stock the shop counter. Traders buy wholesale here' };
    if (b.tut === 2) {
      const front = this.queue[0];
      if (front && !front.complete && this.shelves.oil.count === 0) return { target: p.countOf('oil') ? zc(this.dropZone) : zc(oil.zone), text: 'Your trader wants more palm oil' };
      return { text: 'Traders pay right at the counter. No till to wait at' };
    }
    if (b.tut === 3) return { target: { x: this.tillCash.x, y: this.tillCash.y }, text: 'Pick up your money! Walk near it' };
    return this.freeGoal();
  }

  branchFreeGoal() {
    const p = this.player;
    if (this.power.left > 0 && !this.power.gen && !this.staff.electrician) return { target: { x: this.genZone.cx, y: this.genZone.cy, r: 50 }, text: 'NEPA took light. Start the generator (or wait it out)' };
    // trucks come first: they pay best
    const waiting = this.trucks.filter((v) => v.waiting).sort((a, c) => a.waitLeft - c.waitLeft);
    for (const v of waiting) {
      const bayT = { x: v.zone.cx, y: v.zone.cy, r: 60 };
      const carried = v.types.find((k) => v.needs(k) > 0 && p.countOf(k) > 0);
      if (carried) return { target: bayT, text: `Load the ${v.cfg.kind.toLowerCase()} for ${v.buyer}` };
      if (p.carryCount >= this.carryCap()) continue;
      const k = v.types.find((t) => v.needs(t) > 0);
      if (!k) continue;
      const n = v.needs(k);
      if (this.rack[k].count > 0) return { target: { x: this.rackZone.cx, y: this.rackZone.cy, r: 60 }, text: `${v.buyer} wants ${n} ${many(k, n)}. Grab them at the dispatch rack` };
      const src = this.producersOf(k).sort((a, c) => c.count - a.count)[0];
      if (src) return { target: { x: src.zone.cx, y: src.zone.cy, r: 50 }, text: `${v.buyer} wants ${n} ${many(k, n)}. Pick them up at the line` };
    }
    const front = this.queue[0];
    if (front && front.state === 'ordering') {
      const k = front.types.find((t) => front.needs(t) > 0 && this.shelves[t].count === 0);
      if (k) {
        if (p.countOf(k) > 0) return { target: { x: this.dropZone.cx, y: this.dropZone.cy }, text: `A trader wants ${one(k)}. Stock the counter` };
        const atRack = this.rack[k].count > 0;
        const src = atRack ? { x: this.rackZone.cx, y: this.rackZone.cy } : (() => { const pr = this.producersOf(k).sort((a, c) => c.count - a.count)[0]; return pr ? { x: pr.zone.cx, y: pr.zone.cy } : null; })();
        return { target: src, text: `A trader wants ${ITEMS[k].plural}. Grab some` };
      }
    }
    // nothing urgent: keep the counter stocked, so there is always a next step
    const goods = p.carryItems.find((c) => this.shelves[c.type] && this.shelves[c.type].count < this.shelves[c.type].cap);
    if (goods) return { target: { x: this.dropZone.cx, y: this.dropZone.cy }, text: 'Stock the shop counter', arrow: false };
    const low = this.products().filter((k) => this.shelves[k].count < 4).sort((a, c) => this.shelves[a].count - this.shelves[c].count)[0];
    if (low && p.carryCount < this.carryCap()) {
      const src = this.rack[low].count > 0 ? { x: this.rackZone.cx, y: this.rackZone.cy } : (() => { const pr = this.producersOf(low).sort((a, c) => c.count - a.count)[0]; return pr && pr.count > 0 ? { x: pr.zone.cx, y: pr.zone.cy } : null; })();
      if (src) return { target: src, text: `The counter is low on ${ITEMS[low].plural}`, arrow: false };
    }
    return null;
  }

  /** the first truck explains itself */
  freeGoal() {
    const v = this.trucks.find((x) => x.waiting);
    if (v && !this.b.vehicleIntro) {
      const t = { x: v.zone.cx, y: v.zone.cy };
      if (v.types.some((k) => v.needs(k) > 0 && this.player.countOf(k) > 0)) return { target: t, text: 'Walk into the yellow bay to load the pickup' };
      const g = this.branchFreeGoal();
      if (g) return { ...g, text: `A pickup from ${v.buyer} is here! ${g.text.replace(`${v.buyer} wants`, 'It wants')}` };
    }
    return super.freeGoal();
  }
}

// =====================================================================
// staff
// =====================================================================

/** Chinedu keeps the shop counter stocked from the rack or straight from the lines. */
class Attendant extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.state = 'idle'; this.type = null; }
  sourceFor(k) {
    const sc = this.scene;
    const rack = { pile: sc.rack[k], at: { x: sc.rack[k].pile.x, y: F.rack.zone.y1 + 30 } };
    // spare cartons on the rack (more than the trucks need) come first, then the line, then the rack anyway
    if (sc.rack[k].count > Math.max(0, sc.truckWant(k))) return rack;
    const pr = sc.producersOf(k).filter((x) => x.count > 0).sort((a, b) => b.count - a.count)[0];
    if (pr) return { pile: pr, at: { x: pr.zone.cx, y: pr.zone.cy } };
    return sc.rack[k].count > 0 && sc.trucks.every((v) => !v.waiting || v.needs(k) <= 0) ? rack : null;
  }
  think(dt) {
    const sc = this.scene;
    if (this.state === 'idle') {
      const opts = sc.products().map((k) => ({ k, w: sc.shopWant(k), src: this.sourceFor(k) })).filter((o) => o.w > 0 && o.src);
      if (!opts.length) { if (this.rig.carryCount) this.state = 'toShop'; else this.at(this.home); return; }
      opts.sort((a, b) => b.w - a.w);
      this.type = opts[0].k; this.src = opts[0].src; this.state = 'toSource'; this.wait = 0;
    }
    if (this.state === 'toSource') {
      if (!this.at(this.src.at)) return;
      this.state = 'picking';
    }
    if (this.state === 'picking') {
      this.wait += dt;
      const s = this.src.pile; const sh = sc.shelves[this.type];
      if (this.rig.carryCount < this.cap && s.count > 0 && sh.count + this.rig.carryCount < sh.cap) {
        if (this.cool <= 0) {
          this.cool = 0.14;
          const from = (s.pile || s).take();
          const im = this.rig.addCarry(this.type); im.setVisible(false);
          fly(sc, ITEMS[this.type].tex, from, () => this.rig.stackTopWorld(), { duration: 170, arc: 30, onDone: () => im.active && im.setVisible(true) });
        }
        return;
      }
      this.state = this.rig.carryCount ? 'toShop' : 'idle';
      return;
    }
    if (this.state === 'toShop') {
      const k = this.rig.carryItems.length ? this.rig.carryItems[this.rig.carryItems.length - 1].type : null;
      if (!k) { this.state = 'idle'; return; }
      if (!this.at({ x: F.shop.shelves[k], y: F.shop.dropZone.y1 + 34 })) return;
      if (this.cool > 0) return;
      const sh = sc.shelves[k];
      if (sh.count < sh.cap) { this.cool = 0.12; sc.toShelf(k, this.rig.removeCarry(k), this); return; }
      // shelf filled up meanwhile: put it back on the rack if there is room, else just hold on
      if (this.wait > 6) { this.rig.removeCarry(k); this.wait = 0; }
      this.wait += 0.2;
    }
  }
}

/** Ikenna and Amaka fill the trucks, from the dispatch rack first, then straight from the lines. */
class TruckLoader extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.stale = 0; this.truck = null; }
  think(dt) {
    const sc = this.scene;
    const waiting = sc.trucks.filter((v) => v.waiting);
    if (!this.truck || !this.truck.waiting) {
      this.truck = null;
      if (!waiting.length) {
        if (this.rig.carryCount) { this.stale += dt; if (this.stale > 12) { while (this.rig.carryCount) this.rig.removeCarry(); this.stale = 0; } }
        this.at(this.home);
        return;
      }
      // the other loader takes a different truck when there is one
      const others = sc.helpers.filter((h) => h !== this && h instanceof TruckLoader).map((h) => h.truck);
      waiting.sort((a, b) => (others.includes(a) - others.includes(b)) || a.waitLeft - b.waitLeft);
      this.truck = waiting[0];
    }
    this.stale = 0;
    const v = this.truck;
    const carried = v.types.some((k) => v.needs(k) > 0 && this.rig.countOf(k) > 0);
    if (carried && v.zone.contains(this.rig.x, this.rig.y)) {
      if (this.cool > 0) return;
      const k = v.types.find((t) => v.needs(t) > 0 && this.rig.countOf(t) > 0);
      this.cool = 0.13; sc.loadTruck(v, k, this.rig.removeCarry(k));
      return;
    }
    const missing = v.types.filter((k) => v.needs(k) - this.rig.countOf(k) - this.othersCarry(k) > 0);
    if (missing.length && this.rig.carryCount < this.cap) {
      for (const k of missing) {
        const src = sc.rack[k].count > 0 ? { p: sc.rack[k], at: { x: sc.rack[k].pile.x, y: F.rack.zone.y1 + 30 } }
          : (() => { const pr = sc.producersOf(k).filter((x) => x.count > 0).sort((a, b) => b.count - a.count)[0]; return pr ? { p: pr, at: { x: pr.zone.cx, y: pr.zone.cy } } : null; })();
        if (!src) continue;
        if (!this.at(src.at)) return;
        if (this.cool <= 0) {
          this.cool = 0.14;
          const from = (src.p.pile || src.p).take();
          if (from) { const im = this.rig.addCarry(k); im.setVisible(false); fly(sc, ITEMS[k].tex, from, () => this.rig.stackTopWorld(), { duration: 170, arc: 30, onDone: () => im.active && im.setVisible(true) }); }
        }
        return;
      }
    }
    if (carried) this.at({ x: v.zone.cx, y: v.zone.cy + 10 });
    else this.at(this.home);
  }
  othersCarry(k) { return this.scene.helpers.filter((h) => h !== this && h instanceof TruckLoader && h.truck === this.truck).reduce((n, h) => n + h.rig.countOf(k), 0); }
}

/** Sunday starts the generator whenever NEPA takes light. */
class Electrician extends Worker {
  think() {
    const sc = this.scene;
    if (sc.power.left > 0 && !sc.power.gen) {
      const z = { x: sc.genZone.cx - 30, y: sc.genZone.cy };
      if (this.at(z)) sc.startGenerator(this);
      return;
    }
    this.at(this.home);
  }
}
