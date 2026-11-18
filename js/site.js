// Zero Mile ad site, DESIGN v2 "Garden LCD": calm cream paper with slow ombre fields and real, credited plant
// photos; everything game-like is on Pip's black LCD with green pixels. Scenes: the streak on a full-screen LCD,
// a fly-through of real harvest photos, and season colour wipes. No AI art, no chests.
import { esc, fmt, data, plantById, trip, state, save } from './core.js?v=9';
import { mountScene, seg, sm, easeIO, cosEase, seeded, put, hide, fade, clamp, RM } from './scene.js?v=10';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const APP = 'app/';
const [D, CRED] = await Promise.all([data(), fetch('img/real/credits.json').then((r) => r.json()).catch(() => ({}))]);
const P = D.plants;
const real = (f) => `img/real/${f}`;
const photosOf = (id, kind) => (CRED[id] || []).filter((x) => !kind || x.kind === kind);
const used = new Map(); // every photo on the page, for the credits list
const ph = (id, kind, i = 0) => { const x = photosOf(id, kind)[i] || photosOf(id)[0]; if (x) used.set(x.file, x); return x; };
const img = (x, alt = '', { cls = '', lazy = true, attr = 'src' } = {}) => (x ? `<img class="${cls}" ${attr}="${real(x.file)}" alt="${esc(alt)}" width="${x.w}" height="${x.h}"${lazy ? ' loading="lazy"' : ''} decoding="async">` : '');

// ---------- Pip: a flat SVG pot with its black LCD face (green pixels, stepped blink and wiggle) ----------
const FACE = { // 14 x 10 grid
  open: ['3,2', '4,2', '3,3', '4,3', '3,4', '4,4', '9,2', '10,2', '9,3', '10,3', '9,4', '10,4'],
  shut: ['2,4', '3,4', '4,4', '9,4', '10,4', '11,4'],
  smile: ['4,6', '9,6', '5,7', '6,7', '7,7', '8,7'],
};
const rects = (cells, x0, y0, c, s) => cells.map((k) => { const [x, y] = k.split(',').map(Number); return `<rect x="${x0 + x * c}" y="${y0 + y * c}" width="${s}" height="${s}"/>`; }).join('');
function pip(size = 300, cls = '') {
  const c = 6, x0 = 58, y0 = 133, dim = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) dim.push(`${x},${y}`);
  return `<svg class="pipsvg ${cls}" width="${size}" height="${Math.round(size * 230 / 200)}" viewBox="0 0 200 230" aria-hidden="true" focusable="false">
    <path d="M100 92V52" stroke="#23774a" stroke-width="6" stroke-linecap="round"/>
    <path class="lf1" d="M99 60C79 56 63 42 60 24c19-1 36 13 39 36z" fill="#3c9a5f"/>
    <path class="lf2" d="M101 54c11-21 29-31 50-30-4 21-24 33-50 30z" fill="#23774a"/>
    <rect x="28" y="84" width="144" height="30" rx="12" fill="#d47a4e"/>
    <rect x="40" y="86" width="120" height="7" rx="3.5" fill="#6b4029"/>
    <path d="M42 114h116l-10 92q-1 10-12 10H64q-11 0-12-10z" fill="#c8673d"/>
    <rect x="50" y="124" width="100" height="78" rx="14" fill="#2b1b13"/>
    <rect x="55" y="129" width="90" height="68" rx="10" fill="#0c110d"/>
    <g fill="#1f5a2b" opacity=".3">${rects(dim, x0, y0, c, 4.6)}</g>
    <g class="face" fill="#62f27e"><g class="eo">${rects(FACE.open, x0, y0, c, 5)}</g><g class="es">${rects(FACE.shut, x0, y0, c, 5)}</g>${rects(FACE.smile, x0, y0, c, 5)}</g>
  </svg>`;
}

