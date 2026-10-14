import Phaser from 'phaser';
import { ITEMS, PLAYER, LOUNGE, LOUNGE_UNLOCKS, FAME } from '../config.js';
import { money } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { Haptic, DEMO } from '../platform.js';
import { getEngine } from '../lounge/loader.js';
import { CREATIVES, SCREENS, ROTATE_EVERY, BOOKING_URL, trackAd } from '../ads.js';
import { lookFromProfile } from '../profile.js';
import BranchScene from './BranchScene.js';

const U = 0.01;
const MAINS = ['steak', 'pasta', 'pizza', 'salad'];
const QUEUE_OFFSETS = [[-34, 0], [34, 0], [-34, 34], [34, 34]];
const INSIDE_DOOR = { x: 1000, y: 1545 };
const OUTSIDE_DOOR = { x: 1000, y: 1660 };
const GATE_IN = { x: 1000, y: 1925 };
const GATE_OUT = { x: 1000, y: 2010 };

/**
 * Branch 3: the GRA Lounge, a high-end restaurant in full 3D.
 * Guests arrive in parties, wait at the door to be seated, order from a continental menu,
 * eat, pay (and tip), and leave plates to clear. The shared branch engine handles money,
 * unlock pads, goals, fame and saving; this scene adds the 3D world and the restaurant flow.
 */
export default class LoungeScene extends BranchScene {
  constructor() { super('lounge'); }

  // ===================================================================
  // 3D versions of the shared visuals
  makePlayer(x, y) { return new this.E.Player3D(this.ctx, x, y, this.ownerLook3d()); }
  ownerLook3d() {
    const p = this.gs.profile;
    if (!p) return this.E.ownerLook(null, 'f', 0x1f5a46, 0x8d5a36, 'wrap');
    const L = lookFromProfile(p);
    return this.E.ownerLook(p, p.gender === 'guy' ? 'm' : 'f', L.shirt, L.skin, L.hair);
  }
  followPlayer() {}
  fly(tex, from, to, opts) { this.ctx.fly(tex, from, to, opts); }
  floatAt(x, y, lift, str, color, size) { this.ctx.float(x, y, 170 + lift * 0.3, str, color, size); }
  floatText(x, y, str, color, size) { this.ctx.float(x, y, 190, str, color, size); }
  confetti(x, y) { this.ctx.confetti(x, y + 60, 130); }
  popObj() {}
  shake(ms, a) { this.ctx.view.shake(ms, a); }
  walkBounds() { return LOUNGE.bounds; }
  playerRadius() { return 20; }
  addCashPile(x, y, opt) { const c = new this.E.CashPile3D(this.ctx, x, y, opt); this.cashPiles.push(c); return c; }
  addCollider(r) { super.addCollider(r); this.navDirty = true; }
  refreshPads() {
    const visible = this.unlockList().filter((u) => !this.b.unlocked[u.id]).slice(0, 2);
    this.pads = this.pads.filter((p) => { if (!visible.includes(p.def)) { p.destroy(); return false; } return true; });
    visible.forEach((def) => { if (!this.pads.find((p) => p.def === def)) this.pads.push(new this.E.Pad3D(this.ctx, def, this.b.padPaid[def.id] || 0)); });
  }
  fadeOutThen(cb) { this.ctx.view.fadeOut(cb); }
  fadeIn() { this.ctx.view.show(true); }
  refreshSigns() { super.refreshSigns(); if (this.ctx) this.ctx.world.refreshSigns(); }

  // ===================================================================
  // building the world
  buildWorld() {
    this.E = getEngine();
    this.ctx = this.E.createContext(this);
    this.ctx.ghostFor = (id) => this.ghostFor(id);
    this.cameras.main.setVisible(false);
    this.world = this.ctx.world;
    this.colSynced = 0;
    this.syncColliders();
    this.tables = []; this.parties = []; this.queue = [];
    this.spawnTimer = 4; this.seatCool = 0; this.noTableCool = 0;
    this.partySeq = 0;
    const E = this.E;
    this.hostZone = new E.Zone3D(this.ctx, LOUNGE.host.zone, { color: 0xd9b26a });
    this.returnZone = new E.Zone3D(this.ctx, LOUNGE.dishReturn.zone, { color: 0x5ec2ff });
    this.returnPile = new E.Pile3D(this.ctx, 'dirty', (i) => E.toV(LOUNGE.dishReturn.x - 30 + (i % 5) * 14, 557, 117 + Math.floor(i / 5) * 3), { maxVisual: 20 });
    const T = LOUNGE.till;
    this.tillCash = this.addCashPile(T.x - 14, T.y - 4, { h: 105, maxVisual: 18, unit: 300, zoneR: 78, cols: 3 });
    this.world.hour = this.b.hour ?? 17.4;
    this.ctx.view.camMode = this.b.camMode || 'overview';
    this.ctx.view.show(true);
  }

  syncColliders() { const W = this.world; while (this.colSynced < W.colliders.length) this.addCollider(W.colliders[this.colSynced++]); }

  startIds() { return ['grill', 't1', 't2']; }
  unlockList() { return LOUNGE_UNLOCKS; }
  tutorialDone() { return this.b.tut >= 5; }
  finaleId() { return 'fountain'; }
  staffSpeed() { return 190 * this.staffMult(); }
  staffCarry() { return 6 + Math.floor(this.b.up.staff * 0.6); }
  /** nearest station (from `who`) that has one of these dishes ready, else nearest that makes it */
  nearestSource(types, who) {
    const list = Object.values(this.producers).filter((p) => types.includes(p.type));
    const d = (p) => Math.hypot(p.zone.cx - who.x, p.zone.cy - who.y) + (p.count > 0 ? 0 : 900);
    return list.sort((a, b) => d(a) - d(b))[0] || null;
  }
  demandMult() { return super.demandMult() * (this.isUnlocked('band') ? 1.2 : 1); }

  buildUnlock(id, animate) {
    const P = LOUNGE.producers; const W = this.world;
    let group = null;
    if (P[id]) {
      const pr = new Producer3D(this, id, P[id], this.b.prod[id] ?? null);
      this.producers[id] = pr; group = pr.group;
    } else if (id === 'terrace') {
      LOUNGE.tables.filter((t) => t.unlock === 'terrace').forEach((d) => this.buildTable(d, animate));
    } else if (LOUNGE.tables.find((t) => t.id === id && !t.unlock)) {
      group = this.buildTable(LOUNGE.tables.find((t) => t.id === id), animate);
    } else if (id === 'booth') {
      group = W.buildDesk();
      this.boothZone = new this.E.Zone3D(this.ctx, LOUNGE.booth.zone, { color: 0x2c7be5 });
    } else if (id === 'chandelier') group = W.buildChandelier();
    else if (id === 'band') { group = W.buildStage(); }
    else if (id === 'art') group = W.buildArt();
    else if (id === 'fountain') group = W.buildFountain();
    else if (id === 'events') {
      const ev = { id: 'ev', x: LOUNGE.eventTable.x, y: LOUNGE.eventTable.y, kind: 'event' };
      const built = W.buildTable(ev); group = built.group;
      this.eventSeats = built.seats;
      this.vehicle = new Booking(this);
      this.vehicleCash = this.addCashPile(LOUNGE.eventTable.x, LOUNGE.eventTable.y + 120, { h: 79, maxVisual: 12, unit: 400, zoneR: 90, cols: 2 });
      if (animate) this.vehicle.timer = 6;
    } else {
      const S = {
        host: () => new Host(this),
        waiter1: () => new Waiter(this, 'Chidi', 11, 'm', { x: 1000, y: 900 }),
        waiter2: () => new Waiter(this, 'Adaeze', 23, 'f', { x: 1000, y: 1150 }),
        busser: () => new Busser(this),
        planner: () => new Planner(this),
        manager: () => new Manager(this),
      }[id];
      if (S) { const h = S(); this.helpers.push(h); if (animate) this.ctx.pop(h.person.group, 0.45); }
    }
    this.syncColliders();
    if (group && animate) this.ctx.pop(group, 0.6);
  }

