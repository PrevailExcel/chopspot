import { img } from '../art.js';
import { dashedRoundRect } from './Zone.js';
import { label, money } from './ui.js';

const W = 124, H = 92;

/** A "stand here to pay" square that builds something once filled with cash. */
export class Pad {
  constructor(scene, def, paid = 0) {
    this.scene = scene; this.def = def; this.paid = paid;
    this.x = def.x; this.y = def.y;
    this.g = scene.add.graphics().setDepth(3);
    this.icon = img(scene, this.x, this.y - 12, def.icon).setDepth(4).setScale(0.5 * 0.72);
    this.price = label(scene, this.x, this.y + 24, money(def.cost - paid), { size: 21, stroke: '#2a2a2a', sw: 5 }).setDepth(4);
    this.title = label(scene, this.x, this.y - H / 2 - 16, def.name, { size: 17, stroke: '#2a2a2a', sw: 5 }).setDepth(5);
    this.sub = def.sub ? label(scene, this.x, this.y - H / 2 - 0, def.sub, { size: 12, color: '#ffe9a8', stroke: '#2a2a2a', sw: 4 }).setDepth(5) : null;
    this.t = Math.random() * 10;
    this.shown = 0;
    this.active = false;
    this.parts = [this.icon, this.price, this.title, this.sub].filter(Boolean);
    this.parts.forEach((p) => { p.baseScale = p.scaleX; p.setScale(0); });
    scene.tweens.add({ targets: this, shown: 1, duration: 420, ease: 'Back.Out', delay: 120 });
    this.draw();
  }

  get remaining() { return Math.max(0, this.def.cost - this.paid); }

  contains(px, py) { return Math.abs(px - this.x) < W / 2 && Math.abs(py - this.y) < H / 2; }

  update(dt) {
    this.t += dt;
    this.parts.forEach((p) => p.setScale(p.baseScale * this.shown));
    this.icon.y = this.y - 12 - Math.abs(Math.sin(this.t * 3)) * (this.active ? 6 : 3);
    this.price.setText(money(this.remaining));
    this.draw();
  }

  draw() {
    const g = this.g; g.clear();
    const s = this.shown; if (s <= 0.01) return;
    const w = W * s, h = H * s, x = this.x - w / 2, y = this.y - h / 2;
    g.fillStyle(0x1d3b1a, 0.32);
    g.fillRoundedRect(x, y, w, h, 16);
    const p = this.paid / this.def.cost;
    if (p > 0) {
      const ph = Math.max(10, h * p);
      g.fillStyle(0x3fd36b, 0.75);
      g.fillRoundedRect(x, y + h - ph, w, ph, Math.min(16, ph / 2));
    }
    g.lineStyle(4.5, 0xffffff, 0.95);
    dashedRoundRect(g, x, y, w, h, 16, 14, 9, this.t * (this.active ? 60 : 18));
  }

  destroy() {
    this.g.destroy(); this.parts.forEach((p) => p.destroy());
  }
}