// ---------- pixel art for the LCD: digits (5x7) and icons (12x12), lit pixels over dim ones ----------
const DIG = {
  0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
  3: '11110000010000101110000010000111110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
  6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
  9: '01110100011000101111000010001001100', '+': '00000001000010011111001000010000000',
};
function pxNum(str, h = 120, cls = '') {
  str = String(str); const cols = str.length * 6 - 1, lit = [], off = [];
  [...str].forEach((ch, i) => { const g = DIG[ch] || DIG[0]; for (let k = 0; k < 35; k++) (g[k] === '1' ? lit : off).push(`<rect x="${i * 6 + (k % 5)}" y="${Math.floor(k / 5)}" width=".86" height=".86"/>`); });
  return `<svg class="pxn ${cls}" width="${Math.round(h * cols / 7)}" height="${h}" viewBox="0 0 ${cols} 7" aria-hidden="true"><g class="off">${off.join('')}</g><g class="on">${lit.join('')}</g></svg>`;
}
const ICONS = {
  sun: ['.....##.....', '.#...##...#.', '..#......#..', '....####....', '...######...', '##.######.##', '##.######.##', '...######...', '....####....', '..#......#..', '.#...##...#.', '.....##.....'],
  bolt: ['.......###..', '......###...', '.....###....', '....###.....', '...###......', '..#######...', '....####....', '....###.....', '...###......', '..###.......', '.###........', '.##.........'],
  seed: ['............', '.##......##.', '####....####', '#####..#####', '.####..####.', '..###..###..', '....####....', '.....##.....', '.....##.....', '.....##.....', '...######...', '..########..'],
  badge: ['...######...', '..########..', '.####..####.', '.###....###.', '.###....###.', '.####..####.', '..########..', '...######...', '...##..##...', '..##....##..', '..#......#..', '............'],
  camera: ['............', '....####....', '############', '#....##....#', '#...####...#', '#..##..##..#', '#..##..##..#', '#...####...#', '#....##....#', '############', '............', '............'],
};
function pxIcon(name, size = 96, cls = '') {
  const g = ICONS[name], on = [], off = [];
  g.forEach((row, y) => [...row].forEach((ch, x) => (ch === '#' ? on : off).push(`<rect x="${x}" y="${y}" width=".86" height=".86"/>`)));
  return `<svg class="pxi ${cls}" width="${size}" height="${size}" viewBox="0 0 12 12" aria-hidden="true"><g class="off">${off.join('')}</g><g class="on">${on.join('')}</g></svg>`;
}
const dots = (n, lit) => `<span class="pxdots" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('')}</span>`;

