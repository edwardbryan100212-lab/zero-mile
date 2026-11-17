// Zero Mile ad site: a calm product page. Green fluted-glass hero with the app beside it, a fly-through of
// individual fruits, three working pieces of the app, season colour wipes, the food-miles receipt, and a CTA.
import { $, $$, esc, fmt, data, plantById, trip, state, save, rise } from './core.js?v=5';
import { mountScene, seg, sm, easeIO, cosEase, seeded, put, hide, fade, clamp, RM } from './scene.js?v=5';
import { fluted } from './fluted.js?v=5';
import { modelManifest } from './models.js?v=5';

const APP = 'app/';
const reduce = RM;
const D = await data();
const P = D.plants;
const MAN = (await modelManifest()) || {};
const real = (p) => !!MAN[p.id]?.harvest; // plants with a real downloaded model of their fruit
const fruit = (id) => `img/fruits/${id}.webp`;
const SEASONS = [
  { name: 'Spring', months: [3, 4, 5], bg: '#e6f2dc', note: 'Seeds go in as the soil warms. The busiest, happiest season.' },
  { name: 'Summer', months: [6, 7, 8], bg: '#fbeaa6', note: 'Long days. Sow quick crops and pick something almost every day.' },
  { name: 'Autumn', months: [9, 10, 11], bg: '#f7d9c9', note: 'Plant garlic and fruit bushes, and bring the last tomatoes in.' },
  { name: 'Winter', months: [12, 1, 2], bg: '#dde8e1', note: 'Plant bare-root trees and plan next year’s windowsill.' },
];
const sows = (p, ms) => [...(p.grow?.sow_months_north || []), ...(p.grow?.plant_months_north || [])].some((m) => ms.includes(m));
const pickFruit = (list, n) => [...list.filter(real), ...list.filter((p) => !real(p) && p.group !== 'herb')].slice(0, n);

const tr0 = trip(plantById('tomato'), state.region) || trip(plantById('tomato'), 'IE');
const main = $('#main');
main.innerHTML = `
<section class="hero" id="top" aria-labelledby="hero-title">
  <div class="hero-copy">
    <h1 id="hero-title">Grow it. Snap it. Eat it.</h1>
    <p class="lead">Zero Mile helps you grow food at home, one photo a day, and shows how far the shop one travelled.</p>
    <div class="actions"><a class="btn btn-green" href="${APP}">Start growing, it’s free</a><a class="btn btn-ghost" href="#how">See how it works</a></div>
    <p class="small">For every age. Works on phone, tablet and Mac. Your photos stay on your device.</p>
  </div>
  <div class="preview" aria-label="A preview of the app">
    <article class="card today float">
      <header><b>Tomato</b><span class="face" aria-hidden="true">[^ ‿ ^]</span></header>
      <div class="stagebox" id="hero-box"><img class="still" src="img/plants/tomato.webp" alt="" width="420" height="420"><div class="stage3d" id="hero-stage"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="pill">Day 12 · growing well</span><span style="color:var(--muted);font-size:.9375rem">12 photos</span></div>
      <div class="week" aria-hidden="true">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<i class="${i < 6 ? 'done' : 'now'}">${d}</i>`).join('')}</div>
      <a class="btn btn-small" href="${APP}#/snap">Take today’s photo</a>
    </article>
    <article class="card feedback float b" aria-hidden="true">
      <b>Looking good · 86</b>
      <div class="bar"><span>Green leaves</span><i><em style="width:86%"></em></i><span>86%</span></div>
      <div class="bar"><span>Yellowing</span><i><em class="y" style="width:6%"></em></i><span>6%</span></div>
      <div class="bar"><span>Dry edges</span><i><em class="b" style="width:4%"></em></i><span>4%</span></div>
    </article>
    <article class="card miles-chip float c" aria-hidden="true">
      <img src="${fruit('tomato')}" alt="" width="420" height="420">
      <div><b>${tr0 ? fmt(tr0.crowMi) : '448'} miles</b><span style="color:var(--muted);font-size:.9375rem">skipped by growing your own</span></div>
    </article>
  </div>
  <button class="motion-toggle" id="motion" type="button" aria-pressed="false">Pause motion</button>
</section>

<section class="tunnel" id="plants" aria-labelledby="tunnel-title">
  <div class="field" id="tunnel-field"></div>
  <div class="intro"><h2 id="tunnel-title">${P.length} plants to choose from</h2><p>Tomatoes, berries, herbs, beans, even an apple tree.</p></div>
  <div class="cap" id="tunnel-cap"><h3>What will you grow first?</h3><p>See any plant fully grown, in 3D.</p><a class="btn btn-green" href="${APP}#/find">Find my plant</a></div>
