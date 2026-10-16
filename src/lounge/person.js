// 3D people, built in code: a smooth stylised body on an 18-bone skeleton, merged into ONE skinned
// mesh per person (one draw call), with outfits people actually wear to a nice place in Aba:
// suits, senator wear, shirts and chinos, jeans and tops, gowns, skirts, jumpsuits, plus staff uniforms.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mats, paint, geo } from './kit.js';

// ---------------------------------------------------------------------------
// skeleton (metres, at scale 1). Characters face +z.
const BONES = [
  ['root', -1, [0, 0, 0]],
  ['hips', 0, [0, 0.98, 0]],
  ['spine', 1, [0, 0.12, 0]],
  ['chest', 2, [0, 0.2, 0]],
  ['neck', 3, [0, 0.2, 0]],
  ['head', 4, [0, 0.07, 0]],
  ['uArmL', 3, [0.185, 0.15, 0]],
  ['fArmL', 6, [0, -0.27, 0]],
  ['handL', 7, [0, -0.24, 0]],
  ['uArmR', 3, [-0.185, 0.15, 0]],
  ['fArmR', 9, [0, -0.27, 0]],
  ['handR', 10, [0, -0.24, 0]],
  ['thighL', 1, [0.092, -0.03, 0]],
  ['shinL', 12, [0, -0.44, 0]],
  ['footL', 13, [0, -0.43, 0]],
  ['thighR', 1, [-0.092, -0.03, 0]],
  ['shinR', 15, [0, -0.44, 0]],
  ['footR', 16, [0, -0.43, 0]],
  ['lids', 5, [0, 0.137, 0.106]],
];
const B = Object.fromEntries(BONES.map(([n], i) => [n, i]));
const restWorld = (() => {
  const out = [];
  BONES.forEach(([, parent, p], i) => {
    const v = new THREE.Vector3(...p);
    if (parent >= 0) v.add(out[parent]);
    out[i] = v;
  });
  return out;
})();

// ---------------------------------------------------------------------------
// palettes
export const SKIN = ['#3b2416', '#4a2d1b', '#5a3721', '#6b4226', '#7a4c2c', '#8d5a36', '#9c6a43', '#a87650'];
const HAIR_COL = ['#120c08', '#1b120c', '#22160e', '#2e1d12', '#3d2616', '#5a3a1f'];
const FABRIC = {
  dark: ['#1d2230', '#23262d', '#2b2f3a', '#151619', '#2a2340', '#1f2a24'],
  rich: ['#6d1f2c', '#1f5a46', '#203a6b', '#5a2a5e', '#7a4a1e', '#0f5c5c', '#8a2a3a', '#2e4f8f'],
  light: ['#f2ede4', '#e9dcc3', '#d8c7a8', '#ffffff', '#cfd8e0', '#e8d3d0'],
  bright: ['#e2a33a', '#c0392b', '#2c7be5', '#e86a8a', '#3fa66a', '#d96a2b', '#7b4fd6', '#e8c547'],
  denim: ['#2c4366', '#3b5a8a', '#22324d', '#1a1d24', '#4d6b99'],
  khaki: ['#c8b28a', '#b59c74', '#8a7a5a', '#2b3a55', '#3a3a3a', '#d8cdb8'],
};
const pick = (r, a) => a[Math.floor(r() * a.length)];

