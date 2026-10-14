// Furniture and set dressing for the GRA Lounge, built from simple shapes into a Kit.
// Every function draws around a local origin on the floor (metres, +z faces the street).
import * as THREE from 'three';

export const PAL = {
  emerald: '#1d4537', emeraldDeep: '#14332a', walnut: '#5b3a22', walnutDark: '#3e2716', brass: '#c9a24a',
  cream: '#efe6d4', linen: '#f5f2ea', black: '#17181c', charcoal: '#2a2c31', steel: '#b9c0c6',
  velvetRust: '#a8472f', velvetBlush: '#c98a7a', velvetGreen: '#24584a', marble: '#eeeae4', terracotta: '#b8643c',
  leaf: '#3f7a3a', leafDark: '#2b5a2a', bulb: '#ffd9a0', stone: '#d9d2c3', wall: '#e9e1d2',
};

// ---------------------------------------------------------------------------
// tables & seating

export function chair(k, x, z, rotY, velvet = PAL.velvetRust) {
  k.frame(x, 0, z, rotY, () => {
    k.rbox(0.46, 0.1, 0.46, [0, 0.47, 0], velvet, 'velvet', null, 0.04);
    k.rbox(0.46, 0.5, 0.09, [0, 0.77, -0.2], velvet, 'velvet', [-0.08, 0, 0], 0.04);
    k.box(0.44, 0.03, 0.03, [0, 1.0, -0.23], PAL.brass, 'metal');
    for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) k.cyl(0.016, 0.44, [lx, 0.22, lz], PAL.brass, 'metal', 8);
  });
}

function placeSetting(k, x, z, rotY) {
  k.frame(x, 0, z, rotY, () => {
    k.cyl(0.13, 0.008, [0, 0.776, 0], PAL.brass, 'metal', 20);
    k.cyl(0.11, 0.01, [0, 0.784, 0], '#ffffff', 'gloss', 20);
    k.box(0.02, 0.006, 0.18, [0.16, 0.78, 0], PAL.steel, 'metal');
    k.box(0.02, 0.006, 0.18, [-0.16, 0.78, 0], PAL.steel, 'metal');
    k.lathe([[0, 0], [0.03, 0.002], [0.004, 0.01], [0.004, 0.08], [0.035, 0.12], [0.038, 0.18], [0.034, 0.19]], [0.13, 0.775, -0.13], '#dfe8ee', 'gloss', 10);
  });
}

function centrepiece(k, x, z) {
  k.cyl(0.03, 0.08, [x, 0.815, z], PAL.cream, 'satin', 10);
  k.sphere(0.012, 0.022, 0.012, [x, 0.875, z], PAL.bulb, 'glow', 8);
  k.lathe([[0, 0], [0.035, 0.005], [0.04, 0.06], [0.02, 0.12], [0.022, 0.15]], [x + 0.09, 0.775, z + 0.04], '#e9eef2', 'gloss', 10);
  k.sphere(0.035, 0.03, 0.035, [x + 0.09, 0.95, z + 0.04], '#d94f6a', 'satin', 8);
  k.sphere(0.03, 0.025, 0.03, [x + 0.115, 0.93, z + 0.02], '#f2d16b', 'satin', 8);
}

/** square 4-seat table with cloth; seats are returned in local coords */
export function table4(k, velvet) {
  k.box(0.94, 0.04, 0.94, [0, 0.755, 0], PAL.linen, 'satin');
  k.box(0.98, 0.3, 0.98, [0, 0.61, 0], PAL.linen, 'satin');
  k.cyl(0.06, 0.46, [0, 0.23, 0], PAL.walnutDark, 'satin', 10);
  k.cyl(0.24, 0.03, [0, 0.015, 0], PAL.walnutDark, 'satin', 16);
  centrepiece(k, 0, 0);
  const seats = [[0, 0.66, Math.PI], [0, -0.66, 0], [0.66, 0, -Math.PI / 2], [-0.66, 0, Math.PI / 2]];
  seats.forEach(([sx, sz, r]) => { chair(k, sx, sz, r, velvet); placeSetting(k, sx * 0.48, sz * 0.48, r); });
  return seats.map(([sx, sz, r]) => ({ x: sx, z: sz, yaw: r }));
}

