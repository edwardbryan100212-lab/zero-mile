// More: about Zero Mile, how the numbers are worked out, and every citation.
import { esc, fmt, data, ROOT } from './core.js?v=3';

export default async function sources(main) {
  const D = await data();
  const groups = { 'Where food comes from': new Map(), 'Food, energy and carbon': new Map(), 'Growing, trees and transport': new Map() };
  const add = (g, arr) => (arr || []).forEach((s) => s?.url && !groups[g].has(s.url) && groups[g].set(s.url, s));
  for (const p of D.plants) {
    Object.values(p.origins || {}).forEach((o) => add('Where food comes from', o.sources));
    add('Food, energy and carbon', p.carbon?.sources); add('Food, energy and carbon', p.home_vs_shop?.sources);
    if (p.fdc?.url) add('Food, energy and carbon', [{ title: `FoodData Central: ${p.fdc.description}`, publisher: 'USDA', url: p.fdc.url }]);
    add('Growing, trees and transport', p.grow?.sources); add('Growing, trees and transport', p.tree?.sources);
  }
  Object.values(D.emission).forEach((e) => add('Growing, trees and transport', e.sources));
  add('Growing, trees and transport', [D.circuity_source]);
  const facts = [...D.context_facts, ...D.home_facts];
  facts.forEach((f) => add('Growing, trees and transport', f.sources));
  const ef = D.emission;
  main.innerHTML = `
  <div class="page-head"><div><h1>Sources and about</h1><p>Every number in Zero Mile comes from a source below. We downloaded them once into the app, so it never pulls from these websites while you use it.</p></div></div>
    <div class="src-art"><img src="${new URL('img/px/birch.png', ROOT).href}" alt="Silver birch woodland, in pixel blocks" width="200" height="133"></div>
    <div class="card" style="margin-bottom:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between"><p><b>Zero Mile</b> is free, for every age, and keeps your photos on your device.</p><a class="btn btn-sm btn-line" href="${new URL('./', ROOT).href}">About Zero Mile</a></div>
    <div class="card method">
      <h2>How the numbers are worked out</h2>
      <p><b>Where it comes from.</b> For each plant and country we use the single biggest source of what shops sell: home-grown if the country grows most of its own, otherwise the top import partner by weight in recent trade data. Some records are marked low confidence on the page; herbs like basil and mint have no trade codes of their own.</p>
      <p><b>Air miles</b> are the straight line from the growing area to ${esc(D.regions.IE.dest.name)} (Ireland), ${esc(D.regions.UK.dest.name)} (UK), ${esc(D.regions.US.dest.name)}, ${esc(D.regions.DE.dest.name)}, ${esc(D.regions.HK.dest.name)} or ${esc(D.regions.AU.dest.name)}. Real routes are longer, so for carbon we multiply by ${D.circuity}, a commonly used road circuity factor (Ballou and others, 2002, give country factors around this value; it is an approximation).</p>
      <p><b>Transport carbon</b> uses UK government freight factors per tonne-kilometre: lorry ${fmt(ef.hgv.value, 3)}, ship ${fmt(ef.ship.value, 3)}, roll-on roll-off ferry ${fmt(ef.ferry.value, 3)}, rail ${fmt(ef.rail.value, 3)}, long-haul air ${fmt(ef.air_long.value, 3)} kg CO2e. Trips by sea or ferry are split between legs (for example 85% road and 15% ferry); these splits are our estimate.</p>
      <p><b>Trees.</b> The 22 kg a year for birch and oak is the European Environment Agency’s figure for a typical mature tree, not a species measurement. The lemon figure comes from the Spanish lemon industry body and is not peer reviewed.</p>
      <p><b>Fact check.</b> A separate reviewer re-opened the sources for the most-seen numbers (origins, carbon, freight, calories, nutrient loss, trees) and confirmed 51 of 53; the one wrong citation was fixed.</p>
      <p><b>Farm carbon</b> is the global average per kilo from Poore and Nemecek (2018), via Our World in Data. Growing at home still has a small footprint (compost, pots, water), so we never say it is zero; only the miles are.</p>
      <p><b>Goodness.</b> Where studies measured nutrients lost while vegetables are stored (for example vitamin C in spinach after a week in the fridge), we quote that number. Where no study gives a number for that crop, we say “about the same”.</p>
      <p><b>Photo check.</b> Your photos never leave your device. The colour check counts green, yellowing and brown leaf pixels. The optional smart check downloads an open CLIP model (from Hugging Face) into your browser once. Both are friendly guesses, not a plant doctor.</p>
      <p><b>Pictures</b> are AI illustrations made with Comfy (Seedream) and printed in Ditherlab. The 3D plants are drawn in code.</p>
    </div>
    <div class="src-list">
      <details open><summary>Quick facts</summary><ol>${facts.map((f) => `<li>${esc(f.text)} <small>${(f.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ')}</small></li>`).join('')}</ol></details>
      ${Object.entries(groups).map(([g, m]) => `<details><summary>${g} (${m.size})</summary><ol>${[...m.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${esc(s.publisher || '')}${s.accessed ? `, accessed ${esc(s.accessed)}` : ''}</small></li>`).join('')}</ol></details>`).join('')}
    </div>`;
}
