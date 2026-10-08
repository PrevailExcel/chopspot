import Phaser from 'phaser';
import { WORLD, ITEMS, PLAYER, BUKA, BUKA_UNLOCKS, COLORS } from '../config.js';
import { img } from '../art.js';
import { Customer } from '../entities/Customer.js';
import { Waiter, Cleaner, Loader, Manager } from '../entities/Helpers.js';
import { Producer } from '../objects/Producer.js';
import { Pile } from '../objects/Pile.js';
import { Zone } from '../objects/Zone.js';
import { fly } from '../objects/Fly.js';
import { money } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { Haptic } from '../platform.js';
import BranchScene from './BranchScene.js';

const NGOZI = { skin: 0x7a4a2a, shirt: 0xffffff, pattern: 0xe33d5c, dress: true, hair: 'wrap', hairColor: 0xe33d5c, wrapPattern: 0xffffff, pants: 0x222222, scale: 1.24 };
const KEMI = { skin: 0xa86b45, shirt: 0xffffff, pattern: 0x2c7be5, dress: true, hair: 'puff', hairColor: 0x1b120c, pants: 0x222222, scale: 1.24 };
const MUSA = { skin: 0x5c3a21, shirt: 0x2bb34a, pattern: null, dress: false, hair: 'cap', hairColor: 0xffffff, pants: 0x3a5f8f, scale: 1.26 };
const SULE = { skin: 0x4a2e1b, shirt: 0xff7a1a, pattern: 0x2a3550, dress: false, hair: 'short', hairColor: 0x140d09, pants: 0x1e1e24, scale: 1.27 };
const OBI = { skin: 0x6b4226, shirt: 0x5b4bd6, pattern: 0xffd23f, dress: false, hair: 'short', hairColor: 0x1b120c, pants: 0x222222, scale: 1.3 };

const MAINS = ['jollof', 'noodles'];

/**
 * Branch 2: the Ariaria Buka. An open-air restaurant with table service:
 * customers sit down and order, you carry food to the table, then clear plates to the sink.
 */
export default class BukaScene extends BranchScene {
  constructor() { super('buka'); }

  buildWorld() {
    this.tables = [];
    this.waiting = [];  // customers queued outside the gate
    this.spawnTimer = 1;
    this.buildGround();
    this.buildFence();
    this.buildDecor();
    this.buildStatic();
  }