export function table2(k, velvet) {
  k.lathe([[0, 0.775], [0.44, 0.775], [0.47, 0.76], [0.48, 0.5], [0.0, 0.5]], [0, 0, 0], PAL.linen, 'satin', 28);
  k.cyl(0.05, 0.5, [0, 0.25, 0], PAL.walnutDark, 'satin', 10);
  k.cyl(0.2, 0.03, [0, 0.015, 0], PAL.walnutDark, 'satin', 16);
  centrepiece(k, 0, 0);
  const seats = [[0, 0.62, Math.PI], [0, -0.62, 0]];
  seats.forEach(([sx, sz, r]) => { chair(k, sx, sz, r, velvet); placeSetting(k, sx * 0.45, sz * 0.45, r); });
  return seats.map(([sx, sz, r]) => ({ x: sx, z: sz, yaw: r }));
}

/** booth along the west wall: banquettes north and south of a walnut table */
export function booth(k) {
  const col = PAL.velvetGreen;
  for (const s of [-1, 1]) {
    k.frame(0, 0, s * 0.72, s > 0 ? Math.PI : 0, () => {
      k.rbox(1.5, 0.12, 0.52, [0, 0.46, 0], col, 'velvet', null, 0.05);
      k.box(1.5, 0.4, 0.5, [0, 0.2, 0], PAL.walnutDark, 'satin');
      for (let i = 0; i < 5; i++) k.rbox(0.28, 0.6, 0.14, [-0.6 + i * 0.3, 0.84, -0.23], col, 'velvet', [-0.1, 0, 0], 0.06);
      k.box(1.56, 0.04, 0.2, [0, 1.16, -0.26], PAL.brass, 'metal');
    });
  }
  k.box(1.25, 0.05, 0.72, [0, 0.76, 0], PAL.walnut, 'gloss');
  k.box(1.27, 0.02, 0.74, [0, 0.73, 0], PAL.brass, 'metal');
  k.cyl(0.07, 0.72, [0, 0.36, 0], PAL.brass, 'metal', 10);
  centrepiece(k, 0, 0);
  const seats = [[-0.35, 0.68, Math.PI], [0.35, 0.68, Math.PI], [-0.35, -0.68, 0], [0.35, -0.68, 0]];
  seats.forEach(([sx, sz, r]) => placeSetting(k, sx, sz * 0.5, r));
  return seats.map(([sx, sz, r]) => ({ x: sx, z: sz, yaw: r }));
}

export function terraceTable(k) {
  k.cyl(0.42, 0.04, [0, 0.74, 0], '#f4f1ea', 'satin', 24);
  k.cyl(0.03, 0.72, [0, 0.36, 0], PAL.charcoal, 'metal', 8);
  k.cyl(0.03, 2.4, [0, 1.2, 0], PAL.charcoal, 'metal', 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.frame(0, 2.35, 0, a, () => k.add(new THREE.ConeGeometry(1.45, 0.55, 2, 1, true, 0, Math.PI / 4 + 0.02), { pos: [0, 0, 0], color: i % 2 ? '#f1e9d8' : PAL.emerald, mat: 'satin' }));
  }
  centrepiece(k, 0, 0);
  const seats = [[0, 0.62, Math.PI], [0, -0.62, 0]];
  seats.forEach(([sx, sz, r]) => {
    k.frame(sx, 0, sz, r, () => {
      k.rbox(0.46, 0.06, 0.46, [0, 0.46, 0], '#f4f1ea', 'satin', null, 0.03);
      k.rbox(0.46, 0.42, 0.05, [0, 0.72, -0.21], '#f4f1ea', 'satin', [-0.1, 0, 0], 0.02);
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) k.cyl(0.014, 0.45, [lx, 0.22, lz], PAL.charcoal, 'metal', 6);
    });
  });
  return seats.map(([sx, sz, r]) => ({ x: sx, z: sz, yaw: r }));
}

/** long event table for 8 */
export function eventTable(k) {
  k.box(1.0, 0.04, 3.3, [0, 0.755, 0], PAL.linen, 'satin');
  k.box(1.04, 0.3, 3.34, [0, 0.61, 0], PAL.linen, 'satin');
  k.box(0.32, 0.01, 3.2, [0, 0.78, 0], PAL.brass, 'satin');
  for (const zz of [-1.1, 0, 1.1]) centrepiece(k, 0, zz);
  const seats = [];
  for (let i = 0; i < 4; i++) {
    const zz = -1.2 + i * 0.8;
    seats.push([0.72, zz, -Math.PI / 2], [-0.72, zz, Math.PI / 2]);
  }
  seats.forEach(([sx, sz, r]) => { chair(k, sx, sz, r, PAL.velvetBlush); placeSetting(k, sx * 0.55, sz, r); });
  return seats.map(([sx, sz, r]) => ({ x: sx, z: sz, yaw: r }));
}

// ---------------------------------------------------------------------------
// lights & decor

