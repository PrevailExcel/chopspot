// Shared 3D context for one visit to the GRA Lounge: renderer, world, batches and small animation helpers.
import * as THREE from 'three';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/600.css';
import { getView } from './view.js';
import { World } from './world.js';
import { Kit, textures, mats } from './kit.js';
import { Batches, textSprite, Confetti3D, Guide3D, toV, updateScreenSprites } from './objects3d.js';
import { NavGrid } from './nav.js';
import { ITEMS } from '../config.js';

const U = 0.01;
const ease = { out: (t) => 1 - Math.pow(1 - t, 3), back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) };

/** turn a texture key from the 2D game into a dish type */
function typeFromTex(tex) {
  if (tex === 'item_cash') return 'cash';
  if (tex === 'item_dirty' || tex === 'icon_dirty') return 'dirty';
  for (const [k, v] of Object.entries(ITEMS)) if (v.tex === tex || v.icon === tex) return k;
  return 'dirty';
}

/** soft round shadows under everyone who moves (one draw call) */
class Blobs {
  constructor(parent, cap = 96) {
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: textures.softShadow(), transparent: true, depthWrite: false, color: 0x000000, opacity: 0.6 }), cap);
    this.mesh.count = cap; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    this.free = Array.from({ length: cap }, (_, i) => cap - 1 - i);
    this._m = new THREE.Matrix4();
    for (let i = 0; i < cap; i++) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); }
    parent.add(this.mesh);
  }
  add() { return this.free.length ? this.free.pop() : -1; }
  set(i, x, z, r) { if (i < 0) return; this._m.makeScale(r * 2, 1, r * 2).setPosition(x, 0.03, z); this.mesh.setMatrixAt(i, this._m); this.mesh.instanceMatrix.needsUpdate = true; }
  remove(i) { if (i < 0) return; this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); this.mesh.instanceMatrix.needsUpdate = true; this.free.push(i); }
}

export async function fontsReady() {
  try { await Promise.race([Promise.all([document.fonts.load('700 64px "Playfair Display"'), document.fonts.load('600 44px "Playfair Display"')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fallback font */ }
}

export function createContext(scene) {
  const view = getView();
  view.newScene();
  const world = new World(view, { ownerTitle: () => scene.ownerTitle() });
  const root = world.root;
  const ctx = {
    scene, view, world, root,
    phaserTextures: scene.textures,
    batches: new Batches(root),
    blobs: new Blobs(root),
    nav: new NavGrid(),
    tweens: [], timers: [], floats: [], flights: [],
    time: 0,
  };
  ctx.confettiFx = new Confetti3D(ctx);
  ctx.guide = new Guide3D(ctx);

  ctx.tween = (obj, key, to, dur, fn = ease.out, onDone = null) => { ctx.tweens.push({ obj, key, from: obj[key], to, t: 0, dur, fn, onDone }); };
  ctx.after = (sec, fn) => { ctx.timers.push({ t: sec, fn }); };

  /** an item flying from A to B. Points are game units with optional height z (cm) */
  ctx.fly = (tex, from, to, { duration = 220, arc = 40, onDone = null } = {}) => {
    const type = typeFromTex(tex);
    const it = ctx.batches.alloc(type);
    const a = toV(from.x, from.y, from.z ?? 100);
    it.place(a);
    ctx.flights.push({ it, a, to, t: 0, dur: duration / 1000, arc: Math.min(0.9, arc * 0.012), onDone });
  };

  ctx.float = (x, y, z, str, color = '#ffffff', size = 24) => {
    const s = textSprite(str, { px: 30 * (size / 24), color, stroke: '#14211b', w: 640 });
    s.position.copy(toV(x, y, z));
    root.add(s);
    ctx.floats.push({ s, t: 0, y0: s.position.y });
  };
  ctx.confetti = (x, y, z = 120) => ctx.confettiFx.burst(x, y, z);

  ctx.makeTray = () => {
    const k = new Kit();
    k.cyl(0.19, 0.012, [0, 0.0, 0], '#cfd5da', 'metal', 22);
    k.torus(0.19, 0.008, [0, 0.006, 0], '#b9c0c6', 'metal', [Math.PI / 2, 0, 0], 24);
    const g = new THREE.Group(); k.build(g, { shadows: false }); return g;
  };

  /** pop a group in with a little bounce */
  ctx.pop = (obj, dur = 0.5) => {
    const s = { v: 0.01 };
    obj.scale.setScalar(0.01);
    ctx.tweens.push({ obj: s, key: 'v', from: 0.01, to: 1, t: 0, dur, fn: ease.back, onStep: () => obj.scale.setScalar(Math.max(0.01, s.v)) });
  };

  ctx.update = (dt) => {
    ctx.time += dt;
    for (const tw of ctx.tweens) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.dur);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * tw.fn(k);
      if (tw.onStep) tw.onStep();
      if (k >= 1 && tw.onDone) tw.onDone();
    }
    ctx.tweens = ctx.tweens.filter((tw) => tw.t < tw.dur);
    for (const tm of ctx.timers) { tm.t -= dt; if (tm.t <= 0) tm.fn(); }
    ctx.timers = ctx.timers.filter((tm) => tm.t > 0);
    for (const f of ctx.flights) {
      f.t += dt; const k = Math.min(1, f.t / f.dur);
      const tp = typeof f.to === 'function' ? f.to() : f.to;
      const b = toV(tp.x, tp.y, tp.z ?? 100);
      f.it.pos.lerpVectors(f.a, b, ease.inOut(k));
      f.it.pos.y += Math.sin(k * Math.PI) * f.arc;
      f.it.rot += dt * 8;
      if (k >= 1) { f.it.destroy(); if (f.onDone) f.onDone(); }
    }
    ctx.flights = ctx.flights.filter((f) => f.t < f.dur);
    for (const fl of ctx.floats) {
      fl.t += dt;
      fl.s.position.y = fl.y0 + ease.out(Math.min(1, fl.t / 1.1)) * 0.6;
      fl.s.userData.mul = fl.t < 0.15 ? 0.6 + fl.t / 0.15 * 0.4 : 1;
      fl.s.material.opacity = fl.t < 0.6 ? 1 : Math.max(0, 1 - (fl.t - 0.6) / 0.5);
      if (fl.t > 1.1) { fl.s.removeFromParent(); fl.s.material.map.dispose(); fl.s.material.dispose(); }
    }
    ctx.floats = ctx.floats.filter((f) => f.t <= 1.1);
    ctx.confettiFx.update(dt);
    ctx.batches.update();
    updateScreenSprites(view.camera);
  };

  ctx.dispose = () => {
    ctx.tweens = []; ctx.timers = []; ctx.flights = []; ctx.floats = [];
    view.newScene();
  };
  return ctx;
}
