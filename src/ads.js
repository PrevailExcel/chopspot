// Roadside billboards: real ad space inside the game.
// - Add or change an advertiser in CREATIVES, then point a board at it in SLOTS.
// - A creative is either painted in code (`paint`) or an image you drop into public/ads/ (`image`, 1200x560 px).
// - Tapping a board opens the advertiser's link. Views and taps are counted per ad (see `adStats()`), and are
//   also posted to TRACK_URL if you set one, so you can show advertisers real numbers.
// - On portal builds (CrazyGames etc.) only the portal's own ads are allowed, so the boards show made-up
//   Aba shops instead (PORTAL_CREATIVES), nothing is counted and tapping a board opens nothing.
import { paintTexture, roundRect, linearGrad, radialGrad, groundShadow, R } from './art.js';
import { ON_PORTAL } from './portal.js';

export const TRACK_URL = '';      // e.g. 'https://api.yoursite.ng/ad-events' (POST, JSON array). Empty = keep counts on the device only.
export const BOOKING_URL = '';    // where "Your brand here" boards send people, e.g. 'https://wa.me/234XXXXXXXXXX?text=Billboard%20in%20Aba%20Chop%20Spot'
export const ROTATE_EVERY = 16;   // seconds a board shows one ad before flipping to the next (only when it has several)

const UTM = 'utm_source=abachopspot&utm_medium=billboard&utm_campaign=launch';

const SITE_CREATIVES = {
  vezio: {
    label: 'Vezio',
    url: `https://vezio.ng/?${UTM}`,
    paint: paintVezio,
  },
  house: {
    label: 'Advertise here',
    url: null, // falls back to BOOKING_URL
    paint: paintHouse,
  },
  '2wise': {
    label: '2Wise',
    url: `https://2wise.com.ng/?${UTM}`,
    image: 'ads/2wise.jpg', // built from the 2Wise logo and app screenshot (1200x560)
  },
  // Example of an image creative (put the file in public/ads/):
  // shoprite: { label: 'Brand name', url: 'https://brand.ng', image: 'ads/brand.png' },
};

/** Shop signs for portal builds: scenery, not ads. Painted in code, no links. */
const PORTAL_CREATIVES = {
  fabrics: { label: 'Nkechi Fabrics', url: null, paint: paintFabrics },
  water: { label: 'Mmiri Table Water', url: null, paint: paintWater },
  phones: { label: 'Chuks Phones', url: null, paint: paintPhones },
};
const PORTAL_ROTATION = ['fabrics', 'water', 'phones'];
/** each board gets two shops, offset so neighbouring boards don't match */
let portalN = 0;
const portalAds = () => { const i = portalN++ % PORTAL_ROTATION.length; return [PORTAL_ROTATION[i], PORTAL_ROTATION[(i + 1) % PORTAL_ROTATION.length]]; };

export const CREATIVES = ON_PORTAL ? PORTAL_CREATIVES : SITE_CREATIVES;

/** Boards per branch. x/y is where the legs stand. The main board sits on the street edge of the lot; the others are across the street. */
/** screens inside the 3D GRA Lounge (facade screen faces the street, bar screen faces the dining room) */
const SITE_SCREENS = {
  'gra-facade': ['vezio', '2wise', 'house'],
  'gra-bar': ['2wise', 'vezio'],
};

const SITE_SLOTS = {
  stand: [
    { id: 'faulks-main', x: 270, y: 1450, ads: ['vezio', '2wise'] },  // in view whenever you're at the counter
    { id: 'faulks-left', x: 230, y: 1720, ads: ['2wise', 'house'] },  // across the street
    { id: 'faulks-right', x: 770, y: 1720, ads: ['vezio', '2wise'] },
  ],
  buka: [
    { id: 'ariaria-main', x: 325, y: 1450, ads: ['2wise', 'vezio'] },
    { id: 'ariaria-left', x: 230, y: 1720, ads: ['vezio', '2wise'] },
    { id: 'ariaria-right', x: 770, y: 1720, ads: ['house', '2wise'] },
  ],
  // the factory's shop cash and upgrade desk sit near the front fence, so its boards stand across the street
  factory: [
    { id: 'factory-main', x: 500, y: 1720, ads: ['vezio', '2wise'] },
    { id: 'factory-left', x: 150, y: 1720, ads: ['2wise', 'house'] },
    { id: 'factory-right', x: 850, y: 1720, ads: ['house', 'vezio'] },
  ],
};

