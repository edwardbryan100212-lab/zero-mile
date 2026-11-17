// Your impact: what your own harvests have saved, worked out from the cited data. Big pictures and numbers first;
// the explanations and citations sit behind the "?" buttons and on About and sources.
import { esc, fmt, data, plantById, trip, state, thumb, isTree, treeAge, treeCO2, lastHeight, bestTrees, treeLine } from './core.js?v=9';
import { ART, countAll, fillAll, helpBtn, bindHelp } from './fun.js?v=9';

// round goals that move on as you pass them
const goalFor = (v, steps) => steps.find((s) => s > v) ?? Math.ceil((v + 1) / steps.at(-1)) * steps.at(-1);
const viaAir = (tr) => /air/.test(tr?.o?.transport_mode || '');
const srcLinks = (arr) => (arr || []).filter((s) => s?.url).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ');

// a big meter: a picture, a number that counts up, one label, and a bar that fills towards the next goal
function meter({ art, value, dec = 0, unit = '', label, goal, cls = '', road = false }) {
  const f = Math.min(1, value / goal).toFixed(3);
  return `<div class="imeter ${cls}">
    <div class="im-art">${art}</div>
    <b class="im-n"><span data-count="${value}" data-dec="${dec}">${fmt(value, dec)}</span>${unit ? `<small>${unit}</small>` : ''}</b>
    <span class="im-l">${label}</span>
    ${road ? `<div class="road" aria-hidden="true"><i class="road-fill" data-fill="${f}"></i><span class="mover" data-fill="${f}" data-axis="x-move">${ART.lorry()}</span></div>`
    : `<div class="progress" aria-hidden="true"><i data-fill="${f}"></i></div>`}
    <span class="im-goal">Next goal ${fmt(goal)}${unit ? ` ${unit}` : ''}</span>
  </div>`;
}

