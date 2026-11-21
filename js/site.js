// Zero Mile ad site (DESIGN.md v3, "The cancelled journey"). The page is written in index.html for Ireland and the
// tomato, so it reads without script; this file guesses the visitor's country, fills in their real shop twins from
// data/data.json through js/journey.js, runs the live twin picker, peels the hero sticker and plays the routes scene.
import { esc, fmt, data, allPlants, plantById, state } from './core.js?v=9';
import * as J from './journey.js?v=1';
import { produceIcon } from './produce.js?v=9';
import { loadPhotos, creditLine } from './photos.js?v=9';
import { mountScene, spring, seg, sm, easeIO, clamp, RM } from './scene.js?v=11';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const bind = (k) => $(`[data-bind="${k}"]`);

// ---------- words ----------
const REGIONS = ['IE', 'UK', 'US', 'DE', 'HK', 'AU'];
const NAME = { IE: 'Ireland', UK: 'the UK', US: 'the US', DE: 'Germany', HK: 'Hong Kong', AU: 'Australia' };
const POS = { IE: "Ireland's", UK: "the UK's", US: "the US's", DE: "Germany's", HK: "Hong Kong's", AU: "Australia's" };
const DEST = { US: 'the centre of the US' };
const CC = { Australia: 'AU', Brazil: 'BR', Bulgaria: 'BG', Chile: 'CL', China: 'CN', Colombia: 'CO', Egypt: 'EG', France: 'FR',
  Germany: 'DE', India: 'IN', Ireland: 'IE', Italy: 'IT', Japan: 'JP', Kenya: 'KE', Mexico: 'MX', Morocco: 'MA', Netherlands: 'NL',
  'New Zealand': 'NZ', Peru: 'PE', Poland: 'PL', Portugal: 'PT', Senegal: 'SN', 'South Africa': 'ZA', Spain: 'ES', Taiwan: 'TW',
  Turkey: 'TR', 'United Kingdom': 'UK', 'United States': 'US' };
const THE = new Set(['Netherlands', 'United Kingdom', 'United States']);
const MODE = { road: 'lorry', 'road+ferry': 'lorry and ferry', sea: 'ship', 'sea+road': 'ship and lorry', air: 'plane', 'rail+road': 'train and lorry' };
const countryName = (c) => (THE.has(c) ? `the ${c}` : c);
const lc = (n) => (/^(English|Scots|Swiss)\b/.test(n) ? n : n[0].toLowerCase() + n.slice(1));
const noun = (p) => lc(p.name.replace(/ tree$/i, ''));
const destOf = (j, region) => DEST[region] || j.to.name;

// "Westland, South Holland" -> "Westland"; "Netherlands (region not stated)" -> the country
function shortPlace(j) {
  let s = String(j.from.place || '').replace(/\s*\(.*?\)\s*/g, ' ').split(/,|\/|;| - /)[0].trim();
  if (!s || /not (stated|identified|verified)|unspecified/i.test(j.from.place) && s.startsWith(j.from.country.split(' ')[0])) s = j.from.country;
  return s;
}
const stickerLabel = (j) => { const s = shortPlace(j); return s === j.from.country ? s : `${s}, ${CC[j.from.country] || j.from.country}`; };
const placeLong = (j) => { const s = shortPlace(j); return s === j.from.country ? countryName(s) : `${s} in ${countryName(j.from.country)}`; };
const pct = (v) => (v >= 10 ? Math.round(v) : fmt(v, 1));

// one plain sentence about a plant's shop twin in a region
function twinSentence(p, j, region) {
  if (!j) {
    if (p.group === 'tree') return `Nobody ships ${lc(p.name)} to eat, so growing one cancels no trip. Zero Mile counts a tree by the carbon it takes up once grown: about 22 kg of CO₂ a year, a general figure for a mature tree.`;
    return `There is no cited origin yet for the shop ${noun(p)} in ${NAME[region]}, so Zero Mile counts no km for it there rather than guess.`;
  }
  const yr = j.year ? ` (${j.year})` : '', n = noun(p);
  let a;
  if (j.home) a = j.sharePct != null ? `${pct(j.sharePct)}% of ${POS[region]} ${n} supply is grown at home${yr}, mostly in ${shortPlace(j) === j.from.country ? 'many places' : shortPlace(j)}.` : `Most of ${POS[region]} ${n} is grown at home, mainly in ${shortPlace(j) === j.from.country ? 'many places' : shortPlace(j)}${yr}.`;
  else a = j.sharePct != null ? `${pct(j.sharePct)}% of ${POS[region]} ${n} imports come from ${placeLong(j)}${yr}.` : `Most of ${POS[region]} imported ${n} comes from ${placeLong(j)}${yr}.`;
  return a;
}
const kmLine = (j, region) => `${fmt(j.km)} km to ${destOf(j, region)} as the crow flies, by ${MODE[j.mode] || j.mode}.`;
const sourceHtml = (j) => {
  const s = j?.sources?.find((x) => x.url) ; if (!s) return '';
  const more = j.sources.length > 1 ? `, and ${j.sources.length - 1} more in the app` : '';
  return `Source: <a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>${more}`;
};

