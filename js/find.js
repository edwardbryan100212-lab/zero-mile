// Find a plant (search + filters) and the plant page (3D model, the harvest up close, sowing months, miles, kcal, goodness, sources).
import { $, $$, esc, fmt, data, plantById, trip, state, save, addToGarden, toast, ROOT, thumb } from './core.js?v=5';

const GROUPS = [['all', 'All'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['herb', 'Herbs'], ['tree', 'Trees'], ['easy', 'Easy'], ['pot', 'Grows in a pot'], ['now', 'Sow now']];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days` : p.group === 'tree' ? 'A tree for years' : 'Next season'; };
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const sowMonths = (p) => { const g = p.grow || {}; return state.region === 'AU' ? (g.sow_months_south || []) : [...new Set([...(g.sow_months_north || []), ...(g.plant_months_north || [])])].sort((a, b) => a - b); };
const changed = () => dispatchEvent(new Event('zm:garden'));

export async function findView(main, q0 = '') {
  const D = await data();
  const N = D.plants.length, now = new Date().getMonth() + 1;
  let group = 'all';
  main.innerHTML = `
  <div class="page">
    <header class="page-head"><h1>Find plants</h1><p class="muted">${N} plants, from windowsill herbs to trees. Tap one to see it fully grown and how far the shop one travels.</p></header>
    <div class="find-tools">
      <label class="search"><span class="vh">Search plants</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
        <input id="q" type="search" placeholder="Try tomato, berries or oak" value="${esc(q0)}" enterkeyhint="search" autocomplete="off">
      </label>
      <div class="chips" role="group" aria-label="Filter plants">${GROUPS.map(([k, t]) => `<button class="chip" data-g="${k}" aria-pressed="${k === 'all'}">${t}</button>`).join('')}</div>
    </div>
    <p class="vh" role="status" id="count"></p>
    <div class="grid" id="list"></div>
  </div>`;
  const list = $('#list');
  let countT;
  function render() {
    const q = norm($('#q').value);
    const hits = D.plants.filter((p) => {
      if (group === 'easy' && p.grow?.difficulty !== 'easy') return false;
      if (group === 'pot' && !p.grow?.container_ok) return false;
      if (group === 'now' && !sowMonths(p).includes(now)) return false;
      if (['veg', 'fruit', 'herb', 'tree'].includes(group) && p.group !== group) return false;
      if (!q) return true;
      const hay = norm([p.name, p.id, p.grow?.scientific, ...(p.aliases || []), p.group === 'fruit' ? 'berries fruit' : '', p.group === 'tree' ? 'tree' : '', p.group === 'herb' ? 'herb' : ''].join(' '));
      return q.split(/\s+/).every((w) => hay.includes(w.replace(/(ies|es|s)$/, '')));
    });
    clearTimeout(countT); countT = setTimeout(() => { $('#count').textContent = `${hits.length} plant${hits.length === 1 ? '' : 's'}`; }, 300);
    if (!hits.length) {
      const lab = GROUPS.find(([k]) => k === group)[1].toLowerCase();
      list.innerHTML = `<p class="no-hits">${group === 'all' ? `No plant called “${esc($('#q').value)}” yet. Try a vegetable, fruit, herb or tree.` : `No ${esc(lab)} plants match “${esc($('#q').value)}”. Try All.`}</p>`;
      return;
    }
    const mine = new Set(state.garden.map((e) => e.id));
    list.innerHTML = hits.map((p) => `
      <a class="pk" href="#/plant/${p.id}">
        <div class="pk-art"><img src="${thumb(p.id)}" alt="" width="200" height="200" loading="lazy"></div>
        ${mine.has(p.id) ? '<span class="pill ok">Growing</span>' : p.grow?.difficulty === 'easy' ? '<span class="pill">Easy</span>' : ''}
        <div class="pk-body"><b>${esc(p.name)}</b><span>${daysText(p)}</span></div>
      </a>`).join('');
  }
  $('#q').addEventListener('input', render);
  $$('[data-g]').forEach((b) => b.addEventListener('click', () => { group = b.dataset.g; $$('[data-g]').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  render();
}

const STAGES = [[.04, 'Seed'], [.15, 'Sprout'], [.45, 'Young plant'], [.66, 'Flowering'], [1, 'Fully grown']];

export async function plantView(main, id) {
  const D = await data();
  const p = plantById(id);
  if (!p) { location.hash = '#/find'; return; }
  const g = p.grow || {};
  const isTree = p.group === 'tree';
  const south = state.region === 'AU';
  const sow = sowMonths(p), now = new Date().getMonth() + 1;
  const srcs = new Map();
  const add = (arr) => (arr || []).forEach((s) => s?.url && !srcs.has(s.url) && srcs.set(s.url, s));
  add(g.sources); add(p.carbon?.sources); add(p.home_vs_shop?.sources); add(p.tree?.sources);
  Object.values(p.origins || {}).forEach((o) => add(o.sources));
  if (p.fdc?.url) add([{ title: `FoodData Central: ${p.fdc.description || p.name}`, publisher: 'USDA', url: p.fdc.url }]);
  const inGarden = () => state.garden.some((e) => e.id === id);
  const fact = (k, v) => (v == null || v === '' ? '' : `<div><dt>${k}</dt><dd>${v}</dd></div>`);
  const hasRegion = Object.keys(p.origins || {}).length > 0;

  main.innerHTML = `
  <div class="page">
    <div class="detail">
      <div class="stage-card" id="stage-box">
        <div class="stage3d" id="plant-stage"></div>
        <div class="stage-top">
          <a class="back" href="#/find" aria-label="Back to all plants"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Plants</a>
          <div class="seg" role="group" aria-label="What to show"><button aria-pressed="true" data-mode="plant">Plant</button><button aria-pressed="false" data-mode="harvest" id="harvest-btn">Harvest</button></div>
        </div>
        <span class="model-credit" id="credit" hidden></span>
        <div class="stage-bottom" id="grow-ui">
          <label for="stage">Growth <span id="stage-name">Fully grown</span></label>
          <input id="stage" type="range" min="0" max="4" step="1" value="4" aria-valuetext="Fully grown">
        </div>
        <div class="stage-bottom" id="harvest-ui" hidden><p><b id="h-label"></b> <span class="muted" id="h-size"></span></p></div>
      </div>
      <div style="display:grid;gap:16px">
        <div>
          <h1>${esc(p.name)}</h1>
          <p class="sci">${esc(g.scientific || '')}</p>
          ${p.kid_fact ? `<p class="kid">${esc(p.kid_fact)}</p>` : ''}
          <div class="acts">
            <button class="btn" id="grow">${inGarden() ? 'Open in my garden' : 'Grow this'}</button>
            ${hasRegion ? `<label class="select"><span class="vh">Where you live</span><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : ''}
          </div>
        </div>
        <div class="stats" id="stats"></div>
        ${sow.length ? `<section class="card"><div class="card-head"><h2>${g.sow_months_north || south ? 'When to sow' : 'When to plant'}</h2><span class="muted small">${south ? 'Southern' : 'Northern'} hemisphere</span></div>
          <div class="months" role="img" aria-label="Sowing months: ${sow.map((m) => MONTHS[m - 1]).join(', ')}">${MONTHS.map((m, i) => `<i class="${sow.includes(i + 1) ? 'on' : ''}${i + 1 === now ? ' now' : ''}" aria-hidden="true">${m[0]}</i>`).join('')}</div></section>` : ''}
        <section class="card"><h2 style="margin-bottom:10px">Growing it</h2><dl class="facts">
          ${fact('Time to harvest', g.days_to_harvest ? `${g.days_to_harvest[0]}–${g.days_to_harvest[1]} days` : g.days_basis ? esc(g.days_basis) : isTree ? 'Years' : null)}
          ${fact('Sun', g.sun ? esc(g.sun === 'full' ? 'Full sun' : g.sun === 'partial' ? 'Some shade is fine' : g.sun) : null)}
          ${fact('Water', g.water ? esc(({ low: 'A little', med: 'Regular', medium: 'Regular', high: 'Lots' })[g.water] || g.water) : null)}
          ${fact('In a pot', g.container_ok == null ? null : g.container_ok ? (g.min_pot_l ? `Yes, ${fmt(g.min_pot_l)} litres or more` : 'Yes') : 'Better in the ground')}
          ${fact('Grows to', g.height_cm ? `${fmt(g.height_cm[0])}–${fmt(g.height_cm[1])} cm` : p.tree?.height_m ? `${esc(String(p.tree.height_m))} m` : null)}
          ${fact('How easy', g.difficulty ? esc(g.difficulty[0].toUpperCase() + g.difficulty.slice(1)) : null)}
        </dl></section>
        ${g.tips?.length ? `<section class="card"><h2 style="margin-bottom:10px">Tips</h2><ul class="tips">${g.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
        <section class="card"><details class="srcs"><summary>Sources (${srcs.size})</summary><ol>${[...srcs.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>, ${esc(s.publisher || '')}${s.quote ? `. <q>${esc(s.quote)}</q>` : ''}</li>`).join('')}</ol></details></section>
        ${inGarden() ? '<p><button class="btn btn-sm btn-danger" id="remove">Remove from my garden</button></p>' : ''}
      </div>
    </div>
  </div>`;

  const [{ createViewer }, M] = await Promise.all([import('./viewer.js?v=5'), import('./models.js?v=5').catch(() => null)]);
  const v = createViewer($('#plant-stage'), { controls: true });
  let F = null;
  try { F = await import('./fruit3d.js'); if (!F.showHarvest) F = null; } catch { F = null; }
  const credit = $('#credit');
  const clearStage = () => { [...v.stage.children].forEach((o) => v.stage.remove(o)); };
  // a downloaded model when there is one, else the procedural plant
  async function showPlant(t = 1) {
    credit.hidden = true;
    if (t >= 1 && M) {
      const h = (g.height_cm?.[1] || (p.tree?.height_m ? parseFloat(p.tree.height_m) * 100 : 60)) / 100;
      const m = await M.loadModel(id, 'plant', { size: Math.min(h, 20) }).catch(() => null);
      if (m && mode === 'plant' && +slider.value === 4) {
        clearStage(); v.stage.add(m); v.frame(); v.kick();
        const c = m.userData.model?.credit; if (c?.author) { credit.textContent = `Model: ${c.author}, ${c.license}`; credit.hidden = false; }
        return;
      }
    }
    const hadModel = v.stage.children.some((o) => o.userData.model);
    v.stage.children.filter((o) => o.userData.model).forEach((o) => v.stage.remove(o));
    v.setPlant(id, t, { keepCamera: !hadModel && t < 1 && v.stage.children.length > 0 });
  }
  async function showHarvestView() {
    const info = F?.harvestInfo?.(id) || {};
    $('#h-label').textContent = info.label || `The ${p.name.toLowerCase()} harvest`;
    $('#h-size').textContent = info.sizeCm ? `about ${fmt(info.sizeCm)} cm, shown at real size` : '';
    credit.hidden = true;
    const m = M && await M.loadModel(id, 'harvest', { size: (info.sizeCm || 8) / 100 }).catch(() => null);
    if (m && mode === 'harvest') {
      clearStage(); v.stage.add(m); v.stage.rotation.y = .4; v.frame({ pad: 1.25 }); v.kick();
      const c = m.userData.model?.credit; if (c?.author) { credit.textContent = `Model: ${c.author}, ${c.license}`; credit.hidden = false; }
      return;
    }
    if (F) { try { F.showHarvest(v, id); } catch { $('#h-label').textContent = 'Close-up not ready for this plant yet'; } }
  }
  let mode = 'plant';
  const slider = $('#stage');
  showPlant(1);
  slider.addEventListener('input', () => {
    const [t, name] = STAGES[+slider.value];
    showPlant(t);
    $('#stage-name').textContent = name; slider.setAttribute('aria-valuetext', name);
  });
  const hasHarvest = !!F || !!(M && await M.hasModel(id, 'harvest').catch(() => false));
  if (!hasHarvest) $('#harvest-btn').hidden = true;
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    $$('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('#grow-ui').hidden = mode === 'harvest'; $('#harvest-ui').hidden = mode !== 'harvest';
    if (mode === 'harvest') showHarvestView();
    else { v.stage.rotation.y = 0; showPlant(STAGES[+slider.value][0]); }
  }));

  function stats() {
    const reg = $('#region')?.value || state.region;
    const tr = trip(p, reg);
    const hv = p.home_vs_shop;
    let h = '';
    if (tr) {
      h += `<div class="stat green wide"><b>${fmt(tr.crowMi)} miles</b><span>The shop one travels this far, from ${esc(tr.o.origin_place || tr.o.origin_country)}${tr.o.origin_place ? ', ' + esc(tr.o.origin_country) : ''} to ${esc(tr.reg.dest.name)}${tr.o.source_type === 'domestic' ? ' (grown in the country)' : ''}. Yours: 0 miles.</span></div>`;
      h += `<div class="stat"><b>${fmt((p.carbon?.kg_co2e_per_kg ?? 0) + tr.co2Transport, 2)} kg</b><span>CO2e for a shop kilo: ${fmt(p.carbon?.kg_co2e_per_kg ?? 0, 2)} farming + ${fmt(tr.co2Transport, 2)} travel</span></div>`;
    } else if (hasRegion || p.carbon) {
      h += `<div class="stat wide"><b>Not sure yet</b><span>We couldn’t find a reliable source for where it comes from in ${esc(D.regions[reg]?.name || 'your country')}.</span></div>`;
    }
    if (p.kcal_per_100g != null) h += `<div class="stat"><b>${fmt(p.kcal_per_100g)} kcal</b><span>in 100 g, raw (USDA)</span></div>`;
    if (hv) {
      h += hv.verdict === 'more' && hv.healthier_pct
        ? `<div class="stat sun wide"><b>Fresher is better</b><span>${esc(hv.explanation)} Picked from your own plant, you eat it the same day.</span></div>`
        : `<div class="stat wide"><b>About the same</b><span>${esc(hv.explanation || 'Studies don’t show a clear difference for this one, so home-grown is about the same as the shop one.')}</span></div>`;
    }
    if (p.tree?.co2_kg_per_year != null) {
      const c = p.tree.co2_kg_per_year;
      h += `<div class="stat green wide"><b>${Array.isArray(c) ? (c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])}–${fmt(c[1])}`) : fmt(c)} kg</b><span>CO2 a grown-up tree takes from the air each year. ${esc(p.tree.note || '')}</span></div>`;
    }
    $('#stats').innerHTML = h;
  }
  $('#region')?.addEventListener('change', (e) => { state.region = e.target.value; save(); stats(); });
  stats();
  $('#grow').addEventListener('click', () => {
    const had = inGarden();
    addToGarden(id); changed();
    if (!had) toast(`${p.name} planted. Take its first photo to start your journal.`);
    location.hash = '#/';
  });
  $('#remove')?.addEventListener('click', async () => {
    if (!confirm(`Remove ${p.name} and its photos from this device?`)) return;
    const { removePlant } = await import('./garden.js?v=5');
    await removePlant(id); toast(`${p.name} removed.`); location.hash = '#/';
  });
  return { unmount() { v.dispose(); } };
}