// ---------- paper glyph icons: filled, one weight, rounded, currentColor ----------
const G = {
  leaf: '<path d="M4.5 19.5C4 11 9.5 4.6 20 4c.4 10.2-5.7 16.1-15.5 15.5z"/><path d="M5 19 13 11" stroke="var(--paper-c,#fffdf7)" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  truck: '<path d="M2 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1h3.2a2 2 0 0 1 1.6.8l1.8 2.4c.3.3.4.8.4 1.2V16a2 2 0 0 1-2 2h-.6a3 3 0 0 1-5.8 0H9.4a3 3 0 0 1-5.8 0H4a2 2 0 0 1-2-2z"/>',
  flower: '<circle cx="12" cy="7" r="3.6"/><circle cx="7.2" cy="10.6" r="3.6"/><circle cx="16.8" cy="10.6" r="3.6"/><circle cx="9" cy="15.6" r="3.6"/><circle cx="15" cy="15.6" r="3.6"/><circle cx="12" cy="11.6" r="2.4" fill="var(--paper-c,#fffdf7)"/>',
  drop: '<path d="M12 2.8c4.3 5.2 6.6 8.6 6.6 11.7a6.6 6.6 0 0 1-13.2 0c0-3.1 2.3-6.5 6.6-11.7z"/>',
  tree: '<circle cx="12" cy="9" r="6.6"/><circle cx="7.4" cy="12.6" r="4.2"/><circle cx="16.6" cy="12.6" r="4.2"/><rect x="10.8" y="13" width="2.4" height="8.4" rx="1.2"/>',
  sprout: '<rect x="11" y="10" width="2" height="11" rx="1"/><path d="M12 12C7.2 12.2 4.4 9.6 4 5c4.8-.2 7.6 2.4 8 7z"/><path d="M12 10.4c.3-4.5 3.2-7 8-6.8-.4 4.6-3.2 7-8 6.8z"/><rect x="5" y="19.4" width="14" height="2.4" rx="1.2"/>',
  camera: '<path fill-rule="evenodd" d="M8.6 4.4A2 2 0 0 1 10.3 3.5h3.4a2 2 0 0 1 1.7.9l1 1.6H19a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h2.6zM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
  pot: '<path d="M4 7.5h16v3H4z"/><path d="M5.4 11.5h13.2l-1.4 8.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8z"/><path d="M12 7V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const icon = (n, s = 24) => `<svg class="gi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${G[n]}</svg>`;

// ---------- content ----------
const SEASONS = [
  { name: 'Spring', months: [3, 4, 5], tone: 'mint', note: 'Seeds go in as the soil warms.' },
  { name: 'Summer', months: [6, 7, 8], tone: 'butter', note: 'Long days. Pick something almost every day.' },
  { name: 'Autumn', months: [9, 10, 11], tone: 'peach', note: 'Garlic and fruit bushes go in.' },
  { name: 'Winter', months: [12, 1, 2], tone: 'sky', note: 'Plant bare-root trees and plan the windowsill.' },
];
const TREES = P.filter((p) => p.group === 'tree');
const NATIVE = ['oak', 'birch', 'rowan', 'beech', 'scots-pine'];
const EEA = P.flatMap((p) => p.tree?.sources || []).find((s) => /European Environment Agency/.test(s.publisher));
const sows = (p, ms) => [...(p.grow?.sow_months_north || []), ...(p.grow?.plant_months_north || [])].some((m) => ms.includes(m));
const FOODMILES = D.context_facts.find((f) => /19%/.test(f.text));
const POLLEN = D.home_facts.find((f) => /pollinators/.test(f.text));
const SPIN = plantById('spinach')?.home_vs_shop;
const src = (s, fallback) => (s ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.publisher.replace(/\s*\(.*$/, ''))}</a>` : esc(fallback));
const heroPhoto = ph('tomato', 'harvest'), heroPhoto2 = ph('basil', 'plant');

const main = $('#main');
main.innerHTML = `
<section class="hero ombre" data-tone="mint-peach" id="top" aria-labelledby="hero-title">
  <div class="hero-copy">
    <h1 id="hero-title"><span>Grow it. Snap it.</span> <span>Eat it.</span></h1>
    <p class="lead">A garden game for kids and grown-ups. Snap your plant each day, keep your streak and earn seeds and badges.</p>
    <div class="acts"><a class="btn btn-lg" href="${APP}">Start growing</a><a class="btn btn-2" href="#streak">How it works</a></div>
    <p class="small">${icon('leaf', 20)}Free. Phone, tablet or computer. Photos stay on your device.</p>
  </div>
  <div class="hero-art" aria-hidden="true">
    <figure class="snap par" data-par="-.06">${img(heroPhoto, '', { lazy: false })}<figcaption>Day 75</figcaption></figure>
    <div class="par pipw" data-par="-.12"><div class="bob">${pip(420, 'hero-pip')}</div></div>
    <div class="par lcdchip c1" data-par="-.3"><div class="bob b2"><span class="lcd mini">${pxIcon('sun', 30)}${pxNum(7, 26)}<b>day streak</b></span></div></div>
    <div class="par lcdchip c2" data-par="-.2"><div class="bob b3"><span class="lcd mini">${pxIcon('seed', 30)}${pxNum('+20', 26)}<b>seeds</b></span></div></div>
    <div class="par lcdchip c3" data-par="-.4"><div class="bob b4"><span class="lcd mini">${pxIcon('bolt', 30)}${pxNum('+10', 26)}<b>XP</b></span></div></div>
  </div>
  <button class="motion" id="motion" type="button" aria-pressed="false">Pause motion</button>
</section>

<section class="streak" id="streak" aria-labelledby="streak-title">
  <div class="lcdfield"></div>
  <div class="intro"><h2 id="streak-title">How the streak works</h2><p>Every day, on Pip’s screen.</p></div>
  <div class="steps">
    <div class="step" data-i="0"><figure class="paperphoto">${img(ph('strawberry', 'harvest'), 'Strawberries just picked', { attr: 'data-src', lazy: false })}</figure><h3>Snap your plant</h3><p>One photo a day. Pip checks the leaves.</p></div>
    <div class="step" data-i="1"><div class="row">${pxIcon('bolt', 150, 'big')}<span class="xpnum">${pxNum('+10', 120)}</span></div><span class="pxbar" aria-hidden="true">${'<i></i>'.repeat(12)}</span><h3>XP for every photo</h3><p>Level up from Seedling to Forest Maker.</p></div>
    <div class="step" data-i="2"><div class="row">${pxIcon('sun', 150, 'big')}<span class="stnum">${pxNum(7, 140)}</span></div>${dots(7, 0)}<h3>Keep your streak</h3><p>Snap every day and the sun stays up.</p></div>
    <div class="step" data-i="3"><div class="row">${pxIcon('badge', 170, 'big badge')}</div><h3>Win badges</h3><p>16 to collect, from first photo to 100 days.</p></div>
    <div class="step" data-i="4"><div class="row">${pxIcon('seed', 150, 'big')}${pxNum('+20', 120)}</div><h3>Earn seeds</h3><p>Spend them on hats and pots for Pip.</p><a class="pxbtn" href="${APP}">Start your streak</a></div>
  </div>
</section>

<section class="sec app ombre" data-tone="sage-butter" id="app" aria-labelledby="app-title">
  <div class="wrap">
    <div class="app-head">
      <h2 class="rv" id="app-title">The real app, in your pocket</h2>
      <p class="rv" style="--d:80ms">Find a plant, see it grown in 3D, and watch your food miles add up.</p>
    </div>
    <div class="phones">
      ${[['find', 'Find a plant', `${P.length} plants and trees, with what grows well where you live.`, 'search'], ['plant', 'Every plant in 3D', 'Slide from seed to harvest. Turn it with a finger.', 'sprout'], ['impact', 'Your impact', 'Food miles and carbon skipped, from cited data.', 'truck']].map(([f, t, c, ic], i) => `
      <figure class="pf rv" style="--d:${i * 90}ms"><div class="par" data-par="${[.05, -.05, .08][i]}"><div class="phone"><div class="scr"><img src="img/app/${f}.webp" alt="The ${esc(t)} screen of Zero Mile" width="600" height="1298" loading="lazy" decoding="async"></div></div></div>
        <figcaption>${icon(ic === 'search' ? 'leaf' : ic, 22)}<span><b>${t}</b>${c}</span></figcaption></figure>`).join('')}
    </div>
  </div>
</section>

<section class="tunnel" id="plants" aria-labelledby="tunnel-title">
  <div class="field" id="tunnel-field"></div>
  <div class="intro"><h2 id="tunnel-title">${P.length} plants to grow</h2><p>Tomatoes, berries, herbs, beans, even an apple tree.</p></div>
  <div class="cap" id="tunnel-cap"><h3>What will you grow first?</h3><p>Every plant has a care guide and a 3D model.</p><a class="btn" href="${APP}#/find">Find my plant</a></div>
</section>

<section class="sec why ombre" data-tone="butter-peach" id="why" aria-labelledby="why-title">
  <div class="wrap">
    <h2 class="rv" id="why-title">Why grow your own food?</h2>
    <div class="why-grid">
      <div class="kids card rv" style="--d:80ms">
        <h3>For kids</h3>
        <ul class="glist"><li>${icon('sprout')}Watch a seed become dinner.</li><li>${icon('pot')}Learn where food really comes from.</li><li>${icon('camera')}A reason to go outside every day.</li></ul>
        <div class="kids-pics">${['peas', 'carrot', 'strawberry'].map((id) => { const x = ph(id, id === 'strawberry' ? 'flower' : 'harvest'); return `<figure>${img(x, '')}</figure>`; }).join('')}</div>
      </div>
      <div class="facts card rv" style="--d:160ms">
        <h3>For grown-ups</h3>
        <p class="fact">${icon('truck')}<b>19%</b><span>of food-system emissions come from moving food around. ${src(FOODMILES?.sources?.[0], 'Li et al. 2022, Nature Food')}</span></p>
        <p class="fact">${icon('flower')}<b>75%</b><span>of food crop types need pollinators. A flowering pot helps. ${src(POLLEN?.sources?.[0], 'FAO')}</span></p>
        ${SPIN?.healthier_pct ? `<p class="fact">${icon('drop')}<b>${SPIN.healthier_pct}%</b><span>of spinach’s ${esc(SPIN.nutrient)} can be lost in storage. Yours goes pot to plate. ${src(SPIN.sources?.[0], '')}</span></p>` : ''}
      </div>
    </div>
    <div class="miles" id="miles">
      <div class="miles-pick rv">
        <h3>How far did the shop one travel?</h3>
        <p>Pick where you live and a plant. We show where most shop ones come from, using cited trade data.</p>
        <div class="pickers">
          <label class="sel"><span class="vh">Where you live</span><select id="r-region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
          <label class="sel"><span class="vh">Plant</span><select id="r-plant">${P.filter((p) => Object.keys(p.origins || {}).length).map((p) => `<option value="${p.id}"${p.id === 'tomato' ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        </div>
      </div>
      <div class="receipt card rv" style="--d:100ms" aria-live="polite">
        <div class="lcd milesl"><span class="mnum" id="r-total"></span><b id="r-unit">miles</b></div>
        <p class="mcap" id="r-caption"></p>
        <div class="rows" id="r-rows"></div>
        <p class="cite" id="r-cite"></p>
      </div>
    </div>
  </div>
</section>

<section class="seasons" aria-labelledby="seasons-title">
  <h2 class="vh" id="seasons-title">Something to sow every season</h2>
  ${SEASONS.map((s, i) => {
    const list = P.filter((p) => sows(p, s.months) && photosOf(p.id).length);
    const pics = list.slice(0, 3).map((p) => ph(p.id, 'harvest') || ph(p.id));
    return `<div class="panel ombre" data-tone="${s.tone}" data-i="${i}">
      <div class="pw"><h2>${s.name}</h2><p>${s.note}</p><ul>${list.slice(0, 8).map((p) => `<li><a href="${APP}#/plant/${p.id}">${esc(p.name)}</a></li>`).join('')}</ul></div>
      <div class="spics">${pics.map((x, k) => `<figure>${img(x, list[k].name, { attr: 'data-src', lazy: false })}</figure>`).join('')}</div>
    </div>`;
  }).join('')}
</section>

<section class="sec trees ombre" data-tone="sky-mint" id="trees" aria-labelledby="trees-title">
  <div class="wrap trees-grid">
    <div>
      <h2 class="rv" id="trees-title">Plant a tree, too</h2>
      <p class="rv" style="--d:80ms">Grow an apple, plum or cherry for fruit, or a native oak, birch, rowan, beech or Scots pine for birds and shade.</p>
      <p class="fact co2 rv" style="--d:140ms">${icon('tree')}<b>22 kg</b><span>of CO2 taken up in a year by one mature tree${EEA ? `, says the <a href="${esc(EEA.url)}" rel="noopener">European Environment Agency</a>` : ''}.</span></p>
      <ul class="tchips rv" style="--d:180ms" aria-label="Trees in the app">${[...TREES.filter((p) => NATIVE.includes(p.id)), ...TREES.filter((p) => !NATIVE.includes(p.id))].slice(0, 9).map((p) => `<li><a href="${APP}#/plant/${p.id}">${esc(p.name)}</a></li>`).join('')}</ul>
      <a class="btn rv" style="--d:220ms" href="${APP}#/find/tree">Find a tree to plant</a>
    </div>
    <div class="tree-pics">
      ${[['oak', 'tree', 'An oak tree in a field'], ['rowan', 'harvest', 'Red rowan berries'], ['birch', 'tree', 'A birch tree with white bark']].map(([id, k, a], i) => `<figure class="rv" style="--d:${80 + i * 80}ms">${img(ph(id, k), a)}</figure>`).join('')}
    </div>
  </div>
</section>

<section class="cta" aria-labelledby="cta-title">
  <div class="inner">
    <div class="ctapip rv">${pip(240)}</div>
    <h2 class="rv" id="cta-title">Plant your first pot today</h2>
    <p class="rv" style="--d:80ms">Free, for every age. Pip is waiting.</p>
    <form class="blank rv" style="--d:140ms" id="blank" autocomplete="off">
      <label class="vh" for="blank-in">What are you planting?</label>
      <input id="blank-in" list="plant-names" placeholder="I’m planting… tomatoes" enterkeyhint="go">
      <button class="btn" type="submit">Start</button>
      <datalist id="plant-names">${P.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>
    </form>
  </div>
</section>

<footer class="foot">
  <div class="wrap">
    <a class="mark big" href="#top"><img src="icons/icon.svg" alt="" width="56" height="56">Zero Mile</a>
    <nav aria-label="Footer"><a href="${APP}">Open the app</a><a href="${APP}#/find">All ${P.length} plants</a><a href="${APP}#/sources">Sources and method</a></nav>
    <p>Every number comes from a cited source (USDA, Our World in Data, UK DESNZ, UN Comtrade, RHS, FAO, EEA). App screens are real.</p>
    <details class="credits"><summary>Photo credits</summary><ul id="credits"></ul></details>
  </div>
</footer>`;

// ---------- entrances: heading, then text, then picture, once each ----------
if (!RM) {
  document.documentElement.classList.add('rv-on');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach((el) => io.observe(el));
}
addEventListener('scroll', () => $('.nav').classList.toggle('solid', scrollY > 40), { passive: true });

// WCAG 2.2.2: anything that moves for more than five seconds can be paused
let paused = false;
try { paused = localStorage.getItem('zm-motion') === 'off'; } catch {}
function applyMotion() {
  document.documentElement.classList.toggle('still', paused);
  $('#motion').setAttribute('aria-pressed', paused); $('#motion').textContent = paused ? 'Play motion' : 'Pause motion';
}
$('#motion').addEventListener('click', () => { paused = !paused; try { localStorage.setItem('zm-motion', paused ? 'off' : 'on'); } catch {} applyMotion(); });
applyMotion();
// the ombre fields drift only while their section is on screen
{
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('on', e.isIntersecting)), { rootMargin: '10% 0px' });
  $$('.ombre').forEach((el) => io.observe(el));
}

// ---------- gentle scroll parallax (hero, app phones) ----------
{
  const items = $$('[data-par]').map((el) => ({ el, k: +el.dataset.par, box: el.closest('section') }));
  let raf = 0;
  const run = () => {
    raf = 0;
    const H = innerHeight;
    for (const it of items) {
      const r = it.box.getBoundingClientRect();
      if (r.bottom < -100 || r.top > H + 100) continue;
      const off = it.box.id === 'top' ? -r.top : (r.top + r.height / 2 - H / 2);
      it.el.style.transform = `translate3d(0,${(off * it.k).toFixed(1)}px,0)`;
    }
  };
  if (!RM) { addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(run); }, { passive: true }); addEventListener('resize', run); run(); }
}

