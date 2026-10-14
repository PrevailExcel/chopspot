// Gameplay objects for the 3D branch. They keep the same small interfaces the 2D game uses
// (zones you stand in, pads you pay into, piles you pick from, cash you sweep up), so the shared
// branch engine drives them unchanged. Positions are game units (100 per metre); heights `z` are cm.
import * as THREE from 'three';
import { Kit, mats, textCanvas, canvasToTexture } from './kit.js';
import { money } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { Haptic } from '../platform.js';

const U = 0.01;
export const toV = (x, y, z = 0) => new THREE.Vector3(x * U, z * U, y * U);

// ---------------------------------------------------------------------------
// dishes & cash, instanced: every visible plate of one kind is a single draw call

function dishGeometry(type) {
  const k = new Kit();
  const plate = (r = 0.12) => { k.cyl(r, 0.012, [0, 0.006, 0], '#ffffff', 'satin', 20); k.cyl(r * 0.72, 0.004, [0, 0.014, 0], '#f2eee6', 'satin', 18); };
  switch (type) {
    case 'steak':
      plate();
      k.rbox(0.13, 0.035, 0.09, [-0.01, 0.032, 0], '#6b2e14', 'satin', [0, 0.3, 0], 0.015);
      for (let i = 0; i < 3; i++) k.box(0.1, 0.004, 0.008, [-0.01, 0.051, -0.025 + i * 0.025], '#2a1206', 'satin', [0, 0.9, 0]);
      for (let i = 0; i < 6; i++) k.box(0.012, 0.012, 0.07, [0.055 + (i % 3) * 0.014, 0.025 + Math.floor(i / 3) * 0.012, 0.02], '#f2c14e', 'satin', [0, 0.3 * i, 0]);
      k.sphere(0.018, 0.012, 0.018, [-0.05, 0.026, 0.055], '#3f9b4a', 'satin', 8);
      break;
    case 'pasta':
      plate();
      k.sphere(0.075, 0.035, 0.075, [0, 0.03, 0], '#f0d07a', 'satin', 12);
      for (let i = 0; i < 3; i++) k.sphere(0.018, 0.012, 0.012, [Math.cos(i * 2) * 0.04, 0.058, Math.sin(i * 2) * 0.04], '#ff7a5c', 'satin', 8);
      k.sphere(0.01, 0.008, 0.01, [0.01, 0.068, -0.01], '#3f9b4a', 'satin', 6);
      break;
    case 'salad':
      k.lathe([[0, 0], [0.06, 0], [0.11, 0.05], [0.115, 0.055]], [0, 0, 0], '#ffffff', 'satin', 18);
      for (let i = 0; i < 7; i++) k.sphere(0.035, 0.018, 0.028, [Math.cos(i) * 0.05, 0.05 + (i % 2) * 0.008, Math.sin(i) * 0.05], i % 3 ? '#5cb85c' : '#8fe07a', 'satin', 8, [0, i, 0.3]);
      k.sphere(0.012, 0.012, 0.012, [0.02, 0.068, 0.01], '#ff4f4f', 'satin', 6);
      k.box(0.018, 0.012, 0.018, [-0.02, 0.066, -0.015], '#f7e2a0', 'satin');
      break;
    case 'pizza':
      k.cyl(0.15, 0.015, [0, 0.008, 0], '#8a5a32', 'satin', 20);
      k.cyl(0.13, 0.014, [0, 0.022, 0], '#d99a4e', 'satin', 20);
      k.cyl(0.115, 0.004, [0, 0.03, 0], '#e8522f', 'satin', 20);
      for (let i = 0; i < 6; i++) k.cyl(0.018, 0.005, [Math.cos(i) * 0.06, 0.034, Math.sin(i) * 0.06], '#ffe9a8', 'satin', 8);
      break;
    case 'dessert':
      plate(0.1);
      k.add(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 3, 1), { pos: [0, 0.045, 0], rot: [0, 0.3, 0], color: '#5a2e1a', mat: 'satin' });
      k.add(new THREE.CylinderGeometry(0.061, 0.061, 0.008, 3, 1), { pos: [0, 0.07, 0], rot: [0, 0.3, 0], color: '#f5e6d0', mat: 'satin' });
      k.sphere(0.012, 0.012, 0.012, [0.005, 0.085, 0], '#e8263c', 'satin', 8);
      break;
    case 'drink':
      k.lathe([[0, 0], [0.035, 0], [0.006, 0.01], [0.006, 0.07], [0.05, 0.1], [0.05, 0.12]], [0, 0, 0], '#e9f2f6', 'satin', 12);
      k.lathe([[0, 0.075], [0.043, 0.098], [0.046, 0.112], [0, 0.112]], [0, 0, 0], '#ff7a6a', 'satin', 12);
      k.cyl(0.02, 0.006, [0.04, 0.12, 0], '#ffd23f', 'satin', 10, [0, 0, 1.3]);
      break;
    case 'dirty':
      plate();
      k.sphere(0.04, 0.006, 0.03, [0.02, 0.018, 0.01], '#a0703a', 'satin', 8);
      k.box(0.012, 0.004, 0.13, [0.03, 0.02, -0.01], '#b9c0c6', 'satin', [0, 0.5, 0]);
      break;
    case 'cash':
      k.box(0.16, 0.03, 0.08, [0, 0.015, 0], '#4f9a5a', 'satin');
      k.box(0.03, 0.032, 0.082, [0, 0.016, 0], '#f2efe6', 'satin');
      break;
    default: plate();
  }
  // every part uses the satin material, so the kit merges it into a single geometry
  const meshes = k.build(new THREE.Group(), { shadows: false });
  const g = meshes[0].geometry; g.userData.shared = true;
  return g;
}

