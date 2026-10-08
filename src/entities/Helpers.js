import Phaser from 'phaser';
import { Rig } from './Rig.js';
import { COUNTER, ITEMS } from '../config.js';
import { fly } from '../objects/Fly.js';
import { label } from '../objects/ui.js';

/** Name tag that floats under staff so players know who they hired. */
function nameTag(scene, name) {
  return label(scene, 0, 0, name, { size: 13, color: '#fff', stroke: '#2a2a2a', sw: 4 }).setDepth(29000);
}

/**
 * Shared behaviour for every hired helper: walking a route, picking food up from a machine,
 * and handing items over with the same flying animation the player gets.
 */
class Worker {
  constructor(scene, x, y, look, name) {
    this.scene = scene;
    this.rig = new Rig(scene, x, y, look);
    this.tag = nameTag(scene, name);
    this.path = [];
    this.vx = 0; this.vy = 0;
    this.cool = 0;
    this.wait = 0;
    this.home = { x, y };
  }

  get speed() { return this.scene.staffSpeed(); }
  get cap() { return this.scene.staffCarry(); }
  get pos() { return { x: this.rig.x, y: this.rig.y }; }

  goTo(target) { this.path = this.scene.route(this.pos, target); }
  near(p, r = 8) { return Math.hypot(this.rig.x - p.x, this.rig.y - p.y) <= r; }

  /** go to `p` if not there yet; returns true once standing on it */
  at(p) {
    if (this.near(p)) return true;
    if (!this.path.length) this.goTo(p);
    return false;
  }

  pickFrom(producer) {
    const from = producer.pile.take();
    if (!from) return false;
    const im = this.rig.addCarry(producer.type); im.setVisible(false);
    fly(this.scene, ITEMS[producer.type].tex, from, () => this.rig.stackTopWorld(), { duration: 180, arc: 30, onDone: () => im.active && im.setVisible(true) });
    return true;
  }

  update(dt) {
    let vx = 0, vy = 0;
    this.cool -= dt;
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - this.rig.x, dy = t.y - this.rig.y;
      const d = Math.hypot(dx, dy);
      const s = Math.min(d, this.speed * dt);
      if (d > 0.01) { this.rig.x += (dx / d) * s; this.rig.y += (dy / d) * s; vx = (dx / d) * this.speed; vy = (dy / d) * this.speed; }
      if (d - s < 1.5) this.path.shift();
    } else {
      this.think(dt);
    }
    this.vx = Phaser.Math.Linear(this.vx, vx, Math.min(1, dt * 12));
    this.vy = Phaser.Math.Linear(this.vy, vy, Math.min(1, dt * 12));
    this.rig.animate(dt, this.vx, this.vy);
    this.tag.setPosition(this.rig.x, this.rig.y + 16);
  }

  think() {}
}

/** Faulks Road runner: shuttles one item type from the machines to the counter shelf. */
export class Runner extends Worker {
  constructor(scene, x, y, type, look, name) { super(scene, x, y, look, name); this.type = type; this.state = 'idle'; }

  think(dt) {
    const sc = this.scene;
    const shelf = sc.shelves[this.type];
    if (this.state === 'idle') {
      const src = sc.producersOf(this.type).sort((a, b) => b.count - a.count)[0];
      if (!src) return;
      this.source = src; this.state = 'toSource';
    }
    if (this.state === 'toSource') {
      if (!this.at({ x: this.source.zone.cx, y: this.source.zone.cy })) return;
      this.state = 'picking'; this.wait = 0;
    }
    if (this.state === 'picking') {
      this.wait += dt;
      if (this.rig.carryCount < this.cap && this.source.count > 0) {
        if (this.cool <= 0) { this.cool = 0.16; this.pickFrom(this.source); }
        return;
      }
      const shelfFull = shelf.count >= COUNTER.shelfCap;
      if (this.rig.carryCount > 0 && !shelfFull && (this.rig.carryCount >= this.cap || this.wait > 2.5)) this.state = 'toCounter';
      else if (this.rig.carryCount === 0 && this.wait > 1.5) this.state = 'idle'; // try the fuller machine
      return;
    }
    if (this.state === 'toCounter') {
      if (!this.at({ x: COUNTER.shelves[this.type].x, y: COUNTER.dropZone.y1 + 26 })) return;
      this.state = 'dropping';
    }
    if (this.state === 'dropping') {
      if (this.cool > 0) return;
      if (this.rig.carryCount > 0 && shelf.count < COUNTER.shelfCap) {
        this.cool = 0.12;
        const from = this.rig.removeCarry(this.type);
        const made = shelf.add(1, false)[0];
        if (made) { made.setVisible(false); fly(sc, ITEMS[this.type].tex, from, { x: made.x, y: made.y }, { duration: 200, arc: 30, onDone: () => made.active && made.setVisible(true) }); }
        return;
      }
      if (this.rig.carryCount === 0) this.state = 'idle';
    }
  }
}