</section>

<section class="sec" id="how" aria-labelledby="how-title">
  <div class="wrap">
    <h2 class="sec-head rise" id="how-title">Two minutes a day</h2>
    <p class="sec-lead rise" style="--d:80ms">Easy enough for a six-year-old, useful enough for a lifelong gardener.</p>
    <div class="feature" style="margin-top:56px">
      <div>
        <h3 class="rise">A photo a day</h3>
        <p class="rise" style="--d:80ms">Snap your plant each morning. The app looks at the leaves right on your phone and tells you, in plain words, what it needs.</p>
        <ul class="rise" style="--d:140ms"><li>Spots yellow or dry leaves</li><li>Tips for that exact plant</li><li>Missed a day? Add it later, no streak shame</li></ul>
      </div>
      <div class="card panel-card rise" style="--d:120ms">
        <div class="diary"><figure><video src="video/sprout.mp4" poster="video/sprout-poster.jpg" width="200" height="200" muted loop playsinline preload="metadata" ${reduce ? '' : 'autoplay'} aria-label="Time-lapse of a seedling opening its first leaves"></video><figcaption>Day 1</figcaption></figure>${[['windowsill-herbs', 'Day 4'], ['balcony-pots', 'Day 9'], ['tomatoes-board', 'Day 75']].map(([f, d]) => `<figure><img src="img/${f}.png" alt="" width="200" height="200"><figcaption>${d}</figcaption></figure>`).join('')}</div>
        <p class="note"><b>Looking good.</b> Mostly fresh green leaves. Turn the pot toward the light so it grows straight.</p>
      </div>
    </div>
    <div class="feature flip">
      <div>
        <h3 class="rise">See it fully grown</h3>
        <p class="rise" style="--d:80ms">Every plant in 3D, from a seed to harvest day. Turn it with a finger and slide through its life.</p>
        <ul class="rise" style="--d:140ms"><li>How tall it gets and how much room it needs</li><li>When to sow where you live</li><li>The harvest, shown at real size</li></ul>
      </div>
      <div class="card panel-card rise" style="--d:120ms">
        <div class="stagebox viewer3d" id="grow-box"><div class="stage3d" id="grow-stage"></div></div>
        <div class="chips" role="group" aria-label="Choose a plant">${['tomato', 'strawberry', 'carrot', 'sunflower', 'apple'].filter(plantById).map((id, i) => `<button class="chip" data-grow="${id}" aria-pressed="${i === 0}">${esc(plantById(id).name)}</button>`).join('')}</div>
        <div class="slider"><label for="grow-t">Growth <span id="grow-name">Fully grown</span></label><input id="grow-t" type="range" min="0" max="4" step="1" value="4" aria-valuetext="Fully grown"></div>
      </div>
    </div>
    <div class="feature" id="miles">
      <div>
        <h3 class="rise">Know your food miles</h3>
        <p class="rise" style="--d:80ms">Pick where you live and a plant. We show where most of it in your shops comes from, using cited trade data.</p>
        <div class="pickers" style="margin-top:22px">
          <label class="select"><span class="vh">Where you live</span><select id="r-region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
          <label class="select"><span class="vh">Plant</span><select id="r-plant">${P.filter((p) => Object.keys(p.origins || {}).length).map((p) => `<option value="${p.id}"${p.id === 'tomato' ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        </div>
      </div>
      <div class="card panel-card" aria-live="polite">
        <div class="bigmiles"><b id="r-total">0</b><span id="r-caption"></span></div>
        <div class="rows" id="r-rows"></div>
        <p class="cite" id="r-cite"></p>
      </div>
    </div>
  </div>
</section>

<section class="seasons" aria-labelledby="seasons-title">
  <h2 class="vh" id="seasons-title">Something to sow every season</h2>
  ${SEASONS.map((s, i) => {
    const list = P.filter((p) => sows(p, s.months));
    return `<div class="panel" data-i="${i}" style="background:${s.bg}">
      <div><h2>${s.name}</h2><p>${s.note}</p><ul>${list.slice(0, 8).map((p) => `<li><a href="${APP}#/plant/${p.id}">${esc(p.name)}</a></li>`).join('')}</ul></div>
      <div class="fruits">${pickFruit(list, 3).map((p) => `<img data-src="${fruit(p.id)}" alt="${esc(p.name)}" width="420" height="420">`).join('')}</div>
    </div>`;
  }).join('')}
</section>

<section class="cta" aria-labelledby="cta-title">
  <div class="inner">
    <h2 id="cta-title">Plant your first pot today</h2>
    <p>Free, for every age. On your phone, tablet or Mac.</p>
    <form class="blank" id="blank" autocomplete="off">
      <label class="vh" for="blank-in">What are you planting?</label>
      <input id="blank-in" list="plant-names" placeholder="I’m planting… tomatoes" enterkeyhint="go">
      <button class="btn btn-green" type="submit">Start</button>
      <datalist id="plant-names">${P.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>
    </form>
  </div>
</section>

<footer class="foot">
  <div class="wrap">
    <div><a class="mark" href="#top"><img src="icons/icon.svg" alt="" width="28" height="28">Zero Mile</a><p style="margin-top:12px">Grow food at home and skip the food miles.</p></div>
    <nav aria-label="Footer"><a href="${APP}">Open the app</a><a href="${APP}#/find">All ${P.length} plants</a><a href="${APP}#/sources">Sources and method</a></nav>
    <p>Every number comes from a cited source (USDA, Our World in Data, UK DESNZ, UN Comtrade, RHS). Pictures are AI illustrations made with Comfy and printed in Ditherlab. 3D model credits are on the Sources page.</p>
  </div>
</footer>`;

rise(main);
addEventListener('scroll', () => $('.nav').classList.toggle('solid', scrollY > 40), { passive: true });
const bgs = [fluted($('.hero')), fluted($('.cta'), { hue: 100, sat: .7, bright: 1.15 })];
// WCAG 2.2.2: anything that moves for more than five seconds can be paused
let paused = false;
try { paused = localStorage.getItem('zm-motion') === 'off'; } catch {}
function applyMotion() {
  document.documentElement.classList.toggle('still', paused);
  $('#motion').setAttribute('aria-pressed', paused); $('#motion').textContent = paused ? 'Play motion' : 'Pause motion';
  bgs.forEach((b) => b.pause?.(paused));
}
$('#motion').addEventListener('click', () => { paused = !paused; try { localStorage.setItem('zm-motion', paused ? 'off' : 'on'); } catch {} applyMotion(); });
applyMotion();

// ---------- 3D: the app preview and the "see it fully grown" piece ----------
const [{ createViewer }, { loadModel }] = await Promise.all([import('./viewer.js?v=5'), import('./models.js?v=5')]);
async function showPlant(v, id, t = 1) {
  if (t >= 1) {
    const g = await loadModel(id, 'plant', { size: .9 });
    if (g) { [...v.stage.children].forEach((o) => v.stage.remove(o)); v.stage.add(g); v.frame(); v.kick(); return; }
  }
  v.setPlant(id, t);
}
const hero = createViewer($('#hero-stage'), { controls: false });
await showPlant(hero, 'tomato');
requestAnimationFrame(() => $('#hero-box').classList.add('live'));
setTimeout(() => hero.setSpin(false), 12000);

const grow = createViewer($('#grow-stage'), { controls: true });
let growId = 'tomato';
const STAGES = [[.04, 'Seed'], [.15, 'Sprout'], [.45, 'Young plant'], [.66, 'Flowering'], [1, 'Fully grown']];
await showPlant(grow, growId);
$$('[data-grow]').forEach((b) => b.addEventListener('click', () => {
  growId = b.dataset.grow; $$('[data-grow]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  $('#grow-t').value = 4; $('#grow-name').textContent = 'Fully grown'; showPlant(grow, growId);
}));
$('#grow-t').addEventListener('input', (e) => { const [t, n] = STAGES[+e.target.value]; $('#grow-name').textContent = n; e.target.setAttribute('aria-valuetext', n); showPlant(grow, growId, t); });

// ---------- fly-through: individual fruits on a loose tunnel, ending on a tomato ----------
{
  const field = $('#tunnel-field');
  const ids = P.filter(real).map((p) => p.id);
  if (!ids.length) ids.push(...P.map((p) => p.id));
  const rnd = seeded(11);
  const small = innerWidth < 700;
  const n = Math.min(small ? 36 : 60, ids.length * 2);
  const items = [];
  for (let i = 0; i < n; i++) {
    const id = ids[(i * 7) % ids.length];
    const a = i * 2.39996 + (rnd() - .5) * .5, r = .3 + Math.sqrt(rnd()) * .62;
    items.push({ id, x: Math.cos(a) * r, y: Math.sin(a) * r * .8, z: .55 + i * (small ? .12 : .09) });
  }
  const end = { id: 'tomato', x: 0, y: -.08, z: items[items.length - 1].z + .5 };
  items.push(end);
  field.innerHTML = items.map((it, i) => `<div class="it" style="z-index:${1000 - i}"><img data-src="${fruit(it.id)}" alt="" width="420" height="420"></div>`).join('');
  const nodes = $$('.it', field);
  items.forEach((it, i) => { it.node = nodes[i]; });
  const intro = $('.tunnel .intro'), cap = $('#tunnel-cap');
  let W = 1, H = 1, w = 200;
  const opts = {
    height: 320,
    layout(w0, h0) { W = w0; H = h0; w = Math.min(W, H) * (W < 700 ? .5 : .32); nodes.forEach((nd) => { nd.style.width = w + 'px'; }); },
    draw(f) {
      const t = cosEase(seg(f, .04, .84));
      const camZ = -.35 + (end.z - .8 + .35) * t;
      for (const it of items) {
        const d = it.z - camZ;
        if (d <= .12) { hide(it.node); continue; }
        const k = 1 / d;
        const o = sm(clamp((4.2 - d) / 1.4)) * sm(clamp((d - .12) / .3));
        put(it.node, W / 2 + it.x * H * k * (W / H > 1 ? 1.3 : 1) - w / 2 * k, H / 2 + it.y * H * k - w / 2 * k, k, o);
      }
      fade(intro, 1 - seg(f, .02, .12));
      fade(cap, seg(f, .86, .96));
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
        p.style.transform = `translateX(${((1 - x) * 100).toFixed(2)}%)`;
        p.style.zIndex = i + 1; p._x = x;
        p.style.visibility = x <= 0 ? 'hidden' : 'visible';
      });
      panels.forEach((p, i) => {
        const next = i < panels.length - 1 ? panels[i + 1]._x || 0 : 0;
        const op = 1 - Math.min(1, next * 5);
        p.firstElementChild.style.opacity = op.toFixed(3);
        p.firstElementChild.style.visibility = op < .02 ? 'hidden' : '';
        if (next >= 1) p.style.visibility = 'hidden';
      });
    },
    still() { panels.forEach((p) => { p.style.position = 'relative'; p.style.transform = 'none'; p.style.minHeight = '100svh'; }); },
  });
}