class Item {
  constructor(batch, idx) { this.batch = batch; this.idx = idx; this.pos = new THREE.Vector3(); this.rot = Math.random() * 6; this.visible = true; this.active = true; this.s = 1; this.type = batch.type; }
  get scaleOut() { return this.s * (this.big || 1.2); }
  setVisible(v) { this.visible = v; return this; }
  setScale() { return this; }
  place(v) { this.pos.copy(v); return this; }
  destroy() { if (!this.active) return; this.active = false; this.batch.free(this); }
  get x() { return this.pos.x / U; }
  get y() { return this.pos.z / U; }
}

export class Batches {
  constructor(parent) {
    this.parent = parent;
    this.map = {};
  }
  get(type) {
    if (this.map[type]) return this.map[type];
    const b = new Batch(type, this.parent); this.map[type] = b; return b;
  }
  alloc(type) { return this.get(type).alloc(); }
  update() { for (const b of Object.values(this.map)) b.update(); }
}

class Batch {
  constructor(type, parent, cap = 140) {
    this.type = type;
    const g = dishGeometry(type);
    this.mesh = new THREE.InstancedMesh(g, mats().satin, cap);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    parent.add(this.mesh);
    this.items = []; this.cap = cap;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  alloc() {
    if (this.items.length >= this.cap) return new Item(this, -1);
    const it = new Item(this, this.items.length); this.items.push(it); return it;
  }
  free(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); }
  update() {
    let n = 0;
    for (const it of this.items) {
      if (!it.visible) continue;
      this._q.setFromEuler(this._e.set(0, it.rot, it.tilt || 0));
      this._m.compose(it.pos, this._q, this._s.setScalar(it.scaleOut));
      this.mesh.setMatrixAt(n++, this._m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// sprites (icons, text, bubbles) always face the camera

const iconCache = new Map();
export function iconTexture(phaserTextures, key) {
  if (iconCache.has(key)) return iconCache.get(key);
  let t = null;
  try {
    const src = phaserTextures.get(key).getSourceImage();
    t = new THREE.CanvasTexture(src); t.colorSpace = THREE.SRGBColorSpace; t.userData.shared = true;
  } catch (e) { t = null; }
  iconCache.set(key, t);
  return t;
}

// Sprites marked "screen" keep the same size on screen at any zoom, like HUD text.
const SCREEN = new Set();
export function screenSprite(sprite, px, aspect = 1) {
  sprite.material.sizeAttenuation = false;
  sprite.userData.px = px; sprite.userData.aspect = aspect; sprite.userData.mul = sprite.userData.mul || 1;
  SCREEN.add(sprite);
  return sprite;
}
export function updateScreenSprites(camera) {
  const k = 2 / (window.innerHeight * camera.projectionMatrix.elements[5]);
  for (const s of SCREEN) {
    if (!s.parent) { SCREEN.delete(s); continue; }
    const h = s.userData.px * k * s.userData.mul;
    s.scale.set(h * s.userData.aspect, h, 1);
  }
}

export function textSprite(text, { size = 0.32, px = null, color = '#ffffff', stroke = '#1d1d1d', bg = null, font = '700 64px Fredoka', w = 512, h = 128, depthTest = false } = {}) {
  const c = textCanvas([{ text }], { w, h, bg, font, color, stroke, sw: 10, radius: 40 });
  const mat = new THREE.SpriteMaterial({ map: canvasToTexture(c), transparent: true, depthTest, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(size * (w / h), size, 1);
  s.renderOrder = 20;
  s.userData.canvas = c;
  if (px) screenSprite(s, px, w / h);
  return s;
}
export function setSpriteText(s, text, opts = {}) {
  const { w = 512, h = 128, font = '700 64px Fredoka', color = '#ffffff', stroke = '#1d1d1d', bg = null } = opts;
  const c = textCanvas([{ text }], { w, h, bg, font, color, stroke, sw: 10, radius: 40 });
  s.material.map.dispose(); s.material.map = canvasToTexture(c); s.material.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// floor zone

function zoneCanvas(color, active, dash) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const col = '#' + new THREE.Color(color).getHexString();
  const gr = g.createRadialGradient(128, 128, 60, 128, 128, 126);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, active ? col + 'aa' : col + '44');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = active ? '#ffffff' : col; g.lineWidth = 9; g.setLineDash([26, 18]); g.lineDashOffset = dash;
  g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke();
  return c;
}

export class Zone3D {
  constructor(ctx, shape, { color = 0xffffff, visible = true } = {}) {
    this.ctx = ctx; this.shape = shape;
    this.active = false; this.glow = 0;
    const r = (shape.r || 50) * U;
    this.tex = [canvasToTexture(zoneCanvas(color, false, 0)), canvasToTexture(zoneCanvas(color, true, 0))];
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex[0], transparent: true, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), this.mat);
    this.mesh.position.set(shape.x * U, 0.035, shape.y * U); this.mesh.renderOrder = 5;
    ctx.root.add(this.mesh);
    this.mesh.visible = visible; this.visible = visible;
  }
  get cx() { return this.shape.x; }
  get cy() { return this.shape.y; }
  contains(x, y, pad = 0) { return Math.hypot(x - this.shape.x, y - this.shape.y) <= (this.shape.r || 50) + pad; }
  setActive(a) { if (a !== this.active) { this.active = a; this.mat.map = this.tex[a ? 1 : 0]; } }
  update(dt) {
    this.glow += ((this.active ? 1 : 0) - this.glow) * Math.min(1, dt * 10);
    this.mesh.rotation.y += dt * (this.active ? 1.4 : 0.35);
    const s = 1 + this.glow * 0.08 + Math.sin(performance.now() / 300) * 0.015 * this.glow;
    this.mesh.scale.set(s, 1, s);
  }
  setVisible(v) { this.visible = v; this.mesh.visible = v; }
  destroy() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.tex.forEach((t) => t.dispose()); this.mat.dispose(); }
}

// ---------------------------------------------------------------------------
// unlock pad: stand on it to pay; a hologram shows what you'll get

const PW = 124, PH = 92;
function padCanvas(c, paid, cost, active, t) {
  const g = c.getContext('2d'); const w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(12,24,20,0.55)'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 34); g.fill();
  const p = Math.min(1, paid / cost);
  if (p > 0) { g.save(); g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 34); g.clip(); g.fillStyle = 'rgba(63,211,107,0.8)'; const ph = (h - 16) * p; g.fillRect(8, h - 8 - ph, w - 16, ph); g.restore(); }
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 10; g.setLineDash([30, 20]); g.lineDashOffset = -t * (active ? 140 : 40);
  g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, 32); g.stroke();
}

