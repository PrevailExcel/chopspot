// Shared materials, procedural textures and a "kit" that merges many small coloured parts into a
// handful of meshes. Merging is what keeps a detailed room cheap on phones: a whole table with
// chairs, cloth, candle and vase becomes one draw call per material instead of dozens.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// materials (created once, reused across visits)
const M = {};
function shared(m) { m.userData.shared = true; return m; }
export function mats() {
  if (M.matte) return M;
  const vc = (o) => shared(new THREE.MeshStandardMaterial({ vertexColors: true, ...o }));
  M.matte = vc({ roughness: 0.85, metalness: 0 });
  M.satin = vc({ roughness: 0.5, metalness: 0 });
  M.gloss = vc({ roughness: 0.14, metalness: 0, envMapIntensity: 1.2 });
  M.metal = vc({ roughness: 0.28, metalness: 1, envMapIntensity: 1.3 });
  M.velvet = vc({ roughness: 0.95, metalness: 0 });
  M.glow = shared(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4) }));
  M.night = shared(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.25, 0.25, 0.25) }));
  M.glass = shared(new THREE.MeshStandardMaterial({ color: 0x9fbfcc, roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.2, envMapIntensity: 2.2, depthWrite: false }));
  M.person = vc({ roughness: 0.6, metalness: 0 });
  M.ghost = shared(new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.28, depthWrite: false }));
  return M;
}

// ---------------------------------------------------------------------------
// procedural textures
const TEX = {};
function canvasTex(key, w, h, draw, { repeat = null, srgb = true } = {}) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.userData.shared = true;
  TEX[key] = t;
  return t;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function noise(g, w, h, n, cols, rMin, rMax, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.arc(r() * w, r() * h, rMin + r() * (rMax - rMin), 0, 7); g.fill(); }
}