  /** see-through preview on an unlock pad */
  ghostFor(id) {
    const W = this.world; const P = LOUNGE.producers;
    if (P[id]) return id === 'bar' ? W.buildBar(true) : W.buildStation(id, P[id], true).group;
    const t = LOUNGE.tables.find((x) => x.id === id && !x.unlock);
    if (t) return W.buildTable(t, true).group;
    if (id === 'terrace') { const g = W.buildTable(LOUNGE.tables.find((x) => x.id === 't7'), true).group; g.add(W.buildTable(LOUNGE.tables.find((x) => x.id === 't8'), true).group); return g; }
    if (id === 'booth') return W.buildDesk(true);
    if (id === 'chandelier') return W.buildChandelier(true);
    if (id === 'band') return W.buildStage(true);
    if (id === 'art') return W.buildArt(true);
    if (id === 'fountain') return W.buildFountain(true);
    if (id === 'events') return W.buildTable({ id: 'ev', x: LOUNGE.eventTable.x, y: LOUNGE.eventTable.y, kind: 'event' }, true).group;
    return null;
  }

  buildTable(def, animate) {
    const E = this.E; const built = this.world.buildTable(def);
    const cx = def.x, cy = def.y;
    const side = def.x < 1000 ? 1 : -1;
    const t = {
      id: def.id, def, x: cx, y: cy, party: null, group: built.group,
      seats: built.seats.map((s) => ({ ...s, taken: null })),
      zone: new E.Zone3D(this.ctx, { x: cx, y: cy, r: def.kind === 'booth' ? 140 : 128 }, { visible: false }),
      service: { x: cx + side * (def.kind === 'booth' ? 130 : 112), y: cy },
      dishes: [],
    };
    const topH = def.kind === 'terrace' ? 77 : 80;
    t.dishPos = (i) => { const s = t.seats[i % t.seats.length]; return E.toV(cx + (s.x - cx) * 0.55, cy + (s.y - cy) * 0.55, topH + Math.floor(i / t.seats.length) * 2.5); };
    t.plates = new E.Pile3D(this.ctx, 'dirty', (i) => t.dishPos(i), { maxVisual: 16 });
    t.cash = this.addCashPile(cx, cy, { h: topH, maxVisual: 6, unit: 120, zoneR: def.kind === 'booth' ? 140 : 128, cols: 2 });
    this.tables.push(t);
    this.syncColliders();
    if (animate) this.ctx.pop(built.group, 0.6);
    return built.group;
  }

  restore() {
    const tb = this.b.tables || {};
    this.tables.forEach((t) => { const s = tb[t.id] || {}; if (s.plates) t.plates.add(s.plates, false); if (s.cash) t.cash.restore(s.cash); });
    const pl = this.b.piles || {};
    this.tillCash.restore(pl.till || 0);
    if (this.vehicleCash) this.vehicleCash.restore(pl.vehicle || 0);
  }

  saveBranch() {
    this.b.tables = {};
    this.tables.forEach((t) => { this.b.tables[t.id] = { plates: t.plates.count + t.dishes.length, cash: t.cash.value }; });
    this.b.hour = Math.round(this.world.hour * 100) / 100;
    this.b.camMode = this.ctx.view.camMode;
  }

  afterCreate() {
    const view = this.ctx.view;
    this.ctx.view.follow(this.playerV(), 0, true);
    this.setupTaps();
    this.setupScreens();
    Sound.setStyle && Sound.setStyle('lounge');
    this.onGame('graphics', (q) => { const v = this.ctx.view; v.locked = q !== 'auto'; v.setTier(q === 'auto' ? v.autoTier : q); });
    this.onGame('camera-toggle', () => {
      if (view.exploring) this.toggleExplore(false);
      view.camMode = view.camMode === 'close' ? 'overview' : 'close';
      view.resetOrbit();
      this.game.events.emit('toast', view.camMode === 'close' ? 'Close-up camera' : 'Overview camera');
      this.save();
    });
    this.onGame('explore-toggle', () => this.toggleExplore(!view.exploring));
    this.setupGestures();
    this.labels = new Map(); this.labelT = 0;
    this.marker = new this.E.Zone3D(this.ctx, { x: 0, y: 0, r: 34 }, { color: 0xffffff, visible: false });
    if (!this.b.introDone) this.startIntro();
    else this.time.delayedCall(1500, () => this.maybeCoach());
    if (DEMO) this.time.delayedCall(1200, () => this.game.events.emit('toast', 'Demo visit: progress here is not saved'));
    if (this.b.tut === 0 && this.b.stats.served === 0) this.spawnParty({ size: 2, order: { steak: 2 }, instant: true });
    this.events.once('shutdown', () => this.teardown());
    this.registry.set('lounge', true);
  }

  teardown() {
    Sound.setStyle && Sound.setStyle('afro');
    if (this.gestureOff) this.gestureOff();
    const ui = this.scene.get('UI'); if (ui) ui.blockJoy = false;
    this.ctx.view.exploring = false;
    const view = this.ctx.view;
    view.show(false);
    this.ctx.dispose();
    this.registry.set('lounge', false);
  }

  playerV() { return this.E.toV(this.player.x, this.player.y, 0); }

