// Everyone who moves in the GRA Lounge: you, your guests and your staff.
import * as THREE from 'three';
import { Person, randomLook, staffLook } from './person.js';
import { textSprite } from './objects3d.js';
import { ITEMS } from '../config.js';

const U = 0.01;
const STACK_H = { drink: 13, dirty: 2.4, cash: 3.2 };

// ---------------------------------------------------------------------------
/** dishes carried on a tray in front of a person */
class CarryStack {
  constructor(ctx, owner) {
    this.ctx = ctx; this.owner = owner; this.items = [];
    this.tray = ctx.makeTray(); this.tray.visible = false; ctx.root.add(this.tray);
  }
  get count() { return this.items.length; }
  heightAt(n) { let h = 2; for (let i = 0; i < n; i++) h += (STACK_H[this.items[i].type] || 5.6) * 1.15; return h; }
  add(type) { const it = this.ctx.batches.alloc(type); this.items.push({ type, item: it }); return it; }
  remove(type = null) {
    let i = this.items.length - 1;
    if (type) { while (i >= 0 && this.items[i].type !== type) i--; }
    if (i < 0) return null;
    const p = this.posOf(i);
    const [c] = this.items.splice(i, 1);
    c.item.destroy();
    return { x: p.x / U, y: p.z / U, z: p.y / U };
  }
  countOf(type) { let n = 0; for (const c of this.items) if (c.type === type) n++; return n; }
  /** waiter style: the tray rides high on the right hand, so the stack is visible from above */
  base() {
    const o = this.owner; const yaw = o.person.yaw; const S = o.person.S;
    const rx = -Math.cos(yaw), rz = Math.sin(yaw);
    return new THREE.Vector3(o.x * U + rx * 0.24 * S + Math.sin(yaw) * 0.06, 1.98 * S, o.y * U + rz * 0.24 * S + Math.cos(yaw) * 0.06);
  }
  posOf(i) { const b = this.base(); b.y += this.heightAt(i) * U; return b; }
  topWorld() { const b = this.base(); b.y += this.heightAt(this.items.length) * U; return { x: b.x / U, y: b.z / U, z: b.y / U }; }
  layout(t) {
    const b = this.base();
    this.tray.visible = this.items.length > 0;
    this.tray.position.copy(b); this.tray.rotation.y = this.owner.person.yaw;
    let h = 2;
    this.items.forEach((c, i) => {
      const sway = Math.sin(t * 3 + i * 0.6) * 0.004 * i;
      c.item.pos.set(b.x + sway, b.y + h * U, b.z);
      c.item.rot = this.owner.person.yaw + i * 0.35;
      c.item.big = 1.35;
      h += (STACK_H[c.type] || 5.6) * 1.15;
    });
  }
  destroy() { this.items.forEach((c) => c.item.destroy()); this.items = []; this.tray.removeFromParent(); }
}

// ---------------------------------------------------------------------------
/** the player: same interface as the 2D Rig so the shared engine can drive it */
export class Player3D {
  constructor(ctx, x, y, look) {
    this.ctx = ctx; this.x = x; this.y = y;
    this.person = new Person(look);
    ctx.root.add(this.person.group);
    this.stack = new CarryStack(ctx, this);
    this.blob = ctx.blobs.add();
    this.t = 0;
    this.person.faceTo(Math.PI, true);
    this.sync();
  }
  get carryItems() { return this.stack.items; }
  get carryCount() { return this.stack.count; }
  addCarry(type) { return this.stack.add(type); }
  removeCarry(type = null) { return this.stack.remove(type); }
  countOf(type) { return this.stack.countOf(type); }
  stackTopWorld() { return this.stack.topWorld(); }
  sit() {} squash() { this.person.bounce(); }
  setPosition(x, y) { this.x = x; this.y = y; }
  animate(dt, vx, vy) {
    this.t += dt;
    this.vx = vx; this.vy = vy;
    this.person.action = this.stack.count ? 'carry' : (this.busy || null);
    this.person.update(dt, vx * U, vy * U);
    this.sync();
  }
  sync() {
    this.person.group.position.set(this.x * U, 0, this.y * U);
    this.stack.layout(this.t);
    this.ctx.blobs.set(this.blob, this.x * U, this.y * U, 0.36);
  }
  get world() { return this.person.group.position; }
  destroy() { this.stack.destroy(); this.person.dispose(); this.ctx.blobs.remove(this.blob); }
}

