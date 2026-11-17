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
  if (!DATA) DATA = await fetch(new URL('data/data.json?v=2', ROOT)).then((r) => r.json());
  return DATA;
}
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
  if (!e) { e = { id, planted: today(), log: [] }; S.garden.push(e); }
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
export function overallStreak() {
  const days = photoDays();
  let n = 0; const d = new Date();
  if (!days.has(today(d))) d.setDate(d.getDate() - 1); // today not snapped yet: the streak is still alive from yesterday
  while (days.has(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function bestStreak() {
  const days = [...photoDays()].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev && dayDiff(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
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
  const age = dayDiff(e.planted, today());
  const days = plant?.grow?.days_to_harvest?.[1] || (plant?.group === 'tree' ? 365 * 4 : 120);
  const t = age / days;
  return t < .08 ? 'Seed' : t < .2 ? 'Sprout' : t < .55 ? 'Young plant' : t < .85 ? 'Flowering' : 'Ready to pick';
}
