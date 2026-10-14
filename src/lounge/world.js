// The whole GRA Lounge site: street, compound, facade, dining room, bar, kitchen and stage.
// Positions in the game are in units (100 per metre, y towards the street); here everything is metres.
import * as THREE from 'three';
import { Kit, mats, texMat, textures, textCanvas, canvasToTexture } from './kit.js';
import * as P from './props.js';
import { PAL, mulberry } from './props.js';
import { LOUNGE } from '../config.js';
import { Person, randomLook, staffLook } from './person.js';

const U = 0.01;
const SERIF = '"Playfair Display", Georgia, serif';

// ---------------------------------------------------------------------------
// time of day: keyframes by hour
const SKY = [
  // hour, skyTop, horizon, sunColour, sunIntensity, sunElev, hemi, night, exposure
  [0, '#060a18', '#141c34', '#9fb4ff', 0.35, 0.9, 0.25, 1.0, 1.1],
  [5, '#0a1028', '#2a2a48', '#9fb4ff', 0.35, 0.5, 0.3, 1.0, 1.1],
  [6.3, '#3a5a8a', '#f2a07a', '#ffb488', 1.4, 0.15, 0.55, 0.45, 1.05],
  [8, '#5a9ad8', '#cfe4f2', '#fff4e4', 2.6, 0.7, 0.85, 0.0, 1.0],
  [16, '#5a9ad8', '#d8e8f2', '#fff0dc', 2.6, 0.75, 0.85, 0.0, 1.0],
  [17.6, '#46679e', '#ffbd84', '#ffb070', 2.1, 0.3, 0.7, 0.25, 1.02],
  [18.6, '#24305e', '#e2784e', '#ff8a50', 1.0, 0.1, 0.45, 0.6, 1.06],
  [19.6, '#0c1430', '#3a2c4a', '#9fb4ff', 0.4, 0.6, 0.3, 0.95, 1.1],
  [24, '#060a18', '#141c34', '#9fb4ff', 0.35, 0.9, 0.25, 1.0, 1.1],
];
const _ca = new THREE.Color(), _cb = new THREE.Color();
function sampleSky(h) {
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1];
  const t = THREE.MathUtils.clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  const col = (k) => _ca.set(a[k]).clone().lerp(_cb.set(b[k]), t);
  const num = (k) => a[k] + (b[k] - a[k]) * t;
  return { top: col(1), horizon: col(2), sun: col(3), sunI: num(4), elev: num(5), hemi: num(6), night: num(7), exposure: num(8) };
}

export class World {
  constructor(view, { ownerTitle = () => "ADA'S" } = {}) {
    this.view = view;
    this.scene = view.scene;
    this.tier = view.tier;
    this.ownerTitle = ownerTitle;
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.colliders = [];
    this.updaters = [];
    this.signs = [];
    this.adScreens = [];
    this.hour = 17.4;
    this.inside = false; this.cut = 0;
    this.buildLights();
    this.buildPools();
    this.buildSky();
    this.buildGround();
    this.buildBuilding();
    this.buildInteriorStatic();
    this.buildOutside();
    this.buildTraffic();
    this.buildPedestrians();
    this.setTime(this.hour, true);
    // repaint signs once the display font has arrived (first visit on a slow connection)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this.root.parent) this.refreshSigns(); });
  }

  // ---------------- helpers ----------------
  col(x1, y1, x2, y2) { this.colliders.push({ x1, x2, y1, y2 }); }
  kit() { return new Kit(); }
  done(kit, parent = this.root, opts = {}) { return kit.build(parent, { shadows: this.tier.shadows, ...opts }); }

