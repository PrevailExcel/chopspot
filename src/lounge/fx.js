// Cheap particle effects for the GRA Lounge: steam off pots and plates, grill flames, sink splashes
// and sparkles. Two point clouds (one soft, one glowing) hold every particle: two draw calls in all.
import * as THREE from 'three';

const U = 0.01;

function discTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.userData.shared = true; return t;
}

const VERT = `attribute float aSize; attribute vec4 aColor; uniform float uScale; varying vec4 vColor;
  void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`;
const FRAG = `uniform sampler2D uMap; varying vec4 vColor;
  void main(){ float a = texture2D(uMap, gl_PointCoord).a * vColor.a; if (a < 0.01) discard; gl_FragColor = vec4(vColor.rgb, a); }`;

class Cloud {
  constructor(parent, cap, additive, map) {
    this.cap = cap; this.n = 0; this.parts = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3); this.size = new Float32Array(cap); this.col = new Float32Array(cap * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: { value: 400 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 12;
    this.geo = g;
    parent.add(this.points);
  }
  spawn(p) { if (this.parts.length < this.cap) this.parts.push(p); }
  update(dt) {
    let i = 0;
    for (const p of this.parts) {
      p.age += dt;
      const k = p.age / p.life;
      p.vy -= (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.drag) { const f = 1 - p.drag * dt; p.vx *= f; p.vz *= f; }
      if (p.floor && p.y < p.floor) { p.y = p.floor; p.vy = 0; }
      const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.size[i] = p.s0 + (p.s1 - p.s0) * k;
      this.col[i * 4] = p.r; this.col[i * 4 + 1] = p.gg; this.col[i * 4 + 2] = p.b; this.col[i * 4 + 3] = p.a * Math.max(0, fade);
      i++;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
    this.geo.setDrawRange(0, i);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aSize.needsUpdate = true; this.geo.attributes.aColor.needsUpdate = true;
  }
}

const KINDS = {
  steam: { soft: true, life: [1.6, 2.4], v: [0.05, 0.32, 0.05], s: [0.08, 0.34], col: [1, 1, 1], a: 0.22, drag: 0.4 },
  smoke: { soft: true, life: [2.2, 3.2], v: [0.06, 0.4, 0.06], s: [0.12, 0.5], col: [0.55, 0.55, 0.58], a: 0.18, drag: 0.3 },
  fire: { soft: false, life: [0.35, 0.6], v: [0.08, 0.55, 0.08], s: [0.11, 0.02], col: [1.0, 0.45, 0.12], a: 0.9 },
  flame: { soft: false, life: [0.18, 0.32], v: [0.01, 0.14, 0.01], s: [0.05, 0.012], col: [1.0, 0.62, 0.22], a: 0.85 },
  ember: { soft: false, life: [0.6, 1.1], v: [0.25, 0.9, 0.25], s: [0.03, 0.01], col: [1.0, 0.7, 0.3], a: 1 },
  splash: { soft: false, life: [0.35, 0.6], v: [0.7, 1.4, 0.7], s: [0.045, 0.02], col: [0.55, 0.85, 1.0], a: 0.9, g: 6 },
  bubble: { soft: true, life: [0.6, 1.0], v: [0.15, 0.35, 0.15], s: [0.03, 0.07], col: [0.9, 0.97, 1.0], a: 0.7 },
  sparkle: { soft: false, life: [0.5, 0.9], v: [0.6, 1.1, 0.6], s: [0.09, 0.0], col: [1.0, 0.85, 0.35], a: 1, g: 2 },
};

export class Fx {
  constructor(ctx) {
    this.ctx = ctx;
    const map = discTexture();
    this.soft = new Cloud(ctx.root, 700, false, map);
    this.glow = new Cloud(ctx.root, 500, true, map);
    this.emitters = [];
    this.scale = ctx.view.tier.name === 'low' ? 0.5 : 1;
  }
  /** one particle of `kind` at a point in metres */
  puff(kind, x, y, z, mul = 1) {
    const K = KINDS[kind]; const r = Math.random;
    const life = K.life[0] + r() * (K.life[1] - K.life[0]);
    const p = {
      x: x + (r() - 0.5) * 0.06, y, z: z + (r() - 0.5) * 0.06,
      vx: (r() - 0.5) * 2 * K.v[0], vy: K.v[1] * (0.6 + r() * 0.8), vz: (r() - 0.5) * 2 * K.v[2],
      s0: K.s[0] * mul, s1: K.s[1] * mul, r: K.col[0], gg: K.col[1], b: K.col[2], a: K.a, age: 0, life, g: K.g || 0, drag: K.drag || 0, floor: K.g ? 0.02 : null,
    };
    (K.soft ? this.soft : this.glow).spawn(p);
  }
  /** game-unit helper (x, y on the floor; z height in cm) */
  burst(kind, gx, gy, gz, n = 10, mul = 1) { for (let i = 0; i < n * this.scale; i++) this.puff(kind, gx * U, gz * U, gy * U, mul); }
  /** keep making particles; `on()` says whether it runs right now */
  emitter(kind, gx, gy, gz, rate, on = () => true, opts = {}) {
    const e = { kind, x: gx * U, y: gz * U, z: gy * U, rate, on, acc: Math.random(), spread: opts.spread || 0, mul: opts.mul || 1 };
    this.emitters.push(e); return e;
  }
  remove(e) { this.emitters = this.emitters.filter((x) => x !== e); }
  update(dt) {
    const cam = this.ctx.view.camera; const r = this.ctx.view.renderer;
    const h = r.domElement.height;
    const sc = h / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    this.soft.mat.uniforms.uScale.value = sc; this.glow.mat.uniforms.uScale.value = sc;
    for (const e of this.emitters) {
      if (!e.on()) continue;
      e.acc += dt * e.rate * this.scale;
      while (e.acc >= 1) { e.acc -= 1; this.puff(e.kind, e.x + (Math.random() - 0.5) * e.spread, e.y, e.z + (Math.random() - 0.5) * e.spread * 0.5, e.mul); }
    }
    this.soft.update(dt); this.glow.update(dt);
  }
}
