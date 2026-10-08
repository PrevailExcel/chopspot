import Phaser from 'phaser';
import {
  WORLD, ITEMS, PLAYER, PRODUCERS, COUNTER, REGISTER, REGISTER_CASH, ORDER_SPOT, PAY_SPOT, QUEUE_GAP, QUEUE_MAX,
  CUSTOMERS, BUS, TABLES, BOOTH, SIGN, UNLOCKS, COLORS, HELPERS,
} from '../config.js';
import { img } from '../art.js';
import { Customer } from '../entities/Customer.js';
import { Runner, Cashier, Loader, Manager } from '../entities/Helpers.js';
import { Producer } from '../objects/Producer.js';
import { Pile } from '../objects/Pile.js';
import { Zone } from '../objects/Zone.js';
import { fly } from '../objects/Fly.js';
import { money } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { Haptic } from '../platform.js';
import BranchScene from './BranchScene.js';

const CHIOMA_LOOK = { skin: 0x7a4a2a, shirt: 0x7b2d8b, pattern: 0xffd23f, dress: true, hair: 'puff', hairColor: 0x1b120c, pants: 0x222222, scale: 1.25 };
const TUNDE_LOOK = { skin: 0x6b4226, shirt: 0x0f8b8d, pattern: null, dress: false, hair: 'cap', hairColor: 0xffd23f, pants: 0x2a3550, scale: 1.24 };
const EMEKA_LOOK = { skin: 0x5c3a21, shirt: 0xe33d5c, pattern: 0xffffff, dress: false, hair: 'cap', hairColor: 0x2c7be5, pants: 0x1e1e24, scale: 1.24 };
const BAYO_LOOK = { skin: 0x4a2e1b, shirt: 0xffc928, pattern: 0x2a3550, dress: false, hair: 'short', hairColor: 0x140d09, pants: 0x3a5f8f, scale: 1.28 };
const UJU_LOOK = { skin: 0xa86b45, shirt: 0x2c7be5, pattern: 0xffffff, dress: true, hair: 'braids', hairColor: 0x1b120c, pants: 0x222222, scale: 1.25 };

/** Branch 1: the Faulks Road spot. Counter service with a queue, till, seating and shuttle orders. */
export default class StandScene extends BranchScene {
  constructor() { super('stand'); }

  // ---------- world ----------
  buildWorld() {
    this.queue = [];
    this.payer = null;
    this.runners = [];
    this.tables = [];
    this.spawnTimer = 1.2;
    this.buildGround();
    this.buildFence();
    this.buildDecor();
    this.buildStatic();
  }