// ---------- the visitor's country ----------
const SITE_KEY = 'zeromile:site-region';
function guessRegion() {
  try { const r = localStorage.getItem(SITE_KEY); if (REGIONS.includes(r)) return r; } catch { /* storage blocked */ }
  try { const r = JSON.parse(localStorage.getItem('zeromile:v1') || '{}').region; if (REGIONS.includes(r)) return r; } catch { /* none saved */ }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz === 'Europe/Dublin') return 'IE';
  if (tz === 'Europe/London' || tz === 'Europe/Belfast') return 'UK';
  if (/^Asia\/(Hong_Kong|Macau)$/.test(tz)) return 'HK';
  if (/^Europe\/(Berlin|Busingen)$/.test(tz)) return 'DE';
  if (tz.startsWith('Australia/')) return 'AU';
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Indiana|Kentucky|Boise)/.test(tz) || tz === 'Pacific/Honolulu') return 'US';
  for (const l of navigator.languages || [navigator.language || '']) {
    const m = String(l).match(/^([a-z]{2,3})(?:-([A-Za-z]{2}))?/); if (!m) continue;
    const c = (m[2] || '').toUpperCase();
    if (c === 'IE') return 'IE'; if (c === 'GB') return 'UK'; if (c === 'US') return 'US'; if (c === 'AU') return 'AU'; if (c === 'HK') return 'HK';
    if (m[1] === 'de') return 'DE'; if (m[1] === 'zh' && c === 'HK') return 'HK';
  }
  return 'IE';
}

const PICKS = ['tomato', 'strawberry', 'basil', 'lettuce', 'potato', 'carrot', 'apple', 'blueberry', 'chilli', 'garlic', 'mint', 'oak'];
const S = { region: 'IE', plant: 'tomato' };

// stickerSvg reads state.region for the shop twin; set it in memory only (never saved: the app keeps its own)
const withRegion = (r, fn) => { const was = state.region; state.region = r; try { return fn(); } finally { state.region = was; } };

// ---------- hero ----------
function renderHero() {
  const j = J.journeyOf('tomato', S.region);
  const km = j ? fmt(j.km) : '0';
  bind('hero-line').textContent = `${km} km tomato.`;
  document.title = `Zero Mile · cancel the ${km} km tomato`;
  bind('hero-fact').textContent = j
    ? `The shop tomato in ${NAME[S.region]} ${j.home ? 'is grown' : 'comes from'} ${j.home ? `in ${shortPlace(j)}` : placeLong(j)}, ${km} km away by ${MODE[j.mode] || j.mode}.`
    : `There is no cited origin for the shop tomato in ${NAME[S.region]}.`;
  withRegion(S.region, () => {
    $('.stk-shop').innerHTML = j ? J.stickerSvg('tomato', { kind: 'shop', size: 180, label: stickerLabel(j) }) : '';
    $('.stk-home').innerHTML = J.stickerSvg('tomato', { kind: 'home', size: 180, label: 'Your windowsill' });
    $('.tile-stk').innerHTML = J.stickerSvg('tomato', { kind: 'home', size: 132, label: 'Grown at home' });
  });
  bind('how-3').textContent = j ? `Log a harvest and its shop twin stays home: ${km} km from ${shortPlace(j)}, added to your km cancelled.` : 'Log a harvest and it is added to your harvests.';
  $('#region-hero').value = S.region;
}