export function pendant(k, x, z, h = 2.2, shade = PAL.brass) {
  k.cyl(0.006, 3.4 - h, [x, h + (3.4 - h) / 2, z], PAL.black, 'matte', 4);
  k.lathe([[0.02, 0.18], [0.07, 0.16], [0.17, 0.02], [0.18, 0]], [x, h - 0.16, z], shade, 'metal', 18);
  k.sphere(0.055, 0.055, 0.055, [x, h - 0.14, z], PAL.bulb, 'glow', 10);
}

export function chandelier(k, x, z, h = 2.5) {
  k.cyl(0.012, 3.4 - h, [x, h + (3.4 - h) / 2, z], PAL.brass, 'metal', 6);
  k.torus(0.8, 0.025, [x, h, z], PAL.brass, 'metal', [Math.PI / 2, 0, 0], 32);
  k.torus(0.5, 0.02, [x, h - 0.35, z], PAL.brass, 'metal', [Math.PI / 2, 0, 0], 28);
  k.torus(0.25, 0.018, [x, h - 0.6, z], PAL.brass, 'metal', [Math.PI / 2, 0, 0], 20);
  for (const [rad, yy, n] of [[0.8, h, 16], [0.5, h - 0.35, 12], [0.25, h - 0.6, 8]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      k.sphere(0.03, 0.05, 0.03, [x + Math.cos(a) * rad, yy + 0.07, z + Math.sin(a) * rad], PAL.bulb, 'glow', 8);
      for (let j = 0; j < 3; j++) k.sphere(0.018, 0.03, 0.018, [x + Math.cos(a + 0.2) * rad, yy - 0.08 - j * 0.07, z + Math.sin(a + 0.2) * rad], '#e8f4ff', 'gloss', 6);
    }
  }
  k.sphere(0.12, 0.16, 0.12, [x, h - 0.85, z], '#e8f4ff', 'gloss', 12);
}

export function sconce(k, x, y, z, rotY) {
  k.frame(x, y, z, rotY, () => {
    k.box(0.08, 0.2, 0.03, [0, 0, 0], PAL.brass, 'metal');
    k.cyl(0.012, 0.14, [0, 0, 0.07], PAL.brass, 'metal', 6, [Math.PI / 2, 0, 0]);
    k.lathe([[0.03, 0], [0.08, 0.14], [0.085, 0.15]], [0, 0.02, 0.14], '#f4ead6', 'satin', 14);
    k.sphere(0.03, 0.03, 0.03, [0, 0.08, 0.14], PAL.bulb, 'glow', 8);
  });
}

export function plant(k, x, z, size = 1, kind = 'fig') {
  k.frame(x, 0, z, 0, () => {
    k.lathe([[0.0, 0], [0.2, 0], [0.24, 0.1], [0.26, 0.5], [0.24, 0.52], [0, 0.52]], [0, 0, 0], kind === 'fig' ? PAL.black : '#e9e1d2', 'satin', 18);
    k.cyl(0.22, 0.02, [0, 0.5, 0], '#3a2a1a', 'matte', 14);
    if (kind === 'fig') {
      k.cyl(0.025, 1.1, [0, 1.0, 0], '#5a4030', 'matte', 6);
      const rnd = mulberry(Math.floor(x * 100 + z * 7));
      for (let i = 0; i < 22; i++) {
        const a = rnd() * Math.PI * 2, yy = 0.9 + rnd() * 1.0, r = 0.12 + rnd() * 0.25;
        k.sphere(0.11, 0.025, 0.08, [Math.cos(a) * r, yy, Math.sin(a) * r], rnd() < 0.5 ? PAL.leaf : PAL.leafDark, 'satin', 8, [rnd() - 0.5, a, rnd() - 0.5]);
      }
    } else {
      for (let i = 0; i < 5; i++) k.sphere(0.24, 0.22, 0.24, [Math.cos(i * 1.3) * 0.08, 0.72 + i * 0.12, Math.sin(i * 1.3) * 0.08], i % 2 ? PAL.leaf : PAL.leafDark, 'satin', 10);
    }
  }, size);
}

export function hedge(k, x, z, w, d, h = 0.8) {
  k.rbox(w, h, d, [x, h / 2, z], PAL.leafDark, 'satin', null, 0.2);
  k.rbox(w * 0.96, 0.12, d * 0.9, [x, h + 0.02, z], PAL.leaf, 'satin', null, 0.06);
}

export function topiary(k, x, z) {
  k.lathe([[0, 0], [0.24, 0], [0.26, 0.45], [0, 0.45]], [x, 0, z], '#e9e1d2', 'satin', 16);
  k.cyl(0.03, 0.4, [x, 0.6, z], '#5a4030', 'matte', 6);
  k.sphere(0.36, 0.36, 0.36, [x, 1.05, z], PAL.leafDark, 'satin', 14);
}

