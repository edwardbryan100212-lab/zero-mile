// Find a plant (search + filters) and the plant page (3D model, the harvest up close, sowing months, miles, kcal, goodness, sources).
import { $, $$, esc, fmt, data, plantById, trip, state, save, addToGarden, toast, ROOT, thumb, isTree, treeMonths, treeFit, FIT_WORD, fitsSmall, bestTrees, treeSeason, treeCO2, MONTH_NAMES, treeLine, treeMonthsGeneral } from './core.js?v=9';
import { art, mascot } from './art.js?v=9';
import { award } from './rewards.js?v=9';

const GROUPS = [['all', 'All'], ['veg', 'Veg'], ['fruit', 'Fruit'], ['herb', 'Herbs'], ['tree', 'Trees'], ['easy', 'Easy'], ['pot', 'In a pot'], ['now', 'Sow now']];
// each category pill: its own colour and picture (a real 3D plant render, or an illustration)
const PILL = { all: ['leaf', { art: 'scene-garden' }], veg: ['tomato', { img: 'carrot' }], fruit: ['berry', { img: 'strawberry' }], herb: ['leaf', { img: 'basil' }], tree: ['leaf', { img: 'oak' }], easy: ['sun', { art: 'star' }], pot: ['pot', { img: 'tomato' }], now: ['sky', { art: 'calendar' }] };
const pillPic = (k) => { const x = PILL[k][1]; return x.img ? `<img src="${thumb(x.img)}" alt="" width="40" height="40" loading="lazy" decoding="async">` : art(x.art, { size: 40 }); };
// the one coloured chip on a plant card
const cardChip = (p, mine) => mine ? '<span class="fc-chip berry">Growing</span>' : p.grow?.difficulty === 'easy' ? '<span class="fc-chip leaf">Easy</span>' : p.grow?.days_to_harvest ? `<span class="fc-chip sky">${p.grow.days_to_harvest[0]}–${p.grow.days_to_harvest[1]} d</span>` : isTree(p) && p.tree?.years_to_fruit ? `<span class="fc-chip sun">${range(p.tree.years_to_fruit)} yrs</span>` : isTree(p) ? '<span class="fc-chip leaf">Tree</span>' : '';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days` : isTree(p) ? treeLine(p) : 'Next season'; };
const TSUB = [['all', 'All trees'], ['best', 'Best where you live'], ['small', 'Fits a small garden'], ['fruit', 'Fruit trees'], ['native', 'Native trees']];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const sowMonths = (p) => { if (isTree(p) && p.tree?.regions) return treeMonths(p); const g = p.grow || {}; return state.region === 'AU' ? (g.sow_months_south || []) : [...new Set([...(g.sow_months_north || []), ...(g.plant_months_north || [])])].sort((a, b) => a - b); };
const changed = () => dispatchEvent(new Event('zm:garden'));

export async function findView(main, q0 = '') {
  const [D, real] = await Promise.all([data(), import('./photos.js?v=9').then((m) => m.photoThumbs()).catch(() => ({}))]);
  const N = D.plants.length, now = new Date().getMonth() + 1;
  const nTrees = D.plants.filter(isTree).length;
  let group = q0 === 'trees' ? 'tree' : 'all', tsub = 'all';
  if (q0 === 'trees') q0 = '';
  main.innerHTML = `
  <div class="page s3 find3">
    <header class="f3-head">
      <div class="f3-pip">${mascot('think', { size: 96 })}</div>
      <div class="f3-hl"><h1>Find a plant</h1><p>${N} to grow</p></div>
    </header>
    <label class="f3-search"><span class="vh">Search plants</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15.5 15.5l4.5 4.5"/></svg>
      <input id="q" type="search" placeholder="Tomato, berries, oak…" value="${esc(q0)}" enterkeyhint="search" autocomplete="off">
    </label>
    <div class="f3-pills" role="group" aria-label="Filter plants">${GROUPS.map(([k, t]) => `<button class="f3-pill ${PILL[k][0]}" data-g="${k}" aria-pressed="${k === group}">${pillPic(k)}<span>${t}</span></button>`).join('')}</div>
    <div class="f3-sub" role="group" aria-label="Filter trees" id="tsub"${group === 'tree' ? '' : ' hidden'}>${TSUB.map(([k, t]) => `<button class="f3-subp" data-t="${k}" aria-pressed="${k === 'all'}">${k === 'best' ? `Best for ${esc(D.regions[state.region]?.name || 'you')}` : t}</button>`).join('')}</div>
    <section class="f3-tree" id="tree-band" aria-labelledby="tb-t"${group === 'all' && !q0 ? '' : ' hidden'}>
      <div class="f3-tree-art">${art('scene-forest', { size: 320, cls: 'f3-forest' })}</div>
      <div class="f3-tree-t"><h2 id="tb-t">Plant a tree</h2><p>${nTrees} trees · +20 XP</p></div>
      <button class="b3 b3-white" data-g="tree" data-band>See trees</button>
    </section>
    <p class="vh" role="status" id="count"></p>
    <div class="f3-grid" id="list"></div>
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
      if (group === 'tree') {
        const f = treeFit(p)?.rating;
        if (tsub === 'best' && !(f === 'native' || f === 'good')) return false;
        if (tsub === 'small' && !fitsSmall(p)) return false;
        if (tsub === 'fruit' && !p.tree?.years_to_fruit) return false;
        if (tsub === 'native' && f !== 'native') return false;
      }
      if (!q) return true;
      const hay = norm([p.name, p.id, p.grow?.scientific, ...(p.aliases || []), p.group === 'fruit' ? 'berries fruit' : '', p.group === 'tree' ? 'tree' : '', p.group === 'herb' ? 'herb' : ''].join(' '));
      return q.split(/\s+/).every((w) => hay.includes(w.replace(/(ies|es|s)$/, '')));
    });
    clearTimeout(countT); countT = setTimeout(() => { const c = $('#count'); if (c) c.textContent = `${hits.length} plant${hits.length === 1 ? '' : 's'}`; }, 300);
    if (!hits.length) {
      const treeMiss = group === 'tree' && tsub !== 'all';
      const msg = treeMiss ? 'No trees match here' : `No “${esc($('#q').value) || 'plants'}” yet`;
      list.innerHTML = `<div class="f3-none">${mascot('sad', { size: 120 })}<p>${msg}</p><button class="b3 b3-sky" type="button" id="reset">Show all</button></div>`;
      $('#reset').addEventListener('click', () => {
        $('#q').value = ''; tsub = 'all';
        $$('[data-t]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.t === 'all')));
        setGroup(treeMiss ? 'tree' : 'all');
      });
      return;
    }
    const mine = new Set(state.garden.map((e) => e.id));
    if (group === 'tree') { const order = bestTrees().map((p) => p.id); hits.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); }
    list.innerHTML = hits.map((p, i) => `
      <a class="fc pp-pk${real[p.id] ? ' has-photo' : ''}" href="#/plant/${p.id}" style="--i:${Math.min(i, 14)}">
        <div class="pk-art"><img class="pp-3d" src="${thumb(p.id)}" alt="" width="200" height="200" loading="lazy" decoding="async">${real[p.id] ? `<img class="pp-real" src="${real[p.id]}" alt="" width="200" height="200" loading="lazy" decoding="async"><span class="pp-badge" aria-hidden="true">3D</span>` : ''}</div>
        <b class="fc-name">${esc(p.name)}</b>${cardChip(p, mine.has(p.id))}
      </a>`).join('');
  }
  $('#q').addEventListener('input', render);
  // press and hold a card: the real photo turns into the 3D model; let go to flip back (a hold never opens the page)
  let holdT = 0, held = null;
  const unhold = () => { clearTimeout(holdT); if (held) { const h = held; setTimeout(() => h.classList.remove('show3d'), 60); } };
  list.addEventListener('pointerdown', (e) => {
    const a = e.target.closest('.pp-pk.has-photo'); if (!a || e.button > 0) return;
    held = null; clearTimeout(holdT);
    holdT = setTimeout(() => { held = a; a.classList.add('show3d'); navigator.vibrate?.(8); }, 320);
  });
  ['pointerup', 'pointercancel'].forEach((t) => list.addEventListener(t, unhold));
  list.addEventListener('pointerout', (e) => { const a = e.target.closest('.pp-pk'); if (a && !a.contains(e.relatedTarget)) unhold(); });
  list.addEventListener('click', (e) => { if (held && e.target.closest('.pp-pk') === held) { e.preventDefault(); held = null; } });
  list.addEventListener('contextmenu', (e) => { if (e.target.closest('.pp-pk')) e.preventDefault(); });
  function setGroup(g, focus = false) {
    group = g;
    $$('.f3-pills [data-g]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.g === group)));
    $('#tsub').hidden = group !== 'tree'; $('#tree-band').hidden = group !== 'all' || !!$('#q').value;
    render();
    if (focus) $('.f3-pills [data-g="tree"]').focus();
  }
  $$('[data-g]').forEach((b) => b.addEventListener('click', () => setGroup(b.dataset.g, b.hasAttribute('data-band'))));
  $$('[data-t]').forEach((b) => b.addEventListener('click', () => { tsub = b.dataset.t; $$('[data-t]').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  $('#q').addEventListener('input', () => { $('#tree-band').hidden = group !== 'all' || !!$('#q').value; });
  render();
}

const KIND_WORD = { plant: 'Growing', harvest: 'Harvest', leaf: 'Leaf', flower: 'Flower', tree: 'Tree', fruit: 'Fruit' };
const STAGES = [[.04, 'Seed'], [.15, 'Sprout'], [.45, 'Young plant'], [.66, 'Flowering'], [1, 'Fully grown']];
const TREE_STAGES = ['Seed', 'Seedling', 'Sapling', 'Young tree', 'Fully grown'];
const range = (a, unit = '') => (Array.isArray(a) ? (a[0] === a[1] ? `${fmt(a[0], a[0] % 1 ? 1 : 0)}` : `${fmt(a[0], a[0] % 1 ? 1 : 0)}–${fmt(a[1], a[1] % 1 ? 1 : 0)}`) + unit : '');
// the planting guide on a tree's page (cited: research/trees-round3.json)
function treeGuide(p, D) {
  const t = p.tree || {}, south = state.region === 'AU', now = new Date().getMonth() + 1;
  const months = treeMonths(p), fit = treeFit(p), season = treeSeason();
  const reg = D.regions[state.region]?.name || 'your country';
  const fact = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  let h = `<section class="card tree-guide" aria-labelledby="tg-t">
    <div class="card-head"><h2 id="tg-t">Planting guide</h2><span class="muted small">${south ? 'Southern' : 'Northern'} hemisphere</span></div>`;
  if (months.length) h += `<div class="months" role="img" aria-label="Plant in: ${months.map((m) => MONTH_NAMES[m - 1]).join(', ')}">${MONTH_NAMES.map((m, i) => `<i class="${months.includes(i + 1) ? 'on' : ''}${i + 1 === now ? ' now' : ''}" aria-hidden="true">${m[0]}</i>`).join('')}</div>`;
  const general = months.length && treeMonthsGeneral(p);
  const basis = general ? `${season?.basis || ''} This is the general tree planting season in ${reg}.` : t.plant_basis;
  if (basis) h += `<p class="small muted guide-basis">${esc(basis)}${months.includes(now) ? ' <b class="now-tag">Good time to plant now</b>' : ''}</p>`;
  h += `<dl class="facts">
    ${fit ? fact(`In ${esc(reg)}`, `<b class="fit fit-${esc(fit.rating)}">${esc(FIT_WORD[fit.rating] || fit.rating)}</b> <span class="muted">${esc(fit.basis || '')}</span>`) : ''}
    ${fact('Size when grown', t.size?.height_m ? `${range(t.size.height_m, ' m')} tall${t.size.spread_m ? `, ${range(t.size.spread_m, ' m')} wide` : ''}${t.size.basis ? `<br><span class="muted small">${esc(t.size.basis)}</span>` : ''}` : '')}
    ${fact('Space to leave', t.spacing_m ? `${range(t.spacing_m, ' m')}${t.spacing_note ? ` <span class="muted small">${esc(t.spacing_note)}</span>` : ''}` : '')}
    ${fact('Small garden', t.small_garden != null || t.small_note ? `${t.small_garden || t.pot_ok ? 'Yes' : 'Better with room to grow'}${t.small_note ? `. <span class="muted">${esc(t.small_note)}</span>` : ''}` : '')}
    ${fact('In a pot', t.pot_ok != null ? (t.pot_ok ? 'Yes, on the right rootstock or variety' : 'No, plant it in the ground') : '')}
    ${fact('First fruit', t.years_to_fruit ? `${range(t.years_to_fruit)} years after planting` : '')}
    ${fact('Edible', t.edible ? esc(t.edible) : '')}
    ${fact('Lives for', t.lifespan_years ? `${esc(t.lifespan_years)} years` : '')}
  </dl></section>`;
  const water = D.trees?.season?.watering?.text;
  if (t.care?.length) h += `<section class="card" aria-labelledby="care-t"><div class="card-head"><h2 id="care-t">Care in years 1 to 3</h2></div><ol class="care">${t.care.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>${water ? `<p class="tip water-tip"><b>Watering</b>${esc(water)}</p>` : ''}</section>`;
  if (t.wildlife) h += `<section class="card wild" aria-labelledby="wild-t"><h2 id="wild-t">Good for wildlife</h2><p>${esc(t.wildlife)}</p></section>`;
  return h;
}

// ---------- small pictures instead of paragraphs ----------
const I = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  shade: '<circle cx="9" cy="10" r="3.5"/><path d="M9 3v1.5M3 10h1.5M4.8 5.8l1 1M13.2 5.8l-1 1"/><path d="M10 19h8a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.6 1.4A2.4 2.4 0 0 0 10 19z"/>',
  drop: '<path d="M12 3.5c3 4 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 3-6.5 6-10.5z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  pot: '<path d="M5 9h14l-1.6 10.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z"/><path d="M4 9h16M12 9V5m0 0c0-1.7 1.3-3 3-3 0 1.7-1.3 3-3 3zm0 0c0-1.7-1.3-3-3-3 0 1.7 1.3 3 3 3z"/>',
  ground: '<path d="M3 17h18M6 20h12"/><path d="M12 17V9m0 0c0-2.5 2-4.5 4.5-4.5 0 2.5-2 4.5-4.5 4.5zm0 2c0-2-1.6-3.6-3.6-3.6 0 2 1.6 3.6 3.6 3.6z"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-9-1 2-2 3-3.5 3.5C9 8 8.5 6.5 9 5c-2.5 2-3 5-3 7 0 5 2.6 9 6 9z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  ruler: '<path d="M8 3v18M8 3h4M8 7h3M8 11h4M8 15h3M8 19h4"/><path d="M15 6l2.5-2.5L20 6M17.5 3.5v17M15 18l2.5 2.5L20 18"/>',
  space: '<path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3"/><path d="M12 5v3M12 16v3"/>',
  apple: '<path d="M12 7c-1.5-1.3-6-1.8-6.5 3.3C5 16 8.5 20.5 12 19c3.5 1.5 7-3 6.5-8.7C18 5.2 13.5 5.7 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c0 9-5 15-15 15z"/><path d="M5 19l8-8"/>',
  co2: '<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.3 1.6A3.2 3.2 0 0 0 7 18z"/>',
  lorry: '<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  ship: '<path d="M3 15l2 4h14l2-4z"/><path d="M6 15V10h12v5M9 10V6h5v4"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>',
  plane: '<path d="M21 13.5L13 11V5.5a1.5 1.5 0 0 0-3 0V11l-8 2.5V15l8-1.5V18l-2.5 1.5V21l4-1 4 1v-1.5L13 18v-4.5l8 1.5z"/>',
  house: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  farm: '<path d="M3 20h18M5 20v-8l5-4 5 4v8"/><path d="M15 12h4v8M8 20v-4h4v4"/>',
  seed: '<path d="M12 20c-4 0-6-3-6-6.5S9 6 12 4c3 2 6 6 6 9.5S16 20 12 20z"/><path d="M12 8v9"/>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  prev: '<path d="M15 6l-6 6 6 6"/>', next: '<path d="M9 6l6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
};
export const icon = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k] || ''}</svg>`;
const chip = (name, value, label, tone = 'leaf') => (value ? `<li class="pt ${tone}">${art(name, { size: 44, cls: 'pt-art' })}<b>${value}</b><span>${label}</span></li>` : '');
// the part of each plant you eat, for the hotspots and their one-line cards
const ROOTS = new Set(['potato', 'carrot', 'beetroot', 'radish', 'parsnip', 'turnip', 'sweet-potato']);
const BULBS = new Set(['onion', 'garlic']);
const LEAFY = new Set(['lettuce', 'kale', 'spinach', 'swiss-chard', 'rocket', 'pak-choi', 'cabbage', 'celery', 'leek', 'spring-onion', 'rhubarb', 'brussels-sprouts']);
function hotspotsFor(p, photos) {
  const by = (k) => photos.find((x) => x.kind === k);
  const tree = p.group === 'tree', herb = p.group === 'herb', n = p.name.toLowerCase();
  const out = [];
  if (ROOTS.has(p.id) || BULBS.has(p.id)) out.push({ k: 'roots', label: BULBS.has(p.id) ? 'Bulb' : 'Roots', at: [0, .02, .12], line: `The ${n} grows under the soil. That’s the bit you eat.`, photo: by('harvest') });
  if (LEAFY.has(p.id) || herb) out.push({ k: 'leaf', label: 'Leaf', at: [-.32, .5, .2], line: herb ? 'Pick a few leaves at a time and it grows more.' : 'You eat the leaves. Pick the outer ones first.', photo: by('harvest') || by('leaf') || by('plant') });
  else out.push({ k: 'leaf', label: 'Leaf', at: [-.32, .5, .2], line: tree ? 'Leaves take CO2 from the air and turn sunlight into food.' : 'Leaves catch sunlight to feed the plant.', photo: by('leaf') || by('plant') });
  if (!ROOTS.has(p.id) && !BULBS.has(p.id) && !LEAFY.has(p.id) && !herb && p.id !== 'sunflower' && (!tree || p.tree?.years_to_fruit || by('harvest'))) out.push({ k: 'fruit', label: tree ? (TREE_FRUIT[p.id] || 'Fruit') : p.group === 'fruit' ? 'Fruit' : 'Food', at: [.3, .62, .2], line: tree ? (TREE_FRUIT[p.id] ? `${TREE_FRUIT[p.id]} grow here. Birds and animals love them too.` : 'Fruit grows here when the tree is old enough.') : `This is the ${n} you pick. Pick it when it’s ripe.`, photo: by('harvest') });
  if (by('flower') || p.id === 'sunflower') out.push({ k: 'flower', label: 'Flower', at: [.06, .92, .1], line: 'Bees visit the flowers, and then the fruit or seeds grow.', photo: by('flower') || by('plant') });
  return out;
}
const TREE_FRUIT = { oak: 'Acorns', beech: 'Nuts', hazel: 'Nuts', rowan: 'Berries', hawthorn: 'Berries', holly: 'Berries', 'scots-pine': 'Cones', alder: 'Cones', birch: 'Seeds', 'red-maple': 'Seeds', 'golden-wattle': 'Seeds', schima: 'Seeds' };
const MODE_ICON = { road: 'lorry', 'road+ferry': 'lorry', sea: 'ship', 'sea+road': 'ship', air: 'plane', 'rail+road': 'lorry' };
const MODE_WORD = { road: 'by lorry', 'road+ferry': 'by lorry and ferry', sea: 'by ship', 'sea+road': 'by ship and lorry', air: 'by plane', 'rail+road': 'by train and lorry' };

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// a small "+3 XP" pop at the top of the plant page
function xpPop(r) {
  const el = $('#xp-pop'); if (!el) return;
  const bits = [r.xp ? `${art('xp-bolt', { size: 28 })}<b>+${r.xp} XP</b>` : '', r.unlocked?.length ? `${art('trophy', { size: 28 })}<b>New badge!</b>` : '', r.quests?.length ? `${art('star', { size: 28 })}<b>Quest done!</b>` : ''].filter(Boolean);
  if (!bits.length) return;
  el.innerHTML = `<span>${bits.join('</span><span>')}</span>`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 2600);
}
// GROW THIS: a confetti burst from the button and Pip cheering
function celebrate(btn, xp) {
  btn.classList.add('done'); btn.innerHTML = `${art('xp-bolt', { size: 28 })}+${xp} XP`;
  const host = document.createElement('div'); host.className = 'cel3'; host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `<div class="cel3-pip">${mascot('cheer', { size: 140 })}</div>`;
  if (!reduceMotion()) {
    const cols = ['#3fae49', '#ffc531', '#ff5a4e', '#36b4f0', '#a560e8', '#e8865b'];
    for (let i = 0; i < 28; i++) {
      const c = document.createElement('i'), a = (i / 28) * Math.PI * 2, d = 90 + (i % 5) * 34;
      c.style.cssText = `--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d - 60)}px;--r:${(i * 47) % 360}deg;background:${cols[i % cols.length]};animation-delay:${(i % 4) * 18}ms`;
      host.appendChild(c);
    }
  }
  const r = btn.getBoundingClientRect();
  host.style.left = `${r.left + r.width / 2}px`; host.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1400);
}

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
  const hasRegion = Object.keys(p.origins || {}).length > 0 || (isTree && !!p.tree?.regions);
  const photos = await import('./photos.js?v=9').then((m) => m.photosFor(id)).catch(() => []);
  const t = p.tree || {};

  // the chips: one picture and a few words each
  const sunW = g.sun === 'full' ? 'Full sun' : g.sun === 'partial' ? 'Sun or shade' : g.sun === 'shade' ? 'Shade' : '';
  const waterN = ({ low: 1, med: 2, medium: 2, high: 3 })[g.water] || 0;
  let chips = '';
  if (isTree) {
    chips += chip('tree', t.size?.height_m ? `${range(t.size.height_m)} m` : t.height_m ? `${esc(String(t.height_m))} m` : '', 'tall', 'leaf');
    chips += chip('map-pin', t.spacing_m ? `${range(t.spacing_m)} m` : '', 'apart', 'sky');
    chips += chip('basket', t.years_to_fruit ? `${range(t.years_to_fruit)} yrs` : '', 'to fruit', 'tomato');
    const c = treeCO2(p);
    chips += chip('cloud-co2', c ? `${c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])}–${fmt(c[1])}`} kg` : '', 'CO2 a year', 'sky');
    chips += chip('gift', t.pot_ok ? 'Pot OK' : '', 'small rootstock', 'pot');
  } else {
    chips += chip('streak-sun', sunW, 'light', 'sun');
    chips += chip('quest-water', ({ 1: 'A little', 2: 'Regular', 3: 'Lots' })[waterN] || '', 'water', 'sky');
    chips += chip('calendar', g.days_to_harvest ? `${g.days_to_harvest[0]}–${g.days_to_harvest[1]}` : '', 'days', 'berry');
    chips += chip(g.container_ok ? 'quest-harvest' : 'map-pin', g.container_ok == null ? '' : g.container_ok ? (g.min_pot_l ? `${fmt(g.min_pot_l)} L pot` : 'Pot OK') : 'Ground', g.container_ok ? 'or bigger' : 'best', 'pot');
    chips += chip('xp-bolt', p.kcal_per_100g != null ? `${fmt(p.kcal_per_100g)} kcal` : '', 'in 100 g', 'tomato');
    chips += chip('star', g.difficulty ? esc(g.difficulty[0].toUpperCase() + g.difficulty.slice(1)) : '', 'to grow', 'leaf');
  }
  const line = p.kid_fact || (isTree ? treeLine(p) : '');

  main.innerHTML = `
  <div class="page pp s3 pp3">
    <div class="xp-pop" id="xp-pop" role="status" aria-live="polite"></div>
    <div class="detail">
      <div class="pp-left">
        <div class="stage-card pp-stage" id="stage-box">
          ${photos[0] ? `<img class="pp-backdrop" src="${esc(photos[0].src)}" alt="" aria-hidden="true">` : ''}
          <div class="stage3d pp-3d" id="plant-stage"></div>
          <div class="pp-hots" id="hots"></div>
          ${photos[0] ? `<figure class="pp-face" id="face" aria-hidden="true"><img src="${esc(photos[0].src)}" alt="A real ${esc(p.name.toLowerCase())} ${isTree ? 'tree' : 'plant'}"><figcaption>${esc(photos[0].author || '')}, ${esc(photos[0].license)}</figcaption></figure>` : ''}
          <div class="stage-top">
            <a class="back" href="#/find" aria-label="Back to all plants"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Plants</a>
            <div class="seg pp-seg" role="group" aria-label="What to show"><span class="pp-pill" aria-hidden="true"></span><button aria-pressed="true" data-mode="plant">Plant</button><button aria-pressed="false" data-mode="harvest" id="harvest-btn">Harvest</button></div>
          </div>
          ${photos[0] ? `<button class="pp-flip" id="flip" aria-pressed="false"><span class="pp-flip-in">${icon('camera', 'a')}${icon('cube', 'b')}</span><span class="pp-flip-t">Real photo</span></button>` : ''}
          <div class="pp-pop" id="pop" role="dialog" aria-modal="false" aria-labelledby="pop-t" hidden></div>
          <span class="model-credit" id="credit" hidden></span>
          <div class="stage-bottom" id="grow-ui">
            <label for="stage"><span class="pp-gl">Grow</span> <b id="stage-name">Fully grown</b></label>
            <input id="stage" type="range" min="0" max="4" step="1" value="4" aria-valuetext="Fully grown"${isTree ? ' aria-label="Growth over the years"' : ''}>
            <div class="g3-ticks" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<i class="on"></i>`).join('')}</div>
          </div>
          <div class="stage-bottom" id="harvest-ui" hidden><p><b id="h-label"></b> <span class="muted" id="h-size"></span></p></div>
        </div>
        ${photos.length ? `<div class="pp-strip" id="strip" aria-label="Real photos">${photos.map((ph, i) => `<button class="pp-shot" data-i="${i}" aria-label="Open photo ${i + 1} of ${photos.length}: ${esc(ph.title)}"><img src="${esc(ph.src)}" alt="" width="160" height="120" loading="${i ? 'lazy' : 'eager'}" decoding="async"><span>${esc(KIND_WORD[ph.kind] || 'Photo')}</span></button>`).join('')}</div>` : ''}
      </div>
      <div class="pp-info">
        <header class="pp-head">
          <h1>${esc(p.name)}</h1>
          <p class="sci">${esc(g.scientific || '')}</p>
          ${line ? `<p class="kid">${esc(line)}</p>` : ''}
        </header>
        <ul class="pt-grid" aria-label="Growing at a glance">${chips}</ul>
        <div class="acts">
          <button class="b3 b3-wide grow3" id="grow">${inGarden() ? 'Open my garden' : isTree ? `Plant this tree` : 'Grow this'}${inGarden() ? '' : `<small>+${isTree ? 20 : 5} XP</small>`}</button>
          ${hasRegion ? `<label class="sel3"><span class="vh">Where you live</span>${art('map-pin', { size: 28 })}<select id="region">${Object.entries(D.regions).map(([k, r]) => `<option value="${k}"${k === state.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : ''}
        </div>
        <div id="route"></div>
        ${sow.length ? `<section class="c3 sow3" aria-labelledby="sow-t"><div class="h3row">${art('calendar', { size: 40 })}<h2 id="sow-t">${isTree ? 'When to plant' : g.sow_months_north || south ? 'When to sow' : 'When to plant'}</h2><span class="tag3">${south ? 'South' : 'North'}</span></div>
          <div class="cal3" role="img" aria-label="${isTree ? 'Plant' : 'Sow'} in: ${sow.map((m) => MONTH_NAMES[m - 1]).join(', ')}">${MONTHS.map((m, i) => `<i class="${sow.includes(i + 1) ? 'on' : ''}${i + 1 === now ? ' now' : ''}" style="--i:${i}" aria-hidden="true">${m}</i>`).join('')}</div>
          ${sow.includes(now) ? `<p class="now3">${art('star', { size: 28 })}${isTree ? 'Plant' : 'Sow'} it now!</p>` : ''}</section>` : ''}
        <details class="c3 pp-more more3">
          <summary>${art('quest-learn', { size: 40 })}<b>${isTree ? 'Tree guide' : 'Grow guide'}</b><span class="tag3">Facts · sources</span></summary>
          <div class="pp-more-in">
            ${isTree && p.tree?.regions ? '<div id="guide" class="pp-guide"></div>' : `<dl class="facts">
              ${fact('Time to harvest', g.days_to_harvest ? `${g.days_to_harvest[0]}–${g.days_to_harvest[1]} days${g.days_basis ? ` <span class="muted small">${esc(g.days_basis)}</span>` : ''}` : g.days_basis ? esc(g.days_basis) : isTree ? 'Years' : null)}
              ${fact('Grows to', g.height_cm ? `${fmt(g.height_cm[0])}–${fmt(g.height_cm[1])} cm` : p.tree?.height_m ? `${esc(String(p.tree.height_m))} m` : null)}
              ${fact('Pot size', g.min_pot_note ? esc(g.min_pot_note) : null)}
            </dl>`}
            <div class="stats" id="stats"></div>
            ${g.tips?.length ? `<h3>Tips</h3><ul class="tips">${g.tips.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            <details class="srcs"><summary>Sources (${srcs.size})</summary><ol>${[...srcs.values()].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>, ${esc(s.publisher || '')}${s.quote ? `. <q>${esc(s.quote)}</q>` : ''}</li>`).join('')}</ol></details>
            ${photos.length ? `<details class="srcs"><summary>Photo credits (${photos.length})</summary><ol>${photos.map((ph) => `<li><a href="${esc(ph.url)}" target="_blank" rel="noopener">${esc(ph.title)}</a> by ${esc(ph.author || 'unknown')}, ${ph.licenseUrl ? `<a href="${esc(ph.licenseUrl)}" target="_blank" rel="noopener">${esc(ph.license)}</a>` : esc(ph.license)}</li>`).join('')}</ol></details>` : ''}
          </div>
        </details>
        ${inGarden() ? '<p><button class="b3 b3-white rm3" id="remove">Remove plant</button></p>' : ''}
      </div>
    </div>
    ${photos.length ? `<dialog class="pp-lb" id="lb" aria-label="Photos of ${esc(p.name)}">
      <div class="pp-lb-track" id="lb-track">${photos.map((ph, i) => `<figure class="pp-lb-slide" data-i="${i}"><img src="${esc(ph.src)}" alt="${esc(ph.title)}" loading="lazy" decoding="async"><figcaption><b>${esc(ph.title)}</b><span>${esc(ph.author || 'unknown')} · <a href="${esc(ph.url)}" target="_blank" rel="noopener">${esc(ph.license)}, source</a></span></figcaption></figure>`).join('')}</div>
      <button class="pp-lb-btn pp-lb-x" id="lb-x" aria-label="Close">${icon('close')}</button>
      ${photos.length > 1 ? `<button class="pp-lb-btn pp-lb-prev" id="lb-prev" aria-label="Previous photo">${icon('prev')}</button><button class="pp-lb-btn pp-lb-next" id="lb-next" aria-label="Next photo">${icon('next')}</button>` : ''}
    </dialog>` : ''}
  </div>`;

  const [{ createViewer }, M] = await Promise.all([import('./viewer.js?v=9'), import('./models.js?v=9').catch(() => null), import('./trees3d.js?v=9')]);
  const v = createViewer($('#plant-stage'), { controls: true });
  let F = null;
  try { F = await import('./fruit3d.js'); if (!F.showHarvest) F = null; } catch { F = null; }
  const credit = $('#credit');
  const clearStage = () => { [...v.stage.children].forEach((o) => v.stage.remove(o)); };
  let first = true;
  const arrived = (from) => { if (first) { first = false; v.intro(); } else if (from) v.pop(from); placeHots(); };
  // a downloaded model when there is one, else the procedural plant
  async function showPlant(tt = 1, from = 0) {
    credit.hidden = true;
    if (tt >= 1 && M) {
      const h = (g.height_cm?.[1] || (p.tree?.height_m ? parseFloat(p.tree.height_m) * 100 : 60)) / 100;
      const m = await M.loadModel(id, 'plant', { size: Math.min(h, 20) }).catch(() => null);
      if (m && mode === 'plant' && +slider.value === 4) {
        clearStage(); v.stage.add(m); v.frame(); v.kick();
        const c = m.userData.model?.credit; if (c?.author) { credit.textContent = `Model: ${c.author}, ${c.license}`; credit.hidden = false; }
        arrived(from); return;
      }
    }
    const hadModel = v.stage.children.some((o) => o.userData.model);
    v.stage.children.filter((o) => o.userData.model).forEach((o) => v.stage.remove(o));
    v.setPlant(id, tt, { keepCamera: !hadModel && tt < 1 && v.stage.children.length > 0 });
    arrived(from);
  }
  async function showHarvestView() {
    const info = F?.harvestInfo?.(id) || {};
    $('#h-label').textContent = info.label || `The ${p.name.toLowerCase()} harvest`;
    $('#h-size').textContent = info.sizeCm ? `about ${fmt(info.sizeCm)} cm, shown at real size` : '';
    credit.hidden = true;
    const m = M && await M.loadModel(id, 'harvest', { size: (info.sizeCm || 8) / 100 }).catch(() => null);
    if (m && mode === 'harvest') {
      clearStage(); v.stage.add(m); v.stage.rotation.y = .4; v.frame({ pad: 1.25 }); v.kick(); v.pop(.72);
      const c = m.userData.model?.credit; if (c?.author) { credit.textContent = `Model: ${c.author}, ${c.license}`; credit.hidden = false; }
      placeHots(); return;
    }
    if (F) { try { F.showHarvest(v, id); v.pop(.72); } catch { $('#h-label').textContent = 'Close-up not ready for this plant yet'; } }
    placeHots();
  }
  let mode = 'plant';
  const slider = $('#stage');
  showPlant(1);
  let lastStep = 4;
  slider.addEventListener('input', () => {
    const step = +slider.value, tt = STAGES[step][0], name = isTree ? TREE_STAGES[step] : STAGES[step][1];
    showPlant(tt, step > lastStep ? .84 : 1.12); lastStep = step; // grow up from a little smaller, step back from a little bigger
    $('#stage-name').textContent = name; slider.setAttribute('aria-valuetext', name);
    $$('.g3-ticks i').forEach((t, i) => t.classList.toggle('on', i <= step));
    closePop(); placeHots();
  });
  const hasHarvest = !!F || !!(M && await M.hasModel(id, 'harvest').catch(() => false));
  if (!hasHarvest || (p.thumb && !(M && await M.hasModel(id, 'harvest').catch(() => false)))) { $('#harvest-btn').hidden = true; $('.pp-seg').classList.add('one'); }
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    $$('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('.pp-seg').classList.toggle('right', mode === 'harvest');
    $('#grow-ui').hidden = mode === 'harvest'; $('#harvest-ui').hidden = mode !== 'harvest';
    if (flipped) flip(false);
    closePop();
    if (mode === 'harvest') showHarvestView();
    else { v.stage.rotation.y = 0; showPlant(STAGES[+slider.value][0], .72); }
  }));

  // ---------- hotspots: tap a part of the plant to see it for real ----------
  const hots = hotspotsFor(p, photos), hostEl = $('#hots'), pop = $('#pop');
  hostEl.innerHTML = hots.map((h, i) => `<button class="pp-hot" data-h="${i}" aria-expanded="false" aria-controls="pop" style="--d:${i * 70}ms"><i aria-hidden="true"></i><span>${esc(h.label)}</span></button>`).join('');
  let anchors = [];
  function placeHots() {
    const show = mode === 'plant' && +slider.value === 4 && !flipped;
    hostEl.classList.toggle('on', show);
    if (!show) return;
    const b = v.box(), s = { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z }, c = b.min;
    anchors = hots.map((h) => [(b.min.x + b.max.x) / 2 + h.at[0] * s.x, c.y + h.at[1] * s.y, (b.min.z + b.max.z) / 2 + h.at[2] * s.z]);
    updateHots();
  }
  function updateHots() {
    if (!hostEl.classList.contains('on')) return;
    // keep the dots clear of the buttons at the top and the slider at the bottom
    const W = hostEl.clientWidth, H = hostEl.clientHeight;
    $$('.pp-hot', hostEl).forEach((el, i) => {
      const a = anchors[i]; if (!a) return;
      const q = v.toScreen(...a), x = Math.min(W - 90, Math.max(30, q.x)), y = Math.min(H - 120, Math.max(130, q.y));
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });
  }
  v.onRender = updateHots;
  let openHot = -1;
  function closePop() { if (openHot < 0) return; pop.classList.remove('open'); $$('.pp-hot', hostEl).forEach((x) => x.setAttribute('aria-expanded', 'false')); openHot = -1; setTimeout(() => { if (openHot < 0) pop.hidden = true; }, 200); }
  $$('.pp-hot', hostEl).forEach((el) => el.addEventListener('click', () => {
    const i = +el.dataset.h, h = hots[i];
    if (openHot === i) { closePop(); return; }
    openHot = i;
    $$('.pp-hot', hostEl).forEach((x) => x.setAttribute('aria-expanded', String(x === el)));
    pop.innerHTML = `${h.photo ? `<img src="${esc(h.photo.src)}" alt="" width="96" height="96">` : `<span class="pp-pop-ic">${art(h.k === 'roots' ? 'quest-harvest' : h.k === 'fruit' ? 'basket' : h.k === 'flower' ? 'streak-sun' : 'tree', { size: 56 })}</span>`}<div><b id="pop-t">${esc(h.label)}</b><p>${esc(h.line)}</p></div><button class="pp-pop-x" aria-label="Close">${icon('close')}</button>`;
    const r = el.getBoundingClientRect(), box = $('#stage-box').getBoundingClientRect();
    pop.style.setProperty('--ox', `${Math.round(r.left + r.width / 2 - box.left)}px`);
    pop.hidden = false; requestAnimationFrame(() => pop.classList.add('open'));
    $('.pp-pop-x', pop).addEventListener('click', () => { closePop(); el.focus(); });
  }));
  $('#stage-box').addEventListener('keydown', (e) => { if (e.key === 'Escape' && openHot >= 0) { const el = $(`.pp-hot[data-h="${openHot}"]`, hostEl); closePop(); el?.focus(); } });

  // ---------- Real photo / 3D flip ----------
  let flipped = false;
  function flip(on) {
    flipped = on;
    const b = $('#flip'); if (!b) return;
    $('#stage-box').classList.toggle('is-photo', on);
    b.setAttribute('aria-pressed', String(on));
    $('.pp-flip-t', b).textContent = on ? '3D model' : 'Real photo';
    $('#face').setAttribute('aria-hidden', String(!on));
    v.setSpin(!on); closePop(); placeHots();
  }
  $('#flip')?.addEventListener('click', () => flip(!flipped));

  // ---------- photo strip + lightbox ----------
  const lb = $('#lb');
  if (lb) {
    const track = $('#lb-track'), slides = $$('.pp-lb-slide', lb);
    let opener = null;
    const cur = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const go = (i, smooth = true) => track.scrollTo({ left: Math.max(0, Math.min(slides.length - 1, i)) * track.clientWidth, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    $$('.pp-shot').forEach((b) => b.addEventListener('click', () => { opener = b; lb.showModal(); requestAnimationFrame(() => go(+b.dataset.i, false)); }));
    $('#lb-x').addEventListener('click', () => lb.close());
    $('#lb-prev')?.addEventListener('click', () => go(cur() - 1));
    $('#lb-next')?.addEventListener('click', () => go(cur() + 1));
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(cur() + 1); if (e.key === 'ArrowLeft') go(cur() - 1); });
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('pp-lb-slide')) lb.close(); });
    lb.addEventListener('close', () => opener?.focus());
  }

  function stats() {
    const reg = $('#region')?.value || state.region;
    const tr = trip(p, reg);
    const hv = p.home_vs_shop;
    let h = '', r = '';
    if (tr) {
      const mode = tr.o.transport_mode || 'road', from = tr.o.origin_place || tr.o.origin_country;
      const co2 = (p.carbon?.kg_co2e_per_kg ?? 0) + tr.co2Transport;
      const veh = /air/.test(mode) ? 'plane' : /sea/.test(mode) ? 'ship' : 'lorry';
      r = `<section class="c3 route3" aria-labelledby="rt-t">
        <div class="h3row">${art(veh, { size: 40 })}<h2 id="rt-t">Shop trip</h2><span class="tag3 big">${fmt(tr.crowMi)} mi</span></div>
        <div class="road3" role="img" aria-label="From ${esc(from)} to ${esc(tr.reg.dest.name)}, ${fmt(tr.crowMi)} miles ${esc(MODE_WORD[mode] || '')}. Yours travels 0 miles.">
          <span class="r3-end">${art('map-pin', { size: 44 })}<small>${esc(from)}</small></span>
          <span class="r3-line"><i class="r3-veh">${art(veh, { size: 56 })}</i></span>
          <span class="r3-end">${art('map-pin', { size: 44, cls: 'r3-home' })}<small>${esc(tr.reg.dest.name)}</small></span>
        </div>
        <div class="r3-yours">${mascot('proud', { size: 64 })}<p><b>Yours: 0 miles</b><span>${fmt(co2, 2)} kg CO2e per shop kilo</span></p></div>
      </section>`;
      h += `<div class="st3 sky"><b>${fmt(co2, 2)} kg CO2e</b><span>for a shop kilo: ${fmt(p.carbon?.kg_co2e_per_kg ?? 0, 2)} farming + ${fmt(tr.co2Transport, 2)} travel, from ${esc(from)}${tr.o.origin_place ? ', ' + esc(tr.o.origin_country) : ''}${tr.o.source_type === 'domestic' ? ' (grown in the country)' : ''}.</span></div>`;
    } else if (hasRegion || p.carbon) {
      h += `<div class="st3"><b>Not sure yet</b><span>We couldn’t find a reliable source for where it comes from in ${esc(D.regions[reg]?.name || 'your country')}.</span></div>`;
    }
    if (p.kcal_per_100g != null) h += `<div class="st3 tomato"><b>${fmt(p.kcal_per_100g)} kcal</b><span>in 100 g, raw (USDA)</span></div>`;
    if (hv) {
      h += hv.verdict === 'more' && hv.healthier_pct
        ? `<div class="st3 sun"><b>Fresher is better</b><span>${esc(hv.explanation)} Picked from your own plant, you eat it the same day.</span></div>`
        : `<div class="st3"><b>About the same</b><span>${esc(hv.explanation || 'Studies don’t show a clear difference for this one, so home-grown is about the same as the shop one.')}</span></div>`;
    }
    const c = treeCO2(p);
    if (c) h += `<div class="st3 leaf"><b>About ${c[0] === c[1] ? fmt(c[0]) : `${fmt(c[0])}–${fmt(c[1])}`} kg</b><span>CO2 a grown-up tree takes from the air each year. An estimate from a typical figure; young trees take up less. ${esc(p.tree.note || '')}</span></div>`;
    $('#stats').innerHTML = h;
    $('#route').innerHTML = r;
  }
  const guide = () => { const el = $('#guide'); if (el) el.innerHTML = treeGuide(p, D); };
  $('#region')?.addEventListener('change', (e) => { state.region = e.target.value; save(); stats(); guide(); });
  stats(); guide();
  $('#grow').addEventListener('click', () => {
    const had = inGarden();
    if (had) { location.hash = '#/'; return; }
    addToGarden(id); changed();
    const res = award(isTree ? 'tree' : 'plant', { id }) || {};
    toast(isTree ? `${p.name} planted! Photo it each season.` : `${p.name} planted! Take its first photo.`);
    celebrate($('#grow'), res.xp || (isTree ? 20 : 5));
    setTimeout(() => { location.hash = '#/'; }, reduceMotion() ? 300 : 1100);
  });
  // learning about a plant earns a little XP (the engine caps it per day)
  const learned = award('learn', { id }) || {};
  if (learned.xp || learned.unlocked?.length || learned.quests?.length) xpPop(learned);
  $('#remove')?.addEventListener('click', async () => {
    if (!confirm(`Remove ${p.name} and its photos from this device?`)) return;
    const { removePlant } = await import('./garden.js?v=9');
    await removePlant(id); toast(`${p.name} removed.`); location.hash = '#/';
  });
  return { unmount() { v.onRender = null; v.dispose(); if (lb?.open) lb.close(); } };
}
