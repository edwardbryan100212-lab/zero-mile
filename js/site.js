// Zero Mile ad site: hero seed packet, pinned growth story, fly-through of every plant,
// the daily ritual, season colour wipes, the food-miles receipt and the call to action.
import { $, $$, esc, fmt, data, plantById, trip, state, save, rise } from './core.js?v=3';
import { mountScene, seg, sm, easeIO, cosEase, seeded, put, hide, fade, clamp, RM } from './scene.js?v=3';
import { ditherBg } from './ditherbg.js?v=3';

const APP = 'app/';
const reduce = RM;
const D = await data();
const P = D.plants;
const thumb = (id) => `img/plants/${id}.webp`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = [
  { name: 'Spring', months: [3, 4, 5], bg: '#e3f1d3', ink: '#12301f', note: 'Seeds go in as the soil warms. The busiest, happiest season.' },
  { name: 'Summer', months: [6, 7, 8], bg: '#f6c935', ink: '#12301f', note: 'Long days. Sow quick crops and pick something almost every day.' },
  { name: 'Autumn', months: [9, 10, 11], bg: '#e8742a', ink: '#ffffff', note: 'Plant garlic and fruit bushes, and bring the last tomatoes in.' },
  { name: 'Winter', months: [12, 1, 2], bg: '#1d4a2b', ink: '#ffffff', note: 'Plant bare-root trees and plan next year’s windowsill.' },
];
const sows = (p, ms) => [...(p.grow?.sow_months_north || []), ...(p.grow?.plant_months_north || [])].some((m) => ms.includes(m));

const main = $('#main');
main.innerHTML = `
<section class="hero" aria-labelledby="hero-title">
  <img class="hero-photo" src="img/hero-sunny.png" alt="A sunny back garden with raised beds of tomatoes, lettuce and strawberries" width="800" height="533" fetchpriority="high">
  <article class="packet">
    <div class="packet-window" id="hero-window">
      <img class="still" src="${thumb('tomato')}" alt="" width="420" height="420">
      <div class="stage3d" id="hero-stage"></div>
    </div>
    <div class="packet-body">
      <h1 id="hero-title">Zero Mile</h1>
      <p class="lead">Grow it, snap it, eat it. Grow food at home, take a photo each day, and see how far the shop one travelled.</p>
      <div class="chips" role="group" aria-label="See a plant fully grown">
        ${['tomato', 'strawberry', 'carrot', 'apple'].filter(plantById).map((id, i) => `<button class="chip" data-hero="${id}" aria-pressed="${i === 0}">${esc(plantById(id).name)}</button>`).join('')}
      </div>
      <div class="packet-actions">
        <a class="btn btn-accent" href="${APP}">Start growing, it’s free</a>
        <a class="link" href="#story">See how it grows</a>
      </div>
    </div>
  </article>
</section>

<section class="story" id="story" aria-labelledby="story-title">
  <div class="story-pin" id="story-pin">
    <div class="story-stage"><div class="stage3d" id="story-stage"></div></div>
    <div class="story-copy">
      <h2 id="story-title">From seed to supper</h2>
      <div class="steps">${[
        ['Day 1', 'Push a seed into damp compost. That’s it, you’re a grower.'],
        ['Day 10', 'Two tiny leaves pop up. Snap a photo and your growth journal begins.'],
        ['Day 45', 'Yellow flowers open. Bees drop by, and each flower can become a tomato.'],
        ['Day 75', 'Red, warm and sweet. Picked a minute ago, this tomato travelled zero miles.'],
      ].map(([d, t], i) => `<div class="step${i === 0 ? ' on' : ''}"><b>${d}</b><p>${t}</p></div>`).join('')}</div>
    </div>
    <div class="story-bar" aria-hidden="true"><i id="story-bar"></i></div>
  </div>
</section>

<section class="tunnel" id="plants" aria-labelledby="tunnel-title">
  <div class="field" id="tunnel-field"></div>
  <div class="intro"><h2 id="tunnel-title">${P.length} plants to grow</h2><p>From windowsill basil to a 25-metre oak. Every one in 3D.</p></div>
  <div class="cap" id="tunnel-cap"><h3>Which one is yours?</h3><p>Pick a plant and see it fully grown.</p><a class="btn btn-accent" href="${APP}#/find">Find my plant</a></div>
</section>

<section class="sec ritual" aria-labelledby="ritual-title">
  <div class="wrap grid">
    <div>
      <h2 class="sec-head rise" id="ritual-title">Two minutes a day</h2>
      <p class="sec-note rise" style="--d:80ms">Snap your plant each day. Zero Mile looks at the leaves right on your phone and your robot pot tells you how it feels.</p>
      <div class="ritual-media rise" style="--d:160ms">
        <video src="video/sprout.mp4" poster="video/sprout-poster.jpg" width="480" height="480" muted loop playsinline preload="metadata" ${reduce ? '' : 'autoplay'} aria-label="Time-lapse of a tomato seedling opening its first leaves (AI illustration)"></video>
        <img class="px" src="img/px/herbs.png" alt="Basil, mint and chives on a windowsill, in pixel blocks" width="100" height="133" loading="lazy">
      </div>
    </div>
    <div class="app-peek rise" style="--d:120ms" aria-label="A preview of the app">
      <div class="peek-top"><span>Tomato · day 12</span><span class="peek-face" aria-hidden="true">[^ ‿ ^]</span></div>
      <div class="peek-streak"><b>12</b><span>days in your<br>growth journal</span></div>
      <div class="peek-week" aria-hidden="true">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<i class="${i < 6 ? 'done' : 'now'}">${d}</i>`).join('')}</div>
      <p class="peek-note"><b>Looking good, 86/100.</b> Mostly fresh green leaves. Turn the pot toward the light so it grows straight.</p>
      <a class="btn btn-accent" href="${APP}">Open the app</a>
    </div>
  </div>
