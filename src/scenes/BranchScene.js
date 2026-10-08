import Phaser from 'phaser';
import { buildBillboards } from '../ads.js';
import { WORLD, BOUNDS, ITEMS, PLAYER, FAME, RUSH, BRANCHES, BRANCH_ORDER } from '../config.js';
import { img } from '../art.js';
import { Rig } from '../entities/Rig.js';
import { Vehicle } from '../entities/Bus.js';
import { CashPile } from '../objects/CashPile.js';
import { Pad } from '../objects/Pad.js';
import { fly } from '../objects/Fly.js';
import { label, money } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { Haptic, Store } from '../platform.js';
import { saveState, freshBranch, pendingNow, priceMult as basePrice, cashCap, passiveRate } from '../state.js';
import { lookFromProfile, possessive } from '../profile.js';

export const ADA_LOOK = {
  skin: 0x8d5a36, shirt: 0xff7a1a, pattern: 0x0f8b8d, pants: 0x2a3550, dress: true,
  hair: 'wrap', hairColor: 0xff7a1a, wrapPattern: 0x0f8b8d, scale: 1.32,
};

/**
 * Everything both branches share: Ada and her tray, machines, unlock pads, cash piles,
 * vehicles with deadlines, fame levels, rush hours, endless goals, saving and travel.
 * Each branch scene adds its own world and customer flow on top.
 */
export default class BranchScene extends Phaser.Scene {
  constructor(key) { super(key); this.branchKey = key; }