export const SCREENS = ON_PORTAL
  ? Object.fromEntries(Object.keys(SITE_SCREENS).map((k) => [k, portalAds()]))
  : SITE_SCREENS;
export const SLOTS = ON_PORTAL
  ? Object.fromEntries(Object.entries(SITE_SLOTS).map(([k, list]) => [k, list.map((slot) => ({ ...slot, ads: portalAds() }))]))
  : SITE_SLOTS;

// ---------------------------------------------------------------------------
// Board geometry (world units)
const FRAME_W = 340, FRAME_H = 230, ANCHOR_Y = 222 / 230;
const FACE_W = 300, FACE_H = 140, FACE_X = 20, FACE_Y = 18;

export function buildAdTextures(scene) {
  paintTexture(scene, 'd_billboard', FRAME_W, FRAME_H, 0.5, ANCHOR_Y, (c) => {
    groundShadow(c, 170, 221, 130, 7);
    // legs
    for (const lx of [104, 236]) {
      roundRect(c, lx - 8, 176, 16, 46, 2); c.fillStyle = linearGrad(c, lx - 8, 0, lx + 8, 0, [[0, '#4a525c'], [0.5, '#7b8590'], [1, '#3d444c']]); c.fill();
      c.fillStyle = '#2d333b'; c.fillRect(lx - 11, 216, 22, 6);
    }
    c.strokeStyle = '#4a525c'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(112, 184); c.lineTo(228, 212); c.moveTo(228, 184); c.lineTo(112, 212); c.stroke();
    // catwalk with railing
    roundRect(c, 12, 168, 316, 9, 2); c.fillStyle = '#3d444c'; c.fill();
    c.strokeStyle = '#6b747e'; c.lineWidth = 1.5;
    for (let x = 18; x <= 322; x += 19) { c.beginPath(); c.moveTo(x, 168); c.lineTo(x, 177); c.stroke(); }
    // frame around the face
    roundRect(c, 10, 8, 320, 160, 6); c.fillStyle = '#2d333b'; c.fill();
    roundRect(c, 16, 14, 308, 148, 4); c.fillStyle = '#1b1f24'; c.fill();
    // lamps on arms above the board
    for (const lx of [70, 170, 270]) {
      c.strokeStyle = '#4a525c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(lx, 10); c.lineTo(lx, 3); c.lineTo(lx + 10, 3); c.stroke();
      roundRect(c, lx + 6, 1, 14, 6, 2); c.fillStyle = '#d9dde2'; c.fill();
    }
  });
  for (const [id, ad] of Object.entries(CREATIVES)) {
    if (ad.paint) paintTexture(scene, `ad_${id}`, FACE_W, FACE_H, 0, 0, (c) => ad.paint(c, FACE_W, FACE_H));
  }
}

// ---------------------------------------------------------------------------
// Creatives painted in code

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
function txt(c, s, x, y, font, color, align = 'left') {
  c.font = font; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(s, x, y);
}
function adTag(c, w, dark) {
  roundRect(c, w - 26, 6, 20, 11, 3); c.fillStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'; c.fill();
  txt(c, 'Ad', w - 16, 12, `600 7.5px ${SANS}`, dark ? '#d8dbe0' : '#3a2a10', 'center');
}