// the shop sticker peels off the tomato as the page scrolls, showing the Zero Mile sticker under it
function peel() {
  const shop = $('.stk-shop'), home = $('.stk-home'); if (!shop) return;
  if (RM) return;
  const f = spring(0, { settle: .45 });
  let last = 0, run = false, drawn = -1;
  const target = () => clamp(scrollY / (innerHeight * .42));
  const draw = (v) => {
    const e = easeIO(v);
    shop.style.transform = `translate(${(e * 70).toFixed(1)}%, ${(-e * 120).toFixed(1)}%) rotate(${(-6 + e * 38).toFixed(2)}deg) scale(${(1 - e * .12).toFixed(3)})`;
    shop.style.opacity = (1 - sm(seg(v, .55, 1))).toFixed(3);
    home.style.transform = `rotate(-6deg) scale(${(.92 + .08 * sm(seg(v, .2, .9))).toFixed(3)})`;
  };
  const loop = (now) => {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60; last = now;
    f.target = target(); f.step(dt);
    if (Math.abs(f.value - drawn) > 1e-4) { drawn = f.value; draw(drawn); }
    if (Math.abs(f.value - f.target) > 1e-4 || Math.abs(f.velocity) > 1e-4) requestAnimationFrame(loop); else { run = false; last = 0; }
  };
  const kick = () => { if (!run) { run = true; requestAnimationFrame(loop); } };
  f.value = f.target = target(); draw(f.value);
  addEventListener('scroll', kick, { passive: true });
}

