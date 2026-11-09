import { img } from '../art.js';
import { ITEMS } from '../config.js';
import { fly } from './Fly.js';

const BW = 30; // belt width in world units

/**
 * A floor conveyor from a production line's pallet to its slot on the dispatch rack.
 * Cartons ride along it on their own, so the player (and staff) can collect everything in one place.
 * Belts are flat on the floor: people walk over them.
 */
export class Belt {
  constructor(scene, type, pts, src, dst, { every = 0.5, speed = 150 } = {}) {
    this.scene = scene; this.type = type; this.src = src; this.dst = dst;
    this.pts = pts.map(([x, y]) => ({ x, y }));
    this.every = every; this.speed = speed;
    this.t = 0; this.items = [];
    this.segs = [];
    let len = 0;
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      this.segs.push({ a, b, d, from: len });
      len += d;
    }
    this.len = len;
    this.parts = [];
    const g = scene.add.graphics().setDepth(-600);
    this.parts.push(g);
    for (const s of this.segs) {
      const horiz = Math.abs(s.b.y - s.a.y) < 1;
      const cx = (s.a.x + s.b.x) / 2, cy = (s.a.y + s.b.y) / 2;
      const w = horiz ? s.d + BW : BW, h = horiz ? BW : s.d + BW;
      // rails and rollers
      g.fillStyle(0x000000, 0.16); g.fillRoundedRect(cx - w / 2 - 3, cy - h / 2 + 3, w + 6, h + 6, 8);
      g.fillStyle(0x6b737b, 1); g.fillRoundedRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8, 8);
      const ts = scene.add.tileSprite(cx, cy, horiz ? h : w, horiz ? w : h, 'g_belt').setDepth(-599).setTileScale(0.5, 0.5);
      if (horiz) ts.setAngle(90);
      // the slats should run towards the rack
      const dir = horiz ? (s.b.x > s.a.x ? -1 : 1) : (s.b.y > s.a.y ? -1 : 1);
      this.parts.push(ts);
      s.ts = ts; s.dir = dir;
      g.fillStyle(0xffd23f, 1);
      if (horiz) { g.fillRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, 3); g.fillRect(cx - w / 2 - 4, cy + h / 2 + 1, w + 8, 3); }
      else { g.fillRect(cx - w / 2 - 4, cy - h / 2 - 4, 3, h + 8); g.fillRect(cx + w / 2 + 1, cy - h / 2 - 4, 3, h + 8); }
    }
  }

  pointAt(d) {
    for (const s of this.segs) {
      if (d <= s.from + s.d) { const k = (d - s.from) / s.d; return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k }; }
    }
    return { ...this.pts[this.pts.length - 1] };
  }

  /** cartons on the way, counted against the rack slot's room */
  get inFlight() { return this.items.length; }

  update(dt, mult = 1) {
    for (const s of this.segs) s.ts.tilePositionY += s.dir * this.speed * mult * dt * 2;
    this.t += dt * mult;
    if (this.t >= this.every) {
      this.t = 0;
      if (this.src.count > 0 && this.dst.count + this.items.length < this.dst.cap) {
        const from = this.src.pile.take();
        const start = this.pointAt(0);
        const im = img(this.scene, start.x, start.y, ITEMS[this.type].tex).setVisible(false);
        const it = { im, d: 0, ready: false };
        this.items.push(it);
        if (from) fly(this.scene, ITEMS[this.type].tex, from, start, { duration: 200, arc: 26, onDone: () => { it.ready = true; if (im.active) im.setVisible(true); } });
        else { it.ready = true; im.setVisible(true); }
      }
    }
    for (const it of this.items) {
      if (!it.ready) continue;
      it.d += this.speed * mult * dt;
      const p = this.pointAt(Math.min(it.d, this.len));
      it.im.setPosition(p.x, p.y + 6).setDepth(p.y - 590);
      if (it.d >= this.len) {
        it.done = true;
        const made = this.dst.pile.add(1, false)[0];
        if (made) { made.setVisible(false); fly(this.scene, ITEMS[this.type].tex, p, { x: made.x, y: made.y }, { duration: 170, arc: 22, onDone: () => made.active && made.setVisible(true) }); }
        it.im.destroy();
      }
    }
    this.items = this.items.filter((it) => !it.done);
  }

  /** cartons still riding when the scene saves go straight onto the rack */
  flush() { const n = this.items.length; this.items.forEach((it) => it.im.destroy()); this.items = []; return n; }

  destroy() { this.flush(); this.parts.forEach((p) => p.destroy()); }
}