export const textures = {
  oak: () => canvasTex('oak', 512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#3a2414'; g.fillRect(0, 0, w, h);
    const rowH = 64;
    for (let row = 0; row < h / rowH; row++) {
      let x = -r() * 300;
      while (x < w) {
        const len = 220 + r() * 260;
        const v = (r() - 0.5) * 34;
        g.fillStyle = `rgb(${158 + v},${108 + v * 0.8},${66 + v * 0.6})`;
        g.fillRect(x + 1, row * rowH + 1, len - 2, rowH - 2);
        g.strokeStyle = 'rgba(70,40,18,0.22)'; g.lineWidth = 1;
        for (let k = 0; k < 7; k++) {
          const yy = row * rowH + 4 + r() * (rowH - 8);
          g.beginPath(); g.moveTo(x + 2, yy);
          g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 6, x + len * 0.6, yy + (r() - 0.5) * 6, x + len - 2, yy + (r() - 0.5) * 4); g.stroke();
        }
        g.fillStyle = 'rgba(255,235,200,0.06)'; g.fillRect(x + 1, row * rowH + 1, len - 2, 6);
        x += len;
      }
    }
    // planks wrap seamlessly at the edges
    g.drawImage(g.canvas, w - 4, 0, 4, h, 0, 0, 4, h);
  }, { repeat: true }),
  marble: () => canvasTex('marble', 512, 512, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#efebe5'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 900, ['rgba(200,195,188,0.25)', 'rgba(255,255,255,0.35)'], 1, 6, 9);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(${120 + r() * 40},${115 + r() * 40},${110 + r() * 40},${0.25 + r() * 0.3})`;
      g.lineWidth = 0.6 + r() * 2.4;
      g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { const nx = x + (r() - 0.3) * 160, ny = y + (r() - 0.5) * 120; g.quadraticCurveTo((x + nx) / 2 + (r() - 0.5) * 60, (y + ny) / 2 + (r() - 0.5) * 60, nx, ny); x = nx; y = ny; }
      g.stroke();
    }
  }, { repeat: true }),
  kitchenTile: () => canvasTex('ktile', 256, 256, (g, w, h) => {
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#3a3f45' : '#33383d'; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
  }, { repeat: true }),
  pavers: () => canvasTex('pavers', 512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#8e8676'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) {
      const off = (row % 2) * 48;
      for (let col = -1; col < 6; col++) {
        const v = 196 + (r() - 0.5) * 22;
        g.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
        g.fillRect(col * 96 + off + 3, row * 64 + 3, 90, 58);
      }
    }
    noise(g, w, h, 1400, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)'], 0.5, 2, 4);
  }, { repeat: true }),
  asphalt: () => canvasTex('asphalt', 512, 512, (g, w, h) => {
    g.fillStyle = '#3b3f45'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 6000, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.12)', 'rgba(120,120,120,0.08)'], 0.4, 1.8, 5);
  }, { repeat: true }),
  concrete: () => canvasTex('concrete', 256, 256, (g, w, h) => {
    g.fillStyle = '#b9b4aa'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 1500, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.08)'], 0.5, 2, 8);
    g.strokeStyle = 'rgba(70,65,55,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  }, { repeat: true }),
  grass: () => canvasTex('grass', 256, 256, (g, w, h) => {
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 2600; i++) { g.strokeStyle = ['#5c9a45', '#477f34', '#6aa94f', '#3f7430'][Math.floor(r() * 4)]; g.lineWidth = 1; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 4); g.stroke(); }
  }, { repeat: true }),
  slats: () => canvasTex('slats', 256, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 16) { const v = 110 + (x % 32 ? 10 : 0); g.fillStyle = `rgb(${v},${v * 0.66},${v * 0.42})`; g.fillRect(x, 0, 12, h); g.fillStyle = '#1a120c'; g.fillRect(x + 12, 0, 4, h); }
  }, { repeat: true }),
  subway: () => canvasTex('subway', 256, 256, (g, w, h) => {
    g.fillStyle = '#c9cdd1'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) { const off = (row % 2) * 32; for (let col = -1; col < 5; col++) { g.fillStyle = '#f2f3f4'; g.fillRect(col * 64 + off + 2, row * 32 + 2, 60, 28); } }
  }, { repeat: true }),
  subwayGreen: () => canvasTex('subwayg', 256, 256, (g, w, h) => {
    g.fillStyle = '#16241f'; g.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let row = 0; row < 8; row++) { const off = (row % 2) * 32; for (let col = -1; col < 5; col++) { const v = (r() - 0.5) * 14; g.fillStyle = `rgb(${38 + v},${74 + v},${62 + v})`; g.fillRect(col * 64 + off + 2, row * 32 + 2, 60, 28); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(col * 64 + off + 4, row * 32 + 4, 56, 6); } }
  }, { repeat: true }),
  glowDisc: () => canvasTex('glowdisc', 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }),
  softShadow: () => canvasTex('softshadow', 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }),
  edgeShadow: () => canvasTex('edgeshadow', 4, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }),
};

/** a textured material (floors, walls) */
export function texMat(key, repeatX, repeatY, opts = {}) {
  const base = textures[key]();
  const t = base.clone(); t.needsUpdate = true; t.repeat.set(repeatX, repeatY); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0, ...opts });
}

// ---------------------------------------------------------------------------
// geometry cache
const G = {};
function cached(key, make) { if (!G[key]) { G[key] = make(); G[key].userData.shared = true; } return G[key]; }
export const geo = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  rbox: (r = 0.12, seg = 2) => cached(`rbox${r}_${seg}`, () => new RoundedBoxGeometry(1, 1, 1, seg, r)),
  cyl: (seg = 16) => cached(`cyl${seg}`, () => new THREE.CylinderGeometry(0.5, 0.5, 1, seg)),
  cone: (seg = 16) => cached(`cone${seg}`, () => new THREE.ConeGeometry(0.5, 1, seg)),
  sphere: (seg = 12) => cached(`sph${seg}`, () => new THREE.SphereGeometry(0.5, seg, Math.max(6, Math.round(seg * 0.75)))),
  torus: (t = 0.15, seg = 16) => cached(`tor${t}_${seg}`, () => new THREE.TorusGeometry(0.5, t, 6, seg)),
  capsule: (r = 0.5, l = 1, seg = 8) => cached(`cap${r}_${l}_${seg}`, () => new THREE.CapsuleGeometry(r, l, 3, seg)),
  plane: () => cached('plane', () => new THREE.PlaneGeometry(1, 1)),
};

// ---------------------------------------------------------------------------
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