export class Pad3D {
  constructor(ctx, def, paid = 0) {
    this.ctx = ctx; this.def = def; this.paid = paid;
    this.x = def.x; this.y = def.y; this.active = false; this.t = Math.random() * 5; this.shown = 0;
    this.canvas = document.createElement('canvas'); this.canvas.width = 372; this.canvas.height = 276;
    padCanvas(this.canvas, paid, def.cost, false, 0);
    this.tex = canvasToTexture(this.canvas);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(PW * U, PH * U).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, toneMapped: false }));
    this.floor.position.set(def.x * U, 0.04, def.y * U); this.floor.renderOrder = 6;
    this.group = new THREE.Group(); this.group.position.copy(this.floor.position);
    const iconT = iconTexture(ctx.phaserTextures, def.icon);
    this.icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconT, transparent: true, depthTest: false }));
    screenSprite(this.icon, 46); this.icon.position.y = 0.72; this.icon.renderOrder = 21;
    this.price = textSprite(money(def.cost - paid), { px: 26, stroke: '#14211b' });
    this.price.position.y = 0.3;
    this.title = textSprite(def.name, { px: 24, stroke: '#14211b', w: 768 });
    this.title.position.y = 1.32;
    this.group.add(this.icon, this.price, this.title);
    if (def.sub) { this.sub = textSprite(def.sub, { px: 18, color: '#ffe9a8', stroke: '#14211b', w: 900 }); this.sub.position.y = 1.1; this.group.add(this.sub); }
    ctx.root.add(this.floor, this.group);
    this.ghost = ctx.ghostFor ? ctx.ghostFor(def.id) : null;
    this.lastPaid = -1; this.redrawT = 0;
    this.group.scale.setScalar(0.001);
  }
  get remaining() { return Math.max(0, this.def.cost - this.paid); }
  contains(px, py) { return Math.abs(px - this.x) < PW / 2 && Math.abs(py - this.y) < PH / 2; }
  update(dt) {
    this.t += dt;
    this.shown += (1 - this.shown) * Math.min(1, dt * 8);
    this.group.scale.setScalar(this.shown);
    this.icon.position.y = 0.72 + Math.abs(Math.sin(this.t * 3)) * (this.active ? 0.08 : 0.04);
    this.redrawT -= dt;
    if (this.paid !== this.lastPaid || (this.redrawT <= 0)) {
      this.redrawT = this.active ? 0.06 : 0.12;
      if (this.paid !== this.lastPaid) { setSpriteText(this.price, money(this.remaining), { stroke: '#14211b' }); this.lastPaid = this.paid; }
      padCanvas(this.canvas, this.paid, this.def.cost, this.active, this.t);
      this.tex.needsUpdate = true;
    }
    if (this.ghost) {
      const o = 0.16 + 0.1 * Math.sin(this.t * 3) + (this.active ? 0.12 : 0);
      this.ghost.traverse((m) => { if (m.material && m.material.opacity !== undefined && m.isMesh) m.material.opacity = o; });
    }
  }
  destroy() {
    this.floor.removeFromParent(); this.group.removeFromParent();
    if (this.ghost) this.ghost.removeFromParent();
    this.tex.dispose();
  }
}

