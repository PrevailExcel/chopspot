import Phaser from 'phaser';
import { buildAllTextures } from '../art.js';
import { buildAdTextures, CREATIVES } from '../ads.js';
import { loadState } from '../state.js';
import { prepareBranch } from '../lounge/loader.js';
import { defaultProfile } from '../profile.js';
import { Portal, ON_PORTAL } from '../portal.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    // image billboards (see CREATIVES in ads.js); a missing file just leaves that ad out
    for (const [id, ad] of Object.entries(CREATIVES)) if (ad.image) this.load.image(`ad_${id}`, ad.image);
  }
  create() {
    buildAllTextures(this);
    buildAdTextures(this);
    const { state, isNew } = loadState();
    // portals: skip the character screen on first start; players can change it later in Settings
    if (ON_PORTAL && !state.profile) state.profile = { ...defaultProfile(), name: 'Ada' };
    this.registry.set('gs', state);
    this.registry.set('isNew', isNew);
    const boot = document.getElementById('boot');
    if (boot) { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 350); }
    const key = state.branch || 'stand';
    prepareBranch(key).then(() => this.scene.start(key)).catch((e) => { console.warn('Could not open', key, e); state.branch = 'stand'; this.scene.start('stand'); })
      .finally(() => Portal.loaded());
  }
}