// ---------------------------------------------------------------------------
/** look = { gender, outfit, skin, hair, hairCol, top, bottom, accent, shoes, sleeves, hem, beard, glasses, bag, hat, scale, width } */
export function randomLook(seed, opts = {}) {
  let s = (seed * 2654435761) >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gender = opts.gender || (r() < 0.5 ? 'f' : 'm');
  const L = { gender, skin: pick(r, SKIN), hairCol: pick(r, HAIR_COL), scale: 0.95 + r() * 0.1, width: 0.92 + r() * 0.22 };
  if (gender === 'm') {
    L.outfit = pick(r, ['suit', 'suit', 'senator', 'senator', 'shirt', 'shirt', 'tee', 'blazer']);
    L.hair = pick(r, ['low', 'low', 'fade', 'fade', 'afro', 'bald', 'low', 'dread']);
    L.beard = r() < 0.45;
    L.glasses = r() < 0.18;
    L.hat = L.outfit === 'senator' && r() < 0.25 ? 'fila' : null;
  } else {
    L.outfit = pick(r, ['gown', 'gown', 'gown', 'skirt', 'tee', 'jumpsuit', 'blazer', 'maxi']);
    L.hair = pick(r, ['bob', 'long', 'braids', 'bun', 'puff', 'afro', 'long', 'braids', 'fade']);
    L.glasses = r() < 0.12;
    L.bag = r() < 0.4;
    L.earrings = r() < 0.7;
  }
  switch (L.outfit) {
    case 'suit': L.top = pick(r, [...FABRIC.dark, ...FABRIC.rich.slice(0, 3), '#d8cdb8']); L.bottom = r() < 0.7 ? L.top : pick(r, FABRIC.dark); L.accent = pick(r, ['#8a2a3a', '#203a6b', '#c9a24a', '#1f5a46', '#e2a33a']); L.shirt = r() < 0.8 ? '#f6f6f2' : pick(r, FABRIC.light); L.shoes = pick(r, ['#151515', '#3d2416']); break;
    case 'senator': L.top = pick(r, [...FABRIC.rich, ...FABRIC.light, '#1d2230', '#3a3a3a']); L.bottom = L.top; L.accent = pick(r, ['#c9a24a', '#1d2230', '#ffffff']); L.shoes = pick(r, ['#151515', '#3d2416', '#6b4226']); break;
    case 'shirt': L.top = pick(r, [...FABRIC.light, ...FABRIC.rich, '#cfe0f0']); L.bottom = pick(r, FABRIC.khaki); L.sleeves = r() < 0.6 ? 'long' : 'short'; L.shoes = pick(r, ['#3d2416', '#6b4226', '#151515']); break;
    case 'tee': L.top = pick(r, [...FABRIC.bright, ...FABRIC.light, '#1a1a1a']); L.bottom = pick(r, FABRIC.denim); L.shoes = pick(r, ['#f4f4f4', '#f4f4f4', '#1a1a1a']); L.sleeves = 'short'; break;
    case 'blazer': L.top = pick(r, [...FABRIC.rich, '#c8b28a', '#1d2230', '#f2ede4']); L.shirt = pick(r, ['#ffffff', '#1a1a1a', '#e9dcc3']); L.bottom = gender === 'm' ? pick(r, FABRIC.denim) : pick(r, [...FABRIC.dark, '#f2ede4']); L.shoes = pick(r, ['#151515', '#f4f4f4', '#6b4226']); break;
    case 'gown': L.top = pick(r, [...FABRIC.rich, ...FABRIC.bright, '#1a1a1a', '#f2ede4']); L.hem = 'knee'; L.sleeves = r() < 0.5 ? 'none' : 'short'; L.shoes = pick(r, ['#151515', '#c9a24a', '#e8d3d0', '#8a2a3a']); break;
    case 'maxi': L.top = pick(r, [...FABRIC.rich, ...FABRIC.bright, '#f2ede4']); L.hem = 'floor'; L.sleeves = r() < 0.5 ? 'none' : 'long'; L.shoes = '#c9a24a'; L.outfit = 'gown'; break;
    case 'skirt': L.top = pick(r, [...FABRIC.light, ...FABRIC.bright]); L.bottom = pick(r, [...FABRIC.dark, ...FABRIC.rich]); L.sleeves = r() < 0.5 ? 'short' : 'long'; L.shoes = pick(r, ['#151515', '#8a2a3a', '#e8d3d0']); break;
    case 'jumpsuit': L.top = pick(r, [...FABRIC.rich, '#1a1a1a', '#f2ede4', '#e2a33a']); L.bottom = L.top; L.sleeves = 'none'; L.shoes = pick(r, ['#151515', '#c9a24a']); break;
    default: break;
  }
  L.bagCol = pick(r, ['#151515', '#8a2a3a', '#c9a24a', '#e9dcc3', '#5a2a1e']);
  return Object.assign(L, opts);
}

/** staff uniforms */
export function staffLook(kind, seed, gender) {
  const base = randomLook(seed, { gender: gender || (seed % 2 ? 'f' : 'm') });
  const g = base.gender;
  const keep = { gender: g, skin: base.skin, hair: base.hair, hairCol: base.hairCol, scale: base.scale, width: Math.min(1.06, base.width), beard: base.beard && g === 'm', earrings: g === 'f' };
  switch (kind) {
    case 'chef': return { ...keep, outfit: 'chef', top: '#f7f7f4', bottom: '#2a2a2e', shoes: '#151515', hat: 'toque', hair: g === 'f' ? 'bun' : 'low' };
    case 'waiter': return { ...keep, outfit: 'waiter', top: '#f7f7f4', vest: '#16171b', bottom: '#16171b', accent: '#16171b', shoes: '#111111' };
    case 'host': return g === 'f'
      ? { ...keep, outfit: 'gown', top: '#141418', hem: 'knee', sleeves: 'long', shoes: '#141418', badge: true, hair: 'bun' }
      : { ...keep, outfit: 'suit', top: '#141418', bottom: '#141418', shirt: '#f6f6f2', accent: '#c9a24a', shoes: '#111111', badge: true };
    case 'bartender': return { ...keep, outfit: 'apron', top: '#1a1a1e', bottom: '#1a1a1e', apron: '#5a3a22', shoes: '#111111', sleeves: 'rolled' };
    case 'busser': return { ...keep, outfit: 'apron', top: '#2f3a4a', bottom: '#1a1a1e', apron: '#16171b', shoes: '#111111', sleeves: 'short' };
    case 'washer': return { ...keep, outfit: 'apron', top: '#2f6f8f', bottom: '#1a1a1e', apron: '#e8c35a', shoes: '#111111', sleeves: 'rolled', hat: 'cap', capCol: '#2f6f8f' };
    case 'security': return { ...keep, outfit: 'shirt', top: '#1f2a44', bottom: '#1f2a44', sleeves: 'short', shoes: '#0d0d0d', hat: 'cap', capCol: '#1f2a44', hair: 'low', gender: 'm' };
    case 'manager': return g === 'f'
      ? { ...keep, outfit: 'blazer', top: '#2c3e66', shirt: '#f6f6f2', bottom: '#1d2230', shoes: '#151515', badge: true }
      : { ...keep, outfit: 'suit', top: '#2c3e66', bottom: '#2c3e66', shirt: '#f6f6f2', accent: '#c0392b', shoes: '#151515', badge: true };
    case 'planner': return { ...keep, outfit: 'blazer', top: '#5a2a5e', shirt: '#f6f6f2', bottom: '#1d2230', shoes: '#151515', badge: true };
    case 'band': return { ...base, outfit: base.gender === 'm' ? 'shirt' : 'jumpsuit', top: base.gender === 'm' ? '#1a1a1e' : '#6d1f2c', bottom: '#1a1a1e', sleeves: 'long' };
    default: return base;
  }
}

