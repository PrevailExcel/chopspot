// The 3D renderer for the GRA Lounge. It sits on its own canvas *behind* the Phaser canvas,
// so the existing HUD, joystick and pop-ups draw on top of the 3D world unchanged.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** game units (100 per metre, y towards the street) -> three.js metres */
export const U = 0.01;
export const v3 = (x, y, h = 0) => new THREE.Vector3(x * U, h, y * U);

// ---------------------------------------------------------------------------
// Quality tiers. The game picks one from the device, then steps down if frames drop.
export const TIERS = {
  high: { name: 'high', dpr: 2, shadows: true, shadowSize: 2048, bloom: true, points: 4, msaa: true },
  mid: { name: 'mid', dpr: 1.5, shadows: false, shadowSize: 1024, bloom: false, points: 2, msaa: true },
  low: { name: 'low', dpr: 1, shadows: false, shadowSize: 512, bloom: false, points: 0, msaa: false },
};
const ORDER = ['low', 'mid', 'high'];

function userTier() {
  try {
    const q = new URLSearchParams(location.search).get('gfx') || localStorage.getItem('abachop.gfx');
    if (q && TIERS[q]) return q;
  } catch (e) { /* ignore */ }
  return null;
}
function detectTier() {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch (e) { /* ignore */ }
  if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu)) return 'low';
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (!mobile) return mem >= 4 ? 'high' : 'mid';
  if (/Apple/i.test(gpu) || /Adreno \(TM\) (6[5-9]\d|7\d\d|8\d\d)/i.test(gpu) || /Mali-G(7[1-9]|71\d|72\d|9\d\d)/i.test(gpu)) return mem >= 4 ? 'high' : 'mid';
  if (mem >= 6 && cores >= 8) return 'high';
  if (mem >= 3) return 'mid';
  return 'low';
}

let instance = null;
/** one renderer for the whole session; worlds come and go */
export function getView() { if (!instance) instance = new View(); return instance; }