  // ---------------- lights ----------------
  buildLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xfff1dc, 0x3a2a20, 0.6);
    s.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = this.tier.shadows;
    sun.shadow.mapSize.set(this.tier.shadowSize, this.tier.shadowSize);
    const sc = sun.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    s.add(sun); s.add(sun.target);
    this.sun = sun;
    // a few real warm lights inside; the rest of the glow is painted light pools (cheap)
    const spots = [[10, 2.6, 10.6], [16.6, 2.5, 6.2], [3.2, 2.7, 8.2], [10, 2.7, 14.6]].slice(0, this.tier.points);
    this.points = spots.map(([x, y, z]) => { const l = new THREE.PointLight(0xffc68a, 6, 10, 2); l.position.set(x, y, z); s.add(l); return l; });
  }

  buildPools() {
    // additive floor glows under lamps and soft contact shadows under furniture: both instanced
    const geom = new THREE.PlaneGeometry(1, 1); geom.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ map: textures.glowDisc(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.6 });
    this.pools = new THREE.InstancedMesh(geom, glowMat, 200); this.pools.count = 0; this.pools.renderOrder = 3; this.pools.frustumCulled = false;
    this.pools.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(200 * 3), 3);
    const shMat = new THREE.MeshBasicMaterial({ map: textures.softShadow(), transparent: true, depthWrite: false, opacity: 0.55, color: 0x000000 });
    this.shadows = new THREE.InstancedMesh(geom, shMat, 260); this.shadows.count = 0; this.shadows.renderOrder = 1; this.shadows.frustumCulled = false;
    this.root.add(this.pools, this.shadows);
    this._m4 = new THREE.Matrix4(); this._c = new THREE.Color();
  }
  pool(x, z, r, color = 0xffc488, k = 1, y = 0.012) {
    const i = this.pools.count++;
    this._m4.makeScale(r * 2, 1, r * 2).setPosition(x, y, z);
    this.pools.setMatrixAt(i, this._m4);
    this.pools.setColorAt(i, this._c.set(color).multiplyScalar(k));
    this.pools.instanceMatrix.needsUpdate = true; this.pools.instanceColor.needsUpdate = true;
    return i;
  }
  shadow(x, z, rx, rz = rx, y = 0.008) {
    const i = this.shadows.count++;
    this._m4.makeScale(rx * 2, 1, rz * 2).setPosition(x, y, z);
    this.shadows.setMatrixAt(i, this._m4);
    this.shadows.instanceMatrix.needsUpdate = true;
    return i;
  }

  buildSky() {
    const g = new THREE.SphereGeometry(160, 24, 12);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
    });
    this.sky = new THREE.Mesh(g, this.skyMat); this.sky.position.set(10, -10, 14); this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    const n = 260, pos = new Float32Array(n * 3); const r = mulberry(5);
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.15 + r() * 1.2; pos[i * 3] = 10 + Math.cos(a) * Math.cos(e) * 150; pos[i * 3 + 1] = Math.sin(e) * 150 - 10; pos[i * 3 + 2] = 14 + Math.sin(a) * Math.cos(e) * 150; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.scene.add(new THREE.Points(sg, this.starMat));
    this.scene.fog = new THREE.Fog(0x141c34, 30, 95);
  }

  // ---------------- ground ----------------
  plane(w, d, x, z, mat, y = 0, receive = true) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = receive;
    this.root.add(m); return m;
  }
  buildGround() {
    // lawn everywhere, then hard surfaces on top
    this.plane(140, 120, 10, 14, texMat('grass', 60, 52, { roughness: 0.95 }), -0.01);
    this.plane(19, 3.75, 10, 17.8, texMat('pavers', 13, 2.6, { roughness: 0.75 }), 0.005);           // forecourt
    this.plane(120, 0.9, 10, 20.05, texMat('concrete', 60, 0.45, { roughness: 0.9 }), 0.012);         // sidewalk
    this.plane(120, 7.0, 10, 24.1, texMat('asphalt', 30, 2, { roughness: 0.92 }), 0.006);             // road
    this.plane(120, 1.2, 10, 28.2, texMat('concrete', 60, 0.6, { roughness: 0.9 }), 0.012);
    const k = this.kit();
    for (let x = -50; x < 70; x += 4) k.box(2.0, 0.01, 0.14, [x, 0.02, 24.1], '#f2efe6', 'matte');      // lane dashes
    k.box(120, 0.12, 0.18, [10, 0.06, 20.55], '#c9c3b6', 'satin');                                      // kerbs
    k.box(120, 0.12, 0.18, [10, 0.06, 27.65], '#c9c3b6', 'satin');
    this.done(k, this.root, { shadows: false });
    // interior floors
    this.plane(18, 10.0, 10, 11.0, texMat('oak', 12.5, 6.95, { roughness: 0.32, envMapIntensity: 0.9 }), 0.02);
    this.plane(4.4, 4.4, 16.8, 3.9, texMat('oak', 3, 3, { roughness: 0.32 }), 0.019);
    this.plane(13.2, 3.6, 7.6, 3.85, texMat('kitchenTile', 26, 7, { roughness: 0.5 }), 0.018);
  }

  // ---------------- the building ----------------
  wall(k, x1, z1, x2, z2, { inner = true, h = 3.4, outer = null } = {}) {
    const len = Math.hypot(x2 - x1, z2 - z1); const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const rot = Math.atan2(-(z2 - z1), x2 - x1);
    k.frame(cx, 0, cz, rot, () => {
      if (inner) {
        k.box(len, 1.1, 0.2, [0, 0.55, 0], PAL.walnut, 'satin');
        k.box(len, 0.04, 0.24, [0, 1.12, 0], PAL.brass, 'metal');
        k.box(len, h - 1.14, 0.2, [0, 1.14 + (h - 1.14) / 2, 0], PAL.emerald, 'matte');
        k.box(len, 0.08, 0.24, [0, h - 0.04, 0], '#e9e1d2', 'satin');
      } else k.box(len, h, 0.2, [0, h / 2, 0], outer || PAL.wall, 'matte');
    });
  }

  buildBuilding() {
    // each outer wall is its own group so it can cut away when the camera looks through it
    const group = () => { const g = new THREE.Group(); this.root.add(g); return g; };
    this.wallN = group(); this.wallW = group(); this.wallE = group();
    const kn = this.kit();
    kn.box(13.4, 3.4, 0.2, [7.6, 1.7, 1.95], '#1a2a24', 'satin');
    this.wall(kn, 14.2, 1.95, 19.1, 1.95);
    kn.box(18.4, 4.2, 0.06, [10, 2.1, 1.82], PAL.wall, 'matte');
    this.done(kn, this.wallN);
    const kw = this.kit(); this.wall(kw, 0.95, 1.95, 0.95, 16.0); kw.box(0.06, 4.2, 14.1, [0.82, 2.1, 9.0], PAL.wall, 'matte'); this.done(kw, this.wallW);
    const ke = this.kit(); this.wall(ke, 19.05, 1.95, 19.05, 16.0); ke.box(0.06, 4.2, 14.1, [19.18, 2.1, 9.0], PAL.wall, 'matte'); this.done(ke, this.wallE);
    const k = this.kit();
    k.box(0.2, 3.4, 4.2, [14.3, 1.7, 4.0], PAL.walnutDark, 'satin'); // kitchen | bar divider
    this.done(k);
    // kitchen back wall tiles
    const tiles = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 3.3), texMat('subwayGreen', 16, 5, { roughness: 0.18, envMapIntensity: 1.2 }));
    tiles.position.set(7.6, 1.68, 2.06); this.wallN.add(tiles);
    this.wallCut = { N: 0, W: 0, E: 0 };
    this.col(80, 180, 100, 1610); this.col(1900, 180, 1920, 1610); this.col(80, 175, 1920, 200);
    this.col(45, 80, 75, 1970); this.col(1925, 80, 1955, 1970); this.col(45, 80, 1955, 110); // compound walls

    // facade (cut away when you walk inside so you can see)
    const f = new THREE.Group(); this.facade = f; this.root.add(f);
    const fk = this.kit();
    const segs = [[0.85, 2.0], [4.2, 5.2], [8.0, 9.2], [10.8, 12.0], [14.8, 15.8], [18.0, 19.15]];
    segs.forEach(([a, b]) => fk.box(b - a, 4.2, 0.3, [(a + b) / 2, 2.1, 16.0], PAL.wall, 'matte'));
    fk.box(18.3, 0.9, 0.3, [10, 3.75, 16.0], PAL.wall, 'matte');
    fk.box(18.5, 0.12, 0.42, [10, 4.25, 16.0], PAL.charcoal, 'satin');
    fk.box(18.3, 0.5, 0.32, [10, 0.25, 16.0], '#d6cebd', 'matte');
    const glassSpans = [[2.0, 4.2], [5.2, 8.0], [12.0, 14.8], [15.8, 18.0]];
    glassSpans.forEach(([a, b]) => {
      fk.box(b - a, 2.8, 0.04, [(a + b) / 2, 1.9, 16.02], '#9fbfcc', 'glass');
      fk.box(b - a, 0.06, 0.1, [(a + b) / 2, 3.3, 16.02], PAL.black, 'metal');
      fk.box(b - a, 0.06, 0.1, [(a + b) / 2, 0.5, 16.02], PAL.black, 'metal');
      for (let x = a; x <= b + 0.01; x += (b - a) / 2) fk.box(0.06, 2.8, 0.1, [x, 1.9, 16.02], PAL.black, 'metal');
    });
    // door frame (the doors themselves slide open)
    fk.box(1.7, 0.12, 0.34, [10, 3.3, 16.0], PAL.black, 'metal');
    this.done(fk, f);
    this.facadeParts = f;
    this.doors = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(10 + s * 0.4, 0, 16.0); g.scale.x = -s;
      const dk = this.kit();
      dk.box(0.78, 2.7, 0.05, [0, 1.35, 0], '#9fbfcc', 'glass');
      dk.box(0.06, 2.7, 0.07, [-0.37, 1.35, 0], PAL.brass, 'metal');
      dk.box(0.03, 0.6, 0.06, [0.3, 1.2, 0.04], PAL.brass, 'metal');
      dk.build(g, { shadows: false }); f.add(g); return g;
    });
    this.doorOpen = 0;
    [[100, 1590, 920, 1612], [1080, 1590, 1900, 1612]].forEach((r) => this.col(...r));

    // canopy and name over the door
    const ck = this.kit(); P.canopy(ck, 10, 16.0, 3.6);
    this.tall = new THREE.Group(); f.add(this.tall);
    this.done(ck, this.tall);
    const sk = this.kit(); sk.box(6.2, 1.15, 0.08, [10, 3.72, 16.13], '#121316', 'satin'); sk.box(6.3, 0.04, 0.1, [10, 4.3, 16.14], PAL.brass, 'metal'); sk.box(6.3, 0.04, 0.1, [10, 3.14, 16.14], PAL.brass, 'metal'); this.done(sk, this.tall);
    this.facadeSign = this.signPlane(5.6, 1.0, [10, 3.72, 16.22], 0, () => this.ownerTitle(), { size: 150, sub: 'RESTAURANT · LOUNGE' }, this.tall);
    // ad screen on the facade, facing the street
    this.adScreen(3.2, 1.5, [16.9, 2.55, 16.18], 0, 'gra-facade', this.tall);
  }

  /** a gold name sign; `text()` re-reads the player's name when it changes */
  signPlane(w, h, pos, rotY, text, { size = 140, sub = null, color = '#e7c97a' } = {}, parent = this.root) {
    const fit = (str, px) => {
      const m = document.createElement('canvas').getContext('2d');
      let f = px; m.font = `700 ${f}px ${SERIF}`;
      while (f > 40 && m.measureText(str).width > 960) { f -= 6; m.font = `700 ${f}px ${SERIF}`; }
      return f;
    };
    const make = () => {
      const str = text();
      const c = textCanvas([
        { text: str, font: `700 ${fit(str, size)}px ${SERIF}`, color, glow: 'rgba(255,200,110,0.55)', y: sub ? 120 : 128 },
        ...(sub ? [{ text: sub, font: `600 44px ${SERIF}`, color: '#efe6d4', y: 214 }] : []),
      ], { w: 1024, h: 256 });
      return canvasToTexture(c);
    };
    const mat = new THREE.MeshBasicMaterial({ map: make(), transparent: true, depthWrite: false, toneMapped: true });
    mat.color.setScalar(1.6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos); m.rotation.y = rotY; m.renderOrder = 4;
    parent.add(m);
    this.signs.push(() => { mat.map.dispose(); mat.map = make(); mat.needsUpdate = true; });
    return m;
  }
  refreshSigns() { this.signs.forEach((f) => f()); }

  adScreen(w, h, pos, rotY, slotId, parent = this.root) {
    const k = this.kit();
    k.box(w + 0.16, h + 0.16, 0.1, [0, 0, -0.06], PAL.black, 'metal');
    const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; parent.add(g);
    k.build(g, { shadows: false });
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    face.position.z = 0.0; g.add(face);
    this.adScreens.push({ face, mat, slotId, w, h });
    return face;
  }

  buildInteriorStatic() {
    // pass, dish return and the kitchen line behind it
    const k2 = this.kit();
    k2.frame(7.25, 0, 5.75, 0, () => P.pass(k2, 11.9));
    this.col(100, 540, 1420, 605);
    k2.frame(13.7, 0, 5.75, 0, () => P.dishReturn(k2));
    k2.box(12.8, 0.9, 0.6, [7.6, 0.45, 2.35], '#202326', 'metal');
    k2.box(12.8, 0.05, 0.64, [7.6, 0.93, 2.35], PAL.marble, 'gloss');
    for (let i = 0; i < 8; i++) k2.cyl(0.1, 0.22, [2 + i * 1.5, 1.07, 2.3], PAL.steel, 'metal', 12);
    for (let i = 0; i < 5; i++) { k2.box(2.2, 0.04, 0.32, [2.2 + i * 2.6, 1.95, 2.14], PAL.walnut, 'satin'); k2.box(2.1, 0.015, 0.02, [2.2 + i * 2.6, 1.925, 2.26], PAL.bulb, 'glow'); }
    // copper pans on a rail
    k2.cyl(0.015, 12.4, [7.6, 2.55, 2.2], PAL.brass, 'metal', 8, [0, 0, Math.PI / 2]);
    for (let i = 0; i < 16; i++) { const x = 1.8 + i * 0.78; k2.cyl(0.006, 0.18, [x, 2.45, 2.2], PAL.brass, 'metal', 4); k2.cyl(0.12 + (i % 3) * 0.03, 0.03, [x, 2.25 - (i % 3) * 0.04, 2.24], '#b8643c', 'metal', 14, [Math.PI / 2, 0, 0]); }
    this.col(1420, 200, 1440, 610);
    // the kitchen sign
    this.signPlane(3.6, 0.66, [7.6, 2.95, 2.1], 0, () => `${this.ownerTitle()} KITCHEN`, { size: 120, color: '#e7c97a' }, this.wallN);
    // host stand, cashier, the till and decor near the door
    const H = LOUNGE.host, T = LOUNGE.till;
    k2.frame(H.x * U, 0, H.y * U, Math.PI, () => P.hostStand(k2));
    k2.frame(T.x * U, 0, T.y * U + 0.05, Math.PI, () => P.cashier(k2));
    this.col(H.x - 32, H.y - 22, H.x + 32, H.y + 22);
    this.col(T.x - 50, T.y - 28, T.x + 50, T.y + 28);
    // plants and sconces
    [[1.5, 15.4], [8.6, 15.45], [11.5, 15.45], [18.5, 15.4], [14.1, 6.6], [1.5, 6.6]].forEach(([x, z]) => { P.plant(k2, x, z, 1.05, 'fig'); this.col(x * 100 - 25, z * 100 - 25, x * 100 + 25, z * 100 + 25); this.shadow(x, z, 0.4); });
    for (const z of [7.4, 10.4, 12.8, 15.0]) P.sconce(k2, 1.08, 2.15, z, Math.PI / 2);
    for (const z of [11.2, 13.6]) P.sconce(k2, 18.92, 2.15, z, -Math.PI / 2);
    // rugs
    k2.box(3.2, 0.012, 2.4, [10, 0.028, 13.6], '#6b2a2a', 'velvet');
    k2.box(3.0, 0.014, 2.2, [10, 0.03, 13.6], '#8a3a2e', 'velvet');
    this.done(k2);
    this.pool(H.x * U, H.y * U, 1.2, 0xffd29a, 0.7);
    for (const z of [7.4, 10.4, 12.8, 15.0]) this.pool(1.4, z, 1.0, 0xffc488, 0.55);
    for (const z of [11.2, 13.6]) this.pool(18.6, z, 1.0, 0xffc488, 0.55);
    for (let x = 1.6; x < 13.5; x += 1.1) this.pool(x, 6.15, 0.75, 0xff9a4a, 0.5);
    for (let x = 2.2; x < 13.5; x += 2.6) this.pool(x, 2.5, 1.3, 0xffd29a, 0.45, 0.94);
    // wall-base shadows (soft ambient occlusion)
    for (const [x, z, w, d] of [[10, 6.25, 18, 0.5], [1.2, 11, 0.5, 10], [18.8, 9, 0.5, 14]]) this.shadow(x, z, w / 2, d / 2);
    // bar (always there; it becomes usable when unlocked)
    this.buildBarShell();
    // kitchen staff appear with each station; a dishwasher is always there
  }

  buildBarShell() {
    const k = this.kit(); const r = mulberry(4);
    k.frame(18.75, 0, 5.4, Math.PI / 2, () => P.backBar(k, 6.2, r));
    k.frame(16.6, 1.0, 2.05, 0, () => k.box(3.6, 0.04, 0.04, [0, 0, 0], PAL.brass, 'metal'));
    this.done(k);
    this.pool(17.6, 5.4, 2.2, 0xffb466, 0.55);
    this.adScreen(2.4, 1.15, [16.6, 2.55, 2.08], 0, 'gra-bar', this.wallN);
  }

  /** the bar counter and stools (unlock "bar") */
  buildBar(ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit();
    k.frame(15.7, 0, 5.8, 0, () => P.barCounter(k, 6.4));
    k.frame(17.25, 0, 9.0, Math.PI / 2, () => P.barCounter(k, 3.1));
    for (let i = 0; i < 6; i++) P.barStool(k, 15.05, 3.2 + i * 1.0);
    for (let i = 0; i < 4; i++) P.pendant(k, 15.7, 3.4 + i * 1.6, 2.3, PAL.black);
    k.build(g, { shadows: this.tier.shadows, ghost });
    if (!ghost) {
      this.col(1539, 260, 1601, 905); this.col(1539, 870, 1900, 930);
      for (let i = 0; i < 4; i++) this.pool(15.6, 3.4 + i * 1.6, 0.8, 0xffc488, 0.6);
      this.shadow(15.7, 5.8, 0.5, 3.3);
    }
    return g;
  }

  /** dining table of any kind; returns seat positions in game units */
  buildTable(def, ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit();
    const x = def.x * U, z = def.y * U;
    let seats = [];
    const velvet = [PAL.velvetRust, PAL.velvetBlush, PAL.velvetGreen][(def.id.charCodeAt(1) || 0) % 3];
    k.frame(x, 0, z, 0, () => {
      if (def.kind === 'square') seats = P.table4(k, velvet);
      else if (def.kind === 'round') seats = P.table2(k, velvet);
      else if (def.kind === 'booth') seats = P.booth(k);
      else if (def.kind === 'terrace') seats = P.terraceTable(k);
      else if (def.kind === 'event') seats = P.eventTable(k);
    });
    if (def.kind !== 'terrace') {
      if (def.kind === 'event') { for (const zz of [-0.9, 0.9]) P.pendant(k, x, z + zz, 2.3); }
      else P.pendant(k, x, z, def.kind === 'booth' ? 2.0 : 2.15, def.kind === 'booth' ? PAL.black : PAL.brass);
    }
    k.build(g, { shadows: this.tier.shadows, ghost });
    if (!ghost) {
      if (def.kind === 'terrace') this.pool(x, z, 1.2, 0xffd9a0, 0.4);
      else if (def.kind === 'event') { this.pool(x, z - 0.9, 1.3, 0xffc488, 0.85); this.pool(x, z + 0.9, 1.3, 0xffc488, 0.85); }
      else this.pool(x, z, 1.25, 0xffc488, 0.9);
      if (def.kind === 'event') this.shadow(x, z, 0.9, 2.1); else this.shadow(x, z, def.kind === 'booth' ? 0.9 : 0.75, def.kind === 'booth' ? 1.0 : 0.75);
      const hw = def.kind === 'square' ? 50 : def.kind === 'round' ? 46 : def.kind === 'booth' ? 64 : def.kind === 'event' ? 52 : 44;
      const hd = def.kind === 'booth' ? 100 : def.kind === 'event' ? 170 : hw;
      this.col(def.x - hw, def.y - hd, def.x + hw, def.y + hd);
    }
    return { group: g, seats: seats.map((s) => ({ x: def.x + s.x * 100, y: def.y + s.z * 100, yaw: s.yaw })) };
  }

  /** a kitchen station behind the pass, with its chef */
  buildStation(id, cfg, ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    if (cfg.kind === 'bar') return { group: g, chef: null };
    const k = this.kit();
    k.frame(cfg.x * U, 0, 4.3, 0, () => P.station(k, cfg.kind));
    k.build(g, { shadows: false, ghost });
    let chef = null;
    if (!ghost) {
      chef = new Person(staffLook('chef', id.length * 31 + cfg.x));
      chef.setPosition(cfg.x * U, 0, 3.55); chef.faceTo(0, true); chef.action = 'cook';
      this.root.add(chef.group);
      this.pool(cfg.x * U, 4.6, 1.0, cfg.kind === 'grill' || cfg.kind === 'pizza' ? 0xff7a2a : 0xffd29a, 0.6);
    }
    return { group: g, chef };
  }

  buildStage(ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit();
    const S = LOUNGE.stage; const x = S.x * U, z = S.y * U;
    k.frame(x, 0, z, 0, () => {
      P.stage(k, 3.8, 3.2);
      k.frame(-0.8, 0.33, -0.7, 0.3, () => P.drumKit(k));
      k.frame(1.0, 0.33, -0.3, -0.4, () => P.keyboard(k));
      P.micStand(k, 0.2, 0.9);
      P.amp(k, 1.4, -1.2); P.amp(k, -1.6, -1.3);
      k.box(3.8, 3.0, 0.1, [0, 1.85, -1.62], '#3a2414', 'satin');
      for (let i = 0; i < 16; i++) k.box(0.12, 2.9, 0.06, [-1.8 + i * 0.24, 1.85, -1.56], PAL.walnut, 'satin');
      for (const sx of [-1.2, 0, 1.2]) { k.cyl(0.08, 0.16, [sx, 3.15, 1.3], PAL.black, 'metal', 10, [0.6, 0, 0]); k.sphere(0.05, 0.05, 0.05, [sx, 3.08, 1.38], '#fff0c8', 'glow', 8); }
    });
    k.build(g, { shadows: this.tier.shadows, ghost });
    if (!ghost) {
      this.col(S.x - 190, S.y - 160, S.x + 190, S.y + 160);
      this.pool(x, z + 0.2, 1.9, 0xffb06a, 0.75); this.pool(x - 1.2, z + 0.8, 0.8, 0xffd29a, 0.6); this.pool(x + 1.2, z + 0.8, 0.8, 0xffd29a, 0.6);
      const band = [['bass', 'm', [x - 0.2, z - 0.1], 0.2], ['keys', 'f', [x + 1.0, z - 0.75], 0.2], ['drums', 'm', [x - 0.8, z - 1.15], 0.25]].map(([act, gender, [px, pz], yaw], i) => {
        const p = new Person(staffLook('band', 70 + i * 11, gender));
        p.setPosition(px, 0.33, pz); p.faceTo(yaw, true); p.action = act;
        if (act === 'drums') p.pose = 'sit';
        this.root.add(p.group); return p;
      });
      this.band = band;
    }
    return g;
  }

  buildChandelier(ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit(); P.chandelier(k, 10, 10.6, 2.6);
    k.build(g, { shadows: false, ghost });
    if (!ghost) this.pool(10, 10.6, 2.6, 0xffd9a8, 0.7);
    return g;
  }

  buildArt(ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit();
    const frames = [[11.4, 1.9, 1.3, 1.6], [14.0, 1.9, 1.3, 1.6], [8.6, 2.1, 1.0, 1.2]];
    frames.forEach(([z, y, w, h]) => k.box(0.06, h + 0.12, w + 0.12, [1.1, y, z], PAL.brass, 'metal'));
    k.build(g, { shadows: false, ghost });
    if (!ghost) {
      frames.forEach(([z, y, w, h], i) => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d');
        const r = mulberry(i * 13 + 5);
        x.fillStyle = ['#efe3cc', '#1d2a3a', '#e9d5c0'][i]; x.fillRect(0, 0, 256, 320);
        for (let s = 0; s < 7; s++) { x.fillStyle = ['#c8643c', '#1f5a46', '#d9b26a', '#2c3e66', '#8a2a3a', '#f2ede4'][Math.floor(r() * 6)]; x.beginPath(); if (r() < 0.5) x.arc(r() * 256, r() * 320, 20 + r() * 70, 0, 7); else x.rect(r() * 200, r() * 260, 30 + r() * 120, 30 + r() * 140); x.fill(); }
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: canvasToTexture(c), roughness: 0.8 }));
        m.position.set(1.14, y, z); m.rotation.y = Math.PI / 2; g.add(m);
        this.pool(1.5, z, 0.9, 0xffe2b0, 0.45);
      });
    }
    return g;
  }

  buildFountain(ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit(); P.fountain(k, 3.8, 17.9);
    for (const [x, z] of [[2.0, 16.6], [5.6, 16.6], [2.0, 19.2], [5.6, 19.2]]) P.lantern(k, x, z);
    k.build(g, { shadows: this.tier.shadows, ghost });
    if (!ghost) {
      this.col(230, 1640, 530, 1940);
      this.pool(3.8, 17.9, 2.4, 0x7fd6ff, 0.5);
      // water spray
      const n = 60; const geom = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geom, new THREE.PointsMaterial({ color: 0xcdeeff, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false }));
      g.add(pts);
      const seeds = Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2, t: Math.random() }));
      this.updaters.push((dt) => {
        seeds.forEach((s, i) => {
          s.t = (s.t + dt * 0.7) % 1;
          const r = s.t * 0.6, y = 1.9 + s.t * 0.9 - s.t * s.t * 1.6;
          pos[i * 3] = 3.8 + Math.cos(s.a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = 17.9 + Math.sin(s.a) * r;
        });
        geom.attributes.position.needsUpdate = true;
      });
    }
    return g;
  }

  buildDesk(ghost = false) {
    const g = new THREE.Group(); this.root.add(g);
    const k = this.kit(); const B = LOUNGE.booth;
    k.frame(B.x * U, 0, B.y * U, Math.PI, () => P.conciergeDesk(k));
    k.build(g, { shadows: this.tier.shadows, ghost });
    if (!ghost) { this.col(B.x - 72, B.y - 32, B.x + 72, B.y + 32); this.pool(B.x * U, B.y * U - 0.4, 0.9, 0x8ac8ff, 0.35); }
    return g;
  }

  // ---------------- outside ----------------
  buildOutside() {
    const k = this.kit();
    // compound wall with the gate gap, side walls
    P.fenceWall(k, 0.6, 9.0, 19.65); P.fenceWall(k, 11.0, 19.4, 19.65);
    k.frame(0, 0, 0, 0, () => {
      k.box(0.25, 2.1, 18.7, [0.6, 1.05, 10.3], '#e3dccd', 'matte');
      k.box(0.25, 2.1, 18.7, [19.4, 1.05, 10.3], '#e3dccd', 'matte');
      k.box(18.8, 2.1, 0.25, [10, 1.05, 0.95], '#e3dccd', 'matte');
    });
    for (const x of [9.0, 11.0]) { k.box(0.5, 2.6, 0.5, [x, 1.3, 19.65], '#d6cebd', 'matte'); k.sphere(0.2, 0.2, 0.2, [x, 2.75, 19.65], '#ffe2a8', 'night', 10); }
    this.col(0, 1950, 900, 1985); this.col(1100, 1950, 2000, 1985);
    // gatehouse and pylon sign
    P.gatehouse(k, 13.1, 18.7); this.col(1200, 1790, 1420, 1950);
    k.box(1.3, 3.0, 0.4, [7.9, 1.5, 19.3], '#121316', 'satin');
    k.box(1.36, 0.06, 0.46, [7.9, 3.03, 19.3], PAL.brass, 'metal');
    k.box(1.36, 0.25, 0.46, [7.9, 0.12, 19.3], '#d6cebd', 'matte');
    this.col(720, 1905, 860, 1950);
    this.signPlane(1.2, 0.5, [7.9, 2.55, 19.54], 0, () => this.ownerTitle(), { size: 170 });
    this.signPlane(1.2, 0.32, [7.9, 2.1, 19.54], 0, () => 'GRA · ABA', { size: 130, color: '#efe6d4' });
    // path lanterns and topiary along the walk to the door
    for (let z = 16.8; z < 19.4; z += 1.25) { P.lantern(k, 9.15, z); P.lantern(k, 10.85, z); }
    for (const [x, z] of [[8.7, 16.4], [11.3, 16.4]]) { P.topiary(k, x, z); this.col(x * 100 - 30, z * 100 - 30, x * 100 + 30, z * 100 + 30); }
    // parking with a few cars
    const carCols = ['#111316', '#e9e9ea', '#9aa1a8', '#5a1a24', '#1d2a44'];
    [[15.2, 17.6], [17.6, 17.6]].forEach(([x, z], i) => { P.car(k, x, z, 0.0, carCols[(i * 2) % 5], 11 + i); this.col(x * 100 - 95, z * 100 - 235, x * 100 + 95, z * 100 + 235); this.shadow(x, z, 1.1, 2.5); });
    for (const x of [14.0, 16.4, 18.8]) k.box(0.08, 0.01, 4.6, [x, 0.02, 17.6], '#f2efe6', 'matte');
    // hedges along the compound walls
    P.hedge(k, 3.6, 19.15, 5.2, 0.6, 0.9); P.hedge(k, 0.95, 17.8, 0.5, 3.2, 0.9);
    // the street: palms and lamps on our side, villas across the road and next door
    this.streetPools = [];
    for (const x of [-28, -16, -4, 3.2, 16.8, 28, 40]) { P.streetLamp(k, x, 20.3, 0); this.streetPools.push(this.pool(x, 21.2, 3.2, 0xffcf8a, 0.0)); }
    for (let x = -32; x < 52; x += 8) { if (x > -2 && x < 22) continue; P.palm(k, x, 19.9, 5.5 + (x % 3), x + 40); }
    [[-10, 9, 9, 7], [30, 9, 9, 7], [-10, -4, 8, 7], [30, -3, 8, 7], [4, 34, 10, 8], [20, 34, 9, 8], [-12, 34, 9, 8], [36, 34, 10, 8]].forEach(([x, z, w, d], i) => {
      P.villa(k, x, z, w, d, z > 30 ? Math.PI : (x < 0 ? Math.PI / 2 : -Math.PI / 2), i * 7 + 3);
    });
    for (let x = -30; x < 50; x += 8) P.palm(k, x + 3, 29.2, 5 + ((x + 30) % 4) * 0.5, x * 3 + 7);
    P.fenceWall(k, -40, 60, 29.9);
    // trees behind the building
    for (let x = -6; x < 28; x += 4.5) P.palm(k, x, -1.2, 6 + (x % 2), x * 5 + 2);
    this.done(k);
    // the security guard at the gate
    const guard = new Person(staffLook('security', 4));
    guard.setPosition(11.55, 0, 19.25); guard.faceTo(0.0, true); guard.action = 'guard';
    this.root.add(guard.group); this.guard = guard;
    this.shadow(11.55, 19.25, 0.35);
  }

  // ---------------- life on the street ----------------
  buildTraffic() {
    this.cars = [];
    this.carTimer = 1;
    this.carPool = ['#111316', '#e9e9ea', '#9aa1a8', '#5a1a24', '#1d2a44', '#2a4a3a', '#c9a24a'];
  }
  spawnCar() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const g = new THREE.Group();
    const k = this.kit(); P.car(k, 0, 0, dir > 0 ? Math.PI / 2 : -Math.PI / 2, this.carPool[Math.floor(Math.random() * this.carPool.length)], Math.floor(Math.random() * 1000));
    k.build(g, { shadows: false });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: textures.glowDisc(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1cc, opacity: 0 }));
    beam.scale.set(3.2, 1, 6); beam.position.set(dir * 4.4, 0.02, 0); g.add(beam);
    g.position.set(dir > 0 ? -45 : 65, 0, dir > 0 ? 25.6 : 22.6);
    this.root.add(g);
    this.cars.push({ g, dir, speed: 8 + Math.random() * 4, beam });
  }
  buildPedestrians() {
    this.walkers = [];
    for (let i = 0; i < 3; i++) this.spawnWalker(i * 9 - 10);
  }
  spawnWalker(startX = null) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const p = new Person(randomLook(Math.floor(Math.random() * 99999)));
    const z = Math.random() < 0.6 ? 28.25 : 20.15;
    p.setPosition(startX ?? (dir > 0 ? -32 : 52), 0, z);
    this.root.add(p.group);
    this.walkers.push({ p, dir, speed: 0.9 + Math.random() * 0.5 });
  }

  // ---------------- per frame ----------------
  setTime(h, force = false) {
    this.hour = ((h % 24) + 24) % 24;
    const s = sampleSky(this.hour);
    this.skyMat.uniforms.top.value.copy(s.top);
    this.skyMat.uniforms.horizon.value.copy(s.horizon);
    this.scene.fog.color.copy(s.horizon).lerp(s.top, 0.3);
    this.scene.background.copy(s.horizon);
    this.sun.color.copy(s.sun); this.sun.intensity = s.sunI;
    this.hemi.intensity = s.hemi; this.hemi.color.copy(s.top).lerp(new THREE.Color(0xfff1dc), 0.6);
    this.night = s.night;
    this.view.renderer.toneMappingExposure = s.exposure;
    this.starMat.opacity = Math.max(0, s.night - 0.3) * 1.2;
    this.scene.environmentIntensity = 0.25 + 0.4 * (1 - s.night);
    const m = mats();
    m.night.color.setScalar(0.18 + s.night * 2.2);
    this.points.forEach((l) => { l.intensity = 4 + s.night * 10; });
    this.pools.material.opacity = 0.4 + s.night * 0.5;
    if (this.streetPools) {
      for (const i of this.streetPools) this.pools.setColorAt(i, this._c.set(0xffcf8a).multiplyScalar(Math.max(0, s.night - 0.2) * 1.1));
      this.pools.instanceColor.needsUpdate = true;
    }
    this.sunElev = s.elev;
  }

  setInside(inside) { this.inside = inside; }

  update(dt, focus) {
    // clock: 1 game hour every 40 seconds
    this.setTime(this.hour + dt / 40);
    // sun follows the player so shadows stay crisp where you are
    const az = 0.9 + this.hour * 0.12;
    this.sun.position.set(focus.x - Math.cos(az) * 14, 6 + this.sunElev * 18, focus.z + 8 + Math.sin(az) * 4);
    this.sun.target.position.copy(focus);
    // facade cut-away when the player is inside
    const want = this.inside ? 1 : 0;
    this.cut += (want - this.cut) * Math.min(1, dt * 5);
    // walls between the camera and the room also drop down
    const cam = this.view.camera.position;
    const inside = this.inside || (focus.z < 16 && focus.z > 1.9 && focus.x > 1 && focus.x < 19);
    const front = inside && cam.z > 16 ? 1 : 0;
    this.cut += (Math.max(want, front) - this.cut) * Math.min(1, dt * 5);
    const sy = 1 - this.cut * 0.86;
    this.facade.scale.y = sy;
    this.tall.visible = this.cut < 0.4;
    const cutTo = (key, g, on) => { this.wallCut[key] += ((on ? 1 : 0) - this.wallCut[key]) * Math.min(1, dt * 5); g.scale.y = 1 - this.wallCut[key] * 0.86; };
    cutTo('N', this.wallN, inside && cam.z < 3.5);
    cutTo('W', this.wallW, inside && cam.x < 2.5);
    cutTo('E', this.wallE, inside && cam.x > 17.5);
    // sliding doors
    const near = Math.abs(focus.x - 10) < 1.6 && Math.abs(focus.z - 16) < 2.0;
    this.doorOpen += ((near || this.doorHold > 0 ? 1 : 0) - this.doorOpen) * Math.min(1, dt * 6);
    this.doorHold = Math.max(0, (this.doorHold || 0) - dt);
    this.doors.forEach((d, i) => { d.position.x = 10 + (i === 0 ? -0.4 - this.doorOpen * 0.75 : 0.4 + this.doorOpen * 0.75); });
    // traffic
    this.carTimer -= dt;
    if (this.carTimer <= 0) { this.carTimer = 5 + Math.random() * 9; if (this.cars.length < 4) this.spawnCar(); }
    for (const c of this.cars) { c.g.position.x += c.dir * c.speed * dt; c.beam.material.opacity = this.night * 0.35; }
    this.cars = this.cars.filter((c) => { const gone = c.g.position.x > 70 || c.g.position.x < -50; if (gone) { c.g.removeFromParent(); c.g.traverse((o) => o.geometry && o.geometry.dispose()); } return !gone; });
    for (const w of this.walkers) {
      w.p.group.position.x += w.dir * w.speed * dt;
      w.p.update(dt, w.dir * w.speed, 0);
      if (w.p.group.position.x > 55 || w.p.group.position.x < -35) { w.p.group.position.x = w.dir > 0 ? -32 : 52; }
    }
    this.guard.update(dt);
    if (this.band) this.band.forEach((p) => p.update(dt));
    this.updaters.forEach((f) => f(dt));
  }
}