  // ---------- lifecycle ----------
  create() {
    this.gs = this.registry.get('gs');
    const key = this.branchKey;
    this.gs.branch = key;
    if (!this.gs.branches[key]) this.gs.branches[key] = freshBranch(key);
    this.b = this.gs.branches[key];
    this.def = BRANCHES[key];
    const st = this.gs;
    Sound.setSfx(st.settings.sfx); Sound.setMusic(st.settings.music); Haptic.set(st.settings.haptic);

    this.producers = {};
    this.colliders = [];
    this.pads = [];
    this.customers = [];
    this.cashPiles = [];
    this.helpers = [];
    this.vehicle = null;
    this.pickCool = 0; this.dropCool = 0; this.drainCool = 0; this.padHold = 0;
    this.vel = { x: 0, y: 0 };
    this.rushLeft = 0;
    this.rushNext = Phaser.Math.Between(RUSH.every[0], RUSH.every[1]);
    this.listeners = [];
    this.signs = [];
    if (this.input.keyboard) this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');

    this.buildWorld();
    [...this.startIds(), ...this.unlockList().map((u) => u.id)].forEach((id) => { if (this.b.unlocked[id]) this.buildUnlock(id, false); });
    this.restore();

    // Ada
    this.player = new Rig(this, this.b.px, this.b.py, this.playerLook());
    (this.b.carry || []).filter((t) => ITEMS[t]).slice(0, this.carryCap()).forEach((type) => { const im = this.player.addCarry(type); im.setScale(0.5); });
    this.resolveCollisions();
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.setBounds(-260, -320, WORLD.w + 520, WORLD.h + 420);
    cam.fadeIn(350, 0, 0, 0);
    this.dust = this.add.particles(0, 0, 'fx_soft', {
      speed: { min: 8, max: 28 }, angle: { min: 180, max: 360 }, scale: { start: 0.18, end: 0.42 }, alpha: { start: 0.5, end: 0 },
      tint: 0xcdb796, lifespan: 420, emitting: false,
    }).setDepth(5);
    this.dustT = 0;

    // guidance
    this.arrow = img(this, 0, 0, 'ui_arrow').setDepth(26000).setVisible(false).setScale(0.5 * 0.8);
    this.pointer = img(this, 0, 0, 'ui_pointer').setDepth(26000).setVisible(false).setScale(0.5 * 0.9);
    this.goal = null; this.goalTimer = 0;

    this.refreshPads();
    this.ensureGoals();
    this.collectAwayEarnings();

    this.onResize();
    this.scale.on('resize', this.onResize, this);

    this.publish();
    this.onGame('buy-upgrade', this.buyUpgrade);
    this.onGame('setting', this.changeSetting);
    this.onGame('reset-game', this.resetGame);
    this.onGame('travel', this.travel);
    this.onGame('buy-branch', this.buyBranch);
    this.onGame('collect-branch', this.collectRemote);
    this.onGame('claim-goal', this.claimGoal);

    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.save() });
    this.visHandler = () => { if (document.hidden) { this.save(); Sound.suspend(); } else Sound.resume(); };
    this.hideHandler = () => this.save();
    document.addEventListener('visibilitychange', this.visHandler);
    window.addEventListener('pagehide', this.hideHandler);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.listeners.forEach(([ev, fn]) => this.game.events.off(ev, fn, this));
      document.removeEventListener('visibilitychange', this.visHandler);
      window.removeEventListener('pagehide', this.hideHandler);
    });

    this.buildSigns();
    this.billboards = buildBillboards(this, this.branchKey);
    this.onGame('profile-set', this.applyProfile);
    this.afterCreate();
    this.registry.set('active', this.branchKey);
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.launch('UI');
  }

  onGame(ev, fn) { this.game.events.on(ev, fn, this); this.listeners.push([ev, fn]); }

  // ---------- the player's own character ----------
  playerLook() { return this.gs.profile ? lookFromProfile(this.gs.profile) : ADA_LOOK; }
  ownerTitle() { return possessive(this.gs.profile && this.gs.profile.name ? this.gs.profile.name : 'Ada'); }

  /** a piece of text painted onto a sign; `fn` builds the text so it can follow the player's name */
  signText(x, y, fn, { size = 16, color = '#fff6e0', stroke = '#5a3816', sw = 4, depth = 30, glow = null } = {}) {
    const t = label(this, x, y, fn(), { size, color, stroke, sw }).setDepth(depth);
    if (glow) t.setShadow(0, 0, glow, 10, true, true);
    this.signs.push({ t, fn });
    return t;
  }
  refreshSigns() { this.signs.forEach(({ t, fn }) => t.active && t.setText(fn())); }

  applyProfile() {
    const old = this.player;
    const carry = old.carryItems.map((c) => c.type);
    this.player = new Rig(this, old.x, old.y, this.playerLook());
    carry.forEach((type) => { const im = this.player.addCarry(type); im.setScale(0.5); });
    old.destroy();
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.refreshSigns();
    this.save();
  }

  // ---------- hooks for branch scenes ----------
  buildSigns() {}
  buildWorld() {}
  buildUnlock() {}
  startIds() { return []; }
  restore() {}
  afterCreate() {}
  saveBranch() {}
  updateBranch() {}
  interactBranch() {}
  computeGoal() { return this.freeGoal(); }
  branchFreeGoal() { return null; }
  makeVehicleOrder() { return {}; }
  tutorialDone() { return true; }
  goalTemplates() { return []; }
  finaleId() { return null; }
  route(a, b) { return [b]; }

  // ---------- shared numbers ----------
  unlockList() { return this.def.unlocks; }
  isUnlocked(id) { return !!this.b.unlocked[id]; }
  unlockCount() { return this.unlockList().filter((u) => this.b.unlocked[u.id]).length; }
  get rushing() { return this.rushLeft > 0; }
  priceMult() { return basePrice(this.branchKey, this.b) * (this.rushing ? RUSH.pay : 1); }
  demandMult() { return FAME.demand(this.b.fame.lvl) * (this.rushing ? RUSH.demand : 1); }
  patienceMult() { return FAME.patience(this.b.fame.lvl) * (1 + 0.1 * this.b.up.patience); }
  vehicleWaitMult() { return Math.sqrt(FAME.patience(this.b.fame.lvl)) * (1 + 0.1 * this.b.up.patience); }
  cookMult() { return 1 / Math.pow(0.9, this.b.up.cook); }
  staffMult() { return 1 + 0.12 * this.b.up.staff; }
  staffSpeed() { return 150 * this.staffMult(); }
  staffCarry() { return 4 + Math.floor(this.b.up.staff * 0.6); }
  carryCap() { return PLAYER.carry + this.b.up.carry; }
  playerSpeed() { return PLAYER.speed * (1 + 0.06 * this.b.up.speed); }
  producersOf(type) { return Object.values(this.producers).filter((p) => p.type === type); }
  itemIcon(type) { return ITEMS[type].icon; }
  extraItems() { return FAME.extraItems(this.b.fame.lvl); }

  addCash(n) {
    this.gs.cash += n;
    this.gs.stats.earned += Math.max(0, n);
    this.b.stats.earned += Math.max(0, n);
    this.registry.set('cash', this.gs.cash);
    if (n > 0) this.track('earn', n);
  }
  spend(n) { this.gs.cash -= n; this.registry.set('cash', this.gs.cash); }

  publish() {
    this.registry.set('cash', this.gs.cash);
    this.registry.set('progress', { n: this.unlockCount(), total: this.unlockList().length });
    this.registry.set('branchName', this.def.name);
    this.publishFame();
    this.publishGoals();
    this.registry.set('rush', 0);
  }
  publishFame() {
    const f = this.b.fame;
    this.registry.set('fame', { lvl: f.lvl, p: f.xp / FAME.xpNeed(f.lvl) });
  }

  onResize() {
    const cam = this.cameras.main;
    const w = this.scale.width, h = this.scale.height;
    cam.setSize(w, h);
    cam.setZoom(Math.min(w / 500, h / 860));
  }

  popObj(o, base = null) {
    const s = base ?? o.scaleX;
    o.setScale(0);
    this.tweens.add({ targets: o, scale: s, duration: 560, ease: 'Back.Out' });
  }

  confetti(x, y) {
    const e = this.add.particles(x, y, 'fx_conf', {
      speed: { min: 180, max: 420 }, angle: { min: 200, max: 340 }, gravityY: 700, rotate: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0.5 }, lifespan: 1300, quantity: 40, emitting: false,
      tint: [0xff7a1a, 0xffd23f, 0x0f8b8d, 0xe33d5c, 0x7b2d8b, 0x2bb34a],
    }).setDepth(27000);
    e.explode(46);
    const ring = this.add.particles(x, y + 30, 'fx_star', {
      speed: { min: 80, max: 160 }, scale: { start: 0.6, end: 0 }, lifespan: 600, quantity: 14, emitting: false, tint: 0xffffff,
    }).setDepth(27000);
    ring.explode(14);
    this.time.delayedCall(1600, () => { e.destroy(); ring.destroy(); });
  }

  floatText(x, y, str, color = '#ffffff', size = 24) {
    const t = label(this, x, y, str, { size, color, stroke: '#1d3b1a', sw: 6 }).setDepth(31000);
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, delay: 250, ease: 'Sine.In', onComplete: () => t.destroy() });
  }

  addCollider(r) { this.colliders.push(r); }
  addCashPile(x, y, opt) { const c = new CashPile(this, x, y, opt); this.cashPiles.push(c); return c; }

  // ---------- vehicle (shuttle / keke) ----------
  buildVehicle(cfg, animate) {
    this.vehicle = new Vehicle(this, cfg);
    this.vehicleCash = this.addCashPile(cfg.cash.x, cfg.cash.y, { maxVisual: 18, unit: 8 * this.def.goalScale });
    if (animate) this.vehicle.timer = 1.5;
  }

  vehicleReward(v) {
    return Math.round(v.types.reduce((n, k) => n + v.order[k] * ITEMS[k].price, 0) * v.cfg.bonus * this.priceMult());
  }

  /** one item goes onto the vehicle (from Ada or a loader) */
  loadVehicle(type, from) {
    const v = this.vehicle;
    fly(this, ITEMS[type].tex, from, { x: v.im.x + Phaser.Math.Between(-50, 50), y: v.im.y - 50 }, { duration: 240, arc: 50 });
    Sound.play('drop', { n: 2 });
    const done = v.load(type);
    if (done) {
      const amt = this.vehicleReward(v);
      this.time.delayedCall(300, () => {
        this.vehicleCash.deposit(amt, { x: v.im.x, y: v.im.y - 60 });
        this.floatText(v.im.x, v.im.y - 190, `+${money(amt)}`, '#bdf7a8', 30);
        Sound.play('cash'); Haptic.tap('heavy');
      });
      this.gs.stats.buses++;
      this.b.stats.vehicles++;
      this.b.vehicleIntro = true;
      this.addXP(4);
      this.track('vehicle', 1);
    }
  }

  onVehicleTimeout(v, frac) {
    const part = Math.round(this.vehicleReward(v) * frac * 0.5);
    if (part > 0) this.vehicleCash.deposit(part, { x: v.im.x, y: v.im.y - 60 });
    this.floatText(v.im.x, v.im.y - 190, part > 0 ? `Too slow! +${money(part)}` : 'Too slow!', '#ffd6d6', 26);
    Sound.play('deny');
    this.b.vehicleIntro = true;
  }

  // ---------- fame, walkouts, streaks ----------
  addXP(n) {
    const f = this.b.fame;
    f.xp += n * this.def.xpScale;
    let up = false;
    while (f.xp >= FAME.xpNeed(f.lvl)) { f.xp -= FAME.xpNeed(f.lvl); f.lvl++; up = true; }
    if (up) {
      Sound.play('win'); Haptic.tap('heavy');
      this.confetti(this.player.x, this.player.y - 90);
      this.game.events.emit('fame-up', { lvl: f.lvl, branch: this.def.name });
      this.game.events.emit('moment', 'fame');
    }
    this.publishFame();
  }

  /** a customer was served and paid */
  served(n = 1) {
    this.gs.stats.served += n;
    this.b.stats.served += n;
    this.b.streak += n;
    this.b.bestStreak = Math.max(this.b.bestStreak, this.b.streak);
    this.addXP(n);
    this.track('serve', n);
    this.track('streak', 0);
    if (this.rushing) this.track('rush', n);
  }

  /** a customer gave up and left */
  walkout(c) {
    this.b.streak = 0;
    this.b.stats.walkouts++;
    this.b.fame.xp = Math.max(0, this.b.fame.xp - 2);
    this.publishFame();
    if (c) {
      c.bubble.set([{ icon: 'icon_angry', n: null }]); c.bubble.show(true); c.bubble.pulse();
      this.floatText(c.x, c.y - 130, 'Walked out!', '#ffd6d6', 20);
    }
    Sound.play('deny'); Haptic.tap('medium');
  }

  // ---------- rush hour ----------
  updateRush(dt) {
    if (!this.tutorialDone() || this.unlockCount() < 3) return;
    if (this.rushLeft > 0) {
      this.rushLeft -= dt;
      if (this.rushLeft <= 0) { this.rushLeft = 0; this.game.events.emit('toast', 'Rush hour is over. Nice work!'); }
      this.registry.set('rush', Math.ceil(this.rushLeft));
      return;
    }
    this.rushNext -= dt;
    if (this.rushNext <= 0) {
      this.rushNext = Phaser.Math.Between(RUSH.every[0], RUSH.every[1]);
      this.rushLeft = RUSH.length;
      this.game.events.emit('rush-start');
      Sound.play('honk'); Haptic.tap('heavy');
      this.cameras.main.shake(200, 0.004);
    }
  }

  // ---------- endless goals ----------
  ensureGoals() {
    if (!this.tutorialDone()) return;
    const b = this.b;
    while (b.goals.length < 3) b.goals.push(this.makeGoal(b.goals.map((g) => g.kind)));
    this.publishGoals();
  }

  makeGoal(exclude = []) {
    const t = this.b.goalSeq++;
    const all = this.goalTemplates().filter((g) => g.ok !== false);
    const pool = all.filter((g) => !exclude.includes(g.kind));
    const tpl = Phaser.Utils.Array.GetRandom(pool.length ? pool : all);
    const target = tpl.target(t);
    const reward = Math.round(60 * this.def.goalScale * Math.pow(1.22, t) * (tpl.weight || 1) / 5) * 5;
    return { kind: tpl.kind, text: tpl.text(target), target, progress: 0, reward, xp: 5 + Math.floor(t / 2), done: false };
  }

  track(kind, n = 1) {
    let changed = false;
    for (const g of this.b.goals) {
      if (g.done || g.kind !== kind) continue;
      if (kind === 'streak') g.progress = Math.max(g.progress, this.b.streak);
      else g.progress += n;
      changed = true;
      if (g.progress >= g.target) {
        g.progress = g.target; g.done = true;
        Sound.play('upgrade');
        this.game.events.emit('toast', `Goal complete: ${g.text}`);
      }
    }
    if (changed) this.publishGoals();
  }

  publishGoals() {
    this.registry.set('goals', { list: this.b.goals.map((g) => ({ ...g })), ready: this.b.goals.filter((g) => g.done).length, on: this.tutorialDone() });
  }

  claimGoal(i) {
    const g = this.b.goals[i];
    if (!g || !g.done) return;
    this.addCash(g.reward);
    this.addXP(g.xp);
    this.floatText(this.player.x, this.player.y - 150, `+${money(g.reward)}`, '#bdf7a8', 28);
    Sound.play('cash'); Haptic.tap('medium');
    this.b.goals.splice(i, 1, this.makeGoal(this.b.goals.map((x) => x.kind)));
    this.publishGoals();
    this.save();
    this.game.events.emit('moment', 'goal');
  }

  // ---------- pads / unlocking ----------
  refreshPads() {
    const visible = this.unlockList().filter((u) => !this.b.unlocked[u.id]).slice(0, 2);
    this.pads = this.pads.filter((p) => { if (!visible.includes(p.def)) { p.destroy(); return false; } return true; });
    visible.forEach((def) => {
      if (!this.pads.find((p) => p.def === def)) this.pads.push(new Pad(this, def, this.b.padPaid[def.id] || 0));
    });
  }

  unlock(id) {
    const b = this.b;
    b.unlocked[id] = true;
    delete b.padPaid[id];
    const def = this.unlockList().find((u) => u.id === id);
    const pad = this.pads.find((p) => p.def.id === id);
    if (pad) { pad.destroy(); this.pads = this.pads.filter((p) => p !== pad); }
    this.buildUnlock(id, true);
    Sound.play('unlock'); Haptic.tap('heavy');
    this.confetti(def.x, def.y - 40);
    this.cameras.main.shake(160, 0.003);
    this.game.events.emit('toast', `${def.name} unlocked!`);
    this.registry.set('progress', { n: this.unlockCount(), total: this.unlockList().length });
    this.time.delayedCall(10, () => this.resolveCollisions());
    this.refreshPads();
    this.ensureGoals();
    if (id === this.finaleId() && !b.finished) {
      b.finished = true;
      this.time.delayedCall(900, () => { Sound.play('win'); this.game.events.emit('finished', { branch: this.branchKey, stats: { ...b.stats } }); });
    } else if (this.unlockCount() >= 3) this.game.events.emit('moment', 'progress');
    this.save();
  }

  // ---------- money from other branches ----------
  collectAwayEarnings() {
    const b = this.b;
    const now = Date.now();
    const away = (now - (b.leftAt || now)) / 1000;
    const earn = pendingNow(this.branchKey, b, now);
    b.pending = 0; b.leftAt = now;
    if (earn > 0 && this.tillCash && away > 30) {
      this.tillCash.deposit(earn);
      const capped = earn >= cashCap(this.branchKey, b);
      this.time.delayedCall(700, () => this.game.events.emit('welcome-back', { earn, minutes: Math.max(1, Math.round(away / 60)), branch: this.def.name, capped }));
    }
    // nudge about money piling up at the other branches
    BRANCH_ORDER.filter((k) => k !== this.branchKey && this.gs.owned[k]).forEach((k, i) => {
      const amt = pendingNow(k, this.gs.branches[k], now);
      if (amt >= 50) this.time.delayedCall(2500 + i * 1500, () => this.game.events.emit('toast', `${BRANCHES[k].name} has ${money(amt)} waiting. Check the map!`));
    });
  }

  /** what the branch screen shows for every branch */
  branchSummary() {
    const now = Date.now();
    return BRANCH_ORDER.map((key) => {
      const d = BRANCHES[key];
      const owned = !!this.gs.owned[key];
      const b = this.gs.branches[key];
      const here = key === this.branchKey;
      const reqMet = !d.requires || !!this.gs.branches.stand.unlocked[d.requires];
      return {
        key, name: d.full, icon: d.icon, owned, here,
        cost: d.cost || 0, reqMet, requiresText: d.requiresText,
        pending: owned && !here ? pendingNow(key, b, now) : 0,
        cap: owned ? cashCap(key, b) : 0,
        rate: owned ? passiveRate(key, b) : 0,
        manager: owned && !!b.unlocked.manager,
        fame: owned ? b.fame.lvl : 0,
        progress: owned ? `${d.unlocks.filter((u) => b.unlocked[u.id]).length}/${d.unlocks.length}` : '',
      };
    });
  }

  collectRemote(key) {
    const b = this.gs.branches[key];
    if (!b || key === this.branchKey || !b.unlocked.manager) return;
    const amt = pendingNow(key, b);
    if (amt <= 0) return;
    b.pending = 0; b.leftAt = Date.now();
    this.addCash(amt);
    this.floatText(this.player.x, this.player.y - 150, `+${money(amt)}`, '#bdf7a8', 28);
    Sound.play('cash'); Haptic.tap('medium');
    this.save();
    this.game.events.emit('branches-changed');
  }

  buyBranch(key) {
    const d = BRANCHES[key];
    if (this.gs.owned[key] || this.gs.cash < d.cost) { Sound.play('deny'); return; }
    if (d.requires && !this.gs.branches.stand.unlocked[d.requires]) { Sound.play('deny'); return; }
    this.spend(d.cost);
    this.gs.owned[key] = true;
    this.gs.branches[key] = freshBranch(key);
    Sound.play('unlock');
    this.travel(key);
  }

  travel(key) {
    if (key === this.branchKey || !this.gs.owned[key] || this.travelling) return;
    this.travelling = true;
    this.save();
    this.b.leftAt = Date.now(); this.b.pending = 0;
    this.gs.branch = key;
    saveState(this.gs);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop('UI'); this.scene.start(key); });
  }

  // ---------- player ----------
  readInput() {
    const ui = this.scene.get('UI');
    let x = 0, y = 0;
    if (ui && ui.modal) return { x, y }; // typing a name must not walk the player around
    if (ui && ui.joy && ui.joy.active) { x = ui.joy.x; y = ui.joy.y; }
    if (this.keys) {
      const k = this.keys;
      const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; }
    }
    return { x, y };
  }

  movePlayer(dt) {
    const inp = this.readInput();
    const sp = this.playerSpeed();
    const k = Math.min(1, dt * 14);
    this.vel.x += (inp.x * sp - this.vel.x) * k;
    this.vel.y += (inp.y * sp - this.vel.y) * k;
    const p = this.player;
    p.x += this.vel.x * dt;
    this.resolveCollisions();
    p.y += this.vel.y * dt;
    this.resolveCollisions();
    p.x = Phaser.Math.Clamp(p.x, BOUNDS.x1, BOUNDS.x2);
    p.y = Phaser.Math.Clamp(p.y, BOUNDS.y1, BOUNDS.y2);
    p.animate(dt, this.vel.x, this.vel.y);
    this.dustT -= dt;
    if (Math.hypot(this.vel.x, this.vel.y) > 60 && this.dustT <= 0) { this.dustT = 0.13; this.dust.emitParticleAt(p.x + Phaser.Math.Between(-6, 6), p.y, 1); }
    if (Math.hypot(inp.x, inp.y) > 0.1 && !this.movedOnce) { this.movedOnce = true; this.game.events.emit('moved'); }
  }

  resolveCollisions() {
    const p = this.player; const r = PLAYER.radius;
    if (!p) return;
    for (const c of this.colliders) {
      const nx = Phaser.Math.Clamp(p.x, c.x1, c.x2), ny = Phaser.Math.Clamp(p.y, c.y1, c.y2);
      const dx = p.x - nx, dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * (r - d); p.y += (dy / d) * (r - d);
        } else {
          const opts = [[p.x - c.x1 + r, -1, 0], [c.x2 - p.x + r, 1, 0], [p.y - c.y1 + r, 0, -1], [c.y2 - p.y + r, 0, 1]].sort((a, b) => a[0] - b[0]);
          p.x += opts[0][1] * opts[0][0]; p.y += opts[0][2] * opts[0][0];
        }
      }
    }
  }

  /** Ada picks one item from a producer (shared by both branches) */
  playerPick(pr) {
    const p = this.player;
    this.pickCool = PLAYER.pickEvery;
    const from = pr.pile.take();
    const im = p.addCarry(pr.type); im.setVisible(false);
    const n = p.carryCount;
    fly(this, ITEMS[pr.type].tex, from, () => p.stackTopWorld(), { duration: 170, arc: 40, onDone: () => { if (im.active) im.setVisible(true); } });
    Sound.play('pick', { n }); Haptic.tap('light');
    if (n >= this.carryCap()) this.floatText(p.x, p.y - 140 - n * 6, 'MAX', '#ffd23f', 20);
  }

  interact(dt) {
    const p = this.player; const st = this.gs;
    this.pickCool -= dt; this.dropCool -= dt; this.drainCool -= dt;

    for (const pr of Object.values(this.producers)) {
      const inside = pr.zone.contains(p.x, p.y);
      pr.zone.setActive(inside);
      if (inside && this.pickCool <= 0 && p.carryCount < this.carryCap() && pr.count > 0) this.playerPick(pr);
    }

    this.interactBranch(dt);

    // load the vehicle
    const v = this.vehicle;
    if (v) {
      const inBay = v.waiting && v.zone.contains(p.x, p.y);
      v.zone.setActive(inBay);
      if (inBay && this.dropCool <= 0) {
        for (const type of v.types) {
          if (v.needs(type) > 0 && p.countOf(type) > 0) {
            this.dropCool = PLAYER.dropEvery;
            this.loadVehicle(type, p.removeCarry(type));
            Haptic.tap('light');
            break;
          }
        }
      }
    }

    for (const cp of this.cashPiles) cp.update(dt, p, (amt) => this.addCash(amt));

    if (this.boothZone) {
      const inBooth = this.boothZone.contains(p.x, p.y);
      this.boothZone.setActive(inBooth);
      if (inBooth !== this.inBooth) {
        this.inBooth = inBooth;
        this.game.events.emit(inBooth ? 'open-upgrades' : 'close-upgrades');
      }
    }

    // pay into unlock pads
    let onPad = null;
    for (const pad of this.pads) { pad.active = pad.contains(p.x, p.y); if (pad.active) onPad = pad; }
    if (onPad) {
      this.padHold += dt;
      if (this.padHold > 0.25 && st.cash > 0) {
        const rate = Math.max(onPad.def.cost / 1.3, 20);
        this.drainAcc = (this.drainAcc || 0) + rate * dt;
        const amt = Math.min(Math.floor(this.drainAcc), st.cash, onPad.remaining);
        if (amt > 0) {
          this.drainAcc -= amt;
          this.spend(amt);
          onPad.paid += amt;
          this.b.padPaid[onPad.def.id] = onPad.paid;
          if (this.drainCool <= 0) {
            this.drainCool = 0.06;
            fly(this, 'item_cash', { x: p.x, y: p.y - 60 }, { x: onPad.x, y: onPad.y }, { duration: 200, arc: 50 });
            Sound.play('tick', { n: this.tickN = (this.tickN || 0) + 1 }); Haptic.tap('light');
          }
          if (onPad.remaining <= 0) { this.drainAcc = 0; this.unlock(onPad.def.id); }
        }
      } else if (this.padHold > 0.25 && st.cash <= 0 && !this.brokeShown) {
        this.brokeShown = true;
        this.floatText(p.x, p.y - 150, 'Need more ₦', '#ffd6d6', 20);
        Sound.play('deny');
      }
    } else { this.padHold = 0; this.brokeShown = false; this.drainAcc = 0; }
  }

  // ---------- guidance ----------
  updateGuide(dt) {
    this.goalTimer -= dt;
    if (this.goalTimer <= 0) {
      this.goalTimer = 0.2;
      this.goal = this.computeGoal();
      const text = this.goal ? this.goal.text : '';
      // Mama Ada is your mentor while you learn the ropes
      this.registry.set('hint', text && !this.tutorialDone() ? `Mama Ada: ${text}` : text);
    }
    const g = this.goal; const p = this.player;
    const target = g && g.target;
    const near = target && Math.hypot(p.x - target.x, p.y - target.y) < (g.r || 55);
    if (target && g.arrow !== false && !near) {
      this.arrow.setVisible(true);
      this.arrow.setPosition(target.x, target.y - (g.lift || 30) - Math.abs(Math.sin(this.time.now / 220)) * 18);
      const dx = target.x - p.x, dy = target.y - p.y; const d = Math.hypot(dx, dy);
      if (d > 230) {
        const a = Math.atan2(dy, dx);
        this.pointer.setVisible(true).setRotation(a);
        const pulse = 74 + Math.sin(this.time.now / 160) * 6;
        this.pointer.setPosition(p.x + Math.cos(a) * pulse, p.y - 40 + Math.sin(a) * pulse * 0.8);
      } else this.pointer.setVisible(false);
    } else { this.arrow.setVisible(false); this.pointer.setVisible(false); }
  }

  /** suggestions that apply in any branch once the tutorial is done */
  freeGoal() {
    const st = this.gs; const p = this.player; const v = this.vehicle;
    if (v && v.waiting && !this.b.vehicleIntro) {
      const t = { x: v.zone.cx, y: v.zone.cy };
      if (p.carryCount === 0) return { target: t, text: `A ${v.cfg.tex === 'm_keke' ? 'keke' : 'shuttle'} wants a big order! Load it before time runs out`, arrow: true };
      return { target: t, text: 'Load the order in the yellow bay' };
    }
    const affordable = this.pads.filter((x) => st.cash >= x.remaining).sort((a, b) => a.remaining - b.remaining)[0];
    if (affordable) return { target: { x: affordable.x, y: affordable.y }, text: `You can unlock ${affordable.def.name}!`, lift: 40 };
    const pile = this.cashPiles.filter((c) => c.value > 0).sort((a, b) => b.value - a.value)[0];
    const next = this.pads[0];
    if (pile && pile.value >= 15 * this.def.goalScale && (!next || st.cash + pile.value >= next.remaining * 0.6)) return { target: { x: pile.x, y: pile.y }, text: 'Collect your cash' };
    const branch = this.branchFreeGoal();
    if (branch) return branch;
    if (this.b.goals.some((g) => g.done)) return { text: 'A goal is complete! Tap Goals to claim your reward' };
    if (next) return { text: `Earn ${money(next.remaining)} more for the ${next.def.name}` };
    return { text: 'Keep the customers happy and level up your fame!' };
  }

  // ---------- upgrades & settings ----------
  upgradeCost(u) { return Math.round(u.base * Math.pow(u.mult, this.b.up[u.id] || 0)); }
  upgradeList() { return this.def.upgrades.filter((u) => !u.needs || this.isUnlocked(u.needs)); }

  buyUpgrade(id) {
    const u = this.def.upgrades.find((x) => x.id === id);
    if (!u) return;
    const lvl = this.b.up[id] || 0;
    if (lvl >= u.max || (u.needs && !this.isUnlocked(u.needs))) return;
    const cost = this.upgradeCost(u);
    if (this.gs.cash < cost) { Sound.play('deny'); return; }
    this.spend(cost);
    this.b.up[id] = lvl + 1;
    Sound.play('upgrade'); Haptic.tap('medium');
    this.confetti(this.player.x, this.player.y - 80);
    this.game.events.emit('upgrades-changed');
    this.save();
  }

  changeSetting(key, value) {
    this.gs.settings[key] = value;
    if (key === 'sfx') Sound.setSfx(value);
    if (key === 'music') Sound.setMusic(value);
    if (key === 'haptic') Haptic.set(value);
    this.save();
  }

  resetGame() {
    this.resetting = true;
    Store.clear();
    window.location.reload();
  }

  // ---------- saving ----------
  save() {
    if (this.resetting || !this.player || this.travelling) return;
    const b = this.b;
    b.prod = {}; for (const [id, p] of Object.entries(this.producers)) b.prod[id] = p.count;
    b.carry = this.player.carryItems.map((c) => c.type);
    b.px = Math.round(this.player.x); b.py = Math.round(this.player.y);
    b.piles = b.piles || {};
    if (this.tillCash) b.piles.till = this.tillCash.value;
    if (this.vehicleCash) b.piles.vehicle = this.vehicleCash.value;
    this.saveBranch();
    b.leftAt = Date.now(); b.pending = 0;
    saveState(this.gs);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    const sub = Math.ceil(dt / 0.034);
    for (let i = 0; i < sub; i++) this.movePlayer(dt / sub);
    this.interact(dt);
    for (const p of Object.values(this.producers)) p.update(dt, this.cookMult());
    if (this.boothZone) this.boothZone.update(dt);
    this.updateRush(dt);
    this.updateBranch(dt);
    if (this.vehicle) this.vehicle.update(dt);
    for (const h of this.helpers) h.update(dt);
    for (const pad of this.pads) pad.update(dt);
    for (const bb of this.billboards) bb.update(dt);
    this.updateGuide(dt);
  }
}
