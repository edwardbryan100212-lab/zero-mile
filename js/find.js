// Find a plant (search + filters) and the plant page (3D model at any growth stage, food miles, kcal, goodness, sources).
import { $, $$, esc, fmt, data, plantById, trip, state, save, addToGarden, toast, updateBar } from './app.js?v=2';
import { SPROUT } from './ascii.js?v=2';

const GROUPS = [['all', 'All'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['herb', 'Herbs'], ['tree', 'Trees'], ['easy', 'Easy to grow'], ['pot', 'Grows in a pot']];
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days to harvest` : p.group === 'tree' ? 'Grows for years' : 'Harvest next season'; };
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export async function findView(main, q0 = '') {
  const D = await data();
  let group = 'all';
  main.innerHTML = `
  <div class="view">
    <div class="view-head">
      <div>
        <h1>Find your plant</h1>
        <p>Search 24 plants, from windowsill basil to a 25-metre oak. Pick one to see it fully grown.</p>
      </div>
      <pre class="ascii" aria-hidden="true">${SPROUT}</pre>
    </div>
    <label class="search"><span class="vh">Search plants</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>
      <input id="q" type="search" placeholder="Try tomato, berries or birch" value="${esc(q0)}" enterkeyhint="search" autocomplete="off">
    </label>
    <div class="filters chips" role="group" aria-label="Filter plants">${GROUPS.map(([k, t]) => `<button class="chip" data-g="${k}" aria-pressed="${k === 'all'}">${t}</button>`).join('')}</div>
    <p class="vh" role="status" id="count"></p>
    <div class="packets" id="list"></div>
  </div>`;
  const list = $('#list');
  const { plantThumb } = await import('./viewer.js?v=2');
  let countT;
  function render() {
    const q = norm($('#q').value);
    const hits = D.plants.filter((p) => {
      if (group === 'easy' && p.grow?.difficulty !== 'easy') return false;
      if (group === 'pot' && !p.grow?.container_ok) return false;
      if (!['all', 'easy', 'pot'].includes(group) && p.group !== group) return false;
      if (!q) return true;
      const hay = norm([p.name, p.id, p.grow?.scientific, ...(p.aliases || []), p.group === 'fruit' ? 'berries fruit' : '', p.group === 'tree' ? 'tree' : ''].join(' '));
      return q.split(/\s+/).every((w) => hay.includes(w.replace(/(ies|es|s)$/, '')));
    });
    clearTimeout(countT); countT = setTimeout(() => { $('#count').textContent = `${hits.length} plant${hits.length === 1 ? '' : 's'}`; }, 300);
    if (!hits.length) { const lab = GROUPS.find(([k]) => k === group)[1].toLowerCase(); list.innerHTML = group === 'all' ? `<p class="empty">No plant called “${esc($('#q').value)}” yet. Try a vegetable, fruit, herb or tree.</p>` : `<p class="empty">No ${esc(lab)} match “${esc($('#q').value)}”. Try All.</p>`; return; }
    list.innerHTML = hits.map((p) => `
      <a class="pk" href="#/plant/${p.id}">
        <div class="pk-art"><img alt="" data-thumb="${p.id}" width="360" height="360"></div>
        ${p.grow?.difficulty === 'easy' ? '<span class="pk-tag">Easy</span>' : ''}
        <div class="pk-body"><b>${esc(p.name)}</b><span>${daysText(p)}</span></div>
      </a>`).join('');
    // draw thumbnails one by one so the page stays responsive
    (async () => { for (const img of $$('[data-thumb]', list)) { if (!img.isConnected) return; img.src = await plantThumb(img.dataset.thumb); await new Promise((r) => setTimeout(r, 0)); } })();
  }
  $('#q').addEventListener('input', render);
  $$('[data-g]').forEach((b) => b.addEventListener('click', () => { group = b.dataset.g; $$('[data-g]').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  render();
}

const STAGES = [[.04, 'Seed'], [.15, 'Sprout'], [.45, 'Young plant'], [.66, 'Flowering'], [1, 'Fully grown']];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function plantView(main, id) {
  const D = await data();
  const p = plantById(id);
  if (!p) { location.hash = '#/find'; return; }
  const g = p.grow || {};
  const isTree = p.group === 'tree';
  const hemiSouth = state.region === 'AU';
  const sow = (hemiSouth ? g.sow_months_south : g.sow_months_north) || g.plant_months_north || [];
  const srcs = new Map();
  const add = (arr) => (arr || []).forEach((s) => s?.url && !srcs.has(s.url) && srcs.set(s.url, s));
  add(g.sources); add(p.carbon?.sources); add(p.home_vs_shop?.sources); add(p.tree?.sources);
  Object.values(p.origins || {}).forEach((o) => add(o.sources));
  if (p.fdc?.url) add([{ title: `FoodData Central: ${p.fdc.description}`, publisher: 'USDA', url: p.fdc.url }]);

  const html = (s) => s.replace(/<p class="row"><span>[^<]*<\/span><i class="dots"><\/i><span>—<\/span><\/p>/g, '');
  main.innerHTML = html(`
  <div class="view">
    <div class="detail">
      <div class="detail-stage">
        <div class="stage3d" id="plant-stage"></div>
        <p class="stage-hint">Drag to turn it, pinch to zoom</p>
        <div class="stage-ui">
          <label for="stage">Growth <span id="stage-name">Fully grown</span></label>
          <input id="stage" type="range" min="0" max="4" step="1" value="4" aria-valuetext="Fully grown">
        </div>
      </div>
      <div>
        <a class="link" href="#/find">All plants</a>
        <h1 style="margin-top:16px">${esc(p.name)}</h1>
        <p class="sci">${esc(g.scientific || '')}</p>
        ${p.kid_fact ? `<p class="kid">${esc(p.kid_fact)}</p>` : ''}
        <div class="detail-actions">
          <button class="btn btn-accent" id="grow">${state.garden.some((e) => e.id === id) ? 'Open in my garden' : 'Grow this'}</button>
          ${!isTree || id === 'apple' || id === 'lemon' ? `<label class="select"><span class="vh">Where you live</span><select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : ''}
        </div>
        <div class="cards" id="cards"></div>
        <div class="grow-list">
          <p class="row"><span>Time to harvest</span><i class="dots"></i><span>${g.days_to_harvest ? `${g.days_to_harvest[0]}–${g.days_to_harvest[1]} days` : esc(g.days_basis || (isTree ? 'years' : '—'))}</span></p>
          ${g.days_to_harvest ? `<p class="row"><span>Counted</span><i class="dots"></i><span>${esc(g.days_basis || '')}</span></p>` : ''}
          <p class="row"><span>Sun</span><i class="dots"></i><span>${esc(g.sun === 'full' ? 'Full sun' : g.sun === 'partial' ? 'Some shade is fine' : g.sun || '—')}</span></p>
          <p class="row"><span>Water</span><i class="dots"></i><span>${esc(({ low: 'A little', med: 'Regular', medium: 'Regular', high: 'Lots' })[g.water] || g.water || '—')}</span></p>
          <p class="row"><span>In a pot</span><i class="dots"></i><span>${g.container_ok ? (g.min_pot_l ? `Yes, ${fmt(g.min_pot_l)} litres or more` : 'Yes') : 'Better in the ground'}</span></p>
          <p class="row"><span>Grows to</span><i class="dots"></i><span>${g.height_cm ? `${fmt(g.height_cm[0])}–${fmt(g.height_cm[1])} cm` : p.tree?.height_m ? esc(String(p.tree.height_m)) + ' m' : '—'}</span></p>
          <p class="row"><span>Difficulty</span><i class="dots"></i><span>${esc(g.difficulty ? g.difficulty[0].toUpperCase() + g.difficulty.slice(1) : '—')}</span></p>
          ${sow.length ? `<p class="row"><span>${g.sow_months_north ? 'Sow' : 'Plant'} in</span><i class="dots"></i><span>${sow.map((m) => MONTHS[m - 1]).join(', ')}${hemiSouth ? ' (south)' : ''}</span></p>` : ''}
        </div>
        ${g.tips?.length ? `<ul class="tips">${g.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <div class="srcs"><h2>Sources</h2><ol>${[...srcs.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>, ${esc(s.publisher || '')}${s.quote ? `. <q>${esc(s.quote)}</q>` : ''}</li>`).join('')}</ol></div>
      </div>
    </div>
  </div>`);

  const { createViewer } = await import('./viewer.js?v=2');
  const v = createViewer($('#plant-stage'), { controls: true });
  v.setPlant(id, 1);
  const slider = $('#stage');
  slider.addEventListener('input', () => {
    const [t, name] = STAGES[+slider.value];
    v.setPlant(id, t, { keepCamera: true });
    $('#stage-name').textContent = name; slider.setAttribute('aria-valuetext', name);
  });

  function cards() {
    const reg = $('#region')?.value || state.region;
    const tr = trip(p, reg);
    const hv = p.home_vs_shop;
    let h = '';
    if (tr) {
      h += `<div class="stat ink wide"><b>${fmt(tr.crowMi)} miles</b><span>Air miles from ${esc(tr.o.origin_place || tr.o.origin_country)}${tr.o.origin_place ? ', ' + esc(tr.o.origin_country) : ''} to ${esc(tr.reg.dest.name)}, where most ${esc(p.name.toLowerCase())} in ${esc(D.regions[reg].name)} shops comes from${tr.o.source_type === 'domestic' ? ' (grown in-country)' : ''}. Yours: 0 miles.</span>${tr.o.seasonal_note ? `<span class="cite">${esc(tr.o.seasonal_note)}</span>` : ''}</div>`;
      h += `<div class="stat"><b>${fmt((p.carbon?.kg_co2e_per_kg ?? 0) + tr.co2Transport, 2)} kg</b><span>CO2e for one shop kilo: ${fmt(p.carbon?.kg_co2e_per_kg ?? 0, 2)} farming + ${fmt(tr.co2Transport, 2)} transport</span></div>`;
    } else if (!isTree || p.carbon) {
      h += `<div class="stat wide"><b>Not sure yet</b><span>We couldn’t find a reliable source for where it comes from in ${esc(D.regions[reg].name)}.</span></div>`;
    }
    if (p.kcal_per_100g != null) h += `<div class="stat"><b>${fmt(p.kcal_per_100g)} kcal</b><span>per 100 g, raw (USDA)</span></div>`;
    if (hv) {
      h += hv.verdict === 'more' && hv.healthier_pct
        ? `<div class="stat wide"><b>Fresher is better</b><span>${esc(hv.explanation)} Picked from your own plant, you eat it the same day.</span></div>`
        : `<div class="stat wide"><b>About the same</b><span>${esc(hv.explanation || 'Studies don’t show a clear difference in goodness for this one, so home-grown is about the same as the shop one.')}</span></div>`;
    }
    if (p.tree) {
      const c = p.tree.co2_kg_per_year;
      h += `<div class="stat ink wide"><b>${Array.isArray(c) ? (c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])}–${fmt(c[1])}`) : fmt(c)} kg</b><span>CO2 a mature tree takes from the air each year. ${esc(p.tree.note || '')}</span></div>`;
    }
    $('#cards').innerHTML = h;
  }
  $('#region')?.addEventListener('change', (e) => { state.region = e.target.value; save(); cards(); });
  cards();
  $('#grow').addEventListener('click', () => {
    const had = state.garden.some((e) => e.id === id);
    addToGarden(id); updateBar();
    if (!had) toast(`${p.name} planted. Snap your first photo to start a streak.`);
    location.hash = '#/garden';
  });
  return { unmount() { v.dispose(); } };
}