  // ===================================================================
  // the first arrival: a short camera sweep from the street to the door
  startIntro() {
    this.intro = { t: 0, dur: 5.2 };
    this.game.events.emit('toast', 'Welcome to GRA. This is your new restaurant.');
  }
  updateIntro(dt) {
    const it = this.intro; const view = this.ctx.view;
    const ui = this.scene.get('UI');
    if (ui && ui.joy && ui.joy.active && it.t > 0.6) it.t = it.dur;
    if (ui && (ui.titleOpen || ui.modal)) { view.follow(this.playerV(), dt, true); return; }
    it.t += dt;
    const k = Math.min(1, it.t / it.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const V3 = this.ctx.view.camera.position.constructor;
    const a = new V3(-4, 7, 33), al = new V3(10, 2.4, 16);
    const look = this.playerV().add(new V3(0, 0.6, -0.9));
    const pos = look.clone().add(view.cameraOffset());
    view.setShot(a.lerp(pos, e), al.lerp(look, e));
    if (k >= 1) { this.intro = null; this.b.introDone = true; this.save(); this.time.delayedCall(400, () => this.maybeCoach()); }
  }

  // ===================================================================
  // ad screens in the world (same advertisers as the billboards)
  setupScreens() {
    this.screens = this.world.adScreens.map((s) => ({ ...s, ads: (SCREENS[s.slotId] || ['vezio']).filter((id) => CREATIVES[id]), idx: 0, t: 0, seen: false }));
    this.screens.forEach((s) => this.showAd(s));
  }
  showAd(s) {
    const id = s.ads[s.idx]; const ad = CREATIVES[id];
    if (!ad) return;
    const key = `ad_${id}`;
    if (this.textures.exists(key)) {
      const tex = this.E.iconTexture(this.textures, key);
      s.mat.map = tex; s.mat.needsUpdate = true;
    }
  }
  updateScreens(dt) {
    const cam = this.ctx.view.camera;
    for (const s of this.screens) {
      if (s.ads.length > 1) { s.t += dt; if (s.t > ROTATE_EVERY) { s.t = 0; s.idx = (s.idx + 1) % s.ads.length; this.showAd(s); s.seen = false; } }
      const p = s.face.getWorldPosition(new cam.position.constructor()).project(cam);
      const on = Math.abs(p.x) < 0.8 && Math.abs(p.y) < 0.8 && p.z < 1 && s.face.parent.visible !== false && (s.slotId !== 'gra-facade' || !this.world.inside);
      if (on && !s.seen) trackAd('view', s.ads[s.idx], s.slotId);
      s.seen = on;
    }
  }
  setupTaps() {
    const dpr = this.registry.get('dpr') || 1;
    this.input.on('pointerdown', (p) => { this.tapStart = { x: p.x, y: p.y, t: this.time.now }; });
    this.input.on('pointerup', (p) => {
      const s0 = this.tapStart; this.tapStart = null;
      if (!s0 || Math.hypot(p.x - s0.x, p.y - s0.y) > 16 * dpr || this.time.now - s0.t > 450) return;
      const ui = this.scene.get('UI'); if (ui && (ui.modal || ui.titleOpen)) return;
      if (this.gesturing || this.ctx.view.exploring) return;
      const hit = this.ctx.view.raycast(p.x / dpr, p.y / dpr, this.screens.map((s) => s.face));
      if (!hit) { const g = this.ctx.view.groundPoint(p.x / dpr, p.y / dpr); if (g) this.walkTo(g.x / U, g.z / U); return; }
      const s = this.screens.find((x) => x.face === hit.object);
      if (!s) return;
      const id = s.ads[s.idx]; const ad = CREATIVES[id];
      trackAd('tap', id, s.slotId);
      const url = ad.url || BOOKING_URL;
      if (url) { this.game.events.emit('toast', `Opening ${ad.url ? ad.label : 'ad booking'}…`); window.open(url, '_blank', 'noopener'); }
      else this.game.events.emit('toast', 'Want your brand on this screen? Booking opens soon!');
    });
  }

  // ===================================================================
  // how to play here (shown once), explore mode, gestures, tap to walk
  maybeCoach() {
    if (this.b.coachDone) return;
    this.b.coachDone = true; this.save();
    this.game.events.emit('lounge-coach');
  }

  toggleExplore(on) {
    const view = this.ctx.view;
    view.setExplore(on, this.playerV());
    const ui = this.scene.get('UI');
    if (ui) { ui.blockJoy = on; Object.assign(ui.joy, { id: null, active: false, x: 0, y: 0 }); }
    this.autoPath = null; this.marker.setVisible(false);
    this.game.events.emit('explore-state', on);
    if (on) this.game.events.emit('toast', 'Explore: drag to move around, pinch to zoom, twist to turn');
  }

  setupGestures() {
    const view = this.ctx.view;
    const pts = new Map();
    let last = null;
    const ui = () => this.scene.get('UI');
    const blocked = () => { const u = ui(); return !u || u.modal || u.titleOpen || this.intro; };
    const pair = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    const onDown = (e) => {
      if (blocked() || (e.target && e.target.tagName === 'INPUT')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
      if (pts.size === 2) {
        last = pair();
        const u = ui(); if (u) { u.blockJoy = true; Object.assign(u.joy, { id: null, active: false, x: 0, y: 0 }); }
        this.autoPath = null; this.gesturing = true;
      } else if (pts.size === 1) last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size >= 2) {
        const now = pair();
        if (last && last.d) {
          view.zoomBy(last.d / Math.max(10, now.d));
          let da = now.ang - last.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
          view.rotate(-da, (now.my - last.my) * 0.004);
          if (view.exploring) view.pan(now.mx - last.mx, now.my - last.my);
        }
        last = now;
      } else if (view.exploring && !blocked()) {
        view.pan(dx, dy);
      } else if (p.button === 2) {
        view.rotate(-dx * 0.006, dy * 0.004);
      }
    };
    const onUp = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) last = null;
      if (pts.size === 0) {
        const u = ui(); if (u) u.blockJoy = !!view.exploring;
        this.time.delayedCall(80, () => { this.gesturing = false; });
      }
    };
    const onWheel = (e) => { if (blocked()) return; view.zoomBy(e.deltaY > 0 ? 1.1 : 0.91); };
    const onCtx = (e) => e.preventDefault();
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('contextmenu', onCtx);
    this.gestureOff = () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onCtx);
    };
  }

  /** joystick and keys move relative to the camera; a tap sets a path to follow */
  readInput() {
    const inp = super.readInput();
    const view = this.ctx.view;
    if (view.exploring || this.gesturing) return { x: 0, y: 0 };
    if (inp.x || inp.y) {
      if (this.autoPath) { this.autoPath = null; this.marker.setVisible(false); }
      const d = view.groundDir(inp.x, inp.y);
      return { x: d.x, y: d.z };
    }
    const path = this.autoPath;
    if (path && path.length) {
      const p = this.player; const t = path[0];
      const dx = t.x - p.x, dy = t.y - p.y; const d = Math.hypot(dx, dy);
      if (d < 12) { path.shift(); if (!path.length) { this.autoPath = null; this.marker.setVisible(false); } return { x: 0, y: 0 }; }
      const sp = Math.min(1, d / 40 + 0.35);
      return { x: (dx / d) * sp, y: (dy / d) * sp };
    }
    return { x: 0, y: 0 };
  }

  /** tap somewhere: walk there. Taps near something useful snap to it. */
  walkTo(gx, gy) {
    const cands = [
      { x: this.hostZone.cx, y: this.hostZone.cy },
      { x: this.returnZone.cx, y: this.returnZone.cy },
      ...Object.values(this.producers).map((p) => ({ x: p.zone.cx, y: p.zone.cy })),
      ...this.tables.map((t) => t.service),
      ...this.pads.map((p) => ({ x: p.x, y: p.y })),
      { x: LOUNGE.till.x - 14, y: LOUNGE.till.y - 70 },
    ];
    if (this.boothZone) cands.push({ x: this.boothZone.cx, y: this.boothZone.cy });
    if (this.vehicle) cands.push({ x: this.vehicle.zone.cx, y: this.vehicle.zone.cy });
    // tables snap from anywhere on them
    for (const t of this.tables) if (Math.hypot(gx - t.x, gy - t.y) < 110) { gx = t.service.x; gy = t.service.y; }
    let best = null, bd = 120;
    for (const c of cands) { const d = Math.hypot(c.x - gx, c.y - gy); if (d < bd) { bd = d; best = c; } }
    if (best) { gx = best.x; gy = best.y; }
    const B = LOUNGE.bounds;
    gx = Phaser.Math.Clamp(gx, B.x1, B.x2); gy = Phaser.Math.Clamp(gy, B.y1, B.y2);
    if (this.navDirty) { this.ctx.nav.rebuild(this.colliders); this.navDirty = false; }
    this.autoPath = this.ctx.nav.path({ x: this.player.x, y: this.player.y }, { x: gx, y: gy });
    this.marker.shape.x = gx; this.marker.shape.y = gy;
    this.marker.mesh.position.set(gx * U, 0.04, gy * U);
    this.marker.setVisible(true); this.marker.setActive(true);
    Sound.play('click');
  }

  /** floating hints over what you can use right now */
  updateLabels(dt) {
    for (const s of this.labels.values()) { s.position.y = s.userData.baseY + Math.sin(this.ctx.time * 3 + s.userData.phase) * 0.04; }
    this.labelT -= dt; if (this.labelT > 0) return; this.labelT = 0.25;
    const p = this.player; const want = [];
    const away = (x, y, r = 70) => Math.hypot(p.x - x, p.y - y) > r;
    const waiting = this.queue.find((q) => q.state === 'queued');
    if (waiting && !this.isUnlocked('host') && this.freeTableFor(waiting.size) && away(this.hostZone.cx, this.hostZone.cy)) want.push(['host', LOUNGE.host.x, LOUNGE.host.y, 175, 'SEAT GUESTS', '#b8862b']);
    const neededTypes = new Set();
    for (const q of this.parties) if (q.state === 'ordered') for (const k of this.partyTypes(q)) if (this.partyNeeds(q, k) > p.countOf(k)) neededTypes.add(k);
    for (const pr of Object.values(this.producers)) {
      if (neededTypes.has(pr.type) && pr.count > 0 && p.carryCount < this.carryCap() && away(pr.zone.cx, pr.zone.cy, 60)) want.push(['pr:' + pr.id, pr.zone.cx, pr.zone.cy - 40, 150, 'PICK UP', '#2c7be5']);
    }
    for (const t of this.tables) {
      const q = t.party;
      if (q && q.state === 'ordered' && this.partyTypes(q).some((k) => this.partyNeeds(q, k) > 0 && p.countOf(k) > 0)) want.push(['t:' + t.id, t.service.x, t.service.y, 120, 'SERVE', '#2bb34a']);
      else if (!q && (t.plates.count > 0 || t.cash.value > 0) && away(t.service.x, t.service.y)) want.push(['t:' + t.id, t.x, t.y, 120, t.plates.count > 0 ? 'CLEAR' : 'COLLECT', t.plates.count > 0 ? '#7b4fd6' : '#2f9a55']);
    }
    if (p.countOf('dirty') > 0 && away(this.returnZone.cx, this.returnZone.cy)) want.push(['ret', this.returnZone.cx, this.returnZone.cy, 150, 'RETURN PLATES', '#0f8b8d']);
    if (this.tillCash.value > 0 && away(LOUNGE.till.x, LOUNGE.till.y, 110)) want.push(['till', LOUNGE.till.x, LOUNGE.till.y, 150, 'COLLECT', '#2f9a55']);
    const keys = new Set(want.map((w) => w[0] + w[4]));
    for (const [k, s] of this.labels) if (!keys.has(k)) { s.removeFromParent(); s.material.map.dispose(); s.material.dispose(); this.labels.delete(k); }
    for (const [key, x, y, z, text, col] of want) {
      const k = key + text;
      if (this.labels.has(k)) continue;
      const s = this.E.textSprite(text, { px: 26, bg: col, stroke: null, color: '#ffffff', w: 560, h: 150 });
      s.position.set(x * U, z * U, y * U); s.userData.baseY = z * U; s.userData.phase = Math.random() * 6;
      this.ctx.root.add(s); this.labels.set(k, s);
    }
  }

  // ===================================================================
  // menu & orders
  menu() { return Object.values(LOUNGE.producers).map((p) => p.type).filter((k) => this.producersOf(k).length); }

  makeOrder(size, vip) {
    const menu = this.menu(); const extra = this.extraItems();
    const mains = MAINS.filter((k) => menu.includes(k));
    const o = {};
    for (let i = 0; i < size; i++) {
      const m = Phaser.Utils.Array.GetRandom(mains); o[m] = (o[m] || 0) + 1;
      if (menu.includes('drink') && (vip || Math.random() < 0.5 + extra * 0.08)) o.drink = (o.drink || 0) + 1;
      if (menu.includes('dessert') && (vip || Math.random() < 0.3 + extra * 0.08)) o.dessert = (o.dessert || 0) + 1;
    }
    return o;
  }

  makeVehicleOrder() {
    const menu = this.menu();
    const pick = Phaser.Utils.Array.Shuffle([...menu]).slice(0, Math.min(menu.length, 2 + Math.floor(Math.random() * 2)));
    const o = {};
    pick.forEach((k) => { o[k] = 2 + Math.floor(Math.random() * (3 + this.extraItems())); });
    return o;
  }

  goalTemplates() {
    const has = (id) => this.isUnlocked(id);
    const sells = (k) => this.producersOf(k).length > 0;
    return [
      { kind: 'serve', text: (n) => `Serve ${n} tables`, target: (t) => 5 + 2 * t },
      { kind: 'guests', text: (n) => `Seat ${n} guests`, target: (t) => 10 + 4 * t },
      { kind: 'earn', text: (n) => `Collect ${money(n)}`, target: (t) => Math.round(3000 * Math.pow(1.28, t) / 100) * 100, weight: 1.2 },
      { kind: 'item:steak', text: (n) => `Serve ${n} grilled steaks`, target: (t) => 6 + 3 * t },
      { kind: 'item:pasta', text: (n) => `Serve ${n} plates of seafood pasta`, target: (t) => 6 + 3 * t, ok: sells('pasta') },
      { kind: 'item:salad', text: (n) => `Serve ${n} Caesar salads`, target: (t) => 6 + 3 * t, ok: sells('salad') },
      { kind: 'item:pizza', text: (n) => `Serve ${n} pizzas`, target: (t) => 5 + 3 * t, ok: sells('pizza') },
      { kind: 'item:dessert', text: (n) => `Serve ${n} slices of chocolate cake`, target: (t) => 5 + 3 * t, ok: sells('dessert') },
      { kind: 'item:drink', text: (n) => `Serve ${n} mocktails`, target: (t) => 8 + 4 * t, ok: sells('drink') },
      { kind: 'clean', text: (n) => `Clear ${n} tables`, target: (t) => 5 + 2 * t },
      { kind: 'vip', text: (n) => `Serve ${n} VIP table${n > 1 ? 's' : ''}`, target: (t) => 1 + Math.floor(t / 2), ok: this.b.fame.lvl >= 3, weight: 1.5 },
      { kind: 'vehicle', text: (n) => `Host ${n} party booking${n > 1 ? 's' : ''}`, target: (t) => 1 + Math.floor(t / 3), ok: has('events'), weight: 1.5 },
      { kind: 'streak', text: (n) => `Serve ${n} tables in a row with no walkouts`, target: (t) => 4 + 2 * t, weight: 1.3 },
      { kind: 'rush', text: (n) => `Serve ${n} tables during a rush hour`, target: (t) => 2 + t, ok: this.unlockCount() >= 3, weight: 1.3 },
    ];
  }

  // ===================================================================
  // parties
  partySize() {
    const lvl = this.b.fame.lvl;
    const r = Math.random();
    if (r < Math.max(0.08, 0.2 - lvl * 0.01)) return 1;
    if (r < 0.62) return 2;
    if (r < 0.8 + Math.min(0.08, lvl * 0.005)) return 4;
    return 3;
  }

  spawnParty({ size = null, order = null, instant = false, vip = null } = {}) {
    const E = this.E;
    size = size || this.partySize();
    if (vip == null) vip = this.b.fame.lvl >= 3 && Math.random() < 0.12;
    const fromLeft = Math.random() < 0.5;
    const sx = fromLeft ? 160 : 1840;
    const party = {
      id: ++this.partySeq, size, vip, order: order || this.makeOrder(size, vip), served: {},
      state: 'arriving', table: null, patience: null, patienceMax: 1, placeIdx: 0,
      bubble: new E.Bubble3D(this.ctx), members: [],
    };
    for (let i = 0; i < size; i++) {
      const g = new E.Guest(this.ctx, Math.floor(Math.random() * 1e6), sx - (fromLeft ? i * 40 : -i * 40), 2012 + (i % 2) * 18, LOUNGE.guests.speed * (0.95 + Math.random() * 0.1));
      party.members.push(g);
    }
    if (instant) party.members.forEach((g, i) => { g.x = LOUNGE.queue[0].x + QUEUE_OFFSETS[i][0]; g.y = LOUNGE.queue[0].y + QUEUE_OFFSETS[i][1]; g.sync(); });
    this.parties.push(party);
    this.queue.push(party);
    this.reslotQueue();
    return party;
  }

  partyCenter(p) { const m = p.members.filter((g) => !g.dead); const x = m.reduce((a, g) => a + g.x, 0) / Math.max(1, m.length); const y = m.reduce((a, g) => a + g.y, 0) / Math.max(1, m.length); return { x, y }; }

  reslotQueue() {
    this.queue.forEach((p, i) => {
      const slot = LOUNGE.queue[Math.min(i, LOUNGE.queue.length - 1)];
      p.slot = i;
      p.members.forEach((g, k) => {
        const tgt = { x: slot.x + QUEUE_OFFSETS[k][0], y: slot.y + QUEUE_OFFSETS[k][1] };
        const via = g.y > 1960 ? [GATE_OUT, GATE_IN] : [];
        g.goVia([...via, tgt], k === 0 ? () => {
          if (p.state !== 'arriving' && p.state !== 'queued') return;
          p.state = 'queued';
          if (p.patience == null) { p.patienceMax = LOUNGE.guests.queuePatience * this.patienceMult() * (this.b.tut < 5 ? 4 : 1); p.patience = p.patienceMax; }
          p.bubble.set([{ icon: 'icon_ltable', n: p.size }], { vip: p.vip }); p.bubble.show(true);
        } : null);
      });
    });
  }

  freeTableFor(size) {
    return this.tables.filter((t) => !t.party && t.plates.count === 0 && t.dishes.length === 0 && t.seats.length >= size)
      .sort((a, b) => a.seats.length - b.seats.length || Math.hypot(a.x - 1000, a.y - 1500) - Math.hypot(b.x - 1000, b.y - 1500))[0] || null;
  }

  /** seat the first party in line that fits a free table */
  seatNext(by = 'player') {
    for (const p of this.queue) {
      if (p.state !== 'queued') continue;
      const t = this.freeTableFor(p.size);
      if (!t) continue;
      this.seatParty(p, t, by);
      return true;
    }
    return false;
  }

  seatParty(p, t, by) {
    this.queue = this.queue.filter((x) => x !== p);
    p.state = 'toTable'; p.table = t; t.party = p; p.patience = null; p.bubble.show(false);
    p.seated = 0;
    p.members.forEach((g, i) => {
      const s = t.seats[i]; s.taken = g; g.seat = s;
      const inside = t.def.kind !== 'terrace';
      const via = inside ? [OUTSIDE_DOOR, INSIDE_DOOR] : [];
      g.goVia([...via, { x: s.x, y: s.y }], () => {
        g.person.pose = 'sit'; g.person.faceTo(s.yaw, true); g.x = s.x; g.y = s.y; g.sync();
        p.seated++;
        if (p.seated >= p.size && p.state === 'toTable') { p.state = 'reading'; p.read = Phaser.Math.FloatBetween(...LOUNGE.guests.read); p.members.forEach((m, k) => { m.person.action = k % 2 ? 'talk' : null; }); }
      });
    });
    this.reslotQueue();
    this.track('guests', p.size);
    Sound.play('pop');
    if (by === 'player') { Haptic.tap('medium'); this.floatAt(this.player.x, this.player.y, 120, `Table for ${p.size}`, '#ffe9a8', 20); }
    if (this.b.tut === 0) this.b.tut = 1;
  }

  partyNeeds(p, type) { return (p.order[type] || 0) - (p.served[type] || 0); }
  partyTypes(p) { return Object.keys(p.order).filter((k) => p.order[k] > 0); }
  partyComplete(p) { return this.partyTypes(p).every((k) => this.partyNeeds(p, k) <= 0); }
  refreshPartyBubble(p) {
    p.bubble.set(this.partyTypes(p).map((k) => ({ icon: ITEMS[k].icon, n: Math.max(0, this.partyNeeds(p, k)), done: this.partyNeeds(p, k) <= 0 })), { vip: p.vip });
  }

  /** one dish lands on a party's table */
  serveParty(p, type, from) {
    const t = p.table;
    p.served[type] = (p.served[type] || 0) + 1;
    const idx = p.placeIdx++;
    const it = this.ctx.batches.alloc(type); it.setVisible(false);
    it.place(t.dishPos(idx));
    t.dishes.push(it);
    this.fly(ITEMS[type].tex, from, { x: it.x, y: it.y, z: it.pos.y / U }, { duration: 230, arc: 40, onDone: () => { if (it.active) { it.setVisible(true); it.s = 1.3; this.ctx.tween(it, 's', 1, 0.16); } Sound.play('pop'); } });
    this.refreshPartyBubble(p); p.bubble.pulse();
    if (this.partyComplete(p)) {
      p.state = 'eating';
      p.eat = Phaser.Math.FloatBetween(...LOUNGE.guests.eat);
      p.tipFrac = p.patience != null ? p.patience / p.patienceMax : 1;
      p.patience = null;
      p.bubble.set([{ icon: 'icon_happy', n: null }], { vip: p.vip }); p.bubble.setBar(null); p.bubble.pulse();
      p.members.forEach((m, i) => { m.person.action = i % 3 === 2 ? 'talk' : 'eat'; });
      this.time.delayedCall(1400, () => { if (p.state === 'eating') p.bubble.show(false); });
      Sound.play('happy');
      if (p.claimedBy) p.claimedBy.release(p);
      if (this.b.tut <= 2) this.b.tut = 3;
    }
  }

  finishMeal(p) {
    const t = p.table;
    const food = this.partyTypes(p).reduce((n, k) => n + ITEMS[k].price * p.order[k], 0);
    const tipF = LOUNGE.guests.tip[0] + (LOUNGE.guests.tip[1] - LOUNGE.guests.tip[0]) * (p.tipFrac ?? 0.5);
    const total = Math.round(food * this.priceMult() * (1 + tipF) * (p.vip ? 2.2 : 1));
    t.cash.deposit(total, { x: t.x, y: t.y, z: 130 });
    this.floatAt(t.x, t.y, 60, `${p.vip ? 'VIP ' : ''}+${money(total)}`, p.vip ? '#ffe58a' : '#bdf7a8', p.vip ? 28 : 24);
    // plates stay behind to be cleared
    const n = t.dishes.length; t.dishes.forEach((d) => d.destroy()); t.dishes = [];
    t.plates.add(n, true);
    Sound.play('cash'); Haptic.tap('light');
    this.served(1);
    this.partyTypes(p).forEach((k) => this.track('item:' + k, p.order[k]));
    if (p.vip) { this.track('vip', 1); this.confetti(t.x, t.y); }
    this.leaveParty(p);
  }

  leaveParty(p, angry = false) {
    p.state = 'leaving'; p.patience = null;
    if (p.claimedBy) p.claimedBy.release(p);
    if (p.table) { p.table.seats.forEach((s) => { if (p.members.includes(s.taken)) s.taken = null; }); p.table.party = null; }
    this.queue = this.queue.filter((x) => x !== p);
    const out = Math.random() < 0.5 ? -300 : 2300;
    p.members.forEach((g, i) => {
      this.time.delayedCall(i * 160, () => {
        if (g.dead) return;
        g.person.pose = 'idle'; g.person.action = null;
        const inside = g.y < 1600;
        g.goVia([...(inside ? [INSIDE_DOOR, OUTSIDE_DOOR] : []), GATE_IN, GATE_OUT, { x: out, y: 2015 + (i % 2) * 18 }], () => g.destroy());
      });
    });
    this.time.delayedCall(angry ? 1500 : 900, () => p.bubble.show(false));
    this.reslotQueue();
  }

  walkout(p) {
    this.b.streak = 0; this.b.stats.walkouts++;
    this.b.fame.xp = Math.max(0, this.b.fame.xp - 2); this.publishFame();
    if (p && p.members) {
      p.bubble.set([{ icon: 'icon_angry', n: null }]); p.bubble.setBar(null); p.bubble.show(true); p.bubble.pulse();
      const c = this.partyCenter(p);
      this.floatAt(c.x, c.y, 80, 'Walked out!', '#ffd6d6', 22);
      // half-eaten plates still need clearing
      if (p.table) { const n = p.table.dishes.length; p.table.dishes.forEach((d) => d.destroy()); p.table.dishes = []; if (n) p.table.plates.add(n, false); }
    }
    Sound.play('deny'); Haptic.tap('medium');
  }

  updateParties(dt) {
    const G = LOUNGE.guests;
    const seats = this.tables.reduce((n, t) => n + t.seats.length, 0);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = G.spawnEvery / this.demandMult() / (0.6 + 0.012 * seats) * (0.8 + Math.random() * 0.4);
      const active = this.parties.filter((p) => p.state !== 'leaving').length;
      if (this.queue.length < 3 && active < this.tables.length + 3 && this.tutorialDone()) this.spawnParty();
    }
    for (const p of this.parties) {
      if (p.state === 'queued' && p.patience != null) {
        p.patience -= dt;
        p.bubble.setBar(p.patience / p.patienceMax);
        if (p.patience <= 0) {
          p.bubble.set([{ icon: 'icon_angry', n: null }]); p.bubble.setBar(null);
          this.floatAt(this.partyCenter(p).x, this.partyCenter(p).y, 80, 'Tired of waiting', '#ffd6d6', 20);
          this.leaveParty(p, true);
        }
      } else if (p.state === 'reading') {
        p.read -= dt;
        if (p.read <= 0) {
          p.state = 'ordered';
          p.patienceMax = G.patience * this.patienceMult() * (p.vip ? 0.8 : 1) * (this.b.tut < 5 ? 4 : 1);
          p.patience = p.patienceMax;
          this.refreshPartyBubble(p); p.bubble.show(true); p.bubble.pulse();
          p.members.forEach((m) => { m.person.action = null; });
          Sound.play('pop');
        }
      } else if (p.state === 'ordered') {
        p.patience -= dt;
        p.bubble.setBar(p.patience / p.patienceMax);
        if (p.patience <= 0) { this.walkout(p); this.leaveParty(p, true); }
      } else if (p.state === 'eating') {
        p.eat -= dt;
        if (p.eat <= 0) this.finishMeal(p);
      }
      // keep the bubble over the party (or its table)
      const c = p.table && p.state !== 'leaving' && p.state !== 'toTable' ? { x: p.table.x, y: p.table.y } : this.partyCenter(p);
      p.bubble.at(c.x, c.y, p.table && p.state !== 'leaving' ? 175 : 235);
      p.bubble.update(dt);
      p.members.forEach((g) => { if (!g.dead) g.update(dt); });
      if (p.members.every((g) => g.dead)) { p.done = true; p.bubble.destroy(); }
    }
    this.parties = this.parties.filter((p) => !p.done);
  }

  // ===================================================================
  // what the player does here
  interactBranch(dt) {
    const p = this.player; const b = this.b;
    // host stand: seat the next party
    const atHost = this.hostZone.contains(p.x, p.y);
    this.hostZone.setActive(atHost);
    this.seatCool -= dt; this.noTableCool -= dt;
    if (atHost && this.seatCool <= 0) {
      const waiting = this.queue.find((q) => q.state === 'queued');
      if (waiting) {
        this.seatCool = 0.7;
        if (!this.seatNext('player') && this.noTableCool <= 0) { this.noTableCool = 2.5; this.floatAt(p.x, p.y, 120, 'No clean table free', '#ffd6d6', 18); Sound.play('deny'); }
      }
    }
    if (this.dropCool > 0) return;
    for (const t of this.tables) {
      if (!t.zone.contains(p.x, p.y)) continue;
      const party = t.party;
      if (party && party.state === 'ordered') {
        for (const k of this.partyTypes(party)) {
          if (this.partyNeeds(party, k) > 0 && p.countOf(k) > 0) {
            this.dropCool = PLAYER.dropEvery;
            this.serveParty(party, k, p.removeCarry(k));
            Haptic.tap('light');
            if (b.tut === 1 || b.tut === 2) b.tut = 2;
            return;
          }
        }
      }
      if (!party && t.plates.count > 0 && p.carryCount < this.carryCap()) {
        this.dropCool = PLAYER.pickEvery;
        this.takeDirty(t, p);
        Sound.play('pick', { n: p.carryCount }); Haptic.tap('light');
        if (b.tut === 3) b.tut = 4;
        return;
      }
    }
    const atReturn = this.returnZone.contains(p.x, p.y);
    this.returnZone.setActive(atReturn);
    if (atReturn && p.countOf('dirty') > 0) {
      this.dropCool = PLAYER.dropEvery;
      this.returnPlate(p.removeCarry('dirty'));
      Haptic.tap('light');
      if (b.tut === 4 && p.countOf('dirty') === 0) {
        b.tut = 5; this.ensureGoals();
        this.game.events.emit('toast', 'GRA Lounge is open for business!');
        this.confetti(p.x, p.y);
      }
    }
  }

  takeDirty(t, who) {
    const from = t.plates.take(); if (!from) return;
    const im = who.addCarry('dirty'); im.setVisible(false);
    this.fly('item_dirty', from, () => who.stackTopWorld(), { duration: 170, arc: 30, onDone: () => im.active && im.setVisible(true) });
    if (t.plates.count === 0) { this.track('clean', 1); if (who === this.player) this.floatAt(t.x, t.y, 40, 'Clean!', '#bdf7ff', 20); }
  }

  returnPlate(from) {
    const it = this.returnPile.add(1, false)[0];
    if (it) it.setVisible(false);
    this.fly('item_dirty', from, it ? { x: it.x, y: it.y, z: it.pos.y / U } : { x: LOUNGE.dishReturn.x, y: 560, z: 117 }, { duration: 200, arc: 30, onDone: () => { if (it && it.active) it.setVisible(true); } });
    Sound.play('wash');
    // the dishwasher takes them away
    this.time.delayedCall(2600, () => { if (this.returnPile.count > 0) this.returnPile.take(); });
  }

  // ===================================================================
  // party bookings at the event table (the shared "vehicle" mechanic)
  loadVehicle(type, from) {
    const v = this.vehicle; const spot = v.nextSpot();
    this.fly(ITEMS[type].tex, from, spot, { duration: 240, arc: 50, onDone: () => { v.placeDish(type, spot); } });
    Sound.play('drop', { n: 2 });
    const done = v.load(type);
    if (done) {
      const amt = this.vehicleReward(v);
      this.time.delayedCall(400, () => {
        this.vehicleCash.deposit(amt, { x: LOUNGE.eventTable.x, y: LOUNGE.eventTable.y, z: 140 });
        this.floatAt(LOUNGE.eventTable.x, LOUNGE.eventTable.y, 120, `Party paid +${money(amt)}`, '#bdf7a8', 28);
        this.confetti(LOUNGE.eventTable.x, LOUNGE.eventTable.y);
        Sound.play('cash'); Sound.play('win'); Haptic.tap('heavy');
      });
      this.gs.stats.buses++; this.b.stats.vehicles++; this.b.vehicleIntro = true;
      this.addXP(6); this.track('vehicle', 1);
    }
  }
  onVehicleTimeout(v, frac) {
    const part = Math.round(this.vehicleReward(v) * frac * 0.5);
    if (part > 0) this.vehicleCash.deposit(part, { x: LOUNGE.eventTable.x, y: LOUNGE.eventTable.y, z: 140 });
    this.floatAt(LOUNGE.eventTable.x, LOUNGE.eventTable.y, 120, part > 0 ? `Party left early +${money(part)}` : 'The party left!', '#ffd6d6', 24);
    Sound.play('deny');
    this.b.vehicleIntro = true;
  }

  // ===================================================================
  // per frame
  updateBranch(dt) {
    if (this.navDirty) { this.ctx.nav.rebuild(this.colliders); this.navDirty = false; }
    this.hostZone.update(dt); this.returnZone.update(dt);
    this.updateParties(dt);
    for (const t of this.tables) t.zone.update(dt);
    this.updateScreens(dt);
    this.updateLabels(dt);
    if (this.marker.visible) this.marker.update(dt);
  }

  update(time, delta) {
    super.update(time, delta);
    const dt = Math.min(delta / 1000, 0.1);
    const pv = this.playerV();
    this.world.setInside(this.player.y < 1600);
    this.world.update(dt, pv);
    if (this.intro) this.updateIntro(dt); else this.ctx.view.follow(pv, dt);
    for (const pr of Object.values(this.producers)) pr.animate(dt);
    this.ctx.update(dt);
    if (!window.__skip3d) this.ctx.view.render(dt); // tests fast-forward without drawing
  }

  // ===================================================================
  // tutorial & hints (Mama Ada still mentors you)
  computeGoal() {
    const b = this.b; const p = this.player;
    const first = this.parties[0];
    const host = { x: LOUNGE.host.zone.x, y: LOUNGE.host.zone.y, r: 50 };
    const zc = (z) => ({ x: z.cx, y: z.cy });
    if (b.tut === 0) {
      if (first && first.state === 'queued') return { target: host, text: 'Welcome to GRA! Guests are at the door. Stand at the host stand to seat them' };
      return { text: 'Welcome to GRA! Your first guests are arriving…' };
    }
    if (b.tut === 1) {
      if (p.countOf('steak') > 0) b.tut = 2;
      else return { target: zc(this.producers.grill.zone), text: 'Grab grilled steaks from the kitchen pass' };
    }
    if (b.tut === 2) {
      const pt = first && first.table;
      if (first && first.state === 'ordered' && pt) return { target: { ...pt.service, r: 70 }, text: 'Serve the steaks to your guests' };
      if (first && (first.state === 'reading' || first.state === 'toTable')) return { text: 'Your guests are looking at the menu…' };
      if (p.countOf('steak') === 0) return { target: zc(this.producers.grill.zone), text: 'Grab grilled steaks from the kitchen pass' };
    }
    if (b.tut === 3) {
      const t = this.tables.find((x) => !x.party && (x.plates.count > 0 || x.cash.value > 0));
      if (t) return { target: { ...t.service, r: 70 }, text: 'Collect the bill and clear the plates' };
      return { text: 'Let them enjoy their meal…' };
    }
    if (b.tut === 4) return { target: zc(this.returnZone), text: 'Take the plates to the dish return' };
    return this.freeGoal();
  }

  branchFreeGoal() {
    const p = this.player;
    if (p.countOf('dirty') > 0 && p.carryCount >= this.carryCap()) return { target: { x: this.returnZone.cx, y: this.returnZone.cy }, text: 'Your tray is full of plates. Take them to the dish return' };
    const waiting = this.queue.find((q) => q.state === 'queued');
    if (waiting && !this.isUnlocked('host')) {
      if (this.freeTableFor(waiting.size)) return { target: { x: LOUNGE.host.zone.x, y: LOUNGE.host.zone.y }, text: `A party of ${waiting.size} is waiting at the door. Seat them!` };
      const dirty = this.tables.find((t) => !t.party && t.plates.count > 0);
      if (dirty && !this.isUnlocked('busser')) return { target: { ...dirty.service, r: 70 }, text: 'Guests are waiting. Clear a table!' };
    }
    const hungry = this.parties.filter((q) => q.state === 'ordered').sort((a, b) => a.patience - b.patience)[0];
    if (hungry && hungry.patience < hungry.patienceMax * 0.4) {
      const k = this.partyTypes(hungry).find((x) => this.partyNeeds(hungry, x) > 0);
      const what = this.E.itemName(k, 2);
      if (p.countOf(k) > 0) return { target: { ...hungry.table.service, r: 70 }, text: `Hurry! A table is waiting for ${what}` };
      return { text: `Hurry! A table is waiting for ${what}`, arrow: false };
    }
    return null;
  }

  updateGuide(dt) {
    this.goalTimer -= dt;
    if (this.goalTimer <= 0) {
      this.goalTimer = 0.2;
      this.goal = this.computeGoal();
      const text = this.goal ? this.goal.text : '';
      this.registry.set('hint', this.ctx.view.exploring ? 'Exploring. Drag to move around, pinch to zoom, twist to turn. Tap the eye to go back' : text && !this.tutorialDone() ? `Mama Ada: ${text}` : text);
    }
    const g = this.ctx.view.exploring ? null : this.goal;
    const target = g && g.target && g.arrow !== false ? { ...g.target, lift: 1.6 } : null;
    this.ctx.guide.update(target, this.player, this.ctx.time);
  }
}