// ---------------------------------------------------------------------------
// piles of items (on the pass, on the bar, on tables)

export class Pile3D {
  constructor(ctx, type, layout, { maxVisual = 99 } = {}) {
    this.ctx = ctx; this.type = type; this.layout = layout; this.maxVisual = maxVisual;
    this.items = []; this.count = 0;
  }
  posOf(i) { return this.layout(i); }
  add(n = 1, pop = true) {
    const made = [];
    for (let k = 0; k < n; k++) {
      this.count++;
      if (this.items.length >= this.maxVisual) continue;
      const it = this.ctx.batches.alloc(this.type);
      it.place(this.posOf(this.items.length));
      if (pop) { it.s = 0.01; this.ctx.tween(it, 's', 1, 0.28); }
      this.items.push(it); made.push(it);
    }
    return made;
  }
  /** remove the top item; returns where it was (game units, z in cm) */
  take() {
    if (this.count <= 0) return null;
    this.count--;
    if (this.items.length > this.count) {
      const it = this.items.pop();
      const p = { x: it.pos.x / U, y: it.pos.z / U, z: it.pos.y / U };
      it.destroy();
      return p;
    }
    const v = this.posOf(Math.max(0, this.items.length - 1));
    return { x: v.x / U, y: v.z / U, z: v.y / U };
  }
  clear() { this.items.forEach((i) => i.destroy()); this.items = []; this.count = 0; }
}