// ---------------------------------------------------------------------------
// bar, kitchen, service

export function barCounter(k, len) {
  // runs along local z; guests stand on -x side
  k.box(0.62, 1.04, len, [0, 0.52, 0], PAL.walnutDark, 'satin');
  for (let i = 0; i < len / 0.09; i++) k.cyl(0.035, 0.98, [-0.31, 0.5, -len / 2 + 0.05 + i * 0.09], PAL.walnut, 'satin', 8);
  k.box(0.72, 0.06, len + 0.06, [-0.03, 1.07, 0], PAL.marble, 'gloss');
  k.cyl(0.022, len, [-0.48, 0.2, 0], PAL.brass, 'metal', 10, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 5; i++) k.cyl(0.012, 0.2, [-0.42, 0.1, -len / 2 + 0.3 + i * (len - 0.6) / 4], PAL.brass, 'metal', 6);
}

export function backBar(k, len, rnd) {
  // shelves of bottles against the wall, lit from behind
  k.box(0.4, 2.6, len, [0, 1.3, 0], PAL.walnutDark, 'satin');
  k.box(0.02, 2.0, len - 0.3, [-0.205, 1.55, 0], PAL.bulb, 'glow');
  for (const yy of [0.95, 1.5, 2.05]) {
    k.box(0.34, 0.03, len - 0.2, [-0.25, yy, 0], PAL.brass, 'metal');
    for (let i = 0; i < (len - 0.4) / 0.11; i++) {
      const col = ['#5a2a12', '#1f4a2a', '#c99a3a', '#e8e4d8', '#7a1a2a', '#2a3a5a', '#d9b26a'][Math.floor(rnd() * 7)];
      const h = 0.22 + rnd() * 0.12;
      k.lathe([[0, 0], [0.035, 0], [0.036, h * 0.62], [0.014, h * 0.8], [0.012, h], [0, h]], [-0.27, yy + 0.015, -len / 2 + 0.25 + i * 0.11], col, 'gloss', 8);
    }
  }
  k.box(0.42, 0.9, len, [-0.01, 0.45, 0], PAL.walnut, 'satin');
}

export function barStool(k, x, z) {
  k.cyl(0.18, 0.02, [x, 0.01, z], PAL.brass, 'metal', 14);
  k.cyl(0.025, 0.72, [x, 0.37, z], PAL.brass, 'metal', 8);
  k.torus(0.13, 0.012, [x, 0.3, z], PAL.brass, 'metal', [Math.PI / 2, 0, 0], 14);
  k.rbox(0.38, 0.1, 0.38, [x, 0.77, z], PAL.velvetGreen, 'velvet', null, 0.05);
}

export function pass(k, len) {
  k.box(len, 0.95, 0.5, [0, 0.475, 0], '#202326', 'metal');
  for (let i = 0; i < len / 0.09; i++) k.cyl(0.03, 0.86, [-len / 2 + 0.05 + i * 0.09, 0.47, 0.25], PAL.walnut, 'satin', 6);
  k.box(len + 0.04, 0.05, 0.62, [0, 0.975, 0], PAL.marble, 'gloss');
  k.box(len + 0.06, 0.02, 0.02, [0, 0.95, 0.31], PAL.brass, 'metal');
  k.box(len, 0.06, 0.4, [0, 1.75, -0.05], PAL.steel, 'metal');
  for (let i = 0; i < Math.floor(len / 0.55); i++) {
    const x = -len / 2 + 0.3 + i * 0.55;
    k.cyl(0.006, 0.5, [x, 2.0, 0], PAL.black, 'matte', 4);
    k.lathe([[0.02, 0.1], [0.07, 0.02], [0.075, 0]], [x, 1.62, 0], PAL.black, 'metal', 12);
    k.sphere(0.04, 0.03, 0.04, [x, 1.63, 0], '#ff8a3a', 'glow', 8);
  }
}

