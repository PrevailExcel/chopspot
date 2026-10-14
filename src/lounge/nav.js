// Grid pathfinding (A*) over the restaurant floor, with string-pulling so paths look natural.
// Works in game units. Obstacles are the same rectangles the player collides with.

export class NavGrid {
  constructor({ x0 = -400, y0 = 150, x1 = 2400, y1 = 2090, cell = 20 } = {}) {
    this.x0 = x0; this.y0 = y0; this.cell = cell;
    this.w = Math.ceil((x1 - x0) / cell); this.h = Math.ceil((y1 - y0) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
  }
  idx(cx, cy) { return cy * this.w + cx; }
  toCell(x, y) { return [Math.floor((x - this.x0) / this.cell), Math.floor((y - this.y0) / this.cell)]; }
  inside(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; }
  isBlocked(cx, cy) { return !this.inside(cx, cy) || this.blocked[this.idx(cx, cy)] === 1; }

  /** mark rectangles (inflated by the walker's radius) as blocked */
  block(rects, inflate = 14) {
    for (const r of rects) {
      const [ax, ay] = this.toCell(r.x1 - inflate, r.y1 - inflate);
      const [bx, by] = this.toCell(r.x2 + inflate, r.y2 + inflate);
      for (let cy = Math.max(0, ay); cy <= Math.min(this.h - 1, by); cy++) for (let cx = Math.max(0, ax); cx <= Math.min(this.w - 1, bx); cx++) this.blocked[this.idx(cx, cy)] = 1;
    }
  }
  unblock(rects) {
    for (const r of rects) {
      const [ax, ay] = this.toCell(r.x1, r.y1); const [bx, by] = this.toCell(r.x2, r.y2);
      for (let cy = Math.max(0, ay); cy <= Math.min(this.h - 1, by); cy++) for (let cx = Math.max(0, ax); cx <= Math.min(this.w - 1, bx); cx++) this.blocked[this.idx(cx, cy)] = 0;
    }
  }
  rebuild(rects, keepOpen = []) { this.blocked.fill(0); this.block(rects); this.unblock(keepOpen); this.cache = new Map(); }

  nearestFree(cx, cy) {
    if (!this.isBlocked(cx, cy)) return [cx, cy];
    for (let r = 1; r < 30; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (!this.isBlocked(cx + dx, cy + dy)) return [cx + dx, cy + dy];
      }
    }
    return [cx, cy];
  }

  lineFree(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay); const n = Math.ceil(d / (this.cell * 0.5));
    for (let i = 1; i < n; i++) {
      const t = i / n; const [cx, cy] = this.toCell(ax + (bx - ax) * t, ay + (by - ay) * t);
      if (this.isBlocked(cx, cy)) return false;
    }
    return true;
  }

  /** list of points from a to b (b included). Endpoints inside furniture are allowed. */
  path(a, b) {
    if (this.lineFree(a.x, a.y, b.x, b.y)) return [{ x: b.x, y: b.y }];
    let [sx, sy] = this.toCell(a.x, a.y); let [gx, gy] = this.toCell(b.x, b.y);
    [sx, sy] = this.nearestFree(sx, sy); [gx, gy] = this.nearestFree(gx, gy);
    const W = this.w; const start = this.idx(sx, sy); const goal = this.idx(gx, gy);
    const g = new Float32Array(this.w * this.h).fill(Infinity);
    const came = new Int32Array(this.w * this.h).fill(-1);
    const closed = new Uint8Array(this.w * this.h);
    const heap = new MinHeap();
    g[start] = 0; heap.push(start, 0);
    const hfun = (i) => { const x = i % W, y = (i / W) | 0; const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const N = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let found = false; let steps = 0;
    while (heap.size && steps++ < 40000) {
      const cur = heap.pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy, cost] of N) {
        const nx = cx + dx, ny = cy + dy;
        if (this.isBlocked(nx, ny)) continue;
        if (dx && dy && (this.isBlocked(cx + dx, cy) || this.isBlocked(cx, cy + dy))) continue;
        const ni = this.idx(nx, ny);
        const ng = g[cur] + cost;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; heap.push(ni, ng + hfun(ni)); }
      }
    }
    if (!found) return [{ x: b.x, y: b.y }];
    const cells = [];
    for (let i = goal; i !== -1; i = came[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map((i) => ({ x: this.x0 + ((i % W) + 0.5) * this.cell, y: this.y0 + (((i / W) | 0) + 0.5) * this.cell }));
    // string pulling
    const out = []; let anchor = { x: a.x, y: a.y }; let k = 0;
    while (k < pts.length) {
      let far = k;
      for (let j = pts.length - 1; j > k; j--) if (this.lineFree(anchor.x, anchor.y, pts[j].x, pts[j].y)) { far = j; break; }
      out.push(pts[far]); anchor = pts[far]; k = far + 1;
    }
    out.push({ x: b.x, y: b.y });
    return out;
  }
}

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v; k.push(key); v.push(val);
    let i = k.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (v[p] <= v[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; }
  }
  pop() {
    const k = this.k, v = this.v; const top = k[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      k[0] = lk; v[0] = lv; let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < k.length && v[l] < v[m]) m = l;
        if (r < k.length && v[r] < v[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
      }
    }
    return top;
  }
}