/** the player, from the character creator */
export function ownerLook(profile2d, gender, outfitColor, skinHex, hairId) {
  const hairMap = gender === 'f'
    ? { wrap: 'bun', puff: 'puff', braids: 'braids', short: 'fade', cap: 'bun' }
    : { short: 'low', cap: 'low', puff: 'afro', wrap: 'low', braids: 'dread' };
  const col = '#' + outfitColor.toString(16).padStart(6, '0');
  const skin = '#' + skinHex.toString(16).padStart(6, '0');
  if (gender === 'f') return { gender: 'f', outfit: 'gown', top: col, hem: 'knee', sleeves: 'short', shoes: '#151515', skin, hair: hairMap[hairId] || 'bun', hairCol: '#140d09', scale: 1.0, width: 1, earrings: true, badge: true };
  return { gender: 'm', outfit: 'suit', top: col, bottom: '#1d2230', shirt: '#f6f6f2', accent: '#16171b', shoes: '#151515', skin, hair: hairMap[hairId] || 'low', hairCol: '#140d09', scale: 1.02, width: 1.02, badge: true, beard: hairId === 'cap' };
}

// ---------------------------------------------------------------------------
// building the mesh

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function makeLathe(pts, seg = 12) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
let lumpy = null;
function afroGeo() {
  if (lumpy) return lumpy;
  const g = new THREE.IcosahedronGeometry(0.5, 2);
  const p = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + 0.06 * Math.sin(v.x * 23 + v.y * 17) * Math.cos(v.z * 19 + v.x * 7); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  lumpy = g; lumpy.userData.shared = true;
  return g;
}
function shell(thetaLen, frontGap = 0, thetaStart = 0) {
  // part of a sphere: used for hair caps and bobs (front gap leaves the face open)
  const phiStart = frontGap ? Math.PI / 2 + frontGap : 0;
  const phiLen = frontGap ? Math.PI * 2 - frontGap * 2 : Math.PI * 2;
  return new THREE.SphereGeometry(0.5, 12, 8, phiStart, phiLen, thetaStart, thetaLen);
}

const CACHE = new Map();

