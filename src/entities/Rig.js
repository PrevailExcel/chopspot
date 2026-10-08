import Phaser from 'phaser';
import { img } from '../art.js';
import { ITEMS } from '../config.js';

export const SKINS = [0x5c3a21, 0x7a4a2a, 0x8d5a36, 0xa86b45, 0x6b4226, 0xc68b5e, 0x4a2e1b];
export const SHIRTS = [0xff7a1a, 0x0f8b8d, 0x7b2d8b, 0xe33d5c, 0x2c7be5, 0x2bb34a, 0xffc928, 0xf2f2f2, 0xff5c8a, 0x5b4bd6];
export const PANTS = [0x2a3550, 0x1e1e24, 0xb39b72, 0x3a5f8f, 0x4a4a4a, 0x6b3f2a];
export const HAIR = [0x1b120c, 0x23170f, 0x2e1d12, 0x140d09];

/** Random everyday look for customers. */
export function randomLook() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const dress = Math.random() < 0.45;
  const styles = dress ? ['puff', 'braids', 'wrap', 'short'] : ['short', 'short', 'cap', 'puff'];
  const hair = pick(styles);
  return {
    skin: pick(SKINS), shirt: pick(SHIRTS), pants: pick(PANTS), hairColor: hair === 'cap' || hair === 'wrap' ? pick(SHIRTS) : pick(HAIR),
    pattern: Math.random() < 0.5 ? pick(SHIRTS) : null, dress, hair, wrapPattern: Math.random() < 0.6 ? pick(SHIRTS) : null,
    scale: 1.18 + Math.random() * 0.14,
  };
}

/**
 * A puppet made of tinted parts: legs swing, arms swing (or hold the tray up),
 * body bobs, and a stack of carried items wobbles above the head.
 */
export class Rig extends Phaser.GameObjects.Container {
  constructor(scene, x, y, look) {
    super(scene, x, y);
    scene.add.existing(this);
    this.look = look;
    this.phase = Math.random() * 6;
    this.face = 1;
    this.lean = 0;
    this.sitting = false;
    this.carryItems = []; // { type, im }
    this.showTray = !!look.tray;

    this.shadowImg = img(scene, 0, 0, 'p_shadow');
    this.add(this.shadowImg);

    this.body = scene.add.container(0, 0);
    this.add(this.body);
    this.body.setScale(look.scale || 1.25);

    const b = this.body;
    const part = (x2, y2, key, tint) => { const p = img(scene, x2, y2, key); if (tint != null) p.setTint(tint); b.add(p); return p; };

    const legTint = look.dress ? look.skin : look.pants;
    this.legL = part(-5.5, -20, 'p_leg', legTint);
    this.legR = part(5.5, -20, 'p_leg', legTint);
    this.armBack = part(13.5, -42, 'p_arm', look.skin);
    if (look.dress) {
      this.torso = part(0, -10, 'p_dress', look.shirt);
      if (look.pattern) part(0, -10, 'p_dress_pat', look.pattern).setAlpha(0.9);
    } else {
      this.torso = part(0, -17, 'p_torso', look.shirt);
      if (look.pattern) part(0, -17, 'p_torso_pat', look.pattern).setAlpha(0.9);
    }
    this.armFront = part(-13.5, -42, 'p_arm', look.skin);
    this.sleeveL = part(-13.5, -44, 'p_sleeve', look.shirt);
    this.sleeveR = part(13.5, -44, 'p_sleeve', look.shirt);
    this.head = part(0, -59, 'p_head', look.skin);
    this.faceImg = part(0, -57, 'p_face', null);
    const hairKey = { short: 'h_short', puff: 'h_puff', braids: 'h_braids', cap: 'h_cap', wrap: 'h_wrap' }[look.hair] || 'h_short';
    this.hairImg = part(0, -61, hairKey, look.hairColor);
    if (look.hair === 'wrap' && look.wrapPattern) this.hairPat = part(0, -61, 'h_wrap_pat', look.wrapPattern).setAlpha(0.85);

    this.tray = part(0, -82, 'p_tray', null);
    this.tray.setVisible(this.showTray);
    // carried stack lives in its own container so it never flips with the body
    this.stackC = scene.add.container(0, 0);
    this.add(this.stackC);

    this.bodyScale = look.scale || 1.25;
    this.trayY = -82 * this.bodyScale;
  }

  get carryCount() { return this.carryItems.length; }

  stackTopLocal() {
    let h = 0;
    for (const it of this.carryItems) h += ITEMS[it.type].h;
    return { x: 0, y: this.trayY - 4 - h };
  }