// =====================================================================
// kitchen stations: dishes pile up on the pass in front of each one
class Producer3D {
  constructor(scene, id, cfg, startCount) {
    const E = scene.E; const ctx = scene.ctx;
    this.scene = scene; this.id = id; this.cfg = cfg; this.type = cfg.type;
    this.interval = cfg.interval; this.cap = cfg.cap; this.timer = 0;
    const bar = cfg.kind === 'bar';
    this.group = bar ? scene.world.buildBar() : scene.world.buildStation(id, cfg).group;
    const zx = cfg.zone ? cfg.zone.x : cfg.x; const zy = cfg.zone ? cfg.zone.y : LOUNGE.stationZoneY;
    this.zone = new E.Zone3D(ctx, { x: zx, y: zy, r: 58 }, { color: 0xffd23f });
    const layout = bar
      ? (i) => E.toV(1550 - (i % 2) * 12, cfg.y - 40 + Math.floor(i / 2) * 16 - 16, 110)
      : (i) => E.toV(cfg.x + ((i % 3) - 1) * 17, LOUNGE.passY + Math.floor(i / 3) * 15 - 8, 99);
    this.pile = new E.Pile3D(ctx, this.type, layout, { maxVisual: this.cap });
    this.pile.add(startCount != null ? Math.min(startCount, this.cap) : cfg.start, false);
    if (bar) {
      this.bartender = new E.Walker(ctx, E.staffLook('bartender', 17), 1680, 520, 100, null);
      this.bartender.person.action = 'mix'; this.bartender.person.faceTo(-Math.PI / 2, true);
      scene.helpers.push({ update: (dt) => { this.bartender.t = (this.bartender.t || 0) + dt; this.bartender.update(dt); this.bartender.person.action = Math.sin(this.bartender.t * 0.4) > 0.3 ? 'mix' : null; } });
    }
    this.rect = { x1: 0, x2: 0, y1: 0, y2: 0 };
  }
  get count() { return this.pile.count; }
  update(dt, speedMult) {
    if (this.pile.count >= this.cap) { this.timer = 0; return; }
    this.timer += dt * speedMult;
    if (this.timer >= this.interval) { this.timer -= this.interval; this.pile.add(1, true); }
  }
  animate() {}
  popIn() {}
}