/** Vezio: ink black, flash orange, V mark with a diamond at the base. */
function paintVezio(c, w, h) {
  const ORANGE = '#FF5C33';
  c.fillStyle = '#0B0B0F'; c.fillRect(0, 0, w, h);
  c.fillStyle = radialGrad(c, w * 0.85, -10, 4, w * 0.85, -10, 190, [[0, 'rgba(255,92,51,0.45)'], [1, 'rgba(255,92,51,0)']]); c.fillRect(0, 0, w, h);
  c.fillStyle = radialGrad(c, 62, 78, 2, 62, 78, 70, [[0, 'rgba(255,92,51,0.22)'], [1, 'rgba(255,92,51,0)']]); c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.035)'; c.lineWidth = 6;
  for (let x = -h; x < w; x += 22) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); }

  // V mark
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = linearGrad(c, 0, 30, 0, 96, [[0, '#FF8A66'], [1, ORANGE]]); c.lineWidth = 15;
  c.beginPath(); c.moveTo(36, 34); c.lineTo(62, 90); c.lineTo(88, 34); c.stroke();
  // diamond at the base
  c.beginPath(); c.moveTo(62, 102); c.lineTo(71, 112); c.lineTo(62, 122); c.lineTo(53, 112); c.closePath();
  c.fillStyle = '#ffffff'; c.fill();

  // words
  const x = 118;
  if ('letterSpacing' in c) c.letterSpacing = '2px';
  txt(c, 'VEZIO', x - 1, 40, `900 36px ${SANS}`, '#ffffff');
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  txt(c, 'Your Money, Your Vibe', x, 70, `700 15px ${SANS}`, ORANGE);
  txt(c, 'USD virtual card · Pay bills', x, 89, `500 10.5px ${SANS}`, '#a3a8b2');
  roundRect(c, x, 103, 104, 22, 11); c.fillStyle = ORANGE; c.fill();
  txt(c, 'Download the app', x + 52, 114.5, `700 10px ${SANS}`, '#0B0B0F', 'center');
  txt(c, 'vezio.ng', x + 114, 114.5, `600 11px ${MONO}`, '#ffffff');
  adTag(c, w, true);
}

/** "Your brand here" board that sells the space. */
function paintHouse(c, w, h) {
  c.fillStyle = linearGrad(c, 0, 0, 0, h, [[0, '#ffd84a'], [1, '#ffb81f']]); c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 10;
  for (let x = -h; x < w; x += 34) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); }
  const F = 'Fredoka, system-ui, sans-serif';
  txt(c, 'YOUR BRAND HERE', w / 2, 44, `700 30px ${F}`, '#2a1a0a', 'center');
  txt(c, 'Seen by players all over Aba', w / 2, 76, `600 14px ${F}`, '#5a3a10', 'center');
  roundRect(c, w / 2 - 74, 96, 148, 26, 13); c.fillStyle = '#1f7a37'; c.fill();
  txt(c, 'Book this billboard', w / 2, 109.5, `700 13px ${F}`, '#ffffff', 'center');
  adTag(c, w, false);
}

// ---------------------------------------------------------------------------
// Made-up Aba shops for portal builds (no "Ad" tag: they are part of the street)

const SIGN = 'Fredoka, system-ui, sans-serif';

/** Nkechi Fabrics: Ankara-style dots and diamonds */
function paintFabrics(c, w, h) {
  c.fillStyle = '#7b2d8b'; c.fillRect(0, 0, w, h);
  for (let y = 10; y < h; y += 28) {
    for (let x = (y / 28) % 2 ? 14 : 0; x < w; x += 28) {
      c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fillStyle = '#ffd23f'; c.fill();
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fillStyle = '#e33d5c'; c.fill();
    }
  }
  roundRect(c, 24, 26, w - 48, h - 52, 14); c.fillStyle = 'rgba(255,248,230,0.94)'; c.fill();
  txt(c, 'Nkechi Fabrics', w / 2, 58, `700 28px ${SIGN}`, '#7b2d8b', 'center');
  txt(c, 'Ankara · Lace · George', w / 2, 88, `600 14px ${SIGN}`, '#3a2a1a', 'center');
}