// ---------- the live twin picker ----------
function renderChips() {
  const box = $('.chips');
  box.innerHTML = PICKS.filter((id) => plantById(id)).map((id) => {
    const p = plantById(id);
    return `<button type="button" role="radio" data-plant="${id}" aria-checked="${id === S.plant}" tabindex="${id === S.plant ? 0 : -1}">${produceIcon(id, { size: 28, group: p.group })}<span>${esc(p.name.replace(/ tree$/i, ''))}</span></button>`;
  }).join('');
  const groups = [['veg', 'Vegetables'], ['herb', 'Herbs'], ['fruit', 'Fruit'], ['tree', 'Trees']];
  $('#plant-more').innerHTML = `<option value="">Choose…</option>` + groups.map(([g, label]) => `<optgroup label="${label}">${allPlants().filter((p) => p.group === g).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
}

function renderTwin(animate = true) {
  const p = plantById(S.plant), j = J.journeyOf(S.plant, S.region);
  $$('.regions [data-region]').forEach((b) => { const on = b.dataset.region === S.region; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  $$('.chips [data-plant]').forEach((b) => { const on = b.dataset.plant === S.plant; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  if (!PICKS.includes(S.plant)) { const c = $('.chips [data-plant]'); if (c) c.tabIndex = 0; }
  $('#plant-more').value = PICKS.includes(S.plant) ? '' : S.plant;

  const map = bind('twin-map'), mw = Math.max(320, Math.min(960, Math.round(map.clientWidth || 640)));
  map.innerHTML = j
    ? J.routeSvg(S.plant, { w: mw, h: Math.round(mw * 9 / 16), region: S.region, progress: 1, crop: 'auto', detail: true })
    : `<div class="no-route">${produceIcon(S.plant, { size: 120, group: p.group })}</div><figcaption>${esc(p.name)}: no shop route</figcaption>`;
  map.classList.toggle('none', !j);
  bind('twin-line').textContent = j ? kmLine(j, S.region) : (p.group === 'tree' ? `No shop twin for the ${lc(p.name)}.` : `No route for the ${noun(p)} in ${NAME[S.region]}.`);
  bind('twin-more').textContent = twinSentence(p, j, S.region);
  bind('twin-src').innerHTML = j ? sourceHtml(j) : (p.group === 'tree' ? 'Source: <a href="https://environment.ec.europa.eu/3-billion-trees" rel="noopener">European Commission, 3 Billion Trees</a>' : '');
  const n = j ? fmt(j.km) : '0';
  const num = bind('spec-num'); num.textContent = n; num.style.setProperty('--n', Math.max(3, n.length));
  $('.spec-home .spec-num').style.setProperty('--n', Math.max(3, n.length));
  bind('spec-shop').textContent = j ? `Shop ${noun(p)}, from ${shortPlace(j)}, in km` : `No shop ${noun(p)} travels, so there is no trip to count`;
  bind('spec-home').textContent = `Your ${noun(p)}, from home, in km`;
  if (animate && !RM) for (const el of [map, num]) { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); }
}

function picker() {
  renderChips();
  const go = () => { renderTwin(); };
  $('.regions').addEventListener('click', (e) => { const b = e.target.closest('[data-region]'); if (b) setRegion(b.dataset.region); });
  $('.chips').addEventListener('click', (e) => { const b = e.target.closest('[data-plant]'); if (b) { S.plant = b.dataset.plant; go(); } });
  $('#plant-more').addEventListener('change', (e) => { if (e.target.value) { S.plant = e.target.value; go(); } });
  // arrow keys move along a radio group, like native radios
  for (const g of $$('.regions, .chips')) g.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
    const bs = $$('[role="radio"]', g), i = bs.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const b = bs[(i + k + bs.length) % bs.length]; b.focus(); b.click();
  });
}

// ---------- trees ----------
function renderTrees() {
  const j = J.journeyOf('apple', S.region);
  const fruit = allPlants().filter((p) => p.group === 'tree' && J.journeyOf(p.id, S.region)).length;
  const wood = allPlants().filter((p) => p.group === 'tree' && !J.journeyOf(p.id, S.region)).length;
  const apple = j ? (j.home ? `, like the apple grown ${fmt(j.km)} km from ${destOf(j, S.region)} in ${shortPlace(j)}` : `, like the apple that reaches ${destOf(j, S.region)} from ${countryName(j.from.country)}`) : '';
  const word = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] || String(n);
  bind('trees-line').textContent = `${word(fruit)} fruit trees have a shop twin${apple}. These ${word(wood).toLowerCase()} woodland trees have none: nobody ships birch to eat, so they cancel no trip. Zero Mile counts them by the carbon a grown tree takes up, about 22 kg of CO₂ a year, one general figure from the European Environment Agency, because no tree-by-tree number exists. A sapling takes up far less.`;
}

// ---------- the scene: every twin route flies in to the home city, then cancels into one dot ----------
const trip = { el: null, key: '', routes: [], total: 0, phase: -1, odoKm: -1, line: '' };
function tripIds(region) {
  return allPlants().map((p) => J.journeyOf(p.id, region)).filter((j) => j && j.km > 0).sort((a, b) => a.km - b.km);
}
// the two ends of a route's drawn line (.rt-line), in the svg's own units
function ends(g) {
  const ln = g.querySelector('.rt-line, path, line'); if (!ln) return null;
  try { const L = ln.getTotalLength(), p0 = ln.getPointAtLength(0), p1 = ln.getPointAtLength(L); return { a: [p0.x, p0.y], b: [p1.x, p1.y] }; } catch { return null; }
}
// every twin route of the region in one routesSvg; each arc is then moved by transform and opacity only
function buildTrips() {
  const box = bind('trips-map'), w = Math.round(box.clientWidth || innerWidth), h = Math.round(box.clientHeight || innerHeight);
  const js = tripIds(S.region), key = `${S.region}|${w}x${h}`;
  if (key === trip.key) return; trip.key = key;
  box.innerHTML = J.routesSvg(js.map((j) => j.id), { w, h, region: S.region });
  const svg = $('svg', box); if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); }
  trip.routes = $$('.rt-arc[data-id]', box).map((g) => {
    const e = ends(g), j = js.find((x) => x.id === g.dataset.id); if (!e || !j) return null;
    for (const el of g.children) el.style.transformBox = 'view-box';
    const ln = $('.rt-line', g); if (ln) ln.setAttribute('vector-effect', 'non-scaling-stroke');
    return { g, j, km: j.km, a: e.a, h: e.b };
  }).filter(Boolean);
  trip.total = trip.routes.reduce((s, r) => s + r.km, 0);
  const n = trip.routes.length;
  // fly in mixed (a stride through the list, so long and short arcs arrive together); cancel farthest first, so the map closes in on home
  const stride = n > 2 ? [37, 29, 23, 19, 17, 13, 11, 7].find((p) => n % p) || 1 : 1;
  trip.routes.forEach((r, i) => { r.inA = .04 + (((i * stride) % n) / n) * .3; r.outA = .5 + ((n - 1 - i) / n) * .36; });
  bind('trips-odo').innerHTML = J.odometer(0, { digits: String(trip.total).length });
  bind('trips-count').textContent = 'cancelled by growing them at home';
  trip.phase = -1; trip.odoKm = -1; trip.line = '';
}
// set the odometer's digit columns directly (each a 0-9 strip moved by transform, css/journey.css)
function odoSet(v) {
  const o = $('.odo', bind('trips-odo')); if (!o) return;
  const n = +o.dataset.digits || 6, k = Math.max(0, Math.round(v)), s = String(k).padStart(n, '0').slice(-n), lead = n - String(k).length;
  $$('.odo-d', o).forEach((d, i) => { d.style.setProperty('--d', s[i]); d.classList.toggle('lead', i < lead); });
  o.setAttribute('aria-label', `${fmt(k)} km cancelled`);
}
function drawTrips(f) {
  const n = trip.routes.length; let km = 0;
  for (const r of trip.routes) {
    const g = r.g, grow = easeIO(seg(f, r.inA, r.inA + .09)), c = easeIO(seg(f, r.outA, r.outA + .05));
    km += r.km * c;
    // the arc grows out of its origin until it reaches home, then shrinks back into the home dot
    const sc = c > 0 ? 1 - c : grow, o = c > 0 ? r.h : r.a;
    const op = c > 0 ? 1 - sm(seg(c, .75, 1)) : sm(seg(grow, 0, .2));
    const key = `${c > 0 ? 1 : 0}${sc.toFixed(4)}`;
    if (key !== g._k) {
      g._k = key;
      for (const el of g.children) {
        if (el.tagName === 'title') continue;
        el.style.transformOrigin = `${o[0].toFixed(1)}px ${o[1].toFixed(1)}px`;
        el.style.transform = `scale(${sc.toFixed(4)})`;
      }
    }
    if (Math.abs((g._o ?? -1) - op) > .004) { g.style.opacity = op.toFixed(3); g._o = op; }
  }
  const k = Math.round(km);
  if (k !== trip.odoKm) { trip.odoKm = k; odoSet(k); }
  const done = trip.routes.filter((r) => f >= r.outA + .05).length;
  // the caption turns once the first trip has really gone (with a little hysteresis, so it never flickers)
  const phase = done === 0 || f < .55 + (trip.phase === 1 ? -.012 : .012) ? 0 : 1;
  const dest = DEST[S.region] || trip.routes[0]?.j?.to.name || NAME[S.region];
  const line = phase === 0
    ? `${n} shop twins travel to ${dest}. Grown at home, together they cancel ${fmt(trip.total)} km.`
    : done < n ? `${done} of ${n} trips cancelled so far.` : `All ${n} cancelled. One dot is left: home.`;
  if (line !== trip.line) { trip.line = line; bind('trips-line').textContent = line; }
  trip.phase = phase;
}
// reduced motion: every route in place, with the whole distance on the odometer
const stillTrips = () => { drawTrips(.46); odoSet(trip.total); trip.odoKm = trip.total; };
function scene() {
  const el = $('#cancel'); trip.el = el;
  trip.scene = mountScene(el, {
    // the scene is drawn in code (no pictures to fetch), so it gets ready from the first screen
    height: 460, settle: .55, ahead: '1000%',
    layout: () => buildTrips(),
    draw: drawTrips,
    still: stillTrips,
  });
}

// ---------- region ----------
function setRegion(r) {
  if (!REGIONS.includes(r)) return;
  S.region = r;
  try { localStorage.setItem(SITE_KEY, r); } catch { /* fine */ }
  renderHero(); renderTwin(); renderTrees();
  if (trip.scene) { trip.key = ''; buildTrips(); if (RM) stillTrips(); else drawTrips(trip.scene.progress()); }
}

// ---------- credits for every photo on the page ----------
async function credits() {
  const all = await loadPhotos(); const files = new Set($$('main img').map((im) => im.getAttribute('src').split('/').pop()));
  const lines = Object.values(all).flat().filter((p) => files.has(p.file)).map((p) => `<a href="${esc(p.url)}" rel="noopener">${esc(creditLine(p))}</a>`);
  lines.push('<a href="https://commons.wikimedia.org/wiki/File:Germinacion_2.webm" rel="noopener">“Germinacion 2” (time-lapse) by Akronix, CC BY-SA 3.0</a>');
  bind('credits').innerHTML = `Photos and film, via Wikimedia Commons and rawpixel: ${lines.join('; ')}.`;
}

// ---------- the seedling time-lapse plays only while it is on screen, and never under reduced motion ----------
function clip() {
  const v = $('.tile-pic video'); if (!v || RM || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { v.play().catch(() => {}); } else v.pause(); }, { rootMargin: '10% 0px' }).observe(v);
}

// ---------- pictures (never text) rise into place as their section arrives ----------
function rise() {
  const els = $$('.tile-pic, .tl-c, .twin-map');
  if (RM || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => {
    const sib = [...el.parentElement.children].filter((x) => els.includes(x)); el.style.setProperty('--d', `${Math.min(sib.indexOf(el), 8) * 70}ms`);
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('rise'); io.observe(el); }
  });
}

async function start() {
  await data();
  S.region = guessRegion();
  renderHero(); picker(); renderTwin(false); renderTrees();
  $('#region-hero').addEventListener('change', (e) => setRegion(e.target.value));
  peel(); rise(); clip(); scene(); credits();
}
start().catch((e) => console.error(e));