// =====================================================================
// party bookings: a group sits at the event table and orders big, against the clock
class Booking {
  constructor(scene) {
    this.scene = scene; const E = scene.E; const ctx = scene.ctx;
    this.cfg = { ...LOUNGE.booking, tex: 'booking' };
    const T = LOUNGE.eventTable;
    this.zone = new E.Zone3D(ctx, { x: T.x - 130, y: T.y, r: 70 }, { color: 0xff7ab0 });
    this.zone.setVisible(false);
    this.bubble = new E.Bubble3D(ctx);
    this.state = 'away'; this.timer = this.cfg.firstDelay;
    this.order = null; this.loaded = {}; this.guests = []; this.dishes = []; this.spotIdx = 0;
    this.im = { x: T.x, y: T.y };
  }
  get waiting() { return this.state === 'waiting'; }
  needs(type) { return this.order ? (this.order[type] || 0) - (this.loaded[type] || 0) : 0; }
  get types() { return this.order ? Object.keys(this.order).filter((k) => this.order[k] > 0) : []; }
  get totalItems() { return this.types.reduce((n, k) => n + this.order[k], 0); }
  get loadedItems() { return this.types.reduce((n, k) => n + (this.loaded[k] || 0), 0); }
  refresh() { this.bubble.set(this.types.map((k) => ({ icon: ITEMS[k].icon, n: Math.max(0, this.needs(k)), done: this.needs(k) <= 0 }))); }
  nextSpot() {
    const seats = this.scene.eventSeats; const T = LOUNGE.eventTable;
    const s = seats[this.spotIdx % seats.length]; this.spotIdx++;
    return { x: T.x + (s.x - T.x) * 0.55, y: s.y, z: 80 + Math.floor((this.spotIdx - 1) / seats.length) * 2.5 };
  }
  placeDish(type, spot) {
    if (this.state !== 'waiting' && this.state !== 'done') return;
    const it = this.scene.ctx.batches.alloc(type); it.place(this.scene.E.toV(spot.x, spot.y, spot.z)); this.dishes.push(it);
  }
  arrive() {
    const sc = this.scene; const E = sc.E;
    this.order = sc.makeVehicleOrder(); this.loaded = {}; this.spotIdx = 0;
    this.waitMax = (this.cfg.wait + this.cfg.waitPerItem * this.totalItems) * sc.vehicleWaitMult();
    this.waitLeft = this.waitMax;
    this.guests = sc.eventSeats.map((s, i) => {
      const g = new E.Guest(sc.ctx, Math.floor(Math.random() * 1e6), s.x, s.y, 100);
      g.person.pose = 'sit'; g.person.faceTo(s.yaw, true); g.person.action = i % 2 ? 'talk' : null; g.sync();
      sc.ctx.pop(g.person.group, 0.4 + i * 0.05);
      return g;
    });
    this.refresh(); this.bubble.show(true);
    this.zone.setVisible(true);
    this.state = 'waiting';
    Sound.play('honk'); Haptic.tap('medium');
    sc.game.events.emit('toast', 'A birthday party just sat down at the event table!');
  }
  load(type) {
    this.loaded[type] = (this.loaded[type] || 0) + 1;
    this.refresh(); this.bubble.pulse();
    if (this.types.every((k) => this.needs(k) <= 0)) { this.finish(true); return true; }
    return false;
  }
  finish(ok) {
    this.state = 'done'; this.zone.setVisible(false); this.bubble.setBar(null);
    this.bubble.set([{ icon: ok ? 'icon_party' : 'icon_angry', n: null }]); this.bubble.pulse();
    this.guests.forEach((g) => { g.person.action = ok ? 'cheer' : null; });
    this.scene.time.delayedCall(ok ? 3200 : 1500, () => {
      this.bubble.show(false);
      this.guests.forEach((g) => g.destroy()); this.guests = [];
      this.dishes.forEach((d) => d.destroy()); this.dishes = [];
      this.state = 'away';
      this.timer = this.cfg.cooldown[0] + Math.random() * (this.cfg.cooldown[1] - this.cfg.cooldown[0]);
    });
  }
  update(dt) {
    const T = LOUNGE.eventTable;
    this.bubble.at(T.x, T.y, 200); this.bubble.update(dt);
    this.zone.update(dt);
    this.guests.forEach((g) => g.update(dt));
    if (this.state === 'away') { this.timer -= dt; if (this.timer <= 0 && this.scene.tutorialDone()) this.arrive(); }
    else if (this.state === 'waiting') {
      this.waitLeft -= dt; this.bubble.setBar(this.waitLeft / this.waitMax);
      if (this.waitLeft <= 0) { const frac = this.totalItems ? this.loadedItems / this.totalItems : 0; this.scene.onVehicleTimeout(this, frac); this.finish(false); }
    }
  }
}

