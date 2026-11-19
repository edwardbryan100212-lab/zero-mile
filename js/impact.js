// Your impact: what your own harvests have saved, worked out from the cited data. Big pictures and numbers first;
// the explanations and citations sit behind the "?" buttons and on About and sources.
import { esc, fmt, data, plantById, trip, state, thumb, isTree, treeAge, treeCO2, lastHeight, today, dayDiff } from './core.js?v=9';
import { countAll, helpBtn, bindHelp } from './fun.js?v=9';
import { icon } from './find.js?v=9';
import { produceIcon } from './produce.js?v=9';
import { journeyOf, routesSvg, odometer, kmCancelled, placeLabel, homeLabel } from './journey.js?v=1';

// round goals that move on as you pass them
const goalFor = (v, steps) => steps.find((s) => s > v) ?? Math.ceil((v + 1) / steps.at(-1)) * steps.at(-1);
const viaAir = (tr) => /air/.test(tr?.o?.transport_mode || '');
const srcLinks = (arr) => (arr || []).filter((s) => s?.url).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ');

// one figure in the strip: a label, a number that counts up with its unit, a thin line to the next goal
function counter({ value, dec = 0, unit = '', gunit = unit, label, goal, help = '' }) {
  const p = Math.min(100, (value / goal) * 100).toFixed(1);
  return `<div class="ct3">
    <span class="ct3-l">${label}${help}</span>
    <b class="ct3-n"><span data-count="${value}" data-dec="${dec}">${fmt(value, dec)}</span>${unit ? `<small>${unit}</small>` : ''}</b>
    <span class="ct3-bar" role="img" aria-label="${fmt(value, dec)} of ${fmt(goal)}${unit ? ` ${unit}` : ''}"><i style="--p:${p}%"></i></span>
    <span class="ct3-goal">Next goal ${fmt(goal)}${gunit ? ` ${gunit}` : ''}</span>
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
  const head = `<div class="h3row"><h2 id="wk-t">Photos a week</h2><span class="muted3">${total} in 8 weeks</span></div>`;
  const md = (iso) => { const d = new Date(iso + 'T12:00'); return `${d.getDate()}/${d.getMonth() + 1}`; };
  return `<section class="c3 wk3" aria-labelledby="wk-t">${head}
    <ol class="wk3-bars" aria-label="Photos in each of the last 8 weeks">${w.map((x, i) => `<li class="${i === 7 ? 'now' : ''}${x.n ? '' : ' zero'}" style="--i:${i}"><b>${x.n}</b><span class="wk3-col"><i style="--h:${(x.n / max).toFixed(3)}"></i></span><small>${i === 7 ? 'This wk' : md(x.start)}</small><span class="vh">photos in the week of ${x.start}</span></li>`).join('')}</ol>
    ${total ? '' : '<p class="wk3-none">No photos yet. <a href="#/snap">Take the first one</a></p>'}
  </section>`;
}

// your plants as a list with their photos and what each has saved
function plantList(rows, real) {
  const mine = state.garden.map((e) => ({ e, p: plantById(e.id), r: rows.find((x) => x.p.id === e.id) })).filter((x) => x.p);
  const head = `<div class="h3row"><h2 id="gm-t">Your plants</h2><span class="muted3">${mine.length}</span></div>`;
  if (!mine.length) return `<section class="c3 gm3" aria-labelledby="gm-t">${head}<p class="gm3-none">Nothing growing yet.</p><a class="b3 b3-white" href="#/find">Find a plant</a></section>`;
  return `<section class="c3 gm3" aria-labelledby="gm-t">${head}
    <ul class="pl3">${mine.map(({ e, p, r }) => { const h = isTree(p) ? lastHeight(e) : null; const sub = isTree(p) ? esc(treeAge(e)) + (h ? `, ${fmt(h.cm)} cm` : '') : `Day ${Math.max(0, dayDiff(e.planted, today()))}`; return `<li><a href="#/plant/${p.id}">${produceIcon(p.id, { size: 48, cls: 'pl3-sym', group: p.group })}<span class="pl3-n"><b>${esc(p.name)}</b><small>${sub}</small></span><span class="pl3-v">${r?.picks ? `<b>${fmt(r.kg, 2)} kg</b><small>${fmt(r.miles)} km cancelled</small>` : '<small>No pick yet</small>'}</span></a></li>`; }).join('')}</ul>
  </section>`;
}

// every shop trip your harvests cancelled, as routes flying into home; an honest empty state before the first pick
function cancelledMap(rows, city) {
  const done = rows.filter((r) => r.picks).map((r) => ({ r, j: journeyOf(r.p.id) })).filter((x) => x.j);
  const head = `<div class="h3row"><h2 id="cm-t">Trips you cancelled</h2><span class="muted3">into ${esc(done[0] ? homeLabel(done[0].j) : city)}</span></div>`;
  if (!done.length) return `<section class="c3 imp-map" aria-labelledby="cm-t">${head}
    <p class="imp-map-none">No trips cancelled yet. Each harvest you log cancels the shop version's real journey, and its route lands on this map.</p></section>`;
  const mob = innerWidth < 600;
  const size = mob ? { w: 360, h: 260 } : { w: 800, h: 330 };
  const km = kmCancelled();
  return `<section class="c3 imp-map" aria-labelledby="cm-t">${head}
    <div class="imp-map-odo">${odometer(km)}<span class="muted3">cancelled, ${done.reduce((s, x) => s + x.r.picks, 0)} trips</span></div>
    <div class="imp-map-box">${routesSvg(done.map((x) => x.r.p.id), { ...size, crop: 'auto' })}</div>
    <ul class="imp-map-key">${done.map(({ r, j }) => `<li><i style="background:#c8673d"></i>${esc(r.p.name)} from ${esc(placeLabel(j))}, ${fmt(j.km)} km${r.picks > 1 ? ` × ${r.picks}` : ''}</li>`).join('')}</ul>
  </section>`;
}

