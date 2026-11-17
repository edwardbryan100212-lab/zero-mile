// Your impact: what your own harvests have saved, worked out from the cited data (every figure links to About and sources).
import { esc, fmt, data, plantById, trip, state, ROOT, thumb, isTree, treeAge, treeCO2, lastHeight, bestTrees, treeLine } from './core.js?v=9';

// Trees you planted: an estimate of the CO2 they can take up once grown, from each tree's cited typical figure
function treesCard(D) {
  const mine = state.garden.map((e) => ({ e, p: plantById(e.id) })).filter((x) => isTree(x.p));
  const steps = [1, 3, 5, 10, 25, 50], n = mine.length, goal = steps.find((s) => s > n) ?? n + 10;
  const lo = mine.reduce((s, x) => s + (treeCO2(x.p)?.[0] || 0), 0), hi = mine.reduce((s, x) => s + (treeCO2(x.p)?.[1] || 0), 0);
  const eea = (D.trees?.carbon_note?.sources || []).find((s) => /European Commission/.test(s.publisher || '')) || (D.plants.find((p) => p.id === 'oak')?.tree?.sources || []).find((s) => /European Environment Agency/.test(s.publisher || ''));
  const ref = treeCO2(plantById("oak"))?.[1] ?? 22; // the EEA typical mature-tree figure
  const kg = lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
  const head = `<div class="card-head"><h2 id="trees-t">Trees you planted</h2><a href="#/find/trees">${n ? 'Plant another' : 'Find a tree'}</a></div>`;
  const bar = `<div class="tree-goal"><b>${n}</b><div><span class="muted small">${n ? `Next goal: ${goal} trees` : 'Goal: plant your first tree'}</span><div class="progress" aria-hidden="true"><i style="transform:scaleX(${Math.min(1, n / goal)})"></i></div></div></div>`;
  const note = `<p class="muted small est">Estimate. ${eea ? `A mature tree takes up about ${fmt(ref)} kg of CO2 a year (${esc(eea.publisher.replace(/ \(.*\)$/, ''))}).` : ''} Young trees take up less, so this is what your trees could do once grown. <a class="how" href="#/sources">How we count</a></p>`;
  if (!n) {
    const best = bestTrees().slice(0, 3);
    return `<section class="card trees-card" aria-labelledby="trees-t">${head}${bar}
      <p>One tree, once grown, can take up about ${fmt(ref)} kg of CO2 from the air every year, and gives food and shelter to wildlife.</p>
      <ul class="list">${best.map((p) => `<li class="irow"><img src="${thumb(p.id)}" alt="" width="48" height="48"><div><a href="#/plant/${p.id}"><b>${esc(p.name)}</b></a><br><span class="muted small">${esc(treeLine(p))}</span></div><div class="n">Up to ${fmt((treeCO2(p) || [ref, ref])[1])} kg<span>CO2 a year, grown</span></div></li>`).join('')}</ul>
      ${note}</section>`;
  }
  return `<section class="card trees-card" aria-labelledby="trees-t">${head}${bar}
    <div class="tree-co2"><b>About ${kg} kg</b><span>CO2 a year your ${n === 1 ? 'tree' : `${n} trees`} could take up once grown</span></div>
    <ul class="list">${mine.map(({ e, p }) => { const c = treeCO2(p), h = lastHeight(e); return `<li class="irow"><img src="${thumb(p.id)}" alt="" width="48" height="48"><div><a href="#/plant/${p.id}"><b>${esc(p.name)}</b></a><br><span class="muted small">${treeAge(e)}${h ? ` · ${fmt(h.cm)} cm tall` : ''} · ${e.log.length} photo${e.log.length === 1 ? '' : 's'}</span></div><div class="n">${c ? (c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])}–${fmt(c[1])}`) : '–'} kg<span>CO2 a year, grown</span></div></li>`; }).join('')}</ul>
    ${note}</section>`;
}

// round goals that move on as you pass them
const goalFor = (v, steps) => steps.find((s) => s > v) ?? Math.ceil((v + 1) / steps.at(-1)) * steps.at(-1);

export default async function impact(main) {
  const D = await data();
  const rows = state.garden.map((e) => {
    const p = plantById(e.id); if (!p) return null;
    const kg = (e.harvests || []).reduce((s, h) => s + h.g, 0) / 1000;
    const picks = (e.harvests || []).length;
    const tr = trip(p, state.region);
    return { p, kg, picks, photos: e.log.length, miles: tr ? Math.round(tr.crowMi * picks) : 0, co2g: tr ? Math.round(tr.co2Transport * kg * 1000) : 0, tr };
  }).filter(Boolean);
  // totals are the sums of the rounded rows shown below
  const tot = rows.reduce((a, r) => ({ kg: a.kg + Math.round(r.kg * 100) / 100, miles: a.miles + r.miles, co2g: a.co2g + r.co2g, picks: a.picks + r.picks, photos: a.photos + r.photos }), { kg: 0, miles: 0, co2g: 0, picks: 0, photos: 0 });
  const gM = goalFor(tot.miles, [100, 500, 1000, 5000, 10000]), gC = goalFor(tot.co2g, [100, 500, 1000, 5000]), gK = goalFor(tot.kg, [1, 5, 10, 25, 50]);
  const facts = [...(D.home_facts || []), ...(D.context_facts || [])].slice(0, 6);
  const region = D.regions[state.region]?.name || 'your country';
  // for a new grower: what one harvest of a few popular plants would save where they live
  const examples = ['tomato', 'strawberry', 'lettuce', 'apple', 'blueberry', 'pepper'].map(plantById).filter(Boolean).map((p) => ({ p, tr: trip(p, state.region) })).filter((x) => x.tr);
  const bar = (v, g) => `<div class="progress" aria-hidden="true"><i style="transform:scaleX(${Math.min(1, v / g)})"></i></div>`;

  main.innerHTML = `
  <div class="page">
    <header class="page-head"><h1>Your impact</h1><p class="muted">${tot.picks ? `From ${tot.picks} harvest${tot.picks === 1 ? '' : 's'} you logged, compared with the shop version in ${esc(region)}.` : `Tap “Picked some” on a plant when you harvest it, and your savings add up here. Compared with the shop version in ${esc(region)}.`}</p></header>
    <section class="card">
      <div class="ibars">
        <div class="ibar"><span class="muted small">Food miles skipped</span><b>${fmt(tot.miles)}</b>${bar(tot.miles, gM)}<span class="muted small">Next goal ${fmt(gM)} miles · <a class="how" href="#/sources">How we count</a></span></div>
        <div class="ibar"><span class="muted small">Travel CO2e skipped</span><b>${fmt(tot.co2g)} g</b>${bar(tot.co2g, gC)}<span class="muted small">Next goal ${fmt(gC)} g · <a class="how" href="#/sources">How we count</a></span></div>
        <div class="ibar"><span class="muted small">Food you grew</span><b>${fmt(tot.kg, tot.kg && tot.kg < 10 ? 2 : 0)} kg</b>${bar(tot.kg, gK)}<span class="muted small">Next goal ${fmt(gK)} kg · ${tot.photos} photo${tot.photos === 1 ? '' : 's'} taken</span></div>
      </div>
    </section>
    ${treesCard(D)}
    <div class="about-grid">
      <section class="card">
        <div class="card-head"><h2>${rows.length ? 'By plant' : 'What one harvest saves'}</h2><span class="muted small">${esc(region)}</span></div>
        <ul class="list">${rows.length ? rows.map((r) => `
          <li class="irow"><img src="${thumb(r.p.id)}" alt="" width="48" height="48"><div><b>${esc(r.p.name)}</b><br><span class="muted small">${r.picks} harvest${r.picks === 1 ? '' : 's'} · ${fmt(r.kg, 2)} kg</span></div><div class="n">${fmt(r.miles)} mi<span>${fmt(r.co2g)} g CO2e</span></div></li>`).join('')
          : examples.map((x) => `
          <li class="irow"><img src="${thumb(x.p.id)}" alt="" width="48" height="48"><div><a href="#/plant/${x.p.id}"><b>${esc(x.p.name)}</b></a><br><span class="muted small">Shop one comes from ${esc(x.tr.o.origin_country)}</span></div><div class="n">${fmt(x.tr.crowMi)} mi<span>per harvest</span></div></li>`).join('')}</ul>
      </section>
      <section class="card">
        <div class="card-head"><h2>Good to know</h2><a href="#/sources">Sources</a></div>
        <ul class="facts-list">${facts.map((f) => `<li>${esc(f.text)}<small>${(f.sources || []).map((s) => esc(s.publisher || s.title)).join(', ')}</small></li>`).join('')}</ul>
      </section>
    </div>
  </div>`;
}