// ---------------------------------------------------------------------------
/** anyone who walks around on their own along nav paths */
export class Walker {
  constructor(ctx, look, x, y, speed = 120, name = null) {
    this.ctx = ctx; this.x = x; this.y = y; this.speed = speed;
    this.person = new Person(look);
    ctx.root.add(this.person.group);
    this.path = []; this.onArrive = null;
    this.vx = 0; this.vy = 0;
    this.blob = ctx.blobs.add();
    this.dead = false;
    if (name) {
      this.tag = textSprite(name, { px: 15, stroke: '#1b1b1b', w: 640 });
      ctx.root.add(this.tag);
    }
    this.sync();
  }
  goTo(target, cb = null) {
    this.path = this.ctx.nav.path({ x: this.x, y: this.y }, target);
    this.onArrive = cb;
  }
  goVia(points, cb = null) {
    let path = []; let from = { x: this.x, y: this.y };
    for (const p of points) { path = path.concat(this.ctx.nav.path(from, p)); from = p; }
    this.path = path; this.onArrive = cb;
  }
  near(p, r = 10) { return Math.hypot(this.x - p.x, this.y - p.y) <= r; }
  get moving() { return this.path.length > 0; }
  update(dt) {
    let vx = 0, vy = 0;
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - this.x, dy = t.y - this.y; const d = Math.hypot(dx, dy);
      const s = Math.min(d, this.speed * dt);
      if (d > 0.01) { this.x += (dx / d) * s; this.y += (dy / d) * s; vx = (dx / d) * this.speed; vy = (dy / d) * this.speed; }
      if (d - s < 1.5) {
        this.path.shift();
        if (!this.path.length && this.onArrive) { const cb = this.onArrive; this.onArrive = null; cb(); }
      }
    }
    this.vx += (vx - this.vx) * Math.min(1, dt * 10); this.vy += (vy - this.vy) * Math.min(1, dt * 10);
    this.person.update(dt, this.vx * U, this.vy * U);
    this.sync();
  }
  sync() {
    const sitting = this.person.pose === 'sit';
    this.person.group.position.set(this.x * U, this.lift || 0, this.y * U);
    if (!this.hideBlob) this.ctx.blobs.set(this.blob, this.x * U, this.y * U, sitting ? 0.3 : 0.34);
    if (this.tag) this.tag.position.set(this.x * U, 2.12 * this.person.S + (this.lift || 0), this.y * U);
  }
  destroy() {
    this.dead = true;
    this.person.dispose();
    this.ctx.blobs.remove(this.blob);
    if (this.tag) { this.tag.removeFromParent(); this.tag.material.map.dispose(); this.tag.material.dispose(); }
  }
}

// ---------------------------------------------------------------------------
/** a guest; parties are groups of these */
export class Guest extends Walker {
  constructor(ctx, seed, x, y, speed, opts = {}) {
    super(ctx, randomLook(seed, opts), x, y, speed);
    this.seat = null; this.wants = null; this.got = 0;
  }
}

/** staff with a tray */
export class Worker extends Walker {
  constructor(ctx, kind, seed, x, y, name, gender) {
    super(ctx, staffLook(kind, seed, gender), x, y, 150, name);
    this.kind = kind; this.home = { x, y };
    this.stack = new CarryStack(ctx, this);
    this.cool = 0; this.wait = 0; this.state = 'idle'; this.t = 0;
  }
  get carryCount() { return this.stack.count; }
  addCarry(type) { return this.stack.add(type); }
  removeCarry(type = null) { return this.stack.remove(type); }
  countOf(type) { return this.stack.countOf(type); }
  stackTopWorld() { return this.stack.topWorld(); }
  /** walk to `p`; true once there */
  at(p, r = 10) {
    if (this.near(p, r)) return true;
    if (!this.path.length) this.goTo(p);
    return false;
  }
  update(dt) {
    this.t += dt; this.cool -= dt;
    this.speed = this.ctx.scene.staffSpeed();
    if (!this.path.length) this.think(dt);
    if (!this.fixedAction) this.person.action = this.stack.count ? 'carry' : null;
    super.update(dt);
    this.stack.layout(this.t);
  }
  think() {}
  destroy() { this.stack.destroy(); super.destroy(); }
}

export function itemName(type, n) { const it = ITEMS[type]; return n === 1 ? it.name.toLowerCase() : (it.plural || it.name.toLowerCase() + 's'); }