export class View {
  constructor() {
    this.autoTier = detectTier();
    this.locked = !!userTier(); // a quality the player picked is kept
    this.tierName = userTier() || this.autoTier;
    this.tier = TIERS[this.tierName];
    const host = document.getElementById('game') || document.body;
    const canvas = document.createElement('canvas');
    canvas.id = 'game3d';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;z-index:0;opacity:0;transition:opacity .35s';
    host.insertBefore(canvas, host.firstChild);
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: this.tier.msaa, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = this.tier.shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.info.autoReset = false;
    this.renderer = r;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 220);
    this.camMode = 'overview';
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3(10, 20, 30);
    this.camLook = new THREE.Vector3();
    this.shakeT = 0; this.shakeAmt = 0;

    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.fps = { acc: 0, frames: 0, low: 0, cooldown: 6 };
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.newScene();
    this.resize();
  }

  /** fresh scene for a new visit (the old one is disposed) */
  newScene() {
    if (this.scene) disposeTree(this.scene);
    const s = new THREE.Scene();
    s.environment = this.envTex;
    s.environmentIntensity = 0.55;
    s.background = new THREE.Color(0x0d1714);
    this.scene = s;
    this.buildComposer();
    return s;
  }

  buildComposer() {
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (!this.tier.bloom) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, samples: this.tier.msaa ? 4 : 0 });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.5, 1.6);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  }

  setTier(name) {
    if (!TIERS[name] || name === this.tierName) return;
    this.tierName = name; this.tier = TIERS[name];
    this.renderer.shadowMap.enabled = this.tier.shadows;
    this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    this.buildComposer();
    this.resize();
    if (this.onTierChange) this.onTierChange(this.tier);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.tier.dpr * (this.dprScale || 1)));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.composer.setSize(w, h);
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      if (this.bloom) this.bloom.resolution.set(size.x, size.y);
    }
  }

  show(on) {
    const c = this.canvas;
    if (on) { c.style.display = 'block'; requestAnimationFrame(() => { c.style.opacity = '1'; }); document.body.style.background = '#0d1714'; }
    else { c.style.opacity = '0'; setTimeout(() => { if (c.style.opacity === '0') c.style.display = 'none'; }, 360); document.body.style.background = ''; }
  }
  fadeOut(cb) { this.canvas.style.opacity = '0'; setTimeout(cb, 330); }

  // ---------------- camera ----------------
  // The camera orbits whatever it follows: yaw turns around, pitch tilts, zoom moves in and out.
  // In explore mode it follows a free focus point the player can pan around the whole site.
  orbitState() {
    if (!this.orbit) this.orbit = { yaw: 0, pitch: null, zoom: 1, tYaw: 0, tPitch: null, tZoom: 1 };
    return this.orbit;
  }
  /** how much floor (metres) should fit across the screen */
  viewWidth() { return this.camMode === 'close' ? 5.2 : 8.4; }
  defaultPitch() { return THREE.MathUtils.degToRad(this.camMode === 'close' ? 34 : 52); }
  cameraOffset() {
    const o = this.orbitState();
    const aspect = this.camera.aspect;
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfovTan = Math.tan(vfov / 2) * aspect;
    let dist = (this.viewWidth() / 2) / Math.max(0.05, hfovTan);
    dist = THREE.MathUtils.clamp(dist, this.camMode === 'close' ? 6 : 9, this.camMode === 'close' ? 13 : 24) * o.zoom;
    const pitch = o.pitch ?? this.defaultPitch();
    return new THREE.Vector3(Math.sin(o.yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(o.yaw) * Math.cos(pitch) * dist);
  }
  /** player input (screen right / screen down) -> direction on the floor */
  groundDir(ix, iy) {
    const y = this.orbitState().yaw;
    const fx = -Math.sin(y), fz = -Math.cos(y);   // screen up
    const rx = Math.cos(y), rz = -Math.sin(y);    // screen right
    return { x: rx * ix - fx * iy, z: rz * ix - fz * iy };
  }
  rotate(dYaw, dPitch = 0) {
    const o = this.orbitState();
    o.tYaw += dYaw;
    const p = (o.tPitch ?? this.defaultPitch()) + dPitch;
    o.tPitch = THREE.MathUtils.clamp(p, THREE.MathUtils.degToRad(16), THREE.MathUtils.degToRad(84));
  }
  zoomBy(f) {
    const o = this.orbitState();
    o.tZoom = THREE.MathUtils.clamp(o.tZoom * f, this.exploring ? 0.35 : 0.45, this.exploring ? 3.2 : 1.6);
  }
  resetOrbit() { const o = this.orbitState(); o.tYaw = Math.round(o.tYaw / (Math.PI * 2)) * Math.PI * 2; o.tPitch = null; o.tZoom = 1; }
  setExplore(on, from) {
    this.exploring = on;
    if (on) { this.focus = from.clone(); this.orbitState().tZoom = Math.max(this.orbit.tZoom, 1.5); }
    else { this.resetOrbit(); }
  }
  pan(dx, dy) {
    if (!this.focus) return;
    const d = this.groundDir(dx, dy);
    const k = 0.012 * this.orbitState().zoom * (this.camMode === 'close' ? 0.7 : 1);
    this.focus.x = THREE.MathUtils.clamp(this.focus.x - d.x * k, -6, 26);
    this.focus.z = THREE.MathUtils.clamp(this.focus.z - d.z * k, 0, 30);
  }
  follow(target, dt, snap = false) {
    const o = this.orbitState();
    const ke = snap ? 1 : 1 - Math.exp(-dt * 8);
    o.yaw += (o.tYaw - o.yaw) * ke;
    const tp = o.tPitch ?? this.defaultPitch(); const cp = o.pitch ?? this.defaultPitch();
    o.pitch = cp + (tp - cp) * ke; if (o.tPitch == null && Math.abs(tp - o.pitch) < 0.002) o.pitch = null;
    o.zoom += (o.tZoom - o.zoom) * ke;
    const t = this.exploring && this.focus ? this.focus : target;
    this.camTarget.copy(t);
    const back = this.camMode === 'close' ? -0.4 : -0.9;
    const look = t.clone().add(new THREE.Vector3(Math.sin(o.yaw) * back, this.camMode === 'close' ? 1.1 : 0.6, Math.cos(o.yaw) * back));
    const pos = look.clone().add(this.cameraOffset());
    if (pos.y < 0.6) pos.y = 0.6;
    const k = snap ? 1 : 1 - Math.exp(-dt * 5);
    this.camPos.lerp(pos, k); this.camLook.lerp(look, k);
    this.applyCamera(dt);
  }
  /** cinematic: fly between two shots */
  setShot(pos, look) { this.camPos.copy(pos); this.camLook.copy(look); this.applyCamera(0); }
  applyCamera(dt) {
    this.camera.position.copy(this.camPos);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmt * Math.max(0, this.shakeT) * 4;
      this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a;
    }
    this.camera.lookAt(this.camLook);
  }
  shake(ms, amt) { this.shakeT = ms / 1000; this.shakeAmt = amt * 30; }

  // ---------------- helpers ----------------
  /** world point -> CSS pixel position on screen */
  project(p) {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, behind: v.z > 1 };
  }
  /** where a screen point lands on the floor (metres), or null */
  groundPoint(cssX, cssY) {
    const ndc = new THREE.Vector2(cssX / window.innerWidth * 2 - 1, -(cssY / window.innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit) ? hit : null;
  }
  raycast(cssX, cssY, objects) {
    const ndc = new THREE.Vector2(cssX / window.innerWidth * 2 - 1, -(cssY / window.innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera);
    return rc.intersectObjects(objects, true)[0] || null;
  }

  render(dt) {
    this.renderer.info.reset();
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this.watchFps(dt);
  }

  /** step quality down if the phone can't keep up */
  watchFps(dt) {
    if (this.locked) return;
    const f = this.fps;
    if (f.cooldown > 0) { f.cooldown -= dt; return; }
    f.acc += dt; f.frames++;
    if (f.acc < 2) return;
    const fps = f.frames / f.acc;
    f.acc = 0; f.frames = 0;
    this.lastFps = fps;
    if (fps < 38) f.low++; else f.low = 0;
    if (f.low >= 2) {
      f.low = 0; f.cooldown = 5;
      const i = ORDER.indexOf(this.tierName);
      if (i > 0) this.setTier(ORDER[i - 1]);
      else if ((this.dprScale || 1) > 0.65) { this.dprScale = (this.dprScale || 1) * 0.85; this.resize(); }
    }
  }

  info() {
    const i = this.renderer.info;
    return { tier: this.tierName, calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, fps: this.lastFps };
  }
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => {
      if (m.userData && m.userData.shared) return;
      for (const k of ['map', 'emissiveMap', 'roughnessMap', 'normalMap', 'alphaMap', 'lightMap']) if (m[k] && !m[k].userData.shared) m[k].dispose();
      m.dispose();
    });
  });
  while (root.children.length) root.remove(root.children[0]);
}
