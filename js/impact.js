// Your impact: what your own harvests have saved, worked out from the cited data. Big pictures and numbers first;
// the explanations and citations sit behind the "?" buttons and on About and sources.
import { esc, fmt, data, plantById, trip, state, thumb, isTree, treeAge, treeCO2, lastHeight, today, dayDiff } from './core.js?v=9';
import { countAll, helpBtn, bindHelp } from './fun.js?v=9';
import { art, mascot } from './art.js?v=9';

// round goals that move on as you pass them
const goalFor = (v, steps) => steps.find((s) => s > v) ?? Math.ceil((v + 1) / steps.at(-1)) * steps.at(-1);
const viaAir = (tr) => /air/.test(tr?.o?.transport_mode || '');
const srcLinks = (arr) => (arr || []).filter((s) => s?.url).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ');

// a big illustrated counter: picture, a number that counts up, a 1–3 word label, and a chunky bar to the next goal
function counter({ pic, value, dec = 0, unit = '', label, goal, tone = 'leaf', help = '' }) {
  const p = Math.min(100, (value / goal) * 100).toFixed(1);
  return `<div class="ct3 c3 ${tone}">
    <div class="ct3-top">${pic}${help}</div>
    <b class="ct3-n"><span data-count="${value}" data-dec="${dec}">${fmt(value, dec)}</span>${unit ? `<small>${unit}</small>` : ''}</b>
    <span class="ct3-l">${label}</span>
    <div class="bar3" role="img" aria-label="${fmt(value, dec)} of ${fmt(goal)}${unit ? ` ${unit}` : ''}"><i style="--p:${p}%"></i></div>
    <span class="ct3-goal">Goal ${fmt(goal)}${unit ? ` ${unit}` : ''}</span>
  </div>`;
}

// photos taken in each of the last 8 weeks (Monday to Sunday), across every plant
function weeks() {
  const t = new Date(today() + 'T12:00'), mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const out = Array.from({ length: 8 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() - (7 - i) * 7); return { start: today(d), n: 0 }; });
  for (const e of state.garden) for (const l of e.log || []) {
    const k = Math.floor(dayDiff(out[0].start, l.date) / 7); if (k >= 0 && k < 8) out[k].n++;
  }
  return out;
}
function photoChart() {
  const w = weeks(), total = w.reduce((s, x) => s + x.n, 0), max = Math.max(7, ...w.map((x) => x.n));
  const head = `<div class="h3row">${art('camera', { size: 40 })}<h2 id="wk-t">Photos a week</h2><span class="tag3 sun">${total} in 8 wks</span></div>`;
  if (!total) {
    return `<section class="c3 wk3" aria-labelledby="wk-t">${head}
      <div class="empty3">${mascot('point', { size: 96 })}<p>Snap your first photo</p><a class="b3 b3-sun" href="#/snap">Take a photo</a></div></section>`;
  }
  const md = (iso) => { const d = new Date(iso + 'T12:00'); return `${d.getDate()}/${d.getMonth() + 1}`; };
  return `<section class="c3 wk3" aria-labelledby="wk-t">${head}
    <ol class="wk3-bars" aria-label="Photos in each of the last 8 weeks">${w.map((x, i) => `<li class="${i === 7 ? 'now' : ''}" style="--i:${i}"><b>${x.n}</b><span class="wk3-col"><i style="--h:${(x.n / max).toFixed(3)}"></i></span><small>${i === 7 ? 'Now' : md(x.start)}</small><span class="vh">photos in the week of ${x.start}</span></li>`).join('')}</ol>
  </section>`;
}