/** Stands at the till and checks paying customers out. */
export class Cashier extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.rig.face = -1; }
  think() {}
}

/** Manager: keeps an eye on the place. Lets you collect this branch's earnings from anywhere. */
export class Manager extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.idle = 2; }
  think(dt) {
    this.idle -= dt;
    if (this.idle <= 0) {
      this.idle = 3 + Math.random() * 3;
      const p = { x: this.home.x + Phaser.Math.Between(-40, 40), y: this.home.y + Phaser.Math.Between(-20, 20) };
      this.path = [p];
    }
  }
}

/** Loader: fetches what the waiting vehicle still needs and loads it into the bay. */
export class Loader extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.stale = 0; }

  think(dt) {
    const sc = this.scene; const v = sc.vehicle;
    const waiting = v && v.waiting;
    const bay = { x: v ? v.zone.cx : this.home.x, y: v ? v.zone.cy + 18 : this.home.y };
    if (!waiting) {
      if (this.rig.carryCount) { this.stale += dt; if (this.stale > 15) { while (this.rig.carryCount) this.rig.removeCarry(); this.stale = 0; } }
      this.at(this.home);
      return;
    }
    this.stale = 0;
    const carriedNeeded = v.types.some((k) => v.needs(k) > 0 && this.rig.countOf(k) > 0);
    // standing in the bay with useful items: load them
    if (carriedNeeded && v.zone.contains(this.rig.x, this.rig.y)) {
      if (this.cool > 0) return;
      for (const k of v.types) {
        if (v.needs(k) > 0 && this.rig.countOf(k) > 0) {
          this.cool = 0.14;
          const from = this.rig.removeCarry(k);
          sc.loadVehicle(k, from);
          return;
        }
      }
    }
    // what is still missing after counting what I carry?
    const missing = v.types.filter((k) => v.needs(k) - this.rig.countOf(k) > 0);
    if (missing.length && this.rig.carryCount < this.cap) {
      const src = missing.map((k) => sc.producersOf(k).filter((p) => p.count > 0).sort((a, b) => b.count - a.count)[0]).find(Boolean);
      if (src) {
        if (!this.at({ x: src.zone.cx, y: src.zone.cy })) return;
        if (this.cool <= 0 && v.needs(src.type) - this.rig.countOf(src.type) > 0) { this.cool = 0.16; this.pickFrom(src); }
        return;
      }
    }
    if (carriedNeeded) this.at(bay);
  }
}

/**
 * Buka waiter: takes a small batch of seated customers (as many as fit on the tray),
 * collects their food from the kitchen and serves each table.
 */