  buildGround() {
    const tile = (x, y, w, h, key, d) => this.add.tileSprite(x, y, w, h, key).setOrigin(0).setDepth(d).setTileScale(0.5, 0.5);
    tile(-900, -600, WORLD.w + 1800, WORLD.h + 1400, 'g_laterite', -1000);
    const g = this.add.graphics().setDepth(-999);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, -10, WORLD.w + 1800, 30);
    g.fillStyle(COLORS.road, 1); g.fillRect(-900, 20, WORLD.w + 1800, 180);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, 196, WORLD.w + 1800, 22);
    g.fillStyle(0xf5d742, 1); for (let x = -900; x < WORLD.w + 900; x += 90) g.fillRoundedRect(x, 106, 50, 8, 4);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, 1395, WORLD.w + 1800, 44);
    g.fillStyle(COLORS.road, 1); g.fillRect(-900, 1439, WORLD.w + 1800, 220);
    g.fillStyle(0xffffff, 0.85); for (let x = -900; x < WORLD.w + 900; x += 90) g.fillRoundedRect(x, 1545, 50, 8, 4);
    // kitchen tiles and the dining floor
    g.fillStyle(0x9a8f80, 1); g.fillRoundedRect(38, 218, 924, 1150, 10);
    tile(44, 218, 912, 400, 'g_ktiles', -998);
    tile(44, 618, 912, 744, 'g_terrazzo', -998);
    const g2 = this.add.graphics().setDepth(-997);
    g2.fillStyle(0x000000, 0.07); g2.fillRect(44, 218, 912, 16);
    g2.fillStyle(0x2c7be5, 1); g2.fillRect(44, 612, 912, 8); // kitchen edge stripe
    g2.fillStyle(0xffffff, 0.6); for (let x = 50; x < 950; x += 40) g2.fillRect(x, 614, 20, 4);
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
    row(214, 40, 960, [[440, 600]]);
    row(1362, 40, 960, [[420, 580]]);
    for (let y = 214 + 46; y < 1362; y += 46) {
      add(40, y); add(960, y);
      img(this, 40, y - 10, 'd_rail_v').setDepth(y + 0.4); img(this, 960, y - 10, 'd_rail_v').setDepth(y + 0.4);
    }
  }

  buildDecor() {
    const rnd = new Phaser.Math.RandomDataGenerator(['buka']);
    const put = (x, y, key, s = 1) => img(this, x, y, key).setDepth(y).setScale(0.5 * s);
    [[-70, 360], [-130, 700], [-60, 1040], [-120, 1300], [1070, 340], [1130, 720], [1060, 1060], [1120, 1320]].forEach(([x, y], i) => put(x, y, i % 2 ? 'd_tree' : 'd_palm', 1.1));
    for (let y = 300; y < 1340; y += 150) { put(2, y + rnd.between(-20, 20), 'd_bush', 0.9); put(998, y + rnd.between(-20, 20), 'd_bush', 0.9); }
    for (let i = 0; i < 80; i++) {
      const side = rnd.pick([-1, 1]);
      const x = side < 0 ? rnd.between(-500, 20) : rnd.between(980, 1500), y = rnd.between(240, 1380);
      put(x, y, rnd.pick(['d_tuft', 'd_stone', 'd_stone']), 1);
    }
    put(170, 238, 'm_bukasign');
    put(940, 1350, 'd_pot'); put(60, 1350, 'd_pot'); put(400, 1385, 'd_pot'); put(600, 1385, 'd_pot');
    const prop = (x, y, key, w, h) => { put(x, y, key); this.addCollider({ x1: x - w / 2, x2: x + w / 2, y1: y - h, y2: y + 4 }); };
    prop(930, 560, 'd_drum', 40, 16);
    prop(70, 560, 'd_sacks', 64, 22);
  }

  buildStatic() {
    const s = BUKA.sink;
    img(this, s.x, s.y, 'm_sink').setDepth(s.y);
    this.addCollider({ x1: s.x - 50, x2: s.x + 62, y1: s.y - 30, y2: s.y + 12 });
    this.sinkZone = new Zone(this, s.zone, { color: 0x5ec2ff });
    this.sinkFx = this.add.particles(s.x + 6, s.y - 40, 'fx_dot', {
      speed: { min: 20, max: 50 }, angle: { min: 240, max: 300 }, scale: { start: 0.25, end: 0 }, tint: [0xffffff, 0xbfe6ff],
      lifespan: 600, emitting: false,
    }).setDepth(s.y + 5);
    const t = BUKA.till;
    img(this, t.x, t.y, 'm_regdesk').setDepth(t.y);
    img(this, t.x + 2, t.y - 56, 'm_register').setDepth(t.y + 7);
    this.addCollider({ x1: t.x - 40, x2: t.x + 40, y1: t.y - 48, y2: t.y });
    this.tillCash = this.addCashPile(t.cash.x, t.cash.y, { maxVisual: 18, unit: 20 });
  }

  buildUnlock(id, animate) {
    const P = BUKA.producers;
    if (P[id]) {
      const p = new Producer(this, id, P[id], this.b.prod[id] ?? null);
      this.producers[id] = p;
      this.addCollider(p.rect);
      if (animate) p.popIn();
      return;
    }
    const tdef = BUKA.tables.find((x) => x.id === id);
    if (tdef) { this.buildTable(tdef, animate); return; }
    if (id === 'booth') {
      const B = BUKA.booth;
      const im = img(this, B.x, B.y, 'm_booth').setDepth(B.y);
      this.boothZone = new Zone(this, B.zone, { color: 0x2c7be5 });
      this.addCollider({ x1: B.x - 56, x2: B.x + 50, y1: B.y - 34, y2: B.y + 10 });
      if (animate) this.popObj(im);
    } else if (id === 'keke') this.buildVehicle(BUKA.keke, animate);
    else if (id === 'generator') this.buildGenerator(animate);
    else {
      const def = BUKA_UNLOCKS.find((u) => u.id === id);
      let h = null;
      if (id === 'waiter1') h = new Waiter(this, 500, 650, NGOZI, 'Ngozi');
      if (id === 'waiter2') h = new Waiter(this, 500, 870, KEMI, 'Kemi');
      if (id === 'cleaner') h = new Cleaner(this, 190, 900, MUSA, 'Musa');
      if (id === 'kloader') h = new Loader(this, 380, 300, SULE, 'Sule');
      if (id === 'manager') h = new Manager(this, def.x, def.y, OBI, 'Obi · Manager');
      if (h) { this.helpers.push(h); if (animate) this.popObj(h.rig, 1); }
    }
  }

  buildTable(d, animate) {
    const im = img(this, d.x, d.y, 'm_btable').setDepth(d.y);
    const plates = new Pile(this, d.x, d.y - 26, { layout: 'tablePlates', type: 'dirty', depth: d.y + 1, maxVisual: 12 });
    const cash = this.addCashPile(d.x, d.y - 30, { layout: 'cashSmall', maxVisual: 6, zoneR: 118, unit: 25, depth: d.y + 2 });
    const zone = new Zone(this, { x: d.x, y: d.y + 18, r: 118 }, { visible: false });
    const table = {
      id: d.id, x: d.x, y: d.y, img: im, plates, cash, zone, claimedBy: null,
      seats: [-1, 1].map((sx) => ({ x: d.x + sx * BUKA.seatDX, y: d.y + 6, face: -sx, taken: null })),
    };
    this.tables.push(table);
    this.addCollider({ x1: d.x - 76, x2: d.x + 76, y1: d.y - 24, y2: d.y + 14 });
    if (animate) this.popObj(im);
    return table;
  }

  buildGenerator(animate) {
    const G = BUKA.generator;
    const im = img(this, G.x, G.y, 'm_generator').setDepth(G.y);
    this.addCollider({ x1: G.x - 46, x2: G.x + 46, y1: G.y - 26, y2: G.y + 8 });
    this.add.particles(G.x + 30, G.y - 50, 'fx_soft', {
      speedY: { min: -40, max: -20 }, speedX: { min: 5, max: 20 }, scale: { start: 0.15, end: 0.5 }, alpha: { start: 0.4, end: 0 },
      tint: 0x777777, lifespan: 1200, frequency: 260,
    }).setDepth(G.y + 1);
    // festoon lights over the dining area
    const g = this.add.graphics().setDepth(24000);
    const bulbs = [];
    for (const y of [700, 900, 1100, 1300]) {
      const pts = [];
      for (let i = 0; i <= 20; i++) { const x = 70 + i * 43; const sag = Math.sin((i / 20) * Math.PI) * 26; pts.push({ x, y: y - 150 + sag }); }
      g.lineStyle(2, 0x2a2a2a, 0.6); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
      pts.forEach((p, i) => { if (i % 2) bulbs.push(img(this, p.x, p.y + 6, 'fx_bulb').setDepth(24001).setScale(0.5).setTint([0xffd23f, 0xff7a1a, 0xff4fa3, 0x7ef07e, 0x5ec2ff][i % 5])); });
    }
    this.tweens.add({ targets: bulbs, alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: -1, delay: this.tweens.stagger(60) });
    if (animate) this.popObj(im);
  }

  buildSigns() {
    this.signText(170, 169, () => `${this.ownerTitle()} BUKA`, { size: 17, color: '#c81e1e', stroke: '#fff6e0', sw: 4, depth: 239 });
    this.signText(170, 190, () => 'Rice · Noodles · Akara · Malt', { size: 10, color: '#5a3816', stroke: null, depth: 239 });
    img(this, 830, 212, 'd_roadsign').setDepth(212);
    this.signText(830, 142, () => 'MARKET ROAD', { size: 14, color: '#ffffff', stroke: null, depth: 213 });
    img(this, 610, 1500, 'd_archsign').setDepth(1500); // over the entrance, clear of the till's cash
    this.signText(610, 1386, () => 'ARIARIA MARKET', { size: 22, color: '#fff6e0', stroke: '#124d22', sw: 4, depth: 1501 });
    this.signText(610, 1408, () => 'Welcome · Aba', { size: 11, color: '#f3e3c3', stroke: null, depth: 1501 });
  }

  restore() {
    const tb = this.b.tables || {};
    this.tables.forEach((t) => {
      const s = tb[t.id] || {};
      if (s.plates) t.plates.add(s.plates, false);
      if (s.cash) t.cash.restore(s.cash);
    });
    const pl = this.b.piles || {};
    this.tillCash.restore(pl.till || 0);
    if (this.vehicleCash) this.vehicleCash.restore(pl.vehicle || 0);
  }

  afterCreate() {
    if (this.b.tut === 0 && this.b.stats.served === 0) this.spawnCustomer({ jollof: 1 }, true);
  }

  saveBranch() {
    this.b.tables = {};
    this.tables.forEach((t) => { this.b.tables[t.id] = { plates: t.plates.count, cash: t.cash.value }; });
  }

  // ---------- rules ----------
  unlockList() { return BUKA_UNLOCKS; }
  startIds() { return ['jollof', 't1', 't2']; }
  tutorialDone() { return this.b.tut >= 4; }
  finaleId() { return 'generator'; }
  demandMult() { return super.demandMult() * (this.isUnlocked('generator') ? 1.25 : 1); }
  staffSpeed() { return 165 * this.staffMult(); }
  staffCarry() { return 5 + Math.floor(this.b.up.staff * 0.6); }

  route(a, b) {
    const lane = (p) => (p.y < 620 ? { x: p.x, y: 590 } : { x: p.x, y: p.y });
    const la = lane(a), lb = lane(b);
    return [la, { x: 500, y: la.y }, { x: 500, y: lb.y }, lb, b];
  }

  menu() {
    return ['jollof', 'noodles', 'akara', 'bread', 'malt'].filter((k) => this.producersOf(k).length);
  }

  makeOrder() {
    const menu = this.menu(); const extra = this.extraItems();
    const o = {};
    const mains = MAINS.filter((k) => menu.includes(k));
    const main = Phaser.Utils.Array.GetRandom(mains);
    o[main] = 1 + (Math.random() < 0.25 + extra * 0.1 ? 1 : 0);
    if (menu.includes('akara') && Math.random() < 0.5) {
      o.akara = 1 + Math.floor(Math.random() * (2 + extra / 2));
      if (menu.includes('bread') && Math.random() < 0.7) o.bread = 1;
    } else if (menu.includes('bread') && Math.random() < 0.25) o.bread = 1;
    if (menu.includes('malt') && Math.random() < 0.5) o.malt = 1 + (extra >= 2 && Math.random() < 0.4 ? 1 : 0);
    if (Math.random() < 0.2 && menu.includes('akara') && menu.includes('bread')) { delete o[main]; o.akara = 2 + Math.floor(extra / 2); o.bread = 1; }
    return o;
  }

  makeVehicleOrder() {
    const menu = this.menu().filter((k) => k !== 'malt' || Math.random() < 0.6);
    const n = Math.min(menu.length, 2 + Math.floor(Math.random() * 2));
    const pick = Phaser.Utils.Array.Shuffle([...menu]).slice(0, Math.max(1, n));
    const o = {};
    pick.forEach((k) => { o[k] = 2 + Math.floor(Math.random() * (3 + this.extraItems())); });
    return o;
  }

  goalTemplates() {
    const has = (id) => this.isUnlocked(id);
    const sells = (k) => this.producersOf(k).length > 0;
    return [
      { kind: 'serve', text: (n) => `Serve ${n} tables of customers`, target: (t) => 6 + 3 * t },
      { kind: 'earn', text: (n) => `Collect ${money(n)}`, target: (t) => Math.round(600 * Math.pow(1.28, t) / 50) * 50, weight: 1.2 },
      { kind: 'item:jollof', text: (n) => `Sell ${n} plates of jollof rice`, target: (t) => 6 + 3 * t },
      { kind: 'item:noodles', text: (n) => `Sell ${n} bowls of noodles`, target: (t) => 6 + 3 * t, ok: sells('noodles') },
      { kind: 'item:akara', text: (n) => `Sell ${n} akara`, target: (t) => 8 + 4 * t, ok: sells('akara') },
      { kind: 'item:bread', text: (n) => `Sell ${n} loaves of bread`, target: (t) => 5 + 3 * t, ok: sells('bread') },
      { kind: 'item:malt', text: (n) => `Sell ${n} bottles of malt`, target: (t) => 6 + 3 * t, ok: sells('malt') },
      { kind: 'clean', text: (n) => `Clear ${n} dirty tables`, target: (t) => 5 + 2 * t },
      { kind: 'vehicle', text: (n) => `Fill ${n} keke order${n > 1 ? 's' : ''}`, target: (t) => 1 + Math.floor(t / 3), ok: has('keke'), weight: 1.4 },
      { kind: 'streak', text: (n) => `Serve ${n} customers in a row with no walkouts`, target: (t) => 5 + 2 * t, weight: 1.3 },
      { kind: 'rush', text: (n) => `Serve ${n} customers during a rush hour`, target: (t) => 3 + 2 * t, ok: this.unlockCount() >= 3, weight: 1.3 },
    ];
  }

  // ---------- tables ----------
  diners() { return this.customers.filter((c) => c.table); }
  servicePoint(t) { return { x: t.x + (t.x < 500 ? 86 : -86), y: t.y + 46 }; }
  tableZoneContains(t, x, y) { return t.zone.contains(x, y); }
  tablesNeedingCleaning() { return this.tables.filter((t) => t.plates.count > 0 || t.cash.value > 0); }
  freeSeat() {
    for (const t of this.tables) {
      if (t.plates.count > 0) continue;
      const s = t.seats.find((x) => !x.taken);
      if (s) return { t, s };
    }
    return null;
  }

  takeDirty(t, rig) {
    const from = t.plates.take();
    if (!from) return;
    const im = rig.addCarry('dirty'); im.setVisible(false);
    fly(this, ITEMS.dirty.tex, from, () => rig.stackTopWorld(), { duration: 170, arc: 30, onDone: () => im.active && im.setVisible(true) });
    if (t.plates.count === 0) { this.track('clean', 1); if (rig === this.player) this.floatText(t.x, t.y - 80, 'Clean!', '#bdf7ff', 20); }
  }

  takeTableCash(t, rig) {
    const v = t.cash.value;
    t.cash.value = 0;
    while (t.cash.pile.count) {
      const p = t.cash.pile.take();
      fly(this, 'item_cash', p, () => ({ x: rig.x, y: rig.y - 50 }), { duration: 200, arc: 30 });
    }
    return v;
  }

  washPlate(from) {
    const z = this.sinkZone;
    fly(this, ITEMS.dirty.tex, from, { x: BUKA.sink.x + 6, y: BUKA.sink.y - 36 }, { duration: 200, arc: 30, onDone: () => { this.sinkFx.explode(4); } });
    Sound.play('wash');
    void z;
  }

  serveCustomer(c, type, from) {
    c.give(type);
    c.refreshBubble();
    fly(this, ITEMS[type].tex, from, () => ({ x: c.x, y: c.y - 40 }), { duration: 200, arc: 34, onDone: () => { Sound.play('pop'); if (!c.dead) c.rig.squash(); } });
    if (c.complete) {
      c.state = 'eating';
      c.stopPatience();
      c.eat = Phaser.Math.FloatBetween(BUKA.customers.eatTime[0], BUKA.customers.eatTime[1]);
      c.bubble.set([{ icon: 'icon_happy', n: null }]); c.bubble.pulse();
      Sound.play('happy');
      if (c.claimedBy) c.claimedBy.release(c);
      if (this.b.tut === 1) this.b.tut = 2;
    }
  }

  // ---------- customers ----------
  spawnCustomer(order = null, instant = false) {
    const c = new Customer(this, Math.random() < 0.5 ? -60 : WORLD.w + 60, 1490 + Phaser.Math.Between(-10, 10), order || this.makeOrder(), BUKA.customers.speed);
    this.customers.push(c);
    if (instant) c.rig.setPosition(500, 1330);
    const seat = this.freeSeat();
    if (seat) this.seatCustomer(c, seat);
    else this.queueOutside(c);
    return c;
  }

  seatCustomer(c, { t, s }) {
    s.taken = c; c.seat = s; c.table = t;
    c.state = 'walking-in';
    c.stopPatience();
    const row = t.y + 52;
    const pts = c.y > 1360 ? [{ x: 500, y: 1450 }, { x: 500, y: 1330 }] : [{ x: 500, y: Math.min(c.y, 1330) }];
    c.goTo([...pts, { x: 500, y: row }, { x: s.x, y: row }, { x: s.x, y: s.y }], () => {
      c.rig.sit(true, s.face);
      c.state = 'seated';
      c.refreshBubble(); c.bubble.show(true);
      c.startPatience(BUKA.customers.patience * this.patienceMult() * (this.b.tut < 4 ? 3 : 1));
    });
  }

  queueOutside(c) {
    this.waiting.push(c);
    c.state = 'outside';
    this.reslotOutside();
  }

  reslotOutside() {
    const Q = BUKA.queue;
    this.waiting.forEach((c, i) => {
      const p = { x: Q.x - i * Q.gap, y: Q.y };
      c.goTo([{ x: p.x, y: 1490 }, p], () => {
        if (c.state !== 'outside') return;
        c.bubble.set([{ icon: 'icon_btable', n: null }]); c.bubble.show(true);
        if (c.patience == null) c.startPatience(BUKA.customers.outsidePatience * this.patienceMult());
      });
    });
  }

  leave(c, via = []) {
    c.state = 'leaving';
    c.stopPatience();
    if (c.seat) { c.seat.taken = null; c.seat = null; }
    if (c.claimedBy) c.claimedBy.release(c);
    const exitX = Math.random() < 0.5 ? -80 : WORLD.w + 80;
    const inside = c.y < 1360;
    const out = inside ? [{ x: 500, y: c.y }, { x: 500, y: 1340 }, { x: 540, y: 1460 }] : [];
    c.goTo([...via, ...out, { x: exitX, y: 1500 }], () => c.destroy());
  }

  updateBranch(dt) {
    this.sinkZone.update(dt);
    const C = BUKA.customers;
    const open = this.tables.reduce((n, t) => n + t.seats.length, 0);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = C.spawnEvery / this.demandMult() / (0.55 + 0.055 * open) * (0.8 + Math.random() * 0.4);
      if (this.waiting.length < BUKA.queue.max && this.b.tut >= 2) this.spawnCustomer();
    }
    // let the next waiting customer in when a clean seat opens
    if (this.waiting.length) {
      const seat = this.freeSeat();
      if (seat) { const c = this.waiting.shift(); c.bubble.show(false); this.seatCustomer(c, seat); this.reslotOutside(); }
    }
    for (const c of this.customers) {
      if (c.dead) continue;
      if (c.state === 'seated' && c.tickPatience(dt)) {
        const t = c.table; c.table = null;
        c.rig.sit(false);
        this.walkout(c);
        this.leave(c, [{ x: c.seat.x, y: t.y + 52 }]);
      } else if (c.state === 'outside' && c.tickPatience(dt)) {
        this.waiting = this.waiting.filter((x) => x !== c);
        c.bubble.set([{ icon: 'icon_btable', n: null }]); c.bubble.pulse();
        this.time.delayedCall(700, () => { if (!c.dead) c.bubble.show(false); });
        this.leave(c);
        this.reslotOutside();
      } else if (c.state === 'eating') {
        c.eat -= dt;
        if (c.eat <= 0) this.finishMeal(c);
      }
      c.update(dt);
    }
    this.customers = this.customers.filter((c) => !c.dead);
    for (const t of this.tables) t.zone.update(dt);
  }

  finishMeal(c) {
    const t = c.table;
    c.table = null;
    c.rig.sit(false);
    const bill = Math.round(c.total * this.priceMult());
    const tip = Math.round(Phaser.Math.Between(BUKA.customers.tip[0], BUKA.customers.tip[1]) * this.priceMult());
    t.cash.deposit(bill + tip, { x: c.x, y: c.y - 40 });
    const plates = Math.max(1, Math.ceil(c.itemCount / 2));
    const made = t.plates.add(plates, false);
    made.forEach((im, i) => { im.setScale(0); this.tweens.add({ targets: im, scale: 0.5, duration: 220, delay: i * 60, ease: 'Back.Out' }); });
    this.floatText(c.x, c.y - 120, `+${money(bill + tip)}`, '#bdf7a8');
    Sound.play('cash'); Haptic.tap('light');
    this.served(1);
    c.types.forEach((k) => this.track('item:' + k, c.order[k]));
    c.bubble.set([{ icon: 'icon_heart', n: null }]); c.bubble.pulse();
    this.time.delayedCall(900, () => { if (!c.dead) c.bubble.show(false); });
    this.leave(c, [{ x: c.seat.x, y: t.y + 52 }]);
  }

  // ---------- Ada at the tables and sink ----------
  interactBranch() {
    const p = this.player; const b = this.b;
    if (this.dropCool > 0) return;
    for (const t of this.tables) {
      if (!t.zone.contains(p.x, p.y)) continue;
      // serve anyone at this table who needs what Ada carries
      for (const s of t.seats) {
        const c = s.taken;
        if (!c || c.state !== 'seated') continue;
        for (const k of c.types) {
          if (c.needs(k) > 0 && p.countOf(k) > 0) {
            this.dropCool = PLAYER.dropEvery;
            this.serveCustomer(c, k, p.removeCarry(k));
            Haptic.tap('light');
            return;
          }
        }
      }
      // then clear dirty plates if there's room on the tray
      if (t.plates.count > 0 && p.carryCount < this.carryCap()) {
        this.dropCool = PLAYER.pickEvery;
        this.takeDirty(t, p);
        Sound.play('pick', { n: p.carryCount }); Haptic.tap('light');
        if (b.tut === 2) b.tut = 3;
        return;
      }
    }
    const atSink = this.sinkZone.contains(p.x, p.y);
    this.sinkZone.setActive(atSink);
    if (atSink && p.countOf('dirty') > 0) {
      this.dropCool = PLAYER.dropEvery;
      this.washPlate(p.removeCarry('dirty'));
      Haptic.tap('light');
      if (b.tut === 3 && p.countOf('dirty') === 0) { b.tut = 4; this.ensureGoals(); this.game.events.emit('toast', 'Your Buka is open for business!'); }
    }
  }

  // ---------- tutorial & hints ----------
  computeGoal() {
    const b = this.b; const p = this.player;
    const pot = this.producers.jollof;
    const zc = (z) => ({ x: z.cx, y: z.cy });
    const first = this.diners()[0];
    if (b.tut === 0) {
      if (p.countOf('jollof') > 0) b.tut = 1;
      else return { target: zc(pot.zone), text: 'Welcome to your Buka! Grab a plate of jollof rice' };
    }
    if (b.tut === 1) {
      if (first && first.state === 'seated') return { target: this.servicePoint(first.table), text: 'Carry it to the customer at their table' };
      if (p.countOf('jollof') === 0) return { target: zc(pot.zone), text: 'Grab a plate of jollof rice' };
      return { text: 'Your customer is coming in...' };
    }
    if (b.tut === 2) {
      const t = this.tablesNeedingCleaning()[0];
      if (t) return { target: this.servicePoint(t), text: 'Pick up the money and dirty plates' };
      return { text: 'Let them enjoy the meal...' };
    }
    if (b.tut === 3) return { target: zc(this.sinkZone), text: 'Wash the dirty plates at the sink' };
    return this.freeGoal();
  }

  branchFreeGoal() {
    const p = this.player;
    if (p.countOf('dirty') > 0 && p.carryCount >= this.carryCap()) return { target: { x: this.sinkZone.cx, y: this.sinkZone.cy }, text: 'Your tray is full of dirty plates. Wash them!' };
    const dirty = this.tables.filter((t) => t.plates.count > 0);
    if (this.waiting.length && dirty.length && !this.isUnlocked('cleaner')) return { target: this.servicePoint(dirty[0]), text: 'Customers are waiting outside. Clear a dirty table!' };
    const hungry = this.diners().filter((c) => c.state === 'seated' && !c.complete).sort((a, b) => (a.patience ?? 99) - (b.patience ?? 99))[0];
    if (hungry && (hungry.patience ?? 99) < hungry.patienceMax * 0.4) {
      const k = hungry.types.find((x) => hungry.needs(x) > 0);
      if (p.countOf(k) > 0) return { target: this.servicePoint(hungry.table), text: `Hurry! A table is waiting for ${ITEMS[k].name.toLowerCase()}` };
      return { text: `Hurry! A table is waiting for ${ITEMS[k].name.toLowerCase()}`, arrow: false };
    }
    return null;
  }
}
