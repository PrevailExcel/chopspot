// Haptics (Capacitor native, falling back to the Vibration API) and save storage.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();
let hapticsOn = true;
let last = 0;

export const Haptic = {
  set(on) { hapticsOn = on; },
  get on() { return hapticsOn; },
  tap(strength = 'light') {
    if (!hapticsOn) return;
    const now = performance.now();
    if (strength === 'light' && now - last < 70) return;
    last = now;
    try {
      if (native) {
        const style = strength === 'heavy' ? ImpactStyle.Heavy : strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
        Haptics.impact({ style });
      } else if (navigator.vibrate) {
        navigator.vibrate(strength === 'heavy' ? 40 : strength === 'medium' ? 20 : 8);
      }
    } catch (e) { /* haptics are optional */ }
  },
};

const KEY = 'puffzobo.save.v1';

/** ?demo=gra opens straight into the GRA Lounge with some cash; nothing is saved (the real save is untouched). */
/* global __DEMO_DEFAULT__ */
export const DEMO = (() => {
  try { const q = new URLSearchParams(location.search).get('demo'); if (q) return q === 'off' ? null : q; } catch (e) { /* ignore */ }
  return typeof __DEMO_DEFAULT__ !== 'undefined' && __DEMO_DEFAULT__ ? __DEMO_DEFAULT__ : null;
})();
function demoSave(real) {
  return {
    v: 2, cash: 20000, branch: 'lounge', owned: { stand: true, buka: true, lounge: true }, profile: real && real.profile ? real.profile : null,
    branches: { stand: { unlocked: { fryer1: true, sign: true }, tut: 9 }, buka: { unlocked: { jollof: true, t1: true, t2: true, generator: true }, tut: 9 }, lounge: {} },
    settings: real && real.settings ? real.settings : { sfx: true, music: true, haptic: true }, stats: { served: 0, earned: 0, buses: 0, start: Date.now() }, t: Date.now(),
  };
}

// Storage can be unavailable (private mode, sandboxed previews); the game must still run.
let memoryFallback = null;
let demoState = null;
export const Store = {
  load() {
    let real = null;
    try { const raw = localStorage.getItem(KEY); real = raw ? JSON.parse(raw) : null; } catch (e) { real = memoryFallback; }
    if (DEMO === 'gra') return demoState || (demoState = demoSave(real));
    return real;
  },
  save(data) {
    if (DEMO) { demoState = data; return; }
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { memoryFallback = data; }
  },
  clear() {
    if (DEMO) { demoState = null; return; } // never wipe the real save from a demo visit
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    memoryFallback = null;
  },
};
