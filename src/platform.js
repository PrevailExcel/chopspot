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
// Storage can be unavailable (private mode, sandboxed previews); the game must still run.
let memoryFallback = null;
export const Store = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return memoryFallback; }
  },
  save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { memoryFallback = data; }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    memoryFallback = null;
  },
};