export class CashPile3D {
  constructor(ctx, x, y, { maxVisual = 16, zoneR = 55, unit = 40, h = 0, cols = 3 } = {}) {
    this.ctx = ctx; this.x = x; this.y = y; this.unit = unit; this.maxVisual = maxVisual;
    const base = toV(x, y, h);
    this.pile = new Pile3D(ctx, 'cash', (i) => {
      const layer = Math.floor(i / (cols * 2)); const j = i % (cols * 2);
      return base.clone().add(new THREE.Vector3((j % cols - (cols - 1) / 2) * 0.17, layer * 0.032 + 0.005, (Math.floor(j / cols) - 0.5) * 0.09));
    }, { maxVisual });
    this.value = 0;
    this.zone = new Zone3D(ctx, { x, y, r: zoneR }, { visible: false });
    this.cool = 0;
  }
  deposit(amount, from = null, delay = 0) {
    if (amount <= 0) return;
    this.value += amount;
    const want = Math.min(this.maxVisual, Math.max(1, Math.ceil(this.value / this.unit)));
    const add = want - this.pile.count;
    if (add <= 0) return;
    const made = this.pile.add(add, !from);
    if (from) made.forEach((it, k) => {
      it.setVisible(false);
      this.ctx.after(delay / 1000 + k * 0.045, () => this.ctx.fly('cash', from, { x: it.x, y: it.y, z: it.pos.y / U }, { duration: 300, arc: 50, onDone: () => { if (it.active) { it.setVisible(true); it.s = 1.25; this.ctx.tween(it, 's', 1, 0.14); } } }));
    });
  }
  restore(value) {
    if (value <= 0) return;
    this.value = value;
    this.pile.add(Math.min(this.maxVisual, Math.max(1, Math.ceil(value / this.unit))), false);
  }
  takeAll() {
    const v = this.value; this.value = 0;
    const out = [];
    while (this.pile.count) out.push(this.pile.take());
    return { value: v, from: out };
  }
  update(dt, player, onGain) {
    this.cool -= dt;
    const inside = this.value > 0 && this.zone.contains(player.x, player.y, 18);
    if (!inside || this.cool > 0) return inside;
    this.cool = 0.035;
    const n = this.pile.count;
    const amount = n <= 1 ? this.value : Math.floor(this.value / n);
    this.value -= amount;
    const pos = this.pile.take() || { x: this.x, y: this.y, z: 80 };
    if (this.value <= 0) while (this.pile.count) this.pile.take();
    Sound.play('coin'); Haptic.tap('light');
    this.ctx.fly('cash', pos, () => ({ x: player.x, y: player.y, z: 110 }), { duration: 220, arc: 40, onDone: () => onGain(amount) });
    return true;
  }
}