/** Mmiri Table Water: sachet water, ice cold */
function paintWater(c, w, h) {
  c.fillStyle = linearGrad(c, 0, 0, 0, h, [[0, '#5ec8f2'], [1, '#1f7fc4']]); c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [x, y, r] of [[40, 30, 10], [270, 40, 14], [250, 110, 8], [60, 112, 12], [150, 20, 6]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  // sachet
  roundRect(c, 30, 36, 64, 74, 10); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fill();
  roundRect(c, 40, 54, 44, 30, 6); c.fillStyle = '#1f7fc4'; c.fill();
  txt(c, 'MMIRI', 62, 69.5, `700 11px ${SIGN}`, '#ffffff', 'center');
  txt(c, 'Mmiri Table Water', 108, 58, `700 22px ${SIGN}`, '#ffffff');
  txt(c, 'Ice cold. Every junction.', 108, 88, `600 13px ${SIGN}`, '#e6f6ff');
}

/** Chuks Phones: repairs and accessories */
function paintPhones(c, w, h) {
  c.fillStyle = linearGrad(c, 0, 0, w, h, [[0, '#ff9a1a'], [1, '#e8452c']]); c.fillRect(0, 0, w, h);
  // phone
  roundRect(c, 34, 22, 56, 96, 10); c.fillStyle = '#1e1e24'; c.fill();
  roundRect(c, 40, 32, 44, 72, 4); c.fillStyle = '#5ec8f2'; c.fill();
  c.beginPath(); c.arc(62, 111, 3, 0, Math.PI * 2); c.fillStyle = '#5a5a66'; c.fill();
  txt(c, 'Chuks Phones', 108, 56, `700 26px ${SIGN}`, '#ffffff');
  txt(c, 'Repairs · Chargers · Cases', 108, 86, `600 13px ${SIGN}`, '#fff6e0');
}

// ---------------------------------------------------------------------------
// Counting views and taps

const STATS_KEY = 'abachop.ads';
let queue = [];
let stats = null;
function loadStats() {
  if (stats) return stats;
  try { stats = JSON.parse(localStorage.getItem(STATS_KEY)) || null; } catch (e) { stats = null; }
  if (!stats || typeof stats !== 'object') stats = { views: {}, taps: {} };
  return stats;
}
function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* private mode */ } }

export function trackAd(type, adId, slotId) {
  if (ON_PORTAL) return; // made-up shops: nothing to count
  const s = loadStats();
  const bucket = type === 'tap' ? s.taps : s.views;
  bucket[adId] = (bucket[adId] || 0) + 1;
  saveStats();
  if (TRACK_URL) { queue.push({ type, ad: adId, slot: slotId, t: Date.now() }); if (queue.length >= 20 || type === 'tap') flushAds(); }
}
/** Any other game event worth counting (install funnel etc.). Sent with the ad events when TRACK_URL is set. */
export function trackEvent(type, data = {}) {
  if (TRACK_URL) { queue.push({ type, ...data, t: Date.now() }); if (queue.length >= 20) flushAds(); }
}
export function flushAds() {
  if (!TRACK_URL || !queue.length) return;
  const body = JSON.stringify(queue); queue = [];
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'application/json' }));
    else fetch(TRACK_URL, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
  } catch (e) { /* offline: fine */ }
}
/** { views: {vezio: 120}, taps: {vezio: 4} } on this device */
export function adStats() { return JSON.parse(JSON.stringify(loadStats())); }
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAds);
  setInterval(flushAds, 30000);
  window.abaAds = { stats: adStats }; // handy in the browser console
}

// ---------------------------------------------------------------------------
// A billboard in the world

export class Billboard {
  constructor(scene, slot) {
    this.scene = scene; this.slot = slot;
    this.ads = slot.ads.filter((id) => CREATIVES[id]);
    this.idx = 0; this.t = 0; this.checkT = 0; this.inView = false; this.down = null;
    const top = slot.y - FRAME_H * ANCHOR_Y;
    this.frame = scene.add.image(slot.x, slot.y, 'd_billboard').setOrigin(0.5, ANCHOR_Y).setScale(1 / R).setDepth(slot.y);
    this.faceX = slot.x - FRAME_W / 2 + FACE_X; this.faceY = top + FACE_Y;
    this.face = scene.add.image(this.faceX + FACE_W / 2, this.faceY + FACE_H / 2, '__WHITE').setDepth(slot.y + 0.1);
    this.face.setInteractive({ useHandCursor: true });
    this.face.on('pointerdown', (p) => { this.down = { id: p.id, t: scene.time.now, x: p.x, y: p.y }; });
    this.onUp = (p) => {
      const d = this.down; this.down = null;
      if (!d || p.id !== d.id) return;
      const moved = Math.hypot(p.x - d.x, p.y - d.y);
      if (moved < 18 * (window.devicePixelRatio || 1) && scene.time.now - d.t < 450) this.tap();
    };
    scene.input.on('pointerup', this.onUp);
    this.show(this.ads[0]);
  }

