// Zero Mile: what you can sow or plant this month where you live, from the cited sowing months in data/data.json
// (grow.sow_months_north/south, grow.plant_months_north) and the tree planting seasons (treeMonths in core.js).
// Australia uses the southern-hemisphere months; elsewhere the northern ones, as on the plant pages.
// A month picker looks ahead. Photo chips open the plant page.
//   mountSow(el)  a compact block (any screen)
//   default view  the full page at #/sow
import { state, esc, data, thumb, isTree, treeMonths, MONTH_NAMES } from './core.js?v=9';
import { glyph } from './weather.js?v=9';

const SOUTH = () => state.region === 'AU';
export function sowList(month) {
  const D = window.__zmData; if (!D) return { sow: [], plant: [], trees: [] };
  const sow = [], plant = [], trees = [];
  for (const p of D.plants) {
    if (isTree(p)) { if (treeMonths(p).includes(month)) trees.push(p); continue; }
    const g = p.grow || {};
    const s = SOUTH() ? g.sow_months_south : g.sow_months_north;
    if (s?.includes(month)) sow.push(p);
    else if (!SOUTH() && g.plant_months_north?.includes(month)) plant.push(p);
  }
  const by = (a, b) => a.name.localeCompare(b.name);
  return { sow: sow.sort(by), plant: plant.sort(by), trees: trees.sort(by) };
}
const chip = (p) => `<li><a class="sow-chip" href="#/plant/${esc(p.id)}"><img src="${thumb(p.id)}" alt="" width="56" height="56" loading="lazy"><span>${esc(p.name)}</span></a></li>`;
const group = (title, list, icon, h = 'h3') => (list.length ? `<div class="sow-g"><${h} class="sow-gh">${glyph(icon, 18)}${title} <span class="sow-n lcd-num">${list.length}</span></${h}><ul class="sow-chips">${list.map(chip).join('')}</ul></div>` : '');

export async function mountSow(el, { full = false } = {}) {
  if (!el) return;
  try {
    window.__zmData = await data();
    let m = new Date().getMonth() + 1;
    const now = m;
    const draw = () => {
      const L = sowList(m), total = L.sow.length + L.plant.length + L.trees.length;
      const hemi = SOUTH() ? 'southern' : 'northern', H = full ? 'h2' : 'h3';
      el.innerHTML = `<section class="ft sow-card" aria-labelledby="sow-h">
        <header class="ft-head">${full ? '' : '<h2 id="sow-h">Sow now</h2>'}
          <div class="sow-pick" role="group" aria-label="Month">
            <button type="button" class="sow-step" data-step="-1" aria-label="Previous month">${glyph('arrowL', 18)}</button>
            <span class="sow-m lcd-num" ${full ? 'id="sow-h"' : ''} aria-live="polite">${MONTH_NAMES[m - 1].slice(0, 3).toUpperCase()}${m === now ? '' : '<i> +' + ((m - now + 12) % 12) + '</i>'}</span>
            <button type="button" class="sow-step" data-step="1" aria-label="Next month">${glyph('arrowR', 18)}</button>
          </div>
        </header>
        <p class="sr">${esc(MONTH_NAMES[m - 1])}: ${total} plants</p>
        ${total ? group('Sow', L.sow, 'seed', H) + group('Plant out', L.plant, 'shoot', H) + group('Trees', L.trees, 'tree', H) : `<p class="care-none">Nothing to sow in ${MONTH_NAMES[m - 1]}. Try next month.</p>`}
        <details class="ft-deep"><summary>Where this comes from</summary><p class="ft-muted">Sowing months from each plant's cited guide (mostly the RHS month-by-month calendar), using the ${hemi}-hemisphere months for ${esc(D().regions?.[state.region]?.name || 'your region')}. Tree seasons from the cited planting guides for where you live. Open a plant for its sources.</p></details>
      </section>`;
      el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { m = ((m - 1 + +b.dataset.step + 12) % 12) + 1; draw(); el.querySelector(`[data-step="${b.dataset.step}"]`)?.focus(); }));
    };
    const D = () => window.__zmData;
    draw();
  } catch { el.innerHTML = ''; }
}

// the route #/sow
export default async function view(main) {
  main.innerHTML = `<section class="ft-page ombre" data-tone="sage"><h1 class="ft-h1">Sow this month</h1><div class="sow-host"></div></section>`;
  await mountSow(main.querySelector('.sow-host'), { full: true });
  return {};
}
