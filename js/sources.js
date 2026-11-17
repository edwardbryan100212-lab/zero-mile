// About: settings, how the numbers are worked out, and every citation.
import { $, esc, fmt, data, ROOT, state, save, toast } from './core.js?v=5';

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
  let credits = [];
  try { const m = await fetch(new URL('models/manifest.json?v=5', ROOT)).then((r) => (r.ok ? r.json() : null)); credits = m?.credits || []; } catch { /* no downloaded models yet */ }
  const ef = D.emission;
  const total = [...Object.values(groups)].reduce((s, m) => s + m.size, 0);

  main.innerHTML = `
  <div class="page">
    <header class="page-head"><h1>About and sources</h1><p class="muted">Zero Mile is free, for every age, and keeps your photos on your device. Every number comes from one of ${total} sources below, saved into the app so it never pulls from those websites while you use it.</p></header>
    <div class="about-grid">
      <div style="display:grid;gap:16px">
        <section class="card">
          <h2 style="margin-bottom:6px">Settings</h2>
          <div class="setting"><span>Where you live</span><label class="select"><span class="vh">Where you live</span><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label></div>
          <label class="toggle setting"><input type="checkbox" id="smart"${state.smartAI ? ' checked' : ''}><span>Smart photo check (downloads a 90 MB model once, runs on your device)</span></label>
          <div class="setting"><span>Plants in your garden</span><b>${state.garden.length}</b></div>
        </section>
        <section class="card">
          <h2 style="margin-bottom:6px">Install the app</h2>
          <p class="muted small">On iPhone: tap Share, then “Add to Home Screen”. On a Mac or PC: in Chrome or Edge, choose “Install Zero Mile” in the address bar. It then works without the internet.</p>
          <p style="margin-top:12px"><a class="btn btn-sm btn-soft" href="${new URL('./', ROOT).href}">Visit the Zero Mile website</a></p>
        </section>
      </div>
      <div style="display:grid;gap:16px">
        <section class="card method">
          <h2 style="margin-bottom:10px">How the numbers are worked out</h2>
          <p><b>Where it comes from.</b> For each plant and country we use the single biggest source of what shops sell: home-grown if the country grows the most, otherwise the top import partner by weight in recent trade data. Some are marked low confidence; herbs have no trade codes of their own.</p>
          <p><b>Air miles</b> are the straight line from the growing area to ${esc(D.regions.IE.dest.name)}, ${esc(D.regions.UK.dest.name)}, ${esc(D.regions.US.dest.name)}, ${esc(D.regions.DE.dest.name)}, ${esc(D.regions.HK.dest.name)} or ${esc(D.regions.AU.dest.name)}. Real routes are longer, so for carbon we multiply by ${D.circuity}, a common road detour factor.</p>
          <p><b>Travel carbon</b> uses UK government freight factors per tonne-kilometre: lorry ${fmt(ef.hgv.value, 3)}, ship ${fmt(ef.ship.value, 3)}, ferry ${fmt(ef.ferry.value, 3)}, rail ${fmt(ef.rail.value, 3)}, long-haul air ${fmt(ef.air_long.value, 3)} kg CO2e.</p>
          <p><b>Farm carbon</b> is the world average per kilo from Poore and Nemecek (2018), via Our World in Data. Growing at home still has a small footprint, so we never say it is zero: only the miles are.</p>
          <p><b>Goodness.</b> Where studies measured nutrients lost in storage (like vitamin C in spinach after a week in the fridge), we quote that number. Otherwise we say “about the same”.</p>
          <p><b>Photo check.</b> Your photos never leave your device. It counts green, yellowing and brown leaf colours. It’s a friendly guess, not a plant doctor.</p>
          <p><b>Pictures and 3D.</b> Photos on the website are AI illustrations made with Comfy and printed in Ditherlab. Some 3D models are drawn in code${credits.length ? '; others are free models credited below' : ''}.</p>
        </section>
        <section class="card">
          <details class="src-group" open><summary>Quick facts</summary><ol>${facts.map((f) => `<li>${esc(f.text)} <small>${(f.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ')}</small></li>`).join('')}</ol></details>
          ${Object.entries(groups).map(([g, m]) => `<details class="src-group"><summary>${g} <span class="muted small">${m.size}</span></summary><ol>${[...m.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${esc(s.publisher || '')}${s.accessed ? `, accessed ${esc(s.accessed)}` : ''}</small></li>`).join('')}</ol></details>`).join('')}
          ${credits.length ? `<details class="src-group"><summary>3D model credits <span class="muted small">${credits.length}</span></summary><ol>${credits.map((c) => `<li>${typeof c === 'string' ? esc(c) : `${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.name || c.url)}</a>` : esc(c.title || c.name || '')}<small>${esc([c.author, c.license].filter(Boolean).join(', '))}</small>`}</li>`).join('')}</ol></details>` : ''}
        </section>
      </div>
    </div>
  </div>`;
  $('#region').addEventListener('change', (e) => { state.region = e.target.value; save(); toast(`Food miles now for ${D.regions[e.target.value].name}.`); });
  $('#smart').addEventListener('change', async (e) => { state.smartAI = e.target.checked; save(); if (state.smartAI) (await import('./analyze.js?v=2')).loadSmart().catch(() => toast('Couldn’t download the smart check. The colour check still works.')); });
}