// your plants in a row on the soil, like a little garden map
function gardenMap() {
  const mine = state.garden.map((e) => ({ e, p: plantById(e.id) })).filter((x) => x.p);
  const head = `<div class="h3row">${art('scene-garden', { size: 40 })}<h2 id="gm-t">Your garden</h2><span class="tag3">${mine.length}</span></div>`;
  if (!mine.length) return `<section class="c3 gm3" aria-labelledby="gm-t">${head}<div class="empty3">${mascot('point', { size: 96 })}<p>Grow your first plant</p><a class="b3" href="#/find">Find a plant</a></div></section>`;
  return `<section class="c3 gm3" aria-labelledby="gm-t">${head}
    <ul class="gm3-row">${mine.map(({ e, p }, i) => { const h = isTree(p) ? lastHeight(e) : null; return `<li style="--i:${i}"><a href="#/plant/${p.id}"><img src="${thumb(p.id)}" alt="" width="96" height="96" loading="lazy" decoding="async"><b>${esc(p.name)}</b><span>${isTree(p) ? esc(treeAge(e)) + (h ? ` · ${fmt(h.cm)} cm` : '') : `Day ${Math.max(0, dayDiff(e.planted, today()))}`}</span></a></li>`; }).join('')}</ul>
  </section>`;
}