export default async function impact(main) {
  const D = await data();
  const rows = state.garden.map((e) => {
    const p = plantById(e.id); if (!p) return null;
    const kg = (e.harvests || []).reduce((s, h) => s + h.g, 0) / 1000;
    const picks = (e.harvests || []).length;
    const tr = trip(p, state.region);
    return { p, kg, picks, miles: tr ? Math.round(tr.crowKm * picks) : 0, co2g: tr ? Math.round(tr.co2Transport * kg * 1000) : 0, tr };
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

  const real = await import('./photos.js?v=9').then((m) => m.photoThumbs()).catch(() => ({}));
  const treePic = real.oak || real.beech || '';
  main.innerHTML = `
  <div class="page s3 imp3">
    <header class="s3-head i3-head">
      <div><h1>Your impact</h1><p>Compared with shop food in ${esc(region)}</p></div>
      ${helpBtn('count')}
    </header>
    <section class="c3 ct3-grid" aria-label="Your savings">
      ${counter({ value: tot.miles, unit: 'km', label: 'Km cancelled', goal: goalFor(tot.miles, [100, 1000, 5000, 10000, 25000]) })}
      ${counter({ value: tot.co2g, unit: 'g CO2e', label: 'Travel CO2 skipped', goal: goalFor(tot.co2g, [100, 500, 1000, 5000]) })}
      ${counter({ value: +tot.kg.toFixed(2), dec: tot.kg < 10 ? 1 : 0, unit: 'kg', label: 'Food grown', goal: goalFor(tot.kg, [1, 5, 10, 25, 50]) })}
      ${counter({ value: trees.length, unit: trees.length === 1 ? 'tree' : 'trees', gunit: 'trees', label: 'Trees planted', goal: goalFor(trees.length, [1, 3, 5, 10, 25, 50]), help: helpBtn('trees', 'How the tree estimate works') })}
    </section>
    ${tot.picks ? '' : '<p class="i3-hint">Log a harvest from Today and these fill in. <a href="#/">Go to Today</a></p>'}
    ${cancelledMap(rows, city)}
    ${trees.length ? `<p class="i3-co2">${icon('co2')}<span>Your trees could take up about <b>${tKg} kg of CO2</b> a year once grown.</span></p>` : `<a class="c3 i3-tree" href="#/find/trees">${treePic ? `<img src="${treePic}" alt="" width="320" height="200" loading="lazy" decoding="async">` : ''}<span class="i3-tree-t"><b>Plant a tree</b><small>A grown tree takes up about ${fmt(ref)} kg of CO2 a year.</small></span><span class="b3 b3-white">Find a tree</span></a>`}
    <div class="i3-two">
      ${photoChart()}
      ${plantList(rows, real)}
    </div>
    ${picked.length ? '' : `<section class="c3 by3" aria-labelledby="by-t">
      <div class="h3row"><h2 id="by-t">How far shop food travels</h2><span class="muted3">to ${esc(city)}</span></div>
      <ul class="pl3 pl3-grid">${examples.map((x) => `
        <li><a href="#/plant/${x.p.id}">${produceIcon(x.p.id, { size: 48, cls: 'pl3-sym', group: x.p.group })}<span class="pl3-n"><b>${esc(x.p.name)}</b><small>from ${esc(x.tr.o.origin_country)}${viaAir(x.tr) ? ', by plane' : ''}</small></span><span class="pl3-v"><b>${fmt(x.tr.crowMi)} mi</b></span></a></li>`).join('')}</ul>
    </section>`}
    <section class="i3-more" aria-label="Good to know">
      <button class="b3 b3-white" type="button" data-help="facts">${icon('info')}${facts.length} quick facts</button>
      <a class="b3 b3-white" href="#/sources">${icon('book')}All sources</a>
    </section>
  </div>`;

  bindHelp(main, {
    count: { title: 'How we count', body: `<div class="help-rows">
      <p>${icon('lorry')}<span><b>Km cancelled</b>: the straight line from where shop food is grown to ${esc(city)}, once per harvest you log.</span></p>
      <p>${icon('co2')}<span><b>Travel CO2</b>: UK government freight factors for lorry, ship, rail or plane.</span></p>
      <p>${icon('apple')}<span><b>Food you grew</b>: the amounts you tap when you pick some.</span></p>
      <p>${icon('camera')}<span><b>Photos a week</b>: the days you snapped a plant, Monday to Sunday.</span></p></div>
      <p><a class="b3 b3-white" href="#/sources">All sources</a></p>` },
    trees: { title: 'The tree estimate', body: `<p>A mature tree takes up about ${fmt(ref)} kg of CO2 a year${eea ? ` (${srcLinks([eea])})` : ''}. Young trees take up less, so this is what your trees could do once grown.</p><p><a class="b3 b3-white" href="#/sources">All sources</a></p>` },
    facts: { title: 'Good to know', body: `<ul class="facts-list">${facts.map((f) => `<li>${esc(f.text)}<small>${srcLinks(f.sources)}</small></li>`).join('')}</ul>` },
  });
  countAll(main);
}