/** merged, skinned geometry for a look (cached) */
function buildGeometry(look) {
  const key = JSON.stringify(look);
  if (CACHE.has(key)) return CACHE.get(key);
  const S = look.scale || 1; const W = look.width || 1; const f = look.gender === 'f';
  const parts = [];
  const temp = [];
  const add = (bone, geom, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) => {
    const rw = restWorld[B[bone]];
    if (bone === 'head') { const HS = 1.12; pos = pos.map((v) => v * HS); scale = scale.map((v) => v * HS); }
    _m.compose(_p.set((rw.x + pos[0]) * S * (bone === 'root' ? 1 : 1), (rw.y + pos[1]) * S, (rw.z + pos[2]) * S),
      _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(scale[0] * S, scale[1] * S, scale[2] * S));
    // widen the body (not the head) for variety
    if (!['head', 'neck', 'lids'].includes(bone)) { const wm = new THREE.Matrix4().makeScale(W, 1, Math.sqrt(W)); _m.premultiply(wm); }
    const g = paint(geom, color, _m);
    const n = g.attributes.position.count;
    const si = new Uint16Array(n * 4); const sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = B[bone]; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    parts.push(g);
  };
  const T = (g) => { temp.push(g); return g; };
  const sph = geo.sphere(8); const sphH = geo.sphere(12); const cap = (r, l) => T(new THREE.CapsuleGeometry(r, l, 2, 8)); const box = geo.box(); const rbox = geo.rbox(0.25, 2); const cyl = geo.cyl(14);

  const skin = look.skin; const top = look.top || '#ffffff'; const bottom = look.bottom || top;
  const sleeveCol = { none: skin, short: top, long: top, rolled: top }[look.sleeves || (['suit', 'senator', 'blazer', 'chef', 'waiter'].includes(look.outfit) ? 'long' : 'short')];
  const forearmCol = (look.sleeves === 'long' || ['suit', 'senator', 'blazer', 'chef', 'waiter'].includes(look.outfit)) && look.sleeves !== 'rolled' && look.sleeves !== 'short' ? top : skin;
  const lowerSkin = darken(skin, 0.06);
  const dress = look.outfit === 'gown';
  const skirt = look.outfit === 'skirt';
  const legsCol = dress || skirt ? lowerSkin : bottom;

  // ---- head ----
  add('head', sphH, skin, { pos: [0, 0.115, 0.005], scale: [0.205, 0.245, 0.225] });
  add('head', sphH, skin, { pos: [0, 0.06, 0.022], scale: [0.165, 0.14, 0.18] });
  for (const sx of [-1, 1]) add('head', sph, skin, { pos: [sx * 0.1, 0.105, -0.005], scale: [0.04, 0.065, 0.04] });
  add('head', sph, darken(skin, 0.1), { pos: [0, 0.09, 0.112], scale: [0.045, 0.05, 0.05] });
  for (const sx of [-1, 1]) {
    add('head', sph, '#f6f1ea', { pos: [sx * 0.043, 0.124, 0.094], scale: [0.044, 0.042, 0.024] });
    add('head', sph, '#120b07', { pos: [sx * 0.043, 0.122, 0.104], scale: [0.027, 0.031, 0.012] });
    add('head', sph, '#ffffff', { pos: [sx * 0.043 + 0.006, 0.13, 0.109], scale: [0.007, 0.007, 0.004] });
    add('head', box, darken(look.hairCol || '#140d09', 0), { pos: [sx * 0.042, 0.152, 0.1], rot: [0, 0, sx * -0.12], scale: [0.042, 0.009, 0.012] });
  }
  add('head', box, f ? '#7a2e2e' : darken(skin, 0.22), { pos: [0, 0.048, 0.104], scale: [0.042, f ? 0.013 : 0.009, 0.012] });
  for (const sx of [-1, 1]) add('lids', sph, darken(skin, 0.04), { pos: [sx * 0.048, 0, 0.004], scale: [0.054, 0.05, 0.03] });
  if (look.earrings) for (const sx of [-1, 1]) add('head', sph, '#d9b26a', { pos: [sx * 0.104, 0.07, 0], scale: [0.02, 0.02, 0.02] });
  if (look.glasses) {
    for (const sx of [-1, 1]) add('head', T(new THREE.TorusGeometry(0.024, 0.005, 6, 14)), '#141414', { pos: [sx * 0.042, 0.122, 0.112] });
    add('head', box, '#141414', { pos: [0, 0.125, 0.113], scale: [0.03, 0.005, 0.005] });
  }
  if (look.beard) {
    add('head', sph, look.hairCol, { pos: [0, 0.045, 0.052], scale: [0.17, 0.1, 0.13] });
    add('head', box, look.hairCol, { pos: [0, 0.066, 0.106], scale: [0.06, 0.012, 0.012] });
  }
  hairParts(add, look, sph, T);

  // ---- neck & torso ----
  add('neck', cyl, skin, { pos: [0, 0.05, 0], scale: [0.095, 0.13, 0.095] });
  const chestPts = f
    ? [[0.125, -0.02], [0.138, 0.05], [0.158, 0.11], [0.155, 0.17], [0.13, 0.22], [0.075, 0.25], [0.04, 0.255]]
    : [[0.14, -0.02], [0.152, 0.06], [0.168, 0.14], [0.165, 0.2], [0.13, 0.24], [0.07, 0.262], [0.04, 0.265]];
  const chestCol = look.vest || top;
  add('chest', T(makeLathe(chestPts)), chestCol, { scale: [1, 1, 0.68] });
  if (f && !['chef', 'waiter'].includes(look.outfit)) add('chest', sph, chestCol, { pos: [0, 0.11, 0.06], scale: [0.25, 0.12, 0.1] });
  add('spine', T(makeLathe(f ? [[0.142, -0.12], [0.122, -0.02], [0.118, 0.08], [0.128, 0.2]] : [[0.15, -0.12], [0.138, 0], [0.135, 0.1], [0.142, 0.2]])), chestCol, { scale: [1, 1, 0.7] });
  add('hips', T(makeLathe([[0.12, -0.13], [0.158, -0.08], [0.16, -0.02], [0.148, 0.05]])), dress ? top : bottom, { scale: [1, 1, 0.72] });

  // neckline details
  if (look.outfit === 'suit' || look.outfit === 'blazer') {
    add('chest', box, look.shirt || '#ffffff', { pos: [0, 0.17, 0.098], rot: [-0.25, 0, 0], scale: [0.07, 0.12, 0.012] });
    if (look.outfit === 'suit') add('chest', box, look.accent || '#203a6b', { pos: [0, 0.12, 0.108], rot: [-0.12, 0, 0], scale: [0.026, 0.17, 0.01] });
    for (const sx of [-1, 1]) add('chest', box, darken(top, 0.18), { pos: [sx * 0.045, 0.14, 0.104], rot: [-0.18, 0, sx * 0.42], scale: [0.04, 0.17, 0.012] });
    add('hips', T(makeLathe([[0.168, -0.15], [0.17, -0.06], [0.16, 0.06]])), top, { scale: [1, 1, 0.74] }); // jacket hem
    if (look.badge) add('chest', box, '#d9b26a', { pos: [0.085, 0.15, 0.102], scale: [0.04, 0.012, 0.01] });
  } else if (look.outfit === 'senator') {
    add('neck', T(new THREE.TorusGeometry(0.052, 0.012, 6, 14)), top, { pos: [0, 0.0, 0], rot: [Math.PI / 2, 0, 0] });
    add('chest', box, look.accent || darken(top, 0.25), { pos: [0.05, 0.08, 0.102], scale: [0.012, 0.22, 0.01] });
    add('hips', T(makeLathe([[0.19, -0.44], [0.175, -0.25], [0.162, -0.06], [0.15, 0.06]])), top, { scale: [1, 1, 0.76] });
  } else if (look.outfit === 'shirt') {
    add('chest', box, darken(top, 0.12), { pos: [0, 0.1, 0.1], scale: [0.008, 0.26, 0.008] });
    add('hips', T(new THREE.TorusGeometry(0.152, 0.012, 6, 18)), '#2a1a10', { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.72, 1] });
  } else if (look.outfit === 'waiter') {
    add('chest', box, '#f7f7f4', { pos: [0, 0.18, 0.096], rot: [-0.2, 0, 0], scale: [0.07, 0.1, 0.012] });
    add('chest', box, '#16171b', { pos: [0, 0.22, 0.104], scale: [0.05, 0.018, 0.012] }); // bow tie
    add('hips', box, '#16171b', { pos: [0, -0.24, 0.105], scale: [0.27, 0.42, 0.012] }); // long apron
  } else if (look.outfit === 'chef') {
    for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) add('chest', sph, '#d9d9d4', { pos: [sx * 0.045, 0.16 - i * 0.07, 0.1], scale: [0.016, 0.016, 0.01] });
    add('neck', T(new THREE.TorusGeometry(0.055, 0.014, 6, 14)), '#f7f7f4', { pos: [0, 0.0, 0], rot: [Math.PI / 2, 0, 0] });
    add('hips', T(makeLathe([[0.168, -0.16], [0.168, -0.05], [0.155, 0.05]])), top, { scale: [1, 1, 0.74] });
  } else if (look.outfit === 'apron') {
    add('chest', box, look.apron, { pos: [0, 0.06, 0.1], scale: [0.2, 0.2, 0.01] });
    add('hips', box, look.apron, { pos: [0, -0.2, 0.108], scale: [0.28, 0.38, 0.012] });
  } else if (dress) {
    if (look.sleeves === 'none') add('chest', sph, skin, { pos: [0, 0.205, 0.065], scale: [0.16, 0.08, 0.06] });
    const floor = look.hem === 'floor';
    const skirtPts = floor
      ? [[0.21, -0.94], [0.2, -0.7], [0.18, -0.4], [0.163, -0.12], [0.15, 0.05]]
      : [[0.205, -0.46], [0.19, -0.3], [0.17, -0.12], [0.152, 0.05]];
    add('hips', T(makeLathe(skirtPts, 16)), top, { scale: [1, 1, 0.8] });
    add('spine', T(new THREE.TorusGeometry(0.124, 0.012, 6, 18)), darken(top, 0.2), { pos: [0, -0.02, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.72, 1] });
    if (look.badge) add('chest', box, '#d9b26a', { pos: [0.075, 0.15, 0.098], scale: [0.04, 0.012, 0.01] });
  } else if (skirt) {
    add('hips', T(makeLathe([[0.15, -0.45], [0.16, -0.25], [0.158, -0.08], [0.15, 0.05]])), bottom, { scale: [1, 1, 0.76] });
  } else if (look.outfit === 'jumpsuit') {
    add('spine', T(new THREE.TorusGeometry(0.124, 0.014, 6, 18)), '#c9a24a', { pos: [0, -0.02, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.72, 1] });
  }

  // ---- arms ----
  const taper = (rTop, rBot, len) => T(new THREE.CylinderGeometry(rTop, rBot, len, 12, 1));
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    add('uArm' + side, sphH, sleeveCol, { pos: [0, -0.02, 0], scale: [0.112, 0.112, 0.105] });
    add('uArm' + side, taper(0.054, 0.045, 0.25), sleeveCol, { pos: [0, -0.135, 0] });
    add('fArm' + side, sph, forearmCol, { pos: [0, 0, 0], scale: [0.092, 0.092, 0.092] });          // elbow
    add('fArm' + side, taper(0.044, 0.033, 0.23), forearmCol, { pos: [0, -0.115, 0] });
    add('fArm' + side, sph, forearmCol === skin ? skin : forearmCol, { pos: [0, -0.23, 0], scale: [0.068, 0.068, 0.068] }); // wrist
    if (forearmCol !== skin) add('fArm' + side, cyl, look.outfit === 'suit' ? (look.shirt || '#ffffff') : darken(forearmCol, 0.1), { pos: [0, -0.215, 0], scale: [0.078, 0.02, 0.078] });
    add('hand' + side, sph, skin, { pos: [0, -0.06, 0.004], scale: [0.07, 0.1, 0.045] });
    add('hand' + side, sph, skin, { pos: [sx * -0.026, -0.04, 0.022], rot: [0, 0, sx * 0.5], scale: [0.026, 0.05, 0.026] });  // thumb
  }
  if (look.bag) add('fArmL', rbox, look.bagCol, { pos: [0.07, -0.18, 0], scale: [0.06, 0.14, 0.19] });

  // ---- legs ----
  const hideThigh = dress && look.hem === 'floor';
  for (const side of ['L', 'R']) {
    const shinCol = dress && look.hem === 'floor' ? top : legsCol;
    if (!hideThigh) {
      add('thigh' + side, sph, legsCol, { pos: [0, -0.02, 0], scale: [0.16, 0.16, 0.16] });
      add('thigh' + side, taper(0.082, 0.06, 0.42), legsCol, { pos: [0, -0.22, 0] });
    }
    add('shin' + side, sph, shinCol, { pos: [0, 0, 0], scale: [0.124, 0.124, 0.124] });            // knee
    add('shin' + side, taper(0.06, 0.042, 0.42), shinCol, { pos: [0, -0.21, 0] });
    add('shin' + side, sph, shinCol, { pos: [0, -0.42, 0], scale: [0.08, 0.08, 0.08] });             // ankle
    const heel = f && (dress || skirt || look.outfit === 'jumpsuit');
    add('foot' + side, rbox, look.shoes || '#151515', { pos: [0, -0.042, 0.045], scale: [0.092, heel ? 0.06 : 0.075, heel ? 0.21 : 0.25] });
    if (heel) add('foot' + side, box, look.shoes || '#151515', { pos: [0, -0.06, -0.045], scale: [0.025, 0.05, 0.025] });
    if (look.shoes === '#f4f4f4') add('foot' + side, box, '#d0d0d0', { pos: [0, -0.072, 0.045], scale: [0.095, 0.016, 0.255] });
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  temp.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  merged.boundingSphere.radius = Math.max(merged.boundingSphere.radius, 1.2);
  merged.userData.shared = true;
  CACHE.set(key, merged);
  return merged;
}

