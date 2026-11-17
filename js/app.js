// Zero Mile: router, saved state and shared helpers. Everything is stored on this device only.
document.documentElement.classList.add('js');

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n, d = 0) => Number(n).toLocaleString('en-IE', { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------- data (downloaded once from the cited sources into data/data.json; never fetched from the sources at runtime) ----------
let DATA = null;
export async function data() {
  if (!DATA) DATA = await fetch('data/data.json?v=2').then((r) => r.json());
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

// ---------- router ----------
const routes = {
  '': () => import('./home.js?v=2'),
  find: () => import('./find.js?v=2'),
  plant: () => import('./find.js?v=2'),
  garden: () => import('./garden.js?v=2'),
  sources: () => import('./sources.js?v=2'),
};
let current = null;
let routed = false;
async function route() {
  if (location.hash && !location.hash.startsWith('#/')) return; // in-page anchors such as #main
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const key = routes[name] ? name : '';
  await data();
  current?.unmount?.();
  const main = $('#main');
  main.innerHTML = '';
  document.body.dataset.view = key || 'home';
  const navKey = key === 'plant' ? 'find' : key || 'home';
  $$('[data-nav]').forEach((a) => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const mod = await routes[key]();
  const view = key === 'plant' ? mod.plantView : key === 'find' ? mod.findView : mod.default;
  current = await view(main, decodeURIComponent(arg || ''));
  main.firstElementChild?.classList.add('view-enter');
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = (key ? (main.querySelector('h1')?.textContent || 'Zero Mile') + ' · Zero Mile' : 'Zero Mile · grow your own food');
  if (routed) main.focus({ preventScroll: true });
  routed = true;
  rise(main);
  updateBar();
}
export function updateBar() {
  const e = S.garden.find((g) => g.id === S.active) || S.garden[0];
  const btn = $('#bar-streak');
  if (!e) { btn.textContent = 'Start growing'; btn.href = '#/find'; return; }
  const snapped = e.log.some((l) => l.date === today());
  btn.textContent = snapped ? `${streakOf(e)} day streak` : 'Snap today';
  btn.href = '#/garden';
}
addEventListener('hashchange', route);
$('.skip').addEventListener('click', (e) => { e.preventDefault(); $('#main').focus(); });
addEventListener('scroll', () => $('#bar').classList.toggle('solid', scrollY > innerHeight * .6), { passive: true });
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
