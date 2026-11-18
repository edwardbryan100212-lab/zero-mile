// The game layer (see DESIGN.md): XP and levels with garden titles, seeds (the currency), 3 daily quests chosen
// by the date, streak milestone chests, achievements and the shop. Everything lives in state.rewards and is saved
// with save(). award(kind, opts) → { xp, seeds, levelUp, quests, unlocked, chest, milestones } and is idempotent per
// day where it matters (a retaken photo, re-watering the same plant, opening the same plant page twice).
import { state, save, today, overallStreak, bestStreak, plantById, trip, isTree } from './core.js?v=9';

const R = () => {
  const r = (state.rewards ||= {});
  r.xp ??= 0; r.seeds ??= 0; r.days ||= {}; r.badges ||= []; r.owned ||= []; r.wear ||= {};
  r.ms ||= {}; r.chests ||= []; r.photoDates ||= []; r.planted ||= []; r.trees ||= []; r.quests ||= {};
  return r;
};
const subs = new Set();

// ---------- levels ----------
export const levelNeed = (n) => 50 * n * (n + 1) / 2; // total XP to finish level n
export const TITLES = ['Seedling', 'Sprout', 'Gardener', 'Green Thumb', 'Grower', 'Harvester', 'Orchard Keeper', 'Forest Maker', 'Grove Guardian', 'Earth Keeper'];
export const titleOf = (n) => TITLES[Math.min(n, TITLES.length) - 1] + (n > TITLES.length ? ` ${n - TITLES.length + 1}` : '');
export function level(xp = R().xp) {
  let n = 0; while (xp >= levelNeed(n + 1)) n++;
  const from = levelNeed(n), to = levelNeed(n + 1);
  return { n: n + 1, xp, from, to, into: xp - from, need: to - from, p: (xp - from) / (to - from), title: titleOf(n + 1) };
}
export const levelSeeds = (n) => 10 * n; // seeds for reaching level n

// ---------- the day ----------
const dayOf = (d = today()) => {
  const r = R(), x = (r.days[d] ||= {});
  x.water ||= []; x.learn ||= []; x.harvest ??= 0; x.tree ??= 0; x.plant ??= 0; x.photo ??= 0; x.done ||= [];
  return x;
};
function prune() { const keys = Object.keys(R().days).sort(); keys.slice(0, -21).forEach((k) => delete R().days[k]); }

// ---------- daily quests: 3 a day, seeded by the date, fixed once chosen ----------
export const QUESTS = {
  photo: { label: 'Snap a plant', art: 'quest-photo', need: 1, xp: 10, seeds: 5, have: (d) => d.photo },
  water: { label: 'Water 2 plants', art: 'quest-water', need: 2, xp: 6, seeds: 5, have: (d) => d.water.length },
  water1: { label: 'Water a plant', art: 'quest-water', need: 1, xp: 5, seeds: 5, have: (d) => d.water.length },
  learn: { label: 'Learn 2 plants', art: 'quest-learn', need: 2, xp: 8, seeds: 5, have: (d) => d.learn.length },
  harvest: { label: 'Pick a harvest', art: 'quest-harvest', need: 1, xp: 15, seeds: 10, have: (d) => d.harvest },
  tree: { label: 'Plant a tree', art: 'tree', need: 1, xp: 20, seeds: 15, have: (d) => d.tree },
  streak: { label: 'Keep the streak', art: 'streak-sun', need: 1, xp: 10, seeds: 5, have: (d) => (d.photo ? 1 : 0) },
  plant: { label: 'Add a plant', art: 'quest-learn', need: 1, xp: 5, seeds: 5, have: (d) => d.plant },
};
function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pickQuests(date) {
  const g = state.garden, plants = g.filter((e) => !isTree(plantById(e.id)));
  if (!g.length) return ['plant', 'learn', 'tree'];
  const pool = ['learn', plants.length >= 2 ? 'water' : 'water1', 'tree'];
  if (plants.length) pool.push('harvest');
  const r = rng(date + ':zm');
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  // the photo (or keeping the streak) is always one of the three: it is the habit the app is about
  return [r() < .5 ? 'photo' : 'streak', ...pool.filter((q) => q !== 'tree' || r() < .5).slice(0, 2)];
}
export function dailyQuests(date = today()) {
  const d = dayOf(date);
  d.q ||= pickQuests(date);
  return d.q.map((id) => { const q = QUESTS[id]; const have = Math.min(q.need, q.have(d)); return { id, ...q, have, done: have >= q.need, claimed: d.done.includes(id) }; });
}