export function station(k, kind) {
  // sits behind the pass (local -z = kitchen side)
  k.box(1.9, 0.9, 0.8, [0, 0.45, 0], PAL.steel, 'metal');
  k.box(1.92, 0.04, 0.82, [0, 0.92, 0], '#d8dde1', 'metal');
  if (kind === 'grill') {
    k.box(1.2, 0.1, 0.6, [0, 0.98, 0], '#1a1a1a', 'metal');
    for (let i = 0; i < 9; i++) k.box(0.02, 0.02, 0.56, [-0.52 + i * 0.13, 1.04, 0], '#3a3a3a', 'metal');
    k.box(1.1, 0.02, 0.5, [0, 1.01, 0], '#ff6a1a', 'glow');
    k.rbox(0.25, 0.06, 0.16, [-0.2, 1.08, 0.05], '#6b2e14', 'satin', null, 0.02);
    k.rbox(0.25, 0.06, 0.16, [0.25, 1.08, -0.08], '#6b2e14', 'satin', null, 0.02);
  } else if (kind === 'pasta') {
    for (const [px, r] of [[-0.45, 0.2], [0.05, 0.22], [0.5, 0.17]]) {
      k.cyl(0.13, 0.03, [px, 0.95, 0], '#222', 'metal', 12);
      k.lathe([[0, 0], [r, 0], [r, 0.3], [r + 0.01, 0.31]], [px, 0.97, 0], PAL.steel, 'metal', 16);
      k.cyl(r - 0.01, 0.01, [px, 1.25, 0], px < 0 ? '#e9d7a0' : '#c84a2a', 'satin', 16);
    }
  } else if (kind === 'salad') {
    k.box(1.6, 0.06, 0.55, [0, 0.96, 0], '#cfd8dc', 'metal');
    const cols = ['#5cb85c', '#e84a3a', '#f2d16b', '#7bd36b', '#f4f1ea', '#3f7a3a'];
    for (let i = 0; i < 6; i++) {
      k.lathe([[0, 0], [0.11, 0.0], [0.13, 0.1]], [-0.65 + i * 0.26, 0.98, 0], '#ffffff', 'gloss', 12);
      k.sphere(0.1, 0.04, 0.1, [-0.65 + i * 0.26, 1.07, 0], cols[i], 'satin', 10);
    }
  } else if (kind === 'pizza') {
    k.frame(0, 0.92, -0.05, 0, () => {
      k.box(1.5, 0.12, 1.1, [0, 0.06, 0], '#7a3a22', 'matte');
      k.add(new THREE.SphereGeometry(0.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [0, 0.12, 0], scale: [1, 0.75, 0.8], color: '#a8472f', mat: 'matte' });
      k.rbox(0.5, 0.32, 0.1, [0, 0.3, 0.52], '#ff7a2a', 'glow', null, 0.08);
      k.cyl(0.08, 0.7, [0.35, 0.8, -0.2], PAL.charcoal, 'metal', 10);
    });
  } else if (kind === 'dessert') {
    k.box(1.5, 0.5, 0.6, [0, 1.17, 0], '#dfe8ee', 'glass');
    k.box(1.52, 0.03, 0.62, [0, 1.43, 0], PAL.brass, 'metal');
    for (let i = 0; i < 4; i++) {
      const x = -0.54 + i * 0.36;
      k.cyl(0.13, 0.015, [x, 0.97, 0], '#ffffff', 'gloss', 16);
      k.cyl(0.11, 0.13, [x, 1.05, 0], ['#5a2e1a', '#f2d7c8', '#e85a7a', '#3a1c0f'][i], 'satin', 16);
      k.sphere(0.02, 0.02, 0.02, [x, 1.13, 0], '#e8263c', 'gloss', 6);
    }
  } else if (kind === 'bar') {
    // the bar draws itself elsewhere
  }
}

export function hood(k, len) {
  k.box(len, 0.5, 0.9, [0, 2.75, 0], PAL.steel, 'metal');
  k.box(len - 0.1, 0.02, 0.8, [0, 2.49, 0], '#9aa3ab', 'metal');
}

export function hostStand(k) {
  k.lathe([[0.0, 0], [0.32, 0], [0.3, 0.1], [0.24, 1.0], [0.3, 1.05], [0, 1.05]], [0, 0, 0], PAL.walnut, 'gloss', 6, [1, 1, 0.7]);
  k.box(0.6, 0.04, 0.45, [0, 1.07, 0], PAL.brass, 'metal', [-0.18, 0, 0]);
  k.box(0.26, 0.02, 0.18, [0, 1.1, 0.02], '#101418', 'gloss', [-0.18, 0, 0]);
  k.box(0.22, 0.004, 0.14, [0, 1.112, 0.022], '#6ab0ff', 'glow', [-0.18, 0, 0]);
  k.cyl(0.012, 0.35, [0.22, 1.25, -0.1], PAL.brass, 'metal', 6);
  k.lathe([[0.02, 0.12], [0.08, 0.02], [0.085, 0]], [0.22, 1.36, -0.1], '#1d4537', 'satin', 12);
  k.sphere(0.03, 0.03, 0.03, [0.22, 1.37, -0.1], PAL.bulb, 'glow', 6);
}