export default async function impact(main) {
  const D = await data();
  const rows = state.garden.map((e) => {
    const p = plantById(e.id); if (!p) return null;
    const kg = (e.harvests || []).reduce((s, h) => s + h.g, 0) / 1000;
    const picks = (e.harvests || []).length;
    const tr = trip(p, state.region);
    return { p, kg, picks, miles: tr ? Math.round(tr.crowMi * picks) : 0, co2g: tr ? Math.round(tr.co2Transport * kg * 1000) : 0, tr };
  }).filter(Boolean);
  // totals are the sums of the rounded rows shown below
  const tot = rows.reduce((a, r) => ({ kg: a.kg + Math.round(r.kg * 100) / 100, miles: a.miles + r.miles, co2g: a.co2g + r.co2g, picks: a.picks + r.picks }), { kg: 0, miles: 0, co2g: 0, picks: 0 });
  const facts = [...(D.home_facts || []), ...(D.context_facts || [])].slice(0, 6);
  const region = D.regions[state.region]?.name || 'your country';
  const city = D.regions[state.region]?.dest?.name || region;
  const examples = ['tomato', 'strawberry', 'lettuce', 'apple', 'blueberry', 'pepper'].map(plantById).filter(Boolean).map((p) => ({ p, tr: trip(p, state.region) })).filter((x) => x.tr);
  const picked = rows.filter((r) => r.picks);
  const eea = (D.trees?.carbon_note?.sources || []).find((s) => /European Commission/.test(s.publisher || '')) || (plantById('oak')?.tree?.sources || []).find((s) => /European Environment Agency/.test(s.publisher || ''));
  const ref = treeCO2(plantById('oak'))?.[1] ?? 22; // the typical mature-tree figure
  const trees = state.garden.map((e) => ({ e, p: plantById(e.id) })).filter((x) => x.p && isTree(x.p));
  const tLo = trees.reduce((s, x) => s + (treeCO2(x.p)?.[0] || 0), 0), tHi = trees.reduce((s, x) => s + (treeCO2(x.p)?.[1] || 0), 0);
  const tKg = tLo === tHi ? fmt(tLo) : `${fmt(tLo)}–${fmt(tHi)}`;

  main.innerHTML = `
  <div class="page s3 imp3">
    <header class="i3-head">
      <div><h1>Your impact</h1><p>vs shop food in ${esc(region)}</p></div>
      ${helpBtn('count')}
    </header>
    ${tot.picks ? '' : `<section class="c3 i3-empty" aria-label="Get started">${mascot('point', { size: 104 })}<p>Pick food to fill these up</p><a class="b3 b3-sun" href="#/">Go to Today</a></section>`}
    <section class="ct3-grid" aria-label="Your savings">
      ${counter({ pic: art(viaAir(picked[0]?.tr) ? 'plane' : 'lorry', { size: 64 }), value: tot.miles, label: 'Miles skipped', goal: goalFor(tot.miles, [100, 500, 1000, 5000, 10000]), tone: 'sky' })}
      ${counter({ pic: art('cloud-co2', { size: 64 }), value: tot.co2g, unit: 'g', label: 'CO2 skipped', goal: goalFor(tot.co2g, [100, 500, 1000, 5000]), tone: 'berry' })}
      ${counter({ pic: art('basket', { size: 64 }), value: +tot.kg.toFixed(2), dec: tot.kg < 10 ? 1 : 0, unit: 'kg', label: 'Food grown', goal: goalFor(tot.kg, [1, 5, 10, 25, 50]), tone: 'tomato' })}
      ${counter({ pic: art('tree', { size: 64 }), value: trees.length, label: 'Trees planted', goal: goalFor(trees.length, [1, 3, 5, 10, 25, 50]), tone: 'leaf', help: helpBtn('trees', 'How the tree estimate works') })}
    </section>
    ${trees.length ? `<p class="i3-co2 c3">${art('cloud-co2', { size: 44 })}<span><b>~${tKg} kg CO2</b> a year, once grown</span>${helpBtn('trees', 'How the tree estimate works')}</p>` : `<a class="c3 i3-tree" href="#/find/trees">${art('scene-forest', { size: 120 })}<b>Plant a tree</b><span class="b3 b3-white">Find a tree</span></a>`}
    <div class="i3-two">
      ${photoChart()}
      ${gardenMap()}
    </div>
    <div class="i3-two">
      <section class="c3 by3" aria-labelledby="by-t">
        <div class="h3row">${art('map-pin', { size: 40 })}<h2 id="by-t">${picked.length ? 'By plant' : 'One pick saves'}</h2><span class="tag3">${esc(city)}</span></div>
        ${picked.length ? `<ul class="by3-list">${picked.map((r) => `
          <li><img src="${thumb(r.p.id)}" alt="" width="56" height="56" loading="lazy"><b>${esc(r.p.name)}<small>${fmt(r.kg, 2)} kg</small></b><span class="by3-n">${fmt(r.miles)} mi<small>${fmt(r.co2g)} g CO2e</small></span></li>`).join('')}</ul>`
        : `<ul class="trip3">${examples.map((x) => `
          <li><a href="#/plant/${x.p.id}"><img src="${thumb(x.p.id)}" alt="" width="72" height="72" loading="lazy"><b>${esc(x.p.name)}</b><span class="trip3-n">${art(viaAir(x.tr) ? 'plane' : 'lorry', { size: 24 })}${fmt(x.tr.crowMi)} mi</span><small>from ${esc(x.tr.o.origin_country)}</small></a></li>`).join('')}</ul>`}
      </section>
      <section class="c3 gk3" aria-labelledby="gk-t">
        <div class="h3row">${art('quest-learn', { size: 40 })}<h2 id="gk-t">Good to know</h2></div>
        <button class="b3 b3-sky b3-wide" type="button" data-help="facts">${facts.length} quick facts</button>
        <a class="b3 b3-white b3-wide" href="#/sources">All sources</a>
      </section>
    </div>
  </div>`;

  bindHelp(main, {
    count: { title: 'How we count', body: `<div class="help-rows">
      <p>${art('lorry', { size: 40, cls: 'help-art' })}<span><b>Food miles</b>: the straight line from where shop food is grown to ${esc(city)}, once per harvest you log.</span></p>
      <p>${art('cloud-co2', { size: 40, cls: 'help-art' })}<span><b>Travel CO2</b>: UK government freight factors for lorry, ship, rail or plane.</span></p>
      <p>${art('basket', { size: 40, cls: 'help-art' })}<span><b>Food you grew</b>: the amounts you tap when you pick some.</span></p>
      <p>${art('camera', { size: 40, cls: 'help-art' })}<span><b>Photos a week</b>: the days you snapped a plant, Monday to Sunday.</span></p></div>
      <p><a class="b3 b3-white" href="#/sources">All sources</a></p>` },
    trees: { title: 'The tree estimate', body: `<p>A mature tree takes up about ${fmt(ref)} kg of CO2 a year${eea ? ` (${srcLinks([eea])})` : ''}. Young trees take up less, so this is what your trees could do once grown.</p><p><a class="b3 b3-white" href="#/sources">All sources</a></p>` },
    facts: { title: 'Good to know', body: `<ul class="facts-list">${facts.map((f) => `<li>${esc(f.text)}<small>${srcLinks(f.sources)}</small></li>`).join('')}</ul>` },
  });
  countAll(main);
}