// ---------- chests ----------
export const MILESTONE_SEEDS = { 3: 20, 7: 50, 14: 75, 30: 150, 50: 200, 100: 400, 365: 1000 };
export const MILESTONES = Object.keys(MILESTONE_SEEDS).map(Number);
const dailyChestSeeds = (date) => 15 + Math.floor(rng(date + ':chest')() * 16); // 15–30
// chest keys: 'day:YYYY-MM-DD' or 'ms:7'
export function chestsReady() {
  const r = R(), out = [];
  for (const m of MILESTONES) if (r.ms[m] === 'ready') out.push({ key: `ms:${m}`, kind: 'milestone', n: m, seeds: MILESTONE_SEEDS[m] });
  for (const [date, d] of Object.entries(r.days)) if (d.chest === 'ready') out.push({ key: `day:${date}`, kind: 'daily', date, seeds: dailyChestSeeds(date) });
  return out;
}
export function openChest(key) {
  const r = R(), [kind, v] = key.split(':'); let seeds = 0;
  if (kind === 'ms' && r.ms[v] === 'ready') { r.ms[v] = 'open'; seeds = MILESTONE_SEEDS[v]; }
  else if (kind === 'day') { const d = r.days[key.slice(4)]; if (d?.chest === 'ready') { d.chest = 'open'; seeds = dailyChestSeeds(key.slice(4)); } }
  if (!seeds) return null;
  r.seeds += seeds; r.chests.unshift({ key, date: today(), seeds, kind: kind === 'ms' ? 'milestone' : 'daily', n: kind === 'ms' ? +v : undefined }); r.chests = r.chests.slice(0, 60);
  save(); emit({ seeds, chestOpened: key }, 'chest');
  return { key, seeds };
}
// streak milestones reached become ready chests (each once, ever)
function syncMilestones(out) {
  const r = R(), n = Math.max(overallStreak(), 0);
  for (const m of MILESTONES) if (n >= m && !r.ms[m]) { r.ms[m] = 'ready'; out?.milestones.push({ key: `ms:${m}`, n: m, seeds: MILESTONE_SEEDS[m] }); }
}