// ---------- how the streak works: the whole screen becomes Pip's LCD; each step lights up in pixel steps ----------
{
  const sec = $('#streak');
  const steps = $$('.step', sec), intro = $('.intro', sec);
  const n = steps.length, A = (i) => .1 + i * .19; // step i is fully lit at A(i)
  const q = (a) => Math.round(a * 4) / 4; // LCD moves in pixel steps, not smooth fades
  const xp = $('.xpnum', sec), st = $('.stnum', sec), bar = $$('.pxbar i', sec), dts = $$('.pxdots i', sec), badge = $('.badge', sec);
  let lastXp = -1, lastSt = -1;
  const opts = {
    height: 520,
    draw(f) {
      fade(intro, q(1 - seg(f, .015, .07)), 0);
      for (let i = 0; i < n; i++) {
        const inA = seg(f, A(i) - .03, A(i));
        const outA = i === n - 1 ? 0 : seg(f, A(i + 1) - .06, A(i + 1) - .035);
        fade(steps[i], q(inA * (1 - outA)), 0);
      }
      // what ticks while each step holds
      const v = Math.round(10 * seg(f, A(1) - .01, A(1) + .05));
      if (v !== lastXp) { lastXp = v; xp.innerHTML = pxNum(`+${v}`, 120); }
      const lit = Math.round(12 * seg(f, A(1) - .01, A(1) + .06)); bar.forEach((b, k) => b.classList.toggle('on', k < lit));
      const d = Math.max(1, Math.round(7 * seg(f, A(2) - .01, A(2) + .05)));
      if (d !== lastSt) { lastSt = d; st.innerHTML = pxNum(d, 140); dts.forEach((b, k) => b.classList.toggle('on', k < d)); }
      badge.classList.toggle('lit', f > A(3) + .01); badge.classList.toggle('gold', f > A(3) + .05);
    },
    still() {
      sec.classList.add('still-list');
      steps.forEach((s) => fade(s, 1, 0)); fade(intro, 1, 0);
      xp.innerHTML = pxNum('+10', 120); st.innerHTML = pxNum(7, 140); bar.forEach((b) => b.classList.add('on')); dts.forEach((b) => b.classList.add('on')); badge.classList.add('lit', 'gold');
    },
  };
  mountScene(sec, opts);
}