// ---------- food-miles receipt with a counting total ----------
const rRegion = $('#r-region'), rPlant = $('#r-plant');
let countRaf = 0;
function countTo(el, to) {
  cancelAnimationFrame(countRaf);
  if (reduce || paused) { el.textContent = fmt(to); return; }
  const from = parseInt(el.textContent.replace(/\D/g, '')) || 0, t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - k) ** 3))); if (k < 1) countRaf = requestAnimationFrame(step); };
  countRaf = requestAnimationFrame(step);
}
function receipt() {
  const p = plantById(rPlant.value), reg = rRegion.value;
  state.region = reg; save();
  const tr = trip(p, reg);
  if (!tr) { $('#r-total').textContent = '—'; $('#r-caption').textContent = 'no reliable source yet'; $('#r-rows').innerHTML = ''; $('#r-cite').textContent = ''; return; }
  const farm = p.carbon?.kg_co2e_per_kg ?? 0, total = farm + tr.co2Transport;
  countTo($('#r-total'), Math.round(tr.crowMi));
  $('#r-caption').textContent = `miles from ${tr.o.origin_place || tr.o.origin_country}. Yours: 0.`;
  const hv = p.home_vs_shop;
  const health = hv?.verdict === 'more' && hv.healthier_pct ? `Up to ${hv.healthier_pct}% of its ${hv.nutrient} lost in storage` : 'About the same goodness';
  $('#r-rows').innerHTML = `
    <p><span>Comes from</span><span>${esc(tr.o.origin_country)}</span></p>
    <p><span>Travels by</span><span>${esc(tr.o.transport_mode.replace('+', ' and '))}, about ${fmt(tr.routeKm)} km</span></p>
    <p><span>Carbon to grow a kilo</span><span>${fmt(farm, 2)} kg</span></p>
    <p><span>Carbon to bring it to you</span><span>${fmt(tr.co2Transport, 2)} kg</span></p>
    <p><span>Shop one vs yours</span><span>${esc(health)}</span></p>
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