  buildGround() {
    const tile = (x, y, w, h, key) => this.add.tileSprite(x, y, w, h, key).setOrigin(0).setDepth(-1000).setTileScale(0.5, 0.5);
    tile(-900, -600, WORLD.w + 1800, WORLD.h + 1400, 'g_stripes').tilePositionX = 900 * 2;
    const g = this.add.graphics().setDepth(-999);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, -10, WORLD.w + 1800, 30);
    g.fillStyle(COLORS.road, 1); g.fillRect(-900, 20, WORLD.w + 1800, 180);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, 196, WORLD.w + 1800, 22);
    g.fillStyle(0xb9b3a4, 1); g.fillRect(-900, 214, WORLD.w + 1800, 4);
    g.fillStyle(0xf5d742, 1); for (let x = -900; x < WORLD.w + 900; x += 90) g.fillRoundedRect(x, 106, 50, 8, 4);
    g.fillStyle(0xd9d4c7, 1); g.fillRect(-900, 1395, WORLD.w + 1800, 44);
    g.fillStyle(COLORS.road, 1); g.fillRect(-900, 1439, WORLD.w + 1800, 220);
    g.fillStyle(0xffffff, 0.85); for (let x = -900; x < WORLD.w + 900; x += 90) g.fillRoundedRect(x, 1545, 50, 8, 4);
    const x1 = 44, x2 = 956, y1 = 218, y2 = 948;
    g.fillStyle(0xcdb796, 1); g.fillRoundedRect(x1 - 6, y1, x2 - x1 + 12, y2 - y1 + 10, 10);
    this.add.tileSprite(x1, y1, x2 - x1, y2 - y1, 'g_tiles').setOrigin(0).setDepth(-998).setTileScale(0.5, 0.5);
    const g2 = this.add.graphics().setDepth(-997);
    g2.fillStyle(0x000000, 0.05); g2.fillRect(x1, y1, x2 - x1, 18);
    g2.fillStyle(0xd8c9a8, 1); g2.fillRoundedRect(440, 948, 120, 450, 18);
    g2.fillStyle(0xc9b893, 1);
    for (let y = 960; y < 1390; y += 40) { g2.fillRoundedRect(452, y, 44, 30, 8); g2.fillRoundedRect(504, y + 10, 44, 30, 8); }
    g2.fillStyle(0xd8c9a8, 1); g2.fillRoundedRect(560, 960, 330, 74, 18);
    g2.fillRoundedRect(570, 1030, 60, 368, 18);
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
    row(214, 40, 960, [[420, 580]]);
    row(1362, 40, 960, [[420, 640]]);
    for (let y = 214 + 46; y < 1362; y += 46) {
      add(40, y); add(960, y);
      img(this, 40, y - 10, 'd_rail_v').setDepth(y + 0.4); img(this, 960, y - 10, 'd_rail_v').setDepth(y + 0.4);
    }
  }

  buildDecor() {
    const rnd = new Phaser.Math.RandomDataGenerator(['puffzobo']);
    const put = (x, y, key, s = 1) => img(this, x, y, key).setDepth(y).setScale(0.5 * s);
    [[-60, 330], [-120, 620], [-50, 900], [-110, 1180], [1060, 300], [1120, 600], [1050, 880], [1110, 1200]].forEach(([x, y], i) => put(x, y, i % 3 === 1 ? 'd_tree' : 'd_palm', 1.1));
    [[-200, 470], [-210, 1040], [1200, 450], [1200, 1050]].forEach(([x, y]) => put(x, y, 'd_tree', 1.05));
    for (let y = 300; y < 1340; y += 130) { put(5, y + rnd.between(-20, 20), 'd_bush', 0.9); put(995, y + rnd.between(-20, 20), 'd_bush', 0.9); }
    put(300, 945, 'd_pot'); put(700, 1000, 'd_pot'); put(80, 250, 'd_pot'); put(920, 250, 'd_pot'); put(420, 1385, 'd_pot'); put(640, 1385, 'd_pot');
    const yardOk = (x, y) => !(x > 425 && x < 905 && y > 940 && y < 1400) && !(x > 60 && x < 300 && y > 1020 && y < 1250);
    for (let i = 0; i < 70; i++) {
      const x = rnd.between(60, 940), y = rnd.between(970, 1340);
      if (!yardOk(x, y)) continue;
      put(x, y, rnd.pick(['d_tuft', 'd_tuft', 'd_flower', 'd_stone']), 1);
    }
    for (let i = 0; i < 90; i++) {
      const side = rnd.pick([-1, 1]);
      const x = side < 0 ? rnd.between(-500, 20) : rnd.between(980, 1500), y = rnd.between(240, 1380);
      put(x, y, rnd.pick(['d_tuft', 'd_flower', 'd_tuft', 'd_stone']), 1);
    }
    put(150, 238, 'm_board');
    const prop = (x, y, key, w, h) => { put(x, y, key); this.addCollider({ x1: x - w / 2, x2: x + w / 2, y1: y - h, y2: y + 4 }); };
    prop(92, 470, 'd_sacks', 64, 22);
    prop(912, 470, 'd_drum', 40, 16);
    prop(92, 760, 'd_drum', 40, 16);
    prop(906, 700, 'd_plantain', 48, 16);
  }

  buildStatic() {
    img(this, 500, 940, 'm_counter').setDepth(940);
    this.addCollider({ x1: COUNTER.x1, x2: COUNTER.x2, y1: COUNTER.y1, y2: COUNTER.y2 });
    this.shelves = {
      puff: new Pile(this, COUNTER.shelves.puff.x, 884, { layout: 'shelfPuff', type: 'puff', depth: 946, cap: COUNTER.shelfCap }),
      zobo: new Pile(this, COUNTER.shelves.zobo.x, 888, { layout: 'shelfZobo', type: 'zobo', depth: 946, cap: COUNTER.shelfCap }),
    };
    this.counterZone = new Zone(this, COUNTER.dropZone);
    img(this, 740, 940, 'm_regdesk').setDepth(940);
    this.registerImg = img(this, 742, 884, 'm_register').setDepth(947);
    this.addCollider({ x1: REGISTER.x1, x2: REGISTER.x2, y1: REGISTER.y1, y2: REGISTER.y2 });
    this.registerZone = new Zone(this, REGISTER.zone, { color: 0x3fd36b });
    this.tillCash = this.registerCash = this.addCashPile(REGISTER_CASH.x, REGISTER_CASH.y, { maxVisual: 18 });
    this.tillHint = img(this, 742, 820, 'icon_cash').setDepth(26000).setScale(0.32).setVisible(false);
  }

  buildUnlock(id, animate) {
    if (PRODUCERS[id]) {
      const p = new Producer(this, id, PRODUCERS[id], this.b.prod[id] ?? null);
      this.producers[id] = p;
      this.addCollider(p.rect);
      if (animate) p.popIn();
    } else if (id === 'bus') this.buildVehicle(BUS, animate);
    else if (id === 'booth') {
      const im = img(this, BOOTH.x, BOOTH.y, 'm_booth').setDepth(BOOTH.y);
      this.boothZone = new Zone(this, BOOTH.zone, { color: 0x2c7be5 });
      this.addCollider({ x1: BOOTH.x - 56, x2: BOOTH.x + 50, y1: BOOTH.y - 34, y2: BOOTH.y + 10 });
      if (animate) this.popObj(im);
    } else if (id === 'cashier') {
      this.cashier = new Cashier(this, REGISTER.zone.x, REGISTER.zone.y - 6, CHIOMA_LOOK, 'Chioma');
      this.helpers.push(this.cashier);
      if (animate) this.popObj(this.cashier.rig, 1);
    } else if (id === 'seating') this.buildSeating(animate);
    else if (id === 'runner1' || id === 'runner2') {
      const def = UNLOCKS.find((u) => u.id === id);
      const r = id === 'runner1' ? new Runner(this, def.x, def.y, 'puff', TUNDE_LOOK, 'Tunde') : new Runner(this, def.x, def.y, 'zobo', EMEKA_LOOK, 'Emeka');
      this.runners.push(r); this.helpers.push(r);
      if (animate) this.popObj(r.rig, 1);
    } else if (id === 'sign') {
      const im = img(this, SIGN.x, SIGN.y, 'm_sign').setDepth(SIGN.y);
      const top = SIGN.y - 156;
      const l1 = this.signText(SIGN.x, top + 34, () => this.ownerTitle(), { size: 22, color: '#ffd6ec', stroke: null, depth: SIGN.y + 0.5, glow: '#ff4fa3' });
      const l2 = this.signText(SIGN.x, top + 64, () => 'CHOP SPOT', { size: 17, color: '#fff3b0', stroke: null, depth: SIGN.y + 0.5, glow: '#ffd23f' });
      if (animate) [l1, l2].forEach((l) => this.popObj(l));
      this.addCollider({ x1: SIGN.x - 90, x2: SIGN.x + 90, y1: SIGN.y - 16, y2: SIGN.y + 6 });
      this.add.particles(SIGN.x, SIGN.y - 110, 'fx_star', {
        x: { min: -90, max: 90 }, y: { min: -40, max: 40 }, scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [0xff4fa3, 0xffd23f, 0xffffff], lifespan: 900, frequency: 160,
      }).setDepth(SIGN.y + 1);
      if (animate) this.popObj(im);
    } else if (id === 'loader') {
      const l = new Loader(this, 400, 300, BAYO_LOOK, 'Bayo');
      this.helpers.push(l);
      if (animate) this.popObj(l.rig, 1);
    } else if (id === 'manager') {
      const m = new Manager(this, 200, 1072, UJU_LOOK, 'Uju · Manager');
      this.helpers.push(m);
      if (animate) this.popObj(m.rig, 1);
    }
  }

  buildSeating(animate) {
    TABLES.forEach((t) => {
      const tb = img(this, t.x, t.y, 'm_table').setDepth(t.y);
      const um = img(this, t.x, t.y + 1, 'm_umbrella').setDepth(t.y + 70).setScale(0.6);
      const cash = this.addCashPile(t.x, t.y - 20, { layout: 'cashSmall', maxVisual: 8, zoneR: 95, unit: 3, depth: t.y + 1 });
      const table = { ...t, img: tb, um, cash, seats: t.seats.map((s) => ({ x: t.x + s.x, y: t.y + s.y, face: s.x < 0 ? 1 : -1, taken: null })) };
      this.tables.push(table);
      this.addCollider({ x1: t.x - 74, x2: t.x + 74, y1: t.y - 22, y2: t.y + 16 });
      if (animate) { this.popObj(tb); um.setScale(0); this.tweens.add({ targets: um, scale: 0.6, duration: 600, delay: 200, ease: 'Back.Out' }); }
    });
  }

  restore() {
    const b = this.b; const sh = b.shelves || {}; const pl = b.piles || {};
    this.shelves.puff.add(Math.min(sh.puff || 0, COUNTER.shelfCap), false);
    this.shelves.zobo.add(Math.min(sh.zobo || 0, COUNTER.shelfCap), false);
    this.registerCash.restore(pl.till ?? pl.register ?? 0);
    if (this.vehicleCash) this.vehicleCash.restore(pl.vehicle ?? pl.bus ?? 0);
    this.tables.forEach((t, i) => t.cash.restore(pl['t' + i] || 0));
  }

  afterCreate() {
    if (this.b.tut === 0 && this.b.stats.served === 0 && !this.queue.length) {
      const c = this.spawnCustomer({ puff: 2 });
      c.rig.setPosition(ORDER_SPOT.x, 1330); c.path = [this.slotPos(0)];
    }
  }

  saveBranch() {
    const b = this.b;
    b.shelves = { puff: this.shelves.puff.count, zobo: this.shelves.zobo.count };
    this.tables.forEach((t, i) => { b.piles['t' + i] = t.cash.value; });
  }

  buildSigns() {
    // name board at the back of the kitchen
    this.signText(150, 176, () => `${this.ownerTitle()} SPOT`, { size: 16, depth: 239 });
    this.signText(150, 196, () => 'Hot puff-puff · Cold zobo', { size: 10, stroke: null, depth: 239 });
    // street names
    img(this, 830, 212, 'd_roadsign').setDepth(212);
    this.signText(830, 142, () => 'NGWA ROAD', { size: 14, color: '#ffffff', stroke: null, depth: 213 });
    img(this, 770, 1418, 'd_roadsign').setDepth(1418);
    this.signText(770, 1348, () => 'FAULKS ROAD', { size: 14, color: '#ffffff', stroke: null, depth: 1419 });
  }

  // ---------- rules ----------
  startIds() { return ['fryer1']; }
  tutorialDone() { return this.b.tut >= 5; }
  finaleId() { return 'sign'; }
  route(a, b) { const x = HELPERS.aisleX; return [{ x, y: a.y }, { x, y: b.y }, b]; }

  makeVehicleOrder() {
    const lvl = this.unlockCount() + this.extraItems() * 2;
    const puff = 4 + Math.floor(Math.random() * (3 + lvl * 0.6));
    const zobo = this.isUnlocked('zobo1') ? 2 + Math.floor(Math.random() * (2 + lvl * 0.5)) : 0;
    return { puff: Math.min(puff, 18), zobo: Math.min(zobo, 14) };
  }

  goalTemplates() {
    const has = (id) => this.isUnlocked(id);
    return [
      { kind: 'serve', text: (n) => `Serve ${n} customers`, target: (t) => 8 + 4 * t },
      { kind: 'earn', text: (n) => `Collect ${money(n)}`, target: (t) => Math.round(150 * Math.pow(1.28, t) / 10) * 10, weight: 1.2 },
      { kind: 'item:puff', text: (n) => `Sell ${n} puff-puff`, target: (t) => 12 + 6 * t },
      { kind: 'item:zobo', text: (n) => `Sell ${n} bottles of zobo`, target: (t) => 8 + 4 * t, ok: has('zobo1') },
      { kind: 'vehicle', text: (n) => `Fill ${n} shuttle order${n > 1 ? 's' : ''}`, target: (t) => 1 + Math.floor(t / 3), ok: has('bus'), weight: 1.4 },
      { kind: 'streak', text: (n) => `Serve ${n} customers in a row with no walkouts`, target: (t) => 6 + 2 * t, weight: 1.3, ok: this.b.fame.lvl >= 2 },
      { kind: 'rush', text: (n) => `Serve ${n} customers during a rush hour`, target: (t) => 4 + 2 * t, ok: this.unlockCount() >= 3, weight: 1.3 },
      { kind: 'tips', text: (n) => `Get ${n} tips from seated customers`, target: (t) => 4 + 2 * t, ok: has('seating') },
    ];
  }

  // ---------- customers ----------
  slotPos(i) { return { x: ORDER_SPOT.x, y: ORDER_SPOT.y + i * QUEUE_GAP }; }

  spawnCustomer(order = null) {
    const zoboOn = this.isUnlocked('zobo1');
    if (!order) {
      const bonus = (this.isUnlocked('fryer2') ? 1 : 0) + this.extraItems();
      let puff = Phaser.Math.Between(CUSTOMERS.puffMin, CUSTOMERS.puffMax + bonus);
      let zobo = zoboOn ? Phaser.Math.Between(0, CUSTOMERS.zoboMax + (this.isUnlocked('zobo2') ? 1 : 0) + Math.floor(this.extraItems() / 2)) : 0;
      if (zoboOn && Math.random() < 0.25) puff = 0;
      if (puff + zobo === 0) { if (zoboOn) zobo = 1; else puff = 1; }
      order = { puff, zobo };
    }
    const fromLeft = Math.random() < 0.5;
    const c = new Customer(this, fromLeft ? -60 : WORLD.w + 60, 1490 + Phaser.Math.Between(-12, 12), order, CUSTOMERS.speed);
    const slot = this.queue.length;
    this.queue.push(c);
    this.customers.push(c);
    c.state = 'walk-queue';
    c.slot = slot;
    c.goTo([{ x: ORDER_SPOT.x, y: 1490 }, this.slotPos(slot)], () => this.arriveSlot(c));
    return c;
  }

  arriveSlot(c) {
    const wasQueue = c.state === 'walk-queue' && c.queued;
    c.state = c.slot === 0 ? 'ordering' : 'queue';
    c.refreshBubble();
    c.bubble.show(c.state === 'ordering');
    if (c.state === 'ordering' && this.b.fame.lvl >= 2) c.startPatience(CUSTOMERS.patience * this.patienceMult());
    // from fame 3, people at the back of a long line lose patience too (slowly)
    else if (c.state === 'queue' && this.b.fame.lvl >= 3 && !wasQueue) { c.queued = true; c.startPatience(CUSTOMERS.patience * 2.2 * this.patienceMult()); }
  }

  reslot() {
    this.queue.forEach((c, i) => {
      if (c.slot === i) return;
      c.slot = i;
      const p = this.slotPos(i);
      if (c.state === 'walk-queue') { c.path[c.path.length - 1] = p; }
      else { c.state = 'walk-queue'; c.goTo([p], () => this.arriveSlot(c)); }
    });
  }

  updateBranch(dt) {
    this.counterZone.update(dt); this.registerZone.update(dt);
    const spawnEvery = CUSTOMERS.spawnEvery * (this.isUnlocked('sign') ? 0.6 : 1) / (1 + 0.15 * (Object.keys(this.producers).length - 1)) / this.demandMult();
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnEvery * (0.8 + Math.random() * 0.4);
      if (this.queue.length < QUEUE_MAX) this.spawnCustomer();
    }

    const front = this.queue[0];
    if (front && front.state === 'ordering' && front.arrived) {
      front.takeTimer -= dt;
      if (front.takeTimer <= 0) {
        for (const type of ['puff', 'zobo']) {
          if (front.needs(type) > 0 && this.shelves[type].count > 0) {
            front.takeTimer = 0.17;
            const from = this.shelves[type].take();
            front.give(type);
            front.refreshBubble();
            fly(this, ITEMS[type].tex, from, () => ({ x: front.x, y: front.y - 50 }), { duration: 220, arc: 34, onDone: () => { Sound.play('pop'); if (!front.dead) front.rig.squash(); } });
            break;
          }
        }
      }
      if (front.complete) {
        if (!this.payer) {
          this.queue.shift();
          this.payer = front;
          front.state = 'toPay';
          front.stopPatience();
          front.bubble.set([{ icon: 'icon_cash', n: null }]);
          front.goTo([PAY_SPOT], () => {
            front.state = 'paying'; front.checkout = 0;
            if (this.b.fame.lvl >= 2 && !this.cashier) front.startPatience(CUSTOMERS.payPatience * this.patienceMult());
          });
          this.reslot();
        }
      } else if (front.tickPatience(dt)) {
        this.queue.shift();
        this.walkout(front);
        this.leave(front, [{ x: ORDER_SPOT.x + 70, y: ORDER_SPOT.y + 30 }]);
        this.reslot();
      }
    }

    const atTill = this.registerZone.contains(this.player.x, this.player.y, 6);
    const payer = this.payer;
    this.tillHint.setVisible(!!payer && payer.state === 'paying' && !atTill && !this.cashier);
    if (this.tillHint.visible) this.tillHint.y = 812 + Math.sin(this.time.now / 160) * 5;
    if (payer && payer.state === 'paying') {
      if (atTill || this.cashier) {
        payer.checkout += dt;
        if (payer.checkout >= CUSTOMERS.checkoutTime * (this.cashier && !atTill ? 1.6 / this.staffMult() : 1)) this.checkout(payer);
      } else if (payer.tickPatience(dt)) {
        this.payer = null;
        this.walkout(payer);
        this.leave(payer, [{ x: PAY_SPOT.x, y: PAY_SPOT.y + 50 }]);
      }
    }

    for (const c of [...this.queue]) {
      if (c.state === 'queue' && c.patience != null && !c.bubble.visible && c.patience < c.patienceMax * 0.4) c.bubble.show(true);
      if (c.state === 'queue' && c.tickPatience(dt)) {
        this.queue = this.queue.filter((x) => x !== c);
        this.walkout(c);
        this.leave(c, [{ x: ORDER_SPOT.x + 60, y: c.y }]);
        this.reslot();
      }
    }
    for (const c of this.customers) c.update(dt);
    for (const c of this.customers) {
      if (c.state === 'eating') { c.eat -= dt; if (c.eat <= 0) this.finishEating(c); }
    }
    this.customers = this.customers.filter((c) => !c.dead);
  }

  checkout(c) {
    const amount = Math.max(1, Math.round(c.total * this.priceMult()));
    this.payer = null;
    c.state = 'paid';
    c.stopPatience();
    this.registerCash.deposit(amount, { x: c.x, y: c.y - 50 });
    this.floatText(c.x, c.y - 120, `+${money(amount)}`, '#bdf7a8');
    Sound.play('cash'); Haptic.tap('medium');
    this.tweens.add({ targets: this.registerImg, scaleY: 0.44, duration: 80, yoyo: true });
    if (this.cashier) this.cashier.rig.squash();
    if (this.b.tut === 2) this.b.tut = 3;
    this.served(1);
    c.types.forEach((k) => this.track('item:' + k, c.order[k]));
    c.bubble.set([{ icon: 'icon_happy', n: null }]);
    c.bubble.pulse();
    Sound.play('happy');
    this.time.delayedCall(800, () => { if (!c.dead) c.bubble.show(false); });
    const seat = this.tables.flatMap((t) => t.seats.map((s) => ({ s, t }))).find(({ s }) => !s.taken);
    if (seat && Math.random() < 0.8) {
      seat.s.taken = c; c.seat = seat;
      c.state = 'toSeat';
      c.goTo([{ x: PAY_SPOT.x, y: PAY_SPOT.y + 40 }, { x: seat.s.x, y: seat.t.y + 58 }, { x: seat.s.x, y: seat.s.y }], () => {
        c.state = 'eating'; c.eat = Phaser.Math.FloatBetween(CUSTOMERS.eatTime[0], CUSTOMERS.eatTime[1]);
        c.rig.sit(true, seat.s.face);
        c.bubble.set([{ icon: c.order.puff ? 'icon_puff' : 'icon_zobo', n: null }]);
        c.bubble.show(true);
      });
    } else this.leave(c, [{ x: PAY_SPOT.x, y: PAY_SPOT.y + 50 }]);
  }

  finishEating(c) {
    const { s, t } = c.seat;
    c.rig.sit(false);
    s.taken = null;
    const tip = Math.round(Phaser.Math.Between(CUSTOMERS.tip[0], CUSTOMERS.tip[1]) * this.priceMult());
    t.cash.deposit(tip, { x: c.x, y: c.y - 40 });
    this.track('tips', 1);
    c.bubble.set([{ icon: 'icon_heart', n: null }]); c.bubble.pulse();
    this.time.delayedCall(900, () => { if (!c.dead) c.bubble.show(false); });
    this.leave(c, [{ x: s.x, y: t.y + 58 }, { x: 660, y: t.y + 58 }]);
  }

  leave(c, via = []) {
    c.state = 'leaving';
    c.stopPatience();
    const exitX = Math.random() < 0.5 ? -80 : WORLD.w + 80;
    c.goTo([...via, { x: 600, y: 1300 }, { x: 600, y: 1500 }, { x: exitX, y: 1505 }], () => c.destroy());
  }

  // ---------- Ada at the counter ----------
  interactBranch() {
    const p = this.player; const b = this.b;
    const atCounter = this.counterZone.contains(p.x, p.y);
    this.counterZone.setActive(atCounter);
    if (atCounter && this.dropCool <= 0 && p.carryCount > 0) {
      for (let i = p.carryItems.length - 1; i >= 0; i--) {
        const type = p.carryItems[i].type;
        const shelf = this.shelves[type];
        if (shelf && shelf.count < COUNTER.shelfCap) {
          this.dropCool = PLAYER.dropEvery;
          const from = p.removeCarry(type);
          const made = shelf.add(1, false)[0];
          if (made) { made.setVisible(false); fly(this, ITEMS[type].tex, from, { x: made.x, y: made.y }, { duration: 190, arc: 30, onDone: () => { if (made.active) made.setVisible(true); } }); }
          Sound.play('drop', { n: shelf.count }); Haptic.tap('light');
          if (b.tut === 1 && p.countOf('puff') === 0) b.tut = 2;
          break;
        }
      }
    }
    this.registerZone.setActive(this.registerZone.contains(p.x, p.y, 6));
  }

  // ---------- tutorial & hints ----------
  computeGoal() {
    const b = this.b; const p = this.player;
    const f1 = this.producers.fryer1;
    const zc = (z) => ({ x: z.cx, y: z.cy });
    if (b.tut === 0) {
      if (p.countOf('puff') > 0) b.tut = 1;
      else return { target: zc(f1.zone), text: 'Walk to the fryer to grab hot puff-puff' };
    }
    if (b.tut === 1) {
      if (p.carryCount === 0) return { target: zc(f1.zone), text: 'Grab some puff-puff from the fryer' };
      return { target: zc(this.counterZone), text: 'Put the puff-puff on the counter' };
    }
    if (b.tut === 2) {
      const front = this.queue[0];
      if (!this.payer && front && front.needs('puff') > 0 && this.shelves.puff.count === 0) {
        if (p.countOf('puff') > 0) return { target: zc(this.counterZone), text: 'Your customer needs more puff-puff' };
        return { target: zc(f1.zone), text: 'Your customer needs more puff-puff' };
      }
      return { target: zc(this.registerZone), text: 'Stand at the till so your customer can pay', r: 40 };
    }
    if (b.tut === 3) {
      if (this.registerCash.value <= 0) b.tut = 4;
      else return { target: { x: this.registerCash.x, y: this.registerCash.y }, text: 'Pick up your money!' };
    }
    if (b.tut === 4) {
      if (this.isUnlocked('zobo1')) { b.tut = 5; this.ensureGoals(); }
      else {
        const pad = this.pads.find((x) => x.def.id === 'zobo1');
        if (pad && this.gs.cash >= Math.min(pad.remaining, 10)) return { target: { x: pad.x, y: pad.y }, text: 'Stand on the pad to unlock the Zobo Cooler', lift: 40 };
        return { text: 'Serve more customers to afford the Zobo Cooler' };
      }
    }
    if (this.isUnlocked('sign') && !this.gs.owned.buka && this.gs.cash >= 3000 && Math.floor(this.time.now / 6000) % 2 === 0) {
      return { text: 'You can open a new branch! Tap the map button' };
    }
    return this.freeGoal();
  }

  branchFreeGoal() {
    const p = this.player;
    if (this.payer && this.payer.state === 'paying' && !this.cashier) return { target: { x: this.registerZone.cx, y: this.registerZone.cy }, text: 'A customer is waiting to pay', r: 40 };
    const front = this.queue[0];
    if (front && front.state === 'ordering') {
      for (const type of ['puff', 'zobo']) {
        if (front.needs(type) > 0 && this.shelves[type].count === 0) {
          const nm = type === 'puff' ? 'puff-puff' : 'zobo';
          if (p.countOf(type) > 0) return { target: { x: this.counterZone.cx, y: this.counterZone.cy }, text: `Restock the counter with ${nm}`, arrow: false };
          const src = this.producersOf(type).sort((a, b) => b.count - a.count)[0];
          return { target: src ? { x: src.zone.cx, y: src.zone.cy } : null, text: `Customers want ${nm}! Grab some`, arrow: false };
        }
      }
    }
    return null;
  }
}
