import Phaser from 'phaser';
import { buildAllTextures } from '../art.js';
import { buildAdTextures } from '../ads.js';
import { loadState } from '../state.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    buildAllTextures(this);
    buildAdTextures(this);
    const { state, isNew } = loadState();
    this.registry.set('gs', state);
    this.registry.set('isNew', isNew);
    const boot = document.getElementById('boot');
    if (boot) { boot.style.opacity = '0'; setTimeout(() => boot.remove(), 350); }
    this.scene.start(state.branch || 'stand');
  }
}