// ---------- achievements ----------
const countGroup = (g) => state.garden.filter((e) => plantById(e.id)?.group === g).length;
function milesSkipped() {
  let mi = 0;
  for (const e of state.garden) { const t = plantById(e.id) && trip(plantById(e.id), state.region); if (t) mi += t.crowMi * (e.harvests || []).length; }
  return mi;
}
export const BADGES = [
  { id: 'first-photo', name: 'First photo', test: () => state.garden.some((e) => e.log.length) },
  { id: 'streak-7', name: '7-day streak', test: () => bestStreak() >= 7 },
  { id: 'streak-30', name: '30-day streak', test: () => bestStreak() >= 30 },
  { id: 'streak-100', name: '100-day streak', test: () => bestStreak() >= 100 },
  { id: 'first-harvest', name: 'First harvest', test: () => state.garden.some((e) => e.harvests?.length) },
  { id: 'five-plants', name: 'Five plants', test: () => state.garden.length >= 5 },
  { id: 'first-tree', name: 'First tree', test: () => countGroup('tree') >= 1 },
  { id: 'ten-trees', name: 'Ten trees', test: () => countGroup('tree') >= 10 },
  { id: 'miles-100', name: '100 miles', test: () => milesSkipped() >= 100 },
  { id: 'miles-1000', name: '1,000 miles', test: () => milesSkipped() >= 1000 },
  { id: 'herb-garden', name: 'Herb garden', test: () => countGroup('herb') >= 3 },
  { id: 'fruit-bowl', name: 'Fruit bowl', test: () => countGroup('fruit') >= 3 },
  { id: 'night-owl', name: 'Night owl', test: () => false }, // given by a photo after 9 pm
  { id: 'early-bird', name: 'Early bird', test: () => false }, // given by a photo before 8 am
  { id: 'level-5', name: 'Level 5', test: () => level().n >= 5 },
  { id: 'level-10', name: 'Level 10', test: () => level().n >= 10 },
];
export const BADGE_SEEDS = 10;
const has = (id) => R().badges.some((b) => b.id === id);
function unlock(id, out) {
  if (has(id)) return;
  const b = BADGES.find((x) => x.id === id); if (!b) return;
  R().badges.push({ id, date: today() }); R().seeds += BADGE_SEEDS;
  out.unlocked.push({ id, name: b.name }); out.seeds += BADGE_SEEDS;
}
function checkBadges(out) { for (const b of BADGES) if (!has(b.id) && b.test()) unlock(b.id, out); }

// ---------- XP with level-ups ----------
function addXP(n, out) {
  if (!n) return;
  const r = R(), before = level(r.xp).n;
  r.xp += n; out.xp += n;
  const after = level(r.xp).n;
  if (after > before) {
    let s = 0; for (let k = before + 1; k <= after; k++) s += levelSeeds(k);
    r.seeds += s; out.seeds += s;
    out.levelUp = { from: before, to: after, title: titleOf(after), seeds: s };
  }
}

// ---------- the one entry point for real actions ----------
// kinds: photo { date, id }, water { id }, harvest { id }, plant { id }, tree { id }, learn { id }
const XP = { photo: 10, water: 2, harvest: 15, plant: 5, tree: 20, learn: 3 };
export function award(kind, opts = {}) {
  const r = R(), out = { xp: 0, seeds: 0, levelUp: null, quests: [], unlocked: [], chest: null, milestones: [] };
  const date = opts.date || today(), isToday = date === today(), d = dayOf();
  const id = opts.id || '';
  if (kind === 'photo') {
    if (!r.photoDates.includes(date)) {
      r.photoDates.push(date); r.photoDates = r.photoDates.slice(-400);
      const n = overallStreak();
      addXP(XP.photo + (isToday ? Math.min(10, Math.floor(n / 5)) : 0), out);
      if (isToday) {
        const h = new Date().getHours();
        if (h >= 21) unlock('night-owl', out);
        if (h < 8) unlock('early-bird', out);
      }
    }
    if (isToday) d.photo = 1;
  } else if (kind === 'water') {
    if (id && !d.water.includes(id)) { d.water.push(id); addXP(XP.water, out); }
  } else if (kind === 'harvest') {
    if (d.harvest < 3) addXP(XP.harvest, out); // XP for up to 3 harvests a day
    d.harvest++;
  } else if (kind === 'plant') {
    if (id && !r.planted.includes(id)) { r.planted.push(id); d.plant++; addXP(XP.plant, out); }
  } else if (kind === 'tree') {
    if (id && !r.trees.includes(id)) { r.trees.push(id); d.tree++; addXP(XP.tree, out); }
  } else if (kind === 'learn') {
    if (id && !d.learn.includes(id) && d.learn.length < 5) { d.learn.push(id); addXP(XP.learn, out); }
  }
  // quests finished by this action pay out once
  const qs = dailyQuests();
  for (const q of qs) if (q.done && !q.claimed) {
    d.done.push(q.id); r.seeds += q.seeds; out.seeds += q.seeds;
    addXP(q.xp, out); out.quests.push({ id: q.id, label: q.label, art: q.art, xp: q.xp, seeds: q.seeds });
  }
  if (!d.chest && qs.every((q) => q.done)) { d.chest = 'ready'; out.chest = { key: `day:${today()}`, kind: 'daily', seeds: dailyChestSeeds(today()) }; }
  syncMilestones(out);
  checkBadges(out);
  prune(); save();
  emit(out, kind, opts);
  return out;
}
// call on app open: badges and milestone chests earned by existing data (no XP)
export function check() {
  const out = { xp: 0, seeds: 0, levelUp: null, quests: [], unlocked: [], chest: null, milestones: [] };
  syncMilestones(out); checkBadges(out);
  // first run of the game layer: credit plants and trees already growing, so they don't pay out again
  const r = R();
  if (!r.seeded) { r.seeded = 1; for (const e of state.garden) (isTree(plantById(e.id)) ? r.trees : r.planted).push(e.id); }
  save();
  if (out.unlocked.length || out.milestones.length) emit(out, 'check');
  return out;
}

