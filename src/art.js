import Phaser from 'phaser';
// Every visual in the game is painted here with Canvas 2D at 2x resolution, so the whole
// game ships with zero image files and stays crisp on high-density phone screens.

export const R = 2; // texture supersampling; images are displayed at scale 1/R

const ORIGINS = {};

function tex(scene, key, w, h, ox, oy, draw) {
  const t = scene.textures.createCanvas(key, Math.ceil(w * R), Math.ceil(h * R));
  const ctx = t.getContext();
  ctx.save();
  ctx.scale(R, R);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, h);
  ctx.restore();
  t.refresh();
  ORIGINS[key] = [ox, oy];
}

/** Add a supersampled image with its registered origin. */
export function img(scene, x, y, key) {
  const im = scene.add.image(x, y, key);
  const o = ORIGINS[key] || [0.5, 0.5];
  im.setOrigin(o[0], o[1]);
  im.setScale(1 / R);
  return im;
}
export function origin(key) { return ORIGINS[key] || [0.5, 0.5]; }

// ---------- drawing helpers ----------
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ell(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.closePath();
}
function fillStroke(ctx, fill, stroke, lw = 2) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function lin(ctx, x1, y1, x2, y2, stops) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function rad(ctx, x, y, r0, x1, y1, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function shadow(ctx, cx, cy, rx, ry, a = 0.22) {
  ell(ctx, cx, cy, rx, ry);
  ctx.fillStyle = `rgba(30,40,20,${a})`;
  ctx.fill();
}
function text(ctx, s, x, y, size, color, weight = 700, stroke = null, sw = 4) {
  ctx.font = `${weight} ${size}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

// ---------- items ----------
function drawPuff(ctx, cx, cy, r) {
  // slightly lumpy golden ball
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const rr2 = r * (1 + 0.05 * Math.sin(a * 5 + 1) + 0.03 * Math.sin(a * 3));
    const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2 * 0.94;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = rad(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1,
    [[0, '#ffd98a'], [0.45, '#e39a3a'], [0.85, '#b5651d'], [1, '#8a4513']]);
  ctx.fill();
  ctx.strokeStyle = '#7a3c10'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke();
  ell(ctx, cx - r * 0.35, cy - r * 0.42, r * 0.32, r * 0.2);
  ctx.fillStyle = 'rgba(255,248,220,0.7)'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  [[0.3, -0.1], [-0.1, 0.35], [0.45, 0.35], [-0.45, 0.1], [0.05, -0.5]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, r * 0.07, 0, 7); ctx.fill();
  });
}

function drawZobo(ctx, x, y, w, h) {
  // plastic bottle of deep red zobo
  const cx = x + w / 2;
  // cap
  rr(ctx, cx - w * 0.2, y, w * 0.4, h * 0.13, 2); fillStroke(ctx, '#e8edf2', '#7d8a96', 1.2);
  // neck
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.17, y + h * 0.12);
  ctx.lineTo(cx + w * 0.17, y + h * 0.12);
  ctx.quadraticCurveTo(cx + w * 0.47, y + h * 0.24, cx + w * 0.47, y + h * 0.38);
  ctx.lineTo(cx + w * 0.47, y + h * 0.9);
  ctx.quadraticCurveTo(cx + w * 0.47, y + h, cx + w * 0.3, y + h);
  ctx.lineTo(cx - w * 0.3, y + h);
  ctx.quadraticCurveTo(cx - w * 0.47, y + h, cx - w * 0.47, y + h * 0.9);
  ctx.lineTo(cx - w * 0.47, y + h * 0.38);
  ctx.quadraticCurveTo(cx - w * 0.47, y + h * 0.24, cx - w * 0.17, y + h * 0.12);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, '#5c0a24'], [0.35, '#b8173f'], [0.6, '#9a1036'], [1, '#4d081e']]);
  ctx.fill();
  ctx.strokeStyle = '#3d0618'; ctx.lineWidth = 1.3; ctx.stroke();
  // label
  rr(ctx, cx - w * 0.47, y + h * 0.5, w * 0.94, h * 0.24, 1);
  ctx.fillStyle = '#fff6e0'; ctx.fill();
  ctx.fillStyle = '#4caf50';
  ell(ctx, cx - w * 0.12, y + h * 0.62, w * 0.14, h * 0.05); ctx.fill();
  ctx.fillStyle = '#e53950';
  ctx.beginPath(); ctx.arc(cx + w * 0.12, y + h * 0.62, w * 0.11, 0, 7); ctx.fill();
  // shine
  rr(ctx, cx - w * 0.33, y + h * 0.28, w * 0.12, h * 0.6, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
}

function drawCashBundle(ctx, x, y, w, h) {
  const th = h * 0.28;
  // side
  rr(ctx, x, y + th, w, h - th, 3);
  ctx.fillStyle = '#2f7d4c'; ctx.fill();
  // paper edges
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.8;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 2, y + th + i * (h - th) / 3.2); ctx.lineTo(x + w - 2, y + th + i * (h - th) / 3.2); ctx.stroke(); }
  // top
  rr(ctx, x, y, w, h - th, 3);
  ctx.fillStyle = lin(ctx, x, y, x + w, y + h, [[0, '#8fe0a8'], [1, '#4fb877']]);
  ctx.fill();
  ctx.strokeStyle = '#256b3e'; ctx.lineWidth = 1.2; ctx.stroke();
  // inner frame + naira
  rr(ctx, x + 3, y + 2.5, w - 6, h - th - 5, 2);
  ctx.strokeStyle = 'rgba(30,100,55,0.5)'; ctx.lineWidth = 0.9; ctx.stroke();
  // band
  ctx.fillStyle = '#f6d35b';
  ctx.fillRect(x + w * 0.42, y, w * 0.16, h - th);
  ctx.fillRect(x + w * 0.42, y + h - th, w * 0.16, th);
  text(ctx, '₦', x + w * 0.22, y + (h - th) / 2 + 0.5, (h - th) * 0.7, '#1f6b3b', 700);
  text(ctx, '₦', x + w * 0.78, y + (h - th) / 2 + 0.5, (h - th) * 0.7, '#1f6b3b', 700);
}

// ---------- characters (white bases, tinted at runtime) ----------
function ankaraPattern(ctx, x, y, w, h, s = 1) {
  ctx.save();
  for (let yy = y - 6; yy < y + h + 6; yy += 9 * s) {
    for (let xx = x - 6; xx < x + w + 6; xx += 9 * s) {
      const odd = Math.round((yy - y) / (9 * s)) % 2;
      const px = xx + (odd ? 4.5 * s : 0);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(px, yy, 2.4 * s, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.moveTo(px + 4.5 * s, yy - 2 * s); ctx.lineTo(px + 6.5 * s, yy + 2 * s); ctx.lineTo(px + 2.5 * s, yy + 2 * s); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function torsoPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 2);
  ctx.quadraticCurveTo(w * 0.5, -1, w * 0.78, 2);
  ctx.quadraticCurveTo(w - 1, 4, w - 2, h * 0.35);
  ctx.lineTo(w - 3, h - 4);
  ctx.quadraticCurveTo(w - 3, h - 1, w - 7, h - 1);
  ctx.lineTo(7, h - 1);
  ctx.quadraticCurveTo(3, h - 1, 3, h - 4);
  ctx.lineTo(2, h * 0.35);
  ctx.quadraticCurveTo(1, 4, w * 0.22, 2);
  ctx.closePath();
}
function dressPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(w * 0.27, 2);
  ctx.quadraticCurveTo(w * 0.5, -1, w * 0.73, 2);
  ctx.quadraticCurveTo(w - 5, 4, w - 6, h * 0.3);
  ctx.lineTo(w - 1, h - 5);
  ctx.quadraticCurveTo(w - 1, h - 1, w - 5, h - 1);
  ctx.lineTo(5, h - 1);
  ctx.quadraticCurveTo(1, h - 1, 1, h - 5);
  ctx.lineTo(6, h * 0.3);
  ctx.quadraticCurveTo(5, 4, w * 0.27, 2);
  ctx.closePath();
}
function shadeBody(ctx, w, h) {
  ctx.fillStyle = lin(ctx, 0, 0, w, 0, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.18)']]);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, 'rgba(255,255,255,0.0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.12)']]);
  ctx.fill();
}

function buildCharacterParts(scene) {
  tex(scene, 'p_shadow', 40, 16, 0.5, 0.5, (c) => { shadow(c, 20, 8, 18, 6.5, 0.28); });
  tex(scene, 'p_leg', 12, 22, 0.5, 0.05, (c) => {
    rr(c, 2, 0, 8, 19, 4); fillStroke(c, '#ffffff', 'rgba(0,0,0,0.28)', 1.2);
    rr(c, 1, 14, 10, 7, 3.5); fillStroke(c, '#555555', 'rgba(0,0,0,0.45)', 1);
  });
  tex(scene, 'p_torso', 32, 32, 0.5, 1, (c, w, h) => {
    torsoPath(c, w, h); c.fillStyle = '#fff'; c.fill(); shadeBody(c, w, h);
    torsoPath(c, w, h); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.4; c.stroke();
  });
  tex(scene, 'p_torso_pat', 32, 32, 0.5, 1, (c, w, h) => {
    c.save(); torsoPath(c, w, h); c.clip(); ankaraPattern(c, 0, 0, w, h); c.restore();
  });
  tex(scene, 'p_dress', 36, 40, 0.5, 1, (c, w, h) => {
    dressPath(c, w, h); c.fillStyle = '#fff'; c.fill(); shadeBody(c, w, h);
    dressPath(c, w, h); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.4; c.stroke();
  });
  tex(scene, 'p_dress_pat', 36, 40, 0.5, 1, (c, w, h) => {
    c.save(); dressPath(c, w, h); c.clip(); ankaraPattern(c, 0, 0, w, h); c.restore();
  });
  tex(scene, 'p_arm', 10, 22, 0.5, 0.12, (c) => {
    rr(c, 1.5, 0, 7, 20, 3.5); fillStroke(c, '#fff', 'rgba(0,0,0,0.3)', 1.2);
  });
  tex(scene, 'p_sleeve', 12, 12, 0.5, 0.15, (c) => {
    rr(c, 1, 0, 10, 10, 4); fillStroke(c, '#fff', 'rgba(0,0,0,0.25)', 1.2);
  });
  tex(scene, 'p_head', 32, 32, 0.5, 0.5, (c) => {
    // ears
    ell(c, 3.5, 17, 3, 4); fillStroke(c, '#f2f2f2', 'rgba(0,0,0,0.3)', 1.2);
    ell(c, 28.5, 17, 3, 4); fillStroke(c, '#e6e6e6', 'rgba(0,0,0,0.3)', 1.2);
    ell(c, 16, 16, 13, 14);
    c.fillStyle = rad(c, 11, 10, 2, 16, 16, 16, [[0, '#ffffff'], [0.7, '#f3f3f3'], [1, '#d6d6d6']]);
    c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.4; c.stroke();
  });
  tex(scene, 'p_face', 24, 16, 0.5, 0.5, (c) => {
    ['#2a1b14'].forEach((col) => {
      c.fillStyle = col;
      ell(c, 7, 6, 2.1, 2.8); c.fill();
      ell(c, 17, 6, 2.1, 2.8); c.fill();
    });
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(7.6, 5, 0.8, 0, 7); c.fill();
    c.beginPath(); c.arc(17.6, 5, 0.8, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,90,90,0.28)';
    ell(c, 4, 10, 2.6, 1.6); c.fill(); ell(c, 20, 10, 2.6, 1.6); c.fill();
    c.strokeStyle = '#4a2418'; c.lineWidth = 1.3;
    c.beginPath(); c.arc(12, 9.5, 2.6, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  });
  // hair styles, drawn around a head centred at (20,22) radius ~13
  tex(scene, 'h_short', 40, 40, 0.5, 0.55, (c) => {
    c.beginPath();
    c.arc(20, 22, 13.8, Math.PI * 1.02, Math.PI * 1.98);
    c.quadraticCurveTo(33, 18, 31, 21);
    c.quadraticCurveTo(20, 13, 9, 21);
    c.quadraticCurveTo(7, 18, 6.2, 21);
    c.closePath();
    fillStroke(c, '#fff', 'rgba(0,0,0,0.3)', 1.2);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(10 + (i % 7) * 3.4, 12 + Math.floor(i / 7) * 3.2, 0.9, 0, 7); c.fill(); }
  });
  tex(scene, 'h_puff', 44, 44, 0.5, 0.6, (c) => {
    // afro puff bun on top + band
    c.beginPath(); c.arc(22, 10, 10, 0, 7); fillStroke(c, '#fff', 'rgba(0,0,0,0.3)', 1.2);
    c.beginPath(); c.arc(22, 26, 14, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(22, 17, 8.5, 23); c.closePath();
    fillStroke(c, '#fff', 'rgba(0,0,0,0.3)', 1.2);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(15 + (i % 5) * 3.5, 6 + Math.floor(i / 5) * 6, 1, 0, 7); c.fill(); }
  });
  tex(scene, 'h_braids', 44, 52, 0.5, 0.46, (c) => {
    c.beginPath(); c.arc(22, 24, 14.5, Math.PI * 1.0, Math.PI * 2.0); c.quadraticCurveTo(22, 16, 7.5, 24); c.closePath();
    fillStroke(c, '#fff', 'rgba(0,0,0,0.3)', 1.2);
    for (const bx of [8, 11, 33, 36]) {
      rr(c, bx - 2, 22, 4, 24, 2); fillStroke(c, '#f4f4f4', 'rgba(0,0,0,0.3)', 1);
    }
  });
  tex(scene, 'h_cap', 44, 40, 0.5, 0.55, (c) => {
    c.beginPath(); c.arc(22, 22, 14.5, Math.PI, Math.PI * 2); c.closePath();
    fillStroke(c, '#fff', 'rgba(0,0,0,0.35)', 1.3);
    ell(c, 30, 21, 12, 3.5); fillStroke(c, '#e2e2e2', 'rgba(0,0,0,0.35)', 1.2);
    c.beginPath(); c.arc(22, 8.5, 2, 0, 7); c.fillStyle = '#ddd'; c.fill();
  });
  tex(scene, 'h_wrap', 52, 46, 0.5, 0.62, (c) => {
    // gele: a big folded head-tie
    c.beginPath();
    c.moveTo(9, 30);
    c.quadraticCurveTo(4, 14, 16, 8);
    c.quadraticCurveTo(26, 0, 38, 6);
    c.quadraticCurveTo(50, 12, 45, 26);
    c.quadraticCurveTo(48, 31, 42, 31);
    c.quadraticCurveTo(26, 22, 10, 31);
    c.closePath();
    fillStroke(c, '#fff', 'rgba(0,0,0,0.3)', 1.3);
    c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(14, 22); c.quadraticCurveTo(24, 6, 40, 12); c.stroke();
    c.beginPath(); c.moveTo(18, 27); c.quadraticCurveTo(30, 14, 44, 20); c.stroke();
    // knot
    c.beginPath(); c.moveTo(36, 7); c.quadraticCurveTo(46, -2, 49, 6); c.quadraticCurveTo(44, 10, 38, 10); c.closePath();
    fillStroke(c, '#f2f2f2', 'rgba(0,0,0,0.3)', 1.2);
  });
  tex(scene, 'h_wrap_pat', 52, 46, 0.5, 0.62, (c) => {
    c.save();
    c.beginPath();
    c.moveTo(9, 30); c.quadraticCurveTo(4, 14, 16, 8); c.quadraticCurveTo(26, 0, 38, 6);
    c.quadraticCurveTo(50, 12, 45, 26); c.quadraticCurveTo(48, 31, 42, 31); c.quadraticCurveTo(26, 22, 10, 31); c.closePath();
    c.clip(); ankaraPattern(c, 0, 0, 52, 46, 0.9); c.restore();
  });
  // enamel tray carried on the head
  tex(scene, 'p_tray', 54, 18, 0.5, 0.5, (c) => {
    ell(c, 27, 10, 25, 7); fillStroke(c, '#1f4fa8', null);
    ell(c, 27, 8.5, 25, 7); fillStroke(c, '#f8f8f4', '#1f4fa8', 2.2);
    ell(c, 27, 8.5, 18, 4.6); c.strokeStyle = 'rgba(31,79,168,0.35)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#e04848'; c.beginPath(); c.arc(17, 8, 1.6, 0, 7); c.fill(); c.beginPath(); c.arc(37, 8, 1.6, 0, 7); c.fill();
    c.fillStyle = '#3aa35a'; ell(c, 27, 6.5, 2.4, 1.3); c.fill();
  });
}

// ---------- machines & furniture ----------
function buildMachines(scene) {
  // Fryer: gas burner + big black wok of bubbling oil
  tex(scene, 'm_fryer', 140, 132, 0.5, 0.86, (c) => {
    shadow(c, 70, 112, 60, 15);
    // gas cylinder at back-left
    rr(c, 10, 46, 26, 56, 10); c.fillStyle = lin(c, 10, 0, 36, 0, [[0, '#1d6fb8'], [0.4, '#4fa3e6'], [1, '#165791']]); c.fill();
    c.strokeStyle = '#0f3e6b'; c.lineWidth = 1.6; c.stroke();
    rr(c, 17, 38, 12, 10, 3); fillStroke(c, '#c9ced4', '#5d6670', 1.4);
    c.strokeStyle = '#30363d'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(29, 44); c.quadraticCurveTo(46, 40, 52, 88); c.stroke();
    // burner stand legs
    c.strokeStyle = '#3a3f46'; c.lineWidth = 4;
    [[48, 108], [92, 108], [70, 114]].forEach(([lx, ly]) => { c.beginPath(); c.moveTo(70, 86); c.lineTo(lx, ly); c.stroke(); });
    ell(c, 70, 88, 30, 9); fillStroke(c, '#4b525b', '#2a2e33', 2);
    // flames
    for (let i = -3; i <= 3; i++) {
      const fx = 70 + i * 7;
      c.beginPath(); c.moveTo(fx - 3, 88); c.quadraticCurveTo(fx, 74 - Math.abs(i) * 0.5, fx + 3, 88); c.closePath();
      c.fillStyle = 'rgba(255,140,30,0.9)'; c.fill();
      c.beginPath(); c.moveTo(fx - 1.6, 88); c.quadraticCurveTo(fx, 80, fx + 1.6, 88); c.closePath();
      c.fillStyle = 'rgba(80,170,255,0.9)'; c.fill();
    }
    // wok body
    c.beginPath(); c.moveTo(24, 48); c.quadraticCurveTo(30, 92, 70, 92); c.quadraticCurveTo(110, 92, 116, 48); c.closePath();
    c.fillStyle = lin(c, 24, 0, 116, 0, [[0, '#1e2125'], [0.35, '#4a5058'], [0.6, '#2b2f34'], [1, '#141619']]); c.fill();
    c.strokeStyle = '#0c0d0f'; c.lineWidth = 2; c.stroke();
    // handles
    for (const hx of [16, 124]) { ell(c, hx, 50, 7, 3.5); c.strokeStyle = '#1a1c1f'; c.lineWidth = 3; c.stroke(); }
    // rim + oil
    ell(c, 70, 48, 47, 15); fillStroke(c, '#33383e', '#0c0d0f', 2);
    ell(c, 70, 49, 42, 12);
    c.fillStyle = rad(c, 60, 44, 2, 70, 49, 44, [[0, '#ffe08a'], [0.5, '#f0b23c'], [1, '#c27a12']]); c.fill();
    // floating puff-puff
    drawPuff(c, 52, 47, 8); drawPuff(c, 72, 52, 8.5); drawPuff(c, 88, 45, 7.5); drawPuff(c, 66, 41, 7);
    // bubbles
    c.strokeStyle = 'rgba(255,255,230,0.85)'; c.lineWidth = 1;
    [[42, 52, 2], [100, 50, 2.4], [80, 56, 1.6], [58, 56, 1.8], [96, 42, 1.4]].forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx, by, br, 0, 7); c.stroke(); });
  });
  // woven basket that holds finished puff-puff
  tex(scene, 'm_basket', 70, 34, 0.5, 0.55, (c) => {
    shadow(c, 35, 26, 32, 7);
    c.beginPath(); c.moveTo(4, 12); c.quadraticCurveTo(8, 30, 35, 30); c.quadraticCurveTo(62, 30, 66, 12); c.closePath();
    c.fillStyle = lin(c, 0, 10, 0, 30, [[0, '#d9a35a'], [1, '#9c6a2c']]); c.fill(); c.strokeStyle = '#6d4519'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(110,70,25,0.6)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(8 + i * 7, 14); c.lineTo(11 + i * 6.4, 28); c.stroke(); }
    ell(c, 35, 12, 31, 8); fillStroke(c, '#7d5322', '#5d3b14', 1.8);
    ell(c, 35, 12, 27, 6); c.fillStyle = '#f6edd8'; c.fill(); // paper lining
  });
  // Zobo cooler: tall glass dispenser full of zobo on a wooden stand
  tex(scene, 'm_zobo', 120, 150, 0.5, 0.88, (c) => {
    shadow(c, 60, 132, 52, 13);
    // stand
    rr(c, 22, 92, 76, 40, 4); c.fillStyle = lin(c, 22, 0, 98, 0, [[0, '#a5703a'], [1, '#7a4d22']]); c.fill(); c.strokeStyle = '#5a3816'; c.lineWidth = 1.8; c.stroke();
    c.strokeStyle = 'rgba(90,56,22,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(22, 106); c.lineTo(98, 106); c.moveTo(22, 120); c.lineTo(98, 120); c.stroke();
    ell(c, 60, 92, 38, 9); fillStroke(c, '#c48a4c', '#5a3816', 1.8);
    // jar
    c.beginPath(); c.moveTo(30, 30); c.quadraticCurveTo(26, 88, 36, 92); c.lineTo(84, 92); c.quadraticCurveTo(94, 88, 90, 30); c.closePath();
    c.fillStyle = 'rgba(220,240,255,0.55)'; c.fill(); c.strokeStyle = '#7c9cb5'; c.lineWidth = 2; c.stroke();
    // liquid
    c.save(); c.beginPath(); c.moveTo(30, 30); c.quadraticCurveTo(26, 88, 36, 92); c.lineTo(84, 92); c.quadraticCurveTo(94, 88, 90, 30); c.closePath(); c.clip();
    c.fillStyle = lin(c, 26, 0, 94, 0, [[0, '#5a0821'], [0.4, '#b3173f'], [0.7, '#93113a'], [1, '#4a061b']]);
    c.fillRect(20, 44, 80, 60);
    ell(c, 60, 44, 31, 6); c.fillStyle = '#c7254f'; c.fill();
    // hibiscus petals + ginger floating
    c.fillStyle = 'rgba(120,10,40,0.9)'; [[44, 60], [72, 70], [56, 80], [78, 54]].forEach(([px, py]) => { ell(c, px, py, 5, 2.5); c.fill(); });
    c.fillStyle = 'rgba(255,220,140,0.7)'; [[50, 70], [68, 58]].forEach(([px, py]) => { rr(c, px, py, 5, 3, 1); c.fill(); });
    c.restore();
    // glass highlight
    rr(c, 36, 36, 6, 46, 3); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fill();
    // lid
    ell(c, 60, 30, 31, 7); fillStroke(c, '#e33d5c', '#8f1730', 1.8);
    rr(c, 52, 18, 16, 10, 4); fillStroke(c, '#e33d5c', '#8f1730', 1.6);
    // tap
    rr(c, 54, 84, 12, 8, 2); fillStroke(c, '#d9dee3', '#6b7580', 1.4);
    rr(c, 57, 91, 6, 7, 2); fillStroke(c, '#d9dee3', '#6b7580', 1.4);
    // hibiscus flower decal
    c.fillStyle = '#ff5c8a';
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ell(c, 98 + Math.cos(a) * 5, 112 + Math.sin(a) * 5, 4, 4); c.fill(); }
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(98, 112, 2.5, 0, 7); c.fill();
  });
  // red plastic crate for zobo bottles
  tex(scene, 'm_crate', 64, 36, 0.5, 0.6, (c) => {
    shadow(c, 32, 30, 30, 6);
    rr(c, 4, 10, 56, 20, 3); c.fillStyle = '#d23a3a'; c.fill(); c.strokeStyle = '#8c1f1f'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#a82626'; for (let i = 0; i < 5; i++) { rr(c, 8 + i * 10.5, 15, 7, 10, 2); c.fill(); }
    c.beginPath(); c.moveTo(4, 10); c.lineTo(10, 4); c.lineTo(54, 4); c.lineTo(60, 10); c.closePath();
    fillStroke(c, '#e65555', '#8c1f1f', 1.6);
    c.beginPath(); c.moveTo(10, 9); c.lineTo(13, 6); c.lineTo(51, 6); c.lineTo(54, 9); c.closePath(); c.fillStyle = '#7a1a1a'; c.fill();
  });

  // Front counter: wood top + ankara-printed front panel. 380 wide; ground footprint is the bottom 48px.
  const counter = (key, w) => tex(scene, key, w + 20, 116, 0.5, 0.9, (c) => {
    const x0 = 10, top = 18, depth = 46, height = 46;
    shadow(c, w / 2 + 10, top + depth + height + 2, w / 2 + 8, 9, 0.2);
    // front face
    rr(c, x0, top + depth - 4, w, height + 4, 6);
    c.fillStyle = '#ef6a2b'; c.fill();
    c.save(); rr(c, x0, top + depth - 4, w, height + 4, 6); c.clip();
    // ankara bands
    for (let i = 0; i < w; i += 26) {
      c.fillStyle = (i / 26) % 2 ? '#0f8b8d' : '#ffd23f';
      c.beginPath(); c.moveTo(x0 + i, top + depth + 6); c.lineTo(x0 + i + 13, top + depth + 22); c.lineTo(x0 + i + 26, top + depth + 6); c.closePath(); c.fill();
      c.fillStyle = '#7b2d8b'; c.beginPath(); c.arc(x0 + i + 13, top + depth + 32, 4.5, 0, 7); c.fill();
      c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(x0 + i + 13, top + depth + 32, 1.8, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x0, top + depth + height - 6, w, 8);
    c.restore();
    rr(c, x0, top + depth - 4, w, height + 4, 6); c.strokeStyle = '#7a3412'; c.lineWidth = 2; c.stroke();
    // top surface
    rr(c, x0 - 4, top, w + 8, depth + 2, 7);
    c.fillStyle = lin(c, 0, top, 0, top + depth, [[0, '#e0b27a'], [1, '#c48d52']]); c.fill();
    c.strokeStyle = '#7a4d22'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(122,77,34,0.25)'; c.lineWidth = 1;
    for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x0 + 4, top + i * depth / 4); c.lineTo(x0 + w - 4, top + i * depth / 4); c.stroke(); }
    rr(c, x0 - 4, top + depth - 3, w + 8, 6, 3); c.fillStyle = '#a8713c'; c.fill();
  });
  counter('m_counter', 360);
  counter('m_regdesk', 80);
  // cash register machine (sits on m_regdesk)
  tex(scene, 'm_register', 60, 50, 0.5, 0.92, (c) => {
    rr(c, 6, 22, 48, 24, 5); fillStroke(c, '#5d6875', '#2f3740', 1.8);
    rr(c, 10, 26, 40, 9, 2); c.fillStyle = '#7f8b98'; c.fill();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { rr(c, 12 + i * 9.5, 37 + j * 0, 7, 5, 1.5); c.fillStyle = '#cfd6dd'; c.fill(); }
    rr(c, 16, 4, 28, 18, 3); fillStroke(c, '#3c4550', '#22282f', 1.6);
    rr(c, 19, 7, 22, 10, 2); c.fillStyle = '#7ef0a3'; c.fill();
    text(c, '₦', 30, 12.5, 8, '#1c6b3a', 700);
  });

  // Upgrade desk: small table, laptop, little standing board
  tex(scene, 'm_booth', 130, 140, 0.5, 0.86, (c) => {
    shadow(c, 65, 122, 56, 12);
    // board on post
    rr(c, 92, 30, 6, 90, 2); c.fillStyle = '#6d4519'; c.fill();
    rr(c, 66, 8, 58, 40, 6); fillStroke(c, '#2c7be5', '#174b8f', 2);
    text(c, 'UPGRADE', 95, 22, 10, '#fff', 700);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(95, 30); c.lineTo(103, 40); c.lineTo(87, 40); c.closePath(); c.fill();
    // table
    rr(c, 12, 70, 96, 18, 5); c.fillStyle = '#c48d52'; c.fill(); c.strokeStyle = '#7a4d22'; c.lineWidth = 2; c.stroke();
    rr(c, 12, 86, 96, 30, 4); c.fillStyle = '#9b6532'; c.fill(); c.strokeStyle = '#6a4118'; c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(14, 86, 92, 4);
    // laptop
    c.beginPath(); c.moveTo(34, 76); c.lineTo(78, 76); c.lineTo(84, 82); c.lineTo(28, 82); c.closePath(); fillStroke(c, '#c8ced6', '#59626c', 1.4);
    rr(c, 36, 50, 40, 27, 3); fillStroke(c, '#3c4550', '#22282f', 1.6);
    rr(c, 39, 53, 34, 21, 2); c.fillStyle = '#5ec2ff'; c.fill();
    c.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { rr(c, 44 + i * 9, 68 - i * 5, 6, 4 + i * 5, 1); c.fill(); }
    // mug
    rr(c, 88, 64, 10, 10, 2); fillStroke(c, '#ff7a1a', '#a14c0c', 1.2);
  });

  // table + stools
  tex(scene, 'm_table', 150, 80, 0.5, 0.62, (c) => {
    shadow(c, 75, 56, 64, 14);
    for (const sx of [23, 127]) {
      rr(c, sx - 3, 40, 6, 18, 2); c.fillStyle = '#6d4519'; c.fill();
      ell(c, sx, 40, 15, 6); fillStroke(c, '#f2a33a', '#9c5f12', 1.8);
    }
    rr(c, 71, 34, 8, 26, 2); c.fillStyle = '#5c5c5c'; c.fill();
    ell(c, 75, 60, 14, 4); c.fillStyle = '#444'; c.fill();
    ell(c, 75, 34, 38, 14); c.fillStyle = '#d9d9d9'; c.fill();
    ell(c, 75, 31, 38, 14); fillStroke(c, '#ffffff', '#8c8c8c', 2);
    ell(c, 75, 31, 30, 10); c.strokeStyle = 'rgba(15,139,141,0.4)'; c.lineWidth = 2; c.stroke();
  });
  tex(scene, 'm_umbrella', 150, 130, 0.5, 1, (c) => {
    rr(c, 73, 40, 4, 90, 2); c.fillStyle = '#e8e8e8'; c.fill();
    const cols = ['#ff7a1a', '#fff6e0'];
    for (let i = 0; i < 8; i++) {
      const a0 = Math.PI + (i / 8) * Math.PI, a1 = Math.PI + ((i + 1) / 8) * Math.PI;
      c.beginPath(); c.moveTo(75, 8);
      c.lineTo(75 + Math.cos(a0) * 70, 46 + Math.sin(a0) * -0 + 0);
      c.quadraticCurveTo(75 + Math.cos((a0 + a1) / 2) * 66, 54, 75 + Math.cos(a1) * 70, 46);
      c.closePath(); c.fillStyle = cols[i % 2]; c.fill();
    }
    c.beginPath(); c.moveTo(75, 8); c.lineTo(5, 46); c.quadraticCurveTo(75, 62, 145, 46); c.closePath();
    c.strokeStyle = '#a14c0c'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(75, 8, 4, 0, 7); c.fillStyle = '#ffd23f'; c.fill();
  });

  // Neon sign
  tex(scene, 'm_sign', 200, 170, 0.5, 0.92, (c) => {
    shadow(c, 100, 158, 80, 10);
    for (const px of [40, 160]) { rr(c, px - 4, 70, 8, 88, 2); c.fillStyle = '#4b525b'; c.fill(); }
    rr(c, 8, 8, 184, 86, 14); c.fillStyle = '#2a1840'; c.fill(); c.strokeStyle = '#ff4fa3'; c.lineWidth = 4; c.stroke();
    for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#ffd23f' : '#ff4fa3'; c.beginPath(); c.arc(20 + i * 12.3, 88, 2.2, 0, 7); c.fill(); }
  });
  // small wooden name board at the back fence
  tex(scene, 'm_board', 170, 90, 0.5, 0.95, (c) => {
    for (const px of [30, 140]) { rr(c, px - 4, 40, 8, 48, 2); c.fillStyle = '#6d4519'; c.fill(); }
    rr(c, 6, 6, 158, 50, 8); c.fillStyle = lin(c, 0, 6, 0, 56, [[0, '#c48d52'], [1, '#9b6532']]); c.fill(); c.strokeStyle = '#5a3816'; c.lineWidth = 2.5; c.stroke();
  });

  // Aba shuttle bus: green and brown (side view facing left, slightly from above)
  tex(scene, 'm_bus', 300, 170, 0.5, 0.9, (c) => {
    shadow(c, 150, 150, 140, 14, 0.25);
    // roof
    rr(c, 26, 14, 250, 26, 12); c.fillStyle = '#e9ecef'; c.fill(); c.strokeStyle = '#4b525b'; c.lineWidth = 2; c.stroke();
    // roof rack
    c.strokeStyle = '#555'; c.lineWidth = 2; rr(c, 80, 8, 150, 12, 3); c.stroke();
    rr(c, 110, 0, 60, 12, 3); c.fillStyle = '#7b2d8b'; c.fill(); // luggage
    rr(c, 175, 2, 40, 10, 3); c.fillStyle = '#0f8b8d'; c.fill();
    // body
    c.beginPath();
    c.moveTo(30, 34); c.lineTo(276, 34); c.quadraticCurveTo(290, 36, 290, 56); c.lineTo(290, 128);
    c.quadraticCurveTo(290, 138, 280, 138); c.lineTo(22, 138); c.quadraticCurveTo(10, 138, 10, 126);
    c.lineTo(10, 74); c.quadraticCurveTo(12, 40, 30, 34); c.closePath();
    c.fillStyle = lin(c, 0, 34, 0, 138, [[0, '#3fb05a'], [0.6, '#24923f'], [1, '#1c7a34']]); c.fill();
    c.strokeStyle = '#124d22'; c.lineWidth = 2.4; c.stroke();
    // brown lower band with a cream pinstripe
    c.save(); c.clip();
    c.fillStyle = lin(c, 0, 96, 0, 138, [[0, '#8a5a2b'], [1, '#5e3b18']]); c.fillRect(0, 96, 300, 44);
    c.fillStyle = '#f3e3c3'; c.fillRect(0, 93, 300, 4);
    c.restore();
    // windows
    c.fillStyle = '#2c3e55';
    rr(c, 18, 44, 34, 34, 6); c.fill();
    for (let i = 0; i < 5; i++) { rr(c, 62 + i * 44, 44, 38, 34, 5); c.fill(); }
    // passengers
    const heads = ['#5a3a22', '#3b2416', '#7a4e2d', '#4a2e1b', '#6b432a'];
    for (let i = 0; i < 5; i++) { c.fillStyle = heads[i]; c.beginPath(); c.arc(81 + i * 44, 70, 9, Math.PI, 0); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 0; i < 6; i++) { const wx = i ? 62 + (i - 1) * 44 : 18; c.beginPath(); c.moveTo(wx + 4, 76); c.lineTo(wx + 16, 46); c.lineTo(wx + 24, 46); c.lineTo(wx + 12, 76); c.closePath(); c.fill(); }
    // door line
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.strokeRect(150, 82, 40, 52);
    // headlight & bumper
    ell(c, 16, 84, 5, 7); fillStroke(c, '#fff8cc', '#124d22', 1.5);
    rr(c, 4, 126, 26, 10, 3); c.fillStyle = '#9aa3ad'; c.fill();
    rr(c, 270, 126, 24, 10, 3); c.fillStyle = '#9aa3ad'; c.fill();
    ell(c, 287, 92, 3, 6); c.fillStyle = '#e33d3d'; c.fill();
    // sticker
    text(c, 'SHUTTLE', 228, 118, 15, '#f3e3c3', 700, '#3d240c', 3);
    // wheels
    for (const wx of [62, 236]) {
      c.beginPath(); c.arc(wx, 138, 19, 0, 7); c.fillStyle = '#1a1a1a'; c.fill();
      c.beginPath(); c.arc(wx, 138, 9, 0, 7); c.fillStyle = '#b8c0c8'; c.fill();
      c.beginPath(); c.arc(wx, 138, 3, 0, 7); c.fillStyle = '#555'; c.fill();
      c.beginPath(); c.arc(wx, 138, 22, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = '#3d240c'; c.lineWidth = 4; c.stroke();
    }
  });
}

// ---------- scenery ----------
function buildScenery(scene) {
  // ground tiles (used by TileSprites so the floor costs almost nothing to draw)
  tex(scene, 'g_stripes', 160, 16, 0, 0, (c) => { c.fillStyle = '#7cc35a'; c.fillRect(0, 0, 80, 16); c.fillStyle = '#84ca61'; c.fillRect(80, 0, 80, 16); });
  tex(scene, 'g_tiles', 92, 92, 0, 0, (c) => {
    c.fillStyle = '#f3e7d3'; c.fillRect(0, 0, 92, 92);
    c.fillStyle = '#e9d9bf'; c.fillRect(46, 0, 46, 46); c.fillRect(0, 46, 46, 46);
    c.strokeStyle = 'rgba(150,120,80,0.10)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 45, 45); c.strokeRect(46.5, 46.5, 45, 45); c.strokeRect(46.5, 0.5, 45, 45); c.strokeRect(0.5, 46.5, 45, 45);
  });
  tex(scene, 'd_rail_h', 46, 40, 0, 0.92, (c) => {
    const bar = (y) => { c.fillStyle = '#8a5726'; c.fillRect(0, y - 3, 46, 6); c.fillStyle = '#c98a4b'; c.fillRect(0, y - 3, 46, 2); };
    bar(37 - 26); bar(37 - 12);
  });
  tex(scene, 'd_rail_v', 12, 46, 0.5, 1, (c) => { c.fillStyle = '#8a5726'; c.fillRect(3, 0, 6, 46); c.fillStyle = '#c98a4b'; c.fillRect(3, 0, 2, 46); });

  tex(scene, 'd_sacks', 70, 56, 0.5, 0.88, (c) => {
    shadow(c, 35, 50, 32, 6);
    const sack = (x, y, w, h, col) => {
      c.beginPath(); c.moveTo(x + 4, y + h); c.quadraticCurveTo(x - 2, y + h * 0.4, x + w * 0.2, y + 6); c.quadraticCurveTo(x + w / 2, y, x + w * 0.8, y + 6);
      c.quadraticCurveTo(x + w + 2, y + h * 0.4, x + w - 4, y + h); c.closePath(); fillStroke(c, col, '#8a7a5a', 1.5);
      c.fillStyle = '#c0392b'; rr(c, x + w * 0.25, y + h * 0.45, w * 0.5, h * 0.22, 2); c.fill();
      text(c, 'FLOUR', x + w / 2, y + h * 0.56, 6, '#fff', 700);
    };
    sack(30, 10, 34, 40, '#efe6cf'); sack(6, 14, 34, 38, '#f6efdc');
  });
  tex(scene, 'd_drum', 50, 66, 0.5, 0.9, (c) => {
    shadow(c, 25, 60, 22, 5);
    rr(c, 5, 10, 40, 50, 6); c.fillStyle = lin(c, 5, 0, 45, 0, [[0, '#1d6fb8'], [0.4, '#4fa3e6'], [1, '#165791']]); c.fill(); c.strokeStyle = '#0f3e6b'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(15,62,107,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(5, 26); c.lineTo(45, 26); c.moveTo(5, 44); c.lineTo(45, 44); c.stroke();
    ell(c, 25, 10, 20, 6); fillStroke(c, '#5bb0f0', '#0f3e6b', 1.6);
    ell(c, 25, 10, 6, 2.5); c.fillStyle = '#0f3e6b'; c.fill();
  });
  tex(scene, 'd_plantain', 54, 44, 0.5, 0.85, (c) => {
    shadow(c, 27, 38, 24, 5);
    rr(c, 4, 24, 46, 14, 4); fillStroke(c, '#c48d52', '#7a4d22', 1.4);
    for (let i = 0; i < 5; i++) { c.save(); c.translate(12 + i * 7, 26); c.rotate(-0.5 + i * 0.25); ell(c, 0, -8, 4, 11); fillStroke(c, i % 2 ? '#f2c230' : '#e8b520', '#8a6a10', 1.2); c.restore(); }
  });

  tex(scene, 'd_post', 14, 40, 0.5, 0.92, (c) => {
    rr(c, 2, 4, 10, 34, 2); c.fillStyle = lin(c, 2, 0, 12, 0, [[0, '#b77a3f'], [1, '#8a5726']]); c.fill(); c.strokeStyle = '#5a3816'; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(2, 6); c.lineTo(7, 1); c.lineTo(12, 6); c.closePath(); c.fillStyle = '#c98a4b'; c.fill(); c.stroke();
  });
  tex(scene, 'd_palm', 150, 210, 0.5, 0.96, (c) => {
    shadow(c, 75, 200, 34, 8);
    // trunk
    c.beginPath(); c.moveTo(70, 200); c.quadraticCurveTo(62, 130, 78, 60); c.lineTo(86, 62); c.quadraticCurveTo(72, 130, 82, 200); c.closePath();
    c.fillStyle = '#9b7046'; c.fill(); c.strokeStyle = '#5e4024'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(80,50,25,0.6)'; c.lineWidth = 1.4;
    for (let y = 70; y < 196; y += 10) { const t = (y - 60) / 140; const x = 78 - t * 10 + 2; c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x + 2, y + 3, x + 8, y); c.stroke(); }
    // fronds
    const fr = (a, len, col) => {
      c.save(); c.translate(82, 60); c.rotate(a);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -18, len, 8); c.quadraticCurveTo(len * 0.5, -4, 0, 0);
      c.fillStyle = col; c.fill(); c.strokeStyle = '#2f6b25'; c.lineWidth = 1.2; c.stroke(); c.restore();
    };
    [[-2.9, 64, '#3f9a35'], [-2.2, 60, '#4fb043'], [-1.3, 50, '#47a63b'], [-0.6, 62, '#4fb043'], [0.1, 64, '#3f9a35'], [0.7, 50, '#358a2c'], [2.4, 52, '#358a2c'], [-1.8, 56, '#5cc04f']]
      .forEach(([a, l, col]) => fr(a, l, col));
    c.fillStyle = '#7a4e1a'; [[78, 66], [86, 68], [82, 72]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill(); });
  });
  tex(scene, 'd_tree', 130, 150, 0.5, 0.95, (c) => {
    shadow(c, 65, 140, 46, 10);
    rr(c, 58, 90, 14, 52, 4); c.fillStyle = '#8a5a30'; c.fill(); c.strokeStyle = '#5a3816'; c.lineWidth = 1.5; c.stroke();
    const blob = (x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = col; c.fill(); };
    [[40, 74, 30], [90, 74, 30], [65, 50, 36], [48, 40, 24], [86, 42, 24], [65, 84, 28]].forEach(([x, y, r]) => blob(x, y + 2, r, '#2f7d32'));
    [[40, 72, 28], [90, 72, 28], [65, 48, 34], [48, 38, 22], [86, 40, 22], [65, 82, 26]].forEach(([x, y, r]) => blob(x, y, r, '#43a047'));
    [[56, 36, 14], [80, 30, 10], [38, 62, 10]].forEach(([x, y, r]) => blob(x, y, r, 'rgba(160,230,120,0.55)'));
    // mangoes
    [[44, 86], [86, 84], [70, 64], [96, 60]].forEach(([x, y]) => { ell(c, x, y, 4.5, 5.5); c.fillStyle = '#ffb02e'; c.fill(); c.strokeStyle = '#c46a00'; c.lineWidth = 1; c.stroke(); });
  });
  tex(scene, 'd_bush', 70, 50, 0.5, 0.85, (c) => {
    shadow(c, 35, 42, 30, 6);
    [[20, 30, 14], [50, 30, 14], [35, 22, 17]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y + 2, r, 0, 7); c.fillStyle = '#2f7d32'; c.fill(); });
    [[20, 28, 13], [50, 28, 13], [35, 20, 16]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = '#4caf50'; c.fill(); });
    [[28, 14], [46, 20], [16, 26], [56, 28]].forEach(([x, y], i) => { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fillStyle = i % 2 ? '#ff5c8a' : '#ffd23f'; c.fill(); });
  });
  tex(scene, 'd_tuft', 24, 14, 0.5, 0.9, (c) => {
    c.strokeStyle = '#5fa040'; c.lineWidth = 2;
    [[4, 13, 2, 4], [9, 13, 8, 2], [14, 13, 16, 3], [19, 13, 22, 6]].forEach(([x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, y1 - 4, x2, y2); c.stroke(); });
  });
  tex(scene, 'd_flower', 16, 16, 0.5, 0.8, (c) => {
    c.strokeStyle = '#3f8a2c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(8, 15); c.lineTo(8, 8); c.stroke();
    c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; c.beginPath(); c.arc(8 + Math.cos(a) * 3, 6 + Math.sin(a) * 3, 2.4, 0, 7); c.fill(); }
    c.fillStyle = '#ffc928'; c.beginPath(); c.arc(8, 6, 2, 0, 7); c.fill();
  });
  tex(scene, 'd_stone', 22, 14, 0.5, 0.7, (c) => {
    ell(c, 11, 9, 9, 5); fillStroke(c, '#b7b2a6', '#7d786d', 1.2);
    ell(c, 9, 7, 4, 2); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
  });
  tex(scene, 'd_pot', 40, 50, 0.5, 0.92, (c) => {
    shadow(c, 20, 46, 16, 4);
    c.beginPath(); c.moveTo(8, 26); c.lineTo(32, 26); c.lineTo(28, 46); c.lineTo(12, 46); c.closePath(); fillStroke(c, '#d0703a', '#7a3a14', 1.5);
    rr(c, 6, 22, 28, 7, 2); fillStroke(c, '#e0844c', '#7a3a14', 1.5);
    [[14, 14, 8], [26, 14, 8], [20, 8, 9]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y + 4, r, 0, 7); c.fillStyle = '#3f9a35'; c.fill(); });
    c.fillStyle = '#ff5c8a'; c.beginPath(); c.arc(20, 8, 3, 0, 7); c.fill();
  });
}

// ---------- icons & effects ----------
function iconBase(c, s) { /* icons are drawn on transparent; containers provide plates */ }
function buildIcons(scene) {
  const S = 64;
  tex(scene, 'icon_puff', S, S, 0.5, 0.5, (c) => { drawPuff(c, 22, 38, 13); drawPuff(c, 42, 38, 13); drawPuff(c, 32, 22, 13); });
  tex(scene, 'icon_zobo', S, S, 0.5, 0.5, (c) => { drawZobo(c, 20, 6, 24, 52); });
  tex(scene, 'icon_cash', S, S, 0.5, 0.5, (c) => { drawCashBundle(c, 8, 30, 48, 24); drawCashBundle(c, 12, 16, 48, 24); });
  tex(scene, 'icon_bus', S, S, 0.5, 0.5, (c) => {
    rr(c, 6, 14, 52, 34, 8); fillStroke(c, '#2b9d48', '#124d22', 2.5);
    c.save(); rr(c, 6, 14, 52, 34, 8); c.clip(); c.fillStyle = '#7a4a22'; c.fillRect(6, 35, 52, 14); c.restore();
    c.fillStyle = '#f3e3c3'; c.fillRect(6, 34, 52, 2);
    c.fillStyle = '#2c3e55'; rr(c, 11, 19, 12, 12, 3); c.fill(); rr(c, 26, 19, 12, 12, 3); c.fill(); rr(c, 41, 19, 12, 12, 3); c.fill();
    [18, 46].forEach((x) => { c.beginPath(); c.arc(x, 49, 6.5, 0, 7); c.fillStyle = '#1a1a1a'; c.fill(); c.beginPath(); c.arc(x, 49, 2.5, 0, 7); c.fillStyle = '#bbb'; c.fill(); });
  });
  tex(scene, 'icon_up', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(32, 6); c.lineTo(56, 32); c.lineTo(42, 32); c.lineTo(42, 56); c.lineTo(22, 56); c.lineTo(22, 32); c.lineTo(8, 32); c.closePath();
    c.fillStyle = lin(c, 0, 6, 0, 56, [[0, '#7ef07e'], [1, '#2bb34a']]); c.fill(); c.strokeStyle = '#1a7a32'; c.lineWidth = 3; c.stroke();
  });
  const face = (key, shirt, hair) => tex(scene, key, S, S, 0.5, 0.5, (c) => {
    rr(c, 14, 40, 36, 22, 10); c.fillStyle = shirt; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(32, 28, 15, 0, 7); c.fillStyle = '#8d5a36'; c.fill(); c.stroke();
    c.fillStyle = '#2a1b14'; ell(c, 26, 29, 2, 2.6); c.fill(); ell(c, 38, 29, 2, 2.6); c.fill();
    c.strokeStyle = '#3a1a0e'; c.lineWidth = 2; c.beginPath(); c.arc(32, 33, 4, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    if (hair === 'cap') { c.beginPath(); c.arc(32, 24, 15.5, Math.PI, 0); c.closePath(); c.fillStyle = shirt; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke(); ell(c, 42, 23, 11, 3); c.fill(); c.stroke(); }
    else { c.beginPath(); c.arc(32, 25, 15.5, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(32, 16, 17, 25); c.closePath(); c.fillStyle = '#20140e'; c.fill(); c.beginPath(); c.arc(32, 9, 7, 0, 7); c.fill(); }
  });
  face('icon_cashier', '#7b2d8b', 'puff');
  face('icon_runner', '#0f8b8d', 'cap');
  tex(scene, 'icon_table', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(32, 4); c.lineTo(4, 26); c.quadraticCurveTo(32, 34, 60, 26); c.closePath(); c.fillStyle = '#ff7a1a'; c.fill(); c.strokeStyle = '#a14c0c'; c.lineWidth = 2; c.stroke();
    rr(c, 30, 26, 4, 26, 2); c.fillStyle = '#ccc'; c.fill();
    ell(c, 32, 48, 22, 7); fillStroke(c, '#fff', '#8c8c8c', 2);
  });
  tex(scene, 'icon_sign', S, S, 0.5, 0.5, (c) => {
    rr(c, 6, 12, 52, 34, 8); c.fillStyle = '#2a1840'; c.fill(); c.strokeStyle = '#ff4fa3'; c.lineWidth = 3; c.stroke();
    c.shadowColor = '#ff4fa3'; c.shadowBlur = 6; text(c, 'OPEN', 32, 29, 14, '#ffd6ec', 700); c.shadowBlur = 0;
    rr(c, 14, 46, 4, 14, 1); rr(c, 46, 46, 4, 14, 1); c.fillStyle = '#4b525b'; c.fill();
  });
  tex(scene, 'icon_tray', S, S, 0.5, 0.5, (c) => {
    ell(c, 32, 46, 26, 8); fillStroke(c, '#f8f8f4', '#1f4fa8', 3);
    drawPuff(c, 24, 36, 8); drawPuff(c, 40, 36, 8); drawPuff(c, 32, 24, 8);
  });
  tex(scene, 'icon_shoe', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(8, 44); c.quadraticCurveTo(8, 30, 24, 28); c.lineTo(36, 26); c.quadraticCurveTo(56, 30, 58, 44); c.closePath();
    fillStroke(c, '#ff7a1a', '#a14c0c', 2.5);
    rr(c, 6, 42, 54, 8, 4); fillStroke(c, '#fff6e0', '#a14c0c', 2);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, 30); c.lineTo(34, 40); c.moveTo(28, 28); c.lineTo(40, 38); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3; [[0, 18], [0, 30]].forEach(([, y]) => { c.beginPath(); c.moveTo(0, y); c.lineTo(10, y); c.stroke(); });
  });
  tex(scene, 'icon_fire', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(32, 4); c.quadraticCurveTo(54, 26, 50, 42); c.quadraticCurveTo(46, 60, 32, 60); c.quadraticCurveTo(14, 60, 14, 42); c.quadraticCurveTo(14, 30, 24, 22); c.quadraticCurveTo(24, 32, 30, 34); c.quadraticCurveTo(26, 18, 32, 4); c.closePath();
    c.fillStyle = lin(c, 0, 4, 0, 60, [[0, '#ffd23f'], [1, '#ff4d1a']]); c.fill(); c.strokeStyle = '#a12a0c'; c.lineWidth = 2.5; c.stroke();
    c.beginPath(); c.moveTo(32, 30); c.quadraticCurveTo(42, 42, 40, 50); c.quadraticCurveTo(36, 56, 32, 56); c.quadraticCurveTo(24, 56, 24, 48); c.quadraticCurveTo(26, 40, 32, 30); c.fillStyle = '#fff3b0'; c.fill();
  });
  tex(scene, 'icon_star', S, S, 0.5, 0.5, (c) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 12 : 27; c.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); }
    c.closePath(); c.fillStyle = lin(c, 0, 6, 0, 60, [[0, '#ffe066'], [1, '#f5a400']]); c.fill(); c.strokeStyle = '#a86a00'; c.lineWidth = 3; c.stroke();
  });
  tex(scene, 'icon_lock', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.arc(32, 26, 12, Math.PI, 0); c.strokeStyle = '#7d8a96'; c.lineWidth = 6; c.stroke();
    rr(c, 16, 26, 32, 28, 6); fillStroke(c, '#ffd23f', '#a86a00', 2.5);
  });
  tex(scene, 'icon_sound', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(10, 24); c.lineTo(22, 24); c.lineTo(34, 12); c.lineTo(34, 52); c.lineTo(22, 40); c.lineTo(10, 40); c.closePath(); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(36, 32, 10, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(36, 32, 18, -0.8, 0.8); c.stroke();
  });
  tex(scene, 'icon_mute', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(10, 24); c.lineTo(22, 24); c.lineTo(34, 12); c.lineTo(34, 52); c.lineTo(22, 40); c.lineTo(10, 40); c.closePath(); c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.moveTo(42, 24); c.lineTo(56, 40); c.moveTo(56, 24); c.lineTo(42, 40); c.stroke();
  });
  tex(scene, 'icon_music', S, S, 0.5, 0.5, (c) => {
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 4;
    ell(c, 20, 48, 8, 6); c.fill(); ell(c, 46, 42, 8, 6); c.fill();
    c.beginPath(); c.moveTo(27, 48); c.lineTo(27, 14); c.lineTo(53, 8); c.lineTo(53, 42); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(27, 18); c.lineTo(53, 12); c.stroke();
  });
  tex(scene, 'icon_check', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.arc(32, 32, 26, 0, 7); c.fillStyle = '#2bb34a'; c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(19, 33); c.lineTo(28, 42); c.lineTo(45, 23); c.stroke();
  });
  tex(scene, 'icon_happy', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.arc(32, 32, 26, 0, 7); c.fillStyle = '#ffd23f'; c.fill(); c.strokeStyle = '#c48a00'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#5a3a00'; ell(c, 23, 26, 3.4, 4.6); c.fill(); ell(c, 41, 26, 3.4, 4.6); c.fill();
    c.strokeStyle = '#5a3a00'; c.lineWidth = 4; c.beginPath(); c.arc(32, 34, 12, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,90,90,0.5)'; ell(c, 16, 38, 5, 3); c.fill(); ell(c, 48, 38, 5, 3); c.fill();
  });
  tex(scene, 'icon_heart', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 36, 8, 10, 32, 20); c.bezierCurveTo(56, 10, 60, 36, 32, 54); c.closePath();
    c.fillStyle = '#ff4f7a'; c.fill(); c.strokeStyle = '#a8143a'; c.lineWidth = 3; c.stroke();
  });

  // items
  tex(scene, 'item_puff', 28, 26, 0.5, 0.82, (c) => { drawPuff(c, 14, 13, 11); });
  tex(scene, 'item_zobo', 20, 36, 0.5, 0.96, (c) => { drawZobo(c, 1.5, 1, 17, 34); });
  tex(scene, 'item_cash', 38, 22, 0.5, 0.75, (c) => { drawCashBundle(c, 2, 2, 34, 18); });

  // guidance arrow (points down)
  tex(scene, 'ui_arrow', 70, 84, 0.5, 1, (c) => {
    const path = () => { c.beginPath(); c.moveTo(22, 4); c.lineTo(48, 4); c.lineTo(48, 40); c.lineTo(64, 40); c.lineTo(35, 78); c.lineTo(6, 40); c.lineTo(22, 40); c.closePath(); };
    c.save(); c.translate(3, 4); path(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fill(); c.restore();
    path(); c.fillStyle = lin(c, 0, 4, 0, 78, [[0, '#ffd23f'], [1, '#ff8a1a']]); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.stroke();
    c.strokeStyle = '#b8560a'; c.lineWidth = 2; c.stroke();
  });
  // small pointer used to point at off-screen goals (points right)
  tex(scene, 'ui_pointer', 48, 40, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(4, 8); c.lineTo(44, 20); c.lineTo(4, 32); c.lineTo(14, 20); c.closePath();
    c.fillStyle = '#ffd23f'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.stroke(); c.strokeStyle = '#b8560a'; c.lineWidth = 1.5; c.stroke();
  });

  // particles
  tex(scene, 'fx_dot', 16, 16, 0.5, 0.5, (c) => { c.beginPath(); c.arc(8, 8, 7, 0, 7); c.fillStyle = '#fff'; c.fill(); });
  tex(scene, 'fx_soft', 40, 40, 0.5, 0.5, (c) => { c.beginPath(); c.arc(20, 20, 19, 0, 7); c.fillStyle = rad(c, 20, 20, 0, 20, 20, 19, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]); c.fill(); });
  tex(scene, 'fx_conf', 12, 8, 0.5, 0.5, (c) => { rr(c, 0, 0, 12, 8, 2); c.fillStyle = '#fff'; c.fill(); });
  tex(scene, 'fx_star', 24, 24, 0.5, 0.5, (c) => {
    c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const r = i % 2 ? 4 : 11; c.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); } c.closePath(); c.fillStyle = '#fff'; c.fill();
  });
}

export function buildAllTextures(scene) {
  buildCharacterParts(scene);
  buildMachines(scene);
  buildScenery(scene);
  buildIcons(scene);
  buildBuka(scene);
  buildLoungeIcons(scene);
}

// =====================================================================
// Branch 2 (Buka) art, plus icons used by the endless systems.
// =====================================================================

function drawJollofPlate(c, cx, cy, w) {
  const h = w * 0.42;
  ell(c, cx, cy + h * 0.12, w / 2, h / 2); c.fillStyle = '#c9ced4'; c.fill();
  ell(c, cx, cy, w / 2, h / 2); fillStroke(c, '#ffffff', '#9aa3ad', 1.2);
  ell(c, cx, cy, w * 0.38, h * 0.36); c.strokeStyle = 'rgba(44,123,229,0.35)'; c.lineWidth = 1; c.stroke();
  // rice mound
  c.beginPath(); c.moveTo(cx - w * 0.33, cy + h * 0.08);
  c.quadraticCurveTo(cx - w * 0.2, cy - h * 0.75, cx + w * 0.05, cy - h * 0.55);
  c.quadraticCurveTo(cx + w * 0.3, cy - h * 0.6, cx + w * 0.3, cy + h * 0.1);
  c.quadraticCurveTo(cx, cy + h * 0.35, cx - w * 0.33, cy + h * 0.08); c.closePath();
  c.fillStyle = lin(c, 0, cy - h * 0.7, 0, cy + h * 0.3, [[0, '#ff9a3c'], [1, '#d4521a']]); c.fill();
  c.fillStyle = 'rgba(255,230,180,0.7)';
  for (let i = 0; i < 14; i++) { const a = i * 2.4, r = (i % 5) / 5; ell(c, cx - w * 0.15 + Math.cos(a) * w * 0.14 * r, cy - h * 0.2 + Math.sin(a) * h * 0.25 * r, 1.3, 0.7); c.fill(); }
  // chicken leg + dodo slices
  ell(c, cx + w * 0.22, cy - h * 0.05, w * 0.12, h * 0.22); fillStroke(c, '#a0521d', '#6b3410', 1);
  ell(c, cx + w * 0.2, cy - h * 0.12, w * 0.06, h * 0.08); c.fillStyle = 'rgba(255,200,140,0.5)'; c.fill();
  [[-0.3, 0.18], [-0.18, 0.26]].forEach(([dx, dy]) => { ell(c, cx + dx * w, cy + dy * h, w * 0.07, h * 0.12); fillStroke(c, '#f2a33a', '#a8561a', 1); });
  [[-0.05, -0.35], [0.08, -0.2]].forEach(([dx, dy]) => { ell(c, cx + dx * w, cy + dy * h, 1.6, 1.2); c.fillStyle = '#3aa35a'; c.fill(); });
}

function drawNoodleBowl(c, cx, cy, w) {
  const h = w * 0.5;
  c.beginPath(); c.moveTo(cx - w / 2, cy - h * 0.15); c.quadraticCurveTo(cx - w * 0.45, cy + h * 0.7, cx, cy + h * 0.72); c.quadraticCurveTo(cx + w * 0.45, cy + h * 0.7, cx + w / 2, cy - h * 0.15); c.closePath();
  c.fillStyle = lin(c, cx - w / 2, 0, cx + w / 2, 0, [[0, '#f6f6f6'], [0.5, '#ffffff'], [1, '#d6dbe0']]); c.fill(); c.strokeStyle = '#8c96a1'; c.lineWidth = 1.2; c.stroke();
  c.strokeStyle = '#e33d3d'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx - w * 0.44, cy + h * 0.15); c.quadraticCurveTo(cx, cy + h * 0.32, cx + w * 0.44, cy + h * 0.15); c.stroke();
  ell(c, cx, cy - h * 0.15, w / 2, h * 0.24); fillStroke(c, '#ffe29a', '#8c96a1', 1.2);
  c.strokeStyle = '#e8b33a'; c.lineWidth = 1.3;
  for (let i = 0; i < 6; i++) { c.beginPath(); const y = cy - h * 0.25 + i * 2; c.moveTo(cx - w * 0.38, y); for (let x = -0.38; x <= 0.38; x += 0.08) c.lineTo(cx + x * w, y + Math.sin(x * 40 + i) * 1.4); c.stroke(); }
  // fried egg
  ell(c, cx + w * 0.12, cy - h * 0.22, w * 0.16, h * 0.13); fillStroke(c, '#ffffff', '#d9d9d9', 0.8);
  c.beginPath(); c.arc(cx + w * 0.12, cy - h * 0.24, w * 0.06, 0, 7); c.fillStyle = '#ffb21f'; c.fill();
  c.fillStyle = '#3aa35a'; [[-0.2, -0.2], [-0.08, -0.1]].forEach(([dx, dy]) => { ell(c, cx + dx * w, cy + dy * h, 1.8, 1); c.fill(); });
}

function drawAkaraBall(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; const rr2 = r * (1 + 0.12 * Math.sin(a * 6 + cx)); const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2 * 0.9; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath();
  c.fillStyle = rad(c, cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.1, [[0, '#e8a24a'], [0.5, '#b8661e'], [1, '#6e3510']]); c.fill();
  c.strokeStyle = '#5a2a0c'; c.lineWidth = Math.max(0.8, r * 0.1); c.stroke();
  c.fillStyle = 'rgba(80,35,10,0.6)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(cx + Math.cos(i * 1.7) * r * 0.45, cy + Math.sin(i * 1.7) * r * 0.4, r * 0.1, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(255,230,170,0.6)'; ell(c, cx - r * 0.35, cy - r * 0.4, r * 0.25, r * 0.14); c.fill();
}

function drawAkaraWrap(c, cx, cy, w) {
  const h = w * 0.55;
  // paper wrap
  c.beginPath(); c.moveTo(cx - w / 2, cy - h * 0.1); c.lineTo(cx + w / 2, cy - h * 0.2); c.lineTo(cx + w * 0.42, cy + h * 0.5); c.lineTo(cx - w * 0.44, cy + h * 0.55); c.closePath();
  fillStroke(c, '#efe6cf', '#a89a78', 1);
  c.strokeStyle = 'rgba(80,80,80,0.35)'; c.lineWidth = 0.7;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - w * 0.38, cy + h * (0.05 + i * 0.12)); c.lineTo(cx + w * 0.32, cy + h * (-0.02 + i * 0.12)); c.stroke(); }
  drawAkaraBall(c, cx - w * 0.2, cy - h * 0.05, w * 0.17);
  drawAkaraBall(c, cx + w * 0.18, cy - h * 0.1, w * 0.17);
  drawAkaraBall(c, cx, cy - h * 0.38, w * 0.17);
}

function drawLoaf(c, x, y, w, h) {
  rr(c, x, y + h * 0.25, w, h * 0.75, h * 0.25); c.fillStyle = '#f7ead2'; c.fill(); c.strokeStyle = '#b8935a'; c.lineWidth = 1.2; c.stroke();
  c.beginPath(); c.moveTo(x + 2, y + h * 0.45); c.quadraticCurveTo(x + w * 0.25, y - h * 0.15, x + w * 0.5, y + h * 0.2); c.quadraticCurveTo(x + w * 0.75, y - h * 0.15, x + w - 2, y + h * 0.45); c.closePath();
  c.fillStyle = lin(c, 0, y, 0, y + h * 0.5, [[0, '#e0a04a'], [1, '#b8742a']]); c.fill(); c.strokeStyle = '#8a5320'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, x + w * 0.3, y + h * 0.18, w * 0.12, h * 0.06); c.fill();
  // nylon wrap + label
  rr(c, x + w * 0.38, y + h * 0.48, w * 0.24, h * 0.3, 2); c.fillStyle = '#e33d3d'; c.fill();
}

function drawMalt(c, x, y, w, h) {
  const cx = x + w / 2;
  rr(c, cx - w * 0.16, y, w * 0.32, h * 0.08, 1); fillStroke(c, '#d9b23a', '#7a5c00', 1);
  c.beginPath(); c.moveTo(cx - w * 0.14, y + h * 0.08); c.lineTo(cx + w * 0.14, y + h * 0.08);
  c.quadraticCurveTo(cx + w * 0.18, y + h * 0.3, cx + w * 0.46, y + h * 0.42); c.lineTo(cx + w * 0.46, y + h * 0.94);
  c.quadraticCurveTo(cx + w * 0.46, y + h, cx + w * 0.34, y + h); c.lineTo(cx - w * 0.34, y + h);
  c.quadraticCurveTo(cx - w * 0.46, y + h, cx - w * 0.46, y + h * 0.94); c.lineTo(cx - w * 0.46, y + h * 0.42);
  c.quadraticCurveTo(cx - w * 0.18, y + h * 0.3, cx - w * 0.14, y + h * 0.08); c.closePath();
  c.fillStyle = lin(c, x, 0, x + w, 0, [[0, '#2a1407'], [0.4, '#5c2e10'], [1, '#1f0e05']]); c.fill(); c.strokeStyle = '#140904'; c.lineWidth = 1.2; c.stroke();
  rr(c, cx - w * 0.46, y + h * 0.55, w * 0.92, h * 0.26, 1); c.fillStyle = '#f2c230'; c.fill();
  rr(c, cx - w * 0.3, y + h * 0.6, w * 0.6, h * 0.16, 1); c.fillStyle = '#c81e1e'; c.fill();
  rr(c, cx - w * 0.32, y + h * 0.42, w * 0.1, h * 0.5, 2); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill();
}

function drawDirtyPlate(c, cx, cy, w) {
  const h = w * 0.4;
  ell(c, cx, cy + h * 0.1, w / 2, h / 2); c.fillStyle = '#a9aeb5'; c.fill();
  ell(c, cx, cy, w / 2, h / 2); fillStroke(c, '#e9ebee', '#8c96a1', 1.2);
  c.fillStyle = 'rgba(212,82,26,0.55)'; ell(c, cx - w * 0.1, cy, w * 0.18, h * 0.16); c.fill();
  c.fillStyle = 'rgba(140,80,30,0.6)'; [[0.15, -0.1], [0.05, 0.15], [-0.25, -0.12]].forEach(([dx, dy]) => { c.beginPath(); c.arc(cx + dx * w, cy + dy * h, 1.2, 0, 7); c.fill(); });
  c.strokeStyle = 'rgba(120,90,60,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + w * 0.05, cy - h * 0.2); c.lineTo(cx + w * 0.3, cy + h * 0.1); c.stroke();
}

function faceIcon(c, shirt, hat, extra) {
  rr(c, 14, 40, 36, 22, 10); c.fillStyle = shirt; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.stroke();
  c.beginPath(); c.arc(32, 28, 15, 0, 7); c.fillStyle = '#7a4a2a'; c.fill(); c.stroke();
  c.fillStyle = '#2a1b14'; ell(c, 26, 29, 2, 2.6); c.fill(); ell(c, 38, 29, 2, 2.6); c.fill();
  c.strokeStyle = '#3a1a0e'; c.lineWidth = 2; c.beginPath(); c.arc(32, 33, 4, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  if (hat === 'cap') { c.beginPath(); c.arc(32, 24, 15.5, Math.PI, 0); c.closePath(); c.fillStyle = shirt; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke(); ell(c, 42, 23, 11, 3); c.fill(); c.stroke(); }
  else if (hat === 'wrap') { c.beginPath(); c.moveTo(14, 26); c.quadraticCurveTo(14, 6, 32, 8); c.quadraticCurveTo(52, 6, 50, 26); c.quadraticCurveTo(32, 18, 14, 26); c.fillStyle = shirt; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke(); }
  else { c.beginPath(); c.arc(32, 25, 15.5, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(32, 16, 17, 25); c.closePath(); c.fillStyle = '#20140e'; c.fill(); }
  if (extra) extra(c);
}

function buildBuka(scene) {
  // green street-name sign on a pole (text is added in the scene)
  tex(scene, 'd_roadsign', 132, 92, 0.5, 0.96, (c) => {
    shadow(c, 66, 86, 16, 4);
    rr(c, 63, 30, 6, 58, 2); c.fillStyle = '#7d8a96'; c.fill();
    rr(c, 4, 4, 124, 32, 5); fillStroke(c, '#1f7a37', '#ffffff', 2.5);
  });
  // big welcome arch board for the market
  tex(scene, 'd_archsign', 260, 150, 0.5, 0.96, (c) => {
    shadow(c, 130, 144, 110, 6);
    for (const px of [20, 240]) { rr(c, px - 6, 30, 12, 116, 3); c.fillStyle = '#4b525b'; c.fill(); }
    rr(c, 6, 8, 248, 56, 10); c.fillStyle = lin(c, 0, 8, 0, 64, [[0, '#2b9d48'], [1, '#1c7a34']]); c.fill(); c.strokeStyle = '#f3e3c3'; c.lineWidth = 3; c.stroke();
  });
  // ---------- ground ----------
  tex(scene, 'g_laterite', 128, 128, 0, 0, (c) => {
    c.fillStyle = '#c9794a'; c.fillRect(0, 0, 128, 128);
    const r = new Phaser.Math.RandomDataGenerator(['laterite']);
    for (let i = 0; i < 160; i++) { c.fillStyle = r.pick(['rgba(150,80,40,0.35)', 'rgba(230,160,110,0.35)', 'rgba(120,60,30,0.3)']); c.beginPath(); c.arc(r.between(0, 128), r.between(0, 128), r.realInRange(0.6, 2.4), 0, 7); c.fill(); }
  });
  tex(scene, 'g_terrazzo', 128, 128, 0, 0, (c) => {
    c.fillStyle = '#ded8cc'; c.fillRect(0, 0, 128, 128);
    const r = new Phaser.Math.RandomDataGenerator(['terrazzo']);
    for (let i = 0; i < 220; i++) { c.fillStyle = r.pick(['#b9b1a2', '#f4efe6', '#c9794a', '#8c96a1', '#a8b8a0']); c.beginPath(); c.arc(r.between(0, 128), r.between(0, 128), r.realInRange(0.5, 1.8), 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(120,110,95,0.25)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 127, 127);
  });
  tex(scene, 'g_ktiles', 92, 92, 0, 0, (c) => {
    c.fillStyle = '#f4f7fb'; c.fillRect(0, 0, 92, 92);
    c.fillStyle = '#cfe3f7'; c.fillRect(46, 0, 46, 46); c.fillRect(0, 46, 46, 46);
    c.strokeStyle = 'rgba(80,110,150,0.18)'; c.lineWidth = 1; for (const [x, y] of [[0, 0], [46, 0], [0, 46], [46, 46]]) c.strokeRect(x + 0.5, y + 0.5, 45, 45);
  });
  tex(scene, 'fx_bulb', 12, 16, 0.5, 0.2, (c) => {
    rr(c, 4, 0, 4, 4, 1); c.fillStyle = '#555'; c.fill();
    ell(c, 6, 9, 4.5, 6); c.fillStyle = '#ffffff'; c.fill();
    ell(c, 4.6, 7.5, 1.4, 2); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill();
  });

  // ---------- items ----------
  tex(scene, 'item_jollof', 36, 24, 0.5, 0.72, (c) => drawJollofPlate(c, 18, 14, 34));
  tex(scene, 'item_noodles', 32, 28, 0.5, 0.8, (c) => drawNoodleBowl(c, 16, 12, 30));
  tex(scene, 'item_akara', 32, 26, 0.5, 0.75, (c) => drawAkaraWrap(c, 16, 14, 30));
  tex(scene, 'item_bread', 36, 22, 0.5, 0.82, (c) => drawLoaf(c, 2, 2, 32, 18));
  tex(scene, 'item_malt', 18, 36, 0.5, 0.96, (c) => drawMalt(c, 1.5, 1, 15, 34));
  tex(scene, 'item_dirty', 34, 16, 0.5, 0.6, (c) => drawDirtyPlate(c, 17, 7, 32));

  // ---------- icons ----------
  const S = 64;
  tex(scene, 'icon_jollof', S, S, 0.5, 0.5, (c) => drawJollofPlate(c, 32, 36, 58));
  tex(scene, 'icon_noodles', S, S, 0.5, 0.5, (c) => drawNoodleBowl(c, 32, 26, 56));
  tex(scene, 'icon_akara', S, S, 0.5, 0.5, (c) => drawAkaraWrap(c, 32, 30, 56));
  tex(scene, 'icon_bread', S, S, 0.5, 0.5, (c) => drawLoaf(c, 6, 16, 52, 34));
  tex(scene, 'icon_malt', S, S, 0.5, 0.5, (c) => drawMalt(c, 20, 4, 24, 56));
  tex(scene, 'icon_dirty', S, S, 0.5, 0.5, (c) => { drawDirtyPlate(c, 32, 40, 54); drawDirtyPlate(c, 32, 30, 54); });
  tex(scene, 'icon_btable', S, S, 0.5, 0.5, (c) => {
    rr(c, 8, 30, 8, 26, 2); c.fillStyle = '#c81e1e'; c.fill(); rr(c, 48, 30, 8, 26, 2); c.fill();
    rr(c, 14, 18, 36, 10, 3); fillStroke(c, '#ffffff', '#8c8c8c', 2);
    c.fillStyle = '#e33d3d'; for (let i = 0; i < 6; i++) if (i % 2 === 0) c.fillRect(15 + i * 6, 19, 6, 8);
    rr(c, 18, 28, 4, 26, 1); rr(c, 42, 28, 4, 26, 1); c.fillStyle = '#9a6532'; c.fill();
  });
  tex(scene, 'icon_waiter', S, S, 0.5, 0.5, (c) => faceIcon(c, '#ffffff', 'wrap', (cc) => { ell(cc, 50, 14, 12, 4); fillStroke(cc, '#f8f8f4', '#1f4fa8', 2); }));
  tex(scene, 'icon_cleaner', S, S, 0.5, 0.5, (c) => faceIcon(c, '#2bb34a', 'cap', (cc) => { cc.strokeStyle = '#9a6532'; cc.lineWidth = 3; cc.beginPath(); cc.moveTo(54, 6); cc.lineTo(48, 52); cc.stroke(); ell(cc, 47, 56, 8, 4); cc.fillStyle = '#5ec2ff'; cc.fill(); }));
  tex(scene, 'icon_loader', S, S, 0.5, 0.5, (c) => faceIcon(c, '#ffc928', 'short', (cc) => { rr(cc, 40, 36, 20, 18, 2); fillStroke(cc, '#c48d52', '#7a4d22', 2); cc.strokeStyle = '#7a4d22'; cc.beginPath(); cc.moveTo(40, 44); cc.lineTo(60, 44); cc.stroke(); }));
  tex(scene, 'icon_manager', S, S, 0.5, 0.5, (c) => faceIcon(c, '#5b4bd6', 'short', (cc) => { rr(cc, 42, 34, 16, 22, 2); fillStroke(cc, '#ffffff', '#555', 1.5); cc.fillStyle = '#888'; for (let i = 0; i < 3; i++) cc.fillRect(45, 40 + i * 5, 10, 2); cc.fillStyle = '#e33d3d'; cc.beginPath(); cc.moveTo(32, 42); cc.lineTo(29, 56); cc.lineTo(35, 56); cc.closePath(); cc.fill(); }));
  tex(scene, 'icon_keke', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(10, 46); c.lineTo(12, 22); c.quadraticCurveTo(14, 12, 26, 12); c.lineTo(50, 12); c.quadraticCurveTo(56, 14, 56, 24); c.lineTo(56, 46); c.closePath();
    fillStroke(c, '#ffd21f', '#7a5c00', 2.5);
    c.fillStyle = '#1b8b3a'; c.fillRect(10, 36, 46, 5);
    rr(c, 16, 17, 16, 14, 3); c.fillStyle = '#2c3e55'; c.fill(); rr(c, 36, 17, 16, 14, 3); c.fill();
    c.fillStyle = '#1b1b1b'; rr(c, 8, 8, 50, 6, 3); c.fill();
    [16, 50].forEach((x) => { c.beginPath(); c.arc(x, 50, 6.5, 0, 7); c.fillStyle = '#1a1a1a'; c.fill(); c.beginPath(); c.arc(x, 50, 2.5, 0, 7); c.fillStyle = '#bbb'; c.fill(); });
  });
  tex(scene, 'icon_bulb', S, S, 0.5, 0.5, (c) => {
    c.shadowColor = '#ffd23f'; c.shadowBlur = 14;
    c.beginPath(); c.arc(32, 26, 16, 0, 7); c.fillStyle = '#fff3b0'; c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#c48a00'; c.lineWidth = 2; c.stroke();
    rr(c, 24, 40, 16, 12, 3); fillStroke(c, '#9aa3ad', '#4b525b', 2);
    c.strokeStyle = '#c48a00'; c.lineWidth = 2; c.beginPath(); c.moveTo(27, 36); c.lineTo(30, 26); c.lineTo(34, 30); c.lineTo(37, 22); c.stroke();
  });
  tex(scene, 'icon_fan', S, S, 0.5, 0.5, (c) => {
    for (let i = 0; i < 3; i++) { c.save(); c.translate(32, 30); c.rotate(i * 2.094); ell(c, 0, -13, 7, 13); fillStroke(c, '#5ec2ff', '#1f4fa8', 2); c.restore(); }
    c.beginPath(); c.arc(32, 30, 5, 0, 7); c.fillStyle = '#1f4fa8'; c.fill();
    rr(c, 30, 34, 4, 20, 2); c.fillStyle = '#4b525b'; c.fill(); rr(c, 20, 52, 24, 6, 3); c.fill();
  });
  tex(scene, 'icon_safe', S, S, 0.5, 0.5, (c) => {
    rr(c, 8, 10, 48, 44, 6); fillStroke(c, '#7d8a96', '#3c4550', 3);
    rr(c, 14, 16, 36, 32, 4); fillStroke(c, '#9aa3ad', '#3c4550', 2);
    c.beginPath(); c.arc(32, 32, 9, 0, 7); fillStroke(c, '#ffd23f', '#a86a00', 2);
    for (let i = 0; i < 4; i++) { c.save(); c.translate(32, 32); c.rotate(i * Math.PI / 2); c.fillStyle = '#a86a00'; c.fillRect(-1, -8, 2, 5); c.restore(); }
    drawCashBundle(c, 34, 2, 26, 14);
  });
  tex(scene, 'icon_angry', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.arc(32, 32, 26, 0, 7); c.fillStyle = '#ff6b4a'; c.fill(); c.strokeStyle = '#a12a0c'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#4a1005'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(16, 20); c.lineTo(28, 26); c.moveTo(48, 20); c.lineTo(36, 26); c.stroke();
    c.fillStyle = '#4a1005'; ell(c, 24, 31, 3, 3.5); c.fill(); ell(c, 40, 31, 3, 3.5); c.fill();
    c.beginPath(); c.arc(32, 50, 10, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
  });
  tex(scene, 'icon_map', S, S, 0.5, 0.5, (c) => {
    c.beginPath(); c.moveTo(6, 16); c.lineTo(22, 10); c.lineTo(42, 16); c.lineTo(58, 10); c.lineTo(58, 50); c.lineTo(42, 56); c.lineTo(22, 50); c.lineTo(6, 56); c.closePath();
    fillStroke(c, '#fff6e0', '#7a4d22', 2.5);
    c.fillStyle = '#e8d9b5'; c.beginPath(); c.moveTo(22, 10); c.lineTo(42, 16); c.lineTo(42, 56); c.lineTo(22, 50); c.closePath(); c.fill();
    c.strokeStyle = '#2bb34a'; c.lineWidth = 3; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(12, 44); c.quadraticCurveTo(30, 20, 48, 30); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(48, 36); c.arc(48, 24, 8, 0.8 * Math.PI, 2.2 * Math.PI); c.closePath(); fillStroke(c, '#e33d3d', '#7a1a10', 2);
    c.beginPath(); c.arc(48, 24, 3, 0, 7); c.fillStyle = '#fff'; c.fill();
  });
  tex(scene, 'icon_goals', S, S, 0.5, 0.5, (c) => {
    rr(c, 12, 10, 40, 50, 6); fillStroke(c, '#c48d52', '#7a4d22', 2.5);
    rr(c, 17, 16, 30, 40, 3); c.fillStyle = '#fffdf6'; c.fill();
    rr(c, 24, 6, 16, 9, 3); fillStroke(c, '#9aa3ad', '#4b525b', 2);
    for (let i = 0; i < 3; i++) {
      const y = 25 + i * 10;
      c.strokeStyle = i < 2 ? '#2bb34a' : '#c9b99c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(20, y); c.lineTo(23, y + 3); c.lineTo(28, y - 3); c.stroke();
      c.fillStyle = '#b9ab90'; c.fillRect(31, y - 1, 13, 3);
    }
  });

  // ---------- machines ----------
  // firewood jollof: big aluminium pot on three stones
  tex(scene, 'm_jollof', 150, 140, 0.5, 0.86, (c) => {
    shadow(c, 75, 122, 62, 14);
    // firewood + flames
    [[30, 112, 0.3], [120, 114, -0.3], [75, 120, 0]].forEach(([x, y, a]) => { c.save(); c.translate(x, y); c.rotate(a); rr(c, -26, -5, 52, 10, 5); fillStroke(c, '#8a5a30', '#4a2e14', 1.5); c.restore(); });
    for (let i = -3; i <= 3; i++) { const fx = 75 + i * 9; c.beginPath(); c.moveTo(fx - 6, 112); c.quadraticCurveTo(fx, 84 - (3 - Math.abs(i)) * 4, fx + 6, 112); c.closePath(); c.fillStyle = 'rgba(255,120,20,0.9)'; c.fill(); c.beginPath(); c.moveTo(fx - 3, 112); c.quadraticCurveTo(fx, 96, fx + 3, 112); c.closePath(); c.fillStyle = 'rgba(255,220,80,0.95)'; c.fill(); }
    [[34, 104], [116, 104], [75, 112]].forEach(([x, y]) => { ell(c, x, y, 12, 8); fillStroke(c, '#8c8478', '#4b4640', 1.5); });
    // pot
    c.beginPath(); c.moveTo(26, 46); c.lineTo(30, 96); c.quadraticCurveTo(75, 108, 120, 96); c.lineTo(124, 46); c.closePath();
    c.fillStyle = lin(c, 26, 0, 124, 0, [[0, '#8c96a1'], [0.35, '#e6eaee'], [0.6, '#b8c0c8'], [1, '#6b7580']]); c.fill(); c.strokeStyle = '#4b525b'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.moveTo(30, 86); c.quadraticCurveTo(75, 100, 120, 86); c.lineTo(120, 96); c.quadraticCurveTo(75, 108, 30, 96); c.closePath(); c.fill(); // soot
    for (const hx of [20, 130]) { ell(c, hx, 54, 7, 4); c.strokeStyle = '#4b525b'; c.lineWidth = 3; c.stroke(); }
    ell(c, 75, 46, 50, 14); fillStroke(c, '#d9dee3', '#4b525b', 2);
    ell(c, 75, 47, 45, 11); c.fillStyle = rad(c, 65, 42, 2, 75, 47, 46, [[0, '#ffb066'], [0.6, '#f07a2a'], [1, '#c4501a']]); c.fill();
    c.fillStyle = 'rgba(255,235,190,0.8)'; for (let i = 0; i < 26; i++) { const a = i * 2.39, r = (i % 7) / 7; ell(c, 75 + Math.cos(a) * 38 * r, 47 + Math.sin(a) * 9 * r, 1.4, 0.8); c.fill(); }
    // lid leaning + wooden spoon
    ell(c, 120, 30, 22, 8); fillStroke(c, '#cfd6dd', '#4b525b', 1.8);
    c.beginPath(); c.arc(120, 24, 3, 0, 7); c.fillStyle = '#4b525b'; c.fill();
    c.strokeStyle = '#9a6532'; c.lineWidth = 4; c.beginPath(); c.moveTo(60, 46); c.lineTo(40, 8); c.stroke();
    ell(c, 62, 48, 6, 3); c.fillStyle = '#9a6532'; c.fill();
  });
  tex(scene, 'm_platetray', 74, 34, 0.5, 0.55, (c) => {
    shadow(c, 37, 27, 34, 7);
    ell(c, 37, 16, 34, 11); c.fillStyle = '#7d8a96'; c.fill();
    ell(c, 37, 14, 34, 11); fillStroke(c, '#d9dee3', '#5d6670', 1.6);
    ell(c, 37, 14, 28, 8); c.strokeStyle = 'rgba(93,102,112,0.35)'; c.lineWidth = 1; c.stroke();
  });
  // noodle pot on a gas ring
  tex(scene, 'm_noodle', 140, 132, 0.5, 0.86, (c) => {
    shadow(c, 70, 112, 58, 14);
    rr(c, 8, 50, 24, 52, 9); c.fillStyle = lin(c, 8, 0, 32, 0, [[0, '#2bb34a'], [0.4, '#6fd88a'], [1, '#1e8a37']]); c.fill(); c.strokeStyle = '#145c25'; c.lineWidth = 1.6; c.stroke();
    rr(c, 14, 42, 12, 10, 3); fillStroke(c, '#c9ced4', '#5d6670', 1.4);
    c.strokeStyle = '#3a3f46'; c.lineWidth = 4; [[48, 108], [92, 108], [70, 114]].forEach(([lx, ly]) => { c.beginPath(); c.moveTo(70, 88); c.lineTo(lx, ly); c.stroke(); });
    ell(c, 70, 90, 30, 9); fillStroke(c, '#4b525b', '#2a2e33', 2);
    for (let i = -3; i <= 3; i++) { const fx = 70 + i * 7; c.beginPath(); c.moveTo(fx - 2, 90); c.quadraticCurveTo(fx, 80, fx + 2, 90); c.closePath(); c.fillStyle = 'rgba(80,170,255,0.9)'; c.fill(); }
    c.beginPath(); c.moveTo(32, 40); c.lineTo(34, 86); c.quadraticCurveTo(70, 96, 106, 86); c.lineTo(108, 40); c.closePath();
    c.fillStyle = lin(c, 32, 0, 108, 0, [[0, '#8c96a1'], [0.35, '#eef1f4'], [0.6, '#b8c0c8'], [1, '#6b7580']]); c.fill(); c.strokeStyle = '#4b525b'; c.lineWidth = 2; c.stroke();
    ell(c, 70, 40, 38, 11); fillStroke(c, '#d9dee3', '#4b525b', 2);
    ell(c, 70, 41, 34, 8.5); c.fillStyle = '#f5d070'; c.fill();
    c.strokeStyle = '#d9a92a'; c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { c.beginPath(); const y = 36 + i * 2; c.moveTo(42, y); for (let x = 42; x <= 98; x += 4) c.lineTo(x, y + Math.sin(x * 0.6 + i) * 1.6); c.stroke(); }
    ell(c, 82, 39, 9, 5); fillStroke(c, '#ffffff', '#d9d9d9', 0.8); c.beginPath(); c.arc(82, 38, 3, 0, 7); c.fillStyle = '#ffb21f'; c.fill();
    // noodle packs stacked beside
    rr(c, 108, 92, 24, 14, 2); fillStroke(c, '#ffd23f', '#a86a00', 1.2); rr(c, 110, 80, 24, 14, 2); fillStroke(c, '#e33d3d', '#7a1a10', 1.2);
  });
  // akara: black wok + bowl of bean batter
  tex(scene, 'm_akara', 140, 132, 0.5, 0.86, (c) => {
    shadow(c, 70, 112, 60, 15);
    rr(c, 4, 64, 34, 22, 8); fillStroke(c, '#f2f2f2', '#9aa3ad', 1.6);
    ell(c, 21, 64, 17, 6); fillStroke(c, '#f2e6c8', '#9aa3ad', 1.4);
    ell(c, 21, 64, 13, 4); c.fillStyle = '#e8d6a6'; c.fill();
    c.strokeStyle = '#9a6532'; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 64); c.lineTo(34, 40); c.stroke();
    c.strokeStyle = '#3a3f46'; c.lineWidth = 4; [[50, 108], [94, 108], [72, 114]].forEach(([lx, ly]) => { c.beginPath(); c.moveTo(72, 86); c.lineTo(lx, ly); c.stroke(); });
    ell(c, 72, 88, 30, 9); fillStroke(c, '#4b525b', '#2a2e33', 2);
    for (let i = -3; i <= 3; i++) { const fx = 72 + i * 7; c.beginPath(); c.moveTo(fx - 3, 88); c.quadraticCurveTo(fx, 76, fx + 3, 88); c.closePath(); c.fillStyle = 'rgba(255,140,30,0.9)'; c.fill(); }
    c.beginPath(); c.moveTo(28, 48); c.quadraticCurveTo(34, 92, 72, 92); c.quadraticCurveTo(110, 92, 116, 48); c.closePath();
    c.fillStyle = lin(c, 28, 0, 116, 0, [[0, '#1e2125'], [0.35, '#4a5058'], [0.6, '#2b2f34'], [1, '#141619']]); c.fill(); c.strokeStyle = '#0c0d0f'; c.lineWidth = 2; c.stroke();
    ell(c, 72, 48, 45, 14); fillStroke(c, '#33383e', '#0c0d0f', 2);
    ell(c, 72, 49, 40, 11); c.fillStyle = rad(c, 62, 44, 2, 72, 49, 42, [[0, '#ffe08a'], [0.5, '#f0b23c'], [1, '#c27a12']]); c.fill();
    drawAkaraBall(c, 56, 48, 7); drawAkaraBall(c, 74, 53, 7.5); drawAkaraBall(c, 90, 46, 6.5); drawAkaraBall(c, 70, 41, 6);
    c.strokeStyle = 'rgba(255,255,230,0.85)'; c.lineWidth = 1; [[44, 52, 2], [100, 50, 2.4], [84, 56, 1.6]].forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx, by, br, 0, 7); c.stroke(); });
  });
  // bread oven: clay dome with a fire mouth and chimney
  tex(scene, 'm_oven', 140, 150, 0.5, 0.88, (c) => {
    shadow(c, 70, 134, 62, 13);
    rr(c, 14, 92, 112, 40, 6); c.fillStyle = '#9b6532'; c.fill(); c.strokeStyle = '#5a3816'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(90,56,22,0.5)'; c.lineWidth = 1; for (let y = 102; y < 132; y += 10) { c.beginPath(); c.moveTo(14, y); c.lineTo(126, y); c.stroke(); }
    c.beginPath(); c.moveTo(18, 96); c.quadraticCurveTo(20, 24, 70, 22); c.quadraticCurveTo(120, 24, 122, 96); c.closePath();
    c.fillStyle = lin(c, 18, 0, 122, 0, [[0, '#a8562a'], [0.4, '#d97b45'], [1, '#8a4320']]); c.fill(); c.strokeStyle = '#5a2a10'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(90,40,15,0.35)'; for (let i = 0; i < 18; i++) { const a = 3.4 + i * 0.16; ell(c, 70 + Math.cos(a) * 42, 70 + Math.sin(a) * 40, 5, 3); c.fill(); }
    c.beginPath(); c.moveTo(46, 96); c.lineTo(46, 72); c.quadraticCurveTo(70, 50, 94, 72); c.lineTo(94, 96); c.closePath(); c.fillStyle = '#2a1206'; c.fill();
    c.beginPath(); c.moveTo(52, 96); c.lineTo(52, 78); c.quadraticCurveTo(70, 62, 88, 78); c.lineTo(88, 96); c.closePath(); c.fillStyle = rad(c, 70, 92, 2, 70, 86, 30, [[0, '#ffe066'], [0.5, '#ff8a1a'], [1, '#7a1a05']]); c.fill();
    drawLoaf(c, 56, 80, 28, 14);
    rr(c, 86, 6, 16, 26, 2); fillStroke(c, '#7d4020', '#4a220c', 1.6);
  });
  tex(scene, 'm_breadtray', 74, 34, 0.5, 0.55, (c) => {
    shadow(c, 37, 27, 34, 7);
    rr(c, 4, 10, 66, 18, 4); c.fillStyle = '#2c7be5'; c.fill(); c.strokeStyle = '#174b8f'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#174b8f'; for (let i = 0; i < 6; i++) rr(c, 8 + i * 10.5, 14, 6, 10, 2), c.fill();
    c.beginPath(); c.moveTo(4, 10); c.lineTo(10, 4); c.lineTo(64, 4); c.lineTo(70, 10); c.closePath(); fillStroke(c, '#5ea2f0', '#174b8f', 1.6);
  });
  // drinks fridge
  tex(scene, 'm_fridge', 110, 172, 0.5, 0.9, (c) => {
    shadow(c, 55, 158, 48, 10);
    rr(c, 10, 6, 90, 150, 8); fillStroke(c, '#d92b2b', '#7a1010', 2);
    rr(c, 10, 6, 90, 24, 8); c.fillStyle = '#b81e1e'; c.fill();
    text(c, 'CHILLED', 55, 18, 12, '#ffffff', 700);
    rr(c, 18, 34, 74, 112, 4); c.fillStyle = 'rgba(200,235,255,0.9)'; c.fill(); c.strokeStyle = '#8c96a1'; c.lineWidth = 2; c.stroke();
    for (let r = 0; r < 4; r++) {
      const y = 38 + r * 27;
      c.fillStyle = '#9aa3ad'; c.fillRect(20, y + 24, 70, 2);
      for (let i = 0; i < 5; i++) drawMalt(c, 22 + i * 13.5, y + 1, 11, 23);
    }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(24, 36); c.lineTo(40, 36); c.lineTo(24, 90); c.closePath(); c.fill();
    rr(c, 84, 70, 4, 30, 2); c.fillStyle = '#d9dee3'; c.fill();
  });
  // washing station
  tex(scene, 'm_sink', 140, 116, 0.5, 0.86, (c) => {
    shadow(c, 70, 102, 62, 11);
    for (const lx of [24, 116]) { rr(c, lx - 3, 56, 6, 44, 2); c.fillStyle = '#7d8a96'; c.fill(); }
    rr(c, 10, 40, 120, 24, 5); fillStroke(c, '#cfd6dd', '#5d6670', 2);
    rr(c, 18, 44, 48, 16, 4); c.fillStyle = '#8fc9f0'; c.fill(); rr(c, 74, 44, 48, 16, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)'; [[30, 50, 4], [40, 47, 3], [52, 52, 4], [86, 49, 3], [100, 52, 4]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    c.strokeStyle = '#7d8a96'; c.lineWidth = 4; c.beginPath(); c.moveTo(70, 42); c.lineTo(70, 22); c.lineTo(84, 22); c.lineTo(84, 30); c.stroke();
    // drying rack with clean plates
    rr(c, 98, 8, 36, 30, 3); c.strokeStyle = '#9aa3ad'; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < 4; i++) { ell(c, 106 + i * 7, 22, 3, 11); fillStroke(c, '#ffffff', '#9aa3ad', 1); }
    // soap + bucket
    rr(c, 14, 30, 12, 10, 2); fillStroke(c, '#7ef07e', '#2bb34a', 1.2);
    rr(c, 2, 76, 24, 22, 5); fillStroke(c, '#2c7be5', '#174b8f', 1.6);
  });
  // dining table with checked cloth and two plastic chairs
  tex(scene, 'm_btable', 176, 96, 0.5, 0.64, (c) => {
    shadow(c, 88, 70, 74, 14);
    const chair = (x, flip) => {
      c.save(); c.translate(x, 0); c.scale(flip, 1);
      rr(c, 6, 20, 8, 44, 3); c.fillStyle = '#c81e1e'; c.fill(); c.strokeStyle = '#7a1010'; c.lineWidth = 1.4; c.stroke();
      rr(c, -12, 46, 24, 10, 3); fillStroke(c, '#e33d3d', '#7a1010', 1.4);
      c.fillStyle = '#7a1010'; c.fillRect(-10, 56, 3, 14); c.fillRect(7, 56, 3, 14);
      c.restore();
    };
    chair(30, -1); chair(146, 1);
    rr(c, 84, 38, 8, 30, 2); c.fillStyle = '#7a4d22'; c.fill();
    rr(c, 44, 14, 88, 34, 5); c.fillStyle = '#ffffff'; c.fill();
    c.save(); rr(c, 44, 14, 88, 34, 5); c.clip();
    c.fillStyle = 'rgba(227,61,61,0.75)'; for (let x = 44; x < 132; x += 11) c.fillRect(x, 14, 5.5, 34);
    c.fillStyle = 'rgba(227,61,61,0.45)'; for (let y = 14; y < 48; y += 8.5) c.fillRect(44, y, 88, 4.25);
    c.restore();
    rr(c, 44, 14, 88, 34, 5); c.strokeStyle = '#8c3a3a'; c.lineWidth = 1.6; c.stroke();
    rr(c, 44, 44, 88, 8, 3); c.fillStyle = '#e8e2d6'; c.fill(); c.strokeStyle = '#8c3a3a'; c.stroke();
  });
  // keke napep (tricycle), facing left
  tex(scene, 'm_keke', 190, 150, 0.5, 0.9, (c) => {
    shadow(c, 95, 132, 84, 12, 0.25);
    rr(c, 30, 8, 140, 18, 8); c.fillStyle = '#1b1b1b'; c.fill(); // canvas roof
    c.beginPath(); c.moveTo(40, 26); c.lineTo(36, 104); c.lineTo(170, 104); c.lineTo(168, 26); c.closePath();
    c.fillStyle = 'rgba(30,30,30,0.85)'; c.fill();
    c.beginPath(); c.moveTo(14, 70); c.quadraticCurveTo(16, 36, 46, 30); c.lineTo(60, 30); c.lineTo(60, 116); c.lineTo(22, 116); c.quadraticCurveTo(12, 112, 14, 96); c.closePath();
    c.fillStyle = lin(c, 0, 30, 0, 116, [[0, '#ffe066'], [1, '#e8b800']]); c.fill(); c.strokeStyle = '#7a5c00'; c.lineWidth = 2; c.stroke();
    rr(c, 60, 56, 112, 60, 10); c.fillStyle = lin(c, 0, 56, 0, 116, [[0, '#ffd21f'], [1, '#d99a00']]); c.fill(); c.strokeStyle = '#7a5c00'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#1b8b3a'; c.fillRect(14, 92, 158, 8);
    rr(c, 22, 38, 34, 26, 5); c.fillStyle = '#2c3e55'; c.fill(); // windscreen
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.moveTo(26, 60); c.lineTo(36, 40); c.lineTo(42, 40); c.lineTo(32, 60); c.closePath(); c.fill();
    rr(c, 70, 34, 90, 26, 4); c.fillStyle = '#2c3e55'; c.fill();
    c.fillStyle = '#4a2e1b'; c.beginPath(); c.arc(100, 56, 9, Math.PI, 0); c.fill(); c.fillStyle = '#6b432a'; c.beginPath(); c.arc(132, 56, 9, Math.PI, 0); c.fill();
    ell(c, 18, 80, 4, 6); fillStroke(c, '#fff8cc', '#7a5c00', 1.5);
    rr(c, 112, 70, 50, 12, 3); c.fillStyle = '#fff'; c.fill(); text(c, 'ABA', 137, 76.5, 9, '#1b8b3a', 700);
    for (const [wx, r] of [[30, 15], [150, 16]]) { c.beginPath(); c.arc(wx, 120, r, 0, 7); c.fillStyle = '#1a1a1a'; c.fill(); c.beginPath(); c.arc(wx, 120, r * 0.45, 0, 7); c.fillStyle = '#b8c0c8'; c.fill(); }
  });
  tex(scene, 'm_generator', 110, 90, 0.5, 0.86, (c) => {
    shadow(c, 55, 78, 48, 9);
    c.strokeStyle = '#2a2e33'; c.lineWidth = 4; rr(c, 10, 18, 90, 58, 6); c.stroke();
    rr(c, 16, 26, 78, 46, 5); fillStroke(c, '#ffc928', '#a86a00', 2);
    rr(c, 22, 34, 34, 22, 3); fillStroke(c, '#e33d3d', '#7a1010', 1.5);
    text(c, 'TIGER', 39, 45, 10, '#ffffff', 700);
    rr(c, 62, 34, 26, 30, 3); fillStroke(c, '#4b525b', '#2a2e33', 1.5);
    c.fillStyle = '#2a2e33'; for (let i = 0; i < 5; i++) c.fillRect(66, 38 + i * 5, 18, 2);
    rr(c, 84, 8, 8, 14, 2); fillStroke(c, '#7d8a96', '#4b525b', 1.4);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, 60); c.quadraticCurveTo(0, 70, 4, 86); c.stroke();
  });
  tex(scene, 'm_bukasign', 200, 100, 0.5, 0.95, (c) => {
    for (const px of [34, 166]) { rr(c, px - 4, 44, 8, 52, 2); c.fillStyle = '#4b525b'; c.fill(); }
    rr(c, 6, 6, 188, 56, 8); c.fillStyle = lin(c, 0, 6, 0, 62, [[0, '#ffd23f'], [1, '#f5a400']]); c.fill(); c.strokeStyle = '#7a4d00'; c.lineWidth = 2.5; c.stroke();

  });
}

// =====================================================================
// Level 3 (GRA Lounge) icons: dishes, staff, decor
// =====================================================================
function plateBase(c, cx, cy, w) {
  const h = w * 0.42;
  ell(c, cx, cy + h * 0.14, w / 2, h / 2); c.fillStyle = '#b9c0c8'; c.fill();
  ell(c, cx, cy, w / 2, h / 2); fillStroke(c, '#ffffff', '#a7b0ba', 1.3);
  ell(c, cx, cy, w * 0.36, h * 0.34); c.strokeStyle = 'rgba(200,170,90,0.6)'; c.lineWidth = 1.2; c.stroke();
}
function buildLoungeIcons(scene) {
  const S = 64;
  const T = (key, fn) => tex(scene, key, S, S, 0.5, 0.5, fn);
  T('icon_steak', (c) => {
    plateBase(c, 32, 40, 58);
    c.beginPath(); c.moveTo(14, 38); c.quadraticCurveTo(16, 24, 32, 26); c.quadraticCurveTo(48, 24, 46, 36); c.quadraticCurveTo(44, 46, 28, 45); c.quadraticCurveTo(14, 46, 14, 38); c.closePath();
    c.fillStyle = lin(c, 0, 24, 0, 46, [[0, '#a3542c'], [1, '#5e2a12']]); c.fill(); c.strokeStyle = '#3d1a0a'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(30,10,0,0.55)'; c.lineWidth = 2.2; for (const x of [22, 30, 38]) { c.beginPath(); c.moveTo(x - 3, 30); c.lineTo(x + 4, 41); c.stroke(); }
    c.fillStyle = '#f2c14e'; for (let i = 0; i < 5; i++) { rr(c, 40 + i * 2.2, 36 - i * 2, 3, 12, 1.5); c.fill(); }
    c.fillStyle = '#3f9b4a'; c.beginPath(); c.arc(18, 44, 3, 0, 7); c.fill();
  });
  T('icon_pasta', (c) => {
    plateBase(c, 32, 40, 58);
    c.strokeStyle = '#f3d27a'; c.lineWidth = 2.6;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(32 + (i % 3 - 1) * 5, 36 + Math.floor(i / 3) * 2 - 2, 9 - (i % 4), i * 0.7, i * 0.7 + 4.2); c.stroke(); }
    c.fillStyle = '#ff7a5c'; for (const [x, y] of [[24, 34], [40, 36], [33, 30]]) { c.beginPath(); c.ellipse(x, y, 4, 2.6, 0.5, 0, 7); c.fill(); }
    c.fillStyle = '#3f9b4a'; for (const [x, y] of [[29, 38], [37, 33]]) { c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill(); }
  });
  T('icon_salad', (c) => {
    ell(c, 32, 44, 26, 12); c.fillStyle = '#d7dde3'; c.fill();
    c.beginPath(); c.moveTo(6, 34); c.quadraticCurveTo(32, 66, 58, 34); c.closePath(); fillStroke(c, '#ffffff', '#a7b0ba', 1.3);
    for (const [x, y, col] of [[18, 30, '#5cb85c'], [28, 26, '#7bd36b'], [40, 27, '#4aa84a'], [47, 32, '#69c35d'], [24, 34, '#8fe07a']]) { c.beginPath(); c.ellipse(x, y, 8, 5, 0.4, 0, 7); c.fillStyle = col; c.fill(); }
    c.fillStyle = '#ff4f4f'; c.beginPath(); c.arc(36, 32, 3.5, 0, 7); c.fill(); c.beginPath(); c.arc(26, 30, 3, 0, 7); c.fill();
    c.fillStyle = '#f7e2a0'; rr(c, 30, 26, 6, 5, 1); c.fill(); rr(c, 42, 30, 5, 5, 1); c.fill();
  });
  T('icon_pizza', (c) => {
    c.beginPath(); c.arc(32, 34, 25, 0, 7); c.fillStyle = '#d99a4e'; c.fill(); c.strokeStyle = '#9a5f22'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(32, 34, 20, 0, 7); c.fillStyle = '#e8522f'; c.fill();
    c.fillStyle = '#ffe9a8'; for (const [x, y, r] of [[24, 28, 6], [38, 26, 5], [34, 40, 6], [22, 40, 4], [44, 38, 4]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.fillStyle = '#3f9b4a'; for (const [x, y] of [[30, 32], [40, 33], [26, 36]]) { c.beginPath(); c.ellipse(x, y, 3, 1.6, 0.6, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(120,60,20,0.5)'; c.lineWidth = 1.2; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(32, 34); c.lineTo(32 + Math.cos(a) * 24, 34 + Math.sin(a) * 24); c.stroke(); }
  });
  T('icon_dessert', (c) => {
    plateBase(c, 32, 46, 52);
    c.beginPath(); c.moveTo(16, 42); c.lineTo(16, 24); c.lineTo(46, 18); c.lineTo(46, 38); c.closePath(); c.fillStyle = '#5a2e1a'; c.fill();
    c.beginPath(); c.moveTo(16, 24); c.lineTo(46, 18); c.lineTo(50, 21); c.lineTo(20, 27); c.closePath(); c.fillStyle = '#3a1c0f'; c.fill();
    c.fillStyle = '#f5e6d0'; c.fillRect(16, 31, 30, 3);
    c.fillStyle = '#e8263c'; c.beginPath(); c.arc(32, 17, 4.5, 0, 7); c.fill();
    c.strokeStyle = '#3f9b4a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(32, 13); c.lineTo(35, 9); c.stroke();
  });
  T('icon_drink', (c) => {
    c.beginPath(); c.moveTo(14, 12); c.lineTo(50, 12); c.lineTo(34, 34); c.lineTo(30, 34); c.closePath();
    c.fillStyle = lin(c, 0, 12, 0, 34, [[0, '#ff9a6a'], [1, '#e8455a']]); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(18, 14); c.lineTo(28, 14); c.lineTo(30, 20); c.closePath(); c.fill();
    c.strokeStyle = '#e8e8e8'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 34); c.lineTo(32, 52); c.stroke();
    ell(c, 32, 54, 11, 3.5); c.fillStyle = '#e8e8e8'; c.fill();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(47, 13, 6, 0, 7); c.fill(); c.strokeStyle = '#e8a400'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = '#3f9b4a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(24, 6); c.lineTo(30, 18); c.stroke();
  });
  T('icon_lounge', (c) => {
    plateBase(c, 32, 46, 60);
    c.beginPath(); c.moveTo(10, 44); c.quadraticCurveTo(10, 14, 32, 14); c.quadraticCurveTo(54, 14, 54, 44); c.closePath();
    c.fillStyle = lin(c, 10, 14, 54, 44, [[0, '#f4f6f8'], [0.5, '#c4cbd3'], [1, '#8e979f']]); c.fill(); c.strokeStyle = '#6b737b'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(22, 26, 5, 9, 0.5, 0, 7); c.fill();
    c.beginPath(); c.arc(32, 12, 4, 0, 7); c.fillStyle = '#d9b26a'; c.fill(); c.strokeStyle = '#8a6a2a'; c.stroke();
  });
  T('icon_ltable', (c) => {
    ell(c, 32, 30, 26, 11); c.fillStyle = '#ffffff'; c.fill();
    c.beginPath(); c.moveTo(6, 30); c.lineTo(10, 46); c.quadraticCurveTo(32, 54, 54, 46); c.lineTo(58, 30); c.closePath(); c.fillStyle = '#eef0f2'; c.fill(); c.strokeStyle = '#b8c0c8'; c.lineWidth = 1.4; c.stroke();
    ell(c, 32, 30, 26, 11); c.strokeStyle = '#c9d0d6'; c.stroke();
    rr(c, 30, 18, 4, 10, 2); c.fillStyle = '#f5f0e0'; c.fill();
    c.fillStyle = '#ffcf5a'; c.beginPath(); c.ellipse(32, 16, 2.4, 4, 0, 0, 7); c.fill();
    for (const x of [6, 58]) { rr(c, x - 6, 20, 12, 30, 5); c.fillStyle = '#b5523b'; c.fill(); }
  });
  T('icon_booth', (c) => {
    rr(c, 6, 14, 52, 22, 10); c.fillStyle = '#1f6b52'; c.fill();
    for (let i = 0; i < 4; i++) { rr(c, 9 + i * 12.5, 17, 10, 16, 4); c.fillStyle = '#2a8a6a'; c.fill(); }
    rr(c, 4, 34, 56, 14, 6); c.fillStyle = '#1a5a45'; c.fill();
    rr(c, 22, 44, 20, 14, 3); c.fillStyle = '#6b4226'; c.fill();
  });
  const person = (key, top, hat, extra) => T(key, (c) => {
    rr(c, 13, 38, 38, 24, 11); c.fillStyle = top; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(32, 26, 14, 0, 7); c.fillStyle = '#7a4a2a'; c.fill(); c.stroke();
    c.fillStyle = '#1b120c'; c.beginPath(); c.arc(32, 22, 14, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    c.fillStyle = '#20140e'; c.beginPath(); c.arc(27, 27, 1.8, 0, 7); c.arc(37, 27, 1.8, 0, 7); c.fill();
    if (hat) hat(c);
    if (extra) extra(c);
  });
  person('icon_host', '#1e1e24', null, (c) => { c.fillStyle = '#d9b26a'; rr(c, 40, 44, 9, 4, 1); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(27, 38); c.lineTo(32, 48); c.lineTo(37, 38); c.fill(); });
  person('icon_lwaiter', '#ffffff', null, (c) => { c.fillStyle = '#1e1e24'; rr(c, 17, 42, 9, 20, 3); c.fill(); rr(c, 38, 42, 9, 20, 3); c.fill(); c.fillStyle = '#1e1e24'; c.beginPath(); c.moveTo(28, 39); c.lineTo(32, 43); c.lineTo(36, 39); c.lineTo(32, 46); c.fill(); });
  person('icon_busser', '#2f3a4a', null, (c) => { c.fillStyle = '#d7dde3'; ell(c, 48, 48, 10, 4); c.fill(); ell(c, 48, 45, 10, 4); c.fill(); });
  person('icon_planner', '#7b2d8b', null, (c) => { rr(c, 40, 40, 14, 18, 2); c.fillStyle = '#fff6e0'; c.fill(); c.strokeStyle = '#7a6450'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#e8455a'; c.fillRect(43, 44, 8, 2); c.fillRect(43, 49, 6, 2); });
  person('icon_lmanager', '#2c3e66', null, (c) => { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(27, 38); c.lineTo(32, 50); c.lineTo(37, 38); c.fill(); c.fillStyle = '#c0392b'; c.fillRect(31, 40, 2.5, 10); });
  T('icon_chandelier', (c) => {
    c.strokeStyle = '#b8913a'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 2); c.lineTo(32, 16); c.stroke();
    ell(c, 32, 22, 22, 6); c.strokeStyle = '#d9b26a'; c.lineWidth = 3; c.stroke();
    ell(c, 32, 34, 14, 4); c.stroke();
    c.shadowColor = '#fff1b8'; c.shadowBlur = 10;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; c.fillStyle = '#fff6d6'; c.beginPath(); c.ellipse(32 + Math.cos(a) * 22, 26 + Math.sin(a) * 6, 2.4, 5, 0, 0, 7); c.fill(); }
    c.shadowBlur = 0;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillStyle = 'rgba(220,235,255,0.9)'; c.beginPath(); c.moveTo(32 + Math.cos(a) * 14, 36); c.lineTo(32 + Math.cos(a) * 14 - 1.5, 44 + (i % 3) * 4); c.lineTo(32 + Math.cos(a) * 14 + 1.5, 44 + (i % 3) * 4); c.fill(); }
  });
  T('icon_band', (c) => {
    c.save(); c.translate(32, 32); c.rotate(-0.6);
    rr(c, -6, -28, 12, 30, 3); c.fillStyle = '#6b3f1f'; c.fill();
    c.beginPath(); c.ellipse(0, 14, 13, 16, 0, 0, 7); c.fillStyle = '#c0392b'; c.fill(); c.strokeStyle = '#7a1a10'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 12, 4, 0, 7); c.fillStyle = '#1e1e24'; c.fill();
    c.strokeStyle = '#eeeeee'; c.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 1.6, -26); c.lineTo(i * 1.6, 26); c.stroke(); }
    c.restore();
    c.fillStyle = '#d9b26a'; c.beginPath(); c.arc(50, 14, 4, 0, 7); c.fill(); c.fillRect(53, 2, 2, 12);
  });
  T('icon_art', (c) => {
    rr(c, 6, 8, 52, 46, 3); c.fillStyle = '#c9a24a'; c.fill();
    rr(c, 11, 13, 42, 36, 2); c.fillStyle = '#f4ead6'; c.fill();
    c.fillStyle = '#e07a3a'; c.beginPath(); c.arc(24, 28, 9, 0, 7); c.fill();
    c.fillStyle = '#1f6b52'; c.beginPath(); c.moveTo(11, 49); c.lineTo(30, 30); c.lineTo(53, 49); c.fill();
    c.fillStyle = '#2c3e66'; c.fillRect(38, 18, 10, 14);
  });
  T('icon_party', (c) => {
    rr(c, 12, 30, 40, 26, 4); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#d9b26a'; c.lineWidth = 2; c.stroke();
    rr(c, 12, 30, 40, 7, 3); c.fillStyle = '#ff7ab0'; c.fill();
    for (const x of [22, 32, 42]) { rr(c, x - 1.5, 18, 3, 12, 1); c.fillStyle = '#7ec8ff'; c.fill(); c.fillStyle = '#ffcf5a'; c.beginPath(); c.ellipse(x, 15, 2.2, 3.5, 0, 0, 7); c.fill(); }
    c.fillStyle = '#e8455a'; for (const [x, y] of [[8, 10], [56, 14], [50, 6], [12, 22]]) { c.fillRect(x, y, 3, 3); }
  });
  T('icon_fountain', (c) => {
    ell(c, 32, 50, 26, 8); c.fillStyle = '#c9c2b4'; c.fill(); ell(c, 32, 48, 22, 6); c.fillStyle = '#5ec2ff'; c.fill();
    rr(c, 28, 26, 8, 22, 2); c.fillStyle = '#d8d1c3'; c.fill();
    ell(c, 32, 26, 12, 4); c.fillStyle = '#c9c2b4'; c.fill();
    c.strokeStyle = '#9ad8ff'; c.lineWidth = 2.5;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(32, 18); c.quadraticCurveTo(32 + s * 14, 4, 32 + s * 20, 44); c.stroke(); }
    c.beginPath(); c.moveTo(32, 22); c.lineTo(32, 6); c.stroke();
  });
  T('icon_terrace', (c) => {
    c.beginPath(); c.moveTo(4, 26); c.quadraticCurveTo(32, -4, 60, 26); c.closePath(); c.fillStyle = '#f4ead6'; c.fill(); c.strokeStyle = '#c9a24a'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#1f6b52'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(4 + i * 14, 26); c.quadraticCurveTo(11 + i * 14, 14, 18 + i * 14, 26); c.fill(); }
    c.strokeStyle = '#6b737b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(32, 10); c.lineTo(32, 54); c.stroke();
    ell(c, 32, 46, 18, 5); c.fillStyle = '#ffffff'; c.fill();
  });
  T('icon_vip', (c) => {
    c.beginPath(); c.moveTo(8, 46); c.lineTo(12, 18); c.lineTo(24, 32); c.lineTo(32, 12); c.lineTo(40, 32); c.lineTo(52, 18); c.lineTo(56, 46); c.closePath();
    c.fillStyle = lin(c, 0, 12, 0, 46, [[0, '#ffe58a'], [1, '#d9a21a']]); c.fill(); c.strokeStyle = '#8a6200'; c.lineWidth = 2; c.stroke();
    rr(c, 8, 46, 48, 8, 3); c.fillStyle = '#d9a21a'; c.fill(); c.stroke();
  });
  T('icon_dish', (c) => { plateBase(c, 32, 40, 54); plateBase(c, 32, 32, 54); });
  person('icon_washer', '#2f6f8f', null, (c) => {
    c.fillStyle = '#f2c14e'; rr(c, 40, 40, 12, 18, 4); c.fill();
    c.fillStyle = 'rgba(160,220,255,0.95)'; for (const [x, y, r] of [[12, 44, 4], [8, 52, 3], [16, 54, 2.5]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  });
  T('icon_machine', (c) => {
    rr(c, 10, 10, 44, 46, 6); c.fillStyle = lin(c, 0, 10, 0, 56, [[0, '#e9edf0'], [1, '#9aa3ab']]); c.fill(); c.strokeStyle = '#5e666e'; c.lineWidth = 2; c.stroke();
    rr(c, 16, 22, 32, 26, 4); c.fillStyle = '#2a3a46'; c.fill();
    c.fillStyle = 'rgba(140,210,255,0.8)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(22 + i * 5, 40 - (i % 2) * 6, 3, 0, 7); c.fill(); }
    c.fillStyle = '#2bb34a'; c.beginPath(); c.arc(44, 15, 2.6, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y] of [[20, 6], [30, 3], [40, 6]]) { c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); }
  });
  T('icon_wash', (c) => {
    plateBase(c, 30, 40, 50);
    c.fillStyle = 'rgba(120,200,255,0.95)';
    for (const [x, y, r] of [[46, 18, 7], [36, 12, 5], [52, 30, 4.5], [22, 16, 4]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(120,200,255,0.95)'; }
  });
  T('icon_greet', (c) => {
    c.beginPath(); c.arc(32, 32, 27, 0, 7); c.fillStyle = lin(c, 0, 5, 0, 59, [[0, '#ffe58a'], [1, '#e0a21a']]); c.fill(); c.strokeStyle = '#8a6200'; c.lineWidth = 2.5; c.stroke();
    // a waving hand
    c.save(); c.translate(32, 35); c.rotate(-0.25);
    c.fillStyle = '#8d5a36'; c.strokeStyle = '#4a2a10'; c.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { rr(c, -10 + i * 5.4, -19 + Math.abs(i - 1.5) * 2.2, 4.8, 16, 2.4); c.fill(); c.stroke(); }
    rr(c, -11, -6, 22, 17, 7); c.fill(); c.stroke();
    c.save(); c.translate(-10, 2); c.rotate(-0.9); rr(c, -2.4, -11, 4.8, 12, 2.4); c.fill(); c.stroke(); c.restore();
    c.restore();
    c.strokeStyle = '#ffffff'; c.lineWidth = 2.2; c.lineCap = 'round';
    for (const [a, r] of [[-0.5, 22], [-0.1, 24]]) { c.beginPath(); c.arc(32, 35, r, a - 0.25 - Math.PI / 2 + 1.9, a + 0.25 - Math.PI / 2 + 1.9); c.stroke(); }
  });
}

// shared painters for other modules (billboard ads paint their own faces)
export { tex as paintTexture, rr as roundRect, lin as linearGrad, rad as radialGrad, ell as ellipse, shadow as groundShadow };
