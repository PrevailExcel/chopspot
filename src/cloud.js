// Cloud save: phone number + 4-digit PIN, so progress survives a cleared browser and moves between phones.
// The save with more lifetime earnings always wins. Server: /server/index.php. Turned on by VITE_SAVE_API.
import { Store, DEMO } from './platform.js';
import { ON_PORTAL } from './portal.js';

const API = (import.meta.env.VITE_SAVE_API || '').replace(/\/$/, '');
const ACCOUNT = 'chopspot.cloud';
const ASKED = 'chopspot.cloudAsk';
const PUSH_EVERY = 60000;

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } };

/** text/plain keeps these "simple" requests: no CORS preflight, and keepalive works when the tab closes */
async function post(route, body, { timeout = 8000, keepalive = false } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${API}/${route}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), signal: ctl.signal, keepalive });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, ...data };
  } catch (e) {
    return { status: 0, error: 'No connection. Try again' };
  } finally { clearTimeout(t); }
}

let lastPush = 0;

export const Cloud = {
  enabled: !!API && !DEMO && !ON_PORTAL, // portals save through their own SDK
  get account() { return read(ACCOUNT); },
  get linked() { return this.enabled && !!(this.account && this.account.token); },
  progress(state) { return Math.floor((state && state.stats && state.stats.earned) || 0); },
  /** 2348031234567 -> 0803 ••• 4567 */
  showPhone(p = this.account && this.account.phone) { return p ? `0${String(p).slice(3, 6)} ••• ${String(p).slice(-4)}` : ''; },

  /**
   * Save with this number and PIN. New number: the account is made with this phone's progress.
   * Known number: whichever save is bigger wins. Returns { ok, error, replaced } where `replaced`
   * means the cloud save was bigger and has been written over this phone's save (reload to play it).
   */
  async connect(phone, pin, state) {
    const res = await post('connect', { phone, pin, save: state, progress: this.progress(state) });
    if (res.status !== 200 || !res.token) return { ok: false, error: res.error || 'Something went wrong. Try again' };
    write(ACCOUNT, { phone: res.phone, token: res.token });
    lastPush = Date.now();
    const replaced = res.progress > this.progress(state) && res.save && typeof res.save === 'object';
    if (replaced) Store.save(res.save);
    return { ok: true, replaced, created: !!res.created };
  },

  /** on start: if the cloud has more progress than this phone (another phone, or a cleared browser), use it */
  async pullOnStart() {
    if (!this.linked) return;
    const res = await post('pull', { token: this.account.token }, { timeout: 3500 });
    if (res.status === 401) { write(ACCOUNT, null); return; }
    if (res.status !== 200 || !res.save || typeof res.save !== 'object') return;
    if (res.progress > this.progress(Store.load())) Store.save(res.save);
  },

  /** called whenever the game saves; sends at most once a minute (or right away when the tab is hidden) */
  push(state, force = false) {
    if (!this.linked) return;
    const now = Date.now();
    if (now - lastPush < (force ? 3000 : PUSH_EVERY)) return;
    lastPush = now;
    post('sync', { token: this.account.token, save: state, progress: this.progress(state) }, { keepalive: force }).then((res) => {
      if (res.status === 401) write(ACCOUNT, null);
    });
  },

  logout() { write(ACCOUNT, null); },

  // ---- when to ask: after the player has something to lose, at a happy moment, not too often ----
  shouldAsk(state) {
    if (!this.enabled || this.linked) return false;
    const a = read(ASKED) || { n: 0, t: 0 };
    if (a.n >= 6 || Date.now() - a.t < (a.n ? 6 * 3600e3 : 0)) return false;
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return this.progress(state) >= (ios ? 400 : 1500);
  },
  markAsked() { const a = read(ASKED) || { n: 0, t: 0 }; write(ASKED, { n: a.n + 1, t: Date.now() }); },
};
