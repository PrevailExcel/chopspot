import Phaser from 'phaser';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './install.js'; // must load first to catch the browser's install prompt
import BootScene from './scenes/BootScene.js';
import StandScene from './scenes/StandScene.js';
import BukaScene from './scenes/BukaScene.js';
import UIScene from './scenes/UIScene.js';

// Render at device resolution (capped at 2x for battery) and display at CSS size.
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const size = () => ({ w: Math.max(1, Math.round(window.innerWidth * dpr)), h: Math.max(1, Math.round(window.innerHeight * dpr)) });

async function start() {
  // Canvas text and painted textures need the font ready first.
  try {
    await Promise.race([
      Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 20px Fredoka`))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) { /* fall back to system font */ }

  const { w, h } = size();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#7cc35a',
    scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dpr },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 3 },
    fps: { target: 60, panicMax: 10 },
    scene: [BootScene, StandScene, BukaScene, UIScene],
  });
  game.registry.set('dpr', dpr);

  let t = null;
  const fit = () => {
    clearTimeout(t);
    t = setTimeout(() => { const s = size(); game.scale.resize(s.w, s.h); }, 60);
  };
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  // Phaser slows its clock while the window is unfocused (e.g. inside an iframe before the first tap).
  window.addEventListener('pointerdown', () => { if (game.loop) game.loop.inFocus = true; }, true);
  window.__game = game; // handy for debugging from the console
}

start();