function hairParts(add, look, sph, T) {
  const c = look.hairCol || '#140d09';
  const h = look.hair;
  const cap = (len = 1.35, lift = 0.008) => add('head', T(shell(len)), c, { pos: [0, 0.118, -0.004], rot: [-0.32, 0, 0], scale: [0.218 + lift, 0.258 + lift, 0.238 + lift] });
  if (h === 'low') cap(1.3, 0.006);
  else if (h === 'fade') cap(1.05, 0.004);
  else if (h === 'afro') { cap(1.4); add('head', afroGeo(), c, { pos: [0, 0.16, -0.02], scale: [0.33, 0.3, 0.31] }); }
  else if (h === 'puff') { cap(1.35); add('head', afroGeo(), c, { pos: [0, 0.255, -0.05], scale: [0.18, 0.16, 0.17] }); }
  else if (h === 'bun') { cap(1.4); add('head', sph, c, { pos: [0, 0.2, -0.115], scale: [0.12, 0.11, 0.11] }); }
  else if (h === 'bob') { cap(1.3, 0.012); add('head', T(shell(2.05, 0.95)), c, { pos: [0, 0.112, -0.01], rot: [-0.1, 0, 0], scale: [0.25, 0.27, 0.26] }); }
  else if (h === 'long') {
    cap(1.3, 0.012);
    add('head', T(shell(2.15, 0.9)), c, { pos: [0, 0.112, -0.01], rot: [-0.08, 0, 0], scale: [0.245, 0.27, 0.255] });
    add('head', geo.rbox(0.25, 2), c, { pos: [0, -0.06, -0.085], rot: [0.12, 0, 0], scale: [0.22, 0.3, 0.06] });
  } else if (h === 'braids') {
    cap(1.5);
    for (let i = 0; i < 9; i++) {
      const a = -1.1 + i * 0.275;
      add('head', geo.cyl(5), c, { pos: [Math.sin(a) * 0.1, -0.05, -0.07 - Math.cos(a) * 0.04], rot: [0.12, 0, 0], scale: [0.022, 0.34, 0.022] });
    }
  } else if (h === 'dread') {
    cap(1.4);
    for (let i = 0; i < 10; i++) {
      const a = -1.6 + i * 0.36;
      add('head', geo.cyl(5), c, { pos: [Math.sin(a) * 0.11, 0.03, -Math.cos(a) * 0.1 + 0.01], rot: [Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3], scale: [0.03, 0.2, 0.03] });
    }
  }
  if (look.hat === 'toque') {
    add('head', geo.cyl(16), '#f7f7f4', { pos: [0, 0.27, -0.01], scale: [0.21, 0.13, 0.21] });
    add('head', afroGeo(), '#ffffff', { pos: [0, 0.36, -0.01], scale: [0.27, 0.15, 0.27] });
  } else if (look.hat === 'cap') {
    add('head', T(shell(1.35)), look.capCol || '#1f2a44', { pos: [0, 0.13, -0.004], rot: [-0.2, 0, 0], scale: [0.235, 0.255, 0.25] });
    add('head', geo.box(), look.capCol || '#1f2a44', { pos: [0, 0.175, 0.13], rot: [0.15, 0, 0], scale: [0.17, 0.012, 0.1] });
  } else if (look.hat === 'fila') {
    add('head', geo.cyl(16), look.top, { pos: [0, 0.22, -0.01], rot: [-0.15, 0, 0.12], scale: [0.225, 0.1, 0.235] });
  }
}

