// The 3D restaurant (and Three.js) only downloads when a player first goes there,
// so Faulks Road and Ariaria stay small and fast.
let enginePromise = null;
let engine = null;

function overlay(show, text = '') {
  let el = document.getElementById('branch-loading');
  if (!show) { if (el) { el.style.opacity = '0'; setTimeout(() => el && el.remove(), 300); } return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'branch-loading';
    el.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;'
      + 'background:radial-gradient(circle at 50% 40%,#22433a,#0c1714);color:#f3e3c3;font:600 18px Fredoka,system-ui,sans-serif;transition:opacity .3s;letter-spacing:.3px';
    el.innerHTML = '<div style="width:46px;height:46px;border-radius:50%;border:4px solid rgba(243,227,195,.25);border-top-color:#d9b26a;animation:bl-spin 0.9s linear infinite"></div><div id="branch-loading-text"></div>'
      + '<style>@keyframes bl-spin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(el);
  }
  el.style.opacity = '1';
  el.querySelector('#branch-loading-text').textContent = text;
}

export function loadEngine() {
  if (!enginePromise) {
    enginePromise = import('./engine.js').then(async (m) => { await m.fontsReady(); engine = m; return m; }).catch((e) => { enginePromise = null; throw e; });
  }
  return enginePromise;
}
export function getEngine() { return engine; }

/** resolves when the branch's code is ready to start */
export function prepareBranch(key) {
  if (key !== 'lounge') return Promise.resolve();
  if (engine) return Promise.resolve();
  overlay(true, 'Setting the tables at GRA…');
  return loadEngine().finally(() => overlay(false));
}
export const loadingOverlay = overlay;