export function conciergeDesk(k) {
  k.rbox(1.4, 1.0, 0.6, [0, 0.5, 0], PAL.walnut, 'gloss', null, 0.05);
  k.box(1.44, 0.04, 0.64, [0, 1.02, 0], PAL.marble, 'gloss');
  k.box(0.5, 0.32, 0.03, [0, 1.25, -0.12], '#101418', 'gloss', [-0.15, 0, 0]);
  k.box(0.46, 0.28, 0.005, [0, 1.25, -0.103], '#4aa3ff', 'glow', [-0.15, 0, 0]);
  k.box(0.04, 0.2, 0.04, [0, 1.12, -0.14], PAL.charcoal, 'metal');
}

export function cashier(k) {
  k.rbox(1.0, 1.0, 0.55, [0, 0.5, 0], PAL.walnutDark, 'satin', null, 0.04);
  k.box(1.04, 0.04, 0.6, [0, 1.02, 0], PAL.marble, 'gloss');
  k.box(0.26, 0.16, 0.2, [0.2, 1.12, -0.05], PAL.black, 'gloss');
  k.box(0.22, 0.12, 0.01, [0.2, 1.24, -0.12], '#7ed3ff', 'glow', [-0.3, 0, 0]);
}

export function dishReturn(k) {
  k.box(0.9, 0.95, 0.6, [0, 0.475, 0], PAL.steel, 'metal');
  for (let i = 0; i < 3; i++) k.box(0.8, 0.02, 0.5, [0, 1.15 + i * 0.25, -0.05], PAL.steel, 'metal');
  for (let i = 0; i < 4; i++) k.cyl(0.11, 0.01, [-0.2 + i * 0.13, 1.17, -0.05], '#ffffff', 'gloss', 14, [0, 0, 1.2]);
  k.box(0.9, 0.02, 0.05, [0, 0.98, 0.28], '#5ec2ff', 'glow');
}

// ---------------------------------------------------------------------------
// stage & band

export function stage(k, w, d) {
  k.box(w, 0.32, d, [0, 0.16, 0], PAL.walnutDark, 'satin');
  k.box(w + 0.04, 0.03, d + 0.04, [0, 0.335, 0], PAL.walnut, 'gloss');
  k.box(w + 0.06, 0.04, 0.04, [0, 0.3, d / 2 + 0.02], PAL.brass, 'metal');
  k.box(w - 0.2, 0.02, 0.04, [0, 0.33, d / 2 - 0.06], '#ffb35a', 'glow');
}

export function drumKit(k) {
  k.cyl(0.28, 0.3, [0, 0.62, 0], '#7a1a2a', 'gloss', 18, [Math.PI / 2, 0, 0]);
  k.cyl(0.27, 0.31, [0, 0.62, 0], '#f4f1ea', 'satin', 18, [Math.PI / 2, 0, 0]);
  for (const [x, y, z, r] of [[-0.32, 0.85, 0.1, 0.13], [0.3, 0.85, 0.1, 0.14], [0.5, 0.62, 0.3, 0.17]]) {
    k.cyl(r, 0.18, [x, y, z], '#7a1a2a', 'gloss', 14);
    k.cyl(r - 0.005, 0.01, [x, y + 0.095, z], '#f4f1ea', 'satin', 14);
  }
  for (const [x, z, h] of [[-0.55, 0.0, 1.2], [0.6, -0.2, 1.35]]) {
    k.cyl(0.01, h, [x, 0.33 + h / 2, z], PAL.steel, 'metal', 6);
    k.cyl(0.2, 0.01, [x, 0.33 + h, z], '#d9b26a', 'metal', 18);
  }
  k.cyl(0.16, 0.06, [0, 0.62, -0.5], PAL.black, 'velvet', 12);
}

export function keyboard(k) {
  for (const s of [-1, 1]) k.box(0.03, 0.8, 0.03, [0, 0.72, 0], PAL.steel, 'metal', [0, 0, s * 0.5]);
  k.box(1.1, 0.08, 0.32, [0, 1.12, 0], PAL.black, 'gloss');
  k.box(1.0, 0.012, 0.13, [0, 1.165, 0.07], '#f4f4f4', 'satin');
}

export function micStand(k, x, z) {
  k.cyl(0.12, 0.02, [x, 0.34, z], PAL.black, 'metal', 12);
  k.cyl(0.01, 1.3, [x, 1.0, z], PAL.steel, 'metal', 6);
  k.sphere(0.035, 0.05, 0.035, [x, 1.68, z + 0.02], '#3a3a3a', 'metal', 8);
}

