import { img } from '../art.js';
import { Bubble } from '../objects/Bubble.js';
import { Zone } from '../objects/Zone.js';
import { Sound } from '../audio.js';

/**
 * A vehicle (shuttle bus, keke) that pulls up on the back road with a bulk order and a deadline.
 * Load the order into the bay before time runs out. The scene supplies the order and the payout.
 */
export class Vehicle {
  constructor(scene, cfg) {
    this.scene = scene; this.cfg = cfg;
    this.im = img(scene, 1300, cfg.park.y, cfg.tex).setDepth(cfg.park.y);
    this.zone = new Zone(scene, { x: cfg.zone.x, y: cfg.zone.y, r: cfg.zone.r }, { color: 0xffd21f });
    this.bubble = new Bubble(scene, { big: true });
    this.state = 'away';
    this.timer = cfg.firstDelay;
    this.order = null; this.loaded = {};
    this.t = 0;
    this.exhaust = scene.add.particles(0, 0, 'fx_soft', {
      speedX: { min: 30, max: 60 }, speedY: { min: -20, max: -5 }, scale: { start: 0.2, end: 0.6 }, alpha: { start: 0.5, end: 0 },
      tint: 0x9a9a9a, lifespan: 700, frequency: 70, emitting: false,
    }).setDepth(cfg.park.y - 1);
    this.zone.setVisible(false);
  }

  needs(type) { return this.order ? (this.order[type] || 0) - (this.loaded[type] || 0) : 0; }
  get waiting() { return this.state === 'waiting'; }
  get types() { return this.order ? Object.keys(this.order).filter((k) => this.order[k] > 0) : []; }
  get totalItems() { return this.types.reduce((n, k) => n + this.order[k], 0); }
  get loadedItems() { return this.types.reduce((n, k) => n + (this.loaded[k] || 0), 0); }

  refreshBubble() {
    if (!this.order) return;
    this.bubble.set(this.types.map((k) => ({ icon: this.scene.itemIcon(k), n: Math.max(0, this.needs(k)), done: this.needs(k) <= 0 })));
  }

  update(dt) {
    this.t += dt;
    const im = this.im; const c = this.cfg;
    if (this.state === 'away') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'arriving'; im.x = 1300; this.exhaust.start(); }
    } else if (this.state === 'arriving') {
      const dx = im.x - c.park.x;
      im.x -= Math.min(dx, Math.max(40, dx * 2.2) * dt);
      im.y = c.park.y + Math.sin(this.t * 22) * 0.8;
      if (dx < 2) {
        im.x = c.park.x; im.y = c.park.y;
        this.state = 'waiting';
        this.order = this.scene.makeVehicleOrder(); this.loaded = {};
        this.waitMax = (c.wait + c.waitPerItem * this.totalItems) * this.scene.vehicleWaitMult();
        this.waitLeft = this.waitMax;
        this.refreshBubble(); this.bubble.show(true);
        this.zone.setVisible(true);
        this.exhaust.stop();
        Sound.play('honk');
        this.scene.tweens.add({ targets: im, scaleY: 0.47, duration: 120, yoyo: true });
        this.scene.events.emit('vehicle-arrived');
      }
    } else if (this.state === 'waiting') {
      im.y = c.park.y + Math.sin(this.t * 3) * 0.4;
      this.zone.update(dt);
      this.waitLeft -= dt;
      this.bubble.setBar(this.waitLeft / this.waitMax);
      if (this.waitLeft <= 0) this.timeout();
    } else if (this.state === 'leaving') {
      this.speed = (this.speed || 60) + dt * 400;
      im.x -= this.speed * dt;
      im.y = c.park.y + Math.sin(this.t * 22) * 0.8;
      if (im.x < -360) {
        this.state = 'away';
        this.timer = c.cooldown[0] + Math.random() * (c.cooldown[1] - c.cooldown[0]);
        this.exhaust.stop();
        this.speed = 60;
      }
    }
    this.exhaust.setPosition(im.x + c.exhaustX, im.y - 10);
    this.bubble.at(im.x, im.y - c.bubbleY);
  }

  depart(icon, delay = 700) {
    this.state = 'done';
    this.zone.setVisible(false);
    this.bubble.setBar(null);
    this.scene.time.delayedCall(350, () => {
      this.bubble.set([{ icon, n: null }]);
      this.scene.time.delayedCall(delay, () => {
        this.bubble.show(false);
        Sound.play('honk');
        this.state = 'leaving'; this.speed = 60; this.exhaust.start();
      });
    });
  }

  timeout() {
    // ran out of patience: pays half for whatever was loaded
    const frac = this.totalItems ? this.loadedItems / this.totalItems : 0;
    this.scene.onVehicleTimeout(this, frac);
    this.depart('icon_angry', 600);
  }

  /** returns true when the order just completed */
  load(type) {
    this.loaded[type] = (this.loaded[type] || 0) + 1;
    this.refreshBubble();
    this.bubble.pulse();
    if (this.types.every((k) => this.needs(k) <= 0)) { this.depart('icon_check'); return true; }
    return false;
  }
}