// ---------------------------------------------------------------------------
// order bubble over a party

export class Bubble3D {
  constructor(ctx) {
    this.ctx = ctx;
    this.canvas = document.createElement('canvas'); this.canvas.width = 512; this.canvas.height = 200;
    this.tex = canvasToTexture(this.canvas);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false }));
    this.sprite.renderOrder = 30; this.sprite.visible = false;
    screenSprite(this.sprite, 62, 512 / 200);
    ctx.root.add(this.sprite);
    this.items = []; this.bar = null; this.vip = false; this.base = 1; this.pulseT = 0;
  }
  set(items, { vip = false } = {}) { this.items = items; this.vip = vip; this.draw(); }
  setBar(f) { const v = f == null ? null : Math.round(f * 40) / 40; if (v !== this.bar) { this.bar = v; this.draw(); } }
  draw() {
    const c = this.canvas; const g = c.getContext('2d');
    const n = Math.max(1, this.items.length);
    const cellW = 118; const w = Math.min(512, 30 + n * cellW); const h = this.bar != null ? 168 : 144;
    g.clearRect(0, 0, c.width, c.height);
    const x0 = (512 - w) / 2;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.roundRect(x0 + 4, 10, w - 8, h - 14, 34); g.fill();
    g.fillStyle = this.vip ? '#fff6dc' : '#ffffff'; g.beginPath(); g.roundRect(x0, 4, w - 8, h - 14, 34); g.fill();
    if (this.vip) { g.strokeStyle = '#d9a21a'; g.lineWidth = 7; g.stroke(); }
    g.beginPath(); g.moveTo(256 - 18, h - 12); g.lineTo(256, h + 14); g.lineTo(256 + 18, h - 12); g.closePath(); g.fillStyle = this.vip ? '#fff6dc' : '#ffffff'; g.fill();
    this.items.forEach((it, i) => {
      const cx = x0 + 15 + i * cellW + cellW / 2 - 4;
      const img = it.icon ? this.ctx.phaserTextures.get(it.icon).getSourceImage() : null;
      if (img) { g.globalAlpha = it.done ? 0.35 : 1; g.drawImage(img, cx - 46, 14, 92, 92); g.globalAlpha = 1; }
      if (it.done) { g.fillStyle = '#2bb34a'; g.beginPath(); g.arc(cx + 30, 30, 18, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 21, 30); g.lineTo(cx + 28, 37); g.lineTo(cx + 40, 23); g.stroke(); }
      else if (it.n != null) { g.font = '700 46px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 9; g.strokeStyle = '#ffffff'; g.strokeText(String(it.n), cx + 36, 92); g.fillStyle = '#3a2a1a'; g.fillText(String(it.n), cx + 36, 92); }
    });
    if (this.bar != null) {
      const bw = w - 60; const bx = x0 + 26;
      g.fillStyle = '#eadfc8'; g.beginPath(); g.roundRect(bx, 122, bw, 16, 8); g.fill();
      g.fillStyle = this.bar > 0.5 ? '#2bb34a' : this.bar > 0.25 ? '#ff9a1a' : '#e33d3d';
      g.beginPath(); g.roundRect(bx, 122, Math.max(16, bw * this.bar), 16, 8); g.fill();
    }
    this.tex.needsUpdate = true;
    this.aspect = 512 / 200;
  }
  show(v) { this.sprite.visible = v; }
  at(x, y, z) { this.sprite.position.set(x * U, z * U, y * U); }
  pulse() { this.pulseT = 0.3; }
  update(dt) {
    this.pulseT = Math.max(0, this.pulseT - dt);
    this.sprite.userData.mul = 1 + this.pulseT * 0.6;
  }
  destroy() { this.sprite.removeFromParent(); this.tex.dispose(); this.sprite.material.dispose(); }
}