// =====================================================================
// staff
function makeWorker(scene, kind, seed, x, y, name, gender) { return new scene.E.Worker(scene.ctx, kind, seed, x, y, name, gender); }

/** Host: greets guests and seats them at clean tables */
class Host {
  constructor(scene) {
    this.scene = scene;
    this.w = makeWorker(scene, 'host', 8, 1240, 1462, 'Ifeoma', 'f');
    this.person = this.w.person; this.cool = 1;
    this.w.fixedAction = true;
  }
  update(dt) {
    const w = this.w; w.update(dt);
    if (w.moving) return;
    w.person.faceTo(Math.PI, false);
    this.cool -= dt;
    if (this.cool <= 0) {
      this.cool = 1.4 / this.scene.staffMult();
      if (this.scene.seatNext('host')) { w.person.action = 'talk'; this.scene.time.delayedCall(1200, () => { w.person.action = null; }); }
    }
  }
}

/** Waiter: brings dishes from the pass to tables that have ordered */
class Waiter {
  constructor(scene, name, seed, gender, home) {
    this.scene = scene; this.w = makeWorker(scene, 'waiter', seed, home.x, home.y, name, gender);
    this.person = this.w.person; this.home = home; this.target = null; this.state = 'idle';
  }
  release(p) { if (p.claimedBy === this) p.claimedBy = null; if (this.target === p) { this.target = null; } }
  update(dt) {
    const w = this.w; const sc = this.scene;
    w.update(dt);
    if (w.moving) return;
    if (this.state === 'idle') {
      const p = sc.parties.filter((q) => q.state === 'ordered' && !q.claimedBy && sc.partyTypes(q).some((k) => sc.partyNeeds(q, k) > 0 && sc.producersOf(k).length)).sort((a, b) => a.patience - b.patience)[0];
      if (!p) { if (!w.near(this.home, 20)) w.goTo(this.home); return; }
      p.claimedBy = this; this.target = p; this.state = 'fetch';
    }
    const p = this.target;
    if (!p || p.state !== 'ordered') { this.state = w.carryCount ? 'serve' : 'idle'; if (!p) { this.target = null; } }
    if (this.state === 'fetch') {
      const needs = sc.partyTypes(p).filter((k) => sc.partyNeeds(p, k) - w.countOf(k) > 0 && sc.producersOf(k).length);
      if (!needs.length || w.carryCount >= sc.staffCarry()) { this.state = 'serve'; return; }
      const src = this.src && needs.includes(this.src.type) ? this.src : (this.src = sc.nearestSource(needs, w));
      const need = src.type;
      if (!w.at({ x: src.zone.cx, y: src.zone.cy }, 14)) return;
      if (w.cool > 0) return;
      if (src.count > 0) {
        w.cool = 0.16;
        const from = src.pile.take();
        const im = w.addCarry(need); im.setVisible(false);
        sc.fly(ITEMS[need].tex, from, () => w.stackTopWorld(), { duration: 180, arc: 30, onDone: () => im.active && im.setVisible(true) });
        if (sc.partyNeeds(p, need) - w.countOf(need) <= 0) this.src = null;
      } else { this.src = null; if (w.carryCount) this.state = 'serve'; }
      return;
    }
    if (this.state === 'serve') {
      if (!p || p.state !== 'ordered') {
        // the table is gone: keep what we carry for the next one
        this.state = 'idle'; if (this.target) this.release(this.target);
        if (w.carryCount) { const q = sc.parties.find((x) => x.state === 'ordered' && !x.claimedBy && sc.partyTypes(x).some((k) => sc.partyNeeds(x, k) > 0 && w.countOf(k) > 0)); if (q) { q.claimedBy = this; this.target = q; this.state = 'serve'; } else { while (w.carryCount) w.removeCarry(); } }
        return;
      }
      if (!w.at(p.table.service, 14)) return;
      if (w.cool > 0) return;
      const k = sc.partyTypes(p).find((x) => sc.partyNeeds(p, x) > 0 && w.countOf(x) > 0);
      if (k) { w.cool = 0.16; sc.serveParty(p, k, w.removeCarry(k)); return; }
      if (sc.partyComplete(p) || !w.carryCount) { this.release(p); this.state = w.carryCount ? 'serve' : 'idle'; }
      else this.state = 'fetch';
    }
  }
}

