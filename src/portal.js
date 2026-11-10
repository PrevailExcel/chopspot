// Builds for web game portals. `npm run build:crazygames` sets VITE_PORTAL=crazygames (see .env.crazygames).
// On the normal site and in the Android app PORTAL is empty and every call here does nothing.
//
// What changes on a portal build:
// - the portal's SDK loads before the game, and saves go through its data module (synced to the player's account)
// - billboards show made-up Aba shops instead of real ads, and tapping them opens nothing
// - no phone-number cloud save, no "add to home screen" prompts, no title screen, no character screen on first start
// - gameplay start/stop is reported so the portal can measure loading and play time
import { Sound } from './audio.js';

export const PORTAL = import.meta.env.VITE_PORTAL || '';
export const ON_PORTAL = !!PORTAL;

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
let sdk = null;       // window.CrazyGames.SDK once it is ready, else null
let playing = false;  // what we last told the portal
let adOpen = false;

function loadScript(src, timeout) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const t = setTimeout(() => reject(new Error('sdk timeout')), timeout);
    s.src = src; s.async = true;
    s.onload = () => { clearTimeout(t); resolve(); };
    s.onerror = () => { clearTimeout(t); reject(new Error('sdk failed')); };
    document.head.appendChild(s);
  });
}

function call(fn) { if (!sdk) return; try { fn(sdk); } catch (e) { console.warn('[portal]', e); } }

export const Portal = {
  get ready() { return !!sdk; },

  /** Load and start the portal SDK. Call before the game reads its save. Never throws. */
  async init() {
    if (PORTAL !== 'crazygames') return;
    try {
      await loadScript(SDK_URL, 8000);
      const S = window.CrazyGames && window.CrazyGames.SDK;
      if (!S) return;
      await S.init();
      // 'crazygames' on the site, 'local' on localhost; 'disabled' anywhere else, where calls throw
      if (S.environment === 'disabled') return;
      sdk = S;
      call((s) => s.game.loadingStart());
    } catch (e) {
      console.warn('[portal] SDK not available, playing without it', e);
      sdk = null;
    }
  },

  /** the first branch is on screen */
  loaded() { call((s) => s.game.loadingStop()); },

  /** Report whether the player is playing right now. Safe to call every frame: only changes are sent. */
  setPlaying(on) {
    on = !!on && !adOpen;
    if (on === playing || !sdk) return;
    playing = on;
    call((s) => (on ? s.game.gameplayStart() : s.game.gameplayStop()));
  },

  /** A rare, real achievement (a new branch). The portal shows a small celebration. */
  happy() { call((s) => s.game.happytime()); },

  /** Save storage: the portal's data module when it is ready, else null (use localStorage). */
  get storage() { return sdk ? sdk.data : null; },

  // ---- video ads (only shown after Full Launch; the portal disables them during Basic Launch) ----
  /** Ad between breaks, e.g. after travelling to another branch. Resolves when the game can carry on. */
  midgame() { return this.ad('midgame'); },
  /** Ad the player chose to watch for a reward. Resolves true only if it played to the end. */
  rewarded() { return this.ad('rewarded'); },
  ad(type) {
    if (!sdk || adOpen) return Promise.resolve(false);
    return new Promise((resolve) => {
      const done = (ok) => { if (!adOpen) return; adOpen = false; Sound.resume(); resolve(ok); };
      try {
        sdk.ad.requestAd(type, {
          adStarted: () => { adOpen = true; this.setPlaying(false); Sound.suspend(); },
          adFinished: () => done(true),
          adError: () => { if (adOpen) done(false); else resolve(false); },
        });
      } catch (e) { resolve(false); }
    });
  },
};