export class Waiter extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.targets = []; this.stale = 0; }

  release(c = null) {
    const drop = c ? [c] : this.targets;
    drop.forEach((t) => { if (t.claimedBy === this) t.claimedBy = null; });
    this.targets = c ? this.targets.filter((t) => t !== c) : [];
  }

  /** items the batch still needs, minus what's already on the tray */
  missing() {
    const need = {};
    for (const c of this.targets) for (const k of c.types) need[k] = (need[k] || 0) + Math.max(0, c.needs(k));
    for (const k of Object.keys(need)) need[k] -= this.rig.countOf(k);
    return Object.keys(need).filter((k) => need[k] > 0).map((k) => ({ k, n: need[k] }));
  }

  think(dt) {
    const sc = this.scene;
    for (const c of [...this.targets]) if (c.dead || c.state !== 'seated' || c.complete) this.release(c);
    if (!this.targets.length) {
      const options = sc.diners().filter((d) => d.state === 'seated' && !d.complete && !d.claimedBy);
      if (!options.length) {
        if (this.rig.carryCount) { this.stale += dt; if (this.stale > 12) { while (this.rig.carryCount) this.rig.removeCarry(); this.stale = 0; } }
        this.at(this.home);
        return;
      }
      // most urgent first, but anyone we can already feed jumps the line
      const score = (d) => d.types.reduce((n, k) => n + Math.min(d.needs(k), this.rig.countOf(k)), 0) * 100 - (d.patience ?? 99);
      options.sort((a, b) => score(b) - score(a));
      let room = this.cap;
      for (const d of options) {
        const n = d.types.reduce((m, k) => m + Math.max(0, d.needs(k)), 0);
        if (this.targets.length && (n > room || this.targets.length >= 3)) continue;
        d.claimedBy = this; this.targets.push(d); room -= n;
        if (room <= 0) break;
      }
      this.stale = 0;
    }
    // serve anyone in reach
    if (this.cool <= 0) {
      for (const c of this.targets) {
        if (!sc.tableZoneContains(c.table, this.rig.x, this.rig.y)) continue;
        for (const k of c.types) {
          if (c.needs(k) > 0 && this.rig.countOf(k) > 0) { this.cool = 0.14; sc.serveCustomer(c, k, this.rig.removeCarry(k)); return; }
        }
      }
    }
    // fetch what's missing
    const miss = this.missing();
    if (miss.length && this.rig.carryCount < this.cap) {
      const srcs = miss.map(({ k }) => sc.producersOf(k).sort((a, b) => b.count - a.count)[0]).filter(Boolean);
      const carrying = this.targets.some((c) => c.types.some((k) => c.needs(k) > 0 && this.rig.countOf(k) > 0));
      const src = srcs.find((p) => p.count > 0) || (carrying ? null : srcs[0]);
      if (src) {
        if (!this.at({ x: src.zone.cx, y: src.zone.cy })) return;
        if (this.cool <= 0 && src.count > 0 && miss.some((m) => m.k === src.type)) { this.cool = 0.16; this.pickFrom(src); }
        return;
      }
    }
    // deliver: nearest table we can feed
    const feedable = this.targets.filter((c) => c.types.some((k) => c.needs(k) > 0 && this.rig.countOf(k) > 0));
    if (feedable.length) {
      feedable.sort((a, b) => Math.hypot(a.x - this.rig.x, a.y - this.rig.y) - Math.hypot(b.x - this.rig.x, b.y - this.rig.y));
      this.at(sc.servicePoint(feedable[0].table));
    }
  }
}

/** Buka cleaner: clears dirty tables in a round, washes the plates, and banks table money at the till. */
export class Cleaner extends Worker {
  constructor(scene, x, y, look, name) { super(scene, x, y, look, name); this.table = null; this.cash = 0; this.state = 'idle'; }

  get plateCap() { return this.cap + 4; }

  nextTable() {
    const free = this.scene.tablesNeedingCleaning().filter((x) => !x.claimedBy && (x.plates.count > 0 || x.cash.value > 0));
    if (!free.length) return null;
    free.sort((a, b) => (b.plates.count > 0) - (a.plates.count > 0) || Math.hypot(a.x - this.rig.x, a.y - this.rig.y) - Math.hypot(b.x - this.rig.x, b.y - this.rig.y));
    return free[0];
  }

  think() {
    const sc = this.scene;
    if (this.state === 'idle') {
      const t = this.rig.countOf('dirty') < this.plateCap ? this.nextTable() : null;
      if (t) { this.table = t; t.claimedBy = this; this.state = 'toTable'; }
      else if (this.rig.countOf('dirty') > 0) this.state = 'toSink';
      else if (this.cash > 0) this.state = 'toTill';
      else { this.at(this.home); return; }
    }
    if (this.state === 'toTable') {
      if (!this.at(sc.servicePoint(this.table))) return;
      this.state = 'clearing';
    }
    if (this.state === 'clearing') {
      if (this.cool > 0) return;
      const t = this.table;
      if (t.cash.value > 0) { this.cash += sc.takeTableCash(t, this.rig); this.cool = 0.2; return; }
      if (t.plates.count > 0 && this.rig.countOf('dirty') < this.plateCap) { this.cool = 0.12; sc.takeDirty(t, this.rig); return; }
      t.claimedBy = null; this.table = null;
      this.state = 'idle'; // look for another table before heading to the sink
      return;
    }
    if (this.state === 'toSink') {
      const z = sc.sinkZone;
      if (!this.at({ x: z.cx, y: z.cy })) return;
      if (this.cool > 0) return;
      if (this.rig.countOf('dirty') > 0) { this.cool = 0.1; sc.washPlate(this.rig.removeCarry('dirty')); return; }
      // bank the money only when it's worth the walk or nothing else needs doing
      this.state = this.cash > 0 && (!this.nextTable() || this.cash > 400) ? 'toTill' : 'idle';
    }
    if (this.state === 'toTill') {
      const p = sc.tillCash;
      if (!this.at({ x: p.x, y: p.y + 30 })) return;
      sc.tillCash.deposit(this.cash, { x: this.rig.x, y: this.rig.y - 60 });
      this.cash = 0;
      this.state = 'idle';
    }
  }
}
