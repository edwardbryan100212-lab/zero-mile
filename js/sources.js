// About: settings, how the numbers are worked out, and every citation.
import { $, esc, fmt, data, ROOT, state, save, toast } from './core.js?v=9';
import { art, mascot } from './art.js?v=9';

const SRC_ART = { 'Where food comes from': 'map-pin', 'Food, energy and carbon': 'cloud-co2', 'Trees and planting': 'tree', 'Growing, trees and transport': 'lorry' };

export default async function sources(main) {
  const D = await data();
  const groups = { 'Where food comes from': new Map(), 'Food, energy and carbon': new Map(), 'Trees and planting': new Map(), 'Growing, trees and transport': new Map() };
  const add = (g, arr) => (arr || []).forEach((s) => s?.url && !groups[g].has(s.url) && groups[g].set(s.url, s));
  for (const p of D.plants) {
    Object.values(p.origins || {}).forEach((o) => add('Where food comes from', o.sources));
    add('Food, energy and carbon', p.carbon?.sources); add('Food, energy and carbon', p.home_vs_shop?.sources);
    if (p.fdc?.url) add('Food, energy and carbon', [{ title: `FoodData Central: ${p.fdc.description}`, publisher: 'USDA', url: p.fdc.url }]);
    add('Growing, trees and transport', p.grow?.sources); add('Trees and planting', p.tree?.sources);
  }
  const ts = D.trees || {};
  Object.values(ts.season || {}).forEach((s) => add('Trees and planting', s.sources));
  add('Trees and planting', ts.carbon_note?.sources);
  Object.values(D.emission).forEach((e) => add('Growing, trees and transport', e.sources));
  add('Growing, trees and transport', [D.circuity_source]);
  const facts = [...D.context_facts, ...D.home_facts];
  facts.forEach((f) => add('Growing, trees and transport', f.sources));
  let credits = [];
  try { const m = await fetch(new URL('models/manifest.json?v=5', ROOT)).then((r) => (r.ok ? r.json() : null)); credits = m?.credits || []; } catch { /* no downloaded models yet */ }
  let photos = [];
  try { photos = await (await import('./photos.js?v=9')).photoCredits(); } catch { /* no photo credits file */ }
  const ef = D.emission;
  const total = [...Object.values(groups)].reduce((s, m) => s + m.size, 0);

  main.innerHTML = `
  <div class="page s3 ab3">
    <header class="ab3-head">
      <div class="ab3-pip">${mascot('wave', { size: 96 })}</div>
      <div><h1>About</h1><p>Free · private · for all ages</p></div>
    </header>
    <ul class="ab3-nums" aria-label="Zero Mile in numbers">
      <li class="leaf">${art('tree', { size: 48 })}<b>${D.plants.length}</b><span>plants</span></li>
      <li class="sky">${art('quest-learn', { size: 48 })}<b>${total}</b><span>sources</span></li>
      <li class="berry">${art('lock', { size: 48 })}<b>0</b><span>uploads</span></li>
    </ul>
    <div class="ab3-grid">
      <section class="ab3-set" aria-labelledby="set-t">
        <h2 id="set-t">Settings</h2>
        <div class="row3 c3">${art('map-pin', { size: 44 })}<label for="region">Where you live</label><span class="sel3"><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></span></div>
        <label class="row3 c3 tog3">${art('camera', { size: 44 })}<span>Smart photo check<small>90 MB, on this device</small></span><input type="checkbox" role="switch" id="smart"${state.smartAI ? ' checked' : ''}><i aria-hidden="true"></i></label>
        <div class="row3 c3">${art('scene-garden', { size: 44 })}<span>My plants</span><b class="row3-n">${state.garden.length}</b></div>
        <h2>App</h2>
        <details class="row3 c3 det3"><summary>${art('gift', { size: 44 })}<span>Install the app</span></summary><p>iPhone: Share, then “Add to Home Screen”. Mac or PC: “Install” in the address bar.</p></details>
        <a class="row3 c3 go3" href="${new URL('./', ROOT).href}">${art('star', { size: 44 })}<span>Zero Mile website</span></a>
        <a class="row3 c3 go3" href="#/admin">${art('chest', { size: 44 })}<span>Admin and demo tools</span></a>
      </section>
      <section class="ab3-src" aria-labelledby="src-t">
        <h2 id="src-t">How we know</h2>
          <details class="src3 c3"><summary>${art('quest-learn', { size: 40 })}<span>How we count</span></summary>
          <p><b>Where it comes from.</b> For each plant and country we use the single biggest source of what shops sell: home-grown if the country grows the most, otherwise the top import partner by weight in recent trade data. Some are marked low confidence; herbs have no trade codes of their own.</p>
          <p><b>Air miles</b> are the straight line from the growing area to ${esc(D.regions.IE.dest.name)}, ${esc(D.regions.UK.dest.name)}, ${esc(D.regions.US.dest.name)}, ${esc(D.regions.DE.dest.name)}, ${esc(D.regions.HK.dest.name)} or ${esc(D.regions.AU.dest.name)}. Real routes are longer, so for carbon we multiply by ${D.circuity}, a common road detour factor.</p>
          <p><b>Travel carbon</b> uses UK government freight factors per tonne-kilometre: lorry ${fmt(ef.hgv.value, 3)}, ship ${fmt(ef.ship.value, 3)}, ferry ${fmt(ef.ferry.value, 3)}, rail ${fmt(ef.rail.value, 3)}, long-haul air ${fmt(ef.air_long.value, 3)} kg CO2e.</p>
          <p><b>Farm carbon</b> is the world average per kilo from Poore and Nemecek (2018), via Our World in Data. Growing at home still has a small footprint, so we never say it is zero: only the miles are.</p>
          <p><b>Trees.</b> Planting months, sizes, spacing, first fruit and care in the first three years come from the RHS, the Woodland Trust, university extension guides and government agencies. “Grows well here” ratings cite a reason, such as native range, winter cold or frost. The CO2 figure is an estimate: the European Commission and the European Environment Agency give about 22 kg of CO2 a year for a mature tree, on average. Real trees vary with species, size and site, and young trees take up less.</p>
          <p><b>Goodness.</b> Where studies measured nutrients lost in storage (like vitamin C in spinach after a week in the fridge), we quote that number. Otherwise we say “about the same”.</p>
          <p><b>Photo check.</b> Your photos never leave your device. It counts green, yellowing and brown leaf colours. It’s a friendly guess, not a plant doctor.</p>
          <p><b>Pictures and 3D.</b> Plant photos in the app are real, open-licence pictures from Wikimedia Commons and Openverse, credited below. Close-up pictures on the website are AI illustrations made with Comfy, and some game pictures in the app (Pip’s poses, scenes and celebrations) are AI-made with Flux.2 on Comfy Cloud. The other drawings are made in code. Some 3D models are drawn in code${credits.length ? '; others are free models credited below' : ''}.</p>
          </details>
          <details class="src3 c3"><summary>${art('star', { size: 40 })}<span>Quick facts</span><b class="tag3">${facts.length}</b></summary><ol>${facts.map((f) => `<li>${esc(f.text)} <small>${(f.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ')}</small></li>`).join('')}</ol></details>
          ${Object.entries(groups).map(([g, m]) => `<details class="src3 c3"><summary>${art(SRC_ART[g] || 'quest-learn', { size: 40 })}<span>${g}</span><b class="tag3">${m.size}</b></summary><ol>${[...m.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${esc(s.publisher || '')}${s.accessed ? `, accessed ${esc(s.accessed)}` : ''}</small></li>`).join('')}</ol></details>`).join('')}
          ${photos.length ? `<details class="src3 c3"><summary>${art('camera', { size: 40 })}<span>Plant photos</span><b class="tag3">${photos.length}</b></summary><ol>${photos.map((c) => `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.id)}</a>` : esc(c.title || c.id)}<small>${esc([c.author, c.license].filter(Boolean).join(', '))}</small></li>`).join('')}</ol></details>` : ''}
          ${credits.length ? `<details class="src3 c3"><summary>${art('gift', { size: 40 })}<span>3D models</span><b class="tag3">${credits.length}</b></summary><ol>${credits.map((c) => `<li>${typeof c === 'string' ? esc(c) : `${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.name || c.url)}</a>` : esc(c.title || c.name || '')}<small>${esc([c.author, c.license].filter(Boolean).join(', '))}</small>`}</li>`).join('')}</ol></details>` : ''}
      </section>
    </div>
  </div>`;
  $('#region').addEventListener('change', (e) => { state.region = e.target.value; save(); toast(`Food miles now for ${D.regions[e.target.value].name}.`); });
  $('#smart').addEventListener('change', async (e) => { state.smartAI = e.target.checked; save(); if (state.smartAI) (await import('./analyze.js?v=2')).loadSmart().catch(() => toast('Couldn’t download the smart check. The colour check still works.')); });
}