/** prepare a geometry for merging: non-indexed, position + normal + colour only */
export function paint(geom, color, matrix = null) {
  let g = geom.index ? geom.toNonIndexed() : geom.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (matrix) g.applyMatrix4(matrix);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/**
 * Collects coloured parts and merges them by material.
 * Coordinates are metres. `frame(x, z, rotY, fn)` places a group of parts.
 */
export class Kit {
  constructor() { this.parts = {}; this.stack = [new THREE.Matrix4()]; }
  get base() { return this.stack[this.stack.length - 1]; }
  frame(x, y, z, rotY, fn, scale = 1) {
    const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, rotY, 0)), _s.set(scale, scale, scale));
    this.stack.push(this.base.clone().multiply(m));
    fn(this);
    this.stack.pop();
    return this;
  }
  add(geom, { mat = 'matte', color = 0xffffff, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
    if (!rot) rot = [0, 0, 0]; if (!pos) pos = [0, 0, 0]; if (!mat) mat = 'matte';
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(scale[0], scale[1], scale[2]));
    const mm = this.base.clone().multiply(_m);
    (this.parts[mat] = this.parts[mat] || []).push(paint(geom, color, mm));
    return this;
  }
  // handy primitives (size in metres, pos = centre)
  box(w, h, d, pos, color, mat, rot) { return this.add(geo.box(), { pos, color, mat, rot, scale: [w, h, d] }); }
  rbox(w, h, d, pos, color, mat, rot, r = 0.12) { return this.add(geo.rbox(r), { pos, color, mat, rot, scale: [w, h, d] }); }
  cyl(rad, h, pos, color, mat, seg = 16, rot) { return this.add(geo.cyl(seg), { pos, color, mat, rot, scale: [rad * 2, h, rad * 2] }); }
  cone(rad, h, pos, color, mat, seg = 16, rot) { return this.add(geo.cone(seg), { pos, color, mat, rot, scale: [rad * 2, h, rad * 2] }); }
  sphere(rx, ry, rz, pos, color, mat, seg = 12, rot) { return this.add(geo.sphere(seg), { pos, color, mat, rot, scale: [rx * 2, ry * 2, rz * 2] }); }
  torus(rad, tube, pos, color, mat, rot, seg = 16) { const g = new THREE.TorusGeometry(rad, tube, 8, seg); this.add(g, { pos, color, mat, rot }); g.dispose(); return this; }
  lathe(points, pos, color, mat, seg = 20, scale = [1, 1, 1], rot) {
    const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    this.add(g, { pos, color, mat, scale, rot }); g.dispose();
    return this;
  }
  /** merge into meshes and add them to `parent` */
  build(parent, { shadows = false, receive = true, ghost = false } = {}) {
    const m = mats();
    const meshes = [];
    for (const [key, list] of Object.entries(this.parts)) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, ghost ? m.ghost : m[key]);
      mesh.castShadow = shadows && key !== 'glow' && key !== 'glass';
      mesh.receiveShadow = receive && key !== 'glow';
      if (key === 'glass') mesh.renderOrder = 2;
      parent.add(mesh); meshes.push(mesh);
    }
    this.parts = {};
    return meshes;
  }
}

// ---------------------------------------------------------------------------
// canvas text for signs, tags and bubbles
export function textCanvas(lines, { w = 512, h = 128, bg = null, font = '700 64px Fredoka', color = '#ffffff', stroke = null, sw = 6, align = 'center', radius = 24, glow = null, pad = 0 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(pad, pad, w - pad * 2, h - pad * 2, radius); g.fill(); }
  g.textAlign = align; g.textBaseline = 'middle';
  const arr = [].concat(lines);
  arr.forEach((ln, i) => {
    const L = typeof ln === 'string' ? { text: ln } : ln;
    g.font = L.font || font;
    const y = L.y != null ? L.y : h / 2 + (i - (arr.length - 1) / 2) * (L.gap || h / (arr.length + 0.6));
    const x = align === 'center' ? w / 2 : align === 'left' ? 20 : w - 20;
    if (L.glow || glow) { g.shadowColor = L.glow || glow; g.shadowBlur = 24; }
    if (L.stroke || stroke) { g.strokeStyle = L.stroke || stroke; g.lineWidth = L.sw || sw; g.lineJoin = 'round'; g.strokeText(L.text, x, y); }
    g.fillStyle = L.color || color; g.fillText(L.text, x, y);
    g.shadowBlur = 0;
  });
  return c;
}
export function canvasToTexture(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