/** Busser: clears plates, collects bills and banks the money at the till */
class Busser {
  constructor(scene) {
    this.scene = scene; this.w = makeWorker(scene, 'busser', 41, 560, 1300, 'Emeka', 'm');
    this.person = this.w.person; this.bank = 0; this.table = null; this.state = 'idle';
  }
  update(dt) {
    const w = this.w; const sc = this.scene;
    w.update(dt);
    if (w.moving) return;
    if (this.state === 'idle') {
      const t = sc.tables.filter((x) => !x.party && !x.claimed && (x.plates.count > 0 || x.cash.value > 0)).sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
      if (t && w.carryCount < sc.staffCarry()) { t.claimed = true; this.table = t; this.state = 'clear'; }
      else if (w.carryCount) this.state = 'return';
      else if (this.bank > 0) this.state = 'bank';
      else if (!w.near(w.home, 20)) w.goTo(w.home);
      return;
    }
    if (this.state === 'clear') {
      const t = this.table;
      if (!t || t.party) { if (t) t.claimed = false; this.state = 'idle'; return; }
      if (!w.at(t.service, 14)) return;
      if (w.cool > 0) return;
      if (t.cash.value > 0) { const { value, from } = t.cash.takeAll(); this.bank += value; from.forEach((f) => sc.fly('item_cash', f, () => ({ x: w.x, y: w.y, z: 110 }), { duration: 200, arc: 30 })); w.cool = 0.25; return; }
      if (t.plates.count > 0 && w.carryCount < sc.staffCarry()) { w.cool = 0.18; sc.takeDirty(t, w); return; }
      t.claimed = false; this.table = null; this.state = w.carryCount ? 'return' : (this.bank ? 'bank' : 'idle');
      return;
    }
    if (this.state === 'return') {
      const z = sc.returnZone;
      if (!w.at({ x: z.cx, y: z.cy }, 14)) return;
      if (w.cool > 0) return;
      if (w.countOf('dirty') > 0) { w.cool = 0.12; sc.returnPlate(w.removeCarry('dirty')); return; }
      this.state = this.bank ? 'bank' : 'idle';
      return;
    }
    if (this.state === 'bank') {
      const T = LOUNGE.till;
      if (!w.at({ x: T.x - 20, y: T.y - 70 }, 14)) return;
      sc.tillCash.deposit(this.bank, { x: w.x, y: w.y, z: 110 });
      this.bank = 0; this.state = 'idle';
    }
  }
}