</section>

<section class="seasons" aria-labelledby="seasons-title">
  <h2 class="vh" id="seasons-title">Something to sow every season</h2>
  ${SEASONS.map((s, i) => {
    const list = P.filter((p) => sows(p, s.months));
    const pics = list.slice(0, 3);
    return `<div class="panel" data-i="${i}" style="background:${s.bg};color:${s.ink}">
      <div><h2>${s.name}</h2><p>${s.note}</p><ul>${list.slice(0, 9).map((p) => `<li><a href="${APP}#/plant/${p.id}" style="text-decoration:none;color:#12301f">${esc(p.name)}</a></li>`).join('')}</ul></div>
      <div class="plants">${pics.map((p) => `<img data-src="${thumb(p.id)}" alt="${esc(p.name)}, fully grown" width="420" height="420">`).join('')}</div>
    </div>`;
  }).join('')}
</section>

<section class="sec miles" id="miles" aria-labelledby="miles-title">
  <div class="wrap grid">
    <div>
      <h2 class="sec-head rise" id="miles-title">How far did the shop one travel?</h2>
      <p class="sec-note rise" style="--d:80ms">Pick where you live and a plant. We show where most of it in your shops comes from.</p>
      <div class="pickers rise" style="--d:140ms">
        <label class="select"><span class="vh">Where you live</span><select id="r-region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
        <label class="select"><span class="vh">Plant</span><select id="r-plant">${P.filter((p) => Object.keys(p.origins || {}).length).map((p) => `<option value="${p.id}"${p.id === 'tomato' ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      </div>
      <div class="versus rise" style="--d:200ms">
        <figure><img class="px" src="img/px/lorry.png" alt="A refrigerated lorry on a motorway, in pixel blocks" width="200" height="133" loading="lazy"><figcaption id="v-shop">Shop one</figcaption></figure>
        <span class="vs" aria-hidden="true">vs</span>
        <figure><img class="px" src="img/px/pot.png" alt="A seedling in a pot, in pixel blocks" width="60" height="60" loading="lazy"><figcaption>Yours: 0 miles</figcaption></figure>
      </div>
      <div class="big" aria-live="polite"><b id="r-total">0</b><span id="r-caption"></span></div>
    </div>
    <div class="slip rise" style="--d:120ms" id="r-slip"></div>
  </div>
</section>

<section class="sec cta" aria-labelledby="cta-title">
  <div class="wrap inner">
    <h2 class="vh" id="cta-title">Start growing</h2>
    <form class="blank" id="blank" autocomplete="off">
      <label for="blank-in">Today I’m planting</label> <input id="blank-in" list="plant-names" placeholder="tomatoes" enterkeyhint="go"> <button type="submit">Go</button>
      <datalist id="plant-names">${P.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>
    </form>
    <p class="after">Free for every age, on phone and computer. Your photos stay on your device.</p>
  </div>
</section>

<footer class="foot" aria-labelledby="foot-name">
  <p class="foot-name" id="foot-name">Zero Mile</p>
  <div class="foot-row">
    <nav aria-label="Footer"><a href="${APP}">Open the app</a><a href="${APP}#/find">Find a plant</a><a href="${APP}#/sources">Sources and method</a></nav>
    <div><p>Every number comes from a cited source: USDA, Our World in Data, UK DESNZ, UN Comtrade, RHS and more.</p><p style="margin-top:12px">Pictures are AI illustrations made with Comfy and printed in Ditherlab, not photos of real farms. The 3D plants are drawn in code.</p></div>
    <img class="px" src="img/px/strawberry.png" alt="Strawberries in a basket, in pixel blocks" width="100" height="100" loading="lazy">
  </div>
  <div class="foot-legal"><span>Zero Mile, 2026</span><a href="#main" id="to-top">Back to top</a></div>
</footer>`;

rise(main);
addEventListener('scroll', () => $('.nav').classList.toggle('solid', scrollY > 40), { passive: true });
$('#to-top').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' }); });

// ---------- hero: the still shows at once, the live model swaps in when ready ----------
const { createViewer } = await import('./viewer.js?v=3');
const heroWin = $('#hero-window');
const hero = createViewer($('#hero-stage'), { controls: true });
hero.setPlant('tomato', 1);
requestAnimationFrame(() => heroWin.classList.add('live'));
setTimeout(() => hero.setSpin(false), 9000);
$$('[data-hero]').forEach((b) => b.addEventListener('click', () => {
  $$('[data-hero]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  hero.setPlant(b.dataset.hero, 1);
}));

// ---------- the growth story: keyframes are built once, scroll only switches them ----------
const { buildPlant } = await import('./plants3d.js');
const pin = $('#story-pin');
const bgStory = ditherBg(pin, { mode: 'warp', colors: ['#cfe8b8', '#d9eec7', '#e3f1d3', '#eef7e6', '#ffffff'], block: 7 });
const sv = createViewer($('#story-stage'), { spin: !reduce });
sv.setPlant('tomato', 1);
const full = sv.stage.children.find((c) => c.type === 'Group' && c.children.length > 2) || sv.stage.children[0];
full.visible = false;
const STAGES = [.03, .1, .16, .25, .36, .48, .6, .7, .8, .9, 1];
const frames = STAGES.map((t) => { const g = buildPlant('tomato', t); g.visible = false; sv.stage.add(g); return g; });
let shown = -1;
const stepEls = $$('.step'), bar = $('#story-bar'), story = $('#story');
function drawStory(x) {
  const i = Math.min(frames.length - 1, Math.round(x * 1.05 * (frames.length - 1)));
  if (i !== shown) { if (shown >= 0) frames[shown].visible = false; frames[i].visible = true; shown = i; sv.kick(); }
  const step = Math.min(3, Math.floor(x * 4.0001));
  stepEls.forEach((e, k) => e.classList.toggle('on', k === step));
  bar.style.transform = `scaleX(${x.toFixed(3)})`;
  bgStory.set({ g: .3 + x * .6 });
}
let tgt = 0, cur = 0, raf = 0;
const prog = () => { const r = story.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
function tick() { raf = 0; cur += (tgt - cur) * .16; if (Math.abs(tgt - cur) < .0005) cur = tgt; drawStory(cur); if (cur !== tgt) raf = requestAnimationFrame(tick); }
if (reduce) { drawStory(1); stepEls.forEach((e) => e.classList.add('on')); }
else { addEventListener('scroll', () => { tgt = prog(); if (!raf) raf = requestAnimationFrame(tick); }, { passive: true }); tgt = prog(); drawStory(tgt); }

// ---------- fly-through: every plant, on a loose tunnel, ending on the tomato ----------
{
  const field = $('#tunnel-field');
  const ids = P.map((p) => p.id);
  const rnd = seeded(11);
  const n = Math.min(innerWidth < 700 ? 34 : 56, ids.length * 3);
  const items = [];
  for (let i = 0; i < n; i++) {
    const id = ids[i % ids.length];
    const a = i * 2.39996 + (rnd() - .5) * .5, r = .32 + Math.sqrt(rnd()) * .62;
    items.push({ id, x: Math.cos(a) * r, y: Math.sin(a) * r * .8, z: .55 + i * (innerWidth < 700 ? .13 : .1) });
  }
  const end = { id: 'tomato', x: 0, y: -.04, z: items[items.length - 1].z + .5, end: true };
  items.push(end);
  field.innerHTML = items.map((it, i) => `<div class="it" style="z-index:${1000 - i}"><img data-src="${thumb(it.id)}" alt="" width="420" height="420"></div>`).join('');
  const nodes = $$('.it', field);
  items.forEach((it, i) => { it.node = nodes[i]; });
  const intro = $('.tunnel .intro'), cap = $('#tunnel-cap');
  let W = 1, H = 1, w = 220;
  const opts = {
    height: 320,
    layout(w0, h0) { W = w0; H = h0; w = Math.min(W, H) * (W < 700 ? .72 : .46); nodes.forEach((n) => { n.style.width = w + 'px'; }); },
    draw(f) {
      const t = cosEase(seg(f, .04, .84));
      const camZ = -.35 + (end.z - .55 + .35) * t;
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
  const sc = mountScene($('#plants'), opts);
  ditherBg(sc.stage, { mode: 'mesh', colors: ['#d9eec7', '#e3f1d3', '#eef7e6', '#f7fbf2', '#ffffff'], block: 8 });
}

// ---------- seasons: full-bleed colour wipes ----------
{
  const sec = $('.seasons');
  const panels = $$('.panel', sec);
  mountScene(sec, {
    height: 420,
    draw(f) {
      const n = panels.length, span = .9 / n;
      panels.forEach((p, i) => {
        if (i === 0) { p.style.transform = 'none'; p.style.zIndex = 1; return; }
        const x = easeIO(seg(f, .05 + (i - .78) * span, .05 + i * span));
        p.style.transform = `translateX(${((1 - x) * 100).toFixed(2)}%)`;
        p.style.zIndex = i + 1;
        p.style.visibility = x <= 0 ? 'hidden' : 'visible';
      });
    },
    still() { panels.forEach((p) => { p.style.position = 'relative'; p.style.transform = 'none'; p.style.minHeight = '100svh'; }); },
  });
}

// ---------- food-miles receipt with a counting total ----------
const rRegion = $('#r-region'), rPlant = $('#r-plant');
let countRaf = 0;
function countTo(el, to, suffix) {
  cancelAnimationFrame(countRaf);
  if (reduce) { el.textContent = fmt(to) + suffix; return; }
  const from = parseInt(el.textContent.replace(/\D/g, '')) || 0, t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - k) ** 3))) + suffix; if (k < 1) countRaf = requestAnimationFrame(step); };
  countRaf = requestAnimationFrame(step);
}
function receipt() {
  const p = plantById(rPlant.value), reg = rRegion.value;
  state.region = reg; save();
  const tr = trip(p, reg), slip = $('#r-slip');
  if (!tr) { $('#r-total').textContent = '—'; $('#r-caption').textContent = `We couldn’t find a reliable source for where ${p.name.toLowerCase()} in ${D.regions[reg].name} comes from yet.`; slip.innerHTML = '<h3>No receipt yet</h3><p>Try another plant.</p>'; return; }
  const farm = p.carbon?.kg_co2e_per_kg ?? 0, total = farm + tr.co2Transport;
  countTo($('#r-total'), Math.round(tr.crowMi), ' mi');
  $('#v-shop').textContent = `Shop one: ${fmt(tr.crowMi)} miles`;
  $('#r-caption').textContent = `as the crow flies from ${tr.o.origin_place || tr.o.origin_country} to ${tr.reg.dest.name}. The one on your windowsill: 0 miles.`;
  const hv = p.home_vs_shop;
  const health = hv?.verdict === 'more' && hv.healthier_pct ? `Shop ${p.name.toLowerCase()} can lose up to ${hv.healthier_pct}% of its ${hv.nutrient} in storage` : 'About the same goodness as the shop one';
  slip.innerHTML = `
    <h3>The trip</h3>
    <p class="row"><span>From</span><i class="dots"></i><span>${esc(tr.o.origin_place ? tr.o.origin_place + ', ' : '')}${esc(tr.o.origin_country)}</span></p>
    <p class="row"><span>To</span><i class="dots"></i><span>${esc(tr.reg.dest.name.replace(/ \(.+\)/, ''))}</span></p>
    <p class="row"><span>Straight line</span><i class="dots"></i><span>${fmt(tr.crowKm)} km</span></p>
    <p class="row"><span>By ${esc(tr.o.transport_mode.replace('+', ' and '))}, about</span><i class="dots"></i><span>${fmt(tr.routeKm)} km</span></p>
    <h3>Carbon for one kilo</h3>
    <p class="row"><span>Growing it on a farm</span><i class="dots"></i><span>${fmt(farm, 2)} kg</span></p>
    <p class="row"><span>The trip to you</span><i class="dots"></i><span>${fmt(tr.co2Transport, 2)} kg</span></p>
    <h3>On your plate</h3>
    <p class="row"><span>Energy per 100 g</span><i class="dots"></i><span>${fmt(p.kcal_per_100g ?? 0)} kcal</span></p>
    <p class="row"><span>${esc(health)}</span></p>
    <p class="row total"><span>Shop kilo, in CO2e</span><i class="dots"></i><span>${fmt(total, 2)} kg</span></p>
    <p class="cite">${tr.o.confidence === 'low' ? 'Low-confidence source. ' : ''}${tr.o.year ? `Trade data ${tr.o.year}. ` : ''}<a href="${APP}#/sources">How we worked this out</a></p>`;
}
rRegion.addEventListener('change', receipt); rPlant.addEventListener('change', receipt);
receipt();

// ---------- call to action over drifting seeds ----------
ditherBg($('.cta'), { mode: 'seeds', colors: ['#c21a26', '#d0202c', '#e8432a', '#f6c935', '#fff3c4'], block: 8 });
$('#blank').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#blank-in').value.trim().toLowerCase();
  if (!q) { $('#blank-in').focus(); return; }
  const hit = P.find((p) => p.name.toLowerCase() === q || p.id === q || p.name.toLowerCase().startsWith(q.replace(/e?s$/, '')) || (p.aliases || []).includes(q));
  location.href = hit ? `${APP}#/plant/${hit.id}` : `${APP}#/find/${encodeURIComponent(q)}`;
});
