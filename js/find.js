// Find a plant (search + filters) and the plant page (3D at any stage, the harvest up close, miles, kcal, goodness, sources).
import { $, $$, esc, fmt, data, plantById, trip, state, save, addToGarden, toast } from './core.js?v=3';

const GROUPS = [['all', 'All'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['herb', 'Herbs'], ['tree', 'Trees'], ['easy', 'Easy to grow'], ['pot', 'Grows in a pot']];
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days` : p.group === 'tree' ? 'Grows for years' : 'Next season'; };
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export async function findView(main, q0 = '') {
  const D = await data();
  const N = D.plants.length;
  let group = 'all';
  main.innerHTML = `
  <div class="page-head"><div><h1>Find a plant</h1><p>${N} plants, from windowsill herbs to trees. Pick one to see it fully grown and how far the shop one travels.</p></div></div>
  <div class="find-tools">
    <label class="search"><span class="vh">Search plants</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
      <input id="q" type="search" placeholder="Try tomato, berries or birch" value="${esc(q0)}" enterkeyhint="search" autocomplete="off">
    </label>
    <div class="chips" role="group" aria-label="Filter plants">${GROUPS.map(([k, t]) => `<button class="chip" data-g="${k}" aria-pressed="${k === 'all'}">${t}</button>`).join('')}</div>
  </div>
  <p class="vh" role="status" id="count"></p>
  <div class="packets" id="list"></div>`;
  const list = $('#list');
  const { plantThumb } = await import('./viewer.js?v=3');
  let countT, drawToken = 0;
  function render() {
    const q = norm($('#q').value);
    const hits = D.plants.filter((p) => {
      if (group === 'easy' && p.grow?.difficulty !== 'easy') return false;
      if (group === 'pot' && !p.grow?.container_ok) return false;
      if (!['all', 'easy', 'pot'].includes(group) && p.group !== group) return false;
      if (!q) return true;
      const hay = norm([p.name, p.id, p.grow?.scientific, ...(p.aliases || []), p.group === 'fruit' ? 'berries fruit' : '', p.group === 'tree' ? 'tree' : '', p.group === 'herb' ? 'herb' : ''].join(' '));
      return q.split(/\s+/).every((w) => hay.includes(w.replace(/(ies|es|s)$/, '')));
    });
    clearTimeout(countT); countT = setTimeout(() => { $('#count').textContent = `${hits.length} plant${hits.length === 1 ? '' : 's'}`; }, 300);
    if (!hits.length) {
      const lab = GROUPS.find(([k]) => k === group)[1].toLowerCase();
      list.innerHTML = `<p class="no-hits">${group === 'all' ? `No plant called “${esc($('#q').value)}” yet. Try a vegetable, fruit, herb or tree.` : `No ${esc(lab)} match “${esc($('#q').value)}”. Try All.`}</p>`;
      return;
    }
    list.innerHTML = hits.map((p) => `
      <a class="pk" href="#/plant/${p.id}">
        <div class="pk-art"><img alt="" data-thumb="${p.id}" width="360" height="360"></div>
        ${p.grow?.difficulty === 'easy' ? '<span class="pk-tag">Easy</span>' : ''}
        <div class="pk-body"><b>${esc(p.name)}</b><span>${daysText(p)}</span></div>
      </a>`).join('');
    const my = ++drawToken;
    (async () => { for (const img of $$('[data-thumb]', list)) { if (my !== drawToken || !img.isConnected) return; img.src = await plantThumb(img.dataset.thumb); await new Promise((r) => setTimeout(r, 0)); } })();
  }
  $('#q').addEventListener('input', render);
  $$('[data-g]').forEach((b) => b.addEventListener('click', () => { group = b.dataset.g; $$('[data-g]').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  render();
  return { unmount() { drawToken++; } };
}

const STAGES = [[.04, 'Seed'], [.15, 'Sprout'], [.45, 'Young plant'], [.66, 'Flowering'], [1, 'Fully grown']];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function plantView(main, id) {
  const D = await data();
  const p = plantById(id);
  if (!p) { location.hash = '#/find'; return; }
  const g = p.grow || {};
  const isTree = p.group === 'tree';
  const south = state.region === 'AU';
  const sow = (south ? g.sow_months_south : g.sow_months_north) || g.plant_months_north || [];
  const srcs = new Map();
  const add = (arr) => (arr || []).forEach((s) => s?.url && !srcs.has(s.url) && srcs.set(s.url, s));
  add(g.sources); add(p.carbon?.sources); add(p.home_vs_shop?.sources); add(p.tree?.sources);
  Object.values(p.origins || {}).forEach((o) => add(o.sources));
  if (p.fdc?.url) add([{ title: `FoodData Central: ${p.fdc.description || p.name}`, publisher: 'USDA', url: p.fdc.url }]);
  const inGarden = () => state.garden.some((e) => e.id === id);
  const fact = (k, v) => (v == null || v === '' ? '' : `<div><dt>${k}</dt><dd>${v}</dd></div>`);
  const hasRegion = Object.keys(p.origins || {}).length > 0;

  main.innerHTML = `
  <div class="detail">
    <div class="detail-stage" id="stage-box">
      <div class="stage3d" id="plant-stage"></div>
      <div class="stage-top">
        <a class="pill" href="#/find" aria-label="Back to all plants"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>All plants</a>
        <div class="seg" role="group" aria-label="What to show"><button aria-pressed="true" data-mode="plant">Plant</button><button aria-pressed="false" data-mode="harvest" id="harvest-btn">Harvest</button></div>
      </div>
      <div class="stage-bottom" id="grow-ui">
        <label for="stage">Growth <span id="stage-name">Fully grown</span></label>
        <input id="stage" type="range" min="0" max="4" step="1" value="4" aria-valuetext="Fully grown">
      </div>
      <div class="stage-bottom" id="harvest-ui" hidden><p style="padding-bottom:6px"><b id="h-label"></b> <span class="muted" id="h-size"></span></p></div>
    </div>
    <div>
      <h1>${esc(p.name)}</h1>
      <p class="sci">${esc(g.scientific || '')}</p>
      ${p.kid_fact ? `<p class="kid">${esc(p.kid_fact)}</p>` : ''}
      <div class="detail-actions">
        <button class="btn btn-accent" id="grow">${inGarden() ? 'Open in my garden' : 'Grow this'}</button>
        ${hasRegion ? `<label class="select"><span class="vh">Where you live</span><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="stats" id="stats"></div>
      <dl class="facts">
        ${fact('Time to harvest', g.days_to_harvest ? `${g.days_to_harvest[0]}–${g.days_to_harvest[1]} days` : g.days_basis ? esc(g.days_basis) : isTree ? 'Years' : null)}
        ${g.days_to_harvest && g.days_basis ? fact('Counted', esc(g.days_basis)) : ''}
        ${fact('Sun', g.sun ? esc(g.sun === 'full' ? 'Full sun' : g.sun === 'partial' ? 'Some shade is fine' : g.sun) : null)}
        ${fact('Water', g.water ? esc(({ low: 'A little', med: 'Regular', medium: 'Regular', high: 'Lots' })[g.water] || g.water) : null)}
        ${fact('In a pot', g.container_ok == null ? null : g.container_ok ? (g.min_pot_l ? `Yes, ${fmt(g.min_pot_l)} litres or more` : 'Yes') : 'Better in the ground')}
        ${fact('Grows to', g.height_cm ? `${fmt(g.height_cm[0])}–${fmt(g.height_cm[1])} cm` : p.tree?.height_m ? `${esc(String(p.tree.height_m))} m` : null)}
        ${fact('Difficulty', g.difficulty ? esc(g.difficulty[0].toUpperCase() + g.difficulty.slice(1)) : null)}
        ${sow.length ? fact(g.sow_months_north ? 'Sow in' : 'Plant in', sow.map((m) => MONTHS[m - 1]).join(', ') + (south ? ' (southern)' : '')) : ''}
      </dl>
      ${g.tips?.length ? `<ul class="tips">${g.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${inGarden() ? '<p style="margin-top:16px"><button class="btn btn-line btn-sm" id="remove">Remove from my garden</button></p>' : ''}
      <details class="srcs"><summary>Sources (${srcs.size})</summary><ol>${[...srcs.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>, ${esc(s.publisher || '')}${s.quote ? `. <q>${esc(s.quote)}</q>` : ''}</li>`).join('')}</ol></details>
    </div>
  </div>`;

  const { createViewer } = await import('./viewer.js?v=3');
  const v = createViewer($('#plant-stage'), { controls: true });
  v.setPlant(id, 1);
  const slider = $('#stage');
  slider.addEventListener('input', () => {
    const [t, name] = STAGES[+slider.value];
    v.setPlant(id, t, { keepCamera: true });
    $('#stage-name').textContent = name; slider.setAttribute('aria-valuetext', name);
  });

  // the harvest, up close: one fruit, root, bunch or sprig at real size (from the 3D worker's fruit3d.js)
  let F = null;
  try { F = await import('./fruit3d.js'); if (!F.showHarvest) F = null; } catch { F = null; }
  if (!F) $('#harvest-btn').hidden = true;
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const harvest = b.dataset.mode === 'harvest';
    $$('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('#grow-ui').hidden = harvest; $('#harvest-ui').hidden = !harvest;
    if (harvest && F) {
      try {
        F.showHarvest(v, id);
        const info = F.harvestInfo?.(id) || {};
        $('#h-label').textContent = info.label || `The ${p.name.toLowerCase()} harvest`;
        $('#h-size').textContent = info.sizeCm ? `about ${fmt(info.sizeCm)} cm, shown at real size` : '';
      } catch { $('#h-label').textContent = 'Close-up not ready for this plant yet'; }
    } else { const [t] = STAGES[+slider.value]; v.setPlant(id, t); }
  }));

  function stats() {
    const reg = $('#region')?.value || state.region;
    const tr = trip(p, reg);
    const hv = p.home_vs_shop;
    let h = '';
    if (tr) {
      h += `<div class="stat green wide"><b>${fmt(tr.crowMi)} miles</b><span>Air miles from ${esc(tr.o.origin_place || tr.o.origin_country)}${tr.o.origin_place ? ', ' + esc(tr.o.origin_country) : ''} to ${esc(tr.reg.dest.name)}: where most ${esc(p.name.toLowerCase())} in ${esc(D.regions[reg].name)} shops comes from${tr.o.source_type === 'domestic' ? ' (grown in the country)' : ''}. Yours: 0 miles.</span></div>`;
      h += `<div class="stat"><b>${fmt((p.carbon?.kg_co2e_per_kg ?? 0) + tr.co2Transport, 2)} kg</b><span>CO2e per shop kilo: ${fmt(p.carbon?.kg_co2e_per_kg ?? 0, 2)} farming + ${fmt(tr.co2Transport, 2)} transport</span></div>`;
    } else if (hasRegion || p.carbon) {
      h += `<div class="stat wide"><b>Not sure yet</b><span>We couldn’t find a reliable source for where it comes from in ${esc(D.regions[reg]?.name || 'your country')}.</span></div>`;
    }
    if (p.kcal_per_100g != null) h += `<div class="stat"><b>${fmt(p.kcal_per_100g)} kcal</b><span>per 100 g, raw (USDA)</span></div>`;
    if (hv) {
      h += hv.verdict === 'more' && hv.healthier_pct
        ? `<div class="stat sun wide"><b>Fresher is better</b><span>${esc(hv.explanation)} Picked from your own plant, you eat it the same day.</span></div>`
        : `<div class="stat wide"><b>About the same</b><span>${esc(hv.explanation || 'Studies don’t show a clear difference for this one, so home-grown is about the same as the shop one.')}</span></div>`;
    }
    if (p.tree?.co2_kg_per_year != null) {
      const c = p.tree.co2_kg_per_year;
      h += `<div class="stat green wide"><b>${Array.isArray(c) ? (c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])}–${fmt(c[1])}`) : fmt(c)} kg</b><span>CO2 a mature tree takes from the air each year. ${esc(p.tree.note || '')}</span></div>`;
    }
    $('#stats').innerHTML = h;
  }
  $('#region')?.addEventListener('change', (e) => { state.region = e.target.value; save(); stats(); });
  stats();
  $('#grow').addEventListener('click', () => {
    const had = inGarden();
    addToGarden(id);
    if (!had) toast(`${p.name} planted. Snap your first photo to start your journal.`);
    location.hash = '#/';
  });
  $('#remove')?.addEventListener('click', async () => {
    if (!confirm(`Remove ${p.name} and its photos from this device?`)) return;
    const { removePlant } = await import('./garden.js?v=3');
    await removePlant(id); toast(`${p.name} removed.`); location.hash = '#/';
  });
  return { unmount() { v.dispose(); } };
}
