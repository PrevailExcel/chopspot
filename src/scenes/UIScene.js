import Phaser from 'phaser';
import { img } from '../art.js';
import { label, money, FONT } from '../objects/ui.js';
import { Sound } from '../audio.js';
import { Haptic } from '../platform.js';
import { Rig } from '../entities/Rig.js';
import { SKIN_TONES, OUTFITS, HAIR, defaultProfile, lookFromProfile } from '../profile.js';
import { Install, INSTALL_BONUS } from '../install.js';

const JOY_R = 58;
let titleDone = false; // the title screen shows once per app launch, not on every branch trip

function safeTop() {
  const el = document.getElementById('safe-probe');
  return el ? el.offsetHeight : 0;
}

/** Everything drawn in screen space: HUD, joystick, panels and modals. Units are CSS pixels. */
export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.dpr = this.game.registry.get('dpr') || 1;
    this.gameScene = this.scene.get(this.registry.get('active'));
    this.joy = { active: false, x: 0, y: 0, id: null, bx: 0, by: 0 };
    this.modal = null;
    this.shownCash = this.registry.get('cash') || 0;
    this.targetCash = this.shownCash;
    this.font = (size, weight = 700, color = '#3a2a1a', extra = {}) => ({ fontFamily: FONT, fontSize: `${size}px`, fontStyle: String(weight), color, ...extra });
    this.txt = (x, y, s, size, weight, color, extra) => this.add.text(x, y, s, this.font(size, weight, color, extra)).setResolution(this.dpr * 1.5);

    this.joyG = this.add.graphics().setDepth(10);
    this.buildHud();
    this.buildHint();
    this.buildRush();
    this.buildMoveHint();
    this.setupJoystick();

    const reg = this.registry.events;
    const regOn = (key, fn) => { reg.on('changedata-' + key, fn, this); this.events.once('shutdown', () => reg.off('changedata-' + key, fn, this)); };
    regOn('cash', this.onCash);
    regOn('hint', this.onHint);
    regOn('fame', this.onFame);
    regOn('goals', this.onGoals);
    regOn('rush', this.onRush);
    const ge = this.game.events;
    const on = (ev, fn) => { ge.on(ev, fn, this); this.events.once('shutdown', () => ge.off(ev, fn, this)); };
    on('toast', (t) => this.toast(t));
    on('open-upgrades', this.openUpgrades);
    on('close-upgrades', this.closeUpgrades);
    on('upgrades-changed', () => this.upPanel && this.fillUpgrades());
    on('finished', this.showFinished);
    on('welcome-back', this.showWelcome);
    on('moved', () => this.hideMoveHint());
    on('fame-up', ({ lvl }) => this.toast(`Fame level ${lvl}! More customers are on the way`, 'icon_star', 0xff9a1a));
    on('rush-start', this.rushBanner);
    on('branches-changed', () => { if (this.modal && this.modal.kind === 'map') this.showMap(); });
    on('blur', () => Object.assign(this.joy, { id: null, active: false, x: 0, y: 0 }));
    on('moment', this.onMoment);
    on('lounge-coach', () => this.showLoungeCoach());
    on('explore-state', (onState) => {
      const r = this.eyeBtn.eyeRing; r.clear();
      if (onState) { r.lineStyle(3.5, 0xffd23f, 1); r.strokeCircle(0, 0, 24); }
      this.joyG.setVisible(!onState);
    });
    on('profile-set', () => this.time.delayedCall(1500, () => this.game.events.emit('moment', 'start')));
    const offInstall = Install.onChange(() => this.refreshInstallBtn());
    this.events.once('shutdown', offInstall);

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.layout();
    this.onHint(null, this.registry.get('hint') || '');
    this.onFame(null, this.registry.get('fame'));
    this.onGoals(null, this.registry.get('goals'));
    if (!titleDone) this.showTitle();
    else if (!this.gameScene.gs.profile) this.showCreator();
    const wb = this.registry.get('welcome');
    if (wb) { this.registry.set('welcome', null); this.time.delayedCall(700, () => this.showWelcome(wb)); }
  }

  get W() { return this.scale.width / this.dpr; }
  get H() { return this.scale.height / this.dpr; }
  get gsState() { return this.gameScene.gs; }

  layout() {
    this.dpr = this.game.registry.get('dpr') || 1;
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    cam.setZoom(this.dpr);
    cam.centerOn(this.W / 2, this.H / 2);
    const W = this.W; const top = Math.max(10, safeTop() + 8);
    this.top = top;
    this.cashPill.setPosition(14 + this.cashW / 2, top + 24);
    this.fameC.setPosition(W - 32 - 22 - 10 - this.fameW, top + 4);
    this.gearBtn.setPosition(W - 32, top + 24);
    this.goalsBtn.setPosition(36, top + 82);
    this.mapBtn.setPosition(36, top + 136);
    this.installBtn.setPosition(36, top + 190);
    this.camBtn.setPosition(this.W - 32, top + 82);
    this.eyeBtn.setPosition(this.W - 32, top + 136);
    this.hintC.setPosition(W / 2, top + 76);
    this.layoutRush();
    this.layoutMoveHint();
    if (this.upPanel) this.positionUpgrades();
    if (this.modal && this.modal.relayout) this.modal.relayout();
    if (this.titleC) this.titleC.relayout();
  }

  // ---------- HUD ----------
  buildHud() {
    const c = this.add.container(0, 0).setDepth(100);
    const g = this.add.graphics();
    c.add(g);
    this.cashIcon = img(this, -50, 0, 'icon_cash').setScale(0.5 * 0.62);
    this.cashText = label(this, 14, 1, money(this.shownCash), { size: 25, color: '#ffffff', stroke: null, res: this.dpr * 1.5 });
    c.add([this.cashIcon, this.cashText]);
    this.cashPill = c; this.cashBg = g;
    this.drawCashPill();

    // branch name, fame level and progress to the next level
    this.fameW = 150;
    const fc = this.add.container(0, 0).setDepth(100);
    this.fameG = this.add.graphics();
    this.fameName = this.txt(12, 6, '', 13, 700, '#ffffff');
    this.fameLvl = this.txt(this.fameW - 10, 5, '', 13, 700, '#ffd23f').setOrigin(1, 0);
    fc.add([this.fameG, this.fameName, this.fameLvl]);
    this.fameC = fc;

    this.gearBtn = this.makeRoundButton('gear', () => this.showSettings());
    this.goalsBtn = this.makeRoundButton('icon_goals', () => this.showGoals());
    this.mapBtn = this.makeRoundButton('icon_map', () => this.showMap());
    this.installBtn = this.makeRoundButton('install', () => this.showInstall('button'));
    this.camBtn = this.makeRoundButton('camera', () => this.game.events.emit('camera-toggle'));
    this.camBtn.setVisible(this.registry.get('active') === 'lounge');
    this.eyeBtn = this.makeRoundButton('eye', () => this.game.events.emit('explore-toggle'));
    this.eyeBtn.setVisible(this.registry.get('active') === 'lounge');
    [this.gearBtn, this.goalsBtn, this.mapBtn, this.installBtn, this.camBtn, this.eyeBtn].forEach((b) => b.setDepth(100));
    // "+N1k" tag under the install button
    const tag = this.add.container(0, 22);
    const tg = this.add.graphics(); tg.fillStyle(0x2bb34a, 1); tg.fillRoundedRect(-22, -8, 44, 16, 8); tg.lineStyle(1.5, 0xffffff, 1); tg.strokeRoundedRect(-22, -8, 44, 16, 8);
    tag.add([tg, label(this, 0, 0, `+${money(INSTALL_BONUS).replace(',000', 'k')}`, { size: 11, stroke: null, res: this.dpr * 1.5 })]);
    this.installBtn.add(tag);
    this.refreshInstallBtn();
    // red badge on the goals button
    this.badge = this.add.container(16, -16);
    const bg = this.add.graphics(); bg.fillStyle(0xe33d3d, 1); bg.fillCircle(0, 0, 10); bg.lineStyle(2, 0xffffff, 1); bg.strokeCircle(0, 0, 10);
    this.badgeText = label(this, 0, 0, '1', { size: 13, stroke: null, res: this.dpr * 1.5 });
    this.badge.add([bg, this.badgeText]);
    this.goalsBtn.add(this.badge);
    this.badge.setVisible(false);
  }

  makeRoundButton(kind, onClick, r = 22) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.22); g.fillCircle(0, 3, r);
    g.fillStyle(0x2a3550, 0.85); g.fillCircle(0, 0, r);
    g.lineStyle(2.5, 0xffffff, 0.9); g.strokeCircle(0, 0, r);
    c.add(g);
    if (kind === 'gear') {
      const gg = this.add.graphics();
      gg.fillStyle(0xffffff, 1);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; gg.fillRoundedRect(Math.cos(a) * 9 - 3.5, Math.sin(a) * 9 - 3.5, 7, 7, 2); }
      gg.fillCircle(0, 0, 9); gg.fillStyle(0x2a3550, 1); gg.fillCircle(0, 0, 4);
      c.add(gg);
    } else if (kind === 'eye') {
      const eg = this.add.graphics();
      eg.fillStyle(0xffffff, 1); eg.fillEllipse(0, 0, 26, 15);
      eg.fillStyle(0x2a3550, 1); eg.fillCircle(0, 0, 5.5); eg.fillStyle(0xffd23f, 1); eg.fillCircle(0, 0, 3);
      c.add(eg); c.eyeRing = this.add.graphics(); c.add(c.eyeRing);
    } else if (kind === 'camera') {
      const cg = this.add.graphics();
      cg.fillStyle(0xffffff, 1); cg.fillRoundedRect(-11, -7, 22, 15, 4); cg.fillRect(-5, -10, 9, 4);
      cg.fillStyle(0x2a3550, 1); cg.fillCircle(0, 0.5, 5.2); cg.fillStyle(0xffd23f, 1); cg.fillCircle(0, 0.5, 2.8);
      c.add(cg);
    } else if (kind === 'install') {
      const pg = this.add.graphics();
      pg.lineStyle(2.5, 0xffffff, 1); pg.strokeRoundedRect(-7.5, -12, 15, 24, 3.5);
      pg.fillStyle(0xffffff, 1); pg.fillRect(-2.5, 8, 5, 1.6);
      pg.lineStyle(2.5, 0xffd23f, 1); pg.lineBetween(0, -7, 0, 2); pg.lineBetween(-3.5, -1, 0, 2.5); pg.lineBetween(3.5, -1, 0, 2.5);
      c.add(pg);
    } else c.add(img(this, 0, 0, kind).setScale(0.5 * 0.56));
    c.setSize(r * 2, r * 2);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      if (this.titleOpen) return;
      this.tweens.add({ targets: c, scale: 0.88, duration: 70, yoyo: true }); Sound.unlock(); Sound.play('click'); onClick();
    });
    return c;
  }

  drawCashPill() {
    const w = Math.max(120, this.cashText.width + 76);
    if (w !== this.cashW) { this.cashW = w; if (this.cashPill) this.cashPill.x = 14 + w / 2; }
    const g = this.cashBg; g.clear();
    g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-w / 2 + 2, -20 + 3, w, 40, 20);
    g.fillStyle(0x1d3b1a, 0.85); g.fillRoundedRect(-w / 2, -20, w, 40, 20);
    g.lineStyle(2.5, 0xffffff, 0.9); g.strokeRoundedRect(-w / 2, -20, w, 40, 20);
    this.cashIcon.x = -w / 2 + 22;
    this.cashText.x = 12;
  }

  onCash(_p, v) {
    if (v > this.shownCash + 0.5) this.tweens.add({ targets: this.cashPill, scale: 1.08, duration: 70, yoyo: true });
    this.targetCash = v;
    if (this.modal && this.modal.kind === 'map' && !this.modal.refreshing) {
      this.modal.refreshing = true;
      this.time.delayedCall(300, () => { if (this.modal && this.modal.kind === 'map') this.showMap(); });
    }
  }

  onFame(_p, f) {
    if (!f) return;
    const w = this.fameW;
    this.fameName.setText((this.registry.get('branchName') || '').toUpperCase());
    this.fameLvl.setText(`★ ${f.lvl}`);
    const g = this.fameG; g.clear();
    g.fillStyle(0x000000, 0.2); g.fillRoundedRect(2, 3, w, 40, 12);
    g.fillStyle(0x1d3b1a, 0.85); g.fillRoundedRect(0, 0, w, 40, 12);
    g.lineStyle(2, 0xffffff, 0.85); g.strokeRoundedRect(0, 0, w, 40, 12);
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(10, 25, w - 20, 8, 4);
    if (f.p > 0) { g.fillStyle(0xffd23f, 1); g.fillRoundedRect(10, 25, Math.max(8, (w - 20) * Math.min(1, f.p)), 8, 4); }
  }

  onGoals(_p, g) {
    if (!g) return;
    this.goalsBtn.setVisible(!!g.on);
    this.badge.setVisible(g.ready > 0);
    this.badgeText.setText(String(g.ready));
    if (g.ready > 0 && !this.badgePulse) this.badgePulse = this.tweens.add({ targets: this.badge, scale: 1.25, duration: 400, yoyo: true, repeat: -1 });
    if (g.ready === 0 && this.badgePulse) { this.badgePulse.stop(); this.badgePulse = null; this.badge.setScale(1); }
    if (this.modal && this.modal.kind === 'goals') this.showGoals();
  }

  // ---------- hint banner ----------
  buildHint() {
    const c = this.add.container(0, 0).setDepth(90);
    this.hintBg = this.add.graphics();
    this.hintText = this.txt(0, 0, '', 15, 600, '#3a2a1a', { align: 'center', wordWrap: { width: 260 } }).setOrigin(0.5);
    c.add([this.hintBg, this.hintText]);
    this.hintC = c;
    this.hintH = 0;
    c.setAlpha(0);
  }

  onHint(_p, text) {
    if (text === this.hintStr) return;
    this.hintStr = text;
    if (!text) { this.hintH = 0; this.tweens.add({ targets: this.hintC, alpha: 0, duration: 200 }); this.layoutRush(); return; }
    this.hintText.setWordWrapWidth(Math.min(300, this.W - 130));
    this.hintText.setText(text);
    const w = this.hintText.width + 32, h = this.hintText.height + 16;
    this.hintH = h;
    const g = this.hintBg; g.clear();
    g.fillStyle(0x000000, 0.15); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 14);
    g.fillStyle(0xfff8e6, 0.96); g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(2, 0xff9a3c, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.tweens.killTweensOf(this.hintC);
    this.hintC.setAlpha(1);
    this.hintC.setScale(0.92);
    this.tweens.add({ targets: this.hintC, scale: 1, duration: 220, ease: 'Back.Out' });
    this.layoutRush();
  }

  // ---------- rush hour ----------
  buildRush() {
    const c = this.add.container(0, 0).setDepth(95);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-114, -15, 228, 34, 17);
    g.fillStyle(0xe33d3d, 1); g.fillRoundedRect(-116, -18, 232, 34, 17);
    g.lineStyle(2.5, 0xffffff, 1); g.strokeRoundedRect(-116, -18, 232, 34, 17);
    this.rushText = label(this, 12, -1, '', { size: 14, stroke: null, res: this.dpr * 1.5 });
    c.add([g, img(this, -98, -1, 'icon_fire').setScale(0.5 * 0.42), this.rushText]);
    c.setVisible(false);
    this.rushC = c;
  }
  layoutRush() { if (this.rushC) this.rushC.setPosition(this.W / 2, this.top + 76 + (this.hintH ? this.hintH / 2 + 26 : 0)); }
  onRush(_p, secs) {
    const on = secs > 0;
    this.rushC.setVisible(on);
    if (on) this.rushText.setText(`RUSH HOUR  0:${String(secs).padStart(2, '0')}  ·  pay x1.5`);
  }
  rushBanner() {
    Sound.play('rush');
    const t = label(this, this.W / 2, this.H * 0.4, 'RUSH HOUR!', { size: 46, color: '#ffd23f', stroke: '#7a1010', sw: 10, res: this.dpr * 1.5 }).setDepth(250);
    const s = label(this, this.W / 2, this.H * 0.4 + 44, 'Twice the customers. Pay x1.5!', { size: 17, color: '#ffffff', stroke: '#7a1010', sw: 5, res: this.dpr * 1.5 }).setDepth(250);
    [t, s].forEach((o) => { o.setScale(0.3); this.tweens.add({ targets: o, scale: 1, duration: 380, ease: 'Back.Out' }); this.tweens.add({ targets: o, alpha: 0, y: o.y - 30, delay: 1600, duration: 400, onComplete: () => o.destroy() }); });
  }

  // ---------- "drag to move" ----------
  buildMoveHint() {
    if (this.gameScene.movedOnce || titleDone) return;
    const c = this.add.container(0, 0).setDepth(80);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.18); g.fillCircle(0, 0, JOY_R);
    g.lineStyle(4, 0xffffff, 0.9); g.strokeCircle(0, 0, JOY_R);
    const thumb = this.add.graphics();
    thumb.fillStyle(0xffffff, 0.95); thumb.fillCircle(0, 0, 26);
    thumb.lineStyle(2, 0xcccccc, 1); thumb.strokeCircle(0, 0, 26);
    const txt = label(this, 0, JOY_R + 34, this.registry.get('active') === 'lounge' ? (this.sys.game.device.input.touch ? 'DRAG OR TAP TO MOVE' : 'CLICK, DRAG OR WASD') : (this.sys.game.device.input.touch ? 'DRAG TO MOVE' : 'DRAG OR USE WASD'), { size: 24, stroke: '#2a2a2a', sw: 6, res: this.dpr * 1.5 });
    c.add([g, thumb, txt]);
    this.moveHint = c;
    this.tweens.add({ targets: thumb, x: { from: -26, to: 26 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  layoutMoveHint() { if (this.moveHint) this.moveHint.setPosition(this.W / 2, this.H - 150); }
  hideMoveHint() {
    if (!this.moveHint) return;
    const m = this.moveHint; this.moveHint = null;
    this.tweens.add({ targets: m, alpha: 0, duration: 300, onComplete: () => m.destroy() });
  }

  // ---------- joystick ----------
  setupJoystick() {
    this.input.addPointer(2);
    this.input.on('pointerdown', (p, over) => {
      if (this.modal || this.titleOpen || this.blockJoy) return;
      if (over && over.length) return;
      if (this.joy.id !== null) return;
      Sound.unlock();
      const x = p.x / this.dpr, y = p.y / this.dpr;
      Object.assign(this.joy, { id: p.id, bx: x, by: y, x: 0, y: 0, active: true, tx: x, ty: y });
    });
    this.input.on('pointermove', (p) => {
      if (p.id !== this.joy.id) return;
      if (this.blockJoy) { Object.assign(this.joy, { id: null, active: false, x: 0, y: 0 }); return; }
      const x = p.x / this.dpr, y = p.y / this.dpr;
      let dx = x - this.joy.bx, dy = y - this.joy.by;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) { this.joy.bx = x - (dx / d) * JOY_R; this.joy.by = y - (dy / d) * JOY_R; dx = (dx / d) * JOY_R; dy = (dy / d) * JOY_R; }
      const m = Math.min(1, Math.hypot(dx, dy) / JOY_R);
      if (m < 0.12) { this.joy.x = 0; this.joy.y = 0; } else { const a = Math.atan2(dy, dx); const mm = Math.min(1, (m - 0.12) / 0.7); this.joy.x = Math.cos(a) * mm; this.joy.y = Math.sin(a) * mm; }
      this.joy.tx = this.joy.bx + dx; this.joy.ty = this.joy.by + dy;
    });
    const end = (p) => { if (p.id === this.joy.id) Object.assign(this.joy, { id: null, active: false, x: 0, y: 0 }); };
    this.input.on('pointerup', end);
    this.input.on('pointerupoutside', end);
  }

  drawJoystick() {
    const g = this.joyG; g.clear();
    if (!this.joy.active || this.joy.id === null) return;
    const j = this.joy;
    g.fillStyle(0x000000, 0.12); g.fillCircle(j.bx, j.by + 3, JOY_R);
    g.fillStyle(0xffffff, 0.2); g.fillCircle(j.bx, j.by, JOY_R);
    g.lineStyle(4, 0xffffff, 0.85); g.strokeCircle(j.bx, j.by, JOY_R);
    g.fillStyle(0x000000, 0.15); g.fillCircle(j.tx, j.ty + 3, 26);
    g.fillStyle(0xffffff, 0.95); g.fillCircle(j.tx, j.ty, 26);
    g.lineStyle(2, 0xd0d0d0, 1); g.strokeCircle(j.tx, j.ty, 26);
  }

  // ---------- toast ----------
  toast(text, icon = 'icon_check', color = 0x2bb34a) {
    this.toasts = (this.toasts || []).filter((t) => t.active);
    // never stack more than three; the oldest makes room
    while (this.toasts.length >= 3) { const o = this.toasts.shift(); this.tweens.killTweensOf(o); o.destroy(); }
    this.toasts.forEach((o, i) => { this.tweens.add({ targets: o, y: this.top + 150 + i * 54, duration: 160 }); });
    const slot = this.toasts.length;
    const c = this.add.container(this.W / 2, -40).setDepth(200);
    const maxW = this.W - 40;
    const t = this.txt(14, 0, text, 16, 700, '#ffffff', { align: 'center', wordWrap: { width: maxW - 70 } }).setOrigin(0.5);
    const w = Math.min(maxW, t.width + 64), h = Math.max(44, t.height + 18);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 22);
    g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    g.lineStyle(3, 0xffffff, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    const ic = img(this, -w / 2 + 24, 0, icon).setScale(0.5 * 0.5);
    t.x = 12;
    c.add([g, ic, t]);
    this.toasts.push(c);
    const y = this.top + 150 + slot * 54;
    this.tweens.add({ targets: c, y, duration: 380, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: y - 20, duration: 300, delay: 2300, onComplete: () => c.destroy() });
  }

  // ---------- upgrade panel ----------
  openUpgrades() {
    if (this.upPanel || this.titleOpen) return;
    const c = this.add.container(0, 0).setDepth(150);
    this.upPanel = c;
    this.fillUpgrades();
    this.positionUpgrades();
    c.y = this.H + 20;
    this.tweens.add({ targets: c, y: this.H - this.upH, duration: 320, ease: 'Back.Out' });
    Sound.play('click');
  }
  closeUpgrades() {
    const c = this.upPanel; if (!c) return;
    this.upPanel = null;
    this.tweens.add({ targets: c, y: this.H + 20, duration: 220, ease: 'Sine.In', onComplete: () => c.destroy() });
  }
  positionUpgrades() {
    const c = this.upPanel; if (!c) return;
    c.x = this.W / 2;
    c.y = this.H - this.upH;
  }
  fillUpgrades() {
    const c = this.upPanel; c.removeAll(true);
    const gs = this.gameScene; const b = gs.b; const cash = gs.gs.cash;
    const list = gs.upgradeList();
    const W = Math.min(420, this.W - 16);
    const rowH = Math.min(62, Math.floor((this.H * 0.62 - 70) / list.length)); const headH = 50;
    const H = headH + list.length * rowH + 20;
    this.upH = H;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.25); bg.fillRoundedRect(-W / 2, 0, W, H + 40, 24);
    bg.fillStyle(0xfff8e6, 1); bg.fillRoundedRect(-W / 2, 4, W, H + 40, 24);
    bg.fillStyle(0x2c7be5, 1); bg.fillRoundedRect(-W / 2, 4, W, headH, { tl: 24, tr: 24, bl: 0, br: 0 });
    c.add(bg);
    c.add(this.add.zone(0, H / 2, W, H + 40).setInteractive());
    c.add(label(this, 0, 4 + headH / 2, 'UPGRADES', { size: 21, stroke: '#174b8f', sw: 5, res: this.dpr * 1.5 }));
    list.forEach((u, i) => {
      const y = headH + 12 + i * rowH + rowH / 2;
      const lvl = b.up[u.id] || 0; const maxed = lvl >= u.max;
      const cost = gs.upgradeCost(u);
      const can = !maxed && cash >= cost;
      const row = this.add.graphics();
      row.fillStyle(i % 2 ? 0xffffff : 0xfdf0d5, 1); row.fillRoundedRect(-W / 2 + 10, y - rowH / 2 + 3, W - 20, rowH - 6, 14);
      c.add(row);
      c.add(img(this, -W / 2 + 38, y, u.icon).setScale(0.5 * 0.56));
      c.add(this.txt(-W / 2 + 66, y - 17, u.name, 15, 700));
      c.add(this.txt(-W / 2 + 66, y + 2, `${u.desc}  ·  Lv ${lvl}/${u.max}`, 11.5, 500, '#7a6450'));
      const bar = this.add.graphics();
      const bw0 = 110;
      bar.fillStyle(0xe2d5bb, 1); bar.fillRoundedRect(-W / 2 + 66, y + 18, bw0, 5, 2.5);
      if (lvl) { bar.fillStyle(0xff9a1a, 1); bar.fillRoundedRect(-W / 2 + 66, y + 18, Math.max(5, bw0 * lvl / u.max), 5, 2.5); }
      c.add(bar);
      const bw = 92, bh = 38, bx = W / 2 - 18 - bw / 2;
      const btn = this.add.container(bx, y);
      const bgb = this.add.graphics();
      const col = maxed ? 0x9aa3ad : can ? 0x2bb34a : 0xc9b99c;
      bgb.fillStyle(0x000000, 0.18); bgb.fillRoundedRect(-bw / 2, -bh / 2 + 3, bw, bh, 12);
      bgb.fillStyle(col, 1); bgb.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
      btn.add([bgb, label(this, 0, 0, maxed ? 'MAX' : money(cost), { size: 16, stroke: null, res: this.dpr * 1.5 })]);
      btn.setSize(bw, bh).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        if (maxed) return;
        if (!can) { Sound.play('deny'); this.tweens.add({ targets: btn, x: bx + 6, duration: 50, yoyo: true, repeat: 2 }); return; }
        this.tweens.add({ targets: btn, scale: 0.9, duration: 70, yoyo: true });
        this.game.events.emit('buy-upgrade', u.id);
      });
      c.add(btn);
    });
    this.upCashSeen = cash;
  }

  // ---------- modals ----------
  openModal(build, kind = null) {
    this.closeModal(true);
    const c = this.add.container(0, 0).setDepth(300);
    const dim = this.add.rectangle(0, 0, 4000, 4000, 0x0d1a0b, 0.55).setOrigin(0).setInteractive();
    c.add(dim);
    const card = this.add.container(0, 0);
    c.add(card);
    const m = { c, dim, card, kind };
    m.relayout = () => { card.setPosition(this.W / 2, this.H / 2); };
    this.modal = m;
    build(card, m);
    m.relayout();
    if (!this.reopening) {
      card.setScale(0.6); c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 180 });
      this.tweens.add({ targets: card, scale: 1, duration: 340, ease: 'Back.Out' });
    }
    Object.assign(this.joy, { id: null, active: false, x: 0, y: 0 });
    return m;
  }
  closeModal(instant = false) {
    const m = this.modal; if (!m) return;
    this.modal = null;
    if (m.onClose) m.onClose();
    if (instant) { m.c.destroy(); return; }
    this.tweens.add({ targets: m.c, alpha: 0, duration: 160, onComplete: () => m.c.destroy() });
  }
  card(card, w, h, title, color = 0xff7a1a) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 26);
    g.fillStyle(0xfff8e6, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, 60, { tl: 26, tr: 26, bl: 0, br: 0 });
    card.add(g);
    if (title) card.add(label(this, 0, -h / 2 + 30, title, { size: 24, stroke: '#00000044', sw: 0, res: this.dpr * 1.5 }));
  }
  closeX(card, w, h) {
    const b = this.add.container(w / 2 - 28, -h / 2 + 30);
    const g = this.add.graphics(); g.fillStyle(0xffffff, 0.25); g.fillCircle(0, 0, 16);
    g.lineStyle(3.5, 0xffffff, 1); g.lineBetween(-6, -6, 6, 6); g.lineBetween(6, -6, -6, 6);
    b.add(g); b.setSize(36, 36).setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => { Sound.play('click'); this.closeModal(); });
    card.add(b);
  }
  bigButton(card, x, y, text, color, onClick, w = 200, h = 52, size = 22) {
    const b = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(25).color, 1); g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h / 2 - 4, 10);
    const t = label(this, 0, -1, text, { size, stroke: '#00000033', sw: 3, res: this.dpr * 1.5 });
    b.add([g, t]);
    b.setSize(w, h).setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => { Sound.unlock(); Sound.play('click'); this.tweens.add({ targets: b, scale: 0.92, duration: 70, yoyo: true, onComplete: onClick }); });
    card.add(b);
    return b;
  }

  // ---------- goals ----------
  showGoals() {
    const data = this.registry.get('goals');
    if (!data || !data.on) return;
    const reopen = this.modal && this.modal.kind === 'goals';
    this.reopening = reopen;
    this.openModal((card) => {
      const w = Math.min(360, this.W - 24); const rowH = 92; const h = 90 + data.list.length * rowH + 40;
      this.card(card, w, h, 'Goals', 0xff9a1a);
      this.closeX(card, w, h);
      card.add(this.txt(0, -h / 2 + 76, 'Finish a goal and a harder one takes its place.', 12.5, 500, '#7a6450').setOrigin(0.5));
      data.list.forEach((g, i) => {
        const y = -h / 2 + 96 + i * rowH + rowH / 2;
        const bg = this.add.graphics();
        bg.fillStyle(g.done ? 0xe4f8e6 : 0xffffff, 1); bg.fillRoundedRect(-w / 2 + 14, y - rowH / 2 + 5, w - 28, rowH - 10, 16);
        bg.lineStyle(2, g.done ? 0x2bb34a : 0xeadfc8, 1); bg.strokeRoundedRect(-w / 2 + 14, y - rowH / 2 + 5, w - 28, rowH - 10, 16);
        card.add(bg);
        card.add(this.txt(-w / 2 + 28, y - 30, g.text, 14.5, 700, '#3a2a1a', { wordWrap: { width: w - 150 } }));
        const pw = w - 160;
        const bar = this.add.graphics();
        bar.fillStyle(0xeadfc8, 1); bar.fillRoundedRect(-w / 2 + 28, y + 14, pw, 10, 5);
        bar.fillStyle(g.done ? 0x2bb34a : 0xff9a1a, 1); bar.fillRoundedRect(-w / 2 + 28, y + 14, Math.max(10, pw * Math.min(1, g.progress / g.target)), 10, 5);
        card.add(bar);
        const prog = g.kind === 'earn' ? `${money(g.progress)} / ${money(g.target)}` : `${g.progress} / ${g.target}`;
        card.add(this.txt(-w / 2 + 28, y + 26, prog, 11.5, 600, '#7a6450'));
        if (g.done) {
          this.bigButton(card, w / 2 - 70, y + 4, `+${money(g.reward)}`, 0x2bb34a, () => { this.game.events.emit('claim-goal', i); Haptic.tap('medium'); }, 100, 44, 16);
          card.add(this.txt(w / 2 - 70, y - 30, 'CLAIM', 11, 700, '#2bb34a').setOrigin(0.5, 0));
        } else {
          card.add(img(this, w / 2 - 70, y - 4, 'icon_cash').setScale(0.5 * 0.5));
          card.add(this.txt(w / 2 - 70, y + 18, money(g.reward), 14, 700, '#2f7d4c').setOrigin(0.5, 0));
        }
      });
    }, 'goals');
    this.reopening = false;
  }

  // ---------- branches ----------
  showMap() {
    const list = this.gameScene.branchSummary();
    const cash = this.gameScene.gs.cash;
    const reopen = this.modal && this.modal.kind === 'map';
    this.reopening = reopen;
    this.openModal((card) => {
      const w = Math.min(370, this.W - 20); const rowH = 158; const h = 84 + list.length * rowH + 20;
      this.card(card, w, h, 'Your Branches', 0x0f8b8d);
      this.closeX(card, w, h);
      list.forEach((br, i) => {
        const y = -h / 2 + 76 + i * rowH + rowH / 2;
        const bg = this.add.graphics();
        bg.fillStyle(br.here ? 0xe0f4f4 : 0xffffff, 1); bg.fillRoundedRect(-w / 2 + 12, y - rowH / 2 + 6, w - 24, rowH - 12, 18);
        bg.lineStyle(2, br.here ? 0x0f8b8d : 0xeadfc8, 1); bg.strokeRoundedRect(-w / 2 + 12, y - rowH / 2 + 6, w - 24, rowH - 12, 18);
        card.add(bg);
        const left = -w / 2 + 26;
        card.add(img(this, left + 24, y - 38, br.icon).setScale(0.5 * 0.7));
        card.add(this.txt(left + 54, y - 58, br.name, 16, 700, '#3a2a1a'));
        if (!br.owned) {
          card.add(this.txt(left + 54, y - 36, br.reqMet ? (br.pitch || 'Open a buka at Ariaria Market: table service with jollof, noodles, akara, bread and malt.') : br.requiresText, 12, 500, '#7a6450', { wordWrap: { width: w - 110 } }));
          const can = br.reqMet && cash >= br.cost;
          const b = this.bigButton(card, 0, y + 38, `Open for ${money(br.cost)}`, can ? 0x2bb34a : 0xc9b99c, () => {
            if (!can) { Sound.play('deny'); return; }
            this.closeModal(true);
            this.game.events.emit('buy-branch', br.key);
          }, w - 70, 46, 18);
          if (!can) b.setAlpha(0.9);
          return;
        }
        const perMin = Math.round(br.rate * 60);
        card.add(this.txt(left + 54, y - 36, `★ ${br.fame}   ·   ${br.progress} built`, 12.5, 600, '#7a6450'));
        const info = br.here
          ? (perMin > 0 ? `Your staff earn about ${money(perMin)}/min here while you're away (cash box holds ${money(br.cap)}).` : 'Hire staff here so it keeps earning while you\'re away.')
          : (perMin > 0 ? `Earning ${money(perMin)}/min while you're away. ${br.manager ? 'Your manager can send it to you.' : 'Collect it at the till when you visit.'}` : 'No staff hired yet, so it isn\'t earning while you\'re away.');
        card.add(this.txt(left, y - 14, info, 12, 500, '#3a2a1a', { wordWrap: { width: w - 52 } }));
        if (br.here) {
          card.add(this.txt(0, y + 42, 'YOU ARE HERE', 14, 700, '#0f8b8d').setOrigin(0.5));
          return;
        }
        // waiting cash
        const capFull = br.pending >= br.cap;
        card.add(img(this, left + 14, y + 40, 'icon_cash').setScale(0.5 * 0.45));
        card.add(this.txt(left + 34, y + 30, money(br.pending), 16, 700, capFull ? '#c0392b' : '#2f7d4c'));
        if (capFull) card.add(this.txt(left + 34, y + 49, 'Cash box full!', 10.5, 600, '#c0392b'));
        const bw = 92;
        if (br.manager) {
          this.bigButton(card, w / 2 - 26 - bw * 1.5 - 8, y + 40, 'Collect', br.pending > 0 ? 0x2bb34a : 0xc9b99c, () => this.game.events.emit('collect-branch', br.key), bw, 40, 16);
        }
        this.bigButton(card, w / 2 - 26 - bw / 2, y + 40, 'Go there', 0x0f8b8d, () => { this.closeModal(true); this.game.events.emit('travel', br.key); }, bw, 40, 16);
      });
    }, 'map');
    this.reopening = false;
  }

  // ---------- title ----------
  showTitle() {
    this.titleOpen = true;
    this.scene.pause(this.registry.get('active'));
    const c = this.add.container(0, 0).setDepth(500);
    const bg = this.add.graphics();
    const draw = () => {
      bg.clear();
      bg.fillGradientStyle(0xff9a3c, 0xff9a3c, 0xe8452c, 0xb81e4a, 1);
      bg.fillRect(0, 0, this.W, this.H);
      bg.fillStyle(0xffffff, 0.08);
      for (let i = 0; i < 14; i++) bg.fillCircle((i * 97) % (this.W + 40), (i * 173) % (this.H + 40), 30 + (i % 4) * 18);
    };
    draw();
    const hitAll = this.add.zone(0, 0, 4000, 4000).setOrigin(0).setInteractive();
    c.add([bg, hitAll]);
    const logo = this.add.container(0, 0);
    const puffs = [img(this, -118, -58, 'icon_puff').setScale(0.5 * 1.3), img(this, 122, -62, 'icon_zobo').setScale(0.5 * 1.4)];
    const t0 = label(this, 0, -52, 'ABA', { size: 30, color: '#ffe066', stroke: '#7a1a10', sw: 8, res: this.dpr * 1.5 });
    const t1 = label(this, 0, -8, 'Chop Spot', { size: 58, color: '#fff6e0', stroke: '#7a1a10', sw: 10, res: this.dpr * 1.5 });
    const t2 = label(this, 0, 46, 'Grow Your Restaurant', { size: 15, color: '#ffe066', stroke: '#7a1a10', sw: 5, res: this.dpr * 1.5 });
    logo.add([...puffs, t0, t1, t2]);
    c.add(logo);
    this.tweens.add({ targets: puffs[0], y: -68, angle: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: puffs[1], y: -74, angle: 8, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: logo, scale: 1.04, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const returning = !this.registry.get('isNew');
    const btnC = this.add.container(0, 0); c.add(btnC);
    const start = () => {
      if (!this.titleOpen) return;
      this.titleOpen = false; titleDone = true;
      Sound.unlock();
      Haptic.tap('medium');
      this.scene.resume(this.registry.get('active'));
      if (Install.claimBonus()) this.time.delayedCall(250, () => this.showInstallBonus());
      else if (!this.gameScene.gs.profile) this.time.delayedCall(250, () => this.showCreator());
      else this.time.delayedCall(1500, () => this.game.events.emit('moment', 'start'));
      this.tweens.add({ targets: c, alpha: 0, duration: 350, onComplete: () => { c.destroy(); this.titleC = null; } });
    };
    this.bigButton(btnC, 0, 0, returning ? 'CONTINUE' : 'PLAY', 0x2bb34a, start, 220);
    btnC.add(label(this, 0, 52, 'Grow your restaurant business', { size: 15, color: '#fff6e0', stroke: null, res: this.dpr * 1.5 }));
    hitAll.on('pointerdown', start);
    c.relayout = () => { draw(); logo.setPosition(this.W / 2, this.H * 0.36); btnC.setPosition(this.W / 2, this.H * 0.66); };
    c.relayout();
    this.titleC = c;
  }

  showSettings() {
    const s = this.gameScene.gs.settings;
    this.openModal((card) => {
      const w = Math.min(320, this.W - 40), h = 500;
      this.card(card, w, h, 'Settings', 0x2a3550);
      // graphics quality for the 3D restaurant (Auto picks from the phone)
      const gy = -h / 2 + 96 + 3 * 54;
      card.add(this.txt(-w / 2 + 26, gy, 'Graphics', 18, 600).setOrigin(0, 0.5));
      const names = { auto: 'Auto', high: 'High', mid: 'Medium', low: 'Low' };
      let cur = 'auto'; try { cur = localStorage.getItem('abachop.gfx') || 'auto'; } catch (e) { /* no storage */ }
      const gb = this.bigButton(card, w / 2 - 70, gy, names[cur] || 'Auto', 0x0f8b8d, () => {
        const order = ['auto', 'high', 'mid', 'low'];
        cur = order[(order.indexOf(cur) + 1) % order.length];
        try { if (cur === 'auto') localStorage.removeItem('abachop.gfx'); else localStorage.setItem('abachop.gfx', cur); } catch (e) { /* no storage */ }
        gb.list[1].setText(names[cur]);
        this.game.events.emit('graphics', cur);
      }, 110, 40, 16);
      this.bigButton(card, 0, -h / 2 + 96 + 4 * 54 + 8, 'Change character', 0xff7a1a, () => this.showCreator(), 220, 46, 18);
      const rows = [['sfx', 'Sound effects'], ['music', 'Music'], ['haptic', 'Vibration']];
      rows.forEach(([key, name], i) => {
        const y = -h / 2 + 96 + i * 54;
        card.add(this.txt(-w / 2 + 26, y, name, 18, 600).setOrigin(0, 0.5));
        const sw = this.add.container(w / 2 - 50, y);
        const g = this.add.graphics();
        const knob = this.add.graphics();
        const draw = () => {
          const on = s[key];
          g.clear(); g.fillStyle(on ? 0x2bb34a : 0xc9b99c, 1); g.fillRoundedRect(-26, -15, 52, 30, 15);
          knob.clear(); knob.fillStyle(0xffffff, 1); knob.fillCircle(on ? 11 : -11, 0, 12);
        };
        draw();
        sw.add([g, knob]); sw.setSize(60, 36).setInteractive({ useHandCursor: true });
        sw.on('pointerdown', () => { this.game.events.emit('setting', key, !s[key]); draw(); Sound.play('click'); });
        card.add(sw);
      });
      this.bigButton(card, 0, h / 2 - 96, 'Done', 0x2bb34a, () => this.closeModal(), 180);
      const reset = label(this, 0, h / 2 - 34, 'Reset progress', { size: 15, color: '#c0392b', stroke: null, res: this.dpr * 1.5 });
      reset.setInteractive({ useHandCursor: true });
      reset.on('pointerdown', () => this.confirmReset());
      card.add(reset);
    }, 'settings');
  }

  confirmReset() {
    this.openModal((card) => {
      const w = Math.min(320, this.W - 40), h = 260;
      this.card(card, w, h, 'Start over?', 0xc0392b);
      card.add(this.txt(0, -34, 'All branches, staff and money\nwill be wiped. This cannot be undone.', 15, 500, '#3a2a1a', { align: 'center' }).setOrigin(0.5));
      this.bigButton(card, -70, 64, 'Cancel', 0x7d8a96, () => this.closeModal(), 120);
      this.bigButton(card, 70, 64, 'Reset', 0xc0392b, () => this.game.events.emit('reset-game'), 120);
    });
  }

  showWelcome({ earn, minutes, branch, capped }) {
    if (this.titleOpen || (this.modal && this.modal.kind === 'creator')) { this.time.delayedCall(400, () => this.showWelcome({ earn, minutes, branch, capped })); return; }
    const m = this.openModal((card) => {
      const w = Math.min(320, this.W - 40), h = capped ? 330 : 300;
      this.card(card, w, h, 'Welcome back!', 0x7b2d8b);
      card.add(img(this, 0, -h / 2 + 108, 'icon_cash').setScale(0.5 * 1.1));
      const mins = minutes >= 120 ? `${Math.round(minutes / 60)} hours` : `${minutes} min`;
      card.add(this.txt(0, -h / 2 + 160, `Your staff at ${branch} kept\nselling for ${mins}.`, 15, 500, '#3a2a1a', { align: 'center' }).setOrigin(0.5));
      card.add(label(this, 0, -h / 2 + 202, `+${money(earn)} at the till`, { size: 24, color: '#2bb34a', stroke: null, res: this.dpr * 1.5 }));
      if (capped) card.add(this.txt(0, -h / 2 + 232, 'The cash box filled up! Upgrade it\nat the Upgrade Desk to hold more.', 12, 600, '#c0392b', { align: 'center' }).setOrigin(0.5));
      this.bigButton(card, 0, h / 2 - 46, 'Nice!', 0x2bb34a, () => this.closeModal(), 160);
    });
    m.onClose = () => this.time.delayedCall(500, () => this.game.events.emit('moment', 'back'));
    Sound.play('cash');
  }

  showFinished({ branch, stats }) {
    const stand = branch === 'stand';
    const lounge = branch === 'lounge';
    const showMapBtn = branch !== 'lounge';
    this.openModal((card) => {
      const w = Math.min(330, this.W - 32), h = 430;
      this.card(card, w, h, stand ? 'The talk of Aba!' : lounge ? 'The finest spot in Aba!' : 'Ariaria is booming!', 0xff4fa3);
      card.add(img(this, 0, -126, stand ? 'icon_sign' : lounge ? 'icon_fountain' : 'icon_bulb').setScale(0.5 * 1.2));
      const msg = stand
        ? `${this.ownerTitle()} spot is now the most famous\npuff-puff & zobo spot on Faulks Road.\nOpen your next branch from the map!`
        : lounge
          ? 'GRA\'s most talked-about restaurant.\nBookings every night. Fame keeps\nrising. How far can you go?'
          : 'Every table is full, every night.\nFame keeps rising, and so do the\ncustomers. Your next branch is on the map!';
      card.add(this.txt(0, -50, msg, 14.5, 500, '#3a2a1a', { align: 'center' }).setOrigin(0.5));
      const lines = [['Guests served', stats.served], [stand ? 'Shuttle orders' : lounge ? 'Party bookings' : 'Keke orders', stats.vehicles], ['Earned here', money(stats.earned)]];
      lines.forEach(([k, v], i) => {
        const y = 14 + i * 28;
        card.add(this.txt(-w / 2 + 30, y, k, 15, 500, '#7a6450').setOrigin(0, 0.5));
        card.add(this.txt(w / 2 - 30, y, String(v), 16, 700).setOrigin(1, 0.5));
      });
      if (showMapBtn) {
        this.bigButton(card, 0, h / 2 - 100, 'Open the map', 0x0f8b8d, () => this.showMap(), 210);
        const k = label(this, 0, h / 2 - 38, 'Keep cooking', { size: 16, color: '#7a6450', stroke: null, res: this.dpr * 1.5 });
        k.setInteractive({ useHandCursor: true }); k.on('pointerdown', () => this.closeModal());
        card.add(k);
      } else this.bigButton(card, 0, h / 2 - 50, 'Keep cooking', 0x2bb34a, () => this.closeModal(), 210);
    });
    const e = this.add.particles(0, -20, 'fx_conf', {
      x: { min: 0, max: this.W }, speedY: { min: 120, max: 260 }, speedX: { min: -40, max: 40 }, rotate: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0.6 }, lifespan: 3200, frequency: 60, tint: [0xff7a1a, 0xffd23f, 0x0f8b8d, 0xe33d5c, 0x7b2d8b, 0x2bb34a],
    }).setDepth(400);
    this.time.delayedCall(3500, () => e.stop());
    this.time.delayedCall(8000, () => e.destroy());
  }

  // ---------- how to play in the 3D restaurant (shown once) ----------
  showLoungeCoach() {
    if (this.titleOpen || this.modal) { this.time.delayedCall(600, () => this.showLoungeCoach()); return; }
    this.openModal((card) => {
      const w = Math.min(340, this.W - 28), h = 470;
      this.card(card, w, h, 'How to play here', 0x1d4537);
      const rows = [
        ['walk', 'Walk', 'Drag anywhere to walk, or just tap where you want to go.'],
        ['ring', 'Use things', 'Step into a glowing ring to seat guests, pick up dishes and serve. Clear plates and wash them at the kitchen sink. Follow the arrow.'],
        ['look', 'Look around', 'Pinch to zoom. Twist two fingers to turn. Tap the eye button to explore the whole place.'],
      ];
      rows.forEach(([kind, title, body], i) => {
        const y = -h / 2 + 110 + i * 102;
        const g = this.add.graphics({ x: -w / 2 + 46, y });
        g.fillStyle(0xe8f1ec, 1); g.fillCircle(0, 0, 28);
        if (kind === 'walk') { g.fillStyle(0x1d4537, 1); g.fillCircle(0, -6, 7); g.fillRoundedRect(-5, 0, 10, 16, 4); g.lineStyle(3, 0xffb21a, 1); g.strokeCircle(0, -6, 13); }
        else if (kind === 'ring') { g.lineStyle(4, 0xffd23f, 1); g.strokeEllipse(0, 6, 40, 16); g.fillStyle(0x1d4537, 1); g.fillCircle(0, -10, 6); g.fillRoundedRect(-5, -5, 10, 13, 4); }
        else { g.fillStyle(0x1d4537, 1); g.fillCircle(-9, 4, 6); g.fillCircle(9, -4, 6); g.lineStyle(3, 0xffb21a, 1); g.beginPath(); g.arc(0, 0, 18, -2.6, -0.6); g.strokePath(); g.beginPath(); g.arc(0, 0, 18, 0.5, 2.5); g.strokePath(); }
        card.add(g);
        card.add(this.txt(-w / 2 + 88, y - 26, title, 17, 700, '#1d4537'));
        card.add(this.txt(-w / 2 + 88, y - 4, body, 13, 500, '#3a2a1a', { wordWrap: { width: w - 110 } }));
      });
      this.bigButton(card, 0, h / 2 - 50, 'Let\'s go', 0xff7a1a, () => this.closeModal(), 200);
    }, 'coach');
  }

  // ---------- getting the game onto the home screen ----------
  refreshInstallBtn() {
    if (!this.installBtn) return;
    const show = !!Install.mode;
    this.installBtn.setVisible(show);
    if (show && !this.installPulse) {
      this.installPulse = this.tweens.add({ targets: this.installBtn, scale: 1.12, duration: 380, yoyo: true, repeat: 2, repeatDelay: 120, loop: -1, loopDelay: 9000 });
    }
  }

  onMoment(moment) {
    if (!Install.shouldAsk(moment)) return;
    // wait for the current moment (confetti, a modal) to settle before asking
    this.time.delayedCall(moment === 'start' ? 300 : 1400, () => {
      if (this.modal || this.titleOpen || this.upPanel || !Install.shouldAsk(moment)) return;
      Install.markAsked(moment);
      this.showInstall(moment);
    });
  }

  /** small drawn glyphs for the step-by-step instructions */
  glyph(kind, x, y) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(0x2c7be5, 1); g.fillRoundedRect(-15, -15, 30, 30, 8);
    g.lineStyle(2.4, 0xffffff, 1);
    if (kind === 'share') {
      g.beginPath(); g.moveTo(-4, -3); g.lineTo(-8, -3); g.lineTo(-8, 9); g.lineTo(8, 9); g.lineTo(8, -3); g.lineTo(4, -3); g.strokePath();
      g.lineBetween(0, -10, 0, 3); g.lineBetween(-4, -6, 0, -10); g.lineBetween(4, -6, 0, -10);
    } else if (kind === 'add') {
      g.strokeRoundedRect(-8, -8, 16, 16, 4); g.lineBetween(0, -4, 0, 4); g.lineBetween(-4, 0, 4, 0);
    } else if (kind === 'dots') {
      g.fillStyle(0xffffff, 1); [-6, 0, 6].forEach((dx) => g.fillCircle(dx, 0, 2.2));
    } else if (kind === 'browser') {
      g.strokeCircle(0, 0, 8); g.lineBetween(-8, 0, 8, 0); g.strokeEllipse(0, 0, 7, 16);
    } else if (kind === 'home') {
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(0, -8); g.lineTo(8, 0); g.strokePath(); g.strokeRect(-5, 0, 10, 8);
    }
    return g;
  }

  showInstall(moment = 'button') {
    const mode = Install.mode;
    if (!mode) return;
    const gs = this.gameScene.gs;
    const hasProgress = Object.keys(gs.branches.stand.unlocked || {}).length > 3;
    const bonus = money(INSTALL_BONUS);
    this.openModal((card) => {
      const w = Math.min(340, this.W - 28);
      let h;
      const benefits = (y0) => {
        [['Plays without data', 'Load once, then play anywhere'], ['One tap from your home screen', 'Full screen, no browser bars'], [`${bonus} install bonus`, 'Collect it when you open the app']].forEach(([a, b2], i) => {
          const y = y0 + i * 46;
          const ck = this.add.graphics(); ck.fillStyle(i === 2 ? 0xffd23f : 0x2bb34a, 1); ck.fillCircle(0, 0, 13);
          ck.lineStyle(3, i === 2 ? 0x7a4a00 : 0xffffff, 1); ck.beginPath(); ck.moveTo(-6, 0); ck.lineTo(-2, 4); ck.lineTo(6, -5); ck.strokePath();
          ck.setPosition(-w / 2 + 40, y);
          card.add(ck);
          card.add(this.txt(-w / 2 + 64, y - 10, a, 15.5, 700, '#3a2a1a').setOrigin(0, 0.5));
          card.add(this.txt(-w / 2 + 64, y + 9, b2, 12, 500, '#7a6450').setOrigin(0, 0.5));
        });
      };
      const steps = (y0, list) => {
        list.forEach(([g, t], i) => {
          const y = y0 + i * 48;
          card.add(this.txt(-w / 2 + 28, y, `${i + 1}`, 18, 700, '#ff7a1a').setOrigin(0.5));
          card.add(this.glyph(g, -w / 2 + 62, y));
          card.add(this.txt(-w / 2 + 88, y, t, 14, 600, '#3a2a1a', { wordWrap: { width: w - 110 } }).setOrigin(0, 0.5));
        });
      };
      const later = (y) => {
        const t = label(this, 0, y, 'Not now', { size: 15, color: '#7a6450', stroke: null, res: this.dpr * 1.5 });
        t.setInteractive({ useHandCursor: true });
        t.on('pointerdown', () => { Sound.play('click'); Install.dismissed(moment); this.closeModal(); });
        card.add(t);
      };
      const icons = (y) => {
        card.add(img(this, -26, y, 'icon_puff').setScale(0.5 * 0.9));
        card.add(img(this, 26, y - 4, 'icon_zobo').setScale(0.5 * 0.9));
      };

      if (mode === 'prompt') {
        h = 400;
        this.card(card, w, h, 'Get the app. It\'s free!', 0x2bb34a);
        icons(-h / 2 + 100);
        benefits(-h / 2 + 160);
        this.bigButton(card, 0, h / 2 - 82, 'Install', 0xff7a1a, async () => {
          this.closeModal(true);
          const ok = await Install.prompt();
          if (ok) this.toast(`Installing! Open it from your home screen to collect ${bonus}`, 'icon_check', 0x2bb34a);
        }, 220, 54, 24);
        later(h / 2 - 30);
      } else if (mode === 'ios') {
        h = hasProgress ? 428 : 404;
        this.card(card, w, h, 'Add it to your Home Screen', 0x2bb34a);
        card.add(this.txt(0, -h / 2 + 86, `Plays without data, opens in one tap,\nand you get a ${bonus} bonus.`, 13.5, 600, '#3a2a1a', { align: 'center' }).setOrigin(0.5));
        steps(-h / 2 + 142, [['share', 'Tap the Share button in Safari (or ••• then Share)'], ['add', 'Tap "Add to Home Screen", then "Add"'], ['home', `Open Aba Chop Spot from your Home Screen to collect ${bonus}`]]);
        if (hasProgress) card.add(this.txt(0, h / 2 - 126, 'On iPhone the app starts its own fresh save.', 12, 600, '#c0392b').setOrigin(0.5));
        this.bigButton(card, 0, h / 2 - 82, 'Got it', 0x2bb34a, () => this.closeModal(), 200, 50, 22);
        later(h / 2 - 30);
      } else {
        const ios = Install.isIOS;
        const where = ios ? 'Safari' : 'Chrome';
        h = ios ? 420 : 390;
        this.card(card, w, h, `Play in ${where}`, 0x2c7be5);
        card.add(this.txt(0, -h / 2 + 100, `You're playing inside ${Install.inAppName}. Open the game in ${where} so you can install it and keep your progress. Do it now: progress here can't move over later.`, 14, 600, '#3a2a1a', { align: 'center', wordWrap: { width: w - 44 } }).setOrigin(0.5));
        if (ios) {
          steps(-h / 2 + 182, [['dots', 'Tap ••• or the compass/share icon at the top or bottom'], ['browser', 'Choose "Open in Safari" (or "Open in browser")']]);
          this.bigButton(card, 0, h / 2 - 82, 'Got it', 0x2c7be5, () => this.closeModal(), 200, 50, 22);
        } else {
          steps(-h / 2 + 182, [['dots', 'If nothing happens: tap ⋮ at the top right'], ['browser', 'Choose "Open in Chrome" or "Open in browser"']]);
          this.bigButton(card, 0, h / 2 - 82, 'Open in Chrome', 0x2c7be5, () => { this.closeModal(true); Install.openInBrowser(); }, 240, 54, 22);
        }
        later(h / 2 - 30);
      }
    }, 'install');
  }

  showInstallBonus() {
    const bonus = money(INSTALL_BONUS);
    this.gameScene.addCash(INSTALL_BONUS);
    this.gameScene.save();
    const m = this.openModal((card) => {
      const w = Math.min(320, this.W - 40), h = 324;
      this.card(card, w, h, 'You installed it!', 0x2bb34a);
      card.add(img(this, 0, -h / 2 + 108, 'icon_cash').setScale(0.5 * 1.1));
      card.add(this.txt(0, -h / 2 + 160, 'Aba Chop Spot is on your home screen.\nHere is your install bonus:', 14.5, 500, '#3a2a1a', { align: 'center' }).setOrigin(0.5));
      card.add(label(this, 0, -h / 2 + 202, `+${bonus}`, { size: 28, color: '#2bb34a', stroke: null, res: this.dpr * 1.5 }));
      this.bigButton(card, 0, h / 2 - 46, 'Let\'s cook!', 0xff7a1a, () => this.closeModal(), 180);
    }, 'bonus');
    m.onClose = () => { if (!this.gameScene.gs.profile) this.time.delayedCall(250, () => this.showCreator()); };
    Sound.play('cash'); Haptic.tap('medium');
  }

  ownerTitle() {
    const n = (this.gameScene.gs.profile && this.gameScene.gs.profile.name) || 'Ada';
    return n.toUpperCase().endsWith('S') ? `${n.toUpperCase()}'` : `${n.toUpperCase()}'S`;
  }

  // ---------- character creator ----------
  showCreator() {
    const gs = this.gameScene.gs;
    const p = { ...defaultProfile(), ...(gs.profile || {}) };
    if (!gs.profile && !this.registry.get('isNew')) p.name = 'Ada'; // existing players start as Mama Ada's apprentice look
    const first = !gs.profile;
    const kb = this.input.keyboard;
    if (kb) kb.disableGlobalCapture();
    let input = null;
    const open = () => this.openModal((card, m) => {
      const w = Math.min(350, this.W - 20), h = Math.min(590, this.H - 20);
      const top = -h / 2;
      this.card(card, w, h, first ? "Who's running the spot?" : 'Your character', 0xff7a1a);
      // live preview
      const stage = this.add.graphics();
      stage.fillStyle(0xf3e3c3, 1); stage.fillEllipse(0, top + 236, 150, 30);
      card.add(stage);
      const rig = new Rig(this, 0, top + 232, lookFromProfile(p));
      rig.setScale(1.5);
      card.add(rig);
      this.creatorRig = rig;
      // guy / girl
      const gy = top + 280;
      ['girl', 'guy'].forEach((g, i) => {
        const on = p.gender === g;
        this.bigButton(card, (i ? 1 : -1) * 66, gy, g === 'girl' ? 'Girl' : 'Guy', on ? 0xff7a1a : 0xc9b99c, () => { if (p.gender !== g) { p.gender = g; p.hair = 0; rebuild(); } }, 120, 42, 18);
      });
      // skin swatches
      const swatchRow = (y, colors, sel, pick, label2) => {
        card.add(this.txt(-w / 2 + 22, y, label2, 13, 700, '#7a6450').setOrigin(0, 0.5));
        const n = colors.length; const gap = Math.min(40, (w - 110) / n);
        colors.forEach((col, i) => {
          const x = -w / 2 + 96 + i * gap + gap / 2 - 10;
          const sw = this.add.container(x, y);
          const g = this.add.graphics();
          if (i === sel) { g.lineStyle(4, 0xff7a1a, 1); g.strokeCircle(0, 0, 17); }
          g.fillStyle(col, 1); g.fillCircle(0, 0, 13); g.lineStyle(2, 0xffffff, 1); g.strokeCircle(0, 0, 13);
          sw.add(g); sw.setSize(34, 34).setInteractive({ useHandCursor: true });
          sw.on('pointerdown', () => { Sound.play('click'); pick(i); rebuild(); });
          card.add(sw);
        });
      };
      swatchRow(top + 334, SKIN_TONES, p.skin, (i) => { p.skin = i; }, 'Skin');
      swatchRow(top + 380, OUTFITS.map((o) => o.shirt), p.outfit, (i) => { p.outfit = i; }, 'Outfit');
      // hairstyle picker
      const styles = HAIR[p.gender === 'guy' ? 'guy' : 'girl'];
      const hy = top + 426;
      card.add(this.txt(-w / 2 + 22, hy, 'Style', 13, 700, '#7a6450').setOrigin(0, 0.5));
      card.add(label(this, 20, hy, styles[p.hair % styles.length].name, { size: 18, color: '#3a2a1a', stroke: null, res: this.dpr * 1.5 }));
      [[-1, -70], [1, 110]].forEach(([d, x]) => {
        this.bigButton(card, x, hy, d < 0 ? '‹' : '›', 0x2a3550, () => { p.hair = (p.hair + d + styles.length) % styles.length; rebuild(); }, 44, 38, 22);
      });
      // name field (a real text box so phones show their keyboard)
      card.add(this.txt(-w / 2 + 22, top + 468, 'Name', 13, 700, '#7a6450').setOrigin(0, 0.5));
      const placeInput = () => {
        if (!input) return;
        input.style.left = `${this.W / 2 + 20 - 105}px`;
        input.style.top = `${this.H / 2 + top + 468 - 21}px`;
      };
      if (!input) {
        input = document.createElement('input');
        input.type = 'text'; input.maxLength = 12; input.autocomplete = 'off';
        input.placeholder = 'e.g. Chidi or Amaka';
        Object.assign(input.style, {
          position: 'fixed', width: '210px', height: '42px', boxSizing: 'border-box', zIndex: '20',
          font: '600 18px Fredoka, system-ui, sans-serif', textAlign: 'center', color: '#3a2a1a',
          background: '#ffffff', border: '2px solid #e0cfa8', borderRadius: '12px', outline: 'none', padding: '0 10px',
        });
        input.addEventListener('input', () => { p.name = input.value.replace(/[^A-Za-z0-9 '\-]/g, '').slice(0, 12); input.style.borderColor = '#e0cfa8'; });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
        document.body.appendChild(input);
      }
      input.value = p.name;
      placeInput();
      this.bigButton(card, 0, h / 2 - 48, first ? 'Start cooking!' : 'Save', 0x2bb34a, () => {
        const name = (p.name || '').trim();
        if (!name) { input.style.borderColor = '#e33d3d'; input.focus(); Sound.play('deny'); return; }
        gs.profile = { name: name.charAt(0).toUpperCase() + name.slice(1), gender: p.gender, skin: p.skin, outfit: p.outfit, hair: p.hair };
        this.game.events.emit('profile-set');
        this.closeModal();
        if (first) this.toast(`Welcome to Aba, ${gs.profile.name}!`, 'icon_happy', 0xff9a1a);
        Haptic.tap('medium');
      }, 230);
      m.relayout = () => { card.setPosition(this.W / 2, this.H / 2); placeInput(); };
      m.onClose = () => {
        if (this.rebuilding) return;
        if (input) { input.remove(); input = null; }
        this.creatorRig = null;
        if (kb) kb.enableGlobalCapture();
      };
    }, 'creator');
    const rebuild = () => { this.rebuilding = true; this.reopening = true; open(); this.reopening = false; this.rebuilding = false; };
    open();
  }

  update(_t, delta) {
    if (this.creatorRig && this.creatorRig.active) this.creatorRig.animate(delta / 1000, 0, 0);
    const target = this.targetCash ?? 0;
    if (Math.abs(target - this.shownCash) > 0.01) {
      const k = Math.min(1, delta / 1000 * 10);
      this.shownCash += (target - this.shownCash) * k;
      if (Math.abs(target - this.shownCash) < 0.6) this.shownCash = target;
      this.cashText.setText(money(this.shownCash));
      this.drawCashPill();
    }
    this.drawJoystick();
    if (this.upPanel && this.gameScene.gs.cash !== this.upCashSeen) this.fillUpgrades();
  }
}
