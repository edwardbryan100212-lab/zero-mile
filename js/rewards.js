// The rewards engine, v3 "The cancelled journey" (DESIGN.md). One score: km cancelled (js/journey.js
// kmCancelled(): every harvest cancels one trip of that plant's shop twin, straight-line km from data.json).
// The collectibles are stickers, kept in state.rewards.stickers { key: 'YYYY-MM-DD' }:
//   home:<id>    planting a plant or tree: its own "Grown at home · 0 km" sticker
//   twin:<id>    its first harvest: the shop twin's sticker, cancelled
//   streak:<n>   photo streaks of 3, 7, 14, 30, 50, 100 and 365 days: a date stamp
//   km:<place>   km cancelled passes a real journey from the data (journeyRanks())
// Pip's pot colours and hats unlock at km totals (nothing is bought). The streak saver (watering can) is earned
// by a 7-day streak in core.js. award(kind, opts) → { stickers, km, kmFrom, kmTo, unlocks } and is idempotent:
// a retaken photo, re-watering the same plant or opening the same plant page twice earns nothing new.
// Old saved state (xp, seeds, badges, quests, days[].q) still loads; it is simply not used.
import { state, save, today, bestStreak, plantById, isTree } from './core.js?v=9';
import { journeyOf, kmCancelled, journeyRanks } from './journey.js?v=9';

const R = () => {
  const r = (state.rewards ||= {});
  r.stickers ||= {}; r.photoDates ||= []; r.owned ||= []; r.wear ||= {}; r.seen ||= []; r.ms ||= {};
  return r;
};
const subs = new Set();
const blank = () => ({ stickers: [], km: 0, kmFrom: 0, kmTo: 0, unlocks: [] });

// ---------- streak stamps ----------
export const MILESTONES = [3, 7, 14, 30, 50, 100, 365];

// ---------- Pip's pots and hats, unlocked by km cancelled ----------
export const PIP_ITEMS = [
  { id: 'pot-sky', kind: 'pot', name: 'Sky pot', color: '#5f8fa6', shade: '#47758b', km: 100 },
  { id: 'hat-cap', kind: 'hat', name: 'Cap', km: 300 },
  { id: 'pot-sun', kind: 'pot', name: 'Sun pot', color: '#d9a441', shade: '#b8862c', km: 700 },
  { id: 'hat-straw', kind: 'hat', name: 'Straw hat', km: 1500 },
  { id: 'pot-berry', kind: 'pot', name: 'Berry pot', color: '#8c5a7e', shade: '#714563', km: 3000 },
  { id: 'hat-flower', kind: 'hat', name: 'Flower crown', km: 6000 },
  { id: 'pot-night', kind: 'pot', name: 'Night pot', color: '#2e3a33', shade: '#1d2620', km: 12000 },
  { id: 'hat-crown', kind: 'hat', name: 'Crown', km: 25000 },
];
// unlocked by km, or bought with seeds before v3 (those stay yours)
export const isUnlocked = (id, km = kmCancelled()) => { const it = PIP_ITEMS.find((x) => x.id === id); return !!it && (km >= it.km || R().owned.includes(id)); };

// ---------- the streak saver (earned in core.js: one every 7 days, hold up to 2) ----------
export const SAVER_MAX = 2;
export const saversHeld = () => state.saver?.have || 0;

// ---------- stickers ----------
const has = (key) => !!R().stickers[key];
function give(key, info, out) {
  if (has(key)) return;
  R().stickers[key] = today();
  out?.stickers.push({ key, ...info });
}
// a short place name: "Westland, South Holland" → "Westland", "Rotterdam (re-export hub)" → "Rotterdam"
export const placeShort = (place = '') => place.split(',')[0].replace(/\s*\(.*?\)\s*/g, ' ').trim();
const jName = (j) => `${placeShort(j.from.place)} → ${j.to.name}`;
export const journeyLabel = jName;
function syncAll(out) {
  // plants in the garden have their home sticker; harvested ones have their twin's
  for (const e of state.garden) {
    if (!plantById(e.id)) continue;
    give(`home:${e.id}`, { kind: 'home', id: e.id }, out);
    if ((e.harvests || []).length && journeyOf(e.id)) give(`twin:${e.id}`, { kind: 'twin', id: e.id }, out);
  }
  // streak stamps (the old v2 milestone record counts too)
  const best = Math.max(bestStreak(), 0), ms = R().ms;
  for (const m of MILESTONES) if (best >= m || ms[m]) give(`streak:${m}`, { kind: 'streak', n: m }, out);
  // real journeys cancelled
  const km = kmCancelled();
  for (const j of journeyRanks()) if (j.km <= km) give(`km:${j.from.place}`, { kind: 'km', j, label: jName(j) }, out);
  // pots and hats: say each unlock once
  const seen = R().seen;
  for (const it of PIP_ITEMS) if (isUnlocked(it.id, km) && !seen.includes(it.id)) { seen.push(it.id); out?.unlocks.push(it); }
}

