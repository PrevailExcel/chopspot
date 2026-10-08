import Phaser from 'phaser';
import { Rig, randomLook } from './Rig.js';
import { Bubble } from '../objects/Bubble.js';
import { ITEMS } from '../config.js';

let uid = 0;

export class Customer {
  constructor(scene, x, y, order, speed = 145) {
    this.scene = scene;
    this.id = ++uid;
    this.rig = new Rig(scene, x, y, randomLook());
    this.order = order; // { type: count }
    this.got = {};
    this.path = [];
    this.speed = speed * (0.9 + Math.random() * 0.25);
    this.state = 'walk';
    this.after = null; // callback when path completes
    this.bubble = new Bubble(scene);
    this.takeTimer = 0;
    this.checkout = 0;
    this.vx = 0; this.vy = 0;
    this.seat = null;
    this.dead = false;
    // patience: null = not counting; otherwise seconds left of `patienceMax`
    this.patience = null; this.patienceMax = 1;
  }

  get x() { return this.rig.x; }
  get y() { return this.rig.y; }

  goTo(points, after = null) { this.path = points.map((p) => ({ x: p.x, y: p.y })); this.after = after; }

  get arrived() { return this.path.length === 0; }

  get types() { return Object.keys(this.order).filter((k) => this.order[k] > 0); }
  needs(type) { return (this.order[type] || 0) - (this.got[type] || 0); }
  get complete() { return this.types.every((k) => this.needs(k) <= 0); }
  get itemCount() { return this.types.reduce((n, k) => n + this.order[k], 0); }

  get total() { return this.types.reduce((n, k) => n + this.order[k] * ITEMS[k].price, 0); }

  give(type) { this.got[type] = (this.got[type] || 0) + 1; }

  refreshBubble() {
    this.bubble.set(this.types.map((k) => ({ icon: ITEMS[k].icon, n: Math.max(0, this.needs(k)), done: this.needs(k) <= 0 })));
  }

  startPatience(seconds) { this.patienceMax = Math.max(1, seconds); this.patience = this.patienceMax; }
  stopPatience() { this.patience = null; this.bubble.setBar(null); }

  /** counts patience down; returns true the moment it runs out */
  tickPatience(dt, rate = 1) {
    if (this.patience == null) return false;
    this.patience -= dt * rate;
    this.bubble.setBar(this.patience / this.patienceMax);
    if (this.patience <= 0) { this.patience = null; return true; }
    return false;
  }

  update(dt) {
    let vx = 0, vy = 0;
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - this.rig.x, dy = t.y - this.rig.y;
      const d = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (d <= step) {
        this.rig.x = t.x; this.rig.y = t.y; this.path.shift();
        if (!this.path.length && this.after) { const cb = this.after; this.after = null; cb(); if (this.dead) return; }
      } else {
        vx = (dx / d) * this.speed; vy = (dy / d) * this.speed;
        this.rig.x += vx * dt; this.rig.y += vy * dt;
      }
    }
    this.vx = Phaser.Math.Linear(this.vx, vx, Math.min(1, dt * 12));
    this.vy = Phaser.Math.Linear(this.vy, vy, Math.min(1, dt * 12));
    this.rig.animate(dt, this.vx, this.vy);
    this.bubble.at(this.rig.x, this.rig.y - 100 * this.rig.bodyScale / 1.25);
  }

  destroy() {
    this.dead = true;
    this.bubble.destroy();
    this.rig.destroy();
  }
}
