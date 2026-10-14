// Roadside billboards: real ad space inside the game.
// - Add or change an advertiser in CREATIVES, then point a board at it in SLOTS.
// - A creative is either painted in code (`paint`) or an image you drop into public/ads/ (`image`, 1200x560 px).
// - Tapping a board opens the advertiser's link. Views and taps are counted per ad (see `adStats()`), and are
//   also posted to TRACK_URL if you set one, so you can show advertisers real numbers.
import { paintTexture, roundRect, linearGrad, radialGrad, groundShadow, R } from './art.js';

export const TRACK_URL = '';      // e.g. 'https://api.yoursite.ng/ad-events' (POST, JSON array). Empty = keep counts on the device only.
export const BOOKING_URL = '';    // where "Your brand here" boards send people, e.g. 'https://wa.me/234XXXXXXXXXX?text=Billboard%20in%20Aba%20Chop%20Spot'
export const ROTATE_EVERY = 16;   // seconds a board shows one ad before flipping to the next (only when it has several)

const UTM = 'utm_source=abachopspot&utm_medium=billboard&utm_campaign=launch';

export const CREATIVES = {
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
  // Example of an image creative (put the file in public/ads/):
  // shoprite: { label: 'Brand name', url: 'https://brand.ng', image: 'ads/brand.png' },
};

/** Boards per branch. x/y is where the legs stand. The main board sits on the street edge of the lot; the others are across the street. */
/** screens inside the 3D GRA Lounge (facade screen faces the street, bar screen faces the dining room) */
export const SCREENS = {
  'gra-facade': ['vezio', 'house'],
  'gra-bar': ['vezio'],
};

export const SLOTS = {
  stand: [
    { id: 'faulks-main', x: 270, y: 1450, ads: ['vezio'] },          // in view whenever you're at the counter
    { id: 'faulks-left', x: 230, y: 1720, ads: ['house', 'vezio'] },  // across the street
    { id: 'faulks-right', x: 770, y: 1720, ads: ['vezio', 'house'] },
  ],
  buka: [
    { id: 'ariaria-main', x: 325, y: 1450, ads: ['vezio'] },
    { id: 'ariaria-left', x: 230, y: 1720, ads: ['vezio', 'house'] },
    { id: 'ariaria-right', x: 770, y: 1720, ads: ['house', 'vezio'] },
  ],
};

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