// ---------- fly-through: one real harvest photo per plant, ending on a tomato ----------
{
  const field = $('#tunnel-field');
  const pool = P.map((p) => photosOf(p.id, 'harvest')[0] || photosOf(p.id)[0]).filter(Boolean);
  pool.forEach((x) => used.set(x.file, x));
  const rnd = seeded(11);
  const small = innerWidth < 700;
  const n = Math.min(small ? 40 : 56, pool.length);
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = pool[(i * 7) % pool.length];
    const a = i * 2.39996 + (rnd() - .5) * .5, r = .32 + Math.sqrt(rnd()) * .6;
    items.push({ x, px: Math.cos(a) * r, py: Math.sin(a) * r * .8, z: .55 + i * (small ? .13 : .1), rot: (rnd() - .5) * 10 });
  }
  const end = { x: ph('tomato', 'harvest'), px: 0, py: -.06, z: items[items.length - 1].z + .5, rot: -2 };
  items.push(end);
  field.innerHTML = items.map((it, i) => `<div class="it" style="z-index:${1000 - i}"><figure style="rotate:${it.rot.toFixed(1)}deg"><img data-src="${real(it.x.file)}" alt="" width="${it.x.w}" height="${it.x.h}"></figure></div>`).join('');
  const nodes = $$('.it', field);
  items.forEach((it, i) => { it.node = nodes[i]; });
  const intro = $('.tunnel .intro'), cap = $('#tunnel-cap');
  let W = 1, H = 1, w = 200, top = 0, rIntro = null, rCap = null;
  const box = (el) => ({ x0: el.offsetLeft - 10, y0: el.offsetTop - 10, x1: el.offsetLeft + el.offsetWidth + 10, y1: el.offsetTop + el.offsetHeight + 10 });
  const gap = (r, x0, y0, x1, y1) => Math.max(r.x0 - x1, x0 - r.x1, r.y0 - y1, y0 - r.y1);
  const opts = {
    height: 320,
    layout(w0, h0) {
      W = w0; H = h0; w = Math.min(W, H) * (W < 700 ? .42 : .26); nodes.forEach((nd) => { nd.style.width = w + 'px'; });
      top = $('.nav').offsetHeight; rIntro = box(intro); rCap = box(cap);
    },
    draw(f) {
      const t = cosEase(seg(f, .04, .84));
      const camZ = -.35 + (end.z - .62 + .35) * t;
      const aIntro = 1 - seg(f, .02, .09), aCap = seg(f, .86, .96);
      const sx = W > H ? H * 1.3 : W * 1.05, sy = W > H ? H : Math.min(H, W * 1.5);
      for (const it of items) {
        const d = it.z - camZ;
        if (d <= .12) { hide(it.node); continue; }
        const k = 1 / d, s = w * k, pad = s * .08;
        const x = W / 2 + it.px * sx * k - s / 2, y = H / 2 + it.py * sy * k - s / 2;
        let o = sm(clamp((4.2 - d) / 1.4)) * sm(clamp((d - .12) / .3));
        // never cut off: a photo has faded away before it reaches an edge of the screen or the nav
        const x0 = x + pad, y0 = y + pad, x1 = x + s - pad, y1 = y + s - pad;
        o *= sm(clamp(Math.min(x0, W - x1, y0 - top, H - y1) / Math.max(24, s * .12)));
        if (aIntro > .01) o *= 1 - Math.min(1, aIntro * 3) * (1 - sm(clamp(gap(rIntro, x0, y0, x1, y1) / 24)));
        if (aCap > .01) o *= 1 - Math.min(1, aCap * 3) * (1 - sm(clamp(gap(rCap, x0, y0, x1, y1) / 24)));
        if (o < .004) { hide(it.node); continue; }
        put(it.node, x, y, k, o);
      }
      fade(intro, aIntro);
      fade(cap, aCap);
    },
    still() { opts.draw(.3); fade(cap, 1); },
  };
  mountScene($('#plants'), opts);
}

