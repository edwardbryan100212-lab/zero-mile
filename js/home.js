// Home: the seed packet, the seed-to-supper story, the daily slip, the food-miles receipt, the menu of plants.
import { $, $$, esc, fmt, data, plantById, trip, state, save, rise } from './core.js?v=2';
import { GROW, CAN, LORRY, POT, LEAF_LINE } from './ascii.js?v=2';
import { STRAWBERRY } from './ascii-photos.js?v=2';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days` : p.group === 'tree' ? 'years' : 'a season'; };

export default async function home(main) {
  const D = await data();
  const region = state.region;
  const byGroup = (g) => D.plants.filter((p) => p.group === g);
  main.innerHTML = `
  <div>
  <section class="hero" aria-labelledby="hero-title">
    <img class="hero-photo" src="img/hero-sunny.png" alt="A sunny back garden with raised beds of tomatoes, lettuce and strawberries" width="1600" height="1066" fetchpriority="high">
    <article class="packet">
      <div class="packet-window">
        <div class="stage3d" id="hero-stage"></div>
        <p class="stage-hint" id="hero-name">Tomato, fully grown</p>
      </div>
      <div class="packet-body">
        <h1 id="hero-title">Zero Mile</h1>
        <p class="lead">Grow it, snap it, eat it. Grow food at home, take a photo each day, and watch your food miles drop to zero.</p>
        <div class="chips" role="group" aria-label="Choose a plant to see fully grown">
          ${['tomato', 'strawberry', 'carrot', 'apple'].map((id, i) => `<button class="chip" data-hero="${id}" aria-pressed="${i === 0}">${esc(plantById(id).name)}</button>`).join('')}
        </div>
        <dl class="facts">
          <div><dt>Free</dt><dd>&nbsp;for every age, on phone and computer</dd></div>
          <div><dt>Private</dt><dd>&nbsp;your photos never leave your device</dd></div>
        </dl>
        <div class="packet-actions">
          <a class="btn btn-accent" href="#/find">Pick a plant</a>
          <a class="link" href="#/garden">Open my garden</a>
        </div>
      </div>
    </article>
  </section>

  <section class="story" id="story" aria-labelledby="story-title">
    <div class="story-pin">
      <div class="story-stage"><div class="stage3d" id="story-stage"></div></div>
      <div class="story-copy">
        <h2 id="story-title">From seed to supper</h2>
        <pre class="ascii ascii-grow" id="story-ascii" aria-hidden="true">${GROW[0]}</pre>
        <div class="story-steps">${[
          ['Day 1', 'Push a seed into damp compost. That’s it, you’re a grower.'],
          ['Day 10', 'Two tiny leaves pop up. Snap a photo and your streak begins.'],
          ['Day 45', 'Yellow flowers open. Bees drop by, and every flower can become a tomato.'],
          ['Day 75', 'Red, warm and sweet. Picked a minute ago, it travelled zero miles.'],
        ].map(([d, t], i) => `<div class="story-step${i === 0 ? ' on' : ''}" data-step="${i}"><span class="day">${d}</span><p>${t}</p></div>`).join('')}</div>
      </div>
      <div class="story-bar" aria-hidden="true"><i id="story-bar"></i></div>
    </div>
  </section>

  <section class="sec ritual" aria-labelledby="ritual-title">
    <div class="grid2">
      <div>
        <h2 class="sec-head rise" id="ritual-title">Two minutes a day</h2>
        <p class="sec-note rise" style="--d:80ms">A daily photo keeps your streak alive, and the app looks at it right on your device to tell you how your plant is doing.</p>
        <div class="ritual-pics rise" style="--d:160ms">
          <img src="img/tomatoes-board.png" alt="Freshly picked tomatoes on a wooden board" width="800" height="800" loading="lazy">
          <video src="video/sprout.mp4" poster="video/sprout-poster.jpg" width="480" height="480" muted loop playsinline preload="metadata" ${reduce ? "" : "autoplay"} aria-label="Time-lapse of a tomato seedling opening its first leaves (AI illustration)"></video>
        </div>
      </div>
      <div class="slip zig rise" style="--d:120ms">
        <pre class="ascii ascii-can" aria-hidden="true">${CAN}</pre>
        <h3>Morning</h3>
        <p class="row"><span>Say hello to your plant</span><i class="dots"></i><span>10 sec</span></p>
        <p class="row"><span>Feel the soil, water if dry</span><i class="dots"></i><span>30 sec</span></p>
        <h3>Snap</h3>
        <p class="row"><span>Take today’s photo</span><i class="dots"></i><span>10 sec</span></p>
        <p class="row"><span>Read your plant’s feedback</span><i class="dots"></i><span>20 sec</span></p>
        <h3>Once a week</h3>
        <p class="row"><span>Turn the pot toward the light</span><i class="dots"></i><span>10 sec</span></p>
        <p class="row"><span>Pick anything ripe</span><i class="dots"></i><span>40 sec</span></p>
        <p class="row total"><span>A streak and real food</span><i class="dots"></i><span>2 min</span></p>
      </div>
    </div>
  </section>

  <section class="sec receipt-sec" id="miles" aria-labelledby="miles-title">
    <div class="grid2">
      <div class="left">
        <h2 class="sec-head rise" id="miles-title">How far did the shop one travel?</h2>
        <p class="sec-note rise" style="--d:80ms">Pick where you live and a plant. We show where most of that food in your shops comes from, and its carbon per kilo.</p>
        <div class="pickers rise" style="--d:140ms">
          <label class="select"><span class="vh">Where you live</span><select id="r-region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
          <label class="select"><span class="vh">Plant</span><select id="r-plant">${D.plants.filter((p) => p.group !== 'tree' || p.id === 'apple' || p.id === 'lemon').map((p) => `<option value="${p.id}"${p.id === 'tomato' ? ' selected' : ''}>${esc(p.name.replace(' tree', 's'))}</option>`).join('')}</select></label>
        </div>
        <pre class="ascii ascii-trip rise" style="--d:200ms" aria-hidden="true" id="r-ascii"></pre>
        <div class="total-big" aria-live="polite"><b id="r-total">0</b><span id="r-caption"></span></div>
      </div>
      <div class="slip zig rise" style="--d:120ms" id="r-slip"></div>
    </div>
  </section>

  <section class="sec menu-sec" aria-labelledby="menu-title">
    <img src="img/raised-beds.png" alt="Raised wooden vegetable beds with lettuce, kale, carrots and peas" width="1600" height="1066" loading="lazy">
    <div class="sheet paper scallop rise">
      <h2 id="menu-title">What you can grow</h2>
      <p>Tap one to see it fully grown in 3D</p>
      ${[['veg', 'Vegetables'], ['fruit', 'Fruit and berries'], ['herb', 'Herbs'], ['tree', 'Trees']].map(([g, t]) => `
        <section><h3>${t}</h3><ul>${byGroup(g).map((p) => `<li><a href="#/plant/${p.id}"><b>${esc(p.name)}</b><span>${daysText(p)}</span><small>${esc(p.grow?.scientific || '')}</small></a></li>`).join('')}</ul></section>`).join('')}
      <p class="foot">Times are from planting to first harvest<br>in a warm summer. Cooler places take longer.</p>
    </div>
  </section>

  <section class="sec blank-sec" aria-labelledby="blank-title">
    <div>
      <h2 class="vh" id="blank-title">Start growing</h2>
      <form class="blank" id="blank" autocomplete="off">
        <label for="blank-in">Today I’m planting</label> <input id="blank-in" list="plant-names" placeholder="tomatoes" enterkeyhint="go"> <button type="submit">Go</button>
        <datalist id="plant-names">${D.plants.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>
      </form>
      <p class="after">You’ll see it fully grown and how far the shop one travelled.</p>
    </div>
    <img class="rise" src="img/seedling-hands.png" alt="Two small hands holding soil with a tomato seedling" width="800" height="800" loading="lazy">
  </section>

  <footer class="foot-sec" aria-labelledby="foot-name">
    <pre class="ascii ascii-leafline" aria-hidden="true">${LEAF_LINE.repeat(3)}</pre>
    <p class="foot-name" id="foot-name">Zero Mile</p>
    <div class="foot-row">
      <nav class="places" aria-label="Footer">
        <a href="#/find">Find a plant</a>
        <a href="#/garden">My garden</a>
        <a href="#/sources">Sources and method</a>
      </nav>
      <div class="cols">
        <p>Made for growers of every age. Your photos and streak stay on this device; nothing is uploaded.</p>
        <p>Pictures are AI illustrations made with Comfy and printed in Ditherlab, not photos of real farms. Facts come from USDA, Our World in Data, UK DESNZ, RHS and more, listed on the Sources page.</p>
        <pre class="ascii ascii-photo" aria-hidden="true">${esc(STRAWBERRY)}</pre>
      </div>
    </div>
    <div class="foot-legal"><span>Zero Mile, 2026</span><a href="#top" id="to-top">Back to top</a></div>
  </footer>
  </div>`;

  // ---------- 3D: the packet window ----------
  const { createViewer } = await import('./viewer.js?v=2');
  const hero = createViewer($('#hero-stage'), { controls: true });
  hero.setPlant('tomato', 1);
  const stopSpin = setTimeout(() => hero.setSpin(false), 9000); // one slow turn, then rest
  $$('[data-hero]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-hero]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    hero.setPlant(b.dataset.hero, 1);
    $('#hero-name').textContent = `${plantById(b.dataset.hero).name}, fully grown`;
  }));

  // ---------- the pinned story: one damped follower drives growth ----------
  const story = $('#story');
  const sv = createViewer($('#story-stage'), { spin: true });
  sv.setPlant('tomato', .02);
  let target = 0, f = 0, lastT = -1, raf = 0;
  const stepEls = $$('.story-step', story), asciiEl = $('#story-ascii'), bar = $('#story-bar');
  const progress = () => { const r = story.getBoundingClientRect(); return Math.max(0, Math.min(1, -r.top / (r.height - innerHeight))); };
  const growthAt = (x) => Math.max(.02, Math.min(1, x * 1.08));
  function draw(x) {
    const t = growthAt(x);
    if (Math.abs(t - lastT) > .012 || (t === 1 && lastT !== 1)) {
      sv.setPlant('tomato', t, { keepCamera: lastT >= 0 });
      if (lastT < 0) { sv.setPlant('tomato', 1); sv.frame(); sv.setPlant('tomato', t, { keepCamera: true }); }
      lastT = t;
    }
    const step = Math.min(3, Math.floor(x * 4.0001));
    stepEls.forEach((e, i) => e.classList.toggle('on', i === step));
    asciiEl.textContent = GROW[Math.min(GROW.length - 1, Math.floor(x * GROW.length))];
    bar.style.transform = `scaleX(${x})`;
  }
  function tick() {
    raf = 0;
    f += (target - f) * .14; // critically damped enough to feel physical, never bouncy
    if (Math.abs(target - f) < .0005) f = target;
    draw(f);
    if (f !== target) raf = requestAnimationFrame(tick);
  }
  const onScroll = () => { target = progress(); if (reduce) { f = target; draw(f); } else if (!raf) raf = requestAnimationFrame(tick); };
  if (reduce) { sv.setPlant('tomato', 1); stepEls.forEach((e) => e.classList.add('on')); asciiEl.textContent = GROW[GROW.length - 1]; }
  else { addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  // ---------- the receipt: the live thing ----------
  const rRegion = $('#r-region'), rPlant = $('#r-plant');
  function receipt() {
    const p = plantById(rPlant.value), reg = rRegion.value;
    state.region = reg; save();
    const tr = trip(p, reg);
    const slip = $('#r-slip');
    if (!tr) {
      $('#r-total').textContent = '—';
      $('#r-caption').textContent = `We couldn’t find a reliable source for where ${p.name.toLowerCase()} in ${D.regions[reg].name} comes from yet.`;
      slip.innerHTML = `<h3>No receipt yet</h3><p>Try another plant.</p>`; $('#r-ascii').textContent = POT; return;
    }
    const farm = p.carbon?.kg_co2e_per_kg ?? 0;
    const total = farm + tr.co2Transport;
    const miles = Math.round(tr.crowMi);
    $('#r-total').textContent = `${fmt(miles)} mi`;
    $('#r-caption').textContent = `as the crow flies from ${tr.o.origin_place || tr.o.origin_country} to ${tr.reg.dest.name}. From your windowsill: 0 miles.`;
    $('#r-ascii').textContent = `${LORRY}\n\n  ${fmt(miles)} miles  vs   0 miles\n${POT.split('\n').map((l) => '                         ' + l).join('\n')}`;
    const hv = p.home_vs_shop;
    const health = hv?.verdict === 'more' && hv.healthier_pct
      ? `Shop ${p.name.toLowerCase()} can lose up to ${hv.healthier_pct}% of its ${hv.nutrient} in storage`
      : `About the same goodness as the shop one`;
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
      <p class="cite" style="margin-top:14px">${tr.o.confidence === 'low' ? 'Low-confidence source. ' : ''}${tr.o.year ? `Trade data ${tr.o.year}. ` : ''}<a href="#/sources">How we worked this out</a></p>`;
  }
  rRegion.addEventListener('change', receipt); rPlant.addEventListener('change', receipt);
  receipt();

  // ---------- the sentence with a blank ----------
  $('#blank').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#blank-in').value.trim().toLowerCase();
    if (!q) { $('#blank-in').focus(); return; }
    const hit = D.plants.find((p) => p.name.toLowerCase() === q || p.id === q || p.name.toLowerCase().startsWith(q.replace(/e?s$/, '')) || p.aliases.includes(q));
    location.hash = hit ? `#/plant/${hit.id}` : `#/find/${encodeURIComponent(q)}`;
  });
  $('#to-top').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' }); });

  return { unmount() { clearTimeout(stopSpin); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); hero.dispose(); sv.dispose(); } };
}
