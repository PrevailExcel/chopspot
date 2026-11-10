import Phaser from 'phaser';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './install.js'; // must load first to catch the browser's install prompt
import { Cloud } from './cloud.js';
import { Portal, ON_PORTAL } from './portal.js';
import BootScene from './scenes/BootScene.js';
import StandScene from './scenes/StandScene.js';
import BukaScene from './scenes/BukaScene.js';
import LoungeScene from './scenes/LoungeScene.js';
import FactoryScene from './scenes/FactoryScene.js';
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
  if (ON_PORTAL) {
    // the portal SDK must be ready before the save is read: saves live in its data module
    await Portal.init();
  } else {
    // a cleared browser (or another phone) gets its progress back from the cloud before the game loads
    await Promise.race([Cloud.pullOnStart(), new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
  }

  const { w, h } = size();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    transparent: true, // the 3D restaurant draws on a canvas underneath
    scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dpr },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 3 },
    fps: { target: 60, panicMax: 10 },
    scene: [BootScene, StandScene, BukaScene, LoungeScene, FactoryScene, UIScene],
  });
  game.registry.set('dpr', dpr);
  const lift = () => { if (game.canvas) { game.canvas.style.position = 'relative'; game.canvas.style.zIndex = '1'; } };
  lift(); game.events.once('ready', lift);

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