// ---------------------------------------------------------------------------
// guidance: a bouncing arrow over the target and a ring arrow around the player

export class Guide3D {
  constructor(ctx) {
    const k = new Kit();
    k.cone(0.16, 0.3, [0, 0.15, 0], '#ffb21a', 'glow', 16, [Math.PI, 0, 0]);
    k.cyl(0.07, 0.26, [0, 0.43, 0], '#ffb21a', 'glow', 12);
    this.arrow = new THREE.Group(); k.build(this.arrow, { shadows: false });
    this.arrow.traverse((m) => { if (m.material) { m.material = m.material.clone(); m.material.depthTest = false; m.renderOrder = 40; } });
    ctx.root.add(this.arrow); this.arrow.visible = false;
    const k2 = new Kit();
    k2.add(new THREE.ConeGeometry(0.14, 0.3, 3), { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: '#ffb21a', mat: 'glow' });
    this.pointer = new THREE.Group(); k2.build(this.pointer, { shadows: false });
    this.pointer.children.forEach((m) => { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.9; m.material.depthTest = false; m.renderOrder = 40; m.scale.y = 0.35; });
    ctx.root.add(this.pointer); this.pointer.visible = false;
  }
  update(target, player, t) {
    if (!target) { this.arrow.visible = false; this.pointer.visible = false; return; }
    const d = Math.hypot(target.x - player.x, target.y - player.y);
    const near = d < (target.r || 55);
    this.arrow.visible = !near;
    this.arrow.position.set(target.x * U, (target.lift || 1.5) + Math.abs(Math.sin(t * 4.5)) * 0.25, target.y * U);
    this.arrow.rotation.y = t * 2;
    this.pointer.visible = d > 260;
    if (this.pointer.visible) {
      const a = Math.atan2(target.y - player.y, target.x - player.x);
      const r = 0.75 + Math.sin(t * 6) * 0.05;
      this.pointer.position.set(player.x * U + Math.cos(a) * r, 0.12, player.y * U + Math.sin(a) * r);
      this.pointer.rotation.y = -a + Math.PI / 2;
    }
  }
}

// ---------------------------------------------------------------------------
// confetti burst

export class Confetti3D {
  constructor(ctx) {
    this.ctx = ctx;
    const g = new THREE.PlaneGeometry(0.06, 0.035);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 240);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 35;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3);
    ctx.root.add(this.mesh);
    this.parts = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(1, 1, 1); this._c = new THREE.Color();
    this.cols = [0xff7a1a, 0xffd23f, 0x0f8b8d, 0xe33d5c, 0x7b2d8b, 0x2bb34a, 0xffffff];
  }
  burst(x, y, z = 120, n = 60) {
    for (let i = 0; i < n && this.parts.length < 240; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2.5;
      this.parts.push({ p: toV(x, y, z), v: new THREE.Vector3(Math.cos(a) * s * 0.6, 3 + Math.random() * 3, Math.sin(a) * s * 0.6), r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: Math.random() * 12 - 6, life: 1.4 + Math.random() * 0.4, c: this.cols[i % this.cols.length] });
    }
  }
  update(dt) {
    let n = 0;
    for (const p of this.parts) {
      p.life -= dt;
      p.v.y -= 9 * dt; p.v.multiplyScalar(1 - dt * 1.6);
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.02) { p.p.y = 0.02; p.v.set(0, 0, 0); }
      p.r.x += p.w * dt; p.r.y += p.w * 0.7 * dt;
      this._q.setFromEuler(this._e.set(p.r.x, p.r.y, p.r.z));
      this._m.compose(p.p, this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      this.mesh.setColorAt(n, this._c.set(p.c));
      n++;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
