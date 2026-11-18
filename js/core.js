// Zero Mile: saved state and shared helpers, used by the ad site and the app. Everything is stored on this device only.
document.documentElement.classList.add('js');
// the folder above js/, so pages in / and /app/ find the same files
export const ROOT = new URL('../', import.meta.url);

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n, d = 0) => Number(n).toLocaleString('en-IE', { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------- data (downloaded once from the cited sources into data/data.json; never fetched from the sources at runtime) ----------
let DATA = null;
export async function data() {
  if (!DATA) {
    const [d, man] = await Promise.all([
      fetch(new URL('data/data.json?v=9', ROOT)).then((r) => r.json()),
      fetch(new URL('models/manifest.json?v=6', ROOT)).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);
    DATA = d;
    for (const [id, m] of Object.entries(man || {})) if (m?.harvest) REAL.add(id);
  }
  return DATA;
}
// plants with a real downloaded model of their harvest show it as their picture; the rest show the drawn plant
const REAL = new Set(['basil', 'mint', 'parsley', 'coriander', 'chives', 'rosemary', 'thyme', 'sage', 'dill', 'kale', 'spinach', 'rocket', 'swiss-chard', 'pak-choi', 'rhubarb']); // + low-poly herbs (js/herbs3d.js)
// a plant can name its own picture in data.json (the trees added in round 3 use app/img/trees, rendered from js/trees3d.js)
export const thumb = (id) => { const own = DATA?.plants.find((p) => p.id === id)?.thumb; return new URL(own || (REAL.has(id) ? `img/fruits/${id}.webp` : `img/plants/${id}.webp`), ROOT).href; };
export const plantById = (id) => DATA.plants.find((p) => p.id === id);

// ---------- distance and footprint ----------
export function km(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// One kilogram of a plant's typical shop supply into a region
export function trip(plant, region) {
  const o = plant.origins?.[region]; const reg = DATA.regions[region];
  if (!o || o.origin_lat == null) return null;
  const crow = km({ lat: o.origin_lat, lon: o.origin_lon }, reg.dest);
  const legs = DATA.modes[o.transport_mode] || DATA.modes.road;
  // road distance is longer than a straight line: multiply by the circuity factor for each leg's share
  let co2 = 0;
  for (const leg of legs) co2 += crow * leg.share * DATA.circuity * DATA.emission[leg.mode].value / 1000; // kg CO2e per kg (tonne-km / 1000)
  return { o, reg, crowKm: crow, crowMi: crow * 0.621371, routeKm: crow * DATA.circuity, co2Transport: co2 };
}

// ---------- region ----------
export function guessRegion() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz === 'Europe/Dublin') return 'IE';
  if (tz === 'Europe/London' || tz === 'Europe/Belfast') return 'UK';
  if (tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau') return 'HK';
  if (tz === 'Europe/Berlin' || tz === 'Europe/Busingen') return 'DE';
  if (tz.startsWith('Australia/')) return 'AU';
  if (tz.startsWith('America/') && !/Sao_Paulo|Argentina|Mexico|Bogota|Lima|Santiago|Caracas/.test(tz)) return 'US';
  return 'IE';
}

// ---------- saved state ----------
const KEY = 'zeromile:v1';
const blank = () => ({ region: guessRegion(), garden: [], active: null, smartAI: false });
let S;
try { S = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { S = blank(); }
export const state = S;
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode: keep going in memory */ } }

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
export function streakOf(entry) {
  const days = new Set(entry.log.map((l) => l.date));
  let n = 0, d = new Date();
  if (!days.has(today(d))) d.setDate(d.getDate() - 1); // today not snapped yet: streak still alive from yesterday
  while (days.has(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function addToGarden(id) {
  let e = S.garden.find((g) => g.id === id);
  if (!e) { e = { id, planted: today(), log: [] }; S.garden.push(e); dispatchEvent(new CustomEvent('zm:added', { detail: id })); } // the app awards XP for it
  S.active = id; save();
  return e;
}

// ---------- photo store (IndexedDB) ----------
let dbp;
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('zeromile', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export async function putPhoto(key, blob) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('photos', 'readwrite'); t.objectStore('photos').put(blob, key); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
export async function delPhoto(key) { const d = await db(); return new Promise((res) => { const t = d.transaction('photos', 'readwrite'); t.objectStore('photos').delete(key); t.oncomplete = res; t.onerror = res; }); }
export async function getPhoto(key) { const d = await db(); return new Promise((res) => { const r = d.transaction('photos').objectStore('photos').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); }

// ---------- toast ----------
let tt;
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3200); }

// ---------- entrances: heading, then text, then picture ----------
let io;
export function rise(root) {
  const items = $$('.rise', root);
  if (!('IntersectionObserver' in window)) { items.forEach((e) => e.classList.add('in')); return; }
  io ||= new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach((e) => io.observe(e));
}


export function updateBar() {
  const e = S.garden.find((g) => g.id === S.active) || S.garden[0];
  const btn = $('#bar-streak');
  if (!btn) return;
  if (!e) { btn.textContent = 'Start growing'; btn.href = '#/find'; return; }
  const snapped = e.log.some((l) => l.date === today());
  btn.textContent = snapped ? `${streakOf(e)} day streak` : 'Snap today';
  btn.href = '#/garden';
}

// ---------- app helpers (garden-wide streak, repairs, watering, harvests) ----------
// The streak is garden-wide, like a language-app streak: any photo of any plant keeps it alive.
export function photoDays() {
  const s = new Set();
  for (const e of S.garden) for (const l of e.log) s.add(l.date);
  return s;
}
// A day covered by the streak saver (the watering can) keeps the run alive but does not add to the count.
export const savedDays = () => new Set(S.saver?.used || []);
export function overallStreak() {
  const days = photoDays(), kept = savedDays();
  let n = 0; const d = new Date();
  if (!days.has(today(d))) d.setDate(d.getDate() - 1); // today not snapped yet: the streak is still alive from yesterday
  while (days.has(today(d)) || kept.has(today(d))) { if (days.has(today(d))) n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function bestStreak() {
  const photos = photoDays(), days = [...new Set([...photos, ...savedDays()])].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) { const add = photos.has(d) ? 1 : 0; run = prev && dayDiff(prev, d) === 1 ? run + add : add; best = Math.max(best, run); prev = d; }
  return best;
}

// ---------- streak saver: one free skip a week, earned by a 7-day streak, shown as a watering can ----------
// state.saver = { have: 0–2 (earned at 7 days or bought in the shop for 50 seeds), earned: 'YYYY-MM-DD' (day the last one was earned), used: ['YYYY-MM-DD', …] (days it covered) }
const saverState = () => (S.saver ||= { have: 0, earned: null, used: [] });
export const saverReady = () => saverState().have > 0;
// call after a photo is logged: every 7th day of a run earns a watering can (you can hold one)
export function earnSaver() {
  const s = saverState(), n = overallStreak();
  if (n >= 7 && n % 7 === 0 && (s.have || 0) < 2 && s.earned !== today()) { s.have = (s.have || 0) + 1; s.earned = today(); save(); return true; }
  return false;
}
// call when the app opens: if yesterday was missed but the run was alive the day before, the can covers yesterday.
// At most one cover in any 7 days.
export function useSaverIfNeeded() {
  const s = saverState();
  if (!s.have) return null;
  const days = photoDays(), kept = savedDays();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const y2 = new Date(); y2.setDate(y2.getDate() - 2);
  const yd = today(y), y2d = today(y2);
  if (days.has(yd) || kept.has(yd) || !(days.has(y2d) || kept.has(y2d))) return null;
  if (s.used.some((d) => dayDiff(d, yd) < 7)) return null;
  s.have = Math.max(0, s.have - 1); s.used = [...s.used, yd].slice(-30); save();
  return yd;
}
// streak levels: the sprout on Today grows a stage at each badge
export const BADGES = [3, 7, 14, 30, 50, 100];
export const streakLevel = (n) => BADGES.filter((b) => n >= b).length + (n > 0 ? 1 : 0); // 0 seed … 7 tree
export const MILESTONES = [3, 7, 14, 30, 50, 100, 365];
export const nextMilestone = (n) => MILESTONES.find((m) => m > n) ?? n + 100;
export function lastDays(n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(today(d)); }
  return out;
}
export function wateredToday(e) { return (e.watered || []).includes(today()); }
export function toggleWatered(e) {
  e.watered ||= [];
  if (wateredToday(e)) e.watered = e.watered.filter((d) => d !== today());
  else { e.watered.push(today()); e.watered = e.watered.slice(-60); }
  save();
  return wateredToday(e);
}
export function logHarvest(e, grams) { (e.harvests ||= []).push({ date: today(), g: grams }); save(); }
export const harvestKg = (e) => (e.harvests || []).reduce((s, h) => s + h.g, 0) / 1000;
// Log a photo for a day (today, or a missed day being repaired with a photo taken then)
export async function logPhoto(e, date, blob, res) {
  const key = `${e.id}:${date}`;
  await putPhoto(key, blob);
  e.log = e.log.filter((l) => l.date !== date);
  e.log.push({ date, key, score: res.score, mood: res.mood, cover: res.m?.cover ?? 0, repaired: date !== today() || undefined });
  save();
  return key;
}
export function stageName(e, plant) {
  if (plant?.group === 'tree') return treeStage(e, plant);
  const age = dayDiff(e.planted, today());
  const days = plant?.grow?.days_to_harvest?.[1] || (plant?.group === 'tree' ? 365 * 4 : 120);
  const t = age / days;
  return t < .08 ? 'Seed' : t < .2 ? 'Sprout' : t < .55 ? 'Young plant' : t < .85 ? 'Flowering' : 'Ready to pick';
}

// ---------- trees: planted once, grown for years ----------
// Trees use the cited planting guide in data.json (research/trees-round3.json): months, size, region fit, care.
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const isTree = (p) => p?.group === 'tree';
export const isFruitTree = (p) => isTree(p) && !!p.tree?.years_to_fruit;
export const SOUTH = (region = S.region) => region === 'AU';
// planting months for a tree where you live (southern hemisphere for Australia)
// Hong Kong uses its own planting season; elsewhere the tree's own cited months, else the general season where you live
export function treeMonths(p, region = S.region) {
  const t = p?.tree || {};
  const own = region === 'HK' ? null : SOUTH(region) ? t.plant_months_south : t.plant_months_north;
  return own?.length ? own : (DATA?.trees?.season?.[region]?.months || []);
}
export const treeMonthsGeneral = (p, region = S.region) => { const t = p?.tree || {}; return region === 'HK' || !(SOUTH(region) ? t.plant_months_south : t.plant_months_north)?.length; };
// how well a tree suits your country: native, good, ok or hard (with the cited reason)
export const FIT_WORD = { native: 'Native here', good: 'Grows well here', ok: 'Possible here', hard: 'Hard here' };
export const FIT_RANK = { native: 0, good: 1, ok: 2, hard: 3 };
export function treeFit(p, region = S.region) { const f = p?.tree?.regions?.[region]; return f?.rating ? f : null; }
export const fitsSmall = (p) => !!(p?.tree?.small_garden || p?.tree?.pot_ok);
// trees sorted best first for a region: native or grows well, then small-garden friendly
export function bestTrees(region = S.region) {
  const rank = (p) => (FIT_RANK[treeFit(p, region)?.rating] ?? 2) * 2 + (fitsSmall(p) ? 0 : 1);
  return DATA.plants.filter(isTree).sort((a, b) => rank(a) - rank(b));
}
// the tree planting season where you live, from the cited guide (bare-root season in Ireland, the UK and Germany)
export function treeSeason(region = S.region) {
  const s = DATA.trees?.season?.[region];
  if (!s?.months?.length) return null;
  const m = new Date().getMonth() + 1;
  const on = s.months.includes(m);
  let next = null;
  if (!on) for (let i = 1; i <= 12; i++) { const k = ((m - 1 + i) % 12) + 1; if (s.months.includes(k)) { next = k; break; } }
  return { ...s, on, next };
}
// a tree's age in plain words: "Planted today", "3 months", "Year 2"
export function treeAge(e) {
  const d = dayDiff(e.planted, today());
  if (d <= 0) return 'Planted today';
  if (d < 31) return `${d} day${d === 1 ? '' : 's'} old`;
  if (d < 365) { const m = Math.floor(d / 30.44); return `${m} month${m === 1 ? '' : 's'} old`; }
  return `Year ${Math.floor(d / 365) + 1}`;
}
export function treeStage(e, p) {
  const y = dayDiff(e.planted, today()) / 365;
  const fruit = p?.tree?.years_to_fruit;
  if (fruit && y >= fruit[0]) return 'Fruiting age';
  return y < 1 ? 'Settling in' : y < 3 ? 'Young tree' : 'Growing up';
}
// trees get a photo each season, not each day: about every three months
export const TREE_PHOTO_DAYS = 90;
export function treePhotoDue(e) {
  const last = [...e.log].map((l) => l.date).sort().pop();
  if (!last) return { due: true, days: 0, last: null };
  const left = TREE_PHOTO_DAYS - dayDiff(last, today());
  return { due: left <= 0, days: Math.max(0, left), last };
}
export function logHeight(e, cm) { (e.heights ||= []).push({ date: today(), cm }); e.heights.sort((a, b) => (a.date < b.date ? -1 : 1)); save(); }
export const lastHeight = (e) => (e.heights || []).at(-1) || null;
// estimated CO2 a tree takes up once mature, from the cited typical figure for that tree (EEA: about 22 kg a year for a mature tree)
export function treeCO2(p) { const c = p?.tree?.co2_kg_per_year; return c == null ? null : Array.isArray(c) ? c : [c, c]; }
export const myTrees = () => S.garden.filter((e) => isTree(DATA?.plants.find((p) => p.id === e.id)));
// daily plants (not trees): the ones the daily photo streak is about
export const dailyPlants = () => S.garden.filter((e) => !isTree(DATA?.plants.find((p) => p.id === e.id)));

// one short line for a tree card: how it suits where you live, else first fruit or size
export function treeLine(p) {
  const f = treeFit(p)?.rating, y = p.tree?.years_to_fruit;
  if (f === 'native' || f === 'good' || f === 'hard') return FIT_WORD[f];
  if (y) return `Fruit in ${y[0]}–${y[1]} years`;
  if (fitsSmall(p)) return 'Fits a small garden';
  return f ? FIT_WORD[f] : 'A tree for years';
}
