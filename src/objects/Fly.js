import { img } from '../art.js';

/**
 * Throw an item sprite in an arc from `from` to a (possibly moving) target.
 * `to` may be a point or a function returning a point, evaluated every frame.
 */
export function fly(scene, key, from, to, { duration = 260, arc = 60, onDone = null, scale = 0.5, spin = 0 } = {}) {
  const im = img(scene, from.x, from.y, key);
  im.setDepth(20000);
  im.setScale(scale);
  const st = { t: 0 };
  scene.tweens.add({
    targets: st, t: 1, duration, ease: 'Sine.InOut',
    onUpdate: () => {
      const dest = typeof to === 'function' ? to() : to;
      const t = st.t;
      im.x = from.x + (dest.x - from.x) * t;
      im.y = from.y + (dest.y - from.y) * t - Math.sin(Math.PI * t) * arc;
      im.rotation = spin * t;
    },
    onComplete: () => { im.destroy(); if (onDone) onDone(); },
  });
  return im;
}
