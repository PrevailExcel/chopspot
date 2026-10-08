import { img } from '../art.js';
import { ITEMS } from '../config.js';

const LAYOUTS = {
  // finished puff-puff heaped in a basket
  basket: (i) => { const col = i % 3, row = Math.floor(i / 3); return { x: (col - 1) * 14 + (row % 2) * 4 - 2, y: -row * 9 - (col === 1 ? 2 : 0) }; },
  // zobo bottles standing in a crate, second row on top
  crate: (i) => { const col = i % 5, row = Math.floor(i / 5); return { x: (col - 2) * 10.5, y: -row * 22 - 2 }; },
  shelfPuff: (i) => { const col = i % 4, layer = Math.floor(i / 4); return { x: (col - 1.5) * 18 + (layer % 2) * 5, y: -layer * 10 + (col % 2) * 3 }; },
  shelfZobo: (i) => { const col = i % 4, layer = Math.floor(i / 4); return { x: (col - 1.5) * 16 + (layer % 2) * 3, y: -layer * 21 + (col % 2) * 4 }; },
  cash: (i) => { const col = i % 3, row = Math.floor(i / 3) % 2, layer = Math.floor(i / 6); return { x: (col - 1) * 34 + row * 6, y: row * 15 - layer * 6 }; },
  // plates/bowls stacked in two columns on a tray
  plates: (i) => { const col = i % 2, layer = Math.floor(i / 2); return { x: (col - 0.5) * 30, y: -layer * 9 }; },
  // loaves lined up, rows stacked
  bread: (i) => { const col = i % 3, layer = Math.floor(i / 3); return { x: (col - 1) * 18 + (layer % 2) * 5, y: -layer * 9 }; },
  // dirty plates left on a dining table
  tablePlates: (i) => { const col = i % 2, layer = Math.floor(i / 2); return { x: (col - 0.5) * 34, y: -layer * 5 }; },
  cashSmall: (i) => { const col = i % 2, layer = Math.floor(i / 2); return { x: (col - 0.5) * 30, y: -layer * 6 }; },
};

/**
 * A visual heap of items at a fixed spot. Count can exceed what is drawn (cash piles cap their visuals).
 */
export class Pile {
  constructor(scene, x, y, { layout = 'basket', type = 'puff', depth = y + 1, maxVisual = 99, cap = 99, value = 0 } = {}) {
    this.scene = scene; this.x = x; this.y = y; this.layout = LAYOUTS[layout]; this.type = type;
    this.depth = depth; this.maxVisual = maxVisual; this.cap = cap;
    this.items = []; // images
    this.count = 0;
    this.value = value; // for cash piles: naira stored
  }

  get full() { return this.count >= this.cap; }

  posOf(i) { const p = this.layout(i); return { x: this.x + p.x, y: this.y + p.y }; }
  nextPos() { return this.posOf(Math.min(this.count, this.maxVisual - 1)); }
  topPos() { return this.posOf(Math.max(0, Math.min(this.count, this.maxVisual) - 1)); }

  add(n = 1, pop = true) {
    const made = [];
    for (let k = 0; k < n; k++) {
      if (this.items.length < this.maxVisual) {
        const i = this.items.length;
        const p = this.posOf(i);
        const im = img(this.scene, p.x, p.y, ITEMS[this.type] ? ITEMS[this.type].tex : 'item_cash');
        im.setDepth(this.depth + i * 0.01);
        this.items.push(im);
        made.push(im);
        if (pop) {
          im.setScale(0);
          this.scene.tweens.add({ targets: im, scale: 0.5, duration: 200, ease: 'Back.Out' });
        }
      }
      this.count++;
    }
    return made;
  }

  /** take one; returns world position of the removed visual */
  take() {
    if (this.count <= 0) return null;
    this.count--;
    if (this.items.length > this.count) {
      const im = this.items.pop();
      const pos = { x: im.x, y: im.y };
      this.scene.tweens.killTweensOf(im);
      im.destroy();
      return pos;
    }
    return this.topPos();
  }

  clear() { this.items.forEach((i) => i.destroy()); this.items = []; this.count = 0; this.value = 0; }

  setVisible(v) { this.items.forEach((i) => i.setVisible(v)); }
}