// ---------- seasons: full-screen colour wipes ----------
{
  const sec = $('.seasons');
  const panels = $$('.panel', sec);
  mountScene(sec, {
    height: 400,
    draw(f) {
      const n = panels.length, span = .9 / n;
      panels.forEach((p, i) => {
        if (i === 0) { p.style.transform = 'none'; p.style.zIndex = 1; p._x = 1; return; }
        const x = easeIO(seg(f, .05 + (i - .78) * span, .05 + i * span));
        p.style.transform = `translate3d(${((1 - x) * 100).toFixed(2)}%,0,0)`;
        p.style.zIndex = i + 1; p._x = x;
        p.style.visibility = x <= 0 ? 'hidden' : 'visible';
      });
      panels.forEach((p, i) => {
        const next = i < panels.length - 1 ? panels[i + 1]._x || 0 : 0;
        // words fade in as their colour settles and out as the next one arrives, so no text ever slides past the screen edge
        const op = Math.min(sm(clamp((p._x - .8) / .2)), 1 - Math.min(1, next * 5));
        p.firstElementChild.style.opacity = op.toFixed(3);
        p.firstElementChild.style.visibility = op < .02 ? 'hidden' : '';
        p.style.visibility = p._x <= 0 || next >= 1 ? 'hidden' : 'visible';
      });
    },
    still() { panels.forEach((p) => { p.style.position = 'relative'; p.style.transform = 'none'; p.style.minHeight = '100svh'; }); },
  });
}

