// About: settings, how the numbers are worked out, and every citation.
import { $, esc, fmt, data, ROOT, state, save, toast } from './core.js?v=9';
import { setSound, setHaptics, play } from './sound.js?v=9';
import { icon } from './find.js?v=9';

// what the pictures are (check img/game/ before changing: AI game art must be credited if it comes back)
const ART_NOTE = 'Plant photos in the app are real, open-licence pictures from Wikimedia Commons and Openverse, credited below. Pip, the icons and the drawings are made in code.';

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

  const srcList = (m) => `<ol>${[...m.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${esc(s.publisher || '')}${s.accessed ? `, accessed ${esc(s.accessed)}` : ''}</small></li>`).join('')}</ol>`;
  const tog = (id, ic, label, sub, on) => `<label class="row3 tog3">${icon(ic)}<span>${label}<small>${sub}</small></span><input type="checkbox" role="switch" id="${id}"${on ? ' checked' : ''}><i aria-hidden="true"></i></label>`;
  main.innerHTML = `
  <div class="page s3 ab3">
    <header class="s3-head">
      <h1>About</h1><p>Free, private and for all ages. Nothing you add leaves this device.</p>
    </header>
    <ul class="c3 ab3-nums" aria-label="Zero Mile in numbers">
      <li><span>Plants and trees</span><b>${D.plants.length}</b></li>
      <li><span>Cited sources</span><b>${total}</b></li>
      <li><span>Uploads</span><b>0</b></li>
    </ul>
    <div class="ab3-grid">
      <section class="ab3-set" aria-labelledby="set-t">
        <h2 id="set-t">Settings</h2>
        <div class="c3 rows3">
          <div class="row3">${icon('pin')}<label for="region">Where you live<small>Sets food miles and planting months</small></label><span class="sel3"><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></span></div>
          ${tog('smart', 'camera', 'Smart photo check', '90 MB, runs on this device', state.smartAI)}
          ${tog('snd', 'speaker', 'Sounds', 'Chimes and pops', state.sound !== false)}
          ${tog('hap', 'vibrate', 'Vibration', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Off while reduce motion is on' : 'On phones that buzz', state.haptics !== false)}
          <div class="row3">${icon('sprout')}<span>My plants</span><b class="row3-n">${state.garden.length}</b></div>
        </div>
        <h2>App</h2>
        <div class="c3 rows3">
          <details class="row3 det3"><summary>${icon('download')}<span>Install the app</span></summary><p>iPhone: Share, then “Add to Home Screen”. Mac or PC: “Install” in the address bar.</p></details>
          <a class="row3 go3" href="${new URL('./', ROOT).href}">${icon('globe')}<span>Zero Mile website</span></a>
          <a class="row3 go3" href="#/admin">${icon('tool')}<span>Admin and demo tools</span></a>
        </div>
      </section>
      <section class="ab3-src" aria-labelledby="src-t">
        <h2 id="src-t">How we know</h2>
        <div class="c3 rows3">
          <details class="src3"><summary><span>How we count</span></summary>
          <div class="src3-in">
          <p><b>Where it comes from.</b> For each plant and country we use the single biggest source of what shops sell: home-grown if the country grows the most, otherwise the top import partner by weight in recent trade data. Some are marked low confidence; herbs have no trade codes of their own.</p>
          <p><b>Air miles</b> are the straight line from the growing area to ${esc(D.regions.IE.dest.name)}, ${esc(D.regions.UK.dest.name)}, ${esc(D.regions.US.dest.name)}, ${esc(D.regions.DE.dest.name)}, ${esc(D.regions.HK.dest.name)} or ${esc(D.regions.AU.dest.name)}. Real routes are longer, so for carbon we multiply by ${D.circuity}, a common road detour factor.</p>
          <p><b>Travel carbon</b> uses UK government freight factors per tonne-kilometre: lorry ${fmt(ef.hgv.value, 3)}, ship ${fmt(ef.ship.value, 3)}, ferry ${fmt(ef.ferry.value, 3)}, rail ${fmt(ef.rail.value, 3)}, long-haul air ${fmt(ef.air_long.value, 3)} kg CO2e.</p>
          <p><b>Farm carbon</b> is the world average per kilo from Poore and Nemecek (2018), via Our World in Data. Growing at home still has a small footprint, so we never say it is zero: only the miles are.</p>
          <p><b>Trees.</b> Planting months, sizes, spacing, first fruit and care in the first three years come from the RHS, the Woodland Trust, university extension guides and government agencies. “Grows well here” ratings cite a reason, such as native range, winter cold or frost. The CO2 figure is an estimate: the European Commission and the European Environment Agency give about 22 kg of CO2 a year for a mature tree, on average. Real trees vary with species, size and site, and young trees take up less.</p>
          <p><b>Goodness.</b> Where studies measured nutrients lost in storage (like vitamin C in spinach after a week in the fridge), we quote that number. Otherwise we say “about the same”.</p>
          <p><b>Photo check.</b> Your photos never leave your device. It counts green, yellowing and brown leaf colours. It’s a friendly guess, not a plant doctor.</p>
          <p><b>Pictures and 3D.</b> ${ART_NOTE}${credits.length ? ' Some 3D models are drawn in code; others are free models credited below.' : ' The 3D models are drawn in code.'}</p>
          </div></details>
          <details class="src3"><summary><span>Quick facts</span><b class="n3">${facts.length}</b></summary><ol>${facts.map((f) => `<li>${esc(f.text)} <small>${(f.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a>`).join(', ')}</small></li>`).join('')}</ol></details>
          ${Object.entries(groups).map(([g, m]) => `<details class="src3"><summary><span>${g}</span><b class="n3">${m.size}</b></summary>${srcList(m)}</details>`).join('')}
        </div>
        <h2>Credits</h2>
        <div class="c3 rows3">
          ${photos.length ? `<details class="src3"><summary><span>Plant photos</span><b class="n3">${photos.length}</b></summary><ol>${photos.map((c) => `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.id)}</a>` : esc(c.title || c.id)}<small>${esc([c.author, c.license].filter(Boolean).join(', '))}</small></li>`).join('')}</ol></details>` : ''}
          ${credits.length ? `<details class="src3"><summary><span>3D models</span><b class="n3">${credits.length}</b></summary><ol>${credits.map((c) => `<li>${typeof c === 'string' ? esc(c) : `${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.name || c.url)}</a>` : esc(c.title || c.name || '')}<small>${esc([c.author, c.license].filter(Boolean).join(', '))}</small>`}</li>`).join('')}</ol></details>` : ''}
        </div>
      </section>
    </div>
  </div>`;
  $('#region').addEventListener('change', (e) => { state.region = e.target.value; save(); toast(`Food miles now for ${D.regions[e.target.value].name}.`); });
  $('#snd').addEventListener('change', (e) => setSound(e.target.checked));
  $('#hap').addEventListener('change', (e) => setHaptics(e.target.checked));
  $('#smart').addEventListener('change', async (e) => { state.smartAI = e.target.checked; save(); play('toggle'); if (state.smartAI) (await import('./analyze.js?v=2')).loadSmart().catch(() => toast('Couldn’t download the smart check. The colour check still works.')); });
}