// ---------- shop ----------
export const SAVER_PRICE = 50, SAVER_MAX = 2;
export const SHOP = [
  { id: 'can', kind: 'saver', name: 'Streak saver', art: 'can-freeze', price: SAVER_PRICE },
  { id: 'pot-sky', kind: 'pot', name: 'Sky pot', color: '#36b4f0', shade: '#1a8fcc', price: 100 },
  { id: 'pot-sun', kind: 'pot', name: 'Sun pot', color: '#ffc531', shade: '#e0a200', price: 150 },
  { id: 'pot-berry', kind: 'pot', name: 'Berry pot', color: '#a560e8', shade: '#7f3fc4', price: 200 },
  { id: 'pot-night', kind: 'pot', name: 'Night pot', color: '#2b3a4a', shade: '#18222c', price: 300 },
  { id: 'hat-cap', kind: 'hat', name: 'Cap', price: 100 },
  { id: 'hat-straw', kind: 'hat', name: 'Straw hat', price: 150 },
  { id: 'hat-flower', kind: 'hat', name: 'Flower crown', price: 250 },
  { id: 'hat-crown', kind: 'hat', name: 'Crown', price: 400 },
];
const saver = () => (state.saver ||= { have: 0, earned: null, used: [] });
export const saversHeld = () => saver().have || 0;
export function canBuy(id) {
  const it = SHOP.find((x) => x.id === id), r = R();
  if (!it) return { ok: false, why: 'unknown' };
  if (it.kind === 'saver' && saversHeld() >= SAVER_MAX) return { ok: false, why: 'full' };
  if (it.kind !== 'saver' && r.owned.includes(id)) return { ok: false, why: 'owned' };
  if (r.seeds < it.price) return { ok: false, why: 'seeds', short: it.price - r.seeds };
  return { ok: true };
}
// spend(item) buys it: a watering can adds to state.saver (hold up to 2); a pot or hat is kept and worn
export function spend(id) {
  const c = canBuy(id); if (!c.ok) return c;
  const it = SHOP.find((x) => x.id === id), r = R();
  r.seeds -= it.price;
  if (it.kind === 'saver') saver().have = saversHeld() + 1;
  else { r.owned.push(id); r.wear[it.kind] = id; }
  save(); emit({ seeds: -it.price, bought: id }, 'spend');
  return { ok: true, item: it };
}
export function wear(kind, id) { const r = R(); if (id && !r.owned.includes(id)) return false; if (id) r.wear[kind] = id; else delete r.wear[kind]; save(); emit({ wear: r.wear }, 'wear'); return true; }
export const worn = () => ({ pot: SHOP.find((x) => x.id === R().wear.pot) || null, hat: R().wear.hat || null });

export function rewards() { return R(); }
export function onReward(cb) { subs.add(cb); return () => subs.delete(cb); }
function emit(out, kind, opts) { subs.forEach((f) => { try { f(out, kind, opts); } catch { /* a listener failed: keep going */ } }); }
export function _save() { save(); }