// Trees you planted: one tree picture per tree towards the next goal, and an estimate of the CO2 they can take up once grown
function treesCard(D) {
  const mine = state.garden.map((e) => ({ e, p: plantById(e.id) })).filter((x) => isTree(x.p));
  const steps = [1, 3, 5, 10, 25, 50], n = mine.length, goal = steps.find((s) => s > n) ?? n + 10;
  const lo = mine.reduce((s, x) => s + (treeCO2(x.p)?.[0] || 0), 0), hi = mine.reduce((s, x) => s + (treeCO2(x.p)?.[1] || 0), 0);
  const kg = lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
  const forest = `<ul class="forest" aria-label="${n} of ${goal} trees">${Array.from({ length: goal }, (_, i) => `<li class="${i < n ? 'on' : ''}" style="--i:${i}">${ART.tree('', i < n)}</li>`).join('')}</ul>`;
  const head = `<div class="card-head"><h2 id="trees-t">Trees you planted</h2>${helpBtn('trees', 'How the tree estimate works')}</div>`;
  if (!n) {
    return `<section class="card trees-card" aria-labelledby="trees-t">${head}
      <div class="empty-pic row-pic">${ART.tree()}<p>Plant a tree to see it here</p><a class="btn btn-sm" href="#/find/trees">Find a tree</a></div>
      <div class="tiles">${bestTrees().slice(0, 6).map((p) => `<a class="tile" href="#/plant/${p.id}"><div class="tile-art"><img src="${thumb(p.id)}" alt="" width="132" height="132" loading="lazy"></div><b>${esc(p.name)}</b><span>${esc(treeLine(p))}</span></a>`).join('')}</div>
    </section>`;
  }
  return `<section class="card trees-card" aria-labelledby="trees-t">${head}
    <div class="tree-count"><b><span data-count="${n}">${n}</span><small>/ ${goal}</small></b>${forest}</div>
    <p class="tree-co2">${ART.cloud()}<span><b>About ${kg} kg</b> CO2 a year, once grown (estimate)</span></p>
    <ul class="list">${mine.map(({ e, p }) => { const h = lastHeight(e); return `<li class="irow"><img src="${thumb(p.id)}" alt="" width="48" height="48"><div><a href="#/plant/${p.id}"><b>${esc(p.name)}</b></a><br><span class="muted small">${treeAge(e)}${h ? ` · ${fmt(h.cm)} cm` : ''}</span></div></li>`; }).join('')}</ul>
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

  main.innerHTML = `
  <div class="page impact">
    <header class="page-head"><h1>Your impact</h1><p class="muted head-line">${tot.picks ? `${tot.picks} harvest${tot.picks === 1 ? '' : 's'} vs the shop in ${esc(region)}` : `Compared with shop food in ${esc(region)}`}${helpBtn('count')}</p></header>
    ${tot.picks ? `
    <section class="imeters" aria-label="Your savings">
      ${meter({ art: viaAir(picked[0]?.tr) ? ART.plane() : ART.lorry(), value: tot.miles, label: 'food miles skipped', goal: goalFor(tot.miles, [100, 500, 1000, 5000, 10000]), cls: 'm-miles', road: true })}
      ${meter({ art: ART.cloud(), value: tot.co2g, unit: 'g', label: 'travel CO2 skipped', goal: goalFor(tot.co2g, [100, 500, 1000, 5000]) })}
      ${meter({ art: ART.basket(), value: +tot.kg.toFixed(2), dec: tot.kg < 10 ? 1 : 0, unit: 'kg', label: 'food you grew', goal: goalFor(tot.kg, [1, 5, 10, 25, 50]) })}
    </section>` : `
    <section class="card empty-hero">
      <div class="eh-art" aria-hidden="true">${ART.basket()}${ART.lorry('eh-lorry')}</div>
      <div><h2>Pick some food to see this grow</h2><p class="muted">Tap the basket on a plant when you pick some.</p><a class="btn btn-sm" href="#/">Go to Today</a></div>
    </section>`}
    ${treesCard(D)}
    <div class="about-grid">
      <section class="card" aria-labelledby="by-t">
        <div class="card-head"><h2 id="by-t">${picked.length ? 'By plant' : 'One harvest saves'}</h2><span class="muted small">${esc(city)}</span></div>
        ${picked.length ? `<ul class="list">${picked.map((r) => `
          <li class="irow"><img src="${thumb(r.p.id)}" alt="" width="48" height="48"><div><b>${esc(r.p.name)}</b><br><span class="muted small">${fmt(r.kg, 2)} kg</span></div><div class="n">${fmt(r.miles)} mi<span>${fmt(r.co2g)} g CO2e</span></div></li>`).join('')}</ul>`
        : `<ul class="trips">${examples.map((x) => `
          <li><a href="#/plant/${x.p.id}"><img src="${thumb(x.p.id)}" alt="" width="72" height="72" loading="lazy"><b>${esc(x.p.name)}</b><span class="trip-n">${viaAir(x.tr) ? ART.plane('mini') : ART.lorry('mini')}${fmt(x.tr.crowMi)} mi</span><span class="muted small">from ${esc(x.tr.o.origin_country)}</span></a></li>`).join('')}</ul>`}
      </section>
      <section class="card facts-card" aria-labelledby="gk-t">
        <div class="card-head"><h2 id="gk-t">Good to know</h2><a href="#/sources">Sources</a></div>
        <button class="fact-open" type="button" data-help="facts">${ART.sun()}<span><b>${facts.length} quick facts</b><span class="muted small">with sources</span></span></button>
      </section>
    </div>
  </div>`;

  bindHelp(main, {
    count: { title: 'How we count', body: `<div class="help-rows">
      <p>${ART.lorry('help-art')}<span><b>Food miles</b>: the straight line from where shop food is grown to ${esc(city)}, once per harvest you log.</span></p>
      <p>${ART.cloud('help-art')}<span><b>Travel CO2</b>: UK government freight factors for lorry, ship, rail or plane.</span></p>
      <p>${ART.basket('help-art')}<span><b>Food you grew</b>: the amounts you tap when you pick some.</span></p></div>
      <p><a class="btn btn-soft btn-sm" href="#/sources">All sources</a></p>` },
    trees: { title: 'The tree estimate', body: `<p>A mature tree takes up about ${fmt(ref)} kg of CO2 a year${eea ? ` (${srcLinks([eea])})` : ''}. Young trees take up less, so this is what your trees could do once grown.</p><p><a class="btn btn-soft btn-sm" href="#/sources">All sources</a></p>` },
    facts: { title: 'Good to know', body: `<ul class="facts-list">${facts.map((f) => `<li>${esc(f.text)}<small>${srcLinks(f.sources)}</small></li>`).join('')}</ul>` },
  });
  countAll(main); fillAll(main);
}
