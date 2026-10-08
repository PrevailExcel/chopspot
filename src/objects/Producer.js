import { img } from '../art.js';
import { Pile } from './Pile.js';
import { Zone } from './Zone.js';
import { fly } from './Fly.js';
import { ITEMS } from '../config.js';
import { label } from './ui.js';

// How each kind of machine looks: its texture, where finished food is put down, and its ambient effects.
const KINDS = {
  fryer: { machine: 'm_fryer', holder: 'm_basket', hx: 66, hy: 26, layout: 'basket', pdy: -6, fx: ['steam', 'sizzle'], top: 120, emit: 60, rect: [-62, 100] },
  zobo: { machine: 'm_zobo', holder: 'm_crate', hx: 60, hy: 26, layout: 'crate', pdy: -4, fx: ['drip'], top: 150, emit: 16, rect: [-62, 92] },
  jollof: { machine: 'm_jollof', holder: 'm_platetray', hx: 70, hy: 28, layout: 'plates', pdy: -6, fx: ['smoke', 'embers'], top: 128, emit: 64, rect: [-64, 104] },
  noodles: { machine: 'm_noodle', holder: 'm_platetray', hx: 68, hy: 28, layout: 'plates', pdy: -6, fx: ['steam'], top: 122, emit: 58, rect: [-62, 102] },
  akara: { machine: 'm_akara', holder: 'm_basket', hx: 66, hy: 26, layout: 'basket', pdy: -6, fx: ['steam', 'sizzle'], top: 120, emit: 60, rect: [-62, 100] },
  oven: { machine: 'm_oven', holder: 'm_breadtray', hx: 66, hy: 28, layout: 'bread', pdy: -6, fx: ['smoke'], top: 136, emit: 50, rect: [-60, 100] },
  fridge: { machine: 'm_fridge', holder: 'm_crate', hx: -66, hy: 28, layout: 'crate', pdy: -4, fx: [], top: 160, emit: 70, rect: [-100, 52], zx: -34 },
};

/** A machine that keeps producing one food into its basket/crate/tray until full. */
export class Producer {
  constructor(scene, id, cfg, startCount = null) {
    this.scene = scene; this.id = id; this.cfg = cfg; this.type = cfg.type;
    const k = KINDS[cfg.kind];
    this.k = k;
    const { x, y } = cfg;
    this.x = x; this.y = y;
    this.machine = img(scene, x, y, k.machine).setDepth(y);
    const hx = x + k.hx, hy = y + k.hy;
    this.holder = img(scene, hx, hy, k.holder).setDepth(hy);
    this.pile = new Pile(scene, hx, hy + k.pdy, { layout: k.layout, type: cfg.type, depth: hy + 1, cap: cfg.cap });
    this.zone = new Zone(scene, { x: x + (k.zx ?? 34), y: y + 92, r: 54 });
    this.rect = { x1: x + k.rect[0], x2: x + k.rect[1], y1: y - 30, y2: y + 34 };
    this.timer = 0;
    this.fullLabel = label(scene, x, y - k.top, 'FULL', { size: 15, color: '#ffffff', stroke: '#c0392b', sw: 6 }).setDepth(25000).setVisible(false);
    this.pile.add(startCount ?? cfg.start, false);
    this.fx = [];
    const add = (e) => { this.fx.push(e); return e; };
    for (const f of k.fx) {
      if (f === 'steam') add(scene.add.particles(x, y - k.emit, 'fx_soft', {
        speedY: { min: -40, max: -20 }, speedX: { min: -8, max: 8 }, scale: { start: 0.25, end: 0.7 }, alpha: { start: 0.45, end: 0 },
        lifespan: 1400, frequency: 260, x: { min: -30, max: 30 },
      }).setDepth(y + 2));
      if (f === 'sizzle') add(scene.add.particles(x, y - k.emit + 4, 'fx_dot', {
        speed: { min: 20, max: 60 }, angle: { min: 220, max: 320 }, gravityY: 200, scale: { start: 0.18, end: 0 },
        tint: [0xffe08a, 0xffffff], lifespan: 450, frequency: 140, x: { min: -30, max: 30 },
      }).setDepth(y + 3));
      if (f === 'drip') add(scene.add.particles(x, y - 18, 'fx_dot', {
        speedY: { min: 30, max: 60 }, scale: { start: 0.14, end: 0.05 }, tint: 0xb3173f, lifespan: 300, frequency: 900, gravityY: 300,
      }).setDepth(y + 3));
      if (f === 'smoke') add(scene.add.particles(x, y - k.emit - 10, 'fx_soft', {
        speedY: { min: -50, max: -25 }, speedX: { min: -10, max: 14 }, scale: { start: 0.3, end: 0.9 }, alpha: { start: 0.35, end: 0 },
        tint: 0x9a9a9a, lifespan: 1800, frequency: 300, x: { min: -20, max: 20 },
      }).setDepth(y + 2));
      if (f === 'embers') add(scene.add.particles(x, y + 6, 'fx_dot', {
        speedY: { min: -60, max: -30 }, speedX: { min: -15, max: 15 }, scale: { start: 0.15, end: 0 },
        tint: [0xffb02e, 0xff5a1a], lifespan: 700, frequency: 180, x: { min: -24, max: 24 },
      }).setDepth(y + 3));
    }
  }

  get count() { return this.pile.count; }

  popIn() {
    [this.machine, this.holder].forEach((t) => { t.setScale(0); this.scene.tweens.add({ targets: t, scale: 0.5, duration: 520, ease: 'Back.Out' }); });
  }

  update(dt, speedMult) {
    this.zone.update(dt);
    const full = this.pile.full;
    this.fullLabel.setVisible(full);
    if (full) { this.fullLabel.y = this.y - this.k.top + Math.sin(this.scene.time.now / 200) * 3; return; }
    this.timer += dt * speedMult;
    if (this.timer >= this.cfg.interval) {
      this.timer = 0;
      const im = this.pile.add(1, false)[0];
      if (im) {
        im.setVisible(false);
        fly(this.scene, ITEMS[this.type].tex, { x: this.x, y: this.y - this.k.emit }, { x: im.x, y: im.y }, {
          duration: 330, arc: 45, onDone: () => { if (im.active) im.setVisible(true); },
        });
      }
      this.scene.tweens.add({ targets: this.machine, scaleY: 0.47, scaleX: 0.52, duration: 90, yoyo: true });
    }
  }
}
