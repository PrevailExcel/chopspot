// Dev-only harness (not part of the game build): renders pieces of the lounge in isolation.
import '@fontsource/fredoka/latin-700.css';
import * as THREE from 'three';
import { getView } from './view.js';
import { Person, randomLook, staffLook } from './person.js';
import { World } from './world.js';
import { LOUNGE } from '../config.js';

const view = getView();
view.show(true);
const scene = view.scene;
scene.background = new THREE.Color(0x2a2f33);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404040, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 6, 5); scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.7 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const Q = new URLSearchParams(location.search);
const mode = Q.get('t') || 'people';
const people = [];
let world = null;
if (mode === 'world') {
  scene.children.slice().forEach((o) => scene.remove(o));
  world = new World(view, { ownerTitle: () => "AMAKA'S" });
  if (Q.get('h')) world.setTime(+Q.get('h'), true);
  world.speed = 0;
  LOUNGE.tables.forEach((d) => {
    const t = world.buildTable(d);
    t.seats.forEach((st, i) => { if ((i + d.x) % 3 === 0) return; const p = new Person(randomLook(d.x + i * 13 + d.y)); p.pose = 'sit'; p.action = i % 2 ? 'talk' : 'eat'; p.setPosition(st.x / 100, 0, st.y / 100); p.faceTo(st.yaw, true); scene.add(p.group); people.push(p); });
  });
  world.buildTable({ id: 'ev', x: LOUNGE.eventTable.x, y: LOUNGE.eventTable.y, kind: 'event' });
  Object.entries(LOUNGE.producers).forEach(([id, c]) => world.buildStation(id, c));
  world.buildBar(); world.buildStage(); world.buildChandelier(); world.buildArt(); world.buildFountain(); world.buildDesk();
  const w1 = new Person(staffLook('waiter', 3)); w1.action = 'carry'; w1.setPosition(10, 0, 9); scene.add(w1.group); people.push(w1);
  const host = new Person(staffLook('host', 8, 'f')); host.setPosition(11.7, 0, 14.6); host.faceTo(0, true); scene.add(host.group); people.push(host);
  const bt = new Person(staffLook('bartender', 5)); bt.action = 'mix'; bt.setPosition(16.4, 0, 5.4); bt.faceTo(-Math.PI / 2, true); scene.add(bt.group); people.push(bt);
  world.setInside(Q.get('in') !== '0');
}
if (mode === 'people') {
  const kinds = ['chef', 'waiter', 'host', 'bartender', 'security', 'manager'];
  for (let i = 0; i < 18; i++) {
    const look = i < 12 ? randomLook(i * 7 + 3) : staffLook(kinds[i - 12], i);
    const p = new Person(look);
    p.setPosition((i % 6) * 0.9 - 2.25, 0, Math.floor(i / 6) * 1.6 - 1.6);
    p.faceTo(0.25, true);
    if (i === 3) p.speed = 1.4;
    if (i === 7) p.pose = 'sit';
    if (i === 8) p.action = 'talk';
    if (i === 13) p.action = 'carry';
    scene.add(p.group); people.push(p);
  }
}
view.camMode = Q.get('cam') || 'close';
const zw = +(new URLSearchParams(location.search).get('zw') || 0);
if (zw) view.viewWidth = () => zw;
const target = new THREE.Vector3(+(new URLSearchParams(location.search).get('tx') || 0), 0, +(new URLSearchParams(location.search).get('tz') || 0.2));
let last = performance.now();
window.__frames = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  people.forEach((p, i) => { if (mode === 'people' && i === 3) { p.update(dt, 0.01, 1.3); } else p.update(dt); });
  if (world) { const h = world.hour; world.update(dt, target); if (Q.get('h')) world.setTime(h); }
  view.follow(target, dt, true);
  view.render(dt);
  window.__frames++;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__view = view;
