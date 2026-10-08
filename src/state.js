// Save data for the whole game: one shared wallet plus a record per branch.
import { Store } from './platform.js';
import { BRANCHES, BRANCH_ORDER, FAME } from './config.js';

export function freshBranch(key) {
  const b = {
    unlocked: {}, padPaid: {},
    up: { carry: 0, speed: 0, cook: 0, price: 0, staff: 0, patience: 0, safe: 0 },
    tut: 0, vehicleIntro: false, finished: false,
    prod: {}, shelves: {}, piles: {}, carry: [], px: 500, py: 780,
    fame: { lvl: 1, xp: 0 }, goals: [], goalSeq: 0, streak: 0, bestStreak: 0,
    tables: {}, // buka: per-table dirty plates
    leftAt: Date.now(), pending: 0,
    stats: { served: 0, walkouts: 0, earned: 0, vehicles: 0 },
  };
  if (key === 'stand') { b.unlocked.fryer1 = true; b.px = 500; b.py = 780; }
  if (key === 'buka') { b.unlocked.jollof = true; b.unlocked.t1 = true; b.unlocked.t2 = true; b.px = 500; b.py = 640; }
  return b;
}

export function freshState() {
  return {
    v: 2, cash: 0, branch: 'stand', owned: { stand: true }, profile: null,
    branches: { stand: freshBranch('stand') },
    settings: { sfx: true, music: true, haptic: true },
    stats: { served: 0, earned: 0, buses: 0, start: Date.now() },
    t: Date.now(),
  };
}

/** Turn a version 1 save (single stand) into the branch format, keeping all progress. */
function migrate(old) {
  const s = freshState();
  s.cash = old.cash || 0;
  s.settings = { ...s.settings, ...(old.settings || {}) };
  s.stats = { ...s.stats, ...(old.stats || {}) };
  const b = s.branches.stand;
  b.unlocked = { ...b.unlocked, ...(old.unlocked || {}) };
  b.padPaid = old.padPaid || {};
  b.up = { ...b.up, ...(old.up || {}) };
  b.tut = old.tut ?? 0;
  b.vehicleIntro = !!old.busIntro;
  b.finished = !!old.finished;
  b.prod = old.prod || {};
  b.shelves = old.shelves || {};
  b.piles = old.piles || {};
  b.carry = old.carry || [];
  b.px = old.px ?? 500; b.py = old.py ?? 780;
  b.leftAt = old.t || Date.now();
  b.stats.served = old.stats?.served || 0;
  s.t = old.t || Date.now();
  return s;
}

export function loadState() {
  const saved = Store.load();
  if (!saved) return { state: freshState(), isNew: true };
  let s = saved.v === 1 ? migrate(saved) : saved;
  const base = freshState();
  s = { ...base, ...s, settings: { ...base.settings, ...s.settings }, stats: { ...base.stats, ...s.stats } };
  for (const key of BRANCH_ORDER) {
    if (!s.owned[key]) continue;
    const fb = freshBranch(key);
    const b = s.branches[key] || fb;
    s.branches[key] = {
      ...fb, ...b,
      up: { ...fb.up, ...b.up }, fame: { ...fb.fame, ...b.fame }, stats: { ...fb.stats, ...b.stats },
      unlocked: { ...fb.unlocked, ...b.unlocked },
    };
  }
  if (!s.owned[s.branch]) s.branch = 'stand';
  return { state: s, isNew: false };
}

export function saveState(s) { s.t = Date.now(); Store.save(s); }

// ---------- money a branch makes while you're somewhere else ----------
export function automation(key, b) {
  const a = BRANCHES[key].automation;
  let f = 0;
  for (const [id, w] of Object.entries(a)) if (b.unlocked[id]) f += w;
  return Math.min(1, f);
}

export function priceMult(key, b) {
  let m = (1 + 0.15 * (b.up.price || 0)) * FAME.price(b.fame.lvl);
  if (key === 'stand' && b.unlocked.sign) m *= 1.25;
  if (key === 'buka' && b.unlocked.generator) m *= 1.2;
  return m;
}

export function passiveRate(key, b) {
  const auto = automation(key, b);
  if (auto <= 0) return 0;
  const producers = Object.keys(b.prod || {}).length || 1;
  return BRANCHES[key].baseRate * auto * priceMult(key, b) * Math.min(2, 0.7 + 0.15 * producers) * Math.sqrt(FAME.demand(b.fame.lvl));
}

export function cashCap(key, b) {
  return Math.round(BRANCHES[key].capBase * Math.pow(1.7, b.up.safe || 0) * (1 + 0.1 * (b.fame.lvl - 1)));
}

/** Money waiting at a branch you're not standing in. */
export function pendingNow(key, b, now = Date.now()) {
  const secs = Math.max(0, (now - (b.leftAt || now)) / 1000);
  return Math.min(cashCap(key, b), Math.floor((b.pending || 0) + passiveRate(key, b) * secs));
}
