import { img } from '../art.js';
import { label } from './ui.js';

/**
 * Speech bubble above a character/vehicle showing what they want: a row of icon+count entries,
 * or a single status icon (cash = waiting to pay, happy face, check).
 */
export class Bubble {
  constructor(scene, { depth = 30000, big = false } = {}) {
    this.scene = scene;
    this.c = scene.add.container(0, 0).setDepth(depth);
    this.g = scene.add.graphics();
    this.c.add(this.g);
    this.entries = [];
    this.big = big;
    this.c.setScale(0);
    this.visible = false;
    this.key = '';
    this.bar = scene.add.graphics();
    this.c.add(this.bar);
    this.barP = null;
    this.geo = { w: 56, h: 50, s: 1 };
  }

  /** patience/time bar along the bottom of the bubble; p in 0..1, null hides it */
  setBar(p) {
    if (p == null) { if (this.barP != null) { this.bar.clear(); this.barP = null; } return; }
    p = Math.max(0, Math.min(1, p));
    if (this.barP != null && Math.abs(p - this.barP) < 0.01) return;
    this.barP = p;
    const { w, s } = this.geo;
    const bw = w - 22 * s, bh = 5 * s, x = -bw / 2, y = -8 * s - 8 * s;
    const col = p > 0.5 ? 0x2bb34a : p > 0.25 ? 0xffb02e : 0xe33d3d;
    const g = this.bar; g.clear();
    g.fillStyle(0xe8e2d6, 1); g.fillRoundedRect(x, y, bw, bh, bh / 2);
    g.fillStyle(col, 1); g.fillRoundedRect(x, y, Math.max(bh, bw * p), bh, bh / 2);
  }

  /** entries: [{icon, n}] where n may be null (no number) */
  set(entries) {
    const key = JSON.stringify(entries);
    if (key === this.key) return;
    this.key = key;
    this.entries.forEach((e) => { e.i.destroy(); if (e.t) e.t.destroy(); });
    this.entries = [];
    const s = this.big ? 1.25 : 1;
    const iconSize = 34 * s;
    const gap = 6 * s;
    const widths = entries.map((e) => iconSize + (e.n != null ? 26 * s : 0));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (entries.length - 1);
    const w = Math.max(56 * s, total + 22 * s), h = 50 * s;
    this.geo = { w, h, s };
    const keepBar = this.barP; this.barP = null;
    let x = -total / 2;
    entries.forEach((e, idx) => {
      const i = img(this.scene, x + iconSize / 2, -h / 2 - 8 * s, e.icon);
      i.setScale((0.5 * iconSize) / 64 * 1.05);
      this.c.add(i);
      let t = null;
      if (e.n != null) {
        t = label(this.scene, x + iconSize + 12 * s, -h / 2 - 8 * s, String(e.n), { size: Math.round(21 * s), color: e.done ? '#2bb34a' : '#3a2a1a', stroke: null });
        this.c.add(t);
      }
      this.entries.push({ i, t });
      x += widths[idx] + gap;
    });
    const g = this.g; g.clear();
    g.fillStyle(0x000000, 0.18); g.fillRoundedRect(-w / 2 + 2, -h - 8 * s + 4, w, h, 16 * s);
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -h - 8 * s, w, h, 16 * s);
    g.fillTriangle(-9 * s, -10 * s, 9 * s, -10 * s, 0, 2 * s);
    if (keepBar != null) this.setBar(keepBar); else this.bar.clear();
  }

  show(on = true) {
    if (on === this.visible) return;
    this.visible = on;
    this.scene.tweens.killTweensOf(this.c);
    this.scene.tweens.add({ targets: this.c, scale: on ? 1 : 0, duration: on ? 260 : 140, ease: on ? 'Back.Out' : 'Sine.In' });
  }

  pulse() {
    this.scene.tweens.add({ targets: this.c, scale: 1.15, duration: 80, yoyo: true });
  }

  at(x, y) { this.c.x = x; this.c.y = y; }

  destroy() { this.scene.tweens.killTweensOf(this.c); this.c.destroy(); }
}
