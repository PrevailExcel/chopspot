import Phaser from 'phaser';

/** Points along a rounded rectangle's outline, used to draw dashed borders on the ground. */
function roundRectPoints(x, y, w, h, r, step = 2) {
  const pts = [];
  const seg = (x1, y1, x2, y2) => { const len = Math.hypot(x2 - x1, y2 - y1); const n = Math.max(1, Math.round(len / step)); for (let i = 0; i < n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); };
  const arc = (cx, cy, a0, a1) => { const n = Math.max(2, Math.round((r * Math.abs(a1 - a0)) / step)); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  seg(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2, 0);
  seg(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0, Math.PI / 2);
  seg(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2, Math.PI);
  seg(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI, Math.PI * 1.5);
  return pts;
}

export function dashedRoundRect(g, x, y, w, h, r, dash = 12, gap = 8, offset = 0) {
  const pts = roundRectPoints(x, y, w, h, r);
  pts.push(pts[0]);
  const period = dash + gap;
  let acc = offset; let pen = false;
  g.beginPath();
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1]; const [x2, y2] = pts[i];
    const d = Math.hypot(x2 - x1, y2 - y1);
    const on = ((acc + d / 2) % period) < dash;
    if (on) { if (!pen) { g.moveTo(x1, y1); pen = true; } g.lineTo(x2, y2); } else pen = false;
    acc += d;
  }
  g.strokePath();
}

export function dashedCircle(g, cx, cy, r, dash = 12, gap = 8, squash = 0.62) {
  const n = Math.max(6, Math.floor((Math.PI * 2 * r) / (dash + gap)));
  const a = (Math.PI * 2) / n; const da = a * dash / (dash + gap);
  for (let i = 0; i < n; i++) {
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const t = i * a + (da * k) / 6; const px = cx + Math.cos(t) * r, py = cy + Math.sin(t) * r * squash; k ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.strokePath();
  }
}

/**
 * An interaction area painted on the ground. Shape is either a circle {x,y,r} (drawn as a flattened ellipse)
 * or a rect {x1,y1,x2,y2}.
 */
export class Zone {
  constructor(scene, shape, { color = 0xffffff, visible = true, depth = 2 } = {}) {
    this.scene = scene; this.shape = shape; this.color = color;
    this.g = scene.add.graphics().setDepth(depth);
    this.active = false; this.glow = 0;
    this.visible = visible;
    this.draw();
  }
  get cx() { return this.shape.r != null ? this.shape.x : (this.shape.x1 + this.shape.x2) / 2; }
  get cy() { return this.shape.r != null ? this.shape.y : (this.shape.y1 + this.shape.y2) / 2; }
  contains(x, y, pad = 0) {
    const s = this.shape;
    if (s.r != null) { const dx = x - s.x, dy = (y - s.y) / 0.7; return dx * dx + dy * dy <= (s.r + pad) * (s.r + pad); }
    return x >= s.x1 - pad && x <= s.x2 + pad && y >= s.y1 - pad && y <= s.y2 + pad;
  }
  setActive(a) { if (a !== this.active) { this.active = a; } }
  update(dt) {
    const target = this.active ? 1 : 0;
    const before = this.glow;
    this.glow += (target - this.glow) * Math.min(1, dt * 10);
    if (Math.abs(before - this.glow) > 0.003) this.draw();
  }
  setVisible(v) { this.visible = v; this.g.setVisible(v); }
  draw() {
    const g = this.g; const s = this.shape; g.clear();
    if (!this.visible) return;
    const a = 0.16 + this.glow * 0.2;
    g.fillStyle(this.color, a);
    g.lineStyle(4, 0xffffff, 0.75 + this.glow * 0.25);
    if (s.r != null) {
      const r = s.r * (1 + this.glow * 0.06);
      g.fillEllipse(s.x, s.y, r * 2, r * 2 * 0.62);
      dashedCircle(g, s.x, s.y, r, 12, 8);
    } else {
      const w = s.x2 - s.x1, h = s.y2 - s.y1;
      g.fillRoundedRect(s.x1, s.y1, w, h, 14);
      dashedRoundRect(g, s.x1, s.y1, w, h, 14, 14, 9);
    }
  }
  destroy() { this.g.destroy(); }
}

export { Phaser };