  /** world position where the next carried item will land */
  stackTopWorld() {
    const p = this.stackTopLocal();
    return { x: this.x + p.x, y: this.y + p.y };
  }

  addCarry(type) {
    const p = this.stackTopLocal();
    const im = img(this.scene, 0, p.y, ITEMS[type].tex);
    this.stackC.add(im);
    this.carryItems.push({ type, im, baseY: p.y });
    im.setScale(0);
    this.scene.tweens.add({ targets: im, scale: 1 / 2 * 1.0, duration: 160, ease: 'Back.Out' });
    this.tray.setVisible(true);
    return im;
  }

  /** remove the top-most item of a given type (or any type if null); returns its world position */
  removeCarry(type = null) {
    let idx = -1;
    for (let i = this.carryItems.length - 1; i >= 0; i--) {
      if (!type || this.carryItems[i].type === type) { idx = i; break; }
    }
    if (idx < 0) return null;
    const it = this.carryItems[idx];
    const wx = this.x + it.im.x, wy = this.y + it.im.y;
    it.im.destroy();
    this.carryItems.splice(idx, 1);
    // restack
    let h = 0;
    for (const c of this.carryItems) { c.baseY = this.trayY - 4 - h; h += ITEMS[c.type].h; }
    if (!this.carryItems.length && !this.showTray) this.tray.setVisible(false);
    return { type: it.type, x: wx, y: wy };
  }

  countOf(type) { return this.carryItems.reduce((n, c) => n + (c.type === type ? 1 : 0), 0); }

  sit(on, faceDir = 1) {
    this.sitting = on;
    if (on) { this.face = faceDir; this.body.scaleX = this.bodyScale * faceDir; }
  }

  squash() {
    this.scene.tweens.add({ targets: this.body, scaleY: this.bodyScale * 0.9, duration: 70, yoyo: true, ease: 'Sine.Out' });
  }

  animate(dt, vx, vy) {
    const speed = Math.hypot(vx, vy);
    const moving = speed > 8 && !this.sitting;
    const s = this.bodyScale;
    if (moving) this.phase += dt * (6 + speed * 0.035);
    if (Math.abs(vx) > 6 && !this.sitting) this.face = vx > 0 ? 1 : -1;
    this.body.scaleX = Phaser.Math.Linear(this.body.scaleX, s * this.face, Math.min(1, dt * 18));

    const back = moving && vy < -Math.abs(vx) * 0.6;
    this.faceImg.setVisible(!back);

    const sw = moving ? Math.sin(this.phase) : 0;
    const legA = this.sitting ? 1.25 : sw * 0.65;
    this.legL.rotation = Phaser.Math.Linear(this.legL.rotation, legA, Math.min(1, dt * 20));
    this.legR.rotation = Phaser.Math.Linear(this.legR.rotation, this.sitting ? 1.25 : -legA, Math.min(1, dt * 20));

    const holding = this.carryItems.length > 0 || this.showTray;
    if (holding) {
      this.armFront.rotation = Phaser.Math.Linear(this.armFront.rotation, 2.75, Math.min(1, dt * 14));
      this.armBack.rotation = Phaser.Math.Linear(this.armBack.rotation, -2.75, Math.min(1, dt * 14));
    } else {
      this.armFront.rotation = Phaser.Math.Linear(this.armFront.rotation, -sw * 0.6, Math.min(1, dt * 14));
      this.armBack.rotation = Phaser.Math.Linear(this.armBack.rotation, sw * 0.6, Math.min(1, dt * 14));
    }

    const bob = moving ? -Math.abs(Math.cos(this.phase)) * 3 : Math.sin(this.scene.time.now / 400 + this.phase) * 0.6;
    this.body.y = this.sitting ? 7 : bob;
    this.shadowImg.setScale(0.5 * (moving ? 1 - Math.abs(Math.cos(this.phase)) * 0.08 : 1), 0.5);

    // stack wobble: lean against the direction of travel
    const targetLean = Phaser.Math.Clamp(-vx * 0.010, -2.2, 2.2);
    this.lean = Phaser.Math.Linear(this.lean, targetLean, Math.min(1, dt * 6));
    const t = this.scene.time.now / 1000;
    this.stackC.y = this.body.y;
    this.carryItems.forEach((c, i) => {
      const k = i + 1;
      const wob = moving ? Math.sin(t * 9 + i * 0.5) * 0.25 * k * 0.3 : 0;
      c.im.x = this.lean * k * 0.9 * (k / 6 + 0.5) + wob;
      c.im.y = Phaser.Math.Linear(c.im.y, c.baseY, Math.min(1, dt * 20));
      c.im.rotation = this.lean * 0.02 * k;
    });
    this.setDepth(this.y);
  }
}
