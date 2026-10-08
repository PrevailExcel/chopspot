import { Pile } from './Pile.js';
import { Zone } from './Zone.js';
import { fly } from './Fly.js';
import { Sound } from '../audio.js';
import { Haptic } from '../platform.js';

/** A heap of naira bundles that the player sweeps up by walking over it. */
export class CashPile {
  constructor(scene, x, y, { layout = 'cash', maxVisual = 18, zoneR = 50, unit = 4, depth = null } = {}) {
    this.scene = scene; this.x = x; this.y = y; this.unit = unit;
    this.pile = new Pile(scene, x, y, { layout, type: 'cash', maxVisual, depth: depth ?? y + 2 });
    this.maxVisual = maxVisual;
    this.value = 0;
    this.zone = new Zone(scene, { x, y: y + 4, r: zoneR }, { visible: false });
    this.cool = 0;
  }

  deposit(amount, from = null, delay = 0) {
    if (amount <= 0) return;
    this.value += amount;
    const want = Math.min(this.maxVisual, Math.max(1, Math.ceil(this.value / this.unit)));
    const add = want - this.pile.count;
    if (add <= 0) return;
    const made = this.pile.add(add, !from);
    if (from) {
      made.forEach((im, k) => {
        im.setVisible(false);
        this.scene.time.delayedCall(delay + k * 45, () => {
          fly(this.scene, 'item_cash', from, { x: im.x, y: im.y }, {
            duration: 300, arc: 50, onDone: () => {
              if (!im.active) return;
              im.setVisible(true); im.setScale(0.62);
              this.scene.tweens.add({ targets: im, scale: 0.5, duration: 140 });
            },
          });
        });
      });
    }
  }

  /** set silently (used when loading a save) */
  restore(value) {
    if (value <= 0) return;
    this.value = value;
    const want = Math.min(this.maxVisual, Math.max(1, Math.ceil(value / this.unit)));
    this.pile.add(want, false);
  }

  /** sweep into the player's pocket while they stand on it */
  update(dt, player, onGain) {
    this.cool -= dt;
    const inside = this.value > 0 && this.zone.contains(player.x, player.y, 18);
    if (!inside || this.cool > 0) return inside;
    this.cool = 0.035;
    const n = this.pile.count;
    const amount = n <= 1 ? this.value : Math.floor(this.value / n);
    this.value -= amount;
    const pos = this.pile.take() || { x: this.x, y: this.y };
    if (this.value <= 0 && this.pile.count > 0) { while (this.pile.count) this.pile.take(); }
    Sound.play('coin');
    Haptic.tap('light');
    fly(this.scene, 'item_cash', pos, () => ({ x: player.x, y: player.y - 50 }), {
      duration: 220, arc: 40, onDone: () => onGain(amount),
    });
    return true;
  }
}