export function amp(k, x, z) {
  k.rbox(0.5, 0.55, 0.3, [x, 0.6, z], PAL.black, 'satin', null, 0.03);
  k.box(0.42, 0.36, 0.01, [x, 0.56, z + 0.155], '#2a2a2a', 'matte');
  k.box(0.4, 0.03, 0.01, [x, 0.84, z + 0.155], '#c9a24a', 'metal');
}

// ---------------------------------------------------------------------------
// outside

export function palm(k, x, z, h = 6, seed = 1) {
  const rnd = mulberry(seed);
  const lean = (rnd() - 0.5) * 0.25;
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const y = (i + 0.5) * (h / segs);
    k.cyl(0.17 - i * 0.006, h / segs + 0.02, [x + lean * y * 0.25, y, z], i % 2 ? '#8a7258' : '#7a644c', 'matte', 10);
  }
  const top = [x + lean * h * 0.25, h, z];
  k.sphere(0.25, 0.25, 0.25, top, '#5a4a30', 'matte', 8);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd();
    const g = new THREE.PlaneGeometry(0.42, 2.6, 1, 6);
    const p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const yy = p.getY(j) + 1.3; const t = yy / 2.6;
      p.setZ(j, -t * t * 1.3);
      p.setX(j, p.getX(j) * (1 - t * 0.7));
      p.setY(j, yy);
    }
    g.computeVertexNormals();
    k.add(g, { pos: top, rot: [-0.9 - rnd() * 0.3, a, 0], color: i % 2 ? '#3f7a3a' : '#4f8a42', mat: 'satin' });
    g.dispose();
  }
}

export function streetLamp(k, x, z, facing = 0) {
  k.frame(x, 0, z, facing, () => {
    k.cyl(0.08, 0.3, [0, 0.15, 0], '#2a2c31', 'metal', 10);
    k.cyl(0.05, 5.4, [0, 2.9, 0], '#2a2c31', 'metal', 10);
    k.box(0.06, 0.06, 1.0, [0, 5.55, 0.45], '#2a2c31', 'metal');
    k.rbox(0.28, 0.1, 0.5, [0, 5.5, 0.95], '#2a2c31', 'metal', null, 0.04);
    k.box(0.22, 0.02, 0.42, [0, 5.44, 0.95], '#ffe2a8', 'night');
  });
}

export function car(k, x, z, rotY, color, seed = 1) {
  const rnd = mulberry(seed);
  const suv = rnd() < 0.5;
  k.frame(x, 0, z, rotY, () => {
    const L = suv ? 4.7 : 4.5, Wd = 1.85, H = suv ? 0.85 : 0.65;
    k.rbox(Wd, H, L, [0, 0.38 + H / 2, 0], color, 'gloss', null, 0.18);
    k.rbox(Wd - 0.16, suv ? 0.62 : 0.5, L * (suv ? 0.62 : 0.5), [0, 0.38 + H + (suv ? 0.29 : 0.23), suv ? -0.2 : -0.1], '#1b232b', 'gloss', null, 0.16);
    k.rbox(Wd - 0.12, 0.05, L * (suv ? 0.6 : 0.48), [0, 0.38 + H + (suv ? 0.6 : 0.48), suv ? -0.2 : -0.1], color, 'gloss', null, 0.02);
    for (const [wx, wz] of [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.45], [0.86, -1.45]]) {
      k.cyl(0.36, 0.26, [wx, 0.36, wz], '#121212', 'matte', 16, [0, 0, Math.PI / 2]);
      k.cyl(0.22, 0.27, [wx, 0.36, wz], '#b9c0c6', 'metal', 12, [0, 0, Math.PI / 2]);
    }
    for (const s of [-1, 1]) {
      k.box(0.36, 0.1, 0.04, [s * 0.62, 0.38 + H * 0.7, L / 2], '#fff6dc', 'night');
      k.box(0.34, 0.1, 0.04, [s * 0.65, 0.38 + H * 0.7, -L / 2], '#ff2a2a', 'night');
    }
    k.box(0.6, 0.14, 0.02, [0, 0.55, L / 2 + 0.01], '#1a1a1a', 'metal');
  });
}