// ---------- food-miles receipt: the miles on a small LCD ----------
const rRegion = $('#r-region'), rPlant = $('#r-plant');
let countRaf = 0;
const showMiles = (v) => { $('#r-total').innerHTML = pxNum(v, 64); };
function countTo(to) {
  cancelAnimationFrame(countRaf);
  if (RM || paused) { showMiles(to); return; }
  const t0 = performance.now(); let last = -1;
  const step = (now) => { const k = Math.min(1, (now - t0) / 900); const v = Math.round(to * (1 - (1 - k) ** 3)); if (v !== last) { last = v; showMiles(v); } if (k < 1) countRaf = requestAnimationFrame(step); };
  countRaf = requestAnimationFrame(step);
}
function receipt() {
  const p = plantById(rPlant.value), reg = rRegion.value;
  state.region = reg; save();
  const tr = trip(p, reg);
  if (!tr) { showMiles(0); $('#r-caption').textContent = 'No reliable source yet.'; $('#r-rows').innerHTML = ''; $('#r-cite').textContent = ''; return; }
  const farm = p.carbon?.kg_co2e_per_kg ?? 0, total = farm + tr.co2Transport;
  countTo(Math.round(tr.crowMi));
  $('#r-caption').textContent = `Miles from ${tr.o.origin_place || tr.o.origin_country} as the crow flies. Yours: 0.`;
  $('#r-rows').innerHTML = `
    <p><span>Comes from</span><span>${esc(tr.o.origin_country)}</span></p>
    <p><span>Travels by</span><span>${esc(tr.o.transport_mode.replace('+', ' and '))}, about ${fmt(tr.routeKm)} km</span></p>
    <p><span>Carbon to grow a kilo</span><span>${fmt(farm, 2)} kg</span></p>
    <p><span>Carbon to bring it to you</span><span>${fmt(tr.co2Transport, 2)} kg</span></p>
    <p class="total"><span>Shop kilo, in CO2e</span><span>${fmt(total, 2)} kg</span></p>`;
  $('#r-cite').innerHTML = `${tr.o.confidence === 'low' ? 'Low-confidence source. ' : ''}${tr.o.year ? `Trade data ${tr.o.year}. ` : ''}<a href="${APP}#/sources">How we worked this out</a>`;
}
rRegion.addEventListener('change', receipt); rPlant.addEventListener('change', receipt);
receipt();

// ---------- call to action ----------
$('#blank').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#blank-in').value.replace(/^i[’']?m planting…?\s*/i, '').trim().toLowerCase();
  if (!q) { location.href = APP; return; }
  const hit = P.find((p) => p.name.toLowerCase() === q || p.id === q || p.name.toLowerCase().startsWith(q.replace(/e?s$/, '')) || (p.aliases || []).includes(q));
  location.href = hit ? `${APP}#/plant/${hit.id}` : `${APP}#/find/${encodeURIComponent(q)}`;
});
// every photo used on the page, credited
$('#credits').innerHTML = [...used.values()].map((x) => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.title)}</a>, ${esc(x.author)}, <a href="${esc(x.licenseUrl)}" rel="noopener">${esc(x.license)}</a>, via ${esc(x.via)}</li>`).join('');
document.documentElement.classList.add('ready');