  get adId() { return this.ads[this.idx]; }

  show(id) {
    const ad = CREATIVES[id];
    if (!ad) return;
    const key = `ad_${id}`;
    const apply = () => {
      if (!this.face.active) return;
      this.face.setTexture(key);
      if (ad.image) this.face.setDisplaySize(FACE_W, FACE_H); else this.face.setScale(1 / R);
    };
    if (this.scene.textures.exists(key)) return apply();
    if (ad.image) {
      this.scene.load.image(key, ad.image);
      this.scene.load.once(`filecomplete-image-${key}`, apply);
      this.scene.load.start();
    }
  }

  flip() {
    const next = (this.idx + 1) % this.ads.length;
    const sy = this.face.scaleY;
    this.scene.tweens.add({
      targets: this.face, scaleY: 0, duration: 160, ease: 'Sine.easeIn',
      onComplete: () => {
        this.idx = next; this.show(this.adId);
        const target = this.face.scaleY || sy;
        this.face.scaleY = 0;
        this.scene.tweens.add({ targets: this.face, scaleY: target, duration: 200, ease: 'Back.easeOut' });
        if (this.inView) trackAd('view', this.adId, this.slot.id);
      },
    });
  }

  tap() {
    const ui = this.scene.scene.get('UI');
    if (ui && (ui.modal || ui.titleOpen)) return;
    if (ON_PORTAL) { this.scene.tweens.add({ targets: [this.face], alpha: 0.75, duration: 80, yoyo: true }); return; }
    const id = this.adId; const ad = CREATIVES[id];
    trackAd('tap', id, this.slot.id);
    this.scene.tweens.add({ targets: [this.face], alpha: 0.6, duration: 80, yoyo: true });
    const url = ad.url || BOOKING_URL;
    if (url) {
      this.scene.game.events.emit('toast', `Opening ${ad.url ? ad.label : 'billboard booking'}…`);
      window.open(url, '_blank', 'noopener');
    } else {
      this.scene.game.events.emit('toast', 'Want your brand on this billboard? Booking opens soon!');
    }
  }

  update(dt) {
    const p = this.scene.player;
    if (p) {
      const top = this.slot.y - FRAME_H * ANCHOR_Y;
      const behind = Math.abs(p.x - this.slot.x) < FRAME_W / 2 + 10 && p.y < this.slot.y && p.y > top - 40;
      const a = behind ? 0.3 : 1;
      if (Math.abs(this.frame.alpha - a) > 0.01) { const k = Math.min(1, dt * 8); const v = this.frame.alpha + (a - this.frame.alpha) * k; this.frame.setAlpha(v); this.face.setAlpha(v); }
    }
    if (this.ads.length > 1) {
      this.t += dt;
      if (this.t >= ROTATE_EVERY) { this.t = 0; this.flip(); }
    }
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 0.5;
    // counts as a view when most of the face is on screen
    const v = this.scene.cameras.main.worldView;
    const ix = Math.max(0, Math.min(v.right, this.faceX + FACE_W) - Math.max(v.x, this.faceX));
    const iy = Math.max(0, Math.min(v.bottom, this.faceY + FACE_H) - Math.max(v.y, this.faceY));
    const seen = (ix * iy) / (FACE_W * FACE_H) >= 0.6;
    if (seen && !this.inView) trackAd('view', this.adId, this.slot.id);
    this.inView = seen;
  }
}

export function buildBillboards(scene, branchKey) {
  return (SLOTS[branchKey] || []).map((slot) => new Billboard(scene, slot));
}
