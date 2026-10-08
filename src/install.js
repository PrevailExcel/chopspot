// Getting players to put the game on their home screen.
//
// How it works:
// - Android (Chrome, Edge, Samsung Internet): we catch the browser's install prompt and show it at good
//   moments instead of on page load, after a friendly card that explains why ("plays without data", bonus).
// - iPhone/iPad: there is no install prompt, so the card shows the 3 taps (Share > Add to Home Screen).
// - Inside WhatsApp / Instagram / Facebook / X browsers: install is impossible there and saves don't carry
//   over to Chrome, so we ask early to open the game in Chrome (one tap on Android).
// - The first time the game is opened from the home screen, the player gets an install bonus.
// - Asks are spaced out (at most MAX_ASKS, at least ASK_GAP_HOURS apart), and a small HUD button is always there.
import { Capacitor } from '@capacitor/core';
import { trackEvent } from './ads.js';

export const INSTALL_BONUS = 1000;
const MAX_ASKS = 4;
const ASK_GAP_HOURS = 20;
const MIN_PLAY_SECONDS = 40;
const KEY = 'abachop.install';

const ua = navigator.userAgent || '';
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(ua);
const inAppName = (() => {
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
  if (/Twitter|TwitterAndroid/i.test(ua)) return 'X';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/Telegram/i.test(ua)) return 'Telegram';
  if (/Line\//i.test(ua)) return 'LINE';
  if (isAndroid && /; wv\)/.test(ua)) return 'this app';
  if (isIOS && !/Safari\//.test(ua) && /AppleWebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return 'this app';
  return null;
})();
const native = (() => { try { return Capacitor.isNativePlatform(); } catch (e) { return false; } })();
const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
export const standalone = window.matchMedia?.('(display-mode: standalone)').matches
  || window.matchMedia?.('(display-mode: fullscreen)').matches
  || navigator.standalone === true;

let st = { asks: 0, lastAsk: 0, installed: false, rewarded: false, sessions: 0, accepted: false };
try { st = { ...st, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch (e) { /* no storage */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* no storage */ } };
st.sessions += 1; save();

let deferred = null;
const startedAt = performance.now();
let askedThisSession = false;
const listeners = new Set();
const changed = () => listeners.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we show it ourselves, at a better moment
  deferred = e;
  if (st.installed) { st.installed = false; save(); } // the browser says it isn't installed (any more)
  changed();
});
window.addEventListener('appinstalled', () => {
  st.installed = true; save(); deferred = null;
  trackEvent('install', { how: 'appinstalled' });
  changed();
});
if (standalone) {
  if (!st.installed) { st.installed = true; save(); }
  trackEvent('launch_standalone', {});
}

export const Install = {
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** 'prompt' | 'ios' | 'inapp' | null: what kind of help we can offer on this device right now */
  get mode() {
    if (native || standalone || framed || st.installed) return null;
    if (inAppName) return 'inapp';
    if (deferred) return 'prompt';
    if (isIOS) return 'ios';
    return null;
  },
  get inAppName() { return inAppName; },
  get isIOS() { return isIOS; },
  get isAndroid() { return isAndroid; },

  /** should the game pop the card up now? `moment` is what just happened ('progress', 'goal', 'branch', 'back', 'fame', 'start') */
  shouldAsk(moment) {
    const mode = this.mode;
    if (!mode || askedThisSession) return false;
    if (st.asks >= MAX_ASKS) return false;
    if (st.lastAsk && Date.now() - st.lastAsk < ASK_GAP_HOURS * 3600e3) return false;
    // inside WhatsApp & co. progress is stuck in that browser, so ask right away
    if (mode === 'inapp') return moment === 'start' || moment === 'progress';
    if ((performance.now() - startedAt) / 1000 < MIN_PLAY_SECONDS) return false;
    return moment !== 'start';
  },

  markAsked(moment) {
    askedThisSession = true;
    st.asks += 1; st.lastAsk = Date.now(); save();
    trackEvent('install_ask', { mode: this.mode, moment, n: st.asks });
  },

  /** Android: show the browser's own install sheet. Resolves true if the player said yes. */
  async prompt() {
    if (!deferred) return false;
    const e = deferred; deferred = null;
    try {
      e.prompt();
      const { outcome } = await e.userChoice;
      trackEvent('install_choice', { outcome });
      if (outcome === 'accepted') { st.accepted = true; save(); changed(); return true; }
    } catch (err) { /* prompt can only be used once */ }
    changed();
    return false;
  },

  dismissed(moment) { trackEvent('install_later', { mode: this.mode, moment }); },

  /** Opens this page in Chrome from an Android in-app browser. Returns false where that isn't possible (iOS). */
  openInBrowser() {
    trackEvent('install_open_browser', { app: inAppName });
    if (!isAndroid) return false;
    const url = new URL(window.location.href);
    url.searchParams.set('from', 'inapp');
    const target = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`;
    window.location.href = target;
    return true;
  },

  /** true once, the first time the game is opened from the home screen */
  claimBonus() {
    if (!standalone || native || st.rewarded) return false;
    st.rewarded = true; save();
    trackEvent('install_bonus', {});
    return true;
  },
};