/** Event planner: fetches what the party booking still needs */
class Planner {
  constructor(scene) { this.scene = scene; this.w = makeWorker(scene, 'planner', 57, 1560, 1100, 'Tobi', 'f'); this.person = this.w.person; }
  update(dt) {
    const w = this.w; const sc = this.scene; const v = sc.vehicle;
    w.update(dt);
    if (w.moving) return;
    if (!v || !v.waiting) { if (w.carryCount) { while (w.carryCount) w.removeCarry(); } if (!w.near(w.home, 20)) w.goTo(w.home); return; }
    const carried = v.types.some((k) => v.needs(k) > 0 && w.countOf(k) > 0);
    const need = v.types.find((k) => v.needs(k) - w.countOf(k) > 0 && sc.producersOf(k).length);
    if (need && w.carryCount < sc.staffCarry()) {
      const src = sc.producersOf(need).sort((a, b) => b.count - a.count)[0];
      if (!w.at({ x: src.zone.cx, y: src.zone.cy }, 14)) return;
      if (w.cool > 0 || src.count <= 0) { if (src.count <= 0 && carried) { /* deliver what we have */ } else return; }
      if (src.count > 0) { w.cool = 0.2; const from = src.pile.take(); const im = w.addCarry(need); im.setVisible(false); sc.fly(ITEMS[need].tex, from, () => w.stackTopWorld(), { duration: 180, arc: 30, onDone: () => im.active && im.setVisible(true) }); return; }
    }
    if (!carried) return;
    if (!w.at({ x: v.zone.cx, y: v.zone.cy }, 18)) return;
    if (w.cool > 0) return;
    const k = v.types.find((x) => v.needs(x) > 0 && w.countOf(x) > 0);
    if (k) { w.cool = 0.15; sc.loadVehicle(k, w.removeCarry(k)); }
  }
}

/** Manager: keeps an eye on the floor; lets you collect earnings from the map */
class Manager {
  constructor(scene) { this.scene = scene; this.w = makeWorker(scene, 'manager', 63, 600, 1440, 'Mrs. Eze', 'f'); this.person = this.w.person; this.idle = 2; }
  update(dt) {
    const w = this.w; w.update(dt);
    if (w.moving) return;
    this.idle -= dt;
    if (this.idle <= 0) {
      this.idle = 4 + Math.random() * 4;
      const spots = [{ x: 600, y: 1440 }, { x: 1000, y: 1200 }, { x: 1000, y: 900 }, { x: 1400, y: 1250 }];
      w.goTo(spots[Math.floor(Math.random() * spots.length)]);
    }
  }
}