// every sticker you can collect, earned or not, for the sticker book
export function stickerBook() {
  const r = R(), st = r.stickers, km = kmCancelled(), best = Math.max(bestStreak(), 0);
  const plants = [], seenIds = new Set();
  for (const e of state.garden) {
    const p = plantById(e.id); if (!p || seenIds.has(e.id)) continue; seenIds.add(e.id);
    plants.push({ key: `home:${e.id}`, kind: 'home', id: e.id, name: p.name, date: st[`home:${e.id}`] || null, planted: e.planted });
    if (journeyOf(e.id)) plants.push({ key: `twin:${e.id}`, kind: 'twin', id: e.id, name: p.name, date: st[`twin:${e.id}`] || null, how: `Pick your first ${p.name.toLowerCase()}` });
  }
  // plants you grew before and removed keep their stickers
  for (const k of Object.keys(st)) {
    const [kind, id] = k.split(':');
    if ((kind === 'home' || kind === 'twin') && !seenIds.has(id) && plantById(id)) plants.push({ key: k, kind, id, name: plantById(id).name, date: st[k] });
  }
  const streak = MILESTONES.map((n) => ({ key: `streak:${n}`, kind: 'streak', n, date: st[`streak:${n}`] || null, how: `${n} photo days in a row`, left: Math.max(0, n - best) }));
  const ranks = journeyRanks(), done = ranks.filter((j) => st[`km:${j.from.place}`] || j.km <= km);
  const next = ranks.filter((j) => !done.includes(j)).slice(0, 3);
  const trips = [...done, ...next].map((j) => ({ key: `km:${j.from.place}`, kind: 'km', j, label: jName(j), date: st[`km:${j.from.place}`] || null, how: `Cancel ${Number(j.km).toLocaleString('en-IE')} km` }));
  return { plants, streak, trips, km, total: Object.keys(st).length };
}

// ---------- the one entry point for real actions ----------
// kinds: photo { date, id }, water { id }, harvest { id }, plant { id }, tree { id }, learn { id }
export function award(kind, opts = {}) {
  const r = R(), out = blank();
  const date = opts.date || today(), id = opts.id || '';
  if (kind === 'photo') {
    if (!r.photoDates.includes(date)) { r.photoDates.push(date); r.photoDates = r.photoDates.slice(-400); }
  } else if (kind === 'harvest') {
    // the harvest is already logged (core.logHarvest): it cancels one trip of this plant's shop twin
    const j = id && journeyOf(id);
    out.km = j ? j.km : 0; out.kmTo = kmCancelled(); out.kmFrom = Math.max(0, out.kmTo - out.km); out.id = id;
  } else if (kind === 'plant' || kind === 'tree') {
    if (id && plantById(id)) give(`home:${id}`, { kind: 'home', id }, out);
  }
  // water and learn earn nothing now: Care today and the plant page are their own reward
  syncAll(out);
  save();
  emit(out, kind, opts);
  return out;
}
// call on app open: stickers and unlocks earned by existing data. The first run of v3 credits them quietly.
export function check() {
  const r = R(), out = blank();
  const first = !r.v3; r.v3 = 1;
  syncAll(first ? null : out);
  if (first) { for (const it of PIP_ITEMS) if (isUnlocked(it.id) && !r.seen.includes(it.id)) r.seen.push(it.id); }
  save();
  if (out.stickers.length || out.unlocks.length) emit(out, 'check');
  return out;
}

export function wear(kind, id) { const r = R(); if (id && !isUnlocked(id)) return false; if (id) r.wear[kind] = id; else delete r.wear[kind]; save(); emit({ ...blank(), wear: r.wear }, 'wear'); return true; }
export const worn = () => {
  const w = R().wear, pot = PIP_ITEMS.find((x) => x.id === w.pot && isUnlocked(x.id)) || null;
  return { pot, hat: w.hat && isUnlocked(w.hat) ? w.hat : null };
};

export function rewards() { return R(); }
export function onReward(cb) { subs.add(cb); return () => subs.delete(cb); }
function emit(out, kind, opts) { subs.forEach((f) => { try { f(out, kind, opts); } catch { /* a listener failed: keep going */ } }); }