export function villa(k, x, z, w, d, rotY, seed = 1) {
  const rnd = mulberry(seed);
  const wall = ['#efe6d4', '#e8dcc6', '#f2ede4', '#e3d5bd'][Math.floor(rnd() * 4)];
  const roof = ['#5a3a2a', '#3a3f45', '#7a3a2a', '#2f4a3a'][Math.floor(rnd() * 4)];
  const floors = rnd() < 0.6 ? 2 : 1;
  const H = floors * 3.2;
  k.frame(x, 0, z, rotY, () => {
    k.box(w, H, d, [0, H / 2, 0], wall, 'matte');
    k.box(w + 0.6, 0.2, d + 0.6, [0, H + 0.1, 0], '#d9d2c3', 'matte');
    k.add(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.0, 4, 1), { pos: [0, H + 1.2, 0], rot: [0, Math.PI / 4, 0], scale: [w / Math.max(w, d), 1, d / Math.max(w, d)], color: roof, mat: 'satin' });
    for (let f = 0; f < floors; f++) {
      const n = Math.max(2, Math.floor(w / 2.4));
      for (let i = 0; i < n; i++) {
        const wx = -w / 2 + (i + 0.5) * (w / n);
        const lit = rnd() < 0.6;
        k.box(1.1, 1.3, 0.05, [wx, 1.7 + f * 3.2, d / 2 + 0.02], '#2a2c31', 'satin');
        k.box(0.95, 1.15, 0.02, [wx, 1.7 + f * 3.2, d / 2 + 0.05], lit ? '#ffd29a' : '#7a8a99', lit ? 'night' : 'gloss');
      }
    }
    k.box(1.3, 2.3, 0.06, [0, 1.15, d / 2 + 0.03], '#4a3020', 'satin');
  });
}

export function gatehouse(k, x, z) {
  k.box(2.2, 2.6, 2.0, [x, 1.3, z], '#e9e1d2', 'matte');
  k.box(2.5, 0.18, 2.3, [x, 2.7, z], PAL.charcoal, 'satin');
  k.box(1.4, 0.8, 0.04, [x, 1.5, z + 1.01], '#9fbfcc', 'gloss');
  k.box(0.04, 0.8, 1.2, [x - 1.11, 1.5, z], '#9fbfcc', 'gloss');
  k.box(0.2, 0.06, 0.4, [x, 2.4, z + 1.2], '#ffe2a8', 'night');
}

export function fenceWall(k, x1, x2, z, h = 2.1) {
  const len = x2 - x1;
  k.box(len, h, 0.25, [(x1 + x2) / 2, h / 2, z], '#e3dccd', 'matte');
  k.box(len, 0.1, 0.34, [(x1 + x2) / 2, h + 0.05, z], PAL.charcoal, 'satin');
  for (let x = x1 + 0.1; x < x2; x += 3) k.box(0.4, h + 0.25, 0.4, [x, (h + 0.25) / 2, z], '#d6cebd', 'matte');
}

export function fountain(k, x, z) {
  k.cyl(1.5, 0.45, [x, 0.225, z], '#d9d2c3', 'satin', 36);
  k.cyl(1.38, 0.05, [x, 0.42, z], '#3f8fb8', 'gloss', 36);
  k.cyl(0.25, 1.1, [x, 0.8, z], '#d9d2c3', 'satin', 16);
  k.cyl(0.65, 0.12, [x, 1.36, z], '#d9d2c3', 'satin', 24);
  k.cyl(0.55, 0.03, [x, 1.43, z], '#5ab0d8', 'gloss', 24);
  k.cyl(0.08, 0.5, [x, 1.65, z], '#d9d2c3', 'satin', 10);
  k.cyl(1.4, 0.02, [x, 0.45, z], '#7fd6ff', 'night', 36);
}

export function canopy(k, x, z, w) {
  // slim bronze-glass canopy with brass edge and downlights
  k.box(w, 0.05, 1.3, [x, 3.0, z + 0.65], '#3a3020', 'glass');
  k.box(w + 0.04, 0.08, 0.06, [x, 2.98, z + 1.3], PAL.brass, 'metal');
  for (const s of [-1, 1]) k.box(0.05, 0.08, 1.3, [x + s * w / 2, 2.98, z + 0.65], PAL.brass, 'metal');
  for (const s of [-1, 1]) k.cyl(0.015, 0.9, [x + s * (w / 2 - 0.2), 3.4, z + 0.85], PAL.brass, 'metal', 6, [0.9, 0, 0]);
  for (let i = 0; i < 3; i++) k.cyl(0.05, 0.03, [x - w / 2 + 0.6 + i * (w - 1.2) / 2, 2.96, z + 0.7], '#fff0c8', 'night', 10);
}

export function lantern(k, x, z) {
  k.cyl(0.04, 1.2, [x, 0.6, z], PAL.charcoal, 'metal', 6);
  k.rbox(0.2, 0.3, 0.2, [x, 1.35, z], PAL.charcoal, 'metal', null, 0.03);
  k.box(0.14, 0.22, 0.14, [x, 1.35, z], '#ffd9a0', 'night');
}

export function mulberry(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