function darken(hex, k) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, hsl.l * (1 - k)));
  return '#' + c.getHexString();
}

// ---------------------------------------------------------------------------
// a person in the world

const lerp = THREE.MathUtils.lerp;
export class Person {
  constructor(look) {
    this.look = look;
    const geom = buildGeometry(look);
    const S = look.scale || 1;
    this.S = S;
    const bones = BONES.map(([name, parent, p]) => { const b = new THREE.Bone(); b.name = name; b.position.set(p[0] * S, p[1] * S, p[2] * S); return b; });
    BONES.forEach(([, parent], i) => { if (parent >= 0) bones[parent].add(bones[i]); });
    // body width also moves the shoulders and hips out
    const W = look.width || 1;
    for (const n of ['uArmL', 'uArmR', 'thighL', 'thighR']) bones[B[n]].position.x *= W;
    const mesh = new THREE.SkinnedMesh(geom, mats().person);
    mesh.add(bones[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    this.mesh = mesh;
    this.bones = bones;
    this.b = Object.fromEntries(BONES.map(([n], i) => [n, bones[i]]));
    this.group = new THREE.Group();
    this.group.add(mesh);
    this.hipsY = 0.98 * S;
    this.phase = Math.random() * 10;
    this.t = Math.random() * 100;
    this.yaw = 0; this.targetYaw = 0;
    this.pose = 'idle';     // idle | walk | sit | ...
    this.action = null;     // eat, talk, cook, mix, bass, keys, drums, clap, wave, guard, carry, drink
    this.speed = 0;
    this.lookYaw = 0; this.lookT = 2;
    this.cur = {};
    this.tempo = 0.85 + Math.random() * 0.3;
    this.blinkT = 1 + Math.random() * 3; this.blink = 0;
    this.b.lids.scale.y = 0.02;
    this.lean = (Math.random() - 0.5) * 0.06;
  }

  setPosition(x, y, z) { this.group.position.set(x, y, z); }
  get position() { return this.group.position; }
  faceTo(yaw, snap = false) { this.targetYaw = yaw; if (snap) this.yaw = yaw; }

  /** speed in m/s; the walk cycle and facing follow it */
  update(dt, vx = 0, vz = 0) {
    this.t += dt;
    const sp = Math.hypot(vx, vz);
    this.speed = lerp(this.speed, sp, Math.min(1, dt * 10));
    if (sp > 0.05) this.targetYaw = Math.atan2(vx, vz);
    let d = this.targetYaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 12);
    this.group.rotation.y = this.yaw;
    this.animate(dt);
  }

  animate(dt) {
    const t = this.t; const b = this.b; const S = this.S;
    const walk = this.pose !== 'sit' ? Math.min(1.3, this.speed / 1.4) : 0;
    this.phase += dt * (2.2 + this.speed * 4.6) * (walk > 0.05 ? 1 : 0);
    const ph = this.phase;
    const tgt = {}; // bone -> [x, y, z]
    const set = (n, x = 0, y = 0, z = 0) => { tgt[n] = [x, y, z]; };
    let hipY = this.hipsY, hipZ = 0;
    // base: relaxed stance
    const tt = t * this.tempo;
    const shift = Math.sin(tt * 0.55);                       // weight moves from foot to foot
    set('uArmL', 0.05 + Math.sin(tt * 0.9) * 0.02, 0, 0.07 + shift * 0.02); set('uArmR', 0.05 + Math.sin(tt * 0.9 + 1) * 0.02, 0, -0.07 + shift * 0.02);
    set('fArmL', -0.18 - Math.max(0, shift) * 0.06); set('fArmR', -0.18 - Math.max(0, -shift) * 0.06);
    set('thighL', 0, 0, -shift * 0.03); set('thighR', 0, 0, -shift * 0.03);
    set('shinL', Math.max(0, -shift) * 0.16); set('shinR', Math.max(0, shift) * 0.16);
    set('footL'); set('footR');
    set('spine', Math.sin(tt * 1.7) * 0.012 + this.lean, 0, shift * 0.025); set('chest', 0, Math.sin(tt * 0.37) * 0.05, -shift * 0.02); set('neck');
    // idle look-around
    this.lookT -= dt;
    if (this.lookT <= 0) { this.lookT = 2 + Math.random() * 4; this.lookYaw = (Math.random() - 0.5) * 0.9; }
    set('head', Math.sin(tt * 0.7) * 0.03, this.speed > 0.2 ? 0 : this.lookYaw, Math.sin(tt * 0.45) * 0.04);
    set('hips', 0, 0, shift * 0.035);

    if (this.pose === 'sit') {
      hipY = 0.54 * S; hipZ = -0.06;
      set('spine', -0.06 + Math.sin(tt * 0.6) * 0.02, 0, 0); set('chest', 0, Math.sin(tt * 0.33) * 0.08, 0);
      set('thighL', -1.5, 0, -0.04); set('thighR', -1.5, 0, 0.04);
      set('shinL', 1.45); set('shinR', 1.45);
      set('footL', 0.05); set('footR', 0.05);
      set('uArmL', -0.35, 0, 0.12); set('uArmR', -0.35, 0, -0.12);
      set('fArmL', -0.8); set('fArmR', -0.8);
    } else if (walk > 0.05) {
      const s1 = Math.sin(ph), c1 = Math.cos(ph);
      set('thighL', -s1 * 0.55 * walk); set('thighR', s1 * 0.55 * walk);
      set('shinL', Math.max(0, Math.sin(ph + 1.9)) * 0.95 * walk + 0.05); set('shinR', Math.max(0, Math.sin(ph + 1.9 + Math.PI)) * 0.95 * walk + 0.05);
      set('footL', s1 * 0.2 * walk); set('footR', -s1 * 0.2 * walk);
      set('uArmL', s1 * 0.45 * walk, 0, 0.09); set('uArmR', -s1 * 0.45 * walk, 0, -0.09);
      set('fArmL', -0.28 - Math.max(0, Math.sin(ph - 0.7)) * 0.42 * walk); set('fArmR', -0.28 - Math.max(0, -Math.sin(ph - 0.7)) * 0.42 * walk);
      set('hips', 0, s1 * 0.1 * walk, c1 * 0.035 * walk); set('spine', 0.06 * walk, 0, 0); set('chest', 0.02 * walk, -s1 * 0.16 * walk, -c1 * 0.025 * walk);
      set('head', -0.03 * walk, s1 * 0.05 * walk, 0);
      hipY = this.hipsY + Math.abs(c1) * 0.028 * walk - 0.01 * walk;
    }

    // upper-body actions on top of the pose
    const a = this.action;
    if (a === 'carry') {
      // tray held high on the right hand, left arm swings as usual
      set('uArmR', -0.15, 0, -2.62); set('fArmR', -0.45, 0, -0.2);
      if (walk <= 0.05) { set('uArmL', -0.1, 0, 0.12); set('fArmL', -0.5); }
    } else if (a === 'eat' || a === 'drink') {
      const k = (Math.sin(t * (a === 'eat' ? 2.2 : 1.2)) + 1) / 2;
      set('uArmR', -0.55 - k * 0.35, 0, -0.18); set('fArmR', -1.0 - k * 1.0);
      set('uArmL', -0.5, 0, 0.15); set('fArmL', -0.9);
      set('head', 0.08 * k, 0, 0);
    } else if (a === 'talk') {
      const g = Math.sin(t * 2.6); const g2 = Math.sin(t * 1.7 + 1);
      set('uArmR', -0.4 + g * 0.18, 0, -0.18); set('fArmR', -1.0 + g2 * 0.3);
      set('uArmL', -0.35 - g2 * 0.12, 0, 0.14); set('fArmL', -0.85 + g * 0.2);
      set('head', Math.sin(t * 3.1) * 0.06, this.lookYaw * 0.6, 0);
      if (Math.sin(t * 0.5) > 0.93) set('chest', -0.08 + Math.sin(t * 22) * 0.03, 0, 0); // a laugh
    } else if (a === 'cook') {
      const g = Math.sin(t * 5);
      set('uArmL', -0.55, 0, 0.15); set('fArmL', -0.9 + g * 0.15);
      set('uArmR', -0.6 + g * 0.1, 0, -0.2); set('fArmR', -1.0, g * 0.4, 0);
      set('chest', 0.12, Math.sin(t * 1.3) * 0.15, 0);
    } else if (a === 'wash') {
      const g = Math.sin(t * 9), g2 = Math.cos(t * 9);
      set('uArmL', -0.7 + g * 0.08, 0, 0.12); set('fArmL', -0.55 + g2 * 0.12);
      set('uArmR', -0.7 - g * 0.1, 0, -0.12 + g2 * 0.06); set('fArmR', -0.6 - g2 * 0.15, g * 0.3, 0);
      set('spine', 0.22, 0, 0); set('chest', 0.08, g * 0.06, 0); set('head', 0.25, 0, 0);
    } else if (a === 'plate') {
      const g = Math.sin(t * 4);
      set('uArmL', -0.8, 0, 0.18); set('fArmL', -0.7 + g * 0.1);
      set('uArmR', -0.9, 0, -0.18); set('fArmR', -0.6 - g * 0.1);
      set('spine', 0.18, 0, 0); set('head', 0.2, 0, 0);
    } else if (a === 'mix') {
      const g = Math.sin(t * 16) * 0.12;
      set('uArmL', -1.1 + g, 0, 0.25); set('fArmL', -1.6);
      set('uArmR', -1.1 + g, 0, -0.25); set('fArmR', -1.6);
    } else if (a === 'bass') {
      set('uArmL', -0.7, 0, 0.75); set('fArmL', -1.2, 0.5, 0);
      set('uArmR', -0.2, 0, -0.1); set('fArmR', -1.0 + Math.sin(t * 9) * 0.2);
      set('chest', 0, Math.sin(t * 2.1) * 0.1, Math.sin(t * 2.1) * 0.04);
      set('head', Math.sin(t * 4.2) * 0.1, 0.3, 0);
    } else if (a === 'keys') {
      set('uArmL', -0.75, 0, 0.12); set('fArmL', -0.7 + Math.sin(t * 7) * 0.12);
      set('uArmR', -0.75, 0, -0.12); set('fArmR', -0.7 + Math.sin(t * 6 + 2) * 0.12);
      set('head', Math.sin(t * 4.2) * 0.08, 0, Math.sin(t * 2.1) * 0.08);
    } else if (a === 'drums') {
      set('uArmL', -0.6 + Math.sin(t * 13) * 0.25, 0, 0.3); set('fArmL', -1.0 + Math.sin(t * 13) * 0.3);
      set('uArmR', -0.6 + Math.sin(t * 13 + 2.2) * 0.25, 0, -0.3); set('fArmR', -1.0 + Math.sin(t * 13 + 2.2) * 0.3);
      set('head', Math.sin(t * 8.4) * 0.07, 0, 0);
    } else if (a === 'clap') {
      const g = Math.abs(Math.sin(t * 9));
      set('uArmL', -0.75, 0, 0.1 + g * 0.2); set('fArmL', -1.3, 0.5, 0);
      set('uArmR', -0.75, 0, -0.1 - g * 0.2); set('fArmR', -1.3, -0.5, 0);
    } else if (a === 'wave') {
      set('uArmR', -0.4, 0, -2.6 + Math.sin(t * 9) * 0.25); set('fArmR', -0.4);
    } else if (a === 'guard') {
      set('uArmL', -0.25, 0, -0.2); set('fArmL', -1.1, -0.5, 0);
      set('uArmR', -0.25, 0, 0.2); set('fArmR', -1.1, 0.5, 0);
    } else if (a === 'type') {
      set('uArmL', -0.55, 0, 0.12); set('fArmL', -0.95 + Math.sin(t * 11) * 0.06);
      set('uArmR', -0.55, 0, -0.12); set('fArmR', -0.95 + Math.sin(t * 12 + 1) * 0.06);
      set('head', 0.2, 0, 0);
    } else if (a === 'cheer') {
      set('uArmL', 0, 0, 2.6 + Math.sin(t * 8) * 0.2); set('uArmR', 0, 0, -2.6 - Math.sin(t * 8) * 0.2);
      set('fArmL', -0.3); set('fArmR', -0.3);
    }

    // blend towards the target pose
    const k = 1 - Math.exp(-dt * 14);
    for (const [n, r] of Object.entries(tgt)) {
      const cur = this.cur[n] || (this.cur[n] = [0, 0, 0]);
      cur[0] = lerp(cur[0], r[0], k); cur[1] = lerp(cur[1], r[1], k); cur[2] = lerp(cur[2], r[2], k);
      b[n].rotation.set(cur[0], cur[1], cur[2]);
    }
    this.curHipY = lerp(this.curHipY ?? hipY, hipY, k);
    this.curHipZ = lerp(this.curHipZ ?? hipZ, hipZ, k);
    b.hips.position.y = this.curHipY;
    b.hips.position.z = this.curHipZ;
    // blink now and then
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.14; this.blinkT = 2 + Math.random() * 4; }
    if (this.blink > 0) { this.blink -= dt; b.lids.scale.y = 0.02 + Math.sin(Math.max(0, this.blink) / 0.14 * Math.PI) * 0.98; }
    else b.lids.scale.y = 0.02;
  }

  /** a short squash when something lands (like the 2D game) */
  bounce() { this.bounceT = 0.25; }

  dispose() { this.group.removeFromParent(); this.mesh.skeleton.dispose(); }
}
