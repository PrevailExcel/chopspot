// Builds for web game portals:
//   npm run build:crazygames        (VITE_PORTAL=crazygames, see .env.crazygames)
//   npm run build:gamedistribution  (VITE_PORTAL=gamedistribution + VITE_GD_GAME_ID, see .env.gamedistribution)
// On the normal site and in the Android app PORTAL is empty and every call here does nothing.
//
// What changes on every portal build:
// - the portal's ads SDK loads before the game
// - billboards show made-up Aba shops instead of real ads, and tapping them opens nothing
// - no phone-number cloud save, no "add to home screen" prompts, no character screen on first start
// CrazyGames only: saves go through its data module, no title screen (players land in the game),
//   gameplay start/stop and loading are reported.
// GameDistribution only: the title screen stays, because its first ad must follow a tap (PLAY);
//   saves stay in localStorage, which GameDistribution keeps per game.
import { Sound } from './audio.js';

export const PORTAL = import.meta.env.VITE_PORTAL || '';
export const ON_PORTAL = !!PORTAL;
const GD_GAME_ID = import.meta.env.VITE_GD_GAME_ID || '';

let game = null;      // the Phaser game, so ads can pause it
let cg = null;        // window.CrazyGames.SDK once ready
let gd = null;        // window.gdsdk once ready
let playing = false;  // what we last told CrazyGames
let adOpen = false;
let gdRewarded = false;

function loadScript(src, timeout, id) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const t = setTimeout(() => reject(new Error('sdk timeout')), timeout);
    s.src = src; s.async = true; if (id) s.id = id;
    s.onload = () => { clearTimeout(t); resolve(); };
    s.onerror = () => { clearTimeout(t); reject(new Error('sdk failed')); };
    document.head.appendChild(s);
  });
}

function cgCall(fn) { if (!cg) return; try { fn(cg); } catch (e) { console.warn('[portal]', e); } }

/** freeze the game and its sound while an ad is on screen */
function adStart() {
  if (adOpen) return;
  adOpen = true;
  Portal.setPlaying(false);
  Sound.suspend();
  if (game && !game.isPaused) game.pause();
}
function adEnd() {
  if (!adOpen) return;
  adOpen = false;
  if (game && game.isPaused) game.resume();
  Sound.resume();
}

async function initCrazyGames() {
  await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js', 8000);
  const S = window.CrazyGames && window.CrazyGames.SDK;
  if (!S) return;
  await S.init();
  // 'crazygames' on the site, 'local' on localhost; 'disabled' anywhere else, where calls throw
  if (S.environment === 'disabled') return;
  cg = S;
  cgCall((s) => s.game.loadingStart());
}

async function initGameDistribution() {
  if (!GD_GAME_ID) { console.warn('[portal] VITE_GD_GAME_ID is not set: ads are off'); return; }
  let ready;
  const whenReady = new Promise((r) => { ready = r; });
  window.GD_OPTIONS = {
    gameId: GD_GAME_ID,
    onEvent(event) {
      switch (event.name) {
        case 'SDK_READY': ready(); break;
        case 'SDK_GAME_PAUSE': adStart(); break; // an ad is about to show: pause and mute
        case 'SDK_GAME_START': adEnd(); break;   // the ad is gone: carry on
        case 'SDK_REWARDED_WATCH_COMPLETE': gdRewarded = true; break;
        default: break;
      }
    },
  };
  await loadScript('https://html5.api.gamedistribution.com/main.min.js', 8000, 'gamedistribution-jssdk');
  // don't hold the game up for long if the SDK is slow to say it is ready
  await Promise.race([whenReady, new Promise((r) => setTimeout(r, 3000))]);
  if (window.gdsdk && typeof window.gdsdk.showAd === 'function') gd = window.gdsdk;
}

export const Portal = {
  get ready() { return !!(cg || gd); },

  /** Load and start the portal SDK. Call before the game reads its save. Never throws. */
  async init() {
    try {
      if (PORTAL === 'crazygames') await initCrazyGames();
      else if (PORTAL === 'gamedistribution') await initGameDistribution();
    } catch (e) {
      console.warn('[portal] SDK not available, playing without it', e);
      cg = null; gd = null;
    }
  },

  /** hand over the Phaser game once it exists, so ads can pause it */
  attach(g) { game = g; },

  /** the first branch is on screen */
  loaded() { cgCall((s) => s.game.loadingStop()); },

  /** Report whether the player is playing right now. Safe to call every frame: only changes are sent. */
  setPlaying(on) {
    on = !!on && !adOpen;
    if (on === playing || !cg) return;
    playing = on;
    cgCall((s) => (on ? s.game.gameplayStart() : s.game.gameplayStop()));
  },

  /** A rare, real achievement (a new branch). CrazyGames shows a small celebration. */
  happy() { cgCall((s) => s.game.happytime()); },

  /** Save storage: CrazyGames' data module when it is ready, else null (use localStorage). */
  get storage() { return cg ? cg.data : null; },

  // ---- video ads: call these only right after a tap ----
  /** First ad, when the player taps PLAY. GameDistribution only (CrazyGames runs its own). */
  preroll() { return gd ? this.ad('midgame') : Promise.resolve(false); },
  /** Ad between breaks, e.g. when travelling to another branch. Resolves when the game can carry on. */
  midgame() { return this.ad('midgame'); },
  /** Ad the player chose to watch for a reward. Resolves true only if it played to the end. */
  rewarded() { return this.ad('rewarded'); },

  ad(type) {
    if (adOpen) return Promise.resolve(false);
    if (cg) {
      return new Promise((resolve) => {
        let started = false;
        const done = (ok) => { adEnd(); resolve(ok); };
        try {
          cg.ad.requestAd(type, {
            adStarted: () => { started = true; adStart(); },
            adFinished: () => done(true),
            adError: () => (started ? done(false) : resolve(false)),
          });
        } catch (e) { resolve(false); }
      });
    }
    if (gd) {
      gdRewarded = false;
      const p = type === 'rewarded' ? gd.showAd('rewarded') : gd.showAd();
      return Promise.resolve(p)
        .then(() => (type === 'rewarded' ? gdRewarded : true))
        .catch(() => false)
        .finally(() => adEnd()); // in case the SDK never sent SDK_GAME_START
    }
    return Promise.resolve(false);
  },
};
